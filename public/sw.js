/*
 * Love-Vox service worker (scope /lovevox/). Makes the web app installable (PWA) and lets it
 * start offline; the app itself keeps its data in the browser (SQLite/OPFS).
 * - Page loads: network first, so a deploy is picked up on the next visit; the last page is
 *   the offline fallback (every route serves the same index.html).
 * - /_expo/ and /assets/ files are content-hashed, so cache first is safe.
 * - /lovevox-api/tts/ GETs (natural voice) are cache-first against the
 *   user-downloaded offline voice pack (lovevox-tts-v1, sw-tts.js); a miss is
 *   fetched and stored, so online use warms the pack too. activate() never
 *   deletes the voice-pack cache.
 */
importScripts('sw-tts.js');

const CACHE = 'lovevox-v1';
const SHELL = '/lovevox/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SHELL, '/lovevox/manifest.json'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !self.LOVEVOX_TTS.shouldKeepCache(k, CACHE))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Natural voice audio: cache-first from the offline pack (works offline),
  // network fill on miss. Only same-origin GETs under /lovevox-api/tts/ take
  // this path (isTtsUrl checks the path only).
  if (url.origin === self.location.origin && self.LOVEVOX_TTS.isTtsUrl(url)) {
    event.respondWith(self.LOVEVOX_TTS.respondFromTtsCache(caches, req));
    return;
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith('/lovevox/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (/^\/lovevox\/(_expo|assets)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
