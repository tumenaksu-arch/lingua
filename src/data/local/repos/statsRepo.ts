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
  // İş 3A: cihaz-local ekonomi alanları (sunucu satırına dahil edilmez).
  gems?: number;
  xp_boost_until?: number | null;
  lost_streak?: string | null;
  lessons_since_chest?: number;
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
  gems: 0,
  lessonsSinceChest: 0,
};

function parseLostStreak(raw: string | null | undefined): UserStats['lostStreak'] {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as UserStats['lostStreak'];
    return parsed && typeof parsed.value === 'number' && typeof parsed.lostOn === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

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
    gems: r.gems ?? 0,
    xpBoostUntil: r.xp_boost_until ?? undefined,
    lostStreak: parseLostStreak(r.lost_streak),
    lessonsSinceChest: r.lessons_since_chest ?? 0,
  };
}

/** Server-shaped row for the outbox (timestamps as ISO strings).
 *  İş 3A: gems/çift XP/kayıp seri/sandık alanları bilinçli olarak YOK —
 *  sunucu şeması değişmez, ekonomi cihaz-local kalır. */
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

  /** Writes locally without touching the outbox (used by sync pull).
   *  Ekonomi alanları (gems vb.) çakışmada GÜNCELLENMEZ: sunucu satırında yoklar,
   *  sync pull bunları asla ezmez (yalnız ilk INSERT'te yazılır). */
  async function writeLocal(s: UserStats, updatedAt: number): Promise<void> {
    await db.run(
      `INSERT INTO user_stats (user_id, xp, streak, last_active_date, streak_freezes, hearts, hearts_updated_at, daily_goal_xp, xp_today, gems, xp_boost_until, lost_streak, lessons_since_chest, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         xp = excluded.xp, streak = excluded.streak, last_active_date = excluded.last_active_date,
         streak_freezes = excluded.streak_freezes, hearts = excluded.hearts, hearts_updated_at = excluded.hearts_updated_at,
         daily_goal_xp = excluded.daily_goal_xp, xp_today = excluded.xp_today, updated_at = excluded.updated_at`,
      [
        userId, s.xp, s.streak, s.lastActiveDate, s.streakFreezes, s.hearts, s.heartsUpdatedAt, s.dailyGoalXp, s.xpToday,
        s.gems ?? 0, s.xpBoostUntil ?? null, s.lostStreak ? JSON.stringify(s.lostStreak) : null, s.lessonsSinceChest ?? 0,
        updatedAt,
      ],
    );
  }

  /** User-initiated write: local row + outbox in one transaction. Unlike the
   *  sync pull, the device-local economy fields ARE written here (otherwise a
   *  reload would reset gems / Çift XP / chest counter / lost streak). */
  async function save(s: UserStats, now = Date.now()): Promise<void> {
    await db.transaction(async () => {
      await writeLocal(s, now);
      await db.run(
        `INSERT INTO user_stats (user_id, gems, xp_boost_until, lost_streak, lessons_since_chest)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           gems = excluded.gems, xp_boost_until = excluded.xp_boost_until,
           lost_streak = excluded.lost_streak, lessons_since_chest = excluded.lessons_since_chest`,
        [userId, s.gems ?? 0, s.xpBoostUntil ?? null, s.lostStreak ? JSON.stringify(s.lostStreak) : null, s.lessonsSinceChest ?? 0],
      );
      await enqueue(db, 'user_stats', 'upsert', statsToServerRow(userId, s, now), now);
    });
  }

  return { get, getUpdatedAt, writeLocal, save };
}

export type StatsRepo = ReturnType<typeof createStatsRepo>;
