const CACHE_NAME='pdf-signer-pro-v2.1.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./vendor/pdf-lib.min.js','./vendor/pdf.min.js','./vendor/pdf.worker.min.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('pdf-signer-pro-')&&key!==CACHE_NAME)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Only app assets are cached. User documents never pass through this worker.
 const scope=new URL('./',self.location.href).pathname;
 const relative=url.pathname.startsWith(scope)?'./'+url.pathname.slice(scope.length):null;
 if(!ASSETS.includes(relative))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response}
  catch{const cached=await cache.match(event.request);if(cached)return cached;throw new Error('Recurso não disponível offline.')}
 })());
});
