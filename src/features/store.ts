import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

import { courses, getCourse } from '@/content';
import {
  applyLessonResult,
  createCard,
  gradeFromOutcome,
  localDateString,
  regenerate,
  review,
  type Course,
  type LessonResult,
  type SrsCard,
  type UserStats,
} from '@/domain';
import {
  DEFAULT_STATS,
  LOCAL_USER_ID,
  createProgressRepo,
  createSrsRepo,
  createStatsRepo,
  getDb,
  getMeta,
  getSession,
  isSupabaseConfigured,
  onAuthStateChange,
  setMeta,
  signIn,
  signOut,
  signUp,
  supabaseRemote,
  syncNow,
  type Database,
  type LessonProgress,
} from '@/data';

const COURSE_KEY = 'selected_course';

interface Repos {
  stats: ReturnType<typeof createStatsRepo>;
  srs: ReturnType<typeof createSrsRepo>;
  progress: ReturnType<typeof createProgressRepo>;
}

export interface AppState {
  ready: boolean;
  db: Database | null;
  userId: string;
  session: Session | null;
  course: Course;
  stats: UserStats;
  progress: Record<string, LessonProgress>;
  dueCount: number;
  syncing: boolean;
  lastSyncError: string | null;

  boot: () => Promise<void>;
  selectCourse: (courseId: string) => Promise<void>;
  /** Called by the lesson screen when a lesson is finished (not failed). */
  finishLesson: (result: LessonResult) => Promise<{ xpEarned: number; dailyGoalJustReached: boolean }>;
  /** Called by the lesson screen for each lost heart so the regen clock persists. */
  saveStats: (stats: UserStats) => Promise<void>;
  loadDueCards: (limit?: number) => Promise<SrsCard[]>;
  reviewCard: (card: SrsCard, correct: boolean, responseMs: number) => Promise<void>;
  setDailyGoal: (xp: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sync: () => Promise<void>;
}

function reposFor(db: Database, userId: string): Repos {
  return {
    stats: createStatsRepo(db, userId),
    srs: createSrsRepo(db, userId),
    progress: createProgressRepo(db, userId),
  };
}

let repos: Repos | null = null;
let authUnsub: (() => void) | null = null;

function requireRepos(): Repos {
  if (!repos) throw new Error('Store not booted');
  return repos;
}

/** Ensures every vocab item in a lesson has an SRS card, creating missing ones. */
async function ensureCards(srs: Repos['srs'], vocabIds: string[], now: number): Promise<Map<string, SrsCard>> {
  const existing = new Map((await srs.all()).map((c) => [c.vocabId, c]));
  const created: SrsCard[] = [];
  for (const id of vocabIds) {
    if (!existing.has(id)) {
      const c = createCard(id, now);
      existing.set(id, c);
      created.push(c);
    }
  }
  if (created.length) await srs.saveMany(created, now);
  return existing;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  db: null,
  userId: LOCAL_USER_ID,
  session: null,
  course: courses[0]!,
  stats: DEFAULT_STATS,
  progress: {},
  dueCount: 0,
  syncing: false,
  lastSyncError: null,

  async boot() {
    if (get().ready) return;
    const db = await getDb();
    const session = isSupabaseConfigured() ? await getSession() : null;
    const userId = session?.user.id ?? LOCAL_USER_ID;
    repos = reposFor(db, userId);

    const savedCourse = await getMeta(db, COURSE_KEY);
    const course = (savedCourse && getCourse(savedCourse)) || courses[0]!;
    const now = Date.now();
    const stats = regenerate(await repos.stats.get(), now);
    const progressList = await repos.progress.all();
    const progress = Object.fromEntries(progressList.map((p) => [p.lessonId, p]));
    const dueCount = await repos.srs.countDue(now);

    set({ ready: true, db, userId, session, course, stats, progress, dueCount });

    if (isSupabaseConfigured()) {
      authUnsub?.();
      authUnsub = onAuthStateChange(async (s) => {
        const uid = s?.user.id ?? LOCAL_USER_ID;
        if (uid === get().userId) {
          set({ session: s });
          return;
        }
        repos = reposFor(db, uid);
        const st = regenerate(await repos.stats.get(), Date.now());
        const pl = await repos.progress.all();
        set({ session: s, userId: uid, stats: st, progress: Object.fromEntries(pl.map((p) => [p.lessonId, p])) });
        if (s) void get().sync();
      });
      if (session) void get().sync();
    }
  },

  async selectCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) throw new Error(`Unknown course ${courseId}`);
    const { db } = get();
    if (db) await setMeta(db, COURSE_KEY, courseId);
    set({ course });
  },

  async finishLesson(result) {
    const r = requireRepos();
    const now = Date.now();
    const outcome = applyLessonResult(get().stats, result, now, localDateString(new Date()));
    await r.stats.save(outcome.stats, now);
    const lp = await r.progress.completeLesson(result.lessonId, now);
    await r.progress.logEvent(`${result.lessonId}:${now}`, 'lesson_completed', {
      xp: outcome.xpEarned,
      correct: result.correct,
      total: result.total,
      durationMs: result.durationMs,
    }, now);

    const vocabIds = Object.keys(result.vocabOutcomes);
    const cards = await ensureCards(r.srs, vocabIds, now);
    const reviewed = vocabIds.map((id) =>
      review(cards.get(id)!, gradeFromOutcome(result.vocabOutcomes[id]!, 4000), now),
    );
    if (reviewed.length) await r.srs.saveMany(reviewed, now);

    set((s) => ({
      stats: outcome.stats,
      progress: { ...s.progress, [lp.lessonId]: lp },
    }));
    set({ dueCount: await r.srs.countDue(now) });
    void get().sync();
    return { xpEarned: outcome.xpEarned, dailyGoalJustReached: outcome.dailyGoalJustReached };
  },

  async saveStats(stats) {
    await requireRepos().stats.save(stats, Date.now());
    set({ stats });
  },

  async loadDueCards(limit = 20) {
    return requireRepos().srs.due(Date.now(), limit);
  },

  async reviewCard(card, correct, responseMs) {
    const r = requireRepos();
    const now = Date.now();
    await r.srs.saveMany([review(card, gradeFromOutcome(correct, responseMs), now)], now);
    set({ dueCount: await r.srs.countDue(now) });
  },

  async setDailyGoal(xp) {
    await get().saveStats({ ...get().stats, dailyGoalXp: xp });
  },

  async signIn(email, password) {
    await signIn(email, password); // onAuthStateChange swaps repos + syncs
  },

  async signUp(email, password) {
    await signUp(email, password);
  },

  async signOut() {
    await signOut();
  },

  async sync() {
    const { db, userId, syncing } = get();
    const remote = supabaseRemote();
    if (!db || !remote || userId === LOCAL_USER_ID || syncing) return;
    set({ syncing: true, lastSyncError: null });
    try {
      await syncNow({ db, remote, userId });
      const r = requireRepos();
      const now = Date.now();
      const pl = await r.progress.all();
      set({
        stats: regenerate(await r.stats.get(), now),
        progress: Object.fromEntries(pl.map((p) => [p.lessonId, p])),
        dueCount: await r.srs.countDue(now),
      });
    } catch (e) {
      set({ lastSyncError: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ syncing: false });
    }
  },
}));

/** Lesson ids in path order for the active course. */
export function lessonOrder(course: Course): string[] {
  return course.units.flatMap((u) => u.lessons.map((l) => l.id));
}

/** The first lesson that has not been completed yet. */
export function activeLessonId(course: Course, progress: Record<string, LessonProgress>): string | null {
  return lessonOrder(course).find((id) => !progress[id]?.completedAt) ?? null;
}
