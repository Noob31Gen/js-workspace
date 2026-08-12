import React from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen } from 'lucide-react';

interface DocViewerModalProps {
  docName: string | null;
  onClose: () => void;
}

const DOC_CONTENTS: Record<string, string> = {
  'ARCHITECTURE.md': `
# System Architecture & Execution Sandbox

The JS Workspace platform runs user-written JavaScript scripts off-main-thread inside Web Workers for safe, responsive execution.

## Key Subsystems
1. **Web Worker Sandbox**: Prevents UI freeze; handles postMessage console streaming and timeout aborts.
2. **Dynamic JSDoc Parser**: Converts @param annotations into interactive HTML forms.
3. **CORS Extension Helper**: Delegates cross-origin fetches to a Chrome V3 extension background script.
  `,
  'SCRIPT_SPECIFICATION.md': `
# Script Specification & Option Detection

Use JSDoc comments at top of script to define options:

\`\`\`javascript
/**
 * @name My Script
 * @param {string} targetUrl Web Page - default: "https://example.com"
 * @param {number} maxItems Limit - default: 10
 * @param {boolean} debug Debug Mode - default: true
 */
async function run({ targetUrl, maxItems, debug }) {
  console.log("Running with options:", targetUrl, maxItems, debug);
}
\`\`\`
  `,
  'EXTENSION_INTEGRATION.md': `
# Extension Integration Guide

To bypass CORS restrictions when fetching links:
1. Open \`chrome://extensions\` in Chrome or Edge.
2. Enable Developer Mode.
3. Click "Load unpacked" and select the \`extension/\` folder in this workspace.
4. Refresh this app to see the green "CORS Helper Connected" badge!
  `
};

export const DocViewerModal: React.FC<DocViewerModalProps> = ({ docName, onClose }) => {
  if (!docName) return null;

  const content = DOC_CONTENTS[docName] || `Documentation for ${docName} available in docs/${docName}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col my-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <BookOpen className="h-5 w-5" />
            <span>docs/{docName}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-xs text-foreground bg-zinc-950 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap leading-relaxed select-all">
          {content}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
