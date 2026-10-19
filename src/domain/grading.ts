export const SPEECH_MATCH_THRESHOLD = 0.75;

/** lowercase, strip punctuation (letters/digits of any script kept), collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnswerCorrect(input: string, answers: string[]): boolean {
  const n = normalize(input);
  return n.length > 0 && answers.some((a) => normalize(a) === n);
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
  const t = normalize(transcript);
  const g = normalize(target);
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
