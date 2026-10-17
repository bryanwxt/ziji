// List items in 练一练 (weekly list spec 2026-10-17 §6.4, §7.6, §2.1): interleaved through the round, never beside the same word,
// after its first due items, and inside the time box; reserved items (not solid after the check) always come; boost items only
// as far as the box holds.
import type { PracticeItem } from '../session/round';
import { MAX_BOOST } from './plan';

/** His median item time (8 s): how many items 练一练's time box holds. */
export const ITEM_MS = 8000;

export function withList(items: PracticeItem[], list: PracticeItem[], boxItems: number): PracticeItem[] {
  const reserved = list.filter((x) => x.list?.reserved);
  const room = Math.max(0, Math.min(MAX_BOOST, Math.floor(items.length / 3), boxItems - items.length - reserved.length));
  const add = [...reserved, ...list.filter((x) => !x.list?.reserved).slice(0, room)];
  if (!add.length) return items;
  const lead = items.findIndex((x) => !x.due);
  // inside the box (a round longer than its time box is cut, and a reserved item is never cut: §2.1), after the first due items
  const end = Math.max(1, Math.min(items.length, boxItems - add.length));
  const start = Math.min(lead < 0 ? items.length : lead, end);
  const out = [...items];
  add.forEach((x, j) => {
    let at = start + Math.round(((end - start) * (j + 1)) / (add.length + 1)) + j; // + j: the ones put in before it
    while (at < out.length && (out[at - 1]?.wordId === x.wordId || out[at]?.wordId === x.wordId)) at++;
    out.splice(Math.min(at, out.length), 0, x);
  });
  return out;
}
