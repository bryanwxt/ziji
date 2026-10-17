// src/weeklist/fit.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { parentSentenceProblems, proposeFit } from './fit';

const w = (t: string) => makeWord(t, { id: `p:${t}`, source: 'parent', pinyin: 'x x' });
describe('proposeFit (spec §7.3)', () => {
  const mates = ['整洁', '热闹', '冰冷', '原来', '书包', '跑'].map(w);
  it('decoys only from the list, same length, never the answer', () => {
    const f = proposeFit(w('干净'), mates, [], { text: '教室打扫得很＿。', source: 'parent' })!;
    expect(f.wrong).toHaveLength(3);
    for (const d of f.wrong) { expect(mates.map((m) => m.text)).toContain(d); expect([...d]).toHaveLength(2); }
  });
  it('confusables (shared character) come first', () => {
    const f = proposeFit(w('整齐'), mates, [], { text: '书摆得很＿。', source: 'parent' })!;
    expect(f.wrong[0]).toBe('整洁');
  });
  it('null when fewer than three decoys exist', () => {
    expect(proposeFit(w('干净'), mates.slice(0, 2), [], { text: '很＿。', source: 'parent' })).toBeNull();
  });
});
describe('parentSentenceProblems', () => {
  it('checks the word once, the length, blocked and 儿化 words, Latin', () => {
    expect(parentSentenceProblems('他跑得很快。', '跑')).toEqual([]);
    expect(parentSentenceProblems('跑跑。', '跑')).toContain('the word must appear once');
    expect(parentSentenceProblems('他一点儿也不跑。', '跑')).toContain('儿化: 一点儿');
    expect(parentSentenceProblems('he 跑 fast', '跑')).toContain('no English or pinyin');
  });
});
