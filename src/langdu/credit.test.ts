import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { creditLine, LICENCE_URL } from './credit';

const credit = { title: '一个很高的人', text: 'Cornelius Gulere', illustration: 'Catherine Groenewald', translation: 'dohliam', licence: 'CC BY 3.0' as const, adapted: false, source: 'https://github.com/x' };
const PINNED = 'https://github.com/global-asp/sbc-source/blob/be28dab38ac55e8eb2185edb6631b11615d02185/zh/';

describe('creditLine (spec 2026-10-15 §2.1)', () => {
  it('the licence and 有改动 first, so a line cut short by its ellipsis still shows them; then the people', () => {
    expect(creditLine(credit)).toBe('故事：Global Storybooks · CC BY 3.0 · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam');
    expect(creditLine({ ...credit, licence: 'CC BY-NC 3.0', adapted: true })).toBe('故事：Global Storybooks · CC BY-NC 3.0 · 有改动 · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam');
    expect(creditLine({ ...credit, licence: 'CC BY 4.0' })).toBe('故事：Global Storybooks · CC BY 4.0 · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam');
  });
  it('each licence links its own deed, 4.0 included', () => {
    expect(LICENCE_URL).toEqual({
      'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
      'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
      'CC BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    });
  });
  it('every imported passage carries a credit with a licence link and its source at the pinned commit', () => {
    const gsb = PASSAGES.filter((p) => p.source === 'gsb');
    expect(gsb.length).toBeGreaterThan(0);
    expect(gsb.filter((p) => !p.credit || !LICENCE_URL[p.credit.licence] || !p.credit.source.startsWith(PINNED))).toEqual([]);
  });
});
