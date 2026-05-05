/* eslint-disable no-restricted-globals */

const CACHE_VERSION = 'hualas-v1';
const OFFLINE_URL = '/offline.html';

// Static assets that are safe to cache indefinitely (content-addressed by Next.js)
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/favicon\.ico$/,
  /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/,
];

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return STATIC_PATTERNS.some((p) => p.test(path));
}

function isNavigation(request) {
  return request.mode === 'navigate';
}

function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (analytics, CDN scripts, etc.)
  if (!url.startsWith(self.location.origin)) return;

  // API requests: network-only, no caching
  if (isApiRequest(url)) return;

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (isNavigation(request)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response('Sin conexión', { status: 503 });
  }
}

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event || !event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Hualas', body: event.data.text() };
  }
  const title = payload.title || 'Hualas';
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: payload.url || '/', payload: payload.data || null },
    tag: payload.tag || undefined,
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          for (const c of clients) {
            try {
              c.postMessage({ type: 'push-received' });
            } catch (e) {}
          }
        }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if (c.url && c.url.indexOf(self.location.origin) === 0) {
            c.focus();
            if ('navigate' in c) {
              return c.navigate(url).catch(() => null);
            }
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
