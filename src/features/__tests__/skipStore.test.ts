/**
 * finishSkipTest / skipAttempts (roadmap item 4) against the in-memory FakeDb:
 * a failed attempt logs `unit_skip_attempt` and leaves progress untouched; a
 * passed attempt completes the unit's lessons (crowns via completeLesson),
 * logs `unit_skipped`, pays exactly +20 XP through the lesson stats pipeline,
 * moves the active lesson to the next unit, counts in weeklyXp — and can
 * never pay out twice.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { courses } from '@/content';
import { activeLessonId, useAppStore } from '../store';

const trEn = courses[0]!;
const u1 = trEn.units[0]!;
const u2 = trEn.units[1]!;
const u3 = trEn.units[2]!;

let db: FakeDb;

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({
    ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0,
    achievements: [], newAchievements: [], reminderHour: null, quests: [], questDate: null, claimingQuestIds: [],
  });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

function eventsOfType(type: string) {
  return (db.tables.events ?? []).filter((e) => e.type === type);
}

test('skipAttempts counts the unit_skip_attempt events of that unit only', async () => {
  expect(await useAppStore.getState().skipAttempts(u2.id)).toBe(0);
  await useAppStore.getState().finishSkipTest(u2.id, 9, 12);
  await useAppStore.getState().finishSkipTest(u2.id, 7, 12);
  await useAppStore.getState().finishSkipTest(u3.id, 10, 12);
  expect(await useAppStore.getState().skipAttempts(u2.id)).toBe(2);
  expect(await useAppStore.getState().skipAttempts(u3.id)).toBe(1);
});

test('failed attempt: progress untouched, attempt logged as not passed, no XP', async () => {
  const out = await useAppStore.getState().finishSkipTest(u2.id, 9, 12);
  expect(out).toEqual({ passed: false, xpEarned: 0 });

  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(0);
  expect(s.stats.xpToday).toBe(0);
  for (const l of u2.lessons) expect(s.progress[l.id]).toBeUndefined();

  const attempts = eventsOfType('unit_skip_attempt');
  expect(attempts).toHaveLength(1);
  expect(JSON.parse(String(attempts[0]!.payload))).toEqual({ unitId: u2.id, correct: 9, total: 12, passed: false });
  expect(eventsOfType('unit_skipped')).toHaveLength(0);
});

test('passed attempt completes all unit lessons, logs both events, awards +20 XP once, moves the active lesson', async () => {
  // First skip unit 1 so the active lesson sits at unit 2.
  await useAppStore.getState().finishSkipTest(u1.id, 12, 12);
  expect(activeLessonId(useAppStore.getState().course, useAppStore.getState().progress)).toBe(u2.lessons[0]!.id);

  const out = await useAppStore.getState().finishSkipTest(u2.id, 10, 12);
  expect(out).toEqual({ passed: true, xpEarned: 20 });

  const s = useAppStore.getState();
  // every lesson of the unit completed via progress.completeLesson (crowns 1)…
  for (const l of u2.lessons) {
    expect(s.progress[l.id]?.completedAt).toBeTruthy();
    expect(s.progress[l.id]?.crowns).toBe(1);
  }
  // …but no other unit's lessons were touched
  for (const l of u3.lessons) expect(s.progress[l.id]).toBeUndefined();
  // the learning path continues at the next unit
  expect(activeLessonId(s.course, s.progress)).toBe(u3.lessons[0]!.id);
  // the +20 XP went through the lesson stats pipeline
  expect(s.stats.xp).toBe(40); // 20 per passed unit
  expect(s.stats.xpToday).toBe(40);
  expect(s.stats.streak).toBe(1);

  const attempts = eventsOfType('unit_skip_attempt');
  expect(attempts).toHaveLength(2); // u1 + u2
  const u2Attempt = attempts.find((e) => String(e.payload).includes(u2.id))!;
  expect(JSON.parse(String(u2Attempt.payload))).toEqual({ unitId: u2.id, correct: 10, total: 12, passed: true });

  const skipped = eventsOfType('unit_skipped').filter((e) => String(e.payload).includes(u2.id));
  expect(skipped).toHaveLength(1);
  expect(JSON.parse(String(skipped[0]!.payload))).toEqual({
    unitId: u2.id,
    lessons: u2.lessons.map((l) => l.id),
    xp: 20,
  });

  // A passed re-attempt of an already-skipped unit never pays out again:
  // lessons keep their crowns, XP stays, no second unit_skipped event.
  const again = await useAppStore.getState().finishSkipTest(u2.id, 12, 12);
  expect(again).toEqual({ passed: true, xpEarned: 0 });
  const after = useAppStore.getState();
  expect(after.stats.xp).toBe(40);
  for (const l of u2.lessons) expect(after.progress[l.id]?.crowns).toBe(1);
  expect(eventsOfType('unit_skipped').filter((e) => String(e.payload).includes(u2.id))).toHaveLength(1);
  expect(eventsOfType('unit_skip_attempt')).toHaveLength(3); // the re-attempt still logs
});

test('skipping a later unit does not complete earlier (locked) units', async () => {
  const out = await useAppStore.getState().finishSkipTest(u3.id, 12, 12);
  expect(out.passed).toBe(true);
  const s = useAppStore.getState();
  for (const unit of [u1, u2]) {
    for (const l of unit.lessons) expect(s.progress[l.id]).toBeUndefined();
  }
  // active lesson is still in unit 1 — the path only advances past completed lessons
  expect(activeLessonId(s.course, s.progress)).toBe(u1.lessons[0]!.id);
});

test('quit after 10 correct: attempt logged with quit:true, passed=false, progress and XP untouched', async () => {
  // 10/12 answered correctly would pass a finished attempt — a quit must not.
  const out = await useAppStore.getState().finishSkipTest(u2.id, 10, 12, { quit: true });
  expect(out).toEqual({ passed: false, xpEarned: 0 });

  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(0);
  expect(s.stats.xpToday).toBe(0);
  for (const l of u2.lessons) expect(s.progress[l.id]).toBeUndefined();

  const attempts = eventsOfType('unit_skip_attempt');
  expect(attempts).toHaveLength(1);
  expect(JSON.parse(String(attempts[0]!.payload))).toEqual({ unitId: u2.id, correct: 10, total: 12, passed: false, quit: true });
  expect(eventsOfType('unit_skipped')).toHaveLength(0);
  // the abandoned attempt still counts toward the next exam's shuffle seed
  expect(await useAppStore.getState().skipAttempts(u2.id)).toBe(1);
});

test('pass with all unit lessons already completed: attempt logged, no XP, no unit_skipped event', async () => {
  // Complete u2 by playing through normally: progress is full but there is
  // no `unit_skipped` event, so the already-skipped guard does not apply.
  useAppStore.setState({
    progress: Object.fromEntries(
      u2.lessons.map((l) => [l.id, { lessonId: l.id, crowns: 1, completedAt: Date.now() }]),
    ),
  });

  const out = await useAppStore.getState().finishSkipTest(u2.id, 12, 12);
  expect(out).toEqual({ passed: true, xpEarned: 0 });

  const s = useAppStore.getState();
  expect(s.stats.xp).toBe(0);
  expect(s.stats.xpToday).toBe(0);
  expect(eventsOfType('unit_skip_attempt')).toHaveLength(1);
  expect(JSON.parse(String(eventsOfType('unit_skip_attempt')[0]!.payload))).toEqual({ unitId: u2.id, correct: 12, total: 12, passed: true });
  expect(eventsOfType('unit_skipped')).toHaveLength(0);
});

test('weeklyXp counts the unit_skipped event in today\'s bucket', async () => {
  await useAppStore.getState().finishSkipTest(u1.id, 12, 12);
  const week = await useAppStore.getState().weeklyXp();
  expect(week).toHaveLength(7);
  expect(week[6]).toBe(20);
  expect(week.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]);
});
