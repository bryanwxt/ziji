// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';
import { buildSessionPlan, HEAR_REVIEW_CAP } from './plan';
import { ladderWords } from '../content/ladder';

const now = new Date('2026-10-06T09:00:00');
const settings = { ...DEFAULT_SETTINGS, newPerDay: 8 };

describe('planning on the word ladder (spec 2026-10-06 §3)', () => {
  it('ladder words come in their order, right after their characters', () => {
    const lw = ladderWords()[0]!;
    const chars = Array.from(lw.text).map((c, i) => makeWord(c, { rank: lw.rank! - 1 - i }));
    const started = chars.map((w) => makeCard(w.id, 'hear', new Date('2026-10-10'))); // his characters are begun
    const plan = buildSessionPlan({ cards: started, words: [...chars, lw], settings, now, newPerDay: 1 });
    expect(plan.newWordIds).toEqual([lw.id]);
  });
  it('a ladder word waits until all its characters are begun, or come earlier in the same lesson', () => {
    const lw = ladderWords()[0]!;
    const [a, b] = Array.from(lw.text).map((c, i) => makeWord(c, { rank: lw.rank! - 2 + i * 0.5 }));
    // neither character begun, both new today: they come first, then the word
    expect(buildSessionPlan({ cards: [], words: [a!, b!, lw], settings, now, newPerDay: 3 }).newWordIds).toEqual([a!.id, b!.id, lw.id]);
    // one character missing from his words entirely: the word never comes
    expect(buildSessionPlan({ cards: [], words: [a!, lw], settings, now, newPerDay: 3 }).newWordIds).toEqual([a!.id]);
  });
  it('due hear cards are reviewed', () => {
    const w = makeWord('门');
    const plan = buildSessionPlan({ cards: [makeCard('b:门', 'hear', new Date('2026-10-06T08:00:00'))], words: [w], settings, now });
    expect(plan.hearReviewIds).toEqual(['b:门']);
  });
  it('a word with a hear card is begun: never new again', () => {
    const w = makeWord('门');
    const plan = buildSessionPlan({ cards: [makeCard('b:门', 'hear', new Date('2026-10-20'))], words: [w], settings, now });
    expect(plan.newWordIds).toEqual([]);
  });
  it('Use (meaning practice) starts only once Read has passed', () => {
    const a = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    const b = makeWord('口', { pinyin: 'kǒu', examples: [{ text: '口水', pinyin: 'kǒu shuǐ' }] });
    const cards = [{ ...makeCard('b:门', 'recognise', new Date('2026-10-20')), passed: 1 }, makeCard('b:口', 'recognise', new Date('2026-10-20'))];
    const plan = buildSessionPlan({ cards, words: [a, b], settings, now });
    expect(plan.newMeaningIds).toEqual(['b:门']);
  });
  it('a card whose word no longer exists is skipped', () => {
    const plan = buildSessionPlan({ cards: [makeCard('w:没有了', 'hear', new Date('2026-10-01'))], words: [], settings, now });
    expect(plan.hearReviewIds).toEqual([]);
  });
  it('at most HEAR_REVIEW_CAP hear reviews a lesson', () => {
    const ws = Array.from({ length: HEAR_REVIEW_CAP + 5 }, (_, i) => makeWord(`字${i}`));
    const cards = ws.map((w) => makeCard(w.id, 'hear', new Date('2026-10-01')));
    expect(buildSessionPlan({ cards, words: ws, settings, now }).hearReviewIds).toHaveLength(HEAR_REVIEW_CAP);
  });
});
