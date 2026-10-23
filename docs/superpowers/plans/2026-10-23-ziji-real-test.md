# A 练一练 That Really Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 练一练 tests what he really knows:
- earlier words get their first question before new words repeat;
- some earlier words each lesson are written from memory (默写);
- a 组词 gap can't be passed by recognising the one familiar character;
- a tap too fast to have read the question is not counted as knowing;
- the parent sees, per word, from-memory results against tap-only ones.

**Architecture:** The pure rules live in small modules:
- `src/session/round.ts`: the round's order (§3).
- `src/session/guess.ts` with `GUESS_MS` in `src/srs/scheduler.ts`: the guess guard (§6).
- `src/activities/flashcards/meaning.ts`: the 组词 gap's choices (§5).
- `src/session/recallPick.ts`: which words get a 默写 (§4).
- `src/stats/fromMemory.ts`: how a word was last got right, for the planner and the parent (§4, §7).

The planner (`buildSessionPlan`) saves `plan.recall`, and `planPractice` swaps those words' first appearances for `ask: 'recall'` items (`withRecall`). `recordRecall` in `src/session/record.ts` grades a 默写. A new `RecallQuestion` (hanzi-writer, no outline) asks it, and `PracticeQuestion` falls back to the replaced question when strokes can't load. `SessionScreen` records it. The parent's Words panel gets a line per word, and Progress gets a week line. There is no DB version change: `ReviewLog.source` gains `'recall'` and `ReviewLog` gains `guess`.

**Tech Stack:** Preact 10, TypeScript 5.9, idb 8, ts-fsrs 5, hanzi-writer 3, Vitest 4 (jsdom, fake-indexeddb), playwright-core 1.52 (WebKit) for the stage cases.

**Spec:** `docs/superpowers/specs/2026-10-23-ziji-real-test-design.md` (approved 2026-10-23). Read it first: every § below refers to it.

## Global Constraints

- 练一练's time box is unchanged in length (`plan.practiceTimeBoxMs`). What yields is new words' extra repeats.
- `GUESS_MS` = 900. A right tap faster than 900 ms is rated **Hard**, whatever `produced` is, and settles no rung. Wrong taps are unchanged (Again). Truffle says 「慢慢看，想好再点」 once, after the second guess of a lesson. No penalty and no timer shown.
- 默写 (`ask: 'recall'`):
  - 3 a lesson under 20 minutes, 4 at 20 or more.
  - Revision words only, each with a write card (a 词语 only when all its characters have one).
  - Never a word introduced today, and never one written in 写一写 today.
  - **Right** = finished with at most 1 miss and no hint. The hint comes after 2 misses on a stroke.
- 默写 is on whenever 写一写 is (`settings.activities.writing`) and 练一练 is. There is no new setting.
- 组词 gap (§5):
  - Every choice is a begun character when at least 3 qualify. Up to 2 of them are look-alikes (`lookAlikeChars`).
  - No choice makes a word with the cue (HSK, his own words, the built-in 组词).
  - A revision word gets 6 choices when 5 qualify, else 4. Today's new words keep 4.
  - 都不对 is unchanged: one in five, never on a first question or a new word.
- Data: a new `Ask` value `'recall'`, a new `ReviewLog.source` value `'recall'`, and a new optional `ReviewLog.guess`. **No DB version change.**
- Kid-facing text:
  - No 儿化 (`src/noErhua.test.ts`) and no emoji in child source (`src/childEmoji.test.ts`). The parent area is exempt; `✓`/`✗` are not emoji.
  - Every `speak()` and `<SpeakButton>` passes a `reading` (`src/audio/loneReading.test.ts`).
  - New child lines: 「慢慢看，想好再点」 (a bubble, not spoken), 「听一听，写出来！」, 「写对了！」, 「记住它的样子！」.
- The parent area keeps English labels and may scroll. Child screens stay one screen. Every layout change is checked in **WebKit** through the stage cases (`npx tsx scripts/stage-cases.ts`), not only Chromium.
- Commit after each task with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A lesson planned before this change, resumed after it.** Its plan has no `recall` and its queue has no `'recall'` items. He expects it to carry on as before, with no 默写 and no crash. Pinned in Task 6 ("a lesson planned before 默写 asks none").
2. **A 默写 word paused by the parent between planning and 练一练.** He expects no 默写 of a paused word; it is left out like any paused word. Pinned in Task 6 (same test).
3. **Strokes that fail to load mid-lesson (offline, uncached).** He expects the word's normal question instead, graded as an ordinary tap and not as a recall. Pinned in Task 7 (component) and Task 8 ("strokes that can't load").
4. **Two due words that share a character (草 and 花草).** He expects to write 草 once that lesson, not twice. Pinned in Task 4 ("two due words sharing a character").
5. **A character whose only cue is spoken (no 组词 gap, no sentence).** By ear alone it could be any same-sound character, so it is never a 默写. Pinned in Task 4 ("a word whose cue is only spoken").

---

## File map

| Path | Responsibility |
|---|---|
| `src/session/round.ts` | §3 order; `Ask` gains `'recall'`; `PracticeItem.recall` (`RecallAsk`) |
| `src/srs/scheduler.ts` | `GUESS_MS`, `tooFast`, `toRating`'s `guess` |
| `src/ladder/rungs.ts` | `passDays` ignores guesses |
| `src/session/guess.ts` (new) | `isGuess`, `afterGuess`, `GUESS_NUDGE` |
| `src/activities/flashcards/meaning.ts` | `pickSoundAlikes`'s `begun` rule, look-alikes, own-word check |
| `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/practice/PracticeQuestion.tsx` | `begun` / `few` props; the 默写 branch and its fallback |
| `src/stats/stats.ts` | `Knowledge.begunTexts` |
| `src/stats/fromMemory.ts` (new) | `isMadeRight`, `isTap`, `rightHistory`; later `wordEvidence`, `evidenceLine`, `weekFromMemory` |
| `src/session/recallPick.ts` (new) | `pickRecall`, `recallTarget` |
| `src/session/plan.ts`, `src/session/writing.ts` | `plan.recall`; `pickWriteUnits`'s `exclude` |
| `src/session/record.ts`, `src/session/writeCredit.ts` | `recordRecall`, `recordWriting`'s `source`, `recallRight`, `HISTORY_DAYS` in `planNow` |
| `src/session/practice.ts`, `src/session/runner.ts` | `withRecall`; no retry for a missed 默写 |
| `src/activities/practice/RecallQuestion.tsx` (new) | The 默写 screen |
| `src/app/SessionScreen.tsx` | Guess guard and nudge; `begun` / `newToday`; recording a 默写 |
| `src/parent/WordsPanel.tsx`, `src/parent/ProgressPanel.tsx`, `src/parent/ParentArea.tsx`, `src/styles.css` | §7 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | §9 WebKit cases |

---

### Task 1: Earlier words first (round order, §3)

**Files:**
- Modify: `src/session/round.ts` (`buildRound`)
- Test: `src/session/round.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildRound(words, canAsk, rng)`, same signature. The preference for each pick is now:
  1. a word missed in 认新字 (`early`) or a **due** revision word, first appearance;
  2. a climbing word's **2nd** appearance that is ready again;
  3. the other first appearances (new words, non-due revision);
  4. a climbing word's 3rd or later appearance that is ready;
  5. the soonest-due waiting word;
  6. the same word again.

  Ruling: the spec's test ("the cut falls on new words' 3rd appearances") can't hold if every climbing appearance outranks first appearances. With 12 new words, the last new words' *first* appearances were cut. So only the 2nd appearance keeps rank 2.

- [ ] **Step 1: Write the failing test**

Append to `src/session/round.test.ts`:

```ts

describe('earlier words first (real test spec 2026-10-23 §3)', () => {
  const dueRev = (id: string): RoundWord => ({ wordId: id, isNew: false, from: 3, appearances: 1, gradesRecognise: true, gradesMeaning: false, due: true });
  const day = () => [...Array.from({ length: 12 }, (_, i) => fresh(`n${i}`)), ...Array.from({ length: 10 }, (_, i) => dueRev(`d${i}`))];
  const BOX = Math.floor((5 * 60_000) / 8000); // a 5-minute box at ITEM_MS (8 s) an item
  it('every due revision word’s first appearance comes before any new word’s repeat, and before the 13th item', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = buildRound(day(), all, mulberry32(seed));
      const dueAt = r.map((x, i) => (x.due ? i : -1)).filter((i) => i >= 0);
      expect(dueAt, `seed ${seed}`).toHaveLength(10);
      expect(Math.max(...dueAt), `seed ${seed}`).toBeLessThan(12);
      const firstRepeat = r.findIndex((x, i) => x.wordId.startsWith('n') && r.slice(0, i).some((y) => y.wordId === x.wordId));
      expect(firstRepeat, `seed ${seed}`).toBeGreaterThan(Math.max(...dueAt));
    }
  });
  it('what a 5-minute box cuts is new words’ later appearances, never a due first appearance', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const cut = buildRound(day(), all, mulberry32(seed)).slice(BOX);
      expect(cut.length, `seed ${seed}`).toBeGreaterThan(0);
      expect(cut.every((x) => x.wordId.startsWith('n') && x.rung === 3), `seed ${seed}`).toBe(true);
    }
  });
  it('a word missed in 认新字 still comes first, before due revision', () => {
    const r = buildRound([fresh('n0', true), ...day().slice(1)], all, mulberry32(3));
    expect(r[0]!.wordId).toBe('n0');
    expect(r[1]!.due).toBe(true);
  });
  it('spacing still holds: a new word’s second appearance waits its gap behind the due revision', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const [id, at] of positions(buildRound(day(), all, mulberry32(seed)))) {
        for (let k = 1; k < at.length; k++) expect(at[k]! - at[k - 1]!, `seed ${seed} ${id}`).toBeGreaterThanOrEqual(k === 1 ? 3 : 5);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/session/round.test.ts`
Expected: FAIL. "every due revision word's first appearance…" fails because new words' firsts come before due ones, and "what a 5-minute box cuts" fails because the cut holds 2nd appearances.

- [ ] **Step 3: Implement the order**

In `src/session/round.ts`, replace:

```ts
  const firsts: Slot[] = [...early, ...most([...news, ...revs.filter((s) => s.w.due)]), ...most(revs.filter((s) => !s.w.due))];
```

with:

```ts
  const firsts: Slot[] = [...early, ...most(revs.filter((s) => s.w.due)), ...most(news), ...most(revs.filter((s) => !s.w.due))];
```

and replace:

```ts
    const started = others.filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const fresh = firsts.filter((s) => s.next === 0 && s.w.wordId !== lastWord);
    const waiting = others.filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    const order = [...started, ...fresh, ...waiting, ...left()];
```

with:

```ts
    const started = others.filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const fresh = firsts.filter((s) => s.next === 0 && s.w.wordId !== lastWord);
    const first = fresh.filter((s) => s.w.early || (!s.w.isNew && s.w.due)); // missed in 认新字, then due revision (spec 2026-10-23 §3)
    const waiting = others.filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    // a climbing word's second appearance, then the other first appearances, then third and later ones: those are what time cuts
    const second = started.filter((s) => s.next === 1);
    const order = [...first, ...second, ...fresh.filter((s) => !first.includes(s)), ...started.filter((s) => s.next > 1), ...waiting, ...left()];
```

Also update the comment above `const started` to:

```ts
    // in order of preference (real test spec 2026-10-23 §3): a word missed in 认新字 or a due revision word's first appearance, a
    // climbing word's second appearance, the other first appearances, a climbing word's later appearances, then whoever is due
    // soonest (spacing gives way before a word repeats back to back), and last of all the same word again
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/session`
Expected: PASS. That includes the existing round, practice, runner and plan tests ("new words start before revision" still holds, because its revision words aren't due).

- [ ] **Step 5: Commit**

```bash
git add src/session/round.ts src/session/round.test.ts
git commit -m "$(cat <<'EOF'
练一练: due revision's first questions before new words repeat (real test §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Too fast to count (§6)

**Files:**
- Modify: `src/srs/scheduler.ts`, `src/types.ts` (`ReviewLog`), `src/ladder/rungs.ts` (`passDays`), `src/session/record.ts` (`TapOutcome`, `rateTap`, `recordUse`), `src/app/SessionScreen.tsx` (`onPracticeDone`)
- Create: `src/session/guess.ts`
- Test: `src/srs/scheduler.test.ts`, `src/session/guess.test.ts`, `src/session/record.test.ts`, `src/app/guessNudge.test.tsx`

**Interfaces:**
- Consumes: `PracticeItem`, `Ask` from `src/session/round.ts`; `requestGreeting(line)` from `src/ui/truffle/greeting.ts`. The next Truffle to appear says the line in its bubble for 2.4 s; nothing is spoken, so no `reading` is needed.
- Produces:
  - `GUESS_MS = 900` and `tooFast(responseMs: number): boolean` (`< GUESS_MS`) in `src/srs/scheduler.ts`.
  - `Outcome`'s tap variant gains `guess?: boolean`. A right guess rates `Rating.Hard`.
  - `ReviewLog.guess?: true`. `passDays` skips a guess, so it never counts toward a pass on any later day.
  - `TapOutcome.guess?: boolean` in `record.ts`.
  - `recordUse(db, wordId, correct, now, responseMs = 0, slow?, guess = false)`.
  - `isGuess(item: PracticeItem, r: { correct: boolean; responseMs: number }): boolean`.
  - `afterGuess(seen: { count: number; nudged: boolean }, guess: boolean): { count: number; nudged: boolean; nudge: boolean }`.
  - `GUESS_NUDGE = '慢慢看，想好再点'`.
- Ruling: the guard is for 练一练 answers only (`onPracticeDone`), not 认新字.
- Ruling: one-tap asks are `read, listen, hear, meaningRead, word, match, whole, fit, usage, understand, idiom, idiomFit, fish`. A list's 连一连 board (`item.list.pairs`) and an item whose answer is 都不对 (`none: 'answer'` or legacy `true`) are never guesses.

- [ ] **Step 1: Write the failing tests**

Append to `src/srs/scheduler.test.ts`, and add `GUESS_MS` and `tooFast` to its import from `./scheduler`:

```ts

describe('too fast to count (real test spec 2026-10-23 §6)', () => {
  it('a right tap under 900 ms is a guess, at 901 ms it is not', () => {
    expect(GUESS_MS).toBe(900);
    expect(tooFast(899)).toBe(true);
    expect(tooFast(901)).toBe(false);
  });
  it('a guess rates Hard, whatever produced is; a wrong guess stays Again', () => {
    for (const state of [State.New, State.Learning, State.Review]) {
      expect(toRating({ kind: 'recognise', correct: true, responseMs: 899, produced: true, state, guess: true })).toBe(Rating.Hard);
      expect(toRating({ kind: 'recognise', correct: false, responseMs: 899, produced: true, state, guess: true })).toBe(Rating.Again);
    }
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 901, produced: true, state: State.Review })).toBe(Rating.Good);
  });
});
```

The import line becomes:

```ts
import { GUESS_MS, isKnown, localDayGap, newCard, review, schedulerParams, seededKnownCard, setSchedulerParams, snapshot, toRating, tooFast, validParams } from './scheduler';
```

Create `src/session/guess.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { afterGuess, GUESS_NUDGE, isGuess } from './guess';
import type { PracticeItem } from './round';

const item = (over: Partial<PracticeItem> = {}): PracticeItem => ({ wordId: 'b:草', rung: 1, ask: 'read', grades: 'recognise', retry: false, ...over });

