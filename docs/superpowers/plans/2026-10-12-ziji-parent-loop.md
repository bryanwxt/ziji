# The parent loop: daily talk prompts and a weekly summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 「聊一聊 Talk」 tab in the PIN-gated parent area gives the parent three Mandarin conversation starters a day (one from his new words, one from his 朗读 passage, one rotating PSLE theme), a one-tap 「✓ 聊了」 log with optional minutes, a Monday–Sunday summary that puts his app progress next to the family's talk time with one focus line for next week, Share for both, and a talk line with a 2-day nudge on Overview.

**Architecture:** Content first: an 80-starter bank (`src/content/talkPrompts.ts`) checked by `scripts/check-content.ts`. A new `talks` object store (db version 5) holds `{ id, at, minutes? }` and rides in backup/restore through `LIST_STORES`. Two pure modules do the thinking — `src/talk/pick.ts` (the day's three cards, swap, 14-day no-repeat, the generated word and passage starters) and `src/talk/week.ts` (week range, talk sums, the summary, the focus line, the nudge, the share text) — and `src/talk/load.ts` reads the stores for them and keeps today's picks in `settings.talkDay` / `settings.talkSeen`. `src/parent/TalkPanel.tsx` renders presentational `TalkCards`, `TalkLogger`, `WeekView` (reused by the WebKit stage case) inside `TalkPanel`; `src/talk/share.ts` wraps `navigator.share` with a clipboard fallback.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), idb 8 + fake-indexeddb, vitest 4 + @testing-library/preact, lucide-preact, tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`).

**Spec:** `docs/superpowers/specs/2026-10-12-ziji-parent-loop-design.md` (read it in full before Task 1).

## Global Constraints

- Who talks: **the parent, who is fluent**. Starters give topics, follow-ups and target sentence patterns, not scripts. Never shown to the child; **no streak**.
- Where: a new tab **「聊一聊 Talk」** in the PIN-gated parent area, **after Listen & confirm**, plus Share. No accounts, no server.
- Bank: **about 80** starters (this plan: exactly 80, `t01`–`t80`), themes 家庭 family, 学校 school, 朋友 friends, 食物 food, 节日 festivals, 新加坡 Singapore, 环境 environment, 科技 technology, 心情与品德 feelings and values — **at least 6 per theme**. Each has `id`, `theme`, `open`, `en`, **2–3** `followUps`, `pattern`, `sample`, optional `hooks`.
- Patterns rotate through exactly: **我觉得…因为…, 先…然后…最后…, 如果…就…, 虽然…但是…, 有时候…有时候…, 我最喜欢…因为…**.
- Questions are open (no yes/no-only), warm, about his own life. Every Han character in a starter is in `builtin.json` at **HSK level ≤ 3** or on the 欢乐伙伴2.0 **reading lists up to 二下** (`moe2024.json`), or on a short allow-list (`TALK_ALLOWED`, measured: empty).
- **3 prompts a day**: (1) his word — from his **last 7 days of new words introduced in a lesson**, a starter whose `hooks` include the word or one of its characters, else a **generated word starter** from one fixed template with the word's gloss and the sentence-bank example; (2) his **朗读 passage** — its meaning question opened up into a conversation, falling back to a theme starter when 朗读 is off or there is no current passage; (3) **a rotating theme** — a theme **not used in the last 6 days**, its **least recently shown** starter.
- **Stable through the day**: seeded from the date and stored once made (`settings.talkDay: { date, cards }`). **「换一个」** replaces one card with the next candidate of the same kind and stores the swap. **Never repeats** a starter shown in the **last 14 days**, unless the bank for that kind runs out.
- Card shows `open`, its English line, and its kind label **今天的新词 · 朗读 · 话题**; tap expands follow-ups, the pattern as **「试试用：<pattern>」** and the sample.
- Share: `navigator.share`, else the clipboard with a **"Copied"** note.
- **「✓ 聊了 We talked」** with optional chips **5, 10, 15 min**; more than once a day; minutes add up; **"Undo last" for 10 s**.
- This week = **Monday to Sunday**, current week, **「上周」** toggle for last week. Rows: Talk (days, total minutes); his app progress (newly reached read / write / say this week, lessons done, 朗读 passage days); Shaky words (**up to 5**, from review logs); 朗读 (passages, meaning question right/missed); Waiting for you (Say and read-aloud takes, link to Listen & confirm); Focus next week (one line, e.g. 「多聊 食物 — 这周的新词：饿、饱、甜」, 「多读：他这周的朗读题答错了，问问他《小马》的故事」); Share the week.
- Overview: a small line **"Talk: 3 days · 25 min this week"** and a gentle **"No talk logged since Tue"** when none has been logged for 2 days.
- Data: talk log `{ id, at: number, minutes?: number }` **in backup and restore**; **no migration** — a db version bump adds the store, following the existing upgrade pattern.
- TypeScript lib is ES2022: no `findLast` / `findLastIndex` / `toSorted`.
- Screenshots in **WebKit** via playwright-core (installed). If it is missing, stop and ask before `npx playwright-core install webkit`.
- Out of scope: push notifications or reminders outside the app, syncing across devices, recording or scoring the conversation, a child-facing talk feature, listening clips, 看图说话, 造句.

## Rulings

- Ruling: the talk log is a new object store `talks` (`keyPath: 'id'`, index `byAt`), `DB_VERSION` 4 → 5 with `if (oldVersion < 5)` in `openAppDb`, and `'talks'` joins `LIST_STORES` — backup, restore, the emergency dump and "a store absent from an older backup is kept" all follow `LIST_STORES` with no other change; no existing store holds parent events — cost if wrong: a store name.
- Ruling: `settings.talkDay` stores the three cards themselves (`TalkCard[]`), not just ids — a generated card (his word, his passage) can't be rebuilt from an id once the passage is deleted or the gloss changes; the spec's `{ date, ids }` is satisfied by each card's `id` — cost if wrong: ~2 KB more in settings.
- Ruling: what was shown lives in `settings.talkSeen: Record<id, lastDay>`, pruned at 60 days (`SEEN_KEEP_DAYS`); it travels with settings in backups — cost if wrong: after 60 days a starter counts as never shown.
- Ruling: "new words introduced in a lesson" = `introducedNewWords(session)` (认新字 reached them) of non-free sessions dated in the last 7 days including today, newest lesson first and its last word first — `plan.newWordIds` also holds words the time box never reached; an extra lesson is never saved (`SessionScreen`), so its words aren't counted — cost if wrong: an extra lesson's words don't get a word card.
- Ruling: a hook matches a word when it equals the word or shares a Han character with it (hooks hold words, so 爷 finds 「爷爷」; 年 finds 「新年」) — cost if wrong: a very common character (一) finds several starters, all still on topic.
- Ruling: the generated word starter is one template (`wordStarter`): open 「今天学了『X』（gloss）。你会用『X』说什么？」, three follow-ups (where he met it; the example sentence, or things at home; 组词), pattern 「我…X…」, sample = the example, else up to two 组词, else the word; gloss = the first sense of `cardMeaning`; example = his first `sentencesFor` sentence, else the sentence bank's first gap filled — measured for 借: 'to borrow' and 「我可以借你的笔吗？」 — cost if wrong: generic wording on a word no starter is about.
- Ruling: the "current passage" is `kid.reading.passageId` while 朗读 is on and its `lastDay` is within the last 7 days, looked up among parent texts then built-ins; it gives up to three starters `r:<id>:0` (its meaning question + 「如果是你，你会怎么做？」, only when it has a question), `r:<id>:1` (retell), `r:<id>:2` (favourite line), so 「换一个」 and the 14-day rule have something to rotate through — cost if wrong: a passage finished six days ago still gets the card.
- Ruling: the word slot with no new words, like the 朗读 slot, falls back to a theme starter; a fallback avoids themes already on screen — spec names only the 朗读 fallback — cost if wrong: none.
- Ruling: "shown in the last 14 days" = shown 0–13 days ago (`NO_REPEAT_DAYS = 14`); when a kind has nothing fresh it takes its least recently shown candidate, never one on screen; "not used in the last 6 days" = last used more than 6 days ago (`THEME_GAP_DAYS = 6`), else the least recently used theme; ties go by a shuffle seeded from the date (`mulberry32(seedFromString(today))`) — measured: over 28 days with a passage, all 9 themes come round every 4–5 days and no bank starter repeats — cost if wrong: a starter a day early or late.
- Ruling: 「换一个」 excludes every card on screen; the swapped-out card stays in `talkSeen` (it was shown); a slot with nothing of its own kind left gets a theme starter; nothing at all left changes nothing — cost if wrong: none.
- Ruling: "characters that newly reached read, write or say" = words whose `recognise`, `write` or `say` card's `passed` falls in the week (a 词语 counts once, as itself) — cards hold the pass time; the town's rungs are per word — cost if wrong: a 词语 is listed as a word.
- Ruling: lessons done = completed non-free sessions dated in the week; 朗读 days = days with a lesson passage take (`prompt.kind === 'passage'`, not `extra`); a passage's meaning result = its last answered take that week — a day with the microphone blocked has no take, as with the Listen & confirm answer — cost if wrong: such a day isn't counted.
- Ruling: shaky words = `troubleWords` (Again ratings) over every review log in the week, all card kinds (a Say ✗ included), top 5 — cost if wrong: one more kind of miss listed.
- Ruling: "Waiting for you" is the queue now (`waitingTakes`), shown the same for this week and last — cost if wrong: none.
- Ruling: the focus line takes the first that applies: a 朗读 question missed → 「多读：他这周的朗读题答错了，问问他《title》的故事」; shaky words → 「多聊 <theme> — 这周常错的字：a、b、c」 (theme = `themeForWords`, the theme whose starters' hooks match most; none → 「多用这周常错的字聊天：…」); fewer than 3 talk days → 「多聊：这周聊了 N 天，试试每天聊五分钟」; new words → 「多聊 <theme> — 这周的新词：…」; else 「这周很好！下周继续每天聊一聊」 — measured: 饿、饱、甜 → 食物 — cost if wrong: one line.
- Ruling: the nudge shows when nothing was logged today or yesterday: 「No talk logged since Tue.」 within six days, 「No talk logged since 1 Oct.」 beyond, 「No talk logged yet.」 when none ever — cost if wrong: a new install sees the note until the first talk.
- Ruling: a minutes chip is picked (toggled) before 「✓ 聊了」 and resets after; a talk without minutes adds 0; 「Undo」 removes the newest logged talk only and goes after 10 s (`UNDO_MS`, a prop so the test waits 300 ms); ✓ and Undo are disabled while saving, and a ref guard makes a double tap log once — cost if wrong: one more tap.
- Ruling: Share calls `navigator.share({ text })`; an `AbortError` (sheet closed) copies nothing and says nothing; any other failure or no share sheet copies with 「Copied. Paste it into a message.」 under the button tapped; neither works → 「This device could not share or copy it.」 — cost if wrong: a copy after the parent cancelled.
- Ruling: dates in the shared text and the week heading use a fixed English formatter (`shortDate`: '12 Oct'), not the locale — the same on every iPad and in tests — cost if wrong: none.
- Ruling: the tab is `['talk', '聊一聊 Talk', MessageCircle]` right after Listen & confirm; the existing tab-count test goes 13 → 14 — cost if wrong: an icon.
- Ruling: the theme label 心情与品德 (parent-facing) is not content-checked; the check covers each starter's `open`, `followUps`, `pattern`, `sample`, `hooks`, and a test checks the generated templates' fixed words — measured: all 80 starters and the templates pass with `TALK_ALLOWED = ''` — cost if wrong: none.

## Review Focus

1. A parent text he is reading has no meaning question: the 朗读 card still comes (a retelling), never a blank or a crash — test in Task 3 (`a parent text without a question has the retelling and the favourite line only`, and `his current passage: … a parent text with or without its question`).
2. The parent double-taps 「✓ 聊了」: one talk is logged — test in Task 5 (`a double tap logs once`).
3. The parent opens the share sheet and closes it: nothing is copied and no "Copied" note shows — test in Task 5 (`closing the sheet copies nothing`).
4. Restoring a backup made before this feature (no `talks` in it): the talks already on the iPad stay — test in Task 2 (`a backup from before talks keeps the talks already on the iPad`).
5. Late Sunday night or just after midnight Monday: the talk and the week land in the right Monday–Sunday week — test in Task 4 (`Monday to Sunday: this week, and last week`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/types.ts` | `TalkTheme`, `TalkPrompt`, `TalkKind`, `TalkCard`, `TalkDay`, `TalkLog`; `Settings.talkDay`, `Settings.talkSeen` | 1 |
| `src/content/talkPrompts.ts` (new) | `TALK_THEMES`, `THEME_LABEL`, `TALK_PATTERNS`, `TALK_ALLOWED`, the 80 `TALK_PROMPTS` | 1 |
| `scripts/check-content.ts` (+ test) | `checkTalkPrompts`, `p2Readable` | 1 |
| `src/store/db.ts`, `src/store/repo.ts`, `src/store/talks.test.ts` (new) | the `talks` store (v5), `addTalk`, `deleteTalk`, `talksBetween`, `allTalks`; backup via `LIST_STORES` | 2 |
| `src/talk/pick.ts` (new) | `pickDay`, `swapCard`, `markSeen`, `wordStarter`, `passageStarters`, `hookMatches`, `themeForWords`, `KIND_LABEL` | 3 |
| `src/talk/load.ts` (new) | `talkWord`, `newTalkWords`, `currentTalkPassage`, `todayTalk`, `swapTalk`; `loadWeek` | 3, 4 |
| `src/talk/week.ts` (new) | `weekRange`, `talkTotals`, `talkNudge`, `summarizeWeek`, `focusLine`, `weekText`, `shortDate` | 4 |
| `src/talk/share.ts` (new) | `shareText`, `todayText` | 5 |
| `src/parent/TalkPanel.tsx` (new) | `TalkCards`, `TalkLogger`, `WeekView`, `TalkPanel` | 5, 6 |
| `src/parent/ParentArea.tsx`, `src/parent/parentB.test.tsx` | the tab; tab count 14 | 5 |
| `src/parent/Dashboard.tsx` | the Overview talk tile and nudge | 7 |
| `src/styles.css` | talk cards, logger, week, tile note | 5, 7 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | WebKit `talk` case | 8 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (under heavy machine load a few slow rendered tests can time out — rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts too. Before Task 1: `ls node_modules/.bin/vitest` (run `npm ci` if it is missing). Baseline on 008ada4: 229 files, 1962 tests pass; after Task 8: 236 files, 2020 tests.

---

### Task 1: The talk-prompt bank and its content check

**Files:**
- Modify: `src/types.ts` (new types before `export interface RewardGoal {`; two `Settings` fields after `contentVersion`)
- Create: `src/content/talkPrompts.ts`
- Modify: `scripts/check-content.ts` (import line; two functions at the end)
- Modify: `scripts/check-content.test.ts` (imports; a `describe` at the end)

**Interfaces:**
- Consumes: `BUILTIN` (`src/content`), `moe2024.json` (`lessons: { term, read }[]`).
- Produces: `type TalkTheme = 'family' | 'school' | 'friends' | 'food' | 'festivals' | 'singapore' | 'environment' | 'technology' | 'feelings'`; `interface TalkPrompt { id; theme; open; en; followUps: string[]; pattern; sample; hooks?: string[] }`; `type TalkKind = 'word' | 'langdu' | 'theme'`; `interface TalkCard { kind: TalkKind; id: string; theme?: TalkTheme; word?: string; open; en; followUps: string[]; pattern; sample }`; `interface TalkDay { date: string; cards: TalkCard[] }`; `interface TalkLog { id: string; at: number; minutes?: number }`; `Settings.talkDay?: TalkDay`, `Settings.talkSeen?: Record<string, string>`; `TALK_THEMES: readonly TalkTheme[]`, `THEME_LABEL: Readonly<Record<TalkTheme, string>>`, `TALK_PATTERNS` (6, `as const`), `TALK_ALLOWED = ''`, `TALK_PROMPTS: readonly TalkPrompt[]`; `checkTalkPrompts(prompts, themes, patterns, readable: ReadonlySet<string>): string[]`; `p2Readable(chars: readonly BuiltinChar[], lessons: readonly { term: string; read: string }[], allowed = ''): Set<string>`.

- [ ] **Step 1: Write the failing test**

In `scripts/check-content.test.ts` replace

```ts
import { checkContent, checkPassageQuestions } from './check-content';
```

with

```ts
import { TALK_ALLOWED, TALK_PATTERNS, TALK_PROMPTS, TALK_THEMES } from '../src/content/talkPrompts';
import { checkContent, checkPassageQuestions, checkTalkPrompts, p2Readable } from './check-content';
```

and append:

```ts
describe('talk prompts (spec 2026-10-12 parent loop §3)', () => {
  const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons, TALK_ALLOWED);
  it('about 80 starters, at least 6 per theme, every field there, one of the six patterns, P2 characters only', () => {
    expect(TALK_PROMPTS).toHaveLength(80);
    expect(checkTalkPrompts(TALK_PROMPTS, TALK_THEMES, TALK_PATTERNS, readable)).toEqual([]);
  });
  it('every pattern is used, and most starters name words to pick them by', () => {
    expect(new Set(TALK_PROMPTS.map((p) => p.pattern))).toEqual(new Set(TALK_PATTERNS));
    expect(TALK_PROMPTS.filter((p) => p.hooks?.length).length).toBe(80);
  });
  it('flags a duplicate id, a thin starter, an unknown pattern, a hard character and a thin theme', () => {
    const p = TALK_PROMPTS[0]!;
    const problems = checkTalkPrompts([p, { ...p, followUps: ['为什么？'], pattern: '因为…所以…', sample: '我喜欢鬱金香。' }], TALK_THEMES, TALK_PATTERNS, readable);
    expect(problems).toEqual(expect.arrayContaining([
      'duplicate talk prompt t01', 't01: needs 2–3 follow-ups', 't01: pattern 因为…所以… is not one of the six', 't01: uses 鬱 beyond P2', 'theme school has 0 starters, expected at least 6',
    ]));
  });
  it('the allow-list is the shortest it can be: HSK 1–3 and his lists up to 二下 hold every character but these', () => {
    expect(TALK_ALLOWED).toBe('');
    expect(readable.has('借')).toBe(true);
    expect(readable.has('鬱')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run scripts/check-content.test.ts`
Expected: FAIL — `Failed to resolve import "../src/content/talkPrompts"`.

- [ ] **Step 3: The types**

In `src/types.ts`, insert before `export interface RewardGoal {`:

```ts
/** The PSLE conversation themes the talk prompts cover (spec 2026-10-12 parent loop §3). */
export type TalkTheme = 'family' | 'school' | 'friends' | 'food' | 'festivals' | 'singapore' | 'environment' | 'technology' | 'feelings';

/** A conversation starter for the parent (spec 2026-10-12 parent loop §3). */
export interface TalkPrompt {
  id: string; // 't01'…
  theme: TalkTheme;
  open: string; // the opening question, Chinese, P2-level
  en: string; // one-line English gloss for the parent
  followUps: string[]; // 2–3 open follow-ups
  pattern: string; // the sentence pattern to nudge toward, e.g. '我觉得…因为…'
  sample: string; // what a P2 answer could sound like
  hooks?: string[]; // words this starter is built around (picking by his new words)
}

/** Which of the day's three a card is (spec §4): his word, his 朗读 passage, a rotating theme. */
export type TalkKind = 'word' | 'langdu' | 'theme';

/** One of the day's cards: a bank starter, or one generated around his word or passage. `id` is the starter's: 't07', 'w:借', 'r:p17:0'. */
export interface TalkCard {
  kind: TalkKind;
  id: string;
  theme?: TalkTheme; // bank starters only
  word?: string; // kind 'word': the new word it is about
  open: string;
  en: string;
  followUps: string[];
  pattern: string;
  sample: string;
}

/** The day's picks, stored once made so the tab shows the same three all day (spec §4). */
export interface TalkDay { date: string; cards: TalkCard[] }

/** One 「✓ 聊了」 (spec §5): when, and the minutes if the parent picked a chip. Never shown to the child. */
export interface TalkLog { id: string; at: number; minutes?: number }

```

and in `interface Settings`, after the `contentVersion?: string; …` line:

```ts
  talkDay?: TalkDay; // today's three talk cards (spec 2026-10-12 parent loop §4); another day's: picked afresh
  talkSeen?: Record<string, string>; // each talk starter's id → the last day it was shown (no repeat within 14 days)
```

(`DEFAULT_SETTINGS` gets nothing: both are absent until the tab is first opened.)

- [ ] **Step 4: The bank**

Create `src/content/talkPrompts.ts` (written for this app; every Han character checked against `builtin.json` HSK ≤ 3 and the reading lists up to 二下 before it went into this plan):

```ts
// The parent's conversation starters (spec 2026-10-12 parent loop §3): open questions about his own life across the PSLE
// conversation themes, each with follow-ups, a sentence pattern to nudge toward, and what a P2 answer could sound like. Written
// for this app. Characters: HSK 1–3 or his reading lists up to 二下, plus TALK_ALLOWED (scripts/check-content.ts checks it).
import type { TalkPrompt, TalkTheme } from '../types';

export const TALK_THEMES: readonly TalkTheme[] = ['family', 'school', 'friends', 'food', 'festivals', 'singapore', 'environment', 'technology', 'feelings'];

export const THEME_LABEL: Readonly<Record<TalkTheme, string>> = {
  family: '家庭', school: '学校', friends: '朋友', food: '食物', festivals: '节日', singapore: '新加坡', environment: '环境', technology: '科技', feelings: '心情与品德',
};

/** The sentence patterns the starters rotate through (spec §3). */
export const TALK_PATTERNS = ['我觉得…因为…', '先…然后…最后…', '如果…就…', '虽然…但是…', '有时候…有时候…', '我最喜欢…因为…'] as const;

/** Theme words a P2 child says but his lists don't teach yet: kept to the few a starter can't do without. */
export const TALK_ALLOWED = '';

export const TALK_PROMPTS: readonly TalkPrompt[] = [
  // 家庭 family
  { id: 't01', theme: 'family', open: '你最喜欢和家里的谁一起玩？你们常常玩什么？', en: 'Who at home do you most like to play with? What do you usually play?', followUps: ['你们常常在哪里玩？', '为什么你最喜欢和他一起玩？', '下次你想和他玩什么新的？'], pattern: '我最喜欢…因为…', sample: '我最喜欢和哥哥一起玩，因为他会和我踢球。', hooks: ['玩', '家'] },
  { id: 't02', theme: 'family', open: '周末的时候，我们一家人常常做什么？', en: 'What does our family usually do at the weekend?', followUps: ['你最喜欢哪一个周末？为什么？', '如果下个周末由你来想，你想去哪里？'], pattern: '先…然后…最后…', sample: '我们先去公园跑步，然后去吃早饭，最后回家看书。', hooks: ['周末', '一家人'] },
  { id: 't03', theme: 'family', open: '你在家里会帮忙做什么事？', en: 'What do you help with at home?', followUps: ['你是怎么做的？', '做完以后，你的心情怎么样？', '你还想学做什么？'], pattern: '先…然后…最后…', sample: '我会帮妈妈洗碗。我先把碗放进水里，然后洗干净，最后放好。', hooks: ['帮', '洗'] },
  { id: 't04', theme: 'family', open: '说一说爷爷奶奶。你和他们一起做过什么？', en: 'Tell me about your grandparents. What have you done with them?', followUps: ['他们最喜欢做什么？', '下次见到他们，你想对他们说什么？'], pattern: '有时候…有时候…', sample: '有时候我和奶奶去买菜，有时候她教我唱歌。', hooks: ['爷爷', '奶奶', '外公', '外婆'] },
  { id: 't05', theme: 'family', open: '你觉得家里谁最有趣？为什么？', en: 'Who is the funniest person in our family? Why?', followUps: ['他做过什么有趣的事？', '你做过什么让家人笑的事？'], pattern: '我觉得…因为…', sample: '我觉得爸爸最有趣，因为他会学小狗叫。', hooks: ['有趣', '笑'] },
  { id: 't06', theme: 'family', open: '如果你可以带家人去一个地方玩一天，你想去哪里？', en: 'If you could take the family anywhere for a day, where would you go?', followUps: ['我们要怎么去？', '到了那里，我们先做什么？', '谁会最高兴？为什么？'], pattern: '如果…就…', sample: '如果可以，我就带家人去动物园看大象。', hooks: ['如果', '带'] },
  { id: 't07', theme: 'family', open: '每天早上，家里的人都在忙什么？', en: 'What is everyone at home busy with in the morning?', followUps: ['谁最早起床？', '你早上要做哪些事？'], pattern: '先…然后…最后…', sample: '我先刷牙洗脸，然后吃早饭，最后背书包去上学。', hooks: ['早上', '起床'] },
  { id: 't08', theme: 'family', open: '你和哥哥姐姐、弟弟妹妹有不高兴的时候吗？后来怎么了？', en: 'Do you and your brothers, sisters or cousins ever fall out? What happened after?', followUps: ['那次是为了什么事？', '后来你们是怎么和好的？'], pattern: '虽然…但是…', sample: '虽然我们有时候会不高兴，但是很快就和好了。', hooks: ['哥哥', '姐姐', '弟弟', '妹妹'] },
  { id: 't09', theme: 'family', open: '你长大以后想做什么工作？家里的人做什么工作？', en: 'What job do you want when you grow up? What jobs do people in our family do?', followUps: ['那个工作每天要做什么？', '为什么你想做这个工作？'], pattern: '我最喜欢…因为…', sample: '我最喜欢医生这个工作，因为医生会帮助生病的人。', hooks: ['工作', '医生'] },
  { id: 't10', theme: 'family', open: '你生病的时候，家里的人是怎么照顾你的？', en: 'When you are ill, how does the family look after you?', followUps: ['那时候你最想吃什么？', '如果家里有人生病了，你会怎么帮他？'], pattern: '如果…就…', sample: '妈妈给我喝水，还和我讲故事。如果妈妈生病，我就给她拿水。', hooks: ['病', '医院'] },

  // 学校 school
  { id: 't11', theme: 'school', open: '今天在学校里，什么事让你最开心？', en: 'What made you happiest at school today?', followUps: ['那时候你在做什么？', '谁和你在一起？', '明天你想做什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢今天的体育课，因为我们玩了球。', hooks: ['学校', '开心'] },
  { id: 't12', theme: 'school', open: '你最喜欢上什么课？为什么？', en: 'Which lesson do you like best? Why?', followUps: ['那个课的老师是怎么教的？', '哪一个课你觉得很难？哪里难？'], pattern: '我觉得…因为…', sample: '我觉得美术课最好玩，因为我可以画很多颜色。', hooks: ['课', '老师'] },
  { id: 't13', theme: 'school', open: '休息的时候，你在食堂买什么吃？和谁一起吃？', en: 'At recess, what do you buy at the canteen, and who do you eat with?', followUps: ['你最喜欢哪一种吃的？', '如果钱不够，你会怎么办？'], pattern: '有时候…有时候…', sample: '有时候我买面，有时候我买鸡饭。我和小明一起吃。', hooks: ['买', '吃', '食'] },
  { id: 't14', theme: 'school', open: '你们班上最近有什么有趣的事？', en: 'Has anything funny happened in your class lately?', followUps: ['大家都怎么说？', '你觉得为什么那么有趣？'], pattern: '先…然后…最后…', sample: '一只小鸟先飞进教室，然后站在窗口，最后又飞走了。', hooks: ['班', '教室'] },
  { id: 't15', theme: 'school', open: '如果你是老师，你会教小朋友什么？', en: 'If you were the teacher, what would you teach the children?', followUps: ['你会怎么教？', '小朋友做得好，你会给他们什么？'], pattern: '如果…就…', sample: '如果我是老师，我就教大家唱歌和画画。', hooks: ['老师', '教'] },
  { id: 't16', theme: 'school', open: '上学的路上，你会看到什么？', en: 'What do you see on the way to school?', followUps: ['你是怎么去学校的？', '路上你最喜欢看什么？'], pattern: '有时候…有时候…', sample: '有时候我看到小狗，有时候我看到很多小鸟在树上。', hooks: ['路', '上学'] },
  { id: 't17', theme: 'school', open: '在学校里，什么事让你觉得很难？你是怎么做的？', en: 'What has felt hard at school? What did you do?', followUps: ['谁帮了你？', '下次再这样，你会怎么做？'], pattern: '虽然…但是…', sample: '虽然写字很难，但是我多写几次就会了。', hooks: ['难', '帮'] },
  { id: 't18', theme: 'school', open: '学校里你最喜欢哪个地方？', en: 'Which place in school do you like best?', followUps: ['你在那里常做什么？', '如果学校可以多一个地方，你想要什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢图书馆，因为那里有很多好看的书。', hooks: ['图书馆', '书'] },
  { id: 't19', theme: 'school', open: '今天你学了什么新东西？可以教教我吗？', en: 'What new thing did you learn today? Can you teach me?', followUps: ['你是怎么学会的？', '你觉得难不难？为什么？'], pattern: '先…然后…最后…', sample: '今天我学了做纸船。先把纸对折，然后折两个角，最后打开就好了。', hooks: ['学', '新'] },

  // 朋友 friends
  { id: 't20', theme: 'friends', open: '你最好的朋友是谁？他是一个怎么样的人？', en: 'Who is your best friend? What is he or she like?', followUps: ['你们是怎么认识的？', '你们在一起常做什么？'], pattern: '我最喜欢…因为…', sample: '我最好的朋友是小明。我最喜欢和他玩，因为他很会说笑话。', hooks: ['朋友', '好'] },
  { id: 't21', theme: 'friends', open: '你和朋友不高兴的时候，会怎么做？', en: 'When you and a friend are upset with each other, what do you do?', followUps: ['上次是为了什么事？', '你们后来是怎么和好的？'], pattern: '虽然…但是…', sample: '虽然我们有时候会生气，但是第二天我们又一起玩了。', hooks: ['生气'] },
  { id: 't22', theme: 'friends', open: '如果有一个新同学来到你们班，你会怎么帮他？', en: 'If a new pupil joined your class, how would you help?', followUps: ['他可能会觉得怎么样？', '你会先和他说什么？'], pattern: '如果…就…', sample: '如果有新同学来，我就带他去看学校，告诉他食堂在哪里。', hooks: ['同学', '新', '帮'] },
  { id: 't23', theme: 'friends', open: '你和朋友最喜欢玩什么？怎么玩？', en: 'What do you and your friends like to play most? How do you play it?', followUps: ['谁常常赢？', '有人不想玩的时候，你们怎么办？'], pattern: '先…然后…最后…', sample: '我们玩跳绳。先两个人拿着绳子，然后大家一个一个跳，最后看谁跳得多。', hooks: ['玩', '跳'] },
  { id: 't24', theme: 'friends', open: '你觉得一个好朋友应该是怎么样的？', en: 'What makes a good friend?', followUps: ['你是这样的朋友吗？说一说。', '你的朋友帮过你什么？'], pattern: '我觉得…因为…', sample: '我觉得好朋友会把东西分给别人，因为一起玩更开心。', hooks: ['朋友', '分'] },
  { id: 't25', theme: 'friends', open: '你帮过朋友什么忙？那时候发生了什么事？', en: 'How have you helped a friend? What happened?', followUps: ['他对你说了什么？', '那时候你心里觉得怎么样？'], pattern: '先…然后…最后…', sample: '小红倒在地上了。我先拉她起来，然后带她去找老师，最后她说谢谢。', hooks: ['帮助', '谢谢'] },
  { id: 't26', theme: 'friends', open: '如果请朋友来家里玩，你们会做什么？', en: 'If you invited a friend over, what would you do together?', followUps: ['你会请谁？', '你会给他吃什么？'], pattern: '如果…就…', sample: '如果朋友来我家，我就和他一起画画，还请他吃饼干。', hooks: ['请', '家'] },
  { id: 't27', theme: 'friends', open: '朋友想玩的和你想玩的不一样，你们会怎么办？', en: 'When a friend wants to play something different from you, what do you do?', followUps: ['最后大家玩了什么？', '你觉得怎么样做大家都开心？'], pattern: '有时候…有时候…', sample: '有时候我们玩他想玩的，有时候我们玩我想玩的。', hooks: ['一样'] },
  { id: 't28', theme: 'friends', open: '你的朋友有什么地方和你不一样？', en: 'How is your friend different from you?', followUps: ['你喜欢他哪一点？', '你们有什么一样的地方？'], pattern: '虽然…但是…', sample: '虽然他喜欢画画，我喜欢踢球，但是我们都喜欢吃西瓜。', hooks: ['不一样'] },

  // 食物 food
  { id: 't29', theme: 'food', open: '你最喜欢吃什么？是什么味道的？', en: 'What do you like to eat best? What does it taste like?', followUps: ['你第一次是在哪里吃的？', '如果每天都吃，你会觉得怎么样？'], pattern: '我最喜欢…因为…', sample: '我最喜欢吃鸡饭，因为鸡肉很香，饭也很好吃。', hooks: ['吃', '饭', '香'] },
  { id: 't30', theme: 'food', open: '在外面吃饭的时候，你最喜欢吃哪一种？', en: 'When we eat out (a hawker centre, a food court), what do you choose?', followUps: ['你会自己去买吗？怎么买？', '你还想试试什么新的吃的？'], pattern: '有时候…有时候…', sample: '有时候我吃面，有时候我吃炒饭。', hooks: ['饭', '面'] },
  { id: 't31', theme: 'food', open: '你会做什么吃的？是怎么做的？', en: 'What food can you make? How do you make it?', followUps: ['是谁教你的？', '做好以后，谁吃了？'], pattern: '先…然后…最后…', sample: '我会做鸡蛋面包。先拿一片面包，然后放上鸡蛋，最后再放一片面包。', hooks: ['做', '鸡蛋'] },
  { id: 't32', theme: 'food', open: '有什么东西你不喜欢吃？为什么？', en: "What don't you like to eat? Why?", followUps: ['如果妈妈做了这个菜，你会怎么办？', '吃了一次以后，你觉得怎么样？'], pattern: '虽然…但是…', sample: '虽然我不喜欢吃青菜，但是我知道吃菜对身体好。', hooks: ['菜', '身体'] },
  { id: 't33', theme: 'food', open: '如果你可以开一家店，你想卖什么好吃的？', en: 'If you could open a shop, what tasty things would you sell?', followUps: ['你的店叫什么名字？', '一样东西卖多少钱？'], pattern: '如果…就…', sample: '如果我开店，我就卖果汁，有很多颜色。', hooks: ['卖', '店', '钱'] },
  { id: 't34', theme: 'food', open: '你饿的时候最想吃什么？吃饱了是什么感觉？', en: 'When you are hungry, what do you want most? How does being full feel?', followUps: ['什么时候你最饿？', '吃太多会怎么样？'], pattern: '有时候…有时候…', sample: '有时候我饿了想吃面包，有时候想吃水果。吃饱了我想睡觉。', hooks: ['饿', '饱'] },
  { id: 't35', theme: 'food', open: '我们家的早饭常常吃什么？你觉得哪一种最好吃？', en: 'What do we usually have for breakfast? Which do you like best?', followUps: ['早上你喜欢喝什么？', '为什么要吃早饭？'], pattern: '我觉得…因为…', sample: '我觉得面包最好吃，因为又香又好吃。', hooks: ['早饭', '喝'] },
  { id: 't36', theme: 'food', open: '你吃过最甜的东西是什么？', en: 'What is the sweetest thing you have ever eaten?', followUps: ['你是在哪里吃到的？', '吃太多甜的东西会怎么样？'], pattern: '我最喜欢…因为…', sample: '我吃过最甜的是蛋糕。我最喜欢生日蛋糕，因为大家一起吃。', hooks: ['甜', '蛋糕'] },
  { id: 't37', theme: 'food', open: '和家人一起吃饭的时候，我们都说些什么？', en: 'When we eat together as a family, what do we talk about?', followUps: ['你最喜欢在哪里吃饭？', '吃饭的时候要注意什么？'], pattern: '有时候…有时候…', sample: '有时候我们说学校的事，有时候爸爸讲笑话。', hooks: ['一起', '吃饭'] },

  // 节日 festivals
  { id: 't38', theme: 'festivals', open: '过新年的时候，你最喜欢做什么？', en: 'At Chinese New Year, what do you like doing most?', followUps: ['我们会去谁的家？', '拿到红包的时候，你会说什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢过新年，因为可以穿新衣服，还有红包。', hooks: ['新年', '红包'] },
  { id: 't39', theme: 'festivals', open: '中秋节的时候，我们一家人做了什么？', en: 'What did our family do at Mid-Autumn?', followUps: ['你喜欢什么样的灯？', '什么月饼最好吃？'], pattern: '先…然后…最后…', sample: '我们先吃月饼，然后拿着灯出去玩，最后一起看月亮。', hooks: ['月亮', '中秋'] },
  { id: 't40', theme: 'festivals', open: '你的生日是怎么过的？', en: 'How do you spend your birthday?', followUps: ['你最想要什么生日礼物？为什么？', '下一个生日你想怎么过？'], pattern: '如果…就…', sample: '如果过生日，我就请朋友来家里吃蛋糕。', hooks: ['生日', '礼物'] },
  { id: 't41', theme: 'festivals', open: '新加坡有很多节日。你知道哪些？', en: 'Singapore has many festivals. Which ones do you know?', followUps: ['那个节日大家做什么？', '你的朋友过什么节日？'], pattern: '我觉得…因为…', sample: '我觉得新年最好玩，因为大家都回家一起吃饭。', hooks: ['节日'] },
  { id: 't42', theme: 'festivals', open: '国庆日的时候，你看到了什么？', en: 'What did you see on National Day?', followUps: ['你最喜欢看哪一个？', '你想对新加坡说什么？'], pattern: '先…然后…最后…', sample: '我们先看飞机飞过，然后看大家唱歌跳舞，最后看烟花。', hooks: ['国', '飞机'] },
  { id: 't43', theme: 'festivals', open: '儿童节的时候，你想和谁一起过？想做什么？', en: "On Children's Day, who would you like to spend it with, and doing what?", followUps: ['今年儿童节，学校做了什么？', '你想送什么给你的朋友？'], pattern: '如果…就…', sample: '如果儿童节可以去玩，我就想和家人去海边。', hooks: ['儿童', '节'] },
  { id: 't44', theme: 'festivals', open: '教师节的时候，你想对老师说什么？', en: "On Teachers' Day, what would you like to say to your teacher?", followUps: ['你会送老师什么？', '你为什么想谢谢这位老师？'], pattern: '我觉得…因为…', sample: '我想对老师说谢谢。我觉得她很好，因为她教我们很多字。', hooks: ['老师', '谢谢'] },
  { id: 't45', theme: 'festivals', open: '过新年以前，我们家要做哪些事？', en: 'Before Chinese New Year, how do we get the home ready?', followUps: ['你帮了什么忙？', '家里会放哪些红色的东西？'], pattern: '先…然后…最后…', sample: '我们先把家里打扫干净，然后去买新衣服，最后在门上贴红纸。', hooks: ['新年', '准备'] },
  { id: 't46', theme: 'festivals', open: '你最喜欢哪一个节日？为什么？', en: 'Which festival do you like best? Why?', followUps: ['那个节日要吃什么？', '如果你可以自己想一个节日，你会叫它什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢中秋节，因为可以玩灯，还可以吃月饼。', hooks: ['节日'] },

  // 新加坡 Singapore
  { id: 't47', theme: 'singapore', open: '坐地铁的时候，你会看到什么？', en: 'What do you see when we ride the MRT?', followUps: ['我们常常坐几个站？', '坐地铁的时候要注意什么？'], pattern: '有时候…有时候…', sample: '有时候车上人很多，有时候有地方坐。老人上车，我会站起来。', hooks: ['地铁', '坐'] },
  { id: 't48', theme: 'singapore', open: '我们家附近有什么地方？', en: 'What places are near our home?', followUps: ['你最常去哪里？', '如果附近可以多一个地方，你想要什么？'], pattern: '我最喜欢…因为…', sample: '我们家附近有公园和小店。我最喜欢公园，因为可以骑车。', hooks: ['公园', '附近'] },
  { id: 't49', theme: 'singapore', open: '如果有朋友从外国来新加坡，你会带他去哪里？', en: 'If a friend came to Singapore from abroad, where would you take them?', followUps: ['你会请他吃什么？', '你会教他说什么？'], pattern: '如果…就…', sample: '如果有朋友来，我就带他去看鱼尾狮，再请他吃鸡饭。', hooks: ['外国', '新加坡'] },
  { id: 't50', theme: 'singapore', open: '下雨天，你最喜欢做什么？', en: 'What do you like doing on a rainy day?', followUps: ['下雨的时候出门，你要带什么？', '你喜欢下雨天还是太阳天？为什么？'], pattern: '我觉得…因为…', sample: '我喜欢下雨天。我觉得很舒服，因为下雨以后就不热了。', hooks: ['雨', '天气'] },
  { id: 't51', theme: 'singapore', open: '在新加坡，大家会说哪些话？', en: 'What languages do people speak in Singapore?', followUps: ['你什么时候说华语？', '你觉得会说几种话有什么好？'], pattern: '有时候…有时候…', sample: '有时候我说英语，有时候我说华语。在家我和奶奶说华语。', hooks: ['华语', '说'] },
  { id: 't52', theme: 'singapore', open: '去动物园的时候，你最喜欢看什么动物？', en: 'At the zoo, which animal do you like watching most?', followUps: ['那个动物在做什么？', '如果你可以带一只回家，你想要哪一只？'], pattern: '我最喜欢…因为…', sample: '我最喜欢看大象，因为它很大，耳朵也很大。', hooks: ['动物', '动物园'] },
  { id: 't53', theme: 'singapore', open: '你喜欢新加坡的什么？', en: 'What do you like about Singapore?', followUps: ['如果你去了别的国家，你会想新加坡的什么？', '你觉得新加坡哪里可以更好？'], pattern: '我觉得…因为…', sample: '我觉得新加坡很干净，因为大家不在地上乱丢东西。', hooks: ['新加坡', '干净'] },
  { id: 't54', theme: 'singapore', open: '我们去超市买东西的时候，你最喜欢看什么？', en: 'When we go to the supermarket, what do you like looking at?', followUps: ['你会帮忙拿什么？', '如果给你十块钱，你会买什么？'], pattern: '如果…就…', sample: '如果有十块钱，我就买水果和一本小书。', hooks: ['超市', '买', '钱'] },
  { id: 't55', theme: 'singapore', open: '去海边的时候，你最喜欢做什么？', en: 'At the beach, what do you like doing most?', followUps: ['你和谁一起去？', '在海边要注意什么？'], pattern: '先…然后…最后…', sample: '我先在沙上画画，然后在水里走一走，最后和爸爸一起吃东西。', hooks: ['海', '海边'] },

  // 环境 environment
  { id: 't56', theme: 'environment', open: '在家里，我们可以怎么少用一点水？', en: 'How can we use less water at home?', followUps: ['如果没有水，我们会怎么样？', '我们还可以怎么少用电？'], pattern: '如果…就…', sample: '刷牙的时候，我会关水。如果不关，水就白白流走了。', hooks: ['水', '用'] },
  { id: 't57', theme: 'environment', open: '你在公园里看到过什么动物和花草？', en: 'What animals and plants have you seen in the park?', followUps: ['它们长什么样子？', '我们可以怎么保护它们？'], pattern: '有时候…有时候…', sample: '有时候我看到小鸟，有时候我看到小猫在树下睡觉。', hooks: ['公园', '树', '花'] },
  { id: 't58', theme: 'environment', open: '看到地上有人丢的纸，你会怎么做？', en: 'If you see litter on the ground, what do you do?', followUps: ['为什么不能乱丢东西？', '哪些东西可以再用？'], pattern: '我觉得…因为…', sample: '我会把纸拿起来丢掉。我觉得这样很好，因为地上就干净了。', hooks: ['干净', '地上'] },
  { id: 't59', theme: 'environment', open: '天气很热的时候，你会怎么让自己凉快一点？', en: 'When it is very hot, how do you cool down?', followUps: ['热的时候要多喝什么？', '为什么天气越来越热？'], pattern: '有时候…有时候…', sample: '有时候我开空调，有时候我去游泳。我还会多喝水。', hooks: ['热', '天气'] },
  { id: 't60', theme: 'environment', open: '如果你可以种一棵树，你想种在哪里？', en: 'If you could plant a tree, where would you plant it?', followUps: ['你会怎么照顾它？', '树对我们有什么好处？'], pattern: '如果…就…', sample: '如果可以种树，我就种在家门口，每天给它水喝。', hooks: ['树', '种'] },
  { id: 't61', theme: 'environment', open: '家里的旧东西，可以用来做什么？', en: 'What can we make out of old things at home?', followUps: ['你想用旧盒子做什么？', '为什么旧东西不要马上丢掉？'], pattern: '先…然后…最后…', sample: '我用旧盒子做车。先画车门和车窗，然后把它们剪下来，最后在下面画四个圆。', hooks: ['旧', '盒子'] },
  { id: 't62', theme: 'environment', open: '下雨以后，外面变成了什么样子？', en: 'After the rain, what is it like outside?', followUps: ['你看到了什么？听到了什么？', '下雨以后，你最想去哪里玩？'], pattern: '虽然…但是…', sample: '虽然地上有很多水，但是天很蓝，树也很绿。', hooks: ['雨', '空气'] },
  { id: 't63', theme: 'environment', open: '你最喜欢什么动物？它住在哪里？', en: 'What is your favourite animal? Where does it live?', followUps: ['它吃什么？', '我们怎么做可以帮助它？'], pattern: '我最喜欢…因为…', sample: '我最喜欢小鱼，因为它游来游去很好看。小鱼要住在干净的水里。', hooks: ['动物', '鱼'] },

  // 科技 technology
  { id: 't64', theme: 'technology', open: '你用平板电脑做什么？', en: 'What do you use the iPad for?', followUps: ['你最喜欢用它做哪一件事？为什么？', '你觉得一天用多久最好？'], pattern: '有时候…有时候…', sample: '有时候我用它学字，有时候我用它看动画。', hooks: ['电脑', '用'] },
  { id: 't65', theme: 'technology', open: '如果你有一个机器人，你想让它帮你做什么？', en: 'If you had a robot, what would you have it do for you?', followUps: ['你会给它取什么名字？', '有什么事你想自己做，不要它帮？'], pattern: '如果…就…', sample: '如果我有机器人，我就让它帮我收玩具。', hooks: ['机器人'] },
  { id: 't66', theme: 'technology', open: '看电视看太久，会怎么样？', en: 'What happens if you watch TV for too long?', followUps: ['你最喜欢看什么？', '不看电视的时候，你可以做什么？'], pattern: '我觉得…因为…', sample: '我觉得看太久不好，因为眼睛会很累。', hooks: ['电视', '眼睛'] },
  { id: 't67', theme: 'technology', open: '你用手机和谁说过话？说了什么？', en: 'Who have you talked to on the phone? What did you say?', followUps: ['你喜欢打电话还是见面说话？为什么？', '下次你想打电话给谁？'], pattern: '有时候…有时候…', sample: '有时候我和外婆打电话，有时候我和爸爸说话。', hooks: ['电话', '手机'] },
  { id: 't68', theme: 'technology', open: '如果家里一个晚上都没有电，我们可以做什么？', en: 'If the home had no electricity for an evening, what could we do?', followUps: ['你会觉得怎么样？', '你觉得家里哪一样用电的东西最有用？'], pattern: '如果…就…', sample: '如果没有电，我就和家人坐在一起讲故事。', hooks: ['电', '晚上'] },
  { id: 't69', theme: 'technology', open: '你想做一个什么新东西？它有什么用？', en: 'What new thing would you like to invent? What would it do?', followUps: ['它长什么样子？', '你会先给谁用？'], pattern: '我最喜欢…因为…', sample: '我想做会飞的书包。我最喜欢这个，因为这样上学就很快。', hooks: ['新', '飞'] },
  { id: 't70', theme: 'technology', open: '我们家里有哪些机器帮我们做事？', en: 'Which machines at home do jobs for us?', followUps: ['你会用哪一个？', '如果它坏了，我们会怎么办？'], pattern: '先…然后…最后…', sample: '洗衣机帮我们洗衣服。先放衣服，然后放水，最后按开始。', hooks: ['洗衣机', '机'] },
  { id: 't71', theme: 'technology', open: '上网的时候，要注意什么？', en: 'What should we be careful about online?', followUps: ['如果看到不好的东西，你会怎么做？', '你会告诉谁？'], pattern: '虽然…但是…', sample: '虽然上网很好玩，但是不能告诉别人我家在哪里。', hooks: ['网'] },

  // 心情与品德 feelings and values
  { id: 't72', theme: 'feelings', open: '最近你做了什么事，让你觉得自己很了不起？', en: 'What have you done lately that made you proud of yourself?', followUps: ['你是怎么做到的？', '谁看到了？他说了什么？'], pattern: '先…然后…最后…', sample: '我先在家读了很多次，然后在班上读课文，最后大家都给我拍手。', hooks: ['了不起'] },
  { id: 't73', theme: 'feelings', open: '你生气的时候会怎么做？', en: 'What do you do when you are angry?', followUps: ['什么事最让你生气？', '怎么样做，你会快一点不生气？'], pattern: '有时候…有时候…', sample: '有时候我会哭，有时候我会去房间里坐一会儿。', hooks: ['生气', '哭'] },
  { id: 't74', theme: 'feelings', open: '你做错事的时候，会怎么说对不起？', en: 'When you do something wrong, how do you say sorry?', followUps: ['那时候你心里觉得怎么样？', '说了以后，事情怎么样了？'], pattern: '虽然…但是…', sample: '虽然说对不起很难，但是说了以后我心里就舒服了。', hooks: ['对不起', '错'] },
  { id: 't75', theme: 'feelings', open: '你怕什么？怕的时候怎么办？', en: 'What are you afraid of? What do you do when you are scared?', followUps: ['你为什么怕它？', '谁会帮你不怕？'], pattern: '如果…就…', sample: '我怕黑。如果房间很黑，我就开小灯。', hooks: ['怕', '黑'] },
  { id: 't76', theme: 'feelings', open: '如果看到同学一个人在哭，你会怎么做？', en: 'If you saw a classmate crying alone, what would you do?', followUps: ['你会对他说什么？', '你哭的时候，想别人怎么做？'], pattern: '如果…就…', sample: '如果同学在哭，我就问他怎么了，再和他坐一会儿。', hooks: ['哭', '同学'] },
  { id: 't77', theme: 'feelings', open: '你觉得怎么样才是一个好孩子？', en: 'What do you think makes a good child?', followUps: ['在家里，好孩子会怎么做？', '在车上呢？'], pattern: '我觉得…因为…', sample: '我觉得好孩子要说请和谢谢，因为别人听了会很开心。', hooks: ['请', '谢谢'] },
  { id: 't78', theme: 'feelings', open: '你什么时候觉得很累？累的时候想做什么？', en: 'When do you feel really tired? What do you want to do then?', followUps: ['今天什么事让你累了？', '休息以后，你觉得怎么样？'], pattern: '有时候…有时候…', sample: '有时候踢完球我很累，有时候写字写多了也累。累了我想睡觉。', hooks: ['累', '休息'] },
  { id: 't79', theme: 'feelings', open: '这个星期你帮助了谁？他是怎么谢谢你的？', en: 'Whom did you help this week? How did they thank you?', followUps: ['你为什么想帮他？', '帮了别人以后，你的心情怎么样？'], pattern: '我觉得…因为…', sample: '我帮奶奶拿东西。我觉得很开心，因为奶奶笑了。', hooks: ['帮助', '心情'] },
  { id: 't80', theme: 'feelings', open: '如果你在地上看到别人丢的钱，你会怎么做？', en: 'If you found money someone had dropped, what would you do?', followUps: ['如果是你丢了东西，你会觉得怎么样？', '你会把它交给谁？'], pattern: '如果…就…', sample: '如果我在学校看到钱，我就交给老师。', hooks: ['丢', '找'] },
];
```

- [ ] **Step 5: The check**

In `scripts/check-content.ts` change the first line to:

```ts
import type { BuiltinChar, Passage, PassageQuestion, TalkPrompt, TalkTheme } from '../src/types';
```

and append:

```ts
/** The talk prompts (spec 2026-10-12 parent loop §3): unique ids, every field there, 2–3 follow-ups, one of the six patterns, at
 *  least 6 starters per theme, and every Han character one a P2 child reads (`readable`: HSK 1–3, his lists up to 二下, the allow-list). */
export function checkTalkPrompts(prompts: readonly TalkPrompt[], themes: readonly TalkTheme[], patterns: readonly string[], readable: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const p of prompts) {
    if (ids.has(p.id)) problems.push(`duplicate talk prompt ${p.id}`);
    ids.add(p.id);
    if (!p.open.trim() || !p.en.trim() || !p.sample.trim()) problems.push(`${p.id}: missing open, en or sample`);
    if (p.followUps.length < 2 || p.followUps.length > 3 || p.followUps.some((f) => !f.trim())) problems.push(`${p.id}: needs 2–3 follow-ups`);
    if (!patterns.includes(p.pattern)) problems.push(`${p.id}: pattern ${p.pattern} is not one of the six`);
    if (!themes.includes(p.theme)) problems.push(`${p.id}: unknown theme ${p.theme}`);
    if (/[\p{Script=Han}]/u.test(p.en)) problems.push(`${p.id}: the English line holds Chinese`);
    const text = [p.open, ...p.followUps, p.pattern, p.sample, ...(p.hooks ?? [])].join('');
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
Expected: PASS (9 tests); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/content/talkPrompts.ts scripts/check-content.ts scripts/check-content.test.ts
git commit -m "feat: 80 talk prompts for the parent across the PSLE themes, with a P2 content check"
```

---

### Task 2: The talk log store, backup and restore

**Files:**
- Modify: `src/store/db.ts` (schema, `DB_VERSION`, `LIST_STORES`, upgrade step)
- Modify: `src/store/repo.ts` (import; four functions at the end)
- Create: `src/store/talks.test.ts`

**Interfaces:**
- Consumes: `TalkLog` (Task 1); `exportBackup`, `readBackup`, `applyBackup` (`src/store/backup.ts`, unchanged).
- Produces: `DB_VERSION = 5`; `LIST_STORES` ends `'ladder', 'talks'`; `addTalk(db, t: TalkLog): Promise<void>`; `deleteTalk(db, id: string): Promise<void>`; `talksBetween(db, from: number, to: number): Promise<TalkLog[]>` (`[from, to)`, oldest first); `allTalks(db): Promise<TalkLog[]>` (oldest first).

- [ ] **Step 1: Write the failing test**

Create `src/store/talks.test.ts`:

```ts
// @vitest-environment node
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { applyBackup, exportBackup, readBackup } from './backup';
import { DB_VERSION, LIST_STORES, openAppDb } from './db';
import { addTalk, allTalks, allWords, deleteTalk, putWords, talksBetween } from './repo';

const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();

describe('the talk log (spec 2026-10-12 parent loop §6)', () => {
  it('adds, lists oldest first, reads a range [from, to) and deletes', async () => {
    const db = await freshDb();
    await addTalk(db, { id: 'b', at: at(13), minutes: 10 });
    await addTalk(db, { id: 'a', at: at(12) });
    await addTalk(db, { id: 'c', at: at(19, 0) });
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect((await talksBetween(db, new Date(2026, 9, 12).getTime(), new Date(2026, 9, 19).getTime())).map((t) => t.id)).toEqual(['a', 'b']);
    await deleteTalk(db, 'b');
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'c']);
  });
  it('version 5 adds the store to a version 4 database and keeps what it had (no migration)', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const old = await openDB(name, 4, { upgrade(db) { db.createObjectStore('words', { keyPath: 'id' }); } });
    await old.put('words', makeWord('大'));
    old.close();
    const db = await openAppDb(name);
    expect(DB_VERSION).toBe(5);
    expect(db.objectStoreNames.contains('talks')).toBe(true);
    expect((await allWords(db)).map((w) => w.text)).toEqual(['大']);
    expect(LIST_STORES).toContain('talks');
  });
  it('backup includes talk logs, and restoring brings them back', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大')]);
    await addTalk(db, { id: 'a', at: at(12), minutes: 5 });
    const text = await exportBackup(db, { includeMedia: false, now: 1 });
    expect(JSON.parse(text).stores.talks).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
    const target = await freshDb();
    await addTalk(target, { id: 'old', at: at(1) });
    await applyBackup(target, readBackup(text));
    expect(await allTalks(target)).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
  });
  it('a backup from before talks keeps the talks already on the iPad', async () => {
    const db = await freshDb();
    const text = JSON.parse(await exportBackup(db, { includeMedia: false, now: 1 }));
    delete text.stores.talks;
    const target = await freshDb();
    await addTalk(target, { id: 'kept', at: at(1) });
    await applyBackup(target, readBackup(JSON.stringify({ ...text, dbVersion: 4 })));
    expect((await allTalks(target)).map((t) => t.id)).toEqual(['kept']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/store/talks.test.ts`
Expected: FAIL — `addTalk` is not exported from `./repo`.

- [ ] **Step 3: The store**

In `src/store/db.ts`:
- the types import ends `RewardGoal, SessionRecord, Settings, TalkLog, Word } from '../types';`
- in `HanziDB`, after `ladder: { key: string; value: LadderEntry };` add `talks: { key: string; value: TalkLog; indexes: { byAt: number } };`
- `export const DB_VERSION = 5;`
- `LIST_STORES` becomes `['words', 'cards', 'reviewLogs', 'sessions', 'rewards', 'recordings', 'prompts', 'passages', 'answers', 'ladder', 'talks'] as const;`
- after the `oldVersion < 4` line in `upgrade`:

```ts
      if (oldVersion < 5) db.createObjectStore('talks', { keyPath: 'id' }).createIndex('byAt', 'at'); // the parent's 「✓ 聊了」 (spec 2026-10-12 parent loop §6)
```

- [ ] **Step 4: The repo functions**

In `src/store/repo.ts` add `type TalkLog` to the `../types` import (after `type Settings`) and append:

```ts
/** A 「✓ 聊了」 (spec 2026-10-12 parent loop §5). */
export async function addTalk(db: AppDb, t: TalkLog): Promise<void> {
  await db.put('talks', t);
}

export const deleteTalk = (db: AppDb, id: string) => db.delete('talks', id);

/** Talks logged in [from, to), oldest first. */
export const talksBetween = (db: AppDb, from: number, to: number): Promise<TalkLog[]> =>
  db.getAllFromIndex('talks', 'byAt', IDBKeyRange.bound(from, to, false, true));

/** Every talk logged, oldest first. */
export const allTalks = (db: AppDb): Promise<TalkLog[]> => db.getAllFromIndex('talks', 'byAt');
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/store && npx tsc --noEmit`
Expected: PASS (the new 4 and the existing backup and repo tests); no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/db.ts src/store/repo.ts src/store/talks.test.ts
git commit -m "feat: talk log store (db v5), in backup and restore"
```

---

### Task 3: The daily picker (pure) and today's stored picks

**Files:**
- Create: `src/talk/pick.ts`, `src/talk/pick.test.ts`
- Create: `src/talk/load.ts`, `src/talk/load.test.ts`

**Interfaces:**
- Consumes: `TALK_PROMPTS`, `TALK_THEMES` (Task 1); `TalkCard`, `TalkKind`, `TalkPrompt`, `TalkTheme`, `PassageQuestion` (types); `mulberry32`, `seedFromString`, `shuffle` (`src/lib/random.ts`); `parseDateKey`, `addDays`, `localDateKey`; `introducedNewWords` (`src/session/runner.ts`); `cardMeaning` (`src/content/glossary.ts`); `sentencesFor` (`src/content/understand.ts`); `bankFor`, `fillGap` (`src/content/sentenceBank.ts`); `PASSAGES`, `PASSAGE_QUESTIONS`; `getSettings`, `updateSettings`, `getKid`, `allSessions`, `allWords`, `listParentPassages`; `p2Readable` (Task 1, in the test).
- Produces (pick.ts): `NO_REPEAT_DAYS = 14`, `THEME_GAP_DAYS = 6`, `NEW_WORD_DAYS = 7`, `SEEN_KEEP_DAYS = 60`, `SLOTS = ['word', 'langdu', 'theme']`, `KIND_LABEL: Record<TalkKind, string>` (今天的新词 / 朗读 / 话题); `interface TalkWord { text; gloss?; example?; zuci: string[] }`; `interface TalkPassage { id; title; question?: PassageQuestion }`; `interface PickInput { today; seen; words: readonly TalkWord[]; passage: TalkPassage | null; bank? }`; `hookMatches(hook, word): boolean`; `themeForWords(words, bank?): TalkTheme | null`; `wordStarter(w: TalkWord): TalkCard`; `passageStarters(p: TalkPassage): TalkCard[]`; `pickDay(input): TalkCard[]`; `swapCard(cards, slot, input): TalkCard[]`; `markSeen(seen, cards, today): Record<string, string>`.
- Produces (load.ts): `talkWord(w: Word): TalkWord`; `newTalkWords(db, now): Promise<Word[]>`; `currentTalkPassage(db, settings, now): Promise<TalkPassage | null>`; `todayTalk(db, now): Promise<TalkCard[]>`; `swapTalk(db, now, slot): Promise<TalkCard[]>`.

- [ ] **Step 1: Write the failing tests**

Create `src/talk/pick.test.ts` (the expected ids were measured against the bank above):

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import moe from '../content/moe2024.json';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { TALK_PROMPTS } from '../content/talkPrompts';
import { addDays, localDateKey } from '../lib/date';
import { p2Readable } from '../../scripts/check-content';
import { hookMatches, markSeen, passageStarters, pickDay, swapCard, themeForWords, wordStarter, type PickInput } from './pick';

const P17 = { id: 'p17', title: '小马', question: PASSAGE_QUESTIONS.p17 };
const YE = { text: '爷', gloss: 'grandfather', zuci: ['爷爷'] };
const JIE = { text: '借', gloss: 'to borrow', example: '我可以借你的笔吗？', zuci: ['借口', '借用'] };
const base: PickInput = { today: '2026-10-12', seen: {}, words: [YE], passage: P17 };
const ids = (cards: { id: string }[]) => cards.map((c) => c.id);
const daysBefore = (n: number) => localDateKey(addDays(new Date(2026, 9, 12), -n));

describe('the day\'s three cards (spec 2026-10-12 parent loop §4)', () => {
  it('one from his word (a starter hooked on it), one from his 朗读 passage, one rotating theme', () => {
    const cards = pickDay(base);
    expect(cards.map((c) => [c.kind, c.id, c.theme, c.word])).toEqual([
      ['word', 't04', 'family', '爷'],
      ['langdu', 'r:p17:0', undefined, undefined],
      ['theme', 't35', 'food', undefined],
    ]);
    expect(cards[1]!.open).toBe('《小马》里，谁找到了小马？');
    expect(cards[1]!.followUps[0]).toBe('如果是你，你会怎么做？');
  });
  it('the generated word starter when no starter is hooked on his word', () => {
    const [card] = pickDay({ ...base, words: [JIE] });
    expect(card).toEqual({
      kind: 'word', id: 'w:借', word: '借',
      open: '今天学了『借』（to borrow）。你会用『借』说什么？',
      en: "Today's new word: 借 (to borrow). What would you say with it?",
      followUps: ['你在哪里看到过、听到过『借』？', '书上有一句：「我可以借你的笔吗？」你也说一句有『借』的话。', '『借』可以和哪些字放在一起？'],
      pattern: '我…借…',
      sample: '我可以借你的笔吗？',
    });
  });
  it('朗读 off or no passage, and no new words: theme starters take those places, each a different theme', () => {
    const cards = pickDay({ ...base, words: [], passage: null });
    expect(cards.map((c) => [c.kind, c.id, c.theme])).toEqual([['theme', 't35', 'food'], ['theme', 't60', 'environment'], ['theme', 't53', 'singapore']]);
  });
  it('stable through the day: the same input picks the same three', () => {
    expect(pickDay(base)).toEqual(pickDay(structuredClone(base)));
  });
  it('「换一个」: the next candidate of the same kind, never a card already on screen', () => {
    const cards = pickDay(base);
    const seen = markSeen({}, cards, base.today);
    expect(ids(swapCard(cards, 0, { ...base, seen }))).toEqual(['w:爷', 'r:p17:0', 't35']); // the word's next starter: its generated one
    expect(ids(swapCard(cards, 1, { ...base, seen }))).toEqual(['t04', 'r:p17:1', 't35']); // the passage's retelling
    const swapped = swapCard(cards, 2, { ...base, seen });
    expect(ids(swapped)).toEqual(['t04', 'r:p17:0', 't60']);
    expect(swapped[2]!.theme).not.toBe('food');
  });
  it('a swap with nothing left of its kind falls back to a theme starter', () => {
    const cards = pickDay({ ...base, passage: null });
    const seen = markSeen({}, cards, base.today);
    const next = swapCard(cards, 1, { ...base, passage: null, seen });
    expect(next[1]!.kind).toBe('theme');
    expect(new Set(ids(next)).size).toBe(3);
  });
  it('no starter shown in the last 14 days comes back; one from 14 days ago can', () => {
    expect(pickDay({ ...base, seen: { t04: daysBefore(13) } })[0]!.id).toBe('w:爷');
    expect(pickDay({ ...base, seen: { t04: daysBefore(14) } })[0]!.id).toBe('t04');
  });
  it('when a kind runs out it repeats the least recently shown rather than leave a gap', () => {
    const seen = { t04: daysBefore(2), 'w:爷': daysBefore(5), 'r:p17:0': daysBefore(1), 'r:p17:1': daysBefore(3), 'r:p17:2': daysBefore(2) };
    expect(ids(pickDay({ ...base, seen })).slice(0, 2)).toEqual(['w:爷', 'r:p17:1']);
  });
  it('the theme card takes a theme not used in the last 6 days', () => {
    const one = (theme: string) => TALK_PROMPTS.find((p) => p.theme === theme)!.id;
    const seen = Object.fromEntries(['family', 'school', 'friends', 'festivals', 'singapore', 'environment', 'technology', 'feelings'].map((t) => [one(t), daysBefore(6)]));
    expect(pickDay({ ...base, words: [], passage: null, seen }).map((c) => c.theme)[0]).toBe('food');
    expect(pickDay({ ...base, words: [], passage: null, seen: { ...seen, [one('food')]: daysBefore(2) } })[0]!.theme).not.toBe('food');
  });
  it('a month of days: no bank starter twice within 14 days, and every theme comes round', () => {
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
    expect(markSeen({ t01: daysBefore(59), t02: daysBefore(60) }, [{ id: 't03' } as never], base.today)).toEqual({ t01: daysBefore(59), t03: base.today });
  });
});

describe('hooks and the generated starters', () => {
  it('a hook matches the word or one of its characters', () => {
    expect(hookMatches('爷爷', '爷')).toBe(true);
    expect(hookMatches('新年', '年')).toBe(true);
    expect(hookMatches('新年', '学校')).toBe(false);
  });
  it('the theme his words lean to: 饿、饱、甜 are food', () => {
    expect(themeForWords(['饿', '饱', '甜'])).toBe('food');
    expect(themeForWords(['鬱'])).toBeNull();
  });
  it('a parent text without a question has the retelling and the favourite line only', () => {
    expect(ids(passageStarters({ id: 'pp:x', title: '我的学校' }))).toEqual(['r:pp:x:1', 'r:pp:x:2']);
  });
  it("the templates' own words are P2 characters", () => {
    const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    const cards = [wordStarter({ text: '大', zuci: [] }), wordStarter({ text: '大', example: '我家很大。', zuci: [] }), ...passageStarters(P17)];
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
import { getSettings, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { DEFAULT_KID, DEFAULT_READING, DEFAULT_SETTINGS, type SessionPlan } from '../types';
import { currentTalkPassage, newTalkWords, swapTalk, talkWord, todayTalk } from './load';

const NOW = new Date(2026, 9, 12, 20);
const plan = (newWordIds: string[]): SessionPlan => ({ steps: ['newwords'], reviewWordIds: [], newWordIds, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
/** A lesson on `date` whose 认新字 reached the first `reached` of its new words. */
const lesson = (date: string, ids: string[], reached = ids.length, free = false) => ({ ...createSessionRecord(plan(ids), date, 0, free), flashIndex: reached });

describe('his words and passage for the picker (spec 2026-10-12 parent loop §4)', () => {
  it('a word as its starter needs it: the first sense, a sentence he has met, its 组词', () => {
    const jie = builtinWords(0).find((w) => w.text === '借')!;
    expect(talkWord(jie)).toEqual({ text: '借', gloss: 'to borrow', example: '我可以借你的笔吗？', zuci: (jie.examples ?? []).map((e) => e.text).slice(0, 3) });
    expect(talkWord(makeWord('嘿', { source: 'parent', meaning: undefined }))).toEqual({ text: '嘿', zuci: [] });
  });
  it('the words lessons introduced in the last 7 days, the newest first; not one 认新字 never reached, nor free play', async () => {
    const db = await freshDb();
    await putWords(db, ['借', '饿', '饱', '甜', '马'].map((t) => makeWord(t)));
    await saveSession(db, lesson('2026-10-05', ['b:马'])); // 7 days ago: out
    await saveSession(db, lesson('2026-10-06', ['b:饿', 'b:饱']));
    await saveSession(db, lesson('2026-10-11', ['b:甜', 'b:借'], 1)); // 借 not reached
    await saveSession(db, lesson('2026-10-12', ['b:马'], 1, true)); // free play
    expect((await newTalkWords(db, NOW)).map((w) => w.text)).toEqual(['甜', '饱', '饿']);
  });
  it('his current passage: read in the last 7 days, while 朗读 is on; a parent text with or without its question', async () => {
    const db = await freshDb();
    const s = { ...DEFAULT_SETTINGS, langdu: true };
    expect(await currentTalkPassage(db, s, NOW)).toBeNull(); // no kid yet
    await saveKid(db, { ...DEFAULT_KID, reading: { ...DEFAULT_READING, passageId: 'p17', days: 2, lastDay: '2026-10-11' } });
    expect(await currentTalkPassage(db, s, NOW)).toEqual({ id: 'p17', title: '小马', question: expect.objectContaining({ q: '谁找到了小马？' }) });
    expect(await currentTalkPassage(db, { ...s, langdu: false }, NOW)).toBeNull();
    await saveKid(db, { ...DEFAULT_KID, reading: { ...DEFAULT_READING, passageId: 'p17', days: 3, lastDay: '2026-10-05' } });
    expect(await currentTalkPassage(db, s, NOW)).toBeNull();
    await saveParentPassage(db, { id: 'pp:a', title: '我的学校', text: '我的学校很大。', createdAt: 1 });
    await saveKid(db, { ...DEFAULT_KID, reading: { ...DEFAULT_READING, passageId: 'pp:a', days: 1, lastDay: '2026-10-12' } });
    expect(await currentTalkPassage(db, s, NOW)).toEqual({ id: 'pp:a', title: '我的学校' });
  });
});

describe('today\'s picks are stored (spec §4)', () => {
  it('the same three all day, picked afresh the next day; what was shown is remembered', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    expect(first).toHaveLength(3);
    expect(await todayTalk(db, new Date(2026, 9, 12, 23))).toEqual(first);
    const s = await getSettings(db);
    expect(s.talkDay).toEqual({ date: '2026-10-12', cards: first });
    expect(Object.keys(s.talkSeen!).sort()).toEqual(first.map((c) => c.id).sort());
    const next = await todayTalk(db, new Date(2026, 9, 13, 8));
    expect(next.map((c) => c.id).filter((id) => first.some((c) => c.id === id))).toEqual([]);
  });
  it('a swap is stored and shows after a reload', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    const swapped = await swapTalk(db, NOW, 2);
    expect(swapped[2]!.id).not.toBe(first[2]!.id);
    expect(swapped.slice(0, 2)).toEqual(first.slice(0, 2));
    expect(await todayTalk(db, NOW)).toEqual(swapped);
    expect((await getSettings(db)).talkSeen![first[2]!.id]).toBe('2026-10-12'); // the swapped-out card was shown
  });
  it('other settings saved meanwhile keep the picks (updateSettings merges)', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    await updateSettings(db, { speechRate: 0.9 });
    expect(await todayTalk(db, NOW)).toEqual(first);
  });
});

```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/talk`
Expected: FAIL — `Failed to resolve import "./pick"` and `"./load"`.

- [ ] **Step 3: The picker**

Create `src/talk/pick.ts`:

```ts
// The day's three talk cards (spec 2026-10-12 parent loop §4): one from his new words, one from his 朗读 passage, one rotating
// theme. Pure: talk/load.ts reads his words, his passage and what was shown, and stores what comes back.
import { TALK_PROMPTS, TALK_THEMES } from '../content/talkPrompts';
import { parseDateKey } from '../lib/date';
import { mulberry32, seedFromString, shuffle } from '../lib/random';
import type { PassageQuestion, TalkCard, TalkKind, TalkPrompt, TalkTheme } from '../types';

/** A starter shown this many days ago or less recently can come back (unless its kind has run out). */
export const NO_REPEAT_DAYS = 14;
/** The theme card's theme hasn't been used in the last 6 days, when there is one. */
export const THEME_GAP_DAYS = 6;
/** His new words: introduced in a lesson in the last 7 days. */
export const NEW_WORD_DAYS = 7;
/** What was shown is remembered this long (the 14-day rule and "least recently shown" need no more). */
export const SEEN_KEEP_DAYS = 60;
/** The three cards, in order: his word, his 朗读 passage, a theme. Either of the first two falls back to a theme starter. */
export const SLOTS: readonly TalkKind[] = ['word', 'langdu', 'theme'];
export const KIND_LABEL: Readonly<Record<TalkKind, string>> = { word: '今天的新词', langdu: '朗读', theme: '话题' };

/** A new word as its starter needs it: the word, a short English gloss, an example sentence, a few 组词. */
export interface TalkWord { text: string; gloss?: string; example?: string; zuci: string[] }
/** His current 朗读 passage: its title, and its meaning question when it has one. */
export interface TalkPassage { id: string; title: string; question?: PassageQuestion }

export interface PickInput {
  today: string; // local YYYY-MM-DD
  seen: Readonly<Record<string, string>>; // starter id → the last day it was shown
  words: readonly TalkWord[]; // his new words, newest first
  passage: TalkPassage | null; // null: 朗读 off, or no passage read lately
  bank?: readonly TalkPrompt[];
}

const HAN = /\p{Script=Han}/u;
const daysAgo = (day: string, today: string) => Math.round((parseDateKey(today).getTime() - parseDateKey(day).getTime()) / 86_400_000);

/** A hook matches a word when it is the word or shares a character with it (hooks hold words: 爷 finds 爷爷). */
export function hookMatches(hook: string, word: string): boolean {
  return hook === word || Array.from(word).some((ch) => HAN.test(ch) && hook.includes(ch));
}

/** The theme whose starters' hooks match the most of these words (ties: the theme listed first); null when none match. */
export function themeForWords(words: readonly string[], bank: readonly TalkPrompt[] = TALK_PROMPTS): TalkTheme | null {
  let best: TalkTheme | null = null;
  let most = 0;
  for (const t of TALK_THEMES) {
    const n = bank.filter((p) => p.theme === t && p.hooks?.some((h) => words.some((w) => hookMatches(h, w)))).length;
    if (n > most) [best, most] = [t, n];
  }
  return best;
}

/** The starter made from a new word when no bank starter is built around it: one fixed template, the word's gloss and example. */
export function wordStarter(w: TalkWord): TalkCard {
  const t = w.text;
  return {
    kind: 'word', id: `w:${t}`, word: t,
    open: `今天学了『${t}』${w.gloss ? `（${w.gloss}）` : ''}。你会用『${t}』说什么？`,
    en: `Today's new word: ${t}${w.gloss ? ` (${w.gloss})` : ''}. What would you say with it?`,
    followUps: [
      `你在哪里看到过、听到过『${t}』？`,
      w.example ? `书上有一句：「${w.example}」你也说一句有『${t}』的话。` : `家里有什么东西、什么事可以用『${t}』来说？`,
      `『${t}』可以和哪些字放在一起？`,
    ],
    pattern: `我…${t}…`,
    sample: w.example ?? (w.zuci.length ? w.zuci.slice(0, 2).join('、') : t),
  };
}

/** The passage's starters, in the order they come: its meaning question opened up (when it has one), a retelling, a favourite line. */
export function passageStarters(p: TalkPassage): TalkCard[] {
  const title = `《${p.title}》`;
  const q = p.question;
  return [
    ...(q ? [{
      kind: 'langdu' as const, id: `r:${p.id}:0`, open: `${title}里，${q.q}`,
      en: `From his reading text ${title}: ask its question (answer: ${q.choices[q.answer]}), then open it up.`,
      followUps: ['如果是你，你会怎么做？', `你最喜欢${title}的哪里？为什么？`], pattern: '如果…就…', sample: `${q.choices[q.answer]}。如果是我，我就……`,
    }] : []),
    {
      kind: 'langdu', id: `r:${p.id}:1`, open: `${title}讲了什么？你可以讲给我听吗？`, en: `Ask him to retell his reading text ${title} in his own words.`,
      followUps: ['先发生了什么？后来呢？', '你觉得最后怎么样？为什么？'], pattern: '先…然后…最后…', sample: `${title}里，先……然后……最后……`,
    },
    {
      kind: 'langdu', id: `r:${p.id}:2`, open: `${title}里，你最喜欢哪一句？为什么？`, en: `Which sentence in ${title} does he like best, and why?`,
      followUps: ['你会怎么读这一句？读给我听听。', '如果你来写，你会多写一句什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢第一句，因为……',
    },
  ];
}

const bankCard = (p: TalkPrompt, kind: TalkKind, word?: string): TalkCard => ({
  kind, id: p.id, theme: p.theme, ...(word ? { word } : {}), open: p.open, en: p.en, followUps: [...p.followUps], pattern: p.pattern, sample: p.sample,
});

interface Ctx { today: string; seen: Readonly<Record<string, string>>; bank: readonly TalkPrompt[]; rank: ReadonlyMap<string, number>; exclude: ReadonlySet<string> }

function ctx(input: PickInput, exclude: Iterable<string>): Ctx {
  const bank = input.bank ?? TALK_PROMPTS;
  // the day's seed orders ties, so the same day picks the same cards
  const order = shuffle([...TALK_THEMES, ...bank.map((p) => p.id)], mulberry32(seedFromString(input.today)));
  return { today: input.today, seen: input.seen, bank, rank: new Map(order.map((k, i) => [k, i])), exclude: new Set(exclude) };
}

const recent = (c: Ctx, id: string) => c.seen[id] !== undefined && daysAgo(c.seen[id]!, c.today) < NO_REPEAT_DAYS;

/** Never shown first, then the least recently shown, then the day's order. */
function byFreshness<T extends { id: string }>(c: Ctx, list: readonly T[]): T[] {
  return [...list].sort((a, b) => (c.seen[a.id] ?? '').localeCompare(c.seen[b.id] ?? '') || (c.rank.get(a.id) ?? 0) - (c.rank.get(b.id) ?? 0));
}

/** The first not shown in 14 days, in the list's order; when the kind has run out, the least recently shown. Never one on screen. */
function firstOf(c: Ctx, list: readonly TalkCard[]): TalkCard | null {
  const open = list.filter((x) => !c.exclude.has(x.id));
  return open.find((x) => !recent(c, x.id)) ?? byFreshness(c, open)[0] ?? null;
}

/** His newest word first: a bank starter hooked on it (least recently shown first), else its generated starter. */
function wordCard(c: Ctx, words: readonly TalkWord[]): TalkCard | null {
  const list = words.flatMap((w) => [
    ...byFreshness(c, c.bank.filter((p) => p.hooks?.some((h) => hookMatches(h, w.text)))).map((p) => bankCard(p, 'word', w.text)),
    wordStarter(w),
  ]);
  return firstOf(c, list);
}

/** The theme used least recently (one not used in the last 6 days when there is one), its least recently shown starter. */
function themeCard(c: Ctx, avoid: ReadonlySet<TalkTheme>): TalkCard | null {
  const last = new Map<TalkTheme, string>();
  for (const p of c.bank) {
    const d = c.seen[p.id];
    if (d && d > (last.get(p.theme) ?? '')) last.set(p.theme, d);
  }
  const themes = TALK_THEMES.filter((t) => !avoid.has(t)).sort((a, b) => (last.get(a) ?? '').localeCompare(last.get(b) ?? '') || c.rank.get(a)! - c.rank.get(b)!);
  const rested = (t: TalkTheme) => !last.has(t) || daysAgo(last.get(t)!, c.today) > THEME_GAP_DAYS;
  for (const t of [...themes.filter(rested), ...themes.filter((x) => !rested(x))]) {
    const fresh = byFreshness(c, c.bank.filter((p) => p.theme === t && !c.exclude.has(p.id) && !recent(c, p.id)))[0];
    if (fresh) return bankCard(fresh, 'theme');
  }
  // every theme starter was shown in the last 14 days: the least recently shown, a theme on screen only when nothing else is left
  const open = c.bank.filter((p) => !c.exclude.has(p.id));
  const pick = byFreshness(c, open.filter((p) => !avoid.has(p.theme)))[0] ?? byFreshness(c, open)[0];
  return pick ? bankCard(pick, 'theme') : null;
}

function slotCard(input: PickInput, slot: number, others: readonly TalkCard[], exclude: Iterable<string>): TalkCard | null {
  const c = ctx(input, exclude);
  const avoid = new Set(others.flatMap((o) => (o.theme ? [o.theme] : [])));
  const kind = SLOTS[slot];
  const own = kind === 'word' ? wordCard(c, input.words) : kind === 'langdu' && input.passage ? firstOf(c, passageStarters(input.passage)) : null;
  return own ?? themeCard(c, avoid);
}

/** The day's three cards (spec §4). The same input gives the same cards. */
export function pickDay(input: PickInput): TalkCard[] {
  const cards: TalkCard[] = [];
  for (let slot = 0; slot < SLOTS.length; slot++) {
    const card = slotCard(input, slot, cards, cards.map((x) => x.id));
    if (card) cards.push(card);
  }
  return cards;
}

/** 「换一个」 (spec §4): the card in `slot` becomes the next candidate of its kind; nothing changes when there is none. */
export function swapCard(cards: readonly TalkCard[], slot: number, input: PickInput): TalkCard[] {
  const others = cards.filter((_, i) => i !== slot);
  const next = slotCard(input, slot, others, cards.map((x) => x.id));
  return next ? cards.map((x, i) => (i === slot ? next : x)) : [...cards];
}

/** What was shown, with these cards shown today; entries older than 60 days are dropped. */
export function markSeen(seen: Readonly<Record<string, string>>, cards: readonly TalkCard[], today: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, day] of Object.entries(seen)) if (daysAgo(day, today) < SEEN_KEEP_DAYS) out[id] = day;
  for (const c of cards) out[c.id] = today;
  return out;
}
```

- [ ] **Step 4: Reading and storing the picks**

Create `src/talk/load.ts`:

```ts
// What the 聊一聊 tab reads and stores (spec 2026-10-12 parent loop §4, §6): his new words and current 朗读 passage for the
// picker, and today's picks (settings.talkDay, settings.talkSeen) so the tab shows the same three all day.
import { PASSAGES } from '../content';
import { cardMeaning } from '../content/glossary';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { bankFor, fillGap } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import { addDays, localDateKey } from '../lib/date';
import { introducedNewWords } from '../session/runner';
import type { AppDb } from '../store/db';
import { allSessions, allWords, getKid, getSettings, listParentPassages, updateSettings } from '../store/repo';
import type { Settings, TalkCard, Word } from '../types';
import { markSeen, NEW_WORD_DAYS, pickDay, swapCard, type PickInput, type TalkPassage, type TalkWord } from './pick';

