import type { UserStats } from './types';

/** YYYY-MM-DD in the given IANA tz (default: runtime local tz). */
export function localDateString(date: Date, tz?: string): string {
  if (!tz) {
    // Zero-dependency path: no Intl needed for the device's own time zone.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Whole days between two YYYY-MM-DD strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

export const MAX_STREAK_FREEZES = 2;
export const FREEZE_EVERY_DAYS = 7;

/** A freeze is earned each time the streak hits a multiple of 7 (capped at MAX_STREAK_FREEZES). */
function awardFreeze(stats: UserStats): UserStats {
  if (stats.streak % FREEZE_EVERY_DAYS !== 0) return stats;
  return { ...stats, streakFreezes: Math.min(MAX_STREAK_FREEZES, stats.streakFreezes + 1) };
}

/**
 * Register activity on `localDate`.
 * same day → no-op; next day → +1; one missed day with a freeze → freeze consumed, +1; otherwise reset to 1.
 * Every 7th consecutive day awards a streak freeze.
 */
export function applyActivity(stats: UserStats, localDate: string): UserStats {
  if (stats.lastActiveDate === null) {
    return { ...stats, streak: 1, lastActiveDate: localDate };
  }
  const gap = daysBetween(stats.lastActiveDate, localDate);
  if (gap <= 0) return stats;
  if (gap === 1) return awardFreeze({ ...stats, streak: stats.streak + 1, lastActiveDate: localDate });
  if (gap === 2 && stats.streakFreezes > 0) {
    return awardFreeze({
      ...stats,
      streak: stats.streak + 1,
      streakFreezes: stats.streakFreezes - 1,
      lastActiveDate: localDate,
    });
  }
  // Job 3A: kaybolan seri mağazadan onarılabilsin diye son değeri saklanır.
  return { ...stats, streak: 1, lastActiveDate: localDate, lostStreak: { value: stats.streak, lostOn: localDate } };
}
