import type { SupabaseClient } from '@supabase/supabase-js';

import type { OutboxTable } from '../local/outbox';
import { AuthRequiredError, type RemoteApi } from '../sync/syncService';
import { getSupabase } from './supabase';

/**
 * PostgREST remote for the self-hosted Supabase (see supabase/migrations/0001_lovevox.sql).
 * Table names match the local outbox tables 1:1; every row carries `user_id`, and RLS
 * restricts access to the session's own uid. Rows are the snake_case server rows produced
 * by the repos — `toServerRow` whitelists the columns so a stray local field can never
 * make PostgREST reject the whole batch with "column not found".
 */

/** Upsert conflict target per table (the SQL primary keys). */
export const UPSERT_ON_CONFLICT: Record<OutboxTable, string> = {
  user_stats: 'user_id',
  user_progress: 'user_id,lesson_id',
  srs_cards: 'user_id,vocab_id',
  events: 'user_id,id',
};

/** Columns of each server table, exactly as in supabase/migrations/0001_lovevox.sql. */
export const SERVER_COLUMNS: Record<OutboxTable, readonly string[]> = {
  user_stats: [
    'user_id', 'xp', 'streak', 'last_active_date', 'streak_freezes',
    'hearts', 'hearts_updated_at', 'daily_goal_xp', 'xp_today', 'updated_at',
  ],
  user_progress: ['user_id', 'lesson_id', 'crowns', 'completed_at', 'updated_at'],
  srs_cards: ['user_id', 'vocab_id', 'ease', 'interval_days', 'reps', 'due_at', 'last_reviewed_at', 'updated_at'],
  events: ['user_id', 'id', 'type', 'payload', 'created_at', 'updated_at'],
};

/** Drops any key that is not a column of `table` (PostgREST rejects unknown columns). */
export function toServerRow(table: OutboxTable, row: Record<string, unknown>): Record<string, unknown> {
  const allowed = SERVER_COLUMNS[table];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in row) out[key] = row[key];
    else if (table === 'events' && key === 'payload') out[key] = row[key] ?? {};
  }
  return out;
}

/** timestamptz fields PostgREST returns without milliseconds ('+00:00' suffix). */
const TIMESTAMPTZ_FIELDS = ['updated_at', 'completed_at', 'due_at', 'last_reviewed_at', 'hearts_updated_at', 'created_at'] as const;

/**
 * Normalises every timestamptz field of a pulled row to `new Date(v).toISOString()`
 * so lexicographic and Date.parse comparisons against locally generated ISO strings
 * behave. `last_active_date` stays a plain 'YYYY-MM-DD' date string.
 */
export function normaliseServerRow(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const key of TIMESTAMPTZ_FIELDS) {
    const v = out[key];
    if (typeof v === 'string' && v.length) out[key] = new Date(v).toISOString();
  }
  return out;
}

/** JWT/auth failures from PostgREST → AuthRequiredError so sync stops and re-auths. */
export function isAuthFailure(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const code = 'code' in e ? String((e as { code: unknown }).code) : '';
  const status = 'status' in e ? Number((e as { status: unknown }).status) : NaN;
  return (
    code === 'PGRST301' || // JWT invalid/expired
    code === 'PGRST303' || // JWT claims error
    code === '42501' || // row-level security violation
    status === 401 ||
    status === 403
  );
}

const CHUNK = 500;

export function supabaseRemote(client?: SupabaseClient | null): RemoteApi | null {
  const sb = client === undefined ? getSupabase() : client;
  if (!sb) return null;
  return {
    async upsert(table, rows) {
      const payloads = rows.map((r) => toServerRow(table, r));
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const { error } = await sb
          .from(table)
          .upsert(payloads.slice(i, i + CHUNK) as Record<string, unknown>[], {
            onConflict: UPSERT_ON_CONFLICT[table],
          });
        if (error) {
          if (isAuthFailure(error)) throw new AuthRequiredError(error.message);
          throw error;
        }
      }
    },
    async pull(table, userId, sinceIso) {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', sinceIso);
      if (error) {
        if (isAuthFailure(error)) throw new AuthRequiredError(error.message);
        throw error;
      }
      return (data ?? []).map((r) => normaliseServerRow(r as Record<string, unknown>));
    },
  };
}
