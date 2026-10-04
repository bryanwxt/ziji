import { meaningCue } from '../activities/flashcards/meaning';
import { NEW_MEANING_PER_DAY } from '../session/plan';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, allWords, deleteCards, practisedWords, putCards, updateSettings } from '../store/repo';
import type { CardRecord, Word } from '../types';
import { seedPlacementCards } from './placement';
import { placementLevels, type WalkAnswer } from './walk';

/** What a placement check found (spec §19 part 6): the words he reads, the words he understands too, the ones he missed, and both levels (band indexes, -1 = none). */
export interface PlacementOutcome { readingIds: string[]; understandingIds: string[]; missed: string[]; reading: number; understanding: number }

/** Everything up to each level, plus the words answered right above it (understood only if also read). */
export function placementIds(bands: Word[][], answers: WalkAnswer[]): { readingIds: string[]; understandingIds: string[]; missed: string[] } {
  const { reading, understanding } = placementLevels(answers);
  const upTo = (n: number) => bands.slice(0, n + 1).flat().map((w) => w.id);
  // a right answer above the level counts as known; a 真的假的 can be a lucky guess, so it doesn't
  const rightAbove = (n: number, fit: boolean) => answers.filter((a) => a.correct && a.band > n && a.style !== 'real' && (a.style === 'fit') === fit).map((a) => a.wordId);
  const readingIds = [...new Set([...upTo(reading), ...rightAbove(reading, false)])];
  const read = new Set(readingIds);
  const understandingIds = [...new Set([...upTo(understanding), ...rightAbove(understanding, true)])].filter((id) => read.has(id));
  const missed = [...new Set(answers.filter((a) => !a.correct).map((a) => a.wordId))];
  return { readingIds, understandingIds, missed };
}

/**
 * Saves a placement result. Words he reads get a known reading card; words he also understands get a known meaning card,
 * and words he only reads get a meaning card due now (spec §19 part 6) — only words with a meaning cue get meaning cards.
 * A re-run replaces the earlier placement: reading and meaning cards it no longer supports are cleared unless he has practised
 * the word since. Returns the number of new reading cards.
 */
export async function applyPlacement(db: AppDb, r: PlacementOutcome, now: Date): Promise<number> {
  const [words, cards, practised] = await Promise.all([allWords(db), allCards(db), practisedWords(db)]);
  const byId = new Map(words.map((w) => [w.id, w]));
  const hasCue = (id: string) => { const w = byId.get(id); return !!w && meaningCue(w) !== null; };
  const read = new Set(r.readingIds);
  const understood = new Set(r.understandingIds.filter((id) => read.has(id) && hasCue(id)));
  const meaningNow = new Set(r.readingIds.filter((id) => !understood.has(id) && hasCue(id)));
  const supported = (c: CardRecord) =>
    c.kind === 'recognise' ? read.has(c.wordId) : c.kind === 'meaning' ? understood.has(c.wordId) || meaningNow.has(c.wordId) : true;
  await deleteCards(db, cards.filter((c) => c.kind !== 'write' && !practised.has(c.wordId) && !supported(c)).map((c) => c.id));
  const kept = new Set(cards.filter((c) => c.kind === 'write' || practised.has(c.wordId) || supported(c)).map((c) => c.id));
  const seeds = [
    ...seedPlacementCards(words, r.readingIds, now, 'recognise'),
    ...seedPlacementCards(words, [...understood], now, 'meaning'),
    // spread out, easiest first, a day's worth at a time: hundreds due at once would push his class words out for weeks
    ...[...meaningNow]
      .sort((a, b) => (byId.get(a)?.rank ?? Infinity) - (byId.get(b)?.rank ?? Infinity))
      .map((wordId, i): CardRecord => {
        const due = new Date(now.getTime() + Math.floor(i / NEW_MEANING_PER_DAY) * 86_400_000);
        return { id: `${wordId}:meaning`, wordId, kind: 'meaning', fsrs: { ...newCard(now), due } };
      }),
  ].filter((c) => !kept.has(c.id));
  await putCards(db, seeds);
  await updateSettings(db, { placementDone: true, placementResult: { at: now.getTime(), reading: r.reading, understanding: r.understanding, missed: r.missed } });
  return seeds.filter((c) => c.kind === 'recognise').length;
}
