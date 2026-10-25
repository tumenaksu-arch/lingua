import { DEFAULT_STATS, LOCAL_USER_ID, type Database } from '@/data';
import { useAppStore } from '../store';
import { useSocialStore } from '../social/socialStore';
import {
  addFriend,
  getProfile,
  listFriends,
  resolveInvite,
  saveProfile,
  topEntries,
  upsertWeeklyEntry,
} from '@/data/remote/social';

jest.mock('@/data/remote/social', () => ({
  addFriend: jest.fn(async () => true),
  entriesFor: jest.fn(async () => []),
  getProfile: jest.fn(async () => null),
  listFriends: jest.fn(async () => []),
  randomInviteCode: jest.fn(() => 'ABC234'),
  removeFriend: jest.fn(async () => true),
  resolveInvite: jest.fn(async () => null),
  saveProfile: jest.fn(async () => null),
  topEntries: jest.fn(async () => []),
  upsertWeeklyEntry: jest.fn(async () => true),
  INVITE_ALPHABET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  NICKNAME_PATTERN: /^[A-Za-z0-9ÇĞİÖŞÜçğıöşu_. -]+$/,
}));

const mocked = {
  addFriend: jest.mocked(addFriend),
  getProfile: jest.mocked(getProfile),
  listFriends: jest.mocked(listFriends),
  resolveInvite: jest.mocked(resolveInvite),
  saveProfile: jest.mocked(saveProfile),
  topEntries: jest.mocked(topEntries),
  upsertWeeklyEntry: jest.mocked(upsertWeeklyEntry),
};

const SIGNED_IN = { uid: 'u1', email: 'gizli@ornek.com', displayName: null };

function xpDb(xpValues: number[]): Database {
  return {
    exec: jest.fn(),
    run: jest.fn(),
    getFirst: jest.fn(),
    getAll: jest.fn(async () => xpValues.map((xp) => ({ payload: JSON.stringify({ xp }) }))) as Database['getAll'],
    transaction: jest.fn(async (task) => task()),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: null, userId: LOCAL_USER_ID, db: null, stats: { ...DEFAULT_STATS } });
  useSocialStore.setState({ profile: null, top: [], friends: [], loading: false, error: null });
});

describe('publishMyXp', () => {
  it('does nothing for guests', async () => {
    await useSocialStore.getState().publishMyXp();
    expect(mocked.upsertWeeklyEntry).not.toHaveBeenCalled();
  });

  it('does nothing when signed in but no nickname is set', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    await useSocialStore.getState().publishMyXp();
    expect(mocked.upsertWeeklyEntry).not.toHaveBeenCalled();
  });

  it('publishes the summed weekly XP under the own uid and nickname', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1', db: xpDb([10, 20]) });
    useSocialStore.setState({
      profile: { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '2026-10-25T00:00:00.000Z' },
    });
    await useSocialStore.getState().publishMyXp();
    expect(mocked.upsertWeeklyEntry).toHaveBeenCalledTimes(1);
    const [uid, nickname, xp] = mocked.upsertWeeklyEntry.mock.calls[0]!;
    expect(uid).toBe('u1');
    expect(nickname).toBe('YıldızKedi');
    expect(xp).toBe(30);
    expect(mocked.upsertWeeklyEntry.mock.calls[0]![3]).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe('addFriendByCode error paths', () => {
  const profile = { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '2026-10-25T00:00:00.000Z' };

  beforeEach(() => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    useSocialStore.setState({ profile });
  });

  it('rejects the own invite code', async () => {
    await expect(useSocialStore.getState().addFriendByCode('abc234')).rejects.toThrow('Kendi kodunu ekleyemezsin.');
    expect(mocked.resolveInvite).not.toHaveBeenCalled();
  });

  it('rejects an unknown code', async () => {
    mocked.resolveInvite.mockResolvedValueOnce(null);
    await expect(useSocialStore.getState().addFriendByCode('ZZZ999')).rejects.toThrow('Bilinmeyen davet kodu.');
    expect(mocked.addFriend).not.toHaveBeenCalled();
  });

  it('rejects duplicates', async () => {
    mocked.resolveInvite.mockResolvedValueOnce({ uid: 'u2', nickname: 'Bob', created_at: '2026-10-25T00:00:00.000Z' });
    useSocialStore.setState({
      friends: [{ friend_uid: 'u2', nickname: 'Bob', added_at: '2026-10-20T00:00:00.000Z', xp: 0 }],
    });
    await expect(useSocialStore.getState().addFriendByCode('DEF567')).rejects.toThrow('Bu kullanıcı zaten arkadaşın.');
    expect(mocked.addFriend).not.toHaveBeenCalled();
  });

  it('adds a new friend and reloads', async () => {
    mocked.resolveInvite.mockResolvedValueOnce({ uid: 'u3', nickname: 'Carol', created_at: '2026-10-25T00:00:00.000Z' });
    mocked.getProfile.mockResolvedValueOnce(profile);
    await useSocialStore.getState().addFriendByCode('GHI789');
    expect(mocked.addFriend).toHaveBeenCalledWith('u1', 'u3', 'Carol');
    expect(mocked.listFriends).toHaveBeenCalled();
  });
});

describe('setNickname', () => {
  it('saves the nickname through remote.social and refreshes the profile', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    const saved = { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '2026-10-25T00:00:00.000Z' };
    mocked.saveProfile.mockResolvedValueOnce(saved);
    mocked.getProfile.mockResolvedValueOnce(saved);
    await useSocialStore.getState().setNickname('  YıldızKedi  ');
    expect(mocked.saveProfile).toHaveBeenCalledWith('u1', 'YıldızKedi');
    expect(useSocialStore.getState().profile).toEqual(saved);
  });
});