/** A word as its starter needs it: the first sense of its card's English, a sentence he has met with it, its 组词. */
export function talkWord(w: Word): TalkWord {
  const gloss = cardMeaning(w)?.split(/;\s*/)[0];
  const bank = bankFor(w.text);
  const example = sentencesFor(w.text)[0]?.zh ?? (bank ? fillGap(bank.gaps[0], w.text) : undefined);
  const zuci = (w.examples ?? []).map((e) => e.text).filter((t) => t !== w.text).slice(0, 3);
  return { text: w.text, ...(gloss ? { gloss } : {}), ...(example ? { example } : {}), zuci };
}

/** The words lessons introduced in the last 7 days (认新字 reached them), the newest lesson first and its last word first. */
export async function newTalkWords(db: AppDb, now: Date): Promise<Word[]> {
  const since = localDateKey(addDays(now, -(NEW_WORD_DAYS - 1)));
  const [sessions, words] = await Promise.all([allSessions(db), allWords(db)]);
  const byId = new Map(words.map((w) => [w.id, w]));
  const ids = sessions.filter((s) => !s.free && s.date >= since).sort((a, b) => b.date.localeCompare(a.date)).flatMap((s) => introducedNewWords(s).reverse());
  return [...new Set(ids)].map((id) => byId.get(id)).filter((w): w is Word => !!w);
}

