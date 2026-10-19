import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SelectTranslationExercise } from '@/domain';
import { ChoiceCard, spacing } from '@/ui';

import { CheckBar } from '../CheckBar';
import { Prompt } from './Prompt';
import type { ExerciseProps } from './types';

export function SelectTranslation({ exercise, onAnswer, disabled, targetLang }: ExerciseProps<SelectTranslationExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const stateFor = (i: number) => {
    if (checked && i === exercise.correctIndex) return 'correct';
    if (checked && i === selected) return 'wrong';
    return i === selected ? 'selected' : 'idle';
  };

  return (
    <View style={styles.root}>
      <Prompt
        instruction="Doğru çeviriyi seç"
        text={exercise.prompt}
        speakLang={exercise.promptLang === targetLang ? targetLang : undefined}
      />
      <View style={styles.options}>
        {exercise.options.map((opt, i) => (
          <ChoiceCard
            key={opt}
            label={opt}
            index={i + 1}
            state={stateFor(i)}
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
