import { WorkspaceNode } from './workspace-store';

/**
 * Normalizes relative or absolute file paths against a base directory path.
 * Examples:
 *   resolvePath('./math.js', 'utils/formatters.js') -> 'utils/math.js'
 *   resolvePath('../network/client.js', 'utils/formatters.js') -> 'network/client.js'
 *   resolvePath('utils/math.js', '') -> 'utils/math.js'
 */
export function resolveFilePath(targetPath: string, currentFilePath: string = ''): string {
  let cleanTarget = targetPath.trim().replace(/^\//, '');

  // If path doesn't start with . or .., treat as relative to root or current dir
  if (!cleanTarget.startsWith('.')) {
    return cleanTarget;
  }

  // Get current file's directory
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

/**
 * Generates the Web Worker code header containing the `workspace.import`, `workspace.runScript`, and `require` dependency loader.
 */
export function buildWorkerDependencyLoader(nodes: WorkspaceNode[], currentFilePath: string): string {
  const fileMap: Record<string, string> = {};

  nodes.forEach(node => {
    if (node.type === 'file' && node.code !== undefined) {
      fileMap[node.path] = node.code;
    }
  });

  return `
    // Cross-Script Dependency Engine
    const WORKSPACE_FILES = ${JSON.stringify(fileMap)};
    const CURRENT_FILE_PATH = ${JSON.stringify(currentFilePath)};
    const MODULE_CACHE = new Map();
    const CALL_STACK = new Set();

    function resolvePath(targetPath, baseFile) {
      let clean = targetPath.trim().replace(/^\\//, '');
      if (!clean.startsWith('.')) return clean;

      const segments = baseFile ? baseFile.split('/') : [];
      segments.pop();
      const parts = clean.split('/');

      for (const p of parts) {
        if (p === '.') continue;
        if (p === '..') segments.pop();
        else segments.push(p);
      }
      return segments.join('/');
    }

    async function loadWorkspaceModule(requestedPath, baseFile = CURRENT_FILE_PATH) {
      const resolvedPath = resolvePath(requestedPath, baseFile);

      if (MODULE_CACHE.has(resolvedPath)) {
        return MODULE_CACHE.get(resolvedPath);
      }

      if (CALL_STACK.has(resolvedPath)) {
        throw new Error('Circular dependency detected: ' + Array.from(CALL_STACK).join(' -> ') + ' -> ' + resolvedPath);
      }

      const scriptCode = WORKSPACE_FILES[resolvedPath];
      if (scriptCode === undefined) {
        const available = Object.keys(WORKSPACE_FILES).join(', ');
        throw new Error('Module not found: "' + requestedPath + '" (resolved as "' + resolvedPath + '"). Available files: ' + available);
      }

      CALL_STACK.add(resolvedPath);

      const moduleObj = { exports: {} };
      const exportsObj = moduleObj.exports;

      // Transform ES export statements
      let transformedCode = scriptCode
        .replace(/export\\s+default\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'async function $1() {}; exports.default = $1;')
        .replace(/export\\s+default\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'function $1() {}; exports.default = $1;')
        .replace(/export\\s+default\\s+/g, 'exports.default = ')
        .replace(/export\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
        .replace(/export\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'function $1')
        .replace(/export\\s+const\\s+([a-zA-Z0-9_$]+)/g, 'const $1')
        .replace(/export\\s+let\\s+([a-zA-Z0-9_$]+)/g, 'let $1')
        .replace(/export\\s+var\\s+([a-zA-Z0-9_$]+)/g, 'var $1');

      // Extract exported function names and append to exports
      const exportFuncMatches = [...scriptCode.matchAll(/export\\s+(?:async\\s+)?function\\s+([a-zA-Z0-9_$]+)/g)];
      for (const m of exportFuncMatches) {
        transformedCode += '\\nexports.' + m[1] + ' = ' + m[1] + ';';
      }
      const exportVarMatches = [...scriptCode.matchAll(/export\\s+(?:const|let|var)\\s+([a-zA-Z0-9_$]+)/g)];
      for (const m of exportVarMatches) {
        transformedCode += '\\nexports.' + m[1] + ' = ' + m[1] + ';';
      }

      const evalFunc = new Function('module', 'exports', 'require', 'workspace', \`
        return (async () => {
          \${transformedCode}
          if (typeof run === 'function' && !exports.run) {
            exports.run = run;
          }
          return module.exports;
        })();
      \`);

      const scopedRequire = (path) => loadWorkspaceModule(path, resolvedPath);
      const scopedWorkspace = {
        import: (path) => loadWorkspaceModule(path, resolvedPath),
        runScript: async (path, args = {}) => {
          const mod = await loadWorkspaceModule(path, resolvedPath);
          if (typeof mod.run === 'function') {
            return mod.run(args);
          } else if (typeof mod.default === 'function') {
            return mod.default(args);
          }
          throw new Error('Script "' + path + '" does not export a run(args) or default function!');
        }
      };

      const resultExports = await evalFunc(moduleObj, exportsObj, scopedRequire, scopedWorkspace);

      CALL_STACK.delete(resolvedPath);
      MODULE_CACHE.set(resolvedPath, resultExports);
      return resultExports;
    }

    self.require = (path) => loadWorkspaceModule(path, CURRENT_FILE_PATH);
    self.workspace = {
      import: (path) => loadWorkspaceModule(path, CURRENT_FILE_PATH),
      runScript: async (path, args = {}) => {
        const mod = await loadWorkspaceModule(path, CURRENT_FILE_PATH);
        if (typeof mod.run === 'function') {
          return mod.run(args);
        } else if (typeof mod.default === 'function') {
          return mod.default(args);
        }
        throw new Error('Script "' + path + '" does not export a run(args) or default function!');
      }
    };
  `;
}
