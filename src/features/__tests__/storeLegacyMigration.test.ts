/**
 * Store integration: legacy Firebase account detection on boot and data migration
 * on the first Supabase sign-in. Supabase itself is mocked (no network); the real
 * legacy detection, migration SQL and outbox run against the in-memory FakeDb.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FakeDb } from '@/data/__tests__/fakeDb';
import { DEFAULT_STATS, LOCAL_USER_ID, createStatsRepo, listOutbox, setDbForTesting } from '@/data';
import { useAppStore } from '../store';

// The auth layer is replaced with controllable doubles; supabaseRemote returns null
// so the migration skips the (network) pre-pull and merges with local rows only.
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
jest.mock('@/data/remote/supabaseRemote', () => ({ supabaseRemote: () => null }));

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
  expect(s.legacyAccount).toBeNull();
  expect(s.stats.xp).toBe(42);
  expect(s.stats.streak).toBe(2);

  expect(db.tables.user_stats!.filter((r) => r.user_id === LEGACY)).toHaveLength(0);
  expect(db.tables.user_stats!.find((r) => r.user_id === NEW)).toMatchObject({ xp: 42 });
  const outbox = await listOutbox(db);
  expect(outbox.length).toBeGreaterThan(0);
  expect(outbox.every((r) => (JSON.parse(r.payload) as { user_id: string }).user_id === NEW)).toBe(true);
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
