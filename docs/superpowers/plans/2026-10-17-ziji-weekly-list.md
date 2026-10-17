# This Week's Word List (本周词语) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The parent pastes a weekly school or tuition word sheet, sets the ready-by and homework days, and ZiJi does the rest:
- front-loads the list's new words while keeping his class (MOE) words and revision;
- teaches the list as word cards, 选词填空 and 搭配;
- checks him with 考考自己 on the ready-by day;
- keeps practising whatever isn't solid through homework day and beyond.

**Architecture:** The pure logic lives in a new `src/weeklist/` folder:
- `parse`, `dates`, `match`, `dapei`, `fit`, `save`
- `plan` (the budget), `schedule` (the ready-by timing)
- `practice` (list items in 练一练), `answers`, `readiness`, `check`

Lists are records in a new IndexedDB store, `weekLists` (DB v6). They point at existing word ids and never copy or relabel a word. The planner (`buildSessionPlan` / `pickNewWords`), the reviewer (`reviewCard`), 认新字 (`FlashcardStep`) and 练一练 (`planPractice`, `PracticeQuestion`) each take one small hook. The UI adds:
- a Content part, 本周词语, in the parent area;
- a 考考自己 screen;
- a countdown line on Home;
- a readiness line on Dashboard.

**Tech Stack:** Preact 10, TypeScript 5.9, idb 8, ts-fsrs 5, pinyin-pro, Vitest 4 (jsdom, fake-indexeddb), playwright-core 1.52 for the WebKit sweep.

**Spec:** `docs/superpowers/specs/2026-10-17-ziji-weekly-list-design.md`. It was approved on 2026-10-17 with all 11 recommendations and the §2.1 amendment. Read it first: every section number below refers to it.

## Global Constraints

- Nothing from the Berries packs or school material goes into the repo or the public site. Lists stay on the iPad (IndexedDB) and in backups. **Test fixtures are invented for the repo and shaped like Live Text output; never copy words from the parent's sheet.**
- Lists point at existing word ids (`b:`, `w:`, `p:`). A list never changes a stored word's `listName`, `listedAt`, `writeable` or `paused`. The one exception is unpausing, when the parent ticks it.
- New parent words from a list: `source: 'parent'`, `writeable: false`, and no `listedAt`.
- `DB_VERSION` goes 5 → 6. The v6 step only creates `weekLists`, and `weekLists` joins `LIST_STORES`.
- The lesson stays about 15 minutes. Due revision always comes before list extras in 练一练's first-appearance order.
- Front-load rate: `min(pace + 2, settings.newPerDay)` a day, and `+2` only when yesterday's 练一练 didn't run out (`ranOut`). In a backlog pause (more than 40 practised cards due), list words come at most `PACE_MIN` (3) a day and MOE words wait.
- Default dates: homework due on the coming Friday, ready by homework due − 2. Ready-by is clamped to between creation + 2 days and homework due − 1. A Thursday list for Friday homework is ready by Friday (spec §3.3; when homework − 1 is today, ready-by is homework day).
- Pin rule: a list word's `recognise`, `hear`, `understand` or `meaning` card reviewed **before** ready-by is never due after the start of the ready-by day. It is never due before tomorrow. Stability is unchanged.
- After the check, a not-solid item gets **one reserved 练一练 item in every lesson** (at most 8, never cut by the boost share) and a re-teaching card in 认新字 on the day after each miss (at most 6, no new-word slot). It becomes solid after right answers on 2 different days after the check, with no miss since. This lasts until 7 days after homework due.
- In 考考自己: one question per item; no pinyin, no spoken answer, no 都不对, no retries, no `SHOW_AFTER`. One `bonusStars` star for each item that is right in the check and was not ready before it. Finishing earns nothing by itself and does not move the river meter.
- Child-facing Chinese never uses 儿化. `src/noErhua.test.ts`'s `SCOPE` gains `weeklist/`.
- The parent area may scroll and keeps English labels. Child screens stay one screen: `npm run fit` stays at 0 problems. Every layout change is checked in **WebKit** (playwright-core 1.52), not only Chromium.
- Commit after each task with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A paste in Live Text's column order** (each cell on its own line, a theme heading between pair blocks). The parent expects headings never to become words and pairs to come out right or flagged. This is pinned in Task 2 ("column-wise pairs with a heading").
2. **A list word he already has progress on as a ladder 词语** (街道-shaped). The parent expects his progress kept and no duplicate parent word. This is pinned in Task 3 ("a ladder word is referenced by its w: id").
3. **Restoring a backup from before v6, then undoing the restore.** The parent expects lists cleared by the restore and back after the undo. This is pinned in Task 10.
4. **A lesson on the ready-by day when he never opens 考考自己.** The parent expects the list cards to stay due and to come back the next day, not be lost. This is pinned in Task 4 ("ready-by day leaves list due cards for the check") and Task 9 ("unopened check").
5. **Two active lists sharing a word.** The parent expects the word counted once, for the earlier list, and pinned to the earlier ready-by. This is pinned in Task 4 ("two lists") and Task 5 ("earliest ready-by").

---

## File map

| Path | Responsibility |
|---|---|
| `src/types.ts` | `WeekList` and friends; the `SessionPlan`, `PracticeItem` and `FlashItem` fields |
| `src/store/db.ts`, `src/store/repo.ts` | The v6 store; `allWeekLists`, `putWeekList`, `deleteWeekList` |
| `src/weeklist/parse.ts` | Live Text → `WeekDraft` (items, pairs, headings, flags), reusing `cleanLines` and `suggestFix` |
| `src/weeklist/dates.ts` | Default and clamped dates, and weekday names |
| `src/weeklist/match.ts` | A draft text → a stored, ladder or new parent word; an item's status from its cards |
| `src/weeklist/dapei.ts` | Verb families; `proposeWrong` |
| `src/weeklist/fit.ts` | A sentence for a word; `proposeFit`; the parent sentence check; `WeekFit` → `UseItem` |
| `src/weeklist/save.ts` | Writes an approved draft: new words, unpauses and the list, in one transaction |
| `src/weeklist/plan.ts` | `activeLists`, the budget (`listBudget`), `schoolNeed`, `planListDay` (listCards, reteachIds, list items) |
| `src/weeklist/schedule.ts` | `pinDue`, `quickCheckDates` |
| `src/weeklist/answers.ts` | `noteListAnswer`: an answer → the item's `last`, `rightDays` and `missedOn` |
| `src/weeklist/readiness.ts` | `isReady`, `isSolid`, `readinessLine`, `countdownLine` |
| `src/weeklist/practice.ts` | `withList`: list items interleaved into a built round |
| `src/weeklist/check.ts` | `checkQueue`, `recordCheckAnswer`, `finishCheck` |
| `src/session/lanes.ts`, `src/session/plan.ts`, `src/session/record.ts`, `src/session/practice.ts`, `src/session/runner.ts`, `src/session/writing.ts` | One hook each |
| `src/practice/pairs.ts` | `listBoard` (a 搭配 board of list pairs, with one decoy) |
| `src/activities/flashcards/FlashcardStep.tsx`, `src/audio/speech.ts` | The list word card, `leadPair` speech, re-teaching |
| `src/activities/practice/PracticeQuestion.tsx`, `PairGame.tsx`, `MatchQuestion.tsx`, `src/activities/choose/UseQuestion.tsx` | List `fit`/`match` items and a `bare` (check) mode |
| `src/parent/WeekPanel.tsx`, `ParentArea.tsx`, `Dashboard.tsx` | The parent flow and readiness line |
| `src/app/CheckScreen.tsx`, `src/app/WeekCountdown.tsx`, `src/app/AppContext.tsx`, `src/App.tsx`, `src/app/HomeScreen.tsx` | 考考自己, the countdown, the route |
| `src/store/backup.ts` | Pre-v6 restore and the newer-version message |

---

### Task 1: Types and the `weekLists` store (DB v6)

**Files:**
- Modify: `src/types.ts` (append after `RewardGoal`; extend `SessionPlan`, `FlashItem`)
- Modify: `src/session/round.ts:25` (`PracticeItem`)
- Modify: `src/store/db.ts`
- Modify: `src/store/repo.ts`
- Test: `src/store/weekLists.test.ts`

**Interfaces:**
- Produces:
  - **Types:** `WeekForm`, `WeekAnswer`, `WeekItem`, `WeekPair`, `WeekFit`, `WeekCheck`, `WeekList`, `ItemStatus`, `ListCard`, `ListAsk`.
  - **`SessionPlan`:** `listNewIds?`, `reteachIds?`, `listCards?`, `listItems?`, `frontLoad?`. `newWordLanes` values gain `'list'`.
  - **`FlashItem`:** `reteach?`.
  - **`PracticeItem`:** `list?`.
  - **Repo:** `allWeekLists(db): Promise<WeekList[]>`, `getWeekList(db, id)`, `putWeekList(db, l): Promise<void>`, `deleteWeekList(db, id): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/store/weekLists.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { DB_VERSION, LIST_STORES, openAppDb } from './db';
import { allWeekLists, deleteWeekList, putWeekList } from './repo';
import type { WeekList } from '../types';

const list = (id: string): WeekList => ({
  id, name: '复习一', createdAt: 1, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:跑', text: '跑', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [],
});

describe('weekLists store (DB v6)', () => {
  it('is version 6 and backed up', () => {
    expect(DB_VERSION).toBe(6);
    expect(LIST_STORES).toContain('weekLists');
  });
  it('saves, lists and deletes', async () => {
    const db = await openAppDb(`test-${crypto.randomUUID()}`);
    await putWeekList(db, list('wl:1'));
    await putWeekList(db, list('wl:2'));
    expect((await allWeekLists(db)).map((l) => l.id).sort()).toEqual(['wl:1', 'wl:2']);
    await deleteWeekList(db, 'wl:1');
    expect((await allWeekLists(db)).map((l) => l.id)).toEqual(['wl:2']);
  });
  it('upgrades a v5 database without touching its data or indexes', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const v5 = await openDB(name, 5, {
      upgrade(db) {
        db.createObjectStore('words', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        const logs = db.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('byAt', 'at'); logs.createIndex('byCard', 'cardId'); logs.createIndex('byWord', 'wordId');
        for (const s of ['sessions', 'recordings', 'prompts', 'rewards', 'passages', 'answers', 'ladder', 'restorePoints']) db.createObjectStore(s, { keyPath: s === 'sessions' ? 'date' : s === 'ladder' ? 'wordId' : 'id', autoIncrement: s === 'answers' });
        db.createObjectStore('settings'); db.createObjectStore('kid');
      },
    });
    await v5.put('words', { id: 'b:跑', text: '跑' });
    v5.close();
    const db = await openAppDb(name);
    expect(await db.get('words', 'b:跑')).toMatchObject({ text: '跑' });
    expect(db.transaction('reviewLogs').store.indexNames.contains('byCard')).toBe(true);
    expect(await allWeekLists(db)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `npx vitest run src/store/weekLists.test.ts`
Expected: FAIL. `allWeekLists` is not exported, and `DB_VERSION` is 5.

- [ ] **Step 3: Add the types**

Append to `src/types.ts`:

```ts
/** The forms a list item is practised and checked in (weekly list spec 2026-10-17 §7). */
export type WeekForm = 'read' | 'meaning' | 'fit' | 'dapei';
export interface WeekAnswer { at: number; correct: boolean }
/** An item's status for its list (spec §5.2), worked out from its cards at each plan. */
export type ItemStatus = 'new' | 'learning' | 'known' | 'placed';

/** One word on a list: an existing word by id, never a copy (spec §3.4). */
export interface WeekItem {
  wordId: string; // 'b:套' | 'w:街道' | 'p:…'
  text: string; // as on the sheet, for the parent's view if the word is later deleted
  from: 'grid' | 'pair' | 'both';
  addedStatus: ItemStatus;
  last?: Partial<Record<WeekForm, WeekAnswer>>; // his latest answer in each form since the list arrived (§8.3)
  rightDays?: string[]; // local days with a right answer after the check: solid at 2 (§2.1)
  missedOn?: string; // the last local day it was missed after the check: a re-teaching card the next day (§2.1)
}

/** A 搭配 from the sheet: verb or adjective + object, with three wrong partners the parent confirmed (§7.4). */
export interface WeekPair {
  left: string;
  right: string;
  group?: string; // its theme heading (食物)
  wrong: [string, string, string];
  reading?: string; // left+right pinyin, one syllable per character
  last?: WeekAnswer;
}

/** A 选词填空 row the parent confirmed (§7.3): the sentence with ＿ once, and three list-mates that don't fit. */
export interface WeekFit {
  wordId: string;
  sentence: string;
  source: 'class' | 'school' | 'bank' | 'parent';
  wrong: [string, string, string];
}

/** The 考考自己 on the ready-by day (§8.1): one answer per item, saved as he goes. */
export interface WeekCheck {
  at: number;
  day: string;
  results: Record<string, { form: WeekForm; correct: boolean }>; // by wordId, or `${left}|${right}` for a pair asked from a non-item half
  done: boolean;
}

/** A list from school or tuition to learn by a day (spec §4). Its words stay ordinary words. */
export interface WeekList {
  id: string; // 'wl:<uuid>'
  name: string;
  createdAt: number;
  readyBy: string; // local YYYY-MM-DD
  homeworkDue: string; // local YYYY-MM-DD
  items: WeekItem[];
  pairs: WeekPair[];
  fits: WeekFit[];
  check?: WeekCheck;
  closedAt?: number;
}

/** What the 认新字 card shows for a list word (spec §7.1–7.2). */
export interface ListCard {
  lead?: string; // a verb's pair (煮番茄汤), shown and said in place of the bare character
  leadReading?: string;
  leadGloss?: string;
  example?: Example; // one short sentence using the word
  mark?: [number, number]; // the new character inside the word or pair, in Han characters
}

/** A 练一练 item that a list adds (spec §6.4, §2.1). */
export interface ListAsk {
  listId: string;
  form: WeekForm;
  pair?: WeekPair;
  pairs?: WeekPair[]; // a 连一连 board of list pairs (§7.5)
  fit?: WeekFit;
  reserved?: true; // a not-solid item's guaranteed slot after the check
}
```

In `SessionPlan`, change the `newWordLanes` line and add the fields before the closing brace:

```ts
  newWordLanes?: Record<string, 'school' | 'catchup' | 'list'>; // each new word's lane (spec 2026-10-11 §5; 'list': weekly list spec §5.3); listed and non-book words have none; plans saved before it have none
  listNewIds?: string[]; // today's new words taken for a weekly list (a subset of newWordIds, weekly list spec §5.2)
  reteachIds?: string[]; // not-solid list items whose card 认新字 shows again first (spec §2.1); no new-word slot
  listCards?: Record<string, ListCard>; // the list word card for today's list words and re-teaching cards (spec §7.1)
  listItems?: PracticeItem[]; // list items for 练一练, interleaved by withList (spec §6.4, §2.1)
  frontLoad?: boolean; // a day with list new words: 练一练 +2 minutes, 写一写 half (spec §5.1)
```

In `FlashItem`, add `reteach?: true; // a not-solid list item's card again (weekly list spec §2.1): shown first, asked, never graded`.

In `src/session/round.ts`, extend `PracticeItem`:

```ts
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string; none?: true | 'answer' | 'decoy'; list?: import('../types').ListAsk } // list: a weekly list item (weekly list spec §6.4)
```

- [ ] **Step 4: Add the store and the repo functions**

In `src/store/db.ts`:
- import `WeekList`;
- add `weekLists: { key: string; value: WeekList };` to `HanziDB`;
- set `export const DB_VERSION = 6;`;
- append `'weekLists'` to `LIST_STORES`;
- add to `upgrade`, after the v5 block:

```ts
      if (oldVersion < 6) db.createObjectStore('weekLists', { keyPath: 'id' }); // weekly lists (weekly list spec 2026-10-17 §4)
```

Append to `src/store/repo.ts`:

```ts
/** Weekly lists (weekly list spec 2026-10-17 §4), active and closed. */
export const allWeekLists = (db: AppDb) => db.getAll('weekLists');
export const getWeekList = (db: AppDb, id: string) => db.get('weekLists', id);
export async function putWeekList(db: AppDb, l: WeekList): Promise<void> {
  await db.put('weekLists', l);
}
export const deleteWeekList = (db: AppDb, id: string) => db.delete('weekLists', id);
```

