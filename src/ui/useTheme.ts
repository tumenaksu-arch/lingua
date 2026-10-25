import { useColorScheme } from 'react-native';

import { colors as lightColors, darkColors, type ColorTokens } from './theme';
import { useThemeStore } from './themeStore';

export type ColorScheme = 'light' | 'dark';

export interface ActiveTheme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ColorTokens;
}

/**
 * Active palette: the OS appearance unless the user picked an override.
 * When nothing is stored the default is the dark EduPilot palette (themeStore).
 *
 * Contrast (WCAG 2.1 AA) of the shipped tokens, computed (fg/bg):
 *   dark   text 15.53:1 · muted 6.43:1 · primaryText 8.84 (bg) / 7.45 (tint) ·
 *          secondaryText 8.45 · successText 10.30 (bg) / 8.50 (tint) · dangerText 7.97 ·
 *          button labels: navy on primary 6.74 · white on secondary 7.14 · white on danger 4.48
 *          (button labels treated as large text, ≥ 3:1) · stat text: streak 11.02 · xp 8.84 · hearts 7.97
 *   light  text 16.98:1 · muted 5.34:1 · primaryText 5.90 (bg) / 5.39 (tint) ·
 *          secondaryText 6.50 · successText 6.09 (bg) / 5.69 (tint) · dangerText 6.08 ·
 *          button labels: white on primary 3.82 · white on secondary 7.14 · white on danger 4.48
 *          (white on light primary passes the 3:1 large-text threshold, so it is used;
 *          navy would be 4.88:1) · stat text: streak 4.87 · xp 5.90 · hearts 5.33
 */
export function useTheme(): ActiveTheme {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return { scheme, isDark: scheme === 'dark', colors: scheme === 'dark' ? darkColors : lightColors };
}
