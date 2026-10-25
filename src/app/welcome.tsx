import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { AuthForm } from '@/features/auth/AuthForm';
import { useAppStore } from '@/features/store';
import { Body, Caption, fontSize, fontWeight, radii, spacing, upperTr, useTheme } from '@/ui';

const LANG_NAME: Record<string, string> = { en: 'İngilizce', de: 'Almanca', es: 'İspanyolca', fr: 'Fransızca', tr: 'Türkçe' };
const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', tr: '🇹🇷' };
/** Two columns (pitch | sign-in card) from this width, one column below — same split as EduPilot. */
const WIDE = 900;

/**
 * Welcome / sign-in screen, laid out like the EduPilot landing (pitch on the left,
 * sign-in card on the right, "GİRİŞ" pill top-right) in Lingua's own palette.
 * Shown until the user signs in or picks "Hesapsız dene".
 */
export default function WelcomeScreen() {
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const scroll = useRef<ScrollView>(null);
  const [cardY, setCardY] = useState(0);
  const [guestBusy, setGuestBusy] = useState(false);

  const guest = async () => {
    setGuestBusy(true);
    try {
      await continueAsGuest();
    } finally {
      setGuestBusy(false);
    }
  };

  const eyebrow = [styles.eyebrow, { color: colors.primaryText }];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.brand} accessibilityRole="header">
              <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
              <Text style={[styles.brandName, { color: colors.text }]}>Lingua</Text>
            </View>
            {!wide && (
              <Pressable
                onPress={() => scroll.current?.scrollTo({ y: cardY, animated: true })}
                accessibilityRole="button"
                accessibilityLabel="Giriş formuna git"
                style={[styles.pill, { backgroundColor: colors.buttonPrimary }]}
              >
                <Text style={[styles.pillText, { color: colors.textOnColor }]}>{upperTr('Giriş')}</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={[styles.pitch, wide && styles.pitchWide]}>
              <Text style={eyebrow}>{upperTr('Türkçe konuşanlar için dil okulu')}</Text>
              <Text style={[styles.hero, wide && styles.heroWide, { color: colors.text }]} accessibilityRole="header">
                Günde 10 dakikayla{'\n'}
                <Text style={[styles.heroAccent, { color: colors.primaryText }]}>yeni bir dil</Text>
                {'\n'}konuşmaya başla.
              </Text>
              <Body color={colors.textMuted} style={styles.lead}>
                Kısa dersler, aralıklı tekrar ve günlük seriyle her gün biraz daha ilerle. Telefonda ve bilgisayarda aynı hesapla.
              </Body>
              <View style={styles.chips}>
                {courses.map((c) => (
                  <View key={c.id} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={[styles.chipText, { color: colors.text }]}>
                      {LANG_FLAG[c.toLang] ?? '🌐'} {LANG_NAME[c.toLang] ?? c.toLang}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.tagline, { color: colors.primaryText }]}>Lingua — her gün biraz daha.</Text>
              <Caption>Çevrimdışı çalışır · İlerlemen hesabında saklanır · Reklamsız</Caption>
            </View>

            <View style={[styles.cardCol, wide && styles.cardColWide]} onLayout={(e) => setCardY(e.nativeEvent.layout.y)}>
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Giriş yap</Text>
                <Body color={colors.textMuted} style={styles.cardLead}>
                  Hesabınla devam et; ilerlemen tüm cihazlarında seninle.
                </Body>
                <AuthForm />
              </View>
              <Pressable onPress={guest} disabled={guestBusy} accessibilityRole="button" style={styles.guest}>
                <Body color={colors.textMuted}>Hesapsız dene →</Body>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: spacing.lg },
  inner: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: radii.sm },
  brandName: { fontSize: fontSize.lg, fontWeight: fontWeight.black },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 2 },
  columns: { gap: spacing.xxl },
  columnsWide: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.xxl },
  pitch: { gap: spacing.lg },
  pitchWide: { flex: 1, paddingRight: spacing.xxl },
  eyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 3 },
  hero: { fontSize: 34, lineHeight: 42, fontWeight: fontWeight.black },
  heroWide: { fontSize: 52, lineHeight: 62 },
  heroAccent: { fontStyle: 'italic' },
  lead: { maxWidth: 520 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 2, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  tagline: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  cardCol: { gap: spacing.sm },
  cardColWide: { width: 400 },
  card: { borderWidth: 2, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.xs },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.black },
  cardLead: { marginBottom: spacing.sm },
  guest: { alignSelf: 'center', paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center' },
});
