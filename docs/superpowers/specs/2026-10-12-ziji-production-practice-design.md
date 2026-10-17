# ZiJi practice he can't guess: writing does the 组词 work, he says sentences, and taps get harder to guess — design

Date: 2026-10-12 · Base: main at 14d5012 · The parent loop (`feat/parent-loop`) is paused until this ships

## 1. Why

The parent found that in 练一练 he "can guess answers without fully understanding". Their example was 「连一连」: 成·划·计·案·答·为 pair into 计划, 答案 and 成为 by elimination alone.

The research report (`reports/Primary Chinese outcomes strategy.md`) says the same thing in general terms:
- four-option multiple-choice accuracy is weak evidence of learning;
- an app's own scores overstate gains;
- **producing** an answer on separate days is the honest test.

On writing in particular:
- **Writing strengthens character form** (Guan, Perfetti et al. 2011).
- **Explicit character structure teaching improved writing from memory** (Packard et al. 2006).
- **A 组词 gap he must write is exactly what 听写 tests.**

On 造句, the evidence is limited (no controlled studies). The best available practice is to say it aloud with a sentence pattern, with an adult giving feedback.

**Success:**
- Every 组词 item he meets in a lesson is one he **writes**: a write-list character from memory, a read-only one traced over a faint outline.
- He **says** sentences with words he knows, and the parent confirms them.
- The tap questions that remain can't be passed by elimination.
- Lessons are 20 minutes.

## 2. Decisions (parent, 2026-10-12)

| Question | Decision |
|---|---|
| Direction | Production first: write the missing character, say a sentence, and make the remaining taps resistant to guessing |
| Where writing happens | **Merged into 写一写.** There is no separate write-in item in 练一练, so no character is written twice and each skill has one place |
| Read-only characters (not on the CL/HCL write lists) | **Written with a hint:** a faint outline to trace |
| Lesson length | **20 minutes** |

## 3. 写一写 also does the 组词 work

The step is 写一写 (`src/session/writing.ts`, `src/activities/writing/*`).

- **How many:** `writeCharTarget` at 20 minutes is **7**. The other values become: under 20 → 4, 20 → 7, 25 → 8, 30 → 9, 40+ → 10.
- **Which characters**, in this order:
  1. today's write cards that are due;
  2. today's and recent write-list words, as now;
  3. **new: read-only characters** from today's and recent new words he reads (Read rung begun). These are characters with no write position for his course.

  Read-only items are at most **half** the day's target, rounded down. The remaining slots go to write-list characters first.
- **Read-only items:**
  - The 田字格 shows a **faint outline** of the character, and he traces it. This uses hanzi-writer's outline/trace mode, as the first pass of a new character already does.
  - The cue is the same 组词 dictation (「计，计划的计」).
  - **They never rate the write card.** They are not on his write list.
- **Write-list items** are unchanged: from memory, with the hint after 2 misses on a stroke, and the existing redo rule.
- **Credit for the 组词 (meaning):**
  - A written item whose cue is a 组词 also rates that word's **meaning** card once per lesson. This is the same card 练一练's rung-2 组词 questions rate.
  - A write-list character written **from memory with no hint and at most 1 miss** counts as right. Otherwise it is wrong.
  - A traced read-only character counts as right when completed with at most 3 misses.
  - It is logged like the other meaning ratings, so main's two-day pass for the Use rung applies.
- **No duplication with 练一练:** the 练一练 round leaves out rung-2 `word` and `pair` items **for words that 写一写 covers today**. The round is built after the write plan, and the plan carries `writeWordIds`. The round length is kept by the existing filling rules.

## 4. 「说一句」: say a sentence with a word

- **Ask `'sentence'`**, at rung 3. It is offered for a word whose Read rung has passed and which has a sentence-bank example. At most **2 per lesson**, never on the day the word was introduced, and only when recording is supported. A microphone refused earlier skips it silently, as with Say cards.
- **Screen:**
  - Prompt: 「用『计划』说一句话」.
  - A pattern hint taken from the word's sentence-bank example: the example with the word kept and the rest blanked to a short frame, e.g. 「我们…计划…」. The pattern shows as text with faded pinyin.
  - He records once, with one optional re-record. Then the **model sentence** plays and is shown: the sentence-bank example, spoken.
- **Parent review:**
  - The take joins **Listen & confirm** as a third row type, showing the word, his take and the model sentence, with ✓/✗. It reuses the Say-take review: `kind: 'sentence'` takes, the atomic `settleTake`, and the 14-day / 60-waiting tidy.
  - ✓ logs a **sentence** verdict on that day.
  - **Can use:** two confirmed days pass the word's new **`'sentence'` rung** (card kind `'sentence'`). Like Say, it never opens other rungs and doesn't affect town ownership.
- **Progress:** add a 「会用 Can use」 bar next to can read, write and say. It counts words (not characters) whose sentence rung has passed, against words begun. A count row is fine if a bar has no list target.

