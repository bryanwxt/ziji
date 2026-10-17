// src/weeklist/match.ts
// A list item is an existing word by id, never a copy (weekly list spec 2026-10-17 §3.4): a stored word, then a ladder 词语 (his
// progress lives on its w: cards), then a new parent word. Its status comes from its reading card (§5.2).
import { State } from 'ts-fsrs';
import { glossFor } from '../content/glossary';
import { ladderId, ladderWord } from '../content/ladder';
import { readingOf } from '../content/wordGate';
import { newId as uuid } from '../lib/id';
import type { CardRecord, ItemStatus, Word } from '../types';

export function matchText(text: string, stored: ReadonlyMap<string, Word>, now: number, newId: () => string = uuid): { kind: 'stored' | 'ladder' | 'new'; word: Word } {
  const have = stored.get(text);
  if (have) return { kind: 'stored', word: have };
  const lw = ladderWord(ladderId(text));
  if (lw) return { kind: 'ladder', word: lw };
  const meaning = glossFor(text);
  return {
    kind: 'new',
    word: { id: `p:${newId()}`, text, pinyin: readingOf(text), level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: now, ...(meaning ? { meaning } : {}) },
  };
}

export function itemStatus(wordId: string, cards: ReadonlyMap<string, CardRecord>): ItemStatus {
  const c = cards.get(`${wordId}:recognise`);
  if (!c) return 'new';
  if (c.placed) return 'placed';
  return c.fsrs.state === State.Review ? 'known' : 'learning';
}
