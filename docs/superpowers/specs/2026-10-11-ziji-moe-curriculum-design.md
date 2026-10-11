# ZiJi lessons follow his class (欢乐伙伴2.0), story off — design

Date: 2026-10-11 (revised the same day after re-basing onto main) · Sub-project 1 of 4 in the lesson overhaul (2 production-based mastery, 3 shorter calmer lessons, 4 variety that teaches)

## 1. Why

The parent reports that lessons are not school-aligned, too tappy, too long and repetitive. They want to focus on the lesson for now, not the Word Thief story.

Main already orders new words by the 欢乐伙伴2.0 生字表 (`src/content/moe2024.json`, `schoolRank` in `src/content/index.ts`). It walks the book from 一上 upward, though. A P2 child who is behind therefore never meets this week's class characters. The app also writes either the 华文 list or the 高级华文 list, never both.

**Success:**
- The Word Thief story is out of the way.
- Each day's new words include characters from his class's current lesson and close his gaps from 一上 onward.
- 写一写 practises the write characters of both lists, in step with the class.
- Every listed character exists in the app.
- The parent sees progress against the lists, with where his class is and the gaps by term.

## 2. Decisions

| Question | Decision |
|---|---|
| Base | main. Keep its lesson parts: school order, Hear/Understand rungs, two-day "passed", and the opt-in recorded voice. Switch the story off |
| Tracks | Both 华文 and 高级华文. He recognises every listed character and writes the **union** of both write lists |
| Ordering for a child who is behind | **Two lanes** each day: his class's lesson, plus catch-up from 一上 |
| Knowing the class lesson | **Calendar estimate + parent correction** |
| Data | **Reuse main's `moe2024.json`** (`{term, lesson, read, write, writeHcl}`, 55 lessons, 一上–三下). No PDF parser and no rename. The committed PDFs in `scripts/moe/sources/` stay as provenance |
| Settings | Reuse main's `settings.grade` / `gradeYear` and `settings.course`. Add a course value for both tracks, and add `classLesson` |
| "Learned" | Main's `passed` (right first answers on two separate days), which is the same meaning as before |

## 3. Story off

- Add `Settings.storyOn?: boolean`, default `false`. `settings.story` is unrelated: it means the 看图说话 activity.
- When the flag is off:
  - no story setup before a lesson;
  - no payoff after the celebration;
  - no Word Thief painting behind the lesson.
- Put the guard in the story module's own entry points (`storyStep`, `lessonScene`), so the callers stay unchanged.
- Truffle, stars, chest, streak, the town map and the worlds don't depend on the story and stay.
- Story progress is kept, so turning the flag back on resumes where he was.
- No parent switch in this release (parked, like 朗读).

## 4. Curriculum positions and the class lesson

Add a pure module `src/content/curriculum.ts` over `moe2024.json`:

- **Book positions.** A lesson index is a position in the file's lesson order (0 = 一上 L1).
  - `taughtAt(ch)` is the first lesson whose `read` has the character.
  - `writeAt(ch, course)` is the first lesson whose write list has it. For the both-tracks course that means `write` or `writeHcl`.
- **Labels.** `lessonLabel(i)` returns 「二下·17」, and `lessonName(i)` returns 「二下 第十七课」.
- **Calendar.** `src/content/schoolCalendar.ts` holds the MOE term dates:
  - 2026: T1 2026-01-02–03-13, T2 03-23–05-29, T3 06-29–09-04, T4 09-14–11-20.
  - 2027: T1 2027-01-04–03-12, T2 03-22–05-28, T3 06-28–09-03, T4 09-13–11-19.
- **Semesters.** 上 terms are Semester I (T1–T2) and 下 terms are Semester II (T3–T4). The grade comes from main's `grade`/`gradeYear`, using main's existing rule for the current grade.
- **Estimate.** Spread the semester's lessons evenly over its teaching days, skipping the breaks. In holidays, use the last lesson of the semester just ended. Before T1, use the year's first lesson. For years or grades without data, the result is `null`.
- **Correction.** `settings.classLesson = { term, lesson, setAt } | null`. It carries forward at the calendar's pace and lapses at the next semester. `correctionApplies(now, settings)` reports whether it is in force.
- Main's crude `currentTerm()` (上 for Jan–May) is replaced by the curriculum's term wherever the Progress tab uses it.

