// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { burstStyle, WORLD_BURST } from './burst';

describe("the celebration's sunburst (spec 2026-10-13 §6)", () => {
  it("every world has its own rays, taken from its painting", () => {
    for (const w of WORLDS) expect(burstStyle(w.id)).toMatch(/^--burst-a:#[0-9a-f]{6};--burst-b:#[0-9a-f]{6};--burst-glow:#[0-9a-f]{6}$/);
    expect(new Set(WORLDS.map((w) => WORLD_BURST[w.id].a)).size).toBe(WORLDS.length);
  });
});
