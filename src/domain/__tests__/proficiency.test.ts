import { course, lesson, listen, unit } from '@/content/builder';

import {
  LEVEL_A2_AT,
  LEVEL_B1_AT,
  MAX_SCORE,
  levelForScore,
  proficiencyScore,
  type ProficiencyProgress,
} from '../proficiency';

/** n units × 4 lessons of listen exercises, ids '<id>.u<k>.l<j>'. */
function makeCourse(id: string, nUnits: number) {
  const units = Array.from({ length: nUnits }, (_, i) => {
    const k = i + 1;
    return unit(
      `${id}.u${k}`,
      k,
      `Ünite ${k}`,
      'tanım',
      [1, 2, 3, 4].map((j) => lesson(`${id}.u${k}.l${j}`, j, [], [listen(`Sentence ${k}-${j}.`)])),
    );
  });
  return course({ id, fromLang: 'tr', toLang: 'en', title: 'Test' }, [], units);
}

function completed(courseId: string, nUnits: number, { stories = 0 } = {}): ProficiencyProgress {
  const p: ProficiencyProgress = {};
  for (let k = 1; k <= nUnits; k++) {
    for (let j = 1; j <= 4; j++) p[`${courseId}.u${k}.l${j}`] = { completedAt: 1 };
    if (k <= stories) p[`${courseId}.u${k}.story`] = { completedAt: 1 };
  }
  return p;
}

describe('levelForScore', () => {
  test('sınırlar: <30 A1, 30–79 A2, ≥80 B1', () => {
    expect(levelForScore(0)).toBe('A1');
    expect(levelForScore(29)).toBe('A1');
    expect(levelForScore(30)).toBe('A2');
    expect(levelForScore(79)).toBe('A2');
    expect(levelForScore(80)).toBe('B1');
    expect(levelForScore(MAX_SCORE)).toBe('B1');
  });
});

describe('proficiencyScore', () => {
  test('hiç ders yok → 0 puan, A1, sıradaki sınır 30', () => {
    const r = proficiencyScore(makeCourse('c1', 16), {});
    expect(r).toEqual({ score: 0, level: 'A1', nextLevelAt: LEVEL_A2_AT, unitsDone: 0 });
  });

  test('8 ünite (32 ders × 1 puan) → 32 puan, A2 sınırı aşıldı', () => {
    const r = proficiencyScore(makeCourse('c2', 16), completed('c2', 8));
    expect(r.score).toBe(32);
    expect(r.level).toBe('A2');
    expect(r.nextLevelAt).toBe(LEVEL_B1_AT);
    expect(r.unitsDone).toBe(8);
  });

  test('16 ünite: 32 + 8×4×1.5 = 80 → B1 eşiği', () => {
    const r = proficiencyScore(makeCourse('c3', 16), completed('c3', 16));
    expect(r.score).toBe(80);
    expect(r.level).toBe('B1');
    expect(r.nextLevelAt).toBe(MAX_SCORE);
    expect(r.unitsDone).toBe(16);
  });

  test('hikâyeler ünite başına +1 puan', () => {
    const r = proficiencyScore(makeCourse('c4', 16), completed('c4', 8, { stories: 3 }));
    expect(r.score).toBe(32 + 3);
    expect(r.level).toBe('A2');
  });

  test('8 üniteli kursta taşma yok: maksimum A2', () => {
    const r = proficiencyScore(makeCourse('c5', 8), completed('c5', 8, { stories: 8 }));
    expect(r.score).toBe(32 + 8);
    expect(r.score).toBeLessThan(LEVEL_B1_AT);
    expect(r.level).toBe('A2');
  });

  test('yarım ünite sayılmaz; tamamlanmamış ders puan vermez', () => {
    const p = completed('c6', 8);
    delete p['c6.u2.l4'];
    const r = proficiencyScore(makeCourse('c6', 8), p);
    expect(r.score).toBe(31);
    expect(r.unitsDone).toBe(7);
  });

  test('9. üniteden itibaren dersler 1.5 puan', () => {
    const p: ProficiencyProgress = { 'c7.u9.l1': { completedAt: 1 } };
    const r = proficiencyScore(makeCourse('c7', 16), p);
    expect(r.score).toBe(1.5);
    expect(r.level).toBe('A1');
  });

  test('puan 130 ile sınırlı', () => {
    const p = completed('c8', 16, { stories: 16 });
    const r = proficiencyScore(makeCourse('c8', 16), p);
    expect(r.score).toBeLessThanOrEqual(MAX_SCORE);
  });

  test('stats parametresi kabul edilir (şimdilik puana etki etmez)', () => {
    const r = proficiencyScore(makeCourse('c9', 16), completed('c9', 8), { xp: 500 });
    expect(r.score).toBe(32);
  });
});
