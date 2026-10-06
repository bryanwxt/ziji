import { describe, expect, it } from 'vitest';
import { markPayoff, markSetup, storyStep } from './progress';

describe('story progress (spec 3c §3)', () => {
  it('the first chapter is due on the first day', () => {
    expect(storyStep(undefined, 3, '2026-10-07')).toEqual({ part: 'setup', chapter: 1 });
  });
  it('after the setup, the payoff is owed; after the payoff, nothing more today', () => {
    const s = markSetup(undefined, 1, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-07')).toEqual({ part: 'payoff', chapter: 1 });
    const p = markPayoff(s, 1);
    expect(p.chapter).toBe(1);
    expect(storyStep(p, 3, '2026-10-07')).toBeNull(); // one new chapter a day
    expect(storyStep(p, 3, '2026-10-08')).toEqual({ part: 'setup', chapter: 2 });
  });
  it('an owed payoff comes before a new chapter, even the next day', () => {
    const s = markSetup({ chapter: 1 }, 2, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-08')).toEqual({ part: 'payoff', chapter: 2 });
  });
  it('no chapters left: no story', () => {
    expect(storyStep({ chapter: 3 }, 3, '2026-10-09')).toBeNull();
  });
});