(and add `WeekList` to the repo's type import).

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/store/ && npx tsc --noEmit`
Expected: PASS, and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/session/round.ts src/store/db.ts src/store/repo.ts src/store/weekLists.test.ts
git commit -m "Weekly list: types and the weekLists store (DB v6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Parsing a pasted sheet, and the dates

**Files:**
- Create: `src/weeklist/parse.ts`, `src/weeklist/dates.ts`
- Test: `src/weeklist/parse.test.ts`, `src/weeklist/dates.test.ts`

**Interfaces:**
- Consumes: `cleanLines(text, isWord)` from `src/importer/clean.ts`; `suggestFix(token, dict, alike?, strict?)` from `src/importer/suggest.ts`; `lookAlike` from `src/importer/alike.ts`; `BLOCK_REASON` from `src/content/blocked.ts`; `DAPEI` from `src/content/dapei.ts`.
- Produces:
  - `type ItemFlag = 'unknown' | 'phrase' | 'blocked' | 'checkPair'`
  - `interface DraftItem { text: string; from: 'grid' | 'pair' | 'both'; flags: ItemFlag[]; suggestion?: string; reason?: string }`
  - `interface DraftPair { left: string; right: string; group?: string; check?: true }`
  - `interface WeekDraft { title: string; items: DraftItem[]; pairs: DraftPair[]; unpaired: string[]; notes: string[] }` (title: the suggested name, from `sheetTitle`)
  - `parseWeekList(text: string, isWord: (w: string) => boolean, dict?: Iterable<string>, now?: Date): WeekDraft`
  - `sheetTitle(text: string, now: Date): string`: the title line above the first heading plus its page code (`考考自己 P2-L41`), else `10月20日的词语`
  - `DraftItem.parts?`: the cells `joinTokens` rejoined (rule 3), for Split
  - `isAdjPhrase(t: string): boolean` (ends in 的)
  - `defaultDates(now: Date): { homeworkDue: string; readyBy: string }`
  - `clampReadyBy(created: Date, readyBy: string, homeworkDue: string): string`
  - `weekdayZh(key: string): string` (星期一 … 星期天)
  - `daysBetween(a: string, b: string): number`

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/parse.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseWeekList } from './parse';

// Invented words, shaped like Live Text on a weekly review sheet (never the parent's sheet).
const KNOWN = new Set(['跑步', '书包', '高兴', '吃饭', '洗脸', '苹果', '牛奶', '面包', '公园', '红红的', '看书', '帽子', '唱歌']);
const isWord = (w: string) => KNOWN.has(w) || [...w].length === 1;

const ROW_WISE = [
  'Q3-L12-练习', '考考自己', '一、复习（第1-5课）', '> 词语',
  '跑步 书包 高兴 喝 洗脸', '跳 看书 闪闪亮', '>词语搭配', '早餐',
  '吃 面包 喝 牛奶 红红的 苹果', '公园', '戴 帽子 唱 歌',
  '©2026 Example Publisher Pte Ltd. All Rights Reserved 版权所有.',
].join('\n');

describe('parseWeekList', () => {
  const d = parseWeekList(ROW_WISE, isWord, KNOWN);
  it('keeps grid items and drops page furniture and the title', () => {
    expect(d.items.filter((i) => i.from !== 'pair').map((i) => i.text)).toEqual(['跑步', '书包', '高兴', '喝', '洗脸', '跳', '看书', '闪闪亮']);
  });
  it('splits a line of several pairs, and theme headings are never items', () => {
    expect(d.pairs).toEqual([
      { left: '吃', right: '面包', group: '早餐' }, { left: '喝', right: '牛奶', group: '早餐' }, { left: '红红的', right: '苹果', group: '早餐' },
      { left: '戴', right: '帽子', group: '公园' }, { left: '唱', right: '歌', group: '公园' },
    ]);
    expect(d.items.map((i) => i.text)).not.toContain('早餐');
    expect(d.items.map((i) => i.text)).not.toContain('公园');
  });
  it('merges a grid item that is also a pair half, and never makes an X的 phrase an item', () => {
    expect(d.items.find((i) => i.text === '喝')?.from).toBe('both');
    expect(d.items.map((i) => i.text)).not.toContain('红红的');
    expect(d.items.find((i) => i.text === '面包')?.from).toBe('pair');
  });
  it('flags a phrase no dictionary knows', () => {
    expect(d.items.find((i) => i.text === '闪闪亮')?.flags).toContain('phrase');
  });
  it('column-wise pairs with a heading: paired in order and flagged', () => {
    const col = parseWeekList(['> 词语搭配', '早餐', '吃', '面包', '喝', '牛奶'].join('\n'), isWord, KNOWN);
    expect(col.pairs).toEqual([{ left: '吃', right: '面包', group: '早餐', check: true }, { left: '喝', right: '牛奶', group: '早餐', check: true }]);
  });
  it('an odd pairs line is kept for the parent, unpaired', () => {
    expect(parseWeekList('> 词语搭配\n吃 面包 喝', isWord, KNOWN).unpaired).toEqual(['吃 面包 喝']);
  });
  it('flags an unknown or traditional character with a look-alike fix when one exists', () => {
    const t = parseWeekList('> 词语\n書包', isWord, KNOWN);
    expect(t.items[0]).toMatchObject({ text: '書包', flags: ['unknown'] });
  });
  it('shows a blocked word with its reason', () => {
    const b = parseWeekList('> 词语\n一点儿', isWord, KNOWN);
    expect(b.items[0]).toMatchObject({ text: '一点儿', flags: ['blocked'] });
    expect(b.items[0]!.reason).toMatch(/一点/);
  });
  it('notes sections it leaves to From a worksheet', () => {
    expect(parseWeekList('> 词语\n跑步\n> 重点句\n我们去公园跑步。', isWord, KNOWN).notes).toEqual(['sentences']);
  });
  it('rejects a token longer than four characters', () => {
    expect(parseWeekList('> 词语\n高高兴兴地', isWord, KNOWN).items).toEqual([]);
  });
});
```

```ts
// src/weeklist/dates.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { clampReadyBy, daysBetween, defaultDates, weekdayZh } from './dates';

describe('weekly list dates (spec §3.3)', () => {
  it('a Monday list: homework Friday, ready by Wednesday', () => {
    expect(defaultDates(new Date(2026, 9, 19, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-21' });
  });
  it('a Saturday list: the coming Friday, six days on', () => {
    expect(defaultDates(new Date(2026, 9, 17, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-21' });
  });
  it('a Friday list: the next Friday', () => {
    expect(defaultDates(new Date(2026, 9, 23, 9)).homeworkDue).toBe('2026-10-30');
  });
  it('a Wednesday list: ready-by moves to two days on, at most homework − 1', () => {
    expect(defaultDates(new Date(2026, 9, 21, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-22' });
  });
  it('a Thursday list for Friday homework is ready by Friday (spec §3.3)', () => {
    expect(clampReadyBy(new Date(2026, 9, 22, 9), '2026-10-20', '2026-10-23')).toBe('2026-10-23');
  });
  it('names weekdays', () => {
    expect(weekdayZh('2026-10-21')).toBe('星期三');
    expect(weekdayZh('2026-10-25')).toBe('星期天');
  });
  it('counts days', () => expect(daysBetween('2026-10-19', '2026-10-21')).toBe(2));
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/`
Expected: FAIL. `./parse` and `./dates` can't be resolved.

- [ ] **Step 3: Implement `dates.ts`**

```ts
// src/weeklist/dates.ts
// A list's two days (weekly list spec 2026-10-17 §3.3): homework due (default the coming Friday) and ready by (default two days
// before it, at least two days after the list arrives, at most the day before homework — homework day itself when the day before is already today).
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';

const FRIDAY = 5;
const ZH = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export const weekdayZh = (key: string): string => ZH[parseDateKey(key).getDay()]!;
export const daysBetween = (a: string, b: string): number => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

export function clampReadyBy(created: Date, readyBy: string, homeworkDue: string): string {
  const today = localDateKey(created);
  const tomorrow = localDateKey(addDays(startOfLocalDay(created), 1));
  const dayBefore = localDateKey(addDays(parseDateKey(homeworkDue), -1));
  const latest = dayBefore >= tomorrow ? dayBefore : homeworkDue; // a Thursday list for Friday: ready by Friday
  const earliest = localDateKey(addDays(startOfLocalDay(created), 2));
  let r = readyBy < earliest ? earliest : readyBy;
  if (r > latest) r = latest;
  return r < today ? today : r;
}

export function defaultDates(now: Date): { homeworkDue: string; readyBy: string } {
  const day = startOfLocalDay(now);
  const ahead = (FRIDAY - day.getDay() + 7) % 7 || 7; // a Friday list is for next Friday
  const homeworkDue = localDateKey(addDays(day, ahead));
  return { homeworkDue, readyBy: clampReadyBy(now, localDateKey(addDays(day, ahead - 2)), homeworkDue) };
}
```

- [ ] **Step 4: Implement `parse.ts`**

```ts
// src/weeklist/parse.ts
// A pasted weekly sheet (weekly list spec 2026-10-17 §3.2): the worksheet importer's cleanLines drops the page furniture and tags
// sections; this pass reads the 词语 grid and the 搭配 pairs, with their theme headings, and flags what the parent should check.
import { BLOCK_REASON } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { lookAlike } from '../importer/alike';
import { cleanLines } from '../importer/clean';
import { suggestFix } from '../importer/suggest';

export type ItemFlag = 'unknown' | 'phrase' | 'blocked' | 'checkPair';
export interface DraftItem { text: string; from: 'grid' | 'pair' | 'both'; flags: ItemFlag[]; suggestion?: string; reason?: string }
export interface DraftPair { left: string; right: string; group?: string; check?: true }
export interface WeekDraft { title: string | null; items: DraftItem[]; pairs: DraftPair[]; unpaired: string[]; notes: string[] }

const HAN = /^\p{Script=Han}{1,4}$/u;
const SPLIT = /[\s、,，/／\-—＋+|｜]+/;
const VERBS = new Set(DAPEI.map((d) => d.verb));
export const isAdjPhrase = (t: string) => Array.from(t).length >= 2 && t.endsWith('的');

/** Which half leads (§3.2 rule 9): an 「X的」, a single character or a known verb; otherwise the page's order. */
function lead(a: string, b: string): [string, string] {
  const leads = (t: string) => isAdjPhrase(t) || Array.from(t).length === 1 || VERBS.has(t);
  return !leads(a) && leads(b) ? [b, a] : [a, b];
}

export function parseWeekList(text: string, isWord: (w: string) => boolean, dict: Iterable<string> = []): WeekDraft {
  const draft: WeekDraft = { title: null, items: [], pairs: [], unpaired: [], notes: [] };
  const lines = cleanLines(text, isWord);
  const grid: string[] = [];
  let group: string | undefined;
  let column: string[] = []; // pairs read one cell a line
  const flushColumn = () => {
    for (let i = 0; i + 1 < column.length; i += 2) {
      const [left, right] = lead(column[i]!, column[i + 1]!);
      draft.pairs.push({ left, right, ...(group ? { group } : {}), check: true });
    }
    if (column.length % 2) draft.unpaired.push(column.at(-1)!);
    column = [];
  };
  for (const [i, { line, section }] of lines.entries()) {
    if (section === 'sentences' || section === 'other' || section === 'idioms') {
      const note = section === 'idioms' ? 'idioms' : section === 'sentences' ? 'sentences' : 'passages';
      if (!/^第.+课$/.test(line) && !draft.notes.includes(note)) draft.notes.push(note);
      continue;
    }
    const tokens = line.split(SPLIT).filter((t) => HAN.test(t));
    if (section !== 'pairs') { grid.push(...tokens); continue; }
    // a theme heading: one short token, between pair blocks (the column buffer is even), followed by pairs (§3.2 rule 6)
    if (tokens.length === 1 && Array.from(tokens[0]!).length <= 3 && column.length % 2 === 0 && isHeading(tokens[0]!, lines.slice(i + 1).filter((l) => l.section === 'pairs').map((l) => l.line))) {
      flushColumn();
      group = tokens[0];
      continue;
    }
    if (tokens.length === 1) { column.push(tokens[0]!); continue; }
    flushColumn();
    if (tokens.length % 2) { draft.unpaired.push(line); continue; }
    for (let k = 0; k < tokens.length; k += 2) {
      const [left, right] = lead(tokens[k]!, tokens[k + 1]!);
      draft.pairs.push({ left, right, ...(group ? { group } : {}) });
    }
  }
  flushColumn();
  const seen = new Map<string, DraftItem>();
  const add = (t: string, from: 'grid' | 'pair') => {
    if (isAdjPhrase(t)) return; // 「X的」 lives on its pair only (decision 4)
    const had = seen.get(t);
    if (had) { if (had.from !== from) had.from = 'both'; return; }
    const item: DraftItem = { text: t, from, flags: [] };
    const reason = BLOCK_REASON.get(t);
    if (reason) { item.flags.push('blocked'); item.reason = reason; }
    else if (!isWord(t)) {
      const chars = Array.from(t);
      if (chars.every((c) => isWord(c)) && chars.length >= 3) item.flags.push('phrase');
      else {
        item.flags.push('unknown');
        const fix = suggestFix(t, dict, lookAlike);
        if (fix) item.suggestion = fix;
      }
    }
    seen.set(t, item);
    draft.items.push(item);
  };
  for (const t of grid) add(t, 'grid');
  for (const p of draft.pairs) { add(p.left, 'pair'); add(p.right, 'pair'); }
  return draft;
}

/** A lone token is a heading when the lines after it, up to the next lone token, are pair lines (two or more tokens each). */
function isHeading(token: string, after: string[]): boolean {
  const following = after[0]?.split(SPLIT).filter((t) => HAN.test(t)) ?? [];
  if (following.length >= 2) return true;
  // column-wise: a heading is followed by an even run of single cells before the next heading or the end
  let run = 0;
  for (const l of after) {
    const ts = l.split(SPLIT).filter((t) => HAN.test(t));
    if (ts.length !== 1) break;
    run++;
  }
  return run >= 2 && run % 2 === 0 && token.length <= 3;
}
```

A one-token line inside a column-wise block is never mistaken for a heading: the buffer is odd after a left cell, so only the cell after a completed pair can be a heading, and only if an even run of cells follows it.

**Closed after review (2026-10-17):** the shipped `parse.ts` also covers three spec rules that the code above left out. Treat `src/weeklist/parse.ts` as the reference.
- **Rule 1:** `sheetTitle` names the list.
- **Rule 3:** grid tokens go through the importer's `joinTokens`, now exported; 生字 cells are never joined.
- **Rule 6:** a lone token that is a half of any pairs line read across is never a heading. It goes to `unpaired` instead.

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/`
Expected: PASS. If the column-wise test pairs the heading itself, check that `isHeading` sees the even run after it.

- [ ] **Step 6: Commit**

```bash
git add src/weeklist/parse.ts src/weeklist/parse.test.ts src/weeklist/dates.ts src/weeklist/dates.test.ts
git commit -m "Weekly list: parse a pasted sheet (grid, pairs, theme headings) and its dates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Matching, wrong partners, 选词填空 rows, and saving

**Files:**
- Create: `src/weeklist/match.ts`, `src/weeklist/dapei.ts`, `src/weeklist/fit.ts`, `src/weeklist/save.ts`
- Test: `src/weeklist/match.test.ts`, `src/weeklist/dapei.test.ts`, `src/weeklist/fit.test.ts`, `src/weeklist/save.test.ts`

**Interfaces:**
- Consumes: Task 1's types and repo; Task 2's `DraftItem`, `DraftPair`, `isAdjPhrase`; `ladderWord`, `ladderId` (`src/content/ladder.ts`); `readingOf`, `isChildWord` (`src/content/wordGate.ts`); `glossFor` (`src/content/glossary.ts`); `glossProblems` (`src/content/kidGloss.ts`); `HSK_WORDS` (`src/content/index.ts`); `DAPEI`; `BLOCKED`, `ERHUA` (`src/content/blocked.ts`); `sentencesFor` (`src/content/understand.ts`); `bankFor`, `BLANK` (`src/content/sentenceBank.ts`); `MAX_SENTENCE_CUE` (`src/activities/flashcards/meaning.ts`); `UseItem` (`src/practice/useItems.ts`); `newId` (`src/lib/id.ts`).
- Produces:
  - `matchText(text, stored: ReadonlyMap<string, Word>, now: number, newId?): { kind: 'stored' | 'ladder' | 'new'; word: Word }`
  - `itemStatus(wordId, cards: ReadonlyMap<string, CardRecord>): ItemStatus`
  - `VERB_FAMILY: Readonly<Record<string, string>>`
  - `proposeWrong(pair: DraftPair, pairs: DraftPair[], skip?: ReadonlySet<string>): string[]` (three, or fewer when too few exist)
  - `sentenceFor(word: Word): { text: string; source: WeekFit['source'] } | null` (the word replaced by `＿` once)
  - `wordKind(text: string, pairs: DraftPair[]): 'verb' | 'adj' | 'noun' | null`
  - `proposeFit(word: Word, mates: Word[], pairs: DraftPair[], sentence: { text: string; source: WeekFit['source'] }, skip?: ReadonlySet<string>): WeekFit | null`
  - `parentSentenceProblems(text: string, word: string): string[]`
  - `fitUseItem(fit: WeekFit, word: Word, rng: Rng): UseItem`
  - `interface ApprovedDraft { name: string; readyBy: string; homeworkDue: string; items: { text: string; from: WeekItem['from']; pinyin?: string; meaning?: string; unpause?: boolean }[]; pairs: WeekPair[]; fits: WeekFit[] }`. A fit's `wordId` here holds the **item text**, and `saveWeekList` maps it to the id.
  - `saveWeekList(db, draft: ApprovedDraft, now: Date, update?: string): Promise<WeekList>` (`update`: the id of the list to update)

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/match.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { State } from 'ts-fsrs';
import { ladderWords } from '../content/ladder';
import { makeCard, makeWord } from '../test/fixtures';
import { itemStatus, matchText } from './match';

describe('matchText (spec §3.4)', () => {
  const stored = new Map([['跑', makeWord('跑', { listName: 'old', listedAt: 5 })]]);
  it('a stored word is referenced, unchanged', () => {
    const m = matchText('跑', stored, 1);
    expect(m.kind).toBe('stored');
    expect(m.word).toBe(stored.get('跑'));
  });
  it('a ladder word is referenced by its w: id', () => {
    const lw = ladderWords()[0]!;
    expect(matchText(lw.text, new Map(), 1)).toMatchObject({ kind: 'ladder', word: { id: `w:${lw.text}` } });
  });
  it('a new word is a parent word with readingOf pinyin, no listedAt, not writeable', () => {
    const m = matchText('闪闪亮', new Map(), 7, () => 'u1');
    expect(m.kind).toBe('new');
    expect(m.word).toMatchObject({ id: 'p:u1', source: 'parent', writeable: false, paused: false, createdAt: 7 });
    expect(m.word.listedAt).toBeUndefined();
    expect(m.word.pinyin.split(' ')).toHaveLength(3);
  });
});

describe('itemStatus (spec §5.2)', () => {
  const at = new Date(2026, 9, 19);
  it('new without a reading card, known in Review, learning otherwise, placed when placed', () => {
    const known = makeCard('b:a', 'recognise', at, true);
    const placed = { ...makeCard('b:b', 'recognise', at, true), placed: true as const };
    const learning = { ...makeCard('b:c', 'recognise', at), fsrs: { ...makeCard('b:c', 'recognise', at).fsrs, state: State.Learning } };
    const cards = new Map([known, placed, learning].map((c) => [c.id, c]));
    expect(['b:a', 'b:b', 'b:c', 'b:d'].map((id) => itemStatus(id, cards))).toEqual(['known', 'placed', 'learning', 'new']);
  });
});
```

```ts
// src/weeklist/dapei.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BLOCKED } from '../content/blocked';
import { proposeWrong } from './dapei';

const pairs = [
  { left: '煎', right: '鸡蛋', group: '厨房' }, { left: '炒', right: '青菜', group: '厨房' },
  { left: '摘', right: '苹果', group: '果园' }, { left: '拍', right: '皮球', group: '操场' }, { left: '放', right: '风筝', group: '操场' },
];
describe('proposeWrong (spec §7.4)', () => {
  it('never a same-family object (炒 would fit 鸡蛋), prefers another group', () => {
    const w = proposeWrong(pairs[1]!, pairs);
    expect(w).not.toContain('鸡蛋');
    expect(w).not.toContain('青菜');
    expect(w).toHaveLength(3);
    expect(w[0]).not.toBe(undefined);
  });
  it('never a DAPEI or HSK pairing and never blocked', () => {
    const w = proposeWrong({ left: '吃', right: '饭' }, [{ left: '吃', right: '饭' }, { left: '喝', right: '水果' }]);
    expect(w).not.toContain('水果'); // 吃水果 is in DAPEI
    for (const x of w) expect(BLOCKED.has(x)).toBe(false);
  });
  it('fills from DAPEI nouns when the list is short', () => {
    expect(proposeWrong(pairs[0]!, pairs.slice(0, 2))).toHaveLength(3);
  });
});
```

```ts
// src/weeklist/fit.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { parentSentenceProblems, proposeFit } from './fit';

const w = (t: string) => makeWord(t, { id: `p:${t}`, source: 'parent', pinyin: 'x x' });
describe('proposeFit (spec §7.3)', () => {
  const mates = ['整洁', '热闹', '冰冷', '原来', '书包', '跑'].map(w);
  it('decoys only from the list, same length, never the answer', () => {
    const f = proposeFit(w('干净'), mates, [], { text: '教室打扫得很＿。', source: 'parent' })!;
    expect(f.wrong).toHaveLength(3);
    for (const d of f.wrong) { expect(mates.map((m) => m.text)).toContain(d); expect([...d]).toHaveLength(2); }
  });
  it('confusables (shared character) come first', () => {
    const f = proposeFit(w('整齐'), mates, [], { text: '书摆得很＿。', source: 'parent' })!;
    expect(f.wrong[0]).toBe('整洁');
  });
  it('null when fewer than three decoys exist', () => {
    expect(proposeFit(w('干净'), mates.slice(0, 2), [], { text: '很＿。', source: 'parent' })).toBeNull();
  });
});
describe('parentSentenceProblems', () => {
  it('checks the word once, the length, blocked and 儿化 words, Latin', () => {
    expect(parentSentenceProblems('他跑得很快。', '跑')).toEqual([]);
    expect(parentSentenceProblems('跑跑。', '跑')).toContain('the word must appear once');
    expect(parentSentenceProblems('他一点儿也不跑。', '跑')).toContain('儿化: 一点儿');
    expect(parentSentenceProblems('he 跑 fast', '跑')).toContain('no English or pinyin');
  });
});
```

```ts
// src/weeklist/save.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allWeekLists, allWords, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { saveWeekList, type ApprovedDraft } from './save';

const now = new Date(2026, 9, 19, 9);
const draft = (over: Partial<ApprovedDraft> = {}): ApprovedDraft => ({
  name: '复习一', readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ text: '跑', from: 'grid' }, { text: '闪闪亮', from: 'grid', meaning: 'sparkly' }], pairs: [], fits: [], ...over,
});
describe('saveWeekList', () => {
  it('references stored words unchanged and adds new parent words with the list name', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('跑', { listName: '听写 mistakes', listedAt: -5 })]);
    const l = await saveWeekList(db, draft(), now);
    const words = await allWords(db);
    expect(words.find((x) => x.text === '跑')).toMatchObject({ listName: '听写 mistakes', listedAt: -5 });
    expect(words.find((x) => x.text === '闪闪亮')).toMatchObject({ listName: '复习一', meaning: 'sparkly', writeable: false });
    expect(l.items.map((i) => i.wordId)).toEqual(['b:跑', expect.stringMatching(/^p:/)]);
    expect(await allWeekLists(db)).toHaveLength(1);
  });
  it('unpauses only when ticked', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('跑', { paused: true })]);
    await saveWeekList(db, draft({ items: [{ text: '跑', from: 'grid', unpause: true }] }), now);
    expect((await allWords(db))[0]!.paused).toBe(false);
  });
  it('a re-paste updates the list and adds nothing twice', async () => {
    const db = await freshDb();
    const l = await saveWeekList(db, draft(), now);
    await saveWeekList(db, draft({ items: [{ text: '跑', from: 'grid' }, { text: '闪闪亮', from: 'grid' }, { text: '书包', from: 'pair' }] }), now, l.id);
    expect((await allWords(db)).filter((x) => x.text === '闪闪亮')).toHaveLength(1);
    expect((await allWeekLists(db))[0]!.items.map((i) => i.text)).toEqual(['跑', '闪闪亮', '书包']);
  });
  it('a fit row keyed by text gets the word id', async () => {
    const db = await freshDb();
    const l = await saveWeekList(db, draft({ fits: [{ wordId: '跑', sentence: '他＿得很快。', source: 'parent', wrong: ['a', 'b', 'c'] }] }), now);
    expect(l.fits[0]!.wordId).toBe('b:跑');
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/`
Expected: FAIL. The modules don't exist yet.

- [ ] **Step 3: Implement `match.ts`**

```ts
// src/weeklist/match.ts
// A list item is an existing word by id, never a copy (weekly list spec 2026-10-17 §3.4): a stored word, then a ladder 词语 (his
// progress lives on its w: cards), then a new parent word. Its status comes from its reading card (§5.2).
import { State } from 'ts-fsrs';
import { glossFor } from '../content/glossary';
import { ladderId, ladderWord } from '../content/ladder';
import { readingOf } from '../content/wordGate';
import { newId as uuid } from '../lib/id';
import type { CardRecord, ItemStatus, Word } from '../types';

export function matchText(text: string, stored: ReadonlyMap<string, Word>, now: number, newId: () => string = uuid): { kind: 'stored' | 'ladder' | 'new'; word: Word } {
  const have = stored.get(text);
  if (have) return { kind: 'stored', word: have };
  const lw = ladderWord(ladderId(text));
  if (lw) return { kind: 'ladder', word: lw };
  const meaning = glossFor(text);
  return {
    kind: 'new',
    word: { id: `p:${newId()}`, text, pinyin: readingOf(text), level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: now, ...(meaning ? { meaning } : {}) },
  };
}

export function itemStatus(wordId: string, cards: ReadonlyMap<string, CardRecord>): ItemStatus {
  const c = cards.get(`${wordId}:recognise`);
  if (!c) return 'new';
  if (c.placed) return 'placed';
  return c.fsrs.state === State.Review ? 'known' : 'learning';
}
```

- [ ] **Step 4: Implement `dapei.ts`**

```ts
// src/weeklist/dapei.ts
// Wrong partners for a list's 搭配 (weekly list spec 2026-10-17 §7.4): proposed here, confirmed by the parent. Never an object
// another verb of the same family takes (煮/炒/炸/烤 all cook), a DAPEI or HSK pairing, or a blocked word.
import { BLOCKED } from '../content/blocked';
import { DAPEI, isDapei } from '../content/dapei';
import { dictionaryGloss } from '../content/glossary';
import { HSK_WORDS } from '../content';
import type { DraftPair } from './parse';

/** Verbs that take the same objects: an object one of them takes counts as fitting them all. Extend as lists bring new verbs. */
export const VERB_FAMILY: Readonly<Record<string, string>> = {
  煮: 'cook', 炒: 'cook', 炸: 'cook', 烤: 'cook', 蒸: 'cook', 煎: 'cook', 做: 'cook',
  摘: 'harvest', 拔: 'harvest', 挖: 'harvest', 采: 'harvest', 种: 'harvest',
  玩: 'play', 套: 'play', 射: 'play', 打: 'play', 踢: 'play', 拍: 'play', 放: 'play',
  吃: 'eat', 喝: 'eat', 尝: 'eat',
};

const fits = (left: string, right: string, pairs: DraftPair[]): boolean => {
  if (pairs.some((p) => p.left === left && p.right === right)) return true;
  if (isDapei(left, right) || HSK_WORDS.has(left + right) || dictionaryGloss(left + right) !== undefined) return true;
  const fam = VERB_FAMILY[left];
  return !!fam && pairs.some((p) => p.right === right && VERB_FAMILY[p.left] === fam);
};

export function proposeWrong(pair: DraftPair, pairs: DraftPair[], skip: ReadonlySet<string> = new Set()): string[] {
  const objects = [...new Set(pairs.map((p) => p.right))].filter((o) => o !== pair.right && !skip.has(o) && !BLOCKED.has(o) && !fits(pair.left, o, pairs));
  // another theme first (摘 → 番茄汤 before 摘 → 豆芽), then the page's order
  const ranked = [...objects.filter((o) => pairs.find((p) => p.right === o)?.group !== pair.group), ...objects.filter((o) => pairs.find((p) => p.right === o)?.group === pair.group)];
  const out = ranked.slice(0, 3);
  for (const d of DAPEI) {
    if (out.length >= 3) break;
    if (d.noun !== pair.right && !out.includes(d.noun) && !skip.has(d.noun) && !BLOCKED.has(d.noun) && !fits(pair.left, d.noun, pairs)) out.push(d.noun);
  }
  return out;
}
```

The family table makes 炒 → 鸡蛋 fit through 煎 → 鸡蛋 in the test, so 鸡蛋 is never proposed.

- [ ] **Step 5: Implement `fit.ts`**

```ts
// src/weeklist/fit.ts
// 选词填空 from the list (weekly list spec 2026-10-17 §7.3): a written sentence with the word blanked, three list-mates that
// don't fit, confirmed by the parent before it is ever asked.
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { BLOCKED, ERHUA } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { kidGloss } from '../content/kidGloss';
import { getCharInfo, HSK_WORDS } from '../content';
import { bankFor, BLANK, fillGap } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import { shuffle, type Rng } from '../lib/random';
import type { UseItem } from '../practice/useItems';
import type { WeekFit, Word } from '../types';
import { isAdjPhrase, type DraftPair } from './parse';
import { VERB_FAMILY } from './dapei';

const once = (s: string, w: string) => { const at = s.indexOf(w); return at >= 0 && s.indexOf(w, at + 1) < 0; };
const blank = (s: string, w: string) => s.replace(w, BLANK);

/** The word's sentence, blanked: his class sentence, the school sentence file, the bank's first gap (spec §7.3). */
export function sentenceFor(word: Word): { text: string; source: WeekFit['source'] } | null {
  const ok = (s: string) => once(s, word.text) && Array.from(s).length <= MAX_SENTENCE_CUE && Array.from(s).length >= Array.from(word.text).length + 4;
  const cls = (word.sentences ?? []).find((s) => ok(s.text));
  if (cls) return { text: blank(cls.text, word.text), source: 'class' };
  const school = sentencesFor(word.text).find((s) => ok(s.zh));
  if (school) return { text: blank(school.zh, word.text), source: 'school' };
  const b = bankFor(word.text);
  if (b && ok(fillGap(b.gaps[0], word.text))) return { text: b.gaps[0].text, source: 'bank' };
  return null;
}

const VERBS = new Set(DAPEI.map((d) => d.verb));
export function wordKind(text: string, pairs: DraftPair[]): 'verb' | 'adj' | 'noun' | null {
  const bank = bankFor(text);
  if (bank) return bank.type === 'v' ? 'verb' : bank.type === 'adj' ? 'adj' : bank.type === 'n' ? 'noun' : null;
  if (pairs.some((p) => p.left === text) || VERBS.has(text)) return 'verb';
  const c = Array.from(text);
  if (isAdjPhrase(text) || (c.length === 3 && c[1] === c[2])) return 'adj';
  if (pairs.some((p) => p.right === text)) return 'noun';
  return null;
}

/** Shares a character, a radical or a gloss word with the answer: a confusable, asked first (spec §7.3). */
function confusable(a: string, b: string): boolean {
  const ca = Array.from(a);
  const cb = Array.from(b);
  if (ca.some((c) => cb.includes(c))) return true;
  const rad = (s: string[]) => s.map((c) => getCharInfo(c)?.radical).filter(Boolean);
  if (rad(ca).some((r) => rad(cb).includes(r))) return true;
  const ga = (kidGloss(a) ?? '').split(/[\s,]+/);
  return (kidGloss(b) ?? '').split(/[\s,]+/).some((g) => g.length > 2 && ga.includes(g));
}

export function proposeFit(word: Word, mates: Word[], pairs: DraftPair[], sentence: { text: string; source: WeekFit['source'] }, skip: ReadonlySet<string> = new Set()): WeekFit | null {
  const at = sentence.text.indexOf(BLANK);
  const before = sentence.text.slice(0, at);
  const after = sentence.text.slice(at + 1);
  const kind = wordKind(word.text, pairs);
  const len = Array.from(word.text).length;
  const edgeWord = (d: string) => HSK_WORDS.has((before.at(-1) ?? '') + d) || HSK_WORDS.has(d + (after[0] ?? ''));
  const candidates = mates.filter((m) => {
    const d = m.text;
    if (d === word.text || d.includes(word.text) || word.text.includes(d) || skip.has(d) || BLOCKED.has(d)) return false;
    if (sentence.text.includes(d)) return false; // already printed in the sentence
    if (edgeWord(d) && !edgeWord(word.text)) return false; // it would make a word across the blank's edge
    const k = wordKind(d, pairs);
    if (kind && k && k !== kind) return false;
    if (kind === 'verb' && VERB_FAMILY[d] && VERB_FAMILY[d] === VERB_FAMILY[word.text]) return false;
    if (sentencesFor(d).some((s) => s.zh === before + d + after)) return false;
    return true;
  }).map((m) => m.text);
  const sameLen = candidates.filter((d) => Array.from(d).length === len);
  const pool = sameLen.length >= 3 ? sameLen : candidates;
  const ranked = [...pool.filter((d) => confusable(word.text, d)), ...pool.filter((d) => !confusable(word.text, d))];
  if (ranked.length < 3) return null;
  return { wordId: word.id, sentence: sentence.text, source: sentence.source, wrong: [ranked[0]!, ranked[1]!, ranked[2]!] };
}

export function parentSentenceProblems(text: string, word: string): string[] {
  const out: string[] = [];
  if (!once(text, word)) out.push('the word must appear once');
  const n = Array.from(text).length;
  if (n < 6 || n > MAX_SENTENCE_CUE) out.push(`6–${MAX_SENTENCE_CUE} characters`);
  for (const b of BLOCKED) if (text.includes(b)) out.push(b in ERHUA ? `儿化: ${b}` : `blocked: ${b}`);
  if (/[A-Za-z]/.test(text)) out.push('no English or pinyin');
  return out;
}

/** A confirmed row as 选一选's question (UseQuestion `fit`). */
export function fitUseItem(fit: WeekFit, word: Word, rng: Rng): UseItem {
  const at = fit.sentence.indexOf(BLANK);
  return { kind: 'fit', wordId: word.id, word: word.text, before: fit.sentence.slice(0, at), after: fit.sentence.slice(at + 1), options: shuffle([word.text, ...fit.wrong], rng), ...(word.meaning && word.source === 'parent' ? { meaning: word.meaning } : {}) };
}
```

In the test, 整洁 shares 整 with 整齐, so it comes first. Every decoy has two characters because 干净 does.

- [ ] **Step 6: Implement `save.ts`**

```ts
// src/weeklist/save.ts
// Writes an approved draft (weekly list spec 2026-10-17 §3.5): new parent words, unpauses and the list, in one transaction.
// A stored word is referenced as it is; nothing about it changes except an unpause the parent ticked.
import { ladderWordsBesides } from '../content/ladder';
import { newId } from '../lib/id';
import type { AppDb } from '../store/db';
import { allCards, allWords, getWeekList } from '../store/repo';
import type { WeekFit, WeekItem, WeekList, WeekPair, Word } from '../types';
import { itemStatus, matchText } from './match';

export interface ApprovedDraft {
  name: string;
  readyBy: string;
  homeworkDue: string;
  items: { text: string; from: WeekItem['from']; pinyin?: string; meaning?: string; unpause?: boolean }[];
  pairs: WeekPair[];
  fits: WeekFit[]; // wordId holds the item's text until saved
}

export async function saveWeekList(db: AppDb, draft: ApprovedDraft, now: Date, update?: string): Promise<WeekList> {
  const stored = await allWords(db);
  const byText = new Map<string, Word>([...stored, ...ladderWordsBesides(stored)].map((w) => [w.text, w]));
  const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
  const old = update ? await getWeekList(db, update) : undefined;
  const writes: Word[] = [];
  const items: WeekItem[] = [...(old?.items ?? [])];
  for (const d of draft.items) {
    const m = matchText(d.text, byText, now.getTime());
    let word = m.word;
    if (m.kind === 'new') {
      word = { ...word, listName: draft.name, ...(d.pinyin ? { pinyin: d.pinyin } : {}), ...(d.meaning ? { meaning: d.meaning } : {}) };
      writes.push(word);
      byText.set(word.text, word);
    } else if (m.kind === 'stored' && d.unpause && word.paused) writes.push({ ...word, paused: false });
    if (!items.some((i) => i.wordId === word.id)) items.push({ wordId: word.id, text: d.text, from: d.from, addedStatus: itemStatus(word.id, cards) });
  }
  const fits = draft.fits.map((f) => ({ ...f, wordId: byText.get(f.wordId)?.id ?? f.wordId }));
  const list: WeekList = {
    id: old?.id ?? `wl:${newId()}`, name: draft.name, createdAt: old?.createdAt ?? now.getTime(),
    readyBy: draft.readyBy, homeworkDue: draft.homeworkDue, items, pairs: draft.pairs, fits, ...(old?.check ? { check: old.check } : {}),
  };
  const tx = db.transaction(['words', 'weekLists'], 'readwrite');
  await Promise.all([...writes.map((w) => tx.objectStore('words').put(w)), tx.objectStore('weekLists').put(list), tx.done]);
  return list;
}
```

- [ ] **Step 7: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/ && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/weeklist/
git commit -m "Weekly list: match to existing words, propose 搭配 wrongs and 选词填空 rows, save a list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The planner budget (list, class lane, catch-up, revision)

**Files:**
- Create: `src/weeklist/plan.ts`
- Modify: `src/session/lanes.ts` (`pickNewWords` takes list ids and a list quota; `Lane` gains `'list'`; `laneTag` says 「本周」)
- Modify: `src/session/plan.ts` (`PlanInput.lists`, `ranOut`; due list cards first; the ready-by day leaves list due cards to the check; the backlog rule; `extraCards` skips list cards on ready-by − 1)
- Modify: `src/session/record.ts` (`planNow` passes lists and the run-out flags)
- Modify: `src/session/writing.ts` caller (half the characters on a front-load day)
- Test: `src/weeklist/plan.test.ts`, `src/weeklist/week.sim.test.ts`

**Interfaces:**
- Consumes: `WeekList` and `ItemStatus` (Task 1); `itemStatus` (Task 3); `bookLesson` (`lanes.ts`); `classLessonAt` (`curriculum.ts`); `PACE_MIN` (`pace.ts`); `localDateKey`, `addDays`, `parseDateKey` (`lib/date.ts`); `daysBetween` (Task 2).
- Produces:
  - `activeLists(lists: WeekList[], now: Date): WeekList[]` (not closed, now ≤ homeworkDue + 7 days, ordered by readyBy)
  - `listOwner(lists: WeekList[]): Map<string, WeekList>` (wordId → the earliest active list it is on)
  - `interface ListBudget { listIds: string[]; listQuota: number; total: number; frontLoad: boolean; schoolFirst: number }`
  - `listBudget(i: { lists: WeekList[]; cards: ReadonlyMap<string, CardRecord>; now: Date; pace: number; ceiling: number; ranOutYesterday: boolean; ranOutTwice: boolean; backlog: boolean; schoolNeed: number }): ListBudget`
  - `schoolNeed(words: Word[], started: ReadonlySet<string>, classAt: number | null): number`
  - `isReadyByDay(lists: WeekList[], now: Date): WeekList[]` (lists whose readyBy is today)
  - `pickNewWords({ candidates, n, classAt, begunChars, listIds?, listQuota?, schoolFirst? })`: list words first, up to `listQuota`. A ladder 词语 from the list skips the begun-characters gate. A list word in the school window is tagged `'school'`, otherwise `'list'`. `schoolFirst` school-lane words come before catch-up.
  - `PlanInput.lists?: WeekList[]`, `PlanInput.ranOut?: [boolean, boolean]`

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/plan.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSessionPlan } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type WeekList } from '../types';
import { activeLists, listBudget, listOwner } from './plan';

const mon = new Date(2026, 9, 19, 9);
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:1', name: 'L', createdAt: mon.getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: Array.from({ length: 14 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [], ...over,
});
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`词${i}`, { id: `p:${i}`, source: 'parent', rank: null, level: null }));
const base = { cards: new Map(), now: mon, pace: 5, ceiling: 8, ranOutYesterday: false, ranOutTwice: false, backlog: false, schoolNeed: 8 };

describe('listBudget (spec §5.2)', () => {
  it('front-loads at pace + 2: 14 new words in two days', () => {
    const b = listBudget({ ...base, lists: [list()] });
    expect([b.listQuota, b.total, b.frontLoad]).toEqual([7, 7, true]);
  });
  it('no headroom after a run-out', () => {
    expect(listBudget({ ...base, lists: [list()], ranOutYesterday: true }).total).toBe(5);
  });
  it('two run-outs spill: no more than pace − 1 today', () => {
    expect(listBudget({ ...base, lists: [list()], ranOutYesterday: true, ranOutTwice: true }).listQuota).toBe(4);
  });
  it('a backlog pause: list at most 3, nothing else', () => {
    const b = listBudget({ ...base, lists: [list()], backlog: true });
    expect([b.listQuota, b.total]).toEqual([3, 3]);
  });
  it('after the front-load days the school lane goes first until schoolNeed is met by homework day', () => {
    const wed = new Date(2026, 9, 21, 9);
    const b = listBudget({ ...base, now: wed, lists: [list({ items: [] })] });
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([0, 5, false, 3]);
  });
  it('the ready-by day takes no list words', () => {
    expect(listBudget({ ...base, now: new Date(2026, 9, 21, 9), lists: [list()] }).listQuota).toBe(0);
  });
});

describe('two lists', () => {
  it('a shared word belongs to the earlier list', () => {
    const a = list({ id: 'wl:a', readyBy: '2026-10-21' });
    const b = list({ id: 'wl:b', readyBy: '2026-10-28', homeworkDue: '2026-10-30' });
    expect(listOwner(activeLists([b, a], mon)).get('p:0')?.id).toBe('wl:a');
  });
  it('a list closes 7 days after homework', () => {
    expect(activeLists([list()], new Date(2026, 9, 31, 9))).toEqual([]);
  });
});

describe('buildSessionPlan with a list (spec §5)', () => {
  const settings = { ...DEFAULT_SETTINGS };
  it('takes list words first, tagged list, and marks a front-load day', () => {
    const ws = [...words(14), ...Array.from({ length: 10 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const plan = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5, lists: [list()] });
    expect(plan.listNewIds).toHaveLength(7);
    expect(plan.newWordIds.slice(0, 7).every((id) => id.startsWith('p:'))).toBe(true);
    expect(plan.newWordLanes?.['p:0']).toBe('list');
    expect(plan.frontLoad).toBe(true);
  });
  it('ready-by day leaves list due cards for the check', () => {
    const wed = new Date(2026, 9, 21, 9);
    const cards = [makeCard('p:0', 'recognise', new Date(2026, 9, 21, 6), true), makeCard('b:x', 'recognise', new Date(2026, 9, 21, 6), true)];
    const plan = buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: wed, newPerDay: 5, lists: [list()] });
    expect(plan.reviewWordIds).toEqual(['b:x']);
  });
  it('due list cards come first among due reviews between ready-by and homework', () => {
    const thu = new Date(2026, 9, 22, 9);
    const cards = [makeCard('b:x', 'recognise', new Date(2026, 9, 20), true), makeCard('p:0', 'recognise', new Date(2026, 9, 22, 6), true)];
    expect(buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: thu, newPerDay: 5, lists: [list()] }).reviewWordIds[0]).toBe('p:0');
  });
});
```

```ts
// src/weeklist/week.sim.test.ts
// @vitest-environment node
// The spec §5.4 week: 32 items (14 new, 14 known, 4 placed) arrive Monday, ready by Wednesday, homework Friday. Pace 5, ceiling 8.
import { describe, expect, it } from 'vitest';
import { buildSessionPlan } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type WeekList } from '../types';

describe('an example week (spec §5.4)', () => {
  it('list words Mon–Tue at 7, none from Wednesday, and due revision planned every day', () => {
    const items = Array.from({ length: 32 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const }));
    const list: WeekList = { id: 'wl:1', name: 'L', createdAt: new Date(2026, 9, 19).getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23', items, pairs: [], fits: [] };
    const ws = [...items.map((it) => makeWord(it.text, { id: it.wordId, source: 'parent', rank: null, level: null })), ...Array.from({ length: 60 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const known = Array.from({ length: 14 }, (_, i) => makeCard(`p:${14 + i}`, 'recognise', new Date(2026, 10, 30), true));
    const placed = Array.from({ length: 4 }, (_, i) => ({ ...makeCard(`p:${28 + i}`, 'recognise', new Date(2026, 9, 19, 6), true), placed: true as const }));
    const revision = Array.from({ length: 16 }, (_, i) => makeCard(`b:${40 + i}`, 'recognise', new Date(2026, 9, 19, 6), true));
    let cards = [...known, ...placed, ...revision];
    const listNew: number[] = [];
    for (let d = 0; d < 5; d++) {
      const now = new Date(2026, 9, 19 + d, 9);
      const plan = buildSessionPlan({ cards, words: ws, settings: DEFAULT_SETTINGS, now, newPerDay: 5, lists: [list] });
      listNew.push(plan.listNewIds?.length ?? 0);
      const due = cards.filter((c) => c.fsrs.due.getTime() <= new Date(2026, 9, 19 + d, 23, 59).getTime() && !c.wordId.startsWith('p:'));
      for (const c of due) expect(plan.reviewWordIds).toContain(c.wordId); // revision is never squeezed out
      cards = [...cards.map((c) => (plan.reviewWordIds.includes(c.wordId) ? { ...c, fsrs: { ...c.fsrs, due: new Date(2026, 9, 25 + d) } } : c)),
        ...plan.newWordIds.map((id) => makeCard(id, 'recognise', new Date(2026, 9, 20 + d, 6)))];
    }
    expect(listNew).toEqual([7, 7, 0, 0, 0]);
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/plan.test.ts src/weeklist/week.sim.test.ts`
Expected: FAIL. `./plan` doesn't exist, and `PlanInput` has no `lists`.

- [ ] **Step 3: Implement `src/weeklist/plan.ts`**

```ts
// src/weeklist/plan.ts
// The new-word budget with a weekly list (weekly list spec 2026-10-17 §5): front-load the list at pace + 2 (never above the
// ceiling, +2 only after a round that fit), protect his class lane over the week, let catch-up yield; revision is never planned
// away. Pure: the planner and the parent's plan line both use it.
import { PACE_MIN } from '../session/pace';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { CardRecord, WeekList } from '../types';
import { daysBetween } from './dates';
import { itemStatus } from './match';

export const CLOSE_AFTER_DAYS = 7;
export const HEADROOM = 2;

export function activeLists(lists: WeekList[], now: Date): WeekList[] {
  const today = localDateKey(now);
  return lists
    .filter((l) => !l.closedAt && daysBetween(l.homeworkDue, today) <= CLOSE_AFTER_DAYS)
    .sort((a, b) => a.readyBy.localeCompare(b.readyBy) || a.createdAt - b.createdAt);
}

export function listOwner(lists: WeekList[]): Map<string, WeekList> {
  const out = new Map<string, WeekList>();
  for (const l of lists) for (const i of l.items) if (!out.has(i.wordId)) out.set(i.wordId, l);
  return out;
}

export const isReadyByDay = (lists: WeekList[], now: Date) => lists.filter((l) => l.readyBy === localDateKey(now));

export interface ListBudget { listIds: string[]; listQuota: number; total: number; frontLoad: boolean; schoolFirst: number }

export function listBudget(i: {
  lists: WeekList[]; cards: ReadonlyMap<string, CardRecord>; now: Date; pace: number; ceiling: number;
  ranOutYesterday: boolean; ranOutTwice: boolean; backlog: boolean; schoolNeed: number;
}): ListBudget {
  const today = localDateKey(i.now);
  const owner = listOwner(i.lists);
  // unlearned list words, in list order (earliest ready-by first): before their list's ready-by, or after its homework day while
  // the list is still open (decision 7), never on the ready-by day itself
  const listIds: string[] = [];
  let need = 0;
  for (const l of i.lists) {
    const fresh = l.items.filter((it) => owner.get(it.wordId) === l && itemStatus(it.wordId, i.cards) === 'new').map((it) => it.wordId);
    if (!fresh.length || today === l.readyBy) continue;
    listIds.push(...fresh);
    if (today < l.readyBy) need += fresh.length;
  }
  const head = i.ranOutYesterday || i.backlog ? 0 : HEADROOM;
  const rate = Math.min(i.pace + head, Math.max(i.ceiling, i.pace));
  if (i.backlog) {
    const q = Math.min(PACE_MIN, listIds.length);
    return { listIds, listQuota: q, total: q, frontLoad: q > 0, schoolFirst: 0 };
  }
  if (!listIds.length) {
    // after the front-load days: the school lane first, spread to meet schoolNeed by the nearest homework day
    const hw = i.lists.map((l) => l.homeworkDue).filter((d) => d >= today).sort()[0];
    const days = hw ? Math.max(1, daysBetween(today, hw) + 1) : 1;
    return { listIds, listQuota: 0, total: i.pace, frontLoad: false, schoolFirst: Math.min(i.pace, Math.ceil(i.schoolNeed / days)) };
  }
  // before ready-by: front-load at `rate`; two run-outs: spill (pace − 1 today, the rest tomorrow); after homework: the pace
  const quota = Math.min(listIds.length, i.ranOutTwice ? Math.max(1, i.pace - 1) : need ? rate : i.pace);
  return { listIds, listQuota: quota, total: need ? Math.max(rate, quota) : i.pace, frontLoad: need > 0 && quota > 0, schoolFirst: 0 };
}

/** His class lane's unstarted words: his class lesson and the one before (spec §5.3). */
export function schoolNeed(words: { id: string; text: string }[], started: ReadonlySet<string>, classAt: number | null, lessonOf: (w: { id: string; text: string }) => number | undefined): number {
  if (classAt === null) return 0;
  return words.filter((w) => !started.has(w.id) && (lessonOf(w) === classAt || lessonOf(w) === classAt - 1)).length;
}

export const dayAfter = (key: string) => localDateKey(addDays(parseDateKey(key), 1));
```

On the Wednesday case in the test: Wednesday, Thursday and Friday make 3 days, and `ceil(8 / 3) = 3`, so `schoolFirst = 3`. There is no "spread" term: front-loading wants the list's words as early as the rate allows (spec §5.2, as amended at plan time).

- [ ] **Step 4: Teach `pickNewWords` the list**

In `src/session/lanes.ts`:
- change `export type Lane = 'school' | 'catchup' | 'list';`;
- change `laneTag` to return `'本周'` for `'list'`:

```ts
export function laneTag(lane: Lane | undefined, w: Pick<Word, 'id' | 'text'>): string | null {
  if (lane === 'list') return '本周';
  const at = lane ? bookLesson(w) : undefined;
  return lane && at !== undefined ? `${lane === 'school' ? '课本' : '补'} ${lessonLabel(at)}` : null;
}
```

Change the signature and the head of `pickNewWords`:

```ts
export function pickNewWords({ candidates, n, classAt, begunChars, listIds = [], listQuota = 0, schoolFirst = 0 }: {
  candidates: Word[]; n: number; classAt: number | null; begunChars: ReadonlySet<string>;
  listIds?: readonly string[]; listQuota?: number; schoolFirst?: number;
}): { words: Word[]; lanes: Record<string, Lane>; listTaken: string[] } {
```

Before the existing `take(candidates.filter((w) => w.listedAt !== undefined), n);`, add:

```ts
  // a weekly list's words first (weekly list spec §5): up to its quota, a ladder 词语 without the begun-characters gate (the parent
  // wants 街道 this week); one in his class's window counts for his class too (§5.3)
  const listTaken: string[] = [];
  const byId = new Map(candidates.map((w) => [w.id, w]));
  for (const id of listIds) {
    if (listTaken.length >= listQuota || taken.size >= n) break;
    const w = byId.get(id);
    if (!w || taken.has(id)) continue;
    taken.add(id);
    listTaken.push(id);
    const at = bookLesson(w);
    lanes[id] = classAt !== null && (at === classAt || at === classAt - 1) ? 'school' : 'list';
    if (Array.from(w.text).length === 1) begun.add(w.text);
  }
  const listSet = new Set(listIds);
```

Then filter list words out of the later pools: `const rest = candidates.filter((w) => w.listedAt === undefined && !listSet.has(w.id));`. The listed take becomes `take(candidates.filter((w) => w.listedAt !== undefined && !listSet.has(w.id)), n);`.

To protect the school lane, replace `const fromSchool = takeLane(school, Math.ceil(left / 2), 'school');` with:

```ts
  const fromSchool = takeLane(school, Math.max(schoolFirst, Math.ceil(left / 2)), 'school');
```

Return `{ words: candidates.filter((w) => taken.has(w.id)), lanes, listTaken }`.

- [ ] **Step 5: Wire it into `buildSessionPlan`**

In `src/session/plan.ts`:
- import `activeLists`, `isReadyByDay`, `listBudget`, `listOwner`, `schoolNeed` from `../weeklist/plan`;
- import `bookLesson` (already imported) and `WeekList`;
- add to `PlanInput`:

```ts
  lists?: WeekList[]; // weekly lists (weekly list spec 2026-10-17 §5); active ones are picked here
  ranOut?: [boolean, boolean]; // the last two rounds ran out of time (yesterday first): no list headroom, then spill (§5.1)
```

In `buildSessionPlan`, destructure `lists = [], ranOut = [false, false]`, then:

1. After `const cards = …`, add:

```ts
  const open = activeLists(lists, now);
  const owner = listOwner(open);
  const checkToday = new Set(isReadyByDay(open, now).flatMap((l) => l.items.map((i) => i.wordId)));
  const homeworkWindow = (id: string) => { const l = owner.get(id); const d = localDateKey(now); return !!l && d > l.readyBy && d <= l.homeworkDue; };
```

(import `localDateKey` from `../lib/date`.)

2. Change `dueOf` so that the ready-by day's list cards are left for the check, and due list cards in the homework window sort first:

```ts
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff && !(checkToday.has(c.wordId) && c.kind !== 'write' && c.kind !== 'say' && c.kind !== 'sentence'))
      .sort((a, b) => Number(homeworkWindow(b.wordId)) - Number(homeworkWindow(a.wordId)) || a.fsrs.due.getTime() - b.fsrs.due.getTime());
```

3. Replace the `newLimit` / `pickNewWords` lines with:

```ts
  const byCard = new Map(cards.map((c) => [c.id, c]));
  const classAt = classLessonAt(now, settings);
  const budget = extra || !open.length ? null : listBudget({
    lists: open, cards: byCard, now, pace: perDay, ceiling: settings.newPerDay, ranOutYesterday: ranOut[0], ranOutTwice: ranOut[0] && ranOut[1],
    backlog: backlog > BACKLOG_PAUSE, schoolNeed: schoolNeed(active, started, classAt, bookLesson),
  });
  // a backlog pauses new words — but a list's, at most 3 (spec §5.1); new words switched off pause both
  const newLimit = !settings.activities.newwords ? 0 : budget ? budget.total : backlog > BACKLOG_PAUSE ? 0 : perDay;
  const begunChars = new Set(active.filter((w) => started.has(w.id) && Array.from(w.text).length === 1).map((w) => w.text));
  const { words: newWords, lanes: newWordLanes, listTaken } = pickNewWords({
    candidates: active.filter((x) => !started.has(x.id)).sort(newWordOrder), n: newLimit, classAt, begunChars,
    listIds: budget?.listIds ?? [], listQuota: budget?.listQuota ?? 0, schoolFirst: budget?.schoolFirst ?? 0,
  });
```

(delete the old `classAt` and `begunChars` declarations further down, which these replace).

In a backlog pause `budget.total` equals the list quota, so `pickNewWords` takes nothing else.

4. Halve 写一写's characters on a front-load day: change the `target:` argument to `target: budget?.frontLoad ? Math.max(1, Math.floor(writeCharTarget(settings.sessionMinutes) / 2)) : writeCharTarget(settings.sessionMinutes)`.

5. Add `listNewIds: listTaken, frontLoad: budget?.frontLoad ?? false` to the `plan` object, and grow 练一练's box on a front-load day: `practiceTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * PRACTICE_SHARE) + (budget?.frontLoad ? 2 * 60_000 : 0)`.

6. In `extraCards`, take an optional `skip: ReadonlySet<string> = new Set()` and leave those cards alone. In `buildSessionPlan`, pass the ids of lists whose readyBy is tomorrow:

```ts
  const tomorrow = localDateKey(addDays(startOfLocalDay(now), 1));
  const cards = extra ? extraCards(stored, now, new Set(activeLists(lists, now).filter((l) => l.readyBy === tomorrow).flatMap((l) => l.items.map((i) => i.wordId)))) : stored;
```

(with `if (skip.has(c.wordId)) return c;` first inside the `map`).

- [ ] **Step 6: Pass lists from `planNow`**

In `src/session/record.ts` `planNow`, import `allWeekLists` and `ranOut`:

```ts
  const [cards, words, settings, practised, lists, sessions] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db), allWeekLists(db), allSessions(db)]);
  const all = [...words, ...ladderWordsBesides(words)];
  const rounds = sessions.filter((s) => !s.free && s.date < localDateKey(now) && s.completedSteps.includes('practice')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).map(ranOut);
  const ran: [boolean, boolean] = [rounds[0] ?? false, rounds[1] ?? false];
  if (extra) return buildSessionPlan({ cards, words: all, settings, now, practised, extra: true, lists });
  return buildSessionPlan({ cards, words: all, settings, now, practised, newPerDay: await todaysPace(db, now, settings), lists, ranOut: ran });
```

- [ ] **Step 7: Run the tests to make sure they pass, with the existing planner tests**

Run: `npx vitest run src/weeklist/ src/session/ && npx tsc --noEmit`
Expected: PASS. Existing `lanes.test.ts` and `plan.test.ts` must stay green: with no lists, `budget` is null and every path is the old one.

- [ ] **Step 8: Commit**

```bash
git add src/weeklist/plan.ts src/weeklist/plan.test.ts src/weeklist/week.sim.test.ts src/session/lanes.ts src/session/plan.ts src/session/record.ts
git commit -m "Weekly list: front-load the list, protect the class lane, keep revision whole

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ready-by timing, quick checks, and after-check status

**Files:**
- Create: `src/weeklist/schedule.ts`, `src/weeklist/answers.ts`, `src/weeklist/readiness.ts`
- Modify: `src/session/record.ts` (`reviewCard` applies `pinDue`; `startOrResumeSession` brings quick checks forward first)
- Test: `src/weeklist/schedule.test.ts`, `src/weeklist/answers.test.ts`, `src/weeklist/readiness.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3 and 4 (`activeLists`, `listOwner`, `itemStatus`); `bringForward` (`record.ts`); `allWeekLists`, `putWeekList` (repo).
- Produces:
  - `PINNED_KINDS: ReadonlySet<CardKind>` (`recognise`, `hear`, `understand`, `meaning`)
  - `pinDue(card: CardRecord, lists: WeekList[], reviewedAt: Date): CardRecord`
  - `quickCheckDates(list: WeekList, cards: ReadonlyMap<string, CardRecord>, now: Date): Map<string, Date>` (wordId → the front-load day its reading card is brought forward to)
  - `applyQuickChecks(db: AppDb, now: Date): Promise<void>`
  - `formOf(ask: Ask): WeekForm | null`
  - `noteListAnswer(db, wordId, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }): Promise<void>`
  - `isReady(item: WeekItem, list: WeekList): boolean`
  - `isSolid(item: WeekItem, list: WeekList): boolean`
  - `afterCheck(list: WeekList, now: Date): boolean` (now is after the ready-by day, or the check is done)
  - `notSolid(list: WeekList, now: Date): WeekItem[]` (after the check, oldest last answer first)

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/schedule.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import type { WeekList } from '../types';
import { pinDue, quickCheckDates } from './schedule';

const list: WeekList = { id: 'wl:1', name: 'L', createdAt: new Date(2026, 9, 19).getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:a', text: 'a', from: 'grid', addedStatus: 'known' }, { wordId: 'b:b', text: 'b', from: 'grid', addedStatus: 'known' }], pairs: [], fits: [] };
const card = (kind: 'recognise' | 'write', due: Date) => ({ ...makeCard('b:a', kind, due, true), fsrs: { ...makeCard('b:a', kind, due, true).fsrs, stability: 9 } });

describe('pinDue (spec §6.2)', () => {
  const mon = new Date(2026, 9, 19, 18);
  it('a list reading card reviewed before ready-by is due at the start of the ready-by day, stability kept', () => {
    const c = pinDue(card('recognise', new Date(2026, 9, 28)), [list], mon);
    expect(c.fsrs.due).toEqual(new Date(2026, 9, 21));
    expect(c.fsrs.stability).toBe(9);
  });
  it('never a write card, never earlier than its own due, never after ready-by', () => {
    expect(pinDue(card('write', new Date(2026, 9, 28)), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 28));
    expect(pinDue(card('recognise', new Date(2026, 9, 20)), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 20));
    expect(pinDue(card('recognise', new Date(2026, 9, 28)), [list], new Date(2026, 9, 21, 18)).fsrs.due).toEqual(new Date(2026, 9, 28));
  });
  it('the earliest ready-by of two lists', () => {
    const later = { ...list, id: 'wl:2', readyBy: '2026-10-28', homeworkDue: '2026-10-30' };
    expect(pinDue(card('recognise', new Date(2026, 10, 9)), [later, list], mon).fsrs.due).toEqual(new Date(2026, 9, 21));
  });
});

describe('quickCheckDates (spec §6.1)', () => {
  it('spreads known words over the front-load days; leaves one already due before ready-by', () => {
    const cards = new Map([makeCard('b:a', 'recognise', new Date(2026, 10, 9), true), makeCard('b:b', 'recognise', new Date(2026, 9, 20), true)].map((c) => [c.id, c]));
    const d = quickCheckDates(list, cards, new Date(2026, 9, 19, 9));
    expect([...d.keys()]).toEqual(['b:a']);
    expect(d.get('b:a')).toEqual(new Date(2026, 9, 19));
  });
});
```

```ts
// src/weeklist/answers.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allWeekLists, putWeekList } from '../store/repo';
import { freshDb } from '../test/fixtures';
import type { WeekList } from '../types';
import { noteListAnswer } from './answers';
import { isReady, isSolid, notSolid } from './readiness';

const base: WeekList = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:a', text: 'a', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] };
describe('list answers and readiness (spec §8.3, §2.1)', () => {
  it('notes the latest answer per form; ready when every form it can be asked is right', async () => {
    const db = await freshDb();
    await putWeekList(db, base);
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 19, 9));
    const l = (await allWeekLists(db))[0]!;
    expect(l.items[0]!.last?.read?.correct).toBe(true);
    expect(isReady(l.items[0]!, l)).toBe(true); // no English, no fit row, no pair: read is all
  });
  it('after the check: a miss marks missedOn; solid after right answers on two days with no miss since', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...base, check: { at: 0, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: false } }, done: true } });
    await noteListAnswer(db, 'b:a', 'read', false, new Date(2026, 9, 21, 18));
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 22, 18));
    let l = (await allWeekLists(db))[0]!;
    expect([l.items[0]!.missedOn, isSolid(l.items[0]!, l)]).toEqual(['2026-10-21', false]);
    expect(notSolid(l, new Date(2026, 9, 22, 19)).map((i) => i.wordId)).toEqual(['b:a']);
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 23, 18));
    l = (await allWeekLists(db))[0]!;
    expect(isSolid(l.items[0]!, l)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/schedule.test.ts src/weeklist/answers.test.ts`
Expected: FAIL. The modules don't exist yet.

- [ ] **Step 3: Implement `schedule.ts`**

```ts
// src/weeklist/schedule.ts
// Reviews pinned to the ready-by day (weekly list spec 2026-10-17 §6.2) and quick checks for words he knows (§6.1).
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';
import type { AppDb } from '../store/db';
import { allCards, allWeekLists, putCards } from '../store/repo';
import type { CardKind, CardRecord, WeekList } from '../types';
import { itemStatus } from './match';
import { activeLists, listOwner } from './plan';

export const PINNED_KINDS: ReadonlySet<CardKind> = new Set<CardKind>(['recognise', 'hear', 'understand', 'meaning']);

export function pinDue(card: CardRecord, lists: WeekList[], reviewedAt: Date): CardRecord {
  if (!PINNED_KINDS.has(card.kind)) return card;
  const today = localDateKey(reviewedAt);
  const ready = lists.filter((l) => !l.closedAt && l.items.some((i) => i.wordId === card.wordId) && today < l.readyBy).map((l) => l.readyBy).sort()[0];
  if (!ready) return card;
  const pin = parseDateKey(ready); // the start of the ready-by day, which is at least tomorrow
  return card.fsrs.due.getTime() > pin.getTime() ? { ...card, fsrs: { ...card.fsrs, due: pin } } : card;
}

export function quickCheckDates(list: WeekList, cards: ReadonlyMap<string, CardRecord>, now: Date): Map<string, Date> {
  const today = startOfLocalDay(now);
  const ready = parseDateKey(list.readyBy);
  const days = Math.max(1, Math.round((ready.getTime() - today.getTime()) / 86_400_000));
  const front = Math.min(2, days); // the front-load days (§5.4: Mon–Tue); a short week checks them today
  const todo = list.items.filter((i) => {
    const s = itemStatus(i.wordId, cards);
    const c = cards.get(`${i.wordId}:recognise`);
    return (s === 'known' || s === 'placed') && !!c && c.fsrs.due.getTime() >= ready.getTime();
  });
  const out = new Map<string, Date>();
  todo.forEach((i, k) => out.set(i.wordId, addDays(today, Math.floor((k * front) / todo.length))));
  return out;
}

/** Brings each active list's quick checks forward (never later), once a day before the plan is made. */
export async function applyQuickChecks(db: AppDb, now: Date): Promise<void> {
  const lists = activeLists(await allWeekLists(db), now).filter((l) => localDateKey(now) < l.readyBy);
  if (!lists.length) return;
  const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
  const owner = listOwner(lists);
  const moved: CardRecord[] = [];
  for (const l of lists) for (const [wordId, day] of quickCheckDates(l, cards, now)) {
    if (owner.get(wordId) !== l) continue;
    const c = cards.get(`${wordId}:recognise`)!;
    if (c.fsrs.due.getTime() > day.getTime()) moved.push({ ...c, fsrs: { ...c.fsrs, due: day } });
  }
  if (moved.length) await putCards(db, moved);
}
```

In the test, `b:b` is due on 10-20, before ready-by, so it is left alone. `b:a` is the only quick check, and with one item it goes to day 0, Monday.

- [ ] **Step 4: Implement `answers.ts` and `readiness.ts`**

```ts
// src/weeklist/answers.ts
// Every answer on a list word (lessons and the check) updates its item (weekly list spec 2026-10-17 §8.3, §2.1).
import { localDateKey } from '../lib/date';
import type { Ask } from '../session/round';
import type { AppDb } from '../store/db';
import { allWeekLists, putWeekList } from '../store/repo';
import type { WeekForm } from '../types';
import { activeLists } from './plan';

export function formOf(ask: Ask): WeekForm | null {
  if (ask === 'read' || ask === 'listen') return 'read';
  if (ask === 'meaningRead' || ask === 'hear') return 'meaning';
  if (ask === 'fit') return 'fit';
  if (ask === 'match') return 'dapei';
  return null;
}

export async function noteListAnswer(db: AppDb, wordId: string, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }): Promise<void> {
  const day = localDateKey(now);
  for (const l of activeLists(await allWeekLists(db), now)) {
    let changed = false;
    const after = day > l.readyBy || !!l.check?.done;
    const items = l.items.map((it) => {
      if (it.wordId !== wordId) return it;
      changed = true;
      const next = { ...it, last: { ...it.last, [form]: { at: now.getTime(), correct } } };
      if (!after) return next;
      if (!correct) return { ...next, missedOn: day, rightDays: [] };
      return { ...next, rightDays: [...new Set([...(it.rightDays ?? []), day])] };
    });
    const pairs = pair ? l.pairs.map((p) => (p.left === pair.left && p.right === pair.right ? ((changed = true), { ...p, last: { at: now.getTime(), correct } }) : p)) : l.pairs;
    if (changed) await putWeekList(db, { ...l, items, pairs });
  }
}
```

```ts
// src/weeklist/readiness.ts
// Ready (weekly list spec 2026-10-17 §8.3): before the check, every form it can be asked was last answered right; after it, its
// check question was right and nothing since was wrong. Solid (§2.1): passed the check with no miss since, or right on two days.
import { questionMeaning } from '../content/glossary';
import { localDateKey } from '../lib/date';
import type { WeekForm, WeekItem, WeekList, Word } from '../types';

