import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import { getFirestoreDb } from './firebase';

/**
 * Social data (roadmap item 3b): nickname profile, invite codes, weekly
 * leaderboard entries and the friend list. See the data-model block in
 * firestore.rules for the exact shapes and access rules.
 * Every helper degrades gracefully: when Firebase is not configured the
 * Firestore handle is null and the functions return null / [] / false.
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
  created_at: string;
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

export async function getProfile(uid: string): Promise<ProfileDoc | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'current'));
  return snap.exists() ? (snap.data() as ProfileDoc) : null;
}

/**
 * Creates the invite code on first save. Create fails (permission-denied) when
 * the code already belongs to someone else, so we retry with a fresh code,
 * at most 5 attempts.
 */
async function createInvite(db: Firestore, uid: string, nickname: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomInviteCode();
    try {
      await setDoc(doc(db, 'invites', code), { uid, nickname, created_at: new Date().toISOString() });
      return code;
    } catch (e) {
      const errCode = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (errCode !== 'permission-denied' || attempt === 4) throw e;
    }
  }
  throw new Error('Davet kodu üretilemedi. Lütfen tekrar dene.');
}

export async function saveProfile(uid: string, nickname: string): Promise<ProfileDoc | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  let inviteCode = (await getProfile(uid))?.invite_code;
  if (!inviteCode) inviteCode = await createInvite(db, uid, nickname);
  const profile: ProfileDoc = { user_id: uid, nickname, invite_code: inviteCode, updated_at: new Date().toISOString() };
  await setDoc(doc(db, 'users', uid, 'profile', 'current'), profile, { merge: true });
  return profile;
}

/** Creates or updates the caller's own row for the given ISO week. */
export async function upsertWeeklyEntry(uid: string, nickname: string, xp: number, weekId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  await setDoc(
    doc(db, 'leaderboard', weekId, 'entries', uid),
    { nickname, xp, updated_at: new Date().toISOString() },
    { merge: true },
  );
  return true;
}

/** Top `max` entries of the week, best XP first. */
export async function topEntries(weekId: string, max = 50): Promise<LeaderboardEntry[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'leaderboard', weekId, 'entries'), orderBy('xp', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<LeaderboardEntry, 'uid'>) }));
}

/** Individual gets for a set of uids (friend rows); silently skips missing docs. */
export async function entriesFor(weekId: string, uids: string[]): Promise<LeaderboardEntry[]> {
  const db = getFirestoreDb();
  if (!db || uids.length === 0) return [];
  const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'leaderboard', weekId, 'entries', uid))));
  const out: LeaderboardEntry[] = [];
  for (const s of snaps) {
    if (s.exists()) out.push({ uid: s.id, ...(s.data() as Omit<LeaderboardEntry, 'uid'>) });
  }
  return out;
}

/** Resolves an invite code to the owning user; null when unknown or offline. */
export async function resolveInvite(code: string): Promise<InviteDoc | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'invites', code.trim().toUpperCase()));
  return snap.exists() ? (snap.data() as InviteDoc) : null;
}

export async function addFriend(uid: string, friendUid: string, nickname: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  await setDoc(doc(db, 'users', uid, 'friends', friendUid), {
    friend_uid: friendUid,
    nickname,
    added_at: new Date().toISOString(),
  });
  return true;
}

export async function listFriends(uid: string): Promise<FriendDoc[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, 'users', uid, 'friends'));
  return snap.docs.map((d) => d.data() as FriendDoc);
}

export async function removeFriend(uid: string, friendUid: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  await deleteDoc(doc(db, 'users', uid, 'friends', friendUid));
  return true;
}
