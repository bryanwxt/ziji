# Story art: style, backgrounds, painted Truffle and Granny Dragon (Word Thief 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Give the parent a style sheet and Gemini prompts, and a script that turns their paintings into small 4:3 WebP backgrounds.
- Repaint Truffle in the soft painted style without changing his rig.
- Draw Granny Dragon.
- Show it all together on one picture-book test page, checked in WebKit.

**Architecture:**
- **Words for the parent** (`docs/story/style.md`, `docs/story/prompts.md`): written first, because the parent generates the paintings in the Gemini app while the code tasks run.
- **Backgrounds:** `scripts/art/backgrounds.ts` uses a pure helper, `src/story/art.ts`, to crop, resize and compress the originals in `art/backgrounds/` into `public/story/bg/<id>.webp`, and lists `@scene` ids that have no image yet.
- **Truffle's repaint** changes only his art strings (`parts.ts`) and the face colours (`Truffle.tsx`, `rig.ts`).
  - Gradients live in a per-instance `<defs>`, and part strings refer to them as `url(#tf-…)`, rewritten per instance. WebKit can't paint a gradient defined in another, possibly hidden, SVG.
- **Granny Dragon** is a new component, `src/ui/story/GrannyDragon.tsx`.
- **Two new stage cases:** `granny` (a pose sheet) and `story-page` (the test page).

**Tech Stack:** Preact + TypeScript, SVG, sharp (already installed through the PWA asset tooling; made an explicit devDependency here), vitest, playwright-core WebKit stage cases.

**Spec:** `docs/superpowers/specs/2026-10-07-ziji-story-art-design.md`. Also read `docs/story/bible.md` (cast looks, places, background ids) and the parent spec's §5.7.

## Global Constraints

- **Backgrounds:**
  - 4:3, centre-cropped, **1600×1200**, WebP, **≤ 300 KB** each;
  - Season 1 total **≤ 2.5 MB**;
  - originals in `art/backgrounds/<id>.<ext>`, output in `public/story/bg/<id>.webp`.
- **Paintings contain no people, no animals, no readable text or signs, and no logos.** The lower-middle third is kept clear and flat. Light comes from the upper left.
- **Prompts describe the look and never name a studio or film.**
- **Characters:**
  - no hard black outlines: edges are a darker shade of their own fill, and `#2a2630` (INK) is never used on fur or scales;
  - soft gradient shading lit from the upper left;
  - big readable expressions.
- **Truffle's rig is frozen:**
  - the `viewBox` stays `30 20 260 270`;
  - every `data-part` stays: `shadow`, `rig`, `tail`, `body`, `headpos`, `headrot`, `ear-l`, `ear-r`, `ear-in-l`, `ear-in-r`, `blush-l`, `blush-r`, `eye-l`, `eye-r`, `iris-l`, `iris-r`, `pupil-l`, `pupil-r`, `lid-top-l/r`, `lid-bottom-l/r`, `lid-edge-l/r`, `lid-bedge-l/r`, `lid-closed-l/r`, `brow-l`, `brow-r`, `mouth`, `extra-*`, `paw-l`, `paw-r`;
  - the transform origins stay: tail `214px 246px`, body `160px 276px`, ears `100px 78px` / `220px 78px`, head rotation `160 190`, paws `138 266` / `182 266`.
- **Costume art is not touched** (spec §7). Costumes keep their current look on the new body.
- **Reduced motion:** nothing new moves.
- **The shared palette** (`docs/story/style.md`) is used by both layers.
- **Before each commit:** `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` pass. Layout is checked with `npx tsx scripts/stage-cases.ts` (WebKit), with 0 problems.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **The child sees Chinese only on his screens:** the test page's English is the story text, which is allowed (spec 3a).

## Review Focus

