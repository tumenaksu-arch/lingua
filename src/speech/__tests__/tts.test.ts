import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

import { useSettingsStore } from '@/ui/settingsStore';
import { resetServerTtsForTests } from '../serverTts';
import { speak, stop } from '../tts';

class MockAudio {
  static instances: MockAudio[] = [];
  src = '';
  paused = true;
  play = jest.fn(() => {
    this.paused = false;
    return Promise.resolve();
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
const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

function finishCurrentAudio() {
  const audio = MockAudio.instances[MockAudio.instances.length - 1]!;
  audio.emit('loadeddata');
  audio.emit('ended');
}

beforeEach(() => {
  jest.restoreAllMocks();
  MockAudio.instances = [];
  (globalThis as { Audio?: unknown }).Audio = MockAudio;
  delete (globalThis as { Capacitor?: unknown }).Capacitor;
  process.env.EXPO_PUBLIC_SUPABASE_URL = BASE;
  setOS('web');
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'dogal', hydrated: true });
  // start each test with a clean 60 s failure window and a frozen clock
  resetServerTtsForTests();
  jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
});

afterEach(() => {
  setOS(originalOS);
  delete (globalThis as { Audio?: unknown }).Audio;
  jest.clearAllMocks();
});

describe('speak with voice=dogal', () => {
  it('uses the server with the exact URL params (normal speed → 1)', async () => {
    const onDone = jest.fn();
    const p = speak('Hello world', 'en', { onDone });
    expect(MockAudio.instances.length).toBe(1);
    expect(MockAudio.instances[0]!.src).toBe(`${BASE}/tts/v1/speak?lang=en&text=Hello%20world&speed=1`);
    finishCurrentAudio();
    await p;
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('maps the slow button (rate<1) through serverSpeedFor(stored slowRate)', async () => {
    useSettingsStore.setState({ slowRate: 0.4 });
    const p = speak('Bonjour', 'fr', { rate: 0.4 });
    expect(MockAudio.instances[0]!.src).toBe(`${BASE}/tts/v1/speak?lang=fr&text=Bonjour&speed=0.6`);
    finishCurrentAudio();
    await p;
  });

  it('falls back to device TTS with the same text/rate when the audio errors', async () => {
    const onDone = jest.fn();
    const p = speak('Hallo', 'de', { rate: 0.5, onDone });
    MockAudio.instances[0]!.emit('error');
    await p;
    expect(Speech.speak).toHaveBeenCalledWith('Hallo', expect.objectContaining({ language: 'de-DE', rate: 0.5 }));
    // speak() must not also fire onDone: the device engine drives onDone/onError
    expect(onDone).not.toHaveBeenCalled();
  });

  it('skips the server for 60 s after a failure (offline adds no 4 s delay per tap)', async () => {
    const first = speak('Hallo', 'de');
    MockAudio.instances[0]!.emit('error');
    await first;
    expect(MockAudio.instances.length).toBe(1);

    // second tap inside the window: straight to the device engine, no new Audio
    const second = speak('Welt', 'de');
    expect(MockAudio.instances.length).toBe(1);
    await second;
    expect(Speech.speak).toHaveBeenCalledTimes(2);

    // after the window expires the server is tried again
    jest.mocked(Date.now).mockReturnValue(1_000_000 + 61_000);
    const third = speak('Nochmal', 'de');
    expect(MockAudio.instances.length).toBe(2);
    finishCurrentAudio();
    await third;
  });

  it('never touches the device engine for unsupported languages (e.g. Turkish)', async () => {
    await speak('Merhaba', 'tr');
    expect(MockAudio.instances.length).toBe(0);
    expect(Speech.speak).toHaveBeenCalledWith('Merhaba', expect.objectContaining({ language: 'tr-TR' }));
  });
});

describe('speak with voice=cihaz', () => {
  it('never touches Audio and goes straight to the device engine', async () => {
    useSettingsStore.setState({ voice: 'cihaz' });
    await speak('Hello', 'en');
    expect(MockAudio.instances.length).toBe(0);
    expect(Speech.speak).toHaveBeenCalledWith('Hello', expect.objectContaining({ language: 'en-US' }));
  });
});

describe('stop', () => {
  it('stops server playback too: pauses the audio and reports the interruption via onError', async () => {
    const onError = jest.fn();
    const p = speak('Hello', 'en', { onError });
    await stop();
    expect(MockAudio.instances[0]!.pause).toHaveBeenCalled();
    await p; // speak() resolves after routing the interruption to onError
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }));
  });
});
