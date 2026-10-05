# 字己 ZiJi — Stage Phase D: Home on the stage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home gets the stage treatment:
- one top strip;
- the journey stops on a path drawn for each world;
- paper cards in the stage zone;
- the reward goal in Chinese with an ink icon, which the parent sets;
- the celebration on a sunburst in the current world's colours, with Truffle centre stage: watching the chest, wiggling, pouncing when it opens.

**Architecture:**
- **Mostly CSS and markup** in `HomeScreen.tsx`, `Celebration.tsx` and `styles.css`.
- **Colours:** two small per-world colour maps, `src/ui/worlds/trail.ts` (the path under the stops) and `src/ui/worlds/burst.ts` (the celebration rays), take their colours from the one palette (`kit/palette.ts`).
- **The goal:** `RewardGoal` gains `zh` and `icon`. The parent area asks for them and can add them to an existing goal.

**Tech Stack:** Vite 7, Preact 10, TS 5.9, Vitest 4, playwright-core WebKit (`npm run fit`, `scripts/stage-cases.ts`).

**Spec:** docs/superpowers/specs/2026-10-04-ziji-stage-design.md (§3 "Home uses the same stage idea" and "Celebrations"; §4.4 lesson complete and chest; §8 phase D row)

## Global Constraints
- **Child screens:** Chinese only, no emoji. Home must stop showing the goal's English title and emoji, and `Ask your parent for …`.
- **Stars:** the "Lesson complete" reaction is an "overjoyed hop, then he stands proud in the celebration".
- **Chest:** "he watches the chest and wiggles with excitement, then pounces when it opens".
- **Celebration screen:** a "sunburst in the current world's colours, with Truffle centre stage" (spec §3).
- **One palette:** every world colour comes from `kit/palette.ts`.
- **Reduced motion:** nothing rotates or wiggles; the sunburst stands still.
- **Layout:**
  - every Home screen fits at all 6 sweep sizes, with 0 problems;
  - every prop's tap box stays uncovered (the sweep's world-tap probe).

## Rulings this plan makes
- **Truffle keeps his Home spot** (centre, on the ground). The lesson stage puts him lower left, but on Home the lower-left and lower-right quarters hold the props' tap boxes (stage phase C).
  - *Cost if wrong:* Home and lessons place him differently.
- **"Stops on the world's own path" is a ribbon** drawn per world under today's stops: a dirt path, a road, stepping blocks, sand. Stops are not placed at scene coordinates, because the scene is cropped differently at every size and the cards and Truffle would collide.
  - *Cost if wrong:* the path is Home's, not part of the world art.
- **Cards in the stage zone:**
  - on a landscape iPad they stack in a right-hand column, where the lesson card sits;
  - in portrait and on a phone they stay on top.
- **A goal saved before this phase** shows `我的奖励` and a gift icon until the parent adds a Chinese title.

## Review Focus
1. **A goal with only an English title and an emoji** (saved before this phase): Home shows no English and no emoji.
2. **Reduced motion on the celebration:** no rotating rays, no wiggle; the chest still opens.
3. **The done-for-today Home on a phone:** the done card, the cards and the strip fit with the path hidden, as now.
4. **Every world's ribbon and sunburst use palette colours only.**
5. **Celebration in free play (`rec.free`):** no chest, no star counter. Truffle is still there.

---

### Task 1: One top strip

**Files:** `src/app/HomeScreen.tsx`, `src/styles.css`, `src/app/home.test.tsx`

- [ ] **Step 1: Failing test.**
  - Home's header is one `.home__strip`. It contains the streak, the stars, the week dots, the 字己 seal and `.home__who`.
  - The strip is a single paper bar: `styles.test.ts` expects `.home__strip` to have a background, and `.home__strip .stat` to have none.
- [ ] **Step 2: Run it.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `<header class="topbar home__strip">`.
  - CSS: `.home__strip` gets `background: var(--paper)`, a soft panel border and shadow, `border-radius: 18px`, `padding: 6px 12px`, and a width of at most 980px, centred.
  - Inside it, `.stat`, `.week` and `.home__who` have no background, border or shadow, and a 2px divider (`border-left`) separates the groups.
- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/app src/styles.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: Home's streak, stars, week and name in one top strip`

### Task 2: The goal in Chinese with an ink icon

**Files:** `src/types.ts`, `src/parent/RewardsPanel.tsx`, `src/app/HomeScreen.tsx`, `src/parent/parentA.test.tsx` (or the rewards test file), `src/app/home.test.tsx`

**Interfaces:**
- `RewardGoal.zh?: string` and `RewardGoal.icon?: IconName`.
- `GOAL_ICONS: IconName[]` = `gift star car food party heart medal paw fish tree sun`.

