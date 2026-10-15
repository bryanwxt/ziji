# River rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every lesson visibly move something. A river meter on the Celebration fills toward the chest after every lesson, with at most 2 chests a day. "Almost there" goals show what is close. The chest gives only prizes that meet the v3 onesie standard: the 12 zodiac onesies, 18 new onesies, 10 jobs redrawn full-body and the 7 Chinese myths redrawn.

**Architecture:** The rules are pure functions in `src/fun/`:
- `meter.ts` holds the meter arithmetic.
- `goals.ts` holds `almostThere`.
- `costumes.ts` holds the catalogue and the chest pick.

The Celebration counts each lesson on the meter once, in one `updateKid` transaction (`src/app/celebrationData.ts`). It then plays its phases from an ordered list: stars → river *or* one chest phase per owed chest → goals → power → badges. A small `RiverTrack` component draws the One River paper boat (`src/ui/worlds/creatures/boat.ts`) sailing toward a chest. The Celebration uses it at full size and Home uses it as a mini version.

New costume art goes in four family files under `src/ui/truffle/`, registered in `v3.ts`, and `costumeLayer()` prefers it. The rig gets `pawL`/`pawR` costume slots, so a held prop moves with the paw. A WebKit contact sheet (`scripts/costume-sheet.ts`) and a face probe check every costume.

**Tech Stack:** Preact + TypeScript, Vite, vitest (node for `*.test.ts`, jsdom for `*.test.tsx`, `*.slow.test.tsx` for whole-flow walks), playwright-core 1.52 WebKit for the costume sheet, the stage cases and the fit sweep.

**Spec:** `docs/superpowers/specs/2026-10-15-ziji-river-rewards-design.md`, approved by the parent on 2026-10-15. The spec is binding. Also read `docs/worlds/costumes/standard-v3.png` (the v3 standard, rows A–E), `docs/worlds/costumes/samples-v3.ts.txt` (6 parent-approved v3 costumes to port) and `docs/worlds/costumes/rig-slot.diff` (the paw-slot change).

## Global Constraints

- **Meter size:** 2 halves (0, ½ or 1, stored as halves).
- **Filling:** the **first** completed daily lesson adds 2 halves. Each **extra** lesson (想再学一课吗 / 再学一课) adds 1 half.
- **Chest:** a chest opens whenever the meter reaches full, and the meter resets.
- **Cap:** at most **2 chests** per local day.
  - Halves earned after the cap are **banked** for tomorrow, up to 1 full meter (2 halves).
  - The next day's first lesson adds its 2 on top of the bank. The chest opens at once, and any leftover stays.
- **What fills nothing:** free play (练一练 alone / 再玩一会儿) and parent-started review.
- **Streak and dino egg:** unchanged. Only the daily lesson counts.
- **Lines, verbatim:**
  - when the meter isn't full: 「再学一课就能开宝箱！」
  - when today's cap is reached: 「明天再开宝箱！」
- **Data:** `kid.meter: { halves: number; chestsToday: number; day: string }` and `kid.bank?: number`. This plan adds `owed` and `lesson` to `meter` (see the rulings below).
  - Migration: everything starts empty.
  - `lastChestDate` keeps working as today's first-chest marker.
- **Goals:**
  - Up to **3**, nearest first, after the stars and chest.
  - Pick by the smallest remaining effort. Use only goals that today's lesson moved, or that are within reach this week.
  - Wording, verbatim:
    - 「还差 N 个字到 雨林」
    - 「再认识 N 个『水』字，解锁新能力」
    - 「明天再写对『鱼』，就会写了！」 (up to 2 words)
    - 「宝箱里还有 N 件新衣服」
    - 「再认识 N 个『木』字，得到新徽章」
  - Each goal is child-facing Chinese with pinyin (the `Label` component) and a small `InkIcon` per goal type.
  - Logic: the pure function `almostThere` in `src/fun/goals.ts`.
- **The chest:**
  - **Contents:** 47 costumes + 16 accessories = **63 prizes**. The 47 are:
    - zodiac 鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪;
    - 18 new onesies: 水獭 犀鸟 熊猫 青蛙 鸭子 蜻蜓 小恐龙 翼龙 锦鲤 螃蟹 鹦鹉 喜鹊 企鹅 鲨鱼 独角兽 猫头鹰 小老虎 小白兔;
    - 10 jobs: 宇航员 厨师 消防员 医生 飞行员 警察 足球员 魔法师 海盗 小贩;
    - 7 myths: 孙悟空 哪吒 嫦娥 后羿 财神 招财猫 舞狮.
  - **Removed from the chest:** the 23 Greek costumes, plus 探险家 超人 像素 雨衣 机器人 城堡 篮球服 柔术服. Anything he already owns stays owned and wearable in its old art, for owners only.
  - **Order:** a seeded pick from unowned prizes. Within each round he gets one onesie, then a job or myth, then an accessory, before any group repeats. When everything is owned, the chest gives 3 bonus stars.
  - **Pace:** at ≤2 chests a day, the 63 prizes last at least 32 days.
- **v3 costume standard, for every new or redrawn costume:**
  - It changes his whole silhouette.
  - It has one dominant colour.
  - Its signature prop is readable at the 64 px Wardrobe tile.
  - It is **light cel**: line `#706889`, flat fills, one explicit-path hard shadow, no clip-paths (no gradients, no filters), light from the upper left.
  - Headgear reaches both edges of the head (x ≈ 54–266 at the brow) and the crown stays visible. This crown rule binds bands, circlets and hair. A helmet or hat may cover the crown, as the approved 消防员 sample does.
  - His face stays readable.
  - Held props go in the new `pawL`/`pawR` slots, so they move with his paw.
- **Unchanged:** stars, `bonusStars`, the streak, finds, the 16 accessories. There is **no** `lessonVersion` bump.
- **Out of scope:** new accessories, costume trading, spending stars, story rewards.
- **Tests:**
  - Node tests are `*.test.ts`, DOM tests are `*.test.tsx`, and whole-flow walks are `*.slow.test.tsx`.
  - Render tests are heavy, so put pure rules in node tests.
  - WebKit checks use playwright-core 1.52 and the WebKit already installed under `~/Library/Caches/ms-playwright`. Install nothing.
  - Screenshot layout changes in **WebKit** (the iPad is Safari), not only Chromium.
- **Ports:** before running the fit sweep, check that port 4174 is free (`lsof -iTCP:4174 -sTCP:LISTEN`), and kill your servers when done. The machine can be loaded: before calling a timed-out flow a failure, rerun it on its own with `FIT_ONLY=<flow>`.
- **Git:**
  - Never use bare `git stash`.
  - Commit after every task, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Do not push.

### Rulings on spec gaps (made while planning; binding for this plan)

1. **`meter.owed` and `meter.lesson` are added.**
   - `owed` counts chests earned and not yet opened, so a chest survives him leaving the Celebration. This matters for extra lessons, whose records are never saved.
   - `lesson` is the `startedAt` of the last lesson counted, so a resumed or reloaded Celebration never counts twice.
2. **A lesson opens every chest it fills, up to the cap.** A banked meter plus the next day's first lesson (2 + 2) can give 2 chest phases in one Celebration. This follows "a chest opens whenever the meter reaches full … the leftover stays".
3. **`lastChestDate` is today's first-chest marker.** Suppose it is already today when the daily lesson is counted and the meter has not seen today (an install updated after today's chest). Then the lesson counts as the day's first chest already opened: `chestsToday = 1`, nothing is added and no chest is given.
4. **The old first chest is gone.** It used to give the zodiac onesie from Settings. The chest now rotates from the first chest. The Settings zodiac stays and its label becomes "Zodiac (生肖)".
5. **The rotation needs no new state.** The next group is the chest group with the fewest owned items. Ties go in round order: onesie, then job/myth, then accessory. An empty group is skipped.
6. **Home's "reward card" is the existing `.goal` card.** It always shows the mini meter. When the parent has set a reward goal, the goal sits beside the meter.
7. **`almostThere(kid, knowledge, finds, now)`:**
   - The third argument is read as the lesson's facts (`GoalFacts`): the journey count, the one-day-away words, the characters read today, whether the lesson moved the meter, and the families. `kid.finds` (tap finds) feeds no goal.
   - `knowledge` is typed `Pick<Knowledge, 'knownChars'>`.
   - "Within reach this week" means effort ≤ 15 characters (`WEEK_REACH`).
   - A one-day-away **say** word reads 「明天再说对『X』，就会说了！」. There is one goal per word, at most 2.
   - When a write/say goal shows, the stars phase drops its 「还差一天：…」 line, because it has been "promoted to a goal".
   - Free play shows no river and no goals.
8. **"Parent-started review" has no route** in the app today. Lessons start only from the daily path, 再学一课 and 再玩一会儿 (free). `lessonOf()` returning null for free play covers it.
9. **The costume count is 35 new or redrawn** (18 + 10 + 7), not about 41. They are batched 9 / 9 / 10 / 7 by family.
   - Colours are chosen so that the lookalike pairs differ.
   - 足球员 becomes a yellow jersey (`#ffcc2e`) and 海盗 becomes black (`#2d2a33`).
   - 小白兔 stays white by its name. It is told from the zodiac 兔 by lop ears and a carrot, not by colour.
   - The pirate's eye patch is flipped up onto the hat, so both eyes show.

## Review Focus

1. **A finished daily lesson celebrated again.** This happens when he reloads, or comes back to the path's chest. The meter must not fill twice, and a chest he left unopened must still be waiting. Tests: Task 1 "the same lesson celebrated again counts once" and Task 4 "a finished lesson celebrated again counts once; its unopened chest is still there".
2. **An install updated mid-day after today's chest was opened under the old rules** (`lastChestDate` today, meter empty). Resuming the daily Celebration must not give another chest, and two extra lessons must then give the day's second chest. Test: Task 1, the `lastChestDate` case.
3. **An extra lesson's chest left unopened.** Extra records are never saved, so the lesson cannot be resumed. The chest must open at the next Celebration. Test: Task 4, "an extra lesson's chest left unopened opens at the next Celebration".
4. **Meter data from an old or hand-edited backup** (missing, negative, strings, `halves: 7`). It must normalise to safe values, never crash or give a chest. Test: Task 1, the `normalizeMeter`/`normalizeBank` cases.
5. **A profile that owns Greek or old outfits, and wears one.** They stay owned, wearable and shown on their own shelf. The chest never gives a removed item. With everything in the chest owned, it gives 3 stars. Tests: Task 2, the "removed costumes" and Wardrobe cases.

---

## File structure

**Create**
- `src/fun/meter.ts` (+ `meter.test.ts`): the meter arithmetic, its lines, Home's view of it, and normalising.
- `src/fun/goals.ts` (+ `goals.test.ts`): `almostThere` and `GoalFacts`.
- `src/app/celebrationData.ts`: `settleMeter` (counts a lesson once, in one transaction) and `loadGoalFacts`.
- `src/ui/RiverTrack.tsx` (+ `riverTrack.test.tsx`): the river, the paper boat, the chest mark.
- `src/app/celebrationRiver.slow.test.tsx`, `src/app/celebrationGoals.slow.test.tsx`
- `src/ui/truffle/v3.ts`: the registry of v3 costume art.
- `src/ui/truffle/v3.test.ts`: the v3 rules over every registered costume.
- `src/ui/truffle/pawSlots.test.tsx`
- `src/ui/truffle/onesiesRiver.ts`, `onesiesFavourite.ts`, `jobs.ts`, `myths.ts`: the four costume families.
- `scripts/stage-cases/bundle.ts`: the stage page bundle, shared.
- `scripts/stage-cases/faceProbe.ts`: the sheet layout and `SHEET_PROBE`.
- `scripts/costume-sheet.ts`: the WebKit contact sheet CLI.

**Modify**
- `src/types.ts`, `src/store/repo.ts` (+ `repo.test.ts`)
- `src/fun/costumes.ts` (+ `costumes.test.ts`)
- `src/stats/produce.ts` (+ `produce.test.ts`)
- `src/app/Celebration.tsx`, `src/app/HomeScreen.tsx`, `src/app/Wardrobe.tsx`, `src/parent/SettingsPanel.tsx`
- `src/app/celebration.slow.test.tsx`, `src/app/celebrationStage.slow.test.tsx`, `src/app/home.test.tsx`
- `src/ui/truffle/Truffle.tsx`, `src/ui/truffle/costumes.ts`, `src/ui/truffle/costumeKit.ts`, `src/ui/truffle/mythCostumes.ts`
- `src/styles.css`
- `scripts/stage-cases.ts`, `scripts/stage-cases/page.tsx`, `scripts/fit-profile.ts` (+ `fit-profile.test.ts`), `scripts/fit-check.ts`

---

### Task 1: The river meter: kid state, migration and the fill arithmetic

**Files:**
- Create: `src/fun/meter.ts`, `src/fun/meter.test.ts`
- Modify: `src/types.ts` (KidState, DEFAULT_KID), `src/store/repo.ts:31-49` (`normalizeKid`), `src/store/repo.test.ts`

**Interfaces:**
- Consumes: `KidState`, `SessionRecord`, `DEFAULT_KID` from `src/types.ts`.
- Produces (`src/fun/meter.ts`):
  - constants: `METER_FULL = 2`, `FIRST_HALVES = 2`, `EXTRA_HALVES = 1`, `CHESTS_PER_DAY = 2`, `BANK_MAX = 2`, `HALF_LINE`, `CAPPED_LINE`;
  - `interface Meter { halves: number; chestsToday: number; day: string; owed: number; lesson: number | null }`;
  - `EMPTY_METER: Meter`;
  - `type LessonKind = 'first' | 'extra'`;
  - `interface Lesson { kind: LessonKind; day: string; key: number }`;
  - `interface MeterFill { counted: boolean; from: number; chests: number; left: number; capped: boolean; banked: number }`;
  - `lessonOf(rec): Lesson | null`;
  - `fillMeter(kid: KidState, lesson: Lesson): { kid: KidState; fill: MeterFill }`;
  - `meterLine(fill: Pick<MeterFill, 'left' | 'capped'>): string | null`;
  - `meterShown(kid: KidState, day: string): { halves: number; capped: boolean }`;
  - `normalizeMeter(v: unknown): Meter`;
  - `normalizeBank(v: unknown): number`.
- `KidState` gains `meter: Meter` and `bank?: number`. `DEFAULT_KID.meter = EMPTY_METER`.

- [ ] **Step 1: Write the failing tests**

Create `src/fun/meter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_KID, type KidState } from '../types';
import { EMPTY_METER, fillMeter, lessonOf, meterLine, meterShown, normalizeBank, normalizeMeter, type Lesson, type MeterFill } from './meter';

const first = (day: string, key: number): Lesson => ({ kind: 'first', day, key });
const extra = (day: string, key: number): Lesson => ({ kind: 'extra', day, key });
/** The lessons in order; returns the kid after them and the last lesson's fill. */
function run(lessons: Lesson[], kid: KidState = DEFAULT_KID): { kid: KidState; fill: MeterFill } {
  let k = kid;
  let fill: MeterFill | null = null;
  for (const l of lessons) ({ kid: k, fill } = fillMeter(k, l));
  return { kid: k, fill: fill! };
}

describe('the river meter (rewards spec §3)', () => {
  it("the day's first lesson fills it: the boat sails 0 → full, one chest, the meter starts again", () => {
    const { kid, fill } = run([first('2026-10-15', 1)]);
    expect(fill).toEqual({ counted: true, from: 0, chests: 1, left: 0, capped: false, banked: 0 });
    expect(kid.meter).toEqual({ halves: 0, chestsToday: 1, day: '2026-10-15', owed: 1, lesson: 1 });
  });
  it('an extra lesson fills half; a second extra lesson opens the second chest', () => {
    const a = run([first('2026-10-15', 1), extra('2026-10-15', 2)]);
    expect(a.fill).toMatchObject({ from: 0, chests: 0, left: 1, capped: false });
    expect(meterLine(a.fill)).toBe('再学一课就能开宝箱！');
    const b = run([extra('2026-10-15', 3)], a.kid);
    expect(b.fill).toMatchObject({ from: 1, chests: 1, left: 0, capped: true });
    expect(b.kid.meter.chestsToday).toBe(2);
    expect(meterLine(b.fill)).toBe('明天再开宝箱！');
  });
  it('past the cap of 2, halves go to the bank, never more than one full meter', () => {
    const day = '2026-10-15';
    const capped = run([first(day, 1), extra(day, 2), extra(day, 3)]).kid;
    const c = run([extra(day, 4)], capped);
    expect(c.fill).toMatchObject({ chests: 0, banked: 1, capped: true, left: 0 });
    expect(c.kid.bank).toBe(1);
    const d = run([extra(day, 5), extra(day, 6), extra(day, 7)], c.kid);
    expect(d.kid.bank).toBe(2);
    expect(d.kid.meter).toMatchObject({ owed: 2, chestsToday: 2 });
  });
  it("the next day's first lesson adds its 2 on top of the bank: the chests open at once and the leftover stays", () => {
    const banked = { ...DEFAULT_KID, meter: { halves: 0, chestsToday: 2, day: '2026-10-15', owed: 0, lesson: 7 }, bank: 2 };
    const a = run([first('2026-10-16', 8)], banked);
    expect(a.fill).toEqual({ counted: true, from: 2, chests: 2, left: 0, capped: true, banked: 0 });
    expect(a.kid.bank).toBe(0);
    const half = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 1, day: '2026-10-15', owed: 0, lesson: 2 } };
    expect(run([first('2026-10-16', 9)], half).fill).toMatchObject({ from: 1, chests: 1, left: 1, capped: false });
  });
  it('a lesson finished after midnight counts on the day it began; the next lesson rolls the day', () => {
    const late = run([first('2026-10-15', 1), extra('2026-10-15', 2)]).kid; // the extra lesson began at 23:50 on the 15th
    const morning = run([first('2026-10-16', 3)], late);
    expect(morning.fill).toMatchObject({ from: 1, chests: 1, left: 1 });
    expect(morning.kid.meter).toMatchObject({ day: '2026-10-16', chestsToday: 1 });
  });
  it('the same lesson celebrated again (a reload, the path chest) counts once (review focus 1)', () => {
    const once = run([first('2026-10-15', 1)]);
    const again = fillMeter(once.kid, first('2026-10-15', 1));
    expect(again.kid).toBe(once.kid);
    expect(again.fill).toMatchObject({ counted: false, chests: 0 });
  });
  it("an install updated after today's chest was opened (lastChestDate today): no second first chest (review focus 2)", () => {
    const a = run([first('2026-10-15', 1)], { ...DEFAULT_KID, lastChestDate: '2026-10-15' });
    expect(a.fill).toMatchObject({ counted: true, chests: 0, left: 0 });
    expect(a.kid.meter.chestsToday).toBe(1);
    const b = run([extra('2026-10-15', 2), extra('2026-10-15', 3)], a.kid);
    expect(b.fill.chests).toBe(1); // the day's second chest after two extra lessons, as for everyone
  });
  it('free play and a lesson with nothing done add nothing', () => {
    const rec = { free: false, extra: false, completedSteps: ['newwords' as const], date: '2026-10-15', startedAt: 5 };
    expect(lessonOf(rec)).toEqual({ kind: 'first', day: '2026-10-15', key: 5 });
    expect(lessonOf({ ...rec, extra: true })?.kind).toBe('extra');
    expect(lessonOf({ ...rec, free: true })).toBeNull();
    expect(lessonOf({ ...rec, completedSteps: [] })).toBeNull();
  });
  it("Home's small boat: today's meter, or a new day's with the bank in it", () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 2, day: '2026-10-15', owed: 0, lesson: 3 }, bank: 2 };
    expect(meterShown(kid, '2026-10-15')).toEqual({ halves: 1, capped: true });
    expect(meterShown(kid, '2026-10-16')).toEqual({ halves: 2, capped: false });
    expect(meterShown(DEFAULT_KID, '2026-10-16')).toEqual({ halves: 0, capped: false });
  });
});

describe('meter data from older or damaged saves (review focus 4)', () => {
  it('starts empty; anything out of range or of the wrong type falls back', () => {
    expect(normalizeMeter(undefined)).toEqual(EMPTY_METER);
    expect(normalizeMeter({ halves: 7, chestsToday: -1, day: 3, owed: 'x', lesson: 'y' })).toEqual({ halves: 1, chestsToday: 0, day: '', owed: 0, lesson: null });
    const ok = { halves: 1, chestsToday: 2, day: '2026-10-15', owed: 1, lesson: 1760000000000 };
    expect(normalizeMeter(ok)).toEqual(ok);
    expect(normalizeBank(5)).toBe(2);
    expect(normalizeBank(-1)).toBe(0);
    expect(normalizeBank(1.5)).toBe(0);
    expect(normalizeBank(undefined)).toBe(0);
  });
});
```

Add to `src/store/repo.test.ts`. Add `EMPTY_METER` from `'../fun/meter'` and `type KidState` from `'../types'` to its imports, then append:

```ts
describe('river meter migration (rewards spec §6)', () => {
  it('an older kid record starts with an empty meter and no bank; owned costumes, stars and the chest date are untouched', () => {
    const { meter: _gone, ...old } = { ...DEFAULT_KID, ownedCostumes: ['zeus', 'tiger'], bonusStars: 9, lastChestDate: '2026-10-14' };
    const kid = normalizeKid(old as Partial<KidState>)!;
    expect(kid.meter).toEqual(EMPTY_METER);
    expect(kid.bank).toBe(0);
    expect(kid.ownedCostumes).toEqual(['zeus', 'tiger']);
    expect(kid.bonusStars).toBe(9);
    expect(kid.lastChestDate).toBe('2026-10-14');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/fun/meter.test.ts src/store/repo.test.ts`
Expected: FAIL. `meter.ts` does not exist, and `normalizeKid` has no `meter`.

- [ ] **Step 3: Write the meter**

Create `src/fun/meter.ts`:

