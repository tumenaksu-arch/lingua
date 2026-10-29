import type { MistakeEntry } from '@/data';
import type { Course, Exercise, LangCode, SelectTranslationExercise, SrsCard, VocabItem } from '@/domain';
import { hashString, seededShuffle } from '@/features/lesson/helpers';

/** Practice Hub session kinds (Duolingo "Practice Hub → Mistakes / Words"). */
export type PracticeMode = 'mistakes' | 'words';

/** Exercises per practice session. */
export const PRACTICE_SESSION_SIZE = 10;
/** Weak-word pool shown on the review tab and fed into the words session. */
export const WEAK_WORDS_LIMIT = 20;
/** Flat XP for a finished practice session at ≥ 50% accuracy. */
export const PRACTICE_SESSION_XP = 10;

/** Session XP: 10 at ≥ 50% correct, nothing below. */
export function practiceXp(correct: number, total: number): number {
  return total > 0 && correct / total >= 0.5 ? PRACTICE_SESSION_XP : 0;
}

/**
 * "Zayıf kelimeler": the SRS cards with the lowest ease (ties: fewer reps =
 * less practiced = weaker), at most `limit`.
 */
export function pickWeakWords(cards: SrsCard[], limit = WEAK_WORDS_LIMIT): SrsCard[] {
  return [...cards]
    .sort((a, b) => a.ease - b.ease || a.reps - b.reps)
    .slice(0, Math.max(0, limit));
}

/**
 * "Hatalarım" session: resolve the stored mistake ids against the course
 * content (ids no longer in the content are skipped), most-wrong first,
 * at most `limit` exercises. `entries` must already be repo-ordered.
 */
export function buildMistakeSession(course: Course, entries: MistakeEntry[], limit = PRACTICE_SESSION_SIZE): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      for (const exercise of lesson.exercises) byId.set(exercise.id, exercise);
    }
  }
  // Most-wrong first, most recent on ties — defensive re-sort so any entry order works.
  const ordered = [...entries].sort((a, b) => b.wrongCount - a.wrongCount || b.lastWrongAt - a.lastWrongAt);
  const seen = new Set<string>();
  const out: Exercise[] = [];
  for (const entry of ordered) {
    if (out.length >= limit) break;
    if (seen.has(entry.exerciseId)) continue;
    const exercise = byId.get(entry.exerciseId);
    if (!exercise) continue; // removed from the content
    seen.add(entry.exerciseId);
    out.push(exercise);
  }
  return out;
}

/**
 * Builds the selectable term→translation quiz for one vocab item: the correct
 * translation appears exactly once among 4 unique options; distractors come
 * from the same course and never duplicate a translation. Shuffling is seeded
 * so the session is stable across renders.
 */
export function buildWordExercise(
  vocab: VocabItem,
  pool: VocabItem[],
  seed: number,
  promptLang: LangCode,
): SelectTranslationExercise {
  const seenTranslations = new Set([vocab.translation]);
  const distractors = pool.filter(
    (v) => v.id !== vocab.id && !seenTranslations.has(v.translation) && seenTranslations.add(v.translation),
  );
  const picked = seededShuffle(distractors, seed).slice(0, 3);
  const options = seededShuffle([vocab.translation, ...picked.map((v) => v.translation)], seed + 1);
  return {
    id: `practice-word:${vocab.id}`,
    type: 'select_translation',
    // target-language prompt: ExerciseView reads the term aloud automatically
    promptLang,
    prompt: vocab.term,
    options,
    correctIndex: options.indexOf(vocab.translation),
  };
}

export interface WordPracticePair {
  card: SrsCard;
  exercise: SelectTranslationExercise;
}

/**
 * "Zayıf kelimeler" session: one quiz per weak word (lowest ease first),
 * capped at the session size; weak words without a vocab entry are skipped.
 */
export function buildWordSession(
  course: Course,
  cards: SrsCard[],
  vocab: VocabItem[],
  limit = PRACTICE_SESSION_SIZE,
): { pairs: WordPracticePair[] } {
  const byId = new Map(vocab.map((v) => [v.id, v]));
  const weak = pickWeakWords(cards.filter((c) => byId.has(c.vocabId)), limit);
  const pairs = weak.map((card) => {
    const v = byId.get(card.vocabId)!;
    return { card, exercise: buildWordExercise(v, vocab, hashString(card.vocabId), course.toLang) };
  });
  return { pairs };
}
