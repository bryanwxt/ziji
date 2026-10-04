// Builds src/content/glossary.json: a short English gloss for every 组词 on the built-in cards (the 认字 card, parent 2026-10-04).
// Usage: npx tsx scripts/build-glossary.ts /path/to/cedict_ts.u8   (CC-CEDICT from mdbg.net; the dictionary itself is not kept in the repo)
import { readFile, writeFile } from 'node:fs/promises';
import { buildGlossary, parseCedict } from './glossary-lib';

const path = process.argv[2];
if (!path) throw new Error('Pass the path to a CC-CEDICT file (cedict_ts.u8)');
const dict = parseCedict(await readFile(path, 'utf8'));
const builtin = JSON.parse(await readFile(new URL('../src/content/builtin.json', import.meta.url), 'utf8')) as { chars: { char: string; pinyin: string; examples: { text: string; pinyin: string }[] }[] };
// each character at its own reading (他 tā → "he or him"), then every 组词
const phrases = [...builtin.chars.map((c) => ({ text: c.char, pinyin: c.pinyin })), ...builtin.chars.flatMap((c) => c.examples)];
const { glossary, missing } = buildGlossary(phrases, dict);

const out = {
  source: 'CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), MDBG and contributors',
  license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — this glossary is a shortened adaptation and shares that licence',
  entries: glossary,
};
await writeFile(new URL('../src/content/glossary.json', import.meta.url), JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${Object.keys(glossary).length} glosses; ${missing.length} phrases with none (${missing.slice(0, 20).join(' ')}…)`);
