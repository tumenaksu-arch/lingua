import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { courses } from '@/content';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, ChoiceCard, ProgressBar, Screen, Title, colors, spacing } from '@/ui';

const LANG_NAME: Record<string, string> = { en: 'İngilizce', de: 'Almanca', es: 'İspanyolca', fr: 'Fransızca', tr: 'Türkçe' };
const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', tr: '🇹🇷' };
/** Duolingo-style daily goal tiers. */
const GOALS: { xp: number; label: string; hint: string }[] = [
  { xp: 10, label: 'Rahat', hint: '1 ders / gün' },
  { xp: 20, label: 'Normal', hint: '2 ders / gün' },
  { xp: 30, label: 'Ciddi', hint: '3 ders / gün' },
  { xp: 50, label: 'Yoğun', hint: '5 ders / gün' },
];

export default function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState<0 | 1>(0);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(20);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!courseId) return;
    setBusy(true);
    try {
      await completeOnboarding(courseId, goal);
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ProgressBar progress={step === 0 ? 0.5 : 1} />
      <View style={styles.body}>
        {step === 0 ? (
          <>
            <Title>Hangi dili öğrenmek istiyorsun?</Title>
            <Body color={colors.textMuted}>Daha sonra profilinden değiştirebilirsin.</Body>
            <View style={styles.list}>
              {courses.map((c) => (
                <ChoiceCard
                  key={c.id}
                  label={`${LANG_FLAG[c.toLang] ?? '🌐'}  ${LANG_NAME[c.toLang] ?? c.toLang}`}
                  state={c.id === courseId ? 'selected' : 'idle'}
                  onPress={() => setCourseId(c.id)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <Title>Günlük hedefini seç</Title>
            <Body color={colors.textMuted}>Bir ders yaklaşık 10 XP kazandırır.</Body>
            <View style={styles.list}>
              {GOALS.map((g) => (
                <ChoiceCard
                  key={g.xp}
                  label={`${g.label} · ${g.xp} XP`}
                  state={g.xp === goal ? 'selected' : 'idle'}
                  onPress={() => setGoal(g.xp)}
                />
              ))}
            </View>
            <Caption color={colors.textMuted}>{GOALS.find((g) => g.xp === goal)?.hint}</Caption>
          </>
        )}
      </View>
      {step === 0 ? (
        <Button title="Devam" disabled={!courseId} onPress={() => setStep(1)} />
      ) : (
        <View style={styles.actions}>
          <Button title="Geri" variant="outline" block={false} onPress={() => setStep(0)} />
          <Button title="Başla" loading={busy} onPress={finish} style={{ flex: 1 }} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xl, gap: spacing.sm },
  list: { gap: spacing.md, marginVertical: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
});
