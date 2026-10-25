import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';

import { ACHIEVEMENTS, FREEZE_EVERY_DAYS, MAX_HEARTS, MAX_STREAK_FREEZES, getAchievement, msUntilNextHeart, regenerate } from '@/domain';
import { authErrorMessage, isSupabaseConfigured } from '@/data';
import { isAnonymousSession } from '@/data/remote/classes';
import { AddEmailForm, AnonymousAccountNote } from '@/features/classes/AddEmailForm';
import { useClassStore } from '@/features/classes/classStore';
import { speak } from '@/speech';
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
  SLOW_RATES,
  setThemePreference,
  showAlert,
  spacing,
  fonts,
  upperTr,
  useSettingsStore,
  useTheme,
  useThemeStore,
  type ThemePreference,
} from '@/ui';

const GOALS = [10, 20, 30, 50];

const SLOW_SAMPLES: Record<string, string> = {
  en: 'Hello, how are you today?',
  de: 'Hallo, wie geht es dir heute?',
  es: 'Hola, ¿cómo estás hoy?',
  fr: "Bonjour, comment ça va aujourd'hui ?",
  it: 'Ciao, come stai oggi?',
};
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
      style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.surface }, !unlocked && styles.badgeLocked]}
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
    <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Heading>{value}</Heading>
      <Caption color={colors.textMuted}>{label}</Caption>
    </View>
  );
}

