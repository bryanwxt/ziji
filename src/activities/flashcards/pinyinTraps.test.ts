import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { makeWord } from '../../test/fixtures';
import { trapReadings } from './pinyinTraps';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;

describe('trapReadings (his worksheet mistakes)', () => {
  it('offers the reading of the phonetic part: 静 → qīng (青)', () => {
    expect(trapReadings(w('静'))).toContain('qīng');
  });
  it('swaps j/q/x with z/c/s and zh/ch/sh: 群 qún → cún', () => {
    expect(trapReadings(w('群'))).toContain('cún');
  });
  it('swaps close finals: 街 jiē → jiā', () => {
    expect(trapReadings(w('街'))).toContain('jiā');
  });
  it('gives a 轻声 syllable its full tone: 认识 rèn shi → rèn shí', () => {
    expect(trapReadings(makeWord('认识', { pinyin: 'rèn shi' }))).toContain('rèn shí');
  });
  it('only makes real syllables', () => {
    for (const t of ['静', '群', '街', '想', '捡']) for (const p of trapReadings(w(t))) expect(p).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü ]+$/);
  });
  it('reads the sounding part, never the meaning radical: 捡 never offers shǒu (扌)', () => {
    expect(trapReadings(w('捡'))).not.toContain('shǒu');
    expect(trapReadings(w('捡'))).toContain('qiān'); // 佥
  });
  it('across every built-in character, traps are real pinyin syllables from real characters, never glyphs or stroke names', () => {
    const SYL = /^([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)( [a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)*$/;
    for (const w of builtinWords(0)) for (const p of trapReadings(w)) expect(p, `${w.text} → ${p}`).toMatch(SYL);
    // the reviewer's examples: a stroke or enclosure's dictionary name is never offered
    const stroke: [string, string][] = [['儿', 'piě'], ['几', 'piě'], ['九', 'piě'], ['口', 'jiōng'], ['见', 'jiōng'], ['书', 'gǔn'], ['小', 'jué'], ['门', 'zhǔ']];
    for (const [ch, name] of stroke) expect(trapReadings(w(ch)), `${ch}`).not.toContain(name);
  });
});
