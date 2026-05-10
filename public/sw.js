/* eslint-disable no-restricted-globals */

const CACHE_VERSION = 'hualas-v2';
const OFFLINE_URL = '/offline.html';
const PAGE_CACHE_PREFIX = '/__hualas_page_cache__';

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

function isPageCacheRequest(url) {
  return new URL(url).pathname.startsWith(PAGE_CACHE_PREFIX);
}

function pageCacheRequest(request) {
  const url = new URL(request.url);
  return new Request(
    `${self.location.origin}${PAGE_CACHE_PREFIX}${url.pathname}${url.search}`
  );
}

function isHtmlResponse(response) {
  return response.headers.get('content-type')?.includes('text/html');
}

async function putCacheResponse(cache, request, response) {
  cache.put(request, response.clone());
  if (isHtmlResponse(response)) {
    cache.put(pageCacheRequest(request), response.clone());
  }
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

  if (isPageCacheRequest(url)) return;

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

  // Next.js route/data prefetches: keep them available for client navigation
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await putCacheResponse(cache, request, response);
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
      await putCacheResponse(cache, request, response);
    }
    return response;
  } catch {
    const cachedPage = await caches.match(pageCacheRequest(request));
    if (cachedPage) return cachedPage;
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response('Sin conexión', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await putCacheResponse(cache, request, response);
    }
    return response;
  } catch {
    const cachedPage = await caches.match(pageCacheRequest(request));
    if (cachedPage) return cachedPage;
    const cached = await caches.match(request);
    return cached ?? new Response('', { status: 503 });
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
