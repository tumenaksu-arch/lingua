/**
 * voxLines: ders bitiş ekranında Vox'un söylediği teşvik cümleleri.
 * Belirlenimci seçim (aynı ders id'si → aynı cümle) ve ≥12 benzersiz cümle.
 */
import { VOX_LINES, voxLineForLesson } from '../voxLines';

describe('voxLines', () => {
  it('has at least 12 unique lines', () => {
    expect(VOX_LINES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(VOX_LINES).size).toBe(VOX_LINES.length);
  });

  it('picks deterministically: the same lesson id always gets the same line', () => {
    expect(voxLineForLesson('u1.l1')).toBe(voxLineForLesson('u1.l1'));
    expect(voxLineForLesson('u3.l2')).toBe(voxLineForLesson('u3.l2'));
  });

  it('spreads different ids across the lines (every line is reachable)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000 && seen.size < VOX_LINES.length; i++) {
      seen.add(voxLineForLesson(`ders-${i}`));
    }
    expect(seen.size).toBe(VOX_LINES.length);
  });

  it('always returns a line from the list, also for unusual ids', () => {
    for (const id of ['', 'x', 'dérs-ıd-😀']) {
      expect(VOX_LINES).toContain(voxLineForLesson(id));
    }
  });
});
