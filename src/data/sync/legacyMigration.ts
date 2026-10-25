import type { Database } from '../local/database';
import { enqueue } from '../local/outbox';

/**
 * Firebase → Supabase account migration for local data.
 *
 * Old installs kept their learning data in SQLite under the Firebase uid and their
 * session under an AsyncStorage `firebase:authUser:*` key (see ../remote/legacy).
 * After the first successful Supabase sign-in the rows must move to the new uid and
 * be pushed in full, or the account would start empty (and the old device data would
 * be stranded on the old uid forever).
 *
 * `migrateLegacyRows` re-keys every legacy row to the new uid and enqueues the
 * surviving rows into the outbox (full push). Merging follows the same conflict
 * rules as sync's pullChanges (stats/progress: last-writer-wins on updated_at;
 * srs_cards: more reps wins, ties → later updated_at). It is idempotent: with no
 * legacy rows left it does nothing, so running it twice can neither duplicate nor
 * lose data. Callers pull the account's server data BEFORE migrating so conflicts
 * compare against what the server already has.
 */

interface StatsLocalRow {
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

interface ProgressLocalRow {
  user_id: string;
  lesson_id: string;
  crowns: number;
  completed_at: number | null;
  updated_at: number;
}

interface SrsLocalRow {
  user_id: string;
  vocab_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: number;
  last_reviewed_at: number | null;
  updated_at: number;
}

interface EventLocalRow {
  id: string;
  user_id: string;
  type: string;
  payload: string;
  created_at: number;
}

const iso = (t: number) => new Date(t).toISOString();

function statsServerRow(uid: string, r: StatsLocalRow) {
  return {
    user_id: uid,
    xp: r.xp,
    streak: r.streak,
    last_active_date: r.last_active_date,
    streak_freezes: r.streak_freezes,
    hearts: r.hearts,
    hearts_updated_at: iso(r.hearts_updated_at),
    daily_goal_xp: r.daily_goal_xp,
    xp_today: r.xp_today,
    updated_at: iso(r.updated_at),
  };
}

function progressServerRow(uid: string, r: ProgressLocalRow) {
  return {
    user_id: uid,
    lesson_id: r.lesson_id,
    crowns: r.crowns,
    completed_at: r.completed_at === null ? null : iso(r.completed_at),
    updated_at: iso(r.updated_at),
  };
}

function srsServerRow(uid: string, r: SrsLocalRow) {
  return {
    user_id: uid,
    vocab_id: r.vocab_id,
    ease: r.ease,
    interval_days: r.interval_days,
    reps: r.reps,
    due_at: iso(r.due_at),
    last_reviewed_at: r.last_reviewed_at === null ? null : iso(r.last_reviewed_at),
    updated_at: iso(r.updated_at),
  };
}

function eventServerRow(uid: string, r: EventLocalRow) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(r.payload) as Record<string, unknown>;
  } catch {
    /* keep {} — the SQL default */
  }
  return {
    user_id: uid,
    id: r.id,
    type: r.type,
    payload,
    created_at: iso(r.created_at),
    updated_at: iso(r.created_at),
  };
}

/**
 * Moves all rows of `legacyUid` to `newUid` and enqueues them for a full push.
 * @returns true when any legacy rows existed (migration ran), false otherwise.
 */
