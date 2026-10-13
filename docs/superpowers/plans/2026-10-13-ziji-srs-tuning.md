# ZiJi SRS Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ZiJi's FSRS scheduling honest and his own: a right tap is Hard until the word is produced, "slow" is slow for him, the parent sees real retention against 90%, and at 1,000 reviews the parent can fit FSRS to his memory in one tap (and undo it).

**Architecture:** The rating rule stays in one place (`toRating` in `src/srs/scheduler.ts`), now given a `produced` flag and a per-kind slow line computed once per lesson (`src/srs/slow.ts`). Every rating path logs the card's FSRS state, day gap and interval before the review, which feeds two pure functions: `retention()` (`src/stats/retention.ts`) and `fitData()` (`src/srs/fitData.ts`). The optimizer (`fsrs-browser`, WebAssembly) is wrapped in `src/srs/optimizer.ts` and only ever loaded by a dynamic `import()` from the parent's Skills panel; the scheduler is rebuilt from `settings.fsrs` at app start, after a restore, and on Use/Back to default.

**Tech Stack:** Vite 7, Preact, TypeScript 5.9 (tsconfig lib ES2022 — no `findLastIndex`/`toSorted`), vitest 4 + @testing-library/preact + fake-indexeddb, ts-fsrs 5.4.2, fsrs-browser 6.6.0, idb, vite-plugin-pwa (workbox generateSW), playwright-core 1.52 (WebKit).

**Spec:** `docs/superpowers/specs/2026-10-13-ziji-srs-tuning-design.md` (binding). Read it before starting any task.

## Global Constraints

- Every commit ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- ts-fsrs stays 5.4.2 on FSRS-6 defaults; desired retention stays **0.9**; no Easy ratings (spec §10).
- Fuzz: `enable_fuzz: true` in the app scheduler (spec §3.3).
- Hard until produced applies to card kinds `recognise`, `meaning`, `hear`, `understand`; "produced" = a passed `write`, `say` or `sentence` card (`card.passed` set). The 组词 credit from 写一写 is production: Good when right, no prior pass needed (spec §3.1).
- Write ratings (by misses), Say/说一句 ratings (parent ✓/✗) and rung passes (`passDays`) are unchanged (spec §3.1).
- Slow line: **2 × median** rated time of his last **40** right answers of that kind, clamped **3,000–12,000 ms**; fewer than **10** samples → **6,000 ms**; answers faster than `fastLimit` are left out; computed **once per lesson** at lesson start (spec §3.2).
- `ReviewLog` gains optional `state`, `elapsedDays` (whole local days since `card.last_review`, 0 = same day), `scheduledDays`. Older logs lack them. **No migration, no `lessonVersion` bump** (spec §4, §7).
- Retention: first review of the day of a card whose logged `state` was **Review**, last **30** days; two lines **Taps** (recognise, meaning, hear, understand) and **Writing** (write); Say/sentence excluded; shown at **30** counted reviews, else "Measuring — 12 of 30 reviews"; target **90%**; note below **85%**: "He's forgetting more than planned — reviews may be too far apart."; note above **95%**: "Reviews come sooner than he needs." (spec §5).
- Fit: **1,000** training items to enable; "Fit to his memory: 412 / 1,000 reviews" before; `enable_short_term: true`; invalid/failed → "Couldn't fit — keeping the default"; **Use these** stores `settings.fsrs = { w, fittedAt, reviews }`; **Keep default** discards; after fitting "Fitted on 1,032 reviews, 13 Oct" with **Back to default** and **Fit again** (enabled after **500** more reviews) (spec §6.2).
- `fsrs-browser` is **exactly 6.6.0**, loaded only via `import('fsrs-browser')`, never in the child's lesson path, never in the workbox precache; runtime-cached after first load (spec §6.2).
- Placement-begun cards, `say`/`sentence` cards and free play are left out of the fit (spec §6.1).
- At app start call `navigator.storage.persist()` once when available and not yet granted; ignore the result (spec §8).
- iPad is Safari: layout is checked in WebKit (playwright-core 1.52), not only Chromium.
- Keep new tests light: the full suite already has heavy render tests (`src/test/setup.ts` sets `asyncUtilTimeout` 10 s). Render components alone where possible; never walk a whole lesson in a new test.

## Review Focus

1. **A backup restored in the parent area** (with a fit, or from before fitting) must switch the scheduler at once, not on the next launch — Task 9 test "a restored fit applies straight away; a backup with none puts the defaults back".
2. **The first Fit tap with no network** (the optimizer has never been downloaded) must say it needs the internet, and a later tap must try again rather than stay broken — Task 7 test "offline the first time: \"offline\", and the next tap tries again".
3. **A double tap on Fit** (a tap can land before the disabled button re-renders on iPad) must run the optimizer once — Task 8 test "a double tap on Fit runs the optimizer once".
4. **A word whose write card passes mid-lesson** must rate his next tap on it Good in that same lesson (produced is looked up per answer, never cached) — Task 3 test "a write that passes mid-lesson makes his next tap on the word Good, the same lesson".
5. **A stored fit that is not 21 finite numbers** (an older or hand-edited backup) must leave the scheduler on its defaults at app start — Task 9 test "builds the scheduler from his fitted parameters, and from the defaults when they are invalid".

---

## File Structure

**Create**
- `src/srs/slow.ts` — his slow lines: `slowMs`, `slowLines`, `ratedMs`, and the moved `LISTEN_MS`/`USE_READING_MS`.
- `src/srs/fitData.ts` — pure: review logs → optimizer items (`FitData`).
- `src/srs/optimizer.ts` — lazy `fsrs-browser` wrapper: `fitParameters(data) → FitResult`.
- `src/srs/compare.ts` — before/after intervals for one sample word.
- `src/stats/retention.ts` — pure: `retention(logs, now)`.
- `src/store/persist.ts` — `keepStorage()` (spec §8).
- `src/parent/RetentionCheck.tsx` — "Remembered after a gap" block.
- `src/parent/FitToMemory.tsx` — the fit flow.
- `src/test/reviewHistory.ts` — deterministic made-up review history (optimizer check + fit sweep).
- `scripts/optimizer-check.html`, `scripts/optimizer-check.ts` — the real optimizer in WebKit.
- Tests: `src/srs/slow.test.ts`, `src/srs/fitData.test.ts`, `src/srs/optimizer.test.ts`, `src/srs/compare.test.ts`, `src/stats/retention.test.ts`, `src/store/persist.test.ts`, `src/session/srsRecord.test.ts`, `src/parent/retentionCheck.test.tsx`, `src/parent/fitToMemory.test.tsx`.

**Modify**
- `src/types.ts` — `ReviewLog` fields, `CardSnapshot`, `FsrsFit`, `Recording.cardBefore`, `Settings.fsrs`.
- `src/srs/scheduler.ts` — fuzz, fitted parameters, `TapKind`, `snapshot`, `localDayGap`, `toRating` with context.
- `src/session/record.ts` — `rateTap`, `isProduced`, `lessonSlowLines`, snapshots in every log.
- `src/session/say.ts` — take keeps `cardBefore`; verdict log carries it.
- `src/app/SessionScreen.tsx` — slow lines computed at lesson load, passed to rating sites.
- `src/parent/SkillsPanel.tsx` — loads all logs; renders `RetentionCheck` and `FitToMemory`.
- `src/parent/BackupPanel.tsx` — restore rebuilds the scheduler.
- `src/bootstrap.ts` — scheduler from settings; `keepStorage()`.
- `src/styles.css` — Skills panel retention/fit styles.
- `src/test/fixtures.ts` — `markProduced`.
- `vite.config.ts` — worker format, optimizeDeps exclude, precache ignore, runtime cache, vitest alias.
- `package.json` / `package-lock.json` — `fsrs-browser` 6.6.0, `optimizer` script.
- `scripts/fit-profile.ts`, `scripts/fit-check.ts` — review history + Skills screenshots.
- Existing tests: `src/srs/scheduler.test.ts`, `src/session/record.test.ts`, `src/session/understandRecord.test.ts`, `src/store/backup.test.ts`, `src/bootstrap.test.ts`, `src/parent/parentB.test.tsx`.

**Fuzz and existing tests (checked):** ts-fsrs seeds its fuzz from the review time, `reps` and `difficulty × stability` (`DefaultInitSeedStrategy`), so a given review always lands on the same day. With `enable_fuzz: true` the whole existing suite (235 files, 2,041 tests) still passes unchanged: no existing test asserts an exact interval of 2.5 days or more (`scheduler.test.ts` "pushes it further out" asserts `>`; `seededKnownCard` tests build cards directly). No injectable rng or test-only scheduler is needed. The new fuzz test (Task 1) asserts the interval lies in `get_fuzz_range` and that twelve near-identical cards spread over more than one day.

---

### Task 1: Scheduler — fuzz on, fitted parameters, card snapshots

**Files:**
- Modify: `src/types.ts` (ReviewLog ~75-86, Recording ~194-206, Settings ~263-295)
- Modify: `src/srs/scheduler.ts` (whole file)
- Test: `src/srs/scheduler.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `types.ts`: `ReviewLog.state?: State; elapsedDays?: number; scheduledDays?: number`; `interface CardSnapshot { state: State; elapsedDays: number; scheduledDays: number }`; `interface FsrsFit { w: number[]; fittedAt: number; reviews: number }`; `Recording.cardBefore?: CardSnapshot`; `Settings.fsrs?: FsrsFit`.
  - `scheduler.ts`: `FSRS_PARAM_COUNT = 21`; `validParams(w: unknown): w is number[]`; `setSchedulerParams(w: readonly number[] | null | undefined): void`; `schedulerParams(): readonly number[]`; `type TapKind = 'recognise' | 'meaning' | 'hear' | 'understand'`; `TAP_KINDS: readonly TapKind[]`; `SLOW_ANSWER_MS = 6000` (unchanged); `localDayGap(from: Date | number, to: Date | number): number`; `snapshot(card: Card, now: Date): CardSnapshot`.

- [ ] **Step 1: Add the types**

In `src/types.ts` change the ts-fsrs import to include `State`:

```ts
import type { Card as FsrsCard, Grade, State } from 'ts-fsrs';
```

Replace the end of `interface ReviewLog` (the `source` line and closing brace) with:

```ts
  source?: 'use' | 'write'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use), or from a 组词 written in 写一写 (production practice spec §3)
  // the card as it was before this review (SRS tuning spec §4); logs written before it have none
  state?: State; // New, Learning, Review or Relearning
  elapsedDays?: number; // whole local days since the card's last review (0 = the same day)
  scheduledDays?: number; // the interval the card was on
}

/** The card before a review, as a review log keeps it (SRS tuning spec §4); a Say or 说一句 take keeps one for the parent's verdict. */
export interface CardSnapshot { state: State; elapsedDays: number; scheduledDays: number }

/** His fitted FSRS parameters (SRS tuning spec §6.2, §7): 21 numbers, when they were fitted, and on how many reviews. */
export interface FsrsFit { w: number[]; fittedAt: number; reviews: number }
```

In `interface Recording`, after the `meaning?:` line add:

```ts
  cardBefore?: CardSnapshot; // a Say or 说一句 take: its card as it was when he recorded (SRS tuning spec §4), for the verdict's log
```

In `interface Settings`, after the `contentVersion?:` line add:

```ts
  fsrs?: FsrsFit; // his fitted FSRS parameters (SRS tuning spec §6.2); absent: the defaults
```

Do **not** add `fsrs` to `DEFAULT_SETTINGS` and do **not** bump `lessonVersion`.

- [ ] **Step 2: Write the failing tests**

In `src/srs/scheduler.test.ts`, replace the two import lines with:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { default_w, fsrs, generatorParameters, get_fuzz_range, Rating, State } from 'ts-fsrs';
import { isKnown, localDayGap, newCard, review, schedulerParams, seededKnownCard, setSchedulerParams, snapshot, toRating, validParams } from './scheduler';
```

and insert these three `describe` blocks after the existing `describe('review', …)` block:

```ts
describe('fuzz (spec §3.3)', () => {
  it('a long interval lands inside ts-fsrs fuzz range around the unfuzzed one, the same day every time', () => {
    const plain = fsrs(generatorParameters({ enable_fuzz: false }));
    const c = seededKnownCard(now, 20);
    const at = c.due;
    const exact = plain.next(c, at, Rating.Good).card.scheduled_days;
    const fuzzed = review(c, Rating.Good, at);
    const { min_ivl, max_ivl } = get_fuzz_range(exact, 20, 36500);
    expect(fuzzed.scheduled_days).toBeGreaterThanOrEqual(min_ivl);
    expect(fuzzed.scheduled_days).toBeLessThanOrEqual(max_ivl);
    expect(review(c, Rating.Good, at).due.getTime()).toBe(fuzzed.due.getTime()); // seeded by card and time: repeatable
  });
  it('spreads words learned together over more than one day', () => {
    const plain = fsrs(generatorParameters({ enable_fuzz: false }));
    const days = new Set<number>();
    const unfuzzed = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const c = { ...seededKnownCard(now, 20), difficulty: 5 + i * 0.01 }; // twelve near-identical words
      days.add(review(c, Rating.Good, c.due).scheduled_days);
      unfuzzed.add(plain.next(c, c.due, Rating.Good).card.scheduled_days);
    }
    expect(unfuzzed.size).toBe(1); // without fuzz they would all come back on one day
    expect(days.size).toBeGreaterThan(1);
  });
});

describe('fitted parameters (spec §6.2)', () => {
  afterEach(() => setSchedulerParams(null));
  const fitted = default_w.map((x, i) => (i === 0 ? x * 3 : x)); // a longer first interval after Again
  it('validParams takes 21 finite numbers only', () => {
    expect(validParams([...default_w])).toBe(true);
    expect(validParams(fitted)).toBe(true);
    expect(validParams(default_w.slice(0, 19))).toBe(false);
    expect(validParams([...default_w.slice(0, 20), Number.NaN])).toBe(false);
    expect(validParams('nope')).toBe(false);
    expect(validParams(undefined)).toBe(false);
  });
  it('the scheduler uses valid fitted parameters', () => {
    setSchedulerParams(fitted);
    expect(schedulerParams()[0]).toBeCloseTo(fitted[0]!, 3);
    const a = review(newCard(now), Rating.Again, now);
    setSchedulerParams(null);
    const b = review(newCard(now), Rating.Again, now);
    expect(a.stability).toBeGreaterThan(b.stability);
  });
  it('falls back to the defaults on invalid parameters', () => {
    setSchedulerParams([1, 2, 3]);
    expect([...schedulerParams()]).toEqual([...default_w]);
    setSchedulerParams([...default_w.slice(0, 20), Number.POSITIVE_INFINITY]);
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
});

describe('snapshot (spec §4)', () => {
  it('a new card: state New, no gap, no interval', () => {
    expect(snapshot(newCard(now), now)).toEqual({ state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
  it('a card in review: whole local days since its last review, and the interval it was on', () => {
    const c = seededKnownCard(new Date(2026, 9, 2, 23, 30), 14);
    expect(snapshot(c, new Date(2026, 9, 3, 0, 15))).toEqual({ state: State.Review, elapsedDays: 1, scheduledDays: 14 }); // 45 minutes, but a new day
    expect(snapshot(c, new Date(2026, 9, 2, 23, 50)).elapsedDays).toBe(0);
  });
  it('localDayGap counts calendar days, not 24-hour blocks', () => {
    expect(localDayGap(new Date(2026, 9, 2, 8), new Date(2026, 9, 9, 7))).toBe(7);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/srs/scheduler.test.ts`
