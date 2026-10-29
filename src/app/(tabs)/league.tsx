import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAppStore } from '@/features/store';
import { isAnonymousSession } from '@/data/remote/classes';
import { useClassStore } from '@/features/classes/classStore';
import { useSocialStore, type FriendWithXp } from '@/features/social/socialStore';
import { bestFriendStreak, streakBadgeText, streakTodayLabel } from '@/features/social/friendStreak';
import { NICKNAME_PATTERN } from '@/data/remote/social';
import {
  Body,
  Button,
  Caption,
  Heading,
  Screen,
  Title,
  fonts,
  radii,
  showAlert,
  spacing,
  useTheme,
} from '@/ui';

type Tab = 'week' | 'friends';

function validateNickname(raw: string): string | null {
  const nickname = raw.trim();
  if (nickname.length < 3 || nickname.length > 20) return 'Takma ad 3–20 karakter olmalı.';
  if (!NICKNAME_PATTERN.test(nickname)) {
    return 'Takma ad yalnızca harf, rakam, nokta, tire, alt çizgi ve boşluk içerebilir.';
  }
  return null;
}

/** Segmented "Bu hafta" / "Arkadaşlar" switch. */
function Segment({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const { colors } = useTheme();
  const items: { key: Tab; label: string }[] = [
    { key: 'week', label: 'Bu hafta' },
    { key: 'friends', label: 'Arkadaşlar' },
  ];
  return (
    <View style={[styles.segment, { borderColor: colors.borderStrong }]} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.key)}
            style={[styles.segmentItem, { backgroundColor: selected ? colors.primary : 'transparent' }]}
          >
            <Text style={[styles.segmentText, { color: selected ? colors.textOnBrand : colors.textMuted }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One leaderboard row: rank, nickname, mono XP; the player's own row uses the copper accent. */
function EntryRow({ rank, nickname, xp, isMe }: { rank: number; nickname: string; xp: number; isMe: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderColor: isMe ? colors.primary : colors.border, backgroundColor: isMe ? colors.primaryTint : colors.surface },
      ]}
      accessibilityLabel={`Sıra ${rank}: ${nickname}, ${xp} XP${isMe ? ', sen' : ''}`}
      accessibilityState={{ selected: isMe }}
    >
      <Caption color={isMe ? colors.primaryText : colors.textMuted} style={styles.rank}>
        {rank}.
      </Caption>
      <Body style={styles.nickname} numberOfLines={1}>
        {nickname}
        {isMe ? ' (sen)' : ''}
      </Body>
      <Text style={[styles.xp, { color: isMe ? colors.primaryText : colors.text }]}>{xp} XP</Text>
    </View>
  );
}

function NicknameForm() {
  const { colors } = useTheme();
  const setNickname = useSocialStore((s) => s.setNickname);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const problem = validateNickname(value);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await setNickname(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Heading>Takma adını seç</Heading>
      <Body color={colors.textMuted}>
        Sıralamada ve arkadaş listesinde bu adla görünürsün. E-posta adresin hiçbir yerde görünmez.
      </Body>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="örn. YıldızKedi_42"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        accessibilityLabel="Takma ad"
        style={[styles.input, { borderColor: colors.borderStrong, color: colors.text, fontFamily: fonts.mono }]}
        onSubmitEditing={() => void submit()}
      />
      {error && <Caption color={colors.dangerText}>{error}</Caption>}
      <Button title="Kaydet" loading={busy} onPress={() => void submit()} />
    </View>
  );
}

