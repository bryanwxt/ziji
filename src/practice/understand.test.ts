// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';
import { understandItem } from './understand';

const S: Record<string, { zh: string; en: string }[]> = {
  猫: [{ zh: '我家有一只猫。', en: 'We have a cat at home.' }, { zh: '猫在门口睡觉。', en: 'The cat sleeps by the door.' }],
  狗: [{ zh: '小狗跑得很快。', en: 'The puppy runs fast.' }, { zh: '我和狗一起玩。', en: 'I play with the dog.' }],
};
vi.mock('../content/understand', () => ({
  sentencesFor: (t: string) => S[t] ?? [],
  wordTerm: () => '一上',
  inScopeWords: () => Object.keys(S).map((t) => ({ text: t })),
}));

const cat = makeWord('猫', { meaning: 'cat' });

describe('the Understand question (plan 2b)', () => {
  it("the answer, the word's other sentence and another word's", () => {
    for (let seed = 1; seed < 20; seed++) {
      const item = understandItem(cat, mulberry32(seed))!;
      expect(item.choices).toHaveLength(3);
      expect(item.choices).toContain(item.en);
      const other = S['猫']!.find((s) => s.en !== item.en)!.en;
      expect(item.choices).toContain(other);
      expect(item.choices.some((c) => S['狗']!.some((s) => s.en === c))).toBe(true);
      expect(S['猫']!.some((s) => s.zh === item.zh && s.en === item.en)).toBe(true);
    }
  });
  it('choices are always distinct (Review Focus 4)', () => {
    const keep = S['狗']!;
    S['狗'] = [{ zh: '小狗跑得很快。', en: 'The cat sleeps by the door.' }, { zh: '我和狗一起玩。', en: 'We have a cat at home.' }];
    expect(understandItem(cat, mulberry32(3))).toBeNull(); // no third English that differs
    S['狗'] = keep;
  });
  it('a word with fewer than two sentences has no item', () => {
    expect(understandItem(makeWord('鱼', { meaning: 'fish' }), mulberry32(1))).toBeNull();
  });
});
