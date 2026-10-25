import { getCourse } from '..';
import { trEsExplanations } from '../explanations/tr-es';
import { trEsNotes } from '../notes/tr-es';

const course = getCourse('tr-es');

describe('tr-es learning aids (notes + explanations)', () => {
  it('has a note for every unit, each with >= 2 sections and >= 2 examples in total', () => {
    expect(course).toBeDefined();
    for (const unit of course!.units) {
      const note = trEsNotes[unit.id];
      if (!note) throw new Error(`missing note for ${unit.id}`);
      expect(note.unitId).toBe(unit.id);
      expect(note.sections.length).toBeGreaterThanOrEqual(2);
      const totalExamples = note.sections.reduce((n, s) => n + (s.examples?.length ?? 0), 0);
      expect(totalExamples).toBeGreaterThanOrEqual(2);
    }
  });

  it('covers every sel/fill/build exercise exactly (100%) and no other ids', () => {
    const coveredTypes = new Set(['select_translation', 'fill_blank', 'translate_build']);
    const expectedIds = course!.units
      .flatMap((u) => u.lessons)
      .flatMap((l) => l.exercises)
      .filter((e) => coveredTypes.has(e.type))
      .map((e) => e.id)
      .sort();
    const actualIds = Object.keys(trEsExplanations).sort();
    expect(actualIds).toEqual(expectedIds);
  });

  it('uses existing exercise ids of type sel/fill/build for every explanation key', () => {
    const byId = new Map(
      course!.units.flatMap((u) => u.lessons).flatMap((l) => l.exercises).map((e) => [e.id, e]),
    );
    for (const key of Object.keys(trEsExplanations)) {
      const exercise = byId.get(key);
      if (!exercise) throw new Error(`unknown exercise id ${key}`);
      expect(['select_translation', 'fill_blank', 'translate_build']).toContain(exercise!.type);
    }
  });

  it('keeps every explanation non-empty and <= 300 characters', () => {
    for (const [key, value] of Object.entries(trEsExplanations)) {
      if (value.trim().length === 0) throw new Error(`${key} is empty`);
      expect(value.length <= 300).toBe(true);
    }
  });
});
