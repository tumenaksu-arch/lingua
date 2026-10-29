import type { Database } from '../database';

/**
 * Practice Hub "Hatalarım" (job 1A): exercises answered wrong, kept on the
 * device only — never enqueued to the outbox. A mistake row drops after the
 * exercise is answered correctly twice in a row (lesson completions count as
 * one correct answer, practice sessions replay them).
 */
export interface MistakeEntry {
  exerciseId: string;
  wrongCount: number;
  correctStreak: number;
  lastWrongAt: number;
}

interface MistakeRow {
  user_id: string;
  course_id: string;
  exercise_id: string;
  wrong_count: number;
  correct_streak: number;
  last_wrong_at: number;
  updated_at: number;
}

function fromRow(r: MistakeRow): MistakeEntry {
  return {
    exerciseId: r.exercise_id,
    wrongCount: r.wrong_count,
    correctStreak: r.correct_streak,
    lastWrongAt: r.last_wrong_at,
  };
}

/** Consecutive correct answers needed to clear a mistake (Duolingo-style). */
export const MISTAKE_CLEAR_STREAK = 2;

export function createMistakesRepo(db: Database, userId: string) {
  const pkWhere = 'WHERE user_id = ? AND course_id = ? AND exercise_id = ?';

  async function recordWrong(courseId: string, exerciseId: string, now: number): Promise<void> {
    const existing = await db.getFirst<MistakeRow>(
      `SELECT * FROM mistakes ${pkWhere}`,
      [userId, courseId, exerciseId],
    );
    if (!existing) {
      await db.run(
        `INSERT INTO mistakes (user_id, course_id, exercise_id, wrong_count, correct_streak, last_wrong_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, courseId, exerciseId, 1, 0, now, now],
      );
      return;
    }
    await db.run(
      `UPDATE mistakes SET wrong_count = wrong_count + 1, correct_streak = ?, last_wrong_at = ?, updated_at = ? ${pkWhere}`,
      [0, now, now, userId, courseId, exerciseId],
    );
  }

  async function recordCorrect(courseId: string, exerciseId: string, now: number): Promise<void> {
    const existing = await db.getFirst<MistakeRow>(
      `SELECT * FROM mistakes ${pkWhere}`,
      [userId, courseId, exerciseId],
    );
    if (!existing) return; // never answered wrong → nothing to clear
    if (existing.correct_streak + 1 >= MISTAKE_CLEAR_STREAK) {
      await db.run(`DELETE FROM mistakes ${pkWhere}`, [userId, courseId, exerciseId]);
      return;
    }
    await db.run(
      `UPDATE mistakes SET correct_streak = correct_streak + 1, updated_at = ? ${pkWhere}`,
      [now, userId, courseId, exerciseId],
    );
  }

  /**
   * Records one outcome batch (a finished lesson or practice session):
   * wrong ids bump the wrong count and reset the streak, correct ids bump the
   * streak (two in a row clear the row). All-or-nothing.
   */
  async function record(courseId: string, wrong: string[], correct: string[], now = Date.now()): Promise<void> {
    const wrongSet = new Set(wrong);
    await db.transaction(async () => {
      for (const id of wrong) await recordWrong(courseId, id, now);
      for (const id of correct) {
        if (!wrongSet.has(id)) await recordCorrect(courseId, id, now);
      }
    });
  }

  /** Most-wrong first, most recent on ties — feeds the 10-question practice session. */
  async function list(courseId: string, limit = 10): Promise<MistakeEntry[]> {
    const rows = await db.getAll<MistakeRow>(
      `SELECT * FROM mistakes WHERE user_id = ? AND course_id = ?
       ORDER BY wrong_count DESC, last_wrong_at DESC LIMIT ?`,
      [userId, courseId, limit],
    );
    return rows.map(fromRow);
  }

  async function count(courseId: string): Promise<number> {
    const r = await db.getFirst<{ n: number }>(
      'SELECT COUNT(*) AS n FROM mistakes WHERE user_id = ? AND course_id = ?',
      [userId, courseId],
    );
    return r?.n ?? 0;
  }

  return { record, list, count };
}

export type MistakesRepo = ReturnType<typeof createMistakesRepo>;
