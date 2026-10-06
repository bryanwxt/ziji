// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { summarize } from './stats';
import { ladderWords } from '../content/ladder';

const card = (wordId: string, kind: 'hear' | 'understand' | 'recognise' | 'meaning' | 'write', passed?: number) => ({ ...makeCard(wordId, kind, new Date('2026-10-20')), ...(passed ? { passed } : {}) });

describe('honest counts (spec 2026-10-06 §3.3–3.4)', () => {
  it('a character is recognised when any word with it has passed Read: a single character or a ladder word', () => {
    const lw = ladderWords()[0]!;
    const k = summarize([makeWord('门')], [card('b:门', 'recognise', 1), card(lw.id, 'recognise', 1)]);
    expect([...k.knownChars].sort()).toEqual([...new Set(['门', ...Array.from(lw.text)])].sort());
    expect(k.known).toBe(k.knownChars.size);
  });
  it('a reading card not yet passed recognises nothing', () => {
    expect(summarize([makeWord('门')], [card('b:门', 'recognise')]).known).toBe(0);
  });
  it('heard, read, used and owned words, and characters written', () => {
    const w = makeWord('口', { examples: [] }); // no question to use it in: owned once heard and read
    const k = summarize([w], [card('b:口', 'hear', 1), card('b:口', 'understand', 1), card('b:口', 'recognise', 1), card('b:口', 'write', 1)]); // 口 has sentences: Understand counts too (plan 2b)
    expect(k).toMatchObject({ heard: 1, read: 1, used: 0, owned: 1, written: 1 });
  });
  it('words understood in a sentence (plan 2b)', () => {
    expect(summarize([makeWord('口')], [card('b:口', 'understand', 1)]).understood).toBe(1);
    expect(summarize([makeWord('口')], [card('b:口', 'understand')]).understood).toBe(0);
  });
  it('counts skip unknown words', () => {
    expect(summarize([], [card('w:没有了', 'recognise', 1)]).known).toBe(0);
  });
});
