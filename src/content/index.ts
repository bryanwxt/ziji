import data from './builtin.json';
import hsk from './hskwords.json';
import passages from './passages.json';
import storybooks from './storybooks.json';
import type { BuiltinChar, CharInfo, Example, Passage, Word } from '../types';
import { EXTRA_EXAMPLES } from './extraExamples';
import { ZUCI_DROPS } from './zuciPicks';
import { LESSONS, listedBy } from './curriculum';
import { SWEEP_MEANINGS, SWEEP_PINYIN } from './sweepFixes';
import { BLOCKED } from './blocked';

export const BUILTIN: BuiltinChar[] = (data as unknown as { chars: BuiltinChar[] }).chars;
/** Changes when the built-in content or its fixes below change: only then does a launch rewrite the 3,000 built-in words.
 *  readingFixes.test pins a hash of both, so a content change without a bump fails the tests. */
export const CONTENT_VERSION = `${(data as unknown as { version: number }).version}.12`; // .4: 组词 at the card's reading only; .5: 一/不's tone changes count as their reading; .6: written 组词, reading fixes; .7: content sweep; .8: second sweep (HSK 5–9, sentences); .9: school order (MOE 2.0 lists); .10: the HCL writing lists;
// .11: 蚂蚁拇狐狸 and readable 组词; .12: the content audit (the blocklist, the readings his lessons use, 组词 a child knows first)
/** 朗读's built-in passages (spec 2026-10-15 §2): ours, then the Global Storybooks chunks (scripts/import-storybooks.ts). */
export const PASSAGES: Passage[] = [...(passages as Passage[]), ...(storybooks as unknown as { passages: Passage[] }).passages];

const infoByChar = new Map<string, CharInfo>(
  BUILTIN.map((c) => [c.char, { char: c.char, radical: c.radical, components: c.components }]),
);

/** HSK 3.0 words (two characters or more) → HSK level 1–7 (7 = 七—九级). */
export const HSK_WORDS: ReadonlyMap<string, number> = new Map((hsk as unknown as { words: [string, number][] }).words);
const wordsByChar = new Map<string, string[]>();
for (const w of HSK_WORDS.keys()) if (!BLOCKED.has(w)) for (const ch of new Set(w)) (wordsByChar.get(ch) ?? wordsByChar.set(ch, []).get(ch)!).push(w);
/** HSK words containing the character (组词), never a blocked one. HSK_WORDS itself keeps every word: it also answers "is this a
 *  real word?" (a cross pair, a 字辨 swap), and a blocked word is still a word. */
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

/**
 * School order (parent, 2026-10-06): his textbook 《欢乐伙伴2.0》's characters first, lesson by lesson (一上 lesson 1 … 三下),
 * then the rest in their HSK order. New words, placement bands and writing all follow this, so the app teaches what school
 * teaches when it teaches it. MOE's own lists: 识读字 to recognise, 识写字 to write.
 */
const MOE_ORDER = new Map<string, number>();
const MOE_TERM = new Map<string, string>();
for (const l of LESSONS) for (const ch of Array.from(l.read)) if (!MOE_ORDER.has(ch)) { MOE_ORDER.set(ch, MOE_ORDER.size); MOE_TERM.set(ch, l.term); }
/**
 * The 识写字 of his course: 华文 (CL), 高级华文 (HCL, which writes more: 435 by the end of P2 to CL's 350), or both lists (spec
 * 2026-10-11 §6: the default). All read the same.
 */
export type Course = 'cl' | 'hcl' | 'both';
const writtenIn = new Map<Course, Set<string>>();
/** Every character his course's book has him write, by its last lesson (curriculum's lists). */
const moeWrite = (course: Course): Set<string> => writtenIn.get(course) ?? writtenIn.set(course, listedBy(LESSONS.length - 1, course).write).get(course)!;
/** His textbook's terms in order (P1 上 … P3 下). */
export const MOE_TERMS = ['一上', '一下', '二上', '二下', '三上', '三下'];
const schoolRank = (c: BuiltinChar): number => MOE_ORDER.get(c.char) ?? MOE_ORDER.size + c.rank;
/** The textbook term that teaches a character (二上), if it's one of his school characters. */
export const schoolTerm = (char: string): string | undefined => MOE_TERM.get(char);

export function builtinWords(now: number, course: Course = 'cl'): Word[] {
  return BUILTIN.map((c) => ({
    id: builtinWordId(c.char),
    text: c.char,
    pinyin: builtinReading(c),
    meaning: MEANING_FIXES[c.char] ?? c.meaning,
    level: c.level,
    rank: schoolRank(c),
    source: 'builtin' as const,
    writeable: MOE_ORDER.has(c.char) ? moeWrite(course).has(c.char) : c.writeable, // a school character is written once his course's book asks
    paused: false,
    createdAt: now,
    examples: examplesFor(c),
  }));
}

