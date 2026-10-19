import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MatchPairsExercise } from '@/domain';
import { ChoiceCard, spacing } from '@/ui';

import { createMatch, hashString, isMatchComplete, tapMatch, type MatchState } from '../helpers';
import { Prompt } from './Prompt';
import type { ExerciseProps } from './types';

/** Matching completes automatically once every pair is paired. Duolingo counts the exercise correct regardless of misses. */
export function MatchPairs({ exercise, onAnswer, disabled }: ExerciseProps<MatchPairsExercise>) {
  const [state, setState] = useState<MatchState>(() => createMatch(exercise.pairs, hashString(exercise.id)));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done && isMatchComplete(state)) {
      setDone(true);
      onAnswer(true);
    }
  }, [state, done, onAnswer]);

  const stateFor = (side: 'left' | 'right', i: number) => {
    const matched = side === 'left' ? state.matchedLeft : state.matchedRight;
    const selected = side === 'left' ? state.selectedLeft : state.selectedRight;
    if (matched.has(i)) return 'correct';
    if (state.wrong && state.wrong[side] === i) return 'wrong';
    return selected === i ? 'selected' : 'idle';
  };

  return (
    <View style={styles.root}>
      <Prompt instruction="Eşleştir" />
      <View style={styles.columns}>
        <View style={styles.col}>
          {state.left.map((w, i) => (
            <ChoiceCard key={w} label={w} state={stateFor('left', i)} disabled={disabled || done} onPress={() => setState((s) => tapMatch(s, 'left', i))} />
          ))}
        </View>
        <View style={styles.col}>
          {state.right.map((w, i) => (
            <ChoiceCard key={w} label={w} state={stateFor('right', i)} disabled={disabled || done} onPress={() => setState((s) => tapMatch(s, 'right', i))} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  columns: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, gap: spacing.sm },
});
