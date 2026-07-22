/* Apollo service worker — caches recent data-saver audio for offline replay. */
const CACHE = "apollo-audio-v1";
const MAX_ENTRIES = 24;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  const drop = keys.length - MAX_ENTRIES;
  for (let i = 0; i < drop; i++) {
    await cache.delete(keys[i]);
  }
}

async function putAudio(url) {
  try {
    const cache = await caches.open(CACHE);
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return;
    await cache.put(url, res.clone());
    await trimCache(cache);
  } catch {
    /* offline / network error */
  }
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_AUDIO" || typeof data.url !== "string") {
    return;
  }
  event.waitUntil(putAudio(data.url));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/audio")) return;
  if (url.searchParams.get("quality") !== "data-saver") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const network = await fetch(req);
        if (network.ok) {
          await cache.put(req, network.clone());
          await trimCache(cache);
        }
        return network;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })()
  );
});
