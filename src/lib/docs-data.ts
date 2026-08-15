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
    content: `# System Architecture and Execution Sandbox

JS Workspace is a browser-native JavaScript execution platform, IDE, and virtual Node.js runtime environment built to execute scripts, manipulate local data files, and perform cross-origin network requests directly inside your browser.

---

## Core Subsystems Architecture

+------------------------------------------------------------------------+
|                        MAIN THREAD / REACT UI                          |
|                                                                        |
|   +--------------------+   +-------------------+  +----------------+   |
|   | Workspace Manager  |   | Dynamic JSDoc     |  | CORS Helper    |   |
|   | IndexedDB Engine   |   | Form Generator    |  | Status Monitor |   |
|   +---------+----------+   +---------+---------+  +-------+--------+   |
+-------------|------------------------|--------------------|------------+
              | postMessage()          | options            | postMessage
              v                        v                    v
+------------------------------------------------------------------------+
|                        ISOLATED WEB WORKER                             |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   | Node.js Polyfills (fs, path, crypto, buffer, os, util, process)|   |
|   +----------------------------------------------------------------+   |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   | Script Execution Context (Async run() IIFE Sandbox)            |   |
|   +----------------------------------------------------------------+   |
+------------------------------------------------------------------------+

---

## 1. Isolated Web Worker Sandbox

User scripts run completely off the main UI thread inside a dedicated Web Worker environment. This architecture ensures:
- UI Responsiveness: High-volume data processing and computational loops will never lock or freeze the browser editor or interface.
- Execution Timeout and Abort: The main thread controls execution duration. If a script exceeds the configurable timeout (default 30 seconds), the worker process is immediately terminated.
- Real-Time Console Interception: System output, warnings, errors, and tables (console.log, console.warn, console.error, console.table) inside the worker are intercepted and streamed directly to the UI Console panel.

---

## 2. In-Memory Virtual Filesystem and Node.js Polyfills

JS Workspace provides a browser-native implementation of standard Node.js APIs:
- fs (File System): Implements synchronous methods (readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, unlinkSync).
- path: Complete implementations of path.join, path.resolve, path.dirname, path.basename, and path.extname.
- crypto: Implements crypto.randomUUID(), crypto.createHash('sha256'), and random byte generation via browser Web Crypto API.
- buffer: Full Node.js Buffer polyfill supporting binary manipulation, Base64, and UTF-8 encoding.
- process and os: Provides environment variables, current working directory tracking, and operating system polyfills.

Scripts access workspace files using standard Node.js fs calls:

const fs = require('fs');
const path = require('path');

const data = fs.readFileSync(path.join(__dirname, 'data/sample.json'), 'utf-8');
console.log("Read virtual file content:", JSON.parse(data));

---

## 3. Persistent Workspace Engine (IndexedDB)

Workspaces and virtual files are saved to browser IndexedDB storage (JSWorkspaceDB_v1).
- Automatic Auto-Save: All file edits and directory structures persist across browser reloads.
- Workspace Switching: Users can create, rename, switch between, or export multiple isolated workspaces.
- Export and Import Options: Supports importing local folders, ZIP archives, JSON workspace bundles, and exporting individual workspaces.

---

## 4. SHA-256 Hashed CORS Extension Bridge

To bypass browser Cross-Origin Resource Sharing (CORS) limits, JS Workspace communicates with an optional Manifest V3 browser extension:
- Domain Isolation: Restricts communication exclusively to https://js.noob31.com.
- Domain-Salted SHA-256 Hashing: Passwords are hashed locally using browser Web Crypto API with domain salting (js.noob31.com:salt:v1:) to prevent dictionary and rainbow table attacks.
- Per-Request Verification: The background service worker validates authentication hashes per request before proxying network fetches.

---

## 5. PWA Offline Package Cache Engine

Registered as a Progressive Web App (PWA), JS Workspace caches app shell assets, editor scripts, and Node polyfills in browser CacheStorage.
- Offline NPM Pre-Caching: Allows pre-downloading NPM packages (lodash, axios, dayjs, papaparse, mathjs, cheerio, or custom packages) so require('package') works without internet.
`
  },

  'SCRIPT_SPECIFICATION.md': {
    id: 'SCRIPT_SPECIFICATION.md',
    title: 'Script Specification & Dynamic Parameters',
    category: 'Guides',
    content: `# Script Specification and Dynamic Parameter Options

JS Workspace scripts are standard JavaScript files (ES2022 / Node.js style). You can write simple top-level code or export an async run() function with dynamic parameter options.

---

## 1. Structuring Scripts

### Option A: Top-Level Execution
Top-level code executes sequentially when you click Run Script:

const fs = require('fs');
console.log("Files in workspace root:", fs.readdirSync('.'));

### Option B: Exported run({ options }) Function (Recommended)
Exporting an async function run(options) enables JS Workspace to automatically generate interactive UI parameter controls:

/**
 * @name Data Processor
 * @description Processes input dataset with custom threshold
 */
async function run({ threshold = 50, enableLogs = true }) {
  console.log("Running with threshold:", threshold, "logs:", enableLogs);
}

---

## 2. Dynamic UI Parameter Controls

JS Workspace automatically generates interactive UI input controls from JSDoc @param tags:

### 1. Text Input (string)
/**
 * @param {string} targetUrl Target Endpoint URL - default: "https://api.github.com"
 */
async function run({ targetUrl }) { ... }

### 2. Number Input (number)
/**
 * @param {number} maxItems Maximum Item Count - default: 25
 */
async function run({ maxItems }) { ... }

### 3. Boolean Switch (boolean)
/**
 * @param {boolean} verbose Enable Verbose Logging - default: true
 */
async function run({ verbose }) { ... }

### 4. Range Slider (range:min:max:step)
/**
 * @param {range:1:100:5} speed Processing Speed (1-100) - default: 50
 */
async function run({ speed }) { ... }

### 5. Color Picker (color)
/**
 * @param {color} brandColor Brand Theme Color - default: "#3b82f6"
 */
async function run({ brandColor }) { ... }

### 6. Dropdown Select (select:Opt1|Opt2|Opt3)
/**
 * @param {select:Fast|Balanced|Thorough} mode Execution Strategy - default: "Balanced"
 */
async function run({ mode }) { ... }

### 7. Interactive JSON Editor (json)
/**
 * @param {json} customConfig Custom Configuration JSON
 */
async function run({ customConfig }) {
  console.log("Parsed JSON Config:", customConfig);
}

---

## 3. Module Imports and Cross-File Referencing

Scripts can require relative local files and NPM packages:

// utils/calculator.js
function sum(a, b) { return a + b; }
module.exports = { sum };

// main.js
const { sum } = require('./utils/calculator');
console.log("Sum result:", sum(15, 25));
`
  },

  'CORS_HELPER.md': {
    id: 'CORS_HELPER.md',
    title: 'CORS Helper Extension & Network Fetching',
    category: 'Extension',
    content: `# CORS Helper Extension and Network Fetching Guide

Browser security policies enforce Cross-Origin Resource Sharing (CORS) restrictions. When browser scripts attempt to fetch data from external APIs that do not include Access-Control-Allow-Origin: * headers, the browser blocks the request.

---

## CORS Architecture Overview

+------------------------+      window.postMessage()      +------------------------+
|  JS Workspace Sandbox  |------------------------------->| CORS Helper Extension  |
|  (Web Worker Script)   |                                | (Background Worker)    |
|                        |<-------------------------------+                        |
+------------------------+         Response Payload       +-----------+------------+
                                                                      |
                                                                      | unrestricted fetch()
                                                                      v
                                                          +------------------------+
                                                          | External Target API    |
                                                          +------------------------+

---

## Installing the Extension

1. Click CORS Helper Inactive in the top right header bar.
2. Click Download Extension Package.
3. Extract the downloaded js-workspace-cors-extension.zip package.
4. Navigate to chrome://extensions in Chrome, Edge, or Brave.
5. Enable Developer mode in the top right corner.
6. Click Load unpacked and select the extracted extension directory.

---

## SHA-256 Hashed Password Security

To secure communications between the web app and the extension:
1. Click the CORS Helper extension icon in Chrome's toolbar to open the options popup.
2. Type your secret security password and click Save and Hash Password.
3. Open JS Workspace, click CORS Helper Connected in the header, enter the same password, and click Save Hash.
4. The system computes a domain-salted SHA-256 hash (js.noob31.com:salt:v1:) using Web Crypto API and authenticates all requests.

---

## Performing Network Requests

With the extension active and authenticated, scripts perform standard fetch() calls without CORS restrictions:

async function run({ targetUrl = "https://api.github.com/zen" }) {
  console.log("Fetching endpoint:", targetUrl);
  const response = await fetch(targetUrl);
  const text = await response.text();
  console.log("Response text:", text);
}
`
  },

  'NODE_ENVIRONMENT.md': {
    id: 'NODE_ENVIRONMENT.md',
    title: 'Node.js Polyfills, NPM & PWA Offline Engine',
    category: 'Node & PWA',
    content: `# Node.js Polyfills, NPM Resolution, and PWA Offline Engine

JS Workspace integrates browser execution with Node.js developer workflows through core library polyfills, dynamic CDN package resolution, and PWA offline caching.

---

## 1. Built-in Node.js Standard Library Modules

The following Node.js core modules are built-in and available via require():

| Module | Description | Key Supported Methods |
| :--- | :--- | :--- |
| fs | Virtual File System | readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, unlinkSync |
| path | Path Operations | path.join, path.resolve, path.dirname, path.basename, path.extname |
| crypto | Cryptography | crypto.randomUUID(), crypto.createHash('sha256'), Web Crypto API |
| buffer | Binary Buffers | Buffer.from(), Buffer.alloc(), buffer.toString('base64') |
| os | System Polyfill | os.platform(), os.arch(), os.homedir(), os.tmpdir() |
| util | Utilities | util.promisify(), util.inspect() |
| process | Process Polyfill | process.env, process.cwd(), process.nextTick() |

---

## 2. Dynamic NPM Package Resolution

Scripts can require external NPM packages without pre-installing them. Packages resolve dynamically over HTTP via fast CDN mirrors (unpkg / esm.sh):

const _ = require('lodash');
const dayjs = require('dayjs');
const Papa = require('papaparse');

console.log("Lodash shuffle:", _.shuffle([1, 2, 3, 4, 5]));
console.log("Formatted Date:", dayjs().format('YYYY-MM-DD HH:mm:ss'));

---

## 3. PWA Offline Package Pre-Caching

To ensure scripts and NPM packages run 100% offline without internet:
1. Click the PWA Ready (Online) button in the header.
2. Under Quick Pre-Cache Common Packages, select packages like lodash, axios, dayjs, or papaparse.
3. Or enter custom NPM package names (e.g. canvas-confetti, cowsay) in the custom input.
4. Package bundles are saved into local CacheStorage. You can now disconnect from Wi-Fi and run scripts offline.
`
  },

  'CREDITS.md': {
    id: 'CREDITS.md',
    title: 'Credits',
    category: 'About',
    content: `# Credits

### [almostnode](https://github.com/macaly/almostnode)
Browser-native Node.js runtime and compatibility layer by [Macaly](https://almostnode.dev) (MIT License).

#### Components Used:
- **Node.js Core Shims**: In-browser implementations for \`fs\`, \`path\`, \`stream\`, \`buffer\`, \`events\`, \`crypto\`, \`net\`, \`http\`, \`child_process\`, \`zlib\`, \`os\`, and system utilities.
- **Virtual File System**: In-memory POSIX-compatible filesystem layer with sync/async I/O.
- **Package Management**: In-browser npm package resolver and tarball extraction.
`
  }
};
