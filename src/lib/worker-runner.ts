import { buildWorkerDependencyLoader } from './dependency-resolver';
import { WorkspaceNode } from './workspace-store';

export interface ConsoleLogMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'table';
  data: any[];
  timestamp: string;
}

export interface FramePayload {
  type: 'html' | 'image' | 'table' | 'json';
  content: any;
  title?: string;
}

export interface ExecutionResult {
  raw: any;
  frame?: FramePayload;
  executionTimeMs: number;
}

export interface FsMutationPayload {
  action: 'write' | 'mkdir' | 'delete';
  path: string;
  content?: string;
}

export interface WorkerRunOptions {
  code: string;
  args: Record<string, any>;
  nodes?: WorkspaceNode[];
  currentFilePath?: string;
  timeoutMs?: number;
  onLog: (msg: ConsoleLogMessage) => void;
  onInputRequest?: (prompt: string) => void;
  onFsMutation?: (mutation: FsMutationPayload) => void;
  onSuccess: (result: ExecutionResult) => void;
  onError: (error: string) => void;
}

// Backslash character generated at runtime to survive Vite's template-literal optimization pass
const BS = String.fromCharCode(92);
function ws(): string { return BS + 's'; }
function star(): string { return BS + '*'; }
function lbrace(): string { return BS + '{'; }
function rbrace(): string { return BS + '}'; }
function quoteClass(): string { return "['" + '"' + "]"; }
function notQuoteClass(): string { return "[^'" + '"' + "]+"; }

/**
 * Helper: generate a worker code line that does .replace(new RegExp(...), replacement).
 * Uses JSON.stringify to guarantee correct escaping of backslashes and quotes.
 */
function workerRegexReplace(pattern: string, replacement: string, flags: string = 'g'): string {
  return '.replace(new RegExp(' + JSON.stringify(pattern) + ', ' + JSON.stringify(flags) + '), ' + JSON.stringify(replacement) + ')';
}

/**
 * Builds the onmessage handler source code using string concatenation
 * with String.fromCharCode(92) for regex patterns.
 */
