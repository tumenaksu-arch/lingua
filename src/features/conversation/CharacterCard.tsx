import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Body, Caption, Heading, radii, spacing, useReduceMotion, useTheme } from '@/ui';

import type { ConversationCharacter } from './character';

/**
 * Sesli modun (Video Call benzeri) karakter kartı: büyük avatar, ad ve durum
 * yazısı. Karakter konuşurken avatar nabız gibi atanır; işletim sisteminin
 * "hareketi azalt" ayarı açıksa animasyon oynatılmaz.
 */
export function CharacterCard({ character, speaking }: { character: ConversationCharacter; speaking: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || !speaking) {
      scale.value = withTiming(1, { duration: 150 });
      return;
    }
    scale.value = withRepeat(withTiming(1.08, { duration: 550 }), -1, true);
  }, [speaking, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]} accessible accessibilityRole="text">
      <Animated.View style={[styles.avatar, { backgroundColor: colors.primaryTint }, animatedStyle]}>
        <Body style={styles.emoji} accessible={false}>
          {character.emoji}
        </Body>
      </Animated.View>
      <View style={styles.meta}>
        <Heading numberOfLines={1}>{character.name}</Heading>
        <Caption color={colors.textMuted}>{speaking ? 'Konuşuyor…' : 'Hazır'}</Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  avatar: { width: 64, height: 64, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 36 },
  meta: { flex: 1, gap: 2 },
});
