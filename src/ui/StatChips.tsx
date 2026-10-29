import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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

export type GemChipProps = ChipProps & { gems: number; /** Mağazayı açar; verilmezse salt metin. */
  onPress?: () => void };
/** Elmas bakiyesi; dokununca mağazayı açar. */
export function GemChip({ gems, onPress, style }: GemChipProps) {
  const { colors } = useTheme();
  const chip = (
    <Chip icon="💎" value={gems} color={colors.secondaryText} label={`${gems} elmas`} style={style} />
  );
  if (!onPress) return chip;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${gems} elmas. Mağazayı aç`}
      onPress={onPress}
      hitSlop={8}
    >
      {chip}
    </Pressable>
  );
}

export type XpBoostChipProps = ChipProps & { until: number };
/**
 * "⚡ Çift XP — 12:34" geri sayım çipi. Süre dolunca kendini gizler;
 * saniyelik tick kendi içinde döner (ana sayfa ve ders sonu ekranı).
 */
export function XpBoostChip({ until, style }: XpBoostChipProps) {
  const { colors } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (until <= now) return null;
  const totalSec = Math.max(0, Math.floor((until - now) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return (
    <Chip
      icon="⚡"
      value={`Çift XP — ${mm}:${ss}`}
      color={colors.xpText}
      label={`Çift XP aktif, kalan süre ${mm} dakika ${ss} saniye`}
      style={[{ borderColor: colors.xpText }, style]}
    />
  );
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
