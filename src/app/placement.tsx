import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getExplanation, genericHint } from '@/content/explanations';
import {
  answer,
  createLesson,
  current,
  isFinished,
  toResult,
  type Exercise,
  type LessonResult,
  type LessonState,
  type Unit,
  accentHint,
} from '@/domain';
import { ExerciseView } from '@/features/lesson/ExerciseView';
import { correctAnswerText } from '@/features/lesson/helpers';
import {
  PLACEMENT_MAX_QUESTIONS,
  PLACEMENT_QUESTIONS_PER_UNIT,
  ablativeSuffix,
  createPlacement,
  finishPlacement,
  placementQuestions,
  recordPlacementUnitResult,
  skipEmptyPlacementUnit,
} from '@/features/placement/placement';
import { playComplete, playCorrect, playWrong } from '@/features/sound';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, FeedbackSheet, ProgressBar, Screen, Title, spacing, useTheme } from '@/ui';

/** Accepted only thanks to accent/ß folding → show the proper spelling ("Aksana dikkat: café"). */
function accentNote(e: Exercise, userAnswer?: string): string | undefined {
  if (!userAnswer || (e.type !== 'listen_type' && e.type !== 'translate_build')) return undefined;
  const proper = accentHint(userAnswer, e.answers);
  return proper ? `Aksana dikkat: ${proper}` : undefined;
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'done' } | { kind: 'error'; message: string };

