# One River worlds and light-cel Truffle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8 paper worlds with the parent's 8 "One River" paintings (one square `<image>` per world, with live light-cel creatures, the paper boat, finds at their new places and evening lights), map his saved worlds across, and repaint Truffle, his costumes, accessories and powers in the light-cel style of mockup row C.

**Architecture:** A build script trims and encodes the paintings to `public/worlds/<id>.webp` (+ 240 px thumbnails, precached). `WorldScene` becomes one `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice">` holding the painting as an `<image>`, then the evening tint, moon and lights, then every prop; `WorldProps` keeps its tap layer in the same box, so every anchor in `src/ui/worlds/river.ts` lines up at every crop. Creatures are plain SVG strings in `src/ui/worlds/creatures/`, drawn with a shared light-cel kit (`src/ui/cel.ts`) whose shadows are explicit paths; Truffle's part strings and costume helpers use the same kit, with his part shadows baked as explicit polygons.

**Tech Stack:** Preact + TypeScript, Vite + vite-plugin-pwa (workbox precache), sharp (WebP), vitest (jsdom), playwright-core 1.52 WebKit for the stage cases and the fit sweep.

**Spec:** `docs/superpowers/specs/2026-10-13-ziji-one-river-design.md` (binding). Also: `docs/worlds/prompts.md`, `docs/worlds/paintings/*.jpg`, `docs/worlds/truffle-cel-mock.png` (row C is the chosen style; its source `truffle-cel-mock.html` holds the cel geometry this plan bakes), and the older world spec `docs/superpowers/specs/2026-10-04-ziji-stage-design.md` (prop moments, auto moments, the question-calm rule).

## Global Constraints

- The 8 worlds, in order, with unchanged thresholds: `home` 家门口 0, `rainforest` 雨林 30, `bamboo` 竹林 60, `terraces` 梯田 100, `dino` 恐龙谷 150, `lantern` 灯笼水乡 200, `cove` 海湾 300, `milkyway` 银河 400.
- Migration by position, one-off in the kid-state loader, idempotent, unknown ids dropped: yard→home, grass→rainforest, race→bamboo, blocks→terraces, dino→dino, sea→lantern, space→cove, pirate→milkyway. Finds keep all their data; saved lessons and logs are untouched.
- No arrival card for migrated worlds; the first Home after the update says once: 「我们的世界变成一条河了！」.
- Paintings: `scripts/art/worlds.ts` reads `docs/worlds/paintings/*.jpg`, trims any uniform border (`2-rainforest.jpg` has a ~30 px white frame), makes a square, keeps ≥ 960 px, encodes ≤ 300 KB each and ≤ 2.4 MB for the set (the build fails if over), and writes `public/worlds/<id>.webp` and `public/worlds/<id>-thumb.webp` (240 px). Both are in the workbox precache.
- One coordinate space: `WorldScene` is a single `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice">`, the painting an `<image>` at `0 0 1000 1000`, everything else above it in the same space. Anchors use `{ x, y, w, h }` with (x, y) the ground point.
- Each world keeps at least one tappable prop visible at every size (iPad landscape, iPad portrait, phone). A prop the crop cuts off is allowed; a prop Home's cards cover on some screen is `tap: false` (it only plays by itself).
- Evening (`timeOfDay` after 18:00): a dusk tint (`multiply`, per-world strength, none in 银河), a moon if the sky shows, the world's lights. The painting is never swapped.
- Kept: the top fade, the tab bar inset, the lesson card position and the feedback sheet. Removed: the paper-grain overlay on the worlds, the paper-kit sky/land strings, the 8 old world modules, `RACE_TRACK`, the old evening coordinates. `momentFx` stays.
- The find rules are unchanged (`src/fun/finds.ts`): `findAnimal` is the paper boat in any world; `tapGem` is the lotus pearl in 灯笼水乡 (data stays `gems`, the child-facing word is 珍珠); `tapEgg`/`hatchAfterLesson` stay in 恐龙谷; `dig` is in 海湾.
- `MOMENTS` keeps its shape (prop, label, `auto`, `tap`). Auto moments start after 30 s of no touch, respect reduced motion, need the tab visible, and never give a find, speak, or make a sound.
- Child-facing labels are Chinese only. Creature and prop labels match `/^[一-鿿]+$/`.
- Light cel (row C): line `#706889`, about 1.2% of his height (2.8 outer, 1.8 inner in his 260-wide box; 2.2 / 1.4 in the worlds' 1000 box); flat fills (fur `#a9a4ab`, chest and paws `#fbf5ea`, flat pink ear insides); one pale, hard, blue-violet shadow on the lower right; light from the upper left; one small highlight top-left of his head.
- **No clip-paths and no gradients on Truffle** (eyes included); every shadow is its own explicit path. Glows in the world's evening lights may use radial gradients; nothing anywhere uses SVG filters.
- Truffle's rig geometry, parts, `data-part` hooks, timelines, paws, face rig and costume anchors are unchanged; only paint changes (plus the new paint-only parts `lash-*`, `eye-ring-*`, `mouth-w`).
- Story characters (Granny Dragon, `HushScene`, `docs/story/style.md`) are out of scope and keep their look; `src/ui/truffle/paint.ts` keeps `SWATCH` and `cleanId` for them.
- Performance: one `<image>` per scene; the stage cases' per-frame work check stays at **8 ms** (p95) for the live Truffle and every world's moments; lesson start must not get slower (fit sweep's 15 s start limit; no clip-paths).
- Tests stay light: the suite's render tests are heavy (`src/test/setup.ts` sets `asyncUtilTimeout` to 10 s); add unit tests in `// @vitest-environment node` files where no DOM is needed.
- WebKit for playwright-core is already installed (`~/Library/Caches/ms-playwright/webkit-2158`). Install nothing else.
- Before starting a server (stage cases, fit sweep, a preview), check its port is free (`lsof -iTCP:4174 -sTCP:LISTEN`); kill your servers when done. The machine can be loaded: rerun a timed-out flow on its own (`FIT_ONLY=<flow>`) before calling it a failure.
- Commit after every task with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stored world ids that are prototype keys** (`"constructor"`, `"toString"` in an old or hand-edited backup): they must be dropped, never mapped to a function or kept. Test: Task 1, `migrateWorldId('constructor')` is `null` and `normalizeKid` drops it.
2. **A record that is half migrated** (old ids beside new ones, an old pick with new reached worlds, only `dino`, whose id never changed): everything maps, the pick follows, and Truffle's river line is said only when an old-only id was there. Test: Task 1, the mixed and `['dino']` cases in `repo.test.ts`.
3. **Truffle's lids at every lid/arc value** (a blink during a squint, `proud`, `sleepy`): with no clip-path, a lid that strays outside the eye paints fur over his face, and an empty lid path at (0, 0) stretches his bounding box (the stage cases' "pokes out of his box"). Tests: Task 10, the lid-edge-inside-the-eye sweep and the empty-lid-at-the-eye-centre test.
4. **Evening lights behind a lesson question, or with reduced motion**: fireflies, stars and the lighthouse beam must be still behind a lesson (the 2026-10-04 question-calm rule) and for reduced motion. Test: Task 8, the CSS rule test in `styles.test.ts` (animation only under `.home`, none under `prefers-reduced-motion`).
5. **The lotus taps across midnight** (he taps the lotus twice on Monday evening and twice on Tuesday morning without leaving Home): yesterday's taps must not count toward today's pearl. Test: Task 7, the WorldProps "yesterday's taps don't count today" case.

---

## File structure

**Create**
- `scripts/art/paintings.ts`: border detection and `prepareWorld` (trim, square, WebP ≤ 300 KB, 240 px thumb). One job: a painting → app images.
- `scripts/art/worlds.ts`: CLI; writes `public/worlds/`; exits 1 if a painting is missing or over budget.
- `scripts/art/paintings.test.ts`
- `public/worlds/<id>.webp`, `public/worlds/<id>-thumb.webp` (generated, committed)
- `src/ui/cel.ts` (+ `cel.test.ts`): the light-cel kit shared by creatures, Truffle and costumes (line, weights, `mix`, `shadeOf`, ellipse crescent shadows, `celEllipse`, `celPath`, `sparkle`, `beadEye`, `blush`).
- `src/ui/worlds/river.ts` (+ `river.test.ts`): per-world anchors, dusk strength, moon; the slice-crop helpers.
- `src/ui/worlds/scene.ts`: `SCENE_VIEWBOX`, `paintingHref`, `sceneFor`.
- `src/ui/worlds/props.ts`: each world's props at rest (`PROP_ART`, `propAt`, `propsOf`).
- `src/ui/worlds/creatures/draw.ts`: the design-box helper (`box`) and per-box cel kit.
- `src/ui/worlds/creatures/{boat,home,rainforest,bamboo,terraces,dino,lantern,cove,milkyway}.ts`: the creatures, grouped by world.
- `scripts/stage-cases/creatures.ts`: the creature sheet for the stage cases.

**Modify**
- `src/fun/worlds.ts` (ids, names, lines, `OLD_WORLDS`, `migrateWorldId`), `src/types.ts` (`riverNews`), `src/store/repo.ts` (migration), `src/app/HomeScreen.tsx` (river line, arrival image), `src/app/Wardrobe.tsx` (thumbnails, pearl jar), `src/story/art.ts` (shared `webpUnder`), `vite.config.ts` (precache).
- `src/ui/worlds/WorldScene.tsx`, `WorldProps.tsx`, `moments.ts`, `momentFx.ts`, `evening.ts`, `burst.ts`, `tapArt.ts` (zodiac faces only, light cel).
- `src/styles.css` (scene box, no grain on worlds, image thumbnails, evening animations).
- `src/ui/truffle/{parts,paint,rig,useRig,Truffle,costumeKit,accessories,powers}.ts(x)`.
- `scripts/fit-check.ts` (crop-aware world taps), `scripts/fit-profile.ts`, `scripts/stage-cases.ts`, `scripts/stage-cases/page.tsx`.
- Tests: `src/fun/worlds.test.ts`, `src/store/repo.test.ts`, `src/app/home.test.tsx`, `src/app/SessionScreen.test.tsx`, `src/app/celebrationStage.test.tsx`, `src/placement/journey.test.ts`, `scripts/fit-profile.test.ts`, `src/styles.test.ts`, `src/ui/worlds/*.test.ts(x)`, `src/ui/truffle/{Truffle.test.tsx,rig.test.ts}`.

**Delete**
- `src/ui/worlds/{yard,grass,race,blocks,dino,sea,space,pirate,art,scenes}.ts`, `src/ui/worlds/worldArt.test.ts`, `src/ui/worlds/kit/paper.ts`, `src/ui/worlds/kit/props.ts` (Task 4); `src/ui/worlds/kit/palette.ts` (Task 9, once Truffle stops importing it).

### Anchors (final, placed by eye on the trimmed paintings and checked in WebKit)

Every number below was placed on the processed painting (`public/worlds/<id>.webp`, so 雨林 is measured *after* its frame is trimmed) and checked on the real Home screen in WebKit at 1024×768, 1180×820, 768×1024, 390×844 and 375×667: each prop marked "tap" is either cropped off a size or uncovered there, and every world keeps at least one prop to tap at every size. (x, y) is the ground point; the tap box is w wide centred on x and h tall above y.

| World | prop: x, y, w, h (tap? auto?) | dusk | moon |
|---|---|---|---|
| home | boat 690,880,120,90 (tap) · otter 860,790,80,80 (tap, auto) · kingfisher 930,690,60,50 (tap, auto; on the right bank: the done-for-today card covers the far wall) | 0.36 | 640,420 |
| rainforest | boat 690,930,120,90 · hornbill 880,560,80,64 (tap, auto) · monkey 300,470,60,96 (**auto only**: the cards cover the walkway) · butterfly 200,860,60,60 (tap, auto) | 0.36 | 520,380 |
| bamboo | boat 800,770,120,90 · panda 190,850,100,100 (tap, auto) · frog 560,820,60,50 (tap, auto) | 0.34 | 640,380 |
| terraces | boat 640,950,120,90 (mid-stream: the waterwheel has the lower right) · ducks 650,835,110,56 (tap, auto) · kite 300,420,70,96 (**auto only**: in the sky under the cards) · dragonfly 200,880,60,56 (tap, auto) | 0.36 | 620,360 |
| dino | boat 720,870,120,90 · nest 300,860,90,70 (tap, find) · pterosaur 840,525,120,56 (tap, auto) · volcano 850,320,120,80 (tap, auto; the painting draws it) | 0.34 | 380,260 |
| lantern | boat 640,880,120,90 · lotus 840,900,70,70 (tap, find) · koi 735,985,70,60 (tap, auto) · skylantern 870,640,60,70 (tap, auto; it rests on the right bank) | 0.28 | 560,300 |
| cove | boat 680,900,120,90 · x 300,870,70,56 (tap, find) · crab 390,950,60,50 (tap, auto) · parrot 115,545,56,66 (tap, auto; on the palm trunk) | 0.22 | 560,260 |
| milkyway | boat 640,900,120,90 · magpies 190,770,120,70 (tap, auto; on the rock ledge) · shootingstar 880,525,64,52 (tap, auto; just above the horizon) | 0 | none (the painting has its moon) |

The boat is tappable in every world. Screenshots of the final anchors (every world, five sizes, tap boxes outlined, by day and by evening) are in the scratchpad folder named in the hand-off.

---
### Task 1: One River ids, the migration by position, and Truffle's river line

**Files:**
- Modify: `src/fun/worlds.ts`, `src/types.ts`, `src/store/repo.ts`, `src/app/HomeScreen.tsx`, `src/app/Wardrobe.tsx:149`, `scripts/fit-profile.ts:80`, `scripts/fit-check.ts:340`
- Modify (mechanical re-key, the paper art stays until Task 4): `src/ui/worlds/scenes.ts`, `src/ui/worlds/moments.ts`, `src/ui/worlds/evening.ts`, `src/ui/worlds/burst.ts`
- Test: `src/fun/worlds.test.ts`, `src/store/repo.test.ts`, `src/app/home.test.tsx`, `src/placement/journey.test.ts`, `scripts/fit-profile.test.ts`, `src/app/SessionScreen.test.tsx`, `src/app/celebrationStage.test.tsx`, `src/ui/worlds/{moments,worldArt,WorldProps,worlds,burst}.test.ts(x)` (ids only)

**Interfaces:**
- Produces: `type WorldId = 'home' | 'rainforest' | 'bamboo' | 'terraces' | 'dino' | 'lantern' | 'cove' | 'milkyway'`; `WORLDS: WorldDef[]` (new ids, names, pinyin, unchanged `at`); `OLD_WORLDS: Record<string, WorldId>`; `migrateWorldId(id: unknown): WorldId | null`; `KidState.riverNews: boolean` (default `false`); `RIVER_NEWS = '我们的世界变成一条河了！'` exported from `src/app/HomeScreen.tsx`.

- [ ] **Step 1: Write the failing tests**

In `src/fun/worlds.test.ts`, import `migrateWorldId` and replace the catalogue test:

```ts
import { currentWorld, migrateWorldId, reachedWorlds, timeOfDay, updateWorlds, WORLD_LINES, WORLDS, worldLine } from './worlds';

  it('is one river: the eight worlds in unlock order with their names and unchanged thresholds (spec 2026-10-13 §3.1)', () => {
    expect(WORLDS.map((w) => [w.id, w.zh, w.at])).toEqual([
      ['home', '家门口', 0], ['rainforest', '雨林', 30], ['bamboo', '竹林', 60], ['terraces', '梯田', 100],
      ['dino', '恐龙谷', 150], ['lantern', '灯笼水乡', 200], ['cove', '海湾', 300], ['milkyway', '银河', 400],
    ]);
  });
  it('maps an old paper world to its river world by position; a river id stays; anything else is dropped (spec §8)', () => {
    expect(['yard', 'grass', 'race', 'blocks', 'dino', 'sea', 'space', 'pirate'].map(migrateWorldId)).toEqual(WORLDS.map((w) => w.id));
    for (const w of WORLDS) expect(migrateWorldId(w.id)).toBe(w.id);
    expect([migrateWorldId('bogus'), migrateWorldId(7), migrateWorldId(null), migrateWorldId('constructor')]).toEqual([null, null, null, null]);
  });
```

In the rest of that file replace the old ids in every expectation: `'yard'`→`'home'`, `'grass'`→`'rainforest'`, `'race'`→`'bamboo'`, `'space'`→`'cove'` (and `WORLD_LINES.grass`→`WORLD_LINES.rainforest`), and "the backyard" → "家门口" in two test names.

In `src/store/repo.test.ts` replace the two old-id lines of "normalizes world fields from old or malformed data" and add a test after it:

```ts
    expect(normalizeKid({ worldsSeen: ['bamboo', 'bogus', 'home', 'bamboo'], world: 'bogus' } as never)).toMatchObject({ worldsSeen: ['home', 'bamboo'], world: null });
    expect(normalizeKid({ worldsSeen: ['home', 'rainforest'], world: 'rainforest' } as never)?.world).toBe('rainforest');
  });
  it('maps his paper worlds onto One River by position, once, and says so once (spec 2026-10-13 §8)', () => {
    const old = normalizeKid({ worldsSeen: ['yard', 'grass', 'race', 'blocks', 'dino', 'sea', 'space', 'pirate', 'bogus', 'constructor'], world: 'sea' } as never)!;
    expect(old.worldsSeen).toEqual(['home', 'rainforest', 'bamboo', 'terraces', 'dino', 'lantern', 'cove', 'milkyway']);
    expect(old.world).toBe('lantern');
    expect(old.riverNews).toBe(true);
    // idempotent: loading what was saved changes nothing and doesn't say it again
    const again = normalizeKid({ ...old, riverNews: false })!;
    expect([again.worldsSeen, again.world, again.riverNews]).toEqual([old.worldsSeen, 'lantern', false]);
    // a half-migrated record: old and new side by side, an old pick
    expect(normalizeKid({ worldsSeen: ['home', 'grass', 'race'], world: 'race' } as never)).toMatchObject({ worldsSeen: ['home', 'rainforest', 'bamboo'], world: 'bamboo', riverNews: true });
    // only 恐龙谷 (its id never changed) or a new install: no news
    expect(normalizeKid({ worldsSeen: ['dino'] } as never)!.riverNews).toBe(false);
    expect(normalizeKid({ petName: '松露' } as never)!.riverNews).toBe(false);
    // a pick that isn't reached is dropped, as before
    expect(normalizeKid({ worldsSeen: ['yard'], world: 'pirate' } as never)!.world).toBeNull();
```

In `src/app/home.test.tsx`: import `RIVER_NEWS` (`import { HomeScreen, RIVER_NEWS } from './HomeScreen';`), replace the ids in its fixtures (`'yard'`→`'home'`, `'grass'`→`'rainforest'`, `'race'`→`'bamboo'`, `WORLD_LINES.grass`→`WORLD_LINES.rainforest`), rename "announces 赛车山" to "announces 竹林" with `toContain('到竹林了！')`, and add as the first test of `describe('HomeScreen journey'`:

```tsx
  it('his paper worlds became the river: no arrival card, Truffle says so once (spec 2026-10-13 §8)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'] } as never });
    await saveKid(app.db, app.kid!);
    await seedKnown(app, 40);
    const first = renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    await waitFor(() => expect(document.querySelector('.pet__bubble .sr-only')?.textContent).toBe(RIVER_NEWS));
    expect(screen.queryByRole('dialog', { name: '新地方' })).toBeNull();
    expect(document.querySelector('.world-scene')?.getAttribute('data-world')).toBe('rainforest');
    await waitFor(async () => expect(await getKid(app.db)).toMatchObject({ worldsSeen: ['home', 'rainforest'], riverNews: false }));
    first.unmount();
    renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    await new Promise((r) => setTimeout(r, 200));
    expect(document.querySelector('.pet__bubble .sr-only')?.textContent).not.toBe(RIVER_NEWS);
  });
```

Also replace old ids in: `src/placement/journey.test.ts:61` (`worldsSeen: ['home', 'rainforest', 'bamboo', 'terraces', 'dino', 'lantern', 'cove', 'milkyway'], world: 'milkyway'`, and line 64 `toEqual(['home'])`), `src/app/SessionScreen.test.tsx:80,82` and `src/app/celebrationStage.test.tsx:23,34` (`'yard'`→`'home'`, `'grass'`→`'rainforest'`), `scripts/fit-profile.test.ts:19,24,25` (`'blocks'`→`'terraces'`), and in `src/ui/worlds/{moments,worldArt,WorldProps,worlds,burst}.test.ts(x)` every world id string by the same map (`yard→home, grass→rainforest, race→bamboo, blocks→terraces, sea→lantern, space→cove, pirate→milkyway`; `dino` stays).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/fun/worlds.test.ts src/store/repo.test.ts`
Expected: FAIL — `migrateWorldId` is not exported; `worldsSeen` keeps `'yard'`.

- [ ] **Step 3: Implement**

`src/fun/worlds.ts` — replace the type, the list, and add the map (keep everything else):

```ts
export type WorldId = 'home' | 'rainforest' | 'bamboo' | 'terraces' | 'dino' | 'lantern' | 'cove' | 'milkyway';
export interface WorldDef { id: WorldId; zh: string; py: string; at: number }

/** One river, in unlock order (spec 2026-10-13 §3.1). "at" is the characters learned since placement (src/placement/journey.ts). */
export const WORLDS: WorldDef[] = [
  { id: 'home', zh: '家门口', py: 'jiā ménkǒu', at: 0 },
  { id: 'rainforest', zh: '雨林', py: 'yǔlín', at: 30 },
  { id: 'bamboo', zh: '竹林', py: 'zhúlín', at: 60 },
  { id: 'terraces', zh: '梯田', py: 'tītián', at: 100 },
  { id: 'dino', zh: '恐龙谷', py: 'kǒnglóng gǔ', at: 150 },
  { id: 'lantern', zh: '灯笼水乡', py: 'dēnglong shuǐxiāng', at: 200 },
  { id: 'cove', zh: '海湾', py: 'hǎiwān', at: 300 },
  { id: 'milkyway', zh: '银河', py: 'yínhé', at: 400 },
];

/** The paper worlds before One River, by position (spec 2026-10-13 §8): his reached worlds and his pick map across. */
export const OLD_WORLDS: Record<string, WorldId> = { yard: 'home', grass: 'rainforest', race: 'bamboo', blocks: 'terraces', dino: 'dino', sea: 'lantern', space: 'cove', pirate: 'milkyway' };
/** A stored world id as a One River id: a new id stays, an old one maps by position, anything else is null. */
export const migrateWorldId = (id: unknown): WorldId | null =>
  typeof id !== 'string' ? null : WORLDS.some((w) => w.id === id) ? (id as WorldId) : Object.hasOwn(OLD_WORLDS, id) ? OLD_WORLDS[id]! : null; // own keys only: "constructor" is no world
```

In the same file: `updateWorlds` announces never the first world (`const arrived = newest === 'home' ? null : newest;`, doc comment "never the first (家门口)"), `currentWorld` seeds with `'home'` (`inOrder(['home', ...kid.worldsSeen])`), and `WORLD_LINES` becomes:

```ts
export const WORLD_LINES: Record<WorldId, string[]> = {
  home: ['我们坐纸船去玩！', '水里有水獭！', '小鸟飞得好快！'],
  rainforest: ['好多大树！', '猴子在荡秋千！', '嘘……听，是犀鸟！'],
  bamboo: ['熊猫在吃竹子！', '青蛙跳过石头了！', '山上有雾！'],
  terraces: ['鸭子去游泳了！', '风筝飞得好高！', '水车转呀转！'],
  dino: ['火山在冒烟！', '蛋里有什么？', '翼龙飞过去了！'],
  lantern: ['灯笼好红啊！', '荷花开了吗？', '鱼跳起来了！'],
  cove: ['宝藏在哪儿？', '螃蟹走路横着走！', '灯塔亮了！'],
  milkyway: ['星星好多啊！', '小河飞到天上了！', '喜鹊来搭桥！'],
};
```

`src/types.ts` — in `KidState` after `world`, and in `DEFAULT_KID` after `world: null,`:

```ts
  riverNews: boolean; // his old paper worlds were just mapped onto One River: Home says so once (spec 2026-10-13 §8)
  // …
  riverNews: false,
```

`src/store/repo.ts` — import `{ migrateWorldId, OLD_WORLDS, WORLDS }` from `'../fun/worlds'` (drop `worldById`), replace the three "Journey worlds" lines in `normalizeKid`, and add `riverNews` to the returned object:

```ts
  // Journey worlds: One River ids only (an old paper world maps across by position, spec 2026-10-13 §8), in unlock order;
  // a pick must be a reached world. Unknown ids are dropped. Mapping an old id once is what tells Home to say so.
  const rawWorlds = Array.isArray(kid.worldsSeen) ? kid.worldsSeen : [];
  const worldList = rawWorlds.map(migrateWorldId);
  const worldsSeen: string[] = WORLDS.map((w) => w.id).filter((id) => worldList.includes(id));
  const picked = migrateWorldId(kid.world);
  const world = picked && worldsSeen.includes(picked) ? picked : null;
  const moved = rawWorlds.some((w) => typeof w === 'string' && Object.hasOwn(OLD_WORLDS, w) && !WORLDS.some((x) => x.id === w));
  return { ...kid, /* …unchanged fields… */ worldsSeen, world, riverNews: kid.riverNews === true || moved, /* … */ };
```

(The return already lists `worldsSeen, world,`; insert `riverNews: kid.riverNews === true || moved,` after them.)

`src/app/HomeScreen.tsx` — after `const OFFER = …`:

```ts
/** What Truffle says once when the paper worlds have become One River (spec 2026-10-13 §8). */
export const RIVER_NEWS = '我们的世界变成一条河了！';
```

and in the journey effect: declare `let river = false;` beside `let mood …`; inside `plan`, right after `let next = u.kid;`:

```ts
        // his paper worlds were just mapped onto the river (spec 2026-10-13 §8): Truffle says so once, with no arrival card
        river = next.riverNews;
        if (river) next = { ...next, riverNews: false };
```

change the plan's return to `return u.changed || greet || redo || river ? next : null;`, and after the `if (m && m !== 'plain') { … }` block:

```ts
      if (river) { // the news wins over the day's greeting
        setPropPlay((p) => ({ react: { kind: 'excited', key: (p.react?.key ?? 0) + 1 }, lookAt: 0 }));
        setSaid(RIVER_NEWS);
        clearTimeout(saidTimer.current);
        saidTimer.current = setTimeout(() => setSaid(null), 3600);
      }
```

Other old ids in code:
- `src/app/Wardrobe.tsx:149`: `const reached = w.id === 'home' || k.worldsSeen.includes(w.id);`
- `scripts/fit-profile.ts:80`: `const world = o.world ?? 'bamboo';`
- `scripts/fit-check.ts:340`: `await run('home-evening', EVENING, { world: 'home' }, (p) => check(p, size, 'home-evening', 0)); // the first world's evening`
- `scripts/stage-cases.ts:407` and `scripts/stage-cases/page.tsx:261`: use `WORLDS.map((w) => w.id)` (import `WORLDS` from `../src/fun/worlds`) and default `'home'`.

Re-key the paper art so it still compiles (Task 4 deletes it): in `src/ui/worlds/scenes.ts` `WORLD_ART = { home: YARD, rainforest: GRASS, bamboo: RACE, terraces: BLOCKS, dino: DINO, lantern: SEA, cove: SPACE, milkyway: PIRATE }`; in `moments.ts` the `MOMENTS` keys and every `case '<world>:…'` string; in `evening.ts` the `PREFIX` keys, the `switch` cases and the `world === 'space'`/`'sea'` checks; in `burst.ts` the `WORLD_BURST` keys — all by the same map.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/fun src/store src/placement/journey.test.ts scripts/fit-profile.test.ts src/ui/worlds src/app/home.test.tsx src/app/SessionScreen.test.tsx src/app/celebrationStage.test.tsx`
Expected: PASS (tsc clean; all listed files green).

- [ ] **Step 5: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): One River ids, migrate his worlds by position, Truffle says so once

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
### Task 2: The painting pipeline and the precache

**Files:**
- Modify: `src/story/art.ts` (extract the encoder), `vite.config.ts` (precache)
- Create: `scripts/art/paintings.ts`, `scripts/art/worlds.ts`, `scripts/art/paintings.test.ts`, `public/worlds/*.webp` (generated)

**Interfaces:**
- Consumes: `WORLDS` (Task 1).
- Produces: `webpUnder(img: Sharp, maxBytes: number): Promise<{ webp: Buffer; quality: number } | null>` in `src/story/art.ts`; `findBorder(input: Buffer): Promise<Border>`, `prepareWorld(input: Buffer): Promise<{ webp; thumb; size; quality; border }>`, constants `WORLD_MAX_BYTES = 300_000`, `WORLD_SET_MAX_BYTES = 2_400_000`, `WORLD_MIN_SIZE = 960`, `THUMB_SIZE = 240`; files `public/worlds/<id>.webp` and `public/worlds/<id>-thumb.webp` for all 8 ids.

- [ ] **Step 1: Write the failing test** — `scripts/art/paintings.test.ts`:

```ts
// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../src/fun/worlds';
import { findBorder, prepareWorld, THUMB_SIZE, WORLD_MAX_BYTES, WORLD_MIN_SIZE, WORLD_SET_MAX_BYTES } from './paintings';

const painting = (f: string) => readFileSync(`docs/worlds/paintings/${f}`);

describe('One River paintings → the app (spec 2026-10-13 §4)', () => {
  it("trims the rainforest's white frame to a clean square of at least 960 px", async () => {
    const r = await prepareWorld(painting('2-rainforest.jpg'));
    for (const side of Object.values(r.border)) expect(side).toBeGreaterThanOrEqual(28);
    const meta = await sharp(r.webp).metadata();
    expect([meta.format, meta.width === meta.height]).toEqual(['webp', true]);
    expect(meta.width).toBeGreaterThanOrEqual(WORLD_MIN_SIZE);
    expect(r.webp.length).toBeLessThanOrEqual(WORLD_MAX_BYTES);
    expect((await sharp(r.thumb).metadata()).width).toBe(THUMB_SIZE);
  }, 20_000);
  it('leaves a painting with no frame alone (a sky is not a border)', async () => {
    expect(await findBorder(painting('1-home.jpg'))).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(await findBorder(painting('8-milkyway.jpg'))).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
  it('a too-small painting is refused', async () => {
    const small = await sharp({ create: { width: 800, height: 800, channels: 3, background: { r: 200, g: 120, b: 90 } } }).png().toBuffer();
    await expect(prepareWorld(small)).rejects.toThrow(/too small/);
  });
  it('every world has its painting and thumbnail in public/worlds, within the budgets (300 KB each, 2.4 MB in all)', () => {
    let total = 0;
    for (const w of WORLDS) {
      const size = statSync(`public/worlds/${w.id}.webp`).size;
      expect(size, w.id).toBeLessThanOrEqual(WORLD_MAX_BYTES);
      total += size + statSync(`public/worlds/${w.id}-thumb.webp`).size;
    }
    expect(total).toBeLessThanOrEqual(WORLD_SET_MAX_BYTES);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/art/paintings.test.ts`
Expected: FAIL — `Cannot find module './paintings'`.

- [ ] **Step 3: Implement**

`src/story/art.ts`: change the import to `import sharp, { type Sharp } from 'sharp';`, add after `QUALITY_FLOOR`:

```ts
/** The image as WebP at the best quality (80, 75 … 50) that fits in `maxBytes`, or null if even 50 is too big. */
export async function webpUnder(img: Sharp, maxBytes: number): Promise<{ webp: Buffer; quality: number } | null> {
  for (let quality = QUALITY_START; quality >= QUALITY_FLOOR; quality -= 5) {
    const webp = await img.clone().webp({ quality }).toBuffer();
    if (webp.length <= maxBytes) return { webp, quality };
  }
  return null;
}
```

and replace the loop at the end of `prepareBackground` with:

```ts
  const fit = await webpUnder(sharp(input).extract({ left, top, width: cw, height: ch }).resize(outW, outH), BG_MAX_BYTES);
  if (fit) return { ...fit, width: outW, height: outH };
  throw new Error(`can't fit in 300 KB even at quality ${QUALITY_FLOOR}: simplify the painting or regenerate it`);
```

`scripts/art/paintings.ts`:

```ts
// The One River paintings → the app's worlds (spec 2026-10-13 §4): trim any uniform border, crop to a square, encode WebP
// under 300 KB (the story's encoder), and a 240 px thumbnail for 松露's room and the arrival card.
import sharp from 'sharp';
import { webpUnder } from '../../src/story/art';

export const WORLD_MAX_BYTES = 300_000;
export const WORLD_SET_MAX_BYTES = 2_400_000;
export const WORLD_MIN_SIZE = 960;
export const WORLD_MAX_SIZE = 1024;
export const THUMB_SIZE = 240;
export const THUMB_MAX_BYTES = 30_000;
/** A line of pixels is border when its mean distance from its own average colour (summed over R, G, B) is at most this. */
const UNIFORM = 16;
/** A frame is at most this share of a side; past it the "border" is part of the painting (a flat sky, say). */
const MAX_BORDER = 0.08;

export interface Border { top: number; right: number; bottom: number; left: number }

/** How many pixel rows or columns at each edge are a flat frame (Gemini drew one round 2-rainforest.jpg). */
export async function findBorder(input: Buffer): Promise<Border> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const spread = (n: number, at: (i: number) => number) => {
    const m = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) m[c]! += data[at(i) + c]!;
    for (let c = 0; c < 3; c++) m[c]! /= n;
    let s = 0;
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) s += Math.abs(data[at(i) + c]! - m[c]!);
    return s / n;
  };
  const row = (y: number) => spread(W, (x) => (y * W + x) * 3);
  const col = (x: number) => spread(H, (y) => (y * W + x) * 3);
  const depth = (n: number, flat: (i: number) => boolean) => {
    let d = 0;
    while (d < n * MAX_BORDER && flat(d)) d++;
    return d >= n * MAX_BORDER ? 0 : d && d + 1; // and one more: the soft line where the frame meets the paint
  };
  return {
    top: depth(H, (i) => row(i) <= UNIFORM),
    bottom: depth(H, (i) => row(H - 1 - i) <= UNIFORM),
    left: depth(W, (i) => col(i) <= UNIFORM),
    right: depth(W, (i) => col(W - 1 - i) <= UNIFORM),
  };
}

