import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { mulberry32 } from '../lib/random';
import { visitStyles } from './questions';
import { LOW_START, MAX_QUESTIONS, placementLevels, rankBands, startWalk, walkStep, WARMUP, type Style, type WalkState } from './walk';

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
    expect(placementLevels(s.answers)).toEqual({ reading: -1, understanding: -1, listening: -1 });
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
      at(6, 'read', true), at(6, 'read', true), at(6, 'fill', true), at(6, 'fit', true),
      at(7, 'read', true), at(7, 'read', true), at(7, 'fill', false), at(7, 'fit', false),
      at(8, 'read', false), at(8, 'read', false), at(8, 'fill', false), at(8, 'fit', true),
    ];
    expect(placementLevels(answers)).toEqual({ reading: 7, understanding: 6, listening: -1 });
  });
  it('bands below the first one visited count as held', () => {
    expect(placementLevels([at(6, 'read', true), at(6, 'read', true), at(6, 'fill', true), at(6, 'fit', true)])).toEqual({ reading: 6, understanding: 6, listening: -1 });
  });
  it('nothing held at the first band visited: everything below it', () => {
    expect(placementLevels([at(3, 'read', false), at(3, 'read', false), at(3, 'fill', false), at(3, 'fit', false)])).toEqual({ reading: 2, understanding: 2, listening: -1 });
  });
});

describe('children who guess (review of plan 14)', () => {
  const CHANCE: Record<Style, number> = { read: 0.25, hear: 0.25, fill: 0.25, fit: 0.25 };
  /** Walks a simulated child: right with probability `p(band, style)`. */
  const simulate = (seed: number, p: (band: number, style: Style, warm: boolean) => number) => {
    const rng = mulberry32(seed);
    let s = startWalk(30);
    let queue: Style[] = [];
    let prev: Style | null = null;
    while (!s.done) {
      const warm = s.warmup < WARMUP;
      let style: Style = 'read';
      if (!warm) { if (!queue.length) queue = visitStyles(prev, false, rng); style = queue.shift()!; }
      prev = style;
      s = walkStep(s, { style, wordId: 'x', correct: rng() < p(s.band, style, warm) }, 30);
    }
    return s;
  };
  it('a child who knows nothing but taps answers at random is rarely placed, and almost never high', () => {
    const runs = Array.from({ length: 1000 }, (_, i) => placementLevels(simulate(i + 1, (_b, style) => CHANCE[style]).answers).reading);
    expect(runs.filter((r) => r >= 0).length / runs.length).toBeLessThan(0.25); // was 0.65 with 真的假的 (a 50/50 guess) and no low start
    expect(runs.filter((r) => r >= 5).length / runs.length).toBeLessThan(0.03); // was 0.19
  });
  it('an honest child who guesses above their level is still placed right most of the time', () => {
    for (const [T, need] of [[4, 0.85], [8, 0.75]] as const) {
      const runs = Array.from({ length: 500 }, (_, i) => placementLevels(simulate(i + 7, (band, style, warm) => (warm || band <= T ? 0.9 : CHANCE[style])).answers).reading);
      expect(runs.filter((r) => r === T).length / runs.length).toBeGreaterThan(need);
    }
  });
  it('a shaky warm-up (at most 1 of 3 right) starts the walk at band 3', () => {
    expect(run(startWalk(30), [false, true, false]).band).toBe(LOW_START);
    expect(run(startWalk(30), [true, true, false]).band).toBe(6);
  });

});

