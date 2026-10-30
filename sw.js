const CACHE_NAME = 'studioflow-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico'
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event: any) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Background Sync
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-workspace-changes') {
    event.waitUntil(syncWorkspaceData());
  }
});

async function syncWorkspaceData() {
  // Logic to retrieve queued changes from IndexedDB/localStorage 
  // and push to Supabase via fetch/post
  console.log('[Service Worker] Syncing workspace changes...');
}