/** One painting, ready for the app: border trimmed, centre-cropped square, at most 1024 px, WebP ≤ 300 KB; and its thumbnail. */
export async function prepareWorld(input: Buffer): Promise<{ webp: Buffer; thumb: Buffer; size: number; quality: number; border: Border }> {
  const meta = await sharp(input).metadata();
  const b = await findBorder(input);
  const w = (meta.width ?? 0) - b.left - b.right;
  const h = (meta.height ?? 0) - b.top - b.bottom;
  const side = Math.min(w, h);
  if (side < WORLD_MIN_SIZE) throw new Error(`too small: ${side} px square after trimming; at least ${WORLD_MIN_SIZE} px is needed`);
  const square = sharp(input).extract({ left: b.left + Math.floor((w - side) / 2), top: b.top + Math.floor((h - side) / 2), width: side, height: side });
  const size = Math.min(side, WORLD_MAX_SIZE);
  const fit = await webpUnder(square.clone().resize(size, size), WORLD_MAX_BYTES);
  if (!fit) throw new Error("can't fit in 300 KB even at quality 50: simplify the painting or repaint it");
  const thumb = await webpUnder(square.clone().resize(THUMB_SIZE, THUMB_SIZE), THUMB_MAX_BYTES);
  if (!thumb) throw new Error("the thumbnail can't fit in 30 KB");
  return { webp: fit.webp, thumb: thumb.webp, size, quality: fit.quality, border: b };
}
```

`scripts/art/worlds.ts`:

```ts
// The parent's One River paintings → public/worlds/ (spec 2026-10-13 §4): npx tsx scripts/art/worlds.ts
// docs/worlds/paintings/<n>-<id>.jpg → public/worlds/<id>.webp and <id>-thumb.webp. Exits 1 if one is missing or over budget.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { WORLDS } from '../../src/fun/worlds';
import { prepareWorld, WORLD_SET_MAX_BYTES } from './paintings';

const SRC = 'docs/worlds/paintings';
const OUT = 'public/worlds';
mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => /^\d-[a-z]+\.(jpe?g|png|webp)$/i.test(f));
let total = 0;
let failed = 0;
for (const w of WORLDS) {
  const f = files.find((x) => x.replace(/^\d-|\.[^.]+$/g, '') === w.id);
  if (!f) { failed++; console.log(`${w.id}: no painting in ${SRC}`); continue; }
  try {
    const r = await prepareWorld(readFileSync(`${SRC}/${f}`));
    writeFileSync(`${OUT}/${w.id}.webp`, r.webp);
    writeFileSync(`${OUT}/${w.id}-thumb.webp`, r.thumb);
    total += r.webp.length + r.thumb.length;
    const b = r.border;
    console.log(`${w.id}: ${r.size} px, ${Math.round(r.webp.length / 1000)} KB at quality ${r.quality}${b.top + b.right + b.bottom + b.left ? `, border trimmed ${b.top}/${b.right}/${b.bottom}/${b.left}` : ''}`);
  } catch (e) { failed++; console.log(`${w.id}: ${(e as Error).message}`); }
}
console.log(`${Math.round(total / 1000)} KB in all${total > WORLD_SET_MAX_BYTES ? ' — OVER the 2.4 MB budget' : ''}`);
process.exit(failed || total > WORLD_SET_MAX_BYTES ? 1 : 0);
```

`vite.config.ts` — the workbox `globPatterns`:

```ts
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}', 'worlds/*.webp'], // One River's paintings and thumbnails: the worlds work offline (spec 2026-10-13 §4)
```

- [ ] **Step 4: Generate the paintings and run the tests**

Run: `npx tsx scripts/art/worlds.ts`
Expected (sizes may differ by a few KB):
```
home: 1024 px, 78 KB at quality 80
rainforest: 962 px, 129 KB at quality 80, border trimmed 30/30/32/30
bamboo: 1024 px, 112 KB at quality 80
terraces: 1024 px, 80 KB at quality 80
dino: 1024 px, 94 KB at quality 80
lantern: 1024 px, 122 KB at quality 80
cove: 1024 px, 79 KB at quality 80
milkyway: 1024 px, 188 KB at quality 80
981 KB in all
```
Then: `npx vitest run scripts/art src/story/art.test.ts` → PASS. Then `npm run build` and `grep -c 'worlds/home.webp' dist/sw.js` → `1` (precached).

- [ ] **Step 5: Commit**

```bash
git add src/story/art.ts scripts/art public/worlds vite.config.ts
git commit -m "feat(worlds): the One River paintings as WebP, rainforest frame trimmed, precached

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The light-cel kit

**Files:**
- Create: `src/ui/cel.ts`, `src/ui/cel.test.ts`

**Interfaces:**
- Produces (used by every later task): `LINE = '#706889'`, `SHADOW = '#7a7398'`, `LW = 2.8`, `LWI = 1.8` (Truffle's box), `WLW = 2.2`, `WLWI = 1.4` (the 1000 box); `mix(a, b, t): string`; `shadeOf(fill, k = 0.4): string`; `line(w): string` (stroke attributes); `crescent(cx, cy, rx, ry, dx, dy): string` (an ellipse minus itself moved (dx, dy), one explicit path, `''` for no move); `celEllipse(cx, cy, rx, ry, fill, { shade?, k?, w? }): string`; `celPath(d, fill, shadow, { shade?, w? }): string`; `sparkle(x, y, r, fill = '#ffe27a', w = LWI * 0.7): string`; `beadEye(x, y, r = 4): string`; `blush(x, y, rx, ry, w): string`.

- [ ] **Step 1: Write the failing test** — `src/ui/cel.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { celEllipse, crescent, LINE, mix, shadeOf, sparkle } from './cel';

const points = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)(?= A|Z)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

describe('light cel kit (spec 2026-10-13 §7)', () => {
  it('mixes colours, and a shadow tone leans toward the blue-violet', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(shadeOf('#ffffff', 1)).toBe('#7a7398');
  });
  it("an ellipse's crescent ends on the ellipse and lies on the side away from the light", () => {
    const d = crescent(0, 0, 20, 10, -4, -2);
    expect(d).toMatch(/^M[-\d.]+ [-\d.]+ A20 10 0 1 [01] [-\d.]+ [-\d.]+ A20 10 0 0 [01] [-\d.]+ [-\d.]+Z$/);
    for (const [x, y] of points(d)) expect((x / 20) ** 2 + (y / 10) ** 2).toBeCloseTo(1, 1);
    // its two ends sit across the lower-right half: their midpoint leans toward the light's offset, the arc away from it
    const [[x1, y1], [x2, y2]] = points(d) as [number, number][];
    expect((x1 + x2) / 2).toBeLessThan(0);
    expect((y1 + y2) / 2).toBeLessThan(0);
  });
  it('no shift, no shadow; a cel ellipse is fill, shadow, then outline, with no clip-path or gradient', () => {
    expect(crescent(0, 0, 10, 10, 0, 0)).toBe('');
    const e = celEllipse(10, 10, 8, 6, '#a9a4ab');
    expect(e.indexOf('fill="#a9a4ab"')).toBeLessThan(e.indexOf(`stroke="${LINE}"`));
    expect(e).not.toMatch(/clip|Gradient|NaN/);
  });
  it('a sparkle is an outlined four-point star', () => {
    expect(sparkle(0, 0, 10)).toMatch(/^<path d="M0 -10 Q.*Z" fill="#ffe27a" stroke="#706889"/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/cel.test.ts` → FAIL (`Cannot find module './cel'`).

- [ ] **Step 3: Implement** — `src/ui/cel.ts`:

```ts
// Light cel (spec 2026-10-13 §7, mockup row C, docs/worlds/truffle-cel-mock.png): one soft-violet line, flat fills, one pale
// hard shadow on the lower right (light from the upper left), never a gradient on a character and never a clip-path: WebKit
// repaints clipped shapes on every animation frame, so every shadow is its own explicit path.

/** The line: a soft violet. */
export const LINE = '#706889';
/** The blue-violet every shadow tone leans toward. */
export const SHADOW = '#7a7398';
/** Truffle's line widths in his 260-wide box: outer contours, then inner lines (nose, mouth, toes). */
export const LW = 2.8;
export const LWI = 1.8;
/** The drawn layer's widths in the worlds' 1000-wide box (creatures are 60–120 tall there). */
export const WLW = 2.2;
export const WLWI = 1.4;

/** a → b by t (0…1), as #rrggbb. */
export function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('')}`;
}
/** A fill's one hard shadow tone (row C: pale; k 0.4 for fur, less for pale fills). */
export const shadeOf = (fill: string, k = 0.4) => mix(fill, SHADOW, k);

/** Stroke attributes for the line at width w. */
export const line = (w: number = LW) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const r1 = (n: number) => +n.toFixed(1);

/**
 * The shadow of an ellipse: the ellipse minus itself moved (dx, dy) toward the light, as one explicit path (a crescent on the
 * side away from the light). (dx, dy) is the lit shape's offset, so (-0.2rx, -0.2ry) puts the shadow on the lower right.
 */
export function crescent(cx: number, cy: number, rx: number, ry: number, dx: number, dy: number): string {
  const ux = dx / rx;
  const uy = dy / ry;
  const L = Math.hypot(ux, uy);
  if (L === 0 || L >= 2) return '';
  const h = Math.sqrt(1 - (L * L) / 4);
  const [nx, ny] = [-uy / L, ux / L];
  const p = (s: number) => [ux / 2 + s * h * nx, uy / 2 + s * h * ny] as const;
  const [a, b] = [p(1), p(-1)];
  const ang = (x: number, y: number) => Math.atan2(y, x);
  const between = (from: number, to: number, mid: number) => { // is `mid` passed going from `from` to `to` in increasing angle?
    const t = (x: number) => ((x - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return t(mid) < t(to);
  };
  const far = ang(-ux, -uy); // the ellipse's own edge away from the light
  const sweep1 = between(ang(a[0], a[1]), ang(b[0], b[1]), far) ? 1 : 0;
  const near = ang(-ux, -uy); // the moved ellipse's edge toward the centre: the same direction from its own centre
  const sweep2 = between(ang(b[0] - ux, b[1] - uy), ang(a[0] - ux, a[1] - uy), near) ? 1 : 0;
  const X = (x: number) => r1(cx + x * rx);
  const Y = (y: number) => r1(cy + y * ry);
  return `M${X(a[0])} ${Y(a[1])} A${rx} ${ry} 0 1 ${sweep1} ${X(b[0])} ${Y(b[1])} A${rx} ${ry} 0 0 ${sweep2} ${X(a[0])} ${Y(a[1])}Z`;
}

/** An outlined ellipse with its hard shadow; k is how far the lit shape moves toward the light (as a share of each radius). */
export function celEllipse(cx: number, cy: number, rx: number, ry: number, fill: string, o: { shade?: string; k?: number; w?: number } = {}): string {
  const k = o.k ?? 0.22;
  const sh = crescent(cx, cy, rx, ry, -rx * k, -ry * k);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>` + (sh ? `<path d="${sh}" fill="${o.shade ?? shadeOf(fill)}"/>` : '') +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${line(o.w ?? WLW)}/>`;
}

/** A shape drawn the cel way: its flat fill, its shadow (an explicit path inside it), then its outline over both. */
export const celPath = (d: string, fill: string, shadow: string, o: { shade?: string; w?: number } = {}) =>
  `<path d="${d}" fill="${fill}"/>` + (shadow ? `<path d="${shadow}" fill="${o.shade ?? shadeOf(fill)}"/>` : '') + `<path d="${d}" fill="none" ${line(o.w ?? WLW)}/>`;

/** An outlined four-point sparkle (joy confetti, a find's glint). */
export function sparkle(x: number, y: number, r: number, fill = '#ffe27a', w: number = LWI * 0.7): string {
  const k = r * 0.28;
  return `<path d="M${r1(x)} ${r1(y - r)} Q${r1(x + k)} ${r1(y - k)} ${r1(x + r)} ${r1(y)} Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + r)} Q${r1(x - k)} ${r1(y + k)} ${r1(x - r)} ${r1(y)} Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - r)}Z" fill="${fill}" ${line(w)}/>`;
}

/** A small anime eye for a creature: dark, a brown ring, a pupil, two catch-lights. */
export const beadEye = (x: number, y: number, r = 4) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r1(r * 0.85)}" ry="${r}" fill="#2a1f26"/><ellipse cx="${x}" cy="${r1(y + r * 0.25)}" rx="${r1(r * 0.6)}" ry="${r1(r * 0.66)}" fill="#6a4632"/><ellipse cx="${x}" cy="${r1(y + r * 0.3)}" rx="${r1(r * 0.36)}" ry="${r1(r * 0.44)}" fill="#1c1420"/><ellipse cx="${r1(x + r * 0.3)}" cy="${r1(y - r * 0.4)}" rx="${r1(r * 0.31)}" ry="${r1(r * 0.36)}" fill="#fff"/><circle cx="${r1(x - r * 0.3)}" cy="${r1(y + r * 0.6)}" r="${r1(r * 0.15)}" fill="#fff"/>`;

/** Blush with three hatch strokes (spec §7). */
export const blush = (x: number, y: number, rx: number, ry: number, w: number = WLWI * 0.8) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ff9d8a" opacity=".55"/><path d="M${r1(x - rx * 0.55)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)} M${r1(x - rx * 0.1)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)} M${r1(x + rx * 0.35)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)}" fill="none" stroke="#e2707c" stroke-width="${w}" stroke-linecap="round" opacity=".7"/>`;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/ui/cel.test.ts` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/cel.ts src/ui/cel.test.ts
git commit -m "feat(cel): the light-cel kit: line, flat fills, explicit crescent shadows, sparkles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The river stage: paintings in one 1000 box, the paper boat, evening, and the old worlds removed

This task switches every world to its painting with the paper boat as its only prop; Tasks 5–8 add each world's creatures. Between Task 4 and Tasks 7–8 the pearl, egg and dig finds have no prop yet (the boat's zodiac find works everywhere); that is expected on this branch.

**Files:**
- Create: `src/ui/worlds/river.ts`, `src/ui/worlds/scene.ts`, `src/ui/worlds/props.ts`, `src/ui/worlds/creatures/draw.ts`, `src/ui/worlds/creatures/boat.ts`, `src/ui/worlds/river.test.ts`, `scripts/stage-cases/creatures.ts`
- Rewrite: `src/ui/worlds/{WorldScene.tsx,WorldProps.tsx,moments.ts,momentFx.ts,evening.ts,burst.ts}` and their tests `{WorldProps.test.tsx,moments.test.ts,momentFx.test.ts,worlds.test.tsx,burst.test.ts,tapArt.test.ts}`
- Modify: `src/ui/worlds/tapArt.ts` (zodiac faces in light cel), `src/app/HomeScreen.tsx` (arrival image), `src/app/Wardrobe.tsx` (thumbnails), `src/styles.css`, `src/styles.test.ts`, `scripts/fit-check.ts` (crop-aware taps), `scripts/stage-cases.ts`, `scripts/stage-cases/page.tsx`, `src/app/home.test.tsx`
- Delete: `src/ui/worlds/{yard,grass,race,blocks,dino,sea,space,pirate,art,scenes}.ts`, `src/ui/worlds/worldArt.test.ts`, `src/ui/worlds/kit/paper.ts`, `src/ui/worlds/kit/props.ts` (keep `kit/palette.ts`: `Truffle.tsx` still imports it until Task 9)

**Interfaces:**
- Consumes: `WorldId`, `WORLDS` (Task 1); `public/worlds/*.webp` (Task 2); `LINE`, `WLW`, `WLWI`, `celEllipse`, `celPath`, `line`, `mix`, `shadeOf`, `sparkle` (Task 3).
- Produces (Tasks 5–8 add to each of these, keyed by world or by fx kind):
  - `river.ts`: `interface PropSpot { x; y; w; h }`, `interface RiverWorld { props: Record<string, PropSpot>; dusk: number; moon: { x; y } | null }`, `RIVER: Record<WorldId, RiverWorld>`, `cropFor(aspect): { x0; x1; y0; y1 }`, `CROPS = { landscape, portrait, phone }`, `inCrop(spot, crop): boolean`.
  - `scene.ts`: `SCENE_VIEWBOX = '0 0 1000 1000'`, `paintingHref(world, thumb = false): string`, `sceneFor(world, time): string`.
  - `props.ts`: `PROP_ART: Record<WorldId, Record<string, string>>`, `propAt(world, name)`, `propsOf(world)`.
  - `creatures/draw.ts`: `box(s, ox, oy, draw: (k: Kit) => string): string` and `Kit { w; wi; ell; path; stroke; flat; rope }`.
  - `creatures/boat.ts`: `BOAT` (hull, sail and lantern), `RIPPLE`.
  - `moments.ts`: `type Fx` (union; this task: `{ kind: 'boat'; animal: string | null }`), `PropMoment`, `MOMENTS: Record<WorldId, PropMoment[]>` (boat first), `Outcome`, `runMoment(world, prop, kid, today, lotusTaps): Outcome`.
  - `momentFx.ts`: `FX_MS: Record<Fx['kind'], number>`, exported helpers `fade`, `move`, `turn`, `at`, `glint`; internal `rise`, `none`, `type Draw`, `DRAW: Record<Fx['kind'], Draw>`, `PROP_OF: Record<Fx['kind'], string>`; `momentFx(world, fx, still): { svg; hide }`.
  - `evening.ts`: `glow(id, x, y, r, color?, strength?)`, `LIGHTS: Record<WorldId, (w) => string>` (all empty here), `eveningOver(world): string`.

- [ ] **Step 1: Write the failing tests**

`src/ui/worlds/river.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { MOMENTS } from './moments';
import { cropFor, RIVER } from './river';

describe('One River anchors (spec 2026-10-13 §5)', () => {
  it('every world has the paper boat, and its props are its moments', () => {
    for (const w of WORLDS) {
      expect(RIVER[w.id].props.boat, w.id).toBeTruthy();
      expect(Object.keys(RIVER[w.id].props).sort(), w.id).toEqual(MOMENTS[w.id].map((m) => m.prop).sort());
    }
  });
  it("every anchor and tap box is inside the painting's 1000 × 1000, and tap boxes are at least 50 across", () => {
    for (const w of WORLDS) for (const [name, s] of Object.entries(RIVER[w.id].props)) {
      expect(s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= 1000 && s.y - s.h >= 0 && s.y <= 1000, `${w.id}:${name}`).toBe(true);
      expect(Math.min(s.w, s.h), `${w.id}:${name}`).toBeGreaterThanOrEqual(50);
    }
  });
  it('no two tap boxes in a world overlap', () => {
    for (const w of WORLDS) {
      const boxes = Object.entries(RIVER[w.id].props);
      for (const [n1, p] of boxes) for (const [n2, q] of boxes) {
        if (n1 >= n2) continue;
        const apart = p.x + p.w / 2 <= q.x - q.w / 2 || q.x + q.w / 2 <= p.x - p.w / 2 || p.y <= q.y - q.h || q.y <= p.y - p.h;
        expect(apart, `${w.id}: ${n1} × ${n2}`).toBe(true);
      }
    }
  });
  it('the slice crop: landscape shows the bottom full width, portrait the centre-bottom, a phone the centre strip', () => {
    expect(cropFor(1.6)).toEqual({ x0: 0, x1: 1000, y0: 375, y1: 1000 });
    expect(cropFor(0.5)).toEqual({ x0: 250, x1: 750, y0: 0, y1: 1000 });
  });
  it('the moon hangs in the sky (the upper half) and 银河 has its own', () => {
    for (const w of WORLDS) { const m = RIVER[w.id].moon; if (m) expect(m.y, w.id).toBeLessThan(500); }
    expect(RIVER.milkyway.moon).toBeNull();
    expect(RIVER.milkyway.dusk).toBe(0);
  });
});
```

`src/ui/worlds/moments.test.ts` (replace the file):

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS, ZODIAC_ORDER } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID, type KidState } from '../../types';
import { MOMENTS, runMoment } from './moments';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const DAY = '2026-10-06';

