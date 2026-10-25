import type { Course } from '@/domain/types';

/**
 * Pure helper for the assignment card (madde 5, wave 1 — no network here).
 * An assignment is done ('bitti') when ALL lessons of its unit are completed
 * (finishing every lesson, e.g. via a passed skip test, also writes the
 * completed user_progress rows, so completion is exactly "every lesson id of
 * the unit is in the member's completed lesson ids"). When the deadline
 * ('YYYY-MM-DD', inclusive) has passed and the unit is not done yet the
 * assignment is 'gecikti', otherwise 'devam'.
 */

export type AssignmentStatus = 'bitti' | 'devam' | 'gecikti';

export interface AssignmentStatusInput {
  unitId: string;
  /** Deadline 'YYYY-MM-DD' (inclusive, local date). */
  sonTarih: string;
}

export interface AssignmentStatusResult {
  status: AssignmentStatus;
  completedLessons: number;
  totalLessons: number;
}

/** The device's local date as 'YYYY-MM-DD' (same convention as son_tarih). */
function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param course             The course content (getCourse result) the class teaches.
 * @param assignment         The assignment with its unit and deadline.
 * @param completedLessonIds The member's completed lesson ids (user_progress
 *                           rows with completed_at set).
 * @param today              The local "today" used for the deadline comparison.
 */
export function assignmentStatus(
  course: Course | undefined,
  assignment: AssignmentStatusInput,
  completedLessonIds: Iterable<string>,
  today: Date,
): AssignmentStatusResult {
  const completed = new Set(completedLessonIds);
  const unit = course?.units.find((u) => u.id === assignment.unitId);
  const totalLessons = unit?.lessons.length ?? 0;
  const doneLessons = unit ? unit.lessons.filter((l) => completed.has(l.id)).length : 0;
  const done = totalLessons > 0 && doneLessons === totalLessons;
  const status: AssignmentStatus = done
    ? 'bitti'
    : localDateIso(today) > assignment.sonTarih
      ? 'gecikti'
      : 'devam';
  return { status, completedLessons: doneLessons, totalLessons };
}
