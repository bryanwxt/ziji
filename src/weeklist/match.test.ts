// src/weeklist/match.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { State } from 'ts-fsrs';
import { glossFor } from '../content/glossary';
import { kidGlossTexts } from '../content/kidGloss';
import { ladderWord, ladderWords } from '../content/ladder';
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

describe('matchText fills a new word in', () => {
  it('its meaning from glossFor', () => {
    const text = kidGlossTexts().find((t) => [...t].length === 2 && !ladderWord(`w:${t}`))!; // a glossed word the ladder lacks
    const m = matchText(text, new Map(), 1);
    expect(m.kind).toBe('new');
    expect(m.word.meaning).toBe(glossFor(text));
    expect(m.word.meaning).toBeTruthy();
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
  it('a word begun by ear (a hear card, no reading card yet) is learning, not new (final review 2026-10-17)', () => {
    const hear = makeCard('b:e', 'hear', at, true);
    expect(itemStatus('b:e', new Map([[hear.id, hear]]))).toBe('learning');
  });
});