describe('One River moments (spec 2026-10-13 §6)', () => {
  it('every world has the paper boat first, and every moment it lists runs', () => {
    for (const w of WORLDS) {
      expect(MOMENTS[w.id][0], w.id).toEqual({ prop: 'boat', label: '纸船', auto: false, tap: true });
      for (const x of MOMENTS[w.id]) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('labels are Chinese (child screens: no English)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id]) expect(x.label, x.prop).toMatch(/^[一-鿿]+$/);
  });
  it('the paper boat gives the next zodiac animal once a day, in any world; otherwise it just bobs', () => {
    for (const w of WORLDS) {
      const first = runMoment(w.id, 'boat', kid(), DAY, 0);
      expect(first.fx).toEqual({ kind: 'boat', animal: 'rat' });
      expect(first.kid!.finds.animals).toEqual(['rat']);
      const again = runMoment(w.id, 'boat', first.kid!, DAY, 0);
      expect(again.kid).toBeUndefined();
      expect(again.fx).toEqual({ kind: 'boat', animal: null });
    }
    const all = kid({ finds: { ...DEFAULT_FINDS, animals: [...ZODIAC_ORDER] } });
    expect(runMoment('home', 'boat', all, DAY, 0).fx).toEqual({ kind: 'boat', animal: null });
  });
});
```

`src/ui/worlds/momentFx.test.ts` (replace the file; it walks every world's moments, so it covers Tasks 5–8 as they land):

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID } from '../../types';
import { FX_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment } from './moments';
import { sceneFor } from './scene';

const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };

describe('what each moment draws (spec 2026-10-13 §6)', () => {
  for (const w of WORLDS) for (const m of MOMENTS[w.id]) {
    const fx = runMoment(w.id, m.prop, kid, '2026-10-06', 1).fx;
    it(`${w.id}:${m.prop} draws its moment, hiding only a part the scene has, with no filter or clip-path`, () => {
      const { svg, hide } = momentFx(w.id, fx, false);
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).not.toMatch(/<filter|filter=|clip-path|NaN|undefined/);
      if (hide) expect(sceneFor(w.id, 'afternoon')).toContain(hide.match(/data-p(?:rop|art)="([^"]+)"/)![0]);
      expect(FX_MS[fx.kind]).toBeGreaterThan(0);
    });
    it(`${w.id}:${m.prop} with reduced motion: nothing moves`, () => {
      expect(momentFx(w.id, fx, true).svg).not.toMatch(/animateTransform|animateMotion/);
    });
  }
  it('in 银河 the boat lifts off the water; elsewhere it bobs (spec 2026-10-13 §5)', () => {
    const fx = { kind: 'boat' as const, animal: null };
    expect(momentFx('milkyway', fx, false).svg).toContain('0 -64');
    expect(momentFx('home', fx, false).svg).not.toContain('0 -64');
  });
});
```

`src/ui/worlds/worlds.test.tsx` (replace the file):

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { RIVER } from './river';
import { sceneFor } from './scene';
import { WorldScene } from './WorldScene';

describe('One River scenes (spec 2026-10-13 §5)', () => {
  it('WorldScene draws the painting as one image in the 1000 box, with the boat and the world\'s props, decorative only', () => {
    const { container } = render(<WorldScene world="home" time="afternoon" />);
    const el = container.querySelector('.world-scene')!;
    expect([el.getAttribute('data-world'), el.getAttribute('data-time'), el.getAttribute('aria-hidden')]).toEqual(['home', 'afternoon', 'true']);
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1000 1000');
    expect(container.querySelector('svg')!.getAttribute('preserveAspectRatio')).toBe('xMidYMax slice');
    const img = container.querySelectorAll('image');
    expect(img).toHaveLength(1);
    expect(img[0]!.getAttribute('href')).toBe('/worlds/home.webp');
    for (const p of ['boat']) expect(container.querySelector(`[data-prop="${p}"]`), p).toBeTruthy();
    expect(container.querySelector('[data-part="dusk"]')).toBeNull();
  });
  it('evening tints the painting, hangs the moon and lights the world, under the props; 银河 is night already', () => {
    for (const w of WORLDS) {
      const s = sceneFor(w.id, 'evening');
      expect(s.includes('data-part="dusk"'), w.id).toBe(RIVER[w.id].dusk > 0);
      expect(s.includes('data-part="moon"'), w.id).toBe(!!RIVER[w.id].moon);
      expect(s, w.id).toContain('data-part="boat-lantern"');
      expect(s.indexOf('data-part="lights"'), w.id).toBeLessThan(s.indexOf('data-prop='));
      expect(s.length, w.id).toBeLessThan(60_000);
    }
  });
  it('morning and afternoon are the painting as it is', () => {
    for (const w of WORLDS) expect(sceneFor(w.id, 'morning')).toBe(sceneFor(w.id, 'afternoon'));
  });
});
```

`src/ui/worlds/WorldProps.test.tsx` (keep the file's imports and mocks down to `afterEach(() => vi.useRealTimers());`, then replace the `describe`):

```tsx
describe('WorldProps on One River (spec 2026-10-13 §6; 2026-10-04 §4.5)', () => {
  it("every world's props are buttons in the 1000 box, labelled in Chinese", () => {
    for (const w of WORLDS) {
      const { unmount } = render(<WorldProps world={w.id} {...props()} />);
      expect(document.querySelector('.world-props')!.getAttribute('viewBox')).toBe('0 0 1000 1000');
      for (const m of MOMENTS[w.id]) expect(!!document.querySelector(`.world-props[data-world="${w.id}"] [role="button"][aria-label="${m.label}"]`), `${w.id}:${m.label}`).toBe(m.tap);
      unmount();
    }
  });
  it('the paper boat gives the next zodiac animal once a day; after that it only bobs', () => {
    const onKid = vi.fn();
    const onSay = vi.fn();
    const { rerender } = render(<WorldProps world="bamboo" {...props({ onKid, onSay })} />);
    tap('纸船');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ animals: ['rat'] }) }));
    expect(document.querySelector('.tap-pop[data-animal="rat"]')).toBeTruthy();
    expect(onSay).toHaveBeenCalledWith('找到了！');
    act(() => { vi.advanceTimersByTime(2500); });
    const after = onKid.mock.calls[0]![0] as KidState;
    onKid.mockClear();
    rerender(<WorldProps world="bamboo" {...props({ kid: after, onKid, onSay })} />);
    tap('纸船');
    expect(onKid).not.toHaveBeenCalled();
    expect(document.querySelector('.tap-boat')).toBeTruthy();
    expect(document.querySelector('.tap-pop')).toBeNull();
  });
  it('a tap during a moment is ignored (review focus 1)', () => {
    const onKid = vi.fn();
    render(<WorldProps world="home" {...props({ onKid })} />);
    tap('纸船');
    tap('纸船');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it('hides the boat while it bobs and shows it again (review focus 2)', () => {
    render(<><WorldScene world="home" time="afternoon" /><WorldProps world="home" {...props()} /></>);
    const boat = () => document.querySelector<SVGElement>('.world-scene [data-prop="boat"]')!;
    tap('纸船');
    expect(boat().style.visibility).toBe('hidden');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(boat().style.visibility).toBe('');
  });
  it('a prop hidden mid-moment comes back when Home goes away', () => {
    const { rerender } = render(<><WorldScene world="home" time="afternoon" /><WorldProps world="home" {...props()} /></>);
    tap('纸船');
    rerender(<><WorldScene world="home" time="afternoon" /></>);
    expect(document.querySelector<SVGElement>('.world-scene [data-prop="boat"]')!.style.visibility).toBe('');
  });
  it('reduced motion: a tap still finds the animal (review focus 5)', () => {
    still.on = true;
    const onKid = vi.fn();
    render(<WorldProps world="cove" {...props({ onKid })} />);
    tap('纸船');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it('sweep: a moment stays with its world — switching worlds clears it and brings back a hidden prop', () => {
    const { rerender } = render(<><WorldScene world="lantern" time="morning" /><WorldProps world="lantern" {...props()} /></>);
    tap('纸船');
    expect(document.querySelector('.world-props__fx')).toBeTruthy();
    rerender(<><WorldScene world="home" time="morning" /><WorldProps world="home" {...props()} /></>);
    expect(document.querySelector('.world-props__fx')).toBeNull();
    expect([...document.querySelectorAll<SVGElement>('.world-scene [style*="visibility"]')].filter((e) => e.style.visibility === 'hidden')).toHaveLength(0);
  });
});
```

`src/ui/worlds/burst.test.ts` (replace):

```ts
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
```

`src/ui/worlds/tapArt.test.ts` (replace):

```ts
import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER } from '../../fun/finds';
import { LINE } from '../cel';
import { ANIMAL_FACES } from './tapArt';

describe('the zodiac faces from the paper boat', () => {
  it('a light-cel face for each zodiac animal: the soft-violet line, never the old ink', () => {
    for (const a of ZODIAC_ORDER) {
      const s = ANIMAL_FACES[a]!;
      expect(s.length, a).toBeGreaterThan(200);
      expect(s).toContain(LINE);
      expect(s).not.toContain('#2a2630');
      expect(s).not.toMatch(/Gradient|<filter|url\(#|clip-path|NaN|undefined/);
    }
  });
});
```

`src/app/home.test.tsx`:
- in `describe('HomeScreen journey'`, after `expect(card.textContent).toContain('到竹林了！');` add `expect(card.querySelector('img.arrival__scene')?.getAttribute('src')).toBe('/worlds/bamboo.webp');`
- replace "tapping the box in the tall grass…" with "tapping the paper boat finds an animal, saves it, and Truffle says so", clicking `'.world-props [aria-label="纸船"]'` (the rest unchanged);
- delete the test "Truffle plays with his props: tapping his bowl…" (Task 5 adds the otter's).

`src/styles.test.ts`:

```ts
  it('pictures get a grain overlay like Truffle\'s; the painted worlds carry their own (spec 2026-10-13 §5)', () => {
    expect(css).toMatch(/\n\.grainy::after \{[^}]*mix-blend-mode: multiply/);
    expect(css).not.toMatch(/\.world-scene::after/);
  });
  // …and in "Home: on the ground everything stays in the middle band…", replace the 133.33vw expectation with:
    expect(adaptive).toMatch(/\.home \.world-scene \{ bottom: var\(--nav-h\); \}/); // the square painting covers Home above the nav (spec 2026-10-13 §5)
    expect(adaptive).toMatch(/\.world-props \{ inset: 0 0 var\(--nav-h\) 0; height: calc\(100% - var\(--nav-h\)\); \}/); // the props share its box
```

and delete the test "the evening lantern string never runs across a lesson's progress bar…" (there is no string any more; Task 8 adds the evening-animation test).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/worlds src/styles.test.ts`
Expected: FAIL — `Cannot find module './river'`, `./scene`; the grain and scene-box expectations.

- [ ] **Step 3: Implement the stage**

`src/ui/worlds/river.ts` (the boat anchors are final; Tasks 5–8 add each world's creatures to its `props`):

```ts
// One River (spec 2026-10-13 §3, §5): each world is a square painting in a 1000 × 1000 box, and everything drawn on it is placed
// in that box. Every anchor was placed by eye on the painting and checked in WebKit at iPad landscape, iPad portrait and phone.
import type { WorldId } from '../../fun/worlds';

/** A prop's place: (x, y) is where it stands on the painting; its tap box is w wide, centred on x, and h tall above y. */
export interface PropSpot { x: number; y: number; w: number; h: number }

export interface RiverWorld {
  props: Record<string, PropSpot>;
  /** evening: the dusk tint's strength over the painting (multiply); 0 = none */
  dusk: number;
  /** evening: where the moon hangs in this painting's sky; null when the sky doesn't show or the painting has its own */
  moon: { x: number; y: number } | null;
}

export const RIVER: Record<WorldId, RiverWorld> = {
  home: {
    props: { boat: { x: 690, y: 880, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 640, y: 420 },
  },
  rainforest: {
    props: { boat: { x: 690, y: 930, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 520, y: 380 },
  },
  bamboo: {
    props: { boat: { x: 800, y: 770, w: 120, h: 90 } },
    dusk: 0.34,
    moon: { x: 640, y: 380 },
  },
  terraces: {
    props: { boat: { x: 640, y: 950, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 620, y: 360 },
  },
  dino: {
    props: { boat: { x: 720, y: 870, w: 120, h: 90 } },
    dusk: 0.34,
    moon: { x: 380, y: 260 },
  },
  lantern: {
    props: { boat: { x: 640, y: 880, w: 120, h: 90 } },
    dusk: 0.28,
    moon: { x: 560, y: 300 },
  },
  cove: {
    props: { boat: { x: 680, y: 900, w: 120, h: 90 } },
    dusk: 0.22,
    moon: { x: 560, y: 260 },
  },
  milkyway: {
    props: { boat: { x: 640, y: 900, w: 120, h: 90 } },
    dusk: 0,
    moon: null,
  },
};

/** The part of the painting a box of this shape (width ÷ height) shows, with preserveAspectRatio="xMidYMax slice". */
export function cropFor(aspect: number): { x0: number; x1: number; y0: number; y1: number } {
  if (aspect >= 1) return { x0: 0, x1: 1000, y0: 1000 - 1000 / aspect, y1: 1000 };
  return { x0: 500 - 500 * aspect, x1: 500 + 500 * aspect, y0: 0, y1: 1000 };
}

/** Home's world box at the three crops (spec §5): iPad Air landscape (the shortest), iPad portrait, and iPhone 15 (the narrowest). */
export const CROPS = { landscape: 1180 / (820 - 84), portrait: 768 / (1024 - 84), phone: 390 / (844 - 72) } as const;

/** A tap box wholly inside a crop. */
export const inCrop = (s: PropSpot, c: ReturnType<typeof cropFor>) => s.x - s.w / 2 >= c.x0 && s.x + s.w / 2 <= c.x1 && s.y - s.h >= c.y0 && s.y <= c.y1;
```

`src/ui/worlds/creatures/draw.ts`:

```ts
// Helpers for the worlds' creatures (spec 2026-10-13 §6–7): each is drawn in its own design box and placed by its ground point.
import { celEllipse, celPath, line, LINE, shadeOf, WLW, WLWI } from '../../cel';

const r1 = (n: number) => +n.toFixed(2);

/** Draw in a design box: `(ox, oy)` in the box lands on the ground point (0, 0), scaled by s; line widths stay WLW/WLWI on screen. */
export function box(s: number, ox: number, oy: number, draw: (k: Kit) => string): string {
  return `<g transform="scale(${s}) translate(${-ox} ${-oy})">${draw(kit(s))}</g>`;
}

export interface Kit {
  /** outer and inner line widths in the design box */
  w: number;
  wi: number;
  ell: (cx: number, cy: number, rx: number, ry: number, fill: string, o?: { shade?: string; k?: number; inner?: boolean }) => string;
  path: (d: string, fill: string, shadow?: string, o?: { shade?: string; inner?: boolean }) => string;
  stroke: (d: string, inner?: boolean, extra?: string) => string;
  /** a filled shape with no outline (a mark, a highlight, a shadow band) */
  flat: (d: string, fill: string, extra?: string) => string;
  /** a thick outlined stroke (a tail, a string): the line, then the colour inside it */
  rope: (d: string, color: string, width: number) => string;
}

function kit(s: number): Kit {
  const w = r1(WLW / s);
  const wi = r1(WLWI / s);
  return {
    w,
    wi,
    ell: (cx, cy, rx, ry, fill, o = {}) => celEllipse(cx, cy, rx, ry, fill, { shade: o.shade, k: o.k, w: o.inner ? wi : w }),
    path: (d, fill, shadow = '', o = {}) => celPath(d, fill, shadow, { shade: o.shade, w: o.inner ? wi : w }),
    stroke: (d, inner = true, extra = '') => `<path d="${d}" fill="none" ${line(inner ? wi : w)}${extra ? ` ${extra}` : ''}/>`,
    flat: (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`,
    rope: (d, color, width) => `<path d="${d}" fill="none" ${line(r1(width + 2 * w))}/><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
}

export { LINE, shadeOf };
```

`src/ui/worlds/creatures/boat.ts` (the boat at rest is drawn round its waterline centre; its lantern glows in the evening):

```ts
// The paper boat 纸船 (spec 2026-10-13 §5–6): on the water in every world, drawn round its waterline centre.
import { mix } from '../../cel';
import { box } from './draw';

const PAPER = '#fbf5ea';
const FOLD = '#e9dfcf';

/** The paper hull and sail, 96 wide, the sail 52 above the water. */
const HULL = box(1, 0, 0, (k) =>
  // the hull: two wings and a flat keel; the sail stands from its middle
  k.path('M-48 -16 L-30 4 L30 4 L48 -16 L22 -16 L0 -52 L-22 -16 Z', PAPER, 'M0 -52 L22 -16 L48 -16 L30 4 L8 4 L14 -14 Z', { shade: mix(PAPER, '#7a7398', 0.22) }) +
  k.stroke('M-22 -16 L-14 4 M22 -16 L14 4 M-22 -16 L22 -16') +
  k.flat('M-4 -40 L-14 -20 L-8 -20 Z', '#ffffff', 'opacity=".8"') +
  `<path d="M-40 -11 L-30 -1" stroke="${FOLD}" stroke-width="2" stroke-linecap="round"/>`);

/** Rings on the water round the boat (always under it). */
export const RIPPLE = `<g fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".75"><path d="M-62 6 q10 -5 20 0 M44 7 q10 -5 20 0"/><path d="M-34 10 q34 8 68 0" opacity=".6"/></g>`;

/** A little red lantern on a mast at its stern (it glows in the evening: evening.ts). */
const LANTERN = box(1, 0, 0, (k) =>
  k.stroke('M34 -15 L34 -40', false) + k.ell(34, -46, 7, 8, '#ff7a59', { k: 0.25 }) + k.flat('M30 -47 a4 4 0 0 1 8 0 Z', '#ffd77a'));

/** The boat with its lantern: 96 wide, 54 tall, round its waterline centre. */
export const BOAT = HULL + LANTERN;
```

`src/ui/worlds/props.ts`:

```ts
// Every prop at rest on its painting (spec 2026-10-13 §6), drawn round its ground point; moments (momentFx.ts) redraw it moving.
import type { WorldId } from '../../fun/worlds';
import { BOAT, RIPPLE } from './creatures/boat';
import { RIVER } from './river';

/** Each world's props at rest; each world's task adds its creatures beside the boat. */
export const PROP_ART: Record<WorldId, Record<string, string>> = {
  home: { boat: RIPPLE + BOAT },
  rainforest: { boat: RIPPLE + BOAT },
  bamboo: { boat: RIPPLE + BOAT },
  terraces: { boat: RIPPLE + BOAT },
  dino: { boat: RIPPLE + BOAT },
  lantern: { boat: RIPPLE + BOAT },
  cove: { boat: RIPPLE + BOAT },
  milkyway: { boat: RIPPLE + BOAT },
};

/** A prop in its place, tagged with its name so a moment can hide it while it plays. */
export const propAt = (world: WorldId, name: string) => {
  const s = RIVER[world].props[name]!;
  return `<g data-prop="${name}" transform="translate(${s.x} ${s.y})">${PROP_ART[world][name]}</g>`;
};

/** Every prop of a world, the farther (higher on the painting) first. */
export const propsOf = (world: WorldId) => Object.entries(RIVER[world].props).sort(([, a], [, b]) => a.y - b.y).map(([n]) => propAt(world, n)).join('');
```

`src/ui/worlds/evening.ts` (replace; the tint goes over the painting and under the props, so a creature stays as bright as its moment's copy):

```ts
// Evening on One River (spec 2026-10-13 §5–6): the painting is never swapped. A dusk tint (multiply) at the world's own
// strength, a moon where the sky shows, and the lights that belong in that world, all over the painting and under the props.
import type { WorldId } from '../../fun/worlds';
import { RIVER } from './river';

const DUSK = '#3d3a6b';
const WARM = '#ffcf7a';

/** A soft round light: a radial gradient (never a filter). `id` must be unique on the page. */
export const glow = (id: string, x: number, y: number, r: number, color = WARM, strength = 0.7) =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;

const moon = (w: WorldId, x: number, y: number) =>
  `<g data-part="moon">${glow(`${w}-moon`, x, y, 90, '#fff4c8', 0.45)}<circle cx="${x}" cy="${y}" r="34" fill="#fff8e1"/><path d="M${x + 6} ${y - 30} a34 34 0 0 1 0 60 a26 30 0 0 0 0 -60Z" fill="#efe2b8"/></g>`;

/** Each world's lights (spec 2026-10-13 §6), placed by eye on its painting; each world's task fills in its own. */
const LIGHTS: Record<WorldId, (w: WorldId) => string> = {
  home: () => '', rainforest: () => '', bamboo: () => '', terraces: () => '', dino: () => '', lantern: () => '', cove: () => '', milkyway: () => '',
};
/** The boat's lantern glows in every world. */
const boatGlow = (w: WorldId) => { const b = RIVER[w].props.boat!; return `<g data-part="boat-lantern">${glow(`${w}-boat`, b.x + 34, b.y - 46, 40, '#ffb86b', 0.8)}</g>`; };

/** What evening adds over the painting. */
export function eveningOver(world: WorldId): string {
  const r = RIVER[world];
  const tint = r.dusk > 0 ? `<rect data-part="dusk" width="1000" height="1000" fill="${DUSK}" opacity="${r.dusk}" style="mix-blend-mode:multiply"/>` : '';
  return tint + (r.moon ? moon(world, r.moon.x, r.moon.y) : '') + `<g data-part="lights">${LIGHTS[world](world)}${boatGlow(world)}</g>`;
}
```

`src/ui/worlds/scene.ts`:

```ts
// One River's scene (spec 2026-10-13 §5): the painting as one <image> in a 1000 × 1000 box, the evening over it, then the props.
import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { eveningOver } from './evening';
import { propsOf } from './props';

export const SCENE_VIEWBOX = '0 0 1000 1000';

/** The painting (or its 240 px thumbnail) under the app's base path. */
export const paintingHref = (world: WorldId, thumb = false) => `${import.meta.env.BASE_URL}worlds/${world}${thumb ? '-thumb' : ''}.webp`;

/** A world at a time of day: morning and afternoon are the painting as it is; evening tints it and lights it. */
export function sceneFor(world: WorldId, time: TimeOfDay): string {
  return `<image data-part="painting" href="${paintingHref(world)}" width="1000" height="1000" preserveAspectRatio="none"/>` + (time === 'evening' ? eveningOver(world) : '') + propsOf(world);
}
```

`src/ui/worlds/WorldScene.tsx` (replace):

```tsx
import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { SCENE_VIEWBOX, sceneFor } from './scene';

/** The world's painting behind Home and the lessons, at its time of day, with its creatures and things. Decorative. */
export function WorldScene({ world, time }: { world: WorldId; time: TimeOfDay }) {
  return (
    <div class="world-scene" data-world={world} data-time={time} aria-hidden="true">
      <svg viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: sceneFor(world, time) }} />
    </div>
  );
}
```

`src/ui/worlds/moments.ts` (replace):

```ts
// Prop moments on One River (spec 2026-10-13 §6; the moment rules of 2026-10-04 §4.5): which creatures and things each world
// has, what each moment does, and the daily finds they host. The find rules are unchanged (src/fun/finds.ts); only where they
// happen moved: the zodiac animal comes out of the paper boat, the gem is the lotus's pearl, the egg is in 恐龙谷, the dig in 海湾.
import type { Sfx } from '../../audio/sfx';
import { findAnimal } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import type { ReactionKind } from '../truffle/timelines';

/** What a moment draws (momentFx.ts turns it into SVG). Each world's task adds its kinds to this union. */
export type Fx =
  | { kind: 'boat'; animal: string | null };

/**
 * A prop and its moment. `auto` moments also start by themselves on Home now and then (never ones that hold a find); `tap` is
 * false for a prop whose spot Home's cards or path cover on some screens (the WebKit sweep): it only plays by itself.
 */
export interface PropMoment { prop: string; label: string; auto: boolean; tap: boolean }

const BOAT: PropMoment = { prop: 'boat', label: '纸船', auto: false, tap: true };

/** Every world has the paper boat first; each world's task adds its creatures after it. */
export const MOMENTS: Record<WorldId, PropMoment[]> = {
  home: [BOAT],
  rainforest: [BOAT],
  bamboo: [BOAT],
  terraces: [BOAT],
  dino: [BOAT],
  lantern: [BOAT],
  cove: [BOAT],
  milkyway: [BOAT],
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

/** One moment. Pure, so the finds keep their rules: one animal, one pearl (after three taps) and one dig star a day; the egg remembered. */
export function runMoment(world: WorldId, prop: string, kid: KidState, today: string, lotusTaps: number): Outcome {
  const f = kid.finds;
  if (prop === 'boat') {
    const r = findAnimal(f, today);
    return r.isNew ? { fx: { kind: 'boat', animal: r.animal }, react: 'excited', kid: { ...kid, finds: r.finds }, say: '找到了！' } : { fx: { kind: 'boat', animal: null }, react: 'watch' };
  }
  switch (`${world}:${prop}`) {
    // each world's task adds its cases here
  }
  void lotusTaps;
  throw new Error(`no moment for ${world}:${prop}`);
}
```

`src/ui/worlds/momentFx.ts` (replace):

```ts
// What each prop moment draws (spec 2026-10-13 §6; 2026-10-04 §4.5): the creature or thing moving in its own place, in light cel,
// as SMIL in a fresh <svg> each time. With reduced motion nothing moves: things that appear only fade in and out.
import type { WorldId } from '../../fun/worlds';
import { sparkle } from '../cel';
import type { Fx } from './moments';
import { RIVER } from './river';
import { BOAT, RIPPLE } from './creatures/boat';
import { ANIMAL_FACES } from './tapArt';

/** How long each moment plays (ms); a tap he makes during it is ignored. */
export const FX_MS: Record<Fx['kind'], number> = {
  boat: 1400,
};

export const fade = (dur: number, begin = 0) => `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="${dur}ms"${begin ? ` begin="${begin}ms"` : ''} fill="freeze"/>`;
export const move = (values: string, dur: number, keyTimes?: string, begin = 0) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms"${begin ? ` begin="${begin}ms"` : ''} fill="freeze"/>`;
export const turn = (values: string, dur: number, keyTimes?: string) => `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms" fill="freeze"/>`;
export const at = (x: number, y: number, inner: string, cls = '') => `<g${cls ? ` class="${cls}"` : ''} transform="translate(${x} ${y})">${inner}</g>`;
const rise = (from: number, dur: number, still: boolean) => (still ? fade(dur) : move(`0 ${from};0 0;0 0`, dur, '0;0.3;1') + fade(dur));
export const glint = (x: number, y: number, r: number, delay: number, dur: number) => `<g transform="translate(${x} ${y})" opacity="0">${sparkle(0, 0, r, '#ffe27a', 1.4)}<animate attributeName="opacity" values="0;1;0" dur="${dur}ms" begin="${delay}ms" fill="freeze"/></g>`;

type Draw = (fx: Fx, s: { x: number; y: number }, still: boolean, world: WorldId) => { svg: string; hide: string | null };
const none = () => ({ svg: '', hide: null });

const DRAW: Record<Fx['kind'], Draw> = {
  boat: (fx, s, still, world) => {
    const animal = fx.kind === 'boat' ? fx.animal : null;
    // in 银河 the boat lifts off the silver river for a moment (spec 2026-10-13 §5); elsewhere it bobs
    const path = world === 'milkyway' ? '0 0;0 -40;0 -64;0 -40;0 0' : '0 0;0 -7;0 0;0 -4;0 0';
    const bob = still ? BOAT : `<g>${BOAT}${move(path, FX_MS.boat)}${turn('0;-4;3;-2;0', FX_MS.boat)}</g>`;
    const rings = still ? '' : `<ellipse cx="0" cy="6" rx="40" ry="8" fill="none" stroke="#fff" stroke-width="2.4" opacity="0"><animate attributeName="rx" values="40;90" dur="${FX_MS.boat}ms" fill="freeze"/><animate attributeName="opacity" values="0.8;0" dur="${FX_MS.boat}ms" fill="freeze"/></ellipse>`;
    const pop = animal ? `<g class="tap-pop" data-animal="${animal}" transform="translate(0 -84)"><circle r="30" fill="#fffdf7" stroke="#706889" stroke-width="2.2"/><g transform="scale(1.1)">${ANIMAL_FACES[animal] ?? ''}</g>${rise(40, FX_MS.boat + 800, still)}</g>` : '';
    return { svg: at(s.x, s.y, RIPPLE + rings + bob + pop, 'tap-boat'), hide: '[data-prop="boat"]' };
  },
};

/** Which prop a moment plays on (the zodiac animal's on the boat in any world). */
const PROP_OF: Record<Fx['kind'], string> = {
  boat: 'boat',
};

/** The moment's art, and the scene part it stands in for while it plays (that part is hidden, then shown again). */
export function momentFx(world: WorldId, fx: Fx, still: boolean): { svg: string; hide: string | null } {
  const s = RIVER[world].props[PROP_OF[fx.kind]]!;
  return DRAW[fx.kind](fx, s, still, world);
}
```

`src/ui/worlds/WorldProps.tsx` (replace; it is the old component in the 1000 box: the tap layer uses `RIVER`, Truffle looks left of x 500, and the pearl's tap count is per day):

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import { reducedMotion } from '../motion';
import type { ReactionKind } from '../truffle/timelines';
import { FX_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment, type Fx, type Outcome } from './moments';
import { RIVER } from './river';
import { SCENE_VIEWBOX } from './scene';

/** How often a moment starts by itself on Home (ms), plus up to half as much again at random. */
export const AUTO_MS = 30_000;

interface Props {
  world: WorldId;
  kid: KidState;
  today: string;
  onKid: (kid: KidState) => void; // finds (or stars) changed: save it
  onSay: (line: string) => void; // Truffle says it in his bubble
  onReact: (kind: ReactionKind, side: -1 | 1) => void; // how Truffle reacts, and which side the prop is on (he looks there)
  autoEvery?: number;
}

/**
 * Truffle's props in each world (spec 2026-10-04 §4.5): tap one and he plays with it — the prop moves in its own place while the
 * still one in the scene is hidden — and some moments start by themselves now and then. The daily finds live on these props
 * (runMoment keeps their rules). Only the props take taps; the rest of the world lets them through.
 */
export function WorldProps({ world, kid, today, onKid, onSay, onReact, autoEvery = AUTO_MS }: Props) {
  const [fx, setFx] = useState<{ svg: string; run: number; kind: Fx['kind'] } | null>(null);
  const busy = useRef(false);
  const lotusTaps = useRef({ day: today, n: 0 }); // taps count toward one day's pearl only
  const hidden = useRef<HTMLElement | SVGElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]); // the playing moment's (its end, a line after)
  const auto = useRef(false); // the playing moment started by itself: a tap takes over from it
  const lastTouch = useRef(Date.now());
  const run = useRef(0);
  const latest = useRef({ kid, today, onKid, onSay, onReact });
  latest.current = { kid, today, onKid, onSay, onReact };
  const spots = RIVER[world].props;

  const show = () => {
    if (hidden.current) hidden.current.style.visibility = '';
    hidden.current = null;
  };
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => { timers.current.forEach(clearTimeout); show(); }, []);
  // another world: what this one was playing (a crack on its block, a hidden prop) stays behind (sweep)
  const shownWorld = useRef(world);
  useEffect(() => {
    if (shownWorld.current === world) return;
    shownWorld.current = world;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busy.current = false;
    auto.current = false;
    show();
    setFx(null);
  }, [world]);
  // a moment starts by itself only when he has left the screen alone for a while (final review I1)
  useEffect(() => {
    const touched = () => { lastTouch.current = Date.now(); };
    document.addEventListener('pointerdown', touched, true);
    return () => document.removeEventListener('pointerdown', touched, true);
  }, []);

  const play = (prop: string, o: Outcome, byItself = false) => {
    const still = reducedMotion();
    timers.current.forEach(clearTimeout); // the last moment's are done (or it was taken over)
    timers.current = [];
    auto.current = byItself;
    const { svg, hide } = momentFx(world, o.fx, still);
    show(); // another moment's prop comes back first
    if (hide) {
      const el = document.querySelector<SVGElement>(`.world-scene ${hide}`);
      if (el) { el.style.visibility = 'hidden'; hidden.current = el; }
    }
    busy.current = true;
    // SVG animations run on their outermost <svg>'s clock: each moment gets a fresh <svg> (keyed), so it always plays from its start
    setFx({ svg, run: ++run.current, kind: o.fx.kind });
    const ms = FX_MS[o.fx.kind];
    later(ms, () => {
      busy.current = false;
      show();
      setFx(null);
    });
    if (o.say) latest.current.onSay(o.say);
    if (o.later) { const line = o.later.say; later(o.later.ms, () => latest.current.onSay(line)); }
    if (o.speak && !byItself) speak(o.speak); // a moment that starts by itself never talks out loud
    if (o.sfx && !byItself) playSfx(o.sfx); // nor makes a sound (sweep)
    latest.current.onReact(o.react, spots[prop]!.x < 500 ? -1 : 1);
  };

  const onTap = (prop: string) => {
    if (busy.current && !auto.current) return; // a moment he started ignores taps; one that started by itself gives way
    const { kid: k, today: day } = latest.current;
    if (lotusTaps.current.day !== day) lotusTaps.current = { day, n: 0 };
    const o = runMoment(world, prop, k, day, prop === 'lotus' ? ++lotusTaps.current.n : 0);
    if (o.kid) latest.current.onKid(o.kid);
    play(prop, o);
  };

  // now and then a moment starts by itself (spec §4.5) — never with reduced motion, never one that holds a find
  useEffect(() => {
    if (reducedMotion()) return;
    const autos = MOMENTS[world].filter((m) => m.auto);
    if (!autos.length) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (!busy.current && !reducedMotion() && document.visibilityState !== 'hidden' && Date.now() - lastTouch.current >= autoEvery) {
          const m = autos[Math.floor(Math.random() * autos.length)]!;
          const { kid: k, today: day } = latest.current;
          const { kid: _found, ...o } = runMoment(world, m.prop, k, day, 0);
          play(m.prop, o, true);
        }
        next();
      }, autoEvery + Math.random() * autoEvery * 0.5);
    };
    next();
    return () => clearTimeout(t);
  }, [world, autoEvery]);


  return (
    <>
      <svg class="world-props" data-world={world} viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice">
        {MOMENTS[world].filter((m) => m.tap).map((m) => {
          const s = spots[m.prop]!;
          return (
            <rect
              key={m.prop}
              class="tap"
              role="button"
              tabIndex={0}
              aria-label={m.label}
              x={s.x - s.w / 2}
              y={s.y - s.h}
              width={s.w}
              height={s.h}
              rx={16}
              fill="#000"
              fill-opacity="0"
              onClick={() => onTap(m.prop)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap(m.prop)}
            />
          );
        })}
      </svg>
      {fx && fx.svg && <svg key={fx.run} class="world-props world-props__fx" aria-hidden="true" viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: fx.svg }} />}
    </>
  );
}
```

`src/ui/worlds/burst.ts` (replace; the colours are taken by eye from each painting's sky and accent, so `kit/palette` is no longer needed here):

```ts
// The celebration's sunburst in the current world's colours (spec 2026-10-13 §6): two ray colours and a glow, taken by eye from
// each painting's sky and its accent.
import type { WorldId } from '../../fun/worlds';

export const WORLD_BURST: Record<WorldId, { a: string; b: string; glow: string }> = {
  home: { a: '#f6c6d6', b: '#f7d9a0', glow: '#fff4dc' },
  rainforest: { a: '#9fd49a', b: '#f6c6d6', glow: '#f4fbe6' },
  bamboo: { a: '#bfe3c8', b: '#d9c6f0', glow: '#f6f2ff' },
  terraces: { a: '#cde58a', b: '#f7d9a0', glow: '#fffbe6' },
  dino: { a: '#f4b98a', b: '#c9e6d6', glow: '#fff2e0' },
  lantern: { a: '#f7b26a', b: '#e98a8a', glow: '#fff1dc' },
  cove: { a: '#f7b8a0', b: '#c9b6ea', glow: '#fff0ea' },
  milkyway: { a: '#9fb8f0', b: '#cdeee6', glow: '#f2f6ff' },
};

/** The sunburst's colours as CSS custom properties for the .burst element. */
export function burstStyle(world: WorldId): string {
  const c = WORLD_BURST[world];
  return `--burst-a:${c.a};--burst-b:${c.b};--burst-glow:${c.glow}`;
}
```

`src/ui/worlds/tapArt.ts`: replace the header comment and the two ink constants, and the eye fill, so the zodiac faces popping out of the boat are light cel (keep `ANIMAL_FACES`, `GEM` and `BABY_DINO`; Task 7 removes the last two):

```ts
/* The 12 zodiac animals that come out of the paper boat, as small faces drawn in a 48×48 box centred on 0,0, in light cel
 * (spec 2026-10-13 §7): the soft-violet line, flat fills. Original drawings, no IP. */
import { LINE } from '../cel';

const INK = LINE;
const S = `stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
const eyes = (y = -2, gap = 7) => `<g fill="#3a3045"><circle cx="${-gap}" cy="${y}" r="2.2"/><circle cx="${gap}" cy="${y}" r="2.2"/></g>`;
```

`src/app/HomeScreen.tsx`: import `{ paintingHref }` from `'../ui/worlds/scene'` (drop the `scenes` import) and draw the arrival card's picture as the full painting (a 240 px thumbnail would be enlarged ~3.5× on a Retina iPad):

```tsx
            <img class="arrival__scene" src={paintingHref(arrival)} alt="" aria-hidden="true" />
```

`src/app/Wardrobe.tsx`: import `{ paintingHref }` from `'../ui/worlds/scene'` (drop `SCENES`) and each place's picture becomes:

```tsx
                  <img class="place__thumb" src={paintingHref(w.id, true)} alt="" aria-hidden="true" />
```

`src/styles.css`:
- `.arrival__scene { display: block; width: 100%; aspect-ratio: 1; max-height: 52vh; object-fit: cover; object-position: center bottom; border: var(--panel-border); border-radius: var(--radius); background: var(--paper); }`
- `.place__thumb { display: block; width: 100%; aspect-ratio: 9 / 8; object-fit: cover; object-position: center bottom; border: 2.5px solid var(--ink); border-radius: 10px; background: var(--paper); }`
- the grain rule becomes `.grainy::after {` only (comment: "not the painted worlds: the paintings carry their own, spec 2026-10-13 §5"), and `.kantu__frame, .arrival__frame { … }` becomes `.kantu__frame { border-radius: var(--radius-lg); }` with the three `.place__frame`/`.arrival__frame` rules deleted;
- delete the `@media (orientation: landscape) and (min-height: 600px) { .screen:has(.lessonbar) [data-part="lanterns"] { display: none; } }` block;
- the Home block's comment and three rules become:

```css
/* Home: one screen. Header and cards up top, today's path, Truffle on the ground in the middle.
   The world is a square painting that covers its box (spec 2026-10-13 §5, xMidYMax slice): iPad landscape shows the bottom of
   it full width, portrait the centre-bottom, a phone the centre strip. The props layer has the same box, so anchors line up. */
.world-scene { -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%); mask-image: linear-gradient(to bottom, transparent, #000 12%); }
/* (….tabbar, .tabbar__item, .week__day unchanged…) */
.home .world-scene { bottom: var(--nav-h); }
.world-props { inset: 0 0 var(--nav-h) 0; height: calc(100% - var(--nav-h)); } /* an svg sized by its insets alone would take its square viewBox's height */
```

`scripts/fit-check.ts` — the world-tap probe at the end of `probe()` becomes crop-aware (a prop the painting's crop leaves off a screen is fine; one on it must not be covered; at least one per screen):

```ts
  // world props: one the painting's crop leaves off this screen is fine (spec 2026-10-13 §5), one on it must not be covered, and
  // every world keeps at least one to tap
  const taps = [...document.querySelectorAll('.world-props .tap')];
  const onScreen = (x: number, y: number) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
  let usable = 0;
  for (const t of taps) {
    // the centre and four points around it: a target is lost when its centre is covered, or half of it (2 of the 4 points)
    const r = t.getBoundingClientRect();
    if (!onScreen(r.left + r.width / 2, r.top + r.height / 2)) continue;
    const covered = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].map(([fx, fy]) => {
      const x = r.left + r.width * fx!, y = r.top + r.height * fy!;
      if (!onScreen(x, y)) return null;
      const top = document.elementFromPoint(x, y);
      return top?.closest('.world-props .tap') ? null : `${Math.round(x)},${Math.round(y)} covered by ${top ? (typeof top.className === 'string' ? top.className : top.tagName) || top.tagName : 'nothing'}`;
    });
    const hits = covered.filter((c): c is string => !!c);
    if (covered[0] || hits.length >= 2) out.push(`world tap ${t.getAttribute('aria-label')} at ${hits.join('; ')}`);
    else usable++;
  }
  if (taps.length && !usable) out.push('no world prop to tap on this screen');
```

`scripts/stage-cases/creatures.ts` (Tasks 5–8 add their creatures to the list):

```ts
// Every One River creature and thing for the stage cases' `creatures` sheet (spec 2026-10-13 §6–7): each at rest and, where its
// moment draws it differently, mid-moment. Each world's task adds its creatures to this list.
import { BOAT, RIPPLE } from '../../src/ui/worlds/creatures/boat';
import { ANIMAL_FACES } from '../../src/ui/worlds/tapArt';

export const CREATURES: [string, string][] = [
  ['纸船 boat', RIPPLE + BOAT], ['zodiac rat', `<g transform="translate(0 -40) scale(1.6)"><circle r="26" fill="#fffdf7"/>${ANIMAL_FACES.rat}</g>`], ['zodiac dragon', `<g transform="translate(0 -40) scale(1.6)"><circle r="26" fill="#fffdf7"/>${ANIMAL_FACES.dragon}</g>`],
];
```

`scripts/stage-cases/page.tsx`: replace the `sceneFor` import with `import { CREATURES } from './creatures';`, replace the `worlds` case with a `creatures` case, and let the `moments` case also serve a still `river` case by day or evening:

```tsx
else if (which === 'creatures') {
  // every creature and thing of One River in light cel, at rest and mid-moment, for the parent to look over (spec 2026-10-13 §6–7)
  const cell = ([name, art]: [string, string]) => `<figure style="margin:0;background:#dfe9ec"><svg viewBox="-70 -110 140 130" width="210" height="195">${art}</svg><figcaption>${name}</figcaption></figure>`;
  app.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,210px);gap:6px;padding:8px;font:12px sans-serif;background:#fff">${CREATURES.map(cell).join('')}</div>`;
}
```
```tsx
else if (which === 'moments' || which === 'river') {
  // Home's world with its props and a live Truffle: each moment is tapped and its frames timed (spec 2026-10-04 §6); `river` is
  // the same stage still, by day or evening, for the screenshots at three sizes (spec 2026-10-13 §10)
  const q = new URLSearchParams(location.search);
  const world = (q.get('world') ?? 'home') as WorldId;
  const time = q.get('time') === 'evening' ? 'evening' : 'afternoon';
  const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };
  function Moments() {
    const [react, setReact] = useState<{ kind: ReactionKind; key: number } | null>(null);
    return (
      <div class="screen home">
        <WorldScene world={world} time={time} />
        <WorldProps world={world} kid={kid} today="2026-10-06" onKid={() => {}} onSay={() => {}} onReact={(kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }))} autoEvery={1e9} />
        <div style="position:fixed;left:50%;bottom:120px;transform:translateX(-50%)"><Pet kid={kid} size={150} alive={which === 'moments'} react={react} /></div>
      </div>
    );
  }
  render(<Moments />, app);
}
```

`scripts/stage-cases.ts`: import `cpSync` and `WORLDS`, copy the paintings next to the page before writing `index.html` (`cpSync('public/worlds', join(dir, 'worlds'), { recursive: true });`), loop the moments over `WORLDS.map((w) => w.id)` with a 2400 ms settle (the magpie bridge is the longest moment, 3.6 s), and replace the old `worlds.png` screenshot with:

```ts
  const page = await browser.newPage({ viewport: { width: 1320, height: 1300 } });
  mkdirSync('fit-shots/stage-cases', { recursive: true });
  // every creature and thing in light cel (spec 2026-10-13 §6–7)
  await page.goto(`file://${dir}/index.html?case=creatures`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fit-shots/stage-cases/creatures.png', fullPage: true });
  // every world, by day and by evening, at iPad landscape, iPad portrait and phone, with its props and Truffle (spec §10)
  for (const w of WORLDS) for (const time of ['afternoon', 'evening']) for (const [name, width, height] of [['ipad-landscape', 1024, 768], ['ipad-portrait', 768, 1024], ['iphone', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`file://${dir}/index.html?case=river&world=${w.id}&time=${time}`);
    await page.waitForFunction(() => { const i = document.querySelector('.world-scene image') as SVGImageElement | null; return !!i && i.getBBox().width > 0; }, null, { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `fit-shots/stage-cases/river-${w.id}-${time}-${name}.png` });
    const shown = await page.evaluate(() => { const r = document.querySelector('.world-scene svg')!.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !!document.querySelector('.world-props .tap'); });
    if (!shown) problems.push(`river ${w.id} ${time} ${name}: the world or its props did not draw`);
  }
  await page.setViewportSize({ width: 1480, height: 540 });
```

Delete the old world modules and kit (keep `kit/palette.ts`):

```bash
git rm src/ui/worlds/{yard,grass,race,blocks,dino,sea,space,pirate,art,scenes}.ts src/ui/worlds/worldArt.test.ts src/ui/worlds/kit/paper.ts src/ui/worlds/kit/props.ts
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/worlds src/styles.test.ts src/app/home.test.tsx src/app/SessionScreen.test.tsx src/app/celebrationStage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Look at it in WebKit**

Check port 4174 is free (`lsof -iTCP:4174 -sTCP:LISTEN` prints nothing), then run `npx tsx scripts/stage-cases.ts`. Expected: `stage cases: ok`; open `fit-shots/stage-cases/river-*-{afternoon,evening}-{ipad-landscape,ipad-portrait,iphone}.png` and check every painting fills the screen from the bottom, the boat sits on the water in the lower right (mid-stream in 梯田), evening is tinted with a moon (none in 银河) and the boat's lantern glows.

- [ ] **Step 6: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): One River stage: paintings in one 1000 box, the paper boat and its zodiac find, evening tint and moon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 家门口 and 雨林: otters, a kingfisher, a hornbill, a monkey, a butterfly; window lamps and fireflies

**Files:**
- Create: `src/ui/worlds/creatures/home.ts`, `src/ui/worlds/creatures/rainforest.ts`
- Modify: `src/ui/worlds/{river,moments,momentFx,props,evening}.ts`, `scripts/stage-cases/creatures.ts`
- Test: `src/ui/worlds/moments.test.ts`, `src/ui/worlds/WorldProps.test.tsx`, `src/ui/worlds/worlds.test.tsx`, `src/app/home.test.tsx`

**Interfaces:**
- Consumes: `box`, `Kit` (`creatures/draw.ts`); `beadEye`, `blush`, `mix`, `sparkle` (`src/ui/cel.ts`); `RIVER`, `MOMENTS`, `runMoment`, `Fx`, `FX_MS`, `DRAW`, `PROP_OF`, `PROP_ART`, `LIGHTS`, `glow`, `move`, `turn`, `at`, `fade`, `glint`, `rise`, `none` (Task 4).
- Produces: `otter(look = 0)`, `KINGFISHER` (`creatures/home.ts`); `HORNBILL`, `HORNBILL_FLY`, `MONKEY`, `BUTTERFLY` (`creatures/rainforest.ts`); `Kit.rope` is used for the monkey's tail and legs.

Each creature is drawn in light cel round its ground point in the 1000 box (outer line 2.2, inner 1.4, one hard lower-right shadow as an explicit path, no clip-path, no filter, no gradient). The code below is the drawing; the acceptance screenshot is the stage cases' `creatures.png` and `river-<world>-*.png`.

- [ ] **Step 1: Write the failing tests**

In `src/ui/worlds/moments.test.ts`, inside the `describe`:

```ts
  it('家门口 and 雨林: the otters, the kingfisher, the hornbill, the monkey and the butterfly; the monkey only plays by itself (the cards cover the walkway)', () => {
    expect(MOMENTS.home.map((m) => m.prop)).toEqual(['boat', 'otter', 'kingfisher']);
    expect(MOMENTS.rainforest.map((m) => m.prop)).toEqual(['boat', 'hornbill', 'monkey', 'butterfly']);
    expect(MOMENTS.rainforest.find((m) => m.prop === 'monkey')).toMatchObject({ auto: true, tap: false });
    expect(runMoment('home', 'otter', kid(), DAY, 0)).toMatchObject({ fx: { kind: 'otters' }, react: 'excited', say: '水獭！', later: { say: '它们在玩！', ms: 1200 } });
    for (const w of ['home', 'rainforest'] as const) for (const m of MOMENTS[w].filter((x) => x.auto)) expect(runMoment(w, m.prop, kid(), DAY, 3).kid).toBeUndefined();
  });
```

In `src/ui/worlds/WorldProps.test.tsx`, inside the `describe` (the moments that start by themselves, now that 家门口 has some):

```tsx
  it('some moments start by themselves on Home, and never give finds', () => {
    const onKid = vi.fn();
    const onReact = vi.fn();
    render(<WorldProps world="home" {...props({ onKid, onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onReact).toHaveBeenCalled();
    expect(onKid).not.toHaveBeenCalled();
  });
  it('the otters: Truffle gets excited toward them (on his right), then says a line after', () => {
    const onSay = vi.fn();
    const onReact = vi.fn();
    render(<WorldProps world="home" {...props({ onSay, onReact })} />);
    tap('水獭');
    expect(onReact).toHaveBeenCalledWith('excited', 1);
    expect(onSay).toHaveBeenLastCalledWith('水獭！');
    act(() => { vi.advanceTimersByTime(1200); });
    expect(onSay).toHaveBeenLastCalledWith('它们在玩！');
  });
  it("final review I1: a child's tap during a moment that started by itself plays the tapped one (no tap is lost)", () => {
    const onKid = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WorldProps world="home" {...props({ onKid, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1100); }); // the otters start by themselves
    expect(document.querySelector('.world-props__fx')).toBeTruthy();
    tap('纸船');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ animals: ['rat'] }) }));
    vi.mocked(Math.random).mockRestore();
  });
  it('final review I1: moments start by themselves only when he has left the screen alone for a while', () => {
    const onReact = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WorldProps world="home" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(900); });
    fireEvent.pointerDown(document.body);
    act(() => { vi.advanceTimersByTime(300); });
    expect(onReact).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onReact).toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });
  it('sweep: reduced motion switched on while Home is open stops moments starting by themselves', () => {
    const onReact = vi.fn();
    render(<WorldProps world="home" {...props({ onReact, autoEvery: 1000 })} />);
    still.on = true;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onReact).not.toHaveBeenCalled();
  });
  it('sweep: nothing starts by itself while the page is hidden', () => {
    const onReact = vi.fn();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    render(<WorldProps world="home" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(5000); });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(onReact).not.toHaveBeenCalled();
  });
```

In `src/ui/worlds/worlds.test.tsx`, the first test's prop list becomes `['boat', 'otter', 'kingfisher']`.

In `src/app/home.test.tsx`, in `describe('HomeScreen world tap fun'`:

```tsx
  it("Truffle plays along: tapping the otter in the canal, he is excited, looks toward it and says so (spec 2026-10-13 §6)", async () => {
    const app = await makeAppData();
    await saveKid(app.db, app.kid!);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(document.querySelector('.world-props [aria-label="水獭"]')!);
    await waitFor(() => expect(document.querySelector('.pet__bubble .sr-only')?.textContent).toBe('水獭！'));
    expect(document.querySelector('.home .truffle')?.getAttribute('data-expression')).toBe('surprised');
    expect(document.querySelector('.home [data-part="headrot"]')?.getAttribute('transform')).toMatch(/^rotate\([1-9]/); // the otter is on his right
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/worlds src/app/home.test.tsx`
Expected: FAIL — `MOMENTS.home` has only the boat; no `.world-props [aria-label="水獭"]`.

- [ ] **Step 3: Draw the creatures**

`src/ui/worlds/creatures/home.ts`:

```ts
// 家门口 (spec 2026-10-13 §6): otters pop up in the canal; a kingfisher darts past. The mockup's otter is the reference.
import { blush, beadEye, mix } from '../../cel';
import { box } from './draw';

const BROWN = '#9a7556';
const CREAM = '#f1dfc2';
const BR_SH = mix(BROWN, '#7a7398', 0.38);

/** An otter up to its chest in the water, drawn round its waterline centre: 44 wide, 54 tall. `look` turns its eyes (-1…1). */
export const otter = (look = 0) => box(0.42, 100, 150, (k) =>
  k.ell(62, 38, 11, 11, BROWN) + k.ell(138, 38, 11, 11, BROWN) +
  k.path('M58 150 C58 118 74 90 100 90 C126 90 142 118 142 150 Z', BROWN, 'M120 94 C134 104 142 126 142 150 L126 150 C128 128 124 108 112 98 Z', { shade: BR_SH }) +
  k.path('M76 150 C76 126 86 104 100 104 C114 104 124 126 124 150 Z', CREAM, 'M112 110 C120 120 124 134 124 150 L116 150 C116 134 114 120 106 112 Z', { inner: true }) +
  k.flat('M68 104 Q100 122 132 104 Q100 112 68 104 Z', BR_SH) +
  k.ell(100, 63, 50, 41, BROWN, { shade: BR_SH, k: 0.16 }) +
  k.flat('M62 52 C66 38 80 28 96 26 C82 32 74 42 69 54 Z', mix(BROWN, '#ffffff', 0.25)) +
  k.ell(100, 86, 27, 16, CREAM, { inner: true, k: 0.18 }) +
  beadEye(80 + look * 3, 60, 9) + beadEye(120 + look * 3, 60, 9) +
  blush(66, 80, 9, 5, k.wi * 0.8) + blush(134, 80, 8, 4.5, k.wi * 0.8) +
  k.path('M92 76 C92 71 108 71 108 76 C108 81 102 84 100 84 C98 84 92 81 92 76 Z', '#3a2a30', '', { inner: true }) +
  k.stroke('M100 84 L100 88 M92 90 C95 94 99 94 100 88 C101 94 105 94 108 90') +
  k.stroke('M82 86 L62 83 M82 91 L64 95 M118 86 L138 83 M118 91 L136 95', true, 'opacity=".6"') +
  k.ell(88, 128, 9, 11, BROWN, { shade: BR_SH }) + k.ell(112, 128, 9, 11, BROWN, { shade: BR_SH }) +
  `<path d="M40 150 q14 -7 28 0 M132 150 q14 -7 28 0" fill="none" stroke="#fff" stroke-width="${k.w * 1.1}" stroke-linecap="round" opacity=".85"/>`);

const BLUE = '#3f9fd8';
const ORANGE = '#f28a3c';

/** A kingfisher perched, facing left, drawn round its feet: 46 long, 30 tall. */
export const KINGFISHER = box(1, 0, 0, (k) =>
  k.path('M14 -12 L30 -4 L28 0 L12 -6 Z', '#2f6f9f') + // tail
  k.path('M-14 -14 C-14 -26 4 -28 14 -18 C20 -12 16 -2 4 0 C-8 1 -14 -6 -14 -14 Z', BLUE, 'M14 -18 C20 -12 16 -2 4 0 C10 -4 12 -10 10 -16 Z') +
  k.path('M-12 -10 C-10 -2 2 2 8 -2 C2 -8 -6 -12 -12 -10 Z', ORANGE, '', { inner: true }) +
  k.ell(-10, -20, 9, 8, BLUE, { k: 0.18 }) +
  k.path('M-18 -22 L-36 -19 L-18 -17 Z', '#2a2630', '', { inner: true }) +
  k.flat('M-14 -16 q4 3 8 0 q-4 -1 -8 0 Z', '#ffffff') +
  beadEye(-12, -22, 2.4) +
  k.path('M2 -16 C6 -22 14 -20 14 -14 C10 -12 4 -12 2 -16 Z', '#2f6f9f', '', { inner: true }) +
  k.stroke('M-4 0 L-4 4 M2 0 L2 4'));
```

`src/ui/worlds/creatures/rainforest.ts`:

```ts
// 雨林 (spec 2026-10-13 §6): a hornbill flies between the trees; a monkey swings under the walkway; a butterfly.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const INKY = '#3b3545';
const INKY_SH = mix(INKY, '#7a7398', 0.3);

/** A hornbill perched, facing left, round its feet: 70 long, 56 tall. */
export const HORNBILL = box(1, 0, 0, (k) =>
  k.path('M16 -18 L44 -4 L40 2 L12 -10 Z', INKY, '', { shade: INKY_SH }) + // tail
  k.path('M-16 -22 C-16 -40 14 -42 22 -22 C26 -10 14 0 0 0 C-12 0 -16 -10 -16 -22 Z', INKY, 'M22 -22 C26 -10 14 0 0 0 C10 -6 16 -14 14 -26 Z', { shade: INKY_SH }) +
  k.path('M-12 -14 C-8 -4 4 -2 10 -6 C2 -12 -6 -16 -12 -14 Z', '#f6f0e4', '', { inner: true }) +
  k.ell(-14, -36, 11, 10, INKY, { shade: INKY_SH }) +
  // the big curved beak with its casque
  k.path('M-22 -40 C-34 -42 -46 -34 -52 -22 C-42 -28 -32 -30 -22 -30 Z', '#f6c445', 'M-52 -22 C-42 -28 -32 -30 -22 -30 L-24 -34 C-34 -33 -44 -29 -52 -22 Z', { shade: '#e09a3a' }) +
  k.path('M-20 -42 C-28 -50 -40 -48 -46 -40 C-38 -42 -28 -42 -22 -38 Z', '#ef7b45', '', { inner: true }) +
  k.ell(-12, -38, 4.2, 4.2, '#f6f0e4', { inner: true, k: 0 }) + beadEye(-12, -38, 2.6) +
  k.stroke('M-4 0 L-6 5 M4 0 L4 5'));

/** The hornbill in flight (for its moment): wings out. */
export const HORNBILL_FLY = box(1, 0, 0, (k) =>
  k.path('M-10 -30 C-20 -60 10 -66 30 -50 C14 -46 4 -38 -2 -28 Z', INKY, '', { shade: INKY_SH }) +
  k.path('M6 -26 C30 -14 50 -26 60 -40 C46 -36 26 -34 10 -34 Z', INKY, '', { shade: INKY_SH }) + HORNBILL);

const FUR = '#a8744c';
const FUR_SH = mix(FUR, '#7a7398', 0.38);
const FACE = '#f3d7b4';

/** A monkey hanging by one arm from the walkway, round its feet: 46 wide, 92 from its hand to its feet. */
export const MONKEY = box(1, 0, 0, (k) =>
  k.rope('M12 -22 C34 -22 40 -4 30 4 C24 10 28 16 36 14', FUR, 4) + // tail
  k.path('M-4 -92 C-2 -80 4 -70 6 -60 L-2 -58 C-6 -70 -10 -80 -12 -90 Z', FUR, '', { shade: FUR_SH }) + // the arm up to the walkway
  k.ell(-8, -94, 6, 5, FACE, { inner: true }) +
  k.ell(0, -26, 16, 22, FUR, { shade: FUR_SH }) + k.ell(0, -22, 9, 13, FACE, { inner: true }) +
  k.rope('M-10 -10 C-14 -4 -12 0 -8 0 M10 -10 C14 -4 12 0 8 0', FUR, 5) + // legs
  k.ell(-21, -60, 7, 7, FUR, { shade: FUR_SH }) + k.ell(21, -60, 7, 7, FUR, { shade: FUR_SH }) +
  k.ell(-21, -60, 3.5, 3.5, FACE, { inner: true, k: 0 }) + k.ell(21, -60, 3.5, 3.5, FACE, { inner: true, k: 0 }) +
  k.ell(0, -56, 18, 16, FUR, { shade: FUR_SH }) +
  k.path('M0 -64 C-6 -70 -15 -64 -12 -56 C-15 -48 -8 -42 0 -44 C8 -42 15 -48 12 -56 C15 -64 6 -70 0 -64 Z', FACE, '', { inner: true }) +
  beadEye(-6, -57, 3) + beadEye(6, -57, 3) + blush(-11, -49, 3.5, 2, k.wi * 0.6) + blush(11, -49, 3.5, 2, k.wi * 0.6) +
  k.stroke('M-3 -48 Q0 -45 3 -48'));

/** A butterfly with its wings open, round the point under it: 40 wide. */
export const BUTTERFLY = box(1, 0, 0, (k) =>
  `<g transform="translate(0 -26)">` +
  k.path('M0 -2 C-8 -20 -26 -18 -22 -4 C-26 6 -12 12 0 2 Z', '#f59fbf', 'M0 2 C-12 12 -26 6 -22 -4 C-16 2 -8 2 0 -2 Z', { shade: '#d97fa6' }) +
  k.path('M0 -2 C8 -20 26 -18 22 -4 C26 6 12 12 0 2 Z', '#b9a2f0', 'M0 2 C12 12 26 6 22 -4 C18 2 8 2 0 -2 Z', { shade: '#9a84d6' }) +
  k.ell(-12, -8, 3, 3, '#fff6c4', { inner: true, k: 0 }) + k.ell(12, -8, 3, 3, '#fff6c4', { inner: true, k: 0 }) +
  k.path('M-1.6 -8 L1.6 -8 L1.2 8 L-1.2 8 Z', '#4a4250', '', { inner: true }) + k.stroke('M0 -8 L-5 -16 M0 -8 L5 -16') + `</g>`);
```

- [ ] **Step 4: Put them in their worlds**

`src/ui/worlds/river.ts` — replace the `props:` line under each of these worlds (the boat keeps its anchor; all anchors are final, see "Anchors" above):

```ts
  home: {
    props: { boat: { x: 690, y: 880, w: 120, h: 90 }, otter: { x: 860, y: 790, w: 80, h: 80 }, kingfisher: { x: 930, y: 690, w: 60, h: 50 } },
  rainforest: {
    props: { boat: { x: 690, y: 930, w: 120, h: 90 }, hornbill: { x: 880, y: 560, w: 80, h: 64 }, monkey: { x: 300, y: 470, w: 60, h: 96 }, butterfly: { x: 200, y: 860, w: 60, h: 60 } },
```

`src/ui/worlds/moments.ts` — add the kinds to `Fx`, the worlds' moments after the boat, and their cases inside `runMoment`'s `switch`:

```ts
  | { kind: 'otters' } | { kind: 'dart' } | { kind: 'glide' } | { kind: 'swing' } | { kind: 'flutter' }
```

```ts
  home: [BOAT, { prop: 'otter', label: '水獭', auto: true, tap: true }, { prop: 'kingfisher', label: '翠鸟', auto: true, tap: true }],
  rainforest: [BOAT, { prop: 'hornbill', label: '犀鸟', auto: true, tap: true }, { prop: 'monkey', label: '猴子', auto: true, tap: false }, { prop: 'butterfly', label: '蝴蝶', auto: true, tap: true }],
```

```ts
    case 'home:otter': return { fx: { kind: 'otters' }, react: 'excited', say: '水獭！', later: { say: '它们在玩！', ms: 1200 } };
    case 'home:kingfisher': return { fx: { kind: 'dart' }, react: 'watch', say: '好快！' };
    case 'rainforest:hornbill': return { fx: { kind: 'glide' }, react: 'watch', say: '大鸟！' };
    case 'rainforest:monkey': return { fx: { kind: 'swing' }, react: 'excited', say: '荡秋千！' };
    case 'rainforest:butterfly': return { fx: { kind: 'flutter' }, react: 'pounce' };
```

`src/ui/worlds/momentFx.ts` — import the art, then add each kind's length, drawing and prop:

```ts
import { KINGFISHER, otter } from './creatures/home';
import { BUTTERFLY, HORNBILL, HORNBILL_FLY, MONKEY } from './creatures/rainforest';
```

```ts
// FX_MS
  otters: 2400, dart: 1600, glide: 2600, swing: 2000, flutter: 1800,
// PROP_OF
  otters: 'otter', dart: 'kingfisher', glide: 'hornbill', swing: 'monkey', flutter: 'butterfly',
```

```ts
// DRAW
  otters: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, otter(0.6)), hide: '[data-prop="otter"]' };
    const up = `<g>${otter(0.6)}${move('0 0;0 -16;0 -16;0 -16;0 20', FX_MS.otters, '0;0.2;0.5;0.8;1')}</g>`;
    const friend = `<g opacity="0" transform="translate(-58 10) scale(0.85)">${otter(-0.6)}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="${FX_MS.otters}ms" fill="freeze"/>${move('0 30;0 -10;0 -10;0 30', FX_MS.otters, '0;0.25;0.75;1')}</g>`;
    return { svg: at(s.x, s.y, friend + up, 'tap-otters'), hide: '[data-prop="otter"]' };
  },
  dart: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, KINGFISHER + glint(0, -40, 7, 0, 900)), hide: null };
    const fly = `<g>${KINGFISHER}${move('0 0;-60 -30;-200 10;-60 -30;0 0', FX_MS.dart, '0;0.2;0.5;0.8;1')}</g>`;
    return { svg: at(s.x, s.y, fly, 'tap-dart'), hide: '[data-prop="kingfisher"]' };
  },
  glide: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, HORNBILL + glint(-20, -60, 7, 0, 900)), hide: null };
    const fly = `<g opacity="0">${HORNBILL_FLY}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.45;0.5" dur="${FX_MS.glide}ms" fill="freeze"/>${move('0 0;-220 -60;-220 -60', FX_MS.glide, '0;0.45;1')}</g>`;
    const back = `<g opacity="0">${HORNBILL_FLY}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.5;0.55;1" dur="${FX_MS.glide}ms" fill="freeze"/>${move('180 -40;180 -40;0 0', FX_MS.glide, '0;0.5;1')}</g>`;
    return { svg: at(s.x, s.y, fly + back, 'tap-glide'), hide: '[data-prop="hornbill"]' };
  },
  swing: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, MONKEY), hide: '[data-prop="monkey"]' };
    return { svg: at(s.x, s.y, `<g>${MONKEY}<animateTransform attributeName="transform" type="rotate" values="0 -8 -94;24 -8 -94;-20 -8 -94;14 -8 -94;0 -8 -94" dur="${FX_MS.swing}ms" fill="freeze"/></g>`, 'tap-swing'), hide: '[data-prop="monkey"]' };
  },
  flutter: (_fx, s, still) => {
    if (still) return none();
    const wings = `<g>${BUTTERFLY}<animateTransform attributeName="transform" type="scale" values="1 1;0.4 1;1 1" dur="220ms" repeatCount="${Math.round(FX_MS.flutter / 220)}"/></g>`;
    return { svg: at(s.x, s.y, `<g>${wings}<animateMotion dur="${FX_MS.flutter}ms" path="M0 0 C40 -60 90 -20 70 20 C50 50 10 30 0 0" fill="freeze"/></g>`, 'tap-butterfly'), hide: '[data-prop="butterfly"]' };
  },
```

`src/ui/worlds/props.ts` — import the art and set the worlds' props at rest:

```ts
import { KINGFISHER, otter } from './creatures/home';
import { BUTTERFLY, HORNBILL, MONKEY } from './creatures/rainforest';

  home: { boat: RIPPLE + BOAT, otter: otter(), kingfisher: KINGFISHER },
  rainforest: { boat: RIPPLE + BOAT, hornbill: HORNBILL, monkey: MONKEY, butterfly: BUTTERFLY },
```

`src/ui/worlds/evening.ts` — add the helpers for lit windows, street lamps and fireflies above `LIGHTS`:

```ts
/** Fireflies: a dot and its glow; they pulse (CSS, only on Home and never with reduced motion). */
const fireflies = (w: WorldId, pts: [number, number][]) => pts.map(([x, y], i) =>
  `<g data-part="firefly" class="world-anim world-anim--pulse" style="animation-delay:${(i * 0.37).toFixed(2)}s">${glow(`${w}-ff${i}`, x, y, 18, '#e9ff9a', 0.8)}<circle cx="${x}" cy="${y}" r="3.2" fill="#f6ffc4"/></g>`).join('');
/** Warm glows over lit windows or lanterns the painting already has. */
const glows = (w: WorldId, part: string, pts: [number, number, number][]) => pts.map(([x, y, r], i) => `<g data-part="${part}">${glow(`${w}-${part}${i}`, x, y, r)}</g>`).join('');
/** A drawn street lamp, standing at (x, y). */
const lamp = (w: WorldId, i: number, x: number, y: number) =>
  `<g data-part="lamp">${glow(`${w}-lamp${i}`, x, y - 52, 44)}<path d="M${x} ${y} L${x} ${y - 48}" stroke="#706889" stroke-width="3" stroke-linecap="round"/><path d="M${x - 7} ${y - 48} h14 l-3 -8 h-8 Z" fill="#fff4c8" stroke="#706889" stroke-width="1.6" stroke-linejoin="round"/></g>`;
```

then the two worlds' lights:

```ts
  home: (w) => glows(w, 'window', [[230, 380, 60], [400, 440, 60], [930, 330, 70], [920, 520, 60]]) + lamp(w, 1, 440, 650) + lamp(w, 2, 790, 660),
  rainforest: (w) => fireflies(w, [[150, 700], [260, 640], [380, 760], [620, 700], [780, 640], [860, 760], [500, 860], [90, 860]]),
```

`scripts/stage-cases/creatures.ts` — import the art and add to `CREATURES`:

```ts
import { KINGFISHER, otter } from '../../src/ui/worlds/creatures/home';
import { BUTTERFLY, HORNBILL, HORNBILL_FLY, MONKEY } from '../../src/ui/worlds/creatures/rainforest';

  ['otter', otter()], ['otter look', otter(0.6)], ['kingfisher', KINGFISHER], ['hornbill', HORNBILL], ['hornbill flying', HORNBILL_FLY], ['monkey', MONKEY], ['butterfly', BUTTERFLY],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/worlds src/app/home.test.tsx`
Expected: PASS.

- [ ] **Step 6: Look at them in WebKit**

Check port 4174 is free, run `npx tsx scripts/stage-cases.ts` (expected `stage cases: ok`, including each new moment's p95 per-frame work ≤ 8 ms), and look at `fit-shots/stage-cases/creatures.png` and `river-home-*.png`, `river-rainforest-*.png`. Acceptance: each creature reads at a glance (a child can name it), sits on the painting where the anchor table says (on water, ground, branch or sky as described), carries the soft-violet line with one pale lower-right shadow like the mockup's otter, and its moment plays in place and ends at rest.

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): 家门口 and 雨林 creatures in light cel: otters, kingfisher, hornbill, monkey, butterfly; lamps and fireflies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 竹林 and 梯田: a panda, a frog, a duck family, a kite, a dragonfly; moonlit mist, a farmhouse window and fireflies

**Files:**
- Create: `src/ui/worlds/creatures/bamboo.ts`, `src/ui/worlds/creatures/terraces.ts`
- Modify: `src/ui/worlds/{river,moments,momentFx,props,evening}.ts`, `scripts/stage-cases/creatures.ts`
- Test: `src/ui/worlds/moments.test.ts`, `src/ui/worlds/WorldProps.test.tsx`

**Interfaces:**
- Consumes: `box`, `Kit` (`creatures/draw.ts`); `beadEye`, `blush`, `mix`, `sparkle` (`src/ui/cel.ts`); `RIVER`, `MOMENTS`, `runMoment`, `Fx`, `FX_MS`, `DRAW`, `PROP_OF`, `PROP_ART`, `LIGHTS`, `glow`, `move`, `turn`, `at`, `fade`, `glint`, `rise`, `none` (Task 4).
- Produces: `panda(chew = false)`, `FROG` (`creatures/bamboo.ts`); `DUCKS`, `KITE`, `DRAGONFLY` (`creatures/terraces.ts`).

Each creature is drawn in light cel round its ground point in the 1000 box (outer line 2.2, inner 1.4, one hard lower-right shadow as an explicit path, no clip-path, no filter, no gradient). The code below is the drawing; the acceptance screenshot is the stage cases' `creatures.png` and `river-<world>-*.png`.

- [ ] **Step 1: Write the failing tests**

In `src/ui/worlds/moments.test.ts`, inside the `describe`:

```ts
  it('竹林 and 梯田: the panda munches then rolls (with the munch sound), the frog hops; the kite only plays by itself (the cards cover its sky)', () => {
    expect(MOMENTS.bamboo.map((m) => m.prop)).toEqual(['boat', 'panda', 'frog']);
    expect(MOMENTS.terraces.map((m) => m.prop)).toEqual(['boat', 'ducks', 'kite', 'dragonfly']);
    expect(runMoment('bamboo', 'panda', kid(), DAY, 0)).toMatchObject({ fx: { kind: 'roll' }, react: 'munch', sfx: 'munch', later: { say: '哈哈，打滚了！' } });
    expect(MOMENTS.terraces.find((m) => m.prop === 'kite')).toMatchObject({ auto: true, tap: false });
  });
```

In `src/ui/worlds/WorldProps.test.tsx`, inside the `describe`:

```tsx
  it('sweep: a moment that starts by itself makes no sound (the panda munches silently)', () => {
    vi.mocked(playSfx).mockClear();
    const onReact = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0); // 竹林's first moment that starts by itself: the panda
    render(<WorldProps world="bamboo" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onReact).toHaveBeenCalledWith('munch', -1);
    expect(playSfx).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/worlds`
Expected: FAIL — `MOMENTS.bamboo` has only the boat.

- [ ] **Step 3: Draw the creatures**

`src/ui/worlds/creatures/bamboo.ts`:

```ts
// 竹林 (spec 2026-10-13 §6): a panda munches, then rolls over; a frog hops on the stepping stones.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const WHITE = '#f7f4ee';
const WHITE_SH = mix(WHITE, '#7a7398', 0.2);
const BLACK = '#3b3545';
const BLACK_SH = mix(BLACK, '#7a7398', 0.25);
const BAMBOO = '#8cc06a';

/** A panda sitting, holding a bamboo stalk, round where it sits: 90 wide, 96 tall. `chew` opens its mouth a little. */
export const panda = (chew = false) => box(1, 0, 0, (k) =>
  k.ell(-26, -8, 14, 10, BLACK, { shade: BLACK_SH }) + k.ell(26, -8, 14, 10, BLACK, { shade: BLACK_SH }) + // feet
  k.ell(0, -32, 34, 30, WHITE, { shade: WHITE_SH }) +
  k.flat('M-30 -50 Q0 -36 30 -50 Q0 -42 -30 -50 Z', WHITE_SH) +
  // the bamboo it holds, in front of its body
  k.path('M10 -96 L16 -96 L14 -10 L8 -10 Z', BAMBOO, 'M13 -96 L16 -96 L14 -10 L11 -10 Z', { shade: '#6ea352', inner: true }) +
  k.stroke('M8 -70 L16 -70 M9 -42 L15 -42') +
  k.path('M14 -92 C24 -100 34 -98 40 -92 C30 -90 22 -90 14 -92 Z', '#9fd27a', '', { inner: true }) +
  k.ell(-22, -40, 11, 13, BLACK, { shade: BLACK_SH }) + k.ell(20, -50, 11, 11, BLACK, { shade: BLACK_SH }) + // arms
  k.ell(-24, -88, 10, 10, BLACK, { shade: BLACK_SH }) + k.ell(24, -88, 10, 10, BLACK, { shade: BLACK_SH }) + // ears
  k.ell(0, -70, 28, 24, WHITE, { shade: WHITE_SH, k: 0.16 }) +
  `<ellipse cx="-11" cy="-72" rx="8" ry="10" transform="rotate(25 -11 -72)" fill="${BLACK}"/><ellipse cx="11" cy="-72" rx="8" ry="10" transform="rotate(-25 11 -72)" fill="${BLACK}"/>` +
  beadEye(-10, -72, 3.4) + beadEye(10, -72, 3.4) +
  k.ell(0, -61, 4, 3, BLACK, { inner: true, k: 0 }) + blush(-17, -60, 5, 2.6, k.wi * 0.6) + blush(17, -60, 5, 2.6, k.wi * 0.6) +
  (chew ? k.path('M-4 -55 Q0 -50 4 -55 Z', '#8a3d4c', '', { inner: true }) : k.stroke('M-4 -56 Q-2 -53 0 -56 Q2 -53 4 -56')));

const GREEN = '#7cc46a';
const GREEN_SH = mix(GREEN, '#7a7398', 0.32);

/** A frog sitting on a stone, round its feet: 40 wide, 30 tall. */
export const FROG = box(1, 0, 0, (k) =>
  k.ell(-14, -4, 9, 5, GREEN, { shade: GREEN_SH }) + k.ell(14, -4, 9, 5, GREEN, { shade: GREEN_SH }) +
  k.ell(0, -13, 17, 13, GREEN, { shade: GREEN_SH }) + k.ell(0, -9, 10, 6, '#e9f3c8', { inner: true, k: 0.1 }) +
  k.ell(-9, -25, 7, 7, GREEN, { shade: GREEN_SH }) + k.ell(9, -25, 7, 7, GREEN, { shade: GREEN_SH }) +
  beadEye(-9, -25, 3.6) + beadEye(9, -25, 3.6) + blush(-12, -13, 3.5, 2, k.wi * 0.6) + blush(12, -13, 3.5, 2, k.wi * 0.6) +
  k.stroke('M-6 -15 Q0 -11 6 -15'));
```

`src/ui/worlds/creatures/terraces.ts`:

```ts
// 梯田 (spec 2026-10-13 §6): a duck family paddles downstream; a kite dips overhead; a dragonfly.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

const DUCK = '#fbf7ee';
const DUCK_SH = mix(DUCK, '#7a7398', 0.22);
const CHICK = '#ffd85e';
const CHICK_SH = mix(CHICK, '#7a7398', 0.25);
const BILL = '#f39a3a';

const duck = (x: number, s: number, body: string, sh: string) => box(s, -x / s, 0, (k) =>
  k.path('M-24 -4 C-26 -18 -8 -20 6 -14 C14 -24 22 -12 20 -4 C14 4 -18 4 -24 -4 Z', body, 'M20 -4 C14 4 -18 4 -24 -4 C-10 -2 8 -4 18 -10 Z', { shade: sh }) +
  k.ell(-16, -24, 10, 10, body, { shade: sh }) + k.path('M-25 -24 L-36 -21 L-25 -18 Z', BILL, '', { inner: true }) +
  beadEye(-18, -26, 2.4) + k.path('M2 -12 C8 -14 12 -10 10 -6 C6 -6 2 -8 2 -12 Z', sh, '', { inner: true }));

/** A duck and three ducklings in a line on the water, swimming left, round the mother's waterline: 110 wide, 36 tall. */
export const DUCKS = duck(0, 1, DUCK, DUCK_SH) + duck(34, 0.55, CHICK, CHICK_SH) + duck(56, 0.55, CHICK, CHICK_SH) + duck(78, 0.55, CHICK, CHICK_SH) +
  `<path d="M-30 2 q8 -4 16 0 M30 3 q8 -3 14 0 M66 3 q8 -3 14 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;

/** A diamond kite with a ribbon tail and its string down to the lower left, round its tail's end: 60 wide, 86 tall. */
export const KITE = box(1, 0, 0, (k) =>
  k.stroke('M0 -40 C-30 -10 -60 20 -90 70', true, 'opacity=".7"') +
  k.stroke('M0 -40 C8 -30 -4 -20 4 -10 C10 -2 2 4 4 0', false) +
  k.path('M8 -8 L14 -2 L6 -2 Z M-2 -22 L4 -16 L-4 -16 Z', '#ff8fa3', '', { inner: true }) +
  k.path('M0 -86 L26 -60 L0 -36 L-26 -60 Z', '#ff7a59', 'M0 -86 L26 -60 L0 -36 Z', { shade: '#e05a4a' }) +
  k.path('M0 -86 L-26 -60 L0 -60 Z', '#ffd166', '', { inner: true }) + k.stroke('M0 -86 L0 -36 M-26 -60 L26 -60'));

/** A dragonfly hovering, round the point under it: 50 wide. */
export const DRAGONFLY = box(1, 0, 0, (k) => `<g transform="translate(0 -24)">` +
  `<g fill="#e8f6ff" fill-opacity=".8">${k.path('M-2 -2 C-14 -12 -26 -10 -24 -4 C-20 0 -10 0 -2 -2 Z', '#e8f6ff')}${k.path('M-2 2 C-12 8 -22 10 -22 4 C-20 0 -10 0 -2 2 Z', '#e8f6ff')}${k.path('M2 -2 C14 -12 26 -10 24 -4 C20 0 10 0 2 -2 Z', '#e8f6ff')}${k.path('M2 2 C12 8 22 10 22 4 C20 0 10 0 2 2 Z', '#e8f6ff')}</g>` +
  k.path('M-2 -6 L2 -6 L1.4 22 L-1.4 22 Z', '#3f9fd8', '', { shade: '#2f6f9f', inner: true }) + k.ell(0, -8, 4, 3.4, '#3f9fd8', { inner: true, k: 0.1 }) + `</g>`);
```

- [ ] **Step 4: Put them in their worlds**

`src/ui/worlds/river.ts` — replace the `props:` line under each of these worlds (the boat keeps its anchor; all anchors are final, see "Anchors" above):

```ts
  bamboo: {
    props: { boat: { x: 800, y: 770, w: 120, h: 90 }, panda: { x: 190, y: 850, w: 100, h: 100 }, frog: { x: 560, y: 820, w: 60, h: 50 } },
  terraces: {
    props: { boat: { x: 640, y: 950, w: 120, h: 90 }, ducks: { x: 650, y: 835, w: 110, h: 56 }, kite: { x: 300, y: 420, w: 70, h: 96 }, dragonfly: { x: 200, y: 880, w: 60, h: 56 } },
```

`src/ui/worlds/moments.ts` — add the kinds to `Fx`, the worlds' moments after the boat, and their cases inside `runMoment`'s `switch`:

```ts
  | { kind: 'roll' } | { kind: 'hop' } | { kind: 'paddle' } | { kind: 'dip' } | { kind: 'zip' }
```

```ts
  bamboo: [BOAT, { prop: 'panda', label: '熊猫', auto: true, tap: true }, { prop: 'frog', label: '青蛙', auto: true, tap: true }],
  terraces: [BOAT, { prop: 'ducks', label: '鸭子', auto: true, tap: true }, { prop: 'kite', label: '风筝', auto: true, tap: false }, { prop: 'dragonfly', label: '蜻蜓', auto: true, tap: true }],
```

```ts
    case 'bamboo:panda': return { fx: { kind: 'roll' }, react: 'munch', say: '好吃！', later: { say: '哈哈，打滚了！', ms: 1300 }, sfx: 'munch' };
    case 'bamboo:frog': return { fx: { kind: 'hop' }, react: 'pounce', say: '呱呱！' };
    case 'terraces:ducks': return { fx: { kind: 'paddle' }, react: 'watch', say: '鸭妈妈和鸭宝宝！' };
    case 'terraces:kite': return { fx: { kind: 'dip' }, react: 'excited', say: '飞高高！' };
    case 'terraces:dragonfly': return { fx: { kind: 'zip' }, react: 'pounce' };
```

`src/ui/worlds/momentFx.ts` — import the art, then add each kind's length, drawing and prop:

```ts
import { FROG, panda } from './creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from './creatures/terraces';
```

```ts
// FX_MS
  roll: 2200, hop: 1200, paddle: 3000, dip: 2000, zip: 1600,
// PROP_OF
  roll: 'panda', hop: 'frog', paddle: 'ducks', dip: 'kite', zip: 'dragonfly',
```

```ts
// DRAW
  roll: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, panda(true)), hide: '[data-prop="panda"]' };
    const munch = `<g>${panda(true)}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.4;0.42" dur="${FX_MS.roll}ms" fill="freeze"/>${move('0 0;0 -3;0 0;0 -3;0 0', 880)}</g>`;
    const over = `<g opacity="0">${panda(false)}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.4;0.42;1" dur="${FX_MS.roll}ms" fill="freeze"/><animateTransform attributeName="transform" type="rotate" values="0 0 -40;0 0 -40;-360 0 -40" keyTimes="0;0.42;1" dur="${FX_MS.roll}ms" fill="freeze"/></g>`;
    return { svg: at(s.x, s.y, munch + over, 'tap-roll'), hide: '[data-prop="panda"]' };
  },
  hop: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, FROG), hide: '[data-prop="frog"]' };
    return { svg: at(s.x, s.y, `<g>${FROG}${move('0 0;20 -40;40 0;40 0;20 -30;0 0', FX_MS.hop, '0;0.2;0.4;0.6;0.8;1')}</g>`, 'tap-hop'), hide: '[data-prop="frog"]' };
  },
  paddle: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, DUCKS), hide: '[data-prop="ducks"]' };
    return { svg: at(s.x, s.y, `<g>${DUCKS}${move('0 0;-40 30;-40 30;0 0', FX_MS.paddle, '0;0.45;0.55;1')}${turn('0;-2;2;-2;0', FX_MS.paddle)}</g>`, 'tap-paddle'), hide: '[data-prop="ducks"]' };
  },
  dip: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, KITE), hide: '[data-prop="kite"]' };
    return { svg: at(s.x, s.y, `<g>${KITE}${move('0 0;20 30;-10 -20;0 0', FX_MS.dip)}<animateTransform attributeName="transform" type="rotate" additive="sum" values="0 0 -60;18 0 -60;-14 0 -60;0 0 -60" dur="${FX_MS.dip}ms" fill="freeze"/></g>`, 'tap-dip'), hide: '[data-prop="kite"]' };
  },
  zip: (_fx, s, still) => {
    if (still) return none();
    return { svg: at(s.x, s.y, `<g>${DRAGONFLY}${move('0 0;60 -20;60 -20;-30 -40;0 0', FX_MS.zip, '0;0.25;0.45;0.75;1')}</g>`, 'tap-zip'), hide: '[data-prop="dragonfly"]' };
  },
