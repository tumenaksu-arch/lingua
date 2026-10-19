import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { fontSize, fontWeight, radii, shadows, spacing } from './theme';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type FeedbackSheetProps = {
  /** null/undefined = hidden */
  result?: 'correct' | 'wrong' | null;
  /** Shown under the headline; for wrong answers pass the correct solution. */
  detail?: string;
  /** Override headline (defaults "Nicely done!" / "Correct solution:"). */
  title?: string;
  continueLabel?: string;
  onContinue: () => void;
};

/**
 * Slides up from the bottom after an answer. Green for correct, red for wrong,
 * with a CONTINUE button that matches the outcome colour.
 */
export function FeedbackSheet({
  result,
  detail,
  title,
  continueLabel = 'Continue',
  onContinue,
}: FeedbackSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const correct = result === 'correct';
  const headline = title ?? (correct ? 'Nicely done!' : 'Correct solution:');

  useEffect(() => {
    if (!result) return;
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    // Screen readers: say the outcome (and the solution) without needing focus to move.
    AccessibilityInfo.announceForAccessibility(detail ? `${headline} ${detail}` : headline);
  }, [result, correct, headline, detail]);

  if (!result) return null;
  const tint = correct ? colors.primaryTint : colors.dangerTint;
  const ink = correct ? colors.primaryText : colors.dangerText;

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(120) : SlideInDown.duration(250)}
      exiting={reduceMotion ? FadeOut.duration(100) : SlideOutDown.duration(200)}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={[styles.sheet, { backgroundColor: tint, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.header}>
        <Text style={styles.icon} accessible={false}>
          {correct ? '✅' : '❌'}
        </Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: ink }]}>{headline}</Text>
          {detail ? <Text style={[styles.detail, { color: ink }]}>{detail}</Text> : null}
        </View>
      </View>
      <Button title={continueLabel} variant={correct ? 'primary' : 'danger'} onPress={onContinue} silent />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    ...shadows.sheet,
  },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { fontSize: fontSize.xl },
  textCol: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black },
  detail: { fontSize: fontSize.md, fontWeight: fontWeight.medium, lineHeight: 22 },
});
