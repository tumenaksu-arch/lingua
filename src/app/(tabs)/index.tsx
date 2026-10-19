import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { activeLessonId, useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import { canStartLesson, localDateString, regenerate } from '@/domain';
import { Body, Caption, Heading, Hearts, PathNode, Screen, StreakFlame, XpBadge, colors, radii, spacing } from '@/ui';

const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', tr: '🇹🇷' };
/** Duolingo-style snake offsets for successive nodes in a unit. */
const SNAKE = [0, 44, 70, 44, 0, -44, -70, -44];

export default function LearnScreen() {
  const course = useAppStore((s) => s.course);
  const progress = useAppStore((s) => s.progress);
  const rawStats = useAppStore((s) => s.stats);
  const now = useNow();
  const stats = regenerate(rawStats, now);
  const active = activeLessonId(course, progress);
  const today = localDateString(new Date());

  return (
    <Screen padding={0} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/courses')} accessibilityRole="button" accessibilityLabel="Kurs değiştir" style={styles.flag}>
          <Body>{LANG_FLAG[course.toLang] ?? '🌐'}</Body>
        </Pressable>
        <StreakFlame streak={stats.streak} active={stats.lastActiveDate === today} />
        <XpBadge xp={stats.xp} />
        <Hearts hearts={stats.hearts} />
      </View>

      <ScrollView contentContainerStyle={styles.path}>
        {course.units.map((unit, ui) => {
          const unitDone = unit.lessons.every((l) => progress[l.id]?.completedAt);
          return (
            <View key={unit.id} style={styles.unit}>
              <View style={[styles.unitHeader, { backgroundColor: unitDone ? colors.warning : colors.primary }]}>
                <Caption color={colors.textOnColor}>BÖLÜM {ui + 1}</Caption>
                <Heading color={colors.textOnColor}>{unit.title}</Heading>
                <Body color={colors.textOnColor}>{unit.description}</Body>
              </View>
              {unit.lessons.map((lesson, li) => {
                const p = progress[lesson.id];
                const isActive = lesson.id === active;
                const state = p?.completedAt ? 'completed' : isActive ? 'active' : 'locked';
                return (
                  <PathNode
                    key={lesson.id}
                    state={state}
                    crowns={p?.crowns ?? 0}
                    offsetX={SNAKE[li % SNAKE.length]}
                    tooltip={isActive ? 'BAŞLA' : undefined}
                    accessibilityLabel={`${unit.title} ders ${li + 1}`}
                    onPress={() => {
                      if (state === 'active' && !canStartLesson(stats, now)) {
                        router.push('/profile');
                        return;
                      }
                      router.push({ pathname: '/lesson/[id]', params: { id: lesson.id, mode: state === 'completed' ? 'practice' : undefined } });
                    }}
                    style={styles.node}
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border },
  flag: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  path: { paddingBottom: spacing.xxxl },
  unit: { alignItems: 'center', paddingBottom: spacing.xl },
  unitHeader: { alignSelf: 'stretch', margin: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, gap: 4 },
  node: { marginVertical: spacing.sm },
});
