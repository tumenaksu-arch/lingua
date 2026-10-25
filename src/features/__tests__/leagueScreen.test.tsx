import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Share } from 'react-native';

import { DEFAULT_STATS, LOCAL_USER_ID } from '@/data';
import { entriesFor, getProfile, listFriends, saveProfile, topEntries } from '@/data/remote/social';
import { useAppStore } from '@/features/store';
import { useSocialStore } from '@/features/social/socialStore';

import LeagueScreen from '@/app/(tabs)/league';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args), back: jest.fn() },
}));

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
  NICKNAME_PATTERN: /^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$/,
}));

const mocked = {
  entriesFor: jest.mocked(entriesFor),
  getProfile: jest.mocked(getProfile),
  listFriends: jest.mocked(listFriends),
  saveProfile: jest.mocked(saveProfile),
  topEntries: jest.mocked(topEntries),
};

const PROFILE = { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: '2026-10-25T00:00:00.000Z' };
const SIGNED_IN = { uid: 'u1', email: 'gizli@ornek.com', displayName: null };

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  useAppStore.setState({ user: null, userId: LOCAL_USER_ID, db: null, stats: { ...DEFAULT_STATS } });
  useSocialStore.setState({ profile: null, top: [], friends: [], loading: false, error: null });
});

async function renderLeague() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LeagueScreen />
    </SafeAreaProvider>,
  );
}

it('guest view explains the league and "Giriş yap" navigates to the auth route', async () => {
  await renderLeague();

  expect(screen.getByText(/Haftalık ligde yarışmak/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));
  expect(mockRouterPush).toHaveBeenCalledWith('/auth');
});

it('signed-in without a nickname shows the form with Turkish validation', async () => {
  useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
  await renderLeague();

  expect(screen.getByText(/E-posta adresin hiçbir yerde görünmez/)).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Takma ad'), 'ab');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
  expect(screen.getByText('Takma ad 3–20 karakter olmalı.')).toBeTruthy();
  expect(mocked.saveProfile).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Takma ad'), '!!!');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
  expect(screen.getByText(/yalnızca harf, rakam/)).toBeTruthy();

  mocked.saveProfile.mockResolvedValueOnce(PROFILE);
  await fireEvent.changeText(screen.getByLabelText('Takma ad'), 'YıldızKedi');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(mocked.saveProfile).toHaveBeenCalledWith('u1', 'YıldızKedi'));
});

it('week list ranks entries and highlights the own row', async () => {
  useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
  mocked.getProfile.mockResolvedValue(PROFILE);
  mocked.topEntries.mockResolvedValue([
    { uid: 'u2', nickname: 'Bob', xp: 50, updated_at: '2026-10-25T00:00:00.000Z' },
    { uid: 'u1', nickname: 'YıldızKedi', xp: 30, updated_at: '2026-10-25T00:00:00.000Z' },
  ]);
  await renderLeague();

  expect(await screen.findByLabelText('Sıra 1: Bob, 50 XP')).toBeTruthy();
  // The own row is marked with the copper accent and the ", sen" suffix.
  const own = await screen.findByLabelText('Sıra 2: YıldızKedi, 30 XP, sen');
  expect(own).toBeTruthy();
  expect(own.props.accessibilityState).toEqual({ selected: true });
});

it('never renders the user e-mail anywhere', async () => {
  useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
  mocked.getProfile.mockResolvedValue(PROFILE);
  mocked.topEntries.mockResolvedValue([
    { uid: 'u1', nickname: 'YıldızKedi', xp: 30, updated_at: '2026-10-25T00:00:00.000Z' },
  ]);
  await renderLeague();

  await screen.findByLabelText(/, sen/);
  expect(screen.queryByText(/gizli@ornek\.com/)).toBeNull();
  expect(screen.queryByText(/@ornek/)).toBeNull();
});

it('friends tab shows the invite code and ranks everyone by this week\u2019s XP, own row included', async () => {
  useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
  mocked.getProfile.mockResolvedValue(PROFILE);
  mocked.topEntries.mockResolvedValue([
    { uid: 'u2', nickname: 'Bob', xp: 50, updated_at: '2026-10-25T00:00:00.000Z' },
    { uid: 'u1', nickname: 'YıldızKedi', xp: 30, updated_at: '2026-10-25T00:00:00.000Z' },
  ]);
  mocked.listFriends.mockResolvedValue([
    { friend_uid: 'u2', nickname: 'Bob', added_at: '2026-10-20T00:00:00.000Z' },
  ]);
  mocked.entriesFor.mockResolvedValue([
    { uid: 'u2', nickname: 'Bob', xp: 50, updated_at: '2026-10-25T00:00:00.000Z' },
  ]);
  await renderLeague();

  await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
  expect(await screen.findByLabelText('Davet kodu ABC234')).toBeTruthy();
  // Bob leads with 50 XP; the player's own row must show the real 30 XP from
  // the top list, not a hardcoded 0 (which would also rank last).
  expect(await screen.findByLabelText('Sıra 1: Bob, 50 XP')).toBeTruthy();
  expect(await screen.findByLabelText('Sıra 2: YıldızKedi, 30 XP, sen')).toBeTruthy();
});

it('falls back to the share sheet when the clipboard write rejects', async () => {
  useAppStore.setState({ user: SIGNED_IN, userId: 'u1' });
  mocked.getProfile.mockResolvedValue(PROFILE);
  // Android WebView: navigator.clipboard.writeText exists but rejects.
  const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } },
    configurable: true,
  });
  const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
  try {
    await renderLeague();
    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
    await fireEvent.press(screen.getByRole('button', { name: /Kodu kopyala/ }));
    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({ message: 'Love-Vox davet kodum: ABC234' }),
    );
  } finally {
    shareSpy.mockRestore();
    if (navDescriptor) Object.defineProperty(globalThis, 'navigator', navDescriptor);
  }
});
