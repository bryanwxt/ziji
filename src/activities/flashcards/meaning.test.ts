import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { meaningCue, pickSoundAlikes, usageLine, wordCue } from './meaning';
import { bankFor } from '../../content/sentenceBank';
import { builtinWords, HSK_WORDS } from '../../content';
import { mulberry32 } from '../../lib/random';
import { lookAlikeChars } from '../components/zibian';
import { MANY_WRONG } from './distractors';

describe('meaningCue', () => {
  it('blanks the character inside one of its 组词 words', () => {
    const w = makeWord('惜', { pinyin: 'xī', examples: [{ text: '珍惜', pinyin: 'zhēn xī' }, { text: '可惜', pinyin: 'kě xī' }] });
    expect(meaningCue(w)).toEqual({ kind: 'word', source: 'word', full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' });
  });
  it('has no cue when no example contains the word (a two-character school word without sentences yet)', () => {
    expect(meaningCue(makeWord('欺负', { examples: [] }))).toBeNull(); // 欺负 has no bank item either
    expect(meaningCue(makeWord('欺负'))).toBeNull();
  });
});

describe('pickSoundAlikes', () => {
  const pool = builtinWords(0);
  const xi = pool.find((w) => w.text === '惜')!;
  const cue = { kind: 'word' as const, source: 'word' as const, full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' };
  it('offers characters that sound like the answer, so sound alone can\'t give it away', () => {
    const out = pickSoundAlikes(xi, cue, pool, mulberry32(3));
    expect(out).toHaveLength(3);
    expect(out.every((c) => pool.find((w) => w.text === c)!.pinyin.replace(/[^a-z]/g, '').startsWith('x'))).toBe(true);
  });
  it('never offers a character that also makes a real word with the cue (珍稀 is a word)', () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const c of pickSoundAlikes(xi, cue, pool, mulberry32(seed))) expect(HSK_WORDS.has(cue.before + c + cue.after)).toBe(false);
    }
  });
});

describe('sound-alike level', () => {
  it('draws the same-sound choices from around the word\'s own HSK level (no HSK 7–9 characters for 一)', () => {
    const pool = builtinWords(0);
    const yi = pool.find((w) => w.text === '一')!;
    const level = new Map(pool.map((w) => [w.text, w.level ?? 7]));
    for (let seed = 1; seed < 20; seed++) {
      const out = pickSoundAlikes(yi, { kind: 'word', source: 'word', full: '一半', pinyin: 'yí bàn', before: '', after: '半' }, pool, mulberry32(seed));
      expect(out).toHaveLength(3);
      expect(out.every((c) => level.get(c)! <= 2)).toBe(true);
    }
  });
});

describe('meaningCue picks a fair 组词', () => {
  it('never a word that repeats the character (妈妈 would give it away)', () => {
    expect(meaningCue(makeWord('妈', { pinyin: 'mā', examples: [{ text: '妈妈', pinyin: 'mā ma' }] }))).toBeNull();
    expect(meaningCue(makeWord('妈', { pinyin: 'mā', examples: [{ text: '妈妈', pinyin: 'mā ma' }, { text: '姑妈', pinyin: 'gū mā' }] }))?.full).toBe('姑妈');
  });
  it('one where the character has the reading he is learning (行 xíng: 行人, not 银行 háng)', () => {
    const xing = makeWord('行', { pinyin: 'xíng', examples: [{ text: '银行', pinyin: 'yín háng' }, { text: '行人', pinyin: 'xíng rén' }] });
    expect(meaningCue(xing)?.full).toBe('行人');
  });
  it('not one whose other part is a glue character that makes words with anything (不__, __们, __子)', () => {
    const guo = makeWord('国', { pinyin: 'guó', examples: [{ text: '大国', pinyin: 'dà guó' }, { text: '国家', pinyin: 'guó jiā' }] });
    expect(meaningCue(guo)?.full).toBe('国家');
    expect(meaningCue(makeWord('人', { pinyin: 'rén', examples: [{ text: '别人', pinyin: 'bié rén' }] }))).toBeNull();
  });
});

describe('imported sentences come first', () => {
  it('a school word with a class sentence gets that sentence as its cue', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', examples: [], sentences: [{ text: '图书馆里要保持安静。', pinyin: 'tú shū guǎn lǐ yào bǎo chí ān jìng 。' }] });
    expect(meaningCue(w)).toMatchObject({ kind: 'sentence', before: '图书馆里要', after: '安静。' });
  });
  it('never a sentence that uses the word twice or is barely longer than it', () => {
    const w = makeWord('欺负', { pinyin: 'qī fu', sentences: [{ text: '欺负，欺负！', pinyin: 'x' }, { text: '欺负。', pinyin: 'x' }] });
    expect(meaningCue(w)).toBeNull();
  });
});