describe('too fast to count (real test spec 2026-10-23 §6)', () => {
  it('a right tap under 900 ms is a guess; at 901 ms it is not', () => {
    expect(isGuess(item(), { correct: true, responseMs: 899 })).toBe(true);
    expect(isGuess(item(), { correct: true, responseMs: 901 })).toBe(false);
  });
  it('a wrong tap is never a guess (it stays Again)', () => {
    expect(isGuess(item(), { correct: false, responseMs: 300 })).toBe(false);
  });
  it('连一连, 组句, a list board and the 都不对 answer are left out: they take longer anyway', () => {
    for (const ask of ['pair', 'family', 'build', 'idiomBuild', 'say', 'sentence'] as const) expect(isGuess(item({ ask }), { correct: true, responseMs: 300 }), ask).toBe(false);
    expect(isGuess(item({ ask: 'match', list: { listId: 'l', form: 'dapei', pairs: [] } }), { correct: true, responseMs: 300 })).toBe(false);
    expect(isGuess(item({ ask: 'word', none: 'answer' }), { correct: true, responseMs: 300 })).toBe(false);
    expect(isGuess(item({ ask: 'word', none: 'decoy' }), { correct: true, responseMs: 300 })).toBe(true); // the real answer, picked fast
  });
  it('Truffle nudges once, after the second guess of the lesson', () => {
    let seen = { count: 0, nudged: false };
    const nudges: boolean[] = [];
    for (const g of [true, false, true, true, true]) {
      const next = afterGuess(seen, g);
      nudges.push(next.nudge);
      seen = { count: next.count, nudged: next.nudged };
    }
    expect(nudges).toEqual([false, false, true, false, false]);
    expect(GUESS_NUDGE).toBe('慢慢看，想好再点');
  });
});
```

Append to `src/session/record.test.ts` (the imports it uses are already in the file: `addReviewLog`, `putCards`, `logsSince`, `seededKnownCard`, `markProduced`, `recordRecognition`, `recordUse`, `Rating`, `freshDb`, `now`):

```ts

describe('too fast to count (real test spec 2026-10-23 §6)', () => {
  const yesterday = new Date(2026, 9, 1, 9);
  const rightYesterday = async (db: Awaited<ReturnType<typeof freshDb>>) => {
    await putCards(db, [{ id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: { ...seededKnownCard(yesterday, 1) } }]);
    await addReviewLog(db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: yesterday.getTime(), rating: Rating.Good, correct: true, responseMs: 2000 });
  };
  it('a guess (899 ms) rates Hard even when produced, is logged as a guess, and settles no rung', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await rightYesterday(db);
    const card = await recordRecognition(db, 'b:大', { correct: true, responseMs: 899, guess: true }, now);
    const log = (await logsSince(db, now.getTime()))[0]!;
    expect(log).toMatchObject({ rating: Rating.Hard, correct: true, guess: true });
    expect(card.passed).toBeUndefined(); // two right days, but today's was a guess
  });
  it('a right tap at 901 ms is as before: Good when produced, and the second right day passes the rung', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await rightYesterday(db);
    const card = await recordRecognition(db, 'b:大', { correct: true, responseMs: 901 }, now);
    expect((await logsSince(db, now.getTime()))[0]!).toMatchObject({ rating: Rating.Good });
    expect(card.passed).toBe(now.getTime());
  });
  it('a 选一选 guess through recordUse rates the meaning card Hard', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:很');
    await recordUse(db, 'b:很', true, now, 500, undefined, true);
    expect((await logsSince(db, 0)).find((l) => l.kind === 'meaning')).toMatchObject({ rating: Rating.Hard, guess: true });
  });
});
```

Create `src/app/guessNudge.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { Rating } from 'ts-fsrs';
import { logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { makeCard, markProduced } from '../test/fixtures';
import { SessionScreen } from './SessionScreen';

const words = builtinWords(0);
const three = ['大', '小', '山'].map((t) => words.find((w) => w.text === t)!);

describe('too fast to count in a lesson (real test spec 2026-10-23 §6)', () => {
  it('a right tap at once rates Hard though the word is produced; after the second, Truffle says 「慢慢看，想好再点」', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    for (const w of three) await markProduced(app.db, w.id);
    await putCards(app.db, three.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 1), true)));
    const rec = createSessionRecord({ steps: ['practice'], reviewWordIds: three.map((w) => w.id), newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, practiceTimeBoxMs: 300_000 }, '2026-10-02', app.now().getTime());
    const queue = three.map((w) => ({ wordId: w.id, rung: 1 as const, ask: 'read' as const, grades: 'recognise' as const, retry: false, due: true }));
    await saveSession(app.db, { ...rec, activeMs: 1000, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 });
    renderWithApp(<SessionScreen free={false} />, app);
    for (const w of three.slice(0, 2)) {
      fireEvent.click(await screen.findByRole('button', { name: w.pinyin })); // at once: well under 900 ms
      fireEvent.click(await screen.findByText('继续'));
    }
    await waitFor(() => expect(document.querySelector('.pet__bubble')?.textContent).toContain('慢慢看，想好再点'));
    const logs = await logsSince(app.db, 0);
    expect(logs.filter((l) => l.kind === 'recognise').map((l) => [l.rating, l.guess])).toEqual([[Rating.Hard, true], [Rating.Hard, true]]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/srs/scheduler.test.ts src/session/guess.test.ts src/session/record.test.ts src/app/guessNudge.test.tsx`
Expected: FAIL. `GUESS_MS`/`tooFast` aren't exported, `./guess` doesn't exist, the guess logs rate Good, and there's no nudge.

- [ ] **Step 3: Implement**

In `src/srs/scheduler.ts`, replace:

```ts
/** The slow line before he has 10 answers of a kind (spec §3.2). */
export const SLOW_ANSWER_MS = 6000;

export type Outcome =
  | { kind: TapKind; correct: boolean; responseMs: number; produced: boolean; state: State; slowMs?: number }
```

with:

```ts
/** The slow line before he has 10 answers of a kind (spec §3.2). */
export const SLOW_ANSWER_MS = 6000;

/** A right tap faster than this, from the moment the choices appear, is too fast to have read the question (real test spec §6). */
export const GUESS_MS = 900;
export const tooFast = (responseMs: number): boolean => responseMs < GUESS_MS;

export type Outcome =
  | { kind: TapKind; correct: boolean; responseMs: number; produced: boolean; state: State; slowMs?: number; guess?: boolean }
```

and replace:

```ts
  if (!o.correct) return Rating.Again;
  if (o.responseMs > (o.slowMs ?? SLOW_ANSWER_MS)) return Rating.Hard;
```

with:

```ts
  if (!o.correct) return Rating.Again;
  if (o.guess) return Rating.Hard; // too fast to have read it: Hard, whatever produced is (real test spec §6)
  if (o.responseMs > (o.slowMs ?? SLOW_ANSWER_MS)) return Rating.Hard;
```

In `src/types.ts` (`ReviewLog`), after the `placedCheck?: true; …` line, add:

```ts
  guess?: true; // a right tap faster than GUESS_MS (real test spec 2026-10-23 §6): rated Hard, and never a day toward a pass
```

In `src/ladder/rungs.ts` (`passDays`), replace:

```ts
  return [...firsts.values()].filter((l) => l.correct && !(typeof l.responseMs === 'number' && l.responseMs < fastMs)).map((l) => l.at);
```

with:

```ts
  return [...firsts.values()].filter((l) => l.correct && !l.guess && !(typeof l.responseMs === 'number' && l.responseMs < fastMs)).map((l) => l.at);
```

In `src/session/record.ts`, replace:

```ts
/** A tap answer: right or not, how long it took, and this lesson's slow lines (spec §3.2; absent: 6 s). */
export interface TapOutcome { correct: boolean; responseMs: number; slow?: SlowLines }
```

with:

```ts
/** A tap answer: right or not, how long it took, and this lesson's slow lines (spec §3.2; absent: 6 s). `guess`: right, but too
 *  fast to have read the question (real test spec §6): Hard, logged as a guess, so it never counts toward a pass. */
export interface TapOutcome { correct: boolean; responseMs: number; slow?: SlowLines; guess?: boolean }
```

In `rateTap`, replace:

```ts
  const rating = toRating({ kind, correct: o.correct, responseMs: ratedMs, produced, state, slowMs: o.slow?.[kind] });
  const { card, before } = await reviewCard(db, wordId, kind, rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind, at: now.getTime(), rating, correct: o.correct, responseMs: o.responseMs, ...before, ...extra });
```

with:

```ts
  const guess = o.correct && !!o.guess;
  const rating = toRating({ kind, correct: o.correct, responseMs: ratedMs, produced, state, slowMs: o.slow?.[kind], guess });
  const { card, before } = await reviewCard(db, wordId, kind, rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind, at: now.getTime(), rating, correct: o.correct, responseMs: o.responseMs, ...before, ...extra, ...(guess ? { guess: true as const } : {}) });
```

In `recordUse`, replace:

```ts
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0, slow?: SlowLines): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  // he reads a sentence (or two) first: that time doesn't make a right answer Hard
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs, ratedMs: Math.max(0, responseMs - USE_READING_MS), slow }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
```

with:

```ts
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0, slow?: SlowLines, guess = false): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  // he reads a sentence (or two) first: that time doesn't make a right answer Hard
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs, ratedMs: Math.max(0, responseMs - USE_READING_MS), slow, guess }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
```

Create `src/session/guess.ts`:

```ts
// Too fast to count (real test spec 2026-10-23 §6): a right tap on a one-tap choice question faster than GUESS_MS from when the
// choices appear is rated Hard, settles no rung, and after the second one in a lesson Truffle says 「慢慢看，想好再点」 once.
import { tooFast } from '../srs/scheduler';
import type { Ask, PracticeItem } from './round';

/** Questions answered by one tap among choices. Not 连一连 (pair, family, a list board), 组句 (build, idiomBuild), Say, 说一句 or 默写. */
const ONE_TAP: ReadonlySet<Ask> = new Set<Ask>(['read', 'listen', 'hear', 'meaningRead', 'word', 'match', 'whole', 'fit', 'usage', 'understand', 'idiom', 'idiomFit', 'fish']);

/** What Truffle says after the second guess of a lesson: no penalty, no timer shown. */
export const GUESS_NUDGE = '慢慢看，想好再点';

/** A right answer too fast to have read the question. Never a wrong one, a board or tiles, or 都不对 picked as the answer. */
export function isGuess(item: PracticeItem, r: { correct: boolean; responseMs: number }): boolean {
  if (!r.correct || !ONE_TAP.has(item.ask) || item.list?.pairs || item.none === 'answer' || item.none === true) return false;
  return tooFast(r.responseMs);
}

/** The lesson's guesses so far and whether Truffle has nudged: after this answer, the new count and whether to nudge now. */
export function afterGuess(seen: { count: number; nudged: boolean }, guess: boolean): { count: number; nudged: boolean; nudge: boolean } {
  if (!guess) return { ...seen, nudge: false };
  const count = seen.count + 1;
  const nudge = count >= 2 && !seen.nudged;
  return { count, nudged: seen.nudged || nudge, nudge };
}
```

In `src/app/SessionScreen.tsx`:

1. After `import { settleLessonStars } from '../session/stars';` add:

```ts
import { afterGuess, GUESS_NUDGE, isGuess } from '../session/guess';
```

2. After `const planning = useRef(false); // 练一练's round is being built (it reads his rungs)` add:

```ts
  const guesses = useRef({ count: 0, nudged: false }); // right taps too fast to count this lesson (real test spec §6)
```

3. In `onPracticeDone`, replace:

```ts
      let sent = false;
      if (!rec.free && !item.retry && !gone(item.wordId)) {
        // a sentence takes reading time first: that doesn't make a right answer slow (as in 选一选)
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' || r.inContext ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs, slow: state.slow };
```

with:

```ts
      let sent = false;
      const guess = isGuess(item, r); // too fast to have read it (real test spec §6): Hard, and no rung
      if (!rec.free && !item.retry && !gone(item.wordId)) {
        // a sentence takes reading time first: that doesn't make a right answer slow (as in 选一选)
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' || r.inContext ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs, slow: state.slow, guess };
```

4. Replace `await recordUnderstand(db, item.wordId, { correct: r.correct, responseMs: r.responseMs, slow: state.slow }, now()));` with:

```ts
await recordUnderstand(db, item.wordId, { correct: r.correct, responseMs: r.responseMs, slow: state.slow, guess }, now()));
```

5. Replace `await recordUse(db, item.wordId, r.correct, now(), r.responseMs, state.slow));` with:

```ts
await recordUse(db, item.wordId, r.correct, now(), r.responseMs, state.slow, guess));
```

6. Replace:

```ts
        if (item.ask !== 'fish' && item.ask !== 'understand' && !item.list) await noteRung(db, item.wordId, item.rung, r.correct, now()); // a listening answer isn't reading progress (plan 2b); a weekly list's extra item isn't a ladder rung
```

with:

```ts
        if (item.ask !== 'fish' && item.ask !== 'understand' && !item.list && !guess) await noteRung(db, item.wordId, item.rung, r.correct, now()); // a listening answer isn't reading progress (plan 2b); a weekly list's extra item isn't a ladder rung; a guess doesn't climb
```

7. Replace:

```ts
        await noteListPractice(item, r);
      }
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
```

with:

```ts
        await noteListPractice(item, r);
      }
      // the second guess of the lesson: the next Truffle says 「慢慢看，想好再点」, once (no penalty, no timer shown)
      const g = afterGuess(guesses.current, guess);
      guesses.current = { count: g.count, nudged: g.nudged };
      if (g.nudge) requestGreeting(GUESS_NUDGE);
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/srs/scheduler.test.ts src/session/guess.test.ts src/session/record.test.ts src/app/guessNudge.test.tsx src/ladder && npx vitest run src/app && npx tsc --noEmit`
Expected: PASS. The other app tests tap at once too, but none of them asserts a practice rating or a bubble that the nudge would cover for long.

- [ ] **Step 5: Commit**

```bash
git add src/srs/scheduler.ts src/srs/scheduler.test.ts src/types.ts src/ladder/rungs.ts src/session/record.ts src/session/record.test.ts src/session/guess.ts src/session/guess.test.ts src/app/SessionScreen.tsx src/app/guessNudge.test.tsx
git commit -m "$(cat <<'EOF'
练一练: a right tap under 900 ms is Hard and climbs nothing; Truffle says 慢慢看 once (real test §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 组词 gaps he can't guess (§5)

**Files:**
- Modify: `src/activities/flashcards/meaning.ts` (`pickSoundAlikes`), `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/practice/PracticeQuestion.tsx`, `src/stats/stats.ts` (`Knowledge`, `summarize`), `src/app/SessionScreen.tsx`
- Test: `src/activities/flashcards/meaning.test.ts`, `src/activities/practice/PracticeQuestion.test.tsx`, `src/stats/stats.test.ts`

**Interfaces:**
- Consumes: `lookAlikeChars(ch)` from `src/activities/components/zibian.ts`; `FEW_WRONG` (3) and `MANY_WRONG` (5) from `src/activities/flashcards/distractors.ts`.
- Produces:
  - `pickSoundAlikes(word, cue, pool, rng, n = 3, begun?: ReadonlySet<string>): string[]`:
    - `begun` holds the texts of the words he has begun.
    - With `begun` and at least `min(n, 3)` begun choices qualifying, the choices are begun only: up to `MAX_LOOK_ALIKES` (2) look-alikes of a single character first, then same sound, same initial, any.
    - With fewer, the choices fill from his level as before.
    - Always: no choice whose `cue.before + t + cue.after` is an HSK word, one of his pool's words, or any pool word's example (built-in 组词).
  - `MAX_LOOK_ALIKES = 2`.
  - `Knowledge.begunTexts: Set<string>`: the texts of words with a Read or Hear card.
  - `FlashcardStep` props `begun?: ReadonlySet<string>` and `few?: boolean`. `few` caps the gap at 4 choices.
  - `PracticeQuestion` props `begun?: ReadonlySet<string>` and `newToday?: boolean`.
- Ruling: when 3 or 4 begun choices qualify, those are all that is offered, so the step shows 4 choices, all begun. The begun tier also applies to 词语 gaps, ahead of `ownNear`.

- [ ] **Step 1: Write the failing tests**

In `src/activities/flashcards/meaning.test.ts`, after `import { mulberry32 } from '../../lib/random';` add:

```ts
import { lookAlikeChars } from '../components/zibian';
import { MANY_WRONG } from './distractors';
```

and append:

```ts

