/**
 * Store integration for the gem economy (job 3A) against FakeDb: the one-time
 * 50-gem welcome gift, gem earnings on lesson/story/quest completion, the
 * every-3-lessons chest with an injectable rng, and shop purchases.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import { PRICE_STREAK_FREEZE, PRICE_XP_BOOST } from '@/domain';
import type { LessonResult } from '@/domain';
import { useAppStore } from '../store';

const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;

let db: FakeDb;

function resultFor(lessonId: string, vocabIds: string[], perfect = true): LessonResult {
  return {
    lessonId,
    correct: perfect ? 8 : 6,
    total: 8,
    mistakes: perfect ? [] : ['x1', 'x2'],
    mistakesByType: {},
    durationMs: 60_000,
    vocabOutcomes: Object.fromEntries(vocabIds.map((v) => [v, perfect])),
  };
}

/** Seeds today's events so every daily quest is done (claimQuest path). */
function seedFullDay() {
  const now = Date.now();
  for (const [id, payload] of [
    ['l1', { xp: 20, correct: 8, total: 8, perfect: true }],
    ['l2', { xp: 20, correct: 8, total: 8, perfect: true }],
    ['l3', { xp: 20, correct: 8, total: 8, perfect: true }],
  ] as const) {
    db.tables.events ??= [];
    db.tables.events.push({ id, user_id: 'local', type: 'lesson_completed', payload: JSON.stringify(payload), created_at: now });
  }
  db.tables.events ??= [];
  db.tables.events.push({ id: 's1', user_id: 'local', type: 'story_completed', payload: JSON.stringify({ xp: 10, correct: 3, total: 4 }), created_at: now });
}

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null, quests: [], questDate: null, claimingQuestIds: [] });
  await useAppStore.getState().boot();
});

afterEach(() => jest.restoreAllMocks());
afterAll(() => setDbForTesting(null));

test('boot grants the one-time 50-gem welcome gift to legacy records (gems field absent)', () => {
  expect(useAppStore.getState().stats.gems).toBe(50);
});

test('the welcome gift is granted once: a second boot adds nothing', async () => {
  useAppStore.setState({ ready: false });
  await useAppStore.getState().boot();
  expect(useAppStore.getState().stats.gems).toBe(50);
});

test('finishLesson pays 10 gems for a perfect lesson and advances the chest counter', async () => {
  const before = useAppStore.getState().stats.gems ?? 0;
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  const s = useAppStore.getState();
  // +10 hatasız ders, +5 günlük hedefe ilk ulaşma (20 XP'lik ders 20'lik hedefi geçer).
  expect(s.stats.gems).toBe(before + 15);
  expect(s.stats.lessonsSinceChest).toBe(1);
});

test('finishLesson with mistakes pays 5 gems', async () => {
  const before = useAppStore.getState().stats.gems ?? 0;
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, false));
  expect(useAppStore.getState().stats.gems).toBe(before + 5);
});

test('reaching the daily goal for the first time pays 5 bonus gems', async () => {
  // Daily goal is 20; a perfect lesson earns 20 XP → goal crossed on the first lesson.
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  const s = useAppStore.getState();
  expect(s.stats.xpToday).toBeGreaterThanOrEqual(s.stats.dailyGoalXp);
  expect(s.stats.gems).toBe(50 + 10 + 5);
});

test('chest: every 3 lessons, paid once, injected rng picks the reward', async () => {
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(useAppStore.getState().stats.lessonsSinceChest).toBe(1);
  expect(await useAppStore.getState().openChest(() => 0.99)).toBeNull(); // too early

  // A second lesson on the same day still counts toward the chest.
  const second = trEn.units[0]!.lessons[1]!;
  await useAppStore.getState().finishLesson(resultFor(second.id, second.vocabIds));
  // Repeat completions also count — finish the same lesson again in practice mode.
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(useAppStore.getState().stats.lessonsSinceChest).toBe(3);

  const gemsBefore = useAppStore.getState().stats.gems ?? 0;
  const reward = await useAppStore.getState().openChest(() => 0.4); // → 15 gems
  expect(reward).toEqual({ kind: 'gems', amount: 15 });
  const s = useAppStore.getState();
  expect(s.stats.gems).toBe(gemsBefore + 15);
  expect(s.stats.lessonsSinceChest).toBe(0);
  // The reward is paid once: the chest is gone until 3 more lessons.
  expect(await useAppStore.getState().openChest(() => 0.4)).toBeNull();
});

