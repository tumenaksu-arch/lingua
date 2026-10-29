import type { AiScenario } from '@/data/remote/ai';

/**
 * Sesli moddaki karakter kartının personası. Sunucu senaryosunda karakter
 * alanı taşınmadığından (bkz. `AiScenario`) persona, senaryo başlığı/hedefi/
 * açıklamasındaki anahtar sözcüklere göre eşleştirilir; hiçbiri tutmazsa
 * genel bir konuşma arkadaşı (Duolingo "Lily" tarzı) kullanılır.
 */

export interface ConversationCharacter {
  name: string;
  emoji: string;
}

const PERSONAS: { match: RegExp; character: ConversationCharacter }[] = [
  { match: /kafe|sipariş/i, character: { name: 'Lily', emoji: '☕' } },
  { match: /tanış/i, character: { name: 'Mia', emoji: '👋' } },
  { match: /yol|tarif/i, character: { name: 'Max', emoji: '🧭' } },
  { match: /alışveriş|mağaza/i, character: { name: 'Emma', emoji: '🛍️' } },
  { match: /otel|konaklama/i, character: { name: 'Sofia', emoji: '🛎️' } },
  { match: /doktor|hastane/i, character: { name: 'Dr. Ada', emoji: '🩺' } },
  { match: /telefon/i, character: { name: 'Noah', emoji: '📱' } },
];

const FALLBACK: ConversationCharacter = { name: 'Lily', emoji: '🗣️' };

/** Karakter kartı için persona bul: ilk eşleşen anahtar sözcük grubu kazanır. */
export function characterFor(scenario: Pick<AiScenario, 'titleTr' | 'descriptionTr' | 'goalTr'>): ConversationCharacter {
  const haystack = `${scenario.titleTr} ${scenario.descriptionTr} ${scenario.goalTr}`;
  const hit = PERSONAS.find((p) => p.match.test(haystack));
  return hit ? hit.character : FALLBACK;
}
