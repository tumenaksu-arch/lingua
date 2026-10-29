import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getUnitStory } from '@/content/stories';
import type { Course } from '@/domain/types';
import { Body, Button, Caption, ProgressBar, showAlert, spacing, useTheme } from '@/ui';

import { clearTtsCache, countCachedTts, courseTtsUrls, downloadTtsUrls, estimateDownloadMb } from './download';

type PackStatus = 'checking' | 'idle' | 'downloading' | 'done';

/**
 * Profil → "Çevrimdışı" bölümü (yalnızca web/Android WebView kabuğu gösterir):
 * kursun doğal seslerini `lovevox-tts-v1` önbelleğine indirir; servis çalışanı
 * TTS isteklerini bu önbellekten yanıtlar. Önbellek API'si yoksa (test/ortaam
 * sapması) kart kendini gizlemez, yalnızca indirme düğmesi hata bildirir.
 */
export function OfflineAudioCard({ course }: { course: Course }) {
  const { colors } = useTheme();
  const urls = useMemo(() => courseTtsUrls(course, getUnitStory), [course]);
  const [status, setStatus] = useState<PackStatus>('checking');
  const [doneCount, setDoneCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    let cached = 0;
    try {
      if (typeof caches !== 'undefined') cached = await countCachedTts(urls);
    } catch {
      /* önbellek okunamıyorsa kart indirme düğümüne döner */
    }
    setDoneCount(cached);
    setStatus(cached >= urls.length && urls.length > 0 ? 'done' : 'idle');
  }, [urls]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let cached = 0;
      try {
        if (typeof caches !== 'undefined') cached = await countCachedTts(urls);
      } catch {
        /* önbellek okunamıyorsa kart indirme düğümüne döner */
      }
      if (!alive) return;
      setDoneCount(cached);
      setStatus(cached >= urls.length && urls.length > 0 ? 'done' : 'idle');
    })();
    return () => {
      alive = false;
    };
  }, [urls]);

  const start = async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('downloading');
    setDoneCount(0);
    try {
      const r = await downloadTtsUrls(urls, { signal: ac.signal, onProgress: (n) => setDoneCount(n) });
      if (r.failed > 0) {
        showAlert('İndirme eksik tamamlandı', `${r.downloaded} ses indirildi, ${r.failed} ses indirilemedi. Bağlantını kontrol edip tekrar dene.`);
      }
    } catch {
      // İptal (AbortError) veya ağ çöküşü: durum yeniden hesaplamayla düzelir.
    } finally {
      abortRef.current = null;
      await refresh();
    }
  };

  const remove = async () => {
    try {
      await clearTtsCache();
    } catch {
      /* yok sayılabilir */
    }
    await refresh();
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <Body>Doğal ses çevrimdışı paketi</Body>
        {status === 'done' && <Caption color={colors.success}>İndirildi ✓</Caption>}
      </View>
      {status === 'checking' ? (
        <Caption color={colors.textMuted}>Boyut hesaplanıyor…</Caption>
      ) : status === 'downloading' ? (
        <>
          <ProgressBar progress={urls.length > 0 ? doneCount / urls.length : 0} color={colors.primary} />
          <Caption color={colors.textMuted}>İndiriliyor… {doneCount}/{urls.length} ses</Caption>
          <Button title="İptal" variant="outline" onPress={() => abortRef.current?.abort()} />
        </>
      ) : status === 'done' ? (
        <>
          <Caption color={colors.textMuted}>Bu kursun ders ve hikâye sesleri önbellekten anında çalınır.</Caption>
          <Button title="İndirildi ✓ · Sil" variant="outline" onPress={() => void remove()} />
        </>
      ) : (
        <>
          <Caption color={colors.textMuted}>
            ≈{estimateDownloadMb(urls.length)} MB · {urls.length} ses · hız %100
          </Caption>
          <Button title="Bu kursun seslerini indir" onPress={() => void start()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
});