/** The 组词 a card shows, at the card's reading: ones written for the app first (extraExamples.ts: chosen for a P2 child), then the HSK list's. */
function examplesFor(c: BuiltinChar, { onCard = true } = {}): Example[] {
  const fix = (e: Example) => (EXAMPLE_FIXES[e.text] ? { ...e, pinyin: EXAMPLE_FIXES[e.text]! } : e);
  const written = (EXTRA_EXAMPLES[c.char] ?? []).map(([text, pinyin]) => fix({ text, pinyin }));
  const dropped = new Set(onCard ? (ZUCI_DROPS[c.char] ?? '').split(' ') : []);
  const own = c.examples.map(fix).filter((e) => !BLOCKED.has(e.text) && !dropped.has(e.text) && !written.some((w) => w.text === e.text));
  return [...written, ...own].filter((e) => saysItAs(e, c.char, builtinReading(c)));
}
/**
 * The 组词 a card leaves off (zuciPicks.ts ZUCI_DROPS: 马虎 on 虎, 四周 on 四) at its reading: still words of his ladder, only not
 * shown on the card (review 2026-10-15: dropping them from the card had taken them off the ladder too).
 */
export function cardDroppedExamples(char: string): Example[] {
  const c = builtinByChar.get(char);
  if (!c || !ZUCI_DROPS[char]) return [];
  const shown = new Set(examplesFor(c).map((e) => e.text));
  return examplesFor(c, { onCard: false }).filter((e) => !shown.has(e.text));
}

/**
 * The reading a P2 child meets, where the dictionary's citation reading isn't it (了 is le every day, liǎo only in 了解;
 * 夹子 jiā, 咳嗽 ké, 提供 gōng — parent, 2026-10-05).
 */
export const READING_FIXES: Record<string, string> = {
  了: 'le', 夹: 'jiā', 咳: 'ké', 供: 'gōng', 教: 'jiāo', 兴: 'xìng', 漂: 'piào', 切: 'qiē', // content sweep
  帖: 'tiě', 荫: 'yīn', 咧: 'liě', 唉: 'āi', 唠: 'láo', 倔: 'jué', 粘: 'zhān', 喇: 'lǎ', 遛: 'liù', 曝: 'bào', // second sweep
  // content audit 2026-10-15: the reading his lesson uses (萝卜 in the 拔萝卜 story, 应该, 炸鸡/油炸 in the food lesson, 种花 in the
  // jobs lesson, a mouse 钻进 a hole, 抹布 for cleaning, 仔细). 觉: 二下 L13 reads 睡觉 (jiào), the first lesson that has it;
  // 觉得 (jué, HCL's write list in the same lesson) shows its own pinyin wherever it appears
  卜: 'bo', 应: 'yīng', 炸: 'zhá', 种: 'zhòng', 钻: 'zuān', 抹: 'mā', 仔: 'zǐ', 觉: 'jiào',
  勒: 'lēi', // review 2026-10-15: 勒紧, not the lè of 悬崖勒马
};
/** Cards whose reading changed with content 1.12: his Say and Hear rungs on them were earned at the old one (readingMigration.ts). */
export const READINGS_CHANGED_1_12 = [...'卜应炸种钻抹仔觉勒'];
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
  // with the content audit's readings (2026-10-15)
  卜: '(in 萝卜: radish)', 应: 'should; ought to', 炸: 'to fry (in oil)', 种: 'to plant; to grow', 钻: 'to squeeze into; to burrow',
  抹: 'to wipe (抹布: a cleaning cloth)', 仔: 'careful (in 仔细)', 觉: 'sleep (in 睡觉)',
  勒: 'to tie tight; to strap',
};
export const EXAMPLE_FIXES: Record<string, string> = {
  ...SWEEP_PINYIN,
  包子: 'bāo zi', 种植: 'zhòng zhí', // 种植 is planting (zhòng); pinyin-pro reads zhǒng (review 2026-10-15)
  // 儿化: the 儿 joins the syllable before it (nǎr), written as its own "r" so each character keeps a slot (content sweep)
  哪儿: 'nǎ r', 那儿: 'nà r', 这儿: 'zhè r', 一块儿: 'yí kuài r', 玩儿: 'wán r', 好玩儿: 'hǎo wán r', 男孩儿: 'nán hái r',
  女孩儿: 'nǚ hái r', 鸟儿: 'niǎo r', 画儿: 'huà r', 味儿: 'wèi r', 聊天儿: 'liáo tiān r', 贪玩儿: 'tān wán r', 打盹儿: 'dǎ dǔn r',
  兜儿: 'dōu r', 馅儿: 'xiàn r', 冰棍儿: 'bīng gùn r', 大腕儿: 'dà wàn r', 离谱儿: 'lí pǔ r',
};
export { BLOCKED, EXAMPLE_DROPS } from './blocked';

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
const builtinByChar = new Map(BUILTIN.map((c) => [c.char, c]));
/**
 * May a word with `ch` be shown to the child as its family (spec 2026-10-12 §5)? Not a dropped word, and one that says `ch` at the
 * reading its card teaches. Stricter than examplesFor: a reading that doesn't line up one syllable per character can't be
 * checked, so it is left out (a child must not get a wrong reading). The built-in card's reading decides; `reading` (the card's
 * own, when the caller has it) stands in for a parent-added character that isn't built in, so it still gets the check (final
 * review M3). A stored word's pinyin may predate a READING_FIXES entry, so it never overrides the built-in reading.
 */
export function suitableExample(ch: string, e: { text: string; pinyin: string }, reading?: string): boolean {
  if (BLOCKED.has(e.text)) return false;
  if (e.pinyin.trim().split(/\s+/).length !== Array.from(e.text).length) return false;
  const c = builtinByChar.get(ch);
  const at = c ? builtinReading(c) : reading?.trim();
  return !at || saysItAs(e, ch, at);
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
