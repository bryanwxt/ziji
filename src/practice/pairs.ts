// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong. A 组词 board also has two decoy halves
// that pair with nothing (production practice spec §5), so the last pair can't be had by elimination.
import { builtinWords, HSK_WORDS } from '../content';
import { DAPEI } from '../content/dapei';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

/** `decoys`: the left and the right half that pair with nothing on the board (a 组词 board's; a 搭配 board has none). */
export interface PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string]; decoys?: [string, string] }

const TWO_CHAR = [...HSK_WORDS.entries()].filter(([w]) => Array.from(w).length === 2);

/** Join three pairs into a board, or null when they can't be told apart (a shared half, or a cross pair that also fits). */
function board(target: [string, string], extras: [string, string][], fits: (l: string, r: string) => boolean, rng: Rng): PairBoard | null {
  const pairs: [string, string][] = [target];
  for (const p of extras) {
    if (pairs.length === 3) break;
    const halves = new Set(pairs.flat());
    if (halves.has(p[0]) || halves.has(p[1])) continue;
    if (pairs.some(([l, r]) => fits(l, p[1]) || fits(p[0], r))) continue;
    pairs.push(p);
  }
  if (pairs.length < 3) return null;
  const left = shuffle(pairs.map(([l]) => l), rng);
  const partner = (l: string) => pairs.find(([a]) => a === l)![1];
  // the right column never lines a half up with its partner (that would give the answer away): a rotation of the partners
  const turn = 1 + Math.floor(rng() * (pairs.length - 1));
  const right = left.map((_, i) => partner(left[(i + turn) % left.length]!));
  return { left, right, pairs, target };
}

/** Characters that make a word with almost anything (不远, 两下, 走上…): never in a board's extra pairs, where they'd fit across. */
export const PRODUCTIVE: ReadonlySet<string> = new Set([...'不没一二三四五六七八九十两几大小好有是在上下人子们的了很走想爱会能要去来说看多少天头心中高长出开']);

const nearCache = new Map<number, string[]>();
let plain: [string, number][] | null = null;
/** The two-character HSK words up to a level that avoid PRODUCTIVE characters and aren't doubled (妈妈), in list order; worked out once per level (a round asks each word's board many times). */
function nearWords(upTo: number): string[] {
  let out = nearCache.get(upTo);
  if (!out) {
    plain ??= TWO_CHAR.filter(([w]) => { const c = Array.from(w); return c[0] !== c[1] && !c.some((ch) => PRODUCTIVE.has(ch)); });
    nearCache.set(upTo, (out = plain.filter(([, lvl]) => lvl <= upTo).map(([w]) => w)));
  }
  return out;
}

/**
 * 组词 pairing: the word's own two-character 组词 (at its reading, never a doubled word like 妈妈) and two more 词语 — from
 * characters he knows when there are enough, near his level otherwise, never with a character that fits almost anywhere.
 */
export function zuciBoard(word: Word, rng: Rng, known?: ReadonlySet<string>): PairBoard | null {
  const chars = Array.from(word.text);
  const twoChar = (t: string) => { const c = Array.from(t); return c.length === 2 && c[0] !== c[1]; };
  const own = chars.length === 2 ? (twoChar(word.text) ? word.text : undefined) : word.examples?.find((e) => twoChar(e.text) && e.text.includes(word.text))?.text;
  if (!own) return null;
  const [a, b] = Array.from(own) as [string, string];
  const near = nearWords((word.level ?? 3) + 1).filter((w) => w !== own);
  const familiar = known ? near.filter((w) => Array.from(w).every((ch) => known.has(ch))) : [];
  const pool = familiar.length >= 6 ? familiar : near;
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  const made = board([a, b], shuffle(pool, rng).map((w) => Array.from(w) as [string, string]), fits, rng);
  return made && withDecoys(made, pool, fits, rng);
}

let examples: ReadonlySet<string> | null = null;
/** A 组词 of any built-in character (切菜 isn't HSK, but it is a 组词 he may know): a decoy never makes one of these either. */
const isExample = (s: string) => (examples ??= new Set(builtinWords(0).flatMap((w) => (w.examples ?? []).map((e) => e.text)))).has(s);

/**
 * One more half on each side that pairs with nothing (production practice spec §5): characters of the board's own word pool (his
 * if he knows enough), never one on the board, one that fits almost anywhere, or one that makes a word — HSK, a built-in 组词 or
 * the word's own, either way round — with any half on the board or with the other decoy. They go in on the same row, so no pair
 * comes to sit on one. Null when no two such characters exist.
 */
function withDecoys(b: PairBoard, pool: string[], fits: (l: string, r: string) => boolean, rng: Rng): PairBoard | null {
  const joins = (x: string, y: string) => fits(x, y) || fits(y, x) || isExample(x + y) || isExample(y + x);
  const halves = b.pairs.flat();
  const free = (c: string) => !PRODUCTIVE.has(c) && !halves.includes(c) && !halves.some((h) => joins(c, h));
  const chars = shuffle([...new Set(pool.flatMap((w) => Array.from(w)))].filter(free), rng);
  const left = chars[0];
  const right = left === undefined ? undefined : chars.find((c) => c !== left && !joins(c, left));
  if (left === undefined || right === undefined) return null;
  const at = Math.floor(rng() * (b.left.length + 1));
  return { ...b, left: [...b.left.slice(0, at), left, ...b.left.slice(at)], right: [...b.right.slice(0, at), right, ...b.right.slice(at)], decoys: [left, right] };
}

/** A 搭配 question: the verb, its partner and the partner's three written wrong partners, shuffled. */
export interface DapeiQuestion { verb: string; noun: string; options: string[] }

/** 搭配 (final review C2): one of the word's own 搭配, asked as "which goes with it?", with wrong partners written for it. */
export function dapeiQuestion(word: Word, rng: Rng): DapeiQuestion | null {
  const mine = DAPEI.filter((x) => x.verb === word.text);
  if (!mine.length) return null;
  const x = shuffle(mine, rng)[0]!;
  return { verb: x.verb, noun: x.noun, options: shuffle([x.noun, ...x.wrong], rng) };
}
