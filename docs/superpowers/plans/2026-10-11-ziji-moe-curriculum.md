# Lessons follow his class (欢乐伙伴2.0), story off — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the Word Thief story off, and make each day's new words, 写一写 and the parent's Progress tab follow the lesson his class is on in 《欢乐伙伴2.0》, for both 华文 and 高级华文, with the 5 missing listed characters added.

**Architecture:** A pure module `src/content/curriculum.ts` (over the existing `moe2024.json`) and a calendar `src/content/schoolCalendar.ts` turn the date, his school year and an optional parent correction into a lesson index. `src/session/lanes.ts` picks the day's new words in two lanes around that index, and `plan.ts` uses it while keeping main's ladder gate. Writing, Settings, Progress and the 认新字 card read the same positions. The content build adds the textbook characters HSK lacks and puts 组词 he can read first.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, tsx scripts, playwright-core 1.52 WebKit for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-11-ziji-moe-curriculum-design.md` (read it in full before Task 1).

## Global Constraints

- Story flag: `Settings.storyOn?: boolean`, default `false` (absent = off). `settings.story` is the unrelated 看图说话 switch. No parent switch for the story in this release. Story progress is kept.
- Lesson index: a position in `src/content/moe2024.json`'s `lessons` order, `0` = 一上 L1, `35` = 二下 L17, `54` = 三下 L17 (55 lessons).
- Labels: `lessonLabel(i)` → `二下·17`; `lessonName(i)` → `二下 第十七课`.
- Term dates (inclusive): 2026 T1 2026-01-02–03-13, T2 03-23–05-29, T3 06-29–09-04, T4 09-14–11-20; 2027 T1 2027-01-04–03-12, T2 03-22–05-28, T3 06-28–09-03, T4 09-13–11-19. Semester I = T1–T2 (上 books), Semester II = T3–T4 (下 books).
- 2026-10-11 estimates to 二下·17 for a P2 child; 2027-01-06 to 三上·1. Years or school years without data give `null`.
- Correction: `settings.classLesson = { term, lesson, setAt } | null`; carries forward at the calendar's pace; lapses at the next semester.
- Lanes: listed words (`listedAt`) first; then school lane `ceil(remaining / 2)` from the class lesson and the one before it; catch-up gets the rest from the earliest unstarted lesson; a short lane gives its share to the other; then later lessons, then non-book words. `null` class lesson: catch-up only. `SessionPlan.newWordLanes?: Record<wordId, 'school' | 'catchup'>` (optional).
- Course: new value `'both'`, labelled `华文 + 高级华文`, the default (`courseOf(s) = s.course ?? 'both'`); existing installs move to it once via `lessonVersion` 5.
- 认新字 label: `课本 二下·17` (school lane), `补 一上·5` (catch-up and spill-over); none for listed words, ladder words without a book lesson, and saved sessions without lanes.
- Settings text: `Class is on: 二下 第十七课 (估计)`, or `(你在10月11日设定)` while a correction applies; buttons `Set` and `Use the estimate`.
- Missing characters: 蚂 蚁 拇 狐 狸. `CONTENT_VERSION` goes from `.10` to `.11`, with its pinned hash updated.
- "Learned" is main's `passed` (right first answers on two separate days).
- TypeScript lib is ES2022: no `Array.prototype.findLastIndex`/`toSorted`. `Array.prototype.at` is fine.
- Screenshots in **WebKit** via playwright-core (`scripts/fit-check.ts`), not only Chromium. If WebKit is missing the script exits 2: stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Out of scope: production-only mastery, lesson length/rewards, 朗读, P4–P6 lists, a story switch, recorded-voice clips for the 5 new characters.

## Rulings

- Ruling: the story guard is a trailing optional `storyOn` argument on `storyStep` and `lessonScene` (absent = off), and the three callers pass `settings.storyOn` — the functions get the story progress, not settings, so the flag has to reach them somehow, and this keeps the guard in the story module as the spec asks — cost if wrong: one argument at three call sites to move.
- Ruling: "teaching days" are the calendar days inside the terms (weekends and public holidays included, breaks between terms excluded) — this is what gives the spec's own figures (136 days in Semester II 2026, 96 by 10-11) — cost if wrong: the estimate can sit up to about one lesson off near a long weekend, and the parent can correct it.
- Ruling: a correction moves on by `floor(days since it was set × lessons in the semester ÷ the semester's days)`, is capped at his school year's last lesson, and lapses when `semesterAt` changes (a holiday belongs to the semester before it, so a June correction lapses when Term 3 starts) — the spec only says "carries forward at the calendar's pace and lapses at the next semester" — cost if wrong: a correction set in a holiday lasts until the next term begins.
- Ruling: lanes are recorded only for words with a book lesson; spill-over past the class lesson is recorded as `'catchup'` (so it shows 补); non-book words get no lane — spec §9 groups spill-over with catch-up and gives non-book words no label — cost if wrong: labels on spill-over words read 补 rather than 课本.
- Ruling: the day's new words come out in book order (listed words first), not school lane first — a ladder 词语 then always follows its characters, and the card order stays gentle (earlier lessons first) — cost if wrong: the class's words appear later in 认新字.
- Ruling: changing the school year in Settings clears the correction — a lesson from another year's book is meaningless for the new year — cost if wrong: the parent sets the lesson again.
- Ruling: with no class lesson (`null`), 写一写's fallback uses the HSK level rule for every character; the book rule applies only to characters that have a write position in the course — the spec defines the book rule relative to the class lesson only, and test fixtures mark non-listed book characters writeable — cost if wrong: in a year without calendar dates, book characters are offered for writing by HSK level.
- Ruling: a word with a write card stays in 写一写 (due reviews) even when its course no longer makes it writeable — spec §6 "Characters with write cards keep them" — cost if wrong: switching to 华文 keeps reviewing 高级华文 characters he already writes.
- Ruling: the `lessonVersion` 5 migration moves **every** existing install to `'both'`, including a parent's earlier 华文 or 高级华文 choice; `bootstrap` now runs the settings migration before deciding whether to rewrite the built-in words — the spec says to move existing installs once because the parent asked for both tracks, and the words must be rewritten for the new course on that same launch — cost if wrong: a parent who wanted a single track picks it again in Settings.
- Ruling: `builtinWords(now, course = 'cl')` keeps its internal default; app code always passes `courseOf(settings)` — changing the default would churn unrelated tests that build words without a course — cost if wrong: none for the app; a future caller that omits the course gets 华文.
- Ruling: "readable 组词" = an HSK 1–3 word that has another character and whose other characters are all taught at or before the character's lesson; up to 3 of them go first, then the current picks that aren't among them (so a card has up to 6). Nothing a card had is dropped — measured on the real data: preferring any readable HSK word (and dropping the old picks) changed 471 characters, removed 177 ladder 词语 a child may have begun and broke the 65 % sentence coverage of 一上/二上/二下; this rule changes 222 characters, drops nothing and keeps every test green — cost if wrong: cards show more 组词 than before.
- Ruling: the 5 new characters get `level` = the grade of their term (蚂 蚁 二上 → 2; 拇 狐 狸 三下 → 3), ranks after every HSK character (3000–3004), and a new optional `BuiltinChar.school: true`; the content check counts HSK levels without them — a level 7 would make `learnerLevel` jump to 7 when one of them is next — cost if wrong: their level is only used for non-book fallbacks.
- Ruling: `scripts/build-glossary.ts` keeps every existing gloss and only adds missing phrases — today's CC-CEDICT changes 14 existing glosses — cost if wrong: none; a deliberate gloss refresh needs its own change.
- Ruling: placement's `rankBands` folds a tail shorter than half a band into the band before it (3005 characters → 30 bands, the last 105) — a 5-character 31st band would add a placement band of the hardest characters — cost if wrong: the last band is 5 % longer.
- Ruling: Progress counts "recognised" and "written" as list characters when a target exists (non-book characters he reads are not counted against the list), and "written" counts characters, not write cards — the spec's targets are the book's lists — cost if wrong: the numbers are lower than main's for a child who reads many non-book characters.
- Ruling: the WebKit run adds screenshot-only shots for the parent's Settings and Progress (the parent area scrolls and isn't held to the child screens' fit rules); the 认新字 label is fit-checked by the existing `newwords` flow — cost if wrong: a parent-screen layout problem shows only in the screenshots.
- Ruling: the WenKai font subset is rebuilt (`npm run font`) — the committed `public/fonts/wenkai.woff2` lacks 蚂 蚁 拇 狐 狸 (checked with harfbuzzjs) — cost if wrong: the 5 characters render in the iPad's fallback font.

## Review Focus

1. The school calendar runs out (any date in 2028 — no dates in `schoolCalendar.ts`): new words keep coming (catch-up only), 写一写 falls back to the level rule, and Settings says the calendar is missing rather than "no MOE list" — tests in Task 5 (plan in 2028) and Task 7 (Settings message).
2. An existing iPad on 华文 or 高级华文 launches the new version: it moves to both tracks once, its built-in words are rewritten for them on that same launch, and a later parent choice of one track sticks — test in Task 3 (`bootstrap`).
3. A lesson saved before the update is resumed (its plan has no `newWordLanes`): 认新字 shows no label and nothing breaks — test in Task 9.
4. Late at night or just after midnight: the estimate counts his local calendar day, not UTC — test in Task 2 (`teachingDays` at 23:59 and 00:01 around a term boundary).
5. A word the parent listed (or a 听写 mark) that is a book character: it comes first, takes a slot from `n`, and has no lane and no label — test in Task 5 (`pickNewWords`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/story/progress.ts`, `src/story/lessonScene.ts` | story entry points, guarded by `storyOn` | 1 |
| `src/app/HomeScreen.tsx`, `src/app/Celebration.tsx`, `src/app/SessionScreen.tsx` | pass `settings.storyOn`; the card label (SessionScreen) | 1, 9 |
| `src/content/schoolCalendar.ts` (new) | MOE term dates, semesters, school days | 2 |
| `src/content/curriculum.ts` (new) | book positions, labels, school year, estimate, correction, list sizes, `courseOf` | 2 |
| `src/content/index.ts` | `Course` gains `'both'`; write lists; `CONTENT_VERSION` | 2, 4 |
| `src/types.ts` | `storyOn`, `ClassLessonSetting`, `classLesson`, course union, `lessonVersion` 5, `newWordLanes`, `BuiltinChar.school` | 1–5 |
| `src/store/settings.ts`, `src/bootstrap.ts` | v5 migration to both tracks; migrate before seeding | 3 |
| `scripts/content-lib.ts`, `scripts/build-content.ts`, `scripts/check-content.ts`, `scripts/build-glossary.ts` | add school characters, readable 组词, listed-character check, keep glosses | 4 |
| `src/content/extraExamples.ts`, `src/content/builtin.json`, `src/content/glossary.json`, `public/fonts/wenkai.woff2` | content for the 5 characters | 4 |
| `src/placement/walk.ts` | fold the short last band | 4 |
| `src/session/lanes.ts` (new), `src/session/plan.ts` | two lanes, book positions of words, the card label text | 5, 6 |
| `src/session/writing.ts` | book rule for the last fallback; write cards keep words | 6 |
| `src/parent/ClassLessonField.tsx` (new), `src/parent/SettingsPanel.tsx` | class lesson field, course option | 3, 7 |
| `src/parent/ProgressPanel.tsx`, `src/parent/progress.ts` | grade-end targets, bars with class marker, per-term table; `currentTerm` removed | 2, 8 |
| `src/activities/flashcards/FlashcardStep.tsx`, `src/styles.css` | `lessonTag` on the intro card; styles | 8, 9 |
| `scripts/fit-check.ts` | parent screenshots in WebKit | 10 |

---

### Task 1: Story off by default

**Files:**
- Modify: `src/types.ts` (Settings, near `storyProgress` line 259)
- Modify: `src/story/progress.ts:5-11`, `src/story/lessonScene.ts:6-7`
- Modify: `src/app/HomeScreen.tsx:168`, `src/app/Celebration.tsx:128`, `src/app/SessionScreen.tsx:87`
- Test: `src/story/progress.test.ts`, `src/story/lessonScene.test.ts`, `src/app/home.test.tsx`, `src/app/celebration.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Settings.storyOn?: boolean`; `storyStep(p: StoryProgress | undefined, chapterCount: number, today: string, storyOn?: boolean): { part: 'setup' | 'payoff'; chapter: number } | null`; `lessonScene(p: StoryProgress | undefined, chapters: Chapter[], storyOn?: boolean): string | null`. Absent/false `storyOn` → `null`.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/story/progress.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { markPayoff, markSetup, storyStep } from './progress';

describe('story progress (spec 3c §3)', () => {
  it('the first chapter is due on the first day', () => {
    expect(storyStep(undefined, 3, '2026-10-07', true)).toEqual({ part: 'setup', chapter: 1 });
  });
  it('after the setup, the payoff is owed; after the payoff, nothing more today', () => {
    const s = markSetup(undefined, 1, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-07', true)).toEqual({ part: 'payoff', chapter: 1 });
    const p = markPayoff(s, 1);
    expect(p.chapter).toBe(1);
    expect(storyStep(p, 3, '2026-10-07', true)).toBeNull(); // one new chapter a day
    expect(storyStep(p, 3, '2026-10-08', true)).toEqual({ part: 'setup', chapter: 2 });
  });
  it('an owed payoff comes before a new chapter, even the next day', () => {
    const s = markSetup({ chapter: 1 }, 2, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-08', true)).toEqual({ part: 'payoff', chapter: 2 });
  });
  it('no chapters left: no story', () => {
    expect(storyStep({ chapter: 3 }, 3, '2026-10-09', true)).toBeNull();
  });
});

describe('the story is off unless switched on (spec 2026-10-11 §3)', () => {
  it('no setup and no payoff by default; his progress is kept for when it comes back', () => {
    const owed = markSetup(undefined, 1, '2026-10-07');
    expect(storyStep(undefined, 3, '2026-10-07')).toBeNull();
    expect(storyStep(owed, 3, '2026-10-08')).toBeNull();
    expect(storyStep(owed, 3, '2026-10-08', false)).toBeNull();
    expect(storyStep(owed, 3, '2026-10-08', true)).toEqual({ part: 'payoff', chapter: 1 }); // on again: where he was
  });
});
```

In `src/story/lessonScene.test.ts`, replace the `describe('the painting behind the lesson', …)` block with:

```ts
describe('the painting behind the lesson', () => {
  it("is where today's setup ended while its payoff is owed", () => {
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: false }, chapters, true)).toBe('hdb-voiddeck');
  });
  it('is where the last finished chapter ended on an extra lesson', () => {
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: true }, chapters, true)).toBe('hdb-night');
  });
  it('is none before any chapter (the old world shows)', () => {
    expect(lessonScene(undefined, chapters, true)).toBeNull();
    expect(lessonScene({ chapter: 0 }, chapters, true)).toBeNull();
  });
  it('is none while the story is off, the default (spec 2026-10-11 §3)', () => {
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: true }, chapters)).toBeNull();
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: true }, chapters, false)).toBeNull();
  });
});
```

In `src/app/home.test.tsx`, replace the test `'with a chapter due, 开始 opens its setup first, then the lesson (spec 3c §5)'` with these two tests:

```ts
  it('with the story on and a chapter due, 开始 opens its setup first, then the lesson (spec 3c §5)', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true, storyOn: true } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(screen.getByRole('button', { name: '开始：认新字' }));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'story', part: 'setup', chapter: 1, then: { name: 'session', free: false } }));
  });
  it('the story is off by default: 开始 goes straight to the lesson (spec 2026-10-11 §3)', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(screen.getByRole('button', { name: '开始：认新字' }));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
    expect(app.go).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'story' }));
  });
```

In `src/app/celebration.test.tsx`, inside `describe('the story after the celebration (spec 3c §5)', …)`, change the first test's settings line from

```ts
    await updateSettings(app.db, { storyProgress: { chapter: 0, readOn: '2026-10-02', setupDone: true, payoffDone: false } });
```

to

```ts
    await updateSettings(app.db, { storyOn: true, storyProgress: { chapter: 0, readOn: '2026-10-02', setupDone: true, payoffDone: false } });
```

and add this test after `'nothing owed: home as before'`:

```ts
  it('with the story off (the default), an owed payoff waits and he goes home (spec 2026-10-11 §3)', async () => {
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    await updateSettings(app.db, { storyProgress: { chapter: 0, readOn: '2026-10-02', setupDone: true, payoffDone: false } });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    await toEnd();
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
    expect(app.go).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'story' }));
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/story/progress.test.ts src/story/lessonScene.test.ts src/app/home.test.tsx src/app/celebration.test.tsx`
Expected: FAIL — "the story is off unless switched on" (storyStep returns a setup), "is none while the story is off" (returns `'hdb-night'`), "the story is off by default" (go called with `name: 'story'`), and "with the story off (the default)…" (go called with the payoff route). The tests passing `true` pass already.

- [ ] **Step 3: Implement**

`src/types.ts` — directly after the `storyProgress?: …` line in `Settings`, add:

```ts
  storyOn?: boolean; // the Word Thief story around lessons (spec 2026-10-11 §3): off unless true; no parent switch yet. Not `story` (看图说话)
```

`src/story/progress.ts` — replace the `storyStep` function with:

```ts
/** The chapter part owed today; none while the story is off (spec 2026-10-11 §3: off by default, his progress kept). */
export function storyStep(p: StoryProgress | undefined, chapterCount: number, today: string, storyOn = false): { part: 'setup' | 'payoff'; chapter: number } | null {
  if (!storyOn) return null;
  const s = p ?? NO_STORY;
  const next = s.chapter + 1;
  if (s.setupDone && !s.payoffDone) return next <= chapterCount ? { part: 'payoff', chapter: next } : null;
  if (s.readOn === today) return null;
  return next <= chapterCount ? { part: 'setup', chapter: next } : null;
}
```

`src/story/lessonScene.ts` — replace the first two lines of the function:

```ts
export function lessonScene(p: StoryProgress | undefined, chapters: Chapter[]): string | null {
  const s = p ?? NO_STORY;
```

with

```ts
export function lessonScene(p: StoryProgress | undefined, chapters: Chapter[], storyOn = false): string | null {
  if (!storyOn) return null; // the story is off (spec 2026-10-11 §3): the old world shows behind the lesson
  const s = p ?? NO_STORY;
```

`src/app/HomeScreen.tsx:168` — replace

```ts
    const owed = free || todaySession ? null : storyStep(settings.storyProgress, CHAPTERS.length, localDateKey(now()));
```

with

```ts
    const owed = free || todaySession ? null : storyStep(settings.storyProgress, CHAPTERS.length, localDateKey(now()), settings.storyOn);
```

`src/app/Celebration.tsx:128` — replace

```ts
      const owed = storyStep((await getSettings(db)).storyProgress, CHAPTERS.length, localDateKey(new Date(`${rec.date}T12:00:00`))); // an owed payoff is owed on any day
```

with

```ts
      const stored = await getSettings(db);
      const owed = storyStep(stored.storyProgress, CHAPTERS.length, localDateKey(new Date(`${rec.date}T12:00:00`)), stored.storyOn); // an owed payoff is owed on any day
```

`src/app/SessionScreen.tsx:87` — replace

```ts
  const painted = lessonScene(appSettings.storyProgress, CHAPTERS); // the chapter's place, over the old world
```

with

```ts
  const painted = lessonScene(appSettings.storyProgress, CHAPTERS, appSettings.storyOn); // the chapter's place, over the old world (story on only)
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/story src/app/home.test.tsx src/app/celebration.test.tsx`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/story/progress.ts src/story/lessonScene.ts src/story/progress.test.ts src/story/lessonScene.test.ts src/app/HomeScreen.tsx src/app/Celebration.tsx src/app/SessionScreen.tsx src/app/home.test.tsx src/app/celebration.test.tsx
git commit -m "feat: the Word Thief story is off unless settings.storyOn (no setup, payoff or painting)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Curriculum positions, school calendar, class lesson

**Files:**
- Create: `src/content/schoolCalendar.ts`, `src/content/curriculum.ts`, `src/content/curriculum.test.ts`
- Modify: `src/content/index.ts:49-64` (Course, MOE_WRITE, moeTargets)
- Modify: `src/types.ts` (Settings: `classLesson`; new `ClassLessonSetting`)
- Modify: `src/parent/progress.ts:7-13` (schoolYear moves to curriculum, re-exported)
- Test: `src/content/curriculum.test.ts`, `src/content/moeTargets.test.ts`

**Interfaces:**
- Consumes: `moe2024.json` (`{ lessons: { term, lesson, read, write, writeHcl }[] }`).
- Produces (`src/content/schoolCalendar.ts`): `type TermDates`; `SCHOOL_TERMS`; `interface Semester { year: number; half: 1 | 2 }`; `dayNumber(d: Date): number`; `yearStart(year: number): number | null`; `semesterAt(now: Date): Semester | null`; `teachingDays(sem: Semester, now: Date): { done: number; total: number }`.
- Produces (`src/content/curriculum.ts`): `interface MoeLesson`; `LESSONS: readonly MoeLesson[]`; `DEFAULT_COURSE: Course` (= `'both'`); `courseOf(s: { course?: Course }): Course`; `writeList(l: MoeLesson, course: Course): string`; `taughtAt(ch: string): number | undefined`; `writeAt(ch: string, course: Course): number | undefined`; `zhNumber(n: number): string`; `lessonLabel(i: number): string`; `lessonName(i: number): string`; `lessonIndex(term: string, lesson: number): number | undefined`; `termLessons(term: string): number[]`; `gradeTerms(grade: number): [string, string]`; `schoolYear(s: { grade?: number; gradeYear?: number }, now: Date): number`; `estimateLesson(now: Date, grade: number): number | null`; `correctionApplies(now: Date, s: ClassSettings): boolean`; `classLessonAt(now: Date, s: ClassSettings): number | null`; `listedBy(upTo: number, course: Course): { read: Set<string>; write: Set<string> }`; `termChars(term: string, course: Course): { read: string[]; write: string[] }`, where `ClassSettings = Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>`.
- Produces (`src/content/index.ts`): `type Course = 'cl' | 'hcl' | 'both'`; `moeTargets(term, 'both')` = union of both write lists.
- Produces (`src/types.ts`): `interface ClassLessonSetting { term: string; lesson: number; setAt: number }`; `Settings.classLesson?: ClassLessonSetting | null`.

- [ ] **Step 1: Write the failing tests**

Create `src/content/curriculum.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  classLessonAt, correctionApplies, courseOf, estimateLesson, lessonIndex, lessonLabel, lessonName, listedBy, schoolYear, taughtAt,
  termChars, termLessons, writeAt, zhNumber,
} from './curriculum';
import { semesterAt, teachingDays } from './schoolCalendar';

const day = (s: string) => new Date(`${s}T09:00:00`); // local time: the estimate counts his calendar day
const P2 = { grade: 2, gradeYear: 2026 };
const at = (s: string, set: Parameters<typeof classLessonAt>[1] = P2) => { const i = classLessonAt(day(s), set); return i === null ? null : lessonLabel(i); };

describe('book positions (spec 2026-10-11 §4)', () => {
  it('a lesson index is a place in the book: 0 is 一上 L1, 35 is 二下 L17', () => {
    expect(lessonIndex('一上', 1)).toBe(0);
    expect(lessonIndex('二下', 17)).toBe(35);
    expect(lessonIndex('二下', 40)).toBeUndefined();
    expect(termLessons('二下')).toEqual([29, 30, 31, 32, 33, 34, 35, 36, 37]);
    expect(termLessons('四上')).toEqual([]);
  });
  it('taughtAt is the first lesson that reads a character; writeAt the first that writes it in the course', () => {
    expect(taughtAt('门')).toBe(7);
    expect(taughtAt('介')).toBeUndefined();
    expect(writeAt('井', 'cl')).toBeUndefined(); // 华文 only reads it
    expect(writeAt('井', 'hcl')).toBe(8);
    expect(writeAt('怎', 'cl')).toBe(43);
    expect(writeAt('怎', 'hcl')).toBe(47);
    expect(writeAt('怎', 'both')).toBe(43); // both lists: whichever writes it first
    expect(writeAt('井', 'both')).toBe(8);
  });
  it('labels: 「二下·17」 and 「二下 第十七课」', () => {
    expect(lessonLabel(35)).toBe('二下·17');
    expect(lessonName(35)).toBe('二下 第十七课');
    expect(lessonName(9)).toBe('一上 第十课');
    expect([zhNumber(1), zhNumber(9), zhNumber(10), zhNumber(17), zhNumber(20)]).toEqual(['一', '九', '十', '十七', '二十']);
  });
  it('both tracks is the default course', () => {
    expect(courseOf({})).toBe('both');
    expect(courseOf({ course: 'cl' })).toBe('cl');
  });
  it('lists to date: P2 reads 746 by the end of 二下; both tracks write 435; 707 and 413 by 二下·17', () => {
    expect(listedBy(37, 'cl').read.size).toBe(746);
    expect(listedBy(37, 'cl').write.size).toBe(350);
    expect(listedBy(37, 'both').write.size).toBe(435);
    expect(listedBy(35, 'both').read.size).toBe(707);
    expect(listedBy(35, 'both').write.size).toBe(413);
  });
  it("a term's own characters: first read, and first written, in it", () => {
    const t = termChars('一上', 'both');
    expect([t.read.length, t.write.length]).toEqual([182, 90]);
    expect(t.read).toContain('门');
    expect(termChars('一下', 'both').read).not.toContain('门');
  });
});

describe('the MOE calendar', () => {
  it('semesters: Terms 1–2 are I, Terms 3–4 are II; a holiday belongs to the semester before it', () => {
    expect(semesterAt(day('2026-02-02'))).toEqual({ year: 2026, half: 1 });
    expect(semesterAt(day('2026-06-15'))).toEqual({ year: 2026, half: 1 });
    expect(semesterAt(day('2026-06-29'))).toEqual({ year: 2026, half: 2 });
    expect(semesterAt(day('2027-01-02'))).toEqual({ year: 2026, half: 2 }); // before 2027's Term 1
    expect(semesterAt(day('2028-03-01'))).toBeNull();
  });
  it('school days: Semester II 2026 has 136, and 96 have gone by 11 October (the September break not counted)', () => {
    expect(teachingDays({ year: 2026, half: 2 }, day('2026-10-11'))).toEqual({ done: 96, total: 136 });
    expect(teachingDays({ year: 2026, half: 2 }, day('2026-09-10'))).toEqual({ done: 68, total: 136 });
    expect(teachingDays({ year: 2026, half: 1 }, day('2026-12-01'))).toEqual({ done: 139, total: 139 });
  });
  it('a day is his local calendar day: late on a term\'s last day counts it, just after midnight counts the next (review focus 4)', () => {
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 4, 23, 59)).done).toBe(68); // Term 3's last day
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 13, 23, 59)).done).toBe(68); // the September break
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 14, 0, 1)).done).toBe(69); // Term 4's first day
  });
});

describe("his class's lesson by the calendar", () => {
  it('2026-10-11 is 二下·17 for a P2 child', () => {
    expect(at('2026-10-11')).toBe('二下·17');
    expect(estimateLesson(day('2026-10-11'), 2)).toBe(35);
  });
  it('every term, and the breaks between them', () => {
    expect(at('2026-02-02')).toBe('二上·3'); // Term 1
    expect(at('2026-03-18')).toBe('二上·6'); // March break: where Term 1 ended
    expect(at('2026-05-01')).toBe('二上·8'); // Term 2
    expect(at('2026-08-03')).toBe('二下·13'); // Term 3
    expect(at('2026-09-10')).toBe('二下·15'); // September break
  });
  it("holidays keep the last lesson of the semester just ended; before Term 1, the year's first lesson", () => {
    expect(at('2026-06-15')).toBe('二上·10');
    expect(at('2026-12-01')).toBe('二下·19');
    expect(at('2026-01-01')).toBe('二上·1');
  });
  it('a new year is a new school year: 2027-01-06 is 三上·1', () => {
    expect(schoolYear(P2, day('2027-01-06'))).toBe(3);
    expect(at('2027-01-06')).toBe('三上·1');
  });
  it('none for a year outside the calendar or a school year past the lists', () => {
    expect(at('2028-03-01')).toBeNull();
    expect(at('2026-10-11', { grade: 4, gradeYear: 2026 })).toBeNull();
    expect(at('2026-10-11', { grade: 3, gradeYear: 2026 })).toBe('三下·15');
  });
});

describe("the parent's correction", () => {
  const set = (term: string, lesson: number, on: string) => ({ ...P2, classLesson: { term, lesson, setAt: day(on).getTime() } });
  it('applies from the day it is set, and moves on at the calendar’s pace (9 lessons over 136 days)', () => {
    const s = set('二下', 15, '2026-10-11');
    expect(correctionApplies(day('2026-10-11'), s)).toBe(true);
    expect(at('2026-10-11', s)).toBe('二下·15');
    expect(at('2026-10-25', s)).toBe('二下·15'); // 14 days: not yet a lesson
    expect(at('2026-10-27', s)).toBe('二下·16'); // 16 days
    expect(at('2026-12-01', s)).toBe('二下·17'); // the holiday: where the term ended
  });
  it('a lesson from the other book of his year carries on into this one', () => {
    expect(at('2026-12-01', set('二上', 9, '2026-10-11'))).toBe('二下·11');
  });
  it('lapses at the next semester: the calendar again', () => {
    const s = set('二下', 15, '2026-10-11');
    expect(correctionApplies(day('2027-01-06'), s)).toBe(false);
    expect(at('2027-01-06', s)).toBe('三上·1');
  });
  it('none set, or a lesson the book does not have: the estimate', () => {
    expect(correctionApplies(day('2026-10-11'), { ...P2, classLesson: null })).toBe(false);
    expect(at('2026-10-11', set('二下', 40, '2026-10-11'))).toBe('二下·17');
  });
});
```

In `src/content/moeTargets.test.ts`, add inside the `describe`:

```ts
  it('both tracks write every character on either list (spec 2026-10-11 §6)', () => {
    expect(moeTargets('二下', 'both')).toEqual({ read: 746, write: 435 });
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/content/curriculum.test.ts src/content/moeTargets.test.ts`
Expected: FAIL — `curriculum.test.ts` cannot resolve `./curriculum`; the moeTargets `'both'` test gets `write: 350` (the `cl` branch).

- [ ] **Step 3: Implement**

Create `src/content/schoolCalendar.ts`:

```ts
// MOE school terms (spec 2026-10-11 §4): Semester I is Terms 1–2 (the 上 books), Semester II is Terms 3–4 (the 下 books).
// Dates are inclusive; the March and September breaks and the holidays fall between them. Add a year's dates when MOE publishes them.

/** A term's first and last school day, 'YYYY-MM-DD'. */
export type TermDates = readonly [start: string, end: string];

export const SCHOOL_TERMS: Readonly<Record<number, readonly [TermDates, TermDates, TermDates, TermDates]>> = {
  2026: [['2026-01-02', '2026-03-13'], ['2026-03-23', '2026-05-29'], ['2026-06-29', '2026-09-04'], ['2026-09-14', '2026-11-20']],
  2027: [['2027-01-04', '2027-03-12'], ['2027-03-22', '2027-05-28'], ['2027-06-28', '2027-09-03'], ['2027-09-13', '2027-11-19']],
};

export interface Semester { year: number; half: 1 | 2 }

const DAY = 86_400_000;
/** A calendar day as a whole number (time of day and time zone don't matter). */
export const dayNumber = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
const keyDay = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / DAY;
};

/** The day Term 1 starts in `year`, or null when the calendar doesn't have the year. */
export function yearStart(year: number): number | null {
  const t = SCHOOL_TERMS[year];
  return t ? keyDay(t[0][0]) : null;
}

/** The semester in progress or most recently begun (a holiday belongs to the semester before it); null outside the calendar. */
export function semesterAt(now: Date): Semester | null {
  const y = now.getFullYear();
  const t = SCHOOL_TERMS[y];
  if (!t) return null;
  const d = dayNumber(now);
  if (d < keyDay(t[0][0])) return SCHOOL_TERMS[y - 1] ? { year: y - 1, half: 2 } : null;
  return { year: y, half: d < keyDay(t[2][0]) ? 1 : 2 };
}

/** A semester's school days (its two terms, not the break between), and how many have gone by the end of `now`'s day. */
export function teachingDays(sem: Semester, now: Date): { done: number; total: number } {
  const t = SCHOOL_TERMS[sem.year];
  if (!t) return { done: 0, total: 0 };
  const d = dayNumber(now);
  let done = 0;
  let total = 0;
  for (const [start, end] of sem.half === 1 ? [t[0], t[1]] : [t[2], t[3]]) {
    const len = keyDay(end) - keyDay(start) + 1;
    total += len;
    done += Math.min(len, Math.max(0, d - keyDay(start) + 1));
  }
  return { done, total };
}
```

Create `src/content/curriculum.ts`:

```ts
// His textbook 《欢乐伙伴2.0》 as positions (spec 2026-10-11 §4): a lesson index is a place in moe2024.json's lesson order
// (0 = 一上 L1). Where a character is first read and first written, and which lesson his class is on today.
import moe from './moe2024.json';
import type { Course } from './index';
import type { Settings } from '../types';
import { dayNumber, semesterAt, teachingDays, yearStart } from './schoolCalendar';

export interface MoeLesson { term: string; lesson: number; read: string; write: string; writeHcl: string }
export const LESSONS: readonly MoeLesson[] = (moe as { lessons: MoeLesson[] }).lessons;

/** The course his lessons follow when the parent hasn't chosen: both lists (parent, 2026-10-11). */
export const DEFAULT_COURSE: Course = 'both';
export const courseOf = (s: { course?: Course }): Course => s.course ?? DEFAULT_COURSE;

/** A lesson's characters to write in a course: 华文's, 高级华文's, or both lists'. */
export const writeList = (l: MoeLesson, course: Course): string => (course === 'cl' ? l.write : course === 'hcl' ? l.writeHcl : l.write + l.writeHcl);

const firstAt = (list: (l: MoeLesson) => string): Map<string, number> => {
  const at = new Map<string, number>();
  LESSONS.forEach((l, i) => { for (const ch of Array.from(list(l))) if (!at.has(ch)) at.set(ch, i); });
  return at;
};
const READ_AT = firstAt((l) => l.read);
const WRITE_AT: Record<Course, Map<string, number>> = {
  cl: firstAt((l) => writeList(l, 'cl')),
  hcl: firstAt((l) => writeList(l, 'hcl')),
  both: firstAt((l) => writeList(l, 'both')),
};

/** The first lesson whose 识读字 has the character; undefined if his book never teaches it. */
export const taughtAt = (ch: string): number | undefined => READ_AT.get(ch);
/** The first lesson whose write list (the course's; both lists for 'both') has the character. */
export const writeAt = (ch: string, course: Course): number | undefined => WRITE_AT[course].get(ch);

const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 1–99 in Chinese: 7 → 七, 10 → 十, 17 → 十七, 20 → 二十. */
export function zhNumber(n: number): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return tens === 0 ? NUM[ones]! : `${tens > 1 ? NUM[tens] : ''}十${NUM[ones]}`;
}
/** 「二下·17」 */
export const lessonLabel = (i: number): string => `${LESSONS[i]!.term}·${LESSONS[i]!.lesson}`;
/** 「二下 第十七课」 */
export const lessonName = (i: number): string => `${LESSONS[i]!.term} 第${zhNumber(LESSONS[i]!.lesson)}课`;
/** The index of a term's lesson, e.g. ('二下', 17) → 35; undefined if the book has no such lesson. */
export function lessonIndex(term: string, lesson: number): number | undefined {
  const i = LESSONS.findIndex((l) => l.term === term && l.lesson === lesson);
  return i < 0 ? undefined : i;
}
/** The lesson indexes of one term, in order (empty past the lists). */
export const termLessons = (term: string): number[] => LESSONS.flatMap((l, i) => (l.term === term ? [i] : []));
const GRADE = ['一', '二', '三', '四', '五', '六'];
/** A school year's two books: P2 → ['二上', '二下']. */
export const gradeTerms = (grade: number): [string, string] => [`${GRADE[grade - 1] ?? ''}上`, `${GRADE[grade - 1] ?? ''}下`];

/**
 * His school year now (P1 = 1): the year the parent set, moved up each January since (Singapore's school year is the calendar
 * year), up to P6. Set before the year was remembered: 2026.
 */
export function schoolYear(s: { grade?: number; gradeYear?: number }, now: Date): number {
  return Math.min(6, Math.max(1, (s.grade ?? 2) + now.getFullYear() - (s.gradeYear ?? 2026)));
}

/**
 * Where his class is by the calendar (spec §4): the semester's lessons spread evenly over its school days, breaks skipped. A holiday
 * keeps the last lesson of the semester just ended; before Term 1, the year's first lesson. Null for a year or school year without data.
 */
export function estimateLesson(now: Date, grade: number): number | null {
  const start = yearStart(now.getFullYear());
  if (start === null) return null;
  const [up, down] = gradeTerms(grade).map(termLessons) as [number[], number[]];
  if (dayNumber(now) < start) return up[0] ?? null;
  const sem = semesterAt(now)!;
  const lessons = sem.half === 1 ? up : down;
  if (!lessons.length) return null;
  const { done, total } = teachingDays(sem, now);
  return lessons[Math.min(lessons.length - 1, Math.floor((done * lessons.length) / total))]!;
}

type ClassSettings = Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>;

/** Is the parent's correction in force? Only in the semester it was set in: the next semester goes back to the calendar. */
export function correctionApplies(now: Date, s: ClassSettings): boolean {
  const c = s.classLesson;
  if (!c || lessonIndex(c.term, c.lesson) === undefined || now.getTime() < c.setAt) return false;
  const was = semesterAt(new Date(c.setAt));
  const is = semesterAt(now);
  return !!was && !!is && was.year === is.year && was.half === is.half;
}

/**
 * The lesson his class is on today: the parent's correction carried forward at the calendar's pace (one lesson per
 * total ÷ lessons school days), never past his school year's last lesson; else the calendar's estimate.
 */
export function classLessonAt(now: Date, s: ClassSettings): number | null {
  const grade = schoolYear(s, now);
  if (!correctionApplies(now, s)) return estimateLesson(now, grade);
  const c = s.classLesson!;
  const set = lessonIndex(c.term, c.lesson)!;
  const sem = semesterAt(now)!;
  const [up, down] = gradeTerms(grade).map(termLessons) as [number[], number[]];
  const pace = (sem.half === 1 ? up : down).length;
  const { done: then } = teachingDays(sem, new Date(c.setAt));
  const { done, total } = teachingDays(sem, now);
  const moved = total ? Math.floor(((done - then) * pace) / total) : 0;
  return Math.min(set + moved, Math.max(set, ...down, ...up));
}

/** Characters to read and to write by the end of lesson `upTo` (inclusive). */
export function listedBy(upTo: number, course: Course): { read: Set<string>; write: Set<string> } {
  const ls = LESSONS.slice(0, upTo + 1);
  return { read: new Set(ls.flatMap((l) => Array.from(l.read))), write: new Set(ls.flatMap((l) => Array.from(writeList(l, course)))) };
}

/** The characters a term brings: first read in it, and first written in it (in the course). */
export function termChars(term: string, course: Course): { read: string[]; write: string[] } {
  const inTerm = (at: number | undefined) => at !== undefined && LESSONS[at]!.term === term;
  const all = (pick: (l: MoeLesson) => string) => [...new Set(LESSONS.flatMap((l) => Array.from(pick(l))))];
  return { read: all((l) => l.read).filter((ch) => inTerm(taughtAt(ch))), write: all((l) => writeList(l, course)).filter((ch) => inTerm(writeAt(ch, course))) };
}
```

`src/types.ts` — before `export interface Settings {`, add:

```ts
/** The parent's correction of where his class is (spec 2026-10-11 §4): the lesson on the day it was set. */
export interface ClassLessonSetting { term: string; lesson: number; setAt: number }
```

and in `Settings`, directly after the `gradeYear?: number; …` line, add:

```ts
  classLesson?: ClassLessonSetting | null; // the parent's "class is on" (spec 2026-10-11 §4): carries at the calendar's pace, lapses next semester; null/absent: the estimate
```

`src/content/index.ts` — replace

```ts
/** The 识写字 of his course: 华文 (CL) or 高级华文 (HCL, which writes more: 435 by the end of P2 to CL's 350). Both read the same. */
export type Course = 'cl' | 'hcl';
const MOE_WRITE: Record<Course, Set<string>> = {
  cl: new Set(MOE_LESSONS.flatMap((l) => Array.from(l.write))),
  hcl: new Set(MOE_LESSONS.flatMap((l) => Array.from(l.writeHcl))),
};
```

with

```ts
/**
 * The 识写字 of his course: 华文 (CL), 高级华文 (HCL, which writes more: 435 by the end of P2 to CL's 350), or both lists (spec
 * 2026-10-11 §6: the default). All read the same.
 */
export type Course = 'cl' | 'hcl' | 'both';
const MOE_WRITE: Record<Course, Set<string>> = {
  cl: new Set(MOE_LESSONS.flatMap((l) => Array.from(l.write))),
  hcl: new Set(MOE_LESSONS.flatMap((l) => Array.from(l.writeHcl))),
  both: new Set(MOE_LESSONS.flatMap((l) => Array.from(l.write + l.writeHcl))),
};
```

and in `moeTargets` replace

```ts
  const write = new Set(lessons.flatMap((l) => Array.from(course === 'hcl' ? l.writeHcl : l.write)));
```

with

```ts
  const write = new Set(lessons.flatMap((l) => Array.from(course === 'hcl' ? l.writeHcl : course === 'both' ? l.write + l.writeHcl : l.write)));
```

`src/parent/progress.ts` — replace the `schoolYear` doc comment and function (lines 7–13) with:

```ts
/** His school year now (P1 = 1): lives with the book's positions (src/content/curriculum.ts). */
export { schoolYear } from '../content/curriculum';
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/content/curriculum.test.ts src/content/moeTargets.test.ts src/parent/progress.test.ts src/parent/settingsGrade.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/schoolCalendar.ts src/content/curriculum.ts src/content/curriculum.test.ts src/content/index.ts src/content/moeTargets.test.ts src/types.ts src/parent/progress.ts
git commit -m "feat: curriculum positions, the MOE calendar and his class's lesson (estimate + parent correction)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Both tracks, the default, and the one-off move

**Files:**
- Modify: `src/types.ts` (`course`, `contentCourse` unions; `DEFAULT_SETTINGS.lessonVersion`)
- Modify: `src/store/settings.ts:5-23`
- Modify: `src/bootstrap.ts:6,21-28`
- Modify: `src/parent/SettingsPanel.tsx:4,75-80`
- Test: `src/store/settings.test.ts` (rewritten), `src/store/backup.test.ts:154`, `src/bootstrap.test.ts`, `src/parent/settingsCourse.test.tsx` (new)

**Interfaces:**
- Consumes: `courseOf`, `schoolYear` from `src/content/curriculum.ts` (Task 2); `Course` with `'both'` (Task 2).
- Produces: `Settings.course?: 'cl' | 'hcl' | 'both'`, `Settings.contentCourse?: 'cl' | 'hcl' | 'both'`; `DEFAULT_SETTINGS.lessonVersion === 5`; `migrateSettings(s)` returns `{ …, course: 'both', lessonVersion: 5 }` for any `lessonVersion < 5`, `null` from 5.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/store/settings.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v5 (spec 2026-10-05 §7 adds the switches and the ceiling; 2026-10-11 §6 both tracks)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5 })).toBeNull();
  });
  it('moves an install on the old 20-minute default to 30 minutes, once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 30, lessonVersion: 5 });
  });
  it('keeps a shorter lesson the parent chose (only the old 20-minute default moves)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 5 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 5 })).toBeNull();
  });
  it('a fresh install starts at 30 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(30);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings to 30, even though the defaults already say lessonVersion 2', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(30);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 15 }, 'main'); // the parent chooses 15 later
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
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
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(5);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once, and touches nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', lessonVersion: 5 });
  });
  it('a parent who picks one track afterwards keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toBeNull();
  });
});
```

In `src/store/backup.test.ts`, replace line 154

```ts
    expect(s.lessonVersion).toBe(4);
```

with

```ts
    expect(s.lessonVersion).toBe(5);
    expect(s.course).toBe('both'); // spec 2026-10-11 §6
```

In `src/bootstrap.test.ts`, change the imports to

```ts
import { describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { builtinWords, CONTENT_VERSION } from './content';
import { getSettings, getWord, putWords, seedBuiltinWords, updateSettings } from './store/repo';
```

and add after the existing `it(…)`:

```ts
  it('an iPad on 华文 from before both tracks moves to them once, its words rewritten that launch; a later single track sticks (review focus 2)', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    await seedBuiltinWords(first.db, builtinWords(0, 'cl'), true);
    await updateSettings(first.db, { course: 'cl', contentCourse: 'cl', lessonVersion: 4 });
    expect((await getWord(first.db, 'b:井'))!.writeable).toBe(false); // 华文 only reads 井
    first.db.close();
    const second = await bootstrap(name);
    expect(await getSettings(second.db)).toMatchObject({ course: 'both', contentCourse: 'both', lessonVersion: 5 });
    expect((await getWord(second.db, 'b:井'))!.writeable).toBe(true); // 高级华文 writes it
    await updateSettings(second.db, { course: 'cl' }); // the parent picks 华文 again
    second.db.close();
    const third = await bootstrap(name);
    expect(await getSettings(third.db)).toMatchObject({ course: 'cl', contentCourse: 'cl' });
    expect((await getWord(third.db, 'b:井'))!.writeable).toBe(false);
    third.db.close();
  });
```

Create `src/parent/settingsCourse.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { allWords, getSettings, seedBuiltinWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('Course: both tracks (spec 2026-10-11 §6)', () => {
  it('is the default, labelled 华文 + 高级华文, and writes every character either list writes', async () => {
    const app = await makeAppData();
    await seedBuiltinWords(app.db, builtinWords(0, 'cl'), true);
    renderWithApp(<SettingsPanel />, app);
    const course = screen.getByLabelText('Course') as HTMLSelectElement;
    expect(course.value).toBe('both');
    expect(course.selectedOptions[0]!.textContent).toBe('华文 + 高级华文');
    fireEvent.change(course, { target: { value: 'hcl' } });
    await waitFor(async () => expect((await getSettings(app.db)).course).toBe('hcl'));
    fireEvent.change(course, { target: { value: 'both' } });
    await waitFor(async () => expect((await getSettings(app.db)).contentCourse).toBe('both'));
    expect((await allWords(app.db)).find((w) => w.text === '井')?.writeable).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/store/settings.test.ts src/store/backup.test.ts src/bootstrap.test.ts src/parent/settingsCourse.test.tsx`
Expected: FAIL — settings tests get `lessonVersion: 4` / `null` where 5 / the both patch is expected; backup gets 4; the bootstrap test sees `course: 'cl'`; the Course select has value `cl` and no `华文 + 高级华文` option.

- [ ] **Step 3: Implement**

`src/types.ts` — replace the two course lines in `Settings`:

```ts
  course?: 'cl' | 'hcl'; // 华文 or 高级华文: which 识写字 he practises writing (both read the same characters); absent: 'cl'
  contentCourse?: 'cl' | 'hcl'; // the course the stored built-in words were written for
```

with

```ts
  course?: 'cl' | 'hcl' | 'both'; // 华文, 高级华文 or both lists' 识写字 to write (all read the same characters); absent: 'both' (courseOf, spec 2026-10-11 §6)
  contentCourse?: 'cl' | 'hcl' | 'both'; // the course the stored built-in words were written for; absent: 'cl' (written before courses)
```

and in `DEFAULT_SETTINGS` replace `lessonVersion: 4,` with `lessonVersion: 5,`.

`src/store/settings.ts` — replace the doc comment and `migrateSettings` (lines 5–23) with:

```ts
/**
 * One-off moves for existing installs; only an old default moves, a parent's own choice stays.
 * Plan 11 (v2): a 20-minute lesson grows to 30. Plan 13 (v3): 5 new words a day becomes 4 (spec §20 part 2).
 * Lesson redesign (v4, spec 2026-10-05 §7): the activity switches become 新字 / 练一练 / 写一写 / 朗读, and the old default
 * number of new words becomes the ceiling 8 the app paces under (§2.2).
 * Both tracks (v5, spec 2026-10-11 §6): every install moves to 华文 + 高级华文 once, as the parent asked; a later pick stays.
 */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 5) return null;
  const patch: Partial<Settings> = {};
  if (v < 4) {
    if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
    const perDay = v < 3 && s.newPerDay === 5 ? 4 : s.newPerDay;
    patch.newPerDay = perDay === 4 ? 8 : perDay;
    const was = s.activities as unknown as Partial<Record<'flashcards' | 'choose' | 'components' | 'writing' | 'speaking', boolean>>;
    const on = (k: keyof typeof was) => was[k] ?? true;
    patch.activities = { newwords: on('flashcards'), practice: on('flashcards') || on('choose') || on('components'), writing: on('writing'), speaking: on('speaking') };
  }
  patch.course = 'both';
  patch.lessonVersion = 5;
  return patch;
}
```

`src/bootstrap.ts` — add after the `import { builtinWords, CONTENT_VERSION } from './content';` line:

```ts
import { courseOf } from './content/curriculum';
```

and replace

```ts
  // the 3,000 built-in words are rewritten only when the content changed (a launch used to rewrite them all)
  const stored = (await db.get('settings', 'main'))?.contentVersion;
  const pre = await getSettings(db);
  const course = pre.course ?? 'cl';
  const stale = stored !== CONTENT_VERSION || (pre.contentCourse ?? 'cl') !== course; // new content, or words written for the other course
  await seedBuiltinWords(db, builtinWords(Date.now(), course), stale);
  if (stale) await updateSettings(db, { contentVersion: CONTENT_VERSION, contentCourse: course });
  await applySettingsMigration(db);
```

with

```ts
  await applySettingsMigration(db); // first: a move (v5: both tracks) can change the course the words are written for
  // the 3,000 built-in words are rewritten only when the content changed (a launch used to rewrite them all)
  const stored = (await db.get('settings', 'main'))?.contentVersion;
  const pre = await getSettings(db);
  const course = courseOf(pre);
  const stale = stored !== CONTENT_VERSION || (pre.contentCourse ?? 'cl') !== course; // new content, or words written for another course
  await seedBuiltinWords(db, builtinWords(Date.now(), course), stale);
  if (stale) await updateSettings(db, { contentVersion: CONTENT_VERSION, contentCourse: course });
```

`src/parent/SettingsPanel.tsx` — replace line 4

```ts
import { schoolYear } from './progress';
```

with

```ts
import { courseOf, schoolYear } from '../content/curriculum';
```

and replace

```tsx
        <select id="st-course" value={s.course ?? 'cl'} onChange={(e) => void setCourse(e.currentTarget.value as Course)}>
          <option value="cl">华文 (Chinese)</option>
          <option value="hcl">高级华文 (Higher Chinese)</option>
        </select>
        <p class="hint">Both read the same characters in the same order. 高级华文 writes more (435 by the end of P2, to 350), so 写一写 and 听写 practise its list.</p>
```

with

```tsx
        <select id="st-course" value={courseOf(s)} onChange={(e) => void setCourse(e.currentTarget.value as Course)}>
          <option value="both">华文 + 高级华文</option>
          <option value="cl">华文 (Chinese)</option>
          <option value="hcl">高级华文 (Higher Chinese)</option>
        </select>
        <p class="hint">All three read the same characters in the same order. 写一写 and 听写 practise the course's 识写字: 华文 + 高级华文 writes every character on either list (435 by the end of P2; 华文 alone, 350).</p>
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/store src/bootstrap.test.ts src/parent src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/store/settings.ts src/store/settings.test.ts src/store/backup.test.ts src/bootstrap.ts src/bootstrap.test.ts src/parent/SettingsPanel.tsx src/parent/settingsCourse.test.tsx
git commit -m "feat: 华文 + 高级华文 as one course, the default; existing installs move to it once (lessonVersion 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Content fixes — the 5 missing characters, readable 组词, the listed-character check

**Files:**
- Modify: `src/types.ts` (`BuiltinChar.school`)
- Modify: `scripts/content-lib.ts:12-17,75-129`, `scripts/build-content.ts`, `scripts/check-content.ts`, `scripts/build-glossary.ts`
- Modify: `src/content/extraExamples.ts` (end of `EXTRA_EXAMPLES`, and the header comment)
- Modify: `src/content/index.ts:12` (`CONTENT_VERSION`)
- Modify: `src/placement/walk.ts:39-44`
- Regenerate: `src/content/builtin.json`, `src/content/glossary.json`, `public/fonts/wenkai.woff2`
- Test: `scripts/content-lib.test.ts`, `scripts/check-content.test.ts`, `src/content/index.test.ts`, `src/content/readingFixes.test.ts:44`, `src/placement/walk.test.ts:12-17`

**Interfaces:**
- Consumes: `moe2024.json` lessons.
- Produces: `BuildInput.school?: SchoolLesson[]`; `interface SchoolLesson { term: string; read: string }`; `BuiltinChar.school?: true`; `checkContent(chars, passages, hasStrokeFile, listed?: string): string[]` (new problem text: `` `${ch}: on his school list but not built in` ``); `CONTENT_VERSION === '1.11'`.

- [ ] **Step 1: Write the failing tests**

In `scripts/content-lib.test.ts`, change the import line to

```ts
import { buildBuiltin, buildWordDictionary, cleanHskWord, extractComponents, firstSenses, parseHskSections, type MmahEntry, type SchoolLesson } from './content-lib';
```

and append:

```ts
describe('his textbook in the build (spec 2026-10-11 §7)', () => {
  const hskChars = parseHskSections('一级汉字表\n1\t大\n2\t人\n3\t天\n');
  const hskWords = parseHskSections('一级词汇表\n1 大天\n2 大人\n3 大大\n');
  const dict = new Map(['大', '人', '天', '马'].map((c, i) => [c, entry(c, i + 2, '？', c)]));
  const school: SchoolLesson[] = [{ term: '一上', read: '大人' }, { term: '二上', read: '天马狸' }];
  const without = buildBuiltin({ hskChars, hskWords, dictionary: dict, pinyinOf });
  const skipped: string[] = [];
  const withBook = buildBuiltin({ hskChars, hskWords, dictionary: dict, pinyinOf, school }, skipped);
  const bare = (cs: typeof withBook) => cs.map(({ examples: _e, ...c }) => c);

  it('adds the characters his book teaches that HSK lacks, after every HSK character, at their grade; no HSK character moves', () => {
    expect(withBook.map((c) => [c.char, c.rank, c.level, c.school ?? false, c.writeable])).toEqual([
      ['大', 0, 1, false, false], ['人', 1, 1, false, false], ['天', 2, 1, false, false], ['马', 3, 2, true, false],
    ]);
    expect(bare(withBook.slice(0, 3))).toEqual(bare(without));
    expect(skipped).toEqual(['狸']); // no dictionary entry: skipped, never a broken card
  });
  it('puts 组词 whose other characters the book has already taught first, and keeps every one the card had', () => {
    expect(without.find((c) => c.char === '大')!.examples.map((e) => e.text)).toEqual(['大天', '大人', '大大']);
    // 大 is taught in lesson 0 with 人; 天 only later; 大大 has no other character to have learned
    expect(withBook.find((c) => c.char === '大')!.examples.map((e) => e.text)).toEqual(['大人', '大天', '大大']);
    expect(withBook.find((c) => c.char === '天')!.examples.map((e) => e.text)).toEqual(['大天']);
  });
});
```

Replace the whole of `scripts/check-content.test.ts` with:

```ts
// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import moe from '../src/content/moe2024.json';
import { checkContent } from './check-content';

const dataDir = join(process.cwd(), 'node_modules', 'hanzi-writer-data');
const hasStrokeFile = (ch: string) => existsSync(join(dataDir, `${ch}.json`));
/** Every character his book lists, to read or to write (spec 2026-10-11 §7). */
const LISTED = (moe as { lessons: { read: string; write: string; writeHcl: string }[] }).lessons.map((l) => l.read + l.write + l.writeHcl).join('');

describe('built-in content', () => {
  it('has no problems, and has every character on his school lists', () => {
    expect(checkContent(BUILTIN, PASSAGES, hasStrokeFile, LISTED)).toEqual([]);
  });
  it('flags a listed character the app does not have', () => {
    expect(checkContent(BUILTIN.filter((c) => c.char !== '蚂'), [], hasStrokeFile, LISTED)).toContain('蚂: on his school list but not built in');
  });
  it('flags a passage that uses a character outside levels 1–2', () => {
    const problems = checkContent(BUILTIN, [{ id: 'x', title: 't', text: '我'.repeat(29) + '惜' }], hasStrokeFile);
    expect(problems).toContain('x: uses 惜 outside levels 1–2'); // 惜 is HSK 5
  });
});
```

In `src/content/index.test.ts`, replace

```ts
    expect(words).toHaveLength(3000);
```

with

```ts
    expect(words).toHaveLength(3005); // HSK's 3,000 and the 5 his book lists that HSK lacks (spec 2026-10-11 §7)
```

and add a test inside `describe('content module', …)`:

```ts
  it('has the 5 listed characters HSK lacks, in school order, with 组词 he can say (spec 2026-10-11 §7)', () => {
    const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
    for (const ch of '蚂蚁拇狐狸') expect(byText.get(ch)!.rank).toBeLessThan(1031); // his book's order, not after HSK
    expect(byText.get('蚂')!.examples!.map((e) => e.text)).toEqual(['蚂蚁']);
    expect(byText.get('狸')!.examples!.map((e) => e.text)).toEqual(['狐狸']);
    expect(BUILTIN.filter((c) => c.school).map((c) => c.char).join('')).toBe('蚂蚁拇狐狸');
  });
```

In `src/content/readingFixes.test.ts:44`, replace

```ts
    const PINNED: Record<string, string> = { '1.10': 'b16d9f6b25798751' }; // 1.4 and 1.5 changed how examples are chosen (code); 1.6 added written 组词 and fixes; 1.7 the content sweep; 1.8 the second sweep; 1.9 school order; 1.10 HCL writing lists
```

with

```ts
    const PINNED: Record<string, string> = { '1.11': 'dd393ec158d4533f' }; // 1.4 and 1.5 changed how examples are chosen (code); 1.6 added written 组词 and fixes; 1.7 the content sweep; 1.8 the second sweep; 1.9 school order; 1.10 HCL writing lists; 1.11 蚂蚁拇狐狸 and readable 组词 (spec 2026-10-11 §7)
```

In `src/placement/walk.test.ts`, replace the test `'30 bands of 100 characters in rank order'` with:

```ts
  it('30 bands of 100 characters in rank order; the 5 school characters HSK lacks join the last band', () => {
    const bands = rankBands(builtinWords(0));
    expect(bands).toHaveLength(30);
    expect(bands.slice(0, -1).every((b) => b.length === 100)).toBe(true);
    expect(bands.at(-1)).toHaveLength(105);
    expect(bands[0]![0]!.rank!).toBeLessThan(bands[1]![0]!.rank!);
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run scripts/content-lib.test.ts scripts/check-content.test.ts src/content/index.test.ts src/content/readingFixes.test.ts src/placement/walk.test.ts`
Expected: FAIL — `school` is ignored by `buildBuiltin` (马 missing, 大's examples unchanged); `checkContent` reports nothing for listed characters; 3000 ≠ 3005 and no 蚂; the pinned hash test fails on `CONTENT_VERSION 1.10` with no pin; the walk test fails (its last band has 100, not 105) until the content is rebuilt in Step 4.

- [ ] **Step 3: Implement the build changes**

`src/types.ts` — in `BuiltinChar`, after `examples: Example[];` add:

```ts
  school?: true; // on his textbook's list but not an HSK character (蚂 蚁 拇 狐 狸): added after every HSK character (spec 2026-10-11 §7)
```

`scripts/content-lib.ts` — replace the `BuildInput` interface with:

```ts
export interface BuildInput {
  hskChars: Map<string, string[]>;
  hskWords: Map<string, string[]>;
  dictionary: Map<string, MmahEntry>;
  pinyinOf: (text: string) => string;
  /** His textbook's lessons in order (src/content/moe2024.json): characters it teaches that HSK lacks are added, and 组词 he can read come first. */
  school?: SchoolLesson[];
}

export interface SchoolLesson { term: string; read: string }

/** A school character's level when HSK doesn't have it: its grade (一上 → 1, 三下 → 3). */
const GRADE_LEVEL: Record<string, Level> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
```

and replace the whole `buildBuiltin` function (its doc comment line stays) with:

```ts
export function buildBuiltin(input: BuildInput, skipped: string[] = []): BuiltinChar[] {
  const handwriting = new Set(HANDWRITING_SECTIONS.flatMap((s) => input.hskChars.get(s) ?? []));
  const seen = new Set<string>();
  const pool: { char: string; hsk: number; index: number; strokes: number; entry: MmahEntry; school?: true }[] = [];

  CHAR_SECTIONS.forEach((section, s) => {
    const chars = input.hskChars.get(section);
    if (!chars) {
      if (s === 0) throw new Error(`Missing section ${section}`); // level 1 is required; higher levels are optional
      return;
    }
    chars.forEach((char, index) => {
      if (seen.has(char)) return;
      const entry = input.dictionary.get(char);
      if (!entry) {
        skipped.push(char);
        return;
      }
      seen.add(char);
      pool.push({ char, hsk: s + 1, index, strokes: entry.matches.length, entry });
    });
  });
  pool.sort((a, b) => a.hsk - b.hsk || a.strokes - b.strokes || a.index - b.index);
  // school characters HSK doesn't have (蚂 蚁 拇 狐 狸): after every HSK character, in lesson order, so no HSK rank moves
  const taught = new Map<string, number>();
  (input.school ?? []).forEach((l, i) => {
    for (const char of Array.from(l.read)) {
      if (!taught.has(char)) taught.set(char, i);
      if (seen.has(char)) continue;
      const entry = input.dictionary.get(char);
      if (!entry) {
        skipped.push(char);
        continue;
      }
      seen.add(char);
      pool.push({ char, hsk: GRADE_LEVEL[l.term[0]!] ?? 7, index: pool.length, strokes: entry.matches.length, entry, school: true });
    }
  });

  const levelOf = new Map<string, Level>(pool.map((p) => [p.char, p.hsk as Level]));
  const wordLevel = new Map(buildWordDictionary(input.hskWords));
  // 组词 a child can use: short words first, then easier (lower HSK level) words.
  const words = [...wordLevel]
    .filter(([w]) => w.length <= 4)
    .sort((a, b) => a[0].length - b[0].length || a[1] - b[1])
    .map(([w]) => w);

  return pool.map((p, rank) => {
    const level = levelOf.get(p.char)!;
    const fits = (w: string) => w.includes(p.char) && [...w].every((c) => (levelOf.get(c) ?? 99) <= Math.max(level + 1, 2)); // characters up to one level up
    const pick = (ok: (w: string) => boolean): string[] => {
      const out: string[] = [];
      for (const w of words) {
        if (out.length >= MAX_EXAMPLES) break;
        if (fits(w) && ok(w) && !out.includes(w)) out.push(w);
      }
      return out;
    };
    const current = pick(() => true);
    // a school character: everyday (HSK 1–3) 组词 whose other characters his book has already taught come first (spec
    // 2026-10-11 §7); the card keeps every 组词 it had, so no ladder 词语 he has begun goes away
    const at = taught.get(p.char);
    const readable = at === undefined ? [] : pick((w) => (wordLevel.get(w) ?? 9) <= 3 && [...w].some((c) => c !== p.char) && [...w].every((c) => c === p.char || (taught.get(c) ?? Infinity) <= at));
    const examples: Example[] = [...readable, ...current.filter((w) => !readable.includes(w))].map((w) => ({ text: w, pinyin: input.pinyinOf(w) }));
    return {
      char: p.char,
      pinyin: input.pinyinOf(p.char),
      meaning: firstSenses(p.entry.definition),
      level,
      rank,
      radical: p.entry.radical,
      components: extractComponents(p.entry.decomposition),
      strokes: p.strokes,
      writeable: handwriting.has(p.char),
      examples,
      ...(p.school ? { school: true as const } : {}),
    };
  });
}
```

`scripts/build-content.ts` — change the content-lib import to

```ts
import { buildBuiltin, buildWordDictionary, parseHskSections, type MmahEntry, type SchoolLesson } from './content-lib';
import moe from '../src/content/moe2024.json';
```

replace

```ts
  pinyinOf: (text) => pinyin(text, { type: 'array' }).join(' '),
}, skipped);
```

with

```ts
  pinyinOf: (text) => pinyin(text, { type: 'array' }).join(' '),
  school: (moe as { lessons: SchoolLesson[] }).lessons, // spec 2026-10-11 §7: every listed character, and 组词 he can read
}, skipped);
```

and replace the last line (`console.log(\`Wrote ${chars.length} characters …`) with

