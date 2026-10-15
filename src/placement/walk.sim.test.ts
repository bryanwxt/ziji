import { describe, expect, it } from 'vitest';
import { mulberry32, type Rng } from '../lib/random';
import { MAX_QUESTIONS, readsUpTo, startWalk, TERMS, walkStep } from './walk';

/**
 * The walk simulated (spec 2026-10-14 v2.1): 20,000 walks a child. A child who truly reads up to term L knows an asked (hard)
 * character of a term at or below L 90% of the time, of the next term 35%, and of any later term 10%; what he doesn't know he
 * guesses, right 1 time in 4 (four options none of which stands out). A guesser knows nothing.
 */
const N = TERMS.length;
const WALKS = 20_000;
const START = 2; // a P2 child in 二下 starts at 二上

function simulate(knows: (term: number) => number, rng: Rng, start = START) {
  const placed = new Map<number | null, number>();
  const lengths: number[] = [];
  let visits = 0;
  let passes = 0;
  for (let i = 0; i < WALKS; i++) {
    let s = startWalk(start, N);
    while (!s.done) {
      const before = s.passed.length;
      const correct = rng() < knows(s.term) || rng() < 0.25;
      s = walkStep(s, { style: 'read', wordId: `w${s.answers.length}`, correct }, N);
      if (s.visit.length === 0) { visits++; if (s.passed.length > before) passes++; } // a term decided
    }
    const r = readsUpTo(s);
    placed.set(r, (placed.get(r) ?? 0) + 1);
    lengths.push(s.answers.length);
  }
  lengths.sort((a, b) => a - b);
  const share = (...terms: (number | null)[]) => terms.reduce<number>((n, t) => n + (placed.get(t) ?? 0), 0) / WALKS;
  const mean = lengths.reduce((a, b) => a + b, 0) / WALKS;
  return { share, placed, passRate: passes / visits, median: lengths[WALKS / 2]!, p10: lengths[WALKS / 10]!, p90: lengths[(WALKS * 9) / 10]!, max: lengths.at(-1)!, mean };
}
const reader = (level: number) => (t: number) => (t <= level ? 0.9 : t === level + 1 ? 0.35 : 0.1);
const report = (name: string, r: ReturnType<typeof simulate>) =>
  process.stderr.write(`${name}: ${[...r.placed].sort((a, b) => (a[0] ?? -1) - (b[0] ?? -1)).map(([t, n]) => `${t === null ? 'none' : TERMS[t]} ${(100 * n / WALKS).toFixed(1)}%`).join(', ')} · questions median ${r.median} (p10 ${r.p10}, p90 ${r.p90}, mean ${r.mean.toFixed(1)}, max ${r.max}) · term pass rate ${(100 * r.passRate).toFixed(2)}%\n`);

describe('placement walk simulated, 20,000 walks (spec 2026-10-14 v2.1)', () => {
  it('a child who truly reads to 一上 places at 一上 or 一下 at least 90% of the time', () => {
    const r = simulate(reader(0), mulberry32(1));
    report('reads to 一上', r);
    expect(r.share(0, 1)).toBeGreaterThanOrEqual(0.9);
    expect(r.share(3, 4, 5)).toBeLessThan(0.01); // never near his class or above
  });
  it('a random guesser passes a term under 2% of the time, and almost never places', () => {
    const r = simulate(() => 0, mulberry32(2));
    report('random guesser', r);
    expect(r.passRate).toBeLessThan(0.02);
    expect(r.share(null)).toBeGreaterThan(0.95);
  });
  it('a child who reads to his class term (二下) places at 二上–三上, and typical walks take 12–18 questions', () => {
    const r = simulate(reader(3), mulberry32(3));
    report('reads to 二下', r);
    expect(r.share(3)).toBeGreaterThan(0.65);
    expect(r.share(2, 3, 4)).toBeGreaterThan(0.9);
    expect(r.median).toBeGreaterThanOrEqual(12);
    expect(r.median).toBeLessThanOrEqual(18);
    expect(r.max).toBeLessThanOrEqual(MAX_QUESTIONS);
  });
  it('typical walks for the 一上 reader and the guesser also take 12–18 questions', () => {
    for (const [name, k] of [['一上', reader(0)], ['guesser', () => 0]] as const) {
      const r = simulate(k, mulberry32(4));
      expect(r.median, name).toBeGreaterThanOrEqual(12);
      expect(r.median, name).toBeLessThanOrEqual(18);
    }
  });
  it('a strong reader (三下) from 二上 climbs off the top within 20', () => {
    const r = simulate(reader(5), mulberry32(5));
    report('reads to 三下', r);
    expect(r.share(5)).toBeGreaterThan(0.6);
    expect(r.max).toBeLessThanOrEqual(MAX_QUESTIONS);
  });
});
