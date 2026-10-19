import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export class AuthUnavailableError extends Error {
  constructor() {
    super('Supabase is not configured; set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

function client() {
  const c = getSupabase();
  if (!c) throw new AuthUnavailableError();
  return c;
}

export async function signUp(email: string, password: string, displayName?: string): Promise<Session | null> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: displayName ? { display_name: displayName } : undefined },
  });
  if (error) throw error;
  return data.session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

/** Null when signed out or when Supabase is not configured. */
export async function getSession(): Promise<Session | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Returns an unsubscribe function. No-op when Supabase is not configured. */
export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  const c = getSupabase();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
