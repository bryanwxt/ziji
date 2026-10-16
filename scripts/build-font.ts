import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { collectFontText } from './font-lib';

const FONT_URL = 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf';
const OFL_URL = 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt';
const CHARLIST_URL = 'https://raw.githubusercontent.com/elkmovie/hsk30/7f3d4fdcfcb6e826001df062747c943d1fa8160e/charlist.txt'; // pinned (2023-11-08): main could change the subset
const cacheDir = new URL('./.cache/', import.meta.url);
const outDir = new URL('../public/fonts/', import.meta.url);

async function cached(name: string, url: string): Promise<Buffer> {
  const file = new URL(name, cacheDir);
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file);
}

async function sourceTexts(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && /\.(tsx?|json)$/.test(entry.name)) out.push(await readFile(join(entry.parentPath, entry.name), 'utf8'));
  }
  return out;
}

const text = collectFontText([
  (await cached('charlist.txt', CHARLIST_URL)).toString('utf8'),
  ...(await sourceTexts(fileURLToPath(new URL('../src/', import.meta.url)))),
]);
const woff2 = await subsetFont(await cached('LXGWWenKai-Regular.ttf', FONT_URL), text, { targetFormat: 'woff2' });
await mkdir(outDir, { recursive: true });
await writeFile(new URL('wenkai.woff2', outDir), woff2);
await writeFile(new URL('LXGWWenKai-OFL.txt', outDir), await cached('OFL.txt', OFL_URL));
console.log(`Subset ${[...text].length} glyphs → ${Math.round(woff2.length / 1024)} KiB`);
