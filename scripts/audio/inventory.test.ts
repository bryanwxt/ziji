import { describe, expect, it } from 'vitest';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { buildInventory, clipIdFor, FIXED_LINES } from './inventory';
import SAY_AS from '../../src/audio/sayAs.json';

const jobs = buildInventory('test:voice@1/1');
const keys = new Set(jobs.map((j) => j.key));

describe('the clip inventory', () => {
  it('every in-range character, by its taught reading (and the 组词 an unsure one is said as), and its 组词', () => {
    const inRange = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
    const saidAs = (SAY_AS as { words: Record<string, string[]> }).words;
    for (const w of inRange) {
      expect(keys.has(clipKey(w.text, w.pinyin)), w.text).toBe(true);
      if (Array.from(w.text).length === 1) expect(jobs.find((j) => j.key === clipKey(w.text, w.pinyin))?.taught, w.text).toBe(true);
      for (const x of saidAs[w.text] ?? []) expect(keys.has(x), x).toBe(true); // the iPad voice's fallback: 爪 said as 爪子
      for (const e of w.examples ?? []) expect(keys.has(e.text), e.text).toBe(true);
    }
  });
  it('a 连一连 half at another reading is not the taught clip (长|zhǎng)', () => {
    const half = jobs.find((j) => j.key === '长|zhǎng');
    expect(half?.kind).toBe('char');
    expect(half?.taught).toBeFalsy();
  });
  it('an unsure character is cut out of its 组词, said by the same voice (爪 zhuǎ from 爪子, not zhǎo alone)', () => {
    const { unsure, words } = SAY_AS as { unsure: string[]; words: Record<string, string[]> };
    const zhua = jobs.find((j) => j.key === '爪|zhuǎ')!;
    expect(zhua).toMatchObject({ text: '爪', kind: 'char', engineText: '爪子', method: 'cut', syllables: [0, 1], expected: 'zhuǎ', taught: true, sure: false });
    expect(jobs.find((j) => j.key === '茄|qié')).toMatchObject({ engineText: '番茄', syllables: [1, 2] });
    const inRange = new Set(builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text)).map((w) => w.text));
    for (const ch of unsure.filter((c) => inRange.has(c))) {
      const j = jobs.find((x) => x.taught && x.text === ch)!;
      expect(j.method, ch).toBe('cut');
      expect(words[ch], ch).toContain(j.engineText);
      expect(Array.from(j.engineText)[j.syllables![0]], ch).toBe(ch);
    }
  });
  it('the syllables kept are part of the clip name', () => {
    const zhua = jobs.find((j) => j.key === '爪|zhuǎ')!;
    expect(zhua.id).not.toBe(clipIdFor({ ...zhua, syllables: undefined }, 'test:voice@1/1'));
  });
  it('the pieces lines are built from: 听写 cues (长城的) and the fixed lines', () => {
    const w = builtinWords(0).find((x) => (x.examples ?? []).length > 0 && ((x.level ?? 99) <= 3 || schoolTerm(x.text)))!;
    expect(keys.has(`${w.examples![0]!.text}的`)).toBe(true);
    for (const l of FIXED_LINES) expect(keys.has(l), l).toBe(true);
  });
  it('one job per key, unique ids, a sane size', () => {
    expect(keys.size).toBe(jobs.length);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
    expect(jobs.length).toBeGreaterThan(5000);
    expect(jobs.length).toBeLessThan(25000);
  });
  it('another voice renames every clip', () => {
    const other = new Map(buildInventory('other@1/1').map((j) => [j.key, j.id]));
    expect(jobs.every((j) => other.get(j.key) !== j.id)).toBe(true);
  });
});

describe('how a word is given to the voice', () => {
  it('a word or a lone character ends in 。, so the voice says it as a whole utterance (parent, 2026-10-06: 东 in 东西 came out falling)', () => {
    const byKey = new Map(jobs.map((j) => [j.key, j]));
    expect(byKey.get('东西')?.engineText).toBe('东西。');
    // not the words cut from a sentence, nor a 听写 cue's middle piece (below)
    for (const j of jobs) if ((j.kind === 'char' || j.kind === 'word') && !j.method && !j.key.endsWith('的')) expect(j.engineText, j.key).toMatch(/[。！？]$/);
  });
  it('sentences keep their own punctuation, and nothing is doubled', () => {
    for (const j of jobs) expect(j.engineText, j.key).not.toMatch(/[。！？]。$/);
  });
});

describe('pieces, exceptions, and renaming', () => {
  const byKey = new Map(jobs.map((j) => [j.key, j]));
  it('a 听写 cue piece (长城的) has no 。: it is said mid-cue, not as the end of a sentence', () => {
    const piece = jobs.find((j) => j.key.endsWith('的') && j.kind === 'word')!;
    expect(piece.engineText.endsWith('。')).toBe(false);
  });
  it('a word on the exceptions list is cut from a sentence (一起: its 一 rose when said alone, parent 2026-10-06)', () => {
    expect(byKey.get('一起')).toMatchObject({ engineText: '一起', method: 'cut' });
    expect(byKey.get('一个')?.method).toBeUndefined();
  });
  it('what the voice is given is part of the clip name, so changing it makes a new clip', () => {
    const plain = buildInventory('v'), again = buildInventory('v');
    expect(plain.find((j) => j.key === '一起')!.id).toBe(again.find((j) => j.key === '一起')!.id);
    expect(byKey.get('一起')!.id).not.toBe(clipIdFor({ ...byKey.get('一起')!, engineText: '一起。', method: undefined }, 'test:voice@1/1'));
  });
});
