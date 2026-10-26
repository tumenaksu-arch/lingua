/**
 * finishConversation (roadmap item 6) against the in-memory FakeDb: flat 10 XP
 * through the same stats pipeline as stories (streak, daily goal, weekly XP,
 * quests), logged as an idempotent `conversation_completed` event — at most
 * once per scenario per local day.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { DEFAULT_STATS, setDbForTesting } from '@/data';
import { CONVERSATION_XP, useAppStore } from '../store';
import { questProgress } from '../quests';

const SCENARIO = 'tr-en.konus.kafe';
const SCENARIO_2 = 'tr-en.konus.otel';

let db: FakeDb;

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({
    ready: false,
    onboarded: false,
    welcomed: false,
    db: null,
    progress: {},
    dueCount: 0,
    achievements: [],
    newAchievements: [],
    reminderHour: null,
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
  });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

test('finishConversation awards 10 XP and logs the conversation_completed event', async () => {
  const out = await useAppStore.getState().finishConversation(SCENARIO);
  expect(out.xpEarned).toBe(CONVERSATION_XP);

  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(10);
  expect(s.stats.xpToday).toBe(10);
  expect(s.stats.streak).toBe(1);

  const events = db.tables.events ?? [];
  const event = events.find((e) => e.type === 'conversation_completed');
  expect(event).toBeTruthy();
  expect(event!.id).toContain(SCENARIO);
  expect(JSON.parse(String(event!.payload))).toMatchObject({ xp: 10, scenarioId: SCENARIO });
});

test('a second finish of the same scenario on the same day pays nothing', async () => {
  await useAppStore.getState().finishConversation(SCENARIO);
  const out = await useAppStore.getState().finishConversation(SCENARIO);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(10);
  expect((db.tables.events ?? []).filter((e) => e.type === 'conversation_completed')).toHaveLength(1);
});

test('two overlapping finishes cannot double-pay', async () => {
  const first = useAppStore.getState().finishConversation(SCENARIO);
  const second = useAppStore.getState().finishConversation(SCENARIO);
  const [a, b] = await Promise.all([first, second]);
  expect(a.xpEarned + b.xpEarned).toBe(10);
  expect(useAppStore.getState().stats.xp).toBe(10);
});

test('a different scenario on the same day still pays', async () => {
  await useAppStore.getState().finishConversation(SCENARIO);
  const out = await useAppStore.getState().finishConversation(SCENARIO_2);
  expect(out.xpEarned).toBe(10);
  expect(useAppStore.getState().stats.xp).toBe(20);
});

test('conversation XP counts toward the daily goal and quest XP progress', async () => {
  await useAppStore.getState().setDailyGoal(10);
  await useAppStore.getState().finishConversation(SCENARIO);
  // daily goal crossed → goal streak row exists
  const goalRow = (db.tables.sync_meta ?? []).find((r) => r.key === 'goal_streak');
  expect(goalRow).toBeTruthy();
  // xp quests see the event's XP (questProgress is date-independent)
  const quests = [{ id: 'xp_50', title: '50 XP kazan', target: 50 }];
  const statuses = questProgress(quests, [{ type: 'conversation_completed', payload: { xp: 10, scenarioId: SCENARIO } }]);
  expect(statuses[0]?.current).toBe(10);
});

test('weeklyXp counts conversation XP in today\'s bucket', async () => {
  await useAppStore.getState().finishConversation(SCENARIO);
  const week = await useAppStore.getState().weeklyXp();
  expect(week).toHaveLength(7);
  expect(week[6]).toBe(10);
});

test('a stats failure after the event write cannot double-pay on retry', async () => {
  // stats.save (user_stats write) bozuk: event satırı yazılmış olmasına rağmen XP ödenmez.
  const run = jest.spyOn(db, 'run');
  run.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes('user_stats')) throw new Error('disk full');
    return FakeDb.prototype.run.call(db, sql, params as never);
  });
  await expect(useAppStore.getState().finishConversation(SCENARIO)).rejects.toThrow('disk full');
  run.mockRestore();

  // İdemarkayıcı event satırı kalıcı; XP yine de ödenmedi.
  expect((db.tables.events ?? []).filter((e) => e.type === 'conversation_completed')).toHaveLength(1);
  expect(useAppStore.getState().stats.xp).toBe(0);
  // Tekrar deneme ikinci bir ödeme yapmaz ("günde en fazla bir kez" garantisi).
  const out = await useAppStore.getState().finishConversation(SCENARIO);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
  expect((db.tables.events ?? []).filter((e) => e.type === 'conversation_completed')).toHaveLength(1);
});
