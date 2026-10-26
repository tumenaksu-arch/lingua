import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Caption, Heading, Screen, Title, spacing, useTheme } from '@/ui';

/**
 * Open-source licenses behind the natural server voice (roadmap item 7).
 * The models/corpora below run on the lovevox server — the app only plays
 * the generated audio — but they are listed here for attribution.
 */
const LICENSES: { name: string; license: string; note?: string }[] = [
  { name: 'Kokoro-82M', license: 'Apache-2.0', note: 'hexgrad' },
  { name: 'Piper', license: 'GPL-3.0', note: 'sunucuda çalışır' },
  { name: 'Thorsten-Voice', license: 'CC0' },
  { name: 'SIWIS French speech corpus', license: 'CC-BY 4.0', note: 'Kokoro ff_siwis voice' },
  { name: 'espeak-ng', license: 'GPL-3.0', note: 'sunucuda' },
];

export default function LicensesScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Title accessibilityRole="header">Açık kaynak lisansları</Title>
      <View style={styles.list}>
        {LICENSES.map((l) => (
          <View key={l.name} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.text}>
              <Heading>{l.name}</Heading>
              <Caption color={colors.textMuted}>
                {l.license}
                {l.note ? ` · ${l.note}` : ''}
              </Caption>
            </View>
          </View>
        ))}
      </View>
      <Caption color={colors.textMuted}>
        Doğal sesler Love-Vox sunucusunda üretilir; ses dosyaları önbelleğe alınır, metinler kaydedilmez.
      </Caption>
      <View style={{ flex: 1 }} />
      <Button title="Kapat" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, marginVertical: spacing.md },
  row: { borderWidth: 1, borderRadius: 10, padding: spacing.md },
  text: { gap: 2 },
});