```ts
// The river meter (rewards spec 2026-10-15 §3): a paper boat sails toward the chest. The day's first lesson fills it (2 halves),
// each extra lesson half of it (1). A full meter is a chest; at most 2 chests a local day; halves earned past that wait in the
// bank for tomorrow (at most one full meter). Free play adds nothing.
import type { KidState, SessionRecord } from '../types';

export const METER_FULL = 2;
export const FIRST_HALVES = 2;
export const EXTRA_HALVES = 1;
export const CHESTS_PER_DAY = 2;
export const BANK_MAX = 2;
/** A sanity bound on chests earned and not yet opened (an old or hand-edited backup). */
const OWED_MAX = 4;

export const HALF_LINE = '再学一课就能开宝箱！';
export const CAPPED_LINE = '明天再开宝箱！';

/**
 * halves: 0 or 1 between lessons; chestsToday: chests earned on `day`; owed: chests earned and not yet opened (one survives
 * him leaving the Celebration); lesson: the startedAt of the last lesson counted (a celebration shown again never counts twice).
 */
export interface Meter { halves: number; chestsToday: number; day: string; owed: number; lesson: number | null }
export const EMPTY_METER: Meter = { halves: 0, chestsToday: 0, day: '', owed: 0, lesson: null };

export type LessonKind = 'first' | 'extra';
/** A finished lesson as the meter sees it: the day's first (daily) or an extra one, its day, and its key (startedAt). */
export interface Lesson { kind: LessonKind; day: string; key: number }

/** What one lesson did, for the Celebration: the boat sails from `from` (0–2), `chests` open, and the meter ends at `left`. */
export interface MeterFill { counted: boolean; from: number; chests: number; left: number; capped: boolean; banked: number }

/** The lesson a finished record counts as; null for free play and for a record with nothing done in it. */
export function lessonOf(rec: Pick<SessionRecord, 'free' | 'extra' | 'completedSteps' | 'date' | 'startedAt'>): Lesson | null {
  if (rec.free || rec.completedSteps.length === 0) return null;
  return { kind: rec.extra ? 'extra' : 'first', day: rec.date, key: rec.startedAt };
}

export function fillMeter(kid: KidState, lesson: Lesson): { kid: KidState; fill: MeterFill } {
  const m = kid.meter;
  const sameDay = m.day === lesson.day;
  if (m.lesson === lesson.key) {
    return { kid, fill: { counted: false, from: m.halves, chests: 0, left: m.halves, capped: sameDay && m.chestsToday >= CHESTS_PER_DAY, banked: 0 } };
  }
  // a new day: its chests start again, and what was banked joins the meter (spec §3: the first lesson adds its 2 on top)
  let halves = sameDay ? m.halves : m.halves + (kid.bank ?? 0);
  let bank = sameDay ? kid.bank ?? 0 : 0;
  let chestsToday = sameDay ? m.chestsToday : 0;
  // today's first chest was opened before the meter existed (lastChestDate: today's first-chest marker)
  const openedBefore = !sameDay && lesson.kind === 'first' && kid.lastChestDate === lesson.day;
  if (openedBefore) chestsToday = 1;
  const add = openedBefore ? 0 : lesson.kind === 'first' ? FIRST_HALVES : EXTRA_HALVES;
  const from = Math.min(halves, METER_FULL);
  let chests = 0;
  let banked = 0;
  if (chestsToday >= CHESTS_PER_DAY) {
    banked = Math.min(BANK_MAX, bank + add) - bank;
    bank += banked;
  } else {
    halves += add;
    while (halves >= METER_FULL && chestsToday < CHESTS_PER_DAY) {
      halves -= METER_FULL;
      chests++;
      chestsToday++;
    }
  }
  const meter: Meter = { halves, chestsToday, day: lesson.day, owed: m.owed + chests, lesson: lesson.key };
  return { kid: { ...kid, meter, bank }, fill: { counted: true, from, chests, left: halves, capped: chestsToday >= CHESTS_PER_DAY, banked } };
}

/** The line under the boat (spec §3): the day's chests are done, or the boat is half way; else none. */
export function meterLine(fill: Pick<MeterFill, 'left' | 'capped'>): string | null {
  if (fill.capped) return CAPPED_LINE;
  return fill.left === 1 ? HALF_LINE : null;
}

/** Where Home's small boat sits on `day`: today's meter, or a new day's with the bank in it (as the first lesson will count it). */
export function meterShown(kid: KidState, day: string): { halves: number; capped: boolean } {
  const m = kid.meter;
  if (m.day === day) return { halves: Math.min(m.halves, METER_FULL), capped: m.chestsToday >= CHESTS_PER_DAY };
  return { halves: Math.min(m.halves + (kid.bank ?? 0), METER_FULL), capped: false };
}

const count = (n: unknown, max: number) => (typeof n === 'number' && Number.isInteger(n) && n > 0 ? Math.min(n, max) : 0);

export function normalizeMeter(v: unknown): Meter {
  const x = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof Meter, unknown>>;
  return {
    halves: count(x.halves, METER_FULL - 1),
    chestsToday: count(x.chestsToday, CHESTS_PER_DAY),
    day: typeof x.day === 'string' ? x.day : '',
    owed: count(x.owed, OWED_MAX),
    lesson: typeof x.lesson === 'number' && Number.isFinite(x.lesson) ? x.lesson : null,
  };
}

export const normalizeBank = (v: unknown): number => count(v, BANK_MAX);
```

- [ ] **Step 4: Add the fields to the kid and normalise them on load**

In `src/types.ts`, add an import beside the `DEFAULT_FINDS` import:

```ts
import { EMPTY_METER, type Meter } from './fun/meter';
```

In `interface KidState`, after `starredUpTo?: number;`, add:

```ts
  meter: Meter; // the river meter toward the chest (rewards spec 2026-10-15 §3)
  bank?: number; // halves earned past the day's 2 chests, waiting for tomorrow (at most one full meter)
```

In `DEFAULT_KID`, after `finds: DEFAULT_FINDS,`, add:

```ts
  meter: EMPTY_METER,
```

In `src/store/repo.ts`, add the import:

```ts
import { normalizeBank, normalizeMeter } from '../fun/meter';
```

In `normalizeKid`'s returned object, after `finds: normalizeFinds(kid.finds),`, add:

```ts
    meter: normalizeMeter(kid.meter),
    bank: normalizeBank(kid.bank),
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/fun/meter.test.ts src/store/repo.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Run the fast suite**

Run: `npm run test:fast`
Expected: PASS. A test that compares a whole kid record with `toEqual` against a literal without `meter` must add `meter: EMPTY_METER`; fix any such test.

- [ ] **Step 7: Commit**

```bash
git add src/fun/meter.ts src/fun/meter.test.ts src/types.ts src/store/repo.ts src/store/repo.test.ts
git commit -m "feat(rewards): the river meter: first lesson 2 halves, extra 1, 2 chests a day, a bank for tomorrow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The chest: groups in rotation, removed sets kept for owners, Wardrobe shelves

**Files:**
- Modify: `src/fun/costumes.ts` (whole catalogue section and the chest), `src/fun/costumes.test.ts` (rewrite), `src/app/Wardrobe.tsx:5,78-110`, `src/app/home.test.tsx:144-151`, `src/app/Celebration.tsx:122-133` (call site), `src/app/celebration.slow.test.tsx:27-55`, `src/parent/SettingsPanel.tsx:153`, `scripts/fit-profile.test.ts:35-38`

**Interfaces:**
- Consumes: `Meter`/`EMPTY_METER` (Task 1); `ACCESSORIES`, `CHEST_BONUS_STARS` from `./pet`.
- Produces (`src/fun/costumes.ts`):
  - id types: `AnimalId`, `JobId`, `ChineseId`, `GreekId`, `OldOutfitId`, `CostumeId` (the union of all six);
  - `type CostumeSet = 'zodiac' | 'animal' | 'job' | 'chinese' | 'greek' | 'old'`;
  - catalogue arrays: `ONESIES` (the zodiac 12, unchanged), `ANIMALS` (empty for now, filled by Tasks 8–9), `JOBS`, `CHINESE`, `GREEK`, `OLD_OUTFITS`, `COSTUMES`;
  - `inChest(c: Costume): boolean`;
  - `CHEST_COSTUMES: Costume[]`;
  - `type PrizeGroup = 'onesie' | 'story' | 'accessory'`;
  - `prizeGroup(c: Costume): Exclude<PrizeGroup, 'accessory'>`;
  - `costumesLeft(kid: KidState): number`;
  - `openChest(kid: KidState, today: string): { kid: KidState; result: ChestResult }`. It sets `lastChestDate = today` and takes one from `meter.owed`. There is no zodiac argument now.
- `canOpenChest` stays unchanged until Task 4. `OUTFITS`, `OutfitId` and `MythId` are removed.

- [ ] **Step 1: Write the failing tests**

Replace `src/fun/costumes.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { addDays, localDateKey } from '../lib/date';
import { DEFAULT_KID, type KidState } from '../types';
import { costumeLayer } from '../ui/truffle/costumes';
import { CHEST_COSTUMES, CHINESE, costumeById, COSTUMES, costumesLeft, GREEK, inChest, JOBS, OLD_OUTFITS, ONESIES, openChest, prizeGroup, visibleAccessory, type ChestResult } from './costumes';
import { EMPTY_METER } from './meter';
import { ACCESSORIES } from './pet';

const day = (d: number) => localDateKey(addDays(new Date(2026, 10, 1), d));
const groupOf = (r: ChestResult) => (r.kind === 'accessory' ? 'accessory' : r.kind === 'stars' ? 'stars' : prizeGroup(costumeById(r.id)!));

describe('the costume catalogue (rewards spec §5.2)', () => {
  it('keeps the 12 zodiac onesies; jobs and Chinese myths are in the chest; Greek and the old outfits are out of it', () => {
    expect(ONESIES.map((c) => c.zh)).toEqual(['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']);
    expect(CHINESE.map((c) => c.zh)).toEqual(['孙悟空', '哪吒', '嫦娥', '后羿', '财神', '招财猫', '舞狮']);
    expect(GREEK).toHaveLength(23);
    expect(OLD_OUTFITS.map((c) => c.zh)).toEqual(['探险家', '超人', '像素', '雨衣', '机器人', '城堡', '篮球服', '柔术服']);
    expect(costumeById('football')).toMatchObject({ zh: '足球员', py: 'zú qiú yuán', set: 'job' }); // its id is kept: owned ones stay owned
    expect(JOBS.every(inChest) && CHINESE.every(inChest) && ONESIES.every(inChest)).toBe(true);
    expect(CHEST_COSTUMES.some((c) => c.set === 'greek' || c.set === 'old')).toBe(false);
    expect(new Set(COSTUMES.map((c) => c.id)).size).toBe(COSTUMES.length);
    expect(costumeById('nope')).toBeUndefined();
  });
  it('names carry one pinyin syllable per character', async () => {
    const { ACCESSORY_DEFS } = await import('./accessories');
    for (const d of [...COSTUMES, ...ACCESSORY_DEFS]) expect(d.py.split(' ').length, d.zh).toBe([...d.zh].length);
  });
  it('accessories are add-ons: they show with any costume', () => {
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'scarf', outfit: 'tiger' })).toBe('scarf');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'bogus', outfit: null })).toBeNull();
  });
});

describe('the chest (rewards spec §5.3)', () => {
  it('a round is a onesie, then a job or myth, then an accessory, before any group repeats', () => {
    let kid: KidState = { ...DEFAULT_KID };
    const groups: string[] = [];
    for (let d = 0; d < 9; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      groups.push(groupOf(result));
      kid = next;
    }
    expect(groups).toEqual(['onesie', 'story', 'accessory', 'onesie', 'story', 'accessory', 'onesie', 'story', 'accessory']);
  });
  it('a group already ahead waits: a profile with many onesies gets jobs, myths and accessories first', () => {
    const kid = { ...DEFAULT_KID, ownedCostumes: ['rat', 'ox', 'tiger'] };
    expect(groupOf(openChest(kid, day(0)).result)).toBe('story');
  });
  it('never repeats, never gives a removed item, and ends in 3 bonus stars (review focus 5)', () => {
    let kid: KidState = { ...DEFAULT_KID, ownedCostumes: ['zeus', 'robot'] };
    const seen = new Set<string>();
    for (let d = 0; d < CHEST_COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      expect(result.kind).not.toBe('stars');
      const key = result.kind === 'costume' ? result.id : result.kind === 'accessory' ? result.item : '';
      if (result.kind === 'costume') expect(inChest(costumeById(result.id)!), key).toBe(true);
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      kid = next;
    }
    const end = openChest(kid, '2027-06-01');
    expect(end.result).toEqual({ kind: 'stars', amount: 3 });
    expect(end.kid.bonusStars).toBe(kid.bonusStars + 3);
    expect(end.kid.ownedCostumes).toEqual(expect.arrayContaining(['zeus', 'robot'])); // what he had stays
  });
  it('opening takes one owed chest and marks the day', () => {
    const { kid } = openChest({ ...DEFAULT_KID, meter: { ...EMPTY_METER, owed: 2 } }, '2026-10-15');
    expect(kid.meter.owed).toBe(1);
    expect(kid.lastChestDate).toBe('2026-10-15');
    expect(openChest(kid, '2026-10-15').kid.meter.owed).toBe(0);
    expect(openChest({ ...DEFAULT_KID }, '2026-10-15').kid.meter.owed).toBe(0); // never below 0
  });
  it('the same day and the same owned things always give the same prize', () => {
    expect(openChest(DEFAULT_KID, '2026-10-05').result).toEqual(openChest(DEFAULT_KID, '2026-10-05').result);
  });
  it('unknown owned ids are ignored', () => {
    expect(openChest({ ...DEFAULT_KID, ownedCostumes: ['bogus'] }, '2026-10-02').result.kind).toBe('costume');
  });
  it('a dragon-era profile: a migrated accessory is never awarded again, and the chest still ends in stars', async () => {
    const { normalizeKid } = await import('../store/repo');
    let kid = normalizeKid({ ...DEFAULT_KID, ownedAccessories: ['👑', '🎓', '⭐'], wearing: '👑', ownedCostumes: ['tiger'] })!;
    const owned = new Set(kid.ownedAccessories);
    for (let d = 0; d < CHEST_COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      if (result.kind === 'accessory') expect(owned.has(result.item)).toBe(false);
      if (result.kind === 'accessory') owned.add(result.item);
      kid = next;
    }
    expect(openChest(kid, '2027-06-01').result).toEqual({ kind: 'stars', amount: 3 });
  });
  it('how many new clothes are left in it (the chest goal)', () => {
    expect(costumesLeft(DEFAULT_KID)).toBe(CHEST_COSTUMES.length);
    expect(costumesLeft({ ...DEFAULT_KID, ownedCostumes: ['tiger', 'zeus'] })).toBe(CHEST_COSTUMES.length - 1); // zeus is not in the chest
  });
  it('a costume from the chest is a real costume id (checked by tsc in the build)', () => {
    // @ts-expect-error not a costume
    const bad: ChestResult = { kind: 'costume', id: 'banana' };
    expect(bad.kind).toBe('costume');
  });
});

describe('costumes out of the chest stay his (rewards spec §5.2, review focus 5)', () => {
  it('every Greek and old costume still draws, for whoever owns it', () => {
    for (const c of COSTUMES.filter((x) => !inChest(x))) expect(costumeLayer(c.id), c.id).not.toBeNull();
  });
});

describe('telling the onesies apart (parent, 2026-10-06; rewards spec §5.1: one dominant colour each)', () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const far = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]!)) > 70;
  /** Lookalike pairs; each costume task adds its own (only pairs whose costumes exist are checked). */
  const PAIRS: [string, string][] = [['ox', 'horse'], ['ox', 'monkey'], ['ox', 'dog'], ['horse', 'monkey'], ['horse', 'dog'], ['monkey', 'dog'], ['dragon', 'snake'], ['rabbit', 'goat']];
  it('the lookalikes never share a colour', () => {
    for (const [a, b] of PAIRS) {
      const ca = costumeById(a);
      const cb = costumeById(b);
      if (ca && cb) expect(far(ca.color, cb.color), `${a} vs ${b}`).toBe(true);
    }
  });
});
```

In `src/app/home.test.tsx`, replace the test `'has four shelves: 生肖, 衣服, 希腊 and 中国 …'` (lines 145–151) with:

```tsx
  it('chest shelves first; 希腊 and 以前的衣服 show only what he owns of them (rewards spec §5.2)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['zeus', 'wukong', 'robot'] } });
    renderWithApp(<Wardrobe />, app);
    const shelves = [...(await screen.findAllByRole('heading', { level: 2 }))].map((h) => h.querySelector('.sr-only')?.textContent ?? h.textContent);
    expect(shelves[0]).toBe('生肖');
    expect(shelves).toContain('职业');
    expect(shelves.indexOf('希腊')).toBe(shelves.indexOf('中国') + 1);
    expect(shelves.indexOf('以前的衣服')).toBe(shelves.indexOf('希腊') + 1);
    expect(screen.getByRole('button', { name: '宙斯' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: '机器人' })).toHaveProperty('disabled', false);
    expect(screen.queryByRole('button', { name: '赫拉' })).toBeNull(); // out of the chest and not his: not on the shelf
    expect(screen.getByRole('button', { name: '孙悟空' })).toHaveProperty('disabled', false);
  });
  it('no 希腊 or 以前的衣服 shelf for a child who owns none of them', async () => {
    renderWithApp(<Wardrobe />, await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'] } }));
    const shelves = [...(await screen.findAllByRole('heading', { level: 2 }))].map((h) => h.querySelector('.sr-only')?.textContent ?? h.textContent);
    expect(shelves).not.toContain('希腊');
    expect(shelves).not.toContain('以前的衣服');
  });
```

In `src/app/celebration.slow.test.tsx`, add `import { CHEST_COSTUMES, costumeById } from '../fun/costumes';`. Then edit two tests:
- In `'gives one prize however fast the chest is tapped'`, replace the four lines from `await screen.findByText('松露有新衣服了！');` to `expect(kid?.ownedCostumes).toEqual(['dragon']);` with:

```tsx
    await screen.findByText('松露有新衣服了！'); // a round's first prize is a onesie (rewards spec §5.3)
    const id = document.querySelector('.prize svg.truffle')?.getAttribute('data-outfit');
    expect(CHEST_COSTUMES.find((c) => c.id === id)?.kind).toBe('onesie');
    await waitFor(async () => expect((await getKid(app.db))?.lastChestDate).toBe('2026-10-02'));
    const kid = await getKid(app.db);
    expect(kid?.ownedCostumes).toEqual([id]);
```

- In `'opening adds nothing above the chest …'`, replace the last line with:

```tsx
    const id = document.querySelector('.prize svg.truffle')!.getAttribute('data-outfit')!;
    expect(document.querySelector('.prize .prize__label')!.textContent).toContain(costumeById(id)!.zh); // its name at his feet
```

In `scripts/fit-profile.test.ts`, change `openChest(kid, '2026-10-06', null)` to `openChest(kid, '2026-10-06')`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/fun/costumes.test.ts`
Expected: FAIL. `CHEST_COSTUMES`, `JOBS`, `OLD_OUTFITS`, `inChest`, `prizeGroup` and `costumesLeft` are not exported.

- [ ] **Step 3: Rewrite the catalogue and the chest**

In `src/fun/costumes.ts`, replace everything from `export type OutfitId = …` down to the end of the file (keep the imports and the `ZodiacId` re-export) with:

```ts
/** The new onesies (rewards spec 2026-10-15 §5.2): river creatures and his favourites. */
export type AnimalId = 'otter' | 'hornbill' | 'panda' | 'frog' | 'duck' | 'dragonfly' | 'babydino' | 'pterosaur' | 'koi' | 'crab' | 'parrot' | 'magpie' | 'penguin' | 'shark' | 'unicorn' | 'owl' | 'tigercub' | 'bunny';
/** Jobs, drawn full-body. `football` keeps its id (owned ones stay owned) and is now 足球员. */
export type JobId = 'astronaut' | 'chef' | 'firefighter' | 'doctor' | 'pilot' | 'police' | 'football' | 'wizard' | 'pirate' | 'hawker';
export type ChineseId = 'wukong' | 'nezha' | 'change' | 'houyi' | 'caishen' | 'luckycat' | 'liondance';
/** Out of the chest (spec §5.2): kept, in their old art, for whoever owns them. */
export type GreekId =
  | 'zeus' | 'hera' | 'poseidon' | 'demeter' | 'athena' | 'apollo' | 'artemis' | 'ares' | 'aphrodite' | 'hephaestus' | 'hermes' | 'dionysus' | 'hades' | 'hestia'
  | 'heracles' | 'odysseus' | 'perseus' | 'achilles' | 'theseus' | 'jason' | 'medusa' | 'minotaur' | 'cerberus';
export type OldOutfitId = 'explorer' | 'hero' | 'pixel' | 'raincoat' | 'robot' | 'rook' | 'basketball' | 'gi';
export type CostumeId = ZodiacId | AnimalId | JobId | ChineseId | GreekId | OldOutfitId;
/** His wardrobe's shelves: 生肖, 动物 (the new onesies), 职业, 中国, and the two out of the chest, 希腊 and 以前的衣服. */
export type CostumeSet = 'zodiac' | 'animal' | 'job' | 'chinese' | 'greek' | 'old';

export interface Costume {
  id: CostumeId;
  kind: 'onesie' | 'outfit'; // how it's drawn: an animal hood, or clothes and things he holds
  set: CostumeSet;
  zh: string;
  py: string;
  color: string; // its one dominant colour (rewards spec §5.1)
}

const shelf = (set: CostumeSet, kind: Costume['kind']) => (id: CostumeId, zh: string, py: string, color: string, k: Costume['kind'] = kind): Costume => ({ id, kind: k, set, zh, py, color });
const o = shelf('zodiac', 'onesie');
const j = shelf('job', 'outfit');
const c = shelf('chinese', 'outfit');
const g = shelf('greek', 'outfit');
const old = shelf('old', 'outfit');

/** The 12 生肖, in zodiac order. */
export const ONESIES: Costume[] = [
  // colours kept apart, so the lookalikes (ox/horse/monkey/dog, dragon/snake, rabbit/goat) never share one (parent, 2026-10-06)
  o('rat', '鼠', 'shǔ', '#9d9cad'), o('ox', '牛', 'niú', '#f7f4ee'), o('tiger', '虎', 'hǔ', '#ffa53d'),
  o('rabbit', '兔', 'tù', '#fdf6f9'), o('dragon', '龙', 'lóng', '#3fae66'), o('snake', '蛇', 'shé', '#b4cf4a'),
  o('horse', '马', 'mǎ', '#c77b3f'), o('goat', '羊', 'yáng', '#e6d3a3'), o('monkey', '猴', 'hóu', '#6b4a3a'),
  o('rooster', '鸡', 'jī', '#e0533c'), o('dog', '狗', 'gǒu', '#e8c27a'), o('pig', '猪', 'zhū', '#ffb3c7'),
];

/** The 18 new onesies, added with their art (Tasks 8–9). */
export const ANIMALS: Costume[] = [];

/** Jobs (spec §5.2). The rest are added with their full-body art (Task 10). */
export const JOBS: Costume[] = [
  j('astronaut', '宇航员', 'yǔ háng yuán', '#f2f4f8'), j('chef', '厨师', 'chú shī', '#fffdf7'), j('wizard', '魔法师', 'mó fǎ shī', '#7b5cd6'),
  j('pirate', '海盗', 'hǎi dào', '#2f4a7a'), j('football', '足球员', 'zú qiú yuán', '#d8262e'),
];

/** Chinese myths, and the fortune cat and the lion dance. */
export const CHINESE: Costume[] = [
  c('wukong', '孙悟空', 'sūn wù kōng', '#f2a03d'), c('nezha', '哪吒', 'né zhā', '#e0533c'), c('change', '嫦娥', 'cháng é', '#f6e7f0'),
  c('houyi', '后羿', 'hòu yì', '#8a5a3c'), c('caishen', '财神', 'cái shén', '#c8102e'), c('luckycat', '招财猫', 'zhāo cái māo', '#c8102e'),
  c('liondance', '舞狮', 'wǔ shī', '#e0362c', 'onesie'),
];

