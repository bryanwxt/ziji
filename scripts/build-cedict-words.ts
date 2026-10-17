// Builds public/data/cedict-words.txt: CC-CEDICT's simplified headwords of 2–4 characters, one a line (weekly list: a real word
// the parent pastes, 蝴蝶 or 秋千, is never flagged unknown). Loaded by the parent's 本周词语 panel only, never in the main bundle.
// Usage: npx tsx scripts/build-cedict-words.ts /path/to/cedict_ts.u8   (CC-CEDICT from mdbg.net; the dictionary itself is not kept in
// the repo, but this list is, so CI needs no download)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { cedictWords } from './glossary-lib';

const path = process.argv[2];
if (!path) throw new Error('Pass the path to a CC-CEDICT file (cedict_ts.u8)');
const { date, words } = cedictWords(await readFile(path, 'utf8'));
const out = `# CC-CEDICT ${date ?? 'undated'} (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), MDBG and contributors, CC BY-SA 4.0: simplified headwords only\n${words.join('\n')}\n`;
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/cedict-words.txt', import.meta.url), out);
const raw = Buffer.byteLength(out);
console.log(`Wrote ${words.length} words from CC-CEDICT ${date}: ${(raw / 1024).toFixed(0)} KiB raw, ${(gzipSync(out).length / 1024).toFixed(0)} KiB gzip`);
