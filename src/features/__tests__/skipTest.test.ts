/**
 * buildSkipTest (roadmap item 4): seeded per attempt so an attempt is
 * repeatable, a new attempt differs, speak exercises are excluded, questions
 * spread round-robin across lessons, and units with < 12 eligible exercises
 * use all of them.
 */
import { courses } from '@/content';
import type { Exercise, Lesson, Unit } from '@/domain';
import { buildSkipTest, SKIP_TEST_QUESTIONS, SKIP_TEST_XP, skipPassed } from '../skipTest';

const trEn = courses[0]!;
const u1 = trEn.units[0]!;

function sel(id: string): Exercise {
  return { id, type: 'select_translation', promptLang: 'tr', prompt: `p-${id}`, options: ['a', 'b'], correctIndex: 0 };
}

function speak(id: string): Exercise {
  return { id, type: 'speak', promptLang: 'en', sentence: `s-${id}`, lang: 'en' };
}

function makeUnit(id: string, perLesson: number[][]): Unit {
  return {
    id,
    order: 1,
    title: 'Test ünitesi',
    description: 'test',
    lessons: perLesson.map((count, i): Lesson => ({
      id: `${id}.l${i + 1}`,
      order: i + 1,
      vocabIds: [],
      exercises: count.map((_, j) => sel(`${id}.l${i + 1}.e${j + 1}`)),
    })),
  };
}

/** Lesson id of an exercise built by the content builder/tests (`<lessonId>.e<n>`). */
function lessonOf(e: Exercise): string {
  return e.id.replace(/\.e\d+$/, '');
}

test('same attempt yields the same 12 questions in the same order', () => {
  const a = buildSkipTest(u1, 0);
  const b = buildSkipTest(u1, 0);
  expect(a).toHaveLength(SKIP_TEST_QUESTIONS);
  expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
});

test('a new attempt draws a different question set', () => {
  const a = buildSkipTest(u1, 0).map((e) => e.id);
  const b = buildSkipTest(u1, 1).map((e) => e.id);
  expect(b).toHaveLength(SKIP_TEST_QUESTIONS);
  expect(a).not.toEqual(b);
});

test('speak exercises are excluded', () => {
  const unit: Unit = {
    id: 'u-speak',
    order: 1,
    title: 'Konuşma',
    description: 'test',
    lessons: [
      { id: 'u-speak.l1', order: 1, vocabIds: [], exercises: [sel('u-speak.l1.e1'), speak('u-speak.l1.e2'), sel('u-speak.l1.e3')] },
      { id: 'u-speak.l2', order: 2, vocabIds: [], exercises: [speak('u-speak.l2.e1'), sel('u-speak.l2.e2'), sel('u-speak.l2.e3')] },
    ],
  };
  const q = buildSkipTest(unit, 0);
  expect(q).toHaveLength(4); // all eligible exercises, speak dropped
  expect(q.every((e) => e.type !== 'speak')).toBe(true);
  expect(q.map((e) => e.id).sort()).toEqual(['u-speak.l1.e1', 'u-speak.l1.e3', 'u-speak.l2.e2', 'u-speak.l2.e3']);
});

test('questions spread round-robin: consecutive questions never come from the same lesson', () => {
  const unit = makeUnit('u-rr', [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18]]);
  const q = buildSkipTest(unit, 0);
  expect(q).toHaveLength(SKIP_TEST_QUESTIONS);
  for (let i = 0; i < q.length - 1; i++) {
    expect(lessonOf(q[i]!)).not.toBe(lessonOf(q[i + 1]!));
  }
  // first three questions: one per lesson
  expect(new Set(q.slice(0, 3).map(lessonOf)).size).toBe(3);
});

test('a unit with fewer than 12 eligible exercises uses all of them', () => {
  const unit = makeUnit('u-small', [[1, 2, 3], [4, 5, 6]]);
  const q = buildSkipTest(unit, 3);
  expect(q).toHaveLength(6);
  expect(new Set(q.map((e) => e.id))).toEqual(new Set(['u-small.l1.e1', 'u-small.l1.e2', 'u-small.l1.e3', 'u-small.l2.e1', 'u-small.l2.e2', 'u-small.l2.e3']));
});

test('skipPassed needs at least 80%', () => {
  expect(skipPassed(10, 12)).toBe(true);
  expect(skipPassed(9, 12)).toBe(false);
  expect(skipPassed(0, 0)).toBe(false);
  expect(skipPassed(8, 10)).toBe(true);
  expect(SKIP_TEST_XP).toBe(20);
});
