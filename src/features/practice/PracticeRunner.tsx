import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getExplanation, genericHint } from '@/content/explanations';
import { getVocab } from '@/content';
import {
  answer,
  createLesson,
  current,
  isFinished,
  progress,
  toResult,
  type Exercise,
  type LessonState,
  type SrsCard,
} from '@/domain';
import { ExerciseView } from '@/features/lesson/ExerciseView';
import { playComplete, playCorrect, playWrong } from '@/features/sound';
import { formatDuration, correctAnswerText } from '@/features/lesson/helpers';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, FeedbackSheet, Heading, ProgressBar, Screen, Title, showAlert, spacing, useTheme } from '@/ui';

import { WEAK_WORDS_LIMIT, buildMistakeSession, buildWordSession, type PracticeMode } from './session';

interface SessionData {
  exercises: Exercise[];
  /** words mode: practice exercise id → the SRS card it drills */
  cards: Map<string, SrsCard>;
}

/**
 * A Practice Hub session (job 1A): the stored mistakes or the weakest words as
 * a 10-question run through the regular ExerciseView/FeedbackSheet flow.
 * Costs no hearts; finishing pays session XP through `finishPractice`.
 */
export function PracticeRunner({ mode }: { mode: PracticeMode }) {
  const course = useAppStore((s) => s.course);
  const mistakeEntries = useAppStore((s) => s.mistakeEntries);
  const weakWordCards = useAppStore((s) => s.weakWordCards);
  const reviewCard = useAppStore((s) => s.reviewCard);
  const finishPractice = useAppStore((s) => s.finishPractice);
  const { colors } = useTheme();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<LessonState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [summary, setSummary] = useState<{ xpEarned: number } | null>(null);
  const [saving, setSaving] = useState(false);
  /** Synchronous guard so a rapid double-continue can never persist twice. */
  const persisted = useRef(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const start = (data: SessionData) => {
      if (cancelled) return;
      setSession(data);
      // Infinite hearts = practice never fails and never spends hearts.
      if (data.exercises.length > 0) {
        setState(createLesson(`practice:${mode}`, data.exercises, Infinity));
        const now = Date.now();
        setStartedAt(now);
        shownAt.current = now;
      }
    };
    (async () => {
      try {
        if (mode === 'mistakes') {
          // Fetch more than the session size: ids missing from the content are
          // filtered out, so the session can still fill up to 10.
          const entries = await mistakeEntries(50);
          start({ exercises: buildMistakeSession(course, entries), cards: new Map() });
        } else {
          const cards = await weakWordCards(WEAK_WORDS_LIMIT);
          const { pairs } = buildWordSession(course, cards, getVocab(course.id));
          start({
            exercises: pairs.map((p) => p.exercise),
            cards: new Map(pairs.map((p) => [p.exercise.id, p.card])),
          });
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, course, mistakeEntries, weakWordCards]);

  const exercise = state ? current(state) : undefined;
  useEffect(() => {
    shownAt.current = Date.now();
  }, [exercise?.id]);

  const persist = useCallback(
    (finalState: LessonState, durationMs: number) => {
      const result = toResult(finalState, durationMs);
      const wrongSet = new Set(result.mistakes);
      const correctIds = Object.keys(finalState.exercises).filter((id) => !wrongSet.has(id));
      setSaving(true);
      finishPractice(mode, result.correct, result.total, result.mistakes, correctIds)
        .then(setSummary)
        .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)))
        .finally(() => setSaving(false));
    },
    [mode, finishPractice],
  );

  const onAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!exercise || feedback) return;
      void (isCorrect ? playCorrect() : playWrong());
      setFeedback({ ok: isCorrect, detail: isCorrect ? undefined : correctAnswerText(exercise) });
    },
    [exercise, feedback],
  );

  const onContinue = useCallback(() => {
    if (!state || !exercise || !feedback) return;
    const next = answer(state, exercise.id, feedback.ok);
    setState(next);
    setFeedback(null);
    // words mode: every answered quiz updates its SRS card (same path as the review tab)
    const card = session?.cards.get(exercise.id);
    if (card) void reviewCard(card, feedback.ok, Date.now() - shownAt.current);
    if (isFinished(next) && !persisted.current) {
      persisted.current = true;
      setDurationMs(Date.now() - startedAt);
      void playComplete();
      persist(next, Date.now() - startedAt);
    }
  }, [state, exercise, feedback, session, startedAt, reviewCard, persist]);

  const confirmQuit = () => {
    showAlert('Pratiği bırak?', 'İlerlemen kaydedilmeyecek.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Bırak', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (loadError) {
    return (
      <Screen>
        <View style={styles.center}>
          <Title center>Yüklenemedi</Title>
          <Body center color={colors.textMuted}>{loadError}</Body>
        </View>
        <Button title="Geri dön" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!session) return <Screen edges={['top']} />;

  if (session.exercises.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <Title center>{mode === 'mistakes' ? 'Henüz hata yok — harika!' : 'Henüz zayıf kelime yok — harika!'}</Title>
          <Body center color={colors.textMuted}>
            {mode === 'mistakes'
              ? 'Derslerde yanlış yaptığın alıştırmalar burada birikir; onları buradan pratik edebilirsin.'
              : 'Zorlandığın kelimeleri tekrar ettikçe buradan pratik yapabilirsin.'}
          </Body>
        </View>
        <Button title="Geri dön" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!state) return <Screen edges={['top']} />;

  if (isFinished(state)) {
    const result = toResult(state, durationMs);
    const accuracy = Math.round((result.correct / result.total) * 100);
    return (
      <Screen>
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Title center accessibilityRole="header">Pratik tamamlandı! 🎉</Title>
          <View style={styles.statsRow}>
            <Stat label="XP" value={summary ? `+${summary.xpEarned}` : '…'} color={colors.xpText} />
            <Stat label="Doğruluk" value={`%${accuracy}`} color={colors.primaryText} />
            <Stat label="Süre" value={formatDuration(result.durationMs)} color={colors.secondaryText} />
          </View>
          <Body center color={colors.textMuted}>{result.correct} doğru · {result.mistakes.length} yanlış alıştırma</Body>
        </View>
        <Button title="Devam" onPress={() => router.back()} loading={saving} disabled={saving} />
      </Screen>
    );
  }

  return (
    <Screen padding={0}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pratiği kapat" onPress={confirmQuit} hitSlop={12} style={styles.close}>
          <Heading color={colors.textMuted}>✕</Heading>
        </Pressable>
        <ProgressBar progress={progress(state)} style={styles.progress} accessibilityLabel="Pratik ilerlemesi" />
        <Caption accessibilityLabel={`Alıştırma ${state.completed.length + 1} / ${session.exercises.length}`}>
          {state.completed.length + 1}/{session.exercises.length}
        </Caption>
      </View>
      <View style={styles.body}>
        {exercise ? (
          <ExerciseView key={`${exercise.id}:${state.answered}`} exercise={exercise} targetLang={course.toLang} disabled={feedback !== null} onAnswer={onAnswer} />
        ) : null}
      </View>
      <FeedbackSheet
        result={feedback ? (feedback.ok ? 'correct' : 'wrong') : null}
        title={feedback?.ok ? 'Harika!' : 'Doğru cevap:'}
        detail={feedback?.detail}
        explanation={
          feedback?.ok || !exercise || mode !== 'mistakes'
            ? undefined
            : (getExplanation(exercise.id) ?? genericHint(exercise.type))
        }
        continueLabel="Devam"
        onContinue={onContinue}
      />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { borderColor: color, backgroundColor: colors.surface }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Caption center color={color}>{label}</Caption>
      <Heading center color={color}>{value}</Heading>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
});
