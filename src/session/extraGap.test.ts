import { describe, expect, it } from 'vitest';
import { EXTRA_GAP_MS, extraOpensAt, extraWaitLine } from './extraGap';

const at = (h: number, m = 0) => new Date(2026, 9, 2, h, m);
const rec = (start: Date, activeMin = 15) => ({ startedAt: start.getTime(), activeMs: activeMin * 60_000 });

describe('the second lesson is spaced out (learning rules 2026-10-17; Cepeda et al. 2006)', () => {
  it('opens 2 hours after the last lesson ended: the day’s, or a later extra one (starredUpTo)', () => {
    expect(EXTRA_GAP_MS).toBe(2 * 3_600_000);
    expect(extraOpensAt(rec(at(8)), undefined)).toBe(at(10, 15).getTime());
    expect(extraOpensAt(rec(at(8)), at(14).getTime())).toBe(at(16).getTime()); // an extra lesson finished at 14:00
    expect(extraOpensAt(rec(at(8)), at(7).getTime())).toBe(at(10, 15).getTime()); // yesterday's stars: the day's lesson counts
  });
  it('says when, in words he knows: later this morning, this afternoon, this evening, or tomorrow', () => {
    expect(extraWaitLine(at(10).getTime(), at(9))).toBe('过一会再来！');
    expect(extraWaitLine(at(13).getTime(), at(9))).toBe('下午再来！');
    expect(extraWaitLine(at(19).getTime(), at(17))).toBe('晚上再来！');
    expect(extraWaitLine(new Date(2026, 9, 3, 0, 30).getTime(), at(22, 30))).toBe('明天见！');
  });
  it('once open: no line', () => {
    expect(extraWaitLine(at(10).getTime(), at(10))).toBeNull();
    expect(extraWaitLine(at(10).getTime(), at(12))).toBeNull();
  });
});
