// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { buildRound } from './round';

const all = () => true;

describe('练一练 on the ladder (spec 2026-10-06 §3.2)', () => {
  it('a word whose hear card is due is first asked by ear, and that answer grades its hear card', () => {
    const items = buildRound([{ wordId: 'b:门', isNew: false, from: 1, appearances: 2, gradesRecognise: false, gradesMeaning: false, gradesHear: true, due: true }], all, mulberry32(1));
    expect(items[0]).toMatchObject({ wordId: 'b:门', ask: 'hear', grades: 'hear' });
    expect(items[1]?.grades).toBeNull();
  });
  it('rung 1 can be asked by ear or read for meaning, as well as read aloud', () => {
    const asks = new Set<string>();
    for (let s = 1; s < 40; s++) {
      const items = buildRound([{ wordId: 'w:门口', isNew: true, from: 1, appearances: 1, gradesRecognise: false, gradesMeaning: false }], (_id, a) => a === 'hear' || a === 'meaningRead', mulberry32(s));
      asks.add(items[0]!.ask);
    }
    expect([...asks].sort()).toEqual(['hear', 'meaningRead']);
  });
});
