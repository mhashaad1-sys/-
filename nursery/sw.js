const CACHE_NAME = 'baraem-cache-v10';
const ASSETS = ['./', './index.html', './manifest.json', './css/style.css', './js/db.js', './js/seed.js', './js/xlsx.js', './js/cloud.js', './js/family.js', './js/extras.js', './js/homework.js', './js/learn.js', './js/plans.js', './js/more.js', './img/quran/093.png', './img/quran/094.png', './img/quran/095.png', './img/quran/096.png', './img/quran/097.png', './img/quran/099.png', './img/quran/100.png', './img/quran/101.png', './img/quran/102.png', './img/quran/001.png', './img/quran/103.png', './img/quran/104.png', './img/quran/105.png', './img/quran/106.png', './img/quran/107.png', './img/quran/108.png', './img/quran/109.png', './img/quran/110.png', './img/quran/111.png', './img/quran/112.png', './img/quran/113.png', './img/quran/114.png', './vendor/firebase-app-compat.js', './vendor/firebase-auth-compat.js', './vendor/firebase-firestore-compat.js', './js/app.js', './img/logo-192.png', './img/apple-touch-icon.png', './img/banner.jpg'];

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

// الضغط على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./index.html');
  }));
});
