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
  clearLegacyAccount,
  createProgressRepo,
  createSrsRepo,
  createStatsRepo,
  currentUser,
  detectLegacyAccount,
  detectLegacyAccounts,
  getDb,
  getMeta,
  isSupabaseConfigured,
  migrateLegacyRows,
  onAuthChanged,
  pullChanges,
  resetPassword,
  sendLoginCode,
  setMeta,
  setPassword,
  signIn,
  signOut,
  signUp,
  supabaseRemote,
  syncNow,
  verifyLoginCode,
  type AuthUser,
  type Database,
  type LegacyAccount,
  type LessonProgress,
} from '@/data';
import {
  QUEST_REWARD_XP,
  localDayWindow,
  questProgress,
  questsForDate,
  type QuestStatus,
} from '@/features/quests';
import { SKIP_TEST_XP, skipPassed } from '@/features/skipTest';

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

/** XP for completing an AI conversation scenario (roadmap item 6). */
export const CONVERSATION_XP = 10;

/** Unit ids with a skip-test finish in flight — a double finish pays out once. */
const finishingSkip: Set<string> = new Set();
/** 'localDay:scenarioId' keys with a conversation finish in flight — a double finish pays out once. */
const finishingConversation: Set<string> = new Set();

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
   * not chosen. Always true when Supabase is not configured (accounts are unavailable).
   */
  welcomed: boolean;
  /**
   * A leftover Firebase session was found on this device and no Supabase session exists:
   * the migration screen walks the user through code login so their old progress (keyed
   * by the legacy Firebase uid) can be moved to the new account.
   */
  legacyAccount: LegacyAccount | null;
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
  /** today's daily quests with live progress (empty until the first refresh) */
  quests: QuestStatus[];
  /** local date (YYYY-MM-DD) the quests state belongs to; null before the first refresh */
  questDate: string | null;
  /** quest ids with a claim in flight — synchronously blocks a double-tap double payout */
  claimingQuestIds: string[];

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
  /**
   * Called by the AI conversation screen (roadmap item 6) when the server
   * marks a scenario as done. Awards CONVERSATION_XP through the same stats
   * pipeline as stories (daily goal/streak/weekly XP) and logs the idempotent
   * `conversation_completed` event — at most once per scenario per local day.
   */
  finishConversation: (scenarioId: string) => Promise<{ xpEarned: number }>;
  /** Called by the lesson screen for each lost heart so the regen clock persists. */
  saveStats: (stats: UserStats) => Promise<void>;
  loadDueCards: (limit?: number) => Promise<SrsCard[]>;
  reviewCard: (card: SrsCard, correct: boolean, responseMs: number) => Promise<void>;
  setDailyGoal: (xp: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Sends a 6-digit login code to the e-mail (passwordless login / "Şifremi unuttum"). */
  sendLoginCode: (email: string) => Promise<void>;
  /** Verifies the 6-digit code; on success the user is signed in. */
  verifyLoginCode: (email: string, code: string) => Promise<void>;
  /** Sets a new password for the signed-in user (after a code login). */
  setPassword: (password: string) => Promise<void>;
  /** "Şifremi unuttum": sends the 6-digit code; a new password can be set after verifying it. */
  resetPassword: (email: string) => Promise<void>;
  /** Legacy Firebase account: done with (or skipped) the migration screen. */
  finishLegacyMigration: () => Promise<void>;
  /**
   * "Şimdilik geç" on the migration screen: lets the user into the app now while
   * KEEPING the legacy AsyncStorage keys, so the migration screen comes back on
   * the next boot and the legacy rows are not orphaned.
   */
  skipLegacyMigration: () => Promise<void>;
  /** "Hesapsız dene": leaves the welcome screen without an account. */
  continueAsGuest: () => Promise<void>;
  sync: () => Promise<void>;
  /** Marks the start of a review session (achievement counter). */
  startReviewSession: () => Promise<void>;
  ackAchievements: () => void;
  setReminderHour: (hour: number | null) => Promise<void>;
  /** XP earned per day for the last 7 days, oldest first (index 6 = today). */
  weeklyXp: () => Promise<number[]>;
  /** Recomputes today's quest statuses from the events table. */
  refreshQuests: () => Promise<void>;
  /** Claims a completed quest's +10 XP reward; a second claim returns 0 and changes nothing. */
  claimQuest: (questId: string) => Promise<{ xpEarned: number }>;
  /** Number of previous skip-test attempts for the unit (count of `unit_skip_attempt` events). */
  skipAttempts: (unitId: string) => Promise<number>;
  /**
   * Called by the skip-test screen when an attempt ends (finished or quit).
   * Always logs `unit_skip_attempt`. On pass (>= 80%) completes the unit's
   * not-yet-completed lessons, awards SKIP_TEST_XP through the same stats
   * pipeline as lessons and logs `unit_skipped`; on fail (or quit) progress is
   * unchanged. `opts.quit` marks an abandoned attempt: it always fails, even
   * when the score so far reached the 80% bar. When the unit's lessons are all
   * completed already (no `unit_skipped` event), a pass logs the attempt but
   * awards no XP and no `unit_skipped` event. Idempotent: a unit that was
   * already skipped never pays out twice.
   */
  finishSkipTest: (unitId: string, correct: number, total: number, opts?: { quit?: boolean }) => Promise<{ passed: boolean; xpEarned: number }>;
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
  useAppStore.setState({ welcomed: value || !isSupabaseConfigured() });
}

