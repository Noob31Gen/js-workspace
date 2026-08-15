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

  public static from(data: unknown, encoding: string = 'utf8'): BufferPolyfill {
    if (typeof data === 'string') {
      if (encoding === 'base64') {
        const bStr = atob(data);
        const bytes = new Uint8Array(bStr.length);
        for (let i = 0; i < bStr.length; i++) bytes[i] = bStr.charCodeAt(i);
        return new BufferPolyfill(bytes);
      }
      if (encoding === 'hex') {
        const bytes = new Uint8Array(data.length / 2);
        for (let i = 0; i < data.length; i += 2) bytes[i / 2] = parseInt(data.substring(i * 2, i * 2 + 2), 16);
        return new BufferPolyfill(bytes);
      }
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

  public static isBuffer(obj: unknown): boolean {
    return obj instanceof BufferPolyfill || obj instanceof Uint8Array;
  }

  public toString(encoding: string = 'utf8'): string {
    if (encoding === 'base64') {
      let binary = '';
      const len = this.data.length;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(this.data[i]);
      return btoa(binary);
    }
    if (encoding === 'hex') {
      let hex = '';
      for (let i = 0; i < this.data.length; i++) hex += this.data[i].toString(16).padStart(2, '0');
      return hex;
    }
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
  nextTick(fn: (...args: unknown[]) => void, ...args: unknown[]): void {
    Promise.resolve().then(() => fn(...args));
  },
  version: 'v20.11.0',
  versions: { node: '20.11.0', v8: '11.3', uv: '1.46' },
  platform: 'browser',
  arch: 'x64',
  browser: true
};

// 4. Events EventEmitter Polyfill
type EventListenerFn = (...args: unknown[]) => unknown;

export class EventEmitterPolyfill {
  static EventEmitter = EventEmitterPolyfill;
  static default = EventEmitterPolyfill;
  private _events: Record<string, EventListenerFn[]> = {};

  public on(event: string, listener: EventListenerFn): this {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
    return this;
  }

  public once(event: string, listener: EventListenerFn): this {
    const g = (...args: unknown[]) => {
      this.off(event, g);
      listener.apply(this, args);
    };
    return this.on(event, g);
  }

  public emit(event: string, ...args: unknown[]): boolean {
    const listeners = this._events[event];
    if (!listeners || listeners.length === 0) return false;
    listeners.slice().forEach(fn => fn.apply(this, args));
    return true;
  }

  public off(event: string, listener: EventListenerFn): this {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(fn => fn !== listener);
    return this;
  }

  public removeListener(event: string, listener: EventListenerFn): this {
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

function md5(str: string): string {
  function rL(v: number, s: number) { return (v << s) | (v >>> (32 - s)); }
  function aU(x: number, y: number) {
    const x8 = x & 0x80000000, y8 = y & 0x80000000, x4 = x & 0x40000000, y4 = y & 0x40000000, r = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x4 & y4) return r ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) { return (r & 0x40000000) ? r ^ 0xc0000000 ^ x8 ^ y8 : r ^ 0x40000000 ^ x8 ^ y8; }
    return r ^ x8 ^ y8;
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return aU(rL(aU(aU(a, F(b, c, d)), aU(x, ac)), s), b); }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return aU(rL(aU(aU(a, G(b, c, d)), aU(x, ac)), s), b); }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return aU(rL(aU(aU(a, H(b, c, d)), aU(x, ac)), s), b); }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return aU(rL(aU(aU(a, I(b, c, d)), aU(x, ac)), s), b); }
  const len = str.length, n = (len + 8 >> 6) + 1, w = Array(n * 16);
  for (let i = 0; i < n * 16; i++) w[i] = 0;
  for (let i = 0; i < len; i++) w[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  w[len >> 2] |= 0x80 << ((len % 4) * 8); w[n * 16 - 2] = len * 8;
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < w.length; i += 16) {
    const A = a, B = b, C = c, D = d;
    a = FF(a,b,c,d,w[i+0],7,0xd76aa478); d = FF(d,a,b,c,w[i+1],12,0xe8c7b756); c = FF(c,d,a,b,w[i+2],17,0x242070db); b = FF(b,c,d,a,w[i+3],22,0xc1bdceee);
    a = FF(a,b,c,d,w[i+4],7,0xf57c0faf); d = FF(d,a,b,c,w[i+5],12,0x4787c62a); c = FF(c,d,a,b,w[i+6],17,0xa8304613); b = FF(b,c,d,a,w[i+7],22,0xfd469501);
    a = FF(a,b,c,d,w[i+8],7,0x698098d8); d = FF(d,a,b,c,w[i+9],12,0x8b44f7af); c = FF(c,d,a,b,w[i+10],17,0xffff5bb1); b = FF(b,c,d,a,w[i+11],22,0x895cd7be);
    a = FF(a,b,c,d,w[i+12],7,0x6b901122); d = FF(d,a,b,c,w[i+13],12,0xfd987193); c = FF(c,d,a,b,w[i+14],17,0xa679438e); b = FF(b,c,d,a,w[i+15],22,0x49b40821);
    a = GG(a,b,c,d,w[i+1],5,0xf61e2562); d = GG(d,a,b,c,w[i+6],9,0xc040b340); c = GG(c,d,a,b,w[i+11],14,0x265e5a51); b = GG(b,c,d,a,w[i+0],20,0xe9b6c7aa);
    a = GG(a,b,c,d,w[i+5],5,0xd62f105d); d = GG(d,a,b,c,w[i+10],9,0x02441453); c = GG(c,d,a,b,w[i+15],14,0xd8a1e681); b = GG(b,c,d,a,w[i+4],20,0xe7d3fbc8);
    a = GG(a,b,c,d,w[i+9],5,0x21e1cde6); d = GG(d,a,b,c,w[i+14],9,0xc33707d6); c = GG(c,d,a,b,w[i+3],14,0xf4d50d87); b = GG(b,c,d,a,w[i+8],20,0x455a14ed);
    a = GG(a,b,c,d,w[i+13],5,0xa9e3e905); d = GG(d,a,b,c,w[i+2],9,0xfcefa3f8); c = GG(c,d,a,b,w[i+7],14,0x676f02d9); b = GG(b,c,d,a,w[i+12],20,0x8d2a4c8a);
    a = HH(a,b,c,d,w[i+5],4,0xfffa3942); d = HH(d,a,b,c,w[i+8],11,0x8771f681); c = HH(c,d,a,b,w[i+11],16,0x6d9d6122); b = HH(b,c,d,a,w[i+14],23,0xfde5380c);
    a = HH(a,b,c,d,w[i+1],4,0xa4beea44); d = HH(d,a,b,c,w[i+4],11,0x4bdecfa9); c = HH(c,d,a,b,w[i+7],16,0xf6bb4b60); b = HH(b,c,d,a,w[i+10],23,0xbebfbc70);
    a = HH(a,b,c,d,w[i+13],4,0x289b7ec6); d = HH(d,a,b,c,w[i+0],11,0xeaa127fa); c = HH(c,d,a,b,w[i+3],16,0xd4ef3085); b = HH(b,c,d,a,w[i+6],23,0x04881d05);
    a = HH(a,b,c,d,w[i+9],4,0xd9d4d039); d = HH(d,a,b,c,w[i+12],11,0xe6db99e5); c = HH(c,d,a,b,w[i+15],16,0x1fa27cf8); b = HH(b,c,d,a,w[i+2],23,0xc4ac5665);
    a = II(a,b,c,d,w[i+0],6,0xf4292244); d = II(d,a,b,c,w[i+7],10,0x432aff97); c = II(c,d,a,b,w[i+14],15,0xab9423a7); b = II(b,c,d,a,w[i+5],21,0xfc93a039);
    a = II(a,b,c,d,w[i+12],6,0x655b59c3); d = II(d,a,b,c,w[i+3],10,0x8f0ccc92); c = II(c,d,a,b,w[i+10],15,0xffeff47d); b = II(b,c,d,a,w[i+1],21,0x85845dd1);
    a = II(a,b,c,d,w[i+8],6,0x6fa87e4f); d = II(d,a,b,c,w[i+15],10,0xfe2ce6e0); c = II(c,d,a,b,w[i+6],15,0xa3014314); b = II(b,c,d,a,w[i+13],21,0x4e0811a1);
    a = II(a,b,c,d,w[i+4],6,0xf7537e82); d = II(d,a,b,c,w[i+11],10,0xbd3af235); c = II(c,d,a,b,w[i+2],15,0x2ad7d2bb); b = II(b,c,d,a,w[i+9],21,0xeb86d391);
    a = aU(a, A); b = aU(b, B); c = aU(c, C); d = aU(d, D);
  }
  function w2h(v: number) {
    let s = '';
    for (let j = 0; j < 4; j++) {
      const byteVal = (v >>> (j * 8)) & 255;
      s += ('0' + byteVal.toString(16)).slice(-2);
    }
    return s;
  }
  return (w2h(a) + w2h(b) + w2h(c) + w2h(d)).toLowerCase();
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
      update(chunk: unknown) {
        _data += String(chunk);
        return this;
      },
      digest(encoding: string = 'hex') {
        const hex = algo.toLowerCase() === 'md5' ? md5(_data) : md5(_data);
        if (encoding === 'hex') return hex;
        return BufferPolyfill.from(hex, 'hex').toString(encoding);
      }
    };
  }
};

