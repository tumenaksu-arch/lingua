import { courses } from '..';

/**
 * İ3 kapısı (plan 2026-11-02): her kelime en az bir dersin `vocabIds` listesinde
 * (SRS kartı yalnız oradan doğar) ve kurs başına kelime sayısı A2 hedefinin altına
 * düşmez. Kelime sayısı hedefleri İ3 dalgası bittikçe yükseltilir.
 */
/** Bilinen eş-yazımlılar (isim/fiil): yeni eklemeler bu listeye GİRMEZ, farklı term seçilir. */
const HOMOGRAPHS = new Set(['tr-en.bookv']);

const MIN_VOCAB: Record<string, number> = { 'tr-en': 296, 'tr-de': 218, 'tr-es': 217, 'tr-fr': 220, 'tr-it': 236 };

describe.each(courses.map((c) => [c.id, c] as const))('course %s', (id, course) => {
  test('every vocab item is attached to at least one lesson', () => {
    const used = new Set(course.units.flatMap((u) => u.lessons.flatMap((l) => l.vocabIds)));
    const orphans = course.vocab.filter((v) => !used.has(v.id)).map((v) => v.id);
    expect(orphans).toEqual([]);
  });

  test('vocab terms are unique within the course (case-insensitive)', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const v of course.vocab) {
      const k = v.term.toLocaleLowerCase('tr');
      if (HOMOGRAPHS.has(v.id)) continue;
      if (seen.has(k)) dups.push(`${v.id}=${seen.get(k)}`);
      else seen.set(k, v.id);
    }
    expect(dups).toEqual([]);
  });

  test('vocab count does not shrink below the wave target', () => {
    expect(course.vocab.length).toBeGreaterThanOrEqual(MIN_VOCAB[id] ?? 0);
  });
});
