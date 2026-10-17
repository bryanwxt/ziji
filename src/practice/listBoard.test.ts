// @vitest-environment node
// A 连一连 board of a weekly list's pairs (weekly list spec 2026-10-17 §7.5).
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import type { WeekPair } from '../types';
import { listBoard } from './pairs';

const P = (left: string, right: string, wrong: [string, string, string], reading?: string): WeekPair => ({ left, right, wrong, ...(reading ? { reading } : {}) });
const wrongFor = (pairs: WeekPair[], l: string, r: string) => pairs.find((p) => p.left === l)!.wrong.includes(r);

describe('listBoard (spec §7.5)', () => {
  const pairs = [
    P('踢', '毽子', ['青菜', '风筝', '书包'], 'tī jiàn zi'),
    P('炒', '青菜', ['毽子', '风筝', '书包'], 'chǎo qīng cài'),
    P('放', '风筝', ['毽子', '青菜', '书包'], 'fàng fēng zheng'),
  ];
  it('three pairs whose every cross pair is a confirmed wrong, and one decoy object wrong for every left', () => {
    for (let seed = 1; seed < 20; seed++) {
      const b = listBoard(pairs, mulberry32(seed))!;
      expect(b.pairs).toHaveLength(3);
      expect(b.decoys?.[1]).toBe('书包');
      expect(b.right).toContain('书包');
      expect(b.right).toHaveLength(4);
      expect(b.left).toHaveLength(3); // no left decoy
      for (const [l] of b.pairs) for (const [, r] of b.pairs) if (pairs.find((p) => p.left === l)!.right !== r) expect(wrongFor(pairs, l, r)).toBe(true);
      // the board says each joined pair at its list reading
      expect(b.readings?.['炒青菜']).toBe('chǎo qīng cài');
    }
  });
  it('null when a cross pair is not confirmed wrong (炒毽子 is never asked as wrong unless the parent said so)', () => {
    const loose = [P('踢', '毽子', ['青菜', '风筝', '书包']), P('炒', '青菜', ['鸡蛋', '风筝', '书包']), P('放', '风筝', ['毽子', '青菜', '书包'])];
    expect(listBoard(loose, mulberry32(1))).toBeNull();
  });
  it('null with no decoy wrong for every left: the last pair would go by elimination', () => {
    const noDecoy = [P('踢', '毽子', ['青菜', '风筝', '鸡蛋']), P('炒', '青菜', ['毽子', '风筝', '书包']), P('放', '风筝', ['毽子', '青菜', '雨伞'])];
    expect(listBoard(noDecoy, mulberry32(1))).toBeNull();
  });
  it('null with fewer than three pairs', () => {
    expect(listBoard(pairs.slice(0, 2), mulberry32(1))).toBeNull();
  });
});

describe('the planned board is the board asked (fix round 2026-10-17)', async () => {
  const { listPracticeItems } = await import('../weeklist/plan');
  const { makeWord } = await import('../test/fixtures');
  it('a group of four pairs plans a board of three; rebuilt from its pairs with any seed, it holds the same three', () => {
    const four = [
      P('踢', '毽子', ['青菜', '风筝', '书包']), P('炒', '青菜', ['毽子', '风筝', '书包']), P('放', '风筝', ['毽子', '青菜', '书包']), P('拍', '皮球', ['毽子', '青菜', '风筝']),
    ];
    const items = four.map((p) => ({ wordId: `b:${p.left}`, text: p.left, from: 'both' as const, addedStatus: 'new' as const, last: { read: { at: 1, correct: true }, meaning: { at: 1, correct: true } } }));
    const list = { id: 'wl:b', name: 'B', createdAt: 0, readyBy: '2026-11-11', homeworkDue: '2026-11-13', items, pairs: four, fits: [] };
    const ws = new Map(items.map((i) => [i.wordId, makeWord(i.text)]));
    const xs = listPracticeItems([list], ws, new Date(2026, 10, 9, 9), new Set(items.map((i) => i.wordId)));
    const board = xs.find((x) => x.list?.pairs)!;
    expect(board.list!.pairs).toHaveLength(3);
    const planned = board.list!.pairs!.map((p) => `${p.left}${p.right}`).sort();
    for (let seed = 1; seed <= 200; seed++) expect(listBoard(board.list!.pairs!, mulberry32(seed))!.pairs.map(([l, r]) => l + r).sort()).toEqual(planned);
    expect(xs.filter((x) => !x.list?.pairs).map((x) => x.wordId)).toHaveLength(1); // the fourth is asked on its own
  });
});
