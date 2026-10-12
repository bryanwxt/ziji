# Practice he can't guess: writing does the 组词 work, 说一句, guess-proof taps, 20-minute lessons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every 组词 item he meets in a lesson is one he writes (write-list characters from memory, read-only ones traced over an outline, crediting the word's meaning card), he says sentences with words he reads (「说一句」, confirmed by the parent: 「会用 Can use」), the tap questions that remain can't be passed by elimination (decoy halves and all-pairs grading in 连一连, 「都不对」 in 组词-gap / 搭配 / English-meaning questions), and the lesson is 20 minutes.

**Architecture:** The budget moves first (`writeCharTarget`, `DEFAULT_SETTINGS.sessionMinutes`, settings v8). `pickWriteUnits` (`src/session/writing.ts`) reserves up to half the day's characters for read-only characters, which `orderWriteItems` gives a single trace pass and never a write-card rating; the plan carries `writeWordIds`, and `planPractice` (`src/session/practice.ts`) leaves out rung-2 `word`/`pair` asks for those words. A pure `meaningCredit` (`src/session/writeCredit.ts`) decides whether a written item rates its word's meaning card (once a lesson, kept on `SessionRecord.meaningCredit`), and `recordWrittenMeaning` (`src/session/record.ts`) logs it like any meaning rating. The Say-take machinery in `src/session/say.ts` is generalised to two take kinds (`'say' | 'sentence'`): a new card kind and rung `'sentence'` (outside the ladder, like Say), `recordSentenceTake`, `reviewTake` on the take's own card, and a per-card tidy. `SentenceCard` (`src/activities/say/SentenceCard.tsx`) is the 说一句 screen, fed by `plan.sentenceIds` and inserted early in the round by `withSentence`; Listen & confirm gets a third row and Progress a 「会用」 bar. `zuciBoard` (`src/practice/pairs.ts`) adds two decoy halves; `PairGame` grades every pair. `withNoneOfThese` (`src/practice/noneOfThese.ts`) marks about one in five eligible round items, and `FlashcardStep` / `MatchQuestion` ask them without their answer.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, hanzi-writer 3 (+ `hanzi-writer-data` 2.0.1 in devDependencies), ts-fsrs, tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`, `scripts/fit-check.ts`).

**Spec:** `docs/superpowers/specs/2026-10-12-ziji-production-practice-design.md` (read it in full before Task 1).

## Global Constraints

- **Lesson length:** `DEFAULT_SETTINGS.sessionMinutes = 20`. `lessonVersion` **8** moves exactly **15 → 20** once; any other value the parent chose is kept. `PRACTICE_SHARE` stays **1/3** (练一练 box ≈ 6.7 min at 20).
- **写一写 size:** `writeCharTarget(minutes)` = **4** under 20, **7** at 20, **8** at 25, **9** at 30, **10** from 40 (`MAX_WRITE_CHARS = 10`).
- **Which characters:** today's due write cards; today's and recent write-list words, as now; read-only characters (no write position for his course: `!writeable`, no write card, one Han character) from today's new words and recent words he reads (Read rung begun). Read-only items are at most **half** the day's target, **rounded down**; the other slots go to write-list characters first.
- **Read-only items:** the 田字格 shows a faint outline he traces (hanzi-writer `showOutline`, the existing `pass: 'trace'`); the cue is the same 组词 dictation (「计，计划的计」); they **never** rate a write card.
- **Write-list items:** unchanged — from memory, the hint after 2 misses on a stroke, the existing redo rule.
- **Meaning credit from writing:** a written item whose cue is a 组词 rates that word's **meaning** card **once per lesson**. Write-list character from memory with **no hint and at most 1 miss** = right, else wrong; a traced read-only character with **at most 3 misses** = right. Logged like the other meaning ratings (the Use rung's two-day pass applies).
- **No duplication:** 练一练 leaves out rung-2 `word` and `pair` items for words 写一写 covers today (`plan.writeWordIds`); the round's length is kept by the existing filling rules; plans saved before have no `writeWordIds` and build as before.
- **说一句:** ask `'sentence'`, at rung **3**; for a word whose Read rung has passed and which has a sentence-bank example; at most **2** per lesson; never on the day the word was introduced; only when recording is supported; a microphone refused earlier skips it silently, as with Say cards. Prompt 「用『计划』说一句话」; a pattern from the sentence-bank example (word kept, the rest blanked to a short frame, e.g. 「我们…计划…」) as text with faded pinyin; he records once with **one** optional re-record; then the **model sentence** (the sentence-bank example) plays and is shown.
- **Review:** the take joins **Listen & confirm** as a third row type (word, his take, model sentence, ✓/✗), reusing the Say-take review: `kind: 'sentence'` takes, the atomic `settleTake`, the **14-day / 60-waiting** tidy. ✓ logs a sentence verdict on the day he recorded it. **Two confirmed days** pass the word's `'sentence'` rung (card kind `'sentence'`); it never opens other rungs and doesn't affect town ownership.
- **Progress:** 「会用 Can use」 next to can read / write / say: words (not characters) whose sentence rung has passed, against words begun.
- **连一连:** the board adds **2 decoy halves** that pair with nothing on the board; **8 halves** in two columns of four, fitting a phone; **every pair is graded** — right only if every pair was matched without a miss; only the target word's result rates its card.
- **「都不对 None of these」:** in the 组词-gap, 搭配 (match) and English-meaning questions, about **1 in 5** per lesson (seeded) leave out the right answer and add 「都不对」, then the right answer; feedback shows the real answer; never a word's first question in a lesson, never a word introduced today.
- **Data:** new `CardKind` `'sentence'`; new `RecordingPrompt` `{ kind: 'sentence'; wordId: string }`. No migration of cards or logs; saved lessons load as they are.
- TypeScript lib is ES2022 (`??=` and `Array.prototype.at` are fine; no `findLastIndex` / `toSorted`).
- Screenshots in **WebKit** via playwright-core. If WebKit is missing, stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Out of scope: free writing of sentences, speech-recognition scoring, the parent loop, changes to 认新字 or 朗读.

## Rulings

- Ruling: read-only characters get their share **first** — `traced = (today's ∪ recent read-only).slice(0, ⌊target/2⌋)`, and the write list (due, then today's/recent, then readable) fills `target − traced.length` — not after the write list — because in a 30-lesson simulation of a P2 profile (二下·17, both courses, 6 new words a day) the literal order (due → write list → read-only) gave **0.07** read-only characters a lesson (due writing alone filled 7 slots from lesson 8 on), while the reservation gives **2.7** with due writing still **3.6** a lesson — cost if wrong: on heavy days up to 3 due write cards wait a day.
- Ruling: a read-only character is a word that is one Han character, `!writeable`, with no write card; "recent" is the existing recent rule (recognise card, practised in a lesson, not Relearning) plus never traced — a new `Word.tracedAt`, set by `markTraced` when a trace completes — because without it the same newest characters would be traced every lesson (nothing else marks them done); a stroke-load failure (`writeSkippedAt`) puts one last, as for write-list words — cost if wrong: a recent read-only character is traced once, not again.
- Ruling: a read-only item never carries `last` (so `onWriteDone` never calls `recordWriting` for it), and `onWriteDone` also checks `!task.readOnly` — "never rate the write card" pinned twice — cost if wrong: none.
- Ruling: the meaning credit needs the word's **Use rung open** — it has a meaning card, or it is in today's `plan.newMeaningIds` — because Use waits for Read on the ladder (spec 2026-10-06 §3.2) and a just-introduced word must not get a meaning card early — cost if wrong: today's new words (and most traced read-only ones) earn no credit until their Read passes.
- Ruling: "a cue that is a 组词" is `writingCue(word, at).blanked !== null` (the 「＿划」 cue); a sentence cue or a bare pinyin cue earns nothing — the spec's literal condition — cost if wrong: words whose dictation cue is a sentence never get writing credit.
- Ruling: the credit is decided on the word's **first qualifying item** (a write-list recall that is not a redo, or a read-only trace), by that item alone; the word then goes on `SessionRecord.meaningCredit` so nothing later in the lesson rates it again — "once per lesson" — cost if wrong: for a two-character write-list word only its first character's recall decides.
- Ruling: `recordWrittenMeaning` rates Good (right) or Again (wrong), logs `source: 'write'` with **no `responseMs`** (writing is slow and never a guess, so neither "slow" nor `fastLimit` applies), and if the meaning card was already rated today (练一练 asked it) it only brings a miss forward, like `recordUse` — one first rating a day is what the two-day pass counts — cost if wrong: the Skills panel counts the written credit under meaning.
- Ruling: 说一句 is never picked by the ladder (`canAsk('sentence') === false`); `withSentence` inserts the plan's `sentenceIds` like `withSay`, at most 2 and one per three items, at `min(k-th of the way, 12th / 24th item)` (`SENTENCE_BY = 12`) — measured: on a P2 round of ~200 items the second one spread at half-way was never reached inside the 6.7-minute box — cost if wrong: both 说一句 come early in 练一练.
- Ruling: the 说一句 frame is the card's question (`data-q`, at `--q-hanzi`) only when it is 4 characters or fewer; a longer frame is a line at `clamp(32px, 6dvh, 56px)` without `data-q`, as FlashcardStep does for sentence cues — measured: with `data-q` on every frame the fit sweep failed its question-size check (40 px on an SE, 46–56 px on iPads) — cost if wrong: a long frame reads smaller than a character question.
- Ruling: `sentenceIds` = due Sentence cards, then words whose Read has passed with a sentence-bank example and no Sentence card, newest Read pass first, minus today's new words, first 2; not tied to `settings.sayCards` (that switch names Say cards) — cost if wrong: a parent who switched Say cards off still gets 说一句.
- Ruling: the model sentence is the bank's first gap filled (`fillGap(bank.gaps[0], word)`), and the frame keeps what comes before the word when it is ≤ 2 characters, else its first word (the longest HSK word of 3 or 2 characters at the start, else one character) and 「…」, then the word, then 「…」 if anything but punctuation follows — measured over all 266 bank items: every frame holds the word and is at most the word + 5 characters (今天很… · 我…起床 · 看到…连忙… · 图书馆…保持…) — cost if wrong: an odd frame on a few words.
- Ruling: `say.ts` keys takes by **card** (`${wordId}:say` / `${wordId}:sentence`): `takesToDrop`'s `passed` set becomes card ids (its one test changes from `'b:森'` to `'b:森:say'`), so a word keeps its newest Say take and its newest 说一句 take apart; `sayDays` / `sayPassed` take a `kind` (default `'say'`); `recordSayTake` stays as a wrapper so its mocks in `sayLesson.test.tsx` keep working — cost if wrong: one test line.
- Ruling: the Listen & confirm sentence row's buttons are labelled 「A good sentence: 很」 / 「Not a good sentence: 很」, its audio 「His sentence」 — distinct from a Say row of the same word — cost if wrong: none.
- Ruling: 「会用」's "words begun" = words with a Hear or Read card (`Knowledge.begun`), and the bar shows only when that is above 0, with no class mark (no list target) — cost if wrong: a ladder 词语 he has only heard counts as begun.
- Ruling: decoys are two characters from the board's own word pool (his known characters when he knows enough), never `PRODUCTIVE`, never on the board, and making **no word either way** — HSK, any built-in character's 组词 (切菜 isn't HSK), or the word's own examples — with any half on the board or with each other; they go in at the **same row** in both columns so no pair comes to sit on one row; a board without two such characters is no board — measured: all 2,723 built-in boards (two seeds each) find decoys — cost if wrong: none measured.
- Ruling: "every pair graded" = **any** wrong try on the board (a decoy tried, or a decoy tapped as a partner) makes the question wrong; the time is still the target pair's; a left decoy tried 3 times is set aside (disabled, dashed) — it has no match to show, and the fit sweep's walker must not loop on it; decoys show as decoys only when the board is done — cost if wrong: a child who tries a decoy once is marked wrong.
- Ruling: 「都不对」 marks each eligible item with chance **0.2** from the lesson's round rng (`NONE_SHARE`); eligible = ask `word`, `match`, `meaningRead` or `hear`, not the word's first item in the round, not a word introduced today, not a retry; a missed one comes back as an ordinary retry (its answer among the choices); 「都不对」 is always the last choice and the count of choices is unchanged — measured on a P2 round: about **1.6** in the first 35 items when his rungs start at 字, **0** when every word starts at 词语 or above (single appearances are first questions) — cost if wrong: some lessons have none.
- Ruling: a right pick of 「都不对」 still flies to Truffle like any right tile (the stage case allows `.is-eaten` to leave the card), and its sheet shows 「正确答案：」 with the real 组词 or the word with its real English — cost if wrong: none.
- Ruling: v8 runs after the v1–v7 moves in one patch, so an install on the very old 20-minute default goes 20 → 30 → 15 → 20, and `migrateSettings` returns `{ lessonVersion: 8 }` alone for a v7 install not on 15 — cost if wrong: none.
- Ruling: `sayLesson.test.tsx` reads `木` instead of `大` (大 has a sentence-bank example, so a 说一句 could come before its Say card, and its rounds are seeded from the clock), and its `untilLangdu` tap budget goes 120 → 300 (8-tile boards with decoys take more blind taps) — tests of something else — cost if wrong: none.
- Ruling: the traced stage case serves 澡's strokes from `hanzi-writer-data/澡.json` by wrapping `window.fetch` for that URL — the stage page runs from `file://` and must not depend on the CDN — cost if wrong: none.

## Review Focus

1. A lesson saved before this change (no `writeWordIds`, no `sentenceIds`) resumes and builds its round exactly as before — test in Task 4 (`the other words keep theirs, and a plan saved before (no writeWordIds) is built as before`) and Task 6 (`… none when the iPad cannot record or the plan is from before`).
2. A read-only character whose strokes failed to load goes behind the others next lesson, so it never holds a slot every day — test in Task 2 (`a recent one whose strokes failed to load goes behind the others, so it never holds a slot every lesson (review focus 2)`).
3. The parent double-taps ✓ on a 说一句 take: it is reviewed once and logged once — test in Task 5 (`two taps at once on a 说一句 take review it once (review focus 3)`).
4. The same word is due for a Say card and a 说一句 in one lesson: they never come back to back — test in Task 6 (`never beside the same word, a Say card, or another 说一句`).
5. He misses a 「都不对」 question: it comes back as an ordinary retry with its answer among the choices, never a second 都不对 he can now guess — test in Task 9 (`comes back as an ordinary retry, its answer among the choices`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/types.ts` | `DEFAULT_SETTINGS` (20 min, v8); `Word.tracedAt`; `SessionPlan.writeWordIds` / `sentenceIds`; `SessionRecord.meaningCredit`; `ReviewLog.source: 'write'`; `CardKind 'sentence'`; `RecordingPrompt` sentence | 1, 2, 3, 5, 6 |
| `src/store/settings.ts` (+ test) | v8: exactly 15 → 20 | 1 |
| `src/session/writing.ts` (+ test) | `writeCharTarget`; read-only units and items | 1, 2 |
| `src/session/plan.ts` (+ tests) | `writeWordIds`, `SENTENCE_PER_LESSON`, `sentenceIds` | 1, 2, 6 |
| `src/session/writeCredit.ts` (new, + test) | `meaningCredit` | 3 |
| `src/session/record.ts` (+ test) | `recordWrittenMeaning`, `markTraced` | 3 |
| `src/session/runner.ts` (+ test) | `WriteTask.readOnly`, `afterWriteWord(… credited)`, `skipSayItems` drops 说一句, a retry drops `none` | 3, 6, 9 |
| `src/app/SessionScreen.tsx` | meaning credit and trace mark in 写一写; `SentenceCard` in 练一练 | 3, 6 |
| `src/session/practice.ts` (+ tests) | no 组词 taps for written words; `withSentence`; `withNoneOfThese` in the round | 4, 6, 9 |
| `src/ladder/rungs.ts` (+ test) | the `'sentence'` rung; `sayDays`/`sayPassed` by kind | 5 |
| `src/session/say.ts` (+ test) | Say and 说一句 takes: record, review, tidy by card | 5 |
| `src/stats/skills.ts`, `src/parent/RecordingsPanel.tsx` | sentence verdicts are not answers; recordings list label | 5 |
| `src/content/sentencePattern.ts` (new, + test) | `sentenceExample`, `sentencePattern` | 6 |
| `src/activities/say/SentenceCard.tsx` (new, + test) | the 说一句 screen | 6 |
| `src/session/round.ts` | `Ask 'sentence'`, `Grades 'sentence'`, `PracticeItem.none` | 6, 9 |
| `src/parent/ListenPanel.tsx`, `src/parent/ProgressPanel.tsx`, `src/stats/stats.ts` | the sentence row; 「会用」 | 7 |
| `src/practice/pairs.ts`, `src/activities/practice/PairGame.tsx` (+ tests) | decoys; all-pairs grading | 8 |
| `src/practice/noneOfThese.ts` (new, + test) | `withNoneOfThese`, `noneChoices`, `NONE_OF_THESE` | 9 |
| `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/practice/MatchQuestion.tsx`, `PracticeQuestion.tsx` (+ tests) | asking without the answer | 9 |
| `src/styles.css` | 说一句, the sentence row, 8-tile board, decoys, 都不对 | 6, 7, 8, 9 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`, `scripts/fit-check.ts` | WebKit cases and sweep marks | 10 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (under heavy machine load a few slow rendered tests can time out — rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts too. Before Task 1: `ls node_modules/.bin/vitest` (run `npm ci` if it is missing). Baseline on cb23562: 229 files, 1964 tests pass. After Task 10: 235 files, 2027 tests.

Every edit below is an exact text replacement against the file as the previous task left it ("replace … with …" maps onto one Edit call; the "replace" text occurs once in the file). Do the tasks in order.

---

### Task 1: The 20-minute lesson: budget and settings v8

**Files:**
- Modify: `src/types.ts` (`DEFAULT_SETTINGS.sessionMinutes`, `lessonVersion`)
- Modify: `src/store/settings.ts` (whole file), `src/store/settings.test.ts` (whole file)
- Modify: `src/session/writing.ts:1,10-11` (`writeCharTarget`), `src/session/writing.test.ts:12-23`
- Modify: `src/session/plan.ts:35` (comment), `src/session/plan.test.ts:70-79,168-170`
- Modify: `src/store/repo.test.ts:18`, `src/store/backup.test.ts:154-156`, `src/bootstrap.test.ts:34`

**Interfaces:**
- Consumes: nothing new.
- Produces: `writeCharTarget(minutes: number): number` = 4 / 7 / 8 / 9 / 10; `DEFAULT_SETTINGS.sessionMinutes === 20`, `DEFAULT_SETTINGS.lessonVersion === 8`; `migrateSettings(s)` returns `null` from v8 on, else a patch ending `lessonVersion: 8` that moves a resulting `sessionMinutes` of exactly 15 to 20.

- [ ] **Step 1: Write the failing tests**

In `src/bootstrap.test.ts`, replace:

```ts
    expect((await getWord(first.db, 'b:井'))!.writeable).toBe(false); // 华文 only reads 井
    first.db.close();
    const second = await bootstrap(name);
    expect(await getSettings(second.db)).toMatchObject({ course: 'both', contentCourse: 'both', lessonVersion: 7 });
    expect((await getWord(second.db, 'b:井'))!.writeable).toBe(true); // 高级华文 writes it
    await updateSettings(second.db, { course: 'cl' }); // the parent picks 华文 again
    second.db.close();
```

with:

```ts
    expect((await getWord(first.db, 'b:井'))!.writeable).toBe(false); // 华文 only reads 井
    first.db.close();
    const second = await bootstrap(name);
    expect(await getSettings(second.db)).toMatchObject({ course: 'both', contentCourse: 'both', lessonVersion: 8 });
    expect((await getWord(second.db, 'b:井'))!.writeable).toBe(true); // 高级华文 writes it
    await updateSettings(second.db, { course: 'cl' }); // the parent picks 华文 again
    second.db.close();
```

In `src/session/plan.test.ts`, replace:

```ts
    ]);
  });

  it("sizes 写一写 (8 characters at 30 minutes, 5 at 20, 4 at 15) and 练一练's time box from session minutes", () => {
    const ws = chars(12);
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const count = (min: number) => new Set(buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: min }), now }).writeItems!.map((i) => `${i.wordId}#${i.at}`)).size;
    expect([count(30), count(20), count(15)]).toEqual([8, 5, 4]);
    const p20 = buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: 20 }), now });
    expect(p20.writeCount).toBe(p20.writeItems!.length); // each never-written character is traced, then written from memory
    expect(p20.writeCount).toBe(10);
    expect(p20.practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
  it("writes today's new words after due writing, and nothing above his level", () => {
```

with:

```ts
    ]);
  });

  it("sizes 写一写 (9 characters at 30 minutes, 7 at 20, 4 at 15) and 练一练's time box from session minutes", () => {
    const ws = chars(12);
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const count = (min: number) => new Set(buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: min }), now }).writeItems!.map((i) => `${i.wordId}#${i.at}`)).size;
    expect([count(30), count(20), count(15)]).toEqual([9, 7, 4]);
    const p20 = buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: 20 }), now });
    expect(p20.writeCount).toBe(p20.writeItems!.length); // each never-written character is traced, then written from memory
    expect(p20.writeCount).toBe(14);
    expect(p20.practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
  it("writes today's new words after due writing, and nothing above his level", () => {
```

In `src/session/plan.test.ts`, replace:

```ts
  it('朗读 switched off: no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: false }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('练一练 has 5 of the default 15 minutes (spec 2026-10-12 §4: its share is 1/3)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(5 * 60_000);
  });
  it('with 新字 switched off there are no new words', () => {
    const settings = { ...DEFAULT_SETTINGS, activities: { ...DEFAULT_SETTINGS.activities, newwords: false } };
```

with:

```ts
  it('朗读 switched off: no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: false }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('练一练 has a third of the default 20 minutes (production practice spec §6)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
  it('with 新字 switched off there are no new words', () => {
    const settings = { ...DEFAULT_SETTINGS, activities: { ...DEFAULT_SETTINGS.activities, newwords: false } };
```

In `src/session/writing.test.ts`, replace:

```ts
const base = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now.getTime() + day, target: 9 };

describe('how many characters (spec 2026-10-05 §5; spec 2026-10-12 §4)', () => {
  it('4 at the usual 15 minutes; 5 at 20, 7 at 25, 8 at 30, 9 from 40', () => {
    expect(writeCharTarget(15)).toBe(4); // 朗读 takes its ~3 minutes (spec 2026-10-12 §4)
    expect(writeCharTarget(10)).toBe(4);
    expect(writeCharTarget(19)).toBe(4);
    expect(writeCharTarget(20)).toBe(5);
    expect(writeCharTarget(25)).toBe(7);
    expect(writeCharTarget(30)).toBe(8);
    expect(writeCharTarget(35)).toBe(8);
    expect(writeCharTarget(40)).toBe(9);
    expect(writeCharTarget(45)).toBe(9);
  });
});

```

with:

```ts
const base = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now.getTime() + day, target: 9 };

describe('how many characters (spec 2026-10-05 §5; spec 2026-10-12 §4)', () => {
  it('7 at the usual 20 minutes; 4 under 20, 8 at 25, 9 at 30, 10 from 40 (production practice spec §3)', () => {
    expect(writeCharTarget(10)).toBe(4);
    expect(writeCharTarget(15)).toBe(4);
    expect(writeCharTarget(19)).toBe(4);
    expect(writeCharTarget(20)).toBe(7);
    expect(writeCharTarget(25)).toBe(8);
    expect(writeCharTarget(30)).toBe(9);
    expect(writeCharTarget(35)).toBe(9);
    expect(writeCharTarget(40)).toBe(10);
    expect(writeCharTarget(45)).toBe(10);
  });
});

```

In `src/store/backup.test.ts`, replace:

```ts
    const target = await freshDb();
    await applyBackup(target, readBackup(text));
    const s = await getSettings(target);
    expect(s.lessonVersion).toBe(7);
    expect(s.course).toBe('both'); // spec 2026-10-11 §6
    expect(s.sessionMinutes).toBe(15); // the old default 30 becomes 15 (spec 2026-10-11 §4)
    expect(s.activities).toMatchObject({ newwords: true, practice: true, writing: true, speaking: true });
    expect(s.newPerDay).toBe(8);
  });
```

with:

```ts
    const target = await freshDb();
    await applyBackup(target, readBackup(text));
    const s = await getSettings(target);
    expect(s.lessonVersion).toBe(8);
    expect(s.course).toBe('both'); // spec 2026-10-11 §6
    expect(s.sessionMinutes).toBe(20); // the old default 30 became 15 (spec 2026-10-11 §4), and 15 becomes 20 (production practice §6)
    expect(s.activities).toMatchObject({ newwords: true, practice: true, writing: true, speaking: true });
    expect(s.newPerDay).toBe(8);
  });
```

In `src/store/repo.test.ts`, replace:

```ts
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    await updateSettings(db, { newPerDay: 7 });
    expect((await getSettings(db)).newPerDay).toBe(7);
    expect((await getSettings(db)).sessionMinutes).toBe(15); // the 15-minute lesson (spec 2026-10-11 §4)
  });

  it('seeds only missing built-in words and keeps existing flags', async () => {
```

with:

```ts
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    await updateSettings(db, { newPerDay: 7 });
    expect((await getSettings(db)).newPerDay).toBe(7);
    expect((await getSettings(db)).sessionMinutes).toBe(20); // the 20-minute lesson (production practice spec §6)
  });

  it('seeds only missing built-in words and keeps existing flags', async () => {
```

Replace the whole of `src/store/settings.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

const SPEAKING_ON = { ...DEFAULT_SETTINGS.activities, speaking: true };

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v8 (spec 2026-10-05 §7 the switches and the ceiling; 2026-10-11 §6 both tracks, §4 the 15-minute lesson; 2026-10-12 §7 朗读 on; production practice §6 the 20-minute lesson)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 8 })).toBeNull();
  });
  it('an install on the old 20-minute default moved to 30, then to 15, and now to 20', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 20, lessonVersion: 8 });
  });
  it('keeps a shorter lesson the parent chose', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 10, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 10, lessonVersion: 8 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 8 })).toBeNull();
  });
  it('a fresh install starts at 20 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(20);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings on to 30, 15 and 20, even though the defaults already say the current lessonVersion', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(20);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 30 }, 'main'); // the parent chooses 30 later
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(30);
  });
  it('leaves a fresh install alone', async () => {
    const db = await freshDb();
    await applySettingsMigration(db);
    expect(await db.get('settings', 'main')).toBeUndefined();
  });
});

describe('lessonVersion 4 (spec 2026-10-05 §7)', () => {
  const old = (activities: Record<string, boolean>, newPerDay = 4) => ({ ...DEFAULT_SETTINGS, lessonVersion: 3, newPerDay, activities: activities as never });
  it('maps the old switches: 认一认 → 新字 and 练一练; 选一选 or 钓鱼 → 练一练', () => {
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: true }); // v7 then turns the speaking step on with 朗读
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(8);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it('a parent who picked one track since keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
});

describe('lessonVersion 6: the 15-minute lesson (spec 2026-10-11 §4)', () => {
  it('moves 30 minutes, the old default, to 15 — and v8 on to 20 — touching nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: 30, course: 'cl' })).toEqual({ sessionMinutes: 20, langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it('only exactly 30: any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 35, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: m })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
});

describe('lessonVersion 7: 朗读 back as a daily step (spec 2026-10-12 §7)', () => {
  it('turns 朗读 on once for an install on 6, and nothing else (a 30-minute lesson chosen since stays)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6, langdu: false, sessionMinutes: 30 })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it("turns the lesson's speaking step on with it, so 朗读 actually runs; the other activity switches stay (final review M2)", () => {
    const activities = { newwords: true, practice: false, writing: false, speaking: false };
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6, langdu: false, activities })).toEqual({ langdu: true, activities: { ...activities, speaking: true }, lessonVersion: 8 });
  });
  it('a new install starts with 朗读 on and 看图说话 off', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ langdu: true, story: false, lessonVersion: 8 });
  });
  it('runs once: a parent who turns 朗读 off afterwards keeps it off', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, langdu: false, lessonVersion: 6 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(true);
    await db.put('settings', { ...(await getSettings(db)), langdu: false }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(false);
  });
});

