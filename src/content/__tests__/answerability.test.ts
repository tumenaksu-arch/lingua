import { courses } from '..';
import { normalize, isAnswerCorrect, speechMatch, accentHint } from '@/domain/grading';
import type { Exercise } from '@/domain/types';

/**
 * Every exercise of every course must be answerable the way real learners type on
 * Turkish phones. Regression: tr-en.u1.l2 "I am a woman" was graded wrong when typed
 * as "i am a woman" / "İ am a woman" on a Turkish-locale device.
 */

/** What a Turkish phone keyboard / locale does to a correct answer. */
function keyboardVariants(answer: string): string[] {
  const out = new Set<string>([
    answer,
    answer.toLowerCase(),
    answer.toLocaleLowerCase('tr'), // Turkish locale: I → ı
    answer.toLocaleUpperCase('tr'), // caps lock on a Turkish keyboard: i → İ
    answer.replace(/^i/, 'İ'), // auto-capitalised first letter on a Turkish keyboard
    answer.replace(/'/g, '’'), // iOS/Android smart apostrophe
    answer.normalize('NFD'), // decomposed accents (some keyboards / paste)
    answer.replace(/[.!?¿¡,;:]+/g, ''), // no punctuation
    `  ${answer.replace(/ /g, '  ')}  `, // stray spaces
    // Turkish keyboard has no é/à/ñ/ä/ß: typed without accents, ß as ss
    answer.replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  ]);
  return [...out];
}

function allExercises(): { course: string; lesson: string; ex: Exercise }[] {
  const out: { course: string; lesson: string; ex: Exercise }[] = [];
  for (const c of courses) for (const u of c.units) for (const l of u.lessons) for (const ex of l.exercises) out.push({ course: c.id, lesson: l.id, ex });
  return out;
}

const tokens = (s: string) => normalize(s).split(' ').filter(Boolean);

describe('normalize is locale-independent (Turkish devices)', () => {
  const realLower = String.prototype.toLocaleLowerCase;
  afterEach(() => jest.restoreAllMocks());

  it('accepts I / i / İ / ı forms and smart apostrophes', () => {
    for (const typed of ['I am a woman', 'i am a woman', 'İ am a woman', 'I AM A WOMAN', 'İ AM A WOMAN', 'ı am a woman']) {
      expect(isAnswerCorrect(typed, ['I am a woman'])).toBe(true);
    }
    expect(isAnswerCorrect('I don’t know', ["I don't know"])).toBe(true);
    expect(isAnswerCorrect('Ich bin müde', ['ich bin müde'])).toBe(true);
  });

  it('accepts answers typed without accents / ß and returns the proper spelling as a hint', () => {
    expect(isAnswerCorrect('Yo bebo cafe', ['Yo bebo café'])).toBe(true);
    expect(accentHint('Yo bebo cafe', ['Yo bebo café'])).toBe('Yo bebo café');
    expect(isAnswerCorrect('Wir spielen am Wochenende Fussball', ['Wir spielen am Wochenende Fußball'])).toBe(true);
    expect(isAnswerCorrect('El nino es pequeno', ['El niño es pequeño'])).toBe(true);
    // exact spelling → no hint; a different word is still wrong
    expect(accentHint('Yo bebo café', ['Yo bebo café'])).toBeUndefined();
    expect(isAnswerCorrect('Yo bebo te', ['Yo bebo café'])).toBe(false);
    expect(accentHint('Yo bebo te', ['Yo bebo café'])).toBeUndefined();
  });

  it('gives the same result when the device locale is Turkish', () => {
    // Simulate a Turkish device: a locale-less toLocaleLowerCase behaves like tr.
    jest.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string, locales?: Intl.LocalesArgument) {
      return realLower.call(this, locales ?? 'tr');
    });
    expect('I'.toLocaleLowerCase()).toBe('ı'); // the simulation is active
    expect(isAnswerCorrect('i am a woman', ['I am a woman'])).toBe(true);
    expect(isAnswerCorrect('İch bin hier', ['Ich bin hier'])).toBe(true);
  });
});

describe('every exercise in every course is answerable', () => {
  const all = allExercises();

  it('covers all courses', () => {
    expect(new Set(all.map((a) => a.course)).size).toBe(courses.length);
    expect(all.length).toBeGreaterThan(1000);
  });

  it('listen_type: the spoken text is an accepted answer, and keyboard variants of every answer pass', () => {
    const problems: string[] = [];
    for (const { ex } of all) {
      if (ex.type !== 'listen_type') continue;
      if (!isAnswerCorrect(ex.audioText, ex.answers)) problems.push(`${ex.id}: spoken "${ex.audioText}" not among answers`);
      for (const a of ex.answers)
        for (const v of keyboardVariants(a)) if (!isAnswerCorrect(v, ex.answers)) problems.push(`${ex.id}: "${v}" rejected`);
    }
    expect(problems).toEqual([]);
  });

  it('translate_build: every accepted answer can be built from the word bank, and variants pass', () => {
    const problems: string[] = [];
    for (const { ex } of all) {
      if (ex.type !== 'translate_build') continue;
      const bank = ex.bank.flatMap(tokens);
      const buildable = ex.answers.some((a) => {
        const pool = [...bank];
        return tokens(a).every((t) => {
          const i = pool.indexOf(t);
          if (i < 0) return false;
          pool.splice(i, 1);
          return true;
        });
      });
      if (!buildable) problems.push(`${ex.id}: no answer buildable from bank [${ex.bank.join(' | ')}] answers [${ex.answers.join(' | ')}]`);
      for (const a of ex.answers)
        for (const v of keyboardVariants(a)) if (!isAnswerCorrect(v, ex.answers)) problems.push(`${ex.id}: "${v}" rejected`);
    }
    expect(problems).toEqual([]);
  });

  it('speak: keyboard/recogniser variants of the sentence match fully', () => {
    const problems: string[] = [];
    for (const { ex } of all) {
      if (ex.type !== 'speak') continue;
      for (const v of keyboardVariants(ex.sentence)) if (speechMatch(v, ex.sentence) < 1) problems.push(`${ex.id}: "${v}"`);
    }
    expect(problems).toEqual([]);
  });

  it('select_translation / fill_blank: correctIndex valid and no two options look the same', () => {
    const problems: string[] = [];
    for (const { ex } of all) {
      if (ex.type !== 'select_translation' && ex.type !== 'fill_blank') continue;
      if (ex.correctIndex < 0 || ex.correctIndex >= ex.options.length) problems.push(`${ex.id}: correctIndex out of range`);
      const seen = new Map<string, number>();
      ex.options.forEach((o, i) => {
        const k = normalize(o);
        if (seen.has(k)) problems.push(`${ex.id}: options ${seen.get(k)} and ${i} identical ("${o}")`);
        seen.set(k, i);
      });
      if (ex.type === 'fill_blank' && !ex.sentence.includes('___')) problems.push(`${ex.id}: no ___ blank`);
    }
    expect(problems).toEqual([]);
  });

  it('match_pairs: left and right sides are each unambiguous', () => {
    const problems: string[] = [];
    for (const { ex } of all) {
      if (ex.type !== 'match_pairs') continue;
      for (const side of ['left', 'right'] as const) {
        const vals = ex.pairs.map((p) => normalize(p[side]));
        if (new Set(vals).size !== vals.length) problems.push(`${ex.id}: duplicate ${side} [${ex.pairs.map((p) => p[side]).join(' | ')}]`);
      }
    }
    expect(problems).toEqual([]);
  });
});