describe('组词 gaps he can’t guess (real test spec 2026-10-23 §5)', () => {
  const pool = builtinWords(0);
  const cao = pool.find((w) => w.text === '草')!;
  const di = { kind: 'word' as const, source: 'word' as const, full: '草地', pinyin: 'cǎo dì', before: '', after: '地' };
  const begun = new Set(Array.from('草花茶菜早吃次从出车春'));
  const makesWord = (c: string) => HSK_WORDS.has(c + '地') || pool.some((w) => w.text === c + '地' || w.examples?.some((e) => e.text === c + '地'));
  it('with 草 begun and the cue ＿地: every choice is begun, one or two are look-alikes, none makes a word with 地', () => {
    const alike = new Set(lookAlikeChars('草'));
    for (let seed = 1; seed < 30; seed++) {
      const out = pickSoundAlikes(cao, di, pool, mulberry32(seed), MANY_WRONG, begun);
      expect(out, `seed ${seed}`).toHaveLength(5);
      expect(out.every((c) => begun.has(c) && c !== '草'), `seed ${seed}: ${out}`).toBe(true);
      const looks = out.filter((c) => alike.has(c)).length;
      expect(looks, `seed ${seed}: ${out}`).toBeGreaterThanOrEqual(1);
      expect(looks, `seed ${seed}: ${out}`).toBeLessThanOrEqual(2);
      expect(out.filter(makesWord), `seed ${seed}`).toEqual([]);
    }
  });
  it('his own words count as words: a choice that makes one of them with the cue is never offered', () => {
    const own = [...pool, makeWord('花地', { id: 'p:花地', source: 'parent', rank: null, level: null })];
    for (let seed = 1; seed < 20; seed++) expect(pickSoundAlikes(cao, di, own, mulberry32(seed), MANY_WRONG, begun)).not.toContain('花');
  });
  it('3 or 4 begun characters qualify: those only (the step shows 4 choices)', () => {
    const out = pickSoundAlikes(cao, di, pool, mulberry32(4), MANY_WRONG, new Set(Array.from('草花茶吃次')));
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.every((c) => '花茶吃次'.includes(c))).toBe(true);
  });
  it('fewer than 3 begun characters qualify: the choices fill from his level, as before', () => {
    const out = pickSoundAlikes(cao, di, pool, mulberry32(5), 3, new Set(['草', '花']));
    expect(out).toHaveLength(3);
    expect(out.some((c) => c !== '花')).toBe(true);
  });
});
```

Append to `src/activities/practice/PracticeQuestion.test.tsx`:

```tsx

describe('组词 gaps he can’t guess (real test spec 2026-10-23 §5)', () => {
  const cao = pool.find((w) => w.text === '草')!;
  const begun = new Set(Array.from('草花茶菜早吃次从出车春'));
  const item = { wordId: cao.id, rung: 2 as const, ask: 'word' as const, grades: 'meaning' as const, retry: false };
  it('a revision word’s gap has 6 choices, all begun; a word introduced today keeps 4', () => {
    const { unmount } = render(<PracticeQuestion {...base} word={cao} item={item} begun={begun} onDone={vi.fn()} />);
    const texts = () => [...document.querySelectorAll('.choice')].map((b) => b.textContent!.trim());
    expect(texts()).toHaveLength(6);
    expect(texts().every((t) => begun.has(t))).toBe(true);
    unmount();
    render(<PracticeQuestion {...base} word={cao} item={item} begun={begun} newToday onDone={vi.fn()} />);
    expect(texts()).toHaveLength(4);
  });
});
```

In `src/stats/stats.test.ts` (`summarize` › 'counts the characters in words whose reading passed, and written cards'), after `expect(k.knownWordIds.has('p:1')).toBe(true);` add:

```ts
    expect([...k.begunTexts].sort()).toEqual(['人', '大', '朋友'].sort()); // begun: a Read or Hear card, passed or not (real test spec §5)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/activities/flashcards/meaning.test.ts src/activities/practice/PracticeQuestion.test.tsx src/stats/stats.test.ts`
Expected: FAIL. Choices aren't limited to begun characters, `花地` isn't checked, `begunTexts` is undefined, and a new word still gets 6.

- [ ] **Step 3: Implement**

In `src/activities/flashcards/meaning.ts`, after `import { syllableTone, toneless } from './tones';` add:

```ts
import { lookAlikeChars } from '../components/zibian';
```

Replace:

```ts
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const fits = (t: string) => HSK_WORDS.has(cue.before + t + cue.after);
  const own = new Set(pool.map((w) => w.text));
```

with:

```ts
/** Look-alikes among a gap's choices at most (real test spec 2026-10-23 §5): 草 among 早 and 苹. */
export const MAX_LOOK_ALIKES = 2;

const wordsOf = new WeakMap<Word[], Set<string>>();
/** Every word his pool knows as a word: his own (lists, ladder 词语) and every built-in 组词 (their examples), worked out once a pool. */
function knownWords(pool: Word[]): Set<string> {
  let out = wordsOf.get(pool);
  if (!out) wordsOf.set(pool, (out = new Set(pool.flatMap((w) => [w.text, ...(w.examples ?? []).map((e) => e.text)]))));
  return out;
}

/**
 * `begun` (real test spec 2026-10-23 §5): the words he has begun, by text. With it, every choice is one he has begun, so
 * familiarity can't single out the answer — up to 2 look-alikes of a single character first, then same sound, same initial —
 * when at least 3 qualify; fewer, and the choices fill from his level as before. No choice makes a word with the cue: HSK, his
 * own words or a built-in 组词.
 */
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3, begun?: ReadonlySet<string>): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const known = knownWords(pool);
  const fits = (t: string) => { const made = cue.before + t + cue.after; return HSK_WORDS.has(made) || known.has(made); };
  const own = new Set(pool.map((w) => w.text));
```

and replace the function's end:

```ts
  const ownNear = word.text.length > 1 ? near.filter((w) => own.has(w.text)) : [];
  const tiers = [sameSound(ownNear), ownNear, sameSound(near), sameInitial(near), near, sameSound(eligible), eligible];
  const out: string[] = [];
  for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= n) return out; if (!out.includes(w.text)) out.push(w.text); }
  return out;
```

with:

```ts
  const ownNear = word.text.length > 1 ? near.filter((w) => own.has(w.text)) : [];
  const out: string[] = [];
  const take = (tiers: Choice[][], cap = n) => { for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= cap) return; if (!out.includes(w.text)) out.push(w.text); } };
  if (begun) {
    const mine = eligible.filter((w) => begun.has(w.text));
    if (new Set(mine.map((w) => w.text)).size >= Math.min(n, 3)) {
      const alike = new Set(Array.from(word.text).length === 1 ? lookAlikeChars(word.text) : []);
      take([mine.filter((w) => alike.has(w.text))], Math.min(MAX_LOOK_ALIKES, n));
      take([sameSound(mine).filter((w) => !alike.has(w.text)), sameInitial(mine).filter((w) => !alike.has(w.text)), mine.filter((w) => !alike.has(w.text))]);
      return out;
    }
  }
  take([sameSound(ownNear), ownNear, sameSound(near), sameInitial(near), near, sameSound(eligible), eligible]);
  return out;
```

In `src/stats/stats.ts`:
- In `Knowledge`, after `begun: number; …` add:

  ```ts
    begunTexts: Set<string>; // those words' texts: a 组词 gap's choices are drawn from them (real test spec 2026-10-23 §5)
  ```

- In `summarize`'s return, after `begun: begunIds.size,` add:

  ```ts
      begunTexts: new Set([...begunIds].map((id) => word(id)!.text)),
  ```

In `src/activities/flashcards/FlashcardStep.tsx`:
1. Replace `import { alike, firstSense, fiveOrThree, MANY_WRONG, meaningChoices,` with `import { alike, FEW_WRONG, firstSense, fiveOrThree, MANY_WRONG, meaningChoices,`.
2. In `Props`, after `bare?: boolean;` add:

   ```ts
     /** the words he has begun, by text: a 组词 gap's choices come from them (real test spec 2026-10-23 §5) */
     begun?: ReadonlySet<string>;
     /** a word introduced today: its 组词 gap keeps 4 choices; a revision word gets 6 when 5 qualify (§5) */
     few?: boolean;
   ```

3. In the destructuring, replace `list, bare = false }: Props) {` with `list, bare = false, begun, few = false }: Props) {`.
4. Replace:

   ```ts
         const options = shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, MANY_WRONG)))], rng);
   ```

   with:

   ```ts
         const options = shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, few ? FEW_WRONG : MANY_WRONG, begun)))], rng);
   ```

In `src/activities/practice/PracticeQuestion.tsx`:
1. In `Props`, after `listCard?: ListCard; …` add:

   ```ts
     begun?: ReadonlySet<string>; // the words he has begun, by text: a 组词 gap's choices (real test spec 2026-10-23 §5)
     newToday?: boolean; // introduced in today's 认新字: its 组词 gap keeps 4 choices (§5)
   ```

2. Replace `level = 1, listCard }: Props) {` with `level = 1, listCard, begun, newToday = false }: Props) {`.
3. In the `FlashcardStep` it renders, replace:

   ```tsx
           list={listCard?.lead ? listCard : undefined}
           onDone={(r) => onDone(r)}
   ```

   with:

   ```tsx
           list={listCard?.lead ? listCard : undefined}
           begun={begun}
           few={newToday}
           onDone={(r) => onDone(r)}
   ```

In `src/app/SessionScreen.tsx`, in the `<PracticeQuestion …>` props, replace:

```tsx
          listCard={rec.plan.listCards?.[practiceWord.id]}
          onDone={(r) => void onPracticeDone(r)}
```

with:

```tsx
          listCard={rec.plan.listCards?.[practiceWord.id]}
          begun={know.begunTexts}
          newToday={rec.plan.newWordIds.includes(practiceWord.id)}
          onDone={(r) => void onPracticeDone(r)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/activities/flashcards src/activities/practice src/practice src/stats && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/activities/flashcards/meaning.ts src/activities/flashcards/meaning.test.ts src/activities/flashcards/FlashcardStep.tsx src/activities/practice/PracticeQuestion.tsx src/activities/practice/PracticeQuestion.test.tsx src/stats/stats.ts src/stats/stats.test.ts src/app/SessionScreen.tsx
git commit -m "$(cat <<'EOF'
组词 gap: begun characters only, up to 2 look-alikes, none that makes his own word; 6 for revision (real test §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Who gets a 默写, and 写一写 leaves them out (§4 who / how many)

**Files:**
- Create: `src/stats/fromMemory.ts`, `src/session/recallPick.ts`
- Modify: `src/types.ts` (`ReviewLog.source`, `SessionPlan.recall`, `RecallPick`), `src/session/plan.ts`, `src/session/writing.ts` (`pickWriteUnits`), `src/session/record.ts` (`planNow`)
- Test: `src/stats/fromMemory.test.ts`, `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `writingCue(word, at)` from `src/activities/writing/cue.ts`; `RECALL_RIGHT_MISSES` (1) from `src/session/writeCredit.ts`; `TAP_KINDS` from `src/srs/scheduler.ts`; `hanChars` from `src/content`.
- Produces:
  - `interface RecallPick { wordId: string; at: number; writeId: string }` in `src/types.ts`. `at` counts Han characters; `writeId` is the single-character word whose write card the character is.
  - `SessionPlan.recall?: RecallPick[]`.
  - `ReviewLog.source?: 'use' | 'write' | 'recall'`.
  - `isMadeRight(l: ReviewLog): boolean`, `isTap(l: ReviewLog): boolean`, `interface RightHistory { tapLast: boolean; madeAt: number }` and `rightHistory(logs: readonly ReviewLog[]): Map<string, RightHistory>` in `src/stats/fromMemory.ts`.
  - `RECALL_PER_LESSON = 3`, `RECALL_PER_LONG_LESSON = 4`, `recallTarget(minutes: number): number`, and `pickRecall({ dueIds, newIds, earIds, words, cards, history, cutoff, now, n }): RecallPick[]` in `src/session/recallPick.ts`.
  - `PlanInput.history?: ReadonlyMap<string, RightHistory>`.
  - `pickWriteUnits({ …, exclude?: ReadonlySet<string> })`: characters never written in 写一写.
  - `HISTORY_DAYS = 60` in `src/session/record.ts`.
- Rulings:
  - "Due revision" means the reading or meaning card is due. A word whose hear or understand card is due is left out, because its first appearance is asked by ear. A placed card's first recheck is left out too: it stays a tap, so a miss can still send it back.
  - A 词语 writes the character whose write card is due soonest.
  - "Oldest first" means the longest since his last right production; never produced comes first.
  - A cue he can only hear (no 组词 gap, no sentence) is never used.
  - A character is written at most once a lesson across 默写 and 写一写. 默写 picks first, and 写一写 leaves its characters out.
  - The stroke prefetch already covers 默写: `src/App.tsx` prefetches every active word's characters at launch. Nothing new is added.

- [ ] **Step 1: Write the failing tests**

Create `src/stats/fromMemory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { ReviewLog } from '../types';
import { isMadeRight, isTap, rightHistory } from './fromMemory';

const log = (wordId: string, kind: ReviewLog['kind'], at: number, over: Partial<ReviewLog> = {}): ReviewLog => ({ cardId: `${wordId}:${kind}`, wordId, kind, at, rating: Rating.Good, correct: true, ...over });

describe('from memory or by tapping (real test spec 2026-10-23 §7)', () => {
  it('a production is a 默写 with at most 1 miss, or a confirmed Say or 说一句 take', () => {
    expect(isMadeRight(log('b:草', 'write', 1, { misses: 1, source: 'recall' }))).toBe(true);
    expect(isMadeRight(log('b:草', 'write', 1, { misses: 2 }))).toBe(false); // 写一写's correct (≤ 3) is not right from memory
    expect(isMadeRight(log('b:草', 'say', 1))).toBe(true);
    expect(isMadeRight(log('b:草', 'sentence', 1, { correct: false }))).toBe(false);
  });
  it('a tap is a reading, meaning, hear or understand answer that no writing gave', () => {
    expect(isTap(log('b:草', 'recognise', 1))).toBe(true);
    expect(isTap(log('b:草', 'meaning', 1, { source: 'use' }))).toBe(true);
    expect(isTap(log('b:草', 'meaning', 1, { source: 'write' }))).toBe(false);
    expect(isTap(log('b:草', 'recognise', 1, { source: 'recall' }))).toBe(false);
  });
  it('each word: whether its last right answer was a tap, and when it was last produced', () => {
    const h = rightHistory([log('b:草', 'recognise', 30), log('b:草', 'write', 10, { misses: 0 }), log('b:花', 'write', 20, { misses: 0 }), log('b:花', 'recognise', 25, { correct: false, rating: Rating.Again }), log('b:山', 'hear', 5)]);
    expect(h.get('b:草')).toEqual({ tapLast: true, madeAt: 10 });
    expect(h.get('b:花')).toEqual({ tapLast: false, madeAt: 20 });
    expect(h.get('b:山')).toEqual({ tapLast: true, madeAt: 0 });
  });
});
```

Append to `src/session/plan.test.ts` (it already imports `makeCard`, `makeWord`, `DEFAULT_SETTINGS`, `buildSessionPlan`, and defines `now`, `hoursAgo`, `settings`):

