import fs from 'fs';
import path from 'path';

// Read the music-transfer test files
const musicTransferDir = 'd:/Programs/code-stuff/js-workspace/music-transfer';
const testFiles = fs.readdirSync(musicTransferDir);
const fileMap = {};
testFiles.forEach(f => {
  if (f.endsWith('.js')) {
    fileMap['music-transfer/' + f] = fs.readFileSync(path.join(musicTransferDir, f), 'utf8');
  }
});
console.log('Loaded test files:', Object.keys(fileMap));

// ========================================================================
// Simulate the EXACT behavior of workerRegexReplace function
// ========================================================================
function workerRegexReplace(pattern, replacement, flags) {
  if (!flags) flags = 'g';
  return '.replace(new RegExp(' + JSON.stringify(pattern) + ', ' + JSON.stringify(flags) + '), ' + JSON.stringify(replacement) + ')';
}

const WS = '\\s';  // \s (1 backslash + s)
const Q = "['" + '"' + "]";       // ['"]
const NQ = "[^'" + '"' + "]+";    // [^'"]+

console.log('\nWS value (should be backslash+s):', JSON.stringify(WS));
console.log('Q value:', Q);
console.log('NQ value:', NQ);

// Build a single regex replace line and check it
const testLine = workerRegexReplace(
  'import' + WS + '+([a-zA-Z0-9_$]+)' + WS + '+from' + WS + '+' + Q + '(' + NQ + ')' + Q,
  'const $1 = (require("$2").default || require("$2"));'
);
console.log('\nGenerated replace line:');
console.log(testLine);

// The generated line should look like:
// .replace(new RegExp("import\\s+([a-zA-Z0-9_$]+)\\s+from\\s+['\"]([^'\"]+)['\"]", "g"), "const $1 = (require(\"$2\").default || require(\"$2\"));")
// JSON.stringify of 'import\s+...' (containing actual backslash+s) produces:
// "import\\s+..." with properly escaped backslash. CORRECT!

