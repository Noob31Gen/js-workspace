const CACHE_SHELL = 'js-workspace-shell-v1';
const CACHE_NPM = 'js-workspace-npm-v1';

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event - Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_SHELL && name !== CACHE_NPM) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle App Shell & Dynamic NPM Package Caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Dynamic NPM Packages from CDN (esm.sh / skypack / unpkg)
  if (url.hostname.includes('esm.sh') || url.hostname.includes('skypack') || url.hostname.includes('unpkg')) {
    event.respondWith(
      caches.open(CACHE_NPM).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // If offline and not in cache, return fallback json error
          return new Response(
            JSON.stringify({ error: `NPM Package ${url.pathname} is not cached for offline use.` }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // Handle App Shell & Local Static Assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_SHELL).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return cached version if offline
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
