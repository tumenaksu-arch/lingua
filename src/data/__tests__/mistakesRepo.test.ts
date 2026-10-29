/**
 * mistakes repo: wrong answers accumulate; two consecutive correct answers in
 * practice drop the exercise; one correct + one wrong keeps it. Device-local
 * only — nothing is enqueued to the outbox.
 */
import { createMistakesRepo } from '@/data';
import { FakeDb } from './fakeDb';

let db: FakeDb;
let repo: ReturnType<typeof createMistakesRepo>;

beforeEach(() => {
  db = new FakeDb();
  repo = createMistakesRepo(db, 'u1');
});

test('a wrong answer creates a row with wrong_count 1; repeats accumulate', async () => {
  await repo.record('c1', ['e1'], [], 100);
  await repo.record('c1', ['e1'], [], 200);
  const rows = db.tables.mistakes ?? [];
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ user_id: 'u1', course_id: 'c1', exercise_id: 'e1', wrong_count: 2, correct_streak: 0, last_wrong_at: 200 });
});

test('two consecutive correct answers drop the exercise from the list', async () => {
  await repo.record('c1', ['e1'], [], 100);
  await repo.record('c1', [], ['e1'], 200);
  expect(await repo.count('c1')).toBe(1);
  expect((await repo.list('c1'))[0]!.correctStreak).toBe(1);
  await repo.record('c1', [], ['e1'], 300);
  expect(await repo.count('c1')).toBe(0);
});

test('one correct then one wrong keeps the row and resets the streak', async () => {
  await repo.record('c1', ['e1'], [], 100);
  await repo.record('c1', [], ['e1'], 200); // streak 1
  await repo.record('c1', ['e1'], [], 300); // wrong → streak reset, count 2
  const [row] = await repo.list('c1');
  expect(row).toMatchObject({ wrongCount: 2, correctStreak: 0 });
});

test('a correct answer on an unrecorded exercise is a no-op', async () => {
  await repo.record('c1', [], ['never-wrong'], 100);
  expect(await repo.count('c1')).toBe(0);
});

test('list orders by most wrong first, most recent on ties, and respects the limit', async () => {
  await repo.record('c1', ['a', 'b'], [], 100);
  await repo.record('c1', ['a'], [], 500); // a: 2 wrong, b: 1 wrong
  await repo.record('c2', ['a'], [], 900); // other course must not leak in
  const all = await repo.list('c1', 10);
  expect(all.map((e) => e.exerciseId)).toEqual(['a', 'b']);
  expect(all[0]!.wrongCount).toBe(2);

  await repo.record('c1', ['c', 'd'], [], 700);
  await repo.record('c1', ['d'], [], 800); // d: 2 wrong, more recent than a
  const [first] = await repo.list('c1', 10);
  expect(first!.exerciseId).toBe('d');

  expect(await repo.list('c1', 1)).toHaveLength(1);
});

test('rows are scoped per user and per course', async () => {
  await repo.record('c1', ['e1'], [], 100);
  const otherUser = createMistakesRepo(db, 'u2');
  expect(await otherUser.count('c1')).toBe(0);
  expect(await repo.count('c2')).toBe(0);
});

test('recording never enqueues an outbox row (device-local table)', async () => {
  await repo.record('c1', ['e1'], ['e1'], 100);
  expect(db.tables.outbox ?? []).toHaveLength(0);
});
