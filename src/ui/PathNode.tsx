import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PRESS_DEPTH, colors, fontSize, fontWeight, radii, spacing } from './theme';

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

const NODE_COLORS: Record<PathNodeState, { bg: string; shadow: string }> = {
  locked: { bg: colors.locked, shadow: colors.lockedShadow },
  active: { bg: colors.primary, shadow: colors.primaryShadow },
  completed: { bg: colors.warning, shadow: colors.warningShadow },
};

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
  const bounce = useSharedValue(0);
  const isActive = state === 'active';
  const palette = NODE_COLORS[state];

  useEffect(() => {
    if (!isActive) return;
    bounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [isActive, bounce]);

  const tooltipStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const icon = state === 'locked' ? '🔒' : state === 'completed' ? '👑' : '★';

  return (
    <View style={[styles.wrap, { transform: [{ translateX: offsetX }] }, style]}>
      {isActive ? (
        <Animated.View style={[styles.tooltip, tooltipStyle]} pointerEvents="none">
          <Text style={styles.tooltipText}>{tooltip}</Text>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Lesson, ${state}${crowns ? `, ${crowns} crowns` : ''}`}
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
        <View style={[styles.shadow, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.shadow }]}>
          <View
            style={[
              styles.face,
              {
                width: size,
                height: size - PRESS_DEPTH * 2,
                borderRadius: size / 2,
                backgroundColor: palette.bg,
                transform: [{ translateY: pressed ? PRESS_DEPTH * 2 : 0 }],
              },
            ]}
          >
            <Text style={[styles.icon, { fontSize: size * 0.38, color: state === 'locked' ? colors.textMuted : colors.textOnColor }]}>
              {icon}
            </Text>
          </View>
        </View>
      </Pressable>

      {crowns > 0 ? (
        <View style={styles.crownBadge} accessibilityLabel={`${crowns} crowns`}>
          <Text style={styles.crownText}>👑 {crowns}</Text>
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
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  tooltipText: { color: colors.primary, fontWeight: fontWeight.black, fontSize: fontSize.sm, letterSpacing: 1 },
  tooltipArrow: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -2,
    width: 12,
    height: 12,
    backgroundColor: colors.background,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  crownBadge: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  crownText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.warningShadow },
});
