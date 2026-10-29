import { create } from 'zustand';

import { localDateString } from '@/domain/streak';
import { isAnonymousSession } from '@/data/remote/classes';
import {
  addFriend,
  entriesFor,
  getProfile,
  listFriendStreaks,
  listFriends,
  markActivityToday,
  removeFriend as removeFriendRemote,
  resolveInvite,
  saveProfile,
  topEntries,
  upsertWeeklyEntry,
  type FriendDoc,
  type LeaderboardEntry,
  type ProfileDoc,
} from '@/data/remote/social';
import { useAppStore } from '@/features/store';

import type { FriendStreak } from './friendStreak';
import { isoWeekId, weeklyXpTotal } from './week';

export interface FriendWithXp extends FriendDoc {
  xp: number;
}

export interface SocialState {
  /** Own profile (nickname + invite code); null until loaded or when signed out. */
  profile: ProfileDoc | null;
  /** This week's leaderboard, best XP first. */
  top: LeaderboardEntry[];
  /** Friend list, each with this week's XP; loaded only when signed in. */
  friends: FriendWithXp[];
  /** Mutual friend streaks (friend_streaks RPC); empty for guests / anonymous. */
  friendStreaks: FriendStreak[];
  loading: boolean;
  error: string | null;

  /** Loads profile, weekly entry, top list and friends for the signed-in user. */
  load: () => Promise<void>;
  /** Validates and saves the nickname; creates the invite code on first save. */
  setNickname: (nickname: string) => Promise<void>;
  /**
   * Adds a friend by invite code. Rejects own code, unknown codes and
   * duplicates with a Turkish Error message.
   */
  addFriendByCode: (code: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<void>;
  /** Publishes this week's XP to the leaderboard; guest / no-nickname is a no-op. */
  publishMyXp: () => Promise<void>;
  /** Reloads the mutual friend streaks; called together with the friend refresh. */
  refreshFriendStreaks: () => Promise<void>;
}

function appState() {
  return useAppStore.getState();
}

export const useSocialStore = create<SocialState>((set, get) => ({
  profile: null,
  top: [],
  friends: [],
  friendStreaks: [],
  loading: false,
  error: null,

  async load() {
    const { user } = appState();
    if (!user) {
      set({ profile: null, top: [], friends: [], friendStreaks: [], error: null });
      return;
    }
    // Anonymous class accounts are rejected by RLS on profiles/leaderboard —
    // never touch the server for them (their league is the class league).
    if (await isAnonymousSession()) {
      set({ profile: null, top: [], friends: [], friendStreaks: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const profile = await getProfile(user.uid);
      set({ profile });
      if (!profile) {
        set({ top: [], friends: [], friendStreaks: [], loading: false });
        return;
      }
      const weekId = isoWeekId(new Date());
      // Publishing is best-effort: if the leaderboard write fails (offline,
      // rules reject), the reads below must still populate the screen.
      try {
        await get().publishMyXp();
      } catch {
        /* keep loading */
      }
      const [top, friendDocs] = await Promise.all([topEntries(weekId), listFriends()]);
      const friendEntries = await entriesFor(
        weekId,
        friendDocs.map((f) => f.friend_uid),
      );
      const xpByUid = new Map(friendEntries.map((e) => [e.uid, e.xp]));
      const friends: FriendWithXp[] = friendDocs
        .map((f) => ({ ...f, xp: xpByUid.get(f.friend_uid) ?? 0 }))
        .sort((a, b) => b.xp - a.xp);
      set({ top, friends, loading: false });
      // Best-effort: the streak RPC must not fail the friend list load.
      await get().refreshFriendStreaks().catch(() => {});
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  async setNickname(nickname) {
    const { user } = appState();
    if (!user) throw new Error('Önce giriş yapmalısın.');
    const profile = await saveProfile(user.uid, nickname.trim());
    if (!profile) throw new Error('Bağlantı yok: Supabase yapılandırılmamış.');
    set({ profile });
    await get().load();
  },

  async addFriendByCode(rawCode) {
    const { user } = appState();
    if (!user) throw new Error('Önce giriş yapmalısın.');
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new Error('Bir davet kodu yaz.');
    if (get().profile?.invite_code === code) throw new Error('Kendi kodunu ekleyemezsin.');
    const invite = await resolveInvite(code);
    if (!invite) throw new Error('Bilinmeyen davet kodu.');
    if (invite.uid === user.uid) throw new Error('Kendi kodunu ekleyemezsin.');
    if (get().friends.some((f) => f.friend_uid === invite.uid)) {
      throw new Error('Bu kullanıcı zaten arkadaşın.');
    }
    await addFriend(user.uid, invite.uid);
    await get().load();
  },

  async removeFriend(friendUid) {
    const { user } = appState();
    if (!user) return;
    await removeFriendRemote(user.uid, friendUid);
    await get().load();
  },

  async publishMyXp() {
    const { user, userId, db } = appState();
    const { profile } = get();
    // Only signed-in users with a nickname publish; guests, the local account
    // and anonymous class accounts never touch the leaderboard (RLS rejects
    // anonymous writes — and reads — by design).
    if (!user || !profile) return;
    if (await isAnonymousSession()) return;
    const xp = await weeklyXpTotal(db, userId, Date.now());
    await upsertWeeklyEntry(user.uid, profile.nickname, xp, isoWeekId(new Date()));
  },

  async refreshFriendStreaks() {
    const { user } = appState();
    if (!user || get().profile === null) {
      set({ friendStreaks: [] });
      return;
    }
    // Anonymous class accounts have no global friends (0002/0006 RLS).
    if (await isAnonymousSession()) {
      set({ friendStreaks: [] });
      return;
    }
    set({ friendStreaks: await listFriendStreaks() });
  },
}));

const PUBLISH_DEBOUNCE_MS = 5_000;

let started = false;
let publishTimer: ReturnType<typeof setTimeout> | null = null;
/** Local day (YYYY-MM-DD) already upserted to activity_days; null after a failure. */
let activityMarkedDay: string | null = null;

/**
 * Upserts today's activity_days row, at most once per local day. Guests and
 * anonymous class accounts never reach the server; a failed write (offline)
 * leaves the day unmarked so the next XP event retries it.
 */
async function maybeMarkActivityDay(): Promise<void> {
  const { user } = appState();
  if (!user) return; // guest: no server round trip at all
  const today = localDateString(new Date());
  if (activityMarkedDay === today) return;
  if (await isAnonymousSession()) return;
  if (await markActivityToday(user.uid)) activityMarkedDay = today;
}

/**
 * Publishes the player's weekly XP whenever their total XP changes, debounced
 * by 5 s so a lesson's XP burst writes a single leaderboard row. Also marks
 * the current day in activity_days whenever today's XP increases (at most
 * once a day) so mutual friend streaks can count it. Call once from the root
 * layout; repeated calls are no-ops.
 */
export function startSocialSync(): void {
  if (started) return;
  started = true;
  let lastXp = appState().stats.xp;
  let lastXpToday = appState().stats.xpToday;
  // The XP may have been earned in an earlier session/offline — make sure the
  // day is marked on startup too.
  if (lastXpToday > 0) void maybeMarkActivityDay();
  useAppStore.subscribe((state) => {
    if (state.stats.xp === lastXp && state.stats.xpToday === lastXpToday) return;
    const xpTodayIncreased = state.stats.xpToday > lastXpToday;
    lastXp = state.stats.xp;
    lastXpToday = state.stats.xpToday;
    if (xpTodayIncreased) void maybeMarkActivityDay();
    if (publishTimer) clearTimeout(publishTimer);
    publishTimer = setTimeout(() => {
      void useSocialStore
        .getState()
        .publishMyXp()
        .catch(() => {});
    }, PUBLISH_DEBOUNCE_MS);
  });
}
