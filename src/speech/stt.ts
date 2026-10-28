import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { LangCode } from '@/domain/types';
import { isNativeShell, shellPlugin, type ListenerHandle } from '@/platform/nativeShell';
import { toLocale } from './locale';
import { stop as stopSpeaking } from './tts';

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

/** Shell recognizer watchdog: poll the plugin, give up after a while (the plugin can fail silently). */
const POLL_MS = 500;
const START_GRACE_MS = 1500;
const LISTEN_TIMEOUT_MS = 12_000;

/**
 * Plugin-side listening flag; `null` when unknown (older shell without isListening, or the call
 * failed) — callers then rely on events and the timeout only.
 */
async function pluginIsListening(plugin: { isListening?: () => Promise<{ listening: boolean }> }): Promise<boolean | null> {
  if (typeof plugin.isListening !== 'function') return null;
  try {
    return (await plugin.isListening()).listening;
  } catch {
    return null;
  }
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
      // Same as the shell path: the auto-played prompt must not play into the mic, and a session
      // left over from the previous attempt is aborted before a new one starts.
      await stopSpeaking();
      if (listening.current) {
        try {
          mod.abort();
        } catch {
          /* ignore */
        }
        listening.current = false;
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
  const transcriptRef = useRef('');
  const watchdog = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (!alive) return;
        transcriptRef.current = data.matches[0] ?? '';
        setTranscript(transcriptRef.current);
      }),
      plugin.addListener('listeningState', (data) => {
        if (!alive) return;
        if (data.status === 'started') {
          listening.current = true;
          setStatus('listening');
        } else {
          if (watchdog.current) clearInterval(watchdog.current);
          watchdog.current = null;
          listening.current = false;
          setStatus((s) => (s === 'listening' ? (transcriptRef.current.trim() ? 'done' : 'idle') : s));
        }
      }),
    ]).then((h) => {
      if (alive) handles = h;
      else for (const x of h) void x.remove();
    });
    return () => {
      alive = false;
      if (watchdog.current) clearInterval(watchdog.current);
      watchdog.current = null;
      for (const x of handles) void x.remove();
      // Never leave the microphone open when the exercise unmounts.
      if (listening.current) void plugin.stop().catch(() => {});
    };
  }, []);

  /** Ends the watchdog; if the recognizer stopped without a 'stopped' event, settle the UI ourselves. */
  const finish = useCallback((reason: 'ended' | 'timeout' | 'user') => {
    if (watchdog.current) clearInterval(watchdog.current);
    watchdog.current = null;
    listening.current = false;
    setStatus((s) => {
      if (s !== 'listening') return s;
      if (transcriptRef.current.trim()) return 'done';
      if (reason !== 'user') setError('Seni duyamadım. Mikrofona dokunup tekrar dene.');
      return 'idle';
    });
  }, []);

  const start = useCallback(async () => {
    const plugin = shellPlugin('SpeechRecognition');
    if (!plugin) {
      setStatus('unavailable');
      return;
    }
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    try {
      const perm = await plugin.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        setError('permission-denied');
        setStatus('unavailable');
        return;
      }
      // The auto-played prompt (server audio or device TTS) must not still be playing into the mic,
      // and a session left open by the previous attempt must be closed first: on Android a busy /
      // half-closed recognizer fails the new one SILENTLY (the plugin swallows onError when
      // partialResults is on), which left the mic stuck on "Dinliyorum…" on the second try.
      await stopSpeaking();
      if (await pluginIsListening(plugin)) {
        await plugin.stop().catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      }
      listening.current = true;
      setStatus('listening');
      const startedAt = Date.now();
      if (watchdog.current) clearInterval(watchdog.current);
      watchdog.current = setInterval(() => {
        if (Date.now() - startedAt > LISTEN_TIMEOUT_MS) {
          void plugin.stop().catch(() => {});
          finish('timeout');
          return;
        }
        if (Date.now() - startedAt < START_GRACE_MS) return;
        void pluginIsListening(plugin).then((on) => {
          if (on === false) finish('ended');
        });
      }, POLL_MS);
      const r = await plugin.start({ language: toLocale(lang), maxResults: 1, partialResults: true, popup: false });
      if (r?.matches?.[0]) {
        transcriptRef.current = r.matches[0];
        setTranscript(r.matches[0]);
      }
    } catch (e) {
      if (watchdog.current) clearInterval(watchdog.current);
      watchdog.current = null;
      listening.current = false;
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [lang, finish]);

  const stop = useCallback(() => {
    // Always ask the plugin to stop and settle locally: no 'stopped' event comes after a silent error.
    void shellPlugin('SpeechRecognition')?.stop().catch(() => {});
    finish('user');
  }, [finish]);

  const reset = useCallback(() => {
    if (listening.current) void shellPlugin('SpeechRecognition')?.stop().catch(() => {});
    if (watchdog.current) clearInterval(watchdog.current);
    watchdog.current = null;
    listening.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
    setStatus(shellPlugin('SpeechRecognition') ? 'idle' : 'unavailable');
  }, []);

  return { status, transcript, error, start, stop, reset };
}

