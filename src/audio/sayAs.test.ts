import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import SAY_AS from './sayAs.json';

const { sayAs, poly } = SAY_AS as { sayAs: Record<string, string>; poly: Record<string, string> };
const taught = new Map(builtinWords(0).map((w) => [w.text, w.pinyin]));

describe('how a lone 多音字 is said (scripts/gen-say-as.ts)', () => {
  it('each stand-in is read exactly the way the card teaches, and is not a listed 多音字 itself', () => {
    for (const [ch, twin] of Object.entries(sayAs)) {
      expect(pinyin(twin), `${ch} → ${twin}`).toBe(poly[ch]);
      expect(poly[twin], `${twin} is a 多音字`).toBeUndefined();
    }
  });
  it('the readings are the ones the cards teach today', () => {
    for (const [ch, r] of Object.entries(poly)) expect(taught.get(ch), ch).toBe(r);
    expect(sayAs['调']).toBe('条');
  });
});
