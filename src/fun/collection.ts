import { builtinReading, builtinWordId, builtinWords } from '../content';
import { isEarned } from '../srs/scheduler';
import type { Knowledge } from '../stats/stats';
import type { BuiltinChar } from '../types';
import { powerOf, type PowerId } from './powers';

export interface CharCard {
  char: string;
  pinyin: string;
  example: string | null;
  power: PowerId | null;
  caught: boolean;
  stars: 0 | 1 | 2 | 3;
  gold: boolean; // can read *and* write it
  rarity: 'common' | 'rare';
}

import { boundPair } from '../content/kidGloss';
let shown: Map<string, string | null> | null = null;
/** The 组词 a card shows first (content audit 2026-10-15): the card's own, cleaned list — never the raw data's first, which
 *  skipped the written 组词, the blocklist and the reading check (调查 on the tiáo card, 心脏 on 脏). */
const firstExample = (char: string): string | null =>
  (shown ??= new Map(builtinWords(0).map((w) => [w.text, boundPair(w.text) ?? w.examples?.[0]?.text ?? null]))).get(char) ?? null; // a bound character's: its pair

/** Memory strength from FSRS stability (days). */
export function starsFor(stability: number): 1 | 2 | 3 {
  if (stability < 7) return 1;
  if (stability < 30) return 2;
  return 3;
}

/** One card per built-in character in the HSK levels he's working in (every caught card, plus backs up to one level
 *  past his highest; at least HSK 1–2), in learning order. Caught never goes back (earned rule); stars may. */
export function collectionCards(builtin: BuiltinChar[], know: Knowledge): CharCard[] {
  const highest = Math.max(1, ...builtin.filter((c) => know.knownChars.has(c.char)).map((c) => c.level));
  const upTo = Math.max(2, highest + 1);
  return builtin
    .filter((c) => c.level <= upTo || know.knownChars.has(c.char))
    .sort((a, b) => a.rank - b.rank)
    .map((c) => {
      const id = builtinWordId(c.char);
      const caught = know.knownChars.has(c.char);
      const rec = know.cardsById.get(`${id}:recognise`);
      const write = know.cardsById.get(`${id}:write`);
      return {
        char: c.char,
        pinyin: builtinReading(c),
        example: firstExample(c.char),
        power: powerOf(c),
        caught,
        stars: caught && rec ? starsFor(rec.fsrs.stability) : 0,
        gold: caught && !!write && isEarned(write.fsrs),
        rarity: c.level === 1 ? 'common' : 'rare',
      };
    });
}