/**
 * After the first successful Supabase sign-in: pull the account's server data
 * first, then — if this device still holds a legacy Firebase account
 * (AsyncStorage `firebase:authUser:*`) — move the local rows from the old
 * Firebase uid to the new Supabase uid (see migrateLegacyRows) and delete the
 * legacy session key(s). Idempotent — with no legacy rows left the merge does
 * nothing.
 *
 * The pre-pull is unconditional (not only when a legacy account exists): it
 * must run BEFORE adoptGuestProgress, which stamps the adopted guest rows with
 * `now`. Without the pre-pull those pending pks make pullChanges skip the
 * server's rows and the next sync pushes guest data over the account's server
 * data; with it, adoption no-ops on an account that has rows and correctly
 * abandons the guest data (spec: pull first, keep the higher xp/crowns).
 *
 * `legacyAccount` state intentionally stays set: the migration screen keeps
 * showing the "Yeni şifreni belirle" step until the form's onDone
 * (finishLegacyMigration) dismisses it.
 */
async function migrateLegacyIfNeeded(db: Database, uid: string): Promise<void> {
  const remote = supabaseRemote();
  if (remote) {
    try {
      await pullChanges({ db, remote, userId: uid }, new Date(0).toISOString());
    } catch {
      // Offline or transient failure: merge with the local rows only; the next
      // sync reconciles with the server through the normal conflict rules.
    }
  }
  const legacyAccounts = await detectLegacyAccounts();
  // Migrate every distinct legacy uid (a device can hold firebase:authUser:*
  // entries under several API keys): clearing the keys would otherwise
  // strand the other uids' rows forever.
  for (const legacy of legacyAccounts) {
    if (legacy.uid !== uid) await migrateLegacyRows(db, legacy.uid, uid);
  }
  if (legacyAccounts.length) await clearLegacyAccount();
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
      questsClaimedToday: get().quests.filter((q) => q.claimed).length,
    },
    achievements,
  );
  if (fresh.length === 0) return [];
  const all = [...achievements, ...fresh];
  await setMeta(db, ACHIEVEMENTS_KEY, JSON.stringify(all));
  set({ achievements: all, newAchievements: [...get().newAchievements, ...fresh] });
  return fresh;
}

/**
 * Pays out a quest reward (+QUEST_REWARD_XP) through the same stats pipeline as
 * lessons/stories and logs the idempotent `quest_claimed` event. Called from
 * `claimQuest` after the synchronous in-memory guards; the DB existence check
 * below keeps stats and the event log consistent even across processes.
 */
