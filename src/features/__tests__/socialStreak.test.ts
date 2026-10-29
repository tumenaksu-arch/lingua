import { waitFor } from '@testing-library/react-native';

import { DEFAULT_STATS, LOCAL_USER_ID } from '@/data';
import { listFriendStreaks, markActivityToday } from '@/data/remote/social';
import { useAppStore } from '../store';
import { startSocialSync, useSocialStore } from '../social/socialStore';

jest.mock('@/data/remote/social', () => ({
  addFriend: jest.fn(async () => true),
  entriesFor: jest.fn(async () => []),
  getProfile: jest.fn(async () => null),
  listFriendStreaks: jest.fn(async () => []),
  listFriends: jest.fn(async () => []),
  markActivityToday: jest.fn(async () => true),
  randomInviteCode: jest.fn(() => 'ABC234'),
  removeFriend: jest.fn(async () => true),
  resolveInvite: jest.fn(async () => null),
  saveProfile: jest.fn(async () => null),
  topEntries: jest.fn(async () => []),
  upsertWeeklyEntry: jest.fn(async () => true),
  INVITE_ALPHABET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  NICKNAME_PATTERN: /^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$/,
}));

const mocked = {
  listFriendStreaks: jest.mocked(listFriendStreaks),
  markActivityToday: jest.mocked(markActivityToday),
};

const SIGNED_IN = { uid: 'u1', email: 'gizli@ornek.com', displayName: null };
const PROFILE = { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '2026-10-25T00:00:00.000Z' };

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: null, userId: LOCAL_USER_ID, db: null, stats: { ...DEFAULT_STATS } });
  useSocialStore.setState({ profile: null, top: [], friends: [], friendStreaks: [], loading: false, error: null });
});

// Idempotent within this test file's module registry; subscribes once.
startSocialSync();

describe('refreshFriendStreaks', () => {
  it('guests never call the server', async () => {
    await useSocialStore.getState().refreshFriendStreaks();
    expect(mocked.listFriendStreaks).not.toHaveBeenCalled();
    expect(useSocialStore.getState().friendStreaks).toEqual([]);
  });

  it('signed-in user with a profile loads the mutual streaks into state', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    useSocialStore.setState({ profile: PROFILE });
    mocked.listFriendStreaks.mockResolvedValueOnce([
      { friend_uid: 'u2', streak: 4, me_today: true, friend_today: false },
    ]);
    await useSocialStore.getState().refreshFriendStreaks();
    expect(useSocialStore.getState().friendStreaks).toEqual([
      { friend_uid: 'u2', streak: 4, me_today: true, friend_today: false },
    ]);
  });

  it('load() refreshes the streaks together with the friend list', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    const { getProfile } = jest.requireMock<typeof import('@/data/remote/social')>('@/data/remote/social');
    jest.mocked(getProfile).mockResolvedValue(PROFILE);
    mocked.listFriendStreaks.mockResolvedValueOnce([
      { friend_uid: 'u2', streak: 2, me_today: true, friend_today: true },
    ]);
    await useSocialStore.getState().load();
    expect(mocked.listFriendStreaks).toHaveBeenCalled();
    expect(useSocialStore.getState().friendStreaks).toHaveLength(1);
  });
});

// Sequential: the module-level subscriber keeps its "last seen" XP values and
// the once-per-day mark across the steps, which is exactly what is asserted.
describe('activity day marking via startSocialSync', () => {
  it('guest XP gains never reach the server', async () => {
    useAppStore.setState({ user: null, stats: { ...DEFAULT_STATS, xp: 10, xpToday: 10 } });
    await waitFor(() => expect(mocked.markActivityToday).not.toHaveBeenCalled());
  });

  it('a failed write retries on the next increase; success marks the day once', async () => {
    useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
    // Offline: the first write fails → the day stays unmarked.
    mocked.markActivityToday.mockResolvedValueOnce(false);
    useAppStore.setState({ user: SIGNED_IN, stats: { ...DEFAULT_STATS, xp: 10, xpToday: 10 } });
    await waitFor(() => expect(mocked.markActivityToday).toHaveBeenCalledTimes(1));

    // Still offline on the second gain → retried (günde tek upsert değil, çünkü ilki başarısız).
    mocked.markActivityToday.mockResolvedValueOnce(false);
    useAppStore.setState({ user: SIGNED_IN, stats: { ...DEFAULT_STATS, xp: 20, xpToday: 20 } });
    await waitFor(() => expect(mocked.markActivityToday).toHaveBeenCalledTimes(2));

    // Back online: third gain finally marks the day…
    useAppStore.setState({ user: SIGNED_IN, stats: { ...DEFAULT_STATS, xp: 30, xpToday: 30 } });
    await waitFor(() => expect(mocked.markActivityToday).toHaveBeenCalledTimes(3));

    // …and any further gain the same day is a no-op (günde yalnız bir upsert).
    useAppStore.setState({ user: SIGNED_IN, stats: { ...DEFAULT_STATS, xp: 45, xpToday: 45 } });
    await waitFor(() => expect(mocked.markActivityToday).toHaveBeenCalledTimes(3));
  });

  it('total XP can change without an activity write when xpToday does not increase', async () => {
    // xp advances (e.g. a late sync of total-only data) but xpToday stays put:
    // no new activity write fires (the day was already marked in the previous test).
    useAppStore.setState({ user: SIGNED_IN, stats: { ...DEFAULT_STATS, xp: 500, xpToday: 45 } });
    await waitFor(() => expect(mocked.markActivityToday).toHaveBeenCalledTimes(0));
  });
});
