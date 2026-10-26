import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { aiScenarios, aiStatus, type AiScenario } from '@/data/remote/ai';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, Heading, Screen, Title, fonts, radii, spacing, useTheme } from '@/ui';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; scenarios: AiScenario[]; remaining: number | null; limit: number };

/**
 * "Konuş" tab (roadmap item 6): AI role-play conversation practice. Guests get
 * an explanation with sign-in options; when the server flag is off a plain
 * coming-soon card is shown (no errors); otherwise the scenario list of the
 * current course is offered with the remaining daily turns.
 */
export default function KonusScreen() {
  const { colors } = useTheme();
  const user = useAppStore((s) => s.user);
  const course = useAppStore((s) => s.course);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  // Bumped by the retry button to re-run the fetch below (event handler, not an effect).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      try {
        const [status, scenarios] = await Promise.all([aiStatus(), aiScenarios(course.id)]);
        if (!alive) return;
        if (!status.enabled) {
          setState({ kind: 'ready', scenarios: [], remaining: null, limit: status.limit });
          return;
        }
        setState({ kind: 'ready', scenarios, remaining: status.remaining, limit: status.limit });
      } catch (e) {
        if (alive) setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, course.id, reloadKey]);

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title>Konuş</Title>
        </View>

        {!user ? (
          <View style={styles.section}>
            <Body color={colors.textMuted}>
              Yapay zekâ ile rol yaparak konuşma pratiği yap: kafede sipariş ver, otelde oda ayırt, yol tarifi al.
              Senaryo sonunda hataların Türkçe açıklamayla düzeltilir.
            </Body>
            <Button title="Giriş yap" onPress={() => router.push('/auth')} />
            <Button title="Sınıf koduyla katıl" variant="outline" onPress={() => router.push('/sinif-katil')} />
          </View>
        ) : state.kind === 'loading' ? (
          <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Yükleniyor" />
        ) : state.kind === 'error' ? (
          <View style={styles.section}>
            <Caption color={colors.dangerText}>{state.message}</Caption>
            <Button
              title="Tekrar dene"
              variant="outline"
              onPress={() => {
                setState({ kind: 'loading' });
                setReloadKey((k) => k + 1);
              }}
            />
          </View>
        ) : state.scenarios.length === 0 ? (
          <View style={[styles.soonCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Body>🗣️</Body>
            <Heading center>Konuşma pratiği yakında</Heading>
            <Body color={colors.textMuted} center>
              Yapay zekâ destekli konuşma alıştırmaları üzerinde çalışıyoruz. Çok yakında burada olacak!
            </Body>
          </View>
        ) : (
          <View style={styles.section}>
            {state.remaining !== null && (
              <Caption color={colors.primaryText} style={styles.remaining}>
                Bugün kalan: {state.remaining}/{state.limit}
              </Caption>
            )}
            {state.scenarios.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${s.titleTr}, seviye ${s.level}`}
                onPress={() => router.push({ pathname: '/konus/[scenarioId]', params: { scenarioId: s.id } })}
                style={({ pressed }) => [
                  styles.card,
                  { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Heading style={styles.cardTitle}>{s.titleTr}</Heading>
                  <View style={[styles.levelChip, { borderColor: colors.borderStrong }]}>
                    <Caption color={colors.primaryText} style={styles.levelText}>
                      {s.level}
                    </Caption>
                  </View>
                </View>
                <Body color={colors.textMuted}>{s.descriptionTr}</Body>
                <Caption color={colors.textMuted}>Hedef: {s.goalTr}</Caption>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.sm },
  remaining: { fontFamily: fonts.mono },
  soonCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { flex: 1 },
  levelChip: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  levelText: { fontFamily: fonts.mono },
});
