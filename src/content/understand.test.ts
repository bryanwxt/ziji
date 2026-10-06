import { describe, expect, it } from 'vitest';
import { allowedChars, inScopeWords, sentenceProblems, sentencesFor, SENTENCE_TERMS, wordTerm } from './understand';
import { schoolTerm } from './index';

describe('a word\'s term and the characters it may use (spec 2026-10-06 §3.1)', () => {
  it('a word belongs to the latest term among its characters', () => {
    const late = ['一', '你'].sort((a, b) => (schoolTerm(a)! < schoolTerm(b)! ? -1 : 1));
    expect(wordTerm('一')).toBe(schoolTerm('一'));
    expect(wordTerm(late.join(''))).toBe(schoolTerm(late[1]!));
    expect(wordTerm('ABC')).toBeNull();
  });
  it('a term may use its own characters and every earlier term\'s, never a later one\'s', () => {
    const a = allowedChars('一上');
    expect(a.has('一')).toBe(true);
    expect([...allowedChars('一下')].length).toBeGreaterThan(a.size);
  });
});

describe('sentence rules', () => {
  const ok = { zh: '我有一个大口袋。', en: 'I have a big pocket.' };
  it('a good pair passes', () => {
    expect(sentenceProblems('大', [{ zh: '我们家很大。', en: 'Our home is big.' }, { zh: '大人在家里。', en: 'The grown-ups are at home.' }]).filter((p) => !p.includes('character'))).toEqual([]);
  });
  it('catches each broken rule', () => {
    const p = (s: { zh: string; en: string }[]) => sentenceProblems('大', s).join(' | ');
    expect(p([{ zh: '我们家。', en: 'Our home.' }, ok])).toMatch(/does not contain/);
    expect(p([{ zh: '大', en: 'Big.' }, ok])).toMatch(/5–16/);
    expect(p([{ zh: '我们家很大', en: 'Our home is big.' }, ok])).toMatch(/end/);
    expect(p([{ zh: '我们家很大。', en: '我们 home.' }, ok])).toMatch(/English/);
    expect(p([{ zh: '我们家很大。', en: 'our home is big.' }, ok])).toMatch(/capital/);
    expect(p([ok, ok])).toMatch(/same/);
    expect(p([{ zh: '我们家很大。', en: 'Our home is big.' }])).toMatch(/two sentences/);
  });
});

describe('the written sentences (every file in src/content/sentences)', () => {
  it('every sentence follows the rules, and no two words share a sentence', () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    for (const term of SENTENCE_TERMS) {
      for (const w of inScopeWords(term)) {
        const s = sentencesFor(w.text);
        if (!s.length) continue;
        problems.push(...sentenceProblems(w.text, s));
        for (const x of s) {
          if (seen.has(x.zh)) problems.push(`${w.text}: "${x.zh}" is also ${seen.get(x.zh)}'s`);
          seen.set(x.zh, w.text);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('coverage (plan 2b): most of each term\'s words have two sentences', () => {
  // the writers skip words with no natural sentence from the taught characters, or that don't suit a 7-year-old (老婆, 丑闻,
  // 活该): those words skip the Understand rung. 65%, not the plan's 90% (ruling, 2026-10-06: 68–77% came out clean)
  it.each(['一上', '一下', '二上', '二下'])('%s: at least 65% of its words have two sentences', (term) => {
    const ws = inScopeWords(term);
    expect(ws.filter((w) => sentencesFor(w.text).length === 2).length).toBeGreaterThanOrEqual(Math.floor(ws.length * 0.65));
  });
});
