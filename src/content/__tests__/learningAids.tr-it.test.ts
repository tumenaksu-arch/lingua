import { getCourse } from '..';
import { trItExplanations } from '../explanations/tr-it';
import { trItNotes } from '../notes/tr-it';

const course = getCourse('tr-it');
if (!course) throw new Error("course 'tr-it' not found");

const EXPLAINED_TYPES = ['select_translation', 'fill_blank', 'translate_build'] as const;

const allExercises = course.units.flatMap((u) =>
  u.lessons.flatMap((l) => l.exercises.map((e) => ({ unitId: u.id, e }))),
);
const explainable = allExercises.filter(({ e }) =>
  (EXPLAINED_TYPES as readonly string[]).includes(e.type),
);

describe('tr-it unit notes', () => {
  test('every unit has a note with at least 2 sections and 2 examples in total', () => {
    for (const unit of course.units) {
      const note = trItNotes[unit.id];
      if (!note) throw new Error(`missing note for ${unit.id}`);
      expect(note.unitId).toBe(unit.id);
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.sections.length).toBeGreaterThanOrEqual(2);
      expect(note.sections.length).toBeLessThanOrEqual(4);
      const exampleCount = note.sections.reduce((n, s) => n + (s.examples?.length ?? 0), 0);
      expect(exampleCount).toBeGreaterThanOrEqual(2);
      for (const section of note.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThanOrEqual(1);
        expect(section.body.length).toBeLessThanOrEqual(3);
        for (const paragraph of section.body) expect(paragraph.trim().length).toBeGreaterThan(0);
        if (section.examples) {
          for (const ex of section.examples) {
            expect(ex.target.trim().length).toBeGreaterThan(0);
            expect(ex.tr.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('tr-it explanations', () => {
  test('every key is an existing exercise id of type sel/fill/build', () => {
    const byId = new Map(allExercises.map(({ e }) => [e.id, e]));
    for (const key of Object.keys(trItExplanations)) {
      const exercise = byId.get(key);
      if (!exercise) throw new Error(`unknown exercise id: ${key}`);
      expect(EXPLAINED_TYPES).toContain(exercise.type);
    }
  });

  test('coverage of sel/fill/build exercises is 100%', () => {
    const explained = new Set(Object.keys(trItExplanations));
    const missing = explainable.filter(({ e }) => !explained.has(e.id));
    expect(missing.map(({ e }) => e.id)).toEqual([]);
    expect(explained.size).toBe(explainable.length);
  });

  test('every explanation is non-empty and at most 300 characters', () => {
    for (const [key, value] of Object.entries(trItExplanations)) {
      if (value.trim().length === 0) throw new Error(`empty explanation: ${key}`);
      if (value.length > 300) throw new Error(`explanation too long (${value.length} chars): ${key}`);
    }
  });
});
