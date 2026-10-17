# The parent loop: talk on Today, shared reading, the week summary and one action — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Today opens with one "This week, try this" line. Under the weekly-list readiness line, a 「聊一聊 Talk」 section gives the parent three Mandarin conversation cards a day:
- his words (this week's list first);
- shared reading of today's 朗读 passage (谁 / 为什么 / 你觉得);
- a rotating PSLE theme.

It also has Share, a one-tap 「✓ 聊了」 with minutes and Undo, and a link to a Monday–Sunday **Week summary** on Progress. The summary puts his app progress next to the family's talk time, with one focus line and Share the week.

**Architecture:**
- **Content first.** An 80-starter bank (`src/content/talkPrompts.ts`) is checked by `scripts/check-content.ts`.
- **Two pure modules do the thinking:**
  - `src/talk/pick.ts`: the day's three, swap, the 14-day no-repeat, the word starter and the shared-reading card;
  - `src/talk/week.ts`: the week range, talk sums, the 2-day note, the summary and the focus line.
- **Three thin loaders** read the stores for them: `src/talk/load.ts`, `src/talk/weekLoad.ts`, and `src/talk/tryThis.ts`'s `loadTrySignals`. `load.ts` keeps today's picks in `settings.talkDay` / `settings.talkSeen`.
- **Storage.** A new `talks` store at db **v7** rides in backup, restore and undo through `LIST_STORES`.
- **UI.** Three small components: `TalkSection` (in Today, via a new `talk` slot on `Dashboard`), `WeekSummaryPanel` (first on Progress), and `TryThis` (top of Today). `src/talk/share.ts` wraps `navigator.share` with a clipboard fallback.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), idb 8 + fake-indexeddb, vitest 4 + @testing-library/preact, tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`).

**Spec:** `docs/superpowers/specs/2026-10-12-ziji-parent-loop-design.md`. Read it in full before Task 1, the **2026-10-18 update** first. This plan replaces `docs/superpowers/plans/2026-10-12-ziji-parent-loop.md` (removed: it was written for db v5, a 「聊一聊」 tab and the old 朗读 cycle).

**Base:** `feat/parent-loop` rebased on `origin/main` (fa7ca84), 340 test files green. Every code block below was run against that base while this plan was written. With all nine tasks in, the full suite (349 files, 3,107 tests), `tsc` and the WebKit stage cases passed.

## Global Constraints

- **Who talks:** the parent, who is fluent. Prompts give topics, follow-ups and patterns, **not scripts**. Keep the **English line** on every card (for grandparents and helpers). Never shown to the child; **no streak**.
- **Where:** **no new tab**. The parent area stays at **five tabs** (今天 Today, 进度 Progress, 内容 Content, 奖励 Rewards, 设置 Settings).
  - **Talk** is a section of **Today** under the weekly-list readiness line (`WeekReadiness`).
  - **Week summary** is the first section of **Progress**.
  - **"This week, try this"** is the first thing on Today.
- **The bank:** **80** starters `t01`–`t80`.
  - Themes: 家庭 family, 学校 school, 朋友 friends, 食物 food, 节日 festivals, 新加坡 Singapore, 环境 environment, 科技 technology, 心情与品德 feelings and values, with **at least 6 per theme**.
  - **2–3** `followUps`; **at least one hook**.
  - Patterns exactly: **我觉得…因为…, 先…然后…最后…, 如果…就…, 虽然…但是…, 有时候…有时候…, 我最喜欢…因为…**, each used **≥ 10** times and used in its sample.
  - **Natural Singapore Mandarin, no 儿化** (哪儿, 一会儿, 玩儿, 点儿, 这儿, 那儿), **no yes/no opening**.
  - Han characters: HSK ≤ 3 or the reading lists up to 二下, plus `TALK_ALLOWED = '榴莲刹端粽笼舟'`.
- **The three slots, in order:**
  1. **his words**: this week's list items (not ready first), then the new words his lessons introduced in the **last 7 days**, school lane first;
  2. **shared reading** of the passage read most recently **today or yesterday** while 朗读 is on (**谁 / 为什么 / 你觉得**);
  3. **a theme** not used in the **last 6 days**.

  A slot with nothing of its own takes a theme starter.
- **Stable all day** (`settings.talkDay`). The reading slot follows a passage read after the cards were picked. **「换一个」** gives the slot's next candidate. There is **no repeat within 14 days** unless a kind has nothing else, and what was shown is kept **60 days** (`settings.talkSeen`).
- **「✓ 聊了 We talked」**: optional chips **5, 10, 15 min**; more than once a day; minutes add up; **a double tap logs once**; **Undo for 10 s**.
- **Share:** `navigator.share({ text })`. An AbortError copies nothing and says nothing. Otherwise it copies with **"Copied. Paste it into a message."**, and if neither works it says **"This device could not share or copy it."**
- **The week:** **Monday to Sunday**, with **「上周」** for last week. The focus line is Chinese plus an English line.
- **Data:** the `talks` store at **DB_VERSION 7** (`keyPath: 'id'`, index `byAt`) is in `LIST_STORES`. A pre-v7 backup **keeps this device's talks** (`talksMissing` in the preview). **No migration.**
- TypeScript lib is ES2022: no `findLast` / `findLastIndex` / `toSorted`.
- Parent-area copy is English with Chinese terms (`lang="zh-CN"` on Chinese spans). Every new button is **≥ 44 px** on the phone sizes.
- Screenshots in **WebKit** via playwright-core (installed). If WebKit is missing, stop and ask before `npx playwright-core install webkit`.
- **Out of scope:** push or reminders outside the app, syncing across devices, recording or scoring the talk, a child-facing talk feature, listening clips, 看图说话, 造句.

## Rulings

Each ruling ends with what it costs if it is wrong.

- **Where the Week summary goes.** It is the first section of Progress, not Today. Today is "what to do now" and already holds the overview, the readiness lines, Talk and Listen & confirm. The summary looks back, is read once a week, and sits beside School, Skills and Memory. Today keeps "This week: N days · M min" and a **Week summary** link. *Cost if wrong:* one move of a section.
- **How "his words" are ordered.** List items come from `activeLists(lists, now)` filtered to `today <= homeworkDue`, with **not-ready items first** (`isReady`) and list order kept within. A list item's example is its confirmed 选词填空 row filled in. Class words are `introducedNewWords(session)` of non-free sessions dated in the last 7 days, newest first, lane `school` before others, never lane `list` (already counted). Extra lessons are review-only and never introduce words. *Cost if wrong:* a less useful word first.
- **When a hook matches.** A hook matches when it is the same word (rank 0), a hook word holds his one-character word (爷爷 for 爷, rank 1), or his word holds a hook of **two or more** characters (新年 in 过新年, rank 2). A one-character hook never matches inside a longer list word (新 does not find 新年's starters). *Cost if wrong:* an off-topic starter for a 词语.
- **The shared-reading questions.** 谁 is the passage's 谁 question, else its first non-为什么 question, else 「《title》里有谁？」. 为什么 is its 为什么 question (8 of 88 passages have one), else 「故事里的人为什么这样做？你是从哪一句知道的？」. 你觉得 is `THINK[k]`, one of four.
  - The card id is `r:<passageId>:<k>`, so 「换一个」 and the 14-day rule rotate the 你觉得.
  - `answers` holds the passage's answers (null where open), shown beside the questions and in the shared text.
  - *Cost if wrong:* a generic why on 80 passages.
- **Today's passage.** It is `kid.reading.history`'s entry with the latest `lastRead` that is today or yesterday (ties by id), looked up among parent texts, then built-ins. *Cost if wrong:* yesterday's passage the morning before his lesson.
- **The reading slot follows the passage.** `followPassage` re-picks slot 1 when today's passage differs from the stored card's `passageId` (including a theme fallback picked in the morning). Nothing else changes after the first pick. *Cost if wrong:* a reading card the parent saw in the morning changes in the evening.
- **Picking order.** A slot takes the first candidate not shown 0–13 days ago (`NO_REPEAT_DAYS = 14`), else its least recently shown, never a card on screen. A swap never gives back the card it replaces.
  - Themes: those last used more than 6 days ago (`THEME_GAP_DAYS = 6`) first, then the least recently used, with on-screen themes last.
  - Ties go by a shuffle seeded from the day (`mulberry32(seedFromString(today))`; swaps `today#slot`).
  - Measured: over 28 days, no bank starter repeats within 14 days and all nine themes show within five days.
  - *Cost if wrong:* a starter a day early or late.
