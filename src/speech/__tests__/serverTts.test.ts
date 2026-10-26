import { chunkText, resetServerTtsForTests, serverSpeedFor, speakServer, stopServerAudio } from '../serverTts';

/** Minimal HTMLAudioElement stand-in: records src, lets tests fire playback events. */
class MockAudio {
  static instances: MockAudio[] = [];
  /** When true, play() rejects like an autoplay-policy NotAllowedError (no 'error' event fires). */
  static failPlay = false;
  src = '';
  paused = true;
  play = jest.fn(() => {
    this.paused = false;
    return MockAudio.failPlay
      ? Promise.reject(Object.assign(new Error('play() rejected by autoplay policy'), { name: 'NotAllowedError' }))
      : Promise.resolve();
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
  private listeners = new Map<string, Set<(e?: unknown) => void>>();

  constructor() {
    MockAudio.instances.push(this);
  }

  addEventListener(ev: string, fn: (e?: unknown) => void) {
    const set = this.listeners.get(ev) ?? new Set();
    set.add(fn);
    this.listeners.set(ev, set);
  }

  removeEventListener(ev: string, fn: (e?: unknown) => void) {
    this.listeners.get(ev)?.delete(fn);
  }

  emit(ev: string) {
    for (const fn of this.listeners.get(ev) ?? []) fn();
  }
}

const BASE = 'https://supa.example.test';

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  MockAudio.instances = [];
  MockAudio.failPlay = false;
  (globalThis as { Audio?: unknown }).Audio = MockAudio;
  process.env.EXPO_PUBLIC_SUPABASE_URL = BASE;
  resetServerTtsForTests();
});

afterEach(() => {
  stopServerAudio();
  delete (globalThis as { Audio?: unknown }).Audio;
});

describe('serverSpeedFor (slow button mapping)', () => {
  it('maps slowRate 0.3→0.50 … 0.8→1.00 in 0.05 steps', () => {
    expect(serverSpeedFor(0.3)).toBe(0.5);
    expect(serverSpeedFor(0.4)).toBe(0.6);
    expect(serverSpeedFor(0.5)).toBe(0.7);
    expect(serverSpeedFor(0.6)).toBe(0.8);
    expect(serverSpeedFor(0.7)).toBe(0.9);
    expect(serverSpeedFor(0.8)).toBe(1.0);
  });

  it('clamps out-of-range values to 0.5–1.0', () => {
    expect(serverSpeedFor(0.1)).toBe(0.5);
    expect(serverSpeedFor(5)).toBe(1.0);
  });
});

describe('chunkText', () => {
  it('normalises whitespace and keeps short text as one chunk', () => {
    expect(chunkText('  Hallo \n\t Welt ')).toEqual(['Hallo Welt']);
    expect(chunkText('   ')).toEqual([]);
  });

  it('splits >300 chars at sentence/word boundaries, every chunk ≤300', () => {
    const sentence = 'Die Katze sitzt auf dem Tisch und trinkt Milch. ';
    const text = sentence.repeat(12); // 48 * 12 = 576 chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(300);
      expect(c.length).toBeGreaterThan(0);
    }
    // cutting at boundaries never tears a word apart (chunks join with single spaces)
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
  });

  it('falls back to a word boundary when there is no sentence boundary', () => {
    const word = 'abcdefgh ';
    const text = word.repeat(40).trim(); // 359 chars, no punctuation
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    expect(chunks.every((c) => !c.includes('abcdefg h'))).toBe(true);
  });

  it('never emits a >300-char chunk, even with no spaces in the head (word-boundary fallback clamps)', () => {
    const text = 'a'.repeat(400); // no spaces: boundary falls back to max
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(300);
      expect(c.length).toBeGreaterThan(0);
    }
    expect(chunks.join('')).toBe(text);
  });

});

