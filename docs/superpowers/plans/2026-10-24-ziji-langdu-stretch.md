# 朗读 That Stretches Him Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 朗读 stretches him:
- passages at 85–92% readable, from a library 60 passages deeper (二下 15, 三上 25, 三下 20), reaching two terms past his class;
- three varied, guess-proof questions a read from six per passage, judged 'well' at 2 of 3;
- a passage read well rests 21 days, then 45, then retires; one not read well comes back in 3 days;
- the first listen is slower (0.8×, 700 ms between sentences);
- the parent sees each passage's last questions (`2/3`) and his right share by kind of question.

**Architecture:** The pure rules stay in `src/langdu/`:
- `pick.ts` (band, fresh-first order) and `level.ts` (reach, `termReadable`): §3, §6.
- `history.ts`: the rest ladder, `readHow` from answers, and what a read asked (`lastHow`, `lastSet`, `answers`): §5, §6, §8.
- `questions.ts`: `questionSet` / `withQuestions`, the three a read asks: §5.
- `useModelReader.ts`: a `Pace` (rate, gap) per read: §7. `speak()` gains `rate` (`src/audio/speech.ts`, `clipPlayer.ts`).
- `library.ts`: `qs`, `kindShares`, `answersLine`: §8.

Content lives in data files merged by id:
- passages: `src/content/passages/二下.json`, `三上.json`, `三下.json` (p74–p133);
- questions: one `src/content/questions/q-*.ts` file per content task, listed in `QUESTION_BATCHES` (`src/content/passageQuestions.ts`);
- `src/content/questions/legacy.ts` holds the old 2-question entries until each batch replaces them; Task 18 deletes it.

`scripts/check-content.ts` (run by `scripts/check-content.test.ts`) is the content gate, and `scripts/langdu-report.ts` shows a writer each passage numbered with its problems. There is no DB version change: history lives in kid state, and `Recording` gains an optional `answers`.

**Tech Stack:** Preact 10, TypeScript 5.9, Vitest 4 (jsdom, fake-indexeddb), pinyin-pro (`npm run pinyin`), playwright-core 1.52 (WebKit) for the stage cases.

**Spec:** `docs/superpowers/specs/2026-10-24-ziji-langdu-stretch-design.md` (approved 2026-10-24), building on `docs/superpowers/specs/2026-10-15-ziji-langdu-content-design.md`. Read both first: every § below refers to the 2026-10-24 spec unless it says otherwise.

## Global Constraints

- Band: `BAND_LOW` 0.85, `BAND_HIGH` 0.92, `BAND_AIM` 0.88. Above 0.92 is "easy" (only when nothing in band is left). Under 0.85 is never offered unless it is a parent text.
- Reach: built-in passages up to **two** terms past his class term.
- New passages: 二下 15 (p74–p88), 三上 25 (p89–p113), 三下 20 (p114–p133); 80–140 characters, 4–8 sentences; at least two linking patterns of 因为…所以, 虽然…但是, 先…然后…最后, 如果…就, 一边…一边, 不但…而且; at most 4 生词; fit for a reader at its own term in 0.80–0.95; the term rule, the word gate, no 儿化, no duplicates.
- Questions: `{ q, choices: [4 strings], answer: 0|1|2|3, kind, sentence? , sentences? }`, `kind` ∈ why, word, order, main, fact. `sentence` for fact/word/order; `sentences: [i, j]` for why/main. Six per own passage and storybook chunk: at least one of each kind but `fact`, at most 2 `fact`.
- Guess-proof: every wrong choice names something in the passage; choice lengths within 3; no (content) character of the answer in the question; the answer is never the passage's most frequent word; no answer position more than twice in 6; a why/main answer shares at most 60% of its characters with any one sentence.
- Per read: 3 questions, kinds not used in the previous read where it can, at most one `fact`, never the previous read's set. Parent texts keep their own question (0–1 today), 3 or 4 choices.
- `readHow`: 'well' at 2 of 3 or better; 'not-well' at 0 or 1; 'extra' unchanged.
- Rest: 'well' → 21, then 45, then retire; 'not-well' → 3. `GAP_DAYS` (3), story parts in order and 下一篇 unchanged. A due 'not-well' passage comes before a new one; the fresh/due alternation (`lastKind`) applies only to those.
- First listen: `MODEL_RATE` 0.8 with `SENTENCE_GAP_MS` 700. Tap-to-replay, 听老师的 and the miss read-back: 0.9×, no gap. Other speech in the app is unchanged. 开始朗读 still comes alive after the first sentence or 10 s.
- Parent: `Qs 2/3` per passage's last read; a line for the last 14 days: 「为什么 4/7 · 词义 5/6 · 顺序 3/5 · 主要意思 2/4 · 事实 6/6」, the weakest marked. `PassageHistory.answers` keeps the last 30. **No DB version change.**
- Kid-facing text:
  - No 儿化 (`src/noErhua.test.ts`; the content checks hold passages and questions to it too) and no emoji in child source (`src/childEmoji.test.ts`).
  - Every `speak()` passes a `reading` or is listed in `NEVER_LONE` (`src/audio/loneReading.test.ts`).
  - New child lines: 「下一题」 (button) and the count 「1/3」.
- The parent area keeps English labels and may scroll. Child screens stay one screen. Layout changes are checked in **WebKit** through the stage cases (`npx tsx scripts/stage-cases.ts`), not only Chromium.
- Commit after each task with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy without the parent's go-ahead in chat.

## Rulings on the spec

1. **The fit window (§4).** "A reader at its own term" is a reader who has finished it: `termReadable(term)`, his book's 识读字 through the term. With the term rule (≥ 90% by its term) the window is in effect 0.90–0.95, so 5–10% of each new passage lies beyond its term's lists. The existing 73 own passages sit at 1.00 by their terms; that is what makes the new ones the stretch.
2. **Characters in a question.** The content spec's "his book's lists through the passage's term" made 一下 passages unaskable (no 哪, 意思, 主要). Questions are read by a child at 二下 or later, so they may use `allowedChars` through the later of the passage's term and 二下, plus 意思 and 题 (the pinyin fade shows them with pinyin). The guess-proof "no characters of the answer in the question" keeps the content spec's exception for function characters (的了是在…我你他), and a word question's quoted word.
3. **"Each wrong choice names something in the passage"** is checked as: it holds a non-function character of the passage, or appears in it word for word. **"Matching words doesn't single out the answer"** adds: an answer found word for word in the passage has at least two wrong choices found word for word too.
4. **Recorded clips (§7).** Clips play through Web Audio (`AudioBufferSourceNode`), not `HTMLAudioElement`, so there is no `preservesPitch`: `speak({ rate })` sets `playbackRate` on each source node, and a slowed clip is a little lower. Passage sentences have no clips today (the clip inventory has no passages), so the model is the iPad voice at `rate × 0.8`; the clip path matters only if passages are recorded later (out of scope, §10).
5. **听老师的 on Compare** is a replay: 0.9×, no gap. A tap on a sentence *during* the first read-through reads on at the first-listen pace. The parent's Listen & confirm model is unchanged (1×).
6. **The order a read's three are asked** is why, main, order, word, fact: the first is the one 「读的时候想一想」 shows before he reads, so it is the deepest.
7. **Parent texts (§5)** keep the editor and the store as they are (one optional 3-choice question); the type allows 3 or 4 choices. A parent text's answers have no kind: they count for `readHow` (its one question right is 'well') but not in the by-kind line.
8. **History from before this change** has no `lastHow`; it waits behind new passages like a passage read well (a due 'not-well' passage needs `lastHow: 'not-well'`). `restFromReview` (≥ 2 parent marks) sets `lastHow: 'not-well'`, so a passage he struggled with comes first.
9. **`Recording.meaning`** stays readable on old takes. New takes keep `answers`; the week summary counts a take 'right' when its answers are judged 'well'.
10. **Talk's shared reading** prefers a `fact` question for its 谁 line and a `why` question for its 为什么 line when the passage has kinds.

## Review Focus

1. **His history saved before this change** (rest 7 or 18, no `lastHow`). He expects to keep meeting new passages, not a run of old revisits. Pinned in Task 3 ("a history from before 2026-10-24 … waits behind new passages").
2. **A passage still on its two older questions** (between content batches). Both are asked, and the read is 'well' only with both right (2 of 2; 1 of 2 is below two thirds). Pinned in Task 3 (`readHow`) and Task 4 ("an older two are both asked").
3. **A double tap on 下一题.** He expects the next question, not the one after it. Pinned in Task 7 ("a double tap on 下一题 moves on once").
4. **No iPad voice at all** (no Chinese voice installed). The first listen must still reach the end, pauses and all, so 开始朗读 and 下一篇 come alive. Pinned in Task 6 ("no voice at all").
5. **Leaving the step in the 700 ms pause.** Nothing more may be said after he leaves. Pinned in Task 6 ("leaving in the pause says nothing more").

---

## File map

| Path | Responsibility |
|---|---|
| `src/types.ts` | `QuestionKind`, `PassageQuestion` (4 choices), `ParentQuestion`, `AskedQuestion`, `PassageAnswer`, `TakeAnswer`; `PassageHistory.lastHow/lastSet/answers`; `Recording.answers` |
| `src/content/passageQuestions.ts` | `QUESTION_BATCHES` merged into `PASSAGE_QUESTIONS`; re-exports `LEGACY_QUESTIONS` |
| `src/content/questions/legacy.ts` (moved from `passageQuestions.ts`) | the old 2-question entries, until replaced |
| `src/content/questions/q-*.ts` (new, one per content task) | six questions per passage |
| `src/content/passages/二下.json`, `三上.json`, `三下.json` (new) | the 60 stretch passages |
| `src/content/index.ts` | `STRETCH_PASSAGES`, `PASSAGES` order |
| `scripts/check-content.ts` | the question rules, `checkQuestionCoverage`, `checkStretchPassages`, `linksIn`, `stretchCounts` |
| `scripts/langdu-report.ts` (new) | the writer's view of passages, numbered, with their problems |
| `src/langdu/level.ts` | `termReadable`, `REACH_TERMS` |
| `src/langdu/pick.ts` | band constants, fresh-first order |
| `src/langdu/history.ts` | `MISS_REST`, `WELL_LADDER`, `ANSWERS_KEPT`, `readHow`, `afterRead(…, asked)`, migration |
| `src/langdu/questions.ts` | `questionSet`, `withQuestions`, `shuffleQuestion` (3 or 4 choices) |
| `src/langdu/pool.ts` | legacy fallback; `asked` / `askedSet` |
| `src/audio/speech.ts`, `src/audio/clipPlayer.ts` | `speak({ rate })` |
| `src/langdu/useModelReader.ts` | `Pace`, `FIRST_LISTEN`, `REPLAY`, the gap |
| `src/activities/langdu/LangduStep.tsx`, `src/styles.css` | three questions in turn, read-back, 下一题 |
| `src/app/SessionScreen.tsx` | `withQuestions`, `readHow` from answers, `afterRead` with what was asked, `Recording.answers` |
| `src/langdu/library.ts`, `src/parent/LibraryList.tsx`, `src/parent/ListenPanel.tsx`, `src/talk/week.ts` | §8 |
| `src/talk/pick.ts`, `src/talk/load.ts`, `src/parent/PassagesPanel.tsx` | types; talk prefers kinds |
| `scripts/review-passages.ts` | six questions per passage in the parent's CSV |
| `scripts/stage-cases/langdu.ts` (new), `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | §9 WebKit cases |

## Content rules (every content task, Tasks 9–17)

`scripts/check-content.ts` enforces all of these; `npx tsx scripts/langdu-report.ts <ids>` prints each passage with its sentences numbered from 0 (the numbers `sentence` and `sentences` use), its term, length, fits and linking patterns, and every problem found. Write, run the report, fix what it flags, repeat. A content task is done when the report prints `0 problems` for its passages and the vitest gate passes.

### Questions: six per passage

| Kind | What it asks | Miss reads back |
|---|---|---|
| `why` | a reason or feeling **never stated in one sentence** (he must join two) | `sentences: [i, j]`, the two that support it |
| `word` | what a word means **in this passage**; the question quotes the word in “” | `sentence`: the one with the word |
| `order` | what happened first, next, last, or after something | `sentence`: the one that answers it |
| `main` | the main idea or the best title (「这个故事主要说什么？」 or 「哪一个题目最好？」) | `sentences: [i, j]` |
| `fact` | who, what or where, answered by one sentence | `sentence` |

1. **Six**, all different; at least one each of `why`, `word`, `order`, `main`; at most two `fact`. The usual shape is why, word, order, main and two more (a second fact, why or order).
2. **Asks:** each `q` contains 谁, 哪, 什么 or 怎么 (为什么, 什么样, 怎么样 count).
3. **Choices:** four, all different. `answer` is the right one's index in the stored order (the step shuffles at each showing). Across the six, no index is the answer more than **twice** (spread them 0–3).
4. **Characters:** every Han character of `q` and the choices is in the passage, or in his lists through the later of the passage's term and 二下 (`questionChars`), or one of 意思题. The report names any that are not; swap the word.
5. **Every wrong choice names something in the passage**: it holds a character of the passage that is not a function character, or appears in the passage word for word. Wrong choices are plausible and clearly wrong.
6. **An answer found word for word in the passage** needs at least two wrong choices found word for word too. Otherwise paraphrase the answer (「坐着车」, not 「坐车」).
7. **Lengths:** choice lengths (Han characters) within 3 of each other.
8. **No giveaway:** no character of the answer in the question, except the function characters 的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有, and in a `word` question the quoted word's own characters. A `word` answer never contains the quoted word. 「哪一个题目最好？」 holds 好: an answer with 好 needs 「这个故事主要说什么？」 instead.
9. **Never the most frequent word:** the answer is not `topWord(text)` (the report flags it).
10. **why/main are not copies:** at most 60% of the answer's characters are in any one sentence. Paraphrase: 「我说了新年好话」, not 「我向婆婆拜年」.
11. **Grammar gives nothing away:** if the answer starts with 很 or 在, ends with 了 or 的, or is counted (一本…, 三十个…), at least one wrong choice does the same; and if every wrong choice does, so does the answer.
12. **No 儿化** (一会, not 一会儿).

### Worked example 1: p08 (一下, 4 sentences), all rules met

```
p08 一下 《看星星》
  0  晚上，天上有很多星星。
  1  我和爷爷坐在门口看星星。
  2  爷爷说：“星星很远很远。”
  3  我想：“我长大了，要坐飞机去看星星！”
