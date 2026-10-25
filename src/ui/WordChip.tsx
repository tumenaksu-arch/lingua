import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE_DENSE, MIN_TOUCH, spacing, type ColorTokens } from './theme';
import { useTheme } from './useTheme';

export type WordChipState = 'idle' | 'selected' | 'correct' | 'wrong' | 'used';

export type WordChipProps = {
  word: string;
  state?: WordChipState;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function styleFor(state: WordChipState, c: ColorTokens): { border: string; width: number; bg: string; text: string } {
  switch (state) {
    case 'idle':
      return { border: c.borderStrong, width: 1, bg: c.surface, text: c.text };
    case 'selected':
      return { border: c.primary, width: 1.5, bg: c.primaryTint, text: c.primaryText };
    case 'correct':
      return { border: c.success, width: 1.5, bg: c.successTint, text: c.successText };
    case 'wrong':
      return { border: c.danger, width: 1.5, bg: c.dangerTint, text: c.dangerText };
    case 'used':
      // leaves an empty slot in the word bank
      return { border: c.border, width: 1, bg: c.border, text: c.border };
  }
}

/** Flat word-bank chip with hairline border — no 3D edge. */
export function WordChip({ word, state = 'idle', disabled, onPress, style }: WordChipProps) {
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();
  const s = styleFor(state, colors);
  const inert = disabled || state === 'used';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state === 'used' ? `${word}, kullanıldı` : word}
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
      <View
        style={[
          styles.face,
          {
            backgroundColor: s.bg,
            borderColor: s.border,
            borderWidth: s.width,
            opacity: pressed && !inert ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.text, { color: s.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
          {word}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: MIN_TOUCH - 8,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16 },
});
