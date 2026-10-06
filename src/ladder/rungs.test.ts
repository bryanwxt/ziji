// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { ReviewLog } from '../types';
import { canAskRung, FAST_FLOOR_MS, fastLimit, isOwned, nextRung, passedAt, RUNG_CARD, rungOf } from './rungs';

const log = (date: string, hour: number, correct: boolean, responseMs = 2000, cardId = 'b:门:hear'): ReviewLog =>
  ({ cardId, wordId: 'b:门', kind: 'hear', at: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(), rating: correct ? 3 : 1, correct, responseMs });

describe('rungs', () => {
  it('Read is the reading card and Use the meaning card, so his progress carries over', () => {
    expect(RUNG_CARD).toEqual({ hear: 'hear', read: 'recognise', use: 'meaning' });
    expect(rungOf('recognise')).toBe('read');
    expect(rungOf('write')).toBeNull();
  });
});

describe('passing (spec 2026-10-06 §3.2)', () => {
  it('passes on the second day whose first answer was right', () => {
    const at = passedAt([log('2026-10-01', 9, true), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS);
    expect(at).toBe(new Date('2026-10-02T09:00:00').getTime());
  });
  it('one day is never enough, however many right answers', () => {
    expect(passedAt([log('2026-10-01', 9, true), log('2026-10-01', 10, true), log('2026-10-01', 11, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it("only a day's first answer counts: a wrong first try and a right retry is not a passing day", () => {
    expect(passedAt([log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it('an implausibly fast answer does not count', () => {
    expect(passedAt([log('2026-10-01', 9, true, 150), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it("other cards' answers are not this card's", () => {
    expect(passedAt([log('2026-10-01', 9, true), log('2026-10-02', 9, true, 2000, 'b:大:hear')], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it('the fast limit is a quarter of his usual right answer, never under the floor', () => {
    const many = Array.from({ length: 20 }, (_, i) => log('2026-10-01', 9, true, 4000 + i));
    expect(fastLimit(many, 'hear')).toBeGreaterThanOrEqual(1000);
    expect(fastLimit(many.slice(0, 5), 'hear')).toBe(FAST_FLOOR_MS); // too few answers to know his pace
  });
});

describe('opening and owning', () => {
  const withCue = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
  const noCue = makeWord('口', { examples: [] });
  it('Hear → Read → Use; Use only when the word can be used in a question', () => {
    expect(nextRung(withCue, 'hear')).toBe('read');
    expect(nextRung(withCue, 'read')).toBe('use');
    expect(nextRung(noCue, 'read')).toBeNull();
    expect(canAskRung(noCue, 'use')).toBe(false);
  });
  it('owned: every rung it can be asked has passed', () => {
    expect(isOwned(noCue, new Set(['hear', 'read']))).toBe(true);
    expect(isOwned(withCue, new Set(['hear', 'read']))).toBe(false);
    expect(isOwned(withCue, new Set(['hear', 'read', 'use']))).toBe(true);
  });
});
