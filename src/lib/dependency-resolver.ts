import { WorkspaceNode } from './workspace-store';

/**
 * Normalizes relative or absolute file paths against a base directory path.
 */
export function resolveFilePath(targetPath: string, currentFilePath: string = ''): string {
  const cleanTarget = targetPath.trim().replace(/^\//, '');

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
  const workspaceFilesMap: Record<string, string> = {};
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node && node.type === 'file' && node.path) {
        workspaceFilesMap[node.path] = node.code || '';
      }
    }
  }

  parts.push('// Node.js Core Modules & Virtual Filesystem Engine');
  parts.push('var WORKSPACE_FILES = ' + JSON.stringify(workspaceFilesMap) + ';');
  parts.push('var CURRENT_FILE_PATH = ' + JSON.stringify(currentFilePath) + ';');
  parts.push('var __filename = CURRENT_FILE_PATH;');
  parts.push('var __dirname = CURRENT_FILE_PATH.indexOf("/") >= 0 ? CURRENT_FILE_PATH.substring(0, CURRENT_FILE_PATH.lastIndexOf("/")) : ".";');
  parts.push('var dirname = __dirname;');
  parts.push('var filename = __filename;');
  parts.push('self.__filename = __filename;');
  parts.push('self.__dirname = __dirname;');
  parts.push('self.dirname = dirname;');
  parts.push('self.filename = filename;');
  parts.push('if (typeof global === "undefined") {');
  parts.push('  self.global = self;');
  parts.push('  globalThis.global = globalThis;');
  parts.push('}');
  parts.push('if (typeof setImmediate === "undefined") {');
  parts.push('  self.setImmediate = function(fn) { var args = Array.prototype.slice.call(arguments, 1); return setTimeout(function() { fn.apply(null, args); }, 0); };');
  parts.push('  self.clearImmediate = function(id) { clearTimeout(id); };');
  parts.push('  globalThis.setImmediate = self.setImmediate;');
  parts.push('  globalThis.clearImmediate = self.clearImmediate;');
  parts.push('}');
  parts.push('var MODULE_CACHE = new Map();');
  parts.push('var CALL_STACK = new Set();');
  parts.push('if (typeof SharedArrayBuffer === "undefined") {');
  parts.push('  self.SharedArrayBuffer = ArrayBuffer;');
  parts.push('  globalThis.SharedArrayBuffer = ArrayBuffer;');
  parts.push('}');
  parts.push('');

  // 1. Path Module
  const trailingSlashRegex = '/' + BS + '/$/'; // /\/$/
  const leadSlashRegex = '/^' + BS + '//'; // /^\//

  parts.push('function md5(str) {');
  parts.push('  function rL(v, s) { return (v << s) | (v >>> (32 - s)); }');
  parts.push('  function aU(x, y) {');
  parts.push('    var x8 = x & 0x80000000, y8 = y & 0x80000000, x4 = x & 0x40000000, y4 = y & 0x40000000, r = (x & 0x3fffffff) + (y & 0x3fffffff);');
  parts.push('    if (x4 & y4) return r ^ 0x80000000 ^ x8 ^ y8;');
  parts.push('    if (x4 | y4) { return (r & 0x40000000) ? r ^ 0xc0000000 ^ x8 ^ y8 : r ^ 0x40000000 ^ x8 ^ y8; }');
  parts.push('    return r ^ x8 ^ y8;');
  parts.push('  }');
  parts.push('  function F(x, y, z) { return (x & y) | (~x & z); }');
  parts.push('  function G(x, y, z) { return (x & z) | (y & ~z); }');
  parts.push('  function H(x, y, z) { return x ^ y ^ z; }');
  parts.push('  function I(x, y, z) { return y ^ (x | ~z); }');
  parts.push('  function FF(a, b, c, d, x, s, ac) { return aU(rL(aU(aU(a, F(b, c, d)), aU(x, ac)), s), b); }');
  parts.push('  function GG(a, b, c, d, x, s, ac) { return aU(rL(aU(aU(a, G(b, c, d)), aU(x, ac)), s), b); }');
  parts.push('  function HH(a, b, c, d, x, s, ac) { return aU(rL(aU(aU(a, H(b, c, d)), aU(x, ac)), s), b); }');
  parts.push('  function II(a, b, c, d, x, s, ac) { return aU(rL(aU(aU(a, I(b, c, d)), aU(x, ac)), s), b); }');
  parts.push('  var len = str.length, n = (len + 8 >> 6) + 1, w = Array(n * 16);');
  parts.push('  for (var i = 0; i < n * 16; i++) w[i] = 0;');
  parts.push('  for (var i = 0; i < len; i++) w[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);');
  parts.push('  w[len >> 2] |= 0x80 << ((len % 4) * 8); w[n * 16 - 2] = len * 8;');
  parts.push('  var a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;');
  parts.push('  for (var i = 0; i < w.length; i += 16) {');
  parts.push('    var A = a, B = b, C = c, D = d;');
  parts.push('    a = FF(a,b,c,d,w[i+0],7,0xd76aa478); d = FF(d,a,b,c,w[i+1],12,0xe8c7b756); c = FF(c,d,a,b,w[i+2],17,0x242070db); b = FF(b,c,d,a,w[i+3],22,0xc1bdceee);');
  parts.push('    a = FF(a,b,c,d,w[i+4],7,0xf57c0faf); d = FF(d,a,b,c,w[i+5],12,0x4787c62a); c = FF(c,d,a,b,w[i+6],17,0xa8304613); b = FF(b,c,d,a,w[i+7],22,0xfd469501);');
  parts.push('    a = FF(a,b,c,d,w[i+8],7,0x698098d8); d = FF(d,a,b,c,w[i+9],12,0x8b44f7af); c = FF(c,d,a,b,w[i+10],17,0xffff5bb1); b = FF(b,c,d,a,w[i+11],22,0x895cd7be);');
  parts.push('    a = FF(a,b,c,d,w[i+12],7,0x6b901122); d = FF(d,a,b,c,w[i+13],12,0xfd987193); c = FF(c,d,a,b,w[i+14],17,0xa679438e); b = FF(b,c,d,a,w[i+15],22,0x49b40821);');
  parts.push('    a = GG(a,b,c,d,w[i+1],5,0xf61e2562); d = GG(d,a,b,c,w[i+6],9,0xc040b340); c = GG(c,d,a,b,w[i+11],14,0x265e5a51); b = GG(b,c,d,a,w[i+0],20,0xe9b6c7aa);');
  parts.push('    a = GG(a,b,c,d,w[i+5],5,0xd62f105d); d = GG(d,a,b,c,w[i+10],9,0x02441453); c = GG(c,d,a,b,w[i+15],14,0xd8a1e681); b = GG(b,c,d,a,w[i+4],20,0xe7d3fbc8);');
  parts.push('    a = GG(a,b,c,d,w[i+9],5,0x21e1cde6); d = GG(d,a,b,c,w[i+14],9,0xc33707d6); c = GG(c,d,a,b,w[i+3],14,0xf4d50d87); b = GG(b,c,d,a,w[i+8],20,0x455a14ed);');
  parts.push('    a = GG(a,b,c,d,w[i+13],5,0xa9e3e905); d = GG(d,a,b,c,w[i+2],9,0xfcefa3f8); c = GG(c,d,a,b,w[i+7],14,0x676f02d9); b = GG(b,c,d,a,w[i+12],20,0x8d2a4c8a);');
  parts.push('    a = HH(a,b,c,d,w[i+5],4,0xfffa3942); d = HH(d,a,b,c,w[i+8],11,0x8771f681); c = HH(c,d,a,b,w[i+11],16,0x6d9d6122); b = HH(b,c,d,a,w[i+14],23,0xfde5380c);');
  parts.push('    a = HH(a,b,c,d,w[i+1],4,0xa4beea44); d = HH(d,a,b,c,w[i+4],11,0x4bdecfa9); c = HH(c,d,a,b,w[i+7],16,0xf6bb4b60); b = HH(b,c,d,a,w[i+10],23,0xbebfbc70);');
  parts.push('    a = HH(a,b,c,d,w[i+13],4,0x289b7ec6); d = HH(d,a,b,c,w[i+0],11,0xeaa127fa); c = HH(c,d,a,b,w[i+3],16,0xd4ef3085); b = HH(b,c,d,a,w[i+6],23,0x04881d05);');
  parts.push('    a = HH(a,b,c,d,w[i+9],4,0xd9d4d039); d = HH(d,a,b,c,w[i+12],11,0xe6db99e5); c = HH(c,d,a,b,w[i+15],16,0x1fa27cf8); b = HH(b,c,d,a,w[i+2],23,0xc4ac5665);');
  parts.push('    a = II(a,b,c,d,w[i+0],6,0xf4292244); d = II(d,a,b,c,w[i+7],10,0x432aff97); c = II(c,d,a,b,w[i+14],15,0xab9423a7); b = II(b,c,d,a,w[i+5],21,0xfc93a039);');
  parts.push('    a = II(a,b,c,d,w[i+12],6,0x655b59c3); d = II(d,a,b,c,w[i+3],10,0x8f0ccc92); c = II(c,d,a,b,w[i+10],15,0xffeff47d); b = II(b,c,d,a,w[i+1],21,0x85845dd1);');
  parts.push('    a = II(a,b,c,d,w[i+8],6,0x6fa87e4f); d = II(d,a,b,c,w[i+15],10,0xfe2ce6e0); c = II(c,d,a,b,w[i+6],15,0xa3014314); b = II(b,c,d,a,w[i+13],21,0x4e0811a1);');
  parts.push('    a = II(a,b,c,d,w[i+4],6,0xf7537e82); d = II(d,a,b,c,w[i+11],10,0xbd3af235); c = II(c,d,a,b,w[i+2],15,0x2ad7d2bb); b = II(b,c,d,a,w[i+9],21,0xeb86d391);');
  parts.push('    a = aU(a, A); b = aU(b, B); c = aU(c, C); d = aU(d, D);');
  parts.push('  }');
  parts.push('  function w2h(v) { var s = ""; for (var j = 0; j < 4; j++) { var b = (v >>> (j * 8)) & 255; s += ("0" + b.toString(16)).slice(-2); } return s; }');
  parts.push('  return (w2h(a) + w2h(b) + w2h(c) + w2h(d)).toLowerCase();');
  parts.push('}');
  parts.push('');
  parts.push('var pathModule = {');
  parts.push("  sep: '/',");
  parts.push('  normalize: function(p) {');
  parts.push("    var str = String(p || ''); if (!str) return '.';");
  parts.push('    var isAbs = str.charCodeAt(0) === 47;');
  parts.push("    var parts = str.split('/'); var stack = [];");
  parts.push('    for (var i = 0; i < parts.length; i++) {');
  parts.push('      var part = parts[i];');
  parts.push("      if (!part || part === '.') continue;");
  parts.push("      if (part === '..') { if (stack.length > 0) stack.pop(); }");
  parts.push('      else { stack.push(part); }');
  parts.push('    }');
  parts.push("    var res = stack.join('/');");
  parts.push("    if (isAbs) return '/' + res;");
  parts.push("    return res || '.';");
  parts.push('  },');
  parts.push('  join: function() {');
  parts.push('    var args = Array.prototype.slice.call(arguments);');
  parts.push("    return pathModule.normalize(args.filter(Boolean).join('/'));");
  parts.push('  },');
  parts.push('  resolve: function() { return pathModule.join.apply(null, arguments); },');
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
  parts.push("  isAbsolute: function(p) { return String(p).charCodeAt(0) === 47; }");
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
  parts.push('BufferModule.from = function(data, enc) {');
  parts.push("  if (typeof data === 'string') {");
  parts.push("    if (enc === 'base64') {");
  parts.push('      var bStr = atob(data); var bytes = new Uint8Array(bStr.length);');
  parts.push('      for (var i = 0; i < bStr.length; i++) bytes[i] = bStr.charCodeAt(i);');
  parts.push('      return new BufferModule(bytes);');
  parts.push('    }');
  parts.push("    if (enc === 'hex') {");
  parts.push('      var bytes = new Uint8Array(data.length / 2);');
  parts.push('      for (var i = 0; i < data.length; i += 2) bytes[i / 2] = parseInt(data.substr(i, 2), 16);');
  parts.push('      return new BufferModule(bytes);');
  parts.push('    }');
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
  parts.push('BufferModule.isBuffer = function(obj) { return obj instanceof BufferModule; };');
  parts.push('BufferModule.prototype.toString = function(enc) {');
  parts.push("  if (enc === 'base64') {");
  parts.push("    var binary = ''; var len = this._bytes.length;");
  parts.push('    for (var i = 0; i < len; i++) binary += String.fromCharCode(this._bytes[i]);');
  parts.push('    return btoa(binary);');
  parts.push('  }');
  parts.push("  if (enc === 'hex') {");
  parts.push("    var hex = '';");
  parts.push("    for (var i = 0; i < this._bytes.length; i++) hex += this._bytes[i].toString(16).padStart(2, '0');");
  parts.push('    return hex;');
  parts.push('  }');
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
  parts.push('EventEmitterModule.EventEmitter = EventEmitterModule;');
  parts.push('EventEmitterModule.default = EventEmitterModule;');
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

  // 4.1 Process Stdin & User Input Engine
  parts.push('processModule.stdin = new EventEmitterModule();');
  parts.push('processModule.stdin.setEncoding = function() { return processModule.stdin; };');
  parts.push('processModule.stdin.resume = function() { return processModule.stdin; };');
  parts.push('processModule.stdin.pause = function() { return processModule.stdin; };');
  parts.push('');
  parts.push('var _pendingInputResolvers = [];');
  parts.push('function requestUserInput(promptMsg) {');
  parts.push("  if (!promptMsg) promptMsg = '> ';");
  parts.push("  postMessage({ type: 'INPUT_REQUEST', prompt: promptMsg });");
  parts.push('  return new Promise(function(resolve) {');
  parts.push('    _pendingInputResolvers.push(resolve);');
  parts.push('  });');
  parts.push('}');
  parts.push('');
  parts.push("self.addEventListener('message', function(ev) {");
  parts.push("  if (ev.data && ev.data.type === 'INPUT_RESPONSE') {");
  parts.push("    var val = String(ev.data.value != null ? ev.data.value : '');");
  parts.push('    if (processModule && processModule.stdin) {');
  parts.push("      processModule.stdin.emit('data', BufferModule.from(val + String.fromCharCode(10)));");
  parts.push("      processModule.stdin.emit('line', val);");
  parts.push('    }');
  parts.push('    if (_pendingInputResolvers.length > 0) {');
  parts.push('      var resolver = _pendingInputResolvers.shift();');
  parts.push('      if (resolver) resolver(val);');
  parts.push('    }');
  parts.push('  }');
  parts.push('});');
  parts.push('');
  parts.push('self.prompt = function(msg) { return requestUserInput(msg); };');
  parts.push('');
  parts.push('var readlineModule = {');
  parts.push('  createInterface: function(opts) {');
  parts.push('    var rl = new EventEmitterModule();');
  parts.push('    rl.question = function(query, cb) {');
  parts.push('      var p = requestUserInput(query).then(function(answer) {');
  parts.push("        if (typeof cb === 'function') cb(answer);");
  parts.push('        return answer;');
  parts.push('      });');
  parts.push('      return p;');
  parts.push('    };');
  parts.push('    rl.close = function() {};');
  parts.push('    if (processModule && processModule.stdin) {');
  parts.push("      processModule.stdin.on('line', function(line) {");
  parts.push("        rl.emit('line', line);");
  parts.push('      });');
  parts.push('    }');
  parts.push('    return rl;');
  parts.push('  }');
  parts.push('};');
  parts.push('readlineModule.promises = { createInterface: readlineModule.createInterface };');
  parts.push('readlineModule.default = readlineModule;');
  parts.push('');

  // 5. Crypto Module
  parts.push('var cryptoModule = {');
  parts.push("  randomUUID: function() { return self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16); }); },");
  parts.push('  randomBytes: function(size) { var arr = new Uint8Array(size); if (self.crypto && self.crypto.getRandomValues) self.crypto.getRandomValues(arr); return new BufferModule(arr); },');
  parts.push('  randomInt: function(min, max) { if (max === undefined) { max = min; min = 0; } return Math.floor(Math.random() * (max - min)) + min; },');
  parts.push('  createHash: function(algo) {');
  parts.push("    var _data = '';");
  parts.push('    var hasher = {');
  parts.push('      update: function(chunk) { if (BufferModule.isBuffer(chunk)) _data += chunk.toString(); else if (chunk instanceof Uint8Array) _data += new TextDecoder().decode(chunk); else _data += String(chunk || ""); return hasher; },');
  parts.push("      digest: function(enc) { if (!enc) enc = 'hex'; var h = 0; for (var i = 0; i < _data.length; i++) h = (h << 5) - h + _data.charCodeAt(i) | 0; var hex = Math.abs(h).toString(16).padStart(16, '0') + 'a7b8c9d0'; if (enc === 'hex') return hex.slice(0, 32); return BufferModule.from(hex); }");
  parts.push('    }; return hasher;');
  parts.push('  },');
  parts.push('  createCipheriv: function(algo, key, iv) { var _d = ""; return { update: function(data) { _d += String(data || ""); return BufferModule.from(_d); }, final: function() { return BufferModule.from(_d); } }; },');
  parts.push('  createDecipheriv: function(algo, key, iv) { var _d = ""; return { update: function(data) { _d += String(data || ""); return BufferModule.from(_d); }, final: function() { return BufferModule.from(_d); } }; },');
  parts.push('  createSign: function() { return { update: function() { return this; }, sign: function() { return BufferModule.from("signature"); } }; },');
  parts.push('  createVerify: function() { return { update: function() { return this; }, verify: function() { return true; } }; },');
  parts.push('  pbkdf2: function(pwd, salt, iter, keylen, digest, cb) { if (typeof digest === "function") cb = digest; setTimeout(function() { if (cb) cb(null, BufferModule.alloc(keylen || 32)); }, 0); },');
  parts.push('  pbkdf2Sync: function(pwd, salt, iter, keylen) { return BufferModule.alloc(keylen || 32); },');
  parts.push('  webcrypto: self.crypto || {}');
  parts.push('};');
  parts.push('');

  // 6. Util Module
  parts.push('var utilModule = {');
  parts.push('  promisify: function(fn) { return function() { var args = Array.prototype.slice.call(arguments); return new Promise(function(res, rej) { args.push(function(e, r) { e ? rej(e) : res(r); }); fn.apply(null, args); }); }; },');
  parts.push("  inspect: function(obj) { return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj); },");
  parts.push('  format: function(fmt) { var args = Array.prototype.slice.call(arguments, 1); return String(fmt).replace(/%[sj]/g, function() { return args.shift(); }); }');
  parts.push('};');
  parts.push('');

  // 7. Stream Module
  parts.push('function StreamModule() { EventEmitterModule.call(this); }');
  parts.push('StreamModule.prototype = Object.create(EventEmitterModule.prototype);');
  parts.push('StreamModule.Readable = StreamModule;');
  parts.push('StreamModule.Writable = StreamModule;');
  parts.push('StreamModule.Transform = StreamModule;');
  parts.push('StreamModule.Duplex = StreamModule;');
  parts.push('StreamModule.PassThrough = StreamModule;');
  parts.push('StreamModule.pipeline = function() {');
  parts.push('  var args = Array.prototype.slice.call(arguments);');
  parts.push('  var cb = typeof args[args.length - 1] === "function" ? args.pop() : null;');
  parts.push('  var p = new Promise(function(resolve) { setTimeout(function() { resolve(); if (cb) cb(null); }, 0); });');
  parts.push('  return cb ? null : p;');
  parts.push('};');
  parts.push('StreamModule.finished = function(stream, cb) { setTimeout(function() { if (cb) cb(null); }, 0); };');
  parts.push('StreamModule.promises = { pipeline: StreamModule.pipeline, finished: StreamModule.finished };');
  parts.push('var streamModule = StreamModule;');
  parts.push('streamModule.pipeline = StreamModule.pipeline;');
  parts.push('streamModule.finished = StreamModule.finished;');
  parts.push('streamModule.promises = StreamModule.promises;');
  parts.push('streamModule.default = streamModule;');
  parts.push('');

  // 8. Zlib Module
  parts.push('var zlibModule = {');
  parts.push('  gzip: function(buf, cb) { setTimeout(function() { cb(null, BufferModule.from(buf)); }, 0); },');
  parts.push('  gzipSync: function(buf) { return BufferModule.from(buf); },');
  parts.push('  gunzip: function(buf, cb) { setTimeout(function() { cb(null, BufferModule.from(buf)); }, 0); },');
  parts.push('  gunzipSync: function(buf) { return BufferModule.from(buf); },');
  parts.push('  deflate: function(buf, cb) { setTimeout(function() { cb(null, BufferModule.from(buf)); }, 0); },');
  parts.push('  inflate: function(buf, cb) { setTimeout(function() { cb(null, BufferModule.from(buf)); }, 0); },');
  parts.push('  createGzip: function() { return new StreamModule(); },');
  parts.push('  createGunzip: function() { return new StreamModule(); },');
  parts.push('  createBrotliCompress: function() { return new StreamModule(); }');
  parts.push('};');
  parts.push('');

  // 9. Net Module
  parts.push('function SocketModule() { EventEmitterModule.call(this); }');
  parts.push('SocketModule.prototype = Object.create(EventEmitterModule.prototype);');
  parts.push('SocketModule.prototype.connect = function(port, host, cb) { var self = this; setTimeout(function() { self.emit("connect"); if (cb) cb(); }, 0); return this; };');
  parts.push('SocketModule.prototype.write = function(data, cb) { if (cb) setTimeout(cb, 0); return true; };');
  parts.push('SocketModule.prototype.end = function(data) { var self = this; if (data) this.write(data); setTimeout(function() { self.emit("end"); self.emit("close"); }, 0); };');
  parts.push('SocketModule.prototype.destroy = function() { this.emit("close"); };');
  parts.push('var netModule = {');
  parts.push('  Socket: SocketModule,');
  parts.push('  createConnection: function(port, host, cb) { var s = new SocketModule(); s.connect(port, host, cb); return s; },');
  parts.push('  connect: function(port, host, cb) { var s = new SocketModule(); s.connect(port, host, cb); return s; },');
  parts.push('  createServer: function(cb) { var s = new EventEmitterModule(); s.listen = function() { return s; }; s.close = function(c) { if (c) c(); }; if (cb) s.on("connection", cb); return s; }');
  parts.push('};');
  parts.push('');

  // 10. Dgram Module
  parts.push('var dgramModule = {');
  parts.push('  createSocket: function(type, cb) {');
  parts.push('    var s = new EventEmitterModule();');
  parts.push('    s.bind = function(p, c) { if (c) c(); return s; };');
  parts.push('    s.send = function(msg, port, host, c) { if (c) c(null, msg.length); return s; };');
  parts.push('    s.close = function(c) { if (c) c(); s.emit("close"); };');
  parts.push('    if (cb) s.on("message", cb);');
  parts.push('    return s;');
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // 11. DNS Module
  parts.push('var dnsModule = {');
  parts.push('  lookup: function(domain, cb) { setTimeout(function() { cb(null, "127.0.0.1", 4); }, 0); },');
  parts.push('  resolve: function(domain, cb) { setTimeout(function() { cb(null, ["127.0.0.1"]); }, 0); },');
  parts.push('  resolve4: function(domain, cb) { setTimeout(function() { cb(null, ["127.0.0.1"]); }, 0); },');
  parts.push('  resolve6: function(domain, cb) { setTimeout(function() { cb(null, ["::1"]); }, 0); },');
  parts.push('  resolveTxt: function(domain, cb) { setTimeout(function() { cb(null, [["v=spf1 include:_spf.google.com ~all"]]); }, 0); },');
  parts.push('  promises: {');
  parts.push('    lookup: function(domain) { return Promise.resolve({ address: "127.0.0.1", family: 4 }); },');
  parts.push('    resolve: function(domain) { return Promise.resolve(["127.0.0.1"]); },');
  parts.push('    resolveTxt: function(domain) { return Promise.resolve([["v=spf1 include:_spf.google.com ~all"]]); }');
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // 12. HTTP & HTTPS Module
  parts.push('function ClientRequestModule() { EventEmitterModule.call(this); }');
  parts.push('ClientRequestModule.prototype = Object.create(EventEmitterModule.prototype);');
  parts.push('ClientRequestModule.prototype.write = function() { return true; };');
  parts.push('ClientRequestModule.prototype.end = function() { return this; };');
  parts.push('var httpModule = {');
  parts.push('  ClientRequest: ClientRequestModule,');
  parts.push('  get: function(url, opts, cb) { return httpModule.request(url, opts, cb); },');
  parts.push('  request: function(url, opts, cb) {');
  parts.push('    if (typeof opts === "function") { cb = opts; opts = {}; }');
  parts.push('    var req = new ClientRequestModule();');
  parts.push('    var targetUrl = typeof url === "string" ? url : (url.href || url.path || "");');
  parts.push('    setTimeout(function() {');
  parts.push('      fetch(targetUrl).then(function(res) { return res.text().then(function(text) {');
  parts.push('        var incoming = new EventEmitterModule();');
  parts.push('        incoming.statusCode = res.status;');
  parts.push('        incoming.headers = {};');
  parts.push('        res.headers.forEach(function(v, k) { incoming.headers[k] = v; });');
  parts.push('        if (cb) cb(incoming);');
  parts.push('        req.emit("response", incoming);');
  parts.push('        setTimeout(function() { incoming.emit("data", text); incoming.emit("end"); }, 0);');
  parts.push('      }); }).catch(function(err) { req.emit("error", err); });');
  parts.push('    }, 0);');
  parts.push('    return req;');
  parts.push('  },');
  parts.push('  createServer: function(cb) { var s = new EventEmitterModule(); s.listen = function() { return s; }; s.close = function(c) { if (c) c(); }; if (cb) s.on("request", cb); return s; }');
  parts.push('};');
  parts.push('var httpsModule = Object.assign({}, httpModule);');
  parts.push('var http2Module = { connect: function() { return new EventEmitterModule(); }, createServer: httpModule.createServer };');
  parts.push('var tlsModule = { connect: function(p, h, cb) { var s = new SocketModule(); s.connect(p, h, cb); return s; }, createServer: httpModule.createServer, TLSSocket: SocketModule };');
  parts.push('');

  // 13. Child Process Module
  parts.push('function ChildProcessModule() { EventEmitterModule.call(this); this.stdout = new EventEmitterModule(); this.stderr = new EventEmitterModule(); this.stdin = new EventEmitterModule(); }');
  parts.push('ChildProcessModule.prototype = Object.create(EventEmitterModule.prototype);');
  parts.push('ChildProcessModule.prototype.kill = function() { this.emit("exit", 0, null); };');
  parts.push('var childProcessModule = {');
  parts.push('  exec: function(cmd, opts, cb) { if (typeof opts === "function") cb = opts; var cp = new ChildProcessModule(); setTimeout(function() { if (cb) cb(null, "stdout output", ""); cp.emit("exit", 0, null); }, 0); return cp; },');
  parts.push('  execFile: function(file, args, opts, cb) { if (typeof opts === "function") cb = opts; var cp = new ChildProcessModule(); setTimeout(function() { if (cb) cb(null, "stdout output", ""); cp.emit("exit", 0, null); }, 0); return cp; },');
  parts.push('  spawn: function(cmd, args) { var cp = new ChildProcessModule(); setTimeout(function() { cp.emit("exit", 0, null); }, 0); return cp; },');
  parts.push('  fork: function(modulePath) { var cp = new ChildProcessModule(); cp.send = function() {}; setTimeout(function() { cp.emit("exit", 0, null); }, 0); return cp; }');
  parts.push('};');
  parts.push('');

  // 14. Worker Threads & Cluster Modules
  parts.push('var workerThreadsModule = {');
  parts.push('  isMainThread: true,');
  parts.push('  parentPort: null,');
  parts.push('  Worker: function() { EventEmitterModule.call(this); this.postMessage = function() {}; },');
  parts.push('  MessageChannel: function() { this.port1 = new EventEmitterModule(); this.port2 = new EventEmitterModule(); }');
  parts.push('};');
  parts.push('var clusterModule = { isMaster: true, isPrimary: true, isWorker: false, fork: function() { return new ChildProcessModule(); } };');
  parts.push('');

  // 15. VM Module
  parts.push('var vmModule = {');
  parts.push('  Script: function(code) { this.code = code; this.runInContext = function(ctx) { return eval(code); }; this.runInNewContext = function(sandbox) { return eval(code); }; this.runInThisContext = function() { return eval(code); }; },');
  parts.push('  createContext: function(sandbox) { return sandbox || {}; },');
  parts.push('  runInContext: function(code, ctx) { return eval(code); },');
  parts.push('  runInNewContext: function(code, sandbox) { return eval(code); },');
  parts.push('  runInThisContext: function(code) { return eval(code); }');
  parts.push('};');
  parts.push('');

  // 16. OS, V8, Performance & Inspector Modules
  parts.push('var osModule = {');
  parts.push('  cpus: function() { return [{ model: "Browser Virtual Core", speed: 3000, times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } }, { model: "Browser Virtual Core", speed: 3000, times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } }]; },');
  parts.push('  totalmem: function() { return 8589934592; },');
  parts.push('  freemem: function() { return 4294967296; },');
  parts.push('  networkInterfaces: function() { return { lo: [{ address: "127.0.0.1", netmask: "255.0.0.0", family: "IPv4", mac: "00:00:00:00:00:00", internal: true }] }; },');
  parts.push('  userInfo: function() { return { username: "workspace", homedir: "/", shell: "/bin/sh" }; },');
  parts.push('  hostname: function() { return "js-workspace"; },');
  parts.push('  type: function() { return "Linux"; },');
  parts.push('  release: function() { return "5.15.0-browser"; },');
  parts.push('  uptime: function() { return 3600; },');
  parts.push('  loadavg: function() { return [0.1, 0.2, 0.15]; },');
  parts.push('  platform: function() { return "browser"; },');
  parts.push('  arch: function() { return "x64"; },');
  parts.push('  homedir: function() { return "/"; },');
  parts.push('  tmpdir: function() { return "/tmp"; }');
  parts.push('};');
  parts.push('var v8Module = { getHeapStatistics: function() { return { total_heap_size: 33554432, total_heap_size_executable: 4194304, total_physical_size: 33554432, total_available_size: 4294967296, heap_size_limit: 4294967296, used_heap_size: 16777216 }; }, getHeapSpaceStatistics: function() { return []; } };');
  parts.push('var perfHooksModule = { performance: self.performance || { now: function() { return Date.now(); } } };');
  parts.push('var inspectorModule = { open: function() {}, close: function() {}, url: function() { return undefined; } };');
  parts.push('');

  // 17. Virtual FS Module
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
  parts.push('  ReadStream: StreamModule,');
  parts.push('  WriteStream: StreamModule,');
  parts.push('  createReadStream: function(p) { var s = new StreamModule(); setTimeout(function() { s.emit("data", fsModule.readFileSync(p)); s.emit("end"); }, 0); return s; },');
  parts.push('  createWriteStream: function(p) { var s = new StreamModule(); s.write = function(d) { fsModule.writeFileSync(p, d); return true; }; return s; },');
  parts.push('  watch: function(p, opts, listener) { if (typeof opts === "function") listener = opts; var w = new EventEmitterModule(); if (listener) w.on("change", listener); return w; },');
  parts.push('  watchFile: function(p, listener) { var w = new EventEmitterModule(); if (listener) w.on("change", listener); return w; },');
  parts.push('  promises: {');
  parts.push('    readFile: function(p, enc) { return Promise.resolve(fsModule.readFileSync(p, enc)); },');
  parts.push('    writeFile: function(p, d, enc) { return Promise.resolve(fsModule.writeFileSync(p, d, enc)); },');
  parts.push('    readdir: function(p) { return Promise.resolve(fsModule.readdirSync(p)); },');
  parts.push('    stat: function(p) { return Promise.resolve(fsModule.statSync(p)); },');
  parts.push('    mkdir: function(p) { return Promise.resolve(fsModule.mkdirSync(p)); },');
  parts.push('    unlink: function(p) { return Promise.resolve(fsModule.unlinkSync(p)); },');
  parts.push('    access: function(p) { return fsModule.existsSync(p) ? Promise.resolve() : Promise.reject(new Error("ENOENT")); },');
  parts.push('    copyFile: function(src, dest) { var d = fsModule.readFileSync(src); fsModule.writeFileSync(dest, d); return Promise.resolve(); },');
  parts.push('    rm: function(p) { fsModule.unlinkSync(p); return Promise.resolve(); }');
  parts.push('  }');
  parts.push('};');
  parts.push('');

  // Attach default exports for ES module interop
  parts.push('fsModule.default = fsModule;');
  parts.push('pathModule.default = pathModule;');
  parts.push('processModule.default = processModule;');
  parts.push('cryptoModule.default = cryptoModule;');
  parts.push('utilModule.default = utilModule;');
  parts.push('osModule.default = osModule;');
  parts.push('');

  // Global Bindings & Polyfills
  parts.push('self.process = processModule;');
  parts.push('self.Buffer = BufferModule;');
  parts.push('self.fs = fsModule;');
  parts.push('self.path = pathModule;');
  parts.push('self.os = osModule;');
  parts.push('self.global = self;');
  parts.push('self.setImmediate = function(fn) { var args = Array.prototype.slice.call(arguments, 1); return setTimeout(function() { fn.apply(null, args); }, 0); };');
  parts.push('self.clearImmediate = function(id) { clearTimeout(id); };');
  parts.push('');

  // Polyfill Browser Web Page DOM (document.body.innerHTML, document.write, document.createElement, etc.)
  parts.push('var __doc_elements__ = {};');
  parts.push('function escapeHtmlText(str) {');
  parts.push('  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");');
  parts.push('}');
  parts.push('function escapeHtmlAttr(str) {');
  parts.push('  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");');
  parts.push('}');
  parts.push('function camelToKebab(str) {');
  parts.push('  return String(str || "").replace(/([A-Z])/g, "-$1").toLowerCase();');
  parts.push('}');
  parts.push('function VirtualClassList(el) {');
  parts.push('  this._el = el;');
  parts.push('  this._classes = [];');
  parts.push('}');
  parts.push('VirtualClassList.prototype.add = function() {');
  parts.push('  for (var i = 0; i < arguments.length; i++) {');
  parts.push('    var c = String(arguments[i]).trim();');
  parts.push('    if (c && this._classes.indexOf(c) === -1) this._classes.push(c);');
  parts.push('  }');
  parts.push('  this._sync();');
  parts.push('};');
  parts.push('VirtualClassList.prototype.remove = function() {');
  parts.push('  for (var i = 0; i < arguments.length; i++) {');
  parts.push('    var c = String(arguments[i]).trim();');
  parts.push('    var idx = this._classes.indexOf(c);');
  parts.push('    if (idx !== -1) this._classes.splice(idx, 1);');
  parts.push('  }');
  parts.push('  this._sync();');
  parts.push('};');
  parts.push('VirtualClassList.prototype.toggle = function(c) {');
  parts.push('  var s = String(c).trim();');
  parts.push('  if (this.contains(s)) { this.remove(s); return false; }');
  parts.push('  else { this.add(s); return true; }');
  parts.push('};');
  parts.push('VirtualClassList.prototype.contains = function(c) {');
  parts.push('  return this._classes.indexOf(String(c).trim()) !== -1;');
  parts.push('};');
  parts.push('VirtualClassList.prototype._sync = function() {');
  parts.push('  if (this._el) this._el.className = this._classes.join(" ");');
  parts.push('};');
  parts.push('Object.defineProperty(VirtualClassList.prototype, "value", {');
  parts.push('  get: function() { return this._classes.join(" "); },');
  parts.push('  set: function(v) { this._classes = String(v || "").trim().split(/\\s+/).filter(Boolean); this._sync(); }');
  parts.push('});');
  parts.push('Object.defineProperty(VirtualClassList.prototype, "length", {');
  parts.push('  get: function() { return this._classes.length; }');
  parts.push('});');
  parts.push('');
  parts.push('function VirtualDOMElement(tagName, id) {');
  parts.push("  this.tagName = (tagName || 'DIV').toUpperCase();");
  parts.push("  this._id = '';");
  parts.push('  this.parentNode = null;');
  parts.push('  this.children = [];');
  parts.push("  this._innerHTML = '';");
  parts.push('  this.attributes = {};');
  parts.push('  this.style = {};');
  parts.push('  this.classList = new VirtualClassList(this);');
  parts.push('  if (id) this.id = id;');
  parts.push('}');
  parts.push('Object.defineProperty(VirtualDOMElement.prototype, "id", {');
  parts.push('  get: function() { return this._id || ""; },');
  parts.push('  set: function(val) {');
  parts.push('    var oldId = this._id;');
  parts.push('    if (oldId && __doc_elements__[oldId] === this) delete __doc_elements__[oldId];');
  parts.push('    this._id = String(val || "");');
  parts.push('    if (this._id) {');
  parts.push('      this.attributes["id"] = this._id;');
  parts.push('      __doc_elements__[this._id] = this;');
  parts.push('    } else {');
  parts.push('      delete this.attributes["id"];');
  parts.push('    }');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('});');
  parts.push('');
  parts.push('VirtualDOMElement.prototype.setAttribute = function(name, val) {');
  parts.push('  var k = String(name || "").toLowerCase();');
  parts.push('  var v = String(val !== undefined ? val : "");');
  parts.push('  this.attributes[k] = v;');
  parts.push('  if (k === "id") this.id = v;');
  parts.push('  if (k === "class") this.classList.value = v;');
  parts.push('  if (k === "src") this.src = v;');
  parts.push('  this._notifyRoot();');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.getAttribute = function(name) {');
  parts.push('  var k = String(name || "").toLowerCase();');
  parts.push('  return this.attributes[k] !== undefined ? this.attributes[k] : null;');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.removeAttribute = function(name) {');
  parts.push('  var k = String(name || "").toLowerCase();');
  parts.push('  delete this.attributes[k];');
  parts.push('  if (k === "id") this.id = "";');
  parts.push('  this._notifyRoot();');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.hasAttribute = function(name) {');
  parts.push('  return this.attributes[String(name || "").toLowerCase()] !== undefined;');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.addEventListener = function(event, handler) {');
  parts.push('  var k = "on" + String(event || "").toLowerCase();');
  parts.push('  this[k] = handler;');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.removeEventListener = function() {};');
  parts.push('VirtualDOMElement.prototype.dispatchEvent = function() { return true; };');
  parts.push('');
  parts.push('VirtualDOMElement.prototype.remove = function() {');
  parts.push('  if (this.parentNode && typeof this.parentNode.removeChild === "function") {');
  parts.push('    this.parentNode.removeChild(this);');
  parts.push('  }');
  parts.push('  if (this._id && __doc_elements__[this._id] === this) {');
  parts.push('    delete __doc_elements__[this._id];');
  parts.push('  }');
  parts.push('  this._notifyRoot();');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.removeChild = function(child) {');
  parts.push('  var idx = this.children.indexOf(child);');
  parts.push('  if (idx !== -1) {');
  parts.push('    this.children.splice(idx, 1);');
  parts.push('    if (child) child.parentNode = null;');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('  return child;');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.appendChild = function(child) {');
  parts.push('  if (child) {');
  parts.push('    if (typeof child === "object" && child.tagName) {');
  parts.push('      if (child.parentNode) child.parentNode.removeChild(child);');
  parts.push('      child.parentNode = this;');
  parts.push('      this.children.push(child);');
  parts.push('    } else {');
  parts.push('      var textEl = new VirtualDOMElement("SPAN");');
  parts.push('      textEl._innerHTML = escapeHtmlText(String(child));');
  parts.push('      textEl.parentNode = this;');
  parts.push('      this.children.push(textEl);');
  parts.push('    }');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('  return child;');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.append = function() {');
  parts.push('  for (var i = 0; i < arguments.length; i++) { this.appendChild(arguments[i]); }');
  parts.push('};');
  parts.push('VirtualDOMElement.prototype.insertBefore = function(newNode, refNode) {');
  parts.push('  if (!newNode) return newNode;');
  parts.push('  if (typeof newNode === "object" && newNode.tagName) {');
  parts.push('    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);');
  parts.push('    newNode.parentNode = this;');
  parts.push('    var idx = this.children.indexOf(refNode);');
  parts.push('    if (idx !== -1) this.children.splice(idx, 0, newNode);');
  parts.push('    else this.children.push(newNode);');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('  return newNode;');
  parts.push('};');
  parts.push('');
  parts.push('VirtualDOMElement.prototype._serializeStyle = function() {');
  parts.push('  if (!this.style || typeof this.style !== "object") return "";');
  parts.push('  var s = [];');
  parts.push('  for (var k in this.style) {');
  parts.push('    if (this.style[k] !== undefined && this.style[k] !== null && this.style[k] !== "") {');
  parts.push('      s.push(camelToKebab(k) + ": " + this.style[k]);');
  parts.push('    }');
  parts.push('  }');
  parts.push('  return s.join("; ");');
  parts.push('};');
  parts.push('');
  parts.push('Object.defineProperty(VirtualDOMElement.prototype, "outerHTML", {');
  parts.push('  get: function() {');
  parts.push('    var tag = this.tagName.toLowerCase();');
  parts.push('    var attrs = [];');
  parts.push('    if (this.id) attrs.push(\'id="\' + escapeHtmlAttr(this.id) + \'"\');');
  parts.push('    if (this.classList && this.classList.length > 0) attrs.push(\'class="\' + escapeHtmlAttr(this.classList.value) + \'"\');');
  parts.push('    var styleStr = this._serializeStyle();');
  parts.push('    if (styleStr) attrs.push(\'style="\' + escapeHtmlAttr(styleStr) + \'"\');');
  parts.push('    for (var k in this.attributes) {');
  parts.push('      if (k !== "id" && k !== "class" && k !== "style") {');
  parts.push('        attrs.push(k + \'="\' + escapeHtmlAttr(this.attributes[k]) + \'"\');');
  parts.push('      }');
  parts.push('    }');
  parts.push('    if (this.src && !this.attributes["src"]) attrs.push(\'src="\' + escapeHtmlAttr(this.src) + \'"\');');
  parts.push('    if (this.href && !this.attributes["href"]) attrs.push(\'href="\' + escapeHtmlAttr(this.href) + \'"\');');
  parts.push('    if (this.type && !this.attributes["type"]) attrs.push(\'type="\' + escapeHtmlAttr(this.type) + \'"\');');
  parts.push('    if (this.value && !this.attributes["value"]) attrs.push(\'value="\' + escapeHtmlAttr(this.value) + \'"\');');
  parts.push('    if (this.name && !this.attributes["name"]) attrs.push(\'name="\' + escapeHtmlAttr(this.name) + \'"\');');
  parts.push('    if (this.placeholder && !this.attributes["placeholder"]) attrs.push(\'placeholder="\' + escapeHtmlAttr(this.placeholder) + \'"\');');
  parts.push('    if (this.disabled) attrs.push(\'disabled\');');
  parts.push('    if (this.checked) attrs.push(\'checked\');');
  parts.push('    if (this.selected) attrs.push(\'selected\');');
  parts.push('    var eventProps = ["onclick", "onchange", "oninput", "onsubmit", "onkeydown", "onkeyup", "onmouseenter", "onmouseleave", "onmouseover", "onmouseout", "onfocus", "onblur"];');
  parts.push('    for (var evIdx = 0; evIdx < eventProps.length; evIdx++) {');
  parts.push('      var evName = eventProps[evIdx];');
  parts.push('      if (this[evName] && !this.attributes[evName]) {');
  parts.push('        var evHandler = this[evName];');
  parts.push('        var evCode = typeof evHandler === "function" ? "(" + evHandler.toString() + ").call(this, window.event)" : String(evHandler);');
  parts.push('        attrs.push(evName + \'="\' + escapeHtmlAttr(evCode) + \'"\');');
  parts.push('      }');
  parts.push('    }');
  parts.push('    var attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";');
  parts.push('    var voidTags = ["img", "input", "br", "hr", "meta", "link"];');
  parts.push('    if (voidTags.indexOf(tag) !== -1) return "<" + tag + attrStr + "/>";');
  parts.push('    return "<" + tag + attrStr + ">" + this.innerHTML + "</" + tag + ">";');
  parts.push('  }');
  parts.push('});');
  parts.push('');
  parts.push('Object.defineProperty(VirtualDOMElement.prototype, "innerHTML", {');
  parts.push('  get: function() {');
  parts.push('    if (this.children.length > 0) {');
  parts.push('      return this.children.map(function(c) { return c.outerHTML || c.innerHTML || String(c); }).join("");');
  parts.push('    }');
  parts.push('    return this._innerHTML || "";');
  parts.push('  },');
  parts.push('  set: function(val) {');
  parts.push('    this.children = [];');
  parts.push('    this._innerHTML = String(val || "");');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('});');
  parts.push('');
  parts.push('Object.defineProperty(VirtualDOMElement.prototype, "innerText", {');
  parts.push('  get: function() { return this.textContent; },');
  parts.push('  set: function(val) { this.textContent = val; }');
  parts.push('});');
  parts.push('Object.defineProperty(VirtualDOMElement.prototype, "textContent", {');
  parts.push('  get: function() {');
  parts.push('    if (this.children.length > 0) {');
  parts.push('      return this.children.map(function(c) { return c.textContent; }).join(" ");');
  parts.push('    }');
  parts.push('    return (this._innerHTML || "").replace(/<[^>]*>/g, "");');
  parts.push('  },');
  parts.push('  set: function(val) {');
  parts.push('    this.children = [];');
  parts.push('    this._innerHTML = escapeHtmlText(String(val || ""));');
  parts.push('    this._notifyRoot();');
  parts.push('  }');
  parts.push('});');
  parts.push('');
  parts.push('VirtualDOMElement.prototype._notifyRoot = function() {');
  parts.push('  if (typeof documentBody === "undefined" || !documentBody) return;');
  parts.push('  var root = this;');
  parts.push('  while (root.parentNode) root = root.parentNode;');
  parts.push('  if (root.tagName === "BODY" || root.id === "app" || root.id === "root" || this.tagName === "BODY" || this.id === "app" || this.id === "root") {');
  parts.push('    var htmlContent = documentBody.innerHTML;');
  parts.push('    if (htmlContent && typeof postMessage === "function") {');
  parts.push('      postMessage({ type: "FRAME", payload: { type: "html", content: htmlContent, title: "Web Page Document Frame" } });');
  parts.push('    }');
  parts.push('  }');
  parts.push('};');
  parts.push('');
  parts.push('var documentBody = new VirtualDOMElement("BODY", "body");');
  parts.push('var documentPolyfill = {');
  parts.push('  body: documentBody,');
  parts.push('  write: function() {');
  parts.push('    var text = Array.prototype.slice.call(arguments).join("");');
  parts.push('    documentBody.innerHTML += text;');
  parts.push('  },');
  parts.push('  writeln: function() {');
  parts.push('    var text = Array.prototype.slice.call(arguments).join("") + "\\n";');
  parts.push('    documentBody.innerHTML += text;');
  parts.push('  },');
  parts.push('  getElementById: function(id) {');
  parts.push('    if (id === "body") return documentBody;');
  parts.push('    return __doc_elements__[id] || null;');
  parts.push('  },');
  parts.push('  createElement: function(tagName) {');
  parts.push('    return new VirtualDOMElement(tagName);');
  parts.push('  },');
  parts.push('  querySelector: function(sel) {');
  parts.push('    if (!sel) return null;');
  parts.push('    if (sel === "body") return documentBody;');
  parts.push('    if (sel.indexOf("#") === 0) return documentPolyfill.getElementById(sel.substring(1));');
  parts.push('    return documentBody;');
  parts.push('  },');
  parts.push('  querySelectorAll: function(sel) {');
  parts.push('    var el = documentPolyfill.querySelector(sel);');
  parts.push('    return el ? [el] : [];');
  parts.push('  }');
  parts.push('};');
  parts.push('self.document = documentPolyfill;');
  parts.push('globalThis.document = documentPolyfill;');
  parts.push('self.window = self;');
  parts.push('globalThis.window = self;');
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
  parts.push("  if (cleanReq === 'events') return EventEmitterModule;");
  parts.push("  if (cleanReq === 'crypto') return cryptoModule;");
  parts.push("  if (cleanReq === 'util') return utilModule;");
  parts.push("  if (cleanReq === 'readline' || cleanReq === 'readline/promises') return readlineModule;");
  parts.push("  if (cleanReq === 'stream' || cleanReq === 'stream/promises') return streamModule;");
  parts.push("  if (cleanReq === 'zlib') return zlibModule;");
  parts.push("  if (cleanReq === 'net') return netModule;");
  parts.push("  if (cleanReq === 'dgram') return dgramModule;");
  parts.push("  if (cleanReq === 'dns' || cleanReq === 'dns/promises') return dnsModule;");
  parts.push("  if (cleanReq === 'http') return httpModule;");
  parts.push("  if (cleanReq === 'https') return httpsModule;");
  parts.push("  if (cleanReq === 'http2') return http2Module;");
  parts.push("  if (cleanReq === 'tls') return tlsModule;");
  parts.push("  if (cleanReq === 'child_process') return childProcessModule;");
  parts.push("  if (cleanReq === 'worker_threads') return workerThreadsModule;");
  parts.push("  if (cleanReq === 'cluster') return clusterModule;");
  parts.push("  if (cleanReq === 'vm') return vmModule;");
  parts.push("  if (cleanReq === 'os') return osModule;");
  parts.push("  if (cleanReq === 'v8') return v8Module;");
  parts.push("  if (cleanReq === 'perf_hooks') return perfHooksModule;");
  parts.push("  if (cleanReq === 'inspector') return inspectorModule;");
  parts.push('  return null;');
  parts.push('}');
  parts.push('');
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

  parts.push('function loadWorkspaceModuleSync(requestedPath, baseFile) {');
  parts.push('  if (baseFile === undefined) baseFile = CURRENT_FILE_PATH;');
  parts.push('  var builtin = getBuiltinModule(requestedPath);');
  parts.push('  if (builtin) return builtin;');
  parts.push('');
  parts.push("  if (requestedPath.indexOf('.') !== 0 && requestedPath.indexOf('/') !== 0) {");
  parts.push("    var npmCacheKey = 'npm:' + requestedPath;");
  parts.push('    if (MODULE_CACHE.has(npmCacheKey)) return MODULE_CACHE.get(npmCacheKey);');
  parts.push("    throw new Error('NPM package ' + JSON.stringify(requestedPath) + ' is not preloaded. Use \"await workspace.import(' + JSON.stringify(requestedPath) + ')\" or pre-cache it in the PWA tab.');");
  parts.push('  }');
  parts.push('');
  parts.push('  var resolvedPath = resolvePath(requestedPath, baseFile);');
  parts.push('  var scriptCode = WORKSPACE_FILES[resolvedPath];');
  parts.push('  if (scriptCode === undefined) {');
  parts.push("    var exts = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json'];");
  parts.push('    for (var extIdx = 0; extIdx < exts.length; extIdx++) {');
  parts.push('      var candidate = resolvedPath + exts[extIdx];');
  parts.push('      if (WORKSPACE_FILES[candidate] !== undefined) {');
  parts.push('        resolvedPath = candidate;');
  parts.push('        scriptCode = WORKSPACE_FILES[resolvedPath];');
  parts.push('        break;');
  parts.push('      }');
  parts.push('    }');
  parts.push('  }');
  parts.push('  if (MODULE_CACHE.has(resolvedPath)) return MODULE_CACHE.get(resolvedPath);');
  parts.push('  if (CALL_STACK.has(resolvedPath)) {');
  parts.push("    throw new Error('Circular dependency detected: ' + Array.from(CALL_STACK).join(' -> ') + ' -> ' + resolvedPath);");
  parts.push('  }');
  parts.push('  if (scriptCode === undefined) {');
  parts.push("    var available = Object.keys(WORKSPACE_FILES).join(', ');");
  parts.push("    throw new Error('Module not found: ' + JSON.stringify(requestedPath) + ' (resolved as ' + JSON.stringify(resolvedPath) + '). Available files: ' + available);");
  parts.push('  }');
  parts.push('');
  parts.push("  if (resolvedPath.indexOf('.json') === resolvedPath.length - 5) {");
  parts.push('    try {');
  parts.push('      var jsonParsed = JSON.parse(scriptCode);');
  parts.push('      MODULE_CACHE.set(resolvedPath, jsonParsed);');
  parts.push('      return jsonParsed;');
  parts.push('    } catch(err) {');
  parts.push("      throw new Error('Failed to parse JSON file ' + JSON.stringify(resolvedPath) + ': ' + (err.message || String(err)));");
  parts.push('    }');
  parts.push('  }');
  parts.push('');
  parts.push('  CALL_STACK.add(resolvedPath);');
  parts.push('  var _modDir = resolvedPath.indexOf("/") >= 0 ? resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) : ".";');
  parts.push('  var moduleObj = {');
  parts.push('    exports: {},');
  parts.push('    id: resolvedPath,');
  parts.push('    filename: resolvedPath,');
  parts.push('    path: _modDir,');
  parts.push('    paths: [],');
  parts.push('    loaded: false,');
  parts.push('    children: []');
  parts.push('  };');
  parts.push('  var exportsObj = moduleObj.exports;');
  parts.push('');
  let transformChain = '  var transformedCode = (scriptCode || "")';
  for (const t of importTransforms) {
    transformChain += String.fromCharCode(10) + '    ' + workerRegexReplace(t.pattern, t.replacement);
  }
  transformChain += ';';
  parts.push(transformChain);
  parts.push('');
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
  const NL = 'String.fromCharCode(10)';
  parts.push('  var _modFilename = resolvedPath;');
  parts.push('  var _modDirname = resolvedPath.indexOf("/") >= 0 ? resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) : ".";');
  parts.push("  var evalFunc = new Function('module', 'exports', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'global', 'document', 'window',");
  parts.push("    transformedCode + " + NL + " +");
  parts.push('    ' + JSON.stringify('if (typeof run === "function" && !exports.run) {') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('exports.run = run;') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('}') + ' + ' + NL + ' +');
  parts.push('      ' + JSON.stringify('return module.exports;'));
  parts.push("  );");
  parts.push('');
  parts.push('  var scopedRequire = function(path) {');
  parts.push('    return loadWorkspaceModuleSync(path, resolvedPath);');
  parts.push('  };');
  parts.push('  scopedRequire.resolve = function(path, base) {');
  parts.push('    return resolvePath(path, base || resolvedPath);');
  parts.push('  };');
  parts.push('  scopedRequire.cache = MODULE_CACHE;');
  parts.push('  scopedRequire.extensions = {');
  parts.push('    ".js": function() {},');
  parts.push('    ".json": function() {},');
  parts.push('    ".cjs": function() {},');
  parts.push('    ".ts": function() {}');
  parts.push('  };');
  parts.push('  scopedRequire.main = { id: CURRENT_FILE_PATH, filename: CURRENT_FILE_PATH, loaded: false, exports: {} };');
  parts.push('  moduleObj.require = scopedRequire;');
  parts.push('  var scopedWorkspace = {');
  parts.push('    import: function(path) { return loadWorkspaceModuleAsync(path, resolvedPath); },');
  parts.push('    runScript: async function(path, args) {');
  parts.push('      if (!args) args = {};');
  parts.push('      var mod = await loadWorkspaceModuleAsync(path, resolvedPath);');
  parts.push("      if (typeof mod.run === 'function') return mod.run(args);");
  parts.push("      if (typeof mod.default === 'function') return mod.default(args);");
  parts.push("      throw new Error('Script ' + JSON.stringify(path) + ' does not export a run(args) or default function!');");
  parts.push('    }');
  parts.push('  };');
  parts.push('');
  parts.push('  var resultExports = evalFunc(moduleObj, exportsObj, scopedRequire, scopedWorkspace, processModule, BufferModule, _modDirname, _modFilename, _modDirname, _modFilename, self.global, documentPolyfill, self.window);');
  parts.push('  if (resultExports === undefined) resultExports = moduleObj.exports;');
  parts.push('  moduleObj.loaded = true;');
  parts.push('  CALL_STACK.delete(resolvedPath);');
  parts.push('  MODULE_CACHE.set(resolvedPath, resultExports);');
  parts.push('  return resultExports;');
  parts.push('}');
  parts.push('');
  parts.push('async function loadWorkspaceModuleAsync(requestedPath, baseFile) {');
  parts.push('  if (baseFile === undefined) baseFile = CURRENT_FILE_PATH;');
  parts.push('  var builtin = getBuiltinModule(requestedPath);');
  parts.push('  if (builtin) return builtin;');
  parts.push('');
  parts.push("  if (requestedPath.indexOf('.') !== 0 && requestedPath.indexOf('/') !== 0) {");
  parts.push("    var npmCacheKey = 'npm:' + requestedPath;");
  parts.push('    if (MODULE_CACHE.has(npmCacheKey)) return MODULE_CACHE.get(npmCacheKey);');
  parts.push("    sendLog('info', ['Loading NPM package ' + JSON.stringify(requestedPath) + ' dynamically via CDN (https://esm.sh/' + requestedPath + ')...']);");
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
  parts.push('  return loadWorkspaceModuleSync(requestedPath, baseFile);');
  parts.push('}');
  parts.push('');
  parts.push('// Global synchronous require for CommonJS modules');
  parts.push('self.require = function(path) {');
  parts.push('  return loadWorkspaceModuleSync(path, CURRENT_FILE_PATH);');
  parts.push('};');
  parts.push('self.require.resolve = function(path, base) {');
  parts.push('  return resolvePath(path, base || CURRENT_FILE_PATH);');
  parts.push('};');
  parts.push('self.require.cache = MODULE_CACHE;');
  parts.push('self.require.extensions = {');
  parts.push('  ".js": function() {},');
  parts.push('  ".json": function() {},');
  parts.push('  ".cjs": function() {},');
  parts.push('  ".ts": function() {}');
  parts.push('};');
  parts.push('self.require.main = { id: CURRENT_FILE_PATH, filename: CURRENT_FILE_PATH, loaded: false, exports: {} };');
  parts.push('');
  parts.push('// Global async workspace tools');
  parts.push('self.workspace = {');
  parts.push('  import: function(path) { return loadWorkspaceModuleAsync(path, CURRENT_FILE_PATH); },');
  parts.push('  runScript: async function(path, args) {');
  parts.push('    if (!args) args = {};');
  parts.push('    var mod = await loadWorkspaceModuleAsync(path, CURRENT_FILE_PATH);');
  parts.push("    if (typeof mod.run === 'function') return mod.run(args);");
  parts.push("    if (typeof mod.default === 'function') return mod.default(args);");
  parts.push("    throw new Error('Script ' + JSON.stringify(path) + ' does not export a run(args) or default function!');");
  parts.push('  }');
  parts.push('};');
  parts.push('');

  return parts.join(String.fromCharCode(10));
}
