import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/random';
import { makeWord } from '../../test/fixtures';
import { meaningChoices } from './distractors';

const firstSense = (m: string) => m.split(/[;,]/)[0]!.trim().toLowerCase();
// the parent's words carry their own meaning (cardMeaning), so the test controls every English choice
const w = (text: string, meaning: string) => makeWord(text, { meaning, source: 'parent' });

describe('meaning choices (the Hear rung)', () => {
  const target = w('看', 'to look; to see');
  const pool = [target, w('瞧', 'to look'), w('大', 'big'), w('小', 'small'), w('门', 'door'), w('水', 'water'), w('火', 'fire')];
  it("the answer and three others, no two alike, none sharing the answer's first sense", () => {
    for (let seed = 1; seed < 20; seed++) {
      const c = meaningChoices(target, pool, mulberry32(seed))!;
      expect(c).toHaveLength(4);
      expect(c).toContain('to look'); // the first sense only: a P2 child reads one meaning, not a dictionary entry
      expect(new Set(c.map(firstSense)).size).toBe(4);
      expect(c.filter((x) => firstSense(x) === 'to look')).toHaveLength(1);
    }
  });
  it('each choice is one short sense', () => {
    expect(meaningChoices(w('后天', 'the day after tomorrow; life after birth'), [w('后天', 'the day after tomorrow; life after birth'), ...pool], mulberry32(3))).toContain('the day after tomorrow');
  });
  it('null when there are not three other meanings to choose from', () => {
    expect(meaningChoices(target, [target, w('大', 'big')], mulberry32(1))).toBeNull();
  });
});