/** Compact selectable mono chip (daily goal, theme, slow-rate) — hairline outline, flat fill when selected. */
function Chip({
  label,
  selected,
  onPress,
  disabled,
  accessibilityLabel,
  haptic = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Fire the same light haptic tick as ui Button on press (parity for chips that replaced Buttons). */
  haptic?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : 'transparent', borderColor: selected ? colors.primary : colors.borderStrong }]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.textOnBrand : colors.text }]} maxFontSizeMultiplier={1.6}>
        {upperTr(label)}
      </Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const themePreference = useThemeStore((s) => s.preference);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const slowRate = useSettingsStore((s) => s.slowRate);
  const setSlowRate = useSettingsStore((s) => s.setSlowRate);
  const relaxedHearts = useSettingsStore((s) => s.relaxedHearts);
  const setRelaxedHearts = useSettingsStore((s) => s.setRelaxedHearts);
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
  const myClasses = useClassStore((s) => s.myClasses);
  const leaveClass = useClassStore((s) => s.leave);
  const loadClasses = useClassStore((s) => s.load);
  const [anonymous, setAnonymous] = useState(false);
  const [addEmailOpen, setAddEmailOpen] = useState(false);

  // Anonymous class accounts (no e-mail) get the "add e-mail to keep the
  // account" note and a softer sign-out warning.
  useEffect(() => {
    let alive = true;
    if (user) {
      void isAnonymousSession().then((v) => {
        if (alive) setAnonymous(v);
      });
    }
    return () => {
      alive = false;
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadClasses();
    }, [loadClasses]),
  );

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
        showAlert('Bildirim izni yok', 'Hatırlatma için ayarlardan Love-Vox bildirimlerine izin ver.');
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
  const cloud = isSupabaseConfigured();

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
        <View style={styles.chips}>
          {GOALS.map((g) => (
            <Chip key={g} label={`${g} XP`} selected={g === stats.dailyGoalXp} haptic onPress={() => setDailyGoal(g)} />
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

        <Heading>Öğrenme</Heading>
        <View style={styles.row}>
          <Body>Rahat mod (kalp sınırı yok)</Body>
          <Switch
            value={relaxedHearts}
            onValueChange={(on) => void setRelaxedHearts(on)}
            accessibilityLabel="Rahat mod"
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <Caption color={colors.textMuted}>Açıkken yanlış cevaplarda kalp gitmez; tüm dersleri sırayla, beklemeden geçebilirsin.</Caption>

        <Heading>Görünüm ve ses</Heading>
        <View style={styles.chips}>
          {THEMES.map((t) => (
            <Chip key={t.value} label={t.label} selected={t.value === themePreference} haptic onPress={() => void setThemePreference(t.value)} />
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
        <View style={styles.row}>
          <Body>Yavaş seslendirme hızı</Body>
          <Caption color={colors.textMuted}>%{Math.round(slowRate * 100)}</Caption>
        </View>
        <View style={styles.chips}>
          {SLOW_RATES.map((r) => (
            <Chip
              key={r}
              label={`%${Math.round(r * 100)}`}
              accessibilityLabel={`Yavaş hız yüzde ${Math.round(r * 100)}`}
              selected={r === slowRate}
              onPress={() => void setSlowRate(r)}
            />
          ))}
        </View>
        <Button
          title="Dene 🐢"
          variant="outline"
          accessibilityLabel="Yavaş hızı dene"
          onPress={() => {
            const sample = SLOW_SAMPLES[course.toLang];
            if (sample) void speak(sample, course.toLang, { rate: slowRate });
          }}
        />

        <Heading>Kurs</Heading>
        <Body>{course.title}</Body>
        <Button title="Kurs değiştir" variant="outline" onPress={() => router.push('/courses')} />

        {cloud && user?.email && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Öğretmen paneli"
            onPress={() => router.push('/ogretmen')}
            style={[styles.teacherRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.teacherText}>
              <Body>Öğretmen paneli</Body>
              <Caption color={colors.textMuted}>Sınıf aç, ödev ver, duyuru yap, ilerlemeyi izle.</Caption>
            </View>
            <Caption color={colors.textMuted}>›</Caption>
          </Pressable>
        )}

        <Heading>Sınıfım</Heading>
        {myClasses.length === 0 ? (
          <>
            <Caption color={colors.textMuted}>Henüz bir sınıfa katılmadın. Öğretmeninin koduyla sınıfına katıl.</Caption>
            <Button title="Sınıfa katıl" variant="outline" onPress={() => router.push('/sinif-katil')} />
          </>
        ) : (
          myClasses.map((c) => (
            <View key={c.classId} style={styles.classCard}>
              <View style={styles.classInfo}>
                <Body>{c.ad}</Body>
                <Caption color={colors.textMuted}>Takma adın: {c.takmaAd}</Caption>
              </View>
              <Button
                title="Sınıftan ayrıl ve sınıf verimi sil"
                variant="danger"
                onPress={() =>
                  showAlert(
                    'Sınıftan ayrıl',
                    'Ayrılınca öğretmen seni ve öğrenme özetini (XP, biten dersler, seri) artık görmez; sınıf verin silinir.',
                    [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'Ayrıl',
                        style: 'destructive',
                        onPress: () => {
                          void leaveClass(c.classId).catch((e: unknown) => {
                            // A failed leave must be visible (airplane mode,
                            // RLS): the row stays until the server call works.
                            showAlert('Ayrılamadın', authErrorMessage(e));
                          });
                        },
                      },
                    ],
                  )
                }
              />
            </View>
          ))
        )}

        <Heading>Hesap</Heading>
        {user && anonymous && (
          <>
            <AnonymousAccountNote />
            {addEmailOpen ? (
              <AddEmailForm onDone={() => setAddEmailOpen(false)} />
            ) : (
              <Button title="E-posta ekle" variant="outline" onPress={() => setAddEmailOpen(true)} />
            )}
          </>
        )}
        {!cloud ? (
          <Caption color={colors.textMuted}>Bulut senkronu kapalı: .env dosyasında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini tanımlayın (docs/SETUP.md).</Caption>
        ) : user ? (
          <>
            <Button title={syncing ? 'Senkronize ediliyor…' : 'Şimdi senkronize et'} variant="secondary" loading={syncing} onPress={sync} />
            {lastSyncError && <Caption color={colors.danger}>Senkron hatası: {lastSyncError}</Caption>}
            <Button
              title="Çıkış yap"
              variant="danger"
              onPress={() =>
                showAlert(
                  'Çıkış',
                  anonymous
                    ? 'Bu hesap anonim: yalnızca bu cihazda durur. Çıkış yaparsan hesabın ve ilerlemen kalıcı olarak kaybolur. Kalıcı yapmak için önce e-posta ekle.'
                    : 'Hesaptan çıkılsın mı?',
                  [
                    { text: 'Vazgeç' },
                    {
                      text: anonymous ? 'Yine de çık' : 'Çık',
                      style: 'destructive',
                      onPress: () => void signOut(),
                    },
                  ],
                )
              }
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
  classCard: { gap: spacing.sm },
  classInfo: { gap: 2 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  goals: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, letterSpacing: 1, fontFamily: fonts.mono },
  week: { flexDirection: 'row', gap: spacing.xs, height: 120, alignItems: 'flex-end' },
  weekCol: { flex: 1, alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' },
  weekTrack: { width: '100%', flex: 1, borderRadius: radii.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  weekFill: { width: '100%', borderRadius: radii.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 10, padding: spacing.md, minHeight: 56 },
  teacherText: { flex: 1, gap: 2 },
  badge: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
    minHeight: 72,
  },
  badgeLocked: { opacity: 0.5 },
});
