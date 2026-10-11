# Shorter, calmer lessons where "known" means he can produce it — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One ~15-minute lesson in which about a third of 练一练 is production (he reads a word aloud and the parent confirms the take), stars and Progress count what he can write or say on two separate days, multiple choice is more honest (6 options), and Truffle and rewards never interrupt a question.

**Architecture:** A `say` card kind and Say rung (`src/ladder/rungs.ts`) whose pass comes from the parent's verdicts, logged as review logs on the day of each take (`src/session/say.ts`). The plan picks the words to say (`plan.sayIds`); 练一练 puts them into the round (`withSay`) and the new `SayCard` records a take with the existing recorder. A finished lesson's stars come from `src/stats/produce.ts` + `src/session/stars.ts` (passes since the last starred lesson). The parent gets a Listen & confirm tab. Settings move to 15 minutes once (`lessonVersion` 6); the streak forgives one missed day a week.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, ts-fsrs 5, tsx scripts, playwright-core 1.52 WebKit for screenshots (`scripts/fit-check.ts`).

**Spec:** `docs/superpowers/specs/2026-10-11-ziji-lesson-shape-design.md` (read it in full before Task 1).

## Global Constraints

- Card kind and rung: `CardKind` gains `'say'`; `RungKind` gains `'say'`; `RUNGS` = `['hear', 'understand', 'read', 'use', 'say']`; `RUNG_CARD.say` = `'say'`; card id `${wordId}:say`.
- Say rung **passes** on two separate local days that each have a **parent-confirmed** take (`PASS_DAYS` = 2). An unreviewed take schedules the card like FSRS Good and does not count. A ✗ brings the card forward (due by the end of today) and does not count. Speech recognition is not used.
- Eligibility: a word whose Read rung (its `recognise` card) has passed. A Say card is created the first time the word is asked. Never asked Say in the lesson that introduced it.
- Can produce: a character or word whose `write` card has passed, or whose Say rung has passed. A 词语's Say pass counts for the 词语, not its characters. Worlds, town map and journey keep counting Read passes (nothing regresses).
- Multiple choice: **6 options** where at least 5 good distractors exist, otherwise 4. `fastLimit` stays.
- `DEFAULT_SETTINGS.sessionMinutes` = 15. `lessonVersion` 6 moves 30 → 15 only when the value is exactly 30.
- Budget: `PRACTICE_SHARE` unchanged (0.4 → a 6-minute 练一练 box at 15 min); `writeCharTarget(15)` = 5, and 5 for any length under 20; other lengths keep their values (20 → 6, 25 → 8, 30 → 9, 40+ → 10).
- Say cards: about one in three 练一练 items, at most **6 per lesson** (`SAY_PER_LESSON`). Order: due Say cards first, then eligible words with no Say card; his class's lesson (and the one before it) first, then the newest Read pass. `settings.sayCards` (absent = on, `false` = off).
- Truffle: neutral resting pose while a question is open — no peek, no mood change, no close-up until the answer is settled. Removed: the combo flame counter, the spoken 「连对N个」 and the combo sound.
- Stars = characters/words newly reaching "can produce" (write or say), minimum 1. Line: 「今天你会写 3 个新字，会说 2 个！」; nothing passed: 「还差一天：森、林」. Extra lesson stars → `bonusStars`. Chest once a day, for the first lesson. Costumes and powers keep using the star total.
- Streak forgives one missed day per calendar week (Mon–Sun), shown on the week strip as 休息日; a second missed day in that week breaks it.
- Second lesson: the existing 再学一课, same 15-minute plan, never the streak or the chest, offered softly on Home after the day's lesson (「想再学一课吗？」).
- Parent area: tab 「Listen & confirm」 with a badge (takes waiting); rows: word (+ pinyin), play his take, play the model, ✓ / ✗; oldest first; more than 60 waiting → only each word's newest waiting take is kept. Progress: 「会写 Can write」 and 「会说 Can say」 bars next to the reading bar (keep "reads (taps)"), same targets and class marker. Overview: a "takes to review" tile. Settings: a 「Say cards」 switch.
- Storage: `RecordingPrompt` gains `{ kind: 'say'; wordId: string }`; `Recording.review?: 'ok' | 'no'`. Reviewed takes older than 14 days are deleted, keeping each word's newest take. No migration of cards or logs; saved lessons load as they are.
- Microphone denied or unavailable: Say cards are skipped for that lesson.
- TypeScript lib is ES2022: no `Array.prototype.findLastIndex`/`toSorted`. `Array.prototype.at` is fine.
- Screenshots in **WebKit** via playwright-core (`scripts/fit-check.ts`). If WebKit is missing the script exits 2: stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Out of scope: 朗读 on its own, word families, why-feedback, pinyin fading, speech recognition, changes to the worlds or town map, a story switch.

## Rulings

