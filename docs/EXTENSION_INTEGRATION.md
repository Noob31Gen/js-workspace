# Extension Integration & CORS Bypass

This document describes how the included **Chrome Manifest V3 Extension Helper** allows local web applications to perform cross-origin data fetching.

---

## 1. How CORS Bypass Works

By default, modern web browsers enforce **Same-Origin Policy** and **CORS (Cross-Origin Resource Sharing)**. If a web app on `http://localhost:3000` attempts to fetch `https://news.ycombinator.com/`, the target website must explicitly send an `Access-Control-Allow-Origin` header permitting `localhost:3000`.

Browser extension background scripts with `"host_permissions": ["<all_urls>"]` are exempt from CORS restrictions. By delegating HTTP requests to the extension background worker, your local scripts can fetch any public web page or API payload.

---

## 2. Extension Architecture & Files

The extension resides in `extension/`:

1. **`extension/manifest.json`**:
   - Declares Manifest V3.
   - Configures `externally_connectable` to accept message events from `http://localhost/*` and `http://127.0.0.1:*/*`.
   - Requests `host_permissions: ["<all_urls>"]`.
2. **`extension/background.js`**:
   - Implements `chrome.runtime.onMessageExternal` listener.
   - Executes standard `fetch()` in background context.
   - Returns status, headers, and text/JSON body payload back to the web page.

---

## 3. Installation Guide

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer Mode** using the toggle in the upper-right corner.
4. Click **Load unpacked**.
5. Select the `js-workspace/extension` directory.
6. Note the generated **Extension ID** (e.g. `gpkljhbfae...`).

---

## 4. Connection Detection in Web App

The web app detects if the extension is installed via `extension-client.ts`:

```typescript
export async function checkExtensionStatus(extensionId?: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    return false;
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(extensionId, { type: 'PING' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.pong) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
```

When connected, the web app header displays a green **CORS Helper Connected** badge.
