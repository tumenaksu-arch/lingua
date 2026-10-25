import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH, fonts, radii, spacing, type ColorTokens } from './theme';
import { upperTr } from './upperTr';
import { useTheme } from './useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Stretch to the parent width (default true). */
  block?: boolean;
  /** Skip the haptic tick. */
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
};

function faceFor(variant: ButtonVariant, c: ColorTokens): { bg: string; text: string; border?: string } {
  switch (variant) {
    case 'primary':
      return { bg: c.buttonPrimary, text: c.buttonPrimaryText };
    case 'secondary':
      return { bg: c.buttonSecondary, text: c.textOnColor };
    case 'danger':
      return { bg: c.buttonDanger, text: c.textOnColor };
    case 'outline':
      return { bg: 'transparent', text: c.text, border: c.borderStrong };
  }
}

/**
 * Flat EduPilot pill button: no 3D bottom edge — the pressed state is a simple
 * opacity dip. Label is a Turkish-uppercased Space Mono caption.
 */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  block = true,
  silent = false,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();
  const face = faceFor(variant, colors);
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!silent) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={[block ? styles.block : null, style]}
      {...rest}
    >
      <View
        style={[
          styles.face,
          {
            backgroundColor: inactive ? colors.disabled : face.bg,
            borderColor: face.border ?? 'transparent',
            borderWidth: face.border ? 1 : 0,
            opacity: pressed && !inactive ? 0.8 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={face.text} />
        ) : (
          <Text
            style={[styles.label, { color: inactive ? colors.disabledText : face.text }]}
            maxFontSizeMultiplier={1.6}
          >
            {upperTr(title)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  face: {
    minHeight: Math.max(MIN_TOUCH, 48),
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, letterSpacing: 1.5, fontFamily: fonts.mono, textAlign: 'center' },
});
