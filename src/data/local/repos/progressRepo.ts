import type { Database } from '../database';
import { enqueue } from '../outbox';

export interface LessonProgress {
  lessonId: string;
  crowns: number;
  completedAt: number | null;
}

interface ProgressRow {
  user_id: string;
  lesson_id: string;
  crowns: number;
  completed_at: number | null;
  updated_at: number;
}

function fromRow(r: ProgressRow): LessonProgress {
  return { lessonId: r.lesson_id, crowns: r.crowns, completedAt: r.completed_at };
}

export function progressToServerRow(userId: string, p: LessonProgress, updatedAt: number) {
  return {
    user_id: userId,
    lesson_id: p.lessonId,
    crowns: p.crowns,
    completed_at: p.completedAt ? new Date(p.completedAt).toISOString() : null,
    updated_at: new Date(updatedAt).toISOString(),
  };
}

export function createProgressRepo(db: Database, userId: string) {
  async function all(): Promise<LessonProgress[]> {
    const rows = await db.getAll<ProgressRow>('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    return rows.map(fromRow);
  }

  async function get(lessonId: string): Promise<(LessonProgress & { updatedAt: number }) | null> {
    const r = await db.getFirst<ProgressRow>('SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?', [
      userId,
      lessonId,
    ]);
    return r ? { ...fromRow(r), updatedAt: r.updated_at } : null;
  }

  async function writeLocal(p: LessonProgress, updatedAt: number): Promise<void> {
    await db.run(
      `INSERT INTO user_progress (user_id, lesson_id, crowns, completed_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         crowns = excluded.crowns, completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
      [userId, p.lessonId, p.crowns, p.completedAt, updatedAt],
    );
  }

  /** Marks a lesson complete: crowns +1 (max 5), completed_at = now. */
  async function completeLesson(lessonId: string, now = Date.now()): Promise<LessonProgress> {
    const prev = await get(lessonId);
    const next: LessonProgress = { lessonId, crowns: Math.min(5, (prev?.crowns ?? 0) + 1), completedAt: now };
    await db.transaction(async () => {
      await writeLocal(next, now);
      await enqueue(db, 'user_progress', 'upsert', progressToServerRow(userId, next, now), now);
    });
    return next;
  }

  /** Append-only XP/activity log; synced via outbox. */
  async function logEvent(id: string, type: string, payload: Record<string, unknown>, now = Date.now()): Promise<void> {
    await db.transaction(async () => {
      await db.run('INSERT OR IGNORE INTO events (id, user_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)', [
        id,
        userId,
        type,
        JSON.stringify(payload),
        now,
      ]);
      await enqueue(
        db,
        'events',
        'upsert',
        { id, user_id: userId, type, payload, created_at: new Date(now).toISOString() },
        now,
      );
    });
  }

  return { all, get, writeLocal, completeLesson, logEvent };
}

export type ProgressRepo = ReturnType<typeof createProgressRepo>;
