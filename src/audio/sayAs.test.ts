import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import SAY_AS from './sayAs.json';

const { sayAs, poly } = SAY_AS as { sayAs: Record<string, string>; poly: Record<string, string> };
const taught = new Map(builtinWords(0).map((w) => [w.text, w.pinyin]));

describe('how a lone 多音字 is said (scripts/gen-say-as.ts)', () => {
  it('each stand-in is read exactly the way the card teaches, and a steered stand-in is one taught at its own everyday reading', () => {
    for (const [ch, twin] of Object.entries(sayAs)) {
      expect(pinyin(twin), `${ch} → ${twin}`).toBe(poly[ch]);
      if (twin in poly) expect(poly[twin], `${twin} is taught another way`).toBe(pinyin(twin)); // 条 tiáo stands in for 调 and itself
    }
  });
  it('爪 is steered, never its own stand-in, and on the spot-listen list (content audit 2026-10-15: the voice said zhǎo)', () => {
    const { plain, unsure } = SAY_AS as { plain: Record<string, string>; unsure: string[] };
    expect(poly['爪']).toBe('zhuǎ');
    expect(sayAs['爪']).toBeUndefined(); // nothing else is read zhuǎ
    expect(plain['zhuǎ']).toBeUndefined();
    expect(unsure).toContain('爪');
  });
  it('the readings are the ones the cards teach today', () => {
    for (const [ch, r] of Object.entries(poly)) expect(taught.get(ch), ch).toBe(r);
    expect(sayAs['调']).toBe('条');
  });
});
