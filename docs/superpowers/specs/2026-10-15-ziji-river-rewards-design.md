# ZiJi rewards: a river meter, "almost there" goals, and an onesie-standard wardrobe — design

Date: 2026-10-15 · Base: main after PR #15 · Parent decisions: 2026-10-15

## 1. Why

The child complained that "nothing was unlocked after the second lesson of the day". The causes:

- The chest is once a day, and only after the first lesson.
- Stars count only words he can newly write or say. A word only counts after two separate days, so a second lesson almost always shows the minimum 1 star.
- A second lesson never touches the streak, the chest or the dino egg (lesson-shape spec §4/§5).

The parent also judged most costumes below the zodiac onesies' standard: small hats on a plain grey Truffle. The Greek set is obscure for a 7-year-old in Singapore.

**Success:**

- Every lesson visibly moves something.
- A second chest is reachable on a busy day, but there is no endless grind.
- After every lesson he can see what is close.
- Every prize in the chest is as good as the zodiac onesies.

## 2. Decisions (parent, 2026-10-15)

| Question | Decision |
|---|---|
| Reward approach | **A + C:** a river meter that fills toward the chest after every lesson, plus "almost there" goals after every lesson |
| Extra lesson | **Fills half the meter.** A second chest comes after two extra lessons |
| Cap | **At most 2 chests a day.** Overflow carries to tomorrow |
| Costumes | **Onesie-led**: keep the 12 zodiac onesies; add about 18 onesies (river creatures and favourites); redraw about 10 jobs and the 7 Chinese myths; drop the Greek set from the chest. Costumes he already owns stay |
| Costume standard | **v3** (`docs/worlds/costumes/standard-v3.png`): the v1 designs, with headgear reaching both edges of his head and the crown of his head still visible. Ears as in v1 |

## 3. The river meter

- **Meter size:** 2 halves (a value of 0, ½ or 1, stored as halves).
- **Filling:** the **first** completed daily lesson adds 2 halves. Each **extra** lesson (想再学一课吗) adds 1 half.
- **Chest:** a chest opens whenever the meter reaches full, and the meter resets.
- **Daily cap:** at most **2 chests** per local day.
  - Halves earned after the cap are **banked** for tomorrow, up to 1 full meter.
  - The next day's first lesson adds its 2 on top of the bank. The chest opens at once, and any leftover stays.
- **Free play** (练一练 alone) and **parent-started review** add nothing.
- **Streak and egg:** these rules are unchanged; only the daily lesson counts.
- **Shown on the Celebration screen.** A short river track sits above the chest, with the paper boat (the One River boat art) moving along it:
  - The boat glides from its old spot to its new spot.
  - When it reaches the end, the chest appears and opens, using the existing hold-to-open flow.
  - If the meter isn't full, he sees the boat halfway and the line 「再学一课就能开宝箱！」.
  - If today's cap is reached, the line is 「明天再开宝箱！」.
- **Home:** the reward card shows a small version of the meter.
- **Data:**
  - `kid.meter: { halves: number; chestsToday: number; day: string }`
  - `kid.bank?: number`
  - Migration: start empty. `lastChestDate` keeps working as today's first-chest marker.

## 4. "Almost there" goals (shown after every lesson)

- **What the Celebration shows:** up to **3** goals, nearest first, after the stars and chest.
- **Candidates:**
  1. **Next world:** "还差 N 个字到 雨林" (characters learned since placement, compared with the threshold).
  2. **Next power tier:** "再认识 N 个『水』字，解锁新能力" (`fun/powers.ts` thresholds).
  3. **Can-write tomorrow:**
     - Shows words whose write or say rung has exactly one passing day.
     - Wording: "明天再写对『鱼』，就会写了！"
     - Up to 2 words. This is today's 'closest' line, promoted to a goal.
  4. **Chest:** "宝箱里还有 N 件新衣服".
  5. **Badge:** "再认识 N 个『木』字，得到新徽章" (`fun/stickers.ts` families).
- **Picking:** rank by the smallest remaining effort. Use only goals that today's lesson moved, or that are within reach this week, and never more than 3.
- **Text:** child-facing Chinese with pinyin (the Label component), plus a small icon per goal type.
- **Logic:** pure function `almostThere(kid, knowledge, finds, now)` in `src/fun/goals.ts`.