export async function migrateLegacyRows(
  db: Database,
  legacyUid: string,
  newUid: string,
  now = Date.now(),
): Promise<boolean> {
  if (legacyUid === newUid) return false;
  let migrated = false;

  // user_stats: one row; newer updated_at wins (same rule as pullChanges).
  const statsRow = await db.getFirst<StatsLocalRow>('SELECT * FROM user_stats WHERE user_id = ?', [legacyUid]);
  if (statsRow) {
    migrated = true;
    await db.transaction(async () => {
      const target = await db.getFirst<{ updated_at: number }>(
        'SELECT updated_at FROM user_stats WHERE user_id = ?',
        [newUid],
      );
      if (!target) {
        await db.run('UPDATE user_stats SET user_id = ? WHERE user_id = ?', [newUid, legacyUid]);
        await enqueue(db, 'user_stats', 'upsert', statsServerRow(newUid, statsRow), now);
      } else if (statsRow.updated_at > target.updated_at) {
        await db.run('DELETE FROM user_stats WHERE user_id = ?', [newUid]);
        await db.run('UPDATE user_stats SET user_id = ? WHERE user_id = ?', [newUid, legacyUid]);
        await enqueue(db, 'user_stats', 'upsert', statsServerRow(newUid, statsRow), now);
      } else {
        await db.run('DELETE FROM user_stats WHERE user_id = ?', [legacyUid]);
      }
    });
  }

  // user_progress: per lesson, newer updated_at wins.
  const progressRows = await db.getAll<ProgressLocalRow>('SELECT * FROM user_progress WHERE user_id = ?', [legacyUid]);
  for (const row of progressRows) {
    migrated = true;
    await db.transaction(async () => {
      const target = await db.getFirst<{ updated_at: number }>(
        'SELECT updated_at FROM user_progress WHERE user_id = ? AND lesson_id = ?',
        [newUid, row.lesson_id],
      );
      if (!target) {
        await db.run('UPDATE user_progress SET user_id = ? WHERE user_id = ? AND lesson_id = ?', [
          newUid,
          legacyUid,
          row.lesson_id,
        ]);
        await enqueue(db, 'user_progress', 'upsert', progressServerRow(newUid, row), now);
      } else if (row.updated_at > target.updated_at) {
        await db.run('DELETE FROM user_progress WHERE user_id = ? AND lesson_id = ?', [newUid, row.lesson_id]);
        await db.run('UPDATE user_progress SET user_id = ? WHERE user_id = ? AND lesson_id = ?', [
          newUid,
          legacyUid,
          row.lesson_id,
        ]);
        await enqueue(db, 'user_progress', 'upsert', progressServerRow(newUid, row), now);
      } else {
        await db.run('DELETE FROM user_progress WHERE user_id = ? AND lesson_id = ?', [legacyUid, row.lesson_id]);
      }
    });
  }

  // srs_cards: more reps wins, ties → later updated_at (same rule as pullChanges).
  const srsRows = await db.getAll<SrsLocalRow>('SELECT * FROM srs_cards WHERE user_id = ?', [legacyUid]);
  for (const row of srsRows) {
    migrated = true;
    await db.transaction(async () => {
      const target = await db.getFirst<{ reps: number; updated_at: number }>(
        'SELECT reps, updated_at FROM srs_cards WHERE user_id = ? AND vocab_id = ?',
        [newUid, row.vocab_id],
      );
      const legacyWins =
        !target || row.reps > target.reps || (row.reps === target.reps && row.updated_at > target.updated_at);
      if (!target) {
        await db.run('UPDATE srs_cards SET user_id = ? WHERE user_id = ? AND vocab_id = ?', [
          newUid,
          legacyUid,
          row.vocab_id,
        ]);
        await enqueue(db, 'srs_cards', 'upsert', srsServerRow(newUid, row), now);
      } else if (legacyWins) {
        await db.run('DELETE FROM srs_cards WHERE user_id = ? AND vocab_id = ?', [newUid, row.vocab_id]);
        await db.run('UPDATE srs_cards SET user_id = ? WHERE user_id = ? AND vocab_id = ?', [
          newUid,
          legacyUid,
          row.vocab_id,
        ]);
        await enqueue(db, 'srs_cards', 'upsert', srsServerRow(newUid, row), now);
      } else {
        await db.run('DELETE FROM srs_cards WHERE user_id = ? AND vocab_id = ?', [legacyUid, row.vocab_id]);
      }
    });
  }

  // events: append-only log; the local PK is `id` alone. The lookup below also finds
  // the legacy row itself, so a "collision" only counts when it belongs to someone else.
  const eventRows = await db.getAll<EventLocalRow>('SELECT * FROM events WHERE user_id = ?', [legacyUid]);
  for (const row of eventRows) {
    migrated = true;
    await db.transaction(async () => {
      const existing = await db.getFirst<{ id: string; user_id: string }>('SELECT id, user_id FROM events WHERE id = ?', [
        row.id,
      ]);
      if (existing && existing.user_id !== legacyUid) {
        await db.run('DELETE FROM events WHERE id = ? AND user_id = ?', [row.id, legacyUid]);
      } else {
        await db.run('UPDATE events SET user_id = ? WHERE id = ?', [newUid, row.id]);
        await enqueue(db, 'events', 'upsert', eventServerRow(newUid, row), now);
      }
    });
  }

  // Pending outbox writes of the legacy user (unsynced local writes) would never be
  // pushed after the uid change — pushOutbox only sends rows of the signed-in uid.
  // Re-key them the same way so the full push carries them too.
  const outboxRows = await db.getAll<{ id: number; payload: string }>('SELECT id, payload FROM outbox');
  for (const row of outboxRows) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      continue; // not a row payload; leave it alone
    }
    if (parsed.user_id !== legacyUid) continue;
    migrated = true;
    await db.run('UPDATE outbox SET payload = ? WHERE id = ?', [JSON.stringify({ ...parsed, user_id: newUid }), row.id]);
  }

  return migrated;
}