```ts

describe('默写 in 练一练: who and how many (real test spec 2026-10-23 §4)', () => {
  const ink = (ch: string, i: number) => makeWord(ch, { id: `b:${ch}`, rank: i, examples: [{ text: `${ch}子`, pinyin: 'x zi' }] }); // a 组词 cue: ＿子
  const set = Array.from('草花山水火木').map(ink);
  const later = new Date(2026, 9, 20);
  // every one due to read, every one with a write card not due: revision words he writes
  const cards = set.flatMap((w, i) => [makeCard(w.id, 'recognise', hoursAgo(i + 1), true), makeCard(w.id, 'write', later, true)]);
  const plan = (over: Partial<Parameters<typeof buildSessionPlan>[0]> = {}) => buildSessionPlan({ cards, words: set, settings: settings({ newPerDay: 0 }), now, ...over });
  it('3 under 20 minutes, 4 at 20 or more', () => {
    expect(plan().recall).toHaveLength(3);
    expect(plan({ settings: settings({ newPerDay: 0, sessionMinutes: 20 }) }).recall).toHaveLength(4);
  });
  it('only revision words with a write card; a character writes itself', () => {
    const noWrite = cards.filter((c) => !(c.kind === 'write' && c.wordId !== 'b:草'));
    expect(plan({ cards: noWrite }).recall).toEqual([{ wordId: 'b:草', at: 0, writeId: 'b:草' }]);
  });
  it('a 词语 all of whose characters he writes: the character whose write card is due soonest', () => {
    const caohua = makeWord('花草', { id: 'p:1', source: 'parent', rank: null, examples: [{ text: '花草地', pinyin: 'x x x' }] });
    const only = [makeCard('p:1', 'recognise', hoursAgo(1), true), makeCard('b:花', 'write', later, true), makeCard('b:草', 'write', new Date(2026, 9, 10), true), makeCard('b:花', 'recognise', later, true), makeCard('b:草', 'recognise', later, true)];
    expect(plan({ cards: only, words: [...set, caohua] }).recall).toEqual([{ wordId: 'p:1', at: 1, writeId: 'b:草' }]);
  });
  it('words whose last right answer was a tap come first, the longest since he produced them first; then write cards due', () => {
    const history = new Map([['b:火', { tapLast: true, madeAt: 50 }], ['b:木', { tapLast: true, madeAt: 0 }]]);
    const due = cards.map((c) => (c.id === 'b:山:write' ? makeCard('b:山', 'write', hoursAgo(1), true) : c));
    expect(plan({ cards: due, history }).recall!.map((r) => r.wordId)).toEqual(['b:木', 'b:火', 'b:山']);
  });
  it('a character it writes from memory is never written in 写一写 the same lesson; never a word introduced today', () => {
    const due = cards.map((c) => (c.id === 'b:山:write' ? makeCard('b:山', 'write', hoursAgo(1), true) : c));
    const fresh = [...set, ...Array.from('土石云').map((ch, i) => ink(ch, 10 + i))];
    const p = plan({ cards: due, words: fresh, settings: settings({ newPerDay: 3 }) });
    expect(p.recall!.map((r) => r.wordId)).toContain('b:山');
    expect(p.writeWordIds).not.toContain('b:山');
    expect(p.recall!.some((r) => p.newWordIds.includes(r.wordId))).toBe(false);
  });
  it('never a character written today already (an earlier lesson’s 写一写)', () => {
    const written = cards.map((c) => (c.id === 'b:草:write' ? { ...c, fsrs: { ...c.fsrs, last_review: hoursAgo(0.5) } } : c));
    expect(plan({ cards: written }).recall!.map((r) => r.wordId)).not.toContain('b:草');
  });
  it('two due words sharing a character (草 and 花草): the character is written once', () => {
    const caohua = makeWord('花草', { id: 'p:1', source: 'parent', rank: null, examples: [{ text: '花草地', pinyin: 'x x x' }] });
    const due = cards.map((c) => (c.id === 'b:草:write' ? makeCard('b:草', 'write', hoursAgo(1), true) : c));
    const p = plan({ cards: [...due, makeCard('p:1', 'recognise', hoursAgo(1), true)], words: [...set, caohua], settings: settings({ newPerDay: 0, sessionMinutes: 30 }) });
    expect(p.recall!.filter((r) => r.writeId === 'b:草')).toHaveLength(1);
  });
  it('a word whose cue is only spoken (no 组词 gap, no sentence) is never written from memory: by ear alone it could be any same-sound character', () => {
    const onlyCao = cards.filter((c) => c.kind !== 'write' || c.wordId === 'b:草');
    expect(plan({ cards: onlyCao }).recall).toEqual([{ wordId: 'b:草', at: 0, writeId: 'b:草' }]);
    expect(plan({ cards: onlyCao, words: set.map((w) => (w.text === '草' ? { ...w, examples: [] } : w)) }).recall).toBeUndefined();
  });
  it('writing off (or 练一练 off): none', () => {
    expect(plan({ settings: settings({ newPerDay: 0, activities: { ...DEFAULT_SETTINGS.activities, writing: false } }) }).recall).toBeUndefined();
    expect(plan({ settings: settings({ newPerDay: 0, activities: { ...DEFAULT_SETTINGS.activities, practice: false } }) }).recall).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stats/fromMemory.test.ts src/session/plan.test.ts`
Expected: FAIL. `./fromMemory` doesn't exist and `plan.recall` is undefined.

- [ ] **Step 3: Implement**

In `src/types.ts`:
- Replace the `source?: 'use' | 'write';` line in `ReviewLog` with:

  ```ts
    source?: 'use' | 'write' | 'recall'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use), or from a 组词 written in 写一写 (production practice spec §3); recall: a 默写 in 练一练 rated it (real test spec 2026-10-23 §4)
  ```

- In `SessionPlan`, after the `classShort?: number; …` line, add:

  ```ts
    recall?: RecallPick[]; // 默写 in 练一练 (real test spec 2026-10-23 §4): earlier words written from memory; plans saved before it have none
  ```

- After the `SessionPlan` interface's closing `}`, add:

  ```ts

  /** A 默写 item (real test spec 2026-10-23 §4): the word asked, the character of it he writes (`at`, in Han characters), and the
   *  single-character word whose write card that character is (the word itself for a character). */
  export interface RecallPick { wordId: string; at: number; writeId: string }
  ```

Create `src/stats/fromMemory.ts`:

```ts
// From memory or by tapping (real test spec 2026-10-23 §4, §7): what his review logs say about how he last got a word right.
import { RECALL_RIGHT_MISSES } from '../session/writeCredit';
import { TAP_KINDS, type TapKind } from '../srs/scheduler';
import type { ReviewLog } from '../types';

/** A right production: a character written from memory with at most 1 miss (练一练's 默写 or 写一写's; a 词语's 默写 rates its
 *  reading as a recall), or a 说一句 or Say take the parent confirmed. */
export const isMadeRight = (l: ReviewLog): boolean =>
  l.correct && ((l.kind === 'write' && (l.misses ?? 0) <= RECALL_RIGHT_MISSES) || l.source === 'recall' || l.kind === 'say' || l.kind === 'sentence');

/** A tap answer: a reading, meaning, hear or understand rating from a choice, not one a written 组词 or a 默写 gave. */
export const isTap = (l: ReviewLog): boolean => TAP_KINDS.includes(l.kind as TapKind) && l.source !== 'write' && l.source !== 'recall';

/** How a word was last got right: `tapLast` when that was a tap, not a production; `madeAt` its last right production (0: never). */
export interface RightHistory { tapLast: boolean; madeAt: number }

/** Each word's RightHistory from its logs (any order). Words never got right are absent. */
export function rightHistory(logs: readonly ReviewLog[]): Map<string, RightHistory> {
  const out = new Map<string, RightHistory>();
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    if (!l.correct) continue;
    const had = out.get(l.wordId) ?? { tapLast: false, madeAt: 0 };
    if (isMadeRight(l)) out.set(l.wordId, { tapLast: false, madeAt: l.at });
    else if (isTap(l)) out.set(l.wordId, { ...had, tapLast: true });
  }
  return out;
}
```

Create `src/session/recallPick.ts`:

```ts
// 默写 in 练一练 (real test spec 2026-10-23 §4): which earlier words are written from memory this lesson.
import { writingCue } from '../activities/writing/cue';
import { hanChars } from '../content';
import { localDateKey } from '../lib/date';
import type { RightHistory } from '../stats/fromMemory';
import type { CardRecord, RecallPick, Word } from '../types';

/** 默写 items a lesson: 3 under 20 minutes, 4 from 20 (§4: about 40 s each, 2–3 minutes inside 练一练's box). */
export const RECALL_PER_LESSON = 3;
export const RECALL_PER_LONG_LESSON = 4;
export const recallTarget = (minutes: number): number => (minutes < 20 ? RECALL_PER_LESSON : RECALL_PER_LONG_LESSON);

/**
 * Today's 默写 (§4). From today's due revision (`dueIds`: reading or meaning due), never a word introduced today (`newIds`), one
 * whose hear or understand card is due (`earIds`: its first appearance is asked by ear), or a placed reading card's first recheck.
 * Each must be a begun character with a write card, or a 词语 all of whose characters are; a 词语 writes the character whose write
 * card is due soonest. Never a character written today already, one cue it can't show (no 组词 gap or sentence), or the same
 * character twice. Order: words whose last right answer was a tap (the longest since he produced it first), then those whose
 * write card is due, then the rest; `n` at most.
 */
export function pickRecall({ dueIds, newIds, earIds, words, cards, history, cutoff, now, n }: {
  dueIds: string[]; newIds: ReadonlySet<string>; earIds: ReadonlySet<string>; words: Word[]; cards: CardRecord[];
  history: ReadonlyMap<string, RightHistory>; cutoff: number; now: Date; n: number;
}): RecallPick[] {
  const byId = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const begun = new Set(cards.filter((c) => c.kind === 'recognise' || c.kind === 'hear').map((c) => c.wordId));
  const placed = new Set(cards.filter((c) => c.kind === 'recognise' && c.placed).map((c) => c.wordId));
  // each character he writes: its single-character word's write card
  const writeOf = new Map<string, CardRecord>();
  for (const c of cards) {
    const w = byId.get(c.wordId);
    if (c.kind === 'write' && w && begun.has(w.id) && Array.from(w.text).length === 1 && hanChars(w.text).length === 1) writeOf.set(w.text, c);
  }
  const today = localDateKey(now);
  const writtenToday = (c: CardRecord) => !!c.fsrs.last_review && localDateKey(c.fsrs.last_review) === today;
  type Cand = { pick: RecallPick; tier: number; key: number };
  const out: Cand[] = [];
  for (const id of new Set(dueIds)) {
    const w = byId.get(id);
    if (!w || newIds.has(id) || earIds.has(id) || placed.has(id)) continue;
    const chars = hanChars(w.text);
    if (!chars.length || chars.length !== Array.from(w.text).length || !chars.every((ch) => writeOf.has(ch))) continue;
    const at = chars.reduce((best, ch, i) => (writeOf.get(ch)!.fsrs.due.getTime() < writeOf.get(chars[best]!)!.fsrs.due.getTime() ? i : best), 0);
    const write = writeOf.get(chars[at]!)!;
    if (writtenToday(write)) continue;
    const cue = writingCue(w, at);
    if (!cue.blanked && !cue.sentence) continue;
    const h = history.get(id);
    const writeDue = write.fsrs.due.getTime() <= cutoff;
    out.push({ pick: { wordId: id, at, writeId: write.wordId }, tier: h?.tapLast ? 0 : writeDue ? 1 : 2, key: h?.tapLast ? h.madeAt : writeDue ? write.fsrs.due.getTime() : 0 });
  }
  const seen = new Set<string>();
  return out
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => a.tier - b.tier || a.key - b.key || a.i - b.i)
    .filter((c) => (seen.has(c.pick.writeId) ? false : (seen.add(c.pick.writeId), true)))
    .slice(0, n)
    .map((c) => c.pick);
}
```

In `src/session/writing.ts` (`pickWriteUnits`), replace:

```ts
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
  /** the book's write position decides the last fallback for a book character (spec 2026-10-11 §6); null class: the level rule */
  writeBy?: { course: Course; classAt: number | null }; cutoff: number; target: number;
}): WriteUnit[] {
```

with:

```ts
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target, exclude }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
  /** the book's write position decides the last fallback for a book character (spec 2026-10-11 §6); null class: the level rule */
  writeBy?: { course: Course; classAt: number | null }; cutoff: number; target: number;
  /** characters 练一练 writes from memory today (real test spec 2026-10-23 §4): never written here as well */
  exclude?: ReadonlySet<string>;
}): WriteUnit[] {
```

and replace `const taken = new Set<string>(); // a character comes once a lesson (final review I2)` with:

```ts
  const taken = new Set<string>(exclude ?? []); // a character comes once a lesson (final review I2), and not after its 默写
```

In `src/session/plan.ts`:
1. After `import { orderWriteItems, pickWriteUnits, writeCharTarget } from './writing';` add:

   ```ts
   import { pickRecall, recallTarget } from './recallPick';
   import { hanChars } from '../content';
   import type { RightHistory } from '../stats/fromMemory';
   ```

2. In `PlanInput`, after the `ranOut?: …` line, add:

   ```ts
     history?: ReadonlyMap<string, RightHistory>; // how each word was last got right (real test spec 2026-10-23 §4): tap-only words are written first
   ```

3. Replace `lists = [], ranOut = [false, false] }: PlanInput): SessionPlan {` with `lists = [], ranOut = [false, false], history = new Map() }: PlanInput): SessionPlan {`.
4. Replace:

   ```ts
     // 写一写 (spec 2026-10-05 §5): characters, not words — due, then today's and recent lesson words, then what he reads at his level
     const writeUnits = settings.activities.writing
       ? pickWriteUnits({ cards, words: active, newWordIds: newWords.map((w) => w.id), practised, level: learnerLevel(words, started), writeBy: { course: courseOf(settings), classAt }, cutoff, target: writeCharTarget(settings.sessionMinutes) }) // never halved on a front-load day: the lesson runs longer (parent ruling 2026-10-18)
       : [];
   ```

   with:

   ```ts
     const reviewWordIds = capped(dueRecognise, REVIEW_CAP).map((c) => c.wordId);
     // only words that can be asked by ear: a card that can't be asked would stay due and hold a slot forever (final review I1)
     const hearReviewIds = capped(dueOf(hear).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'hear'); }), HEAR_REVIEW_CAP).map((c) => c.wordId);
     const understandReviewIds = capped(dueOf(understand).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'understand'); }), UNDERSTAND_REVIEW_CAP).map((c) => c.wordId);
     // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
     const meaningReviewIds = capped(dueOf(meaning).filter((c) => { const w = byId.get(c.wordId); return !!w && meaningCue(w) !== null; }), MEANING_REVIEW_CAP).map((c) => c.wordId);
     // 默写 in 练一练 (real test spec 2026-10-23 §4): earlier words written from memory, on whenever 写一写 and 练一练 are
     const recall = settings.activities.writing && settings.activities.practice ? pickRecall({
       dueIds: [...reviewWordIds, ...meaningReviewIds], newIds: new Set(newWords.map((w) => w.id)), earIds: new Set([...hearReviewIds, ...understandReviewIds]),
       words: active, cards, history, cutoff, now, n: recallTarget(settings.sessionMinutes),
     }) : [];
     // 写一写 (spec 2026-10-05 §5): characters, not words — due, then today's and recent lesson words, then what he reads at his level;
     // never a character 练一练 writes from memory today (one write per character a day, real test spec §4)
     const recalled = new Set(recall.map((r) => hanChars(byId.get(r.wordId)!.text)[r.at]!));
     const writeUnits = settings.activities.writing
       ? pickWriteUnits({ cards, words: active, newWordIds: newWords.map((w) => w.id), practised, level: learnerLevel(words, started), writeBy: { course: courseOf(settings), classAt }, cutoff, target: writeCharTarget(settings.sessionMinutes), exclude: recalled }) // never halved on a front-load day: the lesson runs longer (parent ruling 2026-10-18)
       : [];
   ```

5. In the `plan` literal, replace `reviewWordIds: capped(dueRecognise, REVIEW_CAP).map((c) => c.wordId),` with `reviewWordIds,`. Then replace:

   ```ts
       // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
       // only words that can be asked by ear: a card that can't be asked would stay due and hold a slot forever (final review I1)
       hearReviewIds: capped(dueOf(hear).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'hear'); }), HEAR_REVIEW_CAP).map((c) => c.wordId),
       understandReviewIds: capped(dueOf(understand).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'understand'); }), UNDERSTAND_REVIEW_CAP).map((c) => c.wordId),
       meaningReviewIds: capped(dueOf(meaning).filter((c) => { const w = byId.get(c.wordId); return !!w && meaningCue(w) !== null; }), MEANING_REVIEW_CAP).map((c) => c.wordId),
   ```

   with:

   ```ts
       hearReviewIds,
       understandReviewIds,
       meaningReviewIds,
   ```

   and replace:

   ```ts
       frontLoad,
       ...(budget ? { classShort: budget.classShort } : {}),
     };
   ```

   with:

   ```ts
       frontLoad,
       ...(budget ? { classShort: budget.classShort } : {}),
       ...(recall.length ? { recall } : {}),
     };
   ```

In `src/session/record.ts`:
1. After `import { activeLists } from '../weeklist/plan';` add:

   ```ts
   import { rightHistory } from '../stats/fromMemory';

   /** How far back a word's last right answer is looked for, to put tap-only words first in 默写 (real test spec §4). */
   export const HISTORY_DAYS = 60;
   ```