/** Every Greek god, the heroes and the creatures (parent, 2026-10-06), out of the chest since 2026-10-15. */
export const GREEK: Costume[] = [
  g('zeus', '宙斯', 'zhòu sī', '#fbfaf6'), g('hera', '赫拉', 'hè lā', '#5b6fd6'), g('poseidon', '波塞冬', 'bō sài dōng', '#2fa3a0'),
  g('demeter', '得墨忒耳', 'dé mò tè ěr', '#8fb84a'), g('athena', '雅典娜', 'yǎ diǎn nà', '#e9eef6'), g('apollo', '阿波罗', 'ā bō luó', '#ffd54a'),
  g('artemis', '阿耳忒弥斯', 'ā ěr tè mí sī', '#4f9a6a'), g('ares', '阿瑞斯', 'ā ruì sī', '#b3261e'), g('aphrodite', '阿佛洛狄忒', 'ā fó luò dí tè', '#ffb3c7'),
  g('hephaestus', '赫菲斯托斯', 'hè fēi sī tuō sī', '#8a5a3c'), g('hermes', '赫尔墨斯', 'hè ěr mò sī', '#f2a03d'), g('dionysus', '狄俄尼索斯', 'dí é ní suǒ sī', '#7b4fa6'),
  g('hades', '哈迪斯', 'hā dí sī', '#3b3049'), g('hestia', '赫斯提亚', 'hè sī tí yà', '#e8743b'),
  g('heracles', '赫拉克勒斯', 'hè lā kè lè sī', '#d9a441'), g('odysseus', '奥德修斯', 'ào dé xiū sī', '#3f6fb5'), g('perseus', '珀耳修斯', 'pò ěr xiū sī', '#6d8fb3'),
  g('achilles', '阿喀琉斯', 'ā kā liú sī', '#e0b13a'), g('theseus', '忒修斯', 'tè xiū sī', '#9c4f2c'), g('jason', '伊阿宋', 'yī ā sòng', '#2f4a7a'),
  g('medusa', '美杜莎', 'měi dù shā', '#6fae5a'), g('minotaur', '米诺陶洛斯', 'mǐ nuò táo luò sī', '#7a4a2a', 'onesie'),
  g('cerberus', '刻耳柏洛斯', 'kè ěr bó luò sī', '#4a4550', 'onesie'),
];

/** The old outfits not among the jobs (spec §5.2): out of the chest, kept for owners. */
export const OLD_OUTFITS: Costume[] = [
  old('explorer', '探险家', 'tàn xiǎn jiā', '#c9a86a'), old('hero', '超人', 'chāo rén', '#ff4a3d'), old('pixel', '像素', 'xiàng sù', '#5ccf7a'),
  old('raincoat', '雨衣', 'yǔ yī', '#ffd23f'), old('robot', '机器人', 'jī qì rén', '#c9d1dc'), old('rook', '城堡', 'chéng bǎo', '#efe4cc'),
  old('basketball', '篮球服', 'lán qiú fú', '#2f6fd6'), old('gi', '柔术服', 'róu shù fú', '#fbfaf6'),
];

export const COSTUMES: Costume[] = [...ONESIES, ...ANIMALS, ...JOBS, ...CHINESE, ...GREEK, ...OLD_OUTFITS];

export const costumeById = (id: string | null | undefined): Costume | undefined => COSTUMES.find((x) => x.id === id);

const CHEST_SETS: ReadonlySet<CostumeSet> = new Set(['zodiac', 'animal', 'job', 'chinese']);
/** In the chest (spec §5.2): the zodiac and new onesies, the jobs, the Chinese myths. */
export const inChest = (x: Costume): boolean => CHEST_SETS.has(x.set);
export const CHEST_COSTUMES: Costume[] = COSTUMES.filter(inChest);

/** Accessories are add-ons (face, neck, paw, back), so they show with any costume; unknown values show nothing. */
export function visibleAccessory(kid: KidState): string | null {
  return accessoryById(kid.wearing) ? kid.wearing : null;
}

export type ChestResult = { kind: 'costume'; id: CostumeId } | { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };

/** The chest's groups, in the order a round gives them (spec §5.3): a onesie, then a job or myth ("story"), then an accessory. */
export type PrizeGroup = 'onesie' | 'story' | 'accessory';
const ROUND: PrizeGroup[] = ['onesie', 'story', 'accessory'];
export const prizeGroup = (x: Costume): Exclude<PrizeGroup, 'accessory'> => (x.set === 'zodiac' || x.set === 'animal' ? 'onesie' : 'story');

/** New clothes still in the chest (the chest goal, spec §4). */
export const costumesLeft = (kid: KidState): number => CHEST_COSTUMES.filter((x) => !kid.ownedCostumes.includes(x.id)).length;

/** Call only after today's daily (not free-play) session is complete. Task 4 replaces this with the meter's owed chests. */
export function canOpenChest(kid: KidState, today: string): boolean {
  return kid.lastChestDate !== today;
}

type Prize = Exclude<ChestResult, { kind: 'stars' }>;

/**
 * One chest (spec §5.3): the group furthest behind in its round comes next (ties in round order), and a seeded pick within it
 * from what he doesn't own; everything owned gives 3 bonus stars. Opening takes one owed chest and marks the day.
 */
export function openChest(kid: KidState, today: string): { kid: KidState; result: ChestResult } {
  const opened = { lastChestDate: today, meter: { ...kid.meter, owed: Math.max(0, kid.meter.owed - 1) } };
  const owned = (grp: PrizeGroup) =>
    grp === 'accessory' ? ACCESSORIES.filter((a) => kid.ownedAccessories.includes(a)).length : CHEST_COSTUMES.filter((x) => prizeGroup(x) === grp && kid.ownedCostumes.includes(x.id)).length;
  const left = (grp: PrizeGroup): Prize[] =>
    grp === 'accessory'
      ? ACCESSORIES.filter((a) => !kid.ownedAccessories.includes(a)).map((item) => ({ kind: 'accessory' as const, item }))
      : CHEST_COSTUMES.filter((x) => prizeGroup(x) === grp && !kid.ownedCostumes.includes(x.id)).map((x) => ({ kind: 'costume' as const, id: x.id }));
  const open = ROUND.filter((grp) => left(grp).length > 0);
  if (!open.length) {
    return { kid: { ...kid, ...opened, bonusStars: kid.bonusStars + CHEST_BONUS_STARS }, result: { kind: 'stars', amount: CHEST_BONUS_STARS } };
  }
  const group = open.reduce((best, grp) => (owned(grp) < owned(best) ? grp : best));
  const pool = left(group);
  const pick = pool[Math.floor(mulberry32(seedFromString(`${today}#${kid.ownedCostumes.length + kid.ownedAccessories.length}`))() * pool.length)]!;
  if (pick.kind === 'costume') return { kid: { ...kid, ...opened, ownedCostumes: [...kid.ownedCostumes, pick.id] }, result: pick };
  return { kid: { ...kid, ...opened, ownedAccessories: [...kid.ownedAccessories, pick.item] }, result: pick };
}
```

- [ ] **Step 4: Show the shelves, call the new chest, update the Settings copy**

In `src/app/Wardrobe.tsx`, change the costumes import to:

```ts
import { ANIMALS, CHINESE, GREEK, inChest, JOBS, OLD_OUTFITS, ONESIES, type Costume } from '../fun/costumes';
```

Add this above `export function Wardrobe()`:

```ts
/** His shelves (rewards spec §5.2): the chest's four, then 希腊 and 以前的衣服, which only show what he owns of them. */
const SHELVES: [string, Costume[]][] = [['生肖', ONESIES], ['动物', ANIMALS], ['职业', JOBS], ['中国', CHINESE], ['希腊', GREEK], ['以前的衣服', OLD_OUTFITS]];
```

Replace the shelf loop's opening `{([['生肖', ONESIES], ['衣服', OUTFITS], ['希腊', GREEK], ['中国', CHINESE]] as const).map(([title, list]) => (` and its `<section …>` wrapper with a block body that filters the list first:

```tsx
            {SHELVES.map(([title, all]) => {
              // out of the chest: only what he owns, and no shelf at all if he owns none (spec §5.2)
              const list = all.some(inChest) ? all : all.filter((x) => k.ownedCostumes.includes(x.id));
              if (!list.length) return null;
              return (
                <section key={title}>
                  <h2><Label zh={title} /></h2>
                  <div class="outfit-grid">
                    {list.map((c) => {
                      /* the existing per-costume button, unchanged */
                    })}
                  </div>
                </section>
              );
            })}
```

Keep the existing per-costume `<button class="outfit …">` body exactly as it is inside `list.map((c) => { … })`.

In `src/app/Celebration.tsx` `open()`, change `openChest(kidRef.current, rec.date, settings.zodiac)` to `openChest(kidRef.current, rec.date)`.

In `src/parent/SettingsPanel.tsx:153`, change the label text to `Zodiac (生肖)`. The chest no longer gives the zodiac onesie first (spec §5.3).

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/fun/costumes.test.ts scripts/fit-profile.test.ts src/app/home.test.tsx && npx vitest run src/app/celebration.slow.test.tsx && npx tsc --noEmit`
Expected: PASS. `tsc` must find no remaining use of `OUTFITS`, `OutfitId` or `MythId`. Run `grep -rn "OUTFITS\b\|OutfitId\|MythId" src scripts` and fix any use left; `OLD_OUTFITS` is fine.

- [ ] **Step 6: Commit**

```bash
git add src/fun/costumes.ts src/fun/costumes.test.ts src/app/Wardrobe.tsx src/app/home.test.tsx src/app/Celebration.tsx src/app/celebration.slow.test.tsx src/parent/SettingsPanel.tsx scripts/fit-profile.test.ts
git commit -m "feat(rewards): the chest rotates onesie, job or myth, accessory; Greek and old outfits kept for owners only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: "Almost there" goals: `almostThere` and the one-day-away list

**Files:**
- Create: `src/fun/goals.ts`, `src/fun/goals.test.ts`
- Modify: `src/stats/produce.ts:24-45` (`closestToProduce` → `oneDayAway`), `src/stats/produce.test.ts`

**Interfaces:**
- Consumes: `costumesLeft` (Task 2), `CHESTS_PER_DAY`/`METER_FULL` (Task 1), `POWERS`/`tierFor`/`PowerId`, `StickerFamily`, `WORLDS`, `localDateKey`, `IconName`.
- Produces:
  - in `src/stats/produce.ts`: `interface OneDayAway { text: string; kind: 'write' | 'say'; at: number }` and `oneDayAway(cards, logs, wordOf): OneDayAway[]` (newest first, each word once);
  - in `src/fun/goals.ts`:
    - `type GoalKind = 'write' | 'chest' | 'badge' | 'power' | 'world'`;
    - `interface Goal { kind: GoalKind; zh: string; icon: IconName; effort: number }`;
    - `interface GoalFacts { journey: number; oneDay: OneDayAway[]; lessonChars: ReadonlySet<string>; counted: boolean; families: StickerFamily[]; powers: Record<PowerId, string[]> }`;
    - `MAX_GOALS = 3`, `WEEK_REACH = 15`;
    - `almostThere(kid: KidState, know: Pick<Knowledge, 'knownChars'>, facts: GoalFacts, now: Date): Goal[]`.

- [ ] **Step 1: Write the failing tests**

In `src/stats/produce.test.ts`, add `oneDayAway` to the import from `./produce`, and add inside `describe('closest (spec 2026-10-11 §5)', …)`:

```ts
  it('oneDayAway: each word once, with the skill and its day (rewards spec §4: the can-write-tomorrow goals)', () => {
    const cards = [card('b:森', 'write'), card('b:林', 'say')];
    expect(oneDayAway(cards, [write('b:森', 3), say('b:林', 4)], wordOf)).toEqual([{ text: '林', kind: 'say', at: at(4) }, { text: '森', kind: 'write', at: at(3) }]);
  });
```

Create `src/fun/goals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_KID, type KidState } from '../types';
import { CHEST_COSTUMES } from './costumes';
import { almostThere, type GoalFacts } from './goals';
import { POWERS, type PowerId } from './powers';
import type { StickerFamily } from './stickers';

const NOW = new Date(2026, 9, 15, 17, 0);
const T = NOW.getTime();
const noPowers = Object.fromEntries(POWERS.map((p) => [p.id, []])) as unknown as Record<PowerId, string[]>;
const facts = (over: Partial<GoalFacts> = {}): GoalFacts => ({ journey: 0, oneDay: [], lessonChars: new Set(), counted: false, families: [], powers: noPowers, ...over });
/** Owns every chest costume: no chest goal unless a test wants one. */
const allOwned: KidState = { ...DEFAULT_KID, ownedCostumes: CHEST_COSTUMES.map((c) => c.id) };
const know = (chars: string) => ({ knownChars: new Set([...chars]) });
const wood: StickerFamily = { component: '木', meaning: { zh: '树木', en: 'tree', icon: 'tree' }, chars: ['林', '森', '树', '村'] };

describe('almost there (rewards spec §4)', () => {
  it('nothing near: nothing shown', () => {
    expect(almostThere(allOwned, know(''), facts(), NOW)).toEqual([]); // 雨林 is 30 away and the lesson moved nothing
  });
  it('the next world: close, or moved by today', () => {
    expect(almostThere(allOwned, know(''), facts({ journey: 22 }), NOW)).toEqual([{ kind: 'world', zh: '还差 8 个字到 雨林', icon: 'mountain', effort: 8 }]);
    expect(almostThere(allOwned, know('水'), facts({ journey: 5, lessonChars: new Set(['水']) }), NOW)[0]).toMatchObject({ kind: 'world', effort: 25 });
  });
  it('the next power tier: 3 known, then half, then all', () => {
    const powers = { ...noPowers, water: ['河', '湖', '海', '洗', '没', '游'] };
    expect(almostThere(allOwned, know('河湖'), facts({ powers }), NOW)).toEqual([{ kind: 'power', zh: '再认识 1 个『水』字，解锁新能力', icon: 'drop', effort: 1 }]);
    expect(almostThere(allOwned, know('河湖海洗'), facts({ powers }), NOW)[0]).toMatchObject({ kind: 'power', effort: 2 });
  });
  it('can write or say tomorrow: up to two words, from the closest line', () => {
    const oneDay = [{ text: '鱼', kind: 'write' as const, at: T }, { text: '林', kind: 'say' as const, at: T - 1 }, { text: '森', kind: 'write' as const, at: T - 2 }];
    expect(almostThere(allOwned, know(''), facts({ oneDay }), NOW).map((g) => g.zh)).toEqual(['明天再写对『鱼』，就会写了！', '明天再说对『林』，就会说了！']);
  });
  it('the chest: the new clothes still in it, effort the halves to a full meter', () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 1, day: '2026-10-15', owed: 0, lesson: 1 } };
    expect(almostThere(kid, know(''), facts({ counted: true }), NOW)).toEqual([{ kind: 'chest', zh: `宝箱里还有 ${CHEST_COSTUMES.length} 件新衣服`, icon: 'gift', effort: 1 }]);
  });
  it('a badge: the family nearest to complete', () => {
    expect(almostThere(allOwned, know('林森'), facts({ families: [wood] }), NOW)).toEqual([{ kind: 'badge', zh: '再认识 2 个『木』字，得到新徽章', icon: 'medal', effort: 2 }]);
    expect(almostThere(allOwned, know('林森树村'), facts({ families: [wood] }), NOW)).toEqual([]); // complete: the Celebration's 新徽章 phase shows it instead
  });
  it('far away and untouched by today: left out; touched today: shown', () => {
    const big: StickerFamily = { ...wood, chars: Array.from({ length: 30 }, (_, i) => String.fromCharCode(0x4e00 + i)) };
    expect(almostThere(allOwned, know(''), facts({ families: [big] }), NOW)).toEqual([]);
    expect(almostThere(allOwned, know('一'), facts({ families: [big], lessonChars: new Set(['一']) }), NOW)[0]).toMatchObject({ kind: 'badge', effort: 29 });
  });
  it('ranks by the smallest effort (ties: write, chest, badge, power, world) and never shows more than 3', () => {
    const powers = { ...noPowers, water: ['河', '湖', '海', '洗'] };
    const goals = almostThere(DEFAULT_KID, know('河湖林森'), facts({ journey: 22, powers, families: [wood], oneDay: [{ text: '鱼', kind: 'write', at: T }], counted: true }), NOW);
    expect(goals.map((g) => g.kind)).toEqual(['write', 'power', 'chest']);
  });
});
```

The last test's efforts: write 1, power 1, chest 2, badge 2, world 8. Equal efforts are ordered write, chest, badge, power, world, so the top three are write, power, chest.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/fun/goals.test.ts src/stats/produce.test.ts`
Expected: FAIL. `goals.ts` and `oneDayAway` do not exist.

- [ ] **Step 3: Write `oneDayAway` and rebase `closestToProduce` on it**

In `src/stats/produce.ts`, replace `closestToProduce` (lines 24–45) with:

```ts
/** A word one more day from "can produce" (spec 2026-10-11 §5): which skill, and when its day was. */
export interface OneDayAway { text: string; kind: 'write' | 'say'; at: number }

/** Words with a write card at one passing day or a Say rung at one confirmed day, the most recent first, each word once. */
export function oneDayAway(cards: CardRecord[], logs: ReviewLog[], wordOf: (id: string) => Word | undefined): OneDayAway[] {
  const fastWrite = fastLimit(logs, 'write');
  const near: OneDayAway[] = [];
  for (const c of cards) {
    if (c.passed || (c.kind !== 'write' && c.kind !== 'say')) continue;
    const text = wordOf(c.wordId)?.text;
    if (!text) continue;
    if (c.kind === 'write') {
      const days = passDays(logs, c.id, fastWrite);
      if (days.length === 1) near.push({ text, kind: 'write', at: days[0]! });
    } else {
      const days = sayDays(logs, c.id);
      const at = logs.filter((l) => l.cardId === c.id && l.correct).reduce((m, l) => Math.max(m, l.at), 0);
      if (days.length === 1) near.push({ text, kind: 'say', at });
    }
  }
  const seen = new Set<string>();
  return near.sort((a, b) => b.at - a.at).filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)));
}

/** The words one more day from "can produce" (spec §5: 「还差一天：森、林」), at most 3. */
export function closestToProduce(cards: CardRecord[], logs: ReviewLog[], wordOf: (id: string) => Word | undefined): string[] {
  return oneDayAway(cards, logs, wordOf).map((x) => x.text).slice(0, CLOSEST_MAX);
}
```

- [ ] **Step 4: Write `almostThere`**

Create `src/fun/goals.ts`:

```ts
// "Almost there" goals (rewards spec 2026-10-15 §4): after every lesson, up to three things he is close to, nearest first.
import { localDateKey } from '../lib/date';
import type { OneDayAway } from '../stats/produce';
import type { Knowledge } from '../stats/stats';
import type { KidState } from '../types';
import type { IconName } from '../ui/icons/icons';
import { costumesLeft } from './costumes';
import { CHESTS_PER_DAY, METER_FULL } from './meter';
import { POWERS, tierFor, type PowerId } from './powers';
import type { StickerFamily } from './stickers';
import { WORLDS } from './worlds';

export type GoalKind = 'write' | 'chest' | 'badge' | 'power' | 'world';
/** A goal as the Celebration shows it: its line (Chinese, read with pinyin), its icon, and the effort left (for ranking). */
export interface Goal { kind: GoalKind; zh: string; icon: IconName; effort: number }

/** What the goals are worked out from, gathered once as the Celebration loads (src/app/celebrationData.ts). */
export interface GoalFacts {
  journey: number; // characters learned since placement (the worlds count these)
  oneDay: OneDayAway[]; // words one passing day from can-write / can-say
  lessonChars: ReadonlySet<string>; // characters whose Read passed today: what the lesson moved
  counted: boolean; // the lesson moved the river meter
  families: StickerFamily[];
  powers: Record<PowerId, string[]>;
}

export const MAX_GOALS = 3;
const MAX_ONE_DAY = 2;
/** Within reach this week: about a week of new characters at his pace. */
export const WEEK_REACH = 15;
const TIE_ORDER: GoalKind[] = ['write', 'chest', 'badge', 'power', 'world'];

/** The next power tier's threshold (tierFor's steps: 3 known, then half, then all). */
function nextTierAt(size: number, known: number): number {
  const t1 = Math.min(3, size);
  const t2 = Math.max(Math.ceil(size / 2), t1);
  return known < t1 ? t1 : known < t2 ? t2 : size;
}

export function almostThere(kid: KidState, know: Pick<Knowledge, 'knownChars'>, facts: GoalFacts, now: Date): Goal[] {
  const today = localDateKey(now);
  const touched = (chars: readonly string[]) => chars.some((ch) => facts.lessonChars.has(ch));
  const out: (Goal & { moved: boolean })[] = [];

  for (const w of facts.oneDay.slice(0, MAX_ONE_DAY)) {
    out.push({
      kind: 'write',
      zh: w.kind === 'write' ? `明天再写对『${w.text}』，就会写了！` : `明天再说对『${w.text}』，就会说了！`,
      icon: w.kind === 'write' ? 'pen' : 'mic',
      effort: 1,
      moved: localDateKey(new Date(w.at)) === today,
    });
  }

  const left = costumesLeft(kid);
  if (left > 0) {
    const capped = kid.meter.day === today && kid.meter.chestsToday >= CHESTS_PER_DAY;
    out.push({ kind: 'chest', zh: `宝箱里还有 ${left} 件新衣服`, icon: 'gift', effort: capped ? METER_FULL : METER_FULL - kid.meter.halves, moved: facts.counted });
  }

  const badge = facts.families
    .filter((f) => !kid.badgesSeen.includes(f.component))
    .map((f) => ({ f, need: f.chars.filter((ch) => !know.knownChars.has(ch)).length }))
    .filter((x) => x.need > 0)
    .sort((a, b) => a.need - b.need)[0];
  if (badge) out.push({ kind: 'badge', zh: `再认识 ${badge.need} 个『${badge.f.component}』字，得到新徽章`, icon: 'medal', effort: badge.need, moved: touched(badge.f.chars) });

  const power = POWERS.map((p) => {
    const chars = facts.powers[p.id] ?? [];
    const known = chars.filter((ch) => know.knownChars.has(ch)).length;
    return { p, chars, need: tierFor(chars.length, known) < 3 ? nextTierAt(chars.length, known) - known : 0 };
  })
    .filter((x) => x.need > 0)
    .sort((a, b) => a.need - b.need)[0];
  if (power) out.push({ kind: 'power', zh: `再认识 ${power.need} 个『${power.p.name}』字，解锁新能力`, icon: power.p.mark, effort: power.need, moved: touched(power.chars) });

  const next = WORLDS.find((w) => w.at > facts.journey);
  if (next) out.push({ kind: 'world', zh: `还差 ${next.at - facts.journey} 个字到 ${next.zh}`, icon: 'mountain', effort: next.at - facts.journey, moved: facts.lessonChars.size > 0 });

  return out
    .filter((g) => g.moved || g.effort <= WEEK_REACH)
    .sort((a, b) => a.effort - b.effort || TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(b.kind))
    .slice(0, MAX_GOALS)
    .map(({ moved: _moved, ...g }) => g);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/fun/goals.test.ts src/stats/produce.test.ts src/session/stars.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/fun/goals.ts src/fun/goals.test.ts src/stats/produce.ts src/stats/produce.test.ts
git commit -m "feat(rewards): almost-there goals: next world, power tier, write tomorrow, chest, badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Celebration: the river track, a lesson counted once, one chest phase per owed chest

**Files:**
- Create: `src/ui/RiverTrack.tsx`, `src/ui/riverTrack.test.tsx`, `src/app/celebrationData.ts`, `src/app/celebrationRiver.slow.test.tsx`
- Modify: `src/app/Celebration.tsx` (phases by index, river phase, chest phases, `open()`), `src/fun/costumes.ts` (delete `canOpenChest`), `src/styles.css`, `src/app/celebration.slow.test.tsx`, `src/app/celebrationStage.slow.test.tsx`

**Interfaces:**
- Consumes: `fillMeter`, `lessonOf`, `meterLine`, `METER_FULL`, `CHESTS_PER_DAY`, `MeterFill` (Task 1); `openChest` (Task 2); `BOAT`, `RIPPLE` from `src/ui/worlds/creatures/boat.ts`; `updateKid`, `getKid`, `saveKid`.
- Produces:
  - `RiverTrack({ from, to, mini?, onArrive? })` and `SAIL_MS = 900`;
  - `settleMeter(db: AppDb, rec: SessionRecord): Promise<{ kid: KidState; fill: MeterFill | null }>`;
  - Celebration phases `'stars' | 'river' | 'chest' | 'power' | 'badges'`, held in an ordered list in which a phase may repeat.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/riverTrack.test.tsx`:

