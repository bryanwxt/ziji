// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildGlossary, cleanGloss, parseCedict, plainSyllables } from './glossary-lib';

const SAMPLE = [
  '# CC-CEDICT',
  '大人 大人 [Da4 ren2] /surname Daren/',
  '大人 大人 [da4 ren5] /adult; grownup; title of respect toward superiors/',
  '一半 一半 [yi1 ban4] /half/',
  '病人 病人 [bing4 ren2] /sick person; patient; invalid/CL:個|个[ge4]/',
  '傢伙 家伙 [jia1 huo5] /variant of 家伙[jia1 huo5]/',
  '男孩 男孩 [nan2 hai2] /boy/',
  '男 男 [nan2] /(bound form) male/',
  '吧 吧 [ba1] /bar (serving drinks, providing internet access etc)/to puff (on a pipe etc)/',
  '吧 吧 [ba5] /(modal particle indicating suggestion or surmise)/',
  '男孩兒 男孩儿 [nan2 hai2 r5] /erhua variant of 男孩[nan2 hai2]/',
].join('\n');

describe('glossary from CC-CEDICT', () => {
  it('reads entries by their simplified form', () => {
    const d = parseCedict(SAMPLE);
    expect(d.get('大人')).toHaveLength(2);
    expect(d.get('家伙')![0]!.senses).toEqual(['variant of 家伙[jia1 huo5]']);
  });
  it('matches readings with or without tone marks', () => {
    expect(plainSyllables('dà rén')).toBe(plainSyllables('da4 ren5'));
    expect(plainSyllables('lǜ sè')).toBe(plainSyllables('lu:4 se4'));
  });
  it('keeps the first everyday senses and drops classifiers, variants and surnames', () => {
    expect(cleanGloss(['sick person; patient; invalid', 'CL:個|个[ge4]'])).toBe('sick person; patient; invalid');
    expect(cleanGloss(['half', 'semi-'])).toBe('half; semi-');
    expect(cleanGloss(['smiling face', 'smiley :) ☺'])).toBe('smiling face'); // no emoji or emoticons on a child screen
    expect(cleanGloss(['(third-person singular) (since the early 20th century, usu. male) he; him; his', '(bound form) other'])).toBe('he; him; his');
    expect(cleanGloss(['(prefix indicating ordinal number, as in 第六[di4 liu4] "sixth")', '(literary) but'])).toBe('prefix indicating ordinal number');
    expect(cleanGloss(['although; even though (often used correlatively with 可是[ke3 shi4] or 但是[dan4 shi4] etc)'])).toBe('although; even though');
    expect(cleanGloss(['(idiom) all directions; all around'])).toBe('all directions; all around');
    expect(cleanGloss(["Beijing municipality, capital of the People's Republic of China (short name 京[Jing1])"])).toBe('Beijing municipality, capital of the…');
    expect(cleanGloss(['variant of 家伙[jia1 huo5]'])).toBeNull();
    expect(cleanGloss(['a very long first sense that keeps going on and on past the limit'])!.length).toBeLessThanOrEqual(40);
  });
  it('picks the entry with the word’s own reading, not a surname', () => {
    const { glossary, missing } = buildGlossary([{ text: '大人', pinyin: 'dà ren' }, { text: '一半', pinyin: 'yí bàn' }, { text: '家伙', pinyin: 'jiā huo' }], parseCedict(SAMPLE));
    expect(glossary['大人']).toBe('adult; grownup'); // whole meanings only
    expect(glossary['一半']).toBe('half');
    expect(missing).toEqual(['家伙']);
  });
  it('a character that is only a bound form still gets its sense (男 → male)', () => {
    expect(buildGlossary([{ text: '男', pinyin: 'nán' }], parseCedict(SAMPLE)).glossary['男']).toBe('male');
  });
  it('the exact tone wins over the same letters (吧 ba, the particle, not ba1 "bar")', () => {
    expect(buildGlossary([{ text: '吧', pinyin: 'ba' }], parseCedict(SAMPLE)).glossary['吧']).toMatch(/^modal particle/);
  });
  it('a 儿 form takes the gloss of its word without 儿 (男孩儿 → boy)', () => {
    expect(buildGlossary([{ text: '男孩儿', pinyin: 'nán háir' }], parseCedict(SAMPLE)).glossary['男孩儿']).toBe('boy');
  });
});

