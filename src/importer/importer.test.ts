import { describe, expect, it } from 'vitest';
import { cleanLines } from './clean';
import { parseWorksheet } from './parse';
import { suggestFix } from './suggest';

const DICT = new Set(['欺负', '安静', '告诉', '认识', '保持', '整齐', '一模一样', '齐心协力', '知道', '答案', '容易', '门票']);
const isWord = (w: string) => DICT.has(w) || ([...w].length === 1 && w !== '坼'); // 坼 stands for a misread character the app doesn't know

// Shaped like Live Text on a worksheet: page furniture, headings, a word table read column by column, options, a passage.
const PAGE = [
  'P1-L07-AB-PG03', '二年级练习', '想一想', '第三十课', '一、复习（第1-8课）', '> 词语',
  '欺', '负', '安静', '告坼', '认识', '答', '案', '容易', '门票',
  '> 词语搭配', '保持 安静', '排得 整齐',
  '> 常用成语', '一模一样', '齐心协力',
  '三、字辨：选一选，填号码', '1 星期天，我____姐姐一起去公园。', '（1）狼 （2）很 （3）根 （4）跟',
  'jiē dào', '七、朗读训练',
  '小明和妹妹在公园里玩。他们看见一只小猫在树下睡觉，就',
  '轻轻地走过去，不想吵醒它。妹妹说：“小猫睡得真香！”小明',
  '点点头，拉着妹妹安静地走开了。',
  '©2026 Example Publisher Pte Ltd. All Rights Reserved 版权所有.',
].join('\n');

describe('cleanLines', () => {
  it('drops page furniture, instructions, exercise lines and pinyin, and tags each line with its section', () => {
    const lines = cleanLines(PAGE).map((l) => l.line);
    for (const junk of ['P1-L07-AB-PG03', '三、字辨：选一选，填号码', '（1）狼 （2）很 （3）根 （4）跟', 'jiē dào', '1 星期天，我____姐姐一起去公园。']) expect(lines).not.toContain(junk);
    expect(lines.some((l) => l.includes('©'))).toBe(false);
    expect(cleanLines(PAGE).find((l) => l.line === '保持 安静')?.section).toBe('pairs');
    expect(cleanLines(PAGE).find((l) => l.line === '一模一样')?.section).toBe('idioms');
  });
});

describe('parseWorksheet', () => {
  const d = parseWorksheet(PAGE, isWord, DICT);
  it('names the import from the lesson header', () => expect(d.title).toBe('第三十课'));
  it('rejoins characters split across table cells into known words', () => {
    expect(d.words.map((w) => w.text)).toEqual(expect.arrayContaining(['欺负', '答案', '安静', '认识', '容易', '门票']));
    expect(d.words.map((w) => w.text)).not.toContain('欺');
  });
  it('flags an unknown word with a likely fix', () => {
    expect(d.words.find((w) => w.text === '告坼')).toEqual({ text: '告坼', known: false, suggestion: '告诉' });
  });
  it('keeps pairings and 成语 apart from plain words', () => {
    expect(d.pairs).toEqual([['保持', '安静'], ['排得', '整齐']]);
    expect(d.idioms.map((w) => w.text)).toEqual(['一模一样', '齐心协力']);
  });
  it('rebuilds a passage that was wrapped mid-sentence', () => {
    expect(d.passages).toHaveLength(1);
    expect(d.passages[0]).toMatch(/^小明和妹妹在公园里玩。.*安静地走开了。$/);
    expect(d.passages[0]).not.toContain('\n');
  });
  it('turns a lone short sentence into a sentence, not a passage', () => {
    const one = parseWorksheet('> 重点句\n从下个星期一开始，我们要早点上学。', isWord, DICT);
    expect(one.sentences).toEqual(['从下个星期一开始，我们要早点上学。']);
    expect(one.passages).toEqual([]);
  });
});

describe('suggestFix', () => {
  it('prefers a dictionary word that differs by one character', () => {
    expect(suggestFix('告坼', DICT)).toBe('告诉');
    expect(suggestFix('完全不像', DICT)).toBeUndefined();
  });
});