- [ ] **Step 1: Failing tests.**
  - **Home:** a goal `{ title: 'Lego set', emoji: '🧱', zh: '乐高', icon: 'gift' }` shows `乐高` and an ink icon. The goal card has no `Lego`, no `🧱` and no Latin letters.
  - **Old goal:** a goal with no `zh` shows `我的奖励`.
  - **Reached goal:** it shows `你做到了！` and `找爸爸妈妈拿奖励吧！`, and no English.
  - **Parent:**
    - adding a goal needs the Chinese title (`rw-zh`) and an icon;
    - an existing goal without one shows an inline "Chinese title" box that saves `zh` and `icon`.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The parent form keeps the English title as the parent's own note, and adds:
    - a "Shown to him (Chinese)" input, which must be Han text;
    - an icon picker of `InkIcon` buttons (`aria-pressed`).
  - The Home goal card shows `<InkIcon name={goal.icon ?? 'gift'} size={34}/>` and `<Label zh={goal.zh ?? '我的奖励'}/>`, and the progress shows a star icon or `字`.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/app src/parent`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: the reward goal on Home in Chinese with an ink icon; the parent sets them`

### Task 3: Today's stops on a path drawn for each world

**Files:** create `src/ui/worlds/trail.ts` and `src/ui/worlds/trail.test.ts`; modify `src/app/HomeScreen.tsx`, `src/styles.css`

**Interfaces:**
- `WORLD_TRAIL: Record<WorldId, { fill: string; edge: string; mark: 'dash' | 'stones' | 'blocks' | 'none' }>`, with palette colours.
- `trailSvg(world): string`: a winding ribbon in a `0 0 100 20` box, stretched (`preserveAspectRatio="none"`).

- [ ] **Step 1: Failing tests.**
  - **Colours:** every world has a trail, and its colours are palette colours.
  - **Marks:**
    - `trailSvg('race')` has the dashed centre line;
    - `trailSvg('blocks')` has square stepping blocks;
    - no trail has an ink outline.
  - **Home:** it renders `.home__path .trail[data-world]` behind `.path`, decorative (`aria-hidden`).
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `.trail` is absolutely positioned under the stops' row (`left: 0; right: 0; bottom: <the stop names' baseline>; height: ~55%` of the row), behind the stops (`z-index: -1` inside a positioned `.path`).
  - The path row's zigzag (`--side`) stays.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/ui/worlds src/app`
  - Expected: PASS. Then look at Home in WebKit (Task 6).
- [ ] **Step 5: Commit.** `feat: today's stops sit on a path drawn in each world's colours`

### Task 4: Cards in the stage zone

**Files:** `src/styles.css` (with a `styles.test.ts` assertion)

- [ ] **Step 1: Failing test.**
  - Inside `@media (orientation: landscape) and (min-height: 600px)`, `.home__cards` is placed in the right-hand stage column: `margin-left: auto`, width about 46vw, and the cards stacked in one column.
- [ ] **Step 2: Run it.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - On a landscape iPad, `.home__main` becomes a two-area layout: the cards on the right (top), and the path centred above Truffle.
  - The cards get the stage card's paper look: `--surface`, soft shadow, `border-radius: 18px`.
- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/styles.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: on a landscape iPad Home's cards sit in the stage column`

### Task 5: The celebration on a sunburst, Truffle centre stage

**Files:** create `src/ui/worlds/burst.ts` and its test; modify `src/app/Celebration.tsx`, `src/styles.css`, `src/app/celebration.test.tsx`

**Interfaces:**
- `WORLD_BURST: Record<WorldId, { a: string; b: string; glow: string }>`, with palette colours.
- `burstStyle(world): string`, the CSS custom properties.

- [ ] **Step 1: Failing tests.**
  - **The sunburst:** the celebration renders `.burst[data-world]` in the current world's colours, not the red `scene--night`.
  - **The stars phase:** Truffle (`.celebrate .truffle`) is there with a `done` reaction.
  - **The chest phase:**
    - Truffle reacts `excited` (wiggle) while the chest is closed;
    - he reacts `pounce` when it opens;
    - the excited wiggle repeats every ~2.4 s until it opens.
  - **Reduced motion:** no wiggle repeats, and the `.burst` has no animation class.
  - **Free play:** Truffle still shows.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `.burst` is fixed and full screen. Its background is:
    - `repeating-conic-gradient(from 0deg at 50% 42%, var(--burst-a) 0 10deg, var(--burst-b) 10deg 20deg)`;
    - over it, a `radial-gradient(circle at 50% 42%, var(--burst-glow) 0 22%, transparent 62%)`.
  - Unless reduced motion is on, a `::before` copy rotates slowly with a transform animation (no repaint of the gradient).
  - Text on the burst is ink, with a paper text-shadow.
  - Truffle stands in the middle (Pet, `size` about 200, `alive`).
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/app src/ui/worlds`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: the celebration on a sunburst in the world's colours, Truffle centre stage, watching the chest`

### Task 6: WebKit

- [ ] **Step 1: Celebration stage case.**
  - Add a `celebrate` stage case for every world, a screenshot sheet for the parent, with the card-clipping probe.
- [ ] **Step 2: Run the sweep.**
  - Run: `npm run fit`
  - Expected: 0 problems: every Home, done-Home and lesson end at 6 sizes, and every prop's tap box uncovered.
- [ ] **Step 3: Look at Home and the celebration by eye.**
  - Check `home-yard`, `home-pirate` and `home-done-yard` at iPad landscape and iPhone SE.
  - Fix and ledger anything that reads badly.
- [ ] **Step 4: Run the suite.**
  - Run: `npx vitest run`
  - Expected: all pass.
- [ ] **Step 5: Commit.** `test: Home and the celebration on the stage, at every size`
