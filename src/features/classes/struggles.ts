/**
 * Pure helper for the "Zorlanılanlar" tab (madde 5, wave 1 — no network
 * here): it turns the class_struggles RPC rows (per-lesson attempts, correct
 * /total answer counts and mistakes_by_type maps) into what the teacher
 * screen shows — per-unit accuracy sorted ascending (worst first) and the
 * mistakes merged per exercise type, sorted descending.
 */

/** One class_struggles row, exactly as the RPC returns it. */
export interface StruggleSourceRow {
  lessonId: string;
  attempts: number;
  correct: number;
  total: number;
  mistakesByType: Record<string, number>;
}

/** Aggregated per unit: accuracy = correct/total over all its lessons' events. */
export interface UnitStruggle {
  unitId: string;
  correct: number;
  total: number;
  attempts: number;
  /** 0..1; 0 when no answers were recorded (total = 0). */
  accuracy: number;
  mistakesByType: Record<string, number>;
}

export interface MergedMistake {
  /** The raw exercise type from mistakes_by_type (e.g. 'select_translation'). */
  type: string;
  label: string;
  count: number;
}

/**
 * Turkish labels for the exercise types a lesson's mistakes_by_type payload
 * carries (the app has generic per-type hints but no display labels, so the
 * labels live here). Unknown future types fall back to the raw type string.
 */
export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  select_translation: 'Çeviri seçme',
  translate_build: 'Cümle kurma',
  match_pairs: 'Eşleştirme',
  listen_type: 'Dinleme',
  speak: 'Konuşma',
  fill_blank: 'Boşluk doldurma',
  listen_select: 'Duyduğuna dokunma',
  picture_select: 'Resimli kelime seçme',
  complete_chat: 'Sohbeti tamamlama',
  read_answer: 'Okuma ve cevaplama',
};

/** 'tr-en.u3.l2' / 'tr-en.u3.story' → 'tr-en.u3'; ids already at unit level stay as-is. */
export function unitOfLesson(lessonId: string): string {
  return lessonId.replace(/\.(l\d+|story)$/, '');
}

export function exerciseTypeLabel(type: string): string {
  return EXERCISE_TYPE_LABELS[type] ?? type;
}

/**
 * Per-unit accuracy rows sorted ascending (worst accuracy first; ties broken
 * by more recorded answers first) plus the mistakes_by_type maps merged over
 * every unit, sorted by count descending.
 */
export function summarizeStruggles(rows: readonly StruggleSourceRow[]): {
  byUnit: UnitStruggle[];
  byType: MergedMistake[];
} {
  const units = new Map<string, UnitStruggle>();
  for (const row of rows) {
    const unitId = unitOfLesson(row.lessonId);
    const entry = units.get(unitId) ?? {
      unitId,
      correct: 0,
      total: 0,
      attempts: 0,
      accuracy: 0,
      mistakesByType: {},
    };
    entry.correct += row.correct;
    entry.total += row.total;
    entry.attempts += row.attempts;
    for (const [type, count] of Object.entries(row.mistakesByType)) {
      entry.mistakesByType[type] = (entry.mistakesByType[type] ?? 0) + count;
    }
    units.set(unitId, entry);
  }
  const byUnit = [...units.values()].map((u) => ({
    ...u,
    accuracy: u.total > 0 ? u.correct / u.total : 0,
  }));
  byUnit.sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  const typeTotals = new Map<string, number>();
  for (const unit of byUnit) {
    for (const [type, count] of Object.entries(unit.mistakesByType)) {
      typeTotals.set(type, (typeTotals.get(type) ?? 0) + count);
    }
  }
  const byType = [...typeTotals.entries()]
    .map(([type, count]) => ({ type, label: exerciseTypeLabel(type), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));

  return { byUnit, byType };
}
