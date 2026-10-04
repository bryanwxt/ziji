# 字己 Truffle — Plan 3: Costumes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Add 12 zodiac onesies and 8 outfits for Truffle, won from the daily chest. The first chest gives the child's own zodiac onesie.
- Add a zodiac setting to the parent area.
- Make the outfits tab in Truffle's room wear onesies, outfits and accessories.

**Architecture:**
- A pure catalog and rules module, `src/fun/costumes.ts`, provides the catalog, the wearing rules and `openChest` v2.
- Procedural costume art in `src/ui/truffle/costumes.ts`, as layers 3 (body) and 6 (head) of Truffle.
- `KidState` gains `ownedCostumes` and `outfit`, and `Settings` gains `zodiac`, all defaulted by `normalizeKid` / `getSettings`.
- The chest logic moves from `src/fun/pet.ts` to `costumes.ts`.

**Tech Stack:** Vite 7, Preact 10, TypeScript 5.9, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §7, §8, §9 plan 3.

## Global Constraints

- **Onesies (id: character, pinyin, colour, feature).** Each feature is drawn on the hood.

  | id | Character | Pinyin | Colour | Feature |
  |---|---|---|---|---|
  | `rat` | 鼠 | shǔ | `#a9a9b8` | round ears |
  | `ox` | 牛 | niú | `#8a5a3c` | two short horns |
  | `tiger` | 虎 | hǔ | `#ffa53d` | round ears + black stripes |
  | `rabbit` | 兔 | tù | `#fff1f4` | two long ears |
  | `dragon` | 龙 | lóng | `#5cc46f` | two antler horns + spikes |
  | `snake` | 蛇 | shé | `#7fcf6a` | scale dots |
  | `horse` | 马 | mǎ | `#c98a52` | pointed ears + mane |
  | `goat` | 羊 | yáng | `#f4efe6` | curled horns |
  | `monkey` | 猴 | hóu | `#a8754f` | round side ears |
  | `rooster` | 鸡 | jī | `#ff6a5a` | comb |
  | `dog` | 狗 | gǒu | `#d9a066` | floppy ears |
  | `pig` | 猪 | zhū | `#ffb6c8` | small ears + snout patch on the hood |

- **Outfits (id: name, pinyin):**
  - `astronaut` 宇航员 yǔhángyuán
  - `chef` 厨师 chúshī
  - `wizard` 魔法师 mófǎshī
  - `explorer` 探险家 tànxiǎnjiā
  - `pirate` 海盗 hǎidào
  - `hero` 超人 chāorén (cape)
  - `pixel` 像素 xiàngsù (a blocky square texture; generic)
  - `raincoat` 雨衣 yǔyī
