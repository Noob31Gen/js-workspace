import assert from 'node:assert';
import { parseScriptOptions } from '../src/lib/parser.ts';
import { BufferPolyfill, cryptoPolyfill } from '../src/lib/node-polyfills.ts';

console.log('==================================================');
console.log('   TESTING AST PARSER & NODE STANDARD POLYFILLS   ');
console.log('==================================================');

let passCount = 0;
let failCount = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`, err.message);
    failCount++;
  }
}

async function main() {
  // 1. Acorn Standard JavaScript Parsing
  await runTest('Acorn parses standard JS functions, defaults, and destructuring', () => {
    const code = `
      function testNetwork(
        host = "127.0.0.1",
        port = 8080,
        useTls = true,
        credentials = { user: "admin", pass: "secret" }
      ) {
        return { host, port, useTls };
      }
    `;
    const meta = parseScriptOptions(code);
    assert.strictEqual(meta.options.length, 4);

    const hostOpt = meta.options.find(o => o.key === 'host');
    assert.strictEqual(hostOpt?.type, 'string');
    assert.strictEqual(hostOpt?.default, '127.0.0.1');

    const portOpt = meta.options.find(o => o.key === 'port');
    assert.strictEqual(portOpt?.type, 'number');
    assert.strictEqual(portOpt?.default, 8080);

    const tlsOpt = meta.options.find(o => o.key === 'useTls');
    assert.strictEqual(tlsOpt?.type, 'boolean');
    assert.strictEqual(tlsOpt?.default, true);
  });

  // 2. Acorn Aliased & Nested Destructuring
  await runTest('Acorn parses aliased & nested object destructuring', () => {
    const code = `
      function testDestructuring({
        host,
        port = 3000,
        timeout: msTimeout = 5000,
        credentials: { user, pass } = {}
      } = {}) {}
    `;
    const meta = parseScriptOptions(code);
    assert.ok(meta.options.some(o => o.key === 'host'));
    assert.ok(meta.options.some(o => o.key === 'port' && o.default === 3000));
    assert.ok(meta.options.some(o => o.key === 'timeout' && o.default === 5000));
    assert.ok(meta.options.some(o => o.key === 'user'));
    assert.ok(meta.options.some(o => o.key === 'pass'));
  });

  // 3. Babel Fallback: TypeScript Type Annotations
  await runTest('Babel fallback parses TypeScript type annotations', () => {
    const tsCode = `
      interface ScanOptions {
        timeout: number;
      }

      function scanTarget(
        target: string,
        port: number = 443,
        enableSsl: boolean = true,
        extraIocs: string[] = ["10.0.0.1"]
      ): void {
        console.log({ target, port });
      }
    `;
    const meta = parseScriptOptions(tsCode);
    assert.strictEqual(meta.options.length, 4, 'Detected all 4 TS parameters');

    const targetOpt = meta.options.find(o => o.key === 'target');
    assert.strictEqual(targetOpt?.type, 'string', 'target inferred as string from TSStringKeyword');

    const portOpt = meta.options.find(o => o.key === 'port');
    assert.strictEqual(portOpt?.type, 'number', 'port inferred as number from TSNumberKeyword');
    assert.strictEqual(portOpt?.default, 443);

    const sslOpt = meta.options.find(o => o.key === 'enableSsl');
    assert.strictEqual(sslOpt?.type, 'boolean', 'enableSsl inferred as boolean from TSBooleanKeyword');
    assert.strictEqual(sslOpt?.default, true);
  });

  // 4. Babel Fallback: JSX Syntax
  await runTest('Babel fallback parses JSX component syntax without errors', () => {
    const jsxCode = `
      function renderBadge(label = "Active", count = 5) {
        return <div className="badge">{label} ({count})</div>;
      }
    `;
    const meta = parseScriptOptions(jsxCode);
    assert.strictEqual(meta.options.length, 2, 'Detected JSX function parameters');
  });

  // 5. Static Socket Linter: net.connect warning
  await runTest('Static security linter flags net.connect and require("net") with friendly notice', () => {
    const socketCode = `
      const net = require('net');

      function scan(target = "192.168.1.1", port = 22) {
        const client = net.connect(port, target);
        client.on('connect', () => console.log('Connected!'));
      }
    `;
    const meta = parseScriptOptions(socketCode);
    assert.ok(meta.warnings && meta.warnings.length > 0, 'Warning generated');
    assert.ok(meta.warnings[0].includes('socket connections'), 'Warning mentions socket connections');
    assert.ok(meta.warnings[0].includes('browser security policies'), 'Warning explains browser security');
  });

  // 6. Node.js Standard Buffer: readUInt32BE and indexing
  await runTest('BufferPolyfill supports full Node.js Buffer specification', () => {
    const buf = BufferPolyfill.alloc(8);
    buf.writeUInt32BE(0x12345678, 0);
    buf.writeUInt32LE(0xDEADBEEF, 4);

    assert.strictEqual(buf.readUInt32BE(0), 0x12345678, 'readUInt32BE matches');
    assert.strictEqual(buf.readUInt32LE(4), 0xDEADBEEF, 'readUInt32LE matches');

    // Indexing
    assert.strictEqual(buf[0], 0x12, 'buf[0] indexing matches');
    assert.strictEqual(buf[1], 0x34, 'buf[1] indexing matches');

    // Slice & toString
    const strBuf = BufferPolyfill.from('Hello Buffer World');
    assert.strictEqual(strBuf.slice(0, 5).toString('utf8'), 'Hello', 'Buffer slice and utf8 toString match');
    assert.strictEqual(BufferPolyfill.from('4d5a9000', 'hex').toString('hex'), '4d5a9000', 'Hex encoding matches');
  });

  // 7. Node.js Standard Crypto: Real SHA-256, SHA-1, and MD5 Hashes
  await runTest('crypto.createHash produces verified SHA-256, SHA-1, and MD5 digests', () => {
    // Official test vector for "hello":
    // SHA-256: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    // SHA-1:   aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d
    // MD5:     5d41402abc4b2a76b9719d911017c592

    const sha256Hash = cryptoPolyfill.createHash('sha256').update('hello').digest('hex');
    assert.strictEqual(sha256Hash, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', 'SHA-256 matches NIST vector');

    const sha1Hash = cryptoPolyfill.createHash('sha1').update('hello').digest('hex');
    assert.strictEqual(sha1Hash, 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d', 'SHA-1 matches standard vector');

    const md5Hash = cryptoPolyfill.createHash('md5').update('hello').digest('hex');
    assert.strictEqual(md5Hash, '5d41402abc4b2a76b9719d911017c592', 'MD5 matches standard vector');
  });

  // 8. Union Literals -> Select Dropdowns (TypeScript & JSDoc)
  await runTest('Union string literals auto-generate Select dropdown options', () => {
    const tsUnionCode = `
      function generateReport(
        format: 'json' | 'csv' | 'xml' = 'json',
        mode: 'fast' | 'thorough' = 'fast'
      ) {}
    `;
    const meta = parseScriptOptions(tsUnionCode);
    const fmtOpt = meta.options.find(o => o.key === 'format');
    assert.strictEqual(fmtOpt?.type, 'select');
    assert.deepStrictEqual(fmtOpt?.options, ['json', 'csv', 'xml']);
    assert.strictEqual(fmtOpt?.default, 'json');

    const modeOpt = meta.options.find(o => o.key === 'mode');
    assert.strictEqual(modeOpt?.type, 'select');
    assert.deepStrictEqual(modeOpt?.options, ['fast', 'thorough']);
  });

  // 9. process.env Auto-Detection
  await runTest('process.env variables are automatically detected with ENV badge', () => {
    const envCode = `
      const apiKey = process.env.API_KEY || 'default-key';
      const port = Number(process.env.PORT || 8080);
      const isDebug = process.env.DEBUG === 'true';
    `;
    const meta = parseScriptOptions(envCode);
    const keyOpt = meta.options.find(o => o.key === 'API_KEY');
    assert.ok(keyOpt, 'Detected API_KEY');
    assert.strictEqual(keyOpt?.source, 'env');

    const portOpt = meta.options.find(o => o.key === 'PORT');
    assert.ok(portOpt, 'Detected PORT');
    assert.strictEqual(portOpt?.type, 'number');
    assert.strictEqual(portOpt?.source, 'env');
  });

  // 10. Top-Level Config Object Auto-Detection
  await runTest('Top-level config / settings objects are automatically detected', () => {
    const configCode = `
      export const config = {
        endpoint: 'https://api.example.com',
        maxRetries: 5,
        enableCache: true,
        themeColor: '#3b82f6'
      };
    `;
    const meta = parseScriptOptions(configCode);
    assert.strictEqual(meta.options.length, 4);

    const epOpt = meta.options.find(o => o.key === 'endpoint');
    assert.strictEqual(epOpt?.default, 'https://api.example.com');
    assert.strictEqual(epOpt?.source, 'config');

    const colorOpt = meta.options.find(o => o.key === 'themeColor');
    assert.strictEqual(colorOpt?.type, 'color');
  });

  // 11. Yargs Option Auto-Detection
  await runTest('Yargs .option() calls are automatically detected', () => {
    const yargsCode = `
      const yargs = require('yargs');
      yargs.option('timeout', { type: 'number', default: 5000, describe: 'Request timeout' });
    `;
    const meta = parseScriptOptions(yargsCode);
    const timeoutOpt = meta.options.find(o => o.key === 'timeout');
    assert.ok(timeoutOpt);
    assert.strictEqual(timeoutOpt?.type, 'number');
    assert.strictEqual(timeoutOpt?.default, 5000);
  });

  // 12. Filtering Runtime-Evaluated Expressions
  await runTest('Dynamic runtime expressions (new ..., tagged templates, closures, binary math) are not auto-detected as form inputs', () => {
    const complexCode = `
      function testAdvancedGlobals(
        query = sanitizeQuery\`SELECT data FROM logs WHERE ip = \${"10.0.0.1' OR 1=1"}\`,
        formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' })
      ) {}

      function testParameterScope(
        baseKey = 0x5A,
        derivedKey = baseKey ^ 0xFF,
        encoderFn = (data) => data.map(b => b ^ derivedKey)
      ) {}
    `;
    const meta = parseScriptOptions(complexCode);
    // query, formatter, derivedKey, encoderFn must all be skipped!
    // Only baseKey (0x5A = 90) should be detected!
    assert.strictEqual(meta.options.length, 1, 'Only primitive baseKey is detected');
    assert.strictEqual(meta.options[0].key, 'baseKey');
    assert.strictEqual(meta.options[0].default, 90);
  });

  console.log('==================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('==================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
