import type { SupabaseClient } from '@supabase/supabase-js';

import { isoWeekId } from '@/features/social/week';

import { getSupabase } from './supabase';

/**
 * Social data on self-hosted Supabase (PostgREST + RLS, see
 * supabase/migrations/0001_lovevox.sql): nickname profile, invite codes,
 * weekly leaderboard entries and the friend list. E-mail is never stored in
 * any public table; only the chosen nickname is visible to other players.
 * Every helper degrades gracefully: when Supabase is not configured (or the
 * session is missing, which RLS would reject) the functions return null / [] /
 * false, and write failures surface as Turkish Error messages for the screen.
 */

export interface ProfileDoc {
  user_id: string;
  nickname: string;
  invite_code: string;
  updated_at: string;
}

export interface InviteDoc {
  uid: string;
  nickname: string;
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  xp: number;
  updated_at: string;
}

export interface FriendDoc {
  friend_uid: string;
  nickname: string;
  added_at: string;
}

/** Unambiguous alphabet for invite codes: no I/O/0/1 look-alikes. */
export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

/** 3..20 chars; letters (incl. Turkish), digits, dot, underscore, dash, space. */
export const NICKNAME_PATTERN = /^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$/;

export function randomInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  let code = '';
  for (const b of bytes) code += INVITE_ALPHABET[b % INVITE_ALPHABET.length];
  return code;
}

/** PostgREST error shapes: network failures throw, API failures come back in `error`. */
function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return /failed to fetch|networkerror|network request failed|timeout/i.test(e.message);
}

/** Maps PostgREST/fetch failures to a Turkish message the screens can show. */
function toTurkishError(e: unknown): Error {
  if (e instanceof Error && isNetworkError(e)) {
    return new Error('Bağlantı yok. İnternetini kontrol edip tekrar dene.');
  }
  const status = typeof e === 'object' && e && 'status' in e ? Number((e as { status: unknown }).status) : 0;
  if (status === 401 || status === 403) return new Error('Oturumun geçersiz. Lütfen tekrar giriş yap.');
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Spec contract: helpers return null/[]/false for guests too. RLS alone would
 * turn a missing session into a 401/403 throw, so check the session up front.
 * When the session state cannot be read (should not happen), let the call
 * proceed and the error mapping decide.
 */
async function hasSession(sb: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await sb.auth.getSession();
    return Boolean(data.session);
  } catch {
    return true;
  }
}

export async function getProfile(uid: string): Promise<ProfileDoc | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', uid).maybeSingle();
    if (error) return null;
    return (data as ProfileDoc | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * First save inserts the profile together with a random invite code, retrying
 * with a fresh code on a unique violation (23505) at most 5 times. Later saves
 * update only the nickname — the invite code is immutable (a trigger guards it
 * too) — and refresh the nickname on the current week's leaderboard row.
 */
export async function saveProfile(uid: string, nickname: string): Promise<ProfileDoc | null> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return null;
  const now = new Date().toISOString();
  const existing = await getProfile(uid);
  if (existing) return updateProfileRow(sb, existing, nickname, now);
  for (let attempt = 0; attempt < 5; attempt++) {
    const profile: ProfileDoc = {
      user_id: uid,
      nickname,
      invite_code: randomInviteCode(),
      updated_at: now,
    };
    try {
      const { error } = await sb.from('profiles').insert(profile);
      if (error) {
        if (error.code === '23505') {
          // The unique violation is not necessarily the invite code — a
          // concurrent first save (double submit, two devices racing before
          // either insert commits) violates profiles_pkey. Re-read the row and
          // fall through to the update path like the old Firestore merge-write.
          const raced = await getProfile(uid);
          if (raced) return updateProfileRow(sb, raced, nickname, now);
          if (attempt < 4) continue;
          throw new Error('Davet kodu üretilemedi. Lütfen tekrar dene.');
        }
        throw toTurkishError(error);
      }
      return profile;
    } catch (e) {
      throw toTurkishError(e);
    }
  }
  throw new Error('Davet kodu üretilemedi. Lütfen tekrar dene.');
}