// 6. Util Polyfill
export const utilPolyfill = {
  promisify(fn: (...args: unknown[]) => void) {
    return function (...args: unknown[]) {
      return new Promise((resolve, reject) => {
        fn(...args, (err: unknown, res: unknown) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    };
  },
  inspect(obj: unknown, options: unknown = {}): string {
    void options;
    if (typeof obj === 'object') return JSON.stringify(obj, null, 2);
    return String(obj);
  },
  format(fmt: string, ...args: unknown[]): string {
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

// 7. OS Polyfill
export const osPolyfill = {
  cpus: () => [{ model: 'Browser Virtual CPU', speed: 3000, times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } }],
  totalmem: () => 8589934592,
  freemem: () => 4294967296,
  networkInterfaces: () => ({ lo: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true }] }),
  userInfo: () => ({ username: 'workspace', homedir: '/', shell: '/bin/sh' }),
  hostname: () => 'js-workspace',
  type: () => 'Linux',
  release: () => '5.15.0-browser',
  uptime: () => 3600,
  loadavg: () => [0.1, 0.2, 0.15],
  platform: () => 'browser',
  arch: () => 'x64',
  homedir: () => '/',
  tmpdir: () => '/tmp'
};

// 8. Stream Polyfill
export class StreamPolyfill extends EventEmitterPolyfill {
  static Stream = StreamPolyfill;
  static Readable = StreamPolyfill;
  static Writable = StreamPolyfill;
  static Transform = StreamPolyfill;
  static Duplex = StreamPolyfill;
  static PassThrough = StreamPolyfill;
  static pipeline(...args: unknown[]) {
    const cb = typeof args[args.length - 1] === 'function' ? (args.pop() as (...a: unknown[]) => void) : null;
    const p = Promise.resolve().then(() => { if (cb) cb(null); });
    if (cb) { p.catch(err => { if (cb) cb(err); }); return null; }
    return p;
  }
  static finished(s: unknown, cb?: (err?: unknown) => void) {
    if (cb) setTimeout(cb, 0);
    return s;
  }
  static promises = { pipeline: StreamPolyfill.pipeline, finished: StreamPolyfill.finished };
  static default = StreamPolyfill;
}

// 9. Zlib Polyfill
export const zlibPolyfill = {
  gzip: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, BufferPolyfill.from(buf)), 0),
  gzipSync: (buf: unknown) => BufferPolyfill.from(buf),
  gunzip: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, BufferPolyfill.from(buf)), 0),
  gunzipSync: (buf: unknown) => BufferPolyfill.from(buf),
  deflate: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, BufferPolyfill.from(buf)), 0),
  inflate: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, BufferPolyfill.from(buf)), 0),
  createGzip: () => new StreamPolyfill(),
  createGunzip: () => new StreamPolyfill(),
  createBrotliCompress: () => new StreamPolyfill()
};

