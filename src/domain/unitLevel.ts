import { A1_MAX_UNIT_ORDER, type ProficiencyLevel } from './proficiency';

/**
 * Bir ünitenin CEFR seviyesi. Eşik, profil puanlamasıyla (proficiency.ts)
 * paylaşılır: 1–8. üniteler A1, sonrası A2. B1 içeriği henüz yok; ölçek
 * genişleyince bu fonksiyon tek noktadan genişletilir.
 */
export function unitLevel(unit: { order: number }): ProficiencyLevel {
  return unit.order <= A1_MAX_UNIT_ORDER ? 'A1' : 'A2';
}
