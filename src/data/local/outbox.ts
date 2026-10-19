import type { Database } from './database';

export type OutboxTable = 'user_stats' | 'user_progress' | 'srs_cards' | 'events';
export type OutboxOp = 'upsert' | 'delete';

export interface OutboxRow {
  id: number;
  tbl: OutboxTable;
  op: OutboxOp;
  /** JSON of the server-shaped row (snake_case columns). */
  payload: string;
  created_at: number;
  attempts: number;
}

/** Must be called inside the same transaction as the local write. */
export async function enqueue(
  db: Database,
  tbl: OutboxTable,
  op: OutboxOp,
  payload: Record<string, unknown>,
  now: number,
): Promise<void> {
  await db.run('INSERT INTO outbox (tbl, op, payload, created_at) VALUES (?, ?, ?, ?)', [
    tbl,
    op,
    JSON.stringify(payload),
    now,
  ]);
}

export function listOutbox(db: Database, limit = 100): Promise<OutboxRow[]> {
  return db.getAll<OutboxRow>('SELECT * FROM outbox ORDER BY id ASC LIMIT ?', [limit]);
}

export function deleteOutbox(db: Database, ids: number[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return db.run(`DELETE FROM outbox WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

export function bumpAttempts(db: Database, ids: number[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return db.run(`UPDATE outbox SET attempts = attempts + 1 WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

export async function getMeta(db: Database, key: string): Promise<string | null> {
  const row = await db.getFirst<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setMeta(db: Database, key: string, value: string): Promise<void> {
  return db.run('INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}
