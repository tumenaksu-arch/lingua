import type { Database } from '@/data';

import { isoWeekId, weekStartMs, weeklyXpTotal } from '../social/week';

describe('isoWeekId (local time)', () => {
  it('maps a normal Monday and its days to the same week', () => {
    // Dates are constructed in the device's local time (as `new Date()` is at runtime).
    // 2026-10-19 is a Monday.
    expect(isoWeekId(new Date(2026, 9, 19, 8, 0, 0))).toBe('2026-W43');
    expect(isoWeekId(new Date(2026, 9, 25, 23, 59, 59))).toBe('2026-W43'); // Sunday
  });

  it('Monday 00:30 local belongs to the NEW week (regression: UTC saw Sunday evening)', () => {
    // Europe/Istanbul: Monday 00:30 local is Sunday 21:30 UTC — a UTC-based
    // computation reported the previous week here.
    expect(isoWeekId(new Date(2026, 9, 19, 0, 30, 0))).toBe('2026-W43');
    expect(weekStartMs(new Date(2026, 9, 19, 0, 30, 0))).toBe(new Date(2026, 9, 19).getTime());
  });

  it('handles the 2026/2027 year boundary (both days in 2026-W53)', () => {
    expect(isoWeekId(new Date(2026, 11, 31, 12, 0, 0))).toBe('2026-W53');
    expect(isoWeekId(new Date(2027, 0, 1, 0, 0, 0))).toBe('2026-W53');
  });

  it('a Sunday belongs to the ISO week that started the previous Monday', () => {
    // 2026-01-04 is a Sunday; its Monday is 2025-12-29, ISO week 1 of 2026.
    expect(isoWeekId(new Date(2026, 0, 4, 18, 30, 0))).toBe('2026-W01');
    // 2027-01-03 is a Sunday of 2026-W53.
    expect(isoWeekId(new Date(2027, 0, 3, 18, 30, 0))).toBe('2026-W53');
  });

  it('weekStartMs returns Monday 00:00 local', () => {
    // 2026-10-25 (Sunday) → Monday 2026-10-19.
    expect(weekStartMs(new Date(2026, 9, 25, 12, 0, 0))).toBe(new Date(2026, 9, 19).getTime());
    expect(weekStartMs(new Date(2026, 9, 19, 0, 0, 0))).toBe(new Date(2026, 9, 19).getTime());
  });
});

describe('weeklyXpTotal', () => {
  function fakeDb(rows: { user_id: string; type: string; payload: string; created_at: number }[]): Database {
    // Emulates the WHERE clause of the weeklyXpTotal query so boundary rows
    // (previous week, other event types) are filtered like the real SQLite would.
    return {
      exec: jest.fn(),
      run: jest.fn(),
      getFirst: jest.fn(),
      getAll: jest.fn(async (_sql: string, params?: unknown) => {
        const [userId, from] = (params ?? []) as [string, number];
        return rows.filter(
          (r) =>
            r.user_id === userId &&
            r.created_at > from &&
            ['lesson_completed', 'story_completed', 'quest_claimed'].includes(r.type),
        );
      }) as Database['getAll'],
      transaction: jest.fn(async (task) => task()),
    };
  }

  const monday = new Date(2026, 9, 19).getTime(); // LOCAL Monday 00:00 (week start of 2026-W43)
  const now = new Date(2026, 9, 22, 1, 0, 0).getTime(); // Thursday

  it('sums xp of lesson/story/quest events since the week start only', async () => {
    const db = fakeDb([
      { user_id: 'u1', type: 'lesson_completed', payload: JSON.stringify({ xp: 15 }), created_at: monday + 1000 },
      { user_id: 'u1', type: 'story_completed', payload: JSON.stringify({ xp: 12 }), created_at: now },
      { user_id: 'u1', type: 'quest_claimed', payload: JSON.stringify({ xp: 5 }), created_at: monday + 60_000 },
      // before the week: filtered out by the query
      { user_id: 'u1', type: 'lesson_completed', payload: JSON.stringify({ xp: 99 }), created_at: monday - 1 },
      // other event types: filtered out by the query
      { user_id: 'u1', type: 'review_completed', payload: JSON.stringify({ xp: 50 }), created_at: now },
      // malformed payload: skipped while summing
      { user_id: 'u1', type: 'quest_claimed', payload: '{oops', created_at: now },
    ]);
    await expect(weeklyXpTotal(db, 'u1', now)).resolves.toBe(32);
    // Assert the SQL itself (table, week-start filter, event-type filter), not
    // just the params — a wrong table/column or a type-mismatched comparison
    // in the real query must fail this test even though the JS mock emulates
    // the WHERE clause.
    expect(db.getAll).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.getAll as unknown as jest.Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM events');
    expect(sql).toContain('created_at >');
    expect(sql).toContain('type IN');
    expect(params).toEqual(['u1', monday - 1]);
  });

  it('returns 0 without a database', async () => {
    await expect(weeklyXpTotal(null, 'u1', now)).resolves.toBe(0);
  });
});
