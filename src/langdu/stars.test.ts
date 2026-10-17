import { describe, expect, it } from 'vitest';
import { betterTake, bonusOnRead, bonusOnReview, isCompleteRead, MAX_CHARS_PER_SEC } from './stars';

// 20 characters: a complete read takes at least 5 s; the recorder stops by itself at 60 s
const TEXT = '我爱爸爸。我爱妈妈。我爱老师。我爱同学们和小猫。';
const han = Array.from(TEXT).filter((c) => /\p{Script=Han}/u.test(c)).length;

describe('a complete read (learning rules 2026-10-17): not cut short', () => {
  it('long enough for every character, and stopped by him before the recorder’s limit', () => {
    expect(han).toBe(20);
    expect(isCompleteRead({ durationSec: han / MAX_CHARS_PER_SEC }, TEXT)).toBe(true);
    expect(isCompleteRead({ durationSec: 30 }, TEXT)).toBe(true);
    expect(isCompleteRead({ durationSec: 2 }, TEXT)).toBe(false); // stopped straight away
    expect(isCompleteRead({ durationSec: 60 }, TEXT)).toBe(false); // the limit stopped him: he ran out of time
  });
});

describe('the 朗读 bonus star rewards accuracy, never speed or loudness (Kuhn & Stahl 2003)', () => {
  const prev = (o: { review?: 'ok'; misread?: string[] } = {}) => ({ durationSec: 30, level: 0.1, ...o });
  it('never on a first read of a passage', () => {
    expect(bonusOnRead(undefined, { durationSec: 30 }, TEXT)).toEqual({ now: false });
  });
  it('no parent review of the last take: a complete re-read earns it now', () => {
    expect(bonusOnRead(prev(), { durationSec: 40 }, TEXT)).toEqual({ now: true });
    expect(bonusOnRead(prev(), { durationSec: 2 }, TEXT)).toEqual({ now: false });
  });
  it('never for being quicker or louder', () => {
    expect(bonusOnRead(prev({ review: 'ok', misread: ['爱'] }), { durationSec: 10 }, TEXT).now).toBe(false);
  });
  it('the parent reviewed the last take: decided when this one is reviewed, against its misreads', () => {
    expect(bonusOnRead(prev({ review: 'ok', misread: ['爱', '师'] }), { durationSec: 30 }, TEXT)).toEqual({ now: false, misreadsBefore: 2 });
    expect(bonusOnRead(prev({ review: 'ok' }), { durationSec: 30 }, TEXT)).toEqual({ now: false, misreadsBefore: 0 });
    expect(bonusOnRead(prev({ review: 'ok', misread: ['爱'] }), { durationSec: 2 }, TEXT)).toEqual({ now: false }); // cut short: no baseline
  });
  it('at review: fewer misreads than last time, or clean both times', () => {
    expect(bonusOnReview(2, 1)).toBe(true);
    expect(bonusOnReview(2, 2)).toBe(false);
    expect(bonusOnReview(1, 3)).toBe(false);
    expect(bonusOnReview(0, 0)).toBe(true);
    expect(bonusOnReview(undefined, 0)).toBe(false);
  });
});

describe('betterTake: the re-read when it is complete, else the first', () => {
  const t = (durationSec: number) => ({ level: 0.1, durationSec });
  it('keeps a complete re-read, however quick or quiet', () => {
    expect(betterTake([t(30), t(40)], TEXT)).toEqual(t(40));
    expect(betterTake([t(30), t(10)], TEXT)).toEqual(t(10));
  });
  it('a re-read cut short keeps the first', () => {
    expect(betterTake([t(30), t(2)], TEXT)).toEqual(t(30));
    expect(betterTake([t(30), t(60)], TEXT)).toEqual(t(30));
  });
  it('one take is kept; none is null', () => {
    expect(betterTake([t(30)], TEXT)).toEqual(t(30));
    expect(betterTake([], TEXT)).toBeNull();
  });
});
