import type { LessonResult, UserStats } from './types';
import { xpBoostMultiplier } from './economy';
import { applyActivity } from './streak';

export const BASE_LESSON_XP = 10;
export const PERFECT_BONUS_XP = 5;

/** base 10, +5 for a perfect lesson, +1..5 combo bonus scaled by accuracy. */
export function lessonXp(result: LessonResult): number {
  if (result.total <= 0) return 0;
  const accuracy = result.correct / result.total;
  const perfect = result.mistakes.length === 0 && result.correct >= result.total;
  const combo = Math.max(1, Math.min(5, Math.round(accuracy * 5)));
  return BASE_LESSON_XP + (perfect ? PERFECT_BONUS_XP : 0) + combo;
}

export interface ApplyLessonOutcome {
  stats: UserStats;
  xpEarned: number;
  dailyGoalReached: boolean;
  /** true only when this lesson crossed the goal line */
  dailyGoalJustReached: boolean;
}

export function applyLessonResult(
  stats: UserStats,
  result: LessonResult,
  _now: number,
  localDate: string,
): ApplyLessonOutcome {
  // Çift XP etkinse merkezî çarpan burada uygulanır (görev ödülü bu akışa girmez).
  const xpEarned = lessonXp(result) * xpBoostMultiplier(stats, _now);
  const newDay = stats.lastActiveDate !== localDate;
  const xpBefore = newDay ? 0 : stats.xpToday;
  const xpToday = xpBefore + xpEarned;

  let next: UserStats = { ...stats, xp: stats.xp + xpEarned, xpToday };
  next = applyActivity(next, localDate);

  const dailyGoalReached = xpToday >= next.dailyGoalXp;
  const dailyGoalJustReached = dailyGoalReached && xpBefore < next.dailyGoalXp;
  return { stats: next, xpEarned, dailyGoalReached, dailyGoalJustReached };
}