- Ruling: `'say'` is in `RUNGS` and `RUNG_CARD`, but a pass never opens it and it opens nothing (`nextRung` walks only hear → understand → read → use), and `isOwned` checks those four — the spec says Say cards are made the first time a lesson asks the word and that the town/worlds must not regress, and `openMissingRungs` would otherwise make hundreds of Say cards from placement passes — cost if wrong: the parent's "Owned" count does not require Say.
- Ruling: the parent's ✓/✗ is the review log (`kind: 'say'`, `correct` = ✓, `rating` Good/Again, `at` = the take's `createdAt`); recording a take writes no log — only confirmed days may count, and logging on the take's day makes "two separate local days" the days he spoke — cost if wrong: none for the pass rule; Say logs are left out of the Skills panel (they are the parent's verdicts, not his answers).
- Ruling: a Say pass is dated when the parent confirms the take that completes it (`passed = now`), not the take's time — stars count what became known since the last starred lesson, and a pass dated in the past would be missed — cost if wrong: the Progress "week by week" trend (reading only) is unaffected; nothing else reads the date.
- Ruling: a lesson's stars count passes in (`KidState.starredUpTo`, now], where `starredUpTo` is absent before the first such lesson (then: the start of the lesson's local day) and is set to the finishing time by every finished non-free lesson — so a take confirmed after the evening lesson stars in the next lesson, and an extra lesson never re-counts the day's — cost if wrong: a confirmation made after the day's last lesson shows in tomorrow's stars, not tonight's.
- Ruling: `createSessionRecord` sets `stars: 0`, and `settleLessonStars` sets the real stars, `produced` and `closest` when the lesson finishes; `totalStars` uses `stars` when it is a number, else the old step stars (`starsOf`, and the pre-2026-10-05 rule) — lessons saved before the change keep their stars and a lesson in progress counts nothing until it ends — cost if wrong: test fixtures that build finished lessons with `createSessionRecord` must say their `stars` (three tests updated in Task 8).
- Ruling: ✗ brings the Say card to be due by the end of today (`bringForward(…, endOfLocalDay(now))`, which never pushes a card later) — "today or tomorrow": the next lesson, an extra one today or tomorrow's — cost if wrong: none.
- Ruling: `plan.sayIds` holds up to 6 words — due Say cards (by due time), then Read-passed words with no Say card, his class's lesson or the one before it first (`bookLesson`, the same school lane as new words), then the newest Read pass, then `newWordOrder`; 练一练 inserts `k = min(6, sayIds, floor(items / 2))` Say items (so about a third of the round), spread like 钓鱼, never beside the same word or another Say card; Say items are never `due` for pacing — the spec says "about one in three", "at most 6" and "same spacing rules" — cost if wrong: a short round has fewer Say cards.
- Ruling: Say items are planned only when `recordingSupported()`; a microphone refused at the first tap ends that card and drops every later Say card of the lesson (`skipSayItems`), silently — the spec says Say cards are skipped for that lesson and the Overview already warns about a blocked microphone — cost if wrong: he sees no note on the card.
- Ruling: on a re-record only the second take is kept; the model plays after each take; the card never shows pinyin, even after — spec §3 "one re-record", "no pinyin" — cost if wrong: one more take for the parent to hear.
- Ruling: six options apply to FlashcardStep's tap questions (pinyin, find the character, 组词 gap, English meaning — also when 练一练 asks them). "Good" distractors: for "find the character", look-alikes that share a part, at most two levels above and of a different sound (measured: 2933 of 3005 built-in characters have ≥ 5, e.g. 飞 has none and keeps 4); for the others, what the existing picker offers when asked for 5 (measured on the built-in pool: all 3005 characters and 2565 ladder 词语 get 5); a class sentence's own wrong options (`cue.wrong`) and the other question types (sentences, 成语, 搭配, pairs, 钓鱼, Understand) keep their counts; six lay out three across — cost if wrong: a parent's tiny list falls back to 4 more often.
- Ruling: `migrateSettings` runs the earlier steps first, so an install from before v2 on the old 20-minute default goes 20 → 30 → 15 — 30 was the default it had been moved to — cost if wrong: such an install gets 15 instead of 30.
- Ruling: every question component shows Truffle `'neutral'` while its question is open; the `resting` prop is removed from the ten components that only used it then (`UseQuestion`, `ChooseStep`, `WrapupStep`, `ComponentsStep`, `BuildSentence`, `IdiomQuestion`, `MatchQuestion`, `PairGame`, `UnderstandQuestion`, `WritingStep`); `FlashcardStep` keeps it for after the answer; the peek on a missed word is removed (it only ever played on an open question); the combo count stays for his three-in-a-row hearts, which play at the feedback moment — cost if wrong: none for the child.
- Ruling: a rest day does not add to the count; a missed Sunday and Monday are each their own week's rest day; a missed day only becomes a rest day when a finished day comes before it — "one missed day per calendar week" read literally — cost if wrong: a streak survives two days off across a weekend boundary.
- Ruling: on the week strip the rest day's label reads 「休」 (title and the strip's label say 休息日) and its dot is dashed — the full word under a 16–20 px dot does not fit the iPhone SE strip — cost if wrong: a CSS change.
- Ruling: the 「会说 Can say」 bar counts single characters whose Say passed against the reading list (认读) with the reading marker; a counts row "Characters he can say" is added — saying a character aloud is reading it, and the spec asks for the same targets and marker — cost if wrong: the bar's target.
- Ruling: takes are tidied (14-day rule and the 60 cap) each time a take is saved, by the take's `createdAt`; takes also show in the Recordings tab with their word and state — cost if wrong: a queue over 60 shrinks at the next take, not the moment it passes 60.
- Ruling: the line with only Say passes reads 「今天你会说 N 个新字！」; "closest" names up to 3 words, most recent qualifying day first — the spec gives one example only — cost if wrong: wording.
- Ruling: once the day's lesson is done Truffle's Home bubble asks 「想再学一课吗？」 and 再学一课 becomes the quiet (secondary) button — "offered softly"; measured in WebKit, the question on the done card itself (a line, or the button's words) wraps the card on the iPhone SE and iPhone Safari sizes and Truffle's bubble then overlaps 今日一字 — cost if wrong: the question is only as visible as his bubble.
- Ruling: WebKit gains a `say` flow (practice only, with the pretend microphone already in `fit-check.ts`): every Say screen is fit-checked, each must reach its 听一听 state (recording worked) and leave a Say card; the review queue is screenshotted by a new `listen` stage case with takes in memory, because Playwright's WebKit test contexts abort an IndexedDB `put` holding a `Blob` (measured), so a take recorded in the sweep can't be stored; six-option questions are fit-checked by the `say`, `practice` and `lesson` flows — cost if wrong: the take-to-queue path is covered by the jsdom tests (Tasks 4, 10), not by WebKit.

## Review Focus

1. The iPad refuses the microphone at the first Say card of a lesson: that card and every later Say card are dropped and 练一练 carries on with taps; nothing is saved — test in Task 4 (`a refused microphone drops the rest of the lesson's Say cards`).
2. The parent confirms takes in the evening after the day's lesson, and he does 再学一课 the same day: tonight's confirmation stars in the next lesson, the extra lesson counts only what passed since the day's lesson, and nothing counts twice — tests in Task 8 (`settleLessonStars`).
3. An iPad updated mid-day: a lesson saved before the update resumes with no Say cards and its stars counted the old way, and stored settings move 30 → 15 once (20 → 15 for the oldest installs) while a parent's later 30 stays — tests in Task 3 (`a plan saved before Say cards`), Task 8 (`a lesson finished before mastery stars`) and Task 5 (`applySettingsMigration`).
4. The parent deletes a word that still has takes waiting: its takes can still be reviewed without a Say card, and nothing breaks — test in Task 2 (`a take of a word since deleted`).
5. Double taps: ✓ twice on a take, or 继续 twice on a Say card, review once and keep one take — tests in Task 2 (`a second tap on a reviewed take changes nothing`) and Task 4 (`he records; the model plays right after; 继续 hands over the take`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/types.ts` | `CardKind` 'say', `RecordingPrompt` 'say', `Recording.review`, `SessionPlan.sayIds`, `Settings.sayCards`, `SessionRecord.stars/produced/closest`, `KidState.starredUpTo`, default 15 min, `lessonVersion` 6 | 1, 2, 3, 5, 8 |
| `src/ladder/rungs.ts` | Say rung, `passDays`, `sayDays`, `sayPassed`; Say off the ladder | 1 |
| `src/stats/skills.ts` | Say verdicts left out of skills | 1 |
| `src/session/say.ts` (new) | takes: record, review, tidy, waiting queue | 2 |
| `src/store/repo.ts` | `getRecording`; deleting a word deletes its Say card | 2 |
| `src/parent/RecordingsPanel.tsx` | a Say take's row | 2 |
| `src/session/plan.ts`, `src/session/practice.ts`, `src/session/round.ts`, `src/session/runner.ts` | `sayIds`, `withSay`, `Ask`/`Grades` 'say', `skipSayItems`, `stars: 0` | 3, 8 |
| `src/activities/say/SayCard.tsx` (new) | the Say card | 4 |
| `src/app/SessionScreen.tsx` | Say cards in the lesson; no combo; stars at the end | 4, 7, 8 |
| `src/store/settings.ts`, `src/session/writing.ts` | v6 migration; `writeCharTarget` | 5 |
| `src/activities/flashcards/distractors.ts`, `FlashcardStep.tsx` | six options | 6, 7 |
| `src/activities/{choose,components,practice,writing}/*.tsx`, `src/fun/pet.ts`, `src/audio/sfx.ts`, `scripts/stage-cases/page.tsx` | Truffle neutral while open; combo praise and sound gone | 7 |
| `src/stats/produce.ts` (new), `src/session/stars.ts` (new), `src/stats/stats.ts`, `src/app/Celebration.tsx` | can produce, stars, the line | 8 |
| `src/stats/stats.ts`, `src/app/WeekStrip.tsx` | rest-day streak, 休 on the strip | 9 |
| `src/parent/ListenPanel.tsx` (new), `ParentArea.tsx`, `Dashboard.tsx`, `SettingsPanel.tsx`, `ProgressPanel.tsx` | parent area | 10 |
| `src/app/HomeScreen.tsx` | Truffle asks 想再学一课吗？; the quiet 再学一课 | 11 |
| `src/styles.css` | Say card, six options, rest day, progress bar labels, badge; old combo pill removed | 4, 6, 7, 9, 10 |
| `scripts/fit-check.ts`, `scripts/stage-cases.ts`, `scripts/stage-cases/page.tsx` | WebKit `say` flow; the review queue's stage case (and `resting` dropped from the stage cases in 7) | 7, 12 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (about 1800 tests; under heavy machine load a few slow rendered tests can time out — rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts too. Before Task 1: `ls node_modules/.bin/vitest` (wait for `npm ci` if it is missing).

---

### Task 1: The Say rung (pure)

**Files:**
- Modify: `src/types.ts` (`CardKind`, line 70)
- Modify: `src/ladder/rungs.ts` (whole module's rung section, lines 1–57)
- Modify: `src/stats/skills.ts:8-14`
- Test: `src/ladder/rungs.test.ts`, `src/stats/skills.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CardKind` includes `'say'`; `RungKind = 'hear' | 'understand' | 'read' | 'use' | 'say'`; `RUNGS`; `RUNG_CARD.say === 'say'`; `passDays(logs: ReviewLog[], cardId: string, fastMs: number): number[]` (times of the qualifying days' first answers, oldest first); `passedAt` unchanged in behaviour; `sayDays(logs: ReviewLog[], cardId: string): string[]` (local `YYYY-MM-DD` days with a confirmed take, oldest first); `sayPassed(logs: ReviewLog[], cardId: string): boolean`; `canAskRung(word, 'say') === true`; `nextRung(word, r)` never returns `'say'` and returns `null` for `'say'`; `isOwned` ignores `'say'`.

- [ ] **Step 1: Write the failing tests**

In `src/ladder/rungs.test.ts`, change the import line to:

```ts
import { canAskRung, RUNGS, FAST_FLOOR_MS, fastLimit, isOwned, nextRung, passDays, passedAt, RUNG_CARD, rungOf, sayDays, sayPassed } from './rungs';
```

Change the first expectation of `'Read is the reading card and Use the meaning card, so his progress carries over'` to:

```ts
    expect(RUNG_CARD).toEqual({ hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say' });
```

Replace the test `'the rungs go hear, understand, read, use'` with:

```ts
  it('the rungs go hear, understand, read, use, then say (spec 2026-10-11 §3)', () => {
    expect(RUNGS).toEqual(['hear', 'understand', 'read', 'use', 'say']);
  });
```

Append to the end of `src/ladder/rungs.test.ts`:

```ts
describe('the Say rung (spec 2026-10-11 §3)', () => {
  const take = (date: string, hour: number, ok: boolean, cardId = 'b:门:say'): ReviewLog =>
    ({ cardId, wordId: 'b:门', kind: 'say', at: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(), rating: ok ? 3 : 1, correct: ok });
  it('passes on two separate days that each have a confirmed take', () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-02', 18, true)], 'b:门:say')).toBe(true);
    expect(sayDays([take('2026-10-02', 18, true), take('2026-10-01', 9, true)], 'b:门:say')).toEqual(['2026-10-01', '2026-10-02']);
  });
  it('two confirmed takes on one day are one day', () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-01', 19, true)], 'b:门:say')).toBe(false);
  });
  it('a rejected take does not count, and does not spoil a confirmed one the same day', () => {
    expect(sayPassed([take('2026-10-01', 9, false), take('2026-10-02', 9, true)], 'b:门:say')).toBe(false);
    expect(sayPassed([take('2026-10-01', 9, false), take('2026-10-01', 10, true), take('2026-10-02', 9, true)], 'b:门:say')).toBe(true);
  });
  it("another word's takes are not this word's", () => {
    expect(sayPassed([take('2026-10-01', 9, true), take('2026-10-02', 9, true, 'b:大:say')], 'b:门:say')).toBe(false);
  });
  it('a pass never opens Say, and Say opens nothing: its card is made when a lesson first asks it', () => {
    const w = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    expect(nextRung(w, 'use')).toBeNull();
    expect(nextRung(w, 'say')).toBeNull();
    expect(canAskRung(w, 'say')).toBe(true);
    expect(rungOf('say')).toBe('say');
  });
  it('owning a word is still its reading rungs: the town never dims for a word he has not said', () => {
    const w = makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    expect(isOwned(w, new Set(['hear', 'read', 'use']))).toBe(true);
  });
});

describe('passDays (the days a pass counts)', () => {
  it("each day's first answer when it was right and not too fast, oldest first", () => {
    const logs = [log('2026-10-02', 9, true), log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-03', 9, true, 100)];
    expect(passDays(logs, 'b:门:hear', FAST_FLOOR_MS)).toEqual([new Date('2026-10-02T09:00:00').getTime()]);
  });
});
```

Append to the end of `src/stats/skills.test.ts`:

```ts
describe('the parent’s Say verdicts are not his answers (spec 2026-10-11 §6)', () => {
  it('a ✓ or ✗ on a take is in no skill row', () => {
    const say = (correct: boolean) => ({ cardId: 'a:say', wordId: 'a', kind: 'say' as const, at: 1, rating: 3 as const, correct });
    const acc = skillAccuracy([say(true), say(false), log('recognise', 'a', true)], []);
    expect(acc.reading).toEqual({ right: 1, total: 1 });
    expect(Object.values(acc).reduce((n, s) => n + s.total, 0)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ladder/rungs.test.ts src/stats/skills.test.ts`
Expected: FAIL — `passDays`/`sayDays`/`sayPassed` are not exported, `RUNGS` lacks `'say'`, and the skills test throws reading `LOG_SKILL['say']`.

- [ ] **Step 3: Implement**

In `src/types.ts` replace

```ts
export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand'; // meaning: what the word means and how it's used (spec §19)
```

with

```ts
export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand' | 'say'; // meaning: what the word means and how it's used (spec §19); say: he reads it aloud (spec 2026-10-11 §3)
```

In `src/ladder/rungs.ts`:

Replace the two header comment lines with:

```ts
// The word ladder's rungs (spec 2026-10-06 §3.2): heard, understood in a sentence, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
// Say (spec 2026-10-11 §3): he reads the word aloud and the parent confirms the take; it passes on two days with a confirmed take.
```

Replace

```ts
export type RungKind = 'hear' | 'understand' | 'read' | 'use';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning' };
```

with

```ts
export type RungKind = 'hear' | 'understand' | 'read' | 'use' | 'say';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use', 'say'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say' };
/** The rungs a pass opens one after another. Say is not one of them: a lesson asks it once Read has passed, and its card is made
 *  then (spec 2026-10-11 §3); owning a word (the town's full light) still means these four, so nothing he has lights less. */
const LADDER: RungKind[] = ['hear', 'understand', 'read', 'use'];
```

Replace the whole `passedAt` function (with its doc comment) with:

```ts
/** The days that count toward a pass, oldest first: each day whose first answer was right and not too fast (its time). */
export function passDays(logs: ReviewLog[], cardId: string, fastMs: number): number[] {
  const firsts = new Map<string, ReviewLog>();
  for (const l of logs.filter((x) => x.cardId === cardId).sort((a, b) => a.at - b.at)) {
    const day = localDateKey(new Date(l.at));
    if (!firsts.has(day)) firsts.set(day, l);
  }
  return [...firsts.values()].filter((l) => l.correct && !(typeof l.responseMs === 'number' && l.responseMs < fastMs)).map((l) => l.at);
}

/** When the card passed: the answer that made the second day whose first answer was right and not too fast; else null. */
export function passedAt(logs: ReviewLog[], cardId: string, fastMs: number): number | null {
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
```

Replace

```ts
/** Whether a rung can be asked of this word: hearing needs its English (he picks the meaning), using a question to use it in; reading always. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'hear') return !!cardMeaning(word);
```

with

```ts
/** Whether a rung can be asked of this word: hearing needs its English (he picks the meaning), using a question to use it in; reading and saying always. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'say') return true;
  if (rung === 'hear') return !!cardMeaning(word);
```

Replace

```ts
export function nextRung(word: Word, rung: RungKind): RungKind | null {
  return RUNGS.slice(RUNGS.indexOf(rung) + 1).find((r) => canAskRung(word, r)) ?? null;
}

export function isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean {
  return RUNGS.every((r) => !canAskRung(word, r) || passed.has(r));
}
```

with

```ts
export function nextRung(word: Word, rung: RungKind): RungKind | null {
  if (!LADDER.includes(rung)) return null;
  return LADDER.slice(LADDER.indexOf(rung) + 1).find((r) => canAskRung(word, r)) ?? null;
}

/** Every reading rung it can be asked has passed (Say is counted on its own: can produce, spec 2026-10-11 §3). */
export function isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean {
  return LADDER.every((r) => !canAskRung(word, r) || passed.has(r));
}
```

In `src/stats/skills.ts` replace

```ts
const LOG_SKILL: Record<CardKind, Skill> = { hear: 'listening', understand: 'listening', recognise: 'reading', meaning: 'meaning', write: 'writing' };
```

with

```ts
/** Say verdicts are the parent's, not his answers: Listen & confirm and Progress show them (spec 2026-10-11 §6). */
const LOG_SKILL: Record<Exclude<CardKind, 'say'>, Skill> = { hear: 'listening', understand: 'listening', recognise: 'reading', meaning: 'meaning', write: 'writing' };
```

and in `outcomes` replace

```ts
    ...logs.filter((l) => l.source !== 'use').map((l) => ({ skill: LOG_SKILL[l.kind], wordId: l.wordId, correct: l.correct })), // a 选一选 rating is in the answer log already
```

with

```ts
    ...logs.filter((l) => l.source !== 'use' && l.kind !== 'say').map((l) => ({ skill: LOG_SKILL[l.kind as Exclude<CardKind, 'say'>], wordId: l.wordId, correct: l.correct })), // a 选一选 rating is in the answer log already
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/ladder src/stats && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/ladder/rungs.ts src/ladder/rungs.test.ts src/stats/skills.ts src/stats/skills.test.ts
git commit -m "feat: Say rung — passes on two days with a parent-confirmed take; off the reading ladder"
```

---

### Task 2: Takes — record, review, tidy

**Files:**
- Modify: `src/types.ts` (`RecordingPrompt`, `Recording`, lines 177–194)
- Modify: `src/store/repo.ts` (`deleteWord`, `deleteRecording`)
- Create: `src/session/say.ts`
- Modify: `src/parent/RecordingsPanel.tsx` (imports, `describe`, `RecordingsPanel` state and reload)
- Test: `src/session/say.test.ts` (new), `src/parent/storyRecordings.test.tsx`

**Interfaces:**
- Consumes: `sayPassed` (Task 1); `bringForward(db, wordId, kind, due)` from `src/session/record.ts`; `keepRecording`, `listRecordings`, `deleteRecording`, `updateRecording`, `logsForCard`, `getCard`, `putCards`, `addReviewLog` from `src/store/repo.ts`; `newCard`, `review` from `src/srs/scheduler.ts`.
- Produces: `RecordingPrompt` member `{ kind: 'say'; wordId: string }`; `Recording.review?: 'ok' | 'no'`; `getRecording(db: AppDb, id: string): Promise<Recording | undefined>`; in `src/session/say.ts`: `REVIEWED_KEEP_DAYS = 14`, `WAITING_CAP = 60`, `takeWord(r: Recording): string | null`, `waitingTakes(recs: Recording[]): Recording[]` (oldest first), `takesToDrop(recs: Recording[], now: Date): string[]`, `recordSayTake(db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord>`, `reviewTake(db: AppDb, recordingId: string, verdict: 'ok' | 'no', now: Date): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `src/session/say.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { newCard, review } from '../srs/scheduler';
import { freshDb, makeCard } from '../test/fixtures';
import { addRecording, getCard, getRecording, listRecordings, logsSince, putCards } from '../store/repo';
import { endOfLocalDay } from '../lib/date';
import type { Recording } from '../types';
import { recordSayTake, reviewTake, takesToDrop, waitingTakes } from './say';

const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 };
const day = (d: number, h = 18) => new Date(2026, 9, d, h);
const rec = (id: string, wordId: string, at: Date, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at.getTime(), prompt: { kind: 'say', wordId }, ...take, ...(review ? { review } : {}) });

describe('a take (spec 2026-10-11 §3)', () => {
  it('is kept for the parent, and makes his Say card the first time, scheduled like a right answer', async () => {
    const db = await freshDb();
    const card = await recordSayTake(db, 'b:森', take, day(1));
    expect(card.id).toBe('b:森:say');
    expect(card.fsrs.due).toEqual(review(newCard(day(1)), Rating.Good, day(1)).due);
    expect(card.passed).toBeUndefined();
    const [saved] = await listRecordings(db);
    expect(saved!.prompt).toEqual({ kind: 'say', wordId: 'b:森' });
    expect(saved!.review).toBeUndefined();
    expect(await logsSince(db, 0)).toEqual([]); // an unreviewed take never counts toward the pass
  });
  it('a take on a card that has passed keeps the pass', async () => {
    const db = await freshDb();
    await putCards(db, [{ ...makeCard('b:森', 'say', day(1)), passed: 5 }]);
    expect((await recordSayTake(db, 'b:森', take, day(3))).passed).toBe(5);
  });
});

describe("the parent's verdict (spec 2026-10-11 §3)", () => {
  it('passes on two separate days that each have a confirmed take, dated when the parent confirmed it', async () => {
    const db = await freshDb();
    await recordSayTake(db, 'b:森', take, day(1));
    await recordSayTake(db, 'b:森', take, day(2));
    const [second, first] = await listRecordings(db); // newest first
    await reviewTake(db, first!.id, 'ok', day(2, 20));
    expect((await getCard(db, 'b:森:say'))!.passed).toBeUndefined(); // one day is not enough
    await reviewTake(db, second!.id, 'ok', day(3, 8));
    expect((await getCard(db, 'b:森:say'))!.passed).toBe(day(3, 8).getTime());
    expect((await logsSince(db, 0)).map((l) => [l.kind, l.correct, l.at])).toEqual([['say', true, day(1).getTime()], ['say', true, day(2).getTime()]]);
  });
  it('two confirmed takes on one day do not pass', async () => {
    const db = await freshDb();
    await recordSayTake(db, 'b:森', take, day(1, 9));
    await recordSayTake(db, 'b:森', take, day(1, 19));
    for (const r of await listRecordings(db)) await reviewTake(db, r.id, 'ok', day(2));
    expect((await getCard(db, 'b:森:say'))!.passed).toBeUndefined();
  });
  it('✗ brings the card forward to be due today, and does not count', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:森', 'say', day(9))]);
    await addRecording(db, rec('t1', 'b:森', day(1)));
    await reviewTake(db, 't1', 'no', day(2, 7));
    expect((await getCard(db, 'b:森:say'))!.fsrs.due).toEqual(endOfLocalDay(day(2, 7)));
    expect((await getRecording(db, 't1'))!.review).toBe('no');
    expect((await logsSince(db, 0)).map((l) => [l.correct, l.rating])).toEqual([[false, Rating.Again]]);
  });
  it('a take of a word since deleted (no Say card) is still reviewed, and nothing breaks', async () => {
    const db = await freshDb();
    await addRecording(db, rec('t1', 'p:gone', day(1)));
    await reviewTake(db, 't1', 'ok', day(2));
    await addRecording(db, rec('t2', 'p:gone', day(2)));
    await reviewTake(db, 't2', 'no', day(3));
    expect((await listRecordings(db)).map((r) => r.review)).toEqual(['no', 'ok']);
    expect(await getCard(db, 'p:gone:say')).toBeUndefined();
  });
  it('a second tap on a reviewed take changes nothing', async () => {
    const db = await freshDb();
    await addRecording(db, rec('t1', 'b:森', day(1)));
    await reviewTake(db, 't1', 'ok', day(2));
    await reviewTake(db, 't1', 'no', day(2));
    expect((await getRecording(db, 't1'))!.review).toBe('ok');
    expect(await logsSince(db, 0)).toHaveLength(1);
  });
});

describe('keeping takes tidy (spec 2026-10-11 §6, §7)', () => {
  it('the queue is the waiting takes, oldest first, and no other recordings', () => {
    const recs = [rec('b', 'b:林', day(2)), rec('a', 'b:森', day(1)), rec('c', 'b:森', day(3), 'ok'), { ...rec('p', 'x', day(1)), prompt: { kind: 'intro' as const } }];
    expect(waitingTakes(recs).map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('reviewed takes older than 14 days go, but each word keeps its newest take', () => {
    const recs = [rec('old', 'b:森', day(1), 'ok'), rec('newest', 'b:森', day(2), 'no'), rec('only', 'b:林', day(1), 'ok'), rec('waiting', 'b:木', day(1))];
    expect(takesToDrop(recs, day(20))).toEqual(['old']);
    expect(takesToDrop(recs, day(14))).toEqual([]); // not yet 14 days
  });
  it('past 60 waiting, only each word’s newest waiting take stays', () => {
    const recs = Array.from({ length: 61 }, (_, i) => rec(`t${i}`, i < 31 ? 'b:森' : `b:${i}`, new Date(day(1).getTime() + i * 60_000)));
    const drop = takesToDrop(recs, day(2));
    expect(drop).toHaveLength(30);
    expect(drop).not.toContain('t30'); // 森's newest
    expect(takesToDrop(recs.slice(0, 60), day(2))).toEqual([]); // 60 waiting: all kept
  });
  it('a new take tidies the store', async () => {
    const db = await freshDb();
    await addRecording(db, rec('old', 'b:森', day(1), 'ok'));
    await recordSayTake(db, 'b:森', take, day(20));
    expect((await listRecordings(db)).map((r) => r.id)).not.toContain('old');
  });
});
```

Append to the end of `src/parent/storyRecordings.test.tsx`:

```ts
describe('Say takes in Recordings (spec 2026-10-11 §7)', () => {
  it('shows the word and whether the parent has listened yet', async () => {
    const app = await makeAppData();
    const { putWords } = await import('../store/repo');
    const { makeWord } = await import('../test/fixtures');
    await putWords(app.db, [makeWord('森')]);
    await addRecording(app.db, r('s1', base, { kind: 'say', wordId: 'b:森' }));
    await addRecording(app.db, { ...r('s2', base + 1, { kind: 'say', wordId: 'b:森' }), review: 'ok' });
    renderWithApp(<RecordingsPanel />, app);
    expect(await screen.findByText('🗣️ Say: 森 (waiting)')).toBeTruthy();
    expect(screen.getByText('🗣️ Say: 森 ✓')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/session/say.test.ts src/parent/storyRecordings.test.tsx`
Expected: FAIL — `./say` does not exist; the Recordings row shows `📖 (deleted text)`.

- [ ] **Step 3: Implement**

In `src/types.ts` replace

```ts
  | { kind: 'answer'; sceneId: string; question: number }; // Truffle asks
```

with

```ts
  | { kind: 'answer'; sceneId: string; question: number } // Truffle asks
  | { kind: 'say'; wordId: string }; // a Say card take: he read the word aloud (spec 2026-10-11 §3)
```

and replace

```ts
  extraDayGiven?: boolean; // its marks have given the passage its one extra day (never a second, however often re-marked)
}
```

with

```ts
  extraDayGiven?: boolean; // its marks have given the passage its one extra day (never a second, however often re-marked)
  review?: 'ok' | 'no'; // a Say take the parent confirmed (✓) or rejected (✗); absent: waiting (spec 2026-10-11 §6)
}
```

In `src/store/repo.ts`, in `deleteWord` replace

```ts
    tx.objectStore('cards').delete(`${id}:hear`),
    tx.done,
```

with

```ts
    tx.objectStore('cards').delete(`${id}:hear`),
    tx.objectStore('cards').delete(`${id}:say`),
    tx.done,
```

and replace

```ts
export const deleteRecording = (db: AppDb, id: string) => db.delete('recordings', id);
```

with

```ts
export const getRecording = (db: AppDb, id: string) => db.get('recordings', id);
export const deleteRecording = (db: AppDb, id: string) => db.delete('recordings', id);
```

Create `src/session/say.ts`:

```ts
// Say takes (spec 2026-10-11 §3, §6, §7): in 练一练 he reads a word aloud; the take is kept like the other recordings and the
// parent confirms (✓) or rejects (✗) it in Listen & confirm. Speech recognition is not used.
import { Rating } from 'ts-fsrs';
import type { FinishedRecording } from '../audio/recorder';
import { sayPassed } from '../ladder/rungs';
import { endOfLocalDay } from '../lib/date';
import { newId } from '../lib/id';
import { newCard, review } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { addReviewLog, deleteRecording, getCard, getRecording, keepRecording, listRecordings, logsForCard, putCards, updateRecording } from '../store/repo';
import type { CardRecord, Recording } from '../types';
import { bringForward } from './record';

/** Reviewed takes are kept this long (each word's newest take is always kept). */
export const REVIEWED_KEEP_DAYS = 14;
/** Past this many waiting takes, only each word's newest waiting take is kept. */
export const WAITING_CAP = 60;

/** The word a Say take is of; null for any other recording. */
export const takeWord = (r: Recording): string | null => (r.prompt.kind === 'say' ? r.prompt.wordId : null);

/** Takes waiting for the parent, oldest first. */
export function waitingTakes(recs: Recording[]): Recording[] {
  return recs.filter((r) => takeWord(r) !== null && !r.review).sort((a, b) => a.createdAt - b.createdAt);
}

/** The newest of each word's takes among `list`. */
function newestByWord(list: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of list) {
    const w = takeWord(r)!;
    const had = out.get(w);
    if (!had || r.createdAt > had.createdAt) out.set(w, r);
  }
  return out;
}

/**
 * The takes to delete (spec §6, §7): reviewed takes older than 14 days, except each word's newest take; and when more than 60
 * wait, every waiting take but each word's newest. Other recordings are never touched.
 */
export function takesToDrop(recs: Recording[], now: Date): string[] {
  const takes = recs.filter((r) => takeWord(r) !== null);
  const newest = newestByWord(takes);
  const cutoff = now.getTime() - REVIEWED_KEEP_DAYS * 86_400_000;
  const drop = new Set(takes.filter((r) => r.review && r.createdAt < cutoff && newest.get(takeWord(r)!) !== r).map((r) => r.id));
  const waiting = takes.filter((r) => !r.review);
  if (waiting.length > WAITING_CAP) {
    const keep = newestByWord(waiting);
    for (const r of waiting) if (keep.get(takeWord(r)!) !== r) drop.add(r.id);
  }
  return [...drop];
}

/**
 * He recorded a take: it is kept for the parent, and his Say card (made now if it is his first) is scheduled like a right
 * answer (FSRS Good). Nothing is logged: only the parent's verdict counts toward the pass. Old takes are tidied after.
 */
export async function recordSayTake(db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> {
  await keepRecording(db, { id: newId(), createdAt: now.getTime(), prompt: { kind: 'say', wordId }, ...take });
  const id = `${wordId}:say`;
  const had = await getCard(db, id);
  const card: CardRecord = { ...(had ?? {}), id, wordId, kind: 'say', fsrs: review(had?.fsrs ?? newCard(now), Rating.Good, now) }; // keeps its pass
  await putCards(db, [card]);
  for (const gone of takesToDrop(await listRecordings(db), now)) await deleteRecording(db, gone);
  return card;
}

/**
 * The parent's ✓ or ✗ on a take (spec §3): logged on the day he recorded it. ✓ passes the rung once two days have a confirmed
 * take (the pass is dated now, when it became known); ✗ brings his Say card forward to be due today. A take already
 * reviewed (a second tap) or gone is left alone.
 */
export async function reviewTake(db: AppDb, recordingId: string, verdict: 'ok' | 'no', now: Date): Promise<void> {
  const rec = await getRecording(db, recordingId);
  const wordId = rec ? takeWord(rec) : null;
  if (!rec || !wordId || rec.review) return;
  const ok = verdict === 'ok';
  const cardId = `${wordId}:say`;
  await updateRecording(db, { ...rec, review: verdict });
  await addReviewLog(db, { cardId, wordId, kind: 'say', at: rec.createdAt, rating: ok ? Rating.Good : Rating.Again, correct: ok });
  if (!ok) {
    await bringForward(db, wordId, 'say', endOfLocalDay(now));
    return;
  }
  const card = await getCard(db, cardId);
  if (card && !card.passed && sayPassed(await logsForCard(db, cardId), cardId)) await putCards(db, [{ ...card, passed: now.getTime() }]);
}
```

In `src/parent/RecordingsPanel.tsx`:

Replace

```ts
import { displayText } from '../langdu/phrases';
import { deleteRecording, listParentPassages, listRecordings } from '../store/repo';
```

with

```ts
import { displayText } from '../langdu/phrases';
import { findWord } from '../ladder/words';
import { takeWord } from '../session/say';
import { deleteRecording, listParentPassages, listRecordings } from '../store/repo';
```

Replace

```ts
const describe = ({ prompt }: Recording, texts: Texts) => {
  if (prompt.kind === 'picture') return '📷 Picture talk';
```

with

```ts
const VERDICT = { ok: ' ✓', no: ' ✗' } as const;

const describe = ({ prompt, review }: Recording, texts: Texts, said: Map<string, string>) => {
  if (prompt.kind === 'say') return `🗣️ Say: ${said.get(prompt.wordId) ?? '(deleted word)'}${review ? VERDICT[review] : ' (waiting)'}`;
  if (prompt.kind === 'picture') return '📷 Picture talk';
```

Replace

```ts
  const [parent, setParent] = useState<ParentPassage[]>([]);
  const [open, setOpen] = useState<string | null>(null);
```

with

```ts
  const [parent, setParent] = useState<ParentPassage[]>([]);
  const [said, setSaid] = useState<Map<string, string>>(new Map()); // the word each Say take is of
  const [open, setOpen] = useState<string | null>(null);
```

Replace

```ts
    const [r, p] = await Promise.all([listRecordings(db), listParentPassages(db)]);
    setRecs(r);
    setParent(p);
```

with

```ts
    const [r, p] = await Promise.all([listRecordings(db), listParentPassages(db)]);
    const ids = [...new Set(r.map(takeWord).filter((id): id is string => id !== null))];
    const found = await Promise.all(ids.map(async (id) => [id, (await findWord(db, id))?.text] as const));
    setSaid(new Map(found.filter((x): x is readonly [string, string] => !!x[1])));
    setRecs(r);
    setParent(p);
```

Replace `{describe(r, texts)}` with `{describe(r, texts, said)}`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/session/say.test.ts src/parent && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/store/repo.ts src/session/say.ts src/session/say.test.ts src/parent/RecordingsPanel.tsx src/parent/storyRecordings.test.tsx
git commit -m "feat: Say takes — kept for the parent, ✓/✗ logged on the take's day, tidied after 14 days and past 60 waiting"
```

---

### Task 3: Which words are said, and where they go in 练一练

**Files:**
- Modify: `src/types.ts` (`SessionPlan`, `Settings`)
- Modify: `src/session/round.ts` (`Ask`, `Grades`)
- Modify: `src/session/plan.ts` (imports, caps, `buildSessionPlan`)
- Modify: `src/session/practice.ts` (imports, `canAsk`, new `withSay`, `planPractice`)
- Modify: `src/session/runner.ts` (new `skipSayItems`)
- Test: `src/session/say.plan.test.ts` (new)

**Interfaces:**
- Consumes: `bookLesson(w)` from `src/session/lanes.ts`; `classLessonAt`; `introducedNewWords(rec)`.
- Produces: `SessionPlan.sayIds?: string[]`; `Settings.sayCards?: boolean`; `Ask` includes `'say'`; `Grades` includes `'say'`; `SAY_PER_LESSON = 6` (from `src/session/plan.ts`); `withSay(items: PracticeItem[], sayIds: string[]): PracticeItem[]`; `planPractice(rec, rungs, wordsById, pool, voice, rng, confusions = new Map(), level = 1, canSay = false): PracticeItem[]`; a Say item is `{ wordId, rung: 1, ask: 'say', grades: 'say', retry: false }`; `skipSayItems(rec: SessionRecord): SessionRecord`.

- [ ] **Step 1: Write the failing tests**

Create `src/session/say.plan.test.ts` (2026-10-02 with `grade: 2, gradeYear: 2026` puts his class on 二下·16, lesson index 34; 持 is taught there, 森 in 二上):

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type SessionPlan, type Settings } from '../types';
import { buildSessionPlan, SAY_PER_LESSON } from './plan';
import { planPractice, withSay } from './practice';
import type { PracticeItem } from './round';
import { createSessionRecord, skipSayItems, startPractice, finishStep } from './runner';

const words = builtinWords(0);
const id = (t: string) => words.find((w) => w.text === t)!.id;
const now = new Date(2026, 9, 2, 8, 0); // his class (P2) is on 二下·16: its lesson and 二下·15 are the school lane
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026, ...over });
const later = new Date(2026, 10, 1);
/** Read passed `daysAgo` days ago (the newest pass first, spec 2026-10-11 §4). */
const read = (t: string, daysAgo: number): CardRecord => ({ ...makeCard(id(t), 'recognise', later, true), passed: now.getTime() - daysAgo * 86_400_000 });

describe('which words are said (spec 2026-10-11 §4)', () => {
  it('due Say cards first, then words whose Read has passed and that have no Say card, the newest pass first', () => {
    const cards = [read('大', 5), read('人', 1), read('口', 3), read('山', 9), { ...makeCard(id('山'), 'say', new Date(2026, 9, 1)) }, { ...makeCard(id('口'), 'say', later) }];
    expect(buildSessionPlan({ cards, words, settings: settings({ grade: undefined }), now }).sayIds).toEqual([id('山'), id('人'), id('大')]); // 口's Say card isn't due
  });
  it("his class's lesson comes before a newer pass", () => {
    const cards = [read('森', 0), read('持', 7)]; // 持 is in 二下·16, 森 in 二上
    expect(buildSessionPlan({ cards, words, settings: settings(), now }).sayIds).toEqual([id('持'), id('森')]);
  });
  it('never a word whose Read has not passed, and at most 6', () => {
    const many = ['一', '二', '三', '四', '五', '六', '七', '八'].map((t, i) => read(t, i));
    const plan = buildSessionPlan({ cards: [...many, makeCard(id('九'), 'recognise', later)], words, settings: settings(), now });
    expect(plan.sayIds).toHaveLength(SAY_PER_LESSON);
    expect(plan.sayIds).not.toContain(id('九'));
  });
  it('none when the parent switches Say cards off', () => {
    expect(buildSessionPlan({ cards: [read('大', 1)], words, settings: settings({ sayCards: false }), now }).sayIds).toEqual([]);
  });
});

const q = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false });
const say = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

describe('Say cards in the round (spec 2026-10-11 §4)', () => {
  it('about one in three items, at most 6', () => {
    const count = (items: number, ids: number) => withSay(Array.from({ length: items }, (_, i) => q(`w${i}`)), say(ids)).filter((x) => x.ask === 'say').length;
    expect(count(12, 10)).toBe(6); // 6 of 18
    expect(count(6, 10)).toBe(3); // 3 of 9
    expect(count(20, 10)).toBe(6); // the cap
    expect(count(1, 10)).toBe(0);
    expect(count(9, 2)).toBe(2);
  });
  it('spread through the round, never beside the same word, and graded by nobody in the lesson', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(q);
    const out = withSay(items, ['c', 'f', 'z']);
    const at = out.flatMap((x, i) => (x.ask === 'say' ? [i] : []));
    expect(at).toHaveLength(3);
    expect(at.some((i, k) => k > 0 && i === at[k - 1]! + 1)).toBe(false);
    for (const i of at) expect([out[i - 1]?.wordId, out[i + 1]?.wordId]).not.toContain(out[i]!.wordId);
    expect(out.filter((x) => x.ask === 'say').every((x) => x.grades === 'say' && !x.retry)).toBe(true);
  });
  const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [id('河'), id('他'), id('山'), id('火')], newWordIds: [id('大')], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, sayIds: [id('大'), id('人'), id('口')], ...over });
  const byId = new Map(words.map((w) => [w.id, w]));
  const round = (p: SessionPlan, canSay: boolean) => planPractice({ ...createSessionRecord(p, '2026-10-02', 0), flashIndex: 1 }, new Map(), byId, words, false, mulberry32(1), new Map(), 1, canSay);
  it('never a word introduced in the same lesson', () => {
    const said = round(plan(), true).filter((x) => x.ask === 'say').map((x) => x.wordId);
    expect(said).toEqual([id('人'), id('口')]);
  });
  it('none when the iPad cannot record, and none from a plan saved before Say cards', () => {
    expect(round(plan(), false).some((x) => x.ask === 'say')).toBe(false);
    expect(round(plan({ sayIds: undefined }), true).some((x) => x.ask === 'say')).toBe(false);
  });
});

describe('a blocked microphone (spec 2026-10-11 §7)', () => {
  const rec = (queue: PracticeItem[], index: number) => ({ ...startPractice(finishStep(createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0 }, 'd', 0)), queue), practiceIndex: index });
  const sayItem = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'say', grades: 'say', retry: false });
  it('drops this Say card and every later one; what came before stays', () => {
    const next = skipSayItems(rec([sayItem('a'), q('b'), sayItem('c'), q('d'), sayItem('e')], 2));
    expect(next.practiceQueue!.map((x) => `${x.ask}:${x.wordId}`)).toEqual(['say:a', 'read:b', 'read:d']);
    expect(next.practiceIndex).toBe(2);
  });
  it('ends 练一练 when only Say cards were left', () => {
    const next = skipSayItems(rec([q('a'), sayItem('b')], 1));
    expect(next.completedSteps).toEqual(['newwords', 'practice']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/session/say.plan.test.ts`
Expected: FAIL — `SAY_PER_LESSON`, `withSay` and `skipSayItems` are not exported.

- [ ] **Step 3: Implement**

In `src/types.ts`, in `SessionPlan` after the `newWordMeaningIds` line add:

```ts
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
```

and in `Settings` after the `storyOn` line add:

```ts
  sayCards?: boolean; // Say cards in 练一练 (spec 2026-10-11 §4): on unless false
```

In `src/session/round.ts`: in the `Ask` doc comment replace ` *  fish: 钓鱼 for a look-alike he confused (not a rung). */` with ` *  fish: 钓鱼 for a look-alike he confused (not a rung) · say: he reads the word aloud (the Say rung, spec 2026-10-11 §3). */`; append `| 'say'` to the `Ask` union (after `'fish'`) and to the `Grades` union (after `'understand'`):

```ts
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say';
```

```ts
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | 'understand' | 'say' | null;
```

In `src/session/plan.ts`: change `import { pickNewWords } from './lanes';` to `import { bookLesson, pickNewWords } from './lanes';`; after `export const UNDERSTAND_REVIEW_CAP = 30;` add:

```ts
/** Say cards in one lesson at most (spec 2026-10-11 §4). */
export const SAY_PER_LESSON = 6;
```

Replace

```ts
  const writeItems = orderWriteItems(writeUnits);

  return {
```

with

```ts
  const writeItems = orderWriteItems(writeUnits);
  // Say (spec 2026-10-11 §4): due Say cards first, then words whose Read has passed and that have no Say card yet — his class's
  // lesson (and the one before it) first, then the newest Read pass. Never a word introduced today. Off with settings.sayCards.
  const say = ofKind('say');
  const hasSay = new Set(say.map((c) => c.wordId));
  const readAt = new Map(recognise.filter((c) => c.passed).map((c) => [c.wordId, c.passed!]));
  const today = new Set(newWords.map((w) => w.id));
  const inClass = (w: Word) => { const at = classAt === null ? undefined : bookLesson(w); return at !== undefined && (at === classAt || at === classAt! - 1); };
  const sayIds = settings.sayCards === false ? [] : [
    ...dueOf(say).map((c) => c.wordId),
    ...active
      .filter((w) => readPassed.has(w.id) && !hasSay.has(w.id) && !today.has(w.id))
      .sort((a, b) => Number(inClass(b)) - Number(inClass(a)) || readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].slice(0, SAY_PER_LESSON);

  return {
```

and at the end of the returned object replace

```ts
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
  };
}
```

with

```ts
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
    sayIds,
  };
}
```

In `src/session/practice.ts`: after `import { introducedNewWords } from './runner';` add `import { SAY_PER_LESSON } from './plan';`. In `canAsk`, after the `case 'fish':` line add:

```ts
    case 'say': return false; // a Say card is added from the plan's sayIds (withSay), never asked from the ladder
```

Replace the `planPractice` signature line

```ts
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1): PracticeItem[] {
```

with

```ts
/**
 * Puts the Say cards into the round (spec 2026-10-11 §4): about one in three of all its items, at most 6, spread out (a k-th of
 * the way in, like 钓鱼), never beside the same word or another Say card. A Say card grades nothing in the lesson: the parent
 * confirms the take.
 */
export function withSay(items: PracticeItem[], sayIds: string[]): PracticeItem[] {
  const k = Math.min(SAY_PER_LESSON, sayIds.length, Math.floor(items.length / 2));
  const out = [...items];
  sayIds.slice(0, k).forEach((wordId, j) => {
    let at = Math.round((out.length * (j + 1)) / (k + 1));
    const crowded = (x: PracticeItem | undefined) => !!x && (x.wordId === wordId || x.ask === 'say');
    while (at < out.length && (crowded(out[at - 1]) || crowded(out[at]))) at++;
    out.splice(at, 0, { wordId, rung: 1, ask: 'say', grades: 'say', retry: false });
  });
  return out;
}

/** `canSay`: the iPad can record (no microphone or MediaRecorder: no Say cards this lesson, spec 2026-10-11 §7). */
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false): PracticeItem[] {
```

and replace its last line `  return withFish(round, fish);` with:

```ts
  // never a word met today: it is said on another day (spec 2026-10-11 §4)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  return withSay(withFish(round, fish), say);
```

In `src/session/runner.ts`, before `export function skipPracticeItem` add:

```ts
/** The microphone is blocked: this Say card and every later one are dropped for the rest of the lesson (spec 2026-10-11 §7). */
export function skipSayItems(rec: SessionRecord): SessionRecord {
  if (currentStep(rec) !== 'practice') return rec;
  const index = rec.practiceIndex ?? 0;
  const queue = rec.practiceQueue ?? [];
  const next: SessionRecord = { ...rec, practiceQueue: [...queue.slice(0, index), ...queue.slice(index).filter((x) => x.ask !== 'say')] };
  return index >= next.practiceQueue!.length ? finishStep(next) : next;
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/session && npx tsc --noEmit`
Expected: PASS (the whole session folder: the round and plan tests are unchanged), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/session/round.ts src/session/plan.ts src/session/practice.ts src/session/runner.ts src/session/say.plan.test.ts
git commit -m "feat: plan up to 6 words to say and put them in 练一练, about one in three, never the day a word is met"
```

---

### Task 4: The Say card in the lesson

**Files:**
- Create: `src/activities/say/SayCard.tsx`
- Modify: `src/app/SessionScreen.tsx` (imports; the 练一练 planning effect; a new `onSayDone`; the practice render)
- Modify: `src/styles.css` (append)
- Test: `src/activities/say/SayCard.test.tsx` (new), `src/app/sayLesson.test.tsx` (new)

**Interfaces:**
- Consumes: `useRecorder`, `MicButton` (`src/activities/shared/recording.tsx`); `recordingSupported`, `FinishedRecording` (`src/audio/recorder.ts`); `speak` (`src/audio/speech.ts`); `recordSayTake` (Task 2); `planPractice(…, canSay)`, `skipSayItems` (Task 3).
- Produces: `SayResult = { take: FinishedRecording; elapsedMs: number }`; `SayCard({ word: Word; kid: KidState; onDone: (r: SayResult | null) => void })` — `null` when the microphone is blocked or missing. CSS classes `.say`, `.say__after`.

- [ ] **Step 1: Write the failing tests**

Create `src/activities/say/SayCard.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { SayCard } from './SayCard';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const sen = makeWord('森林', { id: 'w:森林', pinyin: 'sēn lín' });
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

describe('a Say card (spec 2026-10-11 §3)', () => {
  it('shows the word with no pinyin and no options', () => {
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(document.querySelector('[data-q]')!.textContent).toBe('森林');
    expect(document.querySelector('.choice')).toBeNull();
    expect(document.body.textContent).not.toContain('sēn');
    expect(screen.getByText('继续').closest('button')!.disabled).toBe(true); // nothing to go on with before a take
  });
  it('he records; the model plays right after; 继续 hands over the take', async () => {
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    await waitFor(() => expect(speak).toHaveBeenCalledWith('森林', { reading: 'sēn lín' }));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(1);
  });
  it('one re-record, and the last take is the one kept', async () => {
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    fireEvent.click(screen.getByText('再录一次'));
    await record();
    expect(screen.queryByText('再录一次')).toBeNull();
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2)); // the model after each take
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(2);
  });
  it('a microphone that is refused skips the card', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('no microphone at all skips it straight away', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });
});
```

Create `src/app/sayLesson.test.tsx`:

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
const READ = ['大', '人', '口', '山', '水', '火'];
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockResolvedValue({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 }), cancel: vi.fn() });
});

/** A practice-only lesson: six words he reads (Read passed), their reading due today, so 练一练 has Say cards. */
async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await putCards(app.db, READ.map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
  await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
  return app;
}

/** Answers 练一练's tap questions until a Say card shows. */
async function untilSay() {
  for (let i = 0; i < 40; i++) {
    await waitFor(() => expect(document.querySelector('.say, .choice:not([disabled]), .sheet .btn:not([disabled])')).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.say')) return;
    const before = document.body.innerHTML;
    const open = document.querySelector<HTMLElement>('.choice:not([disabled])');
    if (open) fireEvent.click(open);
    fireEvent.click(document.querySelector<HTMLElement>('.sheet .btn:not([disabled])')!);
    await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
  }
  throw new Error('no Say card came');
}

describe('Say cards in a lesson (spec 2026-10-11 §3, §4)', () => {
  it('his take is kept for the parent and his Say card is made', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSay();
    const word = document.querySelector('.say [data-q]')!.textContent!;
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('继续', { selector: '.sheet .btn:not([disabled]) *' }));
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.prompt)).toEqual([{ kind: 'say', wordId: `b:${word}` }]));
    await waitFor(async () => expect((await allCards(app.db)).find((c) => c.id === `b:${word}:say`)).toBeTruthy());
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect(rec.practiceQueue!.filter((x) => x.ask === 'say').length).toBeGreaterThan(0);
  });
  it('a refused microphone drops the rest of the lesson’s Say cards', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSay();
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(async () => {
      const rec = (await getSession(app.db, '2026-10-02'))!;
      expect(rec.practiceQueue!.slice(rec.practiceIndex).some((x) => x.ask === 'say')).toBe(false);
    });
    expect(await listRecordings(app.db)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/activities/say src/app/sayLesson.test.tsx`
Expected: FAIL — `./SayCard` does not exist; the lesson never shows a `.say` card (`no Say card came`).

- [ ] **Step 3: Implement**

Create `src/activities/say/SayCard.tsx`:

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';
import type { KidState, Word } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { MicButton, useRecorder } from '../shared/recording';

export interface SayResult { take: FinishedRecording; elapsedMs: number }

/**
 * A Say card (spec 2026-10-11 §3): the word — a character or a 词语 — with no pinyin and no options. He records himself reading
 * it aloud; the model plays right after, and he may record once more (the last take is kept). A blocked or missing microphone
 * skips the card (null), and the lesson skips the rest (§7).
 */
export function SayCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | null) => void }) {
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'blocked' && !finished.current) {
      finished.current = true;
      onDone(null);
    }
    if (rec.state === 'done') speak(word.text, { reading: word.pinyin }); // the model, right after his take
  }, [rec.state]);
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
      truffle={<Pet kid={kid} mood="neutral" size={180} calm={!said} bubble={said ? '听一听！' : '大声读一读！'} />}
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said} onAction={next} />}
    >
      <div class="say">
        <div class="hanzi hanzi--q" data-q lang="zh">{word.text}</div>
        <MicButton rec={rec} withLevel={false} />
        {said && (
          <div class="say__after">
            <SpeakButton text={word.text} reading={word.pinyin} />
            {!again && <button type="button" class="btn btn--secondary" onClick={redo}><Label zh="再录一次" /></button>}
          </div>
        )}
      </div>
    </Stage>
  );
}
```

In `src/app/SessionScreen.tsx`:

Replace `import type { FinishedRecording } from '../audio/recorder';` with:

```ts
import { recordingSupported, type FinishedRecording } from '../audio/recorder';
import { SayCard, type SayResult } from '../activities/say/SayCard';
import { recordSayTake } from '../session/say';
```

In the runner import, add `skipSayItems` after `skipPracticeItem`:

```ts
  currentWriteTask, finishStep, finishStepIf, introducedNewWords, skipFlashItem, skipPracticeItem, skipSayItems, startPractice, wordMisses,
