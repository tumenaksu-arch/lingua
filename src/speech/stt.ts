import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { LangCode } from '@/domain/types';
import { isNativeShell, shellPlugin, type ListenerHandle } from '@/platform/nativeShell';
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
 * Speech recognition for the Speak exercise: expo-speech-recognition in Expo/EAS builds and
 * browsers, the device recognizer (via the shell's SpeechRecognition plugin) in the Android
 * web shell, whose WebView has no working Web Speech API. The shell injects `window.Capacitor`
 * before the page scripts run and it never changes, so the same implementation (and hook
 * order) is used on every render.
 */
export function useSpeechRecognition(lang: LangCode): SpeechRecognitionHandle {
  const impl = isNativeShell() ? useShellSpeechRecognition : useExpoSpeechRecognition;
  return impl(lang);
}

/**
 * Thin hook over expo-speech-recognition (SDK 58).
 * Verified API: `ExpoSpeechRecognitionModule.start/stop/abort/requestPermissionsAsync/
 * isRecognitionAvailable` and `NativeModule.addListener('result'|'error'|'start'|'end')`.
 */
function useExpoSpeechRecognition(lang: LangCode): SpeechRecognitionHandle {
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

/**
 * Shell path (@capacitor-community/speech-recognition 7). With `partialResults: true`
 * Android resolves `start` immediately and streams `partialResults`; `listeningState`
 * reports when the recognizer stops.
 */
function useShellSpeechRecognition(lang: LangCode): SpeechRecognitionHandle {
  const [status, setStatus] = useState<SttStatus>(() => (shellPlugin('SpeechRecognition') ? 'idle' : 'unavailable'));
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listening = useRef(false);

  useEffect(() => {
    const plugin = shellPlugin('SpeechRecognition');
    if (!plugin) return;
    let alive = true;
    let handles: ListenerHandle[] = [];
    plugin
      .available()
      .then((r) => {
        if (alive && !r.available) setStatus('unavailable');
      })
      .catch(() => {
        if (alive) setStatus('unavailable');
      });
    void Promise.all([
      plugin.addListener('partialResults', (data) => {
        if (alive) setTranscript(data.matches[0] ?? '');
      }),
      plugin.addListener('listeningState', (data) => {
        if (!alive) return;
        listening.current = data.status === 'started';
        if (data.status === 'started') setStatus('listening');
        else setStatus((s) => (s === 'listening' ? 'done' : s));
      }),
    ]).then((h) => {
      if (alive) handles = h;
      else for (const x of h) void x.remove();
    });
    return () => {
      alive = false;
      for (const x of handles) void x.remove();
      // Never leave the microphone open when the exercise unmounts.
      if (listening.current) void plugin.stop().catch(() => {});
    };
  }, []);

  const start = useCallback(async () => {
    const plugin = shellPlugin('SpeechRecognition');
    if (!plugin) {
      setStatus('unavailable');
      return;
    }
    setError(null);
    setTranscript('');
    try {
      const perm = await plugin.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        setError('permission-denied');
        setStatus('unavailable');
        return;
      }
      listening.current = true;
      setStatus('listening');
      const r = await plugin.start({ language: toLocale(lang), maxResults: 1, partialResults: true, popup: false });
      if (r?.matches?.[0]) setTranscript(r.matches[0]);
    } catch (e) {
      listening.current = false;
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (!listening.current) return;
    void shellPlugin('SpeechRecognition')?.stop().catch(() => {});
  }, []);

  const reset = useCallback(() => {
    if (listening.current) void shellPlugin('SpeechRecognition')?.stop().catch(() => {});
    listening.current = false;
    setTranscript('');
    setError(null);
    setStatus(shellPlugin('SpeechRecognition') ? 'idle' : 'unavailable');
  }, []);

  return { status, transcript, error, start, stop, reset };
}

