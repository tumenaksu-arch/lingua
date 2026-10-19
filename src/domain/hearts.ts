import type { UserStats } from './types';

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;

export function regenerate(stats: UserStats, now: number): UserStats {
  if (stats.hearts >= MAX_HEARTS) return { ...stats, heartsUpdatedAt: now };
  const elapsed = Math.max(0, now - stats.heartsUpdatedAt);
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained === 0) return stats;
  const hearts = Math.min(MAX_HEARTS, stats.hearts + gained);
  const heartsUpdatedAt =
    hearts === MAX_HEARTS ? now : stats.heartsUpdatedAt + gained * HEART_REGEN_MS;
  return { ...stats, hearts, heartsUpdatedAt };
}

export function loseHeart(stats: UserStats, now: number): UserStats {
  const s = regenerate(stats, now);
  if (s.hearts <= 0) return s;
  // start the regen timer when leaving the full state
  const heartsUpdatedAt = s.hearts === MAX_HEARTS ? now : s.heartsUpdatedAt;
  return { ...s, hearts: s.hearts - 1, heartsUpdatedAt };
}

export function refill(stats: UserStats, now: number): UserStats {
  return { ...stats, hearts: MAX_HEARTS, heartsUpdatedAt: now };
}

export function canStartLesson(stats: UserStats, now: number): boolean {
  return regenerate(stats, now).hearts > 0;
}

/** ms until the next heart arrives, 0 when full. */
export function msUntilNextHeart(stats: UserStats, now: number): number {
  const s = regenerate(stats, now);
  if (s.hearts >= MAX_HEARTS) return 0;
  return Math.max(0, s.heartsUpdatedAt + HEART_REGEN_MS - now);
}
