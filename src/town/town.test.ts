// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { ladderWords } from '../content/ladder';
import { SENTENCE_TERMS, wordTerm } from '../content/understand';
import { canAskRung, type RungKind } from '../ladder/rungs';
import { PLACES, placeLight } from './town';

const all = new Map([...builtinWords(0), ...ladderWords()].map((w) => [w.id, w]));
const know = (passed: Record<string, RungKind[]>) => ({
  passedRungs: new Map(Object.entries(passed).map(([id, rs]) => [id, new Set(rs)])),
  wordsById: new Map(builtinWords(0).map((w) => [w.id, w])),
  ladderById: new Map(ladderWords().map((w) => [w.id, w])),
});

describe('字己镇 (spec 2026-10-06 §3.7, §5.9)', () => {
  it('nine places, six words each, every word real, hearable, taught by 二下 and in one place only', () => {
    expect(PLACES).toHaveLength(9);
    const seen = new Set<string>();
    for (const p of PLACES) {
      expect(p.words).toHaveLength(6);
      for (const id of p.words) {
        const w = all.get(id);
        expect(w, id).toBeTruthy();
        expect(canAskRung(w!, 'hear'), id).toBe(true);
        expect((SENTENCE_TERMS as readonly string[]).includes(wordTerm(w!.text) ?? ''), id).toBe(true);
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
  });
  it('dark with nothing heard; part lit once one word passes Hear; a window per word', () => {
    const p = PLACES[0]!;
    expect(placeLight(know({}), p)).toEqual({ windows: [0, 0, 0, 0, 0, 0], level: 'dark' });
    const one = placeLight(know({ [p.words[2]!]: ['hear'] }), p);
    expect(one.level).toBe('part');
    expect(one.windows[2]).toBe(1);
  });
  it('a word read but not yet heard does not light its window (Hear is the rung that lights)', () => {
    const p = PLACES[0]!;
    expect(placeLight(know({ [p.words[0]!]: ['read', 'use'] }), p).level).toBe('dark');
  });
  it('fully lit when he owns every one of its words', () => {
    const p = PLACES[1]!;
    const owned = Object.fromEntries(p.words.map((id) => [id, ['hear', 'understand', 'read', 'use'] as RungKind[]]));
    expect(placeLight(know(owned), p)).toEqual({ windows: [2, 2, 2, 2, 2, 2], level: 'full' });
    const allButOne = { ...owned, [p.words[0]!]: ['hear'] as RungKind[] };
    expect(placeLight(know(allButOne), p).level).toBe('part');
  });
});
