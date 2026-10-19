import type { Course, UserStats } from './types';

/** Lesson progress shape as kept by the store (lessonId → row); only completion matters here. */
type ProgressMap = Record<string, { completedAt: number | null } | undefined>;

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

/** Everything `evaluate` looks at. All counters are cumulative; none depend on time. */
export interface AchievementContext {
  stats: UserStats;
  course: Course;
  progress: ProgressMap;
  /** total flashcards reviewed in the Review tab (any course) */
  reviewedCount: number;
  /** number of review sessions started (any course) */
  reviewSessions: number;
  /** true when the lesson that just finished had zero mistakes */
  lastLessonPerfect: boolean;
  /** consecutive days on which the daily goal was reached (incl. today if reached) */
  goalDays: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first_lesson', title: 'İlk adım', description: 'İlk dersini tamamla', emoji: '🐣' },
  { id: 'perfect_lesson', title: 'Kusursuz', description: 'Bir dersi hiç hata yapmadan bitir', emoji: '💯' },
  { id: 'streak_7', title: 'Bir hafta', description: '7 günlük seri', emoji: '🔥' },
  { id: 'streak_30', title: 'Bir ay', description: '30 günlük seri', emoji: '🌋' },
  { id: 'streak_100', title: 'Yüz gün', description: '100 günlük seri', emoji: '🏆' },
  { id: 'xp_100', title: 'Isınma', description: '100 XP topla', emoji: '⚡' },
  { id: 'xp_1000', title: 'Güç kaynağı', description: '1000 XP topla', emoji: '🔋' },
  { id: 'first_review', title: 'Hafıza kası', description: 'İlk tekrar oturumunu yap', emoji: '🧠' },
  { id: 'review_50', title: 'Kart ustası', description: '50 kelime kartı tekrar et', emoji: '🗂️' },
  { id: 'unit_complete', title: 'Bölüm bitti', description: 'Bir bölümü tamamla', emoji: '📗' },
  { id: 'course_complete', title: 'Mezun', description: 'Bir kursu tamamla', emoji: '🎓' },
  { id: 'goal_7', title: 'Disiplin', description: '7 gün üst üste günlük hedefe ulaş', emoji: '🎯' },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

function completedCount(progress: ProgressMap): number {
  return Object.values(progress).filter((p) => p?.completedAt).length;
}

function anyUnitComplete(course: Course, progress: ProgressMap): boolean {
  return course.units.some((u) => u.lessons.length > 0 && u.lessons.every((l) => progress[l.id]?.completedAt));
}

function courseComplete(course: Course, progress: ProgressMap): boolean {
  const lessons = course.units.flatMap((u) => u.lessons);
  return lessons.length > 0 && lessons.every((l) => progress[l.id]?.completedAt);
}

/** Which achievements are satisfied right now, regardless of what was unlocked before. */
export function satisfied(ctx: AchievementContext): string[] {
  const { stats } = ctx;
  const checks: Record<string, boolean> = {
    first_lesson: completedCount(ctx.progress) >= 1,
    perfect_lesson: ctx.lastLessonPerfect,
    streak_7: stats.streak >= 7,
    streak_30: stats.streak >= 30,
    streak_100: stats.streak >= 100,
    xp_100: stats.xp >= 100,
    xp_1000: stats.xp >= 1000,
    first_review: ctx.reviewSessions >= 1,
    review_50: ctx.reviewedCount >= 50,
    unit_complete: anyUnitComplete(ctx.course, ctx.progress),
    course_complete: courseComplete(ctx.course, ctx.progress),
    goal_7: ctx.goalDays >= 7,
  };
  return ACHIEVEMENTS.filter((a) => checks[a.id]).map((a) => a.id);
}

/**
 * Returns the ids that are satisfied now but were not in `unlocked`, in catalogue order.
 * Unlocks are permanent: a later evaluation never revokes an id.
 */
export function evaluate(ctx: AchievementContext, unlocked: Iterable<string>): string[] {
  const have = new Set(unlocked);
  return satisfied(ctx).filter((id) => !have.has(id));
}

/**
 * Consecutive-days counter for the daily goal. `prev` is the stored state
 * ({ date: last day the goal was reached, count }); returns the new state after
 * the goal was reached on `localDate` (YYYY-MM-DD). Same day → unchanged,
 * next day → +1, any gap → restart at 1.
 */
export interface GoalStreak {
  date: string | null;
  count: number;
}

export function advanceGoalStreak(prev: GoalStreak, localDate: string): GoalStreak {
  if (prev.date === localDate) return prev;
  if (prev.date && isNextDay(prev.date, localDate)) return { date: localDate, count: prev.count + 1 };
  return { date: localDate, count: 1 };
}

function isNextDay(a: string, b: string): boolean {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return db - da === 86_400_000;
}
