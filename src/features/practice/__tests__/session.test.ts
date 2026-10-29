/**
 * Practice Hub (Duolingo "Practice Hub → Mistakes / Words") session building —
 * pure logic: weak-word selection, mistake-session picking and word-quiz
 * option generation.
 */
import type { Course, SrsCard, VocabItem } from '@/domain';
import type { MistakeEntry } from '@/data';

import {
  PRACTICE_SESSION_SIZE,
  WEAK_WORDS_LIMIT,
  buildMistakeSession,
  buildWordExercise,
  buildWordSession,
  pickWeakWords,
  practiceXp,
} from '../session';

const course: Course = {
  id: 'c-test',
  fromLang: 'tr',
  toLang: 'en',
  title: 'Test kursu',
  vocab: [],
  units: [
    {
      id: 'u1',
      order: 1,
      title: 'Birim 1',
      description: '',
      lessons: [
        {
          id: 'l1',
          order: 1,
          vocabIds: [],
          exercises: [
            { id: 'e1', type: 'select_translation', promptLang: 'tr', prompt: 'p1', options: ['a', 'b'], correctIndex: 0 },
            { id: 'e2', type: 'select_translation', promptLang: 'tr', prompt: 'p2', options: ['a', 'b'], correctIndex: 0 },
          ],
        },
        {
          id: 'l2',
          order: 2,
          vocabIds: [],
          exercises: [
            { id: 'e3', type: 'fill_blank', promptLang: 'tr', sentence: 's', options: ['a', 'b'], correctIndex: 1 },
          ],
        },
      ],
    },
  ],
};

const entry = (exerciseId: string, wrongCount = 1, lastWrongAt = 0): MistakeEntry => ({
  exerciseId,
  wrongCount,
  correctStreak: 0,
  lastWrongAt,
});

describe('practiceXp', () => {
  it('awards 10 XP at exactly 50% and above', () => {
    expect(practiceXp(5, 10)).toBe(10);
    expect(practiceXp(4, 8)).toBe(10);
    expect(practiceXp(1, 2)).toBe(10);
  });

  it('awards 0 XP below 50%', () => {
    expect(practiceXp(2, 5)).toBe(0);
    expect(practiceXp(0, 10)).toBe(0);
    expect(practiceXp(0, 0)).toBe(0);
  });
});