/** Updates the nickname on an existing profile + the current week's leaderboard row. */
async function updateProfileRow(
  sb: SupabaseClient,
  existing: ProfileDoc,
  nickname: string,
  now: string,
): Promise<ProfileDoc> {
  const { error } = await sb.from('profiles').update({ nickname, updated_at: now }).eq('user_id', existing.user_id);
  if (error) throw toTurkishError(error);
  // Keep this week's leaderboard row in sync with the new nickname; the row
  // may not exist yet (updated_at default aside, an update matching no row
  // is a no-op on PostgREST).
  const { error: boardError } = await sb
    .from('leaderboard')
    .update({ nickname, updated_at: now })
    .eq('week_id', isoWeekId(new Date()))
    .eq('user_id', existing.user_id);
  if (boardError) throw toTurkishError(boardError);
  return { ...existing, nickname, updated_at: now };
}

/** Creates or updates the caller's own row for the given ISO week. */
export async function upsertWeeklyEntry(uid: string, nickname: string, xp: number, weekId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb
      .from('leaderboard')
      .upsert(
        { week_id: weekId, user_id: uid, nickname, xp, updated_at: new Date().toISOString() },
        { onConflict: 'week_id,user_id' },
      );
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

function toEntry(row: Record<string, unknown>): LeaderboardEntry {
  return {
    uid: String(row.user_id),
    nickname: String(row.nickname),
    xp: Number(row.xp),
    updated_at: String(row.updated_at ?? ''),
  };
}

/** Top `max` entries of the week, best XP first. */
export async function topEntries(weekId: string, max = 50): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('leaderboard')
      .select('user_id,nickname,xp,updated_at')
      .eq('week_id', weekId)
      .order('xp', { ascending: false })
      .limit(max);
    if (error) return [];
    return (data ?? []).map((row) => toEntry(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** The week's rows for a set of uids (friend rows); silently skips missing ones. */
export async function entriesFor(weekId: string, uids: string[]): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb || uids.length === 0) return [];
  try {
    const { data, error } = await sb
      .from('leaderboard')
      .select('user_id,nickname,xp,updated_at')
      .eq('week_id', weekId)
      .in('user_id', uids)
      .order('xp', { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => toEntry(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

/**
 * Resolves an invite code to the owning user; null ONLY when the code is
 * unknown (empty result). Network/auth/server failures throw a Turkish Error
 * so a transient failure is not misread as an unknown code.
 */
export async function resolveInvite(code: string): Promise<InviteDoc | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let result: { data: unknown; error: unknown };
  try {
    result = await sb.rpc('resolve_invite', { code: code.trim().toUpperCase() });
  } catch (e) {
    throw toTurkishError(e);
  }
  if (result.error) throw toTurkishError(result.error);
  const row = (result.data as { user_id: string; nickname: string }[] | null)?.[0];
  return row ? { uid: row.user_id, nickname: row.nickname } : null;
}

/** Adds `friendUid` to the caller's own friend list; an existing row is success. */
export async function addFriend(uid: string, friendUid: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('friends').insert({ user_id: uid, friend_id: friendUid });
    if (error) {
      if (error.code === '23505') return true; // duplicate row: already friends
      throw toTurkishError(error);
    }
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

/** The caller's friends with their current nicknames (via the my_friends RPC). */
export async function listFriends(): Promise<FriendDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc('my_friends');
    if (error) return [];
    return (data as { friend_id: string; nickname: string; added_at: string }[] | null)?.map((row) => ({
      friend_uid: row.friend_id,
      nickname: row.nickname,
      added_at: row.added_at,
    })) ?? [];
  } catch {
    return [];
  }
}

export async function removeFriend(uid: string, friendUid: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('friends').delete().eq('user_id', uid).eq('friend_id', friendUid);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}
