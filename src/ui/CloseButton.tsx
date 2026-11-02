import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { MIN_TOUCH } from './theme';
import { useTheme } from './useTheme';

export type CloseButtonProps = {
  onPress: () => void;
  /** Erişilebilirlik etiketi (varsayılan "Kapat"). */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ortak kapat (✕) düğmesi: 44px dokunma hedefi, erişilebilir "Kapat" etiketi.
 * Ders ve konuşma ekranlarındaki iki ayrı implementasyonun yerine geçer.
 */
export function CloseButton({ onPress, label = 'Kapat', style }: CloseButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Icon name="x" size={22} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
