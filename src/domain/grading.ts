export const SPEECH_MATCH_THRESHOLD = 0.75;

/**
 * lowercase, strip punctuation (letters/digits of any script kept), collapse whitespace.
 *
 * Locale-independent on purpose: the learners type on Turkish devices, where
 * `toLocaleLowerCase()` maps `I`→`ı` and the keyboard auto-capitalises `i`→`İ`, so a
 * correct "i am a woman" / "İ am a woman" used to be graded wrong. None of the target
 * languages (en/de/es/fr/it) distinguish dotted/dotless i, so all four forms fold to `i`.
 * Typographic apostrophes (’ ‘ ʼ ´ `) from phone keyboards count as `'`.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/[\u2019\u2018\u02BC\u00B4`]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Accent-insensitive form of `normalize`: a Turkish keyboard has no é/à/ñ/ä/ß, so
 * "Yo bebo cafe" or "Ich spiele Fussball" must still count. ß/ẞ → ss, æ → ae, œ → oe,
 * then every combining mark is dropped (é → e, ñ → n, ü → u …).
 */
export function foldAccents(normalized: string): string {
  return normalized
    .replace(/[ßẞ]/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC');
}

/** Correct when it matches an answer exactly (after `normalize`) or only differs in accents / ß. */
export function isAnswerCorrect(input: string, answers: string[]): boolean {
  const n = normalize(input);
  if (n.length === 0) return false;
  if (answers.some((a) => normalize(a) === n)) return true;
  const f = foldAccents(n);
  return answers.some((a) => foldAccents(normalize(a)) === f);
}

/**
 * When `input` was accepted only because accents/ß were ignored, returns the answer with
 * the proper spelling to show as a gentle hint ("Aksana dikkat: café"); otherwise undefined.
 */
export function accentHint(input: string, answers: string[]): string | undefined {
  const n = normalize(input);
  if (n.length === 0 || answers.some((a) => normalize(a) === n)) return undefined;
  const f = foldAccents(n);
  return answers.find((a) => foldAccents(normalize(a)) === f);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 similarity: average of token-overlap (Jaccard) and char-level Levenshtein ratio. */
export function speechMatch(transcript: string, target: string): number {
  // Recognisers differ in accents/ß (and the learner cannot fix them by voice): compare folded.
  const t = foldAccents(normalize(transcript));
  const g = foldAccents(normalize(target));
  if (!t || !g) return 0;
  if (t === g) return 1;
  const ta = new Set(t.split(' '));
  const ga = new Set(g.split(' '));
  let inter = 0;
  for (const w of ta) if (ga.has(w)) inter++;
  const jaccard = inter / new Set([...ta, ...ga]).size;
  const lev = 1 - levenshtein(t, g) / Math.max(t.length, g.length);
  return Math.max(0, Math.min(1, (jaccard + lev) / 2));
}

export function isSpeechCorrect(transcript: string, target: string): boolean {
  return speechMatch(transcript, target) >= SPEECH_MATCH_THRESHOLD;
}
