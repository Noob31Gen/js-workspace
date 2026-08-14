// JS Workspace CORS Helper Background Service Worker
// Production Security Policy: Exclusively hardened for https://js.noob31.com with SHA-256 Auth

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

  // 1. INBOUND ORIGIN SECURITY CHECK
  if (!isAllowedOrigin(sender)) {
    console.warn(`[Security Alert] Request rejected from unauthorized origin: "${sender.url}"`);
    sendResponse({
      success: false,
      error: `Access Denied: Extension strictly exchanges data with ${ALLOWED_ORIGIN} only.`
    });
    return true;
  }

  // Retrieve stored SHA-256 auth hash from chrome.storage.local
  chrome.storage.local.get(['extension_auth_hash'], (res) => {
    const storedHash = res.extension_auth_hash;

    // If password hash is set in extension options, verify request.authHash
    if (storedHash) {
      if (!request.authHash || request.authHash !== storedHash) {
        sendResponse({
          success: false,
          error: 'AUTH_FAILED',
          message: 'Authentication failed: Invalid or missing security password hash. Please configure password in site & extension settings.'
        });
        return;
      }
    }

    // 2. HEALTH CHECK HANDSHAKE
    if (request.type === 'PING') {
      sendResponse({
        pong: true,
        version: '1.0.0',
        allowedOrigin: ALLOWED_ORIGIN,
        authRequired: !!storedHash,
        authenticated: true
      });
      return;
    }

    // 3. SECURE CORS-BYPASS FETCH PROXY
    if (request.type === 'FETCH_PROXY') {
      const { url, options } = request;

      try {
        const parsedTargetUrl = new URL(url);
        if (parsedTargetUrl.protocol !== 'http:' && parsedTargetUrl.protocol !== 'https:') {
          sendResponse({
            success: false,
            error: `Blocked target URL scheme: "${parsedTargetUrl.protocol}". Only http: and https: protocols are permitted.`
          });
          return;
        }
      } catch (e) {
        sendResponse({
          success: false,
          error: `Invalid target URL provided: "${url}"`
        });
        return;
      }

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
    }
  });

  return true; // Keep channel open for async chrome.storage.local callback
}

// Handle messages from Content Script Bridge
chrome.runtime.onMessage.addListener(handleMessage);

// Handle messages from Externally Connectable Pages
chrome.runtime.onMessageExternal.addListener(handleMessage);
