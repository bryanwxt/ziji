// src/ui/truffle/timelines.test.ts
import { describe, expect, it } from 'vitest';
import { REACTIONS, REST, TRACKS } from './timelines';

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
