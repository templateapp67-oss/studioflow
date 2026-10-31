/* Nexora Customer App Service Worker: caching critical assets, dynamic images/fonts, and offline fallback */
const CACHE_NAME = 'nexora-customer-cache-v3';
const DYNAMIC_CACHE = 'nexora-dynamic-assets-v2';

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/customer-offline.html',
  '/customer.webmanifest',
  '/customer-icon-192.png',
  '/customer-icon-512.png'
];

const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.css', '.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => (key.startsWith('nexora-customer-cache-') || key.startsWith('nexora-dynamic-assets-')) && key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests within origin or image CDNs
  if (event.request.method !== 'GET') {
    return;
  }

  const pathname = url.pathname.toLowerCase();
  const isStaticAsset = STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext)) ||
                        url.hostname.includes('unsplash.com') ||
                        url.hostname.includes('images.unsplash.com') ||
                        url.pathname.includes('/assets/') ||
                        url.pathname.includes('/templates/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigation requests: try network first, fall back to cached index.html or offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexCache = await caches.match('/index.html');
          if (indexCache) return indexCache;
          return caches.match('/customer-offline.html');
        })
    );
    return;
  }
});

self.addEventListener('notificationclick', (event) => {
  if (event.notification.data?.type !== 'nexora-update') return;
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data.url || '/?app=1', self.location.origin);
    if (target.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow(target.href);
  })());
});
