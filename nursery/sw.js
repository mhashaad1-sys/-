const CACHE_NAME = 'nursery-cache-v1';
const ASSETS = ['./', './index.html', './manifest.json', './css/style.css', './js/db.js', './js/app.js', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // الشبكة أولاً ثم الكاش، حتى تصل التحديثات ويعمل التطبيق بدون إنترنت
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
