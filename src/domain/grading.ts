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

/**
 * Number words (accent-folded, see `foldAccents`) → digits, per target language. Speech recognisers
 * write numbers as digits ("one two three" → "1 2 3"), and learners may type "10" for "ten".
 * Only applied when the learner's text contains a digit, so articles that double as "one"
 * (un/une, uno/una, ein/eine) are still graded strictly when written as words.
 */
const NUMBER_WORDS: Record<string, Record<string, string>> = (() => {
  const build = (words: string[][]): Record<string, string> => {
    const m: Record<string, string> = {};
    words.forEach((forms, n) => forms.forEach((w) => (m[w] = String(n))));
    return m;
  };
  const tens = (pairs: [number, string[]][]): Record<string, string> =>
    Object.fromEntries(pairs.flatMap(([n, ws]) => ws.map((w) => [w, String(n)])));
  return {
    en: { ...build([['zero'], ['one'], ['two'], ['three'], ['four'], ['five'], ['six'], ['seven'], ['eight'], ['nine'], ['ten'], ['eleven'], ['twelve'], ['thirteen'], ['fourteen'], ['fifteen'], ['sixteen'], ['seventeen'], ['eighteen'], ['nineteen'], ['twenty']]), ...tens([[30, ['thirty']], [40, ['forty']], [50, ['fifty']], [60, ['sixty']], [70, ['seventy']], [80, ['eighty']], [90, ['ninety']], [100, ['hundred']]]) },
    de: { ...build([['null'], ['eins', 'ein', 'eine'], ['zwei'], ['drei'], ['vier'], ['funf'], ['sechs'], ['sieben'], ['acht'], ['neun'], ['zehn'], ['elf'], ['zwolf'], ['dreizehn'], ['vierzehn'], ['funfzehn'], ['sechzehn'], ['siebzehn'], ['achtzehn'], ['neunzehn'], ['zwanzig']]), ...tens([[30, ['dreissig']], [40, ['vierzig']], [50, ['funfzig']], [60, ['sechzig']], [70, ['siebzig']], [80, ['achtzig']], [90, ['neunzig']], [100, ['hundert', 'einhundert']]]) },
    es: { ...build([['cero'], ['uno', 'una', 'un'], ['dos'], ['tres'], ['cuatro'], ['cinco'], ['seis'], ['siete'], ['ocho'], ['nueve'], ['diez'], ['once'], ['doce'], ['trece'], ['catorce'], ['quince'], ['dieciseis'], ['diecisiete'], ['dieciocho'], ['diecinueve'], ['veinte']]), ...tens([[30, ['treinta']], [40, ['cuarenta']], [50, ['cincuenta']], [60, ['sesenta']], [70, ['setenta']], [80, ['ochenta']], [90, ['noventa']], [100, ['cien', 'ciento']]]) },
    fr: { ...build([['zero'], ['un', 'une'], ['deux'], ['trois'], ['quatre'], ['cinq'], ['six'], ['sept'], ['huit'], ['neuf'], ['dix'], ['onze'], ['douze'], ['treize'], ['quatorze'], ['quinze'], ['seize'], ['dixsept'], ['dixhuit'], ['dixneuf'], ['vingt']]), ...tens([[30, ['trente']], [40, ['quarante']], [50, ['cinquante']], [60, ['soixante']], [100, ['cent']]]) },
    it: { ...build([['zero'], ['uno', 'una', 'un'], ['due'], ['tre'], ['quattro'], ['cinque'], ['sei'], ['sette'], ['otto'], ['nove'], ['dieci'], ['undici'], ['dodici'], ['tredici'], ['quattordici'], ['quindici'], ['sedici'], ['diciassette'], ['diciotto'], ['diciannove'], ['venti']]), ...tens([[30, ['trenta']], [40, ['quaranta']], [50, ['cinquanta']], [60, ['sessanta']], [70, ['settanta']], [80, ['ottanta']], [90, ['novanta']], [100, ['cento']]]) },
  };
})();

const hasDigit = (s: string) => /\d/.test(s);

/** Folded text with number words of `lang` replaced by digits. */
function numberCanon(folded: string, lang: string): string {
  const map = NUMBER_WORDS[lang];
  if (!map) return folded;
  return folded
    .split(' ')
    .map((w) => map[w] ?? w)
    .join(' ');
}

/** Candidate digit forms of the learner's text: as written, and with digit runs split ("123" → "1 2 3"). */
function digitForms(folded: string, lang: string): string[] {
  const c = numberCanon(folded, lang);
  const split = c.replace(/\d{2,}/g, (d) => d.split('').join(' '));
  return split === c ? [c] : [c, split];
}

/**
 * Correct when it matches an answer exactly (after `normalize`), only differs in accents / ß, or —
 * when `lang` is given and the learner wrote digits — matches with numbers as digits ("10" = "ten").
 */
export function isAnswerCorrect(input: string, answers: string[], lang?: string): boolean {
  const n = normalize(input);
  if (n.length === 0) return false;
  if (answers.some((a) => normalize(a) === n)) return true;
  const f = foldAccents(n);
  if (answers.some((a) => foldAccents(normalize(a)) === f)) return true;
  if (!lang || !hasDigit(f)) return false;
  const forms = digitForms(f, lang);
  return answers.some((a) => forms.includes(numberCanon(foldAccents(normalize(a)), lang)));
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

/**
 * 0..1 similarity: average of token-overlap (Jaccard) and char-level Levenshtein ratio.
 * With `lang`, digits from the recogniser ("1 2 3", "123") count as the number words of the target.
 */
export function speechMatch(transcript: string, target: string, lang?: string): number {
  // Recognisers differ in accents/ß (and the learner cannot fix them by voice): compare folded.
  const t0 = foldAccents(normalize(transcript));
  const g0 = foldAccents(normalize(target));
  if (!t0 || !g0) return 0;
  if (lang && hasDigit(t0)) {
    const g = numberCanon(g0, lang);
    return Math.max(...digitForms(t0, lang).map((t) => similarity(t, g)));
  }
  return similarity(t0, g0);
}

function similarity(t: string, g: string): number {
  if (t === g) return 1;
  const ta = new Set(t.split(' '));
  const ga = new Set(g.split(' '));
  let inter = 0;
  for (const w of ta) if (ga.has(w)) inter++;
  const jaccard = inter / new Set([...ta, ...ga]).size;
  const lev = 1 - levenshtein(t, g) / Math.max(t.length, g.length);
  return Math.max(0, Math.min(1, (jaccard + lev) / 2));
}

export function isSpeechCorrect(transcript: string, target: string, lang?: string): boolean {
  return speechMatch(transcript, target, lang) >= SPEECH_MATCH_THRESHOLD;
}
