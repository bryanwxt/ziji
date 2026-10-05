// src/ui/truffle/timelines.test.ts
import { describe, expect, it } from 'vitest';
import { PAW_REST, PAW_TRACKS, REACTIONS, REST, TRACKS } from './timelines';

describe('body moves (spec §4.1, §4.4)', () => {
  it('a hop crouches first, rises with a stretch, lands with a squash and ends at rest', () => {
    const at = (t: number) => TRACKS.hop(t)!;
    expect(at(80).squash).toBeGreaterThan(0); // wind-up crouch
    expect(at(260).y).toBeLessThan(-10); // in the air
    expect(at(260).squash).toBeLessThan(0.01); // stretched or neutral while rising
    expect(TRACKS.hop(5000)).toBeNull(); // finished
  });
  it('every track ends exactly at rest (no stuck squash)', () => {
    for (const [name, tr] of Object.entries(TRACKS)) {
      let last = REST;
      for (let t = 0; t < 4000; t += 16) { const m = tr(t); if (!m) break; last = m; }
      expect(Math.abs(last.y) + Math.abs(last.squash) + Math.abs(last.shake) + Math.abs(last.lean), name).toBeLessThan(0.05);
    }
  });
  it('a wrong answer is curious, never sad: no squash-down sulk', () => {
    expect(REACTIONS.wrong.expr).toBe('curious');
  });
  it('the table of reactions matches the spec moments', () => {
    expect(REACTIONS.right).toMatchObject({ expr: 'happy', track: 'hop' });
    expect(REACTIONS.hard).toMatchObject({ expr: 'joy', track: 'bigHop' });
    expect(REACTIONS.streak).toMatchObject({ expr: 'content', track: 'purr' });
    expect(REACTIONS.newWord).toMatchObject({ expr: 'surprised', then: 'curious' });
    expect(REACTIONS.done).toMatchObject({ expr: 'joy', track: 'bigHop', then: 'proud' });
    expect(REACTIONS.excited.track).toBe('wiggle');
    expect(REACTIONS.pounce.track).toBe('pounce');
  });
});

describe('prop moments (spec 2026-10-04 §4.5)', () => {
  it('munching: content, with a chew that ends at rest', () => {
    expect(REACTIONS.munch.expr).toBe('content');
    expect(REACTIONS.munch.track).toBe('chew');
    expect(TRACKS.chew(200)!.y).toBeGreaterThan(0); // a dip of the head
    expect(TRACKS.chew(5000)).toBeNull();
  });
  it('watching: curious and still; admiring his statue: proud with a nod', () => {
    expect(REACTIONS.watch).toMatchObject({ expr: 'curious', track: null });
    expect(REACTIONS.proud).toMatchObject({ expr: 'proud', track: 'nod' });
  });
});

describe('paw moves (spec 2026-10-04 §4.6, phase E)', () => {
  const size = (p: typeof PAW_REST) => Math.abs(p.lx) + Math.abs(p.ly) + Math.abs(p.lr) + Math.abs(p.rx) + Math.abs(p.ry) + Math.abs(p.rr);
  it('every paw move starts and ends at rest, then stops', () => {
    for (const [name, tr] of Object.entries(PAW_TRACKS)) {
      expect(size(tr(0)!), `${name} start`).toBeLessThan(0.05);
      let last = PAW_REST;
      let t = 0;
      for (; t < 6000; t += 16) { const p = tr(t); if (!p) break; last = p; }
      expect(t, `${name} ends`).toBeLessThan(6000);
      expect(size(last), `${name} end`).toBeLessThan(0.05);
    }
  });
  it('covering his eyes brings both paws up to his eyes; a wave is the right paw only', () => {
    const peak = (tr: (t: number) => typeof PAW_REST | null) => { let best = PAW_REST; for (let t = 0; t < 4000; t += 16) { const p = tr(t); if (!p) break; if (size(p) > size(best)) best = p; } return best; };
    const c = peak(PAW_TRACKS.cover);
    expect(c.ly).toBeLessThanOrEqual(-140);
    expect(c.ry).toBeLessThanOrEqual(-140);
    const w = peak(PAW_TRACKS.wave);
    expect(w.ry).toBeLessThan(-40);
    expect(Math.abs(w.ly) + Math.abs(w.lx) + Math.abs(w.lr)).toBe(0);
  });
  it('which reactions use which paws', () => {
    expect(REACTIONS.right.paws).toBe('raise');
    expect(REACTIONS.hard.paws).toBe('clap');
    expect(REACTIONS.done.paws).toBe('clap');
    expect(REACTIONS.streak.paws).toBe('knead');
    expect(REACTIONS.purr.paws).toBe('knead');
    expect(REACTIONS.pounce.paws).toBe('swat');
    expect(REACTIONS.hello).toMatchObject({ expr: 'happy', track: 'hop', paws: 'wave' });
    expect(REACTIONS.peek).toMatchObject({ expr: 'embarrassed', paws: 'cover' });
    expect(REACTIONS.huff).toMatchObject({ expr: 'grumpy', track: 'shake' });
    expect(REACTIONS.bouncy).toMatchObject({ expr: 'joy', track: 'bigHop', paws: 'wave' });
    expect(REACTIONS.wrong.paws).toBeUndefined(); // never anything that could read as sad or scolding
  });
});

