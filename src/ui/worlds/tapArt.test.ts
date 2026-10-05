import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER } from '../../fun/finds';
import { ANIMAL_FACES, BABY_DINO, GEM } from './tapArt';

describe('tap art', () => {
  it('an ink face for each zodiac animal', () => {
    for (const a of ZODIAC_ORDER) {
      const s = ANIMAL_FACES[a]!;
      expect(s.length, a).toBeGreaterThan(200);
      expect(s).toContain('#2a2630');
      expect(s).not.toMatch(/Gradient|<filter|url\(#|NaN|undefined/);
    }
  });
  it('gem, baby dino and spray', () => {
    for (const s of [GEM, BABY_DINO]) {
      expect(s.length).toBeGreaterThan(80);
      expect(s).not.toMatch(/NaN|undefined/);
    }
  });
});
