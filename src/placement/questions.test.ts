import { describe, expect, it } from 'vitest';
import { builtinWords, HSK_WORDS } from '../content';
import { mulberry32 } from '../lib/random';
import { buildQuestion, nextQuestion, visitStyles } from './questions';
import { rankBands, type Style } from './walk';

const pool = builtinWords(0);
const byText = new Map(pool.map((w) => [w.text, w]));

describe('placement questions (spec §19 part 6)', () => {
  it('读一读: the character and 4 pinyin choices, one right', () => {
    const q = buildQuestion('read', byText.get('静')!, pool, mulberry32(1))!;
    if (q.style !== 'read') throw new Error(q.style);
    expect(q.options).toContain(byText.get('静')!.pinyin);
    expect(q.options).toHaveLength(4);
  });
  it('听一听: 4 characters to pick the one Truffle says', () => {
    const q = buildQuestion('listen', byText.get('他')!, pool, mulberry32(1))!;
    if (q.style !== 'listen') throw new Error(q.style);
    expect(q.options).toContain('他');
    expect(new Set(q.options).size).toBe(4);
  });
  it('真的假的: a real HSK word with the character, or a made-up look-alike that is no word', () => {
    let fakes = 0;
    for (let seed = 1; seed < 30; seed++) {
      const q = buildQuestion('real', byText.get('负')!, pool, mulberry32(seed))!;
      if (q.style !== 'real') throw new Error(q.style);
      expect(q.shown).toContain('负');
      expect(HSK_WORDS.has(q.shown)).toBe(q.real);
      if (!q.real) fakes++;
    }
    expect(fakes).toBeGreaterThan(0);
  });
  it('补一补: a word with the character missing and 4 look-alikes, none making another word', () => {
    const q = buildQuestion('fill', byText.get('银')!, pool, mulberry32(2))!;
    if (q.style !== 'fill') throw new Error(q.style);
    expect(q.answer).toBe('银');
    expect(q.options).toContain('银');
    expect(new Set(q.options).size).toBe(4);
    for (const o of q.options.filter((x) => x !== '银')) expect(HSK_WORDS.has([...q.word].map((c, i) => (i === q.index ? o : c)).join(''))).toBe(false);
  });
  it('选一选: a sentence or 组词 with the character blanked', () => {
    const q = buildQuestion('fit', byText.get('很')!, pool, mulberry32(1))!;
    if (q.style !== 'fit') throw new Error(q.style);
    expect(q.item.word).toBe('很');
    expect(q.item.options).toContain('很');
  });
  it('a visit mixes 4 styles: one 选一选, never the same style twice in a row', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = visitStyles('read', true, mulberry32(seed));
      expect(v).toHaveLength(4);
      expect(v.filter((s) => s === 'fit')).toHaveLength(1);
      const all: Style[] = ['read', ...v];
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });
  it('no voice, no 听一听', () => {
    for (let seed = 1; seed < 30; seed++) expect(visitStyles(null, false, mulberry32(seed))).not.toContain('listen');
  });
  it('every band can ask every style (falling back when a rare character has no word for it)', () => {
    const bands = rankBands(pool);
    for (const band of [bands[0]!, bands[10]!, bands[29]!]) {
      for (const style of ['read', 'listen', 'real', 'fill', 'fit'] as const) {
        const q = nextQuestion(band, style, pool, mulberry32(3), new Set());
        expect(band.some((w) => w.id === q.wordId)).toBe(true);
      }
    }
  });
  it('never asks a word already asked this check, while others remain', () => {
    const band = rankBands(pool)[0]!;
    const used = new Set(band.slice(1).map((w) => w.id));
    expect(nextQuestion(band, 'read', pool, mulberry32(1), used).wordId).toBe(band[0]!.id);
  });
});
