import {
  awardGems,
  buyItem,
  canRepairStreak,
  CHEST_EVERY_LESSONS,
  chestAvailable,
  extendXpBoost,
  gemsOf,
  lessonGems,
  MAX_XP_BOOST_MS,
  missingGems,
  openChest,
  PRICE_REFILL_HEARTS,
  PRICE_STREAK_FREEZE,
  PRICE_STREAK_REPAIR,
  PRICE_XP_BOOST,
  rollChestReward,
  SHOP_PRICES,
  xpBoostMultiplier,
  XP_BOOST_DURATION_MS,
} from '../economy';
import { MAX_HEARTS, regenerate } from '../hearts';
import { MAX_STREAK_FREEZES } from '../streak';
import type { UserStats } from '../types';
import { applyLessonResult } from '../xp';

const NOW = 1_800_000_000_000;

function stats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    streakFreezes: 0,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: 0,
    dailyGoalXp: 20,
    xpToday: 0,
    gems: 0,
    lessonsSinceChest: 0,
    ...overrides,
  };
}

describe('gem earnings', () => {
  test('lesson pays 5, a perfect lesson pays 10', () => {
    expect(lessonGems(false)).toBe(5);
    expect(lessonGems(true)).toBe(10);
  });
  test('awardGems accumulates and tolerates legacy records without the field', () => {
    const legacy = stats();
    delete legacy.gems;
    expect(gemsOf(legacy)).toBe(0);
    expect(gemsOf(awardGems(legacy, 10))).toBe(10);
    expect(gemsOf(awardGems(awardGems(legacy, 10), 5))).toBe(15);
  });
});

describe('xp boost', () => {
  test('multiplier is 2 while active, 1 when expired or unset', () => {
    expect(xpBoostMultiplier(stats(), NOW)).toBe(1);
    expect(xpBoostMultiplier(stats({ xpBoostUntil: NOW - 1 }), NOW)).toBe(1);
    expect(xpBoostMultiplier(stats({ xpBoostUntil: NOW + 1000 }), NOW)).toBe(2);
  });
  test('extendXpBoost starts a fresh 15-minute window', () => {
    const s = extendXpBoost(stats(), NOW);
    expect(s.xpBoostUntil).toBe(NOW + XP_BOOST_DURATION_MS);
  });
  test('extendXpBoost extends an active window', () => {
    const s = extendXpBoost(stats({ xpBoostUntil: NOW + 5 * 60_000 }), NOW);
    expect(s.xpBoostUntil).toBe(NOW + 5 * 60_000 + XP_BOOST_DURATION_MS);
  });
  test('extendXpBoost is capped at 60 minutes from now', () => {
    const long = extendXpBoost(stats({ xpBoostUntil: NOW + MAX_XP_BOOST_MS }), NOW);
    expect(long.xpBoostUntil).toBe(NOW + MAX_XP_BOOST_MS);
    const double = extendXpBoost(extendXpBoost(stats({ xpBoostUntil: NOW + 50 * 60_000 }), NOW), NOW);
    expect(double.xpBoostUntil).toBe(NOW + MAX_XP_BOOST_MS);
  });
  test('lesson XP is doubled while the boost is active', () => {
    const result = { lessonId: 'l1', correct: 10, total: 10, mistakes: [], mistakesByType: {}, durationMs: 1000, vocabOutcomes: {} };
    const boosted = applyLessonResult(stats({ xpBoostUntil: NOW + 1000 }), result, NOW, '2026-10-10');
    const plain = applyLessonResult(stats(), result, NOW, '2026-10-10');
    expect(boosted.xpEarned).toBe(plain.xpEarned * 2);
  });
  test('lesson XP is normal again after the boost expires', () => {
    const result = { lessonId: 'l1', correct: 10, total: 10, mistakes: [], mistakesByType: {}, durationMs: 1000, vocabOutcomes: {} };
    const expired = applyLessonResult(stats({ xpBoostUntil: NOW - 1 }), result, NOW, '2026-10-10');
    const plain = applyLessonResult(stats(), result, NOW, '2026-10-10');
    expect(expired.xpEarned).toBe(plain.xpEarned);
  });
});

describe('chest', () => {
  test('is available every 3 completed lessons', () => {
    expect(chestAvailable(stats({ lessonsSinceChest: CHEST_EVERY_LESSONS - 1 }))).toBe(false);
    expect(chestAvailable(stats({ lessonsSinceChest: CHEST_EVERY_LESSONS }))).toBe(true);
    // legacy records without the counter
    expect(chestAvailable(stats())).toBe(false);
  });
  test('openChest refuses when no chest is due', () => {
    expect(openChest(stats({ lessonsSinceChest: 2 }), NOW, () => 0)).toBeNull();
  });
  test('openChest pays once: the counter resets and a second open is refused', () => {
    const first = openChest(stats({ lessonsSinceChest: 3 }), NOW, () => 0.95);
    expect(first?.reward).toEqual({ kind: 'xpBoost' });
    expect(first?.stats.lessonsSinceChest).toBe(0);
    expect(openChest(first!.stats, NOW, () => 0.95)).toBeNull();
  });
  test('injected rng picks the expected reward', () => {
    expect(rollChestReward(() => 0)).toEqual({ kind: 'gems', amount: 10 });
    expect(rollChestReward(() => 0.5)).toEqual({ kind: 'gems', amount: 15 });
    expect(rollChestReward(() => 0.7)).toEqual({ kind: 'gems', amount: 20 });
    expect(rollChestReward(() => 0.8)).toEqual({ kind: 'gems', amount: 30 });
    expect(rollChestReward(() => 0.87)).toEqual({ kind: 'streakFreeze' });
    expect(rollChestReward(() => 0.99)).toEqual({ kind: 'xpBoost' });
  });
  test('gem rewards land in the balance; a freeze reward respects the cap', () => {
    const gemChest = openChest(stats({ lessonsSinceChest: 3 }), NOW, () => 0.4);
    expect(gemsOf(gemChest!.stats)).toBe(15);
    const frozen = openChest(stats({ lessonsSinceChest: 3, streakFreezes: MAX_STREAK_FREEZES }), NOW, () => 0.87);
    expect(frozen?.stats.streakFreezes).toBe(MAX_STREAK_FREEZES);
  });
});

