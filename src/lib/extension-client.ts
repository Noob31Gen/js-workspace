declare const chrome: any;

export interface ExtensionFetchResponse {
  success: boolean;
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  data?: any;
  error?: string;
}

let isExtensionBridgeDetected = false;

// Global window listener for content script announcements & responses
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'JS_WORKSPACE_EXTENSION') {
      isExtensionBridgeDetected = true;
    }
  });
}

/**
 * Checks if the CORS Helper Chrome extension is connected.
 * Supports both Content Script bridge (postMessage) and direct chrome.runtime.sendMessage.
 */
export async function checkExtensionConnected(): Promise<boolean> {
  if (isExtensionBridgeDetected) return true;

  // 1. Handshake via window.postMessage (Content Script bridge)
  if (typeof window !== 'undefined') {
    const detectedViaPostMessage = await new Promise<boolean>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.source === 'JS_WORKSPACE_EXTENSION') {
          window.removeEventListener('message', handler);
          isExtensionBridgeDetected = true;
          resolve(true);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING' }, '*');
      setTimeout(() => {
        window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_PING' }, '*');
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
        chrome.runtime.sendMessage({ type: 'PING' }, (response: any) => {
          if (chrome.runtime.lastError || !response || !response.pong) {
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
      window.postMessage({ source: 'JS_WORKSPACE_PAGE', type: 'JS_WORKSPACE_FETCH', requestId, url, options }, '*');
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
      chrome.runtime.sendMessage({ type: 'FETCH_PROXY', url, options }, (response: any) => {
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
