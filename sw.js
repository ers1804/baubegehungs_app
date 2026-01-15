
const CACHE_NAME = 'siteaudit-v3';
// Get the current path (e.g., /site-audit-pro/)
const BASE_PATH = self.location.pathname.replace('sw.js', '');

const ASSETS_TO_CACHE = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests within our folder scope
  if (url.pathname.startsWith(BASE_PATH)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cache or fetch from network
        return response || fetch(event.request).catch(() => {
          // SPA fallback to index.html for navigation
          if (event.request.mode === 'navigate') {
            return caches.match(BASE_PATH + 'index.html');
          }
        });
      })
    );
  }
});
