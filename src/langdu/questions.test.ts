import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { EMPTY_READING, type ParentQuestion, type PassageQuestion } from '../types';
import { afterRead } from './history';
import type { ReadingPassage } from './pool';
import { ASK_ORDER, PER_READ, questionFor, questionSet, shuffleQuestion, withQuestion, withQuestions } from './questions';

const q1: ParentQuestion = { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 };
const q2: ParentQuestion = { q: '我家有几个人？', choices: ['三个', '四个', '五个'], answer: 2, sentence: 0 };

describe('questions in turn (spec 2026-10-15 §6)', () => {
  it('the turn picks one, round and round; none without questions', () => {
    expect([0, 1, 2, 3].map((t) => questionFor([q1, q2], t))).toEqual([q1, q2, q1, q2]);
    expect(questionFor(undefined, 0)).toBeUndefined();
    expect(questionFor([], 3)).toBeUndefined();
  });
  it("a revisit asks the other question: the passage's turn moves on with each lesson read", () => {
    const p: ReadingPassage = { id: 'p01', title: 'x', text: 'y', source: 'ziji', fit: 1, questions: [q1, q2] };
    expect(withQuestion(p, EMPTY_READING).question).toBe(q1);
    expect(withQuestion(p, afterRead(EMPTY_READING, 'p01', '2026-10-01', 'well')).question).toBe(q2);
    expect(withQuestion({ ...p, questions: undefined }, EMPTY_READING).question).toBeUndefined();
  });
});

describe('shuffleQuestion', () => {
  it('four choices: the right one stays right and visits every place (spec 2026-10-24 §5)', () => {
    const q4: PassageQuestion = { q: '小华为什么笑了？', choices: ['他赢了比赛', '球进了', '我帮了他', '他找到了球'], answer: 2, kind: 'why', sentences: [1, 3] };
    const places = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = shuffleQuestion(q4, mulberry32(seed));
      expect(s.choices[s.answer]).toBe('我帮了他');
      expect([...s.choices].sort()).toEqual([...q4.choices].sort());
      expect(s).toMatchObject({ kind: 'why', sentences: [1, 3] });
      places.add(s.answer);
    }
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });
  it('keeps the right answer right, and moves it about', () => {
    const places = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const s = shuffleQuestion(q1, mulberry32(seed));
      expect(s.choices[s.answer]).toBe('妈妈');
      expect([...s.choices].sort()).toEqual([...q1.choices].sort());
      expect(s.sentence).toBe(1);
      places.add(s.answer);
    }
    expect([...places].sort()).toEqual([0, 1, 2]);
  });
});

describe('three questions a read (spec 2026-10-24 §5)', () => {
  const k = (kind: PassageQuestion['kind'], n: number): PassageQuestion => ({ q: `${kind}${n}？`, choices: ['甲', '乙', '丙', '丁'], answer: 0, kind, sentence: 0 });
  // p08's six in the order the content holds them: why word order main fact fact
  const SIX = [k('why', 0), k('word', 1), k('order', 2), k('main', 3), k('fact', 4), k('fact', 5)];
  const kinds = (set: number[]) => set.map((i) => SIX[i]!.kind);
  it('three, at most one fact, in ASK_ORDER (the deepest first: it is shown before he reads)', () => {
    for (let turn = 0; turn < 12; turn++) {
      const set = questionSet(SIX, undefined, turn);
      expect(set).toHaveLength(PER_READ);
      expect(new Set(set).size).toBe(3);
      expect(kinds(set).filter((x) => x === 'fact').length).toBeLessThanOrEqual(1);
      expect(kinds(set).map((x) => ASK_ORDER.indexOf(x))).toEqual([...kinds(set).map((x) => ASK_ORDER.indexOf(x))].sort((a, b) => a - b));
    }
  });
  it('a first read: three different kinds', () => {
    expect(new Set(kinds(questionSet(SIX, undefined, 0))).size).toBe(3);
  });
  it('the next read takes kinds the last one did not, and never its set', () => {
    let prev: number[] | undefined;
    for (let turn = 0; turn < 10; turn++) {
      const set = questionSet(SIX, prev, turn);
      if (prev) {
        expect([...set].sort()).not.toEqual([...prev].sort());
        const before = new Set(kinds(prev));
        // four kinds besides fact and two facts: at least two of the three kinds are new each time
        expect(kinds(set).filter((x) => !before.has(x)).length).toBeGreaterThanOrEqual(2);
      }
      prev = set;
    }
  });
  it('revisits go round: over six reads every question is asked', () => {
    let prev: number[] | undefined;
    const asked = new Set<number>();
    for (let turn = 0; turn < 6; turn++) {
      prev = questionSet(SIX, prev, turn);
      prev.forEach((i) => asked.add(i));
    }
    expect([...asked].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("a parent text keeps its own (none, one, up to three); an older two are both asked", () => {
    expect(questionSet([], undefined, 0)).toEqual([]);
    expect(questionSet([q1], [0], 3)).toEqual([0]);
    expect(questionSet([q1, q2], undefined, 1)).toEqual([0, 1]);
  });
  it('withQuestions: the passage with this read’s questions and their indices, from its history', () => {
    const p: ReadingPassage = { id: 'p08', title: 'x', text: 'y', source: 'ziji', fit: 1, questions: SIX };
    const first = withQuestions(p, EMPTY_READING);
    expect(first.asked).toEqual(first.askedSet.map((i) => SIX[i]));
    const r = afterRead(EMPTY_READING, 'p08', '2026-10-01', 'well', { set: first.askedSet, answers: [] });
    expect([...withQuestions(p, r).askedSet].sort()).not.toEqual([...first.askedSet].sort());
    expect(withQuestions({ ...p, questions: undefined }, EMPTY_READING)).toMatchObject({ asked: [], askedSet: [] });
  });
});
