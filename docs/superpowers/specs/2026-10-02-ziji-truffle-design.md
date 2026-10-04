# 字己 ZiJi — Truffle redesign: design spec

**Date:** 2026-10-02
**Status:** Draft for review
**Builds on:** `2026-10-02-hanzi-buddy-design.md` (the shipped app). Everything
not changed here stays as that spec describes it.
**Reference art:** `assets/2026-10-02-truffle-reference.html` (approved mascot:
bean body, face, six moods).

## 1. Purpose

Make 字己 more design-forward, so that it is something the parent is proud to
share publicly, while making it more fun for the 8-year-old who uses it daily.
Two moves do this:

1. A new visual system: "ink panels on warm paper".
2. A new mascot, **Truffle 松露**, the family's real cat, replacing the dragon.
   His grumpy face becomes a game mechanic, and he gains powers and costumes
   instead of growing.

### What the parent said (decisions made in brainstorming)

- **Appeal:** the app should appeal to adults when shared publicly, and stay
  appealing to the child.
- **Visual direction:** the path went watercolour → manga ink → "less Japanese".
  The result is bold ink panels with chunky offset shadows on warm cream paper,
  soft colour swashes, and no manga effects (speed lines, screentone,
  sweat drops, anime sparkles). Some outline is fine; scratchy dry-brush
  outlines are not.
- **Mascot:** the family's grey-and-white cat, Truffle, drawn cute and young.
  - Face: round chubby head, big low-set green eyes, tiny pink nose, small pout.
  - The grump is shown only by a flat-topped eyelid and two brow dashes.
  - Body: the "bean" (big head, small round body, nub paws, curly tail).
  - He does not grow.
- **Rewards:** borrow mechanics from Pokémon and Minecraft, never their names,
  characters or art (the repo and site are public).
  - Element powers, from 五行 plus big radical families.
  - A character collection.
  - Costumes, including 12 zodiac onesies.
  - The crafting table (combine components into characters) is parked as a
    future enhancement.
- **Delivery:** build as three plans, each released on its own (approach A).

### Success criteria

- The child meets Truffle on first run and recognises him as his cat.
- Truffle's face visibly warms up over a session in response to the child's
  answers.
- Learning a radical family powers Truffle up. The collection fills as
  characters are learned. Costumes arrive from the daily chest.
- No earned power, card or costume is ever lost, including after a lapse in
  memory or a backup restore.
- Every child screen uses the new visual system at iPad portrait (768×1024)
  and landscape.
- The learning engine is untouched: FSRS, session plans and activity rules
  behave exactly as before.

## 2. Constraints

- Same stack and hosting: Vite, Preact, TypeScript, an offline PWA on GitHub
  Pages at `/ziji/`. No new runtime dependencies, except a font if §3 needs one.
- Database schema version stays 1. New kid-state fields are optional and are
  filled with defaults when read.
- The backup format version stays 1. Old backups restore; unknown fields are
  ignored.
- Truffle is drawn in code as vector layers, like the dragon was. No bitmap
  art, and no photos of the cat anywhere in the repo or the app.
- No Pokémon or Minecraft names, characters, art, sounds or lookalikes. Only
  generic mechanics: types, a collection, skins.
- Child-facing meanings stay radical-only (existing rule).
- 64px minimum touch targets, WCAG AA text contrast, and the reduced-motion
  setting respected.

## 3. Visual system

### Tokens

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fbf6ea` | page background, with a fine grain (a tiny tiled texture, not a filter on large areas) |
| `--ink` | `#2a2630` | outlines, text, offset shadows, primary dark button |
| `--green` | `#7fdc7a` | spot colour: current step, correct, primary accents (text on it is `--ink`) |
| `--green-soft` | `#c9efc6` | completed steps, correct sheet |
| `--red` | `#ff5532` | celebration and treasure blocks (only large text on it, with an ink shadow) |
| `--marigold` | `#ffc94a` | stars, streak flame, highlights |
| `--orange-soft` | `#ffe0cc` | "try again" sheet |
| swash colours | `#ffd56a` and `#bfe0ff` at ~55% | soft round brush swashes behind content |
| fur | `#b8b3b6`, shade `#a29ca1`, white `#fffdf7` | Truffle |
| eye / nose / blush | `#a9c96a` / `#ff9fa0` / `#ffb3a0` | Truffle |

Status always pairs colour with an icon and a word.

### Type

- Hanzi: LXGW WenKai (bundled).
- UI text: Nunito (bundled).
- Small labels such as 今日一字 ("character of the day"): a condensed display
  face. Prefer a bundled `@fontsource` package (e.g. Bebas Neue, OFL, Latin
  only). Use Nunito 900 uppercase if no suitable font is available.
- Pinyin: Nunito italic.

### Components

- **Ink panel:** cream fill, 3px ink border, radius 14–16, a 4–5px solid ink
  offset shadow down-right. Used for cards, path tiles, answer tiles, the PIN
  pad and the parent panels.
- **Primary button:** ink fill with cream text and a green offset shadow.
  Variants: green (ink text, ink shadow) and red (celebration).
- **Word of the day:** an ink panel tilted −3°, with a 田字格 grid and a
  condensed green label tag.
- **Path tiles:**
  - done = `--green-soft`;
  - current = `--green`, lifted 6px and rotated −4°;
  - locked = cream.
- **Feedback sheet:** the existing bottom sheet, coloured `--green-soft` for
  right and `--orange-soft` for try again, with an ink top rule.
- **Stat pills:** cream with a 2.5px ink border.
- **Tab bar:** ink icons with the active tab on a green chip.

### Layout

Unchanged from the bold & flat spec (§5c): today's-path home, lesson bar with
progress, bottom sheet, tab bar. Only the skin changes.

### Motion

- The existing spring curves and view transitions stay.
- Truffle reacts with face and pose swaps plus a small squash-and-bounce.
- **Press-and-hold** (`HoldButton`) is used for the chest and power-ups:
  - A round ink button with a ring that fills over 1.2 s while pressed.
  - Releasing early drains the ring back over 0.3 s. Completion fires once.
  - Keyboard: holding Space or Enter fills it.
  - With reduced motion, the ring still fills (it is the progress
    indicator), but bursts are replaced by a fade.

## 4. Truffle 松露

### Identity and first run

- Truffle is a fixed character. The pet-setup screen becomes **Meet Truffle**:
  - he sits dozing;
  - a tap wakes him into 哼 with a speech bubble introducing him
    (哼……我是松露。来吧！, "Hmph… I'm Truffle. Let's go!");
  - one line repeats the 字己 = 自己学汉字 explanation;
  - one button continues to placement.
- Existing installs skip Meet Truffle if a kid record exists, and show him on
  Home.

### Drawing (`src/ui/truffle/`)

`Truffle` component props: `mood`, `power` (id or null), `powerTier` (0–3),
`outfit` (id or null), `accessory` (emoji or null), `size`, `lookAt`.

Layers, bottom to top:
1. tail
2. bean body
3. outfit body layer
4. head
5. face (mood)
6. outfit head layer (hood or hat) / accessory
7. power effect

Rendering rules:

- Geometry, proportions, palette and expressions follow the reference art. The
  build may refine curves.
- Outlines: 3.2px ink, round joins. No dry-brush filters.
- The fur grain uses one shared SVG filter definition per page, and only on
  Truffle.
- Clip/filter ids are made unique per instance (`useId`), as the dragon's
  were.
- Accessible: `role="img"`, labelled "松露".

### Moods (`src/fun/mood.ts`, pure)

| Mood | Face | When |
|---|---|---|
| `sulk` 哼 | flat-topped lids, brow dashes, small pout | resting, 0–2 correct this session |
| `neutral` | lids lifted, no brows, small mouth | resting, 3–7 correct |
| `pleased` | soft squint, blush | resting, 8+ correct |
| `side` 嗯？ | side-eye, "?" bubble | for ~1 s after a wrong answer |
| `content` 呼噜 | closed happy arcs, blush | for ~1 s at a combo of 3+ |
| `wow` 咦！ | wide eyes, exclamation ticks | for ~1.2 s after a hard one is right |
| `cheer` 喵！ | happy arcs, open smile, confetti | celebration |
| `sleepy` zzz | closed eyes | Home, idle 25 s (existing timer); a tap wakes him |

- `neutral` and `pleased` are not in the reference art. They are in-between
  faces (sulk → content), drawn in the same style during plan 1.
- **`restingMood(correctThisSession)`** returns `sulk`, `neutral` or `pleased`.
- **`reactionMood(event)`** maps answer events to the transient moods. Priority:
  `wow` > `content` > `side`.
- **A "hard one" is any of:**
  - a recognition card answered correctly whose card was in Relearning;
  - a recognition card answered correctly whose previous review was rated
    Again;
  - a writing word finished with 0 misses whose card was new.
