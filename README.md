# JS Workspace - Browser Script Execution Platform

> A local-first, highly responsive web application template for running custom JavaScript scripts directly inside the browser. Styled using **Noob31's MultiTools** design language (React 19 + Vite + Tailwind CSS v4 + Lucide icons + Geist variable typography).

---

## 🌟 Key Features

1. **Web Worker Isolated Execution**: Runs scripts off the main UI thread with full `postMessage` log streaming and hard timeout controls (`worker.terminate()`).
2. **Automatic Parameter & Option Detection**: Parses JSDoc comments (`@param {type} name - label`) or explicit exported `config` schemas to automatically build interactive form controls (text, number, boolean, select dropdowns).
3. **CORS-Bypass Extension Bridge**: Includes a Chrome V3 Extension Helper kit that allows local scripts to fetch external web content without facing CORS errors.
4. **Rich Console Interceptor**: Intercepts `console.log`, `console.warn`, `console.error`, and `console.table` with formatted JSON trees, timing, and copy buttons.
5. **Local Storage Persistence**: Persists scripts, execution logs, and argument configurations locally using browser storage APIs (`localStorage` / `IndexedDB`).

---

## 📁 Directory Structure

```
js-workspace/
├── docs/                        # Complete technical specifications & architectural docs
│   ├── ARCHITECTURE.md          # Web Worker sandbox architecture & lifecycle docs
│   ├── SCRIPT_SPECIFICATION.md  # How to write scripts, JSDoc schemas, and options
│   ├── EXTENSION_INTEGRATION.md # How the CORS-bypass extension helper operates
│   └── DEVELOPER_GUIDE.md      # How to extend, build, and deploy this project
│
├── extension/                   # Chrome Manifest V3 CORS Helper Extension Kit
│   ├── manifest.json            # Extension manifest with externally_connectable & host_permissions
│   ├── background.js            # Background worker that proxies fetches without CORS
│   └── README.md                # Chrome/Edge developer mode installation guide
│
├── sample-scripts/              # Ready-to-use sample scripts
│   ├── url-link-harvester.js     # Fetches a webpage and extracts all hyperlinks
│   ├── api-data-processor.js    # Queries JSON APIs with dynamic input options
│   └── text-analyzer.js         # Analyzes text stats, word counts, and sentiment keywords
│
└── src/                         # Source codebase (React 19 + Vite + Tailwind v4)
    ├── components/              # Layout, ScriptEditor, DynamicOptionForm, ConsoleViewer
    ├── lib/                     # Parameter parser, Worker runner, Extension client
    ├── index.css                # Tailwind v4 design system tokens
    ├── App.tsx                  # Workspace main layout & router
    └── main.tsx                 # React app root
```

---

## 🚀 Quickstart

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Install the optional CORS extension helper**:
   - Go to `chrome://extensions` in Chrome or Edge.
   - Enable **Developer mode** (top-right toggle).
   - Click **Load unpacked** and select the `js-workspace/extension` directory.

---

## 📄 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Script Specification & Parameters](docs/SCRIPT_SPECIFICATION.md)
- [Extension Integration Guide](docs/EXTENSION_INTEGRATION.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
