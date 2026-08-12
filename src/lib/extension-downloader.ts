const EXTENSION_MANIFEST = `{
  "manifest_version": 3,
  "name": "JS Workspace CORS Fetch Helper",
  "version": "1.0.0",
  "description": "Helper extension allowing local JS Workspace applications to perform cross-origin data fetching.",
  "permissions": [],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "externally_connectable": {
    "matches": [
      "http://localhost/*",
      "http://localhost:*/*",
      "http://127.0.0.1/*",
      "http://127.0.0.1:*/*",
      "https://*/*"
    ]
  }
}
`;

const EXTENSION_BACKGROUND = `// JS Workspace CORS Helper Background Service Worker

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
`;

const EXTENSION_README = `# JS Workspace CORS Fetch Helper Extension

This extension allows JS Workspace scripts to perform cross-origin HTTP fetches without encountering browser CORS restrictions.

## Installation Instructions:
1. Extract this zip file into a folder on your computer.
2. Open Chrome, Edge, or Brave browser.
3. Navigate to \`chrome://extensions\`.
4. Enable **Developer mode** toggle in top-right corner.
5. Click **Load unpacked** button.
6. Select the extracted extension folder.
7. Return to JS Workspace – the status indicator will dynamically change to "CORS Helper Connected"!
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
  zip.file('README.md', EXTENSION_README);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'js-workspace-cors-extension.zip';
  a.click();

  URL.revokeObjectURL(url);
}