export default function PlacementScreen() {
  const course = useAppStore((s) => s.course);
  const completeUnitsByPlacement = useAppStore((s) => s.completeUnitsByPlacement);
  const { colors } = useTheme();
  const [placement, setPlacement] = useState(createPlacement);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [retryTick, setRetryTick] = useState(0);
  const saveStarted = useRef(false);
  const passedRef = useRef(placement.passed);
  useEffect(() => {
    passedRef.current = placement.passed;
  });

  const exhausted = course.units.length === 0 || placement.unitIndex >= course.units.length;
  const finished = placement.done || exhausted;

  useEffect(() => {
    if (!finished || saveStarted.current) return;
    saveStarted.current = true;
    const ids = passedRef.current.map((p) => p.unitId);
    if (ids.length === 0) {
      setSave({ kind: 'done' });
      return;
    }
    setSave({ kind: 'saving' });
    completeUnitsByPlacement(ids)
      .then(() => setSave({ kind: 'done' }))
      .catch((e: unknown) =>
        setSave({ kind: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
  }, [finished, completeUnitsByPlacement, retryTick]);

  const onUnitDone = useCallback((unitId: string, result: LessonResult) => {
    setPlacement((p) => recordPlacementUnitResult(p, unitId, result.correct, result.total));
  }, []);
  const onEmptyUnit = useCallback(() => setPlacement((p) => skipEmptyPlacementUnit(p)), []);
  const onFinish = useCallback(() => setPlacement((p) => finishPlacement(p)), []);

  if (!finished) {
    const unit = course.units[placement.unitIndex]!;
    return (
      <PlacementUnitSession
        key={unit.id}
        unit={unit}
        unitNo={placement.unitIndex + 1}
        passedCount={placement.passed.length}
        onUnitDone={onUnitDone}
        onEmptyUnit={onEmptyUnit}
        onFinish={onFinish}
      />
    );
  }

  if (save.kind === 'saving' || save.kind === 'idle') {
    return (
      <Screen>
        <View style={styles.center} accessibilityLabel="Yükleniyor">
          <Body color={colors.textMuted}>Sonuç kaydediliyor…</Body>
        </View>
      </Screen>
    );
  }
  if (save.kind === 'error') {
    return (
      <Screen>
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Title center accessibilityRole="alert">Kaydedilemedi</Title>
          <Body center color={colors.dangerText}>{save.message}</Body>
        </View>
        <View style={styles.actions}>
          <Button
            title="Tekrar dene"
            onPress={() => {
              saveStarted.current = false;
              setRetryTick((t) => t + 1);
            }}
          />
          <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const passedUnits = placement.passed
    .map((p) => course.units.find((u) => u.id === p.unitId))
    .filter((u): u is Unit => u !== undefined);
  return (
    <Screen>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Title center accessibilityRole="header">Ünite {passedUnits.length + 1}{ablativeSuffix(passedUnits.length + 1)} başlıyorsun</Title>
        {passedUnits.length > 0 ? (
          <View style={styles.passedList}>
            <Caption center color={colors.textMuted}>Geçtiğin üniteler tamamlandı sayıldı:</Caption>
            {passedUnits.map((u) => (
              <Caption key={u.id} center color={colors.primaryText}>✓ {u.title}</Caption>
            ))}
          </View>
        ) : (
          <Caption center color={colors.textMuted}>Hiç ünite geçilemedi; ilk üniteden başlayacaksın.</Caption>
        )}
        <Caption center color={colors.textMuted}>Seviye tespiti XP kazandırmaz.</Caption>
      </View>
      <Button title="Başla" onPress={() => router.replace('/')} />
    </Screen>
  );
}

function PlacementUnitSession({
  unit,
  unitNo,
  passedCount,
  onUnitDone,
  onEmptyUnit,
  onFinish,
}: {
  unit: Unit;
  unitNo: number;
  passedCount: number;
  onUnitDone: (unitId: string, result: LessonResult) => void;
  onEmptyUnit: () => void;
  onFinish: () => void;
}) {
  const course = useAppStore((s) => s.course);
  const { colors } = useTheme();
  const [startedAt] = useState(() => Date.now());
  const exercises = useMemo(() => placementQuestions(unit, 0), [unit]);
  // Infinity hearts: an exam never consumes hearts and cannot fail mid-run.
  const [state, setState] = useState<LessonState | null>(() =>
    exercises.length ? createLesson(`${unit.id}:placement`, exercises, Infinity) : null,
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; detail?: string } | null>(null);

  useEffect(() => {
    if (exercises.length === 0) onEmptyUnit();
  }, [exercises.length, onEmptyUnit]);

  const total = exercises.length;
  const exercise = state ? current(state) : undefined;
  const overallProgress = Math.min(
    1,
    (passedCount * PLACEMENT_QUESTIONS_PER_UNIT + (state?.completed.length ?? 0)) / PLACEMENT_MAX_QUESTIONS,
  );

  const onAnswer = useCallback(
    (isCorrect: boolean, userAnswer?: string) => {
      if (!exercise || feedback) return;
      void (isCorrect ? playCorrect() : playWrong());
      // No hearts are lost in an exam (and no XP for wrong answers — none is awarded per answer at all).
      setFeedback({ ok: isCorrect, detail: isCorrect ? accentNote(exercise, userAnswer) : correctAnswerText(exercise) });
    },
    [exercise, feedback],
  );

  const onContinue = useCallback(() => {
    if (!state || !exercise || !feedback) return;
    // Placement asks each question once: a wrong answer is final, never re-queued.
    const next = answer(state, exercise.id, feedback.ok, { requeue: false });
    setState(next);
    setFeedback(null);
    if (isFinished(next)) {
      void playComplete();
      onUnitDone(unit.id, toResult(next, Date.now() - startedAt));
    }
  }, [state, exercise, feedback, unit.id, startedAt, onUnitDone]);

  if (!state) {
    return (
      <Screen>
        <View style={styles.center} accessibilityLabel="Yükleniyor">
          <Body color={colors.textMuted}>Sınav hazırlanıyor…</Body>
        </View>
      </Screen>
    );
  }

  const questionNo = Math.min(total, state.answered + 1);
  return (
    <Screen padding={0}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sınavı bitir" onPress={onFinish} hitSlop={12} style={styles.finish}>
          <Caption color={colors.textMuted}>Bitir</Caption>
        </Pressable>
        <View style={styles.examMeta} accessible accessibilityRole="header" accessibilityLabel={`SEVİYE TESPİTİ. Ünite ${unitNo}. Soru ${questionNo} / ${total}`}>
          <Caption center color={colors.primaryText}>SEVİYE TESPİTİ</Caption>
          <Caption center color={colors.textMuted}>Ünite {unitNo} · Soru {questionNo} / {total}</Caption>
        </View>
        <ProgressBar progress={overallProgress} style={styles.progress} accessibilityLabel="Sınav ilerlemesi" />
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

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  finish: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  examMeta: { alignItems: 'center' },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  passedList: { gap: spacing.xs, alignItems: 'center' },
  actions: { gap: spacing.md },
});
