import type { SrsCard } from '@/domain/types';
import type { Database } from '../database';
import { enqueue } from '../outbox';

interface SrsRow {
  user_id: string;
  vocab_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: number;
  last_reviewed_at: number | null;
  updated_at: number;
}

function fromRow(r: SrsRow): SrsCard {
  return {
    vocabId: r.vocab_id,
    ease: r.ease,
    intervalDays: r.interval_days,
    reps: r.reps,
    dueAt: r.due_at,
    lastReviewedAt: r.last_reviewed_at ?? undefined,
  };
}

export function cardToServerRow(userId: string, c: SrsCard, updatedAt: number) {
  return {
    user_id: userId,
    vocab_id: c.vocabId,
    ease: c.ease,
    interval_days: c.intervalDays,
    reps: c.reps,
    due_at: new Date(c.dueAt).toISOString(),
    last_reviewed_at: c.lastReviewedAt ? new Date(c.lastReviewedAt).toISOString() : null,
    updated_at: new Date(updatedAt).toISOString(),
  };
}

export function createSrsRepo(db: Database, userId: string) {
  async function all(): Promise<SrsCard[]> {
    const rows = await db.getAll<SrsRow>('SELECT * FROM srs_cards WHERE user_id = ? ORDER BY due_at ASC', [userId]);
    return rows.map(fromRow);
  }

  /** Optional `vocabIdPrefix` scopes to one course (bundled ids are `<courseId>.<term>`). */
  async function due(now: number, limit = 20, vocabIdPrefix?: string): Promise<SrsCard[]> {
    const rows = await db.getAll<SrsRow>(
      `SELECT * FROM srs_cards WHERE user_id = ? AND due_at <= ?${vocabIdPrefix ? ' AND vocab_id LIKE ?' : ''} ORDER BY due_at ASC LIMIT ?`,
      vocabIdPrefix ? [userId, now, `${vocabIdPrefix}%`, limit] : [userId, now, limit],
    );
    return rows.map(fromRow);
  }

  async function get(vocabId: string): Promise<(SrsCard & { updatedAt: number }) | null> {
    const r = await db.getFirst<SrsRow>('SELECT * FROM srs_cards WHERE user_id = ? AND vocab_id = ?', [userId, vocabId]);
    return r ? { ...fromRow(r), updatedAt: r.updated_at } : null;
  }

  async function countDue(now: number, vocabIdPrefix?: string): Promise<number> {
    const r = await db.getFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM srs_cards WHERE user_id = ? AND due_at <= ?${vocabIdPrefix ? ' AND vocab_id LIKE ?' : ''}`,
      vocabIdPrefix ? [userId, now, `${vocabIdPrefix}%`] : [userId, now],
    );
    return r?.n ?? 0;
  }

  async function writeLocal(c: SrsCard, updatedAt: number): Promise<void> {
    await db.run(
      `INSERT INTO srs_cards (user_id, vocab_id, ease, interval_days, reps, due_at, last_reviewed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, vocab_id) DO UPDATE SET
         ease = excluded.ease, interval_days = excluded.interval_days, reps = excluded.reps,
         due_at = excluded.due_at, last_reviewed_at = excluded.last_reviewed_at, updated_at = excluded.updated_at`,
      [userId, c.vocabId, c.ease, c.intervalDays, c.reps, c.dueAt, c.lastReviewedAt ?? null, updatedAt],
    );
  }

  /** Saves a batch of cards (e.g. after a lesson) in one transaction. */
  async function saveMany(cards: SrsCard[], now = Date.now()): Promise<void> {
    if (cards.length === 0) return;
    await db.transaction(async () => {
      for (const c of cards) {
        await writeLocal(c, now);
        await enqueue(db, 'srs_cards', 'upsert', cardToServerRow(userId, c, now), now);
      }
    });
  }

  return { all, due, get, countDue, writeLocal, saveMany };
}

export type SrsRepo = ReturnType<typeof createSrsRepo>;
