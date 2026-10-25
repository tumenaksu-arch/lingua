import AsyncStorage from '@react-native-async-storage/async-storage';

import { FakeDb } from './fakeDb';
import { DEFAULT_STATS, listOutbox } from '..';
import { createProgressRepo } from '../local/repos/progressRepo';
import { createSrsRepo } from '../local/repos/srsRepo';
import { createStatsRepo } from '../local/repos/statsRepo';
import { clearLegacyAccount, detectLegacyAccount } from '../remote/legacy';
import { migrateLegacyRows } from '../sync/legacyMigration';

const LEGACY = 'firebase-uid-1';
const NEW = 'supa-uid-1';
const T0 = Date.parse('2026-10-19T10:00:00Z');

async function seedLegacyData(db: FakeDb) {
  await createStatsRepo(db, LEGACY).save(
    { ...DEFAULT_STATS, xp: 120, streak: 3, lastActiveDate: '2026-10-18' },
    T0,
  );
  await createProgressRepo(db, LEGACY).completeLesson('l1', T0);
  await createProgressRepo(db, LEGACY).logEvent('evt-1', 'lesson_completed', { xp: 20 }, T0);
  await createSrsRepo(db, LEGACY).saveMany(
    [{ vocabId: 'v1', ease: 2.5, intervalDays: 4, reps: 2, dueAt: T0 + 4 * 86_400_000 }],
    T0,
  );
}

