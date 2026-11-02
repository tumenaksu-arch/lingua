import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ProficiencyLevel } from '@/domain/proficiency';

import { Caption } from './Typography';
import { radii, spacing } from './theme';
import { useTheme } from './useTheme';

export type LevelBadgeProps = {
  level: ProficiencyLevel;
  style?: StyleProp<ViewStyle>;
};

/**
 * CEFR seviye rozeti — küçük pill. A1 (ilk üniteler) apricot vurgu, A2 mavi
 * ikincil ton; renkler tema token'larından gelir.
 */
export function LevelBadge({ level, style }: LevelBadgeProps) {
  const { colors } = useTheme();
  const tone =
    level === 'A1'
      ? { bg: colors.primaryTint, border: colors.primary, text: colors.primaryText }
      : { bg: colors.secondaryTint, border: colors.secondary, text: colors.secondaryText };
  return (
    <View
      style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Seviye ${level}`}
    >
      <Caption color={tone.text}>{level}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
});
