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

// every gloss already shipped stays as it is (CC-CEDICT changes daily); only phrases without one are added (spec 2026-10-11 §7)
const outUrl = new URL('../src/content/glossary.json', import.meta.url);
const kept = (JSON.parse(await readFile(outUrl, 'utf8')) as { entries: Record<string, string> }).entries;
const out = {
  source: 'CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), MDBG and contributors',
  license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — this glossary is a shortened adaptation and shares that licence',
  entries: Object.fromEntries([...Object.entries(kept), ...Object.entries(glossary).filter(([k]) => !(k in kept))]),
};
await writeFile(outUrl, JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${Object.keys(out.entries).length} glosses (${Object.keys(out.entries).length - Object.keys(kept).length} new); ${missing.length} phrases with none (${missing.slice(0, 20).join(' ')}…)`);
