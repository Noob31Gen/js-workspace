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

// Test transformation logic
function transformScriptCode(code) {
  return code
    .replace(new RegExp('import\\s+\\*\\s+as\\s+([a-zA-Z0-9_$]+)\\s+from\\s+[\'"]([^\'"]+)[\'"]', 'g'), 'const $1 = require("$2");')
    .replace(new RegExp('import\\s+([a-zA-Z0-9_$]+)\\s+from\\s+[\'"]([^\'"]+)[\'"]', 'g'), 'const $1 = (require("$2").default || require("$2"));')
    .replace(new RegExp('import\\s*\\{([^}]+)\\}\\s*from\\s+[\'"]([^\'"]+)[\'"]', 'g'), 'const {$1} = require("$2");')
    .replace(new RegExp('export\\s+default\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)', 'g'), 'async function $1() {}; exports.default = $1;')
    .replace(new RegExp('export\\s+default\\s+function\\s+([a-zA-Z0-9_$]+)', 'g'), 'function $1() {}; exports.default = $1;')
    .replace(new RegExp('export\\s+default\\s+class\\s+([a-zA-Z0-9_$]+)', 'g'), 'class $1 {}; exports.default = $1;')
    .replace(new RegExp('export\\s+default\\s+', 'g'), 'exports.default = ')
    .replace(new RegExp('export\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)', 'g'), 'async function $1')
    .replace(new RegExp('export\\s+function\\s+([a-zA-Z0-9_$]+)', 'g'), 'function $1')
    .replace(new RegExp('export\\s+class\\s+([a-zA-Z0-9_$]+)', 'g'), 'class $1')
    .replace(new RegExp('export\\s+const\\s+([a-zA-Z0-9_$]+)', 'g'), 'const $1')
    .replace(new RegExp('export\\s+let\\s+([a-zA-Z0-9_$]+)', 'g'), 'let $1')
    .replace(new RegExp('export\\s+var\\s+([a-zA-Z0-9_$]+)', 'g'), 'var $1');
}

const scriptCode = fileMap['transfer.js'];
let transformedCode = transformScriptCode(scriptCode);

try {
  const scriptFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer', 
    'return (async () => { ' + transformedCode + ' })();'
  );
  console.log("SUCCESS! transfer.js scriptFunc created cleanly with 0 syntax errors!");
} catch (err) {
  console.error("ERROR CREATING SCRIPT FUNC:", err);
}

// Now test sub-modules
['matcher.js', 'auth.js', 'csv-parser.js', 'ytmusic-api.js'].forEach(modName => {
  const modCode = fileMap[modName];
  let trans = transformScriptCode(modCode);

  const exportFuncMatches = [...modCode.matchAll(new RegExp('export\\s+(?:async\\s+)?function\\s+([a-zA-Z0-9_$]+)', 'g'))];
  for (const m of exportFuncMatches) {
    trans += '\nexports.' + m[1] + ' = ' + m[1] + ';';
  }

  const exportClassMatches = [...modCode.matchAll(new RegExp('export\\s+class\\s+([a-zA-Z0-9_$]+)', 'g'))];
  for (const m of exportClassMatches) {
    trans += '\nexports.' + m[1] + ' = ' + m[1] + ';';
  }

  try {
    const f = new Function('module', 'exports', 'require', 'workspace', 'process', 'Buffer', 
      'return (async () => { ' + trans + ' })();'
    );
    console.log(`SUCCESS! Sub-module ${modName} created cleanly with 0 syntax errors!`);
  } catch (err) {
    console.error(`ERROR IN SUB-MODULE ${modName}:`, err);
  }
});