const outboxPayloads = async (db: FakeDb) =>
  (await listOutbox(db)).map((r) => ({ tbl: r.tbl, row: JSON.parse(r.payload) as Record<string, unknown> }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('detectLegacyAccount / clearLegacyAccount', () => {
  it('finds the persisted Firebase user (uid + e-mail) under firebase:authUser:*', async () => {
    expect(await detectLegacyAccount()).toBeNull();
    await AsyncStorage.setItem('firebase:authUser:abc:def', JSON.stringify({ uid: LEGACY, email: 'ali@example.com' }));
    await AsyncStorage.setItem('lovevox-auth', 'unrelated');
    expect(await detectLegacyAccount()).toEqual({ uid: LEGACY, email: 'ali@example.com' });
  });

  it('ignores unparseable values and clears all legacy keys', async () => {
    await AsyncStorage.setItem('firebase:authUser:abc', 'not-json');
    await AsyncStorage.setItem('firebase:authUser:def', JSON.stringify({ uid: LEGACY, email: null }));
    expect(await detectLegacyAccount()).toEqual({ uid: LEGACY, email: null });
    await clearLegacyAccount();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(await detectLegacyAccount()).toBeNull();
  });
});

describe('migrateLegacyRows', () => {
  it('re-keys every table to the new uid and enqueues a full push', async () => {
    const db = new FakeDb();
    await seedLegacyData(db);

    const migrated = await migrateLegacyRows(db, LEGACY, NEW, T0 + 1000);

    expect(migrated).toBe(true);
    for (const table of ['user_stats', 'user_progress', 'srs_cards', 'events']) {
      expect(db.tables[table]!.filter((r) => r.user_id === LEGACY)).toHaveLength(0);
    }
    expect(db.tables.user_stats!.find((r) => r.user_id === NEW)).toMatchObject({ xp: 120, streak: 3 });
    expect(db.tables.user_progress!.find((r) => r.user_id === NEW)).toMatchObject({ lesson_id: 'l1', crowns: 1 });
    expect(db.tables.srs_cards!.find((r) => r.user_id === NEW)).toMatchObject({ vocab_id: 'v1', reps: 2 });
    expect(db.tables.events!.find((r) => r.user_id === NEW)).toMatchObject({ id: 'evt-1', type: 'lesson_completed' });

    // Every surviving row was enqueued for the full push, under the NEW uid. Pending
    // outbox writes of the legacy user were re-keyed too, so each row appears twice
    // (the re-keyed original + the migration's full-push entry) — pushOutbox dedupes
    // by primary key per run.
    const payloads = await outboxPayloads(db);
    const byTable = (tbl: string) => payloads.filter((p) => p.tbl === tbl).map((p) => p.row);
    expect(byTable('user_stats')).toHaveLength(2);
    expect(byTable('user_stats')).toEqual([
      expect.objectContaining({ user_id: NEW, xp: 120, updated_at: new Date(T0).toISOString() }),
      expect.objectContaining({ user_id: NEW, xp: 120, updated_at: new Date(T0).toISOString() }),
    ]);
    expect(byTable('user_progress')).toHaveLength(2);
    expect(byTable('srs_cards')).toHaveLength(2);
    expect(byTable('events')).toEqual([
      expect.objectContaining({ user_id: NEW, id: 'evt-1', payload: { xp: 20 }, created_at: new Date(T0).toISOString() }),
      expect.objectContaining({ user_id: NEW, id: 'evt-1', payload: { xp: 20 }, created_at: new Date(T0).toISOString() }),
    ]);
    expect(payloads.every((p) => p.row.user_id === NEW)).toBe(true);
  });

  it('is idempotent: a second run does nothing and duplicates nothing', async () => {
    const db = new FakeDb();
    await seedLegacyData(db);
    await migrateLegacyRows(db, LEGACY, NEW, T0 + 1000);
    const outboxAfterFirst = await listOutbox(db);

    const migratedAgain = await migrateLegacyRows(db, LEGACY, NEW, T0 + 2000);

    expect(migratedAgain).toBe(false);
    expect(await listOutbox(db)).toHaveLength(outboxAfterFirst.length);
    expect(db.tables.user_stats!.filter((r) => r.user_id === NEW)).toHaveLength(1);
    expect(db.tables.events!.filter((r) => r.user_id === NEW)).toHaveLength(1);
  });

  it('keeps the row that wins per the sync conflict rules (last-writer-wins / more reps)', async () => {
    const db = new FakeDb();
    await seedLegacyData(db);
    // The new account already has local rows (e.g. pulled from the server): newer stats,
    // older progress, and an srs card with fewer reps.
    await createStatsRepo(db, NEW).save({ ...DEFAULT_STATS, xp: 999 }, T0 + 5000);
    await createProgressRepo(db, NEW).adopt({ lessonId: 'l1', crowns: 2, completedAt: T0 - 100 }, T0 - 100);
    await createSrsRepo(db, NEW).saveMany(
      [{ vocabId: 'v1', ease: 2.5, intervalDays: 1, reps: 1, dueAt: T0 }],
      T0 + 5000,
    );
    const outboxBefore = (await listOutbox(db)).length;

    await migrateLegacyRows(db, LEGACY, NEW, T0 + 9000);

    expect(db.tables.user_stats!.find((r) => r.user_id === NEW)).toMatchObject({ xp: 999 }); // newer wins
    expect(db.tables.user_progress!.find((r) => r.user_id === NEW && r.lesson_id === 'l1')).toMatchObject({
      crowns: 1, // legacy row is newer → it wins
    });
    expect(db.tables.srs_cards!.find((r) => r.user_id === NEW && r.vocab_id === 'v1')).toMatchObject({ reps: 2 });
    // No legacy rows left anywhere.
    for (const table of ['user_stats', 'user_progress', 'srs_cards', 'events']) {
      expect(db.tables[table]!.filter((r) => r.user_id === LEGACY)).toHaveLength(0);
    }
    // Only the winning legacy rows (progress + srs + events) got a full-push entry;
    // the legacy stats copy lost to the newer account row.
    const payloads = await outboxPayloads(db);
    expect(payloads.length).toBeGreaterThan(outboxBefore);
    expect(
      payloads.some(
        (p) => p.tbl === 'user_progress' && p.row.crowns === 1 && p.row.updated_at === new Date(T0).toISOString(),
      ),
    ).toBe(true);
    expect(
      payloads.some((p) => p.tbl === 'srs_cards' && p.row.reps === 2 && p.row.updated_at === new Date(T0).toISOString()),
    ).toBe(true);
    expect(payloads.filter((p) => p.tbl === 'events').every((p) => p.row.user_id === NEW)).toBe(true);
  });

  it('does nothing when the legacy uid equals the new uid or has no rows', async () => {
    const db = new FakeDb();
    expect(await migrateLegacyRows(db, NEW, NEW)).toBe(false);
    expect(await migrateLegacyRows(db, 'ghost-uid', NEW)).toBe(false);
    expect(await listOutbox(db)).toHaveLength(0);
  });
});