async function claimQuestPayout(r: Repos, questId: string): Promise<{ xpEarned: number }> {
  const { db } = useAppStore.getState();
  if (!db) return { xpEarned: 0 };
  const now = Date.now();
  const date = localDateString(new Date());
  const xpEarned = QUEST_REWARD_XP;
  // Same stats pipeline as lessons/stories: total + today XP, streak activity.
  const prev = useAppStore.getState().stats;
  const newDay = prev.lastActiveDate !== date;
  const xpBefore = newDay ? 0 : prev.xpToday;
  const xpToday = xpBefore + xpEarned;
  let next: UserStats = { ...prev, xp: prev.xp + xpEarned, xpToday };
  next = applyActivity(next, date);
  // Payout and the claim event must move together: if the event already
  // exists (e.g. a claim from another tab/process), abort BEFORE saving stats
  // so stats.xp can never disagree with the event log.
  const existing = await db.getFirst<{ id: string }>(
    "SELECT id FROM events WHERE user_id = ? AND type = ? AND id LIKE ?",
    [useAppStore.getState().userId, 'quest_claimed', `quest:${date}:${questId}`],
  );
  if (existing) {
    await useAppStore.getState().refreshQuests();
    return { xpEarned: 0 };
  }
  await r.stats.save(next, now);
  await r.progress.logEvent(`quest:${date}:${questId}`, 'quest_claimed', { xp: xpEarned, questId, date }, now);
  useAppStore.setState({ stats: next });
  if (xpToday >= next.dailyGoalXp && xpBefore < next.dailyGoalXp) {
    await setMeta(db, GOAL_STREAK_KEY, JSON.stringify(advanceGoalStreak(await getGoalStreak(db), date)));
  }
  await useAppStore.getState().refreshQuests();
  await unlockAchievements(db, useAppStore.getState, useAppStore.setState);
  void useAppStore.getState().sync();
  return { xpEarned };
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  onboarded: false,
  welcomed: false,
  legacyAccount: null,
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
  quests: [],
  questDate: null,
  claimingQuestIds: [],

  async boot() {
    if (get().ready) return;
    const db = await getDb();
    const configured = isSupabaseConfigured();
    const user = configured ? await currentUser() : null;
    // No Supabase session but a leftover Firebase session → one-time migration screen.
    const legacyAccount = configured && !user ? await detectLegacyAccount() : null;
    const userId = user?.uid ?? LOCAL_USER_ID;
    repos = reposFor(db, userId);

    const onboarded = (await getMeta(db, ONBOARDED_KEY)) === '1';
    const welcomed = !configured || !!user || (await getMeta(db, WELCOMED_KEY)) === '1';
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

    set({ ready: true, onboarded, welcomed, db, userId, user, legacyAccount, course, stats, progress, dueCount, achievements, reminderHour });

    if (configured) {
      // A restored session may still have local rows under the legacy Firebase uid
      // (the app was killed mid-migration): finish the move before the first sync.
      if (user) await migrateLegacyIfNeeded(db, user.uid);
      authUnsub?.();
      authUnsub = onAuthChanged(async (u) => {
        const uid = u?.uid ?? LOCAL_USER_ID;
        if (uid === get().userId) {
          set({ user: u });
          return;
        }
        const next = reposFor(db, uid);
        if (u) {
          // Order matters: the server pull + legacy merge must run BEFORE the
          // guest adoption (see migrateLegacyIfNeeded). Adoption stamps rows
          // with `now`, which would shadow the server's rows in pullChanges.
          await migrateLegacyIfNeeded(db, uid);
          await adoptGuestProgress(db, next, Date.now());
        }
        repos = next;
        const st = regenerate(await repos.stats.get(), Date.now());
        const pl = await repos.progress.all();
        set({ user: u, userId: uid, stats: st, progress: Object.fromEntries(pl.map((p) => [p.lessonId, p])) });
        set({ dueCount: await repos.srs.countDue(Date.now(), `${get().course.id}.`) });
        await get().refreshQuests();
        if (u) void get().sync();
      });
      if (user) void get().sync();
    }
    await get().refreshQuests();
  },

  async selectCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) throw new Error(`Unknown course ${courseId}`);
    const { db } = get();
    if (db) await setMeta(db, COURSE_KEY, courseId);
    set({ course });
    if (repos) set({ dueCount: await repos.srs.countDue(Date.now(), `${course.id}.`) });
    await get().refreshQuests();
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
      perfect: result.mistakes.length === 0,
      durationMs: result.durationMs,
      // teacher "Zorlanılanlar" (class_struggles) groups by lesson and exercise type
      lessonId: result.lessonId,
      mistakes_by_type: result.mistakesByType,
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
    await get().refreshQuests();

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
    await get().refreshQuests();

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

  async finishConversation(scenarioId) {
    const r = requireRepos();
    const { db } = get();
    const now = Date.now();
    const date = localDateString(new Date());
    // At most once per scenario per local day: fixed event id (INSERT OR IGNORE)
    // plus an in-memory guard and a pre-check so stats can never disagree with
    // the event log, even on a rapid double call.
    const key = `${date}:${scenarioId}`;
    if (finishingConversation.has(key)) return { xpEarned: 0 };
    finishingConversation.add(key);
    try {
      const eventId = `conv:${key}`;
      if (db) {
        const existing = await db.getFirst<{ id: string }>(
          'SELECT id FROM events WHERE user_id = ? AND type = ? AND id = ?',
          [get().userId, 'conversation_completed', eventId],
        );
        if (existing) return { xpEarned: 0 };
      }
      // Same stats pipeline as lessons/stories: total + today XP, streak activity.
      const prev = get().stats;
      const newDay = prev.lastActiveDate !== date;
      const xpBefore = newDay ? 0 : prev.xpToday;
      const xpToday = xpBefore + CONVERSATION_XP;
      let next: UserStats = { ...prev, xp: prev.xp + CONVERSATION_XP, xpToday };
      next = applyActivity(next, date);
      await r.stats.save(next, now);
      await r.progress.logEvent(eventId, 'conversation_completed', { xp: CONVERSATION_XP, scenarioId, date }, now);

      set({ stats: next });
      await get().refreshQuests();
      if (db) {
        if (xpToday >= next.dailyGoalXp && xpBefore < next.dailyGoalXp) {
          const goal = advanceGoalStreak(await getGoalStreak(db), date);
          await setMeta(db, GOAL_STREAK_KEY, JSON.stringify(goal));
        }
        await unlockAchievements(db, get, set);
      }
      void get().sync();
      return { xpEarned: CONVERSATION_XP };
    } finally {
      finishingConversation.delete(key);
    }
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
      // Lessons, stories, conversations, skip tests and quest rewards all log their XP under the `xp` payload field.
      "SELECT payload, created_at FROM events WHERE user_id = ? AND type IN (?, ?, ?, ?, ?) AND created_at > ?",
      [userId, 'lesson_completed', 'story_completed', 'conversation_completed', 'quest_claimed', 'unit_skipped', from - 1],
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

  async refreshQuests() {
    const { db, userId, stats } = get();
    if (!db) {
      set({ quests: [], questDate: null });
      return;
    }
    const today = localDateString(new Date());
    // Upper bound = next LOCAL midnight (setDate handles DST days, unlike +86_400_000).
    const { from, to } = localDayWindow(new Date());
    const rows = await db.getAll<{ type: string; payload: string }>(
      "SELECT type, payload FROM events WHERE user_id = ? AND type IN (?, ?, ?, ?) AND created_at > ? AND created_at < ?",
      [userId, 'lesson_completed', 'story_completed', 'conversation_completed', 'quest_claimed', from - 1, to],
    );
    const events = rows.map((r) => {
      try {
        return { type: r.type, payload: JSON.parse(r.payload) as Record<string, unknown> };
      } catch {
        return { type: r.type, payload: {} };
      }
    });
    set({ quests: questProgress(questsForDate(today, stats.dailyGoalXp), events), questDate: today });
  },

  async skipAttempts(unitId) {
    const { db, userId } = get();
    if (!db) return 0;
    const rows = await db.getAll<{ payload: string }>(
      "SELECT payload FROM events WHERE user_id = ? AND type = ?",
      [userId, 'unit_skip_attempt'],
    );
    let n = 0;
    for (const r of rows) {
      try {
        if ((JSON.parse(r.payload) as { unitId?: string }).unitId === unitId) n++;
      } catch {
        /* skip malformed payload */
      }
    }
    return n;
  },

  async finishSkipTest(unitId, correct, total, opts) {
    const r = requireRepos();
    const { db } = get();
    const now = Date.now();
    // A quit always fails: the unanswered questions can never count toward
    // the 80% bar, no matter how many were correct so far.
    const passed = opts?.quit === true ? false : skipPassed(correct, total);
    // Every finished (or quit) attempt logs with a unique id; the count of
    // these events drives the next attempt's shuffle seed.
    await r.progress.logEvent(
      `${unitId}:skip:${now}:${Math.random().toString(36).slice(2, 8)}`,
      'unit_skip_attempt',
      opts?.quit === true
        ? { unitId, correct, total, passed, quit: true }
        : { unitId, correct, total, passed },
      now,
    );
    if (!passed) {
      await get().refreshQuests();
      void get().sync();
      return { passed: false, xpEarned: 0 };
    }
    // Idempotency: a second finish of the same unit (double tap, retry after a
    // crash) must not re-complete lessons or re-award XP. Guarded in memory
    // synchronously and on disk via the fixed `unit_skipped` event id.
    if (finishingSkip.has(unitId)) return { passed: true, xpEarned: 0 };
    finishingSkip.add(unitId);
    try {
      const skippedEvents = db
        ? await db.getAll<{ payload: string }>(
            "SELECT payload FROM events WHERE user_id = ? AND type = ?",
            [get().userId, 'unit_skipped'],
          )
        : [];
      const alreadySkipped = skippedEvents.some((e) => {
        try {
          return (JSON.parse(e.payload) as { unitId?: string }).unitId === unitId;
        } catch {
          return false;
        }
      });
      if (alreadySkipped) return { passed: true, xpEarned: 0 };

      const unit = get().course.units.find((u) => u.id === unitId);
      const completedNow: string[] = [];
      const updates: Record<string, LessonProgress> = {};
      for (const lesson of unit?.lessons ?? []) {
        if (get().progress[lesson.id]?.completedAt) continue;
        const lp = await r.progress.completeLesson(lesson.id, now);
        updates[lp.lessonId] = lp;
        completedNow.push(lesson.id);
      }

      // Every lesson of the unit was already completed (e.g. played through
      // normally, with no `unit_skipped` event): the attempt counts and
      // passes, but there is nothing to complete, no XP to award and no
      // `unit_skipped` event to log.
      if (completedNow.length === 0) {
        await get().refreshQuests();
        void get().sync();
        return { passed: true, xpEarned: 0 };
      }

      // Same stats pipeline as lessons/stories: total + today XP, streak activity.
      const localDate = localDateString(new Date());
      const prev = get().stats;
      const newDay = prev.lastActiveDate !== localDate;
      const xpBefore = newDay ? 0 : prev.xpToday;
      const xpToday = xpBefore + SKIP_TEST_XP;
      let next: UserStats = { ...prev, xp: prev.xp + SKIP_TEST_XP, xpToday };
      next = applyActivity(next, localDate);
      await r.stats.save(next, now);
      // Fixed id: INSERT OR IGNORE makes a re-push idempotent, the pre-check above
      // keeps stats and the event log consistent even across processes.
      await r.progress.logEvent(`${unitId}:skipped`, 'unit_skipped', { unitId, lessons: completedNow, xp: SKIP_TEST_XP }, now);

      set((s) => ({ stats: next, progress: { ...s.progress, ...updates } }));
      await get().refreshQuests();
      if (db) {
        if (xpToday >= next.dailyGoalXp && xpBefore < next.dailyGoalXp) {
          const goal = advanceGoalStreak(await getGoalStreak(db), localDate);
          await setMeta(db, GOAL_STREAK_KEY, JSON.stringify(goal));
        }
        await unlockAchievements(db, get, set);
      }
      void get().sync();
      return { passed: true, xpEarned: SKIP_TEST_XP };
    } finally {
      finishingSkip.delete(unitId);
    }
  },

  async claimQuest(questId) {
    const r = requireRepos();
    const quest = get().quests.find((q) => q.id === questId);
    const { db, questDate } = get();
    // Guard in memory, synchronously: only a completed, unclaimed quest from
    // TODAY pays out, and a double tap lands in `claimingQuestIds` before the
    // first await, so a rapid second press returns 0 instead of paying twice.
    // The event id `quest:<date>:<questId>` (INSERT OR IGNORE) plus the
    // existence pre-check below make a double claim impossible on disk too.
    if (!db || !quest || !quest.done || quest.claimed) return { xpEarned: 0 };
    if (questDate !== localDateString(new Date())) return { xpEarned: 0 };
    if (get().claimingQuestIds.includes(questId)) return { xpEarned: 0 };
    set((s) => ({ claimingQuestIds: [...s.claimingQuestIds, questId] }));
    try {
      return await claimQuestPayout(r, questId);
    } finally {
      set((s) => ({ claimingQuestIds: s.claimingQuestIds.filter((id) => id !== questId) }));
    }
  },

  async setDailyGoal(xp) {
    await get().saveStats({ ...get().stats, dailyGoalXp: xp });
    // The xp_goal quest's target follows the daily goal — refresh immediately
    // so a fresh onboarding (or a profile change) never shows a stale target.
    await get().refreshQuests();
  },

  async signIn(email, password) {
    await signIn(email, password); // onAuthChanged swaps repos + syncs
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

  async sendLoginCode(email) {
    await sendLoginCode(email);
  },

  async verifyLoginCode(email, code) {
    await verifyLoginCode(email, code); // onAuthChanged swaps repos + migrates legacy data + syncs
    await markWelcomed(true);
  },

  async setPassword(password) {
    await setPassword(password);
  },

  async resetPassword(email) {
    await resetPassword(email); // sends the 6-digit code
  },

  async finishLegacyMigration() {
    await clearLegacyAccount();
    set({ legacyAccount: null });
    await markWelcomed(true);
  },

  async skipLegacyMigration() {
    // Keys stay in AsyncStorage: boot re-detects the legacy account and shows
    // this screen again on the next launch.
    set({ legacyAccount: null });
    await markWelcomed(true);
  },

  async continueAsGuest() {
    await markWelcomed(true);
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
