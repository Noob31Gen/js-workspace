// JS Workspace CORS Helper Background Service Worker

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (!request) return;

  // Connection health check
  if (request.type === 'PING') {
    sendResponse({ pong: true, version: '1.0.0' });
    return true;
  }

  // CORS-Bypass Fetch Proxy
  if (request.type === 'FETCH_PROXY') {
    const { url, options } = request;

    fetch(url, options || {})
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          data = await response.json();
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

    return true; // Keep message channel open for async response
  }
});
