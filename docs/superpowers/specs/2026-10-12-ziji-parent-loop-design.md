# ZiJi parent loop: daily talk prompts and a weekly summary — design

Date: 2026-10-12, updated 2026-10-18 · After the lesson overhaul (PRs #1–#4) · Base: main at fa7ca84 (was fe17c74)

## 2026-10-18 update

The parent approved starting the parent loop on 2026-10-18. Main moved on a lot since 2026-10-12, so this spec now follows the current app. The sections below are edited in place; this list says what changed and why.

- **Where it lives.** The parent area is now five tabs (今天 Today, 进度 Progress, 内容 Content, 奖励 Rewards, 设置 Settings), with no room for a sixth. So there is **no 「聊一聊」 tab**:
  - **Talk** is a section of **Today**, right under the weekly-list readiness line (`WeekReadiness`).
  - The **Week summary** is the first section of **Progress**, above School. Today is for what to do now. The summary is read once a week, looks back, and sits with the other "where he stands" views. Today keeps one line, "This week: 3 days · 25 min", with a link to it.
- **One action at the top of Today.** The review asked the parent area to open with one action. Today now starts with a single **"This week, try this"** line (§5.1). It picks the most useful thing from:
  - list readiness gaps;
  - no talk logged for 2 days;
  - takes waiting in Listen & confirm;
  - a backup overdue;
  - class shortfall.
- **Prompt 2 is shared reading.** 朗读 now has a library of 88 passages, each with two questions, plus reading history, rotation and 下一篇. Prompt 2 becomes three questions on today's passage: 谁, 为什么 and 你觉得. They come from the passage's own questions, with open follow-ups where it has none. This is dialogic reading, from the review's research note: Chow & McBride-Chang (2003) on dialogic reading; Li & Tan (2016) on Mandarin talk at home predicting oral skill.
- **Prompt 1 prefers this week's list.** "His word" now takes this week's 本周词语 first, words not yet ready before ready ones. Then it takes his new class words.
- **The data is v7.** The db is at v6 (`weekLists`). The talk log is a new `talks` store at **v7**. Backup, restore and undo-restore carry it, following v6's `listsMissing` pattern (`talksMissing`, §6).
- **The learning rules are unchanged by this work.** Lessons are 15 minutes, extra lessons are review-only (so new words come only from the day's lesson), and the river meter fills by mastery. The summary counts lessons and words with those rules.
- **The parent is fluent (unchanged).** The prompts give topics, follow-ups and patterns, not scripts. The English lines stay, for grandparents and helpers.

## 1. Why

The research report (`reports/Primary Chinese outcomes strategy.md`) ranks **daily Mandarin conversation with a responsive adult** as the top strategy for oral and listening, which together are 35% of PSLE 华文. Among Singaporean Chinese 6-year-olds, Mandarin spoken with parents predicted oral proficiency, while literacy activities did not (Li & Tan 2016). Dialogic reading, where the adult asks open questions about a shared text and builds on the child's answers, improved Chinese vocabulary in Hong Kong kindergarteners (Chow & McBride-Chang 2003). An app cannot have that conversation with him. It *can* organise it.

The report's P1 "parent loop" has two parts:
- three Mandarin conversation prompts a day;
- a short weekly summary of what got stronger, what is shaky, and what to focus on.

**Success:**
- Every day the parent has three ready conversation starters tied to what he is learning this week, and can share them to their phone.
- The parent logs a talk in one tap.
- Today opens with one clear thing to do.
- Once a week, a two-minute summary puts his app progress next to the family's talk time.

## 2. Decisions (parent, 2026-10-12; updated 2026-10-18)

| Question | Decision |
|---|---|
| Who talks | **The parent, who is fluent.** Prompts give topics, follow-ups and target sentence patterns, not scripts. The English line is for a grandparent or helper |
| Where | **A 「聊一聊 Talk」 section on Today**, under the weekly-list readiness line; **the Week summary on Progress**; **Share** through the iPad share sheet. No accounts and no server *(2026-10-18: was a new tab)* |
| Tracking | **One tap 「✓ 聊了」 with optional minutes.** It is never shown to the child and has no streak |
| Content approach | **A written topic bank plus his week's words and today's passage.** Rejected: generating prompts from his words only (too thin), and the topic bank only (not tied to his learning) |
| Top of Today | **One "This week, try this" line** with one button *(2026-10-18)* |

## 3. Content: the talk-prompt bank

`src/content/talkPrompts.ts` holds **80 conversation starters** across the PSLE conversation themes: 家庭 family, 学校 school, 朋友 friends, 食物 food, 节日 festivals, 新加坡 Singapore, 环境 environment, 科技 technology, and 心情与品德 feelings and values.

```ts
interface TalkPrompt {
  id: string;               // 't01'…'t80'
  theme: TalkTheme;
  open: string;             // the opening question, Chinese, P2-level
  en: string;               // one English line, for a grandparent or helper
  followUps: string[];      // 2–3 open follow-ups (什么时候？为什么？如果…你会怎么做？)
  pattern: string;          // the sentence pattern to nudge toward, e.g. '我觉得…因为…'
  sample: string;           // what a P2 answer could sound like (1–2 short sentences), using the pattern
  hooks: string[];          // words the starter is about (picking for his words)
}
```

- **Writing rules:**
  - The questions are open (never a yes/no opening) and warm, about his own life.
  - **Natural Singapore Mandarin, with no 儿化** (哪里, not 哪儿; 一下, not 一会儿). Local life where it fits: 小贩中心, 巴刹, 组屋楼下, 地铁和巴士, 食堂, 华语.
  - The patterns rotate through 我觉得…因为…, 先…然后…最后…, 如果…就…, 虽然…但是…, 有时候…有时候…, and 我最喜欢…因为…. Each is used at least 10 times, and each sample uses its pattern.
  - The samples use characters a P2 child knows.
- **Content check** (`scripts/check-content.ts`, run by its test):
  - every starter has `open`, `en`, 2–3 `followUps`, `pattern`, `sample` and at least one hook;
  - ids are unique;
  - every theme has at least 6 starters;
  - there is no yes/no opening (…吗？) and no 儿化;
  - the English line holds no Chinese;
  - every Han character is in `builtin.json` at HSK level ≤ 3 or on the 欢乐伙伴2.0 reading lists up to 二下, plus a short allow-list of Singapore theme words his lists lack: 榴莲, 巴刹 (刹), 端午节 (端), 粽子, 灯笼, 龙舟.

## 4. Daily picks

`src/talk/pick.ts`, a pure module, picks **3 cards per day** (`src/talk/load.ts` reads the stores for it):

1. **His words** *(2026-10-18)*. Candidates come in this order:
   - this week's 本周词语: the running lists whose homework day isn't behind, with items not yet ready first, in list order;
   - then the new words his lessons introduced in the **last 7 days** (认新字 reached them, not free play): newest lesson first, his class's lane before catch-up.

   For each word, it prefers a starter whose `hooks` hold the word. That means the same word, a hook word holding his character (爷爷 for 爷), or his word holding a hook of two or more characters. A one-character hook never matches inside a longer word. When no starter is about the word, it uses a **word starter** from one fixed template:
   - the question 「你在哪里看到过『X』，或者听人说过『X』？」;
   - follow-ups: 「用『X』说一说你自己的事。」, and 「书上有一句：「…」你也用『X』说一句。」 (from the list's 选词填空 sentence, his class sentence, the school sentence or the sentence bank), and the word's 组词;
   - the pattern 「…X…」;
   - an English line with the word's gloss.
2. **Shared reading of today's passage** *(2026-10-18)*. Today's passage is the 朗读 passage he read most recently, today or yesterday, while 朗读 is on. It may be a built-in or a parent text. The card says: read it together, taking turns a sentence each, then ask three questions:
   - **谁**: the passage's 谁 question; else its first other question; else 「《title》里有谁？」;
   - **为什么**: the passage's 为什么 question; else an open why that points back to the text, 「故事里的人为什么这样做？你是从哪一句知道的？」;
   - **你觉得**: one of four open questions (who did best, what would you do, has this happened to you, what happens next).

   The passage's answers show beside its questions for the parent. 「换一个」 moves to the next 你觉得. When 朗读 is off or nothing was read today or yesterday, the slot takes a theme starter.
3. **A rotating theme.** It takes a starter whose theme hasn't been used in the last 6 days, the least recently shown within that theme. It is never a theme already on screen.

- **Stable through the day:** picks are seeded from the date and stored once made (`settings.talkDay: { date, cards }`), so Today shows the same three all day. *(2026-10-18)* The reading slot alone follows a passage read *after* the cards were picked (the morning's cards, the evening's lesson).
- **「换一个」:** replaces one card with the next candidate of the same kind and stores the swap. A slot with nothing else of its kind gets a theme starter.
- **Never repeats** a card shown in the last 14 days, unless its kind has nothing else. What was shown is remembered for 60 days (`settings.talkSeen`).

## 5. On Today and Progress

### 5.1 The top of Today: "This week, try this" *(2026-10-18)*

Today starts with one line and at most one button. It shows the first of these that applies:

1. A backup **30 or more days** overdue: "No backup for N days…" → Back up now. Losing his progress costs more than any one evening, so this goes first.
2. A weekly list whose check is **within 2 days**, with words not ready: "复习一: 4 of 12 not ready for the check on Wednesday. Go over 街道, 闪闪亮, 雨伞 with him." → Open 本周词语.
3. **No talk logged today or yesterday** (or never): "No talk logged since Saturday. Try today's shared reading questions at dinner." → Go to 聊一聊.
4. **Takes waiting** in Listen & confirm: "3 takes waiting… His Say words move on once you confirm them." → Listen & confirm.
5. **A backup overdue** (the existing 14-day rule): → Back up now.
6. **Class shortfall** in a list week: "4 class words still to start before Friday." or, far behind, "He is behind his class." → See Progress.
7. A list further off with words not ready: "复习一: 8 of 12 ready, check on Thursday." → Open 本周词语.
8. Otherwise a calm line: "Nothing pressing. Enjoy today's talk below." (no button).

The existing warnings, readiness lines and tiles stay below it.

### 5.2 「聊一聊 Talk」 on Today

The section sits right under the weekly-list readiness line.
- Three cards. Each shows its kind label (他的词 His words · 一起读 Shared reading · 话题 Topic), the opening question, and its English line.
- Tapping a card expands its follow-ups, the pattern (「试试用：我觉得…因为…」), and the sample. A shared-reading card shows the passage's answers instead.
- 「换一个」 on each card.
- **Share today's** sends the three as plain text: the label, question, English line, follow-ups (with the passage's answers) and pattern. It uses `navigator.share`. Closing the sheet copies nothing. When sharing is unavailable or fails, it copies to the clipboard and says "Copied. Paste it into a message."
- **「✓ 聊了 We talked」** with optional chips: 5, 10 or 15 min. It can be logged more than once a day, and minutes add up. A double tap logs once. "Undo" is offered for 10 s.
- A line "This week: 3 days · 25 min" and, when nothing was logged today or yesterday, a gentle "No talk logged since Tue" (a date beyond six days; "No talk logged yet" before the first). Then a **Week summary** link to Progress.

### 5.3 Week summary on Progress

This is Monday to Sunday, the current week, with a 「上周」 toggle for last week.
- **Talk:** days talked and total minutes.
- **Lessons:** completed lessons, and the days 朗读 was done.
- **Newly can:** words that newly passed read, write or say this week.
- **New words:** introduced by his lessons this week.
- **Missed most:** up to 5 of the words he missed most this week (all card kinds).
- **朗读:** this week's passages with a take, and his last answer to each one's question (✓, or ✗ question missed).
- **Waiting:** takes in Listen & confirm, with a link.
- **Focus next week:** one line in Chinese with an English line, the first of these that applies:
  - a 朗读 question missed: 「多读：…和他再读一次《小马》，轮流读…」;
  - words he missed: 「多聊食物：这周常错的词是饿、饱、甜…」, in the theme his words lean to;
  - fewer than 3 talk days: 「多聊：这周聊了 N 天。试试每天聊五分钟…」;
  - new words: 「多聊…这周的新词有…」;
  - else 「这周很好！下周继续每天聊一聊。」
- **Share the week:** the same summary as plain text.

Nothing here is shown to the child.

## 6. Data *(2026-10-18: v7)*

- **Talk log:** a new object store `talks` at **db v7** (`keyPath: 'id'`, index `byAt`), holding entries `{ id, at: number, minutes?: number }`. It joins `LIST_STORES`, so backup, restore, the emergency copy and undo-restore carry it.
- **A backup from before v7** has no `talks`. Its preview says so (`talksMissing`), and the restore **keeps this device's talks**: they are the family's log, not his progress. This differs from v6's lists, which a restore clears because their words go. Undo puts back exactly what was there before the restore.
- **The day's picks:** `settings.talkDay` and `settings.talkSeen`, as in §4. They travel with settings in backups.
- **No migration.** The db version bump adds the store, following the existing upgrade pattern.

## 7. Testing

- **Unit tests:**
  - picking:
    - his word, from this week's list first, then class words;
    - the shared-reading card from the passage's questions and its fallbacks;
    - the rotating theme;
    - stable through the day, with the reading slot following a later passage;
    - swap, including the fallback to a theme;
    - no repeat within 14 days;
    - the word starter when no hook matches;
    - four weeks without a repeat and every theme within five days;
  - the weekly summary numbers and the focus line;
  - the talk-log sums and the 2-day note;
  - "try this", in its full order;
  - the content check;
  - backup with and without talks, and undo.
- **Rendered tests:**
  - Talk: cards expand; swap persists; Share calls `navigator.share` and falls back to the clipboard; logging with minutes, a double tap, Undo and its timeout;
  - Week summary and its toggle; Share the week;
  - the top line and its shortcut landing on 聊一聊;
  - the Progress section order;
  - the backup notice for a pre-v7 file.
- **WebKit screenshots** of the top line, Talk (a card open) and Week summary at the phone and iPad sizes, with tap targets of 44 px and no sideways scroll.

## 8. Out of scope

Push notifications or reminders outside the app. Syncing across devices (the next project, two-way sync). Recording or scoring the conversation. A child-facing talk feature. Listening clips, 看图说话 and 造句 (later projects).
