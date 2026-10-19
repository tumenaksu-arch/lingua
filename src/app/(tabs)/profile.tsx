import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { FREEZE_EVERY_DAYS, MAX_HEARTS, MAX_STREAK_FREEZES, msUntilNextHeart, regenerate } from '@/domain';
import { isFirebaseConfigured } from '@/data';
import { useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import { Body, Button, Caption, Heading, ProgressBar, Screen, Title, colors, radii, spacing } from '@/ui';

const GOALS = [10, 20, 30, 50];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Heading>{value}</Heading>
      <Caption color={colors.textMuted}>{label}</Caption>
    </View>
  );
}

export default function ProfileScreen() {
  const rawStats = useAppStore((s) => s.stats);
  const user = useAppStore((s) => s.user);
  const course = useAppStore((s) => s.course);
  const syncing = useAppStore((s) => s.syncing);
  const lastSyncError = useAppStore((s) => s.lastSyncError);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const sync = useAppStore((s) => s.sync);
  const signOut = useAppStore((s) => s.signOut);

  const now = useNow();
  const stats = regenerate(rawStats, now);
  const nextHeartMin = stats.hearts < MAX_HEARTS ? Math.ceil(msUntilNextHeart(stats, now) / 60000) : 0;
  const cloud = isFirebaseConfigured();

  return (
    <Screen padding={0}>
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
              onPress={() => Alert.alert('Çıkış', 'Hesaptan çıkılsın mı?', [{ text: 'Vazgeç' }, { text: 'Çık', style: 'destructive', onPress: () => void signOut() }])}
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
  stat: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center' },
  goals: { flexDirection: 'row', gap: spacing.sm },
});
