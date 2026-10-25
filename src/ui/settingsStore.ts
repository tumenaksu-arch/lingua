import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'settings_v1';

/** Allowed values for the "slow pronunciation" speech rate (turtle button). */
export const SLOW_RATES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8] as const;

interface Settings {
  soundEnabled: boolean;
  slowRate: number;
  /** "Rahat mod": no heart limit, lessons never block on hearts. */
  relaxedHearts: boolean;
}

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSoundEnabled: (on: boolean) => Promise<void>;
  setSlowRate: (rate: number) => Promise<void>;
  setRelaxedHearts: (on: boolean) => Promise<void>;
}

const DEFAULTS: Settings = { soundEnabled: true, slowRate: 0.6, relaxedHearts: false };

/** Snap an arbitrary rate to the nearest allowed SLOW_RATES value. */
function snapRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULTS.slowRate;
  return SLOW_RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), SLOW_RATES[0]);
}

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
      // missing/invalid stored value falls back to the default (0.6)
      const storedRate = (SLOW_RATES as readonly number[]).find((r) => r === parsed.slowRate);
      set({
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULTS.soundEnabled,
        slowRate: storedRate ?? DEFAULTS.slowRate,
        // stored data from before Rahat mod: missing ⇒ off
        relaxedHearts: typeof parsed.relaxedHearts === 'boolean' ? parsed.relaxedHearts : DEFAULTS.relaxedHearts,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  async setSoundEnabled(soundEnabled) {
    set({ soundEnabled });
    await persist({ soundEnabled, slowRate: get().slowRate, relaxedHearts: get().relaxedHearts });
  },
  async setSlowRate(rate) {
    const slowRate = snapRate(rate);
    set({ slowRate });
    await persist({ soundEnabled: get().soundEnabled, slowRate, relaxedHearts: get().relaxedHearts });
  },
  async setRelaxedHearts(relaxedHearts) {
    set({ relaxedHearts });
    await persist({ soundEnabled: get().soundEnabled, slowRate: get().slowRate, relaxedHearts });
  },
}));
