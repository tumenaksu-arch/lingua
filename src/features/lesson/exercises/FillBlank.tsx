import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FillBlankExercise } from '@/domain';
import { ChoiceCard, spacing } from '@/ui';

import { CheckBar } from '../CheckBar';
import { Prompt } from './Prompt';
import type { ExerciseProps } from './types';

export function FillBlank({ exercise, onAnswer, disabled }: ExerciseProps<FillBlankExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const shown = selected === null ? exercise.sentence : exercise.sentence.replace('___', `[${exercise.options[selected]}]`);

  return (
    <View style={styles.root}>
      <Prompt instruction="Boşluğu doldur" text={shown} />
      <View style={styles.options}>
        {exercise.options.map((opt, i) => (
          <ChoiceCard
            key={opt}
            label={opt}
            state={
              checked && i === exercise.correctIndex ? 'correct' : checked && i === selected ? 'wrong' : i === selected ? 'selected' : 'idle'
            }
            disabled={disabled || checked}
            onPress={() => setSelected(i)}
          />
        ))}
      </View>
      <View style={styles.spacer} />
      <CheckBar
        disabled={selected === null || disabled || checked}
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
  options: { gap: spacing.sm },
  spacer: { flex: 1 },
});
