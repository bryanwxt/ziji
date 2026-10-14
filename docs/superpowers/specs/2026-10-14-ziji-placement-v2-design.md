# ZiJi placement v2: a short, term-based check that works with the school pace — design

Date: 2026-10-14 · Parent-approved in chat, 2026-10-14

## Why

- The old check was too long: 3 warm-up questions plus up to 40 more, 4 styles per visit, and 选一选 sentences.
- Its result could work against the school pace:
  - whole 100-character bands were assumed known after only about 4 questions each;
  - a missed recheck went back into tap practice, not a proper 认新字 introduction;
  - up to 30 rechecks a day, rarest first, crowded out the week's class words.

## The check

- **Steps are school terms** in 欢乐伙伴 order: 一上, 一下, 二上, 二下, 三上, 三下. A term's characters are the distinct recognise characters first taught in that term (`taughtAt`).
- **Start:** one term below his class term from `currentLesson(now, settings)`, clamped to 一上. A P2 child in 二下 starts at 二上.
- **Questions per term:** 3 quick ones.
  - With a voice: 2 读一读 (character → pinyin) and 1 听一听 (hear a word → pick its meaning).
  - Without a voice: 3 读一读.
  - Each question uses a different character of that term, picked at random, never repeated.
- **Moving between terms:**
  - 3 right: go up a term.
  - 0–1 right: go down a term.
  - 2 right: ask 1 more in the same term. With that answer, 3 of 4 counts as up and 2 of 4 counts as down.
  - 不知道 counts as a miss.
- **When it ends:**
  - when it finds the first term he can't read, i.e. the walk turns from up to down or from down to up;
  - when it goes off either end of the term list;
  - after 15 questions.
- **Result: `readsUpTo`.** This is the highest term he passed, or none.
  - Gone off the top: the last term.
  - Gone off the bottom: none.
- **Removed:** no warm-up, no 补一补, no 选一选, no understanding level, no 100-character bands.

## Applying the result

- **Characters in passed terms** that he hasn't already practised get a placed recognise card (`passed`, as now). Every character answered right in a higher term is also placed.
- **Meaning:** no meaning card is placed as known. Placed characters get a meaning card due soon, a few a day, as in today's `meaningNow` path.
- **Listening:** a word answered right in 听一听 gets a hear card marked as a guess, as now. `queueHearChecks` stays.
- **Re-run:** the existing behaviour stays. It clears unpractised placement cards that the new result no longer supports.
- **Saved result:** `settings.placementResult` = `{ at, readsUpTo: term | null, tested, assumed, missed }`.
  - `tested` = number of characters asked.
  - `assumed` = placed but never asked.
  - Older saved results load as they are; shown as read-only legacy.

## Rechecks

- **First rechecks** of placed recognise cards are spread in school order: the most recent passed term first, then earlier terms. Today's order is rarest first.
- **At most 10 per lesson.** The rest wait for later days.
- **They still don't count toward `BACKLOG_PAUSE`.**
- **Un-place on a miss.** If his first recheck of a placed character is wrong (Again), the placed recognise card is deleted. The character becomes unstarted, so the catch-up lane teaches it again with a proper 认新字 introduction in school order.
  - Applies only to placement cards, never practised before.
  - Only their first recheck.
  - The log is kept.

## Parent view

- **The placement result screen and Skills** show, for example: 「读到 一下 · 已测 12 个字，推定 360 个」.
  - English for the parent: "Reads up to 一下 — 12 tested, 360 assumed."
- **Rechecks in Skills:** "Placement rechecks: 40 of 360 done, 3 sent back to learn."

## Testing

- **Walk:** start term; up, down and the one-more question; the end at a turn, off either end, and at 15.
- **Question styles** with and without a voice.
- **apply:** placed terms; right answers above the result placed; no meaning cards placed; hear guesses.
- **Rechecks:** school order and the cap of 10 per lesson.
- **Un-place:** only on the first recheck of a placement card; never for a practised card; the catch-up lane picks the character up next.
- **Parent copy.**
- **Rendered:** the placement screen runs to a result in at most 15 questions.
- **Fit sweep:** the placement flows at iPad and phone sizes.

## Out of scope

- Writing placement.
- P4–P6 terms.
- Changing the lanes themselves.
