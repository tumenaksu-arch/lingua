import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/features/store';
import { ClassDetail } from '@/features/teacher/classDetail';
import { Body, Button, Screen, spacing } from '@/ui';

/** /ogretmen/[classId] — one class of the signed-in teacher (e-mail accounts only). */
export default function OgretmenClassScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const user = useAppStore((s) => s.user);

  if (!user || !user.email) {
    return (
      <Screen padding={0} edges={['top']}>
        <View style={styles.content}>
          <Body>Öğretmen paneli yalnızca e-postalı hesaplar içindir.</Body>
          <Button title="Giriş yap" onPress={() => router.push('/auth')} />
        </View>
      </Screen>
    );
  }

  return <ClassDetail classId={String(classId)} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingTop: spacing.xxxl },
});
