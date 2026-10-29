export type { Database, SqlParams, SqlValue } from './local/database';
export { DB_NAME, MIGRATIONS, getDb, migrate, setDbForTesting, wrapSqlite } from './local/db';
export * from './local/outbox';
export { DEFAULT_STATS, LOCAL_USER_ID, createStatsRepo, statsToServerRow, type StatsRepo } from './local/repos/statsRepo';
export { cardToServerRow, createSrsRepo, type SrsRepo } from './local/repos/srsRepo';
export { createProgressRepo, progressToServerRow, type LessonProgress, type ProgressRepo } from './local/repos/progressRepo';
export { createMistakesRepo, type MistakeEntry, type MistakesRepo } from './local/repos/mistakesRepo';
export { createContentRepo, type ContentRepo } from './local/repos/contentRepo';
export { getSupabase, isSupabaseConfigured, resetSupabaseForTests, supabaseConfig } from './remote/supabase';
export {
  SERVER_COLUMNS,
  UPSERT_ON_CONFLICT,
  isAuthFailure,
  normaliseServerRow,
  supabaseRemote,
  toServerRow,
} from './remote/supabaseRemote';
export { LEGACY_AUTH_KEY_PREFIX, clearLegacyAccount, detectLegacyAccount, detectLegacyAccounts, type LegacyAccount } from './remote/legacy';
export * from './remote/auth';
export * from './sync/syncService';
export { migrateLegacyRows } from './sync/legacyMigration';
