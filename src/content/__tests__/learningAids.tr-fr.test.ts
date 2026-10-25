import type { Exercise } from '@/domain/types';
import { getCourse } from '..';
import { trFrExplanations } from '../explanations/tr-fr';
import { trFrNotes } from '../notes/tr-fr';

const AID_TYPES: Exercise['type'][] = ['select_translation', 'fill_blank', 'translate_build'];

describe('tr-fr learning aids', () => {
  const course = getCourse('tr-fr');
  if (!course) throw new Error('course tr-fr not found');
  const aidExercises = course.units.flatMap((u) =>
    u.lessons.flatMap((l) => l.exercises.filter((e) => AID_TYPES.includes(e.type))),
  );

  test('every unit has a note with ≥2 sections and ≥2 examples in total', () => {
    for (const u of course.units) {
      const note = trFrNotes[u.id];
      expect(note).toBeDefined();
      expect(note.unitId).toBe(u.id);
      expect(note.sections.length).toBeGreaterThanOrEqual(2);
      const examples = note.sections.flatMap((s) => s.examples ?? []);
      expect(examples.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('every explanation key is an existing exercise id of type sel/fill/build', () => {
    const ids = new Set(aidExercises.map((e) => e.id));
    for (const key of Object.keys(trFrExplanations)) expect(ids.has(key)).toBe(true);
  });

  test('coverage of sel/fill/build exercises is 100%', () => {
    expect(Object.keys(trFrExplanations).length).toBe(aidExercises.length);
    for (const e of aidExercises) expect(trFrExplanations[e.id]).toBeDefined();
  });

  test('every explanation is non-empty and ≤ 300 characters', () => {
    for (const value of Object.values(trFrExplanations)) {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(300);
    }
  });
});
