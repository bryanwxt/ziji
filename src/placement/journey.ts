// The journey's worlds come from characters he learns in the app, not where placement found him (parent, 2026-10-05: a P2
// placement of ~500 characters unlocked all eight worlds on day one), and only confirmed ones (parent, 2026-10-25: a missed
// recheck took characters off and the count went down). The steps (30, 60 … 400) stay.
import { isEarned } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, getKid, getSettings, logsUntil, practisedByKind } from '../store/repo';
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
 * he learned before a re-run keeps counting, and so does an older install's whose passes the ladder migration stamped later.
 */
export async function learnedInApp(db: AppDb, know: Pick<Knowledge, 'cards' | 'confirmedWordIds' | 'wordsById' | 'ladderById'>): Promise<Set<string>> {
  const passes = know.cards.filter((c) => c.kind === 'recognise' && c.passed !== undefined && know.confirmedWordIds.has(c.wordId));
  let ownPass = (_id: string) => true; // no placement: every pass is his
  if ((await getSettings(db)).placementResult) {
    const last = passes.reduce((m, c) => Math.max(m, c.passed!), 0);
    const answered = new Map<string, number>(); // each reading card's first answer
    for (const l of await logsUntil(db, last)) if (l.kind === 'recognise') answered.set(l.cardId, Math.min(answered.get(l.cardId) ?? Infinity, l.at));
    const passedAt = new Map(passes.map((c) => [c.wordId, c.passed!]));
    ownPass = (id) => (answered.get(`${id}:recognise`) ?? Infinity) <= passedAt.get(id)!;
  }
  return new Set(passes.filter((c) => ownPass(c.wordId)).flatMap((c) => han(wordOf(know, c.wordId)?.text ?? '')));
}

/** The count before 2026-10-25: known, less placement's starting point. Only the carry is worked out from it. */
const oldCount = async (db: AppDb, known: number) => Math.max(0, known - (await base(db)));

/** Characters counted toward the next world: learned in the app, plus the carry (worked out here if Home hasn't kept it yet). */
export async function journeyCount(db: AppDb, know: Knowledge, kid?: KidState | null): Promise<number> {
  const learned = (await learnedInApp(db, know)).size;
  const carry = (kid === undefined ? await getKid(db) : kid)?.journeyCarry ?? Math.max(0, (await oldCount(db, know.known)) - learned);
  return learned + carry;
}

/**
 * Home's count. The first time after the switch to confirmed words (2026-10-25) the carry is kept on the kid: whatever the old
 * count showed above what he learned in the app stays, so the count he has seen never goes down. His reached worlds are never
 * redone (updateWorlds only adds).
 */
export async function settleJourney(db: AppDb, kid: KidState, know: Knowledge): Promise<{ count: number; kid: KidState }> {
  const learned = (await learnedInApp(db, know)).size;
  if (kid.journeyCarry !== undefined) return { count: learned + kid.journeyCarry, kid };
  const journeyCarry = Math.max(0, (await oldCount(db, know.known)) - learned);
  return { count: learned + journeyCarry, kid: { ...kid, journeyCarry } };
}
