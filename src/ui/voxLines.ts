/**
 * Encouragement lines Vox says on the lesson-complete screen (Turkish).
 * Picked deterministically from the lesson id, so the same lesson always
 * gets the same line.
 */
export const VOX_LINES: readonly string[] = [
  'Harikasın, böyle devam et!',
  'Bugünkü ders bitti, gurur duyuyorum!',
  'Tüylerim diken diken oldu, ne kadar iyisin!',
  'Her doğru cevap seni bir adım ileri taşıdı.',
  'Gak guk! Bu ders senin eserin.',
  'Serin uzuyor, sen büyüyorsun!',
  'Bir ders daha bitti, dilin ilerliyor.',
  'Keskin gagan gibi zekisin!',
  'Bugün de konuştuk, bugün de öğrendik.',
  'Kanatlarımı çırpıyorum, senin için!',
  'Mükemmel! Yarın yine buradayım.',
  'Yavaş yavaş da olsa, hep ileriye.',
  'Bu tempoyla akıcı konuşmak çok yakın!',
  'Öğrenmek sana çok yakışıyor.',
];

/** Deterministic pick: the same lesson id always returns the same line. */
export function voxLineForLesson(id: string): string {
  // djb2-style hash — stable across runs and platforms.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return VOX_LINES[h % VOX_LINES.length]!;
}
