import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { getCourse } from '@/content';
import { assignmentStatus } from '@/features/classes/assignmentStatus';
import { useClassStore } from '@/features/classes/classStore';
import { dueLabel, isAssignmentVisible, relativeTime } from '@/features/classes/classView';
import { useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import { Body, Button, Caption, Heading, Screen, Title, spacing, upperTr, useTheme } from '@/ui';

/**
 * The student's class screen (madde 5, wave 2b): Duyurular (all, newest first,
 * READ-ONLY — no reply input by design), Ödevler with the caller's own status
 * per assignment (bitti / devam / gecikti, from local progress) and the
 * class-internal weekly league with the own row highlighted.
 */
export default function ClassScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { colors } = useTheme();
  const now = useNow();
  const progress = useAppStore((s) => s.progress);
  const myClasses = useClassStore((s) => s.myClasses);
  const assignments = useClassStore((s) => s.assignments);
  const announcements = useClassStore((s) => s.announcements);
  const league = useClassStore((s) => s.league);
  const loading = useClassStore((s) => s.loading);
  const load = useClassStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cls = myClasses.find((c) => c.classId === classId) ?? null;
  if (!cls) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Body color={colors.textMuted}>Bu sınıfta değilsin ya da sınıf arşivlendi.</Body>
          <Button title="Geri dön" variant="outline" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const course = getCourse(cls.courseId);
  const completedIds = Object.keys(progress).filter((id) => progress[id]?.completedAt);
  const today = new Date(now);
  const rows = (assignments[cls.classId] ?? [])
    .map((a) => ({ a, st: assignmentStatus(course, a, completedIds, today) }))
    .filter((r) => isAssignmentVisible(r.st.status, r.a.sonTarih, today));
  const rowsNewestFirst = [...rows].sort((a, b) => b.a.createdAt.localeCompare(a.a.createdAt));
  const anns = announcements[cls.classId] ?? [];
  const lig = league[cls.classId] ?? [];

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Caption color={colors.primaryText}>{upperTr('Sınıf')}</Caption>
            <Title>{cls.ad}</Title>
            <Caption color={colors.textMuted}>Takma adın: {cls.takmaAd}</Caption>
          </View>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri dön" style={styles.close}>
            <Body color={colors.textMuted}>✕</Body>
          </Pressable>
        </View>

        <Heading>Duyurular</Heading>
        {anns.length === 0 ? (
          <Caption color={colors.textMuted}>Henüz duyuru yok.</Caption>
        ) : (
          anns.map((ann) => (
            <View key={ann.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Body>{ann.metin}</Body>
              <Caption color={colors.textMuted}>{relativeTime(ann.createdAt, now)}</Caption>
            </View>
          ))
        )}

        <Heading>Ödevler</Heading>
        {rowsNewestFirst.length === 0 ? (
          <Caption color={colors.textMuted}>{loading ? 'Yükleniyor…' : 'Ödev yok. Böyle devam et!'}</Caption>
        ) : (
          rowsNewestFirst.map(({ a, st }) => {
            const unit = course?.units.find((u) => u.id === a.unitId);
            const label =
              st.status === 'bitti'
                ? 'bitti ✓'
                : st.status === 'gecikti'
                  ? 'gecikti'
                  : dueLabel(a.sonTarih, today);
            const labelColor =
              st.status === 'bitti'
                ? colors.successText
                : st.status === 'gecikti'
                  ? colors.dangerText
                  : colors.textMuted;
            return (
              <View
                key={a.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityLabel={`Ödev: ${unit?.title ?? a.unitId}, ${st.status}, ${st.completedLessons}/${st.totalLessons} ders`}
              >
                <View style={styles.rowBetween}>
                  <Body style={styles.flex}>Ödev: {unit?.title ?? a.unitId}</Body>
                  <Caption color={labelColor}>{label}</Caption>
                </View>
                {st.status !== 'bitti' && (
                  <Caption color={colors.textMuted}>
                    {st.completedLessons}/{st.totalLessons} ders
                  </Caption>
                )}
              </View>
            );
          })
        )}

        <Heading>Sınıf ligi</Heading>
        {lig.length === 0 ? (
          <Caption color={colors.textMuted}>{loading ? 'Yükleniyor…' : 'Bu hafta için henüz kayıt yok. İlk sen ol!'}</Caption>
        ) : (
          lig.map((row, i) => (
            <View
              key={`${row.takmaAd}-${i}`}
              style={[
                styles.ligRow,
                {
                  borderColor: row.isMe ? colors.primary : colors.border,
                  backgroundColor: row.isMe ? colors.primaryTint : colors.surface,
                },
              ]}
              accessibilityLabel={`Sıra ${i + 1}: ${row.takmaAd}, ${row.weeklyXp} XP${row.isMe ? ', sen' : ''}`}
              accessibilityState={{ selected: row.isMe }}
            >
              <Caption color={row.isMe ? colors.primaryText : colors.textMuted} style={styles.rank}>
                {i + 1}.
              </Caption>
              <Body style={styles.flex} numberOfLines={1}>
                {row.takmaAd}
                {row.isMe ? ' (sen)' : ''}
              </Body>
              <Caption color={row.isMe ? colors.primaryText : colors.text}>{row.weeklyXp} XP</Caption>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  empty: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  flex: { flexShrink: 1 },
  ligRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  rank: { width: 28 },
});
