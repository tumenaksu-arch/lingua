import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
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

function isAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    // Expo Go / web without the native module: the module proxy throws.
    return false;
  }
}

/**
 * Thin hook over expo-speech-recognition (SDK 58).
 * Verified API: `ExpoSpeechRecognitionModule.start/stop/abort/requestPermissionsAsync/
 * isRecognitionAvailable` and `useSpeechRecognitionEvent('result'|'error'|'start'|'end')`.
 */
export function useSpeechRecognition(lang: LangCode): SpeechRecognitionHandle {
  const [status, setStatus] = useState<SttStatus>(() => (isAvailable() ? 'idle' : 'unavailable'));
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listening = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    listening.current = true;
    setStatus('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results[0]?.transcript ?? '';
    setTranscript(best);
    if (event.isFinal) setStatus('done');
  });

  useSpeechRecognitionEvent('end', () => {
    listening.current = false;
    setStatus((s) => (s === 'listening' ? 'done' : s));
  });

  useSpeechRecognitionEvent('error', (event) => {
    listening.current = false;
    // "aborted" is our own stop()/reset(); "no-speech" just means try again.
    if (event.error === 'aborted') return;
    setError(event.message || event.error);
    setStatus(UNAVAILABLE_CODES.has(event.error) ? 'unavailable' : 'error');
  });

  const start = useCallback(async () => {
    if (!isAvailable()) {
      setStatus('unavailable');
      return;
    }
    setError(null);
    setTranscript('');
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('permission-denied');
        setStatus('unavailable');
        return;
      }
      ExpoSpeechRecognitionModule.start({
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
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    try {
      if (listening.current) ExpoSpeechRecognitionModule.abort();
    } catch {
      /* ignore */
    }
    listening.current = false;
    setTranscript('');
    setError(null);
    setStatus(isAvailable() ? 'idle' : 'unavailable');
  }, []);

  // Never leave the microphone open when the exercise unmounts.
  useEffect(() => {
    return () => {
      try {
        if (listening.current) ExpoSpeechRecognitionModule.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { status, transcript, error, start, stop, reset };
}
