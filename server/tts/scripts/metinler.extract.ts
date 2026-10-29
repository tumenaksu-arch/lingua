/**
 * Extraction step for scripts/metinler.mjs (run via `npx tsx`).
 * Dumps every target-language text the app can speak as JSON on stdout:
 * [{ lang, text }] — deduplicated, whitespace-normalised, 1–300 chars.
 */
import { courses } from '../../../src/content/index';
import { trEnStories } from '../../../src/content/stories/tr-en';
import { trDeStories } from '../../../src/content/stories/tr-de';
import { trEsStories } from '../../../src/content/stories/tr-es';
import { trFrStories } from '../../../src/content/stories/tr-fr';
import { trItStories } from '../../../src/content/stories/tr-it';
import { trEnNotes } from '../../../src/content/notes/tr-en';
import { trDeNotes } from '../../../src/content/notes/tr-de';
import { trEsNotes } from '../../../src/content/notes/tr-es';
import { trFrNotes } from '../../../src/content/notes/tr-fr';
import { trItNotes } from '../../../src/content/notes/tr-it';

const MAX_LEN = 300;

const seen = new Set<string>();
const out: { lang: string; text: string }[] = [];

function add(lang: string, raw: unknown): void {
  if (typeof raw !== 'string') return;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length < 1 || text.length > MAX_LEN) return;
  const key = `${lang}\u0000${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ lang, text });
}

for (const course of courses) {
  const lang = course.toLang;
  for (const item of course.vocab) {
    add(lang, item.term);
    add(lang, item.example);
  }
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.exercises) {
        switch (ex.type) {
          case 'select_translation':
            // promptLang === toLang means the prompt is in the target language
            // (options are then Turkish); otherwise options are the target words.
            if (ex.promptLang === course.toLang) add(lang, ex.prompt);
            else for (const o of ex.options) add(lang, o);
            break;
          case 'translate_build':
            for (const a of ex.answers) add(lang, a);
            break;
          case 'match_pairs':
            for (const p of ex.pairs) add(lang, p.left);
            break;
          case 'listen_type':
            add(lang, ex.audioText);
            for (const a of ex.answers) add(lang, a);
            break;
          case 'speak':
            add(lang, ex.sentence);
            break;
          case 'fill_blank':
            add(lang, ex.sentence);
            for (const o of ex.options) add(lang, o);
            break;
          case 'listen_select':
            add(lang, ex.audioText);
            for (const o of ex.options) add(lang, o);
            break;
          case 'picture_select':
            for (const o of ex.options) add(lang, o.label);
            break;
          case 'complete_chat':
            for (const l of ex.lines) add(lang, l.text);
            for (const o of ex.options) add(lang, o);
            break;
          case 'read_answer':
            add(lang, ex.passage);
            break;
        }
      }
    }
  }
}

const storySets: Record<string, Record<string, { lines?: { text?: string }[] }>> = {
  en: trEnStories, de: trDeStories, es: trEsStories, fr: trFrStories, it: trItStories,
};
for (const [lang, stories] of Object.entries(storySets)) {
  for (const story of Object.values(stories)) {
    for (const line of story.lines ?? []) add(lang, line.text);
  }
}

const noteSets: Record<string, Record<string, { sections?: { examples?: { target?: string }[] }[] }>> = {
  en: trEnNotes, de: trDeNotes, es: trEsNotes, fr: trFrNotes, it: trItNotes,
};
for (const [lang, notes] of Object.entries(noteSets)) {
  for (const note of Object.values(notes)) {
    for (const section of note.sections ?? []) {
      for (const example of section.examples ?? []) add(lang, example.target);
    }
  }
}

process.stdout.write(JSON.stringify(out));
