/**
 * Unit skip test (roadmap item 4): a 12-question exam drawn from the unit's
 * lessons' exercises. Passing (>= 80%) completes the unit's remaining lessons.
 * Pure module — no React, no DB.
 */
import type { Exercise, Unit } from '@/domain';

import { hashString } from './lesson/helpers';

/** Questions per skip test. */
export const SKIP_TEST_QUESTIONS = 12;
/** Fraction of correct answers required to pass. */
export const SKIP_TEST_PASS_RATIO = 0.8;
/** Flat XP awarded on a passed skip test (counts toward daily goal/streak/weekly). */
export const SKIP_TEST_XP = 20;

/** mulberry32 PRNG — the same generator the quests use, seeded per attempt. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function skipPassed(correct: number, total: number): boolean {
  return total > 0 && correct / total >= SKIP_TEST_PASS_RATIO;
}

/**
 * Builds the question list for one attempt. Seeded by `${unitId}:${attempt}`:
 * the same attempt always yields the same questions in the same order
 * (repeatable), a new attempt shuffles differently. `speak` exercises are
 * excluded (no microphone needed in an exam). Questions are spread
 * round-robin across the unit's lessons — a lesson's second question only
 * appears after every lesson contributed one. If the unit has fewer eligible
 * exercises than `SKIP_TEST_QUESTIONS`, all of them are used.
 */
export function buildSkipTest(unit: Unit, attempt: number): Exercise[] {
  const rand = mulberry32(hashString(`${unit.id}:${attempt}`) || 1);
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };

  // Per-lesson pools of eligible exercises, each shuffled with the attempt's PRNG.
  const pools = unit.lessons.map((l) => shuffle(l.exercises.filter((e) => e.type !== 'speak')));

  const out: Exercise[] = [];
  while (out.length < SKIP_TEST_QUESTIONS) {
    let took = false;
    for (const pool of pools) {
      if (out.length >= SKIP_TEST_QUESTIONS) break;
      const next = pool.shift();
      if (next) {
        out.push(next);
        took = true;
      }
    }
    if (!took) break; // every pool drained: fewer than 12 eligible exercises
  }
  return out;
}