```

`src/ui/worlds/props.ts` — import the art and set the worlds' props at rest:

```ts
import { FROG, panda } from './creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from './creatures/terraces';

  bamboo: { boat: RIPPLE + BOAT, panda: panda(), frog: FROG },
  terraces: { boat: RIPPLE + BOAT, ducks: DUCKS, kite: KITE, dragonfly: DRAGONFLY },
```

`src/ui/worlds/evening.ts` — the two worlds' lights (the helpers came in Task 5):

```ts
  bamboo: (w) => `<g data-part="moonlight">${glow(`${w}-mist`, 640, 650, 140, '#eaf0ff', 0.5)}</g>` + fireflies(w, [[120, 640], [250, 700], [380, 620], [880, 600], [930, 720], [160, 900]]),
  terraces: (w) => glows(w, 'window', [[200, 395, 50]]) + fireflies(w, [[100, 700], [240, 760], [380, 820], [880, 700], [160, 900], [420, 640]]),
```

`scripts/stage-cases/creatures.ts` — import the art and add to `CREATURES`:

```ts
import { FROG, panda } from '../../src/ui/worlds/creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from '../../src/ui/worlds/creatures/terraces';

  ['panda', panda()], ['panda chewing', panda(true)], ['frog', FROG], ['ducks', DUCKS], ['kite', KITE], ['dragonfly', DRAGONFLY],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/worlds`
Expected: PASS.

- [ ] **Step 6: Look at them in WebKit**

Check port 4174 is free, run `npx tsx scripts/stage-cases.ts` (expected `stage cases: ok`, including each new moment's p95 per-frame work ≤ 8 ms), and look at `fit-shots/stage-cases/creatures.png` and `river-bamboo-*.png`, `river-terraces-*.png`. Acceptance: each creature reads at a glance (a child can name it), sits on the painting where the anchor table says (on water, ground, branch or sky as described), carries the soft-violet line with one pale lower-right shadow like the mockup's otter, and its moment plays in place and ends at rest.

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): 竹林 and 梯田 creatures in light cel: panda, frog, ducks, kite, dragonfly; mist, window and fireflies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 恐龙谷 and 灯笼水乡: the egg and its hatchling, a pterosaur, the volcano's puff; the lotus and its pearl, a koi, a sky lantern; lava and lanterns

**Files:**
- Create: `src/ui/worlds/creatures/dino.ts`, `src/ui/worlds/creatures/lantern.ts`
- Modify: `src/ui/worlds/{river,moments,momentFx,props,evening}.ts`, `scripts/stage-cases/creatures.ts`, `src/ui/worlds/WorldProps.tsx`, `src/app/Wardrobe.tsx`, `src/ui/worlds/tapArt.ts`
- Test: `src/ui/worlds/moments.test.ts`, `src/ui/worlds/WorldProps.test.tsx`, `src/app/home.test.tsx`

**Interfaces:**
- Consumes: `box`, `Kit` (`creatures/draw.ts`); `beadEye`, `blush`, `mix`, `sparkle` (`src/ui/cel.ts`); `RIVER`, `MOMENTS`, `runMoment`, `Fx`, `FX_MS`, `DRAW`, `PROP_OF`, `PROP_ART`, `LIGHTS`, `glow`, `move`, `turn`, `at`, `fade`, `glint`, `rise`, `none` (Task 4).
- Produces: `NEST_ART` (egg in its own `data-part="egg"`), `EGG_ART`, `BABY_DINO`, `PTEROSAUR`, `PUFF` (`creatures/dino.ts`); `PAD_ART`, `lotus(open)`, `PEARL`, `KOI_ART`, `KOI_GLIMPSE`, `SKY_LANTERN` (`creatures/lantern.ts`); `PEARL_MS = 1600` (`momentFx.ts`). `tapArt.ts` exports only `ANIMAL_FACES` after this task.

Each creature is drawn in light cel round its ground point in the 1000 box (outer line 2.2, inner 1.4, one hard lower-right shadow as an explicit path, no clip-path, no filter, no gradient). The code below is the drawing; the acceptance screenshot is the stage cases' `creatures.png` and `river-<world>-*.png`.

- [ ] **Step 1: Write the failing tests**

In `src/ui/worlds/moments.test.ts`:

```ts
  it('the lotus opens over three taps, and the fourth shows the day\'s pearl (the gem rule)', () => {
    for (let n = 1; n <= 3; n++) {
      const o = runMoment('lantern', 'lotus', kid(), DAY, n);
      expect(o.fx).toEqual({ kind: 'bloom', opened: n, pearl: false });
      expect(o.kid).toBeUndefined();
    }
    const pop = runMoment('lantern', 'lotus', kid(), DAY, 4);
    expect(pop.fx).toMatchObject({ kind: 'bloom', pearl: true });
    expect(pop.kid!.finds.gems).toBe(1);
    expect(pop.say).toBe('珍珠！');
    expect(runMoment('lantern', 'lotus', pop.kid!, DAY, 5).kid).toBeUndefined();
  });
  it('the egg in 恐龙谷 remembers the tap; once hatched the baby hops', () => {
    const o = runMoment('dino', 'nest', kid(), DAY, 0);
    expect(o.fx).toEqual({ kind: 'wobble' });
    expect(o.kid!.finds.eggTapped).toBe(true);
    expect(runMoment('dino', 'nest', o.kid!, DAY, 0).kid).toBeUndefined();
    const hatched = runMoment('dino', 'nest', kid({ finds: { ...DEFAULT_FINDS, eggTapped: true, dinoHatched: true } }), DAY, 0);
    expect(hatched).toMatchObject({ fx: { kind: 'hatchling' }, say: '你好，小恐龙！' });
  });
