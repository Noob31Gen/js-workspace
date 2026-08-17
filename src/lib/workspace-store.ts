export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap limit

export type FileKind = 'code' | 'data-json' | 'data-csv' | 'data-text' | 'data-image' | 'binary';

export function getFileKind(filename: string): FileKind {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(ext)) return 'code';
  if (ext === 'json') return 'data-json';
  if (ext === 'csv') return 'data-csv';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return 'data-image';
  if (['txt', 'md', 'html', 'xml', 'log', 'yaml', 'yml', 'css'].includes(ext)) return 'data-text';
  return 'binary';
}

export interface WorkspaceNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // e.g. "utils/math.js" or "data/subdomains.csv"
  parentId: string | null;
  code?: string;
  binaryData?: string; // Base64 Data URL for images/binary files
  fileKind?: FileKind;
  sizeBytes?: number;
  category?: string;
  expanded?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  nodes: WorkspaceNode[];
  activeFileId: string;
}

const DEFAULT_WORKSPACE_ID = 'ws-demo-workspace';

export const INITIAL_DEMO_NODES: WorkspaceNode[] = [
  // 1. Root File: welcome.js (Blank-slate introduction and site navigation)
  {
    id: 'file-welcome',
    name: 'welcome.js',
    type: 'file',
    path: 'welcome.js',
    parentId: null,
    fileKind: 'code',
    category: 'Getting Started',
    code: `/**
 * @name Welcome to JS Workspace
 * @description Your browser-native JavaScript playground and Node.js execution sandbox.
 * 
 * Quick Site Navigation:
 * ----------------------------------------------------------------------
 * 1. File Explorer (Left Sidebar):
 *    - Browse, create, rename, or delete files and folders.
 *    - Upload local scripts or ZIP archives directly into your workspace.
 *    - Switch between multiple isolated workspaces.
 * 
 * 2. Code Editor (Center):
 *    - Write modern JavaScript, ES Modules, or Node.js code.
 *    - Import local workspace files with require() / import or dynamic NPM packages.
 * 
 * 3. Dynamic Parameter Form (Right Panel):
 *    - JSDoc @param annotations automatically generate interactive UI inputs!
 *    - Dropdowns, sliders, numbers, booleans, and text fields pass values to run().
 * 
 * 4. Run Script (Top Right):
 *    - Executes code inside an isolated Web Worker sandbox without freezing the UI.
 * 
 * 5. Console & Results (Bottom Panel):
 *    - View streaming logs, warnings, errors, and console.table() outputs.
 *    - Switch to "Frame Preview" tab for rendered visual HTML or graphical output.
 * 
 * 6. Docs & Header Utilities (Top Bar):
 *    - Click "Docs" for architecture guides, script specifications, and navigation tips.
 *    - Click "CORS Helper" to connect the companion extension for unrestricted API requests.
 *    - Click "PWA Ready" to pre-cache offline NPM packages.
 * 
 * Next Step:
 * Open "main.js" from the File Explorer on the left to see a full demo of multi-file
 * imports, virtual filesystem operations, and dynamic UI parameters in action!
 * 
 * @param {string} yourName Your Name - default: "Developer"
 * @param {boolean} showTips Show Quick Tips - default: true
 */
async function run({ yourName = "Developer", showTips = true }) {
  console.log(\`Welcome to JS Workspace, \${yourName}!\`);
  console.log("Running inside an isolated browser-native Web Worker sandbox.");

  if (showTips) {
    console.log("\\nQuick Tips:");
    console.log("1. Edit this file or create a new script in the left sidebar.");
    console.log("2. Open 'main.js' to see a complete multi-file capabilities demo.");
    console.log("3. Click the 'Docs' button in the top bar for detailed guides.");
  }

  return {
    status: "ready",
    user: yourName,
    message: \`Hello \${yourName}! Ready to build in JS Workspace.\`,
    timestamp: new Date().toISOString()
  };
}
`
  },

  // 2. Root File: main.js (Core capabilities demo)
  {
    id: 'file-main',
    name: 'main.js',
    type: 'file',
    path: 'main.js',
    parentId: null,
    fileKind: 'code',
    category: 'Core Demo',
    code: `/**
 * @name Core Capabilities Showcase
 * @description Demonstrates multi-file imports, virtual filesystem (fs/path), Node.js crypto, dynamic UI parameters, and visual preview frames.
 * 
 * @param {string} reportTitle Report Title - default: "System Operations Audit"
 * @param {select:Production|Staging|Development} environment Target Environment - default: "Production"
 * @param {range:1:7:1} itemLimit Maximum Records to Process - default: 5
 * @param {boolean} saveReportToFs Save Summary Report to Virtual FS - default: true
 */
async function run({
  reportTitle = "System Operations Audit",
  environment = "Production",
  itemLimit = 5,
  saveReportToFs = true
}) {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const { calculateMetrics, formatCurrency, generateSummaryCard } = require('./utils/helpers');

  console.log(\`Starting \${reportTitle} [\${environment}]\`);
  console.log(\`Run ID: \${crypto.randomUUID()}\`);
  console.log("--------------------------------------------------");

  // 1. Read dataset from virtual filesystem
  const dataPath = path.join(__dirname, 'data/sample-data.json');
  console.log(\`Reading virtual filesystem dataset from: "\${dataPath}"...\`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(\`Data file not found at \${dataPath}\`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const allServices = JSON.parse(rawData);

  // 2. Filter & process records using helper module
  const selectedServices = allServices.slice(0, itemLimit);
  const metrics = calculateMetrics(selectedServices);

  console.log(\`Processed \${selectedServices.length} active service records.\`);
  console.log(\`Average Uptime: \${metrics.avgUptime}% | Total Budget: \${formatCurrency(metrics.totalBudget)}\`);
  
  // 3. Display structured table in Console
  console.table(
    selectedServices.map(s => ({
      ID: s.id,
      Service: s.name,
      Status: s.status,
      Uptime: \`\${s.uptime}%\`,
      Budget: formatCurrency(s.budget),
      Region: s.region
    }))
  );

  // 4. Optionally write output file into workspace virtual FS
  const reportFilename = 'audit-report.txt';
  if (saveReportToFs) {
    const reportContent = [
      \`=== \${reportTitle.toUpperCase()} ===\`,
      \`Environment: \${environment}\`,
      \`Generated At: \${new Date().toISOString()}\`,
      \`Total Services Audited: \${selectedServices.length}\`,
      \`Average Uptime: \${metrics.avgUptime}%\`,
      \`Total Budget: \${formatCurrency(metrics.totalBudget)}\`,
      \`Healthy Services: \${metrics.healthyCount}/\${selectedServices.length}\`,
      '',
      'Service Details:',
      ...selectedServices.map(s => \` - [\${s.status.toUpperCase()}] \${s.name} (\${s.region}): \${s.uptime}% uptime, \${formatCurrency(s.budget)}\`)
    ].join('\\n');

    fs.writeFileSync(reportFilename, reportContent);
    console.log(\`Generated output file "\${reportFilename}" in workspace virtual filesystem!\`);
  }

  // 5. Generate visual HTML preview frame
  const htmlFrame = generateSummaryCard(reportTitle, environment, metrics, selectedServices);

  return {
    reportTitle,
    environment,
    auditSummary: metrics,
    servicesCount: selectedServices.length,
    outputFileCreated: saveReportToFs ? reportFilename : null,
    // Frame Preview tab payload:
    __html: htmlFrame,
    __title: \`\${reportTitle} Preview\`
  };
}
`
  },

  // 3. Folder: utils
  {
    id: 'folder-utils',
    name: 'utils',
    type: 'folder',
    path: 'utils',
    parentId: null,
    expanded: true
  },
  // utils/helpers.js
  {
    id: 'file-utils-helpers',
    name: 'helpers.js',
    type: 'file',
    path: 'utils/helpers.js',
    parentId: 'folder-utils',
    fileKind: 'code',
    category: 'Utilities',
    code: `/**
 * Helper utilities module for calculation, formatting, and HTML rendering.
 */

function calculateMetrics(services) {
  if (!services || services.length === 0) {
    return { avgUptime: "0.00", totalBudget: 0, healthyCount: 0 };
  }

  const totalUptime = services.reduce((acc, s) => acc + (s.uptime || 0), 0);
  const totalBudget = services.reduce((acc, s) => acc + (s.budget || 0), 0);
  const healthyCount = services.filter(s => s.status === 'Operational' || s.status === 'Healthy').length;

  return {
    avgUptime: (totalUptime / services.length).toFixed(2),
    totalBudget,
    healthyCount
  };
}

function formatCurrency(amount) {
  return \`$\${Number(amount || 0).toLocaleString('en-US')}\`;
}

function generateSummaryCard(title, env, metrics, services) {
  const isProd = env === 'Production';
  const badgeBg = isProd ? '#065f46' : '#1e3a8a';
  const badgeColor = isProd ? '#34d399' : '#60a5fa';

  const rows = services.map(s => \`
    <tr style="border-bottom: 1px solid #27272a;">
      <td style="padding: 10px 12px; font-weight: 600; color: #f4f4f5; white-space: nowrap;">\${s.name}</td>
      <td style="padding: 10px 12px; color: #a1a1aa; white-space: nowrap;">\${s.region}</td>
      <td style="padding: 10px 12px; white-space: nowrap;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: \${s.status === 'Operational' ? '#064e3b' : '#78350f'}; color: \${s.status === 'Operational' ? '#6ee7b7' : '#fcd34d'};">
          \${s.status}
        </span>
      </td>
      <td style="padding: 10px 12px; text-align: right; color: #38bdf8; font-family: monospace; white-space: nowrap;">\${s.uptime}%</td>
      <td style="padding: 10px 12px; text-align: right; color: #a1a1aa; font-family: monospace; white-space: nowrap;">\${formatCurrency(s.budget)}</td>
    </tr>
  \`).join('');

  return \`
    <div style="font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; padding: clamp(12px, 4vw, 20px); border-radius: 16px; border: 1px solid #27272a; max-width: 720px; width: 100%; box-sizing: border-box; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #27272a; padding-bottom: 14px;">
        <div style="min-width: 0;">
          <h2 style="margin: 0; font-size: clamp(16px, 4vw, 20px); font-weight: 700; color: #f4f4f5; word-break: break-word;">\${title}</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #a1a1aa;">Generated live via JS Workspace Frame Preview</p>
        </div>
        <span style="background: \${badgeBg}; color: \${badgeColor}; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; shrink-0;">
          \${env}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 18px;">
        <div style="background: #18181b; padding: 12px 14px; border-radius: 12px; border: 1px solid #27272a;">
          <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Avg Uptime</div>
          <div style="font-size: 20px; font-weight: 700; color: #10b981; margin-top: 3px;">\${metrics.avgUptime}%</div>
        </div>
        <div style="background: #18181b; padding: 12px 14px; border-radius: 12px; border: 1px solid #27272a;">
          <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Total Budget</div>
          <div style="font-size: 20px; font-weight: 700; color: #3b82f6; margin-top: 3px;">\${formatCurrency(metrics.totalBudget)}</div>
        </div>
        <div style="background: #18181b; padding: 12px 14px; border-radius: 12px; border: 1px solid #27272a;">
          <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Healthy Services</div>
          <div style="font-size: 20px; font-weight: 700; color: #f59e0b; margin-top: 3px;">\${metrics.healthyCount} / \${services.length}</div>
        </div>
      </div>

      <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 10px; border: 1px solid #27272a; background: #121214;">
        <table style="width: 100%; min-width: 480px; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #27272a; background: #18181b; color: #a1a1aa; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
              <th style="padding: 8px 12px;">Service</th>
              <th style="padding: 8px 12px;">Region</th>
              <th style="padding: 8px 12px;">Status</th>
              <th style="padding: 8px 12px; text-align: right;">Uptime</th>
              <th style="padding: 8px 12px; text-align: right;">Budget</th>
            </tr>
          </thead>
          <tbody>
            \${rows}
          </tbody>
        </table>
      </div>
    </div>
  \`;
}

module.exports = {
  calculateMetrics,
  formatCurrency,
  generateSummaryCard
};
`
  },

  // 4. Folder: data
  {
    id: 'folder-data',
    name: 'data',
    type: 'folder',
    path: 'data',
    parentId: null,
    expanded: true
  },
  // data/sample-data.json
  {
    id: 'file-data-sample-json',
    name: 'sample-data.json',
    type: 'file',
    path: 'data/sample-data.json',
    parentId: 'folder-data',
    fileKind: 'data-json',
    sizeBytes: 680,
    category: 'Data',
    code: `[
  { "id": "srv-01", "name": "API Gateway", "status": "Operational", "uptime": 99.98, "budget": 12500, "region": "us-east-1" },
  { "id": "srv-02", "name": "Auth Service", "status": "Operational", "uptime": 99.95, "budget": 8400, "region": "us-east-1" },
  { "id": "srv-03", "name": "PostgreSQL Cluster", "status": "Operational", "uptime": 99.99, "budget": 24000, "region": "us-east-2" },
  { "id": "srv-04", "name": "Redis Cache Tier", "status": "Operational", "uptime": 99.91, "budget": 6200, "region": "us-east-1" },
  { "id": "srv-05", "name": "Search & Vector Index", "status": "Degraded", "uptime": 98.45, "budget": 15000, "region": "eu-central-1" },
  { "id": "srv-06", "name": "Worker Queue", "status": "Operational", "uptime": 99.82, "budget": 9800, "region": "us-west-2" },
  { "id": "srv-07", "name": "CDN Distribution", "status": "Operational", "uptime": 99.99, "budget": 18500, "region": "global" }
]`
  }
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Demo Workspace',
    description: 'A clean sample workspace demonstrating script execution, dynamic JSDoc UI parameters, modular imports, and Node.js virtual filesystem.',
    nodes: INITIAL_DEMO_NODES,
    activeFileId: 'file-welcome'
  }
];

