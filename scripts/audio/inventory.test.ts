import { describe, expect, it } from 'vitest';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { buildInventory, FIXED_LINES } from './inventory';

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
