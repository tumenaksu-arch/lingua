import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CompleteChatExercise, LangCode } from '@/domain';
import { speak } from '@/speech';
import { Body, ChoiceCard, Heading, spacing, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import type { ExerciseProps } from './types';

/** Chat bubble; tapping any line speaks it in the target language. */
function Bubble({
  text,
  mine,
  speakLang,
  state,
}: {
  text: string;
  mine: boolean;
  speakLang: LangCode;
  state: 'pending' | 'filled' | 'correct' | 'wrong';
}) {
  const { colors } = useTheme();
  const tint =
    state === 'correct'
      ? { backgroundColor: colors.successTint, borderColor: colors.success }
      : state === 'wrong'
        ? { backgroundColor: colors.dangerTint, borderColor: colors.danger }
        : mine
          ? { backgroundColor: colors.primaryTint, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.borderStrong };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}, dinle`}
      onPress={() => void speak(text, speakLang)}
      style={[styles.bubbleWrap, mine ? styles.bubbleRight : styles.bubbleLeft]}
    >
      <View style={[styles.bubble, tint]}>
        <Body color={mine ? colors.primaryText : colors.text}>{text}</Body>
      </View>
    </Pressable>
  );
}

/** Complete the chat: the other speaker's lines are shown, the learner's reply is chosen. */
export function CompleteChat({ exercise, onAnswer, disabled, targetLang }: ExerciseProps<CompleteChatExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const locked = disabled || checked;
  const reply = selected === null ? '…' : exercise.options[selected]!;

  return (
    <View style={styles.root}>
      <Heading accessibilityRole="header" style={styles.title}>
        Sohbeti tamamla
      </Heading>
      <View style={styles.chat}>
        {exercise.lines.map((line, i) => (
          <Bubble key={i} text={line.text} mine={line.speaker === 'b'} speakLang={targetLang} state="filled" />
        ))}
        <Bubble
          text={reply}
          mine
          speakLang={targetLang}
          state={checked ? (exercise.correctIndex === selected ? 'correct' : 'wrong') : selected === null ? 'pending' : 'filled'}
        />
      </View>
      <View style={styles.options}>
        {exercise.options.map((opt, i) => (
          <ChoiceCard
            key={opt}
            label={opt}
            state={
              checked && i === exercise.correctIndex
                ? 'correct'
                : checked && i === selected
                  ? 'wrong'
                  : i === selected
                    ? 'selected'
                    : 'idle'
            }
            disabled={locked}
            onPress={() => setSelected(i)}
          />
        ))}
      </View>
      <View style={styles.spacer} />
      <CheckBar
        disabled={selected === null || locked}
        onCheck={() => {
          if (selected === null) return;
          setChecked(true);
          onAnswer(selected === exercise.correctIndex, exercise.options[selected]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { marginBottom: spacing.lg },
  chat: { gap: spacing.sm, marginBottom: spacing.xl },
  bubbleWrap: { maxWidth: '85%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  options: { gap: spacing.sm },
  spacer: { flex: 1 },
});
