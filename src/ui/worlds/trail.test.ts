// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { P } from './kit/palette';
import { trailSvg, WORLD_TRAIL } from './trail';

const PALETTE = new Set(Object.values(P).map((c) => c.toLowerCase()));

describe("today's stops on a path drawn for each world (spec 2026-10-04 §3, phase D)", () => {
  it('every world has its own trail in palette colours, never an ink outline', () => {
    for (const w of WORLDS) {
      const svg = trailSvg(w.id);
      const used = [...svg.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
      expect(used.length, w.id).toBeGreaterThan(0);
      expect(used.filter((c) => !PALETTE.has(c)), w.id).toEqual([]);
      expect(svg.toLowerCase()).not.toContain('#2a2630');
      expect(WORLD_TRAIL[w.id]).toBeTruthy();
    }
  });
  it('the race track is a road with a dashed line; the block world steps on blocks; the yard has pebbles', () => {
    expect(trailSvg('race')).toContain('data-mark="dash"');
    expect(trailSvg('blocks')).toContain('data-mark="blocks"');
    expect(trailSvg('yard')).toContain('data-mark="stones"');
  });
  it('final review: each stroke has one line cap; the blocks are square (butt caps), the pebbles round', () => {
    for (const w of ['yard', 'race', 'blocks'] as const) for (const p of trailSvg(w).match(/<path[^>]*>/g)!) expect(p.match(/stroke-linecap=/g), `${w}: ${p}`).toHaveLength(1);
    expect(trailSvg('blocks')).toMatch(/stroke-linecap="butt"[^>]*data-mark="blocks"|data-mark="blocks"[^>]*stroke-linecap="butt"/);
    expect(trailSvg('yard')).toMatch(/stroke-linecap="round"[^>]*data-mark="stones"/);
  });
});

