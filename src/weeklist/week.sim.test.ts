// @vitest-environment node
// The spec §5.4 week: 32 items (14 new, 14 known, 4 placed) arrive Monday, ready by Wednesday, homework Friday. Pace 5, ceiling 8.
// His class (by the calendar) is on 二下·17 Mon–Tue and 二下·18 from Wednesday; 8 of 二下·17's characters are unstarted, so
// schoolNeed is 8 all week. Revision is due every day and taken every day.
import { describe, expect, it } from 'vitest';
import { LESSONS, taughtAt } from '../content/curriculum';
import { buildSessionPlan } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type WeekList, type Word } from '../types';
import { daysBetween, defaultDates } from './dates';
import { pinDue, quickCheckDates } from './schedule';

const day = (d: number, h = 9) => new Date(2026, 9, 19 + d, h);

type Row = { list: number; school: number; catchup: number; reviews: number; listReviews: number; checked: number; classShort?: number };

/**
 * Runs from the day the list arrives (0 = Monday) to Sunday, with the dates the parent screen proposes (defaultDates).
 * `takeCheck`: he does 考考自己 on the ready-by day, all right (it grades each list card due that day).
 */
function week(takeCheck: boolean, arrive = 0, shape = { fresh: 14, known: 14, placed: 4 }, o: { readyBy?: string; homeworkDue?: string; skip?: number[] } = {}): Row[] {
  const dates = defaultDates(day(arrive));
  const readyBy = o.readyBy ?? dates.readyBy;
  const homeworkDue = o.homeworkDue ?? dates.homeworkDue;
  const checkDay = daysBetween('2026-10-19', readyBy);
  const size = shape.fresh + shape.known + shape.placed;
  const items = Array.from({ length: size }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const }));
  const list: WeekList = { id: 'wl:1', name: 'L', createdAt: day(arrive, 0).getTime(), readyBy, homeworkDue, items, pairs: [], fits: [] };
  const charsOf = (lesson: number) => Array.from(LESSONS[lesson]!.read).filter((c) => taughtAt(c) === lesson);
  const ch = (t: string): Word => makeWord(t, { id: `b:${t}`, rank: taughtAt(t)! * 100 + 1 });
  // his class's window: 二下·16 (34), ·17 (35), ·18 (36) — all begun but 8 of ·17
  const unstarted = charsOf(35).slice(0, 8);
  const begun = [...charsOf(34), ...charsOf(35).slice(8), ...charsOf(36)];
  const catchup = [...charsOf(2), ...charsOf(3), ...charsOf(4), ...charsOf(5)]; // gaps from 一上
  const ws = [
    ...items.map((it) => makeWord(it.text, { id: it.wordId, source: 'parent', rank: null, level: null, writeable: false })),
    ...[...unstarted, ...begun, ...catchup].map(ch),
    ...Array.from({ length: 16 }, (_, i) => makeWord(`复${i}`, { rank: 9000 + i })),
  ];
  const far = new Date(2026, 11, 30);
  const known = Array.from({ length: shape.known }, (_, i) => makeCard(`p:${shape.fresh + i}`, 'recognise', far, true));
  const placed = Array.from({ length: shape.placed }, (_, i) => ({ ...makeCard(`p:${shape.fresh + shape.known + i}`, 'recognise', day(0, 6), true), placed: true as const }));
  const revision = Array.from({ length: 16 }, (_, i) => makeCard(`b:复${i}`, 'recognise', day(0, 6), true));
  let cards: CardRecord[] = [...known, ...placed, ...revision, ...begun.map((c) => makeCard(`b:${c}`, 'recognise', far, true))];

  const rows: Row[] = [];
  for (let d = arrive; d < 7; d++) {
    if (o.skip?.includes(d)) { rows.push({ list: 0, school: 0, catchup: 0, reviews: 0, listReviews: 0, checked: 0 }); continue; } // no lesson
    const now = day(d);
    const endOfDay = new Date(2026, 9, 19 + d, 23, 59).getTime();
    // the day's quick checks (applyQuickChecks, run before each plan): known list words brought forward, never later
    const moves = quickCheckDates(list, new Map(cards.map((c) => [c.id, c])), now);
    cards = cards.map((c) => { const to = c.kind === 'recognise' ? moves.get(c.wordId) : undefined; return to && c.fsrs.due > to ? { ...c, fsrs: { ...c.fsrs, due: to } } : c; });
    const plan: SessionPlan = buildSessionPlan({ cards, words: ws, settings: DEFAULT_SETTINGS, now, newPerDay: 5, lists: [list] });
    const lanes = Object.values(plan.newWordLanes ?? {});
    const checked = takeCheck && d === checkDay ? cards.filter((c) => c.wordId.startsWith('p:') && c.fsrs.due.getTime() <= endOfDay).map((c) => c.wordId) : [];
    rows.push({
      list: plan.listNewIds?.length ?? 0,
      school: lanes.filter((l) => l === 'school').length,
      catchup: lanes.filter((l) => l === 'catchup').length,
      reviews: plan.reviewWordIds.length,
      listReviews: plan.reviewWordIds.filter((id) => id.startsWith('p:')).length,
      checked: checked.length,
      classShort: plan.classShort,
    });
    const due = cards.filter((c) => c.fsrs.due.getTime() <= endOfDay && !c.wordId.startsWith('p:'));
    for (const c of due) expect(plan.reviewWordIds).toContain(c.wordId); // revision is never squeezed out
    // a day's reviews come back in six days (a list card pinned to the ready-by day, as reviewCard pins it); a new word tomorrow
    const answered = new Set([...plan.reviewWordIds, ...checked]);
    cards = [
      ...cards.map((c) => (answered.has(c.wordId) ? pinDue({ ...c, fsrs: { ...c.fsrs, due: day(d + 6, 6) } }, [list], now) : c)),
      ...plan.newWordIds.map((id) => makeCard(id, 'recognise', day(d + 1, 6))),
    ];
  }
  if (process.env.WEEK_SIM) process.stderr.write(`\n${arrive} ${JSON.stringify(shape)} ${JSON.stringify(rows)}\n`);
  return rows;
}

