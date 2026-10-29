/**
 * Arkadaşla ortak seri (Friend Streaks) görüntüleme yardımcıları.
 * Sunucu `friend_streaks` RPC'sinin döndürdüğü satırlar üzerinden çalışır;
 * bu dosya saf fonksiyonlar içerir (store / ağ bağımlılığı yok).
 */

/** Bir arkadaşla ortak seri durumu (friend_streaks RPC satırı, istemci adlarıyla). */
export interface FriendStreak {
  friend_uid: string;
  streak: number;
  /** Çağıran (ben) bugün en az 1 etkinlik yaptı mı? */
  me_today: boolean;
  /** Arkadaş bugün en az 1 etkinlik yaptı mı? */
  friend_today: boolean;
}

/** Sıra satırındaki rozet metni: "🔥 5 gün birlikte". */
export function streakBadgeText(streak: number): string {
  return `🔥 ${streak} gün birlikte`;
}

/**
 * Bugün durumu metni:
 * - ikisi de bugün çalıştı → "İkiniz de bugün çalıştınız ✅"
 * - ben çalıştım, arkadaş bekleniyor → "Arkadaşın bekliyor"
 * - ben çalışmadım → "Sıra sende"
 */
export function streakTodayLabel(s: Pick<FriendStreak, 'me_today' | 'friend_today'>): string {
  if (s.me_today && s.friend_today) return 'İkiniz de bugün çalıştınız ✅';
  if (s.me_today) return 'Arkadaşın bekliyor';
  return 'Sıra sende';
}

/** Ortak serisi en yüksek arkadaş (kartta gösterilir); seri yoksa null. */
export function bestFriendStreak(
  friends: { friend_uid: string; nickname: string }[],
  streaks: FriendStreak[],
): { friend_uid: string; nickname: string; streak: number } | null {
  let best: { friend_uid: string; nickname: string; streak: number } | null = null;
  const byUid = new Map(friends.map((f) => [f.friend_uid, f.nickname]));
  for (const s of streaks) {
    const nickname = byUid.get(s.friend_uid);
    if (nickname === undefined) continue; // listede olmayan (silinmiş) arkadaş
    if (best === null || s.streak > best.streak) {
      best = { friend_uid: s.friend_uid, nickname, streak: s.streak };
    }
  }
  return best && best.streak > 0 ? best : null;
}
