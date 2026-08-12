export interface ExtensionFetchResponse {
  success: boolean;
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  data?: any;
  error?: string;
}

/**
 * Checks if the CORS Helper Chrome extension is connected.
 */
export async function checkExtensionConnected(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    return false;
  }
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.pong) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Fetches an external URL using the Chrome Extension background worker (bypassing CORS).
 */
export async function fetchViaExtension(url: string, options: any = {}): Promise<ExtensionFetchResponse> {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    return { success: false, error: 'Extension not installed or unavailable in this browser context.' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_PROXY', url, options }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'No response received from extension' });
      }
    });
  });
}
