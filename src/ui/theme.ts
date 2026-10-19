/**
 * Design tokens — Duolingo-inspired, in a light and a dark palette.
 * `colors` is the light palette (kept as a static export for code that cannot
 * use hooks); components should read the active palette through `useTheme()`.
 *
 * Contrast (WCAG 2.1 AA, computed): body text ≥ 4.5:1 and button labels
 * (19px bold = "large text") ≥ 3:1 in both palettes — see docs in useTheme.ts.
 */

export const palette = {
  green: '#58CC02',
  greenDark: '#46A302',
  greenDeep: '#2F7A00',
  greenLight: '#D7FFB8',
  greenNight: '#1F3B13',
  blue: '#1CB0F6',
  blueDark: '#1899D6',
  blueDeep: '#0E7CB8',
  blueText: '#0B6698',
  blueLight: '#DDF4FF',
  blueNight: '#12303F',
  red: '#FF4B4B',
  redDark: '#EA2B2B',
  redDeep: '#D32020',
  redText: '#B81C1C',
  redLight: '#FFDFE0',
  redNight: '#3E1A1A',
  yellow: '#FFC800',
  yellowDark: '#E5B400',
  yellowText: '#8A6B00',
  orange: '#FF9600',
  orangeDark: '#E58700',
  orangeText: '#B35200',
  purple: '#CE82FF',
  purpleDark: '#A560E8',
  white: '#FFFFFF',
  black: '#000000',
  navy: '#131F24',
  navySurface: '#202F36',
  navyBorder: '#37464F',
  navyBorderStrong: '#4A5A64',
  navyDisabled: '#2A3A42',
  navyDisabledText: '#6B7A82',
  snow: '#F1F7FB',
  gray50: '#F7F7F7',
  gray100: '#E5E5E5',
  gray200: '#CFCFCF',
  gray300: '#AFAFAF',
  gray400: '#6F6F6F',
  gray500: '#4B4B4B',
  gray600: '#3C3C3C',
} as const;

export interface ColorTokens {
  /** Brand accents (fills for non-text UI such as path nodes and progress bars). */
  primary: string;
  primaryShadow: string;
  primaryTint: string;
  /** Text colour that passes AA on `primaryTint` / background. */
  primaryText: string;
  secondary: string;
  secondaryShadow: string;
  secondaryTint: string;
  secondaryText: string;
  danger: string;
  dangerShadow: string;
  dangerTint: string;
  dangerText: string;
  warning: string;
  warningShadow: string;
  streak: string;
  streakShadow: string;
  accent: string;
  accentShadow: string;
  /** Button faces are slightly darker than the accents so white 19px-bold labels reach ≥ 3:1. */
  buttonPrimary: string;
  buttonPrimaryShadow: string;
  buttonSecondary: string;
  buttonSecondaryShadow: string;
  buttonDanger: string;
  buttonDangerShadow: string;
  /** Stat chip text colours (≥ 4.5:1 on background). */
  streakText: string;
  xpText: string;
  heartsText: string;
  text: string;
  textMuted: string;
  textOnColor: string;
  /** Dark text for bright brand fills (green/yellow/blue headers and banners). */
  textOnBrand: string;
  border: string;
  borderStrong: string;
  background: string;
  surface: string;
  disabled: string;
  disabledText: string;
  locked: string;
  lockedShadow: string;
}

export const colors: ColorTokens = {
  primary: palette.green,
  primaryShadow: palette.greenDark,
  primaryTint: palette.greenLight,
  primaryText: palette.greenDeep,
  secondary: palette.blue,
  secondaryShadow: palette.blueDark,
  secondaryTint: palette.blueLight,
  secondaryText: palette.blueText,
  danger: palette.red,
  dangerShadow: palette.redDark,
  dangerTint: palette.redLight,
  dangerText: palette.redText,
  warning: palette.yellow,
  warningShadow: palette.yellowDark,
  streak: palette.orange,
  streakShadow: palette.orangeDark,
  accent: palette.purple,
  accentShadow: palette.purpleDark,
  buttonPrimary: palette.greenDark,
  buttonPrimaryShadow: palette.greenDeep,
  buttonSecondary: palette.blueDark,
  buttonSecondaryShadow: palette.blueDeep,
  buttonDanger: palette.redDark,
  buttonDangerShadow: palette.redText,
  streakText: palette.orangeText,
  xpText: palette.yellowText,
  heartsText: palette.redDeep,
  text: palette.gray500,
  textMuted: palette.gray400,
  textOnColor: palette.white,
  textOnBrand: palette.navy,
  border: palette.gray100,
  borderStrong: palette.gray200,
  background: palette.white,
  surface: palette.gray50,
  disabled: palette.gray100,
  disabledText: palette.gray300,
  locked: palette.gray100,
  lockedShadow: palette.gray200,
};

export const darkColors: ColorTokens = {
  ...colors,
  primaryTint: palette.greenNight,
  primaryText: palette.green,
  secondaryTint: palette.blueNight,
  secondaryText: palette.blue,
  dangerTint: palette.redNight,
  dangerText: palette.red,
  streakText: palette.orange,
  xpText: palette.yellow,
  heartsText: palette.red,
  text: palette.snow,
  textMuted: palette.gray300,
  border: palette.navyBorder,
  borderStrong: palette.navyBorderStrong,
  background: palette.navy,
  surface: palette.navySurface,
  disabled: palette.navyDisabled,
  disabledText: palette.navyDisabledText,
  locked: palette.navyBorder,
  lockedShadow: palette.navyDisabled,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 19,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  bold: '700',
  black: '800',
} as const;

export const shadows = {
  card: {
    shadowColor: palette.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sheet: {
    shadowColor: palette.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
} as const;

/** Depth of the "3D" bottom edge on pressable elements. */
export const PRESS_DEPTH = 4;
/** Minimum touch target (a11y). */
export const MIN_TOUCH = 44;
/** Cap for dynamic type on dense chips so labels do not overflow their cards. */
export const MAX_FONT_SCALE_DENSE = 1.6;

export const theme = { colors, spacing, radii, fontSize, fontWeight, shadows };
export type Theme = typeof theme;
