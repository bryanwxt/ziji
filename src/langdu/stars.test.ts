import { describe, expect, it } from 'vitest';
import { betterTake, earnsBonus } from './stars';
describe('bonus star', () => {
  it('for reading louder on average, or 10% quicker, than last time', () => {
    expect(earnsBonus(undefined, { level: 0.2, durationSec: 20 })).toBe(false);
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.12, durationSec: 22 })).toBe(true);
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.09, durationSec: 18 })).toBe(true);
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.1, durationSec: 19 })).toBe(false);
    expect(earnsBonus({ level: undefined, durationSec: 20 }, { level: 0.1, durationSec: 20 })).toBe(false); // old recording without a level
  });
  it('stopping straight away is not "quicker": a read must take at least half as long as last time', () => {
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.05, durationSec: 1 })).toBe(false);
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.2, durationSec: 2 })).toBe(false); // louder, but not a real read
    expect(earnsBonus({ level: 0.1, durationSec: 20 }, { level: 0.05, durationSec: 15 })).toBe(true);
  });
});

describe('betterTake (spec 2026-10-12 §3: one re-read, the better kept)', () => {
  const t = (level: number, durationSec: number) => ({ level, durationSec });
  it('the re-read when it is louder, or quicker and still a real read; else the first', () => {
    expect(betterTake([t(0.05, 20), t(0.1, 19)])).toEqual(t(0.1, 19));
    expect(betterTake([t(0.1, 20), t(0.08, 17)])).toEqual(t(0.08, 17));
    expect(betterTake([t(0.1, 20), t(0.09, 19)])).toEqual(t(0.1, 20));
    expect(betterTake([t(0.1, 20), t(0.3, 3)])).toEqual(t(0.1, 20)); // stopped straight away
  });
  it('one take is kept; none is null', () => {
    expect(betterTake([t(0.1, 20)])).toEqual(t(0.1, 20));
    expect(betterTake([])).toBeNull();
  });
});
