import type { Exercise } from '@/domain';

export interface ExerciseProps<E extends Exercise = Exercise> {
  exercise: E;
  /** Called exactly once when the learner submits. */
  onAnswer: (isCorrect: boolean, userAnswer?: string) => void;
  /** True while the feedback sheet is showing. */
  disabled: boolean;
  /** Target language of the course (for TTS). */
  targetLang: Exercise['promptLang'];
}
