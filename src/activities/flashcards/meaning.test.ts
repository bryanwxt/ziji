import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { meaningCue, pickSoundAlikes } from './meaning';
import { builtinWords, HSK_WORDS } from '../../content';
import { mulberry32 } from '../../lib/random';

describe('meaningCue', () => {
  it('blanks the character inside one of its 组词 words', () => {
    const w = makeWord('惜', { examples: [{ text: '珍惜', pinyin: 'zhēn xī' }, { text: '可惜', pinyin: 'kě xī' }] });
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

