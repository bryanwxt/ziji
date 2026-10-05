import { describe, expect, it } from 'vitest';
import { wordCue } from '../activities/flashcards/meaning';
import { builtinWords } from '../content';
import { bankFor } from '../content/sentenceBank';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import type { SessionPlan, Word } from '../types';
import { askable, planFreePlay, planPractice, practiceWords, withFish } from './practice';
import { fishItem } from '../activities/components/zibian';
import type { PracticeItem } from './round';
import { createSessionRecord } from './runner';

const words = builtinWords(0);
const byId = new Map(words.map((w) => [w.id, w]));
const id = (t: string) => words.find((w) => w.text === t)!.id;
const fishItemFor = (w: Word) => fishItem(w, [], new Set(), mulberry32(1));
const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, ...over });

describe('who is in 练一练 (spec 2026-10-05 §3.1)', () => {
  it('the new words 认新字 introduced, from 字, three times; a word missed there comes back first', () => {
    const rec = { ...createSessionRecord(plan({ newWordIds: [id('河'), id('他')] }), '2026-10-06', 0), flashIndex: 2, recalls: { [id('他')]: { right: 0, inContext: 0, missed: true } } };
    const ws = practiceWords(rec, new Map());
    expect(ws.map((w) => [w.wordId, w.isNew, w.from, w.appearances, !!w.early])).toEqual([[id('河'), true, 1, 3, false], [id('他'), true, 1, 3, true]]);
    expect(ws.every((w) => !w.gradesRecognise && w.gradesMeaning)).toBe(true); // reading was graded in 认新字
  });
  it('a new word 认新字 never reached (its time ran out) is not in the round', () => {
    const rec = { ...createSessionRecord(plan({ newWordIds: [id('河'), id('他')] }), '2026-10-06', 0), flashIndex: 1 };
    expect(practiceWords(rec, new Map()).map((w) => w.wordId)).toEqual([id('河')]);
  });
  it('due revision starts on the rung after his best: once from 词语 or 句子, twice from 字', () => {
    const rec = createSessionRecord(plan({ reviewWordIds: [id('很'), id('火')], meaningReviewIds: [id('很')], newMeaningIds: [id('山')] }), '2026-10-06', 0);
    const ws = practiceWords(rec, new Map([[id('很'), 2], [id('山'), 1]]));
    expect(ws.map((w) => [w.wordId, w.from, w.appearances, w.gradesRecognise, w.gradesMeaning])).toEqual([
      [id('很'), 3, 1, true, true],
      [id('火'), 1, 2, true, false],
      [id('山'), 2, 1, false, true],
    ]);
  });
});

describe('what a word can be asked', () => {
  it('reading always; listening only with the voice on; 组词 only with a 组词; a sentence only with a sentence; 用对了吗 only for bank words', () => {
    const w = words.find((x) => bankFor(x.text) && wordCue(x))!;
    const can = askable(w, words, true);
    expect(['read', 'listen', 'word', 'fit', 'usage'].every((a) => can(a as never))).toBe(true);
    expect(askable(w, words, false)('listen')).toBe(false);
    const plain = words.find((x) => !bankFor(x.text) && !wordCue(x) && !(x.sentences?.length))!;
    expect(['word', 'fit', 'usage'].some((a) => askable(plain, words, true)(a as never))).toBe(false);
    expect(askable(undefined, words, true)('read')).toBe(false); // a word deleted since the plan
  });
  it('the round leaves out paused and deleted words', () => {
    const paused = { ...byId.get(id('火'))!, paused: true };
    const rec = createSessionRecord(plan({ reviewWordIds: [id('火'), 'b:gone', id('山')] }), '2026-10-06', 0);
    const items = planPractice(rec, new Map(), new Map([...byId, [paused.id, paused]]), words, false, mulberry32(1));
    expect(new Set(items.map((x) => x.wordId))).toEqual(new Set([id('山')]));
  });
  it('free play: words he knows, never graded', () => {
    const cards = ['河', '他', '山', '火', '很'].map((t) => makeCard(id(t), 'recognise', new Date(2026, 9, 1), true));
    const items = planFreePlay(cards, words, new Map(), false, mulberry32(2));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((x) => x.grades === null && x.retry)).toBe(true);
    expect(new Set(items.map((x) => x.wordId)).size).toBe(5);
  });
});

describe('the new kinds of question (spec 2026-10-05 §3.2, phase B)', () => {
  it('组词 pairing needs a two-character 组词; 搭配 pairing a listed 搭配; 组句 a sentence that cuts into tiles', () => {
    const fire = byId.get(id('火'))!;
    expect(askable(fire, words, false)('pair')).toBe(true);
    expect(askable({ ...fire, examples: [] }, words, false)('pair')).toBe(false);
    expect(askable(byId.get(id('穿'))!, words, false)('match')).toBe(true);
    expect(askable(byId.get(id('很'))!, words, false)('match')).toBe(false);
    expect(askable(byId.get(id('很'))!, words, false)('build')).toBe(true);
    expect(askable(byId.get(id('很'))!, words, false)('fish')).toBe(false); // only for words he has confused (Task 7)
  });
});

describe('钓鱼 in the round (spec 2026-10-05 §3.4)', () => {
  const p = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: null, retry: false });
  it('at most two 钓鱼 items, spread out, never next to the same word', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(p);
    const out = withFish(items, ['b', 'e', 'h']);
    const fish = out.map((x, i) => [x, i] as const).filter(([x]) => x.ask === 'fish');
    expect(fish).toHaveLength(2);
    for (const [x, i] of fish) {
      expect(out[i - 1]?.wordId).not.toBe(x.wordId);
      expect(out[i + 1]?.wordId).not.toBe(x.wordId);
      expect(x).toMatchObject({ grades: null, retry: false });
    }
    expect(fish[1]![1] - fish[0]![1]).toBeGreaterThan(2);
  });
  it('a confused word that has no 钓鱼 item gets none (review focus 4)', () => {
    const rec = createSessionRecord(plan({ reviewWordIds: [id('山')] }), '2026-10-06', 0);
    const items = planPractice(rec, new Map(), byId, words, false, mulberry32(1), new Map([[id('山'), ['出']]]));
    const shan = byId.get(id('山'))!;
    if (!fishItemFor(shan)) expect(items.some((x) => x.ask === 'fish')).toBe(false);
  });
});
