// The journey's worlds come from characters he learns in the app, counted from where placement found him (parent,
// 2026-10-05: a P2 placement of ~500 characters unlocked all eight worlds on day one). The steps (30, 60 … 400) stay.
import { isEarned } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, getSettings, practisedByKind, updateSettings } from '../store/repo';
import type { CardKind, CardRecord, KidState } from '../types';
import { resetWorlds } from '../fun/worlds';

const knownReading = (cards: CardRecord[]) => cards.filter((c) => c.kind === 'recognise' && isEarned(c.fsrs));

/** Characters he knows but has never practised: placement's, for an install placed before the starting point was saved. */
export function unpractisedKnown(cards: CardRecord[], byKind: Map<CardKind, Set<string>>): number {
  const practised = byKind.get('recognise') ?? new Set<string>();
  return knownReading(cards).filter((c) => !practised.has(c.wordId)).length;
}

/** The starting point a placement leaves: what he knows now, less what he had already learned in the app. */
export function startingPoint(knownAfter: number, learnedBefore: number): number {
  return Math.max(0, knownAfter - learnedBefore);
}
export const countKnownReading = (cards: CardRecord[]) => knownReading(cards).length;

async function base(db: AppDb): Promise<{ base: number; saved: boolean }> {
  const s = await getSettings(db);
  if (!s.placementResult) return { base: 0, saved: true };
  if (s.placementResult.worldBase !== undefined) return { base: s.placementResult.worldBase, saved: true };
  const [cards, byKind] = await Promise.all([allCards(db), practisedByKind(db)]);
  return { base: unpractisedKnown(cards, byKind), saved: false };
}

/** Characters counted toward the next world: known, less what placement found he already knew. */
export async function journeyCount(db: AppDb, known: number): Promise<number> {
  return Math.max(0, known - (await base(db)).base);
}

/**
 * Home's count, saving the starting point the first time on an install placed before it was kept. That first time his
 * worlds are redone from the new count (the room's pick goes back to the newest reached), once.
 */
export async function settleJourney(db: AppDb, kid: KidState, known: number): Promise<{ count: number; kid: KidState }> {
  const b = await base(db);
  const count = Math.max(0, known - b.base);
  if (b.saved) return { count, kid };
  const s = await getSettings(db);
  await updateSettings(db, { placementResult: { ...s.placementResult!, worldBase: b.base } });
  return { count, kid: resetWorlds(kid, count) };
}
