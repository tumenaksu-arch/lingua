/**
 * completeUnitsByPlacement (roadmap item 1B, "Seviyemi bul") against the
 * in-memory FakeDb: the units the placement exam passed get their lessons
 * completed through the same progress repo as skip tests and the same
 * `unit_skipped` event (xp: 0, placement: true) — placement is a placement,
 * not a reward, so XP/stats never move. Idempotent via the fixed
 * `${unitId}:skipped` event id; an empty list changes nothing; the active
 * lesson advances past the completed units.
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

test('passed units: lessons completed, unit_skipped logged with xp 0, XP unchanged, active lesson advances', async () => {
  const before = useAppStore.getState().stats;
  await useAppStore.getState().completeUnitsByPlacement([u1.id, u2.id]);

  const s = useAppStore.getState();
  for (const unit of [u1, u2]) {
    for (const l of unit.lessons) {
      expect(s.progress[l.id]?.completedAt).toBeTruthy();
      expect(s.progress[l.id]?.crowns).toBe(1);
    }
  }
  for (const l of u3.lessons) expect(s.progress[l.id]).toBeUndefined();
  expect(activeLessonId(s.course, s.progress)).toBe(u3.lessons[0]!.id);

  // placement never awards XP: stats object untouched
  expect(s.stats).toBe(before);
  expect(s.stats.xp).toBe(0);
  expect(s.stats.xpToday).toBe(0);

  // same event type and id scheme as the skip test, but xp: 0 + placement marker
  const skipped = eventsOfType('unit_skipped');
  expect(skipped).toHaveLength(2);
  expect(skipped.map((e) => e.id).sort()).toEqual([`${u1.id}:skipped`, `${u2.id}:skipped`].sort());
  expect(JSON.parse(String(skipped.find((e) => e.id === `${u2.id}:skipped`)!.payload))).toEqual({
    unitId: u2.id,
    lessons: u2.lessons.map((l) => l.id),
    xp: 0,
    placement: true,
  });

  // the +0-XP event contributes nothing to the weekly buckets either
  const week = await useAppStore.getState().weeklyXp();
  expect(week[6]).toBe(0);
});

test('calling it again is a no-op: no second events, progress keeps its crowns', async () => {
  await useAppStore.getState().completeUnitsByPlacement([u1.id]);
  await useAppStore.getState().completeUnitsByPlacement([u1.id, u2.id]);

  const s = useAppStore.getState();
  expect(eventsOfType('unit_skipped')).toHaveLength(2);
  for (const l of u1.lessons) expect(s.progress[l.id]?.crowns).toBe(1);
  expect(s.stats.xp).toBe(0);
});

test('an empty unit list changes nothing', async () => {
  await useAppStore.getState().completeUnitsByPlacement([]);
  const s = useAppStore.getState();
  expect(s.progress).toEqual({});
  expect(eventsOfType('unit_skipped')).toHaveLength(0);
  expect(activeLessonId(s.course, s.progress)).toBe(u1.lessons[0]!.id);
});

test('a unit whose lessons are all completed already logs no event and changes nothing', async () => {
  // Normal play-through: progress full but no unit_skipped event yet.
  useAppStore.setState({
    progress: Object.fromEntries(
      u2.lessons.map((l) => [l.id, { lessonId: l.id, crowns: 1, completedAt: Date.now() }]),
    ),
  });
  await useAppStore.getState().completeUnitsByPlacement([u2.id]);
  expect(eventsOfType('unit_skipped')).toHaveLength(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
});
