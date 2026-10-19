/**
 * Store integration tests against the in-memory FakeDb (no sqlite, no Supabase:
 * EXPO_PUBLIC_SUPABASE_* are unset in jest, so the store runs in local-only mode).
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import type { LessonResult } from '@/domain';
import { activeLessonId, lessonOrder, useAppStore } from '../store';

// db.ts imports expo-sqlite (native); the store is pointed at FakeDb via setDbForTesting.
// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;

function resultFor(lessonId: string, vocabIds: string[], allCorrect = true): LessonResult {
  return {
    lessonId,
    correct: allCorrect ? 8 : 6,
    total: 8,
    mistakes: allCorrect ? [] : ['x1', 'x2'],
    durationMs: 60_000,
    vocabOutcomes: Object.fromEntries(vocabIds.map((v, i) => [v, allCorrect || i % 2 === 0])),
  };
}

let db: FakeDb;
const DAY = 86_400_000;

/** Advances Date.now() by `ms` for the rest of the test. */
function timeTravel(ms: number) {
  const t = Date.now() + ms;
  jest.spyOn(Date, 'now').mockReturnValue(t);
}

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, db: null, progress: {}, dueCount: 0 });
  await useAppStore.getState().boot();
});

afterEach(() => jest.restoreAllMocks());
afterAll(() => setDbForTesting(null));

test('boot: defaults, first course, not onboarded, nothing due', () => {
  const s = useAppStore.getState();
  expect(s.ready).toBe(true);
  expect(s.onboarded).toBe(false);
  expect(s.userId).toBe('local');
  expect(s.course.id).toBe(trEn.id);
  expect(s.stats.xp).toBe(0);
  expect(s.stats.hearts).toBe(5);
  expect(s.dueCount).toBe(0);
  expect(activeLessonId(s.course, s.progress)).toBe(firstLesson.id);
});

test('finishLesson: xp + streak, progress row, SRS cards for vocab, outbox rows', async () => {
  const out = await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(out.xpEarned).toBe(10 + 5 + 5); // base + perfect + max combo
  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(20);
  expect(s.stats.xpToday).toBe(20);
  expect(s.stats.streak).toBe(1);
  expect(s.progress[firstLesson.id]?.completedAt).toBeTruthy();
  expect(s.progress[firstLesson.id]?.crowns).toBe(1);
  expect(activeLessonId(s.course, s.progress)).toBe(lessonOrder(s.course)[1]);

  const cards = db.tables.srs_cards ?? [];
  expect(cards.map((c) => c.vocab_id).sort()).toEqual([...firstLesson.vocabIds].sort());
  // every card was reviewed once (correct) → reps 1, due tomorrow, not due now
  expect(cards.every((c) => c.reps === 1)).toBe(true);
  expect(s.dueCount).toBe(0);

  const outboxTables = (db.tables.outbox ?? []).map((r) => r.tbl);
  expect(outboxTables).toEqual(expect.arrayContaining(['user_stats', 'user_progress', 'srs_cards', 'events']));
});

test('finishLesson with mistakes: wrong vocab resets to reps 0 and all cards are due next day (SM-2)', async () => {
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, false));
  expect(useAppStore.getState().stats.xp).toBe(10 + 4); // no perfect bonus, combo round(0.75*5)=4
  const cards = db.tables.srs_cards ?? [];
  const wrongIds = firstLesson.vocabIds.filter((_, i) => i % 2 !== 0);
  expect(cards.filter((c) => c.reps === 0).map((c) => c.vocab_id).sort()).toEqual(wrongIds.sort());
  expect(useAppStore.getState().dueCount).toBe(0);
  timeTravel(DAY + 1000);
  expect(await useAppStore.getState().loadDueCards()).toHaveLength(firstLesson.vocabIds.length);
});

test('reviewCard reschedules a due card: correct → 6 days, wrong → 1 day', async () => {
  await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  timeTravel(DAY + 1000);
  const due = await useAppStore.getState().loadDueCards();
  expect(due.length).toBe(firstLesson.vocabIds.length);

  await useAppStore.getState().reviewCard(due[0]!, true, 2000);
  await useAppStore.getState().reviewCard(due[1]!, false, 2000);
  expect(useAppStore.getState().dueCount).toBe(due.length - 2);

  const byId = Object.fromEntries((db.tables.srs_cards ?? []).map((c) => [c.vocab_id, c]));
  expect(byId[due[0]!.vocabId]!.interval_days).toBe(6);
  expect(byId[due[1]!.vocabId]!.interval_days).toBe(1);
  expect(byId[due[1]!.vocabId]!.reps).toBe(0);
});

test('selectCourse persists and survives a re-boot', async () => {
  const other = courses[1]!;
  await useAppStore.getState().selectCourse(other.id);
  expect(useAppStore.getState().course.id).toBe(other.id);
  useAppStore.setState({ ready: false });
  await useAppStore.getState().boot();
  expect(useAppStore.getState().course.id).toBe(other.id);
});

test('completeOnboarding sets course, goal and persists the flag', async () => {
  await useAppStore.getState().completeOnboarding(courses[2]!.id, 30);
  let s = useAppStore.getState();
  expect(s.onboarded).toBe(true);
  expect(s.course.id).toBe(courses[2]!.id);
  expect(s.stats.dailyGoalXp).toBe(30);
  useAppStore.setState({ ready: false, onboarded: false });
  await useAppStore.getState().boot();
  s = useAppStore.getState();
  expect(s.onboarded).toBe(true);
  expect(s.stats.dailyGoalXp).toBe(30);
});

test('finishLesson reports when the daily goal is crossed', async () => {
  await useAppStore.getState().setDailyGoal(10);
  const out = await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds));
  expect(out.dailyGoalJustReached).toBe(true);
});
