import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  answer,
  canStartLesson,
  createLesson,
  current,
  isFinished,
  loseHeart,
  msUntilNextHeart,
  progress,
  regenerate,
  toResult,
  type Exercise,
  type Lesson,
  type LessonState,
} from '@/domain';
import { ExerciseView } from '@/features/lesson/ExerciseView';
import { exerciseVocabMap, formatDuration } from '@/features/lesson/helpers';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, FeedbackSheet, Heading, Hearts, ProgressBar, Screen, Title, colors, spacing } from '@/ui';

type Params = { id: string; mode?: 'practice' };

function findLesson(units: { lessons: Lesson[] }[], id: string): Lesson | undefined {
  for (const u of units) for (const l of u.lessons) if (l.id === id) return l;
  return undefined;
}

/** The expected answer shown in the red feedback sheet. */
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

export default function LessonScreen() {
  const { id, mode } = useLocalSearchParams<Params>();
  const practice = mode === 'practice';
  const course = useAppStore((s) => s.course);
  const stats = useAppStore((s) => s.stats);
  const saveStats = useAppStore((s) => s.saveStats);
  const finishLesson = useAppStore((s) => s.finishLesson);

  const lesson = useMemo(() => findLesson(course.units, id), [course, id]);
  const startedAt = useRef(Date.now());
  const [state, setState] = useState<LessonState | null>(() =>
    lesson ? createLesson(lesson.id, lesson.exercises, practice ? Infinity : regenerate(stats, Date.now()).hearts) : null,
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [summary, setSummary] = useState<{ xpEarned: number; dailyGoalJustReached: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const exercise = state ? current(state) : undefined;

  const onAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!exercise || feedback) return;
      if (!isCorrect && !practice) void saveStats(loseHeart(regenerate(stats, Date.now()), Date.now()));
      setFeedback({ ok: isCorrect, detail: isCorrect ? undefined : correctAnswerText(exercise) });
    },
    [exercise, feedback, practice, saveStats, stats],
  );

  const onContinue = useCallback(() => {
    if (!state || !exercise || !feedback) return;
    setState(answer(state, exercise.id, feedback.ok));
    setFeedback(null);
  }, [state, exercise, feedback]);

  // Persist the result once the queue is empty (and the lesson was not failed).
  useEffect(() => {
    if (!state || !lesson || !isFinished(state) || state.failed || summary || saving) return;
    setSaving(true);
    const result = toResult(state, Date.now() - startedAt.current, exerciseVocabMap(lesson));
    finishLesson(result)
      .then(setSummary)
      .catch((e: unknown) => Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : String(e)))
      .finally(() => setSaving(false));
  }, [state, lesson, summary, saving, finishLesson]);

  const confirmQuit = () => {
    Alert.alert('Dersi bırak?', 'İlerlemen kaydedilmeyecek.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Bırak', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (!lesson || !state) {
    return (
      <Screen>
        <Title>Ders bulunamadı</Title>
        <Button title="Geri" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!practice && state.answered === 0 && !canStartLesson(stats, Date.now())) {
    return <OutOfHearts lessonId={lesson.id} />;
  }

  if (state.failed) return <OutOfHearts lessonId={lesson.id} />;

  if (isFinished(state)) {
    const result = toResult(state, Date.now() - startedAt.current);
    const accuracy = Math.round((result.correct / result.total) * 100);
    return (
      <Screen>
        <View style={styles.center}>
          <Title center>{summary?.dailyGoalJustReached ? 'Günlük hedef tamam! 🎉' : 'Ders tamamlandı! 🎉'}</Title>
          <View style={styles.statsRow}>
            <Stat label="XP" value={summary ? `+${summary.xpEarned}` : '…'} color={colors.warning} />
            <Stat label="Doğruluk" value={`%${accuracy}`} color={colors.primary} />
            <Stat label="Süre" value={formatDuration(result.durationMs)} color={colors.secondary} />
          </View>
        </View>
        <Button title="Devam" onPress={() => router.replace('/')} loading={saving} disabled={!summary} />
      </Screen>
    );
  }

  return (
    <Screen padding={0}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dersi kapat" onPress={confirmQuit} hitSlop={12} style={styles.close}>
          <Heading color={colors.textMuted}>✕</Heading>
        </Pressable>
        <ProgressBar progress={progress(state)} style={styles.progress} />
        <Hearts hearts={state.hearts} />
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
        continueLabel="Devam"
        onContinue={onContinue}
      />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Caption center color={color}>{label}</Caption>
      <Heading center color={color}>{value}</Heading>
    </View>
  );
}

function OutOfHearts({ lessonId }: { lessonId: string }) {
  const stats = useAppStore((s) => s.stats);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const wait = msUntilNextHeart(stats, now);
  return (
    <Screen>
      <View style={styles.center}>
        <Title center>Kalplerin bitti 💔</Title>
        <Body center>Yeni bir kalp için {formatDuration(wait)} bekle ya da kalp kaybetmeden pratik yap.</Body>
      </View>
      <View style={styles.actions}>
        <Button title="Pratik yap" onPress={() => router.replace({ pathname: '/lesson/[id]', params: { id: lessonId, mode: 'practice' } })} />
        <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 2, borderRadius: 16, padding: spacing.md, gap: spacing.xs },
  actions: { gap: spacing.md },
});
