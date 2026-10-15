import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { answeringSentence, readLimitMs, splitSentences } from './sentences';

describe('splitSentences (spec 2026-10-12 §3)', () => {
  it('splits at 。！？ only: commas and 、 never split', () => {
    expect(splitSentences('我家有五个人：爸爸、妈妈、哥哥、妹妹和我。爸爸是医生，妈妈是老师。我很爱我的家。')).toEqual(['我家有五个人：爸爸、妈妈、哥哥、妹妹和我。', '爸爸是医生，妈妈是老师。', '我很爱我的家。']);
    expect(splitSentences('我爱爸爸，我爱妈妈。')).toEqual(['我爱爸爸，我爱妈妈。']);
  });
  it('a quotation stays whole, its closing quote with it; ？！ splits once', () => {
    expect(splitSentences('妈妈说：“快一点，不然就晚了！”我坐车去学校。')).toEqual(['妈妈说：“快一点，不然就晚了！”', '我坐车去学校。']);
    expect(splitSentences('我说：“谢谢爷爷！谢谢奶奶！”大家都很高兴。')).toEqual(['我说：“谢谢爷爷！谢谢奶奶！”', '大家都很高兴。']);
    expect(splitSentences('真的吗？！对。')).toEqual(['真的吗？！', '对。']);
  });
  it('a parent "/" ends a sentence-length unit (6+ characters), else it is dropped', () => {
    expect(splitSentences('今天天气很好 / 我们去公园玩。')).toEqual(['今天天气很好', '我们去公园玩。']);
    expect(splitSentences('我们一家 / 坐在一起吃饭。')).toEqual(['我们一家坐在一起吃饭。']);
    expect(splitSentences('我的学校很大 / 有很多树。')).toEqual(['我的学校很大', '有很多树。']);
  });
  it('text after the last 。 is a sentence; blank text has none', () => {
    expect(splitSentences('我爱妈妈。没有句号')).toEqual(['我爱妈妈。', '没有句号']);
    expect(splitSentences('  ')).toEqual([]);
  });
  it('unpaired quotes never hold the rest of the text together', () => {
    expect(splitSentences('妈妈说：“快一点。我坐车去学校。我到了。')).toEqual(['妈妈说：“快一点。', '我坐车去学校。', '我到了。']);
    expect(splitSentences('他说"好的。"我们走吧。')).toEqual(['他说"好的。', '"我们走吧。']);
  });
  it('the built-in passages split into 3–5 sentences', () => {
    const counts = Object.fromEntries(PASSAGES.map((p) => [p.id, splitSentences(p.text).length]));
    expect(counts).toEqual({ p01: 3, p02: 4, p03: 3, p04: 4, p05: 4, p06: 4, p07: 4, p08: 4, p09: 4, p10: 4, p11: 5, p12: 4, p13: 4, p14: 4, p15: 4, p16: 4, p17: 3, p18: 4, p19: 4, p20: 4 });
  });
});

describe('answeringSentence', () => {
  const s = splitSentences('我爱爸爸。我爱妈妈。');
  it('a built-in question names its sentence', () => {
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1, sentence: 0 }, s)).toBe(0);
  });
  it('a parent question is answered by the first sentence holding the right choice, else none', () => {
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1 }, s)).toBe(1);
    expect(answeringSentence({ choices: ['老师', '外婆', '小马'], answer: 1 }, s)).toBe(-1);
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1, sentence: 9 }, s)).toBe(1); // out of range: found instead
  });
});

describe('readLimitMs (spec 2026-10-15 §8)', () => {
  it('a minute at least; 0.8 s a character for a long passage', () => {
    expect(readLimitMs('我爱妈妈。'.repeat(10))).toBe(60_000);
    expect(readLimitMs('我'.repeat(110))).toBe(88_000);
  });
});
