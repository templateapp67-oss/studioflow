/* Public offline fallback only. Account, API and payment responses are never cached. */
const CACHE='nexora-customer-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/customer-offline.html'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nexora-customer-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('/customer-offline.html')));
});

self.addEventListener('notificationclick',event=>{
 if(event.notification.data?.type!=='nexora-update')return;
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL(event.notification.data.url||'/?app=1',self.location.origin);
  if(target.origin!==self.location.origin)return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
  // Focus existing work without navigating away from an open form or payment.
  if(existing)return existing.focus();
  return self.clients.openWindow(target.href);
 })());
});
