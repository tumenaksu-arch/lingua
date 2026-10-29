/**
 * Anonymous students and the global league (madde 5, wave 2b): the league tab
 * explains that an e-mail account is required and points to the class screen;
 * the social store must NEVER touch the server for anonymous sessions (RLS
 * rejects them — the class league is their only leaderboard).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS, LOCAL_USER_ID } from '@/data';
import { getProfile, topEntries, upsertWeeklyEntry } from '@/data/remote/social';
import { isAnonymousSession } from '@/data/remote/classes';
import { useAppStore } from '@/features/store';
import { useClassStore } from '@/features/classes/classStore';
import { useSocialStore } from '@/features/social/socialStore';

import LeagueScreen from '@/app/(tabs)/league';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args), back: jest.fn() },
}));

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

jest.mock('@/data/remote/classes', () => ({
  joinAsStudent: jest.fn(),
  myClasses: jest.fn(async () => []),
  leaveClass: jest.fn(async () => true),
  listAssignments: jest.fn(async () => []),
  classLeague: jest.fn(async () => []),
  isAnonymousSession: jest.fn(async () => false),
}));

jest.mock('@/features/classes/announcements', () => ({
  listAnnouncements: jest.fn(async () => []),
}));

const mocked = {
  getProfile: jest.mocked(getProfile),
  topEntries: jest.mocked(topEntries),
  upsertWeeklyEntry: jest.mocked(upsertWeeklyEntry),
  isAnonymousSession: jest.mocked(isAnonymousSession),
};

const ANON_USER = { uid: 'anon-1', email: null, displayName: null };
const CLASS = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const, takmaAd: 'YıldızKedi', joinedAt: '2026-10-20T10:00:00.000Z' };

beforeEach(() => {
  jest.clearAllMocks();
  mockRouterPush.mockClear();
  useAppStore.setState({ user: null, userId: LOCAL_USER_ID, db: null, stats: { ...DEFAULT_STATS } });
  useSocialStore.setState({ profile: null, top: [], friends: [], loading: false, error: null });
  useClassStore.setState({
    myClasses: [CLASS],
    assignments: {},
    announcements: {},
    league: {},
    loading: false,
    error: null,
    load: jest.fn(async () => {}) as unknown as () => Promise<void>,
  });
});

it('socialStore.load never calls the server for an anonymous session', async () => {
  useAppStore.setState({ user: ANON_USER, userId: 'anon-1' });
  mocked.isAnonymousSession.mockResolvedValue(true);
  await useSocialStore.getState().load();
  expect(mocked.getProfile).not.toHaveBeenCalled();
  expect(mocked.topEntries).not.toHaveBeenCalled();
  expect(useSocialStore.getState().profile).toBeNull();
});

it('socialStore.publishMyXp never publishes for an anonymous session', async () => {
  useAppStore.setState({ user: ANON_USER, userId: 'anon-1' });
  useSocialStore.setState({ profile: { user_id: 'anon-1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '' } });
  mocked.isAnonymousSession.mockResolvedValue(true);
  await useSocialStore.getState().publishMyXp();
  expect(mocked.upsertWeeklyEntry).not.toHaveBeenCalled();
});

it('e-mail accounts still publish normally', async () => {
  useAppStore.setState({ user: { uid: 'u1', email: 'gizli@ornek.com', displayName: null }, userId: 'u1', db: null });
  useSocialStore.setState({ profile: { user_id: 'u1', nickname: 'Kedi', invite_code: 'ABC234', updated_at: '' } });
  mocked.isAnonymousSession.mockResolvedValue(false);
  await useSocialStore.getState().publishMyXp();
  expect(mocked.upsertWeeklyEntry).toHaveBeenCalledTimes(1);
});

it('league screen: anonymous member sees the explanation and a shortcut to the class screen', async () => {
  useAppStore.setState({ user: ANON_USER, userId: 'anon-1' });
  mocked.isAnonymousSession.mockResolvedValue(true);
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LeagueScreen />
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Genel lig için e-postalı hesap gerekir. Sınıf ligin sınıf ekranında.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfına git' }));
  expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/sinif/[classId]', params: { classId: 'c1' } });
  await waitFor(() => expect(mocked.getProfile).not.toHaveBeenCalled());
});

it('league screen: anonymous non-member sees the explanation without the class button', async () => {
  useAppStore.setState({ user: ANON_USER, userId: 'anon-1' });
  useClassStore.setState({ myClasses: [] });
  mocked.isAnonymousSession.mockResolvedValue(true);
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LeagueScreen />
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Genel lig için e-postalı hesap gerekir. Sınıf ligin sınıf ekranında.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Sınıfına git' })).toBeNull();
});

it('league screen: no global-league nickname form flashes while the anonymous check is pending', async () => {
  useAppStore.setState({ user: ANON_USER, userId: 'anon-1' });
  // The check stays pending until the test resolves it.
  let resolveCheck: (v: boolean) => void = () => {};
  mocked.isAnonymousSession.mockImplementation(() => new Promise<boolean>((res) => {
    resolveCheck = res;
  }));
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LeagueScreen />
    </SafeAreaProvider>,
  );
  // Anonymous user + unresolved check: the NicknameForm (which RLS would
  // reject on submit) must NOT flash.
  expect(screen.queryByLabelText('Takma ad')).toBeNull();
  expect(screen.queryByText(/Genel lig için e-postalı hesap gerekir/)).toBeNull();

  resolveCheck(true);
  expect(await screen.findByText('Genel lig için e-postalı hesap gerekir. Sınıf ligin sınıf ekranında.')).toBeTruthy();
  expect(screen.queryByLabelText('Takma ad')).toBeNull();
});
