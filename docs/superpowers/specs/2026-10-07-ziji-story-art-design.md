# 字己 ZiJi — The Word Thief, sub-project 3b: art style, background pipeline, painted Truffle and Granny Dragon (design)

**Date:** 2026-10-07
**Status:** draft for the parent's review
**Parent specs:**
- `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §5.7 (art) and §5.9 (setting);
- `docs/superpowers/specs/2026-10-06-ziji-story-bible-design.md` (3a: the bible, `@scene` ids, cast descriptions).

This spec settles what parent spec §5.7 left to sub-project 3: how the backgrounds are made, their size budget, and the style sheet both layers follow.

## 1. Decisions (parent, 2026-10-06/07)

- **Who makes the backgrounds:** the parent, in the **Gemini app** (Google AI Pro, Nano Banana Pro, 100 images a day), from prompts Claude writes. No API key is used. Claude crops, compresses and wires the images in.
- **Page layout: picture book.**
  - The painted scene sits on top as a **4:3** image, with the words on paper below.
  - One image per scene serves iPad portrait, iPad landscape and iPhone.
  - Characters are not in the paintings. They are SVG drawn over the scene, so they can move and change expression.
- **Truffle is redrawn everywhere** in the painted style: lessons, Home, his room and the story.
  - The redraw **keeps his rig exactly**: the same named parts, pivots and frame. So every reaction, animation and costume position keeps working.
  - The 55 costumes get a matching style pass in a separate later step (§7), after the parent approves the new Truffle.

## 2. The style sheet (`docs/story/style.md`)

One page that both the paintings and the SVG characters follow.

- **Look:**
  - hand-painted watercolour and gouache, with soft edges and visible paper grain;
  - big skies, gentle light, places that look lived-in;
  - Ghibli-*inspired* in feel. Prompts describe these qualities; they never name a studio or its films.
- **Light:**
  - comes from the upper left;
  - tropical: bright mornings, golden late afternoons, the glow after rain;
  - shadows are cool blue-violet, never black.
- **Palette:** soft greens (rain trees, potted plants), warm creams and terracotta (HDB walls, tiles), sky blues, and one warm accent per scene. The palette is listed as about 12 hex swatches. The SVG characters use the same swatches.
- **Content of a background:**
  - no people or animals, and **no readable text or signs**: signs are blank shapes, because the app adds words;
  - generic places with no brands or logos;
  - Singapore details: HDB blocks, void decks, kopitiam tables, laundry on bamboo poles, rain trees, covered walkways.
- **Composition:**
  - **4:3**, eye level;
  - the **lower-middle third kept clear and fairly flat** (floor, ground or path), where the characters stand;
  - the main interest in the upper two-thirds.
- **Characters (SVG):**
  - no hard black outlines; edges are a darker shade of the fill;
  - soft gradient shading from the upper left, a light rim on the shadow side;
  - simple painted-looking texture (a few fur or scale strokes), round friendly shapes, big readable expressions.

## 3. Gemini prompts and workflow (`docs/story/prompts.md`)

- **A shared style paragraph,** pasted at the start of every prompt. It is §2 in prompt language.
- **One prompt per background id** from the bible: what's in the scene, the time of day and weather, where the clear standing area is, and the reminder "no people, animals, text, signs with writing, logos".
  - Season 1 needs `hdb-morning`, `hdb-voiddeck`, `hdb-night`, `hawker-noon`, `market-morning`, `school-field`, `school-garden` and `playground-afternoon`.
  - Ids for later seasons are listed but not needed yet.
- **The parent's steps:**
  1. Paste the first prompt (`hdb-voiddeck`, the test scene) into Gemini. Ask for a 4:3 image. Generate a few until one feels right.
  2. Save it as `art/backgrounds/hdb-voiddeck.png`, or any image format, named by its id.
  3. For every next scene, attach the approved image as a **style reference** ("match the painting style of the attached image") before the prompt, so all scenes look like one book.
- **A per-scene checklist,** so the parent can reject a bad image quickly:
  - no text or signs with writing;
  - no people or animals;
  - a clear lower-middle third;
  - light from the upper left;
  - it looks like the reference.

## 4. Background pipeline

- **Originals:** `art/backgrounds/<id>.<ext>`, kept in the repo as the parent's originals.
- **`scripts/art/backgrounds.ts`** (run with tsx, using `sharp`, added as a dev dependency):
  - crops each original to **4:3**, centred;
  - resizes it to **1600×1200**;
  - writes `public/story/bg/<id>.webp` at quality about 80.
- **Budget:**
  - each WebP is **≤ 300 KB**; the script fails if one is larger and lowers the quality step by step before giving up;
  - Season 1 totals **≤ 2.5 MB**.
- **Checks:** every `@scene` id used in `docs/story/season-*/ch*.md` must have a WebP, or appear on a "pending" list that the check prints. A content test enforces this for the chapters that ship.
- **Loading:** images load only when a chapter opens (3c), and the service worker caches the ones already seen. They are not precached with the app.

## 5. Truffle, repainted

- **`src/ui/truffle/Truffle.tsx`** keeps its frame (`viewBox="30 20 260 270"`) and every `data-part`:
  - `rig`, `headpos`, `headrot`, `body`, `ear-l`, `ear-r`, `ear-in-l`, `ear-in-r`, `brow-l`, `brow-r`, `mouth`, `blush-l`, `blush-r`, `paw-l`, `paw-r`, `tail`, `shadow`;
  - the eye parts (iris, lids) and the `extra-*` expression parts.

  The paths may change shape slightly, but the pivots and anchors stay put.
- **New look:** a grey tabby with green eyes and a white chest, as in the bible.
  - Shading uses `<radialGradient>`/`<linearGradient>` defs, lit from the upper left.
  - Edges are a darker grey, never black. There are a few tabby stripes, a soft rim light, and painted-looking whiskers.
- **Must not break:**
  - every existing Truffle, rig, reaction and costume test passes unchanged;
  - the WebKit stage cases render;
  - costumes still sit in place on the new body.
- **Before and after sheets:** the stage-case sheets (expressions, reactions, a sample of costumes) are captured in WebKit before and after, so the parent compares old and new.
- **Performance:** gradients are defined once per SVG. Frame time in the fit sweep's frame check stays within its current limit.

## 6. Granny Dragon

- **`src/ui/story/GrannyDragon.tsx`:**
  - a small, round, jade-green dragon with white whiskers, round glasses, a flowered apron and a kopi pot;
  - drawn in the §2 style.
- **Poses and expressions:** `smile`, `listen`, `surprised`, `laugh`, `point`, `worried`, plus `talk`, a mouth open and close that 3c drives from audio.
- **Props:**
  - `pose: GrannyPose`, `size`, and `mirror`;
  - `talking`, which drives the mouth.
  - Reduced motion: nothing moves.
- **A pose sheet** for the parent in the stage cases.

## 7. Later step: costume restyle (not in 3b)

- After the parent approves the new Truffle, a separate plan gives the costume art in `costumes.ts`, `mythCostumes.ts` and `costumeKit.ts` the same treatment: soft shading, no hard outlines, and the shared palette.
- Until then, the costumes keep their current look on the new body.

## 8. The test page

- A stage case, `story-page`, lays out **chapter 3, page 2** as a picture-book page:
  - the `hdb-voiddeck` painting on top;
  - the new Truffle and Granny Dragon standing in the clear lower-middle third;
  - the page's English below, with its word slot shown in each of the three states (English; Chinese with small English beneath; Chinese only).
- It is a still mock for judging the art together, not the 3c reader.
- It is checked in WebKit at iPad portrait, iPad landscape and iPhone.

## 9. Testing

- **Unit:** the background script's crop and budget logic on a generated test image, and the `@scene`-coverage check.
- **Existing suites:** all Truffle and costume tests pass with the repainted rig.
- **Layout:** `npm run fit` and the stage cases (`story-page`, Granny's pose sheet, the before and after Truffle sheets) in WebKit, with 0 problems.
- **Parent review:**
  - the style sheet and the first prompt, before generating;
  - the first painting;
  - the before and after Truffle;
  - Granny Dragon;
  - the test page.

## 10. Out of scope for 3b

- The 3c story engine and reader.
- Pages for any chapter beyond the test page.
- Ox, Dog, Pig and Hush drawings (3d, from the same style sheet).
- The painted town map (3c).
- The costume restyle (§7).