export function formsFor(item: WeekItem, list: WeekList, word?: Word): WeekForm[] {
  const forms: WeekForm[] = ['read'];
  if (word && questionMeaning(word)) forms.push('meaning');
  if (list.fits.some((f) => f.wordId === item.wordId)) forms.push('fit');
  if (list.pairs.some((p) => p.left === item.text || p.right === item.text)) forms.push('dapei');
  return forms;
}

export const afterCheck = (list: WeekList, now: Date) => localDateKey(now) > list.readyBy || !!list.check?.done;

export function isReady(item: WeekItem, list: WeekList, word?: Word): boolean {
  const check = list.check?.results[item.wordId];
  if (check) {
    const since = Object.values(item.last ?? {}).filter((a) => a && a.at > list.check!.at);
    return check.correct && since.every((a) => a!.correct);
  }
  return formsFor(item, list, word).every((f) => item.last?.[f]?.correct === true);
}

export function isSolid(item: WeekItem, list: WeekList): boolean {
  const passed = list.check?.results[item.wordId]?.correct === true && !item.missedOn;
  return passed || (item.rightDays ?? []).length >= 2;
}

export function notSolid(list: WeekList, now: Date): WeekItem[] {
  if (!afterCheck(list, now)) return [];
  const lastAt = (i: WeekItem) => Math.max(0, ...Object.values(i.last ?? {}).map((a) => a?.at ?? 0));
  return list.items.filter((i) => !isSolid(i, list)).sort((a, b) => lastAt(a) - lastAt(b));
}
```

- [ ] **Step 5: Hook `pinDue` and the quick checks into `record.ts`**

In `reviewCard`:

```ts
  const lists = await allWeekLists(db);
  const card: CardRecord = pinDue({ ...(existing ?? {}), id, wordId, kind, fsrs: review(was, rating, now) }, lists, now); // keeps its pass; a list card waits for the ready-by day (weekly list spec §6.2)