/** His current 朗读 passage: the one the cycle holds, read in the last 7 days; null when 朗读 is off or there is none. */
export async function currentTalkPassage(db: AppDb, settings: Settings, now: Date): Promise<TalkPassage | null> {
  if (!settings.langdu) return null;
  const r = (await getKid(db))?.reading;
  if (!r?.passageId || !r.lastDay || r.lastDay < localDateKey(addDays(now, -(NEW_WORD_DAYS - 1)))) return null;
  const parent = (await listParentPassages(db)).find((p) => p.id === r.passageId);
  if (parent) return { id: parent.id, title: parent.title, ...(parent.question ? { question: parent.question } : {}) };
  const builtin = PASSAGES.find((p) => p.id === r.passageId);
  return builtin ? { id: builtin.id, title: builtin.title, ...(PASSAGE_QUESTIONS[builtin.id] ? { question: PASSAGE_QUESTIONS[builtin.id] } : {}) } : null;
}

async function pickInput(db: AppDb, settings: Settings, now: Date): Promise<PickInput> {
  const [words, passage] = await Promise.all([newTalkWords(db, now), currentTalkPassage(db, settings, now)]);
  return { today: localDateKey(now), seen: settings.talkSeen ?? {}, words: words.map(talkWord), passage };
}

/** Today's three cards: the stored ones, or picked now and stored with what was shown. */
export async function todayTalk(db: AppDb, now: Date): Promise<TalkCard[]> {
  const s = await getSettings(db);
  const today = localDateKey(now);
  if (s.talkDay?.date === today) return s.talkDay.cards;
  const cards = pickDay(await pickInput(db, s, now));
  await updateSettings(db, { talkDay: { date: today, cards }, talkSeen: markSeen(s.talkSeen ?? {}, cards, today) });
  return cards;
}

