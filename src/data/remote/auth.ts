import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabase } from './supabase';

/**
 * The subset of the Supabase (GoTrue) user the app needs; keeps screens SDK-agnostic.
 * `uid` is the auth.users UUID used as user_id in every synced row (RLS keys on it).
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export class AuthUnavailableError extends Error {
  constructor() {
    super('Supabase yapılandırılmamış; .env dosyasında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımla.');
  }
}

/**
 * GoTrue/Supabase error codes → Turkish messages shown in the auth screens.
 * Codes are matched first, message text as a fallback for older GoTrue versions
 * that only return an error description.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-posta veya şifre hatalı.',
  email_exists: 'Bu e-posta zaten kayıtlı.',
  weak_password: 'Şifre en az 6 karakter olmalı.',
  otp_expired: 'Kod hatalı ya da süresi dolmuş.',
  over_request_rate_limit: 'Çok fazla deneme. Biraz sonra tekrar dene.',
  validation_failed: 'E-posta adresi geçersiz.',
};

export function authErrorMessage(e: unknown): string {
  const code =
    typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  const status = typeof e === 'object' && e && 'status' in e ? Number((e as { status: unknown }).status) : NaN;
  const msg = e instanceof Error ? e.message : String(e);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (status === 429 || /rate.?limit/i.test(code)) return MESSAGES.over_request_rate_limit!;
  const text = msg.toLowerCase();
  if (code === 'invalid_email' || (code === 'validation_failed' && text.includes('email'))) {
    return 'E-posta adresi geçersiz.';
  }
  if (
    code === 'invalid_token' ||
    text.includes('invalid token') ||
    text.includes('token has expired') ||
    text.includes('otp') ||
    code === 'otp_disabled'
  ) {
    return 'Kod hatalı ya da süresi dolmuş.';
  }
  if (text.includes('at least 6 characters') || text.includes('password')) {
    return 'Şifre en az 6 karakter olmalı.';
  }
  if (/already (?:been )?registered/.test(text)) {
    return 'Bu e-posta zaten kayıtlı.';
  }
  if (text.includes('failed to fetch') || text.includes('network') || /fetcherror/i.test(String((e as { name?: unknown })?.name))) {
    return 'Ağ hatası. Bağlantını kontrol et.';
  }
  return msg;
}

function toUser(u: User | null): AuthUser | null {
  return u ? { uid: u.id, email: u.email ?? null, displayName: null } : null;
}

function client(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new AuthUnavailableError();
  return sb;
}

export async function signUp(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await client().auth.signUp({ email, password });
  if (error) throw error;
  return toUser(data.user)!;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return toUser(data.user)!;
}

/**
 * Passwordless login: e-mails a 6-digit code. `shouldCreateUser` makes the first
 * login double as sign-up, so the button works for both new and existing accounts.
 */
export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Verifies the 6-digit code from `sendLoginCode`; on success the user is signed in. */
export async function verifyLoginCode(email: string, code: string): Promise<AuthUser> {
  const { data, error } = await client().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
  return toUser(data.user)!;
}

/** Sets/replaces the password of the SIGNED-IN user (after a code login). */
export async function setPassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw error;
}

/**
 * "Şifremi unuttum": sends the same 6-digit code as passwordless login; after
 * verifying it the user can pick a new password with `setPassword`.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendLoginCode(email);
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

/** The persisted session's user, null when signed out or when Supabase is not configured. */
export async function currentUser(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return toUser(data.session?.user ?? null);
}

/**
 * Calls `cb` with the current user (restored session included) and on every
 * subsequent sign-in/sign-out. Returns an unsubscribe function; no-op when
 * Supabase is not configured.
 */
export function onAuthChanged(cb: (user: AuthUser | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  let initialDone = false;
  void sb.auth.getSession().then(({ data }) => {
    initialDone = true;
    cb(toUser(data.session?.user ?? null));
  });
  const {
    data: { subscription },
  } = sb.auth.onAuthStateChange((event, session) => {
    // INITIAL_SESSION duplicates the getSession() call above.
    if (event === 'INITIAL_SESSION') {
      if (!initialDone) cb(toUser(session?.user ?? null));
      return;
    }
    cb(toUser(session?.user ?? null));
  });
  return () => subscription.unsubscribe();
}
