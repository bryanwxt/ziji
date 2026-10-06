import { describe, expect, it } from 'vitest';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { buildInventory, clipIdFor, FIXED_LINES } from './inventory';

const jobs = buildInventory('test:voice@1/1');
const keys = new Set(jobs.map((j) => j.key));

describe('the clip inventory', () => {
  it('every in-range character, by its taught reading, and its 组词', () => {
    const inRange = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
    for (const w of inRange) {
      expect(keys.has(clipKey(w.text, w.pinyin)), w.text).toBe(true);
      for (const e of w.examples ?? []) expect(keys.has(e.text), e.text).toBe(true);
    }
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
