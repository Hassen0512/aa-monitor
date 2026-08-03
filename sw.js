// Service Worker for AA Portfolio Monitor PWA
const CACHE = 'aa-monitor-v1';
const PRE_CACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-then-network: show cached first, then update
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // API: network-first with cache fallback
  if (e.request.url.includes('/api/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Static: cache-first
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
