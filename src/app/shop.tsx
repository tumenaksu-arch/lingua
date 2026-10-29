import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  canRepairStreak,
  gemsOf,
  localDateString,
  MAX_HEARTS,
  MAX_STREAK_FREEZES,
  missingGems,
  regenerate,
  SHOP_PRICES,
  type ShopItem,
} from '@/domain';
import { playComplete } from '@/features/sound';
import { useAppStore } from '@/features/store';
import { useNow } from '@/features/useNow';
import { Body, Button, Caption, GemChip, Heading, Screen, Title, radii, spacing, useTheme } from '@/ui';

/** Kısa başarı bildirimi metni; satın alınan kartın adıyla birlikte gösterilir. */
function itemLabel(item: ShopItem): string {
  switch (item) {
    case 'streakFreeze':
      return 'Seri dondurması';
    case 'refillHearts':
      return 'Can dolumu';
    case 'xpBoost':
      return 'Çift XP';
    case 'streakRepair':
      return 'Seri onarımı';
  }
}

/** Mağaza (iş 3A): elmasla seri dondurma, can dolumu, çift XP ve seri onarımı. */
export default function ShopScreen() {
  const rawStats = useAppStore((s) => s.stats);
  const buyItem = useAppStore((s) => s.buyItem);
  const { colors } = useTheme();
  const now = useNow();
  const [notice, setNotice] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const stats = regenerate(rawStats, now);
  const gems = gemsOf(stats);
  const today = localDateString(new Date(now));

  // Satın alma tek dokunuşluk: başarıda ses + haptik + kısa bildirim.
  const buy = (item: ShopItem) => {
    if (buying) return;
    setBuying(true);
    void buyItem(item)
      .then((out) => {
        if (out.ok) {
          playComplete();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setNotice(`${itemLabel(item)} satın alındı!`);
        }
      })
      .finally(() => setBuying(false));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Button title="Kapat" variant="outline" block={false} onPress={() => router.back()} />
        </View>
        <Title center>Mağaza</Title>
        <View style={[styles.headerSide, styles.balance]}>
          <GemChip gems={gems} />
        </View>
      </View>
      {notice ? (
        <Caption center color={colors.successText} accessibilityRole="alert">
          {notice}
        </Caption>
      ) : null}

      <ShopCard
        emoji="🧊"
        title="Seri dondurma"
        description="Bir gün çalışamazsan serini korur. En fazla 2 tane taşıyabilirsin."
        price={SHOP_PRICES.streakFreeze}
        gems={gems}
        passive={stats.streakFreezes >= MAX_STREAK_FREEZES ? 'Dolu' : null}
        onBuy={() => buy('streakFreeze')}
        buying={buying}
      />
      <ShopCard
        emoji="❤️"
        title="Canları doldur"
        description="Tüm canların anında dolsun, beklemeye gerek kalmasın."
        price={SHOP_PRICES.refillHearts}
        gems={gems}
        passive={stats.hearts >= MAX_HEARTS ? 'Canların dolu' : null}
        onBuy={() => buy('refillHearts')}
        buying={buying}
      />
      <ShopCard
        emoji="⚡"
        title="Çift XP · 15 dk"
        description="15 dakika boyunca ders, hikâye ve pratikte kazandığın XP iki katına çıkar. Etkinse süreyi uzatır (en fazla 60 dk)."
        price={SHOP_PRICES.xpBoost}
        gems={gems}
        passive={null}
        onBuy={() => buy('xpBoost')}
        buying={buying}
      />
      {canRepairStreak(stats, today) ? (
        <ShopCard
          emoji="🔥"
          title="Serini onar"
          description={`Serin ${stats.lostStreak!.value} gündü ve koptu. Onararak kaldığın yerden devam et.`}
          price={SHOP_PRICES.streakRepair}
          gems={gems}
          passive={null}
          onBuy={() => buy('streakRepair')}
          buying={buying}
        />
      ) : null}
    </Screen>
  );
}

function ShopCard({
  emoji,
  title,
  description,
  price,
  gems,
  passive,
  onBuy,
  buying,
}: {
  emoji: string;
  title: string;
  description: string;
  price: number;
  gems: number;
  /** Pasif durum metni (ör. "Dolu"); verilirse satın alma düğmesi yerine gösterilir. */
  passive: string | null;
  onBuy: () => void;
  buying: boolean;
}) {
  const { colors } = useTheme();
  const unaffordable = gems < price;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Heading>{emoji}</Heading>
      <View style={styles.cardBody}>
        <Body>{title}</Body>
        <Caption color={colors.textMuted}>{description}</Caption>
        {passive !== null ? (
          <Caption color={colors.textMuted}>{passive}</Caption>
        ) : unaffordable ? (
          <Caption color={colors.dangerText} accessibilityRole="alert">
            {missingGems({ gems }, price)} elmas daha gerekli
          </Caption>
        ) : null}
      </View>
      {passive !== null ? null : (
        <Button
          title={`${price} 💎`}
          variant="secondary"
          disabled={unaffordable || buying}
          loading={buying}
          onPress={onBuy}
          style={styles.buyBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerSide: { flex: 1, flexDirection: 'row' },
  balance: { justifyContent: 'flex-end' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
  cardBody: { flex: 1, gap: 2 },
  buyBtn: { alignSelf: 'center' },
});
