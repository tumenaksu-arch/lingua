import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Caption } from './Typography';
import { Button } from './Button';
import { fonts, radii, spacing } from './theme';
import { upperTr } from './upperTr';
import { useReduceMotion } from './useReduceMotion';
import { useTheme } from './useTheme';

export type FeedbackSheetProps = {
  /** null/undefined = hidden */
  result?: 'correct' | 'wrong' | null;
  /** Shown under the headline; for wrong answers pass the correct solution. */
  detail?: string;
  /** "Neden?" explanation for wrong answers (specific text or the generic per-type hint). */
  explanation?: string;
  /** Extra content under the explanation (e.g. the AI "Cevabımı açıkla" button). */
  extra?: ReactNode;
  /** Override headline (defaults "Nicely done!" / "Correct solution:"). */
  title?: string;
  continueLabel?: string;
  onContinue: () => void;
};

/**
 * Slides up from the bottom after an answer. Teal-tinted for correct, red-tinted
 * for wrong, with a flat hairline top border and a CONTINUE button that matches
 * the outcome colour.
 */
export function FeedbackSheet({
  result,
  detail,
  explanation,
  extra,
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
  const tint = correct ? colors.successTint : colors.dangerTint;
  const ink = correct ? colors.successText : colors.dangerText;

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(120) : SlideInDown.duration(250)}
      exiting={reduceMotion ? FadeOut.duration(100) : SlideOutDown.duration(200)}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={[styles.sheet, { backgroundColor: tint, borderTopColor: colors.borderStrong, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.header}>
        <Text style={styles.icon} accessible={false}>
          {correct ? '✅' : '❌'}
        </Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: ink }]}>{headline}</Text>
          {detail ? <Text style={[styles.detail, { color: ink }]}>{detail}</Text> : null}
          {explanation ? (
            <View accessibilityLiveRegion="polite" style={styles.why}>
              <Caption color={ink}>{upperTr('Neden?')}</Caption>
              <Body color={ink}>{explanation}</Body>
            </View>
          ) : null}
        </View>
      </View>
      {extra}
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
    borderTopWidth: 1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { fontSize: 24 },
  textCol: { flex: 1, gap: spacing.xs },
  title: { fontSize: 24, fontFamily: fonts.display },
  detail: { fontSize: 16, lineHeight: 22, fontFamily: fonts.body },
  why: { marginTop: spacing.xs, gap: spacing.xs },
});
