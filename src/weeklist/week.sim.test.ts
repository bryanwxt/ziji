// @vitest-environment node
// The spec §5.4 week: 32 items (14 new, 14 known, 4 placed) arrive Monday, ready by Wednesday, homework Friday. Pace 5, ceiling 8.
// His class (by the calendar) is on 二下·17 Mon–Tue and 二下·18 from Wednesday; 8 of 二下·17's characters are unstarted, so
// schoolNeed is 8 all week. Revision is due every day and taken every day.
import { describe, expect, it } from 'vitest';
import { LESSONS, taughtAt } from '../content/curriculum';
import { buildSessionPlan } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type WeekList, type Word } from '../types';

const day = (d: number, h = 9) => new Date(2026, 9, 19 + d, h);

describe('an example week (spec §5.4)', () => {
  it('list words Mon–Tue at 7, none from Wednesday; the class lane met by Friday; due revision planned every day', () => {
    const items = Array.from({ length: 32 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const }));
    const list: WeekList = { id: 'wl:1', name: 'L', createdAt: day(0, 0).getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23', items, pairs: [], fits: [] };
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

    const rows: { list: number; school: number; catchup: number; reviews: number; listReviews: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const now = day(d);
      const plan: SessionPlan = buildSessionPlan({ cards, words: ws, settings: DEFAULT_SETTINGS, now, newPerDay: 5, lists: [list] });
      const lanes = Object.values(plan.newWordLanes ?? {});
      rows.push({
        list: plan.listNewIds?.length ?? 0,
        school: lanes.filter((l) => l === 'school').length,
        catchup: lanes.filter((l) => l === 'catchup').length,
        reviews: plan.reviewWordIds.length,
        listReviews: plan.reviewWordIds.filter((id) => id.startsWith('p:')).length,
      });
      const endOfDay = new Date(2026, 9, 19 + d, 23, 59).getTime();
      const due = cards.filter((c) => c.fsrs.due.getTime() <= endOfDay && !c.wordId.startsWith('p:'));
      for (const c of due) expect(plan.reviewWordIds).toContain(c.wordId); // revision is never squeezed out
      // a day's reviews come back in six days; a new word comes back tomorrow
      cards = [
        ...cards.map((c) => (plan.reviewWordIds.includes(c.wordId) ? { ...c, fsrs: { ...c.fsrs, due: day(d + 6, 6) } } : c)),
        ...plan.newWordIds.map((id) => makeCard(id, 'recognise', day(d + 1, 6))),
      ];
    }
    if (process.env.WEEK_SIM) process.stderr.write(`\n${JSON.stringify(rows)}\n`);
    expect(rows.map((r) => r.list)).toEqual([7, 7, 0, 0, 0, 0, 0]);
    expect(rows.map((r) => r.school)).toEqual([0, 0, 3, 3, 2, 0, 0]);
    expect(rows.map((r) => r.catchup)).toEqual([0, 0, 2, 2, 3, 5, 5]);
    expect(rows[2]!.listReviews).toBe(0); // Wednesday: the list's due cards are the check's
    expect(rows[3]!.listReviews).toBeGreaterThan(0); // Thursday: back among the first due
  });
});
