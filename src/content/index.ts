import data from './builtin.json';
import hsk from './hskwords.json';
import passages from './passages.json';
import type { BuiltinChar, CharInfo, Example, Passage, Word } from '../types';
import { EXTRA_EXAMPLES } from './extraExamples';
import { SWEEP_MEANINGS, SWEEP_PINYIN } from './sweepFixes';

export const BUILTIN: BuiltinChar[] = (data as unknown as { chars: BuiltinChar[] }).chars;
/** Changes when the built-in content or its fixes below change: only then does a launch rewrite the 3,000 built-in words.
 *  readingFixes.test pins a hash of both, so a content change without a bump fails the tests. */
export const CONTENT_VERSION = `${(data as unknown as { version: number }).version}.7`; // .4: 组词 at the card's reading only; .5: 一/不's tone changes count as their reading; .6: written 组词, reading fixes; .7: content sweep
export const PASSAGES: Passage[] = passages as Passage[];

const infoByChar = new Map<string, CharInfo>(
  BUILTIN.map((c) => [c.char, { char: c.char, radical: c.radical, components: c.components }]),
);

/** HSK 3.0 words (two characters or more) → HSK level 1–7 (7 = 七—九级). */
export const HSK_WORDS: ReadonlyMap<string, number> = new Map((hsk as unknown as { words: [string, number][] }).words);
const wordsByChar = new Map<string, string[]>();
for (const w of HSK_WORDS.keys()) for (const ch of new Set(w)) (wordsByChar.get(ch) ?? wordsByChar.set(ch, []).get(ch)!).push(w);
/** HSK words containing the character (组词). */
export const wordsWithChar = (ch: string): string[] => wordsByChar.get(ch) ?? [];

export function getCharInfo(char: string): CharInfo | undefined {
  return infoByChar.get(char);
}

export function isHan(ch: string): boolean {
  return /\p{Script=Han}/u.test(ch);
}

export function hanChars(text: string): string[] {
  return Array.from(text).filter(isHan);
}

export const builtinWordId = (char: string) => `b:${char}`;

export function builtinWords(now: number): Word[] {
  return BUILTIN.map((c) => ({
    id: builtinWordId(c.char),
    text: c.char,
    pinyin: builtinReading(c),
    meaning: MEANING_FIXES[c.char] ?? c.meaning,
    level: c.level,
    rank: c.rank,
    source: 'builtin' as const,
    writeable: c.writeable,
    paused: false,
    createdAt: now,
    examples: examplesFor(c),
  }));
}

/** The 组词 a card shows, at the card's reading: ones written for the app first (extraExamples.ts: chosen for a P2 child), then the HSK list's. */
function examplesFor(c: BuiltinChar): Example[] {
  const fix = (e: Example) => (EXAMPLE_FIXES[e.text] ? { ...e, pinyin: EXAMPLE_FIXES[e.text]! } : e);
  const written = (EXTRA_EXAMPLES[c.char] ?? []).map(([text, pinyin]) => fix({ text, pinyin }));
  const own = c.examples.map(fix).filter((e) => !EXAMPLE_DROPS.has(e.text) && !written.some((w) => w.text === e.text));
  return [...written, ...own].filter((e) => saysItAs(e, c.char, builtinReading(c)));
}

/**
 * The reading a P2 child meets, where the dictionary's citation reading isn't it (了 is le every day, liǎo only in 了解;
 * 夹子 jiā, 咳嗽 ké, 提供 gōng — parent, 2026-10-05).
 */
export const READING_FIXES: Record<string, string> = { 了: 'le', 夹: 'jiā', 咳: 'ké', 供: 'gōng', 教: 'jiāo', 兴: 'xìng', 漂: 'piào', 切: 'qiē' }; // the last four: content sweep
/** A built-in character's reading as his lessons teach it. */
export const builtinReading = (c: BuiltinChar): string => READING_FIXES[c.char] ?? c.pinyin;
/** 组词 readings the source data gets wrong (包子's 子 is 轻声). */
/** Meanings that go with a fixed reading: 了 read le is the particle, not liǎo "clear, to finish". */
export const MEANING_FIXES: Record<string, string> = {
  ...SWEEP_MEANINGS,
  了: '(marks a finished action or a change)',
  // the dictionary's first sense is another reading or a rare one (parent, 2026-10-05)
  只: '(for animals: a, one)', 咸: 'salty', 戴: 'to wear (a hat, glasses)', 夹: 'to clip; to hold between', 咳: 'to cough',
  供: 'to supply; to provide', 差: 'not good enough; short of',
};
export const EXAMPLE_FIXES: Record<string, string> = {
  ...SWEEP_PINYIN,
  包子: 'bāo zi',
  // 儿化: the 儿 joins the syllable before it (nǎr), written as its own "r" so each character keeps a slot (content sweep)
  哪儿: 'nǎ r', 那儿: 'nà r', 这儿: 'zhè r', 一块儿: 'yí kuài r', 玩儿: 'wán r', 好玩儿: 'hǎo wán r', 男孩儿: 'nán hái r',
  女孩儿: 'nǚ hái r', 鸟儿: 'niǎo r', 画儿: 'huà r', 味儿: 'wèi r', 聊天儿: 'liáo tiān r', 贪玩儿: 'tān wán r', 打盹儿: 'dǎ dǔn r',
  兜儿: 'dōu r', 馅儿: 'xiàn r', 冰棍儿: 'bīng gùn r', 大腕儿: 'dà wàn r', 离谱儿: 'lí pǔ r',
};
/** 组词 a child shouldn't meet on a card (content sweep): unsuitable or too obscure to teach anything. */
export const EXAMPLE_DROPS = new Set<string>([
  '自杀', '谋害', '绯闻', '暗杀', '抽烟', '笨蛋', '收买', '风流', // unsuitable
  '板块', '新兴', '风度', '第一手', '卖弄', '饱和', '雷同', '哭笑不得', // obscure, or adult words a child can't use
  '心脏', '心脏病', // zàng, on 脏's zāng ("dirty") card
]);

const toneless = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/**
 * Does this 组词 say the character the way his card teaches it? One reading per card (parent, 2026-10-05: a 调 tiáo card
 * showed 调查 diàochá); the other reading is its own word. A 轻声 syllable of the same sound counts (东西 xi, 杯子 zi).
 * A tone change in speech is the same reading (一半 yí, 一边 yì, 不对 bú): parent, 2026-10-05, 一 had lost all its 组词.
 * Examples whose pinyin doesn't line up one syllable per character are kept: they can't be checked.
 */
function saysItAs(e: { text: string; pinyin: string }, char: string, reading: string): boolean {
  const chars = Array.from(e.text);
  const syl = e.pinyin.trim().split(/\s+/);
  if (syl.length !== chars.length) return true;
  return chars.every((ch, i) => ch !== char || syl[i] === reading || (toneless(syl[i]!) === syl[i] && syl[i] === toneless(reading))
    || (SANDHI[char] ?? []).includes(syl[i]!));
}
/** 一 and 不 change tone before another syllable without being another reading. */
const SANDHI: Record<string, string[]> = { 一: ['yí', 'yì'], 不: ['bú'] };

/** Radical and components of every character in the text, de-duplicated, in order. */
export function wordComponents(text: string): string[] {
  const out: string[] = [];
  for (const ch of hanChars(text)) {
    const info = getCharInfo(ch);
    if (!info) continue;
    for (const part of [info.radical, ...info.components]) if (part && !out.includes(part)) out.push(part);
  }
  return out;
}
