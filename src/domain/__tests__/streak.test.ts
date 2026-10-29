import { applyActivity, daysBetween, localDateString } from '../streak';
import type { UserStats } from '../types';

const base: UserStats = {
  xp: 0, streak: 3, lastActiveDate: '2026-10-10', streakFreezes: 1,
  hearts: 5, heartsUpdatedAt: 0, dailyGoalXp: 20, xpToday: 0,
};

describe('streak', () => {
  test('first ever activity starts streak at 1', () => {
    expect(applyActivity({ ...base, lastActiveDate: null, streak: 0 }, '2026-10-11').streak).toBe(1);
  });
  test('same day is a no-op', () => {
    expect(applyActivity(base, '2026-10-10')).toBe(base);
  });
  test('consecutive day increments', () => {
    expect(applyActivity(base, '2026-10-11').streak).toBe(4);
  });
  test('one missed day consumes a freeze', () => {
    const s = applyActivity(base, '2026-10-12');
    expect(s.streak).toBe(4);
    expect(s.streakFreezes).toBe(0);
  });
  test('one missed day without freeze resets', () => {
    expect(applyActivity({ ...base, streakFreezes: 0 }, '2026-10-12').streak).toBe(1);
  });
  test('two missed days reset even with a freeze', () => {
    const s = applyActivity(base, '2026-10-13');
    expect(s.streak).toBe(1);
    expect(s.streakFreezes).toBe(1);
  });
  test('a reset records the lost streak for the shop repair', () => {
    const s = applyActivity({ ...base, streakFreezes: 0 }, '2026-10-12');
    expect(s.streak).toBe(1);
    expect(s.lostStreak).toEqual({ value: 3, lostOn: '2026-10-12' });
  });
  test('no lostStreak record on a normal increment', () => {
    expect(applyActivity(base, '2026-10-11').lostStreak).toBeUndefined();
  });
  test('reaching day 7 awards a streak freeze', () => {
    const s = applyActivity({ ...base, streak: 6, streakFreezes: 0 }, '2026-10-11');
    expect(s.streak).toBe(7);
    expect(s.streakFreezes).toBe(1);
  });
  test('freeze award is capped at 2', () => {
    const s = applyActivity({ ...base, streak: 13, streakFreezes: 2 }, '2026-10-11');
    expect(s.streak).toBe(14);
    expect(s.streakFreezes).toBe(2);
  });
  test('non-milestone day awards nothing', () => {
    expect(applyActivity({ ...base, streak: 4, streakFreezes: 0 }, '2026-10-11').streakFreezes).toBe(0);
  });
  test('day 7 reached via a consumed freeze still awards one', () => {
    const s = applyActivity({ ...base, streak: 6, streakFreezes: 1 }, '2026-10-12');
    expect(s.streak).toBe(7);
    expect(s.streakFreezes).toBe(1);
  });
  test('daysBetween across month boundary', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });
  test('localDateString respects tz', () => {
    const d = new Date('2026-10-10T23:30:00Z');
    expect(localDateString(d, 'UTC')).toBe('2026-10-10');
    expect(localDateString(d, 'Europe/Istanbul')).toBe('2026-10-11');
  });
  test('localDateString without tz uses the local calendar date (no Intl)', () => {
    const d = new Date(2026, 2, 5, 12, 0, 0); // local 2026-03-05
    expect(localDateString(d)).toBe('2026-03-05');
    expect(localDateString(d)).toBe(localDateString(d, Intl.DateTimeFormat().resolvedOptions().timeZone));
  });
});