// 10. Net Polyfill
export class SocketPolyfill extends EventEmitterPolyfill {
  connect(port: number, host?: string, cb?: () => void) {
    void port; void host;
    setTimeout(() => { this.emit('connect'); if (cb) cb(); }, 0);
    return this;
  }
  write(data: unknown, cb?: () => void) {
    void data;
    if (cb) setTimeout(cb, 0);
    return true;
  }
  end(data?: unknown) {
    if (data) this.write(data);
    setTimeout(() => { this.emit('end'); this.emit('close'); }, 0);
  }
  destroy() { this.emit('close'); }
}

export const netPolyfill = {
  Socket: SocketPolyfill,
  isIPv4: (input: unknown): boolean => {
    const str = String(input || '');
    const parts = str.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
  },
  isIPv6: (input: unknown): boolean => String(input || '').indexOf(':') >= 0,
  isIP: (input: unknown): number => {
    if (netPolyfill.isIPv4(input)) return 4;
    if (netPolyfill.isIPv6(input)) return 6;
    return 0;
  },
  createConnection: (port: number, host?: string, cb?: () => void) => {
    const s = new SocketPolyfill();
    s.connect(port, host, cb);
    return s;
  },
  connect: (port: number, host?: string, cb?: () => void) => {
    const s = new SocketPolyfill();
    s.connect(port, host, cb);
    return s;
  },
  createServer: (cb?: (s: SocketPolyfill) => void) => {
    const s = new EventEmitterPolyfill();
    (s as unknown as Record<string, unknown>).listen = () => s;
    (s as unknown as Record<string, unknown>).close = (c?: () => void) => { if (c) c(); };
    if (cb) s.on('connection', cb as unknown as EventListenerFn);
    return s;
  }
};

