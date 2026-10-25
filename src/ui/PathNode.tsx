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
  /** Tooltip text shown as a small mono pill next to the active node. Default "START". */
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
  tooltip = 'START',
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

  // Numbered node: the crown count is the numeral while the lesson has crowns;
  // otherwise a plain dot marks the active step.
  const glyph = state === 'locked' ? '🔒' : state === 'completed' ? '✓' : crowns > 0 ? String(crowns) : '•';
  const label = `${accessibilityLabel ?? 'Ders'}, ${STATE_LABEL[state]}${crowns ? `, ${crowns} taç` : ''}`;

  return (
    <View style={[styles.wrap, { transform: [{ translateX: offsetX }] }, style]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
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

        {isActive ? (
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
        <View style={[styles.crownBadge, { backgroundColor: colors.surface, borderColor: colors.border }]} accessible={false}>
          <Text style={[styles.crownText, { color: colors.xpText }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
            👑 {crowns}
          </Text>
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
  crownBadge: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  crownText: { fontSize: 11, fontFamily: fonts.mono },
});
