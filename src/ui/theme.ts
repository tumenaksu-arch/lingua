/**
 * Design tokens — Duolingo-inspired. Light mode only for now; the `Theme`
 * shape is what a dark palette would also have to satisfy.
 */

export const palette = {
  green: '#58CC02',
  greenDark: '#46A302',
  greenLight: '#D7FFB8',
  blue: '#1CB0F6',
  blueDark: '#1899D6',
  blueLight: '#DDF4FF',
  red: '#FF4B4B',
  redDark: '#EA2B2B',
  redLight: '#FFDFE0',
  yellow: '#FFC800',
  yellowDark: '#E5B400',
  orange: '#FF9600',
  orangeDark: '#E58700',
  purple: '#CE82FF',
  purpleDark: '#A560E8',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F7F7F7',
  gray100: '#E5E5E5',
  gray200: '#CFCFCF',
  gray300: '#AFAFAF',
  gray400: '#777777',
  gray500: '#4B4B4B',
  gray600: '#3C3C3C',
} as const;

export const colors = {
  primary: palette.green,
  primaryShadow: palette.greenDark,
  primaryTint: palette.greenLight,
  secondary: palette.blue,
  secondaryShadow: palette.blueDark,
  secondaryTint: palette.blueLight,
  danger: palette.red,
  dangerShadow: palette.redDark,
  dangerTint: palette.redLight,
  warning: palette.yellow,
  warningShadow: palette.yellowDark,
  streak: palette.orange,
  streakShadow: palette.orangeDark,
  accent: palette.purple,
  accentShadow: palette.purpleDark,
  text: palette.gray500,
  textMuted: palette.gray300,
  textOnColor: palette.white,
  border: palette.gray100,
  borderStrong: palette.gray200,
  background: palette.white,
  surface: palette.gray50,
  disabled: palette.gray100,
  disabledText: palette.gray300,
  locked: palette.gray100,
  lockedShadow: palette.gray200,
} as const;

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

export const theme = { colors, spacing, radii, fontSize, fontWeight, shadows };
export type Theme = typeof theme;
