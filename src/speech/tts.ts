import * as Speech from 'expo-speech';
import type { LangCode } from '@/domain/types';
import { toLocale } from './locale';

export interface SpeakOptions {
  /** 0.1 – 2.0; Duolingo "turtle" button uses ~0.6 */
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Speak `text` in the given language. Interrupts anything currently queued so
 * a double tap on the speaker button never stacks utterances.
 * Verified against expo-speech SDK 58: `speak(text, options)`, `stop()`, `isSpeakingAsync()`.
 */
export async function speak(text: string, lang: LangCode, opts: SpeakOptions = {}): Promise<void> {
  if (!text.trim()) return;
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
  try {
    await Speech.stop();
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
