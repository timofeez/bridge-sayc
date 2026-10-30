const CACHE = 'bridge-sayc-v13';
const FILES = ['./', 'index.html', 'app.js', 'data.js', 'engine.js', 'compete.js', 'play.js', 'gamify.js', 'hub.js', 'style.js', 'fx.js', 'history.js', 'theory2.js', 'dd.js', 'ddui.js', 'extra.js', 'theory.js', 'manifest.json', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Сначала сеть (чтобы обновления подтягивались), при офлайне — кэш
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
