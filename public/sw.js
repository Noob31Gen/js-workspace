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

  // Handle Dynamic NPM Packages from CDN (esm.sh / skypack / unpkg / jsdelivr)
  if (url.hostname.includes('esm.sh') || url.hostname.includes('skypack') || url.hostname.includes('unpkg') || url.hostname.includes('jsdelivr')) {
    event.respondWith(
      caches.open(CACHE_NPM).then(async (cache) => {
        let cachedResponse = await cache.match(event.request);
        if (!cachedResponse) {
          const cleanUrl = event.request.url.split('?')[0];
          cachedResponse = await cache.match(cleanUrl);
        }
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            const text = await networkResponse.text();
            const synthResponse = new Response(text, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': networkResponse.headers.get('Content-Type') || 'application/javascript; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
              }
            });
            cache.put(event.request, synthResponse.clone());
            cache.put(event.request.url.split('?')[0], synthResponse.clone());
            return synthResponse;
          }
          return networkResponse;
        } catch {
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