```

In `startOrResumeSession`, before `createSessionRecord`: `await applyQuickChecks(db, now);`. Then add to `src/weeklist/schedule.test.ts` an integration case:

```ts
import { recordRecognition } from '../session/record';
import { freshDb } from '../test/fixtures';
import { getCard, putCards, putWeekList } from '../store/repo';
it('a reading answer on a list word before ready-by is pinned', async () => {
  const db = await freshDb();
  await putWeekList(db, list);
  await putCards(db, [makeCard('b:a', 'recognise', new Date(2026, 9, 19, 6), true)]);
  await recordRecognition(db, 'b:a', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
  expect((await getCard(db, 'b:a:recognise'))!.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 21).getTime());
});
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/ src/session/ && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/weeklist/ src/session/record.ts
git commit -m "Weekly list: pin reviews to the ready-by day, quick checks, answers, readiness and solid items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The parent flow — 本周词语

**Files:**
- Create: `src/parent/WeekPanel.tsx`
- Modify: `src/parent/ParentArea.tsx` (`ContentPart` and `ParentPlace` gain `'week'`, first in `PARTS`; `HOME.week = 'content'`; `lastPart` defaults to `'week'`)
- Modify: `src/styles.css` (append a `.week-*` block)
- Test: `src/parent/weekPanel.test.tsx`

