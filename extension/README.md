# CORS Fetch Helper - Browser Extension (Dual-Way Isolated Security Edition)

This Chrome/Edge Extension allows the **JS Workspace** web application (`https://js.noob31.com`) to fetch data from external URLs without CORS (Cross-Origin Resource Sharing) restrictions.

---

## 🔒 Dual-Way Information Isolation & Security Architecture

1. **Strict Inbound Filtering**:
   - Manifest rule (`externally_connectable.matches`) limits extension message ports exclusively to `https://js.noob31.com/*`.
   - Runtime background listener validates `sender.origin === 'https://js.noob31.com'` and `sender.url.startsWith('https://js.noob31.com/')`. Any request from any other domain (e.g. `js.noob41.com` or malicious sites) is blocked before any network request occurs.

2. **Outbound Protocol Hardening**:
   - Target fetch URLs are strictly validated to allow `http:` and `https:` schemes only. Access to `file://`, `chrome://`, `javascript:`, or local device APIs is blocked.

3. **Isolated Point-to-Point Output Delivery**:
   - Fetched data is returned **strictly** over the private message callback channel (`sendResponse`) tied to the authenticating `https://js.noob31.com` tab context.
   - The extension never broadcasts, relays, or stores responses in shared storage, preventing data leakage to any third-party website or tab.

---

## 🛠️ Installation Instructions

1. Open **Google Chrome**, **Brave**, or **Microsoft Edge**.
2. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Toggle **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select this `extension/` folder directory.
6. Reload `https://js.noob31.com`, and the **CORS Helper Connected** status badge will turn green.
