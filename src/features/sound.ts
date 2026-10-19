import { useSettingsStore } from '@/ui/settingsStore';

/**
 * Short UI feedback sounds (generated PCM WAVs in ./sounds). Players are
 * created lazily and kept for reuse; every call is guarded so a missing or
 * failing native module (Expo Go, simulators, web) never breaks a lesson.
 * Verified API (expo-audio SDK 57): `createAudioPlayer(source, options)`,
 * `AudioPlayer.play()/seekTo(seconds)/remove()`, `setAudioModeAsync`.
 */
type SoundName = 'correct' | 'wrong' | 'complete';

type Player = { play: () => void; seekTo: (seconds: number) => Promise<void>; remove: () => void };
type AudioModule = {
  createAudioPlayer: (source: number) => Player;
  setAudioModeAsync?: (mode: { playsInSilentMode?: boolean }) => Promise<void>;
};

const SOURCES: Record<SoundName, number> = {
  correct: require('./sounds/correct.wav'),
  wrong: require('./sounds/wrong.wav'),
  complete: require('./sounds/complete.wav'),
};

let audio: AudioModule | null | undefined;
const players = new Map<SoundName, Player>();
let modeConfigured = false;

function loadAudio(): AudioModule | null {
  if (audio !== undefined) return audio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audio = require('expo-audio') as AudioModule;
  } catch {
    audio = null;
  }
  return audio;
}

function playerFor(name: SoundName): Player | null {
  const mod = loadAudio();
  if (!mod) return null;
  let p = players.get(name);
  if (!p) {
    try {
      p = mod.createAudioPlayer(SOURCES[name]);
      players.set(name, p);
    } catch {
      return null;
    }
  }
  return p;
}

async function play(name: SoundName): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  const mod = loadAudio();
  if (!mod) return;
  try {
    if (!modeConfigured && mod.setAudioModeAsync) {
      modeConfigured = true;
      // Feedback blips should not take over music apps and should follow the ringer switch.
      await mod.setAudioModeAsync({ playsInSilentMode: false });
    }
    const p = playerFor(name);
    if (!p) return;
    await p.seekTo(0);
    p.play();
  } catch {
    /* sound is best-effort */
  }
}

export const playCorrect = () => play('correct');
export const playWrong = () => play('wrong');
export const playComplete = () => play('complete');

/** Releases native players (e.g. on sign-out or when leaving the lesson stack). */
export function releaseSounds(): void {
  for (const p of players.values()) {
    try {
      p.remove();
    } catch {
      /* ignore */
    }
  }
  players.clear();
}
