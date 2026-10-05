# 字己 ZiJi — Stage Phase C: the other worlds, prop moments and evening light — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw 草丛, 赛车山, 方块世界, 恐龙谷, 海底, 月球基地 and 海盗岛 in the storybook paper style of phase A's yard, each with Truffle's own props. On Home, Truffle plays with those props through tapped and self-starting "prop moments", which host the daily finds. Every world also gets an evening that is easy to see.

**Architecture:**
- **Art model.** Every world becomes a `WorldArt` with these parts:
  - a `sky`;
  - the `land` in front of it;
  - named prop spots, each with a tap box.
- **Drawing.** Worlds are drawn from one shared palette and a paper kit: layers, shadows as shapes, and props drawn around their ground point.
- **Evening.** Evening swaps the sky (moon and stars go in the sky, behind the land) and adds the world's own lights over the land.
- **Moments.** On Home, `WorldProps` replaces `WorldTaps`. A pure `runMoment()` decides what a tap does (finds, bubble lines, sounds, Truffle's reaction). `momentFx()` draws the moving prop in a fresh SMIL `<svg>` while the still prop in the scene is hidden.
- **Truffle.** Through `Pet`, Truffle reacts with the rig from phase B and looks at the prop.

**Tech Stack:** Vite 7, Preact 10, TypeScript 5.9, Vitest 4 (jsdom), SVG strings + SMIL, Playwright-core 1.52 WebKit (`npm run fit`, `scripts/stage-cases.ts`).

**Spec:** `docs/superpowers/specs/2026-10-04-ziji-stage-design.md`
- Phase C row of §8: "草丛 → 海盗岛 redrawn with props, prop moments, evening light".
- §2: the look and the props table.
- §4.5 (second half): prop moments.
- §6: performance.
- §7: the units.
- §9: testing.
- §10: the parent's decisions.

**Prototype:** every world's art in this plan was rendered in WebKit before the plan was written (day, evening and one frame of each world's main moment). The code below is that code.

## Global Constraints

**World art:**
- **No ink outlines.** "No black ink outlines on world art. Truffle keeps his ink outline." No `#2a2630` in any world, its evening or its moments. The collectibles keep their ink look, because they are the 字卡 collection's art: the zodiac animal faces, the gem and the baby dino in `tapArt.ts`.
- **No live filters.** "No live SVG filters on moving parts: drop shadows on world layers are drawn as offset shapes. The paper grain is one static tiled image over the scene."
- **One palette.** "One shared palette file holds all colours" (`src/ui/worlds/kit/palette.ts`). Every hex colour in every world and every evening comes from it.

**Composition:**
- **Calm middle.** "The centre-right of landscape and the upper middle of portrait stay quiet: sky and soft ground only, because the lesson card sits there. Detail lives at the left and right edges and in the foreground."
- **Canvas.** 360×480. The ground is at y ≥ 300. Each prop is drawn around the point where it touches the ground.
- **Tap boxes.** Every tap box sits at x ≤ 110 or x ≥ 290, clear of Home's path and Truffle. That is the rule from the old `WorldTaps` test.
  - Each box is at least 40×40 scene units.
  - Each box sits inside y 252–470, the band a landscape iPad Air's Home still shows.
  - No two boxes overlap.

**Finds and moments:**
- **Finds unchanged.** One new animal a day, one gem a day after three cracks, one dig star a day, and the egg remembered. Yesterday's taps never count toward today.
- **Auto moments never award finds.**
- "Some moments start themselves on Home (every so often when idle). Others start when the child taps the prop." Truffle "reacts to his own props without walking across the screen".

**Reduced motion:** nothing moves, and things that appear only fade. No moments start by themselves.

**Child screens:**
- Chinese only, no emoji. `src/childEmoji.test.ts` already scans `src/ui/worlds`.
- Labels on props are Chinese `aria-label`s.

**IP:** borrow mechanics only, never Pokémon/Minecraft IP. The blocks are plain paper squares, with no creepers, ores or tools from the game.

**Performance:** "script and layout stay at or under 8 ms per frame during idle and during each reaction". That now includes each moment, measured in stage-cases.

**Bundle (plan decision; the parent sees it in the handoff):**
- Spec §6 says "Worlds load as separate chunks". This plan keeps them in the main chunk.
- Why: the paper worlds are about 25 KB of drawing code, which replaces 36 KB of ink strings, so the bundle shrinks. Splitting them would make Home paint an empty sky first.
- The guard is a size test: each scene stays under 20 000 characters.
- Revisit if world art ever passes 100 KB.

**Shipping:**
- Spec §2: "Each world is reviewed by the parent in WebKit screenshots before it ships, and props can change."
- Deploy follows the parent's standing instruction of 2026-10-05: each phase ships when done, and the WebKit screenshots of every world go to the parent with the report.

## Review Focus

1. **Taps that race a moment.** This covers a second tap while a moment plays, a tap while a self-started moment plays, and fast tapping on the gem block. The moment plays once; finds and bonus stars are never given twice. Pinned in Task 8: "a tap during a moment is ignored" and "self-started moments never give finds".
2. **A hidden prop always comes back.** The still prop is hidden while its moving copy plays. It is shown again when the moment ends, when another moment starts, and when Home goes away mid-moment (the child taps 开始). A missing ball on the next visit would be a bug. Pinned in Task 8: "hides the prop while it moves and shows it again", "a prop hidden mid-moment comes back when Home goes away".
3. **Days.** Home left open past midnight, or a child who taps a find twice in one day: yesterday's gem taps don't count today, and there is one animal and one dig star a day. Pinned in Task 6 (`runMoment`) and Task 8 ("yesterday's taps don't count toward today's gem").
4. **Every tap box reachable at every size.** It is not under Home's cards, path, Truffle or the tab bar, and is inside the crop on a landscape iPad. Pinned by the tap-box band test in Task 1 and by the sweep's "world tap covered" probe in Task 10, run against every prop.
5. **Reduced motion and a hidden page.** No self-started moments, nothing moves, and finds still work by tap. Pinned in Task 8: "reduced motion: taps still find things, nothing starts by itself, nothing moves".

---

### Task 1: The paper kit, the palette, every prop's art, evening, and the yard on them

**Files:**
- Create:
  - `src/ui/worlds/kit/palette.ts`, `src/ui/worlds/art.ts`, `src/ui/worlds/evening.ts`;
  - `src/ui/worlds/legacy.ts` (the seven ink worlds until they are redrawn);
  - `src/ui/worlds/worldArt.test.ts`.
- Replace: `src/ui/worlds/kit/paper.ts`, `src/ui/worlds/kit/props.ts`, `src/ui/worlds/yard.ts`, `src/ui/worlds/scenes.ts`, `src/ui/worlds/WorldScene.tsx`.
- Modify: `src/ui/worlds/worlds.test.tsx`.
- Delete: `src/ui/worlds/yard.test.ts` (its rules move into `worldArt.test.ts`, for every world).

**Interfaces:**
- **Produces:**
  - `P` in `kit/palette.ts`: every world colour.
  - In `kit/paper.ts`: `grad`, `sky`, `layer`, `ground`, `groundShadow`, `glow`, `lift`, `cloud`, `leafyTree`, `tuft`, `tallGrass`, `flower`, `picketFence`, `rock`, `fern`, `palm`, `seaweed`, `block`, `star`, `shell`, `starfish`.
  - In `kit/props.ts`:
    - `PROP_ART: Record<string, string>`, each drawn around its ground point;
    - `prop(name, x, y)`;
    - the moving parts `BOWL`, `FOOD(rx)`, `EGG`, `CHEST_BASE`, `CHEST_LID`, `PARROT_BODY`, `PARROT_WING`, `BUTTERFLY`, `KART`, `FISH`, `SUB`, `ROCKET`, `FLAME`, `YARN`, `CONE`, `LEAF`, `LEAF_VEINS`;
    - the scenery `fencePost`, `blockTree`, `ship`.
  - `PropSpot { x, y, w, h }` and `WorldArt { prefix, sky, land, props }` in `art.ts`.
  - `eveningSky(world, daySky)` and `eveningLights(world)` in `evening.ts`.
  - In `scenes.ts`:
    - `WORLD_ART` (a `Partial` until Task 5);
    - `SCENES` (day, for thumbnails);
    - `sceneFor(world, time)`;
    - `SCENE_VIEWBOX`.
  - `YARD: WorldArt`.
- **Consumes:** `WorldId`, `TimeOfDay`, `WORLDS` from `src/fun/worlds.ts`.

- [ ] **Step 1: Write the failing tests.** Create `src/ui/worlds/worldArt.test.ts`. These rules apply to every world in `WORLD_ART`, so Tasks 2–5 get them for free:

```ts
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
  it('the yard is one of them', () => expect(paper.map(([w]) => w)).toContain('yard'));
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
```

Replace `src/ui/worlds/worlds.test.tsx` with the version below. It drops the old race-flag, upside-down-car and loud-colour tests: they guard ink art that Tasks 2–5 replace.

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { INK } from './legacy';
import { SCENES, WORLD_ART } from './scenes';
import { WorldScene } from './WorldScene';