Expected: FAIL — `localDayGap`, `schedulerParams`, `setSchedulerParams`, `snapshot`, `validParams` are not exported (TypeError: … is not a function), and the "spreads words" test fails (`days.size` is 1 with fuzz off).

- [ ] **Step 4: Implement**

Replace `src/srs/scheduler.ts` with (note `Outcome`/`toRating` are unchanged here; Task 3 changes them):

```ts
import { checkParameters, createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type FSRS, type Grade } from 'ts-fsrs';
import { localDateKey, parseDateKey } from '../lib/date';
import type { CardSnapshot } from '../types';

/** FSRS-6 has 21 parameters; a fit (src/srs/optimizer.ts) returns 21 and settings.fsrs.w stores them (SRS tuning spec §6.2). */
export const FSRS_PARAM_COUNT = 21;

/** Fuzz on (spec §3.3): words learned together spread over nearby days. ts-fsrs seeds it from the card and the review time, so a
 *  given review always lands on the same day — tests stay repeatable. */
const build = (w?: number[]): FSRS => fsrs(generatorParameters({ enable_fuzz: true, ...(w ? { w } : {}) }));

let scheduler = build();

/** Fitted parameters the scheduler can use: 21 finite numbers that ts-fsrs's checkParameters accepts. */
export function validParams(w: unknown): w is number[] {
  if (!Array.isArray(w) || w.length !== FSRS_PARAM_COUNT) return false;
  try {
    checkParameters(w as number[]);
    return true;
  } catch {
    return false;
  }
}

/** Use his fitted parameters (null or invalid: the defaults). Called at app start and whenever settings.fsrs changes (spec §6.2). */
export function setSchedulerParams(w: readonly number[] | null | undefined): void {
  scheduler = build(w && validParams([...w]) ? [...w] : undefined);
}

/** The parameters the scheduler is using now (its defaults, or his fitted ones after clipping). */
export const schedulerParams = (): readonly number[] => scheduler.parameters.w;

/** The tap-answered card kinds (spec §3.1): a right answer rates Hard until the word has a production pass. */
export type TapKind = 'recognise' | 'meaning' | 'hear' | 'understand';
export const TAP_KINDS: readonly TapKind[] = ['recognise', 'meaning', 'hear', 'understand'];

/** The slow line before he has 10 answers of a kind (spec §3.2). */
export const SLOW_ANSWER_MS = 6000;

export type Outcome =
  | { kind: 'recognise' | 'meaning'; correct: boolean; responseMs: number }
  | { kind: 'write'; totalMisses: number };

export function toRating(o: Outcome): Grade {
  if (o.kind === 'write') {
    if (o.totalMisses === 0) return Rating.Good;
    return o.totalMisses <= 3 ? Rating.Hard : Rating.Again;
  }
  if (!o.correct) return Rating.Again; // reading or meaning
  return o.responseMs > SLOW_ANSWER_MS ? Rating.Hard : Rating.Good;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function review(card: Card, rating: Grade, now: Date): Card {
  return scheduler.next(card, now, rating).card;
}

/** Whole local days from one moment to another (0 = the same day). */
export function localDayGap(from: Date | number, to: Date | number): number {
  const a = parseDateKey(localDateKey(new Date(from)));
  const b = parseDateKey(localDateKey(new Date(to)));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000); // round: a daylight-saving day is 23 or 25 hours
}

/** What a review log keeps about the card before this review (spec §4), so retention can be measured and FSRS fitted. */
export function snapshot(card: Card, now: Date): CardSnapshot {
  return { state: card.state, elapsedDays: card.last_review ? Math.max(0, localDayGap(card.last_review, now)) : 0, scheduledDays: card.scheduled_days };
}

export function isKnown(card: Card): boolean {
  return card.state === State.Review;
}

/** Known at some point — a lapse into relearning doesn't take earned rewards away. */
export function isEarned(card: Card): boolean {
  return card.state === State.Review || card.state === State.Relearning;
}

/** A card for a character the child already knew at placement: in review, due in `days` (14 by default). */
export function seededKnownCard(now: Date, days = 14): Card {
  return {
    ...createEmptyCard(now),
    state: State.Review,
    stability: days,
    difficulty: 5,
    reps: 1,
    scheduled_days: days,
    due: new Date(now.getTime() + days * 86_400_000),
    last_review: now,
  };
}
```

- [ ] **Step 5: Run the tests to see them pass, and type-check**

Run: `npx vitest run src/srs/scheduler.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/srs/scheduler.ts src/srs/scheduler.test.ts
git commit -m "feat(srs): fuzz on, fitted FSRS parameters, card snapshots for review logs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: His own slow line (`slowMs`)

**Files:**
- Create: `src/srs/slow.ts`
- Modify: `src/session/record.ts` (remove the `LISTEN_MS` block ~118-119 and the `USE_READING_MS` block ~145-146; re-export both)
- Test: `src/srs/slow.test.ts`

**Interfaces:**
- Consumes: `TapKind`, `TAP_KINDS`, `SLOW_ANSWER_MS` from `src/srs/scheduler.ts` (Task 1); `fastLimit(logs, kind)` from `src/ladder/rungs.ts`.
- Produces: `LISTEN_MS = 4000`, `USE_READING_MS = 9000` (moved here; `record.ts` re-exports them so `SessionScreen.tsx` and existing tests keep importing from `../session/record`); `type SlowLines = Partial<Record<TapKind, number>>`; `ratedMs(l: ReviewLog): number | null`; `slowMs(logs: ReviewLog[], kind: TapKind): number`; `slowLines(logs: ReviewLog[]): SlowLines`.

- [ ] **Step 1: Write the failing test**

Create `src/srs/slow.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CardKind, ReviewLog } from '../types';
import { LISTEN_MS, ratedMs, slowLines, slowMs, USE_READING_MS } from './slow';

