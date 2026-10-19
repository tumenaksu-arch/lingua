import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { colors, fontSize, fontWeight, radii, shadows, spacing } from './theme';

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

  useEffect(() => {
    if (!result) return;
    Haptics.notificationAsync(
      result === 'correct' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
  }, [result]);

  if (!result) return null;
  const correct = result === 'correct';
  const headline = title ?? (correct ? 'Nicely done!' : 'Correct solution:');

  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      exiting={SlideOutDown.duration(200)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.sheet,
        { backgroundColor: correct ? colors.primaryTint : colors.dangerTint, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{correct ? '✅' : '❌'}</Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: correct ? colors.primaryShadow : colors.dangerShadow }]}>{headline}</Text>
          {detail ? (
            <Text style={[styles.detail, { color: correct ? colors.primaryShadow : colors.dangerShadow }]}>{detail}</Text>
          ) : null}
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
