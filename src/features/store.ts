import { create } from 'zustand';

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
  firestoreRemote,
  getCurrentUser,
  isFirebaseConfigured,
  onAuthStateChange,
  setMeta,
  signIn,
  signOut,
  signUp,
  syncNow,
  type AuthUser,
  type Database,
  type LessonProgress,
} from '@/data';

const COURSE_KEY = 'selected_course';
const ONBOARDED_KEY = 'onboarded';

interface Repos {
  stats: ReturnType<typeof createStatsRepo>;
  srs: ReturnType<typeof createSrsRepo>;
  progress: ReturnType<typeof createProgressRepo>;
}

export interface AppState {
  ready: boolean;
  /** false until the first-launch course/goal picker has been completed */
  onboarded: boolean;
  db: Database | null;
  userId: string;
  user: AuthUser | null;
  course: Course;
  stats: UserStats;
  progress: Record<string, LessonProgress>;
  dueCount: number;
  syncing: boolean;
  lastSyncError: string | null;

  boot: () => Promise<void>;
  selectCourse: (courseId: string) => Promise<void>;
  completeOnboarding: (courseId: string, dailyGoalXp: number) => Promise<void>;
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

/**
 * First sign-in on this device: copy the guest ("local") progress into the new
 * account so nothing played before creating an account is lost. Only runs when
 * the account has no stats yet (fresh account); an existing account keeps its own.
 * Writes go through the normal repos so they are queued for the next sync.
 */
async function adoptGuestProgress(db: Database, target: Repos, now: number): Promise<void> {
  const guest = reposFor(db, LOCAL_USER_ID);
  const guestStats = await guest.stats.get();
  const guestProgress = await guest.progress.all();
  if (guestStats.xp === 0 && guestProgress.length === 0) return;
  const targetStats = await target.stats.get();
  const targetProgress = await target.progress.all();
  if (targetStats.xp > 0 || targetProgress.length > 0) return;

  await target.stats.save({ ...guestStats }, now);
  for (const p of guestProgress) await target.progress.adopt(p, now);
  const cards = await guest.srs.all();
  if (cards.length) await target.srs.saveMany(cards, now);
}

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
  onboarded: false,
  db: null,
  userId: LOCAL_USER_ID,
  user: null,
  course: courses[0]!,
  stats: DEFAULT_STATS,
  progress: {},
  dueCount: 0,
  syncing: false,
  lastSyncError: null,

  async boot() {
    if (get().ready) return;
    const db = await getDb();
    const user = isFirebaseConfigured() ? await getCurrentUser() : null;
    const userId = user?.uid ?? LOCAL_USER_ID;
    repos = reposFor(db, userId);

    const onboarded = (await getMeta(db, ONBOARDED_KEY)) === '1';
    const savedCourse = await getMeta(db, COURSE_KEY);
    const course = (savedCourse && getCourse(savedCourse)) || courses[0]!;
    const now = Date.now();
    const stats = regenerate(await repos.stats.get(), now);
    const progressList = await repos.progress.all();
    const progress = Object.fromEntries(progressList.map((p) => [p.lessonId, p]));
    const dueCount = await repos.srs.countDue(now, `${course.id}.`);

    set({ ready: true, onboarded, db, userId, user, course, stats, progress, dueCount });

    if (isFirebaseConfigured()) {
      authUnsub?.();
      authUnsub = onAuthStateChange(async (u) => {
        const uid = u?.uid ?? LOCAL_USER_ID;
        if (uid === get().userId) {
          set({ user: u });
          return;
        }
        const next = reposFor(db, uid);
        if (u) await adoptGuestProgress(db, next, Date.now());
        repos = next;
        const st = regenerate(await repos.stats.get(), Date.now());
        const pl = await repos.progress.all();
        set({ user: u, userId: uid, stats: st, progress: Object.fromEntries(pl.map((p) => [p.lessonId, p])) });
        set({ dueCount: await repos.srs.countDue(Date.now(), `${get().course.id}.`) });
        if (u) void get().sync();
      });
      if (user) void get().sync();
    }
  },

  async selectCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) throw new Error(`Unknown course ${courseId}`);
    const { db } = get();
    if (db) await setMeta(db, COURSE_KEY, courseId);
    set({ course });
    if (repos) set({ dueCount: await repos.srs.countDue(Date.now(), `${course.id}.`) });
  },

  async completeOnboarding(courseId, dailyGoalXp) {
    await get().selectCourse(courseId);
    await get().setDailyGoal(dailyGoalXp);
    const { db } = get();
    if (db) await setMeta(db, ONBOARDED_KEY, '1');
    set({ onboarded: true });
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
    set({ dueCount: await r.srs.countDue(now, `${get().course.id}.`) });
    void get().sync();
    return { xpEarned: outcome.xpEarned, dailyGoalJustReached: outcome.dailyGoalJustReached };
  },

  async saveStats(stats) {
    await requireRepos().stats.save(stats, Date.now());
    set({ stats });
  },

  async loadDueCards(limit = 20) {
    return requireRepos().srs.due(Date.now(), limit, `${get().course.id}.`);
  },

  async reviewCard(card, correct, responseMs) {
    const r = requireRepos();
    const now = Date.now();
    await r.srs.saveMany([review(card, gradeFromOutcome(correct, responseMs), now)], now);
    set({ dueCount: await r.srs.countDue(now, `${get().course.id}.`) });
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
    const remote = firestoreRemote();
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
        dueCount: await r.srs.countDue(now, `${get().course.id}.`),
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
