import { describe, expect, it } from 'vitest';
import { SENTENCE_BANK } from './sentenceBank';
import { sentenceExample, sentencePattern } from './sentencePattern';

describe('说一句 patterns (production practice spec §4)', () => {
  it('the model is the bank\'s first sentence with the word in it; none for a word the bank lacks', () => {
    expect(sentenceExample('很')).toBe('今天很热。');
    expect(sentenceExample('保持')).toBe('图书馆里要保持安静。');
    expect(sentenceExample('门')).toBeNull();
  });
  it('the word kept, the rest blanked to a short frame', () => {
    expect(sentencePattern('我们周末计划去公园。', '计划')).toBe('我们…计划…');
    expect(sentencePattern('今天很热。', '很')).toBe('今天很…'); // two characters before it stay
    expect(sentencePattern('哥哥比我高。', '高')).toBe('哥哥…高'); // nothing after it but the 。
    expect(sentencePattern('我天天七点起床。', '起床')).toBe('我…起床'); // 我天 is no word: its first character
    expect(sentencePattern('看到老师来了，他连忙站起来。', '连忙')).toBe('看到…连忙…');
    expect(sentencePattern('计划好了。', '计划')).toBe('计划…');
    expect(sentencePattern('今天很热。', '门')).toBe('门');
  });
  it('every bank word has a frame that holds the word and is short', () => {
    for (const b of SENTENCE_BANK) {
      const frame = sentencePattern(sentenceExample(b.word)!, b.word);
      expect(frame).toContain(b.word);
      expect(Array.from(frame).length).toBeLessThanOrEqual(Array.from(b.word).length + 5);
    }
  });
});
