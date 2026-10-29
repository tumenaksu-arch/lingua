/**
 * Love-Vox ilerleme puanı (Duolingo Score benzeri CEFR göstergesi, yol haritası
 * 4. dalga). Saf fonksiyon: (kurs, ders ilerlemesi) → puan + seviye.
 *
 * Ölçek (B1 içeriği henüz yok; ölçek hazır duruyor):
 * - Ünite 1–8 (A1) ders başına 1 puan → 8 ünite × 4 ders = 32 (A1 ~30 puanda biter)
 * - Ünite 9–16 (A2) ders başına 1.5 puan → toplam 32 + 48 = 80 (A2 30–79)
 * - Tamamlanan hikâye ünite başına +1 puan
 * - Sınırlar: <30 A1, 30–79 A2, ≥80 B1; puan 0–130 arası
 *
 * Kursta 16'dan az ünite varsa formül yine çalışır: ders puanları ünite sırasına
 * göre verilir, taşma olmaz.
 */

/** A1 bölgesindeki son ünite sırası; sonrası A2 puanıyla sayılır. */
export const A1_MAX_UNIT_ORDER = 8;

export const A1_LESSON_POINTS = 1;
export const A2_LESSON_POINTS = 1.5;
export const STORY_POINTS = 1;

export const LEVEL_A2_AT = 30;
export const LEVEL_B1_AT = 80;
export const MAX_SCORE = 130;

export type ProficiencyLevel = 'A1' | 'A2' | 'B1';

/** İlerleme kaydının bu hesap için gereken en küçük yapısal dilimi (data katmanıyla uyumlu). */
export interface ProficiencyProgressEntry {
  completedAt?: number | null;
}

export type ProficiencyProgress = Record<string, ProficiencyProgressEntry | undefined>;

export interface ProficiencyScore {
  /** 0–130 arası, tam sayı. */
  score: number;
  level: ProficiencyLevel;
  /** Sıradaki seviyenin eşiği (B1'de ölçeğin sonu = MAX_SCORE). */
  nextLevelAt: number;
  /** Tüm dersleri bitirilmiş ünite sayısı. */
  unitsDone: number;
}

export function levelForScore(score: number): ProficiencyLevel {
  if (score >= LEVEL_B1_AT) return 'B1';
  if (score >= LEVEL_A2_AT) return 'A2';
  return 'A1';
}

/** Seviyenin başladığı puan (ilerleme çubuğunun alt sınırı). */
export function levelStart(level: ProficiencyLevel): number {
  if (level === 'B1') return LEVEL_B1_AT;
  if (level === 'A2') return LEVEL_A2_AT;
  return 0;
}

/** Sıradaki seviyenin adı (görselde "A2'ye 3 puan kaldı" gibi); en üst seviyede null. */
export function nextLevelName(level: ProficiencyLevel): 'A2' | 'B1' | null {
  if (level === 'A1') return 'A2';
  if (level === 'A2') return 'B1';
  return null;
}

/**
 * Puanı hesaplar. `stats` şimdilik puana katılmaz; ileride (ör. XP ağırlığı)
 * genişletme noktası olarak imzada tutulur.
 */
export function proficiencyScore(
  course: { units: { id: string; order: number; lessons: { id: string }[] }[] },
  progress: ProficiencyProgress,
  stats?: unknown,
): ProficiencyScore {
  void stats;
  let raw = 0;
  let unitsDone = 0;
  for (const unit of course.units) {
    let lessonsDone = 0;
    for (const lesson of unit.lessons) {
      if (!progress[lesson.id]?.completedAt) continue;
      lessonsDone += 1;
      raw += unit.order <= A1_MAX_UNIT_ORDER ? A1_LESSON_POINTS : A2_LESSON_POINTS;
    }
    if (lessonsDone === unit.lessons.length && unit.lessons.length > 0) unitsDone += 1;
    if (progress[`${unit.id}.story`]?.completedAt) raw += STORY_POINTS;
  }
  const score = Math.max(0, Math.min(MAX_SCORE, raw));
  const level = levelForScore(score);
  return { score, level, nextLevelAt: level === 'B1' ? MAX_SCORE : level === 'A2' ? LEVEL_B1_AT : LEVEL_A2_AT, unitsDone };
}
