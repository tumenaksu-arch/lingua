import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Body, Heading } from './Typography';
import { radii, spacing } from './theme';
import { useTheme } from './useTheme';

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
};

/**
 * Ortak boş durum kartı: `soonCard` iskeleti (radii.lg, borderWidth 1,
 * ortalanmış ikon + başlık + açıklama + isteğe bağlı eylem düğmesi).
 */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {icon ? <Icon name={icon} size={28} color={colors.primaryText} strokeWidth={1.75} /> : null}
      <Heading center>{title}</Heading>
      {body ? (
        <Body color={colors.textMuted} center>
          {body}
        </Body>
      ) : null}
      {action ? <Button title={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' },
});