/** 「换一个」 on one card: the swap is stored, and the new card counts as shown today. */
export async function swapTalk(db: AppDb, now: Date, slot: number): Promise<TalkCard[]> {
  const cards = await todayTalk(db, now);
  const s = await getSettings(db);
  const today = localDateKey(now);
  const next = swapCard(cards, slot, await pickInput(db, s, now));
  await updateSettings(db, { talkDay: { date: today, cards: next }, talkSeen: markSeen(s.talkSeen ?? {}, next, today) });
  return next;
}

```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/talk && npx tsc --noEmit`
Expected: PASS (21 tests); no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/talk/pick.ts src/talk/pick.test.ts src/talk/load.ts src/talk/load.test.ts
git commit -m "feat: three talk prompts a day — his word, his 朗读 passage, a rotating theme — stable all day, swappable, no repeat in 14 days"
```

---

### Task 4: The weekly summary and its focus line (pure), loaded from the stores

**Files:**
- Create: `src/talk/week.ts`, `src/talk/week.test.ts`
- Modify: `src/talk/load.ts` (imports; `loadWeek` at the end)
- Modify: `src/talk/load.test.ts` (imports; a `describe` at the end)

**Interfaces:**
- Consumes: `themeForWords` (Task 3); `THEME_LABEL` (Task 1); `troubleWords`, `wordOf` (`src/stats/stats.ts`); `waitingTakes`, `takeWord` (`src/session/say.ts`); `passageOf`, `isExtraTake` (`src/langdu/review.ts`); `introducedNewWords`; `loadKnowledge` (`src/app/knowledge.ts`); `talksBetween` (Task 2), `logsSince`, `listRecordings`.
- Produces: `SHAKY_MAX = 5`, `FEW_TALK_DAYS = 3`, `NUDGE_DAYS = 2`; `shortDate(key: string): string` ('12 Oct'); `interface WeekRange { start; end; from; to }`; `weekRange(now: Date, back = 0): WeekRange`; `interface TalkTotals { days; minutes; times }`; `talkTotals(talks, from, to): TalkTotals`; `talkNudge(talks, now): string | null`; `interface PassageWeek`; `interface WeekSummary { talk; progress: { read; write; say; lessons; langduDays }; shaky; langdu: PassageWeek[]; newWords; waiting: { say; passage }; focus }`; `interface WeekInput`; `summarizeWeek(i: WeekInput): WeekSummary`; `focusLine(s: Omit<WeekSummary, 'focus'>): string`; `weekText(s, r, back): string`; `loadWeek(db, now, back = 0): Promise<{ range: WeekRange; summary: WeekSummary }>`.

- [ ] **Step 1: Write the failing tests**

Create `src/talk/week.test.ts`:

```ts
// @vitest-environment node
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { makeCard, makeWord } from '../test/fixtures';
import type { Recording, ReviewLog, SessionPlan, TalkLog } from '../types';
import { focusLine, talkNudge, talkTotals, summarizeWeek, weekRange, weekText, type WeekInput } from './week';

