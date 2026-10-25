/**
 * Store integration: legacy Firebase account detection on boot and data migration
 * on the first Supabase sign-in. Supabase itself is mocked (no network); the real
 * legacy detection, migration SQL and outbox run against the in-memory FakeDb.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FakeDb } from '@/data/__tests__/fakeDb';
import {
  DEFAULT_STATS,
  LOCAL_USER_ID,
  createStatsRepo,
  listOutbox,
  setDbForTesting,
  type RemoteApi,
} from '@/data';
import { useAppStore } from '../store';

// The auth layer is replaced with controllable doubles; supabaseRemote returns
// `mockRemote` (null by default — see the ordering test below for a fake whose
// pull returns server rows).
let mockRemote: RemoteApi | null = null;
let mockAuthCb: ((user: { uid: string; email: string | null; displayName: null } | null) => void) | null = null;
jest.mock('@/data/remote/auth', () => ({
  AuthUnavailableError: class AuthUnavailableError extends Error {},
  authErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  currentUser: jest.fn(async () => null),
  onAuthChanged: jest.fn((cb: typeof mockAuthCb) => {
    mockAuthCb = cb;
    return () => {};
  }),
  signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(),
  sendLoginCode: jest.fn(), verifyLoginCode: jest.fn(), setPassword: jest.fn(), resetPassword: jest.fn(),
}));
jest.mock('@/data/remote/supabaseRemote', () => ({ supabaseRemote: () => mockRemote }));

const LEGACY = 'firebase-uid-1';
const NEW = 'supa-uid-1';
const T0 = Date.parse('2026-10-19T10:00:00Z');

let db: FakeDb;

beforeEach(async () => {
  await AsyncStorage.clear();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  db = new FakeDb();
  setDbForTesting(db);
  mockRemote = null;
  mockAuthCb = null;
  useAppStore.setState({
    ready: false, onboarded: false, welcomed: false, legacyAccount: null,
    db: null, user: null, userId: LOCAL_USER_ID, progress: {}, dueCount: 0,
    achievements: [], newAchievements: [], reminderHour: null,
  });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
});

test('boot without a session detects the leftover Firebase account and offers the migration screen', async () => {
  await AsyncStorage.setItem(
    'firebase:authUser:abc',
    JSON.stringify({ uid: LEGACY, email: 'ali@example.com' }),
  );
  await useAppStore.getState().boot();

  const s = useAppStore.getState();
  expect(s.ready).toBe(true);
  expect(s.user).toBeNull();
  expect(s.userId).toBe(LOCAL_USER_ID);
  expect(s.legacyAccount).toEqual({ uid: LEGACY, email: 'ali@example.com' });
});

test('boot without Supabase config skips legacy detection entirely (offline-only app)', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  await AsyncStorage.setItem('firebase:authUser:abc', JSON.stringify({ uid: LEGACY, email: 'e@x.y' }));
  await useAppStore.getState().boot();
  expect(useAppStore.getState().legacyAccount).toBeNull();
  expect(useAppStore.getState().welcomed).toBe(true);
});

test('first sign-in moves legacy rows to the new uid, enqueues a full push and clears the legacy key', async () => {
  // Old device state: progress under the Firebase uid, plus its session key.
  await createStatsRepo(db, LEGACY).save({ ...DEFAULT_STATS, xp: 42, streak: 2 }, T0);
  await AsyncStorage.setItem('firebase:authUser:abc', JSON.stringify({ uid: LEGACY, email: 'ali@example.com' }));

  await useAppStore.getState().boot();
  expect(useAppStore.getState().legacyAccount?.uid).toBe(LEGACY);

  // The sign-in lands via onAuthChanged (what verifyLoginCode triggers on success).
  mockAuthCb!({ uid: NEW, email: 'ali@example.com', displayName: null });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  const s = useAppStore.getState();
  expect(s.user?.uid).toBe(NEW);
  expect(s.userId).toBe(NEW);
  // The migration screen stays up (password step) until the form's onDone:
  // legacyAccount is cleared by finishLegacyMigration, not by the sign-in itself.
  expect(s.legacyAccount?.uid).toBe(LEGACY);
  expect(s.stats.xp).toBe(42);
  expect(s.stats.streak).toBe(2);

  expect(db.tables.user_stats!.filter((r) => r.user_id === LEGACY)).toHaveLength(0);
  expect(db.tables.user_stats!.find((r) => r.user_id === NEW)).toMatchObject({ xp: 42 });
  const outbox = await listOutbox(db);
  expect(outbox.length).toBeGreaterThan(0);
  expect(outbox.every((r) => (JSON.parse(r.payload) as { user_id: string }).user_id === NEW)).toBe(true);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);

  await useAppStore.getState().finishLegacyMigration();
  expect(useAppStore.getState().legacyAccount).toBeNull();
});

const SERVER_STATS_ROW = (uid: string) => ({
  user_id: uid,
  xp: 9999,
  streak: 7,
  last_active_date: '2026-10-01',
  streak_freezes: 0,
  hearts: 5,
  hearts_updated_at: new Date(T0 - 1000).toISOString(),
  daily_goal_xp: 50,
  xp_today: 0,
  updated_at: new Date(T0 - 1000).toISOString(),
});

test('sign-in pulls server data BEFORE adopting guest progress: the higher xp survives', async () => {
  // Guest played on this device (xp 10); the signed-in account already has
  // server data (xp 9999). The server pull must happen before adoption —
  // otherwise the guest rows are stamped `now`, shadow the server's pks in
  // pullChanges and overwrite xp 9999 with 10 on the next push.
  await createStatsRepo(db, LOCAL_USER_ID).save({ ...DEFAULT_STATS, xp: 10 }, T0);
  mockRemote = {
    upsert: jest.fn(async () => {}),
    pull: jest.fn(async (table: string, userId: string) =>
      table === 'user_stats' && userId === NEW ? [SERVER_STATS_ROW(NEW)] : [],
    ),
  };

  await useAppStore.getState().boot();
  mockAuthCb!({ uid: NEW, email: 'ali@example.com', displayName: null });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  const s = useAppStore.getState();
  expect(s.userId).toBe(NEW);
  expect(s.stats.xp).toBe(9999); // server data, not the guest's 10
  expect(db.tables.user_stats!.find((r) => r.user_id === NEW)).toMatchObject({ xp: 9999, streak: 7 });
  // Nothing may push the guest rows over the server data.
  const outbox = await listOutbox(db);
  expect(outbox.filter((r) => (JSON.parse(r.payload) as { user_id: string }).user_id === NEW)).toHaveLength(0);
});

test('sign-in migrates EVERY distinct legacy uid (entries under several API keys)', async () => {
  // Rows under two different legacy uids, each with its own session key —
  // migrating only the first entry would strand the second uid's rows while
  // clearLegacyAccount() still wipes both keys.
  const LEGACY_2 = 'firebase-uid-2';
  await createStatsRepo(db, LEGACY).save({ ...DEFAULT_STATS, xp: 42 }, T0);
  await createStatsRepo(db, LEGACY_2).save({ ...DEFAULT_STATS, xp: 7 }, T0);
  await AsyncStorage.setItem('firebase:authUser:keyA', JSON.stringify({ uid: LEGACY, email: 'a@x.y' }));
  await AsyncStorage.setItem('firebase:authUser:keyB', JSON.stringify({ uid: LEGACY_2, email: 'b@x.y' }));

  await useAppStore.getState().boot();
  mockAuthCb!({ uid: NEW, email: 'a@x.y', displayName: null });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  // Both legacy uids' rows moved; neither stranded.
  expect(db.tables.user_stats!.filter((r) => r.user_id === NEW)).toHaveLength(1);
  expect(db.tables.user_stats!.filter((r) => r.user_id === LEGACY)).toHaveLength(0);
  expect(db.tables.user_stats!.filter((r) => r.user_id === LEGACY_2)).toHaveLength(0);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test('finishLegacyMigration clears the flag and the legacy keys without a sign-in', async () => {
  await AsyncStorage.setItem('firebase:authUser:abc', JSON.stringify({ uid: LEGACY, email: 'ali@example.com' }));
  await useAppStore.getState().boot();
  expect(useAppStore.getState().legacyAccount).not.toBeNull();

  await useAppStore.getState().finishLegacyMigration();

  expect(useAppStore.getState().legacyAccount).toBeNull();
  expect(useAppStore.getState().welcomed).toBe(true);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});
