/**
 * Pure JavaScript Browser Compatibility Layer for Node.js Core Modules:
 * buffer, path, process, events, crypto, util, and Virtual fs.
 */
import { Buffer } from 'buffer';
import path from 'path-browserify';
import EventEmitter from 'events';

if (typeof (globalThis as unknown as { global: unknown }).global === 'undefined') {
  (globalThis as unknown as { global: unknown }).global = globalThis;
}

if (typeof (globalThis as unknown as { Buffer: unknown }).Buffer === 'undefined') {
  (globalThis as unknown as { Buffer: unknown }).Buffer = Buffer;
}

if (typeof (globalThis as unknown as { setImmediate: unknown }).setImmediate === 'undefined') {
  (globalThis as unknown as { setImmediate: unknown }).setImmediate = function(fn: (...args: unknown[]) => void, ...args: unknown[]) {
    return setTimeout(() => fn(...args), 0);
  };
  (globalThis as unknown as { clearImmediate: unknown }).clearImmediate = function(id: number) {
    clearTimeout(id);
  };
}

if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  (globalThis as unknown as { SharedArrayBuffer: typeof ArrayBuffer }).SharedArrayBuffer = ArrayBuffer;
}

// 1. Path Polyfill (Official path-browserify)
export const pathPolyfill = path;

// 2. Buffer Polyfill (Official Buffer package)
export const BufferPolyfill = Buffer;
export { Buffer };

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

// 4. Events EventEmitter Polyfill (Official EventEmitter)
export const EventEmitterPolyfill = EventEmitter;
type EventListenerFn = (...args: unknown[]) => unknown;

// 5. Crypto Hashing Functions (MD5, SHA-1, SHA-256)
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

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function sha256(str: string): string {
  function rotr(n: number, b: number) { return (n >>> b) | (n << (32 - b)); }

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = str.length;
  const blocks: number[] = [];
  for (let i = 0; i < len; i++) {
    blocks[i >> 2] |= (str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  blocks[len >> 2] |= 0x80 << (24 - (len % 4) * 8);

  const blockCount = (((len + 8) >> 6) + 1) * 16;
  while (blocks.length < blockCount) blocks.push(0);
  blocks[blockCount - 1] = len * 8;

  const W = new Array(64);
  for (let i = 0; i < blocks.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = blocks[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + SHA256_K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  function hex(n: number) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

function sha1(str: string): string {
  function rol(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  const block = [];
  const len = str.length;
  for (let i = 0; i < len - 3; i += 4) {
    block.push((str.charCodeAt(i) << 24) | (str.charCodeAt(i + 1) << 16) | (str.charCodeAt(i + 2) << 8) | str.charCodeAt(i + 3));
  }
  let last = 0;
  const rem = len % 4;
  for (let i = 0; i < rem; i++) {
    last |= str.charCodeAt(len - rem + i) << ((3 - i) * 8);
  }
  last |= 0x80 << ((3 - rem) * 8);
  block.push(last);
  while ((block.length % 16) !== 14) block.push(0);
  block.push((len >>> 29) & 0xff);
  block.push((len * 8) & 0xffffffff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array(80);
  for (let i = 0; i < block.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = block[i + t];
    for (let t = 16; t < 80; t++) w[t] = rol(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) { f = (b & c) | ((~b) & d); k = 0x5a827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rol(a, 5) + f + e + k + w[t]) & 0xffffffff;
      e = d; d = c; c = rol(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) & 0xffffffff; h1 = (h1 + b) & 0xffffffff; h2 = (h2 + c) & 0xffffffff; h3 = (h3 + d) & 0xffffffff; h4 = (h4 + e) & 0xffffffff;
  }
  function hex(n: number) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}

// 6. Crypto Polyfill
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
  randomBytes(size: number): Buffer {
    const arr = new Uint8Array(size);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < size; i++) arr[i] = (Math.random() * 256) | 0;
    }
    return Buffer.from(arr);
  },
  createHash(algo: string) {
    let _data = '';
    return {
      update(chunk: unknown) {
        _data += String(chunk);
        return this;
      },
      digest(encoding: string = 'hex') {
        const norm = String(algo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let hexResult = '';
        if (norm === 'sha256') hexResult = sha256(_data);
        else if (norm === 'sha1') hexResult = sha1(_data);
        else hexResult = md5(_data);

        if (encoding === 'hex') return hexResult;
        return Buffer.from(hexResult, 'hex').toString(encoding as BufferEncoding);
      }
    };
  }
};

// 7. Util Polyfill
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

// 8. OS Polyfill
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

// 9. Stream Polyfill
export class StreamPolyfill extends EventEmitter {
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

// 10. Zlib Polyfill
export const zlibPolyfill = {
  gzip: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, Buffer.from(buf as string)), 0),
  gzipSync: (buf: unknown) => Buffer.from(buf as string),
  gunzip: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, Buffer.from(buf as string)), 0),
  gunzipSync: (buf: unknown) => Buffer.from(buf as string),
  deflate: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, Buffer.from(buf as string)), 0),
  inflate: (buf: unknown, cb: (err: unknown, res: unknown) => void) => setTimeout(() => cb(null, Buffer.from(buf as string)), 0),
  createGzip: () => new StreamPolyfill(),
  createGunzip: () => new StreamPolyfill(),
  createBrotliCompress: () => new StreamPolyfill()
};

