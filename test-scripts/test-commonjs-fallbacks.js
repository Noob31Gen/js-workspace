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

  // 11. Test Auto-Invocation of Multi-Function Test Scripts in Worker Execution Wrapper
  await runTest('Worker loader auto-invokes top-level functions when no explicit run/main is called', async () => {
    const { buildOnMessageHandler } = await import('../src/lib/worker-runner.ts');

    const onMessageCode = buildOnMessageHandler();
    assert.ok(onMessageCode.includes('__autoResults__'), 'Includes autoResults map');
    assert.ok(onMessageCode.includes('__fnRegex__'), 'Includes runtime function name regex');
  });

  // 12. Test Execution Simulation of the 4 Uninvoked Functions Script
  await runTest('Simulate multi-function uninvoked script auto-executing all 4 functions', async () => {
    const userScript = `
      function testNodeGlobals(encodeString = "Hello Sandbox", envVar = "NODE_ENV") {
          const buf = typeof Buffer !== "undefined" ? Buffer.from(encodeString).toString('base64') : "Buffer not defined";
          const env = typeof process !== "undefined" ? process.env[envVar] || "Env var not found" : "Process not defined";
          return { buf, env };
      }

      function testCoreModules({ algorithm = "sha256", data = "test data" } = {}) {
          const crypto = require('crypto');
          const hashResult = crypto.createHash(algorithm).update(data).digest('hex');
          return { hashResult };
      }
    `;

    const mockCurrentFilePath = 'test-node-globals.js';
    const __dirname = '.';
    const __filename = mockCurrentFilePath;
    const dirname = __dirname;
    const filename = __filename;
    const global = globalThis;
    const module = { exports: {}, id: mockCurrentFilePath, filename: mockCurrentFilePath, path: __dirname, paths: [], loaded: false, children: [] };
    const exports = module.exports;
    const process = { env: { NODE_ENV: 'test-environment' }, argv: ['node', mockCurrentFilePath] };
    const Buffer = BufferPolyfill;
    const crypto = await import('crypto');
    const require = function(id) { if (id === 'crypto') return crypto; return {}; };
    const workspace = {};

    const scriptFunc = new Function(
      '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global', '__code_source__',
      `return (async () => {
        ${userScript}
        if (typeof run === "function") return await run(__workspace_args__);
        if (typeof module.exports === "function") return await module.exports(__workspace_args__);
        
        var __autoResults__ = {};
        var __fnNames__ = [];
        var __rawCodeStr = (typeof __code_source__ === "string") ? __code_source__ : "";
        var __fnRegex__ = /(?:^|\\n)\\s*(?:async\\s+)?function\\s*([a-zA-Z0-9_$]+)/g;
        var __fnMatch__;
        while ((__fnMatch__ = __fnRegex__.exec(__rawCodeStr)) !== null) {
          if (__fnMatch__[1] && __fnNames__.indexOf(__fnMatch__[1]) === -1) { __fnNames__.push(__fnMatch__[1]); }
        }
        for (var f = 0; f < __fnNames__.length; f++) {
          var fnName = __fnNames__[f];
          try {
            var fn = eval(fnName);
            if (typeof fn === "function") {
              var fnStr = fn.toString();
              var isDestructured = /^[^(]*\\(\\s*\\{/.test(fnStr);
              if (isDestructured) {
                __autoResults__[fnName] = await fn(__workspace_args__);
              } else {
                var paramNames = [];
                var paramMatch = fnStr.match(/^[^(]*\\(([^)]*)\\)/);
                if (paramMatch && paramMatch[1]) {
                  var rawParams = paramMatch[1].split(",");
                  for (var p = 0; p < rawParams.length; p++) {
                    var pName = rawParams[p].split("=")[0].trim().replace(/^\\.\\.\\./, "");
                    if (pName) paramNames.push(pName);
                  }
                }
                if (paramNames.length > 0 && __workspace_args__ && typeof __workspace_args__ === "object") {
                  var callArgs = paramNames.map(function(k) { return __workspace_args__[k]; });
                  __autoResults__[fnName] = await fn.apply(null, callArgs);
                } else {
                  __autoResults__[fnName] = await fn(__workspace_args__);
                }
              }
            }
          } catch(e) {
            console.error("Error executing " + fnName + ":", e.message);
          }
        }
        if (Object.keys(__autoResults__).length > 0) {
          return __autoResults__;
        }
        return module.exports;
      })();`
    );

    const result = await scriptFunc(
      { encodeString: 'Hello Sandbox', envVar: 'NODE_ENV', algorithm: 'sha256', data: 'test data' },
      require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global, userScript
    );

    assert.ok(result.testNodeGlobals, 'testNodeGlobals was executed');
    assert.strictEqual(result.testNodeGlobals.buf, 'SGVsbG8gU2FuZGJveA==');
    assert.strictEqual(result.testNodeGlobals.env, 'test-environment');

    assert.ok(result.testCoreModules, 'testCoreModules was executed');
    assert.ok(result.testCoreModules.hashResult, 'hashResult generated');
  });

  // 13. Test JSON String Parsing into Actual Array/Object and Generator Iteration
  await runTest('Simulate port scan with JSON string array and generator sequence', async () => {
    const portScript = `
      async function simulatePortScan(target = "192.168.1.1", ports = [22, 80, 443], timeoutMs = 10) {
          const scannedPorts = [];
          for (let i = 0; i < ports.length; i++) {
              scannedPorts.push(ports[i]);
          }
          return { target, scanned: scannedPorts.length, scannedPorts };
      }

      function* generateHexSequence(seed = 0x1A, iterations = 3) {
          let current = seed;
          for (let i = 0; i < iterations; i++) {
              yield current.toString(16).toUpperCase();
              current = (current * 16807) % 2147483647; 
          }
      }
    `;

    const mockCurrentFilePath = 'port-scanner.js';
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

    const scriptFunc = new Function(
      '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global', '__code_source__',
      `return (async () => {
        ${portScript}
        if (typeof run === "function") return await run(__workspace_args__);
        if (typeof module.exports === "function") return await module.exports(__workspace_args__);

        function __safeParseJson(val) {
          if (typeof val === "string") {
            var t = val.trim();
            if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
              try { return JSON.parse(val); } catch(e) {
                try { var fixed = val.replace(/([a-zA-Z0-9_$]+)\\s*:/g, '"$1":').replace(/'/g, '"'); return JSON.parse(fixed); } catch(e2) { return val; }
              }
            }
          }
          return val;
        }

        if (__workspace_args__ && typeof __workspace_args__ === "object") {
          Object.keys(__workspace_args__).forEach(function(k) { __workspace_args__[k] = __safeParseJson(__workspace_args__[k]); });
        }
        
        var __autoResults__ = {};
        var __fnNames__ = [];
        var __rawCodeStr = (typeof __code_source__ === "string") ? __code_source__ : "";
        var __fnRegex__ = /(?:^|\\n)\\s*(?:async\\s+)?function(?:\\s*\\*)?\\s*([a-zA-Z0-9_$]+)/g;
        var __fnMatch__;
        while ((__fnMatch__ = __fnRegex__.exec(__rawCodeStr)) !== null) {
          if (__fnMatch__[1] && __fnNames__.indexOf(__fnMatch__[1]) === -1) { __fnNames__.push(__fnMatch__[1]); }
        }
        for (var f = 0; f < __fnNames__.length; f++) {
          var fnName = __fnNames__[f];
          try {
            var fn = eval(fnName);
            if (typeof fn === "function") {
              var fnStr = fn.toString();
              var isDestructured = /^[^(]*\\(\\s*\\{/.test(fnStr);
              var res;
              if (isDestructured) {
                res = await fn(__workspace_args__);
              } else {
                var paramNames = [];
                var paramMatch = fnStr.match(/^[^(]*\\(([^)]*)\\)/);
                if (paramMatch && paramMatch[1]) {
                  var rawParams = paramMatch[1].split(",");
                  for (var p = 0; p < rawParams.length; p++) {
                    var pName = rawParams[p].split("=")[0].trim().replace(/^\\.\\.\\./, "");
                    if (pName) paramNames.push(pName);
                  }
                }
                if (paramNames.length > 0 && __workspace_args__ && typeof __workspace_args__ === "object") {
                  var callArgs = paramNames.map(function(k) { return __safeParseJson(__workspace_args__[k]); });
                  res = await fn.apply(null, callArgs);
                } else {
                  res = await fn(__workspace_args__);
                }
              }
              if (res && typeof res.next === "function" && typeof res[Symbol.iterator] === "function") {
                var genItems = [];
                var step;
                while (!(step = res.next()).done) { genItems.push(step.value); }
                __autoResults__[fnName] = genItems;
              } else {
                __autoResults__[fnName] = res;
              }
            }
          } catch(e) {
            console.error("Error executing " + fnName + ":", e.message);
          }
        }
        if (Object.keys(__autoResults__).length > 0) {
          return __autoResults__;
        }
        return module.exports;
      })();`
    );

    // Pass ports as a multiline JSON string as received from form textarea
    const rawFormArgs = {
      target: '192.168.1.1',
      ports: '[\n  22,\n  80,\n  443\n]',
      timeoutMs: 10
    };

    const result = await scriptFunc(
      rawFormArgs,
      require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global, portScript
    );

    assert.ok(result.simulatePortScan, 'simulatePortScan executed');
    assert.strictEqual(result.simulatePortScan.scanned, 3, 'Scanned exactly 3 ports');
    assert.deepStrictEqual(result.simulatePortScan.scannedPorts, [22, 80, 443], 'Parsed JSON string to real numbers [22, 80, 443]');

    assert.ok(result.generateHexSequence, 'generateHexSequence generator executed');
    assert.strictEqual(result.generateHexSequence.length, 3, 'Yielded 3 iterations');
    assert.strictEqual(result.generateHexSequence[0], '1A', 'Yielded correct first hex value');
  });

  // 14. Test Nested Inner Functions (e.g. generateHexSequence inside testGeneratorExecution)
  await runTest('Simulate nested inner generator helper function without out-of-scope errors', async () => {
    const { parseScriptOptions } = await import('../src/lib/parser.ts');

    const nestedScript = `
      function testGeneratorExecution(seed = 0x1A, iterations = 5) {
          function* generateHexSequence(s, iters) {
              let current = s;
              for (let i = 0; i < iters; i++) {
                  yield current.toString(16).toUpperCase();
                  current = (current * 16807) % 2147483647; 
              }
          }
          const iterator = generateHexSequence(seed, iterations);
          const results = [];
          for (let val of iterator) {
              results.push(val);
          }
          return results;
      }
    `;

    // Ensure parser only extracted top-level parameters (seed, iterations), NOT inner helper params (s, iters)
    const meta = parseScriptOptions(nestedScript);
    const keys = meta.options.map(o => o.key);
    assert.ok(keys.includes('seed'), 'Detected top-level seed');
    assert.ok(keys.includes('iterations'), 'Detected top-level iterations');
    assert.strictEqual(keys.includes('s'), false, 'Inner nested param s is NOT extracted');
    assert.strictEqual(keys.includes('iters'), false, 'Inner nested param iters is NOT extracted');
  });

  // 15. Test BigInt literals, Symbols, TypedArrays, and ES6 Collections in Defaults
  await runTest('Simulate BigInt math, Symbols, TypedArray lengths, and Sets/Maps in defaults', async () => {
    const cryptoScript = `
      function testCryptographicPrimitives(
          primeModulus = 2147483647n,
          multiplier = 16807n,
          sessionToken = Symbol("auth_session")
      ) {
          const result = primeModulus * multiplier;
          return { result: result.toString(), desc: sessionToken.description, isSymbol: typeof sessionToken === 'symbol' };
      }

      function testMemoryStructures(
          byteStream = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]),
          iocs = new Set(["10.0.0.5", "malicious.local", "10.0.0.5"]),
          metadata = new Map([["threat_level", "high"], ["analyzed", true]])
      ) {
          return {
              byteLength: byteStream.length,
              iocsCount: iocs.size,
              metaObj: Object.fromEntries(metadata)
          };
      }
    `;

    const mockCurrentFilePath = 'crypto-test.js';
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

    const scriptFunc = new Function(
      '__workspace_args__', 'require', 'workspace', 'process', 'Buffer', '__dirname', '__filename', 'dirname', 'filename', 'module', 'exports', 'global', '__code_source__',
      `return (async () => {
        ${cryptoScript}
        if (typeof run === "function") return await run(__workspace_args__);
        if (typeof module.exports === "function") return await module.exports(__workspace_args__);

        function __safeEvalValue(val) {
          if (typeof val === "string") {
            var t = val.trim();
            if (!t) return val;
            if (/^-?\\d+n$/.test(t)) {
              try { return BigInt(t.slice(0, -1)); } catch(e) {}
            }
            if (/^0x[0-9a-fA-F]+$/i.test(t) || /^0b[01]+$/i.test(t) || /^0o[0-7]+$/i.test(t)) {
              try { return Number(t); } catch(e) {}
            }
            if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
              try { return JSON.parse(val); } catch(e) {
                try { var fixed = val.replace(/([a-zA-Z0-9_$]+)\\s*:/g, '"$1":').replace(/'/g, '"'); return JSON.parse(fixed); } catch(e2) {}
              }
            }
            if (/^(?:Symbol|new\\s+(?:Uint8Array|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigInt64Array|BigUint64Array|Uint8ClampedArray|ArrayBuffer|Set|Map|WeakSet|WeakMap|Date|RegExp|Error)|Buffer\\.from)\\b/.test(t)) {
              try { var evalFunc = new Function("Buffer", "return (" + t + ");"); var b = typeof Buffer !== "undefined" ? Buffer : (typeof self !== "undefined" && self.Buffer ? self.Buffer : null); return evalFunc(b); } catch(e) {}
            }
          }
          return val;
        }

        if (__workspace_args__ && typeof __workspace_args__ === "object") {
          Object.keys(__workspace_args__).forEach(function(k) { __workspace_args__[k] = __safeEvalValue(__workspace_args__[k]); });
        }
        
        var __autoResults__ = {};
        var __fnNames__ = [];
        var __rawCodeStr = (typeof __code_source__ === "string") ? __code_source__ : "";
        var __fnRegex__ = /(?:^|\\n)\\s*(?:async\\s+)?function(?:\\s*\\*)?\\s*([a-zA-Z0-9_$]+)/g;
        var __fnMatch__;
        while ((__fnMatch__ = __fnRegex__.exec(__rawCodeStr)) !== null) {
          if (__fnMatch__[1] && __fnNames__.indexOf(__fnMatch__[1]) === -1) { __fnNames__.push(__fnMatch__[1]); }
        }
        for (var f = 0; f < __fnNames__.length; f++) {
          var fnName = __fnNames__[f];
          var fn = null;
          try { fn = eval(fnName); } catch(e) { continue; }
          if (typeof fn !== "function") continue;
          try {
            var fnStr = fn.toString();
            var isDestructured = /^[^(]*\\(\\s*\\{/.test(fnStr);
            var res;
            if (isDestructured) {
              res = await fn(__workspace_args__);
            } else {
              var paramNames = [];
              var paramMatch = fnStr.match(/^[^(]*\\(([^)]*)\\)/);
              if (paramMatch && paramMatch[1]) {
                var rawParams = paramMatch[1].split(",");
                for (var p = 0; p < rawParams.length; p++) {
                  var pName = rawParams[p].split("=")[0].trim().replace(/^\\.\\.\\./, "");
                  if (pName) paramNames.push(pName);
                }
              }
              if (paramNames.length > 0 && __workspace_args__ && typeof __workspace_args__ === "object") {
                var callArgs = paramNames.map(function(k) { return __safeEvalValue(__workspace_args__[k]); });
                res = await fn.apply(null, callArgs);
              } else {
                res = await fn(__workspace_args__);
              }
            }
            if (res && typeof res.next === "function" && typeof res[Symbol.iterator] === "function") {
              var genItems = [];
              var step;
              while (!(step = res.next()).done) { genItems.push(step.value); }
              __autoResults__[fnName] = genItems;
            } else {
              __autoResults__[fnName] = res;
            }
          } catch(e) {
            console.error("Error executing " + fnName + ":", e.message);
          }
        }
        if (Object.keys(__autoResults__).length > 0) {
          return __autoResults__;
        }
        return module.exports;
      })();`
    );

    // Pass default raw strings as extracted by parser from UI form
    const rawFormArgs = {
      primeModulus: '2147483647n',
      multiplier: '16807n',
      sessionToken: 'Symbol("auth_session")',
      byteStream: 'new Uint8Array([0x4D, 0x5A, 0x90, 0x00])',
      iocs: 'new Set(["10.0.0.5", "malicious.local", "10.0.0.5"])',
      metadata: 'new Map([["threat_level", "high"], ["analyzed", true]])'
    };

    const result = await scriptFunc(
      rawFormArgs,
      require, workspace, process, Buffer, __dirname, __filename, dirname, filename, module, exports, global, cryptoScript
    );

    assert.ok(result.testCryptographicPrimitives, 'testCryptographicPrimitives executed');
    assert.strictEqual(result.testCryptographicPrimitives.result, '36092757655129', 'BigInt math calculated correctly');
    assert.strictEqual(result.testCryptographicPrimitives.desc, 'auth_session', 'Symbol description retained');
    assert.strictEqual(result.testCryptographicPrimitives.isSymbol, true, 'typeof sessionToken is symbol');

    assert.ok(result.testMemoryStructures, 'testMemoryStructures executed');
    assert.strictEqual(result.testMemoryStructures.byteLength, 4, 'ByteStream length is 4 (real Uint8Array, not string length 40)');
    assert.strictEqual(result.testMemoryStructures.iocsCount, 2, 'Unique IOCs count is 2 (real Set)');
    assert.strictEqual(result.testMemoryStructures.metaObj.threat_level, 'high', 'Map threat_level is high');
  });

  console.log('==================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('==================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
