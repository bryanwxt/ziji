// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong.
import { HSK_WORDS } from '../content';
import { DAPEI } from '../content/dapei';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string] }

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
  const ok = (w: string) => !Array.from(w).some((ch) => PRODUCTIVE.has(ch)) && twoChar(w);
  const near = TWO_CHAR.filter(([w, lvl]) => w !== own && ok(w) && lvl <= (word.level ?? 3) + 1).map(([w]) => w);
  const familiar = known ? near.filter((w) => Array.from(w).every((ch) => known.has(ch))) : [];
  const pool = familiar.length >= 6 ? familiar : near;
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  return board([a, b], shuffle(pool, rng).map((w) => Array.from(w) as [string, string]), fits, rng);
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
