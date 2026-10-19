/**
 * Minimal DB abstraction so repos and sync can be unit-tested with an
 * in-memory fake. The production implementation wraps expo-sqlite.
 */
export type SqlValue = string | number | null;
export type SqlParams = SqlValue[];

export interface Database {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<void>;
  getFirst<T>(sql: string, params?: SqlParams): Promise<T | null>;
  getAll<T>(sql: string, params?: SqlParams): Promise<T[]>;
  /** Runs `task` inside a single transaction; rolls back if it throws. */
  transaction(task: () => Promise<void>): Promise<void>;
}
