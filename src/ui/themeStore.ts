import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme_preference';

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (p: ThemePreference) => Promise<void>;
}

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

/** Theme override, persisted per device. 'system' follows the OS appearance. */
export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const v = await AsyncStorage.getItem(KEY);
      set({ preference: isPreference(v) ? v : 'system', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  async setThemePreference(preference) {
    set({ preference });
    try {
      await AsyncStorage.setItem(KEY, preference);
    } catch {
      /* best effort */
    }
  },
}));

export const setThemePreference = (p: ThemePreference) => useThemeStore.getState().setThemePreference(p);
