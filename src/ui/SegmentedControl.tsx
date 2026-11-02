import { Pressable, StyleSheet, View } from 'react-native';

import { Caption } from './Typography';
import { MIN_TOUCH, radii, spacing } from './theme';
import { useTheme } from './useTheme';

export type SegmentedControlOption<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Ortak segmented seçim kontrolü (tablist): lig ekranındaki "Bu hafta / Arkadaşlar"
 * anahtarının katalog karşılığı. Seçili segment düz marka dolgusu alır; etiketler
 * mono Caption ölçeğindedir (fontSize.xs, letterSpacing 1.5) ve dokunma hedefi
 * MIN_TOUCH (44) altına inmez.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { borderColor: colors.borderStrong }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.item, { backgroundColor: selected ? colors.primary : 'transparent' }]}
          >
            <Caption dense color={selected ? colors.textOnBrand : colors.textMuted}>
              {option.label}
            </Caption>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.pill, padding: spacing.xs },
  item: { flex: 1, minHeight: MIN_TOUCH, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