1. **Two Truffles on one screen,** one of them hidden (Home's hidden copy, a costume preview grid). Each must paint its gradients from its own `<defs>`. Test: Task 3, "two Truffles never share a gradient id, and each url(#…) resolves inside its own svg".
2. **A costume that hides the ears** (`hidesEars`), or a costume `tail` that replaces his. The repaint must not drop the fur gradient defs those parts and the head rely on. Test: Task 3, "with an ear-hiding hood and a costume tail, every url(#…) still resolves".
3. **A parent's original that is portrait, tiny or already WebP.** The script must still give a 1600×1200 4:3 WebP, or say clearly why not. Test: Task 2, "a portrait original is centre-cropped to 4:3" and "an original smaller than 1600×1200 is refused".
4. **A noisy painting that won't fit in 300 KB at quality 80.** The script steps the quality down, and fails loudly below 50. Test: Task 2, "steps quality down to fit 300 KB, refuses below 50".
5. **Granny Dragon under reduced motion while `talking`.** Her mouth must not move. Test: Task 4, "reduced motion: talking draws a still, closed mouth".

---

## File map

| File | Responsibility |
|---|---|
| `docs/story/style.md` | The style sheet (spec §2): look, light, palette swatches, composition, character rules |
| `docs/story/prompts.md` | The shared style paragraph, one prompt per background id, the parent's steps and the reject checklist (spec §3) |
| `src/story/art.ts` | `prepareBackground`, `sceneIds`, `missingScenes` |
| `src/story/art.test.ts` | Tests for those |
| `scripts/art/backgrounds.ts` | CLI: originals → WebP, budget, pending list |
| `src/ui/truffle/parts.ts`, `rig.ts`, `Truffle.tsx` | Truffle's repaint |
| `src/ui/truffle/paint.ts` | The shared palette for SVG and Truffle's gradient defs, with `paintIds` |
| `src/ui/story/GrannyDragon.tsx`, `.test.tsx` | Granny Dragon |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | The `granny` and `story-page` cases |

---

### Task 1: The style sheet and the Gemini prompts

**Files:**
- Create: `docs/story/style.md`, `docs/story/prompts.md`

**Interfaces:**
- Produces: the palette swatch names and hex values that `src/ui/truffle/paint.ts` (Task 3) and Granny Dragon (Task 4) use. The background ids in the prompts match `docs/story/bible.md` §3.

- [ ] **Step 1: Write `docs/story/style.md`** with spec §2's sections: Look, Light, Palette, Content of a background, Composition, Characters (SVG).
  - The palette is a table of 12 named swatches, each with a hex value and a use. Use exactly these:

| Name | Hex | Use |
|---|---|---|
| `sky` | `#a9d3e8` | skies, cool light |
| `sky-deep` | `#6fa8c9` | sky gradients, shadows on water |
| `leaf` | `#7fae6a` | rain trees, plants |
| `leaf-deep` | `#4f7d4a` | foliage shadow |
| `cream` | `#f6ecd6` | HDB walls, paper |
| `terracotta` | `#d98a62` | tiles, roofs, warm accent |
| `sun` | `#f4c66b` | sunlight, lamps, gold |
| `shadow` | `#7a7398` | shadows (blue-violet, never black) |
| `fur` | `#a9a4ab` | Truffle's grey |
| `fur-deep` | `#7d7882` | Truffle's shading and edge |
| `chest` | `#fbf5ea` | Truffle's white chest and paws |
| `jade` | `#6dbb94` | Granny Dragon |

- [ ] **Step 2: Write `docs/story/prompts.md`:**
  - **The shared style paragraph** (about 90 words), pasted before every prompt. Use exactly:

    > A hand-painted watercolour and gouache illustration for a children's picture book, soft edges and visible paper grain, gentle warm light from the upper left, cool blue-violet shadows (never black), big soft sky, lived-in everyday details, calm and cosy mood, tropical Singapore neighbourhood. Landscape 4:3, eye-level view. Keep the lower-middle third of the picture clear, flat open ground where characters can stand later. No people, no animals, no readable text, letters or numbers anywhere, signs are blank, no logos or brand names.

  - **One prompt per background id,** with the scene, the time and weather, and where the open ground is. Write all eight Season 1 ids:
    - `hdb-voiddeck` (the test scene, listed first)
    - `hdb-morning`
    - `hdb-night`
    - `hawker-noon`
    - `market-morning`
    - `school-field`
    - `school-garden`
    - `playground-afternoon`

    Add one line each for the later ids (`mrt-evening`, `garden-morning`, `sea-sunset`, `chinatown-night`), marked "later". Example for the test scene:

    > `hdb-voiddeck`: the open ground floor of a Singapore HDB block in the late morning: square pillars, a few round stone tables with stools, a small corner coffee stall with a counter, a big steaming pot and stacked cups, potted plants, a letterbox wall in the background, bright tropical daylight spilling in from the left beyond the pillars. Clear smooth floor in the lower middle.

  - **The parent's steps** (spec §3):
    1. Generate the test scene first, asking for a 4:3 image, until one feels right.
    2. Save it as `art/backgrounds/hdb-voiddeck.png`.
    3. For every other scene, attach the approved image first with "Match the painting style, colours and light of the attached image exactly", then paste the style paragraph and the scene prompt.
    4. Drop the files into `art/backgrounds/` named by id, or send them in chat and Claude will save them.
  - **The reject checklist,** five checkboxes:
    - no text or writing anywhere;
    - no people or animals;
    - a clear lower-middle third;
    - light from the upper left;
    - it matches the reference.

- [ ] **Step 3: Check them.**
  Run: `grep -inE "ghibli|miyazaki|totoro|spirited" docs/story/prompts.md docs/story/style.md`
  Expected: no matches in prompts.md. style.md may say "Ghibli-inspired" once, in its Look section, as a note for the parent, never inside a prompt.

- [ ] **Step 4: Commit.**

```bash
git add docs/story/style.md docs/story/prompts.md
git commit -m "story art: the style sheet and Gemini prompts (3b §2–3)"
```

- [ ] **Step 5: Hand the style sheet and prompts to the parent** (scratchpad copy plus SendUserFile), so they can start generating `hdb-voiddeck` while Tasks 2–5 run. Ask them to send the image they pick. Continue without waiting.

### Task 2: The background pipeline

**Files:**
- Create: `src/story/art.ts`, `src/story/art.test.ts`, `scripts/art/backgrounds.ts`, `art/backgrounds/.gitkeep`, `public/story/bg/.gitkeep`
- Modify: `package.json` (devDependency `sharp`)

**Interfaces:**
- Consumes: `parseChapter` and `Chapter` from `src/story/format.ts` (3a).
- Produces:

```ts
export const BG_WIDTH = 1600, BG_HEIGHT = 1200, BG_MAX_BYTES = 300_000, BG_SEASON_MAX_BYTES = 2_500_000;
export async function prepareBackground(input: Buffer): Promise<{ webp: Buffer; quality: number; width: number; height: number }>; // throws Error with a reason
export function sceneIds(chapters: Chapter[]): string[]; // distinct @scene ids, in order of first use
export function missingScenes(ids: string[], have: ReadonlySet<string>): string[];
```

- [ ] **Step 1: Add sharp explicitly.**
  Run: `npm install --save-dev sharp@^0.35.4`
  Expected: package.json gains `"sharp"` under devDependencies. The version is already in the lockfile, so nothing new is downloaded.

- [ ] **Step 2: Write the failing tests.** Create `src/story/art.test.ts`:

```ts
// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { parseChapter } from './format';
import { BG_HEIGHT, BG_MAX_BYTES, BG_WIDTH, missingScenes, prepareBackground, sceneIds } from './art';

const flat = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 180, b: 210 } } }).png().toBuffer();
/** Random pixels: the worst case for compression. */
const noise = (w: number, h: number) => {
  const raw = Buffer.alloc(w * h * 3);
  let x = 12345;
  for (let i = 0; i < raw.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; raw[i] = x & 255; }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
};

describe('backgrounds (spec 3b §4)', () => {
  it('a landscape original becomes a 1600×1200 WebP under 300 KB', async () => {
    const r = await prepareBackground(await flat(2400, 1600));
    const meta = await sharp(r.webp).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', BG_WIDTH, BG_HEIGHT]);
    expect(r.webp.length).toBeLessThanOrEqual(BG_MAX_BYTES);
  });
  it('a portrait original is centre-cropped to 4:3', async () => {
    const r = await prepareBackground(await flat(1800, 2700));
    expect([r.width, r.height]).toEqual([BG_WIDTH, BG_HEIGHT]);
  });
  it('an original smaller than 1600×1200 is refused', async () => {
    await expect(prepareBackground(await flat(1200, 900))).rejects.toThrow(/too small/);
  });
  it('steps quality down to fit 300 KB, refuses below 50', async () => {
    await expect(prepareBackground(await noise(1600, 1200))).rejects.toThrow(/300 KB/);
  }, 30_000);
  it('lists each @scene once, in order, and what has no image yet', () => {
    const md = (n: number, scenes: string[]) => `---\nchapter: ${n}\ntitle: T\nplace: hdb\nslots: []\n---\n## Setup\n${scenes.map((s, i) => `### Page ${i + 1}\n@scene ${s}\nText.`).join('\n')}\n`;
    const ids = sceneIds([parseChapter(md(1, ['hdb-morning', 'hdb-voiddeck'])), parseChapter(md(2, ['hdb-voiddeck', 'hawker-noon']))]);
    expect(ids).toEqual(['hdb-morning', 'hdb-voiddeck', 'hawker-noon']);
    expect(missingScenes(ids, new Set(['hdb-voiddeck']))).toEqual(['hdb-morning', 'hawker-noon']);
  });
});
```

- [ ] **Step 3: Run them to see them fail.**
  Run: `npx vitest run src/story/art.test.ts`
  Expected: FAIL, because `./art` doesn't exist.

- [ ] **Step 4: Implement** `src/story/art.ts`:

```ts
// Backgrounds for the story (spec 2026-10-07 3b §4): the parent's paintings, centre-cropped to 4:3, 1600×1200, WebP ≤ 300 KB.
import sharp from 'sharp';
import type { Chapter } from './format';

