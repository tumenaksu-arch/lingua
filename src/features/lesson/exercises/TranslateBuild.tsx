import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isAnswerCorrect, type TranslateBuildExercise } from '@/domain';
import { WordChip, spacing, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import { buildAnswer, createBuild, pickWord, unpickWord } from '../helpers';
import { Prompt } from './Prompt';
import type { ExerciseProps } from './types';

export function TranslateBuild({ exercise, onAnswer, disabled, targetLang }: ExerciseProps<TranslateBuildExercise>) {
  const [state, setState] = useState(() => createBuild(exercise.bank));
  const [checked, setChecked] = useState<boolean | null>(null);
  const { colors } = useTheme();
  const locked = disabled || checked !== null;
  const answerBorder = checked === true ? colors.primary : checked === false ? colors.danger : colors.border;

  return (
    <View style={styles.root}>
      <Prompt
        instruction="Bu cümleyi çevir"
        text={exercise.prompt}
        speakLang={exercise.promptLang === targetLang ? targetLang : undefined}
      />
      <View
        style={[styles.answerRow, { borderBottomColor: answerBorder }]}
        accessible
        accessibilityLabel={state.picked.length ? `Cevabın: ${buildAnswer(state)}` : 'Cevap alanı boş'}
        accessibilityLiveRegion="polite"
      >
        {state.picked.map((bankIdx, pos) => (
          <WordChip
            key={`${bankIdx}`}
            word={state.bank[bankIdx]!}
            state={checked === true ? 'correct' : checked === false ? 'wrong' : 'idle'}
            disabled={locked}
            onPress={() => setState((s) => unpickWord(s, pos))}
          />
        ))}
      </View>
      <View style={styles.bank} accessibilityLabel="Kelime bankası">
        {state.bank.map((w, i) => (
          <WordChip
            key={`${w}-${i}`}
            word={w}
            state={state.picked.includes(i) ? 'used' : 'idle'}
            disabled={locked}
            onPress={() => setState((s) => pickWord(s, i))}
          />
        ))}
      </View>
      <View style={styles.spacer} />
      <CheckBar
        disabled={state.picked.length === 0 || locked}
        onCheck={() => {
          const text = buildAnswer(state);
          const ok = isAnswerCorrect(text, exercise.answers);
          setChecked(ok);
          onAnswer(ok, text);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  answerRow: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    marginBottom: spacing.xl,
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  spacer: { flex: 1 },
});
