// The word gate (content audit 2026-10-15): one place that decides which words a P2 child may meet and how each is read.
// The build applies it where it can (scripts/build-content.ts keeps no blocked 组词 in builtin.json; scripts/gen-pinyin.ts
// snapshots every written sentence's pinyin for the tests), and the surfaces the build can't reach ask it at runtime: the family row, the
// ladder, 连一连's near words, a meaning question's choices, 搭配 and the collection.
import { BLOCKED, BLOCK_REASON } from './blocked';
import { CHENGYU, chengyuPinyin } from './chengyu';
import { DAPEI } from './dapei';
import { BUILTIN, builtinReading, builtinWords, EXAMPLE_FIXES, HSK_WORDS } from './index';
import { SENTENCE_BANK } from './sentenceBank';
import s1a from './sentences/一上.json';
import s1b from './sentences/一下.json';
import s2a from './sentences/二上.json';
import s2b from './sentences/二下.json';
import { sentenceReading } from './storedPinyin';

export { BLOCKED, BLOCK_REASON };

/** The highest HSK level a word may have to be shown without anyone having chosen it for him. */
export const CHILD_HSK = 4;

let vetted: Set<string> | null = null;
/** Words someone chose for him: every card's 组词 (the HSK list's that the audit kept, and the ones written for the app), 搭配,
 *  the sentence bank's words and choices, the 成语 list and the Understand rung's words. */
function vettedWords(): Set<string> {
  if (!vetted) {
    vetted = new Set<string>();
    for (const w of builtinWords(0)) for (const e of w.examples ?? []) vetted.add(e.text);
    for (const d of DAPEI) for (const t of [d.verb, d.noun, d.verb + d.noun, ...d.wrong]) vetted.add(t);
    for (const b of SENTENCE_BANK) for (const t of [b.word, ...b.gaps.flatMap((g) => g.wrong)]) vetted.add(t);
    for (const c of CHENGYU) vetted.add(c.text);
    for (const r of [s1a, s1b, s2a, s2b].flat() as { word: string }[]) vetted.add(r.word);
  }
  return vetted;
}

/** May a word be shown to him? Never a blocked one; else a single character, an HSK 1–4 word, or a word chosen for him. */
export function isChildWord(text: string): boolean {
  const t = text.trim();
  if (BLOCKED.has(t)) return false;
  if (Array.from(t).length === 1) return true;
  const level = HSK_WORDS.get(t);
  return (level !== undefined && level <= CHILD_HSK) || vettedWords().has(t);
}

export { sentenceReading };

let known: Map<string, string> | null = null;
/** Readings already checked: each card's own (with READING_FIXES) and every 组词 shown on a card (with EXAMPLE_FIXES). */
function knownReadings(): Map<string, string> {
  if (!known) {
    known = new Map(BUILTIN.map((c) => [c.char, builtinReading(c)]));
    for (const w of builtinWords(0)) for (const e of w.examples ?? []) if (!known.has(e.text)) known.set(e.text, e.pinyin);
  }
  return known;
}

/**
 * The one pinyin source for a shown word or sentence, one syllable per Han character: a fixed reading (EXAMPLE_FIXES), a card's
 * or 组词's checked reading, a 成语's, else pinyin-pro in context with the app's fixes (a written sentence: storedPinyin.ts).
 */
export function readingOf(text: string): string {
  const t = text.trim();
  return EXAMPLE_FIXES[t] ?? knownReadings().get(t) ?? (CHENGYU.some((c) => c.text === t) ? chengyuPinyin(t) : undefined) ?? sentenceReading(t);
}

/**
 * The pinyin of each part of a whole that the parts make up in order (组句's tiles of their sentence), read in the whole: 转 in
 * 小狗在地上转圈 is zhuàn, not the zhuǎn it is alone (content audit 2026-10-15). Undefined for a part that doesn't line up.
 */
export function readingsInContext(whole: string, parts: readonly string[]): (string | undefined)[] {
  const isHan = (c: string) => /\p{Script=Han}/u.test(c);
  const syl = readingOf(whole).split(/\s+/).filter(Boolean);
  const lines = parts.join('') === whole && Array.from(whole).filter(isHan).length === syl.length;
  let k = 0;
  return parts.map((p) => {
    const n = Array.from(p).filter(isHan).length;
    const out = lines && n ? syl.slice(k, k + n).join(' ') : undefined;
    k += n;
    return out;
  });
}

const toneless = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
const SANDHI = new Set([...'一不七八']);
/** Is `syl` the reading `r` of `ch`? Its 轻声 (东西 xi), 一/不/七/八's tone changes and 儿化's r count as the same reading. */
export function sameReading(ch: string, syl: string, r: string): boolean {
  const a = syl.normalize('NFC');
  const b = r.normalize('NFC');
  if (a === b) return true;
  if (toneless(a) === a && toneless(b) === a) return true;
  if (SANDHI.has(ch) && toneless(a) === toneless(b)) return true;
  return ch === '儿' && a === 'r';
}

/**
 * How a half of a word is said on its own (连一连's tiles): at its reading in that word when that is another reading than its
 * card's (长 in 长大: zhǎng, content audit 2026-10-15), else at its card's — the reading its clip is filed under.
 */
export function halfReading(word: string, at: number): string | undefined {
  const chars = Array.from(word);
  const ch = chars[at];
  if (!ch) return undefined;
  const card = knownReadings().get(ch);
  const syl = readingOf(word).split(' ');
  if (syl.length !== chars.length) return card;
  return card && sameReading(ch, syl[at]!, card) ? card : syl[at];
}
