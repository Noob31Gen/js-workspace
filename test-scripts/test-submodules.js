const fs = require('fs');
const path = require('path');

const musicTransferDir = 'd:/Programs/code-stuff/js-workspace/music-transfer';
const files = fs.readdirSync(musicTransferDir);

const fileMap = {};
files.forEach(f => {
  if (f.endsWith('.js') || f.endsWith('.txt') || f.endsWith('.json')) {
    fileMap[f] = fs.readFileSync(path.join(musicTransferDir, f), 'utf-8');
  }
});

function transformScriptCodeWorker(code) {
  return code
    .replace(/import\s+\*\s+as\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2");')
    .replace(/import\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = (require("$2").default || require("$2"));')
    .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g, 'const {$1} = require("$2");')
    .replace(/export\s+default\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'class $1')
    .replace(/export\s+default\s+/g, 'const __default_export__ = ')
    .replace(/export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
    .replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
    .replace(/export\s+class\s+([a-zA-Z0-9_$]+)/g, 'class $1')
    .replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1')
    .replace(/export\s+let\s+([a-zA-Z0-9_$]+)/g, 'let $1')
    .replace(/export\s+var\s+([a-zA-Z0-9_$]+)/g, 'var $1');
}

const transCodeWithComment = transformScriptCodeWorker(fileMap['transfer.js']) + '\n// End of file comment';

console.log("=== Testing transformed code with trailing // comment WITHOUT newlines ===");
try {
  const badFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer', 
    'return (async () => { ' + transCodeWithComment + ' if (typeof run === "function") { return await run(__workspace_args__); } })();'
  );
  console.log("BAD FUNC OK!");
} catch (e) {
  console.error("EXPECTED FAIL (without newline):", e.message);
}

console.log("=== Testing transformed code with trailing // comment WITH newlines ===");
try {
  const goodFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer', 
    'return (async () => {\n' + transCodeWithComment + '\nif (typeof run === "function") { return await run(__workspace_args__); }\n})();'
  );
  console.log("GOOD FUNC OK! (with newline)");
} catch (e) {
  console.error("FAIL:", e.message);
}
