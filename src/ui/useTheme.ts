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
 *
 * Contrast (WCAG 2.1 AA) of the shipped tokens, computed:
 *   light  text 8.72:1 · muted 5.02:1 · white on button faces 3.23/3.20/4.30:1 (19px bold ⇒ large text, ≥3:1)
 *   dark   text 15.56:1 · muted 7.66:1 · text-on-tint 5.94/5.65/4.65:1
 */
export function useTheme(): ActiveTheme {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return { scheme, isDark: scheme === 'dark', colors: scheme === 'dark' ? darkColors : lightColors };
}