```ts
console.log(`Wrote ${chars.length} characters (levels 1–7: ${perLevel}), ${chars.filter((c) => c.school).length} from his textbook only (${chars.filter((c) => c.school).map((c) => c.char).join('')}), ${chars.filter((c) => c.writeable).length} writeable, ${skipped.length} skipped (${skipped.join('')}); ${hskWords.length} HSK words`);
```

`scripts/check-content.ts` — replace the function head and the level loop:

```ts
export function checkContent(chars: BuiltinChar[], passages: Passage[], hasStrokeFile: (char: string) => boolean): string[] {
```

with

```ts
/** `listed`: every character his school lists ask for (spec 2026-10-11 §7); each must be built in. */
export function checkContent(chars: BuiltinChar[], passages: Passage[], hasStrokeFile: (char: string) => boolean, listed = ''): string[] {
```

and

```ts
    const n = chars.filter((c) => c.level === level).length;
```

with

```ts
    const n = chars.filter((c) => c.level === level && !c.school).length; // HSK's own; the book's extra characters aren't HSK's
```

and directly before `const easy = new Set(…)` add:

```ts
  for (const ch of new Set(Array.from(listed))) if (HAN.test(ch) && !seen.has(ch)) problems.push(`${ch}: on his school list but not built in`);
```

