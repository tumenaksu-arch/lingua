import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from './theme';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type VoxMood = 'happy' | 'sad' | 'cheer' | 'idle' | 'think';

export type VoxProps = {
  /** 'idle' = gentle sway, 'think' = loading, 'happy' = jump, 'sad' = droops, 'cheer' = wing flaps. */
  mood?: VoxMood;
  /** Square bounding box in px (default 96). */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const MOOD_LABEL: Record<VoxMood, string> = {
  happy: 'Vox mutlu',
  sad: 'Vox üzgün',
  cheer: 'Vox coşkulu',
  idle: 'Vox',
  think: 'Vox düşünüyor',
};

// The jest mock of react-native-reanimated has no useReducedMotion ("ADD ME IF
// NEEDED" in its mock), so fall back to the project's AccessibilityInfo-based
// hook there and OR the two: either signal disables the loops.
const systemReducedMotion: () => boolean =
  (Reanimated as unknown as { useReducedMotion?: () => boolean }).useReducedMotion ?? (() => false);

function useVoxReducedMotion(): boolean {
  const fromReanimated = systemReducedMotion();
  const fromA11y = useReduceMotion();
  return fromReanimated || fromA11y;
}

/**
 * "Vox" the parrot mascot, drawn with plain Views + border-radius so it looks
 * identical on web and Android (no react-native-svg dependency). Looping
 * mood animations run on the UI thread via Reanimated and stop entirely when
 * the OS "reduce motion" setting is on.
 */
export function Vox({ mood = 'idle', size = 96, style }: VoxProps) {
  const { colors } = useTheme();
  const reduced = useVoxReducedMotion();
  const u = size / 100;

  // One ping-pong driver for the whole body, one for the wing flaps. The
  // targets are real values (px / degrees), so no interpolate() is needed.
  const move = useSharedValue(mood === 'idle' ? -2 : 0);
  const flap = useSharedValue(0);

  useEffect(() => {
    move.value = mood === 'idle' ? -2 : 0;
    flap.value = 0;
    if (reduced || mood === 'sad') return;
    if (mood === 'happy') {
      move.value = withRepeat(withTiming(-0.12 * size, { duration: 550, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else if (mood === 'cheer') {
      move.value = withRepeat(withTiming(-0.06 * size, { duration: 420, easing: Easing.inOut(Easing.quad) }), -1, true);
      flap.value = withRepeat(withTiming(-32, { duration: 240, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else if (mood === 'idle') {
      move.value = withRepeat(withTiming(2, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      // think: slow curious tilt
      move.value = withRepeat(withTiming(3, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
  }, [mood, reduced, size, move, flap]);

  const droop = mood === 'sad';
  const bodyStyle = useAnimatedStyle(() => {
    'worklet';
    if (mood === 'happy' || mood === 'cheer') return { transform: [{ translateY: move.value }] };
    if (mood === 'idle' || mood === 'think') return { transform: [{ rotate: `${move.value}deg` }] };
    return {};
  });
  const wingLeftStyle = useAnimatedStyle(() => {
    'worklet';
    // sad droops the wings (+22°), cheer flaps them via the ping-pong `flap`.
    return { transform: [{ rotate: `${(droop ? 22 : 0) + flap.value}deg` }] };
  });
  const wingRightStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ rotate: `${180 + (droop ? 22 : 0) + flap.value}deg` }] };
  });

  const green = colors.success;
  const greenDark = colors.successText;
  const belly = colors.successTint;
  const orange = colors.warning;
  const pupilOffset = mood === 'sad' ? 0.02 : mood === 'think' ? -0.012 : -0.02;

  return (
    <View
      testID={`vox-${mood}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={MOOD_LABEL[mood]}
      pointerEvents="none"
      style={[{ width: size, height: size }, mood === 'sad' && { transform: [{ rotate: '-6deg' }] }, style]}
    >
      {mood === 'think' ? (
        <Text style={[styles.dots, { top: -2 * u, fontSize: 16 * u }]} accessible={false}>
          …
        </Text>
      ) : null}
      <Animated.View style={[styles.fill, bodyStyle]}>
        {/* tail feathers */}
        <View style={[styles.tail, { backgroundColor: greenDark, left: '32%', bottom: 4 * u, width: 12 * u, height: 26 * u, borderRadius: 6 * u, transform: [{ rotate: '18deg' }] }]} />
        <View style={[styles.tail, { backgroundColor: greenDark, right: '32%', bottom: 4 * u, width: 12 * u, height: 26 * u, borderRadius: 6 * u, transform: [{ rotate: '-18deg' }] }]} />
        {/* feet */}
        <View style={[styles.foot, { backgroundColor: orange, left: '34%', bottom: 0, width: 12 * u, height: 6 * u, borderRadius: 3 * u }]} />
        <View style={[styles.foot, { backgroundColor: orange, right: '34%', bottom: 0, width: 12 * u, height: 6 * u, borderRadius: 3 * u }]} />
        {/* body */}
        <View style={[styles.body, { backgroundColor: green, top: 24 * u, left: '19%', width: 62 * u, height: 66 * u, borderRadius: 31 * u }]}>
          {/* belly */}
          <View style={[styles.belly, { backgroundColor: belly, bottom: 6 * u, left: '18%', width: 64 * u * 0.62, height: 40 * u, borderRadius: 20 * u }]} />
          {/* wings */}
          <Animated.View
            style={[styles.wing, wingLeftStyle, { backgroundColor: greenDark, left: -7 * u, top: 18 * u, width: 16 * u, height: 38 * u, borderRadius: 8 * u }]}
          />
          <Animated.View
            style={[styles.wing, wingRightStyle, { backgroundColor: greenDark, right: -7 * u, top: 18 * u, width: 16 * u, height: 38 * u, borderRadius: 8 * u }]}
          />
        </View>
        {/* head */}
        <View style={[styles.head, { backgroundColor: green, top: 2 * u, left: '27%', width: 46 * u, height: 46 * u, borderRadius: 23 * u }]}>
          {/* crest tufts */}
          <View style={[styles.crest, { backgroundColor: green, left: '26%', top: -6 * u, width: 8 * u, height: 12 * u, borderRadius: 4 * u, transform: [{ rotate: '-18deg' }] }]} />
          <View style={[styles.crest, { backgroundColor: green, right: '26%', top: -6 * u, width: 8 * u, height: 12 * u, borderRadius: 4 * u, transform: [{ rotate: '18deg' }] }]} />
          {/* eyes */}
          <View style={[styles.eye, { backgroundColor: palette.white, left: '16%', top: '22%', width: 15 * u, height: 15 * u, borderRadius: 8 * u }]}>
            <View style={[styles.pupil, { backgroundColor: palette.navy, width: 7 * u, height: 7 * u, borderRadius: 4 * u, top: `${22 + pupilOffset * 100}%`, left: '28%' }]} />
          </View>
          <View style={[styles.eye, { backgroundColor: palette.white, right: '16%', top: '22%', width: 15 * u, height: 15 * u, borderRadius: 8 * u }]}>
            <View style={[styles.pupil, { backgroundColor: palette.navy, width: 7 * u, height: 7 * u, borderRadius: 4 * u, top: `${22 + pupilOffset * 100}%`, left: '28%' }]} />
          </View>
          {/* beak (diamond) */}
          <View style={[styles.beak, { backgroundColor: orange, top: '52%', left: '36%', width: 14 * u, height: 14 * u, borderRadius: 4 * u, transform: [{ rotate: '45deg' }] }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dots: { position: 'absolute', alignSelf: 'center', fontWeight: '700' },
  tail: { position: 'absolute' },
  foot: { position: 'absolute' },
  body: { position: 'absolute' },
  belly: { position: 'absolute' },
  wing: { position: 'absolute' },
  head: { position: 'absolute' },
  crest: { position: 'absolute' },
  eye: { position: 'absolute' },
  pupil: { position: 'absolute' },
  beak: { position: 'absolute' },
});
