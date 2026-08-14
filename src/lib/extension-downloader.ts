const EXTENSION_MANIFEST = `{
  "manifest_version": 3,
  "name": "JS Workspace CORS Fetch Helper",
  "version": "1.0.0",
  "description": "Helper extension allowing JS Workspace (js.noob31.com) to perform cross-origin data fetching.",
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "content_scripts": [
    {
      "matches": [
        "https://js.noob31.com/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_start"
    }
  ],
  "externally_connectable": {
    "matches": [
      "https://js.noob31.com/*"
    ]
  }
}
`;

const EXTENSION_BACKGROUND = `// JS Workspace CORS Helper Background Service Worker
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

  if (!isAllowedOrigin(sender)) {
    console.warn(\`[Security Alert] Request rejected from unauthorized origin: "\${sender.url}"\`);
    sendResponse({
      success: false,
      error: \`Access Denied: Extension strictly exchanges data with \${ALLOWED_ORIGIN} only.\`
    });
    return true;
  }

  chrome.storage.local.get(['extension_auth_hash'], (res) => {
    const storedHash = res.extension_auth_hash;

    if (storedHash) {
      if (!request.authHash || request.authHash !== storedHash) {
        sendResponse({
          success: false,
          error: 'AUTH_FAILED',
          message: 'Authentication failed: Invalid or missing security password hash.'
        });
        return;
      }
    }

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

    if (request.type === 'FETCH_PROXY') {
      const { url, options } = request;

      try {
        const parsedTargetUrl = new URL(url);
        if (parsedTargetUrl.protocol !== 'http:' && parsedTargetUrl.protocol !== 'https:') {
          sendResponse({
            success: false,
            error: \`Blocked target URL scheme: "\${parsedTargetUrl.protocol}". Only http: and https: protocols are permitted.\`
          });
          return;
        }
      } catch (e) {
        sendResponse({
          success: false,
          error: \`Invalid target URL provided: "\${url}"\`
        });
        return;
      }

      fetch(url, options || {})
        .then(async (response) => {
          const contentType = response.headers.get('content-type') || '';
          let data;

          if (contentType.includes('application/json')) {
            try { data = await response.json(); } catch (e) { data = await response.text(); }
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

  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onMessageExternal.addListener(handleMessage);
`;

const EXTENSION_CONTENT = `// JS Workspace Extension Content Script Bridge

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

window.postMessage({ source: "JS_WORKSPACE_EXTENSION", type: "JS_WORKSPACE_ANNOUNCE" }, "*");
setTimeout(() => {
  window.postMessage({ source: "JS_WORKSPACE_EXTENSION", type: "JS_WORKSPACE_ANNOUNCE" }, "*");
}, 500);
`;

