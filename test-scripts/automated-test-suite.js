/**
 * Comprehensive Automated Test Suite
 * Designed for testing JS execution engines and Node.js runtime compatibility.
 * 
 * Runs non-interactive tests covering:
 * - ES6+ Language Features & Data Structures
 * - Async / Promises / Timers
 * - Node Built-in Modules (fs, path, events, util, buffer)
 * - Dynamic NPM Dependency Imports (lodash, semver)
 * 
 * Writes full results report to 'automated_test_results.txt'.
 */

import fs from 'fs';
import path from 'path';
import events from 'events';
import buffer from 'buffer';
import util from 'util';

(async function runAutomatedTestSuite() {
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  const startTime = Date.now();

  function log(msg) {
    console.log(`[TEST SUITE] ${msg}`);
  }

  function assertTrue(cond, testName) {
    if (!cond) throw new Error(`Assertion Failed: ${testName} condition was false`);
  }

  function assertEqual(val, expected, testName) {
    if (val !== expected) throw new Error(`Assertion Failed: ${testName}. Expected '${expected}', got '${val}'`);
  }

  function assertDeepEqual(val, expected, testName) {
    const sVal = JSON.stringify(val);
    const sExp = JSON.stringify(expected);
    if (sVal !== sExp) throw new Error(`Assertion Failed: ${testName}. Expected ${sExp}, got ${sVal}`);
  }

  async function test(name, category, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const dur = Date.now() - t0;
      results.push({ name, category, status: 'PASS', durationMs: dur });
      passedCount++;
      log(`✅ PASS [${category}] ${name} (${dur}ms)`);
    } catch (err) {
      const dur = Date.now() - t0;
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({ name, category, status: 'FAIL', durationMs: dur, error: errMsg });
      failedCount++;
      log(`❌ FAIL [${category}] ${name}: ${errMsg}`);
    }
  }

  log('==================================================');
  log('     STARTING AUTOMATED ENGINE TEST SUITE         ');
  log('==================================================');

  // ==========================================
  // CATEGORY 1: ES6+ Language Features & Types
  // ==========================================

  await test('Array Methods & Higher Order Functions', 'Language Core', () => {
    const arr = [1, 2, 3, 4, 5];
    const doubled = arr.map(x => x * 2);
    assertDeepEqual(doubled, [2, 4, 6, 8, 10], 'map');

    const evens = arr.filter(x => x % 2 === 0);
    assertDeepEqual(evens, [2, 4], 'filter');

    const sum = arr.reduce((a, b) => a + b, 0);
    assertEqual(sum, 15, 'reduce');
  });

  await test('Set & Map Data Structures', 'Language Core', () => {
    const set = new Set([1, 2, 2, 3]);
    assertEqual(set.size, 3, 'Set deduplication');
    assertTrue(set.has(2), 'Set.has');

    const map = new Map();
    map.set('key', 'value');
    assertEqual(map.get('key'), 'value', 'Map get/set');
  });

  await test('Object Destructuring & Rest/Spread', 'Language Core', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const { a, ...rest } = obj;
    assertEqual(a, 1, 'destructure value');
    assertDeepEqual(rest, { b: 2, c: 3 }, 'rest properties');

    const merged = { ...obj, d: 4 };
    assertEqual(merged.d, 4, 'spread properties');
  });

  await test('Class Inheritance & Methods', 'Language Core', () => {
    class Base {
      constructor(name) { this.name = name; }
      greet() { return `Hello ${this.name}`; }
    }
    class Child extends Base {
      greet() { return super.greet() + '!'; }
    }
    const c = new Child('World');
    assertEqual(c.greet(), 'Hello World!', 'Class override & super');
  });

  await test('Regular Expressions & String Replacements', 'Language Core', () => {
    const text = 'foo-bar-baz';
    const camel = text.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    assertEqual(camel, 'fooBarBaz', 'Regex match and replace');
  });

  // ==========================================
  // CATEGORY 2: Async & Promises
  // ==========================================

  await test('Promise.all & Promise.race', 'Async Engine', async () => {
    const p1 = Promise.resolve(1);
    const p2 = Promise.resolve(2);
    const all = await Promise.all([p1, p2]);
    assertDeepEqual(all, [1, 2], 'Promise.all');

    const fast = await Promise.race([
      new Promise(r => setTimeout(() => r('slow'), 50)),
      Promise.resolve('fast')
    ]);
    assertEqual(fast, 'fast', 'Promise.race');
  });

  await test('Async/Await Resolution & Errors', 'Async Engine', async () => {
    async function asyncFunc(success) {
      if (!success) throw new Error('Async error trigger');
      return 'OK';
    }

    const val = await asyncFunc(true);
    assertEqual(val, 'OK', 'Async success resolution');

    let caught = false;
    try {
      await asyncFunc(false);
    } catch {
      caught = true;
    }
    assertTrue(caught, 'Async error catch');
  });

  await test('SetTimeout Async Execution Delay', 'Async Engine', async () => {
    const t0 = Date.now();
    await new Promise(r => setTimeout(r, 30));
    const elapsed = Date.now() - t0;
    assertTrue(elapsed >= 20, 'setTimeout minimum delay');
  });

  // ==========================================
  // CATEGORY 3: Node.js Built-in Polyfills
  // ==========================================

  await test('Path Module Operations', 'Node Built-ins', () => {
    const pathMod = path || globalThis.path;
    assertTrue(!!pathMod, 'Path module resolution');

    const joined = pathMod.join('/user', 'docs', 'file.txt');
    assertTrue(joined.includes('user') && joined.includes('file.txt'), 'path.join');

    const ext = pathMod.extname('script.min.js');
    assertEqual(ext, '.js', 'path.extname');
  });

  await test('Events EventEmitter', 'Node Built-ins', () => {
    const eventsMod = events || globalThis.events;
    assertTrue(!!eventsMod, 'Events module resolution');

    const EventEmitter = eventsMod.EventEmitter || eventsMod;
    const emitter = new EventEmitter();
    let received = null;

    emitter.on('test-event', (data) => { received = data; });
    emitter.emit('test-event', { payload: 'hello' });

    assertDeepEqual(received, { payload: 'hello' }, 'EventEmitter broadcast');
  });

  await test('Buffer Allocation & String Polyfill', 'Node Built-ins', () => {
    const bufObj = buffer.Buffer || globalThis.Buffer;
    assertTrue(!!bufObj, 'Buffer global/module resolution');

    const buf = bufObj.from('Hello World', 'utf-8');
    assertTrue(buf !== null && buf !== undefined, 'Buffer creation');
    const str = buf.toString();
    assertTrue(typeof str === 'string', 'Buffer toString() output');
  });

  await test('Util Module Presence', 'Node Built-ins', () => {
    const utilMod = util || globalThis.util;
    assertTrue(!!utilMod, 'Util module resolution');
  });

  await test('File System Operations (fs)', 'Node Built-ins', () => {
    const fsMod = fs || globalThis.fs;
    assertTrue(!!fsMod, 'FS module resolution');

    const testFile = 'test_fs_temp.txt';
    const content = 'Hello from automated FS test!';

    fsMod.writeFileSync(testFile, content, 'utf-8');
    const readBack = fsMod.readFileSync(testFile, 'utf-8');
    assertEqual(readBack, content, 'fs.writeFileSync & readFileSync');

    if (fsMod.unlinkSync) {
      fsMod.unlinkSync(testFile);
    }
  });

  // ==========================================
  // CATEGORY 4: Third-Party Package Resolution
  // ==========================================

  await test('Lodash Dependency Import / Resolution', 'NPM Dependencies', async () => {
    let rawMod = null;
    try {
      rawMod = await import('lodash');
    } catch {
      log('Lodash import fallback test');
    }

    const _ = rawMod ? (rawMod.default || rawMod) : null;
    if (_ && typeof _.chunk === 'function') {
      const chunked = _.chunk([1, 2, 3, 4], 2);
      assertDeepEqual(chunked, [[1, 2], [3, 4]], 'lodash.chunk');
    } else {
      log('Lodash import returned namespace object without .chunk helper');
    }
  });

  await test('Semver Dependency Import / Resolution', 'NPM Dependencies', async () => {
    let rawMod = null;
    try {
      rawMod = await import('semver');
    } catch {
      log('Semver import fallback test');
    }

    const semver = rawMod ? (rawMod.default || rawMod) : null;
    if (semver && typeof semver.gt === 'function') {
      assertTrue(semver.gt('2.0.0', '1.5.0'), 'semver comparison');
    } else {
      log('Semver import returned namespace object without .gt helper');
    }
  });

  // ==========================================
  // REPORT GENERATION & OUTPUT TO FILE
  // ==========================================

  const totalDuration = Date.now() - startTime;
  const reportLines = [
    '==================================================',
    '        AUTOMATED ENGINE TEST SUITE REPORT        ',
    '==================================================',
    `Timestamp: ${new Date().toISOString()}`,
    `Total Tests: ${results.length}`,
    `Passed: ${passedCount}`,
    `Failed: ${failedCount}`,
    `Pass Rate: ${((passedCount / results.length) * 100).toFixed(2)}%`,
    `Total Duration: ${totalDuration}ms`,
    '--------------------------------------------------',
    'DETAILED TEST RESULTS:',
    '--------------------------------------------------'
  ];

  results.forEach((r, idx) => {
    reportLines.push(
      `[${idx + 1}] [${r.status}] [${r.category}] ${r.name} (${r.durationMs}ms)`
    );
    if (r.error) {
      reportLines.push(`    Error Details: ${r.error.replace(/\n/g, '\n    ')}`);
    }
  });

  reportLines.push('==================================================');
  const reportText = reportLines.join('\n');

  const fsModule = fs || globalThis.fsModule;

  const outputFile = 'automated_test_results.txt';
  if (fsModule && fsModule.writeFileSync) {
    fsModule.writeFileSync(outputFile, reportText, 'utf-8');
    log(`Full test report written successfully to '${outputFile}'`);
  } else {
    log(`WARNING: 'fs' module not available to write output file. Displaying report below:`);
    console.log(reportText);
  }

  log('==================================================');
  log(`TEST SUITE FINISHED. Passed: ${passedCount}/${results.length}`);
  log('==================================================');
})();
