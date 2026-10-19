import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii } from './theme';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({ progress, height = 16, color, trackColor, accessibilityLabel, style }: ProgressBarProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const width = useSharedValue(clamp(progress));

  useEffect(() => {
    width.value = reduceMotion ? clamp(progress) : withTiming(clamp(progress), { duration: 350 });
  }, [progress, width, reduceMotion]);

  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(progress) * 100) }}
      style={[
        styles.track,
        { height, backgroundColor: trackColor ?? colors.border, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color ?? colors.primary, borderRadius: height / 2 }, fill]}>
        <View style={[styles.gloss, { height: height / 4, top: height / 4, borderRadius: height / 8 }]} />
      </Animated.View>
    </View>
  );
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, v || 0));
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', minWidth: 0 },
  gloss: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: radii.pill,
  },
});
