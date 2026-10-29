import { createLesson, answer, current, isFinished, toResult, progress } from '../lesson';
import type { Exercise } from '../types';

const ex = (id: string): Exercise => ({
  id, type: 'select_translation', promptLang: 'tr', prompt: 'x', options: ['a', 'b'], correctIndex: 0,
});
const exercises = [ex('e1'), ex('e2'), ex('e3')];

describe('lesson state machine', () => {
  test('wrong answers are re-queued at the end', () => {
    let s = createLesson('l1', exercises, 5);
    s = answer(s, 'e1', false);
    expect(s.queue).toEqual(['e2', 'e3', 'e1']);
    expect(s.hearts).toBe(4);
    expect(current(s)?.id).toBe('e2');
    s = answer(s, 'e2', true);
    s = answer(s, 'e3', true);
    expect(isFinished(s)).toBe(false);
    s = answer(s, 'e1', true);
    expect(isFinished(s)).toBe(true);
    expect(progress(s)).toBe(1);
    const r = toResult(s, 5000, { e1: ['v1'], e2: ['v2'] });
    expect(r.correct).toBe(2);
    expect(r.total).toBe(3);
    expect(r.mistakes).toEqual(['e1']);
    expect(r.mistakesByType).toEqual({ select_translation: 1 });
    expect(r.vocabOutcomes).toEqual({ v1: false, v2: true });
  });

  test('mistakesByType counts every wrong ANSWER — retries included (k27)', () => {
    // e1 fails 3× before finally being answered right: the payload must
    // report 3, not 1 (the teacher's "Zorlanılanlar" under-reports students
    // who need many retries when only distinct exercises are counted).
    let s = createLesson('l1', exercises, Infinity);
    const attempts: Record<string, boolean[]> = { e1: [false, false, false, true] };
    while (!isFinished(s)) {
      const id = s.queue[0]!;
      s = answer(s, id, attempts[id]?.shift() ?? true);
    }
    expect(s.mistakes).toEqual(['e1']); // distinct ids, unchanged semantics
    const r = toResult(s, 5000);
    expect(r.mistakesByType).toEqual({ select_translation: 3 });
  });

  test('answering out of order is ignored', () => {
    const s = createLesson('l1', exercises, 5);
    expect(answer(s, 'e2', true)).toBe(s);
  });

  test('running out of hearts fails the lesson', () => {
    let s = createLesson('l1', exercises, 1);
    s = answer(s, 'e1', false);
    expect(s.failed).toBe(true);
    expect(isFinished(s)).toBe(true);
  });

  test('infinite hearts never fail', () => {
    let s = createLesson('l1', exercises, Infinity);
    for (let i = 0; i < 10; i++) s = answer(s, s.queue[0], false);
    expect(s.failed).toBe(false);
    expect(s.hearts).toBe(Infinity);
  });
});

describe('answer with requeue: false (placement exam)', () => {
  it('a wrong answer is final: the question is not asked again and the exam ends after one pass', () => {
    let s = createLesson('p', exercises, Infinity);
    for (const e of exercises) s = answer(s, current(s)!.id, e.id !== exercises[0]!.id, { requeue: false });
    expect(isFinished(s)).toBe(true);
    expect(s.answered).toBe(exercises.length);
    expect(toResult(s, 0).correct).toBe(exercises.length - 1);
  });
});
