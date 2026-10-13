// A made-up child's review history, for the optimizer check and the fit sweep's Skills panel (SRS tuning spec §9): cards learned
// over `days`, each answered when due, remembered with a chance that falls with the gap. Deterministic for a given seed.
import { Rating, type Grade } from 'ts-fsrs';
import { addDays } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { newCard, review, snapshot } from '../srs/scheduler';
import type { CardKind, CardRecord, ReviewLog } from '../types';

export function makeReviewHistory(o: { cards: number; days: number; end: Date; seed?: number; wordIds?: string[] }): { logs: ReviewLog[]; cards: CardRecord[] } {
  const rng = mulberry32(o.seed ?? 7);
  const start = addDays(o.end, -o.days);
  const logs: ReviewLog[] = [];
  const cards: CardRecord[] = [];
  for (let i = 0; i < o.cards; i++) {
    const kind: CardKind = i % 3 === 2 ? 'write' : i % 3 === 1 ? 'meaning' : 'recognise';
    const wordId = o.wordIds?.[i % o.wordIds.length] ?? `b:w${i}`;
    const id = `${wordId}:${kind}`;
    if (cards.some((c) => c.id === id)) continue;
    let at = new Date(addDays(start, Math.floor(rng() * o.days * 0.6)).setHours(16, 0, 0, 0));
    let fsrs = newCard(at);
    while (at.getTime() <= o.end.getTime()) {
      const gap = fsrs.last_review ? (at.getTime() - fsrs.last_review.getTime()) / 86_400_000 : 0;
      const remembered = rng() < Math.max(0.55, 0.97 - gap * 0.004);
      const rating: Grade = !remembered ? Rating.Again : rng() < 0.25 ? Rating.Hard : Rating.Good;
      logs.push({ cardId: id, wordId, kind, at: at.getTime(), rating, correct: remembered, responseMs: 1500 + Math.floor(rng() * 3000), ...snapshot(fsrs, at) });
      fsrs = review(fsrs, rating, at);
      at = new Date(Math.max(fsrs.due.getTime(), addDays(at, 1).setHours(16, 0, 0, 0)));
    }
    cards.push({ id, wordId, kind, fsrs });
  }
  return { logs: logs.sort((a, b) => a.at - b.at), cards };
}
