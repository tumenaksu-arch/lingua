import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when env is present; otherwise the app runs in offline-only mode. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * SecureStore values are limited to 2048 bytes on iOS/Android; a Supabase
 * session JSON is commonly larger, so values are split into numbered chunks
 * (`key.0`, `key.1`, …) with the chunk count stored under `key.n`.
 */
const CHUNK = 1900;

function chunkKey(key: string, i: number | 'n'): string {
  // SecureStore keys must match [A-Za-z0-9._-]
  return `${key.replace(/[^A-Za-z0-9._-]/g, '_')}.${i}`;
}

export const chunkedSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await SecureStore.getItemAsync(chunkKey(key, 'n'));
    if (n === null) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(n); i++) {
      const p = await SecureStore.getItemAsync(chunkKey(key, i));
      if (p === null) return null; // corrupted; treat as signed out
      parts.push(p);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const prev = Number((await SecureStore.getItemAsync(chunkKey(key, 'n'))) ?? 0);
    const n = Math.ceil(value.length / CHUNK) || 1;
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(chunkKey(key, 'n'), String(n));
    for (let i = n; i < prev; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  },
  async removeItem(key: string): Promise<void> {
    const n = Number((await SecureStore.getItemAsync(chunkKey(key, 'n'))) ?? 0);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
    await SecureStore.deleteItemAsync(chunkKey(key, 'n'));
  },
};

let client: SupabaseClient | null = null;

/** Returns the shared client, or null when not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: chunkedSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Refresh tokens only while the app is in the foreground.
    const onChange = (state: AppStateStatus | string | null | undefined) => {
      if (state === 'active') client!.auth.startAutoRefresh();
      else client!.auth.stopAutoRefresh();
    };
    AppState.addEventListener('change', onChange);
    onChange(AppState.currentState);
  }
  return client;
}
