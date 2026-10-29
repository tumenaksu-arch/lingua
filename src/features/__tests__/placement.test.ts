/**
 * Placement exam flow (roadmap item 1B): an adaptive climb through the units —
 * u1 3/3, u2 2/3, u3 1/3 ends with [u1, u2] passed; the 8-unit cap ends the
 * exam; "Bitir" keeps the units passed so far; `speak`/`listen_type` questions
 * are never selected; the same seed always yields the same questions.
 */
import { courses } from '@/content';
import type { Exercise, Lesson, Unit } from '@/domain';
import {
  createPlacement,
  finishPlacement,
  PLACEMENT_MAX_QUESTIONS,
  PLACEMENT_MAX_UNITS,
  placementQuestions,
  placementUnitPassed,
  recordPlacementUnitResult,
  skipEmptyPlacementUnit,
} from '../placement/placement';

const trEn = courses[0]!;
const u1 = trEn.units[0]!;

function sel(id: string): Exercise {
  return { id, type: 'select_translation', promptLang: 'tr', prompt: `p-${id}`, options: ['a', 'b'], correctIndex: 0 };
}

function speak(id: string): Exercise {
  return { id, type: 'speak', promptLang: 'en', sentence: `s-${id}`, lang: 'en' };
}

function listen(id: string): Exercise {
  return { id, type: 'listen_type', promptLang: 'en', audioText: `l-${id}`, audioLang: 'en', answers: [`l-${id}`] };
}

function makeUnit(id: string, perLesson: number[][]): Unit {
  return {
    id,
    order: 1,
    title: `Ünite ${id}`,
    description: 'test',
    lessons: perLesson.map((count, i): Lesson => ({
      id: `${id}.l${i + 1}`,
      order: i + 1,
      vocabIds: [],
      exercises: count.map((_, j) => sel(`${id}.l${i + 1}.e${j + 1}`)),
    })),
  };
}

test('adaptive flow: 3/3 then 2/3 pass, 1/3 fails and ends the exam with [u1, u2] passed', () => {
  let s = createPlacement();
  expect(s).toEqual({ unitIndex: 0, passed: [], done: false });

  s = recordPlacementUnitResult(s, 'u1', 3, 3);
  expect(s.done).toBe(false);
  expect(s.unitIndex).toBe(1);
  expect(s.passed.map((p) => p.unitId)).toEqual(['u1']);

  s = recordPlacementUnitResult(s, 'u2', 2, 3);
  expect(s.done).toBe(false);
  expect(s.unitIndex).toBe(2);
  expect(s.passed.map((p) => p.unitId)).toEqual(['u1', 'u2']);
  expect(s.passed[1]).toEqual({ unitId: 'u2', correct: 2, total: 3 });

  s = recordPlacementUnitResult(s, 'u3', 1, 3);
  expect(s.done).toBe(true);
  expect(s.unitIndex).toBe(2); // stays at the failed unit
  expect(s.passed.map((p) => p.unitId)).toEqual(['u1', 'u2']);
});

test('a result recorded after the exam ended changes nothing', () => {
  let s = recordPlacementUnitResult(createPlacement(), 'u1', 1, 3);
  s = recordPlacementUnitResult(s, 'u2', 3, 3);
  expect(s.done).toBe(true);
  expect(s.passed).toEqual([]);
  expect(s.unitIndex).toBe(0);
});

test('the 8-unit cap ends the exam right after the 8th pass', () => {
  let s = createPlacement();
  for (let i = 0; i < PLACEMENT_MAX_UNITS; i++) {
    s = recordPlacementUnitResult(s, `u${i + 1}`, 3, 3);
  }
  expect(s.done).toBe(true);
  expect(s.unitIndex).toBe(PLACEMENT_MAX_UNITS);
  expect(s.passed).toHaveLength(PLACEMENT_MAX_UNITS);
  expect(PLACEMENT_MAX_QUESTIONS).toBe(24);
});

