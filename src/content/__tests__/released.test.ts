import type { Exercise } from '@/domain/types';
import { getCourse } from '..';
import released from './fixtures/released-v1.json';

/**
 * Saved progress, SRS cards and lesson state are keyed by course/unit/lesson/vocab ids and by
 * exercise position (`<lessonId>.e<n>`). Content may only GROW: everything that was released
 * (fixtures/released-v1.json, taken at 904aa89) must still exist unchanged — same unit, same
 * order, same vocab, and the released exercises as an unchanged prefix of each lesson.
 */
type Snap = {
  id: string;
  vocab: { id: string; term: string; translation: string }[];
  units: { id: string; order: number; lessons: { id: string; order: number; vocabIds: string[]; exercises: Exercise[] }[] }[];
};

describe.each((released as Snap[]).map((c) => [c.id, c] as const))('released course %s stays compatible', (id, old) => {
  const now = getCourse(id)!;

  test('course still exists', () => {
    expect(now).toBeDefined();
  });

  test('released vocab ids keep their term and translation', () => {
    const byId = new Map(now.vocab.map((v) => [v.id, v]));
    for (const v of old.vocab) expect({ id: v.id, ...pick(byId.get(v.id)) }).toEqual({ id: v.id, term: v.term, translation: v.translation });
  });

  test('released units and lessons keep their ids, order and vocab', () => {
    for (const u of old.units) {
      const nu = now.units.find((x) => x.id === u.id);
      expect({ unit: u.id, order: nu?.order }).toEqual({ unit: u.id, order: u.order });
      for (const l of u.lessons) {
        const nl = nu!.lessons.find((x) => x.id === l.id);
        expect({ lesson: l.id, order: nl?.order }).toEqual({ lesson: l.id, order: l.order });
        for (const v of l.vocabIds) expect(nl!.vocabIds).toContain(v);
      }
    }
  });

  test('released exercises are an unchanged prefix of each lesson', () => {
    for (const u of old.units)
      for (const l of u.lessons) {
        const nl = now.units.find((x) => x.id === u.id)!.lessons.find((x) => x.id === l.id)!;
        expect({ lesson: l.id, prefix: nl.exercises.slice(0, l.exercises.length) }).toEqual({ lesson: l.id, prefix: l.exercises });
      }
  });
});

function pick(v: { term: string; translation: string } | undefined) {
  return v ? { term: v.term, translation: v.translation } : { term: undefined, translation: undefined };
}
