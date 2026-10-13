# ZiJi spaced repetition tuned to him: honest ratings, his own pace, measured retention, a fit to his memory — design

Date: 2026-10-13 · Base: main at 3a7b9a7 (after PR #6) · Next after this: two-way sync across devices, then the parent loop

## 1. Why

ZiJi schedules every skill card with FSRS (ts-fsrs 5.4.2, FSRS-6 defaults). The research review (`reports/Primary Chinese outcomes strategy.md`, and the SRS gap analysis of 2026-10-12) found four gaps.

1. **Taps overstate memory.** A correct tap on a recognise, meaning, hear or understand card rates **Good**, exactly like a word he can write or say. Recognition is easier than recall, so tap-only words get intervals that are too long.
2. **One speed rule for everyone.** An answer slower than a fixed **6 s** rates Hard. For a 7-year-old, 6 s is fast on some kinds and slow on others, and it never adapts to him.
3. **Nothing checks the schedule works.** FSRS aims for 90% recall at the moment a card is due. The app never measures whether he actually remembers about 90%. Its review logs don't keep the card's state or the gap since its last review, so it can't.
4. **Default parameters.** FSRS's 21 parameters are fitted to adult flashcard users. With about 1,000 of his own reviews, they can be fitted to him.

Also, **fuzz is off**. Words learned together stay due on the same days, and those days spike.

**Success:**
- A correct tap no longer counts as full recall until he has produced the word.
- "Slow" means slow *for him*.
- The parent can see his real retention against the 90% target.
- At 1,000 reviews the parent can fit FSRS to his memory in one tap and undo it.

## 2. Decisions (parent, 2026-10-12 and 2026-10-13)

| Question | Decision |
|---|---|
| Tap credit | **A correct tap rates Hard until the word has a production pass** |
| Slow threshold | **Per child, per kind**, median-based |
| Retention | **Measured from richer logs**, shown in Skills against the 0.9 target |
| Fitting | **In the app, one tap, in the parent area**, at about 1,000 reviews, with before/after and Use/Keep. Feasibility: `fsrs-browser` 6.6.0 (WebAssembly, 337 KB) ran its optimizer in WebKit with no cross-origin isolation. It fitted 2,000 items in 30 ms and returned 21 parameters, the same count ts-fsrs uses |
| Fuzz | **On** |
| Cross-device data | **Two-way sync is its own sub-project, next.** This release only asks the browser to keep its storage (§8) |

## 3. Rating

All of this lives in `src/srs/` and the record helpers (`src/session/record.ts`). The rating rule stays in one place, `toRating`, which gains context.

### 3.1 Hard until produced

- **Applies to:** card kinds `recognise`, `meaning`, `hear` and `understand`, at every rating site:
  - 认新字's first grade;
  - 练一练;
  - 选一选/用一用's first answer of the day;
  - the 组词 meaning credit from 写一写. That credit is from writing, which is production. It therefore counts as produced for its own rating (Good when right), and doesn't need a prior pass.
- **"Produced"** means the word has a passed `write`, `say` or `sentence` card (`card.passed` set).
- **The rule:**

  | Answer | Not yet produced | Produced |
  |---|---|---|
  | Wrong | Again | Again |
  | Right and slow (§3.2) | Hard | Hard |
  | Right | **Hard** | Good |

- **State:** in ts-fsrs's learning steps, Hard repeats the step rather than shortening an interval, so the not-produced Hard applies only when the card *before this review* is New or in Review; in Learning or Relearning a right, not-slow answer rates Good (otherwise a tapped-only card, rated once a day, would never graduate).
- **Unchanged:** write ratings (by misses), Say and 说一句 ratings (by the parent's ✓/✗), and rung passes. `passDays` counts correct first answers, not ratings, so ladder progress is the same.
- **Effect:** more reviews for words he only taps. The existing backlog pause (`BACKLOG_PAUSE`) holds back new words if reviews pile up.

### 3.2 His own slow line

- `slowMs(kind)` = **2 × the median rated time** of his last 40 correct, rated answers of that kind, clamped to **3,000–12,000 ms**.
- "Rated time" is the time already used for rating today, with `LISTEN_MS` or `USE_READING_MS` taken off where they are now.
- With fewer than **10** samples of a kind, the line stays at **6,000 ms**.
- Answers faster than `fastLimit` (treated as guesses) are left out of the median.
- It is computed **once per lesson**, at lesson start, from the logs, and passed to the rating sites. It can't drift mid-lesson.

### 3.3 Fuzz

`enable_fuzz: true` in the scheduler. ts-fsrs only fuzzes intervals of 2.5 days or more. Tests that assert exact due dates use a fixed rng, or assert ranges.

## 4. Logging what FSRS needs

`ReviewLog` gains optional fields, written by every path that calls `review()`:

```ts
state?: State;          // the card's FSRS state before this review (New, Learning, Review, Relearning)
elapsedDays?: number;   // whole local days since the card's last review (0 = same day; card.last_review)
scheduledDays?: number; // the interval the card was on (card.scheduled_days before review)
```

- Older logs simply lack these fields. No migration.
- Say and sentence: the parent-verdict log (`settleTake`) records the state the card had when he recorded. The take keeps a copy of it.

## 5. Retention check (Skills)

- **"Remembered after a gap"** goes in `SkillsPanel`, next to the accuracy figures.
- **Counted reviews:** the **first review of the day** of a card whose logged `state` was **Review**, over the last **30 days**.
- **Retention** = the share of those not rated Again.
- **Two lines:** **Taps** (recognise, meaning, hear, understand) and **Writing** (write). Say and sentence are excluded; the parent grades them.
- **Shown** once a line has **30** counted reviews. Before that it reads "Measuring — 12 of 30 reviews".
- **Target:** 90%. A note appears below **85%**: "He's forgetting more than planned — reviews may be too far apart." A note appears above **95%**: "Reviews come sooner than he needs."
- It counts only logs from this release on, because older logs have no `state`.
- Pure function: `retention(logs, now)` in `src/stats/retention.ts`.

## 6. Fit to his memory

### 6.1 Training data

`src/srs/fitData.ts` is pure and builds the optimizer's input from review logs.
- **Per card:** first log per local day, ordered. Each log contributes its `rating` (1–4) and a day gap (`elapsedDays` when logged, otherwise derived from the previous kept log's local day; the first is 0).
- **Each review from the second onward** becomes one training item: the card's history up to and including it. This is the format `computeParameters(ratings, delta_ts, lengths, …)` expects.
- **Left out:**
  - Cards that began from placement. Their first log isn't a New card's: for new logs `state` says so, and for older ones the plan uses the placement marker.
  - `say`/`sentence` cards, whose ratings are parent verdicts on a different time base.
  - Logs from free play (none are written today).
- **Count:** the number of training items is the "reviews" figure the parent sees.

### 6.2 The parent flow (SkillsPanel)

- **Before 1,000:** "Fit to his memory: 412 / 1,000 reviews", with the button disabled.
- **At 1,000 or more:** **Fit to his memory** is enabled. On tap:
  1. The optimizer is lazy-loaded with `import('fsrs-browser')`. It is never in the child's lesson path and not in the service-worker precache. It is runtime-cached after the first load, and if there's no network it says so.
  2. Fitting runs with `enable_short_term: true` (matching the scheduler) and shows a spinner. The UI must not freeze, so it runs in a Web Worker if the main-thread run blocks for more than about 200 ms on the iPad; the plan measures this.
  3. The result is checked with ts-fsrs `checkParameters`. Invalid or failed results show "Couldn't fit — keeping the default" and change nothing.
  4. **Before/after** shows the intervals for one sample word under default and fitted parameters: after 1, 2 and 3 right answers in a row, then after a miss. For example: "Right 3 times: 9 → 12 days".
  5. **Use these** stores `settings.fsrs = { w: number[], fittedAt, reviews }`. **Keep default** discards the result.
- **After fitting:**
  - The panel shows "Fitted on 1,032 reviews, 13 Oct", with **Back to default** and **Fit again**. **Fit again** is enabled after **500** more reviews.
  - The scheduler uses `settings.fsrs.w` when present and valid, and defaults otherwise.
  - The scheduler is built from settings at app start and rebuilt when `settings.fsrs` changes (`setSchedulerParams(w | null)`).
  - Existing cards keep their state. New parameters apply from each card's next review.
- **Backups** carry `settings.fsrs`, because settings are already in the backup.

## 7. Settings

- `settings.fsrs?: { w: number[]; fittedAt: number; reviews: number }`, unset by default.
- No `lessonVersion` bump: nothing existing changes meaning.

## 8. Keep his data (small)

At app start, call `navigator.storage.persist()` once when it's available and not yet granted, and ignore the result. This asks Safari not to evict the app's IndexedDB. Full cross-device sync is the next sub-project.

## 9. Testing

- **Unit tests:**
  - `toRating` with the produced flag and the slow line: every row of §3.1.
  - `slowMs`: the median, the clamp, the under-10 fallback and the exclusion of guesses.
  - Fuzz on: due dates within the fuzz range.
  - Logs carry `state`/`elapsedDays`/`scheduledDays` from every rating path, including `settleTake`.
  - `retention`: first-of-day only, Review state only, the two lines, the 30-review gate and the notes.
  - `fitData`: items and gaps, old logs without `elapsedDays`, placement and say/sentence excluded, the count.
  - The scheduler uses valid fitted parameters and falls back on invalid ones.
- **Rendered tests:**
  - SkillsPanel retention: measuring, shown, and the low/high notes.
  - Fit flow with a mocked optimizer: disabled under 1,000; fit → before/after → Use; Keep; failure; Back to default; Fit again after 500 more.
- **Integration:** run the real `fsrs-browser` on fixture logs in WebKit (playwright-core), as in the feasibility spike, and check that `checkParameters` accepts the 21 parameters it returns.
- **WebKit screenshots:** the Skills panel (retention + fit) at iPad and phone sizes. The fit sweep stays clean.

## 10. Out of scope

- Cross-device sync (next sub-project).
- Changing the desired retention (stays 0.9).
- Easy ratings.
- Fitting on the child's side, or fitting automatically.
- Scheduling for 朗读 and 听写, which don't rate cards.
