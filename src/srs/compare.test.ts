// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { default_w } from 'ts-fsrs';
import { compareIntervals, formatDays } from './compare';

describe('compareIntervals (spec §6.2 before/after)', () => {
  it('the same parameters give the same intervals', () => {
    const rows = compareIntervals([...default_w]);
    expect(rows.map((r) => r.label)).toEqual(['Right once', 'Right 2 times', 'Right 3 times', 'A miss, then right']);
    for (const r of rows) expect(r.after).toBe(r.before);
    expect(rows.map((r) => r.before)).toEqual([7, 32, 118, 6]); // ts-fsrs 5.4.2 defaults
  });
  it('a memory that lasts longer gives longer intervals', () => {
    const fitted = default_w.map((x, i) => (i === 2 ? x * 4 : x)); // w2: the starting stability after Good
    const rows = compareIntervals(fitted);
    expect(rows[2]!.after).toBeGreaterThan(rows[2]!.before);
  });
  it('formatDays', () => {
    expect(formatDays(0.4)).toBe('same day');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(12)).toBe('12 days');
  });
});
