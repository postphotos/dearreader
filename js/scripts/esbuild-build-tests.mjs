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
    format: 'cjs',
    target: ['node20'],
    sourcemap: true,
    loader: { '.ts': 'ts' },
    bundle: false,
    treeShaking: false,
  });

  console.log('esbuild: build_test ready');
}

main().catch((err) => { console.error(err); process.exit(1); });
