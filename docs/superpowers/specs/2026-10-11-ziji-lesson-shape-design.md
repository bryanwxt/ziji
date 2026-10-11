# ZiJi lessons: shorter, calmer, and "known" means he can produce it — design

Date: 2026-10-11 · Sub-projects 2 + 3 of the lesson overhaul (1 "lessons follow his class" shipped in PR #1; 4 "variety that teaches" comes later) · Base: main at 2b8d9fc

## 1. Why

The parent reports that lessons are too tappy, too long and tiring, and repetitive. The research report (`reports/Primary Chinese outcomes strategy.md`) gives four reasons to change them:

- Multiple-choice accuracy is weak evidence of learning, and an app's own measures overstate gains by about 0.42 SD. Count an item as known only after he **produces** it on separate days.
- Short daily sessions (10–15 min) beat long ones.
- Rewards he expects for simply taking part undermine a child's own motivation (d = −0.46). Rewards that report what he can now do are fine.
- Interactive features reduce learning when they compete with the learning moment.

**Success:**
- A typical lesson takes about 15 minutes.
- About a third of 练一练 is production (Say), alongside 写一写.
- Progress and stars count characters he can **write** or **say**, each confirmed on two separate days.
- Truffle and rewards never interrupt a question he is answering.

## 2. Decisions (parent, 2026-10-11)

| Question | Decision |
|---|---|
| Spoken production check | He records; the **parent confirms** takes in a review queue. Speech recognition is not used |
| Lesson length | **One ~15-min lesson**, plus an optional second (the existing 再学一课) that never affects the streak or the chest |
| Rewards | **Move, don't remove**: Truffle quiet while he answers; no combo counter or spoken 连对; stars for mastery with a 1-star floor; chest stays daily; the streak forgives one rest day a week |
| Approach | Reshape inside the current four steps (认新字 → 练一练 → 写一写 → chest). Rejected: a new single loop (too risky to rewrite) and a minimal change (doesn't fix tappy or dull) |

## 3. "Known" means he can produce it

- **Say rung.** Add card kind `say` and rung `say` to `src/ladder/rungs.ts` (`RUNGS` gains `'say'`). The Word Thief design (2026-10-06 §3.2, §5) already planned this rung.
  - A Say card shows the word: the character, or a 词语. It has no options and no pinyin.
  - He taps to record himself reading it aloud. The model plays right after, and he may re-record once.
  - The Say rung **passes** on two separate local days that each have a **parent-confirmed** take.
  - An unreviewed take schedules the card like a right answer (FSRS Good) but does not count toward passing.
  - A take the parent rejects (✗) brings the card forward to be due today or tomorrow, and does not count.
- **Eligibility.** A word becomes eligible for Say once its Read rung (the `recognise` card) has passed. A Say card is created the first time the word is asked.
- **Can produce.** A character can be produced when its `write` card has passed (main's `passed`), or its Say rung has passed. A 词语's Say pass counts for the 词语, not for its characters.
- **Where "can produce" is counted:**
  - the parent's **Progress** tab, as new bars next to "reads (taps)";
  - the **end-of-lesson stars** and the "you can now …" line.
- **Where it is not counted:** the **worlds, town map and journey** keep counting what they count now (Read passed). Nothing he has unlocked regresses.
- **More honest taps.** Multiple-choice questions use **6 options** where at least 5 good distractors exist, otherwise 4. Main's too-fast-guess rule (`fastLimit`) stays.

## 4. The 15-minute lesson

- **Default length.** `DEFAULT_SETTINGS.sessionMinutes` becomes 15. A one-off settings migration (`lessonVersion` 6) changes 30 to 15 only when the stored value is exactly 30, the old default. Any other value the parent chose is kept.
- **Budget at 15 min:**

  | Step | Time | Rule |
  |---|---|---|
  | 认新字 | ~3 min | Unchanged: adaptive 3–8 words, two lanes |
  | 练一练 | 6 min box | `PRACTICE_SHARE` unchanged at 0.4 of the lesson |
  | 写一写 | ~4 min | `writeCharTarget(15)` = 5 characters. Other lengths keep their current values; for under 20 minutes the target is 5 |

- **Say cards in 练一练:**
  - **How many:** about one in three items, at most **6 per lesson**.
  - **Which words:** due Say cards first, then eligible words with no Say card yet. The newest Read pass comes first, and words in today's school lane are preferred.
  - **Ordering:** Say cards go into the round with the same spacing rules as other items. A word is never asked Say in the same lesson in which it was introduced.
  - **Off switch:** `settings.sayCards` (default true) turns them off. 练一练 is then as it is today.
- **The optional second lesson** is the existing 再学一课. It uses the same 15-minute plan, never touches the streak or the chest, and is offered softly on Home after the day's lesson (「想再学一课吗？」).
- **No timer pressure.** As now, the 练一练 box hands left-over items to tomorrow silently.

## 5. Truffle and rewards

- **While a question is open,** Truffle stays in a neutral resting pose. There is no peek, mood change or close-up until the answer is settled. His reactions move to the feedback moment, with the same cheers and comfort lines.
- **Removed from the lesson:** the combo flame counter, the spoken 「连对N个」 milestones and the combo sound.
- **Stars at the end of a lesson:**
  - **Stars** = the number of characters and words that newly reached "can produce" today, by write or say, with a minimum of 1.
  - **The line:** 「今天你会写 3 个新字，会说 2 个！」. When nothing passed today, it names what is closest instead: 「还差一天：森、林」.
  - Stars from the extra lesson keep going to `bonusStars`.
  - Costumes and powers keep using the star total.
- **The chest** stays once a day, for the first lesson.
- **The streak forgives one missed day per calendar week** (Mon–Sun). The forgiven day shows on the week strip as 休息日. A second missed day in the same week breaks the streak.

## 6. Parent area

- **New tab, 「Listen & confirm」**, with a badge showing the number of takes waiting.
  - Each row shows the word (character or 词语, with pinyin), a play button for his take, a play button for the model, and **✓ / ✗**.
  - Oldest first.
  - When more than 60 takes are waiting, only each word's newest unreviewed take is kept and older unreviewed duplicates are dropped.
- **Progress tab:** add 「会写 Can write」 and 「会说 Can say」 bars next to the existing reading bar, with the same end-of-year targets and class marker. Keep "reads (taps)".
- **Overview tab:** add a "takes to review" tile.
- **Settings:** add a 「Say cards」 switch.

## 7. Storage and existing data

- **Storage:** takes are stored like the other recordings, as a new `RecordingPrompt` kind `{ kind: 'say'; wordId: string }` with a `review?: 'ok' | 'no'` field. Reviewed takes older than 14 days are deleted, keeping each word's newest take. The existing recordings-count warning counts them.
- **No migration of cards or logs.** Say cards start empty.
- **Saved lessons** from before load as they are.
- The only one-off settings change is the 30 → 15 move.
- **Microphone denied or unavailable:** Say cards are skipped for that lesson, as 朗读 already handles a blocked microphone, and the Overview warning already covers it.

## 8. Testing

- **Unit tests:**
  - **Say rung:** passes on two confirmed days; an unreviewed take schedules but doesn't pass; ✗ brings the card forward.
  - **Eligibility and selection:** the cap of 6, about one in three, never on the day a word is introduced, and the off switch.
  - **Budgets:** `writeCharTarget(15)` = 5 and the migration only from exactly 30.
  - **Can produce:** stars count it, with the 1-star floor and the "closest" line.
  - **Rest day:** one forgiven day per week; a second missed day breaks the streak.
  - **6-option multiple choice**, with the fallback to 4.
- **Rendered tests:**
  - the Say card: record, model plays, one re-record, skipped when the microphone is denied;
  - the review queue: ✓ and ✗, and the badge count;
  - Truffle stays neutral while a question is open, and there is no combo counter;
  - the Progress bars.
- **WebKit:** screenshots of the Say card and the review queue at iPad sizes. Recording is checked on Safari with a fake microphone, because MediaRecorder differs there.

## 9. Out of scope

Sub-project 4: 朗读 on its own, word families, why-feedback and pinyin fading. Speech recognition. Changes to the worlds or town map. A parent switch for the story.
