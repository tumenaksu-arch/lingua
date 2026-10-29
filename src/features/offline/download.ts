import type { Story } from '@/content/stories';
import type { Course } from '@/domain/types';
import { chunkText, ttsUrl } from '@/speech/serverTts';
import { collectCourseTexts } from './collectTexts';

/**
 * Çevrimdışı doğal ses paketi indirme yöneticisi (web/Android WebView kabuğu).
 * URL'ler serverTts.ts'in `ttsUrl` dışa aktarımıyla, speakServer'in istediğiyle
 * birebir aynı biçimde üretilir; >300 karşılık metinler chunkText ile aynı
 * parçalara bölünür. Servis çalışanı (public/sw.js + sw-tts.js) bu önbelleği
 * TTS GET'lerinde önce kontrol eder.
 */

/** Önbellek adı public/sw-tts.js ile birebir aynı olmalı; değiştirilirse orası da değişir. */
export const TTS_CACHE_NAME = 'lovevox-tts-v1';

export const DOWNLOAD_CONCURRENCY = 4;

/** Bir ≤300 karşılık mp3 klibinin yaklaşık boyutu — "(≈N MB)" etiketi için. */
export const APPROX_BYTES_PER_CLIP = 60_000;

/** Kursun tüm seslendirilen metinlerinin hız 1.0 URL listesi (tekil). */
export function courseTtsUrls(course: Course, getStory?: (unitId: string) => Story | undefined): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const { text, lang } of collectCourseTexts(course, getStory)) {
    for (const chunk of chunkText(text)) {
      const url = ttsUrl(chunk, lang, 1);
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/** İndirme düğmesindeki tahmini boyut (MB, tam sayı). */
export function estimateDownloadMb(urlCount: number): number {
  return Math.round((urlCount * APPROX_BYTES_PER_CLIP) / 1_000_000);
}

export interface TtsDownloadResult {
  downloaded: number;
  failed: number;
  total: number;
}

export interface TtsDownloadOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

function abortError(): Error {
  const e = new Error('İndirme iptal edildi.');
  e.name = 'AbortError';
  return e;
}

/**
 * URL listesini en fazla DOWNLOAD_CONCURRENCY eşzamanlı istekle `caches`'teki
 * TTS önbelleğine indirir. Başarısız/bozuk yanıtlar `failed` sayılır; ağ hatası
 * tek bir klibi düşürür, kalanlar devam eder. `signal` abort edilirse derhal
 * AbortError ile reddeder (uçuştaki istekler sonuçsuz kalır).
 */
export function downloadTtsUrls(urls: string[], opts: TtsDownloadOptions = {}): Promise<TtsDownloadResult> {
  if (urls.length === 0) return Promise.resolve({ downloaded: 0, failed: 0, total: 0 });
  return caches.open(TTS_CACHE_NAME).then(
    (cache) =>
      new Promise<TtsDownloadResult>((resolve, reject) => {
        const { signal, onProgress } = opts;
        let index = 0;
        let running = 0;
        let settled = 0;
        let downloaded = 0;
        let failed = 0;

        const abort = () => reject(abortError());
        signal?.addEventListener('abort', abort, { once: true });

        const finish = () => {
          signal?.removeEventListener('abort', abort);
          resolve({ downloaded, failed, total: urls.length });
        };

        const pump = () => {
          if (signal?.aborted) return; // abort dinleyicisi reddi zaten gönderdi
          while (index < urls.length && running < DOWNLOAD_CONCURRENCY) {
            const url = urls[index]!;
            index += 1;
            running += 1;
            fetch(url)
              .then(async (res) => {
                if (res.ok) {
                  await cache.put(url, res);
                  downloaded += 1;
                } else {
                  failed += 1;
                }
              })
              .catch(() => {
                failed += 1;
              })
              .finally(() => {
                running -= 1;
                settled += 1;
                onProgress?.(settled, urls.length);
                if (settled === urls.length) finish();
                else pump();
              });
          }
        };
        pump();
      }),
  );
}

/** Listenin kaç URL'si önbellekte hazır? (Profil kartının "İndirildi ✓" durumu.) */
export async function countCachedTts(urls: string[]): Promise<number> {
  const cache = await caches.open(TTS_CACHE_NAME);
  let n = 0;
  for (const url of urls) {
    if (await cache.match(url)) n += 1;
  }
  return n;
}

/** Paketi tamamen sil (Profil'deki "Sil" düğmesi). */
export async function clearTtsCache(): Promise<void> {
  await caches.delete(TTS_CACHE_NAME);
}