**Interfaces:**
- Consumes: `parseWeekList` and `defaultDates` (Task 2); `matchText`, `proposeWrong`, `sentenceFor`, `proposeFit`, `parentSentenceProblems` and `saveWeekList` (Task 3); `listBudget` (Task 4); `allWeekLists`, `deleteWeekList`, `allWords`, `allCards` (repo); `BUILTIN`, `HSK_WORDS` (content); `ladderWordsBesides`.
- Produces: `WeekPanel()` and `planLine(i: { newCount: number; known: number; placed: number; rate: number; days: number; readyBy: string; homeworkDue: string; names: string[] }): string`

- [ ] **Step 1: Write the failing test**

```tsx
// src/parent/weekPanel.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { allWeekLists, allWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { planLine, WeekPanel } from './WeekPanel';

const PASTE = ['> 词语', '跑步 书包 闪闪亮', '> 词语搭配', '早餐', '吃 面包 喝 牛奶 拍 皮球'].join('\n');

describe('WeekPanel (spec §3)', () => {
  it('paste → preview → Add saves a list with default dates and new parent words', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 19, 9) });
    renderWithApp(<WeekPanel />, app);
    fireEvent.input(screen.getByLabelText(/Paste the sheet/), { target: { value: PASTE } });
    fireEvent.click(screen.getByRole('button', { name: 'Read' }));
    expect(await screen.findByText('闪闪亮')).toBeTruthy();
    expect(screen.getByLabelText('Ready by')).toHaveProperty('value', '2026-10-21');
    expect(screen.getByLabelText('Homework due')).toHaveProperty('value', '2026-10-23');
    expect(screen.getByText(/吃 — 面包/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Add/ }));
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    const l = (await allWeekLists(app.db))[0]!;
    expect(l.pairs.map((p) => p.wrong)).toHaveLength(3);
    expect((await allWords(app.db)).find((w) => w.text === '闪闪亮')?.writeable).toBe(false);
  });
  it('a swapped wrong partner is replaced', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 19, 9) });
    renderWithApp(<WeekPanel />, app);
    fireEvent.input(screen.getByLabelText(/Paste the sheet/), { target: { value: PASTE } });
    fireEvent.click(screen.getByRole('button', { name: 'Read' }));
    const chip = (await screen.findAllByRole('button', { name: /✗ / }))[0]!;
    const was = chip.textContent;
    fireEvent.click(chip);
    expect((await screen.findAllByRole('button', { name: /✗ / }))[0]!.textContent).not.toBe(was);
  });
  it('the plan line names the words that will not fit', () => {
    expect(planLine({ newCount: 18, known: 10, placed: 4, rate: 7, days: 2, readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: ['甲', '乙', '丙', '丁'] }))
      .toBe('18 new · 10 he knows (quick check) · 4 to recheck. New words 7 a day for 2 days, check 星期三, homework 星期五. At 7 a day, 4 new words won’t be taught before 星期三: 甲, 乙, 丙, 丁. They’ll still be in the check.');
  });
});
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `npx vitest run src/parent/weekPanel.test.tsx`
Expected: FAIL. `./WeekPanel` doesn't exist.

- [ ] **Step 3: Implement `WeekPanel.tsx`**

```tsx
// src/parent/WeekPanel.tsx
// 本周词语 (weekly list spec 2026-10-17 §3): paste a sheet, check the preview, set the days, add. Lists stay on the iPad.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { BUILTIN, HSK_WORDS } from '../content';
import { ladderWordsBesides } from '../content/ladder';
import { allCards, allWeekLists, allWords, deleteWeekList } from '../store/repo';
import type { WeekFit, WeekList, WeekPair, Word } from '../types';
import { clampReadyBy, daysBetween, defaultDates, weekdayZh } from '../weeklist/dates';
import { proposeWrong } from '../weeklist/dapei';
import { parentSentenceProblems, proposeFit, sentenceFor } from '../weeklist/fit';
import { itemStatus, matchText } from '../weeklist/match';
import { parseWeekList, type DraftPair, type WeekDraft } from '../weeklist/parse';
import { activeLists, HEADROOM } from '../weeklist/plan';
import { saveWeekList } from '../weeklist/save';
import { BLANK } from '../content/sentenceBank';
import { localDateKey } from '../lib/date';

export function planLine(i: { newCount: number; known: number; placed: number; rate: number; days: number; readyBy: string; homeworkDue: string; names: string[] }): string {
  const fit = i.rate * i.days;
  const head = `${i.newCount} new · ${i.known} he knows (quick check) · ${i.placed} to recheck. New words ${i.rate} a day for ${i.days} day${i.days === 1 ? '' : 's'}, check ${weekdayZh(i.readyBy)}, homework ${weekdayZh(i.homeworkDue)}.`;
  return i.newCount > fit ? `${head} At ${i.rate} a day, ${i.names.length} new words won’t be taught before ${weekdayZh(i.readyBy)}: ${i.names.join(', ')}. They’ll still be in the check.` : head;
}

interface PairRow extends DraftPair { wrong: string[]; skipped: Set<string>; on: boolean }
interface FitRow { text: string; fit: WeekFit | null; ok: boolean; own: string; skipped: Set<string> }

