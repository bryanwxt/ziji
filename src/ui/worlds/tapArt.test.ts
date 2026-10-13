import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER } from '../../fun/finds';
import { LINE } from '../cel';
import { ANIMAL_FACES } from './tapArt';

describe('the zodiac faces from the paper boat', () => {
  it('a light-cel face for each zodiac animal: the soft-violet line, never the old ink', () => {
    for (const a of ZODIAC_ORDER) {
      const s = ANIMAL_FACES[a]!;
      expect(s.length, a).toBeGreaterThan(200);
      expect(s).toContain(LINE);
      expect(s).not.toContain('#2a2630');
      expect(s).not.toMatch(/Gradient|<filter|url\(#|clip-path|NaN|undefined/);
    }
  });
});
