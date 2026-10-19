import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'settings_v1';

interface Settings {
  soundEnabled: boolean;
}

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSoundEnabled: (on: boolean) => Promise<void>;
}

const DEFAULTS: Settings = { soundEnabled: true };

async function persist(s: Settings) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* best effort */
  }
}

/** Device-level preferences (not synced to the account). */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
      set({ soundEnabled: parsed.soundEnabled ?? DEFAULTS.soundEnabled, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  async setSoundEnabled(soundEnabled) {
    set({ soundEnabled });
    await persist({ soundEnabled });
  },
}));
