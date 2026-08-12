export interface WorkspaceNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // e.g. "utils/math.js" or "utils"
  parentId: string | null;
  code?: string;
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

const DEFAULT_WORKSPACE_ID = 'ws-default-demo';

export const INITIAL_DEMO_NODES: WorkspaceNode[] = [
  // Root level folder: utils
  {
    id: 'folder-utils',
    name: 'utils',
    type: 'folder',
    path: 'utils',
    parentId: null,
    expanded: true
  },
  // utils/math.js
  {
    id: 'file-utils-math',
    name: 'math.js',
    type: 'file',
    path: 'utils/math.js',
    parentId: 'folder-utils',
    category: 'Utilities',
    code: `/**
 * @name Math Utilities Module
 * @description Provides helper statistical calculation functions exported for other scripts.
 */

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function average(arr) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

export function square(n) {
  return n * n;
}

export function max(arr) {
  return Math.max(...arr);
}
`
  },
  // utils/formatters.js
  {
    id: 'file-utils-formatters',
    name: 'formatters.js',
    type: 'file',
    path: 'utils/formatters.js',
    parentId: 'folder-utils',
    category: 'Utilities',
    code: `/**
 * @name Text & Table Formatters Module
 * @description Formats summary statistics tables by importing math helpers from math.js
 */

export async function formatStatsTable(numbers) {
  // Import dependency module math.js
  const math = await require('./math.js');

  const total = math.sum(numbers);
  const avg = math.average(numbers);
  const highest = math.max(numbers);

  return [
    { Metric: 'Total Sum', Value: total },
    { Metric: 'Average Value', Value: avg.toFixed(2) },
    { Metric: 'Peak Value', Value: highest },
    { Metric: 'Sample Size', Value: numbers.length }
  ];
}
`
  },
  // Root level folder: network
  {
    id: 'folder-network',
    name: 'network',
    type: 'folder',
    path: 'network',
    parentId: null,
    expanded: true
  },
  // network/http-client.js
  {
    id: 'file-network-client',
    name: 'http-client.js',
    type: 'file',
    path: 'network/http-client.js',
    parentId: 'folder-network',
    category: 'Network',
    code: `/**
 * @name Reusable HTTP Client Module
 * @description Provides a reusable JSON endpoint fetcher for workspace dependency calls.
 */

export async function fetchJson(url) {
  console.log(\`🌐 HTTP Client fetching: \${url}\`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return await response.json();
}
`
  },
  // network/domain-scanner.js
  {
    id: 'file-network-scanner',
    name: 'domain-scanner.js',
    type: 'file',
    path: 'network/domain-scanner.js',
    parentId: 'folder-network',
    category: 'Network',
    code: `/**
 * @name Domain REST Scanner
 * @description Queries public endpoints using http-client.js and formats metrics using formatters.js
 * 
 * @param {string} endpoint API Endpoint URL - default: "https://jsonplaceholder.typicode.com/posts"
 * @param {range:1:20:1} limit Max Records - default: 5
 */
async function run({ endpoint, limit }) {
  // Import cross-folder dependency scripts!
  const client = await workspace.import('network/http-client.js');
  const formatters = await workspace.import('utils/formatters.js');

  console.log(\`🔍 Querying endpoint \${endpoint}?_limit=\${limit}...\`);
  const posts = await client.fetchJson(\`\${endpoint}?_limit=\${limit}\`);

  const idLengths = posts.map(p => p.body ? p.body.length : 0);
  const stats = await formatters.formatStatsTable(idLengths);

  console.log(\`✅ Processed \${posts.length} posts.\`);
  console.table(stats);

  return stats;
}
`
  },
  // Root level folder: visuals
  {
    id: 'folder-visuals',
    name: 'visuals',
    type: 'folder',
    path: 'visuals',
    parentId: null,
    expanded: true
  },
  // visuals/card-builder.js
  {
    id: 'file-visuals-card',
    name: 'card-builder.js',
    type: 'file',
    path: 'visuals/card-builder.js',
    parentId: 'folder-visuals',
    category: 'Visuals',
    code: `/**
 * @name HTML Card Frame Builder
 * @description Visual card generator exported for dashboard rendering scripts.
 */

export function buildStatusCard(title, score, badgeText = 'OK') {
  return \`
    <div style="font-family: system-ui, sans-serif; padding: 24px; background: #0c0c0e; color: #fafafa; border-radius: 16px; border: 1px solid #27272a; max-width: 480px; margin: 0 auto;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #3b82f6;">\${title}</h3>
        <span style="background: #10b98122; color: #10b981; border: 1px solid #10b98144; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
          \${badgeText}
        </span>
      </div>
      <div style="background: #18181b; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase;">Composite Score</div>
        <div style="font-size: 36px; font-weight: 900; color: #3b82f6; margin-top: 4px;">\${score}%</div>
      </div>
    </div>
  \`;
}
`
  },
  // Root level file: main.js
  {
    id: 'file-main-orchestrator',
    name: 'main.js',
    type: 'file',
    path: 'main.js',
    parentId: null,
    category: 'Main',
    code: `/**
 * @name Master Workspace Orchestrator
 * @description Main orchestrator script importing modules across utils/, network/, and visuals/
 * 
 * @param {string} projectTitle Project Monitor Title - default: "Enterprise Network Hub"
 * @param {range:1:100:1} healthIndex Overall System Health - default: 98
 */
async function run({ projectTitle, healthIndex }) {
  console.log(\`🚀 Running Master Orchestrator for: "\${projectTitle}"...\`);

  // 1. Import math and formatting utilities from utils/
  const math = await require('./utils/math.js');
  const formatters = await require('./utils/formatters.js');
  
  // 2. Import visual card builder from visuals/
  const cardBuilder = await workspace.import('visuals/card-builder.js');

  const numbers = [12, 45, 88, 102, 34, healthIndex];
  console.log("Input Array:", numbers);
  console.log("Calculated Average:", math.average(numbers));

  const statsTable = await formatters.formatStatsTable(numbers);
  console.table(statsTable);

  // 3. Build HTML Frame output using visual builder dependency
  const htmlOutput = cardBuilder.buildStatusCard(projectTitle, healthIndex, 'SYSTEM NOMINAL');

  return { __html: htmlOutput, __title: projectTitle };
}
`
  }
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Main Multi-Folder Workspace',
    description: 'Nested directory layout with cross-script dependencies (require / workspace.import)',
    nodes: INITIAL_DEMO_NODES,
    activeFileId: 'file-main-orchestrator'
  }
];

const STORAGE_KEY = 'js_workspace_multi_v1';

export class WorkspaceStore {
  public static loadWorkspaces(): Workspace[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
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
      console.warn('Failed to save workspaces to localStorage:', e);
    }
  }
}
