import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isNativeShell } from './nativeShell';

/** Signed Android web-shell APK (mobile-shell/), published as the `Love-Vox.apk` asset of the latest GitHub release. */
export const ANDROID_APK_URL = 'https://github.com/tumenaksu-arch/lingua/releases/latest/download/Love-Vox.apk';
export const WEB_APP_URL = 'https://ankaxai.ai/lovevox/';

/**
 * - `installable`: the browser offered an install prompt (Chrome/Edge/Android) — one tap installs.
 * - `ios`: Safari has no prompt; the user adds it via Share → "Ana Ekrana Ekle".
 * - `manual`: another browser; install from the browser menu, if it supports it.
 * - `installed`: already running as an installed app (PWA window or the Android shell).
 * - `unavailable`: not the web build.
 */
export type PwaInstallState = 'installable' | 'ios' | 'manual' | 'installed' | 'unavailable';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PwaWindow = typeof globalThis & {
  __linguaInstallPrompt?: InstallPromptEvent;
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: Navigator & { standalone?: boolean };
};

function detect(): PwaInstallState {
  if (Platform.OS !== 'web') return 'unavailable';
  const w = globalThis as PwaWindow;
  if (isNativeShell() || w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone) return 'installed';
  if (w.__linguaInstallPrompt) return 'installable';
  const ua = w.navigator?.userAgent ?? '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (w.navigator?.maxTouchPoints ?? 0) > 1);
  return iOS ? 'ios' : 'manual';
}

/**
 * PWA install state for the platform section of the welcome page. The `beforeinstallprompt`
 * event is captured by an inline script in public/index.html (it can fire before React mounts).
 */
export function usePwaInstall(): { state: PwaInstallState; install: () => Promise<boolean> } {
  const [state, setState] = useState<PwaInstallState>(detect);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = globalThis as PwaWindow & { addEventListener?: Window['addEventListener']; removeEventListener?: Window['removeEventListener'] };
    const refresh = () => setState(detect());
    const installed = () => {
      w.__linguaInstallPrompt = undefined;
      setState('installed');
    };
    w.addEventListener?.('lingua-installable', refresh);
    w.addEventListener?.('appinstalled', installed);
    return () => {
      w.removeEventListener?.('lingua-installable', refresh);
      w.removeEventListener?.('appinstalled', installed);
    };
  }, []);

  const install = useCallback(async () => {
    const w = globalThis as PwaWindow;
    const prompt = w.__linguaInstallPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    w.__linguaInstallPrompt = undefined; // a prompt can be used only once
    setState(outcome === 'accepted' ? 'installed' : detect());
    return outcome === 'accepted';
  }, []);

  return { state, install };
}