- **The 咦！ close-up:**
  - On a hard one, a full-width overlay of his face on a soft green sunburst
    shows for 0.9 s.
  - At most once every 5 cards. Never under reduced motion; the small `wow`
    face still shows.
- **Speech bubbles** (with pinyin via `Label`): 哼，来吧！ / 再想想 / 咦！好厉害 /
  呼噜～ / 喵！
- A correct answer's tile still flies into Truffle, and he does a catch-bounce.

## 5. Powers (replacing growth stages)

`src/fun/powers.ts` (pure).

| Id | Name | Radicals (built-in `radical` field) |
|---|---|---|
| `water` | 水 | 氵 水 |
| `fire` | 火 | 火 灬 |
| `wood` | 木 | 木 |
| `metal` | 金 | 金 钅 |
| `earth` | 土 | 土 |
| `roar` | 口 | 口 |
| `friends` | 亻 | 亻 人 |
| `voice` | 讠 | 讠 言 |
| `dash` | 辶 | 辶 |
| `heart` | 心 | 心 忄 |
| `sun` | 日 | 日 |

**Family and progress:**

- **Family** = built-in characters whose `radical` is in the list, excluding
  the radical character itself. (`冫` is not water; the ice radical is left
  out.) Families are built from content at runtime, like sticker families.
- **Known** = the "earned" rule from the review fixes (card state Review or
  Relearning).
- **Tiers:**
  - 1 at `min(3, size)` known;
  - 2 at `ceil(size / 2)`;
  - 3 at all known.

**Tiers never go down.** The tier shown is
`max(computed, kid.powerTiersSeen[id])`.

**Visuals per tier:**
- tier 1: a small mark, e.g. flame ear-tips, a water droplet on the cheek, a
  leaf on the head;
- tier 2: an aura or effect around Truffle;
- tier 3: the full form, i.e. effect plus a cape or pattern in the power's
  colours.

Effects sit on layer 7, so they combine with any outfit.

**New-tier moment:** Celebration gains a `power` phase, between `chest` and
`badges`, when any tier is newly reached.
- It shows "新能力！" and the power's radical with its meaning
  (氵 = 水, "water").
- The child holds the HoldButton to power Truffle up.
- Then `powerTiersSeen` is saved. This replaces the `evolve` phase and the
  `lastStageSeen` logic.

**Choosing:** the chosen power is `kid.activePower`. It defaults to the most
recently unlocked power, and the child can change it in Truffle's room.

## 6. Character collection 字卡 (replacing the sticker book)

`src/fun/collection.ts` (pure); `CollectionScreen` replaces `StickerBook` on
the tab bar.

**One card per built-in single character.**

- **Uncaught:** face-down, showing only its power icon (or a plain back if it
  belongs to no power).
- **Caught** (known, by the earned rule) shows:
  - the character and its pinyin;
  - its first example word, if any;
  - its power icon;
  - 1–3 stars.

**Stars** come from the recognition card's FSRS stability: under 7 days = 1,
7–29 days = 2, 30+ days = 3. Stars may drop with a lapse; being caught never
does.

**Other card details:**
- **Gold foil:** the write card is also known (earned rule).
- **Rarity frame:** HSK level 1 = common, level 2 = rare.

**Screen:**
- Filter chips: all / each power / gold.
- A caught counter, e.g. "62 / 600".
- Tapping a card flips it to a larger view and speaks it.
- Parent-added words appear in a separate 我的字 section, as now.

**Badges:** a family badge (the existing `badgesSeen`) becomes "power
mastered" (tier 3) for power families. For other radical families it remains
a collection badge. The Celebration `badges` phase is kept.

## 7. Costumes, chest and Truffle's room

`src/fun/costumes.ts` (pure).

### Catalog

- **Zodiac onesies (12):** 鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪.
  - Each is a hood with that animal's ears or horns, plus colours and
    markings; the body layer is tinted.
  - The name is shown as the character with pinyin.
- **Outfits (8):** astronaut, chef, wizard, explorer, pirate, superhero cape,
  pixel (a blocky skin made of crisp squares; generic, not a Minecraft
  lookalike) and rain mac. Each has a Chinese name with pinyin, e.g.
  宇航员 yǔhángyuán.
- **Accessories:** the existing 16 emoji (`ACCESSORIES`) carry over unchanged,
  including any already owned.

### Wearing

- **One outfit slot** (a onesie or an outfit) and **one accessory slot**.
- A onesie hides the accessory slot while worn.
- The power effect always shows.

### Chest

Once per day after a completed (non-free) session with at least one step, as
now.

- Opening uses HoldButton.
- **First chest ever:** the child's zodiac onesie (`settings.zodiac`, default
  龙).
- **After that:** a seeded-random item from the unowned outfits, onesies and
  accessories (seeded by the session date, as now).
- **When everything is owned:** bonus stars, as now.
- The prize card flips with a burst.
- The day rule is unchanged: a chest is only openable once per day, however
  fast it is tapped (the existing fixes).

### Parent setting

Settings gains **Zodiac**: a 12-option picker labelled in English and Chinese,
optional.

### Truffle's room

Replaces the wardrobe tab (same tab position, labelled 松露).

- A big live Truffle preview, which shows `content` when an item is chosen.
- **服装 (outfits) tab:** a grid of onesies, outfits and accessories. Locked
  ones are silhouettes. Tap to wear; tap again to take off.
- **能力 (powers) tab:** the 11 powers with tier pips, their radical, and
  "n / size". Tap a power at tier ≥ 1 to show it.

## 8. Data model changes

`KidState`. All new fields are optional when read; defaults are applied by a
`normalizeKid()` used by `getKid`.

- New fields:
  - `ownedCostumes: string[]` (default `[]`);
  - `outfit: string | null` (`null`);
  - `activePower: string | null` (`null`);
  - `powerTiersSeen: Record<string, number>` (`{}`).
- Kept, with unchanged meaning: `ownedAccessories`, `wearing` (now the
  accessory slot), `badgesSeen`, `bonusStars`, `lastChestDate`.
- Kept but no longer read by the UI: `petName`, `petColor`, `lastStageSeen`.
  They are not deleted, so old and new backups round-trip.

`Settings` gains `zodiac: ZodiacId | null` (default `null`).

Unknown costume or power ids in stored data are ignored when rendering and are
never offered as worn.

## 9. Delivery: three plans

1. **Look + Truffle:**
   - tokens, components and the restyle of every child screen (the parent area
     gets tokens only);
   - the `Truffle` component with all moods;
   - `mood.ts` and its wiring into flashcards, writing, fishing, speaking, Home
     and Celebration;
   - Meet Truffle, `HoldButton`, and the chest on HoldButton (existing prizes);
   - the dragon component and dragon-only code removed.

   Ships Truffle.
2. **Powers + collection:**
   - `powers.ts`, `collection.ts`, and the power effect art (11 × 3 tiers);
   - the Celebration `power` phase;
   - `CollectionScreen` (sticker book removed);
   - the powers tab in Truffle's room;
   - `lastStageSeen` and growth-stage code removed.
3. **Costumes:**
   - `costumes.ts`, 12 onesies + 8 outfits art;
   - chest prizes and the first-chest zodiac;
   - the zodiac setting and the outfits tab.

Each plan ends with:
- a full test run;
- a browser walkthrough at 768×1024 and landscape, with reduced motion on and
  off;
- a whole-branch review and fix pass;
- release to `main` (auto-deploys).

## 10. Testing

**Pure units (TDD):**
- `restingMood` thresholds and `reactionMood` priority;
- the hard-one definition;
- power families from content: `冫` excluded, the radical character itself
  excluded, sizes;
- tier thresholds, including tiny families;
- tiers never decreasing via `powerTiersSeen`;
- collection card state: caught, stars bands, gold, rarity;
- the chest: first-chest zodiac, default 龙, unowned-only, seeded, stars when
  complete;
- wearing rules: a onesie hides the accessory; unknown ids are ignored;
- `normalizeKid` defaults;
- old-backup restore.

**Components:**
- `Truffle` renders the requested mood, power tier and outfit (via `data-*`
  attributes);
- HoldButton:
  - completes after the hold;
  - an early release cancels;
  - completion fires once;
  - the keyboard hold works;
  - reduced motion;
- Meet Truffle flow → placement;
- Celebration `power` phase saves `powerTiersSeen`;
- collection filters and counter;
- Truffle's room wear/unwear and choosing a power persist.

**Visual:** the browser walkthrough per plan (see §9). Check that hanzi always
sit on clean space, and the contrast of text on `--red` and `--green`.

## 11. Out of scope

- The crafting table (future enhancement).
- Changes to FSRS, session planning, activity rules, the parent area structure
  or sounds.
- New content.
- Renaming 字己 or moving the site address.