## 5. Taps that can't be passed by elimination

**Pairing (`PairGame`, 连一连):**
- The board adds **2 decoy halves** that pair with nothing on the board: characters that share no common word with any half on the board.
- **Every pair is graded.** Each pair's first try counts. The question counts as right only if every pair was matched without a miss, so a lucky last pair can't pass it. Only the target word's result rates its card, as now.
- The board has 8 halves on iPad, in a 4×2 or 2×4 grid that must fit on a phone.

**「都不对 None of these」:**
- In the 组词-gap, 搭配 (match) and English-meaning questions, about **1 in 5** questions per lesson (seeded) **leave out the right answer** and add a 「都不对」 choice. That choice is the right answer for those questions.
- Feedback shows the real answer.
- It never applies to a word's first question in a lesson, nor to a new word (introduced today).

## 6. Lesson budget at 20 minutes

- `DEFAULT_SETTINGS.sessionMinutes` = **20**. A one-off migration (`lessonVersion` 8) moves exactly **15 → 20**. Any other value the parent chose is kept.
- **At 20 minutes:**

  | Step | Time / amount |
  |---|---|
  | 认新字 | ~3 min |
  | 练一练 | box `20 × 1/3` ≈ 6.7 min, with up to 2 说一句 and up to 6 Say cards inside it as now |
  | 写一写 | 7 characters |
  | 朗读 | ~3 min |

- `PRACTICE_SHARE` stays at 1/3.

## 7. Existing data

- New card kind `'sentence'`, and a new `RecordingPrompt` kind `{ kind: 'sentence'; wordId }`.
- No migration of cards or logs. Saved lessons load as they are: old plans have no `writeWordIds`, so their rounds are built as before.
- Settings migration v8 as in §6.

## 8. Testing

- **Unit tests:**
  - **Write selection:** read-only characters at most half of the target, write-list first, and no read-only character on a write card.
  - **Meaning credit from writing:** once per lesson, the right/wrong rule, and logged.
  - **The round:** leaves out `word`/`pair` items for written words.
  - **The sentence rung:** passes on two confirmed days and never opens other rungs.
  - **Sentence picking:** at most 2, eligibility.
  - **Pattern from an example.**
  - **Decoy halves:** none pairs with anything on the board.
  - **All-pairs grading.**
  - **「都不对」:** frequency, never on first or new, and the answer absent when used.
  - **The v8 migration**, and `writeCharTarget`.
- **Rendered tests:**
  - a traced read-only item, showing the outline;
  - 说一句: record, model, one re-record, and microphone-blocked skips;
  - the review row for a sentence take;
  - the pairing board with decoys;
  - a 「都不对」 question, right and wrong.
- **WebKit:** stage cases for the traced item, 说一句, the 8-tile pairing board and a 「都不对」 question, at iPad and phone sizes. The fit sweep of the lesson flow stays clean.

## 9. Out of scope

Free writing of sentences. Speech-recognition scoring. The parent loop (resumes next). Changes to 认新字 or 朗读.

## 10. Amendment 2026-10-17: the 15-minute lesson again, and the second lesson spaced out

Parent decision, 2026-10-17, from the learning-rules review (Cepeda et al. 2006 on spacing).

- **Default lesson length:** `DEFAULT_SETTINGS.sessionMinutes` = **15**. Settings migration `lessonVersion` 9 moves the v8 default back to 15:
  - a v8 install on exactly 20 minutes;
  - an older install that v8 would have moved from 15 to 20, which now stays at 15.

  A 20 chosen before v8 was the parent's own, and it stays. So does any other length.
- **At 15 minutes:**

  | Step | Time / amount |
  |---|---|
  | 认新字 | ~3 min |
  | 练一练 | box `15 × 1/3` = 5 min. 说一句 comes by item 9 and item 18 (`SENTENCE_BY` 12 → 9, scaled to the shorter box) |
  | 写一写 | 4 characters (`writeCharTarget`, unchanged: about 4 minutes are left at about a minute a character) |
  | 朗读 | ~3 min |

- **Extra lessons are review only:** no new words and no new meaning starts.
  - **What it reviews:** cards due today, plus cards due by the end of tomorrow that he hasn't answered today.
  - **When nothing is due:** a practice-only round of his 8 weakest words, ranked by lowest reading stability.
  - **Production steps:** Say, 说一句 and 写一写 run as usual for words he has met.
- **The second lesson waits:** Home offers 再学一课 only once 2 hours have passed since the last lesson ended. "The last lesson" means the later of the day's lesson's start plus its active time, and `kid.starredUpTo`.
  - **Until then:** the done card and Truffle say when to come back:
    - 「等一会儿再来！」 if it opens before noon;
    - 「下午再来！」 if it opens before 18:00;
    - 「晚上再来！」 after that;
    - 「明天见！」 if it opens after midnight.
  - **The parent area:** its Today tab can start a review lesson at once, after the day's lesson.
