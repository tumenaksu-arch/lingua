import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import type { LangCode } from '@/domain/types';
import { shellPlugin } from '@/platform/nativeShell';
import { useSettingsStore } from '@/ui/settingsStore';
import { toLocale } from './locale';
import {
  isServerTtsBlocked,
  markServerTtsFailure,
  serverSpeedFor,
  speakServer,
  stopServerAudio,
  supportsServerVoice,
} from './serverTts';

export interface SpeakOptions {
  /** 0.1 – 2.0; Duolingo "turtle" button uses ~0.6 */
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Natural server voice applies only on the web build (browser + Android WebView
 * shell, both have HTMLAudioElement), for the five supported languages, when the
 * user picked "Doğal (sunucu)", the 60 s post-failure window has expired and the
 * device reports itself online.
 */
function wantsServerVoice(lang: LangCode): boolean {
  return (
    Platform.OS === 'web' &&
    supportsServerVoice(lang) &&
    useSettingsStore.getState().voice === 'dogal' &&
    !isServerTtsBlocked() &&
    online()
  );
}

/**
 * Speak `text` in the given language. Interrupts anything currently queued so
 * a double tap on the speaker button never stacks utterances.
 * Verified against expo-speech SDK 58: `speak(text, options)`, `stop()`, `isSpeakingAsync()`.
 */
export async function speak(text: string, lang: LangCode, opts: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return;
  const native = shellPlugin('TextToSpeech');
  if (wantsServerVoice(lang)) {
    try {
      // Normal playback → 1.0; the slow button passes rate < 1 → map the stored slowRate.
      const speed = (opts.rate ?? 1) < 1 ? serverSpeedFor(useSettingsStore.getState().slowRate) : 1;
      await speakServer(text, lang, speed);
      opts.onDone?.();
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Interrupted by a newer speak()/stop(): nothing more to do for this utterance.
        opts.onError?.(e);
        return;
      }
      // Any server failure (network, timeout, non-2xx, playback): remember it for
      // 60 s so offline does not add a 4 s delay to every tap, then fall through
      // to the device engine for THIS utterance.
      markServerTtsFailure();
    }
  }
  // Android web shell: WebView has no speechSynthesis, so use the device TTS engine.
  if (native) {
    try {
      await native.stop();
      await native.speak({ text, lang: toLocale(lang), rate: opts.rate ?? 1, pitch: opts.pitch ?? 1 });
      opts.onDone?.();
    } catch (e) {
      opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
    return;
  }
  try {
    await Speech.stop();
    Speech.speak(text.slice(0, Speech.maxSpeechInputLength), {
      language: toLocale(lang),
      rate: opts.rate ?? 1,
      pitch: opts.pitch ?? 1,
      onDone: opts.onDone,
      onError: opts.onError,
    });
  } catch (e) {
    // TTS is best-effort: a missing engine (e.g. some emulators) must not crash a lesson.
    opts.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function stop(): Promise<void> {
  stopServerAudio();
  try {
    const native = shellPlugin('TextToSpeech');
    if (native) await native.stop();
    else await Speech.stop();
  } catch {
    /* ignore */
  }
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
