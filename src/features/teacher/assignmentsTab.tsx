import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Course } from '@/domain/types';
import {
  createAssignment,
  deleteAssignment,
  type AssignmentDoc,
  type ProgressRow,
} from '@/data/remote/classes';
import { assignmentStatus, type AssignmentStatus } from '@/features/classes/assignmentStatus';
import { isDateIso, nextFridayIso } from '@/features/teacher/shared';
import { Body, Button, Caption, Heading, fonts, radii, showAlert, spacing, upperTr, useTheme } from '@/ui';

const STATUS_LABELS: Record<AssignmentStatus, string> = { bitti: 'Bitti', devam: 'Devam', gecikti: 'Gecikti' };

/**
 * ÖDEVLER tab: assign a unit of the class course with a 'YYYY-MM-DD' deadline
 * (default next Friday) and follow bitti/devam/gecikti per member via
 * class_progress + assignmentStatus. Expand a row to see the member names.
 */
export function AssignmentsTab({
  classId,
  course,
  assignments,
  members,
  onChanged,
}: {
  classId: string;
  course: Course | undefined;
  assignments: AssignmentDoc[];
  members: ProgressRow[];
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const [unitId, setUnitId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(() => nextFridayIso(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const today = new Date();

  const submit = async () => {
    if (!unitId) {
      setFormError('Önce bir ünite seç.');
      return;
    }
    if (!isDateIso(deadline.trim())) {
      setFormError('Son tarih YYYY-AA-GG biçiminde, geçerli bir tarih olmalı (örn. 2026-11-06).');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createAssignment(classId, unitId, deadline.trim());
      setUnitId(null);
      setDeadline(nextFridayIso(new Date()));
      onChanged();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (assignment: AssignmentDoc, unitTitle: string) =>
    showAlert('Ödevi sil', `“${unitTitle}” ödevi silinsin mi? Öğrencilerin ekranından da kalkar.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(assignment.id);
            try {
              await deleteAssignment(assignment.id);
              onChanged();
            } finally {
              setDeleting(null);
            }
          })();
        },
      },
    ]);

  return (
    <View style={styles.section}>
      <View style={[styles.form, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Heading>Ödev ver</Heading>
        <Caption color={colors.textMuted}>Ünite</Caption>
        <View style={styles.chips}>
          {(course?.units ?? []).map((unit) => (
            <Pressable
              key={unit.id}
              accessibilityRole="button"
              accessibilityLabel={`Ünite ${unit.order}: ${unit.title}`}
              accessibilityState={{ selected: unit.id === unitId }}
              onPress={() => setUnitId(unit.id)}
              style={[styles.chip, { borderColor: unit.id === unitId ? colors.primary : colors.borderStrong, backgroundColor: unit.id === unitId ? colors.primary : 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: unit.id === unitId ? colors.textOnBrand : colors.text }]}>{upperTr(`Ünite ${unit.order}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Caption color={colors.textMuted}>Son tarih (YYYY-AA-GG)</Caption>
        <TextInput
          value={deadline}
          onChangeText={setDeadline}
          placeholder="2026-11-06"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={10}
          accessibilityLabel="Son tarih"
          style={[styles.input, { borderColor: colors.borderStrong, color: colors.text, fontFamily: fonts.mono }]}
        />
        {formError && <Caption color={colors.dangerText}>{formError}</Caption>}
        <Button title="Ödevi oluştur" loading={busy} onPress={() => void submit()} accessibilityLabel="Ödevi oluştur" />
      </View>

      {assignments.length === 0 ? (
        <Caption color={colors.textMuted}>Henüz ödev yok. Yukarıdan ünite seçip son tarih belirle.</Caption>
      ) : (
        assignments.map((assignment) => {
          const unit = course?.units.find((u) => u.id === assignment.unitId);
          const unitTitle = unit ? `Ünite ${unit.order}: ${unit.title}` : assignment.unitId;
          const byStatus: Record<AssignmentStatus, string[]> = { bitti: [], devam: [], gecikti: [] };
          for (const member of members) {
            const { status } = assignmentStatus(course, assignment, member.completedLessons, today);
            byStatus[status].push(member.takmaAd);
          }
          const isOpen = expanded === assignment.id;
          return (
            <View key={assignment.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Body style={styles.flex} numberOfLines={1}>{unitTitle}</Body>
                <Button
                  title={isOpen ? 'Kapat' : 'Detay'}
                  variant="outline"
                  block={false}
                  onPress={() => setExpanded(isOpen ? null : assignment.id)}
                  accessibilityLabel={`${unitTitle} detayı`}
                />
              </View>
              <Caption color={colors.textMuted}>Son tarih: {assignment.sonTarih}</Caption>
              <View style={styles.counts}>
                {(Object.keys(STATUS_LABELS) as AssignmentStatus[]).map((status) => (
                  <Caption key={status} color={colors.textMuted} style={[styles.countItem, styles.mono]}>
                    {`${STATUS_LABELS[status]}: ${byStatus[status].length}`}
                  </Caption>
                ))}
              </View>
              {isOpen && (
                <View style={styles.detail}>
                  {(Object.keys(STATUS_LABELS) as AssignmentStatus[]).map((status) => (
                    <Caption key={status} color={colors.textMuted}>
                      {STATUS_LABELS[status]}: {byStatus[status].length > 0 ? byStatus[status].join(', ') : '—'}
                    </Caption>
                  ))}
                </View>
              )}
              <Button
                title="Ödevi sil"
                variant="danger"
                block={false}
                loading={deleting === assignment.id}
                onPress={() => confirmDelete(assignment, unitTitle)}
                accessibilityLabel={`${unitTitle} ödevini sil`}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  form: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, letterSpacing: 1, fontFamily: fonts.mono },
  input: { minHeight: 44, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  countItem: {},
  detail: { gap: 2 },
  mono: { fontFamily: fonts.mono },
});