## 12. Review focus

The input classes and failure modes most likely to bite, for the plans to pin
with tests:

1. **A lapse after a tier, card or badge was earned** must not remove it
   (earned rule plus `*Seen` maxima).
2. **Existing installs:**
   - dragon-era kid state with owned emoji accessories and `wearing` set must
     show Truffle wearing that accessory;
   - no Meet Truffle screen;
   - nothing lost.
3. **Rapid or overlapping input:**
   - double-tap or multi-touch on HoldButton must not double-fire;
   - a release at exactly 1.2 s fires once;
   - leaving mid-hold cancels.
4. **Tiny or unusual families:**
   - 金 has 5 characters, so tier maths must be sensible;
   - characters in no power family still get a card;
   - parent words containing power radicals do not affect built-in families.
5. **Reduced motion and older iPads:**
   - no flashing close-ups;
   - the grain filter is not applied to large areas;
   - smooth on Home with Truffle plus the swashes.

## 13. Ink icons and accessories v2 (added 2026-10-03 at the parent's request)

The parent asked for the remaining emoji to be replaced with art in the app's
style, and for the accessories to be "cooler and coherent with the costume
options".

### Accessories v2: add-ons in four slots

Every costume already has its own hat, so accessories become add-ons that
combine with any onesie or outfit. Nothing is ever hidden: this replaces the
§7 "a onesie hides the accessory" rule and the plan-3 "no hat on a hat" rule.
There are still 16, so the chest economy is unchanged.

| Slot | Accessories |
|---|---|
| face | 墨镜 sunglasses, 星星眼镜 star glasses, 爱心眼镜 heart glasses, 小胡子 moustache |
| neck | 围巾 scarf, 领结 bow tie, 金牌 gold medal, 耳机 headphones |
| held (in a paw) | 毛笔 calligraphy brush, 红灯笼 red lantern, 风筝 kite, 气球 balloon, 魔法棒 magic wand |
| back | 书包 backpack, 翅膀 wings, 喷气背包 jetpack |

- **Stored values:** accessories are stored by id. Legacy emoji in
  `ownedAccessories` and `wearing` are mapped one-to-one by `normalizeKid`:
  - 🎩 moustache, 👑 medal, 🕶️ sunglasses, 🎀 bow tie;
  - 🧢 backpack, 🎓 brush, ⛑️ jetpack, 🌸 heart glasses;
  - ⭐ star glasses, 🎈 balloon, 🍀 lantern, 🦋 wings;
  - 🌈 wand, 🎧 headphones, 🧣 scarf, 🪁 kite.

  Nothing earned is lost, and unknown values are dropped.
- **Room:** shows each accessory's ink art and its name with pinyin, grouped
  by slot.

### Ink icon set

`InkIcon` draws icons in the app's ink style: 3px outlines and flat palette
fills on a 48×48 grid. The same markup is reused inside Truffle's SVG. It
replaces every child-facing emoji:
- power marks;
- path and progress-bar step icons;
- stars, the medal, the lock and sparkles;
- the fishing fish;
- the placement buttons and the combo flame;
- the loading paw and the error screen;
- the radical meaning icons used in intro cards, fishing, badges and the power
  intro.

The parent area keeps its emoji, including the reward-goal emoji the parent
chooses.

## 14. Fairer placement and clearer writing prompts (added 2026-10-03 at the parent's request)

### Placement by difficulty bands

The old check showed 40 characters from easiest to hardest and stopped at the
first "不认识"; one slip on an easy character sank everything after it. It is
replaced by:

- **Bands:** the built-in characters, in rank order, are split into bands of
  60 (10 bands).
- **Questions:** 8 characters are asked from each band, evenly spaced through
  it, easiest band first.
- **Each question is a quiz, not self-report:**
  - the character with 4 pinyin options (the flashcard distractor rules);
  - plus a 不知道 ("don't know") button, which counts as wrong.
  - No right/wrong feedback is shown, and Truffle stays neutral.
- **A band passes at 6 of 8.** The check stops at the 3rd wrong answer in a
  band (the moment 6/8 becomes impossible), or after the last band.
- **Credit:**
  - every character in a passed band is seeded as known;
  - in the band where it stopped, only the characters answered correctly are
    seeded.
  - Characters he missed are not seeded, so they come up early as new words.
  - Seeded characters get their first recheck spread evenly over days 7–28,
    hardest (rarest) first, so a big placement never lands on one day and
    pauses new words (the 40-due pause).
- The parent can re-run placement from Settings, as now.

### Writing (听写) prompts

Under the pinyin and the speak button, the writing step shows:

1. **The meaning:** the word's own meaning, first sense only (text before the
   first comma or semicolon). Parent words show their meaning if the parent
   entered one.
2. **The source word, for a single built-in character with an example word:**
   that word with the character blanked, e.g. ＿子 for 儿. The speak button
   reads "儿，儿子的儿", the way teachers dictate 听写.

This relaxes the earlier rule that child-facing meanings come only from
radicals, for writing prompts only.

## 15. The journey: ink worlds behind Home (added 2026-10-03 at the parent's request)

The parent found the app "a little bare": too much plain paper, not enough
going on, sparse lesson screens. They chose the ink-landscape direction, with
scenes that change as he progresses, and asked for places kids find exciting
(he likes Pokémon, Bluey, Hot Wheels, Minecraft).

**No IP:** each world borrows the *kind* of fun (hidden creatures, backyard
play, race tracks, digging blocks), never names, characters or art. All art
follows the §13 ink rules: outline `#2a2630`, palette fills, no gradients.

### The eight worlds

"Known" is the Home count (认识 N 个字). Thresholds:

| id | World | Unlocks at | Scene |
|---|---|---|---|
| `yard` | 后院 Backyard | 0 | picket fence, treehouse, swing, sprinkler, paddling pool, ball |
| `grass` | 草丛探险 Tall-grass hunt | 30 | tall grass tufts, eyes and ears peeking out, a butterfly |
| `race` | 赛车山 Race-track hills | 60 | an orange track with a loop over the hills, two little cars, a chequered flag |
| `blocks` | 方块世界 Block world | 100 | hills of square blocks, a cube tree, a cave with gem blocks, a pickaxe |
| `dino` | 恐龙谷 Dino valley | 150 | a smoking volcano, ferns, a friendly long-neck dinosaur, a nest with eggs |
| `sea` | 海底 Under the sea | 200 | a wavy waterline, a submarine, coral, fish, an octopus |
| `space` | 月球基地 Moon base | 300 | a lavender sky, a ringed planet, a rocket on its pad, craters, a rover |
| `pirate` | 海盗岛 Treasure island | 400 | sea, an island with a palm tree, a ship with a red sail, an X in the sand |

### Unlocking and choosing

- **Unlocks never go back.** `kid.worldsSeen` records every world he has
  reached, like `powerTiersSeen`, even if a lapse drops his known count.
- **Arrival moment:** when Home finds a newly reached world, it shows a card
  once: the scene, "到草丛了！" ("we've reached the tall grass!") with pinyin,
  and a 走吧！ ("let's go!") button.
  - If several worlds are reached at once (e.g. right after placement), only
    the newest gets the card; all of them are recorded as reached.
  - The backyard is the starting place and never gets a card.
- **Which world shows:**
  - the newest reached, by default;
  - he can pick any reached world in Truffle's room, on a new 地方 ("places")
    tab next to 服装 and 能力;
  - unreached worlds show there as locked, with their word count.
  - `kid.world` holds his pick (null = newest).
- **Truffle wears what he chose.** Worlds don't change his outfit; the mockup
  outfits were only illustrations.

### Home

- **The world fills the background,** behind unchanged panels and path:
  - scenery stays at the edges and the bottom, so panels and text keep full
    contrast;
  - panels stay opaque.
- **Truffle's bubble** says a short line that fits the world, with pinyin,
  e.g. 嘘……草里有什么？ ("shh… what's in the grass?"). There are 2–3 lines
  per world, picked by date.
- **This week:** a strip of 一 to 日 (Mon–Sun) beside a red 字己 seal; a day is
  filled when a lesson was finished that day.
- **Word of the day** adds one example word with pinyin and a speak button,
  when the character has one. There is no example sentence: the content has
  none.

### Lessons

Lesson screens show a slim strip of the current world's ground along the
bottom, above the bottom bar. It is decorative and never covers the work
area.

### Time of day

A light wash over any world, by the device clock:
- morning (before 12:00): cool;
- afternoon: warm;
- evening (from 18:00): an indigo wash across the top, with a moon, a few
  stars and a lantern string.

The ground and panels keep their contrast.

### Tap fun: one thing per world

