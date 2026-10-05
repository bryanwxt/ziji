import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { State } from 'ts-fsrs';
import { orderWriteItems, pickWriteUnits, writeCharTarget, type WriteItem, type WriteUnit } from './writing';
import { mulberry32 } from '../lib/random';
import { writingCue } from '../activities/writing/cue';

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

describe('final review I1: the order keeps characters apart whenever anything can come between', () => {
  const POOL = Array.from('一二三四五六七八九十人大小山水火木日月田');
  const charOf = (units: WriteUnit[], i: WriteItem) => units.find((u) => u.wordId === i.wordId)!.chars[i.at]!;
  it.each([6, 8, 9, 10])('random lessons of %i characters: never the same character twice in a row; a word split where it can be', (target) => {
    for (let seed = 1; seed <= 400; seed++) {
      const rng = mulberry32(seed);
      const units: WriteUnit[] = [];
      let used = 0, k = 0;
      while (used < target) {
        const len = rng() < 0.25 && used + 2 <= target ? 2 : 1;
        units.push({ wordId: `w${k}`, chars: POOL.slice(used, used + len), isNew: rng() < 0.7 });
        used += len; k++;
      }
      const items = orderWriteItems(units);
      const chars = items.map((i) => charOf(units, i));
      for (let i = 1; i < items.length; i++) expect(chars[i], `seed ${seed}: ${chars.join('')}`).not.toBe(chars[i - 1]);
      for (const u of units.filter((x) => x.isNew)) u.chars.forEach((_, at) => { // from memory: at least two others after the trace
        const t = items.findIndex((i) => i.wordId === u.wordId && i.at === at && i.pass === 'trace');
        const r = items.findIndex((i) => i.wordId === u.wordId && i.at === at && i.pass === 'recall');
        expect(r - t, `seed ${seed}`).toBeGreaterThanOrEqual(3);
      });
      for (const u of units) {
        const mine = items.filter((i) => i.wordId === u.wordId).length;
        if (mine * 2 > items.length) continue; // a word with most of the items can't be kept apart everywhere
        for (let i = 1; i < items.length; i++) expect(items[i]!.wordId === u.wordId && items[i - 1]!.wordId === u.wordId, `seed ${seed}: ${items.map((x) => x.wordId).join(' ')}`).toBe(false);
      }
    }
  });
});

describe('final review I2: a character comes once a lesson, and a repeated one is never shown beside its gap', () => {
  const now = new Date(2026, 9, 6, 10);
  it('a doubled word (妈妈) is one character to write; a character two words share is written once', () => {
    const words = [makeWord('妈妈', { id: 'p:1', source: 'parent', level: null, rank: null }), makeWord('新', { id: 'b:新' }), makeWord('新加坡', { id: 'p:2', source: 'parent', level: null, rank: null })];
    const cards = words.map((w, i) => makeCard(w.id, 'write', new Date(now.getTime() - (3 - i) * 3600_000)));
    const units = pickWriteUnits({ cards, words, newWordIds: [], practised: new Map(), level: 2, cutoff: now.getTime() + 86_400_000, target: 9 });
    expect(units.map((u) => u.chars.join(''))).toEqual(['妈', '新', '加坡']);
    expect(units[2]!.wordId).toBe('p:2');
  });
  it('the cue blanks every copy of the character', () => {
    const w = makeWord('一心一意', { id: 'p:3', source: 'parent', pinyin: 'yì xīn yí yì', sentences: [{ text: '我们要一心一意学习，不要东张西望。', pinyin: '' }] });
    expect(writingCue(w, 0).sentence).toContain('＿心＿意');
  });
});

describe('sweep: which characters', () => {
  const now2 = new Date(2026, 9, 6, 10);
  const base2 = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now2.getTime() + 86_400_000, target: 9 };
  it('a recent lesson word he has started misreading again is not written yet', () => {
    const words = [makeWord('一', { id: 'b:一' }), makeWord('二', { id: 'b:二' })];
    const lapsed = makeCard('b:一', 'recognise', new Date(2026, 9, 7));
    lapsed.fsrs = { ...lapsed.fsrs, state: State.Relearning };
    const cards = [lapsed, makeCard('b:二', 'recognise', new Date(2026, 9, 7))];
    const units = pickWriteUnits({ ...base2, cards, words, practised: new Map([['b:一', now2.getTime()], ['b:二', now2.getTime()]]) });
    expect(units.map((u) => u.wordId)).toEqual(['b:二']);
  });
  it('a due word whose strokes failed to load goes behind the other due words', () => {
    const words = [makeWord('甲', { id: 'b:甲', writeSkippedAt: now2.getTime() }), makeWord('乙', { id: 'b:乙' })];
    const cards = [makeCard('b:甲', 'write', new Date(now2.getTime() - 7200_000)), makeCard('b:乙', 'write', new Date(now2.getTime() - 3600_000))];
    expect(pickWriteUnits({ ...base2, cards, words }).map((u) => u.wordId)).toEqual(['b:乙', 'b:甲']);
  });
  it('a due word longer than the lesson\'s count is still written (on its own), never left forever', () => {
    const words = [makeWord('我们的新学校', { id: 'p:1', source: 'parent', level: null, rank: null })];
    const cards = [makeCard('p:1', 'write', new Date(now2.getTime() - 3600_000))];
    expect(pickWriteUnits({ ...base2, cards, words, target: 4 }).map((u) => u.chars.join(''))).toEqual(['我们的新学校']);
  });
});