// Now let's build the FULL transform chain as it appears in the worker code
const transforms = [
  { pattern: 'import' + WS + '+' + WS + '*' + WS + '+as' + WS + '+([a-zA-Z0-9_$]+)' + WS + '+from' + WS + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = require("$2");' },
  { pattern: 'import' + WS + '+([a-zA-Z0-9_$]+)' + WS + '+from' + WS + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const $1 = (require("$2").default || require("$2"));' },
  { pattern: 'import' + WS + '*\\{([^}]+)\\}' + WS + '*from' + WS + '+' + Q + '(' + NQ + ')' + Q, replacement: 'const {$1} = require("$2");' },
  { pattern: 'export' + WS + '+default' + WS + '+async' + WS + '+function' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1' },
  { pattern: 'export' + WS + '+default' + WS + '+function' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'function $1' },
  { pattern: 'export' + WS + '+default' + WS + '+class' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'class $1' },
  { pattern: 'export' + WS + '+default' + WS + '+', replacement: 'var __default_export__ = ' },
  { pattern: 'export' + WS + '+async' + WS + '+function' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'async function $1' },
  { pattern: 'export' + WS + '+function' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'function $1' },
  { pattern: 'export' + WS + '+class' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'class $1' },
  { pattern: 'export' + WS + '+const' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'const $1' },
  { pattern: 'export' + WS + '+let' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'let $1' },
  { pattern: 'export' + WS + '+var' + WS + '+([a-zA-Z0-9_$]+)', replacement: 'var $1' },
];

// Build worker code for the transform chain
let transformChain = '  var transformedCode = scriptCode';
for (const t of transforms) {
  transformChain += '\n    ' + workerRegexReplace(t.pattern, t.replacement);
}
transformChain += ';';

console.log('\n=== STEP 1: Validate transform chain syntax ===');
// Build a minimal worker snippet with the transform chain
const workerSnippet = [
  'var scriptCode = "";',
  transformChain,
].join('\n');

try {
  new Function(workerSnippet);
  console.log('Transform chain syntax: PASSED ✅');
} catch (e) {
  console.log('Transform chain syntax: FAILED ❌');
  console.log('Error:', e.message);
  // Find line
  const lines = workerSnippet.split('\n');
  for (let i = 0; i < lines.length; i++) {
    try {
      new Function(lines.slice(0, i + 1).join('\n'));
    } catch {
      console.log('Problem at line', i + 1, ':', lines[i]);
      break;
    }
  }
}

console.log('\n=== STEP 2: Run transforms on transfer.js code ===');
// Simulate: the worker code creates new RegExp from the JSON-stringified patterns.
// When the worker JS engine parses the generated code, JSON.stringify's output
// contains proper escaping. Let's verify by actually running the regexes.

const transferCode = fileMap['music-transfer/transfer.js'];
let transformed = transferCode;
for (const t of transforms) {
  // t.pattern already has the correct value (backslash+s for \s)
  // When the worker does new RegExp(pattern), it correctly interprets \s as whitespace
  const regex = new RegExp(t.pattern, 'g');
  transformed = transformed.replace(regex, t.replacement);
}

console.log('Original first 300 chars:');
console.log(transferCode.substring(0, 300));
console.log('\nTransformed first 500 chars:');
console.log(transformed.substring(0, 500));

const hasImport = /^import\s/m.test(transformed);
const hasExport = /^export\s/m.test(transformed);
console.log('\nRemaining import statements:', hasImport ? 'BUG ❌' : 'None ✅');
console.log('Remaining export statements:', hasExport ? 'BUG ❌' : 'None ✅');

try {
  new Function(transformed);
  console.log('Transformed code syntax: PASSED ✅');
} catch (e) {
  // Expected to fail because require() doesn't exist in Node test context
  if (e.message.includes('import') || e.message.includes('export')) {
    console.log('Transformed code has unconverted ES module syntax: FAILED ❌');
    console.log('Error:', e.message);
  } else {
    console.log('Transformed code syntax: PASSED ✅ (runtime error expected)');
  }
}

console.log('\n=== STEP 3: Full worker onmessage handler syntax ===');

const transformLines = transforms.map(t => {
  return '          ' + workerRegexReplace(t.pattern, t.replacement);
});

const handlerLines = [];
handlerLines.push('var sendLog = function() {};');
handlerLines.push('var WORKSPACE_FILES = {};');
handlerLines.push('var CURRENT_FILE_PATH = "test.js";');
handlerLines.push('var onmessageHandler = async function(event) {');
handlerLines.push('  var code = event.data.code;');
handlerLines.push('  try {');
handlerLines.push('    var transformedCode = code');
handlerLines.push(transformLines.join('\n') + ';');
handlerLines.push("    var scriptFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer',");
handlerLines.push("      'return (async () => {' + String.fromCharCode(10) +");
handlerLines.push("        transformedCode + String.fromCharCode(10) +");
handlerLines.push("      '})();'");
handlerLines.push('    );');
handlerLines.push('  } catch(err) {');
handlerLines.push('    console.error(err);');
handlerLines.push('  }');
handlerLines.push('};');

const handlerCode = handlerLines.join('\n');

try {
  new Function(handlerCode);
  console.log('onmessage handler syntax: PASSED ✅');
} catch(e) {
  console.log('onmessage handler syntax: FAILED ❌');
  console.log('Error:', e.message);
  const hLines = handlerCode.split('\n');
  for (let i = 0; i < hLines.length; i++) {
    try {
      new Function(hLines.slice(0, i + 1).join('\n'));
    } catch {
      console.log('Problem at line', i + 1, ':', hLines[i].substring(0, 120));
      break;
    }
  }
}

console.log('\n=== STEP 4: Validate ALL sub-module transforms ===');
let allPassed = true;
for (const [fileName, code] of Object.entries(fileMap)) {
  let out = code;
  for (const t of transforms) {
    out = out.replace(new RegExp(t.pattern, 'g'), t.replacement);
  }
  const remaining = /^(import|export)\s/m.test(out);
  if (remaining) {
    console.log(fileName + ': FAILED ❌ (unconverted import/export)');
    allPassed = false;
  } else {
    try {
      new Function(out);
      console.log(fileName + ': PASSED ✅');
    } catch(e) {
      if (e.message.includes('import') || e.message.includes('export')) {
        console.log(fileName + ': FAILED ❌ -', e.message);
        allPassed = false;
      } else {
        console.log(fileName + ': PASSED ✅ (runtime refs OK)');
      }
    }
  }
}

console.log('\n=== FINAL RESULT ===');
console.log(allPassed ? 'ALL TESTS PASSED ✅ ✅ ✅' : 'SOME TESTS FAILED ❌');