function buildOnMessageHandler(): string {
  const W = ws();
  const Q = quoteClass();
  const NQ = notQuoteClass();
  const S = star();
  const LB = lbrace();
  const RB = rbrace();

  const transforms: Array<{ pattern: string; replacement: string }> = [
    { pattern: 'import' + W + '+' + S + W + '+as' + W + '+([a-zA-Z0-9_$]+)' + W + '+from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = require("$2");' },
    { pattern: 'import' + W + '+([a-zA-Z0-9_$]+)' + W + '+from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = (require("$2").default || require("$2"));' },
    { pattern: 'import' + W + '*' + LB + '([^}]+)' + RB + W + '*from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const {$1} = require("$2");' },
    { pattern: 'export' + W + '+default' + W + '+async' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1' },
    { pattern: 'export' + W + '+default' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'function $1' },
    { pattern: 'export' + W + '+default' + W + '+class' + W + '+([a-zA-Z0-9_$]+)', replacement: 'class $1' },
    { pattern: 'export' + W + '+default' + W + '+', replacement: 'var __default_export__ = ' },
    { pattern: 'export' + W + '+async' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1' },
    { pattern: 'export' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'function $1' },
    { pattern: 'export' + W + '+class' + W + '+([a-zA-Z0-9_$]+)', replacement: 'class $1' },
    { pattern: 'export' + W + '+const' + W + '+([a-zA-Z0-9_$]+)', replacement: 'const $1' },
    { pattern: 'export' + W + '+let' + W + '+([a-zA-Z0-9_$]+)', replacement: 'let $1' },
    { pattern: 'export' + W + '+var' + W + '+([a-zA-Z0-9_$]+)', replacement: 'var $1' },
  ];

  const transformLines = transforms.map(t => {
    return '          ' + workerRegexReplace(t.pattern, t.replacement);
  });

  const NL = 'String.fromCharCode(10)';

  const lines: string[] = [];
  lines.push('self.onmessage = async function(event) {');
  lines.push('  var code = event.data.code;');
  lines.push('  var args = event.data.args;');
  lines.push('  var files = event.data.files;');
  lines.push('  var currentFilePath = event.data.currentFilePath;');
  lines.push('  if (files) WORKSPACE_FILES = files;');
  lines.push('  if (currentFilePath) CURRENT_FILE_PATH = currentFilePath;');
  lines.push('  try {');
  lines.push('    var transformedCode = code');
  lines.push(transformLines.join(String.fromCharCode(10)) + ';');
  lines.push('');
  lines.push("    var scriptFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer',");
  lines.push("      'return (async () => {' + " + NL + " +");
  lines.push('      ' + JSON.stringify('if (__workspace_args__ && typeof __workspace_args__ === "object") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var argvList = ["node", typeof CURRENT_FILE_PATH !== "undefined" ? CURRENT_FILE_PATH : "script.js"];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('Object.entries(__workspace_args__).forEach(function(e) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (e[1] !== undefined && e[1] !== null && e[1] !== "") { argvList.push(String(e[1])); }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('});') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('process.argv = argvList;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push("      transformedCode + " + NL + " +");
  lines.push('      ' + JSON.stringify('if (typeof run === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await run(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push("    '})();'");
  lines.push('  );');
  lines.push('');
  lines.push('    var rawResult = await scriptFunc(args, self.require, self.workspace, self.process, self.Buffer);');
  lines.push('');
  lines.push('    var frame = null;');
  lines.push("    if (typeof rawResult === 'string') {");
  lines.push('      var trimmed = rawResult.trim();');
  lines.push("      if (trimmed.charAt(0) === '<' && (trimmed.charAt(trimmed.length - 1) === '>' || trimmed.indexOf('</') >= 0)) {");
  lines.push("        frame = { type: 'html', content: rawResult, title: 'Rendered HTML Output' };");
  lines.push("      } else if (trimmed.indexOf('data:image/') === 0 || trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0) {");
  lines.push("        frame = { type: 'image', content: rawResult, title: 'Image Frame Render' };");
  lines.push('      }');
  lines.push("    } else if (Array.isArray(rawResult) && rawResult.length > 0 && typeof rawResult[0] === 'object') {");
  lines.push("      frame = { type: 'table', content: rawResult, title: 'Structured Record Set' };");
  lines.push("    } else if (rawResult && typeof rawResult === 'object' && rawResult.__html) {");
  lines.push("      frame = { type: 'html', content: rawResult.__html, title: rawResult.__title || 'Custom Component Frame' };");
  lines.push('    }');
  lines.push('');
  lines.push("    postMessage({ type: 'COMPLETE', success: true, result: { raw: rawResult, frame: frame } });");
  lines.push('  } catch (err) {');
  lines.push("    postMessage({ type: 'COMPLETE', success: false, error: err.message || String(err) });");
  lines.push('  }');
  lines.push('};');
  return lines.join(String.fromCharCode(10));
}

export class ScriptRunner {
  private currentWorker: Worker | null = null;
  private timeoutTimer: any = null;

  public execute({
    code,
    args,
    nodes = [],
    currentFilePath = 'main.js',
    timeoutMs = 30000,
    onLog,
    onInputRequest,
    onFsMutation,
    onSuccess,
    onError
  }: WorkerRunOptions) {
    this.stop(); // Stop any currently running worker

    const startTime = performance.now();
    const dependencyLoaderCode = buildWorkerDependencyLoader(nodes, currentFilePath);
    const onMessageHandler = buildOnMessageHandler();

    // Build worker script with string concatenation — NO template literals
    const workerParts: string[] = [];
    workerParts.push(dependencyLoaderCode);
    workerParts.push('');
    workerParts.push('var formatTime = function() { return new Date().toLocaleTimeString(); };');
    workerParts.push('');
    workerParts.push('var sendLog = function(type, data) {');
    workerParts.push('  postMessage({');
    workerParts.push("    type: 'LOG',");
    workerParts.push('    logType: type,');
    workerParts.push('    timestamp: formatTime(),');
    workerParts.push('    data: data.map(function(item) {');
    workerParts.push('      if (item instanceof Error) return item.message || String(item);');
    workerParts.push("      if (typeof item === 'object') {");
    workerParts.push('        try { return JSON.parse(JSON.stringify(item)); } catch(e) { return String(item); }');
    workerParts.push('      }');
    workerParts.push('      return item;');
    workerParts.push('    })');
    workerParts.push('  });');
    workerParts.push('};');
    workerParts.push('');
    workerParts.push("console.log = function() { sendLog('log', Array.from(arguments)); };");
    workerParts.push("console.info = function() { sendLog('info', Array.from(arguments)); };");
    workerParts.push("console.warn = function() { sendLog('warn', Array.from(arguments)); };");
    workerParts.push("console.error = function() { sendLog('error', Array.from(arguments)); };");
    workerParts.push("console.table = function() { sendLog('table', Array.from(arguments)); };");
    workerParts.push('');
    workerParts.push(onMessageHandler);

    const workerScript = workerParts.join(String.fromCharCode(10));

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.currentWorker = new Worker(workerUrl);

    // Safety timeout
    this.timeoutTimer = setTimeout(() => {
      if (this.currentWorker) {
        this.stop();
        onError('Execution Timed Out after ' + (timeoutMs / 1000) + ' seconds.');
      }
    }, timeoutMs);

    this.currentWorker.onmessage = async (event: MessageEvent) => {
      const data = event.data;

      if (data.type === 'LOG') {
        onLog({
          id: Math.random().toString(36).substring(2, 9),
          type: data.logType,
          data: data.data,
          timestamp: data.timestamp
        });
      } else if (data.type === 'INPUT_REQUEST') {
        if (onInputRequest) {
          onInputRequest(data.prompt || '> ');
        }
      } else if (data.type === 'FS_MUTATION') {
        if (onFsMutation) {
          onFsMutation({
            action: data.action,
            path: data.path,
            content: data.content
          });
        }
      } else if (data.type === 'COMPLETE') {
        const executionTimeMs = Math.round(performance.now() - startTime);
        this.clearTimer();
        URL.revokeObjectURL(workerUrl);

        if (data.success) {
          onSuccess({
            raw: data.result.raw,
            frame: data.result.frame,
            executionTimeMs
          });
        } else {
          onError(data.error);
        }
      }
    };

    this.currentWorker.onerror = (err) => {
      this.clearTimer();
      URL.revokeObjectURL(workerUrl);
      onError(err.message || 'Worker runtime error during script execution');
    };

    const fileMap: Record<string, string> = {};
    nodes.forEach(n => {
      if (n.type === 'file' && n.code !== undefined) {
        fileMap[n.path] = n.code;
      }
    });

    this.currentWorker.postMessage({ code, args, files: fileMap, currentFilePath });
  }

  public sendInput(value: string) {
    if (this.currentWorker) {
      this.currentWorker.postMessage({ type: 'INPUT_RESPONSE', value });
    }
  }

  public stop() {
    this.clearTimer();
    if (this.currentWorker) {
      this.currentWorker.terminate();
      this.currentWorker = null;
    }
  }

  private clearTimer() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}
