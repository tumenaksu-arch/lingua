/**
 * Tiny constructors so course files stay readable. They only shape data —
 * no runtime logic beyond generating stable ids.
 */
import type {
  Course,
  Exercise,
  LangCode,
  Lesson,
  Unit,
  VocabItem,
} from '@/domain/types';

type ExerciseDraft = (id: string, from: LangCode, to: LangCode) => Exercise;

/** "Which of these means X?" — prompt in source language, options in target. */
export const sel =
  (prompt: string, options: string[], correctIndex: number, promptIn: 'from' | 'to' = 'from'): ExerciseDraft =>
  (id, from, to) => ({
    id,
    type: 'select_translation',
    promptLang: promptIn === 'from' ? from : to,
    prompt,
    options,
    correctIndex,
  });

/** Build the target-language sentence from a word bank (answer words + distractors). */
export const build =
  (prompt: string, answers: string[], distractors: string[] = []): ExerciseDraft =>
  (id, from) => ({
    id,
    type: 'translate_build',
    promptLang: from,
    prompt,
    bank: shuffleStable([...tokenize(answers[0]), ...distractors], id),
    answers,
  });

export const match =
  (pairs: [string, string][]): ExerciseDraft =>
  (id, from) => ({
    id,
    type: 'match_pairs',
    promptLang: from,
    pairs: pairs.map(([left, right]) => ({ left, right })),
  });

export const listen =
  (audioText: string, answers: string[] = [audioText]): ExerciseDraft =>
  (id, _from, to) => ({
    id,
    type: 'listen_type',
    promptLang: to,
    audioText,
    audioLang: to,
    answers,
  });

export const speak =
  (sentence: string): ExerciseDraft =>
  (id, _from, to) => ({ id, type: 'speak', promptLang: to, sentence, lang: to });

export const fill =
  (sentence: string, options: string[], correctIndex: number): ExerciseDraft =>
  (id, _from, to) => ({ id, type: 'fill_blank', promptLang: to, sentence, options, correctIndex });

export function lesson(id: string, order: number, vocabIds: string[], drafts: ExerciseDraft[]) {
  return { id, order, vocabIds, drafts };
}
type LessonDraft = ReturnType<typeof lesson>;

export function unit(id: string, order: number, title: string, description: string, lessons: LessonDraft[]) {
  return { id, order, title, description, lessons };
}
type UnitDraft = ReturnType<typeof unit>;

export function course(
  meta: { id: string; fromLang: LangCode; toLang: LangCode; title: string },
  vocab: [id: string, term: string, translation: string, example?: string][],
  units: UnitDraft[],
): Course {
  const vocabItems: VocabItem[] = vocab.map(([id, term, translation, example]) => ({
    id: `${meta.id}.${id}`,
    courseId: meta.id,
    term,
    translation,
    example,
  }));
  const builtUnits: Unit[] = units.map((u) => ({
    id: u.id,
    order: u.order,
    title: u.title,
    description: u.description,
    lessons: u.lessons.map(
      (l): Lesson => ({
        id: l.id,
        order: l.order,
        vocabIds: l.vocabIds.map((v) => `${meta.id}.${v}`),
        exercises: l.drafts.map((d, i) => d(`${l.id}.e${i + 1}`, meta.fromLang, meta.toLang)),
      }),
    ),
  }));
  return { ...meta, units: builtUnits, vocab: vocabItems };
}

export function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[.,!?¿¡;:]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

/** Deterministic shuffle (seeded by id) so word banks are stable across renders/tests. */
function shuffleStable<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
