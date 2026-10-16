// A board tile is that character, never the word it is taught in (parent 2026-10-16: 连一连's 阳 was said 太阳).
import { describe, expect, it } from 'vitest';
import { boundPair } from '../content/kidGloss';
import { loneSpoken } from './speech';

describe('a tile says its own character', () => {
  it('阳 on a board is 阳; on its card it is still said as 太阳', () => {
    expect(boundPair('阳')).toBe('太阳');
    expect(loneSpoken('阳')).toBe('太阳');
    expect(loneSpoken('阳', undefined, [], [], { alone: true })).toBe('阳');
  });
  it('an unsure character keeps its word even as a tile (爪 is never said zhǎo)', () => {
    expect(loneSpoken('切', 'qiē', [], [], { alone: true })).not.toBe('切');
  });
});
