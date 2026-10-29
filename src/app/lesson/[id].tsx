import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getExplanation, genericHint } from '@/content/explanations';
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
  accentHint,
} from '@/domain';
import { ExerciseView } from '@/features/lesson/ExerciseView';
import { ExplainButton } from '@/features/lesson/ExplainButton';
import type { AiExplainRequest } from '@/features/lesson/explainApi';
import { playComplete, playCorrect, playWrong } from '@/features/sound';
import { exerciseVocabMap, formatDuration } from '@/features/lesson/helpers';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, FeedbackSheet, Heading, Hearts, ProgressBar, Screen, Title, showAlert, spacing, useSettingsStore, useTheme } from '@/ui';

type Params = { id: string; mode?: 'practice' };

function findLesson(units: { lessons: Lesson[] }[], id: string): Lesson | undefined {
  for (const u of units) for (const l of u.lessons) if (l.id === id) return l;
  return undefined;
}

/** The expected answer shown in the red feedback sheet. */
/** Accepted only thanks to accent/ß folding → show the proper spelling ("Aksana dikkat: café"). */
function accentNote(e: Exercise, userAnswer?: string): string | undefined {
  if (!userAnswer || (e.type !== 'listen_type' && e.type !== 'translate_build')) return undefined;
  const proper = accentHint(userAnswer, e.answers);
  return proper ? `Aksana dikkat: ${proper}` : undefined;
}

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

/** The exercise prompt as the learner saw it (question or sentence to complete). */
function exercisePromptText(e: Exercise): string | undefined {
  switch (e.type) {
    case 'select_translation':
    case 'translate_build':
      return e.prompt;
    case 'listen_type':
      return e.audioText;
    case 'speak':
    case 'fill_blank':
      return e.sentence;
    case 'match_pairs':
      return undefined;
  }
}

/** "Cevabımı açıkla" request for a wrong answer; null when the exercise carries no text answer. */
function explainRequestFor(courseId: string, e: Exercise, userAnswer: string): AiExplainRequest | null {
  const prompt = exercisePromptText(e);
  const correctAnswer = correctAnswerText(e);
  if (!prompt || !correctAnswer) return null;
  return { courseId, exerciseType: e.type, prompt, userAnswer, correctAnswer };
}

export default function LessonScreen() {
  const { id, mode } = useLocalSearchParams<Params>();
  const practice = mode === 'practice';
  const relaxed = useSettingsStore((s) => s.relaxedHearts);
  // `router.replace` to the same route only updates params; keying on them forces a
  // fresh lesson state (e.g. "Pratik yap" after running out of hearts, or Rahat mod
  // being enabled from the OutOfHearts screen).
  return <LessonRunner key={`${id}:${practice ? 'practice' : 'normal'}:${relaxed ? 'relaxed' : 'strict'}`} id={id} practice={practice} />;
}