test('chest boost reward activates double XP for the next lesson', async () => {
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  const reward = await useAppStore.getState().openChest(() => 0.99); // → 15 dk çift XP
  expect(reward).toEqual({ kind: 'xpBoost' });
  const out = await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(out.xpEarned).toBe(40); // 20 base ×2 — quest/chest XP excluded from the boost
});

test('claimQuest pays 10 gems along with the XP reward', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests.find((q) => q.done)!;
  const before = useAppStore.getState().stats.gems ?? 0;
  const out = await useAppStore.getState().claimQuest(quest.id);
  expect(out.xpEarned).toBe(10);
  expect(useAppStore.getState().stats.gems).toBe(before + 10);
});

test('finishStory pays 5 gems', async () => {
  const before = useAppStore.getState().stats.gems ?? 0;
  await useAppStore.getState().finishStory('u1.story', 3, 4);
  expect(useAppStore.getState().stats.gems).toBe(before + 5);
});

test('buyItem: freeze purchase deducts gems and respects the cap', async () => {
  useAppStore.setState({ stats: { ...useAppStore.getState().stats, gems: 500 } });
  const out = await useAppStore.getState().buyItem('streakFreeze');
  expect(out.ok).toBe(true);
  expect(out.gems).toBe(500 - PRICE_STREAK_FREEZE);
  expect(useAppStore.getState().stats.streakFreezes).toBe(1);

  // Cap is 2: the first two purchases succeed, the third is refused.
  const second = await useAppStore.getState().buyItem('streakFreeze');
  expect(second.ok).toBe(true);
  const third = await useAppStore.getState().buyItem('streakFreeze');
  expect(third.ok).toBe(false);
  expect(third.reason).toBe('full');
  expect(useAppStore.getState().stats.streakFreezes).toBe(2);
});

test('buyItem: insufficient balance is rejected without changes', async () => {
  useAppStore.setState({ stats: { ...useAppStore.getState().stats, gems: 10 } });
  const out = await useAppStore.getState().buyItem('streakFreeze');
  expect(out.ok).toBe(false);
  expect(out.reason).toBe('insufficient');
  expect(useAppStore.getState().stats.gems).toBe(10);
});

test('buyItem: xp boost doubles lesson XP until it expires', async () => {
  useAppStore.setState({ stats: { ...useAppStore.getState().stats, gems: 500 } });
  const buy = await useAppStore.getState().buyItem('xpBoost');
  expect(buy.ok).toBe(true);
  expect(useAppStore.getState().stats.gems).toBe(500 - PRICE_XP_BOOST);

  const boosted = await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(boosted.xpEarned).toBe(40);

  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
  const after = await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(after.xpEarned).toBe(20); // süre doldu: çarpan 1
});

test('buyItem: streak repair restores a streak lost within 2 days', async () => {
  // Simulate a broken streak: 8-day streak, last active 3 days ago.
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - 2); // 2 gün önce kırılmış: onarım penceresi içinde
  const lostOn = d.toISOString().slice(0, 10);
  useAppStore.setState({
    stats: {
      ...useAppStore.getState().stats,
      gems: 500,
      streak: 1,
      lostStreak: { value: 8, lostOn },
    },
  });
  const out = await useAppStore.getState().buyItem('streakRepair');
  expect(out.ok).toBe(true);
  const s = useAppStore.getState().stats;
  expect(s.streak).toBe(8);
  expect(s.lostStreak).toBeUndefined();
  expect(s.lastActiveDate).toBe(today);
  expect(s.gems).toBe(100);
});

test('buyItem: streak repair is unavailable when the streak was lost 3+ days ago', async () => {
  const d = new Date();
  d.setDate(d.getDate() - 4);
  useAppStore.setState({
    stats: {
      ...useAppStore.getState().stats,
      gems: 500,
      lostStreak: { value: 8, lostOn: d.toISOString().slice(0, 10) },
    },
  });
  const out = await useAppStore.getState().buyItem('streakRepair');
  expect(out.ok).toBe(false);
  expect(out.reason).toBe('unavailable');
  expect(useAppStore.getState().stats.gems).toBe(500);
});

test('gems stay local: the server outbox row never carries gem fields', async () => {
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  const rows = (db.tables.outbox ?? []).filter((r) => r.tbl === 'user_stats');
  const row = rows[rows.length - 1];
  expect(row).toBeTruthy();
  const payload = JSON.parse(String(row!.payload)) as Record<string, unknown>;
  expect(payload).not.toHaveProperty('gems');
  expect(payload).not.toHaveProperty('xp_boost_until');
  expect(payload).not.toHaveProperty('lost_streak');
  expect(payload).toHaveProperty('xp');
});
