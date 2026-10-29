import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { getCourse } from '@/content';
import { activeLessonId, useAppStore } from '@/features/store';
import { assignmentStatus } from '@/features/classes/assignmentStatus';
import { useClassStore } from '@/features/classes/classStore';
import { dueLabel, pickHomeClass, relativeTime } from '@/features/classes/classView';
import { useNow } from '@/features/useNow';
import type { QuestStatus } from '@/features/quests';
import { localDateString, gemsOf, regenerate } from '@/domain';
import { getUnitNote } from '@/content/notes';
import { getUnitStory } from '@/content/stories';
import { Body, Button, Caption, GemChip, Heading, Hearts, PathNode, ProgressBar, Screen, StreakFlame, XpBadge, XpBoostChip, showAlert, spacing, upperTr, useTheme, type PathNodeState } from '@/ui';

const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', it: '🇮🇹', tr: '🇹🇷' };
const LANG_NAME: Record<string, string> = { en: 'İngilizce', de: 'Almanca', es: 'İspanyolca', fr: 'Fransızca', it: 'İtalyanca', tr: 'Türkçe' };
/** Node width — the vertical connector line runs through the node centres. */
const NODE_SIZE = 44;
/** Screen-reader state suffix for each lesson row — keep in sync with PathNode's STATE_LABEL. */
const STATE_TR: Record<PathNodeState, string> = { locked: 'kilitli', active: 'başlanabilir', completed: 'tamamlandı' };
/** Mono small-caps state label shown next to each lesson. */
const STATE_CHIP: Record<PathNodeState, string> = { locked: 'KİLİTLİ', active: 'BAŞLA', completed: 'TAMAMLANDI' };

