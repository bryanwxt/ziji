# ZiJi parent loop: daily talk prompts and a weekly summary — design

Date: 2026-10-12 · After the lesson overhaul (PRs #1–#4) · Base: main at fe17c74

## 1. Why

The research report (`reports/Primary Chinese outcomes strategy.md`) ranks **daily Mandarin conversation with a responsive adult** as the top strategy for oral and listening, which together are 35% of PSLE 华文. Among Singaporean Chinese 6-year-olds, Mandarin spoken with parents predicted oral proficiency, while literacy activities did not. An app cannot have that conversation with him. It *can* organise it.

The report's P1 "parent loop" has two parts:
- three Mandarin conversation prompts a day;
- a short weekly summary of what got stronger, what is shaky, and what to focus on.

**Success:**
- Every day the parent has three ready conversation starters tied to what he is learning, and can share them to their phone.
- The parent logs a talk in one tap.
- Once a week, a two-minute summary puts his app progress next to the family's talk time.

## 2. Decisions (parent, 2026-10-12)

| Question | Decision |
|---|---|
| Who talks | **The parent, who is fluent.** Prompts give topics, follow-ups and target sentence patterns, not scripts |
| Where | **A new 「聊一聊 Talk」 tab in the PIN-gated parent area, plus Share** through the iPad share sheet. No accounts and no server |
| Tracking | **One tap 「✓ 聊了」 with optional minutes.** It is never shown to the child and has no streak |
| Content approach | **A written topic bank plus his week's words.** Rejected: generating prompts from his words only (too thin), and the topic bank only (not tied to his learning) |

## 3. Content: the talk-prompt bank

`src/content/talkPrompts.ts` holds **about 80 conversation starters** across the PSLE conversation themes: 家庭 family, 学校 school, 朋友 friends, 食物 food, 节日 festivals, 新加坡 Singapore, 环境 environment, 科技 technology, and 心情与品德 feelings and values.

```ts
interface TalkPrompt {
  id: string;               // 't01'…
  theme: TalkTheme;
  open: string;             // the opening question, Chinese, P2-level
  en: string;               // one-line English gloss for the parent
  followUps: string[];      // 2–3 open follow-ups (什么时候？为什么？如果…你会怎么做？)
  pattern: string;          // the sentence pattern to nudge toward, e.g. '我觉得…因为…'
  sample: string;           // what a P2 answer could sound like (1–2 short sentences)
  hooks?: string[];         // characters/words this starter is built around (for word-based picking)
}
```

- **Writing rules:**
  - The questions are open (no yes/no-only questions) and warm, about his own life.
  - The patterns rotate through 我觉得…因为…, 先…然后…最后…, 如果…就…, 虽然…但是…, 有时候…有时候…, and 我最喜欢…因为….
  - The samples use characters a P2 child knows.
- **Content check** (`scripts/check-content.ts` or a test):
  - every starter has `open`, `en`, at least 2 `followUps`, `pattern` and `sample`;
  - ids are unique;
  - every theme has at least 6 starters;
  - every Han character is in `builtin.json` at HSK level ≤ 3 or on the 欢乐伙伴2.0 lists up to 二下, with a short allow-list for theme words.

## 4. Daily picks

`src/talk/pick.ts`, a pure module, picks **3 prompts per day**:

1. **His word.** It takes a word from his **last 7 days of new words** (introduced in a lesson). It prefers a starter whose `hooks` include that word or one of its characters. When no starter matches, it uses a **word starter**, generated from a fixed template with the word's gloss and the sentence-bank example: 「今天学了『借』（to lend）。你借过什么东西给别人？谁借过东西给你？」 with follow-ups and the pattern 我…给…. The generated wording lives in a small template set in the same module, not hand-written per word.
2. **His 朗读 passage.** It uses the current passage's meaning question, opened up into a conversation: 「《小马》里，谁帮了小马？如果是你，你会怎么帮它？」 It falls back to a theme starter when 朗读 is off or there is no current passage.
3. **A rotating theme.** It is a theme starter whose theme hasn't been used in the last 6 days, and the least recently shown within that theme.

- **Stable through the day:** picks are seeded from the date and stored once made (`talkDay: { date, ids: string[] }` in settings or a small store), so the tab shows the same three all day.
- **「换一个」:** replaces one card with the next candidate of the same kind and stores the swap.
- **Never repeats** a starter shown in the last 14 days, unless the bank for that kind runs out.

## 5. The 「聊一聊 Talk」 tab

The tab sits in the parent area after Listen & confirm and has two sections.

**Today**
- Three cards. Each shows `open`, its English line, and its kind label: 今天的新词 · 朗读 · 话题.
- Tapping a card expands its follow-ups, the pattern (「试试用：我觉得…因为…」) and the sample answer.
- 「换一个」 on each card.
- **Share** sends today's three prompts as plain text: Chinese open question, follow-ups and pattern, each with an English line. It uses `navigator.share`, and falls back to copying to the clipboard with a "Copied" note when sharing is unavailable.
- **「✓ 聊了 We talked」** with optional chips: 5, 10 or 15 min. It can be logged more than once a day, and minutes add up. "Undo last" is offered for 10 s.

**This week** (Monday to Sunday, the current week, with a 「上周」 toggle for last week)
- **Talk:** days talked and total minutes.
- **His app progress:** characters that newly reached read, write or say this week (from main's passed rungs, read/write/say), lessons done, and 朗读 passage days.
- **Shaky words:** up to 5 of the words he missed most this week (from review logs).
- **朗读:** this week's passage(s), and how he did on the meaning question (right or missed).
- **Waiting for you:** Say and read-aloud takes in Listen & confirm, with a link.
- **Focus next week:** one line built from the shakiest area. Examples: 「多聊 食物 — 这周的新词：饿、饱、甜」, or 「多读：他这周的朗读题答错了，问问他《小马》的故事」.
- **Share the week:** the same summary as plain text.

**Overview tile:** a small line, "Talk: 3 days · 25 min this week", and a gentle note when no talk has been logged for 2 days ("No talk logged since Tue"). It is never shown to the child.

## 6. Data

- **Talk log:** a new object store (or reuse of an existing log store, whichever matches the db pattern) holding entries `{ id, at: number, minutes?: number }`. It is included in backup and restore.
- **The day's picks:** `talkDay`, stored as in §4.
- **No migration.** A db version bump adds the store, following the existing db upgrade pattern.

## 7. Testing

- **Unit tests:**
  - picking: one from his words, one from 朗读 (with the fallback), one rotating theme; stable through the day; swap; no repeat within 14 days; the generated word starter when no hook matches;
  - the weekly summary numbers and the focus line;
  - the talk-log sums;
  - the content check.
- **Rendered tests:**
  - the tab: cards expand; Share calls `navigator.share`, and falls back to the clipboard;
  - logging with minutes and undo;
  - the week toggle;
  - the Overview tile and the 2-day nudge;
  - backup includes talk logs.
- **WebKit screenshots** of the tab (Today and This week) at iPad and phone sizes.

## 8. Out of scope

Push notifications or reminders outside the app. Syncing across devices. Recording or scoring the conversation. A child-facing talk feature. Listening clips, 看图说话 and 造句 (later projects).
