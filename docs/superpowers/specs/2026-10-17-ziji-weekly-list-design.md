# ZiJi this week's word list (本周词语): front-loaded, ready by midweek, with the class and revision kept — design

Date: 2026-10-17 · Base: main at c5e7b21 (after PR #35) · Approved by the parent 2026-10-17, with one amendment (§2.1) · Branch: `feat/weekly-list`

## 1. Why

Every week his tuition or school sends a sheet of words to learn before he starts that week's homework. The parent's sample is a P2 高华 review for textbook lessons 1–19. It has two parts:

- **词语:** a grid of about 30 words and single characters.
- **词语搭配:** verb or adjective + noun pairs, grouped under small theme headings.

His homework is due on **Friday night**, and he needs time to do it. So the list must be learned well before Friday: by about **Wednesday**.

Today ZiJi can take the words in through the worksheet importer (Content → From a worksheet). It cannot:

- give them a deadline;
- pace them so they arrive in time;
- practise the 搭配;
- tell the parent whether he is ready.

The parent also asked (2026-10-17) for two things to keep going:

- the official MOE class words, at the class pace;
- revision of what he learned before.

**Goal (the parent's choice):** by the ready-by day he can **read** every list item, **understand** it, and **use the 搭配**. Writing stays on the normal 写一写 schedule. The app does not force him to write the whole list.

**Success:**
- The list's new words are taught in the first two or three days after the list arrives.
- On the ready-by day, a 考考自己 check covers the whole list. The parent sees a line such as 「List 28/32 ready · class on track · 14 reviews due — weak: 争吵, 原谅, 摘—扁豆」.
- Every day the lesson still has:
  - his class lane, which never falls behind the class by the homework day;
  - all the revision that is due. Nothing due is pushed out to make room for the list.
- Through Thursday and Friday, every list card stays at the 90% retention FSRS targets.

### 1.1 What exists, and what changes the shape

| Existing | What it means here |
|---|---|
| **Worksheet importer** (`src/importer/clean.ts`, `parse.ts`, `save.ts`, `ImportPanel.tsx`) | It already parses this sheet's family. `PAGE_CODE` matches `P2-L41-…`, and `COPYRIGHT` drops 百力果, berries and Pte Ltd lines. 词语 and 复习 headings start a words section, 搭配 starts a pairs section, and split cells are rejoined. **Reuse it; don't write a second parser.** It has two gaps (§3.2): <br>• A theme sub-heading (食物, 夜市) becomes a *word*. <br>• A line of three pairs (`摘 扁豆 拔 萝卜 挖 花生`) is not read as pairs. |
| **`makeParentWords`** (`src/content/parseWordList.ts`) | A `Word` has **one** `listName`, so a word already on another list counts as a duplicate. It also "promotes" a built-in by giving it `listedAt`, which **puts it first in the new-word queue for good**. A weekly list must not do either. List membership needs its own record (§4). |
| **Ladder 词语** (`src/content/ladder.ts`: 街道, 排队, 离开…) | These are static and **never stored**. Their progress lives on `w:<text>:<kind>` cards. A parent word with the same text *shadows* the ladder word (`ladderWordsBesides`) and orphans his progress on it. So the list matches ladder words **by their `w:` id**; it never makes a copy. |
| **Word ladder** (`src/ladder/rungs.ts`) | The rungs are hear → understand → read → use, and each passes on **two different days**. A new word needs at least eight days to reach Use. The ladder can't measure readiness in a week, so the list has its own readiness (§8) and its own practice items (§6.4). |
| **搭配** (`src/content/dapei.ts`, `practice/pairs.ts` `dapeiQuestion`, `MatchQuestion.tsx`) and **PairGame `kind: 'match'`** | The question shape, the 都不对 variants (`noneOfThese.ts`) and a 搭配 board mode already exist. The board mode is unused today. **Reuse all of them.** Nouns from the same theme often go with each other's verbs (煮萝卜 and 炒花生 are both right), so a list board needs wrong pairings someone has confirmed (§7). |
| **Glossary** | `glossary.json` holds 8,171 entries and is trimmed to the app's scope. From the sample sheet: <br>• No English anywhere for 共用, 结出, 冰凉, 指着, 低下头, 扁豆, 番茄汤, 包菜, 碰碰车, 鸡翅, 圈圈. <br>• A kid gloss but no dictionary entry for 花生, 气球, 羽毛, 豆芽. <br>The parent fills in what is missing (§3.4). |
| **Readings** | 炸's card reads zhá (`READING_FIXES`), the sense the sheet uses (炸鸡翅). For a list character whose card reads differently from its 搭配, the 搭配 reading wins on the board (`halfReading`). The preview shows the difference. |
| **Planner** (`plan.ts`, `lanes.ts`, `pace.ts`) | `pickNewWords` already takes "listed" words first and then splits what is left between the school and catch-up lanes. The list plugs in there, with a daily quota (§5). |
| **Character-first lessons** (`FlashcardStep` intro card, `UseQuestion`, `meaningCue`, `src/content/sentences/*.json`) | The intro card already lays out multi-character text: `hanzi--long`, `--len`, `Label` with each syllable over its character, and a bound pair with one character marked. A list word card is therefore a reuse (§7.1). 选一选 (`fit`) is already a fill-the-blank question. Its decoys are sound-alikes or the bank's, so the list adds list-mate decoys (§7.3). The school sentence file (1,514 words, 一上–二下) is not yet a `meaningCue` source. It covers 21 of the sample's 30 grid items. |
| **Repo rule** (importer plan, Global Constraints) | Nothing from the Berries packs goes into the repo. The list stays on the iPad and travels in backups. **Test fixtures are written for the repo, never copied from the sheet** (§12). |

## 2. Decisions for the parent

**Approved (parent, 2026-10-17):** all 11 recommendations are accepted as written, with one amendment (§2.1). The spec is written to them.

1. **Front-loading pace.** How fast do the list's *new* words arrive?
   - **Recommendation:** at **pace + 2 a day, never above the ceiling** (`settings.newPerDay`, default 8). At his current pace of 4–5, that is 6–7 a day. The list finishes in `ceil(new ÷ that)` days, at most the days before ready-by.
     - Up to about 14 new words: 2 days.
     - Up to about 21: 3 days.
     - More than fits before ready-by: the parent is told which words won't be taught in time (§3.5).
   - **Why not "≤ 20 in 2 days":** that is 10 a day, above the ceiling of 8 the app paces under. The pace exists because he forgets words that come too fast (`pace.ts`, Burns et al.).
2. **When the list and the MOE words together exceed the pace.**
   - **Recommendation:**
     - On front-load days the list takes the new-word slots, plus 2 slots of headroom. Headroom applies only when yesterday's 练一练 didn't run out of time.
     - His **class (school) lane is protected over the week, not each day.** The unstarted characters of his class's lesson and the one before it are all started by the homework day.
     - The **catch-up lane yields.** It gets what is left and runs slower in list weeks.
     - A list word that is also a class word counts once (§5.3).
   - **Rejected:**
     - Repaying every borrowed slot later. A list arrives every week, so the debt would only grow.
     - Plain headroom all week. That raises his pace by stealth.
3. **Ready-by day and homework day.**
   - **Recommendation:** "homework due" defaults to the **coming Friday**, and "ready by" defaults to **two days earlier (Wednesday)**. Both can be edited in the parent area.
   - 考考自己 runs on the ready-by day.
   - When a list arrives late in the week, ready-by moves to at least the second day after it arrives and at most the day before homework is due (§3.3).
4. **Which 搭配 halves join the list as words.**
   - **Recommendation:** a half that is a word (扁豆, 萝卜, 摘, 拔) becomes a list item. An 「X的」 phrase (圆圆的, 甜甜的, 紫色的) is practised only on the 搭配 board and is never a word card. The sample sheet then has 30 grid items plus the pair halves that aren't on the grid.
5. **Where 考考自己 lives.**
   - **Recommendation:** a **separate step on Home on the ready-by day** of about 4–5 minutes, one question per item, after or instead of 「再学一课」. It is not inside 练一练, so that day's revision stays whole. He can stop and come back the same day.
6. **A new list before the old one's ready-by day.**
   - **Recommendation:** **both stay active**. The one ready soonest goes first, and a word on both counts once, for the earlier list. Home counts down to the nearest ready-by day.
   - **Alternative:** the new list replaces the old one, and the old list's unlearned words go back to the normal order.
7. **Words not ready by homework day.**
   - **Accepted:** for **7 more days** they stay at list priority, in the new-word queue and in the guaranteed practice of §2.1. Then they become ordinary words in normal SRS.
8. **Writing.**
   - **Recommendation:** new parent words from a list are **not writeable** (the importer defaults to writeable). The parent can tick them in Words. Built-in characters keep their own 写一写 schedule.
9. **Words without English.**
   - **Recommendation:** the preview asks for a short English gloss of up to four words, but it is optional.
   - A word without one is never asked a meaning question. It is checked through read, 选词填空 or 搭配.
10. **Extra lessons in a list week.**
    - **Recommendation:** extra lessons stay review-only (learning rules 2026-10-17), so no new list words. They may include list review items and quick checks.
11. **Confirming 选词填空 decoys.**
    - **Recommendation:** the preview shows each fill-in row with its proposed decoys. **All fine** confirms them in one tap, and a tap swaps one decoy.
    - Rows that aren't confirmed are not asked: the item falls back to read, meaning or 搭配. Confusable words (抓/捉/抢) are exactly the ones a machine can't be sure don't fit, so confirming is the only way to make the question safe.
    - **Alternative:** ask unconfirmed rows too, accepting that now and then a right answer is marked wrong. Not recommended.

### 2.1 Amendment (parent, 2026-10-17): unready words keep being practised

The parent's words: "Even if not fully understood by Wednesday the words should continue to be revised later into the week instead of dropping off."

After the ready-by check, list items fall into two groups.

**Not solid:** missed in the check, not yet asked, or not ready (§8.3). These are **actively practised every day** until they are ready, through homework day and for the 7 days after it (decision 7). Being first in the review order is not enough.

- **Re-teaching card.** The next lesson's 认新字 opens with the item's word or pair card again (§7.1, §7.2), marked 「再认一次」. It takes **no new-word slot**. There are at most 6 a lesson, missed in the check first. An item gets a re-teaching card on the day after each miss, never twice in a row without a miss in between.
- **A guaranteed slot in 练一练.** Every not-solid item gets **one list item in every lesson**, in the form it missed (§8.2), then rotating through the others (§7.6). These **reserved items** are planned before the boost share is sized and are never cut by it. They are capped at 8; when there are more than 8, the ones with the oldest last answer go first and the rest rotate the next day. They are interleaved with due revision. Due revision still comes first in the first-appearance order, and his reviews are counted into the round's fit as before (§5.1).
- An item becomes solid after a right answer on **two different days** after the check, with no miss since. Being right once could be luck, and two days matches the ladder's own pass rule.

**Solid:** the item passed the check and has no later miss. These get **light review** through Friday, as §6.3 describes: FSRS order with list cards first in the window, and no extra items.

When the list closes, 7 days after homework day, items still not solid become ordinary words.

## 3. The parent flow

### 3.1 Where

There is a new part in **Content**, 「本周词语 This week」, placed first. The others are Words, From a worksheet, Reading texts and Pictures.

- `ParentArea.tsx`:
  - `ContentPart` gains `'week'`.
  - `ParentPlace` gains `'week'`, which maps to `content`.
- **Today's Dashboard** shows each active list's readiness line (§8.3) with a shortcut to `week`.
- The tabs stay at five, as the parent decided on 2026-10-15.

### 3.2 Pasting and parsing

1. The parent photographs the sheet.
2. With iOS Live Text they copy the text and paste it into one box. The paste may be the whole page or just the tables.
3. **Read** runs the importer's `cleanLines` and then a list-specific pass, `parseWeekList` in `src/weeklist/parse.ts`.
4. The pass returns a draft:
   - items, each with text, where it came from (`grid`, `pair` or `both`) and flags;
   - pairs, each with left, right and theme group.

**Rules.** The first five reuse what already exists; the rest are new.

1. **Page furniture** goes, as the importer does it today: page codes (`P2-L41-高华`), copyright and brand lines, numbered or parent instructions (`请你…给家长听`), pinyin-only and Latin lines, and the title above the first heading (`考考自己`, `感官·思维·潜能`). The sheet's own title, if it has one, becomes the list's suggested name.
2. **Sections:**
   - `词语`, `复习` or `生字` starts the **grid**.
   - `搭配` (`词语搭配`) starts the **pairs**.
   - Any other section (sentences, passages, 成语) is ignored, with a note: "this page also has sentences; use From a worksheet for those".
3. **Grid cells.**
   - Tokens are split on spaces and table separators, and each token of 1–4 Han characters is an item.
   - Split cells are rejoined by the existing `joinTokens` (欺 负 → 欺负), and the parent can **Split** them again.
   - A single character stays a single character (套, 炸, 摸).
4. **Look-alike OCR errors** (告坼 → 告诉) get the existing `suggestFix` with `lookAlike`. The flag reads "not a word ZiJi knows — did you mean 告诉?".
5. **Duplicates within the paste** (炸 in the grid and in 炸—鸡翅) become one item with `from: 'both'`.
6. **Theme sub-headings (new).** In the pairs section, a line of **one token of 1–3 characters** is a group heading when the next line is pairs and the token is not itself a pair half anywhere on the page. It names the group (食物, 夜市) and is **never** an item. A lone token that doesn't fit this rule is shown as "unpaired" for the parent to pair or drop.
7. **Lines of several pairs (new).**
   - A pairs line with an **even** number of Han tokens is split into consecutive pairs, read left to right: `摘 扁豆 拔 萝卜 挖 花生` becomes three pairs.
   - An odd count marks the line for the parent to fix.
8. **Pairs read column by column (new).** When Live Text reads a 2-column table one cell per line, the pass pairs up consecutive single-token lines in the pairs section. The draft marks these "check the pairing", because a missed cell would shift every pair after it.
9. **Which half leads (new).** A pair's *left* is its verb or adjective.
   - A half ending in 的, a single character, or a verb that `DAPEI` knows is taken as the left.
   - Otherwise the order on the page is kept.
   - Each pair row has a ⇄ swap.
10. **「X的」 halves** (圆圆的) stay on the pair but are not items (decision 4).
11. **Length.**
    - A token of more than 4 characters is rejected, as `parseWordList` does.
    - A phrase of 3–4 characters that no dictionary knows (低下头, 亮晶晶) is kept as a parent word, flagged "phrase — check it".
12. **Traditional characters.** Live Text sometimes returns them (離開). A character that is in neither `BUILTIN`, `HSK_WORDS` nor the glossary is flagged "unknown character — traditional or misread?". The parent retypes it.
    - There is no conversion table. Adding one is out of scope (a dependency, and data the app doesn't have).
13. **Blocked and 儿化 words.**
    - A list item in `BLOCKED` is shown with its reason from `BLOCK_REASON`, such as 「儿化: his book says 一点」. The parent can keep it, since a school list is the parent's choice, or swap in the plain form.
    - Blocked words are never generated as decoys (§7.3, §7.4).

### 3.3 Dates

The draft has two date fields: **Homework due** and **Ready by**.

- **Homework due** defaults to the coming Friday. On a Saturday the coming Friday is six days away. On a Friday it is the following Friday.
- **Ready by** defaults to homework due − 2. It is clamped to at least the second day after the list arrives and at most homework due − 1.
- **Example:** a list added on Monday is ready by Wednesday, for a Friday homework.
- **Edge:**
  - A list added the day before homework (Thursday for Friday) is ready by homework day: new words today, the 考考自己 check on Friday before the homework. This is the one exception to "at most homework due − 1".
  - The preview says so plainly: "Only 1 day — he'll see the new words today and the check tomorrow."

### 3.4 Matching and filling in

Each item is matched in this order:

1. **A stored word with the same text:** a built-in character (`b:套`), a parent word, or a school 成语. The list item references its id. **Nothing about the word changes**: not its `listName`, `listedAt`, `writeable` or `paused`. If it is paused, the preview offers "unpause" and leaves it ticked by default.
2. **A ladder 词语** (`ladderWord('w:街道')`): referenced by its `w:` id, so his progress on it counts.
3. **Otherwise, a new parent word:**
   - its id is `p:<uuid>`;
   - `listName` is the list's name;
   - **no `listedAt`**, because the list's quota orders it (§5);
   - `writeable: false` (decision 8).

New words are filled in automatically:

- **Pinyin:** `readingOf(text)`. This is the word gate's single source, so a 组词 or 成语 already checked keeps its checked reading; otherwise pinyin-pro reads it in context. The parent can edit it.
- **English:** `kidGloss`, then `dictionaryGloss`. Where there is neither, the field is empty and the parent may type up to four words (decision 9). `glossProblems` checks it: no Chinese, no jargon.
- **Its status for the list,** worked out now and again at each plan (§5.2): **new**, **learning**, **known** or **placed**.

### 3.5 The preview and confirming it

The preview has four parts.

1. **Items.**
   - One chip per item: its text, pinyin, gloss (or empty), status (known, new…) and any flags.
   - Chips can be ticked, edited, joined or split, as in `ImportPanel`.
2. **Pairs.**
   - One row per pair, `摘 — 扁豆`, with ⇄ swap and an untick.
   - Under each row are its **wrong partners** (§7.4): three chips the app proposes, such as 「✗ 番茄汤 ✗ 气球 ✗ 碰碰车」. Tapping a chip says "that one is actually fine" and swaps in another wrong partner.
3. **Fill-in rows (选词填空):** one row per item that has a sentence (§7.3), with its blank and three proposed decoys from the list. A tap swaps a decoy. **Fine** confirms a row, and **All fine** confirms every row. An optional field lets the parent type a sentence for an item that has none.
4. **The plan, in one line:** "14 new · 14 he knows (quick check) · 4 to recheck. New words Mon–Tue (7 a day), check Wed, homework Fri. Class lane continues; catch-up pauses Mon–Tue."
   - When the words don't fit, it names them: "At 7 a day, 4 new words won't be taught before Wed: 争吵, 原谅, 羽毛, 低下头. They'll still be in the check." It offers **Move ready-by later** or **OK**.
5. **Add.**
   - Add writes the new words, the list record and any unpauses, in one transaction.
   - It then shows a summary.
   - It never touches cards (§6.1 does that at plan time).

Re-pasting the same sheet while its list is active **updates** that list: it adds what is missing and never duplicates. A list is the same list when the same text is pasted with the same dates.

## 4. Data model and migration

There is a new object store, **`weekLists`**, keyed by `id`. `DB_VERSION` goes from 5 to 6 (v5 is PR #35's log indexes and `restorePoints`), and the store is added to `LIST_STORES`, so backups include it with no other change.

```ts
/** A list from school or tuition to learn by a day (weekly list spec 2026-10-17). Its words stay ordinary words. */
export interface WeekList {
  id: string;                 // 'wl:<uuid>'
  name: string;               // the sheet's title or the parent's ("P2 高华 复习 1–19")
  createdAt: number;
  readyBy: string;            // local YYYY-MM-DD: the 考考自己 day; reviews are pinned to it (§6.2)
  homeworkDue: string;        // local YYYY-MM-DD: the light-review window runs to here (§6.3)
  items: WeekItem[];
  pairs: WeekPair[];
  fits: WeekFit[];             // confirmed 选词填空 rows (§7.3)
  check?: WeekCheck;          // the latest 考考自己 (§8)
  closedAt?: number;          // homework due + 7 days passed (decision 7), or the parent removed it
}

export interface WeekItem {
  wordId: string;             // 'b:套' | 'w:街道' | 'p:…' — never a copy
  text: string;               // as on the sheet (for the parent's view if the word is later deleted)
  from: 'grid' | 'pair' | 'both';
  addedStatus: 'new' | 'learning' | 'known' | 'placed'; // at Add, for the parent's summary; the planner recomputes
  last?: Partial<Record<WeekForm, WeekAnswer>>;         // his latest answer in each form since the list arrived (§8.3)
  rightDays?: string[];       // days with a right answer after the check (solid at 2, §2.1)
  missedOn?: string;          // the last day it was missed after the check (a re-teaching card the next day, §2.1)
}

export type WeekForm = 'read' | 'meaning' | 'fit' | 'dapei';
export interface WeekAnswer { at: number; correct: boolean }

export interface WeekPair {
  left: string;               // verb or adjective (摘, 圆圆的)
  right: string;              // object (扁豆)
  group?: string;             // theme heading (食物)
  wrong: [string, string, string]; // confirmed wrong partners (§7.4)
  reading?: string;           // left+right pinyin, readingOf at Add, parent-editable
}

export interface WeekFit {
  wordId: string;
  sentence: string;           // with ＿ once, where the word goes
  source: 'class' | 'school' | 'bank' | 'parent';
  wrong: [string, string, string]; // list-mates the parent confirmed
}

export interface WeekCheck {
  at: number;                 // started
  results: Record<string, { form: 'read' | 'meaning' | 'fit' | 'dapei'; correct: boolean }>; // one per item, by wordId; a pair asked from a non-item half by `${left}|${right}`
  done: boolean;
}
```

Other changes:

- **`Settings` gains nothing.** List settings belong to the list.
- **`SessionPlan` gains:**
  - `listNewIds?: string[]`: today's new words taken for a list (a subset of `newWordIds`);
  - `listIds?: string[]`: list words in today's 练一练 boost (§6.4);
  - `newWordLanes` may now say `'list'`, which the 认新字 tag reads as 「本周」.
- **Repo:** `allWeekLists`, `activeWeekLists(now)`, `putWeekList` and `deleteWeekList`.
- **Migration:**
  - The v5 → v6 upgrade only creates the empty store.
  - There is nothing to move: lists made earlier through From a worksheet stay as they are and are not weekly lists.

**Deleting a word in Words** leaves its list items, which then show as "removed". The planner skips them.

**Deleting a list** keeps its words and all progress, and says so in the confirm dialog.

## 5. Planner: three parts in one lesson

Each day's lesson keeps all three parts:

1. **List words**, front-loaded;
2. **MOE class words**, in the school lane plus the catch-up lane;
3. **Revision**, which is never squeezed out.

### 5.1 The 15-minute budget

Today a lesson runs as follows:

| Step | Time |
|---|---|
| 认新字 (new words) | about 25–30 s per new word |
| 练一练 | `PRACTICE_SHARE` = 1/3, about 5 min, holding today's new words and all due revision |
| 写一写 | `writeCharTarget(15)` characters |
| 朗读 | about 3 min |

**On a front-load day** (a day with list new words):

- **认新字** takes the list's quota plus whatever is left for MOE (§5.2): 6–8 words, about 3–4 min.
- **练一练's time box grows by 2 minutes**, to about 7. **写一写 takes half its usual characters** for that day, which pays for it. Writing is not this week's goal, and its due cards keep their place: half the characters means the most-due ones first.
- **认新字 opens with the list:** list words come first, as word cards (§7.1), then the MOE characters.
- **Inside 练一练, everything is interleaved** by `buildRound` (§7.6): today's new words, due revision (quick checks are due revision, §6.1) and list boost items (§6.4) take turns. In the first-appearance order, due revision still comes before the boost items, and the boost share is sized to fit the box. So time running out cuts boost items, not revision.
- **The lesson is still about 15 minutes.** 朗读 is unchanged.

**On other days** the lesson is exactly today's.

**"Revision is never squeezed out"** is enforced by three rules:

1. In 练一练, due revision comes before every list boost item in the first-appearance order, and the boost share is sized to fit (§7.6).
2. If yesterday's 练一练 ran out with items left (`ranOut`), today's list quota gets **no headroom**.
3. If the last two rounds ran out, the list's remaining new words **spill one day later**: still before ready-by if possible, otherwise taught after the check. The existing pace logic also lowers the pace on two run-outs (`nextPace`).

The backlog pause stays as it is: more than 40 due cards that he has practised pause all new words. During a pause:

- list new words still come, at most `PACE_MIN` (3) a day;
- MOE new words wait.

The deadline is real, but so is the backlog.

### 5.2 Today's numbers

`listQuota` lives in `src/weeklist/plan.ts`.

- **P** = today's pace (`todaysPace`, 3–8, at most `newPerDay`).
- **H** = 2 if yesterday's round didn't run out and he is not in a backlog pause, else 0.
- **front days** = the days from the list's arrival to ready-by − 1, at most `ceil(totalNew ÷ min(P + H, newPerDay))`. Decision 1 sets the rate.
- **remaining** = list words with status **new**, not yet begun.
- **list today** = `min(remaining, P + H − schoolFloor)`. There is no spreading: front-loading wants the words as early as the rate allows (ruling at plan time, 2026-10-17).
  - `schoolFloor` is 0 on a front-load day.
  - It is `min(P, schoolNeed ÷ schoolDaysLeft)` once the class lane must catch up before homework due (§5.3).
- **MOE today** = `P − list today`, or `P + H − list today` (at least 0) on a front-load day. `pickNewWords` splits this between the school and catch-up lanes as it does now, but the **school lane is filled first** while `schoolNeed > 0`.

The status of each list word, recomputed every plan:

| Status | When | What it means |
|---|---|---|
| **new** | No reading card, or sent back by a missed placement recheck | Takes a slot |
| **learning** | A reading card in Learning or Relearning, or not yet passed | No slot; its due cards are pinned (§6.2) |
| **known** | A reading card in Review, not `placed` | A quick check (§6.1), no slot |
| **placed** | A reading card with `placed: true` | Its first recheck *is* its quick check. It doesn't count toward `PLACEMENT_CHECKS_PER_LESSON`'s 10. A miss sends it back (`sentBack`), and it becomes **new** for the list from tomorrow |

### 5.3 The class lane and the catch-up lane

- **schoolNeed** is the unstarted words of his class lesson and the one before it (`classLessonAt`, `bookLesson`, as `pickNewWords`' school pool). It is **recounted at every plan** (fix round 2026-10-17), so a class that moves on a lesson mid-week is followed, and the day's school share spreads what is still unstarted over the days left to homework.
- **Counted once:**
  - A list word whose `bookLesson` is in the school window is taken from the list quota but **tagged `'school'`** in `newWordLanes`. It lowers `schoolNeed` too.
  - A list word in the catch-up range counts as list only. Either way it takes one slot.
- **The school lane is protected over the week.** After the front-load days, the school lane goes first each day until `schoolNeed` is 0. When the days after the check at his pace can't start it all, the shortfall moves onto the front-load days: first the room under the ceiling, then the list, but only as far as the list still finishes before ready-by. Leftover list words after ready-by also wait behind the class lane until homework day.
  - **This is best effort at his pace, never above the ceiling.** A short week (a Thursday list) or a class lane two lessons behind can leave words unstarted on homework day. `listBudget` reports that number as `classShort`, and the parent's readiness line shows it ("class: 2 left by Fri", §8.3).
- **The catch-up lane yields.** It gets what is left. In a list week it runs about one list's worth of new words slower.
  - The parent's line says "catch-up slower this week", not "behind": this is his early-term gap, not his class.
- **No class lesson known** (`classAt === null`): there is no school lane, so MOE is all catch-up and simply yields.

### 5.4 An example week

Suppose a 32-item list arrives on **Monday**, with homework due on **Friday**, so it is ready by **Wednesday**. Of the items, 14 are new, 14 known and 4 placed. His pace is P = 5, his ceiling is 8 and H = 2, so the list goes at 7 a day and the 14 new words take two days. His class lane needs 8 unstarted characters (`schoolNeed` = 8). Normally he has about 15–20 due cards a day.

The figures below are illustrative. Due counts depend on FSRS.

| Day | List new | MOE new (school + catch-up) | List quick checks | Due revision (est.) | 考考自己 | 练一练 / 写一写 |
|---|---|---|---|---|---|---|
| Mon | 7 | 0 + 0 | 9 (5 known, 4 placed rechecks) | ~16 | — | 7 min / half |
| Tue | 7 | 0 + 0 | 9 known | ~22 (Mon's 7 back) | — | 7 min / half |
| **Wed (ready by)** | 0 | 3 + 2 | — | ~15. The list's due cards are graded by the check, not 练一练 (§8.1) | **32 questions, one per item, about 4 min** | 5 min / normal |
| Thu | 0 | 3 + 2 | — | ~18, including the check's misses (§8.2) and light list review | — | normal |
| Fri (homework due) | 0 | 2 + 3 | — | ~16, including light list review | — | normal |
| Sat | 0 | 0 + 5 | — | ~14 | — | normal |
| Sun | 0 | 0 + 5 | — | ~14 | — | normal |

**Over the week:**

| | New words |
|---|---|
| List | 14 |
| School lane | 8 (all of `schoolNeed`, by Friday) |
| Catch-up lane | 17, instead of the 35 of a normal week (5 × 7) |
| **Total** | **39**, against 35 at a flat 5 a day: the 4 headroom slots, on two days only |

Due revision was due every day and was taken every day.

## 6. Scheduling around the deadline

### 6.1 Quick checks for words he knows

A **known** list word gets its `recognise` card **brought forward** (`bringForward`) to a front-load day, spread evenly across them: Monday or Tuesday in the example. It then comes up as an ordinary due review. That is one read question and one graded answer.

- A word whose card is already due before ready-by is left alone.
- **Placed** words: their recheck is brought forward the same way (§5.2).
- A miss rates Again, as any review does, and the word then follows the pin rule (§6.2).

### 6.2 Pinned before ready-by

Applied in `reviewCard` (`src/session/record.ts`) through one pure helper, `pinDue(card, lists, now)` in `src/weeklist/schedule.ts`:

- **Which cards:** a list word's `recognise`, `hear`, `understand` and `meaning` cards. Not `write`, `say` or `sentence`.
- **The rule:** when a review **before the ready-by day** gives a due date later than ready-by, the due date is set to the **start of the ready-by day**. That date is never before tomorrow.
- **What stays the same:** stability, difficulty and the state are unchanged. FSRS handles an earlier review on its own terms: a shorter elapsed time gives a smaller stability gain, so nothing is lost.
- **Rating an early review (fix round 2026-10-17).** A right, unhurried answer on a list word's card that is in Review and was asked before FSRS scheduled it (pinned here, or a quick check, §6.1) rates **Good**, not the usual Hard for a word not yet produced. Being asked early isn't his doing, and Hard would raise the card's difficulty for nothing. A slow answer is still Hard, and a miss is still Again.
- **The effect:** every list card is reviewed on the ready-by day, by the check.

### 6.3 Ready-by to homework due: light review, high retention

FSRS sets a due date for when recall drops to the target, 0.9. So a list card whose due date falls **after** homework day is at 90% or better through Thursday and Friday without doing anything.

The only thing to guarantee is that **list cards due between ready-by and homework due are taken on time**:

- In `buildSessionPlan`, due list cards in that window are **sorted first** among due cards, so `REVIEW_CAP` (60) and the other caps can never leave them out.
- The check's misses are due the next day (§8.2). They come back on Thursday and keep getting re-teaching cards and reserved items daily until solid (§2.1).
- For items that passed, that is the "light list review". **No pin after ready-by:** pinning again would cost reviews without raising the 0.9 floor.
- **Extra lessons** (`extraCards`) must not pull a list card due on ready-by into the day before. That would mass it before the check. List cards are left out of the "due tomorrow" pull on ready-by − 1.

### 6.4 List boost items

The ladder can't get a fresh word to Use in time (§1.1), so for each list word **begun but not yet ready** (§8.3), 练一练 adds **one boost item** a lesson. The boost follows the word's weakest list skill:

1. **read**, while its last reading answer was wrong or it has none: the existing `read` ask;
2. **meaning**, if it has English: the existing `meaningRead`;
3. **选词填空**, if it has a confirmed fill-in row (§7.3): `fit`, through `UseQuestion`;
4. **搭配**, if it is a pair half: `match` (§7.5).

The items are interleaved in the round, not run as a block (§7.6).

Limits and grading:

- At most 6 boost items, or one third of the round, whichever is smaller. They stay behind due revision in the round's first-appearance order (§5.1, §7.6).
- A boost item grades its card **only when it is that card's first answer of the day**, the existing rule.
- New list words **begin on Read**: `beginNewWord(…, 'read')`, not Hear. Reading is the list's first goal. Hear and Understand open as they do now.

## 7. Question types and lesson format

ZiJi's questions are built around a single character today. The 认新字 card shows one character with its 组词, and the ladder climbs from 字 to 词语. A weekly list is different. It is mostly:

- multi-character words (整齐, 热闹), including ABB words (亮晶晶) and phrases (低下头);
- action verbs that only make sense with an object (煮, 抢, 套);
- 搭配.

So the list gets word-first versions of four question forms. Each one is built on a component that already exists.

| Form | Built on | What is new |
|---|---|---|
| 认新词 word card | The `FlashcardStep` intro card: its `hanzi--long` branch, `Label` with one syllable over each character, and the bound-character pair branch | An example sentence row, the new character marked, and a pair-led card for action verbs (§7.1, §7.2) |
| 选词填空 | `UseQuestion` with a `fit` `UseItem` (选一选), `meaningCue`, and `missNote`'s `cuePickNote` | Sentences for list words, and decoys drawn from the same list (§7.3) |
| 搭配 | `MatchQuestion`, `dapeiQuestion`, `PairGame` `kind: 'match'` and `withNoneOfThese` | Wrong partners the parent confirms, and boards of list pairs (§7.4, §7.5) |
| Read, meaning | The `read` and `meaningRead` asks | Nothing |

`BuildSentence` (组句) and `用对了吗` (`usageItem`) are left out of the list's own items. They need hand-written tiles or a misuse sentence that a list word won't have. Where a bank word does have them, they still come through the normal ladder.

### 7.1 The 认新词 word card

On a front-load day, 认新字 shows the new list words first, as **word cards**. MOE characters follow on today's character cards. The step's title becomes 「认新词」 when the first card is a word.

What the card already does:

- A text of more than one character takes the `long` branch: `hanzi--xl hanzi--long`, sized by `--len`, so 3 and 4 characters fit on one line.
- `Label zh={text} py={pinyin}` puts each syllable over its own character (parent 2026-10-15).
- `cardMeaning` shows a parent word's own `meaning`.
- The components row is skipped for 3–4 characters.

What a list word card adds:

1. **Pinyin over each character, always.** No delayed pinyin and no fading on its first day. It uses the list word's pinyin, which comes from `readingOf` or the parent's edit, so 亮晶晶 reads `liàng jīng jīng` and 低下头 reads `dī xià tóu`.
2. **Its meaning:** the kid gloss, the dictionary gloss or the parent's English. It is left out when there is none, as the card already does.
3. **One short example sentence**, under the meaning, with the word highlighted through `Label`'s `mark`. The sentence comes from the first of these that has one:
   - his class sentence (`word.sentences`);
   - the school sentence file (`sentencesFor`, `src/content/sentences/*.json`);
   - the sentence bank's first gap, filled;
   - a 成语's sentence.

   It must be at most `MAX_SENTENCE_CUE` (30) characters. When there is none, the 组词 line shows as it does now, or nothing.
4. **The new character marked.** When exactly one character of the word has not been begun, it is marked in orange through `mark`, the same single mark the bound-character card uses (parent 2026-10-16). With two or more unbegun characters, the first is marked. When all are begun, nothing is marked.
5. **Speaking:**
   - `SpeakButton` says the whole word at its list reading.
   - The example sentence has its own speak button.

Multi-character text inside a `Label` with `mark` is already used by the bound card, so the layout is a reuse. It is still checked at all six sizes and in WebKit.

### 7.2 Action verbs taught through their pairs

A single-character list item that is the left half of a list pair leads with that pair everywhere the list teaches it: 煮 → 煮番茄汤, 套 → 套圈圈. It leads on:

- its 认新词 card;
- its boost items' prompts;
- its spoken form.

How this is done:

- `boundPair(char)` generalises to `leadPair(word, lists)`. The first answer that applies is used:
  1. the kid-gloss bound pair;
  2. the active list's pair for this verb, the first on the page;
  3. none.
- The card takes the existing bound branch:
  - the pair at `--len`, with the character marked;
  - the pair's reading from `WeekPair.reading`, so 炸 in 炸鸡翅 is zhá;
  - its meaning from the pair's glosses, such as "fry chicken wings".
- **Audio:** `loneSpoken` (`speech.ts`) already says a bound character as its pair. It does the same for a list verb while its list is active. When the reading differs from the card's, it uses the pair's.
- **写一写 is unchanged.** It still asks for the character on its own, as it does for bound characters.
- **After the list closes,** the card goes back to its normal character form.

A list verb with no list pair (抢 or 捉 in the grid only) keeps its character card. Its example sentence (§7.1) carries the use.

### 7.3 选词填空 (fill the blank from the list)

This is the most common homework format. It is the 选一选 `fit` question in `UseQuestion`, with a sentence that has a blank and four choices, but every choice is **another word on the same list**:

> 「小朋友们排好队，站得很＿＿。」 整齐 / 热闹 / 冰凉 / 原谅

The form suits confusable words (抓/捉/抢, 原谅/爱护) because the other choices are real words he is learning that week. Elimination by "that one isn't on my list" can't work.

**Sentences.** The app never writes a sentence at run time: it has no language model. Each item's sentence comes from content that is already written and checked, in this order:

1. His class sentence (`word.sentences`), when the importer brought one in.
2. A sentence-bank gap (`bankFor`), whose sentences already pass the content checks.
3. The school sentence file (`sentencesFor`): 1,514 words of 一上 to 二下, written for the app, two sentences each. These are not used by `meaningCue` today. For the sample sheet they cover 21 of the 30 grid items.
4. **A sentence the parent types** in the preview. It is optional, one per item.

A word with none of these gets no 选词填空. It is asked as read, meaning or 搭配 instead.

**New content work.** When a list word has a common 一上–二下 word that is missing from the school sentence file, add sentences for it to that file in the normal content pass. They must be written for the app, natural Singapore Mandarin, and pass `sentenceProblems` (`understand.ts`). That check covers:

- only characters he is allowed (`allowedChars`);
- the word exactly once;
- no blocked word;
- no 儿化 (the `ERHUA` gate);
- the length limit.

The words are never copied from class material.

**Checking a sentence the parent types.** It runs a runtime copy of the same checks:

- the word once;
- 6–30 characters;
- no `BLOCKED` or `ERHUA` word;
- no English or pinyin.

Characters he doesn't know yet are allowed, because the sentence is school material, but the preview flags them.

**Decoys** are proposed by `listFitItem(word, list, sentence)` in `src/weeklist/fit.ts`. They are drawn only from **the same list's items**. A candidate is **rejected** when any of these holds:

- it is the answer, or contains the answer, or the answer contains it (抓 against 抓住);
- **it also fits the blank:**
  - the filled sentence is a sentence in any content (class, bank or school file) or a class sentence;
  - it makes a word across the blank's edges (the last character before the blank + the decoy, or the decoy + the first character after) that the answer doesn't make;
  - for a verb blank, it is a verb of the same family (§7.4);
- its kind differs from the answer's (verb, adjective or noun). The kind comes from the bank's `type` when there is one; otherwise it is guessed:
  - a left pair half or a `DAPEI` verb: verb;
  - ABB, 「X的」 or an HSK adjective: adjective;
  - a right pair half: noun;
  - otherwise unknown, which matches any kind;
- it is a different length from the answer, when same-length candidates exist. A two-character blank with one-character choices gives the answer away;
- it is `BLOCKED`.

**Confusables** come first: candidates that share a character, a radical (扌 for 抓, 捉 and 抢) or a gloss word with the answer. Confusables are also the most likely to fit the blank, so **every proposed decoy is shown in the preview for the parent to confirm**. The row looks like 「排好队，站得很＿＿ — 整齐 · ✗ 热闹 ✗ 冰凉 ✗ 原谅」. A tap swaps a decoy, and **Fine** confirms the row; one tap confirms all rows (decision 11).

An item is asked only after its row is confirmed. That is the guess-proofing guarantee: a right answer is never marked wrong. Rows that aren't confirmed fall back to the other forms.

**The question rules** are the existing ones:

- four distinct choices;
- the answer once;
- no choice that is already printed in the sentence;
- choices shuffled;
- 都不对 (`withNoneOfThese`) at the usual share in lessons, never in the check;
- the 「✓ 正确答案 / ✗ 你选的」 miss sheet (#31) through `cuePickNote`, with each word's gloss as the why-line.

### 7.4 搭配: wrong partners, proposed by the app and confirmed by the parent

Within one theme, a cross pair is often *right* (煮萝卜, 炒花生, 烤鸡翅, 圆圆的气球), and a board must never mark a right answer wrong. So each list pair keeps **three wrong partners** in `DAPEI`'s shape. That makes it the parent's version of what the built-in pairs have.

**Proposing** (`proposeWrong` in `src/weeklist/dapei.ts`). The candidates are the list's other pair objects (right halves). A candidate is **skipped** when any of these holds:

- left + candidate is another pair on this list (炸 is in the grid and pairs with 鸡翅);
- it is in `DAPEI`, or is an `HSK_WORDS` or glossary word (炒饭);
- it is the same kind of object. This uses a small hand-written **verb family** table in the same file:
  - 煮 炒 炸 烤 蒸 → cook
  - 摘 拔 挖 采 → harvest
  - 玩 套 射 → play at
  An object paired with one verb of a family is assumed to fit every verb in it (煮 → 鸡翅 is skipped because 炸 → 鸡翅).
- for an 「X的」 left, the noun is skipped only by the parent. Adjective wrongs are always confirmed by eye.

The candidates are ranked to prefer objects from **another theme group** (摘 → 番茄汤 before 摘 → 豆芽), then by stable order. When fewer than three remain, the gap is filled from `DAPEI` nouns that are not on the board, such as 鞋 or 歌. These are surely wrong but less tempting.

**Confirming:** the preview shows the three wrong partners (§3.5). A tap swaps one out. Nothing is asked when the parent is happy.

**Never generated:** no decoy comes from outside the list's own objects and `DAPEI`, so the word gate holds. Blocked words never appear.

### 7.5 搭配: two question forms, both existing

1. **Which goes with it?** This is `MatchQuestion` as it is today. `dapeiQuestion(word)` gains list pairs: for a list word that is a pair's left half, ask that pair with its confirmed wrongs as options.
   - 都不对 (`withNoneOfThese`) applies unchanged.
   - `saysVerbAsCard` applies to list pairs too. When it fails, the pair is still asked, but **the pair's own reading** (`WeekPair.reading`) is what Truffle says.
2. **连一连 board.** This is `PairGame` with `kind: 'match'`, now used for the first time.
   - A board holds 3 or 4 list pairs (`pairs--eight` styling exists for more than 3 rows).
   - Pairs go on the same board only when **every cross pair is a confirmed wrong** of one of them, which is `board()`'s `fits` check with `fits = !confirmedWrong`.
   - With 14 pairs and 42 confirmed wrongs, boards of 3 come easily. When no board can be made, the pairs are asked one at a time as form 1.
   - **Guess-proof:** every pair is graded (an existing PairGame rule), so a lucky last pair can't pass the board. A `match` board has no decoy tiles today. It gains **one decoy object**, a confirmed wrong for every left on the board, through `withDecoys`' rule. So the last pair can't be had by elimination either.

**Feedback** is the existing kind:

- PairGame's summary shows every pair, with pinyin and gloss, and marks the missed ones.
- MatchQuestion says the pair aloud.
- The miss sheet (#31) shows 「✓ 摘扁豆 / ✗ 摘番茄汤」 and a why-line. For a list pair the why-line comes from the glosses ("pick → beans", or "番茄汤 is soup — you cook it, not pick it" when the parent has written one; otherwise the two glosses side by side).
- 「X的」 lines read as one phrase: 「圆圆的包菜」.

Board and match answers grade the left word's `meaning` card (`recordUse`, source `'use'`), as 搭配 does now. They also feed the list's 搭配 readiness (§8).

### 7.6 How a lesson is made up

- **Front-load days open with the list.** 认新字 (认新词) shows today's list words first as word or pair cards (§7.1, §7.2), then today's MOE characters. Words that are both list and class words (§5.3) appear once, as list words, with the 「本周」 tag.
- **练一练 interleaves.** List items don't run as a block. They enter `buildRound` as `RoundWord`s, which already alternates new words and revision. They interleave with today's new MOE words and with due revision, because mixed practice keeps better than blocks of one kind (interleaving; Rohrer & Taylor 2007). Each list word's boost item (§6.4) chooses among the forms, weakest skill first:
  1. read;
  2. meaning;
  3. 选词填空;
  4. 搭配.

  A 连一连 board of list pairs counts as one item.
- **Revision still comes first.** `buildRound` already starts due revision before words that are only starting meaning practice. List boost words are placed in that second group, so they are interleaved but behind the due items in the first-appearance order. The round's list share is **sized to fit**: at most 6 items, or one third of the round, and no more than the box holds at his median item time. If it still runs out, §5.1's rule removes the next day's headroom.

## 8. 考考自己, readiness and misses

### 8.1 The check on the ready-by day

- **Where (decision 5):** a card on Home, 「考考自己 · 本周词语」, appears on the ready-by day. It sits beside the lesson's path and has its own start. The day's lesson still runs.
- **What it asks:** **one question per list item**, in mixed forms. The form is the item's hardest one available:
  1. **搭配**, for a pair half. Each pair is asked once, from its left half when that is an item, otherwise from its noun. Pairs go on a 连一连 board of 3–4 when they can (§7.5): one board counts as its items' questions.
  2. **选词填空**, when it has a confirmed row (§7.3).
  3. **Meaning** (`meaningRead`), when it has English.
  4. **Read** (`read`).

  The forms are rotated, so that on a sheet like the sample about a third of the questions are 搭配, a third are 选词填空 and a third are meaning or read. That makes about 32 questions, roughly 4 minutes.
- **Every form also tests reading.** No question shows pinyin: `Label` is called without pinyin, so there is no peek. Truffle doesn't say the word or the choices before he answers. So a right answer of any form means he read it.
- **No hints and no teaching mid-check:**
  - no 都不对;
  - no retries;
  - no peeks;
  - no "show the match after three misses" on boards (PairGame's `SHOW_AFTER` is off in check mode);
  - no miss sheet during the check.

  A miss is shown only at the end, on one summary sheet: each missed item with its right answer, pinyin and gloss, reusing the PairGame summary rows and `missNote`'s two-row form.
- **Order:** the weakest first (by status and last answers), so that if he stops early, what is left is the surest.
- **Grading:**
  - The first answer of the day grades the card, so these are the reviews §6.2 pinned.
  - 练一练 that day **leaves out list words' due cards**, which the check grades instead. If he never opens the check, those cards stay due.
- **No 都不对** and no retries in the check: it measures.
- A miss shows the miss sheet. The question does not come back in the check.
- **Rewards follow mastery, not completion** (learning rules #34, Deci, Koestner & Ryan 1999). One `bonusStars` star goes to each item that is right in the check and was not ready before it. Finishing the check earns nothing by itself and does not move the river meter.
- **Saving:** results go to `WeekList.check` as each answer is given, so stopping and resuming works.

### 8.2 Misses come back

- A missed read or meaning question rates Again (the existing rule), so FSRS puts its card in relearning, due within the day.
- `bringForward` makes it **due at the start of tomorrow**, so the Thursday lesson takes it among the first due cards (§6.3).
- A missed 搭配 or 选词填空 brings the word's `meaning` card forward the same way.
- Tomorrow that item's boost asks **the same form** first, with a different sentence or board when one exists.
- **Every lesson after the check** gives each not-solid item a re-teaching card the day after a miss and a reserved 练一练 item, until it is solid or the list closes (§2.1).
- **On homework day** (Friday), Home also shows a 1-minute optional card, 「再看一次」, holding only the check's misses that are still not right. It is ungraded.

### 8.3 Readiness

**After the check**, an item is **ready** when its check question was right and no later answer to it was wrong. **This is the readiness score.**

**Before the check**, the line estimates readiness from the lessons. An item counts as ready when its latest answers since the list arrived were right:

- read, always;
- meaning, if it has English;
- 选词填空, if it has a confirmed row;
- 搭配, if it is a pair half.

A pair is ready when its last answer was right.

The parent's line, on Dashboard and at the top of 本周词语:

> **P2 高华 复习** · ready by Wed 21 Oct · homework Fri 23 Oct
> List 28/32 ready · class on track · 14 reviews due — weak: 争吵, 原谅, 摘—扁豆

| Field | What it shows |
|---|---|
| List x/y | Items ready, out of the list's items. Pairs are counted in the weak list but not in y. |
| Class on track | `schoolNeed` will reach 0 by homework due at today's numbers. Otherwise "class: 3 left by Fri". In a list week a fourth part is added: "catch-up slower this week". |
| Reviews due | Due cards today (all kinds he answers), as the planner counts them. |
| Weak | Up to five, the list's not-ready items and pairs, worst first. |

After the check, a small table lists each item with the form it was asked in and ✓ or ✗.

## 9. Home countdown

The child sees one line on Home, under the reward card, with pinyin through `Label`:

| When | Line |
|---|---|
| Before ready-by | 「星期三前：还有 N 个词」. The weekday is the ready-by day's (星期一 … 星期天), and N is the items not yet ready. |
| On ready-by | 「今天考考自己！」, with the check card (§8.1). |
| Ready-by to homework due | 「本周词语：N 个都会了！」 when all are ready, else 「还要再看 N 个词」. |
| After homework due | No line. |
| Two lists | The nearest ready-by day. One line only. |

- The line is never red and never counts down in hours. It is a gentle nudge, as the rest of Home is.
- The class lane is **not** shown to him on Home. He sees the split on the 认新字 card tags instead: 「本周」 for list words, beside the existing 「课本 二上·12」 and 「补 一上·5」.
- **Layout:**
  - It must fit the one-screen Home at all six sizes (`npm run fit`, 0 problems).
  - It must be checked in **WebKit** (playwright-core 1.52), not only Chromium, because the iPad runs Safari.

## 10. More than one list, and a new list early

Decision 6:

- **Lists are independent.** Each has its own dates, items and check.
- **Planner:** active lists are ordered by ready-by. Each list's quota is worked out in that order, from the same `P + H`. A word on two lists belongs to the earlier one until that list's ready-by, then to the later one.
- **Pins:** a card is pinned to the **earliest** ready-by among its lists.
- **Re-pasting** the same sheet updates its list (§3.5). A different sheet makes a new list.
- **Closing:** a list closes 7 days after homework due (decision 7), or when the parent removes it. A closed list is kept, read-only, with its check, under "Past lists" in 本周词语. Its words keep all progress.

## 11. Backup and restore

- **Export:** `weekLists` joins `LIST_STORES`, so backups carry it.
- **Restoring a backup made before v6** (no `weekLists`): `applyBackup` keeps stores that are absent from the file. That would leave today's lists pointing at word ids the restored `words` store may not have. So **`weekLists` is cleared** when the backup has none, and the parent sees "Weekly lists weren't in this backup". `restoreWithUndo` (PR #35) exports `LIST_STORES` before it restores, so undoing a restore brings the lists back.
- **Restoring a backup from a newer app** into an older one: `readBackup` refuses unknown stores with "not a ZiJi backup". Change it to say "made by a newer version — update the app" when `dbVersion > DB_VERSION`, the same message the raw dump already gives.
- **Raw dump:** covers the store with no change.
- **Privacy:** the lists hold class material. They stay on the iPad and in the parent's backups, never in the repo or the public site (importer plan, Global Constraints).

## 12. Testing

**Fixtures are written for this repo** to look like Live Text output. Each is shaped like the sample sheet:

- a page code;
- a 词语 grid read row-wise and column-wise;
- a 搭配 section with two theme sub-headings;
- three pairs per line;
- 「X的」 halves;
- a copyright line.

The fixtures use **other words**. Nothing is copied from the Berries sheet.

| Area | Tests |
|---|---|
| **Parse** (`src/weeklist/parse.test.ts`) | • Furniture dropped. <br>• Grid items, with rejoined cells and Split. <br>• Theme headings are never items. <br>• Multi-pair lines split; an odd count is flagged. <br>• Column-wise pairs paired and flagged. <br>• Left/right by 的, single character or `DAPEI` verb. <br>• Grid/pair duplicates merged as `both`. <br>• Phrases up to 4 characters kept and flagged; longer ones rejected. <br>• Unknown or traditional characters flagged. <br>• Blocked and 儿化 shown with their reason. <br>• Other sections noted. |
| **Match** (`match.test.ts`) | • Built-in by `b:` id, unchanged (`listName` and `listedAt` untouched). <br>• Ladder word by `w:` id, keeping its cards. <br>• Existing parent word reused. <br>• New parent word: `readingOf` pinyin, `kidGloss` → dictionary English, `writeable: false`, no `listedAt`. <br>• Paused word offered unpause. <br>• Re-paste updates the list and never duplicates. |
| **Dates** | • Defaults: Fri homework, Wed ready-by. <br>• Late-week clamps; Saturday and Friday arrivals. <br>• Thursday arrival: ready-by = homework day (Friday check). |
| **Planner** (`src/weeklist/plan.test.ts`, plus `lanes.test.ts` and `plan.test.ts` additions) | • Quota = `P + H` on front-load days, spread. <br>• No headroom after a run-out; spill after two run-outs. <br>• Backlog pause: list at most 3, MOE 0. <br>• School lane goes first after the front-load days and reaches `schoolNeed` by homework due. <br>• Catch-up yields. <br>• A list word in the school window counts once, tagged `'school'`. <br>• Known word is brought forward, not a slot. <br>• A placed recheck is outside the 10-per-lesson cap; a miss turns the word new. <br>• Two lists in ready-by order; a shared word counted once. <br>• A **simulation** of the §5.4 week (`lanes.sim.test.ts` style): every day's due revision is fully planned, and list + MOE totals match the table's shape. |
| **Schedule** (`schedule.test.ts`) | • `pinDue` caps only list read, hear, understand and meaning cards, before ready-by, never earlier than tomorrow, and leaves stability unchanged. <br>• No pin after ready-by. <br>• Due list cards in the window come first under `REVIEW_CAP`. <br>• `extraCards` doesn't pull list cards into ready-by − 1. |
| **搭配** (`dapei.test.ts`, `pairs.test.ts` additions) | • `proposeWrong` skips same-list pairs, `DAPEI` and HSK words, and same-family objects; prefers other groups; fills from `DAPEI` nouns. <br>• A board is made only when every cross pair is a confirmed wrong. <br>• The decoy pairs with nothing. <br>• Every pair graded. <br>• 都不对 variants. <br>• The pair's reading is spoken when it differs from the card. |
| **Word card and fill-in** (`wordCard.test.tsx`, `fit.test.ts`) | • 3- and 4-character list words on one line with pinyin over each character (亮晶晶-shaped, 低下头-shaped, using fixture words). <br>• Example sentence order: class, school file, bank. <br>• One new character marked. <br>• A list verb leads with its pair and says it at the pair's reading; after the list closes it goes back to the character card. <br>• `listFitItem` decoys only from the list, same kind, same length, never the answer or a fit across the blank's edge, never blocked, confusables first. <br>• Only confirmed rows are asked. <br>• Parent sentence checks: word once, length, `BLOCKED`, `ERHUA`. <br>• Miss sheet with glosses. |
| **Check** (`CheckScreen.test.tsx`) | • Asks every item once, in mixed forms (搭配, 选词填空, meaning, read), with each pair asked once, weakest first. <br>• No pinyin, no spoken answer, no 都不对, no retries, no `SHOW_AFTER`; misses shown only on the end summary. <br>• Grades the first answer of the day; that day's 练一练 leaves out list due cards. <br>• Resumes after a stop. <br>• Misses due at the start of tomorrow; the 搭配 miss is the first boost item. <br>• Readiness after the check. |
| **Parent** (`weekPanel.test.tsx`) | • Paste → preview → Add, with the plan line naming words that won't fit. <br>• Wrong-partner swap. <br>• Dashboard readiness line: list, class, reviews, weak. <br>• Delete keeps words. |
| **Home** (`home.test.tsx` additions) | • Countdown text by phase, with the weekday from ready-by and the nearest of two lists. <br>• No line after homework due. <br>• `npm run fit` at 0. <br>• WebKit screenshots of Home with the line, and of the check. |
| **Backup** (`backup.test.ts` additions) | • Round trip with lists. <br>• A pre-v6 backup clears `weekLists`. <br>• Undoing a restore brings the lists back. <br>• A newer `dbVersion` gives the newer-version message. <br>• DB upgrade from v5 keeps all data and indexes. |
| **Content gates** | • `contentGate.test.ts` and `src/noErhua.test.ts` stay green. Its `SCOPE` gains `weeklist/`, because the countdown and check lines are built there. <br>• The gates stay green: list content is the parent's, and nothing is generated from HSK for it. <br>• New test: `proposeWrong` never returns a `BLOCKED` word. |

## 13. Out of scope

- **Writing the whole list.** 写一写 keeps its schedule (decision 8). Front-load days write fewer characters (§5.1).
- **Photo OCR inside the app.** The parent uses iOS Live Text, as with the importer.
- Converting traditional characters to simplified (§3.2 rule 12 flags them instead).
- Sentences and passages from the same page. From a worksheet still handles those.
- Rethinking the word ladder's two-day passes. The list measures its own readiness instead.
- Sync across devices. That is the next sub-project, as planned.

## 14. Files, for the plan

| Status | Files |
|---|---|
| **New** | `src/weeklist/{parse,match,dates,plan,schedule,dapei,fit,readiness}.ts` and their tests <br>`src/parent/WeekPanel.tsx` <br>`src/app/CheckScreen.tsx` <br>`src/app/WeekCountdown.tsx` |
| **Changed** | `src/types.ts` (`WeekList`…, `SessionPlan` fields) <br>`src/store/db.ts` (v6, store) and `repo.ts` <br>`src/store/backup.ts` (§11) <br>`src/session/plan.ts` and `lanes.ts` (quota, lanes, ordering, the ready-by day's exclusions) <br>`src/session/record.ts` (`pinDue` in `reviewCard`; `beginNewWord` on Read) <br>`src/session/practice.ts` (boost items, interleaved through `buildRound`) <br>`src/practice/pairs.ts` (list pairs in `dapeiQuestion`; a `match` board with a decoy) <br>`src/activities/practice/PracticeQuestion.tsx` (the `match` board; list `fit` items) <br>`src/activities/flashcards/FlashcardStep.tsx` (word card: example row, mark, `leadPair`) <br>`src/content/kidGloss.ts` and `src/audio/speech.ts` (`leadPair` beside `boundPair`, `loneSpoken`) <br>`src/activities/choose/UseQuestion.tsx` and `src/activities/practice/PairGame.tsx` (check mode: no pinyin, no hints) <br>`src/practice/useItems.ts` (school-file sentences as a source for list words) <br>`src/session/writing.ts` (half the characters on front-load days) <br>`src/parent/ParentArea.tsx` and `Dashboard.tsx` <br>`src/app/HomeScreen.tsx` <br>`src/session/lanes.ts` `laneTag` (「本周」) |
