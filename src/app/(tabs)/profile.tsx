import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ACHIEVEMENTS, FREEZE_EVERY_DAYS, MAX_HEARTS, MAX_STREAK_FREEZES, getAchievement, msUntilNextHeart, regenerate } from '@/domain';
import { isFirebaseConfigured } from '@/data';
import { cancelReminder, isSupported as remindersSupported, requestPermission, scheduleDailyReminder } from '@/features/notifications';
import { useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import {
  Body,
  Button,
  Caption,
  Heading,
  ProgressBar,
  Screen,
  Title,
  radii,
  setThemePreference,
  showAlert,
  spacing,
  useSettingsStore,
  useTheme,
  useThemeStore,
  type ThemePreference,
} from '@/ui';

const GOALS = [10, 20, 30, 50];
const REMINDER_HOURS = [8, 12, 18, 20];
const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
];

/** Labels for the last 7 days ending today, oldest first. */
function lastSevenDayLabels(now: number): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    out.push(DAY_LABELS[(d.getDay() + 6) % 7]!);
  }
  return out;
}

function WeeklyBars({ values, labels }: { values: number[]; labels: string[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={styles.week} accessibilityRole="summary" accessibilityLabel={`Son 7 gün XP: ${values.join(', ')}`}>
      {values.map((v, i) => (
        <View key={i} style={styles.weekCol}>
          <Caption color={colors.textMuted}>{v}</Caption>
          <View style={[styles.weekTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.weekFill, { backgroundColor: colors.warning, height: `${Math.round((v / max) * 100)}%` }]} />
          </View>
          <Caption color={colors.textMuted}>{labels[i]}</Caption>
        </View>
      ))}
    </View>
  );
}

function Badge({ id, unlocked }: { id: string; unlocked: boolean }) {
  const { colors } = useTheme();
  const a = getAchievement(id);
  if (!a) return null;
  return (
    <View
      style={[styles.badge, { borderColor: colors.border }, !unlocked && [styles.badgeLocked, { backgroundColor: colors.surface }]]}
      accessibilityLabel={`${a.title}: ${a.description}${unlocked ? '' : ' (kilitli)'}`}
    >
      <Heading>{unlocked ? a.emoji : '🔒'}</Heading>
      <Caption center color={unlocked ? colors.text : colors.textMuted}>{a.title}</Caption>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { borderColor: colors.border }]}>
      <Heading>{value}</Heading>
      <Caption color={colors.textMuted}>{label}</Caption>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const themePreference = useThemeStore((s) => s.preference);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const rawStats = useAppStore((s) => s.stats);
  const user = useAppStore((s) => s.user);
  const course = useAppStore((s) => s.course);
  const syncing = useAppStore((s) => s.syncing);
  const lastSyncError = useAppStore((s) => s.lastSyncError);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const sync = useAppStore((s) => s.sync);
  const signOut = useAppStore((s) => s.signOut);
  const achievements = useAppStore((s) => s.achievements);
  const newAchievements = useAppStore((s) => s.newAchievements);
  const ackAchievements = useAppStore((s) => s.ackAchievements);
  const reminderHour = useAppStore((s) => s.reminderHour);
  const setReminderHour = useAppStore((s) => s.setReminderHour);
  const weeklyXp = useAppStore((s) => s.weeklyXp);

  const [week, setWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [reminderBusy, setReminderBusy] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void weeklyXp().then((w) => {
        if (alive) setWeek(w);
      });
      return () => {
        alive = false;
      };
    }, [weeklyXp]),
  );

  // One-time celebration for badges unlocked since the last acknowledgement.
  useEffect(() => {
    if (newAchievements.length === 0) return;
    const lines = newAchievements.map((id) => getAchievement(id)).filter(Boolean).map((a) => `${a!.emoji} ${a!.title} — ${a!.description}`);
    showAlert(newAchievements.length === 1 ? 'Yeni rozet!' : 'Yeni rozetler!', lines.join('\n'), [{ text: 'Süper', onPress: ackAchievements }]);
  }, [newAchievements, ackAchievements]);

  const changeReminder = async (hour: number | null) => {
    setReminderBusy(true);
    try {
      if (hour === null) {
        await cancelReminder();
        await setReminderHour(null);
        return;
      }
      if (!(await requestPermission())) {
        showAlert('Bildirim izni yok', 'Hatırlatma için ayarlardan Lingua bildirimlerine izin ver.');
        return;
      }
      if (await scheduleDailyReminder(hour, 0)) await setReminderHour(hour);
      else showAlert('Hatırlatma kurulamadı', 'Bu cihazda zamanlanmış bildirim desteklenmiyor olabilir.');
    } finally {
      setReminderBusy(false);
    }
  };

  const now = useNow();
  const stats = regenerate(rawStats, now);
  const nextHeartMin = stats.hearts < MAX_HEARTS ? Math.ceil(msUntilNextHeart(stats, now) / 60000) : 0;
  const cloud = isFirebaseConfigured();

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Profil</Title>
        <Body color={colors.textMuted}>{user?.email ?? 'Misafir (yalnızca bu cihaz)'}</Body>

        <View style={styles.statsRow}>
          <Stat label="Seri" value={`🔥 ${stats.streak}`} />
          <Stat label="Toplam XP" value={`⚡ ${stats.xp}`} />
          <Stat label="Kalp" value={`❤️ ${stats.hearts}/${MAX_HEARTS}`} />
        </View>
        {nextHeartMin > 0 && <Caption color={colors.textMuted}>Sonraki kalp ~{nextHeartMin} dk sonra</Caption>}
        <Body>❄️ Seri dondurma: {stats.streakFreezes}/{MAX_STREAK_FREEZES}</Body>
        <Caption color={colors.textMuted}>Bir gün kaçırırsan serini korur. Her {FREEZE_EVERY_DAYS} günlük seride bir tane kazanırsın.</Caption>

        <Heading>Günlük hedef</Heading>
        <ProgressBar progress={Math.min(1, stats.xpToday / stats.dailyGoalXp)} color={colors.warning} />
        <Caption color={colors.textMuted}>{stats.xpToday} / {stats.dailyGoalXp} XP bugün</Caption>
        <View style={styles.goals}>
          {GOALS.map((g) => (
            <Button key={g} title={`${g} XP`} block={false} variant={g === stats.dailyGoalXp ? 'primary' : 'outline'} onPress={() => setDailyGoal(g)} style={{ flex: 1 }} />
          ))}
        </View>

        <Heading>Bu hafta</Heading>
        <WeeklyBars values={week} labels={lastSevenDayLabels(now)} />
        <Caption color={colors.textMuted}>Toplam {week.reduce((a, b) => a + b, 0)} XP · son 7 gün</Caption>

        <Heading>Rozetler ({achievements.length}/{ACHIEVEMENTS.length})</Heading>
        <View style={styles.badges}>
          {ACHIEVEMENTS.map((a) => (
            <Badge key={a.id} id={a.id} unlocked={achievements.includes(a.id)} />
          ))}
        </View>

        {remindersSupported() && (
          <>
            <Heading>Günlük hatırlatma</Heading>
            <View style={styles.row}>
              <Body>{reminderHour === null ? 'Kapalı' : `Her gün ${String(reminderHour).padStart(2, '0')}:00`}</Body>
              <Switch
                value={reminderHour !== null}
                disabled={reminderBusy}
                onValueChange={(on) => void changeReminder(on ? 20 : null)}
                accessibilityLabel="Günlük hatırlatma"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            {reminderHour !== null && (
              <View style={styles.goals}>
                {REMINDER_HOURS.map((h) => (
                  <Button key={h} title={`${String(h).padStart(2, '0')}:00`} block={false} variant={h === reminderHour ? 'primary' : 'outline'} disabled={reminderBusy} onPress={() => void changeReminder(h)} style={{ flex: 1 }} />
                ))}
              </View>
            )}
          </>
        )}

        <Heading>Görünüm ve ses</Heading>
        <View style={styles.goals}>
          {THEMES.map((t) => (
            <Button
              key={t.value}
              title={t.label}
              block={false}
              variant={t.value === themePreference ? 'primary' : 'outline'}
              onPress={() => void setThemePreference(t.value)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <View style={styles.row}>
          <Body>Ses efektleri</Body>
          <Switch
            value={soundEnabled}
            onValueChange={(on) => void setSoundEnabled(on)}
            accessibilityLabel="Ses efektleri"
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <Heading>Kurs</Heading>
        <Body>{course.title}</Body>
        <Button title="Kurs değiştir" variant="outline" onPress={() => router.push('/courses')} />

        <Heading>Hesap</Heading>
        {!cloud ? (
          <Caption color={colors.textMuted}>Bulut senkronu kapalı: .env dosyasında EXPO_PUBLIC_FIREBASE_* değerlerini tanımlayın (docs/SETUP.md).</Caption>
        ) : user ? (
          <>
            <Button title={syncing ? 'Senkronize ediliyor…' : 'Şimdi senkronize et'} variant="secondary" loading={syncing} onPress={sync} />
            {lastSyncError && <Caption color={colors.danger}>Senkron hatası: {lastSyncError}</Caption>}
            <Button
              title="Çıkış yap"
              variant="danger"
              onPress={() => showAlert('Çıkış', 'Hesaptan çıkılsın mı?', [{ text: 'Vazgeç' }, { text: 'Çık', style: 'destructive', onPress: () => void signOut() }])}
            />
          </>
        ) : (
          <Button title="Giriş yap / Kayıt ol" onPress={() => router.push('/auth')} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md },
  stat: { flex: 1, borderWidth: 2, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center' },
  goals: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  week: { flexDirection: 'row', gap: spacing.xs, height: 120, alignItems: 'flex-end' },
  weekCol: { flex: 1, alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' },
  weekTrack: { width: '100%', flex: 1, borderRadius: radii.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  weekFill: { width: '100%', borderRadius: radii.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: '30%', flexGrow: 1, borderWidth: 2, borderRadius: radii.lg, padding: spacing.sm, alignItems: 'center', gap: 2, minHeight: 72 },
  badgeLocked: { opacity: 0.5 },
});
