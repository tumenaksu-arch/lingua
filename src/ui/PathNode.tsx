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

import { MAX_FONT_SCALE_DENSE, PRESS_DEPTH, fontSize, fontWeight, radii, spacing, type ColorTokens } from './theme';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type PathNodeState = 'locked' | 'active' | 'completed';

export type PathNodeProps = {
  state: PathNodeState;
  /** 0..5 crowns earned for this lesson. */
  crowns?: number;
  /** Tooltip text above the active node. Default "START". */
  tooltip?: string;
  /** Horizontal offset in px so the path can snake left/right. */
  offsetX?: number;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function nodeColors(state: PathNodeState, c: ColorTokens): { bg: string; shadow: string; icon: string } {
  switch (state) {
    case 'locked':
      return { bg: c.locked, shadow: c.lockedShadow, icon: c.textMuted };
    case 'active':
      return { bg: c.primary, shadow: c.primaryShadow, icon: c.textOnBrand };
    case 'completed':
      return { bg: c.warning, shadow: c.warningShadow, icon: c.textOnBrand };
  }
}

const STATE_LABEL: Record<PathNodeState, string> = { locked: 'kilitli', active: 'başlanabilir', completed: 'tamamlandı' };

export function PathNode({
  state,
  crowns = 0,
  tooltip = 'START',
  offsetX = 0,
  size = 72,
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
        withTiming(-6, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bounce);
  }, [isActive, reduceMotion, bounce]);

  const tooltipStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const icon = state === 'locked' ? '🔒' : state === 'completed' ? '👑' : '★';
  const label = `${accessibilityLabel ?? 'Ders'}, ${STATE_LABEL[state]}${crowns ? `, ${crowns} taç` : ''}`;

  return (
    <View style={[styles.wrap, { transform: [{ translateX: offsetX }] }, style]}>
      {isActive ? (
        <Animated.View
          style={[styles.tooltip, { backgroundColor: colors.background, borderColor: colors.border }, tooltipStyle]}
          pointerEvents="none"
          accessible={false}
        >
          <Text style={[styles.tooltipText, { color: colors.primaryText }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
            {tooltip}
          </Text>
          <View style={[styles.tooltipArrow, { backgroundColor: colors.background, borderColor: colors.border }]} />
        </Animated.View>
      ) : null}

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
        <View style={[styles.shadow, { width: size, height: size, borderRadius: size / 2, backgroundColor: node.shadow }]}>
          <View
            style={[
              styles.face,
              {
                width: size,
                height: size - PRESS_DEPTH * 2,
                borderRadius: size / 2,
                backgroundColor: node.bg,
                transform: [{ translateY: pressed ? PRESS_DEPTH * 2 : 0 }],
              },
            ]}
          >
            <Text style={[styles.icon, { fontSize: size * 0.38, color: node.icon }]} accessible={false}>
              {icon}
            </Text>
          </View>
        </View>
      </Pressable>

      {crowns > 0 ? (
        <View style={[styles.crownBadge, { backgroundColor: colors.background, borderColor: colors.border }]} accessible={false}>
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
  shadow: { alignItems: 'center', justifyContent: 'flex-start' },
  face: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontWeight: fontWeight.black },
  tooltip: {
    position: 'absolute',
    top: -spacing.xl,
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  tooltipText: { fontWeight: fontWeight.black, fontSize: fontSize.sm, letterSpacing: 1 },
  tooltipArrow: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -2,
    width: 12,
    height: 12,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  crownBadge: {
    marginTop: spacing.xs,
    borderWidth: 2,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  crownText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
