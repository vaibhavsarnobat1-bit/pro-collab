/*
 * Retired service worker.
 *
 * The previous build cached /assets/ and index.html cache-first under a
 * version string that no build step bumped, so every redeploy kept serving the
 * old bundle against the new HTML and the app mounted to a blank page.
 * Offline support is not worth that failure mode, so this worker deletes every
 * cache it owns and unregisters itself. Existing clients pick it up on their
 * next load and are clean from then on.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
