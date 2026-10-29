const SHELL = 'onda-shell-v4';
const ROOT = new URL('./', self.registration.scope).href;
const ASSETS = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/onda.svg', 'icons/onda-192.png', 'icons/onda-512.png'].map(p => new URL(p, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('onda-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('index.html', ROOT))));
    return;
  }
  if (ASSETS.includes(url.href)) {
    event.respondWith(caches.match(event.request).then(found => found || fetch(event.request)));
  }
});