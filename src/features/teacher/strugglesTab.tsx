import { StyleSheet, Text, View } from 'react-native';

import type { Course } from '@/domain/types';
import type { StruggleRow } from '@/data/remote/classes';
import { summarizeStruggles } from '@/features/classes/struggles';
import { Caption, Heading, fonts, radii, spacing, useTheme } from '@/ui';

/**
 * ZORLANAN tab (etiket dar ekranlarda sığsın diye kısaltıldı): class_struggles (last 30 days) summarized per unit
 * (accuracy ascending — worst first) and per exercise type (most mistakes
 * first). Summaries only; the teacher never sees individual answers.
 */
export function StrugglesTab({ rows, course }: { rows: StruggleRow[]; course: Course | undefined }) {
  const { colors } = useTheme();
  const { byUnit, byType } = summarizeStruggles(rows);
  const hasData = byUnit.some((u) => u.total > 0);

  if (!hasData) {
    return (
      <View style={styles.section}>
        <Caption color={colors.textMuted}>Son 30 günde yeterli veri yok. Öğrenciler ders çözdükçe en çok zorlanılan üniteler burada belirir.</Caption>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Heading>Üniteler (en düşük doğruluk önce)</Heading>
      {byUnit.map((unit) => {
        const title = course?.units.find((u) => u.id === unit.unitId);
        const percent = Math.round(unit.accuracy * 100);
        return (
          <View key={unit.unitId} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.rowText}>
              <Caption color={colors.text} numberOfLines={1}>
                {title ? `Ünite ${title.order}: ${title.title}` : unit.unitId}
              </Caption>
              <Caption color={colors.textMuted}>{unit.attempts} deneme</Caption>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.fill, { backgroundColor: percent < 50 ? colors.danger : colors.warning, width: `${percent}%` }]} />
            </View>
            <Text style={[styles.percent, { color: colors.text }]}>{percent}%</Text>
          </View>
        );
      })}

      <Heading>Alıştırma türleri (en çok hata önce)</Heading>
      {byType.length === 0 ? (
        <Caption color={colors.textMuted}>Henüz hata türü verisi yok.</Caption>
      ) : (
        byType.map((mistake) => (
          <View key={mistake.type} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Caption color={colors.text} style={styles.flex}>{mistake.label}</Caption>
            <Text style={[styles.percent, { color: colors.text }]}>{mistake.count} hata</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  rowText: { width: 120, gap: 2 },
  track: { flex: 1, height: 10, borderRadius: radii.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.sm },
  percent: { fontFamily: fonts.mono, fontSize: 13, minWidth: 44, textAlign: 'right' },
  flex: { flex: 1 },
});
