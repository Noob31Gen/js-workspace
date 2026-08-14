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

export interface ExtensionStatusResult {
  connected: boolean;
  authRequired: boolean;
  authenticated: boolean;
  status: 'CONNECTED_SECURE' | 'CONNECTED_NO_AUTH' | 'AUTH_FAILED' | 'NOT_DETECTED';
  message: string;
}

const EXT_AUTH_HASH_KEY = 'js_workspace_ext_auth_hash';
const DOMAIN_SALT = 'js.noob31.com:salt:v1:';
let isExtensionBridgeDetected = false;

/**
 * Generates domain-salted SHA-256 hash using browser Web Crypto API.
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
 * Sets and caches domain-salted secret password hash.
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
 * Checks detailed status of Chrome Extension connection and authentication.
 */
export async function checkExtensionDetailedStatus(): Promise<ExtensionStatusResult> {
  const authHash = getExtensionAuthHash();

  if (typeof window !== 'undefined') {
    const res = await new Promise<any>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.source === 'JS_WORKSPACE_EXTENSION' && event.data.type === 'JS_WORKSPACE_PONG') {
          window.removeEventListener('message', handler);
          isExtensionBridgeDetected = true;
          resolve(event.data.response || {});
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING', authHash }, '*');
      setTimeout(() => {
        window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING', authHash }, '*');
      }, 150);
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 1000);
    });

    if (res) {
      if (res.error === 'AUTH_FAILED') {
        return {
          connected: true,
          authRequired: true,
          authenticated: false,
          status: 'AUTH_FAILED',
          message: 'Password Mismatch: Password configured in extension, but site hash is invalid or missing.'
        };
      }
      if (res.authRequired && res.authenticated) {
        return {
          connected: true,
          authRequired: true,
          authenticated: true,
          status: 'CONNECTED_SECURE',
          message: 'Extension Connected & Authenticated with SHA-256 password hash.'
        };
      }
      if (res.pong && !res.authRequired) {
        return {
          connected: true,
          authRequired: false,
          authenticated: true,
          status: 'CONNECTED_NO_AUTH',
          message: 'Extension Active without password protection. Set password to lock requests.'
        };
      }
    }
  }

  const isConn = await checkExtensionConnected();
  if (isConn) {
    return {
      connected: true,
      authRequired: !!authHash,
      authenticated: true,
      status: authHash ? 'CONNECTED_SECURE' : 'CONNECTED_NO_AUTH',
      message: authHash ? 'Extension Connected & Authenticated' : 'Extension Active (No Password Configured)'
    };
  }

  return {
    connected: false,
    authRequired: false,
    authenticated: false,
    status: 'NOT_DETECTED',
    message: 'Helper Extension Not Detected.'
  };
}

/**
 * Checks if the CORS Helper Chrome extension is connected and authenticated.
 */
export async function checkExtensionConnected(): Promise<boolean> {
  const authHash = getExtensionAuthHash();

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
 */
export async function fetchViaExtension(url: string, options: any = {}): Promise<ExtensionFetchResponse> {
  const authHash = getExtensionAuthHash();

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
