// List items in 练一练 (weekly list spec 2026-10-17 §6.4, §7.6, §2.1): interleaved through the round, never beside the same word.
// Reserved items (not solid after the check) always come, spread over the first 60% of the time box, inside the due block if
// due revision fills it (fix round 2026-10-17: at the box's end they were cut); boost items after the first due items, as far as
// the box holds.
import type { Rng } from '../lib/random';
import { NONE_SHARE } from '../practice/noneOfThese';
import type { PracticeItem } from '../session/round';
import { MAX_BOOST } from './plan';

/** His median item time (8 s): how many items 练一练's time box holds. */
export const ITEM_MS = 8000;
/** Reserved items come by this share of the box. */
export const RESERVED_BY = 0.6;

function spread(out: PracticeItem[], add: PracticeItem[], lo: number, hi: number): PracticeItem[] {
  const placed: number[] = [];
  add.forEach((x, j) => {
    // its slot in the round as it was, shifted by the items put in before it
    let at = lo + Math.round(((hi - lo) * (j + 1)) / (add.length + 1));
    at += placed.filter((p) => p <= at).length;
    while (at < out.length && (out[at - 1]?.wordId === x.wordId || out[at]?.wordId === x.wordId || !!out[at - 1]?.list)) at++;
    at = Math.min(at, out.length);
    out.splice(at, 0, x);
    placed.push(at);
  });
  return out;
}

export function withList(items: PracticeItem[], list: PracticeItem[], boxItems: number): PracticeItem[] {
  const reserved = list.filter((x) => x.list?.reserved);
  const due = items.filter((x) => x.due).length;
  const room = Math.max(0, Math.min(MAX_BOOST, Math.max(Math.floor(items.length / 3), Math.floor(boxItems / 6)), boxItems - due - reserved.length));
  const boost = list.filter((x) => !x.list?.reserved).slice(0, room);
  if (!reserved.length && !boost.length) return items;
  const firstNotDue = items.findIndex((x) => !x.due);
  const lead = firstNotDue < 0 ? items.length : firstNotDue;
  const out = [...items];
  // reserved: over [min(lead, 3), 60% of the box]
  const rLo = Math.min(lead, 3, items.length);
  const rHi = Math.max(rLo, Math.min(items.length, Math.floor(RESERVED_BY * boxItems)));
  spread(out, reserved, rLo, rHi);
  // boost: after the first due items, inside the box
  const end = Math.max(1, Math.min(out.length, boxItems - boost.length));
  const bLo = Math.min(lead + reserved.length, end, out.length);
  return spread(out, boost, bLo, Math.max(bLo, end));
}

/**
 * 「都不对」 on a list's 选词填空 and single 搭配 items (production practice spec §5, weekly list spec §7.3; fix round 2026-10-17):
 * the usual share, the answer variant or the decoy variant. Never a 连一连 board, a word met today, a retry, or the check.
 */
export function withListNone(items: PracticeItem[], fresh: ReadonlySet<string>, rng: Rng): PracticeItem[] {
  return items.map((x) => {
    if (!x.list || x.list.pairs || x.retry || fresh.has(x.wordId) || (x.ask !== 'fit' && x.ask !== 'match')) return x;
    const r = rng();
    return r < NONE_SHARE ? { ...x, none: 'answer' } : r < 2 * NONE_SHARE ? { ...x, none: 'decoy' } : x;
  });
}
