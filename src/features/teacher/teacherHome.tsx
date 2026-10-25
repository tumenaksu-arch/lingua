import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { courses, getCourse } from '@/content';
import {
  becomeTeacher,
  classProgress,
  createClass,
  isTeacher,
  listMyClasses,
  type ClassDoc,
  type CourseId,
} from '@/data/remote/classes';
import {
  Body,
  Button,
  Caption,
  Heading,
  Screen,
  Title,
  fonts,
  radii,
  spacing,
  upperTr,
  useTheme,
} from '@/ui';

const KVKK_POINTS = [
  'Öğrenciler yalnızca takma adlarıyla görünür; ad, e-posta, telefon ya da okul numarası tutulmaz.',
  'Öğrencilerin tek tek verdiği cevaplara ve e-posta adreslerine erişemezsin; yalnızca öğrenme özetlerini (XP, seri, doğruluk) görürsün.',
  'Öğrenciler istediği zaman sınıftan ayrılabilir ve sınıfa görünen verisini silebilir.',
  'Sınıf açmadan önce velileri bilgilendirmen gerekir; öğrenciler yalnızca takma adla katılır.',
];

interface ClassWithCount extends ClassDoc {
  memberCount: number;
}

/**
 * Teacher panel home (route /ogretmen): the KVKK consent gate on first visit,
 * the class list and the "Sınıf aç" form. Never renders an e-mail address —
 * students are anonymous nicknames by design (docs/tasarim/madde5-ogretmen-sinif.md).
 */
export function TeacherHome() {
  const { colors } = useTheme();
  const [gate, setGate] = useState<'loading' | 'kvkk' | 'ready'>('loading');
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kvkkBusy, setKvkkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listMyClasses();
      const withCounts = await Promise.all(
        docs.map(async (doc) => {
          const members = await classProgress(doc.id);
          return { ...doc, memberCount: members.length };
        }),
      );
      setClasses(withCounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void isTeacher().then((teacher) => {
      if (!alive) return;
      if (teacher) {
        setGate('ready');
      } else {
        setGate('kvkk');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Refetch whenever the panel regains focus: archiving a class from its
  // detail screen pops back here, and without a refetch the just-archived
  // class would linger as a ghost row that leads to a dead end.
  useFocusEffect(
    useCallback(() => {
      if (gate === 'ready') void load();
    }, [gate, load]),
  );

  const acceptKvkk = async () => {
    setKvkkBusy(true);
    try {
      await becomeTeacher();
      setGate('ready');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setKvkkBusy(false);
    }
  };

  return (
    <Screen padding={0} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title>Öğretmen paneli</Title>
          {gate === 'ready' && (
            <Button title="Yenile" variant="outline" block={false} loading={loading} onPress={() => void load()} />
          )}
        </View>

        {error && <Caption color={colors.dangerText}>{error}</Caption>}

        {gate === 'loading' ? (
          <Caption color={colors.textMuted}>Yükleniyor…</Caption>
        ) : gate === 'kvkk' ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Heading>Önce bilgilendirme</Heading>
            {KVKK_POINTS.map((point) => (
              <Body key={point} color={colors.text}>
                • {point}
              </Body>
            ))}
            <Button
              title="Kabul ediyorum, devam"
              accessibilityLabel="KVKK metnini kabul et"
              loading={kvkkBusy}
              onPress={() => void acceptKvkk()}
            />
          </View>
        ) : (
          <>
            <CreateClassForm
              onCreated={(doc) => {
                setClasses((prev) => [{ ...doc, memberCount: 0 }, ...prev]);
              }}
            />
            <Heading>Sınıflarım ({classes.length})</Heading>
            {classes.length === 0 && !loading ? (
              <Caption color={colors.textMuted}>Henüz sınıfın yok. Yukarıdan ilk sınıfını aç.</Caption>
            ) : (
              classes.map((cls) => <ClassCard key={cls.id} cls={cls} />)
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ClassCard({ cls }: { cls: ClassWithCount }) {
  const { colors } = useTheme();
  const course = getCourse(cls.courseId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sınıf ${cls.ad}`}
      onPress={() => router.push(`/ogretmen/${cls.id}`)}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Body numberOfLines={1}>{cls.ad}</Body>
      <Caption color={colors.textMuted}>
        {course?.title ?? cls.courseId} · {cls.memberCount} öğrenci
      </Caption>
      <Text style={[styles.code, { color: colors.primaryText }]} accessibilityLabel={`Sınıf kodu ${cls.joinCode}`}>
        {cls.joinCode}
      </Text>
    </Pressable>
  );
}

function CreateClassForm({ onCreated }: { onCreated: (doc: ClassDoc) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [ad, setAd] = useState('');
  const [courseId, setCourseId] = useState<CourseId>(courses[0]!.id as CourseId);
  const [veliOnay, setVeliOnay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const name = ad.trim();
    if (name.length < 2 || name.length > 40) {
      setError('Sınıf adı 2–40 karakter olmalı.');
      return;
    }
    if (!veliOnay) {
      setError('Devam etmek için velileri bilgilendirdiğini onaylamalısın.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await createClass({ ad: name, courseId, veliBilgilendirildi: true });
      if (doc) {
        onCreated(doc);
        setAd('');
        setVeliOnay(false);
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <Button title="Sınıf aç" variant="secondary" onPress={() => setOpen(true)} accessibilityLabel="Sınıf aç" />;
  }

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Heading>Yeni sınıf</Heading>
      <TextInput
        value={ad}
        onChangeText={setAd}
        placeholder="Sınıf adı (örn. 9-A İngilizce)"
        placeholderTextColor={colors.textMuted}
        maxLength={40}
        accessibilityLabel="Sınıf adı"
        style={[styles.input, { borderColor: colors.borderStrong, color: colors.text }]}
      />
      <Caption color={colors.textMuted}>Kurs</Caption>
      <View style={styles.chips}>
        {courses.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`Kurs ${c.title}`}
            accessibilityState={{ selected: c.id === courseId }}
            onPress={() => setCourseId(c.id as CourseId)}
            style={[styles.chip, { borderColor: c.id === courseId ? colors.primary : colors.borderStrong, backgroundColor: c.id === courseId ? colors.primary : 'transparent' }]}
          >
            <Text style={[styles.chipText, { color: c.id === courseId ? colors.textOnBrand : colors.text }]}>{upperTr(c.title)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: veliOnay }}
        accessibilityLabel="Velileri bilgilendirdim; öğrenciler yalnız takma adla katılır"
        onPress={() => setVeliOnay((v) => !v)}
        style={styles.checkRow}
      >
        <View style={[styles.box, { borderColor: colors.borderStrong, backgroundColor: veliOnay ? colors.primary : 'transparent' }]}>
          {veliOnay && <Text style={styles.boxTick}>✓</Text>}
        </View>
        <Body style={styles.checkLabel}>Velileri bilgilendirdim; öğrenciler yalnız takma adla katılır.</Body>
      </Pressable>
      {error && <Caption color={colors.dangerText}>{error}</Caption>}
      <Button title="Sınıfı oluştur" loading={busy} onPress={() => void submit()} accessibilityLabel="Sınıfı oluştur" />
      <Button title="Vazgeç" variant="outline" onPress={() => setOpen(false)} accessibilityLabel="Vazgeç" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  code: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 6 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, letterSpacing: 1, fontFamily: fonts.mono },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  box: { width: 24, height: 24, borderWidth: 2, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  boxTick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1 },
});
