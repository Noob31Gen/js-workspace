// JS Workspace CORS Helper Background Service Worker
// Strictly Hardened Dual-Way Isolation Security Policy for https://js.noob31.com and localhost

const ALLOWED_HOSTS = ['js.noob31.com', 'localhost', '127.0.0.1'];

function isAllowedOrigin(sender) {
  const senderUrl = sender.url || '';
  if (!senderUrl) return false;
  try {
    const u = new URL(senderUrl);
    return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch (e) {
    return false;
  }
}

function handleMessage(request, sender, sendResponse) {
  if (!request) return;

  // 1. INBOUND ORIGIN SECURITY CHECK
  if (!isAllowedOrigin(sender)) {
    console.warn(`[Security Block] Rejected request from unauthorized origin: "${sender.url}"`);
    sendResponse({
      success: false,
      error: `Access Denied: Extension strictly exchanges data with authorized domains only.`
    });
    return true;
  }

  // 2. HEALTH CHECK HANDSHAKE
  if (request.type === 'PING') {
    sendResponse({
      pong: true,
      version: '1.0.0',
      allowedHosts: ALLOWED_HOSTS,
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
        // Sends fetched data directly back ONLY to the calling sender channel
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
