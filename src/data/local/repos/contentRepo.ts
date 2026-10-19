import type { Course, Exercise, Lesson, Unit, VocabItem } from '@/domain/types';
import type { Database } from '../database';

interface CourseRow { id: string; from_lang: string; to_lang: string; title: string }
interface UnitRow { id: string; course_id: string; ord: number; title: string; description: string }
interface LessonRow { id: string; unit_id: string; ord: number; vocab_ids: string }
interface ExerciseRow { id: string; lesson_id: string; ord: number; type: string; payload: string }
interface VocabRow { id: string; course_id: string; term: string; translation: string; example: string | null }

export function createContentRepo(db: Database) {
  /** Inserts/overwrites a bundled course and all of its children. Content writes never touch the outbox. */
  async function seedContent(course: Course): Promise<void> {
    await db.transaction(async () => {
      await db.run('INSERT OR REPLACE INTO courses (id, from_lang, to_lang, title) VALUES (?, ?, ?, ?)', [
        course.id, course.fromLang, course.toLang, course.title,
      ]);
      for (const u of course.units) {
        await db.run('INSERT OR REPLACE INTO units (id, course_id, ord, title, description) VALUES (?, ?, ?, ?, ?)', [
          u.id, course.id, u.order, u.title, u.description,
        ]);
        for (const l of u.lessons) {
          await db.run('INSERT OR REPLACE INTO lessons (id, unit_id, ord, vocab_ids) VALUES (?, ?, ?, ?)', [
            l.id, u.id, l.order, JSON.stringify(l.vocabIds),
          ]);
          await db.run('DELETE FROM exercises WHERE lesson_id = ?', [l.id]);
          for (let i = 0; i < l.exercises.length; i++) {
            const e = l.exercises[i];
            await db.run('INSERT INTO exercises (id, lesson_id, ord, type, payload) VALUES (?, ?, ?, ?, ?)', [
              e.id, l.id, i, e.type, JSON.stringify(e),
            ]);
          }
        }
      }
      for (const v of course.vocab) {
        await db.run('INSERT OR REPLACE INTO vocab (id, course_id, term, translation, example) VALUES (?, ?, ?, ?, ?)', [
          v.id, v.courseId, v.term, v.translation, v.example ?? null,
        ]);
      }
    });
  }

  async function hasCourse(courseId: string): Promise<boolean> {
    const r = await db.getFirst<{ id: string }>('SELECT id FROM courses WHERE id = ?', [courseId]);
    return r !== null;
  }

  async function listCourses(): Promise<Omit<Course, 'units' | 'vocab'>[]> {
    const rows = await db.getAll<CourseRow>('SELECT * FROM courses ORDER BY id');
    return rows.map((r) => ({ id: r.id, fromLang: r.from_lang as Course['fromLang'], toLang: r.to_lang as Course['toLang'], title: r.title }));
  }

  /** Loads the full course tree (units → lessons → exercises). */
  async function getCourse(courseId: string): Promise<Course | null> {
    const c = await db.getFirst<CourseRow>('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!c) return null;
    const units = await db.getAll<UnitRow>('SELECT * FROM units WHERE course_id = ? ORDER BY ord', [courseId]);
    const result: Unit[] = [];
    for (const u of units) {
      const lessons = await db.getAll<LessonRow>('SELECT * FROM lessons WHERE unit_id = ? ORDER BY ord', [u.id]);
      const ls: Lesson[] = [];
      for (const l of lessons) {
        const ex = await db.getAll<ExerciseRow>('SELECT * FROM exercises WHERE lesson_id = ? ORDER BY ord', [l.id]);
        ls.push({
          id: l.id,
          order: l.ord,
          vocabIds: JSON.parse(l.vocab_ids) as string[],
          exercises: ex.map((e) => JSON.parse(e.payload) as Exercise),
        });
      }
      result.push({ id: u.id, order: u.ord, title: u.title, description: u.description, lessons: ls });
    }
    const vocab = await listVocab(courseId);
    return { id: c.id, fromLang: c.from_lang as Course['fromLang'], toLang: c.to_lang as Course['toLang'], title: c.title, units: result, vocab };
  }

  async function getLesson(lessonId: string): Promise<Lesson | null> {
    const l = await db.getFirst<LessonRow>('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!l) return null;
    const ex = await db.getAll<ExerciseRow>('SELECT * FROM exercises WHERE lesson_id = ? ORDER BY ord', [lessonId]);
    return { id: l.id, order: l.ord, vocabIds: JSON.parse(l.vocab_ids) as string[], exercises: ex.map((e) => JSON.parse(e.payload) as Exercise) };
  }

  async function getVocab(ids: string[]): Promise<VocabItem[]> {
    if (ids.length === 0) return [];
    const rows = await db.getAll<VocabRow>(`SELECT * FROM vocab WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    return rows.map((r) => ({ id: r.id, courseId: r.course_id, term: r.term, translation: r.translation, example: r.example ?? undefined }));
  }

  async function listVocab(courseId: string): Promise<VocabItem[]> {
    const rows = await db.getAll<VocabRow>('SELECT * FROM vocab WHERE course_id = ? ORDER BY id', [courseId]);
    return rows.map((r) => ({ id: r.id, courseId: r.course_id, term: r.term, translation: r.translation, example: r.example ?? undefined }));
  }

  return { seedContent, hasCourse, listCourses, getCourse, getLesson, getVocab, listVocab };
}

export type ContentRepo = ReturnType<typeof createContentRepo>;
