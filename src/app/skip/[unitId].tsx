import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getExplanation, genericHint } from '@/content/explanations';
import {
  answer,
  createLesson,
  current,
  isFinished,
  progress as lessonProgress,
  toResult,
  type Exercise,
  type LessonState,
  type Unit,
} from '@/domain';
import { ExerciseView } from '@/features/lesson/ExerciseView';
import { playComplete, playCorrect, playWrong } from '@/features/sound';
import { buildSkipTest } from '@/features/skipTest';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, FeedbackSheet, Heading, ProgressBar, Screen, Title, showAlert, spacing, useTheme } from '@/ui';

type Params = { unitId: string };

/** The expected answer shown in the red feedback sheet (same mapping as the lesson screen). */
function correctAnswerText(e: Exercise): string | undefined {
  switch (e.type) {
    case 'select_translation':
    case 'fill_blank':
      return e.options[e.correctIndex];
    case 'translate_build':
    case 'listen_type':
      return e.answers[0];
    case 'speak':
      return e.sentence;
    case 'match_pairs':
      return undefined;
  }
}

export default function SkipTestScreen() {
  const { unitId } = useLocalSearchParams<Params>();
  return <SkipRunner key={String(unitId)} unitId={String(unitId)} />;
}

function SkipRunner({ unitId }: { unitId: string }) {
  const course = useAppStore((s) => s.course);
  const skipAttempts = useAppStore((s) => s.skipAttempts);
  const { colors } = useTheme();
  const unit = useMemo(() => course.units.find((u) => u.id === unitId), [course, unitId]);
  // null = still counting previous attempts; the count seeds the question shuffle.
  const [attempt, setAttempt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (unit) void skipAttempts(unit.id).then((n) => { if (alive) setAttempt(n); });
    return () => {
      alive = false;
    };
  }, [unit, skipAttempts]);

  if (!unit) {
    return (
      <Screen>
        <Title>Ünite bulunamadı</Title>
        <Button title="Geri" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (attempt === null) {
    return (
      <Screen>
        <View style={styles.center} accessibilityLabel="Yükleniyor">
          <Body color={colors.textMuted}>Sınav hazırlanıyor…</Body>
        </View>
      </Screen>
    );
  }
  return <SkipSession key={`${unit.id}:${attempt}`} unit={unit} attempt={attempt} onRetry={() => setAttempt(attempt + 1)} />;
}

function SkipSession({ unit, attempt, onRetry }: { unit: Unit; attempt: number; onRetry: () => void }) {
  const finishSkipTest = useAppStore((s) => s.finishSkipTest);
  const course = useAppStore((s) => s.course);
  const { colors } = useTheme();
  const [startedAt] = useState(() => Date.now());
  const exercises = useMemo(() => buildSkipTest(unit, attempt), [unit, attempt]);
  // Infinity hearts: an exam never consumes hearts and cannot fail mid-run.
  const [state, setState] = useState<LessonState | null>(() =>
    exercises.length ? createLesson(`${unit.id}:skip`, exercises, Infinity) : null,
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [finishedMs, setFinishedMs] = useState(0);
  const [outcome, setOutcome] = useState<{ passed: boolean; xpEarned: number; saving: boolean } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const quitHandled = useRef(false);

  const total = exercises.length;
  const exercise = state ? current(state) : undefined;

  const onAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!exercise || feedback || outcome) return;
      void (isCorrect ? playCorrect() : playWrong());
      // No hearts are lost in an exam (and no XP for wrong answers — none is awarded per answer at all).
      setFeedback({ ok: isCorrect, detail: isCorrect ? undefined : correctAnswerText(exercise) });
    },
    [exercise, feedback, outcome],
  );

  const saveResult = useCallback(
    (correct: number, totalCount: number) => {
      setOutcome({ passed: false, xpEarned: 0, saving: true });
      setSaveError(null);
      return finishSkipTest(unit.id, correct, totalCount)
        .then((o) => setOutcome({ ...o, saving: false }))
        .catch((e: unknown) => {
          setOutcome(null);
          setSaveError(e instanceof Error ? e.message : String(e));
        });
    },
    [finishSkipTest, unit.id],
  );

  const onContinue = useCallback(() => {
    if (!state || !exercise || !feedback) return;
    const next = answer(state, exercise.id, feedback.ok);
    setState(next);
    setFeedback(null);
    if (isFinished(next) && !outcome) {
      const durationMs = Date.now() - startedAt;
      setFinishedMs(durationMs);
      const result = toResult(next, durationMs);
      void playComplete();
      void saveResult(result.correct, result.total);
    }
  }, [state, exercise, feedback, outcome, startedAt, saveResult]);

  const confirmQuit = useCallback(() => {
    showAlert('Sınavı bırak?', 'Bu deneme sayılacak; ilerlemen değişmeyecek.', [
      { text: 'Devam et', style: 'cancel' },
      {
        text: 'Bırak',
        style: 'destructive',
        onPress: () => {
          if (quitHandled.current) return;
          quitHandled.current = true;
          // The aborted attempt counts toward the unit's attempt total (and the
          // next exam's question seed) but never changes progress and can never
          // pass — a quit always fails, even at 10/12 answered correctly.
          void finishSkipTest(unit.id, state?.correctAnswers ?? 0, total, { quit: true }).finally(() => router.back());
        },
      },
    ]);
  }, [finishSkipTest, state, total, unit.id]);

  if (!state) {
    return (
      <Screen>
        <Title>Bu ünitede sınava uygun soru yok</Title>
        <Button title="Ana sayfa" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (isFinished(state)) {
    const result = toResult(state, finishedMs);
    const accuracy = Math.round((result.correct / result.total) * 100);
    if (saveError) {
      return (
        <Screen>
          <View style={styles.center} accessibilityLiveRegion="polite">
            <Title center accessibilityRole="alert">Kaydedilemedi</Title>
            <Body center color={colors.dangerText}>{saveError}</Body>
          </View>
          <View style={styles.actions}>
            <Button title="Tekrar dene" onPress={() => void saveResult(result.correct, result.total)} />
            <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
          </View>
        </Screen>
      );
    }
    if (!outcome || outcome.saving) {
      return (
        <Screen>
          <View style={styles.center} accessibilityLabel="Yükleniyor">
            <Body color={colors.textMuted}>Sonuç kaydediliyor…</Body>
          </View>
        </Screen>
      );
    }
    if (outcome.passed) {
      return (
        <Screen>
          <View style={styles.center} accessibilityLiveRegion="polite">
            <Title center accessibilityRole="header">Ünite atlandı! 🎉</Title>
            <View style={styles.statsRow}>
              <Stat label="XP" value={`+${outcome.xpEarned}`} color={colors.xpText} />
              <Stat label="Doğruluk" value={`%${accuracy}`} color={colors.primaryText} />
            </View>
            <Caption center color={colors.textMuted}>
              {unit.title} ünitesinin dersleri tamamlanmış sayıldı.
            </Caption>
          </View>
          <Button title="Devam" onPress={() => router.replace('/')} />
        </Screen>
      );
    }
    return (
      <Screen>
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Title center accessibilityRole="header">Geçmek için en az %80 gerekiyor</Title>
          <View style={styles.statsRow}>
            <Stat label="Doğruluk" value={`%${accuracy}`} color={colors.dangerText} />
            <Stat label="Eşik" value="%80" color={colors.textMuted} />
          </View>
          <Caption center color={colors.textMuted}>İstersen ünitenin derslerini sırayla da tamamlayabilirsin.</Caption>
        </View>
        <View style={styles.actions}>
          <Button title="Tekrar dene" onPress={onRetry} />
          <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const questionNo = Math.min(total, state.completed.length + 1);
  return (
    <Screen padding={0}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sınavı kapat" onPress={confirmQuit} hitSlop={12} style={styles.close}>
          <Heading color={colors.textMuted}>✕</Heading>
        </Pressable>
        <View style={styles.examMeta} accessible accessibilityRole="header" accessibilityLabel={`SINAV. Soru ${questionNo} / ${total}`}>
          <Caption center color={colors.primaryText}>SINAV</Caption>
          <Caption center color={colors.textMuted}>Soru {questionNo} / {total}</Caption>
        </View>
        <ProgressBar progress={lessonProgress(state)} style={styles.progress} accessibilityLabel="Sınav ilerlemesi" />
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
          feedback?.ok || !exercise ? undefined : (getExplanation(exercise.id) ?? genericHint(exercise.type))
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
  examMeta: { alignItems: 'center' },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  actions: { gap: spacing.md },
});