describe('lessonVersion 8: the 20-minute lesson (production practice spec §6)', () => {
  it('moves exactly 15 minutes to 20, and nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 7, sessionMinutes: 15 })).toEqual({ sessionMinutes: 20, lessonVersion: 8 });
  });
  it('any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 30, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 7, sessionMinutes: m })).toEqual({ lessonVersion: 8 });
  });
  it('runs once: a parent who picks 15 afterwards keeps it', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 7 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(20);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 15 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/store/settings.test.ts src/store/repo.test.ts src/store/backup.test.ts src/bootstrap.test.ts src/session/writing.test.ts src/session/plan.test.ts`
Expected: FAIL — `writeCharTarget(20)` is 5 (want 7), `DEFAULT_SETTINGS.sessionMinutes` is 15, migrations end on `lessonVersion: 7`.

- [ ] **Step 3: Implement**

In `src/session/plan.ts`, replace:

```ts
  newPerDay?: number; // today's pace (spec 2026-10-05 §2.2); without one, the pace's start under the ceiling
}

export const PRACTICE_SHARE = 1 / 3; // 练一练's share of the lesson: 5 of the usual 15 minutes, 朗读 takes ~3 (spec 2026-10-12 §4)
export const NEW_MEANING_PER_DAY = 12; // words he knows (placed or learned) starting meaning checks each day
export const MEANING_REVIEW_CAP = 30;
/** Hear cards reviewed in one lesson at most (spec 2026-10-06 §3.2). */
```

with:

```ts
  newPerDay?: number; // today's pace (spec 2026-10-05 §2.2); without one, the pace's start under the ceiling
}

export const PRACTICE_SHARE = 1 / 3; // 练一练's share of the lesson: ~6.7 of the usual 20 minutes, 朗读 takes ~3 (production practice spec §6)
export const NEW_MEANING_PER_DAY = 12; // words he knows (placed or learned) starting meaning checks each day
export const MEANING_REVIEW_CAP = 30;
/** Hear cards reviewed in one lesson at most (spec 2026-10-06 §3.2). */
```

In `src/session/writing.ts`, replace:

```ts
// 写一写 (spec 2026-10-05 §5; spec 2026-10-11 §4): 4 characters from memory at the usual 15 minutes (writeCharTarget), at or below his level, traced only once, never back to back.
import { hanChars } from '../content';
import { State } from 'ts-fsrs';
import { writeAt } from '../content/curriculum';
```

with:

```ts
// 写一写 (spec 2026-10-05 §5; spec 2026-10-11 §4): 7 characters at the usual 20 minutes (writeCharTarget), at or below his level, traced only once, never back to back.
import { hanChars } from '../content';
import { State } from 'ts-fsrs';
import { writeAt } from '../content/curriculum';
```

In `src/session/writing.ts`, replace:

```ts
import type { CardRecord, Word } from '../types';

export const MAX_WRITE_CHARS = 10;
/** Characters a lesson (spec 2026-10-12 §4, 朗读 takes its ~3 minutes): 4 under 20 minutes (the usual 15), 5 at 20, 7 at 25, 8 at 30, 9 from 40. */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 20 ? 4 : minutes < 25 ? 5 : minutes < 30 ? 7 : minutes < 40 ? 8 : 9);

/**
 * A word to write this lesson: the characters to write (each once — 妈妈 is one; one another word already brings is left out),
```

with:

```ts
import type { CardRecord, Word } from '../types';

export const MAX_WRITE_CHARS = 10;
/** Characters a lesson (production practice spec §3, §6): 4 under 20 minutes, 7 at 20 (the usual), 8 at 25, 9 at 30, 10 from 40. */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 20 ? 4 : minutes < 25 ? 7 : minutes < 30 ? 8 : minutes < 40 ? 9 : 10);

/**
 * A word to write this lesson: the characters to write (each once — 妈妈 is one; one another word already brings is left out),
```

Replace the whole of `src/store/settings.ts` with:

```ts
import { DEFAULT_SETTINGS, type Settings } from '../types';
import type { AppDb } from './db';
import { getSettings, updateSettings } from './repo';

/**
 * One-off moves for existing installs; only an old default moves, a parent's own choice stays.
 * Plan 11 (v2): a 20-minute lesson grows to 30. Plan 13 (v3): 5 new words a day becomes 4 (spec §20 part 2).
 * Lesson redesign (v4, spec 2026-10-05 §7): the activity switches become 新字 / 练一练 / 写一写 / 朗读, and the old default
 * number of new words becomes the ceiling 8 the app paces under (§2.2).
 * Both tracks (v5, spec 2026-10-11 §6): every install moves to 华文 + 高级华文 once, as the parent asked; a later pick stays.
 * The 15-minute lesson (v6, spec 2026-10-11 §4): a lesson on the old default of exactly 30 minutes becomes 15; any other length stays.
 * 朗读 back (v7, spec 2026-10-12 §7): 朗读 is switched on once, with the lesson's speaking step (Activities) it runs in; a parent who
 * turns either off later keeps it off.
 * The 20-minute lesson (v8, production practice spec §6): a lesson on exactly 15 minutes becomes 20; any other length stays.
 */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 8) return null;
  const patch: Partial<Settings> = {};
  if (v < 7) {
    if (v < 4) {
      if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
      const perDay = v < 3 && s.newPerDay === 5 ? 4 : s.newPerDay;
      patch.newPerDay = perDay === 4 ? 8 : perDay;
      const was = s.activities as unknown as Partial<Record<'flashcards' | 'choose' | 'components' | 'writing' | 'speaking', boolean>>;
      const on = (k: keyof typeof was) => was[k] ?? true;
      patch.activities = { newwords: on('flashcards'), practice: on('flashcards') || on('choose') || on('components'), writing: on('writing'), speaking: on('speaking') };
    }
    if (v < 5) patch.course = 'both';
    if (v < 6 && (patch.sessionMinutes ?? s.sessionMinutes) === 30) patch.sessionMinutes = 15; // an install moved to 30 by v2 was on the default too
    patch.langdu = true;
    patch.activities = { ...(patch.activities ?? s.activities), speaking: true }; // 朗读 runs in the speaking step: both switches on (final review M2)
  }
  if ((patch.sessionMinutes ?? s.sessionMinutes) === 15) patch.sessionMinutes = 20; // v8: the old default only
  patch.lessonVersion = 8;
  return patch;
}

/** Runs the one-off moves against what's actually stored (getSettings fills in today's defaults, which already say the current lessonVersion). */
export async function applySettingsMigration(db: AppDb): Promise<void> {
  const raw = await db.get('settings', 'main');
  if (!raw) return; // a fresh install starts on today's defaults
  const patch = migrateSettings({ ...(await getSettings(db)), lessonVersion: raw.lessonVersion, activities: raw.activities ?? DEFAULT_SETTINGS.activities });
  if (patch) await updateSettings(db, patch);
}
```

In `src/types.ts`, replace:

```ts

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 15, // one ~15-minute lesson (spec 2026-10-11 §4)
  newPerDay: 8, // the ceiling the app paces under (spec 2026-10-05 §2.2)
  activities: { newwords: true, practice: true, writing: true, speaking: true },
  speechRate: 0.8,
```

with:

```ts

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 20, // one ~20-minute lesson (spec 2026-10-12 production practice §6)
  newPerDay: 8, // the ceiling the app paces under (spec 2026-10-05 §2.2)
  activities: { newwords: true, practice: true, writing: true, speaking: true },
  speechRate: 0.8,
```

In `src/types.ts`, replace:

```ts
  oral: { name: '', age: '', school: '', className: '', customIntro: '' },
  story: false,
  langdu: true,
  lessonVersion: 7,
};

export type PetColor = 'green' | 'blue' | 'purple' | 'red' | 'gold';
```

with:

```ts
  oral: { name: '', age: '', school: '', className: '', customIntro: '' },
  story: false,
  langdu: true,
  lessonVersion: 8,
};

export type PetColor = 'green' | 'blue' | 'purple' | 'red' | 'gold';
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/store/settings.test.ts src/store/repo.test.ts src/store/backup.test.ts src/bootstrap.test.ts src/session/writing.test.ts src/session/plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and type-check**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: every file passes (a slow rendered test that times out under load: rerun that file alone); no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: the 20-minute lesson — 7 characters to write, settings v8 moves 15 to 20" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 写一写 picks read-only characters to trace (at most half)

**Files:**
- Modify: `src/types.ts` (`Word.tracedAt`, `SessionPlan.writeWordIds`)
- Modify: `src/session/writing.ts` (`WriteUnit.readOnly`, `WriteItem.readOnly`, `isReadOnly`, `pickWriteUnits`, `orderWriteItems`)
- Modify: `src/session/plan.ts:108-110` (`writeWordIds`)
- Test: `src/session/writing.test.ts` (append), `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `writeCharTarget` (Task 1).
- Produces: `interface WriteUnit { wordId: string; chars: string[]; ats?: number[]; isNew: boolean; readOnly?: true }`; `interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean; readOnly?: true }` (a read-only item: one `'trace'` pass, never `last`); `Word.tracedAt?: number`; `SessionPlan.writeWordIds?: string[]` (every unit's `wordId`, `[]` with 写一写 off).

- [ ] **Step 1: Write the failing tests**

In `src/session/plan.test.ts`, replace:

```ts
  it('朗读 switched off: no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: false }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('练一练 has a third of the default 20 minutes (production practice spec §6)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
```

with:

```ts
  it('朗读 switched off: no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: false }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('the plan carries the words 写一写 covers, so 练一练 can leave out their 组词 taps (production practice spec §3)', () => {
    const ws = [...chars(3), makeWord('澡', { id: 'b:澡', rank: 50, writeable: false })];
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now, practised: new Map([['b:澡', now.getTime() - 3_600_000]]) });
    expect(new Set(plan.writeWordIds)).toEqual(new Set(['b:0', 'b:1', 'b:2', 'b:澡']));
    expect(plan.writeItems!.find((i) => i.wordId === 'b:澡')).toMatchObject({ pass: 'trace', readOnly: true });
    expect(buildSessionPlan({ cards, words: ws, settings: settings({ activities: { ...DEFAULT_SETTINGS.activities, writing: false } }), now }).writeWordIds).toEqual([]);
  });
  it('练一练 has a third of the default 20 minutes (production practice spec §6)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
```

Append to the end of `src/session/writing.test.ts`:

```ts

describe('read-only characters are traced (production practice spec §3)', () => {
  const now4 = new Date(2026, 9, 12, 10);
  const later = new Date(2026, 9, 30);
  const base4 = { level: 2, cutoff: now4.getTime() + 86_400_000, target: 7 };
  const wl = Array.from('一二三四五六七八').map((t, i) => makeWord(t, { rank: i }));
  const ro = Array.from('澡羽乖吐宠').map((t, i) => makeWord(t, { rank: 100 + i, writeable: false }));
  const read = (w: { id: string }) => makeCard(w.id, 'recognise', later, true);
  const cards = [...wl, ...ro].map(read);
  /** read-only 澡 乖 吐 宠 were in recent lessons (宠 the newest); 羽 is today's new word */
  const practised = new Map(['澡', '乖', '吐', '宠'].map((t, i) => [`b:${t}`, now4.getTime() - (10 - i) * 3_600_000]));
  const pick = (over: Partial<Parameters<typeof pickWriteUnits>[0]> = {}) => pickWriteUnits({ ...base4, cards, words: [...wl, ...ro], newWordIds: ['b:羽'], practised, ...over });
  it('at most half the target (rounded down): today\'s first, then the newest recent ones; the write list has the rest', () => {
    const units = pick();
    expect(units.filter((u) => u.readOnly).map((u) => u.wordId)).toEqual(['b:羽', 'b:宠', 'b:吐']);
    expect(units.filter((u) => !u.readOnly)).toHaveLength(4);
    expect(units.reduce((n, u) => n + u.chars.length, 0)).toBe(7);
    expect(pick({ target: 4 }).filter((u) => u.readOnly)).toHaveLength(2);
  });
  it('a recent one already traced is not traced again; fewer read-only ones leave their slots to the write list', () => {
    const traced = ro.map((w) => (w.text === '羽' ? w : { ...w, tracedAt: now4.getTime() - 86_400_000 }));
    const units = pick({ words: [...wl, ...traced] });
    expect(units.filter((u) => u.readOnly).map((u) => u.wordId)).toEqual(['b:羽']);
    expect(units.filter((u) => !u.readOnly)).toHaveLength(6);
  });
  it('due writing fills only the write list\'s share: the traced ones keep theirs', () => {
    const due = wl.map((w) => makeCard(w.id, 'write', new Date(now4.getTime() - 3_600_000)));
    const units = pick({ cards: [...cards, ...due] });
    expect(units.filter((u) => !u.readOnly).map((u) => u.wordId)).toEqual(['b:一', 'b:二', 'b:三', 'b:四']);
    expect(units.filter((u) => u.readOnly)).toHaveLength(3);
  });
  it('never a character he has a write card for, a 词语, or one he has not begun reading', () => {
    const units = pick({ cards: [...cards.filter((c) => c.wordId !== 'b:宠'), makeCard('b:吐', 'write', later)], words: [...wl, ...ro, makeWord('宠物', { id: 'w:宠物', writeable: false })], practised: new Map([...practised, ['w:宠物', now4.getTime()]]) });
    expect(units.filter((u) => u.readOnly).map((u) => u.wordId)).toEqual(['b:羽', 'b:乖', 'b:澡']);
  });
  it('a recent one whose strokes failed to load goes behind the others, so it never holds a slot every lesson (review focus 2)', () => {
    const failed = ro.map((w) => (w.text === '宠' ? { ...w, writeSkippedAt: now4.getTime() - 3_600_000 } : w));
    expect(pick({ words: [...wl, ...failed] }).filter((u) => u.readOnly).map((u) => u.wordId)).toEqual(['b:羽', 'b:吐', 'b:乖']);
  });
  it('a read-only character is only traced, and never finishes a word (no write card is rated)', () => {
    const items = orderWriteItems([{ wordId: 'b:一', chars: ['一'], isNew: true }, { wordId: 'b:羽', chars: ['羽'], isNew: true, readOnly: true }, { wordId: 'b:二', chars: ['二'], isNew: false }]);
    expect(items.filter((i) => i.wordId === 'b:羽')).toEqual([{ wordId: 'b:羽', at: 0, pass: 'trace', isNew: true, readOnly: true }]);
    expect(items.filter((i) => i.last).map((i) => i.wordId).sort()).toEqual(['b:一', 'b:二']);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/session/writing.test.ts src/session/plan.test.ts`
Expected: FAIL — no unit has `readOnly`, `plan.writeWordIds` is `undefined`.

- [ ] **Step 3: Implement**

In `src/session/plan.ts`, replace:

```ts
    writeCandidates: writeUnits.map((u) => ({ wordId: u.wordId, isNew: u.isNew })),
    writeItems,
    writeCount: writeItems.length,
    // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
    // only words that can be asked by ear: a card that can't be asked would stay due and hold a slot forever (final review I1)
    hearReviewIds: dueOf(hear).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'hear'); }).slice(0, HEAR_REVIEW_CAP).map((c) => c.wordId),
```

with:

```ts
    writeCandidates: writeUnits.map((u) => ({ wordId: u.wordId, isNew: u.isNew })),
    writeItems,
    writeCount: writeItems.length,
    writeWordIds: writeUnits.map((u) => u.wordId),
    // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
    // only words that can be asked by ear: a card that can't be asked would stay due and hold a slot forever (final review I1)
    hearReviewIds: dueOf(hear).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'hear'); }).slice(0, HEAR_REVIEW_CAP).map((c) => c.wordId),
```

In `src/session/writing.ts`, replace:

```ts

/**
 * A word to write this lesson: the characters to write (each once — 妈妈 is one; one another word already brings is left out),
 * `ats` their places in the word, and whether he has never written it (each character is traced once first).
 */
export interface WriteUnit { wordId: string; chars: string[]; ats?: number[]; isNew: boolean }
/** One character of a word, one pass; `last` is the item that finishes the word, which rates its write card. */
export interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean }

/**
 * The words to write (spec §5), up to `target` characters and never half a word: writing due today, then today's new words
 * and recent lesson words he reads, then characters he reads within reach — a book character once his class has written it, others at his level — going down. Never one he can't read.
 */
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
```

with:

```ts

/**
 * A word to write this lesson: the characters to write (each once — 妈妈 is one; one another word already brings is left out),
 * `ats` their places in the word, and whether he has never written it (each character is traced once first). `readOnly`: a
 * character he reads but his course never has him write — traced over its outline, once, and never on a write card
 * (production practice spec §3).
 */
export interface WriteUnit { wordId: string; chars: string[]; ats?: number[]; isNew: boolean; readOnly?: true }
/** One character of a word, one pass; `last` is the item that finishes the word, which rates its write card (never a read-only one). */
export interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean; readOnly?: true }

/** A character he reads that no write list of his course has (not writeable, no write card): traced, never written from memory. */
const isReadOnly = (w: Word, written: ReadonlyMap<string, CardRecord>): boolean =>
  !w.paused && !w.writeable && !written.has(w.id) && Array.from(w.text).length === 1 && hanChars(w.text).length === 1;

/**
 * The words to write (spec §5), up to `target` characters and never half a word. First up to half the target (rounded down) goes
 * to read-only characters (production practice spec §3): today's new ones, then recent lesson ones he reads that he has never
 * traced, the newest first. The other slots go to the write list: writing due today, then today's new words and recent lesson
 * words he reads, then characters he reads within reach — a book character once his class has written it, others at his level —
 * going down. Never one he can't read.
 */
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
```

In `src/session/writing.ts`, replace:

```ts
  const readable = [...byId.values()]
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && inReach(w); })
    .sort((a, b) => skippedLast(a, b) || (b.level ?? 0) - (a.level ?? 0) || (b.rank ?? -1) - (a.rank ?? -1));
  const out: WriteUnit[] = [];
  const seen = new Set<string>();
  const taken = new Set<string>(); // a character comes once a lesson (final review I2)
  let n = 0;
  const add = (w: Word, isNew: boolean) => {
    const all = hanChars(w.text);
    const ats = all.map((_, i) => i).filter((i) => all.indexOf(all[i]!) === i && !taken.has(all[i]!));
    const chars = ats.map((i) => all[i]!);
    // a word that doesn't fit waits and a shorter one may; one longer than the whole count is written on its own (sweep)
    if (seen.has(w.id) || !chars.length || (n + chars.length > target && n > 0)) return;
    seen.add(w.id);
    for (const c of chars) taken.add(c);
    out.push({ wordId: w.id, chars, ats, isNew });
    n += chars.length;
  };
  for (const c of due) { if (n >= target) break; add(byId.get(c.wordId)!, c.fsrs.reps === 0); }
  for (const w of [...today, ...recent, ...readable]) { if (n >= target) break; add(w, true); }
  return out;
}

/**
 * The order (spec §5; final review I1): a never-written character is traced once, early, and comes back from memory at least two
 * items later; the same character never twice in a row, and a word's characters apart, wherever anything can come between. The
 * words with the most still to do go first (as when spreading out letters), so none is left to pile up at the end.
 */
export function orderWriteItems(units: WriteUnit[]): WriteItem[] {
  type Slot = { u: WriteUnit; at: number; ch: string; passes: ('trace' | 'recall')[]; next: number; readyAt: number; order: number };
  let order = 0;
  const slots: Slot[] = units.flatMap((u) => u.chars.map((ch, i): Slot => ({ u, at: u.ats?.[i] ?? i, ch, passes: u.isNew ? ['trace', 'recall'] : ['recall'], next: 0, readyAt: 0, order: order++ })));
  const out: WriteItem[] = [];
  let last: Slot | null = null;
  while (true) {
```

with:

```ts
  const readable = [...byId.values()]
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && inReach(w); })
    .sort((a, b) => skippedLast(a, b) || (b.level ?? 0) - (a.level ?? 0) || (b.rank ?? -1) - (a.rank ?? -1));
  // read-only characters (production practice spec §3): today's, then recent lesson ones he reads (Read begun) never traced
  const active = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const roToday = newWordIds.map((id) => active.get(id)).filter((w): w is Word => !!w && isReadOnly(w, write));
  const roRecent = [...active.values()]
    .filter((w) => isReadOnly(w, write) && w.tracedAt === undefined && reads.has(w.id) && practised.has(w.id) && reads.get(w.id)!.fsrs.state !== State.Relearning)
    .sort((a, b) => skippedLast(a, b) || practised.get(b.id)! - practised.get(a.id)!);
  const out: WriteUnit[] = [];
  const seen = new Set<string>();
  const taken = new Set<string>(); // a character comes once a lesson (final review I2)
  let n = 0;
  const add = (w: Word, isNew: boolean, cap: number, readOnly = false) => {
    const all = hanChars(w.text);
    const ats = all.map((_, i) => i).filter((i) => all.indexOf(all[i]!) === i && !taken.has(all[i]!));
    const chars = ats.map((i) => all[i]!);
    // a word that doesn't fit waits and a shorter one may; one longer than the whole count is written on its own (sweep)
    if (seen.has(w.id) || !chars.length || (n + chars.length > cap && n > 0)) return;
    seen.add(w.id);
    for (const c of chars) taken.add(c);
    out.push({ wordId: w.id, chars, ats, isNew, ...(readOnly ? { readOnly: true as const } : {}) });
    n += chars.length;
  };
  // their share is kept for them first: due writing alone would fill a 20-minute lesson most days (measured on a P2 profile)
  const traced = [...new Set([...roToday, ...roRecent])].slice(0, Math.floor(target / 2));
  const share = target - traced.length;
  for (const c of due) { if (n >= share) break; add(byId.get(c.wordId)!, c.fsrs.reps === 0, share); }
  for (const w of [...today, ...recent, ...readable]) { if (n >= share) break; add(w, true, share); }
  for (const w of traced) add(w, true, target, true);
  return out;
}

/**
 * The order (spec §5; final review I1): a read-only character is traced once and only traced; a never-written character is traced once, early, and comes back from memory at least two
 * items later; the same character never twice in a row, and a word's characters apart, wherever anything can come between. The
 * words with the most still to do go first (as when spreading out letters), so none is left to pile up at the end.
 */
export function orderWriteItems(units: WriteUnit[]): WriteItem[] {
  type Slot = { u: WriteUnit; at: number; ch: string; passes: ('trace' | 'recall')[]; next: number; readyAt: number; order: number };
  let order = 0;
  const slots: Slot[] = units.flatMap((u) => u.chars.map((ch, i): Slot => ({ u, at: u.ats?.[i] ?? i, ch, passes: u.readOnly ? ['trace'] : u.isNew ? ['trace', 'recall'] : ['recall'], next: 0, readyAt: 0, order: order++ })));
  const out: WriteItem[] = [];
  let last: Slot | null = null;
  while (true) {
```

In `src/session/writing.ts`, replace:

```ts
    ];
    const [tier, by] = tiers.find(([t]) => t.length)!;
    const s = [...tier].sort(by)[0]!;
    out.push({ wordId: s.u.wordId, at: s.at, pass: s.passes[s.next]!, isNew: s.u.isNew });
    s.next += 1;
    s.readyAt = p + 3;
    last = s;
  }
  const done = new Set<string>();
  for (let i = out.length - 1; i >= 0; i--) {
    if (done.has(out[i]!.wordId)) continue;
    done.add(out[i]!.wordId);
    out[i] = { ...out[i]!, last: true };
  }
```

with:

```ts
    ];
    const [tier, by] = tiers.find(([t]) => t.length)!;
    const s = [...tier].sort(by)[0]!;
    out.push({ wordId: s.u.wordId, at: s.at, pass: s.passes[s.next]!, isNew: s.u.isNew, ...(s.u.readOnly ? { readOnly: true as const } : {}) });
    s.next += 1;
    s.readyAt = p + 3;
    last = s;
  }
  const done = new Set<string>();
  for (let i = out.length - 1; i >= 0; i--) {
    if (done.has(out[i]!.wordId) || out[i]!.readOnly) continue; // a traced read-only character never rates a write card
    done.add(out[i]!.wordId);
    out[i] = { ...out[i]!, last: true };
  }
```

In `src/types.ts`, replace:

```ts
  createdAt: number;
  examples?: Example[];
  writeSkippedAt?: number; // last time its strokes failed to load in 听写; such words go to the back of the queue
  sentences?: Example[]; // imported class sentences that use this word (on-device only)
  pairs?: string[]; // words it pairs with in class (保持 → 安静)
  tags?: string[]; // e.g. '成语'
```

with:

```ts
  createdAt: number;
  examples?: Example[];
  writeSkippedAt?: number; // last time its strokes failed to load in 听写; such words go to the back of the queue
  tracedAt?: number; // a read-only character's first trace in 写一写 (production practice spec §3): a recent one is traced once
  sentences?: Example[]; // imported class sentences that use this word (on-device only)
  pairs?: string[]; // words it pairs with in class (保持 → 安静)
  tags?: string[]; // e.g. '成语'
```

In `src/types.ts`, replace:

```ts
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
}

export interface FlashItem {
```

with:

```ts
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
  writeWordIds?: string[]; // the words 写一写 covers today (production practice spec §3): 练一练 leaves out their 组词 taps; plans saved before it have none
}

export interface FlashItem {
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/session/writing.test.ts src/session/plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: 写一写 traces read-only characters, at most half the day's" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tracing, and the 组词 he writes rates its meaning (once a lesson)

**Files:**
- Create: `src/session/writeCredit.ts`, `src/session/writeCredit.test.ts`
- Modify: `src/types.ts` (`ReviewLog.source`, `SessionRecord.meaningCredit`)
- Modify: `src/session/runner.ts` (`WriteTask.readOnly`, `currentWriteTask`, `afterWriteWord`)
- Modify: `src/session/record.ts` (`recordWrittenMeaning`, `markTraced`)
- Modify: `src/app/SessionScreen.tsx` (imports; `onWriteDone`)
- Test: `src/session/record.test.ts`, `src/session/runner.test.ts`, `src/activities/writing/WritingStep.test.tsx`

**Interfaces:**
- Consumes: `WriteItem.readOnly` (Task 2); `writingCue(word, at)` (`src/activities/writing/cue.ts`); `settleRung`, `bringForward`, `reviewCard` (record.ts).
- Produces: `WriteTask.readOnly?: boolean`; `afterWriteWord(rec, done, rawElapsedMs, outcome?: { hinted?: boolean; misses?: number; credited?: boolean })` appends `task.wordId` to `SessionRecord.meaningCredit?: string[]` when `credited`; `RECALL_RIGHT_MISSES = 1`, `TRACE_RIGHT_MISSES = 3`; `meaningCredit(rec: SessionRecord, task: WriteTask, result: { totalMisses: number; hinted: boolean }, word: Word, useOpen: boolean): boolean | null`; `recordWrittenMeaning(db: AppDb, wordId: string, correct: boolean, now: Date): Promise<CardRecord>`; `markTraced(db: AppDb, wordId: string, now: Date): Promise<void>`; `ReviewLog.source?: 'use' | 'write'`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/writing/WritingStep.test.tsx`, replace:

```tsx
    render(<WritingStep word={makeWord('朋友', { pinyin: 'péng you' })} at={1} kid={DEFAULT_KID} isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__prompt .pinyin')?.textContent).toBe('yǒu');
  });
  it('skips the word when its stroke data cannot load', () => {
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} isNew={false} pass="recall" onDone={onDone} />);
```

with:

```tsx
    render(<WritingStep word={makeWord('朋友', { pinyin: 'péng you' })} at={1} kid={DEFAULT_KID} isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__prompt .pinyin')?.textContent).toBe('yǒu');
  });
  it('a traced character (a read-only one, production practice spec §3) shows its outline and reports its misses', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('澡', { pinyin: 'zǎo', writeable: false })} kid={DEFAULT_KID} isNew pass="trace" onDone={onDone} />);
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![2]).toMatchObject({ showOutline: true, showHintAfterMisses: 1 });
    expect(document.querySelector('.pet__bubble')?.textContent).toContain('描一描');
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 3 }));
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 3, hinted: false, elapsedMs: expect.any(Number) });
  });
  it('skips the word when its stroke data cannot load', () => {
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} isNew={false} pass="recall" onDone={onDone} />);
```

In `src/session/record.test.ts`, replace:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { addReviewLog, allCards, allWords, getSession, getSettings, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { builtinWords } from '../content';
import { seededKnownCard } from '../srs/scheduler';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb, makeWord } from '../test/fixtures';
import { bringForward, markWriteSkipped, recordMeaning, recordRecognition, recordUse, recordWriting, startExtraLesson, startOrResumeSession } from './record';
/** One character each (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const DISTINCT = Array.from('一二三四五六七八九十人大小山水火木日月田上下中天地子女手口目耳心土石云雨花草米竹虫鱼羊牛马鸟');

const now = new Date(2026, 9, 2, 9);

```

with:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { addReviewLog, allCards, allWords, getCard, getSession, getSettings, getWord, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { builtinWords } from '../content';
import { seededKnownCard } from '../srs/scheduler';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb, makeWord } from '../test/fixtures';
import { bringForward, markTraced, markWriteSkipped, recordMeaning, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession } from './record';
/** One character each (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const DISTINCT = Array.from('一二三四五六七八九十人大小山水火木日月田上下中天地子女手口目耳心土石云雨花草米竹虫鱼羊牛马鸟');

const now = new Date(2026, 9, 2, 9);

```

Append to the end of `src/session/record.test.ts`:

```ts

describe('the 组词 written in 写一写 rates meaning (production practice spec §3)', () => {
  const day = (d: number, h = 17) => new Date(2026, 9, d, h);
  it('logged like the other meaning ratings, with no answer time; two right days pass the Use rung', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('计', { examples: [{ text: '计划', pinyin: 'jì huà' }] })]);
    await recordWrittenMeaning(db, 'b:计', true, day(5));
    const [log] = await logsSince(db, 0);
    expect(log).toMatchObject({ kind: 'meaning', cardId: 'b:计:meaning', correct: true, rating: Rating.Good, source: 'write' });
    expect(log!.responseMs).toBeUndefined();
    expect((await getCard(db, 'b:计:meaning'))!.passed).toBeUndefined();
    await recordWrittenMeaning(db, 'b:计', true, day(6));
    expect((await getCard(db, 'b:计:meaning'))!.passed).toBe(day(6).getTime());
  });
  it('wrong rates Again; a second rating the same day only brings a miss forward', async () => {
    const db = await freshDb();
    await recordUse(db, 'b:计', true, day(5, 9)); // 练一练 rated it this morning
    await recordWrittenMeaning(db, 'b:计', false, day(5));
    expect((await logsSince(db, 0)).filter((l) => l.source === 'write')).toEqual([]);
    expect((await getCard(db, 'b:计:meaning'))!.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 5, 23, 59, 59, 999).getTime());
    const db2 = await freshDb();
    await recordWrittenMeaning(db2, 'b:计', false, day(5));
    expect((await logsSince(db2, 0)).map((l) => [l.rating, l.correct])).toEqual([[Rating.Again, false]]);
  });
  it('markTraced notes a read-only character\'s first trace, once', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('澡', { writeable: false })]);
    await markTraced(db, 'b:澡', day(5));
    await markTraced(db, 'b:澡', day(6));
    expect((await getWord(db, 'b:澡'))!.tracedAt).toBe(day(5).getTime());
    await markTraced(db, 'b:不在', day(6)); // not stored (a ladder 词语): nothing happens
  });
});
```

Append to the end of `src/session/runner.test.ts`:

```ts

describe('写一写 does the 组词 work (production practice spec §3)', () => {
  const items: WriteItem[] = [{ wordId: 'r', at: 0, pass: 'trace', isNew: true, readOnly: true }, { wordId: 'w', at: 0, pass: 'recall', isNew: false, last: true }];
  const wp: SessionPlan = { steps: ['writing', 'speaking'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: items.length, writeItems: items };
  it('a read-only item is a trace that rates no write card', () => {
    const rec = createSessionRecord(wp, 'd', 0);
    expect(currentWriteTask(rec)).toEqual({ wordId: 'r', isNew: true, pass: 'trace', redo: false, at: 0, last: false, readOnly: true });
  });
  it('a pass that rated meaning is remembered for the lesson; one that did not is not', () => {
    let rec = createSessionRecord(wp, 'd', 0);
    rec = afterWriteWord(rec, true, 10, { misses: 0, credited: true });
    expect(rec.meaningCredit).toEqual(['r']);
    rec = afterWriteWord(rec, true, 10, { misses: 0 });
    expect(rec.meaningCredit).toEqual(['r']);
  });
});
```

#### Create `src/session/writeCredit.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { SessionRecord } from '../types';
import { createSessionRecord, type WriteTask } from './runner';
import { meaningCredit } from './writeCredit';

const ji = makeWord('计', { pinyin: 'jì', examples: [{ text: '计划', pinyin: 'jì huà' }] }); // cue: 「计，计划的计」 (＿划)
const bare = makeWord('计', { pinyin: 'jì' }); // no 组词: the cue is its pinyin
const rec: SessionRecord = createSessionRecord({ steps: ['writing'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, 'd', 0);
const recall: WriteTask = { wordId: ji.id, isNew: false, pass: 'recall', redo: false, at: 0, last: true };
const traced: WriteTask = { wordId: ji.id, isNew: true, pass: 'trace', redo: false, at: 0, readOnly: true };
const ok = { totalMisses: 0, hinted: false };

describe('the 组词 he writes rates its meaning (production practice spec §3)', () => {
  it('a write-list character from memory: right with no hint and at most 1 miss, else wrong', () => {
    expect(meaningCredit(rec, recall, ok, ji, true)).toBe(true);
    expect(meaningCredit(rec, recall, { totalMisses: 1, hinted: false }, ji, true)).toBe(true);
    expect(meaningCredit(rec, recall, { totalMisses: 2, hinted: false }, ji, true)).toBe(false);
    expect(meaningCredit(rec, recall, { totalMisses: 0, hinted: true }, ji, true)).toBe(false);
  });
  it('a traced read-only character: right with at most 3 misses', () => {
    expect(meaningCredit(rec, traced, { totalMisses: 3, hinted: false }, ji, true)).toBe(true);
    expect(meaningCredit(rec, traced, { totalMisses: 4, hinted: false }, ji, true)).toBe(false);
  });
  it('once a lesson: a word already rated by 写一写 is not rated again', () => {
    expect(meaningCredit({ ...rec, meaningCredit: [ji.id] }, recall, ok, ji, true)).toBeNull();
  });
  it('never a write-list trace, a redo, a cue that is not a 组词, a word whose Use rung is not open, or free play', () => {
    expect(meaningCredit(rec, { ...recall, pass: 'trace' }, ok, ji, true)).toBeNull();
    expect(meaningCredit(rec, { ...recall, redo: true }, ok, ji, true)).toBeNull();
    expect(meaningCredit(rec, recall, ok, bare, true)).toBeNull();
    expect(meaningCredit(rec, recall, ok, ji, false)).toBeNull();
    expect(meaningCredit({ ...rec, free: true }, recall, ok, ji, true)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/session/writeCredit.test.ts src/session/record.test.ts src/session/runner.test.ts src/activities/writing/WritingStep.test.tsx`
Expected: FAIL — `./writeCredit` cannot be found; `recordWrittenMeaning` / `markTraced` are not exported; `currentWriteTask` has no `readOnly`; `meaningCredit` stays unset. (The WritingStep trace test passes already: the trace pass exists; it pins the outline for read-only items.)

- [ ] **Step 3: Implement**

In `src/app/SessionScreen.tsx`, replace:

```tsx
import { planFreePlay, planPractice } from '../session/practice';
import { idiomsFor, learnerLevel, type Idiom } from '../content/chengyu';
import { requestGreeting } from '../ui/truffle/greeting';
import { beginNewWord, bringForward, markWriteSkipped, recordHear, recordMeaning, recordUnderstand, recordRecognition, recordUse, recordWriting, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
import { settleLessonStars } from '../session/stars';
import { starsOf } from '../stats/stats';
import {
```

with:

```tsx
import { planFreePlay, planPractice } from '../session/practice';
import { idiomsFor, learnerLevel, type Idiom } from '../content/chengyu';
import { requestGreeting } from '../ui/truffle/greeting';
import { beginNewWord, bringForward, markTraced, markWriteSkipped, recordHear, recordMeaning, recordUnderstand, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
import { meaningCredit } from '../session/writeCredit';
import { settleLessonStars } from '../session/stars';
import { starsOf } from '../stats/stats';
import {
```

In `src/app/SessionScreen.tsx`, replace:

```tsx
      const task = writeCandidate!;
      // only the recall pass rates the word (spec §20 part 3); a redo at the end is extra practice. Written a character at a time
      // (spec 2026-10-05 §5), the word is rated once, on the character that finishes it, with all its misses from memory.
      const rates = task.at === undefined ? true : !!task.last;
      if (r && !rec.free && task.pass === 'recall' && !task.redo && rates) await recordWriting(db, task.wordId, wordMisses(rec, task.wordId) + r.totalMisses, now());
      if (!r) await markWriteSkipped(db, task.wordId, now()); // any word whose strokes failed goes behind the others next time (sweep)
      // a new word written from memory with no misses showed the close-up if one was due: start the cooldown again
      if (r && task.pass === 'recall' && isHardWrite(task.isNew, r.totalMisses) && closeupAllowed(cardsSinceCloseup.current, reducedMotion())) cardsSinceCloseup.current = 0;
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0, { hinted: r?.hinted, misses: r?.totalMisses }));
    })();

  /** A word used in context (选一选): rate its meaning once a day, and count the recall for 用一用 (spec §20 part 7). */
```

with:

```tsx
      const task = writeCandidate!;
      // only the recall pass rates the word (spec §20 part 3); a redo at the end is extra practice. Written a character at a time
      // (spec 2026-10-05 §5), the word is rated once, on the character that finishes it, with all its misses from memory.
      const rates = !task.readOnly && (task.at === undefined ? true : !!task.last); // a traced read-only character never rates a write card
      if (r && !rec.free && task.pass === 'recall' && !task.redo && rates) await recordWriting(db, task.wordId, wordMisses(rec, task.wordId) + r.totalMisses, now());
      if (!r) await markWriteSkipped(db, task.wordId, now()); // any word whose strokes failed goes behind the others next time (sweep)
      // the 组词 he wrote rates its meaning card, once a lesson (production practice spec §3)
      const useOpen = know.cardsById.has(`${task.wordId}:meaning`) || (rec.plan.newMeaningIds ?? []).includes(task.wordId);
      const credit = r && writeWord ? meaningCredit(rec, task, r, writeWord, useOpen) : null;
      if (credit !== null) know.cardsById.set(`${task.wordId}:meaning`, await recordWrittenMeaning(db, task.wordId, credit, now()));
      if (r && !rec.free && task.readOnly) await markTraced(db, task.wordId, now());
      // a new word written from memory with no misses showed the close-up if one was due: start the cooldown again
      if (r && task.pass === 'recall' && isHardWrite(task.isNew, r.totalMisses) && closeupAllowed(cardsSinceCloseup.current, reducedMotion())) cardsSinceCloseup.current = 0;
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0, { hinted: r?.hinted, misses: r?.totalMisses, credited: credit !== null }));
    })();

  /** A word used in context (选一选): rate its meaning once a day, and count the recall for 用一用 (spec §20 part 7). */
```

In `src/session/record.ts`, replace:

```ts
import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { canAskRung, fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
```

with:

```ts
import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { canAskRung, fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
```

In `src/session/record.ts`, replace:

```ts
  return (await getCard(db, `${wordId}:meaning`))!;
}

export async function markWriteSkipped(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word) await putWords(db, [{ ...word, writeSkippedAt: now.getTime() }]);
```

with:

```ts
  return (await getCard(db, `${wordId}:meaning`))!;
}

/**
 * A 组词 written in 写一写 (production practice spec §3): the day's first rating of the word's meaning card, right (Good) or wrong
 * (Again), logged like the other meaning ratings (so the Use rung's two-day pass applies) with no answer time — writing is slow,
 * never a guess. Already rated today (练一练 asked it): a miss brings it forward instead.
 */
export async function recordWrittenMeaning(db: AppDb, wordId: string, correct: boolean, now: Date): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  if (ratedToday(existing, now)) {
    if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
    return (await getCard(db, `${wordId}:meaning`))!;
  }
  const rating = correct ? Rating.Good : Rating.Again;
  const card = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, correct, source: 'write' });
  return (await settleRung(db, wordId, 'meaning', now)) ?? card;
}

/** A read-only character traced (production practice spec §3): a recent lesson word is traced once, not every lesson. */
export async function markTraced(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word && word.tracedAt === undefined) await putWords(db, [{ ...word, tracedAt: now.getTime() }]);
}

export async function markWriteSkipped(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word) await putWords(db, [{ ...word, writeSkippedAt: now.getTime() }]);
```

In `src/session/runner.ts`, replace:

```ts
/** 写一写 passes (spec §20 part 3): a new word is traced, written with a hint, then from memory; a review word from memory only. */
export type WritePass = 'trace' | 'hint' | 'recall';
const NEW_WORD_PASSES: WritePass[] = ['trace', 'hint', 'recall'];
/** `at`: the character of the word to write (spec 2026-10-05 §5); `last`: this item finishes the word, so it rates its write card. */
export interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean; at?: number; last?: boolean }

const itemKey = (i: { wordId: string; at: number }) => `${i.wordId}#${i.at}`;
const fromKey = (key: string) => { const k = key.lastIndexOf('#'); return { wordId: key.slice(0, k), at: Number(key.slice(k + 1)) }; };
```

with:

```ts
/** 写一写 passes (spec §20 part 3): a new word is traced, written with a hint, then from memory; a review word from memory only. */
export type WritePass = 'trace' | 'hint' | 'recall';
const NEW_WORD_PASSES: WritePass[] = ['trace', 'hint', 'recall'];
/** `at`: the character of the word to write (spec 2026-10-05 §5); `last`: this item finishes the word, so it rates its write card;
 *  `readOnly`: a character his course never has him write, traced over its outline (production practice spec §3). */
export interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean; at?: number; last?: boolean; readOnly?: boolean }

const itemKey = (i: { wordId: string; at: number }) => `${i.wordId}#${i.at}`;
const fromKey = (key: string) => { const k = key.lastIndexOf('#'); return { wordId: key.slice(0, k), at: Number(key.slice(k + 1)) }; };
```

In `src/session/runner.ts`, replace:

```ts
  const items = rec.plan.writeItems;
  if (items) {
    const it = items[nextItem(rec, rec.writeIndex)]!;
    return { wordId: it.wordId, isNew: it.isNew, pass: it.pass, redo: false, at: it.at, last: !!it.last };
  }
  const c = rec.plan.writeCandidates[rec.writeIndex]!;
  const passes: WritePass[] = c.isNew ? NEW_WORD_PASSES : ['recall'];
```

with:

```ts
  const items = rec.plan.writeItems;
  if (items) {
    const it = items[nextItem(rec, rec.writeIndex)]!;
    return { wordId: it.wordId, isNew: it.isNew, pass: it.pass, redo: false, at: it.at, last: !!it.last, ...(it.readOnly ? { readOnly: true } : {}) };
  }
  const c = rec.plan.writeCandidates[rec.writeIndex]!;
  const passes: WritePass[] = c.isNew ? NEW_WORD_PASSES : ['recall'];
```

In `src/session/runner.ts`, replace:

```ts
/**
 * After one written pass. done=false means the word was skipped (e.g. no stroke data) and does not count.
 * Only the recall pass finishes a word; one that needed a hint or had more than 3 misses is written once more at the end.
 */
export function afterWriteWord(rec: SessionRecord, done: boolean, rawElapsedMs: number, outcome: { hinted?: boolean; misses?: number } = {}): SessionRecord {
  const task = currentWriteTask(rec);
  if (!task) return rec;
  const base: SessionRecord = { ...rec, activeMs: rec.activeMs + Math.min(rawElapsedMs, MAX_WORD_MS) };
  let next: SessionRecord;
  if (rec.plan.writeItems && !task.redo) next = afterWriteItem(rec, base, task, done, outcome);
  else if (task.redo) next = { ...base, writeRedoIndex: (rec.writeRedoIndex ?? 0) + 1 };
```

with:

```ts
/**
 * After one written pass. done=false means the word was skipped (e.g. no stroke data) and does not count.
 * Only the recall pass finishes a word; one that needed a hint or had more than 3 misses is written once more at the end.
 * `credited`: this pass rated the word's meaning card (production practice spec §3), which it does once a lesson.
 */
export function afterWriteWord(rec: SessionRecord, done: boolean, rawElapsedMs: number, outcome: { hinted?: boolean; misses?: number; credited?: boolean } = {}): SessionRecord {
  const task = currentWriteTask(rec);
  if (!task) return rec;
  const base: SessionRecord = {
    ...rec, activeMs: rec.activeMs + Math.min(rawElapsedMs, MAX_WORD_MS),
    ...(outcome.credited ? { meaningCredit: [...(rec.meaningCredit ?? []), task.wordId] } : {}),
  };
  let next: SessionRecord;
  if (rec.plan.writeItems && !task.redo) next = afterWriteItem(rec, base, task, done, outcome);
  else if (task.redo) next = { ...base, writeRedoIndex: (rec.writeRedoIndex ?? 0) + 1 };
```

#### Create `src/session/writeCredit.ts`

```ts
// 写一写 does the 组词 work (production practice spec §3): a written item whose cue is a 组词 rates that word's meaning card —
// the card 练一练's rung-2 组词 questions rate — once a lesson.
import { writingCue } from '../activities/writing/cue';
import type { SessionRecord, Word } from '../types';
import type { WriteTask } from './runner';

/** A write-list character from memory counts as right with no hint and at most this many misses. */
export const RECALL_RIGHT_MISSES = 1;
/** A traced read-only character counts as right with at most this many misses. */
export const TRACE_RIGHT_MISSES = 3;

/**
 * Whether this written item rates its word's meaning card: true (right), false (wrong), or null (it doesn't). It counts when the
 * word's Use rung is open (`useOpen`: it has a meaning card, or starts one today), its cue is a 组词 (「计，计划的计」), the item is
 * a write-list character from memory or a read-only character traced (never a redo or a write-list trace), and nothing written
 * earlier in the lesson has rated the word. Free play rates nothing.
 */
export function meaningCredit(rec: SessionRecord, task: WriteTask, result: { totalMisses: number; hinted: boolean }, word: Word, useOpen: boolean): boolean | null {
  if (rec.free || task.redo || !useOpen || (rec.meaningCredit ?? []).includes(task.wordId)) return null;
  if (task.pass !== (task.readOnly ? 'trace' : 'recall')) return null;
  if (writingCue(word, task.at).blanked === null) return null;
  return task.readOnly ? result.totalMisses <= TRACE_RIGHT_MISSES : !result.hinted && result.totalMisses <= RECALL_RIGHT_MISSES;
}
```

In `src/types.ts`, replace:

```ts
  correct: boolean;
  responseMs?: number;
  misses?: number;
  source?: 'use'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use)
}

/** Skills the parent's Skills panel follows (spec §19 part 7). */
```

with:

```ts
  correct: boolean;
  responseMs?: number;
  misses?: number;
  source?: 'use' | 'write'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use), or from a 组词 written in 写一写 (production practice spec §3)
}

/** Skills the parent's Skills panel follows (spec §19 part 7). */
```

In `src/types.ts`, replace:

```ts
  writeMisses?: Record<string, number>; // spec 2026-10-05 §5: each word's misses from memory so far, rated on its last character
  writeSkipped?: string[]; // words whose strokes failed to load this lesson: their other characters are skipped
  writeLast?: string; // the last character written ('id#at'): a redo never comes straight after it
  practiceQueue?: PracticeItem[]; // 练一练's round, built when the step starts (spec 2026-10-05 §3)
  practiceIndex?: number;
  practiceElapsedMs?: number;
```

with:

```ts
  writeMisses?: Record<string, number>; // spec 2026-10-05 §5: each word's misses from memory so far, rated on its last character
  writeSkipped?: string[]; // words whose strokes failed to load this lesson: their other characters are skipped
  writeLast?: string; // the last character written ('id#at'): a redo never comes straight after it
  meaningCredit?: string[]; // words whose meaning card 写一写 has rated this lesson (production practice spec §3): once a lesson
  practiceQueue?: PracticeItem[]; // 练一练's round, built when the step starts (spec 2026-10-05 §3)
  practiceIndex?: number;
  practiceElapsedMs?: number;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/session/writeCredit.test.ts src/session/record.test.ts src/session/runner.test.ts src/activities/writing/WritingStep.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: a written 组词 rates its meaning once a lesson; read-only traces never rate a write card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 练一练 leaves out the 组词 taps 写一写 covers

**Files:**
- Modify: `src/session/practice.ts` (`planPractice`)
- Test: `src/session/practice.test.ts` (append)

**Interfaces:**
- Consumes: `SessionPlan.writeWordIds` (Task 2); `askable`, `buildRound`.
- Produces: `planPractice` never yields `ask: 'word' | 'pair'` for a word in `rec.plan.writeWordIds`; round length unchanged.

- [ ] **Step 1: Write the failing tests**

Append to the end of `src/session/practice.test.ts`:

```ts

describe('写一写 does the 组词 work (production practice spec §3)', () => {
  const zuci = words.filter((w) => wordCue(w) && askable(w, words, false)('pair')).slice(0, 4).map((w) => w.id);
  const rec = (writeWordIds?: string[]) => ({ ...createSessionRecord(plan({ newWordIds: zuci, writeWordIds }), '2026-10-12', 0), flashIndex: zuci.length });
  it('no 组词 gap or pairing for a word 写一写 covers today, and the round keeps its length', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const before = planPractice(rec(), new Map(), byId, words, false, mulberry32(seed));
      const after = planPractice(rec(zuci.slice(0, 2)), new Map(), byId, words, false, mulberry32(seed));
      expect(after.filter((x) => zuci.slice(0, 2).includes(x.wordId) && (x.ask === 'word' || x.ask === 'pair'))).toEqual([]);
      expect(after).toHaveLength(before.length);
    }
  });
  it('the other words keep theirs, and a plan saved before (no writeWordIds) is built as before', () => {
    const asks = (r: ReturnType<typeof rec>) => Array.from({ length: 20 }, (_, s) => planPractice(r, new Map(), byId, words, false, mulberry32(s + 1))).flat();
    expect(asks(rec(zuci.slice(0, 2))).some((x) => zuci.slice(2).includes(x.wordId) && (x.ask === 'word' || x.ask === 'pair'))).toBe(true);
    expect(planPractice(rec(undefined), new Map(), byId, words, false, mulberry32(3))).toEqual(planPractice(rec([]), new Map(), byId, words, false, mulberry32(3)));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/session/practice.test.ts`
Expected: FAIL — `no 组词 gap or pairing for a word 写一写 covers today, and the round keeps its length` finds `word`/`pair` items for the written words.

- [ ] **Step 3: Implement**

In `src/session/practice.ts`, replace:

```ts
  // no voice: a word due only for Understand is left for another day — a reading question would grade Use before Read (final review I2)
  const listenOnly = (w: RoundWord) => !!w.gradesUnderstand && !w.gradesRecognise && !w.gradesHear && !w.gradesMeaning;
  const words = practiceWords(rec, rungs).filter((w) => (voice || !listenOnly(w)) && (() => { const can = askable(wordsById.get(w.wordId), pool, voice, level); return can('read') || can('meaningRead'); })());
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5)
  const round = withFamily(buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice, level)(ask), rng), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  });
```

with:

```ts
  // no voice: a word due only for Understand is left for another day — a reading question would grade Use before Read (final review I2)
  const listenOnly = (w: RoundWord) => !!w.gradesUnderstand && !w.gradesRecognise && !w.gradesHear && !w.gradesMeaning;
  const words = practiceWords(rec, rungs).filter((w) => (voice || !listenOnly(w)) && (() => { const can = askable(wordsById.get(w.wordId), pool, voice, level); return can('read') || can('meaningRead'); })());
  // 写一写 does today's 组词 work for the words it covers (production practice spec §3): no 组词 gap or pairing for them here; the
  // ladder asks another rung-2 question, or the nearest rung below, so the round keeps its length (plans saved before have none)
  const written = new Set(rec.plan.writeWordIds ?? []);
  const can = (id: string, ask: Ask) => !(written.has(id) && (ask === 'word' || ask === 'pair')) && askable(wordsById.get(id), pool, voice, level)(ask);
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5)
  const round = withFamily(buildRound(words, can, rng), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  });
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/session/practice.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: no 组词 taps in 练一练 for words 写一写 covers today" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Sentence rung, card and takes (reusing the Say review)

**Files:**
- Modify: `src/types.ts` (`CardKind`, `RecordingPrompt`, `Recording.review` comment)
- Modify: `src/ladder/rungs.ts` (`RungKind`, `RUNGS`, `RUNG_CARD`, `TakeRung`, `sayDays`, `sayPassed`, `canAskRung`)
- Modify: `src/session/say.ts` (whole file)
- Modify: `src/stats/skills.ts:8-14`, `src/parent/RecordingsPanel.tsx:48`
- Test: `src/ladder/rungs.test.ts`, `src/session/say.test.ts`, `src/stats/skills.test.ts`

**Interfaces:**
- Consumes: `settleTake`, `logsForCard`, `keepRecording` (repo); `bankFor` (sentenceBank).
- Produces: `CardKind` gains `'sentence'`; `RecordingPrompt` gains `{ kind: 'sentence'; wordId: string }`; `RungKind` gains `'sentence'` (in `RUNGS`, `RUNG_CARD.sentence = 'sentence'`, not in `LADDER`); `type TakeRung = 'say' | 'sentence'`; `sayDays(logs, cardId, kind: TakeRung = 'say')`, `sayPassed(logs, cardId, kind: TakeRung = 'say')`; `canAskRung(word, 'sentence') === !!bankFor(word.text)`; in say.ts: `takeKind(r): TakeRung | null`, `takeWord(r)` (Say and 说一句), `takesToDrop(recs, now, passed: ReadonlySet<cardId>)`, `recordTake(db, kind, wordId, take, now)`, `recordSayTake(db, wordId, take, now)`, `recordSentenceTake(db, wordId, take, now)`, `reviewTake(db, recordingId, verdict, now)` (on the take's own card).

- [ ] **Step 1: Write the failing tests**

In `src/ladder/rungs.test.ts`, replace:

```ts

