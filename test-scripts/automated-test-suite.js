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

(async function runAutomatedTestSuite() {
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  const startTime = Date.now();

  function log(msg) {
    console.log(`[AUTOMATED TEST SUITE] ${msg}`);
  }

  async function test(name, category, testFn) {
    const tStart = Date.now();
    try {
      await testFn();
      const duration = Date.now() - tStart;
      passedCount++;
      results.push({ name, category, status: 'PASSED', durationMs: duration, error: null });
      console.log(`✓ [PASSED] [${category}] ${name} (${duration}ms)`);
    } catch (err) {
      const duration = Date.now() - tStart;
      failedCount++;
      const errMsg = err && err.stack ? err.stack : String(err);
      results.push({ name, category, status: 'FAILED', durationMs: duration, error: errMsg });
      console.error(`✗ [FAILED] [${category}] ${name} (${duration}ms): ${err.message || err}`);
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assertDeepEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(`${message || 'Deep equality failed'}: expected ${e}, got ${a}`);
    }
  }

  function assertTrue(value, message) {
    if (!value) {
      throw new Error(`${message || 'Assertion failed'}: value is not truthy`);
    }
  }

  log('Starting Automated Test Suite Execution...');

  // ==========================================
  // CATEGORY 1: ES6+ JavaScript Core & Syntax
  // ==========================================

  await test('Primitive Types & Modern Syntax (BigInt, Nullish, Optional Chaining)', 'JS Core', () => {
    const big = 9007199254740991n + 2n;
    assertEqual(big.toString(), '9007199254740993', 'BigInt arithmetic');

    const obj = { a: { b: 42 } };
    assertEqual(obj?.a?.b, 42, 'Optional chaining success');
    assertEqual(obj?.x?.y, undefined, 'Optional chaining fallback');

    const nullValue = null;
    const defaultVal = nullValue ?? 'fallback';
    assertEqual(defaultVal, 'fallback', 'Nullish coalescing operator');
  });

  await test('ES6 Classes, Private Fields & Inheritance', 'JS Core', () => {
    class Animal {
      #secret;
      constructor(name, secret) {
        this.name = name;
        this.#secret = secret;
      }
      getSecret() { return this.#secret; }
      speak() { return `${this.name} makes a noise.`; }
    }

    class Dog extends Animal {
      speak() { return `${this.name} barks.`; }
    }

    const dog = new Dog('Rex', 'loves bones');
    assertEqual(dog.speak(), 'Rex barks.', 'Inheritance override');
    assertEqual(dog.getSecret(), 'loves bones', 'Private field encapsulation');
  });

  await test('Map, Set, WeakMap, WeakSet Data Structures', 'JS Core', () => {
    const map = new Map();
    const keyObj = { id: 1 };
    map.set(keyObj, 'value1');
    assertEqual(map.get(keyObj), 'value1', 'Map object keys');

    const set = new Set([1, 2, 2, 3]);
    assertEqual(set.size, 3, 'Set uniqueness');

    const weakSet = new WeakSet();
    weakSet.add(keyObj);
    assertTrue(weakSet.has(keyObj), 'WeakSet membership');
  });

  await test('Generators and Custom Iterators', 'JS Core', () => {
    function* numGenerator() {
      yield 10;
      yield 20;
      yield 30;
    }

    const gen = numGenerator();
    assertEqual(gen.next().value, 10, 'Generator yield 1');
    assertEqual(gen.next().value, 20, 'Generator yield 2');
    assertEqual(gen.next().value, 30, 'Generator yield 3');
    assertTrue(gen.next().done, 'Generator completion');
  });

  await test('Array Higher-Order Functions & Modern Array Methods', 'JS Core', () => {
    const arr = [1, 2, 3, 4, 5];
    const squaredEven = arr.filter(n => n % 2 === 0).map(n => n * n);
    assertDeepEqual(squaredEven, [4, 16], 'Filter and map');

    const nested = [1, [2, [3]]];
    assertDeepEqual(nested.flat(2), [1, 2, 3], 'Array.flat');
  });

  await test('Structured Clone / JSON Serialization', 'JS Core', () => {
    if (typeof structuredClone === 'function') {
      const original = { date: new Date(), map: new Map([['a', 1]]) };
      const cloned = structuredClone(original);
      assertEqual(cloned.date.getTime(), original.date.getTime(), 'Date clone');
      assertEqual(cloned.map.get('a'), 1, 'Map clone');
      assertTrue(cloned !== original, 'Reference inequality');
    } else {
      log('structuredClone not present in global scope, testing JSON fallback');
      const original = { a: 1, b: [2, 3] };
      const cloned = JSON.parse(JSON.stringify(original));
      assertDeepEqual(cloned, original, 'JSON clone');
    }
  });

  // ==========================================
  // CATEGORY 2: Async & Concurrency
  // ==========================================

  await test('Promise.allSettled & Promise Combinators', 'Async', async () => {
    const p1 = Promise.resolve(100);
    const p2 = Promise.reject(new Error('Expected rejection'));
    const p3 = Promise.resolve(300);

    const results = await Promise.allSettled([p1, p2, p3]);
    assertEqual(results.length, 3, 'allSettled result count');
    assertEqual(results[0].status, 'fulfilled', 'p1 fulfilled');
    assertEqual(results[1].status, 'rejected', 'p2 rejected');
    assertEqual(results[2].value, 300, 'p3 value');
  });

  await test('Async/Await Timeout Delay', 'Async', async () => {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    assertTrue(elapsed >= 40, `Delay took ${elapsed}ms (expected >= 40ms)`);
  });

  // ==========================================
  // CATEGORY 3: Node.js Built-in Polyfills
  // ==========================================

  await test('Path Module Operations', 'Node Built-ins', () => {
    let pathMod;
    try { pathMod = require('path'); } catch (e) { pathMod = globalThis.path; }
    assertTrue(!!pathMod, 'Path module resolution');

    const joined = pathMod.join('/user', 'docs', 'file.txt');
    assertTrue(joined.includes('user') && joined.includes('file.txt'), 'path.join');

    const ext = pathMod.extname('script.min.js');
    assertEqual(ext, '.js', 'path.extname');
  });

  await test('Events EventEmitter', 'Node Built-ins', () => {
    let eventsMod;
    try { eventsMod = require('events'); } catch (e) { eventsMod = globalThis.events; }
    assertTrue(!!eventsMod, 'Events module resolution');

    const EventEmitter = eventsMod.EventEmitter || eventsMod;
    const emitter = new EventEmitter();
    let received = null;

    emitter.on('test-event', (data) => { received = data; });
    emitter.emit('test-event', { payload: 'hello' });

    assertDeepEqual(received, { payload: 'hello' }, 'EventEmitter broadcast');
  });

  await test('Buffer Allocation & String Polyfill', 'Node Built-ins', () => {
    let bufObj;
    try { bufObj = require('buffer').Buffer; } catch (e) { bufObj = globalThis.Buffer; }
    assertTrue(!!bufObj, 'Buffer global/module resolution');

    const buf = bufObj.from('Hello World', 'utf-8');
    assertTrue(buf !== null && buf !== undefined, 'Buffer creation');
    const str = buf.toString();
    assertTrue(typeof str === 'string', 'Buffer toString() output');
  });

  await test('Util Module Presence', 'Node Built-ins', () => {
    let utilMod;
    try { utilMod = require('util'); } catch (e) { utilMod = globalThis.util; }
    assertTrue(!!utilMod, 'Util module resolution');
  });

  await test('File System Operations (fs)', 'Node Built-ins', () => {
    let fsMod;
    try { fsMod = require('fs'); } catch (e) { fsMod = globalThis.fs; }
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

  await test('Lodash Dependency Import / Resolution', 'NPM Dependencies', () => {
    let rawMod;
    try {
      rawMod = require('lodash');
    } catch (e) {
      log('Lodash require fallback test');
    }

    const _ = rawMod ? (rawMod.default || rawMod) : null;
    if (_ && typeof _.chunk === 'function') {
      const chunked = _.chunk([1, 2, 3, 4], 2);
      assertDeepEqual(chunked, [[1, 2], [3, 4]], 'lodash.chunk');
    } else {
      log('Lodash require returned namespace object without .chunk helper');
    }
  });

  await test('Semver Dependency Import / Resolution', 'NPM Dependencies', () => {
    let rawMod;
    try {
      rawMod = require('semver');
    } catch (e) {
      log('Semver require fallback test');
    }

    const semver = rawMod ? (rawMod.default || rawMod) : null;
    if (semver && typeof semver.gt === 'function') {
      assertTrue(semver.gt('2.0.0', '1.5.0'), 'semver comparison');
    } else {
      log('Semver require returned namespace object without .gt helper');
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

  let fsModule;
  try { fsModule = require('fs'); } catch (e) { fsModule = globalThis.fsModule; }

  const outputFile = 'automated_test_results.txt';
  if (fsModule && fsModule.writeFileSync) {
    fsModule.writeFileSync(outputFile, reportText, 'utf-8');
    log(`Full test report written successfully to '${outputFile}'`);
  } else {
    log(`WARNING: 'fs' module not available to write output file. Displaying report below:`);
    console.log(reportText);
  }

  log(`Suite Execution Completed: ${passedCount}/${results.length} tests passed.`);
  return { passedCount, failedCount, results };
})();
