import { exerciseTypeLabel, summarizeStruggles, unitOfLesson } from '../struggles';

describe('unitOfLesson', () => {
  it('strips the lesson part of regular lesson ids and story ids', () => {
    expect(unitOfLesson('tr-en.u3.l2')).toBe('tr-en.u3');
    expect(unitOfLesson('tr-en.u10.story')).toBe('tr-en.u10');
  });

  it('keeps ids without a lesson part unchanged', () => {
    expect(unitOfLesson('tr-en.u3')).toBe('tr-en.u3');
  });
});

describe('exerciseTypeLabel', () => {
  it('maps the six exercise types to Turkish labels', () => {
    expect(exerciseTypeLabel('select_translation')).toBe('Çeviri seçme');
    expect(exerciseTypeLabel('listen_type')).toBe('Dinleme');
    expect(exerciseTypeLabel('unknown_future_type')).toBe('unknown_future_type');
  });
});

describe('summarizeStruggles', () => {
  it('aggregates per unit, sorts ascending by accuracy and merges mistakes desc', () => {
    const { byUnit, byType } = summarizeStruggles([
      {
        lessonId: 'tr-en.u1.l1',
        attempts: 2,
        correct: 8,
        total: 10,
        mistakesByType: { select_translation: 2, fill_blank: 1 },
      },
      {
        lessonId: 'tr-en.u1.l2',
        attempts: 1,
        correct: 9,
        total: 10,
        mistakesByType: { select_translation: 1 },
      },
      {
        lessonId: 'tr-en.u2.l1',
        attempts: 1,
        correct: 2,
        total: 10,
        mistakesByType: { listen_type: 5 },
      },
      {
        lessonId: 'tr-en.u2.story',
        attempts: 1,
        correct: 2,
        total: 0, // no answers recorded → accuracy 0 but no answers to weight it
        mistakesByType: {},
      },
    ]);

    expect(byUnit).toHaveLength(2);
    // Worst accuracy first: u2 (0.2 with 10 answers) before u1 (0.85).
    expect(byUnit[0]).toMatchObject({
      unitId: 'tr-en.u2',
      correct: 4,
      total: 10,
      attempts: 2,
      accuracy: 0.4,
      mistakesByType: { listen_type: 5 },
    });
    expect(byUnit[1]).toMatchObject({
      unitId: 'tr-en.u1',
      correct: 17,
      total: 20,
      attempts: 3,
      accuracy: 0.85,
      mistakesByType: { select_translation: 3, fill_blank: 1 },
    });

    // Merged over all units, sorted by count descending, Turkish labels.
    expect(byType).toEqual([
      { type: 'listen_type', label: 'Dinleme', count: 5 },
      { type: 'select_translation', label: 'Çeviri seçme', count: 3 },
      { type: 'fill_blank', label: 'Boşluk doldurma', count: 1 },
    ]);
  });

  it('breaks accuracy ties by more recorded answers first', () => {
    const { byUnit } = summarizeStruggles([
      { lessonId: 'c.u1.l1', attempts: 1, correct: 1, total: 2, mistakesByType: {} },
      { lessonId: 'c.u2.l1', attempts: 1, correct: 5, total: 10, mistakesByType: {} },
    ]);
    expect(byUnit.map((u) => u.unitId)).toEqual(['c.u2', 'c.u1']);
  });

  it('returns empty results for no rows and handles rows without mistakes', () => {
    expect(summarizeStruggles([])).toEqual({ byUnit: [], byType: [] });
    const { byUnit, byType } = summarizeStruggles([
      { lessonId: 'c.u1.l1', attempts: 1, correct: 0, total: 0, mistakesByType: {} },
    ]);
    expect(byUnit[0].accuracy).toBe(0);
    expect(byType).toEqual([]);
  });
});