```

Replace

```ts
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, meaningPool(state.know), voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know));
```

with

```ts
          // Say cards only where the iPad can record (spec 2026-10-11 §7)
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, meaningPool(state.know), voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know), recordingSupported());
```

Before `  const onWriteDone = (r: WriteResult | null) =>` add:

```tsx
  /** A Say card (spec 2026-10-11 §3): keep the take for the parent and schedule his Say card; a blocked microphone drops the lesson's Say cards (§7). */
  const onSayDone = (r: SayResult | null) =>
    once(async () => {
      const item = practiceItem!;
      if (!r) {
        await commit(skipSayItems(latest.current ?? rec));
        return;
      }
      if (!rec.free) know.cardsById.set(`${item.wordId}:say`, await recordSayTake(db, item.wordId, r.take, now()));
      await commit(afterPracticeAnswer(latest.current ?? rec, true, r.elapsedMs));
    })();

```

Replace

```tsx
      {step === 'practice' && practiceItem && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
```

with

```tsx
      {step === 'practice' && practiceItem?.ask === 'say' && practiceWord && !practiceWord.paused && (
        <SayCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem && practiceItem.ask !== 'say' && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
```

Append to `src/styles.css`:

```css

/* a Say card (spec 2026-10-11 §3): the word, the microphone, then the model and one re-record */
.say { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(12px, 2.4dvh, 24px); height: 100%; }
.say__after { display: flex; align-items: center; gap: 16px; }
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/activities/say src/app/sayLesson.test.tsx src/app/SessionScreen.test.tsx && npx tsc --noEmit`
Expected: PASS (jsdom has no `MediaRecorder`, so the other lesson tests plan no Say cards), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/activities/say src/app/SessionScreen.tsx src/app/sayLesson.test.tsx src/styles.css
git commit -m "feat: the Say card — record the word, hear the model, one re-record; a blocked microphone skips the lesson's Say cards"
```

---

### Task 5: The 15-minute lesson

**Files:**
- Modify: `src/types.ts` (`DEFAULT_SETTINGS`)
- Modify: `src/session/writing.ts:10-11`
- Modify: `src/store/settings.ts:5-28`
- Test: `src/store/settings.test.ts` (rewritten), `src/session/plan.test.ts`, `src/session/writing.test.ts`, `src/store/repo.test.ts`, `src/bootstrap.test.ts`, `src/store/backup.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DEFAULT_SETTINGS.sessionMinutes === 15`, `DEFAULT_SETTINGS.lessonVersion === 6`; `writeCharTarget(m)` = 5 for m < 20; `migrateSettings` returns `null` from version 6.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/store/settings.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v6 (spec 2026-10-05 §7 adds the switches and the ceiling; 2026-10-11 §6 both tracks; §4 the 15-minute lesson)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 6 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 6 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6 })).toBeNull();
  });
  it('an install on the old 20-minute default moved to 30, and so on to 15', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 6 });
  });
  it('keeps a shorter lesson the parent chose', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 6 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 6 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 30, lessonVersion: 6 })).toBeNull();
  });
  it('a fresh install starts at 15 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(15);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings on to 15, even though the defaults already say the current lessonVersion', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
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
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: false });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(6);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', lessonVersion: 6 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', lessonVersion: 6 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', lessonVersion: 6 });
  });
  it('a parent who picked one track since keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toEqual({ lessonVersion: 6 });
  });
});

