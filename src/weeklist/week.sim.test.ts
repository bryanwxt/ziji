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
function week(takeCheck: boolean, arrive = 0): Row[] {
  const { readyBy, homeworkDue } = defaultDates(day(arrive));
  const checkDay = daysBetween('2026-10-19', readyBy);
  const items = Array.from({ length: 32 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const }));
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
  const known = Array.from({ length: 14 }, (_, i) => makeCard(`p:${14 + i}`, 'recognise', far, true));
  const placed = Array.from({ length: 4 }, (_, i) => ({ ...makeCard(`p:${28 + i}`, 'recognise', day(0, 6), true), placed: true as const }));
  const revision = Array.from({ length: 16 }, (_, i) => makeCard(`b:复${i}`, 'recognise', day(0, 6), true));
  let cards: CardRecord[] = [...known, ...placed, ...revision, ...begun.map((c) => makeCard(`b:${c}`, 'recognise', far, true))];

  const rows: Row[] = [];
  for (let d = arrive; d < 7; d++) {
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
  if (process.env.WEEK_SIM) process.stderr.write(`\n${JSON.stringify(rows)}\n`);
  return rows;
}

describe('an example week (spec §5.4)', () => {
  it('list words Mon–Tue at 7, none from Wednesday; the class lane met by Friday; due revision planned every day', () => {
    const rows = week(true);
    expect(rows.map((r) => r.list)).toEqual([7, 7, 0, 0, 0, 0, 0]);
    expect(rows.map((r) => r.school)).toEqual([0, 0, 3, 3, 2, 0, 0]); // schoolNeed 8, met by Friday
    expect(rows.map((r) => r.catchup)).toEqual([0, 0, 2, 2, 3, 5, 5]); // catch-up yields: 17 this week
    // Mon: 7 of the 14 known as quick checks + the 4 placed rechecks; Tue: the other 7 + Monday's 7 new words; Wed: none in
    // 练一练 — the check grades all 32, each pinned to Wednesday
    expect(rows.map((r) => r.listReviews)).toEqual([11, 14, 0, 0, 0, 0, 0]);
    expect(rows[2]!.checked).toBe(32);
    expect(rows[0]!.classShort).toBe(0); // the parent's line: class on track
  });
  it('a Wednesday list (ready by Thursday): 7 on Wednesday, the check Thursday, the rest after it, his class first on Friday', () => {
    const rows = week(true, 2);
    expect(rows.map((r) => r.list)).toEqual([7, 0, 1, 5, 1]);
    expect(rows.map((r) => r.school)).toEqual([0, 4, 4, 0, 0]);
    expect(rows.map((r) => r.catchup)).toEqual([0, 1, 0, 0, 4]);
    expect(rows[1]!.checked).toBe(25); // Thursday's check: 7 taught, 14 known, 4 placed; the 7 untaught come after it
  });
  it('a Thursday list (ready by Friday, homework day): 7 on Thursday, the check Friday, the rest after homework', () => {
    const rows = week(true, 3);
    expect(rows.map((r) => r.list)).toEqual([7, 0, 5, 2]);
    expect(rows.map((r) => r.school)).toEqual([1, 5, 0, 2]);
    expect(rows.map((r) => r.catchup)).toEqual([0, 0, 0, 1]);
    // one day before homework can't start all 8 class words at his pace: 6 by Friday (1 under the ceiling Thursday, 5 Friday),
    // the 2 left on Sunday — best effort, and the parent's line shows the shortfall (classShort)
    expect(rows[0]!.classShort).toBe(2);
  });
  it('he never opens the check: the list cards stay due and come first on Thursday (review focus 4)', () => {
    const rows = week(false);
    expect(rows[2]!.listReviews).toBe(0);
    expect(rows[3]!.listReviews).toBe(32);
  });
});
