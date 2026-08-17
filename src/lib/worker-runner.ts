import { buildWorkerDependencyLoader } from './dependency-resolver';
import { WorkspaceNode } from './workspace-store';

export interface ConsoleLogMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'table';
  data: unknown[];
  timestamp: string;
}

export interface FramePayload {
  type: 'html' | 'image' | 'table' | 'json';
  content: unknown;
  title?: string;
}

export interface ExecutionResult {
  raw: unknown;
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
  args: Record<string, unknown>;
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
export function buildOnMessageHandler(): string {
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
  lines.push('  if (event.data && event.data.type === "INPUT_RESPONSE") return;');
  lines.push('  var code = (event.data && event.data.code != null) ? event.data.code : "";');
  lines.push('  if (!code) return;');
  lines.push('  var args = event.data.args;');
  lines.push('  var currentFilePath = (event.data && event.data.currentFilePath) ? event.data.currentFilePath : "main.js";');
  lines.push('  var files = event.data.files;');
  lines.push('  if (files) WORKSPACE_FILES = files;');
  lines.push('  CURRENT_FILE_PATH = currentFilePath;');
  lines.push('  var __filename = currentFilePath;');
  lines.push('  var __dirname = currentFilePath.indexOf("/") >= 0 ? currentFilePath.substring(0, currentFilePath.lastIndexOf("/")) : ".";');
  lines.push('  var dirname = __dirname;');
  lines.push('  var filename = __filename;');
  lines.push('  self.__filename = __filename;');
  lines.push('  self.__dirname = __dirname;');
  lines.push('  self.dirname = dirname;');
  lines.push('  self.filename = filename;');
  lines.push('  var global = (typeof globalThis !== "undefined") ? globalThis : self;');
  lines.push('  self.global = global;');
  lines.push('  var module = { exports: {}, id: currentFilePath, filename: currentFilePath, path: __dirname, paths: [], loaded: false, children: [] };');
  lines.push('  var exports = module.exports;');
  lines.push('  if (self.require) { self.require.main = module; }');
  lines.push('  try {');
  lines.push('    var transformedCode = code');
  lines.push(transformLines.join(String.fromCharCode(10)) + ';');
  lines.push('');
  lines.push("    var scriptFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global', '__code_source__',");
  lines.push("      'return (async () => {' + " + NL + " +");
  lines.push('      ' + JSON.stringify('if (__workspace_args__ && typeof __workspace_args__ === "object") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var argvList = ["node", typeof CURRENT_FILE_PATH !== "undefined" ? CURRENT_FILE_PATH : "script.js"];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('Object.entries(__workspace_args__).forEach(function(e) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (e[1] !== undefined && e[1] !== null && e[1] !== "") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  if (typeof e[1] === "boolean") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (e[1] === true) { argvList.push("--" + e[0].replace(/([A-Z])/g, "-$1").toLowerCase()); }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  } else {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    argvList.push(String(e[1]));') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('});') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('process.argv = argvList;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push("      transformedCode + " + NL + " +");
  lines.push('      ' + JSON.stringify('if (typeof run === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await run(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof main === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await main(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof execute === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await execute(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof start === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await start(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof handler === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await handler(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof module.exports === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await module.exports(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (module.exports && typeof module.exports.run === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await module.exports.run(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (module.exports && typeof module.exports.main === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await module.exports.main(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (module.exports && typeof module.exports.default === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await module.exports.default(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof exports.run === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await exports.run(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof exports.main === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await exports.main(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof exports.default === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return await exports.default(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof __default_export__ !== "undefined") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (typeof __default_export__ === "function") return await __default_export__(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return __default_export__;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (module.exports && (typeof module.exports !== "object" || Object.keys(module.exports).length > 0)) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return module.exports;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('function __safeEvalValue(val) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  if (typeof val === "string") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    var t = val.trim();') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (!t) return val;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (/^-?\\d+n$/.test(t)) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      try { return BigInt(t.slice(0, -1)); } catch(e) {}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (/^0x[0-9a-fA-F]+$/i.test(t) || /^0b[01]+$/i.test(t) || /^0o[0-7]+$/i.test(t)) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      try { return Number(t); } catch(e) {}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      try { return JSON.parse(val); } catch(e) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        try { var fixed = val.replace(/([a-zA-Z0-9_$]+)\\s*:/g, \'"$1":\').replace(/\'/g, \'"\'); return JSON.parse(fixed); } catch(e2) {}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (/^(?:Symbol|new\\s+(?:Uint8Array|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigInt64Array|BigUint64Array|Uint8ClampedArray|ArrayBuffer|Set|Map|WeakSet|WeakMap|Date|RegExp|Error)|Buffer\\.from)\\b/.test(t)) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      try { var evalFunc = new Function("Buffer", "return (" + t + ");"); var b = typeof Buffer !== "undefined" ? Buffer : (typeof self !== "undefined" && self.Buffer ? self.Buffer : null); return evalFunc(b); } catch(e) {}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  return val;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (__workspace_args__ && typeof __workspace_args__ === "object") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  Object.keys(__workspace_args__).forEach(function(k) { __workspace_args__[k] = __safeEvalValue(__workspace_args__[k]); });') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var __autoResults__ = {};') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var __fnNames__ = [];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var __rawCodeStr = (typeof __code_source__ === "string") ? __code_source__ : "";') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var __fnRegex__ = /(?:^|\\n)\\s*(?:async\\s+)?function(?:\\s*\\*)?\\s*([a-zA-Z0-9_$]+)/g;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('var __fnMatch__;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('while ((__fnMatch__ = __fnRegex__.exec(__rawCodeStr)) !== null) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  if (__fnMatch__[1] && __fnNames__.indexOf(__fnMatch__[1]) === -1) { __fnNames__.push(__fnMatch__[1]); }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('for (var f = 0; f < __fnNames__.length; f++) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  var fnName = __fnNames__[f];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  var fn = null;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  try {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    fn = eval(fnName);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  } catch(e) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    continue;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  if (typeof fn !== "function") continue;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  try {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    var fnStr = fn.toString();') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    var isDestructured = /^[^(]*\\(\\s*\\{/.test(fnStr);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    var res;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (isDestructured) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      res = await fn(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    } else {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      var paramNames = [];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      var paramMatch = fnStr.match(/^[^(]*\\(([^)]*)\\)/);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      if (paramMatch && paramMatch[1]) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        var rawParams = paramMatch[1].split(",");') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        for (var p = 0; p < rawParams.length; p++) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('          var pName = rawParams[p].split("=")[0].trim().replace(/^\\.\\.\\./, "");') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('          if (pName) paramNames.push(pName);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      if (paramNames.length > 0 && __workspace_args__ && typeof __workspace_args__ === "object") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        var callArgs = paramNames.map(function(k) { return __safeEvalValue(__workspace_args__[k]); });') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        res = await fn.apply(null, callArgs);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      } else {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('        res = await fn(__workspace_args__);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    if (res && typeof res.next === "function" && typeof res[Symbol.iterator] === "function") {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      var genItems = [];') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      var step;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      while (!(step = res.next()).done) { genItems.push(step.value); }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      __autoResults__[fnName] = genItems;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    } else {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('      __autoResults__[fnName] = res;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  } catch(e) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('    console.error("Error executing " + fnName + ":", e.message);') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  }') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (Object.keys(__autoResults__).length > 0) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('  return __autoResults__;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('if (exports && (typeof exports !== "object" || Object.keys(exports).length > 0)) {') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('return exports;') + ' + ' + NL + ' +');
  lines.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  lines.push("    '})();'");
  lines.push('  );');
  lines.push('');
  lines.push('    var rawResult = await scriptFunc(args, self.require, self.workspace, self.process, self.Buffer, __dirname, __filename, dirname, filename, module, exports, global, transformedCode);');
  lines.push('');
  lines.push('    var frame = null;');
  lines.push("    if (typeof rawResult === 'string') {");
  lines.push('      var trimmed = rawResult.trim();');
  lines.push("      if (trimmed.charAt(0) === '<' && (trimmed.charAt(trimmed.length - 1) === '>' || trimmed.indexOf('</') >= 0)) {");
  lines.push("        frame = { type: 'html', content: rawResult, title: 'Rendered HTML Output' };");
  lines.push("      } else if (trimmed.indexOf('data:image/') === 0 || trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0) {");
  lines.push("        frame = { type: 'image', content: rawResult, title: 'Image Frame Render' };");
  lines.push('      }');
  lines.push("    } else if (Array.isArray(rawResult) && rawResult.length > 0) {");
  lines.push("      var isHtmlList = rawResult.every(function(item) {");
  lines.push("        return (typeof item === 'string' && item.trim().charAt(0) === '<') || (item && typeof item === 'object' && item.__html);");
  lines.push("      });");
  lines.push("      if (isHtmlList) {");
  lines.push("        var joinedHtml = rawResult.map(function(item) {");
  lines.push("          return typeof item === 'string' ? item : item.__html;");
  lines.push("        }).join('<hr style=\"border:0; border-top:1px dashed #3f3f46; margin:24px 0;\"/>');");
  lines.push("        frame = { type: 'html', content: joinedHtml, title: 'Multi-Frame Stream (' + rawResult.length + ' components)' };");
  lines.push("      } else if (typeof rawResult[0] === 'object') {");
  lines.push("        frame = { type: 'table', content: rawResult, title: 'Structured Record Set' };");
  lines.push("      }");
  lines.push("    } else if (rawResult && typeof rawResult === 'object' && rawResult.__html) {");
  lines.push("      frame = { type: 'html', content: rawResult.__html, title: rawResult.__title || 'Custom Component Frame' };");
  lines.push("    }");
  lines.push("    if (!frame && self.document && self.document.body && self.document.body.innerHTML) {");
  lines.push("      frame = { type: 'html', content: self.document.body.innerHTML, title: 'Document DOM Frame' };");
  lines.push("    }");
  lines.push('');
  lines.push("    var safeRawResult = (typeof safeCloneForPostMessage === 'function') ? safeCloneForPostMessage(rawResult) : rawResult;");
  lines.push("    postMessage({ type: 'COMPLETE', success: true, result: { raw: safeRawResult, frame: frame } });");
  lines.push('  } catch (err) {');
  lines.push("    postMessage({ type: 'COMPLETE', success: false, error: err.message || String(err) });");
  lines.push('  }');
  lines.push('};');
  return lines.join(String.fromCharCode(10));
}

export class ScriptRunner {
  private currentWorker: Worker | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

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
    workerParts.push('var safeCloneForPostMessage = function(val, seen, depth) {');
    workerParts.push('  if (depth === undefined) depth = 0;');
    workerParts.push('  if (depth > 20) return "[Max Depth Reached]";');
    workerParts.push('  if (val === null || val === undefined) return val;');
    workerParts.push('  var t = typeof val;');
    workerParts.push('  if (t === "number" || t === "string" || t === "boolean" || t === "bigint") return val;');
    workerParts.push('  if (t === "function") return "[Function: " + (val.name || "anonymous") + "]";');
    workerParts.push('  if (t === "symbol") return val.toString();');
    workerParts.push('  if (seen === undefined) seen = new Set();');
    workerParts.push('  if (typeof val === "object") {');
    workerParts.push('    if (seen.has(val)) return "[Circular Reference]";');
    workerParts.push('    seen.add(val);');
    workerParts.push('  }');
    workerParts.push('  if (val instanceof Error) {');
    workerParts.push('    return { name: val.name, message: val.message, stack: val.stack };');
    workerParts.push('  }');
    workerParts.push('  if (val instanceof Date) return val.toISOString();');
    workerParts.push('  if (val instanceof RegExp) return val.toString();');
    workerParts.push('  if (val instanceof Uint8Array || val instanceof ArrayBuffer) return val;');
    workerParts.push('  if (Array.isArray(val)) {');
    workerParts.push('    var arrOut = [];');
    workerParts.push('    for (var i = 0; i < val.length; i++) {');
    workerParts.push('      arrOut.push(safeCloneForPostMessage(val[i], seen, depth + 1));');
    workerParts.push('    }');
    workerParts.push('    return arrOut;');
    workerParts.push('  }');
    workerParts.push('  if (typeof val === "object") {');
    workerParts.push('    var objOut = {};');
    workerParts.push('    var keys = Object.keys(val);');
    workerParts.push('    for (var k = 0; k < keys.length; k++) {');
    workerParts.push('      var key = keys[k];');
    workerParts.push('      try {');
    workerParts.push('        objOut[key] = safeCloneForPostMessage(val[key], seen, depth + 1);');
    workerParts.push('      } catch(e) {');
    workerParts.push('        objOut[key] = "[Unserializable Property]";');
    workerParts.push('      }');
    workerParts.push('    }');
    workerParts.push('    return objOut;');
    workerParts.push('  }');
    workerParts.push('  return String(val);');
    workerParts.push('};');
    workerParts.push('');
    workerParts.push('var sendLog = function(type, data) {');
    workerParts.push('  postMessage({');
    workerParts.push("    type: 'LOG',");
    workerParts.push('    logType: type,');
    workerParts.push('    timestamp: formatTime(),');
    workerParts.push('    data: data.map(function(item) {');
    workerParts.push('      return safeCloneForPostMessage(item);');
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