```

In `src/ui/worlds/WorldProps.test.tsx` (import `DEFAULT_FINDS` is already there):

```tsx
  it("the lotus opens over three taps, then shows the day's pearl; yesterday's taps don't count today (review focus 3)", () => {
    const onKid = vi.fn();
    const { rerender } = render(<WorldProps world="lantern" {...props({ onKid })} />);
    for (let i = 1; i <= 2; i++) { tap('荷花'); act(() => { vi.advanceTimersByTime(600); }); }
    expect(document.querySelector('.tap-petals')!.getAttribute('data-opened')).toBe('2');
    rerender(<WorldProps world="lantern" {...props({ onKid, today: '2026-10-07' })} />);
    for (let i = 1; i <= 3; i++) { tap('荷花'); act(() => { vi.advanceTimersByTime(600); }); }
    expect(onKid).not.toHaveBeenCalled();
    tap('荷花');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ gems: 1 }) }));
    expect(document.querySelector('.tap-pearl')).toBeTruthy();
  });
  it('the hatched baby dinosaur waits by the nest in 恐龙谷', () => {
    render(<WorldProps world="dino" {...props({ kid: kid({ finds: { ...DEFAULT_FINDS, eggTapped: true, dinoHatched: true } }) })} />);
    expect(document.querySelector('.world-props .tap-baby-dino')).toBeTruthy();
  });
```

In `src/app/home.test.tsx`, rename `describe('找到的动物 and the gem jar'` to `'找到的动物 and the pearl jar'` and replace its two jar tests:

```tsx
  it("Truffle's room shows his pearls (the gems data) in a jar", async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, finds: { ...DEFAULT_KID.finds, gems: 3 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '地方' }));
    expect(screen.getByText('3 颗珍珠')).toBeTruthy();
    expect(document.querySelectorAll('.gem-jar .pearl')).toHaveLength(3);
  });
  it('a full jar keeps every pearl below the rim', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, finds: { ...DEFAULT_KID.finds, gems: 30 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '地方' }));
    expect(screen.getByText('30 颗珍珠')).toBeTruthy();
    const ys = [...document.querySelectorAll('.gem-jar .pearl')].map((g) => Number(/translate\([-\d.]+ ([-\d.]+)\)/.exec(g.getAttribute('transform')!)![1]));
    expect(ys.length).toBeGreaterThan(0);
    expect(Math.min(...ys) - 7).toBeGreaterThan(-38); // a pearl is about 13 tall at this scale; the rim's lower edge is y -38
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/worlds src/app/home.test.tsx`
Expected: FAIL — no moment for `lantern:lotus`; `3 颗珍珠` not found.

- [ ] **Step 3: Draw the creatures**

`src/ui/worlds/creatures/dino.ts`:

```ts
// 恐龙谷 (spec 2026-10-13 §6): the egg in a fern nest wobbles and hatches after a lesson; a pterosaur glides; the volcano puffs.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const TWIG = '#b8844f';
const TWIG_SH = mix(TWIG, '#7a7398', 0.35);
const FERN = '#5fae7a';
const EGG = '#fbf1d8';
const SPOT = '#9fcf90';

/** The nest of twigs and fern fronds, round its foot: 72 wide (the back half; NEST_FRONT goes over the egg). */
export const NEST = box(1, 0, 0, (k) =>
  k.path('M-30 -14 C-44 -24 -50 -34 -46 -40 C-38 -32 -30 -24 -22 -18 Z M30 -14 C44 -24 50 -34 46 -40 C38 -32 30 -24 22 -18 Z', FERN, '', { inner: true }) +
  k.ell(0, -10, 34, 11, TWIG, { shade: TWIG_SH }));
export const NEST_FRONT = box(1, 0, 0, (k) =>
  k.path('M-36 -10 C-30 2 30 2 36 -10 C30 -4 -30 -4 -36 -10 Z', TWIG, '', { shade: TWIG_SH }) +
  k.stroke('M-26 -6 L-14 -2 M-2 -4 L10 -1 M18 -5 L28 -3'));

/** The egg, standing in the nest (round the nest's foot). */
export const EGG_ART = box(1, 0, 0, (k) =>
  k.ell(0, -30, 15, 19, EGG, { shade: mix(EGG, '#7a7398', 0.2) }) +
  k.ell(-5, -36, 3.4, 3, SPOT, { inner: true, k: 0 }) + k.ell(6, -26, 4, 3.4, SPOT, { inner: true, k: 0 }) + k.ell(4, -42, 2.4, 2, SPOT, { inner: true, k: 0 }));

/** The egg in its nest at rest: its egg in a part of its own so the wobble can stand in for it. */
export const NEST_ART = NEST + `<g data-part="egg">${EGG_ART}</g>` + NEST_FRONT;

const DINO = '#9fcf90';
const DINO_SH = mix(DINO, '#7a7398', 0.32);

