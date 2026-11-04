const CACHE_NAME = 'baraem-cache-v4';
const ASSETS = ['./', './index.html', './manifest.json', './css/style.css', './js/db.js', './js/seed.js', './js/xlsx.js', './js/cloud.js', './js/family.js', './vendor/firebase-app-compat.js', './vendor/firebase-auth-compat.js', './vendor/firebase-firestore-compat.js', './js/app.js', './img/logo-192.png', './img/banner.jpg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // الشبكة أولاً ثم الكاش، حتى تصل التحديثات ويعمل التطبيق بدون إنترنت
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
