/**
 * Unified Service Worker for JS Workspace
 * Combines:
 * 1. PWA App Shell precaching & offline asset serving (Stale-While-Revalidate)
 * 2. Dynamic CDN NPM package caching (esm.sh, unpkg, jsdelivr, skypack)
 * 3. Virtual Node.js HTTP Server routing & streaming response synthesis (/__virtual__/:port/*)
 */

const DEBUG = false;
const CACHE_SHELL = 'js-workspace-shell-v2';
const CACHE_NPM = 'js-workspace-npm-v2';

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// Virtual Server State
let mainPort = null;
const pendingRequests = new Map();
let requestId = 0;
const registeredPorts = new Set();

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Lifecycle: Install & Activate
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  if (DEBUG) console.log('[SW] Install event triggered');
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (DEBUG) console.log('[SW] Activate event triggered');
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

// ---------------------------------------------------------------------------
// Virtual Server Message Handling (ServerBridge IPC)
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  if (DEBUG) console.log('[SW] Message received:', type, 'ports:', event.ports?.length > 0);

  if (type === 'init' && event.ports && event.ports[0]) {
    mainPort = event.ports[0];
    mainPort.onmessage = handleMainMessage;
    if (DEBUG) console.log('[SW] Main port channel connected');
    self.clients.claim();
  }

  if (type === 'server-registered' && data) {
    registeredPorts.add(data.port);
    if (DEBUG) console.log(`[SW] Virtual server registered on port ${data.port}`);
  }

  if (type === 'server-unregistered' && data) {
    registeredPorts.delete(data.port);
    if (DEBUG) console.log(`[SW] Virtual server unregistered from port ${data.port}`);
  }
});

function handleMainMessage(event) {
  const { type, id, data, error } = event.data || {};

  if (DEBUG) console.log('[SW] Message from main thread:', type, 'id:', id);

  if (type === 'response') {
    const pending = pendingRequests.get(id);
    if (pending) {
      pendingRequests.delete(id);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(data);
      }
    }
  }

  if (type === 'stream-start') {
    const pending = pendingRequests.get(id);
    if (pending && pending.streamController) {
      pending.streamData = data;
      pending.resolveHeaders(data);
    }
  }

  if (type === 'stream-chunk') {
    const pending = pendingRequests.get(id);
    if (pending && pending.streamController && data?.chunkBase64) {
      try {
        const bytes = base64ToBytes(data.chunkBase64);
        pending.streamController.enqueue(bytes);
      } catch {
        // Enqueue error
      }
    }
  }

  if (type === 'stream-end') {
    const pending = pendingRequests.get(id);
    if (pending && pending.streamController) {
      try {
        pending.streamController.close();
      } catch {
        // Stream already closed
      }
      pendingRequests.delete(id);
    }
  }
}

async function sendRequest(port, method, url, headers, body) {
  if (!mainPort) {
    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'sw-needs-init' });
    }
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (mainPort) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });
    if (!mainPort) {
      throw new Error('Service Worker not initialized - no connection to main thread');
    }
  }

  const id = ++requestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Virtual Request timeout'));
      }
    }, 30000);

    mainPort.postMessage({
      type: 'request',
      id,
      data: { port, method, url, headers, body }
    });
  });
}

async function sendStreamingRequest(port, method, url, headers, body) {
  if (!mainPort) {
    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'sw-needs-init' });
    }
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (mainPort) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });
    if (!mainPort) {
      throw new Error('Service Worker not initialized');
    }
  }

  const id = ++requestId;
  let resolveHeaders;
  const headersPromise = new Promise((resolve) => { resolveHeaders = resolve; });

  const stream = new ReadableStream({
    start(controller) {
      pendingRequests.set(id, {
        resolve: () => {},
        reject: (err) => controller.error(err),
        streamController: controller,
        resolveHeaders
      });

      mainPort.postMessage({
        type: 'request',
        id,
        data: { port, method, url, headers, body, streaming: true }
      });
    },
    cancel() {
      pendingRequests.delete(id);
    }
  });

  return { stream, headersPromise, id };
}

async function handleStreamingRequest(port, method, path, headers, body) {
  const { stream, headersPromise } = await sendStreamingRequest(port, method, path, headers, body);
  const responseData = await headersPromise;

  const respHeaders = new Headers(responseData?.headers || {});
  respHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
  respHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  respHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
  respHeaders.delete('X-Frame-Options');

  return new Response(stream, {
    status: responseData?.statusCode || 200,
    statusText: responseData?.statusMessage || 'OK',
    headers: respHeaders
  });
}

async function handleVirtualRequest(request, port, path) {
  try {
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    const isStreamingCandidate = request.method === 'POST' && path.startsWith('/api/');
    if (isStreamingCandidate) {
      return handleStreamingRequest(port, request.method, path, headers, body);
    }

    const response = await sendRequest(port, request.method, path, headers, body);

    let finalResponse;
    if (response.bodyBase64 && response.bodyBase64.length > 0) {
      try {
        const bytes = base64ToBytes(response.bodyBase64);
        const blob = new Blob([bytes], { type: response.headers['Content-Type'] || 'application/octet-stream' });
        const respHeaders = new Headers(response.headers);
        respHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
        respHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        respHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
        respHeaders.delete('X-Frame-Options');

        finalResponse = new Response(blob, {
          status: response.statusCode,
          statusText: response.statusMessage,
          headers: respHeaders
        });
      } catch (decodeError) {
        finalResponse = new Response(`Decode error: ${decodeError.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    } else {
      finalResponse = new Response(null, {
        status: response.statusCode,
        statusText: response.statusMessage,
        headers: response.headers
      });
    }

    return finalResponse;
  } catch (error) {
    return new Response(`Service Worker Virtual Server Error: ${error.message}`, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// ---------------------------------------------------------------------------
// Unified Fetch Event Dispatcher
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Virtual Server Routing (/__virtual__/:port/*)
  const virtualMatch = url.pathname.match(/^\/__virtual__\/(\d+)(\/.*)?$/);
  if (virtualMatch) {
    const port = parseInt(virtualMatch[1], 10);
    const path = virtualMatch[2] || '/';
    event.respondWith(handleVirtualRequest(event.request, port, path + url.search));
    return;
  }

  // 2. Referrer-based Virtual Server Context
  const referer = event.request.referrer;
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererMatch = refererUrl.pathname.match(/^\/__virtual__\/(\d+)/);
      if (refererMatch) {
        const virtualPrefix = refererMatch[0];
        const virtualPort = parseInt(refererMatch[1], 10);
        const targetPath = url.pathname + url.search;

        if (event.request.mode === 'navigate') {
          const redirectUrl = url.origin + virtualPrefix + targetPath;
          event.respondWith(Response.redirect(redirectUrl, 302));
          return;
        } else {
          event.respondWith(handleVirtualRequest(event.request, virtualPort, targetPath));
          return;
        }
      }
    } catch {
      // Ignore invalid referrer
    }
  }

  // 3. Dynamic NPM Package Caching (esm.sh / unpkg / jsdelivr / skypack)
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
          return new Response(
            JSON.stringify({ error: `NPM Package ${url.pathname} is not cached for offline use.` }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // 4. App Shell & Local Static Assets (Stale-While-Revalidate)
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
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
