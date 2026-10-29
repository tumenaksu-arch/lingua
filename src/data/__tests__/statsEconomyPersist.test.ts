import { DEFAULT_STATS, createStatsRepo } from '@/data';

import { FakeDb } from './fakeDb';

/**
 * Regression (e2e 2026-10-29): gems / Çift XP / chest counter / lost streak were
 * written only by the very first INSERT — every later save hit ON CONFLICT, whose
 * SET list deliberately skips them for the sync pull — so a reload reset them.
 */
describe('statsRepo economy fields', () => {
  it('a user save persists gems, xp boost, chest counter and lost streak (survives a reload)', async () => {
    const db = new FakeDb();
    const repo = createStatsRepo(db, 'u1');
    await repo.save({ ...DEFAULT_STATS, gems: 50 }, 1);
    await repo.save({ ...DEFAULT_STATS, gems: 10, xpBoostUntil: 999, lessonsSinceChest: 2, lostStreak: { value: 7, lostOn: '2026-10-28' } }, 2);
    const reloaded = await createStatsRepo(db, 'u1').get();
    expect(reloaded.gems).toBe(10);
    expect(reloaded.xpBoostUntil).toBe(999);
    expect(reloaded.lessonsSinceChest).toBe(2);
    expect(reloaded.lostStreak).toEqual({ value: 7, lostOn: '2026-10-28' });
  });

  it('a sync pull (writeLocal) never overwrites the device-local economy fields', async () => {
    const db = new FakeDb();
    const repo = createStatsRepo(db, 'u1');
    await repo.save({ ...DEFAULT_STATS, gems: 120, lessonsSinceChest: 1 }, 1);
    await repo.writeLocal({ ...DEFAULT_STATS, xp: 500 }, 5); // server row: no economy fields
    const s = await repo.get();
    expect(s.xp).toBe(500);
    expect(s.gems).toBe(120);
    expect(s.lessonsSinceChest).toBe(1);
  });
});