`scripts/build-glossary.ts` — replace

```ts
const out = {
  source: 'CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), MDBG and contributors',
  license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — this glossary is a shortened adaptation and shares that licence',
  entries: glossary,
};
```

with

```ts
// every gloss already shipped stays as it is (CC-CEDICT changes daily); only phrases without one are added (spec 2026-10-11 §7)
const outUrl = new URL('../src/content/glossary.json', import.meta.url);
const kept = (JSON.parse(await readFile(outUrl, 'utf8')) as { entries: Record<string, string> }).entries;
const out = {
  source: 'CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), MDBG and contributors',
  license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — this glossary is a shortened adaptation and shares that licence',
  entries: Object.fromEntries([...Object.entries(kept), ...Object.entries(glossary).filter(([k]) => !(k in kept))]),
};
```

and replace

```ts
await writeFile(new URL('../src/content/glossary.json', import.meta.url), JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${Object.keys(glossary).length} glosses; ${missing.length} phrases with none (${missing.slice(0, 20).join(' ')}…)`);
```

with

```ts
await writeFile(outUrl, JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${Object.keys(out.entries).length} glosses (${Object.keys(out.entries).length - Object.keys(kept).length} new); ${missing.length} phrases with none (${missing.slice(0, 20).join(' ')}…)`);
```

`src/content/extraExamples.ts` — change the header comment's second line

```ts
// Written for the app, HSK 1–6 characters only: everyday words a P2 child meets, at the card's reading, with their English.
```

to

```ts
// Written for the app, HSK 1–6 characters and his textbook's own: everyday words a P2 child meets, at the card's reading, with their English.
```

and replace the last entry and closing brace of `EXTRA_EXAMPLES`

```ts
  蹲: [['蹲下', 'dūn xià', 'to squat down'], ['蹲着', 'dūn zhe', 'squatting']],
};
```

with (exactly — the pinned hash depends on these values)

```ts
  蹲: [['蹲下', 'dūn xià', 'to squat down'], ['蹲着', 'dūn zhe', 'squatting']],
  // his textbook's characters that HSK doesn't have (欢乐伙伴2.0 二上 L10, 三下 L12–13; spec 2026-10-11 §7)
  蚂: [['蚂蚁', 'mǎ yǐ', 'ant']],
  蚁: [['蚂蚁', 'mǎ yǐ', 'ant'], ['小蚂蚁', 'xiǎo mǎ yǐ', 'little ant']],
  拇: [['拇指', 'mǔ zhǐ', 'thumb'], ['大拇指', 'dà mǔ zhǐ', 'thumb']],
  狐: [['狐狸', 'hú li', 'fox']],
  狸: [['狐狸', 'hú li', 'fox']],
};
```

`src/content/index.ts:12` — replace `.10\`; // .4: …; .10: the HCL writing lists` so the line reads:

```ts
export const CONTENT_VERSION = `${(data as unknown as { version: number }).version}.11`; // .4: 组词 at the card's reading only; .5: 一/不's tone changes count as their reading; .6: written 组词, reading fixes; .7: content sweep; .8: second sweep (HSK 5–9, sentences); .9: school order (MOE 2.0 lists); .10: the HCL writing lists; .11: 蚂蚁拇狐狸 and readable 组词
```

`src/placement/walk.ts` — replace `rankBands` with:

```ts
/** The built-in characters in rank order, in bands of 100; a short tail (the 5 school characters HSK lacks) joins the last band. */
export function rankBands(words: Word[]): Word[][] {
  const ranked = words.filter((w) => w.source === 'builtin' && w.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const bands: Word[][] = [];
  for (let i = 0; i < ranked.length; i += BAND_SIZE) bands.push(ranked.slice(i, i + BAND_SIZE));
  if (bands.length > 1 && bands.at(-1)!.length < BAND_SIZE / 2) bands.splice(-2, 2, [...bands.at(-2)!, ...bands.at(-1)!]);
  return bands;
}
```

- [ ] **Step 4: Rebuild `builtin.json` and check that only the expected things changed**

Run: `npm run content`
Expected: it downloads three sources into `scripts/.cache/` (gitignored) and prints `Wrote 3005 characters (levels 1–7: 300/302/303/300/300/300/1200), 5 from his textbook only (蚂蚁拇狐狸), … 0 skipped (); … HSK words`.

Create `scripts/.cache/verify-content.ts` (gitignored scratch):

```ts
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
type C = { char: string; examples: { text: string; pinyin: string }[] } & Record<string, unknown>;
const was: C[] = JSON.parse(execSync('git show HEAD:src/content/builtin.json', { maxBuffer: 1 << 28 }).toString()).chars;
const now: C[] = JSON.parse(readFileSync('src/content/builtin.json', 'utf8')).chars;
const bare = ({ examples: _e, ...c }: C) => JSON.stringify(c);
const drift = was.filter((c, i) => bare(c) !== bare(now[i]!)).map((c) => c.char);
const lost = was.filter((c, i) => c.examples.some((e) => !now[i]!.examples.some((x) => x.text === e.text && x.pinyin === e.pinyin))).map((c) => c.char);
const changed = was.filter((c, i) => JSON.stringify(c.examples) !== JSON.stringify(now[i]!.examples)).length;
const added = now.slice(was.length).map((c) => `${c.char}:${c.level}:${c.school}`).join(' ');
console.log(JSON.stringify({ drift, lost, changed, added }));
```

Run: `npx tsx scripts/.cache/verify-content.ts && git diff --quiet src/content/hskwords.json && echo hskwords unchanged`
Expected exactly:
```
{"drift":[],"lost":[],"changed":222,"added":"蚂:2:true 蚁:2:true 拇:3:true 狐:3:true 狸:3:true"}
hskwords unchanged
```
**Stop and report** if `drift` is not empty (a pinyin, meaning, level, rank, radical, components, strokes or writeable value moved), `lost` is not empty, `changed` is not 222, `added` differs, or `hskwords.json` changed: the upstream sources have moved since this plan was verified (2026-10-11, when a rebuild of the old code reproduced `builtin.json` byte for byte). Do not commit such a rebuild. Then `rm scripts/.cache/verify-content.ts`.

- [ ] **Step 5: Add glosses for the new 组词 (existing ones kept)**

Run:
```bash
curl -sSfL -o scripts/.cache/cedict.zip https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip
unzip -o -q scripts/.cache/cedict.zip -d scripts/.cache
npx tsx scripts/build-glossary.ts scripts/.cache/cedict_ts.u8
```
Expected: `Wrote … glosses (N new); …` with N about 135 (100–170 is fine: CC-CEDICT changes daily).

Check nothing already shipped changed:
```bash
node -e "const {execSync}=require('child_process');const a=JSON.parse(execSync('git show HEAD:src/content/glossary.json',{maxBuffer:1<<28})).entries,b=require('./src/content/glossary.json').entries;const ch=Object.keys(a).filter(k=>a[k]!==b[k]);console.log('changed',ch.length,'added',Object.keys(b).length-Object.keys(a).length)"
```
Expected: `changed 0 added N` (the same N). Stop if `changed` is not 0.

- [ ] **Step 6: Rebuild the font subset with the 5 glyphs**

Run: `npm run font`
Expected: `Subset … glyphs → … KiB` (it downloads LXGW WenKai into `scripts/.cache/`).

Check the glyphs:
```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const hb = await import(process.cwd() + '/node_modules/harfbuzzjs/dist/index.mjs');
const ttf = await require('wawoff2').decompress(readFileSync('public/fonts/wenkai.woff2'));
const cov = new hb.Face(new hb.Blob(ttf), 0).collectUnicodes();
console.log([...'蚂蚁拇狐狸'].map((c) => c + (cov.includes(c.codePointAt(0)) ? ' yes' : ' NO')).join(' '));"
```
Expected: `蚂 yes 蚁 yes 拇 yes 狐 yes 狸 yes`.

- [ ] **Step 7: Run the tests to see them pass**

Run: `npx vitest run scripts src/content src/placement`
Expected: PASS, including the pinned hash `1.11 dd393ec158d4533f`. If only the hash differs, Step 4's check passed and `extraExamples.ts` matches this plan character for character, re-check both before changing the pin; a different hash means different content than the plan verified.

Run: `npx vitest run`
Expected: 0 failed.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts scripts/content-lib.ts scripts/content-lib.test.ts scripts/build-content.ts scripts/check-content.ts scripts/check-content.test.ts scripts/build-glossary.ts src/content/extraExamples.ts src/content/index.ts src/content/index.test.ts src/content/readingFixes.test.ts src/content/builtin.json src/content/glossary.json src/placement/walk.ts src/placement/walk.test.ts public/fonts/wenkai.woff2
git commit -m "feat: content — 蚂蚁拇狐狸 added, 组词 he can read first, every listed character checked (CONTENT_VERSION .11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Two lanes for the day's new words

**Files:**
- Create: `src/session/lanes.ts`, `src/session/lanes.test.ts`
- Modify: `src/session/plan.ts:6,71-79,88-91`
- Modify: `src/types.ts` (`SessionPlan.newWordLanes`)
- Test: `src/session/lanes.test.ts`, `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `taughtAt`, `lessonLabel`, `classLessonAt` (Task 2); `isLadderId` (`src/content/ladder.ts`).
- Produces (`src/session/lanes.ts`): `type Lane = 'school' | 'catchup'`; `bookLesson(w: Pick<Word, 'id' | 'text'>): number | undefined`; `laneTag(lane: Lane | undefined, w: Pick<Word, 'id' | 'text'>): string | null`; `pickNewWords({ candidates, n, classAt, begunChars }: { candidates: Word[]; n: number; classAt: number | null; begunChars: ReadonlySet<string> }): { words: Word[]; lanes: Record<string, Lane> }`.
- Produces (`src/types.ts`): `SessionPlan.newWordLanes?: Record<string, 'school' | 'catchup'>`; `buildSessionPlan` fills it.

- [ ] **Step 1: Write the failing tests**

Create `src/session/lanes.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { Word } from '../types';
import { bookLesson, laneTag, pickNewWords } from './lanes';

// his book's characters by lesson (index 0 = 一上 L1): 衣鱼雨 at 0, 木土马 at 1, 力河禾 at 2, 持静绘 at 34 (二下·16),
// 逛夜市 at 35 (二下·17), 馆院植 at 36 (二下·18); 介 is not in his book
const ORDER = Array.from('衣鱼雨木土马力河禾持静绘逛夜市馆院植');
const ch = (t: string): Word => makeWord(t, { id: `b:${t}`, rank: t === '介' ? 2000 : ORDER.indexOf(t) });
const ladder = (t: string): Word => makeWord(t, { id: `w:${t}`, rank: Math.max(...Array.from(t).map((c) => ORDER.indexOf(c))) + 0.001 });
const chars = (s: string) => Array.from(s).map(ch);
const pick = (candidates: Word[], n: number, classAt: number | null = 35, begunChars: Set<string> = new Set()) => pickNewWords({ candidates, n, classAt, begunChars });
const ids = (r: { words: Word[] }) => r.words.map((w) => w.text);
const CLASS = 35; // 二下·17

describe('book positions', () => {
  it("a character's first 识读 lesson; a ladder 词语's latest; nothing outside the book", () => {
    expect(bookLesson(ch('夜'))).toBe(35);
    expect(bookLesson(ladder('夜市'))).toBe(35);
    expect(bookLesson(ladder('木马'))).toBe(1);
    expect(bookLesson(ch('介'))).toBeUndefined();
    expect(bookLesson(makeWord('朋友', { id: 'p:1', source: 'parent' }))).toBeUndefined(); // a parent's word isn't placed by the book
  });
  it("the card's label: 课本 for his class's lesson, 补 for catch-up, none without a lane or a lesson", () => {
    expect(laneTag('school', ch('夜'))).toBe('课本 二下·17');
    expect(laneTag('catchup', ch('马'))).toBe('补 一上·2');
    expect(laneTag(undefined, ch('马'))).toBeNull();
    expect(laneTag('catchup', ch('介'))).toBeNull();
  });
});

describe('two lanes (spec 2026-10-11 §5)', () => {
  const pool = chars('衣鱼雨木土马力河禾持静绘逛夜市馆院植介');
  it('n = 1–8: half (rounded up) from his class and the lesson before it, the rest from 一上 on', () => {
    for (let n = 1; n <= 8; n++) {
      const r = pick(pool, n, CLASS);
      expect(r.words).toHaveLength(n);
      const lanes = Object.values(r.lanes);
      expect(lanes.filter((l) => l === 'school')).toHaveLength(Math.ceil(n / 2));
      expect(lanes.filter((l) => l === 'catchup')).toHaveLength(Math.floor(n / 2));
    }
    expect(ids(pick(pool, 8, CLASS))).toEqual(Array.from('衣鱼雨木持静绘逛')); // in book order
  });
  it('listed words come first and use up the count; the lanes split what is left', () => {
    const listed = makeWord('朋友', { id: 'p:1', source: 'parent', rank: null, level: null, listedAt: 5 });
    const r = pick([listed, ...pool], 3, CLASS);
    expect(ids(r)).toEqual(['朋友', '衣', '持']);
    expect(r.lanes).toEqual({ 'b:衣': 'catchup', 'b:持': 'school' });
    expect(ids(pick([listed, ...pool], 1, CLASS))).toEqual(['朋友']);
  });
  it('a listed book character (a 听写 mark) comes first with no lane, and takes its slot from n (review focus 5)', () => {
    const marked = { ...ch('夜'), listedAt: 7 };
    const r = pick([marked, ...pool.filter((w) => w.text !== '夜')], 3, CLASS);
    expect(ids(r)).toEqual(['夜', '衣', '持']);
    expect(r.lanes['b:夜']).toBeUndefined();
    expect(laneTag(r.lanes['b:夜'], marked)).toBeNull();
  });
  it('a short school lane gives its share to catch-up', () => {
    const r = pick(chars('衣鱼雨木持'), 4, CLASS);
    expect(ids(r)).toEqual(['衣', '鱼', '雨', '持']);
    expect(r.lanes['b:持']).toBe('school');
  });
  it('a short catch-up lane gives its share to the school lane', () => {
    const r = pick(chars('衣持静绘逛'), 4, CLASS);
    expect(ids(r)).toEqual(['衣', '持', '静', '绘']);
    expect(Object.values(r.lanes).filter((l) => l === 'school')).toHaveLength(3);
  });
  it('nothing ahead of his class while either lane has words; once both are done, the book onward, then words outside it', () => {
    expect(ids(pick(pool, 8, CLASS)).some((t) => '馆院植'.includes(t))).toBe(false);
    const r = pick(chars('馆院介'), 3, CLASS);
    expect(ids(r)).toEqual(['馆', '院', '介']);
    expect(r.lanes).toEqual({ 'b:馆': 'catchup', 'b:院': 'catchup' }); // spill-over shows 补; outside the book, no label
  });
  it('without a class lesson only catch-up runs, in book order', () => {
    const r = pick(pool, 4, null);
    expect(ids(r)).toEqual(['衣', '鱼', '雨', '木']);
    expect(Object.values(r.lanes)).toEqual(['catchup', 'catchup', 'catchup', 'catchup']);
  });
  it("a ladder 词语 waits for its characters, rides its lesson's lane, and comes after them", () => {
    const yeShi = ladder('夜市');
    expect(ids(pick([ch('衣'), ch('逛'), yeShi], 2, CLASS))).toEqual(['衣', '逛']); // 夜 and 市 not begun
    const r = pick([ch('衣'), ch('夜'), ch('市'), yeShi], 6, CLASS);
    expect(ids(r)).toEqual(['衣', '夜', '市', '夜市']);
    expect(r.lanes['w:夜市']).toBe('school');
    expect(pick([yeShi], 1, CLASS, new Set(['夜', '市'])).lanes).toEqual({ 'w:夜市': 'school' }); // begun before today
    expect(pick([ladder('木马')], 1, CLASS, new Set(['木', '马'])).lanes).toEqual({ 'w:木马': 'catchup' });
  });
  it('never the same word twice, and fewer than n when the words run out', () => {
    const r = pick(chars('衣持介'), 8, CLASS);
    expect(ids(r)).toEqual(['衣', '持', '介']);
    expect(new Set(ids(r)).size).toBe(3);
    expect(ids(pick([], 4, CLASS))).toEqual([]);
    expect(ids(pick(pool, 0, CLASS))).toEqual([]);
  });
});
```

Append to `src/session/plan.test.ts`:

```ts
describe("the plan records each new word's lane (spec 2026-10-11 §5)", () => {
  const oct11 = new Date(2026, 9, 11, 8); // 二下·17 by the calendar
  const p2 = settings({ grade: 2, gradeYear: 2026 });
  const ws = [makeWord('衣', { rank: 0 }), makeWord('逛', { rank: 700 }), makeWord('馆', { rank: 720 })];
  it('one from his class, one from 一上', () => {
    const plan = buildSessionPlan({ cards: [], words: ws, settings: p2, now: oct11, newPerDay: 2 });
    expect(plan.newWordIds).toEqual(['b:衣', 'b:逛']);
    expect(plan.newWordLanes).toEqual({ 'b:衣': 'catchup', 'b:逛': 'school' });
  });
  it("the parent's correction moves the school lane", () => {
    const plan = buildSessionPlan({ cards: [], words: ws, settings: { ...p2, classLesson: { term: '二下', lesson: 19, setAt: oct11.getTime() } }, now: oct11, newPerDay: 2 });
    expect(plan.newWordIds).toEqual(['b:衣', 'b:馆']);
    expect(plan.newWordLanes).toEqual({ 'b:衣': 'catchup', 'b:馆': 'school' });
  });
  it('past the school calendar (2028) new words keep coming, catch-up only (review focus 1)', () => {
    const plan = buildSessionPlan({ cards: [], words: ws, settings: p2, now: new Date(2028, 2, 1, 8), newPerDay: 2 });
    expect(plan.newWordIds).toEqual(['b:衣', 'b:逛']);
    expect(plan.newWordLanes).toEqual({ 'b:衣': 'catchup', 'b:逛': 'catchup' });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/session/lanes.test.ts src/session/plan.test.ts`
Expected: FAIL — `lanes.test.ts` cannot resolve `./lanes`; the plan tests get `newWordLanes` `undefined` and the correction test gets `['b:衣', 'b:逛']`.

- [ ] **Step 3: Implement**

Create `src/session/lanes.ts`:

```ts
// Today's new words in two lanes (spec 2026-10-11 §5): his class's lesson, and catch-up from 一上.
import { isLadderId } from '../content/ladder';
import { lessonLabel, taughtAt } from '../content/curriculum';
import type { Word } from '../types';

export type Lane = 'school' | 'catchup';

/** A word's lesson in his book: a character's first 识读 lesson; a ladder 词语's latest among its characters; else none. */
export function bookLesson(w: Pick<Word, 'id' | 'text'>): number | undefined {
  const chars = Array.from(w.text);
  if (chars.length === 1) return taughtAt(chars[0]!);
  if (!isLadderId(w.id)) return undefined;
  const at = chars.map(taughtAt);
  return at.every((x): x is number => x !== undefined) ? Math.max(...at) : undefined;
}

/** The 认新字 card's small label (spec §9): 「课本 二下·17」 for his class's lesson, 「补 一上·5」 for catch-up; none without a lane. */
export function laneTag(lane: Lane | undefined, w: Pick<Word, 'id' | 'text'>): string | null {
  const at = lane ? bookLesson(w) : undefined;
  return lane && at !== undefined ? `${lane === 'school' ? '课本' : '补'} ${lessonLabel(at)}` : null;
}

/**
 * Up to n new words from `candidates` (unstarted, in newWordOrder): listed words first; then half of what is left (rounded up)
 * from his class's lesson and the one before it, the rest from the earliest lessons; a lane that runs short gives its share to
 * the other; then lessons past his class, then words outside the book. A ladder 词语 only once its characters are begun or
 * come earlier today. Without a class lesson, only catch-up runs. Returned in candidate order (a 词语 after its characters).
 */
export function pickNewWords({ candidates, n, classAt, begunChars }: {
  candidates: Word[]; n: number; classAt: number | null; begunChars: ReadonlySet<string>;
}): { words: Word[]; lanes: Record<string, Lane> } {
  const begun = new Set(begunChars);
  const taken = new Set<string>();
  const lanes: Record<string, Lane> = {};
  const take = (pool: Word[], max: number, lane?: Lane): number => {
    let got = 0;
    for (const w of pool) {
      if (got >= max || taken.size >= n) break;
      if (taken.has(w.id) || (isLadderId(w.id) && !Array.from(w.text).every((c) => begun.has(c)))) continue;
      taken.add(w.id);
      got += 1;
      if (lane) lanes[w.id] = lane;
      if (Array.from(w.text).length === 1) begun.add(w.text);
    }
    return got;
  };
  take(candidates.filter((w) => w.listedAt !== undefined), n);
  const rest = candidates.filter((w) => w.listedAt === undefined);
  const at = new Map(rest.map((w) => [w.id, bookLesson(w)]));
  const lessonOf = (w: Word) => at.get(w.id);
  const book = rest.filter((w) => lessonOf(w) !== undefined);
  const school = classAt === null ? [] : book.filter((w) => lessonOf(w) === classAt || lessonOf(w) === classAt - 1);
  const catchup = classAt === null ? book : book.filter((w) => lessonOf(w)! < classAt - 1);
  const ahead = classAt === null ? [] : book.filter((w) => lessonOf(w)! > classAt);
  const left = n - taken.size;
  const fromSchool = take(school, Math.ceil(left / 2), 'school');
  take(catchup, left - fromSchool, 'catchup');
  take(school, n, 'school'); // catch-up ran short: his class's lesson takes the rest
  take(ahead, n, 'catchup'); // everything up to his class is started: the book onward
  take(rest.filter((w) => lessonOf(w) === undefined), n); // then words outside the book, in their order
  return { words: candidates.filter((w) => taken.has(w.id)), lanes };
}
```

`src/types.ts` — in `SessionPlan`, after `newWordIds: string[];` add:

```ts
  newWordLanes?: Record<string, 'school' | 'catchup'>; // each new word's lane (spec 2026-10-11 §5); listed and non-book words have none; plans saved before it have none
```

`src/session/plan.ts` — replace line 6

```ts
import { isLadderId } from '../content/ladder';
```

with

```ts
import { classLessonAt } from '../content/curriculum';
import { pickNewWords } from './lanes';
```

replace

```ts
  const newWords: Word[] = [];
  for (const w of active.filter((x) => !started.has(x.id)).sort(newWordOrder)) {
    if (newWords.length >= newLimit) break;
    if (isLadderId(w.id) && !Array.from(w.text).every((c) => begunChars.has(c))) continue;
    newWords.push(w);
    if (Array.from(w.text).length === 1) begunChars.add(w.text);
  }
```

with

```ts
  // two lanes (spec 2026-10-11 §5): his class's lesson and catch-up from 一上, after the words listed for him
  const classAt = classLessonAt(now, settings);
  const { words: newWords, lanes: newWordLanes } = pickNewWords({ candidates: active.filter((x) => !started.has(x.id)).sort(newWordOrder), n: newLimit, classAt, begunChars });
```

and in the returned object replace

```ts
    newWordIds: newWords.map((w) => w.id),
```

with

```ts
    newWordIds: newWords.map((w) => w.id),
    newWordLanes,
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/session src/app/SessionScreen.test.tsx src/app/sessionLadder.test.tsx`
Expected: PASS (main's plan, ladder and session tests are unchanged: their words sit in catch-up or outside the book).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/session/lanes.ts src/session/lanes.test.ts src/session/plan.ts src/session/plan.test.ts src/types.ts
git commit -m "feat: new words in two lanes — his class's lesson and catch-up from 一上 (ladder gate kept)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 写一写's fallback follows the book

**Files:**
- Modify: `src/session/writing.ts:1-5,23-28,39`
- Modify: `src/session/plan.ts:84` (the `pickWriteUnits` call)
- Test: `src/session/writing.test.ts`

**Interfaces:**
- Consumes: `writeAt`, `courseOf`, `classLessonAt` (Task 2); `classAt` already computed in `buildSessionPlan` (Task 5).
- Produces: `pickWriteUnits({ …, writeBy?: { course: Course; classAt: number | null } })`. A word with a write card is a candidate even when not `writeable`.

- [ ] **Step 1: Write the failing tests**

Append to `src/session/writing.test.ts`:

```ts
describe('写一写 follows the book (spec 2026-10-11 §6)', () => {
  const now3 = new Date(2026, 9, 11, 10);
  const base3 = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now3.getTime() + 86_400_000, target: 9 };
  // 夜 is written at 二下·17 (35), 海 at 二下·18 (36), 门 at 一上·8 (7); 介 is not in his book
  const words = [makeWord('夜', { level: 5, rank: 30 }), makeWord('海', { level: 1, rank: 40 }), makeWord('门', { level: 1, rank: 10 }), makeWord('介', { level: 1, rank: 2000 })];
  const cards = words.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
  it('a book character he reads is written once his class has written it, whatever its HSK level; others by his level', () => {
    const units = pickWriteUnits({ ...base3, cards, words, writeBy: { course: 'both', classAt: 35 } });
    expect(units.map((u) => u.wordId)).toEqual(['b:夜', 'b:介', 'b:门']); // not 海: his class writes it next lesson
  });
  it('without a class lesson, the HSK level rule for every character', () => {
    const units = pickWriteUnits({ ...base3, cards, words, writeBy: { course: 'both', classAt: null } });
    expect(units.map((u) => u.wordId)).toEqual(['b:介', 'b:海', 'b:门']); // 夜 is HSK 5, above his level
  });
  it('a character with a write card keeps it after a course change takes its writing away', () => {
    const w = makeWord('井', { writeable: false });
    const due = makeCard('b:井', 'write', new Date(now3.getTime() - 3_600_000));
    expect(pickWriteUnits({ ...base3, cards: [due], words: [w] }).map((u) => u.wordId)).toEqual(['b:井']);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/session/writing.test.ts`
Expected: FAIL — the first test gets `['b:介', 'b:海', 'b:门']` (level rule; `writeBy` ignored); the last gets `[]` (not writeable).

- [ ] **Step 3: Implement**

`src/session/writing.ts` — after `import { State } from 'ts-fsrs';` add:

```ts
import { writeAt } from '../content/curriculum';
import type { Course } from '../content';
```

replace

```ts
export function pickWriteUnits({ cards, words, newWordIds, practised, level, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number; cutoff: number; target: number;
}): WriteUnit[] {
  const byId = new Map(words.filter((w) => !w.paused && w.writeable).map((w) => [w.id, w]));
  const write = new Map(cards.filter((c) => c.kind === 'write').map((c) => [c.wordId, c]));
```

with

```ts
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
  /** the book's write position decides the last fallback for a book character (spec 2026-10-11 §6); null class: the level rule */
  writeBy?: { course: Course; classAt: number | null }; cutoff: number; target: number;
}): WriteUnit[] {
  const write = new Map(cards.filter((c) => c.kind === 'write').map((c) => [c.wordId, c]));
  // a character he already writes keeps its write card, even if his course no longer asks for it (writeability only grows)
  const byId = new Map(words.filter((w) => !w.paused && (w.writeable || write.has(w.id))).map((w) => [w.id, w]));
  const inReach = (w: Word) => {
    const at = writeBy && writeBy.classAt !== null && Array.from(w.text).length === 1 ? writeAt(w.text, writeBy.course) : undefined;
    return at !== undefined ? at <= writeBy!.classAt! : (w.level ?? 0) <= level;
  };
```

and replace

```ts
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && (w.level ?? 0) <= level; })
```

with

```ts
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && inReach(w); })
```

Also update the doc comment above `pickWriteUnits` to end: `…then characters he reads within reach — a book character once his class has written it, others at his level — going down. Never one he can't read.`

`src/session/plan.ts` — add `courseOf` to the curriculum import:

```ts
import { classLessonAt, courseOf } from '../content/curriculum';
```

and in the `pickWriteUnits` call replace

```ts
level: learnerLevel(words, started), cutoff,
```

with

```ts
level: learnerLevel(words, started), writeBy: { course: courseOf(settings), classAt }, cutoff,
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/session src/app/writingSession.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session/writing.ts src/session/writing.test.ts src/session/plan.ts
git commit -m "feat: 写一写 writes a book character once his class has; write cards keep their characters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Settings — where his class is

**Files:**
- Create: `src/parent/ClassLessonField.tsx`, `src/parent/settingsClass.test.tsx`
- Modify: `src/parent/SettingsPanel.tsx:84-88`

**Interfaces:**
- Consumes: `classLessonAt`, `correctionApplies`, `gradeTerms`, `LESSONS`, `lessonLabel`, `lessonName`, `schoolYear`, `termLessons` (Task 2); `Settings.classLesson` (Task 2).
- Produces: `ClassLessonField({ settings, now, onSave }: { settings: Settings; now: Date; onSave: (patch: Partial<Settings>) => Promise<void> })`, rendering `#st-class-now` and the `Class lesson` select.

- [ ] **Step 1: Write the failing tests**

Create `src/parent/settingsClass.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { SettingsPanel } from './SettingsPanel';

const OCT_11 = () => new Date(2026, 9, 11, 9, 0);
/** The panel starts from the app's settings; saves go to the database. */
const appOn = async (over: Partial<Settings>, now = OCT_11) => {
  const app = await makeAppData({ now, settings: { ...DEFAULT_SETTINGS, placementDone: true, ...over } });
  await updateSettings(app.db, over);
  return app;
};
const shown = () => document.getElementById('st-class-now')!.textContent;

describe('Settings: where his class is (spec 2026-10-11 §8)', () => {
  it('shows the estimate; Set keeps the parent\'s lesson with the day it was set; "Use the estimate" goes back', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2026 });
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十七课 (估计)'));
    const pickLesson = screen.getByLabelText('Class lesson') as HTMLSelectElement;
    expect([...pickLesson.options].map((o) => o.textContent)).toEqual([...Array.from({ length: 10 }, (_, i) => `二上·${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `二下·${i + 11}`)]);
    expect(pickLesson.value).toBe('35');
    fireEvent.change(pickLesson, { target: { value: '33' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toEqual({ term: '二下', lesson: 15, setAt: OCT_11().getTime() }));
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十五课 (你在10月11日设定)'));
    fireEvent.click(screen.getByRole('button', { name: 'Use the estimate' }));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toBeNull());
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十七课 (估计)'));
  });
  it('choosing another school year drops the correction', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2026, classLesson: { term: '二下', lesson: 15, setAt: OCT_11().getTime() } });
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(await screen.findByLabelText('School year'), { target: { value: '3' } });
    await waitFor(async () => expect(await getSettings(app.db)).toMatchObject({ grade: 3, classLesson: null }));
  });
  it('past the lists (P4) there is no lesson to pick', async () => {
    const app = await appOn({ grade: 4, gradeYear: 2026 });
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toMatch(/^No MOE list for his school year/));
    expect(screen.queryByLabelText('Class lesson')).toBeNull();
  });
  it('past the school calendar (2028) it says the dates are missing, not the list (review focus 1)', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2028 }, () => new Date(2028, 2, 1, 9, 0));
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toMatch(/^No school calendar for 2028 yet/));
    expect(screen.queryByLabelText('Class lesson')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/parent/settingsClass.test.tsx`
Expected: FAIL — `document.getElementById('st-class-now')` is null (no such field).

- [ ] **Step 3: Implement**

Create `src/parent/ClassLessonField.tsx`:

```tsx
// Where his class is (spec 2026-10-11 §8): the calendar's estimate, or the parent's correction while it applies.
import { useState } from 'preact/hooks';
import { classLessonAt, correctionApplies, gradeTerms, LESSONS, lessonLabel, lessonName, schoolYear, termLessons } from '../content/curriculum';
import type { Settings } from '../types';

export function ClassLessonField({ settings, now, onSave }: { settings: Settings; now: Date; onSave: (patch: Partial<Settings>) => Promise<void> }) {
  const at = classLessonAt(now, settings);
  const options = gradeTerms(schoolYear(settings, now)).flatMap(termLessons);
  const [pick, setPick] = useState<number | null>(null);
  if (at === null || !options.length) {
    const why = options.length ? `No school calendar for ${now.getFullYear()} yet (src/content/schoolCalendar.ts)` : 'No MOE list for his school year';
    return <div class="field"><p class="hint" id="st-class-now">{why}: new words follow the book from 一上.</p></div>;
  }
  const setOn = correctionApplies(now, settings) ? new Date(settings.classLesson!.setAt) : null;
  const chosen = pick ?? (options.includes(at) ? at : options[0]!);
  return (
    <div class="field">
      <label for="st-class">Class lesson</label>
      <p class="hint" id="st-class-now">Class is on: {lessonName(at)} ({setOn ? `你在${setOn.getMonth() + 1}月${setOn.getDate()}日设定` : '估计'})</p>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <select id="st-class" value={String(chosen)} onChange={(e) => setPick(Number(e.currentTarget.value))}>
          {options.map((i) => <option key={i} value={String(i)}>{lessonLabel(i)}</option>)}
        </select>
        <button type="button" class="btn" onClick={() => void onSave({ classLesson: { term: LESSONS[chosen]!.term, lesson: LESSONS[chosen]!.lesson, setAt: now.getTime() } })}>Set</button>
        <button type="button" class="btn btn--secondary" disabled={!settings.classLesson} onClick={() => { setPick(null); void onSave({ classLesson: null }); }}>Use the estimate</button>
      </div>
      <p class="hint">New words each day come half from this lesson and the one before, half from what he hasn't met since 一上. The estimate spreads each semester's lessons over its school weeks; a correction holds until the next semester.</p>
    </div>
  );
}
```

`src/parent/SettingsPanel.tsx` — add the import after the curriculum import:

```ts
import { ClassLessonField } from './ClassLessonField';
```

replace

```tsx
        <select id="st-grade" value={String(schoolYear(s, now()))} onChange={(e) => void save({ grade: Number(e.currentTarget.value), gradeYear: now().getFullYear() })}>
```

with

```tsx
        <select id="st-grade" value={String(schoolYear(s, now()))} onChange={(e) => void save({ grade: Number(e.currentTarget.value), gradeYear: now().getFullYear(), classLesson: null })}>
```

and replace

```tsx
        <p class="hint">Progress compares him with the MOE lists for his term (lists go up to P3).</p>
      </div>
```

with

```tsx
        <p class="hint">Progress compares him with the MOE lists to the end of his school year (lists go up to P3).</p>
      </div>
      <ClassLessonField settings={s} now={now()} onSave={save} />
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/parent`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parent/ClassLessonField.tsx src/parent/settingsClass.test.tsx src/parent/SettingsPanel.tsx
git commit -m "feat: Settings shows where his class is (估计 or the parent's lesson), with Set and Use the estimate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Progress against his year's lists

**Files:**
- Modify: `src/parent/ProgressPanel.tsx` (whole file), `src/parent/progress.ts` (remove `currentTerm`), `src/styles.css:1347`
- Test: `src/parent/progressPanel.test.tsx`, `src/parent/progress.test.ts`

**Interfaces:**
- Consumes: `classLessonAt`, `courseOf`, `gradeTerms`, `lessonLabel`, `listedBy`, `schoolYear`, `termChars`, `termLessons` (Task 2); `hanChars`, `MOE_TERMS` (`src/content`).
- Produces: `ProgressPanel({ know, settings, now })` with `.progress__bars` → `.pbar` (`.pbar__fill`, `.pbar__mark` with `style.left`), a `role="img"` track labelled `` `${label}: ${have} of ${of}; his class is at ${mark}` ``, and `.progress__terms` rows `[term, still to read, still to write]`. `currentTerm` no longer exists.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/parent/progressPanel.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';
import { summarize } from '../stats/stats';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

const passed = (wordId: string, kind: 'recognise' | 'hear' | 'write') => ({ ...makeCard(wordId, kind, new Date()), passed: 1 });

describe('the Progress tab (spec 2026-10-06 §3.4)', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
    const know = summarize([makeWord('门')], [passed('b:门', 'recognise'), passed('b:门', 'hear')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2 }} now={new Date('2026-10-06')} />);
    expect(screen.getByText(/1 of 746/)).toBeTruthy();
    expect(screen.getByText(/Heard/)).toBeTruthy();
    expect(screen.getByText(/Owned/)).toBeTruthy();
    expect(screen.getByText('Understood in a sentence')).toBeTruthy(); // plan 2b
  });
});

describe('the Progress tab against his book (spec 2026-10-11 §8)', () => {
  const know = summarize([makeWord('门'), makeWord('介')], [passed('b:门', 'recognise'), passed('b:门', 'write'), passed('b:介', 'recognise')]);
  const show = (over = {}) => render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026, ...over }} now={new Date('2026-10-11T09:00:00')} />);
  it("targets are the end of his school year: 746 to read, and both lists' 435 to write; a character outside the book isn't counted", () => {
    show();
    expect(screen.getByText('1 of 746 by the end of 二下')).toBeTruthy();
    expect(screen.getByText('1 of 435')).toBeTruthy();
  });
  it("one course's list when the parent chose one", () => {
    show({ course: 'cl' });
    expect(screen.getByText('1 of 350')).toBeTruthy();
  });
  it('each bar has a mark where his class is now (二下·17: 707 to read, 413 to write)', () => {
    show();
    expect(screen.getByText(/where his class is now: 二下·17/)).toBeTruthy();
    const marks = [...document.querySelectorAll<HTMLElement>('.pbar__mark')].map((m) => m.style.left);
    expect(marks).toEqual(['94.8%', '94.9%']);
    expect(screen.getByRole('img', { name: '认读: 1 of 746; his class is at 707' })).toBeTruthy();
  });
  it('a row per term from 一上 to the end of his year: still to read and still to write', () => {
    show();
    const rows = [...document.querySelectorAll('.progress__terms tbody tr')].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows.map((r) => r[0])).toEqual(['一上', '一下', '二上', '二下']);
    expect(rows[0]).toEqual(['一上', '181', '89']); // 门 read and written
    expect(rows[1]).toEqual(['一下', '182', '112']);
  });
  it('past the lists (P4): plain counts, no bars, no table', () => {
    show({ grade: 4 });
    expect(document.querySelector('.pbar')).toBeNull();
    expect(document.querySelector('.progress__terms')).toBeNull();
  });
});
```

In `src/parent/progress.test.ts`, replace

```ts
import { currentTerm, weeklyTrend } from './progress';
```

with

```ts
import { weeklyTrend } from './progress';
```

and delete the test `'the school term: 上 to May, 下 from June; P1–P3 have lists'` (its job moved to `src/content/curriculum.test.ts`).

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/parent/progressPanel.test.tsx src/parent/progress.test.ts`
Expected: FAIL — `'1 of 746 by the end of 二下'` is not found (main says `2 of 746 by the end of 二下`, counting 介), `'1 of 435'` not found, no `.pbar__mark`, no `.progress__terms`.

- [ ] **Step 3: Implement**

Replace the whole of `src/parent/ProgressPanel.tsx` with:

```tsx
// What he can really do (spec 2026-10-06 §3.4), against his book's lists (spec 2026-10-11 §8): the end of his school year as the
// target, where his class is now, and what each term still asks of him. "Learned" is passed: right first answers on two days.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { classLessonAt, courseOf, gradeTerms, lessonLabel, listedBy, schoolYear, termChars, termLessons } from '../content/curriculum';
import { hanChars, MOE_TERMS } from '../content';
import type { Knowledge } from '../stats/stats';
import type { Settings } from '../types';
import { weeklyTrend } from './progress';

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;
const count = (have: ReadonlySet<string>, list: Iterable<string>) => [...list].filter((ch) => have.has(ch)).length;

/** A bar: how far he is toward his year's target, with a mark where his class is now. */
function Bar({ label, have, of, mark }: { label: string; have: number; of: number; mark: number | null }) {
  return (
    <div class="pbar">
      <span class="pbar__label">{label}</span>
      <div class="pbar__track" role="img" aria-label={`${label}: ${have} of ${of}${mark === null ? '' : `; his class is at ${mark}`}`}>
        <div class="pbar__fill" style={{ width: pct(Math.min(have, of), of) }} />
        {mark !== null && <div class="pbar__mark" style={{ left: pct(mark, of) }} />}
      </div>
      <span class="pbar__nums">{have} / {of}</span>
    </div>
  );
}

export function ProgressPanel({ know, settings, now }: { know: Knowledge; settings: Settings; now: Date }) {
  const course = courseOf(settings);
  const endTerm = gradeTerms(schoolYear(settings, now))[1];
  const end = termLessons(endTerm).at(-1);
  const target = end === undefined ? null : listedBy(end, course);
  const classAt = classLessonAt(now, settings);
  const atClass = classAt === null ? null : listedBy(classAt, course);
  const written = new Set(know.cards.filter((c) => c.kind === 'write' && c.passed).flatMap((c) => hanChars(know.wordsById.get(c.wordId)?.text ?? '')));
  const read = target ? count(know.knownChars, target.read) : know.known;
  const wrote = target ? count(written, target.write) : know.written;
  const terms = end === undefined ? [] : MOE_TERMS.slice(0, MOE_TERMS.indexOf(endTerm) + 1);
  const trend = weeklyTrend(know.cards, 'recognise', now);
  return (
    <section class="panel progress">
      <h2>Progress</h2>
      <p class="muted">A step counts only after he gets it right on two different days.</p>
      <dl class="progress__counts">
        <dt>Characters recognised</dt><dd>{target ? `${read} of ${target.read.size} by the end of ${endTerm}` : know.known}</dd>
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Understood in a sentence</dt><dd>{know.understood}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
        <dt>Used in a sentence</dt><dd>{know.used}</dd>
        <dt>Owned (every step passed)</dt><dd>{know.owned}</dd>
      </dl>
      {target && (
        <div class="progress__bars">
          {classAt !== null && <p class="muted">The mark is where his class is now: {lessonLabel(classAt)}.</p>}
          <Bar label="认读" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="写" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
        </div>
      )}
      {terms.length > 0 && (
        <table class="table progress__terms">
          <thead><tr><th>Term</th><th>Still to read</th><th>Still to write</th></tr></thead>
          <tbody>
            {terms.map((t) => {
              const c = termChars(t, course);
              return <tr key={t}><th scope="row">{t}</th><td>{c.read.filter((ch) => !know.knownChars.has(ch)).length}</td><td>{c.write.filter((ch) => !written.has(ch)).length}</td></tr>;
            })}
          </tbody>
        </table>
      )}
      <h3>Words read, week by week</h3>
      <ol class="progress__trend">{trend.map((w) => <li key={w.week}><span>{w.week}</span> <strong>{w.count}</strong></li>)}</ol>
    </section>
  );
}

/** The Progress tab: loads his cards, then the panel. */
export function ProgressTab() {
  const { db, now, settings } = useApp();
  const [know, setKnow] = useState<Knowledge | null>(null);
  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
  }, [db]);
  return know ? <ProgressPanel know={know} settings={settings} now={now()} /> : <section class="panel progress"><p class="muted">Loading…</p></section>;
}
```

Replace the whole of `src/parent/progress.ts` with:

```ts
// The parent's view of his progress against school (spec 2026-10-06 §3.4; the book's positions: src/content/curriculum.ts).
import type { CardKind, CardRecord } from '../types';

