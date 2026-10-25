import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Legacy Firebase Auth session detection. The Firebase RN SDK persisted the signed-in
 * user in AsyncStorage under `firebase:authUser:<apiKey>...` as the stringified user
 * object (with at least `uid` and `email`). After the Supabase migration those sessions
 * are dead, but the uid matters: local SQLite rows may still be keyed with it, and the
 * account-migration flow re-keys them to the new Supabase uid.
 */

export const LEGACY_AUTH_KEY_PREFIX = 'firebase:authUser:';

export interface LegacyAccount {
  uid: string;
  email: string | null;
}

/** Reads the first parsable legacy Firebase auth entry; null when there is none. */
export async function detectLegacyAccount(): Promise<LegacyAccount | null> {
  return (await detectLegacyAccounts())[0] ?? null;
}

/**
 * Reads EVERY parsable legacy Firebase auth entry. Devices can hold entries
 * under several API keys (key rotation, different Firebase projects) whose
 * local SQLite rows are keyed by DIFFERENT legacy uids — returning only the
 * first would strand the other uids' rows (their keys are still wiped by
 * clearLegacyAccount). Unparseable values are skipped.
 */
export async function detectLegacyAccounts(): Promise<LegacyAccount[]> {
  const accounts: LegacyAccount[] = [];
  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) {
      if (!key.startsWith(LEGACY_AUTH_KEY_PREFIX)) continue;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { uid?: unknown; email?: unknown };
        if (typeof parsed.uid === 'string' && parsed.uid) {
          accounts.push({ uid: parsed.uid, email: typeof parsed.email === 'string' ? parsed.email : null });
        }
      } catch {
        /* not JSON — some other firebase:authUser:* value; keep looking */
      }
    }
  } catch {
    /* storage unavailable — treat as no legacy account */
  }
  return accounts;
}

/** Removes every legacy Firebase auth key (called once the account has been migrated). */
export async function clearLegacyAccount(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(LEGACY_AUTH_KEY_PREFIX)));
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
