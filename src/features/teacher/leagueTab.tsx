import { StyleSheet, Text, View } from 'react-native';

import type { LeagueRow } from '@/data/remote/classes';
import { Body, Caption, fonts, radii, spacing, useTheme } from '@/ui';

/** LİG tab: the class-internal weekly league (nicknames only, XP in mono). */
export function LeagueTab({ rows }: { rows: LeagueRow[] }) {
  const { colors } = useTheme();

  if (rows.length === 0) {
    return (
      <View style={styles.section}>
        <Caption color={colors.textMuted}>Bu hafta için henüz kayıt yok. Öğrenciler ders çözdükçe sıralama belirir.</Caption>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {rows.map((row, index) => (
        <View
          key={`${row.takmaAd}-${index}`}
          style={[styles.row, { borderColor: row.isMe ? colors.primary : colors.border, backgroundColor: row.isMe ? colors.primaryTint : colors.surface }]}
          accessibilityLabel={`Sıra ${index + 1}: ${row.takmaAd}, ${row.weeklyXp} XP`}
        >
          <Caption color={colors.textMuted} style={styles.rank}>{index + 1}.</Caption>
          <Body style={styles.flex} numberOfLines={1}>{row.takmaAd}</Body>
          <Text style={[styles.xp, { color: colors.text }]}>{row.weeklyXp} XP</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 48 },
  rank: { width: 28 },
  flex: { flex: 1 },
  xp: { fontFamily: fonts.mono, fontSize: 14, letterSpacing: 1 },
});
