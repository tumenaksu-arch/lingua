/**
 * Store integration for daily quests (roadmap item 3a) against FakeDb:
 * claiming pays 10 XP exactly once through the normal stats pipeline, the
 * weekly chart includes quest XP, and 3 claims unlock the quests_day badge.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import type { QuestEvent } from '../quests';
import { useAppStore } from '../store';

let db: FakeDb;

/** Seeds today's events for the local user (bypasses repos — only the rows matter). */
function addTodayEvent(id: string, type: string, payload: Record<string, unknown>) {
  db.tables.events ??= [];
  db.tables.events.push({
    id,
    user_id: 'local',
    type,
    payload: JSON.stringify(payload),
    created_at: Date.now(),
  });
}

/** Makes every possible quest type completable today: 60 XP, 3 perfect lessons, 1 story. */
function seedFullDay() {
  addTodayEvent('l1', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('l2', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('l3', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('s1', 'story_completed', { xp: 10, correct: 3, total: 4 });
}

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null, quests: [] });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

test('boot refreshes quests: 3 quests for today, none done', () => {
  const quests = useAppStore.getState().quests;
  expect(quests).toHaveLength(3);
  expect(quests.every((q) => !q.done && !q.claimed && q.current === 0)).toBe(true);
});

test('refreshQuests reads today\'s events: seeded activity completes every quest', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quests = useAppStore.getState().quests;
  expect(quests).toHaveLength(3);
  expect(quests.every((q) => q.done && q.current === q.target)).toBe(true);
  expect(quests.every((q) => !q.claimed)).toBe(true);
});

test('claimQuest awards +10 XP once through the stats pipeline; a second claim returns 0 and logs one event', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  const xpBefore = useAppStore.getState().stats.xp;
  const xpTodayBefore = useAppStore.getState().stats.xpToday;

  const first = await useAppStore.getState().claimQuest(quest.id);
  expect(first.xpEarned).toBe(10);
  let s = useAppStore.getState();
  expect(s.stats.xp).toBe(xpBefore + 10);
  expect(s.stats.xpToday).toBe(xpTodayBefore + 10);
  expect(s.quests.find((q) => q.id === quest.id)?.claimed).toBe(true);

  const claims = (db.tables.events ?? []).filter((r) => r.type === 'quest_claimed');
  expect(claims).toHaveLength(1);
  const payload = JSON.parse(String(claims[0]!.payload)) as QuestEvent['payload'] & { xp: number; questId: string; date: string };
  expect(payload).toMatchObject({ xp: 10, questId: quest.id });

  const second = await useAppStore.getState().claimQuest(quest.id);
  expect(second.xpEarned).toBe(0);
  s = useAppStore.getState();
  expect(s.stats.xp).toBe(xpBefore + 10); // unchanged
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(1);
});

test('claimQuest on an unfinished quest returns 0 and changes nothing', async () => {
  const quest = useAppStore.getState().quests[0]!;
  const out = await useAppStore.getState().claimQuest(quest.id);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(0);
});

test('quest reward XP flows through the daily-goal / xp_today pipeline', async () => {
  await useAppStore.getState().setDailyGoal(15);
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const done = useAppStore.getState().quests.filter((q) => q.done);
  expect(done.length).toBeGreaterThanOrEqual(3);
  expect(useAppStore.getState().stats.xpToday).toBe(0); // events alone don't touch stats

  await useAppStore.getState().claimQuest(done[0]!.id);
  expect(useAppStore.getState().stats.xpToday).toBe(10);
  // the second reward crosses the daily goal → goal streak registered
  await useAppStore.getState().claimQuest(done[1]!.id);
  expect(useAppStore.getState().stats.xpToday).toBe(20);
  const meta = (db.tables.sync_meta ?? []).find((r) => r.key === 'goal_streak');
  expect(JSON.parse(String(meta?.value)).count).toBe(1);
});

test('weeklyXp includes quest reward XP in today\'s bucket', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  await useAppStore.getState().claimQuest(quest.id);
  const week = await useAppStore.getState().weeklyXp();
  expect(week).toHaveLength(7);
  expect(week[6]).toBe(80); // 70 from lessons+story + 10 quest reward
});

test('claiming all 3 of today\'s quests unlocks the quests_day achievement once', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  for (const q of useAppStore.getState().quests) {
    await useAppStore.getState().claimQuest(q.id);
  }
  const s = useAppStore.getState();
  expect(s.achievements).toContain('quests_day');
  expect(s.newAchievements).toContain('quests_day');
  // stays unlocked; never revoked, never duplicated
  await useAppStore.getState().refreshQuests();
  expect(useAppStore.getState().achievements.filter((id) => id === 'quests_day')).toHaveLength(1);
});
