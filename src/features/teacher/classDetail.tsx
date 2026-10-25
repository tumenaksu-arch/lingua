import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getCourse } from '@/content';
import {
  archiveClass,
  classLeague,
  classProgress,
  classStruggles,
  listAnnouncements,
  listAssignments,
  listMyClasses,
  regenerateCode,
  type AnnouncementDoc,
  type AssignmentDoc,
  type LeagueRow,
  type ProgressRow,
  type StruggleRow,
} from '@/data/remote/classes';
import { AssignmentsTab } from '@/features/teacher/assignmentsTab';
import { AnnouncementsTab } from '@/features/teacher/announcementsTab';
import { LeagueTab } from '@/features/teacher/leagueTab';
import { StudentsTab } from '@/features/teacher/studentsTab';
import { StrugglesTab } from '@/features/teacher/strugglesTab';
import {
  Body,
  Button,
  Caption,
  Heading,
  Screen,
  Title,
  fonts,
  radii,
  showAlert,
  spacing,
  useTheme,
} from '@/ui';

const DAY_MS = 86_400_000;
const TABS = ['ÖĞRENCİLER', 'ÖDEVLER', 'DUYURULAR', 'ZORLANAN', 'LİG'] as const;
type Tab = (typeof TABS)[number];

/** Class detail (route /ogretmen/[classId]): header with the join code plus the five tabs. */
export function ClassDetail({ classId }: { classId: string }) {
  const { colors } = useTheme();
  const [cls, setCls] = useState<Awaited<ReturnType<typeof listMyClasses>>[number] | null | undefined>(undefined);
  const [members, setMembers] = useState<ProgressRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
  const [struggles, setStruggles] = useState<StruggleRow[]>([]);
  const [league, setLeague] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ÖĞRENCİLER');
  const [busyCode, setBusyCode] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listMyClasses();
      const found = docs.find((d) => d.id === classId) ?? null;
      setCls(found);
      if (!found) return;
      const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
      const [progressRows, assignmentRows, announcementRows, struggleRows, leagueRows] = await Promise.all([
        classProgress(classId),
        listAssignments(classId),
        listAnnouncements(classId),
        classStruggles(classId, since),
        classLeague(classId),
      ]);
      setMembers(progressRows);
      setAssignments(assignmentRows);
      setAnnouncements(announcementRows);
      setStruggles(struggleRows);
      setLeague(leagueRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Defer past the synchronous effect body (the lint rule forbids setState
  // directly in an effect; initial `loading` is already true and `load` is
  // also reachable from the Yenile button).
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (cls === undefined) {
    return (
      <Screen padding={0} edges={['top']}>
        <View style={styles.center}>
          <Caption color={colors.textMuted}>Yükleniyor…</Caption>
        </View>
      </Screen>
    );
  }

  if (cls === null) {
    return (
      <Screen padding={0} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Title>Öğretmen paneli</Title>
          <Body color={colors.textMuted}>Bu sınıf bulunamadı ya da arşivlendi.</Body>
          <Button title="Geri dön" variant="outline" onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    );
  }

  const course = getCourse(cls.courseId);

  const copyCode = async () => {
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(cls.joinCode);
        return;
      }
    } catch {
      // clipboard exists but rejected (e.g. Android WebView) — try the share sheet
    }
    try {
      await Share.share({ message: `Love-Vox sınıf kodu: ${cls.joinCode}` });
    } catch {
      // Neither clipboard nor share available: the code stays selectable on screen.
    }
  };

  const renewCode = () =>
    showAlert('Kodu yenile', 'Yeni bir kod üretilsin mi? Eski kod çalışmayı durdurur; öğrenciler yeni kodu kullanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Yenile',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyCode(true);
            try {
              const code = await regenerateCode(cls.id);
              if (code) setCls({ ...cls, joinCode: code });
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setBusyCode(false);
            }
          })();
        },
      },
    ]);

  const archive = () =>
    showAlert(
      'Sınıfı arşivle',
      'Arşivlenen sınıfın tüm üyelikleri silinir ve öğrencilerin sınıf verileri artık görünmez. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Arşivle',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setArchiving(true);
              try {
                await archiveClass(cls.id);
                router.back();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setArchiving(false);
              }
            })();
          },
        },
      ],
    );

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title>Öğretmen paneli</Title>
          <Button title="Yenile" variant="outline" block={false} loading={loading} onPress={() => void load()} />
        </View>

        <Heading>{cls.ad}</Heading>
        <Caption color={colors.textMuted}>{course?.title ?? cls.courseId}</Caption>

        <View style={[styles.codeCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Caption color={colors.textMuted}>Sınıf katılım kodu</Caption>
          <Text style={[styles.code, { color: colors.primaryText }]} accessibilityLabel={`Sınıf kodu ${cls.joinCode}`} selectable>
            {cls.joinCode}
          </Text>
          <View style={styles.codeButtons}>
            <Button title="Kopyala" variant="outline" block={false} onPress={() => void copyCode()} accessibilityLabel="Kodu kopyala" />
            <Button title="Kodu yenile" variant="outline" block={false} loading={busyCode} onPress={renewCode} accessibilityLabel="Kodu yenile" />
          </View>
        </View>

        <View style={styles.codeButtons}>
          <Button
            title="Sınıfı arşivle"
            variant="danger"
            block={false}
            loading={archiving}
            onPress={archive}
            accessibilityLabel="Sınıfı arşivle"
          />
        </View>

        {error && <Caption color={colors.dangerText}>{error}</Caption>}

        <View style={[styles.segment, { borderColor: colors.borderStrong }]} accessibilityRole="tablist">
          {TABS.map((t) => {
            const selected = t === tab;
            return (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(t)}
                style={[styles.segmentItem, { backgroundColor: selected ? colors.primary : 'transparent' }]}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.textOnBrand : colors.textMuted }]} numberOfLines={1}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'ÖĞRENCİLER' && <StudentsTab classId={cls.id} members={members} course={course} classCode={cls.joinCode} onChanged={() => void load()} />}
        {tab === 'ÖDEVLER' && <AssignmentsTab classId={cls.id} course={course} assignments={assignments} members={members} onChanged={() => void load()} />}
        {tab === 'DUYURULAR' && <AnnouncementsTab classId={cls.id} announcements={announcements} onChanged={() => void load()} />}
        {tab === 'ZORLANAN' && <StrugglesTab rows={struggles} course={course} />}
        {tab === 'LİG' && <LeagueTab rows={league} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  code: { fontFamily: fonts.mono, fontSize: 36, letterSpacing: 10 },
  codeButtons: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.pill, padding: 3 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  segmentText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5 },
});
