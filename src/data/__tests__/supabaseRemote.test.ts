import { AuthRequiredError } from '../sync/syncService';
import {
  SERVER_COLUMNS,
  UPSERT_ON_CONFLICT,
  isAuthFailure,
  normaliseServerRow,
  supabaseRemote,
  toServerRow,
} from '../remote/supabaseRemote';

/** Minimal chainable PostgREST double that records every call. */
function fakeClient(handlers: { upsertError?: unknown; pullRows?: Record<string, unknown>[]; pullError?: unknown } = {}) {
  const calls = {
    upserts: [] as { table: string; rows: Record<string, unknown>[]; opts: unknown }[],
    pulls: [] as { table: string; select: string; eq: unknown[]; gt: unknown[] }[],
  };
  const client = {
    from(table: string) {
      return {
        upsert(rows: Record<string, unknown>[], opts: unknown) {
          calls.upserts.push({ table, rows, opts });
          return Promise.resolve({ data: null, error: handlers.upsertError ?? null });
        },
        select(select: string) {
          return {
            eq(col: string, val: unknown) {
              return {
                gt(col2: string, val2: unknown) {
                  calls.pulls.push({ table, select, eq: [col, val], gt: [col2, val2] });
                  return Promise.resolve({ data: handlers.pullRows ?? [], error: handlers.pullError ?? null });
                },
              };
            },
          };
        },
      };
    },
  };
  return { client: client as never, calls };
}

const ROW = { user_id: 'u1', lesson_id: 'l1', crowns: 2, completed_at: null, updated_at: '2026-10-25T10:00:00.000Z' };

describe('supabaseRemote.upsert', () => {
  it.each([
    ['user_stats', 'user_id'],
    ['user_progress', 'user_id,lesson_id'],
    ['srs_cards', 'user_id,vocab_id'],
    ['events', 'user_id,id'],
  ] as const)('upserts %s with onConflict=%s', async (table, onConflict) => {
    const { client, calls } = fakeClient();
    const remote = supabaseRemote(client)!;
    await remote.upsert(table, [ROW]);
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0]!.table).toBe(table);
    expect(calls.upserts[0]!.opts).toEqual({ onConflict });
  });

  it('chunks large batches into 500-row requests', async () => {
    const { client, calls } = fakeClient();
    const remote = supabaseRemote(client)!;
    const rows = Array.from({ length: 1200 }, (_, i) => ({ user_id: 'u1', id: `e${i}` }));
    await remote.upsert('events', rows);
    expect(calls.upserts.map((c) => c.rows.length)).toEqual([500, 500, 200]);
  });

  it('drops columns that are not in the server schema before sending', async () => {
    const { client, calls } = fakeClient();
    const remote = supabaseRemote(client)!;
    await remote.upsert('user_progress', [{ ...ROW, local_only: 'x', another: 1 }]);
    expect(Object.keys(calls.upserts[0]!.rows[0]!).sort()).toEqual(SERVER_COLUMNS.user_progress.slice().sort());
  });

  it('maps JWT/RLS failures to AuthRequiredError, other errors pass through', async () => {
    for (const authErr of [
      { code: 'PGRST301', message: 'JWT expired' },
      { code: 'PGRST303', message: 'JWT claims error' },
      { code: '42501', message: 'new row violates row-level security policy' },
      { code: 'PGRST000', message: 'Forbidden', status: 403 },
    ]) {
      const { client } = fakeClient({ upsertError: authErr });
      const remote = supabaseRemote(client)!;
      await expect(remote.upsert('user_stats', [ROW])).rejects.toBeInstanceOf(AuthRequiredError);
    }
    const boom = { code: '23505', message: 'duplicate key' };
    const { client } = fakeClient({ upsertError: boom });
    const remote = supabaseRemote(client)!;
    await expect(remote.upsert('user_stats', [ROW])).rejects.toEqual(boom);
  });
});

