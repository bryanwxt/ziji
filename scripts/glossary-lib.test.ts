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