test('"Bitir" ends the exam early and keeps only the units passed so far', () => {
  let s = recordPlacementUnitResult(createPlacement(), 'u1', 3, 3);
  s = recordPlacementUnitResult(s, 'u2', 2, 3);
  s = finishPlacement(s);
  expect(s).toMatchObject({ done: true, unitIndex: 2 });
  expect(s.passed.map((p) => p.unitId)).toEqual(['u1', 'u2']);

  // finishing an already-done exam is a no-op
  expect(finishPlacement(s)).toBe(s);
});

test('"Bitir" before any unit passed ends with an empty pass list', () => {
  const s = finishPlacement(createPlacement());
  expect(s).toEqual({ unitIndex: 0, passed: [], done: true });
});

test('placementUnitPassed needs at least 2 of 3 (all of them for short units)', () => {
  expect(placementUnitPassed(2, 3)).toBe(true);
  expect(placementUnitPassed(1, 3)).toBe(false);
  expect(placementUnitPassed(3, 3)).toBe(true);
  expect(placementUnitPassed(2, 2)).toBe(true);
  expect(placementUnitPassed(1, 2)).toBe(false);
  expect(placementUnitPassed(1, 1)).toBe(true);
  expect(placementUnitPassed(0, 0)).toBe(false);
});

test('units with no eligible questions are skipped without counting as passed', () => {
  let s = skipEmptyPlacementUnit(createPlacement());
  expect(s).toMatchObject({ unitIndex: 1, passed: [], done: false });
  s = recordPlacementUnitResult(s, 'u2', 3, 3);
  expect(s.passed.map((p) => p.unitId)).toEqual(['u2']);
});

test('speak and listen_type questions are never selected', () => {
  const unit: Unit = {
    id: 'u-mixed',
    order: 1,
    title: 'Karışık',
    description: 'test',
    lessons: [
      { id: 'u-mixed.l1', order: 1, vocabIds: [], exercises: [sel('u-mixed.l1.e1'), speak('u-mixed.l1.e2'), listen('u-mixed.l1.e3')] },
      { id: 'u-mixed.l2', order: 2, vocabIds: [], exercises: [listen('u-mixed.l2.e1'), sel('u-mixed.l2.e2'), speak('u-mixed.l2.e3')] },
      { id: 'u-mixed.l3', order: 3, vocabIds: [], exercises: [sel('u-mixed.l3.e1'), sel('u-mixed.l3.e2'), listen('u-mixed.l3.e3')] },
    ],
  };
  const q = placementQuestions(unit, 0);
  expect(q).toHaveLength(3);
  expect(q.every((e) => e.type !== 'speak' && e.type !== 'listen_type')).toBe(true);
});

test('the same seed yields the same questions, a different seed shuffles', () => {
  const a = placementQuestions(u1, 0).map((e) => e.id);
  const b = placementQuestions(u1, 0).map((e) => e.id);
  expect(a).toEqual(b);
  expect(a).toHaveLength(3);
  const c = placementQuestions(u1, 1).map((e) => e.id);
  expect(c).toHaveLength(3);
  expect(c).not.toEqual(a);
});

test('a unit with fewer than 3 eligible exercises uses all of them', () => {
  const unit = makeUnit('u-small', [[1, 2]]);
  const q = placementQuestions(unit, 0);
  expect(q).toHaveLength(2);
  expect(new Set(q.map((e) => e.id))).toEqual(new Set(['u-small.l1.e1', 'u-small.l1.e2']));
});

test('questions spread round-robin across the unit\'s lessons', () => {
  const unit = makeUnit('u-rr', [[1, 2, 3, 4], [5, 6, 7, 8]]);
  const q = placementQuestions(unit, 0);
  expect(q).toHaveLength(3);
  expect(new Set(q.map((e) => e.id.split('.')[1])).size).toBeGreaterThan(1);
});