export const BG_WIDTH = 1600;
export const BG_HEIGHT = 1200;
export const BG_MAX_BYTES = 300_000;
export const BG_SEASON_MAX_BYTES = 2_500_000;
const QUALITY_START = 80;
const QUALITY_FLOOR = 50;

export async function prepareBackground(input: Buffer): Promise<{ webp: Buffer; quality: number; width: number; height: number }> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  // the 4:3 box that fits inside the original, centred
  const cw = Math.min(w, Math.round((h * 4) / 3));
  const ch = Math.round((cw * 3) / 4);
  if (cw < BG_WIDTH || ch < BG_HEIGHT) throw new Error(`too small: ${w}×${h} gives a ${cw}×${ch} 4:3 crop; at least ${BG_WIDTH}×${BG_HEIGHT} is needed`);
  const left = Math.floor((w - cw) / 2);
  const top = Math.floor((h - ch) / 2);
  for (let quality = QUALITY_START; quality >= QUALITY_FLOOR; quality -= 5) {
    const webp = await sharp(input).extract({ left, top, width: cw, height: ch }).resize(BG_WIDTH, BG_HEIGHT).webp({ quality }).toBuffer();
    if (webp.length <= BG_MAX_BYTES) return { webp, quality, width: BG_WIDTH, height: BG_HEIGHT };
  }
  throw new Error(`can't fit in 300 KB even at quality ${QUALITY_FLOOR}: simplify the painting or regenerate it`);
}

