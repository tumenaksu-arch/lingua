import { MAX_HEARTS, refill } from './hearts';
import { daysBetween, MAX_STREAK_FREEZES } from './streak';
import type { UserStats } from './types';

/**
 * Elmas ekonomisi (mağaza / sandık / çift XP). Saf hesap mantığı —
 * React/Expo import yok. Tüm alanlar cihaz-localdir; sunucu şemasına
 * gönderilmez (bkz. statsRepo.statsToServerRow).
 */

/** Hoş geldin hediyesi: eski kayıtlara (ve yeni hesaplara) bir kez verilir. */
export const STARTER_GEMS = 50;

// Elmas kazanma kuralları
/** Ders bitişi +5, hatasız ders +10. */
export function lessonGems(perfect: boolean): number {
  return perfect ? GEMS_LESSON_PERFECT : GEMS_LESSON;
}
export const GEMS_LESSON = 5;
export const GEMS_LESSON_PERFECT = 10;
export const GEMS_QUEST = 10;
export const GEMS_STORY = 5;
export const GEMS_DAILY_GOAL = 5;

// Mağaza fiyatları
export const PRICE_STREAK_FREEZE = 200;
export const PRICE_REFILL_HEARTS = 350;
export const PRICE_XP_BOOST = 100;
export const PRICE_STREAK_REPAIR = 400;

// Çift XP
export const XP_BOOST_DURATION_MS = 15 * 60 * 1000;
export const MAX_XP_BOOST_MS = 60 * 60 * 1000;

// Sandık: her 3 tamamlanan derste bir, ders sonu ekranında.
export const CHEST_EVERY_LESSONS = 3;
// Seri onarma: seri en fazla 2 gün önce kırılmışsa mümkün.
export const STREAK_REPAIR_WINDOW_DAYS = 2;

export function gemsOf(s: UserStats): number {
  return s.gems ?? 0;
}

export function lessonsSinceChestOf(s: UserStats): number {
  return s.lessonsSinceChest ?? 0;
}

export function awardGems(s: UserStats, amount: number): UserStats {
  return { ...s, gems: gemsOf(s) + amount };
}

/** Etkin çift XP varken 2, yoksa 1 (görev ödülü ve sandık bu çarpana girmez). */
export function xpBoostMultiplier(s: UserStats, now: number): number {
  return s.xpBoostUntil !== undefined && s.xpBoostUntil > now ? 2 : 1;
}

/**
 * Çift XP penceresini 15 dk uzatır (etkin değilse yeni başlatır).
 * Tavan: şu andan itibaren en fazla 60 dk.
 */
export function extendXpBoost(s: UserStats, now: number): UserStats {
  const base = s.xpBoostUntil !== undefined && s.xpBoostUntil > now ? s.xpBoostUntil : now;
  return { ...s, xpBoostUntil: Math.min(base + XP_BOOST_DURATION_MS, now + MAX_XP_BOOST_MS) };
}

// ---- sandık ----

export type ChestReward =
  | { kind: 'gems'; amount: number }
  | { kind: 'streakFreeze' }
  | { kind: 'xpBoost' };

interface WeightedReward {
  reward: ChestReward;
  weight: number;
}

/** Ağırlıklar toplamı 100 — rng()*100 üzerinden belirlenimci seçim. */
export const CHEST_REWARDS: WeightedReward[] = [
  { reward: { kind: 'gems', amount: 10 }, weight: 30 },
  { reward: { kind: 'gems', amount: 15 }, weight: 25 },
  { reward: { kind: 'gems', amount: 20 }, weight: 20 },
  { reward: { kind: 'gems', amount: 30 }, weight: 10 },
  { reward: { kind: 'streakFreeze' }, weight: 5 },
  { reward: { kind: 'xpBoost' }, weight: 10 },
];

/** `rng` enjekte edilebilir (testler deterministik ödül bekler). */
export function rollChestReward(rng: () => number): ChestReward {
  let pick = rng() * CHEST_REWARDS.reduce((sum, e) => sum + e.weight, 0);
  for (const e of CHEST_REWARDS) {
    pick -= e.weight;
    if (pick < 0) return e.reward;
  }
  return CHEST_REWARDS[CHEST_REWARDS.length - 1]!.reward;
}

