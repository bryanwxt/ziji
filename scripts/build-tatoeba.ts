// Builds src/content/tatoeba.json: a fallback 选词填空 sentence for the weekly list's words that have none of the app's own
// (parent ruling 2026-10-17). From Tatoeba's Mandarin sentences (tatoeba.org, CC BY 2.0 FR), keeping only those a P2 child can
// read: simplified only, 6–20 characters, every character from the MOE 一上–三下 lists or HSK 1–2 (the target word's own
// characters aside), no blocked word, no 儿化, nothing on the adult-topic list below, and the target word once, as a whole token.
// At most 2 a word, the shortest of 8 or more characters first (enough around the blank to tell), then shorter ones. Each keeps its Tatoeba id for attribution. Loaded only by the parent's 本周词语 panel.
// Usage: npx tsx scripts/build-tatoeba.ts /path/to/cmn_sentences.tsv   (Tatoeba's per-language export: id<TAB>cmn<TAB>text)
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { BLOCKED, ERHUA } from '../src/content/blocked';
import glossary from '../src/content/glossary.json';
import { builtinWords, HSK_WORDS, schoolTerm } from '../src/content/index';
import kidGloss from '../src/content/kidGloss.json';
import { ladderWords } from '../src/content/ladder';
import moe from '../src/content/moe2024.json';
import bank from '../src/content/weekSentences.json';
import { blockedWordsIn } from '../src/content/zuju';
import { CATEGORIES } from '../src/weeklist/categories';
import { sentenceFor } from '../src/weeklist/fit';
import { matchText } from '../src/weeklist/match';

const path = process.argv[2];
if (!path) throw new Error('Pass the path to Tatoeba\'s cmn_sentences.tsv');

const MAX_PER_WORD = 2;
const MIN_LEN = 6;
const MAX_LEN = 20;
/** Topics a 7-year-old's practice sentence never carries, whatever the blocklist says (reviewed 2026-10-17). */
const AVOID = [
  '死', '杀', '枪', '血', '酒', '醉', '烟', '毒', '吻', '婚', '恋', '鬼', '尸', '战', '仗', '监狱', '警察', '偷', '骗', '恨', '笨', '傻', '蠢',
  '胖', '屁', '离开我', '性', '赌', '军', '兵', '炸弹', '上帝', '神', '教堂', '圣经', '政府', '总统', '选举',
  '地狱', '狱', '魔', '恶', '他妈', '妈的', '混蛋', '卑鄙', '小人', '灵魂', '谎', '汤姆', '玛丽', '约翰', '打人', '打他', '打我', '骂', '滚', '闭嘴', '讨厌', '老婆', '老公', '女朋友', '男朋友', '睡觉了吗',
];
const ERHUA_OK = ['儿子', '女儿', '儿童', '儿歌', '幼儿园', '婴儿'];
const PUNCT = '，。！？、：；“”';
const HALF: Record<string, string> = { ',': '，', '?': '？', '!': '！', ':': '：', ';': '；' };

const moeChars = new Set((moe as unknown as { lessons: { read: string; write: string }[] }).lessons.flatMap((l) => Array.from(l.read + l.write)));
const hsk12 = new Set([...HSK_WORDS].filter(([, l]) => l <= 2).flatMap(([w]) => Array.from(w)));
const allowed = (c: string, word: string) => moeChars.has(c) || hsk12.has(c) || word.includes(c) || PUNCT.includes(c);

// the words a sheet may bring: his school characters and ladder words, the kid glosses, the category nouns, the app's English
const targets = new Set<string>();
for (const w of builtinWords(0)) if (schoolTerm(w.text)) targets.add(w.text);
for (const w of ladderWords()) targets.add(w.text);
for (const t of Object.keys((kidGloss as unknown as { entries: Record<string, unknown> }).entries)) targets.add(t);
for (const ws of Object.values(CATEGORIES)) for (const t of ws) targets.add(t);
// the dictionary's single characters are left out: a lone 芝 or 吉 is mostly a name's piece (芝加哥, 吉田)
for (const t of Object.keys((glossary as unknown as { entries: Record<string, string> }).entries)) if (Array.from(t).length >= 2 && Array.from(t).length <= 4) targets.add(t);
const ours = (bank as unknown as { words: Record<string, string> }).words;
// only words with no sentence of the app's own (school file, bank, list bank): Tatoeba is the fallback
const wanted = [...targets].filter((t) => !BLOCKED.has(t) && !(t in ours) && !sentenceFor(matchText(t, new Map(), 0, () => t).word));

