const CACHE = 'bridge-sayc-v20';
const AUDIO = 'bridge-sayc-audio-v2'; // выпуски подкаста кэшируются отдельно и переживают обновления
const FILES = ['./', 'index.html', 'app.js', 'data.js', 'engine.js', 'compete.js', 'play.js', 'gamify.js', 'hub.js', 'style.js', 'fx.js', 'history.js', 'theory2.js', 'dd.js', 'ddui.js', 'extra.js', 'tatarkin.js', 'lab.js', 'sputnik.js', 'sputnik2.js', 'podcast.js', 'theory.js', 'manifest.json', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

// Кусок файла по заголовку Range — без этого плеер не умеет перематывать
async function rangeResponse(full, range) {
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1;
  if (m && !m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Аудио подкаста: из кэша (с поддержкой перемотки), иначе прямо из сети — без вмешательства
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith(caches.open(AUDIO).then(async c => {
      const hit = await c.match(url.pathname);
      if (hit) return e.request.headers.has('range') ? rangeResponse(hit, e.request.headers.get('range')) : hit;
      return fetch(e.request);
    }));
    return;
  }
  // Остальное: сначала сеть (чтобы обновления подтягивались), при офлайне — кэш
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request))
  );
});

// Приложение просит сохранить выпуск для офлайна: скачиваем файл целиком
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'cache-audio') {
    e.waitUntil(caches.open(AUDIO).then(async c => {
      if (await c.match(e.data.path)) return;
      const r = await fetch(e.data.path, { cache: 'no-cache' });
      if (r.ok && r.status === 200) await c.put(e.data.path, r);
    }).catch(() => {}));
  }
});