export function WeekPanel() {
  const { db, now, settings } = useApp();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<WeekDraft | null>(null);
  const [stored, setStored] = useState<Word[]>([]);
  const [lists, setLists] = useState<WeekList[]>([]);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());
  const [off, setOff] = useState<Set<string>>(new Set());
  const [meaning, setMeaning] = useState<Record<string, string>>({});
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [fits, setFits] = useState<FitRow[]>([]);
  const [name, setName] = useState('');
  const [dates, setDates] = useState(() => defaultDates(now()));
  const [message, setMessage] = useState<string | null>(null);
  const reload = async () => {
    const ws = await allWords(db);
    setStored([...ws, ...ladderWordsBesides(ws)]);
    setLists(await allWeekLists(db));
    const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
    setStatuses(new Map(ws.map((w) => [w.text, itemStatus(w.id, cards)])));
  };
  useEffect(() => { void reload(); }, []);
  const byText = useMemo(() => new Map(stored.map((w) => [w.text, w])), [stored]);
  const chars = useMemo(() => new Set(BUILTIN.map((c) => c.char)), []);
  const isWord = (w: string) => HSK_WORDS.has(w) || chars.has(w) || byText.has(w);

  const read = () => {
    const d = parseWeekList(text, isWord, [...HSK_WORDS.keys()]);
    setDraft(d);
    setName(d.title); // never empty: the sheet's title or a date-based name
    setDates(defaultDates(now()));
    setOff(new Set());
    setPairs(d.pairs.map((p) => ({ ...p, wrong: proposeWrong(p, d.pairs), skipped: new Set(), on: true })));
    const words = d.items.map((it) => matchText(it.text, byText, now().getTime(), () => it.text).word);
    setFits(words.map((w) => {
      const s = sentenceFor(w);
      return { text: w.text, fit: s ? proposeFit(w, words, d.pairs, s) : null, ok: false, own: '', skipped: new Set() };
    }));
    setMessage(null);
  };
  const swapWrong = (i: number, bad: string) => setPairs((ps) => ps.map((p, k) => {
    if (k !== i) return p;
    const skipped = new Set([...p.skipped, bad]);
    return { ...p, skipped, wrong: proposeWrong(p, ps, new Set([...skipped, ...p.wrong.filter((w) => w !== bad)])).slice(0, 1).concat(p.wrong.filter((w) => w !== bad)).slice(0, 3) };
  }));
  const swapDecoy = (i: number, bad: string) => setFits((fs) => fs.map((f, k) => {
    if (k !== i || !f.fit) return f;
    const skipped = new Set([...f.skipped, bad]);
    const w = matchText(f.text, byText, 0, () => f.text).word;
    const mates = (draft?.items ?? []).map((it) => matchText(it.text, byText, 0, () => it.text).word);
    return { ...f, skipped, ok: false, fit: proposeFit(w, mates, draft?.pairs ?? [], { text: f.fit.sentence, source: f.fit.source }, skipped) };
  }));
  const ownSentence = (i: number, s: string) => setFits((fs) => fs.map((f, k) => {
    if (k !== i) return f;
    const w = matchText(f.text, byText, 0, () => f.text).word;
    const mates = (draft?.items ?? []).map((it) => matchText(it.text, byText, 0, () => it.text).word);
    const ok = parentSentenceProblems(s, f.text).length === 0;
    return { ...f, own: s, ok: false, fit: ok ? proposeFit(w, mates, draft?.pairs ?? [], { text: s.replace(f.text, BLANK), source: 'parent' }) : f.fit };
  }));

  const kept = (draft?.items ?? []).filter((it) => !off.has(it.text));
  const counts = { new: 0, known: 0, placed: 0 };
  for (const it of kept) { const s = statuses.get(it.text) ?? 'new'; if (s === 'new' || s === 'learning') counts.new++; else if (s === 'known') counts.known++; else counts.placed++; }
  const pace = settings.pace?.perDay ?? 4;
  const rate = Math.min(pace + HEADROOM, settings.newPerDay);
  const days = Math.max(0, daysBetween(localDateKey(now()), dates.readyBy));
  const newNames = kept.filter((it) => (statuses.get(it.text) ?? 'new') === 'new').map((it) => it.text);

  const add = async () => {
    if (!draft) return;
    const readyBy = clampReadyBy(now(), dates.readyBy, dates.homeworkDue);
    const same = activeLists(lists, now()).find((l) => l.name === name && l.readyBy === readyBy && l.homeworkDue === dates.homeworkDue);
    const l = await saveWeekList(db, {
      name, readyBy, homeworkDue: dates.homeworkDue,
      items: kept.map((it) => ({ text: it.text, from: it.from, ...(meaning[it.text] ? { meaning: meaning[it.text] } : {}), unpause: !off.has(`unpause:${it.text}`) })),
      pairs: pairs.filter((p) => p.on && p.wrong.length === 3).map((p): WeekPair => ({ left: p.left, right: p.right, ...(p.group ? { group: p.group } : {}), wrong: p.wrong as [string, string, string] })),
      fits: fits.filter((f) => f.ok && f.fit && !off.has(f.text)).map((f) => ({ ...f.fit!, wordId: f.text })),
    }, now(), same?.id);
    setMessage(`Added “${l.name}”: ${l.items.length} words, ${l.pairs.length} 搭配, ${l.fits.length} fill-ins. Ready by ${weekdayZh(l.readyBy)}.`);
    setDraft(null);
    setText('');
    await reload();
  };

  return (
    <section class="week">
      <h2 class="parent__section-title">This week’s words (本周词语)</h2>
      {!draft && (
        <>
          <label class="field"><span>Paste the sheet (select its text with Live Text on the photo, then paste)</span>
            <textarea rows={8} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
          </label>
          <button type="button" class="btn" disabled={!text.trim()} onClick={read}>Read</button>
        </>
      )}
      {draft && (
        <div class="week__preview">
          <label class="field"><span>Name</span><input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
          <label class="field"><span>Ready by</span><input type="date" aria-label="Ready by" value={dates.readyBy} onInput={(e) => setDates({ ...dates, readyBy: (e.target as HTMLInputElement).value })} /></label>
          <label class="field"><span>Homework due</span><input type="date" aria-label="Homework due" value={dates.homeworkDue} onInput={(e) => setDates({ ...dates, homeworkDue: (e.target as HTMLInputElement).value })} /></label>
          <h3>Words</h3>
          <ul class="week__items">
            {draft.items.map((it) => {
              const w = byText.get(it.text);
              return (
                <li key={it.text} class={off.has(it.text) ? 'is-off' : ''}>
                  <label><input type="checkbox" checked={!off.has(it.text)} onChange={() => setOff((s) => { const n = new Set(s); n.has(it.text) ? n.delete(it.text) : n.add(it.text); return n; })} /> <span lang="zh">{it.text}</span></label>
                  <span class="week__status">{statuses.get(it.text) ?? 'new'}</span>
                  {it.flags.map((f) => <span key={f} class="week__flag">{f === 'unknown' ? `not a word ZiJi knows${it.suggestion ? ` — did you mean ${it.suggestion}?` : ''}` : f === 'phrase' ? 'phrase — check it' : f === 'blocked' ? it.reason : 'check the pairing'}</span>)}
                  {!w?.meaning && !w && <input placeholder="English (optional, ≤ 4 words)" value={meaning[it.text] ?? ''} onInput={(e) => setMeaning({ ...meaning, [it.text]: (e.target as HTMLInputElement).value })} />}
                  {w?.paused && <label><input type="checkbox" checked={!off.has(`unpause:${it.text}`)} onChange={() => setOff((s) => { const n = new Set(s); const k = `unpause:${it.text}`; n.has(k) ? n.delete(k) : n.add(k); return n; })} /> unpause</label>}
                </li>
              );
            })}
          </ul>
          {draft.unpaired.length > 0 && <p class="week__flag">Unpaired: {draft.unpaired.join(' · ')}</p>}
          <h3>搭配 and their wrong partners</h3>
          <ul class="week__pairs">
            {pairs.map((p, i) => (
              <li key={`${p.left}|${p.right}`}>
                <label><input type="checkbox" checked={p.on} onChange={() => setPairs((ps) => ps.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))} /> <span lang="zh">{p.left} — {p.right}</span></label>
                <button type="button" class="btn btn--ghost" aria-label="swap halves" onClick={() => setPairs((ps) => ps.map((x, k) => (k === i ? { ...x, left: x.right, right: x.left } : x)))}>⇄</button>
                {p.wrong.map((w) => <button key={w} type="button" class="chip" lang="zh" onClick={() => swapWrong(i, w)}>✗ {w}</button>)}
              </li>
            ))}
          </ul>
          <h3>Fill-in questions (选词填空)</h3>
          <button type="button" class="btn btn--ghost" onClick={() => setFits((fs) => fs.map((f) => ({ ...f, ok: !!f.fit })))}>All fine</button>
          <ul class="week__fits">
            {fits.map((f, i) => (
              <li key={f.text}>
                {f.fit ? (
                  <>
                    <span lang="zh">{f.fit.sentence} — {f.text}</span>
                    {f.fit.wrong.map((d) => <button key={d} type="button" class="chip" lang="zh" onClick={() => swapDecoy(i, d)}>✗ {d}</button>)}
                    <button type="button" class="btn btn--ghost" aria-pressed={f.ok} onClick={() => setFits((fs) => fs.map((x, k) => (k === i ? { ...x, ok: !x.ok } : x)))}>{f.ok ? '✓ Fine' : 'Fine'}</button>
                  </>
                ) : (
                  <label><span lang="zh">{f.text}</span>: <input placeholder="A sentence using it (optional)" value={f.own} onInput={(e) => ownSentence(i, (e.target as HTMLInputElement).value)} />
                    {f.own && parentSentenceProblems(f.own, f.text).map((p) => <span key={p} class="week__flag">{p}</span>)}
                  </label>
                )}
              </li>
            ))}
          </ul>
          <p class="week__plan">{planLine({ newCount: counts.new, known: counts.known, placed: counts.placed, rate, days, readyBy: dates.readyBy, homeworkDue: dates.homeworkDue, names: newNames.slice(rate * days) })}</p>
          <button type="button" class="btn btn--primary" onClick={() => void add()}>Add {kept.length} words</button>
          <button type="button" class="btn btn--ghost" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      )}
      {message && <p class="week__message" role="status">{message}</p>}
      <h3>Lists</h3>
      <ul class="week__lists">
        {lists.sort((a, b) => b.createdAt - a.createdAt).map((l) => (
          <li key={l.id}>
            <strong>{l.name}</strong> · ready by {l.readyBy} · homework {l.homeworkDue} · {l.items.length} words{l.closedAt ? ' · closed' : ''}
            <button type="button" class="btn btn--ghost" onClick={async () => { if (confirm('Remove this list? Its words and his progress stay.')) { await deleteWeekList(db, l.id); await reload(); } }}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`days` uses `localDateKey`, never `toISOString`, which is UTC. The swap test needs a third proposal to exist: the fixture's three pairs give two other objects plus `DAPEI` nouns.

- [ ] **Step 4: Add the Content part**

In `src/parent/ParentArea.tsx`:
- `export type ContentPart = 'week' | 'words' | 'import' | 'passages' | 'pictures';`
- `HOME` gains `week: 'content'`;
- `PARTS` starts with `['week', 'This week']`;
- `let lastPart: ContentPart = 'week';`
- render `{part === 'week' && <WeekPanel />}`;
- import `WeekPanel`.

Append to `src/styles.css`:

```css
/* 本周词语 (weekly list spec §3): the parent's preview */
.week__items, .week__pairs, .week__fits, .week__lists { list-style: none; padding: 0; display: grid; gap: 8px; }
.week__items li, .week__pairs li, .week__fits li { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.week__items .is-off { opacity: 0.5; }
.week__flag { font-size: 0.85em; color: var(--ink-warn, #b45309); }
.week__status { font-size: 0.85em; color: var(--ink-soft, #666); }
.week__plan { font-weight: 600; }
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/parent/ && npx tsc --noEmit`
Expected: PASS. `parentArea.test.tsx` must still find the other parts; update any test that expects `Words` to be the default part to click `Words` first.

- [ ] **Step 6: Commit**

```bash
git add src/parent/WeekPanel.tsx src/parent/weekPanel.test.tsx src/parent/ParentArea.tsx src/styles.css
git commit -m "Weekly list: the parent's 本周词语 — paste, preview, wrong partners, fill-ins, dates, add

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The 认新词 word card, verbs through their pairs, and re-teaching cards

**Files:**
- Modify: `src/weeklist/plan.ts` (add `listCardFor`, `reteachIds`)
- Modify: `src/session/plan.ts` (fill `listCards` and `reteachIds`)
- Modify: `src/session/runner.ts` (`createSessionRecord` puts re-teaching cards first)
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (`list?: ListCard` prop; the intro shows the lead pair or word with each syllable over its character, the example row, the mark; `reteach` opens on the intro)
- Modify: `src/audio/speech.ts` (`loneSpoken` takes a `lead` override)
- Modify: `src/app/SessionScreen.tsx` (pass `list={rec.plan.listCards?.[flashWord.id]}`; ask `'read'` for list words in 认新字; never grade a `reteach` item)
- Test: `src/weeklist/listCard.test.ts`, `src/activities/flashcards/wordCard.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 4 and 5 (`notSolid`); `readingOf`; `sentencesFor`; `bankFor`; `fillGap`; `kidGloss`; `glossFor`; `MAX_SENTENCE_CUE`.
- Produces:
  - `leadPair(word: Word, lists: WeekList[]): WeekPair | null`
  - `listCardFor(word: Word, lists: WeekList[], begun: ReadonlySet<string>): ListCard`
  - `reteachIds(lists: WeekList[], now: Date, cap?: number): string[]`
  - `FlashcardStep` prop `list?: ListCard`
  - `MAX_RETEACH = 6`

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/listCard.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { WeekList } from '../types';
import { leadPair, listCardFor, reteachIds } from './plan';

const list: WeekList = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:煎', text: '煎', from: 'both', addedStatus: 'new' }, { wordId: 'p:1', text: '闪闪亮', from: 'grid', addedStatus: 'new' }],
  pairs: [{ left: '煎', right: '鸡蛋', wrong: ['a', 'b', 'c'], reading: 'jiān jī dàn' }], fits: [] };

describe('list word cards (spec §7.1–7.2)', () => {
  it('a verb leads with its pair, at the pair reading, the verb marked', () => {
    const c = listCardFor(makeWord('煎'), [list], new Set());
    expect(c).toMatchObject({ lead: '煎鸡蛋', leadReading: 'jiān jī dàn', mark: [0, 1] });
    expect(leadPair(makeWord('煎'), [list])?.right).toBe('鸡蛋');
  });
  it('a word marks its first unbegun character; none when all are begun', () => {
    expect(listCardFor(makeWord('闪闪亮', { id: 'p:1' }), [list], new Set(['闪'])).mark).toEqual([2, 1]);
    expect(listCardFor(makeWord('闪闪亮', { id: 'p:1' }), [list], new Set(['闪', '亮'])).mark).toBeUndefined();
  });
  it('re-teaching: the day after a miss, at most 6, never two days running without a new miss', () => {
    const missed = { ...list, check: { at: 0, day: '2026-10-21', results: {}, done: true },
      items: list.items.map((i) => ({ ...i, missedOn: '2026-10-21' })) };
    expect(reteachIds([missed], new Date(2026, 9, 22, 9))).toEqual(['b:煎', 'p:1']);
    expect(reteachIds([missed], new Date(2026, 9, 23, 9))).toEqual([]);
  });
});
```

```tsx
// src/activities/flashcards/wordCard.test.tsx
import { screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeAppData, renderWithApp } from '../../test/renderWithApp';
import { makeWord } from '../../test/fixtures';
import { FlashcardStep } from './FlashcardStep';

describe('the 认新词 card (spec §7.1)', () => {
  it('a 3-character word on one line with its example sentence', async () => {
    const app = await makeAppData();
    const w = makeWord('闪闪亮', { id: 'p:1', source: 'parent', pinyin: 'shǎn shǎn liàng', meaning: 'sparkly' });
    const { container } = renderWithApp(<FlashcardStep item={{ wordId: 'p:1', isNew: true, retry: false }} word={w} pool={[w]} voice={false} kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} onDone={vi.fn()} list={{ example: { text: '星星闪闪亮。', pinyin: 'xīng xing shǎn shǎn liàng' }, mark: [2, 1] }} />, app);
    expect(container.querySelector('.hanzi--long')?.getAttribute('style')).toContain('--len:3');
    expect(screen.getByText('sparkly')).toBeTruthy();
    expect(container.querySelector('.intro__example')).toBeTruthy();
  });
  it('a verb shows its pair', async () => {
    const app = await makeAppData();
    const w = makeWord('煎');
    const { container } = renderWithApp(<FlashcardStep item={{ wordId: 'b:煎', isNew: true, retry: false }} word={w} pool={[w]} voice={false} kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} onDone={vi.fn()} list={{ lead: '煎鸡蛋', leadReading: 'jiān jī dàn', mark: [0, 1] }} />, app);
    expect(container.querySelector('.intro__word')?.textContent).toContain('鸡蛋');
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/listCard.test.ts src/activities/flashcards/wordCard.test.tsx`
Expected: FAIL. `listCardFor` is not exported, and FlashcardStep has no `list` prop.

- [ ] **Step 3: Implement `leadPair`, `listCardFor` and `reteachIds` in `src/weeklist/plan.ts`**

```ts
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { glossFor } from '../content/glossary';
import { bankFor, fillGap } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import { readingOf } from '../content/wordGate';
import type { ListCard, WeekPair, Word } from '../types';
import { notSolid } from './readiness';

export const MAX_RETEACH = 6;

export function leadPair(word: Word, lists: WeekList[]): WeekPair | null {
  if (Array.from(word.text).length !== 1) return null;
  for (const l of lists) { const p = l.pairs.find((x) => x.left === word.text); if (p) return p; }
  return null;
}

export function listCardFor(word: Word, lists: WeekList[], begun: ReadonlySet<string>): ListCard {
  const pair = leadPair(word, lists);
  if (pair) {
    const lead = pair.left + pair.right;
    const gloss = [glossFor(pair.left), glossFor(pair.right)].filter(Boolean).join(' ');
    return { lead, leadReading: pair.reading ?? readingOf(lead), ...(gloss ? { leadGloss: gloss } : {}), mark: [0, Array.from(pair.left).length] };
  }
  const chars = Array.from(word.text);
  const at = chars.findIndex((c) => !begun.has(c));
  const ok = (s: string) => s.includes(word.text) && Array.from(s).length <= MAX_SENTENCE_CUE;
  const cls = (word.sentences ?? []).find((s) => ok(s.text));
  const school = sentencesFor(word.text).find((s) => ok(s.zh));
  const bank = bankFor(word.text);
  const text = cls?.text ?? school?.zh ?? (bank ? fillGap(bank.gaps[0], word.text) : undefined);
  return {
    ...(text && ok(text) ? { example: { text, pinyin: cls?.pinyin ?? readingOf(text) } } : {}),
    ...(chars.length > 1 && at >= 0 ? { mark: [at, 1] as [number, number] } : {}),
  };
}

export function reteachIds(lists: WeekList[], now: Date, cap = MAX_RETEACH): string[] {
  const yesterday = localDateKey(addDays(now, -1));
  const out: string[] = [];
  for (const l of lists) for (const it of notSolid(l, now)) if (it.missedOn === yesterday && !out.includes(it.wordId)) out.push(it.wordId);
  return out.slice(0, cap);
}
```

A single character with no begun parts gets no mark, because the card is the character itself.

- [ ] **Step 4: Fill `listCards` and `reteachIds` in `buildSessionPlan`, and put re-teaching cards first in 认新字**

In `src/session/plan.ts`, after `newWords`:

```ts
  const reteach = extra || !open.length ? [] : reteachIds(open, now).filter((id) => byId.has(id) && !newWords.some((w) => w.id === id));
  const listIdsAll = new Set(open.flatMap((l) => l.items.map((i) => i.wordId)));
  const listCards: Record<string, ListCard> = {};
  for (const id of [...reteach, ...newWords.filter((w) => listIdsAll.has(w.id)).map((w) => w.id)]) listCards[id] = listCardFor(byId.get(id)!, open, begunChars);
```

Add `reteachIds: reteach, listCards` to the plan. The `steps` filter keeps `newwords` when `reteach.length > 0` too:

```ts
const steps: StepKind[] = stepsOn(settings).filter((s) => s !== 'newwords' || newWords.length > 0 || reteach.length > 0);
```

In `src/session/runner.ts` `createSessionRecord`:

```ts
  const flashQueue: FlashItem[] = [
    ...(plan.reteachIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: true, reteach: true })),
    ...plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false })),
  ];
```

- [ ] **Step 5: The card itself, in `FlashcardStep.tsx`**

Add `list?: ListCard` to `Props` and pass it to `Intro`. Open on the intro for a re-teaching card:

```ts
  const [phase, setPhase] = useState<Phase>((item.isNew && !item.retry) || item.reteach ? 'intro' : 'quiz');
```

In `Intro({ word, idiom, list })`, the bound-pair branch already lays out a pair with one character marked. Feed it the list's lead when there is one:

```tsx
  const pair = list?.lead ?? boundPair(word.text);
  const pairReading = list?.leadReading ?? (pair ? kidGlossReading(pair) : undefined);
  const pairMark: [number, number] = list?.lead ? list.mark ?? [0, 1] : [Array.from(pair ?? '').indexOf(word.text), 1];
```

Then use them in the bound branch:
- `<Label zh={pair} py={pairReading} mark={pairMark} />`
- `<SpeakButton text={pair} reading={pairReading} />`

In the `long` branch, show the mark: `<Label zh={word.text} py={word.pinyin} mark={list?.mark} />`. Then render the meaning and, under it, the example row:

```tsx
        {(list?.leadGloss ?? cardMeaning(word)) && <p class="intro__en" lang="en">{list?.leadGloss ?? cardMeaning(word)}</p>}
        {list?.example && (
          <p class="intro__example">
            <Label zh={list.example.text} py={list.example.pinyin} mark={[Array.from(list.example.text).indexOf(Array.from(word.text)[0]!), Array.from(word.text).length]} />
            <SpeakButton text={list.example.text} />
          </p>
        )}
```

The bubble for a re-teaching card is `'再认一次！'`: `phase === 'intro' ? (item.reteach ? '再认一次！' : again ? '再看一遍！' : '新字来了！')`. In `introSpoken`'s caller, when `list?.lead` is set, speak the lead first: `speak(list.lead, { reading: list.leadReading })`.

Add to `src/styles.css`:

```css
.intro__example { margin: 8px 0 0; font-size: clamp(18px, 2.6vw, 24px); display: flex; gap: 8px; align-items: center; justify-content: center; }
```

- [ ] **Step 6: Wire it in `SessionScreen.tsx`**

In the `FlashcardStep` element:

```tsx
          ask={step === 'newwords' ? (rec.plan.listNewIds?.includes(flashWord.id) || flashItem.reteach ? 'read' : 'hear') : undefined} // a list word begins on Read (weekly list spec §6.4)
          list={rec.plan.listCards?.[flashWord.id]}
```

In `onFlashDone`, before grading, return early for a `reteach` item: record nothing on the card, only `noteListAnswer(db, id, 'read', r.correct, now())`, then `afterFlashAnswer`. A list word's first 认新字 answer calls `beginNewWord(db, word, 'read', outcome, now())` where it calls `'hear'` today. That is the existing branch on `asked`, with `asked` set from the `ask` prop.

- [ ] **Step 7: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/ src/activities/flashcards/ src/app/ src/session/ && npx tsc --noEmit`
Expected: PASS. The bound-card tests (`boundCard.test.tsx`) must stay green: with no `list`, every value is the old one.

- [ ] **Step 8: Commit**

```bash
git add src/weeklist/plan.ts src/weeklist/listCard.test.ts src/session/plan.ts src/session/runner.ts src/activities/flashcards/ src/app/SessionScreen.tsx src/audio/speech.ts src/styles.css
git commit -m "Weekly list: 认新词 word cards, verbs through their pairs, re-teaching cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: List items in 练一练 — 选词填空, 搭配 and reserved slots

**Files:**
- Create: `src/weeklist/practice.ts`
- Modify: `src/weeklist/plan.ts` (add `listPracticeItems`)
- Modify: `src/session/plan.ts` (fill `listItems`)
- Modify: `src/session/practice.ts` (`planPractice` splices `rec.plan.listItems` with `withList`)
- Modify: `src/practice/pairs.ts` (export `listBoard`)
- Modify: `src/activities/practice/PracticeQuestion.tsx` (a list `fit` item → `UseQuestion` via `fitUseItem`; a list `match` item → `MatchQuestion` with the pair's wrongs, or `PairGame kind="match"` with `listBoard`)
- Modify: `src/app/SessionScreen.tsx` (`onPracticeDone` → `noteListAnswer` for any answer on an active list word; a list 搭配 also rates `recordUse`)
- Test: `src/weeklist/practice.test.ts`, `src/practice/listBoard.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 5 and 7; `fitUseItem` (Task 3); `formsFor`, `notSolid`, `isReady` (Task 5); `buildRound` output (`PracticeItem[]`).
- Produces:
  - `MAX_BOOST = 6`, `MAX_RESERVED = 8`
  - `listPracticeItems(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date, begunIds: ReadonlySet<string>): PracticeItem[]` (reserved items first, then boost)
  - `withList(items: PracticeItem[], list: PracticeItem[], boxItems: number): PracticeItem[]` (reserved always; boost up to `min(MAX_BOOST, floor(items.length / 3), boxItems − items.length)`; spread evenly, never beside the same word, never ahead of the first due items)
  - `listBoard(pairs: WeekPair[], rng: Rng): PairBoard | null`

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/practice.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { PracticeItem } from '../session/round';
import type { WeekList } from '../types';
import { listPracticeItems } from './plan';
import { withList } from './practice';

const item = (wordId: string, due = false): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: due ? 'recognise' : null, retry: false, ...(due ? { due: true } : {}) });
const list: WeekList = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: ['a', 'b', 'c'].map((t) => ({ wordId: `b:${t}`, text: t, from: 'grid' as const, addedStatus: 'new' as const })),
  pairs: [], fits: [{ wordId: 'b:a', sentence: '他＿了。', source: 'parent', wrong: ['b', 'c', 'd'] }] };

describe('list items in 练一练 (spec §6.4, §7.6, §2.1)', () => {
  it('before the check: one boost per begun, not-ready word, its weakest form', () => {
    const ws = new Map(['a', 'b', 'c'].map((t) => [`b:${t}`, makeWord(t)]));
    const xs = listPracticeItems([list], ws, new Date(2026, 9, 20, 9), new Set(['b:a', 'b:b']));
    expect(xs.map((x) => [x.wordId, x.list?.form])).toEqual([['b:a', 'read'], ['b:b', 'read']]);
  });
  it('after the check: every not-solid item gets a reserved item in the form it missed', () => {
    const after = { ...list, check: { at: 1, day: '2026-10-21', results: { 'b:a': { form: 'fit' as const, correct: false } }, done: true },
      items: list.items.map((i) => (i.wordId === 'b:a' ? { ...i, missedOn: '2026-10-21', last: { fit: { at: 2, correct: false } } } : { ...i, last: { read: { at: 2, correct: true } } })) };
    const ws = new Map(['a', 'b', 'c'].map((t) => [`b:${t}`, makeWord(t)]));
    const xs = listPracticeItems([after], ws, new Date(2026, 9, 22, 9), new Set(['b:a', 'b:b', 'b:c']));
    expect(xs[0]).toMatchObject({ wordId: 'b:a', ask: 'fit', list: { form: 'fit', reserved: true } });
  });
  it('reserved items are never cut; boost fits the box and starts after the first due items', () => {
    const round = [item('x1', true), item('x2', true), item('x3'), item('x4'), item('x5'), item('x6')];
    const reserved: PracticeItem = { ...item('b:a'), list: { listId: 'wl:1', form: 'read', reserved: true } };
    const boost: PracticeItem = { ...item('b:b'), list: { listId: 'wl:1', form: 'read' } };
    const out = withList(round, [reserved, boost], 6);
    expect(out.map((x) => x.wordId)).toContain('b:a');
    expect(out.map((x) => x.wordId)).not.toContain('b:b'); // the box is full
    expect(out.findIndex((x) => x.wordId === 'b:a')).toBeGreaterThan(1);
  });
});
```

```ts
// src/practice/listBoard.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { listBoard } from './pairs';

