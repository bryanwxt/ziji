// src/weeklist/match.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { State } from 'ts-fsrs';
import { ladderWords } from '../content/ladder';
import { makeCard, makeWord } from '../test/fixtures';
import { itemStatus, matchText } from './match';

describe('matchText (spec §3.4)', () => {
  const stored = new Map([['跑', makeWord('跑', { listName: 'old', listedAt: 5 })]]);
  it('a stored word is referenced, unchanged', () => {
    const m = matchText('跑', stored, 1);
    expect(m.kind).toBe('stored');
    expect(m.word).toBe(stored.get('跑'));
  });
  it('a ladder word is referenced by its w: id', () => {
    const lw = ladderWords()[0]!;
    expect(matchText(lw.text, new Map(), 1)).toMatchObject({ kind: 'ladder', word: { id: `w:${lw.text}` } });
  });
  it('a new word is a parent word with readingOf pinyin, no listedAt, not writeable', () => {
    const m = matchText('闪闪亮', new Map(), 7, () => 'u1');
    expect(m.kind).toBe('new');
    expect(m.word).toMatchObject({ id: 'p:u1', source: 'parent', writeable: false, paused: false, createdAt: 7 });
    expect(m.word.listedAt).toBeUndefined();
    expect(m.word.pinyin.split(' ')).toHaveLength(3);
  });
});

describe('itemStatus (spec §5.2)', () => {
  const at = new Date(2026, 9, 19);
  it('new without a reading card, known in Review, learning otherwise, placed when placed', () => {
    const known = makeCard('b:a', 'recognise', at, true);
    const placed = { ...makeCard('b:b', 'recognise', at, true), placed: true as const };
    const learning = { ...makeCard('b:c', 'recognise', at), fsrs: { ...makeCard('b:c', 'recognise', at).fsrs, state: State.Learning } };
    const cards = new Map([known, placed, learning].map((c) => [c.id, c]));
    expect(['b:a', 'b:b', 'b:c', 'b:d'].map((id) => itemStatus(id, cards))).toEqual(['known', 'placed', 'learning', 'new']);
  });
});
