/**
 * Store integration for the Practice Hub (job 1A): finishLesson records the
 * exercises answered wrong (and the ones answered right) into the device-local
 * mistakes table; finishPractice replays outcomes (2 consecutive correct →
 * dropped) and pays the session XP (10 XP at ≥ 50% accuracy, 0 below).
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import type { LessonResult } from '@/domain';
import { useAppStore } from '../store';

const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;
const [wrongA, wrongB] = firstLesson.exercises.map((e) => e.id);

let db: FakeDb;

function lessonResult(mistakes: string[]): LessonResult {
  return {
    lessonId: firstLesson.id,
    correct: firstLesson.exercises.length - mistakes.length,
    total: firstLesson.exercises.length,
    mistakes,
    mistakesByType: {},
    durationMs: 60_000,
    vocabOutcomes: {},
  };
}

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null, stats: { xp: 0, streak: 0, lastActiveDate: null, streakFreezes: 0, hearts: 5, heartsUpdatedAt: 0, dailyGoalXp: 20, xpToday: 0 } });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

test('finishLesson stores the exercises answered wrong; never-wrong exercises stay untracked', async () => {
  await useAppStore.getState().finishLesson(lessonResult([wrongA, wrongB]));

  const rows = db.tables.mistakes ?? [];
  expect(rows).toHaveLength(2); // only the two wrong exercises are tracked
  expect(rows.find((r) => r.exercise_id === wrongA)).toMatchObject({ wrong_count: 1, correct_streak: 0 });
  expect(rows.find((r) => r.exercise_id === wrongB)).toMatchObject({ wrong_count: 1, correct_streak: 0 });
  expect(rows.every((r) => r.course_id === trEn.id)).toBe(true);
});

test('a later lesson answered right counts as one correct toward clearing', async () => {
  await useAppStore.getState().finishLesson(lessonResult([wrongA]));
  await useAppStore.getState().finishLesson(lessonResult([])); // same lesson re-run, all correct
  const [row] = await useAppStore.getState().mistakeEntries(10);
  expect(row).toMatchObject({ exerciseId: wrongA, wrongCount: 1, correctStreak: 1 });
});

test('mistakeCount / mistakeEntries / weakWordCards read the active course', async () => {
  const s = useAppStore.getState();
  expect(await s.mistakeCount()).toBe(0);

  await s.finishLesson(lessonResult([wrongA]));
  expect(await useAppStore.getState().mistakeCount()).toBe(1);
  const entries = await useAppStore.getState().mistakeEntries(10);
  expect(entries.map((e) => e.exerciseId)).toEqual([wrongA]);

  // weakWordCards: no cards yet → empty
  expect(await useAppStore.getState().weakWordCards(20)).toHaveLength(0);
});

test('finishPractice drops an exercise after two consecutive correct answers', async () => {
  await useAppStore.getState().finishLesson(lessonResult([wrongA]));
  expect(await useAppStore.getState().mistakeCount()).toBe(1);

  await useAppStore.getState().finishPractice('mistakes', 1, 1, [], [wrongA]);
  expect(await useAppStore.getState().mistakeCount()).toBe(1); // streak 1, still listed

  await useAppStore.getState().finishPractice('mistakes', 1, 1, [], [wrongA]);
  expect(await useAppStore.getState().mistakeCount()).toBe(0); // streak 2 → dropped
});

test('finishPractice counts a wrong answer in the session: streak resets and the row stays', async () => {
  await useAppStore.getState().finishLesson(lessonResult([wrongA]));
  await useAppStore.getState().finishPractice('mistakes', 1, 2, [], [wrongA]); // streak 1
  await useAppStore.getState().finishPractice('mistakes', 0, 1, [wrongA], []); // wrong → reset
  expect(await useAppStore.getState().mistakeCount()).toBe(1);
  const [row] = await useAppStore.getState().mistakeEntries(1);
  expect(row).toMatchObject({ wrongCount: 2, correctStreak: 0 });
});

describe('finishPractice XP', () => {
  it('awards 10 XP at ≥ 50% accuracy through the stats pipeline and logs practice_completed', async () => {
    const out = await useAppStore.getState().finishPractice('mistakes', 5, 10);
    expect(out.xpEarned).toBe(10);
    const s = useAppStore.getState();
    expect(s.stats.xp).toBe(10);
    expect(s.stats.xpToday).toBe(10);
    expect(s.stats.streak).toBe(1);

    const row = (db.tables.events ?? []).find((r) => r.type === 'practice_completed');
    expect(row).toBeTruthy();
    expect(JSON.parse(String(row!.payload))).toMatchObject({ xp: 10, mode: 'mistakes', correct: 5, total: 10 });
  });

  it('awards 0 XP below 50% (no stats change, event still logged with xp 0)', async () => {
    const out = await useAppStore.getState().finishPractice('words', 2, 10);
    expect(out.xpEarned).toBe(0);
    const s = useAppStore.getState();
    expect(s.stats.xp).toBe(0);
    expect(s.stats.xpToday).toBe(0);

    const row = (db.tables.events ?? []).find((r) => r.type === 'practice_completed');
    expect(row).toBeTruthy();
    expect(JSON.parse(String(row!.payload))).toMatchObject({ xp: 0, mode: 'words', correct: 2, total: 10 });
  });

  it('moves the daily goal forward like a lesson does', async () => {
    useAppStore.setState({ stats: { ...useAppStore.getState().stats, dailyGoalXp: 10 } });
    const out = await useAppStore.getState().finishPractice('mistakes', 5, 10);
    expect(out.xpEarned).toBe(10);
    expect(useAppStore.getState().stats.xpToday).toBe(10);
  });
});