describe('world scenes', () => {
  it('every world is drawn: in paper, or in ink until it is redrawn', () => {
    for (const w of WORLDS) expect(WORLD_ART[w.id] ?? INK[w.id], w.id).toBeTruthy();
  });
  it('a world still in ink keeps its ink rules (outlines, no gradients or filters)', () => {
    for (const w of WORLDS.filter((x) => !WORLD_ART[x.id])) {
      expect(SCENES[w.id]).toContain('#2a2630');
      expect(SCENES[w.id]).not.toMatch(/Gradient|<filter|url\(#/);
    }
  });
  it('WorldScene draws the world at its time of day, decorative only', () => {
    const { container } = render(<WorldScene world="yard" time="afternoon" />);
    const el = container.querySelector('.world-scene')!;
    expect(el.getAttribute('data-world')).toBe('yard');
    expect(el.getAttribute('data-time')).toBe('afternoon');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-prop="ball"]')).toBeTruthy();
    expect(container.querySelector('[data-part="moon"]')).toBeNull();
  });
  it('evening in the yard: the moon is up, and the lanterns hang in one group with their string (a lesson hides it)', () => {
    const { container } = render(<WorldScene world="yard" time="evening" />);
    expect(container.querySelector('[data-part="moon"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-part="lanterns"] [data-part="lantern"]')).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/ui/worlds/worldArt.test.ts src/ui/worlds/worlds.test.tsx`.
  - Expected: FAIL. `./kit/palette` and `./legacy` cannot be resolved, and `sceneFor` / `WORLD_ART` are not exported.

- [ ] **Step 3: Implement.**

Create `src/ui/worlds/kit/palette.ts`:

```ts
/** Every colour the storybook worlds use (spec 2026-10-04 §2, §7): clear sky blues, fresh greens, warm accents. */
export const P = {
  // paper and light
  shadow: '#2b3a2a', white: '#ffffff', cream: '#fffaf0', creamShade: '#f4ead2', paperSky: '#f6f1df',
  sun: '#ffd166', sunDeep: '#f4b942', warm: '#ffb86b', ember: '#ff7a45',
  // sky and cloud
  sky: '#a9dcf6', skyDeep: '#7cc6ee', cloudShade: '#dcebf5', mist: '#e7f3f8',
  // greens (leaves, hills, tufts)
  leaf1: '#4f9f55', leaf2: '#5fb262', leaf3: '#6cbd6a', leafLight: '#8fd486',
  far: '#c9e6cf', farLow: '#b9dcbf', farEdge: '#e2f2e3',
  hill1: '#b4e28e', hill1Low: '#93cf70', hill1Edge: '#d6f0b4',
  hill2: '#97d474', hill2Low: '#72bd55', hill2Edge: '#bfe79a',
  hill3: '#6fbd52', hill3Low: '#56a442', hill3Edge: '#93d070',
  tuft1: '#4a9e4a', tuft2: '#57ad52', stem: '#4f9a4a', grassTall: '#3f8f45',
  // earth, wood, stone
  trunk: '#9c6a40', wood: '#b8804c', woodDark: '#7a5233', woodLight: '#d9a066',
  dirt: '#c08a5a', dirtLow: '#a8744a', dirtEdge: '#d9a873',
  stone: '#a7adb5', stoneLow: '#8c939c', stoneEdge: '#c9ced4', rockWarm: '#c7b299', rockWarmLow: '#ad977c',
  // mountains far away
  peak: '#c3d3e6', peakLow: '#b2c4da', snow: '#f4f8fc',
  // sand and sea
  sand: '#f3dca6', sandLow: '#e6c88a', sandEdge: '#fbecc4',
  sea: '#7fcbe6', seaLow: '#5fb3d6', seaEdge: '#bfe8f5', deep: '#3f86b8', deepLow: '#2f6f9f', foam: '#e9f7fb',
  // space
  night: '#2c2f5e', nightLow: '#4a4a86', moonRock: '#cfcbe0', moonRockLow: '#b4afcb', moonEdge: '#e6e3f1', crater: '#a59fbe', glass: '#bfe6f4',
  // accents
  red: '#ef6f6c', redDeep: '#d9534f', coral: '#e2725b', orange: '#ff9f43', pink: '#ff8fa3', pinkSoft: '#f6cbd6', pinkDeep: '#f2b8c6',
  blush: '#fff2f2', lilac: '#c8b6ff', purple: '#9b7fd9', teal: '#4fc1b5', blue: '#5b9bd5', yellow: '#f6d28b', mint: '#7cc48a', mintDeep: '#5aa86a',
  brownFood: '#c98a5a', egg: '#fbf1d8', eggSpot: '#e8cfa0',
  // evening
  dusk: '#3d3a6b', duskTop: '#8f8cc4', duskLow: '#f6c9a8', duskSea: '#4a6fa5', duskSeaLow: '#2c4a7a', lamp: '#ffe29a',
} as const;
```

Replace `src/ui/worlds/kit/paper.ts`. It keeps phase A's primitives on the palette and adds the ones the new worlds need:

```ts
/** Storybook paper primitives for the worlds (spec 2026-10-04 §2): layers with a shade and a sunlit top edge, soft shadows
 *  drawn as shapes (never live filters, spec §6), no ink outlines. Every id is passed in, prefixed by the world. */
import { P } from './palette';

const f = (n: number) => +n.toFixed(1);

export const grad = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

/** The whole canvas: a sky (or water) gradient. */
export const sky = (id: string, top: string, bottom: string) => `<defs>${grad(id, top, bottom)}</defs><rect width="360" height="480" fill="url(#${id})"/>`;

/** A paper layer: a soft shadow under it, a light-to-dark shade, and a sunlit top edge along `edgeD`. */
export function layer(id: string, d: string, top: string, bottom: string, edge: string, edgeD: string): string {
  return `<defs>${grad(id, top, bottom)}</defs><path d="${d}" transform="translate(0 3)" fill="${P.shadow}" opacity=".14"/><path d="${d}" fill="url(#${id})"/><path d="${edgeD}" fill="none" stroke="${edge}" stroke-width="2" stroke-linecap="round"/>`;
}

/** A ground layer from its top edge (a path from x=0 to x=360): closed down to the bottom of the canvas. */
export const ground = (id: string, edgeD: string, top: string, bottom: string, edge: string) => layer(id, `${edgeD} V480 H0Z`, top, bottom, edge, edgeD);

/** A soft round shadow on the ground under something (a gradient, not a blur filter). */
export function groundShadow(id: string, cx: number, cy: number, rx: number, ry = 5): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${P.shadow}" stop-opacity=".22"/><stop offset="1" stop-color="${P.shadow}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
}

/** A soft light (evening lamps, a volcano's glow): a radial gradient, not a filter. */
export function glow(id: string, cx: number, cy: number, r: number, color: string, strength = 0.55): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`;
}

/** Lifts paper shapes off the page: the same shapes, dropped a little and darkened, behind them. */
export const lift = (markup: string) => `<g transform="translate(0 2.5)" fill="${P.shadow}" opacity=".14">${markup.replace(/fill="[^"]*"/g, '')}</g>${markup}`;

export function cloud(x: number, y: number, s = 1): string {
  const top = `<path d="M${x} ${y} a${18 * s} ${18 * s} 0 0 1 ${34 * s} ${-6 * s} a${14 * s} ${14 * s} 0 0 1 ${26 * s} ${8 * s} a${11 * s} ${11 * s} 0 0 1 ${-2 * s} ${22 * s} h${-58 * s} a${12 * s} ${12 * s} 0 0 1 0 ${-24 * s}Z" fill="${P.white}"/>`;
  const under = `<path d="M${x - 8 * s} ${y + 16 * s} h${70 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${8 * s} h${-58 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${-8 * s}Z" fill="${P.cloudShade}"/>`;
  return lift(top) + under;
}

/** A tree built from leaf clusters in three greens, with sunlit dots; (x, y) is the middle of the crown. */
export function leafyTree(x: number, y: number, s = 1): string {
  const c = (dx: number, dy: number, r: number, fill: string) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${fill}"/>`;
  const trunk = `<path d="M${x - 6 * s} ${y + 110 * s} C${x - 4 * s} ${y + 84 * s} ${x - 8 * s} ${y + 58 * s} ${x - 2 * s} ${y + 28 * s} L${x + 4 * s} ${y + 28 * s} C${x} ${y + 58 * s} ${x + 4 * s} ${y + 84 * s} ${x + 6 * s} ${y + 110 * s}Z" fill="${P.trunk}"/>`;
  const crown = c(-22, 20, 24, P.leaf1) + c(26, 20, 22, P.leaf1) + c(0, -8, 30, P.leaf2) + c(-22, -2, 20, P.leaf2) + c(22, -4, 22, P.leaf3) + c(4, 16, 24, P.leaf3);
  const lights = `<g opacity=".85">${c(-6, -18, 9, P.leafLight)}${c(18, -12, 7, P.leafLight)}${c(-26, -8, 6, P.leafLight)}</g>`;
  return lift(trunk) + lift(crown) + lights;
}

export function tuft(x: number, y: number, color: string, s = 1): string {
  return `<path d="M${x} ${y} q${-4 * s} ${-14 * s} ${-10 * s} ${-18 * s} q${8 * s} ${6 * s} ${10 * s} ${12 * s} q${1 * s} ${-12 * s} ${6 * s} ${-20 * s} q${2 * s} ${12 * s} ${2 * s} ${20 * s} q${4 * s} ${-8 * s} ${12 * s} ${-12 * s} q${-6 * s} ${8 * s} ${-8 * s} ${18 * s}Z" fill="${color}"/>`;
}

/** Tall grass: long blades leaning out from (x, y), for the meadow. */
export function tallGrass(x: number, y: number, s = 1, color: string = P.grassTall): string {
  const blade = (dx: number, h: number, lean: number) => `<path d="M${f(x + dx * s - 3 * s)} ${y} C${f(x + dx * s - 2 * s)} ${f(y - h * 0.5 * s)} ${f(x + (dx + lean * 0.4) * s)} ${f(y - h * 0.8 * s)} ${f(x + (dx + lean) * s)} ${f(y - h * s)} C${f(x + (dx + lean * 0.5) * s + 2 * s)} ${f(y - h * 0.7 * s)} ${f(x + dx * s + 3 * s)} ${f(y - h * 0.4 * s)} ${f(x + dx * s + 4 * s)} ${y}Z" fill="${color}"/>`;
  return blade(-14, 70, -14) + blade(-6, 92, -6) + blade(2, 104, 4) + blade(10, 84, 12) + blade(18, 64, 18);
}

export function flower(x: number, y: number, color: string, r = 4.5): string {
  const petals = [0, 1, 2, 3, 4].map((k) => { const a = (k * 2 * Math.PI) / 5; return `<circle cx="${(x + r * Math.cos(a)).toFixed(1)}" cy="${(y + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.75).toFixed(1)}" fill="${color}"/>`; }).join('');
  return `<path d="M${x} ${y + 3} q1 9 -1 16" stroke="${P.stem}" stroke-width="1.6" fill="none"/>${petals}<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${P.sun}"/>`;
}

/** A white picket fence with pointed tops; (x, y) is the top-left of the posts. */
export function picketFence(x: number, y: number, count: number): string {
  const posts = Array.from({ length: count }, (_, i) => `<path d="M${x + 4 + i * 15} ${y + 30} V${y} l5 -7 l5 7 V${y + 30}Z" fill="${P.cream}"/>`).join('');
  const rails = `<rect x="${x}" y="${y + 6}" width="${count * 15 + 4}" height="6" rx="2" fill="${P.creamShade}"/><rect x="${x}" y="${y + 20}" width="${count * 15 + 4}" height="6" rx="2" fill="${P.creamShade}"/>`;
  return lift(posts + rails);
}

/** A rounded boulder with a lit top; (x, y) is where it sits on the ground. */
export function rock(x: number, y: number, s = 1, fill: string = P.stone, light: string = P.stoneEdge): string {
  const body = `<path d="M${f(x - 22 * s)} ${y} C${f(x - 24 * s)} ${f(y - 14 * s)} ${f(x - 12 * s)} ${f(y - 26 * s)} ${f(x + 2 * s)} ${f(y - 26 * s)} C${f(x + 16 * s)} ${f(y - 26 * s)} ${f(x + 26 * s)} ${f(y - 14 * s)} ${f(x + 24 * s)} ${y}Z" fill="${fill}"/>`;
  return lift(body) + `<path d="M${f(x - 14 * s)} ${f(y - 16 * s)} C${f(x - 8 * s)} ${f(y - 23 * s)} ${f(x + 6 * s)} ${f(y - 24 * s)} ${f(x + 12 * s)} ${f(y - 19 * s)}" fill="none" stroke="${light}" stroke-width="${f(3 * s)}" stroke-linecap="round"/>`;
}

/** A fern: long pointed fronds fanning up from (x, y); `flip` mirrors it. */
export function fern(x: number, y: number, s = 1, flip = false, color: string = P.leaf1, light: string = P.leaf3): string {
  const k = flip ? -1 : 1;
  const frond = (ang: number, len: number, fill: string) => {
    const a = (ang * Math.PI) / 180;
    const tx = x + k * Math.sin(a) * len * s, ty = y - Math.cos(a) * len * s;
    const nx = Math.cos(a) * 9 * s * k, ny = Math.sin(a) * 9 * s;
    return `<path d="M${x} ${y} Q${f((x + tx) / 2 + nx)} ${f((y + ty) / 2 + ny)} ${f(tx)} ${f(ty)} Q${f((x + tx) / 2 - nx)} ${f((y + ty) / 2 - ny)} ${x} ${y}Z" fill="${fill}"/>`;
  };
  return lift(frond(-50, 52, color) + frond(-20, 70, light) + frond(10, 76, color) + frond(40, 60, light) + frond(68, 44, color));
}

/** A palm tree: a curved trunk from (x, y) leaning right, a crown of drooping leaves, two coconuts. */
export function palm(x: number, y: number, s = 1): string {
  const tx = x + 26 * s, ty = y - 130 * s;
  const trunk = `<path d="M${f(x - 8 * s)} ${y} C${f(x - 4 * s)} ${f(y - 50 * s)} ${f(x + 6 * s)} ${f(y - 100 * s)} ${f(tx - 5 * s)} ${f(ty)} L${f(tx + 5 * s)} ${f(ty + 2 * s)} C${f(x + 16 * s)} ${f(y - 98 * s)} ${f(x + 8 * s)} ${f(y - 50 * s)} ${f(x + 8 * s)} ${y}Z" fill="${P.wood}"/>`;
  const rings = [0.2, 0.4, 0.6, 0.8].map((t) => { const yy = y - 130 * s * t; const xx = x + 26 * s * t * t; return `<path d="M${f(xx - 7 * s)} ${f(yy)} q${f(7 * s)} ${f(3 * s)} ${f(14 * s)} 0" stroke="${P.woodDark}" stroke-width="1.6" fill="none" opacity=".5"/>`; }).join('');
  const leaf = (dx: number, dy: number, fill: string) => `<path d="M${f(tx)} ${f(ty)} Q${f(tx + dx * 0.5 * s)} ${f(ty + (dy - 26) * s)} ${f(tx + dx * s)} ${f(ty + dy * s)} Q${f(tx + dx * 0.45 * s)} ${f(ty + (dy - 12) * s)} ${f(tx)} ${f(ty)}Z" fill="${fill}"/>`;
  const crown = leaf(-58, 30, P.leaf1) + leaf(60, 34, P.leaf1) + leaf(-40, 6, P.leaf2) + leaf(44, 8, P.leaf2) + leaf(-10, -22, P.leaf3) + leaf(22, -20, P.leaf3);
  const nuts = `<circle cx="${f(tx - 4 * s)}" cy="${f(ty + 6 * s)}" r="${f(5 * s)}" fill="${P.woodDark}"/><circle cx="${f(tx + 5 * s)}" cy="${f(ty + 7 * s)}" r="${f(5 * s)}" fill="${P.woodDark}"/>`;
  return lift(trunk) + rings + lift(crown) + nuts;
}

/** Seaweed swaying up from (x, y). */
export function seaweed(x: number, y: number, h: number, color: string = P.leaf2): string {
  const w = 7;
  let d = `M${x - w} ${y}`;
  const steps = 5;
  for (let i = 1; i <= steps; i++) d += ` Q${x - w + (i % 2 ? 12 : -12)} ${f(y - (h * (i - 0.5)) / steps)} ${x - w * (1 - i / steps) * 0.6} ${f(y - (h * i) / steps)}`;
  for (let i = steps; i >= 1; i--) d += ` Q${x + w * 0.6 + (i % 2 ? 12 : -12)} ${f(y - (h * (i - 0.5)) / steps)} ${x + w * (1 - (i - 1) / steps)} ${f(y - (h * (i - 1)) / steps)}`;
  return lift(`<path d="${d}Z" fill="${color}"/>`);
}

/** A flat paper block (a cube seen from the front): a lit top band and a darker foot. (x, y) is its bottom-left. */
export function block(x: number, y: number, size: number, face: string, top: string, foot: string): string {
  return `<rect x="${x}" y="${y - size}" width="${size}" height="${size}" fill="${face}"/><rect x="${x}" y="${y - size}" width="${size}" height="${f(size * 0.22)}" fill="${top}"/><rect x="${x}" y="${f(y - size * 0.12)}" width="${size}" height="${f(size * 0.12)}" fill="${foot}"/>`;
}

/** A four-point sparkle star. */
export const star = (x: number, y: number, r: number, color: string = P.sun, part = '') =>
  `<path${part ? ` data-part="${part}"` : ''} d="M${x} ${f(y - r)} Q${f(x + r * 0.22)} ${f(y - r * 0.22)} ${f(x + r)} ${y} Q${f(x + r * 0.22)} ${f(y + r * 0.22)} ${x} ${f(y + r)} Q${f(x - r * 0.22)} ${f(y + r * 0.22)} ${f(x - r)} ${y} Q${f(x - r * 0.22)} ${f(y - r * 0.22)} ${x} ${f(y - r)}Z" fill="${color}"/>`;

/** A small shell and a starfish for sandy ground. */
export const shell = (x: number, y: number, color: string = P.pinkSoft) =>
  lift(`<path d="M${x - 8} ${y} Q${x} ${y - 16} ${x + 8} ${y}Z" fill="${color}"/>`) + `<path d="M${x} ${y} L${x} ${y - 9} M${x - 4} ${y} L${x - 2} ${y - 8} M${x + 4} ${y} L${x + 2} ${y - 8}" stroke="${P.white}" stroke-width="1.2" opacity=".7"/>`;
export function starfish(x: number, y: number, r = 8, color: string = P.coral): string {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; return `${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a) * 0.6)}`; });
  return lift(`<path d="M${pts.join(' L')}Z" fill="${color}"/>`);
}
```

Replace `src/ui/worlds/kit/props.ts`:

```ts
// Truffle's things in each world (spec 2026-10-04 §2), and the bits of scenery that go with them. Each prop is drawn
// around the point where it touches the ground, so a moment (moments.ts) can redraw it moving in the same place.
import { block, lift } from './paper';
import { P } from './palette';

// parts that moments animate on their own
export const BOWL = `<path d="M-13 -4 q13 9 26 0 l-3 4 q-10 5 -20 0Z" fill="${P.pinkDeep}"/><ellipse cx="0" cy="-4" rx="13" ry="3.5" fill="${P.pinkSoft}"/>`;
export const FOOD = (rx = 8) => `<ellipse data-part="food" cx="0" cy="-4.5" rx="${rx}" ry="2" fill="${P.brownFood}"/>`;
export const EGG = `<ellipse cx="0" cy="-12" rx="10" ry="13" fill="${P.egg}"/><circle cx="-4" cy="-16" r="2.2" fill="${P.eggSpot}"/><circle cx="4" cy="-8" r="2.6" fill="${P.eggSpot}"/><circle cx="3" cy="-19" r="1.6" fill="${P.eggSpot}"/>`;
export const NEST = lift(`<ellipse cx="0" cy="-3" rx="24" ry="8" fill="${P.wood}"/>`);
export const NEST_FRONT = `<path d="M-22 -4 q22 10 44 0 M-18 0 q18 7 36 0" stroke="${P.woodDark}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-24 -6 q24 6 48 0" stroke="${P.woodLight}" stroke-width="2" fill="none"/>`;
export const CHEST_BASE = lift(`<rect x="-20" y="-20" width="40" height="20" rx="2" fill="${P.wood}"/>`) + `<path d="M-14 -20 V0 M14 -20 V0" stroke="${P.sunDeep}" stroke-width="3"/><circle cx="0" cy="-10" r="3.4" fill="${P.woodDark}"/><circle cx="-4" cy="-15" r="1.6" fill="${P.woodDark}"/><circle cx="0" cy="-16.5" r="1.6" fill="${P.woodDark}"/><circle cx="4" cy="-15" r="1.6" fill="${P.woodDark}"/>`;
export const CHEST_LID = lift(`<path d="M-20 -20 C-20 -34 20 -34 20 -20Z" fill="${P.woodLight}"/>`) + `<path d="M-14 -20 C-14 -30 -12 -31 -12 -31 M14 -20 C14 -30 12 -31 12 -31" stroke="${P.sunDeep}" stroke-width="3" fill="none"/><rect x="-4" y="-24" width="8" height="9" rx="2" fill="${P.sun}"/>`;
export const PARROT_BODY = lift(`<path d="M0 0 C-12 -2 -14 -18 -6 -26 C0 -32 10 -30 12 -22 C14 -12 10 -2 0 0Z" fill="${P.red}"/><path d="M-2 0 l-4 16 l6 -8 l2 10 l2 -16Z" fill="${P.sun}"/>`) + `<path d="M10 -24 q8 2 6 10 q-4 -4 -6 -4Z" fill="${P.sun}"/><circle cx="4" cy="-22" r="3" fill="${P.white}"/><circle cx="5" cy="-22" r="1.6" fill="${P.night}"/>`;
export const PARROT_WING = `<path d="M-4 -4 C-2 -14 6 -16 10 -10 C8 -2 2 0 -4 -4Z" fill="${P.blue}"/>`;
export const BUTTERFLY = `<path d="M0 0 C-10 -14 -20 -6 -14 2 C-20 8 -10 14 0 4Z" fill="${P.pink}"/><path d="M0 0 C10 -14 20 -6 14 2 C20 8 10 14 0 4Z" fill="${P.sun}"/><path d="M0 -6 V8" stroke="${P.woodDark}" stroke-width="2" stroke-linecap="round"/><path d="M0 -6 l-4 -6 M0 -6 l4 -6" stroke="${P.woodDark}" stroke-width="1.2" stroke-linecap="round"/>`;
export const KART = `<path d="M-24 -6 C-24 -14 -16 -18 -6 -18 L8 -18 C14 -18 18 -14 22 -10 L26 -6 Z" fill="${P.red}"/><path d="M-26 -6 H28 V-1 H-26Z" fill="${P.redDeep}"/><path d="M-12 -18 V-27 Q-12 -30 -9 -30 H-3 Q0 -30 0 -27 V-18Z" fill="${P.redDeep}"/><circle cx="-16" cy="0" r="7" fill="${P.night}"/><circle cx="16" cy="0" r="7" fill="${P.night}"/><circle cx="-16" cy="0" r="2.6" fill="${P.stoneEdge}"/><circle cx="16" cy="0" r="2.6" fill="${P.stoneEdge}"/><path d="M-22 -18 V-46" stroke="${P.woodDark}" stroke-width="2.2" stroke-linecap="round"/><path d="M-22 -46 h18 l-4 6 l4 6 h-18Z" fill="${P.cream}"/><circle cx="-13" cy="-40" r="2.6" fill="${P.coral}"/><circle cx="-17" cy="-44" r="1.3" fill="${P.coral}"/><circle cx="-13" cy="-45.5" r="1.3" fill="${P.coral}"/><circle cx="-9" cy="-44" r="1.3" fill="${P.coral}"/>`;
export const FISH = `<path d="M-16 0 C-8 -12 10 -12 16 0 C10 12 -8 12 -16 0Z" fill="${P.orange}"/><path d="M14 0 l12 -9 v18Z" fill="${P.ember}"/><path d="M-2 -9 q4 -6 10 -2" fill="${P.ember}"/><circle cx="-8" cy="-2" r="2.4" fill="${P.night}"/><path d="M0 -8 q4 8 0 16" stroke="${P.cream}" stroke-width="2" fill="none" opacity=".7"/>`;
export const SUB = `<ellipse cx="0" cy="-16" rx="30" ry="16" fill="${P.sun}"/><path d="M26 -16 l12 -9 v18Z" fill="${P.sunDeep}"/><circle cx="-6" cy="-16" r="8" fill="${P.glass}"/><circle cx="-8" cy="-18" r="3" fill="${P.white}" opacity=".8"/><rect x="8" y="-38" width="4" height="10" fill="${P.sunDeep}"/><path d="M6 -38 l3 -7 l3 7Z M10 -38 l3 -7 l3 7Z" fill="${P.sunDeep}"/><circle cx="14" cy="-14" r="3" fill="${P.sunDeep}"/>`;
export const ROCKET = `<path d="M-14 -16 C-24 -12 -28 -4 -28 4 L-12 0Z M14 -16 C24 -12 28 -4 28 4 L12 0Z" fill="${P.coral}"/><path d="M-14 0 C-18 -40 -10 -70 0 -84 C10 -70 18 -40 14 0Z" fill="${P.cream}"/><path d="M-9 -66 l-3 -22 l11 15Z M9 -66 l3 -22 l-11 15Z" fill="${P.cream}"/><path d="M-7.5 -70 l-2 -12 l6 8Z M7.5 -70 l2 -12 l-6 8Z" fill="${P.pinkSoft}"/><circle cx="0" cy="-44" r="8" fill="${P.glass}"/><circle cx="-2" cy="-46" r="3" fill="${P.white}" opacity=".8"/>`;
export const FLAME = `<path d="M-10 2 q10 22 20 0" fill="${P.sun}"/>`;
export const YARN = `<circle cx="0" cy="0" r="12" fill="${P.pink}"/><path d="M-10 -6 q10 6 20 -2 M-11 2 q11 6 22 -1 M-6 -10 q4 10 0 20 M3 -11 q5 11 1 22" stroke="${P.pinkSoft}" stroke-width="1.6" fill="none"/><path d="M10 6 q10 10 4 20 q-6 8 4 14" stroke="${P.pink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
export const CONE = `<path d="M-6 -26 L6 -26 L13 -2 H-13Z" fill="${P.orange}"/><path d="M-9 -14 H9 L10.5 -9 H-10.5Z" fill="${P.cream}"/><rect x="-17" y="-3" width="34" height="5" rx="2" fill="${P.ember}"/>`;
export const LEAF = `<path d="M0 0 C2 -20 -2 -40 4 -58" stroke="${P.stem}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M4 -58 C-30 -60 -44 -40 -40 -26 C-28 -36 -10 -40 4 -58 C16 -40 34 -34 46 -22 C48 -40 34 -60 4 -58Z" fill="${P.leaf2}"/>`;
export const LEAF_VEINS = `<path d="M4 -58 C-14 -50 -28 -40 -38 -28 M4 -58 C20 -50 32 -40 42 -26" stroke="${P.leaf3}" stroke-width="2" fill="none"/>`;
const flagSquares = [0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ((c + r) % 2 ? '' : `<rect x="${2 + c * 7}" y="${-60 + r * 7}" width="7" height="7" fill="${P.night}"/>`))).join('');

/** Every prop's art, drawn around the point where it touches the ground. */
export const PROP_ART: Record<string, string> = {
  // 后院
  bowl: lift(BOWL) + FOOD(),
  ball: lift(`<circle cx="0" cy="-9" r="9" fill="${P.red}"/>`) + `<path d="M-8 -11 q8 -4 16 0" stroke="${P.white}" stroke-width="2" fill="none"/>`,
  birdhouse: lift(`<rect x="-2" y="-34" width="4" height="34" fill="${P.wood}"/><path d="M-12 -34 l12 -12 l12 12Z" fill="${P.coral}"/><rect x="-9" y="-34" width="18" height="14" rx="2" fill="${P.yellow}"/>`) + `<circle cx="0" cy="-27" r="3" fill="${P.woodDark}"/>`,
  sprinkler: lift(`<rect x="-3" y="-14" width="6" height="14" rx="2" fill="${P.mintDeep}"/><path d="M-10 -14 h20 l-4 -6 h-12Z" fill="${P.mint}"/><circle cx="0" cy="-22" r="3" fill="${P.sun}"/>`),
  // 草丛
  box: lift(`<path d="M-20 0 V-26 H20 V0Z" fill="${P.woodLight}"/><path d="M-20 -26 l-8 -9 h18 l10 9Z M20 -26 l8 -9 h-18 l-10 9Z" fill="${P.dirtEdge}"/>`) + `<path d="M-20 -26 H20" stroke="${P.dirt}" stroke-width="2"/><path d="M-6 -14 h12" stroke="${P.dirt}" stroke-width="2" stroke-linecap="round"/>`,
  butterfly: `<g transform="translate(0 -26)">${lift(BUTTERFLY)}</g>`,
  // 赛车山
  kart: `<g transform="translate(0 -7)">${lift(KART)}</g>`,
  cone: lift(CONE),
  flag: lift(`<rect x="-1.5" y="-62" width="3" height="62" fill="${P.stoneLow}"/><rect x="2" y="-60" width="28" height="21" fill="${P.white}"/>`) + flagSquares,
  // 方块世界
  post: lift(block(-15, 0, 30, P.woodLight, P.dirtEdge, P.dirt) + block(-15, -30, 30, P.woodLight, P.dirtEdge, P.dirt)) + `<path d="M-8 -48 l4 12 M-1 -50 l4 12 M6 -48 l4 12 M-9 -18 l4 10 M-1 -19 l4 10" stroke="${P.woodDark}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  statue: lift(`<rect x="-24" y="-30" width="34" height="30" fill="${P.stone}"/><rect x="2" y="-52" width="28" height="24" fill="${P.stone}"/><rect x="2" y="-60" width="8" height="8" fill="${P.stone}"/><rect x="22" y="-60" width="8" height="8" fill="${P.stone}"/><rect x="-30" y="-24" width="8" height="18" fill="${P.stone}"/>`) + `<rect x="-24" y="-30" width="34" height="6" fill="${P.stoneEdge}"/><rect x="2" y="-52" width="28" height="5" fill="${P.stoneEdge}"/><rect x="8" y="-44" width="4" height="4" fill="${P.night}"/><rect x="20" y="-44" width="4" height="4" fill="${P.night}"/><rect x="14" y="-38" width="4" height="3" fill="${P.pink}"/>`,
  'gem-block': lift(block(-20, 0, 40, P.stone, P.stoneEdge, P.stoneLow)) + `<rect x="-11" y="-30" width="7" height="7" fill="${P.teal}"/><rect x="5" y="-19" width="6" height="6" fill="${P.purple}"/><rect x="-4" y="-12" width="5" height="5" fill="${P.teal}"/><rect x="9" y="-33" width="4" height="4" fill="${P.white}" opacity=".8"/>`,
  // 恐龙谷
  nest: NEST + `<g data-part="egg">${lift(EGG)}</g>` + NEST_FRONT,
  leaf: lift(LEAF) + LEAF_VEINS,
  volcano: lift(`<path d="M-70 0 C-46 -40 -28 -96 -16 -118 L16 -118 C28 -96 46 -40 70 0Z" fill="${P.rockWarm}"/><path d="M-16 -118 C-8 -112 8 -112 16 -118 L12 -104 C4 -98 -6 -98 -12 -104Z" fill="${P.ember}"/>`) + `<path d="M-10 -104 C-14 -90 -6 -82 -10 -70 M8 -104 C12 -92 6 -86 10 -76" stroke="${P.warm}" stroke-width="4" fill="none" stroke-linecap="round"/><g opacity=".85"><circle cx="-4" cy="-132" r="10" fill="${P.white}"/><circle cx="8" cy="-146" r="12" fill="${P.white}"/><circle cx="-2" cy="-160" r="9" fill="${P.white}"/></g>`,
  // 海底
  sub: `<g transform="translate(0 -4)">${lift(SUB)}</g>`,
  fish: `<g transform="translate(0 -30)">${lift(FISH)}</g>`,
  // 月球基地
  rocket: `<g transform="translate(0 -6)">${lift(ROCKET)}${FLAME}</g>`,
  yarn: `<g transform="translate(0 -40)">${lift(YARN)}</g>`,
  dome: lift(`<path d="M-44 0 A44 40 0 0 1 44 0Z" fill="${P.glass}"/><rect x="-50" y="-4" width="100" height="8" rx="3" fill="${P.stoneEdge}"/>`) + `<path d="M-30 -8 A32 28 0 0 1 -6 -34" stroke="${P.white}" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/><rect x="-8" y="-20" width="16" height="16" rx="3" fill="${P.stone}"/><circle data-part="window" cx="22" cy="-16" r="5" fill="${P.lamp}" opacity=".9"/>`,
  // 海盗岛
  chest: `<g data-part="base">${CHEST_BASE}</g><g data-part="lid">${CHEST_LID}</g>`,
  parrot: PARROT_BODY + `<g data-part="wing">${PARROT_WING}</g>`,
  x: `<path d="M-10 -8 L10 4 M10 -8 L-10 4" stroke="${P.redDeep}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`,
};

/** A prop in its place, tagged with its name so moments can find it. */
export const prop = (name: string, x: number, y: number) => `<g data-prop="${name}" transform="translate(${x} ${y})">${PROP_ART[name]}</g>`;

/** Scenery that isn't Truffle's (it never moves). */
export const fencePost = (x: number, y: number) => lift(`<path d="M${x - 5} ${y} V${y - 44} l5 -6 l5 6 V${y}Z" fill="${P.cream}"/><rect x="${x + 5}" y="${y - 34}" width="26" height="5" rx="2" fill="${P.creamShade}"/>`);
export const blockTree = (x: number, y: number) => {
  const b = (dx: number, dy: number, c: string, t: string) => block(x + dx, y + dy, 26, c, t, P.leaf1);
  return lift(block(x - 9, y, 18, P.trunk, P.wood, P.woodDark) + block(x - 9, y - 18, 18, P.trunk, P.wood, P.woodDark)) + lift(b(-39, -36, P.leaf2, P.leaf3) + b(-13, -36, P.leaf1, P.leaf2) + b(13, -36, P.leaf2, P.leaf3) + b(-26, -62, P.leaf3, P.leafLight) + b(0, -62, P.leaf2, P.leaf3));
};
export const ship = (x: number, y: number) => lift(`<path d="M${x - 26} ${y} h52 l-8 10 h-36Z" fill="${P.woodDark}"/><path d="M${x} ${y} V${y - 40}" stroke="${P.woodDark}" stroke-width="2.4"/><path d="M${x + 2} ${y - 38} q18 14 0 32Z M${x - 2} ${y - 34} q-16 12 0 26Z" fill="${P.cream}"/>`);
```

Create `src/ui/worlds/art.ts`:

```ts
/** A prop's place: (x, y) is where it touches the ground; its tap box is w wide, centred on x, and h tall above y. */
export interface PropSpot { x: number; y: number; w: number; h: number }

/** One world's art (spec 2026-10-04 §2): its day sky, the land in front of it, and where Truffle's things stand. */
export interface WorldArt {
  /** every id in the art starts with this, so several scenes on one page (the room's thumbnails) never clash */
  prefix: string;
  sky: string;
  land: string;
  props: Record<string, PropSpot>;
}
```

Create `src/ui/worlds/evening.ts`:

```ts
// Evening in every world (spec 2026-10-04 §2): the day sky is swapped for a dusk sky with the moon and stars (under the land,
// so hills, peaks and trees stay in front), then a dusk tint and warm lights that suit the world go over it.
import type { WorldId } from '../../fun/worlds';
import { glow, lift, sky, star } from './kit/paper';
import { P } from './kit/palette';

const moon = (pre: string) => `<g data-part="moon">${glow(`${pre}-ev-moon`, 300, 80, 56, P.lamp, 0.35)}<circle cx="300" cy="80" r="26" fill="${P.cream}"/><circle cx="291" cy="73" r="5" fill="${P.creamShade}"/><circle cx="309" cy="90" r="4" fill="${P.creamShade}"/></g>`;
const stars = () => [star(60, 120, 7, P.lamp, 'star'), star(150, 170, 6, P.lamp, 'star'), star(210, 100, 8, P.lamp, 'star'), star(40, 60, 5, P.lamp, 'star'), star(250, 160, 5, P.lamp, 'star')].join('');
const tint = (o = 0.16) => `<rect data-part="dusk" width="360" height="480" fill="${P.dusk}" opacity="${o}"/>`;
const light = (id: string, x: number, y: number, r = 36) => glow(id, x, y, r, P.warm, 0.6);

const lantern = (pre: string, i: number, x: number, y: number) => `<g data-part="lantern">${light(`${pre}-ev-l${i}`, x, y, 28)}${lift(`<ellipse cx="${x}" cy="${y}" rx="8" ry="10" fill="${P.coral}"/>`)}<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="${P.lamp}"/></g>`;
const lanterns = (pre: string) => `<g data-part="lanterns"><path d="M0 210 Q90 234 180 216 T360 220" fill="none" stroke="${P.woodDark}" stroke-width="1.6"/>${lantern(pre, 1, 40, 226)}${lantern(pre, 2, 130, 226)}${lantern(pre, 3, 230, 222)}${lantern(pre, 4, 320, 224)}</g>`;
const firefly = (pre: string, i: number, x: number, y: number) => `<g data-part="firefly">${glow(`${pre}-ev-f${i}`, x, y, 14, P.lamp, 0.8)}<circle cx="${x}" cy="${y}" r="2.4" fill="${P.lamp}"/></g>`;
const lampPost = (pre: string, i: number, x: number, y: number) => `<g data-part="lamp">${light(`${pre}-ev-p${i}`, x, y - 60, 46)}${lift(`<rect x="${x - 2}" y="${y - 60}" width="4" height="60" fill="${P.stoneLow}"/><path d="M${x - 8} ${y - 60} h16 l-3 -10 h-10Z" fill="${P.stoneLow}"/>`)}<rect x="${x - 5}" y="${y - 68}" width="10" height="7" fill="${P.lamp}"/></g>`;
const torch = (pre: string, i: number, x: number, y: number) => `<g data-part="torch">${light(`${pre}-ev-t${i}`, x, y - 14, 34)}${lift(`<rect x="${x - 3}" y="${y - 14}" width="6" height="14" fill="${P.wood}"/>`)}<rect x="${x - 5}" y="${y - 24}" width="10" height="10" fill="${P.orange}"/><rect x="${x - 3}" y="${y - 22}" width="6" height="6" fill="${P.lamp}"/></g>`;
const jelly = (pre: string, i: number, x: number, y: number) => `<g data-part="jelly">${glow(`${pre}-ev-j${i}`, x, y, 26, P.lilac, 0.7)}<path d="M${x - 10} ${y} a10 9 0 0 1 20 0Z" fill="${P.lilac}"/><path d="M${x - 6} ${y} q-2 8 1 14 M${x} ${y} q2 8 -1 16 M${x + 6} ${y} q-2 8 1 14" stroke="${P.lilac}" stroke-width="1.6" fill="none"/></g>`;

const PREFIX: Record<WorldId, string> = { yard: 'yp', grass: 'gp', race: 'rp', blocks: 'bp', dino: 'dp', sea: 'sp', space: 'xp', pirate: 'ip' };

/** The dusk sky that takes the day sky's place. The moon base is always night: it keeps its own sky. */
export function eveningSky(world: WorldId, daySky: string): string {
  const pre = PREFIX[world];
  if (world === 'space') return daySky;
  if (world === 'sea') return sky(`${pre}-ev-sky`, P.duskSea, P.duskSeaLow);
  return sky(`${pre}-ev-sky`, P.duskTop, P.duskLow) + moon(pre) + stars();
}

/** The lights over the land: a dusk tint, then lamps, lanterns, fireflies or glows that belong in this world. */
export function eveningLights(world: WorldId): string {
  const pre = PREFIX[world];
  switch (world) {
    case 'yard': return tint() + lanterns(pre);
    case 'grass': return tint() + firefly(pre, 1, 40, 330) + firefly(pre, 2, 70, 372) + firefly(pre, 3, 300, 340) + firefly(pre, 4, 332, 392) + firefly(pre, 5, 120, 420);
    case 'race': return tint() + lampPost(pre, 1, 22, 400) + lampPost(pre, 2, 342, 396);
    case 'blocks': return tint() + torch(pre, 1, 13, 402) + torch(pre, 2, 347, 402);
    case 'dino': return tint() + `<g data-part="lava">${glow(`${pre}-ev-v`, 312, 186, 60, P.ember, 0.6)}${glow(`${pre}-ev-v2`, 312, 240, 70, P.warm, 0.3)}</g>`;
    case 'sea': return tint(0.3) + jelly(pre, 1, 34, 300) + jelly(pre, 2, 326, 310) + jelly(pre, 3, 120, 270);
    case 'space': return `<g data-part="window">${light(`${pre}-ev-w`, 324, 404, 30)}</g>${glow(`${pre}-ev-r`, 62, 340, 30, P.lamp, 0.45)}`;
    case 'pirate': return tint() + `<g data-part="lamp">${light(`${pre}-ev-s`, 300, 280, 30)}<rect x="296" y="276" width="8" height="8" fill="${P.lamp}"/></g><path d="M282 318 h36 M290 326 h22 M296 334 h10" stroke="${P.lamp}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`;
  }
}
```

Replace `src/ui/worlds/yard.ts`. The bowl moves to (84, 456), the ball to (314, 446) and the birdhouse to (88, 338), so their tap boxes sit in the open sides:

```ts
import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, leafyTree, picketFence, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { sprinkler: { x: 68, y: 392, w: 60, h: 52 }, bowl: { x: 84, y: 456, w: 44, h: 40 }, ball: { x: 314, y: 446, w: 44, h: 44 }, birdhouse: { x: 88, y: 338, w: 40, h: 50 } };

/** 后院 (spec 2026-10-04 §2): Truffle's bowl, his red ball and the birdhouse he watches; the sprinkler; fence and tree. */
export const YARD: WorldArt = {
  prefix: 'yp',
  sky: sky('yp-sky', P.sky, P.paperSky),
  land: [
    cloud(40, 150, 1),
    cloud(250, 120, 0.8),
    ground('yp-far', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244', P.far, P.farLow, P.farEdge),
    ground('yp-h1', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284', P.hill1, P.hill1Low, P.hill1Edge),
    picketFence(214, 284, 9),
    leafyTree(40, 246, 0.85), // low enough that a landscape iPad (which shows the lower half) still sees its crown
    prop('birdhouse', at.birdhouse.x, at.birdhouse.y),
    ground('yp-h2', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328', P.hill2, P.hill2Low, P.hill2Edge),
    groundShadow('yp-s1', at.sprinkler.x, at.sprinkler.y + 1, 16),
    prop('sprinkler', at.sprinkler.x, at.sprinkler.y),
    groundShadow('yp-s3', at.ball.x, at.ball.y + 1, 12),
    prop('ball', at.ball.x, at.ball.y),
    ground('yp-h3', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451', P.hill3, P.hill3Low, P.hill3Edge),
    groundShadow('yp-s2', at.bowl.x, at.bowl.y + 1, 18),
    prop('bowl', at.bowl.x, at.bowl.y),
    flower(22, 440, P.pink),
    flower(130, 462, P.blush),
    flower(336, 458, P.sun),
    flower(350, 468, P.pink),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(190, 480, P.tuft2, 1),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
```

Create `src/ui/worlds/legacy.ts` by moving the ink art out of `scenes.ts` unchanged:
- **The world strings.** Cut the seven world strings `grass` … `pirate` (the `SCENES` entries after `yard`) into `export const INK: Partial<Record<WorldId, string>> = { … }`. Each redrawn world deletes its entry.
- **The evening pieces.** Move the `STARS`, `MOON`, `LANTERNS` and `EVENING_WASH` constants across too. Drop `YARD_DUSK`.
- **The layers function.** End the file with:

```ts
/** The old washes and evening extras, for the worlds still in ink (Tasks 2–5 redraw them; Task 5 deletes this file). */
export function inkLayers(t: TimeOfDay, world: WorldId): { wash: string; over: string } {
  if (t === 'morning') return { wash: '<rect width="360" height="480" fill="#e9eff2" opacity=".6"/>', over: '' };
  if (t === 'afternoon') return { wash: '<rect width="360" height="480" fill="#f6ecd2" opacity=".55"/>', over: '' };
  if (world === 'space') return { wash: '', over: STARS };
  return { wash: EVENING_WASH, over: MOON + STARS + LANTERNS };
}
```

The file starts with `import type { TimeOfDay, WorldId } from '../../fun/worlds';`. Its header comment is the old ink-rules comment from `scenes.ts`.

Replace `src/ui/worlds/scenes.ts`. This is the transitional form; Task 5 makes `WORLD_ART` complete and drops the ink branch:

```ts
/* The journey worlds (spec §15) on one 360×480 canvas: the ground lives at y ≥ 300 and the middle stays calm for the lesson
 * card. Redrawn in storybook paper (spec 2026-10-04 §2) one by one; the rest stay in ink (legacy.ts) until then. */
import { WORLDS, type TimeOfDay, type WorldId } from '../../fun/worlds';
import type { WorldArt } from './art';
import { eveningLights, eveningSky } from './evening';
import { INK, inkLayers } from './legacy';
import { YARD } from './yard';

export const SCENE_VIEWBOX = '0 0 360 480';

/** The worlds in storybook paper so far. */
export const WORLD_ART: Partial<Record<WorldId, WorldArt>> = { yard: YARD };

/** Each world by day (thumbnails in 松露's room, the arrival card). */
export const SCENES = Object.fromEntries(WORLDS.map((w) => {
  const a = WORLD_ART[w.id];
  return [w.id, a ? a.sky + a.land : INK[w.id]!];
})) as Record<WorldId, string>;

/** A world at a time of day: morning and afternoon share the art; evening swaps the sky and adds its lights. */
export function sceneFor(world: WorldId, time: TimeOfDay): string {
  const a = WORLD_ART[world];
  if (!a) {
    const { wash, over } = inkLayers(time, world);
    return wash + INK[world]! + over;
  }
  return time === 'evening' ? eveningSky(world, a.sky) + a.land + eveningLights(world) : a.sky + a.land;
}
```

Replace `src/ui/worlds/WorldScene.tsx`:

```tsx
import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { SCENE_VIEWBOX, sceneFor } from './scenes';

/** The journey world behind Home and the lessons, at its time of day. Decorative. */
export function WorldScene({ world, time }: { world: WorldId; time: TimeOfDay }) {
  return (
    <div class="world-scene" data-world={world} data-time={time} aria-hidden="true">
      <svg viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: sceneFor(world, time) }} />
    </div>
  );
}
```

Delete `src/ui/worlds/yard.test.ts`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/ui/worlds src/app src/childEmoji.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - `WorldTaps` still draws its old targets until Task 8. Its tests don't depend on the scene art.

- [ ] **Step 5: Commit.** `git add -A src/ui/worlds && git commit -m "feat: one palette, the paper kit and every prop's art; evening swaps the sky; the yard on the new kit"`

### Task 2: 草丛 and 赛车山 in paper

**Files:**
- Create: `src/ui/worlds/grass.ts`, `src/ui/worlds/race.ts`
- Modify:
  - `src/ui/worlds/scenes.ts` (add to `WORLD_ART`);
  - `src/ui/worlds/legacy.ts` (delete these worlds' `INK` entries);
  - `src/ui/worlds/worldArt.test.ts`.

**Interfaces:**
- **Consumes:** the kit, `PROP_ART`/`prop()`, `WorldArt` and the evening lights from Task 1.
- **Produces:** `GRASS`, `RACE`: `WorldArt`.
- **Also produces:** `RACE_TRACK`, the road's centre line, which the kart's lap drives in Task 7.

- [ ] **Step 1: Write the failing test.** In `src/ui/worlds/worldArt.test.ts`, replace the first `it(…)` with:

```ts
  it('these worlds are in storybook paper', () => expect(paper.map(([w]) => w)).toEqual(expect.arrayContaining(['yard', 'grass', 'race'])));
```

- [ ] **Step 2: Run it.**
  - Command: `npx vitest run src/ui/worlds/worldArt.test.ts`.
  - Expected: FAIL. The array lacks 'grass', 'race'.

- [ ] **Step 3: Implement.**

Create `src/ui/worlds/grass.ts`:

```ts
import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, sky, tallGrass, tuft } from './kit/paper';
import { P } from './kit/palette';
import { fencePost, prop } from './kit/props';

const at = { box: { x: 78, y: 412, w: 60, h: 48 }, butterfly: { x: 316, y: 380, w: 44, h: 50 } };

/** 草丛: tall grass at the edges, Truffle's cardboard box (the day's animal hides in it) and a butterfly he chases. */
export const GRASS: WorldArt = {
  prefix: 'gp',
  sky: sky('gp-sky', P.sky, P.paperSky),
  land: [
    cloud(30, 130, 0.9),
    cloud(262, 160, 0.7),
    ground('gp-far', 'M0 268 C70 250 140 256 200 262 C270 270 320 248 360 252', P.far, P.farLow, P.farEdge),
    ground('gp-h1', 'M0 300 C70 280 150 288 230 300 C290 308 330 292 360 294', P.hill1, P.hill1Low, P.hill1Edge),
    tallGrass(26, 352, 1.1, P.leaf1),
    tallGrass(340, 346, 1, P.leaf1),
    fencePost(296, 352),
    ground('gp-h2', 'M0 342 C80 326 180 336 270 344 C318 348 344 338 360 340', P.hill2, P.hill2Low, P.hill2Edge),
    tallGrass(14, 420, 1.2),
    groundShadow('gp-s1', at.box.x, at.box.y + 1, 26),
    prop('box', at.box.x, at.box.y),
    tallGrass(118, 430, 0.7),
    flower(304, 400, P.pink),
    prop('butterfly', at.butterfly.x, at.butterfly.y),
    tallGrass(350, 440, 1.1),
    ground('gp-h3', 'M0 450 C100 438 220 448 320 454 C340 455 352 452 360 453', P.hill3, P.hill3Low, P.hill3Edge),
    flower(24, 444, P.sun),
    flower(42, 456, P.white),
    flower(316, 448, P.pink),
    flower(338, 460, P.lilac),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(200, 480, P.tuft2, 1),
    tuft(354, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
```

Create `src/ui/worlds/race.ts`:

```ts
import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, layer, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { kart: { x: 70, y: 418, w: 64, h: 56 }, cone: { x: 314, y: 446, w: 44, h: 40 } };
/** The road's middle line: the kart drives it on a lap (scene units). */
export const RACE_TRACK = 'M-30 470 C60 470 120 440 170 410 C230 374 300 372 330 352 C356 334 350 316 380 306';

/** 赛车山: far peaks, a winding road up the hill to the finish flag, Truffle's go-kart with its paw-print flag, a cone he knocks over. */
export const RACE: WorldArt = {
  prefix: 'rp',
  sky: sky('rp-sky', P.skyDeep, P.paperSky),
  land: [
    cloud(250, 110, 0.8),
    layer('rp-peaks', 'M0 262 L46 206 L80 236 L130 180 L178 240 L220 214 L262 250 L310 196 L360 240 V480 H0Z', P.peak, P.peakLow, P.snow, 'M30 226 L46 206 L60 218 M116 196 L130 180 L144 196 M296 212 L310 196 L324 212'),
    ground('rp-far', 'M0 282 C80 266 160 272 240 280 C300 286 340 272 360 274', P.far, P.farLow, P.farEdge),
    ground('rp-h1', 'M0 320 C80 300 170 306 250 318 C300 326 340 312 360 314', P.hill1, P.hill1Low, P.hill1Edge),
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.stoneLow}" stroke-width="30" stroke-linecap="round" transform="translate(0 3)" opacity=".5"/>`,
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.stone}" stroke-width="28" stroke-linecap="round"/>`,
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.white}" stroke-width="2.4" stroke-dasharray="10 12" opacity=".9"/>`,
    groundShadow('rp-s3', 300, 353, 10, 3),
    prop('flag', 300, 352),
    groundShadow('rp-s1', at.kart.x, at.kart.y + 1, 30),
    prop('kart', at.kart.x, at.kart.y),
    groundShadow('rp-s2', at.cone.x, at.cone.y + 1, 18),
    prop('cone', at.cone.x, at.cone.y),
    ground('rp-h3', 'M0 458 C100 448 220 456 320 462 C340 463 352 460 360 461', P.hill3, P.hill3Low, P.hill3Edge),
    flower(20, 450, P.sun),
    flower(346, 456, P.pink),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
```

In `scenes.ts`, import them:

```ts
import { GRASS } from './grass';
import { RACE } from './race';
```

Add `grass: GRASS, race: RACE` to `WORLD_ART`. In `legacy.ts`, delete the `grass`, `race` entries of `INK`.

- [ ] **Step 4: Run them and look.**
  - Run `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`. Expected: PASS. Every rule in `worldArt.test.ts` now also covers grass, race.
  - Then render the worlds by eye with `npx tsx scripts/stage-cases.ts`, or a scratch page with `sceneFor(w, 'afternoon' | 'evening')`, at 360×480.
  - Check each new world's composition: a calm middle, props at the edges, and lights that show in the evening.
  - Any change to the art is a ledger ruling.

- [ ] **Step 5: Commit.** `git add -A src/ui/worlds && git commit -m "feat: 草丛 and 赛车山 in storybook paper with Truffle's box, butterfly, go-kart and cone"`

### Task 3: 方块世界 and 恐龙谷 in paper

**Files:**
- Create: `src/ui/worlds/blocks.ts`, `src/ui/worlds/dino.ts`
- Modify:
  - `src/ui/worlds/scenes.ts` (add to `WORLD_ART`);
  - `src/ui/worlds/legacy.ts` (delete these worlds' `INK` entries);
  - `src/ui/worlds/worldArt.test.ts`.

**Interfaces:**
- **Consumes:** the kit, `PROP_ART`/`prop()`, `WorldArt` and the evening lights from Task 1.
- **Produces:** `BLOCKS`, `DINO`: `WorldArt`.

- [ ] **Step 1: Write the failing test.** In `src/ui/worlds/worldArt.test.ts`, replace the first `it(…)` with:

```ts
  it('these worlds are in storybook paper', () => expect(paper.map(([w]) => w)).toEqual(expect.arrayContaining(['yard', 'blocks', 'dino'])));
```

- [ ] **Step 2: Run it.**
  - Command: `npx vitest run src/ui/worlds/worldArt.test.ts`.
  - Expected: FAIL. The array lacks 'blocks', 'dino'.

- [ ] **Step 3: Implement.**

Create `src/ui/worlds/blocks.ts`:

```ts
import type { WorldArt } from './art';
import { block, cloud, groundShadow, layer, lift, sky } from './kit/paper';
import { P } from './kit/palette';
import { blockTree, prop } from './kit/props';

const at = { 'gem-block': { x: 326, y: 410, w: 48, h: 48 }, post: { x: 86, y: 446, w: 40, h: 64 }, statue: { x: 50, y: 352, w: 64, h: 64 } };
const steps = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L');
const stepLayer = (id: string, pts: [number, number][], top: string, bottom: string, edge: string) => layer(id, `${steps(pts)} L360 480 L0 480Z`, top, bottom, edge, steps(pts));
/** A column of blocks at the edge: grass on top, dirt under it. */
const stack = (x: number, y: number, n: number) => lift(block(x, y - (n - 1) * 26, 26, P.hill2, P.hill2Edge, P.hill2Low) + Array.from({ length: n - 1 }, (_, i) => block(x, y - i * 26, 26, i % 2 ? P.dirt : P.dirtLow, P.dirtEdge, P.dirtLow)).join(''));

/** 方块世界: stepped block hills, block trees, Truffle's scratching-post block, his cat statue, and the gem block. */
export const BLOCKS: WorldArt = {
  prefix: 'bp',
  sky: sky('bp-sky', P.sky, P.paperSky),
  land: [
    cloud(40, 120, 0.8),
    lift(`<rect x="250" y="140" width="56" height="18" fill="${P.white}"/><rect x="262" y="128" width="30" height="14" fill="${P.white}"/>`) + `<rect x="250" y="158" width="56" height="6" fill="${P.cloudShade}"/>`,
    stepLayer('bp-far', [[0, 270], [40, 270], [40, 254], [100, 254], [100, 270], [170, 270], [170, 260], [250, 260], [250, 246], [300, 246], [300, 262], [360, 262]], P.far, P.farLow, P.farEdge),
    stepLayer('bp-h1', [[0, 312], [60, 312], [60, 300], [150, 300], [150, 308], [240, 308], [240, 296], [300, 296], [300, 306], [360, 306]], P.hill1, P.hill1Low, P.hill1Edge),
    blockTree(300, 340),
    groundShadow('bp-s1', at.statue.x, at.statue.y + 1, 30),
    prop('statue', at.statue.x, at.statue.y),
    stepLayer('bp-h2', [[0, 366], [80, 366], [80, 358], [200, 358], [200, 366], [290, 366], [290, 356], [360, 356]], P.hill2, P.hill2Low, P.hill2Edge),
    groundShadow('bp-s2', at['gem-block'].x, at['gem-block'].y + 1, 24),
    prop('gem-block', at['gem-block'].x, at['gem-block'].y),
    groundShadow('bp-s3', at.post.x, at.post.y + 1, 20),
    prop('post', at.post.x, at.post.y),
    stepLayer('bp-h3', [[0, 456], [120, 456], [120, 462], [250, 462], [250, 456], [360, 456]], P.hill3, P.hill3Low, P.hill3Edge),
    stack(0, 480, 3), stack(26, 480, 2), stack(334, 480, 3), stack(308, 480, 2),
  ].join(''),
  props: at,
};
```

Create `src/ui/worlds/dino.ts`:

```ts
import type { WorldArt } from './art';
import { cloud, fern, ground, groundShadow, rock, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { nest: { x: 80, y: 440, w: 56, h: 40 }, leaf: { x: 322, y: 432, w: 56, h: 70 } };

/** 恐龙谷: a smoking volcano far right, ferns at the edges, the egg Truffle guards in its nest, a big leaf umbrella. */
export const DINO: WorldArt = {
  prefix: 'dp',
  sky: sky('dp-sky', P.skyDeep, P.sandEdge),
  land: [
    cloud(30, 140, 0.8),
    ground('dp-far', 'M0 274 C70 258 150 262 220 270 C290 278 330 262 360 264', P.far, P.farLow, P.farEdge),
    prop('volcano', 312, 300),
    ground('dp-h1', 'M0 306 C80 290 160 296 240 304 C300 310 340 298 360 300', P.rockWarm, P.rockWarmLow, P.sandEdge),
    fern(30, 360, 1.1),
    rock(262, 352, 0.9, P.rockWarmLow, P.rockWarm),
    ground('dp-h2', 'M0 352 C90 336 190 346 280 354 C320 358 345 348 360 350', P.hill2, P.hill2Low, P.hill2Edge),
    fern(350, 410, 1.1, true),
    groundShadow('dp-s1', at.nest.x, at.nest.y + 1, 28),
    prop('nest', at.nest.x, at.nest.y),
    groundShadow('dp-s2', at.leaf.x, at.leaf.y + 1, 22),
    prop('leaf', at.leaf.x, at.leaf.y),
    ground('dp-h3', 'M0 456 C100 446 220 454 320 460 C340 461 352 458 360 459', P.hill3, P.hill3Low, P.hill3Edge),
    fern(10, 480, 0.8),
    rock(200, 476, 0.6),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
```

In `scenes.ts`, import them:

```ts
import { BLOCKS } from './blocks';
import { DINO } from './dino';
```

Add `blocks: BLOCKS, dino: DINO` to `WORLD_ART`. In `legacy.ts`, delete the `blocks`, `dino` entries of `INK`.

- [ ] **Step 4: Run them and look.**
  - Run `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`. Expected: PASS. Every rule in `worldArt.test.ts` now also covers blocks, dino.
  - Then render the worlds by eye with `npx tsx scripts/stage-cases.ts`, or a scratch page with `sceneFor(w, 'afternoon' | 'evening')`, at 360×480.
  - Check each new world's composition: a calm middle, props at the edges, and lights that show in the evening.
  - Any change to the art is a ledger ruling.

- [ ] **Step 5: Commit.** `git add -A src/ui/worlds && git commit -m "feat: 方块世界 and 恐龙谷 in storybook paper with the scratching post, cat statue, gem block, nest and leaf umbrella"`

### Task 4: 海底 and 月球基地 in paper

**Files:**
- Create: `src/ui/worlds/sea.ts`, `src/ui/worlds/space.ts`
- Modify:
  - `src/ui/worlds/scenes.ts` (add to `WORLD_ART`);
  - `src/ui/worlds/legacy.ts` (delete these worlds' `INK` entries);
  - `src/ui/worlds/worldArt.test.ts`.

**Interfaces:**
- **Consumes:** the kit, `PROP_ART`/`prop()`, `WorldArt` and the evening lights from Task 1.
- **Produces:** `SEA`, `SPACE`: `WorldArt`.

- [ ] **Step 1: Write the failing test.** In `src/ui/worlds/worldArt.test.ts`, replace the first `it(…)` with:

```ts
  it('these worlds are in storybook paper', () => expect(paper.map(([w]) => w)).toEqual(expect.arrayContaining(['yard', 'sea', 'space'])));
```

- [ ] **Step 2: Run it.**
  - Command: `npx vitest run src/ui/worlds/worldArt.test.ts`.
  - Expected: FAIL. The array lacks 'sea', 'space'.

- [ ] **Step 3: Implement.**

Create `src/ui/worlds/sea.ts`:

```ts
import type { WorldArt } from './art';
import { ground, groundShadow, layer, rock, seaweed, shell, sky, starfish } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { sub: { x: 66, y: 392, w: 76, h: 48 }, fish: { x: 316, y: 392, w: 44, h: 60 } };
const ray = (x: number, w: number) => `<path d="M${x} 0 L${x + w} 0 L${x + w + 60} 360 L${x + 40} 360Z" fill="${P.white}" opacity=".12"/>`;
const bubble = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${P.foam}" stroke-width="1.6" opacity=".8"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="${P.white}" opacity=".8"/>`;

/** 海底: light water from above, soft rays, rocks and seaweed at the edges, Truffle's mini submarine and a curious fish. */
export const SEA: WorldArt = {
  prefix: 'sp',
  sky: sky('sp-sky', P.seaEdge, P.sea),
  land: [
    ray(40, 30), ray(150, 20), ray(250, 34),
    layer('sp-far', 'M0 300 C40 270 70 286 100 276 C150 260 180 290 230 282 C280 274 310 262 360 280 V480 H0Z', P.seaLow, P.deep, P.seaEdge, 'M0 300 C40 270 70 286 100 276 C150 260 180 290 230 282 C280 274 310 262 360 280'),
    seaweed(22, 380, 110, P.leaf1),
    seaweed(40, 380, 80, P.leaf3),
    seaweed(338, 390, 120, P.leaf1),
    seaweed(352, 390, 84, P.teal),
    ground('sp-sand1', 'M0 372 C80 360 180 368 270 374 C320 378 344 370 360 372', P.sand, P.sandLow, P.sandEdge),
    rock(282, 384, 0.8, P.deepLow, P.seaLow),
    groundShadow('sp-s1', at.sub.x, at.sub.y + 1, 30),
    prop('sub', at.sub.x, at.sub.y),
    prop('fish', at.fish.x, at.fish.y),
    bubble(110, 330, 4), bubble(118, 312, 3), bubble(112, 296, 2.4), bubble(300, 300, 3),
    ground('sp-sand2', 'M0 448 C100 438 220 446 320 452 C340 453 352 450 360 451', P.sandEdge, P.sand, P.white),
    shell(30, 466), starfish(330, 466), shell(352, 472, P.coral),
  ].join(''),
  props: at,
};
```

Create `src/ui/worlds/space.ts`:

```ts
import type { WorldArt } from './art';
import { ground, groundShadow, rock, sky, star } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { rocket: { x: 62, y: 384, w: 56, h: 100 }, yarn: { x: 316, y: 362, w: 44, h: 60 } };
const crater = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="${P.crater}"/><path d="M${x - r} ${y} A${r} ${r * 0.35} 0 0 1 ${x + r} ${y}" stroke="${P.moonEdge}" stroke-width="2" fill="none"/>`;

/** 月球基地: a deep sky with stars and a ringed planet, grey moon ground with craters, Truffle's cat-ear rocket, a floating ball of yarn, the base dome. */
export const SPACE: WorldArt = {
  prefix: 'xp',
  sky: sky('xp-sky', P.night, P.nightLow) + [star(40, 70, 4), star(120, 40, 3), star(200, 90, 5), star(300, 140, 3), star(60, 200, 3), star(170, 180, 2.5), star(330, 60, 2.5), star(250, 230, 3), star(20, 270, 2.5)].join(''),
  land: [
    `<circle cx="96" cy="140" r="22" fill="${P.lilac}"/><circle cx="90" cy="134" r="6" fill="${P.purple}" opacity=".35"/><ellipse cx="96" cy="140" rx="38" ry="8" fill="none" stroke="${P.sun}" stroke-width="3" transform="rotate(-18 96 140)"/>`,
    ground('xp-far', 'M0 318 C60 300 120 306 180 312 C250 320 300 300 360 306', P.moonRockLow, P.crater, P.moonEdge),
    ground('xp-h1', 'M0 360 C80 346 180 354 270 362 C318 366 344 356 360 358', P.moonRock, P.moonRockLow, P.moonEdge),
    crater(150, 392, 16),
    groundShadow('xp-s3', 302, 421, 48),
    prop('dome', 302, 420),
    groundShadow('xp-s1', at.rocket.x, at.rocket.y + 1, 26),
    prop('rocket', at.rocket.x, at.rocket.y),
    prop('yarn', at.yarn.x, at.yarn.y),
    ground('xp-h3', 'M0 452 C100 442 220 450 320 456 C340 457 352 454 360 455', P.moonEdge, P.moonRock, P.white),
    crater(40, 466, 12), crater(250, 470, 10),
    rock(340, 480, 0.7, P.moonRockLow, P.moonEdge),
  ].join(''),
  props: at,
};
```

In `scenes.ts`, import them:

```ts
import { SEA } from './sea';
import { SPACE } from './space';
```

Add `sea: SEA, space: SPACE` to `WORLD_ART`. In `legacy.ts`, delete the `sea`, `space` entries of `INK`.

- [ ] **Step 4: Run them and look.**
  - Run `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`. Expected: PASS. Every rule in `worldArt.test.ts` now also covers sea, space.
  - Then render the worlds by eye with `npx tsx scripts/stage-cases.ts`, or a scratch page with `sceneFor(w, 'afternoon' | 'evening')`, at 360×480.
  - Check each new world's composition: a calm middle, props at the edges, and lights that show in the evening.
  - Any change to the art is a ledger ruling.

- [ ] **Step 5: Commit.** `git add -A src/ui/worlds && git commit -m "feat: 海底 and 月球基地 in storybook paper with the mini submarine, a curious fish, the cat-ear rocket and floating yarn"`

### Task 5: 海盗岛 in paper; the ink worlds retire

**Files:**
- Create: `src/ui/worlds/pirate.ts`
- Modify:
  - `src/ui/worlds/scenes.ts` (add to `WORLD_ART`);
  - `src/ui/worlds/worlds.test.tsx`;
- Delete: `src/ui/worlds/legacy.ts`.
  - `src/ui/worlds/worldArt.test.ts`.

**Interfaces:**
- **Consumes:** the kit, `PROP_ART`/`prop()`, `WorldArt` and the evening lights from Task 1.
- **Produces:**
  - `PIRATE`: `WorldArt`;
  - `WORLD_ART: Record<WorldId, WorldArt>`, now complete; Tasks 7–8 rely on every world having its props.

- [ ] **Step 1: Write the failing test.** In `src/ui/worlds/worldArt.test.ts`, replace the first `it(…)` with:

```ts
  it('these worlds are in storybook paper', () => expect(paper.map(([w]) => w)).toEqual(expect.arrayContaining(['yard', 'pirate'])));
```

- [ ] **Step 2: Run it.**
  - Command: `npx vitest run src/ui/worlds/worldArt.test.ts`.
  - Expected: FAIL. The array lacks 'pirate'.

- [ ] **Step 3: Implement.**

Create `src/ui/worlds/pirate.ts`:

```ts
import type { WorldArt } from './art';
import { cloud, ground, groundShadow, layer, palm, shell, sky, starfish } from './kit/paper';
import { P } from './kit/palette';
import { prop, ship } from './kit/props';

const at = { x: { x: 84, y: 420, w: 44, h: 40 }, chest: { x: 318, y: 446, w: 48, h: 40 }, parrot: { x: 66, y: 316, w: 40, h: 44 } };

/** 海盗岛: sea to the horizon with a ship, a sandy island with a palm, the X to dig, Truffle's treasure chest, a parrot friend. */
export const PIRATE: WorldArt = {
  prefix: 'ip',
  sky: sky('ip-sky', P.skyDeep, P.paperSky),
  land: [
    cloud(240, 120, 0.9),
    cloud(30, 180, 0.6),
    layer('ip-sea', 'M0 300 Q30 294 60 300 T120 300 T180 300 T240 300 T300 300 T360 300 V480 H0Z', P.sea, P.seaLow, P.seaEdge, 'M0 300 Q30 294 60 300 T120 300 T180 300 T240 300 T300 300 T360 300'),
    ship(300, 300),
    `<path d="M150 318 q10 -3 20 0 M210 330 q10 -3 20 0 M90 336 q10 -3 20 0" stroke="${P.foam}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ground('ip-sand1', 'M0 360 C60 340 140 344 200 352 C260 360 320 348 360 352', P.sand, P.sandLow, P.sandEdge),
    palm(40, 392, 1),
    prop('parrot', at.parrot.x, at.parrot.y),
    ground('ip-sand2', 'M0 400 C90 386 200 394 290 402 C326 405 348 398 360 400', P.sandEdge, P.sand, P.white),
    prop('x', at.x.x, at.x.y),
    groundShadow('ip-s1', at.chest.x, at.chest.y + 1, 26),
    prop('chest', at.chest.x, at.chest.y),
    shell(30, 462), starfish(250, 466), shell(180, 470, P.lilac),
  ].join(''),
  props: at,
};
```

In `scenes.ts`, import them:

```ts
import { PIRATE } from './pirate';
```

Every world is now paper. Finish the move:
- **Delete** `src/ui/worlds/legacy.ts`.
- **Make the record total.** `WORLD_ART` becomes `export const WORLD_ART: Record<WorldId, WorldArt> = { yard: YARD, grass: GRASS, race: RACE, blocks: BLOCKS, dino: DINO, sea: SEA, space: SPACE, pirate: PIRATE };`.
- **Rewrite `SCENES` and `sceneFor`** without the ink branch:

```ts
export const SCENES = Object.fromEntries(WORLDS.map((w) => [w.id, WORLD_ART[w.id].sky + WORLD_ART[w.id].land])) as Record<WorldId, string>;

export function sceneFor(world: WorldId, time: TimeOfDay): string {
  const a = WORLD_ART[world];
  return time === 'evening' ? eveningSky(world, a.sky) + a.land + eveningLights(world) : a.sky + a.land;
}
```

- **Header comment.** Replace the file's header comment with: `/* The journey worlds (spec §15), all in storybook paper (spec 2026-10-04 §2) on one 360×480 canvas: the ground lives at y ≥ 300 and the middle stays calm for the lesson card. Each world borrows a kind of fun, never anyone's characters or art. */`.
- **Tests.** In `worlds.test.tsx`:
  - delete the two tests that mention ink;
  - drop the `INK` import;
  - add:

```tsx
  it('every world is storybook paper now', () => {
    for (const w of WORLDS) expect(WORLD_ART[w.id], w.id).toBeTruthy();
  });
```

- [ ] **Step 4: Run them and look.**
  - Run `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`. Expected: PASS. Every rule in `worldArt.test.ts` now also covers pirate.
  - Then render the worlds by eye with `npx tsx scripts/stage-cases.ts`, or a scratch page with `sceneFor(w, 'afternoon' | 'evening')`, at 360×480.
  - Check each new world's composition: a calm middle, props at the edges, and lights that show in the evening.
  - Any change to the art is a ledger ruling.

- [ ] **Step 5: Commit.** `git add -A src/ui/worlds && git commit -m "feat: 海盗岛 in storybook paper; every world is paper now"`

### Task 6: What each prop moment does (pure), and three new reactions

**Files:**
- Create: `src/ui/worlds/moments.ts`, `src/ui/worlds/moments.test.ts`
- Modify: `src/ui/truffle/timelines.ts`, `src/ui/truffle/timelines.test.ts`

**Interfaces:**
- **Consumes:**
  - `findAnimal`, `tapGem`, `tapEgg`, `dig` from `src/fun/finds.ts`;
  - `Sfx` from `src/audio/sfx.ts`;
  - `WORLD_ART` (complete) from Task 5;
  - `ReactionKind` from `timelines.ts`.
- **Produces:**
  - New `ReactionKind`s `'munch' | 'watch' | 'proud'`, and the track `TRACKS.chew`.
  - `Fx`, the discriminated union of what a moment draws.
  - `PropMoment { prop: string; label: string; auto: boolean }` and `MOMENTS: Record<WorldId, PropMoment[]>`.
  - `Outcome { fx: Fx; react: ReactionKind; say?: string; later?: { say: string; ms: number }; speak?: string; sfx?: Sfx; kid?: KidState }`.
  - `runMoment(world: WorldId, prop: string, kid: KidState, today: string, gemTaps: number): Outcome`.

- [ ] **Step 1: Write the failing tests.** Append to `src/ui/truffle/timelines.test.ts`:

```ts
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
```

Create `src/ui/worlds/moments.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID, type KidState } from '../../types';
import { MOMENTS, runMoment } from './moments';
import { WORLD_ART } from './scenes';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const DAY = '2026-10-06';

describe('prop moments (spec 2026-10-04 §4.5)', () => {
  it("every world has 2–4 moments, one for each of its props, and Truffle's own props are 2–3 of them", () => {
    for (const w of WORLDS) {
      const m = MOMENTS[w.id];
      expect(m.length, w.id).toBeGreaterThanOrEqual(2);
      expect(m.length, w.id).toBeLessThanOrEqual(4);
      expect(m.map((x) => x.prop).sort(), w.id).toEqual(Object.keys(WORLD_ART[w.id].props).sort());
      for (const x of m) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('labels are Chinese (child screens: no English)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id]) expect(x.label, x.prop).toMatch(/^[一-鿿]+$/);
  });
  it('a moment that starts by itself never gives a find (review focus 1)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id].filter((m) => m.auto)) {
      for (let taps = 1; taps <= 5; taps++) expect(runMoment(w.id, x.prop, kid(), DAY, taps).kid, `${w.id}:${x.prop}`).toBeUndefined();
    }
  });
  it('every world has at least one moment that can start by itself on Home', () => {
    for (const w of WORLDS) expect(MOMENTS[w.id].some((m) => m.auto), w.id).toBe(true);
  });
  it('the box in the tall grass shows the next animal once a day', () => {
    const first = runMoment('grass', 'box', kid(), DAY, 1);
    expect(first.fx).toEqual({ kind: 'animal', animal: 'rat' });
    expect(first.kid!.finds.animals).toEqual(['rat']);
    expect(first.say).toBe('找到了！');
    const again = runMoment('grass', 'box', first.kid!, DAY, 1);
    expect(again.kid).toBeUndefined(); // nothing new today; the rat just waves
    expect(again.fx).toEqual({ kind: 'animal', animal: 'rat' });
  });
  it('the gem block cracks three times, then pops the day’s gem; a new day starts over (review focus 3)', () => {
    for (let n = 1; n <= 3; n++) {
      const o = runMoment('blocks', 'gem-block', kid(), DAY, n);
      expect(o.fx).toEqual({ kind: 'crack', cracks: n, gem: false });
      expect(o.kid).toBeUndefined();
    }
    const pop = runMoment('blocks', 'gem-block', kid(), DAY, 4);
    expect(pop.fx).toMatchObject({ kind: 'crack', gem: true });
    expect(pop.kid!.finds.gems).toBe(1);
    expect(runMoment('blocks', 'gem-block', pop.kid!, DAY, 5).kid).toBeUndefined(); // one gem a day
  });
  it('the egg remembers the tap; once hatched the baby hops', () => {
    const o = runMoment('dino', 'nest', kid(), DAY, 1);
    expect(o.fx).toEqual({ kind: 'wobble' });
    expect(o.kid!.finds.eggTapped).toBe(true);
    expect(runMoment('dino', 'nest', o.kid!, DAY, 1).kid).toBeUndefined(); // already remembered
    const hatched = runMoment('dino', 'nest', kid({ finds: { ...DEFAULT_FINDS, eggTapped: true, dinoHatched: true } }), DAY, 1);
    expect(hatched.fx).toEqual({ kind: 'hop' });
    expect(hatched.say).toBe('你好，小恐龙！');
  });
  it('the X gives one bonus star a day, then Truffle just digs', () => {
    const o = runMoment('pirate', 'x', kid({ bonusStars: 2 }), DAY, 1);
    expect(o.fx).toEqual({ kind: 'dig', star: true });
    expect(o.kid).toMatchObject({ bonusStars: 3, finds: { lastDigDate: DAY } });
    const again = runMoment('pirate', 'x', o.kid!, DAY, 1);
    expect(again.kid).toBeUndefined();
    expect(again.say).toBe('挖呀挖！');
  });
  it('the rocket counts down in Chinese; the parrot says hello; the sprinkler gets a flinch, then a laugh', () => {
    expect(runMoment('space', 'rocket', kid(), DAY, 1).speak).toBe('三，二，一！');
    expect(runMoment('pirate', 'parrot', kid(), DAY, 1).speak).toBe('你好！');
    const s = runMoment('yard', 'sprinkler', kid(), DAY, 1);
    expect(s).toMatchObject({ react: 'flinch', say: '哇！', later: { say: '哈哈哈！', ms: 700 } });
  });
  it('Truffle plays along: he pounces on the ball, munches at his bowl and watches the bird', () => {
    expect(runMoment('yard', 'ball', kid(), DAY, 1).react).toBe('pounce');
    expect(runMoment('yard', 'bowl', kid(), DAY, 1)).toMatchObject({ react: 'munch', sfx: 'munch' });
    expect(runMoment('yard', 'birdhouse', kid(), DAY, 1).react).toBe('watch');
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/ui/truffle/timelines.test.ts src/ui/worlds/moments.test.ts`.
  - Expected: FAIL. `REACTIONS.munch` is undefined and `./moments` cannot be resolved.

- [ ] **Step 3: Implement.**

In `src/ui/truffle/timelines.ts`:
- **Kinds.** Extend `ReactionKind` with `| 'munch' | 'watch' | 'proud'`.
- **Track.** Add to `TRACKS`, after `nod`:

```ts
  chew: track([[110, { y: 2 }], [220, { y: 0 }], [330, { y: 2 }], [440, { y: 0 }], [550, { y: 2 }], [700, { y: 0 }, back]]),
```

- **Reactions.** Add to `REACTIONS`:

```ts
  munch: { expr: 'content', track: 'chew', holdMs: 1300 },
  watch: { expr: 'curious', track: null, holdMs: 1800 },
  proud: { expr: 'proud', track: 'nod', holdMs: 1500 },
```

Create `src/ui/worlds/moments.ts`:

```ts
// Prop moments (spec 2026-10-04 §4.5): Truffle plays with his own things without walking across the screen. Which props
// each world has, what each moment does, and the daily finds they host (spec §15) — the same finds as before, now on props.
import type { Sfx } from '../../audio/sfx';
import { dig, findAnimal, tapEgg, tapGem } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import type { ReactionKind } from '../truffle/timelines';

/** What a moment draws (momentFx.ts turns it into SVG). */
export type Fx =
  | { kind: 'spray' } | { kind: 'munch' } | { kind: 'roll' } | { kind: 'bird' }
  | { kind: 'animal'; animal: string } | { kind: 'flutter' }
  | { kind: 'lap' } | { kind: 'tip' }
  | { kind: 'crack'; cracks: number; gem: boolean } | { kind: 'scratch' } | { kind: 'sparkle' }
  | { kind: 'wobble' } | { kind: 'hop' } | { kind: 'drops' }
  | { kind: 'bubbles' } | { kind: 'swim' }
  | { kind: 'launch' } | { kind: 'drift' }
  | { kind: 'dig'; star: boolean } | { kind: 'open' } | { kind: 'flap' };

/** A prop the child can tap; `auto` moments also start by themselves on Home now and then (never ones that hold a find). */
export interface PropMoment { prop: string; label: string; auto: boolean }

export const MOMENTS: Record<WorldId, PropMoment[]> = {
  yard: [{ prop: 'sprinkler', label: '洒水器', auto: false }, { prop: 'bowl', label: '小碗', auto: true }, { prop: 'ball', label: '红球', auto: true }, { prop: 'birdhouse', label: '鸟屋', auto: true }],
  grass: [{ prop: 'box', label: '纸箱', auto: false }, { prop: 'butterfly', label: '蝴蝶', auto: true }],
  race: [{ prop: 'kart', label: '赛车', auto: false }, { prop: 'cone', label: '路障', auto: true }],
  blocks: [{ prop: 'gem-block', label: '宝石', auto: false }, { prop: 'post', label: '猫抓板', auto: true }, { prop: 'statue', label: '猫雕像', auto: false }],
  dino: [{ prop: 'nest', label: '恐龙蛋', auto: false }, { prop: 'leaf', label: '大叶子', auto: true }],
  sea: [{ prop: 'sub', label: '潜水艇', auto: false }, { prop: 'fish', label: '小鱼', auto: true }],
  space: [{ prop: 'rocket', label: '火箭', auto: false }, { prop: 'yarn', label: '毛线球', auto: true }],
  pirate: [{ prop: 'x', label: '宝藏', auto: false }, { prop: 'chest', label: '藏宝箱', auto: false }, { prop: 'parrot', label: '鹦鹉', auto: true }],
};

/** What happens: what is drawn, how Truffle reacts, what he says (and a line after), what is spoken, a sound, a saved find. */
export interface Outcome {
  fx: Fx;
  react: ReactionKind;
  say?: string;
  later?: { say: string; ms: number };
  speak?: string;
  sfx?: Sfx;
  kid?: KidState;
}

/** One moment. Pure, so the finds keep their rules: one animal, one gem (after three cracks) and one dig star a day; the egg remembered. */
export function runMoment(world: WorldId, prop: string, kid: KidState, today: string, gemTaps: number): Outcome {
  const f = kid.finds;
  switch (`${world}:${prop}`) {
    case 'yard:sprinkler': return { fx: { kind: 'spray' }, react: 'flinch', say: '哇！', later: { say: '哈哈哈！', ms: 700 } };
    case 'yard:bowl': return { fx: { kind: 'munch' }, react: 'munch', say: '好吃！', sfx: 'munch' };
    case 'yard:ball': return { fx: { kind: 'roll' }, react: 'pounce' };
    case 'yard:birdhouse': return { fx: { kind: 'bird' }, react: 'watch', say: '小鸟！' };
    case 'grass:box': {
      const r = findAnimal(f, today);
      return { fx: { kind: 'animal', animal: r.animal }, react: 'excited', ...(r.isNew ? { kid: { ...kid, finds: r.finds }, say: '找到了！' } : {}) };
    }
    case 'grass:butterfly': return { fx: { kind: 'flutter' }, react: 'pounce' };
    case 'race:kart': return { fx: { kind: 'lap' }, react: 'excited', say: '出发！' };
    case 'race:cone': return { fx: { kind: 'tip' }, react: 'pounce' };
    case 'blocks:gem-block': {
      const r = tapGem(f, today, gemTaps);
      return { fx: { kind: 'crack', cracks: r.cracks, gem: r.gem }, react: r.gem ? 'excited' : 'watch', ...(r.gem ? { kid: { ...kid, finds: r.finds }, say: '宝石！' } : {}) };
    }
    case 'blocks:post': return { fx: { kind: 'scratch' }, react: 'excited' };
    case 'blocks:statue': return { fx: { kind: 'sparkle' }, react: 'proud', say: '像我！' };
    case 'dino:nest': {
      if (f.dinoHatched) return { fx: { kind: 'hop' }, react: 'excited', say: '你好，小恐龙！' };
      const next = tapEgg(f);
      return { fx: { kind: 'wobble' }, react: 'watch', ...(next !== f ? { kid: { ...kid, finds: next } } : {}) };
    }
    case 'dino:leaf': return { fx: { kind: 'drops' }, react: 'flinch' };
    case 'sea:sub': return { fx: { kind: 'bubbles' }, react: 'excited' };
    case 'sea:fish': return { fx: { kind: 'swim' }, react: 'pounce', say: '小鱼！' };
    case 'space:rocket': return { fx: { kind: 'launch' }, react: 'excited', speak: '三，二，一！' };
    case 'space:yarn': return { fx: { kind: 'drift' }, react: 'pounce' };
    case 'pirate:x': {
      const r = dig(f, today);
      return { fx: { kind: 'dig', star: r.star }, react: 'excited', ...(r.star ? { kid: { ...kid, finds: r.finds, bonusStars: kid.bonusStars + 1 }, say: '找到星星了！' } : { say: '挖呀挖！' }) };
    }
    case 'pirate:chest': return { fx: { kind: 'open' }, react: 'excited', say: '哇！' };
    case 'pirate:parrot': return { fx: { kind: 'flap' }, react: 'watch', speak: '你好！' };
  }
  throw new Error(`no moment for ${world}:${prop}`);
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/ui/truffle src/ui/worlds && npx tsc --noEmit -p .`.
  - Expected: PASS. The existing "every track ends at rest" test also covers `chew`.

- [ ] **Step 5: Commit.** `git add -A src/ui && git commit -m "feat: prop moments for every world, hosting the daily finds; Truffle can munch, watch and be proud"`


### Task 7: What a moment draws (`momentFx`)

**Files:**
- Create: `src/ui/worlds/momentFx.ts`, `src/ui/worlds/momentFx.test.ts`

**Interfaces:**
- **Consumes:** `Fx` from `moments.ts` (Task 6), `WORLD_ART` (Task 5), the kit and tapArt.
- **Produces:**
  - `FX_MS: Record<Fx['kind'], number>`;
  - `GEM_POP_MS`;
  - `momentFx(world, fx, still): { svg: string; hide: string | null }`. `hide` is a selector for the scene's still prop while its moving copy plays.

- [ ] **Step 1: Failing tests.**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID } from '../../types';
import { FX_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment } from './moments';
import { sceneFor } from './scenes';

const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };

describe('what each prop moment draws (spec 2026-10-04 §4.5)', () => {
  for (const w of WORLDS) for (const m of MOMENTS[w.id]) {
    const fx = runMoment(w.id, m.prop, kid, '2026-10-06', 1).fx;
    it(`${w.id}:${m.prop} draws its moment, hiding only a prop the scene has`, () => {
      const { svg, hide } = momentFx(w.id, fx, false);
      if (fx.kind !== 'roll') expect(svg.length).toBeGreaterThan(0);
      expect(svg).not.toMatch(/<filter|filter=/);
      if (hide) expect(sceneFor(w.id, 'afternoon')).toContain(hide.match(/data-prop="([^"]+)"/)![0]);
      expect(FX_MS[fx.kind]).toBeGreaterThan(0);
    });
    it(`${w.id}:${m.prop} with reduced motion: nothing moves`, () => {
      expect(momentFx(w.id, fx, true).svg).not.toMatch(/animateTransform|animateMotion/);
    });
  }
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/ui/worlds/momentFx.test.ts`
  - Expected: FAIL (the module is missing).
- [ ] **Step 3: Implement.**
  - Copy `.superpowers/drafts/stage-c/prototype/momentFx.ts` to `src/ui/worlds/momentFx.ts`.
  - Fix its imports:
    - `WorldId` comes from `'../../fun/worlds'`;
    - drop the local `Fx` union and `import type { Fx } from './moments'`;
    - keep `export const FX_MS` and `GEM_POP_MS`.
  - Where the prototype animates with reduced motion on (`still`), use only `fade(...)`.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: each prop moment drawn in paper, in its own place; with reduced motion things only fade`

### Task 8: `WorldProps` replaces `WorldTaps`

**Files:**
- Create: `src/ui/worlds/WorldProps.tsx`, `src/ui/worlds/WorldProps.test.tsx`
- Delete: `src/ui/worlds/WorldTaps.tsx`, `src/ui/worlds/WorldTaps.test.tsx`, `src/ui/worlds/worldTapsFlavour.test.tsx` (their behaviours are re-pinned below)
- Modify: `src/styles.css` (`.world-taps` → `.world-props`)

**Interfaces:**
- **Consumes:** `MOMENTS`, `runMoment` (Task 6); `momentFx`, `FX_MS`, `GEM_POP_MS` (Task 7); `speak`; `playSfx`; `reducedMotion`.
- **Produces:**
  - `WorldProps({ world, kid, today, onKid, onSay, onReact, autoEvery? })`;
  - `onReact(kind: ReactionKind, side: -1 | 1)` tells Home how Truffle reacts and which side to look to;
  - `autoEvery`, in ms, defaults to `AUTO_MS = 30_000`. Tests pass a small number.

**Behaviour:**
- **Tap boxes.** An overlay `<svg class="world-props" data-world viewBox="0 0 360 480" preserveAspectRatio="xMidYMax slice">` holds one transparent `<rect role="button" tabindex="0" aria-label={label}>` per prop, from `WORLD_ART[world].props` (x, y = ground point; w, h).
- **A tap.** Ignored while busy. Otherwise:
  1. `runMoment(world, prop, kid, today, ++gemTaps)`, where `gemTaps` resets when `today` changes;
  2. play the effect;
  3. `onKid(kid)` if there is one;
  4. `onSay` the line, and the `later` line after its delay;
  5. `speak(...)`, then the sound;
  6. `onReact(react, propX < 180 ? -1 : 1)`.
- **Playing an effect:**
  - Render `momentFx(...).svg` in a fresh keyed `<svg>` (SMIL plays from its start).
  - If `hide` is set, set `visibility: hidden` on `document.querySelector('.world-scene ' + hide)`.
  - After `FX_MS`, or `GEM_POP_MS` for a popped gem, show it again and clear busy.
  - Cracks stay drawn for the visit.
  - A hidden prop is also shown again when another moment starts and on unmount.
- **Auto moments.** Every `autoEvery` ms (plus up to 50% at random), when the page is visible, nothing is busy, and reduced motion is off: pick a random `auto` moment, play its effect and reaction, and never call `onKid`.

- [ ] **Step 1: Failing tests** (fake timers; `speech` and `sfx` mocked).
  - **Labels:** every world renders a button for each of its `MOMENTS` labels.
  - **Grass box:** shows the next animal once a day (`onKid` with `rat`, then not again; the `.tap-pop[data-animal="rat"]` is shown both times).
  - **Busy:** a tap during a moment is ignored (pirate X twice → `onKid` once).
  - **Gem:** the gem block cracks three times, then pops a gem (`onKid` once with `gems: 1`). Yesterday's taps don't count today (rerender with a new `today` → three more cracks first).
  - **Hidden prop:** with the yard scene rendered beside it, `ball` is hidden while it moves and shown again after its moment. A prop hidden mid-moment comes back on unmount.
  - **Auto:** with `autoEvery={1000}` the yard plays an auto moment by itself and never calls `onKid`. With reduced motion (`vi.mock('../motion')` returning true) nothing starts by itself, and taps still find things.
  - **Speech:** the rocket counts down (`speak('三，二，一！')`), and the parrot says `你好！`.
  - **Reactions:**
    - `onReact`: the sprinkler gives `('flinch', -1)`;
    - the sprinkler's `say` sequence is `哇！` then `哈哈哈！` after 700 ms.
- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/ui/worlds/WorldProps.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement `WorldProps.tsx`.**
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/ui/worlds && npx tsc --noEmit -p .`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: WorldProps — every world's props are tappable moments; some start by themselves; finds unchanged`

### Task 9: Home plays with the props

**Files:**
- Modify: `src/app/HomeScreen.tsx`
- Test: `src/app/home.test.tsx`

- [ ] **Step 1: Failing test.**
  - On Home in the yard, tapping `小碗` makes Truffle say `好吃！` in his bubble.
  - Truffle's rig gets a `munch` reaction and looks toward the bowl: the `Pet` `react` prop is set, and `lookAt` is −1.
- [ ] **Step 2: Run it.**
  - Run: `npx vitest run src/app/home.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Swap `WorldTaps` for `WorldProps`.
  - `onReact` sets `react = { kind, key: n+1 }` and `lookAt = side` for the reaction's `holdMs` (`REACTIONS[kind].holdMs`), then sets `lookAt` back to 0.
  - Pass `react` and `lookAt` to `<Pet>`.
- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/app && npx tsc --noEmit -p .`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: Truffle plays with his props on Home, looking toward them`

### Task 10: WebKit

**Files:**
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`

- [ ] **Step 1: Add the stage cases.**
  - `worlds`: a contact sheet of all 8 worlds by day and by evening, screenshotted for the parent (`fit-shots/stage-cases/worlds-*.png`).
  - `moments`: `WorldScene` plus `WorldProps` (`autoEvery` large) for `?world=`.
- [ ] **Step 2: Add the checks to the runner.**
  - For each world, tap each prop in turn at the iPad landscape size, while the rAF work meter is installed (as in the `alive` case).
  - Fail if the worst frame's work is more than 8 ms.
  - Fail if any prop's tap box is covered by another element at its centre (`document.elementFromPoint`).
- [ ] **Step 3: Run the cases.**
  - Run: `npx tsx scripts/stage-cases.ts`
  - Expected: `stage cases: ok`.
- [ ] **Step 4: Run the sweep and the suite.**
  - Run: `npm run fit`
  - Expected: 0 problems.
  - Run: `npx vitest run`
  - Expected: all pass.
- [ ] **Step 5: Commit.** `test: every world and every prop moment checked in WebKit`

