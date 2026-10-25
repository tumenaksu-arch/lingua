import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Course } from '@/domain/types';
import { removeMember, type ProgressRow } from '@/data/remote/classes';
import { currentUnitLabel, lastActiveLabel } from '@/features/teacher/shared';
import { Body, Button, Caption, fonts, radii, showAlert, spacing, useTheme } from '@/ui';

/**
 * ÖĞRENCİLER tab: nickname-only rows sorted by weekly XP (worst data privacy,
 * best gamification). The teacher sees summaries, never answers or e-mails.
 */
export function StudentsTab({
  classId,
  members,
  course,
  classCode,
  onChanged,
}: {
  classId: string;
  members: ProgressRow[];
  course: Course | undefined;
  classCode: string;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Date();

  const sorted = [...members].sort((a, b) => b.weeklyXp - a.weeklyXp || b.totalXp - a.totalXp);

  const confirmRemove = (member: ProgressRow) =>
    showAlert('Öğrenciyi çıkar', `${member.takmaAd} sınıftan çıkarılsın mı? Sınıfa ait verisi artık görünmez.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(member.userId);
            try {
              await removeMember(classId, member.userId);
              onChanged();
            } catch {
              // RLS/network failure: keep the row; the teacher can retry.
            } finally {
              setBusy(null);
            }
          })();
        },
      },
    ]);

  if (sorted.length === 0) {
    return (
      <View style={styles.section}>
        <Caption color={colors.textMuted}>Henüz öğrenci yok.</Caption>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Caption color={colors.textMuted}>
            Öğrenciler Love-Vox karşılama ekranındaki Sınıf koduyla katıl seçeneğinden şu kodu ve sınıf içi takma
            adlarını girer:
          </Caption>
          <Body style={styles.emptyCode}>{classCode}</Body>
          <Caption color={colors.textMuted}>E-posta istenmez; öğrenci yalnızca takma adıyla görünür.</Caption>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section} accessibilityLabel="Öğrenci listesi">
      {sorted.map((member, index) => {
        const unit = currentUnitLabel(course, member.completedLessons);
        return (
          <Pressable
            key={member.userId}
            accessibilityLabel={`${index + 1}. ${member.takmaAd}, bu hafta ${member.weeklyXp} XP`}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.rowMain}>
              <Body numberOfLines={1}>{member.takmaAd}</Body>
              <Caption color={colors.textMuted}>
                Bu hafta <Caption style={styles.mono}>{member.weeklyXp} XP</Caption> · Toplam {member.totalXp} XP · 🔥 {member.streak}
              </Caption>
              <Caption color={colors.textMuted}>
                Son aktif: {lastActiveLabel(member.lastActiveDate, today)}
                {unit ? ` · ${unit}` : ' · Kurs bitti 🎉'}
              </Caption>
            </View>
            <Button
              title="Çıkar"
              variant="danger"
              block={false}
              loading={busy === member.userId}
              onPress={() => confirmRemove(member)}
              accessibilityLabel={`${member.takmaAd} adlı öğrenciyi çıkar`}
              style={styles.removeBtn}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  rowMain: { flex: 1, gap: 2 },
  mono: { fontFamily: fonts.mono },
  removeBtn: { paddingHorizontal: spacing.sm },
  emptyCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  emptyCode: { fontFamily: fonts.mono, fontSize: 24, letterSpacing: 6 },
});
