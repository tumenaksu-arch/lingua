import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAppStore } from '@/features/store';
import { useSocialStore, type FriendWithXp } from '@/features/social/socialStore';
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
  const friends = useSocialStore((s) => s.friends);
  const addFriendByCode = useSocialStore((s) => s.addFriendByCode);
  const removeFriend = useSocialStore((s) => s.removeFriend);
  const load = useSocialStore((s) => s.load);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const rows: { uid: string; nickname: string; xp: number; isMe: boolean; friend?: FriendWithXp }[] = [
    ...friends.map((f) => ({ uid: f.friend_uid, nickname: f.nickname, xp: f.xp, isMe: false, friend: f })),
    { uid: userId, nickname: profile.nickname, xp: 0, isMe: true },
  ].sort((a, b) => b.xp - a.xp);

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

      <View style={styles.listHeader}>
        <Heading>Arkadaşların</Heading>
        <Button title="Yenile" variant="outline" block={false} onPress={() => void load()} />
      </View>
      {rows.length <= 1 && friends.length === 0 ? (
        <Caption color={colors.textMuted}>Henüz arkadaşın yok. Kodunu paylaş, birlikte yarışın!</Caption>
      ) : (
        rows.map((r, i) => (
          <View key={r.uid} style={styles.friendRowWrap}>
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
        ))
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

  useEffect(() => {
    void load();
  }, [load, user]);

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
  friendRowWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  removeBtn: { paddingHorizontal: spacing.sm },
});
