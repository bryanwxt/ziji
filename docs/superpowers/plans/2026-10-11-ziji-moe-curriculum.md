# ZiJi follows the school curriculum: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New words follow the 欢乐伙伴2.0 lists in two lanes: his class's lesson, plus catch-up from 一上. 写一写 writes what school asks him to write. The parent sees progress against the MOE lists.

**Architecture:**
- A build script turns the committed MOE PDFs into `src/content/moe.json`.
- A pure `src/content/curriculum.ts` answers "where is this character in the book" and "which lesson is his class on".
- A pure `src/session/lanes.ts` picks the day's new words. `plan.ts` and `writing.ts` consult both.
- The parent UI (Settings 学校 section, Overview progress section) and the 认新字 card label read from the same modules.

**Tech Stack:** Vite + TypeScript + Preact, vitest + @testing-library/preact, fake-indexeddb, tsx for scripts, `pdfjs-dist@4` (new dev dependency, build-time only).

**Spec:** `docs/superpowers/specs/2026-10-11-ziji-moe-curriculum-design.md`

## Global Constraints

- **Tracks:** both 华文 and 高级华文. He recognises every listed character and writes the union of `writeCL` and `writeHCL`.
- **Lesson numbers follow the book.** 一上 L1–10, 一下 L11–19, 二上 L1–10, 二下 L11–19, 三上 L1–9, 三下 L10–17. Read them from the data and never assume them.
- **School lane:** `ceil(remaining / 2)` new words, which is at least 1 when anything remains. It covers the class lesson and the one before it, and never takes anything ahead of the class lesson.
- **Front of the queue is unchanged:** words with `listedAt` set come first and use up `n` before the lanes do.
- **Calendar (2026):** T1 2026-01-02–03-13, T2 03-23–05-29, T3 06-29–09-04, T4 09-14–11-20.
- **Calendar (2027):** T1 2027-01-04–03-12, T2 03-22–05-28, T3 06-28–09-03, T4 09-13–11-19.
- **Semesters:** 上 = Semester I (T1–T2), 下 = Semester II (T3–T4).
- **School setting:** `settings.school` defaults to `{ grade: 2, year: 2026 }`. The grade is `grade + (calendar year − year)`.
- **Class-lesson correction:** `settings.classLesson = { term, lesson, setAt } | null`. It lapses at the next semester.
- **Writeability only grows.** Characters that already have write cards keep them, and parent words keep their own `writeable`.
- **"Learned" in this release** means a correct answer on two or more separate local days, read from `ReviewLog`: the `recognise` card for 认读 and the `write` card for 书写.
- **Card label:** 「课本 二下·17」 for the school lane, 「补 一上·5」 for catch-up or spill-over. Words at the front of the queue, and saved sessions without `newWordLanes`, show no label.
- **No migration of cards or logs.** `newWordLanes` is optional on `SessionPlan`.
- **Code style:** match the codebase's style, which means terse doc comments that cite the spec ("spec 2026-10-11 §5"), named exports and no default exports.
- **WebKit:** UI changes are checked in WebKit as well as Chromium (the iPad runs Safari).

## Review Focus

1. **A date outside the calendar** (2025 or 2028) or a grade with no lists (P4): `currentLessonIndex` returns `null`. The school lane is then empty, catch-up still runs, and nothing throws. Owned by Task 2 and Task 4.
2. **A correction set last semester:** it is ignored and the estimate is used. Owned by Task 2.
3. **Everything listed already started, or `n` larger than all candidates:** the pick falls through to HSK rank, never returns duplicates, and may return fewer than `n`. Owned by Task 4.
4. **A session saved before this release** (no `newWordLanes`): the 认新字 card renders with no label. Owned by Task 8.
5. **A built-in MOE character pulled forward by a parent list** (`listedAt` set): it is taken once, from the front of the queue, with no lane label. It is never picked again by a lane. Owned by Task 4.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `scripts/moe-lib.ts` | new | Pure parse of one PDF page's positioned text items into a term and its lessons |
| `scripts/moe-lib.test.ts` | new | Parser tests on real coordinates |
| `scripts/build-moe.ts` | new | Reads the two PDFs with pdfjs and writes `src/content/moe.json` |
| `scripts/check-moe.test.ts` | new | Data checks on `moe.json` and on built-in coverage |
| `src/content/moe.json` | new, generated | Lessons with `recognise`, `writeCL`, `writeHCL` |
| `src/content/schoolCalendar.ts` | new | MOE term dates per year. Kept as hand-maintained TS rather than inside the generated `moe.json` (a refinement of spec §3: still a data edit, and the generator never has to carry it) |
| `src/content/curriculum.ts` (+ `.test.ts`) | new | `taughtAt`, `writeAt`, labels, `currentLessonIndex`, `moeWriteable`, `laneTag` |
| `src/types.ts` | modify | `Term`, `Settings.school`, `Settings.classLesson`, `SessionPlan.newWordLanes` |
| `scripts/content-lib.ts` (+ test) | modify | `extraChars` and `moePos` inputs to `buildBuiltin` |
| `scripts/build-content.ts` | modify | Passes the MOE inputs through |
| `scripts/check-content.ts` | modify | Level 7 may hold more than 1,200 characters (the MOE extras) |
| `src/content/builtin.json`, `hskwords.json`, `glossary.json` | regenerated | |
| `src/content/index.ts` | modify | `CONTENT_VERSION` bump |
| `src/session/lanes.ts` (+ `.test.ts`) | new | `pickNewWords` |
| `src/session/plan.ts` (+ test) | modify | Uses lanes, `newWordLanes`, MOE writeability |
| `src/session/writing.ts` (+ test) | modify | `writeable` and `inReach` predicates |
| `src/stats/moeProgress.ts` (+ `.test.ts`) | new | Learned sets, bars, per-term table |
| `src/parent/Dashboard.tsx` | modify | "Progress vs MOE" section |
| `src/parent/SettingsPanel.tsx` | modify | 学校 section |
| `src/activities/flashcards/FlashcardStep.tsx`, `src/app/SessionScreen.tsx`, `src/styles.css` | modify | 认新字 label |
| `package.json` | modify | `pdfjs-dist` dev dependency and the `moe` script |

---

### Task 1: MOE list generator and `moe.json`

**Files:**
- Create: `scripts/moe-lib.ts`, `scripts/moe-lib.test.ts`, `scripts/build-moe.ts`, `scripts/check-moe.test.ts`, `src/content/moe.json` (generated)
- Modify: `package.json` (devDependency `pdfjs-dist@^4.10.38`, script `"moe": "tsx scripts/build-moe.ts"`)

**Interfaces:**
- Produces: `src/content/moe.json` of shape `{ version: 1, source: string, lessons: MoeLesson[] }` with `MoeLesson = { term: Term; lesson: number; recognise: string[]; writeCL: string[]; writeHCL: string[] }`, in book order (1A L1 … 3B L17).
- Produces (scripts): `parseMoePage(items: PdfItem[]): { term: Term; lessons: { lesson: number; recognise: string[]; write: string[] }[] }`, `cnNumber(s: string): number`, `type PdfItem = { s: string; x: number; y: number }`.

Facts from probing the PDFs (pdfjs `getTextContent`, `x = transform[4]`, `y = transform[5]`):
- There is one page per term. Header items sit at y ≥ 620: the title at y≈682, the term name (`一上`…`三下`) at y≈661, and the column heads `课次`/`识读字`/`识写字` at y≈624.
- Lesson labels `第…课` sit at x 55–62. Recognise text sits at x≈120, and write text at x≈359.
- A lesson's rows lie within ±11 of its label's y, so assign each text item to the label with the nearest y. Items are space-separated characters, and a row can wrap.

- [ ] **Step 1: Install the dependency and add the script**

```bash
npm i -D pdfjs-dist@^4.10.38
npm pkg set scripts.moe="tsx scripts/build-moe.ts"
```

- [ ] **Step 2: Write the failing parser test** (`scripts/moe-lib.test.ts`)

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cnNumber, parseMoePage, type PdfItem } from './moe-lib';

// real coordinates from 2024-cl.pdf page 1 (一上), first two lessons
const PAGE: PdfItem[] = [
  { s: '《欢乐伙伴2.0》小学华文生字表', x: 148, y: 682 }, { s: '一上', x: 248, y: 661 },
  { s: '课次', x: 66, y: 624 }, { s: '识读字', x: 215, y: 624 }, { s: '识写字', x: 407, y: 624 },
  { s: '第一课', x: 62, y: 587 }, { s: '衣 鱼 雨 一 二 五 耳 牙 口 人', x: 120, y: 586 }, { s: '一 二 五 口 人', x: 359, y: 586 },
  { s: '第二课', x: 62, y: 541 }, { s: '木 土 马 八 巴 你 我 也 他 弟 不 爸', x: 120, y: 551 }, { s: '她 妈 的 父 母 女 儿', x: 120, y: 530 },
  { s: '木 土 八 也 不 女 儿', x: 359, y: 551 },
];