const STORAGE_KEY = 'js_workspace_v12_clean';
const ACTIVE_STATE_KEY = 'js_workspace_active_state_v4';

const DB_NAME = 'JSWorkspaceDB_v3';
const DB_STORE = 'workspaces';
const DB_KEY = 'all_workspaces';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadWorkspacesAsync(): Promise<Workspace[]> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const getReq = store.get(DB_KEY);
    const result = await new Promise<Workspace[] | undefined>((resolve, reject) => {
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });
    if (
      Array.isArray(result) &&
      result.length > 0 &&
      result.every(w => w && w.id && w.name && Array.isArray(w.nodes))
    ) {
      return result;
    }
  } catch (e) {
    console.warn('IndexedDB load fallback to localStorage:', e);
  }
  return WorkspaceStore.loadWorkspaces();
}

export async function saveWorkspacesAsync(workspaces: Workspace[]): Promise<void> {
  WorkspaceStore.saveWorkspaces(workspaces);
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put(workspaces, DB_KEY);
  } catch (e) {
    console.warn('IndexedDB save failed:', e);
  }
}

export interface ActiveWorkspaceState {
  activeWorkspaceId?: string;
  activeFileId?: string;
}

export class WorkspaceStore {
  public static loadWorkspaces(): Workspace[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(w => w && w.id && w.name && Array.isArray(w.nodes))
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load workspaces from localStorage:', e);
    }
    return INITIAL_WORKSPACES;
  }

  public static saveWorkspaces(workspaces: Workspace[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (e) {
      console.warn('Failed to save workspaces to localStorage (may exceed 5MB quota):', e);
    }
  }

  public static loadActiveState(): ActiveWorkspaceState {
    try {
      const stored = localStorage.getItem(ACTIVE_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load active state from localStorage:', e);
    }
    return {};
  }

  public static saveActiveState(activeWorkspaceId: string, activeFileId: string) {
    try {
      localStorage.setItem(ACTIVE_STATE_KEY, JSON.stringify({ activeWorkspaceId, activeFileId }));
    } catch (e) {
      console.warn('Failed to save active state to localStorage:', e);
    }
  }
}

/**
 * Duplicates a file or folder node (recursively copying all child nodes for folders).
 */
export function duplicateNodeInWorkspace(nodes: WorkspaceNode[], nodeId: string): WorkspaceNode[] {
  const target = nodes.find(n => n.id === nodeId);
  if (!target) return nodes;

  const idMap = new Map<string, string>(); // oldId -> newId

  const duplicateSingleNode = (node: WorkspaceNode, parentIdOverride?: string | null): WorkspaceNode => {
    const newId = `node-copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    idMap.set(node.id, newId);

    const isTopLevelCopy = node.id === nodeId;
    const newName = isTopLevelCopy ? `${node.name.replace(/(\.[^.]+)?$/, ' (Copy)$1')}` : node.name;
    const effectiveParentId = parentIdOverride !== undefined ? parentIdOverride : node.parentId;

    return {
      ...node,
      id: newId,
      name: newName,
      parentId: effectiveParentId
    };
  };

  if (target.type === 'file') {
    const copy = duplicateSingleNode(target);
    return [...nodes, copy];
  }

  // Folder recursion
  const nodesToCopy: WorkspaceNode[] = [];
  const getSubtree = (parentId: string) => {
    const children = nodes.filter(n => n.parentId === parentId);
    for (const child of children) {
      nodesToCopy.push(child);
      if (child.type === 'folder') getSubtree(child.id);
    }
  };

  getSubtree(target.id);

  const duplicatedTarget = duplicateSingleNode(target);
  const copies: WorkspaceNode[] = [duplicatedTarget];

  for (const node of nodesToCopy) {
    const newParentId = idMap.get(node.parentId || '') || duplicatedTarget.id;
    copies.push(duplicateSingleNode(node, newParentId));
  }

  return [...nodes, ...copies];
}

/**
 * Moves a file or folder node to a new parent folder.
 */
export function moveNodeInWorkspace(nodes: WorkspaceNode[], nodeId: string, targetParentId: string | null): WorkspaceNode[] {
  return nodes.map(node => {
    if (node.id !== nodeId) return node;
    return {
      ...node,
      parentId: targetParentId
    };
  });
}
