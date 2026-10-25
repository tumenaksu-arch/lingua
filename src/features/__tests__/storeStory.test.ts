/**
 * finishStory (roadmap item 2) against the in-memory FakeDb: XP = 10 + 2 per
 * correct answer, same streak/daily-goal pipeline as lessons, story progress row,
 * story_completed event — and never gating the learning path.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import { activeLessonId, storyXp, useAppStore } from '../store';

const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;
const storyId = 'tr-en.u1.story';

let db: FakeDb;

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

test('storyXp is 10 base + 2 per correct answer', () => {
  expect(storyXp(0)).toBe(10);
  expect(storyXp(3)).toBe(16);
  expect(storyXp(4)).toBe(18);
});

test('finishStory: xp, streak, progress row, story_completed event', async () => {
  const out = await useAppStore.getState().finishStory(storyId, 3, 4);
  expect(out.xpEarned).toBe(10 + 2 * 3);

  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(16);
  expect(s.stats.xpToday).toBe(16);
  expect(s.stats.streak).toBe(1);
  expect(s.progress[storyId]?.completedAt).toBeTruthy();
  // story ids are not in lessonOrder: the active lesson is untouched
  expect(activeLessonId(s.course, s.progress)).toBe(firstLesson.id);

  const events = db.tables.events ?? [];
  const storyEvent = events.find((e) => e.type === 'story_completed');
  expect(storyEvent).toBeTruthy();
  expect(JSON.parse(String(storyEvent!.payload))).toMatchObject({ xp: 16, correct: 3, total: 4 });

  const outboxTables = (db.tables.outbox ?? []).map((r) => r.tbl);
  expect(outboxTables).toEqual(expect.arrayContaining(['user_stats', 'user_progress', 'events']));
});

test('finishStory counts toward the daily goal exactly like a lesson', async () => {
  await useAppStore.getState().setDailyGoal(20);
  await useAppStore.getState().finishStory(storyId, 3, 4); // 16 XP: goal not yet reached
  let s = useAppStore.getState();
  expect(s.stats.xpToday).toBe(16);
  expect(s.stats.xp).toBe(16);

  await useAppStore.getState().finishStory(storyId, 4, 4); // +18: crosses the 20 XP goal
  s = useAppStore.getState();
  expect(s.stats.xp).toBe(34);
  expect(s.stats.xpToday).toBe(34);
  // completing the daily goal advances the goal streak (sync_meta row)
  const goalRow = (db.tables.sync_meta ?? []).find((r) => r.key === 'goal_streak');
  expect(goalRow).toBeTruthy();
});

test('re-finishing a story still works and never affects hearts or due cards', async () => {
  await useAppStore.getState().finishStory(storyId, 4, 4);
  const out = await useAppStore.getState().finishStory(storyId, 2, 4);
  expect(out.xpEarned).toBe(14);
  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(18 + 14);
  expect(s.stats.hearts).toBe(5);
  expect(s.dueCount).toBe(0);
  expect(db.tables.srs_cards ?? []).toHaveLength(0);
});
