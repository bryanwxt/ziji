# ZiJi follows the school curriculum (欢乐伙伴2.0) — design

Date: 2026-10-11 · Sub-project 1 of 4 in the lesson overhaul (2 production-based mastery, 3 shorter calmer lessons, 4 variety that teaches) · Story feature parked

## 1. Why

The parent reports that lessons are not school-aligned, too tappy, too long and repetitive. This sub-project fixes the first: today new words come in HSK 3.0 order (`builtin.json` rank), so app practice and the school's 听写 rarely meet. The outcomes report (`reports/Primary Chinese outcomes strategy.md`, "What ZiJi should build next") names the bridge to school as the main way an app's narrow gains reach school outcomes. Sub-projects 2–4 build on this one, because they all assume the right words.

**Success:** each day's new words include characters from his class's current 欢乐伙伴2.0 lesson and close his gaps from earlier terms; 写一写 practises exactly what school asks him to write; the parent can see progress against the MOE end-of-level character targets.

## 2. Decisions taken in brainstorming

| Question | Decision |
|---|---|
| Which list | Both 华文 (CL) and 高级华文 (HCL). He recognises every listed character and writes the **union** of both write lists |
| Ordering for a child who is behind | **Two lanes** each day: this week's school lesson + catch-up from 一上 onward |
| Knowing the class lesson | **Calendar estimate + parent correction** |
| Integration | **Approach A, a curriculum layer.** Rejected: B (MOE lessons as auto-imported parent lists, which can't express lanes or the calendar) and C (rebuilding the content MOE-only, which is churn; `builtin.json` already covers 744/746 P1–P2 characters) |

## 3. Data: `src/content/moe.json`

**Sources.** The MOE 《欢乐伙伴2.0》 生字表 PDFs for 华文 and 高级华文, P1–P3 (一上 to 三下, 1,031 characters), supplied by the parent. They are committed under `scripts/moe/sources/` as `2024-cl.pdf` and `2024-hcl.pdf`, matching MOE's published [P1–P2 CL](https://www.moe.gov.sg/api/media/6c0f68ed-a8bf-471c-9f32-b5ea75831910/2024-Character-List-Primary-One-to-Two-Chinese.pdf) and [P1–P2 HCL](https://www.moe.gov.sg/api/media/394e06b1-f4f3-4e90-adb4-a33efd9e1c5e/2024-Character-List-Primary-One-to-Two-Higher-Chinese.pdf) for those terms. The 2015 lists (P1–P6, old edition) are kept out of this release. They are the candidate stand-in for P4–P6 until 2.0 lists exist.

**Generator.** `scripts/build-moe.ts` (TypeScript run by tsx, like `build-content.ts`; `npm run moe`) reads the PDFs with `pdfjs-dist` (dev dependency only, never shipped) and keeps each text item's position. It extracts the text and writes `moe.json`. The extracted text wraps the 识写字 column across lines. The generator must therefore split each lesson's characters into recognise and write by x-position, not by line. Its checks (§11) prove the split. Where text extraction is ambiguous, a small hand-written override table in the script fixes the lesson. Each override has a comment naming the PDF page.

**Shape.**
```ts
interface MoeLesson { term: '1A'|'1B'|'2A'|'2B'|'3A'|'3B'; lesson: number; recognise: string[]; writeCL: string[]; writeHCL: string[] }
interface MoeData { version: 1; lessons: MoeLesson[]; calendar: SchoolYear[] }
interface SchoolYear { year: number; terms: [string, string][] } // four [start, end] ISO dates
```
Lesson numbers run as in the book: 1A L1–10, 1B L11–19, and the same pattern each year.

**Derived per character** (a `curriculum.ts` module, pure functions over `moe.json`):
- `taughtAt(char)` is the first lesson where it is on the recognise list. It is the character's curriculum position and replaces the HSK `rank` for ordering new built-in words.
- `writeAt(char)` is the first lesson where it is on **either** write list, or null.
- `lessonLabel(pos)` returns e.g. 「二下·17」.

**Calendar.** The 2026 and 2027 MOE term dates go into `calendar`:
- 2026: T1 2 Jan–13 Mar, T2 23 Mar–29 May, T3 29 Jun–4 Sep, T4 14 Sep–20 Nov.
- 2027: T1 4 Jan–12 Mar, T2 22 Mar–28 May, T3 28 Jun–3 Sep, T4 13 Sep–19 Nov.

Adding a year is a data edit.

## 4. Content fixes

1. **Add 蚂 and 蚁** to `builtin.json`, plus any other 3A/3B character the generator finds missing. Each gets pinyin, meaning (CC-CEDICT), radical, components and strokes (Make Me a Hanzi), following the existing build. The `moe.json` check fails if any listed character is missing from `builtin.json`.
2. **Example words he can read.** When choosing a built-in character's 组词 examples, prefer words whose other characters have `taughtAt` at or before this character's, and fall back to the current HSK-derived examples otherwise. The same rule fills the ~40 MOE characters that have no examples today, drawing on `hskwords.json` and `extraExamples.ts`. This is done at build time in the content pipeline, so the runtime is unchanged.

## 5. Daily new words: two lanes

Changes are confined to `newWordOrder` and new-word selection in `src/session/plan.ts`. A new pure module `src/session/lanes.ts` holds the lane logic.

The day's count `n` still comes from the adaptive pace (3–8) and is still paused by `BACKLOG_PAUSE`.

1. **Front of the queue (unchanged):** parent-list words, 听写 mistakes, 朗读 misreads and school 成语 (negative or set `listedAt`) come first, oldest first, and use up `n` before the lanes do.
2. **School lane:** `ceil(remaining / 2)`, at least 1 when `remaining ≥ 1`. It takes unstarted built-in characters whose `taughtAt` is the **current class lesson or the one before it**, in book order.
3. **Catch-up lane:** whatever remains. It takes unstarted built-in characters with the **earliest** `taughtAt`, from 1A L1 forward. "Unstarted" means no `recognise` card, so characters placement seeded as known are skipped automatically.
4. **Spill-over:** if one lane runs short, the other takes the rest. When every listed character up to the class lesson is started, the catch-up lane moves on to **later** lessons in book order, then to non-MOE built-in characters by HSK rank.

Characters ahead of the class lesson are taken only by spill-over, never by the school lane.

The plan records each new word's lane (`newWordLanes?: Record<wordId, 'school' | 'catchup'>` on `SessionPlan`, optional so saved sessions still load).

## 6. Writing eligibility

For built-in words, a character is writeable when `writeAt(char)` is at or before the current class lesson, or when the catch-up lane has started it and it has a `writeAt`. This **adds to** the existing writeable flag and never removes it. Characters that already have write cards keep them. Parent words keep their own `writeable`. `pickWriteUnits`' "known characters at or below his level" fallback uses MOE position (`writeAt` ≤ class lesson) instead of HSK level.

## 7. Class lesson

`currentLesson(now, settings)` in `curriculum.ts` works like this:
- **Estimate:** find the semester holding `now`. Semester I covers lessons 1–10 of the year's 上 term, Semester II lessons 11–19 of the 下 term. The grade comes from `settings.school = { grade, year }` (default `{ grade: 2, year: 2026 }`). It is grade + (current school year − year), so it rolls over each January. Spread the semester's lessons evenly over its teaching weeks, excluding the holiday weeks between terms. In holidays, it returns the last lesson of the semester just ended.
- **Correction:** `settings.classLesson?: { term, lesson, setAt }`. When set, the estimate moves forward from the corrected lesson at the same weekly rate, and the correction lapses at the next semester start.
- At the end of the year it holds at the year's last lesson. If the grade has no lists (P4+), the school lane is empty and spill-over covers.

## 8. Parent area

**Settings → 学校 (School):**
- Track is shown read-only as 「华文 + 高级华文」, with one line explaining: recognise all listed characters, write both lists' write characters.
- Grade (P1–P3), default P2 in 2026. Saving it stores `{ grade, year }`.
- Class lesson: shown as 「二下 第十七课 (估计)」, or 「(你在10月11日设定)」 after a correction, with a term + lesson picker.

**Overview → Progress vs MOE:**
- Two bars: **认读 Recognise n / 746** and **书写 Write n / W**. Both targets are end of the current grade. W is the union write total, computed from `moe.json`. Each bar has a tick for where the class is now.
- A per-term table (一上 … current grade's 下) gives, for each term, the counts not yet learned, separately for recognising and for writing.
- **"Learned" in this release** means answered correctly on two or more separate local days (recognise card for 认读, write card for 书写), from `ReviewLog`. Sub-project 2 will tighten this to production-only.

## 9. Child-facing

The 认新字 card shows a small label under the character: 「课本 二下·17」 for the school lane, or 「补 一上·5」 for catch-up and spill-over. Nothing else on his side changes in this release.

## 10. Existing data

No migration of cards or logs. Started words keep their cards and schedules. Only the order of unstarted built-in words changes, and writeability only grows. Saved sessions without `newWordLanes` show no label. `settings.school` defaults to `{ grade: 2, year: 2026 }`, and `classLesson` to unset.

## 11. Testing

- **`moe.json` checks** (in `scripts/check-content.ts`): distinct recognise characters reach 746 at the end of 2B and 1,031 at the end of 3B. Every lesson has recognise characters. Every write character is on the recognise list at or before that lesson. The CL and HCL recognise lists match lesson by lesson. Spot-checks against known lessons pass (1A L1 recognise = 衣鱼雨一二五耳牙口人, write = 一二五口人). Every listed character exists in `builtin.json`.
- **`lanes.ts`:**
  - the lane split for n = 1…8;
  - the front-of-queue lists use up `n` first;
  - spill-over both ways;
  - placement-known characters are skipped;
  - nothing ahead of the class lesson is taken except by spill-over;
  - the order past the lists falls back to HSK rank.
- **`curriculum.ts`:**
  - estimates on dates in each term and in holidays;
  - the correction carries forward and lapses at the next semester;
  - the year rollover;
  - `writeAt` and `taughtAt` for sample characters.
- **Writing eligibility:** only adds, and parent words are untouched.
- **Example-word preference** in the content build.
- **UI:** the Settings 学校 panel, the Overview progress view and the 认新字 label, rendered in **WebKit** (playwright-core) as well as Chromium.

## 12. Out of scope

Production-only mastery (sub-project 2), lesson length and reward changes (3), 朗读, word families, feedback and pinyin fading (4), P4–P6 lists, and lesson vocabulary (词语表) beyond characters.