```tsx
import { render, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
const motion = { reduced: false };
vi.mock('./motion', () => ({ reducedMotion: () => motion.reduced }));
import { RiverTrack } from './RiverTrack';

const boatX = () => (document.querySelector('.river__boat') as SVGGElement).style.transform;

describe('the river track (rewards spec §3)', () => {
  it('the boat sails from its old spot to its new one, then says it has arrived', async () => {
    motion.reduced = false;
    const arrived = vi.fn();
    render(<RiverTrack from={0} to={2} onArrive={arrived} />);
    expect(boatX()).toBe('translateX(0px)');
    await waitFor(() => expect(boatX()).toBe('translateX(244px)'));
    await waitFor(() => expect(arrived).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(document.querySelector('svg.river')!.getAttribute('data-halves')).toBe('2');
  });
  it('with reduced motion it is there at once', () => {
    motion.reduced = true;
    const arrived = vi.fn();
    render(<RiverTrack from={0} to={1} onArrive={arrived} />);
    expect(boatX()).toBe('translateX(122px)');
  });
  it('is drawn in light cel: the paper boat, no gradient, no clip-path', () => {
    const { container } = render(<RiverTrack from={1} to={1} mini />);
    expect(container.querySelector('svg.river--mini')).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/clip-path|Gradient|filter/);
    expect(container.querySelector('svg.river')!.getAttribute('aria-label')).toBe('小船走到一半了');
  });
});
```

Create `src/app/celebrationRiver.slow.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_METER } from '../fun/meter';
import { createSessionRecord } from '../session/runner';
import { getKid, saveKid } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type KidState, type SessionPlan, type SessionRecord } from '../types';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));

const DAY = '2026-10-02';
const plan: SessionPlan = { steps: ['newwords'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const lesson = (startedAt: number, extra = false): SessionRecord => ({ ...createSessionRecord(plan, DAY, startedAt), completed: true, completedSteps: ['newwords'], ...(extra ? { extra: true } : {}) });
const hold = () => new Promise((r) => setTimeout(r, 1300));
const river = () => document.querySelector('svg.river');

async function show(kid: Partial<KidState>, rec: SessionRecord) {
  const app = await makeAppData();
  await saveKid(app.db, { ...DEFAULT_KID, ...kid });
  const view = renderWithApp(<Celebration rec={rec} />, app);
  await screen.findByText('太棒了！');
  return { app, view };
}
const next = () => fireEvent.click(screen.getByText('继续'));
async function openTheChest() {
  const btn = (await screen.findByRole('button', { name: '按住打开宝箱' })) as HTMLButtonElement;
  await waitFor(() => expect(btn.disabled).toBe(false));
  fireEvent(btn, new Event('pointerdown', { bubbles: true }));
  await hold();
  await waitFor(() => expect(document.querySelector('.chest.is-open')).toBeTruthy());
}

describe('the river meter on the Celebration (rewards spec §3)', () => {
  it("after the day's first lesson the boat sails to the end and the chest opens", async () => {
    const { app } = await show({}, lesson(10));
    next();
    await waitFor(() => expect(river()?.getAttribute('data-halves')).toBe('2'));
    await openTheChest();
    const kid = (await getKid(app.db))!;
    expect(kid.meter).toMatchObject({ owed: 0, chestsToday: 1, halves: 0, day: DAY });
    expect(kid.lastChestDate).toBe(DAY);
  });
  it('after one extra lesson: the boat half way and 再学一课就能开宝箱！, no chest', async () => {
    await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, chestsToday: 1, day: DAY, lesson: 10 } }, lesson(20, true));
    next();
    await waitFor(() => expect(river()?.getAttribute('data-halves')).toBe('1'));
    expect(screen.getByText('再学一课就能开宝箱！')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
  });
  it('after two extra lessons: the second chest, then 明天再开宝箱！', async () => {
    const { app } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, halves: 1, chestsToday: 1, day: DAY, lesson: 20 } }, lesson(30, true));
    next();
    await openTheChest();
    expect(screen.getByText('明天再开宝箱！')).toBeTruthy();
    expect((await getKid(app.db))!.meter.chestsToday).toBe(2);
  });
  it('capped: no chest, 明天再开宝箱！, and the half goes to the bank', async () => {
    const { app } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, chestsToday: 2, day: DAY, lesson: 30 } }, lesson(40, true));
    next();
    expect(await screen.findByText('明天再开宝箱！')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
    expect((await getKid(app.db))!.bank).toBe(1);
  });
  it('the bank and the first lesson: two chests, one after the other', async () => {
    const { app } = await show({ meter: { ...EMPTY_METER, chestsToday: 2, day: '2026-10-01', lesson: 5 }, bank: 2 }, lesson(10));
    next();
    await openTheChest();
    next();
    await openTheChest();
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 0, chestsToday: 2 });
  });
  it('a finished lesson celebrated again counts once; its unopened chest is still there (review focus 1)', async () => {
    const { app, view } = await show({}, lesson(10));
    view.unmount(); // he left before opening it
    renderWithApp(<Celebration rec={lesson(10)} />, app);
    await screen.findByText('太棒了！');
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 1, chestsToday: 1 });
    next();
    await openTheChest();
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 0, chestsToday: 1 });
  });
  it("an extra lesson's chest left unopened opens at the next Celebration (review focus 3)", async () => {
    const { app, view } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, halves: 1, chestsToday: 1, day: DAY, lesson: 20 } }, lesson(30, true));
    view.unmount(); // an extra lesson is never saved: he cannot come back to it
    renderWithApp(<Celebration rec={lesson(40, true)} />, app);
    await screen.findByText('太棒了！');
    next();
    await openTheChest(); // the chest he left
    expect(await getKid(app.db)).toMatchObject({ bank: 1, meter: { owed: 0, chestsToday: 2 } });
  });
  it('free play: no river and no chest', async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={{ ...lesson(10), free: true }} />, app);
    await screen.findByText('练习得很好！');
    expect(river()).toBeNull();
    expect((await getKid(app.db))?.meter.lesson ?? null).toBeNull(); // nothing counted
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/riverTrack.test.tsx src/app/celebrationRiver.slow.test.tsx`
Expected: FAIL. `RiverTrack` does not exist, and the Celebration has no river.

- [ ] **Step 3: Write the river track**

Create `src/ui/RiverTrack.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks';
import { LINE } from './cel';
import { METER_FULL } from '../fun/meter';
import { reducedMotion } from './motion';
import { BOAT, RIPPLE } from './worlds/creatures/boat';

/** How long the boat takes from its old spot to its new one. */
export const SAIL_MS = 900;
/** The boat's x at an empty and at a full meter, in the track's 320 × 64 box (the chest stands just past the end). */
const START = 26;
const END = 270;
/** The chest at the river's end, small, in his light cel. */
const CHEST_MARK =
  `<rect x="-14" y="-18" width="28" height="18" rx="4" fill="#c77b30" stroke="${LINE}" stroke-width="2"/>` +
  `<path d="M-14 -18 V-24 Q-14 -32 0 -32 Q14 -32 14 -24 V-18 Z" fill="#d98a3d" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>` +
  `<rect x="-3" y="-32" width="6" height="32" fill="#f6c343"/>`;
const SAID = ['小船在起点', '小船走到一半了', '小船到宝箱了'];

/** The river meter (rewards spec §3): a short river, the One River paper boat on it, the chest at its end. The boat sails from
 *  `from` to `to` (halves, 0–2) and calls onArrive when it gets there (at once with reduced motion). */
export function RiverTrack({ from, to, mini = false, onArrive }: { from: number; to: number; mini?: boolean; onArrive?: () => void }) {
  const still = reducedMotion();
  const [at, setAt] = useState(still ? to : from);
  useEffect(() => {
    if (still || from === to) {
      setAt(to);
      onArrive?.();
      return;
    }
    const raf = requestAnimationFrame(() => setAt(to)); // after the first paint, so the move is a transition
    const t = setTimeout(() => onArrive?.(), SAIL_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);
  const x = (h: number) => ((END - START) * Math.min(Math.max(h, 0), METER_FULL)) / METER_FULL;
  return (
    <svg class={`river${mini ? ' river--mini' : ''}`} viewBox="0 0 320 64" data-halves={to} role="img" aria-label={SAID[Math.min(Math.max(to, 0), METER_FULL)]}>
      <path d="M8 46 C60 38 110 54 160 46 C210 38 260 54 312 46 L312 60 L8 60 Z" fill="#bfe6ff" stroke={LINE} stroke-width="2" stroke-linejoin="round" />
      <path d={`M${START} 52 L${END} 52`} stroke="#ffffff" stroke-width="2.4" stroke-dasharray="2 8" stroke-linecap="round" />
      <g transform={`translate(${END + 26} 50)`} dangerouslySetInnerHTML={{ __html: CHEST_MARK }} />
      <g class="river__boat" style={{ transform: `translateX(${x(at)}px)`, transition: still ? 'none' : `transform ${SAIL_MS}ms ease-in-out` }}>
        <g transform={`translate(${START} 50) scale(0.42)`} dangerouslySetInnerHTML={{ __html: RIPPLE + BOAT }} />
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Count the lesson once, in one transaction**

Create `src/app/celebrationData.ts`:

```ts
// What the Celebration needs before it plays (rewards spec §3–4): the lesson counted on the river meter once, and later the goal facts.
import { fillMeter, lessonOf, type MeterFill } from '../fun/meter';
import type { AppDb } from '../store/db';
import { getKid, saveKid, updateKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';

/** Counts a finished lesson on the meter, once (a celebration shown again counts nothing); free play counts nothing (fill null). */
export async function settleMeter(db: AppDb, rec: SessionRecord): Promise<{ kid: KidState; fill: MeterFill | null }> {
  const lesson = lessonOf(rec);
  const stored = await getKid(db);
  if (!lesson) return { kid: stored ?? DEFAULT_KID, fill: null };
  let fill: MeterFill | null = null;
  const saved = await updateKid(db, (k) => {
    const r = fillMeter(k, lesson);
    fill = r.fill;
    return r.fill.counted ? r.kid : null;
  });
  if (saved) return { kid: saved, fill: fill as MeterFill | null };
  if (stored) return { kid: stored, fill: fill as MeterFill | null };
  const r = fillMeter(DEFAULT_KID, lesson); // nothing stored yet: count it on a new kid
  await saveKid(db, r.kid);
  return { kid: r.kid, fill: r.fill };
}
```

- [ ] **Step 5: Rebuild the Celebration's sequence around the meter**

In `src/app/Celebration.tsx`:

1. Change the imports:
   - remove `canOpenChest` from the costumes import;
   - remove `getKid`'s use in `Promise.all` (keep the import for the fallback);
   - add these:

```ts
import { CHESTS_PER_DAY, lessonOf, METER_FULL, meterLine } from '../fun/meter';
import { updateKid } from '../store/repo';
import { RiverTrack } from '../ui/RiverTrack';
import { settleMeter } from './celebrationData';
```

2. Replace `type Phase` and `interface Sequence` with:

```ts
type Phase = 'stars' | 'river' | 'chest' | 'power' | 'badges';

/** The boat in this Celebration (rewards spec §3): where it sails from, where the meter ends, and whether today's 2 chests are earned. */
interface River { from: number; left: number; capped: boolean }

interface Sequence {
  order: Phase[]; // a phase may come twice: two chests in one lesson
  river: River;
  power: { id: PowerId; tier: number } | null; // the highest newly reached tier (shown)
  newTiers: { id: PowerId; tier: number }[];
  badges: string[];
  starsBefore: number;
}
```

3. In the component:
   - change `const { db, go, refresh, settings } = useApp();` to `const { db, go, refresh } = useApp();`;
   - replace `const [phase, setPhase] = useState<Phase>('stars');` with the state below (put the `arrived` line after `const still = reducedMotion();`).

```ts
  const [at, setAt] = useState(0); // the phase on screen: its place in seq.order
```

```ts
  const [arrived, setArrived] = useState(still); // the boat has reached the chest: it shows and can be opened
```

After the `seq` state is declared, add:

```ts
  const phase: Phase = seq?.order[at] ?? 'stars';
```

4. Replace the body of the loading `useEffect` with:

```ts
  useEffect(() => {
    celebrate();
    void (async () => {
      const [know, sessions] = await Promise.all([loadKnowledge(db), allSessions(db)]);
      // the lesson counts on the river meter once (rewards spec §3); if that fails he still gets his celebration
      const { kid: kidNow, fill } = await settleMeter(db, rec).catch(async () => ({ kid: (await getKid(db).catch(() => null)) ?? DEFAULT_KID, fill: null }));
      const m = kidNow.meter;
      const river: River = fill
        ? { from: fill.from, left: fill.left, capped: fill.capped }
        : { from: m.halves, left: m.halves, capped: m.day === rec.date && m.chestsToday >= CHESTS_PER_DAY };
      const order: Phase[] = ['stars'];
      // every chest earned and not yet opened (one an earlier lesson left too), else how far the boat got
      if (lessonOf(rec)) {
        if (m.owed > 0) for (let i = 0; i < m.owed; i++) order.push('chest');
        else order.push('river');
      }
      const badges = newBadges(stickerFamilies(BUILTIN), know.knownChars, kidNow.badgesSeen);
      const fresh = newTiers(powerProgress(powerFamilies(BUILTIN), know.knownChars), kidNow.powerTiersSeen);
      const power = [...fresh].sort((a, b) => b.tier - a.tier)[0] ?? null;
      if (power) order.push('power');
      if (badges.length) order.push('badges');
      kidRef.current = kidNow;
      setKid(kidNow);
      setSeq({ order, river, power, newTiers: fresh, badges, starsBefore: totalStars(sessions, kidNow.bonusStars) - stars });
    })();
  }, []);
```

5. Replace `advance` with:

```ts
  const advance = async () => {
    const next = at + 1;
    const nextPhase = seq.order[next];
    if (!nextPhase) {
      await refresh();
      // the chapter's payoff after the lesson, when one is owed (spec 2026-10-07 3c §5)
      const stored = await getSettings(db);
      const owed = storyStep(stored.storyProgress, CHAPTERS.length, localDateKey(new Date(`${rec.date}T12:00:00`)), stored.storyOn); // an owed payoff is owed on any day
      go(owed?.part === 'payoff' ? { name: 'story', part: 'payoff', chapter: owed.chapter, then: { name: 'home' } } : { name: 'home' });
      return;
    }
    if (nextPhase === 'badges') {
      playSfx('levelUp');
      celebrate();
      await save({ ...kidRef.current, badgesSeen: [...kidRef.current.badgesSeen, ...seq.badges] });
    }
    setChest(null); // a second chest starts closed
    setArrived(still);
    setAt(next);
  };
```

6. Replace `open` with:

```ts
  const open = async () => {
    if (chest) return;
    // dated by the session's own day (a session can finish after midnight); one owed chest per opening, in one transaction.
    // What is shown is worked out first, so a failed save never strands him on this screen.
    let opened = openChest(kidRef.current, rec.date);
    try {
      const saved = await updateKid(db, (k) => {
        if (k.meter.owed <= 0) return null;
        opened = openChest(k, rec.date);
        return opened.kid;
      });
      if (saved) opened = { ...opened, kid: saved };
    } catch {
      // shown anyway
    }
    kidRef.current = opened.kid;
    setKid(opened.kid);
    setChest(opened.result);
    chestRef.current?.classList.remove('chest-hint');
    playSfx('chest');
    const r = chestRef.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height * 0.35, { count: 16 });
  };
```

7. Replace `const isLast = seq.order.indexOf(phase) === seq.order.length - 1;` with:

```ts
  const isLast = at === seq.order.length - 1;
  const chestNo = seq.order.slice(0, at).filter((p) => p === 'chest').length;
  const lastChest = seq.order.lastIndexOf('chest') === at;
  const boatLine = meterLine(seq.river); // 再学一课就能开宝箱！ or 明天再开宝箱！
  const afterOpen = chest && lastChest ? boatLine : null; // under an opened last chest: where the meter now is
  const opened = chest ? (lastChest ? seq.river.left : 0) : null; // where the boat waits once the chest is open
```

8. In the chest phase JSX:
   - directly after the `<h1>`, insert the track;
   - give the `chest-slot` div and its `HoldButton` the arrival gate;
   - make the kept `<p>` carry the meter line once the last chest is open.

```tsx
            {/* the boat sails to the chest (rewards spec §3); once it is open the boat waits where the meter now is */}
            <RiverTrack
              key={chest ? `${at}-open` : at}
              from={opened ?? (chestNo === 0 ? seq.river.from : 0)}
              to={opened ?? METER_FULL}
              onArrive={() => setArrived(true)}
            />
```

```tsx
            <div ref={chestRef} class={`chest-slot${arrived ? '' : ' is-waiting'}`}>
```

```tsx
                {!chest ? <HoldButton key={at} label="按住打开宝箱" disabled={!arrived} onComplete={() => void open()} onTooShort={hint} /> : (
```

```tsx
            <p class={chest && !afterOpen ? 'is-kept' : undefined} aria-hidden={chest && !afterOpen ? 'true' : undefined}><Label zh={afterOpen ?? '按住，打开宝箱！'} /></p>
```

9. Add the river phase after the stars phase block:

```tsx
        {phase === 'river' && (
          <>
            <h1><Label zh={seq.river.capped ? '今天的宝箱都开了！' : seq.river.left > 0 ? '小船走到一半了！' : '小船出发了！'} /></h1>
            <RiverTrack from={seq.river.from} to={seq.river.left} />
            {boatLine && <p class="celebrate__line"><Label zh={boatLine} /></p>}
          </>
        )}
```

The Pet already shows for every phase except `chest` and `power`, so it shows on the river phase. Leave the `继续` button logic as it is.

10. In `src/fun/costumes.ts`, delete `canOpenChest`. It has no callers now; confirm with `grep -rn canOpenChest src scripts`.

- [ ] **Step 6: Style the track**

Append to `src/styles.css`, after the `.prize` rules near line 328:

```css
/* the river meter (rewards spec 2026-10-15 §3): a short river, the paper boat, the chest at its end */
.river { display: block; width: min(86vw, 380px); height: auto; overflow: visible; }
.river--mini { width: 116px; }
/* the chest shows once the boat reaches it; hidden (not removed) so nothing below it moves */
.chest-slot.is-waiting { visibility: hidden; }
@media (max-height: 760px) { .celebrate .river { width: min(70vw, 300px); } }
```

- [ ] **Step 7: Update the tests that walk past the chest**

In `src/app/celebration.slow.test.tsx`:
- In `'opening adds nothing above the chest …'`, the track is now an `<svg>` above the chest, and an SVG element's `className` is not a string. Replace `e.tagName + '.' + e.className.split(' ')[0]` with `` `${e.tagName}.${(e.getAttribute('class') ?? '').split(' ')[0]}` ``.
- Add this helper after `hold`:

```ts
/** Taps 继续 until `text` shows: the river (and, from Task 5, the goals) come before the powers and badges. */
async function continueTo(text: string) {
  for (let i = 0; i < 6 && !screen.queryByText(text); i++) {
    fireEvent.click(screen.getByText('继续'));
    await new Promise((r) => setTimeout(r, 30));
  }
  return screen.findByText(text);
}
```

- In the three power-up tests (`'powers Truffle up …'`, `'saves every new tier …'`, `'never strands the child …'`) and in `'keeps the onesie and the accessory on'`, replace each `fireEvent.click(screen.getByText('继续'));` + `await screen.findByText('新能力！');` (or `expect(await screen.findByText('新能力！'))…`) with `await continueTo('新能力！');`. These kids have `lastChestDate` today, so they pass a river phase first.

In `src/app/celebrationStage.slow.test.tsx`, the boat now takes `SAIL_MS` before the chest can be held when motion is on. In `'Truffle watches the chest …'` and `'final review I1 …'`, after `await screen.findByRole('button', { name: '按住打开宝箱' });`, add:

```ts
    await waitFor(() => expect((screen.getByRole('button', { name: '按住打开宝箱' }) as HTMLButtonElement).disabled).toBe(false), { timeout: 2000 });
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/ui/riverTrack.test.tsx src/app/celebrationRiver.slow.test.tsx src/app/celebration.slow.test.tsx src/app/celebrationStage.slow.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Run the fast suite**

Run: `npm run test:fast`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/ui/RiverTrack.tsx src/ui/riverTrack.test.tsx src/app/celebrationData.ts src/app/celebrationRiver.slow.test.tsx src/app/Celebration.tsx src/fun/costumes.ts src/styles.css src/app/celebration.slow.test.tsx src/app/celebrationStage.slow.test.tsx
git commit -m "feat(rewards): the Celebration's river: the paper boat sails to the chest, half way, or waits for tomorrow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Celebration: the goals phase

**Files:**
- Modify: `src/app/celebrationData.ts` (add `loadGoalFacts`), `src/app/Celebration.tsx` (goals phase, stars line), `src/styles.css`, `src/app/celebration.slow.test.tsx:157-166` (save-failure test)
- Create: `src/app/celebrationGoals.slow.test.tsx`

**Interfaces:**
- Consumes:
  - `almostThere`, `Goal`, `GoalFacts` (Task 3);
  - `oneDayAway` (Task 3);
  - `journeyCount` from `src/placement/journey.ts`;
  - `logsSince`;
  - `hanChars` from `src/content`;
  - `stickerFamilies`, `powerFamilies`, `startOfLocalDay`.
- Produces: `loadGoalFacts(db: AppDb, know: Knowledge, counted: boolean, now: Date): Promise<GoalFacts>`, and the phase `'goals'`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/celebrationGoals.slow.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN, builtinWords } from '../content';
import { powerFamilies } from '../fun/powers';
import { createSessionRecord } from '../session/runner';
import { addReviewLog, putCards, putWords, saveKid } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));

