// Service Worker for AA Portfolio Monitor PWA
// Cache version bump forces update on all clients
const CACHE = 'aa-monitor-v4';

// Pre-cache reports index only (root page uses network-first)
const PRE_CACHE = ['./manifest.json', './reports/index.json'];

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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const path = url.pathname;

  // Root page: ALWAYS network-first (ensure latest dashboard)
  if (path === '/' || path.endsWith('/') || path.endsWith('/index.html') || path === '/index.html') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Report data: network-first
  if (path.includes('/reports/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Static assets (manifest, icons): cache-first for offline speed
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
    const resp = await fetch(request, { cache: 'no-cache' });
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
