import {
  bestFriendStreak,
  streakBadgeText,
  streakTodayLabel,
  type FriendStreak,
} from '../social/friendStreak';

describe('streakTodayLabel', () => {
  it('both active today → celebration text', () => {
    expect(streakTodayLabel({ me_today: true, friend_today: true })).toBe('İkiniz de bugün çalıştınız ✅');
  });

  it('only me active → the friend is the one waiting', () => {
    expect(streakTodayLabel({ me_today: true, friend_today: false })).toBe('Arkadaşın bekliyor');
  });

  it('me inactive → my turn (regardless of the friend)', () => {
    expect(streakTodayLabel({ me_today: false, friend_today: true })).toBe('Sıra sende');
    expect(streakTodayLabel({ me_today: false, friend_today: false })).toBe('Sıra sende');
  });
});

describe('streakBadgeText', () => {
  it('formats the fire badge', () => {
    expect(streakBadgeText(5)).toBe('🔥 5 gün birlikte');
    expect(streakBadgeText(1)).toBe('🔥 1 gün birlikte');
  });
});

describe('bestFriendStreak', () => {
  const friends = [
    { friend_uid: 'u2', nickname: 'Bob' },
    { friend_uid: 'u3', nickname: 'Carol' },
  ];

  it('picks the highest streak with the nickname attached', () => {
    const streaks: FriendStreak[] = [
      { friend_uid: 'u2', streak: 3, me_today: true, friend_today: true },
      { friend_uid: 'u3', streak: 9, me_today: false, friend_today: true },
    ];
    expect(bestFriendStreak(friends, streaks)).toEqual({ friend_uid: 'u3', nickname: 'Carol', streak: 9 });
  });

  it('returns null when there are no friends or no positive streak', () => {
    expect(bestFriendStreak([], [])).toBeNull();
    expect(
      bestFriendStreak(friends, [
        { friend_uid: 'u2', streak: 0, me_today: false, friend_today: false },
        { friend_uid: 'u3', streak: 0, me_today: false, friend_today: false },
      ]),
    ).toBeNull();
  });

  it('ignores streak rows for friends no longer on the list', () => {
    const streaks: FriendStreak[] = [
      { friend_uid: 'u9', streak: 12, me_today: true, friend_today: true }, // removed friend
      { friend_uid: 'u2', streak: 2, me_today: true, friend_today: false },
    ];
    expect(bestFriendStreak(friends, streaks)).toEqual({ friend_uid: 'u2', nickname: 'Bob', streak: 2 });
  });
});
