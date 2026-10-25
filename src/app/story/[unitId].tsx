import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { courses } from '@/content';
import { getUnitStory } from '@/content/stories';
import type { LangCode } from '@/domain';
import { SpeakerButton } from '@/features/lesson/exercises/Prompt';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, ChoiceCard, FeedbackSheet, Heading, Screen, Title, spacing, upperTr, useTheme } from '@/ui';

type Params = { unitId: string };
type Phase = 'reading' | 'questions' | 'summary';

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
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ xpEarned: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!story) {
    return (
      <Screen>
        <Title>Hikâye bulunamadı</Title>
        <Button title="Geri" onPress={() => router.back()} />
      </Screen>
    );
  }

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
        <Button
          title={allRevealed ? 'Sorulara geç' : 'Devam'}
          onPress={() => (allRevealed ? setPhase('questions') : setVisibleLines((n) => n + 1))}
        />
      </Screen>
    );
  }

  if (phase === 'questions') {
    const question = story.questions[qIndex]!;
    const check = () => {
      if (selected === null || feedback) return;
      const ok = selected === question.correctIndex;
      if (ok) setCorrectCount((c) => c + 1);
      setFeedback({ ok });
    };
    const advance = () => {
      setFeedback(null);
      setSelected(null);
      if (qIndex + 1 >= story.questions.length) {
        setFinishing(true);
        finishStory(`${unitId}.story`, correctCount, story.questions.length)
          .then((out) => {
            setSummary(out);
            setPhase('summary');
          })
          .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : String(e)))
          .finally(() => setFinishing(false));
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
        <Button title="Kontrol et" disabled={selected === null || !!feedback} onPress={check} />
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

  return (
    <Screen>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Title center accessibilityRole="header">Hikâye tamamlandı! 🎉</Title>
        <View style={styles.statsRow}>
          <Stat label="Doğru" value={`${correctCount}/${story.questions.length}`} color={colors.primaryText} />
          <Stat label="XP" value={summary ? `+${summary.xpEarned}` : '…'} color={colors.xpText} />
        </View>
      </View>
      {saveError ? (
        <View style={styles.actions}>
          <Caption center color={colors.dangerText} accessibilityRole="alert">
            Kaydedilemedi: {saveError}
          </Caption>
          <Button title="Ana sayfa" variant="outline" onPress={() => router.back()} />
        </View>
      ) : (
        <Button title="Bitir" onPress={() => router.back()} loading={finishing} disabled={finishing} />
      )}
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
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
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
