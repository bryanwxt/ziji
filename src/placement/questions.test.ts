import { describe, expect, it } from 'vitest';
import { builtinWords, HSK_WORDS } from '../content';
import { mulberry32 } from '../lib/random';
import { firstSense } from '../activities/flashcards/distractors';
import { cardMeaning } from '../content/glossary';
import { buildQuestion, hearBand, nextQuestion, visitStyles } from './questions';
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
  it('听一听: he hears a word and picks its English meaning from 4', () => {
    const q = buildQuestion('hear', byText.get('门')!, pool, mulberry32(1))!;
    if (q.style !== 'hear') throw new Error(q.style);
    expect(q.answer).toBe(firstSense(cardMeaning(byText.get('门')!)!));
    expect(q.options).toContain(q.answer);
    expect(new Set(q.options).size).toBe(4);
  });
  it('听一听 asks words, not only characters: the band brings its 词语 (spec 2026-10-06 §3.5)', () => {
    const band = rankBands(pool)[2]!;
    const words = hearBand(band);
    expect(words.some((w) => w.id.startsWith('w:'))).toBe(true);
    const ranks = new Set(band.map((w) => w.rank));
    for (const w of words) expect(ranks.has(Math.floor(w.rank!))).toBe(true);
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
  it('with a voice a visit has exactly one 听一听, one 选一选 and two reading questions, never the same twice in a row', () => {
    for (let seed = 1; seed < 40; seed++) {
      const v = visitStyles('read', true, mulberry32(seed));
      expect(v).toHaveLength(4);
      expect(v.filter((s) => s === 'hear')).toHaveLength(1);
      expect(v.filter((s) => s === 'fit')).toHaveLength(1);
      expect(v.filter((s) => s === 'read' || s === 'fill')).toHaveLength(2);
      const all: Style[] = ['read', ...v];
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });
  it('no voice, no 听一听', () => {
    for (let seed = 1; seed < 30; seed++) expect(visitStyles(null, false, mulberry32(seed))).not.toContain('hear');
  });
  it('every band can ask every style (falling back when a rare character has no word for it)', () => {
    const bands = rankBands(pool);
    for (const band of [bands[0]!, bands[10]!, bands[29]!]) {
      for (const style of ['read', 'hear', 'fill', 'fit'] as const) {
        const q = nextQuestion(band, style, pool, mulberry32(3), new Set());
        expect((style === 'hear' ? hearBand(band) : band).some((w) => w.id === q.wordId)).toBe(true);
      }
    }
  });
  it('never asks a word already asked this check, while others remain', () => {
    const band = rankBands(pool)[0]!;
    const used = new Set(band.slice(1).map((w) => w.id));
    expect(nextQuestion(band, 'read', pool, mulberry32(1), used).wordId).toBe(band[0]!.id);
  });


  it('without a voice a visit still mixes styles: 读一读 and 补一补 alternate around one 选一选', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = visitStyles('fill', false, mulberry32(seed));
      expect(v).toHaveLength(4);
      expect(v.filter((s) => s === 'fit')).toHaveLength(1);
      const all: Style[] = ['fill', ...v];
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });
});
