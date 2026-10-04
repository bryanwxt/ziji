import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { MAX_QUESTIONS, placementLevels, rankBands, startWalk, walkStep, WARMUP, type Style, type WalkState } from './walk';

const ans = (correct: boolean, style: Style = 'read') => ({ style, wordId: 'x', correct });
const run = (s: WalkState, pattern: boolean[], n = 30) => pattern.reduce((st, c) => (st.done ? st : walkStep(st, ans(c), n)), s);
const warm = (n = 30) => run(startWalk(n), Array(WARMUP).fill(true), n);

describe('placement walk (spec §19 part 6)', () => {
  it('30 bands of 100 characters in rank order', () => {
    const bands = rankBands(builtinWords(0));
    expect(bands).toHaveLength(30);
    expect(bands.every((b) => b.length === 100)).toBe(true);
    expect(bands[0]![0]!.rank!).toBeLessThan(bands[1]![0]!.rank!);
  });
  it('starts at band 7 after 3 unscored warm-up questions', () => {
    const s = warm();
    expect([s.band, s.answers.length]).toEqual([6, 0]);
  });
  it('steps up after 3 or 4 right, down after 0 or 1, and visits a band again after 2 (then down)', () => {
    expect(run(warm(), [true, true, true, false]).band).toBe(7);
    expect(run(warm(), [true, false, false, false]).band).toBe(5);
    const twice = run(warm(), [true, true, false, false]);
    expect(twice.band).toBe(6);
    expect(run(twice, [true, true, false, false]).band).toBe(5);
  });
  it('stops at the second turn', () => {
    let s = run(warm(), [true, true, true, true]); // up to 7
    s = run(s, [false, false, false, false]); // turn 1: down to 6
    expect(s.done).toBe(false);
    s = run(s, [true, true, true, true]); // turn 2
    expect(s.done).toBe(true);
  });
  it('stops after 40 scored questions: a strong reader climbs 10 bands (band 7 → 16)', () => {
    let s = warm();
    for (let i = 0; i < 30 && !s.done; i++) s = run(s, [true, true, true, true]);
    expect(s.done).toBe(true);
    expect(s.answers).toHaveLength(MAX_QUESTIONS);
    expect(placementLevels(s.answers).reading).toBe(15);
  });
  it('knows nothing: walks down to the first band, misses it, and ends', () => {
    let s = run(startWalk(30), [false, false, false]);
    for (let i = 0; i < 10 && !s.done; i++) s = run(s, [false, false, false, false]);
    expect(s.done).toBe(true);
    expect(placementLevels(s.answers)).toEqual({ reading: -1, understanding: -1 });
  });
  it('passing the top band ends the check', () => {
    let s = warm(8); // a short content set: band 7 of 8 is the start
    s = run(s, [true, true, true, true], 8); // 6 → 7
    s = run(s, [true, true, true, true], 8); // past the top
    expect(s.done).toBe(true);
    expect(placementLevels(s.answers).reading).toBe(7);
  });
});

describe('placementLevels: reading and understanding', () => {
  const at = (band: number, style: Style, correct: boolean) => ({ band, style, wordId: `${band}${style}`, correct });
  it('reading = the highest band whose reading questions hold; understanding = the same for 选一选, never above reading', () => {
    const answers = [
      at(6, 'read', true), at(6, 'real', true), at(6, 'fill', true), at(6, 'fit', true),
      at(7, 'read', true), at(7, 'listen', true), at(7, 'fill', false), at(7, 'fit', false),
      at(8, 'read', false), at(8, 'real', false), at(8, 'fill', false), at(8, 'fit', true),
    ];
    expect(placementLevels(answers)).toEqual({ reading: 7, understanding: 6 });
  });
  it('bands below the first one visited count as held', () => {
    expect(placementLevels([at(6, 'read', true), at(6, 'read', true), at(6, 'real', true), at(6, 'fit', true)])).toEqual({ reading: 6, understanding: 6 });
  });
  it('nothing held at the first band visited: everything below it', () => {
    expect(placementLevels([at(3, 'read', false), at(3, 'real', false), at(3, 'fill', false), at(3, 'fit', false)])).toEqual({ reading: 2, understanding: 2 });
  });
});
