// The optimizer's training data (SRS tuning spec §6.1), built from his review logs. fsrs-browser's computeParameters takes
// "items": each item is one card's history up to and including one review — its ratings and day gaps (the first gap 0).
// Free play writes no review logs, so it needs no filter here.
import { State } from 'ts-fsrs';
import type { CardRecord, ReviewLog } from '../types';
import { localDateKey } from '../lib/date';
import { localDayGap } from './scheduler';

export interface FitData {
  ratings: number[]; // every item's ratings (1–4), item after item
  deltaTs: number[]; // the matching day gaps
  lengths: number[]; // each item's length
  count: number; // the number of items: the "reviews" the parent sees
}

/**
 * A card began from placement when its first kept log was not a New card's: logs from this release say so in `state`; for older
 * logs, the card's pass came before its first answer (placement passes what it seeds; a rung passes only after two answers).
 */
function beganFromPlacement(first: ReviewLog, card: CardRecord | undefined): boolean {
  if (first.state !== undefined) return first.state !== State.New;
  return card?.passed !== undefined && card.passed <= first.at;
}

export function fitData(logs: ReviewLog[], cards: CardRecord[]): FitData {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const byCard = new Map<string, ReviewLog[]>();
  for (const l of logs) {
    if (l.kind === 'say' || l.kind === 'sentence') continue; // the parent's verdicts, on the day he recorded
    (byCard.get(l.cardId) ?? byCard.set(l.cardId, []).get(l.cardId)!).push(l);
  }
  const out: FitData = { ratings: [], deltaTs: [], lengths: [], count: 0 };
  for (const [cardId, list] of byCard) {
    const days = new Set<string>();
    const kept = list
      .sort((a, b) => a.at - b.at)
      .filter((l) => {
        const day = localDateKey(new Date(l.at));
        if (days.has(day)) return false;
        days.add(day);
        return true;
      });
    if (kept.length < 2 || beganFromPlacement(kept[0]!, cardById.get(cardId))) continue;
    const ratings = kept.map((l) => l.rating as number);
    const gaps = kept.map((l, i) => (i === 0 ? 0 : typeof l.elapsedDays === 'number' ? l.elapsedDays : localDayGap(kept[i - 1]!.at, l.at)));
    for (let k = 2; k <= kept.length; k++) {
      out.ratings.push(...ratings.slice(0, k));
      out.deltaTs.push(...gaps.slice(0, k));
      out.lengths.push(k);
      out.count++;
    }
  }
  return out;
}
