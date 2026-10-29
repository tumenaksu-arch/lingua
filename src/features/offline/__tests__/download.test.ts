import { course, lesson, listen, unit } from '@/content/builder';

import {
  DOWNLOAD_CONCURRENCY,
  TTS_CACHE_NAME,
  countCachedTts,
  courseTtsUrls,
  downloadTtsUrls,
  estimateDownloadMb,
} from '../download';

/** Sahte CacheStorage: tek bir Map ile match/put/delete. */
function fakeCaches() {
  const store = new Map<string, unknown>();
  const cache = {
    put: jest.fn(async (key: unknown) => {
      store.set(String(key), key);
    }),
    match: jest.fn(async (key: unknown) => (store.has(String(key)) ? { cached: String(key) } : undefined)),
  };
  const cachesRef = {
    open: jest.fn(async () => cache),
    delete: jest.fn(async () => {
      store.clear();
      return true;
    }),
  };
  return { store, cache, cachesRef };
}

const originalFetch = globalThis.fetch;
const originalCaches = (globalThis as { caches?: unknown }).caches;

const ok = () => ({ ok: true });
const notFound = () => ({ ok: false, status: 500 });

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://supa.example.test';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as { caches?: unknown }).caches = originalCaches;
  jest.useRealTimers();
});

describe('courseTtsUrls', () => {
  test('metinleri ttsUrl ile hız 1.0 için URL listesine çevirir; tekrarlar tekilleşir', () => {
    const c = course(
      { id: 'd-en', fromLang: 'tr', toLang: 'en', title: 'T' },
      [],
      [unit('d-en.u1', 1, 'U', 't', [lesson('d-en.u1.l1', 1, [], [listen('Hi.'), listen('Hi.'), listen('Bye.')])])],
    );
    const urls = courseTtsUrls(c);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://supa.example.test/tts/v1/speak?lang=en&text=Hi.&speed=1');
    expect(urls[1]).toContain('text=Bye.');
  });

  test('300 karşıı aşan metinler parçalanır', () => {
    const long = `${'word '.repeat(80)}end.`;
    const c = course(
      { id: 'd-en2', fromLang: 'tr', toLang: 'en', title: 'T' },
      [],
      [unit('d-en2.u1', 1, 'U', 't', [lesson('d-en2.u1.l1', 1, [], [listen(long)])])],
    );
    expect(courseTtsUrls(c).length).toBeGreaterThan(1);
  });
});

describe('estimateDownloadMb', () => {
  test('klip başına ~60 KB varsayımıyla MB döndürür', () => {
    expect(estimateDownloadMb(0)).toBe(0);
    expect(estimateDownloadMb(500)).toBe(30);
  });
});

describe('downloadTtsUrls', () => {
  test('başarılı yanıtları önbelleğe yazar ve sayar; boş liste 0 döner', async () => {
    const { cache, cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    globalThis.fetch = jest.fn(async () => ok()) as unknown as typeof fetch;

    const urls = ['u1', 'u2', 'u3'];
    const r = await downloadTtsUrls(urls);
    expect(r).toEqual({ downloaded: 3, failed: 0, total: 3 });
    expect(cache.put).toHaveBeenCalledTimes(3);
    expect(cachesRef.open).toHaveBeenCalledWith(TTS_CACHE_NAME);

    expect(await downloadTtsUrls([])).toEqual({ downloaded: 0, failed: 0, total: 0 });
  });

  test('hata veren ve başarısız yanıt veren URL’ler failed sayılır; önbelleğe yazılmaz', async () => {
    const { cache, cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    globalThis.fetch = jest
      .fn()
      .mockImplementationOnce(async () => ok())
      .mockImplementationOnce(async () => {
        throw new Error('network down');
      })
      .mockImplementationOnce(async () => notFound()) as unknown as typeof fetch;

    const r = await downloadTtsUrls(['a', 'b', 'c']);
    expect(r).toEqual({ downloaded: 1, failed: 2, total: 3 });
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  test('en fazla 4 istek eşzamanlıdır', async () => {
    const { cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    let active = 0;
    let maxActive = 0;
    const urls = Array.from({ length: 11 }, (_, i) => `u${i}`);
    globalThis.fetch = jest.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          setTimeout(() => {
            active -= 1;
            resolve({ ok: true });
          }, 5);
        }),
    ) as unknown as typeof fetch;

    await downloadTtsUrls(urls);
    expect(maxActive).toBe(DOWNLOAD_CONCURRENCY);
    expect(maxActive).toBeLessThanOrEqual(4);
  });

  test('iptal: AbortError ile reddeder ve yeni görev başlatmaz', async () => {
    const { cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    let started = 0;
    globalThis.fetch = jest.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          started += 1;
          setTimeout(() => resolve({ ok: true }), 20);
        }),
    ) as unknown as typeof fetch;

    const ac = new AbortController();
    const promise = downloadTtsUrls(Array.from({ length: 9 }, (_, i) => `u${i}`), { signal: ac.signal });
    setTimeout(() => ac.abort(), 10);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(started).toBeLessThanOrEqual(DOWNLOAD_CONCURRENCY);
  });

  test('ilerleme geri çağırımı ilerledikçe çağrılır', async () => {
    const { cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    globalThis.fetch = jest.fn(async () => ok()) as unknown as typeof fetch;
    const seen: number[] = [];
    await downloadTtsUrls(['a', 'b'], { onProgress: (n, total) => seen.push(n) });
    expect(seen).toEqual([1, 2]);
  });
});

describe('countCachedTts', () => {
  test('önbellekteki URL sayısını döndürür', async () => {
    const { cachesRef } = fakeCaches();
    (globalThis as { caches?: unknown }).caches = cachesRef;
    globalThis.fetch = jest.fn(async () => ok()) as unknown as typeof fetch;
    await downloadTtsUrls(['a', 'b']);
    expect(await countCachedTts(['a', 'b', 'c'])).toBe(2);
  });
});
