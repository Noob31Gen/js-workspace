/**
 * Test Suite for CommonJS Variable Fallbacks & Sandbox Resolution
 */

import assert from 'assert';
import path from 'path';
import { buildWorkerDependencyLoader } from '../src/lib/dependency-resolver.js';
import { pathPolyfill, BufferPolyfill } from '../src/lib/node-polyfills.js';
import Module from '../src/engine/almostnode/shims/module.js';

console.log('==================================================');
console.log('   TESTING COMMONJS VARIABLES & FALLBACKS         ');
console.log('==================================================');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    failCount++;
    console.error(`❌ FAIL: ${name}`, err.message);
  }
}

// 1. Test Module shim wrapper and methods
runTest('Module.wrap and Module.wrapper exist', () => {
  assert.ok(Array.isArray(Module.wrapper), 'Module.wrapper is array');
  assert.strictEqual(Module.wrapper.length, 2, 'Module.wrapper has 2 elements');
  assert.strictEqual(typeof Module.wrap, 'function', 'Module.wrap is a function');
  const wrapped = Module.wrap('console.log(123);');
  assert.ok(wrapped.includes('(function (exports, require, module, __filename, __dirname) {'), 'Wrapped code contains header');
});

// 2. Test global and timer fallbacks
runTest('globalThis.global fallback exists', () => {
  assert.ok(typeof globalThis.global !== 'undefined', 'globalThis.global is defined');
  assert.strictEqual(globalThis.global, globalThis, 'global equals globalThis');
});

runTest('setImmediate and clearImmediate fallbacks', (done) => {
  assert.strictEqual(typeof globalThis.setImmediate, 'function', 'setImmediate is function');
  assert.strictEqual(typeof globalThis.clearImmediate, 'function', 'clearImmediate is function');
});

// 3. Test Worker Dependency Loader Code Generation
runTest('buildWorkerDependencyLoader contains all CommonJS variable declarations', () => {
  const dummyNodes = [
    {
      id: 'file-1',
      name: 'helper.js',
      type: 'file',
      path: 'utils/helper.js',
      parentId: null,
      code: 'exports.add = function(a, b) { return a + b; };'
    }
  ];

  const generatedCode = buildWorkerDependencyLoader(dummyNodes, 'main.js');

  // Verify __filename, __dirname, dirname, filename
  assert.ok(generatedCode.includes('var __filename = CURRENT_FILE_PATH;'), 'Contains __filename');
  assert.ok(generatedCode.includes('var __dirname = '), 'Contains __dirname');
  assert.ok(generatedCode.includes('var dirname = __dirname;'), 'Contains dirname alias');
  assert.ok(generatedCode.includes('var filename = __filename;'), 'Contains filename alias');

  // Verify global fallback
  assert.ok(generatedCode.includes('self.global = self;'), 'Contains self.global');
  assert.ok(generatedCode.includes('globalThis.global = globalThis;'), 'Contains globalThis.global');

  // Verify setImmediate / clearImmediate
  assert.ok(generatedCode.includes('self.setImmediate = '), 'Contains setImmediate');
  assert.ok(generatedCode.includes('self.clearImmediate = '), 'Contains clearImmediate');

  // Verify require.resolve, cache, extensions, main
  assert.ok(generatedCode.includes('self.require.resolve = '), 'Contains require.resolve');
  assert.ok(generatedCode.includes('self.require.cache = MODULE_CACHE;'), 'Contains require.cache');
  assert.ok(generatedCode.includes('self.require.extensions = '), 'Contains require.extensions');
  assert.ok(generatedCode.includes('self.require.main = '), 'Contains require.main');

  // Verify moduleObj structure inside loadWorkspaceModuleSync
  assert.ok(generatedCode.includes('loaded: false'), 'Module loaded initial state');
  assert.ok(generatedCode.includes('children: []'), 'Module children array');
  assert.ok(generatedCode.includes('moduleObj.loaded = true;'), 'Module loaded set true');
});

// 4. Test Simulated Web Worker Scope Execution with CommonJS scripts
runTest('Simulate CommonJS module.exports in ScriptRunner', async () => {
  const mockCurrentFilePath = 'calculator.js';
  const __dirname = '.';
  const __filename = mockCurrentFilePath;
  const dirname = __dirname;
  const filename = __filename;
  const global = globalThis;
  const module = { exports: {}, id: mockCurrentFilePath, filename: mockCurrentFilePath, path: __dirname, paths: [], loaded: false, children: [] };
  const exports = module.exports;
  const process = { env: {}, argv: ['node', mockCurrentFilePath] };
  const Buffer = BufferPolyfill;
  const require = function(id) {
    return { name: id };
  };
  require.resolve = function(p) { return p; };
  require.cache = new Map();
  require.main = module;
  require.extensions = {};
  const workspace = {};

  // Script using module.exports function
  const cjsCode = `
    module.exports = function({ x = 10, y = 20 }) {
      return { sum: x + y, isGlobalAvailable: typeof global !== 'undefined', file: __filename, dir: __dirname };
    };
  `;

  const scriptFunc = new Function(
    '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global',
    `return (async () => {
      ${cjsCode}
      if (typeof run === "function") return await run(__workspace_args__);
      if (typeof module.exports === "function") return await module.exports(__workspace_args__);
      if (module.exports && typeof module.exports.run === "function") return await module.exports.run(__workspace_args__);
      if (typeof exports.run === "function") return await exports.run(__workspace_args__);
      return module.exports;
    })();`
  );

  const result = await scriptFunc({ x: 5, y: 15 }, require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global);

  assert.strictEqual(result.sum, 20, 'module.exports executed correctly');
  assert.strictEqual(result.isGlobalAvailable, true, 'global is available');
  assert.strictEqual(result.file, 'calculator.js', '__filename is accurate');
  assert.strictEqual(result.dir, '.', '__dirname is accurate');
});