const NOW = new Date(2026, 9, 15, 20); // Thursday; the week is Mon 12 – Sun 18 Oct
const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();
const plan = (newWordIds: string[]): SessionPlan => ({ steps: ['newwords'], reviewWordIds: [], newWordIds, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
const lesson = (date: string, ids: string[], completed = true, free = false) => ({ ...createSessionRecord(plan(ids), date, 0, free), flashIndex: ids.length, completed });
const miss = (wordId: string, d: number): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: at(d), rating: Rating.Again, correct: false });
const passage = (id: string, d: number, meaning?: boolean, extra = false): Recording => ({
  id, createdAt: at(d), prompt: { kind: 'passage', passageId: 'p17', ...(extra ? { extra: true as const } : {}) }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 30,
  ...(meaning === undefined ? {} : { meaning: { correct: meaning, picked: '牛爷爷' } }),
});
const WORDS = new Map(['饿', '饱', '甜', '大', '小', '马'].map((t) => [`b:${t}`, makeWord(t)]));
const TALKS: TalkLog[] = [{ id: 'a', at: at(12), minutes: 10 }, { id: 'b', at: at(12, 20), minutes: 5 }, { id: 'c', at: at(14) }, { id: 'old', at: at(11), minutes: 15 }];

function input(over: Partial<WeekInput> = {}): WeekInput {
  return {
    range: weekRange(NOW),
    talks: TALKS,
    sessions: [lesson('2026-10-12', ['b:饿', 'b:饱']), lesson('2026-10-13', ['b:马'], true, true), lesson('2026-10-14', ['b:甜']), lesson('2026-10-09', ['b:小'])],
    cards: [
      { ...makeCard('b:饿', 'recognise', new Date(2026, 9, 20)), passed: at(13) },
      { ...makeCard('b:大', 'write', new Date(2026, 9, 20)), passed: at(14) },
      { ...makeCard('b:马', 'say', new Date(2026, 9, 20)), passed: at(11) }, // last week
      { ...makeCard('b:小', 'recognise', new Date(2026, 9, 20)), passed: new Date(2026, 9, 19).getTime() }, // next week
    ],
    logs: [miss('b:饿', 12), miss('b:饿', 13), miss('b:饱', 13), miss('b:马', 9)],
    recordings: [
      passage('r1', 12, true), passage('r2', 13, false), passage('r3', 14, undefined, true),
      { id: 's1', createdAt: at(14), prompt: { kind: 'say', wordId: 'b:饿' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 },
    ],
    wordOf: (id) => WORDS.get(id),
    titles: new Map([['p17', '小马']]),
    ...over,
  };
}

describe('the week (spec 2026-10-12 parent loop §5)', () => {
  it('Monday to Sunday: this week, and last week', () => {
    expect(weekRange(NOW)).toEqual({ start: '2026-10-12', end: '2026-10-18', from: at(12, 0), to: at(19, 0) });
    expect(weekRange(NOW, 1)).toMatchObject({ start: '2026-10-05', end: '2026-10-11' });
    expect(weekRange(new Date(2026, 9, 18, 23))).toMatchObject({ start: '2026-10-12' }); // Sunday is still this week
    expect(weekRange(new Date(2026, 9, 12, 0, 1))).toMatchObject({ start: '2026-10-12' });
  });
  it('the talk-log sums: days talked, minutes added up (a talk without minutes adds none), times', () => {
    expect(talkTotals(TALKS, at(12, 0), at(19, 0))).toEqual({ days: 2, minutes: 15, times: 3 });
    expect(talkTotals(TALKS, at(5, 0), at(12, 0))).toEqual({ days: 1, minutes: 15, times: 1 });
    expect(talkTotals([], 0, Infinity)).toEqual({ days: 0, minutes: 0, times: 0 });
  });
  it('the summary: talk, what newly passed, lessons, 朗读 days, shaky words, the passage and its answer, what waits', () => {
    const s = summarizeWeek(input());
    expect(s).toEqual({
      talk: { days: 2, minutes: 15, times: 3 },
      progress: { read: ['饿'], write: ['大'], say: [], lessons: 2, langduDays: 2 },
      shaky: ['饿', '饱'],
      langdu: [{ passageId: 'p17', title: '小马', days: 2, meaning: 'missed' }],
      newWords: ['饿', '饱', '甜'],
      waiting: { say: 1, passage: 1 },
      focus: '多读：他这周的朗读题答错了，问问他《小马》的故事',
    });
  });
  it('last week has its own numbers', () => {
    const s = summarizeWeek(input({ range: weekRange(NOW, 1) }));
    expect([s.talk, s.progress, s.shaky, s.newWords]).toEqual([{ days: 1, minutes: 15, times: 1 }, { read: [], write: [], say: ['马'], lessons: 1, langduDays: 0 }, ['马'], ['小']]);
  });
  it('a passage whose take has no answer (an older take, or the microphone was off) shows no result', () => {
    expect(summarizeWeek(input({ recordings: [passage('r1', 12)] })).langdu).toEqual([{ passageId: 'p17', title: '小马', days: 1, meaning: null }]);
  });
});

describe('the focus line: the shakiest area first', () => {
  const base = summarizeWeek(input());
  const rest = { ...base, langdu: [] };
  it('a missed 朗读 question, then the words he missed (with their theme), then little talk, then his new words', () => {
    expect(focusLine(rest)).toBe('多聊 食物 — 这周常错的字：饿、饱');
    expect(focusLine({ ...rest, shaky: [] })).toBe('多聊：这周聊了 2 天，试试每天聊五分钟');
    expect(focusLine({ ...rest, shaky: [], talk: { days: 3, minutes: 20, times: 3 } })).toBe('多聊 食物 — 这周的新词：饿、饱、甜');
    expect(focusLine({ ...rest, shaky: [], newWords: [], talk: { days: 5, minutes: 50, times: 6 } })).toBe('这周很好！下周继续每天聊一聊');
  });
  it('words no starter is about are named without a theme', () => {
    expect(focusLine({ ...rest, shaky: ['鬱'] })).toBe('多用这周常错的字聊天：鬱');
  });
});

describe('the Overview nudge (spec §5)', () => {
  it('none while a talk was logged today or yesterday; else since which day', () => {
    expect(talkNudge(TALKS, new Date(2026, 9, 13, 8))).toBeNull();
    expect(talkNudge(TALKS, new Date(2026, 9, 15, 8))).toBeNull();
    expect(talkNudge(TALKS, new Date(2026, 9, 16, 8))).toBe('No talk logged since Wed.');
    expect(talkNudge([{ id: 'x', at: at(1) }], NOW)).toBe('No talk logged since 1 Oct.');
    expect(talkNudge([], NOW)).toBe('No talk logged yet.');
  });
});

describe('Share the week', () => {
  it('the same summary as plain text', () => {
    expect(weekText(summarizeWeek(input()), weekRange(NOW), 0)).toBe([
      '字己 ZiJi · This week 12 Oct – 18 Oct',
      'Talk: 2 days · 15 min',
      'New to read: 1 (饿) · to write: 1 (大) · to say: 0',
      '2 lessons · 朗读 on 2 days',
      'Shaky words: 饿、饱',
      '朗读: 《小马》 2 days, meaning question missed',
      'Waiting for you: 1 Say, 1 read-aloud in Listen & confirm',
      'Focus next week: 多读：他这周的朗读题答错了，问问他《小马》的故事',
    ].join('\n'));
  });
});
```

In `src/talk/load.test.ts` replace the two import lines

```ts
import { getSettings, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
```

with

```ts
import { addRecording, addTalk, getSettings, putCards, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
```

change `import { currentTalkPassage, newTalkWords, swapTalk, talkWord, todayTalk } from './load';` to `import { currentTalkPassage, loadWeek, newTalkWords, swapTalk, talkWord, todayTalk } from './load';`, and append:

```ts
describe('the week from the stores (spec §5)', () => {
  it('talks, a passed card, a lesson and a passage take of this week, and last week apart', async () => {
    const db = await freshDb();
    const at = (d: number) => new Date(2026, 9, d, 19).getTime();
    await putWords(db, [makeWord('饿')]);
    await putCards(db, [{ ...makeCard('b:饿', 'recognise', new Date(2026, 9, 20)), passed: at(13) }]);
    await addTalk(db, { id: 'a', at: at(12), minutes: 10 });
    await addTalk(db, { id: 'b', at: at(9), minutes: 5 });
    await saveSession(db, { ...lesson('2026-10-12', ['b:饿']), completed: true });
    await addRecording(db, { id: 'r', createdAt: at(12), prompt: { kind: 'passage', passageId: 'p17' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 9, meaning: { correct: true, picked: '牛爷爷' } });
    const { range, summary } = await loadWeek(db, NOW);
    expect(range.start).toBe('2026-10-12');
    expect([summary.talk, summary.progress, summary.langdu, summary.newWords]).toEqual([
      { days: 1, minutes: 10, times: 1 }, { read: ['饿'], write: [], say: [], lessons: 1, langduDays: 1 }, [{ passageId: 'p17', title: '小马', days: 1, meaning: 'right' }], ['饿'],
    ]);
    expect((await loadWeek(db, NOW, 1)).summary.talk).toEqual({ days: 1, minutes: 5, times: 1 });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/talk`
Expected: FAIL — `Failed to resolve import "./week"`; `loadWeek` is not exported.

- [ ] **Step 3: The week**

Create `src/talk/week.ts`:

```ts
// The weekly summary (spec 2026-10-12 parent loop §5): the family's talk time next to his app progress, Monday to Sunday, with
// one line on what to focus on next week. Pure: talk/load.ts reads the stores.
import { THEME_LABEL } from '../content/talkPrompts';
import { isExtraTake, passageOf } from '../langdu/review';
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';
import { introducedNewWords } from '../session/runner';
import { takeWord, waitingTakes } from '../session/say';
import { troubleWords } from '../stats/stats';
import type { CardKind, CardRecord, Recording, ReviewLog, SessionRecord, TalkLog, Word } from '../types';
import { themeForWords } from './pick';

export const SHAKY_MAX = 5;
/** Fewer talk days than this in a week, and nothing shakier, makes talking more the focus. */
export const FEW_TALK_DAYS = 3;
/** The Overview's nudge: nothing logged today or yesterday. */
export const NUDGE_DAYS = 2;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** '2026-10-12' → '12 Oct' (no locale: the same on every iPad). */
export const shortDate = (key: string): string => {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** A calendar week, Monday to Sunday: its first and last days and its span [from, to) in ms. */
export interface WeekRange { start: string; end: string; from: number; to: number }

/** The week `now` is in (back 0), or the one before (back 1). */
export function weekRange(now: Date, back = 0): WeekRange {
  const monday = addDays(startOfLocalDay(now), -((now.getDay() + 6) % 7) - 7 * back);
  return { start: localDateKey(monday), end: localDateKey(addDays(monday, 6)), from: monday.getTime(), to: addDays(monday, 7).getTime() };
}

export interface TalkTotals { days: number; minutes: number; times: number }

/** Talks logged in [from, to): the days with one, the minutes picked (a talk without minutes adds none), how many. */
export function talkTotals(talks: readonly TalkLog[], from: number, to: number): TalkTotals {
  const inside = talks.filter((t) => t.at >= from && t.at < to);
  return { days: new Set(inside.map((t) => localDateKey(new Date(t.at)))).size, minutes: inside.reduce((n, t) => n + (t.minutes ?? 0), 0), times: inside.length };
}

/** The Overview's gentle note (spec §5): none while a talk was logged today or yesterday. */
export function talkNudge(talks: readonly TalkLog[], now: Date): string | null {
  const lastAt = talks.reduce((m, t) => Math.max(m, t.at), 0);
  if (!lastAt) return 'No talk logged yet.';
  const last = new Date(lastAt);
  const gap = Math.round((startOfLocalDay(now).getTime() - startOfLocalDay(last).getTime()) / 86_400_000);
  if (gap < NUDGE_DAYS) return null;
  return `No talk logged since ${gap <= 6 ? WEEKDAYS[last.getDay()] : shortDate(localDateKey(last))}.`;
}

export interface PassageWeek { passageId: string; title: string; days: number; meaning: 'right' | 'missed' | null }

export interface WeekSummary {
  talk: TalkTotals;
  /** words whose Read, write or Say rung passed this week; lessons finished; days with a 朗读 take */
  progress: { read: string[]; write: string[]; say: string[]; lessons: number; langduDays: number };
  shaky: string[]; // the words he missed most this week, at most 5
  langdu: PassageWeek[]; // each passage read this week, with his last answer to its meaning question
  newWords: string[]; // introduced in this week's lessons
  waiting: { say: number; passage: number }; // takes in Listen & confirm now
  focus: string;
}

export interface WeekInput {
  range: WeekRange;
  talks: readonly TalkLog[];
  sessions: readonly SessionRecord[];
  cards: readonly CardRecord[];
  logs: readonly ReviewLog[];
  recordings: readonly Recording[];
  wordOf: (id: string) => Word | undefined;
  titles: ReadonlyMap<string, string>; // passage id → title
}

export function summarizeWeek(i: WeekInput): WeekSummary {
  const { from, to, start, end } = i.range;
  const inside = (at: number) => at >= from && at < to;
  const texts = (ids: string[]) => [...new Set(ids.map((id) => i.wordOf(id)?.text).filter((t): t is string => !!t))];
  const passed = (kind: CardKind) => texts(i.cards.filter((c) => c.kind === kind && c.passed !== undefined && inside(c.passed)).map((c) => c.wordId));
  const lessons = i.sessions.filter((s) => !s.free && s.date >= start && s.date <= end);
  const takes = i.recordings.filter((r) => passageOf(r) !== null && !isExtraTake(r) && inside(r.createdAt)).sort((a, b) => a.createdAt - b.createdAt);
  const day = (r: Recording) => localDateKey(new Date(r.createdAt));
  const byPassage = new Map<string, Recording[]>();
  for (const r of takes) (byPassage.get(passageOf(r)!) ?? byPassage.set(passageOf(r)!, []).get(passageOf(r)!)!).push(r);
  const langdu = [...byPassage].map(([passageId, rs]): PassageWeek => {
    const answered = rs.filter((r) => r.meaning);
    const last = answered[answered.length - 1];
    return { passageId, title: i.titles.get(passageId) ?? '(deleted text)', days: new Set(rs.map(day)).size, meaning: last ? (last.meaning!.correct ? 'right' : 'missed') : null };
  });
  const waiting = waitingTakes([...i.recordings]);
  const say = waiting.filter((r) => takeWord(r) !== null).length;
  const summary: Omit<WeekSummary, 'focus'> = {
    talk: talkTotals(i.talks, from, to),
    progress: { read: passed('recognise'), write: passed('write'), say: passed('say'), lessons: lessons.filter((s) => s.completed).length, langduDays: new Set(takes.map(day)).size },
    shaky: texts(troubleWords(i.logs.filter((l) => inside(l.at)), SHAKY_MAX).map((t) => t.wordId)),
    langdu,
    newWords: texts(lessons.flatMap((s) => introducedNewWords(s))),
    waiting: { say, passage: waiting.length - say },
  };
  return { ...summary, focus: focusLine(summary) };
}

/** One line from the shakiest area (spec §5): a missed 朗读 question, then the words he missed, then little talk, then his new words. */
export function focusLine(s: Omit<WeekSummary, 'focus'>): string {
  const missed = s.langdu.find((p) => p.meaning === 'missed');
  if (missed) return `多读：他这周的朗读题答错了，问问他《${missed.title}》的故事`;
  const about = (words: string[], what: string) => {
    const list = words.slice(0, 3);
    const theme = themeForWords(list);
    return theme ? `多聊 ${THEME_LABEL[theme]} — ${what}：${list.join('、')}` : `多用${what}聊天：${list.join('、')}`;
  };
  if (s.shaky.length) return about(s.shaky, '这周常错的字');
  if (s.talk.days < FEW_TALK_DAYS) return `多聊：这周聊了 ${s.talk.days} 天，试试每天聊五分钟`;
  if (s.newWords.length) return about(s.newWords, '这周的新词');
  return '这周很好！下周继续每天聊一聊';
}

/** 「Share the week」: the summary as plain text. */
export function weekText(s: WeekSummary, r: WeekRange, back: number): string {
  const list = (xs: string[]) => (xs.length ? ` (${xs.join('、')})` : '');
  const p = s.progress;
  return [
    `字己 ZiJi · ${back ? 'Last week' : 'This week'} ${shortDate(r.start)} – ${shortDate(r.end)}`,
    `Talk: ${plural(s.talk.days, 'day')} · ${s.talk.minutes} min`,
    `New to read: ${p.read.length}${list(p.read)} · to write: ${p.write.length}${list(p.write)} · to say: ${p.say.length}${list(p.say)}`,
    `${plural(p.lessons, 'lesson')} · 朗读 on ${plural(p.langduDays, 'day')}`,
    `Shaky words: ${s.shaky.length ? s.shaky.join('、') : 'none'}`,
    `朗读: ${s.langdu.length ? s.langdu.map((x) => `《${x.title}》 ${plural(x.days, 'day')}${x.meaning ? `, meaning question ${x.meaning}` : ''}`).join('; ') : 'none'}`,
    `Waiting for you: ${s.waiting.say} Say, ${s.waiting.passage} read-aloud in Listen & confirm`,
    `Focus next week: ${s.focus}`,
  ].join('\n');
}
```

- [ ] **Step 4: Loading the week**

In `src/talk/load.ts`:
- after `import { sentencesFor } from '../content/understand';` add `import { loadKnowledge } from '../app/knowledge';`
- after `import { addDays, localDateKey } from '../lib/date';` add `import { wordOf } from '../stats/stats';`
- the repo import becomes `import { allSessions, allWords, getKid, getSettings, listParentPassages, listRecordings, logsSince, talksBetween, updateSettings } from '../store/repo';`
- after the `./pick` import add `import { summarizeWeek, weekRange, type WeekRange, type WeekSummary } from './week';`
- append:

```ts
/** This week's summary (back 0) or last week's (back 1), Monday to Sunday. */
export async function loadWeek(db: AppDb, now: Date, back = 0): Promise<{ range: WeekRange; summary: WeekSummary }> {
  const range = weekRange(now, back);
  const [talks, sessions, know, logs, recordings, parent] = await Promise.all([
    talksBetween(db, range.from, range.to), allSessions(db), loadKnowledge(db), logsSince(db, range.from), listRecordings(db), listParentPassages(db),
  ]);
  const titles = new Map([...PASSAGES, ...parent].map((p) => [p.id, p.title]));
  return { range, summary: summarizeWeek({ range, talks, sessions, cards: know.cards, logs, recordings, wordOf: (id) => wordOf(know, id), titles }) };
}
```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/talk && npx tsc --noEmit`
Expected: PASS (31 tests); no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/talk/week.ts src/talk/week.test.ts src/talk/load.ts src/talk/load.test.ts
git commit -m "feat: the week's summary — talk time, his progress, shaky words, 朗读 — and one focus line"
```

---

### Task 5: The 「聊一聊 Talk」 tab: today's cards, Share, 「✓ 聊了」

**Files:**
- Create: `src/talk/share.ts`, `src/talk/share.test.ts`
- Create: `src/parent/TalkPanel.tsx`, `src/parent/talk.test.tsx`
- Modify: `src/parent/ParentArea.tsx` (icon import, `ParentTab`, `TABS`, the panel)
- Modify: `src/parent/parentB.test.tsx:133` (tab count 14)
- Modify: `src/styles.css` (talk block at the end)

**Interfaces:**
- Consumes: `todayTalk`, `swapTalk` (Task 3); `KIND_LABEL` (Task 3); `THEME_LABEL` (Task 1); `shortDate`, `talkTotals`, `TalkTotals` (Task 4); `addTalk`, `deleteTalk`, `talksBetween` (Task 2); `newId`; `useApp`.
- Produces: `type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'`; `shareText(text, nav = navigator): Promise<ShareResult>`; `todayText(cards, today): string`; `UNDO_MS = 10_000`; `MINUTE_CHIPS = [5, 10, 15]`; `TalkCards({ cards, onSwap })`; `TalkLogger({ today, undoable, saving, onLog, onUndo })`; `TalkPanel({ onNavigate, undoMs? })`; `ParentTab` gains `'talk'`.

- [ ] **Step 1: Write the failing tests**

Create `src/talk/share.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { TalkCard } from '../types';
import { shareText, todayText } from './share';

const CARD: TalkCard = { kind: 'theme', id: 't35', theme: 'food', open: '早饭吃什么？', en: 'What is for breakfast?', followUps: ['你喜欢喝什么？', '为什么？'], pattern: '我觉得…因为…', sample: '面包。' };

describe('shareText (spec 2026-10-12 parent loop §5)', () => {
  it('the share sheet when there is one', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { share, clipboard: { writeText } })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
    expect(writeText).not.toHaveBeenCalled();
  });
  it('closing the sheet copies nothing', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { share: async () => { throw new DOMException('closed', 'AbortError'); }, clipboard: { writeText } })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('no share sheet, or a failed one: the clipboard; neither: failed', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { clipboard: { writeText } })).toBe('copied');
    expect(await shareText('hi', { share: async () => { throw new DOMException('no', 'NotAllowedError'); }, clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(await shareText('hi', {})).toBe('failed');
    expect(await shareText('hi', { clipboard: { writeText: async () => { throw new Error('denied'); } } })).toBe('failed');
  });
});

describe('todayText', () => {
  it('each card: its kind and question, the English line, follow-ups and the pattern', () => {
    expect(todayText([CARD, { ...CARD, kind: 'word', id: 'w:借' }], '2026-10-12')).toBe([
      '字己 ZiJi · 聊一聊 Talk · 12 Oct',
      '',
      '1. 话题：早饭吃什么？\n   What is for breakfast?\n   · 你喜欢喝什么？\n   · 为什么？\n   试试用：我觉得…因为…',
      '',
      '2. 今天的新词：早饭吃什么？\n   What is for breakfast?\n   · 你喜欢喝什么？\n   · 为什么？\n   试试用：我觉得…因为…',
    ].join('\n'));
  });
});
```

Create `src/parent/talk.test.tsx` (a fresh install has no new words and no passage, so the three are theme starters: t35, t60, t53 on 12 Oct — measured):

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { allTalks, getSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { ParentArea } from './ParentArea';
import { TalkPanel } from './TalkPanel';

const NOW = new Date(2026, 9, 12, 20); // Monday
const app = async () => makeAppData({ now: () => NOW });
const heads = () => [...document.querySelectorAll('.talk-card__open')].map((e) => e.textContent);
const setNav = (key: 'share' | 'clipboard', value: unknown) => Object.defineProperty(navigator, key, { value, configurable: true, writable: true });

afterEach(() => {
  setNav('share', undefined);
  setNav('clipboard', undefined);
});

describe('the 聊一聊 Talk tab: today (spec 2026-10-12 parent loop §5)', () => {
  it('sits after Listen & confirm in the PIN-gated parent area and shows three cards', async () => {
    const a = await makeAppData({ now: () => NOW, settings: { ...DEFAULT_SETTINGS, placementDone: true, pinHash: await hashPin('1111') } });
    renderWithApp(<ParentArea />, a);
    for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
    await screen.findByText('聊一聊 Talk', { selector: '.tab' });
    const tabs = [...document.querySelectorAll('.tab')].map((t) => t.textContent!.trim());
    expect(tabs.slice(0, 3)).toEqual(['Overview', 'Listen & confirm', '聊一聊 Talk']);
    fireEvent.click(screen.getByText('聊一聊 Talk', { selector: '.tab' }));
    await waitFor(() => expect(document.querySelectorAll('.talk-card')).toHaveLength(3));
  });
  it('each card: its question, English line and kind; tapping it shows the follow-ups, the pattern and a sample', async () => {
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await app());
    await waitFor(() => expect(heads()).toHaveLength(3));
    expect(heads()[0]).toBe('我们家的早饭常常吃什么？你觉得哪一种最好吃？');
    const card = document.querySelector('.talk-card')!;
    expect(card.querySelector('.talk-card__kind')!.textContent).toBe('话题 · 食物');
    expect(card.querySelector('.talk-card__en')!.textContent).toBe('What do we usually have for breakfast? Which do you like best?');
    expect(card.querySelector('.talk-card__more')).toBeNull();
    fireEvent.click(card.querySelector('.talk-card__head')!);
    expect(card.querySelector('.talk-card__head')!.getAttribute('aria-expanded')).toBe('true');
    expect([...card.querySelectorAll('.talk-card__follow li')].map((l) => l.textContent)).toEqual(['早上你喜欢喝什么？', '为什么要吃早饭？']);
    expect(card.querySelector('.talk-card__pattern')!.textContent).toBe('试试用：我觉得…因为…');
    expect(card.querySelector('.talk-card__sample')!.textContent).toBe('比如：我觉得面包最好吃，因为又香又好吃。');
    fireEvent.click(card.querySelector('.talk-card__head')!);
    expect(card.querySelector('.talk-card__more')).toBeNull();
  });
  it('「换一个」 swaps one card and the swap is stored', async () => {
    const a = await app();
    renderWithApp(<TalkPanel onNavigate={() => {}} />, a);
    await waitFor(() => expect(heads()).toHaveLength(3));
    const before = heads();
    fireEvent.click(screen.getAllByRole('button', { name: '换一个：话题' })[2]!);
    await waitFor(() => expect(heads()[2]).not.toBe(before[2]));
    expect(heads().slice(0, 2)).toEqual(before.slice(0, 2));
    expect((await getSettings(a.db)).talkDay!.cards.map((c) => c.open)).toEqual(heads());
  });
  it('Share sends the three as plain text through the share sheet', async () => {
    const share = vi.fn(async () => {});
    setNav('share', share);
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await app());
    fireEvent.click(await screen.findByRole('button', { name: "Share today's prompts" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const text = (share.mock.calls[0] as unknown as [{ text: string }])[0].text;
    expect(text.startsWith('字己 ZiJi · 聊一聊 Talk · 12 Oct')).toBe(true);
    expect(text).toContain('1. 话题：我们家的早饭常常吃什么？你觉得哪一种最好吃？\n   What do we usually have for breakfast? Which do you like best?\n   · 早上你喜欢喝什么？');
    expect(screen.queryByText(/Copied/)).toBeNull();
  });
  it('without a share sheet it copies to the clipboard and says so', async () => {
    const writeText = vi.fn(async () => {});
    setNav('clipboard', { writeText });
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await app());
    fireEvent.click(await screen.findByRole('button', { name: "Share today's prompts" }));
    expect(await screen.findByText('Copied. Paste it into a message.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('试试用：'));
  });
});

describe('「✓ 聊了」 (spec §5)', () => {
  it('logs a talk with the minutes picked; more than once a day, the minutes add up', async () => {
    const a = await app();
    renderWithApp(<TalkPanel onNavigate={() => {}} />, a);
    expect(await screen.findByText('Nothing logged today.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '10 min' }));
    expect(screen.getByRole('button', { name: '10 min' }).getAttribute('aria-pressed')).toBe('true');
    const done = screen.getByRole('button', { name: '✓ 聊了 We talked' }) as HTMLButtonElement;
    const ready = () => waitFor(() => expect(done.disabled).toBe(false)); // saving: ✓ waits
    fireEvent.click(done);
    expect(await screen.findByText(/Today: 1 talk · 10 min/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '10 min' }).getAttribute('aria-pressed')).toBe('false');
    await ready();
    fireEvent.click(done);
    expect(await screen.findByText(/Today: 2 talks · 10 min/)).toBeTruthy();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: '5 min' }));
    fireEvent.click(done);
    expect(await screen.findByText(/Today: 3 talks · 15 min/)).toBeTruthy();
    expect((await allTalks(a.db)).map((t) => t.minutes ?? 0).sort((x, y) => x - y)).toEqual([0, 5, 10]);
  });
  it('「Undo」 removes the last one, and goes after its time', async () => {
    const a = await app();
    renderWithApp(<TalkPanel onNavigate={() => {}} undoMs={300} />, a);
    fireEvent.click(await screen.findByRole('button', { name: '✓ 聊了 We talked' }));
    await screen.findByText(/Today: 1 talk/);
    const undo = (await screen.findByRole('button', { name: 'Undo' })) as HTMLButtonElement;
    await waitFor(() => expect(undo.disabled).toBe(false));
    fireEvent.click(undo);
    expect(await screen.findByText('Nothing logged today.')).toBeTruthy();
    expect(await allTalks(a.db)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: '✓ 聊了 We talked' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull());
    expect(await allTalks(a.db)).toHaveLength(1);
  });
  it('a double tap logs once', async () => {
    const a = await app();
    renderWithApp(<TalkPanel onNavigate={() => {}} />, a);
    const done = await screen.findByRole('button', { name: '✓ 聊了 We talked' });
    fireEvent.click(done);
    fireEvent.click(done);
    expect(await screen.findByText(/Today: 1 talk/)).toBeTruthy();
    expect(await allTalks(a.db)).toHaveLength(1);
  });
});

```

In `src/parent/parentB.test.tsx:133` change `toBe(13); // + From a worksheet, Skills, Listen & confirm` to `toBe(14); // + From a worksheet, Skills, Listen & confirm, 聊一聊 Talk`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/talk/share.test.ts src/parent/talk.test.tsx src/parent/parentB.test.tsx`
Expected: FAIL — `Failed to resolve import "./share"` / `"./TalkPanel"`; parentB counts 13 icons.

- [ ] **Step 3: Share**

Create `src/talk/share.ts`:

```ts
// Share (spec 2026-10-12 parent loop §5): the iPad share sheet, else the clipboard with a "Copied" note.
import type { TalkCard } from '../types';
import { KIND_LABEL } from './pick';
import { shortDate } from './week';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';
type Sharer = { share?: (data: ShareData) => Promise<void>; clipboard?: Pick<Clipboard, 'writeText'> };

/** The share sheet when there is one; closing it is 'cancelled'. No share sheet, or it failed: the clipboard. */
export async function shareText(text: string, nav: Sharer = navigator): Promise<ShareResult> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    if (!nav.clipboard) return 'failed';
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Today's three as plain text: each card's question, its English line, its follow-ups and pattern. */
export function todayText(cards: readonly TalkCard[], today: string): string {
  return [
    `字己 ZiJi · 聊一聊 Talk · ${shortDate(today)}`,
    ...cards.map((c, i) => [`${i + 1}. ${KIND_LABEL[c.kind]}：${c.open}`, `   ${c.en}`, ...c.followUps.map((f) => `   · ${f}`), `   试试用：${c.pattern}`].join('\n')),
  ].join('\n\n');
}
```

- [ ] **Step 4: The panel**

Create `src/parent/TalkPanel.tsx`:

```tsx
// 聊一聊 Talk (spec 2026-10-12 parent loop §5): today's three conversation starters for the parent, a one-tap 「✓ 聊了」, and the
// week's summary. Parent area only: never shown to the child, no streak.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { THEME_LABEL } from '../content/talkPrompts';
import { newId } from '../lib/id';
import { addDays, localDateKey, startOfLocalDay } from '../lib/date';
import { swapTalk, todayTalk } from '../talk/load';
import { KIND_LABEL } from '../talk/pick';
import { shareText, todayText } from '../talk/share';
import { talkTotals, type TalkTotals } from '../talk/week';
import { addTalk, deleteTalk, talksBetween } from '../store/repo';
import type { TalkCard } from '../types';
import type { ParentTab } from './ParentArea';

/** How long 「Undo」 stays after a talk is logged. */
export const UNDO_MS = 10_000;
export const MINUTE_CHIPS = [5, 10, 15] as const;

/** The day's cards: tap one to see its follow-ups, the pattern and a sample answer; 「换一个」 swaps it. */
export function TalkCards({ cards, onSwap }: { cards: readonly TalkCard[]; onSwap: (slot: number) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div class="talk__cards">
      {cards.map((c, i) => (
        <article key={c.id} class={`talk-card ${open === c.id ? 'is-open' : ''}`}>
          <button type="button" class="talk-card__head" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
            <span class="talk-card__kind">{KIND_LABEL[c.kind]}{c.word ? ` · ${c.word}` : c.theme && c.kind === 'theme' ? ` · ${THEME_LABEL[c.theme]}` : ''}</span>
            <span class="talk-card__open hanzi" lang="zh">{c.open}</span>
            <span class="talk-card__en" lang="en">{c.en}</span>
          </button>
          {open === c.id && (
            <div class="talk-card__more">
              <ul class="talk-card__follow">{c.followUps.map((f) => <li key={f} lang="zh">{f}</li>)}</ul>
              <p class="talk-card__pattern" lang="zh">试试用：{c.pattern}</p>
              <p class="talk-card__sample" lang="zh">比如：{c.sample}</p>
            </div>
          )}
          <button type="button" class="small-btn talk-card__swap" aria-label={`换一个：${KIND_LABEL[c.kind]}`} onClick={() => onSwap(i)}>换一个</button>
        </article>
      ))}
    </div>
  );
}

/** 「✓ 聊了 We talked」 with optional minutes; 「Undo」 for 10 s after. */
export function TalkLogger({ today, undoable, saving, onLog, onUndo }: { today: TalkTotals; undoable: boolean; saving: boolean; onLog: (minutes: number | null) => void; onUndo: () => void }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  return (
    <div class="talk__log">
      <div class="row talk__chips" role="group" aria-label="Minutes (optional)">
        {MINUTE_CHIPS.map((m) => (
          <button key={m} type="button" class={`chip ${minutes === m ? 'is-on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(minutes === m ? null : m)}>{m} min</button>
        ))}
      </div>
      <button type="button" class="btn btn--primary talk__done" disabled={saving} onClick={() => { onLog(minutes); setMinutes(null); }}>✓ 聊了 We talked</button>
      <p class="muted talk__today" role="status">
        {today.times ? `Today: ${today.times} ${today.times === 1 ? 'talk' : 'talks'}${today.minutes ? ` · ${today.minutes} min` : ''}` : 'Nothing logged today.'}
        {undoable && <> <button type="button" class="small-btn talk__undo" disabled={saving} onClick={onUndo}>Undo</button></>}
      </p>
    </div>
  );
}

export function TalkPanel({ onNavigate, undoMs = UNDO_MS }: { onNavigate: (tab: ParentTab) => void; undoMs?: number }) {
  const { db, now } = useApp();
  const [cards, setCards] = useState<TalkCard[] | null>(null);
  const [today, setToday] = useState<TalkTotals>({ days: 0, minutes: 0, times: 0 });
  const [last, setLast] = useState<string | null>(null); // the talk 「Undo」 removes
  const [note, setNote] = useState<{ at: 'today' | 'week'; text: string } | null>(null); // "Copied", under the button tapped
  const [error, setError] = useState(false);
  const busy = useRef(false); // a double tap swaps or logs once
  const [saving, setSaving] = useState(false); // shown: ✓ and Undo wait while a talk is saved
  const fail = (e: unknown) => {
    console.error(e);
    setError(true);
  };
  const countToday = async () => {
    const from = startOfLocalDay(now());
    setToday(talkTotals(await talksBetween(db, from.getTime(), addDays(from, 1).getTime()), 0, Infinity));
  };
  useEffect(() => {
    todayTalk(db, now()).then(setCards).catch(fail);
    countToday().catch(fail);
  }, []);
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), undoMs);
    return () => clearTimeout(t);
  }, [last]);
  const once = async (act: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await act();
      setError(false);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const share = async (text: string, at: 'today' | 'week') => {
    const r = await shareText(text);
    setNote(r === 'copied' ? { at, text: 'Copied. Paste it into a message.' } : r === 'failed' ? { at, text: 'This device could not share or copy it.' } : null);
  };
  const log = (minutes: number | null) => once(async () => {
    const id = newId();
    await addTalk(db, { id, at: now().getTime(), ...(minutes ? { minutes } : {}) });
    await countToday();
    setLast(id);
  });
  const undo = () => once(async () => {
    if (!last) return;
    await deleteTalk(db, last);
    setLast(null);
    await countToday();
  });
  return (
    <>
      <section class="panel talk">
        <h2>聊一聊 Today</h2>
        <p class="muted">Three things to talk about in Mandarin today. Tap one for follow-ups, a sentence pattern to nudge him toward, and what an answer could sound like. Let him do most of the talking.</p>
        {error && <p class="muted" role="alert">Something went wrong. Try again.</p>}
        {cards ? <TalkCards cards={cards} onSwap={(slot) => void once(async () => setCards(await swapTalk(db, now(), slot)))} /> : (!error && <p class="muted">Loading…</p>)}
        {cards && <button type="button" class="btn talk__share" onClick={() => void share(todayText(cards, localDateKey(now())), 'today')}>Share today's prompts</button>}
        {note?.at === 'today' && <p class="muted" role="status">{note.text}</p>}
        <TalkLogger today={today} undoable={last !== null} saving={saving} onLog={(m) => void log(m)} onUndo={() => void undo()} />
      </section>
    </>
  );
}
```

- [ ] **Step 5: The tab**

In `src/parent/ParentArea.tsx`:
- add `MessageCircle` to the lucide import (after `LayoutDashboard`);
- after `import { SettingsPanel } from './SettingsPanel';` add `import { TalkPanel } from './TalkPanel';`;
- `export type ParentTab = 'dashboard' | 'listen' | 'talk' | 'progress' | …` (insert `'talk'` after `'listen'`);
- in `TABS`, after the `['listen', …]` row:

```ts
  ['talk', '聊一聊 Talk', MessageCircle], // the parent's conversation prompts and week (spec 2026-10-12 parent loop §5)
```

- after `{tab === 'listen' && <ListenPanel … />}`:

```tsx
          {tab === 'talk' && <TalkPanel onNavigate={setTab} />}
```

- [ ] **Step 6: The styles**

Append to `src/styles.css`:

```css
/* 聊一聊 Talk (spec 2026-10-12 parent loop §5): the day's cards, 「✓ 聊了」 and the week, in the parent area */
.talk__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; }
.talk-card { border: 2px solid var(--line); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px; min-width: 0; background: var(--surface); }
.talk-card__head { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 6px; min-height: 44px; }
.talk-card__head:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }
.talk-card__kind { font-size: 13px; font-weight: 900; color: var(--ink-soft); }
.talk-card__open { font-size: 22px; line-height: 1.4; overflow-wrap: anywhere; }
.talk-card__en { font-size: 15px; color: var(--ink-soft); }
.talk-card__more { display: flex; flex-direction: column; gap: 6px; font-size: 18px; }
.talk-card__follow { margin: 0; padding-left: 20px; }
.talk-card__pattern { margin: 0; font-weight: 800; color: var(--green-ink); }
.talk-card__sample { margin: 0; color: var(--ink-soft); }
.talk-card__swap, .talk__share, .talk__share-week { align-self: flex-start; }
.talk__log { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.talk__chips { justify-content: flex-start; gap: 8px; }
.talk__chips .chip, .talk__toggle .chip { min-height: 44px; padding: 6px 16px; }
.talk__chips .chip.is-on, .talk__toggle .chip.is-on { background: var(--green); }
.talk__weekbar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; }
.talk__weekbar h2 { margin: 0; }
.talk__toggle { justify-content: flex-start; gap: 8px; }
.talk__facts { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; }
.talk__facts dt { font-weight: 900; }
.talk__facts dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.talk__passage { display: block; }
.talk__focus { font-size: 20px; font-weight: 800; }
@media (max-width: 600px) {
  .talk__facts { grid-template-columns: 1fr; gap: 2px; }
  .talk__facts dd { margin-bottom: 8px; }
}
```

- [ ] **Step 7: Run them to see them pass**

Run: `npx vitest run src/talk src/parent/talk.test.tsx src/parent/parentB.test.tsx && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/talk/share.ts src/talk/share.test.ts src/parent/TalkPanel.tsx src/parent/talk.test.tsx src/parent/ParentArea.tsx src/parent/parentB.test.tsx src/styles.css
git commit -m "feat: 聊一聊 Talk tab — today's three cards, 换一个, Share with a clipboard fallback, ✓ 聊了 with minutes and Undo"
```

---

### Task 6: This week, its 「上周」 toggle and Share the week

**Files:**
- Modify: `src/parent/TalkPanel.tsx` (imports; `WeekView`; week state in `TalkPanel`)
- Modify: `src/parent/talk.test.tsx` (import; a `describe` at the end)

**Interfaces:**
- Consumes: `loadWeek` (Task 4); `shortDate`, `weekText`, `WeekRange`, `WeekSummary` (Task 4); `TalkPanel` (Task 5).
- Produces: `WeekView({ range, summary, back, onBack, onNavigate, onShare })`; rows carry classes `talk__fact--talk`, `--progress`, `--shaky`, `--langdu`, `--waiting`, `talk__focus`.

- [ ] **Step 1: Write the failing test**

In `src/parent/talk.test.tsx` change `import { allTalks, getSettings } from '../store/repo';` to `import { addRecording, addTalk, allTalks, getSettings } from '../store/repo';` and append:

```tsx
describe('the 聊一聊 Talk tab: this week (spec §5)', () => {
  const week = async () => {
    const a = await app();
    await addTalk(a.db, { id: 'old', at: new Date(2026, 9, 11, 19).getTime(), minutes: 15 }); // last Sunday
    await addRecording(a.db, { id: 's1', createdAt: new Date(2026, 9, 12, 17).getTime(), prompt: { kind: 'say', wordId: 'b:大' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 });
    return a;
  };
  const fact = (name: string) => document.querySelector(`.talk__fact--${name}`)!.textContent;
  it('Monday to Sunday: talk, progress, shaky words, 朗读, what waits and the focus; a talk logged shows at once', async () => {
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await week());
    expect(await screen.findByRole('heading', { name: /This week 12 Oct – 18 Oct/ })).toBeTruthy();
    expect(fact('talk')).toBe('0 days · 0 min');
    expect(fact('shaky')).toBe('None this week.');
    expect(fact('langdu')).toBe('No 朗读 this week.');
    expect(document.querySelector('.talk__focus')!.textContent).toBe('多聊：这周聊了 0 天，试试每天聊五分钟');
    fireEvent.click(screen.getByRole('button', { name: '10 min' }));
    fireEvent.click(screen.getByRole('button', { name: '✓ 聊了 We talked' }));
    await waitFor(() => expect(fact('talk')).toBe('1 day · 10 min'));
  });
  it('「上周」 shows last week, 「这周」 comes back', async () => {
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await week());
    fireEvent.click(await screen.findByRole('button', { name: '上周' }));
    expect(await screen.findByRole('heading', { name: /Last week 5 Oct – 11 Oct/ })).toBeTruthy();
    expect(fact('talk')).toBe('1 day · 15 min');
    expect(screen.getByRole('button', { name: '上周' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '这周' }));
    await waitFor(() => expect(fact('talk')).toBe('0 days · 0 min'));
  });
  it('what waits links to Listen & confirm', async () => {
    const onNavigate = vi.fn();
    renderWithApp(<TalkPanel onNavigate={onNavigate} />, await week());
    await waitFor(() => expect(fact('waiting')).toContain('1 Say take · 0 read-aloud takes'));
    fireEvent.click(screen.getByRole('button', { name: 'Listen & confirm' }));
    expect(onNavigate).toHaveBeenCalledWith('listen');
  });
  it('Share the week sends the summary as plain text; without a share sheet it is copied', async () => {
    const share = vi.fn(async () => {});
    setNav('share', share);
    renderWithApp(<TalkPanel onNavigate={() => {}} />, await week());
    fireEvent.click(await screen.findByRole('button', { name: 'Share the week' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect((share.mock.calls[0] as unknown as [{ text: string }])[0].text.split('\n').slice(0, 2)).toEqual(['字己 ZiJi · This week 12 Oct – 18 Oct', 'Talk: 0 days · 0 min']);
    setNav('share', undefined);
    const writeText = vi.fn(async () => {});
    setNav('clipboard', { writeText });
    fireEvent.click(screen.getByRole('button', { name: 'Share the week' }));
    expect(await screen.findByText('Copied. Paste it into a message.')).toBeTruthy();
    expect(document.querySelector('.talk__week + p[role="status"]')).toBeTruthy(); // under the week, where the parent tapped
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/parent/talk.test.tsx`
Expected: FAIL — the 4 new tests (no heading "This week …").

- [ ] **Step 3: The week view**

In `src/parent/TalkPanel.tsx`:
- `import { swapTalk, todayTalk } from '../talk/load';` → `import { loadWeek, swapTalk, todayTalk } from '../talk/load';`
- `import { talkTotals, type TalkTotals } from '../talk/week';` → `import { shortDate, talkTotals, weekText, type TalkTotals, type WeekRange, type WeekSummary } from '../talk/week';`
- insert before `export function TalkPanel(`:

```tsx
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const named = (xs: string[]) => (xs.length ? `: ${xs.join('、')}` : '');

/** This week or last (spec §5): talk, his app progress, shaky words, 朗读, what waits, and the focus for next week. */
export function WeekView({ range, summary: s, back, onBack, onNavigate, onShare }: {
  range: WeekRange; summary: WeekSummary; back: number; onBack: (back: number) => void; onNavigate: (tab: ParentTab) => void; onShare: () => void;
}) {
  const waiting = s.waiting.say + s.waiting.passage;
  return (
    <section class="panel talk__week">
      <div class="talk__weekbar">
        <h2>{back ? 'Last week' : 'This week'} <small class="muted">{shortDate(range.start)} – {shortDate(range.end)}</small></h2>
        <div class="row talk__toggle" role="group" aria-label="Which week">
          <button type="button" class={`chip ${back === 0 ? 'is-on' : ''}`} aria-pressed={back === 0} onClick={() => onBack(0)}>这周</button>
          <button type="button" class={`chip ${back === 1 ? 'is-on' : ''}`} aria-pressed={back === 1} onClick={() => onBack(1)}>上周</button>
        </div>
      </div>
      <dl class="talk__facts">
        <dt>Talk</dt>
        <dd class="talk__fact--talk">{plural(s.talk.days, 'day')} · {s.talk.minutes} min</dd>
        <dt>His app progress</dt>
        <dd class="talk__fact--progress">
          New to read {s.progress.read.length}{named(s.progress.read)} · to write {s.progress.write.length}{named(s.progress.write)} · to say {s.progress.say.length}{named(s.progress.say)}
          <br />{plural(s.progress.lessons, 'lesson')} · 朗读 on {plural(s.progress.langduDays, 'day')}
        </dd>
        <dt>Shaky words</dt>
        <dd class="talk__fact--shaky">{s.shaky.length ? <span class="hanzi">{s.shaky.join('、')}</span> : 'None this week.'}</dd>
        <dt>朗读</dt>
        <dd class="talk__fact--langdu">
          {s.langdu.length ? s.langdu.map((p) => (
            <span key={p.passageId} class="talk__passage">《{p.title}》 {plural(p.days, 'day')}{p.meaning ? ` · meaning question ${p.meaning}` : ''}</span>
          )) : 'No 朗读 this week.'}
        </dd>
        <dt>Waiting for you</dt>
        <dd class="talk__fact--waiting">
          {waiting ? `${plural(s.waiting.say, 'Say take')} · ${plural(s.waiting.passage, 'read-aloud take')}` : 'Nothing waiting.'}
          {waiting > 0 && <> <button type="button" class="small-btn" onClick={() => onNavigate('listen')}>Listen & confirm</button></>}
        </dd>
        <dt>Focus next week</dt>
        <dd class="talk__focus" lang="zh">{s.focus}</dd>
      </dl>
      <button type="button" class="btn talk__share-week" onClick={onShare}>Share the week</button>
    </section>
  );
}
```

- in `TalkPanel`, before `const busy = useRef(false);`:

```tsx
  const [back, setBack] = useState(0); // 0 this week, 1 last week
  const [week, setWeek] = useState<{ range: WeekRange; summary: WeekSummary } | null>(null);
```

- after the first `useEffect` (the one calling `todayTalk`):

```tsx
  useEffect(() => {
    loadWeek(db, now(), back).then(setWeek).catch(fail);
  }, [back]);
```

- in `log`, between `await countToday();` and `setLast(id);`, and in `undo` after its `await countToday();`, add:

```tsx
    setWeek(await loadWeek(db, now(), back));
```

- after the closing `</section>` of the Today panel (inside the fragment):

```tsx
      {week && <WeekView range={week.range} summary={week.summary} back={back} onBack={setBack} onNavigate={onNavigate} onShare={() => void share(weekText(week.summary, week.range, back), 'week')} />}
      {note?.at === 'week' && <p class="muted" role="status">{note.text}</p>}
```

The finished `TalkPanel` function reads:

```tsx
export function TalkPanel({ onNavigate, undoMs = UNDO_MS }: { onNavigate: (tab: ParentTab) => void; undoMs?: number }) {
  const { db, now } = useApp();
  const [cards, setCards] = useState<TalkCard[] | null>(null);
  const [today, setToday] = useState<TalkTotals>({ days: 0, minutes: 0, times: 0 });
  const [last, setLast] = useState<string | null>(null); // the talk 「Undo」 removes
  const [note, setNote] = useState<{ at: 'today' | 'week'; text: string } | null>(null); // "Copied", under the button tapped
  const [error, setError] = useState(false);
  const [back, setBack] = useState(0); // 0 this week, 1 last week
  const [week, setWeek] = useState<{ range: WeekRange; summary: WeekSummary } | null>(null);
  const busy = useRef(false); // a double tap swaps or logs once
  const [saving, setSaving] = useState(false); // shown: ✓ and Undo wait while a talk is saved
  const fail = (e: unknown) => {
    console.error(e);
    setError(true);
  };
  const countToday = async () => {
    const from = startOfLocalDay(now());
    setToday(talkTotals(await talksBetween(db, from.getTime(), addDays(from, 1).getTime()), 0, Infinity));
  };
  useEffect(() => {
    todayTalk(db, now()).then(setCards).catch(fail);
    countToday().catch(fail);
  }, []);
  useEffect(() => {
    loadWeek(db, now(), back).then(setWeek).catch(fail);
  }, [back]);
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), undoMs);
    return () => clearTimeout(t);
  }, [last]);
  const once = async (act: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await act();
      setError(false);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const share = async (text: string, at: 'today' | 'week') => {
    const r = await shareText(text);
    setNote(r === 'copied' ? { at, text: 'Copied. Paste it into a message.' } : r === 'failed' ? { at, text: 'This device could not share or copy it.' } : null);
  };
  const log = (minutes: number | null) => once(async () => {
    const id = newId();
    await addTalk(db, { id, at: now().getTime(), ...(minutes ? { minutes } : {}) });
    await countToday();
    setWeek(await loadWeek(db, now(), back));
    setLast(id);
  });
  const undo = () => once(async () => {
    if (!last) return;
    await deleteTalk(db, last);
    setLast(null);
    await countToday();
    setWeek(await loadWeek(db, now(), back));
  });
  return (
    <>
      <section class="panel talk">
        <h2>聊一聊 Today</h2>
        <p class="muted">Three things to talk about in Mandarin today. Tap one for follow-ups, a sentence pattern to nudge him toward, and what an answer could sound like. Let him do most of the talking.</p>
        {error && <p class="muted" role="alert">Something went wrong. Try again.</p>}
        {cards ? <TalkCards cards={cards} onSwap={(slot) => void once(async () => setCards(await swapTalk(db, now(), slot)))} /> : (!error && <p class="muted">Loading…</p>)}
        {cards && <button type="button" class="btn talk__share" onClick={() => void share(todayText(cards, localDateKey(now())), 'today')}>Share today's prompts</button>}
        {note?.at === 'today' && <p class="muted" role="status">{note.text}</p>}
        <TalkLogger today={today} undoable={last !== null} saving={saving} onLog={(m) => void log(m)} onUndo={() => void undo()} />
      </section>
      {week && <WeekView range={week.range} summary={week.summary} back={back} onBack={setBack} onNavigate={onNavigate} onShare={() => void share(weekText(week.summary, week.range, back), 'week')} />}
      {note?.at === 'week' && <p class="muted" role="status">{note.text}</p>}
    </>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/parent/talk.test.tsx && npx tsc --noEmit`
Expected: PASS (12 tests); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/parent/TalkPanel.tsx src/parent/talk.test.tsx
git commit -m "feat: the week in 聊一聊 — talk next to his progress, 上周 toggle, focus line, Share the week"
```

---

### Task 7: The Overview talk line and the 2-day nudge

**Files:**
- Modify: `src/parent/Dashboard.tsx` (imports; `Data.talks`; the load; a tile after "Takes to review")
- Modify: `src/styles.css` (`.tile__note`)
- Create: `src/parent/talkTile.test.tsx`

**Interfaces:**
- Consumes: `allTalks` (Task 2); `talkNudge`, `talkTotals`, `weekRange` (Task 4); `ParentTab` `'talk'` (Task 5).
- Produces: a `.tile.tile--talk` with `.tile__label` "Talk: N day(s) · M min this week", `.tile__note` (the nudge) and a 「聊一聊 Talk」 button → `onNavigate('talk')`.

- [ ] **Step 1: Write the failing test**

Create `src/parent/talkTile.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addTalk } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { Dashboard } from './Dashboard';

const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();
const tile = async () => (await screen.findByText(/^Talk: /)).closest('.tile')!;

describe('the Overview talk tile (spec 2026-10-12 parent loop §5)', () => {
  it("this week's days and minutes, and it opens the Talk tab", async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 15, 8) }); // Thursday
    for (const [id, d, minutes] of [['a', 12, 10], ['b', 12, 5], ['c', 14, undefined], ['old', 11, 30]] as const) await addTalk(app.db, { id, at: at(d), ...(minutes ? { minutes } : {}) });
    const onNavigate = vi.fn();
    renderWithApp(<Dashboard onNavigate={onNavigate} />, app);
    const t = await tile();
    expect(t.querySelector('.tile__label')!.textContent).toBe('Talk: 2 days · 15 min this week');
    expect(t.querySelector('.tile__note')).toBeNull(); // talked yesterday
    fireEvent.click(screen.getByRole('button', { name: '聊一聊 Talk' }));
    expect(onNavigate).toHaveBeenCalledWith('talk');
  });
  it('a gentle note after 2 days with no talk logged', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 15, 8) });
    await addTalk(app.db, { id: 'a', at: at(13) }); // Tuesday
    renderWithApp(<Dashboard onNavigate={() => {}} />, app);
    const t = await tile();
    expect(t.querySelector('.tile__label')!.textContent).toBe('Talk: 1 day · 0 min this week');
    expect(t.querySelector('.tile__note')!.textContent).toBe('No talk logged since Tue.');
  });
  it('none logged yet says so', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 15, 8) });
    renderWithApp(<Dashboard onNavigate={() => {}} />, app);
    expect((await tile()).querySelector('.tile__note')!.textContent).toBe('No talk logged yet.');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/parent/talkTile.test.tsx`
Expected: FAIL — no text matching `/^Talk: /`.

- [ ] **Step 3: The tile**

In `src/parent/Dashboard.tsx`:
- `import { allSessions, listRecordings, logsSince } from '../store/repo';` → `import { allSessions, allTalks, listRecordings, logsSince } from '../store/repo';`
- `import type { ReviewLog, SessionRecord } from '../types';` → 

```ts
import { talkNudge, talkTotals, weekRange } from '../talk/week';
import type { ReviewLog, SessionRecord, TalkLog } from '../types';
```

- in `interface Data`, after `micDenied: boolean;` add `talks: TalkLog[]; // the parent's 「✓ 聊了」 (spec 2026-10-12 parent loop §5)`
- the load becomes `const [know, sessions, logs, all, talks] = await Promise.all([loadKnowledge(db), allSessions(db), logsSince(db, addDays(t, -42).getTime()), listRecordings(db), allTalks(db)]);` and `setD({ know, sessions, logs, recordings, takes, micDenied, talks });`
- after `const pct = …;` add:

```ts
  const week = weekRange(t);
  const talk = talkTotals(d.talks, week.from, week.to);
  const nudge = talkNudge(d.talks, t);
```

- after the "Takes to review" tile's closing `</div>` (still inside `.tiles`):

```tsx
        <div class="tile tile--talk">
          <span class="tile__label">Talk: {talk.days} {talk.days === 1 ? 'day' : 'days'} · {talk.minutes} min this week</span>
          {nudge && <small class="tile__note">{nudge}</small>}
          <button type="button" class="small-btn" onClick={() => onNavigate('talk')}>聊一聊 Talk</button>
        </div>
```

Append to `src/styles.css`:

```css
.tile__note { color: var(--ink-soft); } /* the Overview's talk nudge */
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/parent/talkTile.test.tsx src/parent/listen.test.tsx src/parent/voiceWarning.test.tsx && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/parent/Dashboard.tsx src/parent/talkTile.test.tsx src/styles.css
git commit -m "feat: Overview talk line and a gentle note after 2 days without a talk"
```

---

### Task 8: WebKit stage case, the full suite and the build

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (imports; a `talk` case before the `langdu-` case)
- Modify: `scripts/stage-cases.ts` (the `talk` checks after the `listen` sideways check)

**Interfaces:**
- Consumes: `TalkCards`, `TalkLogger`, `WeekView` (Tasks 5–6); `pickDay` (Task 3); `talkWord` (Task 3); `weekRange`, `WeekSummary` (Task 4); `PASSAGES`, `PASSAGE_QUESTIONS`, `builtinWords` (already imported by the page).
- Produces: stage case `talk`; screenshots `fit-shots/stage-cases/talk-today-<size>.png`, `talk-week-<size>.png` at all five sizes (three phones, iPad landscape and portrait).

- [ ] **Step 1: The stage page**

In `scripts/stage-cases/page.tsx`, after `import { familyBoard } from '../../src/practice/family';` add:

```tsx
import { TalkCards, TalkLogger, WeekView } from '../../src/parent/TalkPanel';
import { pickDay } from '../../src/talk/pick';
import { talkWord } from '../../src/talk/load';
import { weekRange, type WeekSummary } from '../../src/talk/week';
```

and insert before `else if (which?.startsWith('langdu-')) {`:

```tsx
else if (which === 'talk') {
  // the parent's 聊一聊 tab (spec 2026-10-12 parent loop §7): a generated word starter (the longest kind), his 朗读 passage and a
  // theme; logging with Undo showing; a week with every row full
  const p17 = PASSAGES.find((x) => x.id === 'p17')!;
  const jie = builtinWords(0).find((w) => w.text === '借')!;
  const cards = pickDay({ today: '2026-10-12', seen: {}, words: [talkWord(jie)], passage: { id: p17.id, title: p17.title, question: PASSAGE_QUESTIONS.p17 } });
  const summary: WeekSummary = {
    talk: { days: 4, minutes: 45, times: 5 },
    progress: { read: ['借', '饿', '饱', '甜', '森', '林', '游', '泳'], write: ['大', '小', '马'], say: ['森林', '游泳'], lessons: 6, langduDays: 5 },
    shaky: ['饿', '饱', '甜', '森', '泳'],
    langdu: [{ passageId: 'p17', title: '小马', days: 3, meaning: 'missed' }, { passageId: 'p20', title: '我的学校', days: 2, meaning: 'right' }],
    newWords: ['借', '饿', '饱', '甜'],
    waiting: { say: 3, passage: 1 },
    focus: '多读：他这周的朗读题答错了，问问他《小马》的故事',
  };
  render(
    <div class="screen screen--scroll parent">
      <main class="parent__body">
        <section class="panel talk">
          <h2>聊一聊 Today</h2>
          <TalkCards cards={cards} onSwap={() => {}} />
          <button type="button" class="btn talk__share">Share today's prompts</button>
          <TalkLogger today={{ days: 1, minutes: 15, times: 2 }} undoable saving={false} onLog={() => {}} onUndo={() => {}} />
        </section>
        <WeekView range={weekRange(new Date(2026, 9, 15))} summary={summary} back={0} onBack={() => {}} onNavigate={() => {}} onShare={() => {}} />
      </main>
    </div>,
    app,
  );
}
```

- [ ] **Step 2: The checks**

In `scripts/stage-cases.ts`, after

```ts
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (sideways > 1) problems.push(`${size.name} listen: the page scrolls sideways ${sideways}px`);
```

insert:

```ts
  // the parent's 聊一聊 tab (spec 2026-10-12 parent loop §7): Today with a card open, This week; every button big enough to tap,
  // nothing makes the page scroll sideways
  await page.goto(`file://${dir}/index.html?case=talk`);
  await page.waitForSelector('.talk-card');
  await page.click('.talk-card__head >> nth=0');
  await page.waitForTimeout(200);
  if (!(await page.$('.talk-card__more'))) problems.push(`${size.name} talk: tapping a card does not open it`);
  await page.locator('.talk').screenshot({ path: `fit-shots/stage-cases/talk-today-${size.name}.png` });
  await page.locator('.talk__week').screenshot({ path: `fit-shots/stage-cases/talk-week-${size.name}.png` });
  for (const q of ['.talk-card__head', '.talk-card__swap', '.talk__share', '.talk__chips .chip', '.talk__done', '.talk__undo', '.talk__toggle .chip', '.talk__week .small-btn', '.talk__share-week']) {
    const els = await page.$$(q);
    if (!els.length) problems.push(`${size.name} talk: no ${q}`);
    for (const b of els) {
      const box = await b.boundingBox();
      if (!box || box.height < 43.5) { problems.push(`${size.name} talk: ${q} under 44px tall (${box ? Math.round(box.height) : 'hidden'})`); break; }
    }
  }
  const talkSideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (talkSideways > 1) problems.push(`${size.name} talk: the page scrolls sideways ${talkSideways}px`);
```

- [ ] **Step 3: Run the stage cases**

Run: `npx tsx scripts/stage-cases.ts`
Expected: `stage cases: ok`. Look at `fit-shots/stage-cases/talk-today-ipad-landscape.png`, `talk-today-iphone-se.png`, `talk-week-ipad-portrait.png` and `talk-week-iphone-se.png`: the first card open with its follow-ups, 「试试用：我…借…」 and the sample; the three cards side by side on the iPad and stacked on a phone; the week's rows label-over-value on a phone. A problem line is a layout to fix in `src/styles.css` (not in the check).

- [ ] **Step 4: Full suite, types, build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 236 files, 2020 tests pass (rerun a timed-out rendered file alone before treating it as a failure); no type errors; the build succeeds.

- [ ] **Step 5: Commit**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts src/styles.css
git commit -m "test: WebKit stage case for the 聊一聊 tab (today and the week) at phone and iPad sizes"
```

(`fit-shots/` is not committed.)

---

## Self-review (done while writing)

- **Spec coverage:** §1 success — three starters a day and Share (Tasks 3, 5), one-tap log (Task 5), weekly summary next to talk time (Tasks 4, 6). §2 decisions — parent-only tab after Listen & confirm behind the PIN (Task 5), Share (Tasks 5, 6), one tap with optional minutes and no streak (Task 5), topic bank plus his week's words (Tasks 1, 3). §3 bank, fields, writing rules, the six patterns, the content check with ids, ≥ 6 per theme and the character rule (Task 1). §4 his word with hooks or the generated starter, 朗读 with its fallback, the rotating theme (6 days, least recently shown), stable and stored, 换一个, 14-day no-repeat (Task 3). §5 Today cards, expand, 换一个, Share with clipboard, ✓ 聊了 with 5/10/15, repeat logging, Undo 10 s (Task 5); This week rows, 上周, focus line, Share the week (Tasks 4, 6); Overview line and nudge (Task 7). §6 talk store, backup/restore, `talkDay`, version bump without migration (Tasks 1–3). §7 unit tests for picking, summary, focus, sums, content check (Tasks 1–4); rendered tests for expand, share/clipboard, logging and undo, week toggle, Overview tile and nudge (Tasks 5–7); backup includes talk logs (Task 2, at the store, where `LIST_STORES` decides it); WebKit at iPad and phone sizes (Task 8). §8 nothing out of scope is built.
- **Placeholders:** none; every code step has its code, and every content line of the bank is in Task 1.
- **Types:** `TalkCard` (Task 1) is what `pickDay`/`swapCard` return, what `settings.talkDay.cards` stores, and what `TalkCards`/`todayText` take; `TalkTotals` from `talkTotals` feeds `TalkLogger.today` and the Overview tile; `WeekRange`/`WeekSummary` from `loadWeek` feed `WeekView` and `weekText(summary, range, back)`; `KIND_LABEL` is defined in `pick.ts` and used by `TalkCards` and `todayText`; `TalkLogger`'s `saving` prop is passed by `TalkPanel` and the stage case.
- **Measured values** (a copy of the repo in the scratchpad with this plan's code; deleted): every Han character in the 80 starters and the templates against HSK ≤ 3 plus the reading lists up to 二下 (empty allow-list); `talkWord(借)` = 'to borrow', 「我可以借你的笔吗？」; the picks t04 / r:p17:0 / t35 for 爷 + 《小马》 on 12 Oct and t35 / t60 / t53 with neither; the swaps; the 28-day rotation; 饿、饱、甜 → 食物; the week numbers, focus strings, nudges and share text; the rendered tests (run three times); the stage cases (`stage cases: ok`); `tsc`, the build, and the full suite at 236 files / 2020 tests.