describe('lessonVersion 6: the 15-minute lesson (spec 2026-10-11 §4)', () => {
  it('moves 30 minutes, the old default, to 15, and touches nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: 30, course: 'cl' })).toEqual({ sessionMinutes: 15, lessonVersion: 6 });
  });
  it('only exactly 30: any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 35, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: m })).toEqual({ lessonVersion: 6 });
  });
});
```

In `src/session/writing.test.ts`, replace `    expect(writeCharTarget(20)).toBe(6);` with:

```ts
    expect(writeCharTarget(15)).toBe(5); // the usual lesson (spec 2026-10-11 §4)
    expect(writeCharTarget(10)).toBe(5);
    expect(writeCharTarget(19)).toBe(5);
    expect(writeCharTarget(20)).toBe(6);
```

In `src/session/plan.test.ts`, replace

```ts
  it('练一练 has about 12 of 30 minutes', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(12 * 60_000);
  });
```

with

```ts
  it('练一练 has 6 of the default 15 minutes (spec 2026-10-11 §4: its share stays 0.4)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(6 * 60_000);
  });
```

and in the test `"sizes 写一写 (9 characters at 30 minutes, 6 at 20) and 练一练's time box from session minutes"` change its name to `"sizes 写一写 (9 characters at 30 minutes, 6 at 20, 5 at 15) and 练一练's time box from session minutes"` and its line `expect([count(30), count(20)]).toEqual([9, 6]);` to:

```ts
    expect([count(30), count(20), count(15)]).toEqual([9, 6, 5]);
```

In `src/store/repo.test.ts` replace

```ts
    expect((await getSettings(db)).sessionMinutes).toBe(30); // the 30-minute lesson (spec §19)
```

with

```ts
    expect((await getSettings(db)).sessionMinutes).toBe(15); // the 15-minute lesson (spec 2026-10-11 §4)
```

In `src/bootstrap.test.ts` replace `lessonVersion: 5 });` in `expect(await getSettings(second.db)).toMatchObject({ course: 'both', contentCourse: 'both', lessonVersion: 5 });` with `lessonVersion: 6 });`.

In `src/store/backup.test.ts` (`'runs the settings migration straight away …'`) replace

```ts
    expect(s.lessonVersion).toBe(5);
    expect(s.course).toBe('both'); // spec 2026-10-11 §6
```

with

```ts
    expect(s.lessonVersion).toBe(6);
    expect(s.course).toBe('both'); // spec 2026-10-11 §6
    expect(s.sessionMinutes).toBe(15); // the old default 30 becomes 15 (spec 2026-10-11 §4)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/store src/session/plan.test.ts src/session/writing.test.ts src/bootstrap.test.ts`
Expected: FAIL — the default is still 30, the migration stops at version 5, and `writeCharTarget(15)` is 6.

- [ ] **Step 3: Implement**

In `src/types.ts`, in `DEFAULT_SETTINGS` replace `  sessionMinutes: 30,` with `  sessionMinutes: 15, // one ~15-minute lesson (spec 2026-10-11 §4)` and `  lessonVersion: 5,` with `  lessonVersion: 6,`.

In `src/session/writing.ts` replace

```ts
/** Characters a lesson: 6 at 20 minutes, 8–10 from 25 (9 at the usual 30). */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 25 ? 6 : minutes < 30 ? 8 : minutes < 40 ? 9 : 10);
```

with

```ts
/** Characters a lesson: 5 under 20 minutes (the usual 15, spec 2026-10-11 §4), 6 at 20, 8–10 from 25 (9 at 30). */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 20 ? 5 : minutes < 25 ? 6 : minutes < 30 ? 8 : minutes < 40 ? 9 : 10);
```

In `src/store/settings.ts`: after the doc-comment line ` * Both tracks (v5, spec 2026-10-11 §6): …` add

```ts
 * The 15-minute lesson (v6, spec 2026-10-11 §4): a lesson on the old default of exactly 30 minutes becomes 15; any other length stays.
```

replace `  if (v >= 5) return null;` with `  if (v >= 6) return null;`, and replace

```ts
  patch.course = 'both';
  patch.lessonVersion = 5;
  return patch;
```

with

```ts
  if (v < 5) patch.course = 'both';
  if ((patch.sessionMinutes ?? s.sessionMinutes) === 30) patch.sessionMinutes = 15; // an install moved to 30 by v2 was on the default too
  patch.lessonVersion = 6;
  return patch;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/store src/session src/bootstrap.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/session/writing.ts src/store/settings.ts src/store/settings.test.ts src/session/plan.test.ts src/session/writing.test.ts src/store/repo.test.ts src/bootstrap.test.ts src/store/backup.test.ts
git commit -m "feat: a 15-minute lesson by default (30 moves to 15 once) and 5 characters to write under 20 minutes"
```

---

### Task 6: Six options where five good wrong ones exist

**Files:**
- Modify: `src/activities/flashcards/distractors.ts` (new helpers before `pickCharacterDistractors`; `meaningChoices`)
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (import; the `quiz` memo; the choices class)
- Modify: `src/styles.css` (append)
- Test: `src/activities/flashcards/distractors.test.ts`, `src/activities/flashcards/meaningChoices.test.ts`, `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `pickSoundAlikes(word, cue, pool, rng, n)` from `src/activities/flashcards/meaning.ts` (already takes `n`).
- Produces: `MANY_WRONG = 5`, `FEW_WRONG = 3`, `fiveOrThree<T>(wrong: T[]): T[]`, `pickLookAlikes(target: Word, pool: Word[], rng: Rng): Word[]` (exactly 5, or `[]`), `meaningChoices(word, pool, rng, others = 3): string[] | null`; CSS class `.choices--six`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/flashcards/distractors.test.ts` change the import to

```ts
import { fiveOrThree, pickCharacterDistractors, pickLookAlikes, pickPinyinDistractors, syllableTone, toneless, withTone } from './distractors';
```

and append:

```ts
describe('six options or four (spec 2026-10-11 §3)', () => {
  it('five look-alikes that share a part, near his level, and sound different', () => {
    const picked = pickLookAlikes(w('河'), all, mulberry32(1));
    expect(picked).toHaveLength(5);
    expect(picked.every((x) => x.text !== '河' && toneless(x.pinyin) !== 'he' && (x.level ?? 9) <= w('河').level! + 2)).toBe(true);
  });
  it('none when fewer than five exist (飞 shares a part with too few)', () => {
    expect(pickLookAlikes(w('飞'), all, mulberry32(1))).toEqual([]);
  });
  it('five wrong options when five were found, else three', () => {
    expect(fiveOrThree([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5]);
    expect(fiveOrThree([1, 2, 3, 4])).toEqual([1, 2, 3]);
    expect(fiveOrThree([1, 2])).toEqual([1, 2]);
  });
  it('five wrong readings for a character on the built-in list', () => {
    expect(pickPinyinDistractors(w('河'), all, mulberry32(5), 5)).toHaveLength(5);
  });
});
```

In `src/activities/flashcards/meaningChoices.test.ts`, before `it('null when there are not three other meanings to choose from', …` add:

```ts
  it('five others when asked for six options (spec 2026-10-11 §3), null when there are not five', () => {
    const c = meaningChoices(target, pool, mulberry32(1), 5)!;
    expect(c).toHaveLength(6);
    expect(new Set(c.map(firstSense)).size).toBe(6);
    expect(meaningChoices(target, pool.slice(0, 6), mulberry32(1), 5)).toBeNull();
  });
```

In `src/activities/flashcards/FlashcardStep.test.tsx`:
- in `'introduces a new word before quizzing it'` change `expect(document.querySelectorAll('.choice')).toHaveLength(4);` to `expect(document.querySelectorAll('.choice')).toHaveLength(6); // five good wrong readings exist (spec 2026-10-11 §3)`;
- in `'falls back to read mode when no same-length look-alikes exist'` change `.size).toBe(4);` to `.size).toBe(6);`;
- in `'a meaning item asks which character fits the 组词 word, …'` change `expect(document.querySelectorAll('.choice')).toHaveLength(4);` to `expect(document.querySelectorAll('.choice')).toHaveLength(6);`;
- append:

```tsx
describe('six options where five good wrong ones exist (spec 2026-10-11 §3)', () => {
  const pick = (t: string) => pool.find((w) => w.text === t)!;
  it('find the character: five look-alikes that share a part with it, three across', () => {
    render(<FlashcardStep {...base} item={review} ask="listen" voice onDone={vi.fn()} />);
    const options = [...document.querySelectorAll('.choice')].map((b) => b.textContent ?? '');
    expect(options).toHaveLength(6);
    expect(options).toContain('河');
    expect(document.querySelector('.choices--six')).toBeTruthy();
  });
  it('a character with fewer than five look-alikes keeps four options', () => {
    const fei = pick('飞');
    render(<FlashcardStep {...base} word={fei} item={{ wordId: fei.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    expect(document.querySelector('.choices--six')).toBeNull();
  });
  it('its meaning in English: six when five other meanings differ, else four', () => {
    render(<FlashcardStep {...base} item={review} ask="meaningRead" voice={false} onDone={vi.fn()} />);
    expect(document.querySelectorAll('.choice')).toHaveLength(6);
    cleanup();
    const w = (text: string, meaning: string) => makeWord(text, { meaning, source: 'parent' });
    const small = [w('看', 'to look'), w('大', 'big'), w('小', 'small'), w('门', 'door'), w('水', 'water')];
    render(<FlashcardStep {...base} word={small[0]!} pool={small} item={{ wordId: small[0]!.id, isNew: false, retry: false }} ask="meaningRead" voice={false} onDone={vi.fn()} />);
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
  });
  it('the right answer is still among them, and a pick still reports right or wrong', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent)).toContain(he.pinyin);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/activities/flashcards`
Expected: FAIL — `fiveOrThree`/`pickLookAlikes` are not exported; cards still show 4 options.

- [ ] **Step 3: Implement**

In `src/activities/flashcards/distractors.ts`, replace the line `export function pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[] {` with:

```ts
/** Six options where five good wrong ones exist, otherwise four (spec 2026-10-11 §3: more honest taps). */
export const MANY_WRONG = 5;
export const FEW_WRONG = 3;
/** Five wrong options when the picker found five, else three of them. */
export const fiveOrThree = <T>(wrong: T[]): T[] => wrong.slice(0, wrong.length >= MANY_WRONG ? MANY_WRONG : FEW_WRONG);

/** Different in sound, near his level (within two levels up): the look-alikes worth showing. */
function nearOf(target: Word, pool: Word[]): Word[] {
  const sound = toneless(target.pinyin);
  const eligible = pool.filter((w) => lengthOf(w) === lengthOf(target) && w.text !== target.text && toneless(w.pinyin) !== sound);
  return target.level === null ? eligible : eligible.filter((w) => (w.level ?? 9) <= target.level! + 2);
}

/**
 * Five look-alikes for a six-option "find the character" (spec 2026-10-11 §3): each shares a part with it, near his level, and
 * sounds different. Fewer than five: none, and the question keeps four options.
 */
export function pickLookAlikes(target: Word, pool: Word[], rng: Rng): Word[] {
  const seen = new Set([target.text]);
  const out: Word[] = [];
  for (const w of shuffle(nearOf(target, pool).filter((x) => sharesComponent(target, x)), rng)) {
    if (seen.has(w.text)) continue;
    seen.add(w.text);
    out.push(w);
    if (out.length === MANY_WRONG) return out;
  }
  return [];
}

export function pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[] {
```

In `meaningChoices`, replace its doc comment and signature

```ts
/** Hear / read-for-meaning (spec 2026-10-06 §3.2): its English meaning and three others whose first sense differs, near its place in his order. */
export function meaningChoices(word: Word, pool: Word[], rng: Rng): string[] | null {
```

with

```ts
/** Hear / read-for-meaning (spec 2026-10-06 §3.2): its English meaning and three others (or `others`) whose first sense differs, near its place in his order. */
export function meaningChoices(word: Word, pool: Word[], rng: Rng, others = FEW_WRONG): string[] | null {
```

and its tail

```ts
  const others: string[] = [];
  for (const w of shuffle(near, rng)) {
    const m = cardMeaning(w);
    if (!m || [...seen].some((x) => alike(x, sense(m)))) continue;
    seen.add(sense(m));
    others.push(firstSense(m));
    if (others.length === 3) break;
  }
  return others.length === 3 ? shuffle([answer, ...others], rng) : null;
```

with

```ts
  const wrong: string[] = [];
  for (const w of shuffle(near, rng)) {
    const m = cardMeaning(w);
    if (!m || [...seen].some((x) => alike(x, sense(m)))) continue;
    seen.add(sense(m));
    wrong.push(firstSense(m));
    if (wrong.length === others) break;
  }
  return wrong.length === others ? shuffle([answer, ...wrong], rng) : null;
```

In `src/activities/flashcards/FlashcardStep.tsx`:

Replace `import { firstSense, meaningChoices, pickCharacterDistractors, pickPinyinDistractors } from './distractors';` with

