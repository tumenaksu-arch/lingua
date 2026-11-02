import { courses, getCourse } from '@/content';

import { unitLevel } from '../unitLevel';

describe('unitLevel', () => {
  const trEn = getCourse('tr-en')!;

  test('tr-en boundary units', () => {
    const byOrder = new Map(trEn.units.map((u) => [u.order, u]));
    expect(unitLevel(byOrder.get(1)!)).toBe('A1');
    expect(unitLevel(byOrder.get(8)!)).toBe('A1');
    expect(unitLevel(byOrder.get(9)!)).toBe('A2');
    expect(unitLevel(byOrder.get(13)!)).toBe('A2');
    expect(unitLevel(byOrder.get(20)!)).toBe('A2');
  });

  test('tr-de u16 is A2', () => {
    const trDe = getCourse('tr-de')!;
    expect(unitLevel(trDe.units.find((u) => u.order === 16)!)).toBe('A2');
  });

  test('all released units are A1 or A2 (no B1 content yet)', () => {
    const all = courses.flatMap((c) => c.units);
    expect(all).toHaveLength(84);
    for (const u of all) {
      expect(['A1', 'A2']).toContain(unitLevel(u));
      expect(unitLevel(u)).not.toBe('B1');
    }
  });
});
