/*
 * Served by the server at /lingua/sw.js after the app moved from /lingua/ to /lovevox/
 * (every other /lingua/ URL redirects). Browsers that installed the old service worker fetch
 * this as its update: it deletes the old caches, unregisters itself and reloads open pages,
 * which then follow the redirect to /lovevox/.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('lingua')) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
    })(),
  );
});
