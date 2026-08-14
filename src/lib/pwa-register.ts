/**
 * PWA Service Worker Registration & Offline Package Pre-caching Engine
 */

export interface OfflineStatus {
  isOnline: boolean;
  swRegistered: boolean;
}

export function registerServiceWorker(onStatusChange?: (status: OfflineStatus) => void): () => void {
  let swRegistered = false;

  const updateStatus = () => {
    if (onStatusChange) {
      onStatusChange({
        isOnline: navigator.onLine,
        swRegistered
      });
    }
  };

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          swRegistered = true;
          updateStatus();
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
          updateStatus();
        });
    });
  }

  const handleOnline = () => updateStatus();
  const handleOffline = () => updateStatus();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  updateStatus();

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

const PRECACHED_PKGS_KEY = 'js_workspace_precached_pkgs';

export function getPrecachedPackages(): string[] {
  try {
    const stored = localStorage.getItem(PRECACHED_PKGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return ['lodash', 'dayjs', 'papaparse'];
}

export function savePrecachedPackage(packageName: string) {
  try {
    const list = getPrecachedPackages();
    if (!list.includes(packageName)) {
      list.push(packageName);
      localStorage.setItem(PRECACHED_PKGS_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

export function removePrecachedPackage(packageName: string) {
  try {
    const list = getPrecachedPackages().filter(p => p !== packageName);
    localStorage.setItem(PRECACHED_PKGS_KEY, JSON.stringify(list));
  } catch (e) {}
}

const NODE_CORE_MODULES = [
  'fs', 'path', 'crypto', 'buffer', 'util', 'events', 'process',
  'readline', 'stream', 'http', 'https', 'url', 'os', 'zlib', 'child_process', 'assert'
];

export function isNodeCoreModule(packageName: string): boolean {
  const clean = packageName.trim().toLowerCase().replace(/^node:/, '');
  return NODE_CORE_MODULES.includes(clean);
}

function isErrorResponseText(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  const lower = text.toLowerCase();
  if (
    lower.includes('/* esm.sh - error:') ||
    lower.includes('cannot find package') ||
    lower.includes('package not found') ||
    lower.includes('could not resolve') ||
    lower.includes('404: not found') ||
    lower.includes('404 not found') ||
    (lower.startsWith('{') && lower.includes('"error"'))
  ) {
    return true;
  }
  return false;
}

/**
 * Pre-fetches an NPM package from CDN into local CacheStorage for offline use.
 * Correctly handles HTTP redirects, synthetic response caching, and sub-resource imports.
 */
export async function precacheNpmPackage(packageName: string): Promise<boolean> {
  if (!packageName || !packageName.trim()) return false;
  const cleanName = packageName.trim();

  if (isNodeCoreModule(cleanName)) {
    savePrecachedPackage(cleanName);
    return true;
  }

  const cdnUrls = [
    `https://esm.sh/${cleanName}`,
    `https://cdn.jsdelivr.net/npm/${cleanName}/+esm`,
    `https://unpkg.com/${cleanName}?module`
  ];

  if (typeof window === 'undefined' || !('caches' in window)) {
    console.warn('CacheStorage API not supported in this browser environment.');
    return false;
  }

  try {
    const cache = await caches.open('js-workspace-npm-v1');
    let fetchedSuccess = false;

    for (const targetUrl of cdnUrls) {
      try {
        const response = await fetch(targetUrl, { mode: 'cors' });
        if (response.ok) {
          const finalUrl = response.url || targetUrl;
          const text = await response.text();

          if (isErrorResponseText(text)) {
            continue; // Skip error bundle response from CDN
          }

          // Create a synthetic clean 200 response to prevent redirect caching errors
          const syntheticResponse = new Response(text, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            }
          });

          // Cache under the requested CDN URL and final URL
          await cache.put(targetUrl, syntheticResponse.clone());
          if (finalUrl !== targetUrl) {
            await cache.put(finalUrl, syntheticResponse.clone());
          }
          await cache.put(`https://esm.sh/${cleanName}`, syntheticResponse.clone());

          // Parse nested ESM sub-imports (e.g. import "./v135/...") and pre-fetch them as well
          const importRegex = /import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;
          let match: RegExpExecArray | null;
          const subFetchPromises: Promise<void>[] = [];

          while ((match = importRegex.exec(text)) !== null) {
            const subPath = match[1];
            if (subPath) {
              let absoluteSubUrl = subPath;
              if (subPath.startsWith('/')) {
                absoluteSubUrl = `https://esm.sh${subPath}`;
              } else if (subPath.startsWith('.')) {
                const baseUrl = new URL(finalUrl);
                absoluteSubUrl = new URL(subPath, baseUrl.href).href;
              }
              if (absoluteSubUrl.startsWith('http')) {
                subFetchPromises.push(
                  (async () => {
                    try {
                      const subRes = await fetch(absoluteSubUrl, { mode: 'cors' });
                      if (subRes.ok) {
                        const subText = await subRes.text();
                        const subSynth = new Response(subText, {
                          status: 200,
                          statusText: 'OK',
                          headers: {
                            'Content-Type': 'application/javascript; charset=utf-8',
                            'Access-Control-Allow-Origin': '*'
                          }
                        });
                        await cache.put(absoluteSubUrl, subSynth);
                      }
                    } catch (err) {}
                  })()
                );
              }
            }
          }

          if (subFetchPromises.length > 0) {
            await Promise.allSettled(subFetchPromises);
          }

          savePrecachedPackage(cleanName);
          fetchedSuccess = true;
          break;
        }
      } catch (err) {
        console.warn(`CDN fetch attempt failed for ${targetUrl}:`, err);
      }
    }

    return fetchedSuccess;
  } catch (e) {
    console.warn(`Failed to precache NPM package ${cleanName}:`, e);
    return false;
  }
}
