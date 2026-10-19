import type { SrsCard } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

export function createCard(vocabId: string, now: number): SrsCard {
  return { vocabId, ease: DEFAULT_EASE, intervalDays: 0, reps: 0, dueAt: now };
}

/** SM-2 review. quality: 0..5 (>=3 is a pass). */
export function review(card: SrsCard, quality: number, now: number): SrsCard {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease, intervalDays, reps } = card;

  if (q < 3) {
    reps = 0;
    intervalDays = 1;
  } else {
    if (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    reps += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  return {
    ...card,
    ease,
    intervalDays,
    reps,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}

export function isDue(card: SrsCard, now: number): boolean {
  return card.dueAt <= now;
}

/** Due cards, most overdue first. */
export function pickDue(cards: SrsCard[], now: number, limit: number): SrsCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, Math.max(0, limit));
}

/** Map a lesson outcome to an SM-2 quality: wrong → 1, slow correct → 3/4, fast correct → 5. */
export function gradeFromOutcome(correct: boolean, responseMs: number): number {
  if (!correct) return 1;
  if (responseMs <= 3000) return 5;
  if (responseMs <= 8000) return 4;
  return 3;
}
