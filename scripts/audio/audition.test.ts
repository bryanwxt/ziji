import { describe, expect, it } from 'vitest';
import { AUDITION, auditionJobs } from './audition';

describe('audition items', () => {
  it('twenty hard items, each with an id, a label for the parent and the reading it must have', () => {
    expect(AUDITION).toHaveLength(20);
    expect(new Set(AUDITION.map((a) => a.id)).size).toBe(20);
    for (const a of AUDITION) expect(a.label.length, a.id).toBeGreaterThan(3);
  });
  it('the engines get the 多音字 swaps (调 alone is said as 条)', () => {
    const tiao = auditionJobs().find((j) => j.text === '调')!;
    expect(tiao.engineText).toBe('条');
  });
});