let t = 0;
const log = (responseMs: number, over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise' as CardKind, at: ++t, rating: 3, correct: true, responseMs, ...over });
const many = (n: number, ms: number, over: Partial<ReviewLog> = {}) => Array.from({ length: n }, () => log(ms, over));

describe('slowMs (spec §3.2)', () => {
  it('is twice the median of his right answers of that kind', () => {
    expect(slowMs([...many(5, 2000), ...many(6, 2500)], 'recognise')).toBe(5000);
  });
  it('an even sample uses the middle two', () => {
    expect(slowMs([...many(5, 2000), ...many(5, 3000)], 'recognise')).toBe(5000);
  });
  it('is clamped to 3–12 s', () => {
    expect(slowMs(many(12, 900), 'recognise')).toBe(3000);
    expect(slowMs(many(12, 9000), 'recognise')).toBe(12_000);
  });
  it('stays at 6 s with fewer than 10 samples', () => {
    expect(slowMs(many(9, 2000), 'recognise')).toBe(6000);
    expect(slowMs([], 'hear')).toBe(6000);
  });
  it('counts only right, timed answers of that kind', () => {
    const logs = [...many(12, 2000), ...many(20, 9000, { correct: false, rating: 1 }), ...many(20, 9000, { kind: 'hear' }), ...many(5, 9000, { responseMs: undefined })];
    expect(slowMs(logs, 'recognise')).toBe(4000);
  });
  it('uses his last 40 answers', () => {
    expect(slowMs([...many(40, 5000), ...many(40, 2000)], 'recognise')).toBe(4000);
  });
  it('leaves out guesses (faster than fastLimit)', () => {
    // 30 answers at 4 s make his guess line 1 s; ten at 300 ms are guesses and don't pull the median down
    expect(slowMs([...many(30, 4000), ...many(10, 300)], 'recognise')).toBe(8000);
  });
  it('takes listening time off Understand and reading time off 选一选/用一用', () => {
    expect(ratedMs(log(LISTEN_MS + 1500, { kind: 'understand' }))).toBe(1500);
    expect(ratedMs(log(USE_READING_MS + 2000, { kind: 'meaning', source: 'use' }))).toBe(2000);
    expect(ratedMs(log(2000, { kind: 'meaning' }))).toBe(2000);
    expect(slowMs(many(10, LISTEN_MS + 2000, { kind: 'understand' }), 'understand')).toBe(4000);
  });
  it('slowLines has one line per tap kind', () => {
    expect(slowLines(many(10, 2500))).toEqual({ recognise: 5000, meaning: 6000, hear: 6000, understand: 6000 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/srs/slow.test.ts`
Expected: FAIL — `Failed to resolve import "./slow"`.

- [ ] **Step 3: Implement**

Create `src/srs/slow.ts`:

```ts
// His own slow line (SRS tuning spec §3.2): "slow" means slow for him, per kind of tap answer, worked out once per lesson.
import { fastLimit } from '../ladder/rungs';
import type { ReviewLog } from '../types';
import { SLOW_ANSWER_MS, TAP_KINDS, type TapKind } from './scheduler';

/** Listening to a sentence takes time before he can answer: it isn't slowness (the log keeps the real time). */
export const LISTEN_MS = 4000;
/** Reading time allowed before a 选一选/用一用 answer counts as slow (on top of the flashcard's line). */
export const USE_READING_MS = 9000;

export const SLOW_SAMPLE = 40;
export const SLOW_MIN_SAMPLE = 10;
export const SLOW_FLOOR_MS = 3000;
export const SLOW_CEIL_MS = 12_000;

/** Each tap kind's slow line for this lesson; a kind missing from it uses SLOW_ANSWER_MS. */
export type SlowLines = Partial<Record<TapKind, number>>;

/**
 * The time a log's rating was judged on: what it logged, less the listening (Understand) or reading (选一选/用一用) time the
 * rating already took off. 练一练's in-context answers log their time with the reading already taken off.
 */
export function ratedMs(l: ReviewLog): number | null {
  if (typeof l.responseMs !== 'number') return null;
  if (l.kind === 'understand') return Math.max(0, l.responseMs - LISTEN_MS);
  if (l.kind === 'meaning' && l.source === 'use') return Math.max(0, l.responseMs - USE_READING_MS);
  return l.responseMs;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** 2 × the median rated time of his last 40 right, timed answers of this kind (guesses left out), within 3–12 s; 6 s under 10. */
export function slowMs(logs: ReviewLog[], kind: TapKind): number {
  const ofKind = logs.filter((l) => l.kind === kind).sort((a, b) => a.at - b.at);
  const guess = fastLimit(ofKind, kind);
  const times = ofKind
    .filter((l) => l.correct && typeof l.responseMs === 'number' && l.responseMs >= guess)
    .slice(-SLOW_SAMPLE)
    .map(ratedMs)
    .filter((t): t is number => t !== null);
  if (times.length < SLOW_MIN_SAMPLE) return SLOW_ANSWER_MS;
  return Math.min(SLOW_CEIL_MS, Math.max(SLOW_FLOOR_MS, Math.round(2 * median(times))));
}

/** Every tap kind's line, from all his logs: computed once at lesson start and passed to the rating sites. */
export function slowLines(logs: ReviewLog[]): SlowLines {
  return Object.fromEntries(TAP_KINDS.map((k) => [k, slowMs(logs, k)])) as SlowLines;
}
```

In `src/session/record.ts`: delete

```ts
/** Listening to a sentence takes time before he can answer: it isn't slowness (the log keeps the real time). */
export const LISTEN_MS = 4000;
```

and

```ts
/** Reading time allowed before a 选一选/用一用 answer counts as slow (on top of the flashcard's 6 s). */
export const USE_READING_MS = 9000;
```

then add below the imports:

```ts
import { LISTEN_MS, USE_READING_MS } from '../srs/slow';

export { LISTEN_MS, USE_READING_MS };
```

- [ ] **Step 4: Run tests and type-check**

Run: `npx vitest run src/srs/slow.test.ts src/session/understandRecord.test.ts src/session/record.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/srs/slow.ts src/srs/slow.test.ts src/session/record.ts
git commit -m "feat(srs): his own slow line per tap kind (2x median, 3-12 s, 6 s under 10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hard until produced, and every rating path logs the card

**Files:**
- Modify: `src/srs/scheduler.ts` (the `Outcome` type and `toRating`)
- Modify: `src/session/record.ts` (`reviewCard`, `recordRecognition`, `recordMeaning`, `recordWriting`, `beginNewWord` signature, `recordUnderstand`, `recordHear`, `recordUse`, `recordWrittenMeaning`)
- Modify: `src/session/say.ts` (`recordTake`, `reviewTake`)
- Modify: `src/test/fixtures.ts` (add `markProduced`)
- Modify tests: `src/srs/scheduler.test.ts` (the `toRating` describe), `src/session/record.test.ts`, `src/session/understandRecord.test.ts`
- Test: `src/session/srsRecord.test.ts`

**Interfaces:**
- Consumes: `TapKind`, `snapshot` (Task 1); `SlowLines`, `LISTEN_MS`, `USE_READING_MS` (Task 2); `CardSnapshot`, `Recording.cardBefore` (Task 1).
- Produces:
  - `Outcome = { kind: TapKind; correct: boolean; responseMs: number; produced: boolean; slowMs?: number } | { kind: 'write'; totalMisses: number }`.
  - `record.ts`: `interface TapOutcome { correct: boolean; responseMs: number; slow?: SlowLines }`; `isProduced(db, wordId): Promise<boolean>`; `recordRecognition(db, wordId, outcome: TapOutcome, now)`; `recordMeaning(db, wordId, outcome: TapOutcome & { ratedMs?: number }, now, source?: 'use')`; `recordHear(db, wordId, outcome: TapOutcome, now)`; `recordUnderstand(db, wordId, outcome: TapOutcome, now)`; `beginNewWord(db, word, asked, outcome: TapOutcome, now)`; `recordUse(db, wordId, correct, now, responseMs = 0, slow?: SlowLines)`. All return `Promise<CardRecord>` as before.
  - `fixtures.ts`: `markProduced(db: AppDb, wordId: string): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

In `src/srs/scheduler.test.ts` replace the whole `describe('toRating', …)` block with:

```ts
describe('toRating', () => {
  it('maps writing misses', () => {
    expect(toRating({ kind: 'write', totalMisses: 0 })).toBe(Rating.Good);
    expect(toRating({ kind: 'write', totalMisses: 1 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 3 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 4 })).toBe(Rating.Again);
  });
  // SRS tuning spec §3.1: every row of the table, for every tap kind
  for (const kind of ['recognise', 'meaning', 'hear', 'understand'] as const) {
    it(`${kind}: wrong is Again, produced or not`, () => {
      expect(toRating({ kind, correct: false, responseMs: 500, produced: false })).toBe(Rating.Again);
      expect(toRating({ kind, correct: false, responseMs: 500, produced: true })).toBe(Rating.Again);
    });
    it(`${kind}: right and slow is Hard, produced or not`, () => {
      expect(toRating({ kind, correct: true, responseMs: 6001, produced: false })).toBe(Rating.Hard);
      expect(toRating({ kind, correct: true, responseMs: 6001, produced: true })).toBe(Rating.Hard);
    });
    it(`${kind}: right is Hard until produced, then Good`, () => {
      expect(toRating({ kind, correct: true, responseMs: 6000, produced: false })).toBe(Rating.Hard);
      expect(toRating({ kind, correct: true, responseMs: 6000, produced: true })).toBe(Rating.Good);
    });
  }
  it('his own slow line replaces the 6 s default (spec §3.2)', () => {
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 4000, produced: true, slowMs: 3500 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 9000, produced: true, slowMs: 9500 })).toBe(Rating.Good);
  });
});
```

Append to `src/test/fixtures.ts` (and add `import { putCards } from '../store/repo';` below the `../store/db` import):

```ts
/** The word has a passed write card, so it counts as produced: a right tap on it rates Good, not Hard (SRS tuning spec §3.1). */
export async function markProduced(db: AppDb, wordId: string): Promise<void> {
  await putCards(db, [makeCard(wordId, 'write', new Date(2026, 0, 1), true)]);
}
```

Create `src/session/srsRecord.test.ts`:

```ts
// @vitest-environment node
// SRS tuning spec §3.1 (Hard until produced), §3.2 (his slow line at the rating sites) and §4 (what every log keeps).
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { getCard, getRecording, listRecordings, logsSince, putCards, putWords } from '../store/repo';
import { seededKnownCard } from '../srs/scheduler';
import { freshDb, makeWord, markProduced } from '../test/fixtures';
import { beginNewWord, isProduced, recordHear, recordMeaning, recordRecognition, recordUnderstand, recordUse, recordWriting, recordWrittenMeaning } from './record';
import { recordSayTake, recordSentenceTake, reviewTake } from './say';

type Db = Awaited<ReturnType<typeof freshDb>>;
const day1 = new Date(2026, 9, 13, 9);
const day4 = new Date(2026, 9, 16, 9);
const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 };
const lastLog = async (db: Db) => (await logsSince(db, 0)).sort((a, b) => a.at - b.at || (a.id ?? 0) - (b.id ?? 0)).at(-1)!;

describe('produced (spec §3.1)', () => {
  it('a passed write, Say or 说一句 card makes a word produced; an unpassed one does not', async () => {
    const db = await freshDb();
    expect(await isProduced(db, 'b:大')).toBe(false);
    await recordWriting(db, 'b:大', 0, day1); // written once: not yet passed
    expect(await isProduced(db, 'b:大')).toBe(false);
    for (const kind of ['write', 'say', 'sentence'] as const) {
      const db2 = await freshDb();
      await putCards(db2, [{ id: `b:大:${kind}`, wordId: 'b:大', kind, fsrs: seededKnownCard(day1), passed: day1.getTime() }]);
      expect(await isProduced(db2, 'b:大')).toBe(true);
    }
  });
});

describe('Hard until produced, at every tap rating site (spec §3.1)', () => {
  const sites = {
    recognise: (db: Db) => recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    meaning: (db: Db) => recordMeaning(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    hear: (db: Db) => recordHear(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    understand: (db: Db) => recordUnderstand(db, 'b:大', { correct: true, responseMs: 5500 }, day1),
    use: (db: Db) => recordUse(db, 'b:大', true, day1, 10_500),
    newWord: (db: Db) => beginNewWord(db, makeWord('大', { meaning: 'big' }), 'hear', { correct: true, responseMs: 1500 }, day1),
  };
  for (const [site, answer] of Object.entries(sites)) {
    it(`${site}: a right answer is Hard before a production pass`, async () => {
      const db = await freshDb();
      await answer(db);
      expect((await lastLog(db)).rating).toBe(Rating.Hard);
    });
    it(`${site}: Good once the word is produced`, async () => {
      const db = await freshDb();
      await markProduced(db, 'b:大');
      await answer(db);
      expect((await lastLog(db)).rating).toBe(Rating.Good);
    });
  }
  it('a write that passes mid-lesson makes his next tap on the word Good, the same lesson', async () => {
    const db = await freshDb();
    await recordWriting(db, 'b:大', 0, day1);
    await recordWriting(db, 'b:大', 0, day4); // two right days: the write card passes
    expect((await getCard(db, 'b:大:write'))!.passed).toBeDefined();
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, new Date(day4.getTime() + 60_000));
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
  it('a wrong answer is Again either way', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordRecognition(db, 'b:大', { correct: false, responseMs: 1500 }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Again);
  });
  it('the 组词 credit from 写一写 is production itself: Good with no prior pass', async () => {
    const db = await freshDb();
    await recordWrittenMeaning(db, 'b:大', true, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
});

describe('his slow line at the rating sites (spec §3.2)', () => {
  it('a right answer over his line is Hard even when produced; under it, Good', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 3600, slow: { recognise: 3500 } }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Hard);
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 7000, slow: { recognise: 8000 } }, day4);
    expect((await lastLog(db)).rating).toBe(Rating.Good); // over the old 6 s, under his line
  });
  it('each kind uses its own line, after listening or reading time comes off', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordUnderstand(db, 'b:大', { correct: true, responseMs: 4000 + 3000, slow: { understand: 2900, recognise: 9000 } }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Hard);
    await recordUse(db, 'b:大', true, day1, 9000 + 2000, { meaning: 2500 });
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
  it('the log keeps the real time, never the slow lines', async () => {
    const db = await freshDb();
    await recordHear(db, 'b:大', { correct: true, responseMs: 2100, slow: { hear: 5000 } }, day1);
    const l = await lastLog(db);
    expect(l.responseMs).toBe(2100);
    expect(l).not.toHaveProperty('slow');
  });
});

describe('every rating path logs the card before the review (spec §4)', () => {
  const second = async (db: Db, at: Date) => {
    const l = await lastLog(db);
    expect(l.at).toBe(at.getTime());
    return l;
  };
  it('a first answer: New, 0 days, interval 0', async () => {
    const db = await freshDb();
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day1);
    expect(await lastLog(db)).toMatchObject({ state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
  it('a known card three days on: Review, 3 days, the interval it was on', async () => {
    const db = await freshDb();
    await putCards(db, [{ id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: seededKnownCard(day1, 3) }]);
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day4);
    expect(await second(db, day4)).toMatchObject({ state: State.Review, elapsedDays: 3, scheduledDays: 3 });
  });
  for (const [path, run] of Object.entries({
    meaning: (db: Db, at: Date) => recordMeaning(db, 'b:大', { correct: true, responseMs: 1500 }, at),
    use: (db: Db, at: Date) => recordUse(db, 'b:大', true, at, 9000),
    writtenMeaning: (db: Db, at: Date) => recordWrittenMeaning(db, 'b:大', true, at),
    hear: (db: Db, at: Date) => recordHear(db, 'b:大', { correct: true, responseMs: 1500 }, at),
    understand: (db: Db, at: Date) => recordUnderstand(db, 'b:大', { correct: true, responseMs: 5000 }, at),
    write: (db: Db, at: Date) => recordWriting(db, 'b:大', 0, at),
  })) {
    it(`${path}: the second review three days later logs the gap and the state`, async () => {
      const db = await freshDb();
      await run(db, day1);
      const card = (await getCard(db, `b:大:${path === 'write' ? 'write' : path === 'hear' || path === 'understand' ? path : 'meaning'}`))!;
      await run(db, day4);
      expect(await second(db, day4)).toMatchObject({ state: card.fsrs.state, elapsedDays: 3, scheduledDays: card.fsrs.scheduled_days });
    });
  }
  it('Say and 说一句: the verdict logs the card as it was when he recorded (settleTake)', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大')]);
    await putCards(db, [{ id: 'b:大:say', wordId: 'b:大', kind: 'say', fsrs: seededKnownCard(day1, 3) }]);
    await recordSayTake(db, 'b:大', take, day4);
    await recordSentenceTake(db, 'b:大', take, day4);
    const recs = await listRecordings(db);
    const say = recs.find((r) => r.prompt.kind === 'say');
    const sentence = recs.find((r) => r.prompt.kind === 'sentence');
    expect((await getRecording(db, say!.id))!.cardBefore).toEqual({ state: State.Review, elapsedDays: 3, scheduledDays: 3 });
    await reviewTake(db, say!.id, 'ok', new Date(2026, 9, 20, 9)); // the parent listens days later
    expect(await lastLog(db)).toMatchObject({ kind: 'say', state: State.Review, elapsedDays: 3, scheduledDays: 3 });
    await reviewTake(db, sentence!.id, 'no', new Date(2026, 9, 20, 9));
    expect(await lastLog(db)).toMatchObject({ kind: 'sentence', state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/srs/scheduler.test.ts src/session/srsRecord.test.ts`
Expected: FAIL — `isProduced` is not exported; tap ratings are Good where Hard is expected; logs have no `state`; `cardBefore` is undefined; the `toRating` rows with `produced: false` return Good.

- [ ] **Step 3: Implement `toRating` with context**

In `src/srs/scheduler.ts` replace the `Outcome` type and `toRating` with:

```ts
export type Outcome =
  | { kind: TapKind; correct: boolean; responseMs: number; produced: boolean; slowMs?: number }
  | { kind: 'write'; totalMisses: number };

/**
 * The one rating rule (spec §3.1): a write by its misses; a tap wrong → Again, right but slower than his line → Hard, right before
 * the word has a production pass → Hard, otherwise Good.
 */
export function toRating(o: Outcome): Grade {
  if (o.kind === 'write') {
    if (o.totalMisses === 0) return Rating.Good;
    return o.totalMisses <= 3 ? Rating.Hard : Rating.Again;
  }
  if (!o.correct) return Rating.Again;
  if (o.responseMs > (o.slowMs ?? SLOW_ANSWER_MS)) return Rating.Hard;
  return o.produced ? Rating.Good : Rating.Hard;
}
```

- [ ] **Step 4: Rewrite the rating paths in `record.ts`**

Replace the imports and everything from the top of `src/session/record.ts` down to (not including) the `/**\n * After a rung's answer` comment of `settleRung` with:

```ts
import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { canAskRung, fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
import { ladderWordsBesides } from '../content/ladder';
import { newCard, review, snapshot, toRating, type TapKind } from '../srs/scheduler';
import { LISTEN_MS, USE_READING_MS, type SlowLines } from '../srs/slow';
import type { AppDb } from '../store/db';
import { addReviewLog, allCards, allSessions, allWords, getCard, getSession, getSettings, getWord, logsSince, putCards, putWords, saveSession, practisedWords, updateSettings } from '../store/repo';
import type { CardKind, CardRecord, CardSnapshot, Grade, ReviewLog, SessionRecord, Settings, Word } from '../types';
import { keptRecent, LOOKBACK_DAYS, nextPace, ranOut } from './pace';
import { buildSessionPlan } from './plan';
import { createSessionRecord } from './runner';

export { LISTEN_MS, USE_READING_MS };

/** A tap answer: right or not, how long it took, and this lesson's slow lines (spec §3.2; absent: 6 s). */
export interface TapOutcome { correct: boolean; responseMs: number; slow?: SlowLines }

/** Reviews a card (made now if it is the first) and returns it with what it was before, for the log (spec §4). */
async function reviewCard(db: AppDb, wordId: string, kind: CardKind, rating: Grade, now: Date): Promise<{ card: CardRecord; before: CardSnapshot }> {
  const id = `${wordId}:${kind}`;
  const existing = await getCard(db, id);
  const was = existing?.fsrs ?? newCard(now);
  const card: CardRecord = { ...(existing ?? {}), id, wordId, kind, fsrs: review(was, rating, now) }; // keeps its pass
  await putCards(db, [card]);
  return { card, before: snapshot(was, now) };
}

/** Produced (spec §3.1): the word has a passed write, Say or 说一句 card. */
export async function isProduced(db: AppDb, wordId: string): Promise<boolean> {
  const cards = await Promise.all((['write', 'say', 'sentence'] as const).map((k) => getCard(db, `${wordId}:${k}`)));
  return cards.some((c) => c?.passed !== undefined);
}

/** Rates a tap answer (spec §3.1: Hard until produced, Hard when slow for him), logs it with the card's state, and settles its rung. */
async function rateTap(db: AppDb, wordId: string, kind: TapKind, o: TapOutcome, ratedMs: number, now: Date, extra: Partial<ReviewLog> = {}): Promise<CardRecord> {
  const produced = o.correct && (await isProduced(db, wordId));
  const rating = toRating({ kind, correct: o.correct, responseMs: ratedMs, produced, slowMs: o.slow?.[kind] });
  const { card, before } = await reviewCard(db, wordId, kind, rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind, at: now.getTime(), rating, correct: o.correct, responseMs: o.responseMs, ...before, ...extra });
  return (await settleRung(db, wordId, kind, now)) ?? card;
}

export const recordRecognition = (db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> =>
  rateTap(db, wordId, 'recognise', outcome, outcome.responseMs, now);

/** ratedMs: the time that counts toward "slow" (reading time taken off); the log keeps responseMs. */
export const recordMeaning = (db: AppDb, wordId: string, outcome: TapOutcome & { ratedMs?: number }, now: Date, source?: 'use'): Promise<CardRecord> =>
  rateTap(db, wordId, 'meaning', outcome, outcome.ratedMs ?? outcome.responseMs, now, source ? { source } : {});

export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'write', totalMisses });
  const { card, before } = await reviewCard(db, wordId, 'write', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses, ...before });
  // written now: a day its strokes failed to load no longer keeps it at the back of the queue (final review I1)
  const word = await getWord(db, wordId);
  if (word?.writeSkippedAt !== undefined) {
    const { writeSkippedAt: _gone, ...rest } = word;
    await putWords(db, [rest]);
  }
  await settleRung(db, wordId, 'write', now); // not a rung: it passes, and opens nothing
  return (await getCard(db, card.id))!;
}

```

(This drops the `import { LISTEN_MS, USE_READING_MS } from '../srs/slow';` line Task 2 added: it is now part of the import block above.)

Change the `beginNewWord` signature to take `outcome: TapOutcome`:

```ts
export async function beginNewWord(db: AppDb, word: Word, asked: 'hear' | 'read' | 'meaning', outcome: TapOutcome, now: Date): Promise<CardRecord> {
```

Replace `recordUnderstand` and `recordHear` (the two functions after `openMissingRungs`) with:

```ts
/** He heard a sentence with the word and picked its English (the Understand rung, spec 2026-10-06 §3.2): listening time isn't slowness. */
export const recordUnderstand = (db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> =>
  rateTap(db, wordId, 'understand', outcome, Math.max(0, outcome.responseMs - LISTEN_MS), now);

/** He heard the word and picked its meaning (the Hear rung, spec 2026-10-06 §3.2). */
export const recordHear = (db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> =>
  rateTap(db, wordId, 'hear', outcome, outcome.responseMs, now);
```

Replace the first two lines of `recordUse` (signature and the `ratedToday` return) with:

```ts
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0, slow?: SlowLines): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  // he reads a sentence (or two) first: that time doesn't make a right answer Hard
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs, ratedMs: Math.max(0, responseMs - USE_READING_MS), slow }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
```

In `recordWrittenMeaning` replace its last rating lines with:

```ts
  const rating = correct ? Rating.Good : Rating.Again; // writing is production: counts as produced for its own rating (spec §3.1)
  const { card, before } = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, correct, source: 'write', ...before });
  return (await settleRung(db, wordId, 'meaning', now)) ?? card;
```

- [ ] **Step 5: Say/说一句 takes keep the card's state**

In `src/session/say.ts` change the scheduler import to `import { newCard, review, snapshot } from '../srs/scheduler';` and replace the first four lines of `recordTake`'s body with:

```ts
  const id = `${wordId}:${kind}`;
  const had = await getCard(db, id);
  const was = had?.fsrs ?? newCard(now);
  // the take keeps its card as it was now, for the parent's verdict's log (SRS tuning spec §4)
  await keepRecording(db, { id: newId(), createdAt: now.getTime(), prompt: { kind, wordId }, ...take, cardBefore: snapshot(was, now) });
  const next = review(was, Rating.Good, now);
```

In `reviewTake`, add `...rec.cardBefore` to the log passed to `settleTake`:

```ts
  if (!(await settleTake(db, recordingId, verdict, { cardId, wordId, kind, at: rec.createdAt, rating: ok ? Rating.Good : Rating.Again, correct: ok, ...rec.cardBefore }))) return;
```

- [ ] **Step 6: Update the three existing tests that assumed a right tap is Good**

`src/session/record.test.ts`: import `markProduced` from `'../test/fixtures'`; in "creates a card on the first answer and reviews it afterwards" add `await markProduced(db, 'b:大'); // written already: a right tap is Good` right after `const db = await freshDb();`; in "reading the sentence takes time: a right answer at 8 s is still Good, not Hard (review I4)" add `await markProduced(db, 'b:很');` right after `const db = await freshDb();`.

`src/session/understandRecord.test.ts`: import `markProduced` from `'../test/fixtures'`; in "the rating allows for listening time; the log keeps the real time" add `await markProduced(db, cat.id); // written already: a right tap is Good unless slow` right after `const db = await seed();`.

- [ ] **Step 7: Run tests and type-check**

Run: `npx tsc --noEmit && npx vitest run src/srs src/session src/store src/ladder src/placement src/stats`
Expected: PASS (tsc confirms every `record*` caller in `SessionScreen.tsx` still type-checks: `slow` is optional).

- [ ] **Step 8: Commit**

```bash
git add src/srs/scheduler.ts src/srs/scheduler.test.ts src/session/record.ts src/session/say.ts src/test/fixtures.ts src/session/srsRecord.test.ts src/session/record.test.ts src/session/understandRecord.test.ts
git commit -m "feat(srs): a right tap is Hard until the word is produced; every rating path logs the card's state, gap and interval" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The lesson computes his slow lines once and passes them on

**Files:**
- Modify: `src/session/record.ts` (add `lessonSlowLines`)
- Modify: `src/app/SessionScreen.tsx` (imports ~42, `Loaded` ~80-91, load effect ~113-135, `onFlashDone` ~270, `onPracticeDone` ~296-310, `onUseAnswer` ~369-372)
- Test: `src/session/srsRecord.test.ts`

**Interfaces:**
- Consumes: `slowLines`, `SlowLines` (Task 2); `TapOutcome.slow`, `recordUse(..., slow)` (Task 3).
- Produces: `lessonSlowLines(db: AppDb): Promise<SlowLines>` in `record.ts`; `Loaded.slow: SlowLines` in `SessionScreen`.

- [ ] **Step 1: Write the failing test**

In `src/session/srsRecord.test.ts` add `addReviewLog` to the repo import and `lessonSlowLines` to the `./record` import, and add inside `describe('his slow line at the rating sites (spec §3.2)', …)`:

```ts
  it('lessonSlowLines reads them from his logs once (10 hear answers at 2.5 s: 5 s; the rest stay at 6 s)', async () => {
    const db = await freshDb();
    for (let i = 0; i < 10; i++) await addReviewLog(db, { cardId: 'b:大:hear', wordId: 'b:大', kind: 'hear', at: day1.getTime() + i, rating: Rating.Good, correct: true, responseMs: 2500 });
    expect(await lessonSlowLines(db)).toEqual({ recognise: 6000, meaning: 6000, hear: 5000, understand: 6000 });
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/session/srsRecord.test.ts -t lessonSlowLines`
Expected: FAIL — `lessonSlowLines is not a function`.

- [ ] **Step 3: Implement**

In `src/session/record.ts` change the slow import to `import { LISTEN_MS, slowLines, USE_READING_MS, type SlowLines } from '../srs/slow';` and add after the `TapOutcome` interface:

```ts
/** His slow lines for a lesson (spec §3.2): from all his review logs, once, as the lesson starts. */
export async function lessonSlowLines(db: AppDb): Promise<SlowLines> {
  return slowLines(await logsSince(db, 0));
}
```

In `src/app/SessionScreen.tsx`:

1. Change the `../session/record` import to include `lessonSlowLines` and add a type import:

```ts
import { beginNewWord, bringForward, lessonSlowLines, markTraced, markWriteSkipped, recordHear, recordMeaning, recordUnderstand, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
import type { SlowLines } from '../srs/slow';
```

2. In `interface Loaded`, after `confusions`, add:

```ts
  slow: SlowLines; // his slow line per tap kind, worked out once as the lesson loads (SRS tuning spec §3.2)
```

3. In the load effect, compute it with the rest and store it:

```ts
      const [know, kid, parentPassages, settings, practised, confusions, slow] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db), practisedWords(db), getConfusions(db), lessonSlowLines(db)]);
```

and in the `setState({ … })` object add `slow,` after `confusions,`.

4. In `onFlashDone`: `const outcome = { correct: r.correct, responseMs: r.responseMs, slow: state.slow };`

5. In `onPracticeDone`:

```ts
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' || r.inContext ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs, slow: state.slow };
        if (item.grades === 'understand' && r.asked === 'understand') know.cardsById.set(`${item.wordId}:understand`, await recordUnderstand(db, item.wordId, { correct: r.correct, responseMs: r.responseMs, slow: state.slow }, now()));
```

and the `use` branch: `await recordUse(db, item.wordId, r.correct, now(), r.responseMs, state.slow)`.

6. In `onUseAnswer`: `await recordUse(db, item.wordId, correct, now(), responseMs, state.slow)`.

Leave `recordWriting` and `recordWrittenMeaning` calls unchanged (no slow line for writing).

- [ ] **Step 4: Run tests and type-check**

Run: `npx tsc --noEmit && npx vitest run src/session/srsRecord.test.ts src/app/SessionScreen.test.tsx src/app/sessionLadder.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session/record.ts src/session/srsRecord.test.ts src/app/SessionScreen.tsx
git commit -m "feat(lesson): his slow lines are worked out once at lesson start and passed to every tap rating" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Retention check in the Skills panel

**Files:**
- Create: `src/stats/retention.ts`, `src/parent/RetentionCheck.tsx`
- Modify: `src/parent/SkillsPanel.tsx` (`Data`, `load`, JSX after the skills table)
- Modify: `src/styles.css` (Skills panel block ~1087-1089)
- Test: `src/stats/retention.test.ts`, `src/parent/retentionCheck.test.tsx`

**Interfaces:**
- Consumes: `ReviewLog.state` (Task 1).
- Produces: `retention(logs: ReviewLog[], now: Date): Record<RetentionLine, Retention>`; `type RetentionLine = 'taps' | 'writing'`; `interface Retention { counted: number; remembered: number; rate: number | null; note: 'low' | 'high' | null }`; constants `RETENTION_DAYS = 30`, `RETENTION_MIN = 30`, `RETENTION_TARGET = 0.9`, `RETENTION_LOW = 0.85`, `RETENTION_HIGH = 0.95`; component `RetentionCheck({ logs, now })`; `SkillsPanel`'s `Data.allLogs: ReviewLog[]` (every log, used again in Task 8).

- [ ] **Step 1: Write the failing pure tests**

Create `src/stats/retention.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import type { CardKind, ReviewLog } from '../types';
import { retention } from './retention';

const now = new Date(2026, 9, 13, 18);
const daysAgo = (d: number, hour = 9) => new Date(2026, 9, 13 - d, hour).getTime();
let n = 0;
const log = (over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId: `b:${++n}:recognise`, wordId: 'b:x', kind: 'recognise' as CardKind, at: daysAgo(1), rating: Rating.Good, correct: true, state: State.Review, ...over });
const many = (k: number, over: Partial<ReviewLog> = {}) => Array.from({ length: k }, () => log(over));

describe('retention (spec §5)', () => {
  it('measures until a line has 30 counted reviews', () => {
    const r = retention(many(12), now);
    expect(r.taps).toEqual({ counted: 12, remembered: 12, rate: null, note: null });
    expect(r.writing).toEqual({ counted: 0, remembered: 0, rate: null, note: null });
  });
  it('is the share not rated Again, once 30 are counted', () => {
    const r = retention([...many(27), ...many(3, { rating: Rating.Again, correct: false })], now);
    expect(r.taps.rate).toBeCloseTo(0.9);
    expect(r.taps.note).toBeNull();
  });
  it('Hard still counts as remembered', () => {
    expect(retention(many(30, { rating: Rating.Hard }), now).taps.rate).toBe(1);
  });
  it("counts only a card's first review of the day", () => {
    const card = 'b:大:recognise';
    const logs = [...many(29), log({ cardId: card, at: daysAgo(1, 9), rating: Rating.Again }), log({ cardId: card, at: daysAgo(1, 10), rating: Rating.Good })];
    expect(retention(logs, now).taps).toMatchObject({ counted: 30, remembered: 29 });
  });
  it('counts only cards that were in Review: not New, Learning, Relearning, nor older logs with no state', () => {
    const logs = [...many(30), ...many(5, { state: State.New }), ...many(5, { state: State.Learning }), ...many(5, { state: State.Relearning }), ...many(5, { state: undefined })];
    expect(retention(logs, now).taps.counted).toBe(30);
  });
  it('only the last 30 days', () => {
    expect(retention([...many(30), ...many(10, { at: daysAgo(31) })], now).taps.counted).toBe(30);
  });
  it('two lines: taps (recognise, meaning, hear, understand) and writing; Say and 说一句 are left out', () => {
    const logs = [
      ...(['recognise', 'meaning', 'hear', 'understand'] as const).flatMap((kind) => many(2, { kind })),
      ...many(3, { kind: 'write' }),
      ...many(4, { kind: 'say' }), ...many(4, { kind: 'sentence' }),
    ];
    const r = retention(logs, now);
    expect(r.taps.counted).toBe(8);
    expect(r.writing.counted).toBe(3);
  });
  it('a note under 85%', () => {
    expect(retention([...many(25), ...many(5, { rating: Rating.Again })], now).taps.note).toBe('low'); // 83%
  });
  it('a note over 95%', () => {
    expect(retention([...many(39), ...many(1, { rating: Rating.Again })], now).taps.note).toBe('high'); // 97.5%
  });
  it('no note at exactly 85% or 95%', () => {
    expect(retention([...many(34), ...many(6, { rating: Rating.Again })], now).taps.note).toBeNull(); // 85%
    expect(retention([...many(38), ...many(2, { rating: Rating.Again })], now).taps.note).toBeNull(); // 95%
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/stats/retention.test.ts`
Expected: FAIL — `Failed to resolve import "./retention"`.

- [ ] **Step 3: Implement `retention`**

Create `src/stats/retention.ts`:

```ts
// "Remembered after a gap" (SRS tuning spec §5): of the cards he met again after a real gap, the share he still knew. FSRS aims
// for 90% at the moment a card is due; this checks it does, from logs that keep the card's state (written from this release on).
import { State } from 'ts-fsrs';
import { localDateKey } from '../lib/date';
import type { CardKind, ReviewLog } from '../types';

export const RETENTION_DAYS = 30;
export const RETENTION_MIN = 30;
export const RETENTION_TARGET = 0.9;
export const RETENTION_LOW = 0.85;
export const RETENTION_HIGH = 0.95;

export type RetentionLine = 'taps' | 'writing';
const LINE_OF: Partial<Record<CardKind, RetentionLine>> = { recognise: 'taps', meaning: 'taps', hear: 'taps', understand: 'taps', write: 'writing' }; // Say and 说一句: the parent's verdicts

export interface Retention {
  counted: number; // first-of-the-day reviews of a card in Review, last 30 days
  remembered: number; // of those, not rated Again
  rate: number | null; // remembered / counted once 30 are counted; null while measuring
  note: 'low' | 'high' | null; // under 85%: forgetting more than planned; over 95%: reviews come sooner than he needs
}

export function retention(logs: ReviewLog[], now: Date): Record<RetentionLine, Retention> {
  const since = now.getTime() - RETENTION_DAYS * 86_400_000;
  const firsts = new Map<string, ReviewLog>(); // card + local day → its first review that day
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    if (l.at < since || l.at > now.getTime()) continue;
    const key = `${l.cardId}|${localDateKey(new Date(l.at))}`;
    if (!firsts.has(key)) firsts.set(key, l);
  }
  const out = { taps: { counted: 0, remembered: 0 }, writing: { counted: 0, remembered: 0 } };
  for (const l of firsts.values()) {
    const line = LINE_OF[l.kind];
    if (!line || l.state !== State.Review) continue;
    out[line].counted++;
    if (l.rating !== 1) out[line].remembered++; // 1 = Again
  }
  const finish = ({ counted, remembered }: { counted: number; remembered: number }): Retention => {
    const rate = counted >= RETENTION_MIN ? remembered / counted : null;
    const note = rate === null ? null : rate < RETENTION_LOW ? 'low' : rate > RETENTION_HIGH ? 'high' : null;
    return { counted, remembered, rate, note };
  };
  return { taps: finish(out.taps), writing: finish(out.writing) };
}
```

Run: `npx vitest run src/stats/retention.test.ts` — Expected: PASS.

- [ ] **Step 4: Write the failing rendered tests**

Create `src/parent/retentionCheck.test.tsx`:

```tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { addReviewLog } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { CardKind, ReviewLog } from '../types';
import { RetentionCheck } from './RetentionCheck';
import { SkillsPanel } from './SkillsPanel';

const now = new Date(2026, 9, 13, 18);
let n = 0;
const logs = (k: number, over: Partial<ReviewLog> = {}): ReviewLog[] =>
  Array.from({ length: k }, () => ({ cardId: `b:${++n}:recognise`, wordId: 'b:x', kind: 'recognise' as CardKind, at: now.getTime() - 86_400_000, rating: Rating.Good, correct: true, state: State.Review, ...over }));

describe('Remembered after a gap (SRS tuning spec §5)', () => {
  it('measuring until 30 reviews', () => {
    render(<RetentionCheck logs={logs(12)} now={now} />);
    expect(screen.getByText(/Taps \(reading, meaning, listening\): Measuring — 12 of 30 reviews/)).toBeTruthy();
    expect(screen.getByText(/Writing \(写一写\): Measuring — 0 of 30 reviews/)).toBeTruthy();
  });
  it('shown against the 90% target, with no note in range', () => {
    render(<RetentionCheck logs={[...logs(27), ...logs(3, { rating: Rating.Again })]} now={now} />);
    expect(screen.getByText(/target 90%/)).toBeTruthy();
    expect(screen.getByText(/Taps .*: 90% of 30 reviews/)).toBeTruthy();
    expect(screen.queryByText(/forgetting more/)).toBeNull();
  });
  it('a note under 85%', () => {
    render(<RetentionCheck logs={[...logs(24, { kind: 'write' }), ...logs(6, { kind: 'write', rating: Rating.Again })]} now={now} />);
    expect(screen.getByText(/Writing \(写一写\): 80% of 30 reviews/)).toBeTruthy();
    expect(screen.getByText("He's forgetting more than planned — reviews may be too far apart.")).toBeTruthy();
  });
  it('a note over 95%', () => {
    render(<RetentionCheck logs={logs(30)} now={now} />);
    expect(screen.getByText('Reviews come sooner than he needs.')).toBeTruthy();
  });
  it('the Skills panel shows it from his stored logs', async () => {
    const app = await makeAppData({ now: () => now });
    for (const l of logs(3)) await addReviewLog(app.db, l);
    renderWithApp(<SkillsPanel />, app);
    expect(await screen.findByText(/Measuring — 3 of 30 reviews/)).toBeTruthy();
  });
});
```

Run: `npx vitest run src/parent/retentionCheck.test.tsx` — Expected: FAIL — `Failed to resolve import "./RetentionCheck"`.

- [ ] **Step 5: Implement the component and wire it in**

Create `src/parent/RetentionCheck.tsx`:

```tsx
import { RETENTION_MIN, RETENTION_TARGET, retention, type Retention, type RetentionLine } from '../stats/retention';
import type { ReviewLog } from '../types';

const LINE_LABEL: Record<RetentionLine, string> = { taps: 'Taps (reading, meaning, listening)', writing: 'Writing (写一写)' };
const NOTE = { low: "He's forgetting more than planned — reviews may be too far apart.", high: 'Reviews come sooner than he needs.' } as const;

function figure(r: Retention): string {
  if (r.rate === null) return `Measuring — ${r.counted} of ${RETENTION_MIN} reviews`;
  return `${Math.round(r.rate * 100)}% of ${r.counted} reviews`;
}

/** "Remembered after a gap" (SRS tuning spec §5): his real retention, per line, against the 90% FSRS aims for. */
export function RetentionCheck({ logs, now }: { logs: ReviewLog[]; now: Date }) {
  const r = retention(logs, now);
  return (
    <div class="skills__retention">
      <h3>Remembered after a gap (last 30 days, target {Math.round(RETENTION_TARGET * 100)}%)</h3>
      <ul>
        {(Object.keys(LINE_LABEL) as RetentionLine[]).map((line) => (
          <li key={line}>
            {LINE_LABEL[line]}: {figure(r[line])}
            {r[line].note && <p class="skills__note">{NOTE[r[line].note!]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

In `src/parent/SkillsPanel.tsx`:

1. Add `import { RetentionCheck } from './RetentionCheck';` after the types import.
2. Change `interface Data` to start `interface Data { logs: ReviewLog[]; allLogs: ReviewLog[]; answers: …`.
3. Replace `load`'s body with:

```tsx
    const since = addDays(now(), -DAYS).getTime();
    const [allLogs, answers, words, cards, recordings, settings] = await Promise.all([
      logsSince(db, 0), answersSince(db, since), allWords(db), allCards(db), listRecordings(db), getSettings(db),
    ]); // every log: retention reads 30 days and the fit all of them (SRS tuning spec §5, §6)
    const logs = allLogs.filter((l) => l.at >= since);
    const reads = recordings.filter((r) => r.prompt.kind === 'passage' && r.createdAt >= since);
    setD({ logs, allLogs, answers, words, cards, reads, settings });
```

4. Directly after the closing `</table>` and before `<h3>Missed most (last {DAYS} days)</h3>` add:

```tsx
      <RetentionCheck logs={d.allLogs} now={now()} />
```

(`now` here is `useApp()`'s function; the `const now = pct(s)` inside the table's `map` is a different, inner scope.)

In `src/styles.css`, after `.skills__missed ul { … }` add:

```css
/* retention and the fit (SRS tuning spec §5, §6.2) */
.skills__retention ul { padding-left: 20px; }
.skills__note { margin: 4px 0 0; color: var(--orange-ink); }
```

- [ ] **Step 6: Run tests and type-check**

Run: `npx tsc --noEmit && npx vitest run src/stats/retention.test.ts src/parent/retentionCheck.test.tsx src/parent/skillsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stats/retention.ts src/stats/retention.test.ts src/parent/RetentionCheck.tsx src/parent/retentionCheck.test.tsx src/parent/SkillsPanel.tsx src/styles.css
git commit -m "feat(skills): remembered after a gap — his real retention against the 90% target" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Training data for the fit (`fitData`)

**Files:**
- Create: `src/srs/fitData.ts`
- Test: `src/srs/fitData.test.ts`

**Interfaces:**
- Consumes: `localDayGap` (Task 1); `ReviewLog.state`/`elapsedDays` (Task 1); `CardRecord.passed`.
- Produces: `interface FitData { ratings: number[]; deltaTs: number[]; lengths: number[]; count: number }`; `fitData(logs: ReviewLog[], cards: CardRecord[]): FitData`.

**Placement marker (spec §6.1, verified in the codebase):** `applyPlacement` (`src/placement/apply.ts`) seeds known cards with `seededKnownCard` (state Review) and sets `passed: now` before any answer exists; a rung otherwise passes only on its second right day (`passedAt`), and the ladder migration (`migrateToLadder`) marks earned cards passed *after* their logs. So: a card's first kept log has `state` → it began from placement iff that state is not New; an older log with no `state` → it began from placement iff `card.passed <= firstLog.at`. Placement's "meaning due now" cards are New cards and are kept.

- [ ] **Step 1: Write the failing test**

Create `src/srs/fitData.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { seededKnownCard } from './scheduler';
import type { CardKind, CardRecord, ReviewLog } from '../types';
import { fitData } from './fitData';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour).getTime();
const log = (cardId: string, day: number, rating: number, over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId, wordId: cardId.split(':').slice(0, 2).join(':'), kind: cardId.split(':')[2] as CardKind, at: at(day), rating: rating as ReviewLog['rating'], correct: rating > 1, ...over });

describe('fitData (spec §6.1)', () => {
  it('each review from the second on is one item: the history up to it, the first gap 0', () => {
    const logs = [
      log('b:大:recognise', 1, Rating.Good, { state: State.New, elapsedDays: 0 }),
      log('b:大:recognise', 2, Rating.Again, { state: State.Learning, elapsedDays: 1 }),
      log('b:大:recognise', 5, Rating.Good, { state: State.Relearning, elapsedDays: 3 }),
    ];
    expect(fitData(logs, [])).toEqual({ ratings: [3, 1, 3, 1, 3], deltaTs: [0, 1, 0, 1, 3], lengths: [2, 3], count: 2 });
  });
  it("only a card's first log of a day counts", () => {
    const logs = [log('b:大:hear', 1, Rating.Good), log('b:大:hear', 1, Rating.Again, { at: at(1, 10) }), log('b:大:hear', 3, Rating.Good)];
    expect(fitData(logs, [])).toMatchObject({ ratings: [3, 3], deltaTs: [0, 2], count: 1 });
  });
  it('older logs without elapsedDays: the gap is the local days since the previous kept log', () => {
    const logs = [log('b:大:meaning', 1, Rating.Good, { at: at(1, 23) }), log('b:大:meaning', 2, Rating.Good, { at: at(2, 7) }), log('b:大:meaning', 9, Rating.Hard)];
    expect(fitData(logs, []).deltaTs).toEqual([0, 1, 0, 1, 7]);
  });
  it('logs out of order are sorted by time', () => {
    const logs = [log('b:大:write', 4, Rating.Hard), log('b:大:write', 1, Rating.Good)];
    expect(fitData(logs, [])).toMatchObject({ ratings: [3, 2], deltaTs: [0, 3] });
  });
  it('a card with one review gives no item', () => {
    expect(fitData([log('b:大:recognise', 1, Rating.Good)], []).count).toBe(0);
  });
  it('leaves out cards that began from placement: by state on new logs', () => {
    const logs = [log('b:大:recognise', 10, Rating.Good, { state: State.Review, elapsedDays: 9 }), log('b:大:recognise', 20, Rating.Good, { state: State.Review })];
    expect(fitData(logs, []).count).toBe(0);
  });
  it('leaves out cards that began from placement: by the pass before the first answer on older logs', () => {
    const placed: CardRecord = { id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: seededKnownCard(new Date(at(1))), passed: at(1, 8) };
    const earned: CardRecord = { id: 'b:小:recognise', wordId: 'b:小', kind: 'recognise', fsrs: seededKnownCard(new Date(at(3))), passed: at(3) }; // passed on its second right day
    const logs = [log('b:大:recognise', 10, Rating.Good), log('b:大:recognise', 20, Rating.Good), log('b:小:recognise', 2, Rating.Good), log('b:小:recognise', 3, Rating.Good)];
    expect(fitData(logs, [placed, earned])).toMatchObject({ ratings: [3, 3], count: 1 });
  });
  it('leaves out Say and 说一句 cards (parent verdicts)', () => {
    const logs = [log('b:大:say', 1, Rating.Good), log('b:大:say', 3, Rating.Good), log('b:大:sentence', 1, Rating.Good), log('b:大:sentence', 3, Rating.Again)];
    expect(fitData(logs, []).count).toBe(0);
  });
  it('the count is the number of items across cards', () => {
    const logs = [1, 2, 4, 8].flatMap((d) => [log('b:大:recognise', d, Rating.Good), log('b:大:write', d, Rating.Good)]);
    expect(fitData(logs, []).count).toBe(6);
    expect(fitData(logs, []).lengths).toEqual([2, 3, 4, 2, 3, 4]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/srs/fitData.test.ts`
Expected: FAIL — `Failed to resolve import "./fitData"`.

- [ ] **Step 3: Implement**

Create `src/srs/fitData.ts`:

```ts
// The optimizer's training data (SRS tuning spec §6.1), built from his review logs. fsrs-browser's computeParameters takes
// "items": each item is one card's history up to and including one review — its ratings and day gaps (the first gap 0).
// Free play writes no review logs, so it needs no filter here.
import { State } from 'ts-fsrs';
import type { CardRecord, ReviewLog } from '../types';
import { localDateKey } from '../lib/date';
import { localDayGap } from './scheduler';

export interface FitData {
  ratings: number[]; // every item's ratings (1–4), item after item
  deltaTs: number[]; // the matching day gaps
  lengths: number[]; // each item's length
  count: number; // the number of items: the "reviews" the parent sees
}

/**
 * A card began from placement when its first kept log was not a New card's: logs from this release say so in `state`; for older
 * logs, the card's pass came before its first answer (placement passes what it seeds; a rung passes only after two answers).
 */
function beganFromPlacement(first: ReviewLog, card: CardRecord | undefined): boolean {
  if (first.state !== undefined) return first.state !== State.New;
  return card?.passed !== undefined && card.passed <= first.at;
}

export function fitData(logs: ReviewLog[], cards: CardRecord[]): FitData {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const byCard = new Map<string, ReviewLog[]>();
  for (const l of logs) {
    if (l.kind === 'say' || l.kind === 'sentence') continue; // the parent's verdicts, on the day he recorded
    (byCard.get(l.cardId) ?? byCard.set(l.cardId, []).get(l.cardId)!).push(l);
  }
  const out: FitData = { ratings: [], deltaTs: [], lengths: [], count: 0 };
  for (const [cardId, list] of byCard) {
    const days = new Set<string>();
    const kept = list
      .sort((a, b) => a.at - b.at)
      .filter((l) => {
        const day = localDateKey(new Date(l.at));
        if (days.has(day)) return false;
        days.add(day);
        return true;
      });
    if (kept.length < 2 || beganFromPlacement(kept[0]!, cardById.get(cardId))) continue;
    const ratings = kept.map((l) => l.rating as number);
    const gaps = kept.map((l, i) => (i === 0 ? 0 : typeof l.elapsedDays === 'number' ? l.elapsedDays : localDayGap(kept[i - 1]!.at, l.at)));
    for (let k = 2; k <= kept.length; k++) {
      out.ratings.push(...ratings.slice(0, k));
      out.deltaTs.push(...gaps.slice(0, k));
      out.lengths.push(k);
      out.count++;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/srs/fitData.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/srs/fitData.ts src/srs/fitData.test.ts
git commit -m "feat(srs): build the optimizer's training items from his review logs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The lazy optimizer (fsrs-browser), kept out of the precache

**Files:**
- Modify: `package.json`, `package-lock.json` (dependency + `optimizer` script)
- Modify: `vite.config.ts`
- Create: `src/srs/optimizer.ts`, `src/test/reviewHistory.ts`, `scripts/optimizer-check.html`, `scripts/optimizer-check.ts`
- Test: `src/srs/optimizer.test.ts`

**Interfaces:**
- Consumes: `validParams` (Task 1); `FitData`, `fitData` (Task 6); `snapshot`, `review`, `newCard` (Task 1).
- Produces: `type FitResult = { ok: true; w: number[] } | { ok: false; reason: 'offline' | 'failed' }`; `type Optimizer = (data: FitData) => Promise<FitResult>`; `fitParameters: Optimizer`; `makeReviewHistory(o: { cards: number; days: number; end: Date; seed?: number; wordIds?: string[] }): { logs: ReviewLog[]; cards: CardRecord[] }`; npm script `optimizer`.

**What the spike and this plan's dry run found (fsrs-browser 6.6.0, WebKit via playwright-core):**
- `default init()` fetches `fsrs_browser_bg.wasm` via `new URL(…, import.meta.url)`; Vite emits it as `assets/fsrs_browser_bg-[hash].wasm` (337 KB).
- The package's rayon helper (`snippets/…/workerHelpers.js`) contains `new Worker(new URL(…), { type: 'module' })`; the build fails with Vite's default `worker.format: 'iife'` ("UMD and IIFE output formats are not supported for code-splitting builds") — set `worker: { format: 'es' }`. The app never starts the thread pool.
- In `vite dev`, dependency pre-bundling breaks the `.wasm` URL ("module doesn't start with '\0asm'") — `optimizeDeps.exclude: ['fsrs-browser']`.
- The default `globPatterns` (`**/*.js`) precaches `fsrs_browser-*.js` and `workerHelpers-*.js` — `globIgnores` removes them; the `.wasm` is not matched by `globPatterns`.
- vitest cannot resolve the package (it only has a `module` field) — a `test.alias` points at `fsrs_browser.js`.
- Too little data does **not** panic in 6.6.0: it returns the default parameters. Malformed input (e.g. a rating of 0) panics as a `RuntimeError` and the module still works afterwards. The wrapper treats both as `failed`.
- Timing in WebKit (M-series Mac): 1,741 items → ~22 ms; 5,416 items → ~43 ms on the main thread. Well under the spec's 200 ms, so no Web Worker; `optimizer-check.ts` fails if a normal fit ever exceeds 200 ms.

- [ ] **Step 1: Add the dependency**

Run: `npm install fsrs-browser@6.6.0 --save-exact`
Expected: `package.json` dependencies gain `"fsrs-browser": "6.6.0"`.

Add to `package.json` `scripts`: `"optimizer": "tsx scripts/optimizer-check.ts",`.

- [ ] **Step 2: Configure Vite, workbox and vitest**

In `vite.config.ts`, add at the top: `import { fileURLToPath } from 'node:url';`. After the `build:` line add:

```ts
  // fsrs-browser's thread helper (wasm-bindgen-rayon) is a module worker; the app never starts its thread pool, but it must build
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['fsrs-browser'] }, // pre-bundled, its .wasm URL (new URL(…, import.meta.url)) would point nowhere in dev
```

In `workbox`, after `globPatterns` add:

```ts
        // the FSRS optimizer (SRS tuning spec §6.2) loads only when the parent taps Fit: never precached, runtime-cached below
        globIgnores: ['**/fsrs_browser*', '**/workerHelpers*'],
```

and make this the first entry of `runtimeCaching`:

```ts
          {
            urlPattern: ({ url }) => /\/assets\/(fsrs_browser|workerHelpers)[^/]*\.(js|wasm)$/.test(url.pathname),
            handler: 'CacheFirst', // hashed names: a new build is a new URL
            options: { cacheName: 'optimizer', expiration: { maxEntries: 8 }, cacheableResponse: { statuses: [200] } },
          },
```

In `test`, before `testTimeout`, add:

```ts
    // fsrs-browser names only a browser "module" entry, which vitest's resolver skips; the optimizer itself runs in WebKit (scripts/optimizer-check.ts)
    alias: { 'fsrs-browser': fileURLToPath(new URL('./node_modules/fsrs-browser/fsrs_browser.js', import.meta.url)) },
```

- [ ] **Step 3: Write the failing wrapper test**

Create `src/srs/optimizer.test.ts`:

```ts
// @vitest-environment node
// The wrapper's failure handling, with fsrs-browser stood in for; the real optimizer runs in WebKit (scripts/optimizer-check.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { default_w } from 'ts-fsrs';

const wasm = vi.hoisted(() => ({ init: vi.fn(), compute: vi.fn(), free: vi.fn() }));
vi.mock('fsrs-browser', () => ({
  default: wasm.init,
  DEFAULT_PARAMETERS: () => Float32Array.from(default_w),
  Fsrs: class { computeParameters = wasm.compute; free = wasm.free; },
}));

const data = { ratings: [3, 3], deltaTs: [0, 1], lengths: [2], count: 1 };
const FITTED = default_w.map((x, i) => (i === 2 ? x * 4 : x));

beforeEach(() => {
  vi.resetModules(); // a fresh wrapper each test: its loaded module is cached inside
  wasm.init.mockReset().mockResolvedValue(undefined);
  wasm.compute.mockReset();
  wasm.free.mockReset();
});
const load = async () => (await import('./optimizer')).fitParameters;

describe('fitParameters (spec §6.2)', () => {
  it('returns his 21 parameters, fitted with short-term on, and frees the optimizer', async () => {
    wasm.compute.mockReturnValue(Float32Array.from(FITTED));
    const r = await (await load())(data);
    expect(r.ok && r.w.map((x) => Math.round(x * 1000))).toEqual(FITTED.map((x) => Math.round(x * 1000)));
    expect(wasm.compute.mock.calls[0]![4]).toBe(true);
    expect(wasm.free).toHaveBeenCalled();
  });
  it('a panic is "failed"', async () => {
    wasm.compute.mockImplementation(() => { throw new Error('RuntimeError: unreachable'); });
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('the defaults handed back (too little to learn from) are "failed": nothing was fitted', async () => {
    wasm.compute.mockReturnValue(Float32Array.from(default_w));
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('invalid parameters are "failed"', async () => {
    wasm.compute.mockReturnValue(Float32Array.from([...FITTED.slice(0, 20), Number.NaN]));
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('offline the first time: "offline", and the next tap tries again', async () => {
    wasm.init.mockRejectedValueOnce(new TypeError('Load failed'));
    wasm.compute.mockReturnValue(Float32Array.from(FITTED));
    const fit = await load();
    expect(await fit(data)).toEqual({ ok: false, reason: 'offline' });
    expect((await fit(data)).ok).toBe(true);
    expect(wasm.init).toHaveBeenCalledTimes(2);
  });
});
```

Run: `npx vitest run src/srs/optimizer.test.ts`
Expected: FAIL — `Failed to resolve import "./optimizer"`.

- [ ] **Step 4: Implement the wrapper**

Create `src/srs/optimizer.ts`:

```ts
// Fitting FSRS to his memory (SRS tuning spec §6.2). fsrs-browser (WebAssembly) is loaded only here, only when the parent taps
// Fit: never in a lesson, never in the service-worker precache (vite.config.ts). Any failure is "couldn't fit", and the defaults
// stay. fsrs-browser 6.6.0 returns its default parameters when it has too little to learn from, and panics (a RuntimeError) on
// malformed input; the module still works after a panic.
import { validParams } from './scheduler';
import type { FitData } from './fitData';

export type FitResult = { ok: true; w: number[] } | { ok: false; reason: 'offline' | 'failed' };
export type Optimizer = (data: FitData) => Promise<FitResult>;

type FsrsBrowser = typeof import('fsrs-browser');
let loading: Promise<FsrsBrowser> | null = null;

async function load(): Promise<FsrsBrowser> {
  loading ??= import('fsrs-browser').then(async (mod) => {
    await mod.default(); // fetches and instantiates the .wasm, once
    return mod;
  });
  try {
    return await loading;
  } catch (err) {
    loading = null; // offline now: the next tap tries again
    throw err;
  }
}

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((x, i) => Math.abs(x - b[i]!) < 1e-6);

export const fitParameters: Optimizer = async (data) => {
  let mod: FsrsBrowser;
  try {
    mod = await load();
  } catch {
    return { ok: false, reason: 'offline' };
  }
  try {
    const f = new mod.Fsrs();
    try {
      // enable_short_term: true, as the scheduler (ts-fsrs's default)
      const w = Array.from(f.computeParameters(Uint32Array.from(data.ratings), Uint32Array.from(data.deltaTs), Uint32Array.from(data.lengths), null, true));
      if (!validParams(w) || same(w, mod.DEFAULT_PARAMETERS())) return { ok: false, reason: 'failed' }; // the defaults back: nothing was fitted
      return { ok: true, w };
    } finally {
      f.free();
    }
  } catch {
    return { ok: false, reason: 'failed' }; // a panic
  }
};
```

Run: `npx vitest run src/srs/optimizer.test.ts && npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 5: A made-up review history for checks**

Create `src/test/reviewHistory.ts`:

```ts
// A made-up child's review history, for the optimizer check and the fit sweep's Skills panel (SRS tuning spec §9): cards learned
// over `days`, each answered when due, remembered with a chance that falls with the gap. Deterministic for a given seed.
import { Rating, type Grade } from 'ts-fsrs';
import { addDays } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { newCard, review, snapshot } from '../srs/scheduler';
import type { CardKind, CardRecord, ReviewLog } from '../types';

export function makeReviewHistory(o: { cards: number; days: number; end: Date; seed?: number; wordIds?: string[] }): { logs: ReviewLog[]; cards: CardRecord[] } {
  const rng = mulberry32(o.seed ?? 7);
  const start = addDays(o.end, -o.days);
  const logs: ReviewLog[] = [];
  const cards: CardRecord[] = [];
  for (let i = 0; i < o.cards; i++) {
    const kind: CardKind = i % 3 === 2 ? 'write' : i % 3 === 1 ? 'meaning' : 'recognise';
    const wordId = o.wordIds?.[i % o.wordIds.length] ?? `b:w${i}`;
    const id = `${wordId}:${kind}`;
    if (cards.some((c) => c.id === id)) continue;
    let at = new Date(addDays(start, Math.floor(rng() * o.days * 0.6)).setHours(16, 0, 0, 0));
    let fsrs = newCard(at);
    while (at.getTime() <= o.end.getTime()) {
      const gap = fsrs.last_review ? (at.getTime() - fsrs.last_review.getTime()) / 86_400_000 : 0;
      const remembered = rng() < Math.max(0.55, 0.97 - gap * 0.004);
      const rating: Grade = !remembered ? Rating.Again : rng() < 0.25 ? Rating.Hard : Rating.Good;
      logs.push({ cardId: id, wordId, kind, at: at.getTime(), rating, correct: remembered, responseMs: 1500 + Math.floor(rng() * 3000), ...snapshot(fsrs, at) });
      fsrs = review(fsrs, rating, at);
      at = new Date(Math.max(fsrs.due.getTime(), addDays(at, 1).setHours(16, 0, 0, 0)));
    }
    cards.push({ id, wordId, kind, fsrs });
  }
  return { logs: logs.sort((a, b) => a.at - b.at), cards };
}
```

(With `cards: 330, days: 120` this gives ~2,070 logs and ~1,740 training items, retention ~89% taps / ~94% writing.)

- [ ] **Step 6: The real optimizer in WebKit**

Create `scripts/optimizer-check.html`:

```html
<!doctype html>
<meta charset="utf-8" />
<title>optimizer check</title>
<script type="module">
  // SRS tuning spec §9: the real fsrs-browser, through the app's own wrapper, on a made-up child's logs (run by optimizer-check.ts)
  import { checkParameters } from 'ts-fsrs';
  import { makeReviewHistory } from '/src/test/reviewHistory.ts';
  import { fitData } from '/src/srs/fitData.ts';
  import { fitParameters } from '/src/srs/optimizer.ts';
  window.result = (async () => {
    const out = {};
    const end = new Date(2026, 9, 13, 18);
    out.tooLittle = await fitParameters({ ratings: [3, 3], deltaTs: [0, 1], lengths: [2], count: 1 }); // the defaults come back: nothing fitted
    out.malformed = await fitParameters({ ratings: [0, 3], deltaTs: [0, 1], lengths: [2], count: 1 }); // a panic, caught (the fits below show the module survives it)
    for (const [name, cards] of [['normal', 330], ['large', 1000]]) {
      const h = makeReviewHistory({ cards, days: 120, end });
      const data = fitData(h.logs, h.cards);
      const t = performance.now();
      const r = await fitParameters(data);
      const ms = Math.round(performance.now() - t);
      let checked = false;
      try { checked = r.ok && checkParameters(r.w).length === 21; } catch { checked = false; }
      out[name] = { items: data.count, ok: r.ok, n: r.ok ? r.w.length : 0, checked, ms };
    }
    return out;
  })();
</script>
```

Create `scripts/optimizer-check.ts`:

```ts
/* SRS tuning spec §9: runs the real FSRS optimizer (fsrs-browser, WebAssembly) through src/srs/optimizer.ts in WebKit, the iPad's
   engine, on a made-up child's logs. Checks too little data fails softly, a fit returns 21 parameters ts-fsrs accepts, and how
   long the main thread is held. Run: npm run optimizer  (exit 1 on any problem) */
import { createServer } from 'vite';
import { webkit } from 'playwright-core';

const PORT = 4391;
const server = await createServer({ server: { port: PORT, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await webkit.launch();
let failed = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/scripts/optimizer-check.html`);
  const r = (await page.evaluate(() => (window as unknown as { result: Promise<unknown> }).result)) as Record<string, { ok: boolean; reason?: string; items?: number; n?: number; checked?: boolean; ms?: number }>;
  console.log(JSON.stringify(r, null, 1));
  const problems: string[] = [];
  for (const name of ['tooLittle', 'malformed']) if (r[name]!.ok || r[name]!.reason !== 'failed') problems.push(`${name}: did not fail softly`);
  for (const name of ['normal', 'large']) {
    const x = r[name]!;
    if (!x.ok || x.n !== 21 || !x.checked) problems.push(`${name}: no valid 21 parameters`);
  }
  if (r.normal!.ms! > 200) problems.push(`a normal fit held the main thread ${r.normal!.ms} ms (over 200: move it to a Web Worker, spec §6.2)`);
  for (const p of problems) console.error('PROBLEM:', p);
  failed = problems.length > 0;
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
```

Run: `npm run optimizer`
Expected: exit 0; JSON shows `tooLittle` and `malformed` as `{ ok: false, reason: 'failed' }`, `normal` ≈1,740 items and `large` ≈5,400 items both `ok: true, n: 21, checked: true`, `ms` in the tens. (The optimizer prints `epoch … loss …` lines to the page console; they are not shown.)

- [ ] **Step 7: Build and check the precache**

`fitParameters` isn't imported by the app until Task 8, so Vite tree-shakes it now; this step only proves the config builds. Run:

```bash
npm run build
```

Expected: build succeeds. (Task 8 Step 6 repeats the precache inspection once the panel imports the optimizer.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/srs/optimizer.ts src/srs/optimizer.test.ts src/test/reviewHistory.ts scripts/optimizer-check.html scripts/optimizer-check.ts
git commit -m "feat(srs): lazy fsrs-browser optimizer wrapper, kept out of the precache, checked in WebKit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Fit to his memory (Skills panel)

**Files:**
- Create: `src/srs/compare.ts`, `src/parent/FitToMemory.tsx`
- Modify: `src/parent/SkillsPanel.tsx` (import + one line after `RetentionCheck`)
- Modify: `src/styles.css` (after the Task 5 retention rules)
- Test: `src/srs/compare.test.ts`, `src/parent/fitToMemory.test.tsx`, `src/parent/retentionCheck.test.tsx` (one assertion)

**Interfaces:**
- Consumes: `fitData`/`FitData` (Task 6); `fitParameters` (Task 7); `setSchedulerParams` (Task 1); `Settings.fsrs` (Task 1); `SkillsPanel` `Data.allLogs`, `load` (Task 5).
- Produces: `compareIntervals(fitted: number[], start?: Date): IntervalStep[]` with `interface IntervalStep { label: string; before: number; after: number }`; `COMPARE_LABELS = ['Right once', 'Right 2 times', 'Right 3 times', 'A miss, then right']`; `formatDays(n: number): string`; `FitToMemory({ logs, cards, settings, onChange })`; `FIT_MIN_REVIEWS = 1000`; `REFIT_AFTER = 500`.

**The sample word (spec §6.2 "after 1, 2 and 3 right answers in a row, then after a miss"):** with ts-fsrs's short-term steps, the first answer on a new card and the answer right after a miss land on fixed 10-minute steps that no parameter changes. So the sample word is *met* (a first right answer), then answered right on later days; rows are the intervals after the 1st, 2nd and 3rd right answers after meeting it, and after a miss followed by a right answer. Answers come when due (at least a day apart), without fuzz. Defaults give 7, 32, 118 and 6 days.

- [ ] **Step 1: Write the failing compare test**

Create `src/srs/compare.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { default_w } from 'ts-fsrs';
import { compareIntervals, formatDays } from './compare';

describe('compareIntervals (spec §6.2 before/after)', () => {
  it('the same parameters give the same intervals', () => {
    const rows = compareIntervals([...default_w]);
    expect(rows.map((r) => r.label)).toEqual(['Right once', 'Right 2 times', 'Right 3 times', 'A miss, then right']);
    for (const r of rows) expect(r.after).toBe(r.before);
    expect(rows.map((r) => r.before)).toEqual([7, 32, 118, 6]); // ts-fsrs 5.4.2 defaults
  });
  it('a memory that lasts longer gives longer intervals', () => {
    const fitted = default_w.map((x, i) => (i === 2 ? x * 4 : x)); // w2: the starting stability after Good
    const rows = compareIntervals(fitted);
    expect(rows[2]!.after).toBeGreaterThan(rows[2]!.before);
  });
  it('formatDays', () => {
    expect(formatDays(0.4)).toBe('same day');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(12)).toBe('12 days');
  });
});
```

Run: `npx vitest run src/srs/compare.test.ts` — Expected: FAIL — `Failed to resolve import "./compare"`.

- [ ] **Step 2: Implement `compare.ts`**

Create `src/srs/compare.ts`:

```ts
// Before/after for the parent (SRS tuning spec §6.2): one sample word's intervals under the default and the fitted parameters.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

export interface IntervalStep { label: string; before: number; after: number }

export const COMPARE_LABELS = ['Right once', 'Right 2 times', 'Right 3 times', 'A miss, then right'] as const;
// the word is met (a first answer, right), then answered on later days; the rows are the intervals after these answers
const HISTORY: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good, Rating.Again, Rating.Good];
const SHOWN = [1, 2, 3, 5];
const DAY = 86_400_000;

/** Whole days to the next review after each shown answer. Each answer comes when the card is due, and never the same day. */
function intervals(w: number[] | undefined, start: Date): number[] {
  const f = fsrs(generatorParameters({ enable_fuzz: false, ...(w ? { w } : {}) })); // no fuzz: one word, compared fairly
  let card: Card = createEmptyCard(start);
  let now = start;
  const out: number[] = [];
  HISTORY.forEach((g, i) => {
    card = f.next(card, now, g).card;
    if (SHOWN.includes(i)) out.push(Math.max(0, Math.round((card.due.getTime() - now.getTime()) / DAY)));
    now = new Date(Math.max(card.due.getTime(), now.getTime() + DAY));
  });
  return out;
}

export function compareIntervals(fitted: number[], start: Date = new Date(2026, 0, 5, 9)): IntervalStep[] {
  const before = intervals(undefined, start);
  const after = intervals(fitted, start);
  return COMPARE_LABELS.map((label, i) => ({ label, before: before[i]!, after: after[i]! }));
}

/** "same day", "1 day", "12 days". */
export function formatDays(n: number): string {
  if (n < 1) return 'same day';
  return n === 1 ? '1 day' : `${n} days`;
}
```

Run: `npx vitest run src/srs/compare.test.ts` — Expected: PASS.

- [ ] **Step 3: Write the failing rendered tests**

Create `src/parent/fitToMemory.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { default_w, Rating } from 'ts-fsrs';
import { getSettings, updateSettings } from '../store/repo';
import { schedulerParams, setSchedulerParams } from '../srs/scheduler';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type ReviewLog, type Settings } from '../types';
import { FitToMemory } from './FitToMemory';

const fit = vi.hoisted(() => vi.fn());
vi.mock('../srs/optimizer', () => ({ fitParameters: fit })); // the real optimizer runs in WebKit: scripts/optimizer-check.ts

const FITTED = default_w.map((x, i) => (i === 2 ? x * 4 : x)); // remembers a first right answer longer
/** n training items: n cards answered on two days each. */
const history = (n: number): ReviewLog[] =>
  Array.from({ length: n }, (_, i) => [1, 3].map((d): ReviewLog => ({ cardId: `b:w${i}:recognise`, wordId: `b:w${i}`, kind: 'recognise', at: new Date(2026, 8, d, 16).getTime(), rating: Rating.Good, correct: true }))).flat();

async function show(n: number, settings: Partial<Settings> = {}) {
  const app = await makeAppData({ now: () => new Date(2026, 9, 13, 9) });
  await updateSettings(app.db, settings);
  const onChange = vi.fn(async () => {});
  renderWithApp(<FitToMemory logs={history(n)} cards={[]} settings={{ ...DEFAULT_SETTINGS, ...settings }} onChange={onChange} />, app);
  return { app, onChange };
}

afterEach(() => {
  setSchedulerParams(null);
  fit.mockReset();
});

describe('Fit to his memory (SRS tuning spec §6.2)', () => {
  it('under 1,000 reviews: the count, and the button disabled', async () => {
    await show(412);
    expect(screen.getByText(/Fit to his memory: 412 \/ 1,000 reviews/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit to his memory' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('fit → before/after → Use these: saved, and the scheduler uses them', async () => {
    fit.mockResolvedValue({ ok: true, w: FITTED });
    const { app, onChange } = await show(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText('Right 3 times')).toBeTruthy();
    expect(fit.mock.calls[0]![0].count).toBe(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Use these' }));
    await waitFor(async () => expect((await getSettings(app.db)).fsrs).toEqual({ w: FITTED, fittedAt: new Date(2026, 9, 13, 9).getTime(), reviews: 1000 }));
    expect(schedulerParams()[2]).toBeCloseTo(FITTED[2]!, 3);
    expect(onChange).toHaveBeenCalled();
  });
  it('a double tap on Fit runs the optimizer once', async () => {
    let finish: (r: unknown) => void = () => {};
    fit.mockReturnValue(new Promise((r) => (finish = r)));
    await show(1000);
    const button = screen.getByRole('button', { name: 'Fit to his memory' });
    fireEvent.click(button);
    expect(await screen.findByText('Fitting…')).toBeTruthy();
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 80));
    finish({ ok: true, w: FITTED });
    expect(await screen.findByText('Right 3 times')).toBeTruthy();
    expect(fit).toHaveBeenCalledTimes(1);
  });
  it('Keep default: nothing is saved', async () => {
    fit.mockResolvedValue({ ok: true, w: FITTED });
    const { app } = await show(1200);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep default' }));
    expect(screen.queryByText('Right 3 times')).toBeNull();
    expect((await getSettings(app.db)).fsrs).toBeUndefined();
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
  it('a failed fit keeps the default and says so; offline says it needs the internet', async () => {
    fit.mockResolvedValueOnce({ ok: false, reason: 'failed' }).mockResolvedValueOnce({ ok: false, reason: 'offline' });
    const { app } = await show(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText("Couldn't fit — keeping the default.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText(/needs the internet/)).toBeTruthy();
    expect((await getSettings(app.db)).fsrs).toBeUndefined();
  });
  it('fitted: when and on how many; Back to default; Fit again only after 500 more reviews', async () => {
    const fsrs = { w: FITTED, fittedAt: new Date(2026, 9, 13, 9).getTime(), reviews: 1032 };
    setSchedulerParams(FITTED);
    const { app } = await show(1500, { fsrs });
    expect(screen.getByText(/Fitted on 1,032 reviews, 13 Oct/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit again' }) as HTMLButtonElement).disabled).toBe(true); // 1,500 < 1,532
    fireEvent.click(screen.getByRole('button', { name: 'Back to default' }));
    await waitFor(async () => expect((await getSettings(app.db)).fsrs).toBeUndefined());
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
  it('Fit again is enabled at 500 more reviews', async () => {
    await show(1532, { fsrs: { w: FITTED, fittedAt: 0, reviews: 1032 } });
    expect((screen.getByRole('button', { name: 'Fit again' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
```

In `src/parent/retentionCheck.test.tsx`, rename the last test to `'the Skills panel shows it, and the fit, from his stored logs'` and add as its last line:

```tsx
    expect(screen.getByText(/Fit to his memory: 0 \/ 1,000 reviews/)).toBeTruthy();
```

Run: `npx vitest run src/parent/fitToMemory.test.tsx src/parent/retentionCheck.test.tsx`
Expected: FAIL — `Failed to resolve import "./FitToMemory"`; the Skills panel has no fit line.

- [ ] **Step 4: Implement `FitToMemory` and wire it in**

Create `src/parent/FitToMemory.tsx`:

```tsx
import { useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { compareIntervals, formatDays, type IntervalStep } from '../srs/compare';
import { fitData } from '../srs/fitData';
import { fitParameters } from '../srs/optimizer';
import { setSchedulerParams } from '../srs/scheduler';
import { updateSettings } from '../store/repo';
import type { CardRecord, ReviewLog, Settings } from '../types';

export const FIT_MIN_REVIEWS = 1000;
export const REFIT_AFTER = 500;

type Phase = { kind: 'idle' } | { kind: 'fitting' } | { kind: 'result'; w: number[]; rows: IntervalStep[] } | { kind: 'message'; text: string };

const num = (n: number) => n.toLocaleString('en-US');
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Fit to his memory (SRS tuning spec §6.2): at 1,000 reviews the parent fits FSRS's parameters to his own logs, sees what changes
 * for one sample word, and uses them or keeps the default. The optimizer loads only on the tap.
 */
export function FitToMemory({ logs, cards, settings, onChange }: { logs: ReviewLog[]; cards: CardRecord[]; settings: Settings; onChange: () => Promise<void> }) {
  const { db, now, refresh } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const data = fitData(logs, cards);
  const fitted = settings.fsrs;
  const canFit = fitted ? data.count >= fitted.reviews + REFIT_AFTER : data.count >= FIT_MIN_REVIEWS;

  const busy = useRef(false); // a double tap fits once (a tap can land before the disabled button re-renders)
  const fit = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setPhase({ kind: 'fitting' });
      await new Promise((r) => setTimeout(r, 50)); // let "Fitting…" paint before the optimizer takes the main thread
      const r = await fitParameters(data);
      if (r.ok) setPhase({ kind: 'result', w: r.w, rows: compareIntervals(r.w) });
      else setPhase({ kind: 'message', text: r.reason === 'offline' ? "Couldn't load the fitting tool — it needs the internet the first time. Try again when online." : "Couldn't fit — keeping the default." });
    } finally {
      busy.current = false;
    }
  };
  const use = async (w: number[]) => {
    await updateSettings(db, { fsrs: { w, fittedAt: now().getTime(), reviews: data.count } });
    setSchedulerParams(w); // new parameters apply from each card's next review; cards keep their state
    setPhase({ kind: 'message', text: 'Using his fitted memory.' });
    await refresh();
    await onChange();
  };
  const backToDefault = async () => {
    await updateSettings(db, { fsrs: undefined });
    setSchedulerParams(null);
    setPhase({ kind: 'message', text: 'Back to the default.' });
    await refresh();
    await onChange();
  };

  return (
    <div class="skills__fit">
      <h3>Fit to his memory</h3>
      {fitted ? (
        <p>
          Fitted on {num(fitted.reviews)} reviews, {day(fitted.fittedAt)}.{' '}
          <button type="button" class="small-btn" onClick={() => void backToDefault()}>Back to default</button>{' '}
          <button type="button" class="small-btn" disabled={!canFit || phase.kind === 'fitting'} onClick={() => void fit()}>Fit again</button>
          {!canFit && <span> (after {num(fitted.reviews + REFIT_AFTER)} reviews; now {num(data.count)})</span>}
        </p>
      ) : (
        <p>
          {data.count < FIT_MIN_REVIEWS ? `Fit to his memory: ${num(data.count)} / ${num(FIT_MIN_REVIEWS)} reviews` : `${num(data.count)} reviews to fit on.`}{' '}
          <button type="button" class="small-btn" disabled={!canFit || phase.kind === 'fitting'} onClick={() => void fit()}>Fit to his memory</button>
        </p>
      )}
      {phase.kind === 'fitting' && <p role="status">Fitting…</p>}
      {phase.kind === 'result' && (
        <div>
          <table class="skills__compare">
            <thead><tr><th>Sample word</th><th>Default</th><th>Fitted</th></tr></thead>
            <tbody>
              {phase.rows.map((r) => (
                <tr key={r.label}><td>{r.label}</td><td>{formatDays(r.before)}</td><td>{formatDays(r.after)}</td></tr>
              ))}
            </tbody>
          </table>
          <div class="skills__fit-actions">
            <button type="button" class="btn btn--primary" onClick={() => void use(phase.w)}>Use these</button>
            <button type="button" class="btn" onClick={() => setPhase({ kind: 'idle' })}>Keep default</button>
          </div>
        </div>
      )}
      {phase.kind === 'message' && <p role="status">{phase.text}</p>}
    </div>
  );
}
```

In `src/parent/SkillsPanel.tsx` add `import { FitToMemory } from './FitToMemory';` and, directly after `<RetentionCheck logs={d.allLogs} now={now()} />`:

```tsx
      <FitToMemory logs={d.allLogs} cards={d.cards} settings={d.settings} onChange={load} />
```

In `src/styles.css`, after `.skills__note { … }` add:

```css
.skills__compare { border-collapse: collapse; margin: 8px 0 16px; }
.skills__compare th, .skills__compare td { padding: 4px 20px 4px 0; text-align: left; white-space: nowrap; }
.skills__fit-actions { display: flex; flex-wrap: wrap; gap: 8px 12px; }
```

- [ ] **Step 5: Run tests and type-check**

Run: `npx tsc --noEmit && npx vitest run src/srs/compare.test.ts src/parent/fitToMemory.test.tsx src/parent/retentionCheck.test.tsx src/parent/skillsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Build and confirm the optimizer is lazy and not precached**

Run:

```bash
npm run build
ls dist/assets | grep -E 'fsrs_browser|workerHelpers'
node -e "const s=require('fs').readFileSync('dist/sw.js','utf8');const u=[...s.matchAll(/url:\"([^\"]+)\"/g)].map(m=>m[1]);const bad=u.filter(x=>/fsrs|workerHelpers|wasm/.test(x));console.log('precache',u.length,'optimizer entries',bad);if(bad.length||!/cacheName:\"optimizer\"/.test(s))process.exit(1)"
grep -o 'import("./fsrs_browser-[^"]*")' dist/assets/main-*.js
```

Expected: `dist/assets` has `fsrs_browser-*.js` (two: the module and its worker copy), `fsrs_browser_bg-*.wasm` (~337 KB) and `workerHelpers-*.js`; the node line prints `optimizer entries []` (precache 50 entries, as before this feature) and exits 0; the grep shows the main chunk reaches the optimizer only through `import("./fsrs_browser-….js")`.

- [ ] **Step 7: Commit**

```bash
git add src/srs/compare.ts src/srs/compare.test.ts src/parent/FitToMemory.tsx src/parent/fitToMemory.test.tsx src/parent/retentionCheck.test.tsx src/parent/SkillsPanel.tsx src/styles.css
git commit -m "feat(skills): fit FSRS to his memory — before/after, Use these, Keep default, Back to default, Fit again" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Scheduler from settings at start and after a restore; keep his storage

**Files:**
- Create: `src/store/persist.ts`
- Modify: `src/bootstrap.ts` (~36-39), `src/parent/BackupPanel.tsx` (imports, `restore` ~53-56)
- Test: `src/store/persist.test.ts`, `src/bootstrap.test.ts`, `src/parent/parentB.test.tsx` (`describe('BackupPanel restore')`), `src/store/backup.test.ts`

**Interfaces:**
- Consumes: `setSchedulerParams`, `schedulerParams` (Task 1); `Settings.fsrs` (Task 1).
- Produces: `keepStorage(storage?: Pick<StorageManager, 'persist' | 'persisted'>): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `src/store/persist.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { keepStorage } from './persist';

describe('keepStorage (SRS tuning spec §8)', () => {
  it('asks once when not yet kept', async () => {
    const s = { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) };
    await keepStorage(s);
    expect(s.persist).toHaveBeenCalledTimes(1);
  });
  it('does not ask again when already kept', async () => {
    const s = { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) };
    await keepStorage(s);
    expect(s.persist).not.toHaveBeenCalled();
  });
  it('no storage API, or one that throws: nothing breaks', async () => {
    await expect(keepStorage(undefined)).resolves.toBeUndefined();
    await expect(keepStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => { throw new Error('no'); }) })).resolves.toBeUndefined();
  });
});
```

In `src/bootstrap.test.ts` add the imports

```ts
import { default_w } from 'ts-fsrs';
import { schedulerParams, setSchedulerParams } from './srs/scheduler';
```

and, as the last test of the file's last `describe`:

```ts
  it('builds the scheduler from his fitted parameters, and from the defaults when they are invalid (SRS tuning spec §6.2)', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    const w = default_w.map((x, i) => (i === 0 ? x * 2 : x));
    await updateSettings(first.db, { fsrs: { w, fittedAt: 1, reviews: 1000 } });
    first.db.close();
    const second = await bootstrap(name);
    expect(schedulerParams()[0]).toBeCloseTo(w[0]!, 3);
    await updateSettings(second.db, { fsrs: { w: [1, 2, 3], fittedAt: 1, reviews: 1000 } });
    second.db.close();
    (await bootstrap(name)).db.close();
    expect([...schedulerParams()]).toEqual([...default_w]);
    setSchedulerParams(null);
  });
```

In `src/parent/parentB.test.tsx` add the imports

```ts
import { default_w } from 'ts-fsrs';
import { schedulerParams, setSchedulerParams } from '../srs/scheduler';
```

and in `describe('BackupPanel restore', …)`, before "tells the parent when a restore fails…":

```tsx
  it('a restored fit applies straight away; a backup with none puts the defaults back (SRS tuning spec §6.2)', async () => {
    const w = default_w.map((x, i) => (i === 0 ? x * 2 : x));
    const restore = async (fsrs: { w: number[]; fittedAt: number; reviews: number } | undefined) => {
      const source = await makeAppData();
      await updateSettings(source.db, { fsrs });
      const text = await exportBackup(source.db, { includeMedia: false, now: 1 });
      const { unmount } = renderWithApp(<BackupPanel />, await makeAppData());
      const input = document.getElementById('bk-file') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [backupFile(text)] });
      fireEvent.change(input);
      fireEvent.click(await screen.findByText('Replace with this backup'));
      expect(await screen.findByText('Backup restored.')).toBeTruthy();
      unmount();
    };
    await restore({ w, fittedAt: 1, reviews: 1000 });
    expect(schedulerParams()[0]).toBeCloseTo(w[0]!, 3);
    await restore(undefined);
    expect([...schedulerParams()]).toEqual([...default_w]);
    setSchedulerParams(null);
  });
```

In `src/store/backup.test.ts` add `addReviewLog` and `logsSince` to the `./repo` import and append:

```ts
describe('backups carry his fitted memory (SRS tuning spec §6.2)', () => {
  it("settings.fsrs and the review logs' new fields come back from a backup", async () => {
    const db = await freshDb();
    const fsrs = { w: Array.from({ length: 21 }, (_, i) => i / 10), fittedAt: 5, reviews: 1032 };
    await updateSettings(db, { fsrs });
    await addReviewLog(db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: 9, rating: 3, correct: true, state: 2, elapsedDays: 4, scheduledDays: 5 });
    const target = await freshDb();
    await applyBackup(target, readBackup(await exportBackup(db, { includeMedia: false, now: 1 })));
    expect((await getSettings(target)).fsrs).toEqual(fsrs);
    expect((await logsSince(target, 0))[0]).toMatchObject({ state: 2, elapsedDays: 4, scheduledDays: 5 });
  });
});
```

- [ ] **Step 2: Run them to see the new behaviour fail**

Run: `npx vitest run src/store/persist.test.ts src/bootstrap.test.ts src/parent/parentB.test.tsx src/store/backup.test.ts`
Expected: FAIL — `./persist` doesn't resolve; the bootstrap and restore tests see the default `w[0]` instead of the fitted one. (The backup round-trip test already passes: settings and logs are copied whole — it pins that.)

- [ ] **Step 3: Implement**

Create `src/store/persist.ts`:

```ts
/**
 * Asks the browser to keep the app's storage (SRS tuning spec §8): once, when it can and hasn't already, so Safari doesn't evict
 * his IndexedDB. The answer is ignored: nothing else changes either way. Sync across devices is its own sub-project.
 */
export async function keepStorage(storage: Pick<StorageManager, 'persist' | 'persisted'> | undefined = globalThis.navigator?.storage): Promise<void> {
  try {
    if (!storage?.persist) return;
    if (await storage.persisted?.()) return;
    await storage.persist();
  } catch {
    // a refusal or an old browser: nothing to do
  }
}
```

In `src/bootstrap.ts` add the imports

```ts
import { keepStorage } from './store/persist';
import { setSchedulerParams } from './srs/scheduler';
```

and replace

```ts
  setSfxEnabled(settings.soundEffects);
  // Ask Safari not to evict our data (home-screen apps are also exempt from its 7-day cleanup).
  void navigator.storage?.persist?.().catch(() => false);
```

with

```ts
  setSfxEnabled(settings.soundEffects);
  setSchedulerParams(settings.fsrs?.w ?? null); // his fitted memory, if the parent chose it (SRS tuning spec §6.2)
  // Ask Safari not to evict our data (home-screen apps are also exempt from its 7-day cleanup).
  void keepStorage();
```

In `src/parent/BackupPanel.tsx` add `import { setSchedulerParams } from '../srs/scheduler';` and in `restore`, after `setSfxEnabled(settings.soundEffects);`:

```tsx
      setSchedulerParams(settings.fsrs?.w ?? null); // a restored fit (or none) applies now, not on the next launch
```

- [ ] **Step 4: Run tests and type-check**

Run: `npx tsc --noEmit && npx vitest run src/store/persist.test.ts src/bootstrap.test.ts src/parent/parentB.test.tsx src/store/backup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/persist.ts src/store/persist.test.ts src/bootstrap.ts src/bootstrap.test.ts src/parent/BackupPanel.tsx src/parent/parentB.test.tsx src/store/backup.test.ts
git commit -m "feat(srs): the scheduler follows settings.fsrs at start and after a restore; ask once to keep his storage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: WebKit screenshots of the Skills panel, the fit sweep, the full suite and the build

**Files:**
- Modify: `scripts/fit-profile.ts` (imports, `FitProfileOptions`, after the `updateSettings` call)
- Modify: `scripts/fit-check.ts` (the `run('parent', …)` flow ~380-389)

**Interfaces:**
- Consumes: `makeReviewHistory` (Task 7); the Skills panel's `.skills__retention`, `.skills__compare` and button labels (Tasks 5, 8).
- Produces: `FitProfileOptions.reviewHistory?: boolean`; screenshots `fit-shots/<size>/parent-skills.png` and `fit-shots/<size>/parent-fit.png` for every size (iPad portrait/landscape/Air, iPhone SE/15/Safari).

- [ ] **Step 1: Seed a review history in the fit profile**

In `scripts/fit-profile.ts` change the repo import to include `addReviewLog`, and add `import { makeReviewHistory } from '../src/test/reviewHistory';`. In `FitProfileOptions` add:

```ts
  reviewHistory?: boolean; // four months of reviews (~1,700 training items): Skills shows retention and Fit can run (SRS tuning spec §9)
```

After the `await updateSettings(db, { pinHash: … });` call add:

```ts
  if (o.reviewHistory) {
    const { logs } = makeReviewHistory({ cards: 330, days: 120, end: new Date(t - 3_600_000), wordIds: words.slice(100, 430).map((w) => w.id) });
    for (const l of logs) await addReviewLog(db, l);
  }
```

- [ ] **Step 2: Screenshot Skills and run the real fit in the sweep**

In `scripts/fit-check.ts` change the parent flow's profile to `{ pinCode: FIT_PIN, reviewHistory: true }` and, after `await snap(p, size, 'parent-progress', '.progress__bars');`, add:

```ts
    // retention and the fit (SRS tuning spec §5, §6.2): the real optimizer loads from the build, in WebKit
    await p.click('.tab:has-text("Skills")');
    await p.waitForSelector('.skills__retention');
    await snap(p, size, 'parent-skills', '.skills__retention');
    await p.click('button:has-text("Fit to his memory")');
    await p.waitForSelector('.skills__compare', { timeout: 20_000 });
    await snap(p, size, 'parent-fit', 'button:has-text("Use these")');
```

- [ ] **Step 3: Run the parent flow and look at the shots**

Run: `npm run build && FIT_ONLY='^parent$' npx tsx scripts/fit-check.ts`
Expected: `0 with problems`; `fit-shots/*/parent-skills.png` and `fit-shots/*/parent-fit.png` exist for all six sizes.

Open (Read) at least `fit-shots/ipad-portrait/parent-skills.png`, `fit-shots/ipad-portrait/parent-fit.png`, `fit-shots/iphone-se/parent-skills.png` and `fit-shots/iphone-se/parent-fit.png`. Check: "Remembered after a gap (last 30 days, target 90%)" with both lines as percentages (~87% taps, ~91% writing); "1,7xx reviews to fit on."; the Default/Fitted table has four rows with readable, separated columns (no "118 days66 days"); **Use these** and **Keep default** sit side by side on iPad and wrap cleanly on the SE; nothing overflows sideways.

- [ ] **Step 4: The whole verification**

Run each and read its output:

```bash
npx tsc --noEmit
npx vitest run
npm run optimizer
npm run build
node -e "const s=require('fs').readFileSync('dist/sw.js','utf8');const u=[...s.matchAll(/url:\"([^\"]+)\"/g)].map(m=>m[1]);const bad=u.filter(x=>/fsrs|workerHelpers|wasm/.test(x));console.log('precache',u.length,'optimizer entries',bad);if(bad.length||!/cacheName:\"optimizer\"/.test(s))process.exit(1)"
npm run fit
```

Expected: tsc clean; vitest all files pass (the dry run: 243 files, 2,136 tests); `npm run optimizer` exits 0 with a normal fit well under 200 ms; build succeeds; the sw check prints `optimizer entries []`; `npm run fit` finishes with 0 problems in the fit sweep, stage cases and story walk.

- [ ] **Step 5: Commit**

```bash
git add scripts/fit-profile.ts scripts/fit-check.ts
git commit -m "test(fit): WebKit screenshots of Skills retention and the real fit, iPad and phone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec | Task |
|---|---|
| §3.1 Hard until produced, all sites incl. 认新字 first grade, 练一练, 选一选/用一用 first answer, 组词 credit | 3 (sites table), 4 (wiring) |
| §3.2 slow line, median/clamp/10/guesses, once per lesson | 2, 4 |
| §3.3 fuzz on, ranges in tests | 1 |
| §4 log fields on every path, incl. settleTake via the take's copy | 1 (types, snapshot), 3 |
| §5 retention, lines, gate, notes, Skills | 5 |
| §6.1 fitData, placement/say/sentence/free play excluded, count | 6 |
| §6.2 lazy import, not precached, runtime-cached, offline message, short-term, checkParameters, before/after, Use/Keep, Fitted on…, Back to default, Fit again +500, scheduler from settings, restore | 7, 8, 9 |
| §6.2 Web Worker if >200 ms — measured (≈22 ms / 1,741 items in WebKit), guarded by `npm run optimizer` | 7, 10 |
| §7 settings.fsrs, no lessonVersion bump | 1 |
| §8 storage.persist once | 9 |
| §9 unit, rendered, integration (real optimizer in WebKit), screenshots, fit sweep | 1–10 |
