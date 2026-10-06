import { meaningCue } from '../activities/flashcards/meaning';
import { NEW_MEANING_PER_DAY } from '../session/plan';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, allWords, deleteCards, getSettings, practisedByKind, putCards, updateSettings } from '../store/repo';
import { countKnownReading, startingPoint, unpractisedKnown } from './journey';
import type { CardRecord, Word } from '../types';
import { seedPlacementCards } from './placement';
import { queueHearChecks } from '../ladder/migrate';
import { placementLevels, styleGroup, type StyleGroup, type WalkAnswer } from './walk';
import { ladderWords } from '../content/ladder';
import { canAskRung } from '../ladder/rungs';

/**
 * What a placement check found (spec §19 part 6; 2026-10-06 §3.5): the words he reads, the words he understands too, the words he hears,
 * the ones he missed, and the levels (band indexes, -1 = none). No heardIds/listening: nothing placed as heard.
 */
export interface PlacementOutcome { readingIds: string[]; understandingIds: string[]; heardIds?: string[]; missed: string[]; reading: number; understanding: number; listening?: number }

/** Everything up to each level, plus the words answered right above it (understood only if also read; heard on its own). */
export function placementIds(bands: Word[][], answers: WalkAnswer[]): { readingIds: string[]; understandingIds: string[]; heardIds: string[]; missed: string[] } {
  const { reading, understanding, listening } = placementLevels(answers);
  const upTo = (n: number) => bands.slice(0, n + 1).flat().map((w) => w.id);
  const rightAbove = (n: number, g: StyleGroup) => answers.filter((a) => a.correct && a.band > n && styleGroup(a.style) === g).map((a) => a.wordId);
  const readingIds = [...new Set([...upTo(reading), ...rightAbove(reading, 'read')])];
  const read = new Set(readingIds);
  const understandingIds = [...new Set([...upTo(understanding), ...rightAbove(understanding, 'fit')])].filter((id) => read.has(id));
  const heardIds = [...new Set([...upTo(listening), ...rightAbove(listening, 'hear')])]; // only hearable ones are placed (applyPlacement)
  const missed = [...new Set(answers.filter((a) => !a.correct).map((a) => a.wordId))];
  return { readingIds, understandingIds, heardIds, missed };
}

/**
 * Saves a placement result. Words he reads get a known reading card; words he also understands get a known meaning card,
 * and words he only reads get a meaning card due now (spec §19 part 6) — only words with a meaning cue get meaning cards.
 * A re-run replaces the earlier placement: reading and meaning cards it no longer supports are cleared unless he has practised
 * the word since. Returns the number of new reading cards.
 */
export async function applyPlacement(db: AppDb, r: PlacementOutcome, now: Date): Promise<number> {
  const [words, cards, byKind] = await Promise.all([allWords(db), allCards(db), practisedByKind(db)]);
  // what he learned in the app before this placement keeps counting toward his worlds (journey.ts)
  const before = await getSettings(db);
  const oldBase = !before.placementResult ? 0 : before.placementResult.worldBase ?? unpractisedKnown(cards, byKind);
  const learnedBefore = Math.max(0, countKnownReading(cards) - oldBase);
  const practised = (c: CardRecord) => !!byKind.get(c.kind)?.has(c.wordId); // practice of that kind: a meaning answer doesn't keep a guessed reading
  const all = [...words, ...ladderWords()]; // a 词语 he heard right has no stored record
  const byId = new Map(all.map((w) => [w.id, w]));
  const heard = new Set((r.heardIds ?? []).filter((id) => { const w = byId.get(id); return !!w && canAskRung(w, 'hear'); }));
  const hasCue = (id: string) => { const w = byId.get(id); return !!w && meaningCue(w) !== null; };
  const read = new Set(r.readingIds);
  const understood = new Set(r.understandingIds.filter((id) => read.has(id) && hasCue(id)));
  const meaningNow = new Set(r.readingIds.filter((id) => !understood.has(id) && hasCue(id)));
  const supported = (c: CardRecord) =>
    c.kind === 'recognise' ? read.has(c.wordId)
    : c.kind === 'hear' ? read.has(c.wordId) || heard.has(c.wordId) // a listening check goes with its reading, or is placed (§3.5)
    : c.kind === 'meaning' ? understood.has(c.wordId) || meaningNow.has(c.wordId) : true; // a listening check goes with its reading
  // unpractised meaning cards are always re-seeded from this result (understood → known, read-only → a check due soon);
  // so are unpractised hear cards of words placed as heard (a queued check becomes a placement guess)
  const replaced = (c: CardRecord) => c.kind !== 'write' && !practised(c) && (!supported(c) || c.kind === 'meaning' || (c.kind === 'hear' && heard.has(c.wordId)));
  await deleteCards(db, cards.filter(replaced).map((c) => c.id));
  const kept = new Set(cards.filter((c) => !replaced(c)).map((c) => c.id));
  // what placement finds he reads (or understands) counts as passed, as migration counts what he had earned (spec 2026-10-06 §3.6)
  const passed = (c: CardRecord): CardRecord => ({ ...c, passed: now.getTime() });
  const seeds = [
    ...seedPlacementCards(words, r.readingIds, now, 'recognise').map(passed),
    ...seedPlacementCards(words, [...understood], now, 'meaning').map(passed),
    ...seedPlacementCards(all, [...heard], now, 'hear').map(passed), // a placement guess its first recheck confirms (§3.5)
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
  await updateSettings(db, { placementDone: true, placementResult: { at: now.getTime(), reading: r.reading, understanding: r.understanding, listening: r.listening ?? -1, missed: r.missed, worldBase } });
  return seeds.filter((c) => c.kind === 'recognise').length;
}