/** The baby dinosaur, round its feet: 44 wide, 40 tall, facing right, an eggshell cap on its head. */
export const BABY_DINO = box(1, 0, 0, (k) =>
  k.path('M-12 -8 C-22 -8 -30 -4 -34 -10 C-28 -12 -24 -16 -16 -16 Z', DINO, '', { shade: DINO_SH }) + // tail
  k.ell(-2, -12, 14, 12, DINO, { shade: DINO_SH }) + k.ell(0, -9, 8, 7, '#e9f3c8', { inner: true, k: 0.1 }) +
  k.ell(-8, -1, 5, 3, DINO, { shade: DINO_SH, inner: true }) + k.ell(6, -1, 5, 3, DINO, { shade: DINO_SH, inner: true }) +
  k.ell(8, -28, 13, 11, DINO, { shade: DINO_SH }) +
  k.path('M-2 -34 C0 -46 18 -46 20 -34 L16 -36 L12 -32 L8 -37 L4 -32 L0 -36 Z', EGG, '', { inner: true }) +
  beadEye(12, -28, 2.8) + blush(16, -22, 3, 1.8, k.wi * 0.6) + k.stroke('M15 -21 Q18 -19 20 -22'));

const WING = '#c9a2e8';
const WING_SH = mix(WING, '#7a7398', 0.32);

/** A pterosaur gliding, facing left, round the point under its body: 120 wide. */
export const PTEROSAUR = box(1, 0, 0, (k) =>
  k.path('M-6 -30 C-30 -52 -56 -50 -62 -44 C-44 -40 -26 -32 -12 -22 Z', WING, 'M-62 -44 C-44 -40 -26 -32 -12 -22 L-14 -28 C-28 -36 -44 -42 -62 -44 Z', { shade: WING_SH }) +
  k.path('M6 -30 C30 -56 56 -56 62 -48 C44 -42 26 -32 12 -22 Z', WING, 'M62 -48 C44 -42 26 -32 12 -22 L10 -28 C26 -38 44 -46 62 -48 Z', { shade: WING_SH }) +
  k.ell(0, -24, 14, 8, '#f2b98a', { shade: mix('#f2b98a', '#7a7398', 0.3) }) +
  k.path('M-10 -30 C-14 -40 -24 -42 -28 -36 L-46 -32 L-26 -30 C-20 -24 -14 -24 -10 -26 Z', '#f2b98a', '', { inner: true }) +
  k.path('M-20 -40 L-14 -50 L-12 -40 Z', '#ef7b45', '', { inner: true }) + beadEye(-20, -35, 2.4));

/** The volcano's puff (the painting draws the volcano): three cel smoke balls, round the crater. */
export const PUFF = box(1, 0, 0, (k) =>
  k.ell(-10, -14, 14, 12, '#f1ecf4', { shade: '#d6cde3' }) + k.ell(10, -30, 17, 15, '#f1ecf4', { shade: '#d6cde3' }) + k.ell(-4, -52, 12, 10, '#f1ecf4', { shade: '#d6cde3' }));
```

`src/ui/worlds/creatures/lantern.ts`:

```ts
// 灯笼水乡 (spec 2026-10-13 §6): a lotus bud — three taps, then the fourth opens it to show a pearl; a koi leaps; a sky lantern rises.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

const PAD = '#6fae7a';
const PAD_SH = mix(PAD, '#7a7398', 0.3);
const PINK = '#f7a8c4';
const PINK_SH = mix(PINK, '#7a7398', 0.25);

/** A lily pad on the water, round its centre. */
export const PAD_ART = box(1, 0, 0, (k) => k.path('M0 0 C-34 2 -40 -14 -24 -20 C-10 -24 6 -24 22 -20 C38 -14 32 2 0 0 L4 -10 Z', PAD, 'M0 0 C-34 2 -40 -14 -24 -20 C-30 -10 -18 -4 0 -4 Z', { shade: PAD_SH }));

/** The lotus, round its stem's foot on the pad: `open` petals out of 3 opened (a bud at 0), 30 wide, 46 tall. */
export const lotus = (open: number) => box(1, 0, 0, (k) => {
  const spread = Math.min(3, Math.max(0, open));
  const petal = (deg: number, fill: string) => `<g transform="rotate(${deg} 0 -24)">${k.path('M0 -24 C-10 -34 -8 -50 0 -56 C8 -50 10 -34 0 -24 Z', fill, 'M0 -24 C10 -34 8 -50 0 -56 C4 -46 4 -34 0 -24 Z', { shade: PINK_SH })}</g>`;
  return k.stroke('M0 -10 L0 -24', false) +
    (spread ? petal(-18 * spread, PINK) + petal(18 * spread, PINK) : '') +
    (spread >= 2 ? petal(-34 * (spread - 1), '#fbc6d8') + petal(34 * (spread - 1), '#fbc6d8') : '') +
    petal(0, PINK);
});

/** The pearl in an open lotus. */
export const PEARL = box(1, 0, 0, (k) => k.ell(0, -12, 11, 11, '#fdf8f2', { shade: '#e6dbe8' }) + k.ell(-4, -16, 3, 2.4, '#ffffff', { inner: true, k: 0 }));

const KOI = '#ffffff';
const KOI_RED = '#f26b4a';

/** A koi mid-leap, curved, head up-left, round the water under it: 56 long. */
export const KOI_ART = box(1, 0, 0, (k) => `<g transform="translate(0 -30) rotate(-20)">` +
  k.path('M20 0 L36 -10 L34 10 Z', KOI_RED, '', { inner: true }) +
  k.path('M-26 0 C-18 -14 14 -14 22 0 C14 12 -18 12 -26 0 Z', KOI, 'M22 0 C14 12 -18 12 -26 0 C-10 6 10 6 22 0 Z', { shade: mix(KOI, '#7a7398', 0.2) }) +
  k.flat('M-10 -9 C-4 -4 4 -4 8 -8 C2 -12 -6 -12 -10 -9 Z M6 4 C10 6 14 4 16 1 C12 0 8 2 6 4 Z', KOI_RED) +
  k.path('M-2 6 L4 14 L8 6 Z', KOI_RED, '', { inner: true }) + beadEye(-18, -2, 2.2) + `</g>`);

/** A sky lantern (孔明灯) with a little flame, round its bottom: 34 wide, 46 tall. */
export const SKY_LANTERN = box(1, 0, 0, (k) =>
  k.path('M-14 -2 C-20 -20 -18 -40 0 -46 C18 -40 20 -20 14 -2 Z', '#ffcf7a', 'M0 -46 C18 -40 20 -20 14 -2 L6 -2 C10 -18 10 -34 0 -46 Z', { shade: '#f2a65a' }) +
  k.stroke('M-8 -40 C-12 -26 -10 -12 -8 -2 M8 -40 C12 -26 10 -12 8 -2') +
  k.ell(0, 2, 4, 5, '#ff7a45', { inner: true, k: 0 }));

/** The koi at rest: its back just under the water, and a ring where it will leap. */
export const KOI_GLIMPSE = `<g opacity=".75"><ellipse cx="0" cy="-6" rx="20" ry="6" fill="#ffffff"/><path d="M-12 -9 c4 3 10 3 14 0 M6 -4 c3 1 6 0 8 -2" stroke="#f26b4a" stroke-width="4" stroke-linecap="round" fill="none"/></g><ellipse cx="0" cy="-4" rx="30" ry="8" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
```

- [ ] **Step 4: Put them in their worlds**

`src/ui/worlds/river.ts` — replace the `props:` line under each of these worlds (the boat keeps its anchor; all anchors are final, see "Anchors" above):

```ts
  dino: {
    props: { boat: { x: 720, y: 870, w: 120, h: 90 }, nest: { x: 300, y: 860, w: 90, h: 70 }, pterosaur: { x: 840, y: 525, w: 120, h: 56 }, volcano: { x: 850, y: 320, w: 120, h: 80 } },
  lantern: {
    props: { boat: { x: 640, y: 880, w: 120, h: 90 }, lotus: { x: 840, y: 900, w: 70, h: 70 }, koi: { x: 735, y: 985, w: 70, h: 60 }, skylantern: { x: 870, y: 640, w: 60, h: 70 } },
```

`src/ui/worlds/moments.ts` — add the kinds to `Fx`, the worlds' moments after the boat, and their cases inside `runMoment`'s `switch`:

```ts
  | { kind: 'wobble' } | { kind: 'hatchling' } | { kind: 'soar' } | { kind: 'puff' } | { kind: 'bloom'; opened: number; pearl: boolean } | { kind: 'leap' } | { kind: 'rise' }
```

```ts
  dino: [BOAT, { prop: 'nest', label: '恐龙蛋', auto: false, tap: true }, { prop: 'pterosaur', label: '翼龙', auto: true, tap: true }, { prop: 'volcano', label: '火山', auto: true, tap: true }],
  lantern: [BOAT, { prop: 'lotus', label: '荷花', auto: false, tap: true }, { prop: 'koi', label: '锦鲤', auto: true, tap: true }, { prop: 'skylantern', label: '孔明灯', auto: true, tap: true }],
```