/** His school year now (P1 = 1): lives with the book's positions. */
export { schoolYear } from '../content/curriculum';

/** Rungs of one kind passed by the end of each of the last `weeks` weeks, oldest first. */
export function weeklyTrend(cards: CardRecord[], kind: CardKind, now: Date, weeks = 8): { week: string; count: number }[] {
  const passed = cards.filter((c) => c.kind === kind && c.passed).map((c) => c.passed!);
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - (weeks - 1 - i) * 7 * 86_400_000);
    return { week: `${end.getMonth() + 1}/${end.getDate()}`, count: passed.filter((t) => t <= end.getTime()).length };
  });
}
```

`src/styles.css` — after the line `.progress__trend li { display: flex; flex-direction: column; align-items: center; min-width: 44px; }` add:

```css
/* his year's lists as bars, with a mark where his class is (spec 2026-10-11 §8) */
.progress__bars { display: flex; flex-direction: column; gap: 8px; margin: 4px 0 12px; }
.pbar { display: grid; grid-template-columns: 3em 1fr auto; align-items: center; gap: 10px; }
.pbar__label { font-family: var(--hanzi); font-size: 16px; }
.pbar__track { position: relative; height: 14px; border-radius: 999px; background: var(--line); }
.pbar__fill { height: 100%; border-radius: 999px; background: var(--green); }
.pbar__mark { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--ink); }
.pbar__nums { font-weight: 700; font-variant-numeric: tabular-nums; }
.progress__terms { margin: 8px 0 12px; }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/parent src/styles.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors (nothing else imported `currentTerm`).

