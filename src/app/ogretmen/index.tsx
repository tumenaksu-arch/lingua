import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAppStore } from '@/features/store';
import { TeacherHome } from '@/features/teacher/teacherHome';
import { Body, Button, Screen, spacing } from '@/ui';

/**
 * /ogretmen — the teacher panel. E-mail accounts only: guests and anonymous
 * student accounts get a friendly explanation plus a sign-in button instead
 * of the panel (RLS would reject their writes anyway).
 */
export default function OgretmenScreen() {
  const user = useAppStore((s) => s.user);

  if (!user || !user.email) {
    const message = !user
      ? 'Öğretmen paneli bir hesap gerektirir. Öğrenciler yalnızca takma adla görünür; e-posta adresin hiçbir yerde gösterilmez.'
      : 'Anonim öğrenci hesapları öğretmen panelini kullanamaz. Kalıcı bir hesapla giriş yap.';
    return (
      <Screen padding={0} edges={['top']}>
        <View style={styles.content}>
          <Body>{message}</Body>
          <Button title="Giriş yap" onPress={() => router.push('/auth')} />
        </View>
      </Screen>
    );
  }

  return <TeacherHome />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingTop: spacing.xxxl },
});
