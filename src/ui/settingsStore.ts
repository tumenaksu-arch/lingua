import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'settings_v1';
// Konuşma pratiği modu AYRI bir anahtarda saklanır: `settings_v1` içindeki
// alanlar "tam nesne" olarak kalıcıdır ve mevcut testlerin/verinin şeması değişmez.
const KONUS_MODE_KEY = 'konus_mode_v1';

/** Allowed values for the "slow pronunciation" speech rate (turtle button). */
export const SLOW_RATES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8] as const;

interface Settings {
  soundEnabled: boolean;
  slowRate: number;
  /** "Rahat mod": no heart limit, lessons never block on hearts. */
  relaxedHearts: boolean;
  /** 'dogal' (default): natural server voice, falls back to the device engine offline; 'cihaz': device TTS only. */
  voice: 'dogal' | 'cihaz';
}

export type VoiceSetting = Settings['voice'];
/** Konuşma pratiği giriş modu: yazılı klavye ya da sesli mikrofon. */
export type KonusMode = 'yazili' | 'sesli';

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSoundEnabled: (on: boolean) => Promise<void>;
  setSlowRate: (rate: number) => Promise<void>;
  setRelaxedHearts: (on: boolean) => Promise<void>;
  setVoice: (voice: VoiceSetting) => Promise<void>;
  /** Konuşma pratiği giriş modu (tercih hatırlanır). */
  konusMode: KonusMode;
  setKonusMode: (mode: KonusMode) => Promise<void>;
}

const DEFAULTS: Settings = { soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'dogal' };

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

/** Always persist the FULL settings object (missing fields would erase each other on hydrate). */
function snapshot(s: SettingsState): Settings {
  return { soundEnabled: s.soundEnabled, slowRate: s.slowRate, relaxedHearts: s.relaxedHearts, voice: s.voice };
}

/** Device-level preferences (not synced to the account). */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  konusMode: 'yazili',
  async hydrate() {
    if (get().hydrated) return;
    try {
      const storedMode = await AsyncStorage.getItem(KONUS_MODE_KEY);
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
      // missing/invalid stored value falls back to the default (0.6)
      const storedRate = (SLOW_RATES as readonly number[]).find((r) => r === parsed.slowRate);
      set({
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULTS.soundEnabled,
        slowRate: storedRate ?? DEFAULTS.slowRate,
        // stored data from before Rahat mod: missing ⇒ off
        relaxedHearts: typeof parsed.relaxedHearts === 'boolean' ? parsed.relaxedHearts : DEFAULTS.relaxedHearts,
        // stored data from before the voice setting: missing ⇒ doğal
        voice: parsed.voice === 'cihaz' ? 'cihaz' : DEFAULTS.voice,
        konusMode: storedMode === 'sesli' ? 'sesli' : 'yazili',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true, konusMode: 'yazili' });
    }
  },
  async setSoundEnabled(soundEnabled) {
    set({ soundEnabled });
    await persist(snapshot(get()));
  },
  async setSlowRate(rate) {
    const slowRate = snapRate(rate);
    set({ slowRate });
    await persist(snapshot(get()));
  },
  async setRelaxedHearts(relaxedHearts) {
    set({ relaxedHearts });
    await persist(snapshot(get()));
  },
  async setVoice(voice) {
    set({ voice });
    await persist(snapshot(get()));
  },
  async setKonusMode(konusMode) {
    set({ konusMode });
    try {
      await AsyncStorage.setItem(KONUS_MODE_KEY, konusMode);
    } catch {
      /* best effort */
    }
  },
}));
