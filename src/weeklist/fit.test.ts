// src/weeklist/fit.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { parentSentenceProblems, proposeFit } from './fit';

const w = (t: string) => makeWord(t, { id: `p:${t}`, source: 'parent', pinyin: 'x x' });
describe('proposeFit (spec §7.3)', () => {
  const mates = ['整齐', '热闹', '安静', '紧张', '冰冷', '书包', '跑'].map(w);
  it('decoys only from the list, same length, never the answer (nor a near-synonym: 整齐)', () => {
    const f = proposeFit(w('干净'), mates, [], { text: '教室打扫得很＿。', source: 'parent' })!;
    expect(f.wrong).toHaveLength(3);
    for (const d of f.wrong) { expect(mates.map((m) => m.text)).toContain(d); expect([...d]).toHaveLength(2); expect(d).not.toBe('整齐'); }
  });
  it('confusables (a shared radical) come first; a look-alike (a shared character) is swapped out while a safe one is left', () => {
    const f = proposeFit(w('告诉'), ['帮助', '跑步', '告别'].concat('认识').map(w), [], { text: '妈妈＿我要早睡。', source: 'parent' })!;
    expect(f.wrong[0]).toBe('认识'); // 讠 shared with 诉
    expect(f.wrong).not.toContain('告别'); // 告 shared: parent ruling 2026-10-17
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

// Follow-up (coordinator, 2026-10-17): decoys the grammar can't give away, spread over the rows, and a tint where one may fit.
import { mightFit, proposeFits } from './fit';
describe('decoys the grammar cannot give away', () => {
  const list = ['整齐', '蝴蝶', '跑步', '热闹', '干净', '安静', '高兴', '公园', '草地', '帮助', '告诉'].map(w);
  it('an adjective blank gets adjective decoys, never a noun or a verb, nor its near-synonym 干净 (fix round)', () => {
    const f = proposeFit(w('整齐'), list, [], { text: '我的书桌很＿。', source: 'school' })!;
    expect(f.wrong.sort()).toEqual(['安静', '热闹', '高兴'].sort());
  });
  it('a verb blank gets verbs', () => {
    const f = proposeFit(w('告诉'), [...list, w('喜欢'), w('认识')], [], { text: '妈妈＿我要早睡。', source: 'school' })!;
    for (const d of f.wrong) expect(['帮助', '跑步', '喜欢', '认识']).toContain(d);
  });
  it('no row when too few words share its part of speech', () => {
    expect(proposeFit(w('整齐'), ['整齐', '蝴蝶', '跑步', '公园', '热闹'].map(w), [], { text: '我的书桌很＿。', source: 'school' })).toBeNull();
  });
  it('a reduplicated answer (闪闪亮) only gets decoys of its shape', () => {
    const f = proposeFit(w('闪闪亮'), ['闪闪亮', '红通通', '绿油油', '白花花', '整齐', '干净', '热闹'].map(w), [], { text: '星星＿的。', source: 'parent' });
    expect(f?.wrong.sort()).toEqual(['红通通', '绿油油', '白花花'].sort());
  });
});
describe('proposeFits: decoys spread over the rows', () => {
  it('no word is a decoy in more than 3 rows', () => {
    const words = ['整齐', '热闹', '干净', '安静', '蝴蝶', '跑步', '公园', '草地', '帮助', '告诉', '面包', '牛奶', '鸡蛋', '足球', '风筝'].map(w);
    const rows = proposeFits(words, []);
    const count = new Map<string, number>();
    for (const f of rows.values()) for (const d of f?.wrong ?? []) count.set(d, (count.get(d) ?? 0) + 1);
    expect([...rows.values()].filter(Boolean).length).toBeGreaterThan(5);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(3);
  });
});
describe('mightFit: a decoy that plausibly fits the blank', () => {
  it('names a same-kind decoy written after 很 elsewhere, for the parent to look at first', () => {
    expect(mightFit({ wordId: 'x', sentence: '我的书桌很＿。', source: 'school', wrong: ['干净', '热闹', '安静'] })).toContain('干净');
  });
  it('is empty when no decoy is seen in that spot', () => {
    expect(mightFit({ wordId: 'x', sentence: '我的书桌很＿。', source: 'school', wrong: ['蝴蝶', '面包', '足球'] })).toEqual([]);
  });
});