function LessonRunner({ id, practice }: { id: string; practice: boolean }) {
  const course = useAppStore((s) => s.course);
  const stats = useAppStore((s) => s.stats);
  const saveStats = useAppStore((s) => s.saveStats);
  const finishLesson = useAppStore((s) => s.finishLesson);
  const relaxed = useSettingsStore((s) => s.relaxedHearts);
  const { colors } = useTheme();

  const lesson = useMemo(() => findLesson(course.units, id), [course, id]);
  const [startedAt] = useState(() => Date.now());
  // Rahat mod runs the lesson with Infinity hearts: mistakes cost nothing, the lesson
  // still counts as completed and unlocks the next one (unlike practice mode).
  const hearts = relaxed || practice ? Infinity : regenerate(stats, startedAt).hearts;
  const [state, setState] = useState<LessonState | null>(() =>
    lesson ? createLesson(lesson.id, lesson.exercises, hearts) : null,
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; detail?: string; userAnswer?: string } | null>(null);
  const [summary, setSummary] = useState<{ xpEarned: number; dailyGoalJustReached: boolean } | null>(null);
  const [finished, setFinished] = useState<{ durationMs: number; saving: boolean } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const exercise = state ? current(state) : undefined;
  const explainRequest =
    feedback && !feedback.ok && exercise && feedback.userAnswer
      ? explainRequestFor(course.id, exercise, feedback.userAnswer)
      : null;

  const onAnswer = useCallback(
    (isCorrect: boolean, userAnswer?: string) => {
      if (!exercise || feedback) return;
      void (isCorrect ? playCorrect() : playWrong());
      if (!isCorrect && !practice && !relaxed) void saveStats(loseHeart(regenerate(stats, Date.now()), Date.now()));
      setFeedback({ ok: isCorrect, detail: isCorrect ? accentNote(exercise, userAnswer) : correctAnswerText(exercise), userAnswer });
    },
    [exercise, feedback, practice, relaxed, saveStats, stats],
  );

  const persist = useCallback(
    (finalState: LessonState, durationMs: number) => {
      if (!lesson) return;
      setFinished({ durationMs, saving: true });
      setSaveError(null);
      finishLesson(toResult(finalState, durationMs, exerciseVocabMap(lesson)))
        .then(setSummary)
        .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : String(e)))
        .finally(() => setFinished({ durationMs, saving: false }));
    },
    [lesson, finishLesson],
  );

  const onContinue = useCallback(() => {
    if (!state || !exercise || !feedback || !lesson) return;
    const next = answer(state, exercise.id, feedback.ok);
    setState(next);
    setFeedback(null);
    // Persist the result once the queue is empty (and the lesson was not failed).
    if (isFinished(next) && !next.failed && !finished) {
      const durationMs = Date.now() - startedAt;
      void playComplete();
      persist(next, durationMs);
    }
  }, [state, exercise, feedback, lesson, finished, startedAt, persist]);

  const confirmQuit = () => {
    showAlert('Dersi bırak?', 'İlerlemen kaydedilmeyecek.', [
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

  if (!practice && !relaxed && state.answered === 0 && !canStartLesson(stats, startedAt)) {
    return <OutOfHearts lessonId={lesson.id} />;
  }

  if (state.failed) return <OutOfHearts lessonId={lesson.id} />;

  if (isFinished(state)) {
    const result = toResult(state, finished?.durationMs ?? 0);
    const accuracy = Math.round((result.correct / result.total) * 100);
    return (
      <Screen>
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Title center accessibilityRole="header">{summary?.dailyGoalJustReached ? 'Günlük hedef tamam! 🎉' : 'Ders tamamlandı! 🎉'}</Title>
          <View style={styles.statsRow}>
            <Stat label="XP" value={summary ? `+${summary.xpEarned}` : '…'} color={colors.xpText} />
            <Stat label="Doğruluk" value={`%${accuracy}`} color={colors.primaryText} />
            <Stat label="Süre" value={formatDuration(result.durationMs)} color={colors.secondaryText} />
          </View>
        </View>
        {saveError ? (
          <View style={styles.actions}>
            <Caption center color={colors.dangerText} accessibilityRole="alert">Kaydedilemedi: {saveError}</Caption>
            <Button title="Tekrar dene" onPress={() => persist(state, finished?.durationMs ?? 0)} />
            <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
          </View>
        ) : (
          <Button title="Devam" onPress={() => router.replace('/')} loading={finished?.saving ?? false} disabled={finished?.saving ?? false} />
        )}
      </Screen>
    );
  }

  return (
    <Screen padding={0}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dersi kapat" onPress={confirmQuit} hitSlop={12} style={styles.close}>
          <Heading color={colors.textMuted}>✕</Heading>
        </Pressable>
        <ProgressBar progress={progress(state)} style={styles.progress} accessibilityLabel="Ders ilerlemesi" />
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
        explanation={
          feedback?.ok || !exercise ? undefined : (getExplanation(exercise.id) ?? genericHint(exercise.type))
        }
        extra={explainRequest ? <ExplainButton {...explainRequest} /> : undefined}
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

function OutOfHearts({ lessonId }: { lessonId: string }) {
  const stats = useAppStore((s) => s.stats);
  const setRelaxedHearts = useSettingsStore((s) => s.setRelaxedHearts);
  const { colors } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const wait = msUntilNextHeart(stats, now);
  return (
    <Screen>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Title center accessibilityRole="header">Kalplerin bitti 💔</Title>
        <Body center>Yeni bir kalp için {formatDuration(wait)} bekle ya da kalp kaybetmeden pratik yap.</Body>
        <Caption center color={colors.textMuted}>
          Rahat modda yanlış cevaplarda kalp gitmez; tüm dersleri sırayla, beklemeden geçebilirsin.
        </Caption>
      </View>
      <View style={styles.actions}>
        <Button
          title="Rahat modu aç ve devam et"
          onPress={() => {
            void setRelaxedHearts(true);
            // Same lesson, normal mode (no 'practice' param): it counts as completed.
            router.replace({ pathname: '/lesson/[id]', params: { id: lessonId } });
          }}
        />
        <Button title="Pratik yap" variant="secondary" onPress={() => router.replace({ pathname: '/lesson/[id]', params: { id: lessonId, mode: 'practice' } })} />
        <Button title="Ana sayfa" variant="outline" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  actions: { gap: spacing.md },
});
