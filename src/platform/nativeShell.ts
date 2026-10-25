import { Platform } from 'react-native';

/**
 * Bridge to the Android "web shell" (mobile-shell/, Capacitor 7) that loads
 * https://ankaxai.ai/lovevox/ in a WebView. Android WebView has no speechSynthesis and no
 * Notification API, so inside the shell the web build calls the shell's native plugins
 * through `window.Capacitor.Plugins` — no Capacitor package is bundled into the app.
 * Outside the shell (browser, Expo/EAS builds) every getter returns null and the app keeps
 * its normal code paths.
 *
 * Plugin surfaces below are the subsets Lingua uses, checked against the shell's installed
 * definitions: @capacitor-community/text-to-speech 6.1, @capacitor-community/speech-recognition
 * 7.0, @capacitor/local-notifications 7.0.
 */

export interface ListenerHandle {
  remove: () => Promise<void>;
}

export interface ShellTextToSpeech {
  speak(options: { text: string; lang?: string; rate?: number; pitch?: number }): Promise<void>;
  stop(): Promise<void>;
}

export interface ShellSpeechRecognition {
  available(): Promise<{ available: boolean }>;
  start(options?: { language?: string; maxResults?: number; partialResults?: boolean; popup?: boolean }): Promise<{ matches?: string[] }>;
  stop(): Promise<void>;
  requestPermissions(): Promise<{ speechRecognition: string }>;
  addListener(event: 'partialResults', cb: (data: { matches: string[] }) => void): Promise<ListenerHandle>;
  addListener(event: 'listeningState', cb: (data: { status: 'started' | 'stopped' }) => void): Promise<ListenerHandle>;
}

export interface ShellLocalNotifications {
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: {
    notifications: {
      id: number;
      title: string;
      body: string;
      schedule?: { on?: { hour?: number; minute?: number }; repeats?: boolean; allowWhileIdle?: boolean };
    }[];
  }): Promise<unknown>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
}

interface ShellPlugins {
  TextToSpeech: ShellTextToSpeech;
  SpeechRecognition: ShellSpeechRecognition;
  LocalNotifications: ShellLocalNotifications;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Partial<ShellPlugins>;
}

/** True when the web build runs inside the native Lingua shell. */
export function isNativeShell(): boolean {
  if (Platform.OS !== 'web') return false;
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
}

/** The named shell plugin, or null outside the shell / when the shell lacks it. */
export function shellPlugin<K extends keyof ShellPlugins>(name: K): ShellPlugins[K] | null {
  if (!isNativeShell()) return null;
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor?.Plugins?.[name] ?? null;
}