- **Accessories:** the existing 16 emoji `ACCESSORIES`, unchanged.
- **Wearing:** one outfit slot (a onesie or an outfit) and one accessory slot. A onesie hides the accessory. The power layer always shows.
- **Chest:** once per day (unchanged rule).
  - The first chest that finds no costume he owns (`ownedCostumes` holds no known costume — a dragon-era install may have opened chests before) gives the onesie for `settings.zodiac ?? 'dragon'`. (Corrected 2026-10-04: an earlier draft also required no `lastChestDate`, which contradicted this plan's Review Focus; the code follows the spec.)
  - After that, a seeded pick (seed = date) from all unowned outfits, onesies and accessories.
  - When everything is owned: +3 bonus stars.
- **Old installs:** `ownedAccessories` and `wearing` are kept as they are. `outfit: null` and `ownedCostumes: []` are the defaults. Unknown ids are ignored.
- **Not Pokémon or Minecraft lookalikes.** No new dependencies.
- **Publishing:** never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **The first chest on an existing install** that already opened dragon-era chests: it should still give the zodiac onesie once. "First" means no costume owned yet, regardless of accessories.
2. **Wearing a onesie, then an accessory**: the onesie stays, and the accessory is saved but hidden. Taking the onesie off shows the accessory again.
3. **Zodiac changed after the first chest** must not grant another onesie.
4. **Unknown outfit ids** in a restored backup must render plain Truffle without crashing.
5. **Every one of the 20 costumes** combined with each power tier and each mood must render without clipping in the 260×270 viewBox.

---

### Task 1: Catalog, wearing rules and chest v2 (pure)

**Files:**
- Create: `src/fun/costumes.ts`, `src/fun/costumes.test.ts`
- Modify: `src/fun/pet.ts` (re-export `openChest` and `canOpenChest` from costumes, or move them; update imports), `src/types.ts`, `src/store/repo.ts` (`normalizeKid` defaults), `src/fun/pet.test.ts`

**Interfaces:**
- Produces:

```ts
export type ZodiacId = 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake' | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig';
export type OutfitId = 'astronaut' | 'chef' | 'wizard' | 'explorer' | 'pirate' | 'hero' | 'pixel' | 'raincoat';
export interface Costume { id: ZodiacId | OutfitId; kind: 'onesie' | 'outfit'; zh: string; py: string; color: string }
export const ONESIES: Costume[]; export const OUTFITS: Costume[]; export const COSTUMES: Costume[];
export function costumeById(id: string | null | undefined): Costume | undefined;
export function visibleAccessory(kid: KidState): string | null; // null when wearing a onesie
export type ChestResult = { kind: 'costume'; id: string } | { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };
export function openChest(kid: KidState, today: string, zodiac: ZodiacId | null): { kid: KidState; result: ChestResult };
export function canOpenChest(kid: KidState, today: string): boolean; // unchanged
```

- `KidState` gains `ownedCostumes: string[]` and `outfit: string | null`, with defaults `[]` and `null`.
- `Settings` gains `zodiac: ZodiacId | null`, default `null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_KID } from '../types';
import { ACCESSORIES } from './pet';
import { COSTUMES, canOpenChest, costumeById, ONESIES, OUTFITS, openChest, visibleAccessory } from './costumes';

describe('costumes', () => {
  it('has 12 onesies and 8 outfits with Chinese names', () => {
    expect(ONESIES).toHaveLength(12);
    expect(OUTFITS).toHaveLength(8);
    expect(costumeById('tiger')).toMatchObject({ zh: '虎', py: 'hǔ', kind: 'onesie' });
    expect(costumeById('nope')).toBeUndefined();
  });
  it("first chest is the child's zodiac onesie (dragon by default), once", () => {
    const a = openChest(DEFAULT_KID, '2026-10-02', 'tiger');
    expect(a.result).toEqual({ kind: 'costume', id: 'tiger' });
    expect(a.kid.ownedCostumes).toEqual(['tiger']);
    expect(openChest(DEFAULT_KID, '2026-10-02', null).result).toEqual({ kind: 'costume', id: 'dragon' });
    const b = openChest({ ...a.kid, lastChestDate: '2026-10-02' }, '2026-10-03', 'rabbit');
    expect(b.result).not.toEqual({ kind: 'costume', id: 'rabbit' }); // seeded pick, not another zodiac gift
    expect(canOpenChest(b.kid, '2026-10-03')).toBe(false);
  });
  it('dragon-era installs with accessories still get the zodiac first', () => {
    const old = { ...DEFAULT_KID, ownedAccessories: ['👑', '🎩'], lastChestDate: '2026-09-30' };
    expect(openChest(old, '2026-10-02', 'pig').result).toEqual({ kind: 'costume', id: 'pig' });
  });
  it('never repeats; stars when everything is owned', () => {
    let kid = { ...DEFAULT_KID };
    const seen = new Set<string>();
    for (let d = 1; d <= COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, `2026-11-${String(d).padStart(2, '0')}`, 'dog');
      const key = result.kind === 'costume' ? result.id : result.kind === 'accessory' ? result.item : 'stars';
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      kid = next;
    }
    expect(openChest(kid, '2026-12-25', 'dog').result).toEqual({ kind: 'stars', amount: 3 });
  });
  it('a onesie hides the accessory', () => {
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: '👑', outfit: 'tiger' })).toBeNull();
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: '👑', outfit: 'chef' })).toBe('👑');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: '👑', outfit: 'bogus' })).toBe('👑');
  });
});
```

  (The never-repeats loop uses dates 2026-11-01 … 2026-11-36. Use a date helper, `addDays` from `../lib/date` with `localDateKey`, instead of string padding when writing it.)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **First chest:** `ownedCostumes.length === 0` → the zodiac onesie.
  - **Otherwise:** pool = `COSTUMES` ids not owned + `ACCESSORIES` not owned, in catalog order; pick with `mulberry32(seedFromString(today))`.
  - **Every branch** sets `lastChestDate`.
  - **Callers:** update `Celebration` to pass `settings.zodiac`, and handle `result.kind === 'costume'` with the heading `松露有新衣服了！` ("Truffle has new clothes!") and a prize showing the costume's `zh`.
- [ ] **Step 4: Run.** `npm test`. Expected: green, with the old chest tests adapted.
- [ ] **Step 5: Commit.** `git commit -am "feat(costumes): catalog, wearing rules, chest v2 with zodiac first"` (add the new files).

---

### Task 2: Costume art on Truffle

**Files:**
- Create: `src/ui/truffle/costumes.ts`
- Modify: `src/ui/truffle/Truffle.tsx`, `src/ui/Pet.tsx`
- Test: `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Produces:
  - `costumeLayer(id): { body: string; head: string } | null`, an SVG markup string in the Truffle viewBox.
  - `Truffle` gains `outfit?: string | null`. Layer 3 renders `.truffle__outfit-body` after `.truffle__body`; layer 6 renders `.truffle__outfit-head` after the face. The root svg gets `data-outfit`.
  - `Pet` passes `outfit={kid.outfit}` and `accessory={visibleAccessory(kid)}`.

**Shapes:**
- **Body tint:** reuse the bean body outline `M110 186 C90 200 86 238 104 258 C120 276 200 276 216 258 C234 238 230 200 210 186 Z`, filled with the colour, 3.2px ink stroke. The belly patch is a lighter ellipse (cx 160, cy 236, rx 36, ry 30) using `#fffdf7` at 0.85.
- **Onesie hood:** an even-odd path. Outer = the head outline grown by ~10px; inner = the face opening ellipse (cx 160, cy 132, rx 80, ry 64). Filled with the colour, ink stroke. Plus the per-animal features from Global Constraints, drawn as simple shapes on the hood top or sides.
- **Outfits:** body layer plus a head piece.
  - astronaut: white suit and a glass helmet circle at opacity 0.25 with a highlight;
  - chef: white apron and a tall hat;
  - wizard: purple robe with stars and a pointed hat;
  - explorer: khaki vest and a safari hat;
  - pirate: striped shirt and a bicorne;
  - hero: a red cape behind the body with a 字 chest emblem;
  - pixel: a body and head overlay of 12px squares in two greens at 0.55, plus square glasses;
  - raincoat: yellow coat and a sou'wester.

- [ ] **Step 1: Write the failing test**

```tsx
import { COSTUMES } from '../../fun/costumes';
it('renders every costume with body and head layers', () => {
  for (const c of COSTUMES) {
    const { container, unmount } = render(<Truffle outfit={c.id} />);
    expect(container.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe(c.id);
    expect(container.querySelector('.truffle__outfit-body')?.innerHTML.length).toBeGreaterThan(10);
    expect(container.querySelector('.truffle__outfit-head')?.innerHTML.length).toBeGreaterThan(10);
    unmount();
  }
});
it('ignores unknown outfits', () => {
  const { container } = render(<Truffle outfit="bogus" />);
  expect(container.querySelector('.truffle__outfit-body')).toBeNull();
});
```

  and in `widgets.test.tsx`: a `Pet` whose kid has `outfit: 'tiger'` and `wearing: '👑'` renders no `.truffle__accessory`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the art and wiring.
- [ ] **Step 4: Run.** `npx vitest run src/ui`. Expected: PASS.
- [ ] **Step 5: Visual check.** In the browser, render a gallery of all 20 costumes at 160px (a temporary dev-only page under `src/dev/`, deleted after). Check each with moods sulk/wow/cheer and a tier-3 power. Fix clipping.
- [ ] **Step 6: Commit.** `git commit -am "feat(costumes): zodiac onesies and outfits art"` (add the new file).

---

### Task 3: Zodiac setting

**Files:**
- Modify: `src/parent/SettingsPanel.tsx`, `src/types.ts` (if not done in Task 1)
- Test: `src/parent/parentB.test.tsx`

**Interfaces:**
- Produces: a `Zodiac` select in Settings, with options "Not set" + 12 (e.g. "Tiger 虎"). Saving calls `updateSettings({ zodiac })`.

- [ ] **Step 1: Write the failing test**

```tsx
it('sets the child’s zodiac', async () => {
  const app = await makeAppData();
  renderWithApp(<SettingsPanel />, app);
  fireEvent.change(screen.getByLabelText('Zodiac'), { target: { value: 'tiger' } });
  await waitFor(async () => expect((await getSettings(app.db)).zodiac).toBe('tiger'));
});
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, following the panel's existing select pattern.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(settings): child's zodiac for the first chest gift"`

---

### Task 4: Truffle's room — outfits tab

**Files:**
- Modify: `src/app/Wardrobe.tsx`, `src/app/home.test.tsx`

**Interfaces:**
- Produces:
  - The 服装 tab shows three groups: 生肖 (onesies), 衣服 (outfits) and 小东西 (accessories).
  - Each item is a `button` with `aria-label` = its Chinese name (e.g. `虎`) or the emoji. Locked items are disabled silhouettes.
  - **Tapping** an owned onesie or outfit wears it (`outfit`); tapping it again takes it off.
  - Accessories behave as today, setting `wearing`.
  - The preview Truffle shows `content` on change.
  - A small note "穿着连体衣时看不到小东西" (accessories don't show while wearing a onesie) appears when a onesie is worn and an accessory is set.

- [ ] **Step 1: Write the failing test**

```tsx
it("Truffle's room: wear a onesie, take it off", async () => {
  const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'], ownedAccessories: ['👑'], wearing: '👑' } });
  renderWithApp(<Wardrobe />, app);
  fireEvent.click(screen.getByRole('button', { name: '虎' }));
  await waitFor(async () => expect((await getKid(app.db))?.outfit).toBe('tiger'));
  expect(document.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe('tiger');
  expect(document.querySelector('.truffle__accessory')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '虎' }));
  await waitFor(async () => expect((await getKid(app.db))?.outfit).toBeNull());
  expect((screen.getByRole('button', { name: '龙' }) as HTMLButtonElement).disabled).toBe(true);
});
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `npm test`. Expected: green.
- [ ] **Step 5: Commit.** `git commit -am "feat(room): outfits tab with onesies, outfits and accessories"`

---

### Task 5: Walkthrough + docs

- [ ] **Step 1:** `npm test && npm run build`.
- [ ] **Step 2:** In the browser, at 768×1024 and 1024×768, walk through:
  - the first chest on a fresh profile, with the zodiac set;
  - a dragon-era profile's first chest;
  - wearing and removing items in the room;
  - Truffle in costume on Home, in a lesson and in the celebration, with a power tier.

  Dev IndexedDB edits are restored afterwards.
- [ ] **Step 3:** Fix findings. Logic fixes are test-first.
- [ ] **Step 4:** Update the README and CREDITS (costume art is original).
- [ ] **Step 5:** `npm test && npm run build`, then commit: `chore: plan 3 walkthrough fixes and docs`.
