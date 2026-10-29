import type { Lesson } from '@/domain';
import {
  correctAnswerText,
  autoPlayText,
  buildAnswer,
  createBuild,
  createMatch,
  exerciseVocabMap,
  formatDuration,
  isMatchComplete,
  pickWord,
  seededShuffle,
  tapMatch,
  unpickWord,
} from '../helpers';

describe('seededShuffle', () => {
  it('is deterministic and a permutation', () => {
    const a = seededShuffle([1, 2, 3, 4, 5], 42);
    const b = seededShuffle([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('build state', () => {
  it('picks, unpicks and assembles the answer', () => {
    let s = createBuild(['I', 'am', 'a', 'cat']);
    s = pickWord(s, 0);
    s = pickWord(s, 1);
    s = pickWord(s, 1); // duplicate ignored
    expect(buildAnswer(s)).toBe('I am');
    s = unpickWord(s, 0);
    expect(buildAnswer(s)).toBe('am');
    expect(pickWord(s, 99)).toBe(s);
  });
});

describe('match state', () => {
  const pairs = [
    { left: 'cat', right: 'kedi' },
    { left: 'dog', right: 'köpek' },
  ];
  it('matches correct pairs and flags wrong ones', () => {
    let s = createMatch(pairs, 1);
    const kediIdx = s.right.indexOf('kedi');
    const kopekIdx = s.right.indexOf('köpek');
    s = tapMatch(s, 'left', 0);
    s = tapMatch(s, 'right', kopekIdx);
    expect(s.wrong).toEqual({ left: 0, right: kopekIdx });
    expect(s.mistakes).toBe(1);
    s = tapMatch(s, 'left', 0);
    s = tapMatch(s, 'right', kediIdx);
    expect(s.matchedLeft.has(0)).toBe(true);
    expect(isMatchComplete(s)).toBe(false);
    s = tapMatch(s, 'right', kopekIdx);
    s = tapMatch(s, 'left', 1);
    expect(isMatchComplete(s)).toBe(true);
    // matched items are inert
    expect(tapMatch(s, 'left', 0)).toBe(s);
  });
  it('toggles selection off on second tap', () => {
    let s = createMatch(pairs, 1);
    s = tapMatch(s, 'left', 0);
    s = tapMatch(s, 'left', 0);
    expect(s.selectedLeft).toBeNull();
  });
});

describe('exerciseVocabMap / autoPlayText / formatDuration', () => {
  const lesson: Lesson = {
    id: 'l1',
    order: 1,
    vocabIds: ['v1', 'v2'],
    exercises: [
      { id: 'e1', type: 'select_translation', promptLang: 'en', prompt: 'cat', options: ['kedi', 'köpek'], correctIndex: 0 },
      { id: 'e2', type: 'fill_blank', promptLang: 'en', sentence: 'I ___ a cat', options: ['am', 'is'], correctIndex: 0 },
    ],
  };
  it('maps every exercise to lesson vocab', () => {
    expect(exerciseVocabMap(lesson)).toEqual({ e1: ['v1', 'v2'], e2: ['v1', 'v2'] });
  });
  it('auto-plays only target-language prompts', () => {
    expect(autoPlayText(lesson.exercises[0]!, 'en')).toBe('cat');
    expect(autoPlayText(lesson.exercises[0]!, 'tr')).toBeNull();
    expect(autoPlayText(lesson.exercises[1]!, 'en')).toBeNull();
  });
  it('formats mm:ss', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });
});

describe('correctAnswerText', () => {
  it('names the right option for every choice-based type, including the new ones', () => {
    const base = { id: 'x', promptLang: 'en' as const };
    expect(correctAnswerText({ ...base, type: 'listen_select', audioText: 'a', audioLang: 'en', options: ['a', 'b'], correctIndex: 1 })).toBe('b');
    expect(correctAnswerText({ ...base, type: 'picture_select', prompt: 'p', options: [{ emoji: '🍎', label: 'apple' }, { emoji: '🍞', label: 'bread' }], correctIndex: 0 })).toBe('apple');
    expect(correctAnswerText({ ...base, type: 'complete_chat', lines: [{ speaker: 'a', text: 'Hi' }], options: ['Hi!', 'Bye'], correctIndex: 0 })).toBe('Hi!');
    expect(correctAnswerText({ ...base, type: 'read_answer', passage: 'p', question: 'q', options: ['x', 'y'], correctIndex: 1 })).toBe('y');
    expect(correctAnswerText({ ...base, type: 'match_pairs', pairs: [] })).toBeUndefined();
  });
});