describe('the CC-CEDICT headword list (weekly list, unknown-word gap)', () => {
  it('keeps simplified Han headwords of 2–4 characters, once each, sorted; the date from the header', async () => {
    const { cedictWords } = await import('./glossary-lib');
    const out = cedictWords(['#! date=2026-10-01T00:00:00Z', SAMPLE, '蝴蝶 蝴蝶 [hu2 die2] /butterfly/', '一路平安無事 一路平安无事 [x] /x/', 'A貨 A货 [A huo4] /fake/'].join('\n'));
    expect(out.date).toBe('2026-10-01');
    expect(out.words).toEqual(['一半', '大人', '家伙', '男孩', '男孩儿', '病人', '蝴蝶'].sort());
  });
});

describe('the CC-CEDICT gloss list (weekly list: English for a word the parent left blank)', () => {
  const LINES = [
    '#! date=2026-10-16T00:00:00Z',
    '共用 共用 [gong4 yong4] /to share the use of; to have joint use of/communal (bathroom)/',
    '以後 以后 [yi3 hou4] /after/later/',
    '王府 王府 [Wang2 fu3] /surname Wangfu/',
    '王府 王府 [wang2 fu3] /prince\'s mansion/',
    '傢伙 家伙 [jia1 huo5] /variant of 家伙[jia1 huo5]/',
    '家伙 家伙 [jia1 huo5] /household dish, implement or furniture/domestic animal/',
    '本子 本子 [ben3 zi5] /CL:本[ben3]/book; notebook/',
    '长篇大论 长篇大论 [chang2 pian1 da4 lun4] /lengthy speech or article that goes on and on and on/',
    '病人 病人 [bing4 ren2] /sick person; patient/',
    '蝶變 蝶变 [die2 bian4] /(fig.) to metamorphose/',
    '結出 结出 [jie1 chu1] /to bear (fruit)/',
    '北京 北京 [Bei3 jing1] /Beijing, capital of the People\'s Republic of China/',
    '蝴 蝴 [hu2] /used in 蝴蝶/',
    '一路平安無事 一路平安无事 [x] /x/',
    '喔喔 喔喔 [o1 o1] /(onom.) sth crowing/rooster sound/',
  ].join('\n');
  it('2–4 character headwords: the first usable sense, cut to at most four words, no "to"', async () => {
    const { cedictGlosses } = await import('./glossary-lib');
    const { date, glosses } = cedictGlosses(LINES);
    expect(date).toBe('2026-10-16');
    expect(glosses.get('共用')).toBe('share the use of');
    expect(glosses.get('以后')).toBe('after');
    expect(glosses.get('病人')).toBe('sick person');
    expect(glosses.get('本子')).toBe('book'); // the classifier note skipped
    expect(glosses.get('王府')).toBe("prince's mansion"); // the surname entry skipped
    expect(glosses.get('家伙')).toBe('household dish'); // the variant entry skipped; cut at its comma... or its words
    expect(glosses.get('结出')).toBe('bear (fruit)'); // a closing note kept when it fits
    expect(glosses.has('北京')).toBe(false); // a name
    expect(glosses.get('蝶变')).toBe('metamorphose'); // a leading note and its "to" go
    expect(glosses.has('长篇大论')).toBe(false); // no sense fits in four words
    expect(glosses.has('蝴')).toBe(false);
    expect(glosses.has('一路平安无事')).toBe(false);
  });
  it('with the kid gloss check, a sense it fails gives way to the next', async () => {
    const { cedictGlosses } = await import('./glossary-lib');
    const { glossProblems } = await import('../src/content/kidGloss');
    const { glosses } = cedictGlosses(LINES, (g) => !glossProblems(g).length);
    expect(glosses.get('喔喔')).toBe('rooster sound');
    for (const g of glosses.values()) expect(glossProblems(g)).toEqual([]);
  });
});
