import type { Exercise, Lesson } from '@/domain';

/** Deterministic Fisher–Yates with a mulberry32 seed, so re-renders never reshuffle. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Word-bank state for translate_build: bank slots keep their position, picked ones become `used`. */
export interface BuildState {
  bank: string[];
  /** indices into bank, in the order the user tapped them */
  picked: number[];
}

export function createBuild(bank: string[]): BuildState {
  return { bank, picked: [] };
}

export function pickWord(state: BuildState, bankIndex: number): BuildState {
  if (state.picked.includes(bankIndex) || bankIndex < 0 || bankIndex >= state.bank.length) return state;
  return { ...state, picked: [...state.picked, bankIndex] };
}

export function unpickWord(state: BuildState, pickedPosition: number): BuildState {
  if (pickedPosition < 0 || pickedPosition >= state.picked.length) return state;
  return { ...state, picked: state.picked.filter((_, i) => i !== pickedPosition) };
}

export function buildAnswer(state: BuildState): string {
  return state.picked.map((i) => state.bank[i]).join(' ');
}

/** Match-pairs reducer. */
export interface MatchState {
  left: string[];
  right: string[];
  /** canonical pairs: left text → right text */
  pairs: Record<string, string>;
  selectedLeft: number | null;
  selectedRight: number | null;
  matchedLeft: Set<number>;
  matchedRight: Set<number>;
  /** last wrong attempt (for a red flash); cleared on next tap */
  wrong: { left: number; right: number } | null;
  mistakes: number;
}

export function createMatch(pairs: { left: string; right: string }[], seed: number): MatchState {
  return {
    left: pairs.map((p) => p.left),
    right: seededShuffle(pairs.map((p) => p.right), seed),
    pairs: Object.fromEntries(pairs.map((p) => [p.left, p.right])),
    selectedLeft: null,
    selectedRight: null,
    matchedLeft: new Set(),
    matchedRight: new Set(),
    wrong: null,
    mistakes: 0,
  };
}

export function tapMatch(state: MatchState, side: 'left' | 'right', index: number): MatchState {
  if (side === 'left' && state.matchedLeft.has(index)) return state;
  if (side === 'right' && state.matchedRight.has(index)) return state;
  const next: MatchState = { ...state, wrong: null };
  if (side === 'left') next.selectedLeft = state.selectedLeft === index ? null : index;
  else next.selectedRight = state.selectedRight === index ? null : index;

  if (next.selectedLeft === null || next.selectedRight === null) return next;

  const l = next.selectedLeft;
  const r = next.selectedRight;
  const correct = state.pairs[state.left[l]!] === state.right[r];
  if (correct) {
    return {
      ...next,
      matchedLeft: new Set([...state.matchedLeft, l]),
      matchedRight: new Set([...state.matchedRight, r]),
      selectedLeft: null,
      selectedRight: null,
    };
  }
  return { ...next, selectedLeft: null, selectedRight: null, wrong: { left: l, right: r }, mistakes: state.mistakes + 1 };
}

export function isMatchComplete(state: MatchState): boolean {
  return state.matchedLeft.size === state.left.length;
}

/** Maps each exercise to the lesson's vocab ids (heuristic: every exercise drills the lesson's vocab). */
export function exerciseVocabMap(lesson: Lesson): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const e of lesson.exercises) map[e.id] = lesson.vocabIds;
  return map;
}

/** Text to auto-play when the prompt is in the target language. */
export function autoPlayText(exercise: Exercise, targetLang: string): string | null {
  if (exercise.promptLang !== targetLang) return null;
  switch (exercise.type) {
    case 'select_translation':
    case 'translate_build':
      return exercise.prompt;
    case 'fill_blank':
      return null; // blank would be read aloud as nothing
    default:
      return null;
  }
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** The expected answer shown in the red feedback sheet (match_pairs has none). */
export function correctAnswerText(e: Exercise): string | undefined {
  switch (e.type) {
    case 'select_translation':
    case 'fill_blank':
    case 'listen_select':
    case 'complete_chat':
    case 'read_answer':
      return e.options[e.correctIndex];
    case 'picture_select':
      return e.options[e.correctIndex]?.label;
    case 'translate_build':
    case 'listen_type':
      return e.answers[0];
    case 'speak':
      return e.sentence;
    case 'match_pairs':
      return undefined;
  }
}