export function sceneIds(chapters: Chapter[]): string[] {
  const out: string[] = [];
  for (const c of chapters) for (const p of [...c.setup, ...c.payoff]) for (const l of p.lines) if (l.kind === 'scene' && !out.includes(l.id)) out.push(l.id);
  return out;
}

export const missingScenes = (ids: string[], have: ReadonlySet<string>): string[] => ids.filter((id) => !have.has(id));
```

  Create `scripts/art/backgrounds.ts`:

```ts
// The parent's paintings → story backgrounds (spec 3b §4): npx tsx scripts/art/backgrounds.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { BG_SEASON_MAX_BYTES, missingScenes, prepareBackground, sceneIds } from '../../src/story/art';
import { parseChapter } from '../../src/story/format';

const SRC = 'art/backgrounds';
const OUT = 'public/story/bg';
mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const f of readdirSync(SRC).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
  const id = f.replace(/\.[^.]+$/, '');
  const src = `${SRC}/${f}`;
  const out = `${OUT}/${id}.webp`;
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue; // already made from this original
  try {
    const r = await prepareBackground(readFileSync(src));
    writeFileSync(out, r.webp);
    console.log(`${id}: ${Math.round(r.webp.length / 1000)} KB at quality ${r.quality}`);
  } catch (e) { failed++; console.log(`${id}: ${(e as Error).message}`); }
}
const have = new Set(readdirSync(OUT).filter((x) => x.endsWith('.webp')).map((x) => x.replace(/\.webp$/, '')));
const total = [...have].reduce((n, id) => n + statSync(`${OUT}/${id}.webp`).size, 0);
const chapters = readdirSync('docs/story').filter((d) => d.startsWith('season-')).flatMap((d) =>
  readdirSync(`docs/story/${d}`).filter((x) => /^ch\d+\.md$/.test(x)).map((x) => parseChapter(readFileSync(`docs/story/${d}/${x}`, 'utf8'))));
const pending = missingScenes(sceneIds(chapters), have);
console.log(`${have.size} backgrounds, ${Math.round(total / 1000)} KB in all${total > BG_SEASON_MAX_BYTES ? ' — OVER the 2.5 MB budget' : ''}`);
console.log(pending.length ? `pending (no painting yet): ${pending.join(', ')}` : 'every scene has a painting');
process.exit(failed || total > BG_SEASON_MAX_BYTES ? 1 : 0);
```

  Create the empty `art/backgrounds/.gitkeep` and `public/story/bg/.gitkeep`.

- [ ] **Step 5: Run them to see them pass.**
  Run: `npx vitest run src/story/art.test.ts && npx tsx scripts/art/backgrounds.ts`
  Expected:
  - the tests PASS;
  - the script prints `0 backgrounds, 0 KB in all` and `pending (no painting yet): hdb-morning, hdb-voiddeck` (the ids used by ch01–03) and exits 0.

- [ ] **Step 6: Commit.**

```bash
git add package.json package-lock.json src/story/art.ts src/story/art.test.ts scripts/art art/backgrounds/.gitkeep public/story/bg/.gitkeep
git commit -m "story art: the background pipeline — 4:3, 1600×1200 WebP ≤ 300 KB, pending scenes (3b §4)"
```

### Task 3: Truffle, repainted on the same rig

**Files:**
- Create: `src/ui/truffle/paint.ts`
- Modify: `src/ui/truffle/parts.ts` (`TORSO`, `PAW_L`, `PAW_R`, `TAIL`, `EAR_L`, `EAR_R`, `EAR_IN_L`, `EAR_IN_R`, `HEAD_SHAPE`, and `BODY`/`HEAD` as their combined forms), `src/ui/truffle/rig.ts` (`FUR`, the `EXTRAS` ink), `src/ui/truffle/Truffle.tsx` (defs, the per-instance id rewrite, the face colours)
- Test: `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Consumes: Task 1's palette.
- Produces:

