import type { Story } from '@/content/stories';
import type { Course, LangCode } from '@/domain/types';

/** Sunucu sesiyle okunan tek bir metin (+ dili). */
export interface SpeakableText {
  text: string;
  lang: LangCode;
}

/**
 * Kursun tüm seslendirilen metinleri: listen_type ses metinleri, speak cümleleri
 * ve hikâye satırları (hedef dilde, hız 1.0'da okunur). Beyaz boşluk
 * normalize edilir; boş metinler atılır; (dil, metin) ikilisi tekil tutulur.
 * `getStory` verilmezse hikâye satırları toplanmaz (testler için).
 */
export function collectCourseTexts(course: Course, getStory?: (unitId: string) => Story | undefined): SpeakableText[] {
  const out: SpeakableText[] = [];
  const seen = new Set<string>();
  const push = (text: string | undefined, lang: LangCode) => {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const key = `${lang}\u0000${clean}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: clean, lang });
  };

  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type === 'listen_type') push(ex.audioText, ex.audioLang);
        else if (ex.type === 'speak') push(ex.sentence, ex.lang);
      }
    }
    const story = getStory?.(unit.id);
    if (story) for (const line of story.lines) push(line.text, course.toLang);
  }
  return out;
}
