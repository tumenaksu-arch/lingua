import type { Database } from '@/data';

import { isoWeekId, weekStartMs, weeklyXpTotal } from '../social/week';

describe('isoWeekId', () => {
  it('maps a normal Monday and its days to the same week', () => {
    // 2026-10-19 is a Monday.
    expect(isoWeekId(new Date('2026-10-19T08:00:00Z'))).toBe('2026-W43');
    expect(isoWeekId(new Date('2026-10-25T23:59:59Z'))).toBe('2026-W43'); // Sunday
  });

  it('handles the 2026/2027 year boundary (both days in 2026-W53)', () => {
    expect(isoWeekId(new Date('2026-12-31T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeekId(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
  });

  it('a Sunday belongs to the ISO week that started the previous Monday', () => {
    // 2026-01-04 is a Sunday; its Monday is 2025-12-29, ISO week 1 of 2026.
    expect(isoWeekId(new Date('2026-01-04T18:30:00Z'))).toBe('2026-W01');
    // 2027-01-03 is a Sunday of 2026-W53.
    expect(isoWeekId(new Date('2027-01-03T18:30:00Z'))).toBe('2026-W53');
  });

  it('weekStartMs returns Monday 00:00 UTC', () => {
    // 2026-10-25 (Sunday) → Monday 2026-10-19.
    expect(weekStartMs(new Date('2026-10-25T12:00:00Z'))).toBe(Date.UTC(2026, 9, 19));
    expect(weekStartMs(new Date('2026-10-19T00:00:00Z'))).toBe(Date.UTC(2026, 9, 19));
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

  const monday = Date.UTC(2026, 9, 19); // week start of 2026-W43
  const now = monday + 3 * 86_400_000 + 3600_000; // Thursday

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
    expect(db.getAll).toHaveBeenCalledWith(expect.stringContaining('quest_claimed'), ['u1', monday - 1]);
  });

  it('returns 0 without a database', async () => {
    await expect(weeklyXpTotal(null, 'u1', now)).resolves.toBe(0);
  });
});
