// Moving his progress onto the word ladder, once (spec 2026-10-06 §3.6): cards he has earned count as passed, and every word he
// reads gets a listening check, a few a day. Old cards are never rewritten: an older build still reads everything.
import { ladderWord } from '../content/ladder';
import { addDays, startOfLocalDay } from '../lib/date';
import { isEarned, newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, allWords, getSettings, putCards, updateSettings } from '../store/repo';
import type { CardRecord } from '../types';
import { canAskRung } from './rungs';

export const HEAR_CHECKS_PER_DAY = 15;

/** Listening checks for words he reads with no hear card yet: in his order, at most 15 a day, from tomorrow. */
export async function queueHearChecks(db: AppDb, now: Date): Promise<number> {
  const [cards, words] = await Promise.all([allCards(db), allWords(db)]);
  const rank = new Map(words.map((w) => [w.id, w.rank ?? 1e9]));
  const byId = new Map(words.map((w) => [w.id, w]));
  const hearable = (id: string) => { const w = byId.get(id) ?? ladderWord(id); return !!w && canAskRung(w, 'hear'); }; // final review I1
  const rankOf = (id: string) => rank.get(id) ?? ladderWord(id)?.rank ?? 1e9;
  const hasHear = new Set(cards.filter((c) => c.kind === 'hear').map((c) => c.wordId));
  const reads = cards
    .filter((c) => c.kind === 'recognise' && !hasHear.has(c.wordId) && hearable(c.wordId))
    .sort((a, b) => rankOf(a.wordId) - rankOf(b.wordId));
  const made: CardRecord[] = reads.map((c, i) => ({
    id: `${c.wordId}:hear`, wordId: c.wordId, kind: 'hear',
    fsrs: { ...newCard(now), due: addDays(startOfLocalDay(now), 1 + Math.floor(i / HEAR_CHECKS_PER_DAY)) },
  }));
  await putCards(db, made);
  return made.length;
}

export async function migrateToLadder(db: AppDb, now: Date): Promise<boolean> {
  if ((await getSettings(db)).ladderMigrated) return false;
  const cards = await allCards(db);
  const passed = cards
    .filter((c) => !c.passed && (c.kind === 'recognise' || c.kind === 'meaning' || c.kind === 'write') && isEarned(c.fsrs))
    .map((c) => ({ ...c, passed: now.getTime() }));
  await putCards(db, passed);
  await queueHearChecks(db, now);
  await updateSettings(db, { ladderMigrated: true });
  return true;
}
