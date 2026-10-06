// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';
import { mulberry32 } from '../lib/random';
import { buildSessionPlan, UNDERSTAND_REVIEW_CAP } from './plan';
import { buildRound } from './round';
import { planPractice } from './practice';
import { createSessionRecord } from './runner';

const S: Record<string, { zh: string; en: string }[]> = {
  猫: [{ zh: '我家有一只猫。', en: 'We have a cat at home.' }, { zh: '猫在门口睡觉。', en: 'The cat sleeps by the door.' }],
  狗: [{ zh: '小狗跑得很快。', en: 'The puppy runs fast.' }, { zh: '我和狗一起玩。', en: 'I play with the dog.' }],
};
vi.mock('../content/understand', () => ({
  sentencesFor: (t: string) => S[t] ?? [],
  wordTerm: () => '一上',
  inScopeWords: () => Object.keys(S).map((t) => ({ text: t })),
}));

const now = new Date('2026-10-06T09:00:00');
const settings = { ...DEFAULT_SETTINGS, newPerDay: 8 };
const cat = makeWord('猫', { meaning: 'cat' });
const fish = makeWord('鱼', { meaning: 'fish' });

describe('lessons and the Understand rung (plan 2b)', () => {
  it('due Understand cards are reviewed, askable ones only, at most the cap', () => {
    const cards = [makeCard(cat.id, 'understand', new Date('2026-10-06T08:00:00')), makeCard(fish.id, 'understand', new Date('2026-10-06T08:00:00'))];
    expect(buildSessionPlan({ cards, words: [cat, fish], settings, now }).understandReviewIds).toEqual([cat.id]);
    expect(UNDERSTAND_REVIEW_CAP).toBe(30);
  });
  it("a word whose Understand card is due is first asked 'understand' and graded by it", () => {
    const items = buildRound([{ wordId: 'x', isNew: false, from: 3, appearances: 1, gradesRecognise: false, gradesMeaning: false, gradesUnderstand: true }], () => true, mulberry32(1));
    expect(items[0]).toMatchObject({ ask: 'understand', grades: 'understand' });
  });
  it('an ungraded rung-3 listening question grades nothing', () => {
    const items = buildRound([{ wordId: 'x', isNew: false, from: 3, appearances: 1, gradesRecognise: false, gradesMeaning: false }], (_, a) => a === 'understand' || a === 'read', mulberry32(1));
    expect(items[0]).toMatchObject({ ask: 'understand', grades: null });
  });
  it('no voice: no Understand items (Review Focus 3)', () => {
    const plan = { steps: ['practice' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, understandReviewIds: [cat.id] };
    const rec = createSessionRecord(plan, '2026-10-06', now.getTime());
    const byId = new Map([[cat.id, cat]]);
    expect(planPractice(rec, new Map(), byId, [cat, fish], false, mulberry32(2)).some((i) => i.ask === 'understand')).toBe(false);
    expect(planPractice(rec, new Map(), byId, [cat, fish], true, mulberry32(2)).some((i) => i.ask === 'understand' && i.grades === 'understand')).toBe(true);
  });
});

describe('final review (plan 2b)', () => {
  it('I2: no voice — a word due only for Understand is left out, never asked a reading question that opens Use', () => {
    const plan = { steps: ['practice' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, understandReviewIds: [cat.id] };
    const rec = createSessionRecord(plan, '2026-10-06', now.getTime());
    const items = planPractice(rec, new Map(), new Map([[cat.id, cat]]), [cat, fish], false, mulberry32(2));
    expect(items.filter((i) => i.wordId === cat.id)).toEqual([]);
  });
  it('I3: when a word has another card due today, that card is graded first; Understand waits', () => {
    const items = buildRound([{ wordId: 'x', isNew: false, from: 1, appearances: 2, gradesRecognise: true, gradesMeaning: false, gradesUnderstand: true }], () => true, mulberry32(1));
    expect(items[0]!.grades).toBe('recognise');
    expect(items.some((i) => i.grades === 'understand')).toBe(false);
  });
});
