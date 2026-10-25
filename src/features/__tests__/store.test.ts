/**
 * Store integration tests against the in-memory FakeDb (no sqlite, no Firebase:
 * EXPO_PUBLIC_FIREBASE_* are unset in jest, so the store runs in local-only mode).
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import type { Exercise, LessonResult } from '@/domain';
import { answer, createLesson, isFinished, toResult } from '@/domain/lesson';
import { activeLessonId, lessonOrder, useAppStore } from '../store';

// db.ts imports expo-sqlite (native); the store is pointed at FakeDb via setDbForTesting.
// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist.


const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;

function resultFor(lessonId: string, vocabIds: string[], allCorrect = true): LessonResult {
  return {
    lessonId,
    correct: allCorrect ? 8 : 6,
    total: 8,
    mistakes: allCorrect ? [] : ['x1', 'x2'],
    mistakesByType: {},
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
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null });
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

describe('lesson_completed event payload (teacher "Zorlanılanlar")', () => {
  // Real exercises answered through the lesson state machine, so mistakesByType
  // is produced by toResult exactly as in the lesson flow (practice/repeat included).
  const exercises: Exercise[] = [
    { id: 'e1', type: 'translate_build', promptLang: 'tr', prompt: 'p', bank: ['a'], answers: ['a'] },
    { id: 'e2', type: 'translate_build', promptLang: 'tr', prompt: 'p', bank: ['b'], answers: ['b'] },
    { id: 'e3', type: 'listen_type', promptLang: 'tr', audioText: 'x', audioLang: 'en', answers: ['x'] },
    { id: 'e4', type: 'select_translation', promptLang: 'tr', prompt: 'p', options: ['a', 'b'], correctIndex: 0 },
  ];

  /** Runs the lesson once; ids in `wrongOnce` are answered wrong on the first pass (then re-answered right). */
  function runLesson(wrongOnce: string[]): LessonResult {
    let s = createLesson(firstLesson.id, exercises, Infinity);
    const wrong = new Set(wrongOnce);
    while (!isFinished(s)) {
      const id = s.queue[0]!;
      s = answer(s, id, !(s.answered < exercises.length && wrong.has(id)));
    }
    return toResult(s, 60_000);
  }

  function eventPayload(): Record<string, unknown> {
    const row = (db.tables.events ?? []).find((r) => r.type === 'lesson_completed');
    expect(row).toBeTruthy();
    return JSON.parse(row!.payload as string) as Record<string, unknown>;
  }

  test('payload carries lessonId and mistakes_by_type counted per exercise type', async () => {
    const result = runLesson(['e1', 'e2', 'e3']);
    expect(result.mistakesByType).toEqual({ translate_build: 2, listen_type: 1 });
    await useAppStore.getState().finishLesson(result);

    const payload = eventPayload();
    expect(payload.lessonId).toBe(firstLesson.id);
    expect(payload.mistakes_by_type).toEqual({ translate_build: 2, listen_type: 1 });
    expect(payload.correct).toBe(result.correct);
    expect(payload.total).toBe(result.total);
    expect(payload.perfect).toBe(false);
  });

  test('perfect lesson sends an empty mistakes_by_type', async () => {
    await useAppStore.getState().finishLesson(runLesson([]));
    const payload = eventPayload();
    expect(payload.lessonId).toBe(firstLesson.id);
    expect(payload.mistakes_by_type).toEqual({});
    expect(payload.perfect).toBe(true);
  });

  test('retries count: an exercise answered wrong twice reports 2, not 1 (k27)', async () => {
    // e3 (listen_type) fails twice before finally being answered right.
    let s = createLesson(firstLesson.id, exercises, Infinity);
    const attempts: Record<string, boolean[]> = { e3: [false, false, true] };
    while (!isFinished(s)) {
      const id = s.queue[0]!;
      s = answer(s, id, attempts[id]?.shift() ?? true);
    }
    await useAppStore.getState().finishLesson(toResult(s, 60_000));

    const payload = eventPayload();
    expect(payload.mistakes_by_type).toEqual({ listen_type: 2 });
  });
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

describe('achievements, counters and weekly summary', () => {
  test('finishing the first lesson unlocks first_lesson (+ perfect_lesson when flawless) and persists', async () => {
    const s = useAppStore.getState();
    expect(s.achievements).toEqual([]);
    await s.finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, true));
    const after = useAppStore.getState();
    expect(after.achievements).toEqual(expect.arrayContaining(['first_lesson', 'perfect_lesson']));
    expect(after.newAchievements).toEqual(after.achievements);
    after.ackAchievements();
    expect(useAppStore.getState().newAchievements).toEqual([]);

    // survives a re-boot from sync_meta
    useAppStore.setState({ ready: false, achievements: [], newAchievements: [] });
    await useAppStore.getState().boot();
    expect(useAppStore.getState().achievements).toEqual(expect.arrayContaining(['first_lesson', 'perfect_lesson']));
  });

  test('a lesson with mistakes does not unlock perfect_lesson; unlocks are never revoked', async () => {
    await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, false));
    expect(useAppStore.getState().achievements).toContain('first_lesson');
    expect(useAppStore.getState().achievements).not.toContain('perfect_lesson');
    await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, true));
    expect(useAppStore.getState().achievements).toContain('perfect_lesson');
    await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, false));
    expect(useAppStore.getState().achievements).toContain('perfect_lesson');
  });

  test('review session and reviewed-card counters feed first_review / review_50', async () => {
    const s = useAppStore.getState();
    await s.startReviewSession();
    expect(useAppStore.getState().achievements).toContain('first_review');
    await s.finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, true));
    timeTravel(DAY + 1000); // SM-2: cards learned today are due tomorrow
    const cards = await useAppStore.getState().loadDueCards(50);
    expect(cards.length).toBeGreaterThan(0);
    for (let i = 0; i < 50; i++) await useAppStore.getState().reviewCard(cards[0]!, true, 1000);
    expect(useAppStore.getState().achievements).toContain('review_50');
  });

  test('weeklyXp buckets today\'s lesson XP into the last slot', async () => {
    await useAppStore.getState().finishLesson(resultFor(firstLesson.id, firstLesson.vocabIds, true));
    const week = await useAppStore.getState().weeklyXp();
    expect(week).toHaveLength(7);
    expect(week[6]).toBe(20);
    expect(week.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test('reminder hour persists across boot', async () => {
    await useAppStore.getState().setReminderHour(18);
    useAppStore.setState({ ready: false, reminderHour: null });
    await useAppStore.getState().boot();
    expect(useAppStore.getState().reminderHour).toBe(18);
    await useAppStore.getState().setReminderHour(null);
    useAppStore.setState({ ready: false, reminderHour: 5 });
    await useAppStore.getState().boot();
    expect(useAppStore.getState().reminderHour).toBeNull();
  });
});

describe('welcome screen state', () => {
  test('without Firebase (accounts unavailable) the welcome screen is skipped', () => {
    expect(useAppStore.getState().welcomed).toBe(true);
  });

  test('continuing as a guest keeps the welcome screen dismissed', async () => {
    await useAppStore.getState().continueAsGuest();
    expect(useAppStore.getState().welcomed).toBe(true);
  });
});