describe('choices for a school word', () => {
  it('a two-character school word gets 3 two-character HSK words near its level, even when his own words are all single characters', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent', sentences: [{ text: '图书馆里要保持安静，大家都在看书。', pinyin: '' }] });
    const cue = meaningCue(w)!;
    for (const seed of [1, 2, 3, 4, 5]) {
      const out = pickSoundAlikes(w, cue, builtinWords(0), mulberry32(seed));
      expect(out).toHaveLength(3);
      for (const t of out) {
        expect(Array.from(t)).toHaveLength(2);
        expect(t).not.toBe('保持');
        expect(HSK_WORDS.get(t)!).toBeLessThanOrEqual(4); // 保持 is HSK 3: choices from HSK 1–4, not 7–9
      }
    }
  });
});

describe('review fixes: fair sentence questions', () => {
  const saying = (text: string) => makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent', sentences: [{ text, pinyin: '' }] });
  it('a choice that shares a character with the word (保证 for 保持) is never offered: it could fit the sentence too', () => {
    const w = saying('图书馆里要保持安静，大家都在看书。');
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const t of pickSoundAlikes(w, meaningCue(w)!, builtinWords(0), mulberry32(seed))) expect([...t].some((ch) => '保持'.includes(ch))).toBe(false);
    }
  });
  it('a school word outside HSK gets choices around HSK 3, not 7–9', () => {
    const w = makeWord('组屋', { pinyin: 'zǔ wū', level: null, source: 'parent', sentences: [{ text: '我家住在一间很高的组屋里。', pinyin: '' }] });
    for (const seed of [1, 2, 3]) {
      for (const t of pickSoundAlikes(w, meaningCue(w)!, builtinWords(0), mulberry32(seed))) expect(HSK_WORDS.get(t)!).toBeLessThanOrEqual(4);
    }
  });
  it('a class 成语 gets his other class 成语 as choices before HSK 7–9 ones', () => {
    const idiom = (t: string, id: string, pinyin: string) => makeWord(t, { id, pinyin, level: null, source: 'parent' });
    const w = { ...idiom('齐心协力', 'p:1', 'qí xīn xié lì'), sentences: [{ text: '我们要齐心协力打扫课室。', pinyin: '' }] };
    const pool = [...builtinWords(0), w, idiom('一模一样', 'p:2', 'yī mú yī yàng'), idiom('自言自语', 'p:3', 'zì yán zì yǔ'), idiom('五颜六色', 'p:4', 'wǔ yán liù sè')];
    expect(pickSoundAlikes(w, meaningCue(w)!, pool, mulberry32(1)).sort()).toEqual(['一模一样', '五颜六色', '自言自语'].sort());
  });
  it('a class sentence longer than 30 characters is not used as a cue (it would not fit a phone)', () => {
    const long = '图书馆里要保持安静，大家都在认真地看书，小明也拿起了一本很有趣的故事书。';
    expect(meaningCue(saying(long))?.source).not.toBe('class'); // 保持 falls back to its bank sentence
  });
});

describe('bank cues (spec §20 part 4)', () => {
  it('a word with a bank item but no class sentence gets the bank sentence, with its hand-picked choices', () => {
    const w = makeWord('很', { pinyin: 'hěn', examples: [{ text: '很多', pinyin: 'hěn duō' }] });
    expect(meaningCue(w)).toMatchObject({ kind: 'sentence', source: 'bank', before: '今天', after: '热。', wrong: ['在', '和', '跟'] });
    expect(meaningCue(w, 1)).toMatchObject({ before: '这个书包', after: '大。' });
  });
  it('his class sentence still comes before the bank', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent', sentences: [{ text: '教室里要保持安静。', pinyin: '' }] });
    expect(meaningCue(w)).toMatchObject({ source: 'class', before: '教室里要' });
  });
  it('a bank cue carries its clue and pairing', () => {
    expect(meaningCue(makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent' }))).toMatchObject({ source: 'bank', pair: '安静', clue: expect.stringContaining('保持') });
  });
});

describe('usageLine (spec §20 part 1)', () => {
  it("is the bank's other sentence with the word in place, and the word's pinyin", () => {
    expect(usageLine(makeWord('很', { pinyin: 'hěn' }))).toEqual({ before: '这个书包', after: '大。', full: '这个书包很大。', pinyin: 'hěn', isWord: false });
  });
  it("never the sentence 认一认's meaning question will blank, so the intro doesn't give its answer away", () => {
    const w = makeWord('很', { pinyin: 'hěn' });
    expect(usageLine(w)!.full).not.toBe(meaningCue(w)!.full);
  });
  it('with two class sentences, the line shows the other one', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent', sentences: [{ text: '教室里要保持安静。', pinyin: '' }, { text: '我们要保持房间干净。', pinyin: '' }] });
    expect(meaningCue(w)!.full).toBe('教室里要保持安静。');
    expect(usageLine(w)!.full).toBe('我们要保持房间干净。');
  });
  it('falls back to a 组词 word with its pinyin', () => {
    const w = makeWord('惜', { pinyin: 'xī', examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] });
    expect(usageLine(w)).toEqual({ before: '珍', after: '', full: '珍惜', pinyin: 'zhēn xī', isWord: true });
  });
  it('no usage line when there is nothing to show (a parent word with no sentence, no bank item, no 组词)', () => {
    expect(usageLine(makeWord('欺负', { level: null, source: 'parent' }))).toBeNull();
  });
});

