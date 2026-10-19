import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { getVocab } from '@/content';
import type { SrsCard, VocabItem } from '@/domain';
import { useAppStore } from '@/features/store';
import { speak } from '@/speech';
import { Body, Button, Caption, Heading, ProgressBar, Screen, Title, colors, radii, spacing } from '@/ui';

interface Deck { cards: SrsCard[]; vocab: Map<string, VocabItem>; }

export default function ReviewScreen() {
  const course = useAppStore((s) => s.course);
  const dueCount = useAppStore((s) => s.dueCount);
  const loadDueCards = useAppStore((s) => s.loadDueCards);
  const reviewCard = useAppStore((s) => s.reviewCard);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState({ right: 0, wrong: 0 });
  const shownAt = useRef(0);

  const load = useCallback(async () => {
    const cards = await loadDueCards(20);
    const vocab = new Map(getVocab(course.id).map((v) => [v.id, v]));
    setDeck({ cards: cards.filter((c) => vocab.has(c.vocabId)), vocab });
    setIndex(0);
    setFlipped(false);
    setDone({ right: 0, wrong: 0 });
    shownAt.current = Date.now();
  }, [course.id, loadDueCards]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  // Reset the response timer whenever a different card is shown (new index or a reloaded deck).
  useEffect(() => { shownAt.current = Date.now(); }, [index, deck]);

  if (!deck) return <Screen />;

  const card = deck.cards[index];
  if (!card) {
    return (
      <Screen>
        <View style={styles.center}>
          <Title center>{deck.cards.length ? 'Tekrar bitti! 🎉' : 'Bugün tekrar yok ✅'}</Title>
          <Body center color={colors.textMuted}>
            {deck.cards.length
              ? `${done.right} doğru · ${done.wrong} yanlış`
              : `Dersleri tamamladıkça kelimeler buraya gelir. Bekleyen: ${dueCount}`}
          </Body>
          {deck.cards.length > 0 && <Button title="Yeniden yükle" variant="outline" onPress={load} />}
        </View>
      </Screen>
    );
  }

  const v = deck.vocab.get(card.vocabId)!;
  const grade = async (correct: boolean) => {
    await reviewCard(card, correct, Date.now() - shownAt.current);
    setDone((d) => (correct ? { ...d, right: d.right + 1 } : { ...d, wrong: d.wrong + 1 }));
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ProgressBar progress={index / deck.cards.length} style={{ flex: 1 }} />
        <Caption>{index + 1}/{deck.cards.length}</Caption>
      </View>

      <Pressable
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        accessibilityLabel={flipped ? 'Kartı çevir (ön yüz)' : 'Kartı çevir (arka yüz)'}
        style={[styles.card, flipped && styles.cardBack]}
      >
        <Caption color={colors.textMuted}>{flipped ? 'ANLAMI' : 'KELİME'}</Caption>
        <Title center>{flipped ? v.translation : v.term}</Title>
        {flipped && v.example ? <Body center color={colors.textMuted}>{v.example}</Body> : null}
        {!flipped && (
          <Pressable onPress={() => speak(v.term, course.toLang)} accessibilityRole="button" accessibilityLabel="Dinle" style={styles.speaker}>
            <Heading>🔊</Heading>
          </Pressable>
        )}
      </Pressable>

      {flipped ? (
        <View style={styles.actions}>
          <Button title="Bilemedim" variant="danger" onPress={() => grade(false)} style={{ flex: 1 }} />
          <Button title="Bildim" onPress={() => grade(true)} style={{ flex: 1 }} />
        </View>
      ) : (
        <Button title="Cevabı göster" variant="secondary" onPress={() => setFlipped(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  card: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl, backgroundColor: colors.surface },
  cardBack: { borderColor: colors.secondary, backgroundColor: colors.secondaryTint },
  speaker: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
});
