import { router } from 'expo-router';

/**
 * `router.back()` does nothing when the screen was opened by a direct link
 * (no history) — the button looked dead. Fall back to the home tab then.
 */
export function backOrHome(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
