import { createElement, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, spacing, useTheme } from '@/ui';
import { isNativeShell, shellPlugin } from './nativeShell';

/**
 * Auto-update on open (web build only).
 *
 * The exported web build is content-hashed (`/_expo/static/js/web/entry-<hash>.js`), so the
 * hash of the entry script in index.html identifies the deployed version. The service worker is
 * network-first for page loads, but an app left open (installed PWA window, Android shell,
 * background tab) keeps running the old bundle. This module compares the running hash against a
 * freshly fetched `/` and reloads when a newer build exists. While the user is inside a lesson
 * the reload is deferred until they leave it, so progress is never lost mid-exercise.
 */

const ENTRY_RE = /\/_expo\/static\/js\/web\/entry-([a-f0-9]+)\.js/;

/** The entry-script hash embedded in an HTML document, or null when absent / unparsable. */
export function entryHashFromHtml(html: string): string | null {
  return html.match(ENTRY_RE)?.[1] ?? null;
}

interface EntrySource {
  querySelector(selector: string): { getAttribute(name: string): string | null } | null;
}

/** Hash and base path (e.g. '/lovevox') of the entry script actually running, or null on a dev server. */
export function runningEntry(doc: EntrySource): { hash: string; base: string } | null {
  const el = doc.querySelector('script[src*="/_expo/static/js/web/entry-"]');
  const src = el?.getAttribute('src');
  if (!src) return null;
  const match = src.match(/^(.*?)\/_expo\/static\/js\/web\/entry-([a-f0-9]+)\.js/);
  if (!match) return null;
  return { hash: match[2], base: match[1] };
}

function webDoc(): Document | null {
  return typeof document === 'undefined' ? null : document;
}

function webLoc(): Location | null {
  return typeof location === 'undefined' ? null : location;
}

const CHECK_THROTTLE_MS = 60_000;

/**
 * Reloads the page once a newer web build is deployed. Checks on mount and on every return to
 * the foreground (tab visible again, window focused, Capacitor 'resume'), at most once a minute.
 * No-op outside the web build. Call unconditionally at the top level of the root layout.
 */
export function useAutoUpdate() {
  const pathname = usePathname();
  const lastCheck = useRef(0);
  const pendingHash = useRef<string | null>(null);
  const reloadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = webDoc();
    if (!doc) return;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheck.current < CHECK_THROTTLE_MS) return;
      lastCheck.current = now;
      const running = runningEntry(doc);
      const loc = webLoc();
      if (!running || !loc) return;
      try {
        const res = await fetch(`${loc.origin}${running.base}/`, { cache: 'no-store' });
        const latest = entryHashFromHtml(await res.text());
        if (latest && latest !== running.hash && reloadedFor.current !== latest) {
          pendingHash.current = latest;
          maybeReload();
        }
      } catch {
        // Offline or unparsable response: keep running the current version.
      }
    };

    const maybeReload = () => {
      const latest = pendingHash.current;
      if (!latest) return;
      if (pathname.includes('/lesson/')) return; // never interrupt a lesson
      pendingHash.current = null;
      reloadedFor.current = latest;
      webLoc()?.reload();
    };

    const onVisibilityChange = () => {
      if (doc.visibilityState === 'visible') void check();
    };
    const onFocus = () => void check();
    const onResume = () => void check();

    void check();
    doc.addEventListener('visibilitychange', onVisibilityChange);
    doc.addEventListener('resume', onResume);
    globalThis.addEventListener?.('focus', onFocus);

    // A new version may have been found while the user was inside a lesson.
    maybeReload();

    return () => {
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      doc.removeEventListener('resume', onResume);
      globalThis.removeEventListener?.('focus', onFocus);
    };
  }, [pathname]);
}

/** Numeric dotted-version compare: '0.1.10' > '0.1.9'; equal or older is false. */
export function isNewerVersion(latest: string, installed: string): boolean {
  const a = latest.split('.').map(Number);
  const b = installed.split('.').map(Number);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

const APK_DISMISSED_KEY = 'lovevox.apk.dismissed';
const APK_CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;

function readDismissedVersion(): string | null {
  try {
    return globalThis.localStorage?.getItem(APK_DISMISSED_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeDismissedVersion(version: string) {
  try {
    globalThis.localStorage?.setItem(APK_DISMISSED_KEY, version);
  } catch {
    // Storage unavailable (private mode, quota): the banner will simply reappear.
  }
}

/**
 * Gentle "a newer APK is available" banner, shown only inside the Android web shell. The APK
 * changes far less often than the web build; when mobile-shell/ is released, public/android.json
 * is bumped and installed shells surface the prompt on the next foreground event (throttled to
 * one check per 6 hours). The user can dismiss it per version.
 */
export function ShellUpdateBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [update, setUpdate] = useState<{ version: string; url: string } | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!isNativeShell()) return;
    const doc = webDoc();
    if (!doc) return;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheck.current < APK_CHECK_THROTTLE_MS) return;
      lastCheck.current = now;
      const loc = webLoc();
      const app = shellPlugin('App');
      if (!loc || !app) return;
      try {
        const info = await app.getInfo();
        const base = runningEntry(doc)?.base ?? '';
        const res = await fetch(`${loc.origin}${base}/android.json`, { cache: 'no-store' });
        const data = (await res.json()) as { version?: unknown; url?: unknown };
        if (
          typeof data.version === 'string' &&
          typeof data.url === 'string' &&
          isNewerVersion(data.version, info.version) &&
          readDismissedVersion() !== data.version
        ) {
          setUpdate({ version: data.version, url: data.url });
        }
      } catch {
        // Offline or malformed manifest: try again on the next foreground event.
      }
    };

    const onVisibilityChange = () => {
      if (doc.visibilityState === 'visible') void check();
    };
    const onFocus = () => void check();
    const onResume = () => void check();

    void check();
    doc.addEventListener('visibilitychange', onVisibilityChange);
    doc.addEventListener('resume', onResume);
    globalThis.addEventListener?.('focus', onFocus);

    return () => {
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      doc.removeEventListener('resume', onResume);
      globalThis.removeEventListener?.('focus', onFocus);
    };
  }, []);

  if (!update) return null;

  // createElement instead of JSX: this module must stay a .ts file (commit manifest).
  return createElement(
    View,
    {
      style: [
        styles.banner,
        { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + spacing.sm },
      ],
    },
    createElement(Body, { style: styles.text }, `Love-Vox'un yeni Android sürümü hazır (${update.version}).`),
    createElement(
      View,
      { style: styles.buttons },
      createElement(Button, {
        title: 'Güncelle',
        block: false,
        onPress: () => {
          Linking.openURL(update.url).catch(() => {});
        },
      }),
      createElement(Button, {
        title: 'Sonra',
        variant: 'outline',
        block: false,
        onPress: () => {
          writeDismissedVersion(update.version);
          setUpdate(null);
        },
      }),
    ),
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  text: { textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
});