```ts
import { firstSense, fiveOrThree, MANY_WRONG, meaningChoices, pickCharacterDistractors, pickLookAlikes, pickPinyinDistractors } from './distractors';
```

Replace

```ts
    if (cue) {
      return { listen: false, cue, answer: word.text, options: shuffle([word.text, ...(cue.wrong ?? pickSoundAlikes(word, cue, pool, rng))], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null };
    }
    // the word ladder (spec 2026-10-06 §3.2): he hears it, or reads it, and picks its meaning in English
    if (ask === 'hear' || ask === 'meaningRead') {
      const options = meaningChoices(word, pool, rng);
```

with

```ts
    // six options where five good wrong ones exist, else four (spec 2026-10-11 §3); a class sentence's own wrong ones stay as they are
    if (cue) {
      return { listen: false, cue, answer: word.text, options: shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, MANY_WRONG)))], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null };
    }
    // the word ladder (spec 2026-10-06 §3.2): he hears it, or reads it, and picks its meaning in English
    if (ask === 'hear' || ask === 'meaningRead') {
      const options = meaningChoices(word, pool, rng, MANY_WRONG) ?? meaningChoices(word, pool, rng);
```

Replace

```ts
    const lookAlikes = pickCharacterDistractors(word, pool, rng);
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : pickPinyinDistractors(word, pool, rng);
```

with

```ts
    const five = pickLookAlikes(word, pool, rng);
    const lookAlikes = five.length ? five : pickCharacterDistractors(word, pool, rng);
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : fiveOrThree(pickPinyinDistractors(word, pool, rng, MANY_WRONG));
```

Replace

```tsx
            <div class={`choices stagger ${quiz.mode ? 'choices--english' : quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}`}>
```

with

```tsx
            <div class={`choices stagger ${quiz.mode ? 'choices--english' : quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}${quiz.options.length > 4 ? ' choices--six' : ''}`}>
```

Append to `src/styles.css`:

```css
/* six options (spec 2026-10-11 §3): three across, so the two rows take the height four did */
.choices--six, .stage__card .choices--six { grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(100%, 720px); max-width: 720px; }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/activities src/app/PlacementScreen.test.tsx && npx tsc --noEmit`
Expected: PASS (placement keeps its four meaning choices: it calls `meaningChoices` without `others`), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/activities/flashcards src/styles.css
git commit -m "feat: six options where five good wrong ones exist (look-alikes sharing a part), else four"
```

---

### Task 7: Truffle quiet while he answers; no combo counter, 连对 or combo sound

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (`Props`, signature, initial reaction, mood)
- Modify: `src/activities/choose/UseQuestion.tsx`, `ChooseStep.tsx`, `WrapupStep.tsx`, `src/activities/components/ComponentsStep.tsx`, `src/activities/practice/{BuildSentence,IdiomQuestion,MatchQuestion,PairGame,UnderstandQuestion,PracticeQuestion}.tsx`, `src/activities/writing/WritingStep.tsx`
- Modify: `src/app/SessionScreen.tsx` (imports; `onFlashDone`; `onPracticeDone`; the lesson bar; the step renders)
- Modify: `src/fun/pet.ts`, `src/audio/sfx.ts`, `src/styles.css`, `scripts/stage-cases/page.tsx`
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`, `src/activities/practice/PracticeQuestion.test.tsx`, `src/fun/pet.test.ts` (rewritten), `src/ui/widgets.test.tsx`, `src/app/quietTruffle.test.tsx` (new), and the component tests that passed `resting`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FlashcardStep` no longer takes `peek`; its `resting` is his mood after the answer. `UseQuestion`, `ChooseStep`, `WrapupStep`, `ComponentsStep`, `BuildSentence`, `IdiomQuestion`, `MatchQuestion`, `PairGame`, `UnderstandQuestion`, `WritingStep` no longer take `resting`. `comboMilestone`, `comboPraise` and the `'combo'` sound are gone.

- [ ] **Step 1: Write the failing tests**

In `src/activities/flashcards/FlashcardStep.test.tsx` replace the whole `describe('a hard question (spec 2026-10-04 §4.6, phase E)', …)` block with:

```tsx
describe('Truffle stays quiet while a question is open (spec 2026-10-11 §5)', () => {
  const truffle = () => document.querySelector('svg.truffle')!;
  it('a word he missed comes back: no peek, no mood, just his neutral pose until he answers', () => {
    render(<FlashcardStep {...base} item={{ wordId: he.id, isNew: false, retry: true }} ask="read" voice={false} onDone={vi.fn()} />);
    expect(truffle().getAttribute('data-react')).toBeNull();
    expect(truffle().getAttribute('data-mood')).toBe('neutral');
  });
  it('his reaction comes with the answer: the cheer and his resting mood', () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(truffle().getAttribute('data-react')).toBe('right');
    expect(truffle().getAttribute('data-mood')).toBe('sulk');
  });
});
```

and in `describe('Truffle reactions', …)` replace

```tsx
  it('rests during the quiz, is curious at a wrong answer and overjoyed at a hard one', () => {
    const { unmount } = render(<FlashcardStep {...base} card={relearn()} item={review} voice={false} onDone={vi.fn()} />);
    expect(mood()).toBe('sulk');
```

with

```tsx
  it('rests neutral during the quiz, is curious at a wrong answer and overjoyed at a hard one', () => {
    const { unmount } = render(<FlashcardStep {...base} card={relearn()} item={review} voice={false} onDone={vi.fn()} />);
    expect(mood()).toBe('neutral'); // spec 2026-10-11 §5
```

In `src/activities/practice/PracticeQuestion.test.tsx` replace the whole `describe('final review I2: Truffle peeks only at a word he missed', …)` block with:

```tsx
describe('Truffle stays quiet while a question is open (spec 2026-10-11 §5)', () => {
  it('a retry after a miss shows no peek; every kind of question opens with him neutral', () => {
    const missed = render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 1, ask: 'read', grades: null, retry: true, missed: true }} onDone={vi.fn()} />);
    expect(missed.container.querySelector('svg.truffle')?.getAttribute('data-react')).toBeNull();
    missed.unmount();
    const chuan = pool.find((w) => w.text === '穿')!;
    const hen = pool.find((w) => w.text === '很')!;
    const asks = [
      { word: he, item: { wordId: he.id, rung: 1 as const, ask: 'read' as const, grades: null, retry: false } },
      { word: chuan, item: { wordId: chuan.id, rung: 2 as const, ask: 'match' as const, grades: null, retry: false } },
      { word: hen, item: { wordId: hen.id, rung: 4 as const, ask: 'build' as const, grades: null, retry: false } },
      { word: bankWord, item: { wordId: bankWord.id, rung: 3 as const, ask: 'usage' as const, grades: null, retry: false } },
    ];
    for (const a of asks) {
      const { container, unmount } = render(<PracticeQuestion {...base} word={a.word} item={a.item} onDone={vi.fn()} />);
      expect(container.querySelector('svg.truffle')!.getAttribute('data-mood'), a.item.ask).toBe('neutral');
      expect(container.querySelector('svg.truffle')!.getAttribute('data-react'), a.item.ask).toBeNull();
      unmount();
    }
  });
});
```

Replace the whole of `src/fun/pet.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { CHEERS, pickLine } from './pet';

describe('pet', () => {
  it('picks one of his lines', () => {
    expect(CHEERS).toContain(pickLine(CHEERS, mulberry32(1)));
  });
  it('no run-of-right-answers praise any more (spec 2026-10-11 §5)', async () => {
    const pet = await import('./pet');
    expect('comboPraise' in pet || 'comboMilestone' in pet).toBe(false);
  });
});
```

In `src/ui/widgets.test.tsx` replace the whole `describe('Truffle cheers a run of right answers (parent, 2026-10-05: not a reddish banner)', …)` block with:

```tsx
describe('a line for Truffle to say (greeting.cheer)', () => {
  it('a live Truffle says it in his bubble', async () => {
    const { cheer } = await import('./truffle/greeting');
    const { act } = await import('@testing-library/preact');
    const { Pet } = await import('./Pet');
    const { DEFAULT_KID } = await import('../types');
    const { container } = render(<Pet kid={DEFAULT_KID} mood="content" size={120} />);
    act(() => cheer('真棒！'));
    expect(container.querySelector('.pet__bubble')?.textContent).toContain('真棒！');
  });
});
```

Create `src/app/quietTruffle.test.tsx`:

```tsx
import { fireEvent, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { playSfx } from '../audio/sfx';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));

describe('a calm lesson (spec 2026-10-11 §5)', () => {
  it('Truffle is neutral with no reaction while each question is open, and there is no combo counter or combo sound', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await putCards(app.db, ['大', '人', '口', '山', '水', '火'].map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    renderWithApp(<SessionScreen free={false} />, app);
    for (let i = 0; i < 8; i++) {
      await waitFor(() => expect(document.querySelector('.choice:not([disabled])')).toBeTruthy(), { timeout: 4000 });
      const truffle = document.querySelector('.stage__truffle svg.truffle')!;
      expect(truffle.getAttribute('data-mood')).toBe('neutral');
      expect(truffle.getAttribute('data-react')).toBeNull();
      const q = document.querySelector('[data-q]')?.textContent ?? '';
      const right = byText.get(q)?.pinyin;
      const pick = [...document.querySelectorAll<HTMLElement>('.choice:not([disabled])')].find((b) => b.textContent === right) ?? document.querySelector<HTMLElement>('.choice:not([disabled])')!;
      const before = document.body.innerHTML;
      fireEvent.click(pick);
      const next = document.querySelector<HTMLElement>('.sheet .btn:not([disabled])'); // a board or 组句 needs more taps: the next round of the loop
      if (next) fireEvent.click(next);
      await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
      expect(document.querySelector('.combo')).toBeNull();
    }
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0] as string)).not.toContain('combo');
  });
});
```

Remove the `resting` prop from the component tests and the stage cases (these files test the nine components that lose it; `FlashcardStep`'s and `PracticeQuestion`'s `resting` stays):

```bash
perl -i -pe 's/ resting="sulk"//g' src/activities/choose/ChooseStep.test.tsx src/activities/choose/WrapupStep.test.tsx src/activities/components/ComponentsStep.test.tsx src/activities/writing/WritingStep.test.tsx
perl -i -pe "s/, resting: 'sulk' as const//" src/activities/practice/BuildSentence.test.tsx src/activities/practice/IdiomQuestion.test.tsx src/activities/practice/MatchQuestion.test.tsx src/activities/practice/PairGame.test.tsx src/activities/practice/UnderstandQuestion.test.tsx
perl -i -pe 's/ resting="sulk"//g unless /<FlashcardStep/' scripts/stage-cases/page.tsx
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/activities/flashcards/FlashcardStep.test.tsx src/activities/practice/PracticeQuestion.test.tsx src/fun/pet.test.ts src/app/quietTruffle.test.tsx`
Expected: FAIL — the quiz shows his `sulk` mood, a retry peeks, `comboPraise` still exists, and the lesson shows the `.combo` counter after three right answers.

- [ ] **Step 3: Implement**

`src/activities/flashcards/FlashcardStep.tsx`:

Replace `  resting: TruffleMood;` (in `Props`) with

```ts
  resting: TruffleMood; // his mood once the answer is settled; while the question is open he rests neutral (spec 2026-10-11 §5)
```

Delete these two lines from `Props`:

```ts
  /** a word he missed is back: Truffle covers his eyes and peeks (spec 2026-10-04 §4.6) */
  peek?: boolean;