| World | Tap | Result |
|---|---|---|
| yard | the sprinkler | water sprays; Truffle flinches (wow), then laughs |
| grass | the rustling grass | one of the 12 zodiac animals pops out (a new one at most once a day, otherwise one he has found waves); found animals fill a 找到的动物 ("animals found") page in 字卡 |
| race | a car | it drives one lap of the loop |
| blocks | a gem block | three taps crack it, then a gem pops out (at most one a day); gems sit in a jar on the room shelf |
| dino | the egg | it wobbles; after his next finished lesson it has hatched, and the baby stays in the scene |
| sea | the submarine | it dives; fish follow for a moment |
| space | the rocket | 三、二、一 is spoken, then lift-off; it lands back after a few seconds |
| pirate | the X | Truffle digs; the first dig each day gives one bonus star |

- **Saved state:** `kid.finds`, shaped
  `{ animals: string[]; gems: number; dinoHatched: boolean; lastAnimalDate,
  lastGemDate, lastDigDate: string | null }`.
- **Reduced motion:** animations become simple fades.
- **Taps never block practice:** no tap gates the path, and nothing is
  required.

### Build order

- **Plan 6, worlds:**
  - scene art for all eight worlds;
  - unlocks, `worldsSeen`, the arrival card and the room 地方 tab;
  - time of day;
  - the lesson strip;
  - the week strip with the seal, and the word-of-the-day example;
  - Truffle's world lines.
- **Plan 7, tap fun:** the eight interactions, `kid.finds`, the animals page,
  the gem jar, the dino hatch and the pirate star.

## 16. 朗读 coach and exam-etiquette warm-up (added 2026-10-03 at the parent's request)

### Why

His P2 oral-exam sheet (看图说话 口试评估表) rated every 朗读短文 (reading
aloud) criterion 待改进 (needs improvement): pronunciation, clarity, pauses,
pace and expression. The teacher noted 太小声了 (too quiet) and 错字较多
(quite a few misread characters), and marked 口试礼仪 (exam etiquette) ✗: no
greeting, no self-introduction. 看图说话 (describing a picture) and 会话
(conversation) were 中等 (average); they get their own plan next.

The coach targets the evidence-backed levers:
- **repeated reading** of the same passage;
- **model-then-echo** reading by phrase;
- **phrase chunking**, for pauses and pace;
- **instant loudness feedback**;
- **targeted retrieval** of the characters he misreads.

### The daily 朗读 step (replaces 说一说 in the lesson)

The speaking step becomes the 朗读 coach. The step id `speaking` and the
parent's activity toggle stay the same. It runs in four parts, about 5
minutes in all:

1. **口试礼仪 warm-up.**
   - Truffle, as the examiner, says 你好！.
   - The child reads his self-introduction and records it: 老师好！我叫{name}。我今年{age}岁。我在{school}读{class}。…谢谢老师！ (fields from Settings, below).
   - **Pinyin fades by warm-ups recorded:**
     - first 5: full pinyin;
     - next 5: pinyin only on characters he doesn't know (not known in his cards);
     - after that: none.
   - If the parent hasn't filled in the Settings fields, the warm-up skips the self-introduction. It then practises only 老师好！ and 谢谢老师！.
2. **Listen and echo.**
   - Today's passage is shown one phrase at a time. Phrases split at punctuation, and at `/` marks the parent added.
   - Each phrase is spoken by TTS, then he says it back. A 再听 ("listen again") button replays it.
   - There is no recording and no grading in this part.
3. **Read it all.**
   - The whole passage, with pinyin per character (the `Label` style, toggleable as now).
   - He records while a **loudness meter** shows the microphone level:
     - Truffle's ears perk up above the target level;
     - "大声一点！" ("a bit louder!") appears after 2 s below it.
   - The target is a fixed RMS threshold, tuned on a real iPad.
   - Loudness is shown, never scored against him.
4. **Listen back.**
   - He plays his recording.
   - One star for finishing.
   - A second star if, compared with his previous recording of the same passage, he was louder on average or 10% quicker.

### Passages and the 3-day cycle

- **Sources:**
  - **Parent passages first:** added in the parent area as a title and text, with optional `/` phrase breaks; each can be edited or deleted.
  - **Then the 20 built-ins,** eligible by the existing 90%-known rule.
- **Cycle:** a passage stays "today's passage" for 3 practice days in a row (days on which the 朗读 step was finished), then the next one takes over.
  - Parent passages go in the order added.
  - Built-ins go in list order, skipping ones read in the last 30 days.
- **An extra day:** when the parent confirms misread characters on a passage's recording, that passage gets one more day (at most 2 extra days per passage).

### Extra rounds from Home

A 朗读 button on Home (beside the path) runs parts 2–4 for today's passage,
with no warm-up. Its recordings are kept like any other. Extra rounds don't
count as cycle days and give no stars, so the button is for practice, not
farming stars.

### Misread characters

- **Parent review:** 录音 (Recordings) shows each 朗读 recording with its passage text, every Han character tappable. Tapping toggles a "misread" mark.
- **Confirming** (保存) does two things:
  - Each marked character becomes a priority word:
    - with a recognise card: that card is due today;
    - without one: the built-in word is pulled to the front of new words (`listedAt` = now), as parent word lists already do.
  - The passage gets its extra day.
- **Auto-hints:**
  - If iPad speech recognition works for him, its mismatches show pre-marked in a lighter style ("建议", suggested). The parent confirms or clears each one. Nothing reaches his practice until the parent saves.
  - Hints are **off by default.** They are offered in Settings only if the build-time spike finds recognition usable. If it sends audio off the device, the switch says so plainly ("uses Apple's speech service").
  - If the spike finds recognition unusable, there is no switch, and review is manual.

### Settings

A new 口试 (oral exam) section stores:
- 中文名字 (Chinese name), 年龄 (age), 学校 (school, e.g. "XX小学") and 班级 (class, e.g. "二年级").
- Optionally, a custom self-introduction that replaces the standard one.

These are stored only in the local database and included in backups.

### Pictures

Parent-uploaded 看图说话 pictures leave the daily lesson until the
story-builder plan; they stay listed in the parent area. `chooseSpeakingPrompt`
is retired.

### Build order

- **Plan 8, 朗读 coach (this section):**
  - a speech-recognition spike first (on-device or not, how accurate for a child);
  - then the passages store and the parent passage editor;
  - phrase splitting and the 3-day cycle;
  - the warm-up with pinyin fading;
  - the echo part;
  - the read-all part with the loudness meter;
  - the listen-back stars;
  - the Home 朗读 button;
  - parent misread review and priority words;
  - the Settings fields;
  - hints if the spike says yes.
- **Plan 9:** the 看图说话 story builder and Truffle asks (会话).
- **Plan 7:** the world tap fun, scheduled after these.

## 17. 看图说话 story builder and "Truffle asks" (added 2026-10-03 at the parent's request)

### Why

His oral-exam sheet rated 看图说话 (describing a picture) and 会话
(conversation) 中等 (average) on every criterion. The teacher marked 开场白
(opening line) ✗ and noted vocabulary he lacked: 还给 (give back), 诚实
(honest), 打翻 (knock over).

What helps at this age:
- a predictable story frame;
- sentence starters that fade;
- pre-taught theme words;
- trying first, then comparing with a model;
- whole-story rehearsal without the cards.

### Fitting into the day

- The daily speaking step **alternates**: 朗读 on one lesson, 看图说话 on the
  next.
  - `kid.speakingLast: 'langdu' | 'story' | null` records which ran last.
  - The first lesson after this ships runs 看图说话.
- 朗读's 3-day cycle counts only 朗读 days.
- If either activity has nothing to offer (no passage, say), the other one
  runs instead.
- Home's 多读一遍 (read it once more) extra round stays 朗读 only.
- The parent's activity toggle `speaking` covers both.

### The 8 built-in scenes

Each scene is drawn in the app's ink style (§13 rules), with simple ink
children as the characters, never anyone's IP. The parent sees a gallery of
the scenes before release.

| id | Scene | Theme words |
|---|---|---|
| `vase` | A boy knocks over a vase in a shop and owns up | 打翻、花瓶、诚实、道歉、老板 |
| `wallet` | A girl finds a wallet and hands it back | 捡到、钱包、还给、失主、谢谢 |
| `grandma` | Children help an elderly lady cross the road | 帮助、老奶奶、过马路、小心、红绿灯 |
| `queue` | Someone cuts the canteen queue | 排队、插队、食堂、等一等、不对 |
| `litter` | A child litters in the park; another picks it up | 垃圾、乱丢、捡起来、垃圾桶、公园 |
| `share` | Sharing lunch with a classmate who forgot theirs | 分享、午饭、忘了、一起、开心 |
| `fall` | A friend falls in the playground | 跌倒、受伤、扶起来、医务室、关心 |
| `spill` | Bumping into someone and spilling a drink | 撞到、打翻、饮料、对不起、没关系 |

