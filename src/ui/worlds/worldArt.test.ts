// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { WorldId } from '../../fun/worlds';
import type { WorldArt } from './art';
import { P } from './kit/palette';
import { sceneFor, SCENES, WORLD_ART } from './scenes';

const PALETTE = new Set(Object.values(P).map((c) => c.toLowerCase()));
/** The evening light each world adds over its land (spec 2026-10-04 §2: "lamps or stars that suit the world"). */
const LIGHT: Record<WorldId, string> = { yard: 'lantern', grass: 'firefly', race: 'lamp', blocks: 'torch', dino: 'lava', sea: 'jelly', space: 'window', pirate: 'lamp' };
const paper = Object.entries(WORLD_ART) as [WorldId, WorldArt][];

describe('the storybook paper worlds (spec 2026-10-04 §2)', () => {
  it('these worlds are in storybook paper', () => expect(paper.map(([w]) => w)).toEqual(expect.arrayContaining(['yard', 'sea', 'space'])));
  for (const [w, a] of paper) {
    describe(w, () => {
      const day = sceneFor(w, 'afternoon');
      const evening = sceneFor(w, 'evening');
      it('no ink outlines and no live filters (spec §2, §6)', () => {
        for (const s of [day, evening]) {
          expect(s).not.toMatch(/<filter|filter=|feDropShadow|feGaussianBlur|feTurbulence/);
          expect(s.toLowerCase()).not.toContain('#2a2630');
        }
      });
      it('every colour comes from the one palette (spec §7)', () => {
        for (const s of [day, evening]) {
          const used = new Set([...s.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()));
          expect([...used].filter((c) => !PALETTE.has(c))).toEqual([]);
          expect(s).not.toMatch(/#[0-9a-f]{3}(?![0-9a-z])/i); // no short hex colours sneaking past the palette
        }
      });
      it('ids are unique and carry the world prefix, so scenes side by side (the room thumbnails) never clash', () => {
        for (const s of [day, evening]) {
          const ids = [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]!);
          expect(new Set(ids).size).toBe(ids.length);
          for (const id of ids) expect(id.startsWith(`${a.prefix}-`), id).toBe(true);
        }
      });
      it("Truffle's props are drawn where the world says they stand", () => {
        for (const [name, s] of Object.entries(a.props)) expect(day, name).toContain(`data-prop="${name}" transform="translate(${s.x} ${s.y})"`);
      });
      it('each tap box sits in the open sides (x ≤ 110 or ≥ 290), is at least 40×40, and is inside the band every screen shows (y 252–470)', () => {
        for (const [name, s] of Object.entries(a.props)) {
          expect(s.x + s.w / 2 <= 110 || s.x - s.w / 2 >= 290, `${name} spans x ${s.x - s.w / 2}–${s.x + s.w / 2}`).toBe(true);
          expect(Math.min(s.w, s.h), name).toBeGreaterThanOrEqual(40);
          expect(s.y - s.h, name).toBeGreaterThanOrEqual(252);
          expect(s.y, name).toBeLessThanOrEqual(470);
        }
      });
      it('no two tap boxes overlap', () => {
        const boxes = Object.entries(a.props);
        for (const [n1, p] of boxes) for (const [n2, q] of boxes) {
          if (n1 >= n2) continue;
          const apart = p.x + p.w / 2 <= q.x - q.w / 2 || q.x + q.w / 2 <= p.x - p.w / 2 || p.y <= q.y - q.h || q.y <= p.y - p.h;
          expect(apart, `${n1} × ${n2}`).toBe(true);
        }
      });
      it('evening swaps the sky (moon and stars behind the land), keeps the land, and adds its own lights over it', () => {
        expect(evening).toContain(a.land);
        if (w !== 'space') expect(evening).not.toContain(a.sky); // the moon base is always night: it keeps its sky
        if (w !== 'sea' && w !== 'space') expect(evening.indexOf('data-part="moon"')).toBeLessThan(evening.indexOf(a.land));
        expect(evening.slice(evening.indexOf(a.land) + a.land.length)).toContain(`data-part="${LIGHT[w]}"`);
      });
      it('morning and afternoon share the art; the room thumbnails show the day', () => {
        expect(sceneFor(w, 'morning')).toBe(day);
        expect(SCENES[w]).toBe(a.sky + a.land);
      });
      it('a scene stays a sensible size for the page (spec §6 bundle guard)', () => {
        expect(evening.length).toBeLessThan(20000);
      });
    });
  }
});