2. In `planNow`, replace:

   ```ts
     const [cards, words, settings, practised, lists, sessions] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db), allWeekLists(db), allSessions(db)]);
     const all = [...words, ...ladderWordsBesides(words)];
     // an extra lesson never asks the pace: it takes no new words (learning rules 2026-10-17)
     if (extra) return buildSessionPlan({ cards, words: all, settings, now, practised, extra: true, lists });
   ```

   with:

   ```ts
     const [cards, words, settings, practised, lists, sessions, recent] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db), allWeekLists(db), allSessions(db), logsSince(db, now.getTime() - HISTORY_DAYS * 86_400_000)]);
     const all = [...words, ...ladderWordsBesides(words)];
     const history = rightHistory(recent); // tap-only words are written from memory first (real test spec 2026-10-23 §4)
     // an extra lesson never asks the pace: it takes no new words (learning rules 2026-10-17)
     if (extra) return buildSessionPlan({ cards, words: all, settings, now, practised, extra: true, lists, history });
   ```

3. Replace the last line of `planNow`:

   ```ts
     return buildSessionPlan({ cards, words: all, settings, now, practised, newPerDay: await todaysPace(db, now, settings, !preview), lists, ranOut: [ranOn(1), ranOn(2)] });
   ```

   with:

   ```ts
     return buildSessionPlan({ cards, words: all, settings, now, practised, newPerDay: await todaysPace(db, now, settings, !preview), lists, ranOut: [ranOn(1), ranOn(2)], history });
   ```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/stats/fromMemory.test.ts src/session src/weeklist && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/stats/fromMemory.ts src/stats/fromMemory.test.ts src/session/recallPick.ts src/session/plan.ts src/session/plan.test.ts src/session/writing.ts src/session/record.ts
git commit -m "$(cat <<'EOF'
Plan: 3–4 earlier words to write from memory, tap-only first; 写一写 leaves their characters out (real test §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: What a 默写 grades (§4 grading)

**Files:**
- Modify: `src/session/writeCredit.ts` (`recallRight`), `src/session/record.ts` (`recordWriting`, `recordRecall`)
- Test: `src/session/record.test.ts`

**Interfaces:**
- Consumes: `reviewCard`, `settleRung`, `ratedToday`, `bringForward` and `recordWrittenMeaning` in `record.ts`; `RECALL_RIGHT_MISSES`.
- Produces:
  - `recallRight(o: { totalMisses: number; hinted: boolean }): boolean` (`!hinted && totalMisses <= 1`) in `src/session/writeCredit.ts`.
  - `recordWriting(db, wordId, totalMisses, now, opts: { source?: 'recall'; correct?: boolean } = {})`. `correct` defaults to `totalMisses <= 3`, as before.
  - `interface RecallGrade { wordId: string; writeId: string; reading: boolean; meaning: boolean }`.
  - `recordRecall(db, g: RecallGrade, o: { totalMisses: number; hinted: boolean }, now: Date): Promise<CardRecord[]>`. Its rules:
    - The write card (`writeId`) is rated by `recordWriting`'s rule, with source `'recall'` and `correct` = right. When it was already rated today, a miss only brings it forward.
    - When `reading`, the reading card is rated Good when right and Again when not, once a day, with source `'recall'`, and its rung is settled.
    - When `meaning`, `recordWrittenMeaning(db, wordId, right, now)`.
    - It returns the changed cards.

- [ ] **Step 1: Write the failing test**

In `src/session/record.test.ts`, add `recordRecall` to the import from `./record`:

```ts
import { bringForward, markTraced, markWriteSkipped, recordMeaning, recordRecall, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession } from './record';
```

and append:

```ts

describe('默写 in 练一练: what it grades (real test spec 2026-10-23 §4)', () => {
  const g = { wordId: 'b:草', writeId: 'b:草', reading: true, meaning: false };
  const setup = async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('草')]);
    await putCards(db, [{ id: 'b:草:recognise', wordId: 'b:草', kind: 'recognise', fsrs: seededKnownCard(new Date(2026, 8, 20), 12) }, { id: 'b:草:write', wordId: 'b:草', kind: 'write', fsrs: seededKnownCard(new Date(2026, 8, 20), 30) }]);
    return db;
  };
  const writeLog = async (db: Awaited<ReturnType<typeof freshDb>>) => (await logsSince(db, now.getTime())).find((l) => l.kind === 'write');
  it('the write card by its misses: 0 Good, 1–3 Hard, more Again; logged as a recall, right only with at most 1 miss and no hint', async () => {
    for (const [misses, hinted, rating, correct] of [[0, false, Rating.Good, true], [1, false, Rating.Hard, true], [2, true, Rating.Hard, false], [4, true, Rating.Again, false]] as const) {
      const db = await setup();
      await recordRecall(db, g, { totalMisses: misses, hinted }, now);
      expect(await writeLog(db), `${misses}`).toMatchObject({ rating, correct, misses, source: 'recall' });
    }
  });
  it('the due reading card: Good when right (produced), Again when not', async () => {
    for (const [misses, rating] of [[0, Rating.Good], [3, Rating.Again]] as const) {
      const db = await setup();
      await recordRecall(db, g, { totalMisses: misses, hinted: misses > 1 }, now);
      expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'recognise')).toMatchObject({ rating, source: 'recall' });
    }
  });
  it('the due meaning card with a 组词 cue: credited as 写一写’s written 组词', async () => {
    const db = await setup();
    await recordRecall(db, { ...g, meaning: true }, { totalMisses: 0, hinted: false }, now);
    expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'meaning')).toMatchObject({ rating: Rating.Good, source: 'write' });
  });
  it('its write pass makes later right taps Good: two days right and the word is produced', async () => {
    const db = await setup();
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 0, hinted: false }, new Date(2026, 9, 1, 9));
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 0, hinted: false }, now);
    expect((await getCard(db, 'b:草:write'))!.passed).toBe(now.getTime());
    await recordRecognition(db, 'b:草', { correct: true, responseMs: 2000 }, now);
    expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'recognise')!.rating).toBe(Rating.Good);
  });
  it('a write card already rated today: a miss only brings it forward', async () => {
    const db = await setup();
    await recordWriting(db, 'b:草', 0, new Date(2026, 9, 2, 8));
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 4, hinted: true }, now);
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'write')).toHaveLength(1);
    expect((await getCard(db, 'b:草:write'))!.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 2, 23, 59, 59, 999).getTime());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/session/record.test.ts`
Expected: FAIL. `recordRecall` is not exported.

- [ ] **Step 3: Implement**

In `src/session/writeCredit.ts`, replace:

```ts
/** A traced read-only character counts as right with at most this many misses. */
```

with:

```ts
/** A 默写 in 练一练 is right with no hint and at most RECALL_RIGHT_MISSES misses (real test spec 2026-10-23 §4). */
export const recallRight = (o: { totalMisses: number; hinted: boolean }): boolean => !o.hinted && o.totalMisses <= RECALL_RIGHT_MISSES;
/** A traced read-only character counts as right with at most this many misses. */
```

In `src/session/record.ts`:
1. Directly before `import { rightHistory } from '../stats/fromMemory';` (added in Task 4), add `import { recallRight } from './writeCredit';`.
2. Replace:

   ```ts
   export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
     const rating = toRating({ kind: 'write', totalMisses });
     const { card, before } = await reviewCard(db, wordId, 'write', rating, now);
     await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses, ...before });
   ```

   with:

   ```ts
   /** A word written from memory, rated by its misses. `source: 'recall'`: a 默写 in 练一练 (real test spec 2026-10-23 §4), logged
    *  with its own right (no hint, at most 1 miss) as `correct`, so the parent can tell it from 写一写's. */
   export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date, opts: { source?: 'recall'; correct?: boolean } = {}): Promise<CardRecord> {
     const rating = toRating({ kind: 'write', totalMisses });
     const { card, before } = await reviewCard(db, wordId, 'write', rating, now);
     await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: opts.correct ?? totalMisses <= 3, misses: totalMisses, ...before, ...(opts.source ? { source: opts.source } : {}) });
   ```

3. Before `/** A read-only character traced (production practice spec §3): a recent lesson word is traced once, not every lesson. */`, add:

   ```ts
   /** What a 默写 grades: `writeId` the written character's word (its write card), `reading` the word's reading card is due and its
    *  first appearance was this item, `meaning` its meaning card is due and the cue was a 组词. */
   export interface RecallGrade { wordId: string; writeId: string; reading: boolean; meaning: boolean }

   /**
    * A 默写 in 练一练 (real test spec 2026-10-23 §4). The character's write card by recordWriting's rule (already rated today: a miss
    * only brings it forward); the word's due reading card Good when right (it is produced) and Again when not, once a day; its due
    * meaning card as 写一写's written 组词 is (recordWrittenMeaning). The write card's pass settles as in 写一写, so later right taps
    * on a word it makes produced rate Good. Returns the cards it changed.
    */
   export async function recordRecall(db: AppDb, g: RecallGrade, o: { totalMisses: number; hinted: boolean }, now: Date): Promise<CardRecord[]> {
     const right = recallRight(o);
     const out: CardRecord[] = [];
     if (ratedToday(await getCard(db, `${g.writeId}:write`), now)) {
       if (!right) await bringForward(db, g.writeId, 'write', endOfLocalDay(now));
     } else out.push(await recordWriting(db, g.writeId, o.totalMisses, now, { source: 'recall', correct: right }));
     if (g.reading) {
       if (!ratedToday(await getCard(db, `${g.wordId}:recognise`), now)) {
         const rating = right ? Rating.Good : Rating.Again;
         const { card, before } = await reviewCard(db, g.wordId, 'recognise', rating, now);
         await addReviewLog(db, { cardId: card.id, wordId: g.wordId, kind: 'recognise', at: now.getTime(), rating, correct: right, source: 'recall', ...before });
         out.push((await settleRung(db, g.wordId, 'recognise', now)) ?? card);
       } else if (!right) await bringForward(db, g.wordId, 'recognise', endOfLocalDay(now));
     }
     if (g.meaning) out.push(await recordWrittenMeaning(db, g.wordId, right, now));
     return out;
   }

   ```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/session/record.test.ts src/session/writeCredit.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session/writeCredit.ts src/session/record.ts src/session/record.test.ts
git commit -m "$(cat <<'EOF'
recordRecall: a 默写 rates the write card, the due reading card and a 组词's meaning; logged as recall (real test §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 默写 in the round (`ask: 'recall'`, `withRecall`)

**Files:**
- Modify: `src/session/round.ts` (`Ask`, `PracticeItem`, `RecallAsk`), `src/session/practice.ts` (`canAsk`, `withRecall`, `planPractice`), `src/session/runner.ts` (`afterPracticeAnswer`)
- Test: `src/session/practice.test.ts`, `src/session/runner.test.ts`

**Interfaces:**
- Consumes: `RecallPick` and `SessionPlan.recall` (Task 4).
- Produces:
  - `Ask` gains `'recall'`. It is never in `ASKS`, and `canAsk` returns `false` for it.
  - `interface RecallAsk { at: number; writeId: string; ask: Ask }`. `ask` is the question it replaced, asked instead if strokes can't load.
  - `PracticeItem.recall?: RecallAsk`.
  - `withRecall(items: PracticeItem[], picks: readonly RecallPick[]): PracticeItem[]`: each pick's first non-retry item becomes `ask: 'recall'` in its place, keeping its rung, grades and `due`.
  - `planPractice` applies it to `rec.plan.recall`, minus paused words and words met today, before `withFamily` and `withNoneOfThese`.
  - A missed 默写 gets no retry: its strokes were shown already. Ruling: a retry would add another ~40 s for no grading.

- [ ] **Step 1: Write the failing tests**

In `src/session/practice.test.ts`, add `withRecall` to the import from `./practice`:

```ts
import { askable, planFreePlay, planPractice, practiceWords, withFamily, withFish, withRecall } from './practice';
```

and append:

```ts

describe('默写 in the round (real test spec 2026-10-23 §4)', () => {
  it('takes the word’s first appearance, in its place, rung and grading; the question it replaced is kept for a fallback', () => {
    const items: PracticeItem[] = [{ wordId: 'b:a', rung: 1, ask: 'read', grades: 'recognise', retry: false, due: true }, { wordId: 'b:b', rung: 3, ask: 'fit', grades: 'use', retry: false }, { wordId: 'b:a', rung: 2, ask: 'word', grades: 'meaning', retry: false }];
    expect(withRecall(items, [{ wordId: 'b:a', at: 0, writeId: 'b:a' }, { wordId: 'b:gone', at: 0, writeId: 'b:gone' }])).toEqual([
      { wordId: 'b:a', rung: 1, ask: 'recall', grades: 'recognise', retry: false, due: true, recall: { at: 0, writeId: 'b:a', ask: 'read' } },
      items[1], items[2],
    ]);
  });
  it('a lesson planned before 默写 (no recall in its plan) asks none; a 默写 word paused since planning is asked as usual, not written', () => {
    const due = ['草', '花', '山'].map(id);
    expect(planPractice(createSessionRecord(plan({ reviewWordIds: due }), '2026-10-06', 0), new Map(), byId, words, false, mulberry32(1)).some((x) => x.ask === 'recall')).toBe(false);
    const paused = { ...byId.get(id('山'))!, paused: true };
    const rec = createSessionRecord(plan({ reviewWordIds: due, recall: [{ wordId: id('山'), at: 0, writeId: id('山') }] }), '2026-10-06', 0);
    expect(planPractice(rec, new Map(), new Map([...byId, [paused.id, paused]]), words, false, mulberry32(1)).some((x) => x.ask === 'recall')).toBe(false);
  });
  it('the plan’s 默写 words come in 练一练, a due one among the first items; never a word met today', () => {
    const due = ['草', '花', '山', '水', '火'].map(id);
    const rec = createSessionRecord(plan({ reviewWordIds: due, recall: [{ wordId: id('山'), at: 0, writeId: id('山') }, { wordId: id('水'), at: 0, writeId: id('水') }] }), '2026-10-06', 0);
    const items = planPractice(rec, new Map(due.map((w) => [w, 2])), byId, words, false, mulberry32(1));
    const recall = items.filter((x) => x.ask === 'recall');
    expect(recall.map((x) => x.wordId).sort()).toEqual([id('山'), id('水')].sort());
    expect(recall.every((x) => items.indexOf(x) < due.length && x.grades === 'recognise' && x.due)).toBe(true);
    const fresh = createSessionRecord(plan({ newWordIds: [id('山')], reviewWordIds: due, recall: [{ wordId: id('山'), at: 0, writeId: id('山') }] }), '2026-10-06', 0);
    expect(planPractice({ ...fresh, flashIndex: 1 }, new Map(), byId, words, false, mulberry32(1)).some((x) => x.ask === 'recall')).toBe(false);
  });
});
```

Append to `src/session/runner.test.ts`:

```ts

describe('a missed 默写 (real test spec 2026-10-23 §4)', () => {
  it('is not asked again: its strokes were shown already', () => {
    const rec = startPractice(finishStep(createSessionRecord(planOf({ newWordIds: [] }), '2026-10-06', 0)), ['b:a', 'b:b', 'b:c'].map((x) => p(x, { ask: 'recall', recall: { at: 0, writeId: x, ask: 'read' } })));
    expect(afterPracticeAnswer(rec, false, 40_000).practiceQueue).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/session/practice.test.ts src/session/runner.test.ts`
Expected: FAIL. `withRecall` doesn't exist, `'recall'` isn't an `Ask` (tsc), and a missed 默写 is retried.

- [ ] **Step 3: Implement**

In `src/session/round.ts`, replace:

```ts
 *  sentence: 说一句, he says a sentence with the word (production practice spec §4; rung 3, never picked by the ladder). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say' | 'family' | 'sentence';
```

with:

```ts
 *  sentence: 说一句, he says a sentence with the word (production practice spec §4; rung 3, never picked by the ladder) ·
 *  recall: 默写, he writes the character from memory (real test spec 2026-10-23 §4; in place of a first appearance, never picked by the ladder). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say' | 'family' | 'sentence' | 'recall';
```

and replace the `PracticeItem` line:

```ts
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string; none?: true | 'answer' | 'decoy'; list?: import('../types').ListAsk } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked; list: a weekly list item (weekly list spec §6.4)
```

with:

```ts
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string; none?: true | 'answer' | 'decoy'; list?: import('../types').ListAsk; recall?: RecallAsk } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked; list: a weekly list item (weekly list spec §6.4); recall: a 默写 (real test spec §4)

/** A 默写 item's character (`at`, `writeId`: see RecallPick) and the question it replaced, asked instead if its strokes can't load. */
export interface RecallAsk { at: number; writeId: string; ask: Ask }
```

In `src/session/practice.ts`:
1. Replace `import type { CardRecord, SessionRecord, Word } from '../types';` with `import type { CardRecord, RecallPick, SessionRecord, Word } from '../types';`.
2. In `canAsk`, after the `case 'sentence': …` line, add:

   ```ts
       case 'recall': return false; // 默写 takes over a word's first appearance from the plan's recall (withRecall), never asked from the ladder
   ```

3. Before `/** At most two 找一家人 a lesson (spec 2026-10-12 §5). */`, add:

   ```ts
   /**
    * 默写 (real test spec 2026-10-23 §4): each picked word's first appearance becomes its 默写, in the same place, rung and grading,
    * so the round is no longer and §3's order puts it before anything the time box cuts. A word not in the round gets none.
    */
   export function withRecall(items: PracticeItem[], picks: readonly RecallPick[]): PracticeItem[] {
     const out = [...items];
     for (const p of picks) {
       const i = out.findIndex((x) => x.wordId === p.wordId && !x.retry);
       if (i < 0 || out[i]!.ask === 'recall') continue;
       out[i] = { ...out[i]!, ask: 'recall', recall: { at: p.at, writeId: p.writeId, ask: out[i]!.ask } };
     }
     return out;
   }

   ```

4. In `planPractice`, replace `const round = withNoneOfThese(withFamily(buildRound(words, can, rng), (id) => {` with:

   ```ts
     // 默写 (real test spec 2026-10-23 §4) takes its words' first appearances before 找一家人 and 都不对 look at the round
     const recall = (rec.plan.recall ?? []).filter((p) => { const w = wordsById.get(p.wordId); return !!w && !w.paused && !today.has(p.wordId); });
     const round = withNoneOfThese(withFamily(withRecall(buildRound(words, can, rng), recall), (id) => {
   ```

In `src/session/runner.ts` (`afterPracticeAnswer`), replace:

```ts
  if (!correct && !item.retry && item.ask !== 'fish' && item.ask !== 'family') { // a missed 钓鱼 or 找一家人 isn't asked again: at most two a lesson (sweep; spec 2026-10-12 §5)
```

with:

```ts
  if (!correct && !item.retry && item.ask !== 'fish' && item.ask !== 'family' && item.ask !== 'recall') { // a missed 钓鱼 or 找一家人 isn't asked again: at most two a lesson (sweep; spec 2026-10-12 §5); a missed 默写 showed its strokes already (real test spec §4)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/session && npx tsc --noEmit`
Expected: PASS. (`tsc` will flag any `switch` over `Ask` that is now non-exhaustive; `canAsk` is the only one.)

- [ ] **Step 5: Commit**

```bash
git add src/session/round.ts src/session/practice.ts src/session/practice.test.ts src/session/runner.ts src/session/runner.test.ts
git commit -m "$(cat <<'EOF'
练一练: a 默写 takes its word's first appearance (withRecall); no retry after a miss (real test §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: The 默写 screen (`RecallQuestion`) and its fallback

**Files:**
- Create: `src/activities/practice/RecallQuestion.tsx`
- Modify: `src/activities/practice/PracticeQuestion.tsx`
- Test: `src/activities/practice/RecallQuestion.test.tsx`

**Interfaces:**
- Consumes:
  - `writingCue(word, at)`, which returns `{ blanked, sentence, speech }`.
  - `writingBoxFor(...)` from `src/activities/writing/size.ts`.
  - `loadStrokeData` from `src/content/strokes.ts`.
  - `recallRight` (Task 5) and `PracticeItem.recall` (Task 6).
- Produces:
  - `interface RecallResult { totalMisses: number; hinted: boolean; elapsedMs: number }`.
  - `RecallQuestion({ word, at, kid, onDone: (r: RecallResult | null) => void })`. Its behaviour:
    - On mount it says `cue.speech` with `{ reading: word.pinyin }`.
    - It shows the gapped 组词 (`<Label zh={cue.blanked} fade />`; the gap has no pinyin) or the gapped sentence. A `SpeakButton` (with `reading`) replays the cue.
    - The hanzi-writer quiz uses `showOutline: false`, `showCharacter: false` and `showHintAfterMisses: 2`. `hinted` becomes true once a stroke has 2 misses.
    - The bubble is 「听一听，写出来！」. When done, the sheet title is 「写对了！」 (right) or 「记住它的样子！」, then 继续.
    - `null` means the strokes didn't load.
  - `PracticeResult.asked` gains `'write'`; `PracticeResult.recall?: { totalMisses: number; hinted: boolean }`.
  - `PracticeQuestion` with `ask: 'recall'` renders `RecallQuestion` and reports `{ correct: recallRight(r), hard: false, responseMs: r.elapsedMs, elapsedMs: r.elapsedMs, inContext: false, asked: 'write', recall }`. When strokes fail, it renders the replaced question (`item.recall.ask`) in place.

- [ ] **Step 1: Write the failing test**

Create `src/activities/practice/RecallQuestion.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import HanziWriter from 'hanzi-writer';
import { speak } from '../../audio/speech';
import { builtinWords } from '../../content';
import { DEFAULT_KID } from '../../types';
import { RecallQuestion } from './RecallQuestion';
import { PracticeQuestion } from './PracticeQuestion';

type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void; onCorrectStroke?: (d: unknown) => void; onMistake?: (d: { mistakesOnStroke: number }) => void };
const quizzes: QuizOpts[] = [];
let loadError: (() => void) | undefined;
vi.mock('hanzi-writer', () => ({
  default: {
    create: vi.fn((_el: unknown, _ch: string, opts: { onLoadCharDataError?: () => void }) => {
      loadError = opts.onLoadCharDataError;
      return { quiz: (o: QuizOpts) => { quizzes.push(o); return Promise.resolve(); }, cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() };
    }),
  },
}));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));

