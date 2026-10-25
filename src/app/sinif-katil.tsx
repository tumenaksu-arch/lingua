import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { authErrorMessage } from '@/data';
import { useClassStore } from '@/features/classes/classStore';
import { JOIN_CODE_PATTERN, TAKMA_AD_PATTERN, normalizeJoinCode } from '@/features/classes/classView';
import { Body, Button, Caption, Heading, Screen, fonts, radii, spacing, useTheme } from '@/ui';

/**
 * "Sınıf koduyla katıl" (madde 5, wave 2b): reachable from the welcome screen
 * (works with NO account — joinAsStudent signs in anonymously) and from the
 * profile ("Sınıfa katıl"). Only a 6-char class code and a class nickname are
 * asked; the teacher sees the nickname and the learning summary, never an
 * e-mail. Errors from the join_class RPC are shown inline.
 */
export default function JoinClassScreen() {
  const { colors } = useTheme();
  const join = useClassStore((s) => s.join);
  const [code, setCode] = useState('');
  const [takmaAd, setTakmaAd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeOk = JOIN_CODE_PATTERN.test(code);
  const adOk = TAKMA_AD_PATTERN.test(takmaAd.trim());

  const submit = async () => {
    if (!codeOk) {
      setError('Sınıf kodu 6 karakterdir (örn. ABC234). Öğretmeninden kodu al.');
      return;
    }
    if (!adOk) {
      setError('Takma ad 3–20 karakter olmalı (harf, rakam, boşluk, . _ -).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const joined = await join(code, takmaAd);
      // join resolves null when Supabase is not configured — the student must
      // NOT walk away believing they joined.
      if (!joined) {
        setError('Sınıf şu an kullanılamıyor. Lütfen biraz sonra tekrar dene.');
        return;
      }
      // Deterministic landing: the store switches course + completes
      // onboarding here, the root guards re-render, and a plain router.back()
      // can leave this modal open. Replace the whole stack with the home tab
      // (dismissAll first in case the modal was pushed on a stack).
      try {
        router.dismissAll();
      } catch {
        /* nothing to dismiss */
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Heading>Sınıfa katıl</Heading>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.close}>
            <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>
        <Body color={colors.textMuted}>
          Öğretmenin verdiği 6 karakterlik kodu ve sınıf içi takma adını yaz. Hesap gerekmez: e-postasız,
          anonim bir hesapla katılırsın.
        </Body>

        <Caption color={colors.primaryText}>SINIF KODU</Caption>
        <TextInput
          value={code}
          onChangeText={(raw) => setCode(normalizeJoinCode(raw))}
          placeholder="ABC234"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          accessibilityLabel="Sınıf kodu"
          style={[styles.input, styles.codeInput, { borderColor: colors.borderStrong, color: colors.text }]}
          onSubmitEditing={() => void submit()}
        />

        <Caption color={colors.primaryText}>TAKMA AD</Caption>
        <TextInput
          value={takmaAd}
          onChangeText={setTakmaAd}
          placeholder="örn. YıldızKedi"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          maxLength={20}
          accessibilityLabel="Takma ad"
          style={[styles.input, { borderColor: colors.borderStrong, color: colors.text }]}
          onSubmitEditing={() => void submit()}
        />
        <Caption color={colors.textMuted}>Gerçek adını yazmak zorunda değilsin.</Caption>

        <Body color={colors.textMuted}>
          Öğretmenin bu takma adı ve öğrenme özetini (XP, biten dersler, seri) görür. E-posta istenmez.
        </Body>

        {error && (
          <Caption color={colors.dangerText} accessibilityRole="alert">
            {error}
          </Caption>
        )}
        <Button title="Sınıfa katıl" loading={busy} onPress={() => void submit()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20 },
  input: {
    minHeight: 48,
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  codeInput: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 6, textAlign: 'center' },
});
