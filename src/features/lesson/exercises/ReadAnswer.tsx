import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ReadAnswerExercise } from '@/domain';
import { Body, ChoiceCard, spacing, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import { Prompt, SpeakerButton } from './Prompt';
import type { ExerciseProps } from './types';

/** Read the passage and answer the question about it. */
export function ReadAnswer({ exercise, onAnswer, disabled, targetLang }: ExerciseProps<ReadAnswerExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const { colors } = useTheme();
  const locked = disabled || checked;

  return (
    <View style={styles.root}>
      <Prompt instruction="Oku ve cevapla" text={exercise.question} />
      <View style={[styles.passage, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
        <SpeakerButton text={exercise.passage} lang={targetLang} />
        <Body style={styles.passageText}>{exercise.passage}</Body>
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
  passage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  passageText: { flex: 1, fontSize: 18, lineHeight: 26 },
  options: { gap: spacing.sm },
  spacer: { flex: 1 },
});
