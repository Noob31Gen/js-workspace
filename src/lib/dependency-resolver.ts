import { WorkspaceNode } from './workspace-store';

/**
 * Normalizes relative or absolute file paths against a base directory path.
 */
export function resolveFilePath(targetPath: string, currentFilePath: string = ''): string {
  let cleanTarget = targetPath.trim().replace(/^\//, '');

  if (!cleanTarget.startsWith('.')) {
    return cleanTarget;
  }

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
 * Generates the Web Worker code header containing Node.js Polyfills,
 * Virtual Filesystem, `workspace.import`, and `require()` resolution.
 */
export function buildWorkerDependencyLoader(nodes: WorkspaceNode[], currentFilePath: string): string {
  const fileMap: Record<string, string> = {};

  nodes.forEach(node => {
    if (node.type === 'file' && node.code !== undefined) {
      fileMap[node.path] = node.code;
    }
  });

  return `
    // Node.js Core Modules & Virtual Filesystem Engine
    const WORKSPACE_FILES = ${JSON.stringify(fileMap)};
    const CURRENT_FILE_PATH = ${JSON.stringify(currentFilePath)};
    const MODULE_CACHE = new Map();
    const CALL_STACK = new Set();

    // 1. Path Module
    const pathModule = {
      sep: '/',
      join(...parts) {
        return parts.filter(Boolean).join('/').replace(/\\/\\/+/g, '/').replace(/^\\/+|\\/+$/g, '');
      },
      resolve(...parts) {
        return pathModule.join(...parts);
      },
      dirname(p) {
        const segs = String(p).replace(/\\/$/, '').split('/');
        segs.pop();
        return segs.join('/') || '.';
      },
      basename(p, ext) {
        const fname = String(p).split('/').pop() || '';
        if (ext && fname.endsWith(ext)) return fname.slice(0, -ext.length);
        return fname;
      },
      extname(p) {
        const fname = pathModule.basename(p);
        const idx = fname.lastIndexOf('.');
        return idx <= 0 ? '' : fname.slice(idx);
      },
      normalize(p) {
        return pathModule.join(p);
      },
      isAbsolute(p) {
        return String(p).startsWith('/');
      }
    };

    // 2. Buffer Module
    class BufferModule extends Uint8Array {
      static from(data) {
        if (typeof data === 'string') {
          return new BufferModule(new TextEncoder().encode(data).buffer);
        }
        return new BufferModule(data);
      }
      static alloc(size, fill = 0) {
        const arr = new Uint8Array(size);
        if (fill) arr.fill(fill);
        return new BufferModule(arr.buffer);
      }
      static concat(list) {
        const total = list.reduce((acc, curr) => acc + curr.length, 0);
        const res = new Uint8Array(total);
        let off = 0;
        for (const b of list) { res.set(b, off); off += b.length; }
        return new BufferModule(res.buffer);
      }
      static isBuffer(obj) {
        return obj instanceof BufferModule || obj instanceof Uint8Array;
      }
      toString() {
        return new TextDecoder().decode(this);
      }
    }

    // 3. Process Module
    const processModule = {
      env: { NODE_ENV: 'development', WORKSPACE_ENV: 'browser-sandbox' },
      cwd: () => '/',
      nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
      version: 'v20.11.0',
      platform: 'browser',
      arch: 'x64'
    };

    // 4. Events Module
    class EventEmitterModule {
      constructor() { this._events = {}; }
      on(event, listener) { (this._events[event] = this._events[event] || []).push(listener); return this; }
      once(event, listener) {
        const g = (...args) => { this.off(event, g); listener(...args); };
        return this.on(event, g);
      }
      emit(event, ...args) {
        const list = this._events[event];
        if (!list) return false;
        list.slice().forEach(fn => fn(...args));
        return true;
      }
      off(event, listener) {
        if (this._events[event]) this._events[event] = this._events[event].filter(fn => fn !== listener);
        return this;
      }
    }

    // 5. Crypto Module
    const cryptoModule = {
      randomUUID: () => self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2),
      randomBytes: (size) => {
        const arr = new Uint8Array(size);
        self.crypto?.getRandomValues(arr);
        return new BufferModule(arr.buffer);
      },
      createHash: (algo) => {
        let _data = '';
        return {
          update: (chunk) => { _data += String(chunk); return this; },
          digest: (enc = 'hex') => {
            let h = 0;
            for (let i = 0; i < _data.length; i++) h = (h << 5) - h + _data.charCodeAt(i) | 0;
            return Math.abs(h).toString(16).padStart(16, '0');
          }
        };
      }
    };

    // 6. Util Module
    const utilModule = {
      promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (e, r) => e ? rej(e) : res(r))),
      inspect: (obj) => typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj),
      format: (fmt, ...args) => String(fmt).replace(/%[sj]/g, (m) => args.shift() ?? m)
    };

    // 7. Virtual FS Module
    const fsModule = {
      readFileSync(filePath, encoding = 'utf8') {
        const resolved = pathModule.resolve(filePath);
        const content = WORKSPACE_FILES[resolved];
        if (content === undefined) {
          throw new Error('ENOENT: no such file or directory, open "' + filePath + '"');
        }
        return encoding ? content : BufferModule.from(content);
      },
      writeFileSync(filePath, data, encoding = 'utf8') {
        const resolved = pathModule.resolve(filePath);
        const strData = typeof data === 'string' ? data : new TextDecoder().decode(data);
        WORKSPACE_FILES[resolved] = strData;
        postMessage({ type: 'FS_MUTATION', action: 'write', path: resolved, content: strData });
      },
      readdirSync(dirPath) {
        const resolvedDir = pathModule.resolve(dirPath);
        const prefix = resolvedDir ? resolvedDir + '/' : '';
        const entries = new Set();

        Object.keys(WORKSPACE_FILES).forEach(filePath => {
          if (filePath.startsWith(prefix)) {
            const rel = filePath.slice(prefix.length);
            const firstPart = rel.split('/')[0];
            if (firstPart) entries.add(firstPart);
          }
        });
        return Array.from(entries);
      },
      existsSync(filePath) {
        const resolved = pathModule.resolve(filePath);
        if (WORKSPACE_FILES[resolved] !== undefined) return true;
        const prefix = resolved + '/';
        return Object.keys(WORKSPACE_FILES).some(fp => fp.startsWith(prefix));
      },
      statSync(filePath) {
        const exists = fsModule.existsSync(filePath);
        if (!exists) throw new Error('ENOENT: no such file or directory, stat "' + filePath + '"');
        const resolved = pathModule.resolve(filePath);
        const isFile = WORKSPACE_FILES[resolved] !== undefined;
        const content = WORKSPACE_FILES[resolved] || '';
        return {
          isFile: () => isFile,
          isDirectory: () => !isFile,
          size: content.length,
          mtime: new Date()
        };
      },
      mkdirSync(dirPath) {
        postMessage({ type: 'FS_MUTATION', action: 'mkdir', path: pathModule.resolve(dirPath) });
      },
      unlinkSync(filePath) {
        const resolved = pathModule.resolve(filePath);
        delete WORKSPACE_FILES[resolved];
        postMessage({ type: 'FS_MUTATION', action: 'delete', path: resolved });
      },
      promises: {
        readFile: async (p, enc) => fsModule.readFileSync(p, enc),
        writeFile: async (p, d, enc) => fsModule.writeFileSync(p, d, enc),
        readdir: async (p) => fsModule.readdirSync(p),
        stat: async (p) => fsModule.statSync(p),
        mkdir: async (p) => fsModule.mkdirSync(p),
        unlink: async (p) => fsModule.unlinkSync(p)
      }
    };

    // Global Bindings
    self.process = processModule;
    self.Buffer = BufferModule;
    self.global = self;

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
      // Check Node.js Built-in Core Modules
      const cleanReq = requestedPath.replace(/^node:/, '');
      if (cleanReq === 'fs') return fsModule;
      if (cleanReq === 'path') return pathModule;
      if (cleanReq === 'buffer') return { Buffer: BufferModule, default: BufferModule };
      if (cleanReq === 'process') return processModule;
      if (cleanReq === 'events') return { EventEmitter: EventEmitterModule, default: EventEmitterModule };
      if (cleanReq === 'crypto') return cryptoModule;
      if (cleanReq === 'util') return utilModule;

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

      let transformedCode = scriptCode
        .replace(/export\\s+default\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'async function $1() {}; exports.default = $1;')
        .replace(/export\\s+default\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'function $1() {}; exports.default = $1;')
        .replace(/export\\s+default\\s+/g, 'exports.default = ')
        .replace(/export\\s+async\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'async function $1')
        .replace(/export\\s+function\\s+([a-zA-Z0-9_$]+)/g, 'function $1')
        .replace(/export\\s+const\\s+([a-zA-Z0-9_$]+)/g, 'const $1')
        .replace(/export\\s+let\\s+([a-zA-Z0-9_$]+)/g, 'let $1')
        .replace(/export\\s+var\\s+([a-zA-Z0-9_$]+)/g, 'var $1');

      const exportFuncMatches = [...scriptCode.matchAll(/export\\s+(?:async\\s+)?function\\s+([a-zA-Z0-9_$]+)/g)];
      for (const m of exportFuncMatches) {
        transformedCode += '\\nexports.' + m[1] + ' = ' + m[1] + ';';
      }
      const exportVarMatches = [...scriptCode.matchAll(/export\\s+(?:const|let|var)\\s+([a-zA-Z0-9_$]+)/g)];
      for (const m of exportVarMatches) {
        transformedCode += '\\nexports.' + m[1] + ' = ' + m[1] + ';';
      }

      const evalFunc = new Function('module', 'exports', 'require', 'workspace', 'process', 'Buffer', \`
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

      const resultExports = await evalFunc(moduleObj, exportsObj, scopedRequire, scopedWorkspace, processModule, BufferModule);

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
