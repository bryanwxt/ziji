// The library over a month (final review, 2026-10-15; spec 2026-10-24 §6): a 二下 child, two lessons a day for 30 days, reading
// what the picker gives him, one read in five not judged well. He must keep meeting new passages, come back only to what he
// struggled with (3 days later), and never see a passage he read well again within its 21 days.
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { allowedChars } from '../content/understand';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, daysBetween, entryOf, GAP_DAYS, isRetired, WELL_LADDER } from './history';
import { inBand, pickPassage } from './pick';
import { readingPool } from './pool';

function simulate(readable: ReadonlySet<string>, classTerm: string, days = 30, perDay = 2) {
  const pool = readingPool([], PASSAGES, { readable, classTerm });
  let r: ReadingHistory = EMPTY_READING;
  const log: { day: string; id: string; kind: 'new' | 'revisit'; after: 'well' | 'not-well' | undefined; since: number | null }[] = [];
  let skipped = 0;
  for (let d = 0; d < days; d++) {
    const day = localDateKey(addDays(parseDateKey('2026-11-02'), d));
    for (let k = 0; k < perDay; k++) {
      const p = pickPassage(r, pool, day);
      if (!p) { skipped++; continue; }
      const e = entryOf(r, p.id);
      if (e.lastRead) expect(daysBetween(e.lastRead, day)).toBeGreaterThanOrEqual(GAP_DAYS);
      log.push({ day, id: p.id, kind: e.reads ? 'revisit' : 'new', after: e.lastHow, since: e.lastRead ? daysBetween(e.lastRead, day) : null });
      r = afterRead(r, p.id, day, (d + k) % 5 === 4 ? 'not-well' : 'well');
    }
  }
  return { pool, r, log, skipped };
}

describe('a month of 朗读 (spec 2026-10-24 §6: fewer repeats)', () => {
  const sim = simulate(allowedChars('二下'), '二下');
  it('no lesson goes without a passage, and most of the 60 are new', () => {
    expect(sim.skipped).toBe(0);
    expect(sim.log).toHaveLength(60);
    expect(new Set(sim.log.map((x) => x.id)).size).toBeGreaterThanOrEqual(45);
  });
  it("new passages come from the stretch band first: his first 20 are 85–92% readable, but a started story's next part", () => {
    const byId = new Map(sim.pool.map((p) => [p.id, p]));
    const fresh = sim.log.filter((x) => x.kind === 'new').slice(0, 20).map((x) => byId.get(x.id)!);
    expect(fresh).toHaveLength(20);
    expect(fresh.filter((p) => !inBand(p.fit) && !(p.story && p.story.part > 1)).map((p) => p.id)).toEqual([]);
  });
  it("he comes back only to what he read 'not-well', 3 days on, while new passages remain", () => {
    const revisits = sim.log.filter((x) => x.kind === 'revisit');
    expect(revisits.length).toBeGreaterThan(0);
    expect(revisits.filter((x) => x.after !== 'not-well')).toEqual([]);
  });
  it('new and a struggled revisit take turns: never two revisits in a row', () => {
    expect(sim.log.map((x) => x.kind[0]).join('')).not.toMatch(/rr/);
  });
  it('a passage read well rests 21 days at least; nothing retires in a month', () => {
    expect(sim.log.filter((x) => x.after === 'well' && x.since !== null && x.since < WELL_LADDER[0])).toEqual([]);
    expect(Object.values(sim.r.history).filter(isRetired)).toHaveLength(0);
  });
});
