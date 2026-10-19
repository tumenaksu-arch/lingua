import { loseHeart, regenerate, canStartLesson, msUntilNextHeart, HEART_REGEN_MS, MAX_HEARTS } from '../hearts';
import type { UserStats } from '../types';

const t0 = 1_000_000;
const full: UserStats = {
  xp: 0, streak: 0, lastActiveDate: null, streakFreezes: 0,
  hearts: MAX_HEARTS, heartsUpdatedAt: t0, dailyGoalXp: 20, xpToday: 0,
};

describe('hearts', () => {
  test('lose heart from full starts the timer', () => {
    const s = loseHeart(full, t0 + 5000);
    expect(s.hearts).toBe(4);
    expect(s.heartsUpdatedAt).toBe(t0 + 5000);
  });
  test('regenerates one heart per 30 min', () => {
    let s = loseHeart(loseHeart(full, t0), t0);
    expect(s.hearts).toBe(3);
    expect(regenerate(s, t0 + HEART_REGEN_MS - 1).hearts).toBe(3);
    s = regenerate(s, t0 + HEART_REGEN_MS);
    expect(s.hearts).toBe(4);
    expect(s.heartsUpdatedAt).toBe(t0 + HEART_REGEN_MS);
    expect(regenerate(s, t0 + 10 * HEART_REGEN_MS).hearts).toBe(MAX_HEARTS);
  });
  test('cannot go below zero and blocks lessons', () => {
    let s = full;
    for (let i = 0; i < 7; i++) s = loseHeart(s, t0);
    expect(s.hearts).toBe(0);
    expect(canStartLesson(s, t0)).toBe(false);
    expect(canStartLesson(s, t0 + HEART_REGEN_MS)).toBe(true);
  });
  test('msUntilNextHeart', () => {
    expect(msUntilNextHeart(full, t0)).toBe(0);
    const s = loseHeart(full, t0);
    expect(msUntilNextHeart(s, t0 + 1000)).toBe(HEART_REGEN_MS - 1000);
  });
});
