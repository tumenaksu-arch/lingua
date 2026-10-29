/** public/sw-tts.js'in dışa aktardığı API (düz JS — tipleri test tarafında tanımlı). */
interface SwTtsApi {
  TTS_CACHE: string;
  isTtsUrl: (url: URL) => boolean;
  shouldKeepCache: (key: string, shellCache: string) => boolean;
  respondFromTtsCache: (cachesRef: unknown, req: unknown) => Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tts = require('../../../../public/sw-tts.js') as SwTtsApi;

const req = (url: string) => url as unknown;

/** Sahte CacheStorage: isabet/ıskayı bellek üzerinden oynatır. */
function fakeCaches(initial: string[] = []) {
  const store = new Set(initial);
  const cache = {
    put: jest.fn(async (key: unknown) => {
      store.add(String(key));
    }),
    match: jest.fn(async (key: unknown) => (store.has(String(key)) ? { cached: true } : undefined)),
  };
  return { store, cache, cachesRef: { open: jest.fn(async () => cache) } };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('sw-tts: isTtsUrl', () => {
  test('yalnızca /lovevox-api/tts/ yolunu eşler (origin süzgeci sw.js’te)', () => {
    expect(tts.isTtsUrl(new URL('https://ankaxai.ai/lovevox-api/tts/v1/speak?lang=en&text=Hi'))).toBe(true);
    expect(tts.isTtsUrl(new URL('https://ankaxai.ai/lovevox/'))).toBe(false);
    expect(tts.isTtsUrl(new URL('https://ankaxai.ai/lovevox/manifest.json'))).toBe(false);
    expect(tts.isTtsUrl(new URL('https://ankaxai.ai/lovevox-api/auth/v1/token'))).toBe(false);
  });
});

describe('sw-tts: shouldKeepCache', () => {
  test('activate() lovevox-tts-v1 önbelleğini silmez, kabuk önbelleğini korur', () => {
    expect(tts.shouldKeepCache('lovevox-tts-v1', 'lovevox-v1')).toBe(true);
    expect(tts.shouldKeepCache('lovevox-v1', 'lovevox-v1')).toBe(true);
    expect(tts.shouldKeepCache('lovevox-eski-v0', 'lovevox-v1')).toBe(false);
    expect(tts.TTS_CACHE).toBe('lovevox-tts-v1');
  });
});

describe('sw-tts: respondFromTtsCache', () => {
  test('önbellek isabetinde ağ çağrısı yok', async () => {
    const { cache, cachesRef } = fakeCaches(['https://ankaxai.ai/lovevox-api/tts/v1/speak?lang=en']);
    globalThis.fetch = jest.fn() as unknown as typeof fetch;

    const res = (await tts.respondFromTtsCache(cachesRef, req('https://ankaxai.ai/lovevox-api/tts/v1/speak?lang=en'))) as {
      cached: boolean;
    };
    expect(res.cached).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  test('ıskada ağdan alınır, ok yanıt önbelleğe yazılır', async () => {
    const { store, cache, cachesRef } = fakeCaches();
    const network = { ok: true, clone: () => network };
    globalThis.fetch = jest.fn(async () => network) as unknown as typeof fetch;
    const url = 'https://ankaxai.ai/lovevox-api/tts/v1/speak?lang=en&text=Bye';

    const res = await tts.respondFromTtsCache(cachesRef, req(url));
    expect(res).toBe(network);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(store.has(url)).toBe(true);
  });

  test('başarısız yanıt önbelleğe yazılmaz', async () => {
    const { cache, cachesRef } = fakeCaches();
    const network = { ok: false, status: 503 };
    globalThis.fetch = jest.fn(async () => network) as unknown as typeof fetch;

    const res = await tts.respondFromTtsCache(cachesRef, req('https://ankaxai.ai/lovevox-api/tts/v1/speak?x=1'));
    expect(res).toBe(network);
    expect(cache.put).not.toHaveBeenCalled();
  });
});