```ts
// src/ui/truffle/paint.ts
export const SWATCH: { sky: string; skyDeep: string; leaf: string; leafDeep: string; cream: string; terracotta: string; sun: string; shadow: string; fur: string; furDeep: string; chest: string; jade: string };
export const EDGE: { fur: string; chest: string; face: string }; // soft edge colours (never #2a2630)
export function truffleDefs(id: string): string; // <linearGradient>/<radialGradient> elements with ids `${id}-tf-…`
export const paintIds = (art: string, id: string): string => art.replaceAll('url(#tf-', `url(#${id}-tf-`);
```

- [ ] **Step 1: Capture the "before" sheets.**
  Run: `npx tsx scripts/stage-cases.ts`
  Then: `mkdir -p fit-shots/before && cp fit-shots/stage-cases/faces.png fit-shots/stage-cases/costumes.png fit-shots/before/`
  Expected: the stage cases are ok, and the two before sheets are saved.

- [ ] **Step 2: Write the failing tests.** Add to `src/ui/truffle/Truffle.test.tsx`:

```tsx
import { BODY, EAR_L, EAR_R, HEAD_SHAPE, PAW_L, PAW_R, TAIL, TORSO } from './parts';

describe('Truffle repainted (spec 3b §5)', () => {
  const RIG = ['shadow', 'rig', 'tail', 'body', 'headpos', 'headrot', 'ear-l', 'ear-r', 'ear-in-l', 'ear-in-r', 'blush-l', 'blush-r', 'eye-l', 'eye-r',
    'iris-l', 'iris-r', 'pupil-l', 'pupil-r', 'lid-top-l', 'lid-top-r', 'lid-bottom-l', 'lid-bottom-r', 'brow-l', 'brow-r', 'mouth', 'paw-l', 'paw-r'];
  it('keeps every part of his rig and his frame', () => {
    const { container } = render(<Truffle />);
    const svg = container.querySelector('svg.truffle')!;
    expect(svg.getAttribute('viewBox')).toBe('30 20 260 270');
    for (const p of RIG) expect(svg.querySelector(`[data-part="${p}"]`), p).toBeTruthy();
  });
  it('no hard black outline on his fur, chest or paws', () => {
    for (const art of [TORSO, BODY, PAW_L, PAW_R, TAIL, EAR_L, EAR_R, HEAD_SHAPE]) expect(art).not.toContain('#2a2630');
  });
  it('two Truffles never share a gradient id, and each url(#…) resolves inside its own svg', () => {
    const { container } = render(<div><Truffle /><div style="display:none"><Truffle outfit="tiger" /></div></div>);
    const svgs = [...container.querySelectorAll('svg.truffle')];
    const ids = svgs.map((s) => [...s.querySelectorAll('linearGradient, radialGradient')].map((g) => g.id));
    expect(ids[0]!.length).toBeGreaterThan(0);
    expect(ids[0]!.some((i) => ids[1]!.includes(i))).toBe(false);
    for (const s of svgs) {
      const refs = [...s.outerHTML.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!);
      for (const r of refs) expect(s.querySelector(`[id="${r}"]`), r).toBeTruthy();
    }
  });
  it('with an ear-hiding hood and a costume tail, every url(#…) still resolves', () => {
    const hood = COSTUMES.find((c) => costumeLayer(c.id)?.hidesEars && costumeLayer(c.id)?.tail)!;
    const { container } = render(<Truffle outfit={hood.id} />);
    const s = container.querySelector('svg.truffle')!;
    for (const m of s.outerHTML.matchAll(/url\(#([^)]+)\)/g)) expect(s.querySelector(`[id="${m[1]}"]`), m[1]).toBeTruthy();
  });
});
```

Import `COSTUMES` from `../../fun/costumes` and `costumeLayer` from `./costumes` if the test file doesn't already. This was checked on 2026-10-07: `tiger` is a real costume id, and rat, ox, tiger, rabbit and dragon all hide the ears and bring their own tail.

  Note: a clip path that is already per-instance (`${id}-in-l`) counts as resolving. Existing costume art may use `url(#…)` ids of its own. If the resolve test fails only on costume-owned ids, scope the check to ids starting with the instance's own prefix plus `tf-`, and record a Ruling. Costume art is out of scope (spec §7).

- [ ] **Step 3: Run them to see them fail.**
  Run: `npx vitest run src/ui/truffle/Truffle.test.tsx`
  Expected: FAIL. `#2a2630` is in the art, and there are no gradients yet.

- [ ] **Step 4: Repaint.**
  - Create `src/ui/truffle/paint.ts` with `SWATCH` (Task 1's hex values), and `EDGE = { fur: '#6f6a75', chest: '#cfc6b8', face: '#4a4250' }`.
  - `truffleDefs(id)` returns:
    - `${id}-tf-fur`: a radialGradient centred at about 35% 30%, from `#c4bfc6` through `SWATCH.fur` to `SWATCH.furDeep` at the edge (lit from the upper left);
    - `${id}-tf-chest`: from `#ffffff` to `SWATCH.chest` to `#e9dfcf`;
    - `${id}-tf-ear`: pink inside, `#ffd0cb` to `#f0a8a6`;
    - `${id}-tf-tail`: the fur ramp along the tail;
    - `${id}-tf-rim`: a soft cream rim at low opacity.
  - Add `paintIds`.
  - In `parts.ts`, for each fur part:
    - change `fill="#b8b3b6"` to `fill="url(#tf-fur)"` (`url(#tf-tail)` for TAIL) and white fills to `url(#tf-chest)`;
    - replace `stroke="#2a2630" stroke-width="3.2"` with `stroke="${EDGE.fur}" stroke-width="2.2"` (`EDGE.chest` for the chest and paws);
    - add 3–4 short tabby stripes as `<path … stroke="#8d8893" stroke-width="5" stroke-linecap="round" opacity=".55" fill="none"/>`: on the forehead in HEAD_SHAPE (an M-shaped tabby mark), 2 on TORSO's back and 3 rings on TAIL, all inside each part's own outline.
  - Keep every outline path's `d` the same, so his silhouette and every costume anchor stay put. Keep `HEAD_EARLESS` working: its regexes match the ear paths by their `d`, so keep those `d` strings first in their elements.
  - In `rig.ts`, set `FUR = '#a9a4ab'` (the lids must match the new fur), and make the `EXTRAS` ink `EDGE.face`.
  - In `Truffle.tsx`:
    - set `INK = EDGE.face` for the eye outline, lid edges, brows and mouth outline;
    - make the pupils `#2f2a36` (pupils stay dark, which reads best);
    - make the iris `#9cc56a`, with a lighter `#c6e39a` highlight circle at the iris's upper left;
    - render `<defs dangerouslySetInnerHTML={{ __html: truffleDefs(id) }} />` as the first child of the svg;
    - wrap every part string Truffle owns (`TAIL`, `TORSO`, `EAR_*`, `HEAD_SHAPE`, `PAW_*`) in `paintIds(…, id)`.
  - `id` already exists (`truffle-${useId()}`). Make sure it is a valid id fragment: `useId()` can contain `:`; replace non-word characters with `-`.

- [ ] **Step 5: Run them to see them pass.**
  Run: `npx vitest run src/ui/truffle && npx tsc --noEmit -p .`
  Expected: PASS, including every existing rig, reaction, costume and accessory test, unchanged.

- [ ] **Step 6: Check it in WebKit.**
  Run: `npx tsx scripts/stage-cases.ts`
  Expected: `stage cases: ok`. That includes the faces case's "nothing pokes out of his box" check and the alive frame check.
  Then look at `fit-shots/stage-cases/faces.png` and `costumes.png` next to `fit-shots/before/*.png`. Fix anything that looks off: a stripe outside his outline, costumes floating, the eyes too pale. Re-run until it looks right.

- [ ] **Step 7: Commit.**

```bash
git add src/ui/truffle
git commit -m "truffle: repainted soft and painted on the same rig — gradients per instance, no ink outlines on fur (3b §5)"
```

### Task 4: Granny Dragon

**Files:**
- Create: `src/ui/story/GrannyDragon.tsx`, `src/ui/story/GrannyDragon.test.tsx`
- Modify: `scripts/stage-cases/page.tsx` (`granny` case), `scripts/stage-cases.ts` (screenshot `fit-shots/stage-cases/granny.png`)

**Interfaces:**
- Consumes: `SWATCH`, `EDGE` and `paintIds` from `src/ui/truffle/paint.ts`, and `reducedMotion` from `src/ui/motion`.
- Produces:

```tsx
export type GrannyPose = 'smile' | 'listen' | 'surprised' | 'laugh' | 'point' | 'worried';
export const GRANNY_POSES: GrannyPose[];
export function GrannyDragon(props: { pose?: GrannyPose; size?: number; mirror?: boolean; talking?: boolean; label?: string | null }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests.** Create `src/ui/story/GrannyDragon.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { GRANNY_POSES, GrannyDragon } from './GrannyDragon';

vi.mock('../motion', () => ({ reducedMotion: vi.fn(() => false) }));

describe('Granny Dragon (spec 3b §6)', () => {
  it('draws each of her six poses, labelled 龙奶奶', () => {
    expect(GRANNY_POSES).toEqual(['smile', 'listen', 'surprised', 'laugh', 'point', 'worried']);
    for (const pose of GRANNY_POSES) {
      const { container, unmount } = render(<GrannyDragon pose={pose} />);
      const svg = container.querySelector('svg.granny')!;
      expect(svg.getAttribute('data-pose')).toBe(pose);
      expect(svg.getAttribute('aria-label')).toBe('龙奶奶');
      unmount();
    }
  });
  it('no hard black outlines; her gradients are her own', () => {
    const { container } = render(<div><GrannyDragon /><GrannyDragon /></div>);
    const [a, b] = [...container.querySelectorAll('svg.granny')];
    expect(a!.outerHTML).not.toContain('#2a2630');
    const ids = (s: Element) => [...s.querySelectorAll('linearGradient, radialGradient')].map((g) => g.id);
    expect(ids(a!).some((i) => ids(b!).includes(i))).toBe(false);
    for (const s of [a!, b!]) for (const m of s.outerHTML.matchAll(/url\(#([^)]+)\)/g)) expect(s.querySelector(`[id="${m[1]}"]`)).toBeTruthy();
  });
  it('talking moves her mouth; mirrored she faces the other way', () => {
    const { container } = render(<GrannyDragon talking mirror />);
    expect(container.querySelector('.granny__mouth--talking')).toBeTruthy();
    expect(container.querySelector('svg.granny')!.classList.contains('granny--mirror')).toBe(true);
  });
  it('reduced motion: talking draws a still, closed mouth', async () => {
    const motion = await import('../motion');
    vi.mocked(motion.reducedMotion).mockReturnValue(true);
    const { container } = render(<GrannyDragon talking />);
    expect(container.querySelector('.granny__mouth--talking')).toBeNull();
    vi.mocked(motion.reducedMotion).mockReturnValue(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/ui/story/GrannyDragon.test.tsx`
  Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Draw her.** `src/ui/story/GrannyDragon.tsx`:
  - **Frame:** `viewBox="0 0 240 260"`, `class="granny granny--<pose>"` plus `granny--mirror` when mirrored (CSS `transform: scaleX(-1)`), `data-pose`, and `role="img" aria-label="龙奶奶"` unless `label === null`.
  - **Build:**
    - a small, round, sitting-upright body in jade (`SWATCH.jade`), with a lighter belly `#cfe9d6`;
    - short legs, a curled tail with soft spines, two little horns and white whisker-brows, round glasses (`#c8a061` rims, light lenses);
    - a flowered apron (cream with `terracotta` and `sun` dots) and a kopi pot in her left hand.
  - **Shading:** gradient defs with ids `${id}-gd-…` (`useId`, cleaned as in Task 3), lit from the upper left. Edges `#3f7f63`, never `#2a2630`.
  - **Poses** change only these:
    - eyes: open; happy arcs for `smile` and `laugh`; wide for `surprised`; a tilted head and an attentive look for `listen`; worried brows for `worried`;
    - mouth: a closed smile, an open laugh, a small "o" for `surprised`, a wobble for `worried`;
    - arm: `point` raises her free arm and points up and to the right.
  - **Talking:** when `talking && !reducedMotion()`, the mouth gets `class="granny__mouth granny__mouth--talking"`. In `styles.css`, `.granny__mouth--talking { animation: granny-talk .28s steps(2) infinite }` alternates two mouth shapes by toggling the opacity of an open-mouth path. Otherwise the mouth is still and closed.
  - **Size:** the `size` prop sets the width (default 200), and the height follows 260/240.
  - **Stage case `granny`:** all six poses in a row, plus one mirrored and talking. `scripts/stage-cases.ts` screenshots `fit-shots/stage-cases/granny.png` at 1400×360.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/ui/story && npx tsc --noEmit -p . && npx tsx scripts/stage-cases.ts`
  Expected: PASS, `stage cases: ok`. Then look at `granny.png`: each pose is readable at a glance, and the glasses, apron and pot are clear.

- [ ] **Step 5: Commit.**

```bash
git add src/ui/story src/styles.css scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "story art: Granny Dragon, six poses and talking (3b §6)"
```

### Task 5: The test page

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (`story-page` case), `scripts/stage-cases.ts` (render at three sizes, copy the background in, checks)

**Interfaces:**
- Consumes: `parseChapter`, `slotsIn` and `plainText` (3a), `GrannyDragon` (Task 4), the repainted `Truffle` (Task 3), and `public/story/bg/hdb-voiddeck.webp` if it exists.
- Produces: `fit-shots/stage-cases/story-page-{ipad-portrait,ipad-landscape,iphone}.png`.

- [ ] **Step 1: Write the case.** In `page.tsx`, `which === 'story-page'` renders a picture-book page from `docs/story/season-1/ch03.md`, setup page 2, imported as text (add `loader: { '.md': 'text' }` to the esbuild call in `stage-cases.ts`):
  - **Picture:** a 4:3 box (`width: 100%`, `aspect-ratio: 4/3`, `max-height: 58dvh`, centred), `background: url(bg/hdb-voiddeck.webp) center/cover`.
    - If `?bg=0` is in the URL (no painting yet), use a soft placeholder gradient (`linear-gradient(#a9d3e8, #f6ecd6 60%, #d9cdb4)`) with the text "painting pending" in small grey type.
  - **Characters:** in the picture's lower-middle third, `<Truffle mood="pleased" size={…} label={null} />` at left-centre and `<GrannyDragon pose="smile" size={…} label={null} />` at right-centre, sized to about 30% of the picture's height and standing on its bottom 12%.
  - **Text:** below the picture, on cream paper (`SWATCH.cream`), in Nunito 22–26px (clamped with `dvh`, like the lesson stage). Narration as paragraphs, speech in rounded bubbles with the speaker's name.
  - **Slots:** the page's slot is shown three times, in a small strip under the text labelled `not met / learning / owned`:
    - **not met:** the English (`soup`);
    - **learning:** the Chinese with small English beneath (`汤` over `soup`);
    - **owned:** the Chinese alone (`汤`).

    The page body itself uses the "learning" form.

- [ ] **Step 2: Wire the run** in `stage-cases.ts`:
  - If `public/story/bg/hdb-voiddeck.webp` exists, copy it to `${dir}/bg/`. Otherwise open the case with `&bg=0`.
  - Screenshot at three viewports: `ipad-portrait` 768×1024, `ipad-landscape` 1024×768, `iphone` 390×664.
  - Check each size:
    - the picture keeps its 4:3 shape within 2%;
    - Truffle's and Granny's boxes sit inside the picture;
    - no text overflows the page (`scrollHeight <= innerHeight + 2` on the page element);
    - the text is at least 18px on a phone.

  Push each failure into `problems` with the size name.

- [ ] **Step 3: Run it.**
  Run: `npx tsx scripts/stage-cases.ts`
  Expected: `stage cases: ok`. Look at the three PNGs: the picture is on top, the characters stand on the floor, and the text is readable and not cramped. Adjust sizes and re-run until all three look right.

- [ ] **Step 4: Commit.**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "story art: the picture-book test page at three sizes (3b §8)"
```

### Task 6: The parent's painting, the full check, the review and the hand-off

- [ ] **Step 1: If the parent has sent `hdb-voiddeck`,** save it as `art/backgrounds/hdb-voiddeck.<ext>` (Read it first and check it against the reject checklist).
  - Run `npx tsx scripts/art/backgrounds.ts`.
    Expected: `hdb-voiddeck: N KB at quality Q`, with N ≤ 300.
  - Re-run `npx tsx scripts/stage-cases.ts`, so the test page uses the real painting.
  - If it hasn't arrived yet, keep the placeholder, and say so in the hand-off.
- [ ] **Step 2:** Run `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2`.
  Expected: all pass.
- [ ] **Step 3:** Run `npm run fit`.
  Expected: 0 problems. Truffle appears on many screens, so the whole sweep must stay clean, frame time included.
- [ ] **Step 4:** Do the final whole-branch review (executing-plans or SDD), then the fix pass.
- [ ] **Step 5:** Send the parent:
  - the before and after `faces.png` and `costumes.png`;
  - `granny.png`;
  - the three `story-page` PNGs.

  Ask them to approve the new Truffle (which unlocks the costume restyle plan) and Granny Dragon, and to keep generating the other seven Season 1 scenes with the first one attached as reference.
- [ ] **Step 6:** Pushing needs the parent's OK. The repainted Truffle **changes what he sees everywhere in the app**, so push only after the parent approves the after sheets.
