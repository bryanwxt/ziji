import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { bankFor } from '../content/sentenceBank';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type Settings } from '../types';
import { buildSessionPlan, SENTENCE_PER_LESSON } from './plan';
import { planPractice, SENTENCE_BY, withSentence } from './practice';
import type { PracticeItem } from './round';
import { createSessionRecord, finishStep, skipSayItems, startPractice } from './runner';

const words = builtinWords(0);
const id = (t: string) => words.find((w) => w.text === t)!.id;
const now = new Date(2026, 9, 2, 8, 0);
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });
const later = new Date(2026, 10, 1);
/** Read passed `daysAgo` days ago. */
const read = (t: string, daysAgo: number): CardRecord => ({ ...makeCard(id(t), 'recognise', later, true), passed: now.getTime() - daysAgo * 86_400_000 });

describe('which words get a 说一句 (production practice spec §4)', () => {
  it('due Sentence cards first, then words whose Read has passed with a sentence-bank example, the newest pass first; at most 2', () => {
    expect(['很', '和', '跟', '大'].every((t) => bankFor(t))).toBe(true);
    const cards = [read('很', 5), read('和', 1), read('跟', 3), read('大', 9), makeCard(id('大'), 'sentence', new Date(2026, 9, 1)), makeCard(id('跟'), 'sentence', later)];
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sentenceIds).toEqual([id('大'), id('和')]); // 跟's card isn't due
    expect(SENTENCE_PER_LESSON).toBe(2);
  });
  it('never a word with no bank example, one whose Read has not passed, or one introduced today', () => {
    expect(bankFor('山')).toBeUndefined();
    const cards = [read('山', 1), makeCard(id('很'), 'recognise', later)];
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sentenceIds).toEqual([]);
    const fresh = buildSessionPlan({ cards: [], words: words.filter((w) => w.text === '很'), settings: settings(), now });
    expect(fresh.newWordIds).toEqual([id('很')]);
    expect(fresh.sentenceIds).toEqual([]);
  });
});

const q = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false });

describe('说一句 in the round (production practice spec §4)', () => {
  it('at most 2, and one for every three items at most; rung 3, graded by the parent only', () => {
    const count = (items: number, ids: number) => withSentence(Array.from({ length: items }, (_, i) => q(`w${i}`)), Array.from({ length: ids }, (_, i) => `s${i}`)).filter((x) => x.ask === 'sentence');
    expect(count(12, 5)).toHaveLength(2);
    expect(count(3, 5)).toHaveLength(1);
    expect(count(2, 5)).toHaveLength(0);
    expect(count(12, 5).every((x) => x.rung === 3 && x.grades === 'sentence' && !x.retry)).toBe(true);
  });
  it('early enough for the time box: by the 12th item, and the second by the 24th', () => {
    const out = withSentence(Array.from({ length: 200 }, (_, i) => q(`w${i}`)), ['s0', 's1']);
    const at = out.flatMap((x, i) => (x.ask === 'sentence' ? [i] : []));
    expect(at).toHaveLength(2);
    expect(at[0]).toBeLessThanOrEqual(SENTENCE_BY + 1);
    expect(at[1]).toBeLessThanOrEqual(2 * SENTENCE_BY + 2);
  });
  it('never beside the same word, a Say card, or another 说一句', () => {
    const items: PracticeItem[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(q);
    items.splice(2, 0, { wordId: 'z', rung: 1, ask: 'say', grades: 'say', retry: false });
    const out = withSentence(items, ['c', 'g']);
    out.forEach((x, i) => {
      if (x.ask !== 'sentence') return;
      for (const n of [out[i - 1], out[i + 1]]) expect(n && (n.wordId === x.wordId || n.ask === 'say' || n.ask === 'sentence')).toBeFalsy();
    });
  });
  const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [id('河'), id('他'), id('山'), id('火'), id('人'), id('口')], newWordIds: [id('和')], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, sentenceIds: [id('和'), id('很')], ...over });
  const byId = new Map(words.map((w) => [w.id, w]));
  const round = (p: SessionPlan, canSay: boolean) => planPractice({ ...createSessionRecord(p, '2026-10-02', 0), flashIndex: 1 }, new Map(), byId, words, false, mulberry32(1), new Map(), 1, canSay);
  it('never a word introduced in the same lesson; none when the iPad cannot record or the plan is from before', () => {
    expect(round(plan(), true).filter((x) => x.ask === 'sentence').map((x) => x.wordId)).toEqual([id('很')]);
    expect(round(plan(), false).some((x) => x.ask === 'sentence')).toBe(false);
    expect(round(plan({ sentenceIds: undefined }), true).some((x) => x.ask === 'sentence')).toBe(false);
  });
  it('a blocked microphone drops the 说一句 cards with the Say cards', () => {
    const rec = { ...startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), [q('a'), { wordId: 'b', rung: 3, ask: 'sentence', grades: 'sentence', retry: false }, q('c'), { wordId: 'd', rung: 1, ask: 'say', grades: 'say', retry: false }]), practiceIndex: 1 };
    expect(skipSayItems(rec).practiceQueue!.map((x) => x.ask)).toEqual(['read', 'read']);
  });
});
