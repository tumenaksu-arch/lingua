import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { radii, spacing } from './theme';
import { useTheme } from './useTheme';

export type NoticeTone = 'warning' | 'danger' | 'success';

export type NoticeCardProps = {
  tone: NoticeTone;
  children: ReactNode;
  action?: { label: string; onPress: () => void };
};

/**
 * Tonlu uyarı kartı (warning / danger / success): saç çizgili kenarlıklı
 * yüzey + isteğe bağlı outline eylem düğmesi. Metin rengi çağıranımda
 * (`Body`/`Caption`) belirlenir.
 */
export function NoticeCard({ tone, children, action }: NoticeCardProps) {
  const { colors } = useTheme();
  const face =
    tone === 'success'
      ? { border: colors.success, background: colors.successTint }
      : tone === 'danger'
        ? { border: colors.danger, background: colors.surface }
        : { border: colors.warning, background: colors.surface };
  return (
    <View style={[styles.card, { borderColor: face.border, backgroundColor: face.background }]}>
      {children}
      {action ? <Button title={action.label} variant="outline" block={false} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
});
