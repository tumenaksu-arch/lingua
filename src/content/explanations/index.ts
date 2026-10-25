import type { Exercise } from '@/domain/types';

import { trDeExplanations } from './tr-de';
import { trEnExplanations } from './tr-en';
import { trEsExplanations } from './tr-es';
import { trFrExplanations } from './tr-fr';
import { trItExplanations } from './tr-it';

/**
 * Lookup for roadmap item 1 ("Neden yanlış?"). Explanations are keyed by exercise id
 * ('tr-en.u1.l1.e3'); ids are course-prefixed so a flat merge cannot collide.
 */
const BY_EXERCISE: Record<string, string> = {
  ...trEnExplanations,
  ...trDeExplanations,
  ...trEsExplanations,
  ...trFrExplanations,
  ...trItExplanations,
};

export function getExplanation(exerciseId: string): string | undefined {
  return BY_EXERCISE[exerciseId];
}

/** Short Turkish fallback for exercises that have no dedicated explanation yet. */
const HINTS: Record<Exercise['type'], string> = {
  select_translation: 'Seçenekleri kelime kelime karşılaştır; doğru çeviride hem anlam hem yapı uyuşur.',
  fill_blank: 'Boşluğa hangi kelime uyar diye cümlenin geri kalanını düşün.',
  translate_build: 'Kelime sırasına dikkat: hedef dilde cümle kurallı sırayla kurulur.',
  listen_type: 'Yavaş dinle düğmesiyle tekrar dinleyebilirsin.',
  speak: 'Cümleyi yüksek sesle ve açık söyle, sonra tekrar dene.',
  match_pairs: 'Önce emin olduklarını eşleştir; kalan çiftler kendiliğinden çıkar.',
};

export function genericHint(type: Exercise['type']): string {
  return HINTS[type];
}

export type { CourseExplanations } from './types';
