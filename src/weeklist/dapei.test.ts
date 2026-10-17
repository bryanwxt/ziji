// src/weeklist/dapei.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BLOCKED } from '../content/blocked';
import { proposeWrong } from './dapei';

const pairs = [
  { left: '煎', right: '鸡蛋', group: '厨房' }, { left: '炒', right: '青菜', group: '厨房' },
  { left: '摘', right: '苹果', group: '果园' }, { left: '拍', right: '皮球', group: '操场' }, { left: '放', right: '风筝', group: '操场' },
];
describe('proposeWrong (spec §7.4)', () => {
  it('never a same-family object (炒 would fit 鸡蛋), prefers another group', () => {
    const w = proposeWrong(pairs[1]!, pairs);
    expect(w).not.toContain('鸡蛋');
    expect(w).not.toContain('青菜');
    expect(w).toHaveLength(3);
    expect(w[0]).not.toBe(undefined);
  });
  it('never a DAPEI or HSK pairing and never blocked', () => {
    const w = proposeWrong({ left: '吃', right: '饭' }, [{ left: '吃', right: '饭' }, { left: '喝', right: '水果' }]);
    expect(w).not.toContain('水果'); // 吃水果 is in DAPEI
    for (const x of w) expect(BLOCKED.has(x)).toBe(false);
  });
  it('fills from DAPEI nouns when the list is short', () => {
    expect(proposeWrong(pairs[0]!, pairs.slice(0, 2))).toHaveLength(3);
  });
});
