import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MAX_FONT_SCALE_DENSE, fonts, radii, spacing, type ColorTokens } from './theme';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type PathNodeState = 'locked' | 'active' | 'completed';

export type PathNodeProps = {
  state: PathNodeState;
  /** 0..5 crowns earned for this lesson. */
  crowns?: number;
  /** Optional numeral rendered inside the node (e.g. the lesson number in a vertical list). */
  label?: string;
  /** Tooltip text shown as a small mono pill next to the active node. Rendered only when provided. */
  tooltip?: string;
  /** Horizontal offset in px so the path can snake left/right. */
  offsetX?: number;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Flat compact 44×44 rounded-square node: ✓ completed, numbered active, 🔒 locked. */
function nodeColors(state: PathNodeState, c: ColorTokens): { bg: string; border: string; icon: string } {
  switch (state) {
    case 'locked':
      return { bg: c.locked, border: c.border, icon: c.textMuted };
    case 'active':
      return { bg: c.primary, border: c.primaryShadow, icon: c.textOnBrand };
    case 'completed':
      return { bg: c.successTint, border: c.success, icon: c.successText };
  }
}

const STATE_LABEL: Record<PathNodeState, string> = { locked: 'kilitli', active: 'başlanabilir', completed: 'tamamlandı' };

export function PathNode({
  state,
  crowns = 0,
  label,
  tooltip,
  offsetX = 0,
  size = 44,
  onPress,
  accessibilityLabel,
  style,
}: PathNodeProps) {
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const bounce = useSharedValue(0);
  const isActive = state === 'active';
  const node = nodeColors(state, colors);

  useEffect(() => {
    if (!isActive || reduceMotion) {
      cancelAnimation(bounce);
      bounce.value = 0;
      return;
    }
    bounce.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bounce);
  }, [isActive, reduceMotion, bounce]);

  const tooltipStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  // Numbered node: an explicit label (lesson number) wins; otherwise completed shows ✓,
  // and a crowned active step falls back to its crown count.
  const glyph = state === 'locked' ? '🔒' : (label ?? (state === 'completed' ? '✓' : crowns > 0 ? String(crowns) : '•'));
  const a11yLabel = `${accessibilityLabel ?? 'Ders'}, ${STATE_LABEL[state]}${crowns ? `, ${crowns} taç` : ''}`;

  return (
    <View style={[styles.wrap, { transform: [{ translateX: offsetX }] }, style]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityState={{ disabled: state === 'locked' }}
          disabled={state === 'locked' || !onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onPress?.();
          }}
          hitSlop={8}
        >
          <View
            style={[
              styles.node,
              {
                width: size,
                height: size,
                backgroundColor: node.bg,
                borderColor: node.border,
                opacity: pressed && state !== 'locked' ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[styles.glyph, { fontSize: state === 'active' ? size * 0.4 : size * 0.42, color: node.icon }]}
              accessible={false}
            >
              {glyph}
            </Text>
          </View>
        </Pressable>

        {isActive && tooltip ? (
          <Animated.View
            style={[
              styles.tooltip,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
              tooltipStyle,
            ]}
            pointerEvents="none"
            accessible={false}
          >
            <Text style={[styles.tooltipText, { color: colors.primaryText }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
              {tooltip}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {crowns > 0 ? (
        <View style={styles.crowns} accessible={false}>
          {Array.from({ length: crowns }, (_, i) => (
            <View key={i} style={[styles.crownDot, { backgroundColor: colors.warning }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  glyph: { fontFamily: fonts.mono },
  tooltip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tooltipText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  crowns: { flexDirection: 'row', gap: 3, marginTop: spacing.xs },
  crownDot: { width: 5, height: 5, borderRadius: 2.5 },
});