## 5. Daily new words: two lanes

The day's count `n` is unchanged: adaptive pace 3–8, paused by the backlog.

1. **Front of the queue (unchanged):** words with `listedAt` (parent lists, 听写 marks, 朗读 misreads, school 成语) come first and use up `n`.
2. **School lane:** `ceil(remaining / 2)`, which is at least 1 whenever anything remains. It takes unstarted words from **the class lesson and the one before it**, in book order.
3. **Catch-up lane:** the rest, taken from the earliest unstarted lesson onward. Placement-known and begun words are already skipped, because they count as started.
4. **Spill-over:** if a lane runs short, the other lane takes the rest. When everything up to the class lesson is started, words come from later lessons in book order, then from non-book words in main's current order.
5. **Ladder 词语** (`w:` ids) keep main's gate: they come only once every one of their characters is begun. A ladder word's lesson is the latest lesson among its characters, and it rides the lane that lesson belongs to.
6. Nothing ahead of the class lesson is taken except by spill-over. Without a class lesson (`null`), only catch-up runs.
7. The plan records each new word's lane in `SessionPlan.newWordLanes?: Record<wordId, 'school' | 'catchup'>`. It is optional, so saved sessions still load.

## 6. Both tracks and writing

- Add a course value for both tracks, labelled 「华文 + 高级华文」. A book character is writeable when it is on either write list.
- Make it the default.
- Move existing installs to it once, through main's one-off settings migration (`lessonVersion`), since the parent asked for both. The parent can still choose a single track in Settings.
- 写一写's last fallback ("characters he reads at his level") uses the book for book characters: `writeAt ≤ class lesson`. Other characters keep the HSK level rule.
- Writeability only grows. Characters with write cards keep them.

## 7. Content fixes

1. **Add the missing characters.** 蚂 蚁 拇 狐 狸 are on the list but missing from `builtin.json`, so the app never shows them. Add them through the content build, using the same sources as the rest. Add a check that fails if any listed character is missing from the built-in content.
2. **Example words he can read.** When choosing a built-in character's 组词, prefer words whose other characters are taught at or before it. Fall back to the current choice otherwise. Hand-written examples (`extraExamples.ts`) still come first. Bump `CONTENT_VERSION` and update its pinned hash.

## 8. Parent area

- **Settings:** next to Grade and Course, show 「Class is on: 二下 第十七课 (估计)」, or 「(你在10月11日设定)」 when a correction applies. Add a lesson picker covering the grade's two terms, a Set button and "Use the estimate".
- **Progress tab:**
  - Targets become the end of his grade, for both 认读 and the course's write list (the union for both tracks).
  - Add a marker on each bar for where his class is now.
  - Add a per-term table, 一上 … the grade's 下: still to read and still to write.
  - "Learned" stays main's `passed`.

## 9. Child-facing

The 认新字 card shows a small label: 「课本 二下·17」 for the school lane, 「补 一上·5」 for catch-up and spill-over. Words at the front of the queue, ladder words without a book lesson, and saved sessions without lanes show none.

## 10. Testing

- **Curriculum:** positions, labels, both-track write positions, and estimates on dates in each term and in holidays. Also: 2026-10-11 gives 二下·17, 2027-01-06 gives 三上·1, the correction carries and lapses, and years outside the calendar give `null`.
- **Lanes:**
  - the split for n = 1–8;
  - the front of the queue first;
  - spill-over both ways;
  - nothing ahead of the class;
  - `null` class means catch-up only;
  - ladder-word gating and lanes;
  - no duplicates, and fewer than `n` when the pool runs out.
- **Plan:** integration with main's existing plan tests. Update expectations only where book or lane order legitimately changes them.
- **Story off:** no setup, no payoff and no painting by default; the flag on restores them.
- **Content:** every listed character is in `builtin.json`; the readable-组词 preference holds.
- **Settings, Progress and the card label:** rendered tests, plus screenshots in **WebKit** (playwright-core), not only Chromium.

## 11. Out of scope

Production-only mastery and lesson length or reward changes (sub-projects 2 and 3). 朗读, word families, feedback and pinyin fading (4). P4–P6 lists. A parent switch for the story. Recorded-voice clips for the 5 new characters (the recorded voice is opt-in, and lines without a clip use the iPad voice).
