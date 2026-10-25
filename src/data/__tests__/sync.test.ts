import { FakeDb } from './fakeDb';
import { createStatsRepo, DEFAULT_STATS, LOCAL_USER_ID } from '../local/repos/statsRepo';
import { createSrsRepo } from '../local/repos/srsRepo';
import { createProgressRepo } from '../local/repos/progressRepo';
import { listOutbox, getMeta } from '../local/outbox';
import { AuthRequiredError, pullChanges, pushOutbox, syncNow, type RemoteApi } from '../sync/syncService';

const U = 'user-1';
const T0 = Date.parse('2026-10-19T10:00:00Z');
const iso = (t: number) => new Date(t).toISOString();

function fakeRemote(pulled: Partial<Record<string, Record<string, any>[]>> = {}) {
  const calls: { table: string; rows: Record<string, unknown>[] }[] = [];
  let failTimes = 0;
  const remote: RemoteApi & { calls: typeof calls; failNext(n: number): void } = {
    calls,
    failNext: (n) => (failTimes = n),
    async upsert(table, rows) {
      if (failTimes > 0) {
        failTimes--;
        throw new Error('network');
      }
      calls.push({ table, rows });
    },
    async pull(table) {
      return pulled[table] ?? [];
    },
  };
  return remote;
}

const noSleep = async () => {};

describe('outbox', () => {
  test('a user write appends exactly one outbox row inside the same transaction', async () => {
    const db = new FakeDb();
    const stats = createStatsRepo(db, U);
    await stats.save({ ...DEFAULT_STATS, xp: 15 }, T0);
    const rows = await listOutbox(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].tbl).toBe('user_stats');
    expect(JSON.parse(rows[0].payload)).toMatchObject({ user_id: U, xp: 15, updated_at: iso(T0) });
    expect((await stats.get()).xp).toBe(15);
  });

  test('writeLocal (sync pull path) does not enqueue', async () => {
    const db = new FakeDb();
    await createStatsRepo(db, U).writeLocal({ ...DEFAULT_STATS, xp: 1 }, T0);
    expect(await listOutbox(db)).toHaveLength(0);
  });

  test('failed transaction rolls back both the row and the outbox entry', async () => {
    const db = new FakeDb();
    const srs = createSrsRepo(db, U);
    const run = db.run.bind(db);
    let n = 0;
    db.run = async (sql, p) => {
      if (/INSERT INTO outbox/.test(sql) && ++n === 2) throw new Error('boom');
      return run(sql, p);
    };
    const card = (id: string) => ({ vocabId: id, ease: 2.5, intervalDays: 1, reps: 1, dueAt: T0 });
    await expect(srs.saveMany([card('a'), card('b')], T0)).rejects.toThrow('boom');
    expect(await srs.all()).toHaveLength(0);
    expect(await listOutbox(db)).toHaveLength(0);
  });
});

describe('pushOutbox', () => {
  test('pushes grouped rows, keeps only the newest payload per key, and clears the outbox', async () => {
    const db = new FakeDb();
    const remote = fakeRemote();
    const stats = createStatsRepo(db, U);
    await stats.save({ ...DEFAULT_STATS, xp: 10 }, T0);
    await stats.save({ ...DEFAULT_STATS, xp: 20 }, T0 + 1000);
    await createProgressRepo(db, U).completeLesson('l1', T0 + 2000);

    const res = await pushOutbox({ db, remote, userId: U, sleep: noSleep });

    expect(res).toEqual({ pushed: 3, failed: 0 });
    expect(remote.calls.map((c) => c.table).sort()).toEqual(['user_progress', 'user_stats']);
    const statsCall = remote.calls.find((c) => c.table === 'user_stats')!;
    expect(statsCall.rows).toHaveLength(1);
    expect(statsCall.rows[0]).toMatchObject({ xp: 20 });
    expect(await listOutbox(db)).toHaveLength(0);
  });

  test('retries transient failures with backoff, then bumps attempts and keeps rows', async () => {
    const db = new FakeDb();
    const remote = fakeRemote();
    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 1 }, T0);
    const sleeps: number[] = [];
    remote.failNext(3);
    const res = await pushOutbox({ db, remote, userId: U, sleep: async (ms) => void sleeps.push(ms) });
    expect(res).toEqual({ pushed: 0, failed: 1 });
    expect(sleeps).toEqual([200, 400]);
    const rows = await listOutbox(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(1);

    // next run succeeds after one failure
    remote.failNext(1);
    const res2 = await pushOutbox({ db, remote, userId: U, sleep: noSleep });
    expect(res2).toEqual({ pushed: 1, failed: 0 });
    expect(await listOutbox(db)).toHaveLength(0);
  });

  test('stops immediately on auth error and leaves the outbox intact', async () => {
    const db = new FakeDb();
    const remote = fakeRemote();
    remote.upsert = async () => {
      throw new AuthRequiredError('jwt expired');
    };
    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 1 }, T0);
    await expect(pushOutbox({ db, remote, userId: U, sleep: noSleep })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(await listOutbox(db)).toHaveLength(1);
  });
});

