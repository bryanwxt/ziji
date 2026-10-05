import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { orderWriteItems, pickWriteUnits, writeCharTarget, type WriteUnit } from './writing';

const now = new Date(2026, 9, 6, 10);
const day = 86_400_000;
const base = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now.getTime() + day, target: 9 };

describe('how many characters (spec 2026-10-05 §5)', () => {
  it('8–10 a lesson, 6 at 20 minutes', () => {
    expect(writeCharTarget(20)).toBe(6);
    expect(writeCharTarget(25)).toBe(8);
    expect(writeCharTarget(30)).toBe(9);
    expect(writeCharTarget(45)).toBe(10);
  });
});

describe('which characters (spec §5)', () => {
  const ch = (t: string, level: 1 | 2 | 3, rank: number) => makeWord(t, { id: `b:${t}`, level, rank });
  it('due writing first, then today\'s and recent lesson words, then what he reads at his level going down — never above it, never unread', () => {
    const words = [ch('一', 1, 1), ch('二', 1, 2), ch('三', 1, 3), ch('四', 2, 50), ch('五', 2, 60), ch('高', 3, 400), ch('新', 2, 70), ch('未', 1, 4)];
    const cards = [
      makeCard('b:一', 'write', new Date(now.getTime() - 3600_000)), // due
      ...['b:二', 'b:三', 'b:四', 'b:五', 'b:高'].map((id) => makeCard(id, 'recognise', new Date(now.getTime() + 9 * day), true)),
      makeCard('b:二', 'recognise', new Date(now.getTime() + 9 * day), true),
    ];
    const units = pickWriteUnits({ ...base, cards, words, newWordIds: ['b:新'], practised: new Map([['b:三', now.getTime()]]) });
    expect(units.map((u) => u.wordId)).toEqual(['b:一', 'b:新', 'b:三', 'b:五', 'b:四', 'b:二']); // 高 is above his level; 未 he can't read
    expect(units[0]!.isNew).toBe(false);
    expect(units.slice(1).every((u) => u.isNew)).toBe(true);
  });
  it('counts characters, never splitting a word across lessons or passing 10', () => {
    const words = [makeWord('新加坡', { id: 'p:1', source: 'parent', level: null, rank: null }), ...['一', '二', '三', '四', '五', '六', '七'].map((t, i) => ch(t, 1, i))];
    const cards = [makeCard('p:1', 'write', now), ...['一', '二', '三', '四', '五', '六', '七'].map((t) => makeCard(`b:${t}`, 'recognise', new Date(now.getTime() + 9 * day), true))];
    const units = pickWriteUnits({ ...base, cards, words, target: 9 });
    expect(units.reduce((n, u) => n + u.chars.length, 0)).toBe(9);
    expect(units[0]!.chars).toEqual(['新', '加', '坡']);
  });
  it('leaves out paused and not-writeable words', () => {
    const words = [makeWord('一', { id: 'b:一', paused: true }), makeWord('二', { id: 'b:二', writeable: false })];
    const cards = words.map((w) => makeCard(w.id, 'recognise', new Date(now.getTime() + 9 * day), true));
    expect(pickWriteUnits({ ...base, cards, words })).toEqual([]);
  });
});

describe('the order (spec §5: mixed, traced once, from memory)', () => {
  const unit = (wordId: string, chars: string, isNew: boolean): WriteUnit => ({ wordId, chars: Array.from(chars), isNew });
  const key = (i: { wordId: string; at: number }) => `${i.wordId}#${i.at}`;
  it('a never-written character is traced once early, then written from memory later; others from memory only', () => {
    const items = orderWriteItems([unit('a', '一', false), unit('b', '二', true), unit('c', '三', false), unit('d', '四', false)]);
    expect(items.filter((i) => i.wordId === 'b').map((i) => i.pass)).toEqual(['trace', 'recall']);
    expect(items.filter((i) => i.wordId !== 'b').every((i) => i.pass === 'recall')).toBe(true);
    const at = items.map((i) => i.wordId).indexOf('b');
    expect(at).toBeLessThanOrEqual(1); // early
    expect(items.map((i) => i.wordId).lastIndexOf('b') - at).toBeGreaterThanOrEqual(3); // at least 2 others between
  });
  it('never the same character twice in a row; a two-character word is split and interleaved', () => {
    const items = orderWriteItems([unit('w', '朋友', true), unit('a', '一', true), unit('b', '二', false), unit('c', '三', false)]);
    for (let i = 1; i < items.length; i++) expect(key(items[i]!)).not.toBe(key(items[i - 1]!));
    for (let i = 1; i < items.length; i++) expect(items[i]!.wordId === 'w' && items[i - 1]!.wordId === 'w').toBe(false);
    expect(items.filter((i) => i.wordId === 'w').map((i) => i.at).sort()).toEqual([0, 0, 1, 1]);
  });
  it('marks the item that finishes each word (its rating)', () => {
    const items = orderWriteItems([unit('w', '朋友', false), unit('a', '一', true)]);
    expect(items.filter((i) => i.last).map((i) => i.wordId).sort()).toEqual(['a', 'w']);
    const lastW = items.map((i) => i.wordId).lastIndexOf('w');
    expect(items[lastW]!.last).toBe(true);
  });
  it('with little to write it still keeps a character apart from itself when anything can come between', () => {
    const items = orderWriteItems([unit('a', '一', true), unit('b', '二', false)]);
    expect(items.map(key)).toEqual(['a#0', 'b#0', 'a#0']);
  });
});

