// 「都不对 None of these」 (production practice spec §5): about one in five 组词-gap, 搭配 and English-meaning questions in a
// lesson leave the right answer out and add 都不对, which is then the right answer — so he can't pick by elimination.
import type { Rng } from '../lib/random';
import type { Ask, PracticeItem } from '../session/round';

export const NONE_OF_THESE = '都不对';
/** The share of the questions that can take it which do (seeded per lesson). */
export const NONE_SHARE = 0.2;
/** The questions it can come in: the 组词 gap, 搭配, and the English meaning (heard or read). */
export const NONE_ASKS: ReadonlySet<Ask> = new Set<Ask>(['word', 'match', 'meaningRead', 'hear']);

/**
 * Marks the questions that leave their answer out: each that can take it with chance NONE_SHARE, from `rng` (the lesson's seed),
 * but never a word's first question in the lesson, a word introduced today (`fresh`), or a retry.
 */
export function withNoneOfThese(items: PracticeItem[], fresh: ReadonlySet<string>, rng: Rng): PracticeItem[] {
  const seen = new Set<string>();
  return items.map((x) => {
    const first = !seen.has(x.wordId);
    seen.add(x.wordId);
    if (first || x.retry || fresh.has(x.wordId) || !NONE_ASKS.has(x.ask)) return x;
    return rng() < NONE_SHARE ? { ...x, none: true } : x;
  });
}

/** A question's choices without its right one, 都不对 last (as many choices as before). */
export const noneChoices = (options: string[], answer: string): string[] => [...options.filter((o) => o !== answer), NONE_OF_THESE];
