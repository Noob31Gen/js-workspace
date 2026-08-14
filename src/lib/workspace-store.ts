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

const DEFAULT_WORKSPACE_ID = 'ws-master-suite';

export const INITIAL_DEMO_NODES: WorkspaceNode[] = [
  // 1. Folder: 01-parameter-types
  {
    id: 'folder-01-params',
    name: '01-parameter-types',
    type: 'folder',
    path: '01-parameter-types',
    parentId: null,
    expanded: true
  },
  // 01-parameter-types/jsdoc-all-types-demo.js
  {
    id: 'file-01-jsdoc-all',
    name: 'jsdoc-all-types-demo.js',
    type: 'file',
    path: '01-parameter-types/jsdoc-all-types-demo.js',
    parentId: 'folder-01-params',
    fileKind: 'code',
    category: 'Parameters',
    code: `/**
 * @name JSDoc Parameter Controls Showcase
 * @description Tests all JSDoc parameter types: string, number, boolean, select dropdown, range slider, color picker, JSON config object, and multiline text!
 * 
 * @param {string} userName User Display Name - default: "Alex Mercer"
 * @param {number} maxRetries Maximum Retry Limit - default: 5
 * @param {boolean} enableNotifications Enable Push Notifications - default: true
 * @param {select:Production|Staging|Development|LocalSandbox} environment Environment Mode - default: "Staging"
 * @param {range:10:100:5} cpuThreshold CPU Threshold Percentage - default: 75
 * @param {color} primaryColor Brand Accent Color - default: "#6366f1"
 * @param {json} appSettings Application JSON Settings - default: {"timeoutMs":3000,"debug":true,"tags":["v2","beta"]}
 * @param {text} logHeader Custom Text Banner - default: "=== SYSTEM MONITORING INITIALIZED ===\\nReady for live execution."
 */
async function run({
  userName,
  maxRetries,
  enableNotifications,
  environment,
  cpuThreshold,
  primaryColor,
  appSettings,
  logHeader
}) {
  console.log("🎨 JSDoc Parameter Controls Showcase");
  console.log("-----------------------------------------");
  console.log("Banner:\\n" + logHeader);
  console.log(\`👤 User: \${userName} (Max Retries: \${maxRetries})\`);
  console.log(\`🔔 Notifications Enabled: \${enableNotifications}\`);
  console.log(\`🌍 Environment Mode: \${environment}\`);
  console.log(\`⚡ CPU Threshold: \${cpuThreshold}%\`);
  console.log(\`🎨 Primary Color: \${primaryColor}\`);
  console.log("⚙️ App Settings Object:", appSettings);

  const summary = [
    { Parameter: 'User Display Name', Type: 'string', Value: userName },
    { Parameter: 'Max Retries', Type: 'number', Value: maxRetries },
    { Parameter: 'Notifications Enabled', Type: 'boolean', Value: enableNotifications },
    { Parameter: 'Environment', Type: 'select', Value: environment },
    { Parameter: 'CPU Threshold', Type: 'range', Value: \`\${cpuThreshold}%\` },
    { Parameter: 'Primary Color', Type: 'color', Value: primaryColor },
    { Parameter: 'Settings Timeout', Type: 'json', Value: \`\${appSettings?.timeoutMs || 0} ms\` }
  ];

  console.table(summary);
  return summary;
}
`
  },
  // 01-parameter-types/autodetect-params-demo.js
  {
    id: 'file-01-autodetect',
    name: 'autodetect-params-demo.js',
    type: 'file',
    path: '01-parameter-types/autodetect-params-demo.js',
    parentId: 'folder-01-params',
    fileKind: 'code',
    category: 'Parameters',
    code: `/**
 * @name Auto-Detected Parameters Test
 * @description Demonstrates automatic UI parameter form creation from function signatures, destructuring, and property usage without explicit @param tags!
 */
async function run({ query = "Security Scan", maxResults = 10, isVerbose = true, outputFormat = "JSON" }) {
  console.log("🔍 Auto-Detected Parameter Execution");
  console.log(\`Search Query: "\${query}" | Max Results: \${maxResults} | Verbose: \${isVerbose} | Format: \${outputFormat}\`);

  // Extra destructuring inside body (also auto-detected by parser!)
  const { batchSize = 5, retryCount = 2 } = arguments[0] || {};
  console.log(\`Batch Size: \${batchSize} | Retry Count: \${retryCount}\`);

  const results = Array.from({ length: Math.min(maxResults, 20) }, (_, i) => ({
    Index: i + 1,
    Target: \`node-\${i + 1}.network.local\`,
    Query: query,
    Status: i % 4 === 0 ? "Warning" : "Healthy"
  }));

  if (isVerbose) {
    console.table(results);
  }

  return { query, totalFound: results.length, sample: results.slice(0, 3) };
}
`
  },

  // 2. Folder: 02-file-processing
  {
    id: 'folder-02-files',
    name: '02-file-processing',
    type: 'folder',
    path: '02-file-processing',
    parentId: null,
    expanded: true
  },
  // 02-file-processing/csv-filter-and-write.js
  {
    id: 'file-02-csv-filter',
    name: 'csv-filter-and-write.js',
    type: 'file',
    path: '02-file-processing/csv-filter-and-write.js',
    parentId: 'folder-02-files',
    fileKind: 'code',
    category: 'File Processing',
    code: `/**
 * @name Virtual FS CSV Processor & Report Writer
 * @description Reads data/servers.csv, filters servers by status and latency, calculates statistics, and writes a report file to the workspace virtual FS via fs.writeFileSync()!
 * 
 * @param {string} csvPath Source CSV Workspace Path - default: "data/servers.csv"
 * @param {select:All|Online|Warning|Maintenance} statusFilter Server Status Filter - default: "All"
 * @param {range:10:500:10} maxLatencyMs Latency Threshold (ms) - default: 200
 * @param {string} outputReportFile Output Summary Report Filename - default: "server-audit-report.txt"
 */
async function run({ csvPath, statusFilter, maxLatencyMs, outputReportFile }) {
  const fs = require('fs');
  const util = require('util');

  console.log(\`📂 Reading CSV workspace file: "\${csvPath}" via fs.readFileSync()...\`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(\`CSV File "\${csvPath}" not found in workspace!\`);
  }

  const rawText = fs.readFileSync(csvPath, 'utf8');
  const lines = rawText.trim().split('\\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const records = [];
  let totalLatency = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx]; });

    const latency = Number(row.LatencyMs) || 0;

    const matchStatus = statusFilter === 'All' || row.Status === statusFilter;
    const matchLatency = latency <= maxLatencyMs;

    if (matchStatus && matchLatency) {
      records.push(row);
      totalLatency += latency;
    }
  }

  const avgLatency = records.length > 0 ? (totalLatency / records.length).toFixed(1) : 0;
  console.log(\`✅ Filtered \${records.length} servers matching Status="\${statusFilter}" & Latency <= \${maxLatencyMs}ms\`);
  console.log(\`Average Latency: \${avgLatency} ms\`);
  console.table(records);

  // Write new report file into workspace virtual FS!
  const reportContent = util.format(
    "=== SERVER AUDIT REPORT ===\\nTimestamp: %s\\nStatus Filter: %s\\nMax Latency: %d ms\\nTotal Matching Servers: %d\\nAverage Latency: %s ms\\n\\nMatched Servers:\\n%j",
    new Date().toISOString(),
    statusFilter,
    maxLatencyMs,
    records.length,
    avgLatency,
    records
  );

  fs.writeFileSync(outputReportFile, reportContent);
  console.log(\`📝 Written summary report to workspace file "\${outputReportFile}" via fs.writeFileSync()!\`);

  return records;
}
`
  },
  // 02-file-processing/json-transformer.js
  {
    id: 'file-02-json-transform',
    name: 'json-transformer.js',
    type: 'file',
    path: '02-file-processing/json-transformer.js',
    parentId: 'folder-02-files',
    fileKind: 'code',
    category: 'File Processing',
    code: `/**
 * @name Virtual FS JSON Data Transformer
 * @description Reads data/users.json, transforms fields, filters active users, and saves data/active-users-report.json to the workspace tree!
 * 
 * @param {string} jsonPath Source JSON File - default: "data/users.json"
 * @param {select:All|Admin|Developer|Analyst} roleFilter Target Role Filter - default: "All"
 * @param {boolean} activeOnly Filter Active Status Only - default: true
 * @param {string} outputJsonPath Output Transformed JSON - default: "data/active-users-report.json"
 */
async function run({ jsonPath, roleFilter, activeOnly, outputJsonPath }) {
  const fs = require('fs');

  console.log(\`📂 Reading JSON file "\${jsonPath}"...\`);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(\`File \${jsonPath} does not exist in workspace!\`);
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  const users = JSON.parse(rawJson);

  const filtered = users.filter(user => {
    const matchRole = roleFilter === 'All' || user.role === roleFilter;
    const matchActive = !activeOnly || user.status === 'active';
    return matchRole && matchActive;
  }).map(u => ({
    ...u,
    processedAt: new Date().toISOString(),
    accountTier: u.loginCount > 30 ? 'Power User' : 'Standard User'
  }));

  console.log(\`Processed \${filtered.length} user records.\`);
  console.table(filtered);

  // Write file to workspace
  fs.writeFileSync(outputJsonPath, JSON.stringify(filtered, null, 2));
  console.log(\`✅ Saved transformed data to workspace file "\${outputJsonPath}"!\`);

  return filtered;
}
`
  },

  // 3. Folder: 03-node-core-modules
  {
    id: 'folder-03-node',
    name: '03-node-core-modules',
    type: 'folder',
    path: '03-node-core-modules',
    parentId: null,
    expanded: true
  },
  // 03-node-core-modules/node-fs-crypto-path.js
  {
    id: 'file-03-node-core',
    name: 'node-fs-crypto-path.js',
    type: 'file',
    path: '03-node-core-modules/node-fs-crypto-path.js',
    parentId: 'folder-03-node',
    fileKind: 'code',
    category: 'Node.js',
    code: `/**
 * @name Node.js Core Polyfills Test Suite
 * @description Exercises require('fs'), require('path'), require('crypto'), Buffer, process, and util in browser sandbox!
 * 
 * @param {string} sampleFile File to Read - default: "data/servers.csv"
 * @param {boolean} generateHashes Compute SHA-256 and UUID - default: true
 */
async function run({ sampleFile, generateHashes }) {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const util = require('util');

  console.log("⚡ Node.js Core Modules Environment Test");
  console.log(\`Node process.cwd(): "\${process.cwd()}" | platform: \${process.platform} | version: \${process.version}\`);
  console.log(\`Path Dirname: "\${path.dirname(sampleFile)}" | Basename: "\${path.basename(sampleFile)}" | Ext: "\${path.extname(sampleFile)}"\`);

  if (!fs.existsSync(sampleFile)) {
    throw new Error(\`File \${sampleFile} not found!\`);
  }

  const content = fs.readFileSync(sampleFile, 'utf8');
  const buffer = Buffer.from(content);
  console.log(\`Read file content: \${content.length} characters (\${buffer.length} bytes).\`);

  let sha256 = 'N/A';
  let uuid = 'N/A';
  let randomHex = 'N/A';

  if (generateHashes) {
    sha256 = crypto.createHash('sha256').update(content).digest('hex');
    uuid = crypto.randomUUID();
    randomHex = crypto.randomBytes(16).toString('hex');

    console.log(\`🔒 SHA-256 Digest: \${sha256}\`);
    console.log(\`🆔 Generated UUID: \${uuid}\`);
    console.log(\`🎲 Random 16 Bytes: \${randomHex}\`);
  }

  const formattedLog = util.format(
    "File: %s | Size: %d bytes | SHA-256: %s",
    sampleFile,
    buffer.length,
    sha256.slice(0, 16) + '...'
  );
  console.log("Util Format Output:", formattedLog);

  return {
    sampleFile,
    byteSize: buffer.length,
    sha256,
    uuid,
    randomHex
  };
}
`
  },
  // 03-node-core-modules/node-events-buffer.js
  {
    id: 'file-03-node-events',
    name: 'node-events-buffer.js',
    type: 'file',
    path: '03-node-core-modules/node-events-buffer.js',
    parentId: 'folder-03-node',
    fileKind: 'code',
    category: 'Node.js',
    code: `/**
 * @name Node.js EventEmitter & Buffer Deep-Dive
 * @description Demonstrates require('events') EventEmitter, Buffer.concat, Buffer.alloc, and util.inspect!
 */
async function run() {
  const { EventEmitter } = require('events');
  const util = require('util');

  console.log("📢 Initializing EventEmitter instance...");
  const bus = new EventEmitter();

  const logs = [];
  bus.on('data', (msg) => {
    console.log(\`[Event bus] Received data event: "\${msg}"\`);
    logs.push(msg);
  });

  bus.emit('data', 'Initialization ping');
  bus.emit('data', 'Processing step 1');
  bus.emit('data', 'Task completed');

  // Buffer Concatenation
  const buf1 = Buffer.from('Hello ');
  const buf2 = Buffer.from('World ');
  const buf3 = Buffer.from('from Node.js Polyfills!');
  const mergedBuf = Buffer.concat([buf1, buf2, buf3]);

  console.log("Merged Buffer text:", mergedBuf.toString());
  console.log("Util Inspect:", util.inspect({ busEvents: logs.length, bufferSize: mergedBuf.length }));

  return {
    eventCount: logs.length,
    eventsReceived: logs,
    mergedBufferText: mergedBuf.toString()
  };
}
`
  },

  // 4. Folder: 04-npm-packages
  {
    id: 'folder-04-npm',
    name: '04-npm-packages',
    type: 'folder',
    path: '04-npm-packages',
    parentId: null,
    expanded: true
  },
  // 04-npm-packages/npm-dynamic-loader.js
  {
    id: 'file-04-npm-demo',
    name: 'npm-dynamic-loader.js',
    type: 'file',
    path: '04-npm-packages/npm-dynamic-loader.js',
    parentId: 'folder-04-npm',
    fileKind: 'code',
    category: 'NPM Packages',
    code: `/**
 * @name Dynamic CDN NPM Package Importer
 * @description Dynamically requires lodash, dayjs, and papaparse from CDN (esm.sh) at runtime via require('package')!
 * 
 * @param {string} rawString Sample Text for Lodash - default: "javascript browser worker sandbox execution"
 */
async function run({ rawString }) {
  console.log("📦 Dynamically loading NPM packages via require()...");

  // 1. Load lodash from CDN
  const _ = await require('lodash');
  console.log("✅ Lodash loaded!");
  console.log("  -> startCase:", _.startCase(rawString));
  console.log("  -> chunk array:", _.chunk([10, 20, 30, 40, 50, 60, 70, 80], 3));

  // 2. Load dayjs from CDN
  const dayjs = await require('dayjs');
  console.log("✅ Day.js loaded!");
  console.log("  -> Current Time:", dayjs().format('YYYY-MM-DD HH:mm:ss'));
  console.log("  -> In 30 Days:", dayjs().add(30, 'day').format('MMMM D, YYYY'));

  // 3. Load PapaParse from CDN
  const Papa = await require('papaparse');
  console.log("✅ PapaParse loaded!");
  const csvData = "Service,Region,Uptime\\nAuthService,us-east,99.9%\\nPaymentGateway,eu-central,99.5%";
  const parsed = Papa.parse(csvData, { header: true });
  console.table(parsed.data);

  return {
    lodashTitleCase: _.startCase(rawString),
    formattedDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    parsedCsvRows: parsed.data
  };
}
`
  },

  // 5. Folder: 05-cross-script-imports
  {
    id: 'folder-05-imports',
    name: '05-cross-script-imports',
    type: 'folder',
    path: '05-cross-script-imports',
    parentId: null,
    expanded: true
  },
  // 05-cross-script-imports/helpers (subfolder)
  {
    id: 'folder-05-helpers',
    name: 'helpers',
    type: 'folder',
    path: '05-cross-script-imports/helpers',
    parentId: 'folder-05-imports',
    expanded: true
  },
  // 05-cross-script-imports/helpers/math.js
  {
    id: 'file-05-math',
    name: 'math.js',
    type: 'file',
    path: '05-cross-script-imports/helpers/math.js',
    parentId: 'folder-05-helpers',
    fileKind: 'code',
    category: 'Utilities',
    code: `/**
 * @name Math Helper Module
 * @description Provides statistical calculation utilities exported for other scripts in the workspace.
 */

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function average(arr) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

export function max(arr) {
  return Math.max(...arr);
}

export function min(arr) {
  return Math.min(...arr);
}
`
  },
  // 05-cross-script-imports/helpers/formatters.js
  {
    id: 'file-05-formatters',
    name: 'formatters.js',
    type: 'file',
    path: '05-cross-script-imports/helpers/formatters.js',
    parentId: 'folder-05-helpers',
    fileKind: 'code',
    category: 'Utilities',
    code: `/**
 * @name Formatters Helper Module
 * @description Imports math.js via relative require and formats summary table records.
 */

export async function buildSummaryTable(numbers) {
  const math = await require('./math.js');

  const totalSum = math.sum(numbers);
  const avgVal = math.average(numbers);
  const maxVal = math.max(numbers);
  const minVal = math.min(numbers);

  return [
    { Metric: 'Total Sum', Value: totalSum },
    { Metric: 'Average', Value: avgVal.toFixed(2) },
    { Metric: 'Maximum', Value: maxVal },
    { Metric: 'Minimum', Value: minVal },
    { Metric: 'Sample Count', Value: numbers.length }
  ];
}
`
  },
  // 05-cross-script-imports/main-orchestrator.js
  {
    id: 'file-05-orchestrator',
    name: 'main-orchestrator.js',
    type: 'file',
    path: '05-cross-script-imports/main-orchestrator.js',
    parentId: 'folder-05-imports',
    fileKind: 'code',
    category: 'Imports & Execution',
    code: `/**
 * @name Cross-Script Module & Orchestration Demo
 * @description Imports local workspace helper modules (./helpers/math.js and ./helpers/formatters.js) via require() and executes other scripts via workspace.runScript()!
 * 
 * @param {string} taskTitle Task Diagnostics Name - default: "Omni-Channel Diagnostics"
 * @param {range:5:50:5} sampleSize Dataset Element Count - default: 15
 */
async function run({ taskTitle, sampleSize }) {
  console.log(\`🚀 [1/3] Starting Orchestrator for: "\${taskTitle}"...\`);

  // 1. Import relative module math.js
  const math = await require('./helpers/math.js');
  const numbers = Array.from({ length: sampleSize }, (_, i) => (i + 1) * 3);

  console.log("Input dataset (" + sampleSize + " items):", numbers);
  console.log(\`Sum via math.js: \${math.sum(numbers)} | Average: \${math.average(numbers).toFixed(2)}\`);

  // 2. Import relative module formatters.js
  console.log("🔗 [2/3] Importing ./helpers/formatters.js...");
  const formatters = await require('./helpers/formatters.js');
  const summaryTable = await formatters.buildSummaryTable(numbers);
  console.table(summaryTable);

  // 3. Execute another script using workspace.runScript()
  console.log("⚡ [3/3] Invoking child script via workspace.runScript('01-parameter-types/autodetect-params-demo.js')...");
  const childResult = await workspace.runScript('01-parameter-types/autodetect-params-demo.js', {
    query: taskTitle,
    maxResults: 5
  });

  console.log("Child Script Executed Successfully! Result:", childResult);

  return summaryTable;
}
`
  },

  // 6. Folder: 06-frame-renderers
  {
    id: 'folder-06-frames',
    name: '06-frame-renderers',
    type: 'folder',
    path: '06-frame-renderers',
    parentId: null,
    expanded: true
  },
  // 06-frame-renderers/html-dashboard-frame.js
  {
    id: 'file-06-html-frame',
    name: 'html-dashboard-frame.js',
    type: 'file',
    path: '06-frame-renderers/html-dashboard-frame.js',
    parentId: 'folder-06-frames',
    fileKind: 'code',
    category: 'Frame Rendering',
    code: `/**
 * @name HTML Frame UI Dashboard Renderer
 * @description Renders an interactive, styled dark-mode HTML dashboard widget directly inside the Frame Preview tab!
 * 
 * @param {string} systemName Application System Name - default: "Antigravity Cloud Hub"
 * @param {range:50:100:1} healthPercent System Health Score % - default: 96
 * @param {color} accentColor Primary Brand Color - default: "#10b981"
 * @param {select:Operational|Degraded|Maintenance} systemStatus Current System Status - default: "Operational"
 */
async function run({ systemName, healthPercent, accentColor, systemStatus }) {
  console.log(\`🎨 Rendering HTML UI Frame for "\${systemName}"...\`);

  const statusBg = systemStatus === 'Operational' ? '#10b98122' : systemStatus === 'Degraded' ? '#f59e0b22' : '#ef444422';
  const statusColor = systemStatus === 'Operational' ? '#10b981' : systemStatus === 'Degraded' ? '#f59e0b' : '#ef4444';

  return {
    __html: \`
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; background: #09090b; color: #fafafa; border-radius: 16px; border: 1px solid #27272a; max-width: 540px; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 14px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: \${accentColor};">\${systemName}</h2>
            <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">Live Workspace Execution Frame</div>
          </div>
          <span style="background: \${statusBg}; color: \${statusColor}; border: 1px solid \${statusColor}44; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800;">
            \${systemStatus}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
          <div style="background: #18181b; padding: 16px; border-radius: 12px; border: 1px solid #27272a;">
            <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; font-weight: 700;">Health Score</div>
            <div style="font-size: 32px; font-weight: 900; color: \${accentColor}; margin-top: 4px;">\${healthPercent}%</div>
          </div>
          <div style="background: #18181b; padding: 16px; border-radius: 12px; border: 1px solid #27272a;">
            <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; font-weight: 700;">Response Time</div>
            <div style="font-size: 32px; font-weight: 900; color: #3b82f6; margin-top: 4px;">12ms</div>
          </div>
        </div>

        <div style="background: #18181b; padding: 14px; border-radius: 12px; border: 1px solid #27272a; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span>Capacity Allocation</span>
            <span style="font-weight: 700;">\${healthPercent}%</span>
          </div>
          <div style="width: 100%; height: 8px; background: #27272a; border-radius: 9999px; overflow: hidden;">
            <div style="width: \${healthPercent}%; height: 100%; background: \${accentColor}; transition: width 0.5s ease;"></div>
          </div>
        </div>

        <div style="font-size: 11px; font-family: monospace; color: #71717a; text-align: center;">
          Frame Generated: \${new Date().toLocaleTimeString()}
        </div>
      </div>
    \`,
    __title: \`\${systemName} Summary Frame\`
  };
}
`
  },
  // 06-frame-renderers/table-and-image-frame.js
  {
    id: 'file-06-table-frame',
    name: 'table-and-image-frame.js',
    type: 'file',
    path: '06-frame-renderers/table-and-image-frame.js',
    parentId: 'folder-06-frames',
    fileKind: 'code',
    category: 'Frame Rendering',
    code: `/**
 * @name Table Record Set Frame Renderer
 * @description Returns a structured array of records for automatic tabular visual rendering in the Frame Preview tab!
 * 
 * @param {select:TableData|SampleImage} frameType Target Output Format - default: "TableData"
 */
async function run({ frameType }) {
  if (frameType === 'SampleImage') {
    // Return SVG Data URL string (automatically detected as Image Frame!)
    const svgContent = \`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="100%" height="100%" fill="#09090b"/><circle cx="200" cy="100" r="60" fill="#6366f1"/><text x="200" y="105" fill="#ffffff" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">Frame Image Test</text></svg>\`;
    return "data:image/svg+xml;base64," + btoa(svgContent);
  }

  // Return structured array (automatically detected as Table Frame!)
  return [
    { Component: 'Authentication Engine', Status: 'Active', Load: '24%', Health: '100%' },
    { Component: 'Database Cluster', Status: 'Active', Load: '68%', Health: '98%' },
    { Component: 'Cache Layer (Redis)', Status: 'Active', Load: '12%', Health: '100%' },
    { Component: 'Worker Runner', Status: 'Active', Load: '45%', Health: '99%' }
  ];
}
`
  },
  // 06-frame-renderers/browser-document-dom-demo.js
  {
    id: 'file-06-browser-dom-demo',
    name: 'browser-document-dom-demo.js',
    type: 'file',
    path: '06-frame-renderers/browser-document-dom-demo.js',
    parentId: 'folder-06-frames',
    fileKind: 'code',
    category: 'Frame Rendering',
    code: `/**
 * @name Standard Browser Web Page DOM Demo
 * @description Demonstrates standard browser web page DOM manipulation (document.body.innerHTML, document.write, document.createElement) rendering live in the Frame Preview tab!
 * 
 * @param {string} pageTitle Page Heading Title - default: "My Dynamic Web Application"
 * @param {color} themeColor Primary Accent Color - default: "#6366f1"
 */
async function run({ pageTitle, themeColor }) {
  console.log("🌐 Initializing Browser Web Page DOM Execution...");

  // 1. Direct document.body.innerHTML assignment
  document.body.innerHTML = \`
    <div style="font-family: system-ui, sans-serif; padding: 20px; background: #09090b; color: #fafafa; border-radius: 12px; border: 1px solid #27272a; max-width: 500px; margin: 0 auto;">
      <h1 style="color: \${themeColor}; margin-top: 0;">\${pageTitle}</h1>
      <p style="color: #a1a1aa; font-size: 13px;">Rendered via standard browser web page DOM manipulation: <code>document.body.innerHTML</code>!</p>
      <div id="card-container" style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;"></div>
    </div>
  \`;

  // 2. document.write / writeln
  document.write(\`<div style="text-align:center; font-family:monospace; font-size:11px; color:#71717a; margin-top:12px;">Generated via document.write() at \${new Date().toLocaleTimeString()}</div>\`);

  // 3. document.createElement & appendChild
  const card = document.createElement('div');
  card.innerHTML = \`<div style="background:#18181b; padding:12px; border-radius:8px; border:1px solid #27272a; font-size:12px; margin-top:10px;"><strong style="color:#10b981;">DOM Node Created:</strong> Appended via <code>document.body.appendChild()</code></div>\`;
  document.body.appendChild(card);

  console.log("✅ Web page DOM rendered successfully!");
  return { status: "Success", pageTitle, themeColor };
}
`
  },
  // 06-frame-renderers/multi-frame-stream-demo.js
  {
    id: 'file-06-multi-frame-demo',
    name: 'multi-frame-stream-demo.js',
    type: 'file',
    path: '06-frame-renderers/multi-frame-stream-demo.js',
    parentId: 'folder-06-frames',
    fileKind: 'code',
    category: 'Frame Rendering',
    code: `/**
 * @name Multi-Frame Vertical Stream Demo
 * @description Demonstrates returning an array of multiple HTML frames rendered one below another in the Frame Preview tab!
 */
async function run() {
  console.log("🖼️ Generating multi-frame widget array...");

  const frame1 = {
    __html: \`
      <div style="font-family: system-ui, sans-serif; padding: 16px; background: #09090b; color: #3b82f6; border-radius: 12px; border: 1px solid #1e3a8a;">
        <h3 style="margin:0; font-size: 16px;">📊 Frame 1: Network Metrics</h3>
        <p style="color: #93c5fd; font-size: 12px; margin: 6px 0 0 0;">Latency: 14ms | Throughput: 1.2 Gbps | Active Connections: 1,420</p>
      </div>
    \`,
    __title: "Network Metrics"
  };

  const frame2 = {
    __html: \`
      <div style="font-family: system-ui, sans-serif; padding: 16px; background: #09090b; color: #10b981; border-radius: 12px; border: 1px solid #065f46;">
        <h3 style="margin:0; font-size: 16px;">⚡ Frame 2: Security & Firewall Status</h3>
        <p style="color: #6ee7b7; font-size: 12px; margin: 6px 0 0 0;">Rules Active: 48 | Threats Blocked: 0 | Status: Operational</p>
      </div>
    \`,
    __title: "Security Status"
  };

  console.log("✅ Multi-frame array returned! Check the Frame Preview tab.");
  return [frame1, frame2];
}
`
  },

  // 7. Folder: 07-interactive-cli-inputs
  {
    id: 'folder-07-cli-inputs',
    name: '07-interactive-cli-inputs',
    type: 'folder',
    path: '07-interactive-cli-inputs',
    parentId: null,
    expanded: true
  },
  // 07-interactive-cli-inputs/cli-readline-interactive-demo.js
  {
    id: 'file-07-readline-demo',
    name: 'cli-readline-interactive-demo.js',
    type: 'file',
    path: '07-interactive-cli-inputs/cli-readline-interactive-demo.js',
    parentId: 'folder-07-cli-inputs',
    fileKind: 'code',
    category: 'Interactive CLI',
    code: `/**
 * @name Interactive CLI Readline Prompt Demo
 * @description Uses Node.js require('readline') to ask interactive questions at runtime! The script pauses and displays a glowing prompt in the Console until you type input and click Continue.
 * 
 * @param {string} defaultName Default User Name - default: "Commander"
 */
async function run({ defaultName }) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("🎮 Starting Interactive CLI Readline Flow...");
  console.log("-----------------------------------------------");

  // Question 1
  const name = await rl.question(\`Enter your name [default: \${defaultName}]: \`);
  const userName = name.trim() || defaultName;
  console.log(\`✅ Hello, \${userName}!\`);

  // Question 2
  const role = await rl.question("Enter your primary role (e.g. Developer, Analyst, Admin): ");
  const userRole = role.trim() || 'Developer';
  console.log(\`📋 Role set to: "\${userRole}"\`);

  // Question 3
  const targetHost = await rl.question("Enter target server hostname to audit: ");
  const host = targetHost.trim() || 'api.cloud.local';
  console.log(\`🌐 Auditing target server: \${host}...\`);

  rl.close();

  const summary = [
    { Step: 1, Field: 'User Name', Input: userName },
    { Step: 2, Field: 'Role', Input: userRole },
    { Step: 3, Field: 'Target Host', Input: host }
  ];

  console.table(summary);
  console.log("🎉 Interactive CLI session completed successfully!");

  return { userName, role: userRole, targetHost: host };
}
`
  },
  // 07-interactive-cli-inputs/cli-prompt-interactive-demo.js
  {
    id: 'file-07-prompt-demo',
    name: 'cli-prompt-interactive-demo.js',
    type: 'file',
    path: '07-interactive-cli-inputs/cli-prompt-interactive-demo.js',
    parentId: 'folder-07-cli-inputs',
    fileKind: 'code',
    category: 'Interactive CLI',
    code: `/**
 * @name Quick Prompt() Runtime Input Demo
 * @description Demonstrates standard prompt() runtime input inside worker scripts! Pauses execution, prompts for values via the Console CLI Input Bar, and resumes execution.
 */
async function run() {
  console.log("💬 Quick prompt() Runtime Input Test");
  console.log("-----------------------------------------");

  const favoriteSong = await prompt("What is your favorite song title? ");
  console.log(\`🎵 Favorite Song: "\${favoriteSong}"\`);

  const artist = await prompt("Who is the artist? ");
  console.log(\`🎤 Artist: "\${artist}"\`);

  const output = {
    favoriteSong: favoriteSong || "Blinding Lights",
    artist: artist || "The Weeknd",
    timestamp: new Date().toISOString()
  };

  console.log("Result Object:", output);
  return output;
}
`
  },

  // 8. Folder: data
  {
    id: 'folder-data',
    name: 'data',
    type: 'folder',
    path: 'data',
    parentId: null,
    expanded: true
  },
  // data/servers.csv
  {
    id: 'file-data-servers-csv',
    name: 'servers.csv',
    type: 'file',
    path: 'data/servers.csv',
    parentId: 'folder-data',
    fileKind: 'data-csv',
    sizeBytes: 380,
    category: 'Data',
    code: `IP,Hostname,Region,LatencyMs,Status
104.16.132.22,api.cloud.net,us-east,14,Online
104.16.133.45,cdn.cloud.net,us-west,28,Online
172.67.180.12,auth.cloud.net,eu-central,84,Warning
172.67.180.13,staging.cloud.net,eu-central,190,Warning
104.16.134.99,db-primary.cloud.net,us-east,8,Online
198.51.100.42,backup.cloud.net,ap-southeast,310,Maintenance
`
  },
  // data/users.json
  {
    id: 'file-data-users-json',
    name: 'users.json',
    type: 'file',
    path: 'data/users.json',
    parentId: 'folder-data',
    fileKind: 'data-json',
    sizeBytes: 320,
    category: 'Data',
    code: `[
  { "id": "usr-101", "name": "Sarah Connor", "role": "Admin", "status": "active", "loginCount": 42 },
  { "id": "usr-102", "name": "John Doe", "role": "Developer", "status": "active", "loginCount": 18 },
  { "id": "usr-103", "name": "Alice Smith", "role": "Analyst", "status": "inactive", "loginCount": 7 },
  { "id": "usr-104", "name": "Bob Vance", "role": "Developer", "status": "active", "loginCount": 29 }
]`
  },
  // data/sample-log.txt
  {
    id: 'file-data-sample-log',
    name: 'sample-log.txt',
    type: 'file',
    path: 'data/sample-log.txt',
    parentId: 'folder-data',
    fileKind: 'data-text',
    sizeBytes: 210,
    category: 'Data',
    code: `[2026-08-13 08:00:00] [INFO] System kernel initialized.
[2026-08-13 08:00:05] [INFO] Loaded virtual filesystem module.
[2026-08-13 08:00:12] [WARN] High latency detected on eu-central region.
[2026-08-13 08:00:20] [INFO] Worker sandbox runner ready.`
  }
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Master Feature & Parameter Test Suite',
    description: 'Comprehensive workspace testing all JSDoc & auto parameters, Node.js modules, Virtual FS, dynamic NPM packages, cross-script imports, visual frames, and interactive CLI input',
    nodes: INITIAL_DEMO_NODES,
    activeFileId: 'file-01-jsdoc-all'
  }
];

const STORAGE_KEY = 'js_workspace_v10_master_suite';
const ACTIVE_STATE_KEY = 'js_workspace_active_state_v2';

const DB_NAME = 'JSWorkspaceDB_v1';
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
