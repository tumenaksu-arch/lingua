import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from './theme';

type ChipProps = { style?: StyleProp<ViewStyle> };

function Chip({
  icon,
  value,
  color,
  label,
  style,
}: ChipProps & { icon: string; value: string | number; color: string; label: string }) {
  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={[styles.chip, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

export type HeartsProps = ChipProps & { hearts: number; max?: number };
/** Heart count; shows "∞" when `hearts` is Infinity. */
export function Hearts({ hearts, max = 5, style }: HeartsProps) {
  const empty = hearts <= 0;
  const value = Number.isFinite(hearts) ? hearts : '∞';
  return (
    <Chip
      icon={empty ? '🤍' : '❤️'}
      value={value}
      color={empty ? colors.textMuted : colors.danger}
      label={`${value} of ${max} hearts`}
      style={style}
    />
  );
}

export type StreakFlameProps = ChipProps & { streak: number; /** true when today already counted */ active?: boolean };
export function StreakFlame({ streak, active = true, style }: StreakFlameProps) {
  return (
    <Chip
      icon={active ? '🔥' : '🩶'}
      value={streak}
      color={active ? colors.streak : colors.textMuted}
      label={`${streak} day streak`}
      style={style}
    />
  );
}

export type XpBadgeProps = ChipProps & { xp: number };
export function XpBadge({ xp, style }: XpBadgeProps) {
  return <Chip icon="⚡" value={`${xp} XP`} color={colors.warningShadow} label={`${xp} XP`} style={style} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
  },
  icon: { fontSize: fontSize.lg },
  value: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
