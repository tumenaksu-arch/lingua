import { StyleSheet, View } from 'react-native';

import { Button, spacing } from '@/ui';

export interface CheckBarProps {
  onCheck: () => void;
  disabled?: boolean;
  label?: string;
  /** Optional secondary action (e.g. "Atla"). */
  secondary?: { label: string; onPress: () => void };
}

/** Bottom action row shared by every exercise. */
export function CheckBar({ onCheck, disabled, label = 'Kontrol et', secondary }: CheckBarProps) {
  return (
    <View style={styles.bar}>
      {secondary ? (
        <Button title={secondary.label} variant="outline" onPress={secondary.onPress} style={styles.secondary} />
      ) : null}
      <Button title={label} onPress={onCheck} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: spacing.md, gap: spacing.sm },
  secondary: { marginBottom: spacing.xs },
});
