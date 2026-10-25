import { create } from 'zustand';

import {
  addFriend,
  entriesFor,
  getProfile,
  listFriends,
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
}

function appState() {
  return useAppStore.getState();
}

export const useSocialStore = create<SocialState>((set, get) => ({
  profile: null,
  top: [],
  friends: [],
  loading: false,
  error: null,

  async load() {
    const { user } = appState();
    if (!user) {
      set({ profile: null, top: [], friends: [], error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const profile = await getProfile(user.uid);
      set({ profile });
      if (!profile) {
        set({ top: [], friends: [], loading: false });
        return;
      }
      const weekId = isoWeekId(new Date());
      await get().publishMyXp();
      const [top, friendDocs] = await Promise.all([topEntries(weekId), listFriends(user.uid)]);
      const friendEntries = await entriesFor(
        weekId,
        friendDocs.map((f) => f.friend_uid),
      );
      const xpByUid = new Map(friendEntries.map((e) => [e.uid, e.xp]));
      const friends: FriendWithXp[] = friendDocs
        .map((f) => ({ ...f, xp: xpByUid.get(f.friend_uid) ?? 0 }))
        .sort((a, b) => b.xp - a.xp);
      set({ top, friends, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  async setNickname(nickname) {
    const { user } = appState();
    if (!user) throw new Error('Önce giriş yapmalısın.');
    const profile = await saveProfile(user.uid, nickname.trim());
    if (!profile) throw new Error('Bağlantı yok: Firebase yapılandırılmamış.');
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
    await addFriend(user.uid, invite.uid, invite.nickname);
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
    // Only signed-in users with a nickname publish; guests and the local
    // account never touch the leaderboard.
    if (!user || !profile) return;
    const xp = await weeklyXpTotal(db, userId, Date.now());
    await upsertWeeklyEntry(user.uid, profile.nickname, xp, isoWeekId(new Date()));
  },
}));

const PUBLISH_DEBOUNCE_MS = 5_000;

let started = false;
let publishTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Publishes the player's weekly XP whenever their total XP changes, debounced
 * by 5 s so a lesson's XP burst writes a single leaderboard row. Call once
 * from the root layout; repeated calls are no-ops.
 */
export function startSocialSync(): void {
  if (started) return;
  started = true;
  let lastXp = appState().stats.xp;
  useAppStore.subscribe((state) => {
    if (state.stats.xp === lastXp) return;
    lastXp = state.stats.xp;
    if (publishTimer) clearTimeout(publishTimer);
    publishTimer = setTimeout(() => {
      void useSocialStore
        .getState()
        .publishMyXp()
        .catch(() => {});
    }, PUBLISH_DEBOUNCE_MS);
  });
}
