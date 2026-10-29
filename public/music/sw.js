// ONDA v5: siempre consultar archivos actuales antes de usar la copia offline.
const SHELL = 'onda-shell-v5';
const ROOT = new URL('./', self.registration.scope);
const ASSETS = ['index.html','styles.css','app.js','manifest.webmanifest','icons/onda.svg','icons/onda-192.png','icons/onda-512.png'].map(p => new URL(p, ROOT).href);
const INDEX = new URL('index.html', ROOT).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(k => k.startsWith('onda-shell-') && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
    // Las versiones antiguas conservaban app.js en cache hasta recargar manualmente.
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(windows.filter(c => c.url.startsWith(ROOT.href)).map(c => c.navigate(c.url).catch(() => {})));
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.href.startsWith(ROOT.href)) return;
  const canonical = new URL(url.pathname, url.origin).href;
  if(event.request.mode !== 'navigate' && !ASSETS.includes(canonical)) return;
  event.respondWith((async () => {
    const key = event.request.mode === 'navigate' ? INDEX : canonical;
    try {
      const response = await fetch(event.request, {cache:'no-store'});
      if(response.ok) {
        const cache = await caches.open(SHELL);
        await cache.put(key, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(key)) || Response.error();
    }
  })());
});
