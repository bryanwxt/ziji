# ZiJi "One River" worlds and a cel-style Truffle — design

Date: 2026-10-13 · Base: main after PR #7 · Next after this: two-way sync across devices, then the parent loop

## 1. Why

The Home and lesson backgrounds today are 8 paper worlds drawn in code: 后院, 草丛, 赛车山, 方块世界, 恐龙谷, 海底, 月球基地 and 海盗岛. Each looks fine alone, but the set is a random mix with nothing linking one world to the next. The parent wants:
- the painterly anime background look: chunky gouache dabs, pastel pink, lavender and mint skies, golden bloom and blue-violet shadows;
- a set that has continuity;
- Truffle in a matching anime cel style.

**Success:**
- The 8 worlds read as one journey down one river, ending in the Milky Way.
- Each world is a painting with live, tappable creatures and props on top.
- Truffle and everything drawn on top use one light cel style that sits naturally on the paintings.
- His progress, finds and picked world carry over.

## 2. Decisions (parent, 2026-10-13)

| Question | Decision |
|---|---|
| Background look | The painterly anime look. A test painting (school field) was approved |
| Theme | **"One River" (一条河)**: Truffle follows one river in a paper boat (纸船) from home to the sea, and on to the Milky Way (银河, the "silver river") |
| Evening | **One painting per world.** Evening is a tint and lights in code |
| Old worlds | **Retired.** His reached worlds map across by position |
| Truffle | **Light cel (mockup row C)**: a thin soft-violet line, flat fills, one pale hard shadow, anime eyes. Mockup: `docs/worlds/truffle-cel-mock.png` (source `truffle-cel-mock.html`) |
| Paintings | Made by the parent in Gemini from the prompts in §3.3. All 8 are approved and in `docs/worlds/paintings/` |
| Order | After SRS tuning (PR #7), before two-way sync |

## 3. The worlds

### 3.1 The set

The unlock thresholds are unchanged. The time of day moves forward as he learns more.

| # | id | 名 | Painting | Unlocks at | Light |
|---|---|---|---|---|---|
| 1 | `home` | 家门口 | `1-home.jpg`: HDB blocks, a canal, a footbridge | 0 | sunrise |
| 2 | `rainforest` | 雨林 | `2-rainforest.jpg`: buttress trees, a treetop walkway, a stream | 30 | morning |
| 3 | `bamboo` | 竹林 | `3-bamboo.jpg`: bamboo, karst peaks, a stone path | 60 | late morning |
| 4 | `terraces` | 梯田 | `4-terraces.jpg`: rice terraces, a farmhouse, a waterwheel | 100 | noon |
| 5 | `dino` | 恐龙谷 | `5-dino.jpg`: a canyon, a waterfall, fossils, a volcano | 150 | afternoon |
| 6 | `lantern` | 灯笼水乡 | `6-lantern.jpg`: a canal town, a stone bridge, red lanterns | 200 | golden hour |
| 7 | `cove` | 海湾 | `7-cove.jpg`: a lighthouse, a shipwreck, palms | 300 | dusk |
| 8 | `milkyway` | 银河 | `8-milkyway.jpg`: night sea, the river rising into the Milky Way | 400 | night |

### 3.2 What every painting shares

These rules come from the prompts and were checked on all 8:
- A square canvas.
- Water comes from the centre of the horizon and leaves at the **lower right**.
- The **lower left** is open ground, where Truffle sits.
- The centre is calm, so the lesson card can sit there.
- No people, animals, boats or text.

### 3.3 The prompts

The prompts are saved in `docs/worlds/prompts.md`, with the shared style, the eight scene prompts, and the fix "full-bleed edge to edge, no border, no frame, no margin". They exist so a world can be repainted later and keep matching.

## 4. Paintings in the app

- **Pipeline:** `scripts/art/worlds.ts`, reusing `src/story/art.ts`'s WebP encoder. It reads `docs/worlds/paintings/*.jpg` and writes `public/worlds/<id>.webp`. It trims any uniform border: `2-rainforest.jpg` has a white frame of about 30 px. Then it makes a square and keeps ≥ 960 px. It encodes ≤ 300 KB each and ≤ 2.4 MB for the set, and fails the build if over.
- **Thumbnails:** `public/worlds/<id>-thumb.webp`, 240 px, for 松露's room and the arrival card.
- **Precache:** the paintings and thumbnails are in the workbox precache, because the worlds must work offline.

## 5. Rendering

- **One coordinate space.** `WorldScene` becomes a single `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice">`. The painting is an `<image>` at `0 0 1000 1000`, and every prop, creature, light and effect is drawn above it in the same space. One crop rule therefore keeps anchors on the painting at every size:
  - iPad landscape: the bottom of the square shows, full width.
  - Portrait: the centre-bottom shows.
  - Phone: the centre strip shows.
- **Anchors:** each world's `props` map uses the same `{ x, y, w, h }` shape as today, with (x, y) the ground point, in 1000-space. Every anchor is placed **by eye on the painting**, and checked in WebKit at iPad landscape, iPad portrait and phone. A prop that the phone crop cuts off is allowed if the world still has at least one tappable prop visible at every size, as today.
- **Truffle** sits in the lower-left open ground of every world, at the same screen position as today. Only the backdrop changes.
- **The paper boat (纸船)** is on the water in every world, at a per-world anchor in the lower-right water. Tapping it makes it bob and ripple. In 梯田 it sits mid-stream, because the waterwheel is in the lower right. In 银河 it can lift off the water (see §6).
- **Evening** (`timeOfDay` after 18:00): a dusk tint over the painting (`multiply`, per-world strength, none in 银河), a moon if the sky shows, and that world's lights (§6). The painting itself is never swapped.
- **Kept as they are:** the top fade, the tab bar inset, the lesson card position and the feedback sheet. The paper-grain overlay is removed for painted worlds, because the paintings carry their own texture.
- **Removed:** the paper-kit sky and land strings, the 8 old world art modules, `RACE_TRACK`, and the old evening coordinates. `momentFx` stays and is used for the new effects.

## 6. Props, moments, finds and lights

Every creature and prop is drawn in the cel style of §7.

| # | World | Tappable props and moments | Find | Evening lights |
|---|---|---|---|---|
| 1 | 家门口 | Otters pop up in the canal; a kingfisher darts past | — | Block windows and street lamps glow |
| 2 | 雨林 | A hornbill flies between trees; a monkey swings on the walkway; a butterfly | — | Fireflies |
| 3 | 竹林 | A panda munches, then rolls over; a frog hops on the stepping stones | — | The moon on the mist, and fireflies |
| 4 | 梯田 | A duck family paddles downstream; a kite dips overhead; a dragonfly | — | The farmhouse window, and fireflies |
| 5 | 恐龙谷 | **The egg** in a fern nest wobbles, and hatches after a lesson; a pterosaur glides; the volcano puffs | Egg and hatch | Lava glow on the volcano |
| 6 | 灯笼水乡 | **A lotus bud**: three taps, then the fourth opens it to show a pearl; a koi leaps; a sky lantern rises | Pearl | The lanterns brighten |
| 7 | 海湾 | **An X in the sand** by the shipwreck: dig it to find a star; a crab scuttles; a parrot sits on a palm | Dig star | The lighthouse beam sweeps |
| 8 | 银河 | Magpies fly in and form a bridge over the silver river (鹊桥); a shooting star | — | Stars twinkle (already night) |
| all | — | **The paper boat**: once a day a new **zodiac animal** pops out of it. On other taps the boat just bobs | Zodiac animal | The boat's lantern |

- **The find rules are unchanged** (`src/fun/finds.ts`). Only where they happen changes:
  - `findAnimal` is the boat, in any world (it was the grass box).
  - `tapGem` is the lotus pearl in 灯笼水乡 (it was the block gem). The data stays `gems`, and the child-facing word becomes 珍珠 pearl.
  - `tapEgg` and `hatchAfterLesson` stay in 恐龙谷.
  - `dig` is in 海湾 (it was the pirate island).
- **Moments:** `MOMENTS` keeps its shape: prop, label, `auto`, `tap`. The `auto` moments still start themselves after 30 s of no touch, still respect reduced motion, and still need the tab to be visible. Props that Home cards cover on some screens stay `tap: false`, as today.
- **Truffle's lines** (`WORLD_LINES`) and the celebration sunburst colours (`WORLD_BURST`) are rewritten for each new world. The burst colours are taken from each painting's sky and accent.

## 7. Truffle and the drawn layer in light cel

Follow mockup row C.
- **Line:** a soft violet `#706889`, about 1.2% of his height. Outer contours are slightly heavier than inner lines (nose, mouth, toes).
- **Fills:** flat. Fur `#a9a4ab`, chest and paws `#fbf5ea`, ear insides a flat pink. The gradients in `paint.ts` are removed.
- **Shadow:** one pale, hard-edged, blue-violet-tinted tone on the lower right of the head, body, ears, tail, muzzle and paws, plus a band where the head shadows the body. There is one small highlight at the top left of the head. Light comes from the upper left, as before.
- **No clip-paths.** WebKit repaints clipped shapes on every animation frame, which slowed lesson start before. Each shadow is its own explicit path.
- **Eyes:** a taller ellipse with a heavy upper lash line, an iris with a dark upper band and a pale lower crescent, a dark pupil, and two white catch-lights. The lid, look and pupil logic of the rig are unchanged.
- **Mouth:** the neutral mouth becomes a small "ω".
- **Fur marks and blush:** the stripes and crown become solid, darker fur marks. The blush gains three small hatch strokes.
- **Joy confetti** becomes outlined four-point sparkles.
- **What stays the same:** rig geometry, parts, `data-part` hooks, timelines, paws, face rig and costume anchors. Only the paint changes.
- **Costumes, accessories and powers** (`costumes.ts`, `costumeKit.ts`, `mythCostumes.ts`, `accessories.ts`, powers): they get the same line colour and weight (replacing `#2a2630` at 3.2) and one hard shadow, through the shared helpers where possible. Every item is checked on Truffle in WebKit.
- **Story characters:** Granny Dragon and `HushScene` get the same treatment. `docs/story/style.md` changes its "no hard outlines, soft gradients" rule to the light-cel rule.
- **New creatures** (§6) are drawn to the same rules. The mockup's otter is the reference.

## 8. Existing data

- **World ids change**, so `kid.worldsSeen` and `kid.world` migrate **by position**: yard→home, grass→rainforest, race→bamboo, blocks→terraces, dino→dino, sea→lantern, space→cove, pirate→milkyway.
- It is a one-off migration in the kid-state loader. It is idempotent, and unknown ids are dropped.
- **Finds keep all their data.** Saved lessons and logs are untouched.
- No arrival card is shown for the migrated worlds. The first Home after the update says once: 「我们的世界变成一条河了！」 ("Our world has become a river!").

## 9. Performance

- **One `<image>` per scene.** WebKit decodes the WebP once, and the props layer is plain SVG.
- **Lesson start must not get slower:** the existing stage cases have a per-frame work check of 8 ms, and the fit sweep's lesson-start timing.
- **Truffle's per-frame paint** must stay within the existing 8 ms check with the new flat fills and explicit shadow paths.

## 10. Testing

- **Unit tests:**
  - the world list, thresholds and order;
  - the id migration by position, which is idempotent and drops unknown ids;
  - finds at their new places, with the rules unchanged;
  - every world's anchors inside 0–1000;
  - every world has a prop visible in each crop (computed from the slice rule at three aspect ratios);
  - `MOMENTS` and lines for every world;
  - the painting pipeline trims the rainforest border and stays within the size budgets.
- **Rendered tests:** `WorldScene` draws the painting image, the boat and that world's props; evening adds the tint and lights; a boat tap gives the zodiac find once a day.
- **WebKit:**
  - Stage cases for every world: day and evening at iPad landscape, iPad portrait and phone, with props and Truffle.
  - Truffle in idle, cheer, three costumes and two powers.
  - Granny Dragon in a story scene.
  - The arrival card and 松露's room thumbnails.
  - The fit sweep stays clean, and the per-frame check passes.

## 11. Out of scope

- New worlds beyond 8.
- Animated paintings, such as moving water in the image itself.
- Repainting the story backgrounds in the new look; that can follow with the same prompts.
- Sound effects for the new creatures, unless they reuse existing ones.
- Two-way sync (next).
