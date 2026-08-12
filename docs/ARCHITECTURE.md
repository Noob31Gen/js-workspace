# System Architecture & Execution Sandbox

This document outlines the architectural design of the **JS Workspace** platform, detailing how user-written JavaScript scripts are isolated, parameter-parsed, executed, and bridged with browser APIs and optional extension helpers.

---

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 Main UI Thread                                    |
|                                                                                   |
|  +---------------------------+             +-----------------------------------+  |
|  |     Script Code Editor    |             |    Parameter & Option Detector    |  |
|  |    (Monaco / CodeMirror)  |             |  (Regex JSDoc & AST Inspection)   |  |
|  +-------------+-------------+             +-----------------+-----------------+  |
|                |                                             |                    |
|                +--------------------+  +---------------------+                    |
|                                     |  |                                          |
|                                     v  v                                          |
|                       +------------------------------+                            |
|                       |   Auto-Generated Options UI  |                            |
|                       +--------------+---------------+                            |
|                                      |                                            |
|                                      | User clicks "Run Script"                   |
|                                      v                                            |
|                       +------------------------------+                            |
|                       |    Web Worker Controller     |                            |
|                       +--------------+---------------+                            |
|                                      |                                            |
+--------------------------------------|--------------------------------------------+
                                       | postMessage({ code, args })
                                       v
+-----------------------------------------------------------------------------------+
|                              Web Worker Sandbox                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  Blob Worker Context (self)                                                 |  |
|  |                                                                             |  |
|  |  1. Intercept console log/warn/error -> postMessage({ type: 'log' })          |  |
|  |  2. Expose fetchExtension() helper for CORS-bypass requests                 |  |
|  |  3. Execute async run(args) inside try-catch block                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Execution Sandbox (Web Worker Isolation)

### Why Web Workers?
Running arbitrary user scripts directly on the browser's main window thread risks freezing the UI if a script enters an unhandled `while(true)` loop or performs heavy synchronous processing. 

### Worker Lifecycle
1. **Blob Initialization**: The main application converts the script string into a Data Blob URL (`URL.createObjectURL(blob)`).
2. **Global Wrappers**: The worker code automatically injects custom wrappers around `console.log`, `console.warn`, `console.error`, and `console.table`.
3. **Execution**: The worker calls the script's `run(args)` entry point with the user-configured parameters.
4. **Hard Timeout Protection**: If a script exceeds the configured execution timeout (default: 30 seconds), the main thread invokes `worker.terminate()`, cleaning up memory and instantly restoring control.

---

## 3. Console Interception & Output Streaming

Logs produced inside the worker are captured by monkey-patching worker console methods:

```javascript
const originalLog = console.log;
console.log = (...args) => {
  postMessage({
    type: 'LOG',
    level: 'info',
    timestamp: Date.now(),
    data: args.map(arg => typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg)
  });
  originalLog.apply(console, args);
};
```

The main thread UI receives these messages via `worker.onmessage` and streams them into an interactive console drawer featuring log level filtering, timestamps, JSON tree views, and one-click JSON exporting.

---

## 4. Extension Bridge Layer

For scripts requiring data from external sites blocked by standard browser CORS policies:
- The main thread checks for the presence of the CORS extension helper via `chrome.runtime.sendMessage`.
- If detected, the worker delegates fetch requests through `postMessage` to the main thread.
- The main thread forwards the request to the extension background worker, receives the response, and sends it back to the worker execution context seamlessly.