runTest('Simulate CommonJS exports.run in ScriptRunner', async () => {
  const mockCurrentFilePath = 'reporter.js';
  const __dirname = '.';
  const __filename = mockCurrentFilePath;
  const dirname = __dirname;
  const filename = __filename;
  const global = globalThis;
  const module = { exports: {}, id: mockCurrentFilePath, filename: mockCurrentFilePath, path: __dirname, paths: [], loaded: false, children: [] };
  const exports = module.exports;
  const process = { env: {}, argv: ['node', mockCurrentFilePath] };
  const Buffer = BufferPolyfill;
  const require = function(id) { return {}; };
  const workspace = {};

  // Script using exports.run
  const cjsCode = `
    exports.run = async function({ title = "Report" }) {
      return { title: title.toUpperCase(), success: true };
    };
  `;

  const scriptFunc = new Function(
    '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global',
    `return (async () => {
      ${cjsCode}
      if (typeof run === "function") return await run(__workspace_args__);
      if (typeof module.exports === "function") return await module.exports(__workspace_args__);
      if (module.exports && typeof module.exports.run === "function") return await module.exports.run(__workspace_args__);
      if (typeof exports.run === "function") return await exports.run(__workspace_args__);
      return module.exports;
    })();`
  );

  const result = await scriptFunc({ title: 'audit' }, require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global);

  assert.strictEqual(result.title, 'AUDIT', 'exports.run executed correctly');
  assert.strictEqual(result.success, true, 'exports.run returned expected object');
});

// 5. Test require.main === module execution flow
runTest('Simulate require.main === module CLI block execution', async () => {
  const mockCurrentFilePath = 'test-engine.js';
  const __dirname = '.';
  const __filename = mockCurrentFilePath;
  const dirname = __dirname;
  const filename = __filename;
  const global = globalThis;
  const module = { exports: {}, id: mockCurrentFilePath, filename: mockCurrentFilePath, path: __dirname, paths: [], loaded: false, children: [] };
  const exports = module.exports;
  const process = { env: {}, argv: ['node', mockCurrentFilePath, '--verbose'] };
  const Buffer = BufferPolyfill;
  const require = function(id) { return {}; };
  require.main = module; // Bind require.main === module
  const workspace = {};

  let cliExecuted = false;

  const cjsCode = `
    function runDiagnostics(targetIp, port = 443) {
      return { status: "success", targetIp, port };
    }
    module.exports = { runDiagnostics };

    if (require.main === module) {
      cliExecuted = true;
      module.exports.cliResult = runDiagnostics("192.168.1.100", 8080);
    }
  `;

  const scriptFunc = new Function(
    '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global',
    `return (async () => {
      var cliExecuted = false;
      ${cjsCode}
      if (typeof run === "function") return await run(__workspace_args__);
      if (typeof module.exports === "function") return await module.exports(__workspace_args__);
      if (module.exports && typeof module.exports.run === "function") return await module.exports.run(__workspace_args__);
      if (typeof exports.run === "function") return await exports.run(__workspace_args__);
      return module.exports;
    })();`
  );

  const result = await scriptFunc({}, require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global);

  assert.ok(result.runDiagnostics, 'module.exports.runDiagnostics exists');
  assert.ok(result.cliResult, 'CLI result was generated');
  assert.strictEqual(result.cliResult.targetIp, '192.168.1.100');
  assert.strictEqual(result.cliResult.port, 8080);

  // Verify safe cloning of module containing functions (does not throw with structuredClone)
  const safeCloneForPostMessage = function(val, seen, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 20) return '[Max Depth Reached]';
    if (val === null || val === undefined) return val;
    var t = typeof val;
    if (t === 'number' || t === 'string' || t === 'boolean' || t === 'bigint') return val;
    if (t === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
    if (t === 'symbol') return val.toString();
    if (seen === undefined) seen = new Set();
    if (typeof val === 'object') {
      if (seen.has(val)) return '[Circular Reference]';
      seen.add(val);
    }
    if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
    if (val instanceof Date) return val.toISOString();
    if (val instanceof RegExp) return val.toString();
    if (val instanceof Uint8Array || val instanceof ArrayBuffer) return val;
    if (Array.isArray(val)) {
      var arrOut = [];
      for (var i = 0; i < val.length; i++) {
        arrOut.push(safeCloneForPostMessage(val[i], seen, depth + 1));
      }
      return arrOut;
    }
    if (typeof val === 'object') {
      var objOut = {};
      var keys = Object.keys(val);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        try {
          objOut[key] = safeCloneForPostMessage(val[key], seen, depth + 1);
        } catch(e) {
          objOut[key] = '[Unserializable Property]';
        }
      }
      return objOut;
    }
    return String(val);
  };

  const sanitized = safeCloneForPostMessage(result);
  assert.strictEqual(sanitized.runDiagnostics, '[Function: runDiagnostics]');
  
  // structuredClone must now succeed on the sanitized output!
  const cloned = structuredClone(sanitized);
  assert.strictEqual(cloned.runDiagnostics, '[Function: runDiagnostics]');
  assert.strictEqual(cloned.cliResult.targetIp, '192.168.1.100');
});

console.log('==================================================');
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('==================================================');

if (failCount > 0) {
  process.exit(1);
}
