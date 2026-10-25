import { useRef, useState, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { AuthForm } from '@/features/auth/AuthForm';
import { useAppStore } from '@/features/store';
import { isNativeShell } from '@/platform/nativeShell';
import { ANDROID_APK_URL, WEB_APP_URL, usePwaInstall } from '@/platform/pwa';
import { Body, Caption, fontSize, fontWeight, radii, spacing, upperTr, useTheme, type ColorTokens } from '@/ui';

const LANG_NAME: Record<string, string> = { en: 'İngilizce', de: 'Almanca', es: 'İspanyolca', fr: 'Fransızca', tr: 'Türkçe' };
const LANG_FLAG: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', tr: '🇹🇷' };
/** Two columns (pitch | sign-in card) and the top menu from this width — same split as EduPilot. */
const WIDE = 900;

const totals = courses.reduce(
  (t, c) => {
    const lessons = c.units.reduce((n, u) => n + u.lessons.length, 0);
    return { units: t.units + c.units.length, lessons: t.lessons + lessons, words: t.words + c.vocab.length };
  },
  { units: 0, lessons: 0, words: 0 },
);

type SectionId = 'yaklasim' | 'kurslar' | 'platformlar' | 'nasil';

/**
 * Welcome / sign-in page modelled on the EduPilot landing (edu-pilot.ai): top menu, platform
 * strip, pitch + sign-in card, then Yaklaşım / Kurslar / Platformlar / Nasıl çalışır sections
 * with numbered cards — in Lingua's palette. Platformlar offers the web app, the Android APK
 * and the installable PWA; it is hidden inside the Android shell (already the installed app).
 * Shown until the user signs in or picks "Hesapsız dene".
 */
export default function WelcomeScreen() {
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const inApp = isNativeShell();
  const scroll = useRef<ScrollView>(null);
  // Section positions for the menu; a plain mutable map (layout callbacks write it, presses read it).
  const [offsets] = useState<Partial<Record<SectionId | 'card', number>>>(() => ({}));
  const [guestBusy, setGuestBusy] = useState(false);

  const goTo = (id: SectionId | 'card') => scroll.current?.scrollTo({ y: Math.max(0, (offsets[id] ?? 0) - spacing.lg), animated: true });
  const mark = (id: SectionId | 'card') => (e: { nativeEvent: { layout: { y: number } } }) => {
    offsets[id] = e.nativeEvent.layout.y;
  };

  const guest = async () => {
    setGuestBusy(true);
    try {
      await continueAsGuest();
    } finally {
      setGuestBusy(false);
    }
  };

  const nav: { id: SectionId; label: string }[] = [
    { id: 'yaklasim', label: 'Yaklaşım' },
    { id: 'kurslar', label: 'Kurslar' },
    ...(inApp ? [] : [{ id: 'platformlar' as const, label: 'Platformlar' }]),
    { id: 'nasil', label: 'Nasıl çalışır' },
  ];
  const mono = [styles.mono, { color: colors.textMuted }];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Header: brand · menu · GİRİŞ */}
          <View style={styles.header}>
            <View style={styles.brand} accessibilityRole="header">
              <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
              <Text style={[styles.brandName, { color: colors.text }]}>Love-Vox</Text>
            </View>
            {wide && (
              <View style={styles.nav}>
                {nav.map((n) => (
                  <Pressable key={n.id} onPress={() => goTo(n.id)} accessibilityRole="link" style={styles.navItem}>
                    <Text style={[styles.navText, { color: colors.textMuted }]}>{upperTr(n.label)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => goTo('card')}
              accessibilityRole="button"
              accessibilityLabel="Giriş formuna git"
              style={[styles.pill, { backgroundColor: colors.buttonPrimary }]}
            >
              <Text style={[styles.pillText, { color: colors.textOnColor }]}>{upperTr('Giriş')}</Text>
            </Pressable>
          </View>

          {/* Strip */}
          <View style={[styles.strip, wide && styles.stripWide]}>
            <Text style={mono}>{upperTr('Bir ANKAXAI çözümü')}</Text>
            <Text style={mono}>WEB · ANDROID · PWA</Text>
            <Text style={mono}>{upperTr(`${courses.length} dil · ${totals.lessons} ders`)}</Text>
          </View>

          {/* Hero: pitch | sign-in card */}
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={[styles.pitch, wide && styles.pitchWide]}>
              <Text style={[styles.eyebrow, { color: colors.primaryText }]}>{upperTr('Türkçe konuşanlar için dil okulu')}</Text>
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
              <Text style={[styles.tagline, { color: colors.primaryText }]}>Love-Vox — her gün biraz daha.</Text>
              <Text style={mono}>Çevrimdışı çalışır · İlerlemen hesabında saklanır · Reklamsız</Text>
            </View>

            <View style={[styles.cardCol, wide && styles.cardColWide]} onLayout={mark('card')}>
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

          <Section id="yaklasim" eyebrow="Yaklaşım" title="Her gün birkaç dakika, kalıcı bir dil." colors={colors} onLayout={mark('yaklasim')}>
            <Body color={colors.textMuted} style={styles.lead}>
              Love-Vox, dil öğrenmeyi küçük ve düzenli adımlara böler. Her ders birkaç dakika sürer; öğrendiğin kelimeler aralıklı
              tekrarla, unutmaya başladığın anda yeniden karşına çıkar. Seri, günlük hedef ve rozetler alışkanlığı canlı tutar.
            </Body>
            <View style={[styles.grid, wide && styles.gridWide]}>
              <Stat value={String(courses.length)} label="Dil" colors={colors} wide={wide} />
              <Stat value={String(totals.lessons)} label="Ders" colors={colors} wide={wide} />
              <Stat value={String(totals.words)} label="Kelime" colors={colors} wide={wide} />
              <Stat value="6" label="Alıştırma türü" colors={colors} wide={wide} />
            </View>
          </Section>

          <Section id="kurslar" eyebrow="Kurslar" title="Türkçe'den dört dil." colors={colors} onLayout={mark('kurslar')}>
            <View style={[styles.grid, wide && styles.gridWide]}>
              {courses.map((c, i) => {
                const lessons = c.units.reduce((n, u) => n + u.lessons.length, 0);
                return (
                  <NumberedCard
                    key={c.id}
                    no={String(i + 1).padStart(2, '0')}
                    title={`${LANG_FLAG[c.toLang] ?? '🌐'} ${LANG_NAME[c.toLang] ?? c.toLang}`}
                    text={`${c.units.length} ünite · ${lessons} ders · ${c.vocab.length} kelime`}
                    tag={upperTr('Ücretsiz')}
                    colors={colors}
                    wide={wide}
                  />
                );
              })}
            </View>
          </Section>

          {!inApp && <Platforms colors={colors} wide={wide} onWeb={() => goTo('card')} onLayout={mark('platformlar')} />}

          <Section id="nasil" eyebrow="Nasıl çalışır" title="Dört adımda başla." colors={colors} onLayout={mark('nasil')}>
            <View style={[styles.grid, wide && styles.gridWide]}>
              <NumberedCard no="01" title="Dilini seç" text="İngilizce, Almanca, İspanyolca ya da Fransızca; istediğin zaman değiştir." colors={colors} wide={wide} />
              <NumberedCard no="02" title="Günlük hedef" text="Günde 1 ile 5 ders arası bir hedef belirle; seri her gün büyüsün." colors={colors} wide={wide} />
              <NumberedCard no="03" title="Kısa dersler" text="Çeviri, dinleme, konuşma, eşleştirme: her ders birkaç dakika." colors={colors} wide={wide} />
              <NumberedCard no="04" title="Tekrar et" text="Kelimeler unutmaya başladığın anda tekrar destesine düşer." colors={colors} wide={wide} />
            </View>
          </Section>

          <View style={[styles.footer, { borderColor: colors.border }]}>
            <Text style={mono}>Love-Vox · Bir ANKAXAI çözümü</Text>
            {!inApp && (
              <Pressable onPress={() => void Linking.openURL('https://ankaxai.ai/')} accessibilityRole="link">
                <Text style={[styles.mono, { color: colors.secondaryText }]}>ankaxai.ai ↗</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({
  id,
  eyebrow,
  title,
  colors,
  children,
  onLayout,
}: {
  id: SectionId;
  eyebrow: string;
  title: string;
  colors: ColorTokens;
  children: ReactNode;
  onLayout: (e: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  return (
    <View nativeID={id} onLayout={onLayout} style={[styles.section, { borderColor: colors.border }]}>
      <Text style={[styles.eyebrow, { color: colors.primaryText }]}>{upperTr(eyebrow)}</Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({ value, label, colors, wide }: { value: string; label: string; colors: ColorTokens; wide: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide, { borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.primaryText }]}>{value}</Text>
      <Text style={[styles.mono, { color: colors.textMuted }]}>{upperTr(label)}</Text>
    </View>
  );
}

function NumberedCard({
  no,
  title,
  text,
  tag,
  colors,
  wide,
  onPress,
  action,
}: {
  no: string;
  title: string;
  text: string;
  /** Shown as given: callers uppercase Turkish words with upperTr, never addresses. */
  tag?: string;
  colors: ColorTokens;
  wide: boolean;
  onPress?: () => void;
  /** Label for screen readers when the card is a button. */
  action?: string;
}) {
  const body = (
    <>
      <Text style={[styles.mono, { color: colors.textMuted }]}>{no}</Text>
      <Text style={[styles.cardHeading, { color: colors.text }]}>{title}</Text>
      <Body color={colors.textMuted}>{text}</Body>
      {(tag || onPress) && (
        <View style={styles.cardFoot}>
          {tag ? <Text style={[styles.mono, { color: colors.primaryText }]}>{tag}</Text> : <View />}
          {onPress && <Text style={[styles.arrow, { color: colors.primaryText }]}>↗</Text>}
        </View>
      )}
    </>
  );
  const style = [styles.tile, wide && styles.tileWide, { borderColor: colors.border, backgroundColor: colors.background }];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={action ?? title} style={({ pressed }) => [style, pressed && { backgroundColor: colors.surface }]}>
      {body}
    </Pressable>
  );
}

function Platforms({
  colors,
  wide,
  onWeb,
  onLayout,
}: {
  colors: ColorTokens;
  wide: boolean;
  onWeb: () => void;
  onLayout: (e: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  const pwa = usePwaInstall();
  const [help, setHelp] = useState<null | 'pwa' | 'all'>(null);

  const pwaTag = upperTr(pwa.state === 'installed' ? 'Kurulu' : pwa.state === 'installable' ? 'Tek dokunuşla kur' : 'Kurulabilir');
  const onPwa = async () => {
    if (pwa.state === 'installable') {
      const ok = await pwa.install();
      if (!ok) setHelp('pwa');
    } else setHelp('pwa');
  };

  return (
    <Section id="platformlar" eyebrow="Platformlar" title="Nerede istersen, Love-Vox orada." colors={colors} onLayout={onLayout}>
      <View style={[styles.grid, wide && styles.gridWide]}>
        <NumberedCard
          no="001"
          title="Web"
          text="Tarayıcıdan gir, kurulum gerekmez. Bilgisayar, tablet ve telefonda çalışır."
          tag="ankaxai.ai/lovevox"
          colors={colors}
          wide={wide}
          onPress={onWeb}
          action="Web: tarayıcıdan giriş yap"
        />
        <NumberedCard
          no="002"
          title="Android"
          text="Telefon ve tablet için uygulama. Seslendirme, konuşma tanıma ve günlük hatırlatma telefonun kendi özellikleriyle."
          tag={upperTr('APK indir')}
          colors={colors}
          wide={wide}
          onPress={() => void Linking.openURL(ANDROID_APK_URL)}
          action="Android uygulamasını indir"
        />
        <NumberedCard
          no="003"
          title="PWA"
          text="Tarayıcıdan cihaza kurulan sürüm: ana ekranda kendi simgesiyle, ayrı pencerede açılır."
          tag={pwaTag}
          colors={colors}
          wide={wide}
          onPress={pwa.state === 'installed' ? undefined : () => void onPwa()}
          action="Love-Vox'u cihaza yükle (PWA)"
        />
        <NumberedCard
          no="004"
          title="Kurulum yardımı"
          text="Android, iPhone ve bilgisayar için adım adım kurulum."
          tag={upperTr('Rehber')}
          colors={colors}
          wide={wide}
          onPress={() => setHelp(help === 'all' ? null : 'all')}
          action="Kurulum yardımını göster"
        />
      </View>
      {help && (
        <View style={[styles.help, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
          {help === 'all' && (
            <HelpBlock title="Android (APK)" colors={colors}>
              {'1. "APK indir"e dokun, Love-Vox.apk iner.\n2. İnen dosyayı aç; telefon "bilinmeyen kaynak" izni isterse tarayıcına izin ver.\n3. Yükle\'ye dokun. Uygulama güncellemeleri kendiliğinden gelir.'}
            </HelpBlock>
          )}
          <HelpBlock title="iPhone / iPad (Safari)" colors={colors}>
            {"1. Bu sayfayı Safari'de aç.\n2. Alttaki Paylaş düğmesine (kare ve ok) dokun.\n3. \"Ana Ekrana Ekle\"yi seç, sonra Ekle'ye dokun."}
          </HelpBlock>
          <HelpBlock title="Bilgisayar ve Android (Chrome / Edge)" colors={colors}>
            {'Adres çubuğundaki "Yükle" simgesine ya da tarayıcı menüsündeki "Uygulamayı yükle" / "Ana ekrana ekle" seçeneğine tıkla.'}
          </HelpBlock>
          <Caption>Web adresi: {WEB_APP_URL}</Caption>
        </View>
      )}
    </Section>
  );
}

function HelpBlock({ title, children, colors }: { title: string; children: string; colors: ColorTokens }) {
  return (
    <View style={styles.helpBlock}>
      <Text style={[styles.cardHeading, { color: colors.text }]}>{title}</Text>
      <Body color={colors.textMuted}>{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: spacing.lg },
  inner: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: radii.sm },
  brandName: { fontSize: fontSize.lg, fontWeight: fontWeight.black },
  nav: { flexDirection: 'row', gap: spacing.xl },
  navItem: { paddingVertical: spacing.sm },
  navText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 3 },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 2 },
  strip: { gap: spacing.xs },
  stripWide: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 2.5 },
  columns: { gap: spacing.xxl },
  columnsWide: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xxl },
  pitch: { gap: spacing.lg },
  pitchWide: { flex: 1, paddingRight: spacing.xxl },
  eyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 3 },
  hero: { fontSize: 34, lineHeight: 42, fontWeight: fontWeight.black },
  heroWide: { fontSize: 52, lineHeight: 62 },
  heroAccent: { fontStyle: 'italic' },
  lead: { maxWidth: 640 },
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
  section: { borderTopWidth: 1, paddingTop: spacing.xxl, gap: spacing.lg },
  sectionTitle: { fontSize: 28, lineHeight: 36, fontWeight: fontWeight.black },
  grid: { gap: spacing.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderWidth: 2, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  tileWide: { flexBasis: 240, flexGrow: 1 },
  statValue: { fontSize: 40, fontWeight: fontWeight.black },
  cardHeading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: spacing.sm },
  arrow: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  help: { borderWidth: 2, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.lg },
  helpBlock: { gap: spacing.xs },
  footer: { borderTopWidth: 1, paddingTop: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
});
