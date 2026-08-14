// JS Workspace Extension Content Script Bridge
// Relays window.postMessage calls from js.noob31.com to background service worker

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.source === "JS_WORKSPACE_PAGE") {
    const { type, requestId, url, options, authHash } = event.data;

    if (type === "JS_WORKSPACE_PING") {
      try {
        chrome.runtime.sendMessage({ type: "PING", authHash }, (response) => {
          const lastErr = chrome.runtime.lastError;
          window.postMessage({
            source: "JS_WORKSPACE_EXTENSION",
            type: "JS_WORKSPACE_PONG",
            version: "1.0.0",
            response: lastErr ? { success: false, error: lastErr.message } : response
          }, "*");
        });
      } catch (err) {
        window.postMessage({
          source: "JS_WORKSPACE_EXTENSION",
          type: "JS_WORKSPACE_PONG",
          version: "1.0.0",
          response: { success: false, error: err.message }
        }, "*");
      }
    } else if (type === "JS_WORKSPACE_FETCH") {
      try {
        chrome.runtime.sendMessage({ type: "FETCH_PROXY", url, options, authHash }, (response) => {
          const lastErr = chrome.runtime.lastError;
          window.postMessage({
            source: "JS_WORKSPACE_EXTENSION",
            type: "JS_WORKSPACE_FETCH_RESPONSE",
            requestId,
            response: lastErr ? { success: false, error: lastErr.message } : response
          }, "*");
        });
      } catch (err) {
        window.postMessage({
          source: "JS_WORKSPACE_EXTENSION",
          type: "JS_WORKSPACE_FETCH_RESPONSE",
          requestId,
          response: { success: false, error: err.message }
        }, "*");
      }
    }
  }
});

// Announce presence to page immediately and after load
window.postMessage({ source: "JS_WORKSPACE_EXTENSION", type: "JS_WORKSPACE_ANNOUNCE" }, "*");
setTimeout(() => {
  window.postMessage({ source: "JS_WORKSPACE_EXTENSION", type: "JS_WORKSPACE_ANNOUNCE" }, "*");
}, 500);
