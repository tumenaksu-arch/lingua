import { lessonXp, applyLessonResult } from '../xp';
import type { LessonResult, UserStats } from '../types';

const result = (correct: number, total: number, mistakes: string[]): LessonResult => ({
  lessonId: 'l1', correct, total, mistakes, durationMs: 1000, vocabOutcomes: {},
});
const stats: UserStats = {
  xp: 100, streak: 2, lastActiveDate: '2026-10-10', streakFreezes: 0,
  hearts: 5, heartsUpdatedAt: 0, dailyGoalXp: 20, xpToday: 10,
};

describe('xp', () => {
  test('perfect lesson: 10 + 5 + 5', () => {
    expect(lessonXp(result(10, 10, []))).toBe(20);
  });
  test('imperfect lesson scales combo, no perfect bonus', () => {
    expect(lessonXp(result(5, 10, ['a', 'b', 'c', 'd', 'e']))).toBe(10 + 3);
    expect(lessonXp(result(1, 10, ['a']))).toBe(11);
  });
  test('applyLessonResult same day accumulates and reaches goal', () => {
    const o = applyLessonResult(stats, result(10, 10, []), 0, '2026-10-10');
    expect(o.stats.xp).toBe(120);
    expect(o.stats.xpToday).toBe(30);
    expect(o.dailyGoalReached).toBe(true);
    expect(o.dailyGoalJustReached).toBe(true);
    expect(o.stats.streak).toBe(2);
  });
  test('new day resets xpToday and bumps streak', () => {
    const o = applyLessonResult(stats, result(8, 10, ['a', 'b']), 0, '2026-10-11');
    expect(o.stats.xpToday).toBe(14);
    expect(o.dailyGoalReached).toBe(false);
    expect(o.stats.streak).toBe(3);
  });
});
