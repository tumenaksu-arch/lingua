import type { AiScenario } from '@/data/remote/ai';
import type { IconName } from '@/ui';

/**
 * Sesli moddaki karakter kartının personası. Sunucu senaryosunda karakter
 * alanı taşınmadığından (bkz. `AiScenario`) persona, senaryo başlığı/hedefi/
 * açıklamasındaki anahtar sözcüklere göre eşleştirilir; hiçbiri tutmazsa
 * genel bir konuşma arkadaşı (Duolingo "Lily" tarzı) kullanılır.
 * `icon` lucide adıdır (bkz. `Icon`); emoji fontu olmayan platformlarda da
 * tutarlı görünmesi için kart ikonu bu ada göre çizer.
 */

export interface ConversationCharacter {
  name: string;
  icon: IconName;
}

const PERSONAS: { match: RegExp; character: ConversationCharacter }[] = [
  { match: /kafe|sipariş/i, character: { name: 'Lily', icon: 'coffee' } },
  { match: /tanış/i, character: { name: 'Mia', icon: 'hand' } },
  { match: /yol|tarif/i, character: { name: 'Max', icon: 'compass' } },
  { match: /alışveriş|mağaza/i, character: { name: 'Emma', icon: 'shoppingBag' } },
  { match: /otel|konaklama/i, character: { name: 'Sofia', icon: 'bellRing' } },
  { match: /doktor|hastane/i, character: { name: 'Dr. Ada', icon: 'stethoscope' } },
  { match: /telefon/i, character: { name: 'Noah', icon: 'smartphone' } },
];

const FALLBACK: ConversationCharacter = { name: 'Lily', icon: 'chat' };

/** Karakter kartı için persona bul: ilk eşleşen anahtar sözcük grubu kazanır. */
export function characterFor(scenario: Pick<AiScenario, 'titleTr' | 'descriptionTr' | 'goalTr'>): ConversationCharacter {
  const haystack = `${scenario.titleTr} ${scenario.descriptionTr} ${scenario.goalTr}`;
  const hit = PERSONAS.find((p) => p.match.test(haystack));
  return hit ? hit.character : FALLBACK;
}
