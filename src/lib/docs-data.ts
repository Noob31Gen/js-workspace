export interface DocItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

export const DOCS_REGISTRY: Record<string, DocItem> = {
  'ARCHITECTURE.md': {
    id: 'ARCHITECTURE.md',
    title: 'System Architecture & Web Worker Sandbox',
    category: 'Architecture',
    content: `# System Architecture & Execution Sandbox

The **JS Workspace** platform is a browser-native script execution environment, IDE, and virtual Node.js filesystem built to execute JavaScript, process local data files, and fetch network APIs completely inside your browser.

---

## Core Subsystems Architecture

\`\`\`
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN THREAD / REACT UI                          │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐  ┌────────────────┐  │
│   │ Folder Tree / IDE  │   │ JSDoc Option Form │  │ Header & CORS  │  │
│   │ Virtual Filesystem │   │ Generator         │  │ Indicator      │  │
│   └─────────┬──────────┘   └─────────┬─────────┘  └───────┬────────┘  │
└─────────────┼────────────────────────┼────────────────────┼────────────┘
              │ postMessage()          │ options            │ Chrome Msg
              ▼                        ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ISOLATED WEB WORKER                             │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Node.js Environment Polyfills                                  │   │
│   │ (fs, path, crypto, buffer, os, util, process, console)         │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Script Execution Context (runFn / IIFE Sandbox)                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 1. Isolated Web Worker Sandbox

User-written JavaScript scripts execute off-the-main-thread inside an isolated **Web Worker**. This architecture guarantees:
- **UI Responsiveness**: Heavy computational tasks, loops, and data parsing never lock or freeze the browser UI.
- **Infinite Loop Abort & Timeout**: The main thread monitors execution duration. If a script exceeds the configurable timeout (default 30 seconds), \`worker.terminate()\` is called immediately to kill the execution.
- **Console Streaming**: \`console.log\`, \`console.warn\`, \`console.error\`, and \`console.table\` calls inside the worker are intercepted and streamed in real-time to the interactive Console panel via \`postMessage\`.

---

## 2. In-Memory Virtual Filesystem & Node Polyfills

JS Workspace provides a browser-native implementation of standard Node.js APIs:
- **\`fs\` (File System)**: Implements synchronous and asynchronous methods (\`readFileSync\`, \`writeFileSync\`, \`existsSync\`, \`readdirSync\`, \`mkdirSync\`, \`statSync\`, \`unlinkSync\`).
- **\`path\`**: Full implementations of \`path.join\`, \`path.resolve\`, \`path.dirname\`, \`path.extname\`, \`path.basename\`.
- **\`crypto\`**: Implements \`crypto.randomUUID()\`, \`crypto.createHash('md5'|'sha256')\`, and random byte generation using browser WebCrypto API.
- **\`buffer\`**: Full Node \`Buffer\` polyfill for binary data manipulation, Base64 encoding, and UTF-8 conversion.

All virtual files inside your workspace folders are directly accessible to your scripts using standard \`fs\` calls:
\`\`\`js
const fs = require('fs');
const path = require('path');

const data = fs.readFileSync(path.join(__dirname, 'data/sample.json'), 'utf-8');
console.log("Read virtual file content:", JSON.parse(data));
\`\`\`

---

## 3. Dynamic JSDoc Parser & UI Control Generator

Before a script is executed, JS Workspace inspects the script AST and comment block:
1. **Zero-JSDoc Function Signature Detection**: Auto-detects parameter names and default values from function signatures like \`async function run({ targetUrl, maxDepth = 5, verbose = true })\`.
2. **JSDoc Tag Parsing**: Parses JSDoc \`@param\` tags to generate rich interactive UI controls (Range sliders, Color pickers, Select dropdowns, Toggle switches, JSON editors).

---

## 4. CORS Extension Service Worker Bridge

Browser security restricts cross-origin \`fetch()\` calls made from local web apps (\`localhost\` / \`https\`). JS Workspace solves this cleanly via an optional **Chrome Manifest V3 Extension**:
- The web app sends a message to the extension background service worker using \`chrome.runtime.sendMessage()\`.
- The background service worker executes the network fetch on behalf of the script with zero CORS restrictions.
- Response payload and headers are safely returned to the Web Worker execution sandbox.

---

## 5. PWA Offline Cache Engine

JS Workspace is registered as a **Progressive Web App (PWA)**:
- **App Shell Caching**: All static assets, fonts, icons, editor scripts, and Node polyfills are cached locally via Service Worker.
- **Package Pre-Caching**: Users can pre-cache NPM packages (\`lodash\`, \`axios\`, \`dayjs\`, \`papaparse\`, \`mathjs\`) into CacheStorage so \`require('package')\` works 100% offline without an internet connection.
`
  },

  'SCRIPT_SPECIFICATION.md': {
    id: 'SCRIPT_SPECIFICATION.md',
    title: 'Script Specification & Dynamic Parameters',
    category: 'Guides',
    content: `# Script Specification & Dynamic Parameter Options

JS Workspace scripts are standard JavaScript files (ES2022 / Node.js style). You can write simple top-level scripts or declare an exported \`run()\` function with dynamic input parameters.

---

## 1. Writing Your First Script

You can structure your script in two ways:

### Option A: Top-Level Execution
\`\`\`js
console.log("Hello from JS Workspace!");
const fs = require('fs');
console.log("Files in root:", fs.readdirSync('.'));
\`\`\`

### Option B: Exported \`run({ options })\` Function (Recommended)
By exporting an \`async function run(options)\`, JS Workspace automatically generates interactive UI input controls for your script!

\`\`\`js
/**
 * @name Data Processor
 * @description Processes input dataset with custom threshold
 */
async function run({ threshold = 50, enableLogs = true }) {
  console.log("Running with threshold:", threshold, "logs:", enableLogs);
}
\`\`\`

---

## 2. Dynamic UI Parameter Specifications

JS Workspace supports 7 rich interactive UI control types generated directly from JSDoc \`@param\` annotations:

### 1. Text Input (\`string\`)
\`\`\`js
/**
 * @param {string} targetUrl Target Endpoint URL - default: "https://api.github.com"
 */
async function run({ targetUrl }) { ... }
\`\`\`

### 2. Number Input (\`number\`)
\`\`\`js
/**
 * @param {number} maxItems Maximum Item Count - default: 25
 */
async function run({ maxItems }) { ... }
\`\`\`

### 3. Boolean Switch (\`boolean\`)
\`\`\`js
/**
 * @param {boolean} verbose Enable Verbose Logging - default: true
 */
async function run({ verbose }) { ... }
\`\`\`

### 4. Range Slider (\`range:min:max:step\`)
\`\`\`js
/**
 * @param {range:1:100:5} speed Processing Speed (1-100) - default: 50
 */
async function run({ speed }) { ... }
\`\`\`

### 5. Color Picker (\`color\`)
\`\`\`js
/**
 * @param {color} brandColor Brand Theme Color - default: "#3b82f6"
 */
async function run({ brandColor }) { ... }
\`\`\`

### 6. Dropdown Select (\`select:Opt1|Opt2|Opt3\`)
\`\`\`js
/**
 * @param {select:Fast|Balanced|Thorough} mode Execution Strategy - default: "Balanced"
 */
async function run({ mode }) { ... }
\`\`\`

### 7. Interactive JSON Editor (\`json\`)
\`\`\`js
/**
 * @param {json} customConfig Custom Configuration JSON
 */
async function run({ customConfig }) {
  console.log("Parsed JSON Config:", customConfig);
}
\`\`\`

---

## 3. Cross-Script Imports & Virtual Files

You can organize your code into multiple nested files and import them using standard Node.js \`require()\`:

\`\`\`js
// utils/math.js
function add(a, b) { return a + b; }
module.exports = { add };

// main.js
const { add } = require('./utils/math');
console.log("Result:", add(10, 20));
\`\`\`
`
  },

  'CORS_HELPER.md': {
    id: 'CORS_HELPER.md',
    title: 'CORS Helper Extension & Network Fetching',
    category: 'Extension',
    content: `# CORS Helper Extension & Cross-Origin Network Fetching

Browser security policies enforce **CORS (Cross-Origin Resource Sharing)** restrictions. When a script running in a web application attempts to fetch data from an external website or API that does not explicitly include \`Access-Control-Allow-Origin: *\` headers, the browser blocks the request.

---

## How JS Workspace Solves CORS

JS Workspace includes an optional **Chrome Manifest V3 Extension** that acts as an un-restricted background network proxy:

\`\`\`
┌────────────────────────┐      chrome.runtime.sendMessage      ┌────────────────────────┐
│  JS Workspace Sandbox  ├─────────────────────────────────────►│ CORS Helper Extension  │
│  (Web Worker Script)   │                                      │ (Background Service Worker)
│                        │◄─────────────────────────────────────┤                        │
└────────────────────────┘         Response Payload & Headers   └───────────┬────────────┘
                                                                            │
                                                                            │ unrestricted fetch()
                                                                            ▼
                                                                ┌────────────────────────┐
                                                                │ External Target API    │
                                                                │ (e.g. GitHub, REST)    │
                                                                └────────────────────────┘
\`\`\`

---

## Installing the CORS Helper Extension

### Step 1: Download Extension Package
1. Click the **CORS Helper Inactive** status badge in the top right header bar.
2. Click **Download Extension Package**.
3. Save \`js-workspace-cors-extension.zip\` to your computer and extract the zip file.

### Step 2: Load Unpacked in Chrome / Edge / Brave
1. Open your browser and navigate to \`chrome://extensions\` (or \`edge://extensions\`).
2. Toggle on **Developer Mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the unzipped \`js-workspace-cors-extension\` folder.

### Step 3: Verify Connection
Return to JS Workspace. The status indicator in the top right header will automatically switch to a green badge: **"CORS Helper Connected"**!

---

## Using Network Fetch in Scripts

With the extension connected, scripts can perform \`fetch()\` requests to any endpoint without CORS errors:

\`\`\`js
async function run({ targetUrl = "https://api.github.com/zen" }) {
  console.log("Fetching data from:", targetUrl);
  const response = await fetch(targetUrl);
  const text = await response.text();
  console.log("Response Received:", text);
}
\`\`\`
`
  },

  'NODE_ENVIRONMENT.md': {
    id: 'NODE_ENVIRONMENT.md',
    title: 'Node.js Polyfills, NPM & PWA Offline Engine',
    category: 'Node & PWA',
    content: `# Node.js Polyfills, Dynamic NPM Resolution & PWA Offline Engine

JS Workspace bridges browser execution with Node.js developer workflows by providing built-in polyfills for core Node modules, automatic CDN package resolution, and full offline PWA support.

---

## 1. Built-in Node.js Core Modules

The following Node.js standard library modules are built-in and available via \`require()\`:

| Module | Description | Supported API Capabilities |
| :--- | :--- | :--- |
| **\`fs\`** | Virtual File System | \`readFileSync\`, \`writeFileSync\`, \`readdirSync\`, \`existsSync\`, \`statSync\`, \`mkdirSync\` |
| **\`path\`** | Path Manipulation | \`path.join\`, \`path.resolve\`, \`path.dirname\`, \`path.basename\`, \`path.extname\` |
| **\`crypto\`** | Cryptography & Hashing | \`crypto.randomUUID()\`, \`crypto.createHash('sha256')\`, \`crypto.getRandomValues()\` |
| **\`buffer\`** | Binary Data Buffer | \`Buffer.from()\`, \`Buffer.alloc()\`, \`buffer.toString('base64')\` |
| **\`os\`** | Operating System Info | \`os.platform()\`, \`os.arch()\`, \`os.homedir()\`, \`os.tmpdir()\` |
| **\`util\`** | Utilities | \`util.promisify()\`, \`util.inspect()\` |
| **\`process\`** | Process State | \`process.env\`, \`process.cwd()\`, \`process.nextTick()\` |

---

## 2. Dynamic NPM Package Resolution

You can import external NPM packages inside your scripts without pre-installing them! JS Workspace resolves packages dynamically over HTTP via fast CDN mirrors (\`unpkg\` / \`esm.sh\`):

\`\`\`js
const _ = require('lodash');
const dayjs = require('dayjs');
const Papa = require('papaparse');

console.log("Lodash shuffle:", _.shuffle([1, 2, 3, 4, 5]));
console.log("Formatted Date:", dayjs().format('YYYY-MM-DD HH:mm:ss'));
\`\`\`

---

## 3. PWA Offline Package Pre-Caching

To ensure your scripts and NPM packages work 100% offline without internet:
1. Click the **PWA Ready (Online)** badge in the top right header.
2. Under **Quick Pre-Cache Common Packages**, click packages like \`lodash\`, \`axios\`, \`dayjs\`, or type any custom NPM package name (e.g. \`canvas-confetti\`).
3. The package bundles are saved into browser \`CacheStorage\`.
4. Now you can disconnect from Wi-Fi / Internet completely – \`require('package')\` will load instantly from local disk cache!
`
  }
};
