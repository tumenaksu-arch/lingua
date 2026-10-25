import { create } from 'zustand';

import {
  classLeague,
  joinAsStudent,
  leaveClass,
  listAssignments,
  myClasses,
  type AssignmentDoc,
  type LeagueRow,
  type MyClassDoc,
} from '@/data/remote/classes';
import { useAppStore } from '@/features/store';

import { listAnnouncements, type AnnouncementDoc } from './announcements';

/**
 * Student-side class state (madde 5, wave 2b): the classes the device has
 * joined (usually via an ANONYMOUS GoTrue session — students never enter an
 * e-mail), their assignments, the newest announcements and the class-internal
 * weekly league. Everything degrades to empty when Supabase is not configured
 * or the session was rejected by RLS; failures surface as a Turkish `error`.
 *
 * Deliberately a separate store from useAppStore: the lesson-event worker owns
 * that file, class state lives here.
 */

export interface ClassState {
  /** The caller's class memberships (archived classes excluded server-side). */
  myClasses: MyClassDoc[];
  /** Assignments per class, by deadline (classId → rows). */
  assignments: Record<string, AssignmentDoc[]>;
  /** Newest announcements per class (classId → rows, newest first, max 20). */
  announcements: Record<string, AnnouncementDoc[]>;
  /** Class-internal weekly league per class (classId → rows, best XP first). */
  league: Record<string, LeagueRow[]>;
  loading: boolean;
  error: string | null;

  /**
   * Reloads memberships and every per-class payload. Concurrent calls share
   * one in-flight request; screens call this on focus and after joins/leaves.
   */
  load: () => Promise<void>;
  /**
   * Joins a class by its 6-char code (joinAsStudent creates an anonymous
   * session first when there is none — no account needed). On success the app
   * store switches to the class's course and completes onboarding with the
   * 20 XP default goal when needed, so the student lands on the class course
   * path. Throws the Turkish join error for the form to show inline.
   */
  join: (code: string, takmaAd: string) => Promise<MyClassDoc | null>;
  /** Leaves a class: the membership (and the visible class data) is deleted. */
  leave: (classId: string) => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useClassStore = create<ClassState>((set, get) => ({
  myClasses: [],
  assignments: {},
  announcements: {},
  league: {},
  loading: false,
  error: null,

  load() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      set({ loading: true, error: null });
      try {
        const classes = await myClasses();
        const assignments: Record<string, AssignmentDoc[]> = {};
        const announcements: Record<string, AnnouncementDoc[]> = {};
        const league: Record<string, LeagueRow[]> = {};
        await Promise.all(
          classes.map(async (c) => {
            const [a, n, l] = await Promise.all([
              listAssignments(c.classId),
              listAnnouncements(c.classId),
              classLeague(c.classId),
            ]);
            assignments[c.classId] = a;
            announcements[c.classId] = n;
            league[c.classId] = l;
          }),
        );
        set({ myClasses: classes, assignments, announcements, league, loading: false });
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  async join(code, takmaAd) {
    const joined = await joinAsStudent(code, takmaAd); // throws the Turkish error
    if (!joined) return null; // Supabase not configured
    const app = useAppStore.getState();
    // A join from the welcome screen must let the student into the app.
    if (!app.welcomed) await app.continueAsGuest();
    // Land on the class course path: pick the class's course; first-launch
    // onboarding completes with the default 20 XP daily goal.
    if (!app.onboarded) await app.completeOnboarding(joined.courseId, 20);
    else await app.selectCourse(joined.courseId);
    await get().load();
    return {
      classId: joined.classId,
      ad: joined.ad,
      courseId: joined.courseId,
      takmaAd: takmaAd.trim(),
      joinedAt: new Date().toISOString(),
    };
  },

  async leave(classId) {
    await leaveClass(classId);
    set((s) => {
      const assignments = { ...s.assignments };
      const announcements = { ...s.announcements };
      const league = { ...s.league };
      delete assignments[classId];
      delete announcements[classId];
      delete league[classId];
      return {
        myClasses: s.myClasses.filter((c) => c.classId !== classId),
        assignments,
        announcements,
        league,
      };
    });
  },
}));
