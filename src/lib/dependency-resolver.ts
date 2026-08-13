import { WorkspaceNode } from './workspace-store';

/**
 * Normalizes relative or absolute file paths against a base directory path.
 */
export function resolveFilePath(targetPath: string, currentFilePath: string = ''): string {
  let cleanTarget = targetPath.trim().replace(/^\//, '');

  if (!cleanTarget.startsWith('.')) {
    return cleanTarget;
  }

  const currentSegments = currentFilePath ? currentFilePath.split('/') : [];
  currentSegments.pop(); // Remove filename

  const targetSegments = cleanTarget.split('/');

  for (const seg of targetSegments) {
    if (seg === '.') continue;
    if (seg === '..') {
      currentSegments.pop();
    } else {
      currentSegments.push(seg);
    }
  }

  return currentSegments.join('/');
}

// ============================================================================
// WORKER CODE GENERATION
// ============================================================================
// CRITICAL: Vite's build process converts single-quoted strings to template
// literals, which corrupts backslash escape sequences. To prevent this,
// ALL backslashes for regex patterns are generated using String.fromCharCode(92)
// at runtime so no build tool can interfere with them.
// ============================================================================

// The backslash character, generated at runtime to prevent build tool corruption
const BS = String.fromCharCode(92);

/**
 * Build a regex pattern string with proper escaping.
 * Uses runtime-generated backslash to prevent Vite from corrupting escapes.
 * The returned string, when passed to JSON.stringify, will produce a properly
 * escaped string for use in new RegExp() inside worker code.
 */
function ws(): string { return BS + 's'; }  // \s - whitespace class
function star(): string { return BS + '*'; } // \* - literal asterisk
function lbrace(): string { return BS + '{'; } // \{ - literal left brace
function rbrace(): string { return BS + '}'; } // \} - literal right brace

/**
 * Generates a line of worker code that does .replace(new RegExp(pattern), replacement).
 * Uses JSON.stringify to guarantee correct escaping.
 */
function workerRegexReplace(pattern: string, replacement: string, flags: string = 'g'): string {
  return '.replace(new RegExp(' + JSON.stringify(pattern) + ', ' + JSON.stringify(flags) + '), ' + JSON.stringify(replacement) + ')';
}

/** Quote character class for regex: matches single or double quote */
function quoteClass(): string { return "['" + '"' + "]"; }

/** Negated quote character class: matches anything except quotes */
function notQuoteClass(): string { return "[^'" + '"' + "]+"; }

/**
 * Generates the Web Worker code header containing Node.js Polyfills,
 * Virtual Filesystem, `workspace.import`, and `require()` resolution.
 *
 * All code is built via string concatenation. Backslash characters are
 * generated via String.fromCharCode(92) to survive Vite's template literal
 * optimization pass.
 */
export function buildWorkerDependencyLoader(nodes: WorkspaceNode[], currentFilePath: string): string {
  const parts: string[] = [];

  parts.push('// Node.js Core Modules & Virtual Filesystem Engine');
  parts.push('var WORKSPACE_FILES = {};');
  parts.push('var CURRENT_FILE_PATH = ' + JSON.stringify(currentFilePath) + ';');
  parts.push('var MODULE_CACHE = new Map();');
  parts.push('var CALL_STACK = new Set();');
  parts.push('');

  // 1. Path Module
  // For regex literals inside parts.push strings, we build them at runtime too
  const dblSlashRegex = '/' + BS + '/' + BS + '/+/g';  // /\/\/+/g
  const leadTrailSlashRegex = '/^' + BS + '/+|' + BS + '/+$/g'; // /^\/+|\/+$/g
  const trailingSlashRegex = '/' + BS + '/$/'; // /\/$/
  const leadSlashRegex = '/^' + BS + '//'; // /^\//

  parts.push('var pathModule = {');
  parts.push("  sep: '/',");
  parts.push('  join: function() {');
  parts.push('    var args = Array.prototype.slice.call(arguments);');
  parts.push("    return args.filter(Boolean).join('/').replace(" + dblSlashRegex + ", '/').replace(" + leadTrailSlashRegex + ", '');");
  parts.push('  },');
  parts.push('  resolve: function() {');
  parts.push('    return pathModule.join.apply(null, arguments);');
  parts.push('  },');
  parts.push('  dirname: function(p) {');
  parts.push("    var segs = String(p).replace(" + trailingSlashRegex + ", '').split('/');");
  parts.push('    segs.pop();');
  parts.push("    return segs.join('/') || '.';");
  parts.push('  },');
  parts.push('  basename: function(p, ext) {');
  parts.push("    var fname = String(p).split('/').pop() || '';");
  parts.push('    if (ext && fname.endsWith(ext)) return fname.slice(0, -ext.length);');
  parts.push('    return fname;');
  parts.push('  },');
  parts.push('  extname: function(p) {');
  parts.push('    var fname = pathModule.basename(p);');
  parts.push("    var idx = fname.lastIndexOf('.');");
  parts.push("    return idx <= 0 ? '' : fname.slice(idx);");
  parts.push('  },');
  parts.push('  normalize: function(p) {');
  parts.push('    return pathModule.join(p);');
  parts.push('  },');
  parts.push('  isAbsolute: function(p) {');
  parts.push("    return String(p).startsWith('/');");
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // 2. Buffer Module
  parts.push('function BufferModule(data) {');
  parts.push('  if (!(this instanceof BufferModule)) return new BufferModule(data);');
  parts.push('  if (data instanceof ArrayBuffer) { this._bytes = new Uint8Array(data); }');
  parts.push('  else if (data instanceof Uint8Array) { this._bytes = data; }');
  parts.push('  else { this._bytes = new Uint8Array(0); }');
  parts.push('  this.length = this._bytes.length;');
  parts.push('}');
  parts.push('BufferModule.from = function(data) {');
  parts.push("  if (typeof data === 'string') {");
  parts.push('    return new BufferModule(new TextEncoder().encode(data));');
  parts.push('  }');
  parts.push('  if (data instanceof Uint8Array) return new BufferModule(data);');
  parts.push('  if (data instanceof ArrayBuffer) return new BufferModule(new Uint8Array(data));');
  parts.push('  return new BufferModule(new Uint8Array(0));');
  parts.push('};');
  parts.push('BufferModule.alloc = function(size, fill) {');
  parts.push('  var arr = new Uint8Array(size);');
  parts.push('  if (fill) arr.fill(fill);');
  parts.push('  return new BufferModule(arr);');
  parts.push('};');
  parts.push('BufferModule.concat = function(list) {');
  parts.push('  var total = 0;');
  parts.push('  for (var i = 0; i < list.length; i++) total += (list[i]._bytes || list[i]).length;');
  parts.push('  var res = new Uint8Array(total);');
  parts.push('  var off = 0;');
  parts.push('  for (var i = 0; i < list.length; i++) {');
  parts.push('    var b = list[i]._bytes || list[i];');
  parts.push('    res.set(b, off); off += b.length;');
  parts.push('  }');
  parts.push('  return new BufferModule(res);');
  parts.push('};');
  parts.push('BufferModule.isBuffer = function(obj) {');
  parts.push('  return obj instanceof BufferModule;');
  parts.push('};');
  parts.push('BufferModule.prototype.toString = function(enc) {');
  parts.push('  return new TextDecoder().decode(this._bytes);');
  parts.push('};');
  parts.push('BufferModule.prototype.set = function(src, off) { this._bytes.set(src._bytes || src, off); };');
  parts.push('');

  // 3. Process Module
  parts.push("var _stdoutBuf = '';");
  parts.push("var _stderrBuf = '';");
  parts.push('');
  parts.push('var processModule = {');
  parts.push("  env: { NODE_ENV: 'development', WORKSPACE_ENV: 'browser-sandbox' },");
  parts.push("  argv: ['node', CURRENT_FILE_PATH],");
  parts.push("  cwd: function() { return '/'; },");
  parts.push('  exit: function(code) {');
  parts.push('    if (code === undefined) code = 0;');
  parts.push("    if (_stdoutBuf.trim()) { sendLog('log', [_stdoutBuf]); _stdoutBuf = ''; }");
  parts.push("    if (_stderrBuf.trim()) { sendLog('error', [_stderrBuf]); _stderrBuf = ''; }");
  parts.push("    if (code !== 0) { sendLog('error', ['[process.exit] Exited with code ' + code]); }");
  parts.push("    else { sendLog('info', ['[process.exit] Exited cleanly with code 0']); }");
  parts.push('  },');
  parts.push('  stdout: {');
  parts.push('    write: function(chunk) {');
  parts.push("      var str = String(chunk != null ? chunk : '');");
  parts.push('      _stdoutBuf += str;');
  parts.push('      var nl = String.fromCharCode(10);');
  parts.push('      if (_stdoutBuf.indexOf(nl) >= 0) {');
  parts.push('        var lines = _stdoutBuf.split(nl);');
  parts.push("        _stdoutBuf = lines.pop() || '';");
  parts.push('        for (var i = 0; i < lines.length; i++) {');
  parts.push("          if (lines[i]) sendLog('log', [lines[i]]);");
  parts.push('        }');
  parts.push('      }');
  parts.push('      return true;');
  parts.push('    }');
  parts.push('  },');
  parts.push('  stderr: {');
  parts.push('    write: function(chunk) {');
  parts.push("      var str = String(chunk != null ? chunk : '');");
  parts.push('      _stderrBuf += str;');
  parts.push('      var nl = String.fromCharCode(10);');
  parts.push('      if (_stderrBuf.indexOf(nl) >= 0) {');
  parts.push('        var lines = _stderrBuf.split(nl);');
  parts.push("        _stderrBuf = lines.pop() || '';");
  parts.push('        for (var i = 0; i < lines.length; i++) {');
  parts.push("          if (lines[i]) sendLog('error', [lines[i]]);");
  parts.push('        }');
  parts.push('      }');
  parts.push('      return true;');
  parts.push('    }');
  parts.push('  },');
  parts.push('  nextTick: function(fn) { var args = Array.prototype.slice.call(arguments, 1); Promise.resolve().then(function() { fn.apply(null, args); }); },');
  parts.push("  version: 'v20.11.0',");
  parts.push("  platform: 'browser',");
  parts.push("  arch: 'x64'");
  parts.push('};');
  parts.push('');

  // 4. Events Module
  parts.push('function EventEmitterModule() { this._events = {}; }');
  parts.push('EventEmitterModule.prototype.on = function(event, listener) { (this._events[event] = this._events[event] || []).push(listener); return this; };');
  parts.push('EventEmitterModule.prototype.once = function(event, listener) {');
  parts.push('  var self = this;');
  parts.push('  var g = function() { self.off(event, g); listener.apply(null, arguments); };');
  parts.push('  return this.on(event, g);');
  parts.push('};');
  parts.push('EventEmitterModule.prototype.emit = function(event) {');
  parts.push('  var list = this._events[event];');
  parts.push('  if (!list) return false;');
  parts.push('  var args = Array.prototype.slice.call(arguments, 1);');
  parts.push('  list.slice().forEach(function(fn) { fn.apply(null, args); });');
  parts.push('  return true;');
  parts.push('};');
  parts.push('EventEmitterModule.prototype.off = function(event, listener) {');
  parts.push('  if (this._events[event]) this._events[event] = this._events[event].filter(function(fn) { return fn !== listener; });');
  parts.push('  return this;');
  parts.push('};');
  parts.push('');

  // 5. Crypto Module
  parts.push('var cryptoModule = {');
  parts.push("  randomUUID: function() { return self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2); },");
  parts.push('  randomBytes: function(size) {');
  parts.push('    var arr = new Uint8Array(size);');
  parts.push('    if (self.crypto && self.crypto.getRandomValues) self.crypto.getRandomValues(arr);');
  parts.push('    return new BufferModule(arr);');
  parts.push('  },');
  parts.push('  createHash: function(algo) {');
  parts.push("    var _data = '';");
  parts.push('    var hasher = {');
  parts.push('      update: function(chunk) {');
  parts.push('        if (BufferModule.isBuffer(chunk)) { _data += chunk.toString(); }');
  parts.push('        else if (chunk instanceof Uint8Array) { _data += new TextDecoder().decode(chunk); }');
  parts.push("        else { _data += String(chunk || ''); }");
  parts.push('        return hasher;');
  parts.push('      },');
  parts.push("      digest: function(enc) {");
  parts.push("        if (!enc) enc = 'hex';");
  parts.push('        var h = 0;');
  parts.push('        for (var i = 0; i < _data.length; i++) {');
  parts.push('          h = (h << 5) - h + _data.charCodeAt(i) | 0;');
  parts.push('        }');
  parts.push("        var hex = Math.abs(h).toString(16).padStart(16, '0');");
  parts.push("        if (enc === 'hex') return hex;");
  parts.push("        if (enc === 'base64') return btoa(hex);");
  parts.push('        return BufferModule.from(hex);');
  parts.push('      }');
  parts.push('    };');
  parts.push('    return hasher;');
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // 6. Util Module
  parts.push('var utilModule = {');
  parts.push('  promisify: function(fn) { return function() { var args = Array.prototype.slice.call(arguments); return new Promise(function(res, rej) { args.push(function(e, r) { e ? rej(e) : res(r); }); fn.apply(null, args); }); }; },');
  parts.push("  inspect: function(obj) { return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj); },");
  parts.push('  format: function(fmt) { var args = Array.prototype.slice.call(arguments, 1); return String(fmt).replace(/%[sj]/g, function() { return args.shift(); }); }');
  parts.push('};');
  parts.push('');

  // 7. Virtual FS Module
  parts.push('var fsModule = {');
  parts.push("  readFileSync: function(filePath, encoding) {");
  parts.push("    if (encoding === undefined) encoding = 'utf8';");
  parts.push('    var resolved = pathModule.resolve(filePath);');
  parts.push('    var content = WORKSPACE_FILES[resolved];');
  parts.push('    if (content === undefined) {');
  parts.push("      throw new Error('ENOENT: no such file or directory, open ' + JSON.stringify(filePath));");
  parts.push('    }');
  parts.push("    if (typeof content === 'string' && content.indexOf('data:') === 0) {");
  parts.push("      var base64Data = content.split(',')[1] || '';");
  parts.push('      var binaryStr = atob(base64Data);');
  parts.push('      var len = binaryStr.length;');
  parts.push('      var bytes = new Uint8Array(len);');
  parts.push('      for (var i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);');
  parts.push('      var buf = new BufferModule(bytes);');
  parts.push('      return encoding ? buf.toString(encoding) : buf;');
  parts.push('    }');
  parts.push('    return encoding ? content : BufferModule.from(content);');
  parts.push('  },');
  parts.push("  writeFileSync: function(filePath, data, encoding) {");
  parts.push("    if (encoding === undefined) encoding = 'utf8';");
  parts.push('    var resolved = pathModule.resolve(filePath);');
  parts.push("    var strData = typeof data === 'string' ? data : new TextDecoder().decode(data._bytes || data);");
  parts.push('    WORKSPACE_FILES[resolved] = strData;');
  parts.push("    postMessage({ type: 'FS_MUTATION', action: 'write', path: resolved, content: strData });");
  parts.push('  },');
  parts.push('  readdirSync: function(dirPath) {');
  parts.push('    var resolvedDir = pathModule.resolve(dirPath);');
  parts.push("    var prefix = resolvedDir ? resolvedDir + '/' : '';");
  parts.push('    var entries = [];');
  parts.push('    Object.keys(WORKSPACE_FILES).forEach(function(fp) {');
  parts.push('      if (fp.indexOf(prefix) === 0) {');
  parts.push('        var rel = fp.slice(prefix.length);');
  parts.push("        var firstPart = rel.split('/')[0];");
  parts.push('        if (firstPart && entries.indexOf(firstPart) < 0) entries.push(firstPart);');
  parts.push('      }');
  parts.push('    });');
  parts.push('    return entries;');
  parts.push('  },');
  parts.push('  existsSync: function(filePath) {');
  parts.push('    var resolved = pathModule.resolve(filePath);');
  parts.push('    if (WORKSPACE_FILES[resolved] !== undefined) return true;');
  parts.push("    var prefix = resolved + '/';");
  parts.push('    return Object.keys(WORKSPACE_FILES).some(function(fp) { return fp.indexOf(prefix) === 0; });');
  parts.push('  },');
  parts.push('  statSync: function(filePath) {');
  parts.push('    var exists = fsModule.existsSync(filePath);');
  parts.push("    if (!exists) throw new Error('ENOENT: no such file or directory, stat ' + JSON.stringify(filePath));");
  parts.push('    var resolved = pathModule.resolve(filePath);');
  parts.push('    var isFile = WORKSPACE_FILES[resolved] !== undefined;');
  parts.push("    var content = WORKSPACE_FILES[resolved] || '';");
  parts.push('    return {');
  parts.push('      isFile: function() { return isFile; },');
  parts.push('      isDirectory: function() { return !isFile; },');
  parts.push('      size: content.length,');
  parts.push('      mtime: new Date()');
  parts.push('    };');
  parts.push('  },');
  parts.push('  mkdirSync: function(dirPath) {');
  parts.push("    postMessage({ type: 'FS_MUTATION', action: 'mkdir', path: pathModule.resolve(dirPath) });");
  parts.push('  },');
  parts.push('  unlinkSync: function(filePath) {');
  parts.push('    var resolved = pathModule.resolve(filePath);');
  parts.push('    delete WORKSPACE_FILES[resolved];');
  parts.push("    postMessage({ type: 'FS_MUTATION', action: 'delete', path: resolved });");
  parts.push('  },');
  parts.push('  promises: {');
  parts.push('    readFile: function(p, enc) { return Promise.resolve(fsModule.readFileSync(p, enc)); },');
  parts.push('    writeFile: function(p, d, enc) { return Promise.resolve(fsModule.writeFileSync(p, d, enc)); },');
  parts.push('    readdir: function(p) { return Promise.resolve(fsModule.readdirSync(p)); },');
  parts.push('    stat: function(p) { return Promise.resolve(fsModule.statSync(p)); },');
  parts.push('    mkdir: function(p) { return Promise.resolve(fsModule.mkdirSync(p)); },');
  parts.push('    unlink: function(p) { return Promise.resolve(fsModule.unlinkSync(p)); }');
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // Attach default exports for ES module interop
  parts.push('fsModule.default = fsModule;');
  parts.push('pathModule.default = pathModule;');
  parts.push('processModule.default = processModule;');
  parts.push('cryptoModule.default = cryptoModule;');
  parts.push('utilModule.default = utilModule;');
  parts.push('');

  // Global Bindings
  parts.push('self.process = processModule;');
  parts.push('self.Buffer = BufferModule;');
  parts.push('self.fs = fsModule;');
  parts.push('self.path = pathModule;');
  parts.push('self.global = self;');
  parts.push('');

  // resolvePath
  parts.push('function resolvePath(targetPath, baseFile) {');
  parts.push("  var clean = targetPath.trim().replace(" + leadSlashRegex + ", '');");
  parts.push("  if (clean.indexOf('.') !== 0) return clean;");
  parts.push("  var segments = baseFile ? baseFile.split('/') : [];");
  parts.push('  segments.pop();');
  parts.push("  var parts = clean.split('/');");
  parts.push('  for (var i = 0; i < parts.length; i++) {');
  parts.push("    if (parts[i] === '.') continue;");
  parts.push("    if (parts[i] === '..') segments.pop();");
  parts.push('    else segments.push(parts[i]);');
  parts.push('  }');
  parts.push("  return segments.join('/');");
  parts.push('}');
  parts.push('');

  // getBuiltinModule — use /^node:/ regex built at runtime too
  const nodeColonRegex = '/^node:/';
  parts.push('function getBuiltinModule(requestedPath) {');
  parts.push("  var cleanReq = String(requestedPath || '').replace(" + nodeColonRegex + ", '');");
  parts.push("  if (cleanReq === 'fs') return fsModule;");
  parts.push("  if (cleanReq === 'path') return pathModule;");
  parts.push("  if (cleanReq === 'buffer') return { Buffer: BufferModule, default: BufferModule };");
  parts.push("  if (cleanReq === 'process') return processModule;");
  parts.push("  if (cleanReq === 'events') return { EventEmitter: EventEmitterModule, default: EventEmitterModule };");
  parts.push("  if (cleanReq === 'crypto') return cryptoModule;");
  parts.push("  if (cleanReq === 'util') return utilModule;");
  parts.push('  return null;');
  parts.push('}');
  parts.push('');

  // loadWorkspaceModule — CRITICAL: build regex patterns using String.fromCharCode(92)
  const W = ws(); // \s at runtime
  const Q = quoteClass(); // ['"]
  const NQ = notQuoteClass(); // [^'"]+
  const S = star(); // \*
  const LB = lbrace(); // \{
  const RB = rbrace(); // \}

  const importTransforms: Array<{ pattern: string; replacement: string }> = [
    { pattern: 'import' + W + '+' + S + W + '+as' + W + '+([a-zA-Z0-9_$]+)' + W + '+from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = require("$2");' },
    { pattern: 'import' + W + '+([a-zA-Z0-9_$]+)' + W + '+from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = (require("$2").default || require("$2"));' },
    { pattern: 'import' + W + '*' + LB + '([^}]+)' + RB + W + '*from' + W + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const {$1} = require("$2");' },
    { pattern: 'export' + W + '+default' + W + '+async' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1() {}; exports.default = $1;' },
    { pattern: 'export' + W + '+default' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'function $1() {}; exports.default = $1;' },
    { pattern: 'export' + W + '+default' + W + '+class' + W + '+([a-zA-Z0-9_$]+)', replacement: 'class $1 {}; exports.default = $1;' },
    { pattern: 'export' + W + '+default' + W + '+', replacement: 'exports.default = ' },
    { pattern: 'export' + W + '+async' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1' },
    { pattern: 'export' + W + '+function' + W + '+([a-zA-Z0-9_$]+)', replacement: 'function $1' },
    { pattern: 'export' + W + '+class' + W + '+([a-zA-Z0-9_$]+)', replacement: 'class $1' },
    { pattern: 'export' + W + '+const' + W + '+([a-zA-Z0-9_$]+)', replacement: 'const $1' },
    { pattern: 'export' + W + '+let' + W + '+([a-zA-Z0-9_$]+)', replacement: 'let $1' },
    { pattern: 'export' + W + '+var' + W + '+([a-zA-Z0-9_$]+)', replacement: 'var $1' },
  ];

  parts.push('async function loadWorkspaceModule(requestedPath, baseFile) {');
  parts.push('  if (baseFile === undefined) baseFile = CURRENT_FILE_PATH;');
  parts.push('  var builtin = getBuiltinModule(requestedPath);');
  parts.push('  if (builtin) return builtin;');
  parts.push('');
  parts.push("  if (requestedPath.indexOf('.') !== 0 && requestedPath.indexOf('/') !== 0) {");
  parts.push("    var npmCacheKey = 'npm:' + requestedPath;");
  parts.push('    if (MODULE_CACHE.has(npmCacheKey)) return MODULE_CACHE.get(npmCacheKey);');
  // Build the emoji using String.fromCodePoint to avoid any escape issues
  const packageEmoji = String.fromCodePoint(0x1F4E6);
  parts.push("    sendLog('info', ['" + packageEmoji + " Loading NPM package ' + JSON.stringify(requestedPath) + ' dynamically via CDN (https://esm.sh/' + requestedPath + ')...']);");
  parts.push('    try {');
  parts.push("      var cdnUrl = 'https://esm.sh/' + requestedPath;");
  parts.push('      var npmModule = await import(cdnUrl);');
  parts.push('      var resolvedExports = npmModule.default !== undefined ? npmModule.default : npmModule;');
  parts.push("      if (typeof resolvedExports === 'function' || typeof resolvedExports === 'object') {");
  parts.push('        Object.assign(resolvedExports, npmModule);');
  parts.push('      }');
  parts.push('      MODULE_CACHE.set(npmCacheKey, resolvedExports);');
  parts.push('      return resolvedExports;');
  parts.push('    } catch (err) {');
  parts.push("      throw new Error('Failed to load NPM package ' + JSON.stringify(requestedPath) + ' from CDN: ' + (err.message || String(err)));");
  parts.push('    }');
  parts.push('  }');
  parts.push('');
  parts.push('  var resolvedPath = resolvePath(requestedPath, baseFile);');
  parts.push('  if (MODULE_CACHE.has(resolvedPath)) return MODULE_CACHE.get(resolvedPath);');
  parts.push('  if (CALL_STACK.has(resolvedPath)) {');
  parts.push("    throw new Error('Circular dependency detected: ' + Array.from(CALL_STACK).join(' -> ') + ' -> ' + resolvedPath);");
  parts.push('  }');
  parts.push('');
  parts.push('  var scriptCode = WORKSPACE_FILES[resolvedPath];');
  parts.push('  if (scriptCode === undefined) {');
  parts.push("    var available = Object.keys(WORKSPACE_FILES).join(', ');");
  parts.push("    throw new Error('Module not found: ' + JSON.stringify(requestedPath) + ' (resolved as ' + JSON.stringify(resolvedPath) + '). Available files: ' + available);");
  parts.push('  }');
  parts.push('');
  parts.push('  CALL_STACK.add(resolvedPath);');
  parts.push('  var moduleObj = { exports: {} };');
  parts.push('  var exportsObj = moduleObj.exports;');
  parts.push('');

  // Build the transform chain using workerRegexReplace with JSON.stringify
  let transformChain = '  var transformedCode = scriptCode';
  for (const t of importTransforms) {
    transformChain += String.fromCharCode(10) + '    ' + workerRegexReplace(t.pattern, t.replacement);
  }
  transformChain += ';';
  parts.push(transformChain);
  parts.push('');

  // Export binding extraction
  const exportFuncPattern = 'export' + W + '+(?:async' + W + '+)?function' + W + '+([a-zA-Z0-9_$]+)';
  const exportClassPattern = 'export' + W + '+class' + W + '+([a-zA-Z0-9_$]+)';
  const exportVarPattern = 'export' + W + '+(?:const|let|var)' + W + '+([a-zA-Z0-9_$]+)';

  parts.push('  var _rawSrc = scriptCode;');
  parts.push('  var _exportFuncRe = new RegExp(' + JSON.stringify(exportFuncPattern) + ', "g");');
  parts.push('  var _m;');
  parts.push('  while ((_m = _exportFuncRe.exec(_rawSrc)) !== null) {');
  parts.push('    transformedCode += String.fromCharCode(10) + "exports." + _m[1] + " = " + _m[1] + ";";');
  parts.push('  }');
  parts.push('  var _exportClassRe = new RegExp(' + JSON.stringify(exportClassPattern) + ', "g");');
  parts.push('  while ((_m = _exportClassRe.exec(_rawSrc)) !== null) {');
  parts.push('    transformedCode += String.fromCharCode(10) + "exports." + _m[1] + " = " + _m[1] + ";";');
  parts.push('  }');
  parts.push('  var _exportVarRe = new RegExp(' + JSON.stringify(exportVarPattern) + ', "g");');
  parts.push('  while ((_m = _exportVarRe.exec(_rawSrc)) !== null) {');
  parts.push('    transformedCode += String.fromCharCode(10) + "exports." + _m[1] + " = " + _m[1] + ";";');
  parts.push('  }');
  parts.push('');

  // evalFunc — the new Function body is built by string concatenation in the worker
  const NL = 'String.fromCharCode(10)';
  parts.push("  var evalFunc = new Function('module', 'exports', 'require', 'workspace', 'process', 'Buffer',");
  parts.push("    'return (async () => {' + " + NL + " +");
  parts.push("      transformedCode + " + NL + " +");
  parts.push('      ' + JSON.stringify('if (typeof run === "function" && !exports.run) {') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('exports.run = run;') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('return module.exports;') + ' + ' + NL + ' +');
  parts.push("    '})();'");
  parts.push('  );');
  parts.push('');

  parts.push('  var scopedRequire = function(path) {');
  parts.push('    var b = getBuiltinModule(path);');
  parts.push('    if (b) return b;');
  parts.push('    var resolved = resolvePath(path, resolvedPath);');
  parts.push('    if (MODULE_CACHE.has(resolved)) return MODULE_CACHE.get(resolved);');
  parts.push("    if (MODULE_CACHE.has('npm:' + path)) return MODULE_CACHE.get('npm:' + path);");
  parts.push('    return loadWorkspaceModule(path, resolvedPath);');
  parts.push('  };');
  parts.push('  var scopedWorkspace = {');
  parts.push('    import: function(path) { return loadWorkspaceModule(path, resolvedPath); },');
  parts.push('    runScript: async function(path, args) {');
  parts.push('      if (!args) args = {};');
  parts.push('      var mod = await loadWorkspaceModule(path, resolvedPath);');
  parts.push("      if (typeof mod.run === 'function') return mod.run(args);");
  parts.push("      if (typeof mod.default === 'function') return mod.default(args);");
  parts.push("      throw new Error('Script ' + JSON.stringify(path) + ' does not export a run(args) or default function!');");
  parts.push('    }');
  parts.push('  };');
  parts.push('');
  parts.push('  var resultExports = await evalFunc(moduleObj, exportsObj, scopedRequire, scopedWorkspace, processModule, BufferModule);');
  parts.push('  CALL_STACK.delete(resolvedPath);');
  parts.push('  MODULE_CACHE.set(resolvedPath, resultExports);');
  parts.push('  return resultExports;');
  parts.push('}');
  parts.push('');

  // Global require & workspace
  parts.push('self.require = function(path) {');
  parts.push('  var builtin = getBuiltinModule(path);');
  parts.push('  if (builtin) return builtin;');
  parts.push('  var resolved = resolvePath(path, CURRENT_FILE_PATH);');
  parts.push('  if (MODULE_CACHE.has(resolved)) return MODULE_CACHE.get(resolved);');
  parts.push("  if (MODULE_CACHE.has('npm:' + path)) return MODULE_CACHE.get('npm:' + path);");
  parts.push('  return loadWorkspaceModule(path, CURRENT_FILE_PATH);');
  parts.push('};');
  parts.push('self.workspace = {');
  parts.push('  import: function(path) { return loadWorkspaceModule(path, CURRENT_FILE_PATH); },');
  parts.push('  runScript: async function(path, args) {');
  parts.push('    if (!args) args = {};');
  parts.push('    var mod = await loadWorkspaceModule(path, CURRENT_FILE_PATH);');
  parts.push("    if (typeof mod.run === 'function') return mod.run(args);");
  parts.push("    if (typeof mod.default === 'function') return mod.default(args);");
  parts.push("    throw new Error('Script ' + JSON.stringify(path) + ' does not export a run(args) or default function!');");
  parts.push('  }');
  parts.push('};');
  parts.push('');

  return parts.join(String.fromCharCode(10));
}
