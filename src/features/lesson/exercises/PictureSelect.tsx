import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PictureSelectExercise } from '@/domain';
import { MAX_FONT_SCALE_DENSE, spacing, type ColorTokens, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import { Prompt } from './Prompt';
import type { ExerciseProps } from './types';

type PicState = 'idle' | 'selected' | 'correct' | 'wrong';

function styleFor(state: PicState, c: ColorTokens): { border: string; width: number; bg: string; text: string } {
  switch (state) {
    case 'idle':
      return { border: c.borderStrong, width: 1, bg: c.surface, text: c.text };
    case 'selected':
      return { border: c.primary, width: 2, bg: c.primaryTint, text: c.primaryText };
    case 'correct':
      return { border: c.success, width: 2, bg: c.successTint, text: c.successText };
    case 'wrong':
      return { border: c.danger, width: 2, bg: c.dangerTint, text: c.dangerText };
  }
}

const STATE_HINT: Record<PicState, string> = {
  idle: '',
  selected: ', seçili',
  correct: ', doğru',
  wrong: ', yanlış',
};

/** Emoji card for the 2×2 picture grid: big emoji over the target-language label. */
function PictureCard({
  emoji,
  label,
  state,
  disabled,
  onPress,
}: {
  emoji: string;
  label: string;
  state: PicState;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const s = styleFor(state, colors);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label}${STATE_HINT[state]}`}
      accessibilityState={{ selected: state === 'selected', disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.cardWrap}
    >
      <View style={[styles.card, { backgroundColor: s.bg, borderColor: s.border, borderWidth: s.width }]}>
        <Text style={styles.emoji} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE} accessible={false}>
          {emoji}
        </Text>
        <Text style={[styles.label, { color: s.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Picture-word choice: pick the emoji card whose label answers the Turkish prompt. */
export function PictureSelect({ exercise, onAnswer, disabled }: ExerciseProps<PictureSelectExercise>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const locked = disabled || checked;

  return (
    <View style={styles.root}>
      <Prompt instruction={exercise.prompt} />
      <View style={styles.grid}>
        {exercise.options.map((opt, i) => (
          <PictureCard
            key={opt.label}
            emoji={opt.emoji}
            label={opt.label}
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
          onAnswer(selected === exercise.correctIndex, exercise.options[selected]!.label);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cardWrap: { width: '47%', flexGrow: 1 },
  card: {
    minHeight: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emoji: { fontSize: 44 },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  spacer: { flex: 1 },
});
