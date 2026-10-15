import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { passageFit, passageTerm, stripNames, termIndex } from './level';

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

describe('passageTerm (spec 2026-10-15 §3: the earliest term with ≥ 90% read)', () => {
  it("levels by his book's cumulative 识读字, names left out", () => {
    expect(passageTerm('我爸爸，我妈妈。')).toBe('一上');
    expect(passageTerm('我爱风筝。')).toBe('二下'); // 筝 is first read in 二下: 3 of 4 by 二上
    expect(passageTerm('我爱我爱我爱我爱风筝。')).toBe('一下'); // 9 of 10 by 一下, where 爱 is first read
    expect(passageTerm('我爱我爱我爱我风筝。')).toBe('二下'); // 8 of 9 (89%) by 一下: not enough
    expect(passageTerm('安迪斯瓦喜欢踢足球。')).toBeNull();
    expect(passageTerm('安迪斯瓦喜欢踢足球。', ['安迪斯瓦'])).toBe('二下'); // 踢 is 二下
    expect(passageTerm('魑魅魍魉。')).toBeNull();
    expect(termIndex('二下')).toBe(3);
  });
  it('every own passage carries the term the leveller gives it', () => {
    expect(PASSAGES.filter((p) => p.source === 'ziji').filter((p) => p.term !== passageTerm(p.text, p.names)).map((p) => p.id)).toEqual([]);
  });
});
