import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { isAnswerCorrect, type ListenTypeExercise } from '@/domain';
import { speak } from '@/speech';
import { Heading, fontSize, radii, spacing, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import { SpeakerButton } from './Prompt';
import type { ExerciseProps } from './types';

export function ListenType({ exercise, onAnswer, disabled }: ExerciseProps<ListenTypeExercise>) {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const { colors } = useTheme();
  const locked = disabled || checked !== null;
  const borderColor = checked === true ? colors.primary : checked === false ? colors.danger : colors.border;

  useEffect(() => {
    void speak(exercise.audioText, exercise.audioLang);
  }, [exercise.id, exercise.audioText, exercise.audioLang]);

  return (
    <View style={styles.root}>
      <Heading style={styles.title} accessibilityRole="header">Duyduğunu yaz</Heading>
      <View style={styles.speakers}>
        <SpeakerButton text={exercise.audioText} lang={exercise.audioLang} size={96} />
        <SpeakerButton text={exercise.audioText} lang={exercise.audioLang} rate={0.6} size={56} />
      </View>
      <TextInput
        accessibilityLabel="Cevabın, duyduğun cümleyi yaz"
        value={text}
        onChangeText={setText}
        editable={!locked}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={`${exercise.audioLang.toUpperCase()} olarak yaz`}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor, color: colors.text, backgroundColor: colors.surface }]}
        multiline
      />
      <View style={styles.spacer} />
      <CheckBar
        disabled={text.trim().length === 0 || locked}
        onCheck={() => {
          const ok = isAnswerCorrect(text, exercise.answers);
          setChecked(ok);
          onAnswer(ok, text);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { marginBottom: spacing.lg },
  speakers: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.xl },
  input: {
    minHeight: 120,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: fontSize.lg,
    textAlignVertical: 'top',
  },
  spacer: { flex: 1 },
});
