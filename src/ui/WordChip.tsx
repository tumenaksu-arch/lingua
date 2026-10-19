import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH, PRESS_DEPTH, colors, fontSize, fontWeight, radii, spacing } from './theme';

export type WordChipState = 'idle' | 'selected' | 'correct' | 'wrong' | 'used';

export type WordChipProps = {
  word: string;
  state?: WordChipState;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const STATE_STYLE: Record<WordChipState, { border: string; bg: string; text: string }> = {
  idle: { border: colors.border, bg: colors.background, text: colors.text },
  selected: { border: colors.secondary, bg: colors.secondaryTint, text: colors.secondaryShadow },
  correct: { border: colors.primary, bg: colors.primaryTint, text: colors.primaryShadow },
  wrong: { border: colors.danger, bg: colors.dangerTint, text: colors.dangerShadow },
  // "used": leaves an empty slot in the word bank, like Duolingo
  used: { border: colors.border, bg: colors.border, text: colors.border },
};

export function WordChip({ word, state = 'idle', disabled, onPress, style }: WordChipProps) {
  const [pressed, setPressed] = useState(false);
  const s = STATE_STYLE[state];
  const inert = disabled || state === 'used';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={word}
      accessibilityState={{ selected: state === 'selected', disabled: inert }}
      disabled={inert}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={style}
    >
      <View style={[styles.shell, { backgroundColor: s.border }]}>
        <View
          style={[
            styles.face,
            {
              backgroundColor: s.bg,
              borderColor: s.border,
              transform: [{ translateY: pressed ? PRESS_DEPTH : 0 }],
              marginBottom: pressed ? 0 : PRESS_DEPTH,
            },
          ]}
        >
          <Text style={[styles.text, { color: s.text }]}>{word}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.md },
  face: {
    minHeight: MIN_TOUCH,
    borderRadius: radii.md,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
