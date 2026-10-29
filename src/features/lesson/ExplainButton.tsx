import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { aiStatus, AiError } from '@/features/conversation';
import { aiExplain, type AiExplainRequest } from '@/features/lesson/explainApi';
import { Body, Button, Caption, spacing, upperTr, useTheme } from '@/ui';

type Phase = 'idle' | 'loading' | 'done' | 'error';

/**
 * Duolingo "Explain My Answer": sits under the ready-made wrong-answer hint in
 * the feedback sheet and asks the AI why THE LEARNER'S OWN answer was wrong.
 * Hidden entirely while the AI service is disabled or the learner is signed
 * out (the status check fails with an auth error before any network call).
 * One press → loading → the Turkish explanation replaces the button; a second
 * tap never fires a new request (aiExplain caches per exercise + answers).
 */
export function ExplainButton(props: AiExplainRequest) {
  const { colors } = useTheme();
  const [available, setAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // enabled:false ya da oturum yoksa (auth hatası) düğme hiç görünmez;
    // erişim hatalarında da sessizce gizlenir.
    aiStatus()
      .then((status) => {
        if (!cancelled) setAvailable(status.enabled);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const request = () => {
    if (phase === 'loading' || phase === 'done') return;
    setPhase('loading');
    setErrorMessage(null);
    aiExplain(props)
      .then((res) => {
        setExplanation(res.explanation);
        setTip(res.tip);
        setPhase('done');
      })
      .catch((e: unknown) => {
        setPhase('error');
        setErrorMessage(e instanceof AiError ? e.message : 'Bir sorun oluştu. Lütfen tekrar dene.');
      });
  };

  if (phase === 'done' && explanation) {
    return (
      <View style={styles.result} accessibilityLiveRegion="polite">
        <Caption color={colors.textMuted}>{upperTr('Yapay zekâ açıklaması')}</Caption>
        <Body>{explanation}</Body>
        {tip ? <Caption color={colors.textMuted}>💡 {tip}</Caption> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {phase === 'error' && errorMessage ? (
        <Caption color={colors.dangerText} accessibilityRole="alert">
          {errorMessage}
        </Caption>
      ) : null}
      <Button
        title={phase === 'error' ? 'Tekrar dene' : '🤖 Cevabımı açıkla'}
        variant="outline"
        loading={phase === 'loading'}
        onPress={request}
        silent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  result: { gap: spacing.xs },
});
