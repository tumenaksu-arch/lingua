import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE_DENSE, MIN_TOUCH, spacing, type ColorTokens } from './theme';
import { useTheme } from './useTheme';

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong';

export type ChoiceCardProps = {
  label: string;
  state?: ChoiceState;
  /** Optional "1", "2"… keycap shown on the left. */
  index?: number;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function styleFor(state: ChoiceState, c: ColorTokens): { border: string; width: number; bg: string; text: string } {
  switch (state) {
    case 'idle':
      return { border: c.borderStrong, width: 1, bg: c.surface, text: c.text };
    case 'selected':
      return { border: c.primary, width: 1.5, bg: c.primaryTint, text: c.primaryText };
    case 'correct':
      return { border: c.success, width: 1.5, bg: c.successTint, text: c.successText };
    case 'wrong':
      return { border: c.danger, width: 1.5, bg: c.dangerTint, text: c.dangerText };
  }
}

const STATE_HINT: Record<ChoiceState, string> = {
  idle: '',
  selected: ', seçili',
  correct: ', doğru',
  wrong: ', yanlış',
};

/** Flat answer card: hairline border, tinted selected/correct/wrong states — no 3D edge. */
export function ChoiceCard({ label, state = 'idle', index, disabled, onPress, style }: ChoiceCardProps) {
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();
  const s = styleFor(state, colors);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label}${STATE_HINT[state]}`}
      accessibilityState={{ selected: state === 'selected', checked: state === 'selected', disabled: !!disabled }}
      disabled={disabled}
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
            opacity: pressed && !disabled ? 0.8 : 1,
          },
        ]}
      >
        {index !== undefined ? (
          <View style={[styles.keycap, { borderColor: s.border }]}>
            <Text style={[styles.keycapText, { color: s.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
              {index}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.label, { color: s.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE_DENSE}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: MIN_TOUCH,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  keycap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keycapText: { fontSize: 14 },
  label: { flex: 1, fontSize: 16 },
});
