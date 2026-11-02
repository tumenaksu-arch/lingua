import { courses } from '..';
import { normalize } from '@/domain/grading';

/**
 * İ1 kapısı (plan 2026-11-02): her dersin en az bir "yeni tür" alıştırması var
 * (listen_select / picture_select / complete_chat / read_answer) ve listen_select'te
 * işaretli seçenek ses metniyle aynı (Sonnet denetiminde yakalanan tr-es hatası).
 */
const NEW_TYPES = new Set(['listen_select', 'picture_select', 'complete_chat', 'read_answer']);

describe.each(courses.map((c) => [c.id, c] as const))('course %s', (_id, course) => {
  test('every lesson has at least one new-type exercise', () => {
    const missing = course.units
      .flatMap((u) => u.lessons)
      .filter((l) => !l.exercises.some((e) => NEW_TYPES.has(e.type)))
      .map((l) => l.id);
    expect(missing).toEqual([]);
  });

  test('listen_select: the marked option is the audio text', () => {
    const bad: string[] = [];
    for (const u of course.units)
      for (const l of u.lessons)
        for (const e of l.exercises) {
          if (e.type !== 'listen_select') continue;
          if (normalize(e.options[e.correctIndex] ?? '') !== normalize(e.audioText)) bad.push(e.id);
        }
    expect(bad).toEqual([]);
  });
});
