import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type Settings } from '../types';
import { buildSessionPlan, SAY_PER_LESSON } from './plan';
import { planPractice, withSay } from './practice';
import type { PracticeItem } from './round';
import { createSessionRecord, skipSayItems, startPractice, finishStep } from './runner';

const words = builtinWords(0);
const id = (t: string) => words.find((w) => w.text === t)!.id;
const now = new Date(2026, 9, 2, 8, 0); // his class (P2) is on 二下·16: its lesson and 二下·15 are the school lane
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026, ...over });
const later = new Date(2026, 10, 1);
/** Read passed `daysAgo` days ago (the newest pass first, spec 2026-10-11 §4). */
const read = (t: string, daysAgo: number): CardRecord => ({ ...makeCard(id(t), 'recognise', later, true), passed: now.getTime() - daysAgo * 86_400_000 });

describe('a word sent back to learn (review M2)', () => {
  it('no Say or 说一句 for a word with no reading card, even with its cards due', () => {
    const cards = [makeCard(id('很'), 'say', new Date(2026, 9, 1)), makeCard(id('很'), 'sentence', new Date(2026, 9, 1)), read('大', 1)];
    const plan = buildSessionPlan({ cards, words, settings: settings({ grade: undefined }), now });
    expect(plan.sayIds).not.toContain(id('很'));
    expect(plan.sentenceIds).not.toContain(id('很'));
    expect(plan.sayIds).toContain(id('大'));
  });
});

describe('which words are said (spec 2026-10-11 §4)', () => {
  it('due Say cards first, then words whose Read has passed and that have no Say card, the newest pass first', () => {
    const cards = [read('大', 5), read('人', 1), read('口', 3), read('山', 9), { ...makeCard(id('山'), 'say', new Date(2026, 9, 1)) }, { ...makeCard(id('口'), 'say', later) }];
    expect(buildSessionPlan({ cards, words, settings: settings({ grade: undefined }), now }).sayIds).toEqual([id('山'), id('人'), id('大')]); // 口's Say card isn't due
  });
  it("his class's lesson comes before a newer pass", () => {
    const cards = [read('森', 0), read('持', 7)]; // 持 is in 二下·16, 森 in 二上
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sayIds).toEqual([id('持'), id('森')]);
  });
  it('never a word whose Read has not passed, and at most 6', () => {
    const many = ['一', '二', '三', '四', '五', '六', '七', '八'].map((t, i) => read(t, i));
    const plan = buildSessionPlan({ cards: [...many, makeCard(id('九'), 'recognise', later)], words, settings: settings(), now });
    expect(plan.sayIds).toHaveLength(SAY_PER_LESSON);
    expect(plan.sayIds).not.toContain(id('九'));
  });
  it('none when the parent switches Say cards off', () => {
    expect(buildSessionPlan({ cards: [read('大', 1)], words, settings: settings({ sayCards: false }), now }).sayIds).toEqual([]);
  });
});

const q = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false });
const say = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

describe('Say cards in the round (spec 2026-10-11 §4)', () => {
  it('about one in three items, at most 6', () => {
    const count = (items: number, ids: number) => withSay(Array.from({ length: items }, (_, i) => q(`w${i}`)), say(ids)).filter((x) => x.ask === 'say').length;
    expect(count(12, 10)).toBe(6); // 6 of 18
    expect(count(6, 10)).toBe(3); // 3 of 9
    expect(count(20, 10)).toBe(6); // the cap
    expect(count(1, 10)).toBe(0);
    expect(count(9, 2)).toBe(2);
  });
  it('spread through the round, never beside the same word, and graded by nobody in the lesson', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(q);
    const out = withSay(items, ['c', 'f', 'z']);
    const at = out.flatMap((x, i) => (x.ask === 'say' ? [i] : []));
    expect(at).toHaveLength(3);
    expect(at.some((i, k) => k > 0 && i === at[k - 1]! + 1)).toBe(false);
    for (const i of at) expect([out[i - 1]?.wordId, out[i + 1]?.wordId]).not.toContain(out[i]!.wordId);
    expect(out.filter((x) => x.ask === 'say').every((x) => x.grades === 'say' && !x.retry)).toBe(true);
  });
  const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [id('河'), id('他'), id('山'), id('火')], newWordIds: [id('大')], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, sayIds: [id('大'), id('人'), id('口')], ...over });
  const byId = new Map(words.map((w) => [w.id, w]));
  const round = (p: SessionPlan, canSay: boolean) => planPractice({ ...createSessionRecord(p, '2026-10-02', 0), flashIndex: 1 }, new Map(), byId, words, false, mulberry32(1), new Map(), 1, canSay);
  it('never a word introduced in the same lesson', () => {
    const said = round(plan(), true).filter((x) => x.ask === 'say').map((x) => x.wordId);
    expect(said).toEqual([id('人'), id('口')]);
  });
  it('none when the iPad cannot record, and none from a plan saved before Say cards', () => {
    expect(round(plan(), false).some((x) => x.ask === 'say')).toBe(false);
    expect(round(plan({ sayIds: undefined }), true).some((x) => x.ask === 'say')).toBe(false);
  });
});

describe('a blocked microphone (spec 2026-10-11 §7)', () => {
  const rec = (queue: PracticeItem[], index: number) => ({ ...startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), queue), practiceIndex: index });
  const sayItem = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'say', grades: 'say', retry: false });
  it('drops this Say card and every later one; what came before stays', () => {
    const next = skipSayItems(rec([sayItem('a'), q('b'), sayItem('c'), q('d'), sayItem('e')], 2));
    expect(next.practiceQueue!.map((x) => `${x.ask}:${x.wordId}`)).toEqual(['say:a', 'read:b', 'read:d']);
    expect(next.practiceIndex).toBe(2);
  });
  it('ends 练一练 when only Say cards were left', () => {
    const next = skipSayItems(rec([q('a'), sayItem('b')], 1));
    expect(next.completedSteps).toEqual(['newwords', 'practice']);
  });
});
