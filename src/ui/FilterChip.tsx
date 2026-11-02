import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Caption } from './Typography';
import { MIN_TOUCH, radii, spacing } from './theme';
import { upperTr } from './upperTr';
import { useTheme } from './useTheme';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Fire the same light haptic tick as ui Button on press. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ortak seçilebilir mono çip (profil ekranındaki günlük hedef / tema / ses çiplerinin
 * katalog karşılığı). Wrap'li bir satırda tek ya da çoklu seçim için kullanılır;
 * seçiliyse düz marka dolgusu, değilse hairline kontur. Etiket mono Caption ölçeğinde
 * (fontSize.xs, letterSpacing 1.5) ve dokunma hedefi MIN_TOUCH (44) altına inmez.
 */
export function FilterChip({ label, selected, onPress, disabled, accessibilityLabel, haptic = false, style }: FilterChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : 'transparent',
          borderColor: selected ? colors.primary : colors.borderStrong,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Caption dense color={selected ? colors.textOnBrand : colors.text}>
        {upperTr(label)}
      </Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
