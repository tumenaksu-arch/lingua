import type { Course, Exercise } from '@/domain/types';
import { courses, getCourse, getVocab, tokenize } from '..';

const ALL_TYPES: Exercise['type'][] = [
  'select_translation',
  'translate_build',
  'match_pairs',
  'listen_type',
  'speak',
  'fill_blank',
];

function allExercises(course: Course) {
  return course.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises.map((e) => ({ lesson: l, e }))));
}

describe.each(courses.map((c) => [c.id, c] as const))('course %s', (_id, course) => {
  test('ids are unique across units, lessons, exercises and vocab', () => {
    const ids = [
      course.id,
      ...course.units.map((u) => u.id),
      ...course.units.flatMap((u) => u.lessons.map((l) => l.id)),
      ...allExercises(course).map(({ e }) => e.id),
      ...course.vocab.map((v) => v.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('units and lessons are ordered 1..n', () => {
    expect(course.units.map((u) => u.order)).toEqual(course.units.map((_, i) => i + 1));
    for (const u of course.units) {
      expect(u.lessons.map((l) => l.order)).toEqual(u.lessons.map((_, i) => i + 1));
    }
  });

  test('every lesson has 8–10 exercises and at least one vocab id', () => {
    for (const u of course.units)
      for (const l of u.lessons) {
        expect(l.exercises.length).toBeGreaterThanOrEqual(8);
        expect(l.exercises.length).toBeLessThanOrEqual(10);
        expect(l.vocabIds.length).toBeGreaterThan(0);
      }
  });

  test('every lesson.vocabIds entry resolves to a vocab item of this course', () => {
    const vocabIds = new Set(course.vocab.map((v) => v.id));
    for (const u of course.units)
      for (const l of u.lessons)
        for (const id of l.vocabIds) expect(vocabIds.has(id)).toBe(true);
    for (const v of course.vocab) expect(v.courseId).toBe(course.id);
  });

  test('choice exercises have correctIndex in range and ≥2 distinct options', () => {
    for (const { e } of allExercises(course)) {
      if (e.type === 'select_translation' || e.type === 'fill_blank') {
        expect(e.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(e.options).size).toBe(e.options.length);
        expect(e.correctIndex).toBeGreaterThanOrEqual(0);
        expect(e.correctIndex).toBeLessThan(e.options.length);
      }
      if (e.type === 'fill_blank') expect(e.sentence).toContain('___');
    }
  });

  test('typed-answer exercises have non-empty answers; word bank covers the first answer', () => {
    for (const { e } of allExercises(course)) {
      if (e.type === 'translate_build' || e.type === 'listen_type') {
        expect(e.answers.length).toBeGreaterThan(0);
        for (const a of e.answers) expect(a.trim().length).toBeGreaterThan(0);
      }
      if (e.type === 'translate_build') {
        const bank = [...e.bank];
        for (const word of tokenize(e.answers[0])) {
          const i = bank.indexOf(word);
          expect({ exercise: e.id, missingWord: word, bank: e.bank }).toEqual(
            expect.objectContaining({ missingWord: i >= 0 ? word : `MISSING ${word}` }),
          );
          bank.splice(i, 1); // each bank tile is usable once
        }
      }
      if (e.type === 'listen_type') {
        expect(e.audioText.trim().length).toBeGreaterThan(0);
        expect(e.audioLang).toBe(course.toLang);
      }
      if (e.type === 'speak') {
        expect(e.sentence.trim().length).toBeGreaterThan(0);
        expect(e.lang).toBe(course.toLang);
      }
      if (e.type === 'match_pairs') {
        expect(e.pairs.length).toBeGreaterThanOrEqual(3);
        expect(new Set(e.pairs.map((p) => p.left)).size).toBe(e.pairs.length);
        expect(new Set(e.pairs.map((p) => p.right)).size).toBe(e.pairs.length);
      }
    }
  });
});

test('tr-en lessons each use all six exercise types', () => {
  const trEn = getCourse('tr-en')!;
  for (const u of trEn.units)
    for (const l of u.lessons) {
      const types = new Set(l.exercises.map((e) => e.type));
      for (const t of ALL_TYPES) expect({ lesson: l.id, has: t, ok: types.has(t) }).toEqual({ lesson: l.id, has: t, ok: true });
    }
  expect(trEn.units).toHaveLength(12); // A1→B1: u1–u8 + u9–u12
  for (const u of trEn.units) expect(u.lessons).toHaveLength(4);
});

test('tr-de and tr-es have 4 units × 3 lessons; tr-fr has 3 × 3', () => {
  for (const id of ['tr-de', 'tr-es']) {
    const c = getCourse(id)!;
    expect(c.units).toHaveLength(4);
    for (const u of c.units) expect(u.lessons).toHaveLength(3);
  }
  const fr = getCourse('tr-fr')!;
  expect(fr.units).toHaveLength(3);
  for (const u of fr.units) expect(u.lessons).toHaveLength(3);
  expect(courses.map((c) => c.id)).toEqual(['tr-en', 'tr-de', 'tr-es', 'tr-fr']);
});

/** The text a learner sees/hears for an exercise; match_pairs has no single prompt. */
function promptText(e: Exercise): string | null {
  switch (e.type) {
    case 'select_translation':
    case 'translate_build':
      return e.prompt;
    case 'fill_blank':
      return e.sentence;
    case 'listen_type':
      return e.audioText;
    case 'speak':
      return e.sentence;
    case 'match_pairs':
      return null;
  }
}

test('no two exercises in a lesson share the same prompt text', () => {
  for (const course of courses)
    for (const u of course.units)
      for (const l of u.lessons) {
        const prompts = l.exercises.map(promptText).filter((p): p is string => p !== null);
        const dupes = prompts.filter((p, i) => prompts.indexOf(p) !== i);
        expect({ lesson: l.id, dupes }).toEqual({ lesson: l.id, dupes: [] });
      }
});

test('lookup helpers', () => {
  expect(getCourse('nope')).toBeUndefined();
  expect(getVocab('nope')).toEqual([]);
  expect(getVocab('tr-en').length).toBeGreaterThan(40);
});
