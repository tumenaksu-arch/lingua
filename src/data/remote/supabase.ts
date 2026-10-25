import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Self-hosted Supabase (Auth + PostgREST) on the ankaxai.ai server, reached at
 * EXPO_PUBLIC_SUPABASE_URL (nginx: /lovevox-api/auth/v1 → GoTrue, /rest/v1 → PostgREST).
 * The anon key is public by design; Postgres RLS (supabase/migrations) enforces access.
 * Without config the app runs offline-only and this returns null.
 */
export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = supabaseConfig();
  client = cfg
    ? createClient(cfg.url, cfg.anonKey, {
        auth: {
          storage: AsyncStorage,
          storageKey: 'lovevox-auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
  return client;
}

/** Test hook: forget the cached client (e.g. after changing env in a test). */
export function resetSupabaseForTests(): void {
  client = undefined;
}
