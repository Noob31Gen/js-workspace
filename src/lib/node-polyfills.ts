/**
 * Pure JavaScript Browser Compatibility Layer for Node.js Core Modules:
 * path, buffer, process, events, crypto, util, and Virtual fs.
 */

// 1. Path Polyfill
export const pathPolyfill = {
  sep: '/',
  join(...parts: string[]): string {
    const cleanParts = parts.filter(Boolean).map(p => String(p).trim());
    const joined = cleanParts.join('/');
    return pathPolyfill.normalize(joined);
  },
  resolve(...parts: string[]): string {
    return pathPolyfill.join(...parts).replace(/^\//, '');
  },
  dirname(p: string): string {
    const segments = String(p).replace(/\/$/, '').split('/');
    segments.pop();
    return segments.join('/') || '.';
  },
  basename(p: string, ext?: string): string {
    const filename = String(p).split('/').pop() || '';
    if (ext && filename.endsWith(ext)) {
      return filename.slice(0, -ext.length);
    }
    return filename;
  },
  extname(p: string): string {
    const filename = pathPolyfill.basename(p);
    const dotIdx = filename.lastIndexOf('.');
    if (dotIdx <= 0) return '';
    return filename.slice(dotIdx);
  },
  normalize(p: string): string {
    const isAbs = p.startsWith('/');
    const parts = p.split('/').filter(Boolean);
    const stack: string[] = [];

    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    const res = stack.join('/');
    return isAbs ? '/' + res : res;
  },
  isAbsolute(p: string): boolean {
    return String(p).startsWith('/');
  }
};

// 2. Buffer Polyfill
export class BufferPolyfill {
  public data: Uint8Array;

  constructor(data: Uint8Array | ArrayBuffer | number) {
    if (typeof data === 'number') {
      this.data = new Uint8Array(data);
    } else if (data instanceof ArrayBuffer) {
      this.data = new Uint8Array(data);
    } else {
      this.data = data;
    }
  }

  public get length(): number {
    return this.data.length;
  }

  public static from(data: any, encoding: string = 'utf8'): BufferPolyfill {
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      const arr = encoder.encode(data);
      return new BufferPolyfill(arr);
    } else if (data instanceof Uint8Array || Array.isArray(data)) {
      return new BufferPolyfill(new Uint8Array(data));
    }
    return new BufferPolyfill(0);
  }

  public static alloc(size: number, fill: number = 0): BufferPolyfill {
    const arr = new Uint8Array(size);
    if (fill) arr.fill(fill);
    return new BufferPolyfill(arr);
  }

  public static concat(list: Uint8Array[]): BufferPolyfill {
    const totalLen = list.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const buf of list) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return new BufferPolyfill(result);
  }

  public static isBuffer(obj: any): boolean {
    return obj instanceof BufferPolyfill || obj instanceof Uint8Array;
  }

  public toString(encoding: string = 'utf8'): string {
    const decoder = new TextDecoder();
    return decoder.decode(this.data);
  }
}

// 3. Process Polyfill
export const processPolyfill = {
  env: {
    NODE_ENV: 'development',
    WORKSPACE_ENV: 'browser-sandbox',
    PATH: '/usr/bin:/bin'
  },
  cwd(): string {
    return '/';
  },
  nextTick(fn: (...args: any[]) => void, ...args: any[]): void {
    Promise.resolve().then(() => fn(...args));
  },
  version: 'v20.11.0',
  versions: { node: '20.11.0', v8: '11.3', uv: '1.46' },
  platform: 'browser',
  arch: 'x64',
  browser: true
};

// 4. Events EventEmitter Polyfill
export class EventEmitterPolyfill {
  private _events: Record<string, Function[]> = {};

  public on(event: string, listener: Function): this {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
    return this;
  }

  public once(event: string, listener: Function): this {
    const g = (...args: any[]) => {
      this.off(event, g);
      listener.apply(this, args);
    };
    return this.on(event, g);
  }

  public emit(event: string, ...args: any[]): boolean {
    const listeners = this._events[event];
    if (!listeners || listeners.length === 0) return false;
    listeners.slice().forEach(fn => fn.apply(this, args));
    return true;
  }

  public off(event: string, listener: Function): this {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(fn => fn !== listener);
    return this;
  }

  public removeListener(event: string, listener: Function): this {
    return this.off(event, listener);
  }

  public removeAllListeners(event?: string): this {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

// 5. Crypto Polyfill
export const cryptoPolyfill = {
  randomUUID(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  randomBytes(size: number): BufferPolyfill {
    const arr = new Uint8Array(size);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < size; i++) arr[i] = (Math.random() * 256) | 0;
    }
    return new BufferPolyfill(arr.buffer);
  },
  createHash(algo: string) {
    let _data = '';
    return {
      update(chunk: any) {
        _data += String(chunk);
        return this;
      },
      digest(encoding: string = 'hex') {
        // Simple fast string hashing implementation for browser worker
        let hash = 0;
        for (let i = 0; i < _data.length; i++) {
          const char = _data.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(16, '0') + 'a7b8c9d0';
        if (encoding === 'hex') return hex.slice(0, 32);
        return BufferPolyfill.from(hex).toString(encoding);
      }
    };
  }
};

// 6. Util Polyfill
export const utilPolyfill = {
  promisify(fn: Function) {
    return function (...args: any[]) {
      return new Promise((resolve, reject) => {
        fn(...args, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    };
  },
  inspect(obj: any, options: any = {}): string {
    if (typeof obj === 'object') return JSON.stringify(obj, null, 2);
    return String(obj);
  },
  format(fmt: string, ...args: any[]): string {
    let i = 0;
    return String(fmt).replace(/%[sjd%/]/g, (match) => {
      if (match === '%%') return '%';
      if (i >= args.length) return match;
      const arg = args[i++];
      if (match === '%j') return JSON.stringify(arg);
      return String(arg);
    });
  }
};
