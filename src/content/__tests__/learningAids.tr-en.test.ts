import type { Exercise } from '@/domain/types';
import { getCourse } from '..';
import { trEnNotes } from '../notes/tr-en';
import { trEnExplanations } from '../explanations/tr-en';

const AID_TYPES: Exercise['type'][] = ['select_translation', 'fill_blank', 'translate_build'];

const course = getCourse('tr-en')!;

function aidExercises() {
  return course.units.flatMap((u) =>
    u.lessons.flatMap((l) => l.exercises.filter((e) => AID_TYPES.includes(e.type))),
  );
}

describe('tr-en unit notes', () => {
  test('every unit has a note with ≥2 sections and ≥2 examples in total', () => {
    for (const u of course.units) {
      const note = trEnNotes[u.id];
      expect({ unit: u.id, note: !!note }).toEqual({ unit: u.id, note: true });
      expect(note.unitId).toBe(u.id);
      expect(note.sections.length).toBeGreaterThanOrEqual(2);
      const examples = note.sections.reduce((n, s) => n + (s.examples?.length ?? 0), 0);
      expect({ unit: u.id, examples }).toEqual({ unit: u.id, examples: expect.any(Number) });
      expect(examples).toBeGreaterThanOrEqual(2);
    }
  });

  test('there are no notes for units that do not exist', () => {
    const unitIds = new Set(course.units.map((u) => u.id));
    for (const key of Object.keys(trEnNotes)) expect(unitIds.has(key)).toBe(true);
  });
});

describe('tr-en explanations', () => {
  const aids = aidExercises();
  const aidIds = new Set(aids.map((e) => e.id));

  test('coverage of sel/fill/build exercises is 100%', () => {
    const covered = new Set(Object.keys(trEnExplanations));
    const missing = aids.filter((e) => !covered.has(e.id)).map((e) => e.id);
    expect({ missing }).toEqual({ missing: [] });
  });

  test('every explanation key is an existing exercise of type sel/fill/build', () => {
    for (const key of Object.keys(trEnExplanations)) {
      expect({ key, ok: aidIds.has(key) }).toEqual({ key, ok: true });
    }
  });

  test('every explanation value is non-empty and ≤300 characters', () => {
    for (const [key, value] of Object.entries(trEnExplanations)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
      expect({ key, length: value.length }).toEqual({ key, length: expect.any(Number) });
      expect(value.length).toBeLessThanOrEqual(300);
    }
  });

  test('explanations mention the correct answer', () => {
    for (const e of aids) {
      const text = trEnExplanations[e.id] ?? '';
      let correct = '';
      if (e.type === 'select_translation' || e.type === 'fill_blank') correct = e.options[e.correctIndex];
      if (e.type === 'translate_build') correct = e.answers[0];
      expect({ id: e.id, correct, mentioned: text.includes(correct) }).toEqual({
        id: e.id,
        correct,
        mentioned: true,
      });
    }
  });
});
