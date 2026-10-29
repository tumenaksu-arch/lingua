import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ListenSelectExercise } from '@/domain';
import { speak } from '@/speech';
import { ChoiceCard, spacing, useSettingsStore } from '@/ui';

import { CheckBar } from '../CheckBar';
import { Prompt, SpeakerButton } from './Prompt';
import type { ExerciseProps } from './types';

/** "Duyduğuna dokun": plays the audio, learner picks the matching written option. */
export function ListenSelect({ exercise, onAnswer, disabled }: ExerciseProps<ListenSelectExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const slowRate = useSettingsStore((s) => s.slowRate);
  const locked = disabled || checked;

  useEffect(() => {
    void speak(exercise.audioText, exercise.audioLang);
  }, [exercise.id, exercise.audioText, exercise.audioLang]);

  return (
    <View style={styles.root}>
      <Prompt instruction="Duyduğuna dokun" />
      <View style={styles.speakers}>
        <SpeakerButton text={exercise.audioText} lang={exercise.audioLang} size={96} />
        <SpeakerButton text={exercise.audioText} lang={exercise.audioLang} rate={slowRate} size={56} />
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
  speakers: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.xl },
  options: { gap: spacing.sm },
  spacer: { flex: 1 },
});