export default function LearnScreen() {
  const course = useAppStore((s) => s.course);
  const progress = useAppStore((s) => s.progress);
  const rawStats = useAppStore((s) => s.stats);
  const { colors } = useTheme();
  const now = useNow();
  const stats = regenerate(rawStats, now);
  const active = activeLessonId(course, progress);
  const today = localDateString(new Date(now));

  // Day-rollover refresh: the store only refreshes on activity, so an app left
  // open overnight would show yesterday's quests all day. useNow ticks on every
  // focus; when the stored quest date falls behind the local day, recompute.
  const questDate = useAppStore((s) => s.questDate);
  const refreshQuests = useAppStore((s) => s.refreshQuests);
  useEffect(() => {
    if (questDate !== null && questDate !== today) void refreshQuests();
  }, [questDate, today, refreshQuests]);

  return (
    <Screen padding={0} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.push('/courses')}
          accessibilityRole="button"
          accessibilityLabel={`Kurs: ${LANG_NAME[course.toLang] ?? course.toLang}. Kurs değiştir`}
          style={styles.flag}
        >
          <Body accessible={false}>{LANG_FLAG[course.toLang] ?? '🌐'}</Body>
        </Pressable>
        <StreakFlame streak={stats.streak} active={stats.lastActiveDate === today} />
        <GemChip gems={gemsOf(stats)} onPress={() => router.push('/shop')} />
        <XpBadge xp={stats.xp} />
        <Hearts hearts={stats.hearts} />
      </View>

      {/* İş 3A: çift XP etkinse üstte geri sayım çipi. */}
      {stats.xpBoostUntil !== undefined ? <XpBoostChip until={stats.xpBoostUntil} style={styles.boostChip} /> : null}

      <ScrollView contentContainerStyle={styles.path}>
        <ClassCard />
        <DailyQuestsCard />
        {active === null && (
          <View style={[styles.doneBanner, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="summary">
            <Heading>🏆 Kursu tamamladın!</Heading>
            <Body color={colors.textMuted}>Dersleri pratik modunda tekrar edebilir veya kurs değiştirebilirsin.</Body>
            <Button title="Kurs değiştir" variant="secondary" onPress={() => router.push('/courses')} />
          </View>
        )}
        {course.units.map((unit, ui) => {
          const unitDone = unit.lessons.every((l) => progress[l.id]?.completedAt);
          const story = getUnitStory(unit.id);
          return (
            <View key={unit.id} style={styles.unit}>
              <View style={[styles.unitHeader, { backgroundColor: colors.surface, borderColor: unitDone ? colors.warning : colors.border }]}>
                <View
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`Bölüm ${ui + 1}, ${unit.title}${unitDone ? ', tamamlandı' : ''}. ${unit.description}`}
                >
                  <Caption color={colors.primaryText}>{upperTr(`Bölüm ${ui + 1}`)}</Caption>
                  <Heading>{unit.title}</Heading>
                  <Body color={colors.textMuted}>{unit.description}</Body>
                </View>
                <View style={styles.chipRow}>
                  {getUnitNote(unit.id) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${unit.title} notları`}
                      onPress={() => router.push({ pathname: '/notes/[unitId]', params: { unitId: unit.id } })}
                      style={({ pressed }) => [styles.notesChip, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Body color={colors.primaryText}>Notlar</Body>
                    </Pressable>
                  ) : null}
                  {!unitDone ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${unit.title} ünitesini atla`}
                      onPress={() =>
                        showAlert(
                          'Ünite atlama sınavı',
                          '12 soruluk sınav. %80 ve üstü alırsan ünitenin dersleri tamamlanmış sayılır.',
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            {
                              text: 'Sınava başla',
                              onPress: () => router.push({ pathname: '/skip/[unitId]', params: { unitId: unit.id } }),
                            },
                          ],
                        )
                      }
                      style={({ pressed }) => [styles.notesChip, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Body color={colors.primaryText}>Atla</Body>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.lessons}>
                <View style={[styles.track, { backgroundColor: colors.border }]} pointerEvents="none" />
                {unit.lessons.map((lesson, li) => {
                  const p = progress[lesson.id];
                  const isActive = lesson.id === active;
                  const state: PathNodeState = p?.completedAt ? 'completed' : isActive ? 'active' : 'locked';
                  const crowns = p?.crowns ?? 0;
                  const label = `${unit.title} ders ${li + 1}, ${STATE_TR[state]}${crowns ? `, ${crowns} taç` : ''}`;
                  const chipColor = state === 'completed' ? colors.successText : state === 'active' ? colors.primaryText : colors.textMuted;
                  return (
                    <Pressable
                      key={lesson.id}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ disabled: state === 'locked' }}
                      disabled={state === 'locked'}
                      onPress={() => {
                        // Always open the lesson; its OutOfHearts screen explains the
                        // no-heart case instead of silently redirecting away.
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        router.push({ pathname: '/lesson/[id]', params: { id: lesson.id, mode: state === 'completed' ? 'practice' : undefined } });
                      }}
                      style={({ pressed }) => [styles.lesson, pressed && state !== 'locked' && styles.pressed]}
                    >
                      {/* Visual node only: the row above is the single accessibility element. */}
                      <View style={styles.nodeCol} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <PathNode state={state} crowns={crowns} label={String(li + 1)} style={styles.node} />
                      </View>
                      {/* Decorative texts: the row Pressable above is the single
                          accessibility element announcing the full label. */}
                      <View style={styles.lessonText} accessible={false}>
                        <Body accessible={false}>Ders {li + 1}</Body>
                        <Caption accessible={false} color={chipColor}>{STATE_CHIP[state]}</Caption>
                      </View>
                    </Pressable>
                  );
                })}
                {story ? (() => {
                  const storyId = `${unit.id}.story`;
                  const sp = progress[storyId];
                  const state: PathNodeState = sp?.completedAt ? 'completed' : unitDone ? 'active' : 'locked';
                  const label = `${unit.title} hikâyesi, ${STATE_TR[state]}`;
                  const chipColor = state === 'completed' ? colors.successText : state === 'active' ? colors.primaryText : colors.textMuted;
                  return (
                    <Pressable
                      key={storyId}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ disabled: state === 'locked' }}
                      disabled={state === 'locked'}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        router.push({ pathname: '/story/[unitId]', params: { unitId: unit.id } });
                      }}
                      style={({ pressed }) => [styles.lesson, pressed && state !== 'locked' && styles.pressed]}
                    >
                      {/* Visual node only: the row above is the single accessibility element. */}
                      <View style={styles.nodeCol} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <PathNode state={state} label="📖" style={styles.node} />
                      </View>
                      {/* Decorative texts: the row Pressable above is the single
                          accessibility element announcing the full label. */}
                      <View style={styles.lessonText} accessible={false}>
                        <Body accessible={false}>Hikâye: {story.title}</Body>
                        <Caption accessible={false} color={chipColor}>{STATE_CHIP[state]}</Caption>
                      </View>
                    </Pressable>
                  );
                })() : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

/** Compact class card (madde 5): active assignments + the latest announcement, above the quests card. */
function ClassCard() {
  const course = useAppStore((s) => s.course);
  const progress = useAppStore((s) => s.progress);
  const myClasses = useClassStore((s) => s.myClasses);
  const assignments = useClassStore((s) => s.assignments);
  const announcements = useClassStore((s) => s.announcements);
  const load = useClassStore((s) => s.load);
  const classError = useClassStore((s) => s.error);
  const joinNote = useClassStore((s) => s.joinNote);
  const { colors } = useTheme();
  const now = useNow();

  // Refresh on every focus so a deadline flip or a new announcement shows up.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cls = pickHomeClass(myClasses, course.id);
  // A rejected memberships read (RLS/session/network) must be visible — never
  // silently indistinguishable from "not in any class".
  if (!cls && classError) {
    return (
      <View style={[styles.classCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Caption color={colors.dangerText}>{classError}</Caption>
      </View>
    );
  }
  if (!cls) return null;
  const clsCourse = getCourse(cls.courseId);
  const completedIds = Object.keys(progress).filter((id) => progress[id]?.completedAt);
  const today = new Date();
  const open = (assignments[cls.classId] ?? [])
    .map((a) => ({ a, st: assignmentStatus(clsCourse, a, completedIds, today) }))
    .filter((r) => r.st.status !== 'bitti');
  const latest = (announcements[cls.classId] ?? [])[0];
  return (
    <View style={[styles.classCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {classError && <Caption color={colors.dangerText}>{classError}</Caption>}
      {joinNote && <Caption color={colors.successText}>{joinNote}</Caption>}
      <Caption color={colors.primaryText}>{upperTr(`Sınıf · ${cls.ad}`)}</Caption>
      {open.length === 0 ? (
        <Caption color={colors.textMuted}>Ödev yok. Böyle devam et!</Caption>
      ) : (
        open.map(({ a, st }) => {
          const unit = clsCourse?.units.find((u) => u.id === a.unitId);
          const overdue = st.status === 'gecikti';
          return (
            <View
              key={a.id}
              style={styles.classRow}
              accessibilityLabel={`Ödev: ${unit?.title ?? a.unitId}, ${overdue ? 'gecikti' : dueLabel(a.sonTarih, today)}`}
            >
              <Body style={styles.classTitle} numberOfLines={1}>
                Ödev: {unit?.title ?? a.unitId}
              </Body>
              <Caption color={overdue ? colors.dangerText : colors.textMuted}>
                {overdue ? 'gecikti' : dueLabel(a.sonTarih, today)}
              </Caption>
            </View>
          );
        })
      )}
      {latest && (
        <View style={styles.announcement}>
          <Caption color={colors.textMuted} numberOfLines={2}>
            📢 {latest.metin}
          </Caption>
          <Caption color={colors.textMuted}>{relativeTime(latest.createdAt, now)}</Caption>
        </View>
      )}
      <Button title="Sınıfa git" variant="outline" onPress={() => router.push({ pathname: '/sinif/[classId]', params: { classId: cls.classId } })} />
    </View>
  );
}

/** Compact daily-quests card shown above the learning path on the home tab. */
function DailyQuestsCard() {
  const quests = useAppStore((s) => s.quests);
  const claimQuest = useAppStore((s) => s.claimQuest);
  const { colors } = useTheme();
  if (quests.length === 0) return null;
  return (
    <View style={[styles.questCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Caption color={colors.primaryText}>{upperTr('Günlük görevler')}</Caption>
      {quests.map((q) => (
        <QuestRow key={q.id} quest={q} onClaim={() => void claimQuest(q.id)} />
      ))}
    </View>
  );
}

function QuestRow({ quest, onClaim }: { quest: QuestStatus; onClaim: () => void }) {
  const { colors } = useTheme();
  const claiming = useAppStore((s) => s.claimingQuestIds.includes(quest.id));
  return (
    <View style={styles.questRow}>
      <View style={styles.questMain}>
        <View style={styles.questTitleRow}>
          <Body numberOfLines={1} style={styles.questTitle}>{quest.title}</Body>
          <Caption color={colors.textMuted}>{`${quest.current}/${quest.target}`}</Caption>
        </View>
        <ProgressBar
          progress={quest.target > 0 ? quest.current / quest.target : 0}
          height={4}
          accessibilityLabel={`${quest.title}: ${quest.current}/${quest.target}`}
        />
      </View>
      {quest.claimed ? (
        <Caption color={colors.successText}>✓ Alındı</Caption>
      ) : quest.done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${quest.title} ödülünü al`}
          accessibilityState={{ disabled: claiming }}
          disabled={claiming}
          onPress={onClaim}
          style={({ pressed }) => [styles.claimBtn, { borderColor: colors.primary, opacity: pressed || claiming ? 0.5 : 1 }]}
        >
          <Caption color={colors.primaryText}>{upperTr('Ödülü al')}</Caption>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  boostChip: { alignSelf: 'flex-start', marginTop: spacing.sm, marginLeft: spacing.lg },
  flag: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  path: { paddingBottom: spacing.xxxl },
  questCard: { margin: spacing.lg, marginBottom: 0, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.md },
  classCard: { margin: spacing.lg, marginBottom: 0, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  classRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  classTitle: { flexShrink: 1 },
  announcement: { gap: 2 },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  questMain: { flex: 1, gap: spacing.xs },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  questTitle: { flexShrink: 1 },
  claimBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  doneBanner: { margin: spacing.lg, marginBottom: 0, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  unit: { paddingBottom: spacing.lg },
  unitHeader: { margin: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  notesChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  lessons: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  track: { position: 'absolute', left: NODE_SIZE / 2, top: 30, bottom: 30, width: 1 },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  pressed: { opacity: 0.8 },
  nodeCol: { width: NODE_SIZE, alignItems: 'center' },
  node: { paddingVertical: spacing.xs },
  lessonText: { gap: 2 },
});