describe('shop', () => {
  test('prices', () => {
    expect(SHOP_PRICES.streakFreeze).toBe(200);
    expect(SHOP_PRICES.refillHearts).toBe(350);
    expect(SHOP_PRICES.xpBoost).toBe(100);
    expect(SHOP_PRICES.streakRepair).toBe(400);
  });
  test('a purchase deducts the price and applies the effect', () => {
    const freeze = buyItem(stats({ gems: 500, streakFreezes: 1 }), 'streakFreeze', NOW, '2026-10-10');
    expect(freeze).toMatchObject({ ok: true });
    if (freeze.ok) {
      expect(freeze.stats.streakFreezes).toBe(2);
      expect(gemsOf(freeze.stats)).toBe(300);
    }
    const refill = buyItem(stats({ gems: 500, hearts: 1, heartsUpdatedAt: NOW - 60_000 }), 'refillHearts', NOW, '2026-10-10');
    expect(refill.ok).toBe(true);
    if (refill.ok) expect(refill.stats.hearts).toBe(MAX_HEARTS);
    const boost = buyItem(stats({ gems: 500 }), 'xpBoost', NOW, '2026-10-10');
    expect(boost.ok).toBe(true);
    if (boost.ok) expect(boost.stats.xpBoostUntil).toBe(NOW + XP_BOOST_DURATION_MS);
  });
  test('insufficient balance is rejected and changes nothing', () => {
    const res = buyItem(stats({ gems: PRICE_STREAK_FREEZE - 1 }), 'streakFreeze', NOW, '2026-10-10');
    expect(res).toEqual({ ok: false, reason: 'insufficient' });
    expect(missingGems(stats({ gems: PRICE_STREAK_FREEZE - 1 }), PRICE_STREAK_FREEZE)).toBe(1);
  });
  test('freeze purchase is refused at the cap even with enough gems', () => {
    const res = buyItem(stats({ gems: 999, streakFreezes: MAX_STREAK_FREEZES }), 'streakFreeze', NOW, '2026-10-10');
    expect(res).toEqual({ ok: false, reason: 'full' });
  });
  test('refill is refused while hearts are full', () => {
    const res = buyItem(stats({ gems: 999, hearts: MAX_HEARTS }), 'refillHearts', NOW, '2026-10-10');
    expect(res).toEqual({ ok: false, reason: 'full' });
  });
  test('regenerated hearts count as full: no paid refill for hearts that merely look empty', () => {
    // 4 hearts idle for 31 minutes regenerate to full before the purchase check.
    const regen = regenerate(stats({ hearts: 4, heartsUpdatedAt: NOW - 31 * 60_000 }), NOW);
    expect(regen.hearts).toBe(MAX_HEARTS);
    const res = buyItem(regen, 'refillHearts', NOW, '2026-10-10');
    expect(res).toEqual({ ok: false, reason: 'full' });
  });
  test('streak repair restores the lost streak within 2 days and clears the record', () => {
    const s = stats({ gems: 500, streak: 1, lastActiveDate: '2026-10-10', lostStreak: { value: 12, lostOn: '2026-10-09' } });
    expect(canRepairStreak(s, '2026-10-10')).toBe(true);
    expect(canRepairStreak(s, '2026-10-11')).toBe(true);
    expect(canRepairStreak(s, '2026-10-12')).toBe(false); // 3. gün: pencere kapalı
    const res = buyItem(s, 'streakRepair', NOW, '2026-10-10');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.stats.streak).toBe(12);
      expect(res.stats.lostStreak).toBeUndefined();
      expect(res.stats.lastActiveDate).toBe('2026-10-10');
      expect(gemsOf(res.stats)).toBe(500 - PRICE_STREAK_REPAIR);
    }
  });
  test('streak repair is unavailable without a recent lost streak', () => {
    expect(buyItem(stats({ gems: 999 }), 'streakRepair', NOW, '2026-10-10')).toEqual({ ok: false, reason: 'unavailable' });
    const old = stats({ gems: 999, lostStreak: { value: 5, lostOn: '2026-10-01' } });
    expect(buyItem(old, 'streakRepair', NOW, '2026-10-10')).toEqual({ ok: false, reason: 'unavailable' });
  });
  test('xp boost purchase extends an active boost, capped at 60 minutes', () => {
    const s = stats({ gems: 200, xpBoostUntil: NOW + 50 * 60_000 });
    const res = buyItem(s, 'xpBoost', NOW, '2026-10-10');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.stats.xpBoostUntil).toBe(NOW + MAX_XP_BOOST_MS);
    expect(gemsOf(s)).toBe(200); // rejected inputs never mutate
  });
  test('price constants stay in sync with the shop table', () => {
    expect(PRICE_STREAK_FREEZE + PRICE_REFILL_HEARTS + PRICE_XP_BOOST + PRICE_STREAK_REPAIR).toBe(1050);
  });
});