Each scene carries:
- its theme words (with pinyin from the content);
- a model story in the 5 parts below, one or two sentences each;
- 2–3 "Truffle asks" questions, each with a model answer.

Scenes are used in order, then repeat. `kid.story = { next: number; told:
number }`, where `told` counts finished stories and drives the fading.

### The story builder

Five parts, one screen each. Every screen shows:
- the picture;
- the guiding question, spoken by TTS;
- a sentence starter (`Label`, pinyin above each character);
- theme-word chips (tap to hear one).

| part | guiding question | starter |
|---|---|---|
| `opening` 开场白 | 图上画的是什么？ | 图上画的是… |
| `setting` 时间、地点、人物 | 什么时候？在哪里？有谁？ | 有一天，…在… |
| `events` 经过 | 发生了什么事？ | 突然，… |
| `ending` 结果 | 后来怎么样了？ | 后来，… |
| `opinion` 看法 | 你觉得怎么样？为什么？ | 我觉得…，因为… |

For each part:
1. He records his attempt.
2. Then a 听松露说 ("hear Truffle say it") button plays that part of the model
   story.
3. He can 重录 (re-record) or 继续 (continue).

After the five parts:
- **讲一讲:** he tells the whole story from the picture alone, with no cards
  or starters, and records it. This is the exam rehearsal.
- **Fading:** starters show for his first 8 stories (`told < 8`). After that
  they hide behind a 💡 hint button that reveals them.
- **No microphone:** each part shows the existing "麦克风没有打开" (the
  microphone isn't on) note and lets him go on. 听松露说 still works, so he
  still hears good sentences.

### Truffle asks (会话)

After the whole story, Truffle asks each of the scene's 2–3 questions, shown
as a `Label` and spoken. For example:
- 如果你是他，你会怎么做？为什么？ ("If you were him, what would you do? Why?")
- 你有没有遇到过这样的事？ ("Has something like this ever happened to you?")

For each answer:
- The frame starter is 我会…，因为… ("I would…, because…") or
  我觉得…，因为… ("I think…, because…").
- He records his answer.
- 听松露说 then plays the model answer.

### Recordings

New prompt kinds:
- `{ kind: 'story'; sceneId; part }`, where `part` is one of the five above
  or `'whole'`;
- `{ kind: 'answer'; sceneId; question: number }`.

The parent's Recordings page groups one session's story recordings under a
single "🖼️ {scene title}" entry: the parts, then the whole telling, then the
answers. Each plays inline. There is no automatic grading and no misread
marking (that is for 朗读).

### Stars

The step's usual star. No bonus star: talking time isn't a fair measure here.

### Build order

**Plan 9:**
1. Scene art and gallery.
2. Scene content (theme words, model stories, questions).
3. The alternation.
4. The story builder.
5. Truffle asks.
6. Parent grouping in Recordings.
7. Walkthrough.

## 18. Adaptive layouts: one screen on every iPad and iPhone (added 2026-10-03 at the parent's request)

### Why

On the iPad the parent found three problems:
- **Lessons hide the world.** Lessons show it only as a 190px strip along the
  bottom. The 继续 bar covers half of it, and the feedback panel covers nearly
  all of it.
- **Home scrolls.** The page is 600–860px taller than the screen. The lesson
  path scrolls over a fixed world picture, and Truffle scrolls with the list,
  so he floats up into the sky.
- **Pages scroll a little.** Some screens overflow by a few pixels, which
  feels sloppy.

The parent also wants the app to work on iPhones. He turns the iPad either
way, so both iPad orientations matter.

### The rule

- Every child screen is **exactly one screen tall** and the document never
  scrolls.
  - Child screens: everything outside the PIN-gated parent area, including
    the PIN pad.
  - This holds on an upright iPhone (from SE size, 375×667) and on an iPad in
    either orientation.
- **Long lists scroll inside their own panel.** These are the 字卡
  collection, the costumes tab, and any other list that can grow.
  - The top bar, the tabs and the bottom nav stay put.
- **The parent area may scroll.** Its tables are genuinely long.
  - On a phone, nothing in it may overflow sideways.
  - Wide tables scroll sideways inside their own box.
- **Safe areas stay respected:** notch, home indicator and rounded corners.
  `viewport-fit=cover` and the `env(safe-area-inset-*)` padding stay.

### Three arrangements, one fluid layout

Layout is CSS only: no device detection in code. Sizes scale with the screen
using `clamp()` on `dvh`/`vw`/`vmin`. The three arrangements are:

| Arrangement | When | Shape |
|---|---|---|
| phone | width < 600px, portrait | one column, smaller Truffle, compact path |
| tablet portrait | width ≥ 600px, portrait | today's layout, tightened to fit |
| tablet landscape | landscape and height ≥ 600px | two columns |

- **Fixed-size regions:** the top bar or lesson bar, the bottom nav, and the
  floating 继续/feedback card.
- **Fluid regions** grow and shrink with the screen:
  - Truffle;
  - the big character;
  - the answer tiles;
  - the writing box;
  - the 看图说话 picture;
  - the 朗读 passage;
  - the path.
- **Tap targets:**
  - every tappable element is at least 44px, Apple's minimum;
  - main actions are at least 64px on tablets and 52px on phones. Main
    actions are the answer tiles, 继续, the path stops, the record button and
    the nav.
- **Text never gets smaller than readable:**
  - Chinese labels are at least 16px;
  - pinyin is at least 9px (`max(0.5em, 9px)`). Pinyin is drawn at half its
    character's size, so a fixed 12px floor would oversize it next to small
    labels.

**A phone turned sideways** (landscape, height < 500px) shows a full-screen
overlay: Truffle with 请把手机竖过来 ("turn your phone upright"), with pinyin
as everywhere else.
- A sideways phone is only about 375px tall, too short for a lesson.
- The overlay applies to child screens only, so the parent area can still be
  read sideways.
- The lesson underneath keeps its state. Turning the phone back continues
  where he was.

### Home

- **Truffle is pinned** to a spot on the ground beside the path. He is no
  longer part of the path list, and nothing on Home scrolls.
  - phone and tablet portrait: he stands bottom-right;
  - tablet landscape: he stands under the path.
  - His bubble and his tap behaviour (§5b) don't change.
- **The path** becomes a compact zigzag of today's stops, each with its label.
  It stretches or squeezes to the room left.
- **The word of the day:**
  - phone and tablet portrait: a single row card (the character, its pinyin,
    and its word with 🔊);
  - tablet landscape: the existing upright card in a left column, above the
    "today done / 再玩一会儿" card.
- **The world taps (§15)** must stay tappable in every arrangement: not under
  the path, the cards or Truffle. Each world's target position may differ per
  arrangement. The sweep (below) checks it with `elementFromPoint` at each
  target's centre.

### Lessons

- **The whole world sits behind every lesson step,** the same full-screen
  scene as Home: sky above, ground below. It replaces the 190px strip.
- **继续 floats:**
  - phone: a rounded card inset 16px from the sides, above the safe area;
  - tablet portrait: the card is centred, not full width;
  - tablet landscape: the button sits bottom-right under the answers.
- **The right/wrong feedback becomes the same floating card,** tinted:
  message, correct answer and 🔊 on the left, 继续 on the right. Ground shows
  around and beneath it.
- **Paper backing:** text that sits on the scene keeps it (tiles, chips,
  cards). The big character may sit on the sky, which is pale in every world
  and time of day; check night (§15 time layers) during the sweep.
- **Tablet landscape splits each step in two:**

| Step | Left | Right |
|---|---|---|
| 认一认 (flashcards) | Truffle + bubble, the character | the answer tiles |
| 写一写 (writing) | Truffle + the cue (meaning/pinyin/word) | the writing box |
| 钓鱼 (components) | Truffle + the target | the pond |
| 朗读 | warm-up line or the passage | loudness meter, record/listen controls |
| 看图说话 | the picture | question, starter or 提示, theme words, mic, 听松露说 |
| chest / celebration | Truffle | the reward |

- **The phone stacks them:** Truffle sits small at the top-left with his
  bubble to his right, then the prompt, then the answers.
- **看图说话 on a phone:** the picture takes the full width (4:3). The theme
  words wrap into at most two rows; if they still don't fit, they become one
  horizontally scrolling row. This is the one allowed in-panel scroll in a
  lesson.
- **朗读 passages:** a long passage scrolls inside the passage card. The
  card's height comes from the space left on the screen.

### Other child screens

Each one fits one screen in all three arrangements:
- the PIN pad (setup and the 家长 gate);
- PetSetup (the 字己 seal and waking Truffle);
- the placement quiz;
- 字卡, including its card close-up;
- 松露 (Wardrobe) with its 服装, 能力 and 地方 tabs;
- 多读一遍 (the extra 朗读 round);
- the error screen.

### Checking it

- **CSS contract tests** (`src/styles.test.ts`) pin the rules jsdom can't see:
  - `.screen` is exactly `100dvh` tall with no document scroll;
  - lessons use the full world scene, not `.world-strip`;
  - the bottom card floats;
  - the three arrangement media queries exist;
  - the phone-landscape overlay rule exists.
- **A fit sweep:** `scripts/fit-check.mjs`, run with `npm run fit`.
  - It uses Playwright's WebKit: Safari's engine, which is what the iPad and
    iPhone run. `playwright-core` becomes a dev dependency; the sweep is not
    part of `npm test`.
  - It runs against a built preview.
  - It seeds a test profile by writing the app's IndexedDB stores directly.
    It never touches a real profile.
  - It visits every child screen and every lesson step. Steps are reached
    through free play with one activity enabled at a time.
  - It covers six sizes: 375×667, 390×844, 768×1024, 1024×768 and 1180×820,
    plus 667×375, where the overlay should show.
  - For each screen it checks, and fails otherwise, that:
    - the document's `scrollHeight` equals the viewport height (and
      `scrollWidth` its width);
    - every visible interactive element lies fully on screen and is at least
      44px;
    - main actions meet their 64px/52px minimum;
    - the world-tap target is the top element at its centre on Home.
  - It saves a screenshot of every screen at every size for the parent to
    look through.