describe('pullChanges conflict resolution', () => {
  test('user_stats: remote wins only when its updated_at is newer (last-writer-wins)', async () => {
    const db = new FakeDb();
    const stats = createStatsRepo(db, U);
    await stats.writeLocal({ ...DEFAULT_STATS, xp: 50 }, T0 + 5000);
    const remote = fakeRemote({
      user_stats: [
        { user_id: U, xp: 40, streak: 0, last_active_date: null, streak_freezes: 0, hearts: 5,
          hearts_updated_at: iso(T0), daily_goal_xp: 20, xp_today: 0, updated_at: iso(T0 + 1000) },
      ],
    });
    expect((await pullChanges({ db, remote, userId: U }, iso(0))).applied).toBe(0);
    expect((await stats.get()).xp).toBe(50);

    const newer = fakeRemote({ user_stats: [{ ...(await remote.pull('user_stats', U, ''))[0], xp: 99, updated_at: iso(T0 + 9000) }] });
    expect((await pullChanges({ db, remote: newer, userId: U }, iso(0))).applied).toBe(1);
    expect((await stats.get()).xp).toBe(99);
    expect(await listOutbox(db)).toHaveLength(0); // pulled rows never re-enter the outbox
  });

  test('srs_cards: the card with more reps wins regardless of timestamp; ties use updated_at', async () => {
    const db = new FakeDb();
    const srs = createSrsRepo(db, U);
    await srs.writeLocal({ vocabId: 'v1', ease: 2.5, intervalDays: 6, reps: 3, dueAt: T0 }, T0 + 9000);
    await srs.writeLocal({ vocabId: 'v2', ease: 2.5, intervalDays: 1, reps: 1, dueAt: T0 }, T0 + 1000);
    const remote = fakeRemote({
      srs_cards: [
        // older timestamp but fewer reps → local keeps
        { user_id: U, vocab_id: 'v1', ease: 2.3, interval_days: 1, reps: 2, due_at: iso(T0), last_reviewed_at: null, updated_at: iso(T0 + 1000) },
        // same reps, newer timestamp → remote wins
        { user_id: U, vocab_id: 'v2', ease: 2.6, interval_days: 2, reps: 1, due_at: iso(T0 + 100), last_reviewed_at: iso(T0), updated_at: iso(T0 + 2000) },
        // unknown locally → inserted
        { user_id: U, vocab_id: 'v3', ease: 2.5, interval_days: 1, reps: 1, due_at: iso(T0), last_reviewed_at: null, updated_at: iso(T0) },
      ],
    });
    const { applied } = await pullChanges({ db, remote, userId: U }, iso(0));
    expect(applied).toBe(2);
    const byId = Object.fromEntries((await srs.all()).map((c) => [c.vocabId, c]));
    expect(byId.v1.reps).toBe(3);
    expect(byId.v2).toMatchObject({ ease: 2.6, intervalDays: 2, lastReviewedAt: T0 });
    expect(byId.v3.reps).toBe(1);
  });

  test('user_progress: newer remote row replaces local', async () => {
    const db = new FakeDb();
    const progress = createProgressRepo(db, U);
    await progress.writeLocal({ lessonId: 'l1', crowns: 1, completedAt: T0 }, T0);
    const remote = fakeRemote({
      user_progress: [{ user_id: U, lesson_id: 'l1', crowns: 3, completed_at: iso(T0 + 500), updated_at: iso(T0 + 500) }],
    });
    await pullChanges({ db, remote, userId: U }, iso(0));
    expect(await progress.get('l1')).toMatchObject({ crowns: 3, completedAt: T0 + 500 });
  });
});

