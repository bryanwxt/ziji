import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import type { Ask, PracticeItem } from '../session/round';
import { NONE_OF_THESE, NONE_SHARE, noneChoices, withNoneOfThese } from './noneOfThese';
import { afterPracticeAnswer, createSessionRecord, finishStep, startPractice } from '../session/runner';

const item = (wordId: string, ask: Ask, retry = false): PracticeItem => ({ wordId, rung: 2, ask, grades: null, retry });

describe('「都不对」 (production practice spec §5)', () => {
  it('about one in five of the questions that can take it, the same for the same seed', () => {
    // each word: a first question, then 4 that can take it
    const items = Array.from({ length: 500 }, (_, i) => [item(`w${i}`, 'read'), item(`w${i}`, 'word'), item(`w${i}`, 'match'), item(`w${i}`, 'meaningRead'), item(`w${i}`, 'hear')]).flat();
    const marked = withNoneOfThese(items, new Set(), mulberry32(7)).filter((x) => x.none).length;
    expect(marked / 2000).toBeGreaterThan(NONE_SHARE - 0.03);
    expect(marked / 2000).toBeLessThan(NONE_SHARE + 0.03);
    expect(withNoneOfThese(items, new Set(), mulberry32(7))).toEqual(withNoneOfThese(items, new Set(), mulberry32(7)));
  });
  it("never a word's first question, a word introduced today, a retry, or another kind of question", () => {
    const items = Array.from({ length: 200 }, (_, i) => [item(`w${i}`, 'word'), item(`w${i}`, 'word'), item(`n${i}`, 'read'), item(`n${i}`, 'word'), item(`w${i}`, 'match', true), item(`w${i}`, 'fit'), item(`w${i}`, 'pair')]).flat();
    const fresh = new Set(Array.from({ length: 200 }, (_, i) => `n${i}`));
    const out = withNoneOfThese(items, fresh, mulberry32(3));
    const firstOf = new Map<string, number>();
    out.forEach((x, i) => { if (!firstOf.has(x.wordId)) firstOf.set(x.wordId, i); });
    out.forEach((x, i) => {
      if (!x.none) return;
      expect(firstOf.get(x.wordId)).not.toBe(i);
      expect(fresh.has(x.wordId)).toBe(false);
      expect(x.retry).toBe(false);
      expect(['word', 'match', 'meaningRead', 'hear']).toContain(x.ask);
    });
    expect(out.some((x) => x.none)).toBe(true);
  });
  it('the right answer is left out and 都不对 comes last: as many choices as before', () => {
    expect(noneChoices(['衣服', '牙', '饭', '歌'], '衣服')).toEqual(['牙', '饭', '歌', NONE_OF_THESE]);
  });
});

describe('a missed 「都不对」 question (production practice spec §5)', () => {
  it('comes back as an ordinary retry, its answer among the choices', () => {
    const q: PracticeItem[] = [{ ...item('a', 'word'), none: true }, item('b', 'read'), item('c', 'read'), item('d', 'read'), item('e', 'read'), item('f', 'read')];
    const rec = startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), q);
    const retry = afterPracticeAnswer(rec, false, 100).practiceQueue!.find((x) => x.retry)!;
    expect(retry.wordId).toBe('a');
    expect(retry.none).toBeUndefined();
  });
});
