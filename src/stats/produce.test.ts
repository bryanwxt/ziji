import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import type { CardRecord, ReviewLog } from '../types';
import { closestToProduce, lessonStars, produceChars, producedBetween, producedLine } from './produce';

const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
const passed = (wordId: string, kind: 'write' | 'say' | 'recognise', when: number): CardRecord => ({ ...makeCard(wordId, kind, new Date(2026, 10, 1)), passed: when });
const words = new Map([makeWord('森'), makeWord('林'), makeWord('木'), makeWord('森林', { id: 'w:森林' })].map((w) => [w.id, w]));
const wordOf = (id: string) => words.get(id);

describe('can produce (spec 2026-10-11 §3)', () => {
  it('the write cards and Say rungs that passed in the window; reading passes are not production', () => {
    const cards = [passed('b:森', 'write', at(2)), passed('b:林', 'say', at(2, 20)), passed('b:木', 'write', at(1)), passed('b:木', 'recognise', at(2))];
    expect(producedBetween(cards, at(2, 0), at(2, 21))).toEqual({ write: ['b:森'], say: ['b:林'] });
  });
  it('stars: one per newly produced character or word, never fewer than one', () => {
    expect(lessonStars({ write: 3, say: 2 })).toBe(5);
    expect(lessonStars({ write: 0, say: 0 })).toBe(1);
  });
  it('a 词语 said counts for the 词语, not its characters; writing counts each character', () => {
    const chars = produceChars([passed('w:森林', 'say', 1), passed('b:木', 'say', 1), passed('w:森林', 'write', 1)], wordOf);
    expect([...chars.say]).toEqual(['木']);
    expect([...chars.write].sort()).toEqual(['林', '森']);
  });
});

describe('closest (spec 2026-10-11 §5)', () => {
  const write = (wordId: string, d: number, correct = true): ReviewLog => ({ cardId: `${wordId}:write`, wordId, kind: 'write', at: at(d), rating: 3, correct, misses: 0 });
  const say = (wordId: string, d: number, correct = true): ReviewLog => ({ cardId: `${wordId}:say`, wordId, kind: 'say', at: at(d), rating: correct ? 3 : 1, correct });
  const card = (wordId: string, kind: 'write' | 'say') => makeCard(wordId, kind, new Date(2026, 10, 1));
  it('a write card with one passing day and a Say rung with one confirmed day, the most recent first', () => {
    const cards = [card('b:森', 'write'), card('b:林', 'say'), card('b:木', 'write')];
    const logs = [write('b:森', 3), say('b:林', 4), write('b:木', 2, false)];
    expect(closestToProduce(cards, logs, wordOf)).toEqual(['林', '森']);
  });
  it('not one that has passed, nor one with no day yet', () => {
    const cards = [{ ...card('b:森', 'write'), passed: at(4) }, card('b:林', 'say')];
    expect(closestToProduce(cards, [write('b:森', 3), say('b:林', 4, false)], wordOf)).toEqual([]);
  });
  it('at most three', () => {
    const ids = ['b:森', 'b:林', 'b:木', 'w:森林'];
    expect(closestToProduce(ids.map((id) => card(id, 'write')), ids.map((id, i) => write(id, i + 1)), wordOf)).toHaveLength(3);
  });
});

describe('the line under the stars (spec 2026-10-11 §5)', () => {
  it('what he can now do', () => {
    expect(producedLine({ write: 3, say: 2 }, [])).toBe('今天你会写 3 个新字，会说 2 个！');
    expect(producedLine({ write: 1, say: 0 }, [])).toBe('今天你会写 1 个新字！');
    expect(producedLine({ write: 0, say: 2 }, [])).toBe('今天你会说 2 个新字！');
  });
  it('else what is one day away, else nothing', () => {
    expect(producedLine({ write: 0, say: 0 }, ['森', '林'])).toBe('还差一天：森、林');
    expect(producedLine({ write: 0, say: 0 }, [])).toBeNull();
    expect(producedLine(undefined, undefined)).toBeNull(); // a lesson from before
  });
});
