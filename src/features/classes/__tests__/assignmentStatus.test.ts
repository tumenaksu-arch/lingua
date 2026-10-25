import type { Course, Lesson, Unit } from '@/domain/types';

import { assignmentStatus } from '../assignmentStatus';

function lesson(id: string): Lesson {
  return { id, order: 0, exercises: [], vocabIds: [] };
}

function unit(id: string, lessonIds: string[]): Unit {
  return { id, order: 0, title: '', description: '', lessons: lessonIds.map(lesson) };
}

const COURSE: Course = {
  id: 'tr-en',
  fromLang: 'tr',
  toLang: 'en',
  title: 'İngilizce',
  vocab: [],
  units: [unit('tr-en.u1', ['tr-en.u1.l1', 'tr-en.u1.l2']), unit('tr-en.u2', ['tr-en.u2.l1'])],
};

const WED = new Date(2026, 9, 21, 15, 0, 0); // local Wednesday
const FRI = new Date(2026, 9, 23, 9, 0, 0); // local Friday (deadline day)
const SAT = new Date(2026, 9, 24, 9, 0, 0); // local Saturday (after deadline)

describe('assignmentStatus', () => {
  it('reports bitti with full counts when every lesson of the unit is completed', () => {
    const result = assignmentStatus(
      COURSE,
      { unitId: 'tr-en.u1', sonTarih: '2026-10-23' },
      ['tr-en.u1.l2', 'tr-en.u1.l1'],
      SAT, // even past the deadline a finished unit stays bitti
    );
    expect(result).toEqual({ status: 'bitti', completedLessons: 2, totalLessons: 2 });
  });

  it('reports devam before the deadline while lessons are missing', () => {
    const result = assignmentStatus(
      COURSE,
      { unitId: 'tr-en.u1', sonTarih: '2026-10-23' },
      ['tr-en.u1.l1'],
      WED,
    );
    expect(result).toEqual({ status: 'devam', completedLessons: 1, totalLessons: 2 });
  });

  it('counts a completed skip test: all lessons completed counts as done', () => {
    // Passing a unit's skip test writes completed rows for every lesson, so a
    // unit with lessons never opened individually still reads as bitti.
    const result = assignmentStatus(
      COURSE,
      { unitId: 'tr-en.u2', sonTarih: '2026-10-23' },
      ['tr-en.u2.l1'],
      WED,
    );
    expect(result.status).toBe('bitti');
  });

  it('reports gecikti on the day after the inclusive deadline', () => {
    expect(
      assignmentStatus(COURSE, { unitId: 'tr-en.u1', sonTarih: '2026-10-23' }, ['tr-en.u1.l1'], SAT).status,
    ).toBe('gecikti');
    // On the deadline day itself it is still devam.
    expect(
      assignmentStatus(COURSE, { unitId: 'tr-en.u1', sonTarih: '2026-10-23' }, ['tr-en.u1.l1'], FRI).status,
    ).toBe('devam');
  });

  it('ignores completed lessons from other units', () => {
    const result = assignmentStatus(
      COURSE,
      { unitId: 'tr-en.u2', sonTarih: '2026-10-23' },
      ['tr-en.u1.l1', 'tr-en.u1.l2'],
      WED,
    );
    expect(result).toEqual({ status: 'devam', completedLessons: 0, totalLessons: 1 });
  });

  it('degrades gracefully for an unknown unit or course', () => {
    expect(
      assignmentStatus(COURSE, { unitId: 'tr-en.u99', sonTarih: '2026-10-23' }, [], WED),
    ).toEqual({ status: 'devam', completedLessons: 0, totalLessons: 0 });
    expect(
      assignmentStatus(undefined, { unitId: 'tr-en.u1', sonTarih: '2026-10-23' }, [], SAT),
    ).toEqual({ status: 'gecikti', completedLessons: 0, totalLessons: 0 });
  });
});
