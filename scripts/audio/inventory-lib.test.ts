import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import SAY_AS from '../../src/audio/sayAs.json';
import { clipKey } from '../../src/audio/clipKey';
import { clipId, engineText, fnv64 } from './inventory-lib';

describe('clipKey', () => {
  it('a lone character goes by its taught reading; anything longer by its text', () => {
    expect(clipKey('调', 'tiáo')).toBe('调|tiáo');
    expect(clipKey(' 空调 ', 'kōng tiáo')).toBe('空调');
    expect(clipKey('门')).toBe('门');
  });
});

describe('clip ids', () => {
  it('FNV-1a 64, as 16 hex digits', () => {
    expect(fnv64('')).toBe('cbf29ce484222325');
    expect(fnv64('a')).toBe('af63dc4c8601ec8c');
  });
  it('a new reading or a new voice is a new clip', () => {
    const a = clipId('调|tiáo', 'tiáo', 'kokoro:zf_001@0.85/0.95');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(clipId('调|tiáo', 'diào', 'kokoro:zf_001@0.85/0.95')).not.toBe(a);
    expect(clipId('调|tiáo', 'tiáo', 'melo:ZH@1/1')).not.toBe(a);
  });
});

describe('engineText: the text an engine is given so each character is read as taught', () => {
  it('a lone 多音字 is swapped for a plain character with the taught reading (调 tiáo → 条)', () => {
    expect(engineText('调', 'tiáo')).toEqual({ text: '条', sure: true });
  });
  it('words already read as taught are left alone, including 一/不 sandhi, 轻声 and 儿化', () => {
    for (const [t, p] of [['门口', 'mén kǒu'], ['一个', 'yí gè'], ['不对', 'bú duì'], ['东西', 'dōng xi'], ['哪儿', 'nǎ r'], ['你好', 'nǐ hǎo']]) {
      expect(engineText(t!, p!), t).toEqual({ text: t, sure: true });
    }
  });
  it('pinyin that does not line up with the characters is left alone and marked unsure', () => {
    expect(engineText('门口', 'mén')).toEqual({ text: '门口', sure: false });
  });
  it('every lone 多音字 the cards teach comes out read as taught, or is marked unsure for the parent to check', () => {
    const { poly } = SAY_AS as { poly: Record<string, string> };
    let sure = 0;
    const entries = Object.entries(poly);
    for (const [ch, r] of entries) {
      const out = engineText(ch, r);
      if (out.sure) { sure++; expect(pinyin(out.text), `${ch} ${r} → ${out.text}`).toBe(r); }
    }
    expect(sure / Math.max(1, entries.length)).toBeGreaterThan(0.8);
  });
});