// 11. Net Polyfill (Simulated with Sandbox Notice)
export class SocketPolyfill extends EventEmitter {
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
    const s = new EventEmitter();
    (s as unknown as Record<string, unknown>).listen = () => s;
    (s as unknown as Record<string, unknown>).close = (c?: () => void) => { if (c) c(); };
    if (cb) s.on('connection', cb as unknown as EventListenerFn);
    return s;
  }
};

// 12. DNS Polyfill
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

// 13. HTTP & HTTPS Polyfill
export class ClientRequestPolyfill extends EventEmitter {
  write() { return true; }
  end() { return this; }
}

export const httpPolyfill = {
  ClientRequest: ClientRequestPolyfill,
  get: (url: unknown, opts: unknown, cb?: (res: EventEmitter) => void) => httpPolyfill.request(url, opts, cb),
  request: (url: unknown, opts: unknown, cb?: (res: EventEmitter) => void) => {
    let callback = cb;
    if (typeof opts === 'function') { callback = opts as (res: EventEmitter) => void; }
    void opts;
    const req = new ClientRequestPolyfill();
    const targetUrl = typeof url === 'string' ? url : String(url || '');
    setTimeout(() => {
      fetch(targetUrl).then(res => res.text().then(text => {
        const incoming = new EventEmitter();
        (incoming as unknown as Record<string, unknown>).statusCode = res.status;
        (incoming as unknown as Record<string, unknown>).headers = {};
        if (callback) callback(incoming);
        req.emit('response', incoming);
        setTimeout(() => { incoming.emit('data', text); incoming.emit('end'); }, 0);
      })).catch(err => req.emit('error', err));
    }, 0);
    return req;
  },
  createServer: (cb?: (req: EventEmitter, res: EventEmitter) => void) => {
    const s = new EventEmitter();
    (s as unknown as Record<string, unknown>).listen = () => s;
    (s as unknown as Record<string, unknown>).close = (c?: () => void) => { if (c) c(); };
    if (cb) s.on('request', cb as unknown as EventListenerFn);
    return s;
  }
};
export const httpsPolyfill = { ...httpPolyfill };
export const http2Polyfill = { connect: () => new EventEmitter(), createServer: httpPolyfill.createServer };
export const tlsPolyfill = { connect: (p: number, h?: string, cb?: () => void) => netPolyfill.connect(p, h, cb), createServer: httpPolyfill.createServer, TLSSocket: SocketPolyfill };

// 14. Child Process Polyfill
export class ChildProcessPolyfill extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = new EventEmitter();
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

// 15. Worker Threads & Cluster Polyfill
export const workerThreadsPolyfill = {
  isMainThread: true,
  parentPort: null,
  Worker: class extends EventEmitter { postMessage() {} },
  MessageChannel: class { port1 = new EventEmitter(); port2 = new EventEmitter(); }
};
export const clusterPolyfill = { isMaster: true, isPrimary: true, isWorker: false, fork: () => new ChildProcessPolyfill() };

// 16. VM Polyfill
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

// 17. V8, Perf & Inspector Polyfill
export const v8Polyfill = {
  getHeapStatistics: () => ({ total_heap_size: 33554432, total_heap_size_executable: 4194304, total_physical_size: 33554432, total_available_size: 4294967296, heap_size_limit: 4294967296, used_heap_size: 16777216 }),
  getHeapSpaceStatistics: () => []
};
export const perfHooksPolyfill = { performance: globalThis.performance || { now: () => Date.now() } };
export const inspectorPolyfill = { open: () => {}, close: () => {}, url: () => undefined };