const EXTENSION_OPTIONS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>JS Workspace Extension Security Settings</title>
  <style>
    :root { --bg: #090d16; --card-bg: #111827; --card-border: #1f293d; --text: #f3f4f6; --text-muted: #9ca3af; --primary: #3b82f6; --primary-hover: #2563eb; --primary-light: rgba(59,130,246,0.15); --success: #10b981; --success-bg: rgba(16,185,129,0.15); --warning: #f59e0b; --warning-bg: rgba(245,158,11,0.15); }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .container { width: 100%; max-width: 480px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--card-border); }
    .title { font-size: 18px; font-weight: 700; }
    .subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .status-card { padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
    .status-card.configured { background: var(--success-bg); border: 1px solid rgba(16,185,129,0.3); color: var(--success); }
    .status-card.unconfigured { background: var(--warning-bg); border: 1px solid rgba(245,158,11,0.3); color: var(--warning); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .configured .status-dot { background: var(--success); }
    .unconfigured .status-dot { background: var(--warning); }
    label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
    input[type="password"] { width: 100%; padding: 12px 14px; background: #0d131f; border: 1px solid var(--card-border); border-radius: 10px; color: var(--text); font-size: 14px; font-family: monospace; outline: none; margin-bottom: 16px; }
    .btn-group { display: flex; gap: 10px; }
    button { flex: 1; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 24px;">🔒</div>
      <div>
        <div class="title">Extension Security Options</div>
        <div class="subtitle">JS Workspace CORS Helper (js.noob31.com)</div>
      </div>
    </div>
    <div id="statusBox" class="status-card unconfigured">
      <div>
        <span class="status-dot"></span>
        <span id="statusText">Password Hash Not Configured</span>
      </div>
    </div>
    <form id="authForm">
      <label for="passwordInput">Secret Security Password</label>
      <input type="password" id="passwordInput" placeholder="Enter secret password..." required autocomplete="off" />
      <div id="hashPreview" style="font-family: monospace; font-size: 10px; color: #6b7280; margin-bottom: 16px;"></div>
      <div class="btn-group">
        <button type="submit" class="btn-primary">Save & Hash Password</button>
        <button type="button" id="clearBtn" class="btn-secondary">Clear Auth</button>
      </div>
    </form>
  </div>
  <script src="options.js"></script>
</body>
</html>
`;

const EXTENSION_OPTIONS_JS = `// Extension Options Page Logic - Domain-Salted SHA-256 Hashing & Storage

const DOMAIN_SALT = 'js.noob31.com:salt:v1:';

async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(DOMAIN_SALT + str);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('statusBox');
  const statusText = document.getElementById('statusText');
  const authForm = document.getElementById('authForm');
  const passwordInput = document.getElementById('passwordInput');
  const clearBtn = document.getElementById('clearBtn');
  const hashPreview = document.getElementById('hashPreview');

  function updateStatusUI(hash) {
    if (hash) {
      statusBox.className = 'status-card configured';
      statusText.textContent = 'Domain-Salted Hash Active';
      hashPreview.textContent = \`Salted SHA-256: \${hash.substring(0, 16)}...\${hash.substring(48)}\`;
    } else {
      statusBox.className = 'status-card unconfigured';
      statusText.textContent = 'Password Hash Not Configured';
      hashPreview.textContent = '';
    }
  }

  chrome.storage.local.get(['extension_auth_hash'], (res) => {
    updateStatusUI(res.extension_auth_hash);
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (!password) return;

    const hash = await sha256Hex(password);
    chrome.storage.local.set({ extension_auth_hash: hash }, () => {
      updateStatusUI(hash);
      passwordInput.value = '';
      alert('Security password hash saved successfully!');
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['extension_auth_hash'], () => {
      updateStatusUI(null);
      passwordInput.value = '';
      alert('Security authentication hash cleared.');
    });
  });
});
`;

const EXTENSION_README = `# JS Workspace CORS Fetch Helper Extension

This extension allows JS Workspace (https://js.noob31.com) scripts to perform cross-origin HTTP fetches without encountering browser CORS restrictions.

## Security Configuration:
1. Load unpacked extension in \`chrome://extensions\`.
2. Right click the extension icon and select **Options** (or click Extension Options in Chrome Settings).
3. Set your secret password. The extension will compute and store a domain-salted SHA-256 hash.
4. Open \`https://js.noob31.com\`, click the CORS Helper menu, enter the same password, and click **Save Hash**.
`;

/**
 * Dynamically packages and downloads the Chrome V3 Extension as a .zip file.
 */
export async function downloadExtensionZip(): Promise<void> {
  const cdnUrl = 'https://esm.sh/jszip';
  const JSZipModule = await import(/* @vite-ignore */ cdnUrl);
  const JSZip = JSZipModule.default || JSZipModule;
  const zip = new JSZip();

  zip.file('manifest.json', EXTENSION_MANIFEST);
  zip.file('background.js', EXTENSION_BACKGROUND);
  zip.file('content.js', EXTENSION_CONTENT);
  zip.file('options.html', EXTENSION_OPTIONS_HTML);
  zip.file('options.js', EXTENSION_OPTIONS_JS);
  zip.file('README.md', EXTENSION_README);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'js-workspace-cors-extension.zip';
  a.click();

  URL.revokeObjectURL(url);
}
