import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { courses } from '@/content';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, ChoiceCard, Screen, Title, colors, spacing } from '@/ui';

const LANG_NAME: Record<string, string> = { en: 'İngilizce', de: 'Almanca', es: 'İspanyolca', fr: 'Fransızca', tr: 'Türkçe' };
const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', tr: '🇹🇷' };

export default function CoursesScreen() {
  const current = useAppStore((s) => s.course);
  const selectCourse = useAppStore((s) => s.selectCourse);

  return (
    <Screen>
      <Title>Ne öğrenmek istiyorsun?</Title>
      <Body color={colors.textMuted}>Her kursun ilerlemesi ayrı tutulur.</Body>
      <View style={styles.list}>
        {courses.map((c) => (
          <ChoiceCard
            key={c.id}
            label={`${LANG_FLAG[c.toLang] ?? '🌐'}  ${LANG_NAME[c.toLang] ?? c.toLang}`}
            state={c.id === current.id ? 'selected' : 'idle'}
            onPress={async () => {
              await selectCourse(c.id);
              router.back();
            }}
          />
        ))}
      </View>
      <Caption color={colors.textMuted}>{courses.length} kurs · kaynak dil: Türkçe</Caption>
      <View style={{ flex: 1 }} />
      <Button title="Kapat" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.md, marginVertical: spacing.xl } });
