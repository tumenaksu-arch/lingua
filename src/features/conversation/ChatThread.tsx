import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LangCode } from '@/domain';
import { SpeakerButton } from '@/features/lesson/exercises/Prompt';
import { Body, Caption, radii, spacing, useTheme } from '@/ui';

import type { ConversationMessage } from './history';

/**
 * Konuşma iş parçacığı: asistan/kullanıcı baloncukları, Türkçe çeviri düğmesi
 * ve düzeltme kartı. Yazılı modda olduğu gibi çalışır; sesli modda çeviri ve
 * düzeltmeler başlangıçta katlanır ("göster" düğmesiyle açılır) — Video Call
 * ekranında kartlar görüşme akışını boğmasın diye.
 */
export interface ChatThreadProps {
  messages: ConversationMessage[];
  lang: LangCode;
  voice: boolean;
  showTr: Record<number, boolean>;
  onToggleTr: (index: number) => void;
  showCorr: Record<number, boolean>;
  onToggleCorr: (index: number) => void;
  waiting: boolean;
}

export function ChatThread({ messages, lang, voice, showTr, onToggleTr, showCorr, onToggleCorr, waiting }: ChatThreadProps) {
  const { colors } = useTheme();
  return (
    <>
      {messages.map((m, i) =>
        m.role === 'assistant' ? (
          <View key={i} style={[styles.bubble, styles.assistant, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.assistantRow}>
              <SpeakerButton text={m.text} lang={lang} />
              <Body style={styles.bubbleText}>{m.text}</Body>
            </View>
            {m.replyTr ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showTr[i] ? 'Türkçesini gizle' : voice ? 'Türkçesini göster' : 'Türkçesi'}
                onPress={() => onToggleTr(i)}
                style={({ pressed }) => [styles.trToggle, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Caption color={colors.primaryText}>
                  {showTr[i] ? 'Türkçesini gizle' : voice ? 'Türkçesini göster' : 'Türkçesi'}
                </Caption>
              </Pressable>
            ) : null}
            {m.replyTr && showTr[i] ? <Body color={colors.textMuted}>{m.replyTr}</Body> : null}
          </View>
        ) : (
          <View key={i} style={styles.userWrap}>
            <View style={[styles.bubble, styles.user, { backgroundColor: colors.primaryTint }]}>
              <Body style={styles.bubbleText}>{m.text}</Body>
            </View>
            {m.correction ? (
              <View style={[styles.correction, { borderColor: colors.success, backgroundColor: colors.successTint }]}>
                {voice ? (
                  // Sesli modda düzeltme katlı başlar; görüşme akışını kısa tutar.
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showCorr[i] ? 'Düzeltmeyi gizle' : 'Düzeltmeyi göster'}
                    onPress={() => onToggleCorr(i)}
                    style={({ pressed }) => [styles.corrToggle, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Caption color={colors.successText}>{showCorr[i] ? 'Düzeltmeyi gizle' : 'Düzeltmeyi göster'}</Caption>
                  </Pressable>
                ) : null}
                {voice && !showCorr[i] ? null : (
                  <>
                    <Caption color={colors.successText}>DÜZELTME</Caption>
                    <Text style={[styles.original, { color: colors.textMuted }]}>{m.correction.original}</Text>
                    <Body color={colors.successText}>{m.correction.corrected}</Body>
                    <Caption color={colors.textMuted}>{m.correction.explanationTr}</Caption>
                  </>
                )}
              </View>
            ) : null}
          </View>
        ),
      )}
      {waiting ? (
        <View style={[styles.bubble, styles.assistant, styles.typing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Caption color={colors.textMuted}>yazıyor…</Caption>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, maxWidth: '88%', gap: spacing.sm },
  assistant: { alignSelf: 'flex-start' },
  userWrap: { alignSelf: 'flex-end', maxWidth: '88%', gap: spacing.sm },
  user: { alignSelf: 'flex-end', borderColor: 'transparent' },
  bubbleText: { flexShrink: 1 },
  assistantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trToggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  typing: { minWidth: 72, alignItems: 'center' },
  correction: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, gap: 2 },
  corrToggle: { alignSelf: 'flex-start' },
  original: { textDecorationLine: 'line-through' },
});