- **Visual check** of the screenshots for overlaps the numbers can't catch:
  text over busy scenery, Truffle clipped by a card.

### Out of scope

- Phone landscape lessons: the overlay asks him to turn the phone back.
- Android tablets, desktop browsers and split-screen iPad multitasking. They
  get whichever arrangement their size implies, and nothing is checked for
  them.
- Redesigning the parent area.

### Build order

**Plan 10:**
1. The layout foundation:
   - the one-screen `.screen`;
   - the arrangement media queries and fluid size tokens;
   - the phone-landscape overlay;
   - in-panel scrolling for lists.
2. The fit sweep script, so every later task is checked by it.
3. Home: pinned Truffle, compact path, word card per arrangement, world-tap
   positions.
4. Lessons: the full world behind them, the floating 继续 and feedback card,
   and each step's three arrangements.
5. The other child screens.
6. Sweep at all sizes, screenshot review, and fixes.

## 19. Class-aligned practice: words in use, HSK 1–9, a worksheet importer and a fairer placement (added 2026-10-04 at the parent's request)

### Why

The parent shared 8 packs of his enrichment class's worksheets: Berries 百力果 P2 高华. They review the school's 小学高级华文 2A/2B textbook, lessons 1–19. Five packs are marked. His error rates:

| Exercise | Wrong | What goes wrong |
|---|---|---|
| 词语选择 (the word that fits a sentence) | 63% (17/27) | He misses pairings printed in his own lists (保持安静, 觉得口渴, 排得整齐), confuses near-synonyms (知道/明白, 开始/开头), picks adjectives by mood, and ignores connectives (虽然…但是). |
| 字辨 (look-alike characters) | 47% | Every miss keeps the shared part but takes the wrong radical (跟→根, 抢→苍, 漂→票, 容→室). |
| 拼音选择 | 43% | Mostly initials and finals, not tones. He reads the phonetic part (静→qīng), and mixes j/q/x with z/c/s (群→cūn, 建→ziàn). |
| 填写汉字 | 40% | He writes a same-sound character (新加坡→新家坡, 市区→是去). |
| 习字 / copying | ~3% | Fine. |

The parent also reports that he forgets both how to read words and what they mean.

Three findings drive this section:
- The app trains character recognition, with pinyin distractors that differ only by tone. His gaps are word meaning in context, radicals, and sounds beyond the tone.
- About 44% of his class characters (114 of 257) aren't in the app at all. HSK 1–2 covers 56% of them, HSK 1–4 84%, and HSK 1–6 98%.
- Placement only checks reading, so a child can "know" 595 words and still not understand them.

### Rules that hold throughout

- **Nothing from the Berries packs or the school textbook goes into the repo or the public site.** Their word lists, sentences and passages enter only through the parent area and stay on the iPad (IndexedDB). They are included in backups, like the rest of his data.
- What ships with the app is:
  - the MIT-licensed HSK 3.0 lists (elkmovie/hsk30, from Pleco);
  - sentences written for this app;
  - openly licensed sentences, credited in the app's credits screen. Tatoeba is CC BY 2.0 FR; each sentence is parent-approved before use.
- Child screens still follow §13 (ink, no emoji) and §18 (one screen, fit sweep).
- The child's name from the worksheets is never used or stored.

### 1. Built-in content: HSK 3.0 levels 1–9

- The build (`scripts/build-content.ts`) keeps every HSK character, not just the first 600.
  - That's about 3,000 characters, in rank order: level 1 first, then level 2, and so on, by frequency within a level.
  - Each character carries its HSK level (1–6, or 7 for 七—九级).
  - The internal `LEVEL_SIZE` banding is replaced by the HSK level.
- **Words:** the HSK word list (about 11,000 words) is bundled too, as a word dictionary. It's used for:
  - **组词:** common words built from a character, shown as its meaning cue (惜 → 珍惜, 可惜);
  - the importer's word-joining and spelling checks;
  - distractors.
- **Writing:** `writeable` comes from the HSK handwriting lists (初等/中等/高等手写字表). It is no longer an app rule.
- **Pinyin:** in-word readings use pinyin-pro plus the existing `pinyinFixes`. 轻声 is marked (认识 rèn shi).
- **His progress is kept.** Existing cards and words keep their ids. New characters arrive as new words.
- **Size:** the bundled content has to stay small enough for an offline PWA. The plan measures it; a target of no more than 1.5 MB gzipped for the JSON.

### 2. Words, not just characters; reading and meaning tracked separately

- **School words lead the new-word queue.** These are listed words, newest list first, then HSK words by rank. School words are usually two-character words (欺负, 保持).
- **Two kinds of memory per word.** Each word gets two review cards:
  - **reading** (`recognise`): how it's read;
  - **meaning** (new kind `meaning`): what it means and how it's used.
- They are scheduled separately with FSRS, as now. A miss on one doesn't reset the other.
- Placement can set them differently (part 6).
- **Meaning cue, in order of preference:**
  1. A sentence from his imported class material containing the word.
  2. A sentence-bank sentence (part 4).
  3. A parent-typed example.
  4. 组词 from the HSK words.
  - Picture cue: an ink icon where one exists (§13 icon set). Abstract words have none.
  - Never English. The parent chose Chinese examples so he thinks in Chinese.

### 3. The 30-minute lesson

The default `sessionMinutes` becomes 30, and the parent can still change it. Each step's item count scales with the minutes. There is no break; the chest comes at the end as now.

| # | Step | ~min | Change |
|---|---|---|---|
| 1 | 认一认 | 7 | Reading and meaning, for words |
| 2 | **选一选** | 6 | New step (`choose`) |
| 3 | 钓鱼 + 字辨 | 5 | 字辨 items added after the fishing round |
| 4 | 写一写 | 6 | Becomes 听写 of whole words |
| 5 | 朗读 | 6 | Imported class passages first |

`StepKind` gains `choose`, with its own parent toggle like the others. A word missed in any step has its matching card brought forward. The rules:
- A missed reading → `recognise`.
- A missed fit in 选一选 → `meaning`.
- A missed 字辨 → the word's `write` card. If it has none, its `recognise` card.

**认一认**
- **New word:** an intro card with the word, pinyin, Truffle reading it, the meaning cue with the word highlighted, and the picture if there is one.
- **Reviews alternate between two question types:**
  - **How is it read?** Four pinyin choices; the wrong ones are his traps:
    - the phonetic component's own reading (静 → qīng);
    - j/q/x ↔ z/c/s ↔ zh/ch/sh;
    - close finals (ie/ia, uo/ou, in/ing, an/ang);
    - for 轻声 words, the full-tone reading.
    - Tone-only distractors become one option at most.
  - **Which fits?** The meaning cue with the word blanked, and three words to choose from. They're the same kind of word (noun/verb/adjective, from the sentence bank's tags or HSK word type) where possible.

**选一选 (new)**
- About 8 items a day at 30 minutes: a sentence with a blank and four words.
- **Sources, in order:**
  1. imported class sentences containing a due or new school word;
  2. the sentence bank;
  3. approved Tatoeba sentences.
- **Wrong choices:** hand-picked for bank sentences. For imported sentences they're chosen automatically: near words from his lists with the same length and type, plus look-alikes.
- **After the answer,** Truffle reads the whole sentence. The pairing shows if one is known (保持 + 安静).
- **On a miss,** the clue shows if the item carries one ("看'虽然'，后面用'但是'"). Only bank items carry clues.

