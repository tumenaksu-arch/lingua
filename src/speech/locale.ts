import type { LangCode } from '@/domain/types';

/** BCP-47 tags used by both TTS and STT engines. */
export const LOCALE_BY_LANG: Record<LangCode, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

export function toLocale(lang: LangCode): string {
  return LOCALE_BY_LANG[lang];
}
