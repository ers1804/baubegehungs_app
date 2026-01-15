const CACHE_NAME = 'siteaudit-v10';

// We cache specific file names to avoid ambiguity with directory paths
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Adding assets one by one to ensure failure of one doesn't break the whole cache
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err));
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. Handle Navigation Requests (The "App Shell" Pattern)
  // This is the primary fix for 404s on launch. Any URL navigation within 
  // our scope will serve the index.html from cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((response) => {
        return response || fetch(event.request).catch(() => {
          // Fallback if network and cache both fail
          console.error('[SW] Navigation fetch failed');
        });
      })
    );
    return;
  }

  // 2. Handle Static Assets (Images, Scripts, CSS)
  const isCdn = url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'cdnjs.cloudflare.com';
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin || isCdn) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Don't cache non-successful or non-basic responses (except CDNs)
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Silent fail for non-navigation assets
        });
      })
    );
  }
});