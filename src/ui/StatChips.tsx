import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE_DENSE, fontSize, fonts, radii, spacing } from './theme';
import { useTheme } from './useTheme';

type ChipProps = { style?: StyleProp<ViewStyle> };

function Chip({
  icon,
  value,
  color,
  label,
  style,
}: ChipProps & { icon: string; value: string | number; color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      <Text style={styles.icon} accessible={false} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
        {icon}
      </Text>
      <Text style={[styles.value, { color }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
        {value}
      </Text>
    </View>
  );
}

export type HeartsProps = ChipProps & { hearts: number; max?: number };
/** Heart count; shows "∞" when `hearts` is Infinity. */
export function Hearts({ hearts, max = 5, style }: HeartsProps) {
  const { colors } = useTheme();
  const empty = hearts <= 0;
  const value = Number.isFinite(hearts) ? hearts : '∞';
  return (
    <Chip
      icon={empty ? '🤍' : '❤️'}
      value={value}
      color={empty ? colors.textMuted : colors.heartsText}
      label={Number.isFinite(hearts) ? `${hearts} / ${max} kalp` : 'Sınırsız kalp'}
      style={style}
    />
  );
}

export type StreakFlameProps = ChipProps & { streak: number; /** true when today already counted */ active?: boolean };
export function StreakFlame({ streak, active = true, style }: StreakFlameProps) {
  const { colors } = useTheme();
  return (
    <Chip
      icon={active ? '🔥' : '🩶'}
      value={streak}
      color={active ? colors.streakText : colors.textMuted}
      label={`${streak} günlük seri${active ? '' : ', bugün henüz çalışılmadı'}`}
      style={style}
    />
  );
}

export type XpBadgeProps = ChipProps & { xp: number };
export function XpBadge({ xp, style }: XpBadgeProps) {
  const { colors } = useTheme();
  return <Chip icon="⚡" value={`${xp} XP`} color={colors.xpText} label={`${xp} XP`} style={style} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
  icon: { fontSize: fontSize.lg },
  value: { fontSize: fontSize.sm, fontFamily: fonts.mono },
});
