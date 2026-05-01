/* eslint-disable no-restricted-globals */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || '/';
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
      }),
  );
});
