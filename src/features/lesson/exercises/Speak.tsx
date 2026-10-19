import { Pressable, StyleSheet, View } from 'react-native';

import { isSpeechCorrect, type SpeakExercise } from '@/domain';
import { useSpeechRecognition } from '@/speech';
import { Body, Caption, Heading, radii, spacing, useTheme } from '@/ui';

import { CheckBar } from '../CheckBar';
import { SpeakerButton } from './Prompt';
import type { ExerciseProps } from './types';

export function Speak({ exercise, onAnswer, disabled }: ExerciseProps<SpeakExercise>) {
  const stt = useSpeechRecognition(exercise.lang);
  const { colors } = useTheme();
  const unavailable = stt.status === 'unavailable';
  const listening = stt.status === 'listening';

  return (
    <View style={styles.root}>
      <Heading style={styles.title} accessibilityRole="header">Bu cümleyi söyle</Heading>
      <View style={styles.sentenceRow}>
        <SpeakerButton text={exercise.sentence} lang={exercise.lang} />
        <Body style={styles.sentence}>{exercise.sentence}</Body>
      </View>

      {unavailable ? (
        <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLiveRegion="polite">
          <Body center>Konuşma tanıma şu an kullanılamıyor.</Body>
          <Caption center>{"Expo Go'da veya izin verilmediğinde bu alıştırma atlanabilir."}</Caption>
        </View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Kaydı durdur' : 'Konuşmaya başla'}
            accessibilityState={{ disabled, selected: listening }}
            disabled={disabled}
            onPress={() => (listening ? stt.stop() : void stt.start())}
            style={({ pressed }) => [
              styles.mic,
              listening
                ? { backgroundColor: colors.buttonDanger, borderBottomColor: colors.buttonDangerShadow }
                : { backgroundColor: colors.buttonSecondary, borderBottomColor: colors.buttonSecondaryShadow },
              pressed && styles.pressed,
            ]}
          >
            <Body color={colors.textOnColor} style={styles.micIcon} accessible={false}>🎤</Body>
          </Pressable>
          <Caption center accessibilityLiveRegion="polite">{listening ? 'Dinliyorum…' : 'Konuşmak için dokun'}</Caption>
          <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLiveRegion="polite">
            <Body center color={stt.transcript ? colors.text : colors.textMuted}>
              {stt.transcript || '…'}
            </Body>
            {stt.error ? <Caption center color={colors.dangerText}>{stt.error}</Caption> : null}
          </View>
        </>
      )}

      <View style={styles.spacer} />
      <CheckBar
        disabled={disabled || (!unavailable && stt.transcript.trim().length === 0)}
        label={unavailable ? 'Atla' : 'Kontrol et'}
        onCheck={() => {
          if (unavailable) {
            onAnswer(true); // skipped exercises are not penalised
            return;
          }
          onAnswer(isSpeechCorrect(stt.transcript, exercise.sentence), stt.transcript);
        }}
        secondary={unavailable ? undefined : { label: 'Şimdi konuşamıyorum', onPress: () => onAnswer(true) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { marginBottom: spacing.lg },
  sentenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  sentence: { flex: 1, fontSize: 20 },
  mic: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    marginBottom: spacing.sm,
  },
  pressed: { borderBottomWidth: 0, transform: [{ translateY: 6 }] },
  micIcon: { fontSize: 40 },
  box: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    gap: spacing.xs,
  },
  spacer: { flex: 1 },
});