## 5. The wardrobe

### 5.1 Standard

Every prize must reach v3 (`docs/worlds/costumes/standard-v3.png`):

- The costume changes his whole silhouette.
- It has one dominant colour.
- Its signature prop is readable at the 64 px Wardrobe tile.
- It is light cel: line #706889, flat fills, one explicit-path hard shadow, no clip-paths, light from the upper left.
- Headgear reaches both edges of the head, and the crown stays visible.
- His face stays readable.
- Held props move with his paw. The rig gets `pawL`/`pawR` costume slots (`docs/worlds/costumes/rig-slot.diff`).

### 5.2 The set

| Group | Items |
|---|---|
| Zodiac onesies (keep) | 鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪 |
| New onesies (17; 小白兔 became the zodiac 兔's look, parent 2026-10-15) | 水獭 otter, 犀鸟 hornbill, 熊猫 panda, 青蛙 frog, 鸭子 duck, 蜻蜓 dragonfly, 小恐龙 baby dino, 翼龙 pterosaur, 锦鲤 koi, 螃蟹 crab, 鹦鹉 parrot, 喜鹊 magpie, 企鹅 penguin, 鲨鱼 shark, 独角兽 unicorn, 猫头鹰 owl, 小老虎 tiger cub, 小白兔 bunny |
| Jobs (10, redrawn as full-body) | 宇航员 astronaut, 厨师 chef, 消防员 firefighter, 医生 doctor, 飞行员 pilot, 警察 police officer, 足球员 footballer, 魔法师 wizard, 海盗 pirate, 小贩 hawker |
| Chinese myths (7, redrawn) | 孙悟空, 哪吒, 嫦娥, 后羿, 财神, 招财猫, 舞狮 |
| Accessories (16) | Kept as they are |

- **Total in the chest:** 47 costumes plus 16 accessories, so 63 prizes.
- **Starting point for drawing:** the 6 samples in `docs/worlds/costumes/samples-v3.ts.txt` (otter, panda, firefighter, hawker, 孙悟空, 嫦娥).
- **Helpers to reuse:**
  - `cel(d, fill, ax, ay)` for a shadow-on-the-far-side piece;
  - a held-pole helper;
  - gloves.
- **Removed from the chest:**
  - the 23 Greek costumes;
  - old outfits not in the jobs list: 探险家, 超人, 像素, 雨衣, 机器人, 城堡, 篮球服, 柔术服.
- **Already owned:** any removed costume he owns stays owned and wearable. Its old art is kept for owners only.

### 5.3 Chest order

- **Old first chest** (no longer used): the very first chest gave his zodiac onesie from Settings.
- **The pick:** a seeded pick from unowned prizes, weighted to rotate groups. Within each group's round he gets one onesie, then a job or myth, then an accessory, before any repeats of a group.
- **When everything is owned:** the chest gives 3 bonus stars, as now.
- **Pace:** at ≤2 chests a day, 63 prizes last at least 32 days, typically about 6 weeks.

## 6. Existing data

- **New kid state:** `meter`/`bank` start empty.
- **Owned costumes:** kept, including removed ones.
- **Unchanged:** stars, `bonusStars`, the streak and finds.
- **No lessonVersion bump:** nothing changes meaning.

## 7. Testing

- **Unit tests:**
  - meter arithmetic: first lesson, extra lessons, the cap of 2, the bank, the next-day carry, free play adding nothing;
  - `almostThere`: ranking, the cap of 3, each candidate type, nothing shown when nothing is near;
  - the chest pick: group rotation, never a removed item, bonus stars when everything is owned;
  - owned removed costumes stay wearable.
- **Rendered tests:**
  - Celebration after a first lesson (boat to the end, then the chest);
  - after one extra lesson (the boat at half, the hint line);
  - after two (a second chest);
  - when capped (the 明天 line);
  - with goals shown.
- **WebKit:**
  - the Celebration meter and goals at iPad and phone sizes;
  - a costume sheet of all 47 at 220 px, 64 px and cheer;
  - Truffle with every costume in idle and cheer, with no prop crossing his face (stage case);
  - the per-frame check still within 8 ms.
- **Fit sweep:** clean.

## 8. Out of scope

- New accessories.
- Costume trading.
- Spending stars.
- Story rewards.
