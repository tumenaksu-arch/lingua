/*
 * Servis çalışanının TTS kolu için saf yardımcılar. public/sw.js bu dosyayı
 * importScripts ile yükler; birim testi de aynı dosyayı node'da require eder
 * (module.exports dalı). İki ortam için de `caches` ve `fetch` dışarıdan gelir.
 */
const TTS_CACHE = 'lovevox-tts-v1';

/** Yalnızca doğal ses uç noktası (EXPO_PUBLIC_SUPABASE_URL altındaki /tts/). */
const TTS_PATH_PREFIX = '/lovevox-api/tts/';

function isTtsUrl(url) {
  return url.pathname.indexOf(TTS_PATH_PREFIX) === 0;
}

/** activate() temizliği bu önbelleği korumalı: kabuk önbelleği silinir, ses paketi kalır. */
function shouldKeepCache(key, shellCache) {
  return key === shellCache || key === TTS_CACHE;
}

/**
 * Önbellek-öncelikli TTS yanıtı: isabet varsa ağa hiç çıkılmaz (çevrimdışı çalma
 * buradan olur); ıskada ağdan alınır ve yanıt ok ise önbelleğe doldurulur.
 */
function respondFromTtsCache(cachesRef, req) {
  return cachesRef.open(TTS_CACHE).then(function (cache) {
    return cache.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

var api = { TTS_CACHE: TTS_CACHE, isTtsUrl: isTtsUrl, shouldKeepCache: shouldKeepCache, respondFromTtsCache: respondFromTtsCache };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  // Service worker kapsamı: sw.js self.LOVEVOX_TTS üzerinden kullanır.
  self.LOVEVOX_TTS = api;
}
