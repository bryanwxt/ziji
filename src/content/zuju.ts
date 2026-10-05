// 组句 (spec 2026-10-05 §3.2 rung 4): a sentence that uses the word, cut into word tiles for him to put in order. Built only
// from sentences written for this app (the bank) and his class sentences (on the iPad); never generated from nothing.
import type { Rng } from '../lib/random';
import type { Word } from '../types';
import { HSK_WORDS } from '.';
import { bankFor, fillGap, SENTENCE_BANK } from './sentenceBank';

export interface ZujuItem { full: string; tiles: string[]; orders: string[][] }

export const MIN_TILES = 4;
export const MAX_TILES = 6;
const PUNCT = new Set([...'，。！？、；：']);
const PARTICLES = new Set([...'了吗吧呢的得着过']);
const NUMERALS = new Set([...'一二三四五六七八九十两几这那每哪']);
const MEASURES = new Set([...'个本杯只条张件位次天点岁块双把辆台首节些']);
const TIME_WORDS = new Set(['今天', '明天', '昨天', '现在', '早上', '晚上', '上午', '下午', '中午', '每天', '天天', '后来', '刚才', '以前', '星期天', '周末', '放学后']);
const SUBJECTS = new Set(['我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '大家', '爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹', '爷爷', '奶奶', '老师']);

let dict: Set<string> | null = null;
const known = () => (dict ??= new Set([...HSK_WORDS.keys(), ...SENTENCE_BANK.map((b) => b.word)]));

/**
 * Word tiles, the longest dictionary word first. Punctuation and a lone 了/吗/吧/的… stay with the word before it, a number
 * keeps its measure word (一杯) and a doubled character stays whole (天天), so every tile is something a child would say.
 */
export function tiles(sentence: string): string[] {
  const chars = Array.from(sentence);
  const out: string[] = [];
  for (let i = 0; i < chars.length; ) {
    let len = Math.min(4, chars.length - i);
    while (len > 1 && !known().has(chars.slice(i, i + len).join(''))) len--;
    const piece = chars.slice(i, i + len).join('');
    const last = out.length - 1;
    const prev = out[last];
    if (prev !== undefined && len === 1 && (PUNCT.has(piece) || PARTICLES.has(piece))) out[last] = prev + piece;
    else if (prev !== undefined && len === 1 && ((NUMERALS.has(prev) && MEASURES.has(piece)) || prev === piece)) out[last] = prev + piece;
    else out.push(piece);
    i += len;
  }
  return out;
}

/**
 * The orders accepted besides the written one (final review I3): a time word before or after the subject (今天我… / 我今天…),
 * and the two names around 和/跟 swapped (我和哥哥… / 哥哥和我…). He hears the sentence first, so other orders that change
 * who does what (我给妈妈 / 妈妈给我) are not his to guess.
 */
function ordersOf(t: string[]): string[][] {
  const out: string[][] = [t];
  const add = (o: string[]) => { if (!out.some((x) => x.join('|') === o.join('|'))) out.push(o); };
  if (t.length >= 3 && TIME_WORDS.has(t[0]!) && SUBJECTS.has(t[1]!)) add([t[1]!, t[0]!, ...t.slice(2)]);
  if (t.length >= 3 && SUBJECTS.has(t[0]!) && TIME_WORDS.has(t[1]!)) add([t[1]!, t[0]!, ...t.slice(2)]);
  for (const o of [...out]) {
    const k = o.findIndex((x) => x === '和' || x === '跟');
    if (k > 0 && k < o.length - 1 && SUBJECTS.has(o[k - 1]!) && SUBJECTS.has(o[k + 1]!)) add([...o.slice(0, k - 1), o[k + 1]!, o[k]!, o[k - 1]!, ...o.slice(k + 2)]);
  }
  return out;
}

/** A sentence as a 组句: 4–6 different tiles with `keep` whole in one; null when it doesn't cut that way. */
export function zujuOf(full: string, keep: string): ZujuItem | null {
  const t = tiles(full);
  if (t.length < MIN_TILES || t.length > MAX_TILES || new Set(t).size !== t.length) return null;
  if (!t.some((x) => x.includes(keep))) return null;
  return { full, tiles: t, orders: ordersOf(t) };
}

/** The 组句 sentences for a word: his class sentences first, then the bank's, each 4–6 different tiles with the word whole in one. */
export function zujuFor(word: Word): ZujuItem[] {
  const bank = bankFor(word.text);
  const sentences = [...(word.sentences ?? []).map((s) => s.text), ...(bank ? bank.gaps.map((g) => fillGap(g, word.text)) : [])];
  return sentences.map((s) => zujuOf(s, word.text)).filter((z): z is ZujuItem => z !== null);
}

/** One of the word's 组句 sentences for this lesson (final review I5): a word back at 组句 gets a different one now and then. */
export function pickZuju(word: Word, rng: Rng): ZujuItem | null {
  const all = zujuFor(word);
  return all.length ? all[Math.floor(rng() * all.length)]! : null;
}
