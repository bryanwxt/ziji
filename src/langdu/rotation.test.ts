// The library over a month (final review, 2026-10-15): a 二下 child, two lessons a day for 30 days, reading what the picker
// gives him. He must keep meeting new passages (not cycle a dozen early-read ones), revisits must keep their turn, and the rest
// ladder must hold (no passage back within its rest unless nothing else is there, none retired in a month).
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { allowedChars } from '../content/understand';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, daysBetween, entryOf, GAP_DAYS, isRetired } from './history';
import { pickPassage } from './pick';
import { readingPool } from './pool';

function simulate(readable: ReadonlySet<string>, classTerm: string, days = 30, perDay = 2) {
  const pool = readingPool([], PASSAGES, { readable, classTerm });
  let r: ReadingHistory = EMPTY_READING;
  const log: { day: string; id: string; kind: 'new' | 'revisit'; early: boolean }[] = [];
  let skipped = 0;
  for (let d = 0; d < days; d++) {
    const day = localDateKey(addDays(parseDateKey('2026-11-02'), d));
    for (let k = 0; k < perDay; k++) {
      const p = pickPassage(r, pool, day);
      if (!p) { skipped++; continue; }
      const e = entryOf(r, p.id);
      if (e.lastRead) expect(daysBetween(e.lastRead, day)).toBeGreaterThanOrEqual(GAP_DAYS);
      log.push({ day, id: p.id, kind: e.reads ? 'revisit' : 'new', early: !!e.lastRead && daysBetween(e.lastRead, day) < e.rest });
      r = afterRead(r, p.id, day, (d + k) % 5 === 4 ? 'not-well' : 'well'); // one read in five misses its question
    }
  }
  return { pool, r, log, skipped };
}

describe('a month of 朗读 (final review: the picker recycled a dozen passages)', () => {
  const sim = simulate(allowedChars('二下'), '二下');
  // New and revisit take turns once revisits fall due (spec §4), so about half the lessons are new: 30 is the floor that rule
  // allows (measured: 33 different passages, 27 due revisits; before the fix, 10 different passages)
  it('meets at least 30 different passages in 60 lessons (half of them new), with no lesson left without one', () => {
    expect(sim.skipped).toBe(0);
    expect(sim.log).toHaveLength(60);
    expect(new Set(sim.log.map((x) => x.id)).size).toBeGreaterThanOrEqual(30);
    expect(sim.log.filter((x) => x.kind === 'new').length).toBeGreaterThanOrEqual(30);
  });
  it('once revisits fall due, new and revisit alternate: never two revisits in a row while unread passages remain', () => {
    const kinds = sim.log.map((x) => x.kind[0]).join('');
    expect(kinds).not.toMatch(/rr/);
  });
  it('revisits keep their turn: due ones come back, never two months of only new passages', () => {
    expect(sim.log.filter((x) => x.kind === 'revisit').length).toBeGreaterThanOrEqual(10);
    expect(sim.log.filter((x) => x.kind === 'revisit' && x.early)).toHaveLength(0); // nothing back before its rest while others wait
  });
  it('nothing retires in a month (3 + 7 + 18 + 45 days of rest come first)', () => {
    expect(Object.values(sim.r.history).filter(isRetired)).toHaveLength(0);
    expect(Math.max(...Object.values(sim.r.history).map((e) => e.rest))).toBeLessThanOrEqual(18);
  });
});