export function chestAvailable(s: UserStats): boolean {
  return lessonsSinceChestOf(s) >= CHEST_EVERY_LESSONS;
}

/**
 * Sandığı açar: ödülü uygular ve sayacı sıfırlar (ödül bir kez alınır —
 * açıldıktan sonra 3 ders daha tamamlanana kadar sandık gelmez).
 * Sandık hazır değilse null döner.
 */
export function openChest(s: UserStats, now: number, rng: () => number): { stats: UserStats; reward: ChestReward } | null {
  if (!chestAvailable(s)) return null;
  const reward = rollChestReward(rng);
  let next: UserStats = { ...s, lessonsSinceChest: 0 };
  if (reward.kind === 'gems') next = awardGems(next, reward.amount);
  else if (reward.kind === 'streakFreeze') next = { ...next, streakFreezes: Math.min(MAX_STREAK_FREEZES, next.streakFreezes + 1) };
  else next = extendXpBoost(next, now);
  return { stats: next, reward };
}

// ---- mağaza ----

export type ShopItem = 'streakFreeze' | 'refillHearts' | 'xpBoost' | 'streakRepair';

export const SHOP_PRICES: Record<ShopItem, number> = {
  streakFreeze: PRICE_STREAK_FREEZE,
  refillHearts: PRICE_REFILL_HEARTS,
  xpBoost: PRICE_XP_BOOST,
  streakRepair: PRICE_STREAK_REPAIR,
};

export type Purchase =
  | { ok: true; stats: UserStats }
  | { ok: false; reason: 'insufficient' | 'full' | 'unavailable' };

export function missingGems(s: { gems?: number }, price: number): number {
  return Math.max(0, price - (s.gems ?? 0));
}

/** Seri onarma yalnızca seri son 2 gün içinde kırıldıysa mümkün. */
export function canRepairStreak(s: UserStats, today: string): boolean {
  return s.lostStreak !== undefined && daysBetween(s.lostStreak.lostOn, today) <= STREAK_REPAIR_WINDOW_DAYS;
}

/**
 * Tek dokunuşluk satın alma: bakiye yeterliyse fiyatı düşer ve etkiyi uygular.
 * Reddetmeler stats'ı olduğu gibi döndürür (reason: insufficient | full | unavailable).
 * `refillHearts` için `now` ile güncel (yenilenmiş) kalp değeriyle çağrılmalı.
 */
export function buyItem(s: UserStats, item: ShopItem, now: number, today: string): Purchase {
  const price = SHOP_PRICES[item];
  const pay = (next: UserStats): Purchase => ({ ok: true, stats: { ...next, gems: gemsOf(next) - price } });
  switch (item) {
    case 'streakFreeze':
      if (s.streakFreezes >= MAX_STREAK_FREEZES) return { ok: false, reason: 'full' };
      if (gemsOf(s) < price) return { ok: false, reason: 'insufficient' };
      return pay({ ...s, streakFreezes: s.streakFreezes + 1 });
    case 'refillHearts': {
      if (s.hearts >= MAX_HEARTS) return { ok: false, reason: 'full' };
      if (gemsOf(s) < price) return { ok: false, reason: 'insufficient' };
      return pay(refill(s, now));
    }
    case 'xpBoost':
      if (gemsOf(s) < price) return { ok: false, reason: 'insufficient' };
      return pay(extendXpBoost(s, now));
    case 'streakRepair': {
      if (!canRepairStreak(s, today)) return { ok: false, reason: 'unavailable' };
      if (gemsOf(s) < price) return { ok: false, reason: 'insufficient' };
      // Seri onarımı onarım gününden itibaren sayılır: bugün oynanırsa seri korunur.
      return pay({ ...s, streak: s.lostStreak!.value, lastActiveDate: today, lostStreak: undefined });
    }
  }
}