**钓鱼 + 字辨**
- After the fishing round come 4 字辨 items: a school or recent word with one character missing, and 4 look-alike characters that share its phonetic or shape component.
- After answering, the correct character's radical and its meaning show (扌 = 手的动作).
- The radical-meaning table (`src/content/radicals.ts`) grows to cover the radicals this material needs: 足, 宀, 弓, 氵, 木, 艹, 口, 贝, 讠, 辶, 心/忄, 日, 女, 纟, 钅, 土, 火, 目 and so on.
- Look-alike sets come from a component index built from makemeahanzi's decomposition, which the build already reads.

**写一写 (听写)**
- Truffle says a whole word; he writes each character in turn.
- The cue shows only the word's pinyin and its meaning cue, with no character shown, so it is recall, not copying.
- A word he wrote with a same-sound character comes back sooner. The parent marks these, as with 朗读 misreads, or 字辨 misses do it automatically.
- Hint strokes still appear after 2 misses.

**朗读**
- Unchanged (§16), except that imported class passages come before built-in ones.

### 4. The sentence bank (ships with the app)

- **Written for this app:** child-level, Singapore-friendly sentences (地铁, 巴士, 小贩中心, 组屋).
- **Coverage:** the P2 Higher Chinese vocabulary in the packs, plus any of the 2A/2B word lists the parent imports, about 250 words with 2 sentences each.
- **Each item:** target word, sentence with a blank, 3 hand-picked wrong choices, the word's type, an optional pairing, and an optional clue.
- **The wrong choices are always:**
  - one near-synonym or same-topic word;
  - one word that would fit the mood but not the frame;
  - one look-alike or same-sound word.
- **Placement items:** about 4 per placement band, about 120 in all.
- **A content test checks every item:**
  - the blank appears exactly once;
  - the target and choices are different real words;
  - the sentence's characters are no more than one HSK level above the target's level;
  - no item repeats a sentence.
- **Tatoeba (optional extra):**
  - The content build prepares a filtered pool of Mandarin sentences (CC BY 2.0 FR) and ships it with the app; the iPad never downloads the full Tatoeba set.
  - The filter keeps sentences that are short (no more than 20 characters), use only HSK 1–9 characters, and contain at least one HSK word.
  - The parent area offers the ones that contain his words and use only characters at or below his level. Each is shown for approval before use; approved ones become 选一选 items with automatic wrong choices.
  - Credited in the credits screen.

### 5. Worksheet importer (parent area → "Add from a worksheet")

1. **Input, either:**
   - **Paste** text, e.g. copied with the iPad's Live Text from Camera, Photos or Files.
   - **Add a photo.** The app shows it full size so the parent can use Live Text on it in place, then **Paste text**. This must be confirmed on a real iPad home-screen app; the fallback is selecting in Photos.
   - There is no in-app OCR. An on-device Tesseract test on his scans produced unusable output for word tables and about 4% wrong characters in passages, while Apple's engine read the passage near-perfectly.
2. **Tidy:**
   - Join characters split across table cells back into words, using the HSK word dictionary plus his existing words (欺 + 负 → 欺负).
   - Drop headings, page codes (such as P1-L07-AB-PG03), instructions, copyright lines and numbering.
   - Flag anything that isn't a known word, with a suggestion where one is found. Suggestions come from same-pinyin or one-character-off dictionary words (告坼 → 告诉).
3. **Sort:**
   - **words** (1–4 characters, including 量词 phrases like 一阵阵);
   - **pairings** (two words on a line or in adjacent cells: 保持 安静);
   - **成语** (four-character words found in the 成语 sections, tagged);
   - **sentences** (end in 。！？);
   - **passages** (3 or more sentences together).
   - The lesson header (第三十课) names the import when found.
4. **Preview:** grouped by type. Each item can be unticked, edited, or moved to another group.
5. **Add saves:**
   - words → a school word list (the existing list mechanism);
   - pairings and sentences → attached to their words;
   - passages → Reading texts.
   - Everything stays on the iPad.

### 6. Placement check, redesigned

**Adaptive.**
- The 3,000 characters form 30 bands of about 100, in rank order.
- The check starts at about HSK 2, band 7. Each visited band gets 4 mixed questions.
- It steps up after 4/4 or 3/4, and down after 1/4 or 0/4. A 2/4 visits the band once more.
- It stops when the boundary has been crossed twice, or after 40 questions.
- About 10 minutes. A short reading check, 3 easy questions, opens it so a nervous start doesn't skew the result.

**Five question styles, mixed, never the same style twice in a row:**

| Style | Item | Checks |
|---|---|---|
| 读一读 | a word → its pinyin, with trap distractors | reading |
| 听一听 | Truffle says a word → pick it from 4 look-alike words | sound to word |
| 真的假的？ | a real word or a made-up look-alike (欺负 / 欺服) | word knowledge |
| 补一补 | a word with one character missing → pick from 4 look-alikes | 字辨 |
| 选一选 | a short sentence → the word that fits (placement bank) | understanding |

**Two results:**
- **Reading level:** the highest band where reading-type questions (读一读, 听一听, 补一补, 真的假的) hold.
- **Understanding level:** the same, using 选一选.

**What the result does:**
- Words up to the understanding level get both cards seeded as known, spread over days 7–28 (§14).
- Words between the two levels get a known `recognise` card and a **due-now `meaning` card**.
- Words above the reading level stay new.
- **A re-run replaces earlier placement guesses**, the rule deployed 2026-10-04: unpractised placement cards that the new result doesn't support are cleared. Practised words stay.
- **For the parent:** the result screen shows both levels with HSK labels ("读：HSK 4 · 懂：HSK 2") and a few sample missed words.
- **For the child:** no right/wrong during the check (§14), and the same encouraging close.

### 7. Skills panel (parent area)

- **Recent accuracy, last 14 days,** for: reading (认一认 reading questions), meaning (认一认 meaning questions and 选一选), 字辨, 听写 and 朗读 (time and loudness, as now).
- **Comparison:** the class baselines from the packs, so the parent sees the trend (e.g. 选一选 against the 63% 词语选择 error rate).
- **Top missed words** per skill, each with a "practise more" button that brings its cards forward.

### 8. Checking

- **Unit tests:**
  - the importer's tidy and sort, against fixtures written to look like OCR output (not copied from Berries);
  - distractor rules;
  - placement's band walk and two-level result;
  - the reading and meaning card scheduling;
  - the sentence-bank content test.
- **Fit sweep (§18):** gains the new screens (选一选, 字辨, 听写, the importer and the new placement styles) at all six sizes.
- **On a real iPad:** Live Text on a photo inside the home-screen app; the 30-minute lesson's pacing.

### Out of scope

- In-app OCR.
- English meanings.
- AI-generated sentences.
- A separate pairing-matching exercise; pairings only feed 选一选.
- 看图说话, which is still parked.

### Build order

Four plans, each shippable on its own:

1. **Plan 11 — content and words:**
   - HSK 1–9 built-in content, the word dictionary, 组词 and writeable lists;
   - the `meaning` card kind;
   - the 30-minute default;
   - 认一认 reading and meaning questions, with the new pinyin traps.
2. **Plan 12 — the importer:** paste and photo with Live Text, tidy, sort, preview, and saving words, pairings, sentences and passages.
3. **Plan 13 — practice in use:**
   - the sentence bank (written and content-tested);
   - the 选一选 step;
   - 字辨 in 钓鱼 with the radical table and component index;
   - 听写;
   - optional Tatoeba sentences.
4. **Plan 14 — placement and Skills:** the adaptive five-style check with two levels, and the Skills panel.

## 20. Deeper practice: meanings in every review, more repetition, words in use (added 2026-10-04 at the parent's request)

### Why

After plan 11 shipped, the parent found the lesson "too simple":
- **Reviews never show meaning.** A review shows the bare character and asks only for its pinyin. Meaning comes up only in the separate meaning questions.
- **Too little repetition.** In the lesson today:
  - a new word is met once (intro, then one reading question);
  - a miss comes back once (4 items later);
  - each 写一写 word is written once, from memory.
- **No sense of when and where a word is used.**

The placement check also still looks the same, because the redesign (§19 part 6) hasn't been built yet. It is moved up to the plan straight after this one.

The §19 rules still hold: nothing from his class material goes into the repo, no English, no emoji on child screens, and every screen fits without scrolling (§18).

### 1. Meaning in every 认一认 review

- **The usage line** is the word in use, with the word highlighted, its pinyin and a speak button.
  - Its source is the meaning cue's order of preference (§19 part 2): an imported class sentence, then a sentence-bank sentence, then a parent example, then a 组词 word.
  - A word with none of these shows no line.