```

```ts
  p08: [
    { q: '我为什么想坐飞机去？', choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远', '门口看不见星星'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '爷爷说的“很远很远”，是什么意思？', choices: ['一点也不远', '非常非常远', '有一点远', '就在门口'], answer: 1, kind: 'word', sentence: 2 },
    { q: '我和爷爷在门口做了什么以后，我才想坐飞机？', choices: ['看星星', '坐飞机', '长大了', '吃晚饭'], answer: 0, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['爷爷的新飞机', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'], answer: 3, kind: 'main', sentences: [1, 3] },
    { q: '我们坐在哪里？', choices: ['门口', '天上', '飞机', '星星'], answer: 0, kind: 'fact', sentence: 1 },
    { q: '谁说星星很远？', choices: ['我', '爷爷', '星星', '飞机'], answer: 1, kind: 'fact', sentence: 2 },
  ],
```

Why it passes: the why answer joins 2 and 3 and shares 43% with sentence 2 (「星星很远很远」 would copy it: 100%); 「看星星」 is in the text word for word, so two wrong choices are too (坐飞机, 长大了); 门口 the same (天上, 飞机, 星星); 星星 is the passage's most frequent word, so no answer is 星星; answers sit at 2, 1, 0, 3, 0, 1.

### Stretch passages

1. **Ids and files:** p74–p88 in `src/content/passages/二下.json`, p89–p113 in `三上.json`, p114–p133 in `三下.json`, in id order. Each is `{ "id", "title", "text", "term", "source": "ziji", "words": [{ "text", "gloss" }] }`.
2. **Length:** 80–140 Han characters in 4–8 sentences (a sentence ends at 。！？; a quote's closing 」” goes with it).
3. **Level:** `term` is the term it levels at: at least 90% of its characters are on his book's 识读字 lists through `term`, and under 90% through the term before (the report prints "levels at"). Its **fit at its own term is 0.80–0.95**: since the term rule already gives ≥ 0.90, 5–10% of its characters lie beyond the term's lists. The report prints the fit and "beyond <term>: …" (characters a reader at the term cannot read yet): those are the stretch, and the 生词 cover the main ones. Built-in characters with no school term (拥挤 慌 镇) are good stretch characters.
4. **Connected:** at least two different linking patterns of 因为…所以, 虽然…但是, 先…然后…最后, 如果…就, 一边…一边, 不但…而且. Two-part ones within one sentence; 先…然后…最后 may run across sentences.
5. **生词:** 1–4. Each is in the text, has a character beyond the previous term's lists, and a gloss that passes `glossProblems` (at most 4 English words, no Chinese) and equals its `kidGloss` when it has one (the report says which).
6. **Words:** no blocked word; a dictionary word of two characters or more must pass the word gate (`isChildWord`) or be a 生词. The report names any (「原地: not a word for a P2 child (HSK 7)」): rephrase.
7. **No duplicates:** no text equal to another passage's, and no sentence opening (first 8 Han characters) shared with another of ours.
8. **Every character a built-in one** (`BUILTIN`), and **no 儿化**.
9. **Kinds of text**, per task as listed: short stories with a problem and how it is solved; simple factual pieces (animals, plants, weather, Singapore places and festivals); fables or everyday scenes with a lesson. Singapore usage and settings (组屋, 巴刹, 小贩中心, 地铁, 学校, 华人新年, 中秋节, 屠妖节, 开斋节), safe for a seven-year-old, no real people's names.
10. **After writing:** `npm run pinyin` snapshots each sentence's pinyin (`src/content/sentencePinyin.json`); the content gate fails until it is run.

### Worked example 2: p74 (二下), all rules met, with its six

```json
  {
    "id": "p74",
    "title": "在巴刹走散了",
    "text": "星期六早上，奶奶带我去巴刹买菜。巴刹里人很多，又热闹又拥挤。我一边走，一边看两旁的水果摊，走着走着，奶奶不在我身边了！我心里很慌张，差一点哭了出来。但是我想起妈妈说过：“如果找不到大人，就站着别走，等大人来找你。”所以我镇定下来，站在鱼摊旁边，没有乱跑。过了一会，奶奶果然找到了我。她摸摸我的头说：“你真聪明！”",
    "term": "二下",
    "source": "ziji",
    "words": [{ "text": "拥挤", "gloss": "crowded" }, { "text": "慌张", "gloss": "flustered" }, { "text": "镇定", "gloss": "calm" }]
  }
```

```
p74 二下 《在巴刹走散了》 131 characters · levels at 二下 · fit 0.93 at 二下, 0.88 at 二上 · links 如果…就 一边…一边
  beyond 二下: 刹拥挤慌差如镇乱 · beyond 二上: 刹闹拥挤摊慌张差但如所镇乱聪
  0  星期六早上，奶奶带我去巴刹买菜。
  1  巴刹里人很多，又热闹又拥挤。
  2  我一边走，一边看两旁的水果摊，走着走着，奶奶不在我身边了！
  3  我心里很慌张，差一点哭了出来。
  4  但是我想起妈妈说过：“如果找不到大人，就站着别走，等大人来找你。”
  5  所以我镇定下来，站在鱼摊旁边，没有乱跑。
  6  过了一会，奶奶果然找到了我。
  7  她摸摸我的头说：“你真聪明！”
```

```ts
  p74: [
    { q: '奶奶为什么说我聪明？', choices: ['我买了很多水果', '我在鱼摊帮了忙', '我自己找到了奶奶', '我记住了妈妈的话'], answer: 3, kind: 'why', sentences: [4, 5] },
    { q: '“镇定下来”是什么意思？', choices: ['心里不再慌张', '站到鱼摊上面', '跑去找奶奶', '大哭起来'], answer: 0, kind: 'word', sentence: 5 },
    { q: '下面哪件事最先发生？', choices: ['我站在鱼摊旁边', '奶奶找到了我', '奶奶和我去买菜', '奶奶摸摸我的头'], answer: 2, kind: 'order', sentence: 0 },
    { q: '哪一个题目最好？', choices: ['巴刹的水果摊', '不慌不乱等奶奶', '奶奶买鱼', '我在巴刹哭了'], answer: 1, kind: 'main', sentences: [4, 5] },
    { q: '奶奶带我去哪里买菜？', choices: ['巴刹', '鱼摊', '水果摊', '身边'], answer: 0, kind: 'fact', sentence: 0 },
    { q: '我站在什么地方等？', choices: ['水果摊', '巴刹', '奶奶身边', '鱼摊旁边'], answer: 3, kind: 'fact', sentence: 5 },
  ],
```

Why it passes: a problem story (lost in the market) and how he solved it; 131 characters in 8 sentences; 如果…就 and 一边…一边; 9 of 131 characters beyond 二下 (fit 0.93) while 0.88 by 二上 keeps its term at 二下; 拥挤, 慌张 and 镇定 each hold a character beyond 二上 and the passage avoids 原地 (HSK 7) by saying 「站着别走」.

---
### Task 1: The 4-choice question shape and its checks (§5)

**Files:**
- Modify: `src/types.ts` (the `PassageQuestion` block, `ParentPassage.question`)
- Move: `src/content/passageQuestions.ts` → `src/content/questions/legacy.ts`; Create: a new `src/content/passageQuestions.ts`
- Modify: `src/langdu/pool.ts`, `src/langdu/questions.ts` (`shuffleQuestion`, `questionFor`), `src/langdu/sentences.ts` (`answeringSentence`'s type)
- Modify: `src/parent/PassagesPanel.tsx`, `src/talk/pick.ts` (`readingCard`), `src/talk/load.ts` (`todaysPassage`)
- Modify: `scripts/check-content.ts` (the question section)
- Test: `scripts/check-content.test.ts`, `src/langdu/pool.test.ts`, `src/langdu/questions.test.ts`, `src/talk/pick.test.ts`, `src/talk/share.test.ts`, `src/talk/load.test.ts`, `src/parent/talkSection.test.tsx`, `src/app/langduSession.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `type QuestionKind = 'why' | 'word' | 'order' | 'main' | 'fact'`
  - `interface PassageQuestion { q: string; choices: [string, string, string, string]; answer: 0 | 1 | 2 | 3; kind: QuestionKind; sentence?: number; sentences?: [number, number] }`
  - `interface ParentQuestion { q: string; choices: [string, string, string] | [string, string, string, string]; answer: 0 | 1 | 2 | 3; sentence?: number }`; `type AskedQuestion = PassageQuestion | ParentQuestion`; `interface PassageAnswer { kind: QuestionKind; correct: boolean; at: string }`
  - `src/content/passageQuestions.ts`: `type QuestionBatch = Readonly<Record<string, readonly PassageQuestion[]>>`, `QUESTION_BATCHES: readonly QuestionBatch[]`, `PASSAGE_QUESTIONS: QuestionBatch`, re-exported `LEGACY_QUESTIONS: Readonly<Record<string, readonly ParentQuestion[]>>`
  - `readingPool(parent, builtins, reader, questions = PASSAGE_QUESTIONS, legacy = LEGACY_QUESTIONS)`; `ReadingPassage.questions?: readonly AskedQuestion[]`, `question?: AskedQuestion`
  - `shuffleQuestion<Q extends AskedQuestion>(q: Q, rng: Rng): Q`
  - `scripts/check-content.ts`: `KINDS`, `QUESTIONS_PER_PASSAGE` (6), `MAX_FACT` (2), `CHOICE_SPREAD` (3), `MAX_AT_POSITION` (2), `COPY_SHARE` (0.6), `QUESTION_FLOOR` ('二下'), `FRAME_CHARS` ('意思题'), `questionChars(term): Set<string>`, `questionProblems(p, q, known?)`, `checkPassageQuestions(passages, questions)`, `checkQuestionCoverage(passages, batches, legacy)`

- [ ] **Step 1: Move the old questions aside**

```bash
mkdir -p src/content/questions
git mv src/content/passageQuestions.ts src/content/questions/legacy.ts
```

In `src/content/questions/legacy.ts`, replace everything above the first entry (`  p01: [`) with:

```ts
// The two 3-choice questions each built-in passage had before 2026-10-24 (spec 2026-10-15 §6), kept only until its six new
// questions are written (spec 2026-10-24 §5): a passage with no new questions yet is asked these, as a parent text's are. Each
// content task deletes the entries it replaces; the last one deletes this file.
import type { ParentQuestion } from '../../types';

export const LEGACY_QUESTIONS: Readonly<Record<string, readonly ParentQuestion[]>> = {
```

- [ ] **Step 2: Write the failing tests**

In `scripts/check-content.test.ts`, change the imports:

```ts
import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS, QUESTION_BATCHES } from '../src/content/passageQuestions';
```

```ts
import { checkContent, checkOwnPassages, checkPassageQuestions, checkQuestionCoverage, checkTalkPrompts, p2Readable, questionProblems, topWord, wordProblems } from './check-content';
```

and replace the whole `describe('meaning questions (spec 2026-10-15 §6)', …)` block with:

```ts
describe('questions (spec 2026-10-24 §5)', () => {
  it('every built-in passage with its six passes every rule', () => {
    expect(checkPassageQuestions(PASSAGES, PASSAGE_QUESTIONS)).toEqual([]);
  });
  it('every built-in passage has its six, or its two older ones until its batch is written; never both, never neither', () => {
    expect(checkQuestionCoverage(PASSAGES, QUESTION_BATCHES, LEGACY_QUESTIONS)).toEqual([]);
  });
  // the plan's worked example 1 (2026-10-24 plan, Content rules): p08 with six questions that pass every rule
  const p08 = PASSAGES.find((p) => p.id === 'p08')!;
  const SIX: PassageQuestion[] = [
    { q: '我为什么想坐飞机去？', choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远', '门口看不见星星'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '爷爷说的“很远很远”，是什么意思？', choices: ['一点也不远', '非常非常远', '有一点远', '就在门口'], answer: 1, kind: 'word', sentence: 2 },
    { q: '我和爷爷在门口做了什么以后，我才想坐飞机？', choices: ['看星星', '坐飞机', '长大了', '吃晚饭'], answer: 0, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['爷爷的新飞机', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'], answer: 3, kind: 'main', sentences: [1, 3] },
    { q: '我们坐在哪里？', choices: ['门口', '天上', '飞机', '星星'], answer: 0, kind: 'fact', sentence: 1 },
    { q: '谁说星星很远？', choices: ['我', '爷爷', '星星', '飞机'], answer: 1, kind: 'fact', sentence: 2 },
  ];
  const [why, word, order, main, fact] = SIX as [PassageQuestion, PassageQuestion, PassageQuestion, PassageQuestion, PassageQuestion];
  const flags = (q: PassageQuestion) => questionProblems(p08, q);
  it('a fair six passes', () => {
    expect(checkPassageQuestions([p08], { p08: SIX })).toEqual([]);
  });
  it('shape: a known kind, what it asks, four different choices, the right one among them', () => {
    expect(flags({ ...fact, kind: 'who' as never })).toContain('p08 "我们坐在哪里？": kind who is not one of why word order main fact');
    expect(flags({ ...fact, q: '我们坐在门口吗？' })).toContain('p08 "我们坐在门口吗？": asks none of 谁 哪 什么 为什么 怎么样');
    expect(flags({ ...fact, choices: ['门口', '门口', '飞机', '星星'] })).toContain('p08 "我们坐在哪里？": needs four different choices');
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机'] as never })).toContain('p08 "我们坐在哪里？": needs four different choices');
    expect(flags({ ...fact, answer: 4 as never })).toContain('p08 "我们坐在哪里？": the right answer is not among the choices');
  });
  it('a miss reads one sentence (fact, word, order) or two (why, main), each a real one', () => {
    expect(flags({ ...fact, sentence: 9 })).toContain('p08 "我们坐在哪里？": answering sentence 9 is not one of its 4 sentences');
    expect(flags({ ...order, sentence: undefined })).toContain('p08 "我和爷爷在门口做了什么以后，我才想坐飞机？": answering sentence undefined is not one of its 4 sentences');
    expect(flags({ ...why, sentences: undefined })).toContain('p08 "我为什么想坐飞机去？": a why question needs two different supporting sentences of its 4');
    expect(flags({ ...main, sentences: [3, 3] })).toContain('p08 "哪一个题目最好？": a main question needs two different supporting sentences of its 4');
  });
  it('characters: from the passage, or his lists through the later of its term and 二下, or 意思/题目', () => {
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机', '鬱金香'] })).toContain('p08 "我们坐在哪里？": uses 鬱 in neither the passage nor the lists through 二下');
    expect(flags(word)).toEqual([]); // 意思: a frame word
  });
  it('every wrong choice names something in the passage; an answer found word for word has two wrong ones found too', () => {
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机', '学校'] })).toContain('p08 "我们坐在哪里？": the wrong choice 学校 names nothing in the passage');
    expect(flags({ ...fact, choices: ['门口', '飞机上', '星星上', '天上'] })).toContain('p08 "我们坐在哪里？": the answer is in the passage word for word, and fewer than two wrong choices are');
  });
  it('choice lengths within 3 characters', () => {
    expect(flags({ ...main, choices: ['爷爷', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'] })).toContain('p08 "哪一个题目最好？": choice lengths 2/7/7/9 differ by more than 3');
  });
  it("no character of the answer in the question (function characters aside; a word question's own word aside)", () => {
    expect(flags({ ...fact, q: '我们坐在哪个门里？' })).toContain('p08 "我们坐在哪个门里？": the question gives away 门 from its answer');
    expect(flags({ ...word, choices: ['一点也不远', '很远很远的', '有一点远', '就在门口'] })).toContain('p08 "爷爷说的“很远很远”，是什么意思？": the answer repeats the word it explains');
    expect(flags({ ...word, q: '爷爷说的“远方”，是什么意思？' })).toContain('p08 "爷爷说的“远方”，是什么意思？": a word question quotes (“…”) a word of the passage');
  });
  it("the answer is never the passage's most frequent word", () => {
    expect(topWord(p08.text)).toBe('星星');
    expect(flags({ ...fact, q: '我和爷爷看什么？', choices: ['星星', '门口', '飞机', '天上'], sentence: 1 })).toContain('p08 "我和爷爷看什么？": the answer 星星 is the passage\'s most frequent word');
  });
  it('a why or main answer copies no sentence: at most 60% of its characters from any one', () => {
    expect(flags({ ...why, choices: ['爷爷要坐飞机', '天上没有星星', '星星很远很远', '门口看不见星星'] })).toContain('p08 "我为什么想坐飞机去？": the why answer copies "爷爷说：“星星很远很远。”" (100% of its characters)');
  });
  it("the answer is not the only choice that fits the question's grammar", () => {
    expect(flags({ ...why, choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远了', '门口看不见星星'] })).toContain('p08 "我为什么想坐飞机去？": the answer alone is …了');
  });
  it('six a passage: every kind but fact, fact at most twice, no answer place more than twice, no repeats, no stray ids', () => {
    expect(checkPassageQuestions([p08], { p08: SIX.slice(0, 5) })).toContain('p08: 5 questions, expected 6');
    expect(checkPassageQuestions([p08], { p08: [...SIX.slice(0, 5), SIX[4]!] })).toContain('p08: the same question twice');
    expect(checkPassageQuestions([p08], { p08: [{ ...why, kind: 'fact', sentence: 2 }, ...SIX.slice(1)] })).toEqual(expect.arrayContaining(['p08: no why question', 'p08: 3 fact questions, at most 2']));
    expect(checkPassageQuestions([p08], { p08: SIX.map((q, i) => (i < 3 ? { ...q, choices: [q.choices[q.answer]!, ...q.choices.filter((_, j) => j !== q.answer)] as PassageQuestion['choices'], answer: 0 as const } : q)) })).toContain('p08: the answer is choice 1 in 4 questions, at most 2');
    expect(checkPassageQuestions([p08], { p08: SIX, x9: SIX })).toEqual(['x9: questions for no passage']);
  });
  it('coverage: six or the older two, never both or neither; a passage in one batch file only', () => {
    const p01 = PASSAGES.find((p) => p.id === 'p01')!;
    const old = [{ q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 }];
    expect(checkQuestionCoverage([p01, p08], [{ p08: SIX }], { p01: old })).toEqual([]);
    expect(checkQuestionCoverage([p01, p08], [{ p08: SIX }], { p01: old, p08: old })).toEqual(['p08: six new questions and its older ones (delete them from questions/legacy.ts)']);
    expect(checkQuestionCoverage([p01, p08], [{ p08: SIX }], {})).toEqual(['p01: no questions']);
    expect(checkQuestionCoverage([p08], [{ p08: SIX }, { p08: SIX }], {})).toEqual(['p08: questions in batch 1 and batch 2']);
  });
});
```

In `src/langdu/questions.test.ts`, type the two existing fixtures as parent-style questions and add a 4-choice case. Change the type import to `import { EMPTY_READING, type ParentQuestion, type PassageQuestion } from '../types';`, change `const q1: PassageQuestion =` and `const q2: PassageQuestion =` to `const q1: ParentQuestion =` and `const q2: ParentQuestion =`, and add inside `describe('shuffleQuestion', …)`:

```ts
  it('four choices: the right one stays right and visits every place (spec 2026-10-24 §5)', () => {
    const q4: PassageQuestion = { q: '小华为什么笑了？', choices: ['他赢了比赛', '球进了', '我帮了他', '他找到了球'], answer: 2, kind: 'why', sentences: [1, 3] };
    const places = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = shuffleQuestion(q4, mulberry32(seed));
      expect(s.choices[s.answer]).toBe('我帮了他');
      expect([...s.choices].sort()).toEqual([...q4.choices].sort());
      expect(s).toMatchObject({ kind: 'why', sentences: [1, 3] });
      places.add(s.answer);
    }
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });
```

In `src/langdu/pool.test.ts`, replace the test `"a built-in brings its questions; a parent text brings the parent's one, or none"` with:

```ts
  it("a built-in brings its six questions, else its two older ones; a parent text brings the parent's one, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const six = { q: '我爱谁？', choices: ['老师', '妈妈', '小马', '爸爸'] as [string, string, string, string], answer: 1 as const, kind: 'fact' as const, sentence: 0 };
    const b = (id: string) => ({ id, title: id, text: '我。', term: '一上', source: 'ziji' as const });
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [b('p01'), b('p02'), b('p03')],
      reader('我'),
      { p01: [six], p02: [] },
      { p01: [q], p02: [{ ...q, sentence: 0 }] },
    );
    expect(pool.map((p) => p.questions)).toEqual([[q], undefined, [six], [{ ...q, sentence: 0 }], undefined]);
  });
```

and in the test `'a built-in brings what the step shows …'` pass no legacy questions either: change `reader('爱我'), {}); // no questions` to `reader('爱我'), {}, {}); // no questions`.

The talk tests read built-in passages' questions; pin them so the content batches never move them. In `src/talk/pick.test.ts`, remove the `PASSAGE_QUESTIONS` import, change `import type { PassageQuestion } from '../types';` to `import type { ParentQuestion } from '../types';` (and every `PassageQuestion` in the file to `ParentQuestion`), add `type TalkPassage` to the `./pick` import, and replace the `P17` and `P01` constants with:

```ts
// two passages with the questions they had before 2026-10-24, fixed here so the content batches never move these tests
const P17: TalkPassage = { id: 'p17', title: '小马', questions: [
  { q: '小马为什么找不到家了？', choices: ['跑得很快', '在外面玩', '跑得很远'], answer: 2, sentence: 1 },
  { q: '牛爷爷做了什么？', choices: ['找到了小马', '带小马跑步', '给小马吃饭'], answer: 0, sentence: 2 },
] };
const P01: TalkPassage = { id: 'p01', title: '我的家', questions: [
  { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 },
  { q: '我家有什么人？', choices: ['哥哥和弟弟', '姐姐和妹妹', '哥哥和妹妹'], answer: 2, sentence: 0 },
] };
```

In `src/talk/share.test.ts`, remove the `PASSAGE_QUESTIONS` import, add after the imports:

```ts
import type { ParentQuestion } from '../types';

/** p17's questions before 2026-10-24, fixed here so the content batches never move this test. */
const P17_QUESTIONS: ParentQuestion[] = [
  { q: '小马为什么找不到家了？', choices: ['跑得很快', '在外面玩', '跑得很远'], answer: 2, sentence: 1 },
  { q: '牛爷爷做了什么？', choices: ['找到了小马', '带小马跑步', '给小马吃饭'], answer: 0, sentence: 2 },
];
```

and change `readingCard({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17! }, 1)` to `readingCard({ id: 'p17', title: '小马', questions: P17_QUESTIONS }, 1)`.

In `src/talk/load.test.ts`, add `import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';` after the last import, and change the `toMatchObject({ id: 'p17', title: '小马', questions: [expect.objectContaining({ q: '小马为什么找不到家了？' }), expect.anything()] })` assertion to:

```ts
    expect(await todaysPassage(db, s, NOW)).toEqual({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17 ?? LEGACY_QUESTIONS.p17 }); // its six, or its older two until they are written
```

In `src/parent/talkSection.test.tsx`, add `import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';`, change `import { wordStarter } from '../talk/pick';` to `import { readingCard, wordStarter } from '../talk/pick';`, and replace the four lines from `const q = reading.getByRole('button', { name: /牛爷爷做了什么？/ });` to the `(书上：跑得很远)` assertion with:

```ts
    // p17's six once written, its older two until then: the card is built from whichever it has
    const want = readingCard({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17 ?? LEGACY_QUESTIONS.p17! }, 0);
    const q = reading.getByRole('button', { name: new RegExp(want.open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    expect(q.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(q);
    expect(q.getAttribute('aria-expanded')).toBe('true');
    expect(reading.getByText(want.followUps[0]!, { exact: false }).textContent).toContain(`(书上：${want.answers![1]})`);
```

In `src/app/langduSession.test.tsx`, change `import { PASSAGE_QUESTIONS } from '../content/passageQuestions';` to `import { LEGACY_QUESTIONS } from '../content/passageQuestions';`, `PassageQuestion` to `ParentQuestion` (the type import and the `question` constant), and `PASSAGE_QUESTIONS.p01![1]!.q` to `LEGACY_QUESTIONS.p01![1]!.q`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx tsc --noEmit; npx vitest run scripts/check-content.test.ts src/langdu/pool.test.ts src/langdu/questions.test.ts`
Expected: FAIL. tsc: `PassageQuestion` has no `kind`, `QUESTION_BATCHES` and `checkQuestionCoverage` don't exist, `src/content/passageQuestions` is missing. Vitest: the files fail to load.

- [ ] **Step 4: Implement the shape**

In `src/types.ts`, replace the `PassageQuestion` interface and its comment (from `/** A 朗读 meaning question (spec 2026-10-12 §3)` to the line before `/** A school text the parent added`) with:

```ts
/** What a 朗读 question asks (spec 2026-10-24 §5): a reason or feeling never stated in one sentence; a word's meaning in this
 *  passage; what happened first, next or last; the main idea or best title; who, what or where, answered by one sentence. */
export type QuestionKind = 'why' | 'word' | 'order' | 'main' | 'fact';

/** A built-in passage's question (spec 2026-10-24 §5): four choices, the right one marked in the stored order (the step shuffles
 *  them). `sentence` (fact, word, order) is the passage's sentence (splitSentences) read again after a miss; `sentences` (why,
 *  main) are the two that support the answer, read again instead. */
export interface PassageQuestion {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  kind: QuestionKind;
  sentence?: number;
  sentences?: [number, number];
}

/** A parent's question on a school text (spec 2026-10-12 §3): three or four choices, no kind; answered where its right choice is
 *  unless `sentence` names one. Also the shape of the pre-2026-10-24 built-in questions (questions/legacy.ts). */
export interface ParentQuestion {
  q: string;
  choices: [string, string, string] | [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  sentence?: number;
}

/** A question as the step asks it: a built-in's or a parent's. */
export type AskedQuestion = PassageQuestion | ParentQuestion;

/** One answer to a built-in question (spec 2026-10-24 §8): kept on the passage's history, the last 30. */
export interface PassageAnswer { kind: QuestionKind; correct: boolean; at: string }

```

and in `ParentPassage` change `question?: PassageQuestion;` to `question?: ParentQuestion;`.

Create `src/content/passageQuestions.ts`:

```ts
// The built-in passages' questions (spec 2026-10-24 §5): six per passage in the 4-choice shape, at least one of each kind but
// `fact`, at most two `fact`. Written in batches (src/content/questions/*.ts, one file per content task) and merged here by
// passage id; scripts/check-content.ts holds every one to the guess-proof rules. Until a passage's six are written it keeps
// its two older questions (LEGACY_QUESTIONS), asked as a parent text's are.
import type { PassageQuestion } from '../types';
import { LEGACY_QUESTIONS } from './questions/legacy';

export type QuestionBatch = Readonly<Record<string, readonly PassageQuestion[]>>;

/** One entry per content task's file, in task order. */
export const QUESTION_BATCHES: readonly QuestionBatch[] = [];

export const PASSAGE_QUESTIONS: QuestionBatch = Object.assign({}, ...QUESTION_BATCHES);

export { LEGACY_QUESTIONS };
```

In `src/langdu/pool.ts`:
- change the imports to `import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';` and `import type { AskedQuestion, ParentPassage, Passage, PassageQuestion, ParentQuestion } from '../types';`;
- in `ReadingPassage`, change `questions?: readonly PassageQuestion[]; // asked in turn (questions.ts)` to `questions?: readonly AskedQuestion[]; // a built-in's six (or its legacy two), a parent text's one` and `question?: PassageQuestion; // this read's (withQuestion)` to `question?: AskedQuestion; // this read's (withQuestion)`;
- replace the `readingPool` signature line with:

```ts
export function readingPool(
  parent: ParentPassage[],
  builtins: Passage[],
  reader: Reader,
  questions: Readonly<Record<string, readonly PassageQuestion[]>> = PASSAGE_QUESTIONS,
  legacy: Readonly<Record<string, readonly ParentQuestion[]>> = LEGACY_QUESTIONS,
): ReadingPassage[] {
  const own = (id: string): readonly AskedQuestion[] | undefined => (questions[id]?.length ? questions[id] : legacy[id]?.length ? legacy[id] : undefined);
```

- and in the built-ins' map change `...(questions[id]?.length ? { questions: questions[id] } : {})` to `...(own(id) ? { questions: own(id) } : {})`.

In `src/langdu/questions.ts`, change the type import to `import type { AskedQuestion, ReadingHistory } from '../types';`, `questionFor`'s signature to `(qs: readonly AskedQuestion[] | undefined, turn: number): AskedQuestion | undefined`, and replace `shuffleQuestion` with:

```ts
/** The same question with its choices in a new order (three or four); `answer` follows the right one. */
export function shuffleQuestion<Q extends AskedQuestion>(q: Q, rng: Rng): Q {
  const order = shuffle(q.choices.map((_, i) => i), rng);
  return { ...q, choices: order.map((i) => q.choices[i]!), answer: order.indexOf(q.answer) } as Q;
}
```

In `src/langdu/sentences.ts`, change `import type { PassageQuestion } from '../types';` to `import type { AskedQuestion } from '../types';` and `answeringSentence`'s parameter type to `Pick<AskedQuestion, 'choices' | 'answer' | 'sentence'>`.

In `src/parent/PassagesPanel.tsx`, change the type import to `ParentQuestion`, `const question: PassageQuestion | undefined` to `const question: ParentQuestion | undefined`, and in `edit` replace the two lines that set the choices and the right one with:

```ts
    // the editor keeps three choices (spec 2026-10-24 §2: school texts unchanged); a fourth, never saved by it, is not shown
    setChoices(p.question ? [p.question.choices[0], p.question.choices[1], p.question.choices[2]] : NO_CHOICES);
    setRight(p.question && p.question.answer < 3 ? (p.question.answer as 0 | 1 | 2) : 0);
```

In `src/talk/pick.ts`, change the type import's `PassageQuestion` to `AskedQuestion`, `TalkPassage.questions` to `readonly AskedQuestion[]`, and in `readingCard` replace the `isWhy`, `answer` and `who` lines with:

```ts
  // a built-in's kinds (spec 2026-10-24 §5) say which is which; a parent's or an older question is read by its words
  const kindOf = (q: AskedQuestion) => ('kind' in q ? q.kind : undefined);
  const isWhy = (q: AskedQuestion) => kindOf(q) === 'why' || q.q.includes('为什么');
  const answer = (q: AskedQuestion): string | null => q.choices[q.answer] ?? null;
  const facts = p.questions.filter((q) => !isWhy(q));
  const who = facts.find((q) => q.q.includes('谁')) ?? facts.find((q) => kindOf(q) === 'fact') ?? facts[0];
```

In `src/talk/load.ts`, change the import to `import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';` and `questions: PASSAGE_QUESTIONS[id] ?? []` to `questions: PASSAGE_QUESTIONS[id] ?? LEGACY_QUESTIONS[id] ?? []`.

- [ ] **Step 5: Implement the checks**

In `scripts/check-content.ts`, add `QuestionKind` to the types import. Replace everything from `const ASKS = ['谁', '哪', '什么', '怎么'];` down to the line before `/** The passage's most frequent word` with:

```ts
const ASKS = ['谁', '哪', '什么', '怎么'];
/** Characters a question may share with its answer (spec 2026-10-15 §6 rule 3, kept by 2026-10-24 §5): grammar and pronouns, never content. */
export const FUNCTION_CHARS: ReadonlySet<string> = new Set(Array.from('的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有'));
/** Spec 2026-10-24 §5: six a passage, at least one of each kind but `fact`, at most two `fact`, four choices within 3
 *  characters of each other, no answer position more than twice, a why/main answer sharing at most 60% with any one sentence. */
export const QUESTIONS_PER_PASSAGE = 6;
export const KINDS: readonly QuestionKind[] = ['why', 'word', 'order', 'main', 'fact'];
const NEEDED: readonly QuestionKind[] = ['why', 'word', 'order', 'main'];
export const MAX_FACT = 2;
export const CHOICE_SPREAD = 3;
export const MAX_AT_POSITION = 2;
export const COPY_SHARE = 0.6;
/** The questions are read by a child at 二下 or later (spec 2026-10-24: his class), whatever the passage's term; the frame words
 *  of a word or main question (意思, 题目) are always allowed: the pinyin fade shows them with pinyin. */
export const QUESTION_FLOOR = '二下';
export const FRAME_CHARS = '意思题';
/** The characters a question on `p` may use besides the passage's own. */
export const questionChars = (term: string): Set<string> => {
  const at = MOE_TERMS.indexOf(term) < MOE_TERMS.indexOf(QUESTION_FLOOR) ? QUESTION_FLOOR : term;
  return new Set([...allowedChars(at), ...Array.from(FRAME_CHARS)]);
};
const PUNCT_RE = /[，。！？、；：“”‘’「」『』…—]/g;
const PARTICLES_RE = /[了吗吧呢的得着过啊呀]+$/u;
const han = (s: string) => Array.from(s).filter((ch) => HAN.test(ch));
const content = (s: string) => han(s).filter((ch) => !FUNCTION_CHARS.has(ch));

```

Keep `topWord` as it is. Replace everything from `/**\n * One question's problems (spec 2026-10-15 §6)` down to the line before `/** The words of a passage a P2 child may meet` with:

```ts
/**
 * One question's problems (spec 2026-10-24 §5): its shape and kind, the sentence(s) a miss reads again, its characters, and the
 * guess-proof rules. Its characters are ones he knows: each is in the passage he has just read, or on his book's lists through
 * the later of the passage's term and 二下 (questionChars).
 */
export function questionProblems(p: Passage, q: PassageQuestion, known: ReadonlySet<string> = questionChars(p.term)): string[] {
  const out: string[] = [];
  const tag = `${p.id} "${q.q}"`;
  if (!KINDS.includes(q.kind)) out.push(`${tag}: kind ${String(q.kind)} is not one of ${KINDS.join(' ')}`);
  if (!ASKS.some((a) => q.q.includes(a))) out.push(`${tag}: asks none of 谁 哪 什么 为什么 怎么样`);
  if (q.choices.length !== 4 || new Set(q.choices).size !== 4) out.push(`${tag}: needs four different choices`);
  const right = q.choices[q.answer];
  if (right === undefined) return [...out, `${tag}: the right answer is not among the choices`];
  const sentences = splitSentences(p.text);
  const n = sentences.length;
  const real = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n;
  if (q.kind === 'why' || q.kind === 'main') {
    const [a, b] = q.sentences ?? [];
    if (!q.sentences || q.sentences.length !== 2 || !real(a) || !real(b) || a === b) out.push(`${tag}: a ${q.kind} question needs two different supporting sentences of its ${n}`);
  } else if (!real(q.sentence)) out.push(`${tag}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
  const own = new Set(Array.from(p.text));
  const outside = [...new Set(han(q.q + q.choices.join('')).filter((ch) => !own.has(ch) && !known.has(ch)))];
  if (outside.length) out.push(`${tag}: uses ${outside.join('')} in neither the passage nor the lists through ${MOE_TERMS.indexOf(p.term) < MOE_TERMS.indexOf(QUESTION_FLOOR) ? QUESTION_FLOOR : p.term}`);
  // a word question quotes its word (“…”), which its answer explains and never repeats; the word's own characters may be shared
  const quoted = q.kind === 'word' ? /“([^”]+)”/.exec(q.q)?.[1] : undefined;
  if (q.kind === 'word' && (!quoted || !p.text.includes(quoted))) out.push(`${tag}: a word question quotes (“…”) a word of the passage`);
  if (quoted && right.includes(quoted)) out.push(`${tag}: the answer repeats the word it explains`);
  // every wrong choice names something in the passage, so matching characters to the text never singles out the answer
  const wrong = q.choices.filter((_, i) => i !== q.answer);
  for (const w of wrong) if (!p.text.includes(w) && !content(w).some((ch) => own.has(ch))) out.push(`${tag}: the wrong choice ${w} names nothing in the passage`);
  if (p.text.includes(right) && wrong.filter((w) => p.text.includes(w)).length < 2) out.push(`${tag}: the answer is in the passage word for word, and fewer than two wrong choices are`);
  const lengths = q.choices.map((c) => han(c).length);
  if (Math.max(...lengths) - Math.min(...lengths) > CHOICE_SPREAD) out.push(`${tag}: choice lengths ${lengths.join('/')} differ by more than ${CHOICE_SPREAD}`);
  const leak = [...new Set(content(right).filter((ch) => q.q.includes(ch) && !quoted?.includes(ch)))];
  if (leak.length) out.push(`${tag}: the question gives away ${leak.join('')} from its answer`);
  if (ERHUA.test(q.q + q.choices.join(''))) out.push(`${tag}: 儿化`);
  if (right === topWord(p.text)) out.push(`${tag}: the answer ${right} is the passage's most frequent word`);
  if (q.kind === 'why' || q.kind === 'main') {
    const chars = han(right);
    const share = (s: string) => chars.filter((ch) => s.includes(ch)).length / Math.max(1, chars.length);
    const closest = [...sentences].sort((a, b) => share(b) - share(a))[0];
    if (closest !== undefined && share(closest) > COPY_SHARE) out.push(`${tag}: the ${q.kind} answer copies "${closest}" (${Math.round(share(closest) * 100)}% of its characters)`);
  }
  // the answer is not the only choice that fits the question's grammar (counted with a measure word, 很…, 在…, …了, …的)
  for (const [name, has] of SHAPES) {
    const r = has(right);
    const w = wrong.map(has);
    if ((r && !w.some(Boolean)) || (!r && w.every(Boolean))) out.push(`${tag}: the answer alone is ${r ? '' : 'not '}${name}`);
  }
  const measures = q.choices.map(measureOf);
  const others = wrong.map(measureOf);
  if (measures.every(Boolean) && new Set(others).size === 1 && measures[q.answer] !== others[0]) out.push(`${tag}: the answer alone is counted with ${measures[q.answer]}`);
  return out;
}

const COUNTED_RE = /^[一二两三四五六七八九十几]+([个只本头条匹把张辆件次棵片朵杯位块双])/u;
const measureOf = (c: string): string | null => COUNTED_RE.exec(c)?.[1] ?? null;
/** The grammatical shapes a choice can have: an answer alone in one, or alone outside one, fits the question unread. */
const SHAPES: readonly [string, (c: string) => boolean][] = [
  ['counted (一本…)', (c) => measureOf(c) !== null],
  ['很…', (c) => c.startsWith('很')],
  ['在…', (c) => c.startsWith('在')],
  ['…了', (c) => c.endsWith('了')],
  ['…的', (c) => c.endsWith('的')],
];

/** A passage's six (spec 2026-10-24 §5): different questions, every kind but `fact` at least once, `fact` at most twice, no answer
 *  position more than twice, each passing questionProblems; and no questions for a passage that is not there. */
export function checkPassageQuestions(passages: readonly Passage[], questions: Readonly<Record<string, readonly PassageQuestion[]>>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const qs = questions[p.id];
    if (!qs) continue; // not written yet: checkQuestionCoverage says so
    if (qs.length !== QUESTIONS_PER_PASSAGE) problems.push(`${p.id}: ${qs.length} questions, expected ${QUESTIONS_PER_PASSAGE}`);
    if (new Set(qs.map((q) => q.q)).size !== qs.length) problems.push(`${p.id}: the same question twice`);
    const missing = NEEDED.filter((k) => !qs.some((q) => q.kind === k));
    if (missing.length) problems.push(`${p.id}: no ${missing.join(', ')} question`);
    const facts = qs.filter((q) => q.kind === 'fact').length;
    if (facts > MAX_FACT) problems.push(`${p.id}: ${facts} fact questions, at most ${MAX_FACT}`);
    for (const at of [0, 1, 2, 3]) {
      const n = qs.filter((q) => q.answer === at).length;
      if (n > MAX_AT_POSITION) problems.push(`${p.id}: the answer is choice ${at + 1} in ${n} questions, at most ${MAX_AT_POSITION}`);
    }
    for (const q of qs) problems.push(...questionProblems(p, q));
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: questions for no passage`);
  return problems;
}

/** Every built-in passage has its six, or, until its batch is written, its two older ones (never both, never neither); and no
 *  passage's six come from two batch files. */
export function checkQuestionCoverage(passages: readonly Passage[], batches: readonly Readonly<Record<string, readonly PassageQuestion[]>>[], legacy: Readonly<Record<string, readonly unknown[]>>): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  batches.forEach((b, i) => {
    for (const id of Object.keys(b)) {
      if (seen.has(id)) problems.push(`${id}: questions in batch ${seen.get(id)! + 1} and batch ${i + 1}`);
      seen.set(id, i);
    }
  });
  for (const p of passages) {
    if (seen.has(p.id) && legacy[p.id]) problems.push(`${p.id}: six new questions and its older ones (delete them from questions/legacy.ts)`);
    if (!seen.has(p.id) && !legacy[p.id]) problems.push(`${p.id}: no questions`);
  }
  return problems;
}

```

(`ERHUA` is the module's existing 儿化 pattern, declared further down; it is read when a question is checked.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS, tsc silent. (No passage has six yet: every one is on its two older questions, so both content tests pass on legacy.)

- [ ] **Step 7: Commit**

```bash
git add -A src/content/passageQuestions.ts src/content/questions src/types.ts src/langdu/pool.ts src/langdu/pool.test.ts src/langdu/questions.ts src/langdu/questions.test.ts src/langdu/sentences.ts src/parent/PassagesPanel.tsx src/parent/talkSection.test.tsx src/talk scripts/check-content.ts scripts/check-content.test.ts src/app/langduSession.test.tsx
git commit -m "$(cat <<'EOF'
朗读: the 4-choice question shape with its kinds and guess-proof checks (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 2: Stretch passage files, their checks, and the writer's report (§4)

**Files:**
- Create: `src/content/passages/二下.json`, `src/content/passages/三上.json`, `src/content/passages/三下.json` (each `[]` for now)
- Modify: `src/content/index.ts` (`STRETCH_PASSAGES`, `PASSAGES`)
- Modify: `src/langdu/level.ts` (`termReadable`)
- Modify: `scripts/check-content.ts` (`checkOwnPassages`'s range; the stretch section)
- Create: `scripts/langdu-report.ts`, `scripts/drop-legacy.ts`
- Test: `scripts/check-content.test.ts`, `src/langdu/level.test.ts`

**Interfaces:**
- Consumes: `checkPassageQuestions`, `PASSAGE_QUESTIONS` (Task 1).
- Produces:
  - `STRETCH_PASSAGES: Passage[]` (`src/content/index.ts`); `PASSAGES` = own (p01–p73), stretch (p74 on), storybook chunks.
  - `termReadable(term: string): ReadonlySet<string>` (`src/langdu/level.ts`): his book's 识读字 through `term`; empty for an unknown term.
  - `scripts/check-content.ts`: `STRETCH_FROM` (74), `STRETCH_TERMS` ({ 二下: 15, 三上: 25, 三下: 20 }), `STRETCH_LENGTH`, `STRETCH_SENTENCES`, `STRETCH_FIT`, `LINKS`, `MIN_LINKS`, `linksIn(text): string[]`, `checkStretchPassages(passages, built: ReadonlySet<string>): string[]`, `stretchCounts(passages): string[]`.
  - `npx tsx scripts/langdu-report.ts [ids… | gsb]`: exit code 1 when any problem is found.
  - `npx tsx scripts/drop-legacy.ts <ids | pNN-pMM | gsb>`: deletes those passages' entries from `src/content/questions/legacy.ts` (the content tasks run it once their six are written).

- [ ] **Step 1: Write the failing tests**

In `src/langdu/level.test.ts`, add `termReadable` to the `./level` import and append:

```ts
describe('termReadable (spec 2026-10-24 §4: a reader who has finished a term)', () => {
  it("his book's 识读字 through the term; nothing for an unknown term", () => {
    expect(termReadable('二上').has('筝')).toBe(false); // 筝 is first read in 二下
    expect(termReadable('二下').has('筝')).toBe(true);
    expect(termReadable('二下').has('我')).toBe(true);
    expect(termReadable('x').size).toBe(0);
  });
});
```

In `scripts/check-content.test.ts`, add the imports:

```ts
import { passageFit, termReadable } from '../src/langdu/level';
```

and `checkStretchPassages`, `linksIn` to the `./check-content` import. Add before `describe('talk prompts (parent loop spec §3)', …)`:

```ts
describe('stretch passages (spec 2026-10-24 §4)', () => {
  const built = new Set(BUILTIN.map((c) => c.char));
  it('every one passes: term, length, sentences, linking patterns, fit at its term, 生词, built-in characters', () => {
    expect(checkStretchPassages(PASSAGES, built)).toEqual([]);
  });
  // the plan's worked example 2 (2026-10-24 plan, Content rules): passes as written
  const p74: Passage = {
    id: 'p74', title: '在巴刹走散了', term: '二下', source: 'ziji',
    text: '星期六早上，奶奶带我去巴刹买菜。巴刹里人很多，又热闹又拥挤。我一边走，一边看两旁的水果摊，走着走着，奶奶不在我身边了！我心里很慌张，差一点哭了出来。但是我想起妈妈说过：“如果找不到大人，就站着别走，等大人来找你。”所以我镇定下来，站在鱼摊旁边，没有乱跑。过了一会，奶奶果然找到了我。她摸摸我的头说：“你真聪明！”',
    words: [{ text: '拥挤', gloss: 'crowded' }, { text: '慌张', gloss: 'flustered' }, { text: '镇定', gloss: 'calm' }],
  };
  const flags = (over: Partial<Passage>) => checkStretchPassages([{ ...p74, ...over }], built);
  it('the worked example passes', () => {
    expect(checkStretchPassages([p74], built)).toEqual([]);
    expect(checkOwnPassages([p74])).toEqual([]);
  });
  it('its term is one of 二下 三上 三下', () => {
    expect(flags({ term: '二上' })).toContain('p74: term 二上, expected one of 二下 三上 三下');
  });
  it('80–140 characters in 4–8 sentences', () => {
    expect(flags({ text: '因为下雨，所以我在家。虽然很闷，但是我看书。' })).toEqual(expect.arrayContaining(['p74: 18 characters, expected 80–140', 'p74: 2 sentences, expected 4–8']));
  });
  it('at least two linking patterns, two-part ones within one sentence', () => {
    expect(linksIn('因为下雨，所以我在家。虽然很闷。但是我看书。我先吃饭，然后洗澡。最后睡觉。')).toEqual(['因为…所以', '先…然后…最后']);
    expect(linksIn('我一边走，一边唱。如果下雨，我就回家。不但好看，而且好吃。')).toEqual(['如果…就', '一边…一边', '不但…而且']);
    expect(flags({ text: p74.text.replace('如果', '要是') })).toContain('p74: linking patterns 一边…一边, expected at least 2 of 因为…所以 虽然…但是 先…然后…最后 如果…就 一边…一边 不但…而且');
  });
  it('a fit of 0.80–0.95 for a reader who has finished its term', () => {
    expect(passageFit(p74.text, termReadable('二下'))).toBeCloseTo(0.93, 2);
    expect(flags({ text: p74.text.replace('又热闹又拥挤', '又热闹又好玩').replace('慌张', '害怕').replace('镇定下来', '不哭了') })).toContain('p74: fit 0.96 at 二下, expected 0.8–0.95');
  });
  it('1–4 生词, each in the passage, glossed, with a character new at its term', () => {
    expect(flags({ words: [] })).toContain('p74: 0 生词, expected 1–4');
    expect(flags({ words: [{ text: '星星', gloss: 'star' }] })).toEqual(expect.arrayContaining(['p74: 生词 星星 is not in the passage', 'p74: 生词 星星 has no character new at 二下']));
    expect(flags({ words: [{ text: '拥挤', gloss: 'so many people that you cannot move' }] })).toContain('p74: 生词 拥挤 gloss "so many people that you cannot move": 7 words (at most 4)');
  });
  it('no 儿化, and every character a built-in one', () => {
    expect(flags({ text: p74.text.replace('过了一会', '过了一会儿') })).toContain('p74: 儿化');
    expect(checkStretchPassages([p74], new Set(Array.from('星期六')))).toEqual(expect.arrayContaining([expect.stringMatching(/^p74: .+ not built in$/)]));
  });
  it('the first 73 are not held to these rules', () => {
    expect(checkStretchPassages(PASSAGES.filter((p) => Number(p.id.slice(1)) < 74), built)).toEqual([]);
  });
});

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/check-content.test.ts src/langdu/level.test.ts`
Expected: FAIL: `termReadable`, `checkStretchPassages` and `linksIn` are not exported.

- [ ] **Step 3: Implement**

Create the three passage files, each holding `[]`:

```bash
mkdir -p src/content/passages
for t in 二下 三上 三下; do echo '[]' > "src/content/passages/$t.json"; done
```

In `src/content/index.ts`, after `import storybooks from './storybooks.json';` add:

```ts
import stretch2b from './passages/二下.json';
import stretch3a from './passages/三上.json';
import stretch3b from './passages/三下.json';
```

and replace the `PASSAGES` declaration and its comment with:

```ts
/** 朗读's built-in passages (spec 2026-10-15 §2): ours (p01–p73, then the stretch passages p74 on, one file per term: spec
 *  2026-10-24 §4), then the Global Storybooks chunks (scripts/import-storybooks.ts). */
export const STRETCH_PASSAGES: Passage[] = [...stretch2b, ...stretch3a, ...stretch3b] as Passage[];
export const PASSAGES: Passage[] = [...(passages as Passage[]), ...STRETCH_PASSAGES, ...(storybooks as unknown as { passages: Passage[] }).passages];
```

In `src/langdu/level.ts`, before `/** A term's place in his book's order (一上 = 0); −1 for an unknown term. */` add:

```ts
/** What a reader who has finished `term` reads: his book's 识读字 through it (spec 2026-10-24 §4: a passage's fit at its own
 *  term); an empty set for an unknown term. */
export const termReadable = (term: string): ReadonlySet<string> => CUMULATIVE[MOE_TERMS.indexOf(term)] ?? new Set();

```

In `scripts/check-content.ts`:
- change the level import to `import { passageFit, passageTerm, termReadable } from '../src/langdu/level';`;
- in `checkOwnPassages`, change `if (Number(p.id.slice(1)) < NEW_FROM) continue;` to:

```ts
    if (Number(p.id.slice(1)) < NEW_FROM || Number(p.id.slice(1)) >= STRETCH_FROM) continue; // p74 on: checkStretchPassages
```

- and before `/** 儿化 the app never says (src/noErhua.test.ts): Singapore usage. */` add:

```ts
/** The stretch passages (spec 2026-10-24 §4): p74 on, 二下 15, 三上 25, 三下 20. */
export const STRETCH_FROM = 74;
export const STRETCH_TERMS: Readonly<Record<string, number>> = { 二下: 15, 三上: 25, 三下: 20 };
export const STRETCH_LENGTH = [80, 140] as const;
export const STRETCH_SENTENCES = [4, 8] as const;
/** A stretch passage's fit for a reader who has finished its term (termReadable) lies in this window. */
export const STRETCH_FIT = [0.8, 0.95] as const;
/** The linking patterns (spec 2026-10-24 §4); a passage uses at least two different ones. */
export const LINKS: readonly (readonly string[])[] = [['因为', '所以'], ['虽然', '但是'], ['先', '然后', '最后'], ['如果', '就'], ['一边', '一边'], ['不但', '而且']];
export const MIN_LINKS = 2;

/** The linking patterns a text uses, as 「因为…所以」: each part in order, a two-part pattern within one sentence; 先…然后…最后
 *  may run across sentences. */
export function linksIn(text: string): string[] {
  const inOrder = (t: string, parts: readonly string[]) => {
    let at = 0;
    for (const part of parts) {
      const i = t.indexOf(part, at);
      if (i < 0) return false;
      at = i + part.length;
    }
    return true;
  };
  return LINKS.filter((parts) => (parts.length > 2 ? inOrder(text, parts) : splitSentences(text).some((s) => inOrder(s, parts)))).map((parts) => parts.join('…'));
}

/**
 * The stretch passages (spec 2026-10-24 §4), p74 on: at 二下, 三上 or 三下, levelling at it (checkOwnPassages); 80–140 characters
 * in 4–8 sentences; at least two linking patterns; a fit of 0.80–0.95 for a reader who has finished its term; 1–4 生词, each in
 * the passage with a kid gloss and a character a reader starting the term can't read; every character a built-in one (`built`).
 * The word gate and duplicates are checkOwnPassages'.
 */
export function checkStretchPassages(passages: readonly Passage[], built: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const p of passages.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= STRETCH_FROM)) {
    if (!(p.term in STRETCH_TERMS)) problems.push(`${p.id}: term ${p.term}, expected one of ${Object.keys(STRETCH_TERMS).join(' ')}`);
    const chars = han(p.text);
    const n = splitSentences(p.text).length;
    if (chars.length < STRETCH_LENGTH[0] || chars.length > STRETCH_LENGTH[1]) problems.push(`${p.id}: ${chars.length} characters, expected ${STRETCH_LENGTH.join('–')}`);
    if (n < STRETCH_SENTENCES[0] || n > STRETCH_SENTENCES[1]) problems.push(`${p.id}: ${n} sentences, expected ${STRETCH_SENTENCES.join('–')}`);
    if (ERHUA.test(p.text)) problems.push(`${p.id}: 儿化`);
    const links = linksIn(p.text);
    if (links.length < MIN_LINKS) problems.push(`${p.id}: linking patterns ${links.join(' ') || 'none'}, expected at least ${MIN_LINKS} of ${LINKS.map((l) => l.join('…')).join(' ')}`);
    const fit = passageFit(p.text, termReadable(p.term), p.names);
    if (fit < STRETCH_FIT[0] || fit > STRETCH_FIT[1]) problems.push(`${p.id}: fit ${fit.toFixed(2)} at ${p.term}, expected ${STRETCH_FIT.join('–')}`);
    const unbuilt = [...new Set(chars.filter((c) => !built.has(c)))];
    if (unbuilt.length) problems.push(`${p.id}: ${unbuilt.join('')} not built in`);
    const before = termReadable(MOE_TERMS[MOE_TERMS.indexOf(p.term) - 1] ?? '');
    const words = p.words ?? [];
    if (words.length < 1 || words.length > 4) problems.push(`${p.id}: ${words.length} 生词, expected 1–4`);
    for (const w of words) {
      if (!p.text.includes(w.text)) problems.push(`${p.id}: 生词 ${w.text} is not in the passage`);
      if (!han(w.text).some((c) => !before.has(c))) problems.push(`${p.id}: 生词 ${w.text} has no character new at ${p.term}`);
      for (const g of glossProblems(w.gloss)) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}": ${g}`);
      const known = kidGloss(w.text);
      if (known !== undefined && known !== w.gloss) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}" differs from its kid gloss "${known}"`);
    }
  }
  return problems;
}

/** How many stretch passages each term has, against STRETCH_TERMS; [] when every term is full (the last content task). */
export function stretchCounts(passages: readonly Passage[]): string[] {
  const own = passages.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= STRETCH_FROM);
  return Object.entries(STRETCH_TERMS).flatMap(([t, want]) => {
    const n = own.filter((p) => p.term === t).length;
    return n === want ? [] : [`${t}: ${n} stretch passages, expected ${want}`];
  });
}

