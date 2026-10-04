import { describe, expect, it } from 'vitest';
import { lookAlike } from './alike';

describe('lookAlike (a misread a reader could make)', () => {
  it('shares a part or a radical (织/识, 已/己), or sounds the same (遍/边)', () => {
    expect(lookAlike('织', '识')).toBe(true);
    expect(lookAlike('已', '己')).toBe(true);
    expect(lookAlike('遍', '边')).toBe(true);
  });
  it('unrelated characters are not alike (大/小, 安/书)', () => {
    expect(lookAlike('大', '小')).toBe(false);
    expect(lookAlike('安', '书')).toBe(false);
  });
});
