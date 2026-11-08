import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, radii, spacing, useTheme } from '@/ui';
import { shellPlugin, type ListenerHandle } from './nativeShell';

/**
 * Android hardware back button inside the web shell (mobile-shell/, Capacitor 7).
 *
 * Registering a 'backButton' listener disables Capacitor's default behavior (walk the WebView
 * history, exit when it ends). That default fights Expo Router's Stack.Protected guards: going
 * back to an old address (e.g. /welcome) redirects forward again, so the history never ends and
 * the app can never be left with the back button. Instead the app decides:
 *
 * 1. A screen that owns its quit flow (lesson / exam / practice confirmations, registered via
 *    registerShellBackHandler while mounted) consumes the press and shows its own dialog.
 * 2. On a non-home tab (Tekrar/Konuş/Lig/Profil) the press goes to the home (Öğren) tab.
 * 3. With a previous screen in the stack (router.canGoBack(), Expo Router state — not the
 *    browser history) the press goes back.
 * 4. At the root, the first press shows a short "press again to exit" hint; a second press
 *    within 2 s exits the app.
 *
 * No-op outside the native shell: nothing is registered and nothing is rendered, so the web
 * build in a browser is untouched.
 */

export const EXIT_PRESS_WINDOW_MS = 2000;
export const EXIT_HINT_MS = 2000;
const EXIT_HINT_TEXT = 'Çıkmak için tekrar geri tuşuna basın';

/** Tab routes other than the home ('Öğren') tab: back goes home before it thinks of exiting. */
const NON_HOME_TABS = ['/review', '/konus', '/league', '/profile'];
const HOME_TAB = '/(tabs)';

/**
 * Screens with their own quit confirmation (lesson, skip exam, practice) register their
 * handler while mounted. A registered handler consumes the hardware back press instead of
 * the default navigation, so the same "Dersi bırak?" dialog opens from the hardware button.
 * Returns an unregister function for the effect cleanup.
 */
const screenHandlers = new Set<() => void>();

export function registerShellBackHandler(handler: () => void): () => void {
  screenHandlers.add(handler);
  return () => {
    screenHandlers.delete(handler);
  };
}

/** The navigation surface the back logic needs (expo-router's router matches this shape). */
export interface ShellBackRouter {
  canGoBack(): boolean;
  back(): void;
  navigate(href: string): void;
}

/** Injectable dependencies so the core is testable with a fake router and clock. */
export interface ShellBackDeps {
  router: ShellBackRouter;
  now: () => number;
  exitApp: () => void;
  setHintVisible: (visible: boolean) => void;
  /** Current route path (usePathname value), read live through a ref. */
  getPathname: () => string;
}

/**
 * The back-press decision logic as a plain controller: call handleBackPress() per press.
 * Owns the double-press window and the hint auto-hide timer; dispose() on unmount.
 */
export function createShellBackController(deps: ShellBackDeps) {
  let lastPressAt = -Infinity;
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  const clearHintTimer = () => {
    if (hintTimer !== null) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  };

  return {
    handleBackPress() {
      // 1. A mounted screen with its own quit flow owns the press.
      if (screenHandlers.size > 0) {
        const handler = Array.from(screenHandlers).pop()!;
        handler();
        return;
      }
      // 2. Non-home tab: go to the home tab first.
      if (NON_HOME_TABS.includes(deps.getPathname())) {
        deps.router.navigate(HOME_TAB);
        return;
      }
      // 3. A previous screen in the navigation state: go back.
      if (deps.router.canGoBack()) {
        deps.router.back();
        return;
      }
      // 4. Root: double press within the window exits, otherwise (re)show the hint.
      const now = deps.now();
      if (now - lastPressAt <= EXIT_PRESS_WINDOW_MS) {
        lastPressAt = -Infinity;
        clearHintTimer();
        deps.setHintVisible(false);
        deps.exitApp();
        return;
      }
      lastPressAt = now;
      deps.setHintVisible(true);
      clearHintTimer();
      hintTimer = setTimeout(() => deps.setHintVisible(false), EXIT_HINT_MS);
    },
    dispose() {
      clearHintTimer();
    },
  };
}

/**
 * Registers the shell hardware-back listener once for the app lifetime. Returns whether the
 * "press again to exit" hint is visible — render <ShellExitHint /> when true. Call at the top
 * level of the root layout, like useAutoUpdate().
 */
export function useShellBackButton(): boolean {
  const [hintVisible, setHintVisible] = useState(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Keep the latest path in a ref so the (once-registered) listener reads the live route.
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const app = shellPlugin('App');
    // Outside the shell, or in an old shell without the App listener surface: no-op.
    if (!app || typeof app.addListener !== 'function' || typeof app.exitApp !== 'function') return;

    const controller = createShellBackController({
      router: {
        canGoBack: () => router.canGoBack(),
        back: () => router.back(),
        navigate: (href) => router.navigate(href),
      },
      now: () => Date.now(),
      exitApp: () => {
        void app.exitApp().catch(() => {});
      },
      setHintVisible,
      getPathname: () => pathnameRef.current,
    });

    let cancelled = false;
    let handle: ListenerHandle | null = null;
    void app
      .addListener('backButton', () => controller.handleBackPress())
      .then((h) => {
        // Unmounted while the promise was in flight: remove immediately, no leak.
        if (cancelled) void h.remove().catch(() => {});
        else handle = h;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.dispose();
      if (handle) void handle.remove().catch(() => {});
    };
  }, []);

  return hintVisible;
}

/** Small bottom-center pill shown on the first back press at the root. Shell-only by usage. */
export function ShellExitHint() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // createElement instead of JSX: this module must stay a .ts file (commit manifest).
  return createElement(
    View,
    {
      pointerEvents: 'none',
      // RN `role` (maps to role="status" on web) — AccessibilityRole has no 'status' value.
      role: 'status',
      accessibilityLiveRegion: 'polite',
      style: [styles.hintWrap, { bottom: insets.bottom + spacing.xl }],
    },
    createElement(
      View,
      { style: [styles.hint, { backgroundColor: colors.surface, borderColor: colors.border }] },
      createElement(Body, { style: [styles.hintText, { color: colors.text }] }, EXIT_HINT_TEXT),
    ),
  );
}

const styles = StyleSheet.create({
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  hintText: { fontSize: 14, lineHeight: 20 },
});
