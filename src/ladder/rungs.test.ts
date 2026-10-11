// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { ReviewLog } from '../types';
vi.mock('../content/understand', () => ({ sentencesFor: (t: string) => (t === '猫' ? [{ zh: '我家有一只猫。', en: 'We have a cat.' }, { zh: '猫在睡觉。', en: 'The cat is sleeping.' }] : []) }));
import { canAskRung, RUNGS, FAST_FLOOR_MS, fastLimit, isOwned, nextRung, passDays, passedAt, RUNG_CARD, rungOf, sayDays, sayPassed } from './rungs';

const log = (date: string, hour: number, correct: boolean, responseMs = 2000, cardId = 'b:门:hear'): ReviewLog =>
  ({ cardId, wordId: 'b:门', kind: 'hear', at: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(), rating: correct ? 3 : 1, correct, responseMs });

describe('rungs', () => {
  it('Read is the reading card and Use the meaning card, so his progress carries over', () => {
    expect(RUNG_CARD).toEqual({ hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say' });
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

describe('Understand (plan 2b): between Hear and Read', () => {
  const cat = makeWord('猫', { meaning: 'cat' });
  const dog = makeWord('狗', { meaning: 'dog' });
  it('the rungs go hear, understand, read, use, then say (spec 2026-10-11 §3)', () => {
    expect(RUNGS).toEqual(['hear', 'understand', 'read', 'use', 'say']);
  });
  it('a word with two sentences goes from Hear to Understand; one with none goes straight to Read', () => {
    expect(nextRung(cat, 'hear')).toBe('understand');
    expect(nextRung(cat, 'understand')).toBe('read');
    expect(nextRung(dog, 'hear')).toBe('read');
    expect(canAskRung(dog, 'understand')).toBe(false);
  });
  it('owning a word needs Understand only when it can be asked', () => {
    expect(isOwned(dog, new Set(['hear', 'read', 'use']))).toBe(true);
    expect(isOwned(cat, new Set(['hear', 'read', 'use']))).toBe(false); // Understand can be asked of 猫, and isn't passed
    expect(isOwned(cat, new Set(['hear', 'understand', 'read', 'use']))).toBe(true);
  });
});

describe('the Say rung (spec 2026-10-11 §3)', () => {
  const take = (date: string, hour: number, ok: boolean, cardId = 'b:门:say'): ReviewLog =>
    ({ cardId, wordId: 'b:门', kind: 'say', at: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(), rating: ok ? 3 : 1, correct: ok });
  it('passes on two separate days that each have a confirmed take', () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-02', 18, true)], 'b:门:say')).toBe(true);
    expect(sayDays([take('2026-10-02', 18, true), take('2026-10-01', 9, true)], 'b:门:say')).toEqual(['2026-10-01', '2026-10-02']);
  });
  it('two confirmed takes on one day are one day', () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-01', 19, true)], 'b:门:say')).toBe(false);
  });
  it('a rejected take does not count, and does not spoil a confirmed one the same day', () => {
    expect(sayPassed([take('2026-10-01', 9, false), take('2026-10-02', 9, true)], 'b:门:say')).toBe(false);
    expect(sayPassed([take('2026-10-01', 9, false), take('2026-10-01', 10, true), take('2026-10-02', 9, true)], 'b:门:say')).toBe(true);
  });
  it("another word's takes are not this word's", () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-02', 9, true, 'b:大:say')], 'b:门:say')).toBe(false);
  });
  it('a pass never opens Say, and Say opens nothing: its card is made when a lesson first asks it', () => {
    const w = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    expect(nextRung(w, 'use')).toBeNull();
    expect(nextRung(w, 'say')).toBeNull();
    expect(canAskRung(w, 'say')).toBe(true);
    expect(rungOf('say')).toBe('say');
  });
  it('owning a word is still its reading rungs: the town never dims for a word he has not said', () => {
    const w = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    expect(isOwned(w, new Set(['hear', 'read', 'use']))).toBe(true);
  });
});

describe('passDays (the days a pass counts)', () => {
  it("each day's first answer when it was right and not too fast, oldest first", () => {
    const logs = [log('2026-10-02', 9, true), log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-03', 9, true, 100)];
    expect(passDays(logs, 'b:门:hear', FAST_FLOOR_MS)).toEqual([new Date('2026-10-02T09:00:00').getTime()]);
  });
});
