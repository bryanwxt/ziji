import { meaningCue } from '../activities/flashcards/meaning';
import { NEW_MEANING_PER_DAY } from '../session/plan';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, allWords, deleteCards, getSettings, practisedByKind, putCards, updateSettings } from '../store/repo';
import { countKnownReading, startingPoint, unpractisedKnown } from './journey';
import type { CardRecord, Word } from '../types';
import { seedPlacementCards } from './placement';
import { queueHearChecks } from '../ladder/migrate';
import type { WalkAnswer } from './walk';
import { ladderWords } from '../content/ladder';
import { canAskRung } from '../ladder/rungs';

/**
 * What a placement check found (spec 2026-10-14): the characters he reads, the characters asked and missed, and the term he
 * reads up to (null: none). heardIds: words heard right, as hear guesses (the v2 听一听 asked meanings; v2.1 asks none).
 */
export interface PlacementOutcome { readingIds: string[]; heardIds?: string[]; askedIds: string[]; missed: string[]; readsUpTo: string | null }

/**
 * Every character of the terms up to `upTo`, and every character answered right in a higher term — less any he just missed;
 * the characters asked; and the ones missed. 读一读 and 听一听 (hear it, find it among look-alikes) both test reading the
 * character (spec v2.1), so both count.
 */
export function placementIds(terms: Word[][], answers: WalkAnswer[], upTo: number | null): Omit<PlacementOutcome, 'readsUpTo'> {
  const missedReading = new Set(answers.filter((a) => !a.correct).map((a) => a.wordId));
  const passed = upTo === null ? [] : terms.slice(0, upTo + 1).flat().map((w) => w.id);
  const readingIds = [...new Set([...passed, ...answers.filter((a) => a.correct).map((a) => a.wordId)])].filter((id) => !missedReading.has(id));
  const askedIds = [...new Set(answers.map((a) => a.charId ?? a.wordId))];
  const missed = [...missedReading];
  return { readingIds, askedIds, missed };
}

/**
 * Saves a placement result. Characters he reads and hasn't practised get a placed recognise card (passed, `placed`, first
 * rechecks in school order); none gets a known meaning card: each gets a meaning card due soon, a few a day. Words heard right
 * get a hear card marked as a guess. A re-run replaces the earlier placement: cards it no longer supports are cleared unless he
 * has practised them. Returns the number of new reading cards.
 */
export async function applyPlacement(db: AppDb, r: PlacementOutcome, now: Date): Promise<number> {
  const [words, cards, byKind] = await Promise.all([allWords(db), allCards(db), practisedByKind(db)]);
  // what he learned in the app before this placement keeps counting toward his worlds (journey.ts)
  const before = await getSettings(db);
  const oldBase = !before.placementResult ? 0 : before.placementResult.worldBase ?? unpractisedKnown(cards, byKind);
  const learnedBefore = Math.max(0, countKnownReading(cards) - oldBase);
  const practised = (c: Pick<CardRecord, 'kind' | 'wordId'>) => !!byKind.get(c.kind)?.has(c.wordId); // a meaning answer doesn't keep a guessed reading
  const all = [...words, ...ladderWords()]; // a 词语 he heard right has no stored record
  const byId = new Map(all.map((w) => [w.id, w]));
  const heard = new Set((r.heardIds ?? []).filter((id) => { const w = byId.get(id); return !!w && canAskRung(w, 'hear'); }));
  const hasCue = (id: string) => { const w = byId.get(id); return !!w && meaningCue(w) !== null; };
  // never practised as reading: a character a recheck sent back to learn is his to learn, not placed again
  const hasRead = new Set(cards.filter((c) => c.kind === 'recognise').map((c) => c.wordId));
  const sentBack = (id: string) => practised({ kind: 'recognise', wordId: id }) && !hasRead.has(id);
  const found = new Set(r.readingIds.filter((id) => byId.has(id) && !sentBack(id)));
  const read = new Set([...found].filter((id) => !practised({ kind: 'recognise', wordId: id }))); // placed: what he hasn't practised
  const meaningNow = new Set([...found].filter(hasCue));
  const supported = (c: CardRecord) =>
    c.kind === 'recognise' ? read.has(c.wordId)
    : c.kind === 'hear' ? found.has(c.wordId) || heard.has(c.wordId) // a listening check goes with its reading, or is placed
    : c.kind === 'meaning' ? meaningNow.has(c.wordId) : true;
  // unpractised reading and meaning cards are re-seeded from this result; so are unpractised hear cards of words heard right
  const replaced = (c: CardRecord) => c.kind !== 'write' && !practised(c) && (!supported(c) || c.kind === 'recognise' || c.kind === 'meaning' || (c.kind === 'hear' && heard.has(c.wordId)));
  await deleteCards(db, cards.filter(replaced).map((c) => c.id));
  const kept = new Set(cards.filter((c) => !replaced(c)).map((c) => c.id));
  const passed = (c: CardRecord): CardRecord => ({ ...c, passed: now.getTime() });
  const seeds = [
    ...seedPlacementCards(words, [...read], now, 'recognise').map((c): CardRecord => ({ ...passed(c), placed: true })),
    // a placement guess its first recheck confirms (spec 2026-10-06 §3.5); its next rung opens only then (final review I1)
    ...seedPlacementCards(all, [...heard], now, 'hear').map((c): CardRecord => ({ ...passed(c), guess: true })),
    // spread out, easiest first, a day's worth at a time: hundreds due at once would push his class words out for weeks
    ...[...meaningNow]
      .sort((a, b) => (byId.get(a)?.rank ?? Infinity) - (byId.get(b)?.rank ?? Infinity))
      .map((wordId, i): CardRecord => {
        const due = new Date(now.getTime() + Math.floor(i / NEW_MEANING_PER_DAY) * 86_400_000);
        return { id: `${wordId}:meaning`, wordId, kind: 'meaning', fsrs: { ...newCard(now), due } };
      }),
  ].filter((c) => !kept.has(c.id));
  await putCards(db, seeds);
  await queueHearChecks(db, now); // every word he reads gets a listening check, a few a day
  const worldBase = startingPoint(countKnownReading(await allCards(db)), learnedBefore);
  const asked = new Set(r.askedIds);
  const assumed = [...read].filter((id) => !asked.has(id)).length;
  await updateSettings(db, { placementDone: true, placementMarked: true, placementResult: { at: now.getTime(), readsUpTo: r.readsUpTo, tested: asked.size, assumed, missed: r.missed, worldBase } });
  return seeds.filter((c) => c.kind === 'recognise').length;
}
