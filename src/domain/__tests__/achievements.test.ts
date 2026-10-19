import { ACHIEVEMENTS, advanceGoalStreak, evaluate, getAchievement, satisfied, type AchievementContext } from '../achievements';
import type { Course, UserStats } from '../types';

const stats = (over: Partial<UserStats> = {}): UserStats => ({
  xp: 0, streak: 0, lastActiveDate: null, streakFreezes: 0, hearts: 5, heartsUpdatedAt: 0, dailyGoalXp: 20, xpToday: 0, ...over,
});

const course: Course = {
  id: 'c', fromLang: 'tr', toLang: 'en', title: 'T', vocab: [],
  units: [
    { id: 'u1', order: 1, title: 'U1', description: '', lessons: [
      { id: 'l1', order: 1, exercises: [], vocabIds: [] },
      { id: 'l2', order: 2, exercises: [], vocabIds: [] },
    ] },
    { id: 'u2', order: 2, title: 'U2', description: '', lessons: [{ id: 'l3', order: 1, exercises: [], vocabIds: [] }] },
  ],
};

const done = { completedAt: 1 };
const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  stats: stats(), course, progress: {}, reviewedCount: 0, reviewSessions: 0, lastLessonPerfect: false, goalDays: 0, ...over,
});

test('catalogue has unique ids and lookup works', () => {
  expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
  expect(getAchievement('first_lesson')?.emoji).toBe('🐣');
  expect(getAchievement('nope')).toBeUndefined();
});

test('nothing satisfied on a fresh account', () => {
  expect(satisfied(ctx())).toEqual([]);
});

test('first lesson, perfect lesson and xp thresholds', () => {
  expect(satisfied(ctx({ progress: { l1: done }, lastLessonPerfect: true, stats: stats({ xp: 100 }) }))).toEqual([
    'first_lesson', 'perfect_lesson', 'xp_100',
  ]);
  expect(satisfied(ctx({ stats: stats({ xp: 1000 }) }))).toEqual(['xp_100', 'xp_1000']);
});

test('streak thresholds are cumulative', () => {
  expect(satisfied(ctx({ stats: stats({ streak: 7 }) }))).toEqual(['streak_7']);
  expect(satisfied(ctx({ stats: stats({ streak: 100 }) }))).toEqual(['streak_7', 'streak_30', 'streak_100']);
});

test('review counters', () => {
  expect(satisfied(ctx({ reviewSessions: 1, reviewedCount: 49 }))).toEqual(['first_review']);
  expect(satisfied(ctx({ reviewSessions: 1, reviewedCount: 50 }))).toEqual(['first_review', 'review_50']);
});

test('unit and course completion follow the course structure', () => {
  expect(satisfied(ctx({ progress: { l1: done } }))).toEqual(['first_lesson']);
  expect(satisfied(ctx({ progress: { l1: done, l2: done } }))).toEqual(['first_lesson', 'unit_complete']);
  expect(satisfied(ctx({ progress: { l1: done, l2: done, l3: done } }))).toEqual(['first_lesson', 'unit_complete', 'course_complete']);
  // a single-lesson unit completes on its own
  expect(satisfied(ctx({ progress: { l3: done } }))).toContain('unit_complete');
});

test('goal_7 needs 7 consecutive goal days', () => {
  expect(satisfied(ctx({ goalDays: 6 }))).toEqual([]);
  expect(satisfied(ctx({ goalDays: 7 }))).toEqual(['goal_7']);
});

test('evaluate returns only new ids and never revokes', () => {
  const c = ctx({ progress: { l1: done }, stats: stats({ xp: 150 }) });
  expect(evaluate(c, [])).toEqual(['first_lesson', 'xp_100']);
  expect(evaluate(c, ['first_lesson'])).toEqual(['xp_100']);
  expect(evaluate(c, ['first_lesson', 'xp_100', 'streak_7'])).toEqual([]);
});

test('advanceGoalStreak: same day no-op, next day +1, gap restarts', () => {
  const s1 = advanceGoalStreak({ date: null, count: 0 }, '2026-10-19');
  expect(s1).toEqual({ date: '2026-10-19', count: 1 });
  expect(advanceGoalStreak(s1, '2026-10-19')).toBe(s1);
  const s2 = advanceGoalStreak(s1, '2026-10-20');
  expect(s2).toEqual({ date: '2026-10-20', count: 2 });
  expect(advanceGoalStreak(s2, '2026-10-22')).toEqual({ date: '2026-10-22', count: 1 });
  // month boundary
  expect(advanceGoalStreak({ date: '2026-10-31', count: 3 }, '2026-11-01').count).toBe(4);
});
