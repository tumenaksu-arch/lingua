import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE_DENSE, MIN_TOUCH, PRESS_DEPTH, fontSize, fontWeight, radii, spacing, type ColorTokens } from './theme';
import { useTheme } from './useTheme';

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong';

export type ChoiceCardProps = {
  label: string;
  state?: ChoiceState;
  /** Optional "1", "2"… keycap shown on the left like Duolingo. */
  index?: number;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function styleFor(state: ChoiceState, c: ColorTokens): { border: string; bg: string; text: string } {
  switch (state) {
    case 'idle':
      return { border: c.border, bg: c.background, text: c.text };
    case 'selected':
      return { border: c.secondary, bg: c.secondaryTint, text: c.secondaryText };
    case 'correct':
      return { border: c.primary, bg: c.primaryTint, text: c.primaryText };
    case 'wrong':
      return { border: c.danger, bg: c.dangerTint, text: c.dangerText };
  }
}

const STATE_HINT: Record<ChoiceState, string> = {
  idle: '',
  selected: ', seçili',
  correct: ', doğru',
  wrong: ', yanlış',
};

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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.md },
  face: {
    minHeight: MIN_TOUCH + PRESS_DEPTH,
    borderRadius: radii.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  keycap: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keycapText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  label: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.medium },
});