const plan: SessionPlan = { steps: ['newwords'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const finished = (free = false) => ({ ...createSessionRecord(plan, '2026-10-02', 10, free), completed: true, completedSteps: ['newwords' as const] });
async function continueTo(text: string) {
  for (let i = 0; i < 6 && !screen.queryByText(text); i++) {
    fireEvent.click(screen.getByText('继续'));
    await new Promise((r) => setTimeout(r, 30));
  }
  return screen.findByText(text);
}
const lines = () => [...document.querySelectorAll('.goals .goal-line [data-zh]')].map((l) => l.getAttribute('data-zh'));

describe('almost there on the Celebration (rewards spec §4)', () => {
  it('after the river, up to three goals, nearest first, each with its icon and pinyin', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, powerFamilies(BUILTIN).water.slice(0, 2).map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 8, 1), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' }); // today's chest was opened: a river phase, no chest
    renderWithApp(<Celebration rec={finished()} />, app);
    await screen.findByText('太棒了！');
    await continueTo('快到了！');
    expect(lines().length).toBeGreaterThan(0);
    expect(lines().length).toBeLessThanOrEqual(3);
    expect(lines()[0]).toBe('再认识 1 个『水』字，解锁新能力');
    expect(document.querySelector('.goal-line--power svg.inkicon')?.getAttribute('data-icon')).toBe('drop');
    expect(document.querySelector('.goal-line .label__py')).toBeTruthy();
  });
  it('the 还差一天 line moves from under the stars to a goal', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:鱼', 'write', new Date(2026, 9, 10))]);
    await addReviewLog(app.db, { cardId: 'b:鱼:write', wordId: 'b:鱼', kind: 'write', at: new Date(2026, 9, 2, 8).getTime(), rating: 3, correct: true, misses: 0 });
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={{ ...finished(), stars: 1, produced: { write: 0, say: 0 }, closest: ['鱼'] }} />, app);
    await screen.findByText('太棒了！');
    expect(document.querySelector('.celebrate__line')).toBeNull();
    await continueTo('快到了！');
    expect(lines()[0]).toBe('明天再写对『鱼』，就会写了！');
  });
  it('free play: no goals', async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={finished(true)} />, app);
    await screen.findByText('练习得很好！');
    expect(screen.queryByText('快到了！')).toBeNull();
    expect(screen.getByText('回家')).toBeTruthy();
  });
});
```

In `src/app/celebration.slow.test.tsx`, `'still lets the child continue if the chest cannot be saved'` now has a goals phase after the chest. Change its last line to:

```ts
    expect(await screen.findByText(/回家|继续/)).toBeTruthy();
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/celebrationGoals.slow.test.tsx`
Expected: FAIL. There is no 快到了！ phase yet.

- [ ] **Step 3: Gather the goal facts**

Append to `src/app/celebrationData.ts`, and add these imports:

```ts
import { BUILTIN, hanChars } from '../content';
import type { GoalFacts } from '../fun/goals';
import { powerFamilies } from '../fun/powers';
import { stickerFamilies } from '../fun/stickers';
import { startOfLocalDay } from '../lib/date';
import { journeyCount } from '../placement/journey';
import { oneDayAway } from '../stats/produce';
import type { Knowledge } from '../stats/stats';
import { logsSince } from '../store/repo';
```

```ts
/** The facts the goals are worked out from (rewards spec §4), read once as the Celebration loads. */
export async function loadGoalFacts(db: AppDb, know: Knowledge, counted: boolean, now: Date): Promise<GoalFacts> {
  const [journey, logs] = await Promise.all([journeyCount(db, know.known), logsSince(db, now.getTime() - 60 * 86_400_000)]);
  const dayStart = startOfLocalDay(now).getTime();
  const lessonChars = new Set(know.cards.filter((c) => c.kind === 'recognise' && (c.passed ?? 0) >= dayStart).flatMap((c) => hanChars(know.wordsById.get(c.wordId)?.text ?? '')));
  return { journey, oneDay: oneDayAway(know.cards, logs, (id) => know.wordsById.get(id)), lessonChars, counted, families: stickerFamilies(BUILTIN), powers: powerFamilies(BUILTIN) };
}
```

Change the existing `import { getKid, saveKid, updateKid } from '../store/repo';` so `logsSince` joins it, rather than adding a second import line.

- [ ] **Step 4: Add the goals phase**

In `src/app/Celebration.tsx`:

1. Add the imports and pull `now` from the app:

```ts
import { almostThere, type Goal } from '../fun/goals';
import { loadGoalFacts, settleMeter } from './celebrationData';
```

   Then change the destructure to `const { db, go, refresh, now } = useApp();`.
2. Make these changes:
   - `type Phase` becomes `'stars' | 'river' | 'chest' | 'goals' | 'power' | 'badges'`;
   - add `goals: Goal[];` to `Sequence`.
3. In the loading effect, right after the chest/river `if (lessonOf(rec)) { … }` block and before the power lines, add:

```ts
      // up to three things he is close to, after the stars and the chest (rewards spec §4); never on free play
      const goals: Goal[] = lessonOf(rec)
        ? await loadGoalFacts(db, know, !!fill?.counted, now()).then((f) => almostThere(kidNow, know, f, now())).catch(() => [])
        : [];
      if (goals.length) order.push('goals');
```

   Then add `goals` to the `setSeq({ … })` object.
4. The 「还差一天」 line is now promoted to a goal. Replace the top-level `const line = …;` with this, placed after the `if (!seq || !kid) return …` guard:

```ts
  const line = rec.free ? null : producedLine(rec.produced, seq.goals.some((g) => g.kind === 'write') ? [] : rec.closest);
```

5. Add the phase JSX after the river block:

```tsx
        {phase === 'goals' && (
          <>
            <h1><Label zh="快到了！" /></h1>
            <ul class="goals">
              {seq.goals.map((g) => (
                <li key={g.zh} class={`goal-line goal-line--${g.kind}`}>
                  <InkIcon name={g.icon} size={40} />
                  <Label zh={g.zh} />
                </li>
              ))}
            </ul>
          </>
        )}
```

- [ ] **Step 5: Style the goals**

Append to `src/styles.css` after the river rules:

```css
/* almost there (rewards spec §4): up to three lines, each with its ink icon */
.goals { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: clamp(8px, 1.6dvh, 14px); width: min(92vw, 560px); }
.goal-line { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: var(--surface); border: var(--panel-border); border-radius: 16px; box-shadow: 3px 3px 0 var(--ink); text-align: left; font-size: clamp(20px, 3dvh, 26px); font-weight: 800; color: var(--ink); }
.goal-line svg { flex: none; }
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/app/celebrationGoals.slow.test.tsx src/app/celebration.slow.test.tsx src/app/celebrationRiver.slow.test.tsx src/app/celebrationStage.slow.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/celebrationData.ts src/app/Celebration.tsx src/app/celebrationGoals.slow.test.tsx src/app/celebration.slow.test.tsx src/styles.css
git commit -m "feat(rewards): almost there: up to three goals after the stars and chest, nearest first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Home: the small meter on the reward card

**Files:**
- Modify: `src/app/HomeScreen.tsx:185-201` (the `.goal` card), `src/styles.css` (the reward card), `src/app/home.test.tsx`

**Interfaces:**
- Consumes: `meterShown` (Task 1) and `RiverTrack` with `mini` (Task 4).
- Produces: the `.goal.reward-card` card, which is always on Home. It holds `svg.river--mini` (`data-halves`), and the parent goal's icon and body when one is set.

- [ ] **Step 1: Write the failing test**

Append to `src/app/home.test.tsx`, adding `EMPTY_METER` from `'../fun/meter'` to its imports:

```tsx
describe('Home: the river meter on the reward card (rewards spec §3)', () => {
  it('shows the boat where the meter is, with no parent goal too', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, meter: { ...EMPTY_METER, halves: 1, chestsToday: 1, day: '2026-10-02', lesson: 1 } } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.reward-card svg.river--mini')?.getAttribute('data-halves')).toBe('1');
    expect(document.querySelector('.reward-card .goal__body')).toBeNull(); // no parent goal: the card is the meter alone
  });
  it("a new day's boat has yesterday's banked halves in it", async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, meter: { ...EMPTY_METER, chestsToday: 2, day: '2026-10-01', lesson: 1 }, bank: 1 } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.reward-card svg.river--mini')?.getAttribute('data-halves')).toBe('1');
  });
  it("the parent's goal sits beside the meter", async () => {
    const app = await makeAppData();
    await saveReward(app.db, { id: 'g', title: 'Ice cream', emoji: '🍦', metric: 'stars', target: 10, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.reward-card svg.river--mini')).toBeTruthy();
    expect(document.querySelector('.reward-card .goal__body')?.textContent).toContain('我的奖励');
  });
});
```

(`saveReward` is already imported in `home.test.tsx`; add it if not.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/home.test.tsx -t "river meter"`
Expected: FAIL. There is no `.reward-card`.

- [ ] **Step 3: Put the meter on the reward card**

In `src/app/HomeScreen.tsx`, add the imports:

```ts
import { meterShown } from '../fun/meter';
import { RiverTrack } from '../ui/RiverTrack';
```

Replace the block from `{goal && progress && (` to its closing `)}` (the `.goal` card, lines 185–201) with:

```tsx
          {/* the reward card (rewards spec §3): the river meter toward the chest, and the parent's goal beside it when there is one */}
          <div class={`goal reward-card${progress?.reached ? ' goal--reached' : ''}`}>
            <span class="reward-card__meter"><RiverTrack mini from={meterShown(k, today).halves} to={meterShown(k, today).halves} /></span>
            {goal && progress && (
              <>
                {/* what he sees is Chinese with an ink icon; the parent's English note and older emoji stay in the parent area (spec 2026-10-04 §3) */}
                <span class="goal__icon"><InkIcon name={goal.icon ?? 'gift'} size={34} /></span>
                <div class="goal__body">
                  <strong><Label zh={goal.zh ?? '我的奖励'} /></strong>
                  {progress.reached ? (
                    <span><Label zh="你做到了！找爸爸妈妈拿奖励吧！" /></span>
                  ) : (
                    <>
                      <div class="progress"><div class="progress__fill" style={{ width: `${Math.round(progress.fraction * 100)}%` }} /></div>
                      <small class="goal__count">{progress.value} / {goal.target} {goal.metric === 'stars' ? <InkIcon name="star" size={16} /> : '字'}</small>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
```

`today` is declared below the card in the current file (`const today = localDateKey(now());` after the loading guard), and `k` is in scope. If `today` is declared after the JSX's first use, move that declaration up so it is above the `return`.

- [ ] **Step 4: Style it**

Append to `src/styles.css` after the `.home__cards .goal` rules near line 798:

```css
/* the reward card (rewards spec §3): the small river meter first, the parent's goal beside it */
.reward-card__meter { display: inline-flex; align-items: center; }
.home__cards .reward-card .river--mini { width: 116px; }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app/home.test.tsx src/styles.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/HomeScreen.tsx src/styles.css src/app/home.test.tsx
git commit -m "feat(rewards): Home's reward card carries the small river meter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Rig paw slots, the v3 costume kit, and the WebKit costume sheet with the face probe

**Files:**
- Modify: `src/ui/truffle/Truffle.tsx:173-179` (apply `docs/worlds/costumes/rig-slot.diff`'s Truffle part), `src/ui/truffle/costumes.ts` (export `CostumeLayer`, prefer `V3`), `src/ui/truffle/costumeKit.ts` (v3 helpers), `scripts/stage-cases.ts:11-15`, `scripts/stage-cases/page.tsx`
- Create: `src/ui/truffle/v3.ts`, `src/ui/truffle/v3.test.ts`, `src/ui/truffle/pawSlots.test.tsx`, `scripts/stage-cases/bundle.ts`, `scripts/stage-cases/faceProbe.ts`, `scripts/costume-sheet.ts`

**Interfaces:**
- Consumes: `costumeById`, `inChest`, `CHEST_COSTUMES` (Task 2); `PAW_TRACKS` from `timelines.ts`.
- Produces:
  - in `src/ui/truffle/costumes.ts`: `export interface CostumeLayer { back: string; body: string; head: string; tail?: string; pawL?: string; pawR?: string; hidesEars: boolean }`. `costumeLayer(id): CostumeLayer | null` returns `V3[id]()` first.
  - in `src/ui/truffle/v3.ts`: `V3: Record<string, () => CostumeLayer>`. Tasks 8–11 spread their family into it.
  - in `src/ui/truffle/costumeKit.ts`:
    - paw shapes and colour: `PAW_L_D`, `PAW_R_D`, `CREAM_PAW`;
    - paw art: `gloveL(fill)`, `gloveR(fill)`, `pawOverL`, `pawOverR`;
    - drawing helpers: `cel(d, fill, ax, ay, k = 0.9, sh = celShade(fill))`, `hi(d, w = 4, o = 0.5)`, `rope(d, color, w)`;
    - `heldPole(cx, cy, deg, back, ahead, color, w = 8, cap?: string)`.
  - in `scripts/stage-cases/faceProbe.ts`: `SHEET_COLUMNS`, `SHEET_CELL_HEIGHT`, `SHEET_PROBE`.
  - in `scripts/stage-cases/bundle.ts`: `bundleStagePage(): Promise<string>`.
  - CLI: `npx tsx scripts/costume-sheet.ts <label> [id,id,…]`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/truffle/pawSlots.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('./v3', () => ({
  V3: {
    chef: () => ({ back: '', body: '<path d="M110 190 L210 190"/>', head: '<path d="M60 90 L260 90"/>', pawL: '<circle data-t="glove-l" cx="138" cy="266" r="4"/>', pawR: '<circle data-t="prop-r" cx="200" cy="230" r="9"/>', hidesEars: false }),
  },
}));
import { Truffle } from './Truffle';

describe('costume paw slots (rewards spec §5.1; docs/worlds/costumes/rig-slot.diff)', () => {
  it("a costume's pawL/pawR art is drawn inside each paw's group, after the paw", () => {
    const { container } = render(<Truffle outfit="chef" />);
    expect(container.querySelector('[data-part="paw-l"] .truffle__outfit-paw [data-t="glove-l"]')).toBeTruthy();
    const r = container.querySelector('[data-part="paw-r"]')!;
    expect(r.querySelector('.truffle__outfit-paw [data-t="prop-r"]')).toBeTruthy();
    expect(r.lastElementChild?.classList.contains('truffle__outfit-paw')).toBe(true);
  });
  it('a held prop rides the paw: a raised paw moves its group', () => {
    const { container } = render(<Truffle outfit="chef" paws={{ lx: 0, ly: 0, lr: 0, rx: 4, ry: -62, rr: -12 }} />);
    const r = container.querySelector('[data-part="paw-r"]')!;
    expect(r.getAttribute('transform')).toBe('translate(4 -62) rotate(-12 182 266)');
    expect(r.querySelector('[data-t="prop-r"]')).toBeTruthy();
  });
  it('a held accessory stays over the costume prop in the right paw', () => {
    const { container } = render(<Truffle outfit="chef" accessory="lantern" />);
    expect(container.querySelector('[data-part="paw-r"]')!.lastElementChild?.classList.contains('truffle__accessory--over')).toBe(true);
  });
  it('costumes without paw art leave the paws as they were', () => {
    expect(render(<Truffle outfit="tiger" />).container.querySelector('.truffle__outfit-paw')).toBeNull();
  });
});
```

Create `src/ui/truffle/v3.test.ts`:

```ts
// The v3 standard (rewards spec 2026-10-15 §5.1) over every registered v3 costume; each family task adds its own list below.
import { describe, expect, it } from 'vitest';
import { costumeById, inChest } from '../../fun/costumes';
import { LINE } from '../cel';
import { cel, celShade, gloveR, heldPole, PAW_R_D } from './costumeKit';
import { costumeLayer } from './costumes';
import { V3 } from './v3';

/** Absolute points of every path drawn with only M/L/C/Q/Z (arcs, H/V and relative moves are small details inside). */
function points(svg: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of svg.matchAll(/ d="([^"]*)"/g)) {
    const d = m[1]!;
    if (/[A-Za-z]/.test(d.replace(/[MLCQZ]/g, ''))) continue;
    const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i]!, n[i + 1]!]);
  }
  return out;
}
/** What pokes out of his box (30 20 260 270), as the zodiac onesie test reads it: M/L points and circles. */
function outOfBox(art: string): string[] {
  const out: string[] = [];
  for (const m of art.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
    const [x, y, r] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (x - r < 31.6 || x + r > 288.4 || y - r < 21.6) out.push(`circle ${x},${y} r${r}`);
  }
  for (const m of art.matchAll(/ d="(M[^"]*)"/g)) {
    if (/[a-z]/.test(m[1]!.replace(/Z/g, ''))) continue;
    for (const v of m[1]!.matchAll(/[ML] ?([\d.]+) ([\d.]+)/g)) {
      const [x, y] = [Number(v[1]), Number(v[2])];
      if (x < 31.6 || x > 288.4 || y < 21.6) out.push(`point ${x},${y}`);
    }
  }
  return out;
}
const RULES = Object.entries(V3);
const all = (id: string) => { const l = V3[id]!(); return [l.back, l.body, l.head, l.tail ?? '', l.pawL ?? '', l.pawR ?? ''].join(''); };

describe('the v3 kit', () => {
  it('cel: the shadow first, the lit fill shrunk toward the light, then the line', () => {
    const art = cel('M10 10 L50 10 L50 50 Z', '#d8302a', 20, 20);
    expect(art.indexOf(celShade('#d8302a'))).toBeLessThan(art.indexOf('fill="#d8302a"'));
    expect(art).toContain('translate(20 20) scale(0.9) translate(-20 -20)');
    expect(art).toContain(`stroke="${LINE}"`);
  });
  it('a glove is his paw shape in the glove colour; a held pole has an ink edge', () => {
    expect(gloveR('#3d3845')).toContain(PAW_R_D);
    expect(heldPole(182, 262, -40, 118, 122, '#d8302a', 12, '#f2c230')).toMatch(/rotate\(-40\)[\s\S]*stroke="#706889"[\s\S]*stroke="#d8302a"[\s\S]*stroke="#f2c230"/);
  });
});