// 11. DNS Polyfill
export const dnsPolyfill = {
  lookup: (domain: string, cb: (err: unknown, addr: string, family: number) => void) => { void domain; setTimeout(() => cb(null, '127.0.0.1', 4), 0); },
  resolve: (domain: string, cb: (err: unknown, addrs: string[]) => void) => { void domain; setTimeout(() => cb(null, ['127.0.0.1']), 0); },
  resolve4: (domain: string, cb: (err: unknown, addrs: string[]) => void) => { void domain; setTimeout(() => cb(null, ['127.0.0.1']), 0); },
  resolve6: (domain: string, cb: (err: unknown, addrs: string[]) => void) => { void domain; setTimeout(() => cb(null, ['::1']), 0); },
  resolveTxt: (domain: string, cb: (err: unknown, records: string[][]) => void) => { void domain; setTimeout(() => cb(null, [['v=spf1 include:_spf.google.com ~all']]), 0); },
  promises: {
    lookup: async (domain: string) => { void domain; return { address: '127.0.0.1', family: 4 }; },
    resolve: async (domain: string) => { void domain; return ['127.0.0.1']; },
    resolveTxt: async (domain: string) => { void domain; return [['v=spf1 include:_spf.google.com ~all']]; }
  }
};

// 12. HTTP & HTTPS Polyfill
export class ClientRequestPolyfill extends EventEmitterPolyfill {
  write() { return true; }
  end() { return this; }
}

export const httpPolyfill = {
  ClientRequest: ClientRequestPolyfill,
  get: (url: unknown, opts: unknown, cb?: (res: EventEmitterPolyfill) => void) => httpPolyfill.request(url, opts, cb),
  request: (url: unknown, opts: unknown, cb?: (res: EventEmitterPolyfill) => void) => {
    let callback = cb;
    if (typeof opts === 'function') { callback = opts as (res: EventEmitterPolyfill) => void; }
    void opts;
    const req = new ClientRequestPolyfill();
    const targetUrl = typeof url === 'string' ? url : String(url || '');
    setTimeout(() => {
      fetch(targetUrl).then(res => res.text().then(text => {
        const incoming = new EventEmitterPolyfill();
        (incoming as unknown as Record<string, unknown>).statusCode = res.status;
        (incoming as unknown as Record<string, unknown>).headers = {};
        if (callback) callback(incoming);
        req.emit('response', incoming);
        setTimeout(() => { incoming.emit('data', text); incoming.emit('end'); }, 0);
      })).catch(err => req.emit('error', err));
    }, 0);
    return req;
  },
  createServer: (cb?: (req: EventEmitterPolyfill, res: EventEmitterPolyfill) => void) => {
    const s = new EventEmitterPolyfill();
    (s as unknown as Record<string, unknown>).listen = () => s;
    (s as unknown as Record<string, unknown>).close = (c?: () => void) => { if (c) c(); };
    if (cb) s.on('request', cb as unknown as EventListenerFn);
    return s;
  }
};
export const httpsPolyfill = { ...httpPolyfill };
export const http2Polyfill = { connect: () => new EventEmitterPolyfill(), createServer: httpPolyfill.createServer };
export const tlsPolyfill = { connect: (p: number, h?: string, cb?: () => void) => netPolyfill.connect(p, h, cb), createServer: httpPolyfill.createServer, TLSSocket: SocketPolyfill };

