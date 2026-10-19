import { Pressable, StyleSheet, View } from 'react-native';

import type { LangCode } from '@/domain';
import { speak } from '@/speech';
import { Body, Heading, MIN_TOUCH, radii, spacing, useTheme } from '@/ui';

/** Instruction line + prompt sentence, with an optional speaker button. */
export function Prompt({ instruction, text, speakLang }: { instruction: string; text?: string; speakLang?: LangCode }) {
  return (
    <View style={styles.wrap}>
      <Heading accessibilityRole="header">{instruction}</Heading>
      {text ? (
        <View style={styles.row}>
          {speakLang ? <SpeakerButton text={text} lang={speakLang} /> : null}
          <Body style={styles.text}>{text}</Body>
        </View>
      ) : null}
    </View>
  );
}

export function SpeakerButton({ text, lang, rate, size = 48 }: { text: string; lang: LangCode; rate?: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rate ? 'Yavaş dinle' : 'Dinle'}
      onPress={() => void speak(text, lang, { rate })}
      style={({ pressed }) => [
        styles.speaker,
        { width: size, height: size, backgroundColor: colors.buttonSecondary, borderBottomColor: colors.buttonSecondaryShadow },
        pressed && styles.pressed,
      ]}
    >
      <Body color={colors.textOnColor} style={{ fontSize: size * 0.45 }} accessible={false}>{rate ? '🐢' : '🔊'}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, fontSize: 20 },
  speaker: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  pressed: { borderBottomWidth: 0, transform: [{ translateY: 4 }] },
});
