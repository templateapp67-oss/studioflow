const CACHE_NAME = "salon-website-v2";
const DYNAMIC_CACHE = "salon-dynamic-assets-v1";

const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.css', '.js'];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => (key.startsWith('salon-website-') || key.startsWith('salon-dynamic-assets-')) && key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
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
  }
});

// Background Sync API implementation for appointment requests and offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments' || event.tag === 'sync-offline-actions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC', tag: event.tag });
        });
      })
    );
  }
});