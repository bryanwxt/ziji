import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { mulberry32 } from '../../lib/random';
import { makeWord } from '../../test/fixtures';
import { pickCharacterDistractors, pickPinyinDistractors, syllableTone, toneless, withTone } from './distractors';

const all = builtinWords(0);
const w = (t: string) => all.find((x) => x.text === t)!;

describe('pinyin helpers', () => {
  it('strips tones but keeps ü', () => {
    expect(toneless('hé')).toBe('he');
    expect(toneless('péng you')).toBe('peng you');
    expect(toneless('lǜ')).toBe('lü');
  });
  it('splits a syllable into base and tone', () => {
    expect(syllableTone('lǜ')).toEqual({ base: 'lü', tone: 4 });
    expect(syllableTone('de')).toEqual({ base: 'de', tone: 5 });
  });
  it('places tone marks by the standard rules', () => {
    const bases = ['hao', 'gou', 'gui', 'liu', 'xie', 'lü'];
    const tones = [3, 1, 4, 4, 2, 4];
    expect(bases.map((b, i) => withTone(b, tones[i]!))).toEqual(['hǎo', 'gōu', 'guì', 'liù', 'xié', 'lǜ']);
  });
});

describe('pickCharacterDistractors', () => {
  it('prefers look-alikes and never offers a sound-alike', () => {
    const pool = ['喝', '汉', '洗', '汽', '大', '人', '口', '他'].map(w);
    const picked = pickCharacterDistractors(w('河'), pool, mulberry32(3)).map((x) => x.text);
    expect([...picked].sort()).toEqual(['汉', '汽', '洗'].sort());
  });
  it('only offers options of the same length, and fewer when the pool is small', () => {
    const target = makeWord('大人', { id: 'p:1', pinyin: 'dà rén', source: 'parent', level: null, rank: null });
    const pool = [w('大'), w('人'), makeWord('朋友', { id: 'p:2', pinyin: 'péng you', level: null, rank: null })];
    expect(pickCharacterDistractors(target, pool, mulberry32(1)).map((x) => x.text)).toEqual(['朋友']);
  });
  it('never returns the target or duplicates', () => {
    expect(pickCharacterDistractors(w('河'), [w('河'), w('河'), w('汉'), w('汉')], mulberry32(1)).map((x) => x.text)).toEqual(['汉']);
  });
});

describe('pickPinyinDistractors', () => {
  it('returns three distinct wrong options including a tone change', () => {
    const opts = pickPinyinDistractors(w('河'), all, mulberry32(5));
    expect(opts).toHaveLength(3);
    expect(new Set(opts).size).toBe(3);
    expect(opts).not.toContain('hé');
    expect(opts.some((o) => ['hē', 'hě', 'hè'].includes(o))).toBe(true);
  });
  it('still gives three options for a two-syllable word with an empty pool', () => {
    const opts = pickPinyinDistractors(makeWord('朋友', { pinyin: 'péng you' }), [], mulberry32(2));
    expect(opts).toHaveLength(3);
    expect(opts.every((o) => o.split(' ').length === 2 && o !== 'péng you')).toBe(true);
  });
});

describe('pinyin options are never a real reading', () => {
  it('skips alternate readings of polyphonic characters', () => {
    for (const [ch, other] of [['好', 'hào'], ['中', 'zhòng'], ['少', 'shào'], ['看', 'kān'], ['要', 'yāo']] as const) {
      for (let seed = 1; seed <= 30; seed++) expect(pickPinyinDistractors(w(ch), all, mulberry32(seed))).not.toContain(other);
    }
  });
  it('skips the tone-change readings of 一 (yí 一个, yì 一天) and 不 (bú 不是)', () => {
    for (const [ch, other] of [['一', 'yí'], ['一', 'yì'], ['不', 'bú']] as const) {
      for (let seed = 1; seed <= 30; seed++) expect(pickPinyinDistractors(w(ch), all, mulberry32(seed))).not.toContain(other);
    }
  });
});

describe('his pinyin traps', () => {
it('uses his traps first and at most one tone-only change', () => {
  const pool = builtinWords(0);
  const target = pool.find((x) => x.text === '静')!;
  for (let seed = 1; seed < 20; seed++) {
    const out = pickPinyinDistractors(target, pool, mulberry32(seed));
    expect(out).toHaveLength(3);
    expect(out.filter((p) => toneless(p) === toneless(target.pinyin)).length).toBeLessThanOrEqual(1);
    expect(out).toContain('qīng');
  }
});
it('never offers another correct reading of a polyphonic character as wrong', () => {
  const pool = builtinWords(0);
  const jue = pool.find((x) => x.text === '觉')!;
  for (let seed = 1; seed < 20; seed++) {
    const out = pickPinyinDistractors(jue, pool, mulberry32(seed));
    expect(out).not.toContain('jiào');
    expect(out).not.toContain('jué');
  }
});
});

describe('sweep: hear-and-find choices near his level', () => {
  it('never an HSK 7–9 character for a first-level word when nearer ones are there', async () => {
    const { builtinWords } = await import('../../content');
    const pool = builtinWords(0);
    const ta = pool.find((w) => w.text === '他')!;
    for (let k = 1; k < 30; k++) for (const d of pickCharacterDistractors(ta, pool, mulberry32(k))) expect(d.level ?? 9, d.text).toBeLessThanOrEqual(3);
  });
});

