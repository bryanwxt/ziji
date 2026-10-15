import { describe, expect, it } from 'vitest';
import { passageFit, stripNames } from './level';

describe('passageFit (spec 2026-10-15 §3)', () => {
  it('the share of character tokens he can read, punctuation ignored', () => {
    expect(passageFit('我爱爸爸，我爱妈妈。', new Set(['我', '爱', '爸']))).toBeCloseTo(6 / 8);
  });
  it('names never count, for or against', () => {
    expect(stripNames('卡莱七岁。卡莱很高。', ['卡莱'])).toBe('七岁。很高。');
    expect(passageFit('卡莱七岁。卡莱很高。', new Set(['七', '岁', '很', '高']), ['卡莱'])).toBe(1);
  });
  it('no Han characters: 0', () => {
    expect(passageFit('…', new Set(['我']))).toBe(0);
  });
});
