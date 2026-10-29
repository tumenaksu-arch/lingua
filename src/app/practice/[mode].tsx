import { router, useLocalSearchParams } from 'expo-router';

import { PracticeRunner } from '@/features/practice/PracticeRunner';
import type { PracticeMode } from '@/features/practice/session';
import { Body, Button, Screen, Title } from '@/ui';

type Params = { mode: string };

/** Practice Hub session: mistakes = "Hatalarım", words = "Zayıf kelimeler". */
export default function PracticeScreen() {
  const { mode } = useLocalSearchParams<Params>();
  if (mode !== 'mistakes' && mode !== 'words') {
    return (
      <Screen>
        <Title center>Bilinmeyen pratik modu</Title>
        <Body center>{mode}</Body>
        <Button title="Geri dön" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <PracticeRunner key={mode} mode={mode as PracticeMode} />;
}
