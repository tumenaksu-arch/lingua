import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  deleteAnnouncement,
  postAnnouncement,
  type AnnouncementDoc,
} from '@/data/remote/classes';
import { relativeTimeLabel } from '@/features/teacher/shared';
import { Body, Button, Caption, fonts, radii, showAlert, spacing, useTheme } from '@/ui';

const MAX_LENGTH = 500;

/**
 * DUYURULAR tab: one-way teacher → class announcements (0003). Max 500 chars,
 * no editing (a correction is delete + new), students cannot reply — they see
 * the newest one on their home card and the full list on their class screen.
 */
export function AnnouncementsTab({
  classId,
  announcements,
  onChanged,
}: {
  classId: string;
  announcements: AnnouncementDoc[];
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const [metin, setMetin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const now = new Date();

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await postAnnouncement(classId, metin);
      setMetin('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (announcement: AnnouncementDoc) =>
    showAlert('Duyuruyu sil', 'Bu duyuru silinsin mi? Öğrencilerin ekranından da kalkar.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(announcement.id);
            try {
              await deleteAnnouncement(announcement.id);
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
        <TextInput
          value={metin}
          onChangeText={setMetin}
          placeholder="Duyuru yaz…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_LENGTH}
          accessibilityLabel="Duyuru metni"
          style={[styles.input, { borderColor: colors.borderStrong, color: colors.text }]}
        />
        <View style={styles.metaRow}>
          <Caption color={colors.textMuted}>{metin.trim().length}/{MAX_LENGTH}</Caption>
          <Button
            title="Gönder"
            block={false}
            loading={busy}
            disabled={metin.trim().length === 0}
            onPress={() => void submit()}
            accessibilityLabel="Duyuruyu gönder"
          />
        </View>
        {error && <Caption color={colors.dangerText}>{error}</Caption>}
      </View>
      <Caption color={colors.textMuted}>Öğrenciler duyuruyu ana sayfalarında görür; yanıt veremez.</Caption>

      {announcements.length === 0 ? (
        <Caption color={colors.textMuted}>Henüz duyuru yok.</Caption>
      ) : (
        announcements.map((announcement) => (
          <View key={announcement.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Body>{announcement.metin}</Body>
            <View style={styles.metaRow}>
              <Caption color={colors.textMuted}>{relativeTimeLabel(announcement.createdAt, now)}</Caption>
              <Button
                title="Sil"
                variant="danger"
                block={false}
                loading={deleting === announcement.id}
                onPress={() => confirmDelete(announcement)}
                accessibilityLabel="Duyuruyu sil"
                style={styles.deleteBtn}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  form: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  input: { minHeight: 96, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontSize: 16, textAlignVertical: 'top' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  deleteBtn: { paddingHorizontal: spacing.md },
  monoNote: { fontFamily: fonts.mono },
});
