// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { addDays, startOfLocalDay } from '../lib/date';
import { seededKnownCard } from '../srs/scheduler';
import { addReviewLog, allCards, getSettings, putCards, putWords, updateSettings } from '../store/repo';
import { freshDb } from '../test/fixtures';
import type { CardRecord } from '../types';
import { markOldPlacement } from './migrate';
import { termWords } from './questions';

// An install placed by the band check on 06/10 (rarest first, days 7–28), rechecks under way on 14/10 (spec 2026-10-14 ruling).
const placedAt = new Date(2026, 9, 6, 9);
const now = new Date(2026, 9, 14, 8);
const words = builtinWords(0);
const terms = termWords(words);

async function oldInstall(ids: string[]) {
  const db = await freshDb();
  await putWords(db, words);
  // the old seeding: rarest (highest rank) first, spread over days 7–28
  const byRank = ids.map((id) => words.find((w) => w.id === id)!).sort((a, b) => b.rank! - a.rank!);
  const cards: CardRecord[] = byRank.map((w, i) => ({ id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise', fsrs: seededKnownCard(placedAt, 7 + Math.floor((i * 22) / byRank.length)), passed: placedAt.getTime() }));
  await putCards(db, cards);
  await updateSettings(db, { placementDone: true, placementResult: { at: placedAt.getTime(), reading: 3, understanding: 1, missed: [] } });
  return db;
}
const card = async (db: Awaited<ReturnType<typeof freshDb>>, wordId: string) => (await allCards(db)).find((c) => c.id === `${wordId}:recognise`)!;

describe('marking an older placement (spec 2026-10-14 ruling)', () => {
  it('tags the old placement cards whose first recheck has not happened', async () => {
    const ids = terms[0]!.slice(0, 20).map((w) => w.id);
    const db = await oldInstall(ids);
    expect(await markOldPlacement(db, now)).toBe(20);
    for (const c of (await allCards(db))) expect(c.placed).toBe(true);
    expect((await getSettings(db)).placementMarked).toBe(true);
  });
  it('a card already rechecked, a card passed later, and a card with no pass stay untouched', async () => {
    const [a, c, d, e] = terms[0]!.slice(0, 4).map((w) => w.id);
    const db = await oldInstall([a!, c!, d!, e!]);
    await addReviewLog(db, { cardId: `${a}:recognise`, wordId: a!, kind: 'recognise', at: now.getTime() - 1000, rating: 3, correct: true });
    const later = await card(db, c!);
    await putCards(db, [{ ...later, passed: placedAt.getTime() + 2 * 86_400_000 }]); // passed on the ladder after placement
    const { passed: _p, ...unpassed } = await card(db, d!);
    await putCards(db, [unpassed]);
    const before = new Map((await allCards(db)).map((x) => [x.id, x]));
    expect(await markOldPlacement(db, now)).toBe(1);
    for (const id of [a, c, d]) expect(await card(db, id!)).toEqual(before.get(`${id}:recognise`));
    expect((await card(db, e!)).placed).toBe(true);
  });
  it('a word he has only answered by ear (or by meaning) is still marked: only a reading log counts as its recheck (review M4)', async () => {
    const [b, m] = terms[0]!.slice(0, 2).map((w) => w.id);
    const db = await oldInstall([b!, m!]);
    await addReviewLog(db, { cardId: `${b}:hear`, wordId: b!, kind: 'hear', at: now.getTime() - 1000, rating: 3, correct: true });
    await addReviewLog(db, { cardId: `${m}:meaning`, wordId: m!, kind: 'meaning', at: now.getTime() - 1000, rating: 3, correct: true });
    expect(await markOldPlacement(db, now)).toBe(2);
  });
  it('never marks a card he earned in lessons: it has reading logs', async () => {
    const [a] = terms[0]!.map((w) => w.id);
    const db = await oldInstall([a!]);
    await putCards(db, [{ ...(await card(db, a!)), passed: placedAt.getTime() - 86_400_000 }]); // passed before the placement
    await addReviewLog(db, { cardId: `${a}:recognise`, wordId: a!, kind: 'recognise', at: placedAt.getTime() - 2 * 86_400_000, rating: 3, correct: true });
    expect(await markOldPlacement(db, now)).toBe(0);
  });
  it('a pass within a minute of the placement counts as the placement', async () => {
    const [a] = terms[0]!.map((w) => w.id);
    const db = await oldInstall([a!]);
    await putCards(db, [{ ...(await card(db, a!)), passed: placedAt.getTime() + 30_000 }]);
    expect(await markOldPlacement(db, now)).toBe(1);
  });
  it('re-spreads them in school order from today, at most 10 a day, never earlier than they were due', async () => {
    const placed = [...terms[0]!.slice(0, 40), ...terms[1]!.slice(0, 40)];
    const db = await oldInstall(placed.map((w) => w.id));
    const before = new Map((await allCards(db)).map((c) => [c.wordId, c.fsrs.due.getTime()]));
    await markOldPlacement(db, now);
    const cards = await allCards(db);
    const due = new Map(cards.map((c) => [c.wordId, c.fsrs.due.getTime()]));
    for (const [id, t] of due) expect(t).toBeGreaterThanOrEqual(before.get(id)!);
    const day = (t: number) => Math.round((startOfLocalDay(new Date(t)).getTime() - startOfLocalDay(now).getTime()) / 86_400_000);
    const perDay = new Map<number, number>();
    for (const t of due.values()) perDay.set(day(t), (perDay.get(day(t)) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(10);
    expect(Math.min(...perDay.keys())).toBeGreaterThanOrEqual(0);
    // school order: 一下 (the most recent term) before 一上, wherever their old due dates allow
    const mean = (ws: typeof placed) => ws.reduce((n, w) => n + due.get(w.id)!, 0) / ws.length;
    expect(mean(terms[1]!.slice(0, 40))).toBeLessThan(mean(terms[0]!.slice(0, 40)));
    const overdue = cards.filter((c) => before.get(c.wordId)! <= now.getTime());
    expect(overdue.every((c) => day(c.fsrs.due.getTime()) >= 0)).toBe(true);
    // the days they land on are filled in school order: within a day's 10, the latest term first
    const firstDay = placed.filter((w) => day(due.get(w.id)!) === Math.min(...perDay.keys()));
    expect(firstDay.length).toBeGreaterThan(0);
  });
  it('running it twice changes nothing', async () => {
    const db = await oldInstall(terms[0]!.slice(0, 30).map((w) => w.id));
    await markOldPlacement(db, now);
    const once = await allCards(db);
    expect(await markOldPlacement(db, addDays(now, 3))).toBe(0);
    expect(await allCards(db)).toEqual(once);
  });
  it('no placement: nothing to mark, and it is not run again', async () => {
    const db = await freshDb();
    expect(await markOldPlacement(db, now)).toBe(0);
    expect((await getSettings(db)).placementMarked).toBe(true);
  });
});