describe('syncNow', () => {
  test('push then pull, advances the cursor only on full success, and dedupes concurrent calls', async () => {
    const db = new FakeDb();
    const remote = fakeRemote();
    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 3 }, T0);
    const now = () => T0 + 10_000;
    const [a, b] = await Promise.all([
      syncNow({ db, remote, userId: U, now, sleep: noSleep }),
      syncNow({ db, remote, userId: U, now, sleep: noSleep }),
    ]);
    expect(a).toBe(b);
    expect(a).toEqual({ pushed: 1, failed: 0, applied: 0 });
    expect(remote.calls).toHaveLength(1);
    expect(await getMeta(db, 'last_sync_at')).toBe(iso(T0 + 10_000));

    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 4 }, T0 + 11_000);
    remote.failNext(3);
    const r = await syncNow({ db, remote, userId: U, now: () => T0 + 20_000, sleep: noSleep });
    expect(r.failed).toBe(1);
    expect(await getMeta(db, 'last_sync_at')).toBe(iso(T0 + 10_000)); // cursor unchanged
  });
});

describe('guest (local) rows and the signed-in account', () => {
  /** Mirrors firestore.rules: a write is denied unless every row's user_id is the signed-in uid. */
  function rulesRemote(uid: string) {
    const pushed: Record<string, unknown>[] = [];
    const remote: RemoteApi & { pushed: typeof pushed } = {
      pushed,
      async upsert(_table, rows) {
        if (rows.some((r) => r.user_id !== uid)) throw new AuthRequiredError('Missing or insufficient permissions.');
        pushed.push(...rows);
      },
      async pull() {
        return [];
      },
    };
    return remote;
  }

  test('guest play before sign-in does not break the first sync of the new account', async () => {
    const db = new FakeDb();
    // Guest plays one lesson on this device (writes go through the normal repos).
    await createStatsRepo(db, LOCAL_USER_ID).save({ ...DEFAULT_STATS, xp: 10 }, T0);
    await createProgressRepo(db, LOCAL_USER_ID).completeLesson('l1', T0);
    // Signs in: adoptGuestProgress copies the guest state into the account via the same repos.
    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 10 }, T0 + 1000);
    await createProgressRepo(db, U).adopt({ lessonId: 'l1', crowns: 1, completedAt: T0 }, T0 + 1000);

    const remote = rulesRemote(U);
    const res = await syncNow({ db, remote, userId: U, now: () => T0 + 2000, sleep: noSleep });

    expect(res.failed).toBe(0);
    expect(remote.pushed.length).toBeGreaterThan(0);
    expect(remote.pushed.every((r) => r.user_id === U)).toBe(true);
    expect(await getMeta(db, 'last_sync_at')).toBe(iso(T0 + 2000));
    // Nothing is left that would make the next sync fail again.
    expect((await listOutbox(db)).filter((r) => JSON.parse(r.payload).user_id === LOCAL_USER_ID)).toHaveLength(0);
  });

  test("rows of another signed-in account stay queued for that account and are not pushed", async () => {
    const db = new FakeDb();
    await createStatsRepo(db, 'user-2').save({ ...DEFAULT_STATS, xp: 5 }, T0);
    await createStatsRepo(db, U).save({ ...DEFAULT_STATS, xp: 7 }, T0 + 1000);

    const remote = rulesRemote(U);
    const res = await pushOutbox({ db, remote, userId: U, sleep: noSleep });

    expect(res).toEqual({ pushed: 1, failed: 0 });
    expect(remote.pushed).toEqual([expect.objectContaining({ user_id: U, xp: 7 })]);
    const left = (await listOutbox(db)).map((r) => JSON.parse(r.payload).user_id);
    expect(left).toEqual(['user-2']);
  });
});