describe('an example week (spec §5.4, parent rulings 2026-10-18: front-loaded, deadline-safe)', () => {
  it('list words 12 Monday, 2 Tuesday, none from Wednesday; the class lane met by Friday; due revision planned every day', () => {
    const rows = week(true);
    expect(rows.map((r) => r.list)).toEqual([12, 2, 0, 0, 0, 0, 0]);
    expect(rows.map((r) => r.school)).toEqual([2, 3, 3, 0, 0, 0, 0]); // his class share from Monday (parent ruling 2026-10-23); schoolNeed 8, met by Wednesday
    expect(rows.map((r) => r.catchup)).toEqual([0, 2, 2, 5, 5, 5, 5]); // catch-up yields until his class is met
    // Mon: 7 of the 14 known as quick checks + the 4 placed rechecks; Tue: the other 7 + Monday's 12 new words; Wed: none in
    // 练一练 — the check grades all 32, each pinned to Wednesday
    expect(rows.map((r) => r.listReviews)).toEqual([11, 19, 0, 0, 0, 0, 0]);
    expect(rows[2]!.checked).toBe(32);
    expect(rows[0]!.classShort).toBe(0); // the parent's line: class on track
  });
  const wed = { readyBy: '2026-10-21', homeworkDue: '2026-10-23' };
  it('24 new words saved Saturday, Sunday or Monday, ready by Wednesday: 12 and 12 from the first lesson', () => {
    const sat = week(true, -2, { fresh: 24, known: 3, placed: 0 }, wed);
    expect(sat.map((r) => r.list)).toEqual([12, 12, 0, 0, 0, 0, 0, 0, 0]);
    expect(sat[4]!.checked).toBe(27); // Wednesday's check grades all 27: 24 taught, 3 known
    expect(sat.map((r) => r.school)).toEqual([2, 1, 3, 2, 0, 0, 0, 0, 0]); // his class share alongside the list, met by Tuesday
    expect(week(true, -1, { fresh: 24, known: 3, placed: 0 }, wed).map((r) => r.list)).toEqual([12, 12, 0, 0, 0, 0, 0, 0]);
    const mon = week(true, 0, { fresh: 24, known: 3, placed: 0 }, wed);
    expect(mon.map((r) => r.list)).toEqual([12, 12, 0, 0, 0, 0, 0]);
    expect(mon[2]!.checked).toBe(27);
    expect(mon.map((r) => r.school)).toEqual([2, 2, 3, 1, 0, 0, 0]); // his class share alongside the list, met by Thursday
  });
  it('a skipped day raises the days after it: 24 saved Sunday, no lesson Monday, 24 on Tuesday (above 12, up to 20) …', () => {
    const rows = week(true, -1, { fresh: 24, known: 3, placed: 0 }, { ...wed, skip: [0] });
    expect(rows.map((r) => r.list).slice(0, 3)).toEqual([12, 0, 12]);
    const big = week(true, -1, { fresh: 30, known: 0, placed: 0 }, { ...wed, skip: [0] });
    expect(big.map((r) => r.list).slice(0, 3)).toEqual([12, 0, 18]); // 18 left, one day: all of them
    expect(big[3]!.checked).toBe(30);
  });
  it('40 new words saved Tuesday, ready by Wednesday: 20 on Tuesday (the ceiling), the rest before homework day (parent report 2026-10-23)', () => {
    const rows = week(true, 1, { fresh: 40, known: 0, placed: 0 }, wed);
    expect(rows[0]!.list).toBe(20);
    expect(rows.slice(1).reduce((n, r) => n + r.list, 0)).toBe(20); // the check's day and after: all taught by homework day
    expect(rows[1]!.list).toBe(12); // front-loaded from the check's day
  });
  it('a 27-new-word Monday list: 14 and 13, deadline-safe above 12', () => {
    const rows = week(true, 0, { fresh: 27, known: 0, placed: 0 });
    expect(rows.map((r) => r.list).slice(0, 3)).toEqual([14, 13, 0]);
  });
  it('a Wednesday list (ready by Thursday): all 14 on Wednesday, the check Thursday, his class alongside it', () => {
    const rows = week(true, 2);
    expect(rows.map((r) => r.list)).toEqual([14, 0, 0, 0, 0]);
    expect(rows.map((r) => r.school)).toEqual([3, 3, 2, 0, 0]); // alongside the list, met by Friday
    expect(rows[1]!.checked).toBe(32); // Thursday's check: 14 taught, 14 known, 4 placed
  });
  it('a Thursday list (ready by Friday, homework day): all 14 on Thursday, the check Friday', () => {
    const rows = week(true, 3);
    expect(rows.map((r) => r.list)).toEqual([14, 0, 0, 0]);
    expect(rows.map((r) => r.school)).toEqual([4, 4, 0, 0]); // all 8 by Friday, alongside the list (parent ruling 2026-10-23)
    expect(rows[0]!.classShort).toBe(0);
  });
  it('he never opens the check: the list cards stay due and come first on Thursday (review focus 4)', () => {
    const rows = week(false);
    expect(rows[2]!.listReviews).toBe(0);
    expect(rows[3]!.listReviews).toBe(32);
  });
});
