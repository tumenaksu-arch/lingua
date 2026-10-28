import { act, renderHook } from '@testing-library/react-native';

/**
 * Android shell regression (2026-10-28): after a wrong answer the Speak exercise comes back and
 * the second recording "does nothing". @capacitor-community/speech-recognition 7 resolves start()
 * immediately with partialResults and, on a recognizer error (busy / no match), rejects the
 * ALREADY RESOLVED call and emits no 'stopped' event — the hook stayed on 'listening' forever.
 */

const mockStopSpeaking = jest.fn(async () => {});
jest.mock('../tts', () => ({ stop: () => mockStopSpeaking() }));

type Listener = (data: never) => void;
let mockListeners: Record<string, Listener[]> = {};
let mockPluginListening = false;
const mockPlugin = {
  available: jest.fn(async () => ({ available: true })),
  requestPermissions: jest.fn(async () => ({ speechRecognition: 'granted' })),
  start: jest.fn(async () => {
    mockPluginListening = true;
    return {};
  }),
  stop: jest.fn(async () => {
    mockPluginListening = false;
  }),
  isListening: jest.fn(async () => ({ listening: mockPluginListening })),
  addListener: jest.fn(async (event: string, cb: Listener) => {
    (mockListeners[event] ??= []).push(cb);
    return { remove: async () => {} };
  }),
};

jest.mock('@/platform/nativeShell', () => ({
  isNativeShell: () => true,
  shellPlugin: (name: string) => (name === 'SpeechRecognition' ? mockPlugin : null),
}));

// eslint-disable-next-line import/first
import { useSpeechRecognition } from '../stt';

const emit = (event: string, data: unknown) => mockListeners[event]?.forEach((cb) => cb(data as never));

beforeEach(() => {
  jest.useFakeTimers();
  mockListeners = {};
  mockPluginListening = false;
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('shell speech recognition', () => {
  it('does not stay stuck on "listening" when the recognizer fails silently', async () => {
    const { result } = await renderHook(() => useSpeechRecognition('en'));
    await flush();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('listening');

    // Android recognizer errors (e.g. busy): mockPlugin flips its flag, sends NO event.
    mockPluginListening = false;
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await flush();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toMatch(/duyamadım/);

    // …and the mic works again.
    await act(async () => {
      await result.current.start();
    });
    expect(mockPlugin.start).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('listening');
  });

  it('a second attempt (remounted exercise) stops TTS and closes a session left open before starting', async () => {
    jest.useRealTimers(); // start() waits 300 ms after closing the stale session
    mockPluginListening = true; // previous attempt never closed
    const { result, unmount } = await renderHook(() => useSpeechRecognition('en'));
    await flush();
    await act(async () => {
      await result.current.start();
    });
    expect(mockStopSpeaking).toHaveBeenCalled();
    expect(mockPlugin.stop).toHaveBeenCalled();
    expect(mockPlugin.stop.mock.invocationCallOrder[0]!).toBeLessThan(mockPlugin.start.mock.invocationCallOrder[0]!);
    expect(result.current.status).toBe('listening');
    await unmount();
  });

  it('keeps the recognised words and ends as "done" when speech ended normally', async () => {
    const { result } = await renderHook(() => useSpeechRecognition('en'));
    await flush();
    await act(async () => {
      await result.current.start();
    });
    await act(async () => emit('partialResults', { matches: ['I am a boy'] }));
    await act(async () => emit('listeningState', { status: 'stopped' }));
    expect(result.current.status).toBe('done');
    expect(result.current.transcript).toBe('I am a boy');
  });

  it('pressing the mic while stuck always settles the state', async () => {
    const { result } = await renderHook(() => useSpeechRecognition('en'));
    await flush();
    await act(async () => {
      await result.current.start();
    });
    await act(async () => result.current.stop());
    expect(mockPlugin.stop).toHaveBeenCalled();
    expect(result.current.status).not.toBe('listening');
  });

  it('gives up after the listening timeout', async () => {
    const { result } = await renderHook(() => useSpeechRecognition('en'));
    await flush();
    await act(async () => {
      await result.current.start();
    });
    // mockPlugin keeps claiming it listens, nothing arrives
    await act(async () => {
      jest.advanceTimersByTime(13_000);
    });
    await flush();
    expect(result.current.status).not.toBe('listening');
    expect(mockPlugin.stop).toHaveBeenCalled();
  });
});