function InviteCodeCard({ code }: { code: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(code);
        setCopied(true);
        return;
      }
    } catch {
      // The clipboard API can exist yet reject (e.g. Android WebView without
      // permission) — fall through to the native share sheet instead.
    }
    try {
      await Share.share({ message: `Love-Vox davet kodum: ${code}` });
    } catch {
      setCopied(false);
    }
  };

  return (
    <View style={[styles.codeCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Caption color={colors.textMuted}>Davet kodun</Caption>
      <Text style={[styles.code, { color: colors.primaryText }]} accessibilityLabel={`Davet kodu ${code}`}>
        {code}
      </Text>
      <Button title={copied ? 'Kopyalandı' : 'Kodu kopyala / paylaş'} variant="outline" onPress={() => void copy()} />
    </View>
  );
}

function FriendsTab() {
  const { colors } = useTheme();
  const userId = useAppStore((s) => s.userId);
  const profile = useSocialStore((s) => s.profile);
  const top = useSocialStore((s) => s.top);
  const friends = useSocialStore((s) => s.friends);
  const streaks = useSocialStore((s) => s.friendStreaks);
  const addFriendByCode = useSocialStore((s) => s.addFriendByCode);
  const removeFriend = useSocialStore((s) => s.removeFriend);
  const load = useSocialStore((s) => s.load);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  // The player's own weekly XP comes from the loaded top list (load() publishes
  // it before reading), so the own row shows real XP and ranks fairly.
  const ownXp = top.find((e) => e.uid === userId)?.xp ?? 0;
  const rows: { uid: string; nickname: string; xp: number; isMe: boolean; friend?: FriendWithXp }[] = [
    ...friends.map((f) => ({ uid: f.friend_uid, nickname: f.nickname, xp: f.xp, isMe: false, friend: f })),
    { uid: userId, nickname: profile.nickname, xp: ownXp, isMe: true },
  ].sort((a, b) => b.xp - a.xp);
  // Mutual friend streaks come from the friend_streaks RPC (only mutual
  // friends appear there); the card honours the highest shared streak.
  const streakByUid = new Map(streaks.map((s) => [s.friend_uid, s]));
  const best = bestFriendStreak(friends, streaks);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await addFriendByCode(code);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (f: FriendWithXp) =>
    showAlert('Arkadaşı kaldır', `${f.nickname} arkadaş listenden kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => void removeFriend(f.friend_uid) },
    ]);

  return (
    <View style={styles.section}>
      <InviteCodeCard code={profile.invite_code} />
      <View style={styles.addRow}>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Davet kodu"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          accessibilityLabel="Davet kodu girişi"
          style={[styles.input, styles.addInput, { borderColor: colors.borderStrong, color: colors.text, fontFamily: fonts.mono }]}
          onSubmitEditing={() => void submit()}
        />
        <Button title="Ekle" block={false} loading={busy} disabled={code.trim().length === 0} onPress={() => void submit()} />
      </View>
      {error && <Caption color={colors.dangerText}>{error}</Caption>}

      {best && (
        <View
          style={[styles.streakCard, { borderColor: colors.primary, backgroundColor: colors.primaryTint }]}
          accessibilityLabel={`Birlikte en uzun seri: ${best.nickname}, ${best.streak} gün`}
        >
          <Caption color={colors.textMuted}>Birlikte en uzun seri</Caption>
          <Text style={[styles.streakCardNumber, { color: colors.primaryText }]}>🔥 {best.streak}</Text>
          <Body color={colors.text}>{best.nickname} ile {best.streak} gündür birlikte çalışıyorsunuz</Body>
        </View>
      )}

      <View style={styles.listHeader}>
        <Heading>Arkadaşların</Heading>
        <Button title="Yenile" variant="outline" block={false} onPress={() => void load()} />
      </View>
      {rows.length <= 1 && friends.length === 0 ? (
        <Caption color={colors.textMuted}>Henüz arkadaşın yok. Kodunu paylaş, birlikte yarışın!</Caption>
      ) : (
        rows.map((r, i) => {
          const streak = r.friend ? streakByUid.get(r.friend.friend_uid) : undefined;
          return (
            <View key={r.uid} style={styles.friendRowWrap}>
              <View style={styles.friendRowMain}>
                <EntryRow rank={i + 1} nickname={r.nickname} xp={r.xp} isMe={r.isMe} />
                {r.friend && (
                  <Button
                    title="Kaldır"
                    variant="danger"
                    block={false}
                    onPress={() => confirmRemove(r.friend!)}
                    style={styles.removeBtn}
                  />
                )}
              </View>
              {streak && (
                <Caption
                  color={colors.textMuted}
                  style={styles.streakLine}
                  accessibilityLabel={`${streakBadgeText(streak.streak)}, ${streakTodayLabel(streak)}`}
                >
                  {streak.streak > 0 ? `${streakBadgeText(streak.streak)} · ` : ''}
                  {streakTodayLabel(streak)}
                </Caption>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

export default function LeagueScreen() {
  const { colors } = useTheme();
  const user = useAppStore((s) => s.user);
  const profile = useSocialStore((s) => s.profile);
  const top = useSocialStore((s) => s.top);
  const loading = useSocialStore((s) => s.loading);
  const error = useSocialStore((s) => s.error);
  const load = useSocialStore((s) => s.load);
  const [tab, setTab] = useState<Tab>('week');
  // Anonymous detection is async; until it resolves an anonymous user would
  // match the `!profile` branch below and get a flash of the global-league
  // NicknameForm (whose save RLS would reject). Gate rendering on the check.
  const [anon, setAnon] = useState<{ uid: string | null; checked: boolean; value: boolean }>({
    uid: null,
    checked: false,
    value: false,
  });
  const myClasses = useClassStore((s) => s.myClasses);

  useEffect(() => {
    void load();
  }, [load, user]);

  // Anonymous class accounts are invisible to the global league (RLS rejects
  // them anyway) — point them at their class league instead.
  useEffect(() => {
    let alive = true;
    const uid = user?.uid ?? null;
    if (!uid) {
      // No session: the anonymous check is moot, resolve immediately.
      Promise.resolve().then(() => {
        if (alive) setAnon({ uid: null, checked: true, value: false });
      });
    } else {
      void isAnonymousSession().then((v) => {
        if (alive) setAnon({ uid, checked: true, value: v });
      });
    }
    return () => {
      alive = false;
    };
  }, [user]);

  // The check is stale the moment the signed-in user changes.
  const anonymousResolved = anon.checked && anon.uid === (user?.uid ?? null);
  const anonymous = anonymousResolved && anon.value;

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title>Lig</Title>
          {user && profile && (
            <Button title="Yenile" variant="outline" block={false} loading={loading} onPress={() => void load()} />
          )}
        </View>

        {!user ? (
          <View style={styles.section}>
            <Body color={colors.textMuted}>
              Haftalık ligde yarışmak ve arkadaşlarını davet etmek için bir hesap gerekir. Sıralamada yalnızca
              seçtiğin takma ad görünür; e-posta adresin hiçbir yerde görünmez.
            </Body>
            <Button title="Giriş yap" onPress={() => router.push('/auth')} />
          </View>
        ) : !anonymousResolved ? (
          <Caption color={colors.textMuted}>Yükleniyor…</Caption>
        ) : anonymous ? (
          <View style={styles.section}>
            <Body color={colors.textMuted}>Genel lig için e-postalı hesap gerekir. Sınıf ligin sınıf ekranında.</Body>
            {myClasses[0] && (
              <Button
                title="Sınıfına git"
                onPress={() => router.push({ pathname: '/sinif/[classId]', params: { classId: myClasses[0]!.classId } })}
              />
            )}
          </View>
        ) : !profile ? (
          <NicknameForm />
        ) : (
          <>
            <Segment value={tab} onChange={setTab} />
            {error && <Caption color={colors.dangerText}>Bir sorun oluştu: {error}</Caption>}
            {tab === 'week' ? (
              <View style={styles.section}>
                {top.length === 0 && !loading ? (
                  <Caption color={colors.textMuted}>Bu hafta için henüz kayıt yok. İlk sen ol!</Caption>
                ) : (
                  top.map((entry, i) => (
                    <EntryRow key={entry.uid} rank={i + 1} nickname={entry.nickname} xp={entry.xp} isMe={entry.uid === user.uid} />
                  ))
                )}
              </View>
            ) : (
              <FriendsTab />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.sm },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.pill, padding: 3 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  rank: { width: 28 },
  nickname: { flex: 1 },
  xp: { fontFamily: fonts.mono, fontSize: 14, letterSpacing: 1 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addInput: { flex: 1 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  codeCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  code: { fontFamily: fonts.mono, fontSize: 32, letterSpacing: 8 },
  friendRowWrap: { gap: 2 },
  friendRowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  removeBtn: { paddingHorizontal: spacing.sm },
  streakLine: { marginLeft: spacing.md },
  streakCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  streakCardNumber: { fontFamily: fonts.mono, fontSize: 32, letterSpacing: 2 },
});
