/* Fitrack service worker — offline shell + runtime caching */
const CACHE = 'fitrack-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML = url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'));

  if (isHTML) {
    // network-first so the app updates, fall back to cache offline
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // cache-first for assets (fonts, exercise DB json, exercise images)
  e.respondWith(
    caches.match(req).then(m => {
      if (m) return m;
      return fetch(req).then(r => {
        try {
          if (r && r.ok) {
            const cache = url.origin === location.origin || /githubusercontent|gstatic|googleapis/.test(url.hostname);
            if (cache) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
          }
        } catch (x) {}
        return r;
      }).catch(() => m);
    })
  );
});
