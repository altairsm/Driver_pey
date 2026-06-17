const CACHE = 'driverpix-v2';

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});