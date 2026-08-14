declare const chrome: any;

export interface ExtensionFetchResponse {
  success: boolean;
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  data?: any;
  error?: string;
  message?: string;
}

const EXT_AUTH_HASH_KEY = 'js_workspace_ext_auth_hash';
const DOMAIN_SALT = 'js.noob31.com:salt:v1:';
let isExtensionBridgeDetected = false;

/**
 * Generates domain-salted SHA-256 hash using browser Web Crypto API.
 * Prevents rainbow table dictionary attacks against passwords.
 */
export async function hashStringSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(DOMAIN_SALT + text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets cached domain-salted SHA-256 authentication hash.
 * Checks sessionStorage first (high security), then localStorage.
 */
export function getExtensionAuthHash(): string | null {
  try {
    const sessionHash = sessionStorage.getItem(EXT_AUTH_HASH_KEY);
    if (sessionHash) return sessionHash;
    const localHash = localStorage.getItem(EXT_AUTH_HASH_KEY);
    if (localHash) {
      sessionStorage.setItem(EXT_AUTH_HASH_KEY, localHash);
      return localHash;
    }
  } catch (e) {}
  return null;
}

/**
 * Sets and caches domain-salted secret password hash across session & local storage.
 */
export async function setExtensionPassword(password: string): Promise<string> {
  const hash = await hashStringSHA256(password.trim());
  try {
    sessionStorage.setItem(EXT_AUTH_HASH_KEY, hash);
    localStorage.setItem(EXT_AUTH_HASH_KEY, hash);
  } catch (e) {}
  return hash;
}

/**
 * Clears password authentication hash from all storage layers.
 */
export function clearExtensionPassword() {
  try {
    sessionStorage.removeItem(EXT_AUTH_HASH_KEY);
    localStorage.removeItem(EXT_AUTH_HASH_KEY);
  } catch (e) {}
}

// Global window listener for content script announcements & responses
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'JS_WORKSPACE_EXTENSION') {
      isExtensionBridgeDetected = true;
    }
  });
}

/**
 * Checks if the CORS Helper Chrome extension is connected and authenticated.
 */
export async function checkExtensionConnected(): Promise<boolean> {
  const authHash = getExtensionAuthHash();

  if (isExtensionBridgeDetected && !authHash) {
    // Basic detection confirmed via postMessage
  }

  // 1. Handshake via window.postMessage (Content Script bridge)
  if (typeof window !== 'undefined') {
    const detectedViaPostMessage = await new Promise<boolean>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.source === 'JS_WORKSPACE_EXTENSION') {
          window.removeEventListener('message', handler);
          isExtensionBridgeDetected = true;
          const res = event.data.response;
          if (res && res.error === 'AUTH_FAILED') {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING', authHash }, '*');
      setTimeout(() => {
        window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING', authHash }, '*');
      }, 150);

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(isExtensionBridgeDetected);
      }, 1000);
    });

    if (detectedViaPostMessage) return true;
  }

  // 2. Fallback via chrome.runtime.sendMessage if available
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'PING', authHash }, (response: any) => {
          if (chrome.runtime.lastError || !response || !response.pong || response.error === 'AUTH_FAILED') {
            resolve(false);
          } else {
            isExtensionBridgeDetected = true;
            resolve(true);
          }
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  return false;
}

/**
 * Fetches an external URL using the Chrome Extension background worker (bypassing CORS).
 * Automatically passes domain-salted SHA-256 authHash.
 */
export async function fetchViaExtension(url: string, options: any = {}): Promise<ExtensionFetchResponse> {
  const authHash = getExtensionAuthHash();

  // 1. Execute via Content Script bridge (window.postMessage)
  if (typeof window !== 'undefined') {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const responseViaPostMessage = await new Promise<ExtensionFetchResponse | null>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (
          event.data &&
          event.data.source === 'JS_WORKSPACE_EXTENSION' &&
          event.data.type === 'JS_WORKSPACE_FETCH_RESPONSE' &&
          event.data.requestId === requestId
        ) {
          window.removeEventListener('message', handler);
          resolve(event.data.response);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_FETCH', requestId, url, options, authHash }, '*');
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 15000);
    });

    if (responseViaPostMessage) return responseViaPostMessage;
  }

  // 2. Fallback via direct chrome.runtime.sendMessage
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'FETCH_PROXY', url, options, authHash }, (response: any) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response received from extension' });
        }
      });
    });
  }

  return { success: false, error: 'Extension not installed or unavailable in this browser context.' };
}