// CC-CEDICT's headwords too (public/data/cedict-words.txt), so 芝加哥 and 一劳永逸 are one token, never a target's piece
const cedict = (await readFile(new URL('../public/data/cedict-words.txt', import.meta.url), 'utf8')).split('\n').filter((l) => l && !l.startsWith('#'));
const dict = new Set([...HSK_WORDS.keys(), ...targets, ...BLOCKED, ...Object.keys((glossary as unknown as { entries: Record<string, string> }).entries), ...cedict]);
/** Word tokens, the longest dictionary word first (up to 4 characters), read forward or backward. */
function tokens(s: string, backward = false): string[] {
  const cs = backward ? Array.from(s).reverse() : Array.from(s);
  const word = (i: number, n: number) => { const p = cs.slice(i, i + n); return (backward ? [...p].reverse() : p).join(''); };
  const out: string[] = [];
  for (let i = 0; i < cs.length;) {
    let n = Math.min(4, cs.length - i);
    while (n > 1 && !dict.has(word(i, n))) n--;
    out.push(word(i, n));
    i += n;
  }
  return out;
}
/** The tokens both readings agree on: 人工 is no token of 人工作 (forward 人工|作, backward 人|工作). */
const sureTokens = (s: string) => { const back = new Set(tokens(s, true)); return new Set(tokens(s).filter((t) => back.has(t))); };

const once = (s: string, w: string) => { const at = s.indexOf(w); return at >= 0 && s.indexOf(w, at + 1) < 0; };
const rows: { id: number; s: string; toks: Set<string> }[] = [];
for (const line of (await readFile(path, 'utf8')).split('\n')) {
  const [id, lang, raw] = line.split('\t');
  if (lang !== 'cmn' || !raw) continue;
  const s = Array.from(raw.trim()).map((c) => HALF[c] ?? c).join('');
  const n = Array.from(s).length;
  if (n < MIN_LEN || n > MAX_LEN) continue;
  if (!/[。！？]$/u.test(s)) continue;
  if (!Array.from(s).every((c) => /\p{Script=Han}/u.test(c) || PUNCT.includes(c))) continue; // no Latin, digits, spaces
  if (AVOID.some((a) => s.includes(a))) continue;
  if (s.includes('儿') && !ERHUA_OK.some((ok) => s.includes(ok))) continue;
  if (Object.keys(ERHUA).some((e) => s.includes(e))) continue;
  if (blockedWordsIn(s).length || [...BLOCKED].some((b) => Array.from(b).length > 1 && s.includes(b))) continue;
  rows.push({ id: Number(id), s, toks: sureTokens(s) });
}
const rank = (s: string) => { const n = Array.from(s).length; return n < 8 ? 100 + n : n; };
rows.sort((a, b) => rank(a.s) - rank(b.s) || a.id - b.id);

const words: Record<string, { id: number; s: string }[]> = {};
let kept = 0;
for (const w of wanted.sort()) {
  const picks: { id: number; s: string }[] = [];
  for (const r of rows) {
    if (picks.length >= MAX_PER_WORD) break;
    if (!r.toks.has(w) || !once(r.s, w) || Array.from(r.s).length < Array.from(w).length + 4) continue;
    if (!Array.from(r.s).every((c) => allowed(c, w))) continue;
    picks.push({ id: r.id, s: r.s });
  }
  if (picks.length) { words[w] = picks; kept += picks.length; }
}
const out = {
  source: 'Tatoeba (https://tatoeba.org), Mandarin sentences; each keeps its Tatoeba sentence id (https://tatoeba.org/sentences/show/<id>)',
  license: 'CC BY 2.0 FR (https://creativecommons.org/licenses/by/2.0/fr/)',
  built: 'scripts/build-tatoeba.ts: simplified only, 6–20 characters, MOE 一上–三下 + HSK 1–2 characters, no blocked word or 儿化, at most 2 a word',
  words,
};
const text = `${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"')}\n`;
await writeFile(new URL('../src/content/tatoeba.json', import.meta.url), text);
console.log(`Kept ${kept} sentences for ${Object.keys(words).length} of ${wanted.length} words without one, from ${rows.length} that pass: ${(Buffer.byteLength(text) / 1024).toFixed(0)} KiB raw, ${(gzipSync(text).length / 1024).toFixed(0)} KiB gzip`);
