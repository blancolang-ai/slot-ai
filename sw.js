// Cambia VERSION en cada despliegue para que los usuarios reciban la actualización.
const VERSION='slot-ai-v1.3.3';
const ASSETS=['./','index.html','css/app.css','js/icons.js','js/store.js','js/app.js','fonts/pacifico.woff2','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-512-maskable.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).catch(()=>caches.match('index.html'))));
});
