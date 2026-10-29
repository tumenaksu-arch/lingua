import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Database, SqlParams } from './database';

export const DB_NAME = 'lingua.db';

/**
 * Local schema mirrors the Firestore documents (see src/data/remote/firestoreRemote.ts) plus
 * `outbox` (pending writes) and `sync_meta` (cursors). Each entry bumps
 * PRAGMA user_version; append new migrations, never edit old ones.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY, from_lang TEXT NOT NULL, to_lang TEXT NOT NULL, title TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY, course_id TEXT NOT NULL, ord INTEGER NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, ord INTEGER NOT NULL, vocab_ids TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, ord INTEGER NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vocab (
    id TEXT PRIMARY KEY, course_id TEXT NOT NULL, term TEXT NOT NULL, translation TEXT NOT NULL, example TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id, ord);
  CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id, ord);
  CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id, ord);
  CREATE INDEX IF NOT EXISTS idx_vocab_course ON vocab(course_id);

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT, streak_freezes INTEGER NOT NULL DEFAULT 0,
    hearts INTEGER NOT NULL DEFAULT 5, hearts_updated_at INTEGER NOT NULL DEFAULT 0,
    daily_goal_xp INTEGER NOT NULL DEFAULT 20, xp_today INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
    crowns INTEGER NOT NULL DEFAULT 0, completed_at INTEGER,
    updated_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS srs_cards (
    user_id TEXT NOT NULL, vocab_id TEXT NOT NULL,
    ease REAL NOT NULL DEFAULT 2.5, interval_days REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0, due_at INTEGER NOT NULL, last_reviewed_at INTEGER,
    updated_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, vocab_id)
  );
  CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(user_id, due_at);
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tbl TEXT NOT NULL, op TEXT NOT NULL, payload TEXT NOT NULL,
    created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // Job 1A (Practice Hub "Hatalarım"): exercises answered wrong. Device-local
  // only — never enqueued to the outbox. Cleared after 2 consecutive correct
  // answers (see repos/mistakesRepo.ts).
  `
  CREATE TABLE IF NOT EXISTS mistakes (
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    last_wrong_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, course_id, exercise_id)
  );
  CREATE INDEX IF NOT EXISTS idx_mistakes_list ON mistakes(user_id, course_id, wrong_count DESC, last_wrong_at DESC);
  `,
];

/** Applies pending migrations using PRAGMA user_version. */
export async function migrate(db: Database): Promise<void> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
    });
    await db.exec(`PRAGMA user_version = ${v + 1}`);
  }
}

/** Adapts an expo-sqlite SQLiteDatabase to our Database interface. */
export function wrapSqlite(sqlite: SQLiteDatabase): Database {
  return {
    exec: (sql) => sqlite.execAsync(sql),
    run: async (sql, params: SqlParams = []) => {
      await sqlite.runAsync(sql, params);
    },
    getFirst: (sql, params: SqlParams = []) => sqlite.getFirstAsync(sql, params),
    getAll: (sql, params: SqlParams = []) => sqlite.getAllAsync(sql, params),
    transaction: (task) => sqlite.withTransactionAsync(task),
  };
}

let dbPromise: Promise<Database> | null = null;

/** Opens (once) and migrates the app database. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const sqlite = await openDatabaseAsync(DB_NAME);
      await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const db = wrapSqlite(sqlite);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test seam: replace the singleton (e.g. with an in-memory fake). */
export function setDbForTesting(db: Database | null): void {
  dbPromise = db ? Promise.resolve(db) : null;
}
