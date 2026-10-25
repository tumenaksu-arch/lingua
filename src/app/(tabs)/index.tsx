import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { activeLessonId, useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import { localDateString, regenerate } from '@/domain';
import { getUnitNote } from '@/content/notes';
import { getUnitStory } from '@/content/stories';
import { Body, Button, Caption, Heading, Hearts, PathNode, Screen, StreakFlame, XpBadge, spacing, upperTr, useTheme, type PathNodeState } from '@/ui';

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
  const today = localDateString(new Date());

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
        <XpBadge xp={stats.xp} />
        <Hearts hearts={stats.hearts} />
      </View>

      <ScrollView contentContainerStyle={styles.path}>
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

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  flag: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  path: { paddingBottom: spacing.xxxl },
  doneBanner: { margin: spacing.lg, marginBottom: 0, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  unit: { paddingBottom: spacing.lg },
  unitHeader: { margin: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  notesChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  lessons: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  track: { position: 'absolute', left: NODE_SIZE / 2, top: 30, bottom: 30, width: 1 },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  pressed: { opacity: 0.8 },
  nodeCol: { width: NODE_SIZE, alignItems: 'center' },
  node: { paddingVertical: spacing.xs },
  lessonText: { gap: 2 },
});
