const CACHE_NAME = "bankbuch-v2";
const ASSETS = [
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase & Co: immer normal ins Netz

  // Die App-Seite selbst (index.html / Navigation) IMMER frisch vom Server holen,
  // damit Updates sofort ankommen. Nur offline greift der Cache als Notlösung.
  const isPage = req.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");
  if (isPage) {
    event.respondWith(
      fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Andere eigene Dateien (Icon, Manifest): cache-first, im Hintergrund aktualisieren
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      });
      return cached || fetchPromise;
    })
  );
});
