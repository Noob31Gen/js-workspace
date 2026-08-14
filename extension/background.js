// JS Workspace CORS Helper Background Service Worker
// Production Security Policy: Exclusively hardened for https://js.noob31.com

const ALLOWED_ORIGIN = 'https://js.noob31.com';

function isAllowedOrigin(sender) {
  const senderUrl = sender.url || '';
  if (!senderUrl) return false;
  try {
    const u = new URL(senderUrl);
    return u.protocol === 'https:' && u.hostname === 'js.noob31.com';
  } catch (e) {
    return false;
  }
}

function handleMessage(request, sender, sendResponse) {
  if (!request) return;

  // 1. PRODUCTION INBOUND ORIGIN SECURITY CHECK
  // Accepts messages strictly from https://js.noob31.com
  if (!isAllowedOrigin(sender)) {
    console.warn(`[Security Alert] Extension request rejected from unauthorized origin: "${sender.url}"`);
    sendResponse({
      success: false,
      error: `Access Denied: Extension strictly exchanges data with ${ALLOWED_ORIGIN} only.`
    });
    return true;
  }

  // 2. HEALTH CHECK HANDSHAKE
  if (request.type === 'PING') {
    sendResponse({
      pong: true,
      version: '1.0.0',
      allowedOrigin: ALLOWED_ORIGIN,
      secureChannel: true
    });
    return true;
  }

  // 3. SECURE CORS-BYPASS FETCH PROXY
  if (request.type === 'FETCH_PROXY') {
    const { url, options } = request;

    // Validate target URL protocol (only HTTP and HTTPS allowed)
    try {
      const parsedTargetUrl = new URL(url);
      if (parsedTargetUrl.protocol !== 'http:' && parsedTargetUrl.protocol !== 'https:') {
        sendResponse({
          success: false,
          error: `Blocked target URL scheme: "${parsedTargetUrl.protocol}". Only http: and https: protocols are permitted.`
        });
        return true;
      }
    } catch (e) {
      sendResponse({
        success: false,
        error: `Invalid target URL provided: "${url}"`
      });
      return true;
    }

    // Execute external HTTP request
    fetch(url, options || {})
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (e) {
            data = await response.text();
          }
        } else {
          data = await response.text();
        }

        // 4. ISOLATED RESPONSE DELIVERY
        // Sends fetched data directly back ONLY to the calling sender channel (https://js.noob31.com)
        sendResponse({
          success: true,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          data: data
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || 'Fetch request failed'
        });
      });

    return true; // Keep message channel open for async response
  }
}

// Handle messages from Content Script Bridge
chrome.runtime.onMessage.addListener(handleMessage);

// Handle messages from Externally Connectable Pages
chrome.runtime.onMessageExternal.addListener(handleMessage);