describe('buildMistakeSession', () => {
  it('picks exercises by id from the course content, most-wrong first', () => {
    const exercises = buildMistakeSession(course, [
      entry('e2', 5),
      entry('e1', 9),
      entry('e3', 1),
    ]);
    expect(exercises.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('skips ids no longer present in the content', () => {
    const exercises = buildMistakeSession(course, [entry('gone'), entry('e2', 1)]);
    expect(exercises.map((e) => e.id)).toEqual(['e2']);
  });

  it('caps the session at the session size and dedupes ids', () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry(['e1', 'e2', 'e3'][i % 3]!, 30 - i));
    const exercises = buildMistakeSession(course, entries);
    expect(exercises.length).toBeLessThanOrEqual(PRACTICE_SESSION_SIZE);
    expect(exercises.length).toBe(3); // only 3 distinct ids exist in the content
  });
});

describe('pickWeakWords', () => {
  const card = (vocabId: string, ease: number, reps = 0): SrsCard => ({
    vocabId,
    ease,
    intervalDays: 1,
    reps,
    dueAt: 0,
  });

  it('orders by lowest ease first and caps at 20', () => {
    const cards = Array.from({ length: 25 }, (_, i) => card(`w${i}`, 2.5 - i * 0.05));
    const weak = pickWeakWords(cards);
    expect(weak).toHaveLength(WEAK_WORDS_LIMIT);
    expect(weak[0]!.vocabId).toBe('w24'); // ease 1.3
    expect(weak[0]!.ease).toBeLessThanOrEqual(weak[19]!.ease);
  });

  it('ties on ease break by fewer reps (less practiced = weaker)', () => {
    const weak = pickWeakWords([card('a', 1.5, 5), card('b', 1.5, 0)]);
    expect(weak.map((c) => c.vocabId)).toEqual(['b', 'a']);
  });
});

describe('buildWordExercise', () => {
  const pool: VocabItem[] = [
    { id: 'c-test.apple', courseId: 'c-test', term: 'apple', translation: 'elma' },
    { id: 'c-test.book', courseId: 'c-test', term: 'book', translation: 'kitap' },
    { id: 'c-test.cat', courseId: 'c-test', term: 'cat', translation: 'kedi' },
    { id: 'c-test.dog', courseId: 'c-test', term: 'dog', translation: 'köpek' },
    { id: 'c-test.egg', courseId: 'c-test', term: 'egg', translation: 'yumurta' },
    { id: 'c-test.sheep', courseId: 'c-test', term: 'sheep', translation: 'koyun' },
  ];

  it('produces 4 unique options with the correct answer exactly once', () => {
    const vocab = pool[0]!;
    for (const seed of [1, 2, 3, 42, 99]) {
      const ex = buildWordExercise(vocab, pool, seed, 'en');
      expect(ex.type).toBe('select_translation');
      expect(ex.options).toHaveLength(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options.filter((o) => o === vocab.translation)).toHaveLength(1);
      expect(ex.options[ex.correctIndex]).toBe(vocab.translation);
      expect(ex.prompt).toBe(vocab.term);
      expect(ex.promptLang).toBe('en');
    }
  });

  it('is deterministic for the same seed', () => {
    const vocab = pool[5]!;
    const a = buildWordExercise(vocab, pool, 7, 'en');
    const b = buildWordExercise(vocab, pool, 7, 'en');
    expect(a.options).toEqual(b.options);
    expect(a.correctIndex).toBe(b.correctIndex);
    expect(a.id).toBe(b.id);
  });

  it('never picks another vocab item with the same translation as a distractor', () => {
    const withDup = [...pool, { id: 'c-test.sheep2', courseId: 'c-test', term: 'ram', translation: 'koyun' }];
    const ex = buildWordExercise(withDup[0]!, withDup, 11, 'en');
    expect(new Set(ex.options).size).toBe(ex.options.length);
    expect(ex.options.filter((o) => o === 'koyun')).toHaveLength(0);
  });
});

describe('buildWordSession', () => {
  it('builds one term→translation exercise per weak word, capped at the session size', () => {
    const vocab: VocabItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `c-test.w${i}`,
      courseId: 'c-test',
      term: `term${i}`,
      translation: `çeviri${i}`,
    }));
    const cards = vocab.map((v, i) => ({
      vocabId: v.id,
      ease: 2.5 - i * 0.1,
      intervalDays: 1,
      reps: 0,
      dueAt: 0,
    }));
    const session = buildWordSession(course, cards, vocab);
    expect(session.pairs).toHaveLength(PRACTICE_SESSION_SIZE);
    // ease decreases with the index → w11 (1.4) is the weakest word
    expect(session.pairs[0]!.exercise.id).toBe('practice-word:c-test.w11');
    expect(session.pairs[0]!.card.vocabId).toBe('c-test.w11');
    expect(session.pairs[0]!.exercise.prompt).toBe('term11');
  });

  it('skips weak words missing from the vocab list', () => {
    const vocab: VocabItem[] = [
      { id: 'c-test.a', courseId: 'c-test', term: 'a', translation: 'x' },
      { id: 'c-test.b', courseId: 'c-test', term: 'b', translation: 'y' },
      { id: 'c-test.c', courseId: 'c-test', term: 'c', translation: 'z' },
      { id: 'c-test.d', courseId: 'c-test', term: 'd', translation: 't' },
    ];
    const cards = [
      { vocabId: 'c-test.gone', ease: 1.3, intervalDays: 1, reps: 0, dueAt: 0 },
      ...vocab.map((v) => ({ vocabId: v.id, ease: 1.5, intervalDays: 1, reps: 0, dueAt: 0 })),
    ];
    const session = buildWordSession(course, cards, vocab);
    expect(session.pairs).toHaveLength(4);
    expect(session.pairs.every((p) => p.card.vocabId !== 'c-test.gone')).toBe(true);
  });
});
