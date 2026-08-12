export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB safe browser limit

export type FileKind = 'code' | 'data-json' | 'data-csv' | 'data-text' | 'data-image' | 'binary';

export function getFileKind(filename: string): FileKind {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'ts', 'jsx', 'tsx', 'mjs'].includes(ext)) return 'code';
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

const DEFAULT_WORKSPACE_ID = 'ws-default-demo';

export const INITIAL_DEMO_NODES: WorkspaceNode[] = [
  // Root level folder: data
  {
    id: 'folder-data',
    name: 'data',
    type: 'folder',
    path: 'data',
    parentId: null,
    expanded: true
  },
  // data/subdomains.csv
  {
    id: 'file-data-subdomains-csv',
    name: 'subdomains.csv',
    type: 'file',
    path: 'data/subdomains.csv',
    parentId: 'folder-data',
    fileKind: 'data-csv',
    sizeBytes: 380,
    category: 'Data',
    code: `IP,Subdomain,Status,ResponseTime
104.16.132.22,api.noob31.com,Active,14ms
104.16.133.22,cdn.noob31.com,Active,11ms
172.67.180.12,auth.noob31.com,Warning,84ms
172.67.180.13,staging.noob31.com,Offline,0ms
104.16.134.22,docs.noob31.com,Active,19ms
`
  },
  // data/config.json
  {
    id: 'file-data-config-json',
    name: 'config.json',
    type: 'file',
    path: 'data/config.json',
    parentId: 'folder-data',
    fileKind: 'data-json',
    sizeBytes: 240,
    category: 'Data',
    code: `{
  "projectName": "Noob31 Enterprise Workspace",
  "version": "1.4.0",
  "corsProxy": "https://cors.noob31.com/proxy",
  "maxRetries": 3,
  "features": {
    "nodeSupport": true,
    "frameRendering": true,
    "csvViewer": true
  }
}`
  },
  // Root level folder: node-demo
  {
    id: 'folder-node-demo',
    name: 'node-demo',
    type: 'folder',
    path: 'node-demo',
    parentId: null,
    expanded: true
  },
  // node-demo/full-feature-test.js
  {
    id: 'file-node-full-test',
    name: 'full-feature-test.js',
    type: 'file',
    path: 'node-demo/full-feature-test.js',
    parentId: 'folder-node-demo',
    fileKind: 'code',
    category: 'Test Suite',
    code: `/**
 * @name Master System Feature & Parameter Test
 * @description Comprehensive test script exercising all option controls (text, slider, color, json, select, boolean), Node fs/crypto/path/util, cross-script imports, dynamic lodash/dayjs, and visual frame output!
 * 
 * @param {string} testName Project Test Name - default: "Omni-Sandbox Test Run"
 * @param {range:1:100:5} sampleBatchSize Sample Batch Size - default: 25
 * @param {color} themeAccent Primary Brand Color - default: "#3b82f6"
 * @param {select:Summary|Detailed|RawLogs|HTMLFrame} outputFormat Target Output Mode - default: "Detailed"
 * @param {boolean} enableCryptoDigest Compute SHA-256 Hash - default: true
 * @param {boolean} writeOutputFile Save Results to Workspace FS - default: true
 * @param {json} metadataConfig Execution Metadata Settings - default: {"environment":"browser-worker","timeoutMs":5000,"retries":3}
 */
async function run({
  testName,
  sampleBatchSize,
  themeAccent,
  outputFormat,
  enableCryptoDigest,
  writeOutputFile,
  metadataConfig
}) {
  console.log(\`🚀 [1/6] Initializing Master System Test: "\${testName}"...\`);
  console.log(\`🎨 Theme Color: \${themeAccent} | Output Format: \${outputFormat} | Batch Size: \${sampleBatchSize}\`);
  console.log(\`⚙️ Metadata Config:\`, metadataConfig);

  // 1. Test Node.js Core Modules (path, process, util)
  const path = require('path');
  const util = require('util');

  console.log(\`📂 [2/6] Node process.cwd(): "\${process.cwd()}" | Platform: \${process.platform} | Version: \${process.version}\`);
  console.log(\`Path Join Example:\`, path.join('data', 'subdomains.csv'));

  // 2. Test Node.js Virtual fs & File Reading
  const fs = require('fs');
  console.log(\`🔍 [3/6] Reading workspace file "data/subdomains.csv" via fs.readFileSync()...\`);
  const csvText = fs.readFileSync('data/subdomains.csv', 'utf8');
  const csvLines = csvText.trim().split('\\n');
  console.log(\`Read \${csvLines.length} lines from subdomains.csv.\`);

  // 3. Test Cross-Script Dependency Import (utils/math.js)
  console.log(\`🔗 [4/6] Importing local workspace module "../utils/math.js"...\`);
  const math = await require('../utils/math.js');
  const sampleNumbers = Array.from({ length: sampleBatchSize }, (_, i) => (i + 1) * 4);
  const totalSum = math.sum(sampleNumbers);
  const avgValue = math.average(sampleNumbers);
  console.log(\`Math Utility -> Sum of \${sampleBatchSize} numbers: \${totalSum} | Average: \${avgValue.toFixed(2)}\`);

  // 4. Test Node.js Crypto & Buffer
  let sha256Hash = 'N/A';
  let generatedUuid = 'N/A';
  if (enableCryptoDigest) {
    const crypto = require('crypto');
    sha256Hash = crypto.createHash('sha256').update(csvText).digest('hex');
    generatedUuid = crypto.randomUUID();
    console.log(\`🔒 [5/6] SHA-256 Digest of subdomains.csv: \${sha256Hash}\`);
    console.log(\`Generated UUID: \${generatedUuid}\`);
  }

  // 5. Test Dynamic NPM Packages (lodash & dayjs)
  console.log(\`📦 [6/6] Dynamically requiring external NPM packages (lodash & dayjs)...\`);
  const _ = await require('lodash');
  const dayjs = await require('dayjs');

  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const formattedTitle = _.startCase(testName);
  console.log(\`Lodash Title Case: "\${formattedTitle}"\`);
  console.log(\`Day.js Timestamp: \${timestamp}\`);

  // 6. Test File Writing via fs.writeFileSync (Live UI Sync!)
  const reportPath = 'full-test-results.txt';
  if (writeOutputFile) {
    const reportContent = util.format(
      "=== MASTER SYSTEM TEST REPORT ===\\nTest Name: %s\\nTimestamp: %s\\nBatch Size: %d\\nSum: %d\\nAvg: %s\\nSHA-256: %s\\nUUID: %s\\nAccent: %s\\nConfig: %j",
      formattedTitle,
      timestamp,
      sampleBatchSize,
      totalSum,
      avgValue.toFixed(2),
      sha256Hash,
      generatedUuid,
      themeAccent,
      metadataConfig
    );
    fs.writeFileSync(reportPath, reportContent);
    console.log(\`✅ Written report to workspace file "\${reportPath}" via fs.writeFileSync()!\`);
  }

  // 7. Output Payload Generation
  const records = [
    { Metric: 'Test Suite Name', Value: formattedTitle },
    { Metric: 'Execution Time', Value: timestamp },
    { Metric: 'Batch Size', Value: sampleBatchSize },
    { Metric: 'Math Sum', Value: totalSum },
    { Metric: 'Math Average', Value: avgValue.toFixed(2) },
    { Metric: 'SHA-256 Digest', Value: sha256Hash.slice(0, 16) + '...' },
    { Metric: 'Generated UUID', Value: generatedUuid },
    { Metric: 'Report File', Value: reportPath },
    { Metric: 'Accent Color', Value: themeAccent }
  ];

  console.table(records);

  if (outputFormat === 'HTMLFrame') {
    return {
      __html: \`
        <div style="font-family: system-ui, sans-serif; padding: 24px; background: #09090b; color: #fafafa; border-radius: 16px; border: 1px solid #27272a; max-width: 520px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-b: 1px solid #27272a; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: \${themeAccent};">\${formattedTitle}</h2>
            <span style="background: #10b98122; color: #10b981; border: 1px solid #10b98144; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
              PASSED
            </span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: #18181b; padding: 12px; border-radius: 10px;">
              <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase;">Batch Sum</div>
              <div style="font-size: 24px; font-weight: 900; color: \${themeAccent};">\${totalSum}</div>
            </div>
            <div style="background: #18181b; padding: 12px; border-radius: 10px;">
              <div style="font-size: 10px; color: #a1a1aa; text-transform: uppercase;">Average</div>
              <div style="font-size: 24px; font-weight: 900; color: #10b981;">\${avgValue.toFixed(1)}</div>
            </div>
          </div>
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; background: #121215; padding: 10px; border-radius: 8px;">
            UUID: \${generatedUuid}<br/>
            Report: \${reportPath}
          </div>
        </div>
      \`,
      __title: 'Master Test Summary Frame'
    };
  }

  return records;
}
`,
  },
  // node-demo/npm-packages-demo.js
  {
    id: 'file-node-npm-demo',
    name: 'npm-packages-demo.js',
    type: 'file',
    path: 'node-demo/npm-packages-demo.js',
    parentId: 'folder-node-demo',
    fileKind: 'code',
    category: 'NPM Packages',
    code: `/**
 * @name Dynamic NPM Package Loader Demo
 * @description Loads external NPM packages (lodash, dayjs, papaparse) dynamically via require('package-name')
 * 
 * @param {string} textInput Sample Text to Format - default: "javascript workspace sandbox"
 */
async function run({ textInput }) {
  console.log("📦 Loading external NPM packages dynamically...");

  // Load lodash from CDN
  const _ = await require('lodash');
  console.log("✅ Lodash loaded! Title case:", _.startCase(textInput));
  console.log("Lodash chunk array:", _.chunk([1, 2, 3, 4, 5, 6], 2));

  // Load dayjs from CDN
  const dayjs = await require('dayjs');
  console.log("✅ Day.js loaded! Current time:", dayjs().format('YYYY-MM-DD HH:mm:ss'));
  console.log("Formatted relative date (+7 days):", dayjs().add(7, 'day').format('MMMM D, YYYY'));

  // Load PapaParse from CDN
  const Papa = await require('papaparse');
  const csvData = "Name,Role,Score\\nAlice,Engineer,95\\nBob,Designer,88";
  const parsedCsv = Papa.parse(csvData, { header: true });
  console.log("✅ PapaParse loaded! Parsed CSV rows:", parsedCsv.data);
  console.table(parsedCsv.data);

  return {
    lodashResult: _.startCase(textInput),
    formattedDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    csvRows: parsedCsv.data
  };
}
`,
  },
  // node-demo/csv-parser.js
  {
    id: 'file-node-csv-parser',
    name: 'csv-parser.js',
    type: 'file',
    path: 'node-demo/csv-parser.js',
    parentId: 'folder-node-demo',
    fileKind: 'code',
    category: 'Node.js',
    code: `/**
 * @name CSV Data File Reader & Parser
 * @description Reads data/subdomains.csv using Node.js fs.readFileSync, parses rows, and outputs to Frame Preview table!
 * 
 * @param {string} csvFilePath Target CSV File - default: "data/subdomains.csv"
 * @param {select:All|Active|Warning|Offline} statusFilter Filter by Status - default: "All"
 */
async function run({ csvFilePath, statusFilter }) {
  const fs = require('fs');
  const path = require('path');

  console.log(\`📂 Reading CSV data file: "\${csvFilePath}" via fs.readFileSync()...\`);

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(\`CSV File "\${csvFilePath}" not found in workspace!\`);
  }

  const rawText = fs.readFileSync(csvFilePath, 'utf8');
  const lines = rawText.trim().split('\\n');
  const headers = lines[0].split(',').map(h => h.trim());

  console.log(\`Header Columns (\${headers.length}):\`, headers);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length < headers.length) continue;

    const entry = {};
    headers.forEach((h, idx) => {
      entry[h] = row[idx];
    });

    if (statusFilter === 'All' || entry.Status === statusFilter) {
      records.push(entry);
    }
  }

  console.log(\`✅ Parsed \${records.length} records matching status "\${statusFilter}":\`);
  console.table(records);

  return records;
}
`
  },
  // node-demo/fs-and-crypto.js
  {
    id: 'file-node-fs-crypto',
    name: 'fs-and-crypto.js',
    type: 'file',
    path: 'node-demo/fs-and-crypto.js',
    parentId: 'folder-node-demo',
    fileKind: 'code',
    category: 'Node.js',
    code: `/**
 * @name Node.js Core Modules Demo
 * @description Demonstrates require('fs'), require('path'), require('crypto'), and Buffer in browser!
 * 
 * @param {string} sampleFile Path to Read - default: "utils/math.js"
 * @param {string} newFilename File to Write - default: "crypto-digest.txt"
 */
async function run({ sampleFile, newFilename }) {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const util = require('util');

  console.log(\`📂 Node process.cwd(): "\${process.cwd()}" | version: \${process.version}\`);
  console.log(\`🔍 Checking file existence for "\${sampleFile}"...\`);

  if (!fs.existsSync(sampleFile)) {
    throw new Error(\`File \${sampleFile} does not exist in workspace!\`);
  }

  const content = fs.readFileSync(sampleFile, 'utf8');
  const buffer = Buffer.from(content);
  console.log(\`Read \${content.length} characters (\${buffer.length} bytes).\`);

  // Create SHA-256 Digest using Node crypto
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const uuid = crypto.randomUUID();

  console.log(\`SHA-256 Digest: \${sha256}\`);
  console.log(\`Generated UUID: \${uuid}\`);

  const outputPayload = util.format(
    "Source File: %s\\nByte Size: %d\\nSHA-256: %s\\nGenerated UUID: %s\\nTimestamp: %s",
    sampleFile,
    buffer.length,
    sha256,
    uuid,
    new Date().toISOString()
  );

  // Write file to workspace tree via fs.writeFileSync!
  fs.writeFileSync(newFilename, outputPayload);
  console.log(\`✅ Written result to workspace file: "\${newFilename}" via fs.writeFileSync()!\`);

  return { file: newFilename, sha256, uuid, size: buffer.length };
}
`
  },
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
    fileKind: 'code',
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
    fileKind: 'code',
    category: 'Utilities',
    code: `/**
 * @name Text & Table Formatters Module
 * @description Formats summary statistics tables by importing math helpers from math.js
 */

export async function formatStatsTable(numbers) {
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
  // Root level file: main.js
  {
    id: 'file-main-orchestrator',
    name: 'main.js',
    type: 'file',
    path: 'main.js',
    parentId: null,
    fileKind: 'code',
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

  const math = await require('./utils/math.js');
  const formatters = await require('./utils/formatters.js');
  
  const numbers = [12, 45, 88, 102, 34, healthIndex];
  console.log("Input Array:", numbers);
  console.log("Calculated Average:", math.average(numbers));

  const statsTable = await formatters.formatStatsTable(numbers);
  console.table(statsTable);

  return statsTable;
}
`
  }
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Main Multi-Folder Workspace',
    description: 'Nested directory layout with Node.js fs data file processing (.csv, .json, images)',
    nodes: INITIAL_DEMO_NODES,
    activeFileId: 'file-node-full-test'
  }
];

const STORAGE_KEY = 'js_workspace_v6_fulltest';

export class WorkspaceStore {
  public static loadWorkspaces(): Workspace[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0]?.nodes &&
          Array.isArray(parsed[0].nodes) &&
          parsed[0].nodes.length > 0
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
      console.warn('Failed to save workspaces to localStorage:', e);
    }
  }
}
