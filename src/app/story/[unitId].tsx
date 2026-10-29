import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { backOrHome } from '@/features/nav/backOrHome';
import { courses } from '@/content';
import { getUnitStory } from '@/content/stories';
import type { LangCode } from '@/domain';
import { SpeakerButton } from '@/features/lesson/exercises/Prompt';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, ChoiceCard, FeedbackSheet, Heading, Screen, Title, spacing, upperTr, useTheme } from '@/ui';

type Params = { unitId: string };
type Phase = 'reading' | 'questions' | 'saving' | 'summary';

/**
 * End-of-unit story (roadmap item 2), opened as a modal from the learning path.
 * Lines are revealed one by one (each speakable in the course's target language,
 * with an optional Turkish translation), followed by 3–4 comprehension questions.
 * No hearts are involved; finishing awards XP via the store's finishStory.
 */
export default function StoryScreen() {
  const { unitId } = useLocalSearchParams<Params>();
  const story = getUnitStory(unitId);
  // The unit id is owned by exactly one bundled course; its toLang drives line TTS.
  const course = courses.find((c) => c.units.some((u) => u.id === unitId));
  const lang: LangCode = course?.toLang ?? 'en';
  const finishStory = useAppStore((s) => s.finishStory);
  const { colors } = useTheme();

  const [visibleLines, setVisibleLines] = useState(1);
  const [showTr, setShowTr] = useState(false);
  const [phase, setPhase] = useState<Phase>('reading');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState<{ xpEarned: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  // Guards against double finish: finishStory is called at most once per visit
  // (a failed save may be retried explicitly via "Tekrar dene").
  const finishStartedRef = useRef(false);

  if (!story) {
    return (
      <Screen>
        <Title>Hikâye bulunamadı</Title>
        <Button title="Geri" onPress={backOrHome} />
      </Screen>
    );
  }

  const startFinish = () => {
    if (finishStartedRef.current) return;
    finishStartedRef.current = true;
    setFinishing(true);
    setSaveError(null);
    // Non-interactive saving state BEFORE awaiting finishStory.
    setPhase('saving');
    finishStory(`${unitId}.story`, correctCount, story.questions.length)
      .then((out) => {
        setSummary(out);
        setPhase('summary');
      })
      .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : String(e)));
  };

  if (phase === 'reading') {
    const lines = story.lines.slice(0, visibleLines);
    const allRevealed = visibleLines >= story.lines.length;
    return (
      <Screen padding={0}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Caption color={colors.primaryText}>{upperTr('Hikâye')}</Caption>
            <Title accessibilityRole="header">{story.title}</Title>
            <Body color={colors.textMuted}>{story.setting}</Body>
          </View>
          <View style={styles.lines}>
            {lines.map((line, i) => (
              <View key={`${i}-${line.speaker}`} style={styles.line}>
                <Caption color={colors.primaryText}>{upperTr(line.speaker)}</Caption>
                <View style={styles.lineRow}>
                  <SpeakerButton text={line.text} lang={lang} />
                  <View style={styles.lineText}>
                    <Body>{line.text}</Body>
                    {showTr ? <Body color={colors.textMuted}>{line.tr}</Body> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showTr ? 'Çeviriyi gizle' : 'Çeviri'}
            onPress={() => setShowTr((v) => !v)}
            style={({ pressed }) => [styles.trToggle, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Body color={colors.primaryText}>{showTr ? 'Çeviriyi gizle' : 'Çeviri'}</Body>
          </Pressable>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={allRevealed ? (story.questions.length > 0 ? 'Sorulara geç' : 'Bitir') : 'Devam'}
            onPress={() => (allRevealed ? (story.questions.length > 0 ? setPhase('questions') : startFinish()) : setVisibleLines((n) => n + 1))}
          />
        </View>
      </Screen>
    );
  }

  if (phase === 'questions') {
    const question = story.questions[qIndex]!;
    const check = () => {
      if (selected === null || feedback || finishStartedRef.current) return;
      const ok = selected === question.correctIndex;
      if (ok) setCorrectCount((c) => c + 1);
      setFeedback({ ok });
    };
    const advance = () => {
      if (finishStartedRef.current) return; // saving already started: no double finish
      setFeedback(null);
      setSelected(null);
      if (qIndex + 1 >= story.questions.length) {
        startFinish();
      } else {
        setQIndex((i) => i + 1);
      }
    };
    return (
      <Screen padding={0}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Caption color={colors.primaryText}>{upperTr(`Soru ${qIndex + 1}/${story.questions.length}`)}</Caption>
            <Heading accessibilityRole="header">{question.prompt}</Heading>
          </View>
          <View style={styles.options}>
            {question.options.map((option, i) => {
              const state = feedback
                ? i === question.correctIndex
                  ? 'correct'
                  : i === selected
                    ? 'wrong'
                    : 'idle'
                : i === selected
                  ? 'selected'
                  : 'idle';
              return (
                <ChoiceCard
                  key={option}
                  label={option}
                  index={i + 1}
                  state={state}
                  disabled={!!feedback}
                  onPress={() => setSelected(i)}
                />
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button title="Kontrol et" disabled={selected === null || !!feedback || finishing} onPress={check} />
        </View>
        <FeedbackSheet
          result={feedback ? (feedback.ok ? 'correct' : 'wrong') : null}
          title={feedback?.ok ? 'Harika!' : 'Doğru cevap:'}
          detail={feedback && !feedback.ok ? question.options[question.correctIndex] : undefined}
          explanation={question.explanation}
          continueLabel="Devam"
          onContinue={advance}
        />
      </Screen>
    );
  }

  if (phase === 'saving') {
    // Non-interactive: either the error state (retry / go home) or a wait spinner.
    if (saveError) {
      return (
        <Screen>
          <View style={styles.center}>
            <Title center accessibilityRole="header">Kaydedilemedi</Title>
            <Caption center color={colors.dangerText} accessibilityRole="alert">
              Kaydedilemedi: {saveError}
            </Caption>
          </View>
          <View style={styles.actions}>
            <Button
              title="Tekrar dene"
              onPress={() => {
                finishStartedRef.current = false;
                startFinish();
              }}
            />
            <Button title="Ana sayfa" variant="outline" onPress={backOrHome} />
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Title center accessibilityRole="header">Sonuçlar kaydediliyor…</Title>
          <Body center color={colors.textMuted}>Biraz bekle, hemen bitiyor.</Body>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Title center accessibilityRole="header">Hikâye tamamlandı! 🎉</Title>
        <View style={styles.statsRow}>
          <Stat label="Doğru" value={`${correctCount}/${story.questions.length}`} color={colors.primaryText} />
          <Stat label="XP" value={summary ? `+${summary.xpEarned}` : '…'} color={colors.xpText} />
        </View>
      </View>
      <Button title="Bitir" onPress={backOrHome} />
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  header: { gap: spacing.sm },
  lines: { gap: spacing.lg },
  line: { gap: spacing.xs },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lineText: { flex: 1, gap: 2 },
  trToggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  options: { gap: spacing.sm },
  center: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  actions: { gap: spacing.md },
});
