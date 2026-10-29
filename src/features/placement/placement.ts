/**
 * Placement test ("Seviyemi bul", roadmap item 1B): an adaptive exam that
 * starts at unit 1 and keeps climbing while the user passes each unit's
 * questions. Every unit contributes up to 3 questions drawn from its lessons'
 * exercises through the skip-test question selector; a unit is passed with at
 * least 2 correct answers. The first failed unit ends the exam, as does the
 * 8-unit cap. `speak` and `listen_type` are excluded so no microphone or
 * audio is required. Pure module — no React, no DB.
 */
import type { Exercise, Unit } from '@/domain';

import { buildSkipTest } from '@/features/skipTest';

/** Questions asked per unit. */
export const PLACEMENT_QUESTIONS_PER_UNIT = 3;
/** Correct answers required to pass a unit (out of its questions). */
export const PLACEMENT_PASS_CORRECT = 2;
/** Maximum number of units the exam can climb through. */
export const PLACEMENT_MAX_UNITS = 8;
/** Maximum number of questions overall (8 units × 3 questions). */
export const PLACEMENT_MAX_QUESTIONS = PLACEMENT_QUESTIONS_PER_UNIT * PLACEMENT_MAX_UNITS;

/** Exercise types excluded from placement (no microphone, no audio needed). */
const EXCLUDED_TYPES: Exercise['type'][] = ['speak', 'listen_type', 'listen_select'];

/**
 * A unit's question list for one exam run, seeded by the unit id and `attempt`
 * (the same seed always yields the same questions in the same order). Wraps
 * the skip-test selector and additionally drops `listen_type` questions
 * (buildSkipTest already excludes `speak`), keeping at most 3.
 */
export function placementQuestions(unit: Unit, attempt: number): Exercise[] {
  return buildSkipTest(unit, attempt)
    .filter((e) => !EXCLUDED_TYPES.includes(e.type))
    .slice(0, PLACEMENT_QUESTIONS_PER_UNIT);
}

/** A passed unit's exam score, as reported by the lesson FSM's toResult. */
export interface PlacementUnitResult {
  unitId: string;
  correct: number;
  total: number;
}

/** Adaptive exam state; transitions only through the helpers below. */
export interface PlacementState {
  /** Index (into course.units) of the unit currently being tested. */
  unitIndex: number;
  /** Units passed so far, in order. */
  passed: PlacementUnitResult[];
  /** True once the exam ended (failed unit, unit cap reached, or "Bitir"). */
  done: boolean;
}

export function createPlacement(): PlacementState {
  return { unitIndex: 0, passed: [], done: false };
}

/**
 * A unit passes with at least PLACEMENT_PASS_CORRECT correct answers. Units
 * with fewer eligible questions need all of them correct.
 */
export function placementUnitPassed(correct: number, total: number): boolean {
  return total > 0 && correct >= Math.min(PLACEMENT_PASS_CORRECT, total);
}

/**
 * Records a finished unit's result. A pass appends the unit and advances to
 * the next one (ending the exam at the unit cap); a fail ends the exam and
 * keeps the units passed so far.
 */
export function recordPlacementUnitResult(
  state: PlacementState,
  unitId: string,
  correct: number,
  total: number,
): PlacementState {
  if (state.done) return state;
  if (!placementUnitPassed(correct, total)) return { ...state, done: true };
  const passed = [...state.passed, { unitId, correct, total }];
  const unitIndex = state.unitIndex + 1;
  if (unitIndex >= PLACEMENT_MAX_UNITS) return { ...state, passed, unitIndex, done: true };
  return { ...state, passed, unitIndex };
}

/** Advances past a unit that has no eligible questions without recording it. */
export function skipEmptyPlacementUnit(state: PlacementState): PlacementState {
  if (state.done) return state;
  const unitIndex = state.unitIndex + 1;
  return { ...state, unitIndex, done: unitIndex >= PLACEMENT_MAX_UNITS };
}

/** "Bitir": ends the exam early; the units passed so far still count. */
export function finishPlacement(state: PlacementState): PlacementState {
  return state.done ? state : { ...state, done: true };
}
