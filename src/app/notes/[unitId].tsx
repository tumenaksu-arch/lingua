import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { backOrHome } from '@/features/nav/backOrHome';
import { courses } from '@/content';
import { getUnitNote } from '@/content/notes';
import type { LangCode } from '@/domain';
import { SpeakerButton } from '@/features/lesson/exercises/Prompt';
import { Body, Button, Caption, Heading, Screen, Title, spacing, upperTr, useTheme } from '@/ui';

type Params = { unitId: string };

/**
 * Unit grammar note, opened as a modal from the learning path ("Notlar" chip on the
 * unit header). Examples are spoken in the course's target language.
 */
export default function UnitNotesScreen() {
  const { unitId } = useLocalSearchParams<Params>();
  const note = getUnitNote(unitId);
  // The unit id is owned by exactly one bundled course; its toLang drives example TTS.
  const course = courses.find((c) => c.units.some((u) => u.id === unitId));
  const lang: LangCode = course?.toLang ?? 'en';
  const { colors } = useTheme();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {note ? (
          <View style={styles.content}>
            <Caption color={colors.primaryText}>{upperTr('Dilbilgisi notu')}</Caption>
            <Title accessibilityRole="header">{note.title}</Title>
            {note.sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Heading accessibilityRole="header">{section.heading}</Heading>
                {section.body.map((paragraph, i) => (
                  <Body key={i} color={colors.textMuted}>{paragraph}</Body>
                ))}
                {section.examples?.map((example) => (
                  <View key={example.target} style={styles.example}>
                    <SpeakerButton text={example.target} lang={lang} />
                    <View style={styles.exampleText}>
                      <Body>{example.target}</Body>
                      <Body color={colors.textMuted}>{example.tr}</Body>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Body>Bu ünite için not henüz yok.</Body>
          </View>
        )}
      </ScrollView>
      <Button title="Kapat" variant="secondary" onPress={backOrHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  content: { gap: spacing.md },
  section: { gap: spacing.sm, marginTop: spacing.md },
  example: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exampleText: { flex: 1, gap: 2 },
  empty: { flex: 1, justifyContent: 'center' },
});