describe('rungs', () => {
  it('Read is the reading card and Use the meaning card, so his progress carries over', () => {
    expect(RUNG_CARD).toEqual({ hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say' });
    expect(rungOf('recognise')).toBe('read');
    expect(rungOf('write')).toBeNull();
  });
```

with:

```ts

describe('rungs', () => {
  it('Read is the reading card and Use the meaning card, so his progress carries over', () => {
    expect(RUNG_CARD).toEqual({ hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say', sentence: 'sentence' });
    expect(rungOf('recognise')).toBe('read');
    expect(rungOf('write')).toBeNull();
  });
```

In `src/ladder/rungs.test.ts`, replace:

```ts
describe('Understand (plan 2b): between Hear and Read', () => {
  const cat = makeWord('猫', { meaning: 'cat' });
  const dog = makeWord('狗', { meaning: 'dog' });
  it('the rungs go hear, understand, read, use, then say (spec 2026-10-11 §3)', () => {
    expect(RUNGS).toEqual(['hear', 'understand', 'read', 'use', 'say']);
  });
  it('a word with two sentences goes from Hear to Understand; one with none goes straight to Read', () => {
    expect(nextRung(cat, 'hear')).toBe('understand');
```

with:

```ts
describe('Understand (plan 2b): between Hear and Read', () => {
  const cat = makeWord('猫', { meaning: 'cat' });
  const dog = makeWord('狗', { meaning: 'dog' });
  it('the rungs go hear, understand, read, use, then say and sentence (spec 2026-10-11 §3; production practice spec §4)', () => {
    expect(RUNGS).toEqual(['hear', 'understand', 'read', 'use', 'say', 'sentence']);
  });
  it('a word with two sentences goes from Hear to Understand; one with none goes straight to Read', () => {
    expect(nextRung(cat, 'hear')).toBe('understand');
```

In `src/ladder/rungs.test.ts`, replace:

```ts
  });
});

describe('passDays (the days a pass counts)', () => {
  it("each day's first answer when it was right and not too fast, oldest first", () => {
    const logs = [log('2026-10-02', 9, true), log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-03', 9, true, 100)];
```

with:

```ts
  });
});

describe('the Sentence rung: can use (production practice spec §4)', () => {
  const take = (date: string, ok: boolean, kind: 'say' | 'sentence' = 'sentence', cardId = `b:很:${kind}`): ReviewLog =>
    ({ cardId, wordId: 'b:很', kind, at: new Date(`${date}T18:00:00`).getTime(), rating: ok ? 3 : 1, correct: ok });
  it('passes on two separate days with a confirmed 说一句 take; Say verdicts are not Sentence verdicts', () => {
    expect(sayPassed([take('2026-10-01', true), take('2026-10-02', true)], 'b:很:sentence', 'sentence')).toBe(true);
    expect(sayPassed([take('2026-10-01', true), take('2026-10-01', true)], 'b:很:sentence', 'sentence')).toBe(false);
    expect(sayPassed([take('2026-10-01', true, 'say', 'b:很:sentence'), take('2026-10-02', true, 'say', 'b:很:sentence')], 'b:很:sentence', 'sentence')).toBe(false);
  });
  it('opens nothing and is opened by nothing; asked only of a word with a sentence-bank example; owning a word is unchanged', () => {
    const hen = makeWord('很', { pinyin: 'hěn', examples: [{ text: '很多', pinyin: 'hěn duō' }] });
    expect(nextRung(hen, 'sentence')).toBeNull();
    expect(nextRung(hen, 'use')).toBeNull();
    expect(rungOf('sentence')).toBe('sentence');
    expect(canAskRung(hen, 'sentence')).toBe(true);
    expect(canAskRung(makeWord('门'), 'sentence')).toBe(false);
    expect(isOwned(hen, new Set(['hear', 'read', 'use']))).toBe(true);
  });
});

describe('passDays (the days a pass counts)', () => {
  it("each day's first answer when it was right and not too fast, oldest first", () => {
    const logs = [log('2026-10-02', 9, true), log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-03', 9, true, 100)];
```

In `src/session/say.test.ts`, replace:

```ts
import { addRecording, allCards, getCard, getRecording, listRecordings, logsSince, putCards } from '../store/repo';
import { endOfLocalDay } from '../lib/date';
import type { Recording } from '../types';
import { recordSayTake, reviewTake, takesToDrop, waitingTakes } from './say';

const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 };
const day = (d: number, h = 18) => new Date(2026, 9, d, h);
```

with:

```ts
import { addRecording, allCards, getCard, getRecording, listRecordings, logsSince, putCards } from '../store/repo';
import { endOfLocalDay } from '../lib/date';
import type { Recording } from '../types';
import { recordSayTake, recordSentenceTake, reviewTake, takesToDrop, takeWord, waitingTakes } from './say';

const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 };
const day = (d: number, h = 18) => new Date(2026, 9, d, h);
```

In `src/session/say.test.ts`, replace:

```ts
  });
  it('once a word’s Say has passed, its reviewed takes older than 14 days all go, the newest too (final review I5)', () => {
    const recs = [rec('old', 'b:森', day(1), 'ok'), rec('newest', 'b:森', day(2), 'ok'), rec('lin', 'b:林', day(1), 'ok'), rec('waiting', 'b:森', day(1))];
    expect(takesToDrop(recs, day(20), new Set(['b:森'])).sort()).toEqual(['newest', 'old']); // 林 has not passed: it keeps its newest
    expect(takesToDrop(recs, day(14), new Set(['b:森']))).toEqual([]); // not yet 14 days
  });
  it('a new take drops a passed word’s old reviewed takes from the store', async () => {
    const db = await freshDb();
```

with:

```ts
  });
  it('once a word’s Say has passed, its reviewed takes older than 14 days all go, the newest too (final review I5)', () => {
    const recs = [rec('old', 'b:森', day(1), 'ok'), rec('newest', 'b:森', day(2), 'ok'), rec('lin', 'b:林', day(1), 'ok'), rec('waiting', 'b:森', day(1))];
    expect(takesToDrop(recs, day(20), new Set(['b:森:say'])).sort()).toEqual(['newest', 'old']); // 林 has not passed: it keeps its newest
    expect(takesToDrop(recs, day(14), new Set(['b:森:say']))).toEqual([]); // not yet 14 days
  });
  it('a new take drops a passed word’s old reviewed takes from the store', async () => {
    const db = await freshDb();
```

Append to the end of `src/session/say.test.ts`:

```ts

describe('说一句 takes (production practice spec §4)', () => {
  const sentence = (id: string, wordId: string, at: Date, review?: 'ok' | 'no'): Recording => ({ ...rec(id, wordId, at, review), prompt: { kind: 'sentence', wordId } });
  it('a take is kept and makes his Sentence card, not his Say card, due no sooner than tomorrow', async () => {
    const db = await freshDb();
    const card = await recordSentenceTake(db, 'b:很', take, day(1));
    expect(card.id).toBe('b:很:sentence');
    expect(card.kind).toBe('sentence');
    expect(card.fsrs.due).toEqual(new Date(2026, 9, 2));
    expect(await getCard(db, 'b:很:say')).toBeUndefined();
    expect((await listRecordings(db))[0]!.prompt).toEqual({ kind: 'sentence', wordId: 'b:很' });
    expect(takeWord((await listRecordings(db))[0]!)).toBe('b:很');
  });
  it('two confirmed days pass the Sentence rung; ✗ brings the Sentence card forward', async () => {
    const db = await freshDb();
    await recordSentenceTake(db, 'b:很', take, day(1));
    await recordSentenceTake(db, 'b:很', take, day(2));
    const [second, first] = await listRecordings(db);
    await reviewTake(db, first!.id, 'ok', day(2, 20));
    await reviewTake(db, second!.id, 'ok', day(3, 8));
    expect((await getCard(db, 'b:很:sentence'))!.passed).toBe(day(3, 8).getTime());
    expect((await logsSince(db, 0)).map((l) => [l.kind, l.cardId])).toEqual([['sentence', 'b:很:sentence'], ['sentence', 'b:很:sentence']]);
    await putCards(db, [makeCard('b:大', 'sentence', day(9))]);
    await addRecording(db, sentence('s1', 'b:大', day(4)));
    await reviewTake(db, 's1', 'no', day(5, 7));
    expect((await getCard(db, 'b:大:sentence'))!.fsrs.due).toEqual(endOfLocalDay(day(5, 7)));
  });
  it('two taps at once on a 说一句 take review it once (review focus 3)', async () => {
    const db = await freshDb();
    await addRecording(db, sentence('s1', 'b:很', day(1)));
    await Promise.all([reviewTake(db, 's1', 'ok', day(2)), reviewTake(db, 's1', 'ok', day(2))]);
    expect(await logsSince(db, 0)).toHaveLength(1);
  });
  it('they wait in the same queue as Say takes, and a word keeps its newest Say take and its newest 说一句 take apart', () => {
    const recs = [sentence('s-old', 'b:很', day(1), 'ok'), sentence('s-new', 'b:很', day(2), 'ok'), rec('say-only', 'b:很', day(1), 'ok'), sentence('wait', 'b:大', day(3))];
    expect(waitingTakes(recs).map((r) => r.id)).toEqual(['wait']);
    expect(takesToDrop(recs, day(20))).toEqual(['s-old']);
    expect(takesToDrop(recs, day(20), new Set(['b:很:sentence'])).sort()).toEqual(['s-new', 's-old']);
  });
});
```

In `src/stats/skills.test.ts`, replace:

```ts

describe('the parent’s Say verdicts are not his answers (spec 2026-10-11 §6)', () => {
  it('a ✓ or ✗ on a take is in no skill row', () => {
    const say = (correct: boolean) => ({ cardId: 'a:say', wordId: 'a', kind: 'say' as const, at: 1, rating: 3 as const, correct });
    const acc = skillAccuracy([say(true), say(false), log('recognise', 'a', true)], []);
    expect(acc.reading).toEqual({ right: 1, total: 1 });
    expect(Object.values(acc).reduce((n, s) => n + s.total, 0)).toBe(1);
  });
```

with:

```ts

describe('the parent’s Say verdicts are not his answers (spec 2026-10-11 §6)', () => {
  it('a ✓ or ✗ on a take is in no skill row', () => {
    const say = (correct: boolean, kind: 'say' | 'sentence' = 'say') => ({ cardId: `a:${kind}`, wordId: 'a', kind, at: 1, rating: 3 as const, correct });
    const acc = skillAccuracy([say(true), say(false), say(true, 'sentence'), say(false, 'sentence'), log('recognise', 'a', true)], []);
    expect(acc.reading).toEqual({ right: 1, total: 1 });
    expect(Object.values(acc).reduce((n, s) => n + s.total, 0)).toBe(1);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/ladder/rungs.test.ts src/session/say.test.ts src/stats/skills.test.ts`
Expected: FAIL — `RUNG_CARD` has no `sentence`; `recordSentenceTake` is not exported; `takesToDrop` reads `passed` as word ids; a sentence verdict counts in a skill row.

- [ ] **Step 3: Implement**

In `src/ladder/rungs.ts`, replace:

```ts
// The word ladder's rungs (spec 2026-10-06 §3.2): heard, understood in a sentence, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
// Say (spec 2026-10-11 §3): he reads the word aloud and the parent confirms the take; it passes on two days with a confirmed take.
import { meaningCue } from '../activities/flashcards/meaning';
import { localDateKey } from '../lib/date';
import { cardMeaning } from '../content/glossary';
import { sentencesFor } from '../content/understand';
import type { CardKind, ReviewLog, Word } from '../types';

export type RungKind = 'hear' | 'understand' | 'read' | 'use' | 'say';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use', 'say'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say' };
/** The rungs a pass opens one after another. Say is not one of them: a lesson asks it once Read has passed, and its card is made
 *  then (spec 2026-10-11 §3); owning a word (the town's full light) still means these four, so nothing he has lights less. */
const LADDER: RungKind[] = ['hear', 'understand', 'read', 'use'];
export const rungOf = (kind: CardKind): RungKind | null => RUNGS.find((r) => RUNG_CARD[r] === kind) ?? null;

```

with:

```ts
// The word ladder's rungs (spec 2026-10-06 §3.2): heard, understood in a sentence, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
// Say (spec 2026-10-11 §3): he reads the word aloud and the parent confirms the take; it passes on two days with a confirmed take.
// Sentence (production practice spec §4): he says a sentence with the word, confirmed the same way: "can use".
import { meaningCue } from '../activities/flashcards/meaning';
import { localDateKey } from '../lib/date';
import { cardMeaning } from '../content/glossary';
import { bankFor } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import type { CardKind, ReviewLog, Word } from '../types';

export type RungKind = 'hear' | 'understand' | 'read' | 'use' | 'say' | 'sentence';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use', 'say', 'sentence'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say', sentence: 'sentence' };
/** The rungs a pass opens one after another. Say and Sentence are not among them: a lesson asks them once Read has passed, and
 *  their cards are made then (spec 2026-10-11 §3; production practice spec §4); owning a word (the town's full light) still means
 *  these four, so nothing he has lights less. */
const LADDER: RungKind[] = ['hear', 'understand', 'read', 'use'];
export const rungOf = (kind: CardKind): RungKind | null => RUNGS.find((r) => RUNG_CARD[r] === kind) ?? null;

```

In `src/ladder/rungs.ts`, replace:

```ts
  return passDays(logs, cardId, fastMs)[PASS_DAYS - 1] ?? null;
}

/**
 * The Say rung's days (spec 2026-10-11 §3): the local days of his takes the parent confirmed (✓), oldest first. A take is logged
 * on the day he recorded it, whenever the parent listens; a day with a ✗ take and a ✓ take still has a confirmed take.
 */
export function sayDays(logs: ReviewLog[], cardId: string): string[] {
  const days = logs.filter((l) => l.cardId === cardId && l.kind === 'say' && l.correct).sort((a, b) => a.at - b.at).map((l) => localDateKey(new Date(l.at)));
  return [...new Set(days)];
}

/** The Say rung passes on two separate days with a confirmed take. */
export const sayPassed = (logs: ReviewLog[], cardId: string): boolean => sayDays(logs, cardId).length >= PASS_DAYS;

/** Whether a rung can be asked of this word: hearing needs its English (he picks the meaning), using a question to use it in; reading and saying always. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'say') return true;
  if (rung === 'hear') return !!cardMeaning(word);
  if (rung === 'understand') return !!cardMeaning(word) && sentencesFor(word.text).length >= 2; // a sentence he hears (plan 2b)
  return rung !== 'use' || meaningCue(word) !== null;
```

with:

```ts
  return passDays(logs, cardId, fastMs)[PASS_DAYS - 1] ?? null;
}

/** The rungs the parent confirms from a take (Listen & confirm), not from his answers. */
export type TakeRung = 'say' | 'sentence';

/**
 * The Say rung's days (spec 2026-10-11 §3), or the Sentence rung's (production practice spec §4): the local days of his takes the
 * parent confirmed (✓), oldest first. A take is logged on the day he recorded it, whenever the parent listens; a day with a ✗
 * take and a ✓ take still has a confirmed take.
 */
export function sayDays(logs: ReviewLog[], cardId: string, kind: TakeRung = 'say'): string[] {
  const days = logs.filter((l) => l.cardId === cardId && l.kind === kind && l.correct).sort((a, b) => a.at - b.at).map((l) => localDateKey(new Date(l.at)));
  return [...new Set(days)];
}

/** The Say (or Sentence) rung passes on two separate days with a confirmed take. */
export const sayPassed = (logs: ReviewLog[], cardId: string, kind: TakeRung = 'say'): boolean => sayDays(logs, cardId, kind).length >= PASS_DAYS;

/** Whether a rung can be asked of this word: hearing needs its English (he picks the meaning), using a question to use it in, a
 *  sentence a sentence-bank example to pattern on; reading and saying always. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'say') return true;
  if (rung === 'sentence') return !!bankFor(word.text);
  if (rung === 'hear') return !!cardMeaning(word);
  if (rung === 'understand') return !!cardMeaning(word) && sentencesFor(word.text).length >= 2; // a sentence he hears (plan 2b)
  return rung !== 'use' || meaningCue(word) !== null;
```

In `src/parent/RecordingsPanel.tsx`, replace:

```tsx

const describe = ({ prompt, review }: Recording, texts: Texts, said: Map<string, string>) => {
  if (prompt.kind === 'say') return `🗣️ Say: ${said.get(prompt.wordId) ?? '(deleted word)'}${review ? VERDICT[review] : ' (waiting)'}`;
  if (prompt.kind === 'picture') return '📷 Picture talk';
  if (prompt.kind === 'intro') return '🙋 Self-introduction';
  if (prompt.kind === 'story' || prompt.kind === 'answer') return '🖼️ Picture story';
```

with:

```tsx

const describe = ({ prompt, review }: Recording, texts: Texts, said: Map<string, string>) => {
  if (prompt.kind === 'say') return `🗣️ Say: ${said.get(prompt.wordId) ?? '(deleted word)'}${review ? VERDICT[review] : ' (waiting)'}`;
  if (prompt.kind === 'sentence') return `💬 Sentence: ${said.get(prompt.wordId) ?? '(deleted word)'}${review ? VERDICT[review] : ' (waiting)'}`;
  if (prompt.kind === 'picture') return '📷 Picture talk';
  if (prompt.kind === 'intro') return '🙋 Self-introduction';
  if (prompt.kind === 'story' || prompt.kind === 'answer') return '🖼️ Picture story';
```

Replace the whole of `src/session/say.ts` with:

```ts
// Say takes (spec 2026-10-11 §3, §6, §7): in 练一练 he reads a word aloud; the take is kept like the other recordings and the
// parent confirms (✓) or rejects (✗) it in Listen & confirm. Speech recognition is not used. 说一句 takes (production practice
// spec §4) — a sentence he says with a word — are kept, reviewed and tidied the same way, on the word's Sentence card.
import { Rating } from 'ts-fsrs';
import type { FinishedRecording } from '../audio/recorder';
import { sayPassed, type TakeRung } from '../ladder/rungs';
import { addDays, endOfLocalDay, startOfLocalDay } from '../lib/date';
import { newId } from '../lib/id';
import { waitingPassageTakes } from '../langdu/review';
import { newCard, review } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { deleteRecording, getCard, getRecording, keepRecording, listRecordings, logsForCard, putCards, settleTake } from '../store/repo';
import type { CardRecord, Recording } from '../types';
import { bringForward } from './record';

/** Reviewed takes are kept this long (each word's newest take too, until its rung has passed). */
export const REVIEWED_KEEP_DAYS = 14;
/** Past this many waiting takes, only each word's newest waiting take of each kind is kept. */
export const WAITING_CAP = 60;

/** What a take is of: a Say take or a 说一句 take; null for any other recording. */
export const takeKind = (r: Recording): TakeRung | null => (r.prompt.kind === 'say' || r.prompt.kind === 'sentence' ? r.prompt.kind : null);
/** The word a Say or 说一句 take is of; null for any other recording. */
export const takeWord = (r: Recording): string | null => (r.prompt.kind === 'say' || r.prompt.kind === 'sentence' ? r.prompt.wordId : null);
/** The card a take counts toward: `${wordId}:say` or `${wordId}:sentence`. */
const takeCard = (r: Recording): string => `${takeWord(r)}:${takeKind(r)}`;

/** Takes waiting for the parent, oldest first: Say and 说一句 takes, and each passage's newest take (spec 2026-10-12 §6). */
export function waitingTakes(recs: Recording[]): Recording[] {
  return [...recs.filter((r) => takeWord(r) !== null && !r.review), ...waitingPassageTakes(recs)].sort((a, b) => a.createdAt - b.createdAt);
}

/** The newest of each card's takes among `list` (a word's Say and 说一句 takes apart). */
function newestByCard(list: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of list) {
    const c = takeCard(r);
    const had = out.get(c);
    if (!had || r.createdAt > had.createdAt) out.set(c, r);
  }
  return out;
}

/**
 * The takes to delete (spec §6, §7): reviewed takes older than 14 days, except each card's newest take while its rung has not
 * passed (`passed`: the card ids, `${wordId}:say` or `${wordId}:sentence`, whose rung has; final review I5); and when more than
 * 60 wait, every waiting take but each card's newest. Other recordings are never touched.
 */
export function takesToDrop(recs: Recording[], now: Date, passed: ReadonlySet<string> = new Set()): string[] {
  const takes = recs.filter((r) => takeWord(r) !== null);
  const newest = newestByCard(takes);
  const cutoff = now.getTime() - REVIEWED_KEEP_DAYS * 86_400_000;
  const keepNewest = (r: Recording) => !passed.has(takeCard(r)) && newest.get(takeCard(r)) === r;
  const drop = new Set(takes.filter((r) => r.review && r.createdAt < cutoff && !keepNewest(r)).map((r) => r.id));
  const waiting = takes.filter((r) => !r.review);
  if (waiting.length > WAITING_CAP) {
    const keep = newestByCard(waiting);
    for (const r of waiting) if (keep.get(takeCard(r)) !== r) drop.add(r.id);
  }
  return [...drop];
}

/**
 * He recorded a take: it is kept for the parent, and its card (made now if it is his first) is scheduled like a right answer
 * (FSRS Good), but never due again before tomorrow — a second lesson today must not ask the same words (final review I4).
 * Nothing is logged: only the parent's verdict counts toward the pass. Old takes are tidied after.
 */
export async function recordTake(db: AppDb, kind: TakeRung, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> {
  await keepRecording(db, { id: newId(), createdAt: now.getTime(), prompt: { kind, wordId }, ...take });
  const id = `${wordId}:${kind}`;
  const had = await getCard(db, id);
  const next = review(had?.fsrs ?? newCard(now), Rating.Good, now);
  const tomorrow = startOfLocalDay(addDays(now, 1));
  const card: CardRecord = { ...(had ?? {}), id, wordId, kind, fsrs: next.due < tomorrow ? { ...next, due: tomorrow } : next }; // keeps its pass
  await putCards(db, [card]);
  const recs = await listRecordings(db);
  const ids = [...new Set(recs.filter((r) => takeWord(r) !== null).map(takeCard))];
  const passed = new Set<string>();
  for (const c of ids) if ((c === id ? card : await getCard(db, c))?.passed) passed.add(c);
  for (const gone of takesToDrop(recs, now, passed)) await deleteRecording(db, gone);
  return card;
}

/** A Say card take (spec 2026-10-11 §3). */
export const recordSayTake = (db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> => recordTake(db, 'say', wordId, take, now);
/** A 说一句 take (production practice spec §4). */
export const recordSentenceTake = (db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> => recordTake(db, 'sentence', wordId, take, now);

/**
 * The parent's ✓ or ✗ on a take (spec §3): logged on the day he recorded it, on the take's own card (Say or Sentence). ✓ passes
 * the rung once two days have a confirmed take (the pass is dated now, when it became known); ✗ brings the card forward to be
 * due today. A take already reviewed (a second tap) or gone is left alone.
 */
export async function reviewTake(db: AppDb, recordingId: string, verdict: 'ok' | 'no', now: Date): Promise<void> {
  const rec = await getRecording(db, recordingId);
  const wordId = rec ? takeWord(rec) : null;
  const kind = rec ? takeKind(rec) : null;
  if (!rec || !wordId || !kind || rec.review) return;
  const ok = verdict === 'ok';
  const cardId = `${wordId}:${kind}`;
  // verdict and log commit together, and only once (a double tap finds it reviewed)
  if (!(await settleTake(db, recordingId, verdict, { cardId, wordId, kind, at: rec.createdAt, rating: ok ? Rating.Good : Rating.Again, correct: ok }))) return;
  if (!ok) {
    await bringForward(db, wordId, kind, endOfLocalDay(now));
    return;
  }
  const card = await getCard(db, cardId);
  if (card && !card.passed && sayPassed(await logsForCard(db, cardId), cardId, kind)) await putCards(db, [{ ...card, passed: now.getTime() }]);
}
```

In `src/stats/skills.ts`, replace:

```ts
/** The card a skill's practice lives on: "practise more" brings it forward. */
export const SKILL_CARD: Record<Skill, CardKind> = { listening: 'hear', reading: 'recognise', meaning: 'meaning', use: 'meaning', zibian: 'write', writing: 'write' };

/** Say verdicts are the parent's, not his answers: Listen & confirm and Progress show them (spec 2026-10-11 §6). */
const LOG_SKILL: Record<Exclude<CardKind, 'say'>, Skill> = { hear: 'listening', understand: 'listening', recognise: 'reading', meaning: 'meaning', write: 'writing' };

/** Each answer as (skill, word, right?): review logs for reading, meaning and writing; the answer log for 选一选/用一用 and 字辨. */
function outcomes(logs: ReviewLog[], answers: AnswerLog[]): { skill: Skill; wordId: string; correct: boolean }[] {
  return [
    ...logs.filter((l) => l.source !== 'use' && l.kind !== 'say').map((l) => ({ skill: LOG_SKILL[l.kind as Exclude<CardKind, 'say'>], wordId: l.wordId, correct: l.correct })), // a 选一选 rating is in the answer log already
    ...answers.map((a) => ({ skill: a.skill, wordId: a.wordId, correct: a.correct })),
  ];
}
```

with:

```ts
/** The card a skill's practice lives on: "practise more" brings it forward. */
export const SKILL_CARD: Record<Skill, CardKind> = { listening: 'hear', reading: 'recognise', meaning: 'meaning', use: 'meaning', zibian: 'write', writing: 'write' };

/** Say and 说一句 verdicts are the parent's, not his answers: Listen & confirm and Progress show them (spec 2026-10-11 §6). */
type Answered = Exclude<CardKind, 'say' | 'sentence'>;
const LOG_SKILL: Record<Answered, Skill> = { hear: 'listening', understand: 'listening', recognise: 'reading', meaning: 'meaning', write: 'writing' };

/** Each answer as (skill, word, right?): review logs for reading, meaning and writing; the answer log for 选一选/用一用 and 字辨. */
function outcomes(logs: ReviewLog[], answers: AnswerLog[]): { skill: Skill; wordId: string; correct: boolean }[] {
  return [
    ...logs.filter((l) => l.source !== 'use' && l.kind !== 'say' && l.kind !== 'sentence').map((l) => ({ skill: LOG_SKILL[l.kind as Answered], wordId: l.wordId, correct: l.correct })), // a 选一选 rating is in the answer log already
    ...answers.map((a) => ({ skill: a.skill, wordId: a.wordId, correct: a.correct })),
  ];
}
```

In `src/types.ts`, replace:

```ts
  tags?: string[]; // e.g. '成语'
}

export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand' | 'say'; // meaning: what the word means and how it's used (spec §19); say: he reads it aloud (spec 2026-10-11 §3)

export interface CardRecord {
  id: string; // `${wordId}:${kind}`
```

with:

```ts
  tags?: string[]; // e.g. '成语'
}

export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand' | 'say' | 'sentence'; // meaning: what the word means and how it's used (spec §19); say: he reads it aloud (spec 2026-10-11 §3); sentence: he says a sentence with it (production practice spec §4)

export interface CardRecord {
  id: string; // `${wordId}:${kind}`
```

In `src/types.ts`, replace:

```ts
  | { kind: 'intro' } // the exam-etiquette self-introduction
  | { kind: 'story'; sceneId: string; part: 'opening' | 'setting' | 'events' | 'ending' | 'opinion' | 'whole' } // 看图说话
  | { kind: 'answer'; sceneId: string; question: number } // Truffle asks
  | { kind: 'say'; wordId: string }; // a Say card take: he read the word aloud (spec 2026-10-11 §3)

export interface Recording {
  id: string;
```

with:

```ts
  | { kind: 'intro' } // the exam-etiquette self-introduction
  | { kind: 'story'; sceneId: string; part: 'opening' | 'setting' | 'events' | 'ending' | 'opinion' | 'whole' } // 看图说话
  | { kind: 'answer'; sceneId: string; question: number } // Truffle asks
  | { kind: 'say'; wordId: string } // a Say card take: he read the word aloud (spec 2026-10-11 §3)
  | { kind: 'sentence'; wordId: string }; // a 说一句 take: he said a sentence with the word (production practice spec §4)

export interface Recording {
  id: string;
```

In `src/types.ts`, replace:

```ts
  level?: number; // average loudness (RMS 0..1) while reading; older recordings have none
  misread?: string[]; // characters the parent confirmed he misread
  extraDayGiven?: boolean; // its marks have given the passage its one extra day (never a second, however often re-marked)
  review?: 'ok' | 'no'; // a Say take the parent confirmed (✓) or rejected (✗), or a passage take listened to ('ok'); absent: waiting (spec 2026-10-11 §6)
  meaning?: { correct: boolean; picked: string }; // a passage take: his answer to the meaning question (spec 2026-10-12 §3), for the parent
}

```

with:

```ts
  level?: number; // average loudness (RMS 0..1) while reading; older recordings have none
  misread?: string[]; // characters the parent confirmed he misread
  extraDayGiven?: boolean; // its marks have given the passage its one extra day (never a second, however often re-marked)
  review?: 'ok' | 'no'; // a Say or 说一句 take the parent confirmed (✓) or rejected (✗), or a passage take listened to ('ok'); absent: waiting (spec 2026-10-11 §6)
  meaning?: { correct: boolean; picked: string }; // a passage take: his answer to the meaning question (spec 2026-10-12 §3), for the parent
}

```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/ladder/rungs.test.ts src/session/say.test.ts src/stats/skills.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: the Sentence rung — 说一句 takes kept, confirmed and tidied like Say takes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 「说一句」: the card, its pattern, and its place in 练一练

**Files:**
- Create: `src/content/sentencePattern.ts`, `src/content/sentencePattern.test.ts`
- Create: `src/activities/say/SentenceCard.tsx`, `src/activities/say/SentenceCard.test.tsx`
- Create: `src/session/sentence.plan.test.ts`, `src/app/sentenceLesson.test.tsx`
- Modify: `src/types.ts` (`SessionPlan.sentenceIds`)
- Modify: `src/session/round.ts` (`Ask`, `Grades`)
- Modify: `src/session/plan.ts` (`SENTENCE_PER_LESSON`, `sentenceIds`)
- Modify: `src/session/practice.ts` (imports, `canAsk`, `SENTENCE_BY`, `withSentence`, `planPractice`)
- Modify: `src/session/runner.ts` (`skipSayItems`)
- Modify: `src/app/SessionScreen.tsx` (imports, `onSayDone`, the 练一练 cards)
- Modify: `src/styles.css` (after `.say__after`)
- Modify: `src/app/sayLesson.test.tsx:21` (`READ`)

**Interfaces:**
- Consumes: `recordSentenceTake`, `canAskRung(w, 'sentence')` (Task 5); `useRecorder`, `MicButton` (`src/activities/shared/recording.tsx`); `SayResult` (`SayCard.tsx`); `bankFor`, `fillGap`, `HSK_WORDS`.
- Produces: `sentenceExample(text: string): string | null`; `sentencePattern(example: string, word: string): string`; `SentenceCard({ word, kid, onDone: (r: SayResult | null) => void })` (root `.say-sentence`; `.say-sentence__prompt`, `.say-sentence__pattern`, `.say-sentence__model`); `Ask` gains `'sentence'`, `Grades` gains `'sentence'`; `SENTENCE_PER_LESSON = 2`; `SessionPlan.sentenceIds?: string[]`; `SENTENCE_BY = 12`; `withSentence(items: PracticeItem[], sentenceIds: string[]): PracticeItem[]` (items `{ wordId, rung: 3, ask: 'sentence', grades: 'sentence', retry: false }`); `skipSayItems` drops `'say'` and `'sentence'`.

- [ ] **Step 1: Write the failing tests**

#### Create `src/activities/say/SentenceCard.test.tsx`

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { SentenceCard } from './SentenceCard';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const hen = makeWord('很', { pinyin: 'hěn' }); // the bank's example: 今天很热。
let n = 0;
beforeEach(() => {
  n = 0;
  vi.mocked(speak).mockClear();
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async () => {
    const take = ++n;
    return { stop: async () => ({ blob: new Blob([`take ${take}`]), mime: 'audio/mp4', durationSec: take }), cancel: vi.fn() };
  });
});

async function record() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByText('听一听！');
}
/** The Chinese a line shows (its Label's text, without the pinyin over it). */
const text = (sel: string) => document.querySelector(`${sel} .label`)?.getAttribute('data-zh') ?? null;

describe('说一句 (production practice spec §4)', () => {
  it('asks for a sentence with the word over its pattern; no model and no 继续 before a take', () => {
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(text('.say-sentence__prompt')).toBe('用『很』说一句话');
    expect(text('.say-sentence__pattern')).toBe('今天很…');
    expect(document.querySelector('.say-sentence__model')).toBeNull();
    expect(screen.getByText('继续').closest('button')!.disabled).toBe(true);
  });
  it('he records; then the model sentence shows and plays; 继续 hands over the take once', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    expect(text('.say-sentence__model')).toBe('今天很热。');
    await waitFor(() => expect(speak).toHaveBeenCalledWith('今天很热。'));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(1);
  });
  it('one re-record, and the last take is the one kept', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    fireEvent.click(screen.getByText('再录一次'));
    await record();
    expect(screen.queryByText('再录一次')).toBeNull();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(2);
  });
  it('a refused microphone skips the card at once, with no note', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain('麦克风没有打开');
  });
  it('no microphone at all skips it straight away', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });
});
```

In `src/app/sayLesson.test.tsx`, replace:

```tsx
import { recordSayTake } from '../session/say';

const words = builtinWords(0);
const READ = ['大', '人', '口', '山', '水', '火'];
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
```

with:

```tsx
import { recordSayTake } from '../session/say';

const words = builtinWords(0);
const READ = ['木', '人', '口', '山', '水', '火']; // none has a sentence-bank example, so no 说一句 comes among the Say cards (production practice spec §4)
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
```

#### Create `src/app/sentenceLesson.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, getSession, listRecordings, putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
import { recordingSupported, startRecording } from '../audio/recorder';

const words = builtinWords(0);
/** 很 has a sentence-bank example (今天很热。); the others don't */
const READ = ['很', '人', '口', '山', '水', '火'];
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockResolvedValue({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 }), cancel: vi.fn() });
});

/** A practice-only lesson, Say cards off: six words he reads, due today, so 练一练 has a 说一句 for 很. */
async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await putCards(app.db, READ.map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
  await updateSettings(app.db, { sayCards: false, activities: { newwords: false, practice: true, writing: false, speaking: false } });
  return app;
}

/** Any tap question's open tiles (a picked or joined tile isn't tapped again). */
const TAPS = '.choice:not([disabled]):not(.is-picked):not(.is-matched), .fishtile:not([disabled]), .bubble-opt:not([disabled]), .whichpart__char:not([disabled])';
/** Answers 练一练's tap questions until the 说一句 card shows. */
async function untilSentence() {
  for (let i = 0; i < 300; i++) {
    await waitFor(() => expect(document.querySelector(`.say-sentence, ${TAPS}, .sheet .btn:not([disabled])`)).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.say-sentence')) return;
    const before = document.body.innerHTML;
    const open = document.querySelector<HTMLElement>(TAPS);
    if (open) fireEvent.click(open);
    const next = document.querySelector<HTMLElement>('.sheet .btn:not([disabled])');
    if (next) fireEvent.click(next);
    await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
  }
  throw new Error('no 说一句 came');
}

describe('说一句 in a lesson (production practice spec §4)', () => {
  it('his take is kept for the parent as a 说一句 take, and his Sentence card is made', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSentence();
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('继续', { selector: '.sheet .btn:not([disabled]) *' }));
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.prompt)).toEqual([{ kind: 'sentence', wordId: 'b:很' }]));
    await waitFor(async () => expect((await allCards(app.db)).find((c) => c.id === 'b:很:sentence')).toBeTruthy());
  });
  it('a refused microphone drops it, and 练一练 carries on with taps', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSentence();
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(async () => {
      const rec = (await getSession(app.db, '2026-10-02'))!;
      expect(rec.practiceQueue!.slice(rec.practiceIndex).some((x) => x.ask === 'sentence')).toBe(false);
    });
    expect(await listRecordings(app.db)).toEqual([]);
    await waitFor(() => expect(document.querySelector('.say-sentence')).toBeNull());
  });
});
```

#### Create `src/content/sentencePattern.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { SENTENCE_BANK } from './sentenceBank';
import { sentenceExample, sentencePattern } from './sentencePattern';

describe('说一句 patterns (production practice spec §4)', () => {
  it('the model is the bank\'s first sentence with the word in it; none for a word the bank lacks', () => {
    expect(sentenceExample('很')).toBe('今天很热。');
    expect(sentenceExample('保持')).toBe('图书馆里要保持安静。');
    expect(sentenceExample('门')).toBeNull();
  });
  it('the word kept, the rest blanked to a short frame', () => {
    expect(sentencePattern('我们周末计划去公园。', '计划')).toBe('我们…计划…');
    expect(sentencePattern('今天很热。', '很')).toBe('今天很…'); // two characters before it stay
    expect(sentencePattern('哥哥比我高。', '高')).toBe('哥哥…高'); // nothing after it but the 。
    expect(sentencePattern('我天天七点起床。', '起床')).toBe('我…起床'); // 我天 is no word: its first character
    expect(sentencePattern('看到老师来了，他连忙站起来。', '连忙')).toBe('看到…连忙…');
    expect(sentencePattern('计划好了。', '计划')).toBe('计划…');
    expect(sentencePattern('今天很热。', '门')).toBe('门');
  });
  it('every bank word has a frame that holds the word and is short', () => {
    for (const b of SENTENCE_BANK) {
      const frame = sentencePattern(sentenceExample(b.word)!, b.word);
      expect(frame).toContain(b.word);
      expect(Array.from(frame).length).toBeLessThanOrEqual(Array.from(b.word).length + 5);
    }
  });
});
```

#### Create `src/session/sentence.plan.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { bankFor } from '../content/sentenceBank';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type Settings } from '../types';
import { buildSessionPlan, SENTENCE_PER_LESSON } from './plan';
import { planPractice, SENTENCE_BY, withSentence } from './practice';
import type { PracticeItem } from './round';
import { createSessionRecord, finishStep, skipSayItems, startPractice } from './runner';

const words = builtinWords(0);
const id = (t: string) => words.find((w) => w.text === t)!.id;
const now = new Date(2026, 9, 2, 8, 0);
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });
const later = new Date(2026, 10, 1);
/** Read passed `daysAgo` days ago. */
const read = (t: string, daysAgo: number): CardRecord => ({ ...makeCard(id(t), 'recognise', later, true), passed: now.getTime() - daysAgo * 86_400_000 });

describe('which words get a 说一句 (production practice spec §4)', () => {
  it('due Sentence cards first, then words whose Read has passed with a sentence-bank example, the newest pass first; at most 2', () => {
    expect(['很', '和', '跟', '大'].every((t) => bankFor(t))).toBe(true);
    const cards = [read('很', 5), read('和', 1), read('跟', 3), read('大', 9), makeCard(id('大'), 'sentence', new Date(2026, 9, 1)), makeCard(id('跟'), 'sentence', later)];
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sentenceIds).toEqual([id('大'), id('和')]); // 跟's card isn't due
    expect(SENTENCE_PER_LESSON).toBe(2);
  });
  it('never a word with no bank example, one whose Read has not passed, or one introduced today', () => {
    expect(bankFor('山')).toBeUndefined();
    const cards = [read('山', 1), makeCard(id('很'), 'recognise', later)];
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sentenceIds).toEqual([]);
    const fresh = buildSessionPlan({ cards: [], words: words.filter((w) => w.text === '很'), settings: settings(), now });
    expect(fresh.newWordIds).toEqual([id('很')]);
    expect(fresh.sentenceIds).toEqual([]);
  });
});

const q = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false });

describe('说一句 in the round (production practice spec §4)', () => {
  it('at most 2, and one for every three items at most; rung 3, graded by the parent only', () => {
    const count = (items: number, ids: number) => withSentence(Array.from({ length: items }, (_, i) => q(`w${i}`)), Array.from({ length: ids }, (_, i) => `s${i}`)).filter((x) => x.ask === 'sentence');
    expect(count(12, 5)).toHaveLength(2);
    expect(count(3, 5)).toHaveLength(1);
    expect(count(2, 5)).toHaveLength(0);
    expect(count(12, 5).every((x) => x.rung === 3 && x.grades === 'sentence' && !x.retry)).toBe(true);
  });
  it('early enough for the time box: by the 12th item, and the second by the 24th', () => {
    const out = withSentence(Array.from({ length: 200 }, (_, i) => q(`w${i}`)), ['s0', 's1']);
    const at = out.flatMap((x, i) => (x.ask === 'sentence' ? [i] : []));
    expect(at).toHaveLength(2);
    expect(at[0]).toBeLessThanOrEqual(SENTENCE_BY + 1);
    expect(at[1]).toBeLessThanOrEqual(2 * SENTENCE_BY + 2);
  });
  it('never beside the same word, a Say card, or another 说一句', () => {
    const items: PracticeItem[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(q);
    items.splice(2, 0, { wordId: 'z', rung: 1, ask: 'say', grades: 'say', retry: false });
    const out = withSentence(items, ['c', 'g']);
    out.forEach((x, i) => {
      if (x.ask !== 'sentence') return;
      for (const n of [out[i - 1], out[i + 1]]) expect(n && (n.wordId === x.wordId || n.ask === 'say' || n.ask === 'sentence')).toBeFalsy();
    });
  });
  const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [id('河'), id('他'), id('山'), id('火'), id('人'), id('口')], newWordIds: [id('和')], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, sentenceIds: [id('和'), id('很')], ...over });
  const byId = new Map(words.map((w) => [w.id, w]));
  const round = (p: SessionPlan, canSay: boolean) => planPractice({ ...createSessionRecord(p, '2026-10-02', 0), flashIndex: 1 }, new Map(), byId, words, false, mulberry32(1), new Map(), 1, canSay);
  it('never a word introduced in the same lesson; none when the iPad cannot record or the plan is from before', () => {
    expect(round(plan(), true).filter((x) => x.ask === 'sentence').map((x) => x.wordId)).toEqual([id('很')]);
    expect(round(plan(), false).some((x) => x.ask === 'sentence')).toBe(false);
    expect(round(plan({ sentenceIds: undefined }), true).some((x) => x.ask === 'sentence')).toBe(false);
  });
  it('a blocked microphone drops the 说一句 cards with the Say cards', () => {
    const rec = { ...startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), [q('a'), { wordId: 'b', rung: 3, ask: 'sentence', grades: 'sentence', retry: false }, q('c'), { wordId: 'd', rung: 1, ask: 'say', grades: 'say', retry: false }]), practiceIndex: 1 };
    expect(skipSayItems(rec).practiceQueue!.map((x) => x.ask)).toEqual(['read', 'read']);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/content/sentencePattern.test.ts src/activities/say src/session/sentence.plan.test.ts src/app/sentenceLesson.test.tsx src/app/sayLesson.test.tsx`
Expected: FAIL — `./sentencePattern`, `./SentenceCard` cannot be found; `withSentence` / `SENTENCE_PER_LESSON` / `SENTENCE_BY` are not exported; no `.say-sentence` ever comes in a lesson.

- [ ] **Step 3: Implement**

#### Create `src/activities/say/SentenceCard.tsx`

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { speak, stopSpeaking } from '../../audio/speech';
import { sentenceExample, sentencePattern } from '../../content/sentencePattern';
import type { KidState, Word } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { MicButton, useRecorder } from '../shared/recording';
import type { SayResult } from './SayCard';

/**
 * 说一句 (production practice spec §4): 「用『计划』说一句话」 over a pattern from the word's sentence-bank example (「我们…计划…」,
 * its pinyin fading like every line). He records once, with one optional re-record (the last take is kept); the model sentence
 * then shows and plays. A blocked or missing microphone skips the card (null), and the lesson skips the rest, as for Say cards.
 */
export function SentenceCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | null) => void }) {
  const model = sentenceExample(word.text) ?? word.text;
  const frame = sentencePattern(model, word.text);
  // a frame of up to 4 characters is the card's question, at the question size; a longer one is a line (as a sentence cue is)
  const short = Array.from(frame).length <= 4;
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'blocked' && !finished.current) {
      finished.current = true;
      onDone(null);
    }
    if (rec.state === 'done') speak(model); // the model sentence, right after his take
  }, [rec.state]);
  useEffect(() => () => stopSpeaking(), []); // the model stops when the card goes
  const next = () => {
    if (finished.current || !rec.result) return; // a double tap on 继续 keeps one take
    finished.current = true;
    onDone({ take: rec.result, elapsedMs: Math.round(performance.now() - shownAt.current) });
  };
  const redo = () => {
    setAgain(true);
    rec.reset();
  };
  const said = rec.state === 'done';
  return (
    <Stage
      activity="flash"
      truffle={<Pet kid={kid} mood="neutral" size={180} calm={!said} bubble={said ? '听一听！' : '说一句！'} />}
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said} onAction={next} />}
    >
      <div class="say-sentence">
        <p class="say-sentence__prompt" lang="zh"><Label zh={`用『${word.text}』说一句话`} fade /></p>
        <div class={`say-sentence__pattern hanzi${short ? ' say-sentence__pattern--short' : ''}`} lang="zh" data-q={short || undefined}><Label zh={frame} fade /></div>
        {rec.state !== 'blocked' && <MicButton rec={rec} withLevel={false} />}{/* blocked: the card is skipped at once, with no note */}
        {said && (
          <>
            <div class="say-sentence__model hanzi" lang="zh"><Label zh={model} fade /></div>
            <div class="say__after">
              <SpeakButton text={model} />
              {!again && <button type="button" class="btn btn--secondary" onClick={redo}><Label zh="再录一次" /></button>}
            </div>
          </>
        )}
      </div>
    </Stage>
  );
}
```

In `src/app/SessionScreen.tsx`, replace:

```tsx
import { STORY_PARTS, type Scene } from '../kantu/scenes';
import { recordingSupported, type FinishedRecording } from '../audio/recorder';
import { SayCard, type SayResult } from '../activities/say/SayCard';
import { recordSayTake } from '../session/say';
import { pickPassage, readingPool, finishDay, isFirstDay, type ReadingPassage } from '../langdu/cycle';
import { newestByPassage, tidyPassageTakes } from '../langdu/review';
import { earnsBonus } from '../langdu/stars';
```

with:

```tsx
import { STORY_PARTS, type Scene } from '../kantu/scenes';
import { recordingSupported, type FinishedRecording } from '../audio/recorder';
import { SayCard, type SayResult } from '../activities/say/SayCard';
import { SentenceCard } from '../activities/say/SentenceCard';
import { recordSayTake, recordSentenceTake } from '../session/say';
import { pickPassage, readingPool, finishDay, isFirstDay, type ReadingPassage } from '../langdu/cycle';
import { newestByPassage, tidyPassageTakes } from '../langdu/review';
import { earnsBonus } from '../langdu/stars';
```

In `src/app/SessionScreen.tsx`, replace:

```tsx
      await commit(afterPracticeAnswer(latest.current ?? rec, r.correct, r.elapsedMs, r.inContext, r.idiom));
    })();

  /** A Say card (spec 2026-10-11 §3): keep the take for the parent and schedule his Say card; a blocked microphone drops the lesson's Say cards (§7). */
  const onSayDone = (r: SayResult | null) =>
    once(async () => {
      const item = practiceItem!;
```

with:

```tsx
      await commit(afterPracticeAnswer(latest.current ?? rec, r.correct, r.elapsedMs, r.inContext, r.idiom));
    })();

  /** A Say card (spec 2026-10-11 §3) or a 说一句 (production practice spec §4): keep the take for the parent and schedule its card; a blocked microphone drops the lesson's Say and 说一句 cards (§7). */
  const onSayDone = (r: SayResult | null) =>
    once(async () => {
      const item = practiceItem!;
```

In `src/app/SessionScreen.tsx`, replace:

```tsx
      }
      if (!rec.free) {
        try {
          know.cardsById.set(`${item.wordId}:say`, await recordSayTake(db, item.wordId, r.take, now()));
        } catch (err) {
          // the take couldn't be kept (a full disk, a failed put): never leave him stuck on this card — the lesson's Say cards
          // go, as for a blocked microphone, and 练一练 carries on with taps (final review I1)
```

with:

```tsx
      }
      if (!rec.free) {
        try {
          const card = await (item.ask === 'sentence' ? recordSentenceTake : recordSayTake)(db, item.wordId, r.take, now());
          know.cardsById.set(card.id, card);
        } catch (err) {
          // the take couldn't be kept (a full disk, a failed put): never leave him stuck on this card — the lesson's Say cards
          // go, as for a blocked microphone, and 练一练 carries on with taps (final review I1)
```

In `src/app/SessionScreen.tsx`, replace:

```tsx
      {step === 'practice' && practiceItem?.ask === 'say' && practiceWord && !practiceWord.paused && (
        <SayCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem && practiceItem.ask !== 'say' && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
          key={`p${rec.practiceIndex}`}
          item={practiceItem}
```

with:

```tsx
      {step === 'practice' && practiceItem?.ask === 'say' && practiceWord && !practiceWord.paused && (
        <SayCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem?.ask === 'sentence' && practiceWord && !practiceWord.paused && (
        <SentenceCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem && practiceItem.ask !== 'say' && practiceItem.ask !== 'sentence' && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
          key={`p${rec.practiceIndex}`}
          item={practiceItem}
```

#### Create `src/content/sentencePattern.ts`

```ts
// 说一句 (production practice spec §4): the model sentence for a word, and the short frame he says his own sentence on.
import { HSK_WORDS } from './index';
import { bankFor, fillGap } from './sentenceBank';

/** The model sentence: the word's first sentence-bank gap with the word in it; null for a word the bank doesn't have. */
export function sentenceExample(text: string): string | null {
  const bank = bankFor(text);
  return bank ? fillGap(bank.gaps[0], bank.word) : null;
}

/** Punctuation that ends what comes after the word (it never makes a frame go on). */
const TRAILING = /[。！？!?.，,、；;：:]+$/u;

/**
 * The frame (「我们…计划…」): the example with the word kept and the rest blanked. What comes before the word stays when it is
 * two characters or fewer (今天很…); longer, only its first word does (the longest of 3 or 2 characters that is an HSK word, else
 * its first character), then 「…」. 「…」 after the word stands for anything that follows it.
 */
export function sentencePattern(example: string, word: string): string {
  const at = example.indexOf(word);
  if (at < 0) return word;
  const before = Array.from(example.slice(0, at));
  const after = example.slice(at + word.length).replace(TRAILING, '');
  const firstWord = [3, 2].find((n) => before.length > n && HSK_WORDS.has(before.slice(0, n).join(''))) ?? 1;
  const lead = before.length <= 2 ? before.join('') : `${before.slice(0, firstWord).join('')}…`;
  return `${lead}${word}${after ? '…' : ''}`;
}
```

In `src/session/plan.ts`, replace:

```ts
export const UNDERSTAND_REVIEW_CAP = 30;
/** Say cards in one lesson at most (spec 2026-10-11 §4). */
export const SAY_PER_LESSON = 6;

export function buildSessionPlan({ cards, words, settings, now, practised = new Map(), newPerDay }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
```

with:

```ts
export const UNDERSTAND_REVIEW_CAP = 30;
/** Say cards in one lesson at most (spec 2026-10-11 §4). */
export const SAY_PER_LESSON = 6;
/** 说一句 cards in one lesson at most (production practice spec §4). */
export const SENTENCE_PER_LESSON = 2;

export function buildSessionPlan({ cards, words, settings, now, practised = new Map(), newPerDay }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
```

In `src/session/plan.ts`, replace:

```ts
      .sort((a, b) => Number(inClass(b)) - Number(inClass(a)) || readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].slice(0, SAY_PER_LESSON);

  return {
    steps,
```

with:

```ts
      .sort((a, b) => Number(inClass(b)) - Number(inClass(a)) || readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].slice(0, SAY_PER_LESSON);
  // 说一句 (production practice spec §4): due Sentence cards first, then words whose Read has passed, that have a sentence-bank
  // example and no Sentence card yet, the newest Read pass first. Never a word introduced today.
  const sentence = ofKind('sentence');
  const hasSentence = new Set(sentence.map((c) => c.wordId));
  const canSentence = (id: string) => { const w = byId.get(id); return !!w && !today.has(id) && canAskRung(w, 'sentence'); };
  const sentenceIds = [
    ...dueOf(sentence).map((c) => c.wordId),
    ...active
      .filter((w) => readPassed.has(w.id) && !hasSentence.has(w.id))
      .sort((a, b) => readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].filter(canSentence).slice(0, SENTENCE_PER_LESSON);

  return {
    steps,
```

In `src/session/plan.ts`, replace:

```ts
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
    sayIds,
  };
}
```

with:

```ts
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
    sayIds,
    sentenceIds,
  };
}
```

In `src/session/practice.ts`, replace:

```ts
import { meaningChoices } from '../activities/flashcards/distractors';
import { understandItem } from '../practice/understand';
import { introducedNewWords } from './runner';
import { SAY_PER_LESSON } from './plan';
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';
import { familyBoard } from '../practice/family';
```

with:

```ts
import { meaningChoices } from '../activities/flashcards/distractors';
import { understandItem } from '../practice/understand';
import { introducedNewWords } from './runner';
import { SAY_PER_LESSON, SENTENCE_PER_LESSON } from './plan';
import { canAskRung } from '../ladder/rungs';
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';
import { familyBoard } from '../practice/family';
```

In `src/session/practice.ts`, replace:

```ts
    case 'say': return false; // a Say card is added from the plan's sayIds (withSay), never asked from the ladder
    case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder
    case 'family': return false; // 找一家人 takes over a planned rung-2 item (withFamily), never asked from the ladder
  }
}

```

with:

```ts
    case 'say': return false; // a Say card is added from the plan's sayIds (withSay), never asked from the ladder
    case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder
    case 'family': return false; // 找一家人 takes over a planned rung-2 item (withFamily), never asked from the ladder
    case 'sentence': return false; // 说一句 is added from the plan's sentenceIds (withSentence), never asked from the ladder
  }
}

```

In `src/session/practice.ts`, replace:

```ts
  return out;
}

/** At most two 找一家人 a lesson (spec 2026-10-12 §5). */
export const MAX_FAMILY = 2;

```

with:

```ts
  return out;
}

/** 说一句 comes by this many items in (and the second by twice it): a round is cut by its time box, ~6.7 minutes at 20. */
export const SENTENCE_BY = 12;

/**
 * Puts the 说一句 cards into the round (production practice spec §4): at most 2, and one for every three items at most, spread
 * like the Say cards but never later than the 12th and 24th item, so the time box reaches them (measured: a P2 round of ~200
 * items lost its second one at half-way); never beside the same word or another card he records. Like a Say card it grades
 * nothing in the lesson: the parent confirms the take.
 */
export function withSentence(items: PracticeItem[], sentenceIds: string[]): PracticeItem[] {
  const k = Math.min(SENTENCE_PER_LESSON, sentenceIds.length, Math.floor(items.length / 3));
  const out = [...items];
  sentenceIds.slice(0, k).forEach((wordId, j) => {
    let at = Math.min(Math.round((out.length * (j + 1)) / (k + 1)), SENTENCE_BY * (j + 1));
    const crowded = (x: PracticeItem | undefined) => !!x && (x.wordId === wordId || x.ask === 'say' || x.ask === 'sentence');
    while (at < out.length && (crowded(out[at - 1]) || crowded(out[at]))) at++;
    out.splice(at, 0, { wordId, rung: 3, ask: 'sentence', grades: 'sentence', retry: false });
  });
  return out;
}

/** At most two 找一家人 a lesson (spec 2026-10-12 §5). */
export const MAX_FAMILY = 2;

```

In `src/session/practice.ts`, replace:

```ts
  return out;
}

/** `canSay`: the iPad can record (no microphone or MediaRecorder: no Say cards this lesson, spec 2026-10-11 §7). */
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false, known: ReadonlySet<string> = new Set()): PracticeItem[] {
  // no voice: a word due only for Understand is left for another day — a reading question would grade Use before Read (final review I2)
  const listenOnly = (w: RoundWord) => !!w.gradesUnderstand && !w.gradesRecognise && !w.gradesHear && !w.gradesMeaning;
```

with:

```ts
  return out;
}

/** `canSay`: the iPad can record (no microphone or MediaRecorder: no Say or 说一句 cards this lesson, spec 2026-10-11 §7). */
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false, known: ReadonlySet<string> = new Set()): PracticeItem[] {
  // no voice: a word due only for Understand is left for another day — a reading question would grade Use before Read (final review I2)
  const listenOnly = (w: RoundWord) => !!w.gradesUnderstand && !w.gradesRecognise && !w.gradesHear && !w.gradesMeaning;
```

In `src/session/practice.ts`, replace:

```ts
  // never a word met today: it is said on another day (spec 2026-10-11 §4)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  return withSay(withFish(round, fish), say);
}

/** 再玩一会儿: a round of words he has begun, from their own rungs, twice each; practice only. */
```

with:

```ts
  // never a word met today: it is said on another day (spec 2026-10-11 §4)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  const sentence = canSay ? (rec.plan.sentenceIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id) && canAskRung(w, 'sentence'); }) : [];
  return withSentence(withSay(withFish(round, fish), say), sentence);
}

/** 再玩一会儿: a round of words he has begun, from their own rungs, twice each; practice only. */
```

In `src/session/round.ts`, replace:

```ts
 *  whole: complete a school 成语 itself (its 词语 rung) · fit: the sentence gap · usage: 用对了吗 · build: 组句 tiles ·
 *  idiom: complete a 成语 that uses the word · idiomFit: pick that 成语 for a sentence · idiomBuild: 组句 with it ·
 *  fish: 钓鱼 for a look-alike he confused (not a rung) · say: he reads the word aloud (the Say rung, spec 2026-10-11 §3) ·
 *  family: 找一家人, in place of a rung-2 word or pair item (spec 2026-10-12 §5; never picked by the ladder). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say' | 'family';
export const ASKS: Record<Rung, Ask[]> = {
  1: ['read', 'listen', 'hear', 'meaningRead'], // hear / meaningRead: the word ladder's English meaning (spec 2026-10-06 §3.2)
  2: ['word', 'pair', 'match', 'whole'],
```

with:

```ts
 *  whole: complete a school 成语 itself (its 词语 rung) · fit: the sentence gap · usage: 用对了吗 · build: 组句 tiles ·
 *  idiom: complete a 成语 that uses the word · idiomFit: pick that 成语 for a sentence · idiomBuild: 组句 with it ·
 *  fish: 钓鱼 for a look-alike he confused (not a rung) · say: he reads the word aloud (the Say rung, spec 2026-10-11 §3) ·
 *  family: 找一家人, in place of a rung-2 word or pair item (spec 2026-10-12 §5; never picked by the ladder) ·
 *  sentence: 说一句, he says a sentence with the word (production practice spec §4; rung 3, never picked by the ladder). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say' | 'family' | 'sentence';
export const ASKS: Record<Rung, Ask[]> = {
  1: ['read', 'listen', 'hear', 'meaningRead'], // hear / meaningRead: the word ladder's English meaning (spec 2026-10-06 §3.2)
  2: ['word', 'pair', 'match', 'whole'],
```

In `src/session/round.ts`, replace:

```ts
  5: ['idiom', 'idiomFit', 'idiomBuild'],
};
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | 'understand' | 'say' | null;

/** due: the first appearance of a word whose revision is due today (pacing counts these when time runs out, spec §2.2). */
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked
```

with:

```ts
  5: ['idiom', 'idiomFit', 'idiomBuild'],
};
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | 'understand' | 'say' | 'sentence' | null;

/** due: the first appearance of a word whose revision is due today (pacing counts these when time runs out, spec §2.2). */
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked
```

In `src/session/runner.ts`, replace:

```ts
  return next;
}

/** The microphone is blocked: this Say card and every later one are dropped for the rest of the lesson (spec 2026-10-11 §7). */
export function skipSayItems(rec: SessionRecord): SessionRecord {
  if (currentStep(rec) !== 'practice') return rec;
  const index = rec.practiceIndex ?? 0;
  const queue = rec.practiceQueue ?? [];
  const next: SessionRecord = { ...rec, practiceQueue: [...queue.slice(0, index), ...queue.slice(index).filter((x) => x.ask !== 'say')] };
  return index >= next.practiceQueue!.length ? finishStep(next) : next;
}

```

with:

```ts
  return next;
}

/** The microphone is blocked: this card and every later Say and 说一句 card are dropped for the rest of the lesson (spec 2026-10-11 §7; production practice spec §4). */
export function skipSayItems(rec: SessionRecord): SessionRecord {
  if (currentStep(rec) !== 'practice') return rec;
  const index = rec.practiceIndex ?? 0;
  const queue = rec.practiceQueue ?? [];
  const next: SessionRecord = { ...rec, practiceQueue: [...queue.slice(0, index), ...queue.slice(index).filter((x) => x.ask !== 'say' && x.ask !== 'sentence')] };
  return index >= next.practiceQueue!.length ? finishStep(next) : next;
}

```

In `src/styles.css`, replace:

```css
/* a Say card (spec 2026-10-11 §3): the word, the microphone, then the model and one re-record */
.say { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(12px, 2.4dvh, 24px); height: 100%; }
.say__after { display: flex; align-items: center; gap: 16px; }

/* six options (spec 2026-10-11 §3): three across, so the two rows take the height four did */
.choices--six, .stage__card .choices--six { grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(100%, 720px); max-width: 720px; }
```

with:

```css
/* a Say card (spec 2026-10-11 §3): the word, the microphone, then the model and one re-record */
.say { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(12px, 2.4dvh, 24px); height: 100%; }
.say__after { display: flex; align-items: center; gap: 16px; }
/* 说一句 (production practice spec §4): the ask, his pattern, the mic, then the model sentence */
.say-sentence { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(8px, 1.8dvh, 20px); height: 100%; text-align: center; }
.say-sentence__prompt { margin: 0; font-size: var(--sentence, 22px); }
.say-sentence__pattern { font-size: clamp(32px, 6dvh, 56px); line-height: 1.2; }
.say-sentence__pattern--short { font-size: var(--q-hanzi); }
.say-sentence__model { font-size: var(--sentence, 22px); line-height: 1.3; max-width: 100%; }

/* six options (spec 2026-10-11 §3): three across, so the two rows take the height four did */
.choices--six, .stage__card .choices--six { grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(100%, 720px); max-width: 720px; }
```

In `src/types.ts`, replace:

```ts
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
  writeWordIds?: string[]; // the words 写一写 covers today (production practice spec §3): 练一练 leaves out their 组词 taps; plans saved before it have none
}

```

with:

```ts
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
  sentenceIds?: string[]; // words for 说一句 in 练一练, best first (production practice spec §4); plans saved before it have none
  writeWordIds?: string[]; // the words 写一写 covers today (production practice spec §3): 练一练 leaves out their 组词 taps; plans saved before it have none
}

```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/content/sentencePattern.test.ts src/activities/say src/session/sentence.plan.test.ts src/app/sentenceLesson.test.tsx src/app/sayLesson.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and type-check**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: every file passes (a slow rendered test that times out under load: rerun that file alone); no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: 说一句 — say a sentence with a word on its pattern, then hear the model" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Listen & confirm's 说一句 row, and 「会用 Can use」 in Progress

**Files:**
- Modify: `src/parent/ListenPanel.tsx` (header, imports, `ListenRows`, the explanation)
- Modify: `src/stats/stats.ts` (`Knowledge.canUse`, `Knowledge.begun`)
- Modify: `src/parent/ProgressPanel.tsx` (comment, a count row, the bar)
- Modify: `src/styles.css` (after `.listen__py`)
- Test: `src/parent/listen.test.tsx`, `src/parent/progressPanel.test.tsx`

**Interfaces:**
- Consumes: `takeKind`, `reviewTake` (Task 5); `sentenceExample` (Task 6).
- Produces: a `tr.listen__row.listen__row--sentence` per waiting 说一句 take (`.listen__word`, `.listen__sentence`, `audio[aria-label="His sentence"]`, buttons 「A good sentence: X」/「Not a good sentence: X」); `Knowledge.canUse: number`, `Knowledge.begun: number`; a `Bar` labelled 「会用 Can use」.

- [ ] **Step 1: Write the failing tests**

In `src/parent/listen.test.tsx`, replace:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { addRecording, getCard, getSettings, listRecordings, putCards, putWords, saveParentPassage } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Recording } from '../types';
```

with:

```tsx
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { addRecording, getCard, getSettings, listRecordings, logsForCard, putCards, putWords, saveParentPassage } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Recording } from '../types';
```

Append to the end of `src/parent/listen.test.tsx`:

```tsx

describe('说一句 takes in Listen & confirm (production practice spec §4)', () => {
  const sentence = (id: string, wordId: string, d: number): Recording => ({ ...take(id, wordId, d), prompt: { kind: 'sentence', wordId } });
  async function withSentences() {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true, pinHash: await hashPin('1111') } });
    await putWords(app.db, [makeWord('很', { pinyin: 'hěn' }), makeWord('森', { pinyin: 'sēn' })]);
    await putCards(app.db, [makeCard('b:很', 'sentence', new Date(2026, 9, 9))]);
    for (const t of [sentence('s1', 'b:很', 1), take('t2', 'b:森', 2)]) await addRecording(app.db, t);
    return app;
  }
  it('a row of its own: the word, his take and the model sentence, beside the Say rows', async () => {
    const app = await withSentences();
    renderWithApp(<ListenPanel />, app);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    const row = document.querySelector('.listen__row--sentence')!;
    expect(row.querySelector('.listen__word')!.textContent).toBe('很');
    expect(row.querySelector('.listen__sentence')!.textContent).toBe('今天很热。');
    expect(row.querySelector('audio')).toBeTruthy();
    fireEvent.click(row.querySelector('button[aria-label="听"]')!);
    expect(speak).toHaveBeenCalledWith('今天很热。');
  });
  it('✓ logs a sentence verdict on the day he said it; ✗ brings his Sentence card back', async () => {
    const app = await withSentences();
    renderWithApp(<ListenPanel />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'A good sentence: 很' }));
    await waitFor(() => expect(document.querySelector('.listen__row--sentence')).toBeNull());
    const [log] = await logsForCard(app.db, 'b:很:sentence');
    expect(log).toMatchObject({ kind: 'sentence', correct: true, at: at(1) });
    await addRecording(app.db, sentence('s2', 'b:很', 3));
    cleanup();
    renderWithApp(<ListenPanel />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Not a good sentence: 很' }));
    await waitFor(async () => expect((await getCard(app.db, 'b:很:sentence'))!.fsrs.due.getTime()).toBeLessThan(new Date(2026, 9, 9).getTime()));
  });
});
```

In `src/parent/progressPanel.test.tsx`, replace:

```tsx
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