and the finds import becomes `import { findAnimal, tapEgg, tapGem } from '../../fun/finds';` (the lotus uses `tapGem`'s rule unchanged):

```ts
    case 'dino:nest': {
      if (f.dinoHatched) return { fx: { kind: 'hatchling' }, react: 'excited', say: '你好，小恐龙！' };
      const next = tapEgg(f);
      return { fx: { kind: 'wobble' }, react: 'watch', ...(next !== f ? { kid: { ...kid, finds: next } } : {}) };
    }
    case 'dino:pterosaur': return { fx: { kind: 'soar' }, react: 'watch', say: '翼龙！' };
    case 'dino:volcano': return { fx: { kind: 'puff' }, react: 'flinch', say: '哇！' };
    case 'lantern:lotus': {
      const r = tapGem(f, today, lotusTaps);
      return { fx: { kind: 'bloom', opened: r.cracks, pearl: r.gem }, react: r.gem ? 'excited' : 'watch', ...(r.gem ? { kid: { ...kid, finds: r.finds }, say: '珍珠！' } : {}) };
    }
    case 'lantern:koi': return { fx: { kind: 'leap' }, react: 'pounce', say: '鱼跳起来了！' };
    case 'lantern:skylantern': return { fx: { kind: 'rise' }, react: 'watch', say: '飞走了！' };
```

`src/ui/worlds/momentFx.ts` — import the art, then add each kind's length, drawing and prop:

```ts
import { BABY_DINO, EGG_ART, PTEROSAUR, PUFF } from './creatures/dino';
import { KOI_ART, PEARL, SKY_LANTERN, lotus } from './creatures/lantern';
```

```ts
// FX_MS
  wobble: 800, hatchling: 900, soar: 2800, puff: 2000, bloom: 500, leap: 1400, rise: 3200,
// PROP_OF
  wobble: 'nest', hatchling: 'nest', soar: 'pterosaur', puff: 'volcano', bloom: 'lotus', leap: 'koi', rise: 'skylantern',
```

```ts
// DRAW
  wobble: (_fx, s, still) => ({ svg: at(s.x, s.y, `<g class="tap-egg">${EGG_ART}${still ? '' : turn('0 0 -10;-14 0 -10;12 0 -10;-8 0 -10;6 0 -10;0 0 -10', FX_MS.wobble)}</g>`), hide: '[data-prop="nest"] [data-part="egg"]' }),
  hatchling: (_fx, s, still) => ({ svg: at(s.x + 12, s.y - 10, `<g class="tap-baby-dino is-hopping">${BABY_DINO}${still ? '' : move('0 0;0 -16;0 0;0 -8;0 0', FX_MS.hatchling)}</g>`), hide: null }), // the props layer leaves out its resting baby while this plays
  soar: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, PTEROSAUR + glint(0, -60, 8, 0, 900)), hide: null };
    return { svg: at(s.x, s.y, `<g>${PTEROSAUR}<animateMotion dur="${FX_MS.soar}ms" path="M0 0 C-80 -40 -200 -10 -240 30 C-180 60 -60 40 0 0" fill="freeze"/></g>`, 'tap-soar'), hide: '[data-prop="pterosaur"]' };
  },
  puff: (_fx, s, still) => {
    const glow = `<ellipse cx="0" cy="-6" rx="34" ry="10" fill="#ff8a4a" opacity="0">${fade(FX_MS.puff)}</ellipse>`;
    const smoke = `<g opacity="0">${PUFF}${still ? '' : move('0 0;6 -60', FX_MS.puff)}${fade(FX_MS.puff)}</g>`;
    return { svg: at(s.x, s.y - 30, glow + smoke, 'tap-puff'), hide: null };
  },
  bloom: (fx, s, still) => {
    const opened = fx.kind === 'bloom' ? fx.opened : 0;
    const pearl = fx.kind === 'bloom' && fx.pearl ? `<g class="tap-pearl" transform="translate(0 -28)">${PEARL}${rise(20, PEARL_MS, still)}</g>` : '';
    return { svg: at(s.x, s.y, `<g class="tap-petals" data-opened="${opened}">${lotus(opened)}</g>` + pearl), hide: '[data-prop="lotus"] [data-part="bud"]' };
  },
  leap: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, glint(0, -30, 8, 0, 900)), hide: null };
    const arc = `<g>${KOI_ART}<animateMotion dur="${FX_MS.leap}ms" path="M20 10 C10 -70 -40 -70 -50 10" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="${FX_MS.leap}ms" fill="freeze"/></g>`;
    const splash = `<ellipse cx="-50" cy="-2" rx="10" ry="4" fill="none" stroke="#fff" stroke-width="2.4" opacity="0"><animate attributeName="rx" values="10;40" begin="${FX_MS.leap * 0.85}ms" dur="500ms" fill="freeze"/><animate attributeName="opacity" values="0.9;0" begin="${FX_MS.leap * 0.85}ms" dur="500ms" fill="freeze"/></ellipse>`;
    return { svg: at(s.x, s.y, arc + splash, 'tap-leap'), hide: null };
  },
  rise: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, SKY_LANTERN + glint(0, -50, 7, 0, 900)), hide: null };
    const up = `<g>${SKY_LANTERN}${move('0 0;-30 -240;-60 -480', FX_MS.rise)}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="${FX_MS.rise}ms" fill="freeze"/></g>`;
    const back = `<g opacity="0">${SKY_LANTERN}<animate attributeName="opacity" values="0;1" begin="${FX_MS.rise}ms" dur="300ms" fill="freeze"/></g>`;
    return { svg: at(s.x, s.y, up + back, 'tap-rise'), hide: '[data-prop="skylantern"]' };
  },
```

`src/ui/worlds/props.ts` — import the art and set the worlds' props at rest:

```ts
import { NEST_ART, PTEROSAUR } from './creatures/dino';
import { KOI_GLIMPSE, PAD_ART, SKY_LANTERN, lotus } from './creatures/lantern';

  dino: { boat: RIPPLE + BOAT, nest: NEST_ART, pterosaur: PTEROSAUR, volcano: '' }, // the painting draws the volcano: its prop is only the tap and the puff
  lantern: { boat: RIPPLE + BOAT, lotus: PAD_ART + `<g data-part="bud">${lotus(0)}</g>`, koi: KOI_GLIMPSE, skylantern: SKY_LANTERN },
```

`src/ui/worlds/evening.ts` — the two worlds' lights:

```ts
  dino: (w) => `<g data-part="lava">${glow(`${w}-lava`, 855, 300, 110, '#ff6a3a', 0.75)}${glow(`${w}-lava2`, 855, 360, 150, '#ffb86b', 0.35)}<path d="M846 298 q-6 20 2 40 M864 300 q8 18 0 36" stroke="#ff8a4a" stroke-width="4" stroke-linecap="round" fill="none"/></g>`,
  lantern: (w) => glows(w, 'lantern', [[40, 530, 50], [125, 515, 46], [310, 515, 36], [345, 512, 32], [380, 500, 30], [660, 500, 30], [760, 515, 40], [830, 520, 44], [885, 520, 44], [820, 390, 36], [870, 380, 36]]),
```

`scripts/stage-cases/creatures.ts` — import the art and add to `CREATURES`:

```ts
import { BABY_DINO, NEST_ART, PTEROSAUR, PUFF } from '../../src/ui/worlds/creatures/dino';
import { KOI_ART, KOI_GLIMPSE, PAD_ART, PEARL, SKY_LANTERN, lotus } from '../../src/ui/worlds/creatures/lantern';

  ['egg nest', NEST_ART], ['baby dino', BABY_DINO], ['pterosaur', PTEROSAUR], ['volcano puff', PUFF], ['lotus bud', PAD_ART + lotus(0)], ['lotus 2', PAD_ART + lotus(2)], ['lotus + pearl', PAD_ART + lotus(3) + `<g transform="translate(0 -28)">${PEARL}</g>`], ['koi at rest', KOI_GLIMPSE], ['koi leaping', KOI_ART], ['sky lantern', SKY_LANTERN],
```


`src/ui/worlds/momentFx.ts` — after `FX_MS`:

```ts
/** The day's pearl stays up even if he keeps tapping. */
export const PEARL_MS = 1600;
```

`src/ui/worlds/WorldProps.tsx` — the pearl stays up longer and the opened petals stay on the lotus for the visit; the hatched baby dinosaur waits by the nest:

```tsx
import { FX_MS, PEARL_MS, momentFx } from './momentFx';
import { BABY_DINO } from './creatures/dino';
// in play():
    const ms = o.fx.kind === 'bloom' && o.fx.pearl ? PEARL_MS : FX_MS[o.fx.kind];
    later(ms, () => {
      busy.current = false;
      show();
      if (o.fx.kind !== 'bloom') setFx(null); // the opened petals stay on the lotus for this visit
    });
// before the return:
  const nest = spots.nest;
  const baby = world === 'dino' && kid.finds.dinoHatched && fx?.kind !== 'hatchling' && nest ? `<g class="tap-baby-dino" transform="translate(${nest.x + 12} ${nest.y - 10})">${BABY_DINO}</g>` : '';
// first child of <svg class="world-props">:
        {baby && <g aria-hidden="true" dangerouslySetInnerHTML={{ __html: baby }} />}
```

`src/app/Wardrobe.tsx` — the jar holds pearls (the data stays `gems`; the word is 珍珠):

```tsx
import { PEARL } from '../ui/worlds/creatures/lantern';
            <div class="gem-jar" aria-label={`${k.finds.gems} 颗珍珠`}>
                  <g key={i} class="pearl" transform={`translate(${-24 + (i % 4) * 16} ${52 - Math.floor(i / 4) * 14}) scale(0.62)`} dangerouslySetInnerHTML={{ __html: PEARL }} />
              <Label zh={`${k.finds.gems} 颗珍珠`} />
```

`src/ui/worlds/tapArt.ts` — delete `GEM` and `BABY_DINO` (and their comment): the pearl and the baby dinosaur are in `creatures/`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/worlds src/app/home.test.tsx`
Expected: PASS.

- [ ] **Step 6: Look at them in WebKit**

Check port 4174 is free, run `npx tsx scripts/stage-cases.ts` (expected `stage cases: ok`, including each new moment's p95 per-frame work ≤ 8 ms), and look at `fit-shots/stage-cases/creatures.png` and `river-dino-*.png`, `river-lantern-*.png`. Acceptance: each creature reads at a glance (a child can name it), sits on the painting where the anchor table says (on water, ground, branch or sky as described), carries the soft-violet line with one pale lower-right shadow like the mockup's otter, and its moment plays in place and ends at rest.

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): 恐龙谷 and 灯笼水乡 in light cel: egg, hatchling, pterosaur, volcano; lotus pearl (珍珠), koi, sky lantern; lava and lanterns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 海湾 and 银河: the X and its star, a crab, a parrot; the magpie bridge, a shooting star; the lighthouse beam and twinkling stars

**Files:**
- Create: `src/ui/worlds/creatures/cove.ts`, `src/ui/worlds/creatures/milkyway.ts`
- Modify: `src/ui/worlds/{river,moments,momentFx,props,evening}.ts`, `scripts/stage-cases/creatures.ts`, `src/styles.css`
- Test: `src/ui/worlds/{moments.test.ts,WorldProps.test.tsx,river.test.ts}`, `src/styles.test.ts`

**Interfaces:**
- Consumes: `box`, `Kit` (`creatures/draw.ts`); `beadEye`, `blush`, `mix`, `sparkle` (`src/ui/cel.ts`); `RIVER`, `MOMENTS`, `runMoment`, `Fx`, `FX_MS`, `DRAW`, `PROP_OF`, `PROP_ART`, `LIGHTS`, `glow`, `move`, `turn`, `at`, `fade`, `glint`, `rise`, `none` (Task 4).
- Produces: `X_ART`, `STAR`, `CRAB_ART`, `PARROT_BODY`, `PARROT_WING`, `PARROT` (`creatures/cove.ts`); `magpie(up)`, `MAGPIE_PAIR`, `SHOOTING`, `TWINKLE` (`creatures/milkyway.ts`); the `.world-anim` CSS classes.

Each creature is drawn in light cel round its ground point in the 1000 box (outer line 2.2, inner 1.4, one hard lower-right shadow as an explicit path, no clip-path, no filter, no gradient). The code below is the drawing; the acceptance screenshot is the stage cases' `creatures.png` and `river-<world>-*.png`.

- [ ] **Step 1: Write the failing tests**

In `src/ui/worlds/moments.test.ts` (the whole set now: every world has the boat and its creatures; the finds live only at their new places):

```ts
  it('every world has the boat and 1–3 creatures or things, each with a moment', () => {
    for (const w of WORLDS) {
      const m = MOMENTS[w.id];
      expect(m[0]!.prop, w.id).toBe('boat');
      expect(m.length, w.id).toBeGreaterThanOrEqual(3);
      expect(m.length, w.id).toBeLessThanOrEqual(4);
      for (const x of m) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('a moment that starts by itself never gives a find, and every world has one', () => {
    for (const w of WORLDS) {
      expect(MOMENTS[w.id].some((m) => m.auto), w.id).toBe(true);
      for (const x of MOMENTS[w.id].filter((m) => m.auto)) for (let taps = 1; taps <= 5; taps++) expect(runMoment(w.id, x.prop, kid(), DAY, taps).kid, `${w.id}:${x.prop}`).toBeUndefined();
    }
  });
  it('a prop Home covers on some screens only plays by itself; every world keeps one to tap', () => {
    for (const w of WORLDS) {
      for (const m of MOMENTS[w.id].filter((x) => !x.tap)) expect(m.auto, `${w.id}:${m.prop}`).toBe(true);
      expect(MOMENTS[w.id].some((m) => m.tap), w.id).toBe(true);
    }
  });
  it('the X in 海湾 gives one bonus star a day, then Truffle just digs', () => {
    const o = runMoment('cove', 'x', kid({ bonusStars: 2 }), DAY, 0);
    expect(o.fx).toEqual({ kind: 'dig', star: true });
    expect(o.kid).toMatchObject({ bonusStars: 3, finds: { lastDigDate: DAY } });
    const again = runMoment('cove', 'x', o.kid!, DAY, 0);
    expect(again.kid).toBeUndefined();
    expect(again.say).toBe('挖呀挖！');
  });
  it('the finds live only where the spec puts them', () => {
    const hosts = WORLDS.flatMap((w) => MOMENTS[w.id].filter((m) => !m.auto).map((m) => `${w.id}:${m.prop}`)).filter((h) => !h.endsWith(':boat'));
    expect(hosts).toEqual(['dino:nest', 'lantern:lotus', 'cove:x']);
  });
```

In `src/ui/worlds/WorldProps.test.tsx`:

```tsx
  it('a moment that starts by itself never speaks out loud or makes a sound; the parrot\'s hello is a bubble line', () => {
    vi.mocked(speak).mockClear();
    vi.mocked(playSfx).mockClear();
    const onSay = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // the last of 海湾's: the parrot
    render(<WorldProps world="cove" {...props({ onSay, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onSay).toHaveBeenCalledWith('你好！');
    expect(speak).not.toHaveBeenCalled();
    expect(playSfx).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });
  it('a tap during the dig is ignored (review focus 1)', () => {
    const onKid = vi.fn();
    render(<WorldProps world="cove" {...props({ onKid })} />);
    tap('宝藏');
    tap('宝藏');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
```

In `src/ui/worlds/river.test.ts` (now that every world has its creatures; import `CROPS, cropFor, inCrop` from `./river`):

```ts
  it('every world keeps a prop he can tap in each crop', () => {
    for (const w of WORLDS) for (const [crop, aspect] of Object.entries(CROPS)) {
      const c = cropFor(aspect);
      const tappable = MOMENTS[w.id].filter((m) => m.tap && inCrop(RIVER[w.id].props[m.prop]!, c));
      expect(tappable.length, `${w.id} ${crop}`).toBeGreaterThan(0);
    }
  });
```

In `src/styles.test.ts` (Review Focus 4), inside `describe('adaptive layouts (spec §18)'`:

```ts
  it('evening lights move only on Home, never behind a lesson, and never with reduced motion (spec 2026-10-13 §6)', () => {
    expect(css).toMatch(/\.home \.world-anim--pulse \{ animation:/);
    expect(css).not.toMatch(/^\.world-anim--\w+ \{[^}]*animation:/m);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.home \.world-anim \{ animation: none; \} \}/);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/worlds src/styles.test.ts`
Expected: FAIL — no moment for `cove:x`; no `.home .world-anim--pulse` rule.

- [ ] **Step 3: Draw the creatures**

`src/ui/worlds/creatures/cove.ts`:

```ts
// 海湾 (spec 2026-10-13 §6): an X in the sand by the shipwreck — dig it to find a star; a crab scuttles; a parrot on a palm.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

/** The X, painted on the sand, round its centre. */
export const X_ART = box(1, 0, 0, (k) => k.rope('M-14 -14 L14 6 M14 -14 L-14 6', '#e0574a', 6));

const CRAB = '#f07a5a';
const CRAB_SH = mix(CRAB, '#7a7398', 0.3);

/** A crab, round its feet: 44 wide, 28 tall. */
export const CRAB_ART = box(1, 0, 0, (k) =>
  k.stroke('M-12 -6 L-22 0 M-10 -4 L-18 2 M12 -6 L22 0 M10 -4 L18 2', false) +
  k.path('M-20 -18 C-30 -26 -30 -34 -22 -36 C-24 -30 -18 -28 -16 -22 Z', CRAB, '', { inner: true }) +
  k.path('M20 -18 C30 -26 30 -34 22 -36 C24 -30 18 -28 16 -22 Z', CRAB, '', { inner: true }) +
  k.ell(0, -12, 18, 11, CRAB, { shade: CRAB_SH }) +
  k.stroke('M-5 -20 L-6 -27 M5 -20 L6 -27') + beadEye(-6, -29, 2.6) + beadEye(6, -29, 2.6) + k.stroke('M-4 -10 Q0 -7 4 -10'));

const RED = '#ef5d52';
const RED_SH = mix(RED, '#7a7398', 0.32);

/** A parrot perched, facing left, round its feet: 34 wide, 56 tall (its wing in a part of its own, for the flap). */
export const PARROT_BODY = box(1, 0, 0, (k) =>
  k.path('M4 -10 L10 14 L2 6 L-2 16 L-2 -8 Z', '#4fa3e0', '', { inner: true }) + // tail
  k.path('M0 0 C-14 -2 -16 -22 -8 -34 C-2 -44 12 -42 14 -30 C16 -16 12 -2 0 0 Z', RED, 'M14 -30 C16 -16 12 -2 0 0 C8 -8 10 -20 8 -32 Z', { shade: RED_SH }) +
  k.path('M-8 -36 C-16 -36 -18 -26 -12 -22 C-12 -28 -10 -32 -6 -32 Z', '#ffd166', '', { inner: true }) +
  k.ell(-2, -34, 4.6, 4.6, '#fff', { inner: true, k: 0 }) + beadEye(-2, -34, 2.6) + k.stroke('M-4 0 L-4 5 M2 0 L2 5'));
export const PARROT_WING = box(1, 0, 0, (k) => k.path('M2 -26 C12 -24 14 -12 8 -4 C2 -8 0 -16 2 -26 Z', '#4fa3e0', '', { shade: '#3a7fc0', inner: true }));
export const PARROT = PARROT_BODY + `<g data-part="wing">${PARROT_WING}</g>`;

/** The star he digs up. */
export const STAR = box(1, 0, 0, (k) =>
  k.path('M0 -16 L4.6 -6 L15 -5 L7 2 L9.6 13 L0 7 L-9.6 13 L-7 2 L-15 -5 L-4.6 -6 Z', '#ffd45a', 'M0 7 L9.6 13 L7 2 L15 -5 L4.6 -6 L4 -2 L6 3 L4 6 Z', { shade: '#e8ad3a' }));
```

`src/ui/worlds/creatures/milkyway.ts`:

```ts
// 银河 (spec 2026-10-13 §6): magpies fly in and form a bridge over the silver river (鹊桥); a shooting star.
import { beadEye, mix, sparkle } from '../../cel';
import { box } from './draw';

const INKY = '#3b3545';
const INKY_SH = mix(INKY, '#7a7398', 0.25);
const WING = '#4f7fc9';

/** One magpie in flight, facing right, round its middle: 40 long. `up` raises its wings. */
export const magpie = (up = true) => box(1, 0, 0, (k) =>
  k.path('M-16 0 L-30 -4 L-28 4 Z', INKY, '', { inner: true }) +
  (up ? k.path('M-4 -2 C-8 -16 0 -22 6 -18 C4 -12 4 -6 2 -2 Z', WING, '', { shade: mix(WING, '#7a7398', 0.3), inner: true }) : '') +
  k.path('M-16 0 C-14 -8 6 -10 12 -4 C16 0 8 6 -4 6 C-10 6 -16 4 -16 0 Z', INKY, '', { shade: INKY_SH }) +
  k.flat('M-8 2 C-2 4 4 4 8 0 C2 0 -4 0 -8 2 Z', '#f6f0e4') +
  k.ell(12, -6, 6, 5.4, INKY, { shade: INKY_SH, inner: true }) + k.path('M17 -7 L23 -5 L17 -4 Z', '#2a2630', '', { inner: true }) +
  beadEye(13, -7, 1.6) +
  (up ? '' : k.path('M-4 -2 C-6 8 2 14 8 10 C4 6 4 2 2 -2 Z', WING, '', { inner: true })));

/** One magpie perched, facing right, round its feet: its body tipped up, its tail down behind. */
const perched = box(1, 0, 0, (k) => k.stroke('M-2 -6 L-3 0 M3 -6 L3 0') + `<g transform="translate(0 -14) rotate(-28)">${magpie(false)}</g>`);
/** A pair of magpies resting on the rock ledge (they fly into the bridge in their moment), facing each other. */
export const MAGPIE_PAIR = `<g transform="translate(-20 0)">${perched}</g><g transform="translate(20 0) scale(-1 1)">${perched}</g>`;

/** The shooting star at rest: one bright twinkle in the sky. */
export const TWINKLE = sparkle(0, -24, 13, '#fff6c4', 1.4) + sparkle(18, -40, 5, '#ffffff', 1);
/** The shooting star itself: a head and its long tail behind it to the upper right. */
export const SHOOTING = box(1, 0, 0, (k) =>
  `<path d="M0 0 L120 -60" stroke="#fff6c4" stroke-width="6" stroke-linecap="round" opacity=".45"/><path d="M0 0 L70 -35" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".8"/>` + sparkle(0, 0, 12, '#fff6c4', k.wi));
```

- [ ] **Step 4: Put them in their worlds**

`src/ui/worlds/river.ts` — replace the `props:` line under each of these worlds (the boat keeps its anchor; all anchors are final, see "Anchors" above):

```ts
  cove: {
    props: { boat: { x: 680, y: 900, w: 120, h: 90 }, x: { x: 300, y: 870, w: 70, h: 56 }, crab: { x: 390, y: 950, w: 60, h: 50 }, parrot: { x: 115, y: 545, w: 56, h: 66 } },
  milkyway: {
    props: { boat: { x: 640, y: 900, w: 120, h: 90 }, magpies: { x: 190, y: 770, w: 120, h: 70 }, shootingstar: { x: 880, y: 525, w: 64, h: 52 } },
```

`src/ui/worlds/moments.ts` — add the kinds to `Fx`, the worlds' moments after the boat, and their cases inside `runMoment`'s `switch`:

```ts
  | { kind: 'dig'; star: boolean } | { kind: 'scuttle' } | { kind: 'flap' } | { kind: 'bridge' } | { kind: 'streak' }
```

```ts
  cove: [BOAT, { prop: 'x', label: '宝藏', auto: false, tap: true }, { prop: 'crab', label: '螃蟹', auto: true, tap: true }, { prop: 'parrot', label: '鹦鹉', auto: true, tap: true }],
  milkyway: [BOAT, { prop: 'magpies', label: '喜鹊', auto: true, tap: true }, { prop: 'shootingstar', label: '流星', auto: true, tap: true }],
```

and the finds import becomes `import { dig, findAnimal, tapEgg, tapGem } from '../../fun/finds';`:

```ts
    case 'cove:x': {
      const r = dig(f, today);
      return { fx: { kind: 'dig', star: r.star }, react: 'excited', ...(r.star ? { kid: { ...kid, finds: r.finds, bonusStars: kid.bonusStars + 1 }, say: '找到星星了！' } : { say: '挖呀挖！' }) };
    }
    case 'cove:crab': return { fx: { kind: 'scuttle' }, react: 'pounce', say: '横着走！' };
    case 'cove:parrot': return { fx: { kind: 'flap' }, react: 'watch', say: '你好！' }; // it may start by itself, which never speaks: Truffle says hello back
    case 'milkyway:magpies': return { fx: { kind: 'bridge' }, react: 'proud', say: '鹊桥！' };
    case 'milkyway:shootingstar': return { fx: { kind: 'streak' }, react: 'excited', say: '许个愿！' };
```

`src/ui/worlds/momentFx.ts` — import the art, then add each kind's length, drawing and prop:

```ts
import { CRAB_ART, PARROT_BODY, PARROT_WING, STAR, X_ART } from './creatures/cove';
import { magpie, SHOOTING } from './creatures/milkyway';
```

```ts
// FX_MS
  dig: 1400, scuttle: 1800, flap: 1400, bridge: 3600, streak: 1400,
// PROP_OF
  dig: 'x', scuttle: 'crab', flap: 'parrot', bridge: 'magpies', streak: 'shootingstar',
```

```ts
// DRAW
  dig: (fx, s, still) => {
    const puffs = [[-14, -2, 5], [12, -6, 4.5], [-2, -10, 4]].map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}" fill="#f1c9a8" stroke="#706889" stroke-width="1.2">${still ? '' : move(`0 0;${(dx as number) * 0.6} -12;${(dx as number) * 0.8} 0`, FX_MS.dig)}${fade(FX_MS.dig)}</circle>`).join('');
    const prize = fx.kind === 'dig' && fx.star ? `<g class="tap-star" transform="translate(0 -30)">${STAR}${rise(24, FX_MS.dig, still)}</g>` : '';
    return { svg: at(s.x, s.y, X_ART + puffs + prize, 'tap-dig'), hide: null };
  },
  scuttle: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, CRAB_ART), hide: '[data-prop="crab"]' };
    return { svg: at(s.x, s.y, `<g>${CRAB_ART}${move('0 0;50 0;50 0;-30 0;0 0', FX_MS.scuttle, '0;0.3;0.45;0.8;1')}</g>`, 'tap-scuttle'), hide: '[data-prop="crab"]' };
  },
  flap: (_fx, s, still) => {
    const wing = `<g>${PARROT_WING}${still ? '' : `<animateTransform attributeName="transform" type="rotate" values="0 4 -26;-34 4 -26;0 4 -26" dur="280ms" repeatCount="5"/>`}</g>`;
    return { svg: at(s.x, s.y, `<g>${PARROT_BODY}${wing}${still ? '' : move('0 0;0 -5;0 0', 700) }</g>`, 'tap-parrot'), hide: '[data-prop="parrot"]' };
  },
  bridge: (_fx, s, still) => {
    // a flock flies in over the silver river and holds an arch for a moment: the magpie bridge (鹊桥)
    const n = 7;
    const birds = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const x = 160 + t * 380;
      const y = -120 - Math.sin(t * Math.PI) * 70;
      const from = `${-200 - i * 30} ${-260 + i * 10}`;
      return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})" opacity="0"><g>${magpie(i % 2 === 0)}</g>${still ? '' : move(`${from};0 0;0 0`, FX_MS.bridge, '0;0.35;1', i * 60)}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="${FX_MS.bridge}ms" begin="${i * 60}ms" fill="freeze"/></g>`;
    }).join('');
    return { svg: at(s.x, s.y, birds, 'tap-bridge'), hide: null };
  },
  streak: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, glint(0, -24, 14, 0, 900)), hide: null };
    return { svg: at(s.x, s.y, `<g opacity="0">${SHOOTING}${move('60 -30;-260 130', FX_MS.streak)}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.7;1" dur="${FX_MS.streak}ms" fill="freeze"/></g>`, 'tap-streak'), hide: null };
  },
```

`src/ui/worlds/props.ts` — import the art and set the worlds' props at rest:

```ts
import { CRAB_ART, PARROT, X_ART } from './creatures/cove';
import { MAGPIE_PAIR, TWINKLE } from './creatures/milkyway';

  cove: { boat: RIPPLE + BOAT, x: X_ART, crab: CRAB_ART, parrot: PARROT },
  milkyway: { boat: RIPPLE + BOAT, magpies: MAGPIE_PAIR, shootingstar: TWINKLE },
```

`src/ui/worlds/evening.ts` — add the twinkling stars helper above `LIGHTS`:

```ts
const r1 = (n: number) => +n.toFixed(1);
/** Stars that twinkle (the night sky of 银河). */
const twinkles = (pts: [number, number, number][]) => pts.map(([x, y, r], i) =>
  `<path data-part="star" class="world-anim world-anim--twinkle" style="animation-delay:${(i * 0.53).toFixed(2)}s" d="M${x} ${r1(y - r)} Q${r1(x + r * 0.25)} ${r1(y - r * 0.25)} ${r1(x + r)} ${y} Q${r1(x + r * 0.25)} ${r1(y + r * 0.25)} ${x} ${r1(y + r)} Q${r1(x - r * 0.25)} ${r1(y + r * 0.25)} ${r1(x - r)} ${y} Q${r1(x - r * 0.25)} ${r1(y - r * 0.25)} ${x} ${r1(y - r)}Z" fill="#fffbe0"/>`).join('');
```

then the two worlds' lights:

```ts
  cove: (w) => `<g data-part="beam">${glow(`${w}-lamp`, 845, 285, 70, '#fff1b8', 0.9)}<path class="world-anim world-anim--sweep" d="M845 285 L340 200 L340 330 Z" fill="#fff1b8" opacity=".28"/></g>`,
  milkyway: () => twinkles([[80, 70, 12], [910, 110, 13], [510, 260, 10], [650, 650, 9], [920, 690, 9], [610, 845, 10], [970, 965, 11], [312, 640, 10], [200, 140, 7]]),
```

`scripts/stage-cases/creatures.ts` — import the art and add to `CREATURES`:

```ts
import { CRAB_ART, PARROT, STAR, X_ART } from '../../src/ui/worlds/creatures/cove';
import { MAGPIE_PAIR, SHOOTING, TWINKLE, magpie } from '../../src/ui/worlds/creatures/milkyway';

  ['X', X_ART], ['star', `<g transform="translate(0 -30)">${STAR}</g>`], ['crab', CRAB_ART], ['parrot', PARROT], ['magpies resting', MAGPIE_PAIR], ['magpie flying', `<g transform="translate(0 -40)">${magpie()}</g>`], ['shooting star', `<g transform="translate(-30 -10)">${SHOOTING}</g>`], ['twinkle', TWINKLE],
```


`src/styles.css` — append (the fireflies, stars and beam move only on Home; behind a lesson the world stays still, and never with reduced motion):

```css
/* ===== One River: evening lights that move (spec 2026-10-13 §6) — on Home only: behind a lesson the world stays still ===== */
.world-anim { transform-box: view-box; }
.home .world-anim--pulse { animation: world-pulse 2.6s ease-in-out infinite; }
.home .world-anim--twinkle { animation: world-pulse 3.2s ease-in-out infinite; }
.home .world-anim--sweep { transform-origin: 845px 285px; animation: world-sweep 6s ease-in-out infinite alternate; }
@keyframes world-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes world-sweep { from { transform: rotate(-12deg); } to { transform: rotate(14deg); } }
@media (prefers-reduced-motion: reduce) { .home .world-anim { animation: none; } }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/worlds src/styles.test.ts`
Expected: PASS.

- [ ] **Step 6: Look at them in WebKit**

Check port 4174 is free, run `npx tsx scripts/stage-cases.ts` (expected `stage cases: ok`, including each new moment's p95 per-frame work ≤ 8 ms), and look at `fit-shots/stage-cases/creatures.png` and `river-cove-*.png`, `river-milkyway-*.png`. Acceptance: each creature reads at a glance (a child can name it), sits on the painting where the anchor table says (on water, ground, branch or sky as described), carries the soft-violet line with one pale lower-right shadow like the mockup's otter, and its moment plays in place and ends at rest.

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "feat(worlds): 海湾 and 银河 in light cel: dig star, crab, parrot; magpie bridge, shooting star; lighthouse beam and stars

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Truffle's body in light cel: flat fills, explicit shadows, the soft-violet line

**Files:**
- Rewrite: `src/ui/truffle/parts.ts`
- Modify: `src/ui/truffle/paint.ts` (Truffle's gradients go; the story keeps `SWATCH` and `cleanId`), `src/ui/truffle/Truffle.tsx`
- Delete: `src/ui/worlds/kit/palette.ts`
- Test: `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Consumes: `LINE`, `LW`, `LWI`, `mix`, `SHADOW` (Task 3).
- Produces: `CEL = { fur, furSh, furHi, furMark, crown, chest, chestSh, pink, pinkSh, nose }`, `SH` (each part's baked shadow path), and the same part exports as before: `TORSO`, `PAW_L`, `PAW_R`, `BODY`, `TAIL`, `EAR_L`, `EAR_R`, `EAR_IN_L`, `EAR_IN_R`, `HEAD_SHAPE`, `TruffleMood`, `TRUFFLE_MOODS` (the unused `HEAD`, `HEAD_EARLESS` and `FACES` go). No part references a gradient any more, so Truffle renders no `<defs>`.

The shadows follow mockup row C: each part's shadow is the part minus itself moved toward the light (the mockup's moves), which the mockup drew with a clip-path; here each one is baked once into an explicit polygon (simplified to 0.3 units, under the 2.8 outline), so WebKit never repaints a clipped shape. The band under his head is the body ∩ an ellipse (160, 194, 70, 15).

- [ ] **Step 1: Write the failing tests** — in `src/ui/truffle/Truffle.test.tsx`, import `CEL` from `./parts`, change the lid test's expectation and replace the gradient-id test:

```tsx
      expect(container.querySelector('[data-part="lid-top-l"]')!.getAttribute('fill'), c.id).toBe(CEL.fur); // his flat fur (spec 2026-10-13 §7)

  it('his body is flat light cel: no gradient, and each part carries its own explicit shadow path', () => {
    const { container } = render(<Truffle />);
    expect(svg(container).outerHTML).not.toMatch(/Gradient|-tf-/); // (the eyes' clip-paths go in Task 10)
    for (const part of [TORSO, TAIL, EAR_L, HEAD_SHAPE]) expect(part).toContain(`fill="${CEL.furSh}"`);
    expect(PAW_L).toContain(`fill="${CEL.chestSh}"`);
    for (const part of [TORSO, TAIL, EAR_L, EAR_R, HEAD_SHAPE]) expect(part).toContain('stroke="#706889"');
  });
```

(Delete "two Truffles never share a gradient id…" and "with an ear-hiding hood and a costume tail, every url(#…) still resolves": there are no gradients left to share.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/Truffle.test.tsx` → FAIL (`CEL` is not exported; the lid fill is a gradient url).

- [ ] **Step 3: Implement** — `src/ui/truffle/parts.ts` (replace the file; the shadow polygons are the baked output and must be copied exactly):

```ts
// Truffle 松露 — geometry from docs/superpowers/specs/assets/2026-10-02-truffle-reference.html (approved 2026-10-02), painted in light
// cel (spec 2026-10-13 §7, mockup row C): a soft-violet line, flat fills, and one pale hard shadow on the lower right of each part,
// each shadow its own explicit path (no clip-paths, no gradients). Coordinates share the viewBox "30 20 260 270".
import { LINE, LW, LWI, mix, SHADOW } from '../cel';

export type TruffleMood = 'sulk' | 'neutral' | 'pleased' | 'side' | 'content' | 'wow' | 'cheer' | 'sleepy';
export const TRUFFLE_MOODS: TruffleMood[] = ["sulk", "neutral", "pleased", "side", "content", "wow", "cheer", "sleepy"];

/** His colours (row C): flat fur, chest and paws, pink ear insides, and the one shadow tone of each. */
export const CEL = {
  fur: '#a9a4ab', furSh: mix('#a9a4ab', SHADOW, 0.4), furHi: '#c7c3cc', furMark: mix('#a9a4ab', '#4e4858', 0.32), crown: mix('#a9a4ab', '#4e4858', 0.16),
  chest: '#fbf5ea', chestSh: mix('#fbf5ea', SHADOW, 0.14), pink: '#f6b6b6', pinkSh: mix('#f6b6b6', SHADOW, 0.2), nose: '#f2949c',
} as const;

const line = (w: number) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const out = (d: string, w: number = LW) => `<path d="${d}" fill="none" ${line(w)}/>`;
const fill = (d: string, c: string) => `<path d="${d}" fill="${c}"/>`;

// the shapes (unchanged from the reference)
const G = {
  head: 'M160 34 C212 34 250 60 256 98 C266 104 268 116 261 122 C268 130 265 142 254 146 C242 178 204 198 160 198 C116 198 78 178 66 146 C55 142 52 130 59 122 C52 116 54 104 64 98 C70 60 108 34 160 34Z',
  torso: 'M110 186 C112 158 208 158 210 186 C230 200 234 238 216 258 C200 276 120 276 104 258 C86 238 90 200 110 186Z',
  earL: 'M74 92 C64 66 66 42 76 30 C94 36 112 48 122 60 Z',
  earR: 'M246 92 C256 66 254 42 244 30 C226 36 208 48 198 60 Z',
  earInL: 'M82 76 C78 60 79 48 84 42 C94 48 104 54 110 62 Z',
  earInR: 'M238 76 C242 60 241 48 236 42 C226 48 216 54 210 62 Z',
  blaze: 'M154 60 C156 92 158 112 160 126 C162 112 164 92 166 60 C163 76 161 88 160 98 C159 88 157 76 154 60Z',
  muzzle: 'M134 132 C142 124 178 124 186 132 C204 140 212 160 202 176 C190 192 130 192 118 176 C108 160 116 140 134 132Z',
  nose: 'M152 142 L168 142 C166 148 163 151 160 152 C157 151 154 148 152 142 Z',
  tail: 'M212 252 C246 256 262 226 248 204 C244 196 252 190 258 194 C246 182 232 194 236 208 C244 228 234 242 210 240Z',
  pawL: 'M122 262 C120 276 154 278 154 266 C154 258 124 254 122 262Z',
  pawR: 'M198 262 C200 276 166 278 166 266 C166 258 196 254 198 262Z',
};

/**
 * Each part's hard shadow: the part minus itself moved toward the light (upper left), baked once as an explicit polygon (the
 * moves are the mockup's: head −8,−10; ears −6,−6; body −12,−7; chest and muzzle −6,−6 and −5,−6; tail −4,−7; paws −3,−4; the
 * ear insides lie the other way, +3,+4). BAND is where his head shadows his body.
 */
export const SH = {
  head: 'M240 64.5 L245.8 72 L250.4 80.1 L253.8 88.8 L255.7 96.3 L252.3 91.4 L248 88 L247.1 83.3 L244.3 74.3 L242.4 70.1 L238.2 62.6Z M257.2 98.8 L260.3 101.4 L262.7 104.5 L264.3 107.8 L265 111.1 L265 114.4 L264.2 117.6 L262.6 120.4 L261 122 L263.2 125.2 L264.6 129.7 L264.5 134.4 L262.9 138.8 L258.8 143.4 L254 146 L250.5 153.7 L245.9 161 L240.4 167.6 L234.1 173.7 L226.9 179.2 L219 184 L210.4 188.2 L201.3 191.6 L191.6 194.4 L181.4 196.4 L165.5 197.9 L149.1 197.6 L138.6 196.4 L128.4 194.4 L118.7 191.6 L109.6 188.2 L97 181.7 L89.4 176.5 L82.6 170.7 L76.7 164.4 L72.4 158.4 L77.9 163.7 L85.1 169.2 L97.2 176.2 L110.7 181.6 L125.5 185.5 L141.1 187.6 L157.5 187.9 L173.4 186.4 L183.6 184.4 L193.3 181.6 L202.4 178.2 L211 174 L218.9 169.2 L226.1 163.7 L232.4 157.6 L237.9 151 L242.5 143.7 L246 136 L249.7 134.1 L253.5 130.8 L255.9 126.6 L256.7 120.9 L255.7 116.3 L253 112 L255.2 109.5 L256.6 106.6 L257.1 102.2 L256.4 98.3Z M61.2 143.4 L57.7 139.8 L55.6 134.9 L58 136Z',
  earL: 'M71.7 85.5 L74 92 L122 60 L114.7 52.5 L116 54 L71.2 83.8Z',
  earR: 'M244 30 L247.4 35 L249.9 41.1 L251.7 48 L252.5 55.8 L252.4 64.1 L251.3 73 L249.2 82.4 L246 92 L198 60 L199.1 58.7 L240 86 L244 73.2 L245.3 67 L246.4 58.1 L246.5 49.8 L245.7 42 L243.9 35.1 L242.2 30.6Z',
  earInL: 'M110 62 L104.8 56.3 L98.5 51.3 L84 42 L83.4 42.8 L80.7 48.7 L79.6 56.7 L80.1 66.5 L82 76 L83.9 75 L82.6 63.8 L83.1 55.2 L84.4 50.5 L87 46 L100.4 54.4 L109.7 62.2Z',
  earInR: 'M210 62 L215.2 56.3 L221.5 51.3 L236 42 L236.6 42.8 L239.3 48.7 L240.4 56.7 L239.9 66.5 L238 76 L236.1 75 L237.4 63.8 L236.9 55.2 L235.6 50.5 L233 46 L219.6 54.4 L210.3 62.2Z',
  muzzle: 'M197.5 140 L201.6 145.2 L204.5 151 L206.1 157.2 L206.3 163.5 L204.9 169.8 L202 176 L198.1 179.7 L192.4 182.7 L185.5 185 L173.3 187.3 L160 188 L146.7 187.3 L134.5 185 L127.6 182.7 L121.9 179.7 L119.7 177.9 L118 176 L116.5 173.3 L122.6 176.7 L129.5 179 L137.4 180.7 L150.5 181.9 L163.9 181.7 L172.6 180.7 L180.5 179 L187.4 176.7 L193.1 173.7 L197 170 L199.1 165.9 L200.5 161.7 L201.3 157.5 L201.1 151.2 L199.5 145 L196.4 139Z',
  torso: 'M193.8 170.3 L202 174.3 L205.2 176.8 L207.7 179.6 L209.3 182.6 L210 186 L214.7 190 L220.4 197.5 L223.3 203.3 L225.4 209.7 L226.8 216.3 L227.5 223.2 L227.3 230.1 L226.3 236.9 L224.4 243.5 L221.7 249.7 L216 258 L213.7 260.2 L207.3 263.9 L203.3 265.5 L194 268.1 L177.8 270.7 L160 271.5 L142.3 270.7 L126 268.1 L116.7 265.5 L112.8 263.9 L109.3 262.1 L104.4 258.4 L114 261.1 L130.3 263.7 L142 264.4 L159.9 264.1 L176.8 262.2 L186.8 259.9 L195.3 256.9 L198.7 255.1 L204 251 L209.7 242.7 L213.5 233.3 L215.3 223.1 L215.5 216.2 L214.8 209.3 L212.4 199.4 L209.9 193.3 L204.7 185.3 L198 179 L197.3 175.6Z',
  band: 'M220.6 201.5 L209.5 204.6 L195 207 L178.1 208.5 L160 209 L141.9 208.5 L125 207 L110.5 204.6 L97.8 200.9 L103.3 192.3 L110 186 L110.6 183.4 L121.1 181.5 L133.2 180.1 L160 179 L186.8 180.1 L198.9 181.5 L209.4 183.4 L210 186 L214.7 190 L220.4 197.5 L222.2 200.9Z',
  chest: 'M130.1 252.7 L132.9 255.8 L138.1 259.8 L144.1 262.9 L150.7 265 L155.3 265.7 L162.4 265.9 L169.3 265 L175.9 262.9 L180 260.9 L185.5 257.2 L189.9 252.7 L193.3 247.5 L194.8 243.8 L195.9 238 L195.7 232.1 L194.1 226.4 L189.9 219.3 L184.4 214 L188.1 220.4 L189.7 226.1 L189.9 232 L188.8 237.8 L186.3 243.3 L182.6 248.3 L177.7 252.6 L169.9 256.9 L161 259.4 L156.4 259.9 L149.3 259.7 L140.2 257.7 L134 254.9 L129.6 252Z',
  tail: 'M244.7 189.5 L248.9 189.2 L251.9 189.9 L255 191.5 L258 194 L254.9 192.8 L251.1 193.3 L248.2 195.6 L247 198.5 L247.2 202 L250.9 209.6 L253 218.4 L252.4 227.1 L249.5 235.2 L246.3 240.1 L242 244.4 L236.9 247.9 L233.9 249.3 L227.4 251.4 L223.9 252 L216.2 252.3 L212 252 L210.9 245.2 L216.1 245.3 L223.4 244.4 L226.8 243.5 L232.9 240.9 L235.6 239.2 L240.3 235.3 L245.5 228.2 L248.4 220.1 L249.1 214.3 L247.9 205.5 L243 194.1 L243.5 190Z',
  pawL: 'M122.8 266.7 L124.8 269.2 L129.4 271.9 L135.2 273.5 L141.4 273.9 L147.1 273 L150.2 271.7 L153.3 268.7 L154 266 L153.4 264.1 L151 261.8 L150.3 264.7 L148.5 266.8 L145.7 268.4 L142.3 269.4 L138.4 269.9 L132.2 269.5 L126.4 267.9 L122.4 265.6Z',
  pawR: 'M166.2 267.4 L166.7 268.7 L168.5 270.8 L172.9 273 L178.6 273.9 L184.8 273.5 L190.6 271.9 L195.2 269.2 L197.8 265.2 L198 262 L197 260.2 L195 259 L194.2 262.7 L192.2 265.2 L187.6 267.9 L181.8 269.5 L173.7 269.7 L169.9 269Z',
};

const C = CEL;
/** The body without its front paws: fur, its shadow, solid fur marks, the band under his head, the chest, then the outline. */
export const TORSO = fill(G.torso, C.fur) + fill(SH.torso, C.furSh) +
  `<path d="M104 208 Q114 212 117 222 M216 208 Q206 212 203 222 M100 228 Q110 232 113 242 M220 228 Q210 232 207 242" fill="none" stroke="${C.furMark}" stroke-width="5" stroke-linecap="round"/>` +
  fill(SH.band, C.furSh) + `<ellipse cx="160" cy="236" rx="36" ry="30" fill="${C.chest}"/>` + fill(SH.chest, C.chestSh) + out(G.torso);
/** Each front paw (spec 2026-10-04 §4.6): cream, its shadow, the outline and two toe lines. */
const paw = (d: string, sh: string, toes: string) => fill(d, C.chest) + fill(sh, C.chestSh) + out(d, LWI * 1.15) + out(toes, LWI * 0.75);
export const PAW_L = paw(G.pawL, SH.pawL, 'M132 264 L132 270 M142 264 L142 270');
export const PAW_R = paw(G.pawR, SH.pawR, 'M178 264 L178 270 M188 264 L188 270');
/** The whole body, paws at rest (for art that draws him still). */
export const BODY = TORSO + PAW_L + PAW_R;

/** The rig's parts (spec 2026-10-04 §4.1): the same drawing, cut apart so each piece can move. */
export const TAIL = fill(G.tail, C.fur) + fill(SH.tail, C.furSh) +
  `<path d="M221 242 L226 250 M240 230 L247 236 M240 212 L249 208" fill="none" stroke="${C.furMark}" stroke-width="6" stroke-linecap="round"/>` + out(G.tail);
/** Each ear: its outer shape (behind the head) and its pink inside (over it), moved together. */
export const EAR_L = fill(G.earL, C.fur) + fill(SH.earL, C.furSh) + out(G.earL);
export const EAR_R = fill(G.earR, C.fur) + fill(SH.earR, C.furSh) + out(G.earR);
export const EAR_IN_L = fill(G.earInL, C.pink) + fill(SH.earInL, C.pinkSh);
export const EAR_IN_R = fill(G.earInR, C.pink) + fill(SH.earInR, C.pinkSh);
/** The head without ears and without blush (the rig draws the blush): fur, shadow, solid crown and stripes, one highlight at the
 *  top left, the blaze and muzzle, the outline, then the nose and whiskers. */
export const HEAD_SHAPE = fill(G.head, C.fur) + fill(SH.head, C.furSh) +
  fill('M70 92 C76 58 112 38 160 38 C208 38 244 58 250 92 C226 70 196 62 160 62 C124 62 94 70 70 92Z', C.crown) +
  fill('M128 60 C134 72 136 82 133 92 C131 82 127 72 124 62Z M192 60 C186 72 184 82 187 92 C189 82 193 72 196 62Z M108 72 C116 80 120 88 119 94 C116 88 110 82 104 76Z M212 72 C204 80 200 88 201 94 C204 88 210 82 216 76Z', C.furMark) +
  fill('M80 104 C82 78 106 54 142 46 C112 58 92 78 86 104Z', C.furHi) +
  fill(G.blaze, C.chest) + fill(G.muzzle, C.chest) + fill(SH.muzzle, C.chestSh) + out(G.head) +
  `<path d="${G.nose}" fill="${C.nose}" ${line(LWI)}/><ellipse cx="156.5" cy="145" rx="2.4" ry="1.4" fill="#fff" opacity=".9"/>` +
  `<path d="M112 160 L74 155 M112 167 L77 172 M208 160 L246 155 M208 167 L243 172" fill="none" ${line(LWI * 0.6)} opacity=".7"/>`;
```

`src/ui/truffle/paint.ts` — keep only what the story uses (and say so):

```ts
// The story's painted look for SVG characters (Truffle himself is light cel now: src/ui/cel.ts, spec 2026-10-13 §7) (spec 2026-10-07 3b §2, §5; docs/story/style.md): one shared palette, soft edges
// (never black ink on fur), gradients lit from the upper left. Each SVG gets its own gradient ids: WebKit can't paint a gradient
// defined in another svg, and a hidden one (display:none) paints nothing at all.

export const SWATCH = {
  sky: '#a9d3e8', skyDeep: '#6fa8c9', leaf: '#7fae6a', leafDeep: '#4f7d4a', cream: '#f6ecd6', terracotta: '#d98a62',
  sun: '#f4c66b', shadow: '#7a7398', fur: '#a9a4ab', furDeep: '#7d7882', chest: '#fbf5ea', jade: '#6dbb94',
} as const;

/** A valid, unique id fragment from preact's useId (which may hold ':'). */
export const cleanId = (raw: string): string => raw.replace(/[^\w-]/g, '-');
```

`src/ui/truffle/Truffle.tsx` — drop `import { P } from '../worlds/kit/palette';` and `EDGE, paintIds, truffleDefs` from the paint import (keep `cleanId` until Task 10), import `CEL` from `./parts`, use each part string as it is (`TAIL`, `TORSO`, `EAR_L`, `EAR_R`, `HEAD_SHAPE`, `EAR_IN_L`, `EAR_IN_R`, `PAW_L`, `PAW_R` in place of `paintIds(X, id)`), drop the `<defs …truffleDefs(id)…/>` line, give both lids `fill={CEL.fur}`, set `const INK = '#3f3756';` and draw his ground shadow as the mockup's:

```tsx
      <ellipse data-part="shadow" cx="160" cy="279" rx="66" ry="7.5" fill="#5d5585" opacity="0.32" />
```

Then `git rm src/ui/worlds/kit/palette.ts` (nothing imports it now: `grep -rn "kit/palette" src scripts` prints nothing).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/truffle src/ui/Pet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(truffle): light-cel body: flat fills, baked hard shadows, soft-violet line, no gradients

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Truffle's face in light cel: anime eyes with no clip-path, the ω mouth, hatched blush, sparkles

**Files:**
- Modify: `src/ui/truffle/rig.ts`, `src/ui/truffle/Truffle.tsx`, `src/ui/truffle/useRig.ts`
- Test: `src/ui/truffle/rig.test.ts`, `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Consumes: `CEL` (Task 9); `LINE`, `LW`, `LWI`, `blush`, `sparkle` (Task 3).
- Produces: in `rig.ts` `EYE_RX = 21`, `EYE_RY = 23`, `EYE_LINE = '#3f3756'`, `MOUTH_W` (the ω path), `mouthW(smile, open): number` (0…1); `upperLid`/`lowerLid` keep their signatures and return shapes (`fill`, `edge`, `edgeOn`, `closed`, `closedOn`) with paths bounded by the eye. New paint-only parts: `lash-l|r`, `eye-ring-l|r`, `mouth-w`; `blush-l|r` become groups (ellipse + three hatch strokes).

The lid logic is unchanged (`eT`, `curve`, `closed`, the 0.86 close point): only where the lid is drawn changes. A lid is the part of the eye above (or below) its edge, bounded by an ellipse 1.2 larger than the white so the outline covers its rim; with no lid the path is an empty point at the eye's centre (a point at 0,0 would stretch his bounding box — the stage cases' "pokes out of his box"). The iris moves at most 6 across and 5 down, which the 21 × 23 white holds with the 15.5 × 18.5 iris, so it needs no clip either.

- [ ] **Step 1: Write the failing tests**

`src/ui/truffle/rig.test.ts` — replace "a fully closed upper lid covers the eye…" and append the clip-free describe (Review Focus 3):

```ts
  it('a fully closed upper lid covers the eye and shows only the closed line', () => {
    const open = upperLid(118, 0, 0);
    expect(open.edgeOn).toBe(false);
    expect(open.closedOn).toBe(0);
    const shut = upperLid(118, 1, 1);
    expect(shut.closedOn).toBe(1);
    expect(shut.fill).toMatch(/^M95\.8 118 A22\.2 24\.2 0 1 1 140\.2 118 A/); // shut, the lid is the whole eye
    expect(shut.closed).toMatch(/^M99 /); // a ^ line across the eye
  });
  it('the lids stay inside the eye (no clip-path, spec 2026-10-13 §7): every point of a lid edge is on or in the eye', () => {
    for (const lidTop of [0, 0.2, 0.42, 0.5, 0.7, 0.86, 0.95]) for (const arc of [-0.25, 0, 0.4, 1]) {
      const pts = [...upperLid(118, lidTop, arc).edge.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const [[x0, y0], , [x1, y1]] = pts as [number, number][];
      for (const [x, y] of [[x0, y0], [x1, y1]] as [number, number][]) expect(((x - 118) / 22.2) ** 2 + ((y - 118) / 24.2) ** 2, `${lidTop} ${arc}`).toBeLessThanOrEqual(1.001);
    }
  });
describe('clip-free lids (spec 2026-10-13 §7)', () => {
  it('an open lid draws nothing, and never a point away from the eye (it would stretch his box)', () => {
    for (const d of [lowerLid(118, 0).fill, upperLid(202, 0, 0).fill]) for (const m of d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)) expect(Math.abs(Number(m[1]) - (d.includes('202') ? 202 : 118))).toBeLessThan(30);
    expect(lowerLid(118, 0).fill).toBe('M118 118Z');
  });
});
```

`src/ui/truffle/Truffle.test.tsx` — import `{ LINE } from '../cel'` and add:

```tsx
  it('his eyes and lids use no clip-path; his neutral mouth is a small ω; joy throws outlined sparkles and shuts his eyes to ^', () => {
    const neutral = render(<Truffle expression="neutral" />).container;
    expect(svg(neutral).outerHTML).not.toMatch(/clip-path|clipPath/);
    expect(neutral.querySelector('[data-part="mouth-w"]')!.getAttribute('opacity')).toBe('1');
    expect(neutral.querySelector('[data-part="mouth"]')!.getAttribute('opacity')).toBe('0');
    const joy = render(<Truffle expression="joy" />).container;
    expect(joy.querySelector('[data-part="extra-joy"]')!.innerHTML).toContain(`stroke="${LINE}"`);
    expect(joy.querySelector('[data-part="eye-ring-l"]')!.getAttribute('opacity')).toBe('0'); // a shut eye is only its ^ line
    expect(joy.querySelector('[data-part="lash-l"]')!.getAttribute('opacity')).toBe('0');
    const grumpy = render(<Truffle expression="grumpy" />).container;
    expect(grumpy.querySelector('[data-part="mouth-w"]')!.getAttribute('opacity')).toBe('0'); // a frown stays a frown
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/rig.test.ts src/ui/truffle/Truffle.test.tsx` → FAIL (the shut lid is still `M92 90 L144 90…`; no `mouth-w`).

- [ ] **Step 3: Implement**

`src/ui/truffle/rig.ts` — import `{ LINE, LWI, sparkle } from '../cel'`; after `EYE_Y` add:

```ts
/** His eyes (spec 2026-10-13 §7): a taller ellipse; the lids are drawn just past it, so its outline covers their edge. */
export const EYE_RX = 21;
export const EYE_RY = 23;
const LID_RX = EYE_RX + 1.2;
const LID_RY = EYE_RY + 1.2;
/** The eyes' own dark line (the lash, the outline, the brows), a little deeper than his body's line. */
export const EYE_LINE = '#3f3756';
```

set `const INK = LINE;` for `EXTRAS`, make joy's confetti sparkles:

```ts
  // joy's confetti is outlined four-point sparkles (spec 2026-10-13 §7)
  joy: sparkle(60, 74, 11, '#ffe27a', LWI * 0.7) + sparkle(266, 64, 13, '#ffe27a', LWI * 0.7) + sparkle(276, 112, 7, '#ffffff', LWI * 0.7) + sparkle(46, 116, 7, '#bfe6ff', LWI * 0.7),
```

and replace `upperLid` and `lowerLid` with (adding the ω):

```ts
const f2 = (n: number) => +n.toFixed(2);
/** Where a lid line at height y meets the lid ellipse round the eye: its half-width (0 at the top or bottom). */
const halfWidth = (y: number) => LID_RX * Math.sqrt(Math.max(0, 1 - ((y - EYE_Y) / LID_RY) ** 2));
const fullEye = (cx: number) => `M${f2(cx - LID_RX)} ${EYE_Y} A${LID_RX} ${LID_RY} 0 1 1 ${f2(cx + LID_RX)} ${EYE_Y} A${LID_RX} ${LID_RY} 0 1 1 ${f2(cx - LID_RX)} ${EYE_Y}Z`;
/** No lid: an empty path at the eye's centre (a point at 0,0 would stretch his bounding box). */
const none = (cx: number) => `M${cx} ${EYE_Y}Z`;

/**
 * The upper lid: bows down when relaxed, up into a ^ when happy; fully closed it covers the eye and a curved line remains. The
 * lid is the part of the eye above its edge, bounded by the eye's own ellipse, so it needs no clip-path (spec 2026-10-13 §7):
 * the lid logic (eT, curve, closed) is unchanged.
 */
export function upperLid(cx: number, lidTop: number, lidArc: number) {
  const cl = Math.max(0, (lidTop - 0.86) / 0.14);
  const eT = 95 + lidTop * 47 + cl * 6;
  const curve = (6 - lidTop * 3 - lidArc * 22) * (1 - cl);
  const yy = 127 - lidArc * 3;
  const bend = 4 - lidArc * 18;
  const top = EYE_Y - LID_RY;
  const bottom = EYE_Y + LID_RY;
  const y = Math.min(Math.max(eT, top + 0.5), bottom - 0.5);
  const w = halfWidth(y);
  const [xl, xr] = [f2(cx - w), f2(cx + w)];
  const ctl = f2(y + curve);
  return {
    fill: eT >= bottom ? fullEye(cx) : eT <= top ? none(cx) : `M${xl} ${f2(y)} A${LID_RX} ${LID_RY} 0 ${y > EYE_Y ? 1 : 0} 1 ${xr} ${f2(y)} Q${cx} ${ctl} ${xl} ${f2(y)}Z`,
    edge: `M${xl} ${f2(y)} Q${cx} ${ctl} ${xr} ${f2(y)}`,
    edgeOn: lidTop > 0.06 && lidTop < 0.9,
    closed: `M${cx - 19} ${yy} Q${cx} ${yy + bend} ${cx + 19} ${yy}`,
    closedOn: cl,
  };
}
/** The lower lid rises in the middle: a smile squint (bounded by the eye's ellipse, like the upper lid). */
export function lowerLid(cx: number, lidBottom: number) {
  const eB = 141 - lidBottom * 20;
  const up = lidBottom * 12;
  const bottom = EYE_Y + LID_RY;
  const y = Math.min(eB, bottom - 0.5);
  const w = halfWidth(y);
  const [xl, xr] = [f2(cx - w), f2(cx + w)];
  return {
    fill: lidBottom <= 0 ? none(cx) : `M${xl} ${f2(y)} A${LID_RX} ${LID_RY} 0 ${y < EYE_Y ? 1 : 0} 0 ${xr} ${f2(y)} Q${cx} ${f2(y - up)} ${xl} ${f2(y)}Z`,
    edge: `M${xl} ${f2(y)} Q${cx} ${f2(y - up)} ${xr} ${f2(y)}`,
    edgeOn: lidBottom > 0.05,
  };
}
/** His small "ω" (spec 2026-10-13 §7): shown while the mouth is shut and not frowning; the open mouth takes over as it opens. */
export const MOUTH_W = 'M160 152 L160 157 M150 160 C153 164 158 164 160 157.5 C162 164 167 164 170 160';
export const mouthW = (smile: number, open: number) => Math.max(0, Math.min(1, 1 - open * 4)) * Math.max(0, Math.min(1, smile * 4));
/** The mouth: corners rise with the smile; it opens into a pink shape. */
export function mouthPath(smile: number, open: number) {
  const cy = 165 - smile * 3;
  const u = 165 + smile * 6;
  const low = u + 2 + open * 16;
  const w = 10 + open * 2;
  return { d: `M${160 - w} ${cy} C${156 - w * 0.2} ${u} ${164 + w * 0.2} ${u} ${160 + w} ${cy} C${164 + w * 0.3} ${low} ${156 - w * 0.3} ${low} ${160 - w} ${cy}Z`, fillOpacity: Math.min(1, open * 3) };
}
```

`src/ui/truffle/Truffle.tsx` — import `{ blush, LINE, LW, LWI } from '../cel'` and `EYE_LINE, EYE_RX, EYE_RY, MOUTH_W, mouthW` from `./rig`; drop `useId`, `cleanId` and `const id`; set `const INK = EYE_LINE;`, `const PUPIL = '#241e30';`, `const IRIS = '#93c25c';`; replace `Eye` and the start of `FaceRig` (the `id` prop goes, `<FaceRig f={f} expr={drawnExpr} />`):

```tsx
/**
 * One anime eye (spec 2026-10-13 §7): a taller white, an iris with a dark upper band and a pale lower crescent, a dark pupil and
 * two catch-lights, the outline and a heavy upper lash, then the fur lids over it. No clip-paths: the iris never leaves the white
 * (it moves at most 6 across and 5 down, inside the room the ellipse leaves), and each lid is drawn only inside the eye.
 */
function Eye({ side, cx, f }: { side: 'l' | 'r'; cx: number; f: Face }) {
  const up = upperLid(cx, f.lidTop, f.lidArc);
  const low = lowerLid(cx, f.lidBottom);
  const iy = EYE_Y + 2;
  const band = 14.3; // the iris's half-width 7 above its centre
  return (
    <g data-part={`eye-${side}`}>
      <ellipse cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="#fffdf7" />
      <g data-part={`iris-${side}`}>
        <ellipse cx={cx} cy={iy} rx={15.5} ry={18.5} fill={IRIS} />
        <path d={`M${cx - band} ${iy - 7} A15.5 18.5 0 0 1 ${cx + band} ${iy - 7} Q${cx} ${iy - 13} ${cx - band} ${iy - 7}Z`} fill="#4f7d3c" />
        <path d={`M${cx - 12} ${iy + 11} Q${cx} ${iy + 22} ${cx + 12} ${iy + 11} Q${cx} ${iy + 16} ${cx - 12} ${iy + 11}Z`} fill="#d3ec97" />
        <ellipse cx={cx} cy={iy} rx={15.5} ry={18.5} fill="none" stroke="#3d5f2f" stroke-width={1.4} />
        <ellipse data-part={`pupil-${side}`} cx={cx} cy={121} rx={7 * f.pupil} ry={11 * f.pupil} fill={PUPIL} />
        <ellipse cx={cx + 6} cy={110} rx={5.6} ry={6.4} fill="#fff" />
        <circle cx={cx - 6} cy={130} r={2.6} fill="#fff" />
      </g>
      <path data-part={`lid-top-${side}`} d={up.fill} fill={CEL.fur} />
      <path data-part={`lid-bottom-${side}`} d={low.fill} fill={CEL.fur} />
      <ellipse data-part={`eye-ring-${side}`} cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="none" stroke={INK} stroke-width={LWI} opacity={String(1 - up.closedOn)} />
      <path data-part={`lash-${side}`} d={`M${cx - 22} ${EYE_Y - 2} C${cx - 20} ${EYE_Y - 22} ${cx + 20} ${EYE_Y - 22} ${cx + 22} ${EYE_Y - 2}`} fill="none" stroke={INK} stroke-width={LW * 1.25} stroke-linecap="round" opacity={String(1 - up.closedOn)} />
      <path data-part={`lid-edge-${side}`} d={up.edge} fill="none" stroke={INK} stroke-width={2.8} stroke-linecap="round" opacity={up.edgeOn ? 1 : 0} />
      <path data-part={`lid-bedge-${side}`} d={low.edge} fill="none" stroke={INK} stroke-width={2.2} stroke-linecap="round" opacity={low.edgeOn ? 1 : 0} />
      <path data-part={`lid-closed-${side}`} d={up.closed} fill="none" stroke={INK} stroke-width={3.6} stroke-linecap="round" opacity={String(up.closedOn)} />
    </g>
  );
}

/** The face rig drawn for one expression's values; the live loop (useRig) repaints the same parts. */
function FaceRig({ f, expr }: { f: Face; expr: Expression }) {
  const m = mouthPath(f.smile, f.mouthOpen);
  const w = mouthW(f.smile, f.mouthOpen);
  return (
    <>
      <g data-part="blush-l" opacity={f.blush * 0.6} dangerouslySetInnerHTML={{ __html: blush(96, 151, 16, 8, LWI * 0.8) }} />
      <g data-part="blush-r" opacity={f.blush * 0.6} dangerouslySetInnerHTML={{ __html: blush(224, 151, 16, 8, LWI * 0.8) }} />
      <Eye side="l" cx={EYE_L} f={f} />
      <Eye side="r" cx={EYE_R} f={f} />
      <path data-part="brow-l" d="M100 90 Q116 83 132 89" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('L', f)} opacity={f.browShow} />
      <path data-part="brow-r" d="M188 89 Q204 83 220 90" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('R', f)} opacity={f.browShow} />
      <path data-part="mouth" d={m.d} fill="#7d3348" fill-opacity={m.fillOpacity} stroke={LINE} stroke-width={LWI} stroke-linejoin="round" stroke-linecap="round" opacity={String(1 - w)} />
      <path data-part="mouth-w" d={MOUTH_W} fill="none" stroke={LINE} stroke-width={LWI} stroke-linejoin="round" stroke-linecap="round" opacity={String(w)} />
      {Object.entries(EXTRAS).map(([e, art]) => (
        <g key={e} data-part={`extra-${e}`} opacity={e === expr ? '1' : '0'} dangerouslySetInnerHTML={{ __html: art! }} />
      ))}
    </>
  );
}
```

`src/ui/truffle/useRig.ts` — import `mouthW` from `./rig`; inside `paint`'s eye loop after `lid-closed`:

```ts
    set(`lash-${side}`, 'opacity', (1 - up.closedOn).toFixed(3));
    set(`eye-ring-${side}`, 'opacity', (1 - up.closedOn).toFixed(3)); // a shut eye is only its closed line
```

and after `set('mouth', 'fill-opacity', …)`:

```ts
  const w = mouthW(f.smile, f.mouthOpen);
  set('mouth', 'opacity', (1 - w).toFixed(3));
  set('mouth-w', 'opacity', w.toFixed(3));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/truffle src/ui/Pet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Look at him in WebKit and time him**

Check port 4174 is free, then `npx tsx scripts/stage-cases.ts`. Expected `stage cases: ok` — in particular no "pokes out of his box" in `faces`, and `alive` idle/reacting/wave/peek work p95 ≤ 8 ms. Compare `fit-shots/stage-cases/faces.png` with `docs/worlds/truffle-cel-mock.png` row C: taller eyes with a heavy upper lash, dark upper iris band, pale lower crescent, two catch-lights; ω mouth; hatched blush; joy and content eyes are only their ^ line.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat(truffle): anime eyes with clip-free lids, the ω mouth, hatched blush and sparkles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Costumes, accessories and powers in his cel line, through the shared helpers

**Files:**
- Modify: `src/ui/truffle/costumeKit.ts` (the shared line, weights and the robe/hood shadows), `src/ui/truffle/accessories.ts` (uses the kit's line), `src/ui/truffle/powers.ts` (line and the cape's shadow), `scripts/stage-cases/page.tsx` (faces: three costumes, two powers)
- Test: `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Consumes: `LINE`, `LW`, `LWI`, `mix` (Task 3).
- Produces: `costumeKit.ts` exports `INK = LINE`, `S` (2.8 line), `s2` (1.8 line), `DARK = '#3a3045'` (small solid marks), `celShade(hex)` (a costume colour's hard shadow); `tint(color)` and `hood(color)` now draw an explicit hard shadow. `costumes.ts` and `mythCostumes.ts` change only through these helpers.

- [ ] **Step 1: Write the failing tests** — in `src/ui/truffle/Truffle.test.tsx` change the accessory test and add the whole-wardrobe test:

```tsx
  it('draws every accessory as drawn art in his cel line (never emoji text, never the old ink)', async () => {
    // …as before, with:
      expect(art).toContain(`stroke="${LINE}"`);
      expect(art).not.toContain('#2a2630');
  it('light cel (spec 2026-10-13 §7): no gradient and no clip-path anywhere on him, in any costume, accessory or power', async () => {
    const { ACCESSORY_IDS } = await import('../../fun/accessories');
    const looks = [{}, ...COSTUMES.map((c) => ({ outfit: c.id })), ...ACCESSORY_IDS.map((a) => ({ accessory: a })), { power: 'fire', powerTier: 3 }];
    for (const look of looks) {
      const { container, unmount } = render(<Truffle mood="cheer" {...look} />);
      const html = svg(container).outerHTML;
      expect(html, JSON.stringify(look)).not.toMatch(/clip-path|clipPath|Gradient|url\(#/);
      expect(html, JSON.stringify(look)).not.toMatch(/stroke="#2a2630" stroke-width="(3\.2|2\.4)"/); // the old ink outline (a black staff or robe may stay black)
      unmount();
    }
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/Truffle.test.tsx` → FAIL (accessories and costumes still stroke `#2a2630` at 3.2).

- [ ] **Step 3: Implement**

`src/ui/truffle/costumeKit.ts` — the header and the ink constants become:

```ts
// Shared drawing pieces for Truffle's costumes, accessories and powers, in his viewBox (30 20 260 270), in his light cel
// (spec 2026-10-13 §7): the same soft-violet line and weights as his body (2.8 outer, 1.8 inner), and one hard shadow on the
// big pieces (the robe and the hood), each an explicit path.
import { LINE, LW, LWI, mix } from '../cel';

export const INK = LINE;
export const S = `stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round" stroke-linecap="round"`;
export const s2 = `stroke="${INK}" stroke-width="${LWI}" stroke-linejoin="round" stroke-linecap="round"`;
/** A dark for small solid marks (an animal's eyes on a hood, nostrils): the line is too pale for them. */
export const DARK = '#3a3045';
/** A costume colour's one hard shadow tone (the mockup's wizard robe: toward a deep violet). */
export const celShade = (hex: string) => mix(hex, '#2a2050', 0.3);
```

`tint` (the robe) and `hood` get their hard shadow (baked like his body's; the hood's never falls over the face opening):

```ts
/** The robe's shadow on the lower right and the band where his head shadows it (baked like his body's, spec §7). */
const ROBE_SH = 'M106.3 260.2 L112.8 263.9 L116.7 265.5 L126 268.1 L136.6 270 L154 271.4 L171.9 271.1 L188.8 269.2 L203.3 265.5 L210.7 262.1 L216 258 L220 252.6 L223.2 246.7 L226.3 236.9 L227.3 230.1 L227.3 219.8 L225.4 209.7 L221.9 200.3 L216.7 192.3 L212.4 187.9 L210 186 L204.5 186 L209.9 194.3 L213.4 203.7 L215.3 213.8 L215.3 224.1 L213.5 234.3 L209.7 243.7 L204 252 L198.7 256.1 L191.3 259.5 L182 262.1 L171.4 264 L154 265.4 L142 265.4 L130.3 264.7 L119.2 263.2Z';
const ROBE_BAND = 'M222.4 201.5 L210.9 204.6 L196 207 L178.6 208.5 L160 209 L141.4 208.5 L124 207 L109.1 204.6 L97.6 201.5 L99.6 197.5 L103.3 192.3 L110 186 L210 186 L216.7 192.3 L220.4 197.5Z';
export const tint = (color: string) => `<path d="${BODY}" fill="${color}"/><path d="${ROBE_SH}" fill="${celShade(color)}"/><path d="${ROBE_BAND}" fill="${celShade(color)}"/><path d="${BODY}" fill="none" ${S}/>`;

/** The hood's hard shadow: its dome's lower right, never over the face opening. */
const HOOD_SH = 'M65 192 L74 200 L246 200 L253.8 193.3 L260.5 185.2 L266.2 175.9 L270.8 165.5 L274.1 154.2 L276.1 142.1 L276.8 129.3 L276.4 120.5 L275 109.6 L271.9 97.3 L269.8 91.4 L264.3 80.3 L261.1 75.1 L253.5 65.3 L249.3 60.8 L239.8 52.5 L236.3 50 L243.5 57.3 L251.1 67.1 L257.2 77.8 L259.8 83.4 L263.7 95.3 L265 101.6 L266.4 112.5 L266.8 121.3 L266.5 129.9 L264.9 142.2 L263.1 150 L259.4 161.1 L254.4 171.1 L250.5 177.2 L243.8 185.3 L236 192 L201 192 L184 196.1 L172.3 197.5 L160 198 L147.7 197.5 L136 196.1 L119 192Z';
export const hood = (color: string) =>
  `<path d="${HOOD}" fill="${color}" fill-rule="evenodd"/><path d="${HOOD_SH}" fill="${celShade(color)}"/>` +
  `<path d="M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z" transform="translate(160 137) scale(1.075) translate(-160 -137)" fill="none" stroke="${celShade(color)}" stroke-width="7"/>` +
  `<path d="${HOOD}" fill="none" fill-rule="evenodd" ${S}/>` +
  `<path d="M74 92 C88 62 116 42 148 37" stroke="#fff" stroke-opacity=".42" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  `<path d="M74 92 C88 62 116 42 148 37" stroke="#fff" stroke-opacity=".42" stroke-width="7" fill="none" stroke-linecap="round"/>`;
```

In the same file: `eyes()` fills its dots with `DARK` instead of `INK`; `ropeTail` and `staff` outline with `stroke-width="${w + 2 * LW}"` instead of `w + 3.2`.

`src/ui/truffle/accessories.ts` — delete its own `INK`, `S`, `s2` and import them: `import { INK, S, s2 } from './costumeKit';`; `THUMB_BACK` becomes a template string using `stroke="${INK}" stroke-width="2.8"`.

`src/ui/truffle/powers.ts` (replace the top and the cape and emblem):

```ts
import { powerDef, type PowerId } from '../../fun/powers';
import { iconMarkup, type IconName } from '../icons/icons';
import { celShade, INK, S, s2 } from './costumeKit';

/** The cape's hard shadow (baked like his body's, spec 2026-10-13 §7). */
const CAPE_SH = 'M73 282.3 L76 288 L244 288 L247 282.3 L249.9 272.8 L250.6 265.9 L250 255 L247.4 243.3 L244.5 235.1 L238.4 222.5 L233.2 213.8 L227 205 L220 196 L212.8 196 L221.2 207.8 L228.6 220.7 L234 233.2 L237.4 245.2 L238.7 256.4 L237.9 266.8 L235 276.3 L232 282Z';

// in powerLayer():
```

`scripts/stage-cases/page.tsx` — the `faces` looks (spec §10: idle, cheer, three costumes and two powers); and in `scripts/stage-cases.ts` the faces page grows to `{ width: 1100, height: 720 }` so all seven rows show (the app's CSS stops the page scrolling, so `fullPage` can't):

```tsx
    { label: 'plain', props: {} }, { label: 'rabbit', props: { outfit: 'rabbit' } }, { label: 'chef', props: { outfit: 'chef' } }, { label: 'wizard', props: { outfit: 'wizard' } },
    { label: 'sunglasses', props: { accessory: 'sunglasses' } }, { label: 'fire 3', props: { power: 'fire', powerTier: 3 } }, { label: 'water 2', props: { power: 'water', powerTier: 2 } },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit -p . && npx vitest run src/ui/truffle src/ui/Pet.test.tsx src/app/home.test.tsx`
Expected: PASS.

- [ ] **Step 5: Look at every costume, accessory and power on him in WebKit**

Check port 4174 is free, run `npx tsx scripts/stage-cases.ts` (expected `stage cases: ok`; `faces` has no "pokes out of his box"). Look at `fit-shots/stage-cases/costumes.png` (every costume) and `faces.png` (rabbit, chef, wizard; sunglasses; fire 3, water 2): outlines are the soft violet at his weight, robes and hoods carry one pale lower-right shadow (the hood's never over his face), and each item still reads as itself.

- [ ] **Step 6: Commit**

```bash
git add -A src scripts
git commit -m "feat(truffle): costumes, accessories and powers in his cel line, with one hard shadow on robes, hoods and capes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Final verification: every world by day and evening at three sizes, the fit sweep, the full suite and the build

**Files:** none new (fix whatever this turns up in the task that owns it, then rerun).

- [ ] **Step 1: The paintings are current and within budget**

Run: `npx tsx scripts/art/worlds.ts && git status --short public/worlds`
Expected: the eight lines and `… KB in all` under 2400 KB, exit 0; no changes to commit (the committed WebPs are current).

- [ ] **Step 2: No clip-path, filter or gradient on Truffle or the creatures; no old ink outline**

Run:
```bash
grep -rn "clip-path\|clipPath\|<filter\|Gradient" src/ui/truffle/parts.ts src/ui/truffle/Truffle.tsx src/ui/truffle/rig.ts src/ui/truffle/costumeKit.ts src/ui/truffle/powers.ts src/ui/worlds/creatures src/ui/cel.ts
grep -rn 'stroke="#2a2630" stroke-width="3.2"' src/ui/truffle
```
Expected: no output from either. (`accessories.ts` keeps one `clipPath` for the room's paired-item thumbnails, which are still images, not Truffle; the world's evening glows in `evening.ts` are radial gradients by design.)

- [ ] **Step 3: The full suite and the build**

Run: `npx vitest run` then `npm run build`
Expected: all test files pass (about 245 files, 2,100+ tests at the time of writing); the build exits 0 and `grep -c 'worlds/milkyway-thumb.webp' dist/sw.js` prints `1`.

- [ ] **Step 4: The stage cases in WebKit (every world, day and evening, three sizes; every creature; Truffle; the 8 ms check)**

Check port 4174 is free (`lsof -iTCP:4174 -sTCP:LISTEN` prints nothing), then run `npx tsx scripts/stage-cases.ts`.
Expected: `stage cases: ok` (it takes ~8 minutes on a loaded machine). It includes: `river-<world>-<afternoon|evening>-<ipad-landscape|ipad-portrait|iphone>.png` for all 8 worlds (48 shots), `creatures.png` (every creature at rest and mid-moment), `moments-<world>.png` with every moment's per-frame work p95 ≤ 8 ms, `faces.png` (idle, cheer and every expression; rabbit, chef, wizard; sunglasses; fire 3, water 2) with nothing poking out of his box, `costumes.png`, and the live Truffle's `alive` checks (idle, reacting, wave, peek ≤ 8 ms).

- [ ] **Step 5: The fit sweep (every child screen at six sizes, world taps in every world)**

Run: `npx tsx scripts/fit-check.ts` (it builds nothing: run after Step 3's build; it serves `dist` on 4174 and stops the server itself).
Expected: `… screens checked, 0 with problems`. In particular `home-<world>` and `home-done-<world>` for all 8 worlds at every size have no "world tap … covered" and no "no world prop to tap on this screen", `home-evening` is clean, and every `lesson-<world>` starts under 15 s. If a flow times out on a loaded machine, rerun it alone (`FIT_ONLY='^home-cove$' npx tsx scripts/fit-check.ts`) before calling it a failure.

- [ ] **Step 6: Look it over as the parent will**

Open and check, against the spec:
- `fit-shots/ipad-landscape/home-*`, `fit-shots/ipad-portrait/home-*`, `fit-shots/iphone-15/home-*`: each painting fills the screen from the bottom, Truffle stands in the same place as before, the boat sits on the water lower right (mid-stream in 梯田), creatures stand on the painting where the anchor table says.
- the arrival card (`fit-shots/*/first-*` or a world arrival in the sweep) shows the painting; 松露's room shows the eight thumbnails, locked ones grey.
- `river-*-evening-*`: a dusk tint (none in 银河), a moon where the sky shows, and that world's lights (windows and lamps, fireflies, moonlit mist, the farmhouse window, lava, lanterns, the lighthouse beam, twinkling stars), with the boat's lantern glowing.
- Truffle in `faces.png` matches mockup row C.

- [ ] **Step 7: Clean up and commit anything the checks changed**

Make sure no server is left (`lsof -iTCP:4174 -sTCP:LISTEN` prints nothing; `pkill -f "vite preview --port 4174"` if one is). `fit-shots/` is git-ignored.

```bash
git status --short
git add -A src scripts public && git commit -m "chore(worlds): One River verified in WebKit: every world, day and evening, three sizes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" || echo "nothing to commit"
```