```

Create `scripts/langdu-report.ts`:

```ts
// 朗读 content at a glance for the writer (spec 2026-10-24 §4–§5): each passage's sentences numbered (a question's `sentence`
// and `sentences` count from 0), its term, length, linking patterns and fits, then every problem the content checks find in it
// and its questions. Usage: npx tsx scripts/langdu-report.ts p74 p75 …   (no ids: every stretch passage; "gsb": the chunks)
import { BUILTIN, MOE_TERMS, PASSAGES } from '../src/content';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { passageFit, passageTerm, termReadable } from '../src/langdu/level';
import { splitSentences } from '../src/langdu/sentences';
import { checkOwnPassages, checkPassageQuestions, checkStretchPassages, linksIn, STRETCH_FROM } from './check-content';

const args = process.argv.slice(2);
const chosen = PASSAGES.filter((p) =>
  args.length === 0 ? p.source === 'ziji' && Number(p.id.slice(1)) >= STRETCH_FROM : args.some((a) => (a === 'gsb' ? p.source === 'gsb' : p.id === a)),
);
const built = new Set(BUILTIN.map((c) => c.char));
const own = PASSAGES.filter((p) => p.source === 'ziji');
let bad = 0;
for (const p of chosen) {
  const han = Array.from(p.text).filter((c) => /\p{Script=Han}/u.test(c)).length;
  const prev = MOE_TERMS[MOE_TERMS.indexOf(p.term) - 1];
  console.log(`\n${p.id} ${p.term} 《${p.title}》 ${han} characters · levels at ${passageTerm(p.text, p.names) ?? 'none'} · fit ${passageFit(p.text, termReadable(p.term), p.names).toFixed(2)} at ${p.term}${prev ? `, ${passageFit(p.text, termReadable(prev), p.names).toFixed(2)} at ${prev}` : ''} · links ${linksIn(p.text).join(' ') || 'none'}`);
  const beyond = (t: string | undefined) => [...new Set(Array.from(p.text).filter((c) => /\p{Script=Han}/u.test(c) && !termReadable(t ?? '').has(c)))].join('');
  console.log(`  beyond ${p.term}: ${beyond(p.term) || '—'}${prev ? ` · beyond ${prev}: ${beyond(prev)}` : ''}`);
  splitSentences(p.text).forEach((s, i) => console.log(`  ${i}  ${s}`));
  const qs = PASSAGE_QUESTIONS[p.id];
  const problems = [
    ...(p.source === 'ziji' ? checkOwnPassages(own).filter((x) => x.startsWith(`${p.id}:`) || x.startsWith(`${p.id} `)) : []),
    ...checkStretchPassages([p], built),
    ...(qs ? checkPassageQuestions([p], { [p.id]: qs }) : [`${p.id}: no six questions yet`]),
  ];
  bad += problems.length;
  for (const x of problems) console.log(`  ✗ ${x}`);
}
console.log(`\n${chosen.length} passages, ${bad} problems`);
process.exitCode = bad ? 1 : 0;
```

Create `scripts/drop-legacy.ts`:

```ts
// Deletes passages' older questions from src/content/questions/legacy.ts once their six are written (plan 2026-10-24, content
// tasks). Usage: npx tsx scripts/drop-legacy.ts p26 p27 …   or a range: npx tsx scripts/drop-legacy.ts p26-p50   or: gsb
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/content/questions/legacy.ts';
const ids = process.argv.slice(2).flatMap((a) => {
  const m = /^p(\d+)-p(\d+)$/.exec(a);
  return m ? Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => `p${String(Number(m[1]) + i).padStart(2, '0')}`) : [a];
});
let s = readFileSync(FILE, 'utf8');
let dropped = 0;
// one entry: its key line (p01: [ or 'gsb:0001-1': [), its question lines, and its closing "  ],"
s = s.replace(/\n  ('?)([\w:-]+)\1: \[\n(?: {4}.*\n)*? {2}\],/g, (entry, _q: string, id: string) => {
  const hit = ids.includes(id) || (ids.includes('gsb') && id.startsWith('gsb:'));
  if (hit) dropped++;
  return hit ? '' : entry;
});
writeFileSync(FILE, s);
console.log(`${dropped} passages' older questions dropped`);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/langdu/level.test.ts src/content`
Expected: PASS. Then `npx tsx scripts/langdu-report.ts p08` prints p08's four sentences numbered 0–3 and `✗ p08: no six questions yet` (exit code 1: its six come in Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/index.ts src/langdu/level.ts src/langdu/level.test.ts scripts/check-content.ts scripts/check-content.test.ts scripts/langdu-report.ts scripts/drop-legacy.ts
git commit -m "$(cat <<'EOF'
朗读: stretch passage files, their checks and the writer's report (stretch spec §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 3: The stretch band and fewer repeats (§3, §6)

**Files:**
- Modify: `src/types.ts` (`PassageHistory`)
- Modify: `src/langdu/history.ts` (ladder, `readHow`, `afterRead`, `restFromReview`, `migrateReading`)
- Modify: `src/langdu/pick.ts` (band, order), `src/langdu/level.ts` (`REACH_TERMS`, `withinReach`)
- Modify: `src/app/SessionScreen.tsx` (the `readHow` call, until Task 7)
- Test: `src/langdu/history.test.ts`, `src/langdu/pick.test.ts`, `src/langdu/rotation.test.ts`, `src/langdu/level.test.ts`, `src/langdu/pool.test.ts`, `src/langdu/misreads.test.ts`, `src/langdu/review.test.ts`, `src/app/langduSession.test.tsx`, `src/app/langduExtra.test.tsx`

**Interfaces:**
- Consumes: `PassageAnswer`, `QuestionKind` (Task 1).
- Produces:
  - `PassageHistory` gains `lastHow?: 'well' | 'not-well'`, `lastSet?: number[]`, `answers?: PassageAnswer[]`.
  - `history.ts`: `MISS_REST` (3), `WELL_LADDER` ([21, 45]), `ANSWERS_KEPT` (30); `REST_LADDER` is gone. `readHow(o: { extra: boolean; answers: readonly { correct: boolean }[] }): ReadHow`. `interface ReadAsked { set: readonly number[]; answers: readonly { kind: QuestionKind; correct: boolean }[] }`; `afterRead(r, id, today, how, asked?: ReadAsked)`.
  - `pick.ts`: `BAND_LOW` 0.85, `BAND_HIGH` 0.92, `BAND_AIM` 0.88; `pickOrder` puts a due 'not-well' passage first (taking turns with new ones by `lastKind`) and every other due revisit after the new ones.
  - `level.ts`: `REACH_TERMS` (2).

- [ ] **Step 1: Write the failing tests**

In `src/langdu/history.test.ts`, add `import { addDays, localDateKey, parseDateKey } from '../lib/date';` and `ANSWERS_KEPT` to the `./history` import. Replace the two describes `'rest after a read (spec 2026-10-15 §4, D6)'` and `'how a read went: never from the recording (spec §1 cause 4)'` with:

```ts
describe('rest after a read (spec 2026-10-24 §6)', () => {
  it('a first read judged well rests 21 days; one not judged well rests 3', () => {
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 21, q: 1, lastHow: 'well' });
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'not-well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 1, lastHow: 'not-well' });
  });
  it('read well, the rest climbs 21 → 45, then the passage retires', () => {
    const rests: number[] = [];
    let r = H0;
    for (const d of ['2026-10-01', '2026-10-22', '2026-12-06']) {
      r = afterRead(r, 'p01', d, 'well');
      rests.push(entryOf(r, 'p01').rest);
    }
    expect(rests).toEqual([21, 45, RETIRED_REST]);
    expect(isRetired(entryOf(r, 'p01'))).toBe(true);
  });
  it('a read not judged well rests 3 days from any rest; the next good read starts the ladder again at 21', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-22']); // rest 45
    r = afterRead(r, 'p01', '2026-12-06', 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ rest: 3, lastHow: 'not-well' });
    expect(entryOf(afterRead(r, 'p01', '2026-12-09', 'well'), 'p01')).toMatchObject({ rest: 21, lastHow: 'well' });
  });
  it('an early read (before its rest is over: nothing else was there) keeps the rest — it does not climb (final review)', () => {
    let r = afterRead(H0, 'p01', '2026-10-01', 'well'); // rest 21
    r = afterRead(r, 'p01', '2026-10-08', 'well'); // 7 days into 21: early
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 2, lastRead: '2026-10-08', rest: 21, q: 2 });
    expect(entryOf(afterRead(r, 'p01', '2026-10-12', 'not-well'), 'p01').rest).toBe(3); // a miss still goes back to 3
  });
  it('the question turn moves on with each lesson read; 多读一遍 leaves rest, turn, how and kind alone but counts for the gap', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04'], 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ q: 2, rest: 3 });
    r = afterRead(r, 'p01', '2026-10-12', 'extra');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 3, q: 2, rest: 3, lastRead: '2026-10-12', lastHow: 'not-well' });
    expect(r.lastKind).toBe('revisit');
  });
  it('a first read in 多读一遍 rests 3 days and leaves the first question set for next time', () => {
    expect(entryOf(afterRead(H0, 'p02', '2026-10-15', 'extra'), 'p02')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 0 });
  });
  it('a second lesson read of the same passage the same day (two tabs) counts the read only: no second climb', () => {
    const r = reads(H0, 'p01', ['2026-10-01', '2026-10-04'], 'not-well'); // rest 3, q 2, a revisit
    const twice = afterRead({ ...r, lastKind: 'new' }, 'p01', '2026-10-04', 'well');
    expect(entryOf(twice, 'p01')).toEqual({ reads: 3, lastRead: '2026-10-04', rest: 3, q: 2, lastHow: 'not-well' });
    expect(twice.lastKind).toBe('new');
  });
  it('a lesson read records whether it was new or a revisit', () => {
    const r = afterRead(H0, 'p01', '2026-10-01', 'not-well');
    expect(r.lastKind).toBe('new');
    expect(afterRead(r, 'p01', '2026-10-04', 'well').lastKind).toBe('revisit');
  });
  it('a lesson read keeps the set it asked and his answers by kind, dated, the last 30 (spec 2026-10-24 §8)', () => {
    const asked = { set: [0, 2, 5], answers: [{ kind: 'why' as const, correct: false }, { kind: 'order' as const, correct: true }, { kind: 'fact' as const, correct: true }] };
    const r = afterRead(H0, 'p01', '2026-10-01', 'well', asked);
    expect(entryOf(r, 'p01')).toMatchObject({ lastSet: [0, 2, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-01' }, { kind: 'order', correct: true, at: '2026-10-01' }, { kind: 'fact', correct: true, at: '2026-10-01' }] });
    let many = r;
    for (let i = 0; i < 12; i++) many = afterRead(many, 'p01', localDateKey(addDays(parseDateKey('2026-10-04'), i * 3)), 'well', asked);
    const kept = entryOf(many, 'p01').answers!;
    expect(kept).toHaveLength(ANSWERS_KEPT);
    expect(kept.at(-1)!.at).toBe('2026-11-06');
    expect(entryOf(afterRead(r, 'p01', '2026-10-20', 'extra'), 'p01').answers).toHaveLength(3); // 多读一遍 asks nothing
  });
});

describe('how a read went: from his answers, never the recording (spec 2026-10-24 §5)', () => {
  const a = (...rights: boolean[]) => rights.map((correct) => ({ correct }));
  it("'well' at 2 of 3 right or better; 'not-well' at 0 or 1; no question: well; 多读一遍: extra", () => {
    expect(readHow({ extra: false, answers: a(true, true, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(true, false, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(false, true, false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: a(false, false, false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: [] })).toBe('well');
    expect(readHow({ extra: true, answers: a(false, false, false) })).toBe('extra');
  });
  it("a parent text's one question: right is well, missed is not; a passage still on its older two needs both", () => {
    expect(readHow({ extra: false, answers: a(true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: a(true, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(true, false) })).toBe('not-well');
  });
});
```

In the same file:
- in `describe('the 3-day gap and due revisits', …)` change `const r = afterRead(H0, 'p01', '2026-10-15', 'well');` to `const r = afterRead(H0, 'p01', '2026-10-15', 'not-well'); // rests 3`;
- in the 下一篇 test change `reads(H0, 'p01', ['2026-10-01'])` to `reads(H0, 'p01', ['2026-10-01'], 'not-well')` and the expected entry to `{ reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastHow: 'not-well', lastSkipped: '2026-10-20', skips: 2 }`;
- replace the first misread-marks test's opening with:

```ts
  it("due again 3 days after the review, from any rest, a retired passage too, as a 'not-well' revisit", () => {
    let r = reads(H0, 'p01', ['2026-10-11']); // rest 21
    r = restFromReview(r, 'p01', '2026-10-13');
    expect(overdue(entryOf(r, 'p01'), '2026-10-16')).toBe(0);
    expect(entryOf(r, 'p01')).toMatchObject({ lastRead: '2026-10-11', lastHow: 'not-well' });
```

  (its retired-passage half stays), and in the 70-day test expect `{ reads: 5, lastRead: '2026-10-10', rest: 3, q: 5, lastHow: 'not-well' }`;
- add to `describe('the one-off move from the 3-day cycle …')`:

```ts
  it("keeps how the last read went, the set it asked and his answers; drops what isn't one (spec 2026-10-24 §6, §8)", () => {
    const e = { reads: 2, lastRead: '2026-10-20', rest: 3, q: 2, lastHow: 'not-well', lastSet: [1, 4, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-20' }, { kind: 'who', correct: true, at: '2026-10-20' }, { kind: 'main', correct: 'yes', at: '2026-10-20' }] };
    expect(migrateReading({ history: { p01: e }, lastKind: 'revisit', lastWarmup: null, warmups: 0 }).history.p01).toEqual({ reads: 2, lastRead: '2026-10-20', rest: 3, q: 2, lastHow: 'not-well', lastSet: [1, 4, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-20' }] });
    expect(migrateReading({ history: { p01: { ...e, lastHow: 'ok', lastSet: 'x', answers: 3 } }, lastKind: null, lastWarmup: null, warmups: 0 }).history.p01).toEqual({ reads: 2, lastRead: '2026-10-20', rest: 3, q: 2 });
  });
```

Replace `src/langdu/pick.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, RETIRED_REST } from './history';
import { BAND_AIM, BAND_HIGH, BAND_LOW, inBand, pickOrder, pickPassage, swapTarget, type Candidate } from './pick';

const H0: ReadingHistory = EMPTY_READING;
const c = (id: string, fit: number, over: Partial<Candidate> = {}): Candidate => ({ id, source: id.startsWith('pp:') ? 'parent' : id.startsWith('gsb:') ? 'gsb' : 'ziji', fit, ...over });
const ids = (xs: Candidate[]) => xs.map((x) => x.id);
const T = '2026-10-15';

describe('the stretch band (spec 2026-10-24 §3)', () => {
  it('85–92% readable, aiming at 88%', () => {
    expect([BAND_LOW, BAND_HIGH, BAND_AIM]).toEqual([0.85, 0.92, 0.88]);
    expect([0.84, 0.85, 0.88, 0.92, 0.93].map(inBand)).toEqual([false, true, true, true, false]);
  });
  it('a new passage in band, nearest 0.88; an easy one (above 0.92) only when nothing is in band', () => {
    expect(pickPassage(H0, [c('p01', 0.92), c('p02', 0.875), c('p03', 0.85)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.96), c('p02', 0.9)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.96)], T)?.id).toBe('p01');
  });
  it('under 0.85 is never offered, new, due or retired; a school text is, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.84)], T)).toBeNull();
    const r: ReadingHistory = { ...H0, history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastHow: 'not-well' }, p02: { reads: 4, lastRead: '2026-06-01', rest: RETIRED_REST, q: 4 } } };
    expect(pickOrder(r, [c('p01', 0.8), c('p02', 0.7)], T)).toEqual([]);
    expect(pickPassage(H0, [c('p01', 0.88), c('pp:a', 0.5)], T)?.id).toBe('pp:a');
  });
});

describe('pickPassage (spec 2026-10-15 §4, 2026-10-24 §6)', () => {
  it('an unread school text comes first, in the order added, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.88), c('pp:b', 0.5), c('pp:a', 0.95)], T)?.id).toBe('pp:b');
  });
  it('no repeats within 3 days, the same day included: a second lesson today gets another passage', () => {
    const r = afterRead(H0, 'p02', T, 'not-well');
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.9)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.88)], '2026-10-17')).toBeNull();
    expect(pickPassage(r, [c('p02', 0.88)], '2026-10-18')?.id).toBe('p02'); // due after its 3-day rest
  });
  it('fresh first: a new passage in band comes before a due revisit read well', () => {
    const r = afterRead(H0, 'p01', '2026-09-01', 'well'); // rest 21: due since 09-22
    expect(ids(pickOrder({ ...r, lastKind: 'new' }, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
    expect(ids(pickOrder({ ...r, lastKind: 'revisit' }, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
  });
  it("…except a due 'not-well' passage, which comes first — taking turns with new ones (lastKind)", () => {
    const r = afterRead(afterRead(H0, 'p01', '2026-10-01', 'not-well'), 'p03', '2026-10-05', 'well'); // p01 due 10-04; a new one last
    const pool = [c('p01', 0.88), c('p02', 0.9), c('p03', 0.88)];
    expect(pickPassage(r, pool, T)?.id).toBe('p01');
    const after = afterRead(r, 'p01', T, 'not-well');
    expect(after.lastKind).toBe('revisit');
    const two = afterRead(afterRead(H0, 'p05', '2026-10-01', 'not-well'), 'p06', '2026-10-01', 'not-well'); // two due 'not-well'
    expect(ids(pickOrder({ ...two, lastKind: 'revisit' }, [c('p05', 0.9), c('p06', 0.9), c('p07', 0.88)], T))).toEqual(['p07', 'p05', 'p06']);
    expect(ids(pickOrder({ ...two, lastKind: 'new' }, [c('p05', 0.9), c('p06', 0.9), c('p07', 0.88)], T))).toEqual(['p05', 'p06', 'p07']);
  });
  it('a history from before 2026-10-24 (no lastHow) waits behind new passages like one read well', () => {
    const r: ReadingHistory = { ...H0, lastKind: 'new', history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } } };
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
  });
  it('nothing new in band: a due revisit; then anything readable outside the gap; retired ones last, oldest first', () => {
    const r: ReadingHistory = {
      ...H0,
      lastKind: 'revisit',
      history: {
        p01: { reads: 2, lastRead: '2026-10-10', rest: 21, q: 2 }, // not due
        p02: { reads: 1, lastRead: '2026-09-01', rest: 21, q: 1 }, // due
        p03: { reads: 6, lastRead: '2026-08-01', rest: RETIRED_REST, q: 6 },
        p04: { reads: 6, lastRead: '2026-07-01', rest: RETIRED_REST, q: 6 },
      },
    };
    expect(ids(pickOrder(r, [c('p01', 0.9), c('p02', 0.9), c('p03', 0.9), c('p04', 0.9)], T))).toEqual(['p02', 'p01', 'p04', 'p03']);
  });
  it('an unread easy passage comes before one read well that is due (final review: 47 unread ones were never offered)', () => {
    const r: ReadingHistory = { ...H0, lastKind: 'new', history: { p01: { reads: 1, lastRead: '2026-09-01', rest: 21, q: 1, lastHow: 'well' } } }; // in band, due
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.99)], T))).toEqual(['p02', 'p01']);
  });
  it('resting passages come back nearest their due day first', () => {
    const r: ReadingHistory = { ...H0, history: { p01: { reads: 2, lastRead: '2026-10-12', rest: 21, q: 2 }, p02: { reads: 2, lastRead: '2026-09-25', rest: 21, q: 2 } } };
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.92)], T))).toEqual(['p02', 'p01']); // p02 is due in 1 day, p01 in 18
  });
  it('a skipped passage keeps out of the way for 3 days', () => {
    const r = afterSkip(H0, 'p02', T);
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.91)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.91)], '2026-10-18')?.id).toBe('p02');
  });
  it('ZiJi and Global Storybooks take turns: the source with fewer passages read first, ZiJi on a tie', () => {
    const pool = [c('gsb:0001-1', 0.88), c('p05', 0.9)];
    expect(pickPassage(H0, pool, T)?.id).toBe('p05');
    const r = afterRead(H0, 'p09', '2026-10-14', 'well'); // inside its gap today
    expect(pickPassage(r, [...pool, c('p09', 0.9)], T)?.id).toBe('gsb:0001-1');
  });
  it('story parts only in order, and the next part of a started story comes first', () => {
    const s = (part: number, fit: number) => c(`gsb:0066-${part}`, fit, { story: { id: '0066', part, parts: 3 } });
    const pool = [s(2, 0.88), s(3, 0.88), s(1, 0.86), c('p05', 0.88)];
    expect(ids(pickOrder(H0, pool, T))).toEqual(['p05', 'gsb:0066-1']); // ZiJi on the tie; parts 2 and 3 wait for part 1
    const r = afterRead(H0, 'gsb:0066-1', '2026-10-10', 'well');
    expect(pickPassage({ ...r, lastKind: 'revisit' }, pool, T)?.id).toBe('gsb:0066-2'); // ahead of p05
  });
  it('an empty pool, or everything inside the gap, gives nothing', () => {
    expect(pickPassage(H0, [], T)).toBeNull();
    expect(pickPassage(afterRead(H0, 'p01', T, 'well'), [c('p01', 0.88)], T)).toBeNull();
  });
  it('history for a passage no longer in the pool (a deleted school text) is ignored', () => {
    expect(pickPassage(afterRead(H0, 'pp:gone', '2026-10-01', 'well'), [c('p01', 0.88)], T)?.id).toBe('p01');
  });
});

describe('下一篇 (spec 2026-10-15 §5, D5)', () => {
  const pool = [c('p01', 0.88), c('p02', 0.89), c('p03', 0.9)];
  it('the next in the order, with the swapped one skipped', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 0)?.id).toBe('p02');
    expect(swapTarget(afterSkip(H0, 'p01', T), pool, pool[1]!, T, 1)?.id).toBe('p03');
  });
  it('two swaps a step, never a school text, and none when nothing else is there', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 2)).toBeNull();
    expect(swapTarget(H0, [c('pp:a', 0.5), ...pool], c('pp:a', 0.5), T, 0)).toBeNull();
    expect(swapTarget(H0, [c('p01', 0.88)], c('p01', 0.88), T, 0)).toBeNull();
  });
});
```

Replace `src/langdu/rotation.test.ts` with:

```ts
// The library over a month (final review, 2026-10-15; spec 2026-10-24 §6): a 二下 child, two lessons a day for 30 days, reading
// what the picker gives him, one read in five not judged well. He must keep meeting new passages, come back only to what he
// struggled with (3 days later), and never see a passage he read well again within its 21 days.
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { allowedChars } from '../content/understand';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, daysBetween, entryOf, GAP_DAYS, isRetired, WELL_LADDER } from './history';
import { inBand, pickPassage } from './pick';
import { readingPool } from './pool';

function simulate(readable: ReadonlySet<string>, classTerm: string, days = 30, perDay = 2) {
  const pool = readingPool([], PASSAGES, { readable, classTerm });
  let r: ReadingHistory = EMPTY_READING;
  const log: { day: string; id: string; kind: 'new' | 'revisit'; after: 'well' | 'not-well' | undefined; since: number | null }[] = [];
  let skipped = 0;
  for (let d = 0; d < days; d++) {
    const day = localDateKey(addDays(parseDateKey('2026-11-02'), d));
    for (let k = 0; k < perDay; k++) {
      const p = pickPassage(r, pool, day);
      if (!p) { skipped++; continue; }
      const e = entryOf(r, p.id);
      if (e.lastRead) expect(daysBetween(e.lastRead, day)).toBeGreaterThanOrEqual(GAP_DAYS);
      log.push({ day, id: p.id, kind: e.reads ? 'revisit' : 'new', after: e.lastHow, since: e.lastRead ? daysBetween(e.lastRead, day) : null });
      r = afterRead(r, p.id, day, (d + k) % 5 === 4 ? 'not-well' : 'well');
    }
  }
  return { pool, r, log, skipped };
}

describe('a month of 朗读 (spec 2026-10-24 §6: fewer repeats)', () => {
  const sim = simulate(allowedChars('二下'), '二下');
  it('no lesson goes without a passage, and most of the 60 are new', () => {
    expect(sim.skipped).toBe(0);
    expect(sim.log).toHaveLength(60);
    expect(new Set(sim.log.map((x) => x.id)).size).toBeGreaterThanOrEqual(45);
  });
  it("new passages come from the stretch band first: his first 20 are 85–92% readable, but a started story's next part", () => {
    const byId = new Map(sim.pool.map((p) => [p.id, p]));
    const fresh = sim.log.filter((x) => x.kind === 'new').slice(0, 20).map((x) => byId.get(x.id)!);
    expect(fresh).toHaveLength(20);
    expect(fresh.filter((p) => !inBand(p.fit) && !(p.story && p.story.part > 1)).map((p) => p.id)).toEqual([]);
  });
  it("he comes back only to what he read 'not-well', 3 days on, while new passages remain", () => {
    const revisits = sim.log.filter((x) => x.kind === 'revisit');
    expect(revisits.length).toBeGreaterThan(0);
    expect(revisits.filter((x) => x.after !== 'not-well')).toEqual([]);
  });
  it('new and a struggled revisit take turns: never two revisits in a row', () => {
    expect(sim.log.map((x) => x.kind[0]).join('')).not.toMatch(/rr/);
  });
  it('a passage read well rests 21 days at least; nothing retires in a month', () => {
    expect(sim.log.filter((x) => x.after === 'well' && x.since !== null && x.since < WELL_LADDER[0])).toEqual([]);
    expect(Object.values(sim.r.history).filter(isRetired)).toHaveLength(0);
  });
});
```

In `src/langdu/level.test.ts`, replace the reach test with:

```ts
  it('the pool reaches two terms past his class at most (spec 2026-10-24 §3)', () => {
    expect([withinReach('三上', '二下'), withinReach('三下', '二下'), withinReach('三下', '二上'), withinReach('三下', null)]).toEqual([true, true, false, true]);
```

In `src/langdu/pool.test.ts`, replace the reach test with:

```ts
  it('no built-in more than two terms past his class (spec 2026-10-24 §3)', () => {
    const b = (id: string, term: string) => ({ id, title: id, text: '我。', term, source: 'ziji' as const });
    expect(readingPool([], [b('p01', '二下'), b('p02', '三上'), b('p03', '三下')], { readable: new Set(['我']), classTerm: '二上' }).map((p) => p.id)).toEqual(['p01', 'p02']);
    expect(readingPool([], [b('p01', '二下'), b('p02', '三上'), b('p03', '三下')], { readable: new Set(['我']), classTerm: '二下' }).map((p) => p.id)).toEqual(['p01', 'p02', 'p03']);
```

The parent's marks now also say he struggled. In `src/langdu/misreads.test.ts` expect `{ reads: 2, lastRead: '2026-10-01', rest: 7, q: 2, lastHow: 'not-well' }`, and in `src/langdu/review.test.ts` expect `{ reads: 2, lastRead: '2026-09-25', rest: 10, q: 2, lastHow: 'not-well' }`.

In `src/app/langduSession.test.tsx`:
- every saved history entry `{ reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 }` and `{ reads: 1, lastRead: '2026-10-05', rest: 3, q: 1 }` gains `lastHow: 'not-well'` (these revisits must come before new passages, as they did);
- the first test expects `{ history: { 'pp:1': { reads: 1, lastRead: '2026-10-05', rest: 21, q: 1, lastHow: 'well' } }, lastKind: 'new', lastWarmup: '2026-10-05', warmups: 1 }` (read well: 21 days);
- the test titled `'… and a revisit read well rests 7 days'` becomes `'… rests 21 days'` and expects `{ 'pp:1': { reads: 2, lastRead: '2026-10-05', rest: 21, q: 2, lastHow: 'well' } }`.

In `src/app/langduExtra.test.tsx`, the saved `'pp:1'` entry gains `lastHow: 'not-well' as const`, and the extra round's expected entry becomes `{ reads: 2, lastRead: '2026-10-02', rest: 3, q: 1, lastHow: 'not-well' }`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/langdu src/app/langduSession.test.tsx src/app/langduExtra.test.tsx`
Expected: FAIL, among others: "a first read judged well rests 21 days", "85–92% readable", "fresh first", "the pool reaches two terms", and a type error that `readHow` takes no `answers`.

- [ ] **Step 3: Implement**

In `src/types.ts`, add to `PassageHistory` after `q: number;`:

```ts
  lastHow?: 'well' | 'not-well'; // how the last lesson read went (spec 2026-10-24 §6): a due 'not-well' one comes first
  lastSet?: number[]; // the built-in questions the last lesson read asked (indices): the next read never repeats the set
  answers?: PassageAnswer[]; // his answers to its built-in questions, the last 30 (spec 2026-10-24 §8)
```

In `src/langdu/history.ts`:
- replace the header comment with:

```ts
// 朗读's reading history (spec 2026-10-15 §4, 2026-10-24 §6): each passage's reads and rest, so a passage comes back on a spaced
// schedule — never within 3 days; a read judged well rests 21 days, then 45, then retires; a read not judged well rests 3 days,
// so he re-reads what he struggled with.
```

- change the types import to `import { EMPTY_READING, type PassageAnswer, type PassageHistory, type QuestionKind, type ReadingHistory } from '../types';`;
- replace `REST_LADDER` and its comment with:

```ts
/** Rest after a read not judged well, from any rest (spec 2026-10-24 §6). */
export const MISS_REST = 3;
/** Rest after a read judged well: the first step, then the next; past the last the passage retires (spec 2026-10-24 §6). */
export const WELL_LADDER = [21, 45] as const;
/** His answers kept on a passage's history (spec 2026-10-24 §8). */
export const ANSWERS_KEPT = 30;
```

- replace everything from `/** How a read went:` to the end of `afterRead` with:

```ts
/** How a read went: 'well', 'not-well', or 'extra' (多读一遍). */
export type ReadHow = 'well' | 'not-well' | 'extra';

/** From his answers, never the recording (spec 2026-10-15 §1 cause 4; 2026-10-24 §5): 'well' at two thirds right or more (2 of
 *  3; a parent text's one question right), and with no question asked; 'not-well' below that. */
export function readHow(o: { extra: boolean; answers: readonly { correct: boolean }[] }): ReadHow {
  if (o.extra) return 'extra';
  const right = o.answers.filter((a) => a.correct).length;
  return right * 3 >= o.answers.length * 2 ? 'well' : 'not-well';
}

export function nextRest(rest: number, well: boolean): number {
  if (!well) return MISS_REST;
  return WELL_LADDER.find((s) => s > rest) ?? RETIRED_REST;
}

/** What a lesson read asked: the built-in questions' indices (the next read never asks the same set) and his answers, by kind. */
export interface ReadAsked { set: readonly number[]; answers: readonly { kind: QuestionKind; correct: boolean }[] }

/** A read: one judged well climbs the ladder (21, 45, retired; a read before its rest is over keeps it), one not judged well
 *  rests 3 days. 多读一遍 ('extra') counts for the gap and the reads only; a first read in it rests 3 days. A lesson read moves
 *  the question turn on, keeps how it went, the set it asked and his answers (the last 30), and says whether it was new or a
 *  revisit. */
export function afterRead(r: ReadingHistory, id: string, today: string, how: ReadHow, asked?: ReadAsked): ReadingHistory {
  const e = entryOf(r, id);
  // a second lesson read of it today (two tabs): one more read, no second climb, turn or kind
  if (how !== 'extra' && e.reads > 0 && e.lastRead === today) return { ...r, history: { ...r.history, [id]: { ...e, reads: e.reads + 1 } } };
  const first = e.reads === 0;
  // an early read (offered before its rest was over, when nothing else was there) keeps its rest: the ladder climbs on spaced reads
  const early = !!e.lastRead && daysBetween(e.lastRead, today) < e.rest;
  const rest = how === 'extra' ? (first ? MISS_REST : e.rest) : how === 'well' && early ? e.rest : nextRest(first ? 0 : e.rest, how === 'well');
  if (how === 'extra') return { ...r, history: { ...r.history, [id]: { ...e, reads: e.reads + 1, lastRead: today, rest } } };
  const answers: PassageAnswer[] = [...(e.answers ?? []), ...(asked?.answers ?? []).map((a) => ({ kind: a.kind, correct: a.correct, at: today }))].slice(-ANSWERS_KEPT);
  const entry: PassageHistory = {
    ...e, reads: e.reads + 1, lastRead: today, rest, q: e.q + 1, lastHow: how,
    ...(asked?.set.length ? { lastSet: [...asked.set] } : {}),
    ...(answers.length ? { answers } : {}),
  };
  return { ...r, history: { ...r.history, [id]: entry }, lastKind: first ? 'new' : 'revisit' };
}
```

- in `restFromReview` replace the two lines from `const rest =` with:

```ts
  const rest = Math.max(0, daysBetween(e.lastRead, reviewDay)) + MISS_REST;
  // he struggled with it: it comes back as a 'not-well' revisit, first in line (spec 2026-10-24 §6)
  const entry: PassageHistory = rest > RETIRE_AFTER ? { ...e, lastRead: reviewDay, rest: MISS_REST, lastHow: 'not-well' } : { ...e, rest, lastHow: 'not-well' };
```

- before `const num = (v: unknown): number =>` add:

```ts
const KINDS: readonly QuestionKind[] = ['why', 'word', 'order', 'main', 'fact'];
const isAnswer = (v: unknown): v is PassageAnswer => {
  const a = v as Partial<PassageAnswer> | null;
  return !!a && typeof a === 'object' && KINDS.includes(a.kind as QuestionKind) && typeof a.correct === 'boolean' && day(a.at) !== null;
};
```

- in `migrateReading`, replace the `history[id] = { reads: num(e.reads), … }` line of today's shape with:

```ts
      const lastHow = e.lastHow === 'well' || e.lastHow === 'not-well' ? e.lastHow : null;
      const lastSet = Array.isArray(e.lastSet) ? e.lastSet.filter((i): i is number => Number.isInteger(i) && i >= 0) : [];
      const answers = Array.isArray(e.answers) ? e.answers.filter(isAnswer).slice(-ANSWERS_KEPT) : [];
      history[id] = {
        reads: num(e.reads), lastRead: day(e.lastRead), rest: num(e.rest), q: num(e.q),
        ...(lastSkipped ? { lastSkipped } : {}), ...(skips ? { skips } : {}), ...(lastHow ? { lastHow } : {}),
        ...(lastSet.length ? { lastSet } : {}), ...(answers.length ? { answers } : {}),
      };
```

  and in the old-cycle branch change `rest: REST_LADDER[0]` to `rest: MISS_REST`.

In `src/langdu/pick.ts`, replace the header comment and the three band constants with:

```ts
// Which passage 朗读 reads (spec 2026-10-15 §4, 2026-10-24 §3, §6): an unread school text first; then a new passage — the next
// part of a story he has started, else the new passage nearest 0.88 of his reading, ZiJi and Global Storybooks taking turns,
// else an unread easy one — except that a due passage he read 'not-well' comes first, taking turns with new ones; then any other
// due revisit; then a resting one nearest its due day; retired ones last. Nothing under 0.85 unless it is his school text.
// 下一篇 takes the next in the same order.
```

```ts
/** The stretch band (spec 2026-10-24 §3): 85–92% of a passage readable, aiming at 88%; above it "easy", below it never offered. */
export const BAND_LOW = 0.85;
export const BAND_HIGH = 0.92;
export const BAND_AIM = 0.88;
```

and in `pickOrder` replace the `due` constant with:

```ts
  const due = open
    .filter((c) => (overdue(e(c), today) ?? -1) >= 0 && readable(c))
    .sort((a, b) => overdue(e(b), today)! - overdue(e(a), today)! || a.id.localeCompare(b.id));
  // a due passage he read 'not-well' comes before anything new; the others wait behind new ones (spec 2026-10-24 §6). A history
  // from before 2026-10-24 has no lastHow: it waits like one read well
  const struggled = due.filter((c) => e(c).lastHow === 'not-well');
```

and its `return` with:

```ts
  // new and a 'not-well' revisit take turns (lastKind); every other due revisit comes after the new ones
  return [...new Set([...parentNew, ...(r.lastKind === 'revisit' ? [...fresh, ...struggled] : [...struggled, ...fresh]), ...due, ...rest, ...retired])];
```

In `src/langdu/level.ts`, replace `withinReach` and its comment with:

```ts
/** Built-in passages reach this many terms past his class's (spec 2026-10-24 §3). */
export const REACH_TERMS = 2;
/** In the pool at all: a passage's term at most two past his class's; any term when his class is unknown. */
export const withinReach = (term: string, classTerm: string | null): boolean => classTerm === null || termIndex(term) <= termIndex(classTerm) + REACH_TERMS;
```

and in `readerAt`'s comment change "limits the pool to a term ahead at most" to "limits the pool to two terms ahead at most (spec 2026-10-24 §3)".

In `src/app/SessionScreen.tsx`, until the step reports three answers (Task 7), its one answer is the read's:

```ts
        const how = readHow({ extra: false, answers: r.meaning ? [r.meaning] : reading.passage.question ? [{ correct: false }] : [] });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run src/langdu src/app/langduSession.test.tsx src/app/langduExtra.test.tsx src/parent src/talk`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/langdu src/app/SessionScreen.tsx src/app/langduSession.test.tsx src/app/langduExtra.test.tsx
git commit -m "$(cat <<'EOF'
朗读: the 85–92% band, two terms of reach, 21/45-day rest and fresh passages first (stretch spec §3, §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 4: Three questions a read (§5)

**Files:**
- Modify: `src/langdu/questions.ts`
- Test: `src/langdu/questions.test.ts`

**Interfaces:**
- Consumes: `AskedQuestion`, `QuestionKind` (Task 1); `entryOf`, `afterRead(…, asked)`, `PassageHistory.lastSet` (Task 3).
- Produces:
  - `PER_READ` (3); `ASK_ORDER: readonly QuestionKind[]` (why, main, order, word, fact).
  - `questionSet(qs: readonly AskedQuestion[], prev: readonly number[] | undefined, turn: number): number[]` — indices into `qs`, in `ASK_ORDER`.
  - `withQuestions<T extends ReadingPassage>(p: T, r: ReadingHistory): T & { asked: readonly AskedQuestion[]; askedSet: readonly number[] }` — uses the history's `lastSet` and `q` (turn).

- [ ] **Step 1: Write the failing test**

In `src/langdu/questions.test.ts`, change the `./questions` import to `import { ASK_ORDER, PER_READ, questionFor, questionSet, shuffleQuestion, withQuestion, withQuestions } from './questions';` and append:

```ts
describe('three questions a read (spec 2026-10-24 §5)', () => {
  const k = (kind: PassageQuestion['kind'], n: number): PassageQuestion => ({ q: `${kind}${n}？`, choices: ['甲', '乙', '丙', '丁'], answer: 0, kind, sentence: 0 });
  // p08's six in the order the content holds them: why word order main fact fact
  const SIX = [k('why', 0), k('word', 1), k('order', 2), k('main', 3), k('fact', 4), k('fact', 5)];
  const kinds = (set: number[]) => set.map((i) => SIX[i]!.kind);
  it('three, at most one fact, in ASK_ORDER (the deepest first: it is shown before he reads)', () => {
    for (let turn = 0; turn < 12; turn++) {
      const set = questionSet(SIX, undefined, turn);
      expect(set).toHaveLength(PER_READ);
      expect(new Set(set).size).toBe(3);
      expect(kinds(set).filter((x) => x === 'fact').length).toBeLessThanOrEqual(1);
      expect(kinds(set).map((x) => ASK_ORDER.indexOf(x))).toEqual([...kinds(set).map((x) => ASK_ORDER.indexOf(x))].sort((a, b) => a - b));
    }
  });
  it('a first read: three different kinds', () => {
    expect(new Set(kinds(questionSet(SIX, undefined, 0))).size).toBe(3);
  });
  it('the next read takes kinds the last one did not, and never its set', () => {
    let prev: number[] | undefined;
    for (let turn = 0; turn < 10; turn++) {
      const set = questionSet(SIX, prev, turn);
      if (prev) {
        expect([...set].sort()).not.toEqual([...prev].sort());
        const before = new Set(kinds(prev));
        // four kinds besides fact and two facts: at least two of the three kinds are new each time
        expect(kinds(set).filter((x) => !before.has(x)).length).toBeGreaterThanOrEqual(2);
      }
      prev = set;
    }
  });
  it('revisits go round: over six reads every question is asked', () => {
    let prev: number[] | undefined;
    const asked = new Set<number>();
    for (let turn = 0; turn < 6; turn++) {
      prev = questionSet(SIX, prev, turn);
      prev.forEach((i) => asked.add(i));
    }
    expect([...asked].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("a parent text keeps its own (none, one, up to three); an older two are both asked", () => {
    expect(questionSet([], undefined, 0)).toEqual([]);
    expect(questionSet([q1], [0], 3)).toEqual([0]);
    expect(questionSet([q1, q2], undefined, 1)).toEqual([0, 1]);
  });
  it('withQuestions: the passage with this read’s questions and their indices, from its history', () => {
    const p: ReadingPassage = { id: 'p08', title: 'x', text: 'y', source: 'ziji', fit: 1, questions: SIX };
    const first = withQuestions(p, EMPTY_READING);
    expect(first.asked).toEqual(first.askedSet.map((i) => SIX[i]));
    const r = afterRead(EMPTY_READING, 'p08', '2026-10-01', 'well', { set: first.askedSet, answers: [] });
    expect([...withQuestions(p, r).askedSet].sort()).not.toEqual([...first.askedSet].sort());
    expect(withQuestions({ ...p, questions: undefined }, EMPTY_READING)).toMatchObject({ asked: [], askedSet: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/langdu/questions.test.ts`
Expected: FAIL: `questionSet`, `withQuestions`, `PER_READ` and `ASK_ORDER` are not exported.

- [ ] **Step 3: Implement**

In `src/langdu/questions.ts`, replace the header comment with:

```ts
// 朗读's questions (spec 2026-10-15 §6, 2026-10-24 §5): three a read from a built-in passage's six, varied in kind and never the
// set the read before asked; a parent text's own; the choices shuffled at each showing so the right one's place is never learnt.
```

change the types import to `import type { AskedQuestion, QuestionKind, ReadingHistory } from '../types';`, and add before `shuffleQuestion`:

```ts
/** Questions a read asks (spec 2026-10-24 §5). */
export const PER_READ = 3;
/** The order a read's questions are asked in: the first is also shown before he reads (「读的时候想一想」), so the deepest
 *  kinds lead and a plain fact comes last. */
export const ASK_ORDER: readonly QuestionKind[] = ['why', 'main', 'order', 'word', 'fact'];
const kindOf = (q: AskedQuestion | undefined): QuestionKind | undefined => (q && 'kind' in q ? q.kind : undefined);

/** Every way to choose `k` of `n` indices, in lexical order. */
function choose(n: number, k: number, from = 0): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  for (let i = from; i <= n - k; i++) for (const rest of choose(n, k - 1, i + 1)) out.push([i, ...rest]);
  return out;
}

/**
 * This read's questions, as indices into the passage's (spec 2026-10-24 §5): three, at most one `fact`, never the set the
 * previous read asked (`prev`), taking kinds the previous read didn't where it can, then as many different kinds as it can;
 * among sets as good, the read's turn picks, so revisits go round them. Three or fewer (a parent text's, an older two): all.
 * In ASK_ORDER.
 */
export function questionSet(qs: readonly AskedQuestion[], prev: readonly number[] | undefined, turn: number): number[] {
  const byOrder = (s: number[]) => [...s].sort((a, b) => ASK_ORDER.indexOf(kindOf(qs[a])!) - ASK_ORDER.indexOf(kindOf(qs[b])!) || a - b);
  if (qs.length <= PER_READ) return qs.map((_, i) => i);
  const before = new Set((prev ?? []).map((i) => kindOf(qs[i])));
  const same = (s: number[]) => !!prev && prev.length === s.length && s.every((i) => prev.includes(i));
  const sets = choose(qs.length, PER_READ).filter((s) => s.filter((i) => kindOf(qs[i]) === 'fact').length <= 1 && !same(s));
  if (!sets.length) return byOrder(qs.slice(0, PER_READ).map((_, i) => i)); // never with six that pass the content checks
  const score = (s: number[]) => s.filter((i) => !before.has(kindOf(qs[i]))).length * 10 + new Set(s.map((i) => kindOf(qs[i]))).size;
  const top = Math.max(...sets.map(score));
  const best = sets.filter((s) => score(s) === top);
  return byOrder(best[turn % best.length]!);
}

/** The passage with this read's questions (history's last set and turn), and their indices for the history. */
export function withQuestions<T extends ReadingPassage>(p: T, r: ReadingHistory): T & { asked: readonly AskedQuestion[]; askedSet: readonly number[] } {
  const e = entryOf(r, p.id);
  const set = p.questions?.length ? questionSet(p.questions, e.lastSet, e.q) : [];
  return { ...p, asked: set.map((i) => p.questions![i]!), askedSet: set };
}

```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsc --noEmit && npx vitest run src/langdu/questions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/langdu/questions.ts src/langdu/questions.test.ts
git commit -m "$(cat <<'EOF'
朗读: three questions a read, varied in kind, never the last read's set (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 5: `speak()` at a rate (§7)

**Files:**
- Modify: `src/audio/speech.ts`, `src/audio/clipPlayer.ts`
- Test: `src/audio/speech.test.ts`, `src/audio/speechClips.test.ts`, `src/audio/clipPlayer.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `speak(text, { queue?, reading?, avoid?, endings?, alone?, rate?: number })`: `rate` is a factor on the usual speed (1 or absent: unchanged). On the iPad voice the utterance's `rate` is the usual rate × the factor (rounded to 0.01; a one- or two-character line is still a quarter slower first). On a clip, it is the source's `playbackRate`. A queued line keeps its own rate.
  - `ClipPlayer.play(steps, onStart?, rate?: number)`: each source's `playbackRate.value = rate`, the next one starting when the slowed one ends.

- [ ] **Step 1: Write the failing tests**

In `src/audio/speech.test.ts`, add inside `describe('speak', …)`, before `'does nothing where speech is unavailable'`:

```ts
  it('a rate slows (or speeds) the iPad voice by that factor, a queued line too (朗读, spec 2026-10-24 §7)', () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string; lang = ''; rate = 1; volume = 1; voice: SpeechSynthesisVoice | null = null;
      constructor(t: string) { this.text = t; }
    });
    setSpeechRate(0.8);
    speak('我爱妈妈。', { rate: 0.8 });
    speak('我爱爸爸。', { queue: true, rate: 0.9 });
    speak('河', { queue: true, rate: 0.8 });
    speak('我爱哥哥。', { queue: true });
    expect(spoken.map((u) => [u.text, u.rate])).toEqual([['我爱妈妈。', 0.64], ['我爱爸爸。', 0.72], ['河', 0.48], ['我爱哥哥。', 0.8]]);
  });
```

In `src/audio/speechClips.test.ts`, add inside `describe('speak, with clips', …)`:

```ts
  it('a rate goes to the clip player, a queued line\'s too; no rate plays as recorded (spec 2026-10-24 §7)', async () => {
    speak('大门', { rate: 0.8 });
    speak('门', { queue: true, rate: 0.9 });
    expect(player.play).toHaveBeenLastCalledWith([{ id: 'd' }], expect.any(Function), 0.8);
    calls[0]!.resolve('ended');
    await tick();
    expect(player.play).toHaveBeenLastCalledWith([{ id: 'm' }], expect.any(Function), 0.9);
    speak('门');
    expect(player.play).toHaveBeenLastCalledWith([{ id: 'm' }], expect.any(Function), 1);
  });
```

In `src/audio/clipPlayer.test.ts`, give `FakeSource` a playback rate (`class FakeSource { playbackRate = { value: 1 }; buffer: …`) and add inside `describe('clip player', …)`:

```ts
  it('a rate plays each clip that much slower, the next one starting when the slowed one ends (spec 2026-10-24 §7)', async () => {
    const { ac, player } = setup();
    const done = player.play([{ id: 'a' }, { pause: 0.3 }, { id: 'b' }], undefined, 0.8);
    await tick();
    expect(ac.sources.map((s) => s.playbackRate.value)).toEqual([0.8, 0.8]);
    expect(ac.sources.map((s) => s.started[0])).toEqual([expect.closeTo(10.02, 5), expect.closeTo(10.02 + 1 / 0.8 + 0.3, 5)]);
    ac.sources[1]!.onended!();
    expect(await done).toBe('ended');
    void player.play([{ id: 'c' }]);
    await tick();
    expect(ac.sources[2]!.playbackRate.value).toBe(1); // no rate: as recorded
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/audio`
Expected: FAIL: the utterance rates are `[0.8, 0.8, 0.6, 0.8]`, `play` is called with two arguments, and the sources keep `playbackRate` 1.

- [ ] **Step 3: Implement**

In `src/audio/clipPlayer.ts`:
- in `ClipPlayer`, replace `play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult>;` with:

```ts
  /** `rate`: the clips' playback rate (朗读's model, spec 2026-10-24 §7); 1 by default. */
  play(steps: ClipStep[], onStart?: () => void, rate?: number): Promise<PlayResult>;
```

- change `async function play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult> {` to `async function play(steps: ClipStep[], onStart?: () => void, rate = 1): Promise<PlayResult> {`;
- in its loop, replace

```ts
        src.connect(ac.destination);
        src.start(t);
        t += src.buffer.duration;
```

with

```ts
        // Web Audio has no preservesPitch: a slower clip is also a little lower (plan 2026-10-24 ruling; passages have no clips today)
        if (rate !== 1) src.playbackRate.value = rate;
        src.connect(ac.destination);
        src.start(t);
        t += src.buffer.duration / rate;
```

In `src/audio/speech.ts`:
- replace the `Line` type and its comment with:

```ts
/** A line as it is said: by clips (`steps`, saying `text`), else by the iPad voice (`voiced`, also when a clip fails); `rate`:
 *  how much slower or faster than usual (朗读's model, spec 2026-10-24 §7). */
type Line = { text: string; voiced: string; reading?: string; rate?: number };
```

- replace the first three lines of `speak` with:

```ts
export function speak(text: string, { queue = false, reading, avoid, endings, alone, rate }: { queue?: boolean; rate?: number } & SayOpts = {}): void {
  if (recordingNow()) return;
  const { steps, ...base } = said(text, { reading, avoid, endings, alone });
  const line: Line = rate !== undefined && rate !== 1 ? { ...base, rate } : base;
```

- in `speak`, change `ttsSpeak(line.voiced, { queue, reading });` to `ttsSpeak(line.voiced, { queue, reading, rate: line.rate });`;
- in `playClip`, change `void player.play(steps, () => setSpeaking(true)).then((r) => {` to `void player.play(steps, () => setSpeaking(true), line.rate ?? 1).then((r) => {` and the failed branch's `ttsSpeak(line.voiced, { queue: true, reading: line.reading })` to `ttsSpeak(line.voiced, { queue: true, reading: line.reading, rate: line.rate })`;
- in `drain`, change `else ttsSpeak(next.voiced, { queue: true, reading: next.reading });` to `else ttsSpeak(next.voiced, { queue: true, reading: next.reading, rate: next.rate });`;
- replace `ttsSpeak`'s first lines and its waiting branch so each queued text keeps its factor:

```ts
function ttsSpeak(text: string, { queue = false, reading, rate: factor = 1 }: { queue?: boolean; reading?: string; rate?: number } = {}): void {
  if (!available()) return;
  text = spokenAs(text, reading);
  const item: Said = { text, factor };
  if (waiting) {
    // A tap is waiting for Safari to finish cancelling: a queued line joins it, a new tap replaces it.
    waiting.texts = queue ? [...waiting.texts, item] : [item];
    return;
  }
```

  then in its `busy` branch replace `const w: Waiting = { texts: [text], timer: setTimeout(() => {` … `for (const t of w.texts) say(t);` with `const w: Waiting = { texts: [item], timer: setTimeout(() => {` … `for (const t of w.texts) say(t.text, true, t.factor);`, and its last line `say(text);` with `say(text, true, factor);`;
- replace the `Waiting` type with:

```ts
type Said = { text: string; factor: number };
type Waiting = { texts: Said[]; timer: ReturnType<typeof setTimeout> };
```

- change `function say(text: string, retry = true): void {` to `function say(text: string, retry = true, factor = 1): void {`, its rate line to

```ts
  u.rate = Math.round((isShortWord(text) ? rate * SHORT_WORD_PACE : rate) * factor * 100) / 100;
```

  and its retry `say(text, false);` to `say(text, false, factor);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run src/audio`
Expected: PASS (the existing rate tests still give 0.7 and `[0.6, 0.6, 0.8]`).

- [ ] **Step 5: Commit**

```bash
git add src/audio/speech.ts src/audio/clipPlayer.ts src/audio/speech.test.ts src/audio/speechClips.test.ts src/audio/clipPlayer.test.ts
git commit -m "$(cat <<'EOF'
Speech: speak() at a rate, on the iPad voice and on clips (stretch spec §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 6: The model reader's pace (§7)

**Files:**
- Modify: `src/langdu/useModelReader.ts`
- Test: `src/langdu/useModelReader.test.tsx`, `src/audio/loneReading.test.ts` (its `NEVER_LONE` key)

**Interfaces:**
- Consumes: `speak(text, { rate })` (Task 5).
- Produces:
  - `interface Pace { rate: number; gapMs: number }`; `MODEL_RATE` (0.8), `SENTENCE_GAP_MS` (700), `FIRST_LISTEN: Pace`; `REPLAY_RATE` (0.9), `REPLAY: Pace` (no gap); `AS_SPOKEN: Pace` (1, no gap).
  - `ModelReader.read(from: number, only?: boolean, pace?: Pace)` — `AS_SPOKEN` when no pace is given (the parent's Listen & confirm is unchanged). With a gap, the next sentence starts `gapMs` after one ends; there is no pause after the last. `stop()` and unmounting cancel a pause like a sentence.

- [ ] **Step 1: Write the failing tests**

In `src/langdu/useModelReader.test.tsx`, change the import to `import { FIRST_LISTEN, MODEL_RATE, REPLAY, REPLAY_RATE, SENTENCE_GAP_MS, SENTENCE_MAX_MS, START_WAIT_MS, useModelReader } from './useModelReader';`, add two buttons to `Probe` after the `stop` button:

```tsx
      <button type="button" onClick={() => m.read(0, false, FIRST_LISTEN)}>{`first${name}`}</button>
      <button type="button" onClick={() => m.read(2, true, REPLAY)}>replay</button>
```

and add before `'one reader at a time (final review I7) …'`:

```tsx
  it('the first listen: 0.8×, with 700 ms between sentences and none after the last (spec 2026-10-24 §7)', () => {
    expect([MODEL_RATE, SENTENCE_GAP_MS, REPLAY_RATE]).toEqual([0.8, 700, 0.9]);
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('first'));
    expect(speak).toHaveBeenLastCalledWith('甲。', { rate: 0.8 });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(cur()).toBe('-');
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS - 1); });
    expect(speak).toHaveBeenCalledTimes(1); // still in the pause
    act(() => { vi.advanceTimersByTime(1); });
    expect(speak).toHaveBeenLastCalledWith('乙。', { rate: 0.8 });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS); });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(all()).toBe('true'); // heard at once: no pause after the last sentence
    expect(speak).toHaveBeenCalledTimes(3);
  });
  it('stop in the pause: nothing more is read', () => {
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('first'));
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    fireEvent.click(screen.getByText('stop'));
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS * 3); });
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it('leaving in the pause says nothing more', () => {
    vi.useFakeTimers();
    vi.mocked(stopSpeaking).mockClear();
    const { unmount } = render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('first'));
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    unmount();
    expect(stopSpeaking).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS * 3); });
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it('no voice at all (none starts): the first listen still reaches the end, pauses and all', () => {
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('first'));
    act(() => { vi.advanceTimersByTime((START_WAIT_MS + SENTENCE_GAP_MS) * 3); });
    expect(speak).toHaveBeenCalledTimes(3);
    expect(all()).toBe('true');
  });
  it('a replay: 0.9×, no pause; with no pace, as the voice usually speaks', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('replay'));
    expect(speak).toHaveBeenLastCalledWith('丙。', { rate: 0.9 });
    fireEvent.click(screen.getByText('one'));
    expect(speak).toHaveBeenLastCalledWith('乙。');
  });
```

In `src/audio/loneReading.test.ts`, change the `NEVER_LONE` entry `'langdu/useModelReader.ts: list.current[i]!': 'a sentence',` to `'langdu/useModelReader.ts: line': 'a sentence',`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/langdu/useModelReader.test.tsx src/audio/loneReading.test.ts`
Expected: FAIL: `FIRST_LISTEN` and the other constants are not exported, and `loneReading` reports the stale key.

- [ ] **Step 3: Implement**

In `src/langdu/useModelReader.ts`, after `SENTENCE_MAX_MS` add:

```ts
/** How the model reads: its voice's rate (a factor on the usual) and the pause between sentences. */
export interface Pace { rate: number; gapMs: number }
/** The first read-through, before he reads (spec 2026-10-24 §7): slower, with a pause after each sentence. */
export const MODEL_RATE = 0.8;
export const SENTENCE_GAP_MS = 700;
export const FIRST_LISTEN: Pace = { rate: MODEL_RATE, gapMs: SENTENCE_GAP_MS };
/** A tapped sentence, 听老师的 on Compare, and the read-back after a missed question: a little slower, no pause. */
export const REPLAY_RATE = 0.9;
export const REPLAY: Pace = { rate: REPLAY_RATE, gapMs: 0 };
/** As the voice usually speaks (the parent's Listen & confirm). */
export const AS_SPOKEN: Pace = { rate: 1, gapMs: 0 };
```

Then:
- in `ModelReader`, replace the `read` member and its comment with:

```ts
  /** read from `from` to the end, or only that sentence, at `pace` (as the voice usually speaks unless given) */
  read: (from: number, only?: boolean, pace?: Pace) => void;
```

- change `const say = (i: number, last: number, mine: number) => {` to `const say = (i: number, last: number, mine: number, pace: Pace) => {`;
- in its `next`, replace `say(i + 1, last, mine);` with:

```ts
      if (i >= last || pace.gapMs <= 0) { say(i + 1, last, mine, pace); return; }
      // the pause between sentences (spec 2026-10-24 §7): stop() and leaving cancel it like a sentence
      const gap = setTimeout(() => say(i + 1, last, mine, pace), pace.gapMs);
      live.current = () => clearTimeout(gap);
```

- replace `speak(list.current[i]!);` with:

```ts
    const line = list.current[i]!;
    if (pace.rate === 1) speak(line);
    else speak(line, { rate: pace.rate });
```

- change `const read = (from: number, only = false) => {` to `const read = (from: number, only = false, pace: Pace = AS_SPOKEN) => {` and its last line to `say(from, only ? from : list.current.length - 1, run.current, pace);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run src/langdu/useModelReader.test.tsx src/audio/loneReading.test.ts src/parent/listen.test.tsx src/activities/langdu`
Expected: PASS (the step still reads at the usual pace: it passes no pace until Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/langdu/useModelReader.ts src/langdu/useModelReader.test.tsx src/audio/loneReading.test.ts
git commit -m "$(cat <<'EOF'
朗读: the model reads at a pace — the first listen 0.8× with 700 ms between sentences, replays 0.9× (stretch spec §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 7: The step asks three, reads back on a miss, and listens slower first (§5, §7)

**Files:**
- Modify: `src/types.ts` (`TakeAnswer`, `Recording.answers`)
- Modify: `src/langdu/pool.ts` (`asked`, `askedSet`, `LangduPassage`), `src/langdu/questions.ts` (drop `questionFor`, `withQuestion`)
- Modify: `src/activities/langdu/LangduStep.tsx`, `src/styles.css`
- Modify: `src/app/SessionScreen.tsx`
- Create: `scripts/stage-cases/langdu.ts`; Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` (they compile against the new passage shape and never crash before content is written)
- Test: `src/activities/langdu/LangduStep.test.tsx`, `src/activities/langdu/LangduStep.start.test.tsx`, Create: `src/activities/langdu/LangduStep.pace.test.tsx`; `src/app/langduSession.test.tsx`, `src/app/langduExtra.test.tsx`, `src/langdu/questions.test.ts`, `src/audio/loneReading.test.ts`

**Interfaces:**
- Consumes: `withQuestions`, `questionSet` (Task 4); `readHow({ answers })`, `afterRead(…, asked)` (Task 3); `FIRST_LISTEN`, `REPLAY`, `REPLAY_RATE` (Task 6); `speak(…, { rate })` (Task 5).
- Produces:
  - `interface TakeAnswer { kind?: QuestionKind; correct: boolean; picked: string }`; `Recording.answers?: TakeAnswer[]` (`meaning` stays readable on old takes).
  - `ReadingPassage.asked?: readonly AskedQuestion[]`, `askedSet?: readonly number[]` (no more `question`); `LangduPassage` omits `askedSet`.
  - `LangduResult = { intro; read; answers: TakeAnswer[] }` (no more `meaning`).
  - The step: `.langdu__count` (「1/3」), `.langdu__back` (the read-back in the sheet), the action 「下一题」 until the last question, then 「完成」.
  - `scripts/stage-cases/langdu.ts`: `LONGEST_OWN: Passage`, `longestOwnChars(): number`, `questionsOf(id): readonly AskedQuestion[]`, `askedOf(id): AskedQuestion[]`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/langdu/LangduStep.test.tsx`:
- after the `vi.mock('../../audio/sfx', …)` line add:

```ts
// the first listen's pause between sentences is LangduStep.pace.test's: here the model reads straight on, as these tests drive it
vi.mock('../../langdu/useModelReader', async (orig) => ({ ...(await orig<typeof import('../../langdu/useModelReader')>()), FIRST_LISTEN: { rate: 0.8, gapMs: 0 } }));
```

- change the type import to `import { DEFAULT_KID, type PassageQuestion } from '../../types';`;
- the fixture passage carries its questions as `asked`: `const passage = { id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。', source: 'parent' as const, asked: [question] };`; every `{ ...passage, question: undefined }` becomes `{ ...passage, asked: [] }`, `{ ...passage, id: 'p02', text: '我爱老师。', question: undefined }` becomes `{ …, asked: [] }`, `question: { ...question, choices: ['老师', '外婆', '小马'] }` becomes `asked: [{ ...question, choices: ['老师', '外婆', '小马'] as [string, string, string] }]`, the gsb fixture's `question };` becomes `asked: [question] };`, and `const { question: _q, ...plain } = passage;` becomes `const { asked: _q, ...plain } = passage;`;
- every `onDone` expectation's `meaning: { correct: true, picked: '妈妈' }` becomes `answers: [{ correct: true, picked: '妈妈' }]`, `meaning: { correct: false, picked: '老师' }` becomes `answers: [{ correct: false, picked: '老师' }]`, and `meaning: null` becomes `answers: []`;
- the model now reads the first listen at 0.8× and replays at 0.9×: in the day-1 test expect `speak` last called with `('我爱爸爸。', { rate: 0.8 })` and then `('我爱妈妈。', { rate: 0.8 })`; in `'after day 1 …'` with `('我爱爸爸。', { rate: 0.8 })`; in `'a tap during the first read-through …'` with `('乙乙。', { rate: 0.8 })`, `('丙丙。', { rate: 0.8 })` and finally `expect(vi.mocked(speak).mock.calls).toEqual([['甲甲。', { rate: 0.9 }]]); // that sentence only, at the replay pace`; in the 听我的 test, after 听老师的, with `('我爱爸爸。', { rate: 0.9 })`; in `'a miss shows the right choice …'` with `('我爱妈妈。', { queue: false, rate: 0.9 })`;
- add before `describe('朗读 on the stage (spec 2026-10-04 §3)', …)`:

```tsx
describe('three questions a read (spec 2026-10-24 §5)', () => {
  const text = '小明的球掉进了河里。他先找来一根长竹子。然后他把球拨到岸边。最后他拿到了球，笑了。';
  const asked: PassageQuestion[] = [
    { q: '小明为什么笑了？', choices: ['他拿回了球', '球掉进河里', '竹子断了', '他在河里玩'], answer: 0, kind: 'why', sentences: [3, 2] },
    { q: '他先做了什么？', choices: ['拿到了球', '找来竹子', '跳进河里', '回家了'], answer: 1, kind: 'order', sentence: 1 },
    { q: '球掉到哪里了？', choices: ['岸边', '河里', '竹子上', '家里'], answer: 1, kind: 'fact', sentence: 0 },
  ];
  const own = { id: 'p90', title: '捡球', text, asked };
  const choice = (zh: string) => [...document.querySelectorAll<HTMLButtonElement>('.langdu__choices .choice')].find((b) => [...b.querySelectorAll('.label__ch')].map((c) => c.textContent).join('') === zh)!;
  it('only the first shows on Listen, before he reads', () => {
    render(<LangduStep passage={own} oral={oral} kid={DEFAULT_KID} withWarmup={false} rng={() => 0.999} onDone={vi.fn()} />);
    expect(document.querySelector('.langdu__purpose')?.textContent).toContain('小明为什么笑了？');
    expect(document.querySelectorAll('.langdu__purpose')).toHaveLength(1);
  });
  it('one at a time with four choices; a miss shows the answer and reads its two sentences again, in order, at 0.9×; then on, no re-ask', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={own} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" rng={() => 0.999} onDone={onDone} />);
    expect(screen.getByText('小明为什么笑了？')).toBeTruthy();
    expect(document.querySelector('.langdu__count')?.textContent).toBe(' 1/3');
    expect(document.querySelectorAll('.langdu__choices .choice')).toHaveLength(4);
    expect(button('下一题').disabled).toBe(true);
    vi.mocked(speak).mockClear();
    fireEvent.click(choice('球掉进河里'));
    expect(await screen.findByText('答案是：他拿回了球')).toBeTruthy();
    expect(vi.mocked(speak).mock.calls).toEqual([['然后他把球拨到岸边。', { queue: false, rate: 0.9 }], ['最后他拿到了球，笑了。', { queue: true, rate: 0.9 }]]);
    expect([...document.querySelectorAll('.langdu__back p')].map((p) => [...p.querySelectorAll('.label__ch')].map((c) => c.textContent).join(''))).toEqual(['然后他把球拨到岸边。', '最后他拿到了球，笑了。']);
    fireEvent.click(button('下一题'));
    expect(screen.getByText('他先做了什么？')).toBeTruthy();
    expect(document.querySelector('.langdu__count')?.textContent).toBe(' 2/3');
    vi.mocked(speak).mockClear();
    fireEvent.click(choice('找来竹子'));
    expect(await screen.findByText('对了！')).toBeTruthy();
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(button('下一题'));
    fireEvent.click(choice('岸边'));
    expect(await screen.findByText('答案是：河里')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('小明的球掉进了河里。', { queue: false, rate: 0.9 }); // one sentence for a fact
    fireEvent.click(button('完成')); // the last question ends the step
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null, answers: [
      { kind: 'why', correct: false, picked: '球掉进河里' },
      { kind: 'order', correct: true, picked: '找来竹子' },
      { kind: 'fact', correct: false, picked: '岸边' },
    ] });
  });
  it('a double tap on 下一题 moves on once', async () => {
    render(<LangduStep passage={own} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" rng={() => 0.999} onDone={vi.fn()} />);
    fireEvent.click(choice('他拿回了球'));
    await screen.findByText('对了！');
    const next = button('下一题');
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText('他先做了什么？')).toBeTruthy();
    expect(document.querySelector('.langdu__count')?.textContent).toBe(' 2/3');
  });
  it('谢谢老师！ waits for the last question', async () => {
    render(<LangduStep passage={own} oral={oral} kid={DEFAULT_KID} withWarmup startAt="meaning" rng={() => 0.999} onDone={vi.fn()} />);
    fireEvent.click(choice('他拿回了球'));
    await screen.findByText('对了！');
    expect(screen.queryByText('谢谢老师！')).toBeNull();
    fireEvent.click(button('下一题'));
    fireEvent.click(choice('找来竹子'));
    fireEvent.click(button('下一题'));
    fireEvent.click(choice('河里'));
    expect(await screen.findByText('谢谢老师！')).toBeTruthy();
  });
});

```

In `src/activities/langdu/LangduStep.start.test.tsx`, add the same `vi.mock('../../langdu/useModelReader', …)` after its `sfx` mock.

Create `src/activities/langdu/LangduStep.pace.test.tsx`:

```tsx
import { act, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { SENTENCE_GAP_MS } from '../../langdu/useModelReader';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
afterEach(() => { act(() => setSpeaking(false)); vi.useRealTimers(); });

describe('the first listen (spec 2026-10-24 §7: "slow down the reading speed on the first read")', () => {
  it('0.8×, with 700 ms between sentences', () => {
    vi.useFakeTimers();
    render(<LangduStep passage={{ id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。' }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。', { rate: 0.8 });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS - 1); });
    expect(speak).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1); });
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。', { rate: 0.8 });
  });
});
```

In `src/app/langduSession.test.tsx`:
- add after its `sfx` mock:

```ts
// the first listen's pause between sentences is LangduStep.pace.test's: here the model reads straight on
vi.mock('../langdu/useModelReader', async (orig) => ({ ...(await orig<typeof import('../langdu/useModelReader')>()), FIRST_LISTEN: { rate: 0.8, gapMs: 0 } }));
```

- change the passageQuestions import to `import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';` and add `import { questionSet } from '../langdu/questions';`;
- every `toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。')` becomes `toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。', { rate: 0.8 })`;
- replace the test `"a revisit asks the passage's other question (spec 2026-10-15 §6)"` with:

```tsx
  it("a revisit asks its questions one after another, and the history keeps the set and his answers (spec 2026-10-24 §5, §8)", async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 5, 17) });
    await updateSettings(app.db, { activities: speakingOnly, langdu: true });
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastHow: 'not-well' } }, lastKind: 'new', lastWarmup: '2026-10-04', warmups: 1 } });
    // p01's six once its batch is written, its older two until then: the test holds either way
    const qs = PASSAGE_QUESTIONS.p01 ?? LEGACY_QUESTIONS.p01!;
    const set = questionSet(qs, undefined, 1);
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我的家'); // p01, due and read 'not-well': before anything new
    await heardAll();
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('下一步'));
    for (const [n, i] of set.entries()) {
      const q = qs[i]!;
      expect(await screen.findByText(q.q)).toBeTruthy();
      fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.langdu__choices .choice')].find((b) => [...b.querySelectorAll('.label__ch')].map((c) => c.textContent).join('') === q.choices[q.answer])!);
      fireEvent.click(await screen.findByText(n === set.length - 1 ? '完成' : '下一题'));
    }
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const e = (await getKid(app.db))!.reading.history.p01!;
    expect(e).toMatchObject({ reads: 2, lastHow: 'well', rest: 21, lastSet: set });
    expect(e.answers ?? []).toEqual(set.flatMap((i) => { const q = qs[i]!; return 'kind' in q ? [{ kind: q.kind, correct: true, at: '2026-10-05' }] : []; }));
  });
```

- rename `'his answer to the meaning question is kept with his take, for the parent'` to `'his answers are kept with his take, for the parent; a missed school-text question makes the read not-well'` and replace its last assertion with:

```ts
    expect((await listRecordings(app.db)).find((r) => r.prompt.kind === 'passage')!.answers).toEqual([{ correct: false, picked: '小马' }]);
    expect((await getKid(app.db))!.reading.history['pp:1']).toMatchObject({ lastHow: 'not-well', rest: 3 }); // 0 of 1 right
```

In `src/app/langduExtra.test.tsx`, add the same `vi.mock('../langdu/useModelReader', …)` after its `sfx` mock, and change `toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。')` to `toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。', { rate: 0.8 })`.

In `src/langdu/questions.test.ts`, delete `describe('questions in turn (spec 2026-10-15 §6)', …)` and drop `questionFor` and `withQuestion` from the import.

In `src/audio/loneReading.test.ts`, change the `NEVER_LONE` entry `'activities/langdu/LangduStep.tsx: sentences[answerAt]!': 'a sentence',` to `'activities/langdu/LangduStep.tsx: sentences[n]!': 'a sentence',`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/activities/langdu src/app/langduSession.test.tsx src/app/langduExtra.test.tsx`
Expected: FAIL: the step reads the passage's `question` (none) and finishes with `meaning`; no `下一题`; the first listen calls `speak` with no rate.

- [ ] **Step 3: Implement**

In `src/types.ts`, before `/** One answer to a built-in question (spec 2026-10-24 §8)` add:

```ts
/** His answer to one of a read's questions (spec 2026-10-24 §5): its kind (none for a parent's or an older question), whether
 *  it was right, and the choice he picked. */
export interface TakeAnswer { kind?: QuestionKind; correct: boolean; picked: string }

```

and in `Recording` replace the `meaning?` line with:

```ts
  meaning?: { correct: boolean; picked: string }; // a passage take before 2026-10-24: his answer to its one question (spec 2026-10-12 §3)
  answers?: TakeAnswer[]; // a passage take: his answers to the read's questions, in the order asked (spec 2026-10-24 §5), for the parent
```

In `src/langdu/pool.ts`, replace the header's last two lines with `// of it he can read now (fit) and its questions. pickPassage (pick.ts) chooses from it; withQuestions (questions.ts) gives the` / `// chosen one this read's three.`, replace `question?: AskedQuestion; // this read's (withQuestion)` with:

```ts
  asked?: readonly AskedQuestion[]; // this read's, in the order asked (withQuestions)
  askedSet?: readonly number[]; // their indices in `questions`, for the history
```

and `LangduPassage` with `export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story' | 'questions' | 'askedSet'>;`.

In `src/langdu/questions.ts`, delete `questionFor` and `withQuestion` (with their comments).

In `src/activities/langdu/LangduStep.tsx`:
- change the imports to `import { FIRST_LISTEN, REPLAY, REPLAY_RATE, useModelReader } from '../../langdu/useModelReader';` and `import type { AskedQuestion, KidState, OralInfo, PassageCredit, PassageWord, TakeAnswer } from '../../types';`;
- in `LangduResult`, replace `meaning` with:

```ts
  answers: TakeAnswer[]; // his answers to the read's questions, in the order asked; none on an extra round or with no questions
```

- replace `LangduStep`'s doc comment's first two lines with:

```ts
 * 朗读 (spec 2026-10-12 §3, 2026-10-15, 2026-10-24): the warm-up when due → listen and follow (slower, with a pause after each
 * sentence) → read alone → compare, one re-read → the read's questions, one at a time. The warm-up lives here; the passage's
 * parts live in PassageParts, keyed by the passage, so 下一篇 can swap the
```

- in `PassageParts`, replace the lines from `const [picked, setPicked] = useState<number | null>(null);` through the `question` memo (the `takeAudio` ref and the memo's comment between them included) with:

```ts
  const takeAudio = useRef<HTMLAudioElement>(null);
  // the read's questions (spec 2026-10-24 §5), each with its choices in a new order: the right one's place is never learnt
  const questions = useMemo<AskedQuestion[]>(() => (extra ? [] : (passage.asked ?? []).map((q) => shuffleQuestion(q, rng))), [passage.asked, extra]);
  const [at, setAt] = useState(0); // the question being asked
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TakeAnswer[]>([]);
  const question = questions[at];
  const lastQuestion = at === questions.length - 1;
```

- change `if (part === 'listen') model.read(0);` to `if (part === 'listen') model.read(0, false, FIRST_LISTEN); // the first listen: slower, a pause after each sentence (spec 2026-10-24 §7)`;
- replace `finish` with:

```ts
  const finish = (given: TakeAnswer[]) => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    model.stop();
    onDone({ read: betterTake(takes, passage.text), answers: given });
  };
```

- change `const afterReading = () => (question ? setPart('meaning') : finish(null));` to `const afterReading = () => (question ? setPart('meaning') : finish([]));`;
- replace everything from `const replay = ` through the `closing` line with:

```ts
  // a tap during the first read-through reads on from there at its pace; a sentence alone, or 听老师的, at the replay pace
  const replay = (i: number, only: boolean) => {
    takeAudio.current?.pause();
    model.read(i, only, only || model.heardAll ? REPLAY : FIRST_LISTEN);
  };

  // what a miss reads again (spec 2026-10-24 §5): a why or main question's two supporting sentences, else its one sentence
  const readBack = question ? backSentences(question, sentences) : [];
  const pick = (i: number) => {
    if (!question || picked !== null) return;
    setPicked(i);
    const right = i === question.answer;
    setAnswers((a) => [...a, { ...('kind' in question ? { kind: question.kind } : {}), correct: right, picked: question.choices[i]! }]);
    playSfx(right ? 'correct' : 'wrong');
    if (!right) readBack.forEach((n, k) => speak(sentences[n]!, { queue: k > 0, rate: REPLAY_RATE })); // read again, no re-ask
  };
  const moved = useRef(-1); // the question 下一题 last moved on from: a double tap moves on once
  const nextQuestion = () => {
    if (picked === null || moved.current === at) return;
    moved.current = at;
    if (lastQuestion) { finish(answers); return; }
    setAt((n) => n + 1);
    setPicked(null);
  };

  // 谢谢老师！ closes a warm-up day, on the step's last screen; said once, though a re-read brings Compare back (final review M1)
  const closing = !!thanksLine && ((part === 'meaning' && picked !== null && lastQuestion) || (part === 'compare' && !question));
```

- on Listen, replace the purpose line with:

```tsx
          {/* the first question he answers after reading, shown first: a purpose to read for (Therrien 2004; learning rules 2026-10-17) */}
          {questions[0] && <p class="langdu__purpose"><Label zh="读的时候想一想：" /><Label zh={questions[0].q} fade /></p>}
```

- replace the question part, from `// the question: no picture` to the `<p class="langdu__step">` line, with:

```tsx
  // the questions, one at a time: no picture, so the picture can't answer them (spec 2026-10-15 §7)
  if (!question) return null; // the meaning part only opens with a question
  const right = picked === question.answer;
  const action = lastQuestion ? '完成' : '下一题';
  const mark = (i: number) => (picked === null ? '' : i === question.answer ? (i === picked ? ' is-right' : ' is-answer') : i === picked ? ' is-wrong' : ' is-dim');
  const sheet =
    picked === null ? (
      <FeedbackSheet actionLabel={action} disabled onAction={() => {}} />
    ) : (
      <FeedbackSheet
        tone={right ? 'good' : 'oops'}
        title={right ? '对了！' : `答案是：${question.choices[question.answer]}`}
        detail={!right && readBack.length ? <div class="langdu__back">{readBack.map((n) => <p key={n}><Label zh={sentences[n]!} /></p>)}</div> : undefined}
        actionLabel={action}
        auto={false}
        onAction={nextQuestion}
      />
    );
  return (
    <Stage activity="langdu" truffle={pet} sheet={sheet}>
      <div class="langdu" key={at}>
        <p class="langdu__step"><Label zh="想一想" />{questions.length > 1 && <span class="langdu__count"> {at + 1}/{questions.length}</span>}</p>
```

- and before `/** The passage's picture (Global Storybooks):` add:

```tsx
/** The sentences a miss reads again: a why or main question's two (in passage order), else the one that answers it; none when
 *  no sentence does (a parent question whose right choice is in none). */
function backSentences(q: AskedQuestion, sentences: string[]): number[] {
  if ('sentences' in q && q.sentences) return [...q.sentences].filter((n) => n >= 0 && n < sentences.length).sort((a, b) => a - b);
  const one = answeringSentence(q, sentences);
  return one >= 0 ? [one] : [];
}

```

In `src/styles.css`, after `.langdu__step { margin: 0; font-size: 20px; font-weight: 800; }` add:

```css
.langdu__count { color: var(--muted); font-weight: 700; }
/* a missed question's read-back (spec 2026-10-24 §5): one or two sentences, each on its own line */
.langdu__back { display: flex; flex-direction: column; gap: 2px; text-align: left; }
.langdu__back p { margin: 0; }
```

and after `.langdu__choices { grid-template-columns: 1fr; max-width: 480px; }` add (measured in WebKit at all five stage sizes: a 9-character why question, four 9-character choices and two 25-character read-back sentences, every syllable showing, fit with nothing clipped):

```css
/* the read's questions (spec 2026-10-24 §5): four choices two by two, so a long question, its four choices and a two-sentence
   read-back fit one screen at every size (stage case langdu-back) */
.langdu__choices:has(> :nth-child(4)) { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 720px; gap: clamp(8px, 1.4dvh, 16px); }
.langdu__choices:has(> :nth-child(4)) .choice { min-height: clamp(56px, 9dvh, 100px); font-size: clamp(18px, 2.6dvh, 26px); padding: 4px 8px; }
.langdu__choices .choice .label__cells { flex-wrap: wrap; justify-content: center; }
.langdu__back { font-size: clamp(14px, 2dvh, 18px); font-weight: 700; }
.sheet .langdu__back .label__cells { flex-wrap: wrap; justify-content: flex-start; }
@media (max-width: 599px) { /* a phone: the count without 想一想 (Truffle's bubble says it), a smaller question */
  .langdu__step:has(+ .langdu__q) > :not(.langdu__count) { display: none; }
  .langdu__q { font-size: clamp(22px, 3dvh, 26px); }
}
```

In `src/app/SessionScreen.tsx`:
- change `import { withQuestion } from '../langdu/questions';` to `import { withQuestions } from '../langdu/questions';` and both `withQuestion(` calls (the lesson's passage and 下一篇's) to `withQuestions(`;
- in `onLangduDone`, change `...(r.meaning ? { meaning: r.meaning } : {})` to `...(r.answers.length ? { answers: r.answers } : {})`, and replace the `how` line and the `afterRead` call with:

```ts
        // 'well' at 2 of 3 (spec 2026-10-24 §5); a built-in's answers are kept by kind for the parent (§8)
        const how = readHow({ extra: false, answers: r.answers });
        const kinded = r.answers.flatMap((a) => (a.kind ? [{ kind: a.kind, correct: a.correct }] : []));
        const change = (fresh: KidState): KidState => {
          const read = afterRead(fresh.reading, reading.passage.id, reading.day, how, { set: reading.passage.askedSet ?? [], answers: kinded });
```

Create `scripts/stage-cases/langdu.ts`:

```ts
// 朗读's stage-case picks (spec 2026-10-24 §9), shared by the case page (page.tsx) and its checks (stage-cases.ts) so both
// always mean the same passage and question.
import { PASSAGES } from '../../src/content';
import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../../src/content/passageQuestions';
import { questionSet } from '../../src/langdu/questions';
import type { AskedQuestion, Passage } from '../../src/types';

const han = (s: string) => Array.from(s).filter((c) => /\p{Script=Han}/u.test(c)).length;

/** The longest of our passages: a stretch passage of up to 140 characters once they are written. */
export const LONGEST_OWN: Passage = [...PASSAGES.filter((p) => p.source === 'ziji')].sort((a, b) => han(b.text) - han(a.text) || a.id.localeCompare(b.id))[0]!;
export const longestOwnChars = (): number => han(LONGEST_OWN.text);

/** A built-in passage's questions: its six, or its older two until they are written. */
export const questionsOf = (id: string): readonly AskedQuestion[] => PASSAGE_QUESTIONS[id] ?? LEGACY_QUESTIONS[id] ?? [];

/** What a first read of it asks, in the order asked. */
export function askedOf(id: string): AskedQuestion[] {
  const qs = questionsOf(id);
  return questionSet(qs, undefined, 0).map((i) => qs[i]!);
}
```

In `scripts/stage-cases/page.tsx`:
- replace `import { PASSAGE_QUESTIONS } from '../../src/content/passageQuestions';` with `import { askedOf, LONGEST_OWN, questionsOf } from './langdu';`;
- in the `talk` case replace the `qs` and `p` lines with:

```ts
  const p = [...PASSAGES].sort((a, b) => questionsOf(b.id).map((q) => q.q).join('').length - questionsOf(a.id).map((q) => q.q).join('').length)[0]!;
  const qs = [p.id, questionsOf(p.id)] as const;
```

- in the `langdu-gsb-` case replace the `asked` line with:

```ts
  const asked = PASSAGES.flatMap((x) => questionsOf(x.id).map((q) => ({ id: x.id, q }))).sort((a, b) => (b.q.q + b.q.choices.join('')).length - (a.q.q + a.q.choices.join('')).length)[0]!;
```

  and its passage prop `{ ...shown, question: part === 'meaning' ? asked.q : PASSAGE_QUESTIONS[p.id]?.[0] }` with `{ ...shown, asked: part === 'meaning' ? [asked.q] : askedOf(p.id) }`;
- in the `langdu-` case replace `const p = [...PASSAGES.filter((x) => x.source === 'ziji')].sort((a, b) => b.text.length - a.text.length)[0]!;` with `const p = LONGEST_OWN;` and its passage prop `{ ...p, question: PASSAGE_QUESTIONS[p.id]![0] }` with `{ ...p, asked: askedOf(p.id) }`.

In `scripts/stage-cases.ts`:
- replace the `PASSAGE_QUESTIONS` and `PASSAGES` imports with `import { askedOf, LONGEST_OWN } from './stage-cases/langdu';` and delete its own `LONGEST_OWN` constant and comment;
- in the `langdu-meaning` wrong-choice block change `const asked = PASSAGE_QUESTIONS[LONGEST_OWN.id]![0]!; // shown in stored order (page.tsx's rng)` to `const asked = askedOf(LONGEST_OWN.id)[0]!; // its first question, shown in stored order (page.tsx's rng)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run src/activities/langdu src/app src/langdu src/audio src/parent src/talk`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/langdu/pool.ts src/langdu/questions.ts src/langdu/questions.test.ts src/activities/langdu src/styles.css src/app/SessionScreen.tsx src/app/langduSession.test.tsx src/app/langduExtra.test.tsx src/audio/loneReading.test.ts scripts/stage-cases/langdu.ts scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "$(cat <<'EOF'
朗读: three questions in turn with a read-back on a miss, judged at 2 of 3, and a slower first listen (stretch spec §5, §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 8: What the parent sees (§8)

**Files:**
- Modify: `src/langdu/library.ts`, `src/parent/LibraryList.tsx`, `src/parent/ListenPanel.tsx`, `src/talk/week.ts`
- Test: `src/langdu/library.test.ts`, `src/parent/langdu.test.tsx`, `src/talk/week.test.ts`

**Interfaces:**
- Consumes: `PassageHistory.answers`, `daysBetween`, `readHow` (Task 3); `TakeAnswer`, `Recording.answers` (Task 7).
- Produces:
  - `LibraryRow.qs: string` ('2/3', or '—' before any kinded answer).
  - `KIND_DAYS` (14); `KIND_LABEL: Readonly<Record<QuestionKind, string>>` (为什么 词义 顺序 主要意思 事实); `interface KindShare { kind; label; right; total; weakest }`; `kindShares(r: ReadingHistory, today: string): KindShare[]`.
  - `answersLine(answers: readonly TakeAnswer[]): string` — 'Questions: 2/3 right · missed 为什么 (picked …)'.
  - `LibraryList`: a `Qs` column and `.library__kinds` (the weakest in `.library__weakest`). The week summary counts a take with answers 'right' when it was read well.

- [ ] **Step 1: Write the failing tests**

In `src/langdu/library.test.ts`, change the imports to `import { EMPTY_READING, type Passage, type PassageAnswer, type ReadingHistory } from '../types';` and `import { answersLine, kindShares, libraryRows } from './library';`; in the first test add `qs: '—', ` before `next` in each of the three expected rows; and append:

```ts
describe("what the parent sees of his questions (spec 2026-10-24 §8)", () => {
  const a = (kind: PassageAnswer['kind'], correct: boolean, at: string): PassageAnswer => ({ kind, correct, at });
  it("each passage's last read: right of asked, 'Qs 2/3'; an earlier read's answers don't count", () => {
    const r: ReadingHistory = { ...EMPTY_READING, history: { p01: { reads: 2, lastRead: '2026-10-10', rest: 21, q: 2, answers: [a('why', false, '2026-10-01'), a('why', false, '2026-10-10'), a('word', true, '2026-10-10'), a('fact', true, '2026-10-10')] } } };
    expect(libraryRows([p('p01', '二下')], r, new Set())[0]!.qs).toBe('2/3');
  });
  it('the last 14 days by kind, in order 为什么 词义 顺序 主要意思 事实, kinds he met only; the weakest marked', () => {
    const r: ReadingHistory = { ...EMPTY_READING, history: {
      p01: { reads: 1, lastRead: '2026-10-20', rest: 21, q: 1, answers: [a('why', true, '2026-10-20'), a('main', false, '2026-10-20'), a('fact', true, '2026-10-20')] },
      p02: { reads: 1, lastRead: '2026-10-11', rest: 21, q: 1, answers: [a('why', false, '2026-10-11'), a('main', true, '2026-10-11'), a('word', true, '2026-10-11')] }, // 13 days ago: in
      p03: { reads: 1, lastRead: '2026-10-01', rest: 21, q: 1, answers: [a('order', false, '2026-10-01')] }, // 23 days ago: out
    } };
    expect(kindShares(r, '2026-10-24')).toEqual([
      { kind: 'why', label: '为什么', right: 1, total: 2, weakest: true }, // ties 主要意思 at 1/2: the first is the weakest
      { kind: 'word', label: '词义', right: 1, total: 1, weakest: false },
      { kind: 'main', label: '主要意思', right: 1, total: 2, weakest: false },
      { kind: 'fact', label: '事实', right: 1, total: 1, weakest: false },
    ]);
    expect(kindShares(EMPTY_READING, '2026-10-24')).toEqual([]);
    expect(kindShares({ ...EMPTY_READING, history: { p01: { reads: 1, lastRead: '2026-10-20', rest: 3, q: 1, answers: [a('why', false, '2026-10-20')] } } }, '2026-10-24')).toEqual([{ kind: 'why', label: '为什么', right: 0, total: 1, weakest: false }]); // one kind: nothing to compare
  });
  it("a take's answers for Listen & confirm", () => {
    expect(answersLine([{ kind: 'why', correct: false, picked: '球掉进河里' }, { kind: 'order', correct: true, picked: '找来竹子' }, { kind: 'fact', correct: true, picked: '河里' }])).toBe('Questions: 2/3 right · missed 为什么 (picked 球掉进河里)');
    expect(answersLine([{ correct: false, picked: '小马' }])).toBe('Questions: 0/1 right · missed (picked 小马)');
  });
});
```

In `src/parent/langdu.test.tsx`, replace the Library test with:

```tsx
  it('lists every built-in passage, read-only, with source, term, fit, reads, last questions, next and often skipped; then his kinds', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 15, 17) });
    const answers = [{ kind: 'why' as const, correct: false, at: '2026-10-10' }, { kind: 'main' as const, correct: true, at: '2026-10-10' }, { kind: 'fact' as const, correct: true, at: '2026-10-10' }];
    await saveKid(app.db, { ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { p01: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2, lastSkipped: '2026-10-12', skips: 3, answers } } } });
    renderWithApp(<PassagesPanel />, app);
    await screen.findByText('Library');
    const rows = [...document.querySelectorAll('.library__table tbody tr')];
    expect(rows).toHaveLength(PASSAGES.length);
    const p01 = rows.find((r) => r.textContent!.startsWith('我的家'))!;
    expect([...p01.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['我的家 · often skipped', 'ZiJi', '一下', '100%', '2', '2/3', '2026-10-17']);
    // his right share by kind over 14 days, the weakest marked (spec 2026-10-24 §8)
    expect(document.querySelector('.library__kinds')!.textContent).toBe('Last 14 days, right by kind of question: 为什么 0/1 (weakest) · 主要意思 1/1 · 事实 1/1');
    expect(document.querySelector('.library__weakest')!.textContent).toBe('为什么 0/1 (weakest)');
    expect(rows.some((r) => r.textContent!.includes('Global Storybooks'))).toBe(true);
    expect(document.querySelector('.library__table button')).toBeNull(); // read-only
  });
```

In `src/talk/week.test.ts`, in `'lessons, 朗读 days, …'` add after `await addRecording(db, take('p20', 20, null));`:

```ts
    // a take with three answers (spec 2026-10-24 §5): 1 of 3 is not read well, so 'missed'; 2 of 3 is 'right'
    await addRecording(db, { ...take('p03', 20, null), answers: [{ kind: 'why', correct: false, picked: 'a' }, { kind: 'word', correct: true, picked: 'b' }, { kind: 'fact', correct: false, picked: 'c' }] });
    await addRecording(db, { ...take('p02', 20, null), answers: [{ kind: 'why', correct: false, picked: 'a' }, { kind: 'word', correct: true, picked: 'b' }, { kind: 'fact', correct: true, picked: 'c' }] });
```

drop the `reading: […]` line from its `toMatchObject`, change `waiting: 2` to `waiting: 4`, and replace the focus assertion with:

```ts
    expect(summary.reading).toHaveLength(4);
    expect(summary.reading).toEqual(expect.arrayContaining([
      { passageId: 'p17', title: '小马', meaning: 'right' }, { passageId: 'p20', title: '我的学校', meaning: null },
      { passageId: 'p03', title: '下雨了', meaning: 'missed' }, { passageId: 'p02', title: '上学', meaning: 'right' },
    ]));
    expect(summary.focus.zh).toBe('多读：他这周的朗读题答错了。和他再读一次《下雨了》，轮流读，读完问问他故事里发生了什么。');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/langdu/library.test.ts src/parent/langdu.test.tsx src/talk/week.test.ts`
Expected: FAIL: no `qs`, `kindShares` or `answersLine`; no `Qs` cell; p03 and p02 come out `meaning: null`.

- [ ] **Step 3: Implement**

In `src/langdu/library.ts`:
- replace the header with:

```ts
// The parent's Library (spec 2026-10-15 §9, 2026-10-24 §8): every built-in passage with its source, term, his fit now, reads,
// his last read's questions right, when it is due and whether he often skips it; and his right share by kind of question.
```

- change the imports to `import type { Passage, QuestionKind, ReadingHistory, TakeAnswer } from '../types';` and `import { daysBetween, entryOf, isRetired } from './history';`;
- replace `LibraryRow` with:

```ts
/** `qs`: the last lesson read's questions right of asked ('2/3'), '—' before any (or with older questions, which keep no kind). */
export interface LibraryRow { id: string; title: string; source: 'ZiJi' | 'Global Storybooks'; term: string; fit: number; reads: number; qs: string; next: string; oftenSkipped: boolean }
```

- in `libraryRows`, replace the `return { … }` with:

```ts
      const last = (e.answers ?? []).filter((a) => a.at === e.lastRead);
      const qs = last.length ? `${last.filter((a) => a.correct).length}/${last.length}` : '—';
      return { id: p.id, title: p.title, source: p.source === 'gsb' ? 'Global Storybooks' : 'ZiJi', term: p.term, fit: passageFit(p.text, readable, p.names), reads: e.reads, qs, next, oftenSkipped: (e.skips ?? 0) >= OFTEN_SKIPPED };
```

- and append:

```ts
/** The by-kind line covers this many days, today included (spec 2026-10-24 §8). */
export const KIND_DAYS = 14;
/** How the parent sees each kind, in the line's order. */
export const KIND_LABEL: Readonly<Record<QuestionKind, string>> = { why: '为什么', word: '词义', order: '顺序', main: '主要意思', fact: '事实' };

export interface KindShare { kind: QuestionKind; label: string; right: number; total: number; weakest: boolean }

/** His answers over the last 14 days, every passage's, by kind: right of asked, kinds he met only, in KIND_LABEL's order; the
 *  lowest share is the weakest (the first of a tie), marked only when he has met two kinds or more. */
export function kindShares(r: ReadingHistory, today: string): KindShare[] {
  const recent = Object.values(r.history).flatMap((e) => e.answers ?? []).filter((a) => {
    const ago = daysBetween(a.at, today);
    return ago >= 0 && ago < KIND_DAYS;
  });
  const rows = (Object.keys(KIND_LABEL) as QuestionKind[])
    .map((kind) => {
      const of = recent.filter((a) => a.kind === kind);
      return { kind, label: KIND_LABEL[kind], right: of.filter((a) => a.correct).length, total: of.length, weakest: false };
    })
    .filter((x) => x.total > 0);
  if (rows.length < 2) return rows;
  const share = (x: KindShare) => x.right / x.total;
  const low = rows.reduce((a, b) => (share(b) < share(a) ? b : a));
  return rows.map((x) => (x === low ? { ...x, weakest: true } : x));
}

/** A take's answers for Listen & confirm: right of asked, then each miss with its kind and what he picked. */
export function answersLine(answers: readonly TakeAnswer[]): string {
  const right = answers.filter((a) => a.correct).length;
  const misses = answers.filter((a) => !a.correct).map((a) => `missed ${a.kind ? `${KIND_LABEL[a.kind]} ` : ''}(picked ${a.picked})`);
  return [`Questions: ${right}/${answers.length} right`, ...misses].join(' · ');
}
```

In `src/parent/LibraryList.tsx`:
- change the library import to `import { kindShares, libraryRows, type KindShare, type LibraryRow } from '../langdu/library';` and add `import { localDateKey } from '../lib/date';`;
- replace the component's doc comment with:

```tsx
/** The built-in passages (spec 2026-10-15 §9, 2026-10-24 §8), read-only: where each is from, its term, how much of it he reads
 *  now, his reads, his last read's questions, when it comes back, and the ones he often swaps away; under them, his right share
 *  by kind of question over 14 days, the weakest marked. */
```

- replace the `useEffect` with:

```tsx
  const [kinds, setKinds] = useState<KindShare[]>([]);
  useEffect(() => {
    void Promise.all([loadKnowledge(db), getKid(db)]).then(([know, kid]) => {
      const reading = (kid ?? DEFAULT_KID).reading;
      setRows(libraryRows(PASSAGES, reading, readerAt(know.knownChars, now(), settings).readable));
      setKinds(kindShares(reading, localDateKey(now())));
    });
  }, []);
```

- replace the intro paragraph with `<p>Built-in passages, by school term. "Reads now" is how much of each he can read today; 85–92% is his band. "Qs" is his last read's questions right. Passages come back on their own schedule.</p>`;
- add `<th>Qs</th>` before `<th>Next</th>` and `<td>{r.qs}</td>` before `<td>{r.next}</td>`;
- and after the closing `</div>` of `.library__scroll` add:

```tsx
      {kinds.length > 0 && (
        <p class="library__kinds">
          Last 14 days, right by kind of question:{' '}
          {kinds.map((k, i) => (
            <span key={k.kind}>
              {i > 0 && ' · '}
              {k.weakest ? <strong class="library__weakest"><span lang="zh-CN">{k.label}</span> {k.right}/{k.total} (weakest)</strong> : <><span lang="zh-CN">{k.label}</span> {k.right}/{k.total}</>}
            </span>
          ))}
        </p>
      )}
```

In `src/parent/ListenPanel.tsx`, add `import { answersLine } from '../langdu/library';` and replace the `r.meaning` line with:

```tsx
          {r.answers?.length ? <small class="listen__meaning">{answersLine(r.answers)}</small> : r.meaning && <small class="listen__meaning">{r.meaning.correct ? 'Meaning question: right' : `Meaning question: missed (picked ${r.meaning.picked})`}</small>}
```

In `src/talk/week.ts`, add `import { readHow } from '../langdu/history';` before `import { introducedNewWords } from '../session/runner';`, and replace the `passageId, title: …, meaning: …` line with:

```ts
    // a read's questions (spec 2026-10-24 §5): 'right' when it was read well (2 of 3), else 'missed'; an older take's one question
    passageId, title: i.titleOf(passageId) ?? passageId, meaning: r.answers?.length ? (readHow({ extra: false, answers: r.answers }) === 'well' ? 'right' : 'missed') : r.meaning ? (r.meaning.correct ? 'right' : 'missed') : null,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run src/langdu src/parent src/talk`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS. (`src/app/listLesson.slow.test.tsx` and `src/app/SessionScreen.slow.test.tsx` have each failed once under full-suite load on main and pass alone; rerun one that fails with `npx vitest run <file>` before looking further.)

- [ ] **Step 6: Commit**

```bash
git add src/langdu/library.ts src/langdu/library.test.ts src/parent/LibraryList.tsx src/parent/ListenPanel.tsx src/parent/langdu.test.tsx src/talk/week.ts src/talk/week.test.ts
git commit -m "$(cat <<'EOF'
Parent: each passage's last questions and his right share by kind, the weakest marked (stretch spec §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 9: Questions for p01–p25 (content, §5)

**Files:**
- Create: `src/content/questions/q-p01-p25.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/questions/legacy.ts` (drop p01–p25)

**Interfaces:**
- Consumes: the Content rules above; `QuestionBatch`, `QUESTION_BATCHES` (Task 1); `scripts/langdu-report.ts`, `scripts/drop-legacy.ts` (Task 2).
- Produces: `Q_P01_P25: QuestionBatch`, the first entry of `QUESTION_BATCHES`.

This batch was written and measured with this plan: every passage below passes the report with 0 problems, and the full suite passes with it in.

- [ ] **Step 1: See the passages numbered**

Run: `npx tsx scripts/langdu-report.ts p01 p02 p03 p04 p05 p06 p07 p08 p09 p10 p11 p12 p13 p14 p15 p16 p17 p18 p19 p20 p21 p22 p23 p24 p25`
Expected: each passage with its sentences numbered and `✗ pNN: no six questions yet` (exit code 1).

- [ ] **Step 2: Write the batch**

Create `src/content/questions/q-p01-p25.ts`:

```ts
// Six questions for each of our first passages, p01–p25 (spec 2026-10-24 §5; plan 2026-10-24 Task 9).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P01_P25: QuestionBatch = {
  p01: [
    { q: '我说起家人，心里怎么样？', choices: ['怕爸爸', '想做医生', '觉得很幸福', '不喜欢妹妹'], answer: 2, kind: 'why', sentences: [0, 2] },
    { q: '“医生”是做什么的？', choices: ['给人看病', '教学生读书', '在家做饭', '照顾妹妹'], answer: 0, kind: 'word', sentence: 1 },
    { q: '我先说了家里有几个人，然后说了什么？', choices: ['哥哥几岁了', '爸爸妈妈的工作', '妹妹爱吃什么', '我家在哪里'], answer: 1, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['爸爸的医院', '妈妈的学校', '哥哥和妹妹', '一家五口'], answer: 3, kind: 'main', sentences: [0, 2] },
    { q: '谁是医生？', choices: ['妈妈', '爸爸', '哥哥', '妹妹'], answer: 1, kind: 'fact', sentence: 1 },
    { q: '妈妈做什么工作？', choices: ['医生', '工人', '老师', '妹妹'], answer: 2, kind: 'fact', sentence: 1 },
  ],
  p02: [
    { q: '妈妈为什么叫我快一点？', choices: ['早饭不好吃', '怕我去学校太晚', '车子坏了', '我还没洗手'], answer: 1, kind: 'why', sentences: [2, 3] },
    { q: '“不然”是什么意思？', choices: ['吃完早饭', '先洗手', '坐车去', '要是不快一点'], answer: 3, kind: 'word', sentence: 2 },
    { q: '我先洗手，然后做什么？', choices: ['吃早饭', '起床', '坐车', '洗脸'], answer: 0, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['妈妈的早饭', '学校的车', '上学前', '七点起床了'], answer: 2, kind: 'main', sentences: [0, 3] },
    { q: '我怎么去学校？', choices: ['妈妈带我走', '坐着车', '吃完早饭走', '跑着去'], answer: 1, kind: 'fact', sentence: 3 },
    { q: '谁叫我快一点？', choices: ['妈妈', '我', '车', '学校'], answer: 0, kind: 'fact', sentence: 2 },
  ],
  p03: [
    { q: '我们为什么不能去外面玩？', choices: ['弟弟病了', '那时在下雨', '要在家看书', '球场太远'], answer: 1, kind: 'why', sentences: [0, 1] },
    { q: '“高高兴兴”是什么意思？', choices: ['有一点冷', '想听歌', '不能玩', '非常开心'], answer: 3, kind: 'word', sentence: 2 },
    { q: '下午不下雨了，我们做了什么？', choices: ['去打球', '在家看书', '去外面听歌', '去买雨伞'], answer: 0, kind: 'order', sentence: 2 },
    { q: '哪一个题目最好？', choices: ['我的弟弟', '在家里听歌', '雨停了就去玩', '去球场'], answer: 2, kind: 'main', sentences: [1, 2] },
    { q: '天气怎么样？', choices: ['下午很热', '没有下雨', '天很蓝', '又阴又冷'], answer: 3, kind: 'fact', sentence: 0 },
    { q: '谁和我在家里看书？', choices: ['弟弟', '我们', '球场', '外面'], answer: 0, kind: 'fact', sentence: 1 },
  ],
  p04: [
    { q: '我为什么喜欢跟小明做朋友？', choices: ['他八岁了', '他在别的班', '他爱笑又爱帮人', '他会做作业'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '“常常”是什么意思？', choices: ['一起', '好多次', '在一个班', '帮别人'], answer: 1, kind: 'word', sentence: 3 },
    { q: '我先说小明几岁，然后说了什么？', choices: ['他叫小明', '我们一起玩', '他的好朋友', '他喜欢笑和帮人'], answer: 3, kind: 'order', sentence: 2 },
    { q: '哪一个题目最好？', choices: ['小明这个人', '八岁的我', '一起做作业', '我的班'], answer: 0, kind: 'main', sentences: [0, 2] },
    { q: '谁很喜欢帮别人？', choices: ['我', '小明', '我们', '别人'], answer: 1, kind: 'fact', sentence: 2 },
    { q: '小明是什么人？', choices: ['一个班', '别人', '八岁', '我的好朋友'], answer: 3, kind: 'fact', sentence: 0 },
  ],
  p05: [
    { q: '我今天为什么很高兴？', choices: ['大家给我过生日', '我会唱歌了', '哥哥九岁了', '新书很好看'], answer: 0, kind: 'why', sentences: [1, 2] },
    { q: '“真高兴”是什么意思？', choices: ['想吃菜', '不想唱歌', '非常开心', '送我书'], answer: 2, kind: 'word', sentence: 3 },
    { q: '哪一件事是最后说的？', choices: ['哥哥唱生日歌', '我长大一岁', '爸爸送我新书', '妈妈做菜'], answer: 1, kind: 'order', sentence: 3 },
    { q: '哪一个题目最好？', choices: ['哥哥的歌', '妈妈做的菜', '新书', '快乐的生日'], answer: 3, kind: 'main', sentences: [0, 3] },
    { q: '爸爸送我的是什么？', choices: ['一首歌', '一个书包', '一本书', '一盘菜'], answer: 2, kind: 'fact', sentence: 1 },
    { q: '谁给我唱生日歌？', choices: ['妈妈', '哥哥', '爸爸', '我'], answer: 1, kind: 'fact', sentence: 2 },
  ],
  p06: [
    { q: '弟弟听了医生的话，为什么笑了？', choices: ['他想喝水', '知道病会好', '妈妈来了', '头很热'], answer: 1, kind: 'why', sentences: [2, 3] },
    { q: '“没关系”在这里是什么意思？', choices: ['不用怕', '要去医院', '头很热', '多睡觉'], answer: 0, kind: 'word', sentence: 2 },
    { q: '到了那里以后，谁先做了什么？', choices: ['弟弟笑了', '头很热', '多喝水', '医生看了看他'], answer: 3, kind: 'order', sentence: 2 },
    { q: '哪一个题目最好？', choices: ['妈妈的医院', '多喝水', '去看病', '弟弟爱笑'], answer: 2, kind: 'main', sentences: [0, 2] },
    { q: '谁送弟弟去医院？', choices: ['妈妈和我', '医生', '医生和我', '弟弟'], answer: 0, kind: 'fact', sentence: 1 },
    { q: '医生说要多做什么？', choices: ['吃饭和睡觉', '喝水和睡觉', '喝水和看书', '去医院'], answer: 1, kind: 'fact', sentence: 2 },
  ],
  p07: [
    { q: '妈妈为什么问我？', choices: ['米没有买到', '我在吃水果', '她想给我买东西', '商店关门了'], answer: 2, kind: 'why', sentences: [0, 2] },
    { q: '“东西”在这里是什么意思？', choices: ['吃的和用的', '东边和西边', '妈妈买的', '一个商店'], answer: 0, kind: 'word', sentence: 0 },
    { q: '哪一件事最先发生？', choices: ['去商店', '买了米', '新书包', '妈妈问我'], answer: 0, kind: 'order', sentence: 0 },
    { q: '哪一个题目最好？', choices: ['牛奶和水果', '我的新书', '商店的米', '买了很多东西'], answer: 3, kind: 'main', sentences: [0, 1] },
    { q: '我想要什么？', choices: ['牛奶', '新书包', '水果', '鸡蛋'], answer: 1, kind: 'fact', sentence: 3 },
    { q: '我们去哪里买东西？', choices: ['水果店', '一家商店', '书包店', '牛奶店'], answer: 1, kind: 'fact', sentence: 0 },
  ],
  p08: [
    { q: '我为什么想坐飞机去？', choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远', '门口看不见星星'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '爷爷说的“很远很远”，是什么意思？', choices: ['一点也不远', '非常非常远', '有一点远', '就在门口'], answer: 1, kind: 'word', sentence: 2 },
    { q: '我和爷爷在门口做了什么以后，我才想坐飞机？', choices: ['看星星', '坐飞机', '长大了', '吃晚饭'], answer: 0, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['爷爷的新飞机', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'], answer: 3, kind: 'main', sentences: [1, 3] },
    { q: '我们坐在哪里？', choices: ['门口', '天上', '飞机', '星星'], answer: 0, kind: 'fact', sentence: 1 },
    { q: '谁说星星很远？', choices: ['我', '爷爷', '星星', '飞机'], answer: 1, kind: 'fact', sentence: 2 },
  ],
  p09: [
    { q: '老师为什么说我写得很好？', choices: ['我写了很多字', '大字很好看', '天天写汉字', '我听话，很认真'], answer: 3, kind: 'why', sentences: [1, 3] },
    { q: '“认真”是什么意思？', choices: ['用心去做', '写得很大', '坐得很高', '写两个字'], answer: 0, kind: 'word', sentence: 1 },
    { q: '我写了“大”，然后又写了什么？', choices: ['“大”字', '“天”字', '汉字', '“好”字'], answer: 1, kind: 'order', sentence: 2 },
    { q: '这个故事主要说什么？', choices: ['大字和小字', '老师的汉字', '我学会写字', '坐好不动'], answer: 2, kind: 'main', sentences: [0, 3] },
    { q: '谁教我们写汉字？', choices: ['老师', '我们', '我', '我和老师'], answer: 0, kind: 'fact', sentence: 0 },
    { q: '写字的时候，我们怎么做？', choices: ['写得很好', '坐好，要认真', '写汉字', '站着写'], answer: 1, kind: 'fact', sentence: 1 },
  ],
  p10: [
    { q: '我为什么问小鸟明天会不会来？', choices: ['我很想和它做朋友', '小鸟会唱歌', '树上很好玩', '它飞得很远'], answer: 0, kind: 'why', sentences: [2, 3] },
    { q: '“飞来飞去”是什么意思？', choices: ['飞走了', '在树上唱歌', '这边飞，那边飞', '跟我一起玩'], answer: 2, kind: 'word', sentence: 1 },
    { q: '我想跟它一起玩，后来怎么了？', choices: ['小鸟唱歌', '小鸟飞来', '我上了树', '小鸟飞走'], answer: 3, kind: 'order', sentence: 2 },
    { q: '哪一个题目最好？', choices: ['会唱歌的树', '飞走的小鸟', '明天的朋友', '我的一只鸟'], answer: 1, kind: 'main', sentences: [2, 3] },
    { q: '小鸟在哪里？', choices: ['在我手上', '在天上', '在歌里', '在树上'], answer: 3, kind: 'fact', sentence: 0 },
    { q: '小鸟还会做什么？', choices: ['一起玩', '飞走了', '唱歌', '飞来飞去'], answer: 2, kind: 'fact', sentence: 1 },
  ],
  p11: [
    { q: '房间不大，我为什么还很喜欢它？', choices: ['房间里有床', '能在这里读书', '桌子很大', '书都是新的'], answer: 1, kind: 'why', sentences: [3, 4] },
    { q: '“旁边”是什么意思？', choices: ['桌子前面', '床的上面', '房间外面', '近近的地方'], answer: 3, kind: 'word', sentence: 2 },
    { q: '我坐下来，看完书以后做什么？', choices: ['写作业', '看书', '上床', '有很多书'], answer: 0, kind: 'order', sentence: 3 },
    { q: '哪一个题目最好？', choices: ['一张大床', '很多书', '看书的地方', '桌子的前面'], answer: 2, kind: 'main', sentences: [3, 4] },
    { q: '桌子在哪里？', choices: ['床的旁边', '房间里', '桌子前面', '床上面'], answer: 0, kind: 'fact', sentence: 2 },
    { q: '房间里有什么？', choices: ['桌子和球', '书和小狗', '只有一张床', '床、桌子和书'], answer: 3, kind: 'fact', sentence: 1 },
  ],
  p12: [
    { q: '奶奶为什么笑了？', choices: ['桌上有肉', '鸡蛋很好吃', '大家吃完了', '我爱吃她做的菜'], answer: 3, kind: 'why', sentences: [2, 3] },
    { q: '“快快长高”是什么意思？', choices: ['吃得很快', '早一点长大', '跑得很快', '坐得很高'], answer: 1, kind: 'word', sentence: 3 },
    { q: '我们坐在一起以后，先做什么？', choices: ['吃饭', '笑', '长高', '做菜'], answer: 0, kind: 'order', sentence: 0 },
    { q: '哪一个题目最好？', choices: ['鸡蛋和肉', '奶奶的米', '开心的一餐', '快快长高'], answer: 2, kind: 'main', sentences: [0, 3] },
    { q: '中午，我们在做什么？', choices: ['奶奶做菜', '全家一起吃饭', '我们长高', '吃鸡蛋'], answer: 1, kind: 'fact', sentence: 0 },
    { q: '桌上有什么？', choices: ['饭、蛋、肉和菜', '米饭和水果', '鸡蛋和牛奶', '肉和汤'], answer: 0, kind: 'fact', sentence: 1 },
  ],
  p13: [
    { q: '我为什么喝了一大杯水？', choices: ['同学给我水', '球场很热', '跑得太累', '下课了'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '“跑来跑去”是什么意思？', choices: ['这里跑，那里跑', '跑回去', '去打球', '跑得很久'], answer: 0, kind: 'word', sentence: 1 },
    { q: '我喝完水以后，做了什么？', choices: ['去球场', '又去打球', '下课了', '喝了一杯水'], answer: 1, kind: 'order', sentence: 3 },
    { q: '哪一个题目最好？', choices: ['一大杯水', '同学的球', '累坏的我', '球场上的我们'], answer: 3, kind: 'main', sentences: [0, 1] },
    { q: '下课了，同学们去哪里？', choices: ['打球的地方', '喝水的地方', '上课的地方', '回家的路上'], answer: 0, kind: 'fact', sentence: 0 },
    { q: '我跑了很久，觉得怎么样？', choices: ['想打球', '有点累', '不想跑', '很想喝水'], answer: 1, kind: 'fact', sentence: 2 },
  ],
  p14: [
    { q: '我在车上为什么站着？', choices: ['每个位子都有人', '学校很远', '同学在等我', '我想看门口'], answer: 0, kind: 'why', sentences: [1, 2] },
    { q: '“天天”是什么意思？', choices: ['有一天', '星期天', '今天早上', '每一天'], answer: 3, kind: 'word', sentence: 1 },
    { q: '下了车以后，我看见了什么？', choices: ['同学在门口等我', '车上人很多', '公共汽车', '我家很远'], answer: 0, kind: 'order', sentence: 3 },
    { q: '这个故事主要说什么？', choices: ['同学的家', '汽车的门口', '我每天怎样上学', '学校的朋友'], answer: 2, kind: 'main', sentences: [1, 3] },
    { q: '我怎么去学校？', choices: ['走路去', '坐公共汽车', '站着', '到学校'], answer: 1, kind: 'fact', sentence: 1 },
    { q: '谁在门口等我？', choices: ['我家', '学校', '公共汽车', '同学'], answer: 3, kind: 'fact', sentence: 3 },
  ],
  p15: [
    { q: '我为什么说谢谢？', choices: ['穿了新衣服', '拿到了红包', '去了奶奶家', '大家很高兴'], answer: 1, kind: 'why', sentences: [1, 2] },
    { q: '“红包”是什么东西？', choices: ['红色的衣服', '新年的书包', '爷爷的包', '红色的小纸包'], answer: 3, kind: 'word', sentence: 2 },
    { q: '我们穿上新衣服以后，去了哪里？', choices: ['爷爷奶奶家', '新衣服', '红包', '我们家'], answer: 0, kind: 'order', sentence: 1 },
    { q: '这个故事主要说什么？', choices: ['爷爷的衣服', '谢谢奶奶', '新年去拜年', '红色的包'], answer: 2, kind: 'main', sentences: [0, 1] },
    { q: '谁给我们红包？', choices: ['爷爷奶奶', '我们', '大家', '我'], answer: 0, kind: 'fact', sentence: 2 },
    { q: '大家觉得怎么样？', choices: ['想回家', '很想穿新衣', '不想去', '非常开心'], answer: 3, kind: 'fact', sentence: 3 },
  ],
  p16: [
    { q: '我为什么帮妈妈？', choices: ['我想吃菜', '她一个人做不完', '星期天没事做', '我长大了'], answer: 1, kind: 'why', sentences: [0, 1] },
    { q: '“做事”在这里是什么意思？', choices: ['洗菜和做饭', '玩一天', '长大', '听妈妈说'], answer: 0, kind: 'word', sentence: 1 },
    { q: '我帮妈妈洗完菜，接着还帮了什么？', choices: ['做饭', '洗菜', '做事', '长大'], answer: 0, kind: 'order', sentence: 1 },
    { q: '这个故事主要说什么？', choices: ['妈妈的星期天', '洗菜和吃饭', '我是个好帮手', '妈妈长大了'], answer: 2, kind: 'main', sentences: [1, 2] },
    { q: '妈妈说我怎么了？', choices: ['很忙', '很开心', '听了', '长大了'], answer: 3, kind: 'fact', sentence: 2 },
    { q: '我听了妈妈的话，觉得怎么样？', choices: ['很忙', '长大了', '很开心', '洗菜'], answer: 2, kind: 'fact', sentence: 3 },
  ],
  p17: [
    { q: '小马为什么说“谢谢您”？', choices: ['它跑得很快', '它喜欢在外面', '牛爷爷带它回家', '天天有人和它玩'], answer: 2, kind: 'why', sentences: [1, 2] },
    { q: '“跑来跑去”是什么意思？', choices: ['跑得太远', '这里跑，那里跑', '找不到家', '在家里'], answer: 1, kind: 'word', sentence: 0 },
    { q: '小马跑得太远以后，怎么了？', choices: ['找不到家了', '跑得太远了', '天天在外面', '谢谢您'], answer: 0, kind: 'order', sentence: 1 },
    { q: '这个故事主要说什么？', choices: ['牛爷爷的家', '跑得快的马', '外面的天', '走丢的小马'], answer: 3, kind: 'main', sentences: [1, 2] },
    { q: '小马说了什么？', choices: ['找不到家了', '跑来跑去', '谢谢您', '我想回家'], answer: 2, kind: 'fact', sentence: 2 },
    { q: '小马天天在哪里跑？', choices: ['家外面', '家里面', '牛爷爷家里', '很远的山上'], answer: 0, kind: 'fact', sentence: 0 },
  ],
  p18: [
    { q: '风为什么说太阳了不起？', choices: ['风吹得很大', '人们很冷', '天热了', '大家不冷了'], answer: 3, kind: 'why', sentences: [1, 2] },
    { q: '“了不起”是什么意思？', choices: ['非常好', '起不来', '不能吹', '力气小'], answer: 0, kind: 'word', sentence: 3 },
    { q: '风大大地吹以后，发生了什么？', choices: ['太阳出来了', '人们都很冷', '天热了', '风停了'], answer: 0, kind: 'order', sentence: 2 },
    { q: '这个故事主要说什么？', choices: ['风的朋友', '谁更有力', '太阳下山', '人们怕冷'], answer: 1, kind: 'main', sentences: [0, 3] },
    { q: '风吹的时候，人们觉得怎么样？', choices: ['很热', '高兴', '很冷', '力气大'], answer: 2, kind: 'fact', sentence: 1 },
    { q: '最后，谁说了话？', choices: ['太阳', '风', '人们', '天'], answer: 1, kind: 'fact', sentence: 3 },
  ],
  p19: [
    { q: '我为什么很快地做好作业？', choices: ['妈妈要看电视', '作业很少', '想早点去看小马', '我想唱歌'], answer: 2, kind: 'why', sentences: [1, 2] },
    { q: '“跟着唱”是什么意思？', choices: ['和小马一起唱', '先做作业', '看电视', '自己写歌'], answer: 0, kind: 'word', sentence: 3 },
    { q: '看电视以前，妈妈要我怎么样？', choices: ['晚饭后', '先做作业', '跟着唱', '去唱歌'], answer: 1, kind: 'order', sentence: 1 },
    { q: '这个故事主要说什么？', choices: ['小马唱的歌', '妈妈的晚饭', '电视里的我', '先学习后玩'], answer: 3, kind: 'main', sentences: [1, 2] },
    { q: '电视里，谁在唱歌？', choices: ['小马', '妈妈', '我', '电视'], answer: 0, kind: 'fact', sentence: 3 },
    { q: '我什么时候想看电视？', choices: ['做作业以前', '吃完晚饭', '唱歌的时候', '妈妈说话后'], answer: 1, kind: 'fact', sentence: 0 },
  ],
  p20: [
    { q: '我为什么喜欢我的学校？', choices: ['班上只有三个人', '学校很小', '没有球场', '它又大又好玩'], answer: 3, kind: 'why', sentences: [0, 1] },
    { q: '“同学”是什么意思？', choices: ['一起上课的人', '学校的老师', '球场上的树', '花和树'], answer: 0, kind: 'word', sentence: 2 },
    { q: '我先说学校有树和花，然后说学校里有什么？', choices: ['一个大球场', '三十个同学', '很多树和花', '我的老师'], answer: 0, kind: 'order', sentence: 1 },
    { q: '这个故事主要说什么？', choices: ['三班的老师', '学校的样子', '球场上的花', '三十个人'], answer: 1, kind: 'main', sentences: [0, 3] },
    { q: '学校里有什么？', choices: ['三十个同学', '树和花', '大球场', '二年级'], answer: 2, kind: 'fact', sentence: 1 },
    { q: '我们班有什么？', choices: ['一个大球场', '三十个同学', '很多树和花', '老师和同学'], answer: 1, kind: 'fact', sentence: 2 },
  ],
  p21: [
    { q: '我为什么喜欢新老师？', choices: ['她对我们很好', '班上有三十人', '她找到座位', '她读二年级'], answer: 0, kind: 'why', sentences: [2, 3] },
    { q: '“温和”是什么意思？', choices: ['很大声', '说话轻又好听', '读课文', '一起去玩'], answer: 1, kind: 'word', sentence: 2 },
    { q: '第一天，老师帮我们找座位，然后做什么？', choices: ['下课去操场', '开始新学年', '教我们读课文', '和新朋友玩'], answer: 2, kind: 'order', sentence: 3 },
    { q: '这个故事主要说什么？', choices: ['新的操场', '三十个同学', '老师的课文', '二年级第一天'], answer: 3, kind: 'main', sentences: [0, 3] },
    { q: '下课了，我和谁一起去操场玩？', choices: ['新朋友', '新老师', '三十个同学', '老师'], answer: 0, kind: 'fact', sentence: 4 },
    { q: '我们的班怎么样？', choices: ['很亲切', '很大', '很温和', '很新'], answer: 1, kind: 'fact', sentence: 1 },
  ],
  p22: [
    { q: '婆婆为什么给我红包？', choices: ['我去看舞狮', '我贴了福字', '我说了新年好话', '我吃了很多'], answer: 2, kind: 'why', sentences: [4, 5] },
    { q: '“大吉大利”是什么意思？', choices: ['样样都好', '很大的红包', '新年快乐', '很多舞狮'], answer: 0, kind: 'word', sentence: 4 },
    { q: '看完舞狮回来以后，我做了什么？', choices: ['贴福字', '向婆婆拜年', '全家吃饭', '跑下去看'], answer: 1, kind: 'order', sentence: 4 },
    { q: '这个故事主要说什么？', choices: ['楼下的狮子', '一个红包', '门上的字', '热闹的新年'], answer: 3, kind: 'main', sentences: [0, 4] },
    { q: '晚上，全家在做什么？', choices: ['一同吃饭', '看舞狮', '贴福字', '拜年'], answer: 0, kind: 'fact', sentence: 2 },
    { q: '我帮婆婆贴什么？', choices: ['红包', '新年', '福字', '舞狮'], answer: 2, kind: 'fact', sentence: 1 },
  ],
  p23: [
    { q: '王阿姨为什么说我是好帮手？', choices: ['我放碗还递茶', '我做了鸡', '我吃了很多', '我会做菜'], answer: 0, kind: 'why', sentences: [1, 2] },
    { q: '“尝了一口”是什么意思？', choices: ['喝了一杯茶', '吃一点试试', '放到桌上', '做了一只鸡'], answer: 1, kind: 'word', sentence: 3 },
    { q: '客人到了以后，我做了什么？', choices: ['放好筷子', '帮妈妈做菜', '给大家递茶', '吃了鸡'], answer: 2, kind: 'order', sentence: 2 },
    { q: '这个故事主要说什么？', choices: ['王叔叔的鸡', '一杯好茶', '妈妈的盘子', '我做小帮手'], answer: 3, kind: 'main', sentences: [1, 4] },
    { q: '谁尝了妈妈做的鸡？', choices: ['王叔叔', '王阿姨', '客人', '妈妈'], answer: 0, kind: 'fact', sentence: 3 },
    { q: '我把什么放到桌上？', choices: ['一杯茶', '碗、盘子和筷子', '妈妈做的鸡', '鸡和茶'], answer: 1, kind: 'fact', sentence: 1 },
  ],
  p24: [
    { q: '我为什么拿出彩色笔？', choices: ['草地太绿了', '小鸟在唱歌', '爸爸要写字', '要画下公园的美'], answer: 3, kind: 'why', sentences: [1, 6] },
    { q: '“颜色”是什么意思？', choices: ['红黄蓝这些', '一棵大树', '画画的笔', '一只小狗'], answer: 0, kind: 'word', sentence: 1 },
    { q: '我最后做了什么？', choices: ['去公园', '把它们画下来', '看小狗跑', '听小鸟唱歌'], answer: 1, kind: 'order', sentence: 6 },
    { q: '这个故事主要说什么？', choices: ['白色的小狗', '黑色的小鸟', '画出美丽的公园', '爸爸的笔'], answer: 2, kind: 'main', sentences: [1, 6] },
    { q: '草地上的小狗什么样？', choices: ['白白的', '黑黑的', '黄黄的', '绿绿的'], answer: 0, kind: 'fact', sentence: 4 },
    { q: '树上有什么？', choices: ['一只白色的小狗', '一只黑色的小鸟', '红花和黄花', '一棵大树'], answer: 1, kind: 'fact', sentence: 5 },
  ],
  p25: [
    { q: '我们为什么跑上三楼？', choices: ['二楼没有人', '怕老师等太久', '想去美术室', '班长在三楼'], answer: 1, kind: 'why', sentences: [2, 4] },
    { q: '“已经”是什么意思？', choices: ['早就', '就要', '马上', '不远'], answer: 0, kind: 'word', sentence: 4 },
    { q: '问了班长以后，我们做了什么？', choices: ['跑上三楼', '走到一楼', '走到二楼', '去美术室'], answer: 0, kind: 'order', sentence: 4 },
    { q: '这个故事主要说什么？', choices: ['我的好朋友', '班长的美术课', '找教室的路', '三楼的老师'], answer: 2, kind: 'main', sentences: [1, 2] },
    { q: '音乐室在哪里？', choices: ['一楼', '二楼', '四楼', '三楼'], answer: 3, kind: 'fact', sentence: 3 },
    { q: '我们问了谁？', choices: ['老师', '班长', '好朋友', '音乐室'], answer: 1, kind: 'fact', sentence: 2 },
  ],
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P01_P25 } from './questions/q-p01-p25';` after the legacy import and make the batches `export const QUESTION_BATCHES: readonly QuestionBatch[] = [Q_P01_P25];`.

- [ ] **Step 3: Drop their older questions**

Run: `npx tsx scripts/drop-legacy.ts p01-p25`
Expected: `25 passages' older questions dropped`.

- [ ] **Step 4: Run the gate**

Run: `npx tsx scripts/langdu-report.ts p01 p02 p03 p04 p05 p06 p07 p08 p09 p10 p11 p12 p13 p14 p15 p16 p17 p18 p19 p20 p21 p22 p23 p24 p25`
Expected: `25 passages, 0 problems`.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the coverage test now sees p01–p25 on their six and the rest on their older two).

- [ ] **Step 5: Commit**

```bash
git add src/content/questions src/content/passageQuestions.ts
git commit -m "$(cat <<'EOF'
朗读 content: six questions each for p01–p25 (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 10: Questions for p26–p50 (content, §5)

**Files:**
- Create: `src/content/questions/q-p26-p50.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/questions/legacy.ts` (drop p26–p50)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `QuestionBatch` (Task 1); `scripts/langdu-report.ts`, `scripts/drop-legacy.ts` (Task 2).
- Produces: `Q_P26_P50: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P01_P25`.

p26–p50 are 二上 and 二下 scenes of 50–110 characters with 3–7 sentences: short passages need inference for `why` and paraphrase for `main` (see p08 and the p01–p25 batch for how a 4-sentence passage carries six).

- [ ] **Step 1: See the passages numbered**

Run: `npx tsx scripts/langdu-report.ts p26 p27 p28 p29 p30 p31 p32 p33 p34 p35 p36 p37 p38 p39 p40 p41 p42 p43 p44 p45 p46 p47 p48 p49 p50`
Expected: 25 passages, each with its sentences numbered from 0 and `✗ … no six questions yet` (exit code 1). Read each passage before writing for it.

- [ ] **Step 2: Start the batch and register it**

Create `src/content/questions/q-p26-p50.ts`:

```ts
// Six questions for each of p26–p50 (spec 2026-10-24 §5; plan 2026-10-24 Task 10).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P26_P50: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P26_P50 } from './questions/q-p26-p50';` with the other batch imports and add `Q_P26_P50` to `QUESTION_BATCHES` after `Q_P01_P25`.

- [ ] **Step 3: Write six questions for every passage**

For each passage, add an entry `<id>: [ …six… ],` in id order (`pNN: [`), following the Content rules: why, word, order, main and two more; `answer` spread over 0–3 (no index more than twice); `sentence`/`sentences` by the report's numbers. Write a few passages, run the report on them, fix what it flags, go on.

Run after each few: `npx tsx scripts/langdu-report.ts <the ids written so far>`
Expected at the end of the step: `25 passages, 0 problems` for `npx tsx scripts/langdu-report.ts p26 p27 p28 p29 p30 p31 p32 p33 p34 p35 p36 p37 p38 p39 p40 p41 p42 p43 p44 p45 p46 p47 p48 p49 p50`.

- [ ] **Step 4: Drop their older questions**

Run: `npx tsx scripts/drop-legacy.ts p26-p50`
Expected: `25 passages' older questions dropped`.

- [ ] **Step 5: Run the gate**

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/questions src/content/passageQuestions.ts
git commit -m "$(cat <<'EOF'
朗读 content: six questions each for p26–p50 (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 11: Questions for p51–p73 (content, §5)

**Files:**
- Create: `src/content/questions/q-p51-p73.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/questions/legacy.ts` (drop p51–p73)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `QuestionBatch` (Task 1); `scripts/langdu-report.ts`, `scripts/drop-legacy.ts` (Task 2).
- Produces: `Q_P51_P73: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P26_P50`.

p51–p73 are 二下 and 三上 stories of 90–110 characters: plenty of events for `order`, and their problems give `why` questions.

- [ ] **Step 1: See the passages numbered**

Run: `npx tsx scripts/langdu-report.ts p51 p52 p53 p54 p55 p56 p57 p58 p59 p60 p61 p62 p63 p64 p65 p66 p67 p68 p69 p70 p71 p72 p73`
Expected: 23 passages, each with its sentences numbered from 0 and `✗ … no six questions yet` (exit code 1). Read each passage before writing for it.

- [ ] **Step 2: Start the batch and register it**

Create `src/content/questions/q-p51-p73.ts`:

```ts
// Six questions for each of p51–p73 (spec 2026-10-24 §5; plan 2026-10-24 Task 11).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P51_P73: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P51_P73 } from './questions/q-p51-p73';` with the other batch imports and add `Q_P51_P73` to `QUESTION_BATCHES` after `Q_P26_P50`.

- [ ] **Step 3: Write six questions for every passage**

For each passage, add an entry `<id>: [ …six… ],` in id order (`pNN: [`), following the Content rules: why, word, order, main and two more; `answer` spread over 0–3 (no index more than twice); `sentence`/`sentences` by the report's numbers. Write a few passages, run the report on them, fix what it flags, go on.

Run after each few: `npx tsx scripts/langdu-report.ts <the ids written so far>`
Expected at the end of the step: `23 passages, 0 problems` for `npx tsx scripts/langdu-report.ts p51 p52 p53 p54 p55 p56 p57 p58 p59 p60 p61 p62 p63 p64 p65 p66 p67 p68 p69 p70 p71 p72 p73`.

- [ ] **Step 4: Drop their older questions**

Run: `npx tsx scripts/drop-legacy.ts p51-p73`
Expected: `23 passages' older questions dropped`.

- [ ] **Step 5: Run the gate**

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/questions src/content/passageQuestions.ts
git commit -m "$(cat <<'EOF'
朗读 content: six questions each for p51–p73 (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 12: Questions for the 15 Global Storybooks chunks (content, §5)

**Files:**
- Create: `src/content/questions/q-gsb.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/questions/legacy.ts` (drop the 15 Global Storybooks chunks)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `QuestionBatch` (Task 1); `scripts/langdu-report.ts`, `scripts/drop-legacy.ts` (Task 2).
- Produces: `Q_GSB: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P51_P73`.

The chunks are list-like pages (「我在唱歌。她在挥手。」) and story parts. A list still has an order (what comes first, what comes last) and a main idea (what all the lines are about); `why` asks for a feeling or reason the pages imply. Transliterated names (卡莱) are characters of the passage, so choices may use them. gsb:0089-2 has two sentences: its `why`/`main` use `sentences: [0, 1]`.

- [ ] **Step 1: See the passages numbered**

Run: `npx tsx scripts/langdu-report.ts gsb`
Expected: 15 passages, each with its sentences numbered from 0 and `✗ … no six questions yet` (exit code 1). Read each passage before writing for it.

- [ ] **Step 2: Start the batch and register it**

Create `src/content/questions/q-gsb.ts`:

```ts
// Six questions for each of the 15 Global Storybooks chunks (spec 2026-10-24 §5; plan 2026-10-24 Task 12).
import type { QuestionBatch } from '../passageQuestions';

export const Q_GSB: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_GSB } from './questions/q-gsb';` with the other batch imports and add `Q_GSB` to `QUESTION_BATCHES` after `Q_P51_P73`.

- [ ] **Step 3: Write six questions for every passage**

For each passage, add an entry `<id>: [ …six… ],` in id order (quoted ids, e.g. `'gsb:0001-1': [`), following the Content rules: why, word, order, main and two more; `answer` spread over 0–3 (no index more than twice); `sentence`/`sentences` by the report's numbers. Write a few passages, run the report on them, fix what it flags, go on.

Run after each few: `npx tsx scripts/langdu-report.ts <the ids written so far>`
Expected at the end of the step: `15 passages, 0 problems` for `npx tsx scripts/langdu-report.ts gsb`.

- [ ] **Step 4: Drop their older questions**

Run: `npx tsx scripts/drop-legacy.ts gsb`
Expected: `15 passages' older questions dropped`.

- [ ] **Step 5: Run the gate**

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/questions src/content/passageQuestions.ts
git commit -m "$(cat <<'EOF'
朗读 content: six questions each for the 15 Global Storybooks chunks (stretch spec §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 13: 二下 stretch passages p74–p88, with their questions (content, §4, §5)

**Files:**
- Modify: `src/content/passages/二下.json` (append p74–p88 in id order)
- Create: `src/content/questions/q-p74-p88.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `STRETCH_PASSAGES` and the passage files (Task 2); `QuestionBatch` (Task 1); `scripts/langdu-report.ts` (Task 2).
- Produces: 15 passages at 二下 (8 stories, 4 factual pieces, 3 fables or scenes), and `Q_P74_P88: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_GSB`.

The topics keep the 60 passages apart (no two alike, across all five passage tasks). Titles are the writer's; the topic is the brief.

| id | kind | topic |
|---|---|---|
| p74 | story | 在巴刹走散了: lost from Grandma at the wet market; remembers to stay put (given) |
| p75 | story | an umbrella left on the MRT; asking at the station counter |
| p76 | factual | snails after rain: where they hide, why they come out |
| p77 | story | a kite stuck in a tree at East Coast Park; asking a grown-up rather than climbing |
| p78 | fable | a proud rooster who says the sun rises because he crows |
| p79 | story | the HDB lift is broken; helping a neighbour carry her shopping up |
| p80 | factual | Mid-Autumn Festival: lanterns, mooncakes, the full moon |
| p81 | story | not enough pocket money for a brother's birthday present; making a card instead |
| p82 | scene | queueing for chicken rice at a hawker centre; patience pays |
| p83 | factual | Chinatown before Chinese New Year: lights, stalls, crowds |
| p84 | story | forgot homework at home; telling the teacher the truth |
| p85 | fable | ants moving house before the rain, working together |
| p86 | story | a puppy that will not have a bath; finding a way |
| p87 | factual | thunderstorms in Singapore: lightning, staying safe |
| p88 | story | the first bus ride alone, Grandpa waving from the stop |

- [ ] **Step 1: Add the worked example and see it pass**

Append p74 (worked example 2) to `src/content/passages/二下.json`, so the file reads `[` + the object + `]`:

```json
  {
    "id": "p74",
    "title": "在巴刹走散了",
    "text": "星期六早上，奶奶带我去巴刹买菜。巴刹里人很多，又热闹又拥挤。我一边走，一边看两旁的水果摊，走着走着，奶奶不在我身边了！我心里很慌张，差一点哭了出来。但是我想起妈妈说过：“如果找不到大人，就站着别走，等大人来找你。”所以我镇定下来，站在鱼摊旁边，没有乱跑。过了一会，奶奶果然找到了我。她摸摸我的头说：“你真聪明！”",
    "term": "二下",
    "source": "ziji",
    "words": [{ "text": "拥挤", "gloss": "crowded" }, { "text": "慌张", "gloss": "flustered" }, { "text": "镇定", "gloss": "calm" }]
  }
```

Create `src/content/questions/q-p74-p88.ts`:

```ts
// Six questions for each 二下 stretch passage, p74–p88 (spec 2026-10-24 §5; plan 2026-10-24 Task 13).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P74_P88: QuestionBatch = {
  p74: [
    { q: '奶奶为什么说我聪明？', choices: ['我买了很多水果', '我在鱼摊帮了忙', '我自己找到了奶奶', '我记住了妈妈的话'], answer: 3, kind: 'why', sentences: [4, 5] },
    { q: '“镇定下来”是什么意思？', choices: ['心里不再慌张', '站到鱼摊上面', '跑去找奶奶', '大哭起来'], answer: 0, kind: 'word', sentence: 5 },
    { q: '下面哪件事最先发生？', choices: ['我站在鱼摊旁边', '奶奶找到了我', '奶奶和我去买菜', '奶奶摸摸我的头'], answer: 2, kind: 'order', sentence: 0 },
    { q: '哪一个题目最好？', choices: ['巴刹的水果摊', '不慌不乱等奶奶', '奶奶买鱼', '我在巴刹哭了'], answer: 1, kind: 'main', sentences: [4, 5] },
    { q: '奶奶带我去哪里买菜？', choices: ['巴刹', '鱼摊', '水果摊', '身边'], answer: 0, kind: 'fact', sentence: 0 },
    { q: '我站在什么地方等？', choices: ['水果摊', '巴刹', '奶奶身边', '鱼摊旁边'], answer: 3, kind: 'fact', sentence: 5 },
  ],
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P74_P88 } from './questions/q-p74-p88';` with the other batch imports and add `Q_P74_P88` to `QUESTION_BATCHES` after `Q_GSB`.

Run: `npm run pinyin && npx tsx scripts/langdu-report.ts p74`
Expected: the report shown under worked example 2, then `1 passages, 0 problems`.

- [ ] **Step 2: Write p75–p88**

Append each passage to `src/content/passages/二下.json` in id order, following the Stretch passages rules (80–140 characters in 4–8 sentences, two linking patterns, 5–10% of characters beyond 二下's lists with 1–4 生词 for them, the word gate, the topic above). Write one, run the report on it, fix it, go on: the report's first line gives the length, the term it levels at, the fit and the links; "beyond 二下" lists the stretch characters.

Run after each: `npx tsx scripts/langdu-report.ts <id>`
Expected for each new passage before its questions: only `✗ <id>: no six questions yet`.

- [ ] **Step 3: Write six questions for each**

Add `<id>: [ …six… ],` entries to `Q_P74_P88` in id order, following the Questions rules; why, word, order, main and two more; `answer` spread over 0–3.

Run: `npx tsx scripts/langdu-report.ts p74 p75 p76 p77 p78 p79 p80 p81 p82 p83 p84 p85 p86 p87 p88`
Expected: `15 passages, 0 problems`.

- [ ] **Step 4: Snapshot the pinyin and run the gate**

Run: `npm run pinyin`
Expected: `Wrote the pinyin of … sentences` (each new sentence added to `src/content/sentencePinyin.json`). Read the new entries' pinyin for a wrong 多音字 reading in context (行 háng/xíng, 长 cháng/zhǎng, 得 de/dé, 地 de/dì); fix one by rewording the sentence, or by an entry in `src/content/pinyinFixes.ts` as the earlier passages did, and run `npm run pinyin` again.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the stretch, question, coverage and stored-pinyin tests among them).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/questions src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "$(cat <<'EOF'
朗读 content: 二下 stretch passages p74–p88 with six questions each (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 14: 三上 stretch passages p89–p100, with their questions (content, §4, §5)

**Files:**
- Modify: `src/content/passages/三上.json` (append p89–p100 in id order)
- Create: `src/content/questions/q-p89-p100.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `STRETCH_PASSAGES` and the passage files (Task 2); `QuestionBatch` (Task 1); `scripts/langdu-report.ts` (Task 2).
- Produces: 12 passages at 三上 (6 stories, 3 factual pieces, 3 fables or scenes), and `Q_P89_P100: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P74_P88`.

The topics keep the 60 passages apart (no two alike, across all five passage tasks). Titles are the writer's; the topic is the brief.

| id | kind | topic |
|---|---|---|
| p89 | story | a treasure hunt at the Botanic Gardens; a clue read wrongly |
| p90 | factual | the orchid: Singapore's national flower |
| p91 | story | the class fish looks sick; finding out why |
| p92 | fable | a frog that boasts it can jump over the river |
| p93 | story | sports day relay: the baton is dropped |
| p94 | factual | the Merlion: what it is, where it stands |
| p95 | story | a library book overdue; owning up and paying the fine |
| p96 | scene | the park's cleaner; picking up your own rubbish |
| p97 | story | a power cut at night; candles, stories with family |
| p98 | factual | Deepavali: oil lamps, kolam, Little India |
| p99 | fable | a squirrel that will not share, then needs help |
| p100 | story | taking the MRT the wrong way; how to get back |

- [ ] **Step 1: Start the question batch and register it**

Create `src/content/questions/q-p89-p100.ts`:

```ts
// Six questions for each 三上 stretch passage, p89–p100 (spec 2026-10-24 §5; plan 2026-10-24 Task 14).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P89_P100: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P89_P100 } from './questions/q-p89-p100';` with the other batch imports and add `Q_P89_P100` to `QUESTION_BATCHES` after `Q_P74_P88`.

- [ ] **Step 2: Write p89–p100**

Append each passage to `src/content/passages/三上.json` in id order, following the Stretch passages rules (80–140 characters in 4–8 sentences, two linking patterns, 5–10% of characters beyond 三上's lists with 1–4 生词 for them, the word gate, the topic above). Write one, run the report on it, fix it, go on: the report's first line gives the length, the term it levels at, the fit and the links; "beyond 三上" lists the stretch characters.

Run after each: `npx tsx scripts/langdu-report.ts <id>`
Expected for each new passage before its questions: only `✗ <id>: no six questions yet`.

- [ ] **Step 3: Write six questions for each**

Add `<id>: [ …six… ],` entries to `Q_P89_P100` in id order, following the Questions rules; why, word, order, main and two more; `answer` spread over 0–3.

Run: `npx tsx scripts/langdu-report.ts p89 p90 p91 p92 p93 p94 p95 p96 p97 p98 p99 p100`
Expected: `12 passages, 0 problems`.

- [ ] **Step 4: Snapshot the pinyin and run the gate**

Run: `npm run pinyin`
Expected: `Wrote the pinyin of … sentences` (each new sentence added to `src/content/sentencePinyin.json`). Read the new entries' pinyin for a wrong 多音字 reading in context (行 háng/xíng, 长 cháng/zhǎng, 得 de/dé, 地 de/dì); fix one by rewording the sentence, or by an entry in `src/content/pinyinFixes.ts` as the earlier passages did, and run `npm run pinyin` again.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the stretch, question, coverage and stored-pinyin tests among them).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/questions src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "$(cat <<'EOF'
朗读 content: 三上 stretch passages p89–p100 with six questions each (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 15: 三上 stretch passages p101–p113, with their questions (content, §4, §5)

**Files:**
- Modify: `src/content/passages/三上.json` (append p101–p113 in id order)
- Create: `src/content/questions/q-p101-p113.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `STRETCH_PASSAGES` and the passage files (Task 2); `QuestionBatch` (Task 1); `scripts/langdu-report.ts` (Task 2).
- Produces: 13 passages at 三上 (6 stories, 3 factual pieces, 4 fables or scenes), and `Q_P101_P113: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P89_P100`.

The topics keep the 60 passages apart (no two alike, across all five passage tasks). Titles are the writer's; the topic is the brief.

| id | kind | topic |
|---|---|---|
| p101 | story | growing a sunflower for a class contest |
| p102 | factual | Hari Raya Puasa: fasting month, visiting, ketupat |
| p103 | story | teaching Grandma to use her new phone |
| p104 | fable | two goats meet on a narrow bridge |
| p105 | story | stage fright before a violin concert |
| p106 | factual | a butterfly's life: egg, caterpillar, chrysalis |
| p107 | scene | a rainy day at a food court; sharing a table |
| p108 | story | breaking a classmate's pencil case by accident |
| p109 | factual | migratory birds at Sungei Buloh wetland |
| p110 | fable | a little tree that wants to be tall in a storm |
| p111 | story | feeding the giraffes at the zoo |
| p112 | scene | giving up a seat on the MRT |
| p113 | story | a new classmate who speaks little Chinese yet |

- [ ] **Step 1: Start the question batch and register it**

Create `src/content/questions/q-p101-p113.ts`:

```ts
// Six questions for each 三上 stretch passage, p101–p113 (spec 2026-10-24 §5; plan 2026-10-24 Task 15).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P101_P113: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P101_P113 } from './questions/q-p101-p113';` with the other batch imports and add `Q_P101_P113` to `QUESTION_BATCHES` after `Q_P89_P100`.

- [ ] **Step 2: Write p101–p113**

Append each passage to `src/content/passages/三上.json` in id order, following the Stretch passages rules (80–140 characters in 4–8 sentences, two linking patterns, 5–10% of characters beyond 三上's lists with 1–4 生词 for them, the word gate, the topic above). Write one, run the report on it, fix it, go on: the report's first line gives the length, the term it levels at, the fit and the links; "beyond 三上" lists the stretch characters.

Run after each: `npx tsx scripts/langdu-report.ts <id>`
Expected for each new passage before its questions: only `✗ <id>: no six questions yet`.

- [ ] **Step 3: Write six questions for each**

Add `<id>: [ …six… ],` entries to `Q_P101_P113` in id order, following the Questions rules; why, word, order, main and two more; `answer` spread over 0–3.

Run: `npx tsx scripts/langdu-report.ts p101 p102 p103 p104 p105 p106 p107 p108 p109 p110 p111 p112 p113`
Expected: `13 passages, 0 problems`.

- [ ] **Step 4: Snapshot the pinyin and run the gate**

Run: `npm run pinyin`
Expected: `Wrote the pinyin of … sentences` (each new sentence added to `src/content/sentencePinyin.json`). Read the new entries' pinyin for a wrong 多音字 reading in context (行 háng/xíng, 长 cháng/zhǎng, 得 de/dé, 地 de/dì); fix one by rewording the sentence, or by an entry in `src/content/pinyinFixes.ts` as the earlier passages did, and run `npm run pinyin` again.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the stretch, question, coverage and stored-pinyin tests among them).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/questions src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "$(cat <<'EOF'
朗读 content: 三上 stretch passages p101–p113 with six questions each (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 16: 三下 stretch passages p114–p123, with their questions (content, §4, §5)

**Files:**
- Modify: `src/content/passages/三下.json` (append p114–p123 in id order)
- Create: `src/content/questions/q-p114-p123.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `STRETCH_PASSAGES` and the passage files (Task 2); `QuestionBatch` (Task 1); `scripts/langdu-report.ts` (Task 2).
- Produces: 10 passages at 三下 (5 stories, 3 factual pieces, 2 fables), and `Q_P114_P123: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P101_P113`.

The topics keep the 60 passages apart (no two alike, across all five passage tasks). Titles are the writer's; the topic is the brief.

| id | kind | topic |
|---|---|---|
| p114 | story | the birthday cake falls at the party |
| p115 | factual | the Singapore River: boats, bridges, then and now |
| p116 | fable | a rabbit who looks for a shortcut |
| p117 | story | the community garden's tomatoes go missing: birds, and a net |
| p118 | factual | sea turtles laying eggs on Singapore's islands |
| p119 | story | learning to swim: afraid of putting the face in |
| p120 | story | spring-cleaning before Chinese New Year finds a lost toy |
| p121 | factual | where Singapore's water comes from: rain, reservoirs, NEWater |
| p122 | fable | a peacock who laughs at the plain birds |
| p123 | story | giving old books to the library |

- [ ] **Step 1: Start the question batch and register it**

Create `src/content/questions/q-p114-p123.ts`:

```ts
// Six questions for each 三下 stretch passage, p114–p123 (spec 2026-10-24 §5; plan 2026-10-24 Task 16).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P114_P123: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P114_P123 } from './questions/q-p114-p123';` with the other batch imports and add `Q_P114_P123` to `QUESTION_BATCHES` after `Q_P101_P113`.

- [ ] **Step 2: Write p114–p123**

Append each passage to `src/content/passages/三下.json` in id order, following the Stretch passages rules (80–140 characters in 4–8 sentences, two linking patterns, 5–10% of characters beyond 三下's lists with 1–4 生词 for them, the word gate, the topic above). Write one, run the report on it, fix it, go on: the report's first line gives the length, the term it levels at, the fit and the links; "beyond 三下" lists the stretch characters.

Run after each: `npx tsx scripts/langdu-report.ts <id>`
Expected for each new passage before its questions: only `✗ <id>: no six questions yet`.

- [ ] **Step 3: Write six questions for each**

Add `<id>: [ …six… ],` entries to `Q_P114_P123` in id order, following the Questions rules; why, word, order, main and two more; `answer` spread over 0–3.

Run: `npx tsx scripts/langdu-report.ts p114 p115 p116 p117 p118 p119 p120 p121 p122 p123`
Expected: `10 passages, 0 problems`.

- [ ] **Step 4: Snapshot the pinyin and run the gate**

Run: `npm run pinyin`
Expected: `Wrote the pinyin of … sentences` (each new sentence added to `src/content/sentencePinyin.json`). Read the new entries' pinyin for a wrong 多音字 reading in context (行 háng/xíng, 长 cháng/zhǎng, 得 de/dé, 地 de/dì); fix one by rewording the sentence, or by an entry in `src/content/pinyinFixes.ts` as the earlier passages did, and run `npm run pinyin` again.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the stretch, question, coverage and stored-pinyin tests among them).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/questions src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "$(cat <<'EOF'
朗读 content: 三下 stretch passages p114–p123 with six questions each (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```


### Task 17: 三下 stretch passages p124–p133, with their questions (content, §4, §5)

**Files:**
- Modify: `src/content/passages/三下.json` (append p124–p133 in id order)
- Create: `src/content/questions/q-p124-p133.ts`
- Modify: `src/content/passageQuestions.ts` (register the batch), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: the Content rules above (both worked examples); `STRETCH_PASSAGES` and the passage files (Task 2); `QuestionBatch` (Task 1); `scripts/langdu-report.ts` (Task 2).
- Produces: 10 passages at 三下 (5 stories, 2 factual pieces, 3 fables or scenes), and `Q_P124_P133: QuestionBatch`, added to `QUESTION_BATCHES` after `Q_P114_P123`.

The topics keep the 60 passages apart (no two alike, across all five passage tasks). Titles are the writer's; the topic is the brief.

| id | kind | topic |
|---|---|---|
| p124 | story | a camping night: the tent leaks |
| p125 | factual | an ants' nest: queen, workers, food |
| p126 | fable | the lion and the mouse, retold |
| p127 | story | Grandpa's old radio: fixing it together |
| p128 | scene | after losing a football match |
| p129 | factual | the durian: smell, thorns, season |
| p130 | story | helping a neighbour find her cat |
| p131 | fable | the thirsty crow and the stones, retold |
| p132 | story | cooking for the first time: fried rice |
| p133 | story | making a card for the teacher before the holidays |

- [ ] **Step 1: Start the question batch and register it**

Create `src/content/questions/q-p124-p133.ts`:

```ts
// Six questions for each 三下 stretch passage, p124–p133 (spec 2026-10-24 §5; plan 2026-10-24 Task 17).
import type { QuestionBatch } from '../passageQuestions';

export const Q_P124_P133: QuestionBatch = {
};
```

In `src/content/passageQuestions.ts`, add `import { Q_P124_P133 } from './questions/q-p124-p133';` with the other batch imports and add `Q_P124_P133` to `QUESTION_BATCHES` after `Q_P114_P123`.

- [ ] **Step 2: Write p124–p133**

Append each passage to `src/content/passages/三下.json` in id order, following the Stretch passages rules (80–140 characters in 4–8 sentences, two linking patterns, 5–10% of characters beyond 三下's lists with 1–4 生词 for them, the word gate, the topic above). Write one, run the report on it, fix it, go on: the report's first line gives the length, the term it levels at, the fit and the links; "beyond 三下" lists the stretch characters.

Run after each: `npx tsx scripts/langdu-report.ts <id>`
Expected for each new passage before its questions: only `✗ <id>: no six questions yet`.

- [ ] **Step 3: Write six questions for each**

Add `<id>: [ …six… ],` entries to `Q_P124_P133` in id order, following the Questions rules; why, word, order, main and two more; `answer` spread over 0–3.

Run: `npx tsx scripts/langdu-report.ts p124 p125 p126 p127 p128 p129 p130 p131 p132 p133`
Expected: `10 passages, 0 problems`.

- [ ] **Step 4: Snapshot the pinyin and run the gate**

Run: `npm run pinyin`
Expected: `Wrote the pinyin of … sentences` (each new sentence added to `src/content/sentencePinyin.json`). Read the new entries' pinyin for a wrong 多音字 reading in context (行 háng/xíng, 长 cháng/zhǎng, 得 de/dé, 地 de/dì); fix one by rewording the sentence, or by an entry in `src/content/pinyinFixes.ts` as the earlier passages did, and run `npm run pinyin` again.

Run: `npx tsc --noEmit && npx vitest run scripts/check-content.test.ts src/content src/langdu src/talk src/parent src/app/langduSession.test.tsx`
Expected: PASS (the stretch, question, coverage and stored-pinyin tests among them).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages src/content/questions src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "$(cat <<'EOF'
朗读 content: 三下 stretch passages p124–p133 with six questions each (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 18: The library complete — the older questions go (§4, §5)

**Files:**
- Delete: `src/content/questions/legacy.ts`, `scripts/drop-legacy.ts`
- Modify: `src/content/passageQuestions.ts`, `src/langdu/pool.ts`, `src/talk/load.ts`, `src/types.ts` (a comment), `scripts/check-content.ts` (`checkQuestionCoverage`), `scripts/stage-cases/langdu.ts`, `scripts/review-passages.ts`
- Test: `scripts/check-content.test.ts`, `src/langdu/pool.test.ts`, `src/talk/load.test.ts`, `src/parent/talkSection.test.tsx`, `src/app/langduSession.test.tsx`

**Interfaces:**
- Consumes: all nine batches (Tasks 9–17); `stretchCounts` (Task 2).
- Produces: `QUESTION_BATCHES = [Q_P01_P25, Q_P26_P50, Q_P51_P73, Q_GSB, Q_P74_P88, Q_P89_P100, Q_P101_P113, Q_P114_P123, Q_P124_P133]`; no `LEGACY_QUESTIONS`; `readingPool(parent, builtins, reader, questions = PASSAGE_QUESTIONS)`; `checkQuestionCoverage(passages, batches)`.

- [ ] **Step 1: Write the failing tests**

In `scripts/check-content.test.ts`:
- change the imports to `import { PASSAGE_QUESTIONS, QUESTION_BATCHES } from '../src/content/passageQuestions';` and add `stretchCounts` to the `./check-content` import;
- replace the coverage test at the top of `describe('questions (spec 2026-10-24 §5)', …)` with:

```ts
  it('every built-in passage has its six, from one batch file: 133 of ours and 15 storybook chunks', () => {
    expect(checkQuestionCoverage(PASSAGES, QUESTION_BATCHES)).toEqual([]);
    expect(PASSAGES).toHaveLength(148);
    expect(Object.keys(PASSAGE_QUESTIONS)).toHaveLength(148);
  });
```

- replace the test `'coverage: six or the older two, …'` with:

```ts
  it('coverage: every passage has its six, from one batch file only', () => {
    const p01 = PASSAGES.find((p) => p.id === 'p01')!;
    expect(checkQuestionCoverage([p08], [{ p08: SIX }])).toEqual([]);
    expect(checkQuestionCoverage([p01, p08], [{ p08: SIX }])).toEqual(['p01: no questions']);
    expect(checkQuestionCoverage([p08], [{ p08: SIX }, { p08: SIX }])).toEqual(['p08: questions in batch 1 and batch 2']);
  });
```

- and add inside `describe('stretch passages (spec 2026-10-24 §4)', …)`:

```ts
  it('all sixty are there: 二下 15, 三上 25, 三下 20', () => {
    expect(stretchCounts(PASSAGES)).toEqual([]);
    expect(stretchCounts([])).toEqual(['二下: 0 stretch passages, expected 15', '三上: 0 stretch passages, expected 25', '三下: 0 stretch passages, expected 20']);
  });
```

In `src/langdu/pool.test.ts`, replace the questions test with:

```ts
  it("a built-in brings its six questions; a parent text brings the parent's one, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const six = { q: '我爱谁？', choices: ['老师', '妈妈', '小马', '爸爸'] as [string, string, string, string], answer: 1 as const, kind: 'fact' as const, sentence: 0 };
    const b = (id: string) => ({ id, title: id, text: '我。', term: '一上', source: 'ziji' as const });
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [b('p01'), b('p02')],
      reader('我'),
      { p01: [six], p02: [] },
    );
    expect(pool.map((p) => p.questions)).toEqual([[q], undefined, [six], undefined]);
  });
```

and in `'a built-in brings what the step shows …'` change `reader('爱我'), {}, {}); // no questions` back to `reader('爱我'), {}); // no questions`.

In `src/talk/load.test.ts`, `src/parent/talkSection.test.tsx` and `src/app/langduSession.test.tsx`, import only `PASSAGE_QUESTIONS` from `../content/passageQuestions`, and:
- `load.test.ts`: `toEqual({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17 }); // its six`;
- `talkSection.test.tsx`: replace the comment line and the `want` line with `const want = readingCard({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17! }, 0); // its six`;
- `langduSession.test.tsx`: replace the comment line and the `qs` line with `const qs = PASSAGE_QUESTIONS.p01!; // its six`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsc --noEmit`
Expected: FAIL: `checkQuestionCoverage` expects three arguments; `readingPool`'s test passes four.

- [ ] **Step 3: Implement**

```bash
git rm src/content/questions/legacy.ts scripts/drop-legacy.ts
```

In `src/content/passageQuestions.ts`, delete the legacy import and `export { LEGACY_QUESTIONS };`, and end the header comment at "…holds every one to the guess-proof rules." (drop the sentence about the older questions). The batch list reads:

```ts
export const QUESTION_BATCHES: readonly QuestionBatch[] = [Q_P01_P25, Q_P26_P50, Q_P51_P73, Q_GSB, Q_P74_P88, Q_P89_P100, Q_P101_P113, Q_P114_P123, Q_P124_P133];
```

In `src/langdu/pool.ts`: import only `PASSAGE_QUESTIONS`; drop `ParentQuestion` from the types import; `questions?: readonly AskedQuestion[]; // a built-in's six, a parent text's one`; and replace the multi-line `readingPool` signature and its `own` helper with:

```ts
export function readingPool(parent: ParentPassage[], builtins: Passage[], reader: Reader, questions: Readonly<Record<string, readonly PassageQuestion[]>> = PASSAGE_QUESTIONS): ReadingPassage[] {
```

and `...(own(id) ? { questions: own(id) } : {})` with `...(questions[id]?.length ? { questions: questions[id] } : {})`.

In `src/talk/load.ts`: import only `PASSAGE_QUESTIONS`, and `questions: PASSAGE_QUESTIONS[id] ?? [] };`.

In `src/types.ts`, end `ParentQuestion`'s comment at "…unless `sentence` names one. */" (drop the sentence about questions/legacy.ts).

In `scripts/check-content.ts`, replace `checkQuestionCoverage`'s comment, signature and passage loop:

```ts
/** Every built-in passage has its six, and no passage's six come from two batch files. */
export function checkQuestionCoverage(passages: readonly Passage[], batches: readonly Readonly<Record<string, readonly PassageQuestion[]>>[]): string[] {
```

```ts
  for (const p of passages) if (!seen.has(p.id)) problems.push(`${p.id}: no questions`);
```

In `scripts/stage-cases/langdu.ts`: import only `PASSAGE_QUESTIONS`, and

```ts
/** A built-in passage's six questions. */
export const questionsOf = (id: string): readonly AskedQuestion[] => PASSAGE_QUESTIONS[id] ?? [];
```

Replace `scripts/review-passages.ts` (the parent's CSV now carries six questions, each with its kind):

```ts
// The passages sheet for the parent's spot check (spec 2026-10-15 §2.2, 2026-10-24 §4–§5): each passage of ours from p21 on
// with its term, 生词 and its six questions (kind, the right choice in brackets), next to the gloss CSV that build-kidgloss.ts
// writes. Usage: npx tsx scripts/review-passages.ts passages.csv
import { writeFileSync } from 'node:fs';
import { PASSAGES } from '../src/content';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { NEW_FROM, QUESTIONS_PER_PASSAGE } from './check-content';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx scripts/review-passages.ts <out.csv>');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const ask = (x: { q: string; kind: string; choices: readonly string[]; answer: number }) => `(${x.kind}) ${x.q} ${x.choices.map((c, i) => (i === x.answer ? `[${c}]` : c)).join(' / ')}`;
const lines = [['id', 'term', 'title', 'text', '生词', ...Array.from({ length: QUESTIONS_PER_PASSAGE }, (_, i) => `question ${i + 1}`)].join(',')];
for (const p of PASSAGES.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= NEW_FROM)) {
  const qs = PASSAGE_QUESTIONS[p.id] ?? [];
  lines.push([p.id, p.term, p.title, p.text, (p.words ?? []).map((w) => `${w.text} = ${w.gloss}`).join('; '), ...Array.from({ length: QUESTIONS_PER_PASSAGE }, (_, i) => (qs[i] ? ask(qs[i]!) : ''))].map(q).join(','));
}
writeFileSync(out, '﻿' + lines.join('\n') + '\n'); // a BOM, so Excel and Numbers read the Chinese
console.log(`${lines.length - 1} passages written to ${out}`);
```

- [ ] **Step 4: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS. Then `npx tsx scripts/review-passages.ts /tmp/passages.csv` prints `113 passages written to /tmp/passages.csv` (p21–p133), and `npx tsx scripts/langdu-report.ts` prints `60 passages, 0 problems`.

- [ ] **Step 5: Commit**

```bash
git add -A src/content src/langdu/pool.ts src/langdu/pool.test.ts src/talk src/types.ts src/parent/talkSection.test.tsx src/app/langduSession.test.tsx scripts/check-content.ts scripts/check-content.test.ts scripts/stage-cases/langdu.ts scripts/review-passages.ts scripts/drop-legacy.ts
git commit -m "$(cat <<'EOF'
朗读 content: all 148 passages on their six questions; the older questions go (stretch spec §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 19: Stage cases in WebKit (§9)

**Files:**
- Modify: `scripts/stage-cases/langdu.ts` (`longestBack`), `scripts/stage-cases/page.tsx` (case `langdu-back`), `scripts/stage-cases.ts` (its checks, the 140-character check)

**Interfaces:**
- Consumes: `LONGEST_OWN`, `longestOwnChars`, `askedOf` (Task 7); the full library (Task 18).
- Produces: `longestBack(): { passage: Passage; question: PassageQuestion } | null`; the stage case `langdu-back`; `npx tsx scripts/stage-cases.ts` checks a 140-character passage on Read and the 4-choice question with its two-sentence read-back at every size.

- [ ] **Step 1: Add the case and its checks**

In `scripts/stage-cases/langdu.ts`, add `import { splitSentences } from '../../src/langdu/sentences';`, add `PassageQuestion` to the types import, and append:

```ts
/** The why or main question whose two read-back sentences and four choices are the longest in the library, with its passage. */
export function longestBack(): { passage: Passage; question: PassageQuestion } | null {
  const size = (p: Passage, q: PassageQuestion) => {
    const s = splitSentences(p.text);
    return (q.sentences ?? []).reduce((n, i) => n + han(s[i] ?? ''), 0) + han(q.choices.join(''));
  };
  const all = PASSAGES.flatMap((p) => (PASSAGE_QUESTIONS[p.id] ?? []).filter((q) => q.sentences).map((question) => ({ passage: p, question })));
  return all.sort((a, b) => size(b.passage, b.question) - size(a.passage, a.question) || a.passage.id.localeCompare(b.passage.id))[0] ?? null;
}
```

In `scripts/stage-cases/page.tsx`, add `longestBack` to the `./langdu` import, and before the `else if (which?.startsWith('langdu-')) {` branch add:

```tsx
else if (which === 'langdu-back') {
  // a missed why or main question (spec 2026-10-24 §5, §9): four choices, then its two supporting sentences read back in the
  // sheet — the longest such question in the library, in stored order
  const back = longestBack()!;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...back.passage, asked: [back.question] }} rng={() => 0.999} oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={() => {}} />
    </PinyinFade>,
  ), app);
}
```

and change the `langdu-` branch's comment to `// 朗读's parts (spec 2026-10-12 §3, §8; 2026-10-24 §9: up to 140 characters): the longest of our passages with every syllable showing`.

In `scripts/stage-cases.ts`, add `longestBack` and `longestOwnChars` to the `./stage-cases/langdu` import; after `const problems: string[] = [];` add:

```ts
// 朗读 on Read with a 140-character passage (spec 2026-10-24 §9): the stretch passages are what make it that long
if (longestOwnChars() < 130) problems.push(`langdu: the longest passage has ${longestOwnChars()} characters, under the 130 the stretch passages bring`);
```

and after the `langdu-meaning` wrong-choice block add:

```ts
  {
    // a missed why/main question (spec 2026-10-24 §9): four choices, the answer shown and its two sentences read back in the sheet
    const back = longestBack();
    if (!back) problems.push(`${size.name} langdu-back: no why or main question in the library yet`);
    else {
      await page.goto(`file://${dir}/index.html?case=langdu-back`);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `fit-shots/stage-cases/langdu-back-${size.name}.png` });
      if ((await page.$$('.langdu__choices .choice')).length !== 4) problems.push(`${size.name} langdu-back: not four choices`);
      problems.push(...(await cardClipped(page, `${size.name} langdu-back`)));
      await page.click(`.langdu__choices .choice >> nth=${back.question.answer === 0 ? 1 : 0}`); // a wrong choice
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `fit-shots/stage-cases/langdu-back-wrong-${size.name}.png` });
      if ((await page.$$('.langdu__back p')).length !== 2) problems.push(`${size.name} langdu-back: the miss does not read back two sentences`);
      problems.push(...(await cardClipped(page, `${size.name} langdu-back wrong`)), ...(await sheetFits(page, `${size.name} langdu-back wrong`)), ...(await sheetScrolls(page, `${size.name} langdu-back wrong`)));
    }
  }
```

- [ ] **Step 2: Run the stage cases in WebKit**

Run: `npx tsc --noEmit && npx tsx scripts/stage-cases.ts` (about 13 minutes)
Expected: `stage cases: ok`. Look at `fit-shots/stage-cases/langdu-read-*.png` (the longest stretch passage on Read), `langdu-meaning-wrong-*.png` and `langdu-back-wrong-*.png` at all five sizes: four choices two by two, the answer marked, the read-back's two sentences wrapping inside the sheet, nothing clipped. If a size fails, adjust only the Task 7 rules in `src/styles.css` (choice `min-height` and `font-size`, `.langdu__back`'s font) and run again.

- [ ] **Step 3: Commit**

```bash
git add scripts/stage-cases/langdu.ts scripts/stage-cases/page.tsx scripts/stage-cases.ts src/styles.css
git commit -m "$(cat <<'EOF'
Stage cases: a 140-character passage on Read and the 4-choice question's two-sentence read-back, in WebKit (stretch spec §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

- **Spec coverage:** §3 band, reach, floor → Task 3; §4 the 60 passages and their checks → Tasks 2, 13–18; §5 shape and kinds → Task 1, six per passage → Tasks 9–18, guess-proof checks → Task 1, three a read → Task 4, the step → Task 7, `readHow` → Task 3; §6 rest, fresh first, alternation → Task 3; §7 speed → Tasks 5–7; §8 parent → Task 8 (history keeps answers: Task 3); §9 tests → each task, stage cases → Task 19.
- **Placeholders:** the content tasks give rules, two measured worked examples, the p01–p25 batch in full, a topic for each new passage, and a report that names every problem; the writer supplies the remaining text, which is the task.
- **Types:** `PassageQuestion`, `ParentQuestion`, `AskedQuestion`, `PassageAnswer` (Task 1); `PassageHistory.lastHow/lastSet/answers`, `ReadAsked` (Task 3); `TakeAnswer`, `Recording.answers`, `ReadingPassage.asked/askedSet` (Task 7); `QuestionBatch`, `QUESTION_BATCHES` (Task 1) — used with these names throughout.
