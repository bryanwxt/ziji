// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { SENTENCE_BANK } from './sentenceBank';
import { MAX_TILES, MIN_TILES, pickZuju, tiles, zujuFor } from './zuju';
import { mulberry32 } from '../lib/random';

describe('组句 (spec 2026-10-05 §3.2 rung 4, §6)', () => {
  it('cuts a sentence into word tiles: the longest word first', () => {
    expect(tiles('我和哥哥都喜欢打球。')).toEqual(['我', '和', '哥哥', '都', '喜欢', '打球。']);
  });
  it('punctuation and 了/吗/吧/的 stay with the word before; a number keeps its measure word; a doubled character stays whole', () => {
    expect(tiles('我要去上学了。')).toEqual(['我', '要', '去', '上学了。']);
    expect(tiles('你能来我家玩吗？')).toEqual(['你', '能', '来', '我', '家', '玩吗？']);
    expect(tiles('我想喝一杯水。')).toEqual(['我', '想', '喝', '一杯', '水。']);
    expect(tiles('爷爷天天喝茶。')).toEqual(['爷爷', '天天', '喝', '茶。']);
  });
  it('a 的 or 得 that starts a word stays in it (得到)', () => {
    expect(tiles('我得到了一本书。')).toContain('得到了');
  });
  it('a word gets the bank sentences that cut into 4–6 different tiles and keep the word whole', () => {
    const item = SENTENCE_BANK.find((b) => zujuFor(makeWord(b.word)).length > 0)!;
    for (const z of zujuFor(makeWord(item.word))) {
      expect(z.tiles.length).toBeGreaterThanOrEqual(MIN_TILES);
      expect(z.tiles.length).toBeLessThanOrEqual(MAX_TILES);
      expect(z.tiles.join('')).toBe(z.full);
      expect(z.tiles.some((t) => t.includes(item.word))).toBe(true);
      expect(z.orders[0]).toEqual(z.tiles);
    }
  });
  it('a sentence with a repeated tile is never used (its order would be ambiguous)', () => {
    const w = makeWord('喜欢', { sentences: [{ text: '我喜欢猫，我喜欢狗。', pinyin: '' }] });
    expect(zujuFor(w).map((z) => z.full)).not.toContain('我喜欢猫，我喜欢狗。');
  });
  it('a leading time word may swap with the subject (今天我… / 我今天…)', () => {
    const w = makeWord('喝', { sentences: [{ text: '今天我喝牛奶。', pinyin: '' }] });
    const z = zujuFor(w).find((x) => x.full === '今天我喝牛奶。')!;
    expect(z.orders).toEqual([['今天', '我', '喝', '牛奶。'], ['我', '今天', '喝', '牛奶。']]);
  });
  it('his class sentences come first; the bank has enough sentences to matter', () => {
    const w = makeWord('很', { sentences: [{ text: '我们的老师很好。', pinyin: '' }] });
    expect(zujuFor(w)[0]!.full).toBe('我们的老师很好。');
    expect(SENTENCE_BANK.filter((b) => zujuFor(makeWord(b.word)).length > 0).length).toBeGreaterThan(150);
  });
});

describe('final review I3/I5: natural orders, heard first, and variety', () => {
  it('a time word may come before or after the subject, either way it was written', () => {
    const w = makeWord('喝', { sentences: [{ text: '我今天喝牛奶。', pinyin: '' }] });
    expect(zujuFor(w).find((x) => x.full === '我今天喝牛奶。')!.orders).toContainEqual(['今天', '我', '喝', '牛奶。']);
  });
  it('the two around 和 or 跟 may swap', () => {
    const w = makeWord('和', { sentences: [{ text: '我和哥哥都喜欢打球。', pinyin: '' }] });
    expect(zujuFor(w).find((x) => x.full === '我和哥哥都喜欢打球。')!.orders).toContainEqual(['哥哥', '和', '我', '都', '喜欢', '打球。']);
  });
  it('each lesson picks one of the word’s sentences, not always the first', () => {
    const word = SENTENCE_BANK.map((b) => makeWord(b.word)).find((w) => zujuFor(w).length >= 2)!;
    const seen = new Set(Array.from({ length: 20 }, (_, i) => pickZuju(word, mulberry32(i + 1))!.full));
    expect(seen.size).toBeGreaterThan(1);
  });
});