const passed = (wordId: string, kind: 'recognise' | 'hear' | 'write' | 'say') => ({ ...makeCard(wordId, kind, new Date()), passed: 1 });

describe('the Progress tab (spec 2026-10-06 §3.4)', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
```

with:

```tsx
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

const passed = (wordId: string, kind: 'recognise' | 'hear' | 'write' | 'say' | 'sentence') => ({ ...makeCard(wordId, kind, new Date()), passed: 1 });

describe('the Progress tab (spec 2026-10-06 §3.4)', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
```

In `src/parent/progressPanel.test.tsx`, replace:

```tsx
  it('bars next to reads (taps): characters he writes against the write list, characters he says against the read list', () => {
    const know = summarize([makeWord('门'), makeWord('介'), makeWord('大'), makeWord('门口', { id: 'w:门口' })], [passed('b:门', 'recognise'), passed('b:门', 'write'), passed('b:门', 'say'), passed('b:大', 'say'), passed('w:门口', 'say')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect([...document.querySelectorAll('.pbar__label')].map((l) => l.textContent)).toEqual(['认读 reads (taps)', '会写 Can write', '会说 Can say']);
    expect(screen.getByRole('img', { name: '会写 Can write: 1 of 435; his class is at 413' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '会说 Can say: 2 of 746; his class is at 707' })).toBeTruthy(); // 门 and 大; 门口 counts for itself, not its characters
    expect(screen.getByText('2 of 746')).toBeTruthy();
  });
});
```

with:

```tsx
  it('bars next to reads (taps): characters he writes against the write list, characters he says against the read list', () => {
    const know = summarize([makeWord('门'), makeWord('介'), makeWord('大'), makeWord('门口', { id: 'w:门口' })], [passed('b:门', 'recognise'), passed('b:门', 'write'), passed('b:门', 'say'), passed('b:大', 'say'), passed('w:门口', 'say')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect([...document.querySelectorAll('.pbar__label')].map((l) => l.textContent)).toEqual(['认读 reads (taps)', '会写 Can write', '会说 Can say', '会用 Can use']);
    expect(screen.getByRole('img', { name: '会写 Can write: 1 of 435; his class is at 413' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '会说 Can say: 2 of 746; his class is at 707' })).toBeTruthy(); // 门 and 大; 门口 counts for itself, not its characters
    expect(screen.getByText('2 of 746')).toBeTruthy();
  });
});

describe('can use (production practice spec §4)', () => {
  it('words he said sentences with, against the words he has begun', () => {
    const know = summarize([makeWord('很'), makeWord('和'), makeWord('门'), makeWord('认真', { id: 'w:认真' })], [passed('b:很', 'recognise'), passed('b:和', 'hear'), passed('b:门', 'recognise'), passed('w:认真', 'recognise'), passed('b:很', 'sentence'), passed('w:认真', 'sentence')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect(screen.getByRole('img', { name: '会用 Can use: 2 of 4' })).toBeTruthy();
    expect(screen.getByText('2 of 4 begun')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/parent/listen.test.tsx src/parent/progressPanel.test.tsx`
Expected: FAIL — no `.listen__row--sentence`; no 「会用 Can use」 bar; the Say row's ✓ is all a sentence take gets.

- [ ] **Step 3: Implement**

In `src/parent/ListenPanel.tsx`, replace:

```tsx
// Listen & confirm (spec 2026-10-11 §6; spec 2026-10-12 §6): his Say takes and his passage takes, oldest first. A word: play his
// take and the model, then ✓ or ✗. A passage: play his take and the model, tap what he misread, then Done.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
```

with:

```tsx
// Listen & confirm (spec 2026-10-11 §6; spec 2026-10-12 §6; production practice spec §4): his Say takes, his 说一句 takes and his
// passage takes, oldest first. A word: play his take and the model, then ✓ or ✗. A sentence: the word, his take and the model
// sentence, then ✓ or ✗. A passage: play his take and the model, tap what he misread, then Done.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
```

In `src/parent/ListenPanel.tsx`, replace:

```tsx
import { splitSentences } from '../langdu/sentences';
import { useModelReader } from '../langdu/useModelReader';
import { findWord } from '../ladder/words';
import { reviewTake, takeWord, waitingTakes } from '../session/say';
import { listParentPassages, listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';
```

with:

```tsx
import { splitSentences } from '../langdu/sentences';
import { useModelReader } from '../langdu/useModelReader';
import { findWord } from '../ladder/words';
import { sentenceExample } from '../content/sentencePattern';
import { reviewTake, takeKind, takeWord, waitingTakes } from '../session/say';
import { listParentPassages, listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';
```

In `src/parent/ListenPanel.tsx`, replace:

```tsx
          if (passageOf(r) !== null) return <PassageRow key={r.id} r={r} url={urls.get(r.id)} texts={texts} onDone={onDone} />;
          const w = words.get(takeWord(r)!);
          const label = w?.text ?? takeWord(r) ?? '';
          return (
            <tr key={r.id} class="listen__row">
              <td>
```

with:

```tsx
          if (passageOf(r) !== null) return <PassageRow key={r.id} r={r} url={urls.get(r.id)} texts={texts} onDone={onDone} />;
          const w = words.get(takeWord(r)!);
          const label = w?.text ?? takeWord(r) ?? '';
          if (takeKind(r) === 'sentence') {
            const model = w ? sentenceExample(w.text) : null;
            return (
              <tr key={r.id} class="listen__row listen__row--sentence">
                <td>
                  <small class="listen__kind">说一句</small> <span class="hanzi listen__word">{w?.text ?? '?'}</span> <span class="listen__py">{w?.pinyin}</span>
                  {model && <><br /><span class="hanzi listen__sentence" lang="zh">{model}</span></>}
                  <br />
                  <small>{new Date(r.createdAt).toLocaleString()}</small>
                </td>
                <td><audio controls preload="none" src={urls.get(r.id)} aria-label="His sentence" /></td>
                <td>{model && <SpeakButton text={model} />}</td>
                <td class="listen__verdict">
                  <button type="button" class="small-btn" aria-label={`A good sentence: ${label}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                  <button type="button" class="small-btn" aria-label={`Not a good sentence: ${label}`} onClick={() => onJudge(r, 'no')}>✗</button>
                </td>
              </tr>
            );
          }
          return (
            <tr key={r.id} class="listen__row">
              <td>
```

In `src/parent/ListenPanel.tsx`, replace:

```tsx
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read words aloud in 练一练 and today's text in 朗读. A word: play his take, then the model: ✓ if he said it right, ✗ if not; it counts as “can say” after ✓ on two different days, and ✗ brings it back soon. A text: play his take and the model, tap any character he misread (it comes up in practice), then Done.</p>
      {error && <p class="muted" role="alert">Something went wrong reading or saving the takes. Try again.</p>}
      {takes ? (
        <ListenRows takes={takes} words={words} texts={texts} onJudge={(r, v) => void settle(r, () => reviewTake(db, r.id, v, now()))} onDone={(r, marks) => void settle(r, () => finishPassageReview(db, r, marks, now()))} />
```

with:

```tsx
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read words aloud in 练一练, said sentences with words (说一句), and read today's text in 朗读. A word: play his take, then the model: ✓ if he said it right, ✗ if not; it counts as “can say” after ✓ on two different days, and ✗ brings it back soon. A sentence: play his take; the model sentence is one way to say it — ✓ if his own sentence uses the word sensibly, ✗ if not; ✓ on two different days counts as “can use”. A text: play his take and the model, tap any character he misread (it comes up in practice), then Done.</p>
      {error && <p class="muted" role="alert">Something went wrong reading or saving the takes. Try again.</p>}
      {takes ? (
        <ListenRows takes={takes} words={words} texts={texts} onJudge={(r, v) => void settle(r, () => reviewTake(db, r.id, v, now()))} onDone={(r, marks) => void settle(r, () => finishPassageReview(db, r, marks, now()))} />
```

In `src/parent/ProgressPanel.tsx`, replace:

```tsx
  const target = end === undefined ? null : listedBy(end, course);
  const classAt = classLessonAt(now, settings);
  const atClass = classAt === null ? null : listedBy(classAt, course);
  // can produce (spec 2026-10-11 §3): he writes it (write passed) or says it (Say passed); a 词语 said counts for itself only
  const { write: written, say: said } = produceChars(know.cards, (id) => wordOf(know, id));
  const read = target ? count(know.knownChars, target.read) : know.known;
  const wrote = target ? count(written, target.write) : know.written;
```

with:

```tsx
  const target = end === undefined ? null : listedBy(end, course);
  const classAt = classLessonAt(now, settings);
  const atClass = classAt === null ? null : listedBy(classAt, course);
  // can produce (spec 2026-10-11 §3): he writes it (write passed) or says it (Say passed); a 词语 said counts for itself only;
  // can use (production practice spec §4): words he said sentences with (Sentence passed)
  const { write: written, say: said } = produceChars(know.cards, (id) => wordOf(know, id));
  const read = target ? count(know.knownChars, target.read) : know.known;
  const wrote = target ? count(written, target.write) : know.written;
```

In `src/parent/ProgressPanel.tsx`, replace:

```tsx
        <dt>Characters recognised</dt><dd>{target ? `${read} of ${target.read.size} by the end of ${endTerm}` : know.known}</dd>
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
        <dt>Characters he can say</dt><dd>{target ? `${says} of ${target.read.size}` : says}</dd>
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Understood in a sentence</dt><dd>{know.understood}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
```

with:

```tsx
        <dt>Characters recognised</dt><dd>{target ? `${read} of ${target.read.size} by the end of ${endTerm}` : know.known}</dd>
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
        <dt>Characters he can say</dt><dd>{target ? `${says} of ${target.read.size}` : says}</dd>
        <dt>Words he can use in a sentence</dt><dd>{`${know.canUse} of ${know.begun} begun`}</dd>
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Understood in a sentence</dt><dd>{know.understood}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
```

In `src/parent/ProgressPanel.tsx`, replace:

```tsx
          <Bar label="认读 reads (taps)" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="会写 Can write" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
          <Bar label="会说 Can say" have={says} of={target.read.size} mark={atClass ? atClass.read.size : null} />
        </div>
      )}
      {terms.length > 0 && (
```

with:

```tsx
          <Bar label="认读 reads (taps)" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="会写 Can write" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
          <Bar label="会说 Can say" have={says} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          {know.begun > 0 && <Bar label="会用 Can use" have={know.canUse} of={know.begun} mark={null} />}{/* words, against those begun: no list to aim at (production practice spec §4) */}
        </div>
      )}
      {terms.length > 0 && (
```

In `src/stats/stats.ts`, replace:

```ts
  used: number;
  owned: number;
  written: number; // characters whose writing has passed
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
```

with:

```ts
  used: number;
  owned: number;
  written: number; // characters whose writing has passed
  canUse: number; // words whose Sentence rung has passed: he said sentences with them (production practice spec §4)
  begun: number; // words begun: heard or read (a Hear or Read card)
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
```

In `src/stats/stats.ts`, replace:

```ts
    heard: count('hear'), understood: count('understand'), read: count('read'), used: count('use'),
    owned: [...passedRungs].filter(([id, s]) => isOwned(word(id)!, s)).length,
    written: cards.filter((c) => c.kind === 'write' && c.passed).length,
  };
}

```

with:

```ts
    heard: count('hear'), understood: count('understand'), read: count('read'), used: count('use'),
    owned: [...passedRungs].filter(([id, s]) => isOwned(word(id)!, s)).length,
    written: cards.filter((c) => c.kind === 'write' && c.passed).length,
    canUse: count('sentence'),
    begun: new Set(cards.filter((c) => (c.kind === 'recognise' || c.kind === 'hear') && word(c.wordId)).map((c) => c.wordId)).size,
  };
}

```

In `src/styles.css`, replace:

```css
.tab__badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--red); color: #fff; font-size: 13px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; }
.listen__word { font-size: 32px; }
.listen__py { color: var(--ink-soft); }
.listen__verdict .small-btn { min-width: 52px; min-height: 44px; font-size: 22px; }
@media (max-width: 600px) { /* a phone: the row wraps (word, then his take on its own line, then model and ✓ ✗) instead of running off the card */
  .listen__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
```

with:

```css
.tab__badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--red); color: #fff; font-size: 13px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; }
.listen__word { font-size: 32px; }
.listen__py { color: var(--ink-soft); }
.listen__kind { color: var(--ink-soft); }
.listen__sentence { font-size: 22px; line-height: 1.4; } /* 说一句's model sentence (production practice spec §4) */
.listen__verdict .small-btn { min-width: 52px; min-height: 44px; font-size: 22px; }
@media (max-width: 600px) { /* a phone: the row wraps (word, then his take on its own line, then model and ✓ ✗) instead of running off the card */
  .listen__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/parent/listen.test.tsx src/parent/progressPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: the parent confirms 说一句 takes; Progress shows 会用" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 连一连: two decoy halves, and every pair graded

**Files:**
- Modify: `src/practice/pairs.ts` (header, `PairBoard.decoys`, imports, `zuciBoard`, `isExample`, `withDecoys`)
- Modify: `src/activities/practice/PairGame.tsx`
- Modify: `src/styles.css` (after `.pair__tile.is-shown`)
- Modify: `src/app/sayLesson.test.tsx` (`untilLangdu` tap budget)
- Test: `src/practice/pairs.test.ts`, `src/activities/practice/PairGame.test.tsx`

**Interfaces:**
- Consumes: `PRODUCTIVE`, `board` (pairs.ts); `builtinWords`, `HSK_WORDS`.
- Produces: `PairBoard.decoys?: [string, string]` (left, right; inserted in `left`/`right` at the same index); `zuciBoard` returns 8-half boards; `PairGame` reports `correct: true` only when no try on the board missed; tiles `.pairs--eight`, `.is-decoy`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/practice/PairGame.test.tsx`, replace:

```tsx
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it("only the word's own pair is graded: a miss on another pair still counts the word right", () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('刷', '足球'); // a miss on an extra
```

with:

```tsx
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('every pair is graded (production practice spec §5): a miss on another pair makes the board wrong', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('刷', '足球'); // a miss on an extra
```

In `src/activities/practice/PairGame.test.tsx`, replace:

```tsx
    join('刷', '牙');
    join('踢', '足球');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a picked tile can be tapped again to let go (a slip is not a miss)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
```

with:

```tsx
    join('刷', '牙');
    join('踢', '足球');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('a picked tile can be tapped again to let go (a slip is not a miss)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
```

Append to the end of `src/activities/practice/PairGame.test.tsx`:

```tsx

describe('decoy halves (production practice spec §5)', () => {
  // 火 + 山 = 火山; 公 + 园 = 公园; 先 + 生 = 先生; 鸟 and 木 pair with nothing here
  const eight: PairBoard = { left: ['公', '鸟', '火', '先'], right: ['山', '木', '生', '园'], pairs: [['火', '山'], ['公', '园'], ['先', '生']], target: ['火', '山'], decoys: ['鸟', '木'] };
  const p8 = { board: eight, kind: 'pair' as const, kid: DEFAULT_KID };
  it('eight halves, two columns of four; the three pairs end the board right, and the decoys then show as decoys', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    expect(document.querySelectorAll('.pairs--eight .pair__tile')).toHaveLength(8);
    expect(document.querySelector('.is-decoy')).toBeNull(); // nothing gives them away while he plays
    join('火', '山');
    join('公', '园');
    join('先', '生');
    expect([...document.querySelectorAll('.is-decoy')].map((t) => t.textContent).sort()).toEqual(['木', '鸟']);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a decoy tried is a miss: the board is wrong, and three tries set a left decoy aside', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    join('鸟', '山');
    expect(tile('鸟').disabled).toBe(false);
    join('鸟', '园');
    join('鸟', '生');
    expect(tile('鸟').disabled).toBe(true);
    expect(tile('鸟').classList.contains('is-decoy')).toBe(true);
    join('火', '山');
    join('公', '园');
    join('先', '生');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('a right-hand decoy tried with a real half is a miss on that half', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    join('火', '木');
    join('火', '山');
    join('公', '园');
    join('先', '生');
    expect(document.querySelector('.sheet--oops')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});
```

In `src/app/sayLesson.test.tsx`, replace:

```tsx
 *  tapped again (找一家人 lets go of it on a second tap). */
const TAPS = '.choice:not([disabled]):not(.is-picked):not(.is-matched), .fishtile:not([disabled]), .bubble-opt:not([disabled]), .whichpart__char:not([disabled])';
async function untilLangdu() {
  for (let i = 0; i < 120; i++) {
    await waitFor(() => expect(document.querySelector(`.langdu, ${TAPS}, .sheet .btn:not([disabled])`)).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.langdu')) return;
    const before = document.body.innerHTML;
```

with:

```tsx
 *  tapped again (找一家人 lets go of it on a second tap). */
const TAPS = '.choice:not([disabled]):not(.is-picked):not(.is-matched), .fishtile:not([disabled]), .bubble-opt:not([disabled]), .whichpart__char:not([disabled])';
async function untilLangdu() {
  for (let i = 0; i < 300; i++) { // a pairing board has 8 halves now, two of them decoys: blind taps take longer (production practice spec §5)
    await waitFor(() => expect(document.querySelector(`.langdu, ${TAPS}, .sheet .btn:not([disabled])`)).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.langdu')) return;
    const before = document.body.innerHTML;
```

In `src/practice/pairs.test.ts`, replace:

```ts
    expect(b.pairs).toHaveLength(3);
    expect(b.target.join('')).toContain('火');
    for (const [l, r] of b.pairs) expect(isWord(l + r), l + r).toBe(true);
    expect([...b.left].sort()).toEqual(b.pairs.map(([l]) => l).sort());
    expect([...b.right].sort()).toEqual(b.pairs.map(([, r]) => r).sort());
    expect(new Set([...b.left, ...b.right]).size).toBe(6);
  });
  it('no board has a cross pair that is also a word (review focus 1)', () => {
    for (const w of words.slice(0, 300)) {
```

with:

```ts
    expect(b.pairs).toHaveLength(3);
    expect(b.target.join('')).toContain('火');
    for (const [l, r] of b.pairs) expect(isWord(l + r), l + r).toBe(true);
    expect([...b.left].sort()).toEqual([...b.pairs.map(([l]) => l), b.decoys![0]].sort());
    expect([...b.right].sort()).toEqual([...b.pairs.map(([, r]) => r), b.decoys![1]].sort());
    expect(new Set([...b.left, ...b.right]).size).toBe(8);
  });
  it('no board has a cross pair that is also a word (review focus 1)', () => {
    for (const w of words.slice(0, 300)) {
```

Append to the end of `src/practice/pairs.test.ts`:

```ts

describe('decoy halves (production practice spec §5)', () => {
  it('every board has two, one each side, and neither makes a word with any half on the board or with the other', () => {
    for (const w of words.slice(0, 400)) {
      for (let seed = 1; seed <= 2; seed++) {
        const b = zuciBoard(w, mulberry32(seed));
        if (!b) continue;
        const [dl, dr] = b.decoys!;
        expect(b.left).toHaveLength(4);
        expect(b.right).toHaveLength(4);
        expect(b.left).toContain(dl);
        expect(b.right).toContain(dr);
        for (const h of [...b.pairs.flat(), dl, dr]) {
          if (h !== dl) expect(isWord(dl + h) || isWord(h + dl), `${w.text}: ${dl} + ${h}`).toBe(false);
          if (h !== dr) expect(isWord(dr + h) || isWord(h + dr), `${w.text}: ${dr} + ${h}`).toBe(false);
        }
        expect(PRODUCTIVE.has(dl) || PRODUCTIVE.has(dr)).toBe(false);
      }
    }
  });
  it('with what he knows, the decoys are characters he knows', () => {
    const known = new Set(words.slice(0, 400).map((w) => w.text));
    const b = zuciBoard(byText.get('火')!, mulberry32(5), known)!;
    for (const d of b.decoys!) expect(known.has(d), d).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/practice/pairs.test.ts src/activities/practice/PairGame.test.tsx`
Expected: FAIL — boards have 6 halves and no `decoys`; a miss on another pair still reports `correct: true`; a decoy tile throws (`board.pairs.find(...)![1]` of undefined).

- [ ] **Step 3: Implement**

In `src/activities/practice/PairGame.tsx`, replace:

```tsx

/**
 * Pairing (spec 2026-10-05 §3.2 rung 2): tap a left half, then its right half; tap the picked half again to let go. A wrong
 * pair lets go; three misses on a tile show its match. Only the word's own pair is graded: its first try, timed from its pick.
 * Tiles are told apart by column and place, not by text, so a doubled word (妈妈) works.
 */
/** A colour per matched pair: green, blue, gold, purple (palette inks dark enough for a ✓ on paper). */
const PAIR_COLOURS = ['#2a9d5c', '#2f7fd8', '#c98a12', '#8a5cd6'];
```

with:

```tsx

/**
 * Pairing (spec 2026-10-05 §3.2 rung 2): tap a left half, then its right half; tap the picked half again to let go. A wrong
 * pair lets go; three misses on a tile show its match. Every pair is graded (production practice spec §5): the board is right
 * only when each pair was joined at its first try, so a lucky last pair can't pass it; the time is the word's own pair's, from its
 * pick. A 组词 board has two decoy halves that pair with nothing: a try with one is a miss, three set a left decoy aside, and the
 * board ends when the three pairs are joined. Tiles are told apart by column and place, not by text, so a doubled word (妈妈) works.
 */
/** A colour per matched pair: green, blue, gold, purple (palette inks dark enough for a ✓ on paper). */
const PAIR_COLOURS = ['#2a9d5c', '#2f7fd8', '#c98a12', '#8a5cd6'];
```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx
  const [joined, setJoined] = useState<Set<string>>(new Set()); // 'L0', 'R2'… joined, right or shown
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const target = useRef<{ pickedAt: number; tries: number; ms: number }>({ pickedAt: 0, tries: 0, ms: 0 });
  const isTarget = (l: number) => board.left[l] === board.target[0];
  const partnerOf = (l: number) => board.right.findIndex((r, i) => r === board.pairs.find(([a]) => a === board.left[l])![1] && !joined.has(`R${i}`));

  useEffect(() => {
    if (joined.size < board.pairs.length * 2 || result) return;
    const t = target.current;
    const correct = t.tries === 1 && !shown.has(`L${board.left.findIndex((x) => x === board.target[0])}`);
    setResult({ correct, responseMs: t.ms });
    playSfx(correct ? 'correct' : 'wrong');
  }, [joined]);

```

with:

```tsx
  const [joined, setJoined] = useState<Set<string>>(new Set()); // 'L0', 'R2'… joined, right or shown
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Record<number, number>>({});
  const [setAside, setSetAside] = useState<Set<string>>(new Set()); // a left decoy tried three times
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const target = useRef<{ pickedAt: number; ms: number }>({ pickedAt: 0, ms: 0 }); // the word's own pair: its time, from its pick
  const isTarget = (l: number) => board.left[l] === board.target[0];
  /** The right tile that joins this left one, or -1 for a decoy (it pairs with nothing). */
  const partnerOf = (l: number) => {
    const pair = board.pairs.find(([a]) => a === board.left[l]);
    return pair ? board.right.findIndex((r, i) => r === pair[1] && !joined.has(`R${i}`)) : -1;
  };
  const isDecoy = (key: string) => !!board.decoys && (key[0] === 'L' ? board.left : board.right)[Number(key.slice(1))] === board.decoys[key[0] === 'L' ? 0 : 1];

  useEffect(() => {
    if (joined.size < board.pairs.length * 2 || result) return;
    const correct = !Object.values(missed).some((n) => n > 0); // every pair at its first try (production practice spec §5)
    setResult({ correct, responseMs: target.current.ms });
    playSfx(correct ? 'correct' : 'wrong');
  }, [joined]);

```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx
    if (picked === null) return;
    const l = picked;
    const partner = partnerOf(l);
    if (isTarget(l)) target.current.tries += 1;
    if (partner === r) {
      if (isTarget(l)) target.current.ms = Math.round(performance.now() - target.current.pickedAt);
      setJoined(new Set([...joined, `L${l}`, `R${r}`]));
```

with:

```tsx
    if (picked === null) return;
    const l = picked;
    const partner = partnerOf(l);
    if (partner === r) {
      if (isTarget(l)) target.current.ms = Math.round(performance.now() - target.current.pickedAt);
      setJoined(new Set([...joined, `L${l}`, `R${r}`]));
```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx
    } else {
      const n = (missed[l] ?? 0) + 1;
      setMissed({ ...missed, [l]: n });
      if (n >= SHOW_AFTER) {
        setShown(new Set([...shown, `L${l}`, `R${partner}`]));
        setJoined(new Set([...joined, `L${l}`, `R${partner}`]));
      }
```

with:

```tsx
    } else {
      const n = (missed[l] ?? 0) + 1;
      setMissed({ ...missed, [l]: n });
      if (n >= SHOW_AFTER && partner < 0) setSetAside(new Set([...setAside, `L${l}`])); // a decoy: it has no match to show
      else if (n >= SHOW_AFTER) {
        setShown(new Set([...shown, `L${l}`, `R${partner}`]));
        setJoined(new Set([...joined, `L${l}`, `R${partner}`]));
      }
```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx

  const done = result !== null;
  const anyMiss = Object.values(missed).some((n) => n > 0);
  const cls = (key: string, isPicked: boolean) => `choice press pair__tile${joined.has(key) ? (shown.has(key) ? ' is-shown' : ' is-matched') : ''}${isPicked ? ' is-picked' : ''}`;
  // the two tiles of a pair share a colour, in the order he joined them, so he sees which go together (parent, 2026-10-05)
  const order = [...joined];
  const pairStyle = (key: string) => (joined.has(key) && !shown.has(key) ? `--pc:${PAIR_COLOURS[(order.indexOf(key) >> 1) % PAIR_COLOURS.length]}` : undefined);
```

with:

```tsx

  const done = result !== null;
  const anyMiss = Object.values(missed).some((n) => n > 0);
  // the decoys show for what they are once the board is done, or once he has tried one three times
  const cls = (key: string, isPicked: boolean) => `choice press pair__tile${joined.has(key) ? (shown.has(key) ? ' is-shown' : ' is-matched') : ''}${(done || setAside.has(key)) && isDecoy(key) ? ' is-decoy' : ''}${isPicked ? ' is-picked' : ''}`;
  // the two tiles of a pair share a colour, in the order he joined them, so he sees which go together (parent, 2026-10-05)
  const order = [...joined];
  const pairStyle = (key: string) => (joined.has(key) && !shown.has(key) ? `--pc:${PAIR_COLOURS[(order.indexOf(key) >> 1) % PAIR_COLOURS.length]}` : undefined);
```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx
        />
      )}
    >
      <div class="pairs">
        {/* the right halves come first in the page (CSS shows them on the right): the first open tile is always one that moves the game on */}
        <div class="pairs__col pairs__col--right">
          {board.right.map((r, i) => (
```

with:

```tsx
        />
      )}
    >
      <div class={`pairs${board.left.length > 3 ? ' pairs--eight' : ''}`}>
        {/* the right halves come first in the page (CSS shows them on the right): the first open tile is always one that moves the game on */}
        <div class="pairs__col pairs__col--right">
          {board.right.map((r, i) => (
```

In `src/activities/practice/PairGame.tsx`, replace:

```tsx
        </div>
        <div class="pairs__col pairs__col--left">
          {board.left.map((l, i) => (
            <button key={`L${i}`} type="button" class={cls(`L${i}`, picked === i)} style={pairStyle(`L${i}`)} disabled={done || joined.has(`L${i}`) || (picked !== null && picked !== i)} onClick={() => pick(i)}>{l}</button>
          ))}
        </div>
      </div>
```

with:

```tsx
        </div>
        <div class="pairs__col pairs__col--left">
          {board.left.map((l, i) => (
            <button key={`L${i}`} type="button" class={cls(`L${i}`, picked === i)} style={pairStyle(`L${i}`)} disabled={done || joined.has(`L${i}`) || setAside.has(`L${i}`) || (picked !== null && picked !== i)} onClick={() => pick(i)}>{l}</button>
          ))}
        </div>
      </div>
```

In `src/practice/pairs.ts`, replace:

```ts
// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong.
import { HSK_WORDS } from '../content';
import { DAPEI } from '../content/dapei';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string] }

const TWO_CHAR = [...HSK_WORDS.entries()].filter(([w]) => Array.from(w).length === 2);

```

with:

```ts
// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong. A 组词 board also has two decoy halves
// that pair with nothing (production practice spec §5), so the last pair can't be had by elimination.
import { builtinWords, HSK_WORDS } from '../content';
import { DAPEI } from '../content/dapei';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

/** `decoys`: the left and the right half that pair with nothing on the board (a 组词 board's; a 搭配 board has none). */
export interface PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string]; decoys?: [string, string] }

const TWO_CHAR = [...HSK_WORDS.entries()].filter(([w]) => Array.from(w).length === 2);

```

In `src/practice/pairs.ts`, replace:

```ts
  const familiar = known ? near.filter((w) => Array.from(w).every((ch) => known.has(ch))) : [];
  const pool = familiar.length >= 6 ? familiar : near;
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  return board([a, b], shuffle(pool, rng).map((w) => Array.from(w) as [string, string]), fits, rng);
}

/** A 搭配 question: the verb, its partner and the partner's three written wrong partners, shuffled. */
```

with:

```ts
  const familiar = known ? near.filter((w) => Array.from(w).every((ch) => known.has(ch))) : [];
  const pool = familiar.length >= 6 ? familiar : near;
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  const made = board([a, b], shuffle(pool, rng).map((w) => Array.from(w) as [string, string]), fits, rng);
  return made && withDecoys(made, pool, fits, rng);
}

let examples: ReadonlySet<string> | null = null;
/** A 组词 of any built-in character (切菜 isn't HSK, but it is a 组词 he may know): a decoy never makes one of these either. */
const isExample = (s: string) => (examples ??= new Set(builtinWords(0).flatMap((w) => (w.examples ?? []).map((e) => e.text)))).has(s);

/**
 * One more half on each side that pairs with nothing (production practice spec §5): characters of the board's own word pool (his
 * if he knows enough), never one on the board, one that fits almost anywhere, or one that makes a word — HSK, a built-in 组词 or
 * the word's own, either way round — with any half on the board or with the other decoy. They go in on the same row, so no pair
 * comes to sit on one. Null when no two such characters exist.
 */
function withDecoys(b: PairBoard, pool: string[], fits: (l: string, r: string) => boolean, rng: Rng): PairBoard | null {
  const joins = (x: string, y: string) => fits(x, y) || fits(y, x) || isExample(x + y) || isExample(y + x);
  const halves = b.pairs.flat();
  const free = (c: string) => !PRODUCTIVE.has(c) && !halves.includes(c) && !halves.some((h) => joins(c, h));
  const chars = shuffle([...new Set(pool.flatMap((w) => Array.from(w)))].filter(free), rng);
  const left = chars[0];
  const right = left === undefined ? undefined : chars.find((c) => c !== left && !joins(c, left));
  if (left === undefined || right === undefined) return null;
  const at = Math.floor(rng() * (b.left.length + 1));
  return { ...b, left: [...b.left.slice(0, at), left, ...b.left.slice(at)], right: [...b.right.slice(0, at), right, ...b.right.slice(at)], decoys: [left, right] };
}

/** A 搭配 question: the verb, its partner and the partner's three written wrong partners, shuffled. */
```

In `src/styles.css`, replace:

```css
/* tiles not yet joined are paper, so a joined pair's colour stands out */
.pair__tile:not(.is-matched):not(.is-shown) { background: var(--surface); }
.pair__tile.is-shown { background: var(--orange-soft, #ffe2c2); }

/* 搭配 (spec 2026-10-05 §3.2 rung 2) */
.match { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: var(--q-hanzi, 64px); line-height: 1.1; }
```

with:

```css
/* tiles not yet joined are paper, so a joined pair's colour stands out */
.pair__tile:not(.is-matched):not(.is-shown) { background: var(--surface); }
.pair__tile.is-shown { background: var(--orange-soft, #ffe2c2); }
/* 8 halves (production practice spec §5): two columns of four, shorter tiles so a phone keeps them all */
.pairs--eight .pairs__col { gap: 8px; }
.pairs--eight .pair__tile { min-height: clamp(var(--tap-main), 8dvh, 96px); }
.pair__tile.is-decoy { border-style: dashed; color: var(--muted); box-shadow: none; }

/* 搭配 (spec 2026-10-05 §3.2 rung 2) */
.match { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: var(--q-hanzi, 64px); line-height: 1.1; }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/practice/pairs.test.ts src/activities/practice/PairGame.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and type-check**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: every file passes (a slow rendered test that times out under load: rerun that file alone); no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: 连一连 has two decoy halves and grades every pair" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 「都不对 None of these」 in 组词-gap, 搭配 and English-meaning questions

**Files:**
- Create: `src/practice/noneOfThese.ts`, `src/practice/noneOfThese.test.ts`
- Modify: `src/session/round.ts` (`PracticeItem.none`)
- Modify: `src/session/practice.ts` (import; the round in `planPractice`)
- Modify: `src/session/runner.ts` (`afterPracticeAnswer`'s retry)
- Modify: `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/practice/MatchQuestion.tsx`, `src/activities/practice/PracticeQuestion.tsx`
- Modify: `src/styles.css` (after `.choice.is-eaten`)
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`, `src/activities/practice/MatchQuestion.test.tsx`, `src/activities/practice/PracticeQuestion.test.tsx`

**Interfaces:**
- Consumes: `planPractice`'s `today` set and `rng`; `MeaningNote` (`rightMeaning`).
- Produces: `NONE_OF_THESE = '都不对'`; `NONE_SHARE = 0.2`; `NONE_ASKS: ReadonlySet<Ask>` = word, match, meaningRead, hear; `withNoneOfThese(items: PracticeItem[], fresh: ReadonlySet<string>, rng: Rng): PracticeItem[]`; `noneChoices(options: string[], answer: string): string[]`; `PracticeItem.none?: true`; `FlashcardStep` prop `noneOfThese?: boolean`; `MatchQuestion` prop `none?: boolean`; the 都不对 button has class `choice--none`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/flashcards/FlashcardStep.test.tsx`, replace:

```tsx
  });
});

describe('asked by the round (spec 2026-10-05 §3.2)', () => {
  it("ask 'word': the 组词 gap, even for a word that has a sentence", () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
```

with:

```tsx
  });
});

describe('「都不对」 (production practice spec §5)', () => {
  const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
  const cue = wordCue(w)!;
  const gap = { word: w, item: { wordId: w.id, isNew: false, retry: false, mode: 'meaning' as const }, ask: 'word' as const, voice: false };
  const choices = () => [...document.querySelectorAll('.choice')].map((b) => b.textContent);
  it('the 组词 gap without its answer: 都不对 last, as many choices as before; picking it is right and shows the real 组词', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} {...gap} noneOfThese onDone={onDone} />);
    expect(choices()).not.toContain(w.text);
    expect(choices().at(-1)).toBe('都不对');
    expect([4, 6]).toContain(choices().length);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--good .sheet__en')!.textContent).toContain(cue.full);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'meaning', picked: '都不对' }));
  });
  it('picking a character there is wrong, and the real 组词 shows', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} {...gap} noneOfThese onDone={onDone} />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not(.choice--none)')!);
    expect(document.querySelector('.sheet--oops .sheet__en')!.textContent).toContain(cue.full);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('its English meaning without its answer: four choices, 都不对 last; picking it shows the real meaning', () => {
    render(<FlashcardStep {...base} item={review} ask="meaningRead" voice={false} noneOfThese onDone={vi.fn()} />);
    const real = firstSense(cardMeaning(he)!);
    expect(choices()).toHaveLength(4);
    expect(choices()).not.toContain(real);
    expect(choices().at(-1)).toBe('都不对');
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--good .sheet__en')!.textContent).toContain(real);
  });
});

describe('asked by the round (spec 2026-10-05 §3.2)', () => {
  it("ask 'word': the 组词 gap, even for a word that has a sentence", () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
```

Replace the whole of `src/activities/practice/MatchQuestion.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { MatchQuestion } from './MatchQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const question = { verb: '穿', noun: '衣服', options: ['牙', '衣服', '饭', '歌'] };
const props = { question, kid: DEFAULT_KID };

describe('搭配 (spec 2026-10-05 §3.2 rung 2, final review C2)', () => {
  it('the right partner joins the word, said aloud', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '衣服' }));
    expect(document.querySelector('.match__slot')!.textContent).toBe('衣服');
    expect(speak).toHaveBeenLastCalledWith('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a wrong partner: the right pair on the sheet, with English for both partners', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '牙' }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    expect(document.querySelector('.sheet [lang="en"]')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});

describe('「都不对」 in 搭配 (production practice spec §5)', () => {
  it('the partner is left out; 都不对 is right, and the sheet shows the real pair', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} none onDone={onDone} />);
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent)).toEqual(['牙', '饭', '歌', '都不对']);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--good')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('picking a partner there is wrong, and the real pair shows', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} none onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '牙' }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});
```

In `src/activities/practice/PracticeQuestion.test.tsx`, replace:

```tsx
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'meaning' }));
  });
  it('钓鱼: the pond with the look-alike he picked among the fish; the answer comes back as a 字辨 answer', () => {
    const gen = pool.find((w) => w.text === '根')!;
    const onDone = vi.fn();
```

with:

```tsx
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'meaning' }));
  });
  it('a question the round marked 都不对 asks without its answer: 都不对 is right (production practice spec §5)', () => {
    const chuan = pool.find((w) => w.text === '穿')!;
    const onDone = vi.fn();
    const first = render(<PracticeQuestion {...base} word={chuan} item={{ wordId: chuan.id, rung: 2, ask: 'match', grades: 'meaning', retry: false, none: true }} onDone={onDone} />);
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'meaning' }));
    first.unmount();
    const w = pool.find((x) => x.text === '河')!;
    render(<PracticeQuestion {...base} word={w} item={{ wordId: w.id, rung: 1, ask: 'meaningRead', grades: null, retry: true, none: true }} onDone={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: '都不对' })).toHaveLength(1);
  });
  it('钓鱼: the pond with the look-alike he picked among the fish; the answer comes back as a 字辨 answer', () => {
    const gen = pool.find((w) => w.text === '根')!;
    const onDone = vi.fn();
```

#### Create `src/practice/noneOfThese.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import type { Ask, PracticeItem } from '../session/round';
import { NONE_OF_THESE, NONE_SHARE, noneChoices, withNoneOfThese } from './noneOfThese';
import { afterPracticeAnswer, createSessionRecord, finishStep, startPractice } from '../session/runner';

const item = (wordId: string, ask: Ask, retry = false): PracticeItem => ({ wordId, rung: 2, ask, grades: null, retry });

describe('「都不对」 (production practice spec §5)', () => {
  it('about one in five of the questions that can take it, the same for the same seed', () => {
    // each word: a first question, then 4 that can take it
    const items = Array.from({ length: 500 }, (_, i) => [item(`w${i}`, 'read'), item(`w${i}`, 'word'), item(`w${i}`, 'match'), item(`w${i}`, 'meaningRead'), item(`w${i}`, 'hear')]).flat();
    const marked = withNoneOfThese(items, new Set(), mulberry32(7)).filter((x) => x.none).length;
    expect(marked / 2000).toBeGreaterThan(NONE_SHARE - 0.03);
    expect(marked / 2000).toBeLessThan(NONE_SHARE + 0.03);
    expect(withNoneOfThese(items, new Set(), mulberry32(7))).toEqual(withNoneOfThese(items, new Set(), mulberry32(7)));
  });
  it("never a word's first question, a word introduced today, a retry, or another kind of question", () => {
    const items = Array.from({ length: 200 }, (_, i) => [item(`w${i}`, 'word'), item(`w${i}`, 'word'), item(`n${i}`, 'read'), item(`n${i}`, 'word'), item(`w${i}`, 'match', true), item(`w${i}`, 'fit'), item(`w${i}`, 'pair')]).flat();
    const fresh = new Set(Array.from({ length: 200 }, (_, i) => `n${i}`));
    const out = withNoneOfThese(items, fresh, mulberry32(3));
    const firstOf = new Map<string, number>();
    out.forEach((x, i) => { if (!firstOf.has(x.wordId)) firstOf.set(x.wordId, i); });
    out.forEach((x, i) => {
      if (!x.none) return;
      expect(firstOf.get(x.wordId)).not.toBe(i);
      expect(fresh.has(x.wordId)).toBe(false);
      expect(x.retry).toBe(false);
      expect(['word', 'match', 'meaningRead', 'hear']).toContain(x.ask);
    });
    expect(out.some((x) => x.none)).toBe(true);
  });
  it('the right answer is left out and 都不对 comes last: as many choices as before', () => {
    expect(noneChoices(['衣服', '牙', '饭', '歌'], '衣服')).toEqual(['牙', '饭', '歌', NONE_OF_THESE]);
  });
});

describe('a missed 「都不对」 question (production practice spec §5)', () => {
  it('comes back as an ordinary retry, its answer among the choices', () => {
    const q: PracticeItem[] = [{ ...item('a', 'word'), none: true }, item('b', 'read'), item('c', 'read'), item('d', 'read'), item('e', 'read'), item('f', 'read')];
    const rec = startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), q);
    const retry = afterPracticeAnswer(rec, false, 100).practiceQueue!.find((x) => x.retry)!;
    expect(retry.wordId).toBe('a');
    expect(retry.none).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/practice/noneOfThese.test.ts src/activities/flashcards/FlashcardStep.test.tsx src/activities/practice/MatchQuestion.test.tsx src/activities/practice/PracticeQuestion.test.tsx`
Expected: FAIL — `./noneOfThese` cannot be found; no 「都不对」 button; the answer is among the choices.

- [ ] **Step 3: Implement**

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
import { InkIcon } from '../../ui/icons/InkIcon';
import type { Idiom } from '../../content/chengyu';
import { familyOf, type FamilyWord } from '../../content/family';

export interface FlashResult {
  correct: boolean;
```

with:

```tsx
import { InkIcon } from '../../ui/icons/InkIcon';
import type { Idiom } from '../../content/chengyu';
import { familyOf, type FamilyWord } from '../../content/family';
import { NONE_OF_THESE, noneChoices } from '../../practice/noneOfThese';

export interface FlashResult {
  correct: boolean;
```

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
  lessonTag?: string | null;
  /** the characters he reads (know.knownChars): the 认新字 card's 「一家人」 row (spec 2026-10-12 §5) */
  knownChars?: ReadonlySet<string>;
}

const NO_CHARS: ReadonlySet<string> = new Set();

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, lessonTag = null, knownChars = NO_CHARS }: Props) {
  const quiz = useMemo((): { listen: boolean; cue: MeaningCue | null; answer: string; options: string[]; cheer: string; comfort: string; mode: 'hear' | 'meaningRead' | null } => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    // Meaning: which character fits its 组词 word (same-sound choices). Without a cue it falls back to reading.
    const cue = ask === 'word' ? wordCue(word) : ask ? null : item.mode === 'meaning' ? meaningCue(word) : null;
    // six options where five good wrong ones exist, else four (spec 2026-10-11 §3); a class sentence's own wrong ones stay as they are
    if (cue) {
      return { listen: false, cue, answer: word.text, options: shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, MANY_WRONG)))], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null };
    }
    // the word ladder (spec 2026-10-06 §3.2): he hears it, or reads it, and picks its meaning in English
    if (ask === 'hear' || ask === 'meaningRead') {
```

with:

```tsx
  lessonTag?: string | null;
  /** the characters he reads (know.knownChars): the 认新字 card's 「一家人」 row (spec 2026-10-12 §5) */
  knownChars?: ReadonlySet<string>;
  /** 练一练: a 组词 gap or English meaning asked without its answer, 「都不对」 right (production practice spec §5) */
  noneOfThese?: boolean;
}

const NO_CHARS: ReadonlySet<string> = new Set();

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, lessonTag = null, knownChars = NO_CHARS, noneOfThese = false }: Props) {
  // none: the right answer is left out and 都不对 is right; real: the right answer itself, shown after (production practice spec §5)
  const quiz = useMemo((): { listen: boolean; cue: MeaningCue | null; answer: string; options: string[]; cheer: string; comfort: string; mode: 'hear' | 'meaningRead' | null; none: boolean; real: string } => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    // Meaning: which character fits its 组词 word (same-sound choices). Without a cue it falls back to reading.
    const cue = ask === 'word' ? wordCue(word) : ask ? null : item.mode === 'meaning' ? meaningCue(word) : null;
    // six options where five good wrong ones exist, else four (spec 2026-10-11 §3); a class sentence's own wrong ones stay as they are
    if (cue) {
      const options = shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, MANY_WRONG)))], rng);
      return { listen: false, cue, answer: noneOfThese ? NONE_OF_THESE : word.text, options: noneOfThese ? noneChoices(options, word.text) : options, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null, none: noneOfThese, real: word.text };
    }
    // the word ladder (spec 2026-10-06 §3.2): he hears it, or reads it, and picks its meaning in English
    if (ask === 'hear' || ask === 'meaningRead') {
```

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
      const options = meaningChoices(word, pool, rng);
      if (options) {
        const hear = ask === 'hear' && voice; // no voice: he reads it for meaning instead (asked 'read', never graded as hearing)
        return { listen: hear, cue: null, answer: firstSense(cardMeaning(word)!), options, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: hear ? 'hear' : 'meaningRead' };
      }
    }
    const five = pickLookAlikes(word, pool, rng);
```

with:

```tsx
      const options = meaningChoices(word, pool, rng);
      if (options) {
        const hear = ask === 'hear' && voice; // no voice: he reads it for meaning instead (asked 'read', never graded as hearing)
        const real = firstSense(cardMeaning(word)!);
        return { listen: hear, cue: null, answer: noneOfThese ? NONE_OF_THESE : real, options: noneOfThese ? noneChoices(options, real) : options, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: hear ? 'hear' : 'meaningRead', none: noneOfThese, real };
      }
    }
    const five = pickLookAlikes(word, pool, rng);
```

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : fiveOrThree(pickPinyinDistractors(word, pool, rng, MANY_WRONG));
    return { listen, cue: null, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
```

with:

```tsx
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : fiveOrThree(pickPinyinDistractors(word, pool, rng, MANY_WRONG));
    return { listen, cue: null, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null, none: false, real: answer };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
```

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={result.correct ? undefined : (
            <>
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : word.pinyin} picked={quiz.mode ? null : quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
              {/* why (spec 2026-10-12 §3): English choices → the radical; the 组词 gap → the look-alike part, else the radical;
                  find the character → the look-alike part; its reading → the kind of pinyin slip */}
              {quiz.mode ? <RadicalHint text={word.text} />
                : quiz.cue ? <LookAlikeWhy right={word.text} picked={choice ?? ''} fallback={<RadicalHint text={word.text} />} />
                : quiz.listen ? <LookAlikeWhy right={word.text} picked={choice ?? ''} />
                : <PinyinWhy word={word} picked={choice ?? ''} />}
            </>
```

with:

```tsx
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          // a 都不对 question shows the real answer, right or wrong (production practice spec §5)
          detail={result.correct && !quiz.none ? undefined : (
            <>
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : word.pinyin} rightMeaning={quiz.none && quiz.mode ? quiz.real : undefined} picked={quiz.mode || choice === NONE_OF_THESE ? null : quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
              {/* why (spec 2026-10-12 §3): English choices → the radical; the 组词 gap → the look-alike part, else the radical;
                  find the character → the look-alike part; its reading → the kind of pinyin slip */}
              {result.correct ? null
                : quiz.mode ? <RadicalHint text={word.text} />
                : quiz.cue ? <LookAlikeWhy right={word.text} picked={choice === NONE_OF_THESE ? '' : (choice ?? '')} fallback={<RadicalHint text={word.text} />} />
                : quiz.listen ? <LookAlikeWhy right={word.text} picked={choice ?? ''} />
                : <PinyinWhy word={word} picked={choice ?? ''} />}
            </>
```

In `src/activities/flashcards/FlashcardStep.tsx`, replace:

```tsx
                  <button
                    key={o}
                    type="button"
                    class={`choice press ${optionState(o)}`}
                    lang={quiz.mode ? 'en' : undefined}
                    disabled={phase === 'feedback'}
                    onClick={() => choose(o)}
                    ref={(el) => {
```

with:

```tsx
                  <button
                    key={o}
                    type="button"
                    class={`choice press ${optionState(o)}${o === NONE_OF_THESE && quiz.none ? ' choice--none' : ''}`}
                    lang={quiz.mode && !(o === NONE_OF_THESE && quiz.none) ? 'en' : undefined}
                    disabled={phase === 'feedback'}
                    onClick={() => choose(o)}
                    ref={(el) => {
```

In `src/activities/practice/MatchQuestion.tsx`, replace:

```tsx
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { DapeiQuestion } from '../../practice/pairs';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
```

with:

```tsx
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { DapeiQuestion } from '../../practice/pairs';
import { NONE_OF_THESE, noneChoices } from '../../practice/noneOfThese';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
```

In `src/activities/practice/MatchQuestion.tsx`, replace:

```tsx
  question: DapeiQuestion;
  kid: KidState;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** 搭配 (spec 2026-10-05 §3.2 rung 2): the word and four partners — which one goes with it? The right one joins it. */
export function MatchQuestion({ question, kid, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ question.verb.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [question]);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const done = choice !== null;
  const correct = choice === question.noun;
  const pair = question.verb + question.noun;
  const pick = (o: string) => {
    if (done) return;
    setChoice(o);
    playSfx(o === question.noun ? 'correct' : 'wrong');
    speak(pair);
  };
  return (
```

with:

```tsx
  question: DapeiQuestion;
  kid: KidState;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
  /** asked without its partner, 「都不对」 right (production practice spec §5) */
  none?: boolean;
}

/** 搭配 (spec 2026-10-05 §3.2 rung 2): the word and four partners — which one goes with it? The right one joins it. */
export function MatchQuestion({ question, kid, onDone, none = false }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ question.verb.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [question]);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const options = none ? noneChoices(question.options, question.noun) : question.options;
  const answer = none ? NONE_OF_THESE : question.noun;
  const done = choice !== null;
  const correct = choice === answer;
  const pair = question.verb + question.noun;
  const pick = (o: string) => {
    if (done) return;
    setChoice(o);
    playSfx(o === answer ? 'correct' : 'wrong');
    speak(pair);
  };
  return (
```

In `src/activities/practice/MatchQuestion.tsx`, replace:

```tsx
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct ? undefined : (
            <>
              <span class="hanzi">{pair}</span>
              <SpeakButton text={pair} />
              <MeaningNote right={question.noun} picked={choice} />
            </>
          )}
          actionLabel="继续"
```

with:

```tsx
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct && !none ? undefined : ( // a 都不对 question shows the real pair, right or wrong
            <>
              <span class="hanzi">{pair}</span>
              <SpeakButton text={pair} />
              <MeaningNote right={question.noun} picked={choice === NONE_OF_THESE ? null : choice} />
            </>
          )}
          actionLabel="继续"
```

In `src/activities/practice/MatchQuestion.tsx`, replace:

```tsx
        <span class={`match__slot hanzi${done ? ' is-filled' : ''}`} style={`--n:${Array.from(question.noun).length}`} aria-label={done ? undefined : '空格'}>{done ? question.noun : '？'}</span>
      </div>
      <div class="choices">
        {question.options.map((o) => (
          <button key={o} type="button" class={`choice press${done ? (o === question.noun ? ' is-answer' : o === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    </Stage>
```

with:

```tsx
        <span class={`match__slot hanzi${done ? ' is-filled' : ''}`} style={`--n:${Array.from(question.noun).length}`} aria-label={done ? undefined : '空格'}>{done ? question.noun : '？'}</span>
      </div>
      <div class="choices">
        {options.map((o) => (
          <button key={o} type="button" class={`choice press${o === NONE_OF_THESE && none ? ' choice--none' : ''}${done ? (o === answer ? ' is-answer' : o === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    </Stage>
```

In `src/activities/practice/PracticeQuestion.tsx`, replace:

```tsx
      <MatchQuestion
        question={match}
        kid={kid}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
```

with:

```tsx
      <MatchQuestion
        question={match}
        kid={kid}
        none={!!item.none}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
```

In `src/activities/practice/PracticeQuestion.tsx`, replace:

```tsx
        item={{ wordId: word.id, isNew: false, retry: item.retry, mode: item.ask === 'word' ? 'meaning' : 'read' }}
        ask={item.ask === 'listen' || item.ask === 'word' || item.ask === 'hear' || item.ask === 'meaningRead' ? item.ask : 'read'}
        word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}
        onDone={(r) => onDone(r)}
      />
    );
```

with:

```tsx
        item={{ wordId: word.id, isNew: false, retry: item.retry, mode: item.ask === 'word' ? 'meaning' : 'read' }}
        ask={item.ask === 'listen' || item.ask === 'word' || item.ask === 'hear' || item.ask === 'meaningRead' ? item.ask : 'read'}
        word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}
        noneOfThese={!!item.none}
        onDone={(r) => onDone(r)}
      />
    );
```

#### Create `src/practice/noneOfThese.ts`

```ts
// 「都不对 None of these」 (production practice spec §5): about one in five 组词-gap, 搭配 and English-meaning questions in a
// lesson leave the right answer out and add 都不对, which is then the right answer — so he can't pick by elimination.
import type { Rng } from '../lib/random';
import type { Ask, PracticeItem } from '../session/round';

export const NONE_OF_THESE = '都不对';
/** The share of the questions that can take it which do (seeded per lesson). */
export const NONE_SHARE = 0.2;
/** The questions it can come in: the 组词 gap, 搭配, and the English meaning (heard or read). */
export const NONE_ASKS: ReadonlySet<Ask> = new Set<Ask>(['word', 'match', 'meaningRead', 'hear']);

/**
 * Marks the questions that leave their answer out: each that can take it with chance NONE_SHARE, from `rng` (the lesson's seed),
 * but never a word's first question in the lesson, a word introduced today (`fresh`), or a retry.
 */
export function withNoneOfThese(items: PracticeItem[], fresh: ReadonlySet<string>, rng: Rng): PracticeItem[] {
  const seen = new Set<string>();
  return items.map((x) => {
    const first = !seen.has(x.wordId);
    seen.add(x.wordId);
    if (first || x.retry || fresh.has(x.wordId) || !NONE_ASKS.has(x.ask)) return x;
    return rng() < NONE_SHARE ? { ...x, none: true } : x;
  });
}

/** A question's choices without its right one, 都不对 last (as many choices as before). */
export const noneChoices = (options: string[], answer: string): string[] => [...options.filter((o) => o !== answer), NONE_OF_THESE];
```

In `src/session/practice.ts`, replace:

```ts
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';
import { familyBoard } from '../practice/family';

const idiomCache = new WeakMap<Word[], Map<string, Idiom[]>>();
/** The 成语 for a word at his level, worked out once per word list (planning asks each word several times). */
```

with:

```ts
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';
import { familyBoard } from '../practice/family';
import { withNoneOfThese } from '../practice/noneOfThese';

const idiomCache = new WeakMap<Word[], Map<string, Idiom[]>>();
/** The 成语 for a word at his level, worked out once per word list (planning asks each word several times). */
```

In `src/session/practice.ts`, replace:

```ts
  // ladder asks another rung-2 question, or the nearest rung below, so the round keeps its length (plans saved before have none)
  const written = new Set(rec.plan.writeWordIds ?? []);
  const can = (id: string, ask: Ask) => !(written.has(id) && (ask === 'word' || ask === 'pair')) && askable(wordsById.get(id), pool, voice, level)(ask);
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5)
  const round = withFamily(buildRound(words, can, rng), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  });
  const fish = [...confusions.keys()].filter((id) => {
    const w = wordsById.get(id);
    return w && !w.paused && fishItem(w, confusions.get(id)!, new Set(), mulberry32(1)) !== null;
  });
  // never a word met today: it is said on another day (spec 2026-10-11 §4)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  const sentence = canSay ? (rec.plan.sentenceIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id) && canAskRung(w, 'sentence'); }) : [];
  return withSentence(withSay(withFish(round, fish), say), sentence);
```

with:

```ts
  // ladder asks another rung-2 question, or the nearest rung below, so the round keeps its length (plans saved before have none)
  const written = new Set(rec.plan.writeWordIds ?? []);
  const can = (id: string, ask: Ask) => !(written.has(id) && (ask === 'word' || ask === 'pair')) && askable(wordsById.get(id), pool, voice, level)(ask);
  // never a word met today: it is said on another day (spec 2026-10-11 §4), and asked with its answer in (production practice spec §5)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5); about one
  // in five 组词-gap, 搭配 and English-meaning questions then leave their answer out for 「都不对」 (production practice spec §5)
  const round = withNoneOfThese(withFamily(buildRound(words, can, rng), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  }), today, rng);
  const fish = [...confusions.keys()].filter((id) => {
    const w = wordsById.get(id);
    return w && !w.paused && fishItem(w, confusions.get(id)!, new Set(), mulberry32(1)) !== null;
  });
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  const sentence = canSay ? (rec.plan.sentenceIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id) && canAskRung(w, 'sentence'); }) : [];
  return withSentence(withSay(withFish(round, fish), say), sentence);
```

In `src/session/round.ts`, replace:

```ts
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | 'understand' | 'say' | 'sentence' | null;

/** due: the first appearance of a word whose revision is due today (pacing counts these when time runs out, spec §2.2). */
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked

export interface RoundWord {
  wordId: string;
```

with:

```ts
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | 'understand' | 'say' | 'sentence' | null;

/** due: the first appearance of a word whose revision is due today (pacing counts these when time runs out, spec §2.2).
 *  none: its right answer is left out and 「都不对」 is right (production practice spec §5). */
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string; none?: true } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked

export interface RoundWord {
  wordId: string;
```

In `src/session/runner.ts`, replace:

```ts
  const index = rec.practiceIndex ?? 0;
  const queue = [...rec.practiceQueue!];
  if (!correct && !item.retry && item.ask !== 'fish' && item.ask !== 'family') { // a missed 钓鱼 or 找一家人 isn't asked again: at most two a lesson (sweep; spec 2026-10-12 §5)
    const { due: _due, ...again } = item; // a retry is practice only, never a due first appearance
    let at = Math.min(index + 1 + PRACTICE_RETRY_GAP, queue.length);
    while (at < queue.length && (queue[at - 1]?.wordId === item.wordId || queue[at]?.wordId === item.wordId)) at++; // never beside the same word (sweep)
    queue.splice(at, 0, { ...again, grades: null, retry: true, missed: true, ...(idiom ? { idiom } : {}) }); // the same 成语 comes back (sweep)
```

with:

```ts
  const index = rec.practiceIndex ?? 0;
  const queue = [...rec.practiceQueue!];
  if (!correct && !item.retry && item.ask !== 'fish' && item.ask !== 'family') { // a missed 钓鱼 or 找一家人 isn't asked again: at most two a lesson (sweep; spec 2026-10-12 §5)
    const { due: _due, none: _none, ...again } = item; // a retry is practice only, never a due first appearance, and asks with its answer in
    let at = Math.min(index + 1 + PRACTICE_RETRY_GAP, queue.length);
    while (at < queue.length && (queue[at - 1]?.wordId === item.wordId || queue[at]?.wordId === item.wordId)) at++; // never beside the same word (sweep)
    queue.splice(at, 0, { ...again, grades: null, retry: true, missed: true, ...(idiom ? { idiom } : {}) }); // the same 成语 comes back (sweep)
```

In `src/styles.css`, replace:

```css
.choice.is-wrong { background: var(--orange-soft); border-color: var(--orange); box-shadow: 0 var(--edge) 0 var(--orange); color: var(--orange-ink); animation: wobble 0.45s; }
.choice.is-dim { opacity: 0.4; }
.choice.is-eaten { pointer-events: none; z-index: 20; }
@keyframes wobble { 25% { transform: translateX(-7px) rotate(-2deg); } 75% { transform: translateX(7px) rotate(2deg); } }
.intro { display: flex; flex-direction: column; align-items: center; }
.intro__card {
```

with:

```css
.choice.is-wrong { background: var(--orange-soft); border-color: var(--orange); box-shadow: 0 var(--edge) 0 var(--orange); color: var(--orange-ink); animation: wobble 0.45s; }
.choice.is-dim { opacity: 0.4; }
.choice.is-eaten { pointer-events: none; z-index: 20; }
/* 「都不对」 (production practice spec §5): words, not a character tile, in any choice grid */
.stage .choices .choice.choice--none { font-family: inherit; font-size: clamp(22px, 3.4dvh, 30px); font-weight: 900; }
@keyframes wobble { 25% { transform: translateX(-7px) rotate(-2deg); } 75% { transform: translateX(7px) rotate(2deg); } }
.intro { display: flex; flex-direction: column; align-items: center; }
.intro__card {
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/practice/noneOfThese.test.ts src/activities/flashcards/FlashcardStep.test.tsx src/activities/practice/MatchQuestion.test.tsx src/activities/practice/PracticeQuestion.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and type-check**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: every file passes (a slow rendered test that times out under load: rerun that file alone); no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: 都不对 — about one in five 组词-gap, 搭配 and meaning questions leave the answer out" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: WebKit stage cases, the fit sweep, the full suite and the build

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (imports; `longestSentenceWord`; the `listen` case's takes; cases `trace`, `sentence`, `none-word`, `none-meaning`)
- Modify: `scripts/stage-cases.ts` (the `pair` case; `trace`, `sentence`, `none-*` checks; the listen sentence row)
- Modify: `scripts/fit-check.ts` (`signature()` marks)

**Interfaces:**
- Consumes: `WritingStep` with `pass="trace"` (Task 3), `SentenceCard` (Task 6), the sentence `RecordingPrompt` and `ListenRows`' sentence row (Tasks 5, 7), `zuciBoard` decoys and `.is-decoy` (Task 8), `FlashcardStep noneOfThese` and `.choice--none` (Task 9).
- Produces: stage cases `trace`, `sentence`, `none-word`, `none-meaning` (each at iPhone SE, iPhone Safari, iPhone 15, iPad landscape and portrait); the `pair` case checks 8 tiles; screenshots in `fit-shots/stage-cases/`.

- [ ] **Step 1: Write the cases and checks**

In `scripts/fit-check.ts`, replace:

```ts

function signature(): string {
  const s = document.querySelector('.screen');
  const marks = ['.home', '.usage-opts', '.intro', '.pond', '.bubbles', '.langdu', '.kantu', '.kantu__ask', '.kantu__model', '.celebrate', '.chest', '.room', '.zika-grid', '.setup', '.pinpad', '.choices', '.choices--six', '.say', '.say__after', '.arrival', '.zika-big', '.rotate-hint'];
  const on = marks.filter((m) => s?.matches(m) || s?.querySelector(m) || document.querySelector(`${m}:not(.rotate-hint)`));
  const tone = document.querySelector('.sheet')?.className ?? '';
  const words = (s?.querySelector('.kantu__q, .langdu__step, .pet__bubble, h1, h2')?.textContent ?? '').slice(0, 14);
```

with:

```ts

function signature(): string {
  const s = document.querySelector('.screen');
  const marks = ['.home', '.usage-opts', '.intro', '.pond', '.bubbles', '.langdu', '.kantu', '.kantu__ask', '.kantu__model', '.celebrate', '.chest', '.room', '.zika-grid', '.setup', '.pinpad', '.choices', '.choices--six', '.say', '.say__after', '.say-sentence', '.say-sentence__model', '.pairs--eight', '.choice--none', '.arrival', '.zika-big', '.rotate-hint'];
  const on = marks.filter((m) => s?.matches(m) || s?.querySelector(m) || document.querySelector(`${m}:not(.rotate-hint)`));
  const tone = document.querySelector('.sheet')?.className ?? '';
  const words = (s?.querySelector('.kantu__q, .langdu__step, .pet__bubble, h1, h2')?.textContent ?? '').slice(0, 14);
```

In `scripts/stage-cases.ts`, replace:

```ts
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
    if (c === 'pair') {
      // play it with wrong tries (always the last open right tile): the board ends explaining every 组词, and nothing is cut off
      for (let k = 0; k < 30; k++) {
        const left = await page.$('.pairs__col--left .pair__tile:not(.is-matched):not(.is-shown)');
        if (!left) break;
        await left.click();
        const rights = await page.$$('.pairs__col--right .pair__tile:not(.is-matched):not(.is-shown)');
```

with:

```ts
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
    if (c === 'pair') {
      // 8 halves, two of them decoys (production practice spec §5), all on the card at every size
      const tiles = (await page.$$('.pairs--eight .pair__tile')).length;
      if (tiles !== 8) problems.push(`${size.name} pair: ${tiles} tiles on the board (want 8)`);
      // play it with wrong tries (always the last open right tile): the board ends explaining every 组词, and nothing is cut off;
      // a left decoy tried three times is set aside (disabled), so the next open left tile is taken
      for (let k = 0; k < 40; k++) {
        const left = await page.$('.pairs__col--left .pair__tile:not(.is-matched):not(.is-shown):not([disabled])');
        if (!left) break;
        await left.click();
        const rights = await page.$$('.pairs__col--right .pair__tile:not(.is-matched):not(.is-shown)');
```

In `scripts/stage-cases.ts`, replace:

```ts
      problems.push(...(await cardClipped(page, `${size.name} pair done`)));
    }
  }
  // the Understand question (plan 2b): the choices open after the sentence (5 s here: no voice ends it), then a miss's sheet
  {
    await page.goto(`file://${dir}/index.html?case=understand`);
```

with:

```ts
      problems.push(...(await cardClipped(page, `${size.name} pair done`)));
    }
  }
  // a read-only character traced over its outline (production practice spec §3): the 田字格 with 澡's outline drawn, on the card
  {
    await page.goto(`file://${dir}/index.html?case=trace`);
    await page.waitForSelector('.tianzige svg', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `fit-shots/stage-cases/trace-${size.name}.png` });
    if ((await page.$$('.tianzige svg path')).length === 0) problems.push(`${size.name} trace: no outline in the 田字格`);
    problems.push(...(await cardClipped(page, `${size.name} trace`)));
  }
  // 说一句 (production practice spec §4): the ask and its pattern, then after a take the model sentence and 再录一次
  {
    await page.goto(`file://${dir}/index.html?case=sentence`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/sentence-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} sentence`)));
    await page.click('.mic-btn');
    await page.waitForSelector('.mic-btn.is-recording', { timeout: 5000 }).catch(() => null);
    await page.click('.mic-btn.is-recording').catch(() => null);
    const said = await page.waitForSelector('.say-sentence__model', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/sentence-said-${size.name}.png` });
    if (!said) problems.push(`${size.name} sentence: no model sentence after a take`);
    problems.push(...(await cardClipped(page, `${size.name} sentence said`)));
  }
  // 「都不对」 (production practice spec §5): right (the real answer on the sheet) and wrong, for the 组词 gap and the English meaning
  for (const c of ['none-word', 'none-meaning']) {
    for (const pick of ['.choice--none', '.choice:not(.choice--none)']) {
      await page.goto(`file://${dir}/index.html?case=${c}`);
      await page.waitForTimeout(300);
      if (!(await page.$('.choice--none'))) { problems.push(`${size.name} ${c}: no 都不对 choice`); break; }
      problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
      await page.click(pick);
      await page.waitForTimeout(1600);
      const name = `${c}-${pick === '.choice--none' ? 'right' : 'wrong'}`;
      await page.screenshot({ path: `fit-shots/stage-cases/${name}-${size.name}.png` });
      if (!(await page.$('.sheet .sheet__en'))) problems.push(`${size.name} ${name}: the sheet doesn't show the real answer`);
      // a right pick flies to Truffle (is-eaten): it leaves the card on purpose
      problems.push(...(await cardClipped(page, `${size.name} ${name}`, '.is-eaten')), ...(await sheetFits(page, `${size.name} ${name}`)), ...(await sheetScrolls(page, `${size.name} ${name}`)));
    }
  }
  // the Understand question (plan 2b): the choices open after the sentence (5 s here: no voice ends it), then a miss's sheet
  {
    await page.goto(`file://${dir}/index.html?case=understand`);
```

In `scripts/stage-cases.ts`, replace:

```ts
  }
  // the passage row (final review I8): each misread character, 听原文 and Done big enough to tap; nothing makes the page scroll sideways
  if (!(await page.$('.listen__row--passage'))) problems.push(`${size.name} listen: no passage row`);
  else await page.locator('.listen__row--passage').screenshot({ path: `fit-shots/stage-cases/listen-passage-${size.name}.png` });
  for (const q of ['.listen__row--passage .misread-ch', '.listen__row--passage .listen__done', '.listen__row--passage .listen__model']) {
    const els = await page.$$(q);
```

with:

```ts
  }
  // the passage row (final review I8): each misread character, 听原文 and Done big enough to tap; nothing makes the page scroll sideways
  if (!(await page.$('.listen__row--passage'))) problems.push(`${size.name} listen: no passage row`);
  if (!(await page.$('.listen__row--sentence .listen__sentence'))) problems.push(`${size.name} listen: no 说一句 row with its model sentence`);
  else await page.locator('.listen__row--passage').screenshot({ path: `fit-shots/stage-cases/listen-passage-${size.name}.png` });
  for (const q of ['.listen__row--passage .misread-ch', '.listen__row--passage .listen__done', '.listen__row--passage .listen__model']) {
    const els = await page.$$(q);
```

In `scripts/stage-cases/page.tsx`, replace:

```tsx
import { PinyinFade } from '../../src/ui/pinyinFade';
import { FamilyQuestion } from '../../src/activities/practice/FamilyQuestion';
import { familyBoard } from '../../src/practice/family';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
```

with:

```tsx
import { PinyinFade } from '../../src/ui/pinyinFade';
import { FamilyQuestion } from '../../src/activities/practice/FamilyQuestion';
import { familyBoard } from '../../src/practice/family';
import { fillGap, SENTENCE_BANK } from '../../src/content/sentenceBank';
import { WritingStep } from '../../src/activities/writing/WritingStep';
import { SentenceCard } from '../../src/activities/say/SentenceCard';
import { wordCue } from '../../src/activities/flashcards/meaning';
import zao from 'hanzi-writer-data/澡.json';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
```

In `scripts/stage-cases/page.tsx`, replace:

```tsx
    {body}
  </div>
);
const clue = { kind: 'fit' as const, wordId: null, word: '连忙', before: '看到老师来了，他', after: '站起来。', options: ['连忙', '从来', '互相', '本来'], clue: '连忙：说已经发生的事；叫别人快一点用"赶快"' };
const which = new URLSearchParams(location.search).get('case');
if (which?.startsWith('alive') || which === 'moments') {
```

with:

```tsx
    {body}
  </div>
);
/** The app word whose sentence-bank example (说一句's model sentence) is the longest: the tightest 说一句 card and Listen row. */
function longestSentenceWord() {
  const byText = new Map([...builtinWords(0), ...ladderWords()].map((w) => [w.text, w]));
  const model = (b: (typeof SENTENCE_BANK)[number]) => Array.from(fillGap(b.gaps[0], b.word)).length;
  return byText.get([...SENTENCE_BANK].filter((b) => byText.has(b.word)).sort((a, b) => model(b) - model(a))[0]!.word)!;
}
const clue = { kind: 'fit' as const, wordId: null, word: '连忙', before: '看到老师来了，他', after: '站起来。', options: ['连忙', '从来', '互相', '本来'], clue: '连忙：说已经发生的事；叫别人快一点用"赶快"' };
const which = new URLSearchParams(location.search).get('case');
if (which?.startsWith('alive') || which === 'moments') {
```

In `scripts/stage-cases/page.tsx`, replace:

```tsx
  const words = builtinWords(0);
  const said = [...['森', '林', '游', '泳'].map((t) => words.find((x) => x.text === t)!), ladderWords().find((w) => w.text === '森林') ?? ladderWords()[0]!];
  const takes: Recording[] = said.map((w, i) => ({ id: `t${i}`, createdAt: new Date(2026, 9, 11, 17, i * 3).getTime(), prompt: { kind: 'say', wordId: w.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2 }));
  const p20 = PASSAGES.find((x) => x.id === 'p20')!; // the longest built-in text
  takes.push({ id: 'tp', createdAt: new Date(2026, 9, 11, 18).getTime(), prompt: { kind: 'passage', passageId: p20.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 40, meaning: { correct: false, picked: '一个大商店' } });
  render(
```

with:

```tsx
  const words = builtinWords(0);
  const said = [...['森', '林', '游', '泳'].map((t) => words.find((x) => x.text === t)!), ladderWords().find((w) => w.text === '森林') ?? ladderWords()[0]!];
  const takes: Recording[] = said.map((w, i) => ({ id: `t${i}`, createdAt: new Date(2026, 9, 11, 17, i * 3).getTime(), prompt: { kind: 'say', wordId: w.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2 }));
  // a 说一句 take (production practice spec §4): the bank word with the longest model sentence
  const used = longestSentenceWord();
  said.push(used);
  takes.push({ id: 'ts', createdAt: new Date(2026, 9, 11, 17, 30).getTime(), prompt: { kind: 'sentence', wordId: used.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 4 });
  const p20 = PASSAGES.find((x) => x.id === 'p20')!; // the longest built-in text
  takes.push({ id: 'tp', createdAt: new Date(2026, 9, 11, 18).getTime(), prompt: { kind: 'passage', passageId: p20.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 40, meaning: { correct: false, picked: '一个大商店' } });
  render(
```

In `scripts/stage-cases/page.tsx`, replace:

```tsx
  const w = builtinWords(0).find((x) => x.text === '生')!;
  render(screen(<FamilyQuestion board={familyBoard(w, new Set('男女气先口出学家人'), mulberry32(1))!} kid={DEFAULT_KID} onDone={() => {}} />), app);
}
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
```

with:

```tsx
  const w = builtinWords(0).find((x) => x.text === '生')!;
  render(screen(<FamilyQuestion board={familyBoard(w, new Set('男女气先口出学家人'), mulberry32(1))!} kid={DEFAULT_KID} onDone={() => {}} />), app);
}
else if (which === 'trace') {
  // a read-only character traced over its outline (production practice spec §3): 澡's strokes from the package, not the CDN
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => (String(input).includes('hanzi-writer-data') ? Promise.resolve(new Response(JSON.stringify(zao), { headers: { 'content-type': 'application/json' } })) : real(input, init));
  const w = { ...builtinWords(0).find((x) => x.text === '澡')!, writeable: false };
  render(screen(<WritingStep word={w} kid={DEFAULT_KID} isNew pass="trace" onDone={() => {}} />), app);
}
else if (which === 'sentence') {
  // 说一句 (production practice spec §4) for the bank word with the longest model sentence, with a pretend microphone:
  // stage-cases.ts records a take, so the model sentence and 再录一次 show (the tallest state)
  class FakeRecorder {
    static isTypeSupported() { return true; }
    mimeType = 'audio/mp4'; state = 'inactive';
    ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
    constructor(_s: MediaStream) {}
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/mp4' }) }); this.onstop?.(); }, 10); }
    addEventListener(t: string, f: () => void) { (this as Record<string, unknown>)[`on${t}`] = f; }
    removeEventListener() {}
  }
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
  const stream = () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream() } });
  render(screen(<PinyinFade known={new Set()} on><SentenceCard word={longestSentenceWord()} kid={DEFAULT_KID} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'none-word' || which === 'none-meaning') {
  // 「都不对」 (production practice spec §5): the 组词 gap with six choices, and the English meaning with the longest English
  const words = builtinWords(0);
  const lw = ladderWords();
  if (which === 'none-word') {
    const w = words.find((x) => wordCue(x) && x.text === '河') ?? words.find((x) => wordCue(x))!;
    render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} noneOfThese onDone={() => {}} />), app);
  } else {
    const longest = [...lw].sort((a, b) => (cardMeaning(b)?.length ?? 0) - (cardMeaning(a)?.length ?? 0));
    render(screen(<FlashcardStep item={{ wordId: longest[0]!.id, isNew: false, retry: false }} ask="meaningRead" word={longest[0]!} pool={longest.slice(0, 4)} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} noneOfThese onDone={() => {}} />), app);
  }
}
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (`hanzi-writer-data/澡.json` resolves: the package has no `exports` map and `resolveJsonModule` is on).

- [ ] **Step 3: Run the stage cases in WebKit**

Run: `ls ~/Library/Caches/ms-playwright | grep -i webkit` — if nothing is listed, stop and ask the user before `npx playwright-core install webkit` (~100 MB). Then: `npx tsx scripts/stage-cases.ts`
Expected: the last line is `stage cases: ok` (about 7 minutes). Look at `fit-shots/stage-cases/pair-done-iphone-se.png` (8 tiles, the two decoys dashed), `sentence-said-iphone-se.png` (the ask, the frame, the model sentence, 🔊 and 再录一次 on the card), `trace-ipad-landscape.png` (澡's grey outline in the 田字格) and `none-word-right-iphone-se.png` (「正确答案：」 with the 组词 on a green sheet). Don't run this at the same time as the fit sweep: both write under `fit-shots/`, and the sweep deletes it first.

- [ ] **Step 4: Run the fit sweep**

Run: `npm run fit` (it builds, sweeps every flow at every size, then runs the stage cases and the story walk; tens of minutes). It starts and stops its own `vite preview` on port 4174 — check `lsof -i :4174` is empty first, and that nothing is left on it afterwards.
Expected: no problem that cb23562 doesn't already have, `stage cases: ok`, and the story walk clean. On cb23562 the `practice` flow already ends with "walker ran out of taps: the lesson bar still shows after 300 taps" at all six sizes (measured: `FIT_ONLY='^practice$'`), and the long `practice-evening` and `lesson` flows hit the same cap; that line is the only problem expected (measured on this plan's code with `FIT_ONLY='^(say|practice|writing|writing-sentence)$'`: 333 screens, the 6 walker lines only). Any `too small: question` on a `.say-sentence` screen means the frame's `data-q` rule (Task 6) is off. The `say`, `practice` and `lesson` flows now walk 说一句 cards (`.say-sentence` in their signatures), 8-tile boards and 「都不对」 questions.

- [ ] **Step 5: The whole suite and the build**

Run: `npx vitest run` then `npm run build`
Expected: 235 files, 2027 tests pass (under load a slow rendered test — `SessionScreen.test.tsx`, `langduSession.test.tsx` — can time out: rerun it alone); the build (`tsc --noEmit && vite build`) succeeds.

- [ ] **Step 6: Commit**

```bash
git add scripts
git commit -m "test: WebKit stage cases for tracing, 说一句, the 8-tile board and 都不对" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`fit-shots/` and `dist/` are git-ignored build output.