- **When it shows:** after every reading answer, right or wrong, the feedback phase shows the usage line under the character.
  - It sits in the card area, not the bottom bar, so the bar keeps its current height.
  - On a miss, the bar still shows the right reading, as now.
- **Speaking it:** Truffle reads the character as now. The usage line is read only when he taps its speak button, so reviews don't slow down.
- **New-word intro:** the usage line comes first, under the character, and is read aloud after the character.
  - When the line is a sentence, one 组词 word shows under it, so the card still fits a phone.
  - Otherwise the two 组词 words show, as now.

### 2. More reading repetition

**Each new word** is met 3 times in the lesson:
1. the intro card, then its reading question (as now);
2. a second reading question, about 5 items later;
3. a meaning question near the end of 认一认, if it has a cue.

The third meeting starts its meaning card, so it no longer waits for the next day's new-meaning pick.

**A missed item** (reading or meaning) comes back twice: about 3 items later, then about 6 after that. If either return is still missed, it is rated a miss as now. Only the first answer sets the FSRS rating, as now.

**New words per lesson:** the default goes from 5 to 4, so the extra repetition fits. The parent can still change it.

### 3. More writing repetition

**A new 写一写 word** gets 3 passes, one character at a time:
1. **描一描:** trace over the faint outline;
2. **看提示:** write with a hint. The first stroke shows, and hints come after 1 miss;
3. **默写:** from memory, with no outline. Hints come after 2 misses, as now. This is the pass that sets the rating.

**A review word** gets the 默写 pass only.

**A word that needed a hint, or had more than 3 misses,** comes back at the end of 写一写 for one more 默写.

**Per lesson:** at 30 minutes, 4 words: up to 2 new ones (as now), with reviews filling the rest. Under 25 minutes, 3 words. This replaces today's 5 and 3.

**The next day:** a new write card's first review is due the day after, so new words come back.

### 4. When and where to use a word

This builds the §19 sentence bank and 选一选, and adds one question style.

- **用对了吗？ (new question type).**
  - Two sentences use the same word. One uses it correctly; the other puts it in the wrong frame (我们要保持安静 / 我保持了一个苹果).
  - He picks the right one. After he answers, Truffle reads the right sentence, and the pairing shows if one is known.
  - Only sentence-bank items have a wrong-use sentence. It is hand-written, never generated.
  - The content test checks that each item uses the word exactly once in each sentence, and that both sentences pass the §19 level rule.
- **Where it runs:** 用对了吗 and 选一选 items share the 选一选 step and alternate, about 8 items in all at 30 minutes.
- **认一认's "which fits?" meaning question** prefers bank sentences over 组词, after his imported class sentences (§19 part 2).
- **The sentence bank** (§19 part 4) is the main thing to write: about 250 words, each with 2 fill-the-gap sentences and 1 wrong-use sentence. The words cover:
  - the P2 Higher Chinese words from the packs he works on;
  - HSK 1–2 words that have a picture cue.

### 5. The 30-minute lesson, revised

| # | Step | ~min | Change from §19 |
|---|---|---|---|
| 1 | 认一认 | 9 | The extra repetition, and 12 meaning checks a day for words he already knows (was 6; the parent asked for more volume on 2026-10-04, so the lesson runs about 32 minutes) |
| 2 | 选一选 | 5 | Shared with 用对了吗 |
| 3 | 钓鱼 (字辨) | 3 | The radical grid is replaced by 字辨 (part 8) |
| 4 | 写一写 | 7 | Three passes for new words |
| 5 | 朗读 | 5 | |
| 6 | **用一用** | 3 | New wrap-up (part 7), before the chest |

### 6. Checking

- **Unit tests:**
  - the queue order: the second reading and the meaning question for new words, and two returns after a miss;
  - write passes per word, and the end-of-step redo;
  - the usage line's source order;
  - the 用对了吗 content test;
  - the new-per-day migration (stored 5 → 4, only when unchanged, like `lessonVersion`);
  - the 用一用 target list, the count of correct recalls in context, the retry cap, and that a capped word is due the next day.
- **Fit sweep:** at all six sizes:
  - the usage line in feedback and on the intro, both with a long class sentence;
  - the three write passes;
  - 用对了吗;
  - 用一用.

### 7. 用一用 wrap-up: every target word used correctly before the chest

**Why:** the parent asked that each word be used correctly several times at the end of every lesson.

**The research the rule rests on:**
- Recalling a word beats seeing it again.
- About 3 correct recalls in a session is the best trade-off. Beyond that, gains in the same session are small; spaced returns on later days matter more (Rawson & Dunlosky, successive relearning).
- Spread-out recalls beat recalls bunched together.
- Durable word learning takes about 8–12 meaningful encounters in all (Webb; Uchihara et al.).

**The rule:**
- **Target words:** today's new words, and any word missed in today's lesson.
- **The lesson's goal:** each target word is recalled correctly **3 times**, with **at least 2 of those in context**.
  - In context means 选一选, 用对了吗, or a meaning question with a sentence.
  - The recalls are spread through the lesson; the 认一认 repeats from part 2 count.
- **The wrap-up comes last,** just before the chest. Every target word is used correctly once more, in context.
  - This is always the 3rd recall, even if he already has 3.
  - A target word short of 2 recalls in context gets one more wrap-up item.

**The items:**
- They mix 选一选 and 用对了吗. 用对了吗 is used only where a bank item exists.
- Sources come in the same order as everywhere else: his class sentences first, then the bank.
- A target word with no sentence anywhere gets the "which fits?" meaning question on its 组词 instead.
- No word appears in two items in a row.

**Misses:**
- A missed item returns after the other target words, until it is right, at most 3 tries for that word.
- A word still wrong after 3 tries ends the round kindly ("明天再来！"), and its meaning card is due the next day.
- A miss is rated as now: only the first answer sets the FSRS rating.

**Size:** usually 6–10 items, about 3 minutes.
- If there are more than 12 items, the round stops at 12.
- Words that didn't get their item are due the next day.

**Across days:** FSRS already spaces later returns, so the roughly 10 encounters build up over about 2 weeks without extra rules.

**For the child:**
- Truffle opens it with "用一用！"
- The chest follows as now.
- §13/§18 apply: no emoji, one screen.

**Parent toggle:** none. It is part of the lesson whenever 认一认 or 选一选 is on.

### 8. 钓鱼 becomes 字辨 (look-alike characters)

**Why:**
- On the worksheets he missed 47% of the 字辨 items, and every miss kept the shared part but took the wrong radical (跟→根, 抢→苍).
- Today's 钓鱼 is a general radical game: tap every character with 氵, or pick a character's part. It doesn't train that choice, so its minutes move to the version that does.
- 朗读 stays as it is (§16). It targets his oral-exam ratings directly.

**The step:**
- It keeps the 钓鱼 name, the pond scene and the 钓鱼 toggle. `StepKind` stays `components`.
- The fishing round is the 字辨 items from §19 part 3, in place of the radical grid.
- **Each item:**
  - a word with one character missing (树_ → 根/跟/很/银);
  - the missing character is a word from his class lists or a recent word;
  - the 4 choices share its phonetic or shape part.
- **Choosing:** he fishes out the right character. Truffle reads the whole word.
- **After the answer:** the radical and its meaning show (足 = 脚的动作, 木 = 树木). A miss also shows the word he chose, with its own radical meaning, when it is a real word.
- **How many:** about 6 items at 30 minutes, and 4 under 25.
- **Misses:** a miss brings the word's `write` card forward, or its `recognise` card if it has no write card (§19 part 3).

**Content:**
- The radical-meaning table and the component index are built as §19 part 3 describes.
- A word whose characters have no look-alike set with 3 or more members is skipped.
- If fewer than 4 items can be built, the step is skipped for the day, as 钓鱼 is skipped today when he knows too few characters.

**Removed:** the tap-all grid and the "which part" questions (`game.ts`'s round builder). The radical-meaning icons stay; 字辨 uses them.

### Out of scope

- Generated wrong-use sentences.
- English.
- Timed drills.
- A separate pairing exercise. Pairings still only show after an answer.

### Build order (replaces §19's plans 13–14)

1. **Plan 13 — deeper practice:**
   - §20 parts 1–3: meaning in reviews, reading and writing repetition;
   - the sentence bank, 选一选 and 用对了吗 (§20 part 4, §19 part 4);
   - the revised lesson timings;
   - the 用一用 wrap-up (part 7);
   - 钓鱼 becomes 字辨 (part 8).
2. **Plan 14 — placement and Skills:** §19 parts 6–7, unchanged.
3. **Plan 15 — dictation and extra sentences:**
   - 听写 (built: the school 听写 mistakes box; the rest arrived with plans 13–14);
   - Tatoeba sentences: **skipped** by the parent on 2026-10-04 — the written bank and his class sentences are enough;
   - optional Tatoeba sentences (§19 parts 3–4).
