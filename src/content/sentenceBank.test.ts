import { describe, expect, it } from 'vitest';
import { BANK_1 } from './bank/hsk1';
import { BANK_2 } from './bank/hsk2';
import { BANK_3 } from './bank/hsk3';
import { checkBankItem } from './bankCheck';
import { bankFor, fillGap, SENTENCE_BANK, type BankItem } from './sentenceBank';

const GOOD: BankItem = {
  word: '很', type: 'adv',
  gaps: [{ text: '今天＿热。', wrong: ['在', '和', '跟'] }, { text: '这个书包＿大。', wrong: ['和', '在', '给'] }],
  misuse: '我很一个书包。',
};

describe('checkBankItem', () => {
  it('passes a well-formed item', () => expect(checkBankItem(GOOD)).toEqual([]));
  it('catches a missing blank, a repeated or wrong-length choice, and a misuse without the word', () => {
    const bad: BankItem = { ...GOOD, gaps: [{ text: '今天很热。', wrong: ['在', '在', '我们'] }, GOOD.gaps[1]], misuse: '我吃一个书包。' };
    const p = checkBankItem(bad).join('\n');
    expect(p).toMatch(/exactly one ＿/);
    expect(p).toMatch(/3 different wrong choices/);
    expect(p).toMatch(/我们 is not 1 characters/);
    expect(p).toMatch(/misuse: must use the word exactly once/);
  });
  it('catches a character more than one HSK level above the word', () => {
    expect(checkBankItem({ ...GOOD, misuse: '我很赞赏一个书包。' }).join('\n')).toMatch(/赞 is HSK/);
  });
  it('catches a sentence too long for a phone', () => {
    expect(checkBankItem({ ...GOOD, misuse: `我很${'大'.repeat(30)}。` }).join('\n')).toMatch(/longer than 30/);
  });
});

describe('the sentence bank', () => {
  it('every item passes the check', () => expect(SENTENCE_BANK.flatMap(checkBankItem)).toEqual([]));
  it('no word and no sentence appears twice', () => {
    const words = SENTENCE_BANK.map((i) => i.word);
    expect(new Set(words).size).toBe(words.length);
    const sentences = SENTENCE_BANK.flatMap((i) => [...i.gaps.map((g) => fillGap(g, i.word)), i.misuse]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });
  it('HSK 1 covers its 103 words', () => expect(BANK_1).toHaveLength(103));
  it('HSK 2 covers its 86 words', () => expect(BANK_2).toHaveLength(86));
  it('HSK 3–4 cover their 77 words, and the bank holds about 250 words', () => {
    expect(BANK_3).toHaveLength(77);
    expect(SENTENCE_BANK.length).toBeGreaterThanOrEqual(240);
  });
  it('looks items up by word', () => expect(bankFor('很')?.word).toBe('很'));
});

describe('wrong choices that would be right (review of plan 13)', () => {
  // [word, gap sentence, a choice that also makes a good sentence there]
  const RIGHT_TOO: [string, string, string][] = [
    ['说', '请你＿慢一点。', '吃'], ['玩', '下课了，我们去外面＿。', '读'], ['让', '老师＿我们读课文。', '给'], ['让', '妈妈＿我早点睡觉。', '给'],
    ['安静', '请大家＿一点。', '热情'], ['经常', '我＿去图书馆看书。', '刚才'], ['经常', '他＿帮助别人。', '马上'], ['竟然', '我没想到，他＿来了。', '按时'],
    ['坐', '请＿下。', '写'], ['环境', '我们要保护＿。', '机器'], ['一会儿', '请等＿。', '星期天'], ['所以', '他病了，＿没来上学。', '而且'],
    // from a second read of the bank
    ['喝', '爷爷天天＿茶。', '吃'], ['已经', '我＿做完作业了。', '马上'], ['关心', '妈妈很＿我。', '放心'], ['应该', '我们＿帮助别人。', '刚才'],
    ['可能', '他今天没来，＿病了。', '忽然'], ['必须', '你＿九点前回家。', '一般'], ['终于', '我＿写完作业了。', '本来'],
    ['果然', '老师说他会来，他＿来了。', '其实'], ['担心', '下雨了，妈妈很＿我。', '放心'],
  ];
  it.each(RIGHT_TOO)('%s: %s never offers %s', (word, text, right) => {
    const gap = bankFor(word)!.gaps.find((g) => g.text === text);
    expect(gap?.wrong ?? []).not.toContain(right);
  });
  it('wrong-use sentences are clearly wrong, not just casual speech', () => {
    for (const s of ['这本书很喜欢我。', '你能来帮助吗？', '你喝茶或者喝水？', '我记住了很高兴。']) expect(SENTENCE_BANK.map((i) => i.misuse)).not.toContain(s);
  });
});
