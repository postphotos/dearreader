import { build } from 'esbuild';
import { readdir } from 'fs/promises';
import path from 'path';

async function collect(dir) {
  const abs = path.resolve(dir);
  const results = [];
  async function walk(d) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && p.endsWith('.ts')) results.push(p);
    }
  }
  try { await walk(abs); } catch (e) { /* ignore */ }
  return results;
}

async function main() {
  const files = [];
  files.push(...(await collect('src')));
  files.push(...(await collect('test')));
  if (files.length === 0) {
    console.error('No .ts files found in src/ or test/');
    process.exit(1);
  }

  await build({
    entryPoints: files,
    outdir: 'build_test',
    platform: 'node',
    format: 'esm',
    target: ['node20'],
    sourcemap: true,
    loader: { '.ts': 'ts' },
    bundle: false,
    treeShaking: false,
    outExtension: { '.js': '.js' },
    banner: {
      js: `
// Polyfill for DOMMatrix (needed for pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === 'string') {
        // ignore matrix string
      }
      else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      }
      else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof globalThis.Promise.withResolvers === 'undefined') {
  globalThis.Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
`
    }
  });

  console.log('esbuild: build_test ready');
}

main().catch((err) => { console.error(err); process.exit(1); });