describe('v3 costumes (rewards spec §5.1)', () => {
  it('light cel: the soft-violet line; no clip-path, gradient or filter; no emoji', () => {
    for (const [id] of RULES) {
      expect(all(id), id).toContain(`stroke="${LINE}"`);
      expect(all(id), id).not.toMatch(/clip-path|clipPath|Gradient|filter|url\(#/);
      expect(all(id), id).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
  it('one dominant colour, drawn with its one hard shadow', () => {
    for (const [id] of RULES) expect(all(id), id).toContain(celShade(costumeById(id)!.color));
  });
  it('headgear reaches both edges of his head (x ≤ 62 and ≥ 258 at the brow, y 60–170)', () => {
    for (const [id, make] of RULES) {
      const xs = points(make().head).filter(([, y]) => y >= 60 && y <= 170).map(([x]) => x);
      expect(Math.min(...xs), id).toBeLessThanOrEqual(62);
      expect(Math.max(...xs), id).toBeGreaterThanOrEqual(258);
    }
  });
  it('what is behind him and on his head stays inside his box', () => {
    for (const [id, make] of RULES) expect(outOfBox(make().back + make().head), id).toEqual([]);
  });
  it('each is in the chest and is what Truffle wears for its id', () => {
    for (const [id, make] of RULES) {
      expect(inChest(costumeById(id)!), id).toBe(true);
      expect(costumeLayer(id), id).toEqual(make());
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/truffle/pawSlots.test.tsx src/ui/truffle/v3.test.ts`
Expected: FAIL. `./v3` and the kit helpers do not exist, and the paws have no slot.

- [ ] **Step 3: Add the paw slots to the rig**

In `src/ui/truffle/Truffle.tsx`, apply the Truffle part of `docs/worlds/costumes/rig-slot.diff`. Replace the two paw `<g>`s (lines 173–179) with:

```tsx
        {/* his front paws, in front of his head (spec 2026-10-04 §4.6): at rest at his feet; they wave, knead and cover his eyes.
            A costume's paw art (a glove, a held prop: rewards spec §5.1) is drawn inside each paw's group, so it moves with the paw */}
        <g class="truffle__paw" data-part="paw-l" transform={paws ? `translate(${paws.lx} ${paws.ly}) rotate(${paws.lr} 138 266)` : undefined} {...part('body')}>
          <g dangerouslySetInnerHTML={{ __html: PAW_L }} />
          {wear?.pawL && <g class="truffle__outfit-paw" dangerouslySetInnerHTML={{ __html: wear.pawL }} />}
        </g>
        <g class="truffle__paw" data-part="paw-r" transform={paws ? `translate(${paws.rx} ${paws.ry}) rotate(${paws.rr} 182 266)` : undefined} {...part('body')}>
          <g dangerouslySetInnerHTML={{ __html: PAW_R }} />
          {wear?.pawR && <g class="truffle__outfit-paw" dangerouslySetInnerHTML={{ __html: wear.pawR }} />}
          {/* a held item (brush, lantern, kite, balloon, wand) is in this paw: it moves with it, so a raised paw never leaves another behind */}
          {acc?.over && <g class="truffle__accessory truffle__accessory--over" dangerouslySetInnerHTML={{ __html: acc.over }} />}
        </g>
```

Do **not** copy the diff's `new:` mock branch from `costumes.ts`.

- [ ] **Step 4: Add the v3 helpers to the kit**

Append to `src/ui/truffle/costumeKit.ts`:

```ts
// ---- v3 (rewards spec 2026-10-15 §5.1): the helpers the approved samples (docs/worlds/costumes/samples-v3.ts.txt) drew with ----

/** His paws' outlines (parts.ts G.pawL / G.pawR): for gloves, and for a paw closing over a held thing. */
export const PAW_L_D = 'M122 262 C120 276 154 278 154 266 C154 258 124 254 122 262Z';
export const PAW_R_D = 'M198 262 C200 276 166 278 166 266 C166 258 196 254 198 262Z';
export const CREAM_PAW = '#fbf5ea';
const TOES_L = 'M132 264 L132 270 M142 264 L142 270';
const TOES_R = 'M178 264 L178 270 M188 264 L188 270';
const glove = (d: string, fill: string, toes: string) =>
  `<path d="${d}" fill="${fill}" ${s2}/><path d="${toes}" fill="none" stroke="${celShade(fill)}" stroke-width="1.6" stroke-linecap="round"/>`;
export const gloveL = (fill: string) => glove(PAW_L_D, fill, TOES_L);
export const gloveR = (fill: string) => glove(PAW_R_D, fill, TOES_R);
/** His own cream paw drawn again over a held thing, so the paw closes round it. */
export const pawOverL = `<path d="${PAW_L_D}" fill="${CREAM_PAW}" ${s2}/><path d="${TOES_L}" fill="none" ${s2}/>`;
export const pawOverR = `<path d="${PAW_R_D}" fill="${CREAM_PAW}" ${s2}/><path d="${TOES_R}" fill="none" ${s2}/>`;

/**
 * A cel piece: its one hard shadow (the piece in its shadow tone), the lit fill on top shrunk toward (ax, ay) — a point near the
 * piece's upper left, so what is left is a rim on the side away from the light — then the line. Explicit paths only, never a
 * clip-path; exact for any piece that is star-shaped about (ax, ay).
 */
export const cel = (d: string, fill: string, ax: number, ay: number, k = 0.9, sh = celShade(fill)) =>
  `<path d="${d}" fill="${sh}"/><path d="${d}" fill="${fill}" transform="translate(${ax} ${ay}) scale(${k}) translate(${-ax} ${-ay})"/><path d="${d}" fill="none" ${S}/>`;
/** A soft white highlight stroke on the lit side. */
export const hi = (d: string, w = 4, o = 0.5) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
/** A thick stroked band with an ink edge (a ribbon, a hose, a sash). */
export const rope = (d: string, color: string, w: number) => ropeTail(d, color, w);
/**
 * A held pole (a staff, a spatula, a spyglass): a straight rod through the paw at (cx, cy), turned `deg`, running `back` behind
 * and `ahead` in front, with an ink edge, optional end caps of 20 and a highlight. Put it in pawL/pawR so it rides the paw.
 */
export const heldPole = (cx: number, cy: number, deg: number, back: number, ahead: number, color: string, w = 8, cap?: string) =>
  `<g transform="translate(${cx} ${cy}) rotate(${deg})">` +
  `<path d="M${-back} 0 L${ahead} 0" stroke="${INK}" stroke-width="${w + 2 * LW}" stroke-linecap="round"/>` +
  `<path d="M${-back} 0 L${ahead} 0" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
  (cap ? `<path d="M${-back} 0 L${-back + 20} 0 M${ahead - 20} 0 L${ahead} 0" stroke="${cap}" stroke-width="${w}" stroke-linecap="round"/>` : '') +
  `<path d="M${-back + 6} ${-w * 0.3} L${ahead - 6} ${-w * 0.3}" stroke="#fff" stroke-opacity=".35" stroke-width="${Math.max(1.5, w * 0.2)}" stroke-linecap="round"/></g>`;
```

(`S`, `s2`, `INK`, `LW`, `celShade` and `ropeTail` are already defined or imported in `costumeKit.ts`.)

- [ ] **Step 5: Add the registry and prefer it**

Create `src/ui/truffle/v3.ts`:

```ts
// The v3 costumes (rewards spec 2026-10-15 §5.1): each changes his whole silhouette, has one dominant colour, carries one thing
// a child knows it by, in light cel, with its held props in the paw slots. Each family file adds its entries here (Tasks 8–11).
import type { CostumeLayer } from './costumes';

export const V3: Record<string, () => CostumeLayer> = {};
```

In `src/ui/truffle/costumes.ts`:
- add `import { V3 } from './v3';`;
- above `costumeLayer`, add the interface below;
- change the function's return type to `CostumeLayer | null`;
- after `if (!c) return null;`, insert `const v3 = V3[c.id]; if (v3) return v3();`.

```ts
/** A costume's layers: behind him, over his body, on his head, his tail's replacement, and art inside each paw (rewards spec §5.1). */
export interface CostumeLayer { back: string; body: string; head: string; tail?: string; pawL?: string; pawR?: string; hidesEars: boolean }
```

- [ ] **Step 6: The WebKit contact sheet**

Create `scripts/stage-cases/bundle.ts`. It moves stage-cases.ts lines 11–15 here, unchanged:

```ts
// Bundles the stage-case page (page.tsx) with the app's styles into a temp folder, for stage-cases.ts and costume-sheet.ts.
import { build } from 'esbuild';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chaptersShim } from './shim';

export async function bundleStagePage(): Promise<string> {
  const dir = join(tmpdir(), `ziji-stage-cases-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  await build({ entryPoints: ['scripts/stage-cases/page.tsx'], bundle: true, outdir: dir, plugins: [chaptersShim], jsx: 'automatic', jsxImportSource: 'preact', loader: { '.json': 'json', '.woff2': 'file', '.woff': 'file', '.png': 'file', '.md': 'text' }, external: ['/fonts/*'], define: { 'import.meta.env.BASE_URL': '"./"' }, logLevel: 'error' });
  cpSync('public/worlds', join(dir, 'worlds'), { recursive: true }); // the paintings, next to the page (spec 2026-10-13 §5)
  writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="page.css"><div id="app"></div><script src="page.js"></script>`);
  return dir;
}
```

In `scripts/stage-cases.ts`, replace lines 11–15 (`const dir = …` through `writeFileSync(join(dir, 'index.html'), …)`) with:

```ts
const dir = await bundleStagePage();
```

and add `import { bundleStagePage } from './stage-cases/bundle';`. Leave the other imports; unused ones are harmless under this tsconfig.

Create `scripts/stage-cases/faceProbe.ts`:

```ts
// The v3 costume sheet's layout and its check (rewards spec §5.1, §7): every costume drawn, and no held prop over his eyes or
// mouth, idle or cheering. A string, so the bundler's helpers never reach the page.
export const SHEET_COLUMNS = 6;
export const SHEET_CELL_HEIGHT = 560;
export const SHEET_PROBE = `(() => {
  const out = [];
  for (const cell of document.querySelectorAll('[data-costume]')) {
    const id = cell.getAttribute('data-costume');
    for (const fig of cell.querySelectorAll('figure')) {
      const row = fig.getAttribute('data-row');
      const svg = fig.querySelector('svg.truffle');
      if (!svg || svg.getAttribute('data-outfit') !== id) { out.push(id + ' ' + row + ': not drawn'); continue; }
      if (row === 'tile') continue;
      let crossed = false;
      for (const part of ['eye-white-l', 'eye-white-r', 'mouth']) {
        const r = svg.querySelector('[data-part="' + part + '"]').getBoundingClientRect();
        for (let i = 1; i < 5; i++) for (let j = 1; j < 5; j++) {
          const el = document.elementFromPoint(r.left + (r.width * i) / 5, r.top + (r.height * j) / 5);
          const prop = el && el.closest('.truffle__outfit-paw');
          if (prop && svg.contains(prop)) crossed = true;
        }
      }
      if (crossed) out.push(id + ' ' + row + ': a held prop crosses his face');
    }
  }
  return out;
})()`;
```

In `scripts/stage-cases/page.tsx`:
- add `import { costumeById } from '../../src/fun/costumes';` (keep the `COSTUMES` import);
- add `import { SHEET_CELL_HEIGHT, SHEET_COLUMNS } from './faceProbe';`;
- add a case before `else if (which?.startsWith('story-') …`:

```tsx
else if (which === 'costume-sheet') {
  // the v3 contact sheet (rewards spec §5.1; compare with docs/worlds/costumes/standard-v3.png): idle at 220 px, the 64 px
  // Wardrobe tile, and cheering at 220 px with his right paw up (the props ride the paw)
  const ids = (new URLSearchParams(location.search).get('ids') ?? '').split(',').filter(Boolean);
  const raised = PAW_TRACKS.raise(400)!;
  render(
    <div style={`display:grid;grid-template-columns:repeat(${SHEET_COLUMNS}, 232px);gap:8px;padding:8px;background:#fbf6ea;font:600 13px sans-serif;text-align:center`}>
      {ids.map((id) => (
        <div key={id} data-costume={id} style={`height:${SHEET_CELL_HEIGHT - 8}px`}>
          <figure data-row="idle" style="margin:0"><Truffle expression="neutral" outfit={id} size={220} label={null} /></figure>
          <figure data-row="tile" style="margin:0"><Truffle mood="content" outfit={id} size={64} label={null} /></figure>
          <figure data-row="cheer" style="margin:0"><Truffle expression="joy" paws={raised} outfit={id} size={220} label={null} /></figure>
          <div>{costumeById(id)?.zh ?? id}</div>
        </div>
      ))}
    </div>,
    app,
  );
}
```

Create `scripts/costume-sheet.ts`:

```ts
// A WebKit contact sheet of costumes for the v3 check (rewards spec §5.1): each at 220 px idle, at the 64 px Wardrobe tile, and
// at 220 px cheering with his right paw raised, saved to fit-shots/costumes/<label>.png to compare by eye with
// docs/worlds/costumes/standard-v3.png. Fails if a costume doesn't draw or a held prop crosses his eyes or mouth.
// Usage: npx tsx scripts/costume-sheet.ts <label> [id,id,...]   (no ids: every costume in the chest)
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';
import { CHEST_COSTUMES } from '../src/fun/costumes';
import { bundleStagePage } from './stage-cases/bundle';
import { SHEET_CELL_HEIGHT, SHEET_COLUMNS, SHEET_PROBE } from './stage-cases/faceProbe';

const [label = 'sheet', list] = process.argv.slice(2);
const ids = list ? list.split(',') : CHEST_COSTUMES.map((c) => c.id);
const dir = await bundleStagePage();
const browser = await webkit.launch();
// tall enough that every figure is on screen: elementFromPoint only sees the viewport
const page = await browser.newPage({ viewport: { width: SHEET_COLUMNS * 240 + 20, height: Math.ceil(ids.length / SHEET_COLUMNS) * SHEET_CELL_HEIGHT + 40 } });
await page.goto(`file://${dir}/index.html?case=costume-sheet&ids=${ids.join(',')}`);
await page.waitForTimeout(500);
mkdirSync('fit-shots/costumes', { recursive: true });
await page.screenshot({ path: `fit-shots/costumes/${label}.png`, fullPage: true });
const problems = await page.evaluate<string[]>(SHEET_PROBE);
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : `costume sheet ${label}: ok (${ids.length}) → fit-shots/costumes/${label}.png`);
process.exit(problems.length ? 1 : 0);
```

- [ ] **Step 7: Run the tests and the sheet**

Run: `npx vitest run src/ui/truffle/pawSlots.test.tsx src/ui/truffle/v3.test.ts src/ui/truffle/Truffle.test.tsx src/ui/truffle/useRig.test.tsx && npx tsc --noEmit`
Expected: PASS. `V3` is empty, so the per-costume rule tests pass trivially; the kit tests do run.

Run: `npx tsx scripts/costume-sheet.ts rig-check chef,tiger,wukong`
Expected: `costume sheet rig-check: ok (3)`. Open `fit-shots/costumes/rig-check.png` and check the three rows render.

- [ ] **Step 8: Commit**

```bash
git add src/ui/truffle/Truffle.tsx src/ui/truffle/costumes.ts src/ui/truffle/costumeKit.ts src/ui/truffle/v3.ts src/ui/truffle/v3.test.ts src/ui/truffle/pawSlots.test.tsx scripts/stage-cases.ts scripts/stage-cases/bundle.ts scripts/stage-cases/faceProbe.ts scripts/stage-cases/page.tsx scripts/costume-sheet.ts
git commit -m "feat(truffle): pawL/pawR costume slots, the v3 kit, and a WebKit costume sheet with a face probe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## The costume tasks (8–11): how each is done

Every costume in Tasks 8–11 follows the same loop. Each task repeats the parts that bind it.

1. **The catalogue entry** goes in `src/fun/costumes.ts`, with the exact id, 中文, pinyin (one syllable per character) and dominant colour given in the task.
2. **The art** is a `() => CostumeLayer` in the family file, built from `costumeKit` helpers:
   - `tint`, `hood`, `belly`, `eyes`, `pair`, `mx`, `ropeTail`;
   - and the v3 helpers `cel`, `hi`, `rope`, `heldPole`, `gloveL`/`gloveR`, `pawOverL`/`pawOverR`.
   Its fields:
   - `back`: things behind him;
   - `body`: the suit over his body;
   - `head`: the hood or headgear, drawn over his face rig, so keep it off the eyes (y 95–141) and mouth (y 145–180);
   - `tail`: replaces his tail; `''` hides it;
   - `pawL`/`pawR`: gloves and held props, drawn after the paw;
   - `hidesEars`: true when a hood, hair or helmet covers his ears.
3. **Light-cel rules (spec §5.1):**
   - Line `#706889`: use `S` (2.8) for outer lines and `s2` (1.8) for inner ones.
   - Flat fills only.
   - Each big piece (the hood, a hat, a robe, a big prop) has **one hard shadow as an explicit path**. Use `cel(…)` with the anchor at the piece's upper left, or the shadow `tint`/`hood` bake in.
   - Light comes from the upper left. Highlights (`hi`) go upper left.
   - No `clip-path`, no gradients, no filters, no `url(#…)`, no emoji.
4. **Shape rules:**
   - The costume changes his whole silhouette.
   - It has one dominant colour: the catalogue colour, whose `celShade` must appear.
   - Its signature prop or face reads at 64 px.
   - Headgear reaches both edges of his head (x ≤ 62 and ≥ 258 at the brow).
   - A band, circlet or hair never grows into a cap over his crown. A helmet or hat may.
   - His face stays readable.
   - **No prop crosses his face**, idle or cheering.
   - Everything behind him and on his head stays inside his box (x 31.6–288.4, y ≥ 21.6). Only a prop running off the bottom edge into the ground (the hose) may leave it.
5. **Checks, in this order:**
   - `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts src/ui/truffle/Truffle.test.tsx`
   - `npx tsx scripts/costume-sheet.ts <family> <ids>`. This renders a **WebKit contact sheet at 220 px idle, the 64 px tile and 220 px cheer**, and fails if a held prop crosses his face.
   - Open `fit-shots/costumes/<family>.png` **and** `docs/worlds/costumes/standard-v3.png` with the Read tool. Compare each costume against rows B (idle), C (tile) and D (cheer), and against the six samples, using the checklist in the task.
   - Iterate the art until every box is ticked. Then run `npm run test:fast`.

Pixel art cannot be fully written in a plan, so each task gives:
- the six samples to **port verbatim** from `docs/worlds/costumes/samples-v3.ts.txt`, replacing each sample's local helpers (lines 10–27) with the kit imports, which are the same code;
- one new costume written in full as the worked example;
- a design brief for every other costume: the exact colours, the pieces and their places, and what tells it from its lookalike.

Draw each briefed costume to its brief at the worked example's level of finish.

---

### Task 8: New onesies I, the river creatures: 水獭 熊猫 犀鸟 青蛙 鸭子 蜻蜓 锦鲤 螃蟹 鹦鹉

**Files:**
- Create: `src/ui/truffle/onesiesRiver.ts`
- Modify: `src/ui/truffle/v3.ts`, `src/fun/costumes.ts` (`ANIMALS`), `src/ui/truffle/v3.test.ts`, `src/fun/costumes.test.ts` (`PAIRS`)

**Interfaces:**
- Consumes: the Task 7 kit, `CostumeLayer`, `V3`.
- Produces: `RIVER_ONESIES: Record<string, () => CostumeLayer>` with keys `otter panda hornbill frog duck dragonfly koi crab parrot`. They are spread into `V3`, and 9 `ANIMALS` entries are added (set `animal`, kind `onesie`).

- [ ] **Step 1: Write the failing test**

Append to `src/ui/truffle/v3.test.ts`:

```ts
describe('the river onesies (rewards spec §5.2)', () => {
  it('are drawn and on the 动物 shelf', () => {
    for (const id of ['otter', 'panda', 'hornbill', 'frog', 'duck', 'dragonfly', 'koi', 'crab', 'parrot']) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'animal', kind: 'onesie' });
      expect(V3[id]!().hidesEars, id).toBe(true);
    }
  });
});
```

In `src/fun/costumes.test.ts`, add `['koi', 'crab']` to `PAIRS`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/truffle/v3.test.ts -t "river onesies"`
Expected: FAIL. `V3.otter` is undefined.

- [ ] **Step 3: Add the catalogue entries**

In `src/fun/costumes.ts`, add `const an = shelf('animal', 'onesie');` next to the other shelf makers, and change `export const ANIMALS: Costume[] = [];` to:

```ts
export const ANIMALS: Costume[] = [
  // the river creatures (Task 8)
  an('otter', '水獭', 'shuǐ tǎ', '#93643f'), an('panda', '熊猫', 'xióng māo', '#fbfaf6'), an('hornbill', '犀鸟', 'xī niǎo', '#3d3845'),
  an('frog', '青蛙', 'qīng wā', '#7cc84a'), an('duck', '鸭子', 'yā zi', '#ffd84a'), an('dragonfly', '蜻蜓', 'qīng tíng', '#3fb6c8'),
  an('koi', '锦鲤', 'jǐn lǐ', '#fffaf2'), an('crab', '螃蟹', 'páng xiè', '#d8382e'), an('parrot', '鹦鹉', 'yīng wǔ', '#2f8fd6'),
];
```

- [ ] **Step 4: Port the two samples and write the worked example**

Create `src/ui/truffle/onesiesRiver.ts`:

```ts
// The river onesies (rewards spec 2026-10-15 §5.2): the creatures of One River's worlds, each a hood with the animal's own face,
// its body and tail, to the v3 standard (docs/worlds/costumes/standard-v3.png). otter and panda are the parent-approved samples.
import { belly, cel, celShade, DARK, eyes, gloveL, gloveR, hi, hood, INK, pair, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

// 1. 水獭 otter: port `otter` (samples-v3.ts.txt lines 37–59) verbatim, with OTTER and OTTER_CREAM.
// 2. 熊猫 panda: port `panda` (samples-v3.ts.txt lines 62–83) verbatim, with PANDA and BLK.

// 3. 青蛙 frog (the worked example): a green hood with two big eyes standing on top, a wide smile across its brow, a pale
//    belly, spots, webbed feet and green gloves; no tail.
const FROG = '#7cc84a';
const FROG_BELLY = '#e4f5b8';
const frog = (): CostumeLayer => ({
  back: '',
  body: tint(FROG) + belly(FROG_BELLY) +
    pair((f) => `<circle cx="${f(104)}" cy="214" r="6" fill="${celShade(FROG)}"/><circle cx="${f(110)}" cy="240" r="4.5" fill="${celShade(FROG)}"/>`) +
    pair((f) => `<path d="M${f(94)} 272 L${f(100)} 256 L${f(110)} 266 L${f(120)} 254 L${f(126)} 272 Z" fill="${FROG}" ${S}/>`),
  head: hood(FROG) +
    // each eye is a dome on the hood's top, lit from the upper left on both sides
    pair((f) => cel(`M${f(116)} 54 C${f(116)} 26 ${f(160)} 26 ${f(160)} 54 C${f(160)} 70 ${f(116)} 70 ${f(116)} 54 Z`, FROG, Math.min(f(116), f(160)) + 10, 34, 0.88) +
      `<circle cx="${f(138)}" cy="48" r="11" fill="#fffdf7" ${s2}/><circle cx="${f(139)}" cy="49" r="6" fill="${DARK}"/><circle cx="${f(141)}" cy="46.5" r="2" fill="#fff"/>`) +
    `<path d="M128 66 Q160 80 192 66" fill="none" stroke="${celShade(FROG)}" stroke-width="3.4" stroke-linecap="round"/>` +
    pair((f) => `<ellipse cx="${f(112)}" cy="68" rx="6" ry="4" fill="#ff9d8a" opacity=".5"/>`),
  tail: '', // a frog has none: his own is hidden
  pawL: gloveL(FROG),
  pawR: gloveR(FROG),
  hidesEars: true,
});

export const RIVER_ONESIES: Record<string, () => CostumeLayer> = { otter, panda, frog /* + the six below */ };
```

- [ ] **Step 5: Draw the other six to their briefs**

| id | Dominant | Head (hood, on top, on the brow) | Body | Tail | Paws | Told apart from |
|---|---|---|---|---|---|---|
| `hornbill` 犀鸟 | `#3d3845` charcoal | `hood(…)`. Along the crown sits the casque, a cream-yellow `#f6e7a1` cel piece about 110 wide (x 105–215, y 24–56). Under it, the yellow `#ffc94a` bill curves down to a point at (160, 86), never below y 90. The hood eyes are white rings (r 7) with dark pupils, because dark on charcoal won't read. | `tint`, a white `#ffffff` belly, and charcoal wings as two `cel` pieces down his sides | A long charcoal fan (cel) with a white band near the tip | `gloveL/R('#3d3845')` | 喜鹊: the casque, a short tail |
| `duck` 鸭子 | `#ffd84a` | `hood(…)`. A flat orange `#ff9f2e` bill lies across the brow (x 132–188, y 58–76, cel) with two nostril dots. A tuft of 3 feathers stands on top (y ≥ 24). `eyes(26, 50)`. | `tint`, `belly('#fff4c2')`, yellow wings (cel) down both sides, orange webbed feet (3 toes each) at y 258–272 | A short upturned yellow tuft | cream paws (none) | 鸡: the flat orange bill |
| `dragonfly` 蜻蜓 | `#3fb6c8` teal | `hood(…)`. Two huge compound eyes on top: `#2f8fd6` circles r 18 at (128, 46) and (192, 46), each with 3 short hatch lines and a white catch-light. | `tint` with 3 darker `celShade` bands across the belly | A long thin segmented abdomen (`rope`, teal with 4 dark bands) curving right to x ≤ 284 | `gloveL/R('#3fb6c8')` | Its `back` has four clear wings (`#e6f7ff`, line `S`, 2 vein lines each) fanning from his shoulders to x 40 and x 280, y 150–232 |
| `koi` 锦鲤 | `#fffaf2` white | `hood(…)`. A big orange-red `#f26b3a` patch over the crown (cel) and two small patches by the cheeks, outside the face opening. Two barbels (`rope`, 3 wide) curl out from the brow. Two orange fins stand at the hood's sides (x 46–70, y 100–140). | `tint` with two `#f26b3a` patches and a row of 5 scale arcs (`s2`) | A big flowing fan tail: `#f26b3a`, tips `#fffaf2`, cel | `gloveL/R('#f26b3a')` (fin mitts) | 螃蟹: white with orange patches, not red |
| `crab` 螃蟹 | `#d8382e` | `hood(…)`. Two eye stalks (`rope`, 6 wide) rise from the top to white eyeballs (r 9) with dark pupils at y 30–40, plus a wide smile line on the brow. | `tint`, a pale belly plate `#ffd9c7` (cel), and 3 little legs on each side (`rope` strokes outward, y 220–260) | `''` (none) | Each paw is a big two-part pincer: a red `cel` claw closing round it, open toward the front, readable at 64 px | 锦鲤: red all over, the pincers |
| `parrot` 鹦鹉 | `#2f8fd6` blue | `hood(…)`. A hooked beak on the brow: a dark `#3d3845` upper bill curving down to y 86, with a paler lower bill. White face patches with 3 thin lines sit on the hood's cheeks, outside the face opening. | `tint` with a gold `#ffd23f` chest (cel). Blue wings down his sides with a green `#3fbf6a` edge band. | Two long blue tail feathers with gold undersides (cel), sweeping down-right | `gloveL/R('#3d3845')` (dark feet) | 喜鹊: bright blue and gold, a hooked beak |

Then complete the export:

```ts
export const RIVER_ONESIES: Record<string, () => CostumeLayer> = { otter, panda, hornbill, frog, duck, dragonfly, koi, crab, parrot };
```

In `src/ui/truffle/v3.ts`, add `import { RIVER_ONESIES } from './onesiesRiver';` and change the registry to `export const V3: Record<string, () => CostumeLayer> = { ...RIVER_ONESIES };`.

- [ ] **Step 6: Run the unit tests**

Run: `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts src/ui/truffle/Truffle.test.tsx && npx tsc --noEmit`
Expected: PASS. Every v3 rule holds for all 9, and the zodiac box test passes too, because the onesie test iterates `kind: 'onesie'`.

- [ ] **Step 7: The WebKit contact sheet and the v3 comparison**

Run: `npx tsx scripts/costume-sheet.ts onesies-river otter,panda,hornbill,frog,duck,dragonfly,koi,crab,parrot`
Expected: `ok (9)`, with no prop crossing his face.

Open `fit-shots/costumes/onesies-river.png` and `docs/worlds/costumes/standard-v3.png`. Tick every box for every costume, then redraw and rerun until all pass:
- [ ] It changes his whole silhouette (the hood plus its own top shape, tail and feet).
- [ ] One dominant colour.
- [ ] The animal reads at the 64 px tile (row C).
- [ ] Light cel: violet line, flat fills, one hard shadow on the lower right of the hood and big pieces, highlight on the upper left. No soft gradients.
- [ ] The hood reaches both head edges.
- [ ] His eyes and mouth are fully readable, idle and cheering.
- [ ] Gloves and claws rise with the paw in the cheer row.
- [ ] It is told apart from its lookalike, as the brief says.
- [ ] otter and panda match sample row B exactly.

- [ ] **Step 8: Run the fast suite and commit**

Run: `npm run test:fast`
Expected: PASS.

```bash
git add src/ui/truffle/onesiesRiver.ts src/ui/truffle/v3.ts src/fun/costumes.ts src/ui/truffle/v3.test.ts src/fun/costumes.test.ts
git commit -m "feat(costumes): the river onesies: otter, panda, hornbill, frog, duck, dragonfly, koi, crab, parrot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: New onesies II, his favourites: 小恐龙 翼龙 喜鹊 企鹅 鲨鱼 独角兽 猫头鹰 小老虎 小白兔

**Files:**
- Create: `src/ui/truffle/onesiesFavourite.ts`
- Modify: `src/ui/truffle/v3.ts`, `src/fun/costumes.ts` (`ANIMALS`), `src/ui/truffle/v3.test.ts`, `src/fun/costumes.test.ts` (`PAIRS`)

**Interfaces:**
- Consumes: the Task 7 kit, `V3`.
- Produces: `FAVOURITE_ONESIES: Record<string, () => CostumeLayer>` with keys `babydino pterosaur magpie penguin shark unicorn owl tigercub bunny`. They are spread into `V3`, and 9 more `ANIMALS` entries are added.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/truffle/v3.test.ts`:

```ts
describe('the favourite onesies (rewards spec §5.2)', () => {
  it('are drawn and on the 动物 shelf', () => {
    for (const id of ['babydino', 'pterosaur', 'magpie', 'penguin', 'shark', 'unicorn', 'owl', 'tigercub', 'bunny']) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'animal', kind: 'onesie' });
    }
  });
  it('the bunny carries its carrot in its right paw (told from the zodiac 兔 by it and its lop ears)', () => {
    expect(V3.bunny!().pawR).toContain('#ff9f43');
  });
});
```

In `src/fun/costumes.test.ts`, add these to `PAIRS`:

```ts
['tigercub', 'tiger'], ['babydino', 'dragon'], ['pterosaur', 'dragon'], ['pterosaur', 'babydino'], ['magpie', 'hornbill'], ['penguin', 'hornbill'], ['parrot', 'magpie'], ['shark', 'rat'], ['owl', 'otter'], ['unicorn', 'rabbit'],
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/v3.test.ts -t "favourite"`
Expected: FAIL.

- [ ] **Step 3: Add the catalogue entries**

Append to `ANIMALS` in `src/fun/costumes.ts`:

```ts
  // his favourites (Task 9)
  an('babydino', '小恐龙', 'xiǎo kǒng lóng', '#8f6fd6'), an('pterosaur', '翼龙', 'yì lóng', '#c96f9a'), an('magpie', '喜鹊', 'xǐ què', '#2a4f8f'),
  an('penguin', '企鹅', 'qǐ é', '#c7ccd6'), an('shark', '鲨鱼', 'shā yú', '#4f7fb8'), an('unicorn', '独角兽', 'dú jiǎo shòu', '#cdb0f2'),
  an('owl', '猫头鹰', 'māo tóu yīng', '#7a6a9a'), an('tigercub', '小老虎', 'xiǎo lǎo hǔ', '#f2f0fa'), an('bunny', '小白兔', 'xiǎo bái tù', '#fffefa'),
```

- [ ] **Step 4: Write the worked example**

Create `src/ui/truffle/onesiesFavourite.ts`:

```ts
// His favourite onesies (rewards spec 2026-10-15 §5.2), to the v3 standard (docs/worlds/costumes/standard-v3.png).
import { belly, cel, celShade, DARK, eyes, gloveL, gloveR, hi, hood, INK, pair, pawOverR, rope, ropeTail, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

// 企鹅 penguin (the worked example): a fluffy grey chick's hood under a dark cap that sweeps to both cheeks, a tuft, white-ringed
// eyes and a small beak; a white belly, flippers, orange feet; dark gloves.
const PENGUIN = '#c7ccd6';
const PG_CAP = '#3d3845';
const penguin = (): CostumeLayer => ({
  back: '',
  body: tint(PENGUIN) + belly('#ffffff') +
    pair((f) => cel(`M${f(112)} 196 C${f(94)} 212 ${f(88)} 236 ${f(96)} 254 C${f(104)} 252 ${f(110)} 238 ${f(116)} 216 Z`, PENGUIN, Math.min(f(112), f(88)) + 8, 210, 0.88)) +
    pair((f) => `<ellipse cx="${f(128)}" cy="271" rx="16" ry="6.5" fill="#ff9f43" ${S}/>`),
  head: hood(PENGUIN) +
    `<path d="M48 120 C46 62 100 30 160 30 C220 30 274 62 272 120 C258 98 232 84 200 80 C186 78 172 80 160 82 C148 80 134 78 120 80 C88 84 62 98 48 120 Z" fill="${PG_CAP}" ${S}/>` +
    hi('M84 66 C98 50 118 42 140 38', 5, 0.3) +
    `<path d="M150 32 C146 20 158 14 160 24 C164 14 176 18 170 32 Z" fill="${PG_CAP}" ${s2}/>` +
    pair((f) => `<circle cx="${f(132)}" cy="58" r="7.5" fill="#fffdf7"/><circle cx="${f(133)}" cy="59" r="4.2" fill="${DARK}"/><circle cx="${f(134.5)}" cy="57" r="1.5" fill="#fff"/>`) +
    `<path d="M151 66 L169 66 L160 77 Z" fill="#ffb03d" ${s2}/>`,
  tail: `<path d="M208 256 L230 262 L212 270 Z" fill="${PG_CAP}" ${S}/>`,
  pawL: gloveL(PG_CAP),
  pawR: gloveR(PG_CAP),
  hidesEars: true,
});

export const FAVOURITE_ONESIES: Record<string, () => CostumeLayer> = { penguin /* + the eight below */ };
```

- [ ] **Step 5: Draw the other eight to their briefs**

| id | Dominant | Head | Body | Tail | Paws / prop | Told apart from |
|---|---|---|---|---|---|---|
| `babydino` 小恐龙 | `#8f6fd6` purple | `hood(…)`. A row of 5 round yellow `#ffd84a` spikes along the crown (circles, middle tallest, all y ≥ 24). Big friendly `eyes(24, 52)` and two round nostrils. | `tint`, a cream belly with 3 rib lines, and a cracked eggshell (`#fffaf2`, zig-zag top, cel) round his waist like shorts, y 240–275 | A thick purple dino tail (cel) with 3 small yellow spikes | `gloveL/R('#8f6fd6')` | 龙: purple, the eggshell, no horns or whiskers |
| `pterosaur` 翼龙 | `#c96f9a` mauve | `hood(…)`. A long backward crest (cel) sweeps from the crown to the right, to x ≤ 286, y ≥ 24. A short beak (cel, `#e8a3c1`) on the brow points up-left, above y 90. | `tint`; its `back` has two big leathery wings (membrane `#e8a3c1`, 3 finger-bone lines `s2`) from the shoulders out to x 36 and x 284, y 150–250 | `''` | `gloveL/R('#c96f9a')` with 3 small claw ticks | 小恐龙: mauve, the wings and crest |
| `magpie` 喜鹊 | `#2a4f8f` blue-black | `hood(…)`. White cheek bands on the hood, a short dark beak on the brow (above y 90), white-ringed eyes. | `tint`, a white belly, white shoulder patches (cel) | A very long two-feather tail sweeping right and up (`rope` 12 wide `#2a4f8f`, with a lighter `#4c7fd6` sheen line), the signature | `gloveL/R('#3d3845')` | 犀鸟: no casque, the long tail |
| `shark` 鲨鱼 | `#4f7fb8` blue | `hood(…)`. A tall dorsal fin on the crown (cel triangle, y ≥ 22). A row of 7 small white triangle teeth along the top arc of the face opening only (y 76–88), friendly and above his eyes. Small dark eyes. | `tint`, a white `#f4f7fb` belly, 3 curved gill lines on each side | A crescent shark tail fin (cel) | `gloveL/R('#4f7fb8')` (fins) | 鼠: the fin and teeth, blue |
| `unicorn` 独角兽 | `#cdb0f2` lilac | `hood(…)`. A gold `#f2c230` spiral horn (cel, 3 band lines) rising from the forehead to y ≥ 24, with two small ears beside it. A rainbow mane of 4 `rope` strands (`#ff8fa3`, `#ffd23f`, `#7fdc7a`, `#7fc0ea`) falls down the hood's right side to y ~170. | `tint` | A rainbow tail (the same 4 strands) | `gloveL/R('#f2c230')` (gold hooves) | 兔: the horn and mane, lilac |
| `owl` 猫头鹰 | `#7a6a9a` dusky violet | `hood(…)`. Two feather ear tufts (cel, y ≥ 24). A big pale facial disc on the hood: two cream `#f3e6c8` circles r 16 at the brow with amber `#ffb03d` eyes (r 9) and dark pupils. A small hooked beak `#ffc94a` between them, above y 90. | `tint`, a cream chest with V-feather marks, wings down his sides | A short fan (cel) | `pawR`: a small open book (cream pages, blue `#3f6fd6` cover, cel) held at his side, x 188–232, y 226–262, plus `pawOverR`. `pawL`: `gloveL('#7a6a9a')` | 水獭: violet, the disc and the book |
| `tigercub` 小老虎 | `#f2f0fa` white (a white tiger cub) | `hood(…)`. Grey-violet `#6b6585` stripes, a small 王 on the forehead (as the zodiac 虎 does, smaller), round ears on top (r 14, pink insides), and blue `#7fc0ea` hood eyes. | `tint`, stripes on the sides | White with 4 dark rings (`ropeTail` plus ring strokes) | `gloveL/R('#f2f0fa')` with pink pads | 虎: white, not orange; round baby ears |
| `bunny` 小白兔 | `#fffefa` white | `hood(…)`. Two lop ears flopping down the hood's sides (cel, x 40–72 and 248–280, down to y ~150), pink `#f6c2cc` insides, a pink nose dot on the brow. | `tint`, `belly('#ffffff')` | A round fluffy tail (circle r 16, cel) | `pawR`: an orange `#ff9f43` carrot (cel, 3 ridge lines) with green `#46b06a` leaves, held up beside him, x 196–236, y 196–262, plus `pawOverR` | 兔: lop ears and the carrot (it is white by its name) |

Complete the export with all nine, then in `src/ui/truffle/v3.ts` add the import and spread it: `{ ...RIVER_ONESIES, ...FAVOURITE_ONESIES }`.

- [ ] **Step 6: Run the unit tests**

Run: `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts src/ui/truffle/Truffle.test.tsx && npx tsc --noEmit`
Expected: PASS, including all the lookalike pairs.

- [ ] **Step 7: The WebKit contact sheet and the v3 comparison**

Run: `npx tsx scripts/costume-sheet.ts onesies-favourite babydino,pterosaur,magpie,penguin,shark,unicorn,owl,tigercub,bunny`
Expected: `ok (9)`, with no prop crossing his face. The owl's book and the bunny's carrot must clear his face when the paw is raised.

Open `fit-shots/costumes/onesies-favourite.png` beside `docs/worlds/costumes/standard-v3.png`, and tick every box for every costume:
- [ ] Whole silhouette.
- [ ] One dominant colour.
- [ ] The animal reads at 64 px.
- [ ] Light cel: violet line, flat fills, one hard shadow on the lower right, light upper left.
- [ ] The hood reaches both head edges.
- [ ] Eyes and mouth readable, idle and cheering.
- [ ] Props ride the raised paw and stay off his face.
- [ ] Told apart from its lookalike.
- [ ] The wings (翼龙) and tails stay inside his box.

Redraw and rerun until all pass.

- [ ] **Step 8: Run the fast suite and commit**

Run: `npm run test:fast`
Expected: PASS.

```bash
git add src/ui/truffle/onesiesFavourite.ts src/ui/truffle/v3.ts src/fun/costumes.ts src/ui/truffle/v3.test.ts src/fun/costumes.test.ts
git commit -m "feat(costumes): his favourite onesies: baby dino, pterosaur, magpie, penguin, shark, unicorn, owl, tiger cub, bunny

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Jobs redrawn full-body: 宇航员 厨师 消防员 医生 飞行员 警察 足球员 魔法师 海盗 小贩

**Files:**
- Create: `src/ui/truffle/jobs.ts`
- Modify: `src/ui/truffle/v3.ts`, `src/fun/costumes.ts` (`JOBS`), `src/ui/truffle/costumes.ts` (delete the old `OUTFIT` entries `astronaut`, `chef`, `wizard`, `pirate`, `football`), `src/ui/truffle/v3.test.ts`, `src/fun/costumes.test.ts` (`PAIRS`)

**Interfaces:**
- Consumes: the Task 7 kit, `V3`, `EYE_L`/`EYE_R`/`EYE_Y` from `rig.ts` (where needed).
- Produces: `JOB_COSTUMES: Record<string, () => CostumeLayer>` with keys `astronaut chef firefighter doctor pilot police football wizard pirate hawker`, spread into `V3`. `JOBS` has all 10.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/truffle/v3.test.ts`:

```ts
describe('the jobs, full-body (rewards spec §5.2)', () => {
  it('all ten are drawn and on the 职业 shelf', () => {
    const ids = ['astronaut', 'chef', 'firefighter', 'doctor', 'pilot', 'police', 'football', 'wizard', 'pirate', 'hawker'];
    for (const id of ids) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'job', kind: 'outfit' });
    }
  });
  it("the pirate's eye patch is up on his hat, never over an eye (his face stays readable)", () => {
    expect(V3.pirate!().head).not.toMatch(/<ellipse cx="202" cy="118"/);
  });
});
```

In `src/fun/costumes.test.ts`, add `['football', 'firefighter'], ['police', 'pirate'], ['police', 'hawker'],` to `PAIRS`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/v3.test.ts -t "jobs"`
Expected: FAIL.

- [ ] **Step 3: Complete the catalogue**

Replace `JOBS` in `src/fun/costumes.ts` with:

```ts
/** Jobs, drawn full-body (spec §5.2). `football` keeps its id and is now 足球员, in a yellow jersey. */
export const JOBS: Costume[] = [
  j('astronaut', '宇航员', 'yǔ háng yuán', '#f2f4f8'), j('chef', '厨师', 'chú shī', '#fffdf7'), j('firefighter', '消防员', 'xiāo fáng yuán', '#d8302a'),
  j('doctor', '医生', 'yī shēng', '#49b8a8'), j('pilot', '飞行员', 'fēi xíng yuán', '#9a6338'), j('police', '警察', 'jǐng chá', '#2a3f7a'),
  j('football', '足球员', 'zú qiú yuán', '#ffcc2e'), j('wizard', '魔法师', 'mó fǎ shī', '#7b5cd6'), j('pirate', '海盗', 'hǎi dào', '#2d2a33'),
  j('hawker', '小贩', 'xiǎo fàn', '#2f74c9'),
];
```

- [ ] **Step 4: Port the two samples and write the worked example**

Create `src/ui/truffle/jobs.ts`:

```ts
// Jobs, drawn full-body (rewards spec 2026-10-15 §5.2) to the v3 standard: each a whole outfit with headgear across his head and
// the thing a child knows the job by, held in a paw. firefighter and hawker are the parent-approved samples.
import { cel, celShade, gloveL, gloveR, heldPole, hi, INK, num, pair, pawOverL, pawOverR, rope, S, s2, tint, CREAM_PAW, PAW_L_D, PAW_R_D } from './costumeKit';
import type { CostumeLayer } from './costumes';

// 消防员 firefighter: port `firefighter` (samples-v3.ts.txt lines 86–120) verbatim, with FIRE, FIRE_GOLD, BAND_Y and bandAt.
// 小贩 hawker: port `hawker` (samples-v3.ts.txt lines 123–156) verbatim, with APRON and TOWEL.

// 医生 doctor (the worked example): teal scrubs under an open white coat, a stethoscope round his neck, a white band right across
// his head with the round head mirror on its front, blue gloves, and the doctor's bag with its red cross in his left paw.
const SCRUB = '#49b8a8';
const COAT = '#fbfdff';
const doctor = (): CostumeLayer => ({
  back: '',
  body: tint(SCRUB) +
    pair((f) => cel(`M${f(112)} 188 C${f(94)} 206 ${f(88)} 240 ${f(102)} 266 L${f(146)} 270 L${f(146)} 214 L${f(134)} 192 Z`, COAT, Math.min(f(112), f(146)) + 10, 200, 0.92)) +
    pair((f) => `<path d="M${f(134)} 192 L${f(148)} 212 L${f(146)} 226" fill="none" ${s2}/>`) +
    `<path d="M128 194 C126 222 142 238 160 238 C178 238 194 222 192 194" fill="none" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/>` +
    `<path d="M128 194 C126 222 142 238 160 238 C178 238 194 222 192 194" fill="none" stroke="#3d3845" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M160 238 L160 248" stroke="#3d3845" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="160" cy="255" r="8" fill="#d9dde6" ${S}/><circle cx="157.5" cy="252.5" r="2.4" fill="#fff"/>`,
  head:
    `<path d="M54 98 C94 60 226 60 266 98 L264 112 C226 74 94 74 56 112 Z" fill="${COAT}" ${S}/>` +
    `<path d="M62 102 C100 68 220 68 258 102" fill="none" stroke="${celShade(COAT)}" stroke-width="2"/>` +
    cel('M140 76 C140 56 180 56 180 76 C180 96 140 96 140 76 Z', '#d9dde6', 150, 64, 0.86) +
    `<circle cx="160" cy="76" r="5" fill="#3d3845"/>` + hi('M146 70 C149 64 154 62 160 61', 3, 0.7),
  pawL: cel('M82 238 L136 238 L140 272 L78 272 Z', '#8a5a3c', 90, 244, 0.9) +
    `<path d="M96 238 C96 224 122 224 122 238" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M96 238 C96 224 122 224 122 238" fill="none" stroke="#6a452b" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M105 246 L113 246 L113 251 L118 251 L118 259 L113 259 L113 264 L105 264 L105 259 L100 259 L100 251 L105 251 Z" fill="#fff" stroke="#d8302a" stroke-width="2" stroke-linejoin="round"/>` +
    gloveL('#bfe6ff'),
  pawR: gloveR('#bfe6ff'),
  hidesEars: false,
});

export const JOB_COSTUMES: Record<string, () => CostumeLayer> = { firefighter, hawker, doctor /* + the seven below */ };
```

Drop any kit import the file does not use once it is finished.

- [ ] **Step 5: Draw the other seven to their briefs**

| id | Dominant | Headgear (both edges) | Body | Paws / prop | Told apart by |
|---|---|---|---|---|---|
| `astronaut` 宇航员 | `#f2f4f8` white | A white helmet ring round his whole head (cel, x 44–276, y 26–200), a clear visor over his face (`#bfe0ff`, `fill-opacity=".2"`, flat, no gradient, line `S`), and a small antenna with a red tip (y ≥ 24) | A white suit (`tint`) with a blue `#3f6fd6` and an orange `#ff8a3d` patch and a chest control box with 3 lights; `back`: a white life-support pack behind his shoulders (cel) | `gloveL/R('#d9dde6')` | The helmet ring |
| `chef` 厨师 | `#fffdf7` white | A tall puffed toque: a band reaching both edges (x 54–266, y 70–104), puffs above (cel, top y ≥ 22), pleat lines | A white double-breasted jacket (`tint`, 2 rows of 3 buttons) and a red `#d8302a` neckerchief | `pawR`: a black `#3d3845` frying pan (cel) with a fried egg (white plus yolk) whose handle runs through the paw (`heldPole` brown), plus `pawOverR`; `pawL`: a wooden spoon (`heldPole` `#c98f55`), plus `pawOverL` | The toque and the pan |
| `pilot` 飞行员 | `#9a6338` leather brown | A leather flying cap over his head to both edges (cel, x 50–270) with ear flaps down the cheek tufts, and goggles (two amber `#ffd27a` lenses in metal rims) pushed up on the forehead, above y 90 | A brown leather jacket (`tint`) with a fleece collar `#fff4dc` (cel); `back`: a white scarf flying out to the right (`rope` 10 wide) | `pawR`: a toy plane (red `#d8302a` body, cream wings, cel) held up beside him at x 190–240, plus `pawOverR` | The goggles and the scarf |
| `police` 警察 | `#2a3f7a` dark blue | A peaked cap: the crown over his head (cel), a black peak, a checked band of alternating dark-blue and white squares running edge to edge (x 54–266), a gold badge on the front | A dark-blue uniform (`tint`), a gold badge on the chest, a belt, a whistle on a cord | `pawR`: a round red `#d8302a` sign on a short pole (`heldPole`) with a white 停 (`<text font-family="WenKai, serif">停</text>`, as the old 超人 badge drew 字), plus `pawOverR` | The checked band and the sign |
| `football` 足球员 | `#ffcc2e` yellow jersey | A green `#2fae5a` sweatband right across his forehead (x 54–266, y 90–106), never over the crown | A yellow jersey (`tint`) with a green collar and `num('7', 160, 232, '#2fae5a')`, green shorts, white socks | `pawL`: a black-and-white football (circle r 18 at (112, 256) with a pentagon) under his paw, plus `pawOverL` | Yellow, the ball |
| `wizard` 魔法师 | `#7b5cd6` purple | A tall pointed hat whose wide brim reaches both edges (cel, x 50–270 at y ~76), its tip flopping over to the right (x ≤ 286, y ≥ 22), a gold band, 2 gold stars | A purple robe (`tint`) with gold stars and a gold rope belt | `pawR`: a long staff (`heldPole(196, 262, -75, 20, 130, '#8a5a3c', 7)`) topped by a gold star (cel) out to his right, never across his face when raised, plus `pawOverR` | The hat and the star staff |
| `pirate` 海盗 | `#2d2a33` black | A black tricorn whose brim reaches both edges (cel, x 50–270), a gold edge, a white skull-and-bones on the front, and the eye patch **flipped up onto the brim** (both eyes show) | A black long coat (`tint`) over a red-and-white striped shirt, a red sash, gold buttons; a little green `#3fbf6a` parrot on his left shoulder (body layer, x 96–124, y 168–196, beside his head) | `pawR`: a brass spyglass (`heldPole`, `#c98f55` with `#f2c230` caps) pointing up-right, plus `pawOverR` | The tricorn and the parrot |

Delete the old `astronaut`, `chef`, `wizard`, `pirate` and `football` entries from `OUTFIT` in `src/ui/truffle/costumes.ts`, because `V3` replaces them. Keep the eight old outfits: `explorer hero pixel raincoat robot rook basketball gi`.

Complete the export with all ten, and spread `...JOB_COSTUMES` into `V3`.

- [ ] **Step 6: Run the unit tests**

Run: `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts src/ui/truffle/Truffle.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: The WebKit contact sheet and the v3 comparison**

Run: `npx tsx scripts/costume-sheet.ts jobs astronaut,chef,firefighter,doctor,pilot,police,football,wizard,pirate,hawker`
Expected: `ok (10)`. Held props (pan, plane, sign, staff, spyglass, bag) must never cross his face, idle or cheering.

Open `fit-shots/costumes/jobs.png` beside `docs/worlds/costumes/standard-v3.png`, and tick every box for every costume:
- [ ] The whole body changed (full outfit, not a hat on a grey cat).
- [ ] One dominant colour.
- [ ] The signature prop reads at 64 px.
- [ ] Light cel: violet line, flat fills, one hard shadow on the lower right of the big pieces, light upper left.
- [ ] Headgear reaches both head edges.
- [ ] Bands (football) leave the crown visible.
- [ ] Eyes and mouth readable.
- [ ] Props ride the raised paw.
- [ ] Told apart as the brief says.
- [ ] firefighter and hawker match the samples (row B and the v3 column of row E).

Redraw and rerun until all pass.

- [ ] **Step 8: Run the fast suite and commit**

Run: `npm run test:fast`
Expected: PASS.

```bash
git add src/ui/truffle/jobs.ts src/ui/truffle/v3.ts src/ui/truffle/costumes.ts src/fun/costumes.ts src/ui/truffle/v3.test.ts src/fun/costumes.test.ts
git commit -m "feat(costumes): ten jobs drawn full-body with props in his paws

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The Chinese myths redrawn (孙悟空 哪吒 嫦娥 后羿 财神 招财猫 舞狮), and the 47-costume chest

**Files:**
- Create: `src/ui/truffle/myths.ts`
- Modify:
  - `src/ui/truffle/v3.ts`;
  - `src/fun/costumes.ts` (`CHINESE` colours and kinds);
  - `src/ui/truffle/mythCostumes.ts` (delete the Chinese entries `wukong nezha change houyi caishen luckycat` from `MYTH_OUTFIT` and `liondance` from `MYTH_HOOD`; keep every Greek entry);
  - `src/ui/truffle/v3.test.ts`, `src/fun/costumes.test.ts` (`PAIRS`, plus the totals and the pace).

**Interfaces:**
- Consumes: the Task 7 kit, `V3`, `fillMeter` (Task 1), `openChest` (Task 2).
- Produces: `MYTH_COSTUMES: Record<string, () => CostumeLayer>` with keys `wukong nezha change houyi caishen luckycat liondance`, spread into `V3`. The chest then holds 47 costumes.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/truffle/v3.test.ts`:

```ts
describe('the Chinese myths, redrawn (rewards spec §5.2)', () => {
  it('all seven are drawn; the fortune cat and the lion dance are hoods', () => {
    for (const id of ['wukong', 'nezha', 'change', 'houyi', 'caishen', 'luckycat', 'liondance']) expect(V3[id], id).toBeTypeOf('function');
    expect(costumeById('luckycat')?.kind).toBe('onesie');
    expect(costumeById('liondance')?.kind).toBe('onesie');
  });
  it('every chest costume but the kept zodiac is v3', async () => {
    const { CHEST_COSTUMES } = await import('../../fun/costumes');
    for (const c of CHEST_COSTUMES) if (c.set !== 'zodiac') expect(V3[c.id], c.id).toBeTypeOf('function');
  });
});
```

In `src/fun/costumes.test.ts`, add `['caishen', 'liondance'], ['nezha', 'liondance'],` to `PAIRS`. Then add `fillMeter` from `'./meter'` and `ANIMALS` to the imports, and append:

```ts
describe('the chest holds 63 prizes, and they last (rewards spec §5.2–5.3)', () => {
  it('47 costumes and 16 accessories', () => {
    expect(CHEST_COSTUMES).toHaveLength(47);
    expect(ONESIES.length + ANIMALS.length).toBe(30);
    expect(JOBS).toHaveLength(10);
    expect(CHINESE).toHaveLength(7);
    expect(CHEST_COSTUMES.length + ACCESSORIES.length).toBe(63);
  });
  it('at ≤2 chests a day, however many lessons, they last at least 32 days', () => {
    let kid: KidState = { ...DEFAULT_KID };
    let prizes = 0;
    let days = 0;
    while (prizes < 63) {
      const d = day(days);
      for (const [i, kind] of (['first', 'extra', 'extra', 'extra', 'extra'] as const).entries()) kid = fillMeter(kid, { kind, day: d, key: days * 10 + i }).kid;
      while (kid.meter.owed > 0) {
        const o = openChest(kid, d);
        kid = o.kid;
        if (o.result.kind !== 'stars') prizes++;
      }
      days++;
    }
    expect(days).toBeGreaterThanOrEqual(32);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts`
Expected: FAIL. The myths are not in `V3`, and the chest has fewer than 47 costumes.

- [ ] **Step 3: Update the catalogue**

Replace `CHINESE` in `src/fun/costumes.ts` with:

```ts
/** Chinese myths, and the fortune cat and the lion dance (redrawn to v3, spec §5.2). */
export const CHINESE: Costume[] = [
  c('wukong', '孙悟空', 'sūn wù kōng', '#f5b82e'), c('nezha', '哪吒', 'né zhā', '#ef6f8a'), c('change', '嫦娥', 'cháng é', '#f8cfe0'),
  c('houyi', '后羿', 'hòu yì', '#3d7a5a'), c('caishen', '财神', 'cái shén', '#9e1b32'), c('luckycat', '招财猫', 'zhāo cái māo', '#fff7ec', 'onesie'),
  c('liondance', '舞狮', 'wǔ shī', '#e0362c', 'onesie'),
];
```

- [ ] **Step 4: Port the two samples and write the worked example**

Create `src/ui/truffle/myths.ts`:

```ts
// The Chinese myths, the fortune cat and the lion dance (rewards spec 2026-10-15 §5.2), redrawn to the v3 standard. wukong and
// change are the parent-approved samples.
import { crescent } from '../cel';
import { cel, celShade, gloveL, gloveR, heldPole, hi, hood, INK, pair, pawOverL, pawOverR, rope, ropeTail, S, s2, tint, CREAM_PAW, PAW_R_D } from './costumeKit';
import type { CostumeLayer } from './costumes';

// 孙悟空 wukong: port `wukong` (samples-v3.ts.txt lines 159–196) verbatim, with WK, WK_RED, GOLD and plume.
// 嫦娥 change: port `change` (samples-v3.ts.txt lines 199–end of change) verbatim, with CE, CE_ROSE and HAIR.

// 哪吒 nezha (the worked example): the lotus-pink tunic and petal skirt, 混天绫 (the red sash) floating behind him, two buns
// high on his head with the hair across his brow from edge to edge, a red mark, and 乾坤圈 (the golden ring) in his right paw.
const NZ = '#ef6f8a';
const NZ_RED = '#d8302a';
const NZ_HAIR = '#3d3646';
const nezha = (): CostumeLayer => ({
  back: rope('M70 206 C40 180 44 140 72 132 C96 126 104 150 88 160', NZ_RED, 9) + rope('M250 206 C282 186 284 150 262 136', NZ_RED, 9),
  body: tint(NZ) +
    [96, 120, 144, 168, 192, 214].map((x, i) => cel(`M${x} 262 C${x - 10} 246 ${x - 4} 228 ${x + 8} 222 C${x + 20} 228 ${x + 24} 246 ${x + 16} 262 Z`, i % 2 ? '#f9b3c4' : NZ, x + 2, 232, 0.86)).join('') +
    `<path d="M104 196 C130 214 190 214 216 196 L218 208 C190 228 130 228 102 208 Z" fill="${NZ_RED}" ${S}/>`,
  head:
    pair((f) => cel(`M${f(98)} 56 C${f(84)} 30 ${f(118)} 18 ${f(132)} 38 C${f(140)} 52 ${f(120)} 66 ${f(98)} 56 Z`, NZ_HAIR, Math.min(f(98), f(132)) + 10, 32, 0.88) +
      `<path d="M${f(100)} 58 C${f(108)} 62 ${f(118)} 62 ${f(126)} 56" fill="none" stroke="${NZ_RED}" stroke-width="5" stroke-linecap="round"/>`) +
    `<path d="M54 100 C80 70 120 60 160 64 C200 60 240 70 266 100 C244 92 228 92 214 98 C200 88 180 86 160 90 C140 86 120 88 106 98 C92 92 76 92 54 100 Z" fill="${NZ_HAIR}" ${S}/>` +
    hi('M92 80 C106 70 124 66 142 66', 4, 0.25) +
    `<circle cx="160" cy="80" r="4" fill="${NZ_RED}"/>`,
  pawR: `<circle cx="214" cy="232" r="20" fill="none" stroke="${INK}" stroke-width="${10 + 2 * 2.8}"/><circle cx="214" cy="232" r="20" fill="none" stroke="#f2c230" stroke-width="10"/>` +
    hi('M200 220 C204 216 210 214 216 214', 3, 0.6) + pawOverR,
  hidesEars: true, // tucked under the buns
});

export const MYTH_COSTUMES: Record<string, () => CostumeLayer> = { wukong, change, nezha /* + the four below */ };
```

`celShade(NZ)` comes from `tint(NZ)`. Drop any kit import the file does not use once it is finished.

- [ ] **Step 5: Draw the other four to their briefs**

| id | Dominant | Head (both edges) | Body | Paws / prop | Told apart by |
|---|---|---|---|---|---|
| `houyi` 后羿 | `#3d7a5a` deep green | A red `#d8302a` headband tied edge to edge (x 54–266, y 88–104), its two ends flying out right; the crown stays visible | A green tunic (`tint`), leather `#8a5a3c` shoulder plates (cel), a belt with a small sun badge (`#ffb020`, 8 rays); `back`: a quiver of 3 red-fletched arrows poking up behind his right shoulder (cel, inside the box) | `pawL`: a big recurve bow (`rope` 6 wide `#c98f55`, a string line `s2`) held upright at his left side, x 70–110, y 150–272, never across his face, plus `pawOverL` | The bow and the sun |
| `caishen` 财神 | `#9e1b32` maroon | A black 乌纱帽: a rounded crown over the head (cel) and two flat side "wings" (long rods with round ends) sticking out to both edges (x 40–280, y 64–76); no beard (his mouth stays clear) | A maroon robe (`tint`), a gold `#f2c230` trim, 3 gold coin marks (circle with a square hole) | `pawR`: a big gold ingot 元宝 (a boat shape with a round bump, cel `#f2c230`) held up, x 186–238, y 214–254, plus `pawOverR` | The hat wings and the ingot |
| `luckycat` 招财猫 (onesie) | `#fff7ec` cream-white | `hood(…)`. Pointed cat ears on the hood's top (cel, y ≥ 24), with calico patches on them: one orange `#f2a03d`, one black `#3d3845`. Small closed-happy hood eyes (two arcs). | `tint`, a red `#d8302a` collar (`rope` 8) with a big gold bell (circle r 10, cel, a slit) on his chest | `pawL`: a gold koban coin (an oval, cel `#f2c230`, 3 lines) at his side, x 86–126, y 220–270, plus `pawOverL`; `pawR`: `gloveR('#fff7ec')` with a pink pad | The coin and the bell |
| `liondance` 舞狮 (onesie) | `#e0362c` red | `hood(…)`. A gold `#f2c230` rim round the face opening (`rope` along it). A single horn on the forehead (cel, y ≥ 24) above a small silver mirror (circle r 8). Two huge lion eyes on top of the hood (white, r 14, dark pupils, gold lids, y 34–64). A fluffy white `fringe('#fffdf7', 'fluff')` round the opening's edge. | `tint` with gold scale arcs | A fluffy red tail with a gold tip (cel) | `gloveL/R('#f2c230')` with fluffy cuff strokes | The big eyes, horn and fringe |

Delete the seven Chinese entries from `src/ui/truffle/mythCostumes.ts` (`MYTH_OUTFIT.wukong…luckycat` and `MYTH_HOOD.liondance`). Keep the Greek ones and the shared helpers they use. Spread `...MYTH_COSTUMES` into `V3`.

- [ ] **Step 6: Run the unit tests**

Run: `npx vitest run src/ui/truffle/v3.test.ts src/fun/costumes.test.ts src/ui/truffle/Truffle.test.tsx && npx tsc --noEmit`
Expected: PASS: 47 + 16 = 63, the pace is ≥ 32 days, every chest costume except the zodiac is v3, and the old Greek art still draws.

- [ ] **Step 7: The WebKit contact sheet and the v3 comparison**

Run: `npx tsx scripts/costume-sheet.ts myths wukong,nezha,change,houyi,caishen,luckycat,liondance`
Expected: `ok (7)`. The staff, ring, rabbit, bow, ingot and coin never cross his face.

Open `fit-shots/costumes/myths.png` beside `docs/worlds/costumes/standard-v3.png`, and tick every box:
- [ ] Whole silhouette.
- [ ] One dominant colour.
- [ ] Signature reads at 64 px.
- [ ] Light cel: violet line, flat fills, one hard shadow on the lower right, light upper left.
- [ ] Headgear reaches both edges.
- [ ] The circlet, the headband and hair leave the crown visible.
- [ ] Face readable.
- [ ] Props ride the raised paw.
- [ ] wukong and change match the samples (row B; the v3 column of row E).

Then run the whole chest:

Run: `npx tsx scripts/costume-sheet.ts chest`
Expected: `ok (47)`. Look the sheet over once more as a set: no two costumes read alike at 64 px.

- [ ] **Step 8: Run the fast suite and commit**

Run: `npm run test:fast`
Expected: PASS.

```bash
git add src/ui/truffle/myths.ts src/ui/truffle/v3.ts src/ui/truffle/mythCostumes.ts src/fun/costumes.ts src/ui/truffle/v3.test.ts src/fun/costumes.test.ts
git commit -m "feat(costumes): the Chinese myths redrawn; the chest holds 47 costumes and 16 accessories

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Final WebKit and fit: stage cases, fit flows for the meter, the full suite and the build

**Files:**
- Modify: `scripts/stage-cases.ts` (the costume sheet case, an alive-in-costume budget), `scripts/stage-cases/page.tsx` (`Alive` takes `?outfit=`), `scripts/fit-profile.ts` (+ `fit-profile.test.ts`, `meter`/`bank` options), `scripts/fit-check.ts` (signature marks, three extra-lesson flows)

**Interfaces:**
- Consumes: `SHEET_PROBE`, `SHEET_COLUMNS`, `SHEET_CELL_HEIGHT` (Task 7); `CHEST_COSTUMES`; `EMPTY_METER`, `Meter` (Task 1).
- Produces:
  - `FitProfileOptions.meter?: Partial<Meter>` and `FitProfileOptions.bank?: number`;
  - fit flows `extra-half`, `extra-chest`, `extra-capped`;
  - stage-cases checks `costume-sheet` and `alive (firefighter)`.

- [ ] **Step 1: Write the failing test**

Append inside `describe` in `scripts/fit-profile.test.ts`:

```ts
  it('can seed the river meter and the bank (rewards spec §3)', async () => {
    const p = readBackup(await buildFitProfile({ now: NOW, doneToday: true, meter: { halves: 1, chestsToday: 1 }, bank: 1 }));
    const kid = p.file.kid as { meter: { halves: number; chestsToday: number; owed: number; lesson: number | null }; bank: number };
    expect(kid.meter).toMatchObject({ halves: 1, chestsToday: 1, owed: 0, lesson: null });
    expect(kid.bank).toBe(1);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/fit-profile.test.ts`
Expected: FAIL. `meter` is not a profile option.

- [ ] **Step 3: Seed the meter in the fit profile**

In `scripts/fit-profile.ts`:
- add `import { EMPTY_METER, type Meter } from '../src/fun/meter';`;
- add to `FitProfileOptions`:

```ts
  meter?: Partial<Meter>; // the river meter as a test wants it (rewards spec §3); its day is today
  bank?: number;
```

- in the `saveKid(db, { … })` object, after `bonusStars: 3,`, add:

```ts
      ...(o.meter ? { meter: { ...EMPTY_METER, day: today, ...o.meter } } : {}),
      ...(o.bank ? { bank: o.bank } : {}),
```

- [ ] **Step 4: Walk the meter in the fit sweep**

In `scripts/fit-check.ts`:
- add `'.river', '.goals'` to the `marks` array in `signature()`;
- in `sweep()`, after the `chest-stars` flow, add:

```ts
  // the river meter after an extra lesson (rewards spec §3): half way, the day's second chest, and the cap — at every size
  const extra = (halves: number, chestsToday: number) => ({ doneToday: true, activities: only('newwords'), meter: { halves, chestsToday } });
  const extraLesson = async (p: Page) => {
    await p.click('.done-card button:has-text("再学一课")');
    await p.waitForSelector('.lessonbar, .celebrate', { timeout: 15_000 });
  };
  await run('extra-half', AFTERNOON, extra(0, 1), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-half'); }); // 再学一课就能开宝箱！
  await run('extra-chest', AFTERNOON, extra(1, 1), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-chest'); }); // the second chest, then 明天再开宝箱！
  await run('extra-capped', AFTERNOON, extra(0, 2), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-capped'); }); // 明天再开宝箱！
```

The existing `lesson` flow already walks the first lesson's chest and the goals phase at every size.

- [ ] **Step 5: The costume sheet and a costume's frame budget in the stage cases**

In `scripts/stage-cases/page.tsx`, make `Alive` wear an outfit from the URL:

```tsx
function Alive({ calm }: { calm: boolean }) {
  const [react, setReact] = useState<Reaction | null>(null);
  const outfit = new URLSearchParams(location.search).get('outfit'); // a costume with paw props (rewards spec §7: still within 8 ms)
  (window as unknown as { react: (kind: Reaction['kind']) => void }).react = (kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }));
  return screen(
    <Stage activity="flash" truffle={<Pet kid={{ ...DEFAULT_KID, outfit }} size={180} alive calm={calm} react={react} />} sheet={<FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />}>
      <div style="width:200px;height:200px" />
    </Stage>,
  );
}
```

In `scripts/stage-cases.ts`:
- add `import { CHEST_COSTUMES } from '../src/fun/costumes';` and `import { SHEET_CELL_HEIGHT, SHEET_COLUMNS, SHEET_PROBE } from './stage-cases/faceProbe';`;
- after the `faces` block, add:

```ts
// every chest costume on the v3 contact sheet (rewards spec §7): idle, the 64 px tile and cheering; no held prop over his face
{
  const ids = CHEST_COSTUMES.map((c) => c.id);
  const page = await browser.newPage({ viewport: { width: SHEET_COLUMNS * 240 + 20, height: Math.ceil(ids.length / SHEET_COLUMNS) * SHEET_CELL_HEIGHT + 40 } });
  await page.goto(`file://${dir}/index.html?case=costume-sheet&ids=${ids.join(',')}`);
  await page.waitForTimeout(500);
  mkdirSync('fit-shots/stage-cases', { recursive: true });
  await page.screenshot({ path: 'fit-shots/stage-cases/costume-sheet.png', fullPage: true });
  problems.push(...(await page.evaluate<string[]>(SHEET_PROBE)));
  await page.close();
}
```

In the `alive` block, before `await page.goto(`file://${dir}/index.html?case=alive-calm`);`, add:

```ts
  // the same 8 ms budget in a costume whose prop rides his paw (rewards spec §7)
  await page.goto(`file://${dir}/index.html?case=alive&outfit=firefighter`);
  await page.waitForTimeout(500);
  await work();
  await p95();
  const dressedIdle = await work();
  if (dressedIdle > 8) problems.push(`alive (firefighter): too much work per frame while idle: p95 ${dressedIdle.toFixed(1)}ms (budget 8)`);
  await page.evaluate(() => (window as unknown as { react: (k: string) => void }).react('right'));
  await p95();
  const dressedReact = await work();
  if (dressedReact > 8) problems.push(`alive (firefighter): too much work per frame while reacting: p95 ${dressedReact.toFixed(1)}ms (budget 8)`);
```

- [ ] **Step 6: Run the unit tests, the full suite and the build**

Run: `npx vitest run scripts/fit-profile.test.ts && npm test && npm run build`
Expected: PASS, and the build succeeds.

- [ ] **Step 7: Run the stage cases in WebKit**

Run: `npx tsx scripts/stage-cases.ts`
Expected: `stage cases: ok`. Look at `fit-shots/stage-cases/costume-sheet.png`: all 47 costumes, idle, tile and cheer. Every "alive" check, the dressed one included, is within 8 ms.

- [ ] **Step 8: Run the fit sweep**

First check the port: `lsof -iTCP:4174 -sTCP:LISTEN` must print nothing.

Run: `FIT_ONLY='^(lesson|chest-stars|extra-half|extra-chest|extra-capped|home|home-done)$' npx tsx scripts/fit-check.ts` (after `npm run build`)
Expected: every screen `ok` at every size.

Open the screenshots of the river, chest and goals phases at `iphone-se` and `ipad-landscape` (`fit-shots/<size>/`). Check that the track sits above the watching Truffle and the chest without pushing 继续 off the screen, and that the three goal lines fit. If a phone size overflows:
- tighten the `@media (max-height: 760px)` rule for `.celebrate .river` and the `.goal-line` font clamp in `src/styles.css`;
- rerun that flow alone.

Then run the whole sweep: `npm run fit`. It takes 20–50 minutes; rerun any timed-out flow on its own before calling it a failure.
Expected: every flow ok.

- [ ] **Step 9: Commit**

```bash
git add scripts/stage-cases.ts scripts/stage-cases/page.tsx scripts/fit-profile.ts scripts/fit-profile.test.ts scripts/fit-check.ts src/styles.css
git commit -m "chore(fit): walk the river meter after extra lessons; the 47-costume sheet and a dressed frame budget in the stage cases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (done while writing; kept for the executor)

**Spec coverage**

| Spec section | Where |
|---|---|
| §3 meter arithmetic, cap, bank, carry, free play | Task 1 |
| §3 Celebration track, boat glide, chest via hold, the two lines | Task 4 |
| §3 Home mini meter | Task 6 |
| §3 data: `kid.meter`, `kid.bank`, migration, `lastChestDate` | Task 1 (rulings 1 and 3) |
| §4 goal candidates, picking, ≤3, Label + icon | Task 3 |
| §4 the Celebration placement | Task 5 |
| §5.1 standard | Task 7 rules tests plus each costume task's sheet checklist |
| §5.1 paw slots | Task 7 |
| §5.2 set and totals | Tasks 2 and 8–11; totals in Task 11 |
| §5.2 removed sets and owned stay | Task 2 |
| §5.3 order and stars | Task 2 |
| §5.3 pace | Task 11 |
| §6 existing data | Tasks 1 and 2 |
| §7 unit tests | Tasks 1–3 and 11 |
| §7 rendered tests (first lesson, one extra, two extras, capped, goals) | Tasks 4 and 5 |
| §7 WebKit (meter and goals at iPad and phone, 47-costume sheet, idle and cheer face check, 8 ms) | Tasks 7, 11 and 12 |
| §7 fit sweep | Task 12 |
| §8 out of scope | Nothing touches it |

**Placeholder scan:** the art for 27 of the 35 costumes is specified by brief, not by finished SVG. That is deliberate: art is drawn and iterated against the WebKit sheet. Every brief gives exact colours, places, layers and checks, and each task has a fully written worked example plus ported samples. There are no TBDs in the code steps.

**Type consistency checked across tasks:**
- `Meter`, `MeterFill`, `Lesson`, `fillMeter`, `lessonOf`, `meterLine`, `meterShown`;
- `openChest(kid, today)`, `costumesLeft`, `CHEST_COSTUMES`, `inChest`, `prizeGroup`;
- `Goal`, `GoalFacts`, `almostThere`, `oneDayAway`;
- `settleMeter`, `loadGoalFacts`, `RiverTrack`;
- `CostumeLayer`, `V3`;
- `SHEET_PROBE`, `SHEET_COLUMNS`, `SHEET_CELL_HEIGHT`, `bundleStagePage`.

**Review Focus:** each of the five lines has its test in its owning task, as named in that section.
