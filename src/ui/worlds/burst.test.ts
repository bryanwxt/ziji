// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { P } from './kit/palette';
import { burstStyle, WORLD_BURST } from './burst';

describe("the celebration's sunburst (spec 2026-10-04 §3)", () => {
  it('every world has its own rays, in palette colours', () => {
    const palette = new Set(Object.values(P) as string[]);
    for (const w of WORLDS) {
      for (const c of Object.values(WORLD_BURST[w.id])) expect(palette.has(c), `${w.id} ${c}`).toBe(true);
      expect(burstStyle(w.id)).toMatch(/^--burst-a:#[0-9a-f]{6};--burst-b:#[0-9a-f]{6};--burst-glow:#[0-9a-f]{6}$/);
    }
  });
});
