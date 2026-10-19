import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

/** The subset of the Firebase user the app needs; keeps screens SDK-agnostic. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export class AuthUnavailableError extends Error {
  constructor() {
    super('Firebase is not configured; set EXPO_PUBLIC_FIREBASE_* in .env.');
  }
}

/** Firebase error codes → Turkish messages shown in the auth screen. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-posta adresi geçersiz.',
  'auth/missing-password': 'Şifre gerekli.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
  'auth/user-not-found': 'E-posta veya şifre hatalı.',
  'auth/wrong-password': 'E-posta veya şifre hatalı.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/too-many-requests': 'Çok fazla deneme. Biraz sonra tekrar dene.',
  'auth/network-request-failed': 'Ağ hatası. Bağlantını kontrol et.',
  'auth/operation-not-allowed': 'E-posta/şifre girişi bu projede etkin değil.',
};

export function authErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  return MESSAGES[code] ?? (e instanceof Error ? e.message : String(e));
}

function toUser(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
}

function auth() {
  const a = getFirebaseAuth();
  if (!a) throw new AuthUnavailableError();
  return a;
}

export async function signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
  const cred = await createUserWithEmailAndPassword(auth(), email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return toUser(cred.user)!;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const cred = await signInWithEmailAndPassword(auth(), email, password);
  return toUser(cred.user)!;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth());
}

/**
 * Resolves with the persisted user once Firebase has restored the session
 * (null when signed out or when Firebase is not configured).
 */
export function getCurrentUser(): Promise<AuthUser | null> {
  const a = getFirebaseAuth();
  if (!a) return Promise.resolve(null);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(a, (u) => {
      unsub();
      resolve(toUser(u));
    });
  });
}

/** Returns an unsubscribe function. No-op when Firebase is not configured. */
export function onAuthStateChange(cb: (user: AuthUser | null) => void): () => void {
  const a = getFirebaseAuth();
  if (!a) return () => {};
  return onAuthStateChanged(a, (u) => cb(toUser(u)));
}