- **A pre-v7 backup keeps the talks here.** The talk log is the family's, not his progress, and nothing in it points at words. v6's lists were cleared because their words go. Undo puts back exactly what was there. The preview says so; the status line stays "Backup restored." (so v6's own message test is unchanged). *Cost if wrong:* an old file restored onto a new iPad shows a talk log from this one.
- **The week's numbers:**
  - lessons are completed non-free sessions dated in the week;
  - 朗读 days are sessions whose `completedSteps` includes `'speaking'` (看图说话 is parked, so the speaking step is 朗读);
  - "newly can" is cards whose `recognise` / `write` / `say` `passed` falls in the week;
  - the 朗读 rows are passage takes (not `extra`) in the week, the newest per passage, with its `meaning`;
  - "missed most" is `troubleWords` over every review log in the week, top 5;
  - "waiting" is the queue now.

  *Cost if wrong:* an unrecorded 朗读 has no row (its day is still counted).
- **The focus line** takes the first that applies: a missed 朗读 question; missed words (theme from `themeForWords`); fewer than 3 talk days; new words; a good week. *Cost if wrong:* one line.
- **"Try this" order:**
  1. backup ≥ 30 days;
  2. a list check within 2 days with words not ready;
  3. no talk today or yesterday, or never;
  4. takes waiting;
  5. backup overdue (≥ 14 days, `backupNudgeDays`);
  6. class shortfall (list weeks only, as `WeekReadiness` works it out; over `CLASS_BEHIND_AT` reads "behind his class");
  7. a list further off;
  8. a calm line.

  This is the review's order, with one jump: a month-old backup risks everything. *Cost if wrong:* a less useful first line.
- **Shortcut scrolling.** A shortcut now looks for its section for up to a second (20 × 50 ms). 聊一聊 lives inside the overview, which loads after the top line, so a tap on "Go to 聊一聊" could otherwise find nothing to scroll to. *Cost if wrong:* none (the old shortcuts scroll as before).
- **Dates** in the shared text and the week use `shortDate` ('19 Oct'), not the locale. *Cost if wrong:* none.

## Review Focus

1. **The parent opens Today in the morning, before his lesson.** That evening the reading card should be the passage he just read, while the other two stay as they were. Test in Task 2: `the reading slot follows a passage read after the cards were picked`.
2. **The parent double-taps 「✓ 聊了」.** One talk is logged, with its minutes, and the chip resets. Test in Task 6: `✓ 聊了 with 10 min logs one talk (a double tap too)…`.
3. **The parent opens the share sheet and closes it.** Nothing is copied and no note shows. Test in Task 5: `closing the sheet copies nothing and says nothing`.
4. **Restoring a backup made before v7.** The talks on the iPad stay, and Undo restores exactly what was there. Tests in Task 3: `a backup from before talks keeps the talks here; undoing the restore keeps them too`, and `Parent → Backup: the talk log`.
5. **Late Sunday night, or just after midnight Monday.** The talk and the week land in the right Monday–Sunday week. Test in Task 4: `Monday to Sunday: late Sunday is this week; just after midnight Monday is the next…`.

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/types.ts` | `TalkTheme`, `TalkPrompt`, `TalkKind`, `TalkCard`, `TalkDay`, `TalkLog`; `Settings.talkDay`, `Settings.talkSeen` | 1 |
| `src/content/talkPrompts.ts` (new) | `TALK_THEMES`, `THEME_LABEL`, `THEME_EN`, `TALK_PATTERNS`, `TALK_ALLOWED`, the 80 `TALK_PROMPTS` | 1 |
| `scripts/check-content.ts` (+ test) | `checkTalkPrompts`, `p2Readable` | 1 |
| `src/talk/pick.ts` (new) | `hookRank`, `themeForWords`, `wordStarter`, `THINK`, `readingCard`, `pickDay`, `swapCard`, `followPassage`, `markSeen`, `KIND_LABEL`, `KIND_EN` | 2 |
| `src/talk/load.ts` (new) | `talkWord`, `talkWords`, `todaysPassage`, `todayTalk`, `swapTalk` | 2 |
| `src/store/db.ts`, `repo.ts`, `backup.ts` | the `talks` store (v7); `addTalk`, `deleteTalk`, `talksBetween`, `allTalks`; `talksMissing` | 3 |
| `src/parent/BackupPanel.tsx` | the pre-v7 note | 3 |
| `src/talk/week.ts` (new), `src/talk/weekLoad.ts` (new) | `weekRange`, `talkTotals`, `lastTalkDay`, `talkNudge`, `shortDate`, `summarizeWeek`, `focusLine`; `loadWeek` | 4 |
| `src/talk/share.ts` (new) | `shareText`, `shareNote`, `todayText`, `weekText` | 5 |
| `src/parent/TalkSection.tsx` (new), `Dashboard.tsx`, `ParentArea.tsx` | `TalkCards`, `TalkLogger`, `TalkSection`; the `talk` slot and place | 6 |
| `src/parent/WeekSummaryPanel.tsx` (new), `ParentArea.tsx`, `TalkSection.tsx` | `WeekView`, `WeekSummaryPanel`; the `summary` place; the Week summary link | 7 |
| `src/talk/tryThis.ts` (new), `src/parent/TryThis.tsx` (new), `ParentArea.tsx` | `tryThis`, `loadTrySignals`; `TryThis`, `TryLine`; shortcut scroll retry | 8 |
| `src/styles.css` | talk, week summary, try-this | 6, 7, 8 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | WebKit `talk` case | 9 |

---

### Task 1: The talk-prompt bank, its types and the content check

**Files:**
- Modify: `src/types.ts` (new types before `export interface RewardGoal {`; two `Settings` fields after the `contentVersion` line)
- Create: `src/content/talkPrompts.ts`
- Modify: `scripts/check-content.ts` (first import line; two functions and `ERHUA` at the end)
- Modify: `scripts/check-content.test.ts` (imports; a `describe` at the end)

**Interfaces:**
- Consumes: `BUILTIN` (`src/content`), `moe2024.json` (`lessons: { term, read }[]`), `HAN` (already in `check-content.ts`).
- Produces:
  - types: `TalkTheme`, `TalkPrompt { id; theme; open; en; followUps: string[]; pattern; sample; hooks: string[] }`, `TalkKind = 'word' | 'reading' | 'theme'`, `TalkCard { kind; id; theme?; word?; passageId?; open; en; followUps; pattern; sample; answers?: (string | null)[] }`, `TalkDay { date; cards: TalkCard[] }`, `TalkLog { id; at; minutes? }`, `Settings.talkDay?`, `Settings.talkSeen?: Record<string, string>`;
  - from the bank: `TALK_THEMES`, `THEME_LABEL`, `THEME_EN`, `TALK_PATTERNS` (`as const`), `TALK_ALLOWED`, `TALK_PROMPTS: readonly TalkPrompt[]`;
  - from the check: `checkTalkPrompts(prompts, themes, patterns, readable): string[]`, `p2Readable(chars, lessons, allowed = ''): Set<string>`.

- [ ] **Step 1: Write the failing test**

In `scripts/check-content.test.ts`, replace

```ts
import { checkContent, checkOwnPassages, checkPassageQuestions, questionProblems, topWord, wordProblems } from './check-content';
```

with

```ts
import { TALK_ALLOWED, TALK_PATTERNS, TALK_PROMPTS, TALK_THEMES } from '../src/content/talkPrompts';
import { checkContent, checkOwnPassages, checkPassageQuestions, checkTalkPrompts, p2Readable, questionProblems, topWord, wordProblems } from './check-content';
```

and append:

```ts
describe('talk prompts (parent loop spec §3)', () => {
  const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons, TALK_ALLOWED);
  it('80 starters, at least 6 per theme, every field there, one of the six patterns, P2 characters, no 儿化', () => {
    expect(TALK_PROMPTS).toHaveLength(80);
    expect(checkTalkPrompts(TALK_PROMPTS, TALK_THEMES, TALK_PATTERNS, readable)).toEqual([]);
  });
  it('every pattern is used at least 10 times', () => {
    for (const p of TALK_PATTERNS) expect(TALK_PROMPTS.filter((t) => t.pattern === p).length).toBeGreaterThanOrEqual(10);
  });
  it('flags a duplicate id, a thin starter, an unknown pattern, a hard character, 儿化, a yes/no opening and a thin theme', () => {
    const p = TALK_PROMPTS[0]!;
    const bad = { ...p, open: '你喜欢玩吗？', followUps: ['为什么？'], pattern: '因为…所以…', sample: '我喜欢一会儿去鬱金香公园。' };
    expect(checkTalkPrompts([p, bad], TALK_THEMES, TALK_PATTERNS, readable)).toEqual(expect.arrayContaining([
      'duplicate talk prompt t01', 't01: needs 2–3 follow-ups', 't01: pattern 因为…所以… is not one of the six', 't01: a yes/no opening',
      't01: 儿化', 't01: uses 鬱 beyond P2', 'theme school has 0 starters, expected at least 6',
    ]));
  });
  it('the allow-list is only the Singapore theme words his lists lack', () => {
    const bare = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    expect(Array.from(TALK_ALLOWED).filter((c) => bare.has(c))).toEqual([]);
    expect(TALK_ALLOWED).toBe('榴莲刹端粽笼舟');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run scripts/check-content.test.ts`
Expected: FAIL with `Failed to resolve import "../src/content/talkPrompts"`.

- [ ] **Step 3: The types**

In `src/types.ts`, insert before `export interface RewardGoal {`:

```ts
/** The PSLE conversation themes the talk prompts cover (parent loop spec §3). */
export type TalkTheme = 'family' | 'school' | 'friends' | 'food' | 'festivals' | 'singapore' | 'environment' | 'technology' | 'feelings';

/** A conversation starter for the parent (parent loop spec §3): a topic, follow-ups and a pattern, not a script. */
export interface TalkPrompt {
  id: string; // 't01'…
  theme: TalkTheme;
  open: string; // the opening question, Chinese, P2-level
  en: string; // one English line, for a grandparent or helper
  followUps: string[]; // 2–3 open follow-ups
  pattern: string; // one of TALK_PATTERNS, to nudge toward
  sample: string; // what a P2 answer could sound like
  hooks: string[]; // words it is about: picked for his words (hookRank)
}

/** Which of the day's three a card is (spec §4): his word, shared reading of today's 朗读 passage, a rotating theme. */
export type TalkKind = 'word' | 'reading' | 'theme';

/** One of the day's cards. `id`: a bank starter's ('t07'), a word starter's ('w:借'), a shared-reading card's ('r:p17:2'). */
export interface TalkCard {
  kind: TalkKind;
  id: string;
  theme?: TalkTheme; // bank starters
  word?: string; // kind 'word': the word it is about
  passageId?: string; // kind 'reading'
  open: string;
  en: string;
  followUps: string[];
  pattern: string;
  sample: string; // '' on a shared-reading card: its answers are the passage's
  answers?: (string | null)[]; // kind 'reading': the passage's answer to the open question and each follow-up (null: open-ended)
}

/** The day's picks, stored once made so Today shows the same three all day (spec §4). */
export interface TalkDay { date: string; cards: TalkCard[] }

/** One 「✓ 聊了」 (spec §5): when, and the minutes if a chip was picked. Never shown to the child. */
export interface TalkLog { id: string; at: number; minutes?: number }
```

and in `interface Settings`, after the line `  contentVersion?: string; // the built-in content last written to this install (src/content CONTENT_VERSION)`:

```ts
  talkDay?: TalkDay; // today's three talk cards (parent loop spec §4); another day's are picked afresh
  talkSeen?: Record<string, string>; // each talk card id → the last day it was shown (no repeat within 14 days), kept 60 days
```

(`DEFAULT_SETTINGS` gets nothing: both stay absent until Today first shows the cards.)

- [ ] **Step 4: The bank**

Create `src/content/talkPrompts.ts`. It was written for this app. Every starter was checked with the Step 1 test before it went into this plan: P2 characters, no 儿化, its pattern in its sample, no yes/no opening.

```ts
// The parent's conversation starters (parent loop spec §3, 2026-10-18 update): open questions about his own life across the PSLE
// conversation themes, each with follow-ups, one sentence pattern to nudge toward, and what a P2 answer could sound like. The
// parent is fluent: these are topics, not scripts; the English line is for a grandparent or helper. Singapore Mandarin, no 儿化.
// Characters: HSK 1–3 or his reading lists up to 二下, plus TALK_ALLOWED (scripts/check-content.ts checks it).
import type { TalkPrompt, TalkTheme } from '../types';

export const TALK_THEMES: readonly TalkTheme[] = ['family', 'school', 'friends', 'food', 'festivals', 'singapore', 'environment', 'technology', 'feelings'];

export const THEME_LABEL: Readonly<Record<TalkTheme, string>> = {
  family: '家庭', school: '学校', friends: '朋友', food: '食物', festivals: '节日', singapore: '新加坡', environment: '环境', technology: '科技', feelings: '心情与品德',
};
export const THEME_EN: Readonly<Record<TalkTheme, string>> = {
  family: 'family', school: 'school', friends: 'friends', food: 'food', festivals: 'festivals', singapore: 'Singapore', environment: 'the environment', technology: 'technology', feelings: 'feelings and values',
};

/** The sentence patterns the starters rotate through (spec §3). */
export const TALK_PATTERNS = ['我觉得…因为…', '先…然后…最后…', '如果…就…', '虽然…但是…', '有时候…有时候…', '我最喜欢…因为…'] as const;

/** Singapore theme words beyond his lists: 榴莲, 巴刹, 端午节, 粽子, 灯笼, 龙舟. */
export const TALK_ALLOWED = '榴莲刹端粽笼舟';

export const TALK_PROMPTS: readonly TalkPrompt[] = [
  // 家庭 family
  { id: 't01', theme: 'family', open: '你最喜欢和家里的谁一起玩？你们常常玩什么？', en: 'Who at home do you most like playing with? What do you usually play?', followUps: ['你们常常在哪里玩？', '为什么最喜欢和他一起玩？', '下次你想和他玩什么新的？'], pattern: '我最喜欢…因为…', sample: '我最喜欢和哥哥一起玩，因为他会和我踢球。', hooks: ['玩', '一起'] },
  { id: 't02', theme: 'family', open: '周末的时候，我们一家人常常做什么？', en: 'What does our family usually do at the weekend?', followUps: ['你最喜欢哪一个周末？为什么？', '如果这个周末由你来安排，你想去哪里？'], pattern: '先…然后…最后…', sample: '我们先去公园跑步，然后去小贩中心吃早餐，最后回家看书。', hooks: ['周末', '一家人'] },
  { id: 't03', theme: 'family', open: '你在家里会帮忙做什么家务？', en: 'What chores do you help with at home?', followUps: ['你是怎么做的？一步一步说给我听。', '做完以后，你觉得怎么样？', '你还想学做什么？'], pattern: '先…然后…最后…', sample: '我会帮妈妈洗碗。我先把碗放进水里，然后洗干净，最后放回去。', hooks: ['帮忙', '家务', '洗'] },
  { id: 't04', theme: 'family', open: '说说爷爷奶奶，或者外公外婆。你和他们一起做过什么？', en: 'Tell me about your grandparents. What have you done with them?', followUps: ['他们最喜欢做什么？', '下次见到他们，你想和他们说什么？'], pattern: '有时候…有时候…', sample: '有时候我和奶奶去巴刹买菜，有时候她教我唱歌。', hooks: ['爷爷', '奶奶', '外公', '外婆'] },
  { id: 't05', theme: 'family', open: '你觉得家里谁最好笑？他做过什么好笑的事？', en: 'Who in the family is the funniest? What funny thing have they done?', followUps: ['那时候大家怎么样？', '你做过什么让家人笑的事？'], pattern: '我觉得…因为…', sample: '我觉得爸爸最好笑，因为他会学小狗叫。', hooks: ['笑', '有趣'] },
  { id: 't06', theme: 'family', open: '如果你可以带全家去一个地方玩一天，你想去哪里？', en: 'If you could take the whole family anywhere for a day, where would you go?', followUps: ['我们要怎么去？', '到了那里，我们先做什么？', '谁会最高兴？为什么？'], pattern: '如果…就…', sample: '如果可以，我就带全家去动物园看大象。', hooks: ['如果', '带'] },
  { id: 't07', theme: 'family', open: '每天早上，家里的人都在忙什么？', en: 'What is everyone at home busy with in the morning?', followUps: ['谁最早起床？', '你早上要做哪些事？'], pattern: '先…然后…最后…', sample: '我先刷牙洗脸，然后吃早餐，最后背书包去上学。', hooks: ['早上', '起床', '刷牙'] },
  { id: 't08', theme: 'family', open: '你生病的时候，家里的人是怎么照顾你的？', en: 'When you are ill, how does the family look after you?', followUps: ['那时候你最想吃什么？', '如果家里有人生病了，你会怎么帮他？'], pattern: '如果…就…', sample: '妈妈给我喝水，还给我讲故事。如果妈妈生病，我就给她倒水。', hooks: ['生病', '照顾', '医生'] },
  { id: 't09', theme: 'family', open: '你长大以后想做什么工作？为什么？', en: 'What job do you want when you grow up? Why?', followUps: ['那个工作每天要做什么？', '家里的人做什么工作？你觉得他们的工作怎么样？'], pattern: '我最喜欢…因为…', sample: '我最喜欢当医生，因为医生可以帮助生病的人。', hooks: ['工作', '长大'] },

  // 学校 school
  { id: 't10', theme: 'school', open: '今天在学校，什么事让你最开心？', en: 'What made you happiest at school today?', followUps: ['那时候你在做什么？', '谁和你在一起？', '明天你最想做什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢今天的体育课，因为我们玩了球。', hooks: ['学校', '开心'] },
  { id: 't11', theme: 'school', open: '你最喜欢上什么课？为什么？', en: 'Which lesson do you like best? Why?', followUps: ['那一课的老师是怎么教的？', '哪一课你觉得比较难？难在哪里？'], pattern: '我觉得…因为…', sample: '我觉得美术课最好玩，因为我可以用很多颜色画画。', hooks: ['课', '美术', '华文'] },
  { id: 't12', theme: 'school', open: '休息的时候，你在食堂买什么吃？和谁一起吃？', en: 'At recess, what do you buy at the canteen, and who do you eat with?', followUps: ['你最喜欢哪一家的东西？', '如果钱不够，你会怎么办？'], pattern: '有时候…有时候…', sample: '有时候我买面，有时候我买鸡饭。我常常和小明一起吃。', hooks: ['食堂', '买', '休息'] },
  { id: 't13', theme: 'school', open: '你们班最近有什么好玩的事？', en: 'Has anything fun or funny happened in your class lately?', followUps: ['后来怎么样了？', '大家是怎么说的？'], pattern: '先…然后…最后…', sample: '一只小鸟先飞进课室，然后站在窗口，最后又飞走了。', hooks: ['班', '课室', '同学'] },
  { id: 't14', theme: 'school', open: '如果你当一天老师，你会教同学什么？', en: 'If you were the teacher for a day, what would you teach the class?', followUps: ['你会怎么教？', '同学们做得好，你会怎么说？'], pattern: '如果…就…', sample: '如果我当老师，我就教大家折纸船。', hooks: ['老师', '教'] },
  { id: 't15', theme: 'school', open: '上学的路上，你会看到什么？', en: 'What do you see on the way to school?', followUps: ['你是怎么去学校的？', '路上你最喜欢看什么？'], pattern: '有时候…有时候…', sample: '有时候我看到小狗，有时候我看到很多小鸟在树上。', hooks: ['路上', '上学', '校车'] },
  { id: 't16', theme: 'school', open: '在学校里，什么事让你觉得很难？你是怎么做的？', en: 'What has felt hard at school? What did you do about it?', followUps: ['谁帮了你？', '下次再这样，你会怎么做？'], pattern: '虽然…但是…', sample: '虽然听写很难，但是我每天多写几次，就记住了。', hooks: ['难', '听写', '帮'] },
  { id: 't17', theme: 'school', open: '今天你学了什么新东西？教一教我吧。', en: 'What new thing did you learn today? Teach me.', followUps: ['你是怎么学会的？', '你觉得难不难？为什么？'], pattern: '先…然后…最后…', sample: '今天我学了折纸船。先把纸对折，然后折两个角，最后打开就好了。', hooks: ['学', '新'] },
  { id: 't18', theme: 'school', open: '在班上，你想当什么小帮手？为什么？', en: 'What helper job would you like in class? Why?', followUps: ['那个工作要做些什么？', '你们班的班长是谁？他是怎么帮大家的？'], pattern: '我觉得…因为…', sample: '我想当图书小帮手。我觉得很有意思，因为我可以先看新书。', hooks: ['班长', '帮'] },

  // 朋友 friends
  { id: 't19', theme: 'friends', open: '你最好的朋友是谁？他是一个怎么样的人？', en: 'Who is your best friend? What is he or she like?', followUps: ['你们是怎么认识的？', '你们在一起常常做什么？'], pattern: '我最喜欢…因为…', sample: '我最好的朋友是小明。我最喜欢和他玩，因为他很会讲笑话。', hooks: ['朋友', '好朋友'] },
  { id: 't20', theme: 'friends', open: '你和朋友不高兴的时候，你们会怎么做？', en: 'When you and a friend are upset with each other, what do you do?', followUps: ['上次是为了什么事？', '后来你们是怎么和好的？'], pattern: '虽然…但是…', sample: '虽然我们有时候会生气，但是第二天又一起玩了。', hooks: ['生气', '不高兴'] },
  { id: 't21', theme: 'friends', open: '如果班上来了一个新同学，你会怎么帮他？', en: 'If a new pupil joined your class, how would you help?', followUps: ['他心里可能觉得怎么样？', '你会先和他说什么？'], pattern: '如果…就…', sample: '如果有新同学来，我就带他去看学校，告诉他食堂在哪里。', hooks: ['同学', '新', '帮助'] },
  { id: 't22', theme: 'friends', open: '你和朋友最喜欢玩什么游戏？怎么玩？', en: 'What game do you and your friends like most? How is it played?', followUps: ['谁常常赢？', '有人输了不开心，你们怎么办？'], pattern: '先…然后…最后…', sample: '我们玩跳绳。先两个人拿着绳子，然后大家一个一个跳，最后看谁跳得多。', hooks: ['游戏', '跳绳', '玩'] },
  { id: 't23', theme: 'friends', open: '你觉得好朋友应该是怎么样的？', en: 'What makes a good friend?', followUps: ['你是这样的朋友吗？说一说。', '你的朋友帮过你什么？'], pattern: '我觉得…因为…', sample: '我觉得好朋友会把东西分给别人，因为一起玩更开心。', hooks: ['朋友', '分'] },
  { id: 't24', theme: 'friends', open: '你帮过朋友什么忙？那时候发生了什么事？', en: 'How have you helped a friend? What happened?', followUps: ['他对你说了什么？', '那时候你心里觉得怎么样？'], pattern: '先…然后…最后…', sample: '小红跑步的时候不小心倒在地上。我先扶她起来，然后带她去找老师，最后她对我说谢谢。', hooks: ['帮忙', '谢谢'] },
  { id: 't25', theme: 'friends', open: '如果请朋友来家里玩，你们会做什么？', en: 'If you invited a friend over, what would you do together?', followUps: ['你会请谁？', '你会请他吃什么？'], pattern: '如果…就…', sample: '如果朋友来我家，我就和他一起画画，还请他吃饼干。', hooks: ['请', '客人'] },
  { id: 't26', theme: 'friends', open: '你想玩的和朋友想玩的不一样，你们会怎么办？', en: 'When you and a friend want to play different things, what do you do?', followUps: ['最后大家玩了什么？', '怎么做才能让大家都开心？'], pattern: '有时候…有时候…', sample: '有时候我们玩他想玩的，有时候我们玩我想玩的。', hooks: ['一样', '不一样'] },
  { id: 't27', theme: 'friends', open: '你的朋友有什么地方和你不一样？', en: 'How is your friend different from you?', followUps: ['你喜欢他哪一点？', '你们有什么一样的地方？'], pattern: '虽然…但是…', sample: '虽然他喜欢画画，我喜欢踢球，但是我们都喜欢吃西瓜。', hooks: ['不一样', '喜欢'] },

  // 食物 food
  { id: 't28', theme: 'food', open: '你最喜欢吃什么？那是什么味道的？', en: 'What do you like to eat best? What does it taste like?', followUps: ['你第一次是在哪里吃的？', '如果天天吃，你会觉得怎么样？'], pattern: '我最喜欢…因为…', sample: '我最喜欢吃鸡饭，因为鸡肉很香，饭也很好吃。', hooks: ['吃', '味道', '香'] },
  { id: 't29', theme: 'food', open: '去小贩中心的时候，你最喜欢吃哪一样？', en: 'At the hawker centre, what do you like to eat most?', followUps: ['你会自己去买吗？要怎么说？', '你还想试试什么新的东西？'], pattern: '有时候…有时候…', sample: '有时候我吃面，有时候我吃炒饭，我还喜欢喝果汁。', hooks: ['小贩中心', '饭', '面'] },
  { id: 't30', theme: 'food', open: '你会做什么吃的？是怎么做的？', en: 'What food can you make? How do you make it?', followUps: ['是谁教你的？', '做好以后，谁吃了？'], pattern: '先…然后…最后…', sample: '我会做鸡蛋面包。先拿一片面包，然后放上鸡蛋，最后再放一片面包。', hooks: ['做', '鸡蛋', '面包'] },
  { id: 't31', theme: 'food', open: '有什么东西你不喜欢吃？为什么？', en: "What don't you like to eat? Why?", followUps: ['如果妈妈做了这道菜，你会怎么办？', '你觉得多吃青菜有什么好处？'], pattern: '虽然…但是…', sample: '虽然我不喜欢吃青菜，但是我知道青菜对身体好。', hooks: ['青菜', '菜', '身体'] },
  { id: 't32', theme: 'food', open: '如果你可以开一家小店，你想卖什么好吃的？', en: 'If you could open a little shop, what tasty things would you sell?', followUps: ['你的店叫什么名字？', '一样东西卖多少钱？'], pattern: '如果…就…', sample: '如果我开小店，我就卖各种颜色的果汁。', hooks: ['卖', '店', '钱'] },
  { id: 't33', theme: 'food', open: '说到榴莲，你会想到什么？', en: 'Durian — what comes to mind?', followUps: ['它是什么味道的？', '家里谁最爱吃？谁最怕它？为什么？'], pattern: '我觉得…因为…', sample: '我觉得榴莲很好吃，因为它又香又甜。', hooks: ['榴莲', '水果', '甜'] },
  { id: 't34', theme: 'food', open: '你饿的时候最想吃什么？吃饱了是什么感觉？', en: 'When you are hungry, what do you want most? How does being full feel?', followUps: ['什么时候你最容易饿？', '吃太多会怎么样？'], pattern: '有时候…有时候…', sample: '有时候我饿了想吃面包，有时候想吃水果。吃饱了我就想睡觉。', hooks: ['饿', '饱'] },
  { id: 't35', theme: 'food', open: '我们家的早餐常常吃什么？你最喜欢哪一种？', en: 'What do we usually have for breakfast? Which do you like best?', followUps: ['早上你喜欢喝什么？', '为什么一定要吃早餐？'], pattern: '我最喜欢…因为…', sample: '我最喜欢吃面包和鸡蛋，因为吃了上课就不会饿。', hooks: ['早餐', '早饭', '喝'] },
  { id: 't36', theme: 'food', open: '和家人一起吃饭的时候，我们会说些什么？', en: 'When we eat together as a family, what do we talk about?', followUps: ['你最喜欢在哪里吃饭？', '吃饭的时候要注意什么？'], pattern: '虽然…但是…', sample: '虽然大家都很忙，但是吃饭的时候我们会说学校和工作的事。', hooks: ['一起', '吃饭'] },

  // 节日 festivals
  { id: 't37', theme: 'festivals', open: '过新年的时候，你最喜欢做什么？', en: 'At Chinese New Year, what do you like doing most?', followUps: ['我们会去谁的家拜年？', '拿到红包的时候，你会说什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢过新年，因为可以穿新衣服，还可以拿红包。', hooks: ['新年', '红包', '拜年'] },
  { id: 't38', theme: 'festivals', open: '中秋节的时候，我们一家人做了什么？', en: 'What did our family do at Mid-Autumn?', followUps: ['你喜欢什么样的灯笼？', '你最喜欢什么口味的月饼？'], pattern: '先…然后…最后…', sample: '我们先吃月饼，然后提着灯笼去楼下玩，最后一起看月亮。', hooks: ['中秋', '月饼', '月亮', '灯笼'] },
  { id: 't39', theme: 'festivals', open: '你的生日是怎么过的？', en: 'How do you spend your birthday?', followUps: ['你最想要什么生日礼物？为什么？', '下一个生日，你想怎么过？'], pattern: '如果…就…', sample: '如果过生日，我就请朋友来家里吃蛋糕。', hooks: ['生日', '礼物', '蛋糕'] },
  { id: 't40', theme: 'festivals', open: '新加坡有很多节日。你知道哪些？', en: 'Singapore has many festivals. Which ones do you know?', followUps: ['过那个节日的时候，大家会做什么？', '你的同学过什么节日？'], pattern: '我觉得…因为…', sample: '我觉得新年最热闹，因为大家都回家一起吃团圆饭。', hooks: ['节日'] },
  { id: 't41', theme: 'festivals', open: '国庆日的时候，你看到了什么？', en: 'What did you see on National Day?', followUps: ['你最喜欢看哪一个节目？', '你想对新加坡说什么？'], pattern: '先…然后…最后…', sample: '我们先看飞机飞过，然后看大家唱歌跳舞，最后看烟花。', hooks: ['国庆', '飞机', '烟花'] },
  { id: 't42', theme: 'festivals', open: '端午节的时候，你吃过什么样的粽子？', en: 'At the Dragon Boat Festival, what kinds of rice dumplings have you had?', followUps: ['你知道端午节的故事吗？说给我听。', '如果你在龙舟上，你会怎么做？'], pattern: '如果…就…', sample: '如果我在龙舟上，我就和大家一起用力划。', hooks: ['端午节', '粽子', '龙舟'] },
  { id: 't43', theme: 'festivals', open: '教师节的时候，你想对老师说什么？', en: "On Teachers' Day, what would you like to say to your teacher?", followUps: ['你会送老师什么？', '为什么你想谢谢这位老师？'], pattern: '我觉得…因为…', sample: '我想对老师说谢谢。我觉得她很好，因为她教我们认很多字。', hooks: ['老师', '教师节', '谢谢'] },
  { id: 't44', theme: 'festivals', open: '过新年以前，我们家要做哪些准备？', en: 'Before Chinese New Year, how do we get the home ready?', followUps: ['你帮了什么忙？', '家里会放哪些红色的东西？'], pattern: '先…然后…最后…', sample: '我们先把家里打扫干净，然后去买新衣服，最后在门上贴春联。', hooks: ['新年', '准备', '打扫'] },
  { id: 't45', theme: 'festivals', open: '儿童节的时候，你最想做什么？', en: "On Children's Day, what would you most like to do?", followUps: ['今年儿童节，学校做了什么？', '你想和谁一起过？'], pattern: '虽然…但是…', sample: '虽然儿童节要上学，但是老师给我们看电影，还送我们小礼物。', hooks: ['儿童节'] },

  // 新加坡 Singapore
  { id: 't46', theme: 'singapore', open: '坐地铁或巴士的时候，你会看到什么？', en: 'What do you see when we ride the MRT or the bus?', followUps: ['我们常常坐几个站？', '车上人多的时候，我们要注意什么？'], pattern: '有时候…有时候…', sample: '有时候车上人很多，有时候有位子坐。有老人上车，我会让座。', hooks: ['地铁', '巴士', '让座'] },
  { id: 't47', theme: 'singapore', open: '我们家楼下有什么？你最喜欢去哪里？', en: 'What is there around our block? Where do you like going most?', followUps: ['你在那里常常做什么？', '如果楼下可以多一个地方，你想要什么？'], pattern: '我最喜欢…因为…', sample: '楼下有游乐场和小店。我最喜欢游乐场，因为可以和朋友玩。', hooks: ['楼下', '游乐场', '组屋'] },
  { id: 't48', theme: 'singapore', open: '如果有朋友从外国来新加坡，你会带他去哪里？', en: 'If a friend came to Singapore from abroad, where would you take them?', followUps: ['你会请他吃什么？', '你会教他说哪一句华语？'], pattern: '如果…就…', sample: '如果有朋友来，我就带他去看鱼尾狮，再请他吃鸡饭。', hooks: ['外国', '新加坡', '鱼尾狮'] },
  { id: 't49', theme: 'singapore', open: '下雨天，你最喜欢做什么？', en: 'What do you like doing on a rainy day?', followUps: ['下雨的时候出门，要带什么？', '你喜欢下雨天，还是出太阳的天气？为什么？'], pattern: '我觉得…因为…', sample: '我喜欢下雨天。我觉得很舒服，因为下雨以后就不热了。', hooks: ['下雨', '雨伞', '天气'] },
  { id: 't50', theme: 'singapore', open: '在家里和学校，你会说哪些语言？', en: 'Which languages do you speak at home and at school?', followUps: ['什么时候你会说华语？', '会说几种语言，有什么好处？'], pattern: '有时候…有时候…', sample: '有时候我说英语，有时候我说华语。我和奶奶说华语。', hooks: ['华语', '语言', '说'] },
  { id: 't51', theme: 'singapore', open: '去动物园的时候，你最喜欢看什么动物？', en: 'At the zoo, which animal do you like watching most?', followUps: ['那只动物在做什么？', '如果可以带一只回家，你想要哪一只？为什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢看大象，因为它很大，耳朵也很大。', hooks: ['动物园', '动物', '大象'] },
  { id: 't52', theme: 'singapore', open: '你喜欢新加坡的什么？', en: 'What do you like about Singapore?', followUps: ['如果你去了别的国家，你会想念新加坡的什么？', '你觉得新加坡哪里可以更好？'], pattern: '我觉得…因为…', sample: '我觉得新加坡很干净，因为大家不乱丢东西。', hooks: ['新加坡', '干净'] },
  { id: 't53', theme: 'singapore', open: '我们去巴刹或超市买东西的时候，你最喜欢看什么？', en: 'At the wet market or the supermarket, what do you like looking at?', followUps: ['你会帮忙拿什么？', '如果给你十块钱，你会买什么？'], pattern: '如果…就…', sample: '如果有十块钱，我就买水果和一本小书。', hooks: ['巴刹', '超市', '买'] },
  { id: 't54', theme: 'singapore', open: '去海边或公园的时候，你最喜欢做什么？', en: 'At the beach or the park, what do you like doing most?', followUps: ['你和谁一起去？', '在海边要注意什么？'], pattern: '先…然后…最后…', sample: '我先在沙上画画，然后在水里走一走，最后和爸爸一起吃东西。', hooks: ['海边', '公园'] },

  // 环境 environment
  { id: 't55', theme: 'environment', open: '在家里，我们可以怎么节约用水？', en: 'How can we save water at home?', followUps: ['如果没有水，我们会怎么样？', '我们还可以怎么节约用电？'], pattern: '如果…就…', sample: '刷牙的时候，我会关水龙头。如果不关，水就白白流走了。', hooks: ['节约', '水', '用电'] },
  { id: 't56', theme: 'environment', open: '你在公园里看到过什么小动物和花草？', en: 'What small animals and plants have you seen in the park?', followUps: ['它长什么样子？', '我们可以怎么保护它们？'], pattern: '有时候…有时候…', sample: '有时候我看到小鸟，有时候我看到小猫在树下睡觉。', hooks: ['公园', '花草', '树'] },
  { id: 't57', theme: 'environment', open: '看到地上有别人丢的纸，你会怎么做？', en: 'If you see litter on the ground, what do you do?', followUps: ['为什么不能乱丢东西？', '你觉得大家应该怎么做？'], pattern: '我觉得…因为…', sample: '我会把纸捡起来丢掉。我觉得这样很好，因为地上就干净了。', hooks: ['干净', '丢'] },
  { id: 't58', theme: 'environment', open: '天气很热的时候，你会怎么让自己凉快一点？', en: 'When it is very hot, how do you cool down?', followUps: ['热的时候要多喝什么？', '你觉得天气为什么越来越热？'], pattern: '有时候…有时候…', sample: '有时候我去游泳，有时候我在树下休息。我还会多喝水。', hooks: ['热', '天气', '凉快'] },
  { id: 't59', theme: 'environment', open: '如果你可以种一棵树，你想种在哪里？', en: 'If you could plant a tree, where would you plant it?', followUps: ['你会怎么照顾它？', '树对我们有什么好处？'], pattern: '如果…就…', sample: '如果可以种树，我就种在楼下，每天给它浇水。', hooks: ['树', '种'] },
  { id: 't60', theme: 'environment', open: '家里的旧东西，可以用来做什么？', en: 'What can we make out of old things at home?', followUps: ['你想用旧盒子做什么？', '为什么旧东西不要马上丢掉？'], pattern: '先…然后…最后…', sample: '我用旧盒子做一辆车。先画车门和车窗，然后剪下来，最后在下面贴四个圆。', hooks: ['旧', '盒子', '回收'] },
  { id: 't61', theme: 'environment', open: '下雨以后，外面变成了什么样子？', en: 'After the rain, what is it like outside?', followUps: ['你看到了什么？听到了什么？', '下雨以后，你最想去哪里玩？'], pattern: '虽然…但是…', sample: '虽然地上有很多水，但是天很蓝，树也更绿了。', hooks: ['下雨', '空气'] },
  { id: 't62', theme: 'environment', open: '你最喜欢什么动物？它住在什么地方？', en: 'What is your favourite animal? Where does it live?', followUps: ['它吃什么？', '我们可以怎么帮助它？'], pattern: '我最喜欢…因为…', sample: '我最喜欢小鱼，因为它游来游去很好看。小鱼要住在干净的水里。', hooks: ['动物', '鱼'] },

  // 科技 technology
  { id: 't63', theme: 'technology', open: '你用平板电脑做什么？', en: 'What do you use the iPad for?', followUps: ['你最喜欢用它做哪一件事？为什么？', '你觉得一天用多久比较好？'], pattern: '有时候…有时候…', sample: '有时候我用它学华文，有时候我用它看动画片。', hooks: ['平板', '电脑'] },
  { id: 't64', theme: 'technology', open: '如果你有一个机器人，你想让它帮你做什么？', en: 'If you had a robot, what would you have it do for you?', followUps: ['你会给它取什么名字？', '有什么事你想自己做，不要它帮？'], pattern: '如果…就…', sample: '如果我有机器人，我就让它帮我收拾玩具。', hooks: ['机器人'] },
  { id: 't65', theme: 'technology', open: '看电视或者玩游戏太久，会怎么样？', en: 'What happens if you watch TV or play games for too long?', followUps: ['你最喜欢看什么节目？', '不看电视的时候，你可以做什么？'], pattern: '我觉得…因为…', sample: '我觉得看太久不好，因为眼睛会很累。', hooks: ['电视', '眼睛', '游戏'] },
  { id: 't66', theme: 'technology', open: '你用手机和谁打过电话？你们说了什么？', en: 'Who have you called on the phone? What did you talk about?', followUps: ['你喜欢打电话，还是见面说话？为什么？', '下次你想打电话给谁？'], pattern: '虽然…但是…', sample: '虽然外婆住得很远，但是我们常常打电话。', hooks: ['手机', '电话'] },
  { id: 't67', theme: 'technology', open: '如果家里一个晚上都没有电，我们可以做什么？', en: 'If the home had no electricity for an evening, what could we do?', followUps: ['你会觉得怎么样？', '你觉得家里哪一样电器最有用？'], pattern: '如果…就…', sample: '如果没有电，我们就坐在一起讲故事。', hooks: ['电', '晚上'] },
  { id: 't68', theme: 'technology', open: '你想发明一个什么新东西？它有什么用？', en: 'What new thing would you like to invent? What would it do?', followUps: ['它长什么样子？', '你会先给谁用？'], pattern: '我觉得…因为…', sample: '我想做一个会飞的书包。我觉得它很有用，因为上学就很快了。', hooks: ['发明', '新', '飞'] },
  { id: 't69', theme: 'technology', open: '我们家里有哪些机器帮我们做事？', en: 'Which machines at home do jobs for us?', followUps: ['你会用哪一个？怎么用？', '如果它坏了，我们会怎么办？'], pattern: '先…然后…最后…', sample: '洗衣机帮我们洗衣服。先放衣服，然后关好门，最后按开始。', hooks: ['洗衣机', '机器'] },
  { id: 't70', theme: 'technology', open: '上网的时候，要注意什么？', en: 'What should we be careful about online?', followUps: ['如果看到不好的东西，你会怎么做？', '你会告诉谁？'], pattern: '虽然…但是…', sample: '虽然上网很好玩，但是不能告诉别人我家在哪里。', hooks: ['上网', '网'] },

  // 心情与品德 feelings and values
  { id: 't71', theme: 'feelings', open: '最近你做了什么事，让你觉得自己很了不起？', en: 'What have you done lately that made you proud of yourself?', followUps: ['你是怎么做到的？', '谁看到了？他说了什么？'], pattern: '先…然后…最后…', sample: '我先在家读了很多次，然后在班上读课文，最后大家都给我拍手。', hooks: ['了不起'] },
  { id: 't72', theme: 'feelings', open: '你生气的时候会怎么做？', en: 'What do you do when you are angry?', followUps: ['什么事最让你生气？', '怎么做，你会快一点不生气？'], pattern: '有时候…有时候…', sample: '有时候我会哭，有时候我会去房间里安静地坐一下。', hooks: ['生气', '哭'] },
  { id: 't73', theme: 'feelings', open: '你做错事的时候，会怎么说对不起？', en: 'When you do something wrong, how do you say sorry?', followUps: ['那时候你心里觉得怎么样？', '说了以后，事情变得怎么样？'], pattern: '虽然…但是…', sample: '虽然说对不起很难，但是说了以后我心里就舒服了。', hooks: ['对不起', '错'] },
  { id: 't74', theme: 'feelings', open: '你怕什么？怕的时候你会怎么办？', en: 'What are you afraid of? What do you do when you are scared?', followUps: ['你为什么怕它？', '谁会帮你不怕？'], pattern: '如果…就…', sample: '我怕黑。如果房间很黑，我就开小灯。', hooks: ['怕', '害怕', '黑'] },
  { id: 't75', theme: 'feelings', open: '如果看到同学一个人在哭，你会怎么做？', en: 'If you saw a classmate crying alone, what would you do?', followUps: ['你会对他说什么？', '你难过的时候，希望别人怎么做？'], pattern: '如果…就…', sample: '如果同学在哭，我就问他怎么了，再和他坐一下。', hooks: ['哭', '难过', '同学'] },
  { id: 't76', theme: 'feelings', open: '你觉得一个好孩子要怎么做？', en: 'What do you think a good child does?', followUps: ['在家里呢？', '在巴士上呢？'], pattern: '我觉得…因为…', sample: '我觉得好孩子要说请和谢谢，因为别人听了会很开心。', hooks: ['请', '谢谢'] },
  { id: 't77', theme: 'feelings', open: '你什么时候觉得很累？累的时候你想做什么？', en: 'When do you feel really tired? What do you want to do then?', followUps: ['今天什么事让你累了？', '休息以后，你觉得怎么样？'], pattern: '有时候…有时候…', sample: '有时候踢完球我很累，有时候写字写多了也很累。累了我就想睡觉。', hooks: ['累', '休息'] },
  { id: 't78', theme: 'feelings', open: '这个星期你帮助了谁？他是怎么谢谢你的？', en: 'Whom did you help this week? How did they thank you?', followUps: ['你为什么想帮他？', '帮了别人以后，你的心情怎么样？'], pattern: '我觉得…因为…', sample: '我帮奶奶提东西。我觉得很开心，因为奶奶笑了。', hooks: ['帮助', '心情'] },
  { id: 't79', theme: 'feelings', open: '如果你在地上捡到别人的钱，你会怎么做？', en: 'If you found money someone had dropped, what would you do?', followUps: ['如果是你丢了东西，你会觉得怎么样？', '你会把它交给谁？'], pattern: '如果…就…', sample: '如果我在学校捡到钱，我就交给老师。', hooks: ['捡', '钱'] },
  { id: 't80', theme: 'feelings', open: '有什么事你一开始不会，后来学会了？', en: "What couldn't you do at first, but learned later?", followUps: ['那时候你是怎么练习的？', '你想对还在学的人说什么？'], pattern: '虽然…但是…', sample: '虽然我一开始不会骑脚车，但是我天天练，后来就会了。', hooks: ['学会', '练习'] },
];
```

- [ ] **Step 5: The check**

In `scripts/check-content.ts`, change the first line to:

```ts
import type { BuiltinChar, Passage, PassageQuestion, TalkPrompt, TalkTheme } from '../src/types';
```

and append:

```ts
/** 儿化 the app never says (src/noErhua.test.ts): Singapore usage. */
const ERHUA = /哪儿|一会儿|玩儿|点儿|这儿|那儿/;

/**
 * The talk prompts (parent loop spec §3): unique ids; every field there; 2–3 follow-ups; one of the six patterns, with its
 * first part in the sample; a known theme, at least 6 starters each; an opening that isn't a yes/no question (…吗？); an English
 * line without Chinese; no 儿化; at least one hook; every Han character one a P2 child reads (`readable`).
 */
export function checkTalkPrompts(prompts: readonly TalkPrompt[], themes: readonly TalkTheme[], patterns: readonly string[], readable: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const p of prompts) {
    if (ids.has(p.id)) problems.push(`duplicate talk prompt ${p.id}`);
    ids.add(p.id);
    if (!p.open.trim() || !p.en.trim() || !p.sample.trim()) problems.push(`${p.id}: missing open, en or sample`);
    if (p.followUps.length < 2 || p.followUps.length > 3 || p.followUps.some((f) => !f.trim())) problems.push(`${p.id}: needs 2–3 follow-ups`);
    if (!patterns.includes(p.pattern)) problems.push(`${p.id}: pattern ${p.pattern} is not one of the six`);
    else if (!p.sample.includes(p.pattern.split('…')[0]!)) problems.push(`${p.id}: the sample does not use ${p.pattern}`);
    if (!themes.includes(p.theme)) problems.push(`${p.id}: unknown theme ${p.theme}`);
    if (/吗？$/.test(p.open)) problems.push(`${p.id}: a yes/no opening`);
    if (HAN.test(p.en)) problems.push(`${p.id}: the English line holds Chinese`);
    if (!p.hooks.length) problems.push(`${p.id}: no hooks`);
    const text = [p.open, ...p.followUps, p.sample, ...p.hooks].join('');
    if (ERHUA.test(text)) problems.push(`${p.id}: 儿化`);
    const outside = [...new Set(Array.from(text).filter((ch) => HAN.test(ch) && !readable.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} beyond P2`);
  }
  for (const t of themes) {
    const n = prompts.filter((p) => p.theme === t).length;
    if (n < 6) problems.push(`theme ${t} has ${n} starters, expected at least 6`);
  }
  return problems;
}

/** The characters a P2 child reads, for the talk prompts: HSK 1–3, his reading lists up to 二下, and `allowed`. */
export function p2Readable(chars: readonly BuiltinChar[], lessons: readonly { term: string; read: string }[], allowed = ''): Set<string> {
  const terms = ['一上', '一下', '二上', '二下'];
  return new Set([...chars.filter((c) => c.level <= 3).map((c) => c.char), ...lessons.filter((l) => terms.includes(l.term)).flatMap((l) => Array.from(l.read)), ...Array.from(allowed)]);
}
```

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run scripts/check-content.test.ts && npx tsc --noEmit`
Expected: PASS (29 tests); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/content/talkPrompts.ts scripts/check-content.ts scripts/check-content.test.ts
git commit -m "feat: 80 talk prompts for the parent across the PSLE themes, with a P2 and Singapore-usage check"
```

---

### Task 2: Picking the day's three: his words, shared reading, a theme; kept all day

**Files:**
- Create: `src/talk/pick.ts`, `src/talk/pick.test.ts`
- Create: `src/talk/load.ts`, `src/talk/load.test.ts`

**Interfaces:**
- Consumes:
  - from Task 1: `TALK_PROMPTS`, `TALK_THEMES`, `p2Readable` (in the test); `TalkCard`, `TalkKind`, `TalkPrompt`, `TalkTheme`, `Settings.talkDay` / `talkSeen`;
  - `PassageQuestion` (types); `mulberry32`, `seedFromString`, `shuffle`, `Rng` (`src/lib/random.ts`); `parseDateKey`, `addDays`, `localDateKey`, `startOfLocalDay` (`src/lib/date.ts`);
  - `introducedNewWords` (`src/session/runner.ts`); `cardMeaning` (`src/content/glossary.ts`); `sentenceFor` (`src/weeklist/fit.ts`); `BLANK` (`src/content/sentenceBank.ts`); `ladderWordsBesides` (`src/content/ladder.ts`); `activeLists` (`src/weeklist/plan.ts`); `isReady` (`src/weeklist/readiness.ts`); `PASSAGES`, `PASSAGE_QUESTIONS`;
  - store calls: `allWords`, `allWeekLists`, `allSessions`, `getKid`, `getSettings`, `updateSettings`, `listParentPassages`.
- Produces:
  - from `pick.ts`:
    - constants: `NO_REPEAT_DAYS = 14`, `THEME_GAP_DAYS = 6`, `SEEN_KEEP_DAYS = 60`, `SLOTS = ['word', 'reading', 'theme']`, `KIND_LABEL`, `KIND_EN`, `THINK: { zh; en }[]` (4);
    - types: `TalkWord { text; gloss?; example?; zuci: string[]; from: 'list' | 'class' }`, `TalkPassage { id; title; questions: readonly PassageQuestion[] }`, `PickInput { today; seen; words; passage; bank? }`;
    - functions: `hookRank(hook, word): 0 | 1 | 2 | null`, `themeForWords(words, bank?): TalkTheme | null`, `wordStarter(w: TalkWord): TalkCard`, `readingCard(p: TalkPassage, k: number): TalkCard`, `pickDay(input): TalkCard[]`, `swapCard(cards, slot, input): TalkCard[]`, `followPassage(cards, input): TalkCard[]`, `markSeen(seen, cards, today): Record<string, string>`;
  - from `load.ts`: `NEW_WORD_DAYS = 7`, `READ_RECENT_DAYS = 2`, `talkWord(w: Word | { text }, from, example?): TalkWord`, `talkWords(db, now): Promise<TalkWord[]>`, `todaysPassage(db, settings, now): Promise<TalkPassage | null>`, `todayTalk(db, now): Promise<TalkCard[]>`, `swapTalk(db, now, slot): Promise<TalkCard[]>`.

- [ ] **Step 1: Write the failing tests**

Create `src/talk/pick.test.ts`. The expected ids were measured against the Task 1 bank:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import moe from '../content/moe2024.json';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { TALK_PROMPTS } from '../content/talkPrompts';
import { addDays, localDateKey } from '../lib/date';
import { p2Readable } from '../../scripts/check-content';
import { hookRank, markSeen, pickDay, readingCard, swapCard, themeForWords, THINK, wordStarter, type PickInput, type TalkWord } from './pick';

const P17 = { id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17! };
const P01 = { id: 'p01', title: '我的家', questions: PASSAGE_QUESTIONS.p01! };
const YE: TalkWord = { text: '爷', gloss: 'grandfather', zuci: ['爷爷'], from: 'class' };
const JIE: TalkWord = { text: '借', gloss: 'to borrow', example: '我可以借你的笔吗？', zuci: ['借书'], from: 'list' };
const TODAY = '2026-10-19';
const base: PickInput = { today: TODAY, seen: {}, words: [YE], passage: P17 };
const ids = (cards: { id: string }[]) => cards.map((c) => c.id);
const daysBefore = (n: number) => localDateKey(addDays(new Date(2026, 9, 19), -n));

describe("the day's three cards (parent loop spec §4)", () => {
  it('his word (a starter about it), shared reading of today\'s passage, a rotating theme', () => {
    expect(pickDay(base).map((c) => [c.kind, c.id, c.theme, c.word])).toEqual([
      ['word', 't04', 'family', '爷'],
      ['reading', 'r:p17:0', undefined, undefined],
      ['theme', 't12', 'school', undefined],
    ]);
  });
  it('a list word with no starter about it gets the word starter', () => {
    expect(pickDay({ ...base, words: [JIE] })[0]).toEqual({
      kind: 'word', id: 'w:借', word: '借',
      open: '你在哪里看到过『借』，或者听人说过『借』？',
      en: "This week's list word: 借 (to borrow). Where has he met it? Get him using it about his own day.",
      followUps: ['用『借』说一说你自己的事。', '书上有一句：「我可以借你的笔吗？」你也用『借』说一句。', '『借』还可以和哪些字一起用？'],
      pattern: '…借…',
      sample: '我可以借你的笔吗？',
    });
  });
  it('a two-character list word finds a starter about it; a one-character hook never matches inside it', () => {
    expect(pickDay({ ...base, words: [{ text: '新年', zuci: [], from: 'list' }] })[0]!.id).toBe('t44');
    expect(hookRank('新', '新年')).toBeNull();
    expect(hookRank('爷爷', '爷')).toBe(1);
    expect(hookRank('新年', '过新年')).toBe(2);
    expect(hookRank('新年', '新年')).toBe(0);
  });
  it('朗读 off (or nothing read) and no words yet: theme starters fill those slots, each a different theme', () => {
    const cards = pickDay({ ...base, words: [], passage: null });
    expect(cards.map((c) => [c.kind, c.id, c.theme])).toEqual([['theme', 't53', 'singapore'], ['theme', 't12', 'school'], ['theme', 't61', 'environment']]);
  });
  it('the same input picks the same three', () => {
    expect(pickDay(base)).toEqual(pickDay(structuredClone(base)));
  });
  it('「换一个」: the next of the same kind, never a card on screen', () => {
    const cards = pickDay(base);
    const seen = markSeen({}, cards, TODAY);
    expect(ids(swapCard(cards, 0, { ...base, seen }))).toEqual(['w:爷', 'r:p17:0', 't12']);
    expect(ids(swapCard(cards, 1, { ...base, seen }))).toEqual(['t04', 'r:p17:1', 't12']);
    expect(ids(swapCard(cards, 2, { ...base, seen }))).toEqual(['t04', 'r:p17:0', 't61']);
  });
  it('a swap with nothing else of its kind falls back to a theme starter', () => {
    const only = { ...base, words: [JIE] };
    const cards = pickDay(only);
    const next = swapCard(cards, 0, { ...only, seen: markSeen({}, cards, TODAY) });
    expect(next[0]!.kind).toBe('theme');
    expect(new Set(ids(next)).size).toBe(3);
  });
  it('nothing shown in the last 14 days comes back; 14 days ago can', () => {
    expect(pickDay({ ...base, seen: { t04: daysBefore(13) } })[0]!.id).toBe('w:爷');
    expect(pickDay({ ...base, seen: { t04: daysBefore(14) } })[0]!.id).toBe('t04');
  });
  it('a kind that has run out repeats its least recently shown rather than leave a gap', () => {
    const seen = { t04: daysBefore(2), 'w:爷': daysBefore(5), 'r:p17:0': daysBefore(1), 'r:p17:1': daysBefore(3), 'r:p17:2': daysBefore(2), 'r:p17:3': daysBefore(4) };
    expect(ids(pickDay({ ...base, seen })).slice(0, 2)).toEqual(['w:爷', 'r:p17:3']);
  });
  it('the theme card takes a theme not used in the last 6 days', () => {
    const one = (theme: string) => TALK_PROMPTS.find((p) => p.theme === theme)!.id;
    const others = ['family', 'school', 'friends', 'festivals', 'singapore', 'environment', 'technology', 'feelings'];
    const seen = Object.fromEntries(others.map((t) => [one(t), daysBefore(6)]));
    expect(pickDay({ ...base, words: [], passage: null, seen })[0]!.theme).toBe('food');
  });
  it('four weeks: no bank starter twice within 14 days, and all nine themes within five days', () => {
    let seen: Record<string, string> = {};
    const shown: { day: number; id: string; theme?: string }[] = [];
    for (let day = 0; day < 28; day++) {
      const today = localDateKey(addDays(new Date(2026, 9, 1), day));
      const cards = pickDay({ today, seen, words: [], passage: P17 });
      seen = markSeen(seen, cards, today);
      shown.push(...cards.map((c) => ({ day, id: c.id, theme: c.theme })));
    }
    const bank = shown.filter((s) => s.theme);
    for (const s of bank) expect(bank.filter((x) => x.id === s.id && x.day !== s.day && Math.abs(x.day - s.day) < 14)).toEqual([]);
    expect(new Set(shown.filter((s) => s.day < 5).map((s) => s.theme).filter(Boolean)).size).toBe(9);
  });
  it('remembers what was shown for 60 days', () => {
    expect(markSeen({ t01: daysBefore(59), t02: daysBefore(60) }, [{ id: 't03' }], TODAY)).toEqual({ t01: daysBefore(59), t03: TODAY });
  });
});

describe('shared reading (spec §4: 谁 / 为什么 / 你觉得)', () => {
  it("the passage's own questions where it has them, with their answers", () => {
    expect(readingCard(P17, 0)).toMatchObject({
      id: 'r:p17:0', passageId: 'p17', open: '牛爷爷做了什么？',
      followUps: ['小马为什么找不到家了？', THINK[0]!.zh], answers: ['找到了小马', '跑得很远', null],
    });
  });
  it('a passage with a 谁 question and no 为什么 one: an open why', () => {
    expect(readingCard(P01, 2)).toMatchObject({ open: '谁是老师？', followUps: ['故事里的人为什么这样做？你是从哪一句知道的？', THINK[2]!.zh], answers: ['妈妈', null, null] });
  });
  it('a parent text without a question: all three open', () => {
    expect(readingCard({ id: 'pp:a', title: '我的学校', questions: [] }, 5)).toMatchObject({ id: 'r:pp:a:1', open: '《我的学校》里有谁？', answers: [null, null, null] });
  });
});

describe('themes and templates', () => {
  it('the theme his words lean to: 饿、饱、甜 are food', () => {
    expect(themeForWords(['饿', '饱', '甜'])).toBe('food');
    expect(themeForWords(['鬱'])).toBeNull();
  });
  it("the templates' own words are P2 characters", () => {
    const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    const cards = [wordStarter({ text: '大', zuci: [], from: 'class' }), wordStarter({ text: '大', example: '我家很大。', zuci: [], from: 'list' }), ...THINK.map((_, k) => readingCard({ id: 'x', title: '大', questions: [] }, k))];
    const text = cards.flatMap((c) => [c.open, ...c.followUps, c.pattern, c.sample]).join('');
    expect([...new Set(Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch) && !readable.has(ch)))]).toEqual([]);
  });
});
```

Create `src/talk/load.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { getSettings, putWeekList, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from '../store/repo';
import { freshDb } from '../test/fixtures';
import { DEFAULT_KID, EMPTY_READING, type SessionPlan, type WeekList } from '../types';
import { swapTalk, talkWord, talkWords, todaysPassage, todayTalk } from './load';

const NOW = new Date(2026, 9, 19, 20); // a Monday evening
const words = builtinWords(0);
const w = (t: string) => words.find((x) => x.text === t)!;
const plan = (ids: string[], lanes: Record<string, 'school' | 'catchup' | 'list'> = {}): SessionPlan => ({ steps: ['newwords'], reviewWordIds: [], newWordIds: ids, newWordLanes: lanes, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
/** A lesson on `date` whose 认新字 reached its first `reached` new words. */
const lesson = (date: string, ids: string[], o: { reached?: number; free?: boolean; lanes?: Record<string, 'school' | 'catchup' | 'list'> } = {}) =>
  ({ ...createSessionRecord(plan(ids, o.lanes), date, 0, o.free ?? false), flashIndex: o.reached ?? ids.length });
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:a', name: '复习一', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:借', text: '借', from: 'grid', addedStatus: 'new', last: { read: { at: 1, correct: true }, meaning: { at: 1, correct: true } } }, { wordId: 'b:甜', text: '甜', from: 'grid', addedStatus: 'new' }],
  pairs: [], fits: [{ wordId: 'b:甜', sentence: '这个西瓜很＿。', source: 'parent', wrong: ['借', '饿', '马'] }],
  ...over,
});
const readOn = (id: string, day: string) => ({ ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { [id]: { reads: 1, lastRead: day, rest: 3, q: 1 } } } });

describe('his words (2026-10-18 update)', () => {
  it('a word as its starter needs it: the first sense, a sentence that uses it, its 组词', () => {
    expect(talkWord(w('借'), 'list')).toEqual({ text: '借', gloss: 'borrow', example: '我可以借你的笔吗？', zuci: ['借书', '借给', '借用'], from: 'list' });
    expect(talkWord({ text: '闪闪亮' }, 'list')).toEqual({ text: '闪闪亮', zuci: [], from: 'list' });
  });
  it("this week's list first (not ready before ready, its 选词填空 row as the example), then his new class words, school lane first", async () => {
    const db = await freshDb();
    await putWords(db, ['借', '甜', '饿', '饱', '马', '爷'].map(w));
    await putWeekList(db, list());
    await saveSession(db, lesson('2026-10-12', ['b:马'])); // 8 days back: out
    await saveSession(db, lesson('2026-10-14', ['b:饿', 'b:饱'], { lanes: { 'b:饿': 'catchup', 'b:饱': 'school' } }));
    await saveSession(db, lesson('2026-10-18', ['b:爷', 'b:借', 'b:甜'], { lanes: { 'b:借': 'list', 'b:甜': 'list' } }));
    await saveSession(db, lesson('2026-10-19', ['b:马'], { free: true })); // free play: never
    const got = await talkWords(db, NOW);
    expect(got.map((x) => [x.text, x.from])).toEqual([['甜', 'list'], ['借', 'list'], ['爷', 'class'], ['饱', 'class'], ['饿', 'class']]);
    expect(got[0]!.example).toBe('这个西瓜很甜。');
  });
  it('a word 认新字 never reached is not his yet; a list past its homework day is not this week', async () => {
    const db = await freshDb();
    await putWords(db, ['借', '甜', '饿'].map(w));
    await putWeekList(db, list({ homeworkDue: '2026-10-16', readyBy: '2026-10-15' }));
    await saveSession(db, lesson('2026-10-18', ['b:饿', 'b:借'], { reached: 1 }));
    expect((await talkWords(db, NOW)).map((x) => x.text)).toEqual(['饿']);
  });
});

describe("today's passage", () => {
  it('the one read today or yesterday while 朗读 is on; a parent text with its question or none', async () => {
    const db = await freshDb();
    const s = await getSettings(db);
    expect(await todaysPassage(db, s, NOW)).toBeNull(); // no kid yet
    await saveKid(db, readOn('p17', '2026-10-18'));
    expect(await todaysPassage(db, s, NOW)).toMatchObject({ id: 'p17', title: '小马', questions: [expect.objectContaining({ q: '小马为什么找不到家了？' }), expect.anything()] });
    expect(await todaysPassage(db, { ...s, langdu: false }, NOW)).toBeNull();
    await saveKid(db, readOn('p17', '2026-10-17'));
    expect(await todaysPassage(db, s, NOW)).toBeNull();
    await saveParentPassage(db, { id: 'pp:a', title: '我的学校', text: '我的学校很大。', createdAt: 1 });
    await saveKid(db, readOn('pp:a', '2026-10-19'));
    expect(await todaysPassage(db, s, NOW)).toEqual({ id: 'pp:a', title: '我的学校', questions: [] });
  });
});

describe('the day is kept (spec §4)', () => {
  it('the same three all day, new ones the next day; what was shown is remembered', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    expect(first).toHaveLength(3);
    expect(await todayTalk(db, new Date(2026, 9, 19, 23))).toEqual(first);
    const s = await getSettings(db);
    expect(s.talkDay).toEqual({ date: '2026-10-19', cards: first });
    expect(Object.keys(s.talkSeen!).sort()).toEqual(first.map((c) => c.id).sort());
    const next = await todayTalk(db, new Date(2026, 9, 20, 8));
    expect(next.filter((c) => first.some((f) => f.id === c.id))).toEqual([]);
  });
  it('a swap is kept; the swapped-out card counts as shown', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    const swapped = await swapTalk(db, NOW, 2);
    expect(swapped[2]!.id).not.toBe(first[2]!.id);
    expect(swapped.slice(0, 2)).toEqual(first.slice(0, 2));
    expect(await todayTalk(db, NOW)).toEqual(swapped);
    expect((await getSettings(db)).talkSeen![first[2]!.id]).toBe('2026-10-19');
  });
  it("the reading slot follows a passage read after the cards were picked (the morning's cards, the evening's lesson)", async () => {
    const db = await freshDb();
    await saveKid(db, readOn('p01', '2026-10-17')); // nothing recent: the slot is a theme
    const morning = await todayTalk(db, new Date(2026, 9, 19, 7));
    expect(morning[1]!.kind).toBe('theme');
    await saveKid(db, readOn('p17', '2026-10-19'));
    const evening = await todayTalk(db, NOW);
    expect(evening[1]).toMatchObject({ kind: 'reading', passageId: 'p17' });
    expect([evening[0], evening[2]]).toEqual([morning[0], morning[2]]);
    await updateSettings(db, {}); // nothing else changes it
    expect(await todayTalk(db, NOW)).toEqual(evening);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/talk`
Expected: FAIL with `Failed to resolve import "./pick"` and `"./load"`.

- [ ] **Step 3: The picker**

Create `src/talk/pick.ts`:

```ts
// The day's three talk cards (parent loop spec §4, 2026-10-18 update): his word (this week's list first, then his new class
// words), shared reading of today's 朗读 passage (谁 / 为什么 / 你觉得), and a rotating theme. Pure: load.ts reads the stores and
// keeps the day's picks in settings, so the same three show all day.
import { TALK_PROMPTS, TALK_THEMES } from '../content/talkPrompts';
import { parseDateKey } from '../lib/date';
import { mulberry32, seedFromString, shuffle, type Rng } from '../lib/random';
import type { PassageQuestion, TalkCard, TalkKind, TalkPrompt, TalkTheme } from '../types';

/** A card shown this many days ago or fewer comes back only when its kind has nothing else (spec §4). */
export const NO_REPEAT_DAYS = 14;
/** A theme used this many days ago or fewer waits while another theme hasn't been (spec §4). */
export const THEME_GAP_DAYS = 6;
/** What was shown is remembered this long. */
export const SEEN_KEEP_DAYS = 60;
/** The day's three slots, in order. */
export const SLOTS: readonly TalkKind[] = ['word', 'reading', 'theme'];
export const KIND_LABEL: Readonly<Record<TalkKind, string>> = { word: '他的词', reading: '一起读', theme: '话题' };
export const KIND_EN: Readonly<Record<TalkKind, string>> = { word: 'His words', reading: 'Shared reading', theme: 'Topic' };

/** A word to talk about: its text, the parent's English, a sentence that uses it, its 组词, and where it came from. */
export interface TalkWord { text: string; gloss?: string; example?: string; zuci: string[]; from: 'list' | 'class' }
/** Today's 朗读 passage: its title and meaning questions (a parent text has one or none). */
export interface TalkPassage { id: string; title: string; questions: readonly PassageQuestion[] }
export interface PickInput {
  today: string; // local YYYY-MM-DD
  seen: Readonly<Record<string, string>>; // card id → last day shown
  words: readonly TalkWord[]; // best first: this week's list, then his new class words
  passage: TalkPassage | null; // null: 朗读 off, or nothing read today or yesterday
  bank?: readonly TalkPrompt[];
}

const daysAgo = (day: string, today: string) => Math.round((parseDateKey(today).getTime() - parseDateKey(day).getTime()) / 86_400_000);
const fresh = (id: string, seen: PickInput['seen'], today: string) => !seen[id] || daysAgo(seen[id]!, today) >= NO_REPEAT_DAYS;

/** How well a starter's hook fits his word: 0 the same word; 1 a hook word holding his character (爷爷 for 爷); 2 his word
 *  holding a hook of two or more characters (新年 in 过新年); null none. A one-character hook never matches inside a longer word. */
export function hookRank(hook: string, word: string): 0 | 1 | 2 | null {
  if (hook === word) return 0;
  const h = Array.from(hook).length, w = Array.from(word).length;
  if (w === 1 && hook.includes(word)) return 1;
  if (h >= 2 && word.includes(hook)) return 2;
  return null;
}
const bestHook = (p: TalkPrompt, word: string): number | null => {
  const ranks = p.hooks.map((h) => hookRank(h, word)).filter((r): r is 0 | 1 | 2 => r !== null);
  return ranks.length ? Math.min(...ranks) : null;
};

/** The theme whose starters are about the most of `words` (the weekly focus line); null when none is. */
export function themeForWords(words: readonly string[], bank: readonly TalkPrompt[] = TALK_PROMPTS): TalkTheme | null {
  let best: TalkTheme | null = null, most = 0;
  for (const t of TALK_THEMES) {
    const n = words.filter((w) => bank.some((p) => p.theme === t && bestHook(p, w) !== null)).length;
    if (n > most) { best = t; most = n; }
  }
  return best;
}

const fromPrompt = (p: TalkPrompt, kind: TalkKind, word?: string): TalkCard => ({
  kind, id: p.id, theme: p.theme, ...(word ? { word } : {}), open: p.open, en: p.en, followUps: [...p.followUps], pattern: p.pattern, sample: p.sample,
});

/** A word no starter is about (spec §4): one template, the word put to use in his own life. */
export function wordStarter(w: TalkWord): TalkCard {
  const x = `『${w.text}』`;
  const followUps = w.example
    ? [`用${x}说一说你自己的事。`, `书上有一句：「${w.example}」你也用${x}说一句。`, `${x}还可以和哪些字一起用？`]
    : [`用${x}说一说你自己的事。`, `${x}可以和哪些字一起用？`];
  const where = w.from === 'list' ? "This week's list word" : 'A new word from class';
  return {
    kind: 'word', id: `w:${w.text}`, word: w.text,
    open: `你在哪里看到过${x}，或者听人说过${x}？`,
    en: `${where}: ${w.text}${w.gloss ? ` (${w.gloss})` : ''}. Where has he met it? Get him using it about his own day.`,
    followUps,
    pattern: `…${w.text}…`,
    sample: w.example ?? (w.zuci.length ? w.zuci.slice(0, 2).join('、') : w.text),
  };
}

/** The 你觉得 question a shared-reading card ends on; 「换一个」 moves to the next. */
export const THINK: readonly { zh: string; en: string }[] = [
  { zh: '你觉得故事里谁做得最好？为什么？', en: 'Who in the story did best? Why?' },
  { zh: '如果你是故事里的人，你会怎么做？', en: 'If he were in the story, what would he do?' },
  { zh: '你有没有碰到过这样的事？说一说。', en: 'Has something like this happened to him?' },
  { zh: '你觉得故事后来会怎么样？', en: 'What does he think happens next?' },
];
const WHY_OPEN = '故事里的人为什么这样做？你是从哪一句知道的？';

/**
 * Shared reading of today's passage (spec §4, dialogic reading): read it together, then 谁 — the passage's 谁 question, else its
 * first other question, else 「《title》里有谁？」; 为什么 — its 为什么 question, else an open why that points back to the text;
 * 你觉得 — THINK[k]. `answers`: the passage's answer to each, null where the question is open.
 */
export function readingCard(p: TalkPassage, k: number): TalkCard {
  const isWhy = (q: PassageQuestion) => q.q.includes('为什么');
  const answer = (q: PassageQuestion) => q.choices[q.answer];
  const facts = p.questions.filter((q) => !isWhy(q));
  const who = facts.find((q) => q.q.includes('谁')) ?? facts[0];
  const why = p.questions.find(isWhy);
  const think = THINK[k % THINK.length]!;
  return {
    kind: 'reading', id: `r:${p.id}:${k % THINK.length}`, passageId: p.id,
    open: who ? who.q : `《${p.title}》里有谁？`,
    en: `Shared reading: read 《${p.title}》 together, taking turns a sentence each, then ask who, why, and what he thinks. Last question: ${think.en}`,
    followUps: [why ? why.q : WHY_OPEN, think.zh],
    pattern: '我觉得…因为…',
    sample: '',
    answers: [who ? answer(who) : null, why ? answer(why) : null, null],
  };
}

/** A slot's candidates in preference order: the first not shown in NO_REPEAT_DAYS wins, else the least recently shown. */
function pickFrom(options: readonly TalkCard[], input: PickInput, onScreen: ReadonlySet<string>): TalkCard | null {
  const open = options.filter((c) => !onScreen.has(c.id));
  const first = open.find((c) => fresh(c.id, input.seen, input.today));
  if (first) return first;
  return open.reduce<TalkCard | null>((best, c) => (!best || (input.seen[c.id] ?? '') < (input.seen[best.id] ?? '') ? c : best), null);
}

const lastShown = (ids: readonly string[], seen: PickInput['seen']) => ids.reduce((m, id) => ((seen[id] ?? '') > m ? seen[id]! : m), '');

/** His words' cards: for each word in order, the starters about it (best hook, then least recently shown), then its own. */
function wordOptions(input: PickInput, rng: Rng): TalkCard[] {
  const bank = input.bank ?? TALK_PROMPTS;
  const out: TalkCard[] = [];
  const have = new Set<string>();
  for (const w of input.words) {
    const hooked = shuffle(bank, rng)
      .map((p) => ({ p, rank: bestHook(p, w.text) }))
      .filter((x): x is { p: TalkPrompt; rank: number } => x.rank !== null)
      .sort((a, b) => a.rank - b.rank || (input.seen[a.p.id] ?? '').localeCompare(input.seen[b.p.id] ?? ''));
    for (const { p } of hooked) if (!have.has(p.id)) { have.add(p.id); out.push(fromPrompt(p, 'word', w.text)); }
    const own = wordStarter(w);
    if (!have.has(own.id)) { have.add(own.id); out.push(own); }
  }
  return out;
}

/** Theme starters: themes not used in THEME_GAP_DAYS first, then the least recently used; on-screen themes last. Within a
 *  theme, the least recently shown first. Ties go by a shuffle seeded from the day. */
function themeOptions(input: PickInput, rng: Rng, busy: ReadonlySet<TalkTheme>): TalkCard[] {
  const bank = input.bank ?? TALK_PROMPTS;
  const used = (t: TalkTheme) => lastShown(bank.filter((p) => p.theme === t).map((p) => p.id), input.seen);
  const rested = (t: TalkTheme) => !used(t) || daysAgo(used(t), input.today) > THEME_GAP_DAYS;
  const themes = shuffle(TALK_THEMES, rng).sort((a, b) => Number(busy.has(a)) - Number(busy.has(b)) || Number(rested(b)) - Number(rested(a)) || used(a).localeCompare(used(b)));
  return themes.flatMap((t) =>
    shuffle(bank.filter((p) => p.theme === t), rng)
      .sort((a, b) => (input.seen[a.id] ?? '').localeCompare(input.seen[b.id] ?? ''))
      .map((p) => fromPrompt(p, 'theme')),
  );
}

const readingOptions = (input: PickInput): TalkCard[] => (input.passage ? THINK.map((_, k) => readingCard(input.passage!, k)) : []);

function fill(slot: number, cards: readonly (TalkCard | null)[], input: PickInput, rng: Rng, swapping = false): TalkCard | null {
  // a swap never gives back the card it replaces
  const onScreen = new Set(cards.filter((c, i): c is TalkCard => !!c && (swapping || i !== slot)).map((c) => c.id));
  const busy = new Set(cards.filter((c, i): c is TalkCard => !!c && i !== slot && !!c.theme).map((c) => c.theme!));
  const kind = SLOTS[slot]!;
  const own = kind === 'word' ? wordOptions(input, rng) : kind === 'reading' ? readingOptions(input) : [];
  // a slot with nothing of its own falls back to a theme starter (spec §4: 朗读 off; no words yet)
  return pickFrom(own, input, onScreen) ?? pickFrom(themeOptions(input, rng, busy), input, onScreen);
}

/** The day's three: the same input always picks the same three (the shuffle is seeded from the day). */
export function pickDay(input: PickInput): TalkCard[] {
  const rng = mulberry32(seedFromString(input.today));
  const cards: (TalkCard | null)[] = [null, null, null];
  for (let slot = 0; slot < SLOTS.length; slot++) cards[slot] = fill(slot, cards, input, rng);
  return cards.filter((c): c is TalkCard => !!c);
}

/** 「换一个」: the slot's next candidate (the cards on screen were shown today, so `input.seen` has them); nothing left, unchanged. */
export function swapCard(cards: readonly TalkCard[], slot: number, input: PickInput): TalkCard[] {
  const rng = mulberry32(seedFromString(`${input.today}#${slot}`));
  const next = fill(slot, cards, { ...input, seen: { ...input.seen, ...Object.fromEntries(cards.map((c) => [c.id, input.today])) } }, rng, true);
  return next ? cards.map((c, i) => (i === slot ? next : c)) : [...cards];
}

/** The reading slot once today's passage is read (load.ts): picked again for the passage when it shows anything else. */
export function followPassage(cards: readonly TalkCard[], input: PickInput): TalkCard[] {
  const slot = SLOTS.indexOf('reading');
  if (!input.passage || cards[slot]?.passageId === input.passage.id) return [...cards];
  const next = fill(slot, cards, input, mulberry32(seedFromString(`${input.today}#${slot}`)));
  return next ? cards.map((c, i) => (i === slot ? next : c)) : [...cards];
}

/** What was shown: today's cards marked, anything not shown in SEEN_KEEP_DAYS forgotten. */
export function markSeen(seen: Readonly<Record<string, string>>, cards: readonly Pick<TalkCard, 'id'>[], today: string): Record<string, string> {
  const kept = Object.entries(seen).filter(([, day]) => daysAgo(day, today) < SEEN_KEEP_DAYS);
  return { ...Object.fromEntries(kept), ...Object.fromEntries(cards.map((c) => [c.id, today])) };
}
```

- [ ] **Step 4: The loader**

Create `src/talk/load.ts`:

```ts
// What the talk picker needs from the stores (parent loop spec §4, 2026-10-18 update), and today's three kept in settings so
// Today shows the same cards all day.
import { PASSAGES } from '../content';
import { cardMeaning } from '../content/glossary';
import { ladderWordsBesides } from '../content/ladder';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { BLANK } from '../content/sentenceBank';
import { addDays, localDateKey, startOfLocalDay } from '../lib/date';
import { introducedNewWords } from '../session/runner';
import type { AppDb } from '../store/db';
import { allSessions, allWeekLists, allWords, getKid, getSettings, listParentPassages, updateSettings } from '../store/repo';
import type { Settings, TalkCard, Word } from '../types';
import { sentenceFor } from '../weeklist/fit';
import { activeLists } from '../weeklist/plan';
import { isReady } from '../weeklist/readiness';
import { followPassage, markSeen, pickDay, swapCard, type PickInput, type TalkPassage, type TalkWord } from './pick';

/** His new class words: introduced in his lessons over this many days, today included. */
export const NEW_WORD_DAYS = 7;
/** Today's passage: the one read most recently, today or yesterday. */
export const READ_RECENT_DAYS = 2;

/** A word as its starter needs it: the first sense of its English, a sentence that uses it (`example`, else its own), its 组词. */
export function talkWord(w: Word | { text: string }, from: TalkWord['from'], example?: string): TalkWord {
  const word = 'id' in w ? w : null; // a list item whose word is gone keeps its text only
  const gloss = word ? cardMeaning(word)?.split(/[;；,]/)[0]?.trim() : undefined;
  const fit = word && !example ? sentenceFor(word) : null;
  const sentence = example ?? (fit ? fit.text.replace(BLANK, w.text) : undefined);
  const zuci = (word?.examples ?? []).map((e) => e.text).filter((t) => t !== w.text).slice(0, 3);
  return { text: w.text, ...(gloss ? { gloss } : {}), ...(sentence ? { example: sentence } : {}), zuci, from };
}

/** His words, best first (2026-10-18 update): this week's list words (lists whose homework day isn't behind; items not ready
 *  first, in list order; a confirmed 选词填空 row is the example), then the new words his lessons introduced in NEW_WORD_DAYS,
 *  the newest lesson first, his class's lane before catch-up. Each word once. */
export async function talkWords(db: AppDb, now: Date): Promise<TalkWord[]> {
  const today = localDateKey(now);
  const [stored, lists, sessions] = await Promise.all([allWords(db), allWeekLists(db), allSessions(db)]);
  const byId = new Map([...stored, ...ladderWordsBesides(stored)].map((w) => [w.id, w]));
  const out: TalkWord[] = [];
  const have = new Set<string>();
  const add = (t: TalkWord) => { if (!have.has(t.text)) { have.add(t.text); out.push(t); } };
  for (const l of activeLists(lists, now).filter((x) => today <= x.homeworkDue)) {
    const ready = (i: (typeof l.items)[number]) => Number(isReady(i, l, byId.get(i.wordId)));
    for (const i of [...l.items].sort((a, b) => ready(a) - ready(b))) {
      const fit = l.fits.find((f) => f.wordId === i.wordId);
      add(talkWord(byId.get(i.wordId) ?? { text: i.text }, 'list', fit ? fit.sentence.replace(BLANK, i.text) : undefined));
    }
  }
  const since = localDateKey(addDays(startOfLocalDay(now), -(NEW_WORD_DAYS - 1)));
  const lessons = sessions.filter((s) => !s.free && s.date >= since && s.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  for (const s of lessons) {
    const lane = (id: string) => s.plan.newWordLanes?.[id];
    const met = introducedNewWords(s).filter((id) => lane(id) !== 'list');
    for (const id of [...met.filter((id) => lane(id) === 'school'), ...met.filter((id) => lane(id) !== 'school')]) {
      const w = byId.get(id);
      if (w) add(talkWord(w, 'class'));
    }
  }
  return out;
}

/** Today's 朗读 passage (2026-10-18 update): with 朗读 on, the one he read most recently, today or yesterday; a parent text or
 *  a built-in, with its questions. */
export async function todaysPassage(db: AppDb, settings: Settings, now: Date): Promise<TalkPassage | null> {
  if (!settings.langdu) return null;
  const kid = await getKid(db);
  if (!kid) return null;
  const today = localDateKey(now);
  const since = localDateKey(addDays(startOfLocalDay(now), -(READ_RECENT_DAYS - 1)));
  const recent = Object.entries(kid.reading.history)
    .filter(([, e]) => !!e.lastRead && e.lastRead >= since && e.lastRead <= today)
    .sort(([a, x], [b, y]) => y.lastRead!.localeCompare(x.lastRead!) || a.localeCompare(b));
  const parent = await listParentPassages(db);
  for (const [id] of recent) {
    const own = parent.find((p) => p.id === id);
    if (own) return { id, title: own.title, questions: own.question ? [own.question] : [] };
    const built = PASSAGES.find((p) => p.id === id);
    if (built) return { id, title: built.title, questions: PASSAGE_QUESTIONS[id] ?? [] };
  }
  return null;
}

async function pickInput(db: AppDb, now: Date, settings: Settings): Promise<PickInput> {
  const [words, passage] = await Promise.all([talkWords(db, now), todaysPassage(db, settings, now)]);
  return { today: localDateKey(now), seen: settings.talkSeen ?? {}, words, passage };
}

async function keep(db: AppDb, settings: Settings, today: string, cards: TalkCard[]): Promise<TalkCard[]> {
  await updateSettings(db, { talkDay: { date: today, cards }, talkSeen: markSeen(settings.talkSeen ?? {}, cards, today) });
  return cards;
}

/** Today's three: picked once a day and kept; the reading slot follows a passage read after they were picked. */
export async function todayTalk(db: AppDb, now: Date): Promise<TalkCard[]> {
  const settings = await getSettings(db);
  const today = localDateKey(now);
  const input = await pickInput(db, now, settings);
  const stored = settings.talkDay?.date === today ? settings.talkDay.cards : null;
  const cards = stored ? followPassage(stored, input) : pickDay(input);
  if (stored && cards.every((c, i) => c.id === stored[i]?.id)) return stored;
  return keep(db, settings, today, cards);
}

/** 「换一个」 on one card: the next of its kind, kept. */
export async function swapTalk(db: AppDb, now: Date, slot: number): Promise<TalkCard[]> {
  const cards = await todayTalk(db, now);
  const settings = await getSettings(db);
  return keep(db, settings, localDateKey(now), swapCard(cards, slot, await pickInput(db, now, settings)));
}
```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/talk && npx tsc --noEmit`
Expected: PASS (17 + 7 tests); no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/talk/pick.ts src/talk/pick.test.ts src/talk/load.ts src/talk/load.test.ts
git commit -m "feat: the day's three talk cards: his list and class words, shared reading of today's passage, a theme; kept all day"
```

---

### Task 3: The talk log store (v7), backup, restore and undo

**Files:**
- Modify: `src/store/db.ts`, `src/store/repo.ts`, `src/store/backup.ts`, `src/parent/BackupPanel.tsx`
- Modify: `src/store/upgradeV6.test.ts`, `src/store/weekLists.test.ts` (they pinned version 6)
- Create: `src/store/talks.test.ts`, `src/parent/backupTalks.test.tsx`

**Interfaces:**
- Consumes: `TalkLog` (Task 1); `exportBackup`, `readBackup`, `restoreWithUndo`, `undoRestore` (`src/store/backup.ts`).
- Produces:
  - `DB_VERSION = 7`; `LIST_STORES` ends `'weekLists', 'talks'`;
  - `addTalk(db, t: TalkLog): Promise<void>`, `deleteTalk(db, id)`, `talksBetween(db, from, to): Promise<TalkLog[]>` (`[from, to)`, oldest first), `allTalks(db): Promise<TalkLog[]>` (oldest first);
  - `BackupPreview.talksMissing: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `src/store/talks.test.ts`:

```ts
// @vitest-environment node
// The talk log (parent loop spec §6): its own store (v7), in every backup; a backup from before it leaves this device's talks
// alone (they are the family's, not his progress), and Undo puts back exactly what was there.
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { exportBackup, readBackup, restoreWithUndo, undoRestore } from './backup';
import { DB_VERSION, LIST_STORES, openAppDb } from './db';
import { addTalk, allTalks, allWords, deleteTalk, putWords, talksBetween } from './repo';

const NOW = new Date(2026, 9, 19, 21);
const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();

describe('the talk log store', () => {
  it('adds, lists oldest first, reads [from, to) and deletes', async () => {
    const db = await freshDb();
    await addTalk(db, { id: 'b', at: at(13), minutes: 10 });
    await addTalk(db, { id: 'a', at: at(12) });
    await addTalk(db, { id: 'c', at: at(19, 0) });
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect((await talksBetween(db, new Date(2026, 9, 12).getTime(), new Date(2026, 9, 19).getTime())).map((t) => t.id)).toEqual(['a', 'b']);
    await deleteTalk(db, 'b');
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'c']);
  });
  it('v7 adds the store to a v6 database and keeps what it had', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const old = await openDB(name, 6, { upgrade(db) { db.createObjectStore('words', { keyPath: 'id' }); } });
    await old.put('words', makeWord('大'));
    old.close();
    const db = await openAppDb(name);
    expect(DB_VERSION).toBe(7);
    expect(db.objectStoreNames.contains('talks')).toBe(true);
    expect((await allWords(db)).map((w) => w.text)).toEqual(['大']);
    expect(LIST_STORES).toContain('talks');
  });
});

describe('talks in a backup', () => {
  it('a v7 backup carries its talks, and restoring brings them in place of the ones here', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大')]);
    await addTalk(db, { id: 'a', at: at(12), minutes: 5 });
    const text = await exportBackup(db, { includeMedia: false, now: NOW.getTime() });
    expect(JSON.parse(text).stores.talks).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
    expect(readBackup(text).talksMissing).toBe(false);
    const other = await freshDb();
    await addTalk(other, { id: 'old', at: at(1) });
    await restoreWithUndo(other, readBackup(text), NOW);
    expect(await allTalks(other)).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
  });
  it('a backup from before talks keeps the talks here; undoing the restore keeps them too', async () => {
    const old = await freshDb();
    await putWords(old, [makeWord('山')]);
    const file = JSON.parse(await exportBackup(old, { includeMedia: false, now: NOW.getTime() }));
    delete file.stores.talks;
    file.dbVersion = 6;
    const db = await freshDb();
    await addTalk(db, { id: 'kept', at: at(18), minutes: 10 });
    const preview = readBackup(JSON.stringify(file));
    expect(preview.talksMissing).toBe(true);
    await restoreWithUndo(db, preview, NOW);
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['kept']);
    await addTalk(db, { id: 'after', at: at(19) }); // logged after the restore: Undo goes back to before it
    await undoRestore(db);
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['kept']);
  });
});
```

Create `src/parent/backupTalks.test.tsx`:

```tsx
// The talk log in Parent → Backup (parent loop spec §6): a backup from before it says the talks here are kept, and keeps them.
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { addTalk, allTalks, putWords, saveKid } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID } from '../types';
import { BackupPanel } from './BackupPanel';

vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

const backupFile = (text: string) => Object.assign(new File([text], 'b.json', { type: 'application/json' }), { text: async () => text });
const choose = (text: string) => {
  const input = document.getElementById('bk-file') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [backupFile(text)], configurable: true });
  fireEvent.change(input);
};

describe('Parent → Backup: the talk log', () => {
  it('a backup from before the talk log says the talks here are kept, and keeps them', async () => {
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID });
    await addTalk(app.db, { id: 't1', at: 1, minutes: 10 });
    const old = await makeAppData();
    await putWords(old.db, [makeWord('山')]);
    const file = JSON.parse(await exportBackup(old.db, { includeMedia: false, now: 1 }));
    delete file.stores.talks;
    file.dbVersion = 6;
    renderWithApp(<BackupPanel />, app);
    choose(JSON.stringify(file));
    expect(await screen.findByText(/from before the talk log \(聊一聊\): the talks logged on this device are kept/)).toBeTruthy();
    fireEvent.click(screen.getByText('Replace with this backup'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
    expect((await allTalks(app.db)).map((t) => t.id)).toEqual(['t1']);
  });
  it('a backup with talks says nothing about them', async () => {
    const app = await makeAppData();
    await addTalk(app.db, { id: 't1', at: 1 });
    renderWithApp(<BackupPanel />, app);
    choose(await exportBackup(app.db, { includeMedia: false, now: 1 }));
    expect(await screen.findByText('Replace with this backup')).toBeTruthy();
    expect(screen.queryByText(/talk log/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/store/talks.test.ts src/parent/backupTalks.test.tsx`
Expected: FAIL with `addTalk` is not exported from `./repo` / `../store/repo`.

- [ ] **Step 3: The store**

In `src/store/db.ts`:
- the types import becomes `import type { AnswerLog, CardRecord, KidState, LadderEntry, ParentPassage, PicturePrompt, Recording, ReviewLog, RewardGoal, SessionRecord, Settings, TalkLog, WeekList, Word } from '../types';`;
- in `HanziDB`, after `  weekLists: { key: string; value: WeekList };`, add `  talks: { key: string; value: TalkLog; indexes: { byAt: number } };`;
- `export const DB_VERSION = 7;`;
- `export const LIST_STORES = ['words', 'cards', 'reviewLogs', 'sessions', 'rewards', 'recordings', 'prompts', 'passages', 'answers', 'ladder', 'weekLists', 'talks'] as const;`;
- in `upgrade`, after the `if (oldVersion < 6)` line:

```ts
      if (oldVersion < 7) db.createObjectStore('talks', { keyPath: 'id' }).createIndex('byAt', 'at'); // the parent's 「✓ 聊了」 (parent loop spec §6)
```

In `src/store/repo.ts`, add `type TalkLog, ` before `type WeekList` in the `../types` import, and append:

```ts
/** A 「✓ 聊了」 (parent loop spec §5). */
export async function addTalk(db: AppDb, t: TalkLog): Promise<void> {
  await db.put('talks', t);
}
export const deleteTalk = (db: AppDb, id: string) => db.delete('talks', id);
/** Talks logged in [from, to), oldest first. */
export const talksBetween = (db: AppDb, from: number, to: number): Promise<TalkLog[]> => db.getAllFromIndex('talks', 'byAt', IDBKeyRange.bound(from, to, false, true));
/** Every talk logged, oldest first. */
export const allTalks = (db: AppDb): Promise<TalkLog[]> => db.getAllFromIndex('talks', 'byAt');
```

- [ ] **Step 4: Backup knows a file from before talks**

In `src/store/backup.ts`, add to `BackupPreview` after `listsMissing`:

```ts
  talksMissing: boolean; // a backup from before the talk log (v7): restoring it keeps this device's talks (parent loop spec §6)
```

after `const listsMissing = …;`:

```ts
/** A backup from before v7: its restore leaves the talk log as it is (the family's log, not his progress); Undo still covers it. */
const talksMissing = (file: BackupFile) => 'words' in file.stores && !('talks' in file.stores);
```

and in `readBackup`'s returned object, after `listsMissing: listsMissing(file),`:

```ts
    talksMissing: talksMissing(file),
```

`applyBackup` needs no change: a store absent from the file is kept, and the restore point exports `talks` like every list store.

In `src/parent/BackupPanel.tsx`, after the `{preview.listsMissing && <p>…</p>}` line:

```tsx
            {preview.talksMissing && <p>This backup is from before the talk log (聊一聊): the talks logged on this device are kept.</p>}
```

- [ ] **Step 5: The old version pins**

In `src/store/upgradeV6.test.ts`:
- import `DB_VERSION` (`import { DB_VERSION, openAppDb } from './db';`);
- `expect(db.version).toBe(6);` becomes `expect(db.version).toBe(DB_VERSION);`;
- the store list gains `'talks'`: `['passages', 'answers', 'ladder', 'restorePoints', 'weekLists', 'talks'] as const`.

In `src/store/weekLists.test.ts`, the first test becomes:

```ts
  it('is version 6 or later and backed up', () => {
    expect(DB_VERSION).toBeGreaterThanOrEqual(6);
```

- [ ] **Step 6: Run them to see them pass**

Run: `npx vitest run src/store src/parent/backupTalks.test.tsx src/parent/backupLists.test.tsx && npx tsc --noEmit`
Expected: PASS (`src/store` 96 tests, and the 5 backup panel tests); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/store/db.ts src/store/repo.ts src/store/backup.ts src/parent/BackupPanel.tsx src/store/talks.test.ts src/parent/backupTalks.test.tsx src/store/upgradeV6.test.ts src/store/weekLists.test.ts
git commit -m "feat: talk log store (db v7) in backup, restore and undo; a backup from before it keeps the talks here"
```

---

### Task 4: The week: summary numbers, the 2-day note and the focus line

**Files:**
- Create: `src/talk/week.ts`, `src/talk/weekLoad.ts`, `src/talk/week.test.ts`

**Interfaces:**
- Consumes:
  - from Task 1: `THEME_LABEL`, `THEME_EN`; from Task 2: `themeForWords`; from Task 3: `addTalk`, `allTalks`;
  - `troubleWords` (`src/stats/stats.ts`); `introducedNewWords`; `waitingTakes` (`src/session/say.ts`);
  - store calls: `allCards`, `allSessions`, `allWords`, `listParentPassages`, `listRecordings`, `logsSince`; `PASSAGES`; `ladderWordsBesides`.
- Produces:
  - from `week.ts`:
    - types: `WeekRange { from; to; start; end }`, `TalkTotals { days; minutes; times }`, `WeekReading { passageId; title; meaning: 'right' | 'missed' | null }`, `WeekSummary { talk; lessons; langduDays; newly: { read; write; say }; newWords; shaky; reading; waiting; focus: { zh; en } }`, `WeekInput`;
    - functions: `weekRange(now, back = 0)`, `talkTotals(talks, start, end)`, `lastTalkDay(talks): string | null`, `shortDate(key)`, `talkNudge(talks, now): string | null`, `summarizeWeek(i): WeekSummary`, `focusLine(s): { zh; en }`;
    - constants: `SHAKY_MAX = 5`, `TALK_DAYS_AIM = 3`;
  - from `weekLoad.ts`: `loadWeek(db, now, back = 0): Promise<{ range; summary }>`.

- [ ] **Step 1: Write the failing test**

Create `src/talk/week.test.ts`:

```ts
// @vitest-environment node
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { addReviewLog, addTalk, putCards, putWords, saveSession, addRecording } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import type { Recording, ReviewLog, SessionPlan, TalkLog } from '../types';
import { focusLine, summarizeWeek, talkNudge, talkTotals, weekRange, type WeekSummary } from './week';
import { loadWeek } from './weekLoad';

const at = (d: number, h = 19, m = 0) => new Date(2026, 9, d, h, m).getTime();
const plan = (ids: string[]): SessionPlan => ({ steps: ['newwords', 'speaking'], reviewWordIds: [], newWordIds: ids, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
const lesson = (date: string, ids: string[], langdu = true) => ({ ...createSessionRecord(plan(ids), date, 0), flashIndex: ids.length, completed: true, completedSteps: langdu ? (['newwords', 'speaking'] as const).slice() : ['newwords' as const] });
const miss = (wordId: string, d: number): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: at(d), rating: Rating.Again, correct: false });
const take = (passageId: string, d: number, correct: boolean | null): Recording => ({ id: `r${passageId}${d}`, createdAt: at(d), prompt: { kind: 'passage', passageId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 30, ...(correct === null ? {} : { meaning: { correct, picked: 'x' } }) });
const empty: Omit<WeekSummary, 'focus'> = { talk: { days: 3, minutes: 30, times: 3 }, lessons: 5, langduDays: 5, newly: { read: [], write: [], say: [] }, newWords: [], shaky: [], reading: [], waiting: 0 };

describe('the week (parent loop spec §5)', () => {
  it('Monday to Sunday: late Sunday is this week; just after midnight Monday is the next; back 1 is last week', () => {
    expect(weekRange(new Date(2026, 9, 25, 23, 59))).toMatchObject({ from: '2026-10-19', to: '2026-10-25' });
    expect(weekRange(new Date(2026, 9, 26, 0, 5))).toMatchObject({ from: '2026-10-26', to: '2026-11-01' });
    const r = weekRange(new Date(2026, 9, 21), 1);
    expect(r).toEqual({ from: '2026-10-12', to: '2026-10-18', start: new Date(2026, 9, 12).getTime(), end: new Date(2026, 9, 19).getTime() });
  });
  it('talk: days with a talk, minutes added up (none counts 0), times', () => {
    const talks: TalkLog[] = [{ id: 'a', at: at(19, 8), minutes: 5 }, { id: 'b', at: at(19, 20), minutes: 10 }, { id: 'c', at: at(21) }, { id: 'd', at: at(26, 0, 1), minutes: 15 }];
    const r = weekRange(new Date(2026, 9, 21));
    expect(talkTotals(talks, r.start, r.end)).toEqual({ days: 2, minutes: 15, times: 3 });
  });
  it('the 2-day note: nothing today or yesterday; the weekday within six days, the date beyond; never logged', () => {
    const now = new Date(2026, 9, 22, 20); // Thu
    expect(talkNudge([{ id: 'a', at: at(21) }], now)).toBeNull();
    expect(talkNudge([{ id: 'a', at: at(20) }], now)).toBe('No talk logged since Tue.');
    expect(talkNudge([{ id: 'a', at: at(12) }], now)).toBe('No talk logged since 12 Oct.');
    expect(talkNudge([], now)).toBe('No talk logged yet.');
  });
});

describe('the focus line, the first that applies', () => {
  it('a 朗读 question missed', () => {
    expect(focusLine({ ...empty, shaky: ['饿'], reading: [{ passageId: 'p17', title: '小马', meaning: 'missed' }] }).zh).toBe('多读：他这周的朗读题答错了。和他再读一次《小马》，轮流读，读完问问他故事里发生了什么。');
  });
  it('words he missed, in the theme they lean to', () => {
    expect(focusLine({ ...empty, shaky: ['饿', '饱', '甜', '马'] })).toEqual({
      zh: '多聊食物：这周常错的词是饿、饱、甜，聊天的时候多用一用。',
      en: 'Talk more about food: the words he missed most were 饿, 饱, 甜. Use them in conversation.',
    });
  });
  it('fewer than 3 talk days', () => {
    expect(focusLine({ ...empty, talk: { days: 1, minutes: 5, times: 1 }, newWords: ['饿'] }).en).toBe('Talk more: 1 day this week. Try five minutes a day; dinner is enough.');
  });
  it('new words, else a good week', () => {
    expect(focusLine({ ...empty, newWords: ['借'] }).zh).toBe('多用这些词聊天：这周的新词有借。');
    expect(focusLine(empty).zh).toBe('这周很好！下周继续每天聊一聊。');
  });
});

describe('the summary from the stores', () => {
  it('lessons, 朗读 days, what newly passed, new and shaky words, the passages and their questions, talk, waiting', async () => {
    const db = await freshDb();
    await putWords(db, ['饿', '饱', '甜', '马'].map((t) => makeWord(t)));
    await saveSession(db, lesson('2026-10-19', ['b:饿', 'b:饱']));
    await saveSession(db, lesson('2026-10-20', ['b:甜'], false));
    await saveSession(db, lesson('2026-10-12', ['b:马'])); // last week
    await putCards(db, [{ ...makeCard('b:饿', 'recognise', new Date(2026, 9, 21), true) }, { ...makeCard('b:马', 'write', new Date(2026, 9, 15), true) }]);
    for (const l of [miss('b:甜', 20), miss('b:甜', 21), miss('b:饱', 21), miss('b:马', 15)]) await addReviewLog(db, l);
    await addRecording(db, take('p17', 19, false));
    await addRecording(db, take('p17', 21, true)); // its newest take this week: right
    await addRecording(db, take('p20', 20, null));
    await addTalk(db, { id: 'a', at: at(19), minutes: 10 });
    const { range, summary } = await loadWeek(db, new Date(2026, 9, 22, 20));
    expect(range.from).toBe('2026-10-19');
    expect(summary).toMatchObject({
      talk: { days: 1, minutes: 10, times: 1 }, lessons: 2, langduDays: 1,
      newly: { read: ['饿'], write: [], say: [] }, newWords: ['饿', '饱', '甜'], shaky: ['甜', '饱'],
      reading: [{ passageId: 'p17', title: '小马', meaning: 'right' }, { passageId: 'p20', title: '我的学校', meaning: null }],
      waiting: 2,
    });
    expect(summary.focus.zh).toBe('多聊食物：这周常错的词是甜、饱，聊天的时候多用一用。');
    expect((await loadWeek(db, new Date(2026, 9, 22, 20), 1)).summary).toMatchObject({ lessons: 1, newWords: ['马'], shaky: ['马'], newly: { write: ['马'] } });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/talk/week.test.ts`
Expected: FAIL with `Failed to resolve import "./week"`.

- [ ] **Step 3: The week**

Create `src/talk/week.ts`:

```ts
// The week for the parent (parent loop spec §5, 2026-10-18 update): Monday to Sunday, the family's talk time next to his app
// progress, and one focus line for next week. Pure: weekLoad.ts reads the stores.
import { THEME_EN, THEME_LABEL } from '../content/talkPrompts';
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';
import { introducedNewWords } from '../session/runner';
import { troubleWords } from '../stats/stats';
import type { CardRecord, Recording, ReviewLog, SessionRecord, TalkLog } from '../types';
import { themeForWords } from './pick';

/** Monday to Sunday: its first and last day keys, and [start, end) in ms. */
export interface WeekRange { from: string; to: string; start: number; end: number }

/** The week holding `now`, or `back` weeks before it. */
export function weekRange(now: Date, back = 0): WeekRange {
  const day = startOfLocalDay(now);
  const monday = addDays(day, -((day.getDay() + 6) % 7) - 7 * back);
  const next = addDays(monday, 7);
  return { from: localDateKey(monday), to: localDateKey(addDays(monday, 6)), start: monday.getTime(), end: next.getTime() };
}

export interface TalkTotals { days: number; minutes: number; times: number }

/** Talks in [start, end): the days with one, the minutes picked (none counts 0), and how many. */
export function talkTotals(talks: readonly TalkLog[], start: number, end: number): TalkTotals {
  const inside = talks.filter((t) => t.at >= start && t.at < end);
  return { days: new Set(inside.map((t) => localDateKey(new Date(t.at)))).size, minutes: inside.reduce((n, t) => n + (t.minutes ?? 0), 0), times: inside.length };
}

/** The last day a talk was logged; null when none ever was. */
export const lastTalkDay = (talks: readonly TalkLog[]): string | null =>
  talks.length ? localDateKey(new Date(Math.max(...talks.map((t) => t.at)))) : null;

const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '19 Oct': the same on every iPad (not the locale's). */
export const shortDate = (key: string) => { const d = parseDateKey(key); return `${d.getDate()} ${EN_MONTHS[d.getMonth()]}`; };

/** Days from one key to another. */
const between = (a: string, b: string) => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

/** The gentle note when nothing was logged today or yesterday (spec §5): its weekday within six days, its date beyond. */
export function talkNudge(talks: readonly TalkLog[], now: Date): string | null {
  const last = lastTalkDay(talks);
  if (!last) return 'No talk logged yet.';
  const gap = between(last, localDateKey(now));
  if (gap < 2) return null;
  return `No talk logged since ${gap <= 6 ? EN_DAYS[parseDateKey(last).getDay()] : shortDate(last)}.`;
}

/** A passage read with a take this week, and how he did on its question (its newest take's answer; null: no answer kept). */
export interface WeekReading { passageId: string; title: string; meaning: 'right' | 'missed' | null }

export interface WeekSummary {
  talk: TalkTotals;
  lessons: number; // completed lessons (not free play)
  langduDays: number; // lessons that finished their 朗读 step
  newly: { read: string[]; write: string[]; say: string[] }; // newly passed this week
  newWords: string[]; // introduced by his lessons this week
  shaky: string[]; // up to 5 missed most this week, all card kinds
  reading: WeekReading[];
  waiting: number; // takes waiting in Listen & confirm now
  focus: { zh: string; en: string };
}

export interface WeekInput {
  range: WeekRange;
  talks: readonly TalkLog[];
  sessions: readonly SessionRecord[];
  cards: readonly CardRecord[];
  logs: readonly ReviewLog[];
  recordings: readonly Recording[];
  textOf: (wordId: string) => string | undefined;
  titleOf: (passageId: string) => string | undefined;
  waiting: number;
}

export const SHAKY_MAX = 5;

const texts = (ids: readonly string[], textOf: WeekInput['textOf']) => [...new Set(ids.map(textOf).filter((t): t is string => !!t))];

export function summarizeWeek(i: WeekInput): WeekSummary {
  const { range } = i;
  const inWeek = (ms: number) => ms >= range.start && ms < range.end;
  const lessons = i.sessions.filter((s) => !s.free && s.date >= range.from && s.date <= range.to);
  const passed = (kind: CardRecord['kind']) => texts(i.cards.filter((c) => c.kind === kind && c.passed !== undefined && inWeek(c.passed)).map((c) => c.wordId), i.textOf);
  const takes = i.recordings
    .filter((r) => r.prompt.kind === 'passage' && !r.prompt.extra && inWeek(r.createdAt))
    .sort((a, b) => a.createdAt - b.createdAt);
  const newest = new Map<string, Recording>();
  for (const r of takes) newest.set((r.prompt as { passageId: string }).passageId, r);
  const reading = [...newest].map(([passageId, r]): WeekReading => ({
    passageId, title: i.titleOf(passageId) ?? passageId, meaning: r.meaning ? (r.meaning.correct ? 'right' : 'missed') : null,
  }));
  const base = {
    talk: talkTotals(i.talks, range.start, range.end),
    lessons: lessons.filter((s) => s.completed).length,
    langduDays: lessons.filter((s) => s.completedSteps.includes('speaking')).length, // 看图说话 is parked: the speaking step is 朗读
    newly: { read: passed('recognise'), write: passed('write'), say: passed('say') },
    newWords: texts(lessons.flatMap(introducedNewWords), i.textOf),
    shaky: texts(troubleWords(i.logs.filter((l) => inWeek(l.at)), SHAKY_MAX).map((t) => t.wordId), i.textOf),
    reading,
    waiting: i.waiting,
  };
  return { ...base, focus: focusLine(base) };
}

/** Fewer talk days than this in a week asks for more talk. */
export const TALK_DAYS_AIM = 3;

/**
 * One line for next week (spec §5), the first that applies: a 朗读 question missed → read it again together; words he missed →
 * talk about them, in the theme they lean to; fewer than 3 talk days → five minutes a day; new words → use them; else keep going.
 */
export function focusLine(s: Omit<WeekSummary, 'focus'>): { zh: string; en: string } {
  const missed = s.reading.find((r) => r.meaning === 'missed');
  if (missed) return {
    zh: `多读：他这周的朗读题答错了。和他再读一次《${missed.title}》，轮流读，读完问问他故事里发生了什么。`,
    en: `Read more: he missed the question on 《${missed.title}》 this week. Read it again together, taking turns, then ask what happened.`,
  };
  const about = (words: string[], zhWhat: string, enWhat: string) => {
    const list = words.slice(0, 3);
    const theme = themeForWords(list);
    return theme
      ? { zh: `多聊${THEME_LABEL[theme]}：${zhWhat}${list.join('、')}，聊天的时候多用一用。`, en: `Talk more about ${THEME_EN[theme]}: ${enWhat} ${list.join(', ')}. Use them in conversation.` }
      : { zh: `多用这些词聊天：${zhWhat}${list.join('、')}。`, en: `Use these in conversation: ${enWhat} ${list.join(', ')}.` };
  };
  if (s.shaky.length) return about(s.shaky, '这周常错的词是', 'the words he missed most were');
  if (s.talk.days < TALK_DAYS_AIM) return {
    zh: `多聊：这周聊了${s.talk.days}天。试试每天聊五分钟，吃饭的时候就可以。`,
    en: `Talk more: ${s.talk.days} day${s.talk.days === 1 ? '' : 's'} this week. Try five minutes a day; dinner is enough.`,
  };
  if (s.newWords.length) return about(s.newWords, '这周的新词有', "this week's new words are");
  return { zh: '这周很好！下周继续每天聊一聊。', en: 'A good week. Keep the daily talk going.' };
}
```

Create `src/talk/weekLoad.ts`:

```ts
// The week's numbers from the stores (parent loop spec §5), for Progress → Week summary and Share the week.
import { PASSAGES } from '../content';
import { ladderWordsBesides } from '../content/ladder';
import { waitingTakes } from '../session/say';
import type { AppDb } from '../store/db';
import { allCards, allSessions, allTalks, allWords, listParentPassages, listRecordings, logsSince } from '../store/repo';
import { summarizeWeek, weekRange, type WeekRange, type WeekSummary } from './week';

export async function loadWeek(db: AppDb, now: Date, back = 0): Promise<{ range: WeekRange; summary: WeekSummary }> {
  const range = weekRange(now, back);
  const [talks, sessions, cards, logs, recordings, words, parent] = await Promise.all([
    allTalks(db), allSessions(db), allCards(db), logsSince(db, range.start), listRecordings(db), allWords(db), listParentPassages(db),
  ]);
  const text = new Map([...words, ...ladderWordsBesides(words)].map((w) => [w.id, w.text]));
  const title = new Map([...PASSAGES, ...parent].map((p) => [p.id, p.title]));
  const summary = summarizeWeek({
    range, talks, sessions, cards, logs, recordings, waiting: waitingTakes(recordings).length,
    textOf: (id) => text.get(id), titleOf: (id) => title.get(id),
  });
  return { range, summary };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/talk && npx tsc --noEmit`
Expected: PASS (8 new tests, 32 in `src/talk`); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/talk/week.ts src/talk/weekLoad.ts src/talk/week.test.ts
git commit -m "feat: the parent's week: talk next to his lessons, words and 朗读, the 2-day note and one focus line"
```

---

### Task 5: Share with a clipboard fallback, and the text it sends

**Files:**
- Create: `src/talk/share.ts`, `src/talk/share.test.ts`

**Interfaces:**
- Consumes: `KIND_LABEL`, `KIND_EN`, `readingCard`, `wordStarter` (Task 2); `shortDate`, `weekRange`, `WeekRange`, `WeekSummary` (Task 4).
- Produces: `ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'`; `ShareDeps { share?; writeText? }`; `shareText(text, deps?): Promise<ShareResult>` (deps default to `navigator`); `shareNote(r): string | null`; `todayText(cards, today): string`; `weekText(range, summary): string`.

- [ ] **Step 1: Write the failing test**

Create `src/talk/share.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { readingCard, wordStarter } from './pick';
import { shareNote, shareText, todayText, weekText } from './share';
import { weekRange, type WeekSummary } from './week';

const abort = () => Object.assign(new Error('closed'), { name: 'AbortError' });

describe('Share (parent loop spec §5)', () => {
  it('the share sheet when there is one', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { share, writeText })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
    expect(writeText).not.toHaveBeenCalled();
  });
  it('closing the sheet copies nothing and says nothing', async () => {
    const writeText = vi.fn(async () => {});
    const r = await shareText('hi', { share: async () => { throw abort(); }, writeText });
    expect(r).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    expect(shareNote(r)).toBeNull();
  });
  it('no sheet, or a sheet that fails: the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { writeText })).toBe('copied');
    expect(await shareText('hi', { share: async () => { throw new Error('NotAllowedError'); }, writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(shareNote('copied')).toBe('Copied. Paste it into a message.');
  });
  it('neither works', async () => {
    expect(await shareText('hi', {})).toBe('failed');
    expect(await shareText('hi', { writeText: async () => { throw new Error('denied'); } })).toBe('failed');
    expect(shareNote('failed')).toBe('This device could not share or copy it.');
  });
});

describe('the shared text', () => {
  it("today's cards, with the passage's answers beside its questions", () => {
    const cards = [wordStarter({ text: '借', gloss: 'borrow', zuci: [], from: 'list' }), readingCard({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17! }, 1)];
    expect(todayText(cards, '2026-10-19')).toBe([
      '聊一聊 · 19 Oct',
      '',
      '1. 他的词 His words',
      '你在哪里看到过『借』，或者听人说过『借』？',
      "This week's list word: 借 (borrow). Where has he met it? Get him using it about his own day.",
      '· 用『借』说一说你自己的事。',
      '· 『借』可以和哪些字一起用？',
      '试试用：…借…',
      '',
      '2. 一起读 Shared reading',
      '牛爷爷做了什么？（书上：找到了小马）',
      'Shared reading: read 《小马》 together, taking turns a sentence each, then ask who, why, and what he thinks. Last question: If he were in the story, what would he do?',
      '· 小马为什么找不到家了？（书上：跑得很远）',
      '· 如果你是故事里的人，你会怎么做？',
      '试试用：我觉得…因为…',
    ].join('\n'));
  });
  it('the week', () => {
    const s: WeekSummary = {
      talk: { days: 1, minutes: 10, times: 1 }, lessons: 5, langduDays: 4,
      newly: { read: ['借', '饿'], write: [], say: ['森林'] }, newWords: ['借'], shaky: ['甜'],
      reading: [{ passageId: 'p17', title: '小马', meaning: 'missed' }, { passageId: 'p20', title: '我的学校', meaning: null }], waiting: 2,
      focus: { zh: '多读。', en: 'Read more.' },
    };
    expect(weekText(weekRange(new Date(2026, 9, 21)), s)).toBe([
      'ZiJi · week of 19 Oct – 25 Oct',
      'Talk: 1 day · 10 min',
      'Lessons: 5 · 朗读 on 4 days',
      'Newly can read: 借、饿 · write: — · say: 森林',
      'New words: 借',
      'Missed most: 甜',
      '朗读: 《小马》 question missed; 《我的学校》',
      'Waiting in Listen & confirm: 2',
      'Focus: 多读。',
      'Read more.',
    ].join('\n'));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/talk/share.test.ts`
Expected: FAIL with `Failed to resolve import "./share"`.

- [ ] **Step 3: Share**

Create `src/talk/share.ts`:

```ts
// Share (parent loop spec §5): the iPad share sheet, else the clipboard; and the plain text it sends.
import type { TalkCard } from '../types';
import { KIND_EN, KIND_LABEL } from './pick';
import { shortDate, type WeekRange, type WeekSummary } from './week';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';
export interface ShareDeps { share?: (data: ShareData) => Promise<void>; writeText?: (text: string) => Promise<void> }

const deviceDeps = (): ShareDeps => ({
  share: typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined,
  writeText: typeof navigator.clipboard?.writeText === 'function' ? (t) => navigator.clipboard.writeText(t) : undefined,
});

/** The share sheet; closing it (AbortError) copies nothing; no sheet, or another failure, copies to the clipboard. */
export async function shareText(text: string, deps: ShareDeps = deviceDeps()): Promise<ShareResult> {
  if (deps.share) {
    try {
      await deps.share({ text });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
    }
  }
  if (deps.writeText) {
    try {
      await deps.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}

/** What a Share button says after it ran; nothing after a share or a closed sheet. */
export const shareNote = (r: ShareResult): string | null =>
  r === 'copied' ? 'Copied. Paste it into a message.' : r === 'failed' ? 'This device could not share or copy it.' : null;

/** Today's three as a message: each card's label, question, English line, follow-ups (with the passage's answers), pattern. */
export function todayText(cards: readonly TalkCard[], today: string): string {
  const block = (c: TalkCard, n: number) => {
    const ans = (i: number) => (c.answers?.[i] ? `（书上：${c.answers[i]}）` : '');
    return [
      `${n}. ${KIND_LABEL[c.kind]} ${KIND_EN[c.kind]}`,
      `${c.open}${ans(0)}`,
      c.en,
      ...c.followUps.map((f, i) => `· ${f}${ans(i + 1)}`),
      `试试用：${c.pattern}`,
    ].join('\n');
  };
  return [`聊一聊 · ${shortDate(today)}`, ...cards.map((c, i) => block(c, i + 1))].join('\n\n');
}

const join = (xs: readonly string[]) => (xs.length ? xs.join('、') : '—');

/** The week as a message (spec §5 Share the week). */
export function weekText(range: WeekRange, s: WeekSummary): string {
  const reads = s.reading.map((r) => `《${r.title}》${r.meaning === 'right' ? ' question right' : r.meaning === 'missed' ? ' question missed' : ''}`);
  return [
    `ZiJi · week of ${shortDate(range.from)} – ${shortDate(range.to)}`,
    `Talk: ${s.talk.days} day${s.talk.days === 1 ? '' : 's'} · ${s.talk.minutes} min`,
    `Lessons: ${s.lessons} · 朗读 on ${s.langduDays} day${s.langduDays === 1 ? '' : 's'}`,
    `Newly can read: ${join(s.newly.read)} · write: ${join(s.newly.write)} · say: ${join(s.newly.say)}`,
    `New words: ${join(s.newWords)}`,
    `Missed most: ${join(s.shaky)}`,
    `朗读: ${reads.length ? reads.join('; ') : '—'}`,
    ...(s.waiting ? [`Waiting in Listen & confirm: ${s.waiting}`] : []),
    `Focus: ${s.focus.zh}`,
    s.focus.en,
  ].join('\n');
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/talk/share.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/talk/share.ts src/talk/share.test.ts
git commit -m "feat: share the talk cards and the week through the share sheet, else the clipboard"
```

---

### Task 6: 聊一聊 on Today, under the readiness line

**Files:**
- Create: `src/parent/TalkSection.tsx`, `src/parent/talkSection.test.tsx`
- Modify: `src/parent/Dashboard.tsx` (a `talk` slot after `<WeekReadiness …/>`)
- Modify: `src/parent/ParentArea.tsx` (the `talk` place; the section in Today)
- Modify: `src/parent/parentArea.test.tsx` (Today shows 聊一聊; `HOME` keys)
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `todayTalk`, `swapTalk` (Task 2); `addTalk`, `allTalks`, `deleteTalk` (Task 3); `talkNudge`, `talkTotals`, `weekRange`, `TalkTotals` (Task 4); `shareText`, `shareNote`, `todayText` (Task 5); `KIND_LABEL`, `KIND_EN`; `newId` (`src/lib/id.ts`).
- Produces:
  - `MINUTE_CHIPS = [5, 10, 15]`, `UNDO_MS = 10_000`;
  - `TalkCards({ cards, onSwap, busy? })`, `TalkLogger({ week, saving, undoable, onLog, onUndo })` (both presentational, reused by Task 9);
  - `TalkSection({ onLogged?, undoMs? })` (Task 7 adds `onNavigate`);
  - `Dashboard`'s new prop `talk?: ComponentChildren`;
  - `ParentPlace` gains `'talk'` (`HOME.talk = 'today'`).

- [ ] **Step 1: Write the failing test**

Create `src/parent/talkSection.test.tsx`:

```tsx
// 聊一聊 on Today (parent loop spec §5, 2026-10-18 update): the cards open, 换一个 swaps one, Share uses the sheet or copies, and
// 「✓ 聊了」 logs once with its minutes, with Undo for a short while.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { allTalks, getSettings, saveKid } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, EMPTY_READING } from '../types';
import { TalkSection } from './TalkSection';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const NOW = new Date(2026, 9, 19, 20);

async function open(undoMs?: number) {
  const app = await makeAppData({ now: () => NOW });
  await saveKid(app.db, { ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { p17: { reads: 1, lastRead: '2026-10-19', rest: 3, q: 1 } } } });
  const onLogged = vi.fn();
  renderWithApp(<TalkSection onLogged={onLogged} undoMs={undoMs} />, app);
  await screen.findByRole('heading', { name: /聊一聊 Talk/ });
  return { app, onLogged };
}
const cards = () => screen.getAllByRole('listitem').filter((li) => li.classList.contains('talk__card'));

describe('聊一聊 on Today', () => {
  it('three cards, each labelled; shared reading of today’s passage; a tap shows the follow-ups and the passage’s answers', async () => {
    await open();
    expect(cards()).toHaveLength(3);
    expect(cards().map((c) => c.querySelector('.talk__kind')!.textContent)).toEqual(['话题 · Topic', '一起读 · Shared reading', '话题 · Topic']);
    const reading = within(cards()[1]!);
    const q = reading.getByRole('button', { name: /牛爷爷做了什么？/ });
    expect(q.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(q);
    expect(q.getAttribute('aria-expanded')).toBe('true');
    expect(reading.getByText(/小马为什么找不到家了？/).textContent).toContain('(书上：跑得很远)');
    expect(reading.getByText('试试用：我觉得…因为…')).toBeTruthy();
  });
  it('换一个 swaps that card only, and it stays swapped', async () => {
    const { app } = await open();
    const before = cards().map((c) => c.querySelector('.talk__q')!.textContent);
    fireEvent.click(within(cards()[2]!).getByRole('button', { name: /换一个/ }));
    await waitFor(() => expect(cards()[2]!.querySelector('.talk__q')!.textContent).not.toBe(before[2]));
    expect(cards().slice(0, 2).map((c) => c.querySelector('.talk__q')!.textContent)).toEqual(before.slice(0, 2));
    expect((await getSettings(app.db)).talkDay!.cards[2]!.open).toBe(cards()[2]!.querySelector('.talk__q')!.textContent);
  });
  it('Share uses the share sheet with today’s text', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Share today’s' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect((share.mock.calls[0] as unknown as [{ text: string }])[0].text).toMatch(/^聊一聊 · 19 Oct\n\n1\. 话题 Topic/);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('no share sheet: copied, and says so', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Share today’s' }));
    expect((await screen.findByRole('status')).textContent).toBe('Copied. Paste it into a message.');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('聊一聊 · 19 Oct'));
  });
  it('✓ 聊了 with 10 min logs one talk (a double tap too); the week line adds up; Undo removes it', async () => {
    const { app, onLogged } = await open();
    fireEvent.click(screen.getByRole('button', { name: '10 min' }));
    const done = screen.getByRole('button', { name: /聊了 We talked/ });
    fireEvent.click(done);
    fireEvent.click(done);
    await waitFor(async () => expect(await allTalks(app.db)).toHaveLength(1));
    expect((await allTalks(app.db))[0]).toMatchObject({ at: NOW.getTime(), minutes: 10 });
    expect(await screen.findByText('This week: 1 day · 10 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: '10 min' }).getAttribute('aria-pressed')).toBe('false'); // the chip resets
    expect(onLogged).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await allTalks(app.db)).toEqual([]));
    expect(await screen.findByText('This week: 0 days · 0 min')).toBeTruthy();
  });
  it('Undo goes after its time', async () => {
    await open(300);
    fireEvent.click(screen.getByRole('button', { name: /聊了 We talked/ }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull(), { timeout: 1000 });
  });
  it('the 2-day note before the first talk', async () => {
    await open();
    expect(screen.getByText('No talk logged yet.')).toBeTruthy();
  });
});
```

In `src/parent/parentArea.test.tsx`, in `every old tab is reachable`, replace

```ts
    expect(await screen.findByText('Day streak')).toBeTruthy();
    expect(await heading('Listen & confirm')).toBeTruthy();
```

with

```ts
    expect(await screen.findByText('Day streak')).toBeTruthy();
    expect(await heading(/聊一聊 Talk/)).toBeTruthy();
    expect(document.getElementById(placeId('talk'))).toBeTruthy();
    expect(await heading('Listen & confirm')).toBeTruthy();
```

and in `every old tab has a home, and its section is there`, add `'talk'` to the sorted key list:

```ts
    expect(Object.keys(HOME).sort()).toEqual(['backup', 'credits', 'dashboard', 'import', 'listen', 'memory', 'passages', 'pictures', 'recordings', 'rewards', 'school', 'settings', 'skills', 'talk', 'week', 'words'].sort());
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/parent/talkSection.test.tsx src/parent/parentArea.test.tsx`
Expected: FAIL with `Failed to resolve import "./TalkSection"`.

- [ ] **Step 3: The section**

Create `src/parent/TalkSection.tsx`:

```tsx
// 聊一聊 on Today (parent loop spec §5, 2026-10-18 update): under the weekly-list readiness line, today's three cards, Share,
// and 「✓ 聊了」 with minutes and Undo. The parent area is English; the prompts are Chinese with an English line for helpers.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { newId } from '../lib/id';
import { addTalk, allTalks, deleteTalk } from '../store/repo';
import { swapTalk, todayTalk } from '../talk/load';
import { KIND_EN, KIND_LABEL } from '../talk/pick';
import { shareNote, shareText, todayText } from '../talk/share';
import { talkNudge, talkTotals, weekRange, type TalkTotals } from '../talk/week';
import { localDateKey } from '../lib/date';
import type { TalkCard, TalkLog } from '../types';

export const MINUTE_CHIPS = [5, 10, 15] as const;
/** How long 「Undo」 stays after a talk is logged. */
export const UNDO_MS = 10_000;

/** The three cards; a tap opens a card's follow-ups, pattern and sample (or the passage's answers). */
export function TalkCards({ cards, onSwap, busy = false }: { cards: readonly TalkCard[]; onSwap: (slot: number) => void; busy?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol class="talk__cards">
      {cards.map((c, i) => {
        const ans = (n: number) => c.answers?.[n] && <span class="talk__answer"> (书上：{c.answers[n]})</span>;
        return (
          <li key={c.id} class="talk__card">
            <p class="talk__kind"><span lang="zh-CN">{KIND_LABEL[c.kind]}</span> · {KIND_EN[c.kind]}</p>
            <button type="button" class="talk__open" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span lang="zh-CN" class="talk__q">{c.open}</span>{ans(0)}
            </button>
            <p class="talk__en">{c.en}</p>
            {open === i && (
              <div class="talk__more">
                <ul>{c.followUps.map((f, n) => <li key={f} lang="zh-CN">{f}{ans(n + 1)}</li>)}</ul>
                <p lang="zh-CN">试试用：{c.pattern}</p>
                {c.sample && <p class="talk__sample" lang="zh-CN">比如：{c.sample}</p>}
              </div>
            )}
            <button type="button" class="small-btn talk__swap" disabled={busy} onClick={() => onSwap(i)}>换一个 Another</button>
          </li>
        );
      })}
    </ol>
  );
}

/** 「✓ 聊了」 with an optional minutes chip (picked first, cleared after), and Undo for the newest talk. */
export function TalkLogger({ week, saving, undoable, onLog, onUndo }: { week: TalkTotals; saving: boolean; undoable: boolean; onLog: (minutes?: number) => void; onUndo: () => void }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  return (
    <div class="talk__log">
      <div class="talk__chips" role="group" aria-label="Minutes (optional)">
        {MINUTE_CHIPS.map((m) => (
          <button key={m} type="button" class={`chip ${minutes === m ? 'is-on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(minutes === m ? null : m)}>{m} min</button>
        ))}
      </div>
      <button type="button" class="btn btn--primary talk__done" disabled={saving} onClick={() => { onLog(minutes ?? undefined); setMinutes(null); }}>
        ✓ <span lang="zh-CN">聊了</span> We talked
      </button>
      {undoable && <button type="button" class="small-btn" disabled={saving} onClick={onUndo}>Undo</button>}
      <p class="talk__week">This week: {week.days} day{week.days === 1 ? '' : 's'} · {week.minutes} min</p>
    </div>
  );
}

/** The Today section. `onLogged`: a talk was logged or undone (the top line looks again). */
export function TalkSection({ onLogged, undoMs = UNDO_MS }: { onLogged?: () => void; undoMs?: number }) {
  const { db, now } = useApp();
  const [cards, setCards] = useState<TalkCard[] | null>(null);
  const [talks, setTalks] = useState<TalkLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<string | null>(null); // the talk Undo removes
  const [note, setNote] = useState<string | null>(null);
  const guard = useRef(false); // a double tap logs once
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    void (async () => {
      setCards(await todayTalk(db, now()));
      setTalks(await allTalks(db));
    })();
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);
  if (!cards) return <p>Loading…</p>;

  const swap = async (slot: number) => {
    setBusy(true);
    setCards(await swapTalk(db, now(), slot));
    setBusy(false);
  };
  const log = async (minutes?: number) => {
    if (guard.current) return;
    guard.current = true;
    setSaving(true);
    const t: TalkLog = { id: newId(), at: now().getTime(), ...(minutes ? { minutes } : {}) };
    await addTalk(db, t);
    setTalks(await allTalks(db));
    setLast(t.id);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLast(null), undoMs);
    setSaving(false);
    guard.current = false;
    onLogged?.();
  };
  const undo = async () => {
    if (!last) return;
    setSaving(true);
    await deleteTalk(db, last);
    setTalks(await allTalks(db));
    setLast(null);
    setSaving(false);
    onLogged?.();
  };
  const share = async () => setNote(shareNote(await shareText(todayText(cards, localDateKey(now())))));
  const week = weekRange(now());
  const nudge = talkNudge(talks, now());

  return (
    <section class="panel talk" aria-labelledby="talk-title">
      <h2 id="talk-title"><span lang="zh-CN">聊一聊</span> Talk</h2>
      <p class="hint">Three things to talk about today, in Mandarin. Follow his answers; the pattern is something to nudge toward, not a script.</p>
      {nudge && <p class="talk__nudge">{nudge}</p>}
      <TalkCards cards={cards} onSwap={(i) => void swap(i)} busy={busy} />
      <div class="talk__share">
        <button type="button" class="small-btn" onClick={() => void share()}>Share today’s</button>
        {note && <p role="status">{note}</p>}
      </div>
      <TalkLogger week={talkTotals(talks, week.start, week.end)} saving={saving} undoable={!!last} onLog={(m) => void log(m)} onUndo={() => void undo()} />
    </section>
  );
}
```

- [ ] **Step 4: On Today**

In `src/parent/Dashboard.tsx`:
- add `import type { ComponentChildren } from 'preact';` as the first line;
- the signature becomes:

```tsx
/** The parent's overview. `waiting`: the takes still to review, live, when the queue is on the same page (Today). `talk`: 聊一聊,
 *  under the weekly-list readiness line (parent loop spec, 2026-10-18 update). */
export function Dashboard({ onNavigate, waiting, talk }: { onNavigate: (place: ParentPlace) => void; waiting?: number; talk?: ComponentChildren }) {
```

- right after `      <WeekReadiness onOpen={() => onNavigate('week')} />` add `      {talk}`.

In `src/parent/ParentArea.tsx`:
- `export type ParentPlace = 'dashboard' | 'talk' | 'listen' | 'recordings' | 'school' | 'skills' | 'memory' | ContentPart | 'rewards' | 'settings' | 'backup' | 'credits';`
- in `HOME`, the first row becomes `  dashboard: 'today', talk: 'today', listen: 'today', recordings: 'today',`
- after `import { SettingsPanel } from './SettingsPanel';` add `import { TalkSection } from './TalkSection';`
- replace the dashboard line in Today:

```tsx
              <div id={placeId('dashboard')} class="parent__section"><Dashboard onNavigate={navigate} waiting={waiting ?? undefined} /><ExtraLessonButton /></div>
```

with

```tsx
              <div id={placeId('dashboard')} class="parent__section">
                <Dashboard onNavigate={navigate} waiting={waiting ?? undefined} talk={<div id={placeId('talk')}><TalkSection /></div>} />
                <ExtraLessonButton />
              </div>
```

Append to `src/styles.css`:

```css
/* 聊一聊 on Today (parent loop spec §5.2) */
.talk__cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.talk__card { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 14px; border: 2px solid var(--line); border-radius: var(--radius); background: #fff; min-width: 0; }
.talk__card p { margin: 0; line-height: 1.4; }
.talk__kind { font-size: 14px; font-weight: 800; color: var(--ink-soft); }
.talk__open { border: none; background: none; padding: 4px 0; text-align: left; font: inherit; color: var(--ink); min-height: 44px; }
.talk__q { font-family: var(--hanzi); font-size: 22px; line-height: 1.4; }
.talk__answer { color: var(--ink-soft); font-size: 15px; }
.talk__en { font-size: 15px; color: var(--ink-soft); }
.talk__more { display: flex; flex-direction: column; gap: 4px; font-size: 18px; }
.talk__more ul { margin: 0; padding-left: 20px; }
.talk__sample { color: var(--ink-soft); }
.talk__swap { align-self: flex-end; margin-top: auto; }
.talk__share { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.talk__share p { margin: 0; }
.talk__log { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.talk__chips { display: flex; gap: 8px; }
.talk__chips .chip { min-height: 44px; padding: 6px 14px; font-weight: 800; }
.talk__chips .chip.is-on { background: var(--green); }
.talk__done { min-height: 48px; }
.talk__week, .talk__nudge { margin: 0; flex-basis: 100%; color: var(--ink-soft); }
```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: PASS (talkSection 7 tests; parentArea and the other parent tests unchanged); no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/parent/TalkSection.tsx src/parent/talkSection.test.tsx src/parent/Dashboard.tsx src/parent/ParentArea.tsx src/parent/parentArea.test.tsx src/styles.css
git commit -m "feat: 聊一聊 on Today under the readiness line: three cards, 换一个, Share, ✓ 聊了 with minutes and Undo"
```

---

### Task 7: Week summary on Progress

**Files:**
- Create: `src/parent/WeekSummaryPanel.tsx`, `src/parent/weekSummary.test.tsx`
- Modify: `src/parent/ParentArea.tsx` (the `summary` place; first on Progress; `TalkSection`'s `onNavigate`)
- Modify: `src/parent/TalkSection.tsx` (`onNavigate` and the Week summary link)
- Modify: `src/parent/talkSection.test.tsx`, `src/parent/parentArea.test.tsx`
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `loadWeek` (Task 4); `shortDate`, `WeekRange`, `WeekSummary` (Task 4); `shareText`, `shareNote`, `weekText` (Task 5); `ParentPlace`.
- Produces: `WeekView({ range, summary, back, onBack, onNavigate, onShare, note? })` (presentational, reused by Task 9); `WeekSummaryPanel({ onNavigate })`; `ParentPlace` gains `'summary'` (`HOME.summary = 'progress'`); `TalkSection({ onNavigate, onLogged?, undoMs? })`.

- [ ] **Step 1: Write the failing tests**

Create `src/parent/weekSummary.test.tsx`:

```tsx
// Progress → Week summary (parent loop spec §5, 2026-10-18 update): this week's rows and focus line, 上周 for last week, Share.
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addTalk } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { WeekSummaryPanel } from './WeekSummaryPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const NOW = new Date(2026, 9, 22, 20);

describe('Week summary', () => {
  it('this week: talk days and minutes, the focus line; 上周 shows last week', async () => {
    const app = await makeAppData({ now: () => NOW });
    await addTalk(app.db, { id: 'a', at: new Date(2026, 9, 20, 19).getTime(), minutes: 15 });
    await addTalk(app.db, { id: 'b', at: new Date(2026, 9, 14, 19).getTime(), minutes: 5 });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('19 Oct – 25 Oct')).toBeTruthy();
    expect(screen.getByText('1 day · 15 min')).toBeTruthy();
    expect(screen.getByText('多聊：这周聊了1天。试试每天聊五分钟，吃饭的时候就可以。')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /上周/ }));
    expect(await screen.findByText('12 Oct – 18 Oct')).toBeTruthy();
    expect(screen.getByText('1 day · 5 min')).toBeTruthy();
  });
  it('Share the week copies when there is no share sheet', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    const app = await makeAppData({ now: () => NOW });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Share the week' }));
    expect((await screen.findByRole('status')).textContent).toBe('Copied. Paste it into a message.');
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^ZiJi · week of 19 Oct – 25 Oct\nTalk: 0 days · 0 min/)));
  });
});
```

In `src/parent/talkSection.test.tsx`:
- in `open`, add `  const onNavigate = vi.fn();` before `const onLogged`;
- render `<TalkSection onNavigate={onNavigate} onLogged={onLogged} undoMs={undoMs} />`;
- return `{ app, onNavigate, onLogged }`;
- replace the last test with:

```tsx
  it('the 2-day note, and Week summary goes to Progress', async () => {
    const { onNavigate } = await open();
    expect(screen.getByText('No talk logged yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Week summary' }));
    expect(onNavigate).toHaveBeenCalledWith('summary');
  });
```

In `src/parent/parentArea.test.tsx`, in `every old tab is reachable`, replace

```ts
    const order = [...document.querySelectorAll('.parent__section-title')].map((h) => h.textContent);
    expect(order).toEqual(['School', 'Skills', 'Memory']);
    for (const p of ['school', 'skills', 'memory'] as const) expect(document.getElementById(placeId(p))).toBeTruthy(); // where a shortcut would scroll
```

with

```ts
    expect(await heading('Week summary')).toBeTruthy();
    const order = [...document.querySelectorAll('.parent__section-title')].map((h) => h.textContent);
    expect(order).toEqual(['Week summary', 'School', 'Skills', 'Memory']);
    for (const p of ['summary', 'school', 'skills', 'memory'] as const) expect(document.getElementById(placeId(p))).toBeTruthy(); // where a shortcut would scroll
```

add `'summary'` to the `HOME` key list (`… 'skills', 'summary', 'talk', 'week', 'words'`), and at the end of the `the overview's shortcuts land on the right tab and section` describe add:

```tsx
  it('Week summary opens Progress at the summary', async () => {
    enter(await open());
    fireEvent.click(await screen.findByRole('button', { name: 'Week summary' }));
    expect(tab(/Progress/).getAttribute('aria-selected')).toBe('true');
    await lands('summary');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/parent/weekSummary.test.tsx src/parent/talkSection.test.tsx src/parent/parentArea.test.tsx`
Expected: FAIL with `Failed to resolve import "./WeekSummaryPanel"`.

- [ ] **Step 3: The summary**

Create `src/parent/WeekSummaryPanel.tsx`:

```tsx
// Progress → Week summary (parent loop spec §5, 2026-10-18 update): Monday to Sunday, the family's talk next to his app progress,
// one focus line for next week, last week a tap away, and Share the week.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { shareNote, shareText, weekText } from '../talk/share';
import { shortDate, type WeekRange, type WeekSummary } from '../talk/week';
import { loadWeek } from '../talk/weekLoad';
import type { ParentPlace } from './ParentArea';

const list = (xs: readonly string[]) => (xs.length ? xs.join('、') : '—');

/** The week's rows (presentational: the WebKit stage case renders it too). */
export function WeekView({ range, summary: s, back, onBack, onNavigate, onShare, note }: {
  range: WeekRange; summary: WeekSummary; back: number; onBack: (back: number) => void; onNavigate: (place: ParentPlace) => void; onShare: () => void; note?: string | null;
}) {
  return (
    <section class="panel week-summary" aria-labelledby="week-summary-title">
      <h2 class="parent__section-title" id="week-summary-title">Week summary</h2>
      <div class="segmented segmented--two" role="tablist" aria-label="Which week">
        <button type="button" role="tab" aria-selected={back === 0} class={`segmented__opt ${back === 0 ? 'is-active' : ''}`} onClick={() => onBack(0)}>This week</button>
        <button type="button" role="tab" aria-selected={back === 1} class={`segmented__opt ${back === 1 ? 'is-active' : ''}`} onClick={() => onBack(1)}><span lang="zh-CN">上周</span> Last week</button>
      </div>
      <p class="week-summary__range">{shortDate(range.from)} – {shortDate(range.to)}</p>
      <dl class="week-summary__rows">
        <dt>Talk</dt><dd>{s.talk.days} day{s.talk.days === 1 ? '' : 's'} · {s.talk.minutes} min</dd>
        <dt>Lessons</dt><dd>{s.lessons} · <span lang="zh-CN">朗读</span> on {s.langduDays} day{s.langduDays === 1 ? '' : 's'}</dd>
        <dt>Newly can</dt><dd>read <span lang="zh-CN">{list(s.newly.read)}</span> · write <span lang="zh-CN">{list(s.newly.write)}</span> · say <span lang="zh-CN">{list(s.newly.say)}</span></dd>
        <dt>New words</dt><dd lang="zh-CN">{list(s.newWords)}</dd>
        <dt>Missed most</dt><dd lang="zh-CN">{list(s.shaky)}</dd>
        <dt><span lang="zh-CN">朗读</span></dt>
        <dd>{s.reading.length ? s.reading.map((r) => <span key={r.passageId} class="week-summary__read"><span lang="zh-CN">《{r.title}》</span>{r.meaning === 'right' ? ' ✓' : r.meaning === 'missed' ? ' ✗ question missed' : ''}</span>) : '—'}</dd>
        {s.waiting > 0 && (<><dt>Waiting</dt><dd>{s.waiting} take{s.waiting === 1 ? '' : 's'} <button type="button" class="small-btn" onClick={() => onNavigate('listen')}>Listen & confirm</button></dd></>)}
      </dl>
      <div class="week-summary__focus">
        <p><strong>Focus next week</strong></p>
        <p lang="zh-CN">{s.focus.zh}</p>
        <p class="hint">{s.focus.en}</p>
      </div>
      <button type="button" class="small-btn" onClick={onShare}>Share the week</button>
      {note && <p role="status">{note}</p>}
    </section>
  );
}

export function WeekSummaryPanel({ onNavigate }: { onNavigate: (place: ParentPlace) => void }) {
  const { db, now } = useApp();
  const [back, setBack] = useState(0);
  const [week, setWeek] = useState<{ range: WeekRange; summary: WeekSummary } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    setNote(null);
    void loadWeek(db, now(), back).then(setWeek);
  }, [back]);
  if (!week) return <p>Loading…</p>;
  const share = async () => setNote(shareNote(await shareText(weekText(week.range, week.summary))));
  return <WeekView range={week.range} summary={week.summary} back={back} onBack={setBack} onNavigate={onNavigate} onShare={() => void share()} note={note} />;
}
```

- [ ] **Step 4: The link from Talk, and the place**

In `src/parent/TalkSection.tsx`:
- add `import type { ParentPlace } from './ParentArea';` after the `../types` import;
- the signature becomes `export function TalkSection({ onNavigate, onLogged, undoMs = UNDO_MS }: { onNavigate: (place: ParentPlace) => void; onLogged?: () => void; undoMs?: number }) {`;
- after the `<TalkLogger … />` line add:

```tsx
      <button type="button" class="small-btn" onClick={() => onNavigate('summary')}>Week summary</button>
```

In `src/parent/ParentArea.tsx`:
- `ParentPlace` gains `'summary'` after `'recordings'`;
- `HOME`'s second row becomes `  summary: 'progress', school: 'progress', skills: 'progress', memory: 'progress',`;
- after `import { WeekPanel } from './WeekPanel';` add `import { WeekSummaryPanel } from './WeekSummaryPanel';`;
- `<TalkSection />` becomes `<TalkSection onNavigate={navigate} />`;
- replace `          {tab === 'progress' && <SkillsPanel school={<ProgressTab />} />}` with:

```tsx
          {tab === 'progress' && (
            <>
              <div id={placeId('summary')} class="parent__section"><WeekSummaryPanel onNavigate={navigate} /></div>
              <SkillsPanel school={<ProgressTab />} />
            </>
          )}
```

Append to `src/styles.css`:

```css
/* Week summary on Progress (parent loop spec §5.3) */
.segmented--two { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 420px; }
@media (max-width: 599px) { .segmented.segmented--two { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.week-summary__range { margin: 0; font-weight: 800; }
.week-summary__rows { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 0; }
.week-summary__rows dt { font-weight: 800; color: var(--ink-soft); }
.week-summary__rows dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.week-summary__read { display: inline-block; margin-right: 10px; }
.week-summary__focus { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--gold-soft); }
.week-summary__focus p { margin: 0; line-height: 1.4; }
```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/parent/WeekSummaryPanel.tsx src/parent/weekSummary.test.tsx src/parent/TalkSection.tsx src/parent/talkSection.test.tsx src/parent/ParentArea.tsx src/parent/parentArea.test.tsx src/styles.css
git commit -m "feat: Week summary first on Progress: talk next to his week, one focus line, 上周, Share the week"
```

---

### Task 8: "This week, try this" at the top of Today

**Files:**
- Create: `src/talk/tryThis.ts`, `src/talk/tryThis.test.ts`, `src/parent/TryThis.tsx`
- Modify: `src/parent/ParentArea.tsx` (the line on top of Today; `onLogged`; shortcut scroll retry)
- Modify: `src/parent/parentArea.test.tsx`
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes:
  - `allTalks` (Task 3); `lastTalkDay` (Task 4); `TalkSection`'s `onLogged` (Task 6);
  - `activeLists`, `isReady`, `CLASS_BEHIND_AT` (weeklist); `loadKnowledge`; `ladderWordsBesides`; `classLessonAt` (`src/content/curriculum.ts`); `previewPlan` (`src/session/record.ts`); `waitingTakes`; `backupNudgeDays` (`src/parent/backupNudge.ts`);
  - store calls: `allWeekLists`, `allSessions`, `listRecordings`.
- Produces:
  - `LIST_SOON_DAYS = 2`, `TALK_GAP_DAYS = 2`, `BACKUP_URGENT_DAYS = 30`;
  - types: `ListGap`, `TrySignals`, `TryAction { text; button: string | null; place: ParentPlace | null }`;
  - functions: `tryThis(s): TryAction`, `loadTrySignals(db, now, settings, takes?): Promise<TrySignals>`;
  - components: `TryThis({ onNavigate, waiting?, talked? })`, `TryLine({ action, onNavigate })` (presentational, reused by Task 9).

- [ ] **Step 1: Write the failing tests**

Create `src/talk/tryThis.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { putWeekList, putWords, addTalk, addRecording, updateSettings, getSettings, saveSession } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { createSessionRecord } from '../session/runner';
import { loadTrySignals, tryThis, type TrySignals } from './tryThis';

const calm: TrySignals = { today: '2026-10-19', lists: [], lastTalk: '2026-10-19', takes: 0, backupDays: null, classLeft: null };
const gap = { name: '复习一', readyBy: '2026-10-21', homeworkDue: '2026-10-23', notReady: 4, total: 12, weak: ['街道', '闪闪亮', '雨伞', '风筝'] };

describe('"This week, try this": the first that applies (2026-10-18 update)', () => {
  it('a backup 30 days overdue goes first', () => {
    expect(tryThis({ ...calm, backupDays: 31, lists: [gap], lastTalk: null, takes: 3 })).toEqual({ text: 'No backup for 31 days. Save one to Files now; it takes a minute.', button: 'Back up now', place: 'backup' });
  });
  it('then a list checked within 2 days with words not ready', () => {
    expect(tryThis({ ...calm, lists: [gap], lastTalk: null, takes: 3, backupDays: 20 })).toEqual({ text: '复习一: 4 of 12 not ready for the check on Wednesday. Go over 街道, 闪闪亮, 雨伞 with him.', button: 'Open 本周词语', place: 'week' });
    expect(tryThis({ ...calm, today: '2026-10-21', lists: [gap] }).text).toBe('复习一: 4 of 12 not ready for the check today. Go over 街道, 闪闪亮, 雨伞 with him.');
  });
  it('then no talk logged today or yesterday (or ever)', () => {
    expect(tryThis({ ...calm, lastTalk: null, takes: 3 })).toEqual({ text: 'Try one of today’s talk prompts below, then tap ✓ 聊了.', button: 'Go to 聊一聊', place: 'talk' });
    expect(tryThis({ ...calm, lastTalk: '2026-10-17', takes: 3 }).text).toBe('No talk logged since Saturday. Try today’s shared reading questions at dinner.');
    expect(tryThis({ ...calm, lastTalk: '2026-10-18', takes: 3 }).place).toBe('listen');
  });
  it('then takes waiting, then a backup overdue, then class words behind', () => {
    expect(tryThis({ ...calm, takes: 1, backupDays: 15 })).toEqual({ text: '1 take waiting in Listen & confirm. His Say words move on once you confirm them.', button: 'Listen & confirm', place: 'listen' });
    expect(tryThis({ ...calm, backupDays: 15, classLeft: 4, lists: [{ ...gap, notReady: 0 }] }).place).toBe('backup');
    expect(tryThis({ ...calm, classLeft: 4, lists: [{ ...gap, notReady: 0 }] }).text).toBe('4 class words still to start before Friday.');
    expect(tryThis({ ...calm, classLeft: 11, lists: [{ ...gap, notReady: 0 }] }).text).toBe('He is behind his class. See where he is.');
  });
  it('then a list further off; else a calm line with no button', () => {
    expect(tryThis({ ...calm, lists: [{ ...gap, readyBy: '2026-10-22' }] }).text).toBe('复习一: 8 of 12 ready, check on Thursday.');
    expect(tryThis(calm)).toEqual({ text: 'Nothing pressing. Enjoy today’s talk below.', button: null, place: null });
  });
});

describe('the signals from the stores', () => {
  it('lists, the last talk, takes, the backup', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('山')]);
    await putWeekList(db, { id: 'wl:a', name: '复习一', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:山', text: '山', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] });
    await addTalk(db, { id: 'a', at: new Date(2026, 9, 17, 20).getTime() });
    await addRecording(db, { id: 'r', createdAt: 1, prompt: { kind: 'say', wordId: 'b:山' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 });
    await saveSession(db, { ...createSessionRecord({ steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-09-01', 0) });
    await updateSettings(db, { lastBackupAt: null });
    const s = await loadTrySignals(db, new Date(2026, 9, 19, 20), await getSettings(db));
    expect(s).toMatchObject({ today: '2026-10-19', lastTalk: '2026-10-17', takes: 1, lists: [{ name: '复习一', notReady: 1, total: 1, weak: ['山'] }] });
    expect(s.backupDays).toBe(48);
  });
});
```

In `src/parent/parentArea.test.tsx`, in `every old tab is reachable`, after `expect(await screen.findByText('Day streak')).toBeTruthy();` add:

```ts
    expect(await screen.findByText('This week, try this')).toBeTruthy();
```

and at the end of the shortcuts describe add:

```tsx
  it('the top line opens Today on 聊一聊 when no talk is logged yet', async () => {
    enter(await open({ lastBackupAt: Date.now() }));
    fireEvent.click(await screen.findByRole('button', { name: 'Go to 聊一聊' }));
    expect(tab(/Today/).getAttribute('aria-selected')).toBe('true');
    await lands('talk');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/talk/tryThis.test.ts src/parent/parentArea.test.tsx`
Expected: FAIL with `Failed to resolve import "./tryThis"`, and parentArea cannot find `This week, try this`.

- [ ] **Step 3: The rule and its signals**

Create `src/talk/tryThis.ts`:

```ts
// "This week, try this" (2026-10-18 update; the review asked the parent area to open with one action): the single most useful
// thing for the parent to do now, from what the app already knows. Pure; loadTrySignals reads the stores.
import { loadKnowledge } from '../app/knowledge';
import { classLessonAt } from '../content/curriculum';
import { ladderWordsBesides } from '../content/ladder';
import { localDateKey, parseDateKey } from '../lib/date';
import { backupNudgeDays } from '../parent/backupNudge';
import type { ParentPlace } from '../parent/ParentArea';
import { previewPlan } from '../session/record';
import { waitingTakes } from '../session/say';
import type { AppDb } from '../store/db';
import { allSessions, allTalks, allWeekLists, listRecordings } from '../store/repo';
import type { Settings } from '../types';
import { activeLists } from '../weeklist/plan';
import { CLASS_BEHIND_AT, isReady } from '../weeklist/readiness';
import { lastTalkDay } from './week';

/** A list whose check is this many days away or fewer, with words not ready, comes first. */
export const LIST_SOON_DAYS = 2;
/** No talk logged today or yesterday asks for one (spec §5's 2-day nudge). */
export const TALK_GAP_DAYS = 2;
/** A backup this overdue goes before everything: losing his progress costs more than any one evening. */
export const BACKUP_URGENT_DAYS = 30;

export interface ListGap { name: string; readyBy: string; homeworkDue: string; notReady: number; total: number; weak: string[] }
export interface TrySignals {
  today: string;
  lists: ListGap[]; // running lists, homework day not behind, earliest ready-by first
  lastTalk: string | null; // the last day a talk was logged
  takes: number; // waiting in Listen & confirm
  backupDays: number | null; // days without a backup, once past the 14-day nudge (backupNudgeDays); null: not due
  classLeft: number | null; // class words still unstarted on homework day (a list week only); null: unknown
}
export interface TryAction { text: string; button: string | null; place: ParentPlace | null }

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (key: string) => EN_DAYS[parseDateKey(key).getDay()]!;
const between = (a: string, b: string) => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

/**
 * The first that applies: a backup 30+ days overdue; a list checked within 2 days with words not ready; no talk logged today or
 * yesterday; takes waiting; a backup overdue; class words behind; a list further off with words not ready. Else a calm line.
 */
export function tryThis(s: TrySignals): TryAction {
  const backup = (d: number): TryAction => ({ text: `No backup for ${d} days. Save one to Files now; it takes a minute.`, button: 'Back up now', place: 'backup' });
  if (s.backupDays !== null && s.backupDays >= BACKUP_URGENT_DAYS) return backup(s.backupDays);
  const gaps = s.lists.filter((l) => l.notReady > 0);
  const soon = gaps.find((l) => { const d = between(s.today, l.readyBy); return d >= 0 && d <= LIST_SOON_DAYS; });
  if (soon) {
    const when = soon.readyBy === s.today ? 'today' : weekday(soon.readyBy);
    const go = soon.weak.length ? ` Go over ${soon.weak.slice(0, 3).join(', ')} with him.` : '';
    return { text: `${soon.name}: ${soon.notReady} of ${soon.total} not ready for the check ${when === 'today' ? 'today' : `on ${when}`}.${go}`, button: 'Open 本周词语', place: 'week' };
  }
  if (!s.lastTalk) return { text: 'Try one of today’s talk prompts below, then tap ✓ 聊了.', button: 'Go to 聊一聊', place: 'talk' };
  if (between(s.lastTalk, s.today) >= TALK_GAP_DAYS) return { text: `No talk logged since ${weekday(s.lastTalk)}. Try today’s shared reading questions at dinner.`, button: 'Go to 聊一聊', place: 'talk' };
  if (s.takes > 0) return { text: `${s.takes} take${s.takes === 1 ? '' : 's'} waiting in Listen & confirm. His Say words move on once you confirm them.`, button: 'Listen & confirm', place: 'listen' };
  if (s.backupDays !== null) return backup(s.backupDays);
  const listed = s.lists[0];
  if (s.classLeft && listed) {
    return s.classLeft > CLASS_BEHIND_AT
      ? { text: 'He is behind his class. See where he is.', button: 'See Progress', place: 'school' }
      : { text: `${s.classLeft} class word${s.classLeft === 1 ? '' : 's'} still to start before ${weekday(listed.homeworkDue)}.`, button: 'See Progress', place: 'school' };
  }
  const later = gaps[0];
  if (later) return { text: `${later.name}: ${later.total - later.notReady} of ${later.total} ready, check on ${weekday(later.readyBy)}.`, button: 'Open 本周词语', place: 'week' };
  return { text: 'Nothing pressing. Enjoy today’s talk below.', button: null, place: null };
}

/** What tryThis needs, from the stores. The class shortfall is worked out only in a list week (as the readiness line does). */
export async function loadTrySignals(db: AppDb, now: Date, settings: Settings, takes?: number): Promise<TrySignals> {
  const today = localDateKey(now);
  const [lists, talks, sessions, recordings] = await Promise.all([allWeekLists(db), allTalks(db), allSessions(db), takes === undefined ? listRecordings(db) : Promise.resolve([])]);
  const open = activeLists(lists, now).filter((l) => today <= l.homeworkDue);
  let gaps: ListGap[] = [];
  let classLeft: number | null = null;
  if (open.length) {
    const know = await loadKnowledge(db);
    const words = new Map([...know.words, ...ladderWordsBesides(know.words)].map((w) => [w.id, w]));
    gaps = open.map((l) => {
      const notReady = l.items.filter((i) => !isReady(i, l, words.get(i.wordId)));
      return { name: l.name, readyBy: l.readyBy, homeworkDue: l.homeworkDue, notReady: notReady.length, total: l.items.length, weak: notReady.map((i) => i.text) };
    });
    if (classLessonAt(now, settings) !== null) classLeft = await previewPlan(db, now).then((p) => p.classShort ?? null, () => null);
  }
  const firstUse = sessions.reduce<number | null>((m, s) => { const t = new Date(`${s.date}T00:00`).getTime(); return m === null || t < m ? t : m; }, null);
  return {
    today, lists: gaps, lastTalk: lastTalkDay(talks),
    takes: takes ?? waitingTakes(recordings).length,
    backupDays: backupNudgeDays({ lastBackupAt: settings.lastBackupAt, firstUse, now: now.getTime() }),
    classLeft,
  };
}
```

Create `src/parent/TryThis.tsx`:

```tsx
// The top of Today (2026-10-18 update): one line, "This week, try this", and one button to where it is done.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadTrySignals, tryThis, type TryAction } from '../talk/tryThis';
import type { ParentPlace } from './ParentArea';

/** `waiting`: the takes still to review, live from Today's queue; `talked`: bumped when a talk is logged or undone. */
export function TryThis({ onNavigate, waiting, talked = 0 }: { onNavigate: (place: ParentPlace) => void; waiting?: number | null; talked?: number }) {
  const { db, now, settings } = useApp();
  const [action, setAction] = useState<TryAction | null>(null);
  useEffect(() => {
    void loadTrySignals(db, now(), settings, waiting ?? undefined).then((s) => setAction(tryThis(s)));
  }, [waiting, talked]);
  return action ? <TryLine action={action} onNavigate={onNavigate} /> : null;
}

/** The line itself (presentational: the WebKit stage case renders it too). */
export function TryLine({ action, onNavigate }: { action: TryAction; onNavigate: (place: ParentPlace) => void }) {
  return (
    <div class="try-this" role="note" aria-label="This week, try this">
      <p class="try-this__head">This week, try this</p>
      <p class="try-this__text">{action.text}</p>
      {action.button && action.place && <button type="button" class="small-btn" onClick={() => onNavigate(action.place!)}>{action.button}</button>}
    </div>
  );
}
```

- [ ] **Step 4: On top of Today, and shortcuts that wait for their section**

In `src/parent/ParentArea.tsx`:
- after `import { TalkSection } from './TalkSection';` add `import { TryThis } from './TryThis';`;
- before `let lastPart: ContentPart = 'week';` add:

```ts
/** How many times (50 ms apart) a shortcut looks for its section before giving up. */
const SCROLL_TRIES = 20;
```

- before `  const countWaiting = async () =>` add:

```ts
  const [talked, setTalked] = useState(0); // a talk logged or undone: the top line looks again
```

- replace the scroll effect

```ts
  useEffect(() => {
    if (!goTo) return;
    document.getElementById(placeId(goTo))?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    setGoTo(null);
  }, [goTo, tab, part, allRecordings]);
```

with

```ts
  useEffect(() => {
    if (!goTo) return;
    // a section inside a panel still loading (聊一聊 waits for the overview) shows a moment later: look again for up to a second
    let tries = 0;
    const look = () => {
      const el = document.getElementById(placeId(goTo));
      if (!el && tries++ < SCROLL_TRIES) return;
      clearInterval(timer);
      el?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      setGoTo(null);
    };
    const timer = setInterval(look, 50);
    look();
    return () => clearInterval(timer);
  }, [goTo, tab, part, allRecordings]);
```

- the dashboard block becomes:

```tsx
              <div id={placeId('dashboard')} class="parent__section">
                <TryThis onNavigate={navigate} waiting={waiting} talked={talked} />
                <Dashboard onNavigate={navigate} waiting={waiting ?? undefined}
                  talk={<div id={placeId('talk')}><TalkSection onNavigate={navigate} onLogged={() => setTalked((n) => n + 1)} /></div>} />
                <ExtraLessonButton />
              </div>
```

Append to `src/styles.css`:

```css
/* "This week, try this" on top of Today (parent loop spec §5.1) */
.try-this { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 16px; border: 2px solid var(--ink); border-radius: var(--radius); background: var(--gold-soft); }
.try-this p { margin: 0; line-height: 1.4; }
.try-this__head { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
.try-this__text { font-size: 18px; font-weight: 700; }
```

- [ ] **Step 5: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; every test file passes (340 before this plan, 349 after it).

- [ ] **Step 6: Commit**

```bash
git add src/talk/tryThis.ts src/talk/tryThis.test.ts src/parent/TryThis.tsx src/parent/ParentArea.tsx src/parent/parentArea.test.tsx src/styles.css
git commit -m "feat: Today opens with one 'This week, try this' line; shortcuts wait for a section still loading"
```

---

### Task 9: WebKit fit, the full suite and the build

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (imports; a `talk` case before `else if (which === 'listen') {`)
- Modify: `scripts/stage-cases.ts` (the `talk` checks before `  // a weekly list (weekly list spec 2026-10-17 §7): 认新词 cards`)

**Interfaces:**
- Consumes: `TalkCards`, `TalkLogger` (Task 6); `WeekView` (Task 7); `TryLine` (Task 8); `pickDay` (Task 2); `talkWord` (Task 2); `weekRange`, `WeekSummary` (Task 4); `PASSAGES`, `PASSAGE_QUESTIONS`, `builtinWords` (already imported by the page).
- Produces: stage case `talk`; screenshots `fit-shots/stage-cases/talk-<size>.png` at all five sizes (iphone-se, iphone-safari, iphone-15, ipad-landscape, ipad-portrait).

- [ ] **Step 1: The stage page**

In `scripts/stage-cases/page.tsx`, after `import { CheckEnd, type MissRow } from '../../src/app/CheckScreen';` add:

```tsx
import { TalkCards, TalkLogger } from '../../src/parent/TalkSection';
import { TryLine } from '../../src/parent/TryThis';
import { WeekView } from '../../src/parent/WeekSummaryPanel';
import { pickDay } from '../../src/talk/pick';
import { talkWord } from '../../src/talk/load';
import { weekRange, type WeekSummary } from '../../src/talk/week';
```

and insert before `else if (which === 'listen') {`:

```tsx
else if (which === 'talk') {
  // the parent loop (spec 2026-10-12, 2026-10-18 update): Today's top line (the longest, a list check), 聊一聊 with the longest
  // word card (a list word with its example) and shared reading of the passage with the longest questions, the reading card
  // open; logging with Undo showing; the Week summary with every row full
  const words = builtinWords(0);
  const qs = Object.entries(PASSAGE_QUESTIONS).sort(([, a], [, b]) => b.map((q) => q.q).join('').length - a.map((q) => q.q).join('').length)[0]!;
  const p = PASSAGES.find((x) => x.id === qs[0])!;
  const cards = pickDay({ today: '2026-10-19', seen: {}, words: [talkWord(words.find((w) => w.text === '借')!, 'list')], passage: { id: p.id, title: p.title, questions: qs[1] } });
  const summary: WeekSummary = {
    talk: { days: 4, minutes: 45, times: 5 }, lessons: 6, langduDays: 5,
    newly: { read: ['借', '饿', '饱', '甜', '森', '林', '游', '泳'], write: ['大', '小', '马'], say: ['森林', '游泳'] },
    newWords: ['借', '饿', '饱', '甜', '森', '林'], shaky: ['饿', '饱', '甜', '森', '泳'],
    reading: [{ passageId: p.id, title: p.title, meaning: 'missed' }, { passageId: 'p20', title: '我的学校', meaning: 'right' }], waiting: 3,
    focus: { zh: `多读：他这周的朗读题答错了。和他再读一次《${p.title}》，轮流读，读完问问他故事里发生了什么。`, en: `Read more: he missed the question on 《${p.title}》 this week. Read it again together, taking turns, then ask what happened.` },
  };
  render(
    <div class="screen screen--scroll parent">
      <main class="parent__body">
        <TryLine action={{ text: '本周词语 第九课: 11 of 24 not ready for the check on Wednesday. Go over 闪闪亮, 五颜六色, 小心翼翼 with him.', button: 'Open 本周词语', place: 'week' }} onNavigate={() => {}} />
        <section class="panel talk">
          <h2><span lang="zh-CN">聊一聊</span> Talk</h2>
          <TalkCards cards={cards} onSwap={() => {}} />
          <TalkLogger week={{ days: 1, minutes: 15, times: 2 }} saving={false} undoable onLog={() => {}} onUndo={() => {}} />
        </section>
        <WeekView range={weekRange(new Date(2026, 9, 22))} summary={summary} back={0} onBack={() => {}} onNavigate={() => {}} onShare={() => {}} />
      </main>
    </div>,
    app,
  );
  (document.querySelectorAll<HTMLButtonElement>('.talk__open')[1])?.click(); // the shared-reading card open: its tallest state
}
```

- [ ] **Step 2: The checks**

In `scripts/stage-cases.ts`, insert before `  // a weekly list (weekly list spec 2026-10-17 §7): 认新词 cards`:

```ts
  // the parent loop (spec 2026-10-12, 2026-10-18 update): the top line, 聊一聊 and Week summary looked at on every size; every
  // button big enough to tap; nothing makes the page scroll sideways; nothing in a talk card spills out of it
  await page.goto(`file://${dir}/index.html?case=talk`);
  await page.waitForSelector('.talk__more');
  await page.screenshot({ path: `fit-shots/stage-cases/talk-${size.name}.png`, fullPage: true });
  for (const q of ['.try-this .small-btn', '.talk__open', '.talk__swap', '.talk__chips .chip', '.talk__done', '.talk__log .small-btn', '.week-summary .segmented__opt', '.week-summary .small-btn']) {
    const els = await page.$$(q);
    if (!els.length) problems.push(`${size.name} talk: no ${q}`);
    for (const b of els) {
      const box = await b.boundingBox();
      if (!box || Math.min(box.width, box.height) < 43.5) { problems.push(`${size.name} talk: ${q} under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`); break; }
    }
  }
  const talkSideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (talkSideways > 1) problems.push(`${size.name} talk: the page scrolls sideways ${talkSideways}px`);
  problems.push(...(await page.evaluate((n) => {
    for (const card of document.querySelectorAll('.talk__card')) {
      const c = card.getBoundingClientRect();
      for (const el of card.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.left < c.left - 1 || r.right > c.right + 1)) return [`${n} talk: spills out of its card: ${(el.textContent ?? '').trim().slice(0, 12)}`];
      }
    }
    return [];
  }, size.name)));
```

- [ ] **Step 3: Run the stage cases in WebKit**

Run: `npx tsx scripts/stage-cases.ts`
Expected: exit 0 with no `talk:` problems. Then look at `fit-shots/stage-cases/talk-iphone-se.png` and `talk-ipad-landscape.png`. On the phone, the cards stack, the shared-reading card is open with its answers, and nothing runs off the right edge. On the iPad, the three cards sit side by side.

- [ ] **Step 4: The whole suite and the build**

Run: `npx vitest run && npm run build`
Expected: every test file passes; `tsc` and `vite build` succeed.

- [ ] **Step 5: Commit**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "test: WebKit stage case for the parent loop: try-this, 聊一聊 and Week summary at every size"
```

---

## Self-review (done while writing)

- **Spec coverage:**
  - §2 decisions: Tasks 6–8 (where), Task 3 (tracking data), Task 6 (one tap), Tasks 1–2 (content approach), Task 8 (top of Today).
  - §3 bank and check: Task 1.
  - §4 picks: his words (Task 2 `talkWords`, `wordOptions`, `wordStarter`); shared reading (`readingCard`, `todaysPassage`); theme (`themeOptions`); stable day, follow passage, swap, no-repeat, 60 days (`todayTalk`, `followPassage`, `swapCard`, `markSeen`).
  - §5.1: Task 8. §5.2: Task 6, plus Task 7's link. §5.3: Tasks 4 and 7.
  - §6: Task 3 (v7, `LIST_STORES`, `talksMissing`), Task 1 (`talkDay` / `talkSeen`).
  - §7 tests: each in its task. WebKit: Task 9.
  - §8: nothing built from it.
- **Placeholder scan:** no TBD or "similar to". Every code step is complete code, run against the base.
- **Type consistency:**
  - `TalkCard.answers` is (Task 1) set in `readingCard` (Task 2) and read in `todayText` (Task 5) and `TalkCards` (Task 6).
  - `TalkWord.from` is set in `talkWord` (Task 2) and read in `wordStarter`.
  - `ParentPlace` gains `'talk'` (Task 6) and `'summary'` (Task 7); `TryAction.place` is `ParentPlace | null` (Task 8).
  - `TalkSection`'s props grow from `{ onLogged?, undoMs? }` (Task 6) to `{ onNavigate, … }` (Task 7), and Task 8 passes both.
  - `loadTrySignals(…, takes?)` takes ParentArea's `waiting ?? undefined`.
- **Review Focus:** each of the five lines names its test and task. Checked and not listed: an empty bank or an unknown passage id (the loaders skip it); a list item whose word was deleted (`talkWord({ text })`, tested in Task 2); a shortcut tapped before its panel loads (Task 8, tested).
