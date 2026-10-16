// Bundles the stage-case page (page.tsx) with the app's styles into a temp folder, for stage-cases.ts and costume-sheet.ts.
import { build } from 'esbuild';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chaptersShim } from './shim';

export async function bundleStagePage(): Promise<string> {
  const dir = join(tmpdir(), `ziji-stage-cases-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  await build({ entryPoints: ['scripts/stage-cases/page.tsx'], bundle: true, outdir: dir, plugins: [chaptersShim], jsx: 'automatic', jsxImportSource: 'preact', loader: { '.json': 'json', '.woff2': 'file', '.woff': 'file', '.png': 'file', '.md': 'text' }, external: ['/fonts/*'], define: { 'import.meta.env.BASE_URL': '"./"' }, logLevel: 'error' });
  cpSync('public/worlds', join(dir, 'worlds'), { recursive: true }); // the paintings, next to the page (spec 2026-10-13 §5)
  cpSync('public/passages', join(dir, 'passages'), { recursive: true }); // the library's pictures (spec 2026-10-15 §7)
  writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="page.css"><div id="app"></div><script src="page.js"></script>`);
  return dir;
}