const pool = builtinWords(0);
const cao = pool.find((w) => w.text === '草')!; // its cue: 草，草地的，草 with ＿地 shown

describe('默写 (real test spec 2026-10-23 §4)', () => {
  it('says the 组词 cue at the card’s reading and shows it with the character gapped; no outline, no pinyin of the target', () => {
    render(<RecallQuestion word={cao} at={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('草，草地的，草', { reading: cao.pinyin });
    expect(document.querySelector('.write__blank')?.textContent).toContain('＿');
    expect(document.querySelector('.write__blank')?.textContent).not.toContain('草');
    expect(document.body.textContent).not.toContain(cao.pinyin);
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![1]).toBe('草');
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![2]).toMatchObject({ showOutline: false, showCharacter: false, showHintAfterMisses: 2 });
    expect(document.querySelector('.speak')).toBeTruthy(); // the speaker replays the cue
  });
  it('finished with at most 1 miss and no hint is right', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<RecallQuestion word={cao} at={0} kid={DEFAULT_KID} onDone={onDone} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 1 }));
    expect(screen.getByText('写对了！')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 1, hinted: false, elapsedMs: expect.any(Number) });
  });
  it('a hint (after 2 misses on a stroke) counts as wrong', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<PracticeQuestion pool={pool} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} word={cao} item={{ wordId: cao.id, rung: 1, ask: 'recall', grades: 'recognise', retry: false, recall: { at: 0, writeId: cao.id, ask: 'read' } }} onDone={onDone} />);
    act(() => quizzes.at(-1)!.onMistake!({ mistakesOnStroke: 2 }));
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    expect(screen.queryByText('写对了！')).toBeNull();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, asked: 'write', recall: { totalMisses: 2, hinted: true } }));
  });
  it('strokes that can’t load: the word’s normal first question is asked instead', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion pool={pool} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} word={cao} item={{ wordId: cao.id, rung: 1, ask: 'recall', grades: 'recognise', retry: false, recall: { at: 0, writeId: cao.id, ask: 'read' } }} onDone={onDone} />);
    act(() => loadError!());
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: cao.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/activities/practice/RecallQuestion.test.tsx`
Expected: FAIL with "Failed to resolve import './RecallQuestion'".

- [ ] **Step 3: Implement**

Create `src/activities/practice/RecallQuestion.tsx`:

```tsx
// 默写 in 练一练 (real test spec 2026-10-23 §4): he hears the 组词 (「草，草地的，草」), sees it with the character gapped (＿地),
// and writes the character from memory: no outline, no pinyin of the target, a hint (the stroke shown) only after 2 misses on it.
import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { loadStrokeData } from '../../content/strokes';
import { recallRight } from '../../session/writeCredit';
import type { KidState, Word } from '../../types';
import { Label, spokenBlanks } from '../../ui/Label';
import { burst } from '../../ui/motion';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import type { Reaction } from '../../ui/truffle/timelines';
import { writingCue } from '../writing/cue';
import { writingBoxFor } from '../writing/size';

export interface RecallResult { totalMisses: number; hinted: boolean; elapsedMs: number }

interface Props {
  word: Word;
  at: number; // the character of the word he writes, in Han characters
  kid: KidState;
  onDone: (r: RecallResult | null) => void; // null: its strokes couldn't load (the question it replaced is asked instead)
}

export function RecallQuestion({ word, at, kid, onDone }: Props) {
  const ch = hanChars(word.text)[at] ?? word.text;
  const cue = useMemo(() => writingCue(word, at), [word.id, at]);
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<ReturnType<typeof HanziWriter.create> | null>(null);
  const startedAt = useRef(performance.now());
  const hinted = useRef(false);
  const [result, setResult] = useState<{ totalMisses: number; hinted: boolean } | null>(null);
  const reactN = useRef(0);
  const [react, setReact] = useState<Reaction | null>(null);
  const fire = (kind: Reaction['kind']) => setReact({ kind, key: ++reactN.current });
  const boxSize = (el: HTMLElement) => {
    const card = el.closest('.stage__card') as HTMLElement | null;
    return writingBoxFor({ width: card?.clientWidth ?? window.innerWidth, height: card?.clientHeight ?? window.innerHeight }, el.offsetTop);
  };
  useEffect(() => {
    speak(cue.speech, { reading: word.pinyin }); // its lone pieces at the card's reading, as 写一写 says them
  }, [word.id]);
  // a rotated iPad: the box re-fits in place, keeping the strokes he has drawn
  useEffect(() => {
    const onResize = () => {
      const el = host.current;
      if (!el || !writer.current) return;
      const size = boxSize(el);
      writer.current.updateDimensions({ width: size, height: size });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    let cancelled = false;
    const size = boxSize(el);
    const hw = HanziWriter.create(el, ch, {
      width: size, height: size, padding: 16, showCharacter: false, showOutline: false, showHintAfterMisses: 2,
      highlightOnComplete: true, drawingWidth: 24, strokeColor: '#2d3436',
      charDataLoader: (c, onLoad, onError) => {
        loadStrokeData(c).then((data) => onLoad(data as never), onError);
      },
      onLoadCharDataError: () => {
        if (!cancelled) onDone(null);
      },
    });
    writer.current = hw;
    void hw.quiz({
      onCorrectStroke: () => {
        if (!cancelled) fire('nod');
      },
      onMistake: (d) => {
        if (d.mistakesOnStroke >= 2) hinted.current = true; // the hint shows now: a hinted answer is not right
      },
      onComplete: (summary) => {
        if (cancelled) return;
        const r = { totalMisses: summary.totalMistakes, hinted: hinted.current };
        const right = recallRight(r);
        playSfx(right ? 'star' : 'wrong');
        const box = host.current?.getBoundingClientRect();
        if (right && box) burst(box.left + box.width / 2, box.top + box.height / 2, { count: 12 });
        setResult(r);
        fire(right ? 'right' : 'wrong');
      },
    });
    return () => {
      cancelled = true;
      hw.cancelQuiz();
      writer.current = null;
    };
  }, [word.id, at]);

  const right = !!result && recallRight(result);
  const finish = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - startedAt.current) });
  };
  return (
    <Stage
      activity="write"
      truffle={<Pet kid={kid} size={180} mood={result ? (right ? 'pleased' : 'neutral') : 'neutral'} bubble={result ? null : '听一听，写出来！'} calm={!result} react={react} />}
      sheet={result ? <FeedbackSheet tone={right ? 'good' : 'neutral'} title={right ? '写对了！' : '记住它的样子！'} actionLabel="继续" onAction={finish} /> : <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />}
    >
      <div class="write__cue recall__cue">
        {/* the 组词 with its gap, the gap's own pinyin left out: the sound is the clue, said by the speaker (§4) */}
        {/* the speaker hangs beside the gapped line: the 组词, else the sentence (an empty line would leave it above the card) */}
        {cue.blanked && <div class="word-row__line write__blank"><Label zh={cue.blanked} fade /><SpeakButton text={cue.speech} reading={word.pinyin} small /></div>}
        {cue.sentence && (
          <>
            <p class="sr-only" lang="zh">{spokenBlanks(cue.sentence)}</p>
            <div class="word-row__line"><div class="write__sentence hanzi" lang="zh" aria-hidden="true">{cue.sentence}</div>{!cue.blanked && <SpeakButton text={cue.speech} reading={word.pinyin} small />}</div>
          </>
        )}
      </div>
      <div ref={host} class="tianzige" />
    </Stage>
  );
}
```

In `src/activities/practice/PracticeQuestion.tsx`:
1. Replace `import { useEffect, useMemo, useRef } from 'preact/hooks';` with `import { useEffect, useMemo, useRef, useState } from 'preact/hooks';`.
2. After `import { familyBoard } from '../../practice/family';` add:

   ```ts
   import { recallRight } from '../../session/writeCredit';
   import { RecallQuestion } from './RecallQuestion';
   ```

3. In `PracticeResult`, replace `asked: 'read' | 'meaning' | 'use' | 'zibian' | 'hear' | 'understand';` with `asked: 'read' | 'meaning' | 'use' | 'zibian' | 'hear' | 'understand' | 'write';`. After its `listPairs?: …` line, add:

   ```ts
     recall?: { totalMisses: number; hinted: boolean }; // a 默写 written (real test spec 2026-10-23 §4): asked 'write'
   ```

4. Replace the component's opening (after Task 3 it reads):

   ```tsx
   export function PracticeQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, confused, knownChars, level = 1, listCard, begun, newToday = false }: Props) {
     const sentence = item.ask === 'fit' || item.ask === 'usage';
   ```

   with:

   ```tsx
   export function PracticeQuestion(props: Props) {
     const { item, word, kid, onDone } = props;
     // a 默写 whose strokes can't load (offline, uncached) is asked as the question it replaced (real test spec 2026-10-23 §4)
     const [fallback, setFallback] = useState(false);
     if (item.ask === 'recall' && item.recall) {
       if (fallback) {
         const { recall: _gone, ...rest } = item;
         return <AskedQuestion {...props} item={{ ...rest, ask: item.recall.ask }} />;
       }
       return (
         <RecallQuestion
           word={word}
           at={item.recall.at}
           kid={kid}
           onDone={(r) => (r ? onDone({ correct: recallRight(r), hard: false, responseMs: r.elapsedMs, elapsedMs: r.elapsedMs, inContext: false, asked: 'write', recall: { totalMisses: r.totalMisses, hinted: r.hinted } }) : setFallback(true))}
         />
       );
     }
     return <AskedQuestion {...props} />;
   }

   /** Every question but 默写. */
   function AskedQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, confused, knownChars, level = 1, listCard, begun, newToday = false }: Props) {
     const sentence = item.ask === 'fit' || item.ask === 'usage';
   ```

   The rest of the old body stays as `AskedQuestion`'s body.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/activities/practice src/audio/loneReading.test.ts src/childEmoji.test.ts src/noErhua.test.ts && npx tsc --noEmit`
Expected: PASS. `loneReading` passes because both the `speak()` and the `<SpeakButton>` give `reading`.

- [ ] **Step 5: Commit**

```bash
git add src/activities/practice/RecallQuestion.tsx src/activities/practice/RecallQuestion.test.tsx src/activities/practice/PracticeQuestion.tsx
git commit -m "$(cat <<'EOF'
默写 screen: the 组词 heard and gapped, written with no outline; strokes that fail ask the usual question (real test §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Recording a 默写 in the lesson

**Files:**
- Modify: `src/app/SessionScreen.tsx` (`onPracticeDone`)
- Test: `src/app/recallLesson.test.tsx`

**Interfaces:**
- Consumes:
  - `recordRecall(db, { wordId, writeId, reading, meaning }, { totalMisses, hinted }, now)` (Task 5).
  - `PracticeItem.recall` (Task 6); `PracticeResult.recall` and `asked: 'write'` (Task 7).
  - `writingCue` and `isGuess` (Task 2).
- Produces: in `onPracticeDone`:
  - A `r.recall` answer calls `recordRecall` with `reading: item.grades === 'recognise'`. `meaning` is true when `plan.meaningReviewIds` includes the word and `writingCue(word, at).blanked !== null`. Its ladder rung is noted as usual.
  - A fallback answer (`ask: 'recall'` without `r.recall`) is graded and guess-checked as the replaced ask (`asked`).

- [ ] **Step 1: Write the failing test**

Create `src/app/recallLesson.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void; onMistake?: (d: { mistakesOnStroke: number }) => void };
const quizzes: QuizOpts[] = [];
let loadError: (() => void) | undefined;
vi.mock('hanzi-writer', () => ({
  default: {
    create: vi.fn((_el: unknown, _ch: string, opts: { onLoadCharDataError?: () => void }) => {
      loadError = opts.onLoadCharDataError;
      return { quiz: (o: QuizOpts) => { quizzes.push(o); return Promise.resolve(); }, cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() };
    }),
  },
}));
import { Rating } from 'ts-fsrs';
import { getRungs, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { makeCard } from '../test/fixtures';
import { SessionScreen } from './SessionScreen';

const words = builtinWords(0);
const cao = words.find((w) => w.text === '草')!;
const shan = words.find((w) => w.text === '山')!;

async function lesson() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: true, speaking: false } });
  await putCards(app.db, [makeCard(cao.id, 'recognise', new Date(2026, 9, 1), true), makeCard(cao.id, 'write', new Date(2026, 9, 20), true), makeCard(shan.id, 'recognise', new Date(2026, 9, 1), true)]);
  const rec = createSessionRecord({ steps: ['practice'], reviewWordIds: [cao.id, shan.id], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, practiceTimeBoxMs: 300_000 }, '2026-10-02', app.now().getTime());
  const queue = [
    { wordId: cao.id, rung: 1 as const, ask: 'recall' as const, grades: 'recognise' as const, retry: false, due: true, recall: { at: 0, writeId: cao.id, ask: 'read' as const } },
    { wordId: shan.id, rung: 1 as const, ask: 'read' as const, grades: 'recognise' as const, retry: false, due: true },
  ];
  await saveSession(app.db, { ...rec, activeMs: 1000, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 });
  quizzes.length = 0;
  renderWithApp(<SessionScreen free={false} />, app);
  await waitFor(() => expect(quizzes.length).toBeGreaterThan(0));
  return app;
}

