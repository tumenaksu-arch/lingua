import { create } from 'zustand';

import { courses, getCourse } from '@/content';
import {
  advanceGoalStreak,
  applyActivity,
  applyLessonResult,
  createCard,
  evaluate as evaluateAchievements,
  type GoalStreak,
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
  sendPasswordReset,
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
const WELCOMED_KEY = 'welcomed';
const ACHIEVEMENTS_KEY = 'achievements';
const REVIEWED_COUNT_KEY = 'srs_reviewed_count';
const REVIEW_SESSIONS_KEY = 'srs_review_sessions';
const GOAL_STREAK_KEY = 'goal_streak';
const REMINDER_KEY = 'reminder_hour';

/** Story XP: base 10, +2 per correct comprehension answer (roadmap item 2). */
export const STORY_BASE_XP = 10;
export const STORY_PER_CORRECT_XP = 2;
/** Flat XP for re-completing an already completed story. */
export const STORY_REPEAT_XP = 5;

export function storyXp(correct: number): number {
  return STORY_BASE_XP + STORY_PER_CORRECT_XP * correct;
}

interface Repos {
  stats: ReturnType<typeof createStatsRepo>;
  srs: ReturnType<typeof createSrsRepo>;
  progress: ReturnType<typeof createProgressRepo>;
}

export interface AppState {
  ready: boolean;
  /** false until the first-launch course/goal picker has been completed */
  onboarded: boolean;
  /**
   * false while the welcome (sign-in) screen should be shown: signed out and "Hesapsız dene"
   * not chosen. Always true when Firebase is not configured (accounts are unavailable).
   */
  welcomed: boolean;
  db: Database | null;
  userId: string;
  user: AuthUser | null;
  course: Course;
  stats: UserStats;
  progress: Record<string, LessonProgress>;
  dueCount: number;
  syncing: boolean;
  lastSyncError: string | null;
  /** unlocked achievement ids, catalogue order not guaranteed */
  achievements: string[];
  /** ids unlocked by the last action, for a one-time celebration; cleared by `ackAchievements` */
  newAchievements: string[];
  /** hour of the daily reminder, null when off */
  reminderHour: number | null;

  boot: () => Promise<void>;
  selectCourse: (courseId: string) => Promise<void>;
  completeOnboarding: (courseId: string, dailyGoalXp: number) => Promise<void>;
  /** Called by the lesson screen when a lesson is finished (not failed). */
  finishLesson: (result: LessonResult) => Promise<{ xpEarned: number; dailyGoalJustReached: boolean }>;
  /**
   * Called by the story screen when a story is finished. Story ids are
   * '<unitId>.story' and are stored as progress rows like lessons (they are
   * not in lessonOrder, so they never gate the learning path).
   */
  finishStory: (storyId: string, correct: number, total: number) => Promise<{ xpEarned: number }>;
  /** Called by the lesson screen for each lost heart so the regen clock persists. */
  saveStats: (stats: UserStats) => Promise<void>;
  loadDueCards: (limit?: number) => Promise<SrsCard[]>;
  reviewCard: (card: SrsCard, correct: boolean, responseMs: number) => Promise<void>;
  setDailyGoal: (xp: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Firebase password-reset e-mail for the address typed in the sign-in form. */
  resetPassword: (email: string) => Promise<void>;
  /** "Hesapsız dene": leaves the welcome screen without an account. */
  continueAsGuest: () => Promise<void>;
  sync: () => Promise<void>;
  /** Marks the start of a review session (achievement counter). */
  startReviewSession: () => Promise<void>;
  ackAchievements: () => void;
  setReminderHour: (hour: number | null) => Promise<void>;
  /** XP earned per day for the last 7 days, oldest first (index 6 = today). */
  weeklyXp: () => Promise<number[]>;
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

async function markWelcomed(value: boolean): Promise<void> {
  const { db } = useAppStore.getState();
  if (db) await setMeta(db, WELCOMED_KEY, value ? '1' : '0');
  useAppStore.setState({ welcomed: value || !isFirebaseConfigured() });
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

async function getNumberMeta(db: Database, key: string): Promise<number> {
  return Number((await getMeta(db, key)) ?? 0) || 0;
}

async function getGoalStreak(db: Database): Promise<GoalStreak> {
  const raw = await getMeta(db, GOAL_STREAK_KEY);
  if (!raw) return { date: null, count: 0 };
  try {
    return JSON.parse(raw) as GoalStreak;
  } catch {
    return { date: null, count: 0 };
  }
}

/** Evaluates achievements against the current state and persists any new unlock. */
async function unlockAchievements(
  db: Database,
  get: () => AppState,
  set: (p: Partial<AppState>) => void,
  extra: { lastLessonPerfect?: boolean } = {},
): Promise<string[]> {
  const { stats, course, progress, achievements } = get();
  const fresh = evaluateAchievements(
    {
      stats,
      course,
      progress,
      reviewedCount: await getNumberMeta(db, REVIEWED_COUNT_KEY),
      reviewSessions: await getNumberMeta(db, REVIEW_SESSIONS_KEY),
      lastLessonPerfect: extra.lastLessonPerfect ?? false,
      goalDays: (await getGoalStreak(db)).count,
    },
    achievements,
  );
  if (fresh.length === 0) return [];
  const all = [...achievements, ...fresh];
  await setMeta(db, ACHIEVEMENTS_KEY, JSON.stringify(all));
  set({ achievements: all, newAchievements: [...get().newAchievements, ...fresh] });
  return fresh;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  onboarded: false,
  welcomed: false,
  db: null,
  userId: LOCAL_USER_ID,
  user: null,
  course: courses[0]!,
  stats: DEFAULT_STATS,
  progress: {},
  dueCount: 0,
  syncing: false,
  lastSyncError: null,
  achievements: [],
  newAchievements: [],
  reminderHour: null,

  async boot() {
    if (get().ready) return;
    const db = await getDb();
    const user = isFirebaseConfigured() ? await getCurrentUser() : null;
    const userId = user?.uid ?? LOCAL_USER_ID;
    repos = reposFor(db, userId);

    const onboarded = (await getMeta(db, ONBOARDED_KEY)) === '1';
    const welcomed = !isFirebaseConfigured() || !!user || (await getMeta(db, WELCOMED_KEY)) === '1';
    const savedCourse = await getMeta(db, COURSE_KEY);
    const course = (savedCourse && getCourse(savedCourse)) || courses[0]!;
    const now = Date.now();
    const stats = regenerate(await repos.stats.get(), now);
    const progressList = await repos.progress.all();
    const progress = Object.fromEntries(progressList.map((p) => [p.lessonId, p]));
    const dueCount = await repos.srs.countDue(now, `${course.id}.`);
    let achievements: string[] = [];
    try {
      achievements = JSON.parse((await getMeta(db, ACHIEVEMENTS_KEY)) ?? '[]') as string[];
    } catch {
      achievements = [];
    }
    const reminderRaw = await getMeta(db, REMINDER_KEY);
    const reminderHour = reminderRaw === null || reminderRaw === '' ? null : Number(reminderRaw);

    set({ ready: true, onboarded, welcomed, db, userId, user, course, stats, progress, dueCount, achievements, reminderHour });

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

    const { db } = get();
    if (db) {
      if (outcome.dailyGoalReached) {
        const next = advanceGoalStreak(await getGoalStreak(db), localDateString(new Date()));
        await setMeta(db, GOAL_STREAK_KEY, JSON.stringify(next));
      }
      await unlockAchievements(db, get, set, { lastLessonPerfect: result.mistakes.length === 0 });
    }
    void get().sync();
    return { xpEarned: outcome.xpEarned, dailyGoalJustReached: outcome.dailyGoalJustReached };
  },

  async finishStory(storyId, correct, total) {
    const r = requireRepos();
    const now = Date.now();
    // First completion: 10 + 2 per correct answer; re-completions: flat 5 XP.
    // Same stats pipeline as lessons (streak, daily goal).
    const xpEarned = get().progress[storyId]?.completedAt ? STORY_REPEAT_XP : storyXp(correct);
    const localDate = localDateString(new Date());
    const prev = get().stats;
    const newDay = prev.lastActiveDate !== localDate;
    const xpBefore = newDay ? 0 : prev.xpToday;
    const xpToday = xpBefore + xpEarned;
    let next: UserStats = { ...prev, xp: prev.xp + xpEarned, xpToday };
    next = applyActivity(next, localDate);
    await r.stats.save(next, now);
    const lp = await r.progress.completeLesson(storyId, now);
    // Unique id even for same-millisecond repeats (events are INSERT OR IGNORE).
    await r.progress.logEvent(`${storyId}:${now}:${Math.random().toString(36).slice(2, 8)}`, 'story_completed', { xp: xpEarned, correct, total }, now);

    set((s) => ({ stats: next, progress: { ...s.progress, [lp.lessonId]: lp } }));

    const { db } = get();
    if (db) {
      if (xpToday >= next.dailyGoalXp && xpBefore < next.dailyGoalXp) {
        const goal = advanceGoalStreak(await getGoalStreak(db), localDate);
        await setMeta(db, GOAL_STREAK_KEY, JSON.stringify(goal));
      }
      await unlockAchievements(db, get, set);
    }
    void get().sync();
    return { xpEarned };
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
    const { db } = get();
    if (db) {
      await setMeta(db, REVIEWED_COUNT_KEY, String((await getNumberMeta(db, REVIEWED_COUNT_KEY)) + 1));
      await unlockAchievements(db, get, set);
    }
  },

  async startReviewSession() {
    const { db } = get();
    if (!db) return;
    await setMeta(db, REVIEW_SESSIONS_KEY, String((await getNumberMeta(db, REVIEW_SESSIONS_KEY)) + 1));
    await unlockAchievements(db, get, set);
  },

  ackAchievements() {
    set({ newAchievements: [] });
  },

  async setReminderHour(hour) {
    const { db } = get();
    if (db) await setMeta(db, REMINDER_KEY, hour === null ? '' : String(hour));
    set({ reminderHour: hour });
  },

  async weeklyXp() {
    const { db, userId } = get();
    if (!db) return [0, 0, 0, 0, 0, 0, 0];
    const dayMs = 86_400_000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const from = todayStart.getTime() - 6 * dayMs;
    const rows = await db.getAll<{ payload: string; created_at: number }>(
      // Lessons and stories both log their XP under the `xp` payload field.
      "SELECT payload, created_at FROM events WHERE user_id = ? AND type IN (?, ?) AND created_at > ?",
      [userId, 'lesson_completed', 'story_completed', from - 1],
    );
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    for (const r of rows) {
      const idx = Math.min(6, Math.max(0, Math.floor((r.created_at - from) / dayMs)));
      try {
        buckets[idx]! += Number((JSON.parse(r.payload) as { xp?: number }).xp ?? 0);
      } catch {
        /* skip malformed payload */
      }
    }
    return buckets;
  },

  async setDailyGoal(xp) {
    await get().saveStats({ ...get().stats, dailyGoalXp: xp });
  },

  async signIn(email, password) {
    await signIn(email, password); // onAuthStateChange swaps repos + syncs
    await markWelcomed(true);
  },

  async signUp(email, password) {
    await signUp(email, password);
    await markWelcomed(true);
  },

  async signOut() {
    await signOut();
    await markWelcomed(false); // back to the welcome screen, like a fresh start
  },

  async resetPassword(email) {
    await sendPasswordReset(email);
  },

  async continueAsGuest() {
    await markWelcomed(true);
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
