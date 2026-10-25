import * as fs from 'fs';
import * as path from 'path';

import { FakeDb } from './fakeDb';
import { cardToServerRow, createProgressRepo, createStatsRepo, statsToServerRow } from '..';
import { SERVER_COLUMNS, toServerRow } from '../remote/supabaseRemote';

const U = 'user-1';
const T0 = Date.parse('2026-10-19T10:00:00Z');

/** Column lists straight from supabase/migrations/0001_lovevox.sql — the source of truth. */
function columnsFromMigration(table: string): string[] {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '0001_lovevox.sql'),
    'utf8',
  );
  const m = sql.match(new RegExp(`create table public\\.${table} \\(([^;]+)\\);`, 's'));
  if (!m) throw new Error(`table ${table} not found in migration`);
  return m[1]!
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^(primary key|check|create )/i.test(line))
    .map((line) => line.split(/\s+/)[0]!)
    .filter(Boolean);
}

describe('server column contract', () => {
  it.each(['user_stats', 'user_progress', 'srs_cards', 'events'] as const)(
    'SERVER_COLUMNS[%s] matches the migration exactly',
    (table) => {
      expect(SERVER_COLUMNS[table].slice().sort()).toEqual(columnsFromMigration(table).sort());
    },
  );

  it('every outbox row shape produced by the repos uses only migration columns', async () => {
    const db = new FakeDb();
    const statsRow = statsToServerRow(U, {
      xp: 5, streak: 1, lastActiveDate: '2026-10-19', streakFreezes: 0,
      hearts: 5, heartsUpdatedAt: T0, dailyGoalXp: 20, xpToday: 5,
    }, T0);
    const progressRow = { user_id: U, lesson_id: 'l1', crowns: 1, completed_at: null, updated_at: new Date(T0).toISOString() };
    const srsRow = cardToServerRow(U, { vocabId: 'v1', ease: 2.5, intervalDays: 1, reps: 1, dueAt: T0 }, T0);

    await createStatsRepo(db, U).save({
      xp: 5, streak: 1, lastActiveDate: '2026-10-19', streakFreezes: 0,
      hearts: 5, heartsUpdatedAt: T0, dailyGoalXp: 20, xpToday: 5,
    }, T0);
    await createProgressRepo(db, U).logEvent('evt-1', 'lesson_completed', { xp: 5 }, T0);
    const eventPayload = JSON.parse(db.tables.outbox!.find((r) => r.tbl === 'events')!.payload as string) as Record<string, unknown>;

    const rows: Record<string, Record<string, unknown>> = {
      user_stats: statsRow,
      user_progress: progressRow,
      srs_cards: srsRow,
      events: eventPayload,
    };
    for (const [table, row] of Object.entries(rows)) {
      // After the toServerRow whitelist nothing foreign may remain...
      const mapped = toServerRow(table as keyof typeof SERVER_COLUMNS, row);
      expect(Object.keys(mapped).sort()).toEqual(Object.keys(row).sort());
      // ...and every key must be a real column of the migration.
      expect(Object.keys(row).every((k) => SERVER_COLUMNS[table as keyof typeof SERVER_COLUMNS].includes(k))).toBe(true);
    }
    expect(eventPayload.payload).toEqual({ xp: 5 }); // jsonb object, sent as an object
  });
});