describe('parseMoePage', () => {
  it('reads the term and splits each lesson into recognise and write by column', () => {
    const page = parseMoePage(PAGE);
    expect(page.term).toBe('1A');
    expect(page.lessons).toEqual([
      { lesson: 1, recognise: Array.from('衣鱼雨一二五耳牙口人'), write: Array.from('一二五口人') },
      { lesson: 2, recognise: Array.from('木土马八巴你我也他弟不爸她妈的父母女儿'), write: Array.from('木土八也不女儿') },
    ]);
  });
  it('keeps a character such as 课 inside a row (only a whole 第…课 item is a lesson label)', () => {
    const page = parseMoePage([...PAGE.slice(0, 5), { s: '第十七课', x: 55, y: 500 }, { s: '乐 课 台', x: 120, y: 500 }, { s: '课', x: 359, y: 500 }]);
    expect(page.lessons[0]).toEqual({ lesson: 17, recognise: ['乐', '课', '台'], write: ['课'] });
  });
  it('throws on a page with no term name', () => {
    expect(() => parseMoePage(PAGE.filter((i) => i.s !== '一上'))).toThrow(/term/);
  });
});

describe('cnNumber', () => {
  it.each([['一', 1], ['九', 9], ['十', 10], ['十一', 11], ['十九', 19]])('%s → %i', (s, n) => expect(cnNumber(s)).toBe(n));
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run scripts/moe-lib.test.ts`
Expected: FAIL, because `./moe-lib` cannot be resolved.

- [ ] **Step 4: Implement `scripts/moe-lib.ts`**

```ts
import type { Term } from '../src/types';

/** A positioned text item from pdfjs getTextContent: x = transform[4], y = transform[5]. */
export interface PdfItem { s: string; x: number; y: number }

const TERMS: Record<string, Term> = { 一上: '1A', 一下: '1B', 二上: '2A', 二下: '2B', 三上: '3A', 三下: '3B' };
const DIGITS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const HEADER_Y = 600; // title, term name and column heads sit above this (spec 2026-10-11 §3)
const WRITE_X = 300; // 识读字 text starts at x≈120, 识写字 at x≈359
const LABEL = /^第(.+)课$/;
const HAN = /\p{Script=Han}/u;

/** 一…十九 → 1…19. */
export function cnNumber(s: string): number {
  if (s === '十') return 10;
  if (s.startsWith('十')) return 10 + DIGITS[s[1]!]!;
  if (s.endsWith('十')) return DIGITS[s[0]!]! * 10;
  if (s.length === 1) return DIGITS[s]!;
  return DIGITS[s[0]!]! * 10 + DIGITS[s[2]!]!;
}

/** One page of a 《欢乐伙伴2.0》生字表 (one term): each text item goes to the lesson label nearest it in height. */
export function parseMoePage(items: PdfItem[]): { term: Term; lessons: { lesson: number; recognise: string[]; write: string[] }[] } {
  const termItem = items.find((i) => i.y >= HEADER_Y && TERMS[i.s.trim()]);
  if (!termItem) throw new Error('No term name (一上…三下) on the page');
  const body = items.filter((i) => i.y < HEADER_Y && i.s.trim());
  const labels = body.filter((i) => LABEL.test(i.s.trim())).map((i) => ({ y: i.y, lesson: cnNumber(LABEL.exec(i.s.trim())![1]!), recognise: [] as string[], write: [] as string[] }));
  for (const i of body) {
    if (LABEL.test(i.s.trim())) continue;
    const near = labels.reduce((a, b) => (Math.abs(b.y - i.y) < Math.abs(a.y - i.y) ? b : a));
    (i.x >= WRITE_X ? near.write : near.recognise).push(...Array.from(i.s).filter((c) => HAN.test(c)));
  }
  labels.sort((a, b) => b.y - a.y); // top of the page first
  return { term: TERMS[termItem.s.trim()]!, lessons: labels.map(({ lesson, recognise, write }) => ({ lesson, recognise, write })) };
}
```

Add `export type Term = '1A' | '1B' | '2A' | '2B' | '3A' | '3B';` to `src/types.ts`, next to `Level`, with the doc comment `/** A 欢乐伙伴2.0 term: 1A = 一上 … 3B = 三下 (spec 2026-10-11 §3). */`.

- [ ] **Step 5: Run the parser test and confirm it passes**

Run: `npx vitest run scripts/moe-lib.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Write `scripts/build-moe.ts`**

```ts
// Builds src/content/moe.json from the MOE 《欢乐伙伴2.0》生字表 PDFs in scripts/moe/sources (spec 2026-10-11 §3). Usage: npm run moe
import { readFile, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseMoePage, type PdfItem } from './moe-lib';

async function pages(name: string) {
  const data = new Uint8Array(await readFile(new URL(`./moe/sources/${name}`, import.meta.url)));
  const doc = await getDocument({ data }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const items: PdfItem[] = (tc.items as { str: string; transform: number[] }[]).map((i) => ({ s: i.str, x: Math.round(i.transform[4]!), y: Math.round(i.transform[5]!) }));
    out.push(parseMoePage(items));
  }
  return out;
}

const cl = await pages('2024-cl.pdf');
const hcl = await pages('2024-hcl.pdf');
const lessons = cl.flatMap((page, p) => page.lessons.map((l, i) => {
  const h = hcl[p]?.lessons[i];
  if (!h || hcl[p]!.term !== page.term || h.lesson !== l.lesson) throw new Error(`CL and HCL disagree at ${page.term} L${l.lesson}`);
  if (h.recognise.join('') !== l.recognise.join('')) throw new Error(`Recognise lists differ at ${page.term} L${l.lesson}`);
  return { term: page.term, lesson: l.lesson, recognise: l.recognise, writeCL: l.write, writeHCL: h.write };
}));
const out = { version: 1, source: 'MOE 《欢乐伙伴2.0》小学华文 / 小学高级华文生字表 (2024), P1–P3', lessons };
await writeFile(new URL('../src/content/moe.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
const seen = new Set(lessons.flatMap((l) => l.recognise));
console.log(`Wrote ${lessons.length} lessons, ${seen.size} characters`);
```

- [ ] **Step 7: Generate the data**

Run: `npm run moe`
Expected: `Wrote 55 lessons, 1031 characters`, which is 10+9+10+9+9+8 lessons. If the character count differs, the parse is wrong, so fix the parse and keep the number. `1031` is MOE's cumulative end-3B count from the research notes.

- [ ] **Step 8: Write the data checks** (`scripts/check-moe.test.ts`)

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import moe from '../src/content/moe.json';

const lessons = moe.lessons;
const lastOf = (term: string) => lessons.map((l) => l.term).lastIndexOf(term); // the tsconfig lib is ES2022: no findLastIndex
const upTo = (term: string) => lessons.slice(0, lastOf(term) + 1);
const distinct = (ls: typeof lessons) => new Set(ls.flatMap((l) => l.recognise)).size;

describe('moe.json (spec 2026-10-11 §11)', () => {
  it('has every term in book order with the book lesson numbers', () => {
    const shape = ['1A', '1B', '2A', '2B', '3A', '3B'].map((t) => lessons.filter((l) => l.term === t).map((l) => l.lesson));
    expect(shape.map((s) => [s[0], s.at(-1), s.length])).toEqual([[1, 10, 10], [11, 19, 9], [1, 10, 10], [11, 19, 9], [1, 9, 9], [10, 17, 8]]);
  });
  it('reaches 746 characters at the end of 2B and 1,031 at the end of 3B', () => {
    expect(distinct(upTo('2B'))).toBe(746);
    expect(distinct(upTo('3B'))).toBe(1031);
  });
  it('gives every lesson characters to recognise', () => {
    expect(lessons.filter((l) => l.recognise.length === 0)).toEqual([]);
  });
  it('only asks him to write a character he met at or before that lesson', () => {
    const met = new Set<string>();
    const early: string[] = [];
    for (const l of lessons) {
      l.recognise.forEach((c) => met.add(c));
      for (const c of [...l.writeCL, ...l.writeHCL]) if (!met.has(c)) early.push(`${l.term} L${l.lesson} ${c}`);
    }
    expect(early).toEqual([]);
  });
  it('matches the printed list for 一上 第一课', () => {
    expect(lessons[0]).toEqual({ term: '1A', lesson: 1, recognise: Array.from('衣鱼雨一二五耳牙口人'), writeCL: Array.from('一二五口人'), writeHCL: Array.from('一二五口人') });
  });
  it('has 高级华文 writing at least as wide as 华文 by the end of 2B', () => {
    const cl = new Set(upTo('2B').flatMap((l) => l.writeCL));
    const hcl = new Set(upTo('2B').flatMap((l) => l.writeHCL));
    expect(cl.size).toBeGreaterThanOrEqual(340);
    expect(hcl.size).toBeGreaterThan(cl.size);
  });
});
```

`write-only character first met in the same lesson` is allowed by the "at or before" wording, because `met` is filled before the write check.

- [ ] **Step 9: Run the checks**

Run: `npx vitest run scripts/check-moe.test.ts scripts/moe-lib.test.ts`
Expected: PASS. If "only asks him to write a character he met" fails, look the failing lesson up in the PDF. If the PDF really lists the character for writing before recognising it, add a note to the test with the page number and exclude that exact pair. Do not loosen the rule in general.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json scripts/moe-lib.ts scripts/moe-lib.test.ts scripts/build-moe.ts scripts/check-moe.test.ts src/content/moe.json src/types.ts
git commit -m "feat: the 欢乐伙伴2.0 生字表 (华文 and 高级华文, P1–P3) as data, built from MOE's PDFs"
```

---

### Task 2: `curriculum.ts`: book positions, school calendar, class lesson

**Files:**
- Create: `src/content/schoolCalendar.ts`, `src/content/curriculum.ts`, `src/content/curriculum.test.ts`
- Modify: `src/types.ts` (Settings fields and defaults)

**Interfaces:**
- Consumes: `src/content/moe.json` (Task 1) and `Term` (Task 1).
- Produces:
  - `LESSONS: MoeLesson[]`
  - `taughtAt(ch: string): number | null` and `writeAt(ch: string): number | null`. Both return an index into `LESSONS`.
  - `lessonLabel(i: number): string`, for example `'二下·17'`
  - `lessonName(i: number): string`, for example `'二下 第十七课'`
  - `termName(t: Term): string`
  - `lessonIndex(term: Term, lesson: number): number | null`
  - `termsOfGrade(grade: number): Term[]`
  - `gradeOn(now: Date, school: SchoolSetting): number`
  - `currentLessonIndex(now: Date, s: Pick<Settings, 'school' | 'classLesson'>): number | null`
  - `estimatedLessonIndex(now: Date, school: SchoolSetting): number | null`
  - `moeWriteable(ch: string, classIndex: number | null, started: boolean): boolean`
  - `laneTag(word: Word, lane: Lane | undefined): string | undefined`
  - `correctionApplies(now: Date, s: Pick<Settings, 'school' | 'classLesson'>): boolean`
  - In `types.ts`: `interface SchoolSetting { grade: number; year: number }`, `type Lane = 'school' | 'catchup'`, `Settings.school?: SchoolSetting`, `Settings.classLesson?: { term: Term; lesson: number; setAt: number } | null`

- [ ] **Step 1: Add the types and defaults** (`src/types.ts`)

```ts
/** His school year as the parent set it; the grade moves up each January (spec 2026-10-11 §7). */
export interface SchoolSetting { grade: number; year: number }
/** Which lane brought a new word (spec 2026-10-11 §5). */
export type Lane = 'school' | 'catchup';
```

In `Settings` add:
```ts
  school?: SchoolSetting; // spec 2026-10-11 §7
  classLesson?: { term: Term; lesson: number; setAt: number } | null; // the parent's correction of the estimate; lapses at the next semester
```

In `DEFAULT_SETTINGS` add `school: { grade: 2, year: 2026 },`.

In `SessionPlan` add `newWordLanes?: Record<string, Lane>; // spec 2026-10-11 §5; absent on lessons saved before it`.

- [ ] **Step 2: Write `src/content/schoolCalendar.ts`**

```ts
/** MOE primary school terms (spec 2026-10-11 §3): four [start, end] local dates a year. Adding a year is a data edit. */
export const SCHOOL_YEARS: Record<number, [string, string][]> = {
  2026: [['2026-01-02', '2026-03-13'], ['2026-03-23', '2026-05-29'], ['2026-06-29', '2026-09-04'], ['2026-09-14', '2026-11-20']],
  2027: [['2027-01-04', '2027-03-12'], ['2027-03-22', '2027-05-28'], ['2027-06-28', '2027-09-03'], ['2027-09-13', '2027-11-19']],
};
```

- [ ] **Step 3: Write the failing tests** (`src/content/curriculum.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { correctionApplies, currentLessonIndex, gradeOn, laneTag, lessonIndex, lessonLabel, lessonName, moeWriteable, taughtAt, writeAt } from './curriculum';

const school = { grade: 2, year: 2026 };
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0);
const label = (i: number | null) => (i === null ? null : lessonLabel(i));

describe('book positions', () => {
  it('knows where a character is first taught and first written', () => {
    expect(label(taughtAt('衣'))).toBe('一上·1');
    expect(label(writeAt('一'))).toBe('一上·1');
    expect(writeAt('衣')).toBeGreaterThan(taughtAt('衣')!); // 衣 is read in L1, written later
    expect(taughtAt('龘')).toBeNull();
  });
  it('names lessons the way the book does', () => {
    expect(lessonName(lessonIndex('2B', 17)!)).toBe('二下 第十七课');
    expect(lessonIndex('2B', 3)).toBeNull(); // 二下 starts at L11
  });
});

describe('class lesson from the calendar (spec 2026-10-11 §7)', () => {
  it.each([
    [at(2026, 1, 2), '二上·1'],
    [at(2026, 6, 10), '二上·10'], // June holidays: the semester just ended
    [at(2026, 8, 1), '二下·13'],
    [at(2026, 10, 11), '二下·17'],
    [at(2026, 12, 1), '二下·19'], // year-end holidays
    [at(2027, 1, 6), '三上·1'], // a new school year: P3
  ])('%s → %s', (now, want) => expect(label(currentLessonIndex(now, { school }))).toBe(want));

  it('is unknown outside the calendar and for grades without lists', () => {
    expect(currentLessonIndex(at(2028, 3, 1), { school })).toBeNull();
    expect(currentLessonIndex(at(2026, 3, 1), { school: { grade: 4, year: 2026 } })).toBeNull();
  });
  it('moves the grade up each January', () => {
    expect(gradeOn(at(2027, 2, 1), school)).toBe(3);
  });
  it("carries the parent's correction forward at the calendar's pace", () => {
    const classLesson = { term: '2B' as const, lesson: 15, setAt: at(2026, 10, 1).getTime() };
    expect(label(currentLessonIndex(at(2026, 10, 11), { school, classLesson }))).toBe('二下·16');
  });
  it('says whether a correction applies this semester', () => {
    const classLesson = { term: '2B' as const, lesson: 15, setAt: at(2026, 10, 1).getTime() };
    expect(correctionApplies(at(2026, 10, 11), { school, classLesson })).toBe(true);
    expect(correctionApplies(at(2027, 1, 6), { school, classLesson })).toBe(false);
    expect(correctionApplies(at(2026, 10, 11), { school, classLesson: null })).toBe(false);
  });
  it('drops a correction made in an earlier semester', () => {
    const classLesson = { term: '2A' as const, lesson: 4, setAt: at(2026, 6, 10).getTime() };
    expect(label(currentLessonIndex(at(2026, 10, 11), { school, classLesson }))).toBe('二下·17');
  });
});

describe('moeWriteable (spec 2026-10-11 §6)', () => {
  it('is writeable once the class has reached its write lesson, or once he has started it', () => {
    const now = currentLessonIndex(at(2026, 10, 11), { school })!;
    expect(moeWriteable('一', now, false)).toBe(true);
    expect(moeWriteable('衣', 0, false)).toBe(false); // class at 一上·1, 衣 written later
    expect(moeWriteable('衣', 0, true)).toBe(true);
    expect(moeWriteable('龘', now, true)).toBe(false); // not on the write lists
  });
});

describe('laneTag (spec 2026-10-11 §9)', () => {
  it('labels the school and catch-up lanes with the book lesson', () => {
    expect(laneTag(makeWord('衣'), 'catchup')).toBe('补 一上·1');
    expect(laneTag(makeWord('衣'), 'school')).toBe('课本 一上·1');
    expect(laneTag(makeWord('衣'), undefined)).toBeUndefined();
    expect(laneTag(makeWord('龘'), 'catchup')).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run them and confirm they fail**

Run: `npx vitest run src/content/curriculum.test.ts`
Expected: FAIL, because `./curriculum` cannot be resolved.

- [ ] **Step 5: Implement `src/content/curriculum.ts`**

```ts
// Where a character sits in 欢乐伙伴2.0 and which lesson his class is on (spec 2026-10-11 §3, §6, §7).
import moe from './moe.json';
import { SCHOOL_YEARS } from './schoolCalendar';
import { localDateKey } from '../lib/date';
import type { Lane, SchoolSetting, Settings, Term, Word } from '../types';

export interface MoeLesson { term: Term; lesson: number; recognise: string[]; writeCL: string[]; writeHCL: string[] }
export const LESSONS: MoeLesson[] = (moe as unknown as { lessons: MoeLesson[] }).lessons;

const TERM_NAMES: Record<Term, string> = { '1A': '一上', '1B': '一下', '2A': '二上', '2B': '二下', '3A': '三上', '3B': '三下' };
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const cn = (n: number) => (n < 10 ? CN[n]! : n === 10 ? '十' : n < 20 ? `十${CN[n - 10]}` : `${CN[Math.floor(n / 10)]}十${CN[n % 10]}`);

const taught = new Map<string, number>();
const writes = new Map<string, number>();
LESSONS.forEach((l, i) => {
  for (const c of l.recognise) if (!taught.has(c)) taught.set(c, i);
  for (const c of [...l.writeCL, ...l.writeHCL]) if (!writes.has(c)) writes.set(c, i); // both tracks (spec §2)
});

export const taughtAt = (ch: string): number | null => taught.get(ch) ?? null;
export const writeAt = (ch: string): number | null => writes.get(ch) ?? null;
export const termName = (t: Term): string => TERM_NAMES[t];
export const lessonLabel = (i: number): string => `${TERM_NAMES[LESSONS[i]!.term]}·${LESSONS[i]!.lesson}`;
export const lessonName = (i: number): string => `${TERM_NAMES[LESSONS[i]!.term]} 第${cn(LESSONS[i]!.lesson)}课`;
export function lessonIndex(term: Term, lesson: number): number | null {
  const i = LESSONS.findIndex((l) => l.term === term && l.lesson === lesson);
  return i < 0 ? null : i;
}
const lessonsOf = (term: Term): number[] => LESSONS.flatMap((l, i) => (l.term === term ? [i] : []));
/** The terms a grade has lists for: [] from P4 until 2.0 lists exist (spec §12). */
export const termsOfGrade = (grade: number): Term[] => (['A', 'B'] as const).map((h) => `${grade}${h}` as Term).filter((t) => t in TERM_NAMES);

export const gradeOn = (now: Date, school: SchoolSetting): number => school.grade + (now.getFullYear() - school.year);

const dayNo = (key: string) => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 86_400_000;
/** How far through its semester a day is (0–1), teaching days only; holidays hold the last value (spec §7). */
function semesterAt(now: Date): { year: number; half: 0 | 1; frac: number } | null {
  const terms = SCHOOL_YEARS[now.getFullYear()];
  if (!terms) return null;
  const day = dayNo(localDateKey(now));
  const through = (ranges: [string, string][]) => {
    let total = 0, done = 0;
    for (const [s, e] of ranges) {
      const a = dayNo(s), b = dayNo(e);
      total += b - a + 1;
      done += Math.max(0, Math.min(day, b) - a + 1);
    }
    return done / total;
  };
  const year = now.getFullYear();
  if (day < dayNo(terms[2]![0])) return { year, half: 0, frac: through(terms.slice(0, 2)) };
  return { year, half: 1, frac: through(terms.slice(2)) };
}

function place(now: Date, school: SchoolSetting) {
  const sem = semesterAt(now);
  if (!sem) return null;
  const term = termsOfGrade(gradeOn(now, school))[sem.half];
  if (!term) return null;
  const list = lessonsOf(term);
  return { sem, term, list, step: Math.min(list.length - 1, Math.floor(sem.frac * list.length)) };
}

/** The calendar's guess: the semester's lessons spread evenly over its teaching days. */
export function estimatedLessonIndex(now: Date, school: SchoolSetting): number | null {
  const p = place(now, school);
  return p ? p.list[p.step]! : null;
}

/** The parent's correction and where it stands, if it was made this semester (it lapses at the next, spec §7). */
function correction(now: Date, s: Pick<Settings, 'school' | 'classLesson'>) {
  const school = s.school ?? { grade: 2, year: 2026 };
  const p = place(now, school);
  const fix = s.classLesson;
  if (!p || !fix) return null;
  const base = lessonIndex(fix.term, fix.lesson);
  const then = place(new Date(fix.setAt), school);
  if (base === null || !then || then.sem.year !== p.sem.year || then.sem.half !== p.sem.half) return null;
  return { p, then, base, list: lessonsOf(fix.term) };
}

/** Does the parent's correction still apply? (Settings shows 你在…设定 rather than 估计.) */
export const correctionApplies = (now: Date, s: Pick<Settings, 'school' | 'classLesson'>): boolean => correction(now, s) !== null;

/** His class's lesson today: the parent's correction carried forward this semester, otherwise the estimate. */
export function currentLessonIndex(now: Date, s: Pick<Settings, 'school' | 'classLesson'>): number | null {
  const c = correction(now, s);
  if (c) return c.list[Math.min(c.list.length - 1, Math.max(0, c.list.indexOf(c.base) + c.p.step - c.then.step))]!;
  return estimatedLessonIndex(now, s.school ?? { grade: 2, year: 2026 });
}

/** May he write this character yet? Once his class has reached its write lesson, or once a lane has brought it (spec §6). */
export function moeWriteable(ch: string, classIndex: number | null, started: boolean): boolean {
  const at = writeAt(ch);
  return at !== null && (started || (classIndex !== null && at <= classIndex));
}

/** The 认新字 card's label (spec §9): 课本 for the school lane, 补 for catch-up. */
export function laneTag(word: Word, lane: Lane | undefined): string | undefined {
  const at = word.source === 'builtin' ? taughtAt(word.text) : null;
  if (!lane || at === null) return undefined;
  return `${lane === 'school' ? '课本' : '补'} ${lessonLabel(at)}`;
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx vitest run src/content/curriculum.test.ts`
Expected: PASS. Each expected lesson in Step 3 was worked out by hand from the term dates. For example, on 2026-10-11 there have been 96 of 136 teaching days, and `floor(96/136 × 9) = 6`, which is 二下 L17. If a case fails, recheck the day counting before changing an expectation.

- [ ] **Step 7: Commit**

```bash
git add src/content/schoolCalendar.ts src/content/curriculum.ts src/content/curriculum.test.ts src/types.ts
git commit -m "feat: where each character sits in 欢乐伙伴2.0, and which lesson his class is on from the school calendar"
```

---

### Task 3: Built-in content follows the book (missing characters, readable 组词)

**Files:**
- Modify: `scripts/content-lib.ts`, `scripts/content-lib.test.ts`, `scripts/build-content.ts`, `scripts/check-content.ts`, `scripts/check-moe.test.ts`, `src/content/index.ts` (`CONTENT_VERSION`), and the test that pins the content hash (`src/content/readingFixes.test.ts`)
- Regenerate: `src/content/builtin.json`, `src/content/hskwords.json`, `src/content/glossary.json`

**Interfaces:**
- Consumes: `src/content/moe.json` (Task 1).
- Produces: `BuildInput.extraChars?: string[]` and `BuildInput.moePos?: ReadonlyMap<string, number>`. Every MOE character is in `BUILTIN`.

- [ ] **Step 1: Write the failing tests** (append to `scripts/content-lib.test.ts`; import `buildBuiltin` if the file doesn't yet)

```ts
describe('buildBuiltin and the school book (spec 2026-10-11 §4)', () => {
  const entry = (character: string) => ({ character, pinyin: ['x'], decomposition: '？', radical: character, matches: [[0]], definition: 'thing' });
  const base = {
    hskChars: new Map([['一级汉字表', ['大', '人', '天']]]),
    hskWords: new Map([['一级词汇表', ['1 天人', '2 大人']]]),
    dictionary: new Map(['大', '人', '蚂', '蚁', '天'].map((c) => [c, entry(c)])),
    pinyinOf: (t: string) => Array.from(t).map(() => 'x').join(' '),
  };
  it('adds book characters HSK lacks, after the HSK ones, at level 7, once each', () => {
    const out = buildBuiltin({ ...base, extraChars: ['蚂', '蚁', '大'] });
    expect(out.slice(-2).map((c) => [c.char, c.level])).toEqual([['蚂', 7], ['蚁', 7]]);
    expect(out.filter((c) => c.char === '大')).toHaveLength(1);
  });
  it('puts a 组词 he can read ahead of one HSK lists first', () => {
    const moePos = new Map([['大', 0], ['人', 1], ['天', 5]]);
    // 人 (lesson 1): 大人 is readable (大 at 0), 天人 is not (天 at 5)
    expect(buildBuiltin({ ...base, moePos }).find((c) => c.char === '人')!.examples.map((e) => e.text)).toEqual(['大人', '天人']);
  });
  it('keeps HSK order without book positions', () => {
    expect(buildBuiltin(base).find((c) => c.char === '人')!.examples.map((e) => e.text)).toEqual(['天人', '大人']);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run scripts/content-lib.test.ts`
Expected: FAIL. `extraChars` is ignored, so 蚂 and 蚁 are missing, and the example order is HSK order `['天人', '大人']`.

- [ ] **Step 3: Implement it in `scripts/content-lib.ts`**

In `BuildInput` add:
```ts
  extraChars?: string[]; // 欢乐伙伴2.0 characters HSK 3.0 lacks (蚂, 蚁…), added at level 7 (spec 2026-10-11 §4)
  moePos?: ReadonlyMap<string, number>; // a character's first lesson in the book: 组词 he can read come first (spec 2026-10-11 §4)
```

In `buildBuiltin`, add this after `pool.sort(...)`:
```ts
  for (const char of input.extraChars ?? []) {
    if (seen.has(char)) continue;
    const entry = input.dictionary.get(char);
    if (!entry) { skipped.push(char); continue; }
    seen.add(char);
    pool.push({ char, hsk: 7, index: pool.length, strokes: entry.matches.length, entry });
  }
```

Then replace the example loop with:
```ts
    const at = input.moePos?.get(p.char);
    const readable = (w: string) => at !== undefined && [...w].every((c) => c === p.char || (input.moePos!.get(c) ?? Infinity) <= at);
    const fits = (w: string) => [...w].every((c) => (levelOf.get(c) ?? 99) <= Math.max(level + 1, 2)); // characters up to one level up
    const holds = words.filter((w) => w.includes(p.char));
    for (const w of [...holds.filter(readable), ...holds.filter((w) => !readable(w) && fits(w))]) {
      if (examples.length >= MAX_EXAMPLES) break;
      if (examples.some((e) => e.text === w)) continue;
      examples.push({ text: w, pinyin: input.pinyinOf(w) });
    }
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npx vitest run scripts/content-lib.test.ts`
Expected: PASS, and the existing content-lib tests still pass.

- [ ] **Step 5: Pass the MOE inputs through in `scripts/build-content.ts`**

Add this after the `dictionary` map is built:
```ts
const moe = JSON.parse(await readFile(new URL('../src/content/moe.json', import.meta.url), 'utf8')) as { lessons: { recognise: string[] }[] };
const moePos = new Map<string, number>();
moe.lessons.forEach((l, i) => l.recognise.forEach((c) => { if (!moePos.has(c)) moePos.set(c, i); }));
```

Pass `extraChars: [...moePos.keys()], moePos` into `buildBuiltin({...})`. `extraChars` skips characters that are already present.

- [ ] **Step 6: Relax the level-7 count in `scripts/check-content.ts`**

```ts
    const expected = level === 7 ? 1200 : 300; // HSK 3.0: 300 per level for 1–6, 1,200 for 七—九级, plus 欢乐伙伴2.0 extras at 7
    if (level === 7 ? n < expected : n !== expected) problems.push(`level ${level} has ${n} characters, expected ${expected}`);
```

- [ ] **Step 7: Rebuild builtin.json and check that only the expected things changed**

```bash
cp src/content/builtin.json /tmp/builtin.before.json
npm run content
node -e '
const a=require("/tmp/builtin.before.json").chars, b=require("./src/content/builtin.json").chars;
const A=new Map(a.map(c=>[c.char,c]));
const changed=b.filter(c=>A.has(c.char)).filter(c=>{const o=A.get(c.char);return ["pinyin","meaning","level","rank","radical","strokes","writeable"].some(k=>JSON.stringify(o[k])!==JSON.stringify(c[k]))});
console.log("new:",b.filter(c=>!A.has(c.char)).map(c=>c.char).join(""),"field changes:",changed.length,"example changes:",b.filter(c=>A.has(c.char)&&JSON.stringify(A.get(c.char).examples)!==JSON.stringify(c.examples)).length);'
```
Expected: `new: 蚂蚁拇狐狸 field changes: 0`, and some example changes. If `field changes` is not 0, stop: the source data has drifted. Report it instead of committing.

- [ ] **Step 8: Rebuild the glossary for the new 组词**

```bash
mkdir -p scripts/.cache && curl -sL https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz | gunzip > scripts/.cache/cedict_ts.u8
npx tsx scripts/build-glossary.ts scripts/.cache/cedict_ts.u8
```
Expected: `Wrote N glosses`, with N at least the previous count. Check with `git diff --stat src/content/glossary.json`.

- [ ] **Step 9: Add the coverage check** (append to `scripts/check-moe.test.ts`)

```ts
import { BUILTIN } from '../src/content';
it('has every listed character in the built-in content', () => {
  const have = new Set(BUILTIN.map((c) => c.char));
  expect([...new Set(lessons.flatMap((l) => l.recognise))].filter((c) => !have.has(c))).toEqual([]);
});
```

Put the import at the top of the file and the `it` inside the `describe`.

- [ ] **Step 10: Bump `CONTENT_VERSION` and update the pinned hash**

In `src/content/index.ts`, change `.8` to `.9` and append `; .9: 欢乐伙伴2.0 characters and 组词 he can read (spec 2026-10-11 §4)` to its comment. Run `npx vitest run src/content/readingFixes.test.ts`. It fails, showing the new hash. Update the pinned hash in that test as its own comment instructs.

- [ ] **Step 11: Run the content tests and the full suite**

Run: `npx vitest run scripts src/content`, then `npm test`
Expected: all PASS. If an existing test asserts a specific 组词 for a character whose examples changed, update that expectation to the new readable word and note `(spec 2026-10-11 §4)`. Do not revert the preference.

- [ ] **Step 12: Commit**

```bash
git add scripts/content-lib.ts scripts/content-lib.test.ts scripts/build-content.ts scripts/check-content.ts scripts/check-moe.test.ts src/content
git commit -m "feat: built-in content covers every 欢乐伙伴2.0 character, and 组词 he can read come first"
```

---

### Task 4: Two-lane new words

**Files:**
- Create: `src/session/lanes.ts`, `src/session/lanes.test.ts`
- Modify: `src/session/plan.ts`, `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `taughtAt`, `currentLessonIndex` (Task 2), and `Lane` (Task 2).
- Produces: `pickNewWords(unstarted: Word[], n: number, classIndex: number | null): { ids: string[]; lanes: Record<string, Lane> }`. `buildSessionPlan` fills `plan.newWordLanes`.

- [ ] **Step 1: Write the failing tests** (`src/session/lanes.test.ts`)

The fixture builds its pools from the data, so the test never hard-codes which characters sit in which lesson:

```ts
import { describe, expect, it } from 'vitest';
import moe from '../content/moe.json';
import { lessonIndex, taughtAt } from '../content/curriculum';
import { makeWord } from '../test/fixtures';
import { pickNewWords } from './lanes';
import type { Word } from '../types';

const cls = lessonIndex('2B', 17)!; // the class lesson in these tests
const firstTaughtIn = (i: number) => moe.lessons[i]!.recognise.filter((c) => taughtAt(c) === i);
const w = (c: string, over: Partial<Word> = {}) => makeWord(c, { id: `b:${c}`, rank: 0, ...over });
const school17 = firstTaughtIn(cls).map((c) => w(c));
const school16 = firstTaughtIn(cls - 1).map((c) => w(c));
const ahead = firstTaughtIn(cls + 1).map((c) => w(c));
const early = firstTaughtIn(0).map((c) => w(c)); // 一上·1
const hskOnly = w('龘', { rank: 5 });
const all = [...ahead, ...school17, ...early, ...school16, hskOnly];

describe('pickNewWords (spec 2026-10-11 §5)', () => {
  it('splits the day between the class lesson and the oldest gaps, school first', () => {
    const { ids, lanes } = pickNewWords(all, 5, cls);
    expect(ids.filter((id) => lanes[id] === 'school')).toHaveLength(3); // ceil(5 / 2)
    expect(ids.filter((id) => lanes[id] === 'catchup')).toEqual(early.slice(0, 2).map((x) => x.id));
    expect(ids.some((id) => ahead.some((a) => a.id === id))).toBe(false);
  });
  it('gives the school lane at least one word on a one-word day', () => {
    const { ids, lanes } = pickNewWords(all, 1, cls);
    expect(lanes[ids[0]!]).toBe('school');
  });
  it('takes the class lesson and the one before it in book order', () => {
    const { ids } = pickNewWords([...school17, ...school16], 4, cls);
    expect(ids.slice(0, 2)).toEqual(school16.slice(0, 2).map((x) => x.id)); // L16 comes before L17 in the book
  });
  it('lets catch-up take the rest when the class lesson is all started', () => {
    const { ids, lanes } = pickNewWords([...early, ...ahead], 3, cls);
    expect(ids).toEqual(early.slice(0, 3).map((x) => x.id));
    expect(Object.values(lanes)).toEqual(['catchup', 'catchup', 'catchup']);
  });
  it('lets the school lane take the rest when there are no gaps', () => {
    const { lanes } = pickNewWords([...school17, ...school16], 4, cls);
    expect(Object.values(lanes)).toEqual(['school', 'school', 'school', 'school']);
  });
  it('moves on to later lessons, then HSK order, only when everything up to the class is started', () => {
    const { ids } = pickNewWords([hskOnly, ...ahead.slice(0, 1)], 2, cls);
    expect(ids).toEqual([ahead[0]!.id, hskOnly.id]);
  });
  it('without a class lesson, catch-up runs from the start of the book', () => {
    const { ids, lanes } = pickNewWords(all, 2, null);
    expect(ids).toEqual(early.slice(0, 2).map((x) => x.id));
    expect(Object.values(lanes)).toEqual(['catchup', 'catchup']);
  });
  it('puts listed words first, unlabelled, and never picks them twice', () => {
    const pulled = w(school17[0]!.text, { listedAt: 10 });
    const { ids, lanes } = pickNewWords([pulled, ...all.filter((x) => x.id !== pulled.id)], 3, cls);
    expect(ids[0]).toBe(pulled.id);
    expect(lanes[pulled.id]).toBeUndefined();
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('returns fewer than asked, with no repeats, when it runs out', () => {
    const { ids } = pickNewWords([early[0]!, hskOnly], 8, cls);
    expect(ids).toEqual([early[0]!.id, hskOnly.id]);
  });
});
```

The caller passes `unstarted` already sorted by `newWordOrder` (listed first, then by rank). Fixtures with `rank: 0` keep their array order.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/session/lanes.test.ts`
Expected: FAIL, because `./lanes` cannot be resolved.

- [ ] **Step 3: Implement `src/session/lanes.ts`**

```ts
// The day's new words in two lanes (spec 2026-10-11 §5): his class's lesson, and catch-up from 一上 onward.
import { taughtAt } from '../content/curriculum';
import type { Lane, Word } from '../types';

/**
 * `unstarted` comes sorted listed-first then by rank (plan.ts newWordOrder). Listed words take the day first and carry no lane;
 * then the school lane takes half (at least one) from the class lesson and the one before; catch-up takes the oldest gaps; either
 * lane's shortfall goes to the other, then to later lessons, then to HSK order.
 */
export function pickNewWords(unstarted: Word[], n: number, classIndex: number | null): { ids: string[]; lanes: Record<string, Lane> } {
  const ids: string[] = [];
  const lanes: Record<string, Lane> = {};
  const picked = new Set<string>();
  let left = Math.max(0, n);
  const take = (from: Word[], k: number, lane: Lane | null) => {
    for (const w of from) {
      if (k <= 0 || left <= 0) break;
      if (picked.has(w.id)) continue;
      picked.add(w.id);
      ids.push(w.id);
      if (lane) lanes[w.id] = lane;
      k -= 1;
      left -= 1;
    }
  };
  take(unstarted.filter((w) => w.listedAt != null), left, null);

  const rest = unstarted.filter((w) => w.listedAt == null);
  const pos = (w: Word) => (w.source === 'builtin' ? taughtAt(w.text) : null);
  const book = rest.filter((w) => pos(w) !== null).sort((a, b) => pos(a)! - pos(b)!); // stable: rank order within a lesson
  const inClass = (w: Word) => classIndex !== null && (pos(w) === classIndex || pos(w) === classIndex - 1);
  const school = book.filter(inClass);
  const behind = book.filter((w) => !inClass(w) && (classIndex === null || pos(w)! < classIndex));
  const ahead = classIndex === null ? [] : book.filter((w) => pos(w)! > classIndex);
  const other = rest.filter((w) => pos(w) === null);

  take(school, Math.ceil(left / 2), 'school');
  take(behind, left, 'catchup');
  take(school, left, 'school');
  take(ahead, left, 'catchup');
  take(other, left, 'catchup');
  return { ids, lanes };
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npx vitest run src/session/lanes.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into `src/session/plan.ts`**

Add these imports: `import { pickNewWords } from './lanes';` and `import { currentLessonIndex } from '../content/curriculum';`.

Replace
```ts
  const newWords = active.filter((w) => !started.has(w.id)).sort(newWordOrder).slice(0, newLimit);
```
with
```ts
  const classIndex = currentLessonIndex(now, settings); // spec 2026-10-11 §7
  const pick = pickNewWords(active.filter((w) => !started.has(w.id)).sort(newWordOrder), newLimit, classIndex); // spec 2026-10-11 §5
  const newWords = pick.ids.map((id) => byId.get(id)!);
```

Add `newWordLanes: pick.lanes,` to the returned plan.

- [ ] **Step 6: Add a plan test** (append to `src/session/plan.test.ts`)

```ts
  it('brings new words in two lanes and records each lane (spec 2026-10-11 §5)', () => {
    const ws = Array.from('衣鱼雨').map((c) => makeWord(c, { id: `b:${c}`, rank: 0 }));
    const plan = buildSessionPlan({ cards: [], words: ws, settings: settings({ newPerDay: 2 }), now, newPerDay: 2 });
    expect(plan.newWordIds).toEqual(['b:衣', 'b:鱼']); // class at 二下, so 一上·1 is catch-up, in book order
    expect(plan.newWordLanes).toEqual({ 'b:衣': 'catchup', 'b:鱼': 'catchup' });
  });
  it('still brings new words with no school calendar for the year', () => {
    const ws = Array.from('衣鱼').map((c) => makeWord(c, { id: `b:${c}`, rank: 0 }));
    const plan = buildSessionPlan({ cards: [], words: ws, settings: settings(), now: new Date(2030, 2, 1), newPerDay: 2 });
    expect(plan.newWordIds).toEqual(['b:衣', 'b:鱼']);
  });
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. If an existing test used real book characters and expected HSK rank order, its order now follows the book. Update the expectation to the book order, with a comment `(spec 2026-10-11 §5: book order)`. Never change `pickNewWords` to keep an old order.

- [ ] **Step 8: Commit**

```bash
git add src/session/lanes.ts src/session/lanes.test.ts src/session/plan.ts src/session/plan.test.ts
git commit -m "feat: new words in two lanes, his class's lesson and catch-up from 一上"
```

Include any other test files Step 7 touched.

---

### Task 5: 写一写 writes what school asks him to write

**Files:**
- Modify: `src/session/writing.ts`, `src/session/writing.test.ts`, `src/session/plan.ts`

**Interfaces:**
- Consumes: `moeWriteable`, `writeAt` (Task 2), and `classIndex` and `started` in `plan.ts` (Task 4).
- Produces: `pickWriteUnits` accepts `writeable?: (w: Word) => boolean` and `inReach?: (w: Word) => boolean`.

- [ ] **Step 1: Write the failing tests** (append to `src/session/writing.test.ts`, reusing its `makeWord`/`makeCard` imports)

```ts
describe('pickWriteUnits with the school lists (spec 2026-10-11 §6)', () => {
  const cutoff = new Date(2026, 9, 2, 23, 59).getTime();
  const known = (id: string) => makeCard(id, 'recognise', new Date(2026, 9, 20), true);
  it('writes a character the old flag left out once the class has reached its write lesson', () => {
    const w = makeWord('衣', { writeable: false });
    const units = pickWriteUnits({ cards: [known(w.id)], words: [w], newWordIds: [], practised: new Map(), level: 1, cutoff, target: 6,
      writeable: () => true, inReach: () => true });
    expect(units.map((u) => u.wordId)).toEqual(['b:衣']);
  });
  it('keeps the old behaviour without the predicates', () => {
    const w = makeWord('衣', { writeable: false });
    expect(pickWriteUnits({ cards: [known(w.id)], words: [w], newWordIds: [], practised: new Map(), level: 1, cutoff, target: 6 })).toEqual([]);
  });
  it('leaves out a known character that is not yet in reach', () => {
    const w = makeWord('衣');
    expect(pickWriteUnits({ cards: [known(w.id)], words: [w], newWordIds: [], practised: new Map(), level: 7, cutoff, target: 6, inReach: () => false })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/session/writing.test.ts`
Expected: FAIL. The first case returns `[]`, because `writeable` is ignored.

- [ ] **Step 3: Implement it in `src/session/writing.ts`**

Change the signature to:
```ts
export function pickWriteUnits({ cards, words, newWordIds, practised, level, cutoff, target, writeable = (w) => w.writeable, inReach = (w) => (w.level ?? 0) <= level }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number; cutoff: number; target: number;
  writeable?: (w: Word) => boolean; // spec 2026-10-11 §6: the school's write lists add to the built-in flag
  inReach?: (w: Word) => boolean; // the last fallback's bound: his level, or the class's lesson for book characters
}): WriteUnit[] {
```

Then make two replacements:
- `words.filter((w) => !w.paused && w.writeable)` becomes `words.filter((w) => !w.paused && writeable(w))`
- `(w.level ?? 0) <= level` in `readable` becomes `inReach(w)`

- [ ] **Step 4: Pass the predicates from `src/session/plan.ts`**

Add `moeWriteable, writeAt` to the curriculum import, then put this before `pickWriteUnits`:
```ts
  // spec 2026-10-11 §6: school's write lists add to the built-in flag; book characters are in reach once the class has written them
  const writeable = (w: Word) => w.writeable || (w.source === 'builtin' && moeWriteable(w.text, classIndex, started.has(w.id)));
  const inReach = (w: Word) => {
    const at = w.source === 'builtin' ? writeAt(w.text) : null;
    return at !== null ? classIndex !== null && at <= classIndex : (w.level ?? 0) <= learnerLevel(words, started);
  };
```

Pass `writeable, inReach` into the `pickWriteUnits({...})` call.

- [ ] **Step 5: Add a plan test** (append to `src/session/plan.test.ts`)

```ts
  it('writes a book character the class has reached even when the old flag says no (spec 2026-10-11 §6)', () => {
    const w = makeWord('一', { id: 'b:一', writeable: false });
    const cards = [makeCard('b:一', 'recognise', new Date(2026, 9, 20), true)];
    const plan = buildSessionPlan({ cards, words: [w], settings: settings(), now, newPerDay: 0 });
    expect(plan.writeCandidates.map((c) => c.wordId)).toEqual(['b:一']);
  });
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. Update any existing writing expectation that changes only because book characters now use the class position instead of HSK level, with a comment `(spec 2026-10-11 §6)`.

- [ ] **Step 7: Commit**

```bash
git add src/session/writing.ts src/session/writing.test.ts src/session/plan.ts src/session/plan.test.ts
git commit -m "feat: 写一写 writes what school's write lists ask for, up to his class's lesson"
```

---

### Task 6: Settings → 学校

**Files:**
- Modify: `src/parent/SettingsPanel.tsx`, `src/parent/parentB.test.tsx` (or the existing file that tests `SettingsPanel`; search for `SettingsPanel` in `src/parent/*.test.tsx`)

**Interfaces:**
- Consumes: `currentLessonIndex`, `correctionApplies`, `lessonName`, `termsOfGrade`, `gradeOn`, `LESSONS` (Task 2), and `Settings.school` / `classLesson` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
describe('SettingsPanel: 学校 (spec 2026-10-11 §8)', () => {
  it('shows the estimated class lesson and lets the parent correct it', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 11, 9, 0) });
    renderWithApp(<SettingsPanel />, app);
    expect(await screen.findByText('华文 + 高级华文')).toBeTruthy();
    expect(screen.getByText(/二下 第十七课/)).toBeTruthy();
    expect(screen.getByText(/估计/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Class lesson'), { target: { value: '2B:15' } });
    fireEvent.click(screen.getByText('Set'));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toMatchObject({ term: '2B', lesson: 15 }));
  });
  it('goes back to the estimate', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 11, 9, 0) });
    await updateSettings(app.db, { classLesson: { term: '2B', lesson: 15, setAt: new Date(2026, 9, 11).getTime() } });
    app.settings = await getSettings(app.db);
    renderWithApp(<SettingsPanel />, app);
    fireEvent.click(await screen.findByText('Use the estimate'));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toBeNull());
  });
});
```

Add any of `getSettings`, `updateSettings`, `waitFor`, `fireEvent` and `SettingsPanel` that the test file doesn't import yet.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/parent/parentB.test.tsx -t 学校`
Expected: FAIL, because there is no "华文 + 高级华文" text.

- [ ] **Step 3: Implement the section in `SettingsPanel.tsx`**

Add the imports `import { correctionApplies, currentLessonIndex, gradeOn, LESSONS, lessonName, termsOfGrade } from '../content/curriculum';` and `import type { Term } from '../types';`. Destructure `now` from `useApp()` as well. Next to the other `useState` calls, which must stay above the `changingPin` early return, add:
```tsx
  const [pick, setPick] = useState('');
```

After the early return and before `return (`, add:
```tsx
  const today = now();
  const school = s.school ?? { grade: 2, year: 2026 };
  const grade = gradeOn(today, school);
  const classIdx = currentLessonIndex(today, s);
  const setOn = s.classLesson ? new Date(s.classLesson.setAt) : null;
  const choices = termsOfGrade(grade).flatMap((t) => LESSONS.flatMap((l, i) => (l.term === t ? [i] : [])));
```

Render this as the first block after `<h2>Settings</h2>`:
```tsx
      <fieldset class="field">
        <legend>学校 School (欢乐伙伴2.0)</legend>
        <p><strong>华文 + 高级华文</strong></p>
        <p>He learns to read every character on the lists and to write the characters either list asks for.</p>
        <label for="st-grade">Grade</label>
        <select id="st-grade" value={grade} onChange={(e) => void save({ school: { grade: Number(e.currentTarget.value), year: today.getFullYear() }, classLesson: null })}>
          {[1, 2, 3].map((g) => <option key={g} value={g}>P{g}</option>)}
        </select>
        <p>
          Class is on: {classIdx === null ? 'no lists for this grade yet' : lessonName(classIdx)}{' '}
          {classIdx !== null && (correctionApplies(today, s) && setOn ? `(你在${setOn.getMonth() + 1}月${setOn.getDate()}日设定)` : '(估计)')}
        </p>
        {choices.length > 0 && (
          <>
            <label for="st-lesson">Class lesson</label>
            <select id="st-lesson" value={pick} onChange={(e) => setPick(e.currentTarget.value)}>
              <option value="">Choose…</option>
              {choices.map((i) => <option key={i} value={`${LESSONS[i]!.term}:${LESSONS[i]!.lesson}`}>{lessonName(i)}</option>)}
            </select>
            <button type="button" class="small-btn" disabled={!pick} onClick={() => {
              const [term, lesson] = pick.split(':');
              void save({ classLesson: { term: term as Term, lesson: Number(lesson), setAt: today.getTime() } });
            }}>Set</button>
            {s.classLesson && <button type="button" class="small-btn" onClick={() => void save({ classLesson: null })}>Use the estimate</button>}
          </>
        )}
      </fieldset>
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/parent src/content/curriculum.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parent/SettingsPanel.tsx src/parent/parentB.test.tsx
git commit -m "feat: Settings shows his class's 欢乐伙伴 lesson and lets the parent correct it"
```

---

### Task 7: Overview → progress vs MOE

**Files:**
- Create: `src/stats/moeProgress.ts`, `src/stats/moeProgress.test.ts`
- Modify: `src/parent/Dashboard.tsx`, `src/parent/parentA.test.tsx`

**Interfaces:**
- Consumes: `LESSONS`, `termsOfGrade`, `termName`, `gradeOn`, `currentLessonIndex`, `taughtAt`, `writeAt` (Task 2), and `logsSince`, `addReviewLog` (repo).
- Produces: `learnedChars(logs: ReviewLog[], kind: 'recognise' | 'write'): Set<string>` and `moeProgress(logs: ReviewLog[], grade: number, classIndex: number | null): MoeProgress | null`, where
  ```ts
  interface Bar { learned: number; target: number; byClass: number | null }
  interface TermRow { term: Term; name: string; recogniseLeft: number; writeLeft: number }
  interface MoeProgress { recognise: Bar; write: Bar; terms: TermRow[] }
  ```

- [ ] **Step 1: Write the failing tests** (`src/stats/moeProgress.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { LESSONS, lessonIndex } from '../content/curriculum';
import type { ReviewLog } from '../types';
import { learnedChars, moeProgress } from './moeProgress';

const log = (char: string, kind: 'recognise' | 'write', day: number, correct = true): ReviewLog =>
  ({ cardId: `b:${char}:${kind}`, wordId: `b:${char}`, kind, at: new Date(2026, 9, day, 9).getTime(), rating: 3, correct });

describe('learnedChars (spec 2026-10-11 §8)', () => {
  it('needs right answers on two separate days', () => {
    const logs = [log('衣', 'recognise', 1), log('衣', 'recognise', 3), log('鱼', 'recognise', 1), log('鱼', 'recognise', 1), log('雨', 'recognise', 1), log('雨', 'recognise', 2, false)];
    expect([...learnedChars(logs, 'recognise')]).toEqual(['衣']);
  });
  it('ignores parent words', () => {
    expect(learnedChars([{ ...log('衣', 'recognise', 1), wordId: 'p:x' }, { ...log('衣', 'recognise', 2), wordId: 'p:x' }], 'recognise').size).toBe(0);
  });
});

describe('moeProgress', () => {
  it('counts against the end of his grade, with the class marker and gaps by term', () => {
    const p = moeProgress([log('衣', 'recognise', 1), log('衣', 'recognise', 2)], 2, lessonIndex('2B', 17))!;
    expect(p.recognise).toMatchObject({ learned: 1, target: 746 });
    expect(p.recognise.byClass).toBeGreaterThan(600);
    expect(p.recognise.byClass).toBeLessThan(746);
    expect(p.write.target).toBeGreaterThan(400); // the union of both write lists to 二下
    expect(p.terms.map((t) => t.name)).toEqual(['一上', '一下', '二上', '二下']);
    const firstTerm = new Set(LESSONS.filter((l) => l.term === '1A').flatMap((l) => l.recognise));
    expect(p.terms[0]!.recogniseLeft).toBe(firstTerm.size - 1); // 衣 is learned
  });
  it('has nothing to show for a grade without lists', () => {
    expect(moeProgress([], 4, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/stats/moeProgress.test.ts`
Expected: FAIL, because `./moeProgress` cannot be resolved.

- [ ] **Step 3: Implement `src/stats/moeProgress.ts`**

```ts
// Progress against the 欢乐伙伴2.0 lists (spec 2026-10-11 §8). "Learned" for now: right on two or more separate days.
import { LESSONS, taughtAt, termName, termsOfGrade, writeAt } from '../content/curriculum';
import { localDateKey } from '../lib/date';
import type { ReviewLog, Term } from '../types';

export interface Bar { learned: number; target: number; byClass: number | null }
export interface TermRow { term: Term; name: string; recogniseLeft: number; writeLeft: number }
export interface MoeProgress { recognise: Bar; write: Bar; terms: TermRow[] }

export function learnedChars(logs: ReviewLog[], kind: 'recognise' | 'write'): Set<string> {
  const days = new Map<string, Set<string>>();
  for (const l of logs) {
    if (l.kind !== kind || !l.correct || !l.wordId.startsWith('b:')) continue;
    const ch = l.wordId.slice(2);
    (days.get(ch) ?? days.set(ch, new Set()).get(ch)!).add(localDateKey(new Date(l.at)));
  }
  return new Set([...days].filter(([, d]) => d.size >= 2).map(([ch]) => ch));
}

export function moeProgress(logs: ReviewLog[], grade: number, classIndex: number | null): MoeProgress | null {
  if (!termsOfGrade(grade).length) return null;
  const terms = ([1, 2, 3] as const).filter((g) => g <= grade).flatMap((g) => termsOfGrade(g));
  const last = Math.max(...LESSONS.map((l, i) => (terms.includes(l.term) ? i : -1))); // ES2022 lib: no findLastIndex
  const reads = new Set(LESSONS.slice(0, last + 1).flatMap((l) => l.recognise));
  const writes = new Set(LESSONS.slice(0, last + 1).flatMap((l) => [...l.writeCL, ...l.writeHCL]));
  const readKnown = learnedChars(logs, 'recognise');
  const writeKnown = learnedChars(logs, 'write');
  const upToClass = (set: Set<string>, at: (c: string) => number | null) =>
    classIndex === null ? null : [...set].filter((c) => at(c)! <= classIndex).length;
  return {
    recognise: { learned: [...reads].filter((c) => readKnown.has(c)).length, target: reads.size, byClass: upToClass(reads, taughtAt) },
    write: { learned: [...writes].filter((c) => writeKnown.has(c)).length, target: writes.size, byClass: upToClass(writes, writeAt) },
    terms: terms.map((term) => ({
      term,
      name: termName(term),
      recogniseLeft: [...reads].filter((c) => LESSONS[taughtAt(c)!]!.term === term && !readKnown.has(c)).length,
      writeLeft: [...writes].filter((c) => LESSONS[writeAt(c)!]!.term === term && !writeKnown.has(c)).length,
    })),
  };
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npx vitest run src/stats/moeProgress.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing Dashboard test** (append to `src/parent/parentA.test.tsx`)

```ts
describe('Dashboard: progress vs MOE (spec 2026-10-11 §8)', () => {
  it('shows recognise and write against the end of P2, and gaps by term', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 11, 9, 0) });
    await addReviewLog(app.db, { cardId: 'b:衣:recognise', wordId: 'b:衣', kind: 'recognise', at: new Date(2026, 9, 1).getTime(), rating: 3, correct: true });
    await addReviewLog(app.db, { cardId: 'b:衣:recognise', wordId: 'b:衣', kind: 'recognise', at: new Date(2026, 9, 2).getTime(), rating: 3, correct: true });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('Progress vs MOE (欢乐伙伴2.0)')).toBeTruthy();
    expect(screen.getByText('认读 Recognise 1 / 746')).toBeTruthy();
    expect(screen.getByText(/书写 Write 0 \//)).toBeTruthy();
    expect(screen.getByText('二下')).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/parent/parentA.test.tsx -t MOE`
Expected: FAIL, because the heading is not found.

- [ ] **Step 7: Add the section to `Dashboard.tsx`**

Add `moe: MoeProgress | null` to `Data`. In the effect, also load `logsSince(db, 0)` and compute:
```ts
const moe = moeProgress(allLogs, gradeOn(t, settings.school ?? { grade: 2, year: 2026 }), currentLessonIndex(t, settings));
```

Render this right after the `tiles` div:
```tsx
      {d.moe && (
        <section class="panel">
          <h2>Progress vs MOE (欢乐伙伴2.0)</h2>
          <p>Learned = right on two separate days. Targets are the end of his grade; the mark is where his class is now.</p>
          {([['认读 Recognise', d.moe.recognise], ['书写 Write', d.moe.write]] as const).map(([name, bar]) => (
            <div class="tile" key={name}>
              <span class="tile__label">{`${name} ${bar.learned} / ${bar.target}`}</span>
              <div class="progress">
                <div class="progress__fill" style={{ width: pct(bar.learned, bar.target) }} />
                {bar.byClass !== null && <div class="progress__mark" style={{ left: pct(bar.byClass, bar.target) }} title="where his class is" />}
              </div>
            </div>
          ))}
          <table class="table">
            <thead><tr><th>Term</th><th>Still to read</th><th>Still to write</th></tr></thead>
            <tbody>{d.moe.terms.map((r) => <tr key={r.term}><td>{r.name}</td><td>{r.recogniseLeft}</td><td>{r.writeLeft}</td></tr>)}</tbody>
          </table>
        </section>
      )}
```

Add this to `src/styles.css`, next to `.progress__fill`:
```css
.progress { position: relative; }
.progress__mark { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--ink, #333); }
```
If `.progress` already sets `position`, keep the existing value when it is `relative`. Use the colour token the stylesheet already uses for ink and text.

- [ ] **Step 8: Run the parent tests and confirm they pass**

Run: `npx vitest run src/parent src/stats`
Expected: PASS, including the existing Dashboard tests.

- [ ] **Step 9: Commit**

```bash
git add src/stats/moeProgress.ts src/stats/moeProgress.test.ts src/parent/Dashboard.tsx src/parent/parentA.test.tsx src/styles.css
git commit -m "feat: the parent's Overview shows reading and writing against the 欢乐伙伴 lists, term by term"
```

---

### Task 8: The 认新字 card's lesson label

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/flashcards/FlashcardStep.test.tsx`, `src/app/SessionScreen.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `laneTag` (Task 2) and `plan.newWordLanes` (Task 4).
- Produces: `FlashcardStep` prop `tag?: string`, which is rendered on the intro card.

- [ ] **Step 1: Write the failing test** (append to `src/activities/flashcards/FlashcardStep.test.tsx`; it reuses that file's `base`, `review`, mocks and imports)

```tsx
describe('the new-word card\'s lesson label (spec 2026-10-11 §9)', () => {
  it('shows the book lesson', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} tag="补 一上·3" />);
    expect(screen.getByText('补 一上·3')).toBeTruthy();
    expect(document.querySelector('.intro__tag')).toBeTruthy();
  });
  it('shows none on a lesson saved before the school lists', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__tag')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/activities/flashcards`
Expected: FAIL. `补 一上·3` is not found.

- [ ] **Step 3: Implement the label**

In `FlashcardStep.tsx`:
- Add `tag?: string; // the 认新字 card's book lesson (spec 2026-10-11 §9)` to `Props`.
- Destructure `tag` in `FlashcardStep`.
- Pass `<Intro word={word} idiom={idiom} tag={tag} />`.
- In `Intro({ word, idiom, tag }: { word: Word; idiom: Idiom | null; tag?: string })`, add `{tag && <div class="intro__tag">{tag}</div>}` right after the `<SpeakButton text={word.text} />` line.

In `SessionScreen.tsx`, add this prop to the `<FlashcardStep` element:
```tsx
          tag={step === 'newwords' ? laneTag(flashWord, rec.plan.newWordLanes?.[flashWord.id]) : undefined}
```
and import `laneTag` from `'../content/curriculum'`.

In `src/styles.css`:
```css
.intro__tag { font-size: 14px; opacity: 0.6; letter-spacing: 0.05em; margin-top: 4px; }
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/activities/flashcards src/app`
Expected: PASS. Then add one SessionScreen test following the existing `SessionScreen.test.tsx` setup: `updateSettings(app.db, { newPerDay: 2, activities: lessonOnly })`, start the lesson, and expect `document.querySelector('.intro__tag')?.textContent` to match `/^(课本|补) /`. This proves the plan's lanes reach the card.

- [ ] **Step 5: Commit**

```bash
git add src/activities/flashcards src/app/SessionScreen.tsx src/styles.css
git commit -m "feat: the new-word card says which 欢乐伙伴 lesson the character is from"
```

---

### Task 9: Check in WebKit, build, and update the README

**Files:**
- Modify: `README.md` (the flow description at lines 6–12 is out of date; update it to the current lesson and add the curriculum)

- [ ] **Step 1: Full test run and type-check build**

Run: `npm test && npm run build`
Expected: all tests PASS, and the build succeeds with no TypeScript errors.

- [ ] **Step 2: Fit check in WebKit**

Run: `npm run fit`
Expected: it passes. Then screenshot these three screens in WebKit at iPad size (1180×820 landscape and 820×1180 portrait), using `scripts/fit-check.ts`'s WebKit setup (playwright-core 1.52):
1. a 认新字 card with a label;
2. Settings → 学校;
3. Overview → Progress vs MOE.

Check that the label sits under the speaker button without overlapping, that the class marker sits on the bar, and that the table fits. If `fit-check.ts` has no hook for parent screens, write a throwaway script in the scratchpad that uses the same browser launch code. Don't commit it.

- [ ] **Step 3: Update the README**

In `README.md`, replace the outdated flow description (lines 6–12) with three sentences:
- the current lesson: 认新字 → 练一练 → 写一写 → treasure chest, with 朗读 and the picture story parked;
- new words follow 《欢乐伙伴2.0》 in two lanes, from his class's lesson and catch-up from 一上, and the parent sets or corrects the class lesson in Settings → 学校;
- the lists come from MOE's 生字表 PDFs in `scripts/moe/sources`, rebuilt with `npm run moe`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README describes today's lesson and the 欢乐伙伴 curriculum"
```
