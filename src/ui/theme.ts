/**
 * Design tokens — EduPilot design language (dark navy + apricot accent, teal success,
 * flat hairline-bordered surfaces), in a dark (default) and a light palette.
 * `colors` is the light palette (kept as a static export for code that cannot
 * use hooks); components should read the active palette through `useTheme()`.
 *
 * Contrast (WCAG 2.1 AA, computed): body text ≥ 4.5:1 and button labels
 * (treated as large text) ≥ 3:1 in both palettes — see docs in useTheme.ts.
 */

export const palette = {
  // EduPilot dark neutrals
  navy: '#0e1220',
  navySurface: '#161c30',
  navyDisabled: '#1f2538',
  navyBorder: '#262c40',
  navyBorderStrong: '#3a4157',
  slate: '#5b6480',
  mist: '#8e97b5',
  cloud: '#e8eaf2',
  // apricot accent
  apricot: '#d18b63',
  apricotDeep: '#a86a47',
  apricotDark: '#b8714a',
  apricotDeeper: '#96532f',
  apricotInk: '#8a4f2e',
  apricotPale: '#2a2120',
  // deep blue secondary
  blue: '#2e5894',
  blueDeep: '#244573',
  bluePale: '#17223a',
  blueLight: '#8fb0e6',
  // teal success (deliberately NOT Duolingo green)
  teal: '#4fb286',
  tealDark: '#2f8f66',
  tealPale: '#13291f',
  tealLight: '#7fd1aa',
  tealInk: '#20684a',
  // coral danger
  coral: '#e5675b',
  coralDark: '#c94f44',
  coralDeeper: '#93352c',
  coralPale: '#2e1716',
  coralLight: '#f08f85',
  coralInk: '#a03a31',
  // amber warning / streak / xp
  amber: '#e0a24a',
  amberLight: '#f0bf73',
  amberInk: '#8a6420',
  // light-palette-only neutrals & tints
  paper: '#f6f4f0',
  sand: '#e3dfd6',
  stone: '#cfc9bd',
  porcelain: '#e9e5dc',
  porcelainText: '#9a948a',
  apricotWash: '#f4e8de',
  blueWash: '#e8eef8',
  tealWash: '#e2f0e9',
  coralWash: '#f8e4e1',
  white: '#ffffff',
  black: '#000000',
} as const;

export interface ColorTokens {
  /** Brand accent (fills: progress, active node, selected states). */
  primary: string;
  primaryShadow: string;
  primaryTint: string;
  /** Accent text on background/tint (≥ 4.5:1). */
  primaryText: string;
  secondary: string;
  secondaryTint: string;
  secondaryText: string;
  /** Correct answers (teal-green, not Duolingo green). */
  success: string;
  successTint: string;
  successText: string;
  danger: string;
  dangerTint: string;
  dangerText: string;
  warning: string;
  streak: string;
  streakText: string;
  xpText: string;
  heartsText: string;
  buttonPrimary: string;
  /** Label colour for the primary button face (navy on apricot in dark, white in light). */
  buttonPrimaryText: string;
  buttonSecondary: string;
  /** Darker edge shade of the secondary button face (used by a few custom controls). */
  buttonSecondaryShadow: string;
  buttonDanger: string;
  /** Darker edge shade of the danger button face (used by a few custom controls). */
  buttonDangerShadow: string;
  text: string;
  textMuted: string;
  /** White text for coloured faces (secondary/danger buttons, badges). */
  textOnColor: string;
  /** Dark navy text for bright brand fills (primary face, warning banners). */
  textOnBrand: string;
  border: string;
  borderStrong: string;
  background: string;
  surface: string;
  disabled: string;
  disabledText: string;
  locked: string;
}

/** Light palette — "Açık" theme, same EduPilot design language. */
export const colors: ColorTokens = {
  primary: palette.apricotDark,
  primaryShadow: palette.apricotDeeper,
  primaryTint: palette.apricotWash,
  primaryText: palette.apricotInk,
  secondary: palette.blue,
  secondaryTint: palette.blueWash,
  secondaryText: palette.blue,
  success: palette.tealDark,
  successTint: palette.tealWash,
  successText: palette.tealInk,
  danger: palette.coralDark,
  dangerTint: palette.coralWash,
  dangerText: palette.coralInk,
  warning: palette.amber,
  streak: palette.amber,
  streakText: palette.amberInk,
  xpText: palette.apricotInk,
  heartsText: '#b03e34',
  buttonPrimary: palette.apricotDark,
  // White on #b8714a is 3.82:1 ≥ 3:1 (large-text threshold) — see useTheme.ts.
  buttonPrimaryText: palette.white,
  buttonSecondary: palette.blue,
  buttonSecondaryShadow: palette.blueDeep,
  buttonDanger: palette.coralDark,
  buttonDangerShadow: '#a03e34',
  text: palette.navy,
  textMuted: palette.slate,
  textOnColor: palette.white,
  textOnBrand: palette.navy,
  border: palette.sand,
  borderStrong: palette.stone,
  background: palette.paper,
  surface: palette.white,
  disabled: palette.porcelain,
  disabledText: palette.porcelainText,
  locked: palette.porcelain,
};

/** Dark palette — the DEFAULT theme (EduPilot navy). */
export const darkColors: ColorTokens = {
  primary: palette.apricot,
  primaryShadow: palette.apricotDeep,
  primaryTint: palette.apricotPale,
  primaryText: '#e0a684',
  secondary: palette.blue,
  secondaryTint: palette.bluePale,
  secondaryText: palette.blueLight,
  success: palette.teal,
  successTint: palette.tealPale,
  successText: palette.tealLight,
  danger: palette.coral,
  dangerTint: palette.coralPale,
  dangerText: palette.coralLight,
  warning: palette.amber,
  streak: palette.amber,
  streakText: palette.amberLight,
  xpText: '#e0a684',
  heartsText: palette.coralLight,
  buttonPrimary: palette.apricot,
  // Navy on #d18b63 is 6.74:1 — the primary label MUST be dark, not white.
  buttonPrimaryText: palette.navy,
  buttonSecondary: palette.blue,
  buttonSecondaryShadow: palette.blueDeep,
  buttonDanger: palette.coralDark,
  buttonDangerShadow: palette.coralDeeper,
  text: palette.cloud,
  textMuted: palette.mist,
  textOnColor: palette.white,
  textOnBrand: palette.navy,
  border: palette.navyBorder,
  borderStrong: palette.navyBorderStrong,
  background: palette.navy,
  surface: palette.navySurface,
  disabled: palette.navyDisabled,
  disabledText: palette.slate,
  locked: palette.navyDisabled,
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

/** Bundled EduPilot font families, loaded once in src/app/_layout.tsx (platform fallback until then). */
export const fonts = {
  /** Display / headings — Space Grotesk. */
  display: 'SpaceGrotesk_400Regular',
  /** Body — Inter. */
  body: 'Inter_400Regular',
  /** Light body (landing page lead text). */
  bodyLight: 'Inter_300Light',
  /** Labels, numerals, captions — Space Mono. */
  mono: 'SpaceMono_400Regular',
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

/** Minimum touch target (a11y). */
export const MIN_TOUCH = 44;
/** Cap for dynamic type on dense chips so labels do not overflow their cards. */
export const MAX_FONT_SCALE_DENSE = 1.6;

export const theme = { colors, spacing, radii, fontSize, fontWeight, shadows };
export type Theme = typeof theme;