```

In the signature, delete ` peek = false,` (it becomes `…, reintroOnMiss = false, idiom = null, lessonTag = null }: Props) {`). Replace

```ts
  // a new word surprises him; a word he missed coming back makes him cover his eyes and peek (spec 2026-10-04 §4.6)
  const [react, setReact] = useState<Reaction | null>(() => (item.isNew && !item.retry ? { kind: 'newWord', key: ++reactN.current } : peek ? { kind: 'peek', key: ++reactN.current } : null));
```

with

```ts
  // a new word surprises him; nothing else moves him until an answer is settled (spec 2026-10-11 §5: no peek at a question)
  const [react, setReact] = useState<Reaction | null>(() => (item.isNew && !item.retry ? { kind: 'newWord', key: ++reactN.current } : null));
```

and replace `  const mood: TruffleMood = phase === 'intro' ? 'neutral' : resting;` with

```ts
  const mood: TruffleMood = phase === 'feedback' ? resting : 'neutral'; // still while he answers (spec 2026-10-11 §5)
```

The ten components — in each, delete the line `  resting: TruffleMood;` from `Props`, delete `resting, ` from the destructured parameters, delete the now-unused `import type { TruffleMood } from '../../ui/truffle/Truffle';`, and make the open question's mood `'neutral'`:

| File | Replace | With |
|---|---|---|
| `src/activities/choose/UseQuestion.tsx` | `mood={done ? (correct ? 'pleased' : 'side') : resting}` | `mood={done ? (correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/components/ComponentsStep.tsx` | `mood={!done ? resting : correct ? 'pleased' : 'side'}` | `mood={!done ? 'neutral' : correct ? 'pleased' : 'side'}` |
| `src/activities/practice/BuildSentence.tsx` | `mood={done ? (result.correct ? 'pleased' : 'side') : resting}` | `mood={done ? (result.correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/practice/IdiomQuestion.tsx` | `mood={done ? (correct ? 'pleased' : 'side') : resting}` | `mood={done ? (correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/practice/MatchQuestion.tsx` | `mood={done ? (correct ? 'pleased' : 'side') : resting}` | `mood={done ? (correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/practice/PairGame.tsx` | `mood={done ? (result.correct ? 'pleased' : 'side') : resting}` | `mood={done ? (result.correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/practice/UnderstandQuestion.tsx` | `mood={done ? (correct ? 'pleased' : 'side') : resting}` | `mood={done ? (correct ? 'pleased' : 'side') : 'neutral'}` |
| `src/activities/writing/WritingStep.tsx` | `mood={charMisses === null ? resting :` | `mood={charMisses === null ? 'neutral' :` |
| `src/activities/choose/ChooseStep.tsx` | the line `      resting={resting}` (passed to `UseQuestion`) | (delete it) |
| `src/activities/choose/WrapupStep.tsx` | `<UseQuestion key={index} item={item} kid={kid} resting={resting} bubble=` | `<UseQuestion key={index} item={item} kid={kid} bubble=` |

The imports can be dropped in one go:

```bash
perl -i -ne "print unless m{^import type \{ TruffleMood \} from '../../ui/truffle/Truffle';\$}" src/activities/choose/UseQuestion.tsx src/activities/choose/ChooseStep.tsx src/activities/choose/WrapupStep.tsx src/activities/components/ComponentsStep.tsx src/activities/practice/BuildSentence.tsx src/activities/practice/IdiomQuestion.tsx src/activities/practice/MatchQuestion.tsx src/activities/practice/PairGame.tsx src/activities/practice/UnderstandQuestion.tsx src/activities/writing/WritingStep.tsx
```

`src/activities/practice/PracticeQuestion.tsx`: delete every line that is exactly `          resting={resting}`, `        resting={resting}` or `      resting={resting}` (the props passed to `IdiomQuestion`, `UseQuestion` ×2, `BuildSentence` ×2, `ComponentsStep`, `MatchQuestion`, `PairGame`); delete the line `        peek={!!item.missed}`; replace `return <UnderstandQuestion item={understand} kid={kid} resting={resting} onDone=` with `return <UnderstandQuestion item={understand} kid={kid} onDone=`. Keep `resting={resting}` on the `FlashcardStep` line (`word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}`).

`src/app/SessionScreen.tsx`:
- `import { Flame, X } from 'lucide-preact';` → `import { X } from 'lucide-preact';`
- delete `import { comboMilestone, comboPraise } from '../fun/pet';`
- `import { cheer, requestGreeting } from '../ui/truffle/greeting';` → `import { requestGreeting } from '../ui/truffle/greeting';`
- in `onFlashDone` replace

```ts
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        cheer(comboPraise(nextCombo)); // Truffle praises him (parent, 2026-10-05: not a reddish banner)
      }
      await commit(afterFlashAnswer(
```

with

```ts
      setCombo(r.correct ? combo + 1 : 0); // his hearts at three right in a row; no counter, no spoken 连对 (spec 2026-10-11 §5)
      await commit(afterFlashAnswer(
```

- in `onPracticeDone` replace the same six lines before `      await commit(afterPracticeAnswer(` with `      setCombo(r.correct ? combo + 1 : 0);`
- delete `        {combo >= 3 && <span class="combo"><Flame size={20} strokeWidth={2.75} /> {combo}</span>}`
- delete `          peek={step === 'flashcards' && flashItem.retry} // an older lesson's retries are words he missed`
- in the renders: `<ChooseStep key="choose" items={state.choose} kid={kid} resting={resting} onAnswer` → `<ChooseStep key="choose" items={state.choose} kid={kid} onAnswer`; `<ComponentsStep key="components" items={state.round} kid={kid} resting={resting} onAnswer` → `<ComponentsStep key="components" items={state.round} kid={kid} onAnswer`; delete the `          resting={resting}` line in the `WritingStep` and `WrapupStep` blocks. `FlashcardStep` and `PracticeQuestion` keep `resting={resting}`.

`src/fun/pet.ts`: delete `comboMilestone` and `comboPraise` (with its doc comment); the file keeps `ACCESSORIES`, `CHEERS`, `COMFORTS`, `CHEST_BONUS_STARS` and `pickLine`.

`src/audio/sfx.ts`: replace `export type Sfx = 'correct' | 'wrong' | 'combo' | 'star' | 'chest' | 'levelUp' | 'munch';` with `export type Sfx = 'correct' | 'wrong' | 'star' | 'chest' | 'levelUp' | 'munch';` and delete the line `  combo: [[523, 0, 0.1], [659, 0.08, 0.1], [784, 0.16, 0.1], [1047, 0.24, 0.2]],`.

`src/styles.css`: delete the two `.combo` rules (the counter pill is gone):

```css
.combo { display: inline-flex; align-items: center; gap: 4px; font-weight: 900; color: var(--orange-ink); background: var(--orange-soft); border: 2px solid #ffd7b0; border-radius: 999px; padding: 4px 12px; }
```

```css
.combo { background: var(--surface); border: 2.5px solid var(--ink); color: var(--ink); }
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/activities src/fun src/ui src/app && npx tsc --noEmit`
Expected: PASS, no type errors (the type check also covers `scripts/stage-cases/page.tsx`).

- [ ] **Step 5: Commit**

```bash
git add src/activities src/app/SessionScreen.tsx src/app/quietTruffle.test.tsx src/fun/pet.ts src/fun/pet.test.ts src/audio/sfx.ts src/ui/widgets.test.tsx src/styles.css scripts/stage-cases/page.tsx
git commit -m "feat: Truffle rests neutral while he answers; no combo counter, spoken 连对 or combo sound"
```

---

### Task 8: Stars for what he can now produce

**Files:**
- Modify: `src/types.ts` (`SessionRecord`, `KidState`)
- Modify: `src/session/runner.ts` (`createSessionRecord`)
- Create: `src/stats/produce.ts`, `src/session/stars.ts`
- Modify: `src/stats/stats.ts` (`totalStars`)
- Modify: `src/app/SessionScreen.tsx` (import; `commit`)
- Modify: `src/app/Celebration.tsx` (import; `stars`; the stars phase)
- Test: `src/stats/produce.test.ts` (new), `src/session/stars.test.ts` (new), `src/app/celebration.test.tsx`, `src/app/SessionScreen.test.tsx`, `src/stats/stats.test.ts`, `src/app/home.test.tsx`, `src/parent/parentA.test.tsx`

**Interfaces:**
- Consumes: `passDays`, `fastLimit`, `sayDays` (Task 1); `hanChars` from `src/content`; `getKid`, `updateKid`, `allCards`, `logsSince` from the repo.
- Produces: `SessionRecord.stars?: number`, `.produced?: { write: number; say: number }`, `.closest?: string[]`; `KidState.starredUpTo?: number`; in `src/stats/produce.ts`: `Produced`, `producedBetween(cards, from: number, to: number): Produced`, `lessonStars(p: { write: number; say: number }): number`, `CLOSEST_MAX = 3`, `closestToProduce(cards, logs, wordOf: (id: string) => Word | undefined): string[]`, `producedLine(produced?, closest?): string | null`, `produceChars(cards, wordOf): { write: Set<string>; say: Set<string> }`; in `src/session/stars.ts`: `settleLessonStars(db, rec, now: Date, wordOf): Promise<SessionRecord>`. `createSessionRecord` returns `stars: 0`.

- [ ] **Step 1: Write the failing tests**

Create `src/stats/produce.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import type { CardRecord, ReviewLog } from '../types';
import { closestToProduce, lessonStars, produceChars, producedBetween, producedLine } from './produce';

const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
const passed = (wordId: string, kind: 'write' | 'say' | 'recognise', when: number): CardRecord => ({ ...makeCard(wordId, kind, new Date(2026, 10, 1)), passed: when });
const words = new Map([makeWord('森'), makeWord('林'), makeWord('木'), makeWord('森林', { id: 'w:森林' })].map((w) => [w.id, w]));
const wordOf = (id: string) => words.get(id);

describe('can produce (spec 2026-10-11 §3)', () => {
  it('the write cards and Say rungs that passed in the window; reading passes are not production', () => {
    const cards = [passed('b:森', 'write', at(2)), passed('b:林', 'say', at(2, 20)), passed('b:木', 'write', at(1)), passed('b:木', 'recognise', at(2))];
    expect(producedBetween(cards, at(2, 0), at(2, 21))).toEqual({ write: ['b:森'], say: ['b:林'] });
  });
  it('stars: one per newly produced character or word, never fewer than one', () => {
    expect(lessonStars({ write: 3, say: 2 })).toBe(5);
    expect(lessonStars({ write: 0, say: 0 })).toBe(1);
  });
  it('a 词语 said counts for the 词语, not its characters; writing counts each character', () => {
    const chars = produceChars([passed('w:森林', 'say', 1), passed('b:木', 'say', 1), passed('w:森林', 'write', 1)], wordOf);
    expect([...chars.say]).toEqual(['木']);
    expect([...chars.write].sort()).toEqual(['林', '森']);
  });
});

describe('closest (spec 2026-10-11 §5)', () => {
  const write = (wordId: string, d: number, correct = true): ReviewLog => ({ cardId: `${wordId}:write`, wordId, kind: 'write', at: at(d), rating: 3, correct, misses: 0 });
  const say = (wordId: string, d: number, correct = true): ReviewLog => ({ cardId: `${wordId}:say`, wordId, kind: 'say', at: at(d), rating: correct ? 3 : 1, correct });
  const card = (wordId: string, kind: 'write' | 'say') => makeCard(wordId, kind, new Date(2026, 10, 1));
  it('a write card with one passing day and a Say rung with one confirmed day, the most recent first', () => {
    const cards = [card('b:森', 'write'), card('b:林', 'say'), card('b:木', 'write')];
    const logs = [write('b:森', 3), say('b:林', 4), write('b:木', 2, false)];
    expect(closestToProduce(cards, logs, wordOf)).toEqual(['林', '森']);
  });
  it('not one that has passed, nor one with no day yet', () => {
    const cards = [{ ...card('b:森', 'write'), passed: at(4) }, card('b:林', 'say')];
    expect(closestToProduce(cards, [write('b:森', 3), say('b:林', 4, false)], wordOf)).toEqual([]);
  });
  it('at most three', () => {
    const ids = ['b:森', 'b:林', 'b:木', 'w:森林'];
    expect(closestToProduce(ids.map((id) => card(id, 'write')), ids.map((id, i) => write(id, i + 1)), wordOf)).toHaveLength(3);
  });
});

describe('the line under the stars (spec 2026-10-11 §5)', () => {
  it('what he can now do', () => {
    expect(producedLine({ write: 3, say: 2 }, [])).toBe('今天你会写 3 个新字，会说 2 个！');
    expect(producedLine({ write: 1, say: 0 }, [])).toBe('今天你会写 1 个新字！');
    expect(producedLine({ write: 0, say: 2 }, [])).toBe('今天你会说 2 个新字！');
  });
  it('else what is one day away, else nothing', () => {
    expect(producedLine({ write: 0, say: 0 }, ['森', '林'])).toBe('还差一天：森、林');
    expect(producedLine({ write: 0, say: 0 }, [])).toBeNull();
    expect(producedLine(undefined, undefined)).toBeNull(); // a lesson from before
  });
});
```

Create `src/session/stars.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { addReviewLog, getKid, putCards, saveKid } from '../store/repo';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { createSessionRecord } from './runner';
import { settleLessonStars } from './stars';

const plan: SessionPlan = { steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (extra = false) => ({ ...createSessionRecord(plan, '2026-10-02', 0), completed: true, completedSteps: ['practice' as const], ...(extra ? { extra: true } : {}) });
const at = (h: number, d = 2) => new Date(2026, 9, d, h);
const pass = (wordId: string, kind: 'write' | 'say', when: Date) => ({ ...makeCard(wordId, kind, at(9, 20)), passed: when.getTime() });
const words = new Map([makeWord('森'), makeWord('林')].map((w) => [w.id, w]));

describe('a finished lesson’s stars (spec 2026-10-11 §5)', () => {
  it('counts what newly can be produced since the morning, and remembers where it counted up to', async () => {
    const db = await freshDb();
    await saveKid(db, DEFAULT_KID);
    await putCards(db, [pass('b:森', 'write', at(9)), pass('b:林', 'say', at(8)), pass('b:木', 'write', at(20, 1))]); // 木: yesterday
    const rec = await settleLessonStars(db, done(), at(10), (id) => words.get(id));
    expect([rec.stars, rec.produced, rec.closest]).toEqual([2, { write: 1, say: 1 }, []]);
    expect((await getKid(db))!.starredUpTo).toBe(at(10).getTime());
  });
  it('one star at least, and the closest words when nothing passed', async () => {
    const db = await freshDb();
    await saveKid(db, DEFAULT_KID);
    await putCards(db, [makeCard('b:森', 'write', at(9, 20))]);
    await addReviewLog(db, { cardId: 'b:森:write', wordId: 'b:森', kind: 'write', at: at(9).getTime(), rating: 3, correct: true, misses: 0 });
    const rec = await settleLessonStars(db, done(), at(10), (id) => words.get(id));
    expect([rec.stars, rec.produced, rec.closest]).toEqual([1, { write: 0, say: 0 }, ['森']]);
  });
  it('a take the parent confirmed after last night’s lesson counts in today’s; nothing counts twice', async () => {
    const db = await freshDb();
    await saveKid(db, { ...DEFAULT_KID, starredUpTo: at(18, 1).getTime() });
    await putCards(db, [pass('b:林', 'say', at(21, 1)), pass('b:森', 'write', at(17, 1))]); // confirmed at 21:00, after yesterday's 18:00 lesson
    expect((await settleLessonStars(db, done(), at(10), (id) => words.get(id))).produced).toEqual({ write: 0, say: 1 });
  });
  it('an extra lesson’s stars go to bonusStars, counting only what passed since the day’s lesson', async () => {
    const db = await freshDb();
    await saveKid(db, { ...DEFAULT_KID, bonusStars: 3, starredUpTo: at(10).getTime() });
    await putCards(db, [pass('b:森', 'write', at(9)), pass('b:林', 'write', at(11))]);
    const rec = await settleLessonStars(db, done(true), at(12), (id) => words.get(id));
    expect(rec.stars).toBe(1);
    expect((await getKid(db))!.bonusStars).toBe(4);
  });
});
```

Append to `src/app/celebration.test.tsx`:

```tsx
describe('stars for what he can now do (spec 2026-10-11 §5)', () => {
  it("shows the lesson's stars and the line naming what he can now write and say", async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={{ ...finished('2026-10-02', ['practice']), stars: 5, produced: { write: 3, say: 2 }, closest: [] }} />, app);
    await screen.findByText('太棒了！');
    expect(document.querySelectorAll('.stars > span')).toHaveLength(5);
    expect(document.querySelector('.celebrate__line [data-zh]')?.getAttribute('data-zh')).toBe('今天你会写 3 个新字，会说 2 个！');
  });
  it('one star and the closest words when nothing passed today', async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={{ ...finished('2026-10-02', ['practice']), stars: 1, produced: { write: 0, say: 0 }, closest: ['森', '林'] }} />, app);
    await screen.findByText('太棒了！');
    expect(document.querySelectorAll('.stars > span')).toHaveLength(1);
    expect(document.querySelector('.celebrate__line [data-zh]')?.getAttribute('data-zh')).toBe('还差一天：森、林');
  });
  it('a lesson finished before mastery stars shows the stars its steps earned, and no line', async () => {
    const app = await makeAppData();
    const { stars: _none, ...old } = finished('2026-10-02', ['newwords', 'practice']);
    renderWithApp(<Celebration rec={old} />, app);
    await screen.findByText('太棒了！');
    expect(document.querySelectorAll('.stars > span')).toHaveLength(3);
    expect(document.querySelector('.celebrate__line')).toBeNull();
  });
});
```

In `src/app/SessionScreen.test.tsx`, in `'runs 认新字 then 练一练 to the celebration (spec 2026-10-05 §2)'`, after the line `expect(rec.practiceQueue!.filter((x) => !x.retry).length).toBeGreaterThanOrEqual(6); // two new words, three climbs each` add:

```ts
    expect([rec.stars, rec.produced]).toEqual([1, { write: 0, say: 0 }]); // nothing he can produce yet: the one-star floor (spec 2026-10-11 §5)
```

In `src/stats/stats.test.ts` replace

```ts
describe('totals', () => {
  it('adds completed steps and chest bonus stars', () => {
    const sessions = [session('a', { completedSteps: ['flashcards', 'writing'] }), session('b', { completedSteps: ['flashcards'] })];
    expect(totalStars(sessions, 3)).toBe(6);
  });
```

with

```ts
describe('totals', () => {
  it("adds each lesson's stars and chest bonus stars (spec 2026-10-11 §5)", () => {
    const sessions = [session('2026-10-12', { completedSteps: ['practice', 'writing'], stars: 4 }), session('2026-10-13', { completedSteps: ['practice'], stars: 1 })];
    expect(totalStars(sessions, 3)).toBe(8);
  });
  it('a lesson from before mastery stars keeps the stars its steps earned; a new lesson not yet finished has none', () => {
    const { stars: _none, ...old } = session('2026-10-06', { completedSteps: ['newwords', 'practice', 'writing'] });
    expect(totalStars([old, session('2026-10-12', { completed: false, completedSteps: ['newwords', 'practice'] })], 0)).toBe(4);
  });
```

Fixtures that stand for finished lessons say their stars. In `src/app/home.test.tsx` replace

```ts
const done = (date: string, steps: SessionPlan['steps']) => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, completedSteps: steps });
```

with

```ts
const done = (date: string, steps: SessionPlan['steps']) => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, completedSteps: steps, stars: steps.length });
```

and in `src/parent/parentA.test.tsx` (`'adds a goal and marks it given once reached'`) replace

```ts
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, completedSteps: ['flashcards'] });
```

with

```ts
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, completedSteps: ['flashcards'], stars: 1 });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stats src/session/stars.test.ts src/app/celebration.test.tsx`
Expected: FAIL — `./produce` and `./stars` do not exist; the Celebration shows `starsOf` stars and no line; `totalStars` ignores `stars`.

- [ ] **Step 3: Implement**

In `src/types.ts`, in `SessionRecord` after the `practiceLeft` line add:

```ts
  stars?: number; // the lesson's stars (spec 2026-10-11 §5): set when it finishes; absent on lessons from before, which count their steps (starsOf)
  produced?: { write: number; say: number }; // what newly reached "can produce" by the lesson's end
  closest?: string[]; // nothing new: the words one more day from it (「还差一天：森、林」)
```

and in `KidState` after the `greetedOn` line add:

```ts
  starredUpTo?: number; // passes up to this time have earned their stars (spec 2026-10-11 §5); absent: none yet
```

In `src/session/runner.ts`, in `createSessionRecord` replace

```ts
    completedSteps: [], completed: plan.steps.length === 0,
  };
```

with

```ts
    completedSteps: [], completed: plan.steps.length === 0, stars: 0, // its stars are what he can newly produce when it ends (spec 2026-10-11 §5)
  };
```

Create `src/stats/produce.ts`:

```ts
// "Known" means he can produce it (spec 2026-10-11 §3): a character or word whose write card has passed, or whose Say rung has.
// A 词语's Say pass counts for the 词语, not for its characters.
import { hanChars } from '../content';
import { fastLimit, passDays, sayDays } from '../ladder/rungs';
import type { CardRecord, ReviewLog, Word } from '../types';

/** The words (ids) whose write card or Say rung passed in (from, to]. */
export interface Produced { write: string[]; say: string[] }

export function producedBetween(cards: CardRecord[], from: number, to: number): Produced {
  const inside = (c: CardRecord) => c.passed !== undefined && c.passed > from && c.passed <= to;
  return {
    write: cards.filter((c) => c.kind === 'write' && inside(c)).map((c) => c.wordId),
    say: cards.filter((c) => c.kind === 'say' && inside(c)).map((c) => c.wordId),
  };
}

/** A lesson's stars (spec §5): one for each character or word that newly can be produced, and never fewer than one. */
export const lessonStars = (p: { write: number; say: number }): number => Math.max(1, p.write + p.say);

/** How many words "closest" names. */
export const CLOSEST_MAX = 3;

/**
 * The words one more day from "can produce" (spec §5: 「还差一天：森、林」): a write card with one passing day, or a Say rung
 * with one confirmed day, the most recent first, at most 3.
 */
export function closestToProduce(cards: CardRecord[], logs: ReviewLog[], wordOf: (id: string) => Word | undefined): string[] {
  const fastWrite = fastLimit(logs, 'write');
  const near: { at: number; text: string }[] = [];
  for (const c of cards) {
    if (c.passed || (c.kind !== 'write' && c.kind !== 'say')) continue;
    const text = wordOf(c.wordId)?.text;
    if (!text) continue;
    if (c.kind === 'write') {
      const days = passDays(logs, c.id, fastWrite);
      if (days.length === 1) near.push({ at: days[0]!, text });
    } else {
      const days = sayDays(logs, c.id);
      const at = logs.filter((l) => l.cardId === c.id && l.correct).reduce((m, l) => Math.max(m, l.at), 0);
      if (days.length === 1) near.push({ at, text });
    }
  }
  return [...new Set(near.sort((a, b) => b.at - a.at).map((x) => x.text))].slice(0, CLOSEST_MAX);
}

/** The line under the stars (spec §5): what he can now do, or what is one day away; null when neither. */
export function producedLine(produced: { write: number; say: number } | undefined, closest: string[] | undefined): string | null {
  if (produced && (produced.write || produced.say)) {
    const parts = [produced.write ? `会写 ${produced.write} 个新字` : null, produced.say ? `会说 ${produced.say} 个${produced.write ? '' : '新字'}` : null];
    return `今天你${parts.filter(Boolean).join('，')}！`;
  }
  return closest?.length ? `还差一天：${closest.join('、')}` : null;
}

/** The characters he can write, and those he can say (a 词语 said counts for itself, not its characters): the Progress bars. */
export function produceChars(cards: CardRecord[], wordOf: (id: string) => Word | undefined): { write: Set<string>; say: Set<string> } {
  const passed = (kind: 'write' | 'say') => cards.filter((c) => c.kind === kind && c.passed).map((c) => wordOf(c.wordId)?.text ?? '');
  return {
    write: new Set(passed('write').flatMap((t) => hanChars(t))),
    say: new Set(passed('say').filter((t) => hanChars(t).length === 1)),
  };
}
```

Create `src/session/stars.ts`:

```ts
// A finished lesson's stars (spec 2026-10-11 §5): what newly reached "can produce" since the last lesson's stars, at least one.
import { parseDateKey, startOfLocalDay } from '../lib/date';
import { closestToProduce, lessonStars, producedBetween } from '../stats/produce';
import type { AppDb } from '../store/db';
import { allCards, getKid, logsSince, updateKid } from '../store/repo';
import type { SessionRecord, Word } from '../types';

/**
 * Passes since his last starred lesson (or since the lesson's morning) earn this lesson's stars, so a Say take the parent
 * confirmed last night counts in today's lesson and nothing counts twice. An extra lesson's stars go to bonusStars (it is never
 * saved). Returns the record with its stars, what was produced, and — when nothing was — the words closest to it.
 */
export async function settleLessonStars(db: AppDb, rec: SessionRecord, now: Date, wordOf: (id: string) => Word | undefined): Promise<SessionRecord> {
  const at = now.getTime();
  const [cards, logs, kid] = await Promise.all([allCards(db), logsSince(db, at - 60 * 86_400_000), getKid(db)]);
  const since = kid?.starredUpTo ?? startOfLocalDay(parseDateKey(rec.date)).getTime();
  const p = producedBetween(cards, since, at);
  const produced = { write: p.write.length, say: p.say.length };
  const stars = lessonStars(produced);
  await updateKid(db, (k) => ({ ...k, starredUpTo: at, ...(rec.extra ? { bonusStars: k.bonusStars + stars } : {}) }));
  return { ...rec, stars, produced, closest: produced.write + produced.say ? [] : closestToProduce(cards, logs, wordOf) };
}
```

In `src/stats/stats.ts` replace

```ts
export function totalStars(sessions: SessionRecord[], bonusStars: number): number {
  return sessions.reduce((sum, s) => sum + (s.date < WRAPUP_NO_STAR_FROM ? s.completedSteps.length : starsOf(s.completedSteps)), 0) + bonusStars;
}
```

with

```ts
/** His star total: each lesson's mastery stars (spec 2026-10-11 §5); a lesson from before them keeps the stars its steps earned. */
export function totalStars(sessions: SessionRecord[], bonusStars: number): number {
  return sessions.reduce((sum, s) => sum + (typeof s.stars === 'number' ? s.stars : s.date < WRAPUP_NO_STAR_FROM ? s.completedSteps.length : starsOf(s.completedSteps)), 0) + bonusStars;
}
```

In `src/app/SessionScreen.tsx` replace `import { starsOf } from '../stats/stats';` with `import { settleLessonStars } from '../session/stars';`, and replace

```ts
  const commit = async (next: SessionRecord) => {
    const was = latest.current;
    latest.current = next;
    if (!next.free && !next.extra) await saveSession(db, next); // an extra lesson never replaces the day's record
    if (next.extra && next.completed && !was?.completed) {
      // its stars count on top of the day's (they aren't in a saved day): the celebration then shows them landing
      const fresh = await getKid(db);
      if (fresh) await saveKid(db, { ...fresh, bonusStars: fresh.bonusStars + starsOf(next.completedSteps) });
    }
```

with

```ts
  const commit = async (step: SessionRecord) => {
    const was = latest.current;
    latest.current = step;
    // a finished lesson's stars are what he can newly produce (spec 2026-10-11 §5); an extra lesson's go to bonusStars, as before
    const next = !step.free && step.completed && !was?.completed ? await settleLessonStars(db, step, now(), (id) => state?.know.wordsById.get(id)) : step;
    latest.current = next;
    if (!next.free && !next.extra) await saveSession(db, next); // an extra lesson never replaces the day's record
```

In `src/app/Celebration.tsx` add after `import { totalStars, starsOf } from '../stats/stats';`:

```ts
import { producedLine } from '../stats/produce';
```

replace `  const stars = rec.free ? 0 : starsOf(rec.completedSteps);` with

```ts
  // mastery stars (spec 2026-10-11 §5); a lesson finished before them shows the stars its steps earned
  const stars = rec.free ? 0 : rec.stars ?? starsOf(rec.completedSteps);
  const line = rec.free ? null : producedLine(rec.produced, rec.closest);
```

and replace

```tsx
                <p><Label zh={`你得到了 ${stars} 颗星`} /></p>
```

with

```tsx
                <p><Label zh={`你得到了 ${stars} 颗星`} /></p>
                {line && <p class="celebrate__line"><Label zh={line} /></p>}
```

(`.celebrate--burst > p` already gives it the ink colour and paper shadow.)

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/stats src/session src/app/celebration.test.tsx src/app/home.test.tsx src/parent/parentA.test.tsx src/app/SessionScreen.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/session/runner.ts src/stats/produce.ts src/stats/produce.test.ts src/session/stars.ts src/session/stars.test.ts src/stats/stats.ts src/stats/stats.test.ts src/app/SessionScreen.tsx src/app/SessionScreen.test.tsx src/app/Celebration.tsx src/app/celebration.test.tsx src/app/home.test.tsx src/parent/parentA.test.tsx
git commit -m "feat: stars count what he can newly write or say (at least one), with 「今天你会写…」 or 「还差一天…」"
```

---

### Task 9: The streak forgives one rest day a week

**Files:**
- Modify: `src/stats/stats.ts` (`streak`, `WeekDay`, `weekDays`)
- Modify: `src/app/WeekStrip.tsx` (whole file)
- Modify: `src/styles.css` (append)
- Test: `src/stats/stats.test.ts`, `src/app/WeekStrip.test.tsx` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `streakDays(sessions: SessionRecord[], today: string): { count: number; rest: string[] }`; `streak(sessions, today): number` (= `streakDays(…).count`); `WeekDay.rest: boolean`; `.week__day.is-rest`.

- [ ] **Step 1: Write the failing tests**

In `src/stats/stats.test.ts` change the import to

```ts
import { dueTomorrow, minutesPerDay, starsOf, streak, streakDays, summarize, totalStars, troubleWords, weekDays, weeklyAccuracy } from './stats';
```

replace

```ts
describe('streak', () => {
  const sessions = [session('2026-09-29'), session('2026-09-30'), session('2026-10-01'), session('2026-09-27')];
  it('counts consecutive completed days up to yesterday while today is not done', () => {
    expect(streak(sessions, '2026-10-02')).toBe(3);
  });
  it('includes today once it is done', () => {
    expect(streak([...sessions, session('2026-10-02')], '2026-10-02')).toBe(4);
  });
```

with

```ts
describe('streak', () => {
  // Mon 09-28 missed: that week's rest day, so Sun 09-27 still counts (spec 2026-10-11 §5)
  const sessions = [session('2026-09-29'), session('2026-09-30'), session('2026-10-01'), session('2026-09-27')];
  it('counts completed days up to yesterday while today is not done, over one rest day', () => {
    expect(streakDays(sessions, '2026-10-02')).toEqual({ count: 4, rest: ['2026-09-28'] });
  });
  it('includes today once it is done', () => {
    expect(streak([...sessions, session('2026-10-02')], '2026-10-02')).toBe(5);
  });
```

and append:

```ts
describe('the rest day (spec 2026-10-11 §5)', () => {
  const s = (date: string) => session(date);
  it('one missed day a week is forgiven, and does not add to the count', () => {
    expect(streakDays([s('2026-09-29'), s('2026-10-01')], '2026-10-02')).toEqual({ count: 2, rest: ['2026-09-30'] });
  });
  it('a second missed day in the same week ends the streak', () => {
    expect(streakDays([s('2026-09-28'), s('2026-10-01')], '2026-10-02')).toEqual({ count: 1, rest: [] });
  });
  it('each calendar week has its own: a missed Sunday and Monday are both forgiven', () => {
    expect(streakDays([s('2026-09-26'), s('2026-09-29')], '2026-09-30')).toEqual({ count: 2, rest: ['2026-09-28', '2026-09-27'] });
  });
  it('a missed day with no lesson before it is not a rest day', () => {
    expect(streakDays([], '2026-10-02')).toEqual({ count: 0, rest: [] });
    expect(streakDays([s('2026-10-01')], '2026-10-02')).toEqual({ count: 1, rest: [] });
  });
  it('the week strip marks the rest day', () => {
    const days = weekDays([s('2026-09-28'), s('2026-09-30')], '2026-10-01');
    expect(days.map((d) => d.rest)).toEqual([false, true, false, false, false, false, false]);
  });
});
```

Create `src/app/WeekStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { weekDays } from '../stats/stats';
import type { SessionPlan } from '../types';
import { WeekStrip } from './WeekStrip';

const plan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (date: string) => ({ ...createSessionRecord(plan, date, 0), completed: true });

describe('the week strip (spec 2026-10-11 §5)', () => {
  it('shows the forgiven day as 休 (休息日), neither done nor missed', () => {
    render(<WeekStrip days={weekDays([done('2026-09-28'), done('2026-09-30')], '2026-10-01')} />);
    const tue = document.querySelectorAll('.week__day')[1]!;
    expect(tue.classList.contains('is-rest')).toBe(true);
    expect(tue.classList.contains('is-done')).toBe(false);
    expect(tue.getAttribute('title')).toBe('休息日');
    expect(tue.querySelector('[data-zh]')!.getAttribute('data-zh')).toBe('休');
    expect(screen.getByRole('img', { name: '这个星期练了 2 天，休息日 1 天' })).toBeTruthy();
  });
  it('no rest day: as before', () => {
    render(<WeekStrip days={weekDays([done('2026-09-28')], '2026-09-29')} />);
    expect(document.querySelector('.is-rest')).toBeNull();
    expect(screen.getByRole('img', { name: '这个星期练了 1 天' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stats/stats.test.ts src/app/WeekStrip.test.tsx`
Expected: FAIL — `streakDays` is not exported; the streak stops at the missed Monday (3, not 4); no `rest` on the strip.

- [ ] **Step 3: Implement**

In `src/stats/stats.ts` replace the whole `streak` function (with its doc comment `/** Consecutive completed days ending today …`) with:

```ts
/** Monday of the calendar week (Mon–Sun) a day is in. */
const weekOf = (d: Date): string => localDateKey(addDays(d, -((d.getDay() + 6) % 7)));

/**
 * The streak (spec 2026-10-11 §5): days with a finished lesson, back from today (or yesterday, while today is still to do). One
 * missed day in a calendar week (Mon–Sun) is forgiven as a rest day — it doesn't add to the count — and a second missed day in
 * the same week ends the streak. `rest`: the forgiven days, only those with a finished day before them (newest first).
 */
export function streakDays(sessions: SessionRecord[], today: string): { count: number; rest: string[] } {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  let day = parseDateKey(today);
  if (!done.has(today)) day = addDays(day, -1);
  const used = new Set<string>(); // weeks whose rest day is taken
  const rest: string[] = [];
  let pending: string[] = []; // missed days forgiven so far, kept once a finished day comes before them
  let count = 0;
  for (;;) {
    const key = localDateKey(day);
    if (done.has(key)) {
      count++;
      rest.push(...pending);
      pending = [];
    } else {
      const week = weekOf(day);
      if (used.has(week)) break;
      used.add(week);
      pending.push(key);
    }
    day = addDays(day, -1);
  }
  return { count, rest };
}

export const streak = (sessions: SessionRecord[], today: string): number => streakDays(sessions, today).count;
```

(The loop ends: at most two missed days in a row can be forgiven — the last day of one week and the first of the next — before a third falls in a used week.)

Replace

```ts
export interface WeekDay { label: string; date: string; done: boolean; today: boolean }

/** This week, Monday first: which days a (non-free) lesson was finished. */
export function weekDays(sessions: SessionRecord[], today: string): WeekDay[] {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  const day = parseDateKey(today);
```

with

```ts
export interface WeekDay { label: string; date: string; done: boolean; today: boolean; rest: boolean }

/** This week, Monday first: which days a (non-free) lesson was finished, and the streak's rest day (休息日, spec 2026-10-11 §5). */
export function weekDays(sessions: SessionRecord[], today: string): WeekDay[] {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  const rest = new Set(streakDays(sessions, today).rest);
  const day = parseDateKey(today);
```

and in its map replace `    return { label, date, done: done.has(date), today: date === today };` with

```ts
    return { label, date, done: done.has(date), today: date === today, rest: rest.has(date) };
```

Replace the whole of `src/app/WeekStrip.tsx` with:

```tsx
import type { WeekDay } from '../stats/stats';
import { Label } from '../ui/Label';

/** 一 to 日: a filled ink circle for each day a lesson was finished this week; the streak's forgiven day reads 休 (休息日, spec 2026-10-11 §5). */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  const n = days.filter((d) => d.done).length;
  const rest = days.some((d) => d.rest);
  return (
    <div class="week" role="img" aria-label={`这个星期练了 ${n} 天${rest ? '，休息日 1 天' : ''}`}>
      {days.map((d) => (
        <span key={d.date} class={`week__day${d.done ? ' is-done' : ''}${d.rest ? ' is-rest' : ''}${d.today ? ' is-today' : ''}`} title={d.rest ? '休息日' : undefined}>
          <i class="week__dot" />
          <Label zh={d.rest ? '休' : d.label} />
        </span>
      ))}
    </div>
  );
}
```

Append to `src/styles.css`:

```css
.week__day.is-rest .week__dot { border-style: dashed; background: color-mix(in srgb, var(--gold) 35%, var(--surface)); } /* 休息日: forgiven, not finished (spec 2026-10-11 §5) */
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/stats src/app/WeekStrip.test.tsx src/app/home.test.tsx src/parent && npx tsc --noEmit`
Expected: PASS (Home and the parent's Overview call `streak`, unchanged in shape), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/stats/stats.ts src/stats/stats.test.ts src/app/WeekStrip.tsx src/app/WeekStrip.test.tsx src/styles.css
git commit -m "feat: the streak forgives one missed day a week, shown as 休 on the week strip"
```

---

### Task 10: The parent area — Listen & confirm, Overview tile, Settings switch, Progress bars

**Files:**
- Create: `src/parent/ListenPanel.tsx`
- Modify: `src/parent/ParentArea.tsx` (imports, `ParentTab`, `TABS`, `ParentArea`)
- Modify: `src/parent/Dashboard.tsx` (imports, `Data`, the load, the tiles)
- Modify: `src/parent/SettingsPanel.tsx` (after the Activities fieldset)
- Modify: `src/parent/ProgressPanel.tsx` (imports, counts, bars)
- Modify: `src/styles.css` (`.pbar` columns; append badge and Listen styles)
- Test: `src/parent/listen.test.tsx` (new), `src/parent/progressPanel.test.tsx`, `src/parent/parentB.test.tsx`

**Interfaces:**
- Consumes: `waitingTakes`, `takeWord`, `reviewTake` (Task 2); `produceChars` (Task 8); `findWord`; `SpeakButton`.
- Produces: `ParentTab` includes `'listen'`; `ListenPanel({ onReviewed?: () => void })`; `ListenRows({ takes: Recording[]; words: ReadonlyMap<string, Word>; onJudge: (r: Recording, verdict: 'ok' | 'no') => void })` (the rows alone: Task 12's stage case renders it with takes in memory); row class `.listen__row` with `.listen__word`, `.listen__py`, ✓ button labelled `Said right: <word>`, ✗ button `Not right: <word>`; badge `.tab__badge` labelled `<n> waiting`.

- [ ] **Step 1: Write the failing tests**

Create `src/parent/listen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { addRecording, getCard, getSettings, listRecordings, putCards, putWords } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Recording } from '../types';
import { Dashboard } from './Dashboard';
import { ListenPanel } from './ListenPanel';
import { ParentArea } from './ParentArea';
import { SettingsPanel } from './SettingsPanel';

vi.mock('../audio/speech', async (orig) => ({ ...(await orig<typeof import('../audio/speech')>()), speak: vi.fn() }));
import { speak } from '../audio/speech';

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

const at = (d: number) => new Date(2026, 9, d, 18).getTime();
const take = (id: string, wordId: string, d: number, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at(d), prompt: { kind: 'say', wordId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2, ...(review ? { review } : {}) });

async function withTakes() {
  const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true, pinHash: await hashPin('1111') } });
  await putWords(app.db, [makeWord('森', { pinyin: 'sēn' }), makeWord('林', { pinyin: 'lín' })]);
  await putCards(app.db, [makeCard('b:森', 'say', new Date(2026, 9, 9)), makeCard('b:林', 'say', new Date(2026, 9, 9))]);
  for (const t of [take('t2', 'b:林', 2), take('t1', 'b:森', 1), take('t0', 'b:森', 1, 'ok')]) await addRecording(app.db, t);
  return app;
}

describe('Listen & confirm (spec 2026-10-11 §6)', () => {
  it('the waiting takes, oldest first: the word with pinyin, his take, the model, ✓ and ✗', async () => {
    const app = await withTakes();
    renderWithApp(<ListenPanel />, app);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    const rows = [...document.querySelectorAll('.listen__row')];
    expect(rows.map((r) => r.querySelector('.listen__word')!.textContent)).toEqual(['森', '林']);
    expect(rows[0]!.querySelector('.listen__py')!.textContent).toBe('sēn');
    expect(rows[0]!.querySelector('audio')).toBeTruthy();
    fireEvent.click(rows[0]!.querySelector('button[aria-label="听"]')!);
    expect(speak).toHaveBeenCalledWith('森', { reading: 'sēn' });
  });
  it('✓ confirms the take and ✗ brings the word back; both leave the queue', async () => {
    const app = await withTakes();
    const onReviewed = vi.fn();
    renderWithApp(<ListenPanel onReviewed={onReviewed} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Said right: 森' }));
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Not right: 林' }));
    await screen.findByText(/Nothing to listen to/);
    const reviews = Object.fromEntries((await listRecordings(app.db)).map((r) => [r.id, r.review]));
    expect(reviews).toEqual({ t0: 'ok', t1: 'ok', t2: 'no' });
    expect((await getCard(app.db, 'b:林:say'))!.fsrs.due.getTime()).toBeLessThan(new Date(2026, 9, 9).getTime());
    expect(onReviewed).toHaveBeenCalledTimes(2);
  });
  it('the tab shows a badge with the number waiting, and it goes down as he is heard', async () => {
    const app = await withTakes();
    renderWithApp(<ParentArea />, app);
    for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
    expect(await screen.findByLabelText('2 waiting')).toBeTruthy();
    fireEvent.click(screen.getByText('Listen & confirm', { selector: '.tab' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Said right: 森' }));
    expect(await screen.findByLabelText('1 waiting')).toBeTruthy();
  });
  it('Overview has a takes-to-review tile that opens the queue', async () => {
    const app = await withTakes();
    const onNavigate = vi.fn();
    renderWithApp(<Dashboard onNavigate={onNavigate} />, app);
    const tile = (await screen.findByText('Takes to review')).closest('.tile')!;
    expect(tile.querySelector('.tile__value')!.textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Listen & confirm' }));
    expect(onNavigate).toHaveBeenCalledWith('listen');
  });
  it('Settings has a Say cards switch, on by default', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = (await screen.findByText('Say cards')).closest('label')!.querySelector('input')!;
    expect(box.checked).toBe(true);
    fireEvent.change(box, { target: { checked: false } });
    await waitFor(async () => expect((await getSettings(app.db)).sayCards).toBe(false));
  });
});
```

In `src/parent/progressPanel.test.tsx`:
- change the `passed` helper's kind type to `'recognise' | 'hear' | 'write' | 'say'`;
- in `'each bar has a mark where his class is now (二下·17: 707 to read, 413 to write)'` replace

```ts
    expect(marks).toEqual(['94.8%', '94.9%']);
    expect(screen.getByRole('img', { name: '认读: 1 of 746; his class is at 707' })).toBeTruthy();
```

with

```ts
    expect(marks).toEqual(['94.8%', '94.9%', '94.8%']);
    expect(screen.getByRole('img', { name: '认读 reads (taps): 1 of 746; his class is at 707' })).toBeTruthy();
```

- append:

```tsx
describe('can write and can say (spec 2026-10-11 §6)', () => {
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

In `src/parent/parentB.test.tsx` replace

```ts
    expect(document.querySelectorAll('.tabs .tab svg').length).toBe(12); // + From a worksheet, Skills
```

with

```ts
    expect(document.querySelectorAll('.tabs .tab svg').length).toBe(13); // + From a worksheet, Skills, Listen & confirm
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/parent/listen.test.tsx src/parent/progressPanel.test.tsx src/parent/parentB.test.tsx`
Expected: FAIL — `./ListenPanel` does not exist; there are two bars, labelled 认读 and 写; there are 12 tabs.

- [ ] **Step 3: Implement**

Create `src/parent/ListenPanel.tsx`:

```tsx
// Listen & confirm (spec 2026-10-11 §6): his Say takes, oldest first; the parent plays his take and the model, then ✓ or ✗.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { findWord } from '../ladder/words';
import { reviewTake, takeWord, waitingTakes } from '../session/say';
import { listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';

/** The queue's rows: the word with its pinyin, his take, the model, ✓ and ✗ (the stage cases show it with takes in memory). */
export function ListenRows({ takes, words, onJudge }: { takes: Recording[]; words: ReadonlyMap<string, Word>; onJudge: (r: Recording, verdict: 'ok' | 'no') => void }) {
  const urls = useMemo(() => new Map(takes.map((r) => [r.id, URL.createObjectURL(r.blob)])), [takes]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  if (takes.length === 0) return <p>Nothing to listen to. New takes appear here after his lessons.</p>;
  return (
    <table class="table">
      <tbody>
        {takes.map((r) => {
          const w = words.get(takeWord(r)!);
          return (
            <tr key={r.id} class="listen__row">
              <td>
                <span class="hanzi listen__word">{w?.text ?? '?'}</span> <span class="listen__py">{w?.pinyin}</span>
                <br />
                <small>{new Date(r.createdAt).toLocaleString()}</small>
              </td>
              <td><audio controls preload="none" src={urls.get(r.id)} aria-label="His take" /></td>
              <td>{w && <SpeakButton text={w.text} reading={w.pinyin} />}</td>
              <td class="listen__verdict">
                <button type="button" class="small-btn" aria-label={`Said right: ${w?.text ?? ''}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                <button type="button" class="small-btn" aria-label={`Not right: ${w?.text ?? ''}`} onClick={() => onJudge(r, 'no')}>✗</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ListenPanel({ onReviewed }: { onReviewed?: () => void }) {
  const { db, now } = useApp();
  const [takes, setTakes] = useState<Recording[] | null>(null);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const busy = useRef(new Set<string>()); // a double tap on ✓ reviews a take once
  const reload = async () => {
    const waiting = waitingTakes(await listRecordings(db));
    const ids = [...new Set(waiting.map((r) => takeWord(r)!))];
    const found = await Promise.all(ids.map(async (id) => [id, await findWord(db, id)] as const));
    setWords(new Map(found.filter((x): x is readonly [string, Word] => !!x[1])));
    setTakes(waiting);
  };
  useEffect(() => {
    void reload();
  }, []);
  const judge = async (r: Recording, verdict: 'ok' | 'no') => {
    if (busy.current.has(r.id)) return;
    busy.current.add(r.id);
    await reviewTake(db, r.id, verdict, now());
    await reload();
    onReviewed?.();
  };
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read each word aloud in 练一练. Play his take, then the model: ✓ if he said it right, ✗ if not. A word counts as “can say” after ✓ on two different days; ✗ brings it back soon.</p>
      {takes ? <ListenRows takes={takes} words={words} onJudge={(r, v) => void judge(r, v)} /> : <p class="muted">Loading…</p>}
    </section>
  );
}
```

In `src/parent/ParentArea.tsx`:

Replace the first two import lines with:

```ts
import { BookOpen, ChevronLeft, Ear, FileText, Gauge, Gift, Image, Info, LayoutDashboard, Mic, Save, ScanText, Settings, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
```

After `import { ImportPanel } from './ImportPanel';` add:

```ts
import { ListenPanel } from './ListenPanel';
import { waitingTakes } from '../session/say';
import { listRecordings } from '../store/repo';
```

Replace the `ParentTab` line with

```ts
export type ParentTab = 'dashboard' | 'listen' | 'progress' | 'skills' | 'words' | 'import' | 'passages' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits';
```

After `  ['dashboard', 'Overview', LayoutDashboard],` add

```ts
  ['listen', 'Listen & confirm', Ear], // his Say takes (spec 2026-10-11 §6)
```

Replace

```ts
  const { go } = useApp();
  const [tab, setTab] = useState<ParentTab>('dashboard');
```

with

```ts
  const { db, go } = useApp();
  const [tab, setTab] = useState<ParentTab>('dashboard');
  const [waiting, setWaiting] = useState(0); // takes to review: the badge on Listen & confirm
  const countWaiting = async () => setWaiting(waitingTakes(await listRecordings(db)).length);
  useEffect(() => {
    void countWaiting();
  }, []);
```

After the line `                <Icon size={18} strokeWidth={2.5} /> {label}` add

```tsx
                {id === 'listen' && waiting > 0 && <span class="tab__badge" aria-label={`${waiting} waiting`}>{waiting}</span>}
```

and after `          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}` add

```tsx
          {tab === 'listen' && <ListenPanel onReviewed={() => void countWaiting()} />}
```

In `src/parent/Dashboard.tsx`:
- replace `import { allSessions, countRecordings, logsSince } from '../store/repo';` with

```ts
import { allSessions, countRecordings, listRecordings, logsSince } from '../store/repo';
import { waitingTakes } from '../session/say';
```

- in `interface Data` after `  recordings: number;` add `  takes: number; // Say takes waiting for the parent (spec 2026-10-11 §6)`;
- replace

```ts
      const [know, sessions, logs, recordings] = await Promise.all([
        loadKnowledge(db), allSessions(db), logsSince(db, addDays(t, -42).getTime()), countRecordings(db),
      ]);
```

with

```ts
      const [know, sessions, logs, recordings, all] = await Promise.all([
        loadKnowledge(db), allSessions(db), logsSince(db, addDays(t, -42).getTime()), countRecordings(db), listRecordings(db),
      ]);
      const takes = waitingTakes(all).length;
```

- replace `      setD({ know, sessions, logs, recordings, micDenied });` with `      setD({ know, sessions, logs, recordings, takes, micDenied });`;
- after the `Cards due tomorrow` tile add:

```tsx
        <div class="tile">
          <span class="tile__value">{d.takes}</span>
          <span class="tile__label">Takes to review</span>
          {d.takes > 0 && <button type="button" class="small-btn" onClick={() => onNavigate('listen')}>Listen & confirm</button>}
        </div>
```

In `src/parent/SettingsPanel.tsx` replace

```tsx
      </fieldset>
      <details class="field">
```

with

```tsx
      </fieldset>
      <div class="field">
        <label>
          <input type="checkbox" checked={s.sayCards !== false} onChange={(e) => void save({ sayCards: e.currentTarget.checked })} />{' '}
          Say cards
        </label>
        <p class="hint">In 练一练 he reads some words aloud (about one in three, at most 6 a lesson). You confirm his takes under Listen &amp; confirm; a word he can say counts toward his stars and Progress. Off: 练一练 is taps only.</p>
      </div>
      <details class="field">
```

In `src/parent/ProgressPanel.tsx`:
- replace `import { hanChars, MOE_TERMS } from '../content';` and `import type { Knowledge } from '../stats/stats';` with

```ts
import { MOE_TERMS } from '../content';
import { wordOf, type Knowledge } from '../stats/stats';
import { produceChars } from '../stats/produce';
```

- replace

```ts
  const written = new Set(know.cards.filter((c) => c.kind === 'write' && c.passed).flatMap((c) => hanChars(know.wordsById.get(c.wordId)?.text ?? '')));
  const read = target ? count(know.knownChars, target.read) : know.known;
  const wrote = target ? count(written, target.write) : know.written;
```

with

```ts
  // can produce (spec 2026-10-11 §3): he writes it (write passed) or says it (Say passed); a 词语 said counts for itself only
  const { write: written, say: said } = produceChars(know.cards, (id) => wordOf(know, id));
  const read = target ? count(know.knownChars, target.read) : know.known;
  const wrote = target ? count(written, target.write) : know.written;
  const says = target ? count(said, target.read) : said.size;
```

- replace

```tsx
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
```

with

```tsx
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
        <dt>Characters he can say</dt><dd>{target ? `${says} of ${target.read.size}` : says}</dd>
```

- replace the two bars

```tsx
          <Bar label="认读" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="写" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
```

with

```tsx
          <Bar label="认读 reads (taps)" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="会写 Can write" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
          <Bar label="会说 Can say" have={says} of={target.read.size} mark={atClass ? atClass.read.size : null} />
```

In `src/styles.css` replace

```css
.pbar { display: grid; grid-template-columns: 3em 1fr 6.5em; align-items: center; gap: 10px; }
.pbar__label { font-family: var(--hanzi); font-size: 16px; }
```

with

```css
.pbar { display: grid; grid-template-columns: 9em 1fr 6.5em; align-items: center; gap: 10px; } /* 认读 reads (taps), 会写 Can write, 会说 Can say */
.pbar__label { font-family: var(--hanzi); font-size: 16px; line-height: 1.2; }
```

and append:

```css
/* Listen & confirm (spec 2026-10-11 §6) */
.tab__badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--red); color: #fff; font-size: 13px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; }
.listen__word { font-size: 32px; }
.listen__py { color: var(--ink-soft); }
.listen__verdict .small-btn { min-width: 52px; min-height: 44px; font-size: 22px; }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/parent src/styles.css
git commit -m "feat: Listen & confirm for his takes (badge, Overview tile), a Say cards switch, and can-write / can-say bars"
```

---

### Task 11: The second lesson, offered softly

**Files:**
- Modify: `src/app/HomeScreen.tsx` (a constant after `SLEEP_AFTER_MS`; the done card's 再学一课 button; Truffle's bubble)
- Test: `src/app/home.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: once the day's lesson is done and its chest opened, Truffle's Home bubble asks 「想再学一课吗？」 (unless a tap or his greeting is speaking, or he is asleep) and 再学一课 is the quiet (secondary) button; it still goes to `{ name: 'session', free: false, extra: true }`.

- [ ] **Step 1: Write the failing tests**

In `src/app/home.test.tsx`, before `  it('no extra lesson before today\'s is done', async () => {` add:

```tsx
  it('the second lesson is offered softly: Truffle asks, and the button is the quiet one (spec 2026-10-11 §4)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, lastChestDate: '2026-10-02', greetedOn: '2026-10-02' } }); // greeted already: his own line shows
    await saveSession(app.db, done('2026-10-02', ['newwords', 'practice']));
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天完成了！');
    await waitFor(() => expect(document.querySelector('.home__pet .pet__bubble')?.textContent).toContain('想再学一课吗？'));
    expect(screen.getByText('再学一课').closest('button')!.className).toContain('btn--secondary');
  });
  it('before the day’s lesson is done he does not ask', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, greetedOn: '2026-10-02' } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.home__pet .pet__bubble')?.textContent ?? '').not.toContain('想再学一课吗？');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/home.test.tsx`
Expected: FAIL — the first new test: his bubble shows the world's line and 再学一课 is the primary button.

- [ ] **Step 3: Implement**

In `src/app/HomeScreen.tsx`, after `const SLEEP_AFTER_MS = 20_000;` add:

```ts
/** What Truffle asks once the day's lesson is done (spec 2026-10-11 §4): the second lesson, offered softly. */
const OFFER = '想再学一课吗？';
```

Replace

```tsx
              {/* one lesson a day is the baseline; another is his choice (parent, 2026-10-05): new words and what's due, for stars */}
              <button type="button" class="btn btn--primary" onClick={() => { primeSpeech(); go({ name: 'session', free: false, extra: true }); }}><Label zh="再学一课" /></button>
```

with

```tsx
              {/* one ~15-minute lesson is the day's; another is offered softly — Truffle asks, the button is the quiet one — his choice (spec 2026-10-11 §4): never the streak or the chest */}
              <button type="button" class="btn btn--secondary" onClick={() => { primeSpeech(); go({ name: 'session', free: false, extra: true }); }}><Label zh="再学一课" /></button>
```

and in the `home__pet` Pet replace `bubble={said ?? (sleepy ? null : worldLine(world, today))}` with

```tsx
bubble={said ?? (sleepy ? null : doneToday && chestOpened ? OFFER : worldLine(world, today))}
```

(Measured in WebKit: putting the question on the card — a line above the button, or as the button's own words — wraps the done card to an extra row on the iPhone SE and iPhone Safari sizes, and Truffle's bubble then overlaps 今日一字. In his bubble it costs no room; `home-done` fits at every size.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/app/home.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/HomeScreen.tsx src/app/home.test.tsx
git commit -m "feat: offer the second lesson softly — Truffle asks 想再学一课吗？ and 再学一课 is the quiet button"
```

---

### Task 12: WebKit — the Say card, six options and the review queue; full suite and build

**Files:**
- Modify: `scripts/fit-check.ts` (`signature`'s marks; a `say` flow after `const only = …`)
- Modify: `scripts/stage-cases/page.tsx` (imports; a `listen` case), `scripts/stage-cases.ts` (the per-size loop)

**Interfaces:**
- Consumes: `ListenRows` (Task 10); the `.say`, `.say__after`, `.choices--six`, `.listen__row`, `.listen__verdict` classes (Tasks 4, 6, 10); the pretend microphone already in `fit-check.ts`'s `open()` (a fake `MediaRecorder` and an oscillator stream).
- Produces: fit flow `say`; screenshots `fit-shots/<size>/say-NN.png` and `fit-shots/stage-cases/listen-<size>.png`.

Measured while planning: in Playwright's WebKit test contexts an IndexedDB `put` of a record holding a `Blob` aborts (the transaction errors with `null`), so a take recorded during the sweep cannot be stored there, and the Listen & confirm queue cannot be filled through the app. The sweep therefore checks that recording works in WebKit (the card reaches its 听一听 state, which needs `MediaRecorder` to start, stop and hand back a blob) and that the take's Say card is made; the review queue is screenshotted by the stage cases with takes in memory. (On the iPad, recordings in IndexedDB already work for 朗读.)

- [ ] **Step 1: Add the `listen` stage case**

In `scripts/stage-cases/page.tsx`, after `import { PAW_TRACKS, type Reaction } from '../../src/ui/truffle/timelines';` add:

```ts
import { ListenRows } from '../../src/parent/ListenPanel';
import type { Recording } from '../../src/types';
```

and before `else if (which === 'intro-school-idiom') {` add:

```tsx
else if (which === 'listen') {
  // the parent's review queue (spec 2026-10-11 §6, §8): takes kept in memory — WebKit's test contexts can't store a Blob in IndexedDB
  const words = builtinWords(0);
  const said = [...['森', '林', '游', '泳'].map((t) => words.find((x) => x.text === t)!), ladderWords().find((w) => w.text === '森林') ?? ladderWords()[0]!];
  const takes: Recording[] = said.map((w, i) => ({ id: `t${i}`, createdAt: new Date(2026, 9, 11, 17, i * 3).getTime(), prompt: { kind: 'say', wordId: w.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2 }));
  render(
    <div class="screen screen--scroll parent">
      <main class="parent__body">
        <section class="panel listen"><h2>Listen & confirm</h2><ListenRows takes={takes} words={new Map(said.map((w) => [w.id, w]))} onJudge={() => {}} /></section>
      </main>
    </div>,
    app,
  );
}
```

In `scripts/stage-cases.ts`, at the end of the first `for (const size of SIZES)` loop, replace

```ts
  problems.push(...(await cardClipped(page, `${size.name} build done`)));
  await page.close();
}
```

with the same lines plus the queue's check before `await page.close();`:

```ts
  // the parent's Listen & confirm queue (spec 2026-10-11 §6, §8): looked at on every size, ✓ and ✗ big enough to tap
  await page.goto(`file://${dir}/index.html?case=listen`);
  await page.waitForSelector('.listen__row');
  await page.screenshot({ path: `fit-shots/stage-cases/listen-${size.name}.png`, fullPage: true });
  for (const b of await page.$$('.listen__verdict button')) {
    const box = await b.boundingBox();
    if (!box || Math.min(box.width, box.height) < 43.5) problems.push(`${size.name} listen: ✓/✗ under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`);
  }
```

- [ ] **Step 2: Add the `say` flow to the fit sweep**

In `scripts/fit-check.ts`, in `signature()` replace the `marks` line with:

```ts
  const marks = ['.home', '.usage-opts', '.intro', '.pond', '.bubbles', '.langdu', '.kantu', '.kantu__ask', '.kantu__model', '.celebrate', '.chest', '.room', '.zika-grid', '.setup', '.pinpad', '.choices', '.choices--six', '.say', '.say__after', '.arrival', '.zika-big', '.rotate-hint'];
```

and right after the line `  const only = (...ks: ActivityKind[]): Record<ActivityKind, boolean> => ({ … });` add:

```ts
  // Say cards (spec 2026-10-11 §8): every Say screen at every size, recorded with the pretend microphone in WebKit (MediaRecorder
  // differs in Safari): the card must reach its 听一听 state and leave a Say card behind. (The take itself isn't stored here:
  // WebKit's test contexts can't put a Blob in IndexedDB; the review queue is screenshotted by the stage cases instead.)
  await run('say', AFTERNOON, { activities: only('practice') }, async (p) => {
    await startLesson(p);
    await walkLesson(p, size, 'say');
    const seen = (mark: string) => results.some((r) => r.size === size.name && r.flow === 'say' && r.sig.includes(mark));
    if (!seen('.say')) results.push({ size: size.name, flow: 'say', step: -1, sig: '', problems: ['no Say card came in 练一练'] });
    else if (!seen('.say__after')) results.push({ size: size.name, flow: 'say', step: -1, sig: '', problems: ['a Say card never finished recording in WebKit'] });
    const made = await p.evaluate(async () => {
      const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('hanzi-buddy'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
      const cards: { kind: string }[] = await new Promise((ok, no) => { const q = db.transaction('cards').objectStore('cards').getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
      db.close();
      return cards.filter((c) => c.kind === 'say').length;
    });
    if (!made) results.push({ size: size.name, flow: 'say', step: 98, sig: 'cards', problems: ['no Say card was made from a take'] });
  });
```

(The fit profile places 80 words with Read passed, so the plan has 6 Say words; the existing `advance()` already taps 开始录音, 停止 and the sheet's 继续. The `practice` and `lesson` flows now meet Say cards and six-option questions too.)

- [ ] **Step 3: Type-check, build, and run the whole WebKit sweep**

Run: `npx tsc --noEmit && npm run fit`
Expected: `… screens checked, 0 with problems.` then `stage cases: ok` and the story walk passing; exit 0. If it exits 2 (WebKit missing), stop and ask the user before `npx playwright-core install webkit` (~100 MB). Under heavy machine load a flow can crash on a timeout that has nothing to do with this work (`flow took over 3 minutes`, or `waiting for locator('.screen:not(.loading)')` as the app boots — seen once on `placement` while planning, clean on a rerun): rerun that flow alone, e.g. `FIT_ONLY='^placement$' npx tsx scripts/fit-check.ts`, then `npx tsx scripts/stage-cases.ts && npx tsx scripts/story-walk.ts` if `npm run fit` stopped early. Measured while planning: 878 screens, no other problem.

- [ ] **Step 4: Look at the screenshots**

Open `fit-shots/ipad-portrait/say-*.png` and `fit-shots/ipad-landscape/say-*.png`: a Say card (the word large, no pinyin, the microphone; then 听一听！ with the model button and 再录一次) and a six-option question laid out three across. Open `fit-shots/stage-cases/listen-ipad-landscape.png` and `listen-ipad-portrait.png`: rows with the word and pinyin, his take, the model button, ✓ and ✗.

- [ ] **Step 5: The full suite and the production build**

Run: `npx vitest run && npm run build`
Expected: every test passes (about 1797), and the build succeeds. A rendered test that times out only under heavy load passes when its file is run alone (`npx vitest run <file>`).

- [ ] **Step 6: Commit**

```bash
git add scripts/fit-check.ts scripts/stage-cases.ts scripts/stage-cases/page.tsx
git commit -m "test: WebKit sweep for Say cards (fake microphone) and six options; the review queue in the stage cases"
```