describe('不知道 (parent, 2026-10-05: tapping it over and over took 15 taps to end)', () => {
  const dk = { style: 'read' as Style, wordId: 'x', correct: false, dontKnow: true };
  const taps = (s: WalkState, steps: (boolean | 'dk')[], n = 30) =>
    steps.reduce((st, c) => (st.done ? st : walkStep(st, c === 'dk' ? dk : ans(c), n)), s);
  const count = (s: WalkState, n = 30) => { let st = s; let k = 0; while (!st.done && k < 100) { st = walkStep(st, dk, n); k++; } return k; };

  it('all 不知道 from the start ends after 6 taps: 3 warm-up, then 3 at the first band', () => {
    expect(count(startWalk(30))).toBe(6);
    const s = taps(startWalk(30), ['dk', 'dk', 'dk', 'dk', 'dk', 'dk']);
    expect(placementLevels(s.answers).reading).toBe(-1);
  });
  it('a warm-up of only 不知道 starts at the first band', () => {
    expect(taps(startWalk(30), ['dk', 'dk', 'dk']).band).toBe(0);
    expect(taps(startWalk(30), ['dk', false, 'dk']).band).toBe(LOW_START); // a guess among them: the shaky start as before
  });
  it('3 不知道 in a row end that visit and step down; each further one steps down again', () => {
    const s = taps(warm(), ['dk', 'dk', 'dk']);
    expect([s.band, s.visit.length]).toEqual([5, 0]);
    expect(taps(s, ['dk']).band).toBe(4);
    expect(taps(s, ['dk', 'dk']).band).toBe(3);
  });
  it('one 不知道 among guesses counts as a miss, nothing more', () => {
    expect(taps(warm(), [true, 'dk', true, true]).band).toBe(7);
    expect(taps(warm(), ['dk', 'dk', true, 'dk']).visit.length).toBe(0); // a right answer breaks the run: the visit runs its 4
    expect(taps(warm(), ['dk', 'dk', true, 'dk']).band).toBe(5);
  });
});

describe('the listening level (spec 2026-10-06 §3.5)', () => {
  let n = 0;
  const at = (band: number, style: Style, correct: boolean) => ({ band, style, wordId: `b:${band}${style}${n++}`, correct });
  it('is the highest band where 3/4 of his 听一听 answers at or below it are right, over 3 or more', () => {
    const r = placementLevels([at(4, 'hear', true), at(5, 'hear', true), at(5, 'read', true), at(6, 'hear', true), at(7, 'hear', false), at(7, 'read', false)]);
    expect(r.listening).toBe(7); // 3/3 up to 6, and 3/4 up to 7 still holds…
    expect(placementLevels([at(4, 'hear', true), at(5, 'hear', true), at(6, 'hear', true), at(7, 'hear', false), at(7, 'hear', false)]).listening).toBe(6); // …but 3/5 up to 7 doesn't
  });
  it('one or two lucky answers place nothing', () => {
    expect(placementLevels([at(6, 'hear', true), at(7, 'hear', true)]).listening).toBe(-1);
  });
  it('can be above his reading: he hears more than he reads', () => {
    const r = placementLevels([at(6, 'read', false), at(6, 'fill', false), at(6, 'hear', true), at(7, 'read', false), at(7, 'hear', true), at(8, 'hear', true)]);
    expect(r.reading).toBe(5);
    expect(r.listening).toBe(8);
  });
  it('a 听一听 answer says nothing about reading', () => {
    const r = placementLevels([at(6, 'hear', true), at(6, 'hear', true), at(6, 'read', false)]);
    expect(r.reading).toBe(5);
  });
  it('is -1 with no 听一听 answers at all (no voice)', () => {
    expect(placementLevels([at(6, 'read', true), at(6, 'fill', true)]).listening).toBe(-1);
  });
});

describe('the listening level holds up (final review I2)', () => {
  /** A voiced walk: right with 95% at or below his level for that skill, 25% (a guess) above it. */
  const walk = (seed: number, readTop: number, hearTop: number) => {
    const rng = mulberry32(seed);
    let s = startWalk(30);
    let prev: Style | null = null;
    let queue: Style[] = [];
    for (let i = 0; i < WARMUP; i++) s = walkStep(s, { style: 'read', wordId: 'x', correct: true }, 30);
    while (!s.done) {
      if (!queue.length) queue = visitStyles(prev, true, rng);
      const st = queue.shift()!;
      prev = st;
      const top = st === 'hear' ? hearTop : readTop;
      s = walkStep(s, { style: st, wordId: `${s.band}${st}${rng()}`, correct: rng() < (s.band <= top ? 0.95 : 0.25) }, 30);
    }
    return placementLevels(s.answers);
  };
  it('a child who hears nothing (a silent iPad, only guesses) is almost never placed as hearing', () => {
    const placed = Array.from({ length: 400 }, (_, i) => walk(i + 1, 6, -1)).filter((l) => l.listening >= 0).length;
    expect(placed).toBeLessThanOrEqual(20); // ≤5%: a wrong guess marks hundreds of words heard
  });
  it('a strong listener is still placed at or near his level', () => {
    const near = Array.from({ length: 400 }, (_, i) => walk(i + 1, 8, 8)).filter((l) => l.listening >= 7).length;
    expect(near).toBeGreaterThanOrEqual(360);
  });
});
