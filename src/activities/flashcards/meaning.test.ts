import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { meaningCue, pickSoundAlikes } from './meaning';
import { builtinWords, HSK_WORDS } from '../../content';
import { mulberry32 } from '../../lib/random';

describe('meaningCue', () => {
  it('blanks the character inside one of its 组词 words', () => {
    const w = makeWord('惜', { pinyin: 'xī', examples: [{ text: '珍惜', pinyin: 'zhēn xī' }, { text: '可惜', pinyin: 'kě xī' }] });
    expect(meaningCue(w)).toEqual({ full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' });
  });
  it('has no cue when no example contains the word (a two-character school word without sentences yet)', () => {
    expect(meaningCue(makeWord('保持', { examples: [] }))).toBeNull();
    expect(meaningCue(makeWord('保持'))).toBeNull();
  });
});

describe('pickSoundAlikes', () => {
  const pool = builtinWords(0);
  const xi = pool.find((w) => w.text === '惜')!;
  const cue = { full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' };
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
      const out = pickSoundAlikes(yi, { full: '一半', pinyin: 'yí bàn', before: '', after: '半' }, pool, mulberry32(seed));
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
  it('one where the character has the reading he is learning (长 cháng: 长短, not 班长 zhǎng)', () => {
    const chang = makeWord('长', { pinyin: 'cháng', examples: [{ text: '班长', pinyin: 'bān zhǎng' }, { text: '长短', pinyin: 'cháng duǎn' }] });
    expect(meaningCue(chang)?.full).toBe('长短');
  });
  it('not one whose other part is a glue character that makes words with anything (不__, __们, __子)', () => {
    const da = makeWord('大', { pinyin: 'dà', examples: [{ text: '不大', pinyin: 'bù dà' }, { text: '大家', pinyin: 'dà jiā' }] });
    expect(meaningCue(da)?.full).toBe('大家');
    expect(meaningCue(makeWord('人', { pinyin: 'rén', examples: [{ text: '别人', pinyin: 'bié rén' }] }))).toBeNull();
  });
});