describe('characters that swap for each other in real words', () => {
  it('他, 她 and 它 are never choices for each other (其它 is a real word too)', () => {
    const pool = builtinWords(0);
    const ta = pool.find((w) => w.text === '他')!;
    const cue = meaningCue({ ...ta, examples: [{ text: '其他', pinyin: 'qí tā' }] })!;
    for (let seed = 1; seed < 30; seed++) {
      const out = pickSoundAlikes(ta, cue, pool, mulberry32(seed));
      expect(out.filter((c) => '她它'.includes(c))).toEqual([]);
    }
  });
});

describe('wordCue: the 词语 rung (spec 2026-10-05 §3.2)', () => {
  it('is the 组词 cue alone, even for a word that has a sentence', () => {
    const w = builtinWords(0).find((x) => bankFor(x.text) && wordCue(x))!;
    expect(meaningCue(w)!.kind).toBe('sentence'); // meaningCue still puts the sentence first
    expect(wordCue(w)!.kind).toBe('word');
  });
  it('is null without a usable 组词', () => {
    expect(wordCue(makeWord('欺负', { examples: [] }))).toBeNull();
  });
});

describe('a school 成语 (spec 2026-10-05 §4, phase C)', () => {
  it('with no class sentence, uses the 成语 list sentence with other 成语 as wrong choices', () => {
    const cue = meaningCue(makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], level: null, rank: null }))!;
    expect(cue).toMatchObject({ kind: 'sentence', source: 'bank' });
    expect(cue.full).toContain('五颜六色');
    expect(cue.wrong).toHaveLength(3);
    for (const w of cue.wrong!) { expect(Array.from(w)).toHaveLength(4); expect(w).not.toBe('五颜六色'); }
  });
  it('his class sentence still comes first', () => {
    const cue = meaningCue({ ...makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], level: null, rank: null }), sentences: [{ text: '花园里的花五颜六色，真好看。', pinyin: '' }] })!;
    expect(cue.source).toBe('class');
  });
});

describe('组词 gaps he can’t guess (real test spec 2026-10-23 §5)', () => {
  const pool = builtinWords(0);
  const cao = pool.find((w) => w.text === '草')!;
  const di = { kind: 'word' as const, source: 'word' as const, full: '草地', pinyin: 'cǎo dì', before: '', after: '地' };
  const begun = new Set(Array.from('草花茶菜早吃次从出车春'));
  const makesWord = (c: string) => HSK_WORDS.has(c + '地') || pool.some((w) => w.text === c + '地' || w.examples?.some((e) => e.text === c + '地'));
  it('with 草 begun and the cue ＿地: every choice is begun, one or two are look-alikes, none makes a word with 地', () => {
    const alike = new Set(lookAlikeChars('草'));
    for (let seed = 1; seed < 30; seed++) {
      const out = pickSoundAlikes(cao, di, pool, mulberry32(seed), MANY_WRONG, begun);
      expect(out, `seed ${seed}`).toHaveLength(5);
      expect(out.every((c) => begun.has(c) && c !== '草'), `seed ${seed}: ${out}`).toBe(true);
      const looks = out.filter((c) => alike.has(c)).length;
      expect(looks, `seed ${seed}: ${out}`).toBeGreaterThanOrEqual(1);
      expect(looks, `seed ${seed}: ${out}`).toBeLessThanOrEqual(2);
      expect(out.filter(makesWord), `seed ${seed}`).toEqual([]);
    }
  });
  it('his own words count as words: a choice that makes one of them with the cue is never offered', () => {
    const own = [...pool, makeWord('花地', { id: 'p:花地', source: 'parent', rank: null, level: null })];
    for (let seed = 1; seed < 20; seed++) expect(pickSoundAlikes(cao, di, own, mulberry32(seed), MANY_WRONG, begun)).not.toContain('花');
  });
  it('3 or 4 begun characters qualify: those only (the step shows 4 choices)', () => {
    const out = pickSoundAlikes(cao, di, pool, mulberry32(4), MANY_WRONG, new Set(Array.from('草花茶吃次')));
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.every((c) => '花茶吃次'.includes(c))).toBe(true);
  });
  it('fewer than 3 begun characters qualify: the choices fill from his level, as before', () => {
    const out = pickSoundAlikes(cao, di, pool, mulberry32(5), 3, new Set(['草', '花']));
    expect(out).toHaveLength(3);
    expect(out.some((c) => c !== '花')).toBe(true);
  });
});
