// The journey's worlds come from characters he learns in the app, not where placement found him (parent, 2026-10-05: a P2
// placement of ~500 characters unlocked all eight worlds on day one), and only confirmed ones (parent, 2026-10-25: a missed
// recheck took characters off and the count went down). The steps (30, 60 … 400) stay.
import { isEarned } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, firstLogByCard, getKid, getSettings, practisedByKind } from '../store/repo';
import { WORLDS } from '../fun/worlds';
import { wordOf, type Knowledge } from '../stats/stats';
import type { CardKind, CardRecord, KidState } from '../types';

const knownReading = (cards: CardRecord[]) => cards.filter((c) => c.kind === 'recognise' && (c.passed !== undefined || isEarned(c.fsrs))); // passed on the ladder, or earned before it

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

async function base(db: AppDb): Promise<number> {
  const s = await getSettings(db);
  if (!s.placementResult) return 0;
  if (s.placementResult.worldBase !== undefined) return s.placementResult.worldBase;
  const [cards, byKind] = await Promise.all([allCards(db), practisedByKind(db)]);
  return unpractisedKnown(cards, byKind);
}

const han = (text: string) => Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch));

/**
 * Characters he learned in the app (parent decision 2026-10-25): in a confirmed word whose reading pass came from his own
 * answers. A placed card's pass has no answer at or before it (placement gave it; a right recheck comes after), so a guess —
 * confirmed or not — never counts, and a missed recheck can't take one away. Its own answers, not placement's time: a word
 * he learned before a re-run keeps counting.
 */
export async function learnedInApp(db: AppDb, know: Pick<Knowledge, 'cards' | 'confirmedWordIds' | 'wordsById' | 'ladderById'>): Promise<Set<string>> {
  const passes = know.cards.filter((c) => c.kind === 'recognise' && c.passed !== undefined && know.confirmedWordIds.has(c.wordId));
  let ownPass = (_c: CardRecord) => true; // no placement: every pass is his
  if ((await getSettings(db)).placementResult) {
    const first = await firstLogByCard(db); // each card's first answer (review M1)
    ownPass = (c) => (first.get(c.id) ?? Infinity) <= c.passed!;
  }
  return new Set(passes.filter(ownPass).flatMap((c) => han(wordOf(know, c.wordId)?.text ?? '')));
}

/** The count before 2026-10-25: known, less placement's starting point. Only the carry is worked out from it. */
const oldCount = async (db: AppDb, known: number) => Math.max(0, known - (await base(db)));

/** Where the newest world he has reached starts: the count is never below it (review I1). */
const reachedAt = (kid: KidState | null | undefined) => Math.max(0, ...WORLDS.filter((w) => kid?.worldsSeen.includes(w.id)).map((w) => w.at));

/** The carry: what the old count — or a world he is already in, if failed rechecks had lowered it below — has over learned. */
const carryOf = async (db: AppDb, know: Knowledge, kid: KidState | null | undefined, learned: number) =>
  Math.max(0, Math.max(await oldCount(db, know.known), reachedAt(kid)) - learned);

/** Characters counted toward the next world: learned in the app, plus the carry (worked out here if Home hasn't kept it yet). */
export async function journeyCount(db: AppDb, know: Knowledge, kid?: KidState | null): Promise<number> {
  const learned = (await learnedInApp(db, know)).size;
  const k = kid === undefined ? await getKid(db) : kid;
  return learned + (k?.journeyCarry ?? (await carryOf(db, know, k, learned)));
}

/**
 * Home's count. The first time after the switch to confirmed words (2026-10-25) the carry is kept on the kid, so the count he
 * has seen never goes down and never sits below a world he is in; so is what known was then (`knownAtSwitch`), so a goal set
 * before it never goes back (review I3). His reached worlds are never redone (updateWorlds only adds).
 */
export async function settleJourney(db: AppDb, kid: KidState, know: Knowledge, now: Date): Promise<{ count: number; kid: KidState }> {
  const learned = (await learnedInApp(db, know)).size;
  if (kid.journeyCarry !== undefined) return { count: learned + kid.journeyCarry, kid };
  const journeyCarry = await carryOf(db, know, kid, learned);
  return { count: learned + journeyCarry, kid: { ...kid, journeyCarry, knownAtSwitch: { count: know.known, at: now.getTime() } } };
}