const P = (left: string, right: string, wrong: string[]) => ({ left, right, wrong: wrong as [string, string, string] });
describe('listBoard (spec §7.5)', () => {
  it('only pairs whose every cross pair is a confirmed wrong; one decoy that is wrong for every left', () => {
    const pairs = [P('煎', '鸡蛋', ['皮球', '风筝', '书包']), P('拍', '皮球', ['鸡蛋', '风筝', '书包']), P('放', '风筝', ['鸡蛋', '皮球', '书包'])];
    const b = listBoard(pairs, mulberry32(1))!;
    expect(b.pairs).toHaveLength(3);
    expect(b.decoys?.[1]).toBe('书包');
  });
  it('null when a cross pair is not confirmed wrong', () => {
    expect(listBoard([P('煎', '鸡蛋', ['x', 'y', 'z']), P('炒', '青菜', ['x', 'y', 'z']), P('拍', '皮球', ['x', 'y', 'z'])], mulberry32(1))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/practice.test.ts src/practice/listBoard.test.ts`
Expected: FAIL. `listPracticeItems`, `withList` and `listBoard` don't exist.

- [ ] **Step 3: Implement `listBoard` in `src/practice/pairs.ts`**

```ts
/** A 连一连 board of a weekly list's pairs (weekly list spec 2026-10-17 §7.5): 3–4 pairs whose every cross pair is a confirmed
 *  wrong, and one decoy object that is a confirmed wrong for every left on the board. Null when no such board exists. */
export function listBoard(pairs: { left: string; right: string; wrong: readonly string[] }[], rng: Rng): PairBoard | null {
  const wrong = (l: string, r: string) => pairs.find((p) => p.left === l)?.wrong.includes(r) ?? false;
  const fits = (l: string, r: string) => pairs.some((p) => p.left === l && p.right === r) || !wrong(l, r);
  const order = shuffle(pairs.map((p) => [p.left, p.right] as [string, string]), rng);
  for (const target of order) {
    const b = board(target, order.filter((p) => p !== target), fits, rng);
    if (!b) continue;
    const lefts = b.pairs.map(([l]) => l);
    const decoy = [...new Set(pairs.flatMap((p) => p.wrong))].find((r) => !b.right.includes(r) && lefts.every((l) => wrong(l, r)));
    if (!decoy) return b;
    const at = Math.floor(rng() * (b.right.length + 1));
    return { ...b, right: [...b.right.slice(0, at), decoy, ...b.right.slice(at)], decoys: ['', decoy] };
  }
  return null;
}
```

`board()` already refuses a cross pair that `fits`. A `decoys[0]` of `''` means no left decoy. In `PairGame`, `isDecoy` compares `board.left[...] === ''`, which is never true, so only the right decoy acts as one.

- [ ] **Step 4: Implement `listPracticeItems` in `plan.ts` and `withList` in `practice.ts`**

```ts
// in src/weeklist/plan.ts
import type { PracticeItem } from '../session/round';
import { afterCheck, formsFor, isReady } from './readiness';

export const MAX_BOOST = 6;
export const MAX_RESERVED = 8;
const ASK_OF: Record<WeekForm, PracticeItem['ask']> = { read: 'read', meaning: 'meaningRead', fit: 'fit', dapei: 'match' };

export function listPracticeItems(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date, begunIds: ReadonlySet<string>): PracticeItem[] {
  const owner = listOwner(lists);
  const reserved: PracticeItem[] = [];
  const boost: PracticeItem[] = [];
  const day = localDateKey(now);
  for (const l of lists) {
    if (day === l.readyBy && !l.check?.done) continue; // the check asks them today
    const after = afterCheck(l, now);
    const pool = after ? notSolid(l, now) : l.items.filter((it) => begunIds.has(it.wordId) && !isReady(it, l, words.get(it.wordId)));
    for (const it of pool) {
      if (owner.get(it.wordId) !== l || !words.has(it.wordId)) continue;
      const forms = formsFor(it, l, words.get(it.wordId));
      // the form it missed first (spec §8.2), else the weakest: never answered, then last answered wrong, in read → meaning → fit → 搭配 order
      const missed = after ? (l.check?.results[it.wordId]?.correct === false ? l.check.results[it.wordId]!.form : undefined) : undefined;
      const weakest = forms.find((f) => !it.last?.[f]) ?? forms.find((f) => it.last?.[f]?.correct === false) ?? forms[(it.rightDays?.length ?? 0) % forms.length]!;
      const form = missed && forms.includes(missed) && it.missedOn === localDateKey(addDays(now, -1)) ? missed : weakest;
      const pair = form === 'dapei' ? l.pairs.find((p) => p.left === it.text || p.right === it.text) : undefined;
      const fit = form === 'fit' ? l.fits.find((f) => f.wordId === it.wordId) : undefined;
      const x: PracticeItem = { wordId: it.wordId, rung: form === 'read' || form === 'meaning' ? 1 : 2, ask: ASK_OF[form], grades: null, retry: false,
        list: { listId: l.id, form, ...(pair ? { pair } : {}), ...(fit ? { fit } : {}), ...(after ? { reserved: true as const } : {}) } };
      (after ? reserved : boost).push(x);
    }
  }
  return [...reserved.slice(0, MAX_RESERVED), ...boost];
}
```

```ts
// src/weeklist/practice.ts
// List items in 练一练 (weekly list spec 2026-10-17 §6.4, §7.6, §2.1): interleaved through the round, never beside the same word,
// after its first due items; reserved items (not solid after the check) always come; boost items only as far as the box holds.
import type { PracticeItem } from '../session/round';
import { MAX_BOOST } from './plan';

export function withList(items: PracticeItem[], list: PracticeItem[], boxItems: number): PracticeItem[] {
  const reserved = list.filter((x) => x.list?.reserved);
  const room = Math.max(0, Math.min(MAX_BOOST, Math.floor(items.length / 3), boxItems - items.length - reserved.length));
  const add = [...reserved, ...list.filter((x) => !x.list?.reserved).slice(0, room)];
  const firstNotDue = Math.max(0, items.findIndex((x) => !x.due));
  const out = [...items];
  add.forEach((x, j) => {
    let at = Math.max(firstNotDue, Math.round((out.length * (j + 1)) / (add.length + 1)));
    while (at < out.length && (out[at - 1]?.wordId === x.wordId || out[at]?.wordId === x.wordId)) at++;
    out.splice(at, 0, x);
  });
  return out;
}
```

`boxItems` is how many items the 练一练 box holds at his median item time. `planPractice` estimates it as `Math.floor(rec.plan.practiceTimeBoxMs / 8000)`: 8 s an item, the round's median. In the test, the box is already full with 6 items, so only the reserved one is added.

- [ ] **Step 5: Fill `listItems` and splice them in**

In `buildSessionPlan` (non-extra or extra; both are review):

```ts
  const begunIds = new Set([...started]);
  const listItems = open.length ? listPracticeItems(open, byId, now, begunIds) : [];
```

and add `listItems` to the plan.

In `planPractice` (`src/session/practice.ts`), wrap the final return:

```ts
  const box = Math.floor((rec.plan.practiceTimeBoxMs ?? 5 * 60_000) / 8000);
  const listed = (rec.plan.listItems ?? []).filter((x) => { const w = wordsById.get(x.wordId); return !!w && !w.paused && !today.has(x.wordId); });
  return withList(withSentence(withSay(withFish(graded, fish), say), sentence), listed, box);
```

- [ ] **Step 6: Render list items in `PracticeQuestion.tsx`**

```tsx
  const listFit = useMemo(() => (item.list?.fit ? fitUseItem(item.list.fit, word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const listMatch = useMemo(() => {
    const p = item.list?.pair;
    return p ? { verb: p.left, noun: p.right, options: shuffle([p.right, ...p.wrong], mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) } : null;
  }, [item, word.id]);
```

The existing `use` memo becomes `listFit ?? (item.ask === 'fit' ? fitItem(...) : …)`, and the `match` memo becomes `listMatch ?? (item.ask === 'match' ? dapeiQuestion(...) : null)`. A list board (`item.list?.pairs`) renders:

```tsx
  if (item.list?.pairs) {
    const b = listBoard(item.list.pairs, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0));
    if (!b) return null;
    return <PairGame board={b} kind="match" kid={kid} onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })} />;
  }
```

`MatchQuestion` speaks `question.verb + question.noun`. For a list pair whose card reading differs (`saysVerbAsCard` false), pass `reading={item.list.pair.reading}` to the existing `speak` call: MatchQuestion gains an optional `reading?: string` prop that it forwards as `speak(pair, { reading })`.

- [ ] **Step 7: Record list answers in `SessionScreen.tsx` `onPracticeDone`**

After the grading block (also for `item.grades === null`, since list items grade nothing themselves):

```ts
        const form = item.list?.form ?? formOf(item.ask);
        if (form) await noteListAnswer(db, item.wordId, form, r.correct, now(), item.list?.pair);
        // a list 搭配 or fill-in rates its word's meaning card, the first answer of the day (spec §7.5)
        if (item.list && (form === 'dapei' || form === 'fit') && !rec.extra) know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, r.correct, now(), r.responseMs, state.slow));
        if (item.list && !r.correct && form) await bringForward(db, item.wordId, form === 'read' ? 'recognise' : 'meaning', startOfLocalDay(addDays(now(), 1)));
```

(`recordUse` already rates only the day's first answer.)

- [ ] **Step 8: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/ src/practice/ src/session/ src/activities/practice/ src/app/ && npx tsc --noEmit`
Expected: PASS. With no lists, `listItems` is empty and `withList` returns the round unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/weeklist/ src/practice/pairs.ts src/practice/listBoard.test.ts src/session/ src/activities/ src/app/SessionScreen.tsx
git commit -m "Weekly list: 选词填空, 搭配 and reserved list items interleaved in 练一练

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 考考自己, the Home countdown and the parent's readiness line

**Files:**
- Create: `src/weeklist/check.ts`, `src/app/CheckScreen.tsx`, `src/app/WeekCountdown.tsx`
- Modify: `src/weeklist/readiness.ts` (`readinessLine`, `countdownLine`)
- Modify: `src/app/AppContext.tsx` (`Route` gains `{ name: 'check'; listId: string }`), `src/App.tsx` (renders `CheckScreen`)
- Modify: `src/app/HomeScreen.tsx` (loads lists; renders `WeekCountdown` under the reward card)
- Modify: `src/activities/choose/UseQuestion.tsx`, `src/activities/practice/MatchQuestion.tsx`, `src/activities/practice/PairGame.tsx`, `src/activities/flashcards/FlashcardStep.tsx` (`bare?: boolean`: no pinyin, nothing spoken before the answer, no feedback sheet; PairGame with `bare` has no `SHOW_AFTER`)
- Modify: `src/parent/Dashboard.tsx` (the readiness line per active list, linking to `week`)
- Modify: `src/noErhua.test.ts` (`SCOPE` adds `weeklist`)
- Test: `src/weeklist/check.test.ts`, `src/app/checkScreen.test.tsx`, `src/app/weekCountdown.test.tsx`

**Interfaces:**
- Consumes: everything above; `bringForward` (`record.ts`); `updateKid` (repo, for `bonusStars`).
- Produces:
  - `interface CheckQuestion { key: string; wordId: string | null; form: WeekForm; pair?: WeekPair; pairs?: WeekPair[]; fit?: WeekFit }`
  - `checkQueue(list: WeekList, words: ReadonlyMap<string, Word>, rng: Rng): CheckQuestion[]`
  - `recordCheckAnswer(db, listId: string, q: CheckQuestion, correct: boolean, now: Date): Promise<void>`
  - `finishCheck(db, listId: string, now: Date): Promise<{ right: number; total: number; stars: number }>`
  - `countdownLine(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date): string | null`
  - `readinessLine(list, words, i: { classOnTrack: boolean; classLeft: number; catchupSlower: boolean; reviewsDue: number }): { head: string; line: string; weak: string[] }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/weeklist/check.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { allWeekLists, getCard, getKid, putCards, putWeekList, saveKid } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_KID, type WeekList } from '../types';
import { checkQueue, finishCheck, recordCheckAnswer } from './check';
import { countdownLine } from './readiness';

const list: WeekList = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: ['煎', '鸡蛋', '跑', '书包', '高兴'].map((t, i) => ({ wordId: `p:${i}`, text: t, from: 'grid' as const, addedStatus: 'new' as const })),
  pairs: [{ left: '煎', right: '鸡蛋', wrong: ['书包', '跑', '高兴'] }], fits: [{ wordId: 'p:3', sentence: '我背着＿上学。', source: 'parent', wrong: ['鸡蛋', '跑', '高兴'] }] };
const words = new Map(list.items.map((i) => [i.wordId, makeWord(i.text, { id: i.wordId, source: 'parent', meaning: i.text === '高兴' ? 'happy' : undefined })]));

describe('考考自己 (spec §8.1)', () => {
  it('one question per item; a pair once, from its left half; mixed forms', () => {
    const q = checkQueue(list, words, mulberry32(1));
    expect(q).toHaveLength(4); // 煎/鸡蛋 share the pair question
    expect(new Set(q.map((x) => x.form))).toEqual(new Set(['dapei', 'fit', 'meaning', 'read']));
  });
  it('saves as he goes, finishes with stars only for newly ready items, misses due tomorrow', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    await saveKid(db, { ...DEFAULT_KID });
    await putCards(db, [makeCard('p:2', 'recognise', new Date(2026, 9, 21, 6), true)]);
    const wed = new Date(2026, 9, 21, 17);
    const q = checkQueue(list, words, mulberry32(1));
    for (const x of q) await recordCheckAnswer(db, 'wl:1', x, x.wordId !== 'p:2', wed);
    const r = await finishCheck(db, 'wl:1', wed);
    expect(r).toMatchObject({ right: 3, total: 4 });
    expect((await getKid(db))!.bonusStars).toBe(3);
    expect((await getCard(db, 'p:2:recognise'))!.fsrs.due).toEqual(new Date(2026, 9, 22));
    expect((await allWeekLists(db))[0]!.check?.done).toBe(true);
  });
  it('unopened check: the countdown still says 今天考考自己！ and the cards stay due', () => {
    expect(countdownLine([list], words, new Date(2026, 9, 21, 9))).toBe('今天考考自己！');
  });
});

describe('countdownLine (spec §9)', () => {
  it('counts down to the ready-by weekday, then praises or asks for more, then nothing', () => {
    expect(countdownLine([list], words, new Date(2026, 9, 19, 9))).toBe('星期三前：还有 5 个词');
    const done = { ...list, check: { at: 1, day: '2026-10-21', done: true, results: Object.fromEntries(list.items.map((i) => [i.wordId, { form: 'read' as const, correct: true }])) } };
    expect(countdownLine([done], words, new Date(2026, 9, 22, 9))).toBe('本周词语：5 个都会了！');
    expect(countdownLine([done], words, new Date(2026, 9, 24, 9))).toBeNull();
  });
});
```

```tsx
// src/app/weekCountdown.test.tsx
import { screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { putWeekList } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { WeekCountdown } from './WeekCountdown';

describe('WeekCountdown', () => {
  it('shows the line with pinyin for the nearest list', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 19, 9) });
    await putWeekList(app.db, { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:跑', text: '跑', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] });
    const { container } = renderWithApp(<WeekCountdown />, app);
    expect(await screen.findByText((_, el) => el?.classList.contains('week-countdown') ?? false)).toBeTruthy();
    expect(container.textContent).toContain('星期三前');
  });
});
```

```tsx
// src/app/checkScreen.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { allWeekLists, putWeekList, putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { makeWord } from '../test/fixtures';
import { CheckScreen } from './CheckScreen';

describe('CheckScreen (spec §8.1)', () => {
  it('asks without pinyin, saves each answer, and shows misses only at the end', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 21, 17) });
    await putWords(app.db, [makeWord('跑', { id: 'b:跑', pinyin: 'pǎo' })]);
    await putWeekList(app.db, { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:跑', text: '跑', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] });
    const { container } = renderWithApp(<CheckScreen listId="wl:1" />, app);
    await screen.findByText('跑');
    expect(container.querySelector('.pinyin')).toBeNull();
    fireEvent.click(screen.getAllByRole('button')[1]!); // any choice
    await waitFor(async () => expect(Object.keys((await allWeekLists(app.db))[0]!.check?.results ?? {})).toHaveLength(1));
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/weeklist/check.test.ts src/app/weekCountdown.test.tsx src/app/checkScreen.test.tsx`
Expected: FAIL. The modules don't exist yet.

- [ ] **Step 3: Implement `check.ts`**

```ts
// src/weeklist/check.ts
// 考考自己 on the ready-by day (weekly list spec 2026-10-17 §8.1): one question per item in mixed forms — 搭配, then 选词填空,
// meaning, read — weakest first; saved as he goes; stars only for items newly ready (learning rules #34); misses due tomorrow.
import { questionMeaning } from '../content/glossary';
import { addDays, localDateKey, startOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { bringForward } from '../session/record';
import type { AppDb } from '../store/db';
import { getWeekList, putWeekList, updateKid } from '../store/repo';
import type { WeekFit, WeekForm, WeekList, WeekPair, Word } from '../types';
import { noteListAnswer } from './answers';
import { isReady } from './readiness';

export interface CheckQuestion { key: string; wordId: string | null; form: WeekForm; pair?: WeekPair; pairs?: WeekPair[]; fit?: WeekFit }

export function checkQueue(list: WeekList, words: ReadonlyMap<string, Word>, rng: Rng): CheckQuestion[] {
  const out: CheckQuestion[] = [];
  const covered = new Set<string>();
  const byText = new Map(list.items.map((i) => [i.text, i]));
  for (const p of list.pairs) {
    const owner = byText.get(p.left) ?? byText.get(p.right);
    const key = owner ? owner.wordId : `${p.left}|${p.right}`;
    if (covered.has(key)) continue;
    out.push({ key, wordId: owner?.wordId ?? null, form: 'dapei', pair: p });
    covered.add(key);
    for (const t of [p.left, p.right]) { const it = byText.get(t); if (it) covered.add(it.wordId); }
  }
  // rotate the other forms so the check is mixed (§8.1): fit, meaning, read in turn where each can be asked
  const rotation: WeekForm[] = ['fit', 'meaning', 'read'];
  let turn = 0;
  for (const it of list.items) {
    if (covered.has(it.wordId) || !words.has(it.wordId)) continue;
    const w = words.get(it.wordId)!;
    const can = (f: WeekForm) => f === 'read' || (f === 'meaning' && !!questionMeaning(w)) || (f === 'fit' && list.fits.some((x) => x.wordId === it.wordId));
    let form: WeekForm = 'read';
    for (let k = 0; k < 3; k++) { const f = rotation[(turn + k) % 3]!; if (can(f)) { form = f; break; } }
    turn++;
    out.push({ key: it.wordId, wordId: it.wordId, form, ...(form === 'fit' ? { fit: list.fits.find((x) => x.wordId === it.wordId)! } : {}) });
  }
  // weakest first: not ready before ready ones, then shuffled within (§8.1)
  const ready = (q: CheckQuestion) => { const it = list.items.find((i) => i.wordId === q.wordId); return !!it && isReady(it, list, words.get(it.wordId)); };
  return [...shuffle(out.filter((q) => !ready(q)), rng), ...shuffle(out.filter(ready), rng)];
}

export async function recordCheckAnswer(db: AppDb, listId: string, q: CheckQuestion, correct: boolean, now: Date): Promise<void> {
  const l = await getWeekList(db, listId);
  if (!l) return;
  const check = l.check && l.check.day === localDateKey(now) ? l.check : { at: now.getTime(), day: localDateKey(now), results: {}, done: false };
  await putWeekList(db, { ...l, check: { ...check, results: { ...check.results, [q.key]: { form: q.form, correct } } } });
  if (q.wordId) await noteListAnswer(db, q.wordId, q.form, correct, now, q.pair);
  if (!correct && q.wordId) await bringForward(db, q.wordId, q.form === 'read' ? 'recognise' : 'meaning', startOfLocalDay(addDays(now, 1)));
}

export async function finishCheck(db: AppDb, listId: string, now: Date): Promise<{ right: number; total: number; stars: number }> {
  const l = await getWeekList(db, listId);
  if (!l?.check) return { right: 0, total: 0, stars: 0 };
  const results = Object.entries(l.check.results);
  const right = results.filter(([, r]) => r.correct).length;
  // a star for each item right now that was not ready before the check (its last answers before it, §8.1)
  const before = (wordId: string) => { const it = l.items.find((i) => i.wordId === wordId); return !!it && Object.values(it.last ?? {}).some((a) => a && a.at < l.check!.at) && Object.values(it.last ?? {}).filter((a) => a && a.at < l.check!.at).every((a) => a!.correct); };
  const stars = results.filter(([k, r]) => r.correct && !before(k)).length;
  await putWeekList(db, { ...l, check: { ...l.check, done: true } });
  if (stars) await updateKid(db, (k) => ({ ...k, bonusStars: k.bonusStars + stars }));
  return { right, total: results.length, stars };
}
```

In the test the readiness before the check is empty, so each right answer earns a star: 3.

- [ ] **Step 4: Implement `countdownLine` and `readinessLine` in `readiness.ts`**

```ts
import { activeLists } from './plan';
import { weekdayZh } from './dates';

export function countdownLine(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date): string | null {
  const day = localDateKey(now);
  const l = activeLists(lists, now).find((x) => day <= x.homeworkDue);
  if (!l) return null;
  const left = l.items.filter((i) => !isReady(i, l, words.get(i.wordId))).length;
  if (day < l.readyBy) return `${weekdayZh(l.readyBy)}前：还有 ${left} 个词`;
  if (day === l.readyBy && !l.check?.done) return '今天考考自己！';
  return left ? `还要再看 ${left} 个词` : `本周词语：${l.items.length} 个都会了！`;
}

export function readinessLine(list: WeekList, words: ReadonlyMap<string, Word>, i: { classOnTrack: boolean; classLeft: number; catchupSlower: boolean; reviewsDue: number }): { head: string; line: string; weak: string[] } {
  const ready = list.items.filter((it) => isReady(it, list, words.get(it.wordId))).length;
  const weakItems = list.items.filter((it) => !isReady(it, list, words.get(it.wordId))).map((it) => it.text);
  const weakPairs = list.pairs.filter((p) => p.last && !p.last.correct).map((p) => `${p.left}—${p.right}`);
  const cls = i.classOnTrack ? 'class on track' : `class: ${i.classLeft} left by ${list.homeworkDue}`;
  return {
    head: `${list.name} · ready by ${list.readyBy} · homework ${list.homeworkDue}`,
    line: `List ${ready}/${list.items.length} ready · ${cls}${i.catchupSlower ? ' · catch-up slower this week' : ''} · ${i.reviewsDue} reviews due`,
    weak: [...weakItems, ...weakPairs].slice(0, 5),
  };
}
```

- [ ] **Step 5: Add the `bare` mode to the question components**

Each of `UseQuestion`, `MatchQuestion`, `PairGame` and `FlashcardStep` takes `bare?: boolean`. When it is set:
- **No pinyin:** every `Label` gets `pinyinFor={() => false}`.
- **Nothing spoken** before the answer: skip the `speak(...)` call on show and on pick.
- **No feedback:** the `FeedbackSheet` is replaced by an immediate `onDone`/`onAnswer` + `onNext` call after the pick.
- **PairGame:** misses never reach `SHOW_AFTER`: guard `n >= SHOW_AFTER && !bare`. The board ends when every pair is joined, or when the last free right tile is the decoy.

Each component's existing tests stay as they are; add one `bare` case per component asserting `container.querySelector('.pinyin')` is null.

- [ ] **Step 6: Implement `CheckScreen.tsx`**

```tsx
// src/app/CheckScreen.tsx
// 考考自己 (weekly list spec 2026-10-17 §8.1): the whole list, one question each, no hints; a summary of misses at the end.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FlashcardStep } from '../activities/flashcards/FlashcardStep';
import { UseQuestion } from '../activities/choose/UseQuestion';
import { MatchQuestion } from '../activities/practice/MatchQuestion';
import { ladderWordsBesides } from '../content/ladder';
import { readingOf } from '../content/wordGate';
import { glossFor } from '../content/glossary';
import { mulberry32, shuffle } from '../lib/random';
import { allWords, getWeekList } from '../store/repo';
import type { WeekList, Word } from '../types';
import { Label } from '../ui/Label';
import { checkQueue, finishCheck, recordCheckAnswer, type CheckQuestion } from '../weeklist/check';
import { fitUseItem } from '../weeklist/fit';
import { DEFAULT_KID } from '../types';
import { useApp } from './AppContext';

export function CheckScreen({ listId }: { listId: string }) {
  const { db, now, go, kid } = useApp();
  const [list, setList] = useState<WeekList | null>(null);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [at, setAt] = useState(0);
  const [missed, setMissed] = useState<CheckQuestion[]>([]);
  const [done, setDone] = useState<{ right: number; total: number } | null>(null);
  useEffect(() => { void (async () => {
    const l = await getWeekList(db, listId);
    const ws = await allWords(db);
    setWords(new Map([...ws, ...ladderWordsBesides(ws)].map((w) => [w.id, w])));
    setList(l ?? null);
  })(); }, []);
  const queue = useMemo(() => {
    if (!list) return [];
    const answered = new Set(list.check?.day === undefined ? [] : Object.keys(list.check.results)); // resume where he stopped
    return checkQueue(list, words, mulberry32(list.createdAt >>> 0)).filter((q) => !answered.has(q.key));
  }, [list, words]);
  const q = queue[at];
  const answer = async (correct: boolean) => {
    await recordCheckAnswer(db, listId, q!, correct, now());
    if (!correct) setMissed((m) => [...m, q!]);
    if (at + 1 < queue.length) setAt(at + 1);
    else setDone(await finishCheck(db, listId, now()));
  };
  if (!list) return <div class="screen loading" />;
  if (done || !q) {
    return (
      <div class="screen check check--done">
        <h1><Label zh="考考自己" /></h1>
        {missed.length > 0 && (
          <ul class="pair-summary">
            {missed.map((m) => { const t = m.pair ? m.pair.left + m.pair.right : words.get(m.wordId!)?.text ?? ''; return <li key={m.key} class="pair-summary__row is-missed"><span class="hanzi"><Label zh={t} py={readingOf(t)} /></span> <span lang="en">{glossFor(t)}</span></li>; })}
          </ul>
        )}
        <button type="button" class="btn btn--primary btn--big" onClick={() => go({ name: 'home' })}><Label zh="好了！" /></button>
      </div>
    );
  }
  const k = kid ?? DEFAULT_KID;
  const word = q.wordId ? words.get(q.wordId) : undefined;
  if (q.form === 'dapei' && q.pair) {
    const question = { verb: q.pair.left, noun: q.pair.right, options: shuffle([q.pair.right, ...q.pair.wrong], mulberry32(at + 1)) };
    return <MatchQuestion key={q.key} question={question} kid={k} bare onDone={(r) => void answer(r.correct)} />;
  }
  if (q.form === 'fit' && q.fit && word) return <UseQuestion key={q.key} item={fitUseItem(q.fit, word, mulberry32(at + 1))} kid={k} bare onAnswer={(c) => void answer(c)} onNext={() => {}} />;
  if (!word) { void answer(false); return null; }
  return <FlashcardStep key={q.key} item={{ wordId: word.id, isNew: false, retry: false }} ask={q.form === 'meaning' ? 'meaningRead' : 'read'} word={word} pool={[...words.values()]} voice={false} kid={k} resting="neutral" combo={0} closeupReady={false} bare onDone={(r) => void answer(r.correct)} />;
}
```

When `UseQuestion` is `bare`, its pick calls `onAnswer` then `onNext` at once (Step 5), so `onNext` here is a no-op and `answer` moves on.

Add the route: in `AppContext.tsx`, `| { name: 'check'; listId: string } // 考考自己 (weekly list spec §8.1)`. In `App.tsx`, `route.name === 'check' && <CheckScreen listId={route.listId} />`, next to the other screens.

- [ ] **Step 7: Implement `WeekCountdown.tsx` and put it on Home**

```tsx
// src/app/WeekCountdown.tsx
// The weekly list on Home (weekly list spec 2026-10-17 §9): one gentle line with pinyin; on the ready-by day, the 考考自己 card.
import { useEffect, useState } from 'preact/hooks';
import { ladderWordsBesides } from '../content/ladder';
import { allWeekLists, allWords } from '../store/repo';
import type { WeekList } from '../types';
import { Label } from '../ui/Label';
import { localDateKey } from '../lib/date';
import { activeLists } from '../weeklist/plan';
import { countdownLine } from '../weeklist/readiness';
import { useApp } from './AppContext';

export function WeekCountdown() {
  const { db, now, go } = useApp();
  const [state, setState] = useState<{ line: string; check: WeekList | null } | null>(null);
  useEffect(() => { void (async () => {
    const [lists, ws] = await Promise.all([allWeekLists(db), allWords(db)]);
    const words = new Map([...ws, ...ladderWordsBesides(ws)].map((w) => [w.id, w]));
    const line = countdownLine(lists, words, now());
    const today = localDateKey(now());
    const check = activeLists(lists, now()).find((l) => l.readyBy === today && !l.check?.done) ?? null;
    setState(line ? { line, check } : null);
  })(); }, []);
  if (!state) return null;
  return (
    <div class="week-countdown">
      <Label zh={state.line} />
      {state.check && <button type="button" class="btn btn--primary" onClick={() => go({ name: 'check', listId: state.check!.id })}><Label zh="考考自己" /></button>}
    </div>
  );
}
```

In `HomeScreen.tsx`, render `<WeekCountdown />` inside `.home__cards`, right after the reward card's closing `</div>`. Add to `src/styles.css`:

```css
/* the weekly list on Home (weekly list spec §9): one line, never red */
.week-countdown { display: flex; align-items: center; gap: 10px; font-size: clamp(16px, 2.4vw, 22px); color: var(--ink, #2b2b2b); }
```

- [ ] **Step 8: The Dashboard readiness line**

In `Dashboard.tsx`, load `allWeekLists` with the rest. For each `activeLists(...)` list, render:

```tsx
<div class="dash__week">
  <p><strong>{r.head}</strong></p>
  <p>{r.line}{r.weak.length ? ` — weak: ${r.weak.join(', ')}` : ''}</p>
  <button type="button" class="btn btn--ghost" onClick={() => onNavigate('week')}>Open 本周词语</button>
</div>
```

where `r = readinessLine(l, words, { classOnTrack, classLeft, catchupSlower, reviewsDue })`:
- `reviewsDue`: the due cards counted the way `dueTomorrow` counts, but for today.
- `classLeft`: `schoolNeed(...)` from `src/weeklist/plan.ts`, using `know.words`, the started set and `classLessonAt(now(), settings)`.
- `classOnTrack`: `classLeft <= pace × (days to homework + 1)`.
- `catchupSlower`: true while the list has new words before its ready-by.

- [ ] **Step 9: Widen the no-儿化 scope**

In `src/noErhua.test.ts`: `const SCOPE = /^(app|fun|ui|activities|story|town|weeklist)\/.*\.tsx?$/;`

- [ ] **Step 10: Run the tests to make sure they pass**

Run: `npx vitest run src/weeklist/ src/app/ src/activities/ src/parent/ src/noErhua.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/weeklist/ src/app/ src/App.tsx src/activities/ src/parent/Dashboard.tsx src/noErhua.test.ts src/styles.css
git commit -m "Weekly list: 考考自己, the Home countdown and the parent's readiness line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Backup and restore

**Files:**
- Modify: `src/store/backup.ts`
- Test: `src/store/backup.test.ts` (additions)

**Interfaces:**
- Consumes: `LIST_STORES` (now with `weekLists`), `restoreWithUndo` and `undoRestore` (PR #35).
- Produces:
  - `applyBackup` clears `weekLists` when the file has no `weekLists` store;
  - `readBackup` gives the newer-version message for an unknown store when `file.dbVersion > DB_VERSION`;
  - `BackupPreview.listsMissing: boolean`.

- [ ] **Step 1: Write the failing tests**

```ts
// in src/store/backup.test.ts
import { allWeekLists, putWeekList } from './repo';
import { applyBackup, exportBackup, readBackup, restoreWithUndo, undoRestore } from './backup';

const wl = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [], pairs: [], fits: [] };

describe('weekly lists in backups (weekly list spec §11)', () => {
  it('round-trips lists', async () => {
    const a = await freshDb();
    await putWeekList(a, wl);
    const b = await freshDb();
    await applyBackup(b, readBackup(await exportBackup(a, { includeMedia: false, now: 1 })));
    expect(await allWeekLists(b)).toEqual([wl]);
  });
  it('a pre-v6 backup clears lists; undoing the restore brings them back', async () => {
    const db = await freshDb();
    await putWeekList(db, wl);
    const old = JSON.parse(await exportBackup(await freshDb(), { includeMedia: false, now: 1 }));
    delete old.stores.weekLists;
    old.dbVersion = 5;
    const preview = readBackup(JSON.stringify(old));
    expect(preview.listsMissing).toBe(true);
    await restoreWithUndo(db, preview, new Date(2026, 9, 20));
    expect(await allWeekLists(db)).toEqual([]);
    await undoRestore(db);
    expect(await allWeekLists(db)).toEqual([wl]);
  });
  it('a newer backup with a store this app lacks says to update', () => {
    const file = { format: 'hanzi-buddy-backup', formatVersion: 1, exportedAt: 1, dbVersion: 99, stores: { future: [] }, settings: null, kid: null };
    expect(() => readBackup(JSON.stringify(file))).toThrow(/newer version/);
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/store/backup.test.ts`
Expected: FAIL. `listsMissing` is undefined, the lists survive the old restore, and the newer file says "not a backup".

- [ ] **Step 3: Implement**

In `readBackup`, change the store check:

```ts
  for (const [name, rows] of Object.entries(file.stores)) {
    if (!(LIST_STORES as readonly string[]).includes(name)) throw new BackupError(typeof file.dbVersion === 'number' && file.dbVersion > DB_VERSION ? NEWER : NOT_A_BACKUP);
    if (!Array.isArray(rows)) throw new BackupError(NOT_A_BACKUP);
  }
```

Add `listsMissing: !('weekLists' in file.stores)` to the returned preview and to the `BackupPreview` interface.

In `applyBackup`, after the store loop and before `tx.done`:

```ts
  // a backup from before weekly lists (v6): its words may not have the lists' ids, so the lists go too (weekly list spec §11)
  if (!('weekLists' in file.stores)) ops.push(tx.objectStore('weekLists').clear());
```

In `src/parent/BackupPanel.tsx`, after a restore whose preview had `listsMissing`, show "Weekly lists weren't in this backup."

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/store/ src/parent/ && npx tsc --noEmit`
Expected: PASS, including PR #35's `backupSafety.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/store/backup.ts src/store/backup.test.ts src/parent/BackupPanel.tsx
git commit -m "Weekly list: backups carry lists; an older backup clears them; undo brings them back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Fit and WebKit sweep, and the full suite

**Files:**
- Modify: `scripts/fit-profile.ts` (seed an active list so Home shows the countdown and the 认新字 queue starts with a list word card)
- Modify: `scripts/stage-cases.ts` (add `week-card-abb`, `week-card-pair`, `week-fit`, `week-board`, `check-match` and `check-done`)
- Test: `npm run fit`, plus the WebKit screenshots through `scripts/launch-webkit.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: no new code interfaces. The output is green sweeps and screenshots for the parent.

- [ ] **Step 1: Seed the fit profile**

In `scripts/fit-profile.ts`, after the existing seeds, add an active list with:
- a 3-character parent word (`闪闪亮`);
- a single-character verb with a pair (`煎` + `鸡蛋`, three wrongs);
- a two-character fill-in row.

Set `readyBy` two days after the profile's `now` and `homeworkDue` four days after. Add a second profile variant whose `now` is the ready-by day, so Home shows 「今天考考自己！」 with its button.

```ts
await putWeekList(db, {
  id: 'wl:fit', name: 'Fit list', createdAt: now.getTime(), readyBy: localDateKey(addDays(now, 2)), homeworkDue: localDateKey(addDays(now, 4)),
  items: [{ wordId: 'p:fit-1', text: '闪闪亮', from: 'grid', addedStatus: 'new' }, { wordId: 'b:煎', text: '煎', from: 'both', addedStatus: 'new' }, { wordId: 'b:鸡', text: '鸡', from: 'grid', addedStatus: 'known' }],
  pairs: [{ left: '煎', right: '鸡蛋', wrong: ['皮球', '风筝', '书包'], reading: 'jiān jī dàn' }],
  fits: [],
});
await putWords(db, [{ id: 'p:fit-1', text: '闪闪亮', pinyin: 'shǎn shǎn liàng', meaning: 'sparkly', level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: now.getTime() }]);
```

- [ ] **Step 2: Add the stage cases**

Following the existing entries in `scripts/stage-cases.ts`:
- `week-card-abb`: FlashcardStep intro with `list={{ example: …, mark: [2, 1] }}`.
- `week-card-pair`: `list={{ lead: '煎鸡蛋', … }}`.
- `week-fit`: UseQuestion from `fitUseItem`.
- `week-board`: PairGame `kind="match"` from `listBoard`, with 3 pairs and a decoy.
- `check-match`: MatchQuestion `bare`.
- `check-done`: CheckScreen's summary with 3 misses.

- [ ] **Step 3: Run the fit sweep**

Run: `npm run fit`
Expected: `0 problems` at all six sizes. A problem on the iPhone SE size for the pair card or the countdown line is fixed in CSS:
- the card's `--len` clamp already covers 3–4 characters;
- the countdown wraps under the reward card on narrow widths with `flex-wrap: wrap`.

- [ ] **Step 4: WebKit screenshots**

Run the WebKit pass the repo already uses (`npx tsx scripts/launch-webkit.ts` with the stage cases, as in PR #29 and #34). Check by eye:
- Home with the countdown line, on iPad landscape and iPhone SE;
- the 认新词 card for 闪闪亮 and for 煎鸡蛋;
- the board with its decoy;
- the check with no pinyin anywhere.

Save the shots under `reports/weekly-list/` (git-ignored) for the parent.

- [ ] **Step 5: The whole suite**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass (slow ones included), with no type errors, and the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add scripts/fit-profile.ts scripts/stage-cases.ts src/styles.css
git commit -m "Weekly list: fit profile and stage cases; WebKit and fit sweeps green

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §3 (flow, parsing, dates, matching, preview) | Tasks 2, 3 and 6 |
| §4 (data model, v6) | Task 1 |
| §5.1 (budget: box +2 min, 写一写 half, run-out rules, backlog) | Task 4 |
| §5.2–5.3 (quota, statuses, school lane, catch-up, counted once) | Task 4 |
| §5.4 (the example week) | Task 4's simulation |
| §6.1 (quick checks) | Task 5 |
| §6.2 (pin) | Task 5 |
| §6.3 (window ordering; `extraCards`) | Task 4 |
| §6.4 (boost) | Task 8 |
| §2.1 amendment (re-teaching, reserved slots, solid) | Tasks 5, 7 and 8 |
| §7.1–7.2 (word card, pair lead) | Task 7 |
| §7.3 (选词填空) | Tasks 3 and 8 |
| §7.4–7.5 (搭配 wrongs, board, question) | Tasks 3 and 8 |
| §7.6 (interleaving) | Task 8 |
| §8.1 (the check) | Task 9 |
| §8.2 (misses: tomorrow, same form; 「再看一次」 on homework day) | Tasks 8 and 9. **Gap fixed:** the 1-minute 「再看一次」 Friday card is not in any task. It is optional and ungraded, and the reserved items already practise those words, so it is **deferred**. Note it in the PR as a follow-up rather than growing Task 9. |
| §8.3 (readiness line) | Task 9 |
| §9 (countdown) | Task 9 |
| §10 (two lists) | Tasks 4 and 5 |
| §11 (backup) | Task 10 |
| §12 (testing) | Every task, plus Task 11 |

**2. Placeholder scan**
- No TBD, no "similar to", and no code that has to be corrected afterwards.
- The one deliberate gap is the 「再看一次」 card, deferred above.

**3. Type consistency**
- `WeekForm`, `WeekList`, `WeekItem`, `WeekPair`, `WeekFit`, `ListCard` and `ListAsk` are defined in Task 1 and used with the same fields after.
- `listBudget`'s inputs match `buildSessionPlan`'s call.
- `pickNewWords` returns `listTaken`, which the planner reads.
- `noteListAnswer(db, wordId, form, correct, now, pair?)` is the same in Tasks 5, 8 and 9.
- `formsFor(item, list, word?)` is the same in Tasks 5 and 8.

**4. Review Focus**
- Each of the five lines has its test in the owning task: Task 2 (column-wise), Task 3 (ladder word), Task 10 (pre-v6 + undo), Tasks 4 and 9 (unopened check), Tasks 4 and 5 (two lists).

## Rulings made while planning (for the coordinator)

- **Re-teaching cards** are `FlashItem`s with `retry: true, reteach: true`: shown first in 认新字, asked, never graded. They need no new-word slot or card logic.
- **List answers live on the list record** (`WeekItem.last`, `rightDays`, `missedOn`), not mined from `reviewLogs`. Review logs keep only the day's first rating, but readiness needs every answer.
- **The front-load spread** ("`ceil(remaining ÷ days)` when less") is dropped in favour of the plain front-load rate. Front-loading wants the words as early as possible, so the spread never lowers the quota. The spec's §5.2 is updated to match.
- **「再看一次」 on homework day** (spec §8.2) is deferred, as above.
