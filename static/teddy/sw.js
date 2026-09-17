/* Offline-Speicher für Teddys Spieleecke: zeigt sofort die gespeicherte Fassung
   und holt im Hintergrund die neueste (wirkt beim nächsten Öffnen). */
const CACHE = 'teddy-v1';
const DATEIEN = ['./', 'teddikub.html', 'teddydoku.html', 'teddymania.html', 'teddyversi.html',
  'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

// Cloudflare leitet /x.html auf /x und /index.html auf / um – beides unter einem Schlüssel ablegen.
function schluessel(url) {
  const u = new URL(url);
  let p = u.pathname;
  if (p.endsWith('/index.html')) p = p.slice(0, -10);
  else if (p.endsWith('.html')) p = p.slice(0, -5);
  return u.origin + p;
}

// Safari verweigert umgeleitete Antworten aus dem Service Worker, daher neu verpacken.
async function holen(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(res.status);
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: 200, headers: res.headers });
}

async function aktualisieren(cache, url) {
  const res = await holen(url);
  await cache.put(schluessel(url), res.clone());
  return res;
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(DATEIEN.map((d) => aktualisieren(cache, new URL(d, self.registration.scope).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const treffer = await cache.match(schluessel(req.url));
    const frisch = aktualisieren(cache, req.url);
    if (treffer) {
      e.waitUntil(frisch.catch(() => {}));
      return treffer;
    }
    try { return await frisch; } catch (err) { return fetch(req); }
  })());
});