describe('supabaseRemote.pull', () => {
  it('selects own rows updated after the cursor', async () => {
    const { client, calls } = fakeClient({ pullRows: [ROW] });
    const remote = supabaseRemote(client)!;
    const since = '2026-10-24T00:00:00.000Z';
    const rows = await remote.pull('user_progress', 'u1', since);
    expect(calls.pulls[0]).toEqual({ table: 'user_progress', select: '*', eq: ['user_id', 'u1'], gt: ['updated_at', since] });
    expect(rows).toHaveLength(1);
  });

  it('normalises PostgREST timestamptz values (+00:00, no millis) to ISO strings', async () => {
    const pulled = {
      user_id: 'u1',
      xp: 10,
      last_active_date: '2026-10-25',
      hearts_updated_at: '2026-10-25 20:00:00+00',
      updated_at: '2026-10-25 20:00:00+00',
    };
    const { client } = fakeClient({ pullRows: [pulled] });
    const remote = supabaseRemote(client)!;
    const [row] = await remote.pull('user_stats', 'u1', '2026-01-01T00:00:00.000Z');
    expect(row!.updated_at).toBe('2026-10-25T20:00:00.000Z');
    expect(row!.hearts_updated_at).toBe('2026-10-25T20:00:00.000Z');
    expect(row!.last_active_date).toBe('2026-10-25'); // date stays YYYY-MM-DD
  });

  it('normalises null timestamptz fields to null and maps auth failures', async () => {
    const { client } = fakeClient({
      pullRows: [{ user_id: 'u1', lesson_id: 'l1', crowns: 1, completed_at: null, updated_at: '2026-10-25 10:00:00+00' }],
    });
    const remote = supabaseRemote(client)!;
    const [row] = await remote.pull('user_progress', 'u1', 'x');
    expect(row!.completed_at).toBeNull();

    const denied = fakeClient({ pullError: { code: 'PGRST302', message: 'JWT expired', status: 401 } });
    await expect(supabaseRemote(denied.client)!.pull('user_stats', 'u1', 'x')).rejects.toBeInstanceOf(AuthRequiredError);
  });
});

describe('normaliseServerRow / isAuthFailure / toServerRow', () => {
  it('normaliseServerRow only touches known timestamptz fields', () => {
    const row = {
      user_id: 'u1',
      vocab_id: 'v1',
      due_at: '2026-10-26 08:30:00.123456+00',
      last_reviewed_at: null,
      updated_at: '2026-10-25 12:00:00+00',
      payload: { xp: 5 },
      last_active_date: null,
    };
    const out = normaliseServerRow(row);
    expect(out.due_at).toBe('2026-10-26T08:30:00.123Z');
    expect(out.last_reviewed_at).toBeNull();
    expect(out.updated_at).toBe('2026-10-25T12:00:00.000Z');
    expect(out.payload).toEqual({ xp: 5 });
    expect(isAuthFailure(new Error('x'))).toBe(false);
    expect(isAuthFailure({ code: 'PGRST301' })).toBe(true);
    expect(isAuthFailure({ status: 403 })).toBe(true);
    expect(isAuthFailure({ code: '22P02' })).toBe(false);
  });

  it('toServerRow keeps every allowed column and drops the rest', () => {
    const full = Object.fromEntries(SERVER_COLUMNS.events.map((c) => [c, c === 'payload' ? {} : `v-${c}`]));
    const out = toServerRow('events', { ...full, evil: 1 });
    expect(Object.keys(out).sort()).toEqual(SERVER_COLUMNS.events.slice().sort());
    expect('evil' in out).toBe(false);
  });

  it('UPSERT_ON_CONFLICT targets match the SQL primary keys', () => {
    expect(UPSERT_ON_CONFLICT).toEqual({
      user_stats: 'user_id',
      user_progress: 'user_id,lesson_id',
      srs_cards: 'user_id,vocab_id',
      events: 'user_id,id',
    });
  });
});