describe('speakServer', () => {
  it('builds the exact URL (normalised text, lang, speed) and resolves on ended', async () => {
    const p = speakServer('Hallo  Welt', 'de', 1);
    const audio = MockAudio.instances[0]!;
    expect(audio.src).toBe(`${BASE}/tts/v1/speak?lang=de&text=Hallo%20Welt&speed=1`);
    audio.emit('loadeddata');
    audio.emit('ended');
    await p;
  });

  it('snaps the speed into the 0.5–1.3 / 0.05-step contract', async () => {
    const p = speakServer('Hello', 'en', 0.62);
    expect(MockAudio.instances[0]!.src).toBe(`${BASE}/tts/v1/speak?lang=en&text=Hello&speed=0.6`);
    MockAudio.instances[0]!.emit('loadeddata');
    MockAudio.instances[0]!.emit('ended');
    await p;
  });

  it('plays >300-char texts as sequential chunks (second chunk starts only after the first ended)', async () => {
    const sentence = 'Die Katze sitzt auf dem Tisch und trinkt Milch. ';
    const p = speakServer(sentence.repeat(12), 'de', 1);
    expect(MockAudio.instances.length).toBe(1);
    const first = MockAudio.instances[0]!;
    first.emit('loadeddata');
    first.emit('ended');
    await Promise.resolve();
    expect(MockAudio.instances.length).toBe(2);
    expect(MockAudio.instances[1]!.src).toContain('lang=de');
    MockAudio.instances[1]!.emit('loadeddata');
    MockAudio.instances[1]!.emit('ended');
    await p;
  });

  it('a new speak pauses and rejects the previous audio (double taps never overlap)', async () => {
    const first = speakServer('Erster Satz.', 'de', 1);
    const second = speakServer('Zweiter Satz.', 'de', 1);
    expect(MockAudio.instances[0]!.pause).toHaveBeenCalled();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    MockAudio.instances[1]!.emit('loadeddata');
    MockAudio.instances[1]!.emit('ended');
    await second;
  });

  it('stopServerAudio pauses the current audio and rejects the pending speak', async () => {
    const p = speakServer('Hallo', 'de', 1);
    const audio = MockAudio.instances[0]!;
    stopServerAudio();
    expect(audio.pause).toHaveBeenCalled();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects when the audio element fires an error', async () => {
    const p = speakServer('Hallo', 'de', 1);
    MockAudio.instances[0]!.emit('error');
    await expect(p).rejects.toThrow('Ses dosyası oynatılamadı.');
  });

  it('rejects when no first byte arrives within 4 s', async () => {
    jest.useFakeTimers();
    const p = speakServer('Hallo', 'de', 1);
    jest.advanceTimersByTime(4001);
    await expect(p).rejects.toThrow('Ses sunucusuna ulaşılamadı.');
  });

  it('a stop() landing between sequential chunks aborts before chunk N+1 starts', async () => {
    const sentence = 'Die Katze sitzt auf dem Tisch und trinkt Milch. ';
    const p = speakServer(sentence.repeat(12), 'de', 1);
    const first = MockAudio.instances[0]!;
    first.emit('loadeddata');
    first.emit('ended');
    // Same microtask gap: 'ended' already cleared `interrupt`, so only the stop
    // generation counter can prevent chunk 2 from starting.
    stopServerAudio();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(MockAudio.instances.length).toBe(1);
  });

  it('rejects when play() is rejected by the autoplay policy (no error event fires)', async () => {
    MockAudio.failPlay = true;
    const p = speakServer('Hallo', 'de', 1);
    const audio = MockAudio.instances[0]!;
    audio.emit('loadeddata'); // first byte arrives, clearing the 4 s timer — 'ended' never will
    await expect(p).rejects.toMatchObject({ name: 'NotAllowedError' });
  });

  it('rejects immediately when the server URL is not configured', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    await expect(speakServer('Hallo', 'de', 1)).rejects.toThrow('yapılandırılmamış');
  });
});
