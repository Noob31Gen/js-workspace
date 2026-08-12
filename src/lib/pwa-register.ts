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

/**
 * Pre-fetches an NPM package from CDN into local CacheStorage for offline use.
 */
export async function precacheNpmPackage(packageName: string): Promise<boolean> {
  if (!packageName || !packageName.trim()) return false;
  const cleanName = packageName.trim();
  const cdnUrl = `https://esm.sh/${cleanName}`;

  try {
    const cache = await caches.open('js-workspace-npm-v1');
    const response = await fetch(cdnUrl);
    if (response.ok) {
      await cache.put(cdnUrl, response);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`Failed to precache NPM package ${cleanName}:`, e);
    return false;
  }
}
