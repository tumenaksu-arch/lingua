import { Pressable, StyleSheet, View } from 'react-native';

import { Caption, Heading, spacing, useTheme } from '@/ui';

interface PracticeCardProps {
  title: string;
  /** 0 renders the card passive with `emptyText` (Duolingo's empty hub state). */
  count: number;
  emptyText: string;
  onPress?: () => void;
}

/** Review-tab card into a Practice Hub session ("Hatalarım" / "Zayıf kelimeler"). */
export function PracticeCard({ title, count, emptyText, onPress }: PracticeCardProps) {
  const { colors } = useTheme();
  const active = count > 0 && onPress != null;
  return (
    <Pressable
      onPress={active ? onPress : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: !active }}
      accessibilityLabel={`${title} (${count})${active ? '' : `. ${emptyText}`}`}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, opacity: active ? 1 : 0.7 }]}
    >
      <View style={styles.row}>
        <Heading>{title} ({count})</Heading>
        {active ? <Heading color={colors.primary}>›</Heading> : null}
      </View>
      <Caption color={colors.textMuted}>{active ? 'Pratik için dokun' : emptyText}</Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
