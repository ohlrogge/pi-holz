/* Offline-Speicher für Teddys Spieleecke: zeigt sofort die gespeicherte Fassung,
   holt im Hintergrund die neueste und meldet der Seite, wenn sie sich unterscheidet.
   Die Seite lädt sich dann selbst neu, sobald gerade nichts läuft. */
const CACHE = 'teddy-v5';
const DATEIEN = ['./', 'teddy.js', 'teddikub.html', 'teddydoku.html', 'teddymania.html', 'teddyversi.html', 'teddyaergert.html', 'goetzbergermuehle.html',
  'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'favicon.svg', 'favicon-32.png'];

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

/* Nur Seiten und Skripte koennen eine neue Fassung bedeuten. Bilder und das
   Manifest aendern sich zusammen mit ihnen und muessen nicht geprueft werden. */
function textartig(res) {
  const t = res.headers.get('content-type') || '';
  return t.includes('html') || t.includes('javascript');
}

/* teddy.js steckt in jeder Seite, eine Aenderung dort betrifft alle offenen
   Fenster. Sonst ist nur das Fenster gemeint, das genau diese Datei anzeigt. */
async function melden(url) {
  const k = schluessel(url);
  const ueberall = new URL(url).pathname.endsWith('/teddy.js');
  for (const c of await self.clients.matchAll({ type: 'window' })) {
    if (ueberall || schluessel(c.url) === k) c.postMessage({ teddy: 'neueFassung' });
  }
}

async function pruefen(url, alt, neu) {
  if (!textartig(neu)) return;
  const [a, b] = await Promise.all([alt.text(), neu.clone().text()]);
  if (a !== b) await melden(url);
}

async function aktualisieren(cache, url) {
  const res = await holen(url);
  await cache.put(schluessel(url), res.clone());
  return res;
}

/* Eine einzelne Datei, die gerade nicht kommt, darf die Installation nicht
   kippen - sonst steht am Ende gar kein Offline-Speicher, statt nur einer
   Datei zu wenig. Was fehlt, holt der fetch-Zweig beim ersten Zugriff nach. */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(DATEIEN.map((d) =>
      aktualisieren(cache, new URL(d, self.registration.scope).href).catch(() => {})));
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
      const alt = treffer.clone();
      e.waitUntil(frisch.then((neu) => pruefen(req.url, alt, neu)).catch(() => {}));
      return treffer;
    }
    try { return await frisch; } catch (err) { return fetch(req); }
  })());
});
