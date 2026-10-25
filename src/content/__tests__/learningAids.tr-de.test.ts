import { getCourse } from '..';
import { trDeExplanations } from '../explanations/tr-de';
import { trDeNotes } from '../notes/tr-de';

const course = getCourse('tr-de');

describe('tr-de learning aids (notes + explanations)', () => {
  it('course exists', () => {
    expect(course).toBeDefined();
  });

  it('every unit has a note with at least 2 sections and 2 examples in total', () => {
    expect(course).toBeDefined();
    const units = course!.units;
    expect(units.length).toBeGreaterThan(0);
    for (const unit of units) {
      const note = trDeNotes[unit.id];
      expect(note).toBeDefined();
      if (!note) continue;
      expect(note.unitId).toBe(unit.id);
      expect(note.sections.length).toBeGreaterThanOrEqual(2);
      const exampleCount = note.sections.reduce(
        (n, s) => n + (s.examples?.length ?? 0),
        0,
      );
      expect(exampleCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('explanations cover 100% of sel/fill/build exercises and reference only existing ids', () => {
    const covered = new Set<string>();
    for (const unit of course!.units) {
      for (const lesson of unit.lessons) {
        for (const ex of lesson.exercises) {
          if (
            ex.type === 'select_translation' ||
            ex.type === 'fill_blank' ||
            ex.type === 'translate_build'
          ) {
            covered.add(ex.id);
            expect(trDeExplanations[ex.id]).toBeTruthy();
          }
        }
      }
    }
    expect(covered.size).toBeGreaterThan(0);
    for (const key of Object.keys(trDeExplanations)) {
      expect(covered.has(key)).toBe(true);
    }
  });

  it('every explanation is non-empty and at most 300 characters', () => {
    for (const text of Object.values(trDeExplanations)) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(300);
    }
  });
});
