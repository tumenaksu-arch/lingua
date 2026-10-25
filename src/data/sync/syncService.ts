import type { SrsCard, UserStats } from '@/domain/types';
import type { Database } from '../local/database';
import { bumpAttempts, deleteOutbox, getMeta, listOutbox, setMeta, type OutboxRow, type OutboxTable } from '../local/outbox';
import { createProgressRepo, type LessonProgress } from '../local/repos/progressRepo';
import { createSrsRepo } from '../local/repos/srsRepo';
import { createStatsRepo, LOCAL_USER_ID } from '../local/repos/statsRepo';

/** Narrow remote surface so sync can be tested without a network. */
export interface RemoteApi {
  upsert(table: OutboxTable, rows: Record<string, unknown>[]): Promise<void>;
  /** Rows of `table` for the user with updated_at > sinceIso (ISO string). */
  pull(table: 'user_stats' | 'srs_cards' | 'user_progress', userId: string, sinceIso: string): Promise<Record<string, any>[]>;
}

export class AuthRequiredError extends Error {}

const LAST_SYNC_KEY = 'last_sync_at';
const MAX_ATTEMPTS = 8;

export interface SyncOptions {
  db: Database;
  remote: RemoteApi;
  userId: string;
  now?: () => number;
  /** Injected for tests; default is exponential backoff with real timers. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Pushes pending outbox rows, grouped by (table, op), oldest first.
 * On success rows are deleted; on transient failure attempts are bumped and
 * retried with backoff (100ms·2^n, max 3 tries per call). Stops immediately
 * on auth errors so the caller can prompt for sign-in.
 *
 * Only rows of the signed-in user are pushed: firestore.rules deny any row whose
 * user_id is not the caller's uid, and a batch is all-or-nothing, so one foreign row
 * would fail every sync. Guest ("local") rows are dropped — adoptGuestProgress has
 * already re-queued that state under the account. Rows of another account stay
 * queued until that account signs in again.
 */
export async function pushOutbox(opts: SyncOptions): Promise<{ pushed: number; failed: number }> {
  const { db, remote, sleep = defaultSleep } = opts;
  let pushed = 0;
  let failed = 0;
  const rows: OutboxRow[] = [];
  const guestIds: number[] = [];
  for (const r of await listOutbox(db, 500)) {
    const owner = (JSON.parse(r.payload) as { user_id?: unknown }).user_id;
    if (owner === opts.userId) rows.push(r);
    else if (owner === LOCAL_USER_ID) guestIds.push(r.id);
  }
  await deleteOutbox(db, guestIds);
  const groups = new Map<string, OutboxRow[]>();
  for (const r of rows) {
    const k = `${r.tbl}:${r.op}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  for (const [key, group] of groups) {
    const [tbl, op] = key.split(':') as [OutboxTable, string];
    if (op !== 'upsert') continue; // deletes are not used by any repo yet
    // Keep only the newest payload per primary key to avoid clobbering newer with older.
    const latest = new Map<string, OutboxRow>();
    for (const r of group) latest.set(pkOf(tbl, JSON.parse(r.payload)), r);
    const payloads = [...latest.values()].map((r) => JSON.parse(r.payload) as Record<string, unknown>);
    const ids = group.map((r) => r.id);
    let attempt = 0;
    for (;;) {
      try {
        await remote.upsert(tbl, payloads);
        await deleteOutbox(db, ids);
        pushed += ids.length;
        break;
      } catch (e) {
        if (e instanceof AuthRequiredError) throw e;
        attempt++;
        if (attempt >= 3) {
          await bumpAttempts(db, ids);
          failed += ids.length;
          const dead = group.filter((r) => r.attempts + 1 >= MAX_ATTEMPTS).map((r) => r.id);
          if (dead.length) await deleteOutbox(db, dead); // poison rows: drop after MAX_ATTEMPTS
          break;
        }
        await sleep(100 * 2 ** attempt);
      }
    }
  }
  return { pushed, failed };
}

function pkOf(tbl: OutboxTable, p: Record<string, any>): string {
  switch (tbl) {
    case 'user_stats': return String(p.user_id);
    case 'user_progress': return `${p.user_id}:${p.lesson_id}`;
    case 'srs_cards': return `${p.user_id}:${p.vocab_id}`;
    case 'events': return String(p.id);
  }
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

/**
 * Pulls server rows changed since the last sync and merges them locally.
 * Conflict rules (docs/ARCHITECTURE.md §2): last-writer-wins on updated_at;
 * for srs_cards the row with more reps wins (ties → later updated_at).
 * Pulled rows are written with writeLocal so they never re-enter the outbox.
 */
export async function pullChanges(opts: SyncOptions, sinceIso: string): Promise<{ applied: number }> {
  const { db, remote, userId } = opts;
  const stats = createStatsRepo(db, userId);
  const srs = createSrsRepo(db, userId);
  const progress = createProgressRepo(db, userId);
  let applied = 0;
  // Rows with a pending local write are newer than anything on the server by definition;
  // skipping them prevents a pull from regressing state the next push will overwrite anyway.
  const pending = new Set((await listOutbox(db, 500)).map((r) => `${r.tbl}:${pkOf(r.tbl, JSON.parse(r.payload))}`));

  for (const r of await remote.pull('user_stats', userId, sinceIso)) {
    if (pending.has(`user_stats:${userId}`)) break;
    const remoteAt = ms(r.updated_at);
    if (remoteAt > (await stats.getUpdatedAt())) {
      const s: UserStats = {
        xp: r.xp, streak: r.streak, lastActiveDate: r.last_active_date ?? null, streakFreezes: r.streak_freezes,
        hearts: r.hearts, heartsUpdatedAt: ms(r.hearts_updated_at), dailyGoalXp: r.daily_goal_xp, xpToday: r.xp_today,
      };
      await stats.writeLocal(s, remoteAt);
      applied++;
    }
  }

  for (const r of await remote.pull('srs_cards', userId, sinceIso)) {
    if (pending.has(`srs_cards:${userId}:${r.vocab_id}`)) continue;
    const local = await srs.get(r.vocab_id);
    const remoteAt = ms(r.updated_at);
    const remoteWins = !local || r.reps > local.reps || (r.reps === local.reps && remoteAt > local.updatedAt);
    if (remoteWins) {
      const c: SrsCard = {
        vocabId: r.vocab_id, ease: r.ease, intervalDays: r.interval_days, reps: r.reps,
        dueAt: ms(r.due_at), lastReviewedAt: r.last_reviewed_at ? ms(r.last_reviewed_at) : undefined,
      };
      await srs.writeLocal(c, remoteAt);
      applied++;
    }
  }

  for (const r of await remote.pull('user_progress', userId, sinceIso)) {
    if (pending.has(`user_progress:${userId}:${r.lesson_id}`)) continue;
    const local = await progress.get(r.lesson_id);
    const remoteAt = ms(r.updated_at);
    if (!local || remoteAt > local.updatedAt) {
      const p: LessonProgress = { lessonId: r.lesson_id, crowns: r.crowns, completedAt: r.completed_at ? ms(r.completed_at) : null };
      await progress.writeLocal(p, remoteAt);
      applied++;
    }
  }
  return { applied };
}

let inFlight: Promise<SyncResult> | null = null;

export interface SyncResult {
  pushed: number;
  failed: number;
  applied: number;
}

/** Push then pull. Concurrent callers share the in-flight run. */
export function syncNow(opts: SyncOptions): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const now = opts.now ?? Date.now;
    const startedAt = now();
    const since = (await getMeta(opts.db, LAST_SYNC_KEY)) ?? new Date(0).toISOString();
    const { pushed, failed } = await pushOutbox(opts);
    const { applied } = await pullChanges(opts, since);
    // Cursor moves only when the push fully succeeded, so failed rows are retried next time
    // and nothing written to the server in between is skipped.
    if (failed === 0) await setMeta(opts.db, LAST_SYNC_KEY, new Date(startedAt).toISOString());
    return { pushed, failed, applied };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
