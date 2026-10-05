// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong.
import { HSK_WORDS } from '../content';
import { DAPEI, GENERAL_VERBS, isDapei } from '../content/dapei';
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
  return { left: shuffle(pairs.map(([l]) => l), rng), right: shuffle(pairs.map(([, r]) => r), rng), pairs, target };
}

/** 组词 pairing: the word's own two-character 组词 (at its reading) and two more HSK 词语 near its level. */
export function zuciBoard(word: Word, rng: Rng): PairBoard | null {
  const chars = Array.from(word.text);
  const own = chars.length === 2 ? word.text : word.examples?.find((e) => Array.from(e.text).length === 2 && e.text.includes(word.text))?.text;
  if (!own) return null;
  const [a, b] = Array.from(own) as [string, string];
  const near = TWO_CHAR.filter(([w, lvl]) => w !== own && lvl <= (word.level ?? 3) + 1).map(([w]) => Array.from(w) as [string, string]);
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  return board([a, b], shuffle(near, rng), fits, rng);
}

/** 搭配 pairing: one of the word's own 搭配 and two more, never with a verb that goes with almost anything. */
export function dapeiBoard(word: Word, rng: Rng): PairBoard | null {
  const mine = DAPEI.filter(([l, r]) => l === word.text || r === word.text);
  if (!mine.length) return null;
  const target = shuffle(mine, rng)[0]!;
  const extras = shuffle(DAPEI.filter(([l, r]) => !GENERAL_VERBS.has(l) && l !== word.text && r !== word.text), rng);
  const fits = (l: string, r: string) => isDapei(l, r) || HSK_WORDS.has(l + r);
  return board([target[0], target[1]], extras, fits, rng);
}
