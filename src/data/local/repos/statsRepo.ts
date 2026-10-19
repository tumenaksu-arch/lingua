import type { UserStats } from '@/domain/types';
import type { Database } from '../database';
import { enqueue } from '../outbox';

/** Used when the app runs without a Firebase account (guest mode). */
export const LOCAL_USER_ID = 'local';

interface StatsRow {
  user_id: string;
  xp: number;
  streak: number;
  last_active_date: string | null;
  streak_freezes: number;
  hearts: number;
  hearts_updated_at: number;
  daily_goal_xp: number;
  xp_today: number;
  updated_at: number;
}

export const DEFAULT_STATS: UserStats = {
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  streakFreezes: 0,
  hearts: 5,
  heartsUpdatedAt: 0,
  dailyGoalXp: 20,
  xpToday: 0,
};

function fromRow(r: StatsRow): UserStats {
  return {
    xp: r.xp,
    streak: r.streak,
    lastActiveDate: r.last_active_date,
    streakFreezes: r.streak_freezes,
    hearts: r.hearts,
    heartsUpdatedAt: r.hearts_updated_at,
    dailyGoalXp: r.daily_goal_xp,
    xpToday: r.xp_today,
  };
}

/** Server-shaped row for the outbox (timestamps as ISO strings). */
export function statsToServerRow(userId: string, s: UserStats, updatedAt: number) {
  return {
    user_id: userId,
    xp: s.xp,
    streak: s.streak,
    last_active_date: s.lastActiveDate,
    streak_freezes: s.streakFreezes,
    hearts: s.hearts,
    hearts_updated_at: new Date(s.heartsUpdatedAt).toISOString(),
    daily_goal_xp: s.dailyGoalXp,
    xp_today: s.xpToday,
    updated_at: new Date(updatedAt).toISOString(),
  };
}

export function createStatsRepo(db: Database, userId: string) {
  async function get(): Promise<UserStats> {
    const row = await db.getFirst<StatsRow>('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
    return row ? fromRow(row) : { ...DEFAULT_STATS };
  }

  async function getUpdatedAt(): Promise<number> {
    const row = await db.getFirst<{ updated_at: number }>('SELECT updated_at FROM user_stats WHERE user_id = ?', [userId]);
    return row?.updated_at ?? 0;
  }

  /** Writes locally without touching the outbox (used by sync pull). */
  async function writeLocal(s: UserStats, updatedAt: number): Promise<void> {
    await db.run(
      `INSERT INTO user_stats (user_id, xp, streak, last_active_date, streak_freezes, hearts, hearts_updated_at, daily_goal_xp, xp_today, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         xp = excluded.xp, streak = excluded.streak, last_active_date = excluded.last_active_date,
         streak_freezes = excluded.streak_freezes, hearts = excluded.hearts, hearts_updated_at = excluded.hearts_updated_at,
         daily_goal_xp = excluded.daily_goal_xp, xp_today = excluded.xp_today, updated_at = excluded.updated_at`,
      [userId, s.xp, s.streak, s.lastActiveDate, s.streakFreezes, s.hearts, s.heartsUpdatedAt, s.dailyGoalXp, s.xpToday, updatedAt],
    );
  }

  /** User-initiated write: local row + outbox in one transaction. */
  async function save(s: UserStats, now = Date.now()): Promise<void> {
    await db.transaction(async () => {
      await writeLocal(s, now);
      await enqueue(db, 'user_stats', 'upsert', statsToServerRow(userId, s, now), now);
    });
  }

  return { get, getUpdatedAt, writeLocal, save };
}

export type StatsRepo = ReturnType<typeof createStatsRepo>;
