// @vitest-environment node
// 选词填空 can't be won without reading (fix round 2026-10-17): every decoy the answer's length, the blank a fixed width, never a
// near-synonym of the answer, and look-alike or same-family decoys flagged for the parent.
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';
import { BLANK_WIDTH, fitDoubts, fitStillGood, fitUseItem, proposeFit, proposeFits, sameFamily } from './fit';

const w = (t: string) => makeWord(t, { id: `p:${t}`, source: 'parent', pinyin: 'x' });

describe('length', () => {
  it('a 2-character answer never gets a 1- or 3-character decoy: no row rather than one', () => {
    const mates = ['热闹', '快', '亮晶晶', '高兴', '慢'].map(w); // two adjectives of its length only
    expect(proposeFit(w('整齐'), mates, [], { text: '同学们站得很＿。', source: 'parent' })).toBeNull();
    const f = proposeFit(w('整齐'), [...mates, w('紧张')], [], { text: '同学们站得很＿。', source: 'parent' })!;
    for (const d of f.wrong) expect(Array.from(d)).toHaveLength(2);
  });
  it('proposeFits keeps every row to its answer length', () => {
    const rows = proposeFits(['整齐', '热闹', '安静', '紧张', '快', '慢', '亮晶晶', '绿油油', '胖乎乎', '毛茸茸'].map(w), []);
    for (const [t, f] of rows) for (const d of f?.wrong ?? []) expect(Array.from(d).length, `${t} ← ${d}`).toBe(Array.from(t).length);
  });
  it('a stored row with a decoy of another length is not asked', () => {
    const on = new Set(['整齐', '热闹', '安静', '快']);
    expect(fitStillGood({ wordId: 'p:整齐', sentence: '同学们站得很＿。', source: 'parent', wrong: ['热闹', '安静', '快'] }, '整齐', on)).toBe(false);
  });
  it('the blank is a fixed width, whatever the answer\'s length', () => {
    const fit = { wordId: 'p:快', sentence: '他跑得很＿。', source: 'parent' as const, wrong: ['慢', '高', '远'] as [string, string, string] };
    expect((fitUseItem(fit, w('快'), mulberry32(1)) as { blankWidth?: number }).blankWidth).toBe(BLANK_WIDTH);
    expect((fitUseItem({ ...fit, wordId: 'p:亮晶晶', wrong: ['绿油油', '胖乎乎', '毛茸茸'] }, w('亮晶晶'), mulberry32(1)) as { blankWidth?: number }).blankWidth).toBe(BLANK_WIDTH);
  });
});

describe('near-synonyms never decoy each other', () => {
  it('families: grab, seasons, feelings', () => {
    expect(sameFamily('抓', '捉')).toBe(true);
    expect(sameFamily('秋天', '春天')).toBe(true);
    expect(sameFamily('高兴', '安静')).toBe(true);
    expect(sameFamily('高兴', '书包')).toBe(false);
  });
  it('抓 never gets 捉 or 抢; 秋天 never 春天; 高兴 never 安静', () => {
    const verbs = ['捉', '抢', '拿', '跳', '唱', '写', '画'].map(w);
    expect(proposeFit(w('抓'), verbs, [{ left: '抓', right: '蝴蝶' }, ...['跳', '唱', '写', '画', '捉', '抢', '拿'].map((v) => ({ left: v, right: '书' }))], { text: '小猫想＿蝴蝶。', source: 'parent' })?.wrong ?? []).not.toEqual(expect.arrayContaining(['捉']));
    const seasons = proposeFit(w('秋天'), ['春天', '夏天', '冬天', '早上', '公园', '书包', '草地'].map(w), [], { text: '＿到了，树叶黄了。', source: 'parent' });
    for (const d of seasons?.wrong ?? []) expect(['春天', '夏天', '冬天']).not.toContain(d);
    const moods = proposeFit(w('高兴'), ['安静', '开心', '整齐', '干净', '热闹', '紧张'].map(w), [], { text: '今天我很＿。', source: 'parent' });
    for (const d of moods?.wrong ?? []) expect(['安静', '开心']).not.toContain(d);
  });
});

describe('fitDoubts: decoys the parent must look at', () => {
  it('look-alikes (a shared character or radical) and same-family decoys are flagged', () => {
    expect(fitDoubts({ wordId: 'p:告诉', sentence: '妈妈＿我要早睡。', source: 'parent', wrong: ['告别', '帮助', '跑步'] }, '告诉')).toContain('告别');
    expect(fitDoubts({ wordId: 'b:抓', sentence: '小猫想＿蝴蝶。', source: 'parent', wrong: ['捉', '跳', '唱'] }, '抓')).toEqual(['捉']);
    expect(fitDoubts({ wordId: 'p:草地', sentence: '我们在＿上玩。', source: 'parent', wrong: ['面包', '牛奶', '鸡蛋'] }, '草地')).toEqual([]);
  });
});
