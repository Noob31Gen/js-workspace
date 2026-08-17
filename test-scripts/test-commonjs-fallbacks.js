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

async function runTest(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    failCount++;
    console.error(`❌ FAIL: ${name}`, err.message);
  }
}

async function main() {
  // 1. Test Module shim wrapper and methods
  await runTest('Module.wrap and Module.wrapper exist', () => {
    assert.ok(Array.isArray(Module.wrapper), 'Module.wrapper is array');
    assert.strictEqual(Module.wrapper.length, 2, 'Module.wrapper has 2 elements');
    assert.strictEqual(typeof Module.wrap, 'function', 'Module.wrap is a function');
    const wrapped = Module.wrap('console.log(123);');
    assert.ok(wrapped.includes('(function (exports, require, module, __filename, __dirname) {'), 'Wrapped code contains header');
  });

  // 2. Test global and timer fallbacks
  await runTest('globalThis.global fallback exists', () => {
    assert.ok(typeof globalThis.global !== 'undefined', 'globalThis.global is defined');
    assert.strictEqual(globalThis.global, globalThis, 'global equals globalThis');
  });

  await runTest('setImmediate and clearImmediate fallbacks', () => {
    assert.strictEqual(typeof globalThis.setImmediate, 'function', 'setImmediate is function');
    assert.strictEqual(typeof globalThis.clearImmediate, 'function', 'clearImmediate is function');
  });

  // 3. Test Worker Dependency Loader Code Generation
  await runTest('buildWorkerDependencyLoader contains all CommonJS variable declarations', () => {
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
  await runTest('Simulate CommonJS module.exports in ScriptRunner', async () => {
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

  await runTest('Simulate CommonJS exports.run in ScriptRunner', async () => {
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
  await runTest('Simulate require.main === module CLI block execution', async () => {
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

    const cjsCode = `
      function runDiagnostics(targetIp, port = 443) {
        return { status: "success", targetIp, port };
      }
      module.exports = { runDiagnostics };

      if (require.main === module) {
        module.exports.cliResult = runDiagnostics("192.168.1.100", 8080);
      }
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

    const result = await scriptFunc({}, require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global);

    assert.ok(result.runDiagnostics, 'module.exports.runDiagnostics exists');
    assert.ok(result.cliResult, 'CLI result was generated');
    assert.strictEqual(result.cliResult.targetIp, '192.168.1.100');
    assert.strictEqual(result.cliResult.port, 8080);

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
    
    const cloned = structuredClone(sanitized);
    assert.strictEqual(cloned.runDiagnostics, '[Function: runDiagnostics]');
    assert.strictEqual(cloned.cliResult.targetIp, '192.168.1.100');
  });

  // 6. Test Positional Function Signature Parameter Auto-Detection
  await runTest('parseScriptOptions detects positional function parameters & defaults', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');
    
    const testScript = `
  function runDiagnostics(
      targetIp,
      port = 443,
      enableLogging = true,
      config = { timeout: 5000, retry: 3 },
      ...extraFlags
  ) {
      console.log(targetIp);
  }
    `;

    const meta = parseScriptOptions(testScript);
    assert.strictEqual(meta.options.length, 5, 'Detected 5 parameters');
    
    const [optIp, optPort, optLog, optConfig, optFlags] = meta.options;
    
    assert.strictEqual(optIp.key, 'targetIp');
    assert.strictEqual(optIp.label, 'Target IP');
    assert.strictEqual(optIp.type, 'string');
    
    assert.strictEqual(optPort.key, 'port');
    assert.strictEqual(optPort.label, 'Port');
    assert.strictEqual(optPort.type, 'number');
    assert.strictEqual(optPort.default, 443);
    
    assert.strictEqual(optLog.key, 'enableLogging');
    assert.strictEqual(optLog.label, 'Enable Logging');
    assert.strictEqual(optLog.type, 'boolean');
    assert.strictEqual(optLog.default, true);
    
    assert.strictEqual(optConfig.key, 'config');
    assert.strictEqual(optConfig.type, 'json');
    
    assert.strictEqual(optFlags.key, 'extraFlags');
    assert.strictEqual(optFlags.label, 'Extra Flags');
    assert.strictEqual(optFlags.type, 'text');
  });

  // 7. Test Comprehensive CLI Flag Auto-Detection
  await runTest('parseScriptOptions auto-detects CLI flags across patterns', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');

    const cliScript = `
      const isVerbose = args.includes('--verbose');
      if (extraFlags.includes('--force')) {
        console.log('Force mode active');
      }
      program.option('-p, --port <number>', 'server port', 8080);
      const { values } = parseArgs({
        options: {
          dryRun: { type: 'boolean', default: false },
          outputFile: { type: 'string', default: 'out.json' }
        }
      });
    `;

    const meta = parseScriptOptions(cliScript);
    const keys = meta.options.map(o => o.key);

    assert.ok(keys.includes('verbose'), 'Detected --verbose flag');
    assert.ok(keys.includes('force'), 'Detected --force flag');
    assert.ok(keys.includes('port'), 'Detected Commander --port option');
    assert.ok(keys.includes('dryRun'), 'Detected parseArgs dryRun option');
    assert.ok(keys.includes('outputFile'), 'Detected parseArgs outputFile option');

    const portOpt = meta.options.find(o => o.key === 'port');
    assert.strictEqual(portOpt?.type, 'number');
    assert.strictEqual(portOpt?.default, 8080);

    const dryOpt = meta.options.find(o => o.key === 'dryRun');
    assert.strictEqual(dryOpt?.type, 'boolean');
    assert.strictEqual(dryOpt?.default, false);
  });

  // 8. Test Complex Mixed Destructuring & Array Signatures (Kitchen Sink)
  await runTest('parseScriptOptions parses complex mixed signatures (testKitchenSink)', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');

    const kitchenSinkCode = `
      function testKitchenSink(
          jobId,
          [route1, route2 = "0.0.0.0/0"],
          { verifySSL = true, retries = 3 } = {},
          ...tags
      ) {
          console.log(jobId);
      }
    `;

    const meta = parseScriptOptions(kitchenSinkCode);
    assert.strictEqual(meta.options.length, 6, 'Detected all 6 parameters');

    const optJobId = meta.options.find(o => o.key === 'jobId');
    assert.strictEqual(optJobId?.label, 'Job ID');
    assert.strictEqual(optJobId?.type, 'number');

    const optRoute1 = meta.options.find(o => o.key === 'route1');
    assert.strictEqual(optRoute1?.label, 'Route 1');
    assert.strictEqual(optRoute1?.type, 'string');

    const optRoute2 = meta.options.find(o => o.key === 'route2');
    assert.strictEqual(optRoute2?.label, 'Route 2');
    assert.strictEqual(optRoute2?.type, 'string');
    assert.strictEqual(optRoute2?.default, '0.0.0.0/0');

    const optVerify = meta.options.find(o => o.key === 'verifySSL');
    assert.strictEqual(optVerify?.label, 'Verify SSL', 'Acronym SSL preserved without splitting into S S L');
    assert.strictEqual(optVerify?.type, 'boolean');
    assert.strictEqual(optVerify?.default, true);

    const optRetries = meta.options.find(o => o.key === 'retries');
    assert.strictEqual(optRetries?.label, 'Retries');
    assert.strictEqual(optRetries?.type, 'number');
    assert.strictEqual(optRetries?.default, 3);

    const optTags = meta.options.find(o => o.key === 'tags');
    assert.strictEqual(optTags?.label, 'Tags');
    assert.strictEqual(optTags?.type, 'text');
  });

  // 9. Test Aliased & Nested Object Destructuring with Inline Comments
  await runTest('parseScriptOptions parses aliased & nested object destructuring with comments', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');

    const aliasedCode = `
      function testObjectDestructuring({
          host,
          port = 8080,
          timeout: msTimeout = 5000, // Aliased variable
          credentials: { user, pass } = {} // Nested destructuring
      } = {}) {
          console.log("--- testObjectDestructuring ---");
      }
    `;

    const meta = parseScriptOptions(aliasedCode);
    const keys = meta.options.map(o => o.key);

    assert.ok(keys.includes('host'), 'Detected host');
    assert.ok(keys.includes('port'), 'Detected port');
    assert.ok(keys.includes('timeout'), 'Detected timeout from timeout: msTimeout');
    assert.ok(keys.includes('user'), 'Detected user from credentials: { user, pass }');
    assert.ok(keys.includes('pass'), 'Detected pass from credentials: { user, pass }');

    const optTimeout = meta.options.find(o => o.key === 'timeout');
    assert.strictEqual(optTimeout?.label, 'Timeout');
    assert.strictEqual(optTimeout?.type, 'number');
    assert.strictEqual(optTimeout?.default, 5000);

    const optUser = meta.options.find(o => o.key === 'user');
    assert.strictEqual(optUser?.label, 'User');
    assert.strictEqual(optUser?.type, 'string', 'User is a string, NOT a boolean');

    const optPass = meta.options.find(o => o.key === 'pass');
    assert.strictEqual(optPass?.label, 'Pass');
    assert.strictEqual(optPass?.type, 'string');

    const optPort = meta.options.find(o => o.key === 'port');
    assert.strictEqual(optPort?.label, 'Port');
    assert.strictEqual(optPort?.type, 'number');
    assert.strictEqual(optPort?.default, 8080);
  });

  // 10. Test Full Multi-Pattern Script (Classes, Constructors, Array & Object Destructuring, Rest Params)
  await runTest('parseScriptOptions parses full multi-pattern script seamlessly', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');

    const fullScript = `
      // 1. Standard Primitives & Default Values
      function testPrimitives(targetIp, port = 443, useTls = true, protocol = "TCP") {
          console.log({ targetIp, port, useTls, protocol });
      }

      // 2. Object Destructuring with Defaults & Aliasing
      function testObjectDestructuring({ 
          host, 
          port = 8080, 
          timeout: msTimeout = 5000,
          credentials: { user, pass } = {}
      } = {}) {
          console.log({ host, port, msTimeout, user, pass });
      }

      // 3. Array Destructuring with Defaults & Rest Elements
      function testArrayDestructuring([primaryDns, secondaryDns = "1.1.1.1", ...fallbackDns] = []) {
          console.log({ primaryDns, secondaryDns, fallbackDns });
      }

      // 4. Callbacks and Rest Parameters
      function testRestAndCallback(command, callbackFn, ...args) {
          console.log({ command, args });
      }

      // 5. The "Kitchen Sink"
      function testKitchenSink(
          jobId,
          [route1, route2 = "0.0.0.0/0"],
          { verifySSL = true, retries = 3 } = {},
          ...tags
      ) {
          console.log({ jobId, route1, route2, verifySSL, retries, tags });
      }

      // 6. Class Constructors and Methods
      class NetworkScanner {
          constructor(interfaceName, { promiscuous = false } = {}) {
              this.interfaceName = interfaceName;
              this.promiscuous = promiscuous;
          }

          scanRange(cidr, timeout = 2000) {
              console.log({ cidr, timeout });
          }
      }
    `;

    const meta = parseScriptOptions(fullScript);
    const keys = meta.options.map(o => o.key);

    // Primitives
    const optTargetIp = meta.options.find(o => o.key === 'targetIp');
    assert.strictEqual(optTargetIp?.label, 'Target IP', 'Acronym IP preserved');
    assert.strictEqual(optTargetIp?.type, 'string');

    const optUseTls = meta.options.find(o => o.key === 'useTls');
    assert.strictEqual(optUseTls?.label, 'Use TLS', 'Acronym TLS preserved');
    assert.strictEqual(optUseTls?.type, 'boolean');
    assert.strictEqual(optUseTls?.default, true);

    const optProtocol = meta.options.find(o => o.key === 'protocol');
    assert.strictEqual(optProtocol?.type, 'string');
    assert.strictEqual(optProtocol?.default, 'TCP');

    // Array Destructuring
    const optPrimaryDns = meta.options.find(o => o.key === 'primaryDns');
    assert.strictEqual(optPrimaryDns?.label, 'Primary DNS', 'Acronym DNS preserved');

    const optSecondaryDns = meta.options.find(o => o.key === 'secondaryDns');
    assert.strictEqual(optSecondaryDns?.default, '1.1.1.1');

    // Class Constructor & Methods
    assert.ok(keys.includes('interfaceName'), 'Detected class constructor param interfaceName');
    assert.ok(keys.includes('promiscuous'), 'Detected class constructor destructured promiscuous');
    const optPromisc = meta.options.find(o => o.key === 'promiscuous');
    assert.strictEqual(optPromisc?.type, 'boolean');
    assert.strictEqual(optPromisc?.default, false);

    assert.ok(keys.includes('cidr'), 'Detected class method param cidr');
    const optCidr = meta.options.find(o => o.key === 'cidr');
    assert.strictEqual(optCidr?.label, 'CIDR', 'Acronym CIDR preserved');
  });

  console.log('==================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('==================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
