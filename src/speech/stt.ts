import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { LangCode } from '@/domain/types';
import { toLocale } from './locale';

export type SttStatus = 'idle' | 'listening' | 'done' | 'error' | 'unavailable';

export interface SpeechRecognitionHandle {
  status: SttStatus;
  /** best transcript so far (interim while listening, final when done) */
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Error codes that mean the exercise should be offered as skippable rather than retried. */
const UNAVAILABLE_CODES: ReadonlySet<ExpoSpeechRecognitionErrorCode> = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
]);

/**
 * The package calls `requireNativeModule` at import time, which throws in Expo Go
 * (no native module). Loading it lazily keeps the rest of the app bootable there;
 * the Speak exercise then reports `unavailable` and can be skipped.
 */
type SttModule = typeof import('expo-speech-recognition')['ExpoSpeechRecognitionModule'];
let cached: SttModule | null | undefined;
function loadModule(): SttModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as typeof import('expo-speech-recognition');
    cached = mod.ExpoSpeechRecognitionModule;
  } catch {
    cached = null;
  }
  return cached;
}

function isAvailable(): boolean {
  try {
    return loadModule()?.isRecognitionAvailable() ?? false;
  } catch {
    return false;
  }
}

/**
 * Thin hook over expo-speech-recognition (SDK 58).
 * Verified API: `ExpoSpeechRecognitionModule.start/stop/abort/requestPermissionsAsync/
 * isRecognitionAvailable` and `NativeModule.addListener('result'|'error'|'start'|'end')`.
 */
export function useSpeechRecognition(lang: LangCode): SpeechRecognitionHandle {
  const [status, setStatus] = useState<SttStatus>(() => (isAvailable() ? 'idle' : 'unavailable'));
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listening = useRef(false);

  useEffect(() => {
    const mod = loadModule();
    if (!mod) return;
    const subs = [
      mod.addListener('start', () => {
        listening.current = true;
        setStatus('listening');
      }),
      mod.addListener('result', (event) => {
        const best = event.results[0]?.transcript ?? '';
        setTranscript(best);
        if (event.isFinal) setStatus('done');
      }),
      mod.addListener('end', () => {
        listening.current = false;
        setStatus((s) => (s === 'listening' ? 'done' : s));
      }),
      mod.addListener('error', (event) => {
        listening.current = false;
        // "aborted" is our own stop()/reset(); "no-speech" just means try again.
        if (event.error === 'aborted') return;
        setError(event.message || event.error);
        setStatus(UNAVAILABLE_CODES.has(event.error) ? 'unavailable' : 'error');
      }),
    ];
    return () => {
      for (const s of subs) s.remove();
      // Never leave the microphone open when the exercise unmounts.
      try {
        if (listening.current) mod.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(async () => {
    const mod = loadModule();
    if (!mod || !isAvailable()) {
      setStatus('unavailable');
      return;
    }
    setError(null);
    setTranscript('');
    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        setError('permission-denied');
        setStatus('unavailable');
        return;
      }
      mod.start({
        lang: toLocale(lang),
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (!listening.current) return;
    try {
      loadModule()?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    try {
      if (listening.current) loadModule()?.abort();
    } catch {
      /* ignore */
    }
    listening.current = false;
    setTranscript('');
    setError(null);
    setStatus(isAvailable() ? 'idle' : 'unavailable');
  }, []);

  return { status, transcript, error, start, stop, reset };
}
