/** Shared domain types. Pure TypeScript — no React/Expo imports allowed here. */

export type LangCode = 'tr' | 'en' | 'de' | 'es' | 'fr' | 'it';

export interface Course {
  id: string;
  fromLang: LangCode;
  toLang: LangCode;
  title: string;
  units: Unit[];
  /** course vocabulary; referenced by lesson.vocabIds */
  vocab: VocabItem[];
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  /** Duolingo-style guidebook sentence shown on the path. */
  description: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  order: number;
  exercises: Exercise[];
  /** vocab ids introduced in this lesson (feed the SRS deck) */
  vocabIds: string[];
}

export interface VocabItem {
  id: string;
  courseId: string;
  term: string;        // target language
  translation: string; // source language
  example?: string;
}

export type Exercise =
  | SelectTranslationExercise
  | TranslateBuildExercise
  | MatchPairsExercise
  | ListenTypeExercise
  | SpeakExercise
  | FillBlankExercise;

interface ExerciseBase {
  id: string;
  /** which language the prompt is shown in */
  promptLang: LangCode;
}

export interface SelectTranslationExercise extends ExerciseBase {
  type: 'select_translation';
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface TranslateBuildExercise extends ExerciseBase {
  type: 'translate_build';
  prompt: string;
  /** word bank, includes distractors */
  bank: string[];
  /** accepted answers; compared after normalisation */
  answers: string[];
}

export interface MatchPairsExercise extends ExerciseBase {
  type: 'match_pairs';
  pairs: { left: string; right: string }[];
}

export interface ListenTypeExercise extends ExerciseBase {
  type: 'listen_type';
  /** text to be spoken via TTS, in target language */
  audioText: string;
  audioLang: LangCode;
  answers: string[];
}

export interface SpeakExercise extends ExerciseBase {
  type: 'speak';
  sentence: string;
  lang: LangCode;
}

export interface FillBlankExercise extends ExerciseBase {
  type: 'fill_blank';
  /** sentence with ___ placeholder */
  sentence: string;
  options: string[];
  correctIndex: number;
}

// ---- user state ----

export interface SrsCard {
  vocabId: string;
  ease: number;          // SM-2 easiness factor, >= 1.3
  intervalDays: number;
  reps: number;
  dueAt: number;         // epoch ms
  lastReviewedAt?: number;
}

export interface UserStats {
  xp: number;
  streak: number;
  /** ISO date (YYYY-MM-DD) in the user's local tz */
  lastActiveDate: string | null;
  streakFreezes: number;
  hearts: number;
  heartsUpdatedAt: number; // epoch ms
  dailyGoalXp: number;
  xpToday: number;
}

export interface LessonResult {
  lessonId: string;
  correct: number;
  total: number;
  mistakes: string[]; // exercise ids
  durationMs: number;
  /** vocab ids answered correctly / incorrectly, for SRS */
  vocabOutcomes: Record<string, boolean>;
}
