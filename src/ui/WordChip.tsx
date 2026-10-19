import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE_DENSE, MIN_TOUCH, PRESS_DEPTH, fontSize, fontWeight, radii, spacing, type ColorTokens } from './theme';
import { useTheme } from './useTheme';

export type WordChipState = 'idle' | 'selected' | 'correct' | 'wrong' | 'used';

export type WordChipProps = {
  word: string;
  state?: WordChipState;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function styleFor(state: WordChipState, c: ColorTokens): { border: string; bg: string; text: string } {
  switch (state) {
    case 'idle':
      return { border: c.border, bg: c.background, text: c.text };
    case 'selected':
      return { border: c.secondary, bg: c.secondaryTint, text: c.secondaryText };
    case 'correct':
      return { border: c.primary, bg: c.primaryTint, text: c.primaryText };
    case 'wrong':
      return { border: c.danger, bg: c.dangerTint, text: c.dangerText };
    case 'used':
      // leaves an empty slot in the word bank, like Duolingo
      return { border: c.border, bg: c.border, text: c.border };
  }
}

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
          <Text style={[styles.text, { color: s.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
            {word}
          </Text>
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
