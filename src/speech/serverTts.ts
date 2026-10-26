import type { LangCode } from '@/domain/types';

/**
 * Natural server voice (roadmap item 7, client side). Speaks through the
 * lovevox TTS endpoint served under EXPO_PUBLIC_SUPABASE_URL (same origin,
 * immutable HTTP cache headers — the browser cache is our LRU, no object-URL
 * bookkeeping here):
 *
 *   GET ${EXPO_PUBLIC_SUPABASE_URL}/tts/v1/speak?lang=<en|de|es|fr|it>
 *       &text=<urlencoded, ≤300 chars>&speed=<0.5–1.3, step 0.05>
 *   → audio/mpeg. Errors are JSON { error, message } with 400/429/503/500.
 *
 * Playback uses ONE shared HTMLAudioElement: it exists on the web build and
 * inside the Android Capacitor WebView shell. A new speak() (or stopServerAudio)
 * pauses and drops the previous playback, so a double tap never overlaps.
 */

/** The server only models en/de/es/fr/it; Turkish and unknown languages stay on the device engine. */
const SERVER_LANGS: readonly LangCode[] = ['en', 'de', 'es', 'fr', 'it'];

export function supportsServerVoice(lang: LangCode): boolean {
  return SERVER_LANGS.includes(lang);
}

/** First-byte deadline: if the audio has not started loading in 4 s we give up and fall back. */
const FIRST_BYTE_TIMEOUT_MS = 4_000;

/** Server contract caps a single request at 300 chars. */
const MAX_CHARS = 300;

/** After a failure the caller (tts.ts) skips the server for this long (offline must not add a 4 s delay per tap). */
const FAILURE_BLOCK_MS = 60_000;

let blockedUntil = 0;

/** Remember a server failure: isServerTtsBlocked() stays true for 60 s. */
export function markServerTtsFailure(): void {
  blockedUntil = Date.now() + FAILURE_BLOCK_MS;
}

export function isServerTtsBlocked(): boolean {
  return Date.now() < blockedUntil;
}

/** Test-only: clear the failure window and drop any playing audio. */
export function resetServerTtsForTests(): void {
  blockedUntil = 0;
  stopServerAudio();
}

/**
 * Map the device "slow" rate (SLOW_RATES 0.3–0.8) to a server speed:
 * serverSpeedFor(slowRate) = clamp(round05(0.5 + (slowRate − 0.3)), 0.5, 1.0),
 * i.e. 0.3→0.50, 0.4→0.60, 0.5→0.70, 0.6→0.80, 0.7→0.90, 0.8→1.00.
 * Normal playback uses 1.0.
 */
export function serverSpeedFor(slowRate: number): number {
  const v = Math.round((0.5 + (slowRate - 0.3)) * 20) / 20;
  return Math.min(1.0, Math.max(0.5, v));
}

/** Snap an arbitrary speed into the server range (0.5–1.3, step 0.05). */
function snapSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(1.3, Math.max(0.5, Math.round(speed * 20) / 20));
}

/**
 * Normalise whitespace and split into chunks of at most `max` characters,
 * cutting at the last sentence boundary (preferred) or word boundary so no
 * word is torn in half. Chunks are played back-to-back by speakServer.
 */
export function chunkText(text: string, max = MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > max) {
    const head = rest.slice(0, max + 1);
    let boundary = -1;
    for (const marker of ['. ', '! ', '? ', '; ', ': ']) {
      boundary = Math.max(boundary, head.lastIndexOf(marker));
    }
    // Only accept a sentence boundary in the second half; otherwise cut at a word boundary.
    if (boundary < Math.floor(max / 2)) {
      const space = head.lastIndexOf(' ');
      boundary = space > 0 ? space : max;
    }
    const cut = Math.min(boundary + 1, max);
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

let current: HTMLAudioElement | null = null;
/** Rejects the in-flight playback promise when a newer speak()/stop() drops it. */
let interrupt: ((err: Error) => void) | null = null;
/**
 * Bumped by every stopServerAudio(). speakServer captures it before its chunk
 * loop so a stop() landing in the microtask gap between two sequential chunks
 * (after chunk N's 'ended' already cleared `interrupt`) still aborts the loop
 * instead of starting chunk N+1.
 */
let stopGeneration = 0;

/** Pause and drop whatever is playing; the pending speakServer promise rejects with an AbortError. */
export function stopServerAudio(): void {
  stopGeneration += 1;
  const drop = interrupt;
  interrupt = null;
  drop?.(abortError());
  if (current) {
    try {
      current.pause();
    } catch {
      /* ignore */
    }
    current = null;
  }
}

function abortError(): Error {
  const e = new Error('Seslendirme iptal edildi.');
  e.name = 'AbortError';
  return e;
}

function ttsBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
}

/** Play one URL to the end. Resolves on 'ended'; rejects on 'error' or first-byte timeout. */
function playUrl(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio();
    current = audio;
    let settled = false;
    let firstByte = false;
    function cleanup() {
      clearTimeout(timer);
      audio.removeEventListener('loadeddata', onFirstByte);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      if (interrupt === failNow) interrupt = null;
    }
    function finish(err?: Error) {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve();
    }
    function failNow(err: Error) {
      finish(err);
    }
    function onFirstByte() {
      firstByte = true;
      clearTimeout(timer);
    }
    function onEnd() {
      finish();
    }
    function onError() {
      finish(new Error('Ses dosyası oynatılamadı.'));
    }
    const timer = setTimeout(() => {
      if (!firstByte) finish(new Error('Ses sunucusuna ulaşılamadı.'));
    }, FIRST_BYTE_TIMEOUT_MS);
    interrupt = failNow;
    audio.addEventListener('loadeddata', onFirstByte);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);
    audio.src = url;
    // Autoplay-policy rejections (iOS PWA Safari before a gesture, Chrome pre-gesture)
    // fire NO 'error' event on the element, so a swallowed play() rejection would leave
    // the promise hanging on loadeddata/ended that never resolve — reject explicitly.
    audio.play().catch((e: unknown) => {
      finish(e instanceof Error ? e : new Error('Ses oynatma engellendi.'));
    });
  });
}

/**
 * Speak `text` with the natural server voice. Normalises whitespace, splits
 * into ≤300-char chunks (played sequentially) and keeps a single Audio
 * element: a new speakServer (or stopServerAudio) interrupts the previous one.
 * Rejects on network/playback failure and with an AbortError when interrupted.
 */
export async function speakServer(text: string, lang: LangCode, speed: number): Promise<void> {
  const base = ttsBaseUrl();
  if (!base) throw new Error('Doğal ses sunucusu yapılandırılmamış.');
  const s = snapSpeed(speed);
  stopServerAudio(); // drop any previous playback — double taps never overlap
  const generation = stopGeneration;
  for (const chunk of chunkText(text)) {
    // A stop() between chunks (interrupt already cleared by the previous 'ended')
    // must not let the next chunk start.
    if (generation !== stopGeneration) throw abortError();
    const url = `${base}/tts/v1/speak?lang=${lang}&text=${encodeURIComponent(chunk)}&speed=${s}`;
    await playUrl(url);
  }
}