- [ ] **Step 5: Commit**

```bash
git add src/parent/ProgressPanel.tsx src/parent/progressPanel.test.tsx src/parent/progress.ts src/parent/progress.test.ts src/styles.css
git commit -m "feat: Progress against the end of his year's lists, a mark for his class, still-to-do per term

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 认新字 shows which lesson a word is from

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx:38-60,61,183,306-313`
- Modify: `src/app/SessionScreen.tsx:12,411-427`
- Modify: `src/styles.css` (after `.intro__card { … }` at line 216–219)
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`, `src/app/SessionScreen.test.tsx`

**Interfaces:**
- Consumes: `laneTag(lane, w)` (Task 5); `SessionPlan.newWordLanes` (Task 5).
- Produces: `FlashcardStep` prop `lessonTag?: string | null`, rendered as `<p class="intro__tag" lang="zh">` on the intro card.

- [ ] **Step 1: Write the failing tests**

Append to `src/activities/flashcards/FlashcardStep.test.tsx`:

```tsx
describe('the lesson label on the 认新字 card (spec 2026-10-11 §9)', () => {
  it('shows the label it is given, and none without one', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} lessonTag="课本 二下·17" />);
    expect(document.querySelector('.intro__card .intro__tag')?.textContent).toBe('课本 二下·17');
    cleanup();
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__tag')).toBeNull();
  });
});
```

Append inside `describe('SessionScreen', …)` in `src/app/SessionScreen.test.tsx`:

```tsx
  it('认新字 says which lesson a new word is from: 补 for catch-up (spec 2026-10-11 §9)', async () => {
    const app = await setup(); // 2026-10-02: his class is on 二下·16, so today brings 衣 (一上·1) and 茄 (二下·15)
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(introWord()).toBe('衣'));
    expect(document.querySelector('.intro__tag')?.textContent).toBe('补 一上·1');
    expect((await getSession(app.db, '2026-10-02'))!.plan.newWordLanes).toEqual({ 'b:衣': 'catchup', 'b:茄': 'school' });
  });
  it('a lesson saved before lanes resumes with no label (review focus 3)', async () => {
    const app = await setup();
    const he = byText.get('河')!;
    const saved = { ...createSessionRecord({ steps: ['newwords'], reviewWordIds: [], newWordIds: [he.id], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-02', 0), activeMs: 1 };
    await saveSession(app.db, saved);
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(introWord()).toBe('河'));
    expect(document.querySelector('.intro__tag')).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/activities/flashcards/FlashcardStep.test.tsx src/app/SessionScreen.test.tsx`
Expected: FAIL — `.intro__tag` is not rendered (`undefined` ≠ `'课本 二下·17'` and `'补 一上·1'`). The "saved before lanes" test passes already (it guards against a crash later).

- [ ] **Step 3: Implement**

`src/activities/flashcards/FlashcardStep.tsx` — in `interface Props`, after the `peek?: boolean;` line add:

```ts
  /** 认新字: the word's lesson in his book, 「课本 二下·17」 or 「补 一上·5」 (spec 2026-10-11 §9); none for a listed word */
  lessonTag?: string | null;
```

change the destructuring at line 61 to

```ts
export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, peek = false, lessonTag = null }: Props) {
```

replace (line 183)

```tsx
        {phase === 'intro' ? <Intro word={word} idiom={idiom} /> : (
```

with

```tsx
        {phase === 'intro' ? <Intro word={word} idiom={idiom} tag={lessonTag} /> : (
```

and in `function Intro`, replace

```tsx
function Intro({ word, idiom }: { word: Word; idiom: Idiom | null }) {
```

with

```tsx
function Intro({ word, idiom, tag = null }: { word: Word; idiom: Idiom | null; tag?: string | null }) {
```

and replace

```tsx
      <div class={`intro__card${idiom ? ' intro__card--idiom' : ''}`}>
        <div class="intro__head">
```

with

```tsx
      <div class={`intro__card${idiom ? ' intro__card--idiom' : ''}`}>
        {tag && <p class="intro__tag" lang="zh">{tag}</p>}
        <div class="intro__head">
```

`src/app/SessionScreen.tsx` — after line 12 (`import { FlashcardStep, introIdiom, type FlashResult } …`) add:

```ts
import { laneTag } from '../session/lanes';
```

and in the `<FlashcardStep … />` for `'flashcards' | 'newwords'`, after the `idiom={…}` line add:

```tsx
          lessonTag={step === 'newwords' ? laneTag(rec.plan.newWordLanes?.[flashWord.id], flashWord) : null} // spec 2026-10-11 §9
```

`src/styles.css` — directly after the `.intro__card { … }` rule (lines 216–219) add:

```css
/* 认新字's lesson label (spec 2026-10-11 §9): small and quiet, above the character; 16px, the smallest Chinese the fit check allows */
.intro__tag { margin: 0 0 -4px; align-self: flex-start; font-family: var(--hanzi); font-size: 16px; line-height: 1.2; color: var(--ink-soft); }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/activities/flashcards src/app`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/activities/flashcards/FlashcardStep.tsx src/activities/flashcards/FlashcardStep.test.tsx src/app/SessionScreen.tsx src/app/SessionScreen.test.tsx src/styles.css
git commit -m "feat: 认新字 labels a new word 课本 (his class's lesson) or 补 (catch-up)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: WebKit screenshots, full suite, build

**Files:**
- Modify: `scripts/fit-check.ts` (a `snap` helper after `check`; a `parent` flow after `placement-rerun`)

**Interfaces:**
- Consumes: everything above; `#st-class-now` (Task 7), `.progress__bars` (Task 8), `.intro__tag` (Task 9).
- Produces: `fit-shots/<size>/parent-settings.png`, `fit-shots/<size>/parent-progress.png`; the existing `newwords-*` shots now show the label.

- [ ] **Step 1: Add the parent screenshots**

`scripts/fit-check.ts` — after the `check` function, add:

```ts
/** A screenshot only (spec 2026-10-11 §10): the parent area scrolls and isn't held to the child screens' fit rules. */
async function snap(page: Page, size: Size, name: string, selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  mkdirSync(`${OUT}/${size.name}`, { recursive: true });
  await page.screenshot({ path: `${OUT}/${size.name}/${name}.png` });
}
```

and directly after the `placement-rerun` `run(…)` block (it defines `FIT_PIN`), add:

```ts
  // the parent's class lesson and Progress against the lists (spec 2026-10-11 §8), in WebKit
  await run('parent', AFTERNOON, { pinCode: FIT_PIN }, async (p) => {
    await tabTo(p, '家长');
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    await p.click('.tab:has-text("Settings")');
    await p.waitForSelector('#st-class-now');
    await snap(p, size, 'parent-settings', '#st-class-now');
    await p.click('.tab:has-text("Progress")');
    await p.waitForSelector('.progress__bars');
    await snap(p, size, 'parent-progress', '.progress__bars');
  });
```

- [ ] **Step 2: Run the WebKit flows this change touches**

Run: `npx vite build && FIT_ONLY='^(newwords|parent|home|lesson)$' npx tsx scripts/fit-check.ts`
Expected: exit 0, `… screens checked, 0 with problems`. If it exits 2 ("WebKit is missing"), stop and ask the user before running `npx playwright-core install webkit` (~100 MB). Open `fit-shots/iphone-se/newwords-00.png` (the label above the character, not overlapping it), `fit-shots/ipad-landscape/parent-settings.png` (「Class is on: 二下 第十七课 (估计)」 — the sweep's clock is 2026-10-06) and `fit-shots/ipad-landscape/parent-progress.png` (two bars with a mark near the right end). If `newwords` reports `content cut off` or a stage change on the smallest phone, the label is the cause: change `.intro__tag` to `position: absolute; top: 4px; left: 8px;` and add `position: relative;` to `.intro__card`, then run this step again.

- [ ] **Step 3: Run the whole WebKit sweep, the full suite and the build**

Run: `npm run fit`
Expected: exit 0 (fit sweep, stage cases and story walk all clean).

Run: `npx vitest run`
Expected: 0 failed (1657 at baseline plus this plan's new tests).

Run: `npm run build`
Expected: `tsc --noEmit` clean and a Vite build with no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/fit-check.ts
git commit -m "test: WebKit screenshots of the class lesson setting and Progress against the lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`fit-shots/` is gitignored; leave the working tree clean (`git status` shows nothing).
