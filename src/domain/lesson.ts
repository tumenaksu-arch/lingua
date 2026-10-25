import type { Exercise, LessonResult } from './types';

export interface LessonState {
  lessonId: string;
  exercises: Record<string, Exercise>;
  /** ids still to be answered, in order */
  queue: string[];
  /** ids answered correctly at least once, in order of first-correct */
  completed: string[];
  /** ids answered wrong at least once */
  mistakes: string[];
  hearts: number;
  /** total answers given (incl. retries) */
  answered: number;
  correctAnswers: number;
  /** true once hearts hit 0 while hearts are enabled */
  failed: boolean;
}

export function createLesson(
  lessonId: string,
  exercises: Exercise[],
  hearts: number,
): LessonState {
  const map: Record<string, Exercise> = {};
  for (const e of exercises) map[e.id] = e;
  return {
    lessonId,
    exercises: map,
    queue: exercises.map((e) => e.id),
    completed: [],
    mistakes: [],
    hearts,
    answered: 0,
    correctAnswers: 0,
    failed: false,
  };
}

export function current(state: LessonState): Exercise | undefined {
  const id = state.queue[0];
  return id === undefined ? undefined : state.exercises[id];
}

/** Infinity hearts = hearts disabled (e.g. practice mode). */
export function answer(state: LessonState, exerciseId: string, isCorrect: boolean): LessonState {
  if (state.queue[0] !== exerciseId || state.failed) return state;
  const rest = state.queue.slice(1);
  if (isCorrect) {
    return {
      ...state,
      queue: rest,
      completed: state.completed.includes(exerciseId)
        ? state.completed
        : [...state.completed, exerciseId],
      answered: state.answered + 1,
      correctAnswers: state.correctAnswers + 1,
    };
  }
  const hearts = Number.isFinite(state.hearts) ? Math.max(0, state.hearts - 1) : state.hearts;
  return {
    ...state,
    queue: [...rest, exerciseId], // Duolingo: wrong answers come back at the end
    mistakes: state.mistakes.includes(exerciseId) ? state.mistakes : [...state.mistakes, exerciseId],
    hearts,
    answered: state.answered + 1,
    failed: hearts === 0,
  };
}

export function isFinished(state: LessonState): boolean {
  return state.failed || state.queue.length === 0;
}

/** 0..1 */
export function progress(state: LessonState): number {
  const total = Object.keys(state.exercises).length;
  return total === 0 ? 1 : state.completed.length / total;
}

/**
 * `exerciseVocabMap`: exerciseId → vocab ids exercised. A vocab counts as correct
 * only if none of its exercises were answered wrong.
 */
export function toResult(
  state: LessonState,
  durationMs: number,
  exerciseVocabMap: Record<string, string[]> = {},
): LessonResult {
  const total = Object.keys(state.exercises).length;
  const mistakesByType: Record<string, number> = {};
  for (const id of state.mistakes) {
    const t = state.exercises[id]?.type;
    if (t) mistakesByType[t] = (mistakesByType[t] ?? 0) + 1;
  }
  const vocabOutcomes: Record<string, boolean> = {};
  for (const [exId, vocabIds] of Object.entries(exerciseVocabMap)) {
    const wrong = state.mistakes.includes(exId);
    for (const v of vocabIds) vocabOutcomes[v] = (vocabOutcomes[v] ?? true) && !wrong;
  }
  return {
    lessonId: state.lessonId,
    correct: total - state.mistakes.length,
    total,
    mistakes: [...state.mistakes],
    mistakesByType,
    durationMs,
    vocabOutcomes,
  };
}
