import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Caption } from './Typography';
import { spacing } from './theme';
import { useTheme } from './useTheme';

export type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondary?: { label: string; onPress: () => void };
};

/**
 * Ortak hata kalıbı: danger tonunda mesaj + isteğe bağlı "Tekrar dene" ve
 * ikincil eylem düğmesi. `onRetry` verilmezse düğme çizilmez (salt-okunur
 * hata bildirimi).
 */
export function ErrorState({ message, onRetry, retryLabel = 'Tekrar dene', secondary }: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Caption color={colors.dangerText} accessibilityRole="alert">
        {message}
      </Caption>
      {onRetry ? <Button title={retryLabel} variant="outline" onPress={onRetry} /> : null}
      {secondary ? <Button title={secondary.label} variant="outline" onPress={secondary.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, alignItems: 'flex-start' },
});
