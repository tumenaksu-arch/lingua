import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH, PRESS_DEPTH, colors, fontSize, fontWeight, radii, spacing } from './theme';

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

const STATE_STYLE: Record<ChoiceState, { border: string; bg: string; text: string }> = {
  idle: { border: colors.border, bg: colors.background, text: colors.text },
  selected: { border: colors.secondary, bg: colors.secondaryTint, text: colors.secondaryShadow },
  correct: { border: colors.primary, bg: colors.primaryTint, text: colors.primaryShadow },
  wrong: { border: colors.danger, bg: colors.dangerTint, text: colors.dangerShadow },
};

export function ChoiceCard({ label, state = 'idle', index, disabled, onPress, style }: ChoiceCardProps) {
  const [pressed, setPressed] = useState(false);
  const s = STATE_STYLE[state];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === 'selected', disabled: !!disabled }}
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
              <Text style={[styles.keycapText, { color: s.text }]}>{index}</Text>
            </View>
          ) : null}
          <Text style={[styles.label, { color: s.text }]}>{label}</Text>
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
