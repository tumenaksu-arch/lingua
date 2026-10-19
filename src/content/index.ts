import type { Course, VocabItem } from '@/domain/types';
import { trDe } from './tr-de';
import { trEn } from './tr-en';
import { trEs } from './tr-es';

/** Bundled courses, in the order shown on the course picker. */
export const courses: readonly Course[] = [trEn, trDe, trEs];

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getVocab(courseId: string): VocabItem[] {
  return getCourse(courseId)?.vocab ?? [];
}

export { tokenize } from './builder';
