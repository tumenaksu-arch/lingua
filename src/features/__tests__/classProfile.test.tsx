/**
 * Profile "Sınıfım" section (madde 5, wave 2b): class name + nickname, and
 * "Sınıftan ayrıl ve sınıf verimi sil" which confirms before calling
 * leaveClass. Anonymous class accounts see the keep-the-account note, the
 * "E-posta ekle" flow entry, and a sign-out warning that the account is lost.
 */
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS, LOCAL_USER_ID } from '@/data';
import { isAnonymousSession, leaveClass } from '@/data/remote/classes';
import { useAppStore } from '@/features/store';
import { useClassStore } from '@/features/classes/classStore';
import { useSettingsStore } from '@/ui/settingsStore';

import ProfileScreen from '@/app/(tabs)/profile';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
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
  leaveClass: jest.mocked(leaveClass),
  isAnonymousSession: jest.mocked(isAnonymousSession),
};

const ANON_USER = { uid: 'anon-1', email: null, displayName: null };
const CLASS = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const, takmaAd: 'YıldızKedi', joinedAt: '2026-10-20T10:00:00.000Z' };

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  // The account section (sync / sign-out) only renders when Supabase is configured.
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://supa.example.test';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAppStore.setState({
    user: ANON_USER,
    userId: 'anon-1',
    stats: { ...DEFAULT_STATS },
    progress: {},
  });
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, hydrated: true });
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

afterEach(() => {
  alertSpy.mockRestore();
});

async function renderProfile() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ProfileScreen />
    </SafeAreaProvider>,
  );
}

it('shows the class name and nickname in the "Sınıfım" section', async () => {
  await renderProfile();
  expect(screen.getByText('Sınıfım')).toBeTruthy();
  expect(screen.getByText('9-A İngilizce')).toBeTruthy();
  expect(screen.getByText('Takma adın: YıldızKedi')).toBeTruthy();
});

it('"Sınıftan ayrıl" confirms (explaining the teacher loses sight of you) and only then calls leaveClass', async () => {
  await renderProfile();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıftan ayrıl ve sınıf verimi sil' }));
  const [title, message, buttons] = alertSpy.mock.calls[0]!;
  expect(title).toBe('Sınıftan ayrıl');
  expect(String(message)).toMatch(/öğretmen seni ve öğrenme özetini.*artık görmez/s);
  const btns = buttons as { text: string; style?: string; onPress?: () => void }[];
  const cancel = btns.find((b) => b.style === 'cancel');
  const confirm = btns.find((b) => b.style === 'destructive');
  expect(cancel).toBeTruthy();
  expect(confirm).toBeTruthy();

  // Cancel first: no leave.
  cancel!.onPress?.();
  expect(mocked.leaveClass).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Sınıftan ayrıl ve sınıf verimi sil' }));
  const [, , buttons2] = alertSpy.mock.calls[1]!;
  (buttons2 as { style?: string; onPress?: () => void }[]).find((b) => b.style === 'destructive')?.onPress?.();
  expect(mocked.leaveClass).toHaveBeenCalledWith('c1');
});

it('a failed leave alerts "Ayrılamadın" and keeps the class row', async () => {
  mocked.leaveClass.mockRejectedValueOnce(new Error('Bağlantı yok. İnternetini kontrol edip tekrar dene.'));
  await renderProfile();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıftan ayrıl ve sınıf verimi sil' }));
  const [, , buttons] = alertSpy.mock.calls[0]!;
  (buttons as { style?: string; onPress?: () => void }[]).find((b) => b.style === 'destructive')?.onPress?.();

  await waitFor(() => expect(alertSpy.mock.calls.length).toBeGreaterThanOrEqual(2));
  const [title, message] = alertSpy.mock.calls[1]!;
  expect(title).toBe('Ayrılamadın');
  expect(String(message)).toMatch(/Bağlantı yok/);
  // The membership stays until the server call actually succeeds.
  expect(useClassStore.getState().myClasses).toHaveLength(1);
  expect(screen.getByText('9-A İngilizce')).toBeTruthy();
});

it('non-members get the "Sınıfa katıl" button instead', async () => {
  useClassStore.setState({ myClasses: [] });
  await renderProfile();
  expect(screen.getByRole('button', { name: 'Sınıfa katıl' })).toBeTruthy();
});

describe('anonymous account', () => {
  it('shows the note and the "E-posta ekle" flow entry', async () => {
    mocked.isAnonymousSession.mockResolvedValue(true);
    await renderProfile();
    expect(screen.getByText('Hesabın bu cihaza bağlı. Kalıcı yapmak için e-posta ekle.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'E-posta ekle' }));
    expect(screen.getByLabelText('E-posta')).toBeTruthy();
  });

  it('sign-out warns that the anonymous account (and its progress) is lost', async () => {
    mocked.isAnonymousSession.mockResolvedValue(true);
    await renderProfile();
    await fireEvent.press(screen.getByRole('button', { name: 'Çıkış yap' }));
    const [title, message, buttons] = alertSpy.mock.calls[0]!;
    expect(title).toBe('Çıkış');
    expect(String(message)).toMatch(/anonim.*kalıcı olarak kaybolur/s);
    expect((buttons as { text: string }[]).map((b) => b.text)).toContain('Yine de çık');
  });

  it('e-mail accounts keep the plain sign-out confirm', async () => {
    mocked.isAnonymousSession.mockResolvedValue(false);
    useAppStore.setState({ user: { uid: 'u1', email: 'gizli@ornek.com', displayName: null } });
    await renderProfile();
    await fireEvent.press(screen.getByRole('button', { name: 'Çıkış yap' }));
    expect(alertSpy.mock.calls[0]![1]).toBe('Hesaptan çıkılsın mı?');
  });

  it('guests (no user) see neither the anonymous note nor the class leave row', async () => {
    useAppStore.setState({ user: null, userId: LOCAL_USER_ID });
    useClassStore.setState({ myClasses: [], error: null });
    await renderProfile();
    expect(screen.queryByText('Hesabın bu cihaza bağlı. Kalıcı yapmak için e-posta ekle.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sınıftan ayrıl ve sınıf verimi sil' })).toBeNull();
    // Positive invariant: the class section itself still renders, so this
    // negative assertion cannot pass because the whole feature was deleted.
    expect(screen.getByText('Sınıfım')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sınıfa katıl' })).toBeTruthy();
  });
});
