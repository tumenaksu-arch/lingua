import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

import * as notifications from '@/features/notifications';
import { useSpeechRecognition } from '@/speech/stt';
import { speak } from '@/speech/tts';
import { isNativeShell, shellPlugin } from '../nativeShell';

/**
 * The Android web shell exposes native plugins on `window.Capacitor`; inside it the web build
 * must use them (WebView has no speechSynthesis / Notification), and must not touch them anywhere else.
 */
type Listener = (data: any) => void;

function fakeShell() {
  const listeners: Record<string, Listener> = {};
  const plugins = {
    TextToSpeech: { speak: jest.fn(() => Promise.resolve()), stop: jest.fn(() => Promise.resolve()) },
    LocalNotifications: {
      requestPermissions: jest.fn(() => Promise.resolve({ display: 'granted' })),
      schedule: jest.fn(() => Promise.resolve({})),
      cancel: jest.fn(() => Promise.resolve()),
    },
    SpeechRecognition: {
      available: jest.fn(() => Promise.resolve({ available: true })),
      requestPermissions: jest.fn(() => Promise.resolve({ speechRecognition: 'granted' })),
      start: jest.fn(() => Promise.resolve({})),
      stop: jest.fn(() => Promise.resolve()),
      addListener: jest.fn((event: string, cb: Listener) => {
        listeners[event] = cb;
        return Promise.resolve({ remove: jest.fn(() => Promise.resolve()) });
      }),
    },
  };
  return { plugins, listeners };
}

const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

afterEach(() => {
  delete (globalThis as { Capacitor?: unknown }).Capacitor;
  setOS(originalOS);
  jest.clearAllMocks();
});

function enterShell() {
  const shell = fakeShell();
  setOS('web');
  (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, Plugins: shell.plugins };
  return shell;
}

describe('outside the shell', () => {
  test('no plugin is used and TTS goes through expo-speech', async () => {
    expect(isNativeShell()).toBe(false);
    expect(shellPlugin('TextToSpeech')).toBeNull();
    await speak('Hello', 'en');
    expect(Speech.speak).toHaveBeenCalledWith('Hello', expect.objectContaining({ language: 'en-US' }));
  });

  test('a Capacitor global on a native (non-web) build is ignored', () => {
    const shell = fakeShell();
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, Plugins: shell.plugins };
    setOS('android');
    expect(shellPlugin('TextToSpeech')).toBeNull();
  });
});

describe('inside the Android web shell', () => {
  test('speak uses the device TTS with the course locale and reports done', async () => {
    const { plugins } = enterShell();
    const onDone = jest.fn();
    await speak('Guten Tag', 'de', { rate: 0.6, onDone });
    expect(plugins.TextToSpeech.speak).toHaveBeenCalledWith({ text: 'Guten Tag', lang: 'de-DE', rate: 0.6, pitch: 1 });
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('daily reminder is scheduled through LocalNotifications, replacing the previous one', async () => {
    const { plugins } = enterShell();
    const n = notifications;
    expect(n.isSupported()).toBe(true);
    expect(await n.requestPermission()).toBe(true);
    expect(await n.scheduleDailyReminder(19)).toBe(true);
    expect(plugins.LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(plugins.LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ id: 1, schedule: { on: { hour: 19, minute: 0 }, repeats: true, allowWhileIdle: true } })],
    });
  });

  test('speech recognition uses the device recognizer and streams partial results', async () => {
    const { plugins, listeners } = enterShell();
    const { result } = await renderHook(() => useSpeechRecognition('fr'));
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.start();
    });
    expect(plugins.SpeechRecognition.start).toHaveBeenCalledWith({ language: 'fr-FR', maxResults: 1, partialResults: true, popup: false });
    expect(result.current.status).toBe('listening');

    await act(async () => {
      listeners.partialResults!({ matches: ['bonjour merci'] });
      listeners.listeningState!({ status: 'stopped' });
    });
    expect(result.current.transcript).toBe('bonjour merci');
    expect(result.current.status).toBe('done');
  });

  test('denied microphone permission makes the Speak exercise skippable', async () => {
    const { plugins } = enterShell();
    plugins.SpeechRecognition.requestPermissions.mockResolvedValueOnce({ speechRecognition: 'denied' });
    const { result } = await renderHook(() => useSpeechRecognition('en'));
    await act(async () => {
      await result.current.start();
    });
    expect(plugins.SpeechRecognition.start).not.toHaveBeenCalled();
    expect(result.current.status).toBe('unavailable');
  });
});