describe('real-page shapes', () => {
  it('a 成语 heading only claims four-character words; the rest of the table stays words', () => {
    const d = parseWorksheet('> 常用成语\n齐心协力\n总是\n奇怪', isWord, DICT);
    expect(d.idioms.map((w) => w.text)).toEqual(['齐心协力']);
    expect(d.words.map((w) => w.text)).toEqual(['总是', '奇怪']);
  });
  it('a phrase made of known characters (一句, 两遍) is not flagged; a misread character still is', () => {
    const known = (w: string) => DICT.has(w) || ([...w].length === 1 && '一句两遍告'.includes(w)); // 坼 is not a character the app knows
    const d = parseWorksheet('> 词语\n一句\n两遍\n告坼', known, DICT);
    expect(d.words.filter((w) => !w.known).map((w) => w.text)).toEqual(['告坼']);
  });
  it('drops numbered and parent instructions (①先上网…, …读给家长听, 完成…)', () => {
    const d = parseWorksheet(['> 朗读训练', '小朋友，请先听老师读，然后', '读给家长听。', '①先上网听一遍。', '④完成练习。', '巩固今天学的。'].join('\n'), isWord, DICT);
    expect(d.sentences).toEqual([]);
    expect(d.passages).toEqual([]);
  });
  it('a passage of several paragraphs stays one passage', () => {
    const d = parseWorksheet(['> 朗读训练', '小明在排队买票，', '一个人插到了前面。', '小明很生气。哥哥拉住他，', '说：“我们去告诉他吧。”他们走过去，', '有礼貌地说明了情况。'].join('\n'), isWord, DICT);
    expect(d.passages).toHaveLength(1);
    expect(d.sentences).toEqual([]);
  });
  it('a two-character line with a colon is a word, not a sentence', () => {
    const d = parseWorksheet('> 词语\n街：\n道', isWord, DICT);
    expect(d.sentences).toEqual([]);
  });
  it('a four-character phrase outside a 成语 section that the dictionary does not know (一排排的) stays a word', () => {
    const d = parseWorksheet('> 量词搭配\n一排排的\n> 词语\n一模一样', isWord, DICT);
    expect(d.words.map((w) => w.text)).toContain('一排排的');
    expect(d.idioms.map((w) => w.text)).toEqual(['一模一样']);
  });
});

describe('review fixes: words are never lost or invented', () => {
  const HSK = new Set([...DICT, '名字', '完成', '家长', '句子', '复习', '阅读', '词语', '大小', '上下', '自己', '认识', '街道', '动物园']);
  const isHsk = (w: string) => HSK.has(w) || [...w].length === 1;
  it('a word that looks like a heading or an instruction (名字, 完成, 家长, 句子) stays a word', () => {
    const d = parseWorksheet('> 词语\n名字\n完成\n家长\n句子\n安静', isHsk, HSK);
    expect(d.words.map((w) => w.text)).toEqual(['名字', '完成', '家长', '句子', '安静']);
  });
  it('a marked heading still sets the section', () => {
    const d = parseWorksheet('一、复习\n安静\n> 成语\n一模一样', isHsk, HSK);
    expect(d.words.map((w) => w.text)).toEqual(['安静']);
    expect(d.idioms.map((w) => w.text)).toEqual(['一模一样']);
  });
  it('a passage line mentioning 小朋友 or 家长 stays in the passage', () => {
    const d = parseWorksheet(['> 朗读训练', '公园里很热闹。大人在散步，孩子在玩，', '小朋友们在草地上踢球，老人在下棋。', '家长们坐在树下聊天。'].join('\n'), isHsk, HSK);
    expect(d.passages).toEqual(['公园里很热闹。大人在散步，孩子在玩，小朋友们在草地上踢球，老人在下棋。家长们坐在树下聊天。']);
  });
  it('a short wrapped line with no punctuation continues the sentence it belongs to', () => {
    const d = parseWorksheet(['> 朗读训练', '今天是星期天，爸爸带我', '去动物园', '看大象。大象的鼻子很长。它用鼻子喝水。'].join('\n'), isHsk, HSK);
    expect(d.passages).toEqual(['今天是星期天，爸爸带我去动物园看大象。大象的鼻子很长。它用鼻子喝水。']);
    expect(d.words).toEqual([]);
  });
  it('a misread that is still a real character (自已, 认织) is flagged with the look-alike fix', () => {
    const alike = (a: string, b: string) => (a === '已' && b === '己') || (a === '织' && b === '识');
    const d = parseWorksheet('> 词语\n自已\n认织\n一句', isHsk, HSK, alike);
    expect(d.words.find((w) => w.text === '自已')).toEqual({ text: '自已', known: false, suggestion: '自己' });
    expect(d.words.find((w) => w.text === '认织')).toEqual({ text: '认织', known: false, suggestion: '认识' });
    expect(d.words.find((w) => w.text === '一句')).toEqual({ text: '一句', known: true }); // no look-alike word: a phrase of known characters
  });
  it('a 生字 column of single characters is never joined into words (大/小 stay apart)', () => {
    const d = parseWorksheet('> 生字\n大\n小\n上\n下', isHsk, HSK);
    expect(d.words.map((w) => w.text)).toEqual(['大', '小', '上', '下']);
  });
  it('a joined word remembers its parts so the preview can split it', () => {
    const d = parseWorksheet('> 词语\n欺\n负', isHsk, HSK);
    expect(d.words).toEqual([{ text: '欺负', known: true, parts: ['欺', '负'] }]);
  });
  it('a word with a trailing colon (街道：) is kept without it', () => {
    const d = parseWorksheet('> 词语\n街道：\n安静:', isHsk, HSK);
    expect(d.words.map((w) => w.text)).toEqual(['街道', '安静']);
  });
});