describe('默写 in a lesson (real test spec 2026-10-23 §4)', () => {
  it('strokes that can’t load: the word is asked as its normal first question, and that answer grades its reading as a tap', async () => {
    const app = await lesson();
    act(() => loadError!());
    fireEvent.click(await screen.findByRole('button', { name: cao.pinyin }));
    fireEvent.click(await screen.findByText('继续'));
    await screen.findByRole('button', { name: shan.pinyin });
    const logs = await logsSince(app.db, 0);
    expect(logs.filter((l) => l.kind === 'write')).toEqual([]);
    expect(logs.find((l) => l.kind === 'recognise' && l.wordId === cao.id)?.source).toBeUndefined();
  });
  it('written right: its write card is logged as a recall, its due reading card rates Good, and the round goes on', async () => {
    const app = await lesson();
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    fireEvent.click(await screen.findByText('继续'));
    expect(await screen.findByRole('button', { name: shan.pinyin })).toBeTruthy(); // the next item
    const logs = await logsSince(app.db, 0);
    expect(logs.find((l) => l.kind === 'write')).toMatchObject({ wordId: cao.id, source: 'recall', correct: true, rating: Rating.Good, misses: 0 });
    expect(logs.find((l) => l.kind === 'recognise' && l.wordId === cao.id)).toMatchObject({ rating: Rating.Good, source: 'recall' });
    expect((await getRungs(app.db)).get(cao.id)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/recallLesson.test.tsx`
Expected: FAIL. "written right" finds no write log, because `onPracticeDone` grades nothing for `asked: 'write'`.

- [ ] **Step 3: Implement**

In `src/app/SessionScreen.tsx`:
1. Add `recordRecall` to the `../session/record` import:

   ```ts
   import { beginNewWord, bringForward, recordMeaningOnce, recordRecall, recordRecognitionOnce, ratedToday, setLessonLists, lessonSlowLines, markTraced, markWriteSkipped, recordHear, recordMeaning, recordUnderstand, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
   ```

2. After `import { meaningCredit } from '../session/writeCredit';` add:

   ```ts
   import { writingCue } from '../activities/writing/cue';
   ```

3. In `onPracticeDone`, replace (as Task 2 left it):

   ```ts
         let sent = false;
         const guess = isGuess(item, r); // too fast to have read it (real test spec §6): Hard, and no rung
   ```

   with:

   ```ts
         let sent = false;
         // a 默写 whose strokes couldn't load was asked as the question it replaced: that answer is a tap like any other
         const asked: PracticeItem = item.ask === 'recall' && item.recall && !r.recall ? { ...item, ask: item.recall.ask } : item;
         const guess = isGuess(asked, r); // too fast to have read it (real test spec §6): Hard, and no rung
   ```

4. Replace:

   ```ts
           if (item.grades === 'understand' && r.asked === 'understand') know.cardsById.set(
   ```

   with:

   ```ts
           if (item.recall && r.recall) {
             // a 默写 (real test spec 2026-10-23 §4): the character's write card, the word's due reading card, and its due meaning card
             // when the cue was a 组词
             const w = know.wordsById.get(item.wordId);
             const meaning = (rec.plan.meaningReviewIds ?? []).includes(item.wordId) && !!w && writingCue(w, item.recall.at).blanked !== null;
             for (const c of await recordRecall(db, { wordId: item.wordId, writeId: item.recall.writeId, reading: item.grades === 'recognise', meaning }, r.recall, now())) know.cardsById.set(c.id, c);
           } else if (item.grades === 'understand' && r.asked === 'understand') know.cardsById.set(
   ```

5. Replace `if (item.ask !== 'fish' && item.ask !== 'understand' && !item.list && !guess) await noteRung(` with:

   ```ts
           if (asked.ask !== 'fish' && asked.ask !== 'understand' && !item.list && !guess) await noteRung(
   ```

6. Replace `await noteListPractice(item, r);` with `await noteListPractice(asked, r);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/SessionScreen.tsx src/app/recallLesson.test.tsx
git commit -m "$(cat <<'EOF'
Lesson: a 默写 is graded by recordRecall; its fallback question is graded as a tap (real test §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: What the parent sees (§7)

**Files:**
- Modify: `src/stats/fromMemory.ts`, `src/parent/WordsPanel.tsx`, `src/parent/ProgressPanel.tsx`, `src/parent/ParentArea.tsx`, `src/styles.css`
- Test: `src/stats/fromMemory.test.ts`, `src/parent/progressPanel.test.tsx`, `src/parent/parentB.test.tsx`

**Interfaces:**
- Consumes: `isMadeRight`, `isTap` (Task 4); `logsSince(db, sinceMs)` from `src/store/repo.ts`.
- Produces, in `src/stats/fromMemory.ts`:
  - `isFromMemory(l): boolean`: a write log, or a log with source `'recall'`.
  - `EVIDENCE_DAYS = 14` and `TAPS_SHOWN = 5`.
  - `interface WordEvidence { memory: { right: boolean; at: number } | null; taps: boolean[]; tapOnly: boolean }`.
  - `wordEvidence(logs, now): Map<string, WordEvidence>`.
  - `evidenceLine(e): string`, for example 「默写 ✓ 10/22 · 点选 ✓✓✗」 plus ` · 只点选`.
  - `weekFromMemory(logs, now): { words: number; right: number }`.
- Produces, in the parent area:
  - `showTapOnlyNext()` from `src/parent/WordsPanel.tsx`. The next Words panel opens filtered to 只点选.
  - `ProgressPanel` props `logs?: ReviewLog[]` and `onTapOnly?: () => void`; `ProgressTab({ onTapOnly })`.
- Rulings:
  - "This week" = the last 7 days. "旧字" = a write log whose card wasn't New. "写对" = his latest try that week is right from memory.
  - "Production" includes a 写一写 recall pass with at most 1 miss.

- [ ] **Step 1: Write the failing tests**

In `src/stats/fromMemory.test.ts`, change the imports to:

```ts
import { Rating, State } from 'ts-fsrs';
import { evidenceLine, isMadeRight, isTap, rightHistory, weekFromMemory, wordEvidence } from './fromMemory';
```

and append:

```ts

describe('what the parent sees (real test spec 2026-10-23 §7)', () => {
  const now = new Date(2026, 9, 23, 18);
  const day = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  it('a word’s line: its last 默写 with its date, then up to 5 latest taps, oldest first', () => {
    const logs = [
      log('b:草', 'recognise', day(15), { correct: false, rating: Rating.Again }),
      ...[16, 17, 18, 19, 20].map((d) => log('b:草', 'recognise', day(d), d === 19 ? { correct: false, rating: Rating.Again } : {})),
      log('b:草', 'write', day(22), { misses: 0, source: 'recall' }),
      log('b:草', 'recognise', day(1)), // before the 14 days: left out
    ];
    const e = wordEvidence(logs, now).get('b:草')!;
    expect(e).toEqual({ memory: { right: true, at: day(22) }, taps: [true, true, true, false, true], tapOnly: false });
    expect(evidenceLine(e)).toBe('默写 ✓ 10/22 · 点选 ✓✓✓✗✓');
  });
  it('只点选: right taps but no right production in the 14 days (a wrong 默写 doesn’t count)', () => {
    const logs = [log('b:花', 'meaning', day(20), { source: 'use' }), log('b:花', 'write', day(21), { misses: 3, correct: false, source: 'recall' }), log('b:山', 'hear', day(20)), log('b:山', 'say', day(21))];
    const ev = wordEvidence(logs, now);
    expect(ev.get('b:花')!.tapOnly).toBe(true);
    expect(evidenceLine(ev.get('b:花')!)).toBe('默写 ✗ 10/21 · 点选 ✓ · 只点选');
    expect(ev.get('b:山')!.tapOnly).toBe(false); // a confirmed Say take is a production
  });
  it('this week from memory: earlier words written (a write card he had), and how many his latest try got right', () => {
    const logs = [
      log('b:草', 'write', day(20), { misses: 0, source: 'recall', state: State.Review }),
      log('b:花', 'write', day(21), { misses: 2, correct: false, source: 'recall', state: State.Review }),
      log('b:花', 'write', day(22), { misses: 0, state: State.Review }), // 写一写 later in the week: its latest try is right
      log('b:山', 'write', day(22), { misses: 0, state: State.New }), // a new word's first writing: not an earlier word
      log('b:水', 'write', day(10), { misses: 0, state: State.Review }), // last week
    ];
    expect(weekFromMemory(logs, now)).toEqual({ words: 2, right: 2 });
  });
});
```

Append to `src/parent/progressPanel.test.tsx`:

```tsx

describe('from memory this week (real test spec 2026-10-23 §7)', () => {
  it('counts earlier words written from memory and the right ones, and the 只点选 words with a link to them', async () => {
    const { fireEvent } = await import('@testing-library/preact');
    const { vi } = await import('vitest');
    const now = new Date(2026, 9, 23, 18);
    const at = new Date(2026, 9, 22, 9).getTime();
    const logs = [
      { cardId: 'b:草:write', wordId: 'b:草', kind: 'write' as const, at, rating: 3 as const, correct: true, misses: 0, source: 'recall' as const, state: 2 as const },
      { cardId: 'b:花:write', wordId: 'b:花', kind: 'write' as const, at, rating: 1 as const, correct: false, misses: 4, source: 'recall' as const, state: 2 as const },
      { cardId: 'b:山:recognise', wordId: 'b:山', kind: 'recognise' as const, at, rating: 3 as const, correct: true },
    ];
    const onTapOnly = vi.fn();
    render(<ProgressPanel know={summarize([makeWord('门')], [])} settings={DEFAULT_SETTINGS} now={now} logs={logs} onTapOnly={onTapOnly} />);
    expect(screen.getByText('从记忆写出：2 个旧字，1 个写对')).toBeTruthy();
    expect(document.querySelector('.progress__memory')!.textContent).toContain('1 word');
    fireEvent.click(screen.getByText('Show them'));
    expect(onTapOnly).toHaveBeenCalled();
  });
});
```

In `src/parent/parentB.test.tsx`:
- change `import { fireEvent, screen, waitFor } from '@testing-library/preact';` to `import { cleanup, fireEvent, screen, waitFor } from '@testing-library/preact';`;
- change `import { allCards, allWords, getSettings, putWords, updateSettings } from '../store/repo';` to `import { addReviewLog, allCards, allWords, getSettings, putWords, updateSettings } from '../store/repo';`;
- change `import { WordsPanel } from './WordsPanel';` to `import { showTapOnlyNext, WordsPanel } from './WordsPanel';`;
- insert before `describe('SettingsPanel zodiac', () => {`:

```tsx
describe('WordsPanel: from memory or by tapping (real test spec 2026-10-23 §7)', () => {
  it('a line under each word with its last 默写 and latest taps, 只点选 marked; Progress’s link opens on those words', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('草', { listName: '听写 1' }), makeWord('花', { listName: '听写 1' })]);
    const at = new Date(2026, 9, 1, 9).getTime();
    await addReviewLog(app.db, { cardId: 'b:草:write', wordId: 'b:草', kind: 'write', at, rating: 3, correct: true, misses: 0, source: 'recall' });
    await addReviewLog(app.db, { cardId: 'b:花:recognise', wordId: 'b:花', kind: 'recognise', at, rating: 3, correct: true });
    renderWithApp(<WordsPanel />, app);
    const row = (await screen.findByText('默写 ✓ 10/1')).closest('tr')!;
    expect(row.previousElementSibling!.textContent).toContain('草');
    expect(screen.getByText('点选 ✓ · 只点选')).toBeTruthy();
    cleanup();
    showTapOnlyNext();
    renderWithApp(<WordsPanel />, app);
    await screen.findByText('点选 ✓ · 只点选');
    expect(screen.queryByText('草', { selector: 'td' })).toBeNull();
  });
});

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stats/fromMemory.test.ts src/parent/progressPanel.test.tsx src/parent/parentB.test.tsx`
Expected: FAIL. `wordEvidence`, `evidenceLine`, `weekFromMemory` and `showTapOnlyNext` aren't exported, and Progress has no memory line.

- [ ] **Step 3: Implement**

In `src/stats/fromMemory.ts`:
1. After `import { TAP_KINDS, type TapKind } from '../srs/scheduler';` add `import { State } from 'ts-fsrs';`.
2. After `isMadeRight`, add:

   ```ts

   /** A from-memory result, right or not: anything written (练一练's 默写, 写一写), or a word's reading a 默写 rated. */
   export const isFromMemory = (l: ReviewLog): boolean => l.kind === 'write' || l.source === 'recall';
   ```

3. Append at the end of the file:

   ```ts

   /** The parent's word line looks back this many days (§7), and shows this many of the latest taps. */
   export const EVIDENCE_DAYS = 14;
   export const TAPS_SHOWN = 5;

   /** A word's last from-memory result (right or not, when), its latest taps (oldest first), and whether it is 只点选: right taps but
    *  no right production in the window. */
   export interface WordEvidence { memory: { right: boolean; at: number } | null; taps: boolean[]; tapOnly: boolean }

   /** Every word with a from-memory result or a tap in the last EVIDENCE_DAYS days. */
   export function wordEvidence(logs: readonly ReviewLog[], now: Date): Map<string, WordEvidence> {
     const since = now.getTime() - EVIDENCE_DAYS * 86_400_000;
     const out = new Map<string, WordEvidence & { made: boolean }>();
     for (const l of [...logs].filter((x) => x.at >= since).sort((a, b) => a.at - b.at)) {
       const memory = isFromMemory(l);
       if (!memory && !isTap(l) && !isMadeRight(l)) continue;
       const e = out.get(l.wordId) ?? { memory: null, taps: [], tapOnly: false, made: false };
       if (memory) e.memory = { right: isMadeRight(l), at: l.at };
       else if (isTap(l)) e.taps = [...e.taps, l.correct].slice(-TAPS_SHOWN);
       if (isMadeRight(l)) e.made = true;
       out.set(l.wordId, e);
     }
     return new Map([...out].map(([id, { made, ...e }]) => [id, { ...e, tapOnly: !made && e.taps.some(Boolean) }]));
   }

   const mark = (right: boolean) => (right ? '✓' : '✗');
   const monthDay = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()}`; };

   /** 「默写 ✓ 10/22 · 点选 ✓✓✗」, then 「只点选」 when it is tap-only (§7). */
   export function evidenceLine(e: WordEvidence): string {
     return [
       e.memory ? `默写 ${mark(e.memory.right)} ${monthDay(e.memory.at)}` : null,
       e.taps.length ? `点选 ${e.taps.map(mark).join('')}` : null,
       e.tapOnly ? '只点选' : null,
     ].filter(Boolean).join(' · ');
   }

   /** This week (the last 7 days) from memory (§7): earlier words written (a write card he had before), and how many of them his
    *  latest try got right. */
   export function weekFromMemory(logs: readonly ReviewLog[], now: Date): { words: number; right: number } {
     const since = now.getTime() - 7 * 86_400_000;
     const last = new Map<string, ReviewLog>();
     for (const l of [...logs].sort((a, b) => a.at - b.at)) if (l.at >= since && l.kind === 'write' && l.state !== State.New) last.set(l.wordId, l);
     return { words: last.size, right: [...last.values()].filter(isMadeRight).length };
   }
   ```

In `src/parent/WordsPanel.tsx`:
1. Before `import { useEffect, useRef, useState } from 'preact/hooks';` add `import { Fragment } from 'preact';`.
2. Replace:

   ```ts
   import { deleteWord, putWords } from '../store/repo';
   import type { Word } from '../types';
   ```

   with:

   ```ts
   import { deleteWord, logsSince, putWords } from '../store/repo';
   import { EVIDENCE_DAYS, evidenceLine, wordEvidence, type WordEvidence } from '../stats/fromMemory';
   import type { Word } from '../types';
   ```

3. Replace:

   ```ts
   type Filter = 'lists' | `level${1 | 2 | 3 | 4 | 5 | 6 | 7}` | 'paused';
   const MAX_ROWS = 200;
   ```

   with:

   ```ts
   type Filter = 'lists' | `level${1 | 2 | 3 | 4 | 5 | 6 | 7}` | 'paused' | 'tapOnly';
   const MAX_ROWS = 200;
   let openOn: Filter | null = null;
   /** The next Words panel opens on the 只点选 words (Progress's link, real test spec 2026-10-23 §7). */
   export const showTapOnlyNext = () => { openOn = 'tapOnly'; };
   ```

4. Replace `const [filter, setFilter] = useState<Filter>('lists');` with:

   ```ts
     const [filter, setFilter] = useState<Filter>(() => { const f = openOn ?? 'lists'; openOn = null; return f; });
     const [evidence, setEvidence] = useState<Map<string, WordEvidence>>(new Map()); // from memory or by tapping, the last 14 days (§7)
   ```

5. Replace `const reload = async () => setKnow(await loadKnowledge(db));` with:

   ```ts
     const reload = async () => {
       setKnow(await loadKnowledge(db));
       setEvidence(wordEvidence(await logsSince(db, now().getTime() - EVIDENCE_DAYS * 86_400_000), now()));
     };
   ```

6. After `if (filter === 'paused' && !w.paused) return false;` add:

   ```ts
         if (filter === 'tapOnly' && !evidence.get(w.id)?.tapOnly) return false;
   ```

7. After `<option value="paused">Paused</option>` add:

   ```tsx
                 <option value="tapOnly">只点选 (tap only, last 14 days)</option>
   ```

8. Replace:

   ```tsx
               {shown.slice(0, MAX_ROWS).map((w) => (
                 <tr key={w.id}>
   ```

   with:

   ```tsx
               {shown.slice(0, MAX_ROWS).map((w) => (
                 <Fragment key={w.id}>
                 <tr>
   ```

   and replace:

   ```tsx
                   <td>{w.source === 'parent' && <button type="button" class="small-btn" onClick={() => void remove(w)}>Delete</button>}</td>
                 </tr>
               ))}
   ```

   with:

   ```tsx
                   <td>{w.source === 'parent' && <button type="button" class="small-btn" onClick={() => void remove(w)}>Delete</button>}</td>
                 </tr>
                 {/* from memory against tap only, the last 14 days (real test spec 2026-10-23 §7) */}
                 {evidence.has(w.id) && <tr class="words__evidence"><td colSpan={8} lang="zh-CN">{evidenceLine(evidence.get(w.id)!)}</td></tr>}
                 </Fragment>
               ))}
   ```

In `src/parent/ProgressPanel.tsx`:
1. Replace:

   ```ts
   import { produceChars } from '../stats/produce';
   import type { Settings } from '../types';
   ```

   with:

   ```ts
   import { produceChars } from '../stats/produce';
   import { EVIDENCE_DAYS, weekFromMemory, wordEvidence } from '../stats/fromMemory';
   import { logsSince } from '../store/repo';
   import type { ReviewLog, Settings } from '../types';
   ```

2. Replace `export function ProgressPanel({ know, settings, now }: { know: Knowledge; settings: Settings; now: Date }) {` with:

   ```tsx
   /**
    * This week from memory against tapping (real test spec 2026-10-23 §7): earlier words written from memory and how many right, and
    * the words only ever tapped right in the last 14 days, with a link to them in Words.
    */
   function MemoryLine({ logs, now, onTapOnly }: { logs: ReviewLog[]; now: Date; onTapOnly?: () => void }) {
     const week = weekFromMemory(logs, now);
     const tapOnly = [...wordEvidence(logs, now).values()].filter((e) => e.tapOnly).length;
     return (
       <div class="progress__memory">
         <p lang="zh-CN">从记忆写出：{week.words} 个旧字，{week.right} 个写对</p>
         <p class="muted">This week (the last 7 days): earlier words written from memory, and how many he got right.</p>
         <p>
           <span lang="zh-CN">只点选</span> (right by tapping, never from memory, last 14 days): {tapOnly} word{tapOnly === 1 ? '' : 's'}
           {tapOnly > 0 && onTapOnly && <> <button type="button" class="small-btn" onClick={onTapOnly}>Show them</button></>}
         </p>
       </div>
     );
   }

   export function ProgressPanel({ know, settings, now, logs, onTapOnly }: { know: Knowledge; settings: Settings; now: Date; logs?: ReviewLog[]; onTapOnly?: () => void }) {
   ```

3. Replace `      <h3>MOE progress</h3>` with:

   ```tsx
         {logs && <MemoryLine logs={logs} now={now} onTapOnly={onTapOnly} />}
         <h3>MOE progress</h3>
   ```

4. Replace the whole `ProgressTab`:

   ```tsx
   /** The Progress tab: loads his cards, then the panel. */
   export function ProgressTab() {
     const { db, now, settings } = useApp();
     const [know, setKnow] = useState<Knowledge | null>(null);
     useEffect(() => {
       void loadKnowledge(db).then(setKnow);
     }, [db]);
     return know ? <ProgressPanel know={know} settings={settings} now={now()} /> : <section class="panel progress-panel"><p class="muted">Loading…</p></section>;
   }
   ```

   with:

   ```tsx
   /** The Progress tab: loads his cards and the last 14 days' logs, then the panel. `onTapOnly`: open Words on the 只点选 words. */
   export function ProgressTab({ onTapOnly }: { onTapOnly?: () => void } = {}) {
     const { db, now, settings } = useApp();
     const [know, setKnow] = useState<Knowledge | null>(null);
     const [logs, setLogs] = useState<ReviewLog[] | undefined>();
     useEffect(() => {
       void loadKnowledge(db).then(setKnow);
       void logsSince(db, now().getTime() - EVIDENCE_DAYS * 86_400_000).then(setLogs);
     }, [db]);
     return know ? <ProgressPanel know={know} settings={settings} now={now()} logs={logs} onTapOnly={onTapOnly} /> : <section class="panel progress-panel"><p class="muted">Loading…</p></section>;
   }
   ```

In `src/parent/ParentArea.tsx`:
- replace `import { WordsPanel } from './WordsPanel';` with `import { showTapOnlyNext, WordsPanel } from './WordsPanel';`;
- replace `<SkillsPanel school={<ProgressTab />} />` with:

  ```tsx
                <SkillsPanel school={<ProgressTab onTapOnly={() => { showTapOnlyNext(); navigate('words'); }} />} />
  ```

In `src/styles.css`, after `.progress__trend li { display: flex; flex-direction: column; align-items: center; min-width: 44px; }` add:

```css
/* from memory against tap only (real test spec 2026-10-23 §7): the week's line on Progress, a small line under each word in Words */
.progress__memory p { margin: 4px 0; }
.words__evidence td { padding-top: 0; font-size: 14px; color: var(--ink-soft); border-top: none; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/stats src/parent src/childEmoji.test.ts src/styles.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stats/fromMemory.ts src/stats/fromMemory.test.ts src/parent/WordsPanel.tsx src/parent/ProgressPanel.tsx src/parent/ParentArea.tsx src/parent/progressPanel.test.tsx src/parent/parentB.test.tsx src/styles.css
git commit -m "$(cat <<'EOF'
Parent: each word's 默写 against 点选 (只点选 marked); Progress's week line from memory, with a link (real test §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Stage cases in WebKit (§9)

**Files:**
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`

**Interfaces:**
- Consumes: `RecallQuestion` (Task 7); `FlashcardStep`'s `begun` (Task 3); `writingCue`. Strokes come from `scripts/stroke-route.ts`, which already serves every page.
- Produces: the cases `recall` (草's 组词 gap), `recall-sentence` (the character with the longest sentence cue, the tallest card) and `gap-six` (six begun choices, then the sheet after a miss). Each runs at all five sizes.

- [ ] **Step 1: Add the cases to the page**

In `scripts/stage-cases/page.tsx`, after `import { WritingStep } from '../../src/activities/writing/WritingStep';` add:

```ts
import { RecallQuestion } from '../../src/activities/practice/RecallQuestion';
import { writingCue } from '../../src/activities/writing/cue';
```

After the `else if (which === 'trace') { … }` block, add:

```tsx
else if (which === 'recall' || which === 'recall-sentence') {
  // 默写 in 练一练 (real test spec 2026-10-23 §4): 草's 组词 gap (＿地), and the character whose sentence cue is the longest (the
  // tallest cue over the 田字格); strokes from the package (stroke-route.ts)
  const words = builtinWords(0).filter((x) => Array.from(x.text).length === 1);
  const sentenceLength = (x: Word) => Array.from(writingCue(x).sentence ?? '').length;
  const w = which === 'recall' ? words.find((x) => x.text === '草')! : [...words].sort((a, b) => sentenceLength(b) - sentenceLength(a))[0]!;
  render(screen(<PinyinFade known={new Set()} on><RecallQuestion word={w} at={0} kid={DEFAULT_KID} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'gap-six') {
  // a revision word's 组词 gap (real test spec 2026-10-23 §5): six choices, every one a character he has begun
  const words = builtinWords(0);
  const w = words.find((x) => x.text === '草')!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} begun={new Set(Array.from('草花茶菜早吃次从出车春'))} onDone={() => {}} />), app);
}
```

- [ ] **Step 2: Add the checks**

In `scripts/stage-cases.ts`, before the comment `// 说一句 (production practice spec §4): the ask and its pattern, …`, add:

```ts
  // 默写 in 练一练 (real test spec 2026-10-23 §4): a 组词 gap and the longest sentence cue over an empty 田字格 (no outline), all on the card
  for (const c of ['recall', 'recall-sentence']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForSelector('.tianzige svg', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    if (!(await page.$('.tianzige svg'))) problems.push(`${size.name} ${c}: no 田字格`);
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
  }
  // a revision word's 组词 gap with six begun choices (real test spec §5): all six on the card, and the sheet after a miss
  {
    await page.goto(`file://${dir}/index.html?case=gap-six`);
    await page.waitForTimeout(300);
    const choices = await page.$$('.choice');
    if (choices.length !== 6) problems.push(`${size.name} gap-six: ${choices.length} choices, not 6`);
    problems.push(...(await cardClipped(page, `${size.name} gap-six`)));
    for (const b of choices) if ((await b.textContent())?.trim() !== '草') { await b.click(); break; }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/gap-six-wrong-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} gap-six wrong`)), ...(await sheetFits(page, `${size.name} gap-six wrong`)), ...(await sheetScrolls(page, `${size.name} gap-six wrong`)));
  }
```

- [ ] **Step 3: Run the stage cases in WebKit**

Run: `npx tsc --noEmit && npx tsx scripts/stage-cases.ts`
Expected: it exits 0 with no problem lines. Look at `fit-shots/stage-cases/recall-*.png`, `recall-sentence-*.png` and `gap-six-*.png`: the cue sits above an empty 田字格, there is no outline and no target pinyin, and the six choices sit in two rows on the card. (A first draft put the speaker on its own empty `.word-row__line` for a sentence cue. That left the hanging button above the card at every size, which is why it now sits on the sentence's line.)

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "$(cat <<'EOF'
Stage cases: 默写 (组词 and sentence cue) and the six-choice 组词 gap in WebKit at every size (real test §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage:**

| § | Requirement | Task |
|---|---|---|
| §3 | Due revision first, `early` first, spacing kept, the cut on new repeats | 1 |
| §3 | `practiceLeft` | Unchanged (runner); 1 |
| §4 | Ask `recall`, the `writingCue` cue, the speaker, no outline or target pinyin, hint after 2, right ≤ 1 miss and no hint | 6, 7 |
| §4 | Who: revision only, a write card, 词语 rule, never new or 写一写 today | 4 |
| §4 | How many 3/4; the tap-only, write-due, any order | 4 |
| §4 | Where it sits (replaces the first appearance, inside the box) | 6 |
| §4 | Grading: write, reading, meaning, pass | 5, 8 |
| §4 | 写一写 excludes the character | 4 |
| §4 | Fallback when strokes fail | 7, 8 |
| §4 | Prefetch | `App.tsx` already does it (ruling in Task 4) |
| §5 | Begun only with fallback, ≤ 2 look-alikes, no word with the cue (HSK, own list, 组词), 6/4, 都不对 unchanged, 词语 via begun before `ownNear` | 3 |
| §6 | 900 ms Hard, no rung, the exclusions, the nudge once after two, wrong unchanged | 2 |
| §7 | Words line, 只点选, Progress week line with a link, the `'recall'` source | 4, 5, 9 |
| §8 | `Ask` `'recall'`, `source` `'recall'`, no DB change, on with 写一写 | 4, 5, 6 |
| §9 | All tables; stage cases in WebKit | 1–10 |

**Placeholder scan:** none. Every code step has the code, and every edit names the exact text it replaces.

**Type consistency:**
- `RecallPick { wordId, at, writeId }` (Task 4) feeds `withRecall` (6).
- `RecallAsk { at, writeId, ask }` (6) is read by `PracticeQuestion` (7) and `SessionScreen` (8).
- `recallRight` lives in `writeCredit.ts` (5). Tasks 7 and 8 import it from there, never from `record.ts`.
- `RecallGrade` (5) is used in Task 8.
- `TapOutcome.guess` (2) is set in Task 2 and kept in Task 8.
- `PracticeResult.recall` / `asked: 'write'` (7) are read in Task 8.
- `RightHistory` / `rightHistory` (4) are used by `planNow` (4).
- `isMadeRight` / `isTap` (4) are used by `wordEvidence` (9).
- `Knowledge.begunTexts` (3) is passed in Task 3.

**Review Focus:** each of the five lines has its test in the owning task (Tasks 4, 6, 7, 8).
