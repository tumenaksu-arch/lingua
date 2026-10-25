import type { Database } from '@/data';

const DAY_MS = 86_400_000;

/**
 * Start of the current ISO-8601 week (Monday 00:00 UTC) as epoch ms.
 * Day-of-week is normalized so Monday = 0 … Sunday = 6.
 */
export function weekStartMs(date: Date): number {
  const dayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const mondayIndex = (new Date(dayMs).getUTCDay() + 6) % 7;
  return dayMs - mondayIndex * DAY_MS;
}

/**
 * ISO-8601 week id `YYYY-Www` (weeks 01..53, Monday start, computed in UTC).
 * The ISO week year is taken from the week's Thursday, so year boundaries
 * (e.g. 2026-12-31 / 2027-01-01 both in 2026-W53) map to the right id.
 */
export function isoWeekId(date: Date): string {
  const start = weekStartMs(date);
  const thursday = new Date(start + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  // January 4th always lies in ISO week 1; its week start anchors the count.
  const weekOneStart = weekStartMs(new Date(Date.UTC(year, 0, 4)));
  const week = Math.floor((start - weekOneStart) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * XP earned in the current ISO week: the sum of `payload.xp` over the XP event
 * types (lesson/story completions and claimed daily quests) logged since the
 * Monday 00:00 UTC week start. Returns 0 when there is no local database.
 */
export async function weeklyXpTotal(db: Database | null, userId: string, now: number): Promise<number> {
  if (!db) return 0;
  const from = weekStartMs(new Date(now));
  const rows = await db.getAll<{ payload: string }>(
    `SELECT payload FROM events
      WHERE user_id = ? AND created_at > ?
        AND type IN ('lesson_completed', 'story_completed', 'quest_claimed')`,
    [userId, from - 1],
  );
  let total = 0;
  for (const r of rows) {
    try {
      total += Number((JSON.parse(r.payload) as { xp?: number }).xp ?? 0);
    } catch {
      /* skip malformed payload */
    }
  }
  return total;
}
