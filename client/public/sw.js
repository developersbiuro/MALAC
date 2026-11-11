/* MALAC service worker — the store's files live on the customer's phone.
   (Owner's ask, 2026-11-11: "thori si file client k mobile b download
   ho jay ta k customer ko load or function me kisi bhi kisam ka masla
   na ho" — the essential files + product photos are saved on the phone
   on first load, so repeat opens are instant and a slow connection
   never breaks browsing.)
   - App shell: precached at install; navigations network-first so
     deploys never serve a stale shell, with the cached shell as the
     offline fallback.
   - Static assets (JS/CSS/fonts, content-hashed): stale-while-revalidate.
   - Product photos (cross-origin image hosts): stale-while-revalidate
     in their own bounded cache — photos are the heaviest part of every
     page on a slow connection, so they are served from the phone after
     the first view and refreshed quietly in the background.
   - /api/ and /uploads/ are NEVER cached (orders, account and prices
     always come fresh from the network); non-GET requests are never
     touched. */
const CACHE_NAME = "malac-cache-v3";
const IMG_CACHE_NAME = "malac-images-v1";
const IMG_CACHE_LIMIT = 200;
const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              /* a failed precache entry must not block SW install */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== IMG_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Keep the photo cache bounded: oldest entries go first.
async function trimImageCache() {
  try {
    const cache = await caches.open(IMG_CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length > IMG_CACHE_LIMIT) {
      await Promise.all(keys.slice(0, keys.length - IMG_CACHE_LIMIT).map((k) => cache.delete(k)));
    }
  } catch { /* trimming must never break a page */ }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle plain GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin: only product photos are handled (served from the
  // phone after first view). Everything else — fonts, social links,
  // navigations away — goes straight to the network untouched.
  if (url.origin !== self.location.origin) {
    if (request.destination === "image") {
      event.respondWith(
        caches.open(IMG_CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request);
          const network = fetch(request)
            .then((response) => {
              // Opaque (no-cors) image responses are fine to store.
              if (response && (response.status === 200 || response.type === "opaque")) {
                cache.put(request, response.clone()).then(trimImageCache).catch(() => {});
              }
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      );
    }
    return;
  }

  // API and uploaded media must always come from the network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;

  // Navigations: network-first, falling back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || (await cache.match("/")) || Response.error();
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