// 13. Child Process Polyfill
export class ChildProcessPolyfill extends EventEmitterPolyfill {
  stdout = new EventEmitterPolyfill();
  stderr = new EventEmitterPolyfill();
  stdin = new EventEmitterPolyfill();
  kill() { this.emit('exit', 0, null); }
}

export const childProcessPolyfill = {
  exec: (cmd: string, opts: unknown, cb?: (err: unknown, stdout: string, stderr: string) => void) => {
    void cmd; if (typeof opts === 'function') cb = opts as (err: unknown, stdout: string, stderr: string) => void;
    const cp = new ChildProcessPolyfill();
    setTimeout(() => { if (cb) cb(null, 'stdout output', ''); cp.emit('exit', 0, null); }, 0);
    return cp;
  },
  execFile: (file: string, args: unknown, opts: unknown, cb?: (err: unknown, stdout: string, stderr: string) => void) => {
    void file; void args; if (typeof opts === 'function') cb = opts as (err: unknown, stdout: string, stderr: string) => void;
    const cp = new ChildProcessPolyfill();
    setTimeout(() => { if (cb) cb(null, 'stdout output', ''); cp.emit('exit', 0, null); }, 0);
    return cp;
  },
  spawn: (cmd: string, args?: unknown) => {
    void cmd; void args;
    const cp = new ChildProcessPolyfill();
    setTimeout(() => cp.emit('exit', 0, null), 0);
    return cp;
  },
  fork: (modulePath: string) => {
    void modulePath;
    const cp = new ChildProcessPolyfill();
    (cp as unknown as Record<string, unknown>).send = () => {};
    setTimeout(() => cp.emit('exit', 0, null), 0);
    return cp;
  }
};

// 14. Worker Threads & Cluster Polyfill
export const workerThreadsPolyfill = {
  isMainThread: true,
  parentPort: null,
  Worker: class extends EventEmitterPolyfill { postMessage() {} },
  MessageChannel: class { port1 = new EventEmitterPolyfill(); port2 = new EventEmitterPolyfill(); }
};
export const clusterPolyfill = { isMaster: true, isPrimary: true, isWorker: false, fork: () => new ChildProcessPolyfill() };

// 15. VM Polyfill
export const vmPolyfill = {
  Script: class {
    code: string;
    constructor(code: string) { this.code = code; }
    runInContext() { return eval(this.code); }
    runInNewContext() { return eval(this.code); }
    runInThisContext() { return eval(this.code); }
  },
  createContext: (sandbox?: unknown) => sandbox || {},
  runInContext: (code: string) => eval(code),
  runInNewContext: (code: string) => eval(code),
  runInThisContext: (code: string) => eval(code)
};

// 16. V8, Perf & Inspector Polyfill
export const v8Polyfill = {
  getHeapStatistics: () => ({ total_heap_size: 33554432, total_heap_size_executable: 4194304, total_physical_size: 33554432, total_available_size: 4294967296, heap_size_limit: 4294967296, used_heap_size: 16777216 }),
  getHeapSpaceStatistics: () => []
};
export const perfHooksPolyfill = { performance: globalThis.performance || { now: () => Date.now() } };
export const inspectorPolyfill = { open: () => {}, close: () => {}, url: () => undefined };

