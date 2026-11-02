import { courses } from '..';

/**
 * Ünite başlıkları bir kurs içinde benzersiz olmalı — yol ekranı, ödev listesi ve
 * atlama sınavı başlığı ünitenin adıyla anons edilir; çakışan başlıklar ekran
 * okuyucuda ve listede ayırt edilemez. İçerik dalgaları büyürken konu tekrarı
 * olursa başlık (ya da alt başlığı) içeriği yansıtacak şekilde ayrıştırılır.
 */
describe('unit titles', () => {
  test.each(courses.map((c) => [c.id, c] as const))('%s: unit titles are unique', (_id, course) => {
    const titles = course.units.map((u) => u.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test.each(courses.map((c) => [c.id, c] as const))('%s: unit titles are non-empty', (_id, course) => {
    for (const u of course.units) {
      expect(u.title.trim().length).toBeGreaterThan(0);
    }
  });
});
