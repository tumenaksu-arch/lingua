import { createCard, review, isDue, pickDue, gradeFromOutcome } from '../srs';

const DAY = 86_400_000;
const now = 1_700_000_000_000;

describe('srs (SM-2)', () => {
  test('new card is due immediately with default ease', () => {
    const c = createCard('v1', now);
    expect(c.ease).toBe(2.5);
    expect(isDue(c, now)).toBe(true);
  });

  test('first two passes give 1d then 6d, then interval*ease', () => {
    let c = createCard('v1', now);
    c = review(c, 4, now);
    expect(c.intervalDays).toBe(1);
    expect(c.dueAt).toBe(now + DAY);
    c = review(c, 4, c.dueAt);
    expect(c.intervalDays).toBe(6);
    const easeBefore = c.ease; // 2.5 after two q=4 reviews
    c = review(c, 5, c.dueAt);
    expect(c.intervalDays).toBe(Math.round(6 * easeBefore)); // 15
    expect(c.reps).toBe(3);
  });

  test('failure resets reps and interval to 1d', () => {
    let c = createCard('v1', now);
    c = review(c, 5, now);
    c = review(c, 5, now + DAY);
    c = review(c, 1, now + 7 * DAY);
    expect(c.reps).toBe(0);
    expect(c.intervalDays).toBe(1);
  });

  test('ease never drops below 1.3', () => {
    let c = createCard('v1', now);
    for (let i = 0; i < 20; i++) c = review(c, 0, now + i * DAY);
    expect(c.ease).toBe(1.3);
  });

  test('pickDue returns most overdue first and respects limit', () => {
    const a = { ...createCard('a', now), dueAt: now - 2 * DAY };
    const b = { ...createCard('b', now), dueAt: now - 5 * DAY };
    const c = { ...createCard('c', now), dueAt: now + DAY };
    expect(pickDue([a, b, c], now, 5).map((x) => x.vocabId)).toEqual(['b', 'a']);
    expect(pickDue([a, b, c], now, 1).map((x) => x.vocabId)).toEqual(['b']);
  });

  test('gradeFromOutcome', () => {
    expect(gradeFromOutcome(false, 100)).toBe(1);
    expect(gradeFromOutcome(true, 1000)).toBe(5);
    expect(gradeFromOutcome(true, 5000)).toBe(4);
    expect(gradeFromOutcome(true, 20000)).toBe(3);
  });
});
