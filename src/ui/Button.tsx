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

import { MIN_TOUCH, PRESS_DEPTH, colors, fontSize, fontWeight, radii, spacing } from './theme';

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

const faces: Record<ButtonVariant, { bg: string; shadow: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, shadow: colors.primaryShadow, text: colors.textOnColor },
  secondary: { bg: colors.secondary, shadow: colors.secondaryShadow, text: colors.textOnColor },
  danger: { bg: colors.danger, shadow: colors.dangerShadow, text: colors.textOnColor },
  outline: { bg: colors.background, shadow: colors.border, text: colors.secondary, border: colors.border },
};

/**
 * Duolingo-style 3D button: a solid bottom edge that collapses when pressed,
 * so the face appears to sink into the shadow.
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
  const face = faces[variant];
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
          styles.shell,
          { backgroundColor: inactive ? colors.disabled : face.shadow },
        ]}
      >
        <View
          style={[
            styles.face,
            {
              backgroundColor: inactive ? colors.disabled : face.bg,
              borderColor: face.border ?? 'transparent',
              borderWidth: face.border ? 2 : 0,
              // pressed: face drops onto the shadow edge
              transform: [{ translateY: pressed ? PRESS_DEPTH : 0 }],
              marginBottom: pressed ? 0 : PRESS_DEPTH,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={face.text} />
          ) : (
            <Text style={[styles.label, { color: inactive ? colors.disabledText : face.text }]}>
              {title.toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  shell: { borderRadius: radii.lg },
  face: {
    minHeight: MIN_TOUCH + PRESS_DEPTH,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
});
