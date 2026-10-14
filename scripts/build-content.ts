import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pinyin } from 'pinyin-pro';
import '../src/content/pinyinFixes'; // 组词 read with the app's fixes (教书 jiāo, 切菜 qiē), like every other reading it shows
import { buildBuiltin, buildWordDictionary, parseHskSections, type MmahEntry, type SchoolLesson } from './content-lib';
import moe from '../src/content/moe2024.json';
import { BLOCKED } from '../src/content/blocked';

const SOURCES = {
  charlist: 'https://raw.githubusercontent.com/elkmovie/hsk30/main/charlist.txt',
  wordlist: 'https://raw.githubusercontent.com/elkmovie/hsk30/main/wordlist.txt',
  dictionary: 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt',
};
const cacheDir = new URL('./.cache/', import.meta.url);
const outFile = new URL('../src/content/builtin.json', import.meta.url);

async function source(name: keyof typeof SOURCES): Promise<string> {
  const file = new URL(`${name}.txt`, cacheDir);
  if (!existsSync(file)) {
    const res = await fetch(SOURCES[name]);
    if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, await res.text());
  }
  return readFile(file, 'utf8');
}

const dictionary = new Map<string, MmahEntry>();
for (const line of (await source('dictionary')).split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line) as MmahEntry;
  dictionary.set(e.character, e);
}

const skipped: string[] = [];
const chars = buildBuiltin({
  hskChars: parseHskSections(await source('charlist')),
  hskWords: parseHskSections(await source('wordlist')),
  dictionary,
  pinyinOf: (text) => pinyin(text, { type: 'array' }).join(' '),
  school: (moe as { lessons: SchoolLesson[] }).lessons, // spec 2026-10-11 §7: every listed character, and 组词 he can read
  blocked: BLOCKED, // the word gate at build time (content audit 2026-10-15): a blocked word is never a card's 组词
}, skipped);

const body = chars.map((c) => '  ' + JSON.stringify(c)).join(',\n');
await mkdir(new URL('../src/content/', import.meta.url), { recursive: true });
await writeFile(outFile, `{\n "version": 1,\n "chars": [\n${body}\n ]\n}\n`);
const hskWords = buildWordDictionary(parseHskSections(await source('wordlist')));
const wordsBody = hskWords.map((w) => JSON.stringify(w)).join(',');
await writeFile(new URL('../src/content/hskwords.json', import.meta.url), `{"version":1,"words":[${wordsBody}]}\n`);
const perLevel = [1, 2, 3, 4, 5, 6, 7].map((l) => chars.filter((c) => c.level === l).length).join('/');
console.log(`Wrote ${chars.length} characters (levels 1–7: ${perLevel}), ${chars.filter((c) => c.school).length} from his textbook only (${chars.filter((c) => c.school).map((c) => c.char).join('')}), ${chars.filter((c) => c.writeable).length} writeable, ${skipped.length} skipped (${skipped.join('')}); ${hskWords.length} HSK words`);
