# 朗读 content: a real passage library, rotation with rest, and 下一篇 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 朗读 stops repeating itself: each passage keeps a reading history with spaced rest (never within 3 days; 3 → 7 → 18 → 45 days while read well, then retired), an unrecorded 「读完了」 counts as a read, the library grows to 88 levelled passages (15 Global Storybooks passages with their pictures and credits, 20 old and 53 new ZiJi passages; the plan first said 105: 45 and 40), each revisit asks a different shuffled question, and 「下一篇」 lets him swap a passage twice a step.

**Architecture:** Pure pieces first: `src/langdu/history.ts` (per-passage history: rest ladder, 3-day gap, warm-up, misread reset, the one-off move from the 3-day cycle) and `src/langdu/pick.ts` (the picking order over candidates that carry a fit). The lesson, 多读一遍, Home and Listen & confirm move onto them (Task 2, which also fixes the unrecorded read). A build-time importer (`scripts/storybooks/`, `scripts/import-storybooks.ts`) vendors Global Storybooks at a pinned commit, chunks and levels the stories with `src/langdu/level.ts`, writes `src/content/storybooks.json` and one WebP per passage. Levelling against his readable set K (known characters plus his class's 识读字) feeds the pool; questions become two per passage, asked in turn and shuffled; `LangduStep` splits into a warm-up shell and per-passage parts so 「下一篇」 can swap the passage under a kept warm-up; credits and a read-only Library land in the parent area; then the 40 new passages, term by term, under an extended content check.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, pinyin-pro, sharp 0.35 (WebP), tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`, `scripts/fit-check.ts`).

**Spec:** `docs/superpowers/specs/2026-10-15-ziji-langdu-content-design.md` (read it in full before Task 1; §12's decisions D1–D7 were approved as recommended on 2026-10-15).

## Global Constraints

- **No repeats:** a passage is never offered within **3 days** of its last read or skip; **the same day counts** (D6, D7). A second lesson or 多读一遍 the same day gets a **different** passage.
- **Rest after a read:** first read **3 days**; read well (finished, and the meaning question right first time) **3 → 7 → 18 → 45**; not well (the question missed) **3 days**; rest past **60 days** → **retired** (offered only when nothing else is available).
- **Parent marks:** **≥ 2** misreads marked in Listen & confirm → due **3 days from the review date**. Replaces `addExtraDay`; `extraDayGiven` stays readable on old recordings.
- **Picking order:** (1) a parent school text not yet read; (2) new and revisit alternate — after a new pick, the most overdue due revisit; otherwise a new passage in band: first the next part of a Global Storybooks story he has started (parts only in order), then the in-band passage with fit closest to **0.93**, ZiJi and Global Storybooks interleaved; (3) any due revisit; (4) any in-band or easy passage outside the 3-day gap; (5) retired passages, oldest first; (6) nothing: the step is skipped.
- **Levelling:** a passage's **term** is the earliest term T where **≥ 90%** of its character tokens (names excluded) are in the cumulative 识读字 list through T (`moe2024.json`) — the spec's §3 says 92%; see the first Ruling. **K** = `knownChars` ∪ the 识读字 of every MOE lesson up to his current class lesson. **Fit** = share of tokens in K, names excluded. **Band 0.90–0.97, aim 0.93.** Below 0.90: never offered (except a parent text). Above 0.97: easy, used when nothing is in band and for revisits. Pool pre-filter: term ≤ his class term + 1.
- **Warm-up** runs when the last warm-up was **3 or more days ago** (`lastWarmup`). `isFirstDay` goes.
- **下一篇:** on **Listen** only, **2 swaps per step**, not once recording has started, **never on a parent's school text**, hidden when no other candidate exists. A swapped-out passage gets `lastSkipped = today`, `skips + 1`; reads and rest untouched. **3 skips** → "often skipped" for the parent.
- **Questions:** **2** per own passage and per Global Storybooks chunk (p01–p20 gain one each); 谁 / 哪里 / 什么 / 为什么 / 怎么样; **3** choices; asked in turn (`history.q`); **choices shuffled at each showing**. Guess-proofing enforced by the content check: all three choices in the passage or none; choice lengths within **2** characters; the question doesn't contain the answer's characters apart from function characters; the answer is not the passage's most frequent word.
- **Pictures:** one per Global Storybooks passage (the chunk's first page), WebP at most **640 px** wide (the imagebank's are 546, never enlarged), quality 50, ≤ 60 KB each, ≤ 1.5 MB in all (measured ~0.95 MB), in `public/passages/gsb-<story>-<chunk>.webp`, precached; shown on **Listen and Read**, **hidden on Question**. Own passages: no pictures.
- **Global Storybooks source:** `github.com/global-asp/sbc-source` folder `zh/` pinned at **`be28dab`** (`be28dab38ac55e8eb2185edb6631b11615d02185`, 2026-06-08); images from `global-asp/gsn-imagebank` pinned at **`0df4097`** (`0df409752c86adc92685816e19e6085c4e4496f1`). No runtime fetch. Chunks of **40–110** characters, page-aligned, a short tail merged into the previous chunk; chunks beyond **三上** dropped; a story dropped when **fewer than half** its chunks survive (and, by Ruling, when its first chunk doesn't, or a chunk holds a blocked word). CC BY-NC stories **included** (D1): 0002, 0003, 0009, 0030, 0067, 0112, 0120, 0129, 0231, 0234, 0271.
- **Edits are light only** (D2): Singapore usage (一点儿 → 一点), typos, the wrong-script 馬. Names kept, always shown with pinyin, left out of the level count. A changed story shows 「有改动」/"adapted".
- **Credit line** on Listen, small type: 「故事：Global Storybooks · 文 … · 图 … · 译 … · CC BY 3.0 · 有改动」; tapping opens parent-facing details with links to the licence and the source; never on Read or Question. **Parent › Credits**: one Global Storybooks / African Storybook entry with each included story's title, author, illustrator, translator, licence and "adapted"; "Read-aloud passages were written for this app." becomes **"Passages marked ZiJi were written for this app."**
- **Own passages:** **53 new** (二上 **14**, 二下 **20**, 三上 **19**, by the controller's rulings; the spec and D4 said 40: 12, 16, 12), ids **p21–p73** (二上 p21–p34, 二下 p35–p54, 三上 p55–p73); each **50–110** characters, **3–7** sentences, an everyday Singapore scene or a short fable; **≥ 6** different characters first taught in its term; coverage **≥ 95%** in `allowedChars(term)` with **≤ 3** distinct characters outside, each within the **next** term; every multi-character word passes the word gate, nothing from `BLOCKED`; up to **4** 生词 with kid glosses (`glossProblems` clean); pinyin snapshotted by `npm run pinyin`; no duplicate text or near-duplicate sentence opening.
- **Auto-stop:** the read limit is **`max(60 s, 0.8 s × characters)`**.
- **State:** `ReadingHistory = { history: Record<id, { reads, lastRead, rest, lastSkipped?, skips?, q }>; lastKind: 'new' | 'revisit' | null; lastWarmup: string | null; warmups: number }`. The old `passageId`, `days`, `extra`, `lastDay`, `lastRead` move over once (§8). Recordings and the Listen & confirm queue are unchanged; old passage IDs stay valid.
- **IDs:** own `p01`…`p80` (p01–p73 used); imported `gsb:<story>-<chunk>`, e.g. `gsb:0001-1`.
- TypeScript lib is **ES2022**: no `findLastIndex` / `toSorted`; `Array.prototype.at` and `??=` are fine.
- Test files: `*.test.ts` run in node, `*.test.tsx` in jsdom, `*.slow.test.tsx` are the slow ones (`npm run test:fast` skips them).
- Screenshots in **WebKit** via playwright-core (the iPad is Safari). If WebKit is missing, stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Never use bare `git stash`. Commit after each task with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Out of scope (§11): Global Storybooks audio, StoryWeaver, 看图说话, speech-recognition scoring, tap-to-gloss beyond the 生词 strip, parent editing of library passages.

## Rulings

- Ruling: **`TERM_BAR = 0.90`, not §3's 92%.** The spec's own numbers assume 90%: §2.1's chunk counts ("at a ≥90% coverage bar"), its success line ("about 60 from Global Storybooks"), §2.2's "nearly all [old passages] come out 一下", and §3's band floor (0.90). Measured: at 92%, 37 chunks before the two rules below and 22 with the first-chunk rule alone; at 90%, 45 with both rules (69 without the first-chunk rule). The fit band (0.90–0.97, aim 0.93 against his own K) still decides what he reads — cost if wrong: a passage labelled a term early by up to 2%; one constant to change.
- Ruling: a story is kept only if its **first chunk** survives as well as half of all its chunks — §2.1's reason ("a story missing its middle parts is no story") holds more for a missing beginning; measured, it drops 0243, 0262 and 0291, which would otherwise start at a later part (0291's opening holds a blocked word) — cost if wrong: 24 fewer passages (69 → 45); the parent may prefer more passages over whole stories.
- Ruling: a chunk with a word on the app's blocklist is dropped like a chunk beyond 三上 (D2 allows no rewording; the content gate covers every shown sentence) — measured: 拼命 (0004), 傻瓜 (0158), 婚礼 (0291) and 富人 (0315) are blocked, which drops 0158 and halves 0315. With the first-chunk rule the import keeps **45** chunks (一下 2, 二上 6, 二下 17, 三上 20) from 21 stories; with 60 of our own the library is **105** (the spec hoped for 100+, about 60 imported) — cost if wrong: a few more passages lost to the blocklist.
- Ruling: a whole story shorter than 40 characters stays one passage (0231 has 28, 0008 and 0302 have 33): the 40 floor governs cutting, not keeping — cost if wrong: three short reads.
- Ruling: the rest ladder is the explicit list `REST_LADDER = [3, 7, 18, 45]`; a good read moves to the first step above the current rest, past 45 to `RETIRED_REST = 112` — the spec's "rest × 2.5, at least 7" rounds 7.5 and 17.5 two ways, and its own example 3 → 7 → 18 → 45 is the contract — cost if wrong: a rest a day off.
- Ruling: "retired" is `rest > RETIRE_AFTER (60)`, no separate flag; a parent's ≥ 2 marks bring a retired passage back (its rest becomes days-since-read + 3) — one field to migrate and test — cost if wrong: none.
- Ruling: a lesson read of a passage **with no question** (a parent text without one) counts as **well**; "no question answered" in the spec can only happen when there is no question, since the step asks any question it has — otherwise such a text would rest 3 days forever — cost if wrong: parent texts without questions climb the ladder.
- Ruling: 多读一遍 is `'extra'`: it counts as a read for the gap and `reads`, sets rest 3 on a first read, and leaves an existing rest, the question turn `q` and `lastKind` untouched — the spec says it "counts as a read for rest" and earns nothing; resetting rest would punish an extra read — cost if wrong: an extra round never shortens a rest.
- Ruling: `lastKind` changes only on lesson reads, never on skips or 多读一遍 — the alternation is about lessons — cost if wrong: one more revisit or new pick in a row.
- Ruling: the misread reset sets `rest = days(lastRead → review) + 3`, keeping `lastRead` the real read date (the Library's "reads" and the bonus are about reads); it acts once per take, on the first save with ≥ 2 marks; `extraDayGiven` is reused as "its marks have acted" (renaming would need a recording migration) — the legacy "marks saved before the flag" clause goes, since a 1-mark save followed by a 2-mark save must still act — cost if wrong: an old recording re-marked resets a rest once more.
- Ruling: `lastWarmup` is set whenever the warm-up **ran**, recorded or not (a refused microphone still did the warm-up); `warmups` counts recorded ones as before — cost if wrong: one more warm-up a week with no microphone.
- Ruling: the one-off move runs **on read** in `normalizeKid` (`migrateReading`, idempotent), not as a `lessonVersion` bump — `normalizeReading` already runs there, and a backup restored from before this release migrates the same way — cost if wrong: none; the spec's intent (once, a second run a no-op) holds.
- Ruling: ZiJi and Global Storybooks interleave by preferring the source with **fewer passages read so far** (ties: ZiJi), then fit nearest 0.93, then id — no extra state; it alternates whenever both have in-band passages — cost if wrong: two of one source in a row now and then.
- Ruling: the next part of a started story is offered at fit **≥ 0.90** (in band or easy), ahead of other new passages; a part whose previous part is unread is never offered by any step — a story should continue once begun — cost if wrong: a slightly easy part comes first.
- Ruling: due revisits are not filtered by fit (he has read them; K only grows) — cost if wrong: a passage whose class-lesson correction moved back is revisited.
- Ruling: the read limit `readLimitMs` lives in `src/langdu/sentences.ts`, not `recorder.ts`: the step's tests replace the recorder module, which would leave it undefined — cost if wrong: none.
- Ruling: the chunker cuts pages in order: a page over 110 characters splits at its sentences (`splitSentences`); a chunk closes when the next unit would pass 110 and it has ≥ 40; a final chunk under 40 joins the previous one (which may pass 110: measured max 135) — the spec's "page-aligned, short tail merged" — cost if wrong: one long passage.
- Ruling: each manifest edit's `from` must occur **exactly once** in its story, else the import throws; 0004 has two 一点儿, so its edits quote enough context to be unique — "a missing `from` fails" (spec §10) extended to "an ambiguous one fails" — cost if wrong: none.
- Ruling: a chunk's picture is its first page's: imagebank `<id>/<page + 1>.jpg` (01 is the cover; measured: 0271 has 5 pages and 6 images, 0001 has 11 and 12); converted at quality 50 with no size search (the imagebank's pictures are 546 px and dense: a 30 KB cap failed at quality 50, so the spec's "~20 KB" is the average, not a cap) — cost if wrong: a picture one page off; Task 11's screenshots show it.
- Ruling: `scripts/storybooks/zh/*.md` (40 files, 168 KB) and `scripts/storybooks/manifest.json` are committed; page images are fetched once into `scripts/.cache/storybooks/` (git-ignored, under the existing `scripts/.cache/` rule) by `scripts/storybooks/fetch.ts`, and only the generated `public/passages/*.webp` are committed — the import itself is then offline and deterministic — cost if wrong: a fresh clone needs one fetch to re-run the import (not to build or test).
- Ruling: imported passage ids keep the **chunk's** number (`gsb:0066-3`) so they stay stable, while `story.part` numbers only the surviving chunks 1…n (parts are offered in order, so a dropped middle chunk never blocks the story); a story's titles get 「（1）」「（2）」 when it has more than one part — cost if wrong: an id gap the child never sees.
- Ruling: names are removed from the text (every occurrence of each name string) before any levelling or fit count; a passage stores only the names that occur in it; their characters always show pinyin through a `KeepPinyin` wrapper (so 安 in 安迪斯瓦 shows pinyin even where he knows 安) — cost if wrong: pinyin over a known character elsewhere in that one passage.
- Ruling: the existing 20 passages level (90% bar, measured) at 一下 (p01, p02, p04, p05, p07, p08, p10–p13, p15, p20), 二上 (p03, p06, p09, p14, p16–p18) and 二下 (p19), as the spec expected ("nearly all 一下"); they keep their old content checks (30–80 characters, HSK 1–2) and pass the word gate after one fix: p12's 一家人 (HSK 7) becomes 全家 — the new own-passage rules (length, term characters, coverage, 生词) apply to p21–p60 — cost if wrong: none.
- Ruling: K's class lesson is `classLessonAt(now, settings)`; null (no calendar for the year) leaves K = `knownChars` and no term pre-filter. Rendered tests that need "nothing to read" set `now` in **2025** (outside the calendar) instead of relying on an empty pool — cost if wrong: none.
- Ruling: the word gate for passages works on `tiles()` (the content gate's own segmentation), with punctuation and trailing particles (了吗吧呢的得着过啊呀) stripped: a tile that is BLOCKED fails; a multi-character HSK word must pass `isChildWord` unless it is one of the passage's 生词; tiles that are not dictionary words (一天, 十个, doubled characters) pass. Measured on drafts: pinyin-pro segmentation and raw `isChildWord` flag every 「开始了」「一天」 — cost if wrong: a rare HSK 5+ word slips through as a non-dictionary tile.
- Ruling: 生词 glosses live on the passage (`words: [{ text, gloss }]` in `passages.json`, spec §8), checked by `glossProblems`; when `kidGloss.json` already glosses the word, the passage's gloss must equal it — spec §2.2 named kidGloss.json, §8 the inline shape; inline needs no TSV round trip and the equality keeps one English per word — cost if wrong: none.
- Ruling: an own passage's stored `term` must equal `passageTerm`, and for p21 on it must also be the term its task writes for — a 三上 passage needs about one token in ten from 三上 to level there, which "≥ 6 term characters" alone doesn't guarantee (measured: a draft with 8 三上 tokens of 96 levelled 二上; 11 of 90 levelled 三上) — cost if wrong: harder writing.
- Ruling: questions are `Record<id, PassageQuestion[]>`; a read asks `questions[q % n]` where `q` is the history's turn before the read; `q` moves on after each lesson read — cost if wrong: none.
- Ruling: the shuffle runs once per showing (`useMemo` in the passage parts) with `Math.random`; `LangduStep` takes an optional `rng` for tests and stage cases — cost if wrong: none.
- Ruling: the "most frequent noun" proxy is the passage's most frequent multi-character dictionary tile, counted only when it occurs twice or more; function characters are 的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有 — measured: 15 of the 20 existing questions fail the new rules (mixed in/out choices, a given-away 做, 弟弟/奶奶 as the top word) and are rewritten in Task 5 — cost if wrong: a fair question rejected.
- Ruling: `LangduStep` splits into a warm-up shell (keeps the self-introduction recorder) and `PassageParts` keyed by passage id, so 「下一篇」 swaps the passage without losing the warm-up take; the skip is saved at once (`updateKid`), and a reload mid-step re-picks with it — cost if wrong: after a reload he has two fresh swaps.
- Ruling: the picture shows on Listen and Read only (not Compare: the screen is full there), beside the title on Listen; 「下一篇」 sits in the feedback sheet beside 「开始朗读」 (a new `aside` slot), not in the card — measured in WebKit: in the card, picture + 下一篇 squeezed the passage to nothing on an iPhone SE; a picture that fails to load hides itself — cost if wrong: one prop on the sheet.
- Ruling: the credit details are a `<details>` under the passage on Listen: its summary is the one-line credit (one line, ellipsis, until tapped), its body links the licence and the story's Markdown file at the pinned commit (`credit.source`, a field added to the spec's credit shape) and is rendered only while open (WebKit lays out a closed body, which the stage cases flagged as clipped) — cost if wrong: one field.
- Ruling: the credit line is 16px, not the spec's "small type": the fit sweep forbids Chinese text under 16px (measured: 12px failed every size); it stays quiet by colour and one line with an ellipsis — cost if wrong: none.
- Ruling: the review CSV's "passages sheet" is a separate CSV written by a new `scripts/review-passages.ts` (the gloss CSV comes from `build-kidgloss.ts --csv`) — cost if wrong: none.
- Ruling: "near-duplicate sentence opening" = two sentences in different own passages sharing their first 8 Han characters (measured: none among p01–p20) — cost if wrong: a reworded sentence.
- Ruling: the Library lists every built-in passage (own and Global Storybooks) sorted by term then id, with fit against K computed on open; "next due" is the date `lastRead + rest` — cost if wrong: none.

## Review Focus

1. The microphone is refused or failing for weeks: every lesson's unrecorded 「读完了」 still counts, so the passage rests and a different one comes next lesson (spec §1 cause 4) — test in Task 2 (`no take (the mic refused): the read still counts, so the passage moves on`).
2. A backup exported before this release is restored (or an install updates mid-cycle): the 3-day cycle's state becomes history on read, once, and nothing crashes on the old shape — tests in Task 1 (`runs once: a second run changes nothing`) and Task 2 (`an old 3-day cycle in a stored or restored record reads as history`).
3. He double-taps 「下一篇」: one swap, one skip saved, one of the two swaps used — test in Task 6 (`a double tap on 下一篇 swaps once`).
4. A passage picture fails to load (cache cleared offline, a missing file): Listen still works with no broken-image box — test in Task 6 (`a picture that fails to load hides itself`).
5. Everything readable is inside the 3-day gap (a small library on day 2, or three lessons in a day): the step is skipped, Home shows no 多读一遍 and leaves the stop off the path, nothing loops — tests in Task 1 (`an empty pool, or everything inside the gap, gives nothing`) and Task 4 (`with everything read in the last 3 days there is no 多读一遍 and no 朗读 stop`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/langdu/history.ts` (new, + test) | rest ladder, gap, due, skip, misread reset, warm-up, `readHow`, `migrateReading` | 1 |
| `src/langdu/pick.ts` (new, + test) | `Candidate`, band, `pickOrder`, `pickPassage`, `swapTarget` | 1, 6 |
| `src/types.ts` | `PassageHistory`, `ReadingHistory`, `EMPTY_READING`; `ReadingState` removed; `Passage` fields; `PassageCredit`, `PassageWord` | 1, 2, 3 |
| `src/langdu/pool.ts` (new, + test; replaces `cycle.ts`) | `ReadingPassage`, `Reader`, `readingPool` | 2, 4, 5 |
| `src/langdu/level.ts` (new, + test) | `stripNames`, `passageFit`, `passageTerm`, `termIndex`, `readerAt`, `withinReach` | 2, 3, 4 |
| `src/langdu/questions.ts` (new, + test) | `questionFor`, `withQuestion`, `shuffleQuestion` | 5 |
| `src/langdu/credit.ts` (new, + test) | `creditLine`, `LICENCE_URL` | 7 |
| `src/langdu/library.ts` (new, + test) | `libraryRows` | 7 |
| `src/langdu/misreads.ts` | ≥ 2 marks → `restFromReview` | 2 |
| `src/store/repo.ts` | `normalizeKid` → `migrateReading` | 2 |
| `src/audio/recorder.ts`, `src/activities/shared/recording.tsx`, `src/langdu/sentences.ts` | `StartOptions.maxMs`; `useRecorder(startBlocked, maxMs)`; `readLimitMs` | 2 |
| `src/app/SessionScreen.tsx`, `LangduScreen.tsx`, `HomeScreen.tsx` | history, mic fix, K, questions, 下一篇 | 2, 4, 5, 6 |
| `src/activities/langdu/LangduStep.tsx` (+ tests) | read limit; shuffle; warm-up shell + `PassageParts`; picture, 生词, names, 下一篇, credit | 2, 5, 6, 7 |
| `src/content/storybooks.json`, `public/passages/*.webp` (generated) | the 45 imported passages and their pictures | 3 |
| `src/ui/pinyinFade.tsx` | `KeepPinyin` | 6 |
| `src/ui/stage/FeedbackSheet.tsx` | `aside` (下一篇 beside 开始朗读) | 6 |
| `scripts/storybooks/` (new: `zh/`, `manifest.json`, `SOURCE.md`, `lib.ts` + test, `fetch.ts`) | vendored stories; parse, edit, chunk, level, credit | 3 |
| `scripts/import-storybooks.ts` (new) | writes `src/content/storybooks.json`, `public/passages/*.webp` | 3 |
| `src/content/index.ts`, `sentenceSources.ts`, `src/test/contentSurfaces.ts`, `sentencePinyin.json` | `PASSAGES` = own + imported; passage sentences on the content gate | 4 |
| `src/content/passages.json` | term/source on p01–p20; p12's 一家人 → 全家; p21–p73 | 3, 8, 9, 10 |
| `src/content/passageQuestions.ts` | two questions per passage | 5, 8, 9, 10 |
| `scripts/check-content.ts` (+ test) | guess-proof question checks; own-passage checks; word gate | 4, 5, 8 |
| `scripts/review-passages.ts` (new) | the passages review CSV | 8 |
| `src/parent/Credits.tsx`, `CREDITS.md`, `src/parent/PassagesPanel.tsx`, `src/parent/LibraryList.tsx` (new) | credits; Library | 7 |
| `src/activities/speaking/prompts.ts` | `eligiblePassages`, `PASSAGE_KNOWN_RATIO` removed | 2 |
| `vite.config.ts` | precache `passages/*.webp` | 11 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`, `scripts/fit-check.ts`, `scripts/fit-profile.ts` | WebKit cases and sweep | 5, 11 |
| `src/styles.css` | picture, 生词 strip, credit, 下一篇, Library | 6, 7 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (under heavy load a few rendered tests can time out: rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts. Before Task 1: `ls node_modules/.bin/vitest` (run `npm ci` if missing). Baseline on `d584ec7`: **262 files, 2300 tests pass**.

---
### Task 1: Reading history and the picking order (pure)

**Files:**
- Modify: `src/types.ts` (add `PassageHistory`, `ReadingHistory`, `EMPTY_READING` after the `ReadingState` block, ~line 283; nothing else changes yet)
- Create: `src/langdu/history.ts`, `src/langdu/history.test.ts`
- Create: `src/langdu/pick.ts`, `src/langdu/pick.test.ts`

**Interfaces:**
- Consumes: `parseDateKey` (`src/lib/date.ts`).
- Produces (types.ts): `interface PassageHistory { reads: number; lastRead: string | null; rest: number; lastSkipped?: string; skips?: number; q: number }`; `interface ReadingHistory { history: Record<string, PassageHistory>; lastKind: 'new' | 'revisit' | null; lastWarmup: string | null; warmups: number }`; `const EMPTY_READING: ReadingHistory`.
- Produces (history.ts): `GAP_DAYS = 3`, `REST_LADDER = [3, 7, 18, 45]`, `RETIRE_AFTER = 60`, `RETIRED_REST = 112`, `WARMUP_EVERY = 3`, `MISREADS_FOR_REST = 2`, `NO_HISTORY: PassageHistory`; `daysBetween(from: string, to: string): number`; `entryOf(r: ReadingHistory, id: string): PassageHistory`; `isRetired(e: PassageHistory): boolean`; `inGap(e: PassageHistory, today: string): boolean`; `overdue(e: PassageHistory, today: string): number | null`; `readToday(r: ReadingHistory, today: string): boolean`; `type ReadHow = 'well' | 'not-well' | 'extra'`; `readHow(o: { extra: boolean; asked: boolean; meaning: { correct: boolean } | null }): ReadHow`; `nextRest(rest: number, well: boolean): number`; `afterRead(r, id, today, how: ReadHow): ReadingHistory`; `afterSkip(r, id, today): ReadingHistory`; `restFromReview(r, id, reviewDay: string): ReadingHistory`; `warmupDue(r, today): boolean`; `afterWarmup(r, today, recorded: boolean): ReadingHistory`; `migrateReading(raw: unknown): ReadingHistory`.
- Produces (pick.ts): `BAND_LOW = 0.9`, `BAND_HIGH = 0.97`, `BAND_AIM = 0.93`; `type PassageSource = 'parent' | 'ziji' | 'gsb'`; `interface StoryPart { id: string; part: number; parts: number }`; `interface Candidate { id: string; source: PassageSource; fit: number; story?: StoryPart }`; `inBand(fit: number): boolean`; `pickOrder<T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T[]`; `pickPassage<T extends Candidate>(r, pool, today): T | null`.

- [ ] **Step 1: Add the history types**

In `src/types.ts`, directly after `export const DEFAULT_READING: ReadingState = …;` (line 283), add:

```ts
/** One passage's 朗读 history (spec 2026-10-15 §4): due again `rest` days after `lastRead`; `q` the next question's turn. */
export interface PassageHistory {
  reads: number;
  lastRead: string | null;
  rest: number;
  lastSkipped?: string; // 下一篇 swapped it out that day: the 3-day gap applies
  skips?: number; // 下一篇 swaps, for the parent ("often skipped" at 3)
  q: number;
}

/** 朗读 progress (spec 2026-10-15 §4): each passage's history, the kind of the last lesson read (new and revisit take turns),
 *  the day the warm-up last ran, and warm-ups recorded. */
export interface ReadingHistory {
  history: Record<string, PassageHistory>;
  lastKind: 'new' | 'revisit' | null;
  lastWarmup: string | null;
  warmups: number;
}

export const EMPTY_READING: ReadingHistory = { history: {}, lastKind: null, lastWarmup: null, warmups: 0 };
```

- [ ] **Step 2: Write the failing history tests**

Create `src/langdu/history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, afterWarmup, daysBetween, entryOf, inGap, isRetired, migrateReading, overdue, readHow, readToday, RETIRED_REST, restFromReview, warmupDue } from './history';

const H0: ReadingHistory = EMPTY_READING;
/** Read `id` on each day in turn, each read going `how`. */
const reads = (r: ReadingHistory, id: string, days: string[], how: 'well' | 'not-well' = 'well') => days.reduce((s, d) => afterRead(s, id, d, how), r);

describe('daysBetween', () => {
  it('counts whole calendar days, across a month end, negative backwards', () => {
    expect(daysBetween('2026-10-15', '2026-10-18')).toBe(3);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-10-18', '2026-10-15')).toBe(-3);
  });
});

describe('rest after a read (spec 2026-10-15 §4, D6)', () => {
  it('a first read rests 3 days, however it went', () => {
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 1 });
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'not-well'), 'p01').rest).toBe(3);
  });
  it('read well, the rest climbs 3 → 7 → 18 → 45, then the passage retires', () => {
    const rests: number[] = [];
    let r = H0;
    for (const d of ['2026-10-01', '2026-10-04', '2026-10-11', '2026-10-29', '2026-12-13']) {
      r = afterRead(r, 'p01', d, 'well');
      rests.push(entryOf(r, 'p01').rest);
    }
    expect(rests).toEqual([3, 7, 18, 45, RETIRED_REST]);
    expect(isRetired(entryOf(r, 'p01'))).toBe(true);
  });
  it('a missed question puts the rest back to 3', () => {
    const r = afterRead(reads(H0, 'p01', ['2026-10-01', '2026-10-04', '2026-10-11']), 'p01', '2026-10-29', 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 4, rest: 3, lastRead: '2026-10-29' });
  });
  it('the question turn moves on with each lesson read; 多读一遍 leaves rest, turn and kind alone but counts for the gap', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04']);
    expect(entryOf(r, 'p01')).toMatchObject({ q: 2, rest: 7 });
    r = afterRead(r, 'p01', '2026-10-12', 'extra');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 3, q: 2, rest: 7, lastRead: '2026-10-12' });
    expect(r.lastKind).toBe('revisit');
  });
  it('a first read in 多读一遍 rests 3 days and leaves the first question for next time', () => {
    expect(entryOf(afterRead(H0, 'p02', '2026-10-15', 'extra'), 'p02')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 0 });
  });
  it('a lesson read records whether it was new or a revisit', () => {
    const r = afterRead(H0, 'p01', '2026-10-01', 'well');
    expect(r.lastKind).toBe('new');
    expect(afterRead(r, 'p01', '2026-10-04', 'well').lastKind).toBe('revisit');
  });
});

describe('how a read went: never from the recording (spec §1 cause 4)', () => {
  it('no question: well; a question: well only when answered right; 多读一遍: extra', () => {
    expect(readHow({ extra: false, asked: false, meaning: null })).toBe('well');
    expect(readHow({ extra: false, asked: true, meaning: { correct: true } })).toBe('well');
    expect(readHow({ extra: false, asked: true, meaning: { correct: false } })).toBe('not-well');
    expect(readHow({ extra: false, asked: true, meaning: null })).toBe('not-well');
    expect(readHow({ extra: true, asked: true, meaning: { correct: true } })).toBe('extra');
  });
});

describe('the 3-day gap and due revisits', () => {
  const r = afterRead(H0, 'p01', '2026-10-15', 'well');
  it('never within 3 days of the last read, the same day included', () => {
    expect(['2026-10-15', '2026-10-16', '2026-10-17'].map((d) => inGap(entryOf(r, 'p01'), d))).toEqual([true, true, true]);
    expect(inGap(entryOf(r, 'p01'), '2026-10-18')).toBe(false);
  });
  it('due once its rest has passed; overdue counts the days since', () => {
    expect(overdue(entryOf(r, 'p01'), '2026-10-17')).toBe(-1);
    expect(overdue(entryOf(r, 'p01'), '2026-10-18')).toBe(0);
    expect(overdue(entryOf(r, 'p01'), '2026-10-21')).toBe(3);
    expect(overdue(entryOf(r, 'p99'), '2026-10-21')).toBeNull(); // never read
  });
  it('readToday', () => {
    expect(readToday(r, '2026-10-15')).toBe(true);
    expect(readToday(r, '2026-10-16')).toBe(false);
  });
});

describe('下一篇 (spec 2026-10-15 §5)', () => {
  it('a skip starts the gap and counts, leaving reads and rest alone', () => {
    const r = afterSkip(afterSkip(reads(H0, 'p01', ['2026-10-01']), 'p01', '2026-10-09'), 'p01', '2026-10-20');
    expect(entryOf(r, 'p01')).toEqual({ reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastSkipped: '2026-10-20', skips: 2 });
    expect(inGap(entryOf(r, 'p01'), '2026-10-22')).toBe(true);
    expect(entryOf(afterSkip(H0, 'p05', '2026-10-20'), 'p05')).toMatchObject({ reads: 0, skips: 1 });
  });
});

describe("the parent's misread marks (spec 2026-10-15 §4)", () => {
  it('due again 3 days after the review, from any rest, a retired passage too', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04', '2026-10-11']); // rest 18
    r = restFromReview(r, 'p01', '2026-10-13');
    expect(overdue(entryOf(r, 'p01'), '2026-10-16')).toBe(0);
    expect(entryOf(r, 'p01').lastRead).toBe('2026-10-11');
    const retired: ReadingHistory = { ...H0, history: { p02: { reads: 5, lastRead: '2026-10-01', rest: RETIRED_REST, q: 5 } } };
    expect(isRetired(entryOf(restFromReview(retired, 'p02', '2026-10-02'), 'p02'))).toBe(false);
  });
  it('a passage never read is left alone', () => {
    expect(restFromReview(H0, 'p01', '2026-10-13')).toBe(H0);
  });
});

describe('the warm-up (spec 2026-10-15 §4)', () => {
  it('runs when the last was 3 or more days ago, or never', () => {
    expect(warmupDue(H0, '2026-10-15')).toBe(true);
    const r = afterWarmup(H0, '2026-10-15', true);
    expect(r).toMatchObject({ lastWarmup: '2026-10-15', warmups: 1 });
    expect(['2026-10-15', '2026-10-17', '2026-10-18'].map((d) => warmupDue(r, d))).toEqual([false, false, true]);
    expect(afterWarmup(H0, '2026-10-15', false)).toMatchObject({ lastWarmup: '2026-10-15', warmups: 0 }); // the mic refused: it still ran
  });
});

describe('the one-off move from the 3-day cycle (spec 2026-10-15 §8)', () => {
  const old = { passageId: 'p03', days: 2, extra: 1, lastDay: '2026-10-14', lastRead: { p01: '2026-10-08', p03: '2026-10-14' }, warmups: 4 };
  it('each passage read becomes one read resting 3 days, its question asked; the current one keeps its days as reads', () => {
    expect(migrateReading(old)).toEqual({
      history: { p01: { reads: 1, lastRead: '2026-10-08', rest: 3, q: 1 }, p03: { reads: 2, lastRead: '2026-10-14', rest: 3, q: 1 } },
      lastKind: null,
      lastWarmup: '2026-10-14',
      warmups: 4,
    });
  });
  it('runs once: a second run changes nothing', () => {
    expect(migrateReading(migrateReading(old))).toEqual(migrateReading(old));
  });
  it('a cycle not yet begun is no warm-up; anything unreadable is no history', () => {
    expect(migrateReading({ passageId: null, days: 0, extra: 0, lastDay: null, lastRead: {}, warmups: 0 })).toEqual(EMPTY_READING);
    expect(migrateReading(undefined)).toEqual(EMPTY_READING);
    expect(migrateReading('x')).toEqual(EMPTY_READING);
    expect(migrateReading({ history: { p01: { reads: 'x', lastRead: 7, rest: -1, q: 2 } }, lastKind: 'old', warmups: 2 })).toEqual({ history: { p01: { reads: 0, lastRead: null, rest: 0, q: 2 } }, lastKind: null, lastWarmup: null, warmups: 2 });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/langdu/history.test.ts`
Expected: FAIL — `Failed to resolve import "./history"`.

- [ ] **Step 4: Write `src/langdu/history.ts`**

```ts
// 朗读's reading history (spec 2026-10-15 §4): each passage's reads and rest, so a passage comes back on a spaced schedule —
// never within 3 days, then 3 → 7 → 18 → 45 days while he reads it well, back to 3 on a miss — and retires after that.
import { parseDateKey } from '../lib/date';
import { EMPTY_READING, type PassageHistory, type ReadingHistory } from '../types';

/** No passage comes back within this many days of its last read or skip; the same day counts (D6, D7). */
export const GAP_DAYS = 3;
/** Rest after a read: a first read and a miss give the first step; a good read climbs one step (D6). */
export const REST_LADDER = [3, 7, 18, 45] as const;
/** Rest past this retires a passage: offered again only when nothing else is. */
export const RETIRE_AFTER = 60;
/** The rest a good read past 45 days gives (45 × 2.5): over RETIRE_AFTER, so retired. */
export const RETIRED_REST = 112;
/** The self-introduction warm-up runs when the last one was this many days ago or more (about twice a week). */
export const WARMUP_EVERY = 3;
/** The parent's misread marks reset the rest from this many marks on a take. */
export const MISREADS_FOR_REST = 2;

export const NO_HISTORY: PassageHistory = { reads: 0, lastRead: null, rest: 0, q: 0 };

/** Whole calendar days from one date key to another (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);

export const entryOf = (r: ReadingHistory, id: string): PassageHistory => r.history[id] ?? NO_HISTORY;
export const isRetired = (e: PassageHistory): boolean => e.rest > RETIRE_AFTER;
/** Read or skipped in the last 3 days, today included. */
export const inGap = (e: PassageHistory, today: string): boolean => [e.lastRead, e.lastSkipped].some((d) => !!d && daysBetween(d, today) < GAP_DAYS);

/** Days past due (≥ 0: due); null for a passage never read, or retired. */
export function overdue(e: PassageHistory, today: string): number | null {
  if (!e.reads || !e.lastRead || isRetired(e)) return null;
  return daysBetween(e.lastRead, today) - e.rest;
}

export const readToday = (r: ReadingHistory, today: string): boolean => Object.values(r.history).some((e) => e.lastRead === today);

/** How a read went: 'well' (the question right first time, or no question), 'not-well' (missed), 'extra' (多读一遍). */
export type ReadHow = 'well' | 'not-well' | 'extra';

/** Never from the recording: an unrecorded 读完了 is a read like any other (spec §1 cause 4). */
export function readHow(o: { extra: boolean; asked: boolean; meaning: { correct: boolean } | null }): ReadHow {
  if (o.extra) return 'extra';
  if (!o.asked) return 'well';
  return o.meaning?.correct ? 'well' : 'not-well';
}

export function nextRest(rest: number, well: boolean): number {
  if (!well) return REST_LADDER[0];
  return REST_LADDER.find((s) => s > rest) ?? RETIRED_REST;
}

/** A read: the first rests 3 days; then a good read climbs the ladder and a miss goes back to 3. 多读一遍 ('extra') counts for
 *  the gap and the reads only. A lesson read moves the question turn on and says whether it was new or a revisit. */
export function afterRead(r: ReadingHistory, id: string, today: string, how: ReadHow): ReadingHistory {
  const e = entryOf(r, id);
  const first = e.reads === 0;
  const rest = first ? REST_LADDER[0] : how === 'extra' ? e.rest : nextRest(e.rest, how === 'well');
  const entry: PassageHistory = { ...e, reads: e.reads + 1, lastRead: today, rest, q: how === 'extra' ? e.q : e.q + 1 };
  return { ...r, history: { ...r.history, [id]: entry }, lastKind: how === 'extra' ? r.lastKind : first ? 'new' : 'revisit' };
}

/** 下一篇 swapped it out before he read it: the 3-day gap applies; its reads and rest are untouched (spec §5). */
export function afterSkip(r: ReadingHistory, id: string, today: string): ReadingHistory {
  const e = entryOf(r, id);
  return { ...r, history: { ...r.history, [id]: { ...e, lastSkipped: today, skips: (e.skips ?? 0) + 1 } } };
}

/** The parent marked ≥ 2 misreads: due again 3 days after the review (replaces the old extra day). A retired passage comes back. */
export function restFromReview(r: ReadingHistory, id: string, reviewDay: string): ReadingHistory {
  const e = r.history[id];
  if (!e?.reads || !e.lastRead) return r;
  const rest = Math.max(0, daysBetween(e.lastRead, reviewDay)) + REST_LADDER[0];
  return { ...r, history: { ...r.history, [id]: { ...e, rest } } };
}

export const warmupDue = (r: ReadingHistory, today: string): boolean => !r.lastWarmup || daysBetween(r.lastWarmup, today) >= WARMUP_EVERY;
/** The warm-up ran today; `recorded`: his self-introduction was kept (warm-ups count recorded ones). */
export const afterWarmup = (r: ReadingHistory, today: string, recorded: boolean): ReadingHistory => ({ ...r, lastWarmup: today, warmups: r.warmups + (recorded ? 1 : 0) });

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const day = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/**
 * His stored progress in today's shape. The 3-day cycle (spec 2026-10-12: passageId, days, extra, lastDay, lastRead) moves over
 * once: each passage read becomes one read resting 3 days, its question asked; the cycle's passage keeps its days as reads; a
 * cycle begun is the last warm-up. Today's shape is checked field by field. Anything unreadable is no history. Idempotent.
 */
export function migrateReading(raw: unknown): ReadingHistory {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_READING, history: {} };
  const x = raw as Record<string, unknown>;
  const warmups = num(x.warmups);
  if (x.history && typeof x.history === 'object') {
    const history: Record<string, PassageHistory> = {};
    for (const [id, v] of Object.entries(x.history as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const e = v as Record<string, unknown>;
      const lastSkipped = day(e.lastSkipped);
      const skips = num(e.skips);
      history[id] = { reads: num(e.reads), lastRead: day(e.lastRead), rest: num(e.rest), q: num(e.q), ...(lastSkipped ? { lastSkipped } : {}), ...(skips ? { skips } : {}) };
    }
    const lastKind = x.lastKind === 'new' || x.lastKind === 'revisit' ? x.lastKind : null;
    return { history, lastKind, lastWarmup: day(x.lastWarmup), warmups };
  }
  const history: Record<string, PassageHistory> = {};
  const lastRead = x.lastRead && typeof x.lastRead === 'object' ? (x.lastRead as Record<string, unknown>) : {};
  for (const [id, d] of Object.entries(lastRead)) {
    const at = day(d);
    if (at) history[id] = { reads: 1, lastRead: at, rest: REST_LADDER[0], q: 1 };
  }
  const days = num(x.days);
  const current = typeof x.passageId === 'string' ? x.passageId : null;
  if (current && days >= 1 && history[current]) history[current] = { ...history[current]!, reads: days };
  return { history, lastKind: null, lastWarmup: days >= 1 ? day(x.lastDay) : null, warmups };
}
```

- [ ] **Step 5: Run the history tests**

Run: `npx vitest run src/langdu/history.test.ts`
Expected: PASS (all 18).

- [ ] **Step 6: Write the failing picking tests**

Create `src/langdu/pick.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, RETIRED_REST } from './history';
import { pickOrder, pickPassage, type Candidate } from './pick';

const H0: ReadingHistory = EMPTY_READING;
const c = (id: string, fit: number, over: Partial<Candidate> = {}): Candidate => ({ id, source: id.startsWith('pp:') ? 'parent' : id.startsWith('gsb:') ? 'gsb' : 'ziji', fit, ...over });
const ids = (xs: Candidate[]) => xs.map((x) => x.id);
const T = '2026-10-15';

describe('pickPassage (spec 2026-10-15 §4)', () => {
  it('an unread school text comes first, in the order added, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.93), c('pp:b', 0.5), c('pp:a', 0.95)], T)?.id).toBe('pp:b');
  });
  it('a new passage in band, nearest 0.93; never one he can barely read; an easy one only when nothing is in band', () => {
    expect(pickPassage(H0, [c('p01', 0.97), c('p02', 0.925), c('p03', 0.9)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.85), c('p02', 0.99)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.85)], T)).toBeNull();
  });
  it('no repeats within 3 days, the same day included: a second lesson today gets another passage', () => {
    const r = afterRead(H0, 'p02', T, 'well');
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.95)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.93)], '2026-10-17')).toBeNull();
    expect(pickPassage(r, [c('p02', 0.93)], '2026-10-18')?.id).toBe('p02'); // due after its 3-day rest
  });
  it('new and revisit take turns: after a new passage the most overdue revisit, after a revisit a new one', () => {
    let r = afterRead(afterRead(H0, 'p01', '2026-10-01', 'well'), 'p02', '2026-10-05', 'well'); // p01 due 10-04, p02 due 10-08
    r = afterRead(r, 'p03', '2026-10-12', 'well'); // a new one last
    const pool = [c('p01', 0.95), c('p02', 0.95), c('p03', 0.95), c('p04', 0.93)];
    expect(pickPassage(r, pool, T)?.id).toBe('p01'); // 11 days overdue; p02 7, p03 0
    const after = afterRead(r, 'p01', T, 'well');
    expect(after.lastKind).toBe('revisit');
    expect(pickPassage(after, pool, '2026-10-18')?.id).toBe('p04');
  });
  it('nothing new in band: a due revisit; then anything readable outside the gap; retired ones last, oldest first', () => {
    const r: ReadingHistory = {
      ...H0,
      lastKind: 'revisit',
      history: {
        p01: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2 }, // not due
        p02: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 }, // due
        p03: { reads: 6, lastRead: '2026-08-01', rest: RETIRED_REST, q: 6 },
        p04: { reads: 6, lastRead: '2026-07-01', rest: RETIRED_REST, q: 6 },
      },
    };
    expect(ids(pickOrder(r, [c('p01', 0.95), c('p02', 0.95), c('p03', 0.95), c('p04', 0.95)], T))).toEqual(['p02', 'p01', 'p04', 'p03']);
  });
  it('a skipped passage keeps out of the way for 3 days', () => {
    const r = afterSkip(H0, 'p02', T);
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.96)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.96)], '2026-10-18')?.id).toBe('p02');
  });
  it('ZiJi and Global Storybooks take turns: the source with fewer passages read first, ZiJi on a tie', () => {
    const pool = [c('gsb:0001-1', 0.93), c('p05', 0.95)];
    expect(pickPassage(H0, pool, T)?.id).toBe('p05');
    const r = afterRead(H0, 'p09', '2026-10-14', 'well'); // inside its gap today
    expect(pickPassage(r, [...pool, c('p09', 0.95)], T)?.id).toBe('gsb:0001-1');
  });
  it('story parts only in order, and the next part of a started story comes first', () => {
    const s = (part: number, fit: number) => c(`gsb:0066-${part}`, fit, { story: { id: '0066', part, parts: 3 } });
    const pool = [s(2, 0.93), s(3, 0.93), s(1, 0.91), c('p05', 0.93)];
    expect(ids(pickOrder(H0, pool, T))).toEqual(['p05', 'gsb:0066-1']); // ZiJi on the tie; parts 2 and 3 wait for part 1
    const r = afterRead(H0, 'gsb:0066-1', '2026-10-10', 'well');
    expect(pickPassage({ ...r, lastKind: 'revisit' }, pool, T)?.id).toBe('gsb:0066-2'); // ahead of p05
  });
  it('an empty pool, or everything inside the gap, gives nothing', () => {
    expect(pickPassage(H0, [], T)).toBeNull();
    expect(pickPassage(afterRead(H0, 'p01', T, 'well'), [c('p01', 0.93)], T)).toBeNull();
  });
  it('history for a passage no longer in the pool (a deleted school text) is ignored', () => {
    expect(pickPassage(afterRead(H0, 'pp:gone', '2026-10-01', 'well'), [c('p01', 0.93)], T)?.id).toBe('p01');
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run src/langdu/pick.test.ts`
Expected: FAIL — `Failed to resolve import "./pick"`.

- [ ] **Step 8: Write `src/langdu/pick.ts`**

```ts
// Which passage 朗读 reads (spec 2026-10-15 §4): an unread school text first; then new and revisit in turn — the next part of a
// story he has started, else the new passage nearest 0.93 of his reading, ZiJi and Global Storybooks taking turns; then any due
// revisit; anything he can read outside the 3-day gap; retired ones last. 下一篇 takes the next in the same order.
import type { ReadingHistory } from '../types';
import { entryOf, inGap, isRetired, overdue } from './history';

export const BAND_LOW = 0.9;
export const BAND_HIGH = 0.97;
export const BAND_AIM = 0.93;

export type PassageSource = 'parent' | 'ziji' | 'gsb';
export interface StoryPart { id: string; part: number; parts: number }
/** A passage as the picker sees it: where it is from, how much of it he reads (fit), and its place in a story. */
export interface Candidate { id: string; source: PassageSource; fit: number; story?: StoryPart }

export const inBand = (fit: number): boolean => fit >= BAND_LOW && fit <= BAND_HIGH;
/** A parent text always; anything else in band or easy. */
const readable = (c: Candidate): boolean => c.source === 'parent' || c.fit >= BAND_LOW;

/** Every passage he may read today, best first (下一篇 takes the next). */
export function pickOrder<T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T[] {
  const e = (c: T) => entryOf(r, c.id);
  const parts = new Map(pool.filter((c) => c.story).map((c) => [`${c.story!.id}#${c.story!.part}`, c]));
  const inOrder = (c: T) => {
    if (!c.story || c.story.part === 1) return true;
    const prev = parts.get(`${c.story.id}#${c.story.part - 1}`);
    return !!prev && e(prev).reads > 0;
  };
  const near = (c: T) => Math.abs(c.fit - BAND_AIM);
  const open = pool.filter((c) => !inGap(e(c), today) && inOrder(c));
  const unread = open.filter((c) => e(c).reads === 0);
  const parentNew = unread.filter((c) => c.source === 'parent');
  const due = open
    .filter((c) => (overdue(e(c), today) ?? -1) >= 0)
    .sort((a, b) => overdue(e(b), today)! - overdue(e(a), today)! || a.id.localeCompare(b.id));
  const started = unread.filter((c) => c.source !== 'parent' && !!c.story && c.story.part > 1 && c.fit >= BAND_LOW);
  const readFrom = (s: Candidate['source']) => pool.filter((c) => c.source === s && e(c).reads > 0).length;
  const turn: Candidate['source'] = readFrom('gsb') < readFrom('ziji') ? 'gsb' : 'ziji';
  const band = unread
    .filter((c) => c.source !== 'parent' && inBand(c.fit))
    .sort((a, b) => Number(b.source === turn) - Number(a.source === turn) || near(a) - near(b) || a.id.localeCompare(b.id));
  const fresh = [...started, ...band];
  const rest = open.filter((c) => !isRetired(e(c)) && readable(c)).sort((a, b) => near(a) - near(b) || a.id.localeCompare(b.id));
  const retired = open
    .filter((c) => isRetired(e(c)) && readable(c))
    .sort((a, b) => (e(a).lastRead ?? '').localeCompare(e(b).lastRead ?? '') || a.id.localeCompare(b.id));
  return [...new Set([...parentNew, ...(r.lastKind === 'new' ? [...due, ...fresh] : [...fresh, ...due]), ...rest, ...retired])];
}

export const pickPassage = <T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T | null => pickOrder(r, pool, today)[0] ?? null;
```

- [ ] **Step 9: Run both test files and the type check**

Run: `npx vitest run src/langdu/history.test.ts src/langdu/pick.test.ts && npx tsc --noEmit`
Expected: PASS (28 tests), no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/types.ts src/langdu/history.ts src/langdu/history.test.ts src/langdu/pick.ts src/langdu/pick.test.ts
git commit -m "feat(langdu): reading history with rest, and the picking order (pure)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The lesson, 多读一遍, Home and Listen & confirm on the history — an unrecorded read counts

**Files:**
- Modify: `src/types.ts` (delete `ReadingState` and `DEFAULT_READING`; `KidState.reading: ReadingHistory`; `DEFAULT_KID.reading: EMPTY_READING`; the `Recording.extraDayGiven` comment)
- Modify: `src/store/repo.ts` (`normalizeKid` uses `migrateReading`; delete `normalizeReading`)
- Delete: `src/langdu/cycle.ts`, `src/langdu/cycle.test.ts`, `src/activities/speaking/prompts.test.ts`
- Modify: `src/activities/speaking/prompts.ts` (delete `eligiblePassages`, `PASSAGE_KNOWN_RATIO`)
- Create: `src/langdu/level.ts`, `src/langdu/level.test.ts`, `src/langdu/pool.ts`, `src/langdu/pool.test.ts`
- Modify: `src/langdu/sentences.ts` (+ test) (`readLimitMs`)
- Modify: `src/audio/recorder.ts` (+ test) (`StartOptions.maxMs`), `src/activities/shared/recording.tsx` (`useRecorder(startBlocked, maxMs)`)
- Modify: `src/activities/langdu/LangduStep.tsx` (imports, `passage: LangduPassage`, the read's limit)
- Modify: `src/app/SessionScreen.tsx`, `src/app/LangduScreen.tsx`, `src/app/HomeScreen.tsx`, `src/langdu/misreads.ts`, `scripts/stage-cases/page.tsx`
- Modify tests: `src/app/langduSession.test.tsx`, `src/app/langduExtra.test.tsx`, `src/app/kantuSession.test.tsx`, `src/langdu/misreads.test.ts`, `src/langdu/review.test.ts`, `src/parent/misreadsPanel.test.tsx`, `src/store/repo.test.ts`

**Interfaces:**
- Consumes (Task 1): `ReadingHistory`, `EMPTY_READING`, `afterRead`, `afterWarmup`, `readHow`, `warmupDue`, `readToday`, `restFromReview`, `MISREADS_FOR_REST`, `migrateReading`, `pickPassage`, `Candidate`.
- Produces: `stripNames(text: string, names?: readonly string[]): string`; `passageFit(text: string, readable: ReadonlySet<string>, names?: readonly string[]): number` (level.ts); `interface ReadingPassage extends Candidate { title: string; text: string; question?: PassageQuestion }`; `type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story'>` (what `LangduStep` takes); `interface Reader { readable: ReadonlySet<string>; classTerm: string | null }`; `readingPool(parent: ParentPassage[], builtins: Passage[], reader: Reader, questions = PASSAGE_QUESTIONS): ReadingPassage[]` (pool.ts); `readLimitMs(text: string): number` (sentences.ts); `StartOptions.maxMs?: number`; `useRecorder(startBlocked = false, maxMs?: number)`. Until Task 4 every call site passes `{ readable: know.knownChars, classTerm: null }`.

- [ ] **Step 1: Write the failing tests for the new pieces**

Create `src/langdu/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { passageFit, stripNames } from './level';

describe('passageFit (spec 2026-10-15 §3)', () => {
  it('the share of character tokens he can read, punctuation ignored', () => {
    expect(passageFit('我爱爸爸，我爱妈妈。', new Set(['我', '爱', '爸']))).toBeCloseTo(6 / 8);
  });
  it('names never count, for or against', () => {
    expect(stripNames('卡莱七岁。卡莱很高。', ['卡莱'])).toBe('七岁。很高。');
    expect(passageFit('卡莱七岁。卡莱很高。', new Set(['七', '岁', '很', '高']), ['卡莱'])).toBe(1);
  });
  it('no Han characters: 0', () => {
    expect(passageFit('…', new Set(['我']))).toBe(0);
  });
});
```

Create `src/langdu/pool.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readingPool } from './pool';

const reader = (chars: string) => ({ readable: new Set(Array.from(chars)), classTerm: null });

describe('readingPool (spec 2026-10-15 §4)', () => {
  it('his school texts first, in the order added, then the built-ins, each with how much of it he reads', () => {
    const pool = readingPool([{ id: 'pp:b', title: 'b', text: '我爱你。', createdAt: 2 }, { id: 'pp:a', title: 'a', text: '我。', createdAt: 1 }], [{ id: 'p01', title: 'x', text: '我爱鬱。' }], reader('我爱'));
    expect(pool.map((p) => [p.id, p.source, Number(p.fit.toFixed(2))])).toEqual([['pp:a', 'parent', 1], ['pp:b', 'parent', 0.67], ['p01', 'ziji', 0.67]]);
  });
  it("a built-in brings its question; a parent text brings the parent's, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [{ id: 'p01', title: 'x', text: '我。' }],
      reader('我'),
      { p01: { ...q, sentence: 0 } },
    );
    expect(pool.map((p) => p.question)).toEqual([q, undefined, { ...q, sentence: 0 }]);
  });
});
```

Append to `src/langdu/sentences.test.ts` (and add `readLimitMs` to its import from `./sentences`):

```ts
describe('readLimitMs (spec 2026-10-15 §8)', () => {
  it('a minute at least; 0.8 s a character for a long passage', () => {
    expect(readLimitMs('我爱妈妈。'.repeat(10))).toBe(60_000);
    expect(readLimitMs('我'.repeat(110))).toBe(88_000);
  });
});
```

In `src/audio/recorder.test.ts`, inside `describe('recording levels', …)` (its `afterEach` restores real timers and globals), before the test `'creates the audio context during the tap, …'`, add:

```ts
  it("stops by itself at the caller's limit (朗读's long passages, spec 2026-10-15 §8)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) } });
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported = () => true; mimeType = 'audio/mp4'; state = 'recording'; ondataavailable = null; onstop = null; start() {} stop() {} });
    const onAutoStop = vi.fn();
    await startRecording(onAutoStop, undefined, { maxMs: 88_000 });
    vi.advanceTimersByTime(60_000);
    expect(onAutoStop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(28_000);
    expect(onAutoStop).toHaveBeenCalledOnce();
  });
```

In `src/store/repo.test.ts`, replace the body of `'fills oral-exam fields and reading progress for old records'`'s two reading lines and add a test after it:

```ts
    expect(normalizeKid({ petName: '松露' } as never)?.reading).toEqual({ history: {}, lastKind: null, lastWarmup: null, warmups: 0 });
    expect(normalizeKid({ reading: 'x' } as never)?.reading.warmups).toBe(0);
  });
  it('an old 3-day cycle in a stored or restored record reads as history (spec 2026-10-15 §8)', () => {
    const reading = { passageId: 'p03', days: 2, extra: 0, lastDay: '2026-10-14', lastRead: { p01: '2026-10-08', p03: '2026-10-14' }, warmups: 4 };
    expect(normalizeKid({ reading } as never)?.reading).toEqual({ history: { p01: { reads: 1, lastRead: '2026-10-08', rest: 3, q: 1 }, p03: { reads: 2, lastRead: '2026-10-14', rest: 3, q: 1 } }, lastKind: null, lastWarmup: '2026-10-14', warmups: 4 });
```

(the closing `});` of the new test is the old test's existing one).

- [ ] **Step 2: Move the rendered and store tests onto the history**

`src/app/langduSession.test.tsx` — let `NEWK` below stand for `reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-04', warmups: 1 }` (write it out in each place):
- `'runs the warm-up and today's passage, …, and counts one cycle day'` → title `'… and counts the read and the warm-up'`; assertion `expect(kid.reading).toEqual({ history: { 'pp:1': { reads: 1, lastRead: '2026-10-05', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-05', warmups: 1 });`
- `'a full storage still finishes the 朗读 step and counts the day'` → `'… counts the read'`; `expect((await getKid(app.db))!.reading.history['pp:1']?.reads).toBe(1);`
- `'after day 1 of a passage: no warm-up, …'` → `'a warm-up 1 day ago: no warm-up, straight to listening; only the read is saved, and a revisit read well rests 7 days'`; its saved kid uses `NEWK`; final assertion `expect((await getKid(app.db))!.reading).toMatchObject({ history: { 'pp:1': { reads: 2, lastRead: '2026-10-05', rest: 7, q: 2 } }, lastKind: 'revisit', lastWarmup: '2026-10-04', warmups: 1 });`
- `'no take (the mic refused): the passage day is not counted (review M-6)'` → `'no take (the mic refused): the read still counts, so the passage moves on (spec 2026-10-15 §1 cause 4)'`; saved kid uses `NEWK`; final assertion `expect((await getKid(app.db))!.reading.history['pp:1']).toMatchObject({ reads: 2, lastRead: '2026-10-05' });`
- `"… no bonus, the day still counts …"` → `"… no bonus, the read still counts …"`; `expect(kid.reading.history['pp:1']?.reads).toBe(1);`
- `'a lesson begun before midnight … counts its cycle day …'` → `'… counts its read on the lesson's date (one date key)'`; `expect((await getKid(app.db))!.reading).toMatchObject({ history: { 'pp:1': { reads: 1, lastRead: '2026-10-05' } }, lastWarmup: '2026-10-05' });`
- add before `'his answer to the meaning question …'`:

```ts
  it('a second lesson the same day reads a different passage (D7)', async () => {
    const app = await setup();
    await saveParentPassage(app.db, { id: 'pp:2', title: '我的猫', text: '我爱我的猫。', createdAt: 2 });
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-10-05', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-05', warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('我爱我的猫。')).toBeTruthy();
    expect(screen.queryByText('我爱爸爸，我爱妈妈。')).toBeNull();
  });
```

`src/app/langduExtra.test.tsx`:
- import `EMPTY_READING` from `../types`;
- the shared `kid` becomes `const kid = { ...DEFAULT_KID, reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-09-25', rest: 3, q: 1 } }, lastKind: 'new' as const, lastWarmup: '2026-09-25', warmups: 3 } };`
- `"Home's 多读一遍 button opens an extra round of today's passage; …"` → `"Home's 多读一遍 button opens an extra round; it saves the read and counts it for the gap, leaving rest, turn and stars alone"`; replace `expect(after.reading.days).toBe(1);` with `expect(after.reading.history['pp:1']).toEqual({ reads: 2, lastRead: '2026-10-02', rest: 3, q: 1 });`
- `'a 朗读 he read today stays on the path, named 朗读'`: its kid's reading becomes `{ ...EMPTY_READING, history: { 'pp:1': { reads: 1, lastRead: '2026-10-06', rest: 3, q: 1 } } }`
- add before `'no 多读一遍 button when there is nothing to read'`:

```ts
  it('多读一遍 reads another passage than the one read today (D7)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveParentPassage(app.db, { id: 'pp:2', title: '我的猫', text: '我爱我的猫。', createdAt: 2 });
    await saveKid(app.db, { ...kid, reading: { ...kid.reading, history: { 'pp:1': { reads: 1, lastRead: '2026-10-02', rest: 3, q: 1 } } } });
    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱我的猫。')).toBeTruthy();
  });
```

`src/app/kantuSession.test.tsx`: `expect(kid.reading.days).toBe(0);` → `expect(kid.reading.history).toEqual({});`.

`src/langdu/misreads.test.ts` — import `EMPTY_READING`; let `H` stand for `{ ...EMPTY_READING, history: { 'pp:1': { reads: 2, lastRead: '2026-10-01', rest: 18, q: 2 } } }` and every `saveKid(…, { ...DEFAULT_KID, reading: { passageId: … } })` in the file save `reading: H` instead:
- first test → `'turns misread characters into priority words; 2 or more make the passage due 3 days after the review'`; `expect((await getKid(db))!.reading.history['pp:1']).toEqual({ reads: 2, lastRead: '2026-10-01', rest: 7, q: 2 }); // 4 days since the read + 3`
- `'a passage that has moved on gets no extra day, …'` → `'one mark leaves the rest alone, and no marks changes nothing'`; `expect((await getKid(db))!.reading.history['pp:1']!.rest).toBe(18);`
- `'a second save of the same recording adds no second extra day'` becomes:

```ts
  it('a one-mark save then a two-mark save acts once, on the second', async () => {
    const { db, rec } = await setup();
    await applyMisreads(db, rec, ['天'], now);
    expect((await getKid(db))!.reading.history['pp:1']!.rest).toBe(18);
    await applyMisreads(db, (await listRecordings(db))[0]!, ['天', '地'], now);
    expect((await getKid(db))!.reading.history['pp:1']!.rest).toBe(7);
  });
```

- `'sweep: unmarking every character and marking again adds no second extra day'` becomes:

```ts
  it('sweep: unmarking every character and marking again on a later day resets the rest no second time', async () => {
    const { db, rec } = await setup();
    await applyMisreads(db, rec, ['天', '地'], now);
    await applyMisreads(db, (await listRecordings(db))[0]!, [], now);
    await applyMisreads(db, (await listRecordings(db))[0]!, ['天', '地'], new Date(2026, 9, 9, 17));
    expect((await getKid(db))!.reading.history['pp:1']!.rest).toBe(7);
  });
```

`src/langdu/review.test.ts` — drop `import { addExtraDay } from './cycle';`, import `EMPTY_READING` from `../types`; the test `'a retry after a failed save grants one extra day and finishes the take'` → `'a retry after a failed save resets the rest once and finishes the take'` with `const before = { ...EMPTY_READING, history: { p01: { reads: 2, lastRead: '2026-09-25', rest: 18, q: 2 } } };`, both `finishPassageReview` calls marking `['爱', '我']`, and the end:

```ts
    expect(await getRecording(db, 'a')).toMatchObject({ review: 'ok', misread: ['爱', '我'] });
    expect((await getKid(db))!.reading.history.p01).toEqual({ reads: 2, lastRead: '2026-09-25', rest: 10, q: 2 }); // due 3 days after the review, once
```

`src/parent/misreadsPanel.test.tsx` — import `EMPTY_READING`; `'final review: a double tap on Save gives the passage one extra day, not two'` → `'final review: a double tap on Save resets the rest once'`, saving `reading: { ...EMPTY_READING, history: { 'pp:1': { reads: 2, lastRead: '2026-10-01', rest: 18, q: 2 } } }`; mark both characters and assert the rest:

```ts
    for (const b of document.querySelectorAll('button.misread-ch')) if (b.getAttribute('aria-pressed') !== 'true') fireEvent.click(b); // 大 and 人: two marks
    fireEvent.click(screen.getByText('Save misread characters'));
    fireEvent.click(screen.getByText('Save misread characters'));
    await screen.findByText(/will come up in practice/);
    expect((await getKid(app.db))!.reading.history['pp:1']!.rest).toBe(7);
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/langdu/level.test.ts src/langdu/pool.test.ts src/app/langduSession.test.tsx src/langdu/misreads.test.ts`
Expected: FAIL — `./level` and `./pool` don't resolve; the session tests find `reading.history` undefined.

- [ ] **Step 4: Types and the store**

In `src/types.ts` delete the `/** 朗读 progress: the passage in its 3-day cycle … */ export interface ReadingState { … }` block and `export const DEFAULT_READING …`; set `KidState.reading: ReadingHistory;` and `DEFAULT_KID.reading: EMPTY_READING,`; change the `extraDayGiven` comment to `// its marks have acted on the passage (≥ 2 marks: due 3 days after the review, spec 2026-10-15 §4), once per take; named for the old extra day`.

In `src/store/repo.ts`: import `migrateReading` from `../langdu/history`; drop `DEFAULT_READING` and `ReadingState` from the `../types` import; in `normalizeKid` use `reading: migrateReading(kid.reading),`; delete `function normalizeReading`.

- [ ] **Step 5: Level, pool, limit**

Create `src/langdu/level.ts`:

```ts
// Levelling 朗读's passages (spec 2026-10-15 §3): how much of a passage he can read. Names (transliterated, always shown with
// pinyin) are left out of every count.
import { hanChars } from '../content';

/** The text without its names: they never count for or against a reader. */
export const stripNames = (text: string, names: readonly string[] = []): string => names.reduce((t, n) => t.split(n).join(''), text);

/** The share of the passage's Han characters (tokens, names left out) in `readable`; 0 for a passage with none. */
export function passageFit(text: string, readable: ReadonlySet<string>, names: readonly string[] = []): number {
  const han = hanChars(stripNames(text, names));
  return han.length ? han.filter((c) => readable.has(c)).length / han.length : 0;
}
```

Create `src/langdu/pool.ts`:

```ts
// 朗读's pool (spec 2026-10-15 §3–§4): his school texts first, in the order added, then the built-in passages, each with how much
// of it he can read now (fit) and its meaning question. pickPassage (pick.ts) chooses from it.
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import type { ParentPassage, Passage, PassageQuestion } from '../types';
import { passageFit } from './level';
import type { Candidate } from './pick';

export interface ReadingPassage extends Candidate {
  title: string;
  text: string;
  question?: PassageQuestion;
}

/** What the 朗读 step itself needs of a passage (where it came from and its fit are the picker's). */
export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story'>;

/** Who is reading: the characters he can read (K, spec §3) and his class's term (null: unknown). */
export interface Reader { readable: ReadonlySet<string>; classTerm: string | null }

export function readingPool(parent: ParentPassage[], builtins: Passage[], reader: Reader, questions: Readonly<Record<string, PassageQuestion>> = PASSAGE_QUESTIONS): ReadingPassage[] {
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'parent', fit: passageFit(p.text, reader.readable), ...(p.question ? { question: p.question } : {}) })),
    ...builtins.map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'ziji', fit: passageFit(p.text, reader.readable), ...(questions[p.id] ? { question: questions[p.id] } : {}) })),
  ];
}
```

Append to `src/langdu/sentences.ts`:

```ts
/** 朗读's read stops by itself after this (spec 2026-10-15 §8): the recorder's minute, or 0.8 s a character for a long passage
 *  (88 s for 110). Here, not in recorder.ts, which the step's tests replace. */
export const readLimitMs = (text: string): number => Math.max(60_000, Math.round(Array.from(text).filter((c) => HAN.test(c)).length * 800));
```

`src/audio/recorder.ts`: add to `StartOptions` `/** stop by itself after this long (default MAX_RECORDING_MS) */ maxMs?: number;` and in `startRecording` use `const timer = setTimeout(onAutoStop, opts.maxMs ?? MAX_RECORDING_MS);`.

`src/activities/shared/recording.tsx`: `export function useRecorder(startBlocked = false, maxMs?: number)` (doc: `maxMs: its auto-stop (the recorder's minute when absent)`), and in `open` pass `{ meterCtx, wasSpeaking, ...(maxMs ? { maxMs } : {}) }`.

`src/activities/langdu/LangduStep.tsx`: `import type { LangduPassage } from '../../langdu/pool';` (replacing the `cycle` import); `passage: LangduPassage;`; import `readLimitMs` from `../../langdu/sentences`; `const read = useRecorder(micBlocked, readLimitMs(passage.text)); // long passages get longer (spec 2026-10-15 §8)`; the `withWarmup` doc becomes `/** the warm-up is due (warmupDue): the self-introduction first */`.

Delete `src/langdu/cycle.ts`, `src/langdu/cycle.test.ts`, `src/activities/speaking/prompts.test.ts`; `src/activities/speaking/prompts.ts` keeps only `HELPER_QUESTIONS` and its comment.

- [ ] **Step 6: The screens and the misread marks**

`src/app/SessionScreen.tsx`:

```ts
import { afterRead, afterWarmup, readHow, warmupDue } from '../langdu/history';
import { pickPassage } from '../langdu/pick';
import { readingPool, type ReadingPassage } from '../langdu/pool';
```

(replacing the `../langdu/cycle` import). Above `interface Loaded` add:

```ts
/** Today's 朗读: the passage, whether the warm-up runs (warmupDue), and the lesson's date key. */
interface LangduSpeaking { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; warmup: boolean; day: string }
```

and type `speaking: LangduSpeaking | { kind: 'story'; scene: Scene } | null;`. In the load:

```ts
          const passage = settings.langdu ? pickPassage(k.reading, readingPool(parentPassages, PASSAGES, { readable: know.knownChars, classTerm: null }), day) : null;
          const kind = nextSpeaking(k.speakingLast, !!passage, settings.story);
          if (kind === 'langdu' && passage) return { kind: 'langdu' as const, passage, oral: settings.oral, warmup: warmupDue(k.reading, day), day };
```

In `onLangduDone` (doc: "count the read in his history — recorded or not (spec 2026-10-15 §1 cause 4)"), `const reading = state.speaking as LangduSpeaking;` and the save:

```ts
        const fresh = (await getKid(db)) ?? kid;
        // every read counts, a take or none: an unrecorded 读完了 moves the passage on too (spec 2026-10-15 §1 cause 4)
        const read = afterRead(fresh.reading, reading.passage.id, reading.day, readHow({ extra: false, asked: !!reading.passage.question, meaning: r.meaning }));
        await saveKid(db, {
          ...fresh,
          reading: reading.warmup ? afterWarmup(read, reading.day, !!r.intro) : read,
          speakingLast: 'langdu',
          bonusStars: fresh.bonusStars + (bonus ? 1 : 0),
        });
```

and render `withWarmup={state.speaking.warmup}`.

`src/app/LangduScreen.tsx`: imports `afterRead` (history), `pickPassage` (pick), `readingPool, type ReadingPassage` (pool), `updateKid` (repo); doc `/** 多读一遍 from Home (spec 2026-10-15 §5): a passage by the same order as the lesson's, never one read today — listen, read, compare — no warm-up, no question, no stars; it counts as a read for the gap ('extra'). */`; the pick passes `{ readable: know.knownChars, classTerm: null }`; in `done`, after the take's block and before `go({ name: 'home' })`:

```ts
    try {
      await updateKid(db, (k) => ({ ...k, reading: afterRead(k.reading, passage.id, localDateKey(now()), 'extra') })); // a take or none
    } catch (err) {
      logError(err);
    }
```

`src/app/HomeScreen.tsx`: imports `readToday` (history), `pickPassage` (pick), `readingPool` (pool); `canRead` passes `{ readable: data.know.knownChars, classTerm: null }`; `: canRead || readToday(k.reading, today) ? 'langdu' : null;`.

`src/langdu/misreads.ts`: replace `import { addExtraDay } from './cycle';` with `import { localDateKey } from '../lib/date';` and `import { MISREADS_FOR_REST, restFromReview } from './history';`; the doc's last clause becomes "and with 2 or more marks the passage is due again 3 days after this review (spec 2026-10-15 §4), once per take"; then:

```ts
  // once per take: saving again, or unmarking and marking again, doesn't act a second time (extraDayGiven: "its marks have acted")
  const act = chars.length >= MISREADS_FOR_REST && !recording.extraDayGiven && recording.prompt.kind === 'passage';
  await updateRecording(db, { ...recording, misread: chars, ...(act || recording.extraDayGiven ? { extraDayGiven: true } : {}) });
```

and at the end:

```ts
  if (act && recording.prompt.kind === 'passage') {
    const passageId = recording.prompt.passageId;
    await updateKid(db, (kid) => ({ ...kid, reading: restFromReview(kid.reading, passageId, localDateKey(now)) }));
  }
```

`scripts/stage-cases/page.tsx`: `passage={{ ...p, question: PASSAGE_QUESTIONS[p.id] }}` (drop `source: 'builtin'`).

- [ ] **Step 7: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all pass (measured on the prototype: 264 files, 2328 tests).

- [ ] **Step 8: Commit**

```bash
git add -A src scripts/stage-cases/page.tsx
git commit -m "feat(langdu): the lesson reads by history — rest, no same-day repeats, an unrecorded read counts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Vendor and import Global Storybooks (build time)

**Files:**
- Modify: `src/types.ts` (`Passage` gains `term`, `source`, `names?`, `words?`, `image?`, `story?`, `credit?`; new `PassageCredit`, `PassageWord`)
- Modify: `src/langdu/level.ts` (+ test) (`TERM_BAR`, `termIndex`, `passageTerm`)
- Modify: `src/content/passages.json` (each of p01–p20 gains `"term"` and `"source":"ziji"`)
- Create: `scripts/storybooks/lib.ts`, `scripts/storybooks/lib.test.ts`, `scripts/storybooks/fetch.ts`, `scripts/storybooks/manifest.json`, `scripts/storybooks/SOURCE.md`, `scripts/storybooks/zh/*.md` (40, fetched)
- Create: `scripts/import-storybooks.ts`; generated `src/content/storybooks.json`, `public/passages/gsb-*.webp` (45)
- Modify tests' fixtures: `src/langdu/pool.test.ts`, `scripts/check-content.test.ts` (a `Passage` literal now needs `term` and `source`)

**Interfaces:**
- Consumes: `hanChars`, `MOE_TERMS` (`src/content`), `LESSONS` (`src/content/curriculum`), `BLOCKED` (`src/content/blocked`), `tiles` (`src/content/zuju`), `passageFit` (Task 2), `splitSentences`, sharp.
- Produces (types.ts): `interface PassageCredit { title: string; text: string; illustration: string; translation: string; licence: 'CC BY 3.0' | 'CC BY-NC 3.0'; adapted: boolean; source: string }`; `interface PassageWord { text: string; gloss: string }`; `interface Passage { id; title; text; term: string; source: 'ziji' | 'gsb'; names?: string[]; words?: PassageWord[]; image?: string; story?: { id: string; part: number; parts: number }; credit?: PassageCredit }`.
- Produces (level.ts): `TERM_BAR = 0.9`; `termIndex(term: string): number`; `passageTerm(text: string, names?: readonly string[]): string | null`.
- Produces (scripts/storybooks/lib.ts): `SBC_COMMIT`, `IMAGEBANK_COMMIT`, `IMAGE_CACHE = 'scripts/.cache/storybooks'` (already git-ignored by `scripts/.cache/`), `CHUNK_MIN = 40`, `CHUNK_MAX = 110`, `LAST_TERM = '三上'`; `parseStory(md)`, `applyEdits(pages, edits)`, `blockedIn(text): string[]`, `chunkPages(pages): { firstPage: number; text: string }[]`, `passageImage(story, chunk)`, `pageImage(story, page)`, `sourceUrl(file)`, `importStory(file, md, entry): ImportedStory`, `importAll(manifest, files): ImportedStory[]`.
- Produces (data): `src/content/storybooks.json` = `{ about: string; passages: Passage[] }` — 45 passages, ids `gsb:<story>-<chunk>`, pictures at `public/passages/gsb-<story>-<chunk>.webp` (Task 4 merges them into `PASSAGES`).

- [ ] **Step 1: Extend the passage type**

In `src/types.ts` replace `export interface Passage { id: string; title: string; text: string; }` with:

```ts
/** Where a Global Storybooks passage comes from (spec 2026-10-15 §2.1): the story's credits, its licence, whether we changed it. */
export interface PassageCredit {
  title: string; // the story's title
  text: string; // its author(s)
  illustration: string;
  translation: string;
  licence: 'CC BY 3.0' | 'CC BY-NC 3.0';
  adapted: boolean; // the manifest edited it (「有改动」)
  source: string; // the story's Markdown at the pinned commit
}

/** A 生词 shown under the title on Listen (spec 2026-10-15 §2.2): the word and its kid gloss. */
export interface PassageWord { text: string; gloss: string }

/** A built-in 朗读 passage: ours (`p01`…) or a Global Storybooks chunk (`gsb:<story>-<chunk>`). */
export interface Passage {
  id: string;
  title: string;
  text: string;
  term: string; // the MOE term it levels at (passageTerm)
  source: 'ziji' | 'gsb';
  names?: string[]; // transliterated names: left out of levelling, always shown with pinyin
  words?: PassageWord[];
  image?: string; // under public/, e.g. 'passages/gsb-0001-1.webp'
  story?: { id: string; part: number; parts: number };
  credit?: PassageCredit;
}
```

In `src/langdu/pool.test.ts` and `scripts/check-content.test.ts`, every passage literal (`{ id: 'p01', title: 'x', text: … }`, `{ id: 'x', title: 't', text: … }`) gains `term: '一上', source: 'ziji'`.

- [ ] **Step 2: Write the failing levelling tests**

Append to `src/langdu/level.test.ts` (and import `PASSAGES` from `../content`, `passageTerm` and `termIndex` from `./level`):

```ts
describe('passageTerm (spec 2026-10-15 §3: the earliest term with ≥ 90% read)', () => {
  it("levels by his book's cumulative 识读字, names left out", () => {
    expect(passageTerm('我爸爸，我妈妈。')).toBe('一上');
    expect(passageTerm('我爱风筝。')).toBe('二下'); // 筝 is first read in 二下: 3 of 4 by 二上
    expect(passageTerm('我爱我爱我爱我爱风筝。')).toBe('一下'); // 9 of 10 by 一下, where 爱 is first read
    expect(passageTerm('我爱我爱我爱我风筝。')).toBe('二下'); // 8 of 9 (89%) by 一下: not enough
    expect(passageTerm('安迪斯瓦喜欢踢足球。')).toBeNull();
    expect(passageTerm('安迪斯瓦喜欢踢足球。', ['安迪斯瓦'])).toBe('二下'); // 踢 is 二下
    expect(passageTerm('魑魅魍魉。')).toBeNull();
    expect(termIndex('二下')).toBe(3);
  });
  it('every own passage carries the term the leveller gives it', () => {
    expect(PASSAGES.filter((p) => p.source === 'ziji').filter((p) => p.term !== passageTerm(p.text, p.names)).map((p) => p.id)).toEqual([]);
  });
});
```

Characters' first-read terms these rely on (moe2024.json): 我 爸 妈 风 足 一上; 爱 喜 欢 球 一下; 筝 踢 二下; 迪 斯 瓦 魑 魅 魍 魉 none.

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/langdu/level.test.ts`
Expected: FAIL — `passageTerm is not a function` (not exported).

- [ ] **Step 4: Write `passageTerm` and label p01–p20**

`src/langdu/level.ts`: change the content import to `import { hanChars, MOE_TERMS } from '../content';`, add `import { LESSONS } from '../content/curriculum';`, and append:

```ts
/** A passage's term is the earliest whose cumulative 识读字 cover this share of its characters (spec 2026-10-15 §2.1 counts and the band floor: 90%). */
export const TERM_BAR = 0.9;
const CUMULATIVE: ReadonlySet<string>[] = MOE_TERMS.map((t) => new Set(LESSONS.filter((l) => MOE_TERMS.indexOf(l.term) <= MOE_TERMS.indexOf(t)).flatMap((l) => Array.from(l.read))));

/** A term's place in his book's order (一上 = 0); −1 for an unknown term. */
export const termIndex = (term: string): number => MOE_TERMS.indexOf(term);

/** The earliest term by whose end ≥ 90% of the passage's characters (names left out) are on his book's 识读字 lists; null past 三下. */
export function passageTerm(text: string, names: readonly string[] = []): string | null {
  const i = CUMULATIVE.findIndex((set) => passageFit(text, set, names) >= TERM_BAR);
  return i < 0 ? null : MOE_TERMS[i]!;
}
```

In `src/content/passages.json` add to each object `"term":"<term>","source":"ziji"` (after `"text"`), with these terms (measured with `passageTerm`): p01 一下, p02 一下, p03 二上, p04 一下, p05 一下, p06 二上, p07 一下, p08 一下, p09 二上, p10 一下, p11 一下, p12 一下, p13 一下, p14 二上, p15 一下, p16 二上, p17 二上, p18 二上, p19 二下, p20 一下.

Run: `npx vitest run src/langdu/level.test.ts && npx tsc --noEmit`
Expected: PASS (5 tests); no type errors.

- [ ] **Step 5: The manifest and the source note**

Create `scripts/storybooks/manifest.json` (level from the site's `stories/zh/level1–5/` pages; names: transliterated names in the story; edits: D2's light fixes, each `from` unique in its story; 0072 and 0342 excluded on theme, spec §2.1):

```json
{
  "0001": {"level": 2, "names": []},
  "0002": {"level": 1, "names": []},
  "0003": {"level": 1, "names": []},
  "0004": {"level": 2, "names": [], "edits": [{"from": "多给了一点儿", "to": "多给了一点", "why": "Singapore usage: 一点, not 一点儿"}, {"from": "一点儿都不急", "to": "一点都不急", "why": "Singapore usage: 一点, not 一点儿"}]},
  "0006": {"level": 3, "names": ["阿南西", "尼亚美"]},
  "0008": {"level": 1, "names": []},
  "0009": {"level": 1, "names": []},
  "0027": {"level": 2, "names": []},
  "0030": {"level": 1, "names": []},
  "0052": {"level": 5, "names": ["辛波薇亚", "阿妮塔"], "edits": [{"from": "一点儿也不开心", "to": "一点也不开心", "why": "Singapore usage: 一点, not 一点儿"}]},
  "0066": {"level": 3, "names": ["诺孜贝儿"]},
  "0067": {"level": 1, "names": []},
  "0072": {"level": 4, "include": false, "why": "revenge and blood (指蜜鸟的复仇): too dark for 7", "names": ["奈吉", "青其儿"]},
  "0087": {"level": 1, "names": []},
  "0089": {"level": 2, "names": ["卡莱", "肯尼亚"]},
  "0095": {"level": 2, "names": ["赞玛"]},
  "0110": {"level": 3, "names": ["旺加里", "马塔伊", "肯尼亚"]},
  "0111": {"level": 2, "names": []},
  "0112": {"level": 1, "names": []},
  "0120": {"level": 1, "names": ["图丽", "安娜", "凯茜", "萨玛", "巴巴", "萨内蕾", "塔波", "腾巴"]},
  "0129": {"level": 1, "names": []},
  "0141": {"level": 3, "names": []},
  "0156": {"level": 1, "names": []},
  "0158": {"level": 3, "names": []},
  "0201": {"level": 3, "names": []},
  "0210": {"level": 2, "names": ["丁吉"]},
  "0231": {"level": 1, "names": []},
  "0234": {"level": 2, "names": ["安迪斯瓦"]},
  "0243": {"level": 4, "names": ["欧东格", "阿皮尤", "尼亚·坎亚达"], "edits": [{"from": "一点儿都不想走", "to": "一点都不想走", "why": "Singapore usage: 一点, not 一点儿"}]},
  "0262": {"level": 5, "names": ["玛格威", "托马斯", "内罗毕"]},
  "0271": {"level": 1, "names": []},
  "0291": {"level": 4, "names": ["福思"]},
  "0294": {"level": 4, "names": []},
  "0296": {"level": 2, "names": ["汤姆"]},
  "0302": {"level": 1, "names": []},
  "0315": {"level": 3, "names": ["萨可满"]},
  "0324": {"level": 3, "names": []},
  "0327": {"level": 1, "names": [], "edits": [{"from": "斑馬", "to": "斑马", "why": "a traditional character (馬) in simplified text"}]},
  "0337": {"level": 2, "names": []},
  "0342": {"level": 2, "include": false, "why": "惩罚 (punishment): dark in theme; beyond 三上 anyway", "names": ["拉希姆"]}
}
```

Create `scripts/storybooks/SOURCE.md`:

```markdown
# Global Storybooks Chinese — vendored for 朗读

- **What:** the 40 Mandarin (simplified) stories of Global Storybooks (UBC, built from the African Storybook), one Markdown file each.
- **From:** https://github.com/global-asp/sbc-source, folder `zh/`, commit `be28dab38ac55e8eb2185edb6631b11615d02185` (2026-06-08).
- **Pictures:** https://github.com/global-asp/gsn-imagebank, commit `0df409752c86adc92685816e19e6085c4e4496f1`; each passage shows its first page's picture (`<story>/<page + 1>.jpg`, `01` is the cover), converted to WebP in `public/passages/`. A picture carries its story's licence and illustrator credit.
- **Licences (per story):** CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/) for 29 stories; CC BY-NC 3.0 (https://creativecommons.org/licenses/by-nc/3.0/) for 11: 0002, 0003, 0009, 0030, 0067, 0112, 0120, 0129, 0231, 0234, 0271. ZiJi is free and non-commercial; drop the CC BY-NC stories (manifest `include: false`) if that ever changes.
- **Credits:** each story's `License`, `Text`, `Illustration` and `Translation` lines travel with every passage made from it (`credit` in `src/content/storybooks.json`), shown under the passage and in the parent area's Credits.
- **Changes:** light edits only, listed with their reasons in `manifest.json` (Singapore usage 一点儿 → 一点; the traditional 馬 in 0327). A changed story is marked 「有改动」/adapted wherever it is credited.
- **Files:** `zh/*.md` (verbatim at the commit), `manifest.json` (level, include, names, edits per story), `lib.ts` (parse, edit, chunk, level), `fetch.ts` (re-vendors and fetches pictures), `../import-storybooks.ts` (writes the passages and pictures).
```

- [ ] **Step 6: Write the failing import tests**

Create `scripts/storybooks/lib.test.ts`:

```ts
// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hanChars } from '../../src/content';
import imported from '../../src/content/storybooks.json';
import { termIndex } from '../../src/langdu/level';
import type { Passage } from '../../src/types';
import { applyEdits, blockedIn, chunkPages, importAll, importStory, parseStory, type Manifest } from './lib';

const md = (title: string, pages: string[], licence = 'CC-BY') =>
  `# ${title}\n\n${pages.map((p) => `##\n${p}\n`).join('\n')}\n##\n* License: [${licence}]\n* Text: A. Writer\n* Illustration: B. Painter\n* Translation: C. Translator\n* Language: zh\n`;
const EASY = '我爸爸妈妈。'.repeat(12); // 60 characters read in 一上
const HARD = '魑魅魍魉饕。'.repeat(12); // 60 characters on no list

describe('parseStory (spec 2026-10-15 §2.1)', () => {
  it('reads the title, one page a ## block, and the credit list', () => {
    const s = parseStory(md('两个', ['两只手用来拿东西。', '两只脚\n用来踢踢球。'], 'CC-BY-NC'));
    expect(s).toEqual({ title: '两个', pages: ['两只手用来拿东西。', '两只脚用来踢踢球。'], licence: 'CC BY-NC 3.0', text: 'A. Writer', illustration: 'B. Painter', translation: 'C. Translator' });
  });
  it('an unknown licence, or no credit list, fails the import', () => {
    expect(() => parseStory(md('x', ['我。'], 'CC-BY-SA'))).toThrow(/unknown licence/);
    expect(() => parseStory('# x\n\n##\n我。\n')).toThrow(/no credit list/);
  });
});

describe('applyEdits', () => {
  const e = (from: string) => ({ from, to: '一点', why: 'Singapore usage' });
  it('replaces an edit found exactly once', () => {
    expect(applyEdits(['多给了一点儿。', '好。'], [e('一点儿')])).toEqual(['多给了一点。', '好。']);
  });
  it('a missing or ambiguous edit fails', () => {
    expect(() => applyEdits(['好。'], [e('一点儿')])).toThrow(/found 0 times/);
    expect(() => applyEdits(['一点儿。', '一点儿。'], [e('一点儿')])).toThrow(/found 2 times/);
  });
});

describe('chunkPages: page-aligned passages of 40–110 characters', () => {
  const page = (n: number) => '我'.repeat(n - 1) + '。';
  it('fills a passage up to 110 characters, then starts the next at a page', () => {
    expect(chunkPages([page(30), page(30), page(30), page(30), page(30)]).map((c) => [c.firstPage, c.text.length])).toEqual([[1, 90], [4, 60]]);
  });
  it('a short tail joins the passage before it', () => {
    expect(chunkPages([page(100), page(20)]).map((c) => c.text.length)).toEqual([120]);
  });
  it('a page over 110 characters is cut at its sentences', () => {
    const long = '我爱爸爸妈。'.repeat(30); // 150 characters, 30 sentences of 5
    expect(chunkPages([long]).map((c) => [c.firstPage, hanChars(c.text).length])).toEqual([[1, 110], [1, 40]]);
  });
});

describe('importStory', () => {
  const entry = { level: 1 as const, names: [] };
  it('one passage a chunk with its picture, its part and the credit; a single part keeps the plain title', () => {
    const s = importStory('9001_好.md', md('好', [EASY]), entry);
    expect(s.passages).toEqual([{ id: 'gsb:9001-1', title: '好', text: EASY, term: '一上', source: 'gsb', image: 'passages/gsb-9001-1.webp', story: { id: '9001', part: 1, parts: 1 }, credit: { title: '好', text: 'A. Writer', illustration: 'B. Painter', translation: 'C. Translator', licence: 'CC BY 3.0', adapted: false, source: 'https://github.com/global-asp/sbc-source/blob/be28dab/zh/9001_%E5%A5%BD.md' } }]);
    expect(s.images).toEqual([{ out: 'passages/gsb-9001-1.webp', page: '9001/02.jpg' }]);
  });
  it('keeps half or more of the chunks when the opening survives; parts are numbered over the kept ones, ids keep the chunk', () => {
    const s = importStory('9002_好.md', md('好', [EASY, HARD, EASY]), entry);
    expect(s.passages.map((p) => [p.id, p.title, p.story])).toEqual([['gsb:9002-1', '好（1）', { id: '9002', part: 1, parts: 2 }], ['gsb:9002-3', '好（2）', { id: '9002', part: 2, parts: 2 }]]);
  });
  it('drops a story when fewer than half its chunks survive, or its opening does not', () => {
    expect(importStory('9003_好.md', md('好', [EASY, HARD, HARD]), entry).passages).toEqual([]);
    expect(importStory('9004_好.md', md('好', [HARD, EASY, EASY]), entry).passages).toEqual([]);
  });
  it('a chunk with a word from the blocklist is dropped like a chunk beyond 三上 (D2 allows no rewording)', () => {
    expect(blockedIn('孩子们说：“我们不是傻瓜。”')).toEqual(['傻瓜']);
    const blocked = '我们不是傻瓜。'.repeat(10);
    expect(importStory('9006_好.md', md('好', [EASY, blocked, EASY]), entry).passages.map((p) => p.id)).toEqual(['gsb:9006-1', 'gsb:9006-3']);
  });
  it('names are left out of the level and kept on the passage that has them; an edited story is adapted', () => {
    const s = importStory('9005_好.md', md('好', [EASY + '卡莱'.repeat(10) + '斑馬。']), { level: 1, names: ['卡莱', '旺加里'], edits: [{ from: '斑馬', to: '斑马', why: 'a traditional character' }] });
    expect(s.passages[0]).toMatchObject({ term: '一上', names: ['卡莱'], credit: { adapted: true } }); // counted, the 20 name characters would leave it unlevelled
    expect(s.passages[0]!.text.endsWith('斑马。')).toBe(true);
  });
});

describe('the vendored stories (scripts/storybooks/zh at be28dab)', () => {
  const manifest = JSON.parse(readFileSync('scripts/storybooks/manifest.json', 'utf8')) as Manifest;
  const files = readdirSync('scripts/storybooks/zh').filter((f) => f.endsWith('.md')).sort();
  const passages = (imported as unknown as { passages: Passage[] }).passages;
  it('all 40 are vendored and in the manifest', () => {
    expect(files).toHaveLength(40);
    expect(files.map((f) => f.slice(0, 4))).toEqual(Object.keys(manifest).sort());
  });
  it('storybooks.json is exactly what the import makes of them (deterministic, nothing hand-edited)', () => {
    expect(importAll(manifest, files.map((file) => ({ file, md: readFileSync(`scripts/storybooks/zh/${file}`, 'utf8') }))).flatMap((s) => s.passages)).toEqual(passages);
  });
  it('about 45 passages, all read by 三上, each credited and licensed, each with its picture within budget', () => {
    expect(passages.length).toBeGreaterThanOrEqual(40);
    expect(passages.length).toBeLessThanOrEqual(50);
    expect(passages.filter((p) => termIndex(p.term) < 0 || termIndex(p.term) > termIndex('三上'))).toEqual([]);
    expect(passages.filter((p) => !p.credit || !['CC BY 3.0', 'CC BY-NC 3.0'].includes(p.credit.licence) || !p.credit.text || !p.credit.translation)).toEqual([]);
    const sizes = passages.map((p) => statSync(`public/${p.image}`).size);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(60_000);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1_500_000);
  });
  it('the CC BY-NC stories are the eleven the spec lists (D1: included)', () => {
    const nc = files.filter((f) => parseStory(readFileSync(`scripts/storybooks/zh/${f}`, 'utf8')).licence === 'CC BY-NC 3.0').map((f) => f.slice(0, 4));
    expect(nc).toEqual(['0002', '0003', '0009', '0030', '0067', '0112', '0120', '0129', '0231', '0234', '0271']);
  });
  it('every edited story is marked adapted, and only those', () => {
    const edited = new Set(Object.entries(manifest).filter(([, e]) => e.edits?.length).map(([id]) => id));
    expect(passages.filter((p) => p.credit!.adapted !== edited.has(p.story!.id)).map((p) => p.id)).toEqual([]);
  });
});
```

Run: `npx vitest run scripts/storybooks/lib.test.ts`
Expected: FAIL — `Failed to resolve import "./lib"`.

- [ ] **Step 7: Write the import library**

Create `scripts/storybooks/lib.ts`:

```ts
// Global Storybooks Chinese → 朗读 passages (spec 2026-10-15 §2.1): parse a story's Markdown, apply the manifest's light edits,
// cut its pages into passages of 40–110 characters, level each, and keep the stories he can read by 三上.
import { hanChars } from '../../src/content';
import { BLOCKED } from '../../src/content/blocked';
import { tiles } from '../../src/content/zuju';
import { passageTerm, termIndex } from '../../src/langdu/level';
import { splitSentences } from '../../src/langdu/sentences';
import type { Passage, PassageCredit } from '../../src/types';

export const SBC_COMMIT = 'be28dab38ac55e8eb2185edb6631b11615d02185';
export const IMAGEBANK_COMMIT = '0df409752c86adc92685816e19e6085c4e4496f1';
/** Where fetch.ts leaves the page pictures (git-ignored). */
export const IMAGE_CACHE = 'scripts/.cache/storybooks';
export const CHUNK_MIN = 40;
export const CHUNK_MAX = 110;
/** The last term an imported passage may level at (spec §2.1: chunks beyond 三上 are dropped). */
export const LAST_TERM = '三上';

export interface Edit { from: string; to: string; why: string }
export interface StoryEntry { level: 1 | 2 | 3 | 4 | 5; include?: boolean; why?: string; names: string[]; edits?: Edit[] }
export type Manifest = Record<string, StoryEntry>;

export interface ParsedStory { title: string; pages: string[]; licence: PassageCredit['licence']; text: string; illustration: string; translation: string }

const LICENCES: Record<string, PassageCredit['licence']> = { 'CC-BY': 'CC BY 3.0', 'CC-BY-NC': 'CC BY-NC 3.0' };

/** `# title`, one `##` block a page, then the credit list (`* License: [CC-BY]`, `* Text: …`, …). */
export function parseStory(md: string): ParsedStory {
  const title = /^# (.+)$/m.exec(md)?.[1]?.trim();
  if (!title) throw new Error('no # title');
  const blocks = md.split(/^##[ \t]*$/m).slice(1).map((b) => b.trim());
  const at = blocks.findIndex((b) => b.startsWith('* License'));
  if (at < 0) throw new Error(`${title}: no credit list`);
  const field = (name: string) => new RegExp(`^\\* ${name}: (.+)$`, 'm').exec(blocks[at]!)?.[1]?.trim() ?? '';
  const licence = LICENCES[field('License').replace(/[[\]]/g, '')];
  if (!licence) throw new Error(`${title}: unknown licence "${field('License')}"`);
  const pages = blocks.slice(0, at).map((b) => b.split('\n').map((l) => l.trim()).join('')).filter((p) => p.length > 0);
  return { title, pages, licence, text: field('Text'), illustration: field('Illustration'), translation: field('Translation') };
}

/** Each edit's `from` must occur exactly once in the story (a missing or ambiguous one fails the import); it is replaced there. */
export function applyEdits(pages: string[], edits: readonly Edit[] = []): string[] {
  let out = pages;
  for (const e of edits) {
    const n = out.reduce((s, p) => s + p.split(e.from).length - 1, 0);
    if (n !== 1) throw new Error(`edit "${e.from}" found ${n} times (want exactly 1)`);
    out = out.map((p) => p.replace(e.from, e.to));
  }
  return out;
}

/** Words of the blocklist in a text, word by word as the content gate reads it (src/content/contentGate.test.ts). D2 allows no
 *  rewording, so a chunk with one is dropped like a chunk beyond 三上. */
export function blockedIn(text: string): string[] {
  return splitSentences(text).flatMap((s) => tiles(s).map((t) => t.replace(/[，。！？、；：]/g, '')).filter((t) => BLOCKED.has(t)));
}

export interface Chunk { firstPage: number; text: string }

/** Pages in order into passages of 40–110 Han characters: a page over 110 is cut at its sentences; a short tail joins the last. */
export function chunkPages(pages: string[]): Chunk[] {
  const units = pages.flatMap((p, i) => (hanChars(p).length > CHUNK_MAX ? splitSentences(p) : [p]).map((text) => ({ page: i + 1, text, n: hanChars(text).length })));
  const out: (Chunk & { n: number })[] = [];
  let cur: (Chunk & { n: number }) | null = null;
  for (const u of units) {
    if (cur && cur.n + u.n > CHUNK_MAX && cur.n >= CHUNK_MIN) {
      out.push(cur);
      cur = null;
    }
    cur ??= { firstPage: u.page, text: '', n: 0 };
    cur.text += u.text;
    cur.n += u.n;
  }
  const last = out[out.length - 1];
  if (cur && cur.n < CHUNK_MIN && last) {
    last.text += cur.text;
    last.n += cur.n;
  } else if (cur) out.push(cur);
  return out.map(({ firstPage, text }) => ({ firstPage, text }));
}

/** Where a passage's picture is served from (under public/). */
export const passageImage = (story: string, chunk: number): string => `passages/gsb-${story}-${chunk}.webp`;
/** The imagebank picture of a page: 01 is the cover, so page n is n + 1. */
export const pageImage = (story: string, page: number): string => `${story}/${String(page + 1).padStart(2, '0')}.jpg`;
export const sourceUrl = (file: string): string => `https://github.com/global-asp/sbc-source/blob/${SBC_COMMIT.slice(0, 7)}/zh/${encodeURIComponent(file)}`;

export interface ImportedStory { id: string; title: string; chunks: number; passages: Passage[]; images: { out: string; page: string }[] }

/** One story: its passages ≤ 三上 with no blocked word (none when fewer than half its chunks are, or not its first), each with
 *  its picture and the story's credit. */
export function importStory(file: string, md: string, entry: StoryEntry): ImportedStory {
  const id = file.slice(0, 4);
  const story = parseStory(md);
  const edits = entry.edits ?? [];
  const chunks = chunkPages(applyEdits(story.pages, edits)).map((c, i) => ({ ...c, chunk: i + 1, term: passageTerm(c.text, entry.names) }));
  const kept = chunks.filter((c) => c.term !== null && termIndex(c.term) <= termIndex(LAST_TERM) && !blockedIn(c.text).length);
  // fewer than half survive, or not its opening: a story missing its middle, or its start, is no story
  const whole = kept.length * 2 >= chunks.length && kept[0]?.chunk === 1;
  const credit: PassageCredit = { title: story.title, text: story.text, illustration: story.illustration, translation: story.translation, licence: story.licence, adapted: edits.length > 0, source: sourceUrl(file) };
  const passages: Passage[] = (whole ? kept : []).map((c, i, all) => {
    const names = entry.names.filter((n) => c.text.includes(n));
    return {
      id: `gsb:${id}-${c.chunk}`,
      title: all.length > 1 ? `${story.title}（${i + 1}）` : story.title,
      text: c.text,
      term: c.term!,
      source: 'gsb',
      ...(names.length ? { names } : {}),
      image: passageImage(id, c.chunk),
      story: { id, part: i + 1, parts: all.length },
      credit,
    };
  });
  const images = (whole ? kept : []).map((c) => ({ out: passageImage(id, c.chunk), page: pageImage(id, c.firstPage) }));
  return { id, title: story.title, chunks: chunks.length, passages, images };
}

/** Every included story in file order. A story missing from the manifest fails the import. */
export function importAll(manifest: Manifest, files: { file: string; md: string }[]): ImportedStory[] {
  return files.flatMap(({ file, md }) => {
    const entry = manifest[file.slice(0, 4)];
    if (!entry) throw new Error(`${file}: not in manifest.json`);
    return entry.include === false ? [] : [importStory(file, md, entry)];
  });
}
```

- [ ] **Step 8: Vendor the stories and fetch their pictures**

Create `scripts/storybooks/fetch.ts`:

```ts
// Vendors Global Storybooks Chinese at the pinned commits (spec 2026-10-15 §2.1). Run once, then the import is offline:
//   npx tsx scripts/storybooks/fetch.ts
// 1. sbc-source's zh/*.md at SBC_COMMIT → scripts/storybooks/zh/ (committed).
// 2. each included passage's first-page picture from gsn-imagebank at IMAGEBANK_COMMIT → scripts/.cache/storybooks/ (git-ignored:
//    scripts/import-storybooks.ts turns them into public/passages/*.webp, which are committed).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IMAGE_CACHE, IMAGEBANK_COMMIT, importAll, SBC_COMMIT, type Manifest } from './lib';

const DIR = 'scripts/storybooks';

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const tmp = mkdtempSync(join(tmpdir(), 'sbc-'));
writeFileSync(join(tmp, 'sbc.tgz'), await get(`https://codeload.github.com/global-asp/sbc-source/tar.gz/${SBC_COMMIT}`));
execFileSync('tar', ['-xzf', join(tmp, 'sbc.tgz'), '-C', tmp]);
mkdirSync(`${DIR}/zh`, { recursive: true });
cpSync(join(tmp, `sbc-source-${SBC_COMMIT}`, 'zh'), `${DIR}/zh`, { recursive: true });
rmSync(tmp, { recursive: true, force: true });
const files = readdirSync(`${DIR}/zh`).filter((f) => f.endsWith('.md')).sort();
console.log(`${files.length} stories in ${DIR}/zh`);

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as Manifest;
const images = importAll(manifest, files.map((file) => ({ file, md: readFileSync(`${DIR}/zh/${file}`, 'utf8') }))).flatMap((s) => s.images);
let fetched = 0;
for (const { page } of images) {
  const out = join(IMAGE_CACHE, page);
  if (existsSync(out)) continue;
  mkdirSync(join(out, '..'), { recursive: true });
  writeFileSync(out, await get(`https://raw.githubusercontent.com/global-asp/gsn-imagebank/${IMAGEBANK_COMMIT}/${page}`));
  fetched++;
}
console.log(`${images.length} pictures needed, ${fetched} fetched into ${IMAGE_CACHE}`);
```

Run: `npx tsx scripts/storybooks/fetch.ts`
Expected: `40 stories in scripts/storybooks/zh` and `45 pictures needed, 44 fetched into scripts/.cache/storybooks` (two passages start on one page). `git status` shows `scripts/storybooks/zh/` (40 files, ~168 KB) and nothing under `scripts/.cache/`.

Then check the names: for each story that will be kept, list the characters on no 识读字 list (one-off, not committed):

```bash
npx tsx -e "import {readdirSync,readFileSync} from 'node:fs'; import {importAll} from './scripts/storybooks/lib'; import {LESSONS} from './src/content/curriculum'; import {stripNames} from './src/langdu/level'; const m=JSON.parse(readFileSync('scripts/storybooks/manifest.json','utf8')); const all=new Set(LESSONS.flatMap(l=>[...l.read])); const f=readdirSync('scripts/storybooks/zh').sort(); for (const s of importAll(m,f.map(file=>({file,md:readFileSync('scripts/storybooks/zh/'+file,'utf8')})))) for (const p of s.passages) console.log(p.id, [...new Set([...stripNames(p.text,m[s.id].names)].filter(c=>/\p{Script=Han}/u.test(c)&&!all.has(c)))].join(''))"
```

Read the list: a run of unknown characters that is a person's or place's name (e.g. 茜茜, 托马斯) goes into that story's `names`; ordinary words stay (they are what the leveller should count). Re-run until no name is left unlisted.

- [ ] **Step 9: Write the importer and run it**

Create `scripts/import-storybooks.ts`:

```ts
// Builds src/content/storybooks.json and public/passages/*.webp from the vendored Global Storybooks stories (spec 2026-10-15
// §2.1). Deterministic and offline once scripts/storybooks/fetch.ts has filled the picture cache:
//   npx tsx scripts/import-storybooks.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGE_CACHE, importAll, SBC_COMMIT, type Manifest } from './storybooks/lib';

const DIR = 'scripts/storybooks';
/** One picture per passage (spec §7): at most 640 px wide (the imagebank's are 546, never enlarged), WebP quality 50 — about
 *  20 KB each as the spec planned, none over 60 KB, the set under 1.5 MB (lib.test.ts checks the budget). */
export const IMAGE_WIDTH = 640;
export const IMAGE_QUALITY = 50;

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as Manifest;
const files = readdirSync(`${DIR}/zh`).filter((f) => f.endsWith('.md')).sort();
const stories = importAll(manifest, files.map((file) => ({ file, md: readFileSync(`${DIR}/zh/${file}`, 'utf8') })));
const passages = stories.flatMap((s) => s.passages);

rmSync('public/passages', { recursive: true, force: true }); // a passage dropped since the last run leaves no picture behind
mkdirSync('public/passages', { recursive: true });
for (const { out, page } of stories.flatMap((s) => s.images)) {
  const src = join(IMAGE_CACHE, page);
  if (!existsSync(src)) throw new Error(`missing ${src}: run npx tsx scripts/storybooks/fetch.ts`);
  writeFileSync(join('public', out), await sharp(src).resize({ width: IMAGE_WIDTH, withoutEnlargement: true }).webp({ quality: IMAGE_QUALITY }).toBuffer());
}

const about = `Global Storybooks Chinese (github.com/global-asp/sbc-source, zh/, commit ${SBC_COMMIT.slice(0, 7)}), built by scripts/import-storybooks.ts from scripts/storybooks/. Each passage carries its story's credit and licence (CC BY 3.0 or CC BY-NC 3.0).`;
writeFileSync('src/content/storybooks.json', `{\n"about": ${JSON.stringify(about)},\n"passages": [\n${passages.map((p) => JSON.stringify(p)).join(',\n')}\n]\n}\n`);

const byTerm = new Map<string, number>();
for (const p of passages) byTerm.set(p.term, (byTerm.get(p.term) ?? 0) + 1);
for (const s of stories) console.log(`${s.id} ${s.title}: ${s.passages.length} of ${s.chunks} parts`);
console.log(`${passages.length} passages from ${stories.filter((s) => s.passages.length).length} stories: ${[...byTerm].map(([t, n]) => `${t} ${n}`).join(', ')}`);
```

Run: `npx tsx scripts/import-storybooks.ts`
Expected, last line: `45 passages from 21 stories: 二上 6, 三上 20, 二下 17, 一下 2` (if Step 8 added names, the counts may shift by a few; the test allows 40–50). `public/passages/` holds 45 WebP files, ~0.95 MB, none over 60 KB. Running it twice leaves `git diff` empty.

- [ ] **Step 10: Run the tests**

Run: `npx vitest run scripts/storybooks/lib.test.ts src/langdu && npx tsc --noEmit`
Expected: PASS (17 import tests); no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/types.ts src/langdu/level.ts src/langdu/level.test.ts src/langdu/pool.test.ts src/content/passages.json src/content/storybooks.json scripts/check-content.test.ts scripts/storybooks scripts/import-storybooks.ts public/passages
git commit -m "feat(langdu): vendor Global Storybooks at be28dab and import 45 levelled passages with pictures and credits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Level against what he reads now, and put the library in the pool

**Files:**
- Modify: `src/langdu/level.ts` (+ test) (`readerAt`, `withinReach`)
- Modify: `src/langdu/pool.ts` (+ test) (built-ins carry their fields, fit leaves names out, the term limit)
- Modify: `src/content/index.ts` (`PASSAGES` = own + Global Storybooks)
- Modify: `src/app/SessionScreen.tsx`, `src/app/LangduScreen.tsx`, `src/app/HomeScreen.tsx` (`readerAt(…)` instead of `{ readable: know.knownChars, classTerm: null }`)
- Modify: `src/content/sentenceSources.ts`, `src/test/contentSurfaces.ts`, `src/content/sentencePinyin.json` (passage sentences under the content gate and the pinyin snapshot)
- Modify: `scripts/check-content.ts` (+ test) (the old passage rules and the question check run on own passages for now)
- Modify tests: `src/langdu/sentences.test.ts`, `src/app/langduExtra.test.tsx`, `src/app/kantuSession.test.tsx`, `src/app/homeOnlyReading.test.tsx`

**Interfaces:**
- Consumes: `classLessonAt`, `listedBy`, `LESSONS` (`src/content/curriculum`); `termIndex`, `passageFit` (Tasks 2–3); `Passage` fields (Task 3); `storybooks.json` (Task 3).
- Produces: `readerAt(known: ReadonlySet<string>, now: Date, settings: Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>): Reader`; `withinReach(term: string, classTerm: string | null): boolean`; `ReadingPassage` gains `Pick<Passage, 'names' | 'words' | 'image' | 'credit'>` and `term?: string` (so `LangduPassage` has them for Task 6); `PASSAGES` holds p01–p20 and the 45 `gsb:` passages.

- [ ] **Step 1: Write the failing tests**

Append to `src/langdu/level.test.ts` (import `readerAt`, `withinReach`):

```ts
describe("readerAt: what he can read (spec 2026-10-15 §3, K)", () => {
  const atL12 = { grade: 2, gradeYear: 2026, classLesson: { term: '二下', lesson: 12, setAt: new Date(2026, 9, 15).getTime() } };
  it("the characters he reads, and his book's 识读字 up to his class's lesson", () => {
    const r = readerAt(new Set(['鬱']), new Date(2026, 9, 15, 17), atL12);
    expect(r.classTerm).toBe('二下');
    expect(['鬱', '我', '纸', '康'].map((c) => r.readable.has(c))).toEqual([true, true, true, true]); // 纸 二下 L11, 康 L12
    expect(r.readable.has('澡')).toBe(false); // 二下 L13: not yet
  });
  it('outside the school calendar: only what he knows, and no term limit', () => {
    const r = readerAt(new Set(['我']), new Date(2025, 11, 20), {});
    expect([...r.readable]).toEqual(['我']);
    expect(r.classTerm).toBeNull();
  });
  it('the pool reaches one term past his class at most', () => {
    expect([withinReach('三上', '二下'), withinReach('三下', '二下'), withinReach('三下', null)]).toEqual([true, false, true]);
  });
});
```

Append inside `describe('readingPool …')` in `src/langdu/pool.test.ts`:

```ts
  it('a built-in brings what the step shows (names, 生词, picture, story, credit); its names leave its fit', () => {
    const credit = { title: '好', text: 'A', illustration: 'B', translation: 'C', licence: 'CC BY 3.0' as const, adapted: false, source: 'https://x' };
    const [p] = readingPool([], [{ id: 'gsb:0001-1', title: '好', text: '卡莱爱我。', term: '一下', source: 'gsb', names: ['卡莱'], image: 'passages/gsb-0001-1.webp', story: { id: '0001', part: 1, parts: 1 }, credit }], reader('爱我'));
    expect(p).toEqual({ id: 'gsb:0001-1', title: '好', text: '卡莱爱我。', term: '一下', source: 'gsb', fit: 1, names: ['卡莱'], image: 'passages/gsb-0001-1.webp', story: { id: '0001', part: 1, parts: 1 }, credit });
  });
  it('no built-in more than a term past his class (spec §3)', () => {
    const b = (id: string, term: string) => ({ id, title: id, text: '我。', term, source: 'ziji' as const });
    expect(readingPool([], [b('p01', '二下'), b('p02', '三上'), b('p03', '三下')], { readable: new Set(['我']), classTerm: '二下' }).map((p) => p.id)).toEqual(['p01', 'p02']);
  });
```

Run: `npx vitest run src/langdu/level.test.ts src/langdu/pool.test.ts`
Expected: FAIL — `readerAt is not a function`; the pool drops `names`/`image` and keeps the 三下 passage.

- [ ] **Step 2: Write `readerAt` and `withinReach`**

In `src/langdu/level.ts` change the curriculum import to `import { classLessonAt, LESSONS, listedBy } from '../content/curriculum';`, add `import type { Settings } from '../types';` and `import type { Reader } from './pool';`, and append:

```ts
/**
 * Who is reading (spec 2026-10-15 §3): K is the characters he reads in the app and the 识读字 of every lesson of his book up to
 * his class's (he meets those at school); his class's term limits the pool to a term ahead at most.
 */
export function readerAt(known: ReadonlySet<string>, now: Date, settings: Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>): Reader {
  const at = classLessonAt(now, settings);
  if (at === null) return { readable: known, classTerm: null };
  return { readable: new Set([...known, ...listedBy(at, 'both').read]), classTerm: LESSONS[at]!.term };
}

/** In the pool at all: a passage's term at most one past his class's (spec §3); any term when his class is unknown. */
export const withinReach = (term: string, classTerm: string | null): boolean => classTerm === null || termIndex(term) <= termIndex(classTerm) + 1;
```

- [ ] **Step 3: The pool carries the passage**

Replace `src/langdu/pool.ts` with:

```ts
// 朗读's pool (spec 2026-10-15 §3–§4): his school texts first, in the order added, then the built-in passages, each with how much
// of it he can read now (fit) and its meaning question. pickPassage (pick.ts) chooses from it.
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import type { ParentPassage, Passage, PassageQuestion } from '../types';
import { passageFit, withinReach } from './level';
import type { Candidate } from './pick';

export interface ReadingPassage extends Candidate, Pick<Passage, 'names' | 'words' | 'image' | 'credit'> {
  title: string;
  text: string;
  term?: string; // a built-in's (a parent text has none)
  question?: PassageQuestion;
}

/** What the 朗读 step itself needs of a passage (where it came from and its fit are the picker's). */
export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story'>;

/** Who is reading: the characters he can read (K, spec §3) and his class's term (null: unknown). */
export interface Reader { readable: ReadonlySet<string>; classTerm: string | null }

export function readingPool(parent: ParentPassage[], builtins: Passage[], reader: Reader, questions: Readonly<Record<string, PassageQuestion>> = PASSAGE_QUESTIONS): ReadingPassage[] {
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'parent', fit: passageFit(p.text, reader.readable), ...(p.question ? { question: p.question } : {}) })),
    ...builtins
      .filter((p) => withinReach(p.term, reader.classTerm))
      .map((p): ReadingPassage => {
        const { id, title, text, term, source, names, words, image, story, credit } = p;
        return { id, title, text, term, source, fit: passageFit(text, reader.readable, names), ...(names ? { names } : {}), ...(words ? { words } : {}), ...(image ? { image } : {}), ...(story ? { story } : {}), ...(credit ? { credit } : {}), ...(questions[id] ? { question: questions[id] } : {}) };
      }),
  ];
}
```

Run: `npx vitest run src/langdu`
Expected: PASS.

- [ ] **Step 4: The library in `PASSAGES`, read by K everywhere**

`src/content/index.ts`:

```ts
import storybooks from './storybooks.json';
// …
/** 朗读's built-in passages (spec 2026-10-15 §2): ours, then the Global Storybooks chunks (scripts/import-storybooks.ts). */
export const PASSAGES: Passage[] = [...(passages as Passage[]), ...(storybooks as unknown as { passages: Passage[] }).passages];
```

Each screen imports `readerAt` from `../langdu/level` and builds the pool with it:
- `SessionScreen.tsx`: `readingPool(parentPassages, PASSAGES, readerAt(know.knownChars, today, settings))` (`today` and `settings` are the load's own).
- `LangduScreen.tsx`: `readingPool(parent, PASSAGES, readerAt(know.knownChars, now(), settings))`.
- `HomeScreen.tsx`: `readingPool(data.parentPassages, PASSAGES, readerAt(data.know.knownChars, now(), settings))` (`settings` from `useApp()`).

`src/langdu/sentences.test.ts`, `'the built-in passages split into 3–5 sentences'`: count only the first twenty — `PASSAGES.filter((p) => /^p(0\d|1\d|20)$/.test(p.id))`.

`scripts/check-content.ts`, `checkContent`: loop over `passages.filter((x) => x.source === 'ziji')` (comment: the Global Storybooks chunks are levelled by the import). `scripts/check-content.test.ts`: `checkPassageQuestions(PASSAGES.filter((p) => p.source === 'ziji'), PASSAGE_QUESTIONS, easy)` (Global Storybooks' questions come in Task 5).

- [ ] **Step 5: Passage sentences under the content gate and the pinyin snapshot**

`src/content/sentenceSources.ts`: import `splitSentences` from `../langdu/sentences` and `PASSAGES` from `./index`; in `shownSentences` add `for (const p of PASSAGES) for (const s of splitSentences(p.text)) out.add(s); // 朗读's (spec 2026-10-15 §2.2: pinyin reviewed once)` and mention 朗读's passages in the file comment.

`src/test/contentSurfaces.ts`: import `PASSAGES` (from `../content`) and `splitSentences`; in `shownSentenceRows` add `for (const p of PASSAGES) for (const s of splitSentences(p.text)) out.push({ s, for: p.id, surface: '朗读 passage' });`.

Run: `npm run pinyin`
Expected: `Wrote the pinyin of 4169 sentences` (the 20 own passages' and the 45 imported passages' sentences join).

Review the snapshot's new lines: `git diff src/content/sentencePinyin.json`. Read each passage sentence's pinyin for a wrong 多音字 (了 liǎo, 长 zhǎng/cháng, 得 dé/de, 地 dì/de, 还 huán/hái, 为 wéi/wèi, 着 zháo/zhe, 种 zhǒng/zhòng, 行 xíng/háng, 觉 jué/jiào, 只 zhī/zhǐ). A wrong one is fixed in `src/content/pinyinFixes.ts` (its existing pattern), then `npm run pinyin` again.

- [ ] **Step 6: Tests that need "nothing to read" go outside the school calendar**

With K holding his class's characters, the default test day (2026-10, 二下) makes most of the library readable. Tests that need nothing readable use a day in **2025** (no MOE calendar, so no class lesson adds characters):
- `src/app/langduExtra.test.tsx`: add under the `LANGDU` constant
  ```ts
  /** A day outside the school calendar: no class lesson adds to what he reads, so only what he knows counts (spec 2026-10-15 §3). */
  const NOTHING_READABLE = () => new Date(2025, 11, 20, 18);
  ```
  and pass `now: NOTHING_READABLE` in `'no 多读一遍 button when there is nothing to read'`, in the second `makeAppData` of `'the path says 朗读 when there is something to read, and leaves the speaking stop out when there is not'`, and in `'a started lesson with nothing to read …'` (its session's date becomes `'2025-12-20'`). Add (Review Focus 5):
  ```ts
  it('with everything readable read in the last 3 days there is no 多读一遍 and no 朗读 stop', async () => {
    const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    const app = await makeAppData({ settings: LANGDU, now: NOTHING_READABLE, kid: { ...kid, reading: { ...kid.reading, history: { 'pp:1': { reads: 1, lastRead: '2025-12-18', rest: 3, q: 1 } } } } });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(screen.queryByRole('button', { name: '多读一遍' })).toBeNull();
    expect(names()).not.toContain('朗读');
  });
  ```
- `src/app/kantuSession.test.tsx`: `setup`'s app uses `new Date(2025, 11, 20, 17)` when `withPassage` is false (comment why); `'with nothing to read, the speaking step is skipped'` uses `new Date(2025, 11, 20, 17)`.
- `src/app/homeOnlyReading.test.tsx`: `makeAppData({ now: () => new Date(2025, 11, 20, 9) })`.

- [ ] **Step 7: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all pass (prototype: 265 files, 2353 tests).

- [ ] **Step 8: Commit**

```bash
git add -A src scripts/check-content.ts scripts/check-content.test.ts
git commit -m "feat(langdu): level against his class's characters; Global Storybooks join the pool and the content gate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Two questions per passage, asked in turn, choices shuffled, guess-proofed

**Files:**
- Create: `src/langdu/questions.ts`, `src/langdu/questions.test.ts`
- Modify: `src/langdu/pool.ts` (+ test) (`questions` lists; `LangduPassage` omits them)
- Modify: `src/content/passageQuestions.ts` (`Record<id, PassageQuestion[]>`: two per passage — p01–p20 and all 45 `gsb:` passages)
- Modify: `scripts/check-content.ts` (+ test) (`questionProblems`, `topWord`, `FUNCTION_CHARS`, `QUESTIONS_PER_PASSAGE`; `checkPassageQuestions` over lists)
- Modify: `src/activities/langdu/LangduStep.tsx` (+ test) (shuffle, `rng` prop), `src/app/SessionScreen.tsx` (+ `src/app/langduSession.test.tsx`) (`withQuestion`)
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` (first question, stored order)

**Interfaces:**
- Consumes: `entryOf` (Task 1), `ReadingPassage` (Tasks 2/4), `shuffle`, `Rng` (`src/lib/random.ts`), `tiles` (`src/content/zuju.ts`), `HSK_WORDS`.
- Produces: `questionFor(qs: readonly PassageQuestion[] | undefined, turn: number): PassageQuestion | undefined`; `withQuestion<T extends ReadingPassage>(p: T, r: ReadingHistory): T`; `shuffleQuestion(q: PassageQuestion, rng: Rng): PassageQuestion`; `ReadingPassage.questions?: readonly PassageQuestion[]` (`question` is now this read's); `readingPool(…, questions: Readonly<Record<string, readonly PassageQuestion[]>> = PASSAGE_QUESTIONS)`; `PASSAGE_QUESTIONS: Readonly<Record<string, readonly PassageQuestion[]>>`; `LangduStep` prop `rng?: Rng` (default `Math.random`); `questionProblems(p: Passage, q: PassageQuestion, easy: ReadonlySet<string>): string[]`; `topWord(text: string): string | null`; `checkPassageQuestions(passages, questions: Readonly<Record<string, readonly PassageQuestion[]>>, easy): string[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/langdu/questions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { EMPTY_READING, type PassageQuestion } from '../types';
import { afterRead } from './history';
import type { ReadingPassage } from './pool';
import { questionFor, shuffleQuestion, withQuestion } from './questions';

const q1: PassageQuestion = { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 };
const q2: PassageQuestion = { q: '我家有几个人？', choices: ['三个', '四个', '五个'], answer: 2, sentence: 0 };

describe('questions in turn (spec 2026-10-15 §6)', () => {
  it('the turn picks one, round and round; none without questions', () => {
    expect([0, 1, 2, 3].map((t) => questionFor([q1, q2], t))).toEqual([q1, q2, q1, q2]);
    expect(questionFor(undefined, 0)).toBeUndefined();
    expect(questionFor([], 3)).toBeUndefined();
  });
  it("a revisit asks the other question: the passage's turn moves on with each lesson read", () => {
    const p: ReadingPassage = { id: 'p01', title: 'x', text: 'y', source: 'ziji', fit: 1, questions: [q1, q2] };
    expect(withQuestion(p, EMPTY_READING).question).toBe(q1);
    expect(withQuestion(p, afterRead(EMPTY_READING, 'p01', '2026-10-01', 'well')).question).toBe(q2);
    expect(withQuestion({ ...p, questions: undefined }, EMPTY_READING).question).toBeUndefined();
  });
});

describe('shuffleQuestion', () => {
  it('keeps the right answer right, and moves it about', () => {
    const places = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const s = shuffleQuestion(q1, mulberry32(seed));
      expect(s.choices[s.answer]).toBe('妈妈');
      expect([...s.choices].sort()).toEqual([...q1.choices].sort());
      expect(s.sentence).toBe(1);
      places.add(s.answer);
    }
    expect([...places].sort()).toEqual([0, 1, 2]);
  });
});
```

In `scripts/check-content.test.ts` replace the `describe('meaning questions (spec 2026-10-12 §3)', …)` block with the one below, and import `checkPassageQuestions, questionProblems, topWord` from `./check-content` and `type { Passage, PassageQuestion }` from `../src/types`:

```ts
describe('meaning questions (spec 2026-10-15 §6)', () => {
  const easy = new Set(BUILTIN.filter((c) => c.level <= 2).map((c) => c.char));
  it('every built-in passage has two, each passing every rule', () => {
    expect(checkPassageQuestions(PASSAGES, PASSAGE_QUESTIONS, easy)).toEqual([]);
  });
  const p: Passage = { id: 'x1', title: '我的家', text: '我家有五个人：爸爸、妈妈、哥哥、妹妹和我。爸爸是医生，妈妈是老师。我很爱我的家。', term: '一下', source: 'ziji' };
  const ok: PassageQuestion = { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 };
  const other: PassageQuestion = { q: '爸爸做什么工作？', choices: ['医生', '老师', '妹妹'], answer: 0, sentence: 1 };
  const flags = (q: PassageQuestion) => questionProblems(p, q, easy);
  it('a fair question passes', () => {
    expect(flags(ok)).toEqual([]);
  });
  it('shape: what it asks, three different choices, the right one among them, a real answering sentence, easy characters', () => {
    expect(flags({ ...ok, q: '老师好吗？' })).toContain('x1 "老师好吗？": asks none of 谁 哪 什么 为什么 怎么样');
    expect(flags({ ...ok, choices: ['爸爸', '爸爸', '哥哥'] })).toContain('x1 "谁是老师？": needs three different choices');
    expect(flags({ ...ok, answer: 3 as never })).toContain('x1 "谁是老师？": the right answer is not among the choices');
    expect(flags({ ...ok, sentence: 9 })).toContain('x1 "谁是老师？": answering sentence 9 is not one of its 3 sentences');
    expect(flags({ ...ok, choices: ['爸爸', '妈妈', '鬱'] })).toContain('x1 "谁是老师？": uses 鬱 in neither the passage nor levels 1–2');
  });
  it('rule 1: all three choices in the passage, or none', () => {
    expect(flags({ ...ok, choices: ['爸爸', '妈妈', '叔叔'] })).toContain('x1 "谁是老师？": some choices are in the passage and some not (all or none)');
  });
  it('rule 2: choice lengths within 2 characters', () => {
    expect(flags({ ...ok, choices: ['爸', '妈妈', '我的哥哥'] })).toContain('x1 "谁是老师？": choice lengths 1/2/4 differ by more than 2');
  });
  it("rule 3: the question doesn't give away the answer's characters (function characters aside)", () => {
    expect(flags({ ...ok, q: '谁是妈老师？' })).toContain('x1 "谁是妈老师？": the question gives away 妈 from its answer');
    expect(flags({ q: '我爱谁？', choices: ['我的家', '我的妈', '我的爸'], answer: 0, sentence: 2 })).not.toContain('x1 "我爱谁？": the question gives away 我 from its answer');
  });
  it("rule 4: the answer is not the passage's most frequent word (a tie leads nothing)", () => {
    expect(topWord(p.text)).toBeNull(); // 爸爸 and 妈妈 twice each
    const dad: Passage = { ...p, id: 'x2', text: '爸爸在家。爸爸看书。妈妈做饭。爸爸很高兴。' };
    expect(topWord(dad.text)).toBe('爸爸');
    expect(questionProblems(dad, { q: '谁在看书？', choices: ['爸爸', '妈妈', '我'], answer: 0, sentence: 1 }, easy)).toContain('x2 "谁在看书？": the answer 爸爸 is the passage\'s most frequent word');
  });
  it('two different questions per passage, and none for a passage that is not there', () => {
    expect(checkPassageQuestions([p], { x1: [ok] }, easy)).toContain('x1: 1 meaning questions, expected 2');
    expect(checkPassageQuestions([p], { x1: [ok, ok] }, easy)).toContain('x1: the same question twice');
    expect(checkPassageQuestions([p], { x1: [ok, other], x9: [ok, other] }, easy)).toEqual(['x9: questions for no passage']);
  });
});
```

Append inside the `describe` of `src/activities/langdu/LangduStep.test.tsx`:

```tsx
  it('shows the choices shuffled each time; the right one stays right (spec 2026-10-15 §6)', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} rng={() => 0} onDone={vi.fn()} />);
    await toCompare();
    fireEvent.click(button('下一步'));
    const shown = [...document.querySelectorAll('.langdu__choices .choice')].map((b) => [...b.querySelectorAll('.label__ch')].map((c) => c.textContent).join(''));
    expect(shown).toEqual(['妈妈', '小马', '老师']); // stored 老师 妈妈 小马
    fireEvent.click(button('妈妈'));
    expect(await screen.findByText('对了！')).toBeTruthy();
  });
```

In `src/app/langduSession.test.tsx` import `PASSAGE_QUESTIONS` from `../content/passageQuestions` and add before `'his answer to the meaning question is kept …'`:

```tsx
  it("a revisit asks the passage's other question (spec 2026-10-15 §6)", async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 5, 17) });
    await updateSettings(app.db, { activities: speakingOnly, langdu: true });
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-04', warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我的家'); // p01, due: after a new passage comes a revisit
    for (let i = 0; i < 3; i++) {
      act(() => setSpeaking(true));
      act(() => setSpeaking(false));
    }
    await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('下一步'));
    expect(await screen.findByText(PASSAGE_QUESTIONS.p01![1]!.q)).toBeTruthy();
  });
```

In `src/langdu/pool.test.ts`, the questions test becomes `"a built-in brings its questions; a parent text brings the parent's one, or none"` with `{ p01: [{ ...q, sentence: 0 }, { ...q, q: '谁爱我？' }] }` as the questions and `expect(pool.map((p) => p.questions)).toEqual([[q], undefined, [{ ...q, sentence: 0 }, { ...q, q: '谁爱我？' }]]);`.

Run: `npx vitest run src/langdu/questions.test.ts scripts/check-content.test.ts src/activities/langdu/LangduStep.test.tsx`
Expected: FAIL — `./questions` doesn't resolve; `questionProblems` is not exported; the choices show unshuffled.

- [ ] **Step 2: Write `src/langdu/questions.ts`**

```ts
// 朗读's meaning questions (spec 2026-10-15 §6): two per passage, asked in turn so a revisit asks the other, the choices shuffled
// at each showing so the right one's place is never learnt.
import { shuffle, type Rng } from '../lib/random';
import type { PassageQuestion, ReadingHistory } from '../types';
import { entryOf } from './history';
import type { ReadingPassage } from './pool';

/** The question for this turn: its questions in turn; none when it has none. */
export const questionFor = (qs: readonly PassageQuestion[] | undefined, turn: number): PassageQuestion | undefined => (qs?.length ? qs[turn % qs.length] : undefined);

/** The passage with the question this read asks (history's `q`). */
export function withQuestion<T extends ReadingPassage>(p: T, r: ReadingHistory): T {
  const question = questionFor(p.questions, entryOf(r, p.id).q);
  return question ? { ...p, question } : p;
}

/** The same question with its choices in a new order; `answer` follows the right one. */
export function shuffleQuestion(q: PassageQuestion, rng: Rng): PassageQuestion {
  const order = shuffle([0, 1, 2] as const, rng);
  return { ...q, choices: order.map((i) => q.choices[i]) as [string, string, string], answer: order.indexOf(q.answer) as 0 | 1 | 2 };
}
```

- [ ] **Step 3: Question lists through the pool, the lesson and the step**

`src/langdu/pool.ts`: the header comment ends "…and its meaning questions. pickPassage (pick.ts) chooses from it; withQuestion (questions.ts) gives the chosen one this read's question."; `ReadingPassage` gains `questions?: readonly PassageQuestion[]; // asked in turn (questions.ts)` above `question?: PassageQuestion; // this read's (withQuestion)`; `export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story' | 'questions'>;`; `readingPool`'s last parameter is `questions: Readonly<Record<string, readonly PassageQuestion[]>> = PASSAGE_QUESTIONS`; a parent text maps `...(p.question ? { questions: [p.question] } : {})`; a built-in `...(questions[id]?.length ? { questions: questions[id] } : {})`.

`src/app/SessionScreen.tsx`: `import { withQuestion } from '../langdu/questions';` and `passage: withQuestion(passage, k.reading)` in the `LangduSpeaking` it builds.

`src/activities/langdu/LangduStep.tsx`: import `shuffleQuestion` from `../../langdu/questions` and `type { Rng }` from `../../lib/random`; add the prop

```ts
  /** shuffles the question's choices at each showing (spec 2026-10-15 §6); tests and the stage cases pass a seeded one */
  rng?: Rng;
```

destructure `rng = Math.random`, and replace `const question = extra ? undefined : passage.question;` with:

```ts
  // the choices in a new order each time it is shown: the right one's place is never learnt (spec 2026-10-15 §6)
  const question = useMemo(() => (extra || !passage.question ? undefined : shuffleQuestion(passage.question, rng)), [passage.question, extra]);
```

`scripts/stage-cases/page.tsx`: `passage={{ ...p, question: PASSAGE_QUESTIONS[p.id]![0] }} rng={() => 0.999} /* no shuffle: stored order */`. `scripts/stage-cases.ts`: import `PASSAGE_QUESTIONS` from `../src/content/passageQuestions`; the missed-question case clicks a wrong choice whatever the content says:

```ts
    const q20 = PASSAGE_QUESTIONS.p20![0]!; // shown in stored order (page.tsx's rng)
    await page.click(`.langdu__choices .choice >> nth=${q20.answer === 0 ? 1 : 0}`); // a wrong choice
```

- [ ] **Step 4: The guess-proof check**

In `scripts/check-content.ts` add the imports `import { HSK_WORDS } from '../src/content';` and `import { tiles } from '../src/content/zuju';`, and replace everything from `const ASKS = …` to the end of the file with:

```ts
const ASKS = ['谁', '哪', '什么', '怎么'];
/** Characters a question may share with its answer (spec 2026-10-15 §6 rule 3): grammar and pronouns, never content. */
export const FUNCTION_CHARS: ReadonlySet<string> = new Set(Array.from('的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有'));
export const QUESTIONS_PER_PASSAGE = 2;
const PUNCT_RE = /[，。！？、；：“”‘’「」『』…—]/g;
const PARTICLES_RE = /[了吗吧呢的得着过啊呀]+$/u;
const han = (s: string) => Array.from(s).filter((ch) => HAN.test(ch));

/** The passage's most frequent dictionary word, when one word alone leads and occurs twice or more: an answer equal to it needs
 *  no reading (rule 4). A tie leads nothing (爸爸 and 妈妈 twice each: either may fairly be asked). */
export function topWord(text: string): string | null {
  const count = new Map<string, number>();
  for (const t of tiles(text)) {
    const core = t.replace(PUNCT_RE, '').replace(PARTICLES_RE, '');
    if (Array.from(core).length > 1 && HSK_WORDS.has(core)) count.set(core, (count.get(core) ?? 0) + 1);
  }
  const [best, next] = [...count].sort((a, b) => b[1] - a[1]);
  return best && best[1] >= 2 && (!next || next[1] < best[1]) ? best[0] : null;
}

/** One question's problems (spec 2026-10-15 §6): its shape, its sentence, its characters, and the guess-proofing rules 1–4. */
export function questionProblems(p: Passage, q: PassageQuestion, easy: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const tag = `${p.id} "${q.q}"`;
  if (!ASKS.some((a) => q.q.includes(a))) out.push(`${tag}: asks none of 谁 哪 什么 为什么 怎么样`);
  if (q.choices.length !== 3 || new Set(q.choices).size !== 3) out.push(`${tag}: needs three different choices`);
  const right = q.choices[q.answer];
  if (right === undefined) return [...out, `${tag}: the right answer is not among the choices`];
  const n = splitSentences(p.text).length;
  if (q.sentence === undefined || !Number.isInteger(q.sentence) || q.sentence < 0 || q.sentence >= n) out.push(`${tag}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
  const own = new Set(Array.from(p.text));
  const outside = [...new Set(han(q.q + q.choices.join('')).filter((ch) => !own.has(ch) && !easy.has(ch)))];
  if (outside.length) out.push(`${tag}: uses ${outside.join('')} in neither the passage nor levels 1–2`);
  const inText = q.choices.map((c) => p.text.includes(c));
  if (inText.some(Boolean) && !inText.every(Boolean)) out.push(`${tag}: some choices are in the passage and some not (all or none)`);
  const lengths = q.choices.map((c) => han(c).length);
  if (Math.max(...lengths) - Math.min(...lengths) > 2) out.push(`${tag}: choice lengths ${lengths.join('/')} differ by more than 2`);
  const leak = [...new Set(han(right).filter((ch) => !FUNCTION_CHARS.has(ch) && q.q.includes(ch)))];
  if (leak.length) out.push(`${tag}: the question gives away ${leak.join('')} from its answer`);
  if (right === topWord(p.text)) out.push(`${tag}: the answer ${right} is the passage's most frequent word`);
  return out;
}

/** The meaning questions (spec 2026-10-15 §6): two different ones per passage, each passing questionProblems. */
export function checkPassageQuestions(passages: Passage[], questions: Readonly<Record<string, readonly PassageQuestion[]>>, easy: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const qs = questions[p.id] ?? [];
    if (qs.length !== QUESTIONS_PER_PASSAGE) problems.push(`${p.id}: ${qs.length} meaning questions, expected ${QUESTIONS_PER_PASSAGE}`);
    if (new Set(qs.map((q) => q.q)).size !== qs.length) problems.push(`${p.id}: the same question twice`);
    for (const q of qs) problems.push(...questionProblems(p, q, easy));
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: questions for no passage`);
  return problems;
}
```

Run: `npx vitest run src/langdu scripts/check-content.test.ts src/activities/langdu src/app/langduSession.test.tsx`
Expected: everything passes except `'every built-in passage has two, each passing every rule'` (and the revisit test, which needs p01's second question), which lists every passage with 1 or 0 questions, and these 15 existing questions (measured): p03 p04 p05 p08 p10 p11 p14 p15 p16 p17 p18 p20 (choices partly in the passage), p06 and p12 (the answer is the passage's top word; p12 also mixed), p19 (the question gives away 做).

- [ ] **Step 5: Write the questions**

`src/content/passageQuestions.ts`: the type becomes `Readonly<Record<string, readonly PassageQuestion[]>>` and its header comment says: two per passage (spec 2026-10-15 §6), asked in turn; 谁 / 哪里 / 什么 / 为什么 / 怎么样; three choices; `answer` the right one in stored order (the step shuffles); `sentence` the answering sentence (`splitSentences` index); characters from the passage or HSK 1–2; the guess-proof rules that `scripts/check-content.ts` enforces.

Write, in this order:
1. **p01–p20:** keep each question that passes; rewrite the 15 above; add a second question to each. Verified examples (they pass `questionProblems`):
   ```ts
   p01: [{ q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 }, { q: '爸爸是做什么的？', choices: ['看病的', '教书的', '开车的'], answer: 0, sentence: 1 }],
   p03: [{ q: '我们为什么不能去外面玩？', choices: ['在下雨', '弟弟病了', '天黑了'], answer: 0, sentence: 0 }, { q: '下午我们去哪里玩？', choices: ['球场', '家里', '外面'], answer: 0, sentence: 2 }],
   ```
2. **Every `gsb:` passage** (45, in `src/content/storybooks.json`): two each. Verified example:
   ```ts
   'gsb:0271-1': [{ q: '两只脚用来做什么？', choices: ['踢踢球', '看看', '听听'], answer: 0, sentence: 1 }, { q: '还有什么用来抱抱？', choices: ['两只小手', '两只眼睛', '两只脚'], answer: 0, sentence: 4 }],
   ```

How each question is written and checked:
- **Read the passage first**, then ask about something only reading it tells (who did what, where, why, what happened next); the two questions of a passage ask about different sentences.
- **All three choices from the passage, or all three paraphrases** (rule 1); wrong choices are plausible for the story (another character, another place), never silly.
- **Choices of near-equal length** (rule 2), **no content character of the answer in the question** (rule 3), **not the passage's top word** (rule 4); vary the right one's stored place.
- `sentence` is the index in `splitSentences(text)` of the sentence that answers it (a miss reads it again).
- After each passage: `npx vitest run scripts/check-content.test.ts -t "every built-in passage"` and fix what it lists.
- **Content review:** when all pass, read every passage with its two questions once more as a 7-year-old would: is the answer certain from the text, is no wrong choice also arguably right, is the wording natural Singapore Mandarin (一点 not 一点儿; 巴士 for a bus; 组屋, 小贩中心 where they fit)? Fix any that fail.

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all pass.

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "feat(langdu): two guess-proof questions per passage, asked in turn, choices shuffled

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 「下一篇」, the picture, the 生词 strip and names on the Listen screen

**Files:**
- Modify: `src/langdu/pick.ts` (+ test) (`MAX_SWAPS`, `swapTarget`)
- Modify: `src/ui/pinyinFade.tsx` (`KeepPinyin`)
- Modify: `src/ui/stage/FeedbackSheet.tsx` (`aside`: a quieter second button beside the action)
- Modify: `src/activities/langdu/LangduStep.tsx` (+ test) (warm-up shell + `PassageParts`; `Picture` beside the title, `NewWords`, `KeepPinyin` around the sentences; 下一篇 in the sheet; `onSwap` prop)
- Modify: `src/app/SessionScreen.tsx` (+ `src/app/langduSession.test.tsx`), `src/app/LangduScreen.tsx` (swap wiring)
- Modify: `src/styles.css` (picture, 生词, 下一篇)

**Interfaces:**
- Consumes: `afterSkip`, `pickPassage` (Task 1), `withQuestion` (Task 5), `LangduPassage` with `names`, `words`, `image` (Task 4), `PassageWord` (Task 3).
- Produces: `FeedbackSheet` prop `aside?: ComponentChildren` (neutral sheet only, in place of its spacer); `MAX_SWAPS = 2`; `swapTarget<T extends Candidate>(r: ReadingHistory, pool: readonly T[], current: Candidate, today: string, swaps: number): T | null`; `KeepPinyin({ chars: ReadonlySet<string>; children })`; `LangduStep` prop `onSwap?: () => void` (the button shows on Listen while it is set); `LangduSpeaking` gains `pool: ReadingPassage[]; reading: ReadingHistory; swaps: number`. DOM: `.langdu__head` (picture and title), `img.langdu__pic`, `ul.langdu__words` (aria-label 生词), `.langdu__gloss`, `button.langdu__next` (in the sheet).

- [ ] **Step 1: Write the failing tests**

Append to `src/langdu/pick.test.ts` (import `swapTarget`):

```ts
describe('下一篇 (spec 2026-10-15 §5, D5)', () => {
  const pool = [c('p01', 0.93), c('p02', 0.94), c('p03', 0.95)];
  it('the next in the order, with the swapped one skipped', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 0)?.id).toBe('p02');
    expect(swapTarget(afterSkip(H0, 'p01', T), pool, pool[1]!, T, 1)?.id).toBe('p03');
  });
  it('two swaps a step, never a school text, and none when nothing else is there', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 2)).toBeNull();
    expect(swapTarget(H0, [c('pp:a', 0.5), ...pool], c('pp:a', 0.5), T, 0)).toBeNull();
    expect(swapTarget(H0, [c('p01', 0.93)], c('p01', 0.93), T, 0)).toBeNull();
  });
});
```

Append to `src/activities/langdu/LangduStep.test.tsx` (import `PinyinFade` from `../../ui/pinyinFade`):

```tsx
describe('the Listen screen of a library passage (spec 2026-10-15 §2, §5, §7)', () => {
  const gsb = { id: 'gsb:0089-1', title: '卡莱', text: '卡莱七岁。卡莱爱我。', names: ['卡莱'], image: 'passages/gsb-0089-1.webp', question };
  it('a double tap on 下一篇 swaps once', () => {
    const onSwap = vi.fn();
    render(<LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onSwap={onSwap} onDone={vi.fn()} />);
    fireEvent.click(button('下一篇'));
    fireEvent.click(button('下一篇'));
    expect(onSwap).toHaveBeenCalledOnce();
  });
  it('下一篇 is on Listen only: never once he is reading', async () => {
    render(<LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onSwap={vi.fn()} onDone={vi.fn()} />);
    expect(document.querySelector('.langdu__next')).toBeTruthy();
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    await waitFor(() => expect(document.querySelector('.mic-btn')).toBeTruthy()); // on Read
    expect(document.querySelector('.langdu__next')).toBeNull();
  });
  it('no 下一篇 when the screen gives none (a school text, two swaps made, nothing else to read)', () => {
    render(<LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(document.querySelector('.langdu__next')).toBeNull();
  });
  it('the picture shows on Listen and Read, never on the question', async () => {
    render(<LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(document.querySelector('img.langdu__pic')!.getAttribute('src')).toBe('/passages/gsb-0089-1.webp');
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(document.querySelector('img.langdu__pic')).toBeTruthy();
    await record();
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(button('下一步'));
    await screen.findByText('想一想');
    expect(document.querySelector('img.langdu__pic')).toBeNull();
  });
  it('a picture that fails to load hides itself', () => {
    render(<LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    fireEvent.error(document.querySelector('img.langdu__pic')!);
    expect(document.querySelector('img.langdu__pic')).toBeNull();
    expect(document.querySelectorAll('.langdu__sentence')).toHaveLength(2);
  });
  it('生词 under the title: each word with its pinyin and kid gloss', () => {
    render(<LangduStep passage={{ ...passage, words: [{ text: '风筝', gloss: 'kite' }] }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    const strip = screen.getByRole('list', { name: '生词' });
    expect(strip.textContent).toContain('kite');
    expect([...strip.querySelectorAll('.label__ch')].map((c) => c.textContent).join('')).toBe('风筝');
    expect(strip.querySelectorAll('.label__py').length).toBeGreaterThan(0);
  });
  it('names keep their pinyin while the characters he reads lose theirs', () => {
    render(
      <PinyinFade known={new Set(['卡', '七', '岁'])} on>
        <LangduStep passage={gsb} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />
      </PinyinFade>,
    );
    const cell = (ch: string) => [...document.querySelectorAll('.langdu__sentence .label__cell--zh')].find((c) => c.querySelector('.label__ch')!.textContent === ch)!;
    expect(cell('卡').classList.contains('label__cell--hidden')).toBe(false); // a name
    expect(cell('七').classList.contains('label__cell--hidden')).toBe(true);
  });
  it("the warm-up's take survives a swap: the next passage starts at Listen and the take is reported at the end", async () => {
    const onDone = vi.fn();
    const view = render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onSwap={vi.fn()} onDone={onDone} />);
    await record();
    await waitFor(() => expect(button('继续').disabled).toBe(false));
    fireEvent.click(button('继续'));
    view.rerender(<LangduStep passage={{ ...passage, id: 'p02', text: '我爱老师。', question: undefined }} oral={oral} kid={DEFAULT_KID} withWarmup onDone={onDone} />);
    expect(screen.getByText('听一听，看一看')).toBeTruthy();
    modelReads(1);
    fireEvent.click(button('开始朗读'));
    await record();
    fireEvent.click(await screen.findByText('完成'));
    expect(onDone.mock.calls[0]![0].intro).not.toBeNull();
  });
});
```

In `src/app/langduSession.test.tsx` import `EMPTY_READING` from `../types` and add before `'his answer to the meaning question is kept …'`:

```tsx

```

Run: `npx vitest run src/langdu/pick.test.ts src/activities/langdu/LangduStep.test.tsx src/app/langduSession.test.tsx`
Expected: FAIL — `swapTarget` not exported; no 下一篇, no picture, no 生词 list.

- [ ] **Step 2: `swapTarget`**

In `src/langdu/pick.ts` import `afterSkip` from `./history` and append:

```ts
/** 下一篇 swaps at most this many times a step (D5). */
export const MAX_SWAPS = 2;

/** 下一篇's next passage: the order again with this one skipped today; null when no swap is allowed (2 a step, never his school
 *  text) or nothing else is there (spec 2026-10-15 §5). */
export function swapTarget<T extends Candidate>(r: ReadingHistory, pool: readonly T[], current: Candidate, today: string, swaps: number): T | null {
  if (swaps >= MAX_SWAPS || current.source === 'parent') return null;
  return pickPassage(afterSkip(r, current.id, today), pool, today);
}
```

- [ ] **Step 3: `KeepPinyin`**

In `src/ui/pinyinFade.tsx` add `useContext` to the hooks import and append:

```tsx
/** Characters whose pinyin always shows inside it (a passage's transliterated names, spec 2026-10-15 §3); the fade decides the rest. */
export function KeepPinyin({ chars, children }: { chars: ReadonlySet<string>; children: ComponentChildren }) {
  const outer = useContext(PinyinFadeContext);
  const value = useMemo(() => (outer && chars.size ? { ...outer, show: (ch: string, syl?: string) => chars.has(ch) || outer.show(ch, syl) } : outer), [outer, chars]);
  return <PinyinFadeContext.Provider value={value}>{children}</PinyinFadeContext.Provider>;
}
```

- [ ] **Step 4: Split `LangduStep`; the Listen screen's new parts**

`src/ui/stage/FeedbackSheet.tsx`: add the prop

```ts
  /** a second, quieter choice beside the action while nothing is answered (朗读's 下一篇, spec 2026-10-15 §5) */
  aside?: ComponentChildren;
```

destructure `aside`, and render `aside ?? <span class="spacer" />` where the neutral sheet had `<span class="spacer" />`. 下一篇 lives there, beside 开始朗读, so the card keeps its room for the passage (measured in WebKit: in the card it squeezed the passage to nothing on an iPhone SE).

In `src/activities/langdu/LangduStep.tsx`: import `KeepPinyin` from `../../ui/pinyinFade` and the type `PassageWord` from `../../types`; `LangduResult.intro`'s comment becomes `// the warm-up, when it ran and was recorded`; add to `Props`:

```ts
  /** 下一篇 (spec 2026-10-15 §5): shown on Listen while set; the screen swaps in the next passage */
  onSwap?: () => void;
```

and replace everything from the `LangduStep` doc comment down to (not including) `/** The passage a sentence at a time …` with:

```tsx
/**
 * 朗读 (spec 2026-10-12 §3, 2026-10-15): the warm-up when due → listen and follow → read alone → compare, one re-read → one
 * meaning question. The warm-up lives here; the passage's parts live in PassageParts, keyed by the passage, so 下一篇 can swap the
 * passage under a kept warm-up take.
 */
export function LangduStep({ passage, oral, kid, withWarmup, extra = false, micBlocked = false, startAt, rng = Math.random, onSwap, onDone }: Props) {
  const [warming, setWarming] = useState(startAt ? startAt === 'warmup' : withWarmup);
  const intro = useRecorder(micBlocked);
  const lines = useMemo(() => introLines(oral), [oral]);
  useEffect(() => {
    if (warming) speak('你好！');
  }, []);

  if (warming) {
    // Truffle stays with him through every part (spec 2026-10-04 §3)
    const pet = <Pet kid={kid} mood="neutral" size={180} calm={intro.state === 'recording'} bubble={BUBBLE.warmup} />;
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="继续" disabled={(intro.state === 'ready' && !intro.failed) || intro.state === 'recording'} onAction={() => setWarming(false)} />}>
        <div class="langdu">
          <div class="langdu__script">
            <p class="langdu__line"><Label zh={lines.hello} fade /></p>
            {lines.body && <p class="langdu__line"><Label zh={lines.body} fade /></p>}
          </div>
          <MicButton rec={intro} withLevel={false} />
          {intro.state === 'done' && <p class="langdu__ok"><Label zh="很好！" /></p>}
        </div>
      </Stage>
    );
  }
  return (
    <PassageParts
      key={passage.id}
      passage={passage}
      kid={kid}
      extra={extra}
      // a microphone refused in the warm-up isn't asked for again to read
      micBlocked={micBlocked || intro.state === 'blocked'}
      startAt={startAt && startAt !== 'warmup' ? startAt : 'listen'}
      rng={rng}
      thanks={withWarmup ? lines.thanks : null}
      onSwap={onSwap}
      onDone={(r) => onDone({ ...r, intro: intro.result })}
    />
  );
}

interface PartsProps {
  passage: LangduPassage;
  kid: KidState;
  extra: boolean;
  micBlocked: boolean;
  startAt: Exclude<LangduPart, 'warmup'>;
  rng: Rng;
  /** 谢谢老师！ closes a warm-up day; null when there was no warm-up */
  thanks: string | null;
  onSwap?: () => void;
  onDone: (r: Omit<LangduResult, 'intro'>) => void;
}

/** One passage's listen, read, compare and question. */
function PassageParts({ passage, kid, extra, micBlocked, startAt, rng, thanks: thanksLine, onSwap, onDone }: PartsProps) {
  const [part, setPart] = useState<LangduPart>(startAt);
  const sentences = useMemo(() => splitSentences(passage.text), [passage.text]);
  const model = useModelReader(sentences);
  const read = useRecorder(micBlocked, readLimitMs(passage.text)); // long passages get longer (spec 2026-10-15 §8)
  const [takes, setTakes] = useState<FinishedRecording[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const takeAudio = useRef<HTMLAudioElement>(null);
  // the choices in a new order each time it is shown: the right one's place is never learnt (spec 2026-10-15 §6)
  const question = useMemo(() => (extra || !passage.question ? undefined : shuffleQuestion(passage.question, rng)), [passage.question, extra]);
  // names always show their pinyin (spec 2026-10-15 §3)
  const nameChars = useMemo(() => new Set((passage.names ?? []).flatMap((n) => Array.from(n))), [passage.names]);
  const readBlocked = read.state === 'blocked';
  const latest = takes[takes.length - 1] ?? null;
  const playbackUrl = useMemo(() => (latest ? URL.createObjectURL(latest.blob) : null), [latest]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);

  useEffect(() => {
    if (part === 'listen') model.read(0);
    else model.stop(); // he reads, compares or answers: the model is quiet until asked
  }, [part]);

  useEffect(() => {
    if (read.state === 'done' && read.result && part === 'read') {
      playSfx('star');
      setTakes((t) => [...t, read.result!]);
      setPart('compare');
    }
  }, [read.state]);

  const finished = useRef(false);
  const finish = (meaning: LangduResult['meaning']) => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    model.stop();
    onDone({ read: betterTake(takes), meaning });
  };
  const swapped = useRef(false);
  const swap = () => {
    if (swapped.current || !onSwap) return; // a double tap on 下一篇 swaps once
    swapped.current = true;
    model.stop();
    onSwap();
  };
  const afterReading = () => (question ? setPart('meaning') : finish(null));
  const reread = () => {
    takeAudio.current?.pause();
    read.reset();
    setPart('read');
  };
  const replay = (i: number, only: boolean) => {
    takeAudio.current?.pause();
    model.read(i, only);
  };

  const answerAt = question ? answeringSentence(question, sentences) : -1;
  const pick = (i: number) => {
    if (!question || picked !== null) return;
    setPicked(i);
    const right = i === question.answer;
    playSfx(right ? 'correct' : 'wrong');
    if (!right && answerAt >= 0) speak(sentences[answerAt]!); // the sentence that answers it, read again
  };

  // 谢谢老师！ closes a warm-up day, on the step's last screen; said once, though a re-read brings Compare back (final review M1)
  const closing = !!thanksLine && ((part === 'meaning' && picked !== null) || (part === 'compare' && !question));
  const thanked = useRef(false);
  useEffect(() => {
    if (!closing || thanked.current || !thanksLine) return;
    thanked.current = true;
    speak(thanksLine, { queue: true });
  }, [closing]);
  const thanks = closing && thanksLine ? <p class="langdu__line langdu__thanks"><Label zh={thanksLine} /></p> : null;

  // Truffle stays with him through every part (spec 2026-10-04 §3)
  const pet = <Pet kid={kid} mood="neutral" size={180} calm={read.state === 'recording'} bubble={BUBBLE[part]} />;

  if (part === 'listen') {
    return (
      <Stage
        activity="langdu"
        truffle={pet}
        sheet={
          <FeedbackSheet
            actionLabel="开始朗读"
            disabled={!model.heardAll}
            onAction={() => setPart('read')}
            aside={onSwap && <button type="button" class="btn btn--secondary langdu__next" onClick={swap}><Label zh="下一篇" /></button>}
          />
        }
      >
        <div class="langdu langdu__listen" data-heard={String(model.heardAll)}>
          <p class="langdu__step"><Label zh="听一听，看一看" /></p>
          <div class="langdu__head">
            {passage.image && <Picture src={passage.image} />}
            <h2 class="langdu__title"><Label zh={passage.title} /></h2>
          </div>
          {passage.words?.length ? <NewWords words={passage.words} /> : null}
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, model.heardAll)} />
          </KeepPinyin>
        </div>
      </Stage>
    );
  }

  if (part === 'read') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="读完了" disabled={!readBlocked && !(read.state === 'ready' && read.failed)} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="自己读，大声读" /></p>
          {passage.image && <Picture src={passage.image} />}
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={null} />
          </KeepPinyin>
          {readBlocked ? <BlockedNote /> : <MicButton rec={read} withLevel />}
        </div>
      </Stage>
    );
  }

  if (part === 'compare') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel={question ? '下一步' : '完成'} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="听一听，比一比" /></p>
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, true)} />
          </KeepPinyin>
          <div class="langdu__compare">
            <PlayBack url={playbackUrl} audio={takeAudio} onPlay={() => model.stop()} />
            <button type="button" class="btn btn--secondary langdu__big" onClick={() => replay(0, false)}>
              <Volume2 size={30} strokeWidth={2.5} /> <Label zh="听老师的" />
            </button>
          </div>
          {takes.length < 2 && <button type="button" class="btn langdu__again" onClick={reread}><Label zh="再读一遍" /></button>}
          {thanks}
        </div>
      </Stage>
    );
  }

  // the question: no picture, so the picture can't answer it (spec 2026-10-15 §7)
  if (!question) return null; // the meaning part only opens with a question
  const right = picked === question.answer;
  const mark = (i: number) => (picked === null ? '' : i === question.answer ? (i === picked ? ' is-right' : ' is-answer') : i === picked ? ' is-wrong' : ' is-dim');
  const sheet =
    picked === null ? (
      <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />
    ) : (
      <FeedbackSheet
        tone={right ? 'good' : 'oops'}
        title={right ? '对了！' : `答案是：${question.choices[question.answer]}`}
        detail={!right && answerAt >= 0 ? <Label zh={sentences[answerAt]!} /> : undefined}
        actionLabel="完成"
        auto={false}
        onAction={() => finish({ correct: right, picked: question.choices[picked]! })}
      />
    );
  return (
    <Stage activity="langdu" truffle={pet} sheet={sheet}>
      <div class="langdu">
        <p class="langdu__step"><Label zh="想一想" /></p>
        <p class="langdu__q"><Label zh={question.q} fade /></p>
        <div class="choices langdu__choices">
          {question.choices.map((c, i) => (
            <button key={i} type="button" class={`choice${mark(i)}`} disabled={picked !== null} onClick={() => pick(i)}>
              <Label zh={c} fade peek={false} />
            </button>
          ))}
        </div>
        {thanks}
      </div>
    </Stage>
  );
}

/** The passage's picture (Global Storybooks): a picture that fails to load hides itself, never a broken box. */
function Picture({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img class="langdu__pic" src={`${import.meta.env.BASE_URL}${src}`} alt="" onError={() => setFailed(true)} />;
}

/** 生词 under the title (spec 2026-10-15 §2.2): each word with its pinyin and kid gloss. */
function NewWords({ words }: { words: readonly PassageWord[] }) {
  return (
    <ul class="langdu__words" aria-label="生词">
      {words.map((w) => (
        <li key={w.text}>
          <Label zh={w.text} /> <span class="langdu__gloss">{w.gloss}</span>
        </li>
      ))}
    </ul>
  );
}
```

(`Sentences` and `PlayBack` below it are unchanged. The warm-up moved to the shell, so `PassageParts` never sees it; its read recorder starts blocked when the warm-up found the microphone refused — the old `readBlocked` rule. Task 7 adds the credit line under the sentences.)

Add to `src/styles.css`, after the `.langdu__choices` rule:

```css
/* the library (spec 2026-10-15): a Global Storybooks picture beside the title on Listen and Read, the 生词 strip, the credit line,
   and 下一篇 in the sheet beside 开始朗读 — the passage keeps the card's room */
.langdu__head { display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 0; max-width: 100%; }
.langdu__pic { flex: none; height: clamp(64px, 14dvh, 160px); width: auto; aspect-ratio: 1; object-fit: cover; border-radius: 14px; border: var(--panel-border); }
.langdu:not(.langdu__listen) .langdu__pic { height: clamp(56px, 11dvh, 140px); } /* on Read the passage comes first */
.langdu__words { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 16px; font-size: 18px; }
.langdu__words li { display: inline-flex; align-items: flex-end; gap: 6px; }
.langdu__gloss { color: var(--ink-soft); font-size: 15px; }
.langdu__next { flex: none; min-height: 52px; padding: 6px 18px; font-size: 20px; }
.langdu__head .langdu__title { min-width: 0; width: auto; flex: 0 1 auto; font-size: clamp(20px, 3.2dvh, 32px); } /* beside its picture: smaller, so a long title fits a phone */
.langdu__head .label__cells { flex-wrap: wrap; } /* a long title wraps beside its picture */
.stage__sheet .sheet .langdu__next { width: auto; flex: none; }
.stage__sheet .sheet:has(.langdu__next) .btn--big { width: auto; flex: 1; min-width: 0; } /* 下一篇 and 开始朗读 share the row */
@media (max-width: 599px) {
  .langdu__next { min-height: 44px; padding: 4px 12px; font-size: 18px; }
  .langdu__words { font-size: 16px; }
}
```

- [ ] **Step 5: The screens swap**

`src/app/SessionScreen.tsx`: import `afterSkip` (history), `swapTarget` (pick), `updateKid` (repo), `type ReadingHistory` (types). `LangduSpeaking` becomes:

```ts
/** Today's 朗读: the passage, whether the warm-up runs (warmupDue), the lesson's date key, and for 下一篇 the pool, his reading
 *  history as the step knows it and the swaps made. */
interface LangduSpeaking { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; warmup: boolean; day: string; pool: ReadingPassage[]; reading: ReadingHistory; swaps: number }
```

The load keeps the pool:

```ts
          const pool = settings.langdu ? readingPool(parentPassages, PASSAGES, readerAt(know.knownChars, today, settings)) : [];
          const passage = pickPassage(k.reading, pool, day);
          const kind = nextSpeaking(k.speakingLast, !!passage, settings.story);
          if (kind === 'langdu' && passage) return { kind: 'langdu' as const, passage: withQuestion(passage, k.reading), oral: settings.oral, warmup: warmupDue(k.reading, day), day, pool, reading: k.reading, swaps: 0 };
```

Above `onLangduDone` add:

```ts
  /** 下一篇 (spec 2026-10-15 §5): the passage is skipped today (saved at once) and the next in the order comes in. */
  const onLangduSwap = () => {
    const s = state?.speaking;
    if (s?.kind !== 'langdu') return;
    const next = swapTarget(s.reading, s.pool, s.passage, s.day, s.swaps);
    if (!next) return;
    const reading = afterSkip(s.reading, s.passage.id, s.day);
    setState({ ...state!, speaking: { ...s, passage: withQuestion(next, reading), reading, swaps: s.swaps + 1 } });
    void updateKid(db, (k) => ({ ...k, reading: afterSkip(k.reading, s.passage.id, s.day) })).catch(logError);
  };
```

and pass `onSwap={swapTarget(state.speaking.reading, state.speaking.pool, state.speaking.passage, state.speaking.day, state.speaking.swaps) ? onLangduSwap : undefined}` to `LangduStep`.

`src/app/LangduScreen.tsx`: import `afterSkip` (history), `swapTarget` (pick), `type ReadingHistory` (types); `Loaded` gains `pool: ReadingPassage[]; reading: ReadingHistory; swaps: number; day: string`; the load:

```ts
      const day = localDateKey(now());
      const pool = readingPool(parent, PASSAGES, readerAt(know.knownChars, now(), settings));
      const passage = pickPassage(k.reading, pool, day);
      setState({ passage, pool, reading: k.reading, swaps: 0, day, oral: settings.oral, kid: k, knownChars: know.knownChars, knownReadings: know.knownReadings, fadePinyin: settings.fadePinyin !== false });
```

after `const passage = state.passage;`:

```ts
  // 下一篇, as in the lesson (spec 2026-10-15 §5)
  const next = swapTarget(state.reading, state.pool, passage, state.day, state.swaps);
  const swap = () => {
    if (!next) return;
    const reading = afterSkip(state.reading, passage.id, state.day);
    setState({ ...state, passage: next, reading, swaps: state.swaps + 1 });
    void updateKid(db, (k) => ({ ...k, reading: afterSkip(k.reading, passage.id, state.day) })).catch(logError);
  };
```

and `<LangduStep … extra onSwap={next ? swap : undefined} … />`.

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all pass.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "feat(langdu): 下一篇 (two swaps, before reading, never a school text); picture, 生词 and names on Listen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Credits — the line under the passage, the parent's Credits, and the Library

**Files:**
- Create: `src/langdu/credit.ts`, `src/langdu/credit.test.ts`, `src/langdu/library.ts`, `src/langdu/library.test.ts`, `src/parent/LibraryList.tsx`
- Modify: `src/activities/langdu/LangduStep.tsx` (+ test) (`Credit` on Listen)
- Modify: `src/parent/Credits.tsx` (+ `src/parent/credits.test.tsx`), `CREDITS.md`
- Modify: `src/parent/PassagesPanel.tsx` (+ `src/parent/langdu.test.tsx`) (copy; `<LibraryList />`)
- Modify: `src/styles.css` (credit line, Library scroll)

**Interfaces:**
- Consumes: `PassageCredit` (Task 3), `PASSAGES` (Task 4), `entryOf`, `isRetired` (Task 1), `passageFit`, `termIndex`, `readerAt` (Tasks 2–4).
- Produces: `LICENCE_URL: Readonly<Record<PassageCredit['licence'], string>>`; `creditLine(c: PassageCredit): string`; `OFTEN_SKIPPED = 3`; `interface LibraryRow { id: string; title: string; source: 'ZiJi' | 'Global Storybooks'; term: string; fit: number; reads: number; next: string; oftenSkipped: boolean }`; `libraryRows(passages: readonly Passage[], r: ReadingHistory, readable: ReadonlySet<string>): LibraryRow[]`; `LibraryList()` (parent component). DOM: `details.langdu__credit`, `.credits__stories li`, `.library__table`.

- [ ] **Step 1: Write the failing tests**

Create `src/langdu/credit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { creditLine, LICENCE_URL } from './credit';

const credit = { title: '一个很高的人', text: 'Cornelius Gulere', illustration: 'Catherine Groenewald', translation: 'dohliam', licence: 'CC BY 3.0' as const, adapted: false, source: 'https://github.com/x' };

describe('creditLine (spec 2026-10-15 §2.1)', () => {
  it('names the story, its people and its licence; a changed story says 有改动', () => {
    expect(creditLine(credit)).toBe('故事：Global Storybooks · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam · CC BY 3.0');
    expect(creditLine({ ...credit, licence: 'CC BY-NC 3.0', adapted: true })).toBe('故事：Global Storybooks · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam · CC BY-NC 3.0 · 有改动');
  });
  it('every imported passage carries a credit with a licence link', () => {
    const gsb = PASSAGES.filter((p) => p.source === 'gsb');
    expect(gsb.length).toBeGreaterThan(0);
    expect(gsb.filter((p) => !p.credit || !LICENCE_URL[p.credit.licence] || !p.credit.source.startsWith('https://github.com/global-asp/sbc-source/blob/be28dab/'))).toEqual([]);
  });
});
```

Create `src/langdu/library.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type Passage } from '../types';
import { RETIRED_REST } from './history';
import { libraryRows } from './library';

const p = (id: string, term: string, source: Passage['source'] = 'ziji'): Passage => ({ id, title: id, text: '我爱妈妈。', term, source });

describe('libraryRows (spec 2026-10-15 §9)', () => {
  it('by term then id, with source, fit, reads, when it is due, retired, and often skipped', () => {
    const r = { ...EMPTY_READING, history: {
      p02: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2 },
      'gsb:0001-1': { reads: 5, lastRead: '2026-09-01', rest: RETIRED_REST, q: 5 },
      p01: { reads: 0, lastRead: null, rest: 0, q: 0, lastSkipped: '2026-10-12', skips: 3 },
    } };
    expect(libraryRows([p('p02', '二下'), p('gsb:0001-1', '二上', 'gsb'), p('p01', '二下')], r, new Set(['我', '爱']))).toEqual([
      { id: 'gsb:0001-1', title: 'gsb:0001-1', source: 'Global Storybooks', term: '二上', fit: 0.5, reads: 5, next: 'retired', oftenSkipped: false },
      { id: 'p01', title: 'p01', source: 'ZiJi', term: '二下', fit: 0.5, reads: 0, next: 'not read yet', oftenSkipped: true },
      { id: 'p02', title: 'p02', source: 'ZiJi', term: '二下', fit: 0.5, reads: 2, next: '2026-10-17', oftenSkipped: false },
    ]);
  });
});
```

Append inside `describe('the Listen screen of a library passage …')` in `src/activities/langdu/LangduStep.test.tsx`:

```tsx
  it('the credit line under the passage on Listen only; tapping it shows the licence and the source (spec 2026-10-15 §2.1)', async () => {
    const credit = { title: '和植物聊天的卡莱', text: 'Ursula Nafula', illustration: 'Jesse Breytenbach', translation: 'Vicky Liu', licence: 'CC BY 3.0' as const, adapted: true, source: 'https://github.com/global-asp/sbc-source/blob/be28dab/zh/0089.md' };
    render(<LangduStep passage={{ ...gsb, credit }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(document.querySelector('.langdu__credit summary')!.textContent).toBe('故事：Global Storybooks · 文 Ursula Nafula · 图 Jesse Breytenbach · 译 Vicky Liu · CC BY 3.0 · 有改动');
    const details = document.querySelector<HTMLDetailsElement>('.langdu__credit')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    await waitFor(() => expect([...document.querySelectorAll('.langdu__credit a')].map((a) => a.getAttribute('href'))).toEqual(['https://creativecommons.org/licenses/by/3.0/', credit.source]));
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    await waitFor(() => expect(document.querySelector('.mic-btn')).toBeTruthy());
    expect(document.querySelector('.langdu__credit')).toBeNull();
  });
```

Append inside `describe('Credits', …)` in `src/parent/credits.test.tsx` (import `PASSAGES` from `../content`):

```tsx
  it('credits each Global Storybooks story it reads from: title, people, licence, adapted (CC BY requires attribution)', () => {
    render(<Credits />);
    expect(screen.getByText('Passages marked ZiJi were written for this app.')).toBeTruthy();
    const stories = [...document.querySelectorAll('.credits__stories li')].map((li) => li.textContent);
    expect(stories.length).toBe(new Set(PASSAGES.filter((p) => p.source === 'gsb').map((p) => p.story!.id)).size);
    expect(stories).toContain('一个很高的人 — text Cornelius Gulere, illustration Catherine Groenewald, translation dohliam — CC BY 3.0');
    expect(stories.find((s) => s!.startsWith('山羊、野狗、和水牛'))).toMatch(/adapted$/);
  });
```

In `src/parent/langdu.test.tsx` import `PASSAGES` (`../content`), `saveKid` (`../store/repo`), `DEFAULT_KID, EMPTY_READING` (`../types`), and add before `describe('Settings oral exam', …)`:

```tsx
describe('the Library (spec 2026-10-15 §9)', () => {
  it('lists every built-in passage, read-only, with source, term, fit, reads, next and often skipped', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 15, 17) });
    await saveKid(app.db, { ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { p01: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2, lastSkipped: '2026-10-12', skips: 3 } } } });
    renderWithApp(<PassagesPanel />, app);
    await screen.findByText('Library');
    const rows = [...document.querySelectorAll('.library__table tbody tr')];
    expect(rows).toHaveLength(PASSAGES.length);
    const p01 = rows.find((r) => r.textContent!.startsWith('我的家'))!;
    expect([...p01.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['我的家 · often skipped', 'ZiJi', '一下', '100%', '2', '2026-10-17']);
    expect(rows.some((r) => r.textContent!.includes('Global Storybooks'))).toBe(true);
    expect(document.querySelector('.library__table button')).toBeNull(); // read-only
  });
});
```

Run: `npx vitest run src/langdu/credit.test.ts src/langdu/library.test.ts src/activities/langdu/LangduStep.test.tsx src/parent/credits.test.tsx src/parent/langdu.test.tsx`
Expected: FAIL — `./credit` and `./library` don't resolve; no credit line; no Global Storybooks in Credits; no Library.

- [ ] **Step 2: `credit.ts` and `library.ts`**

Create `src/langdu/credit.ts`:

```ts
// Global Storybooks' credit (spec 2026-10-15 §2.1): the one line under a passage on Listen, and the licence links behind it.
import type { PassageCredit } from '../types';

export const LICENCE_URL: Readonly<Record<PassageCredit['licence'], string>> = {
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
};

/** 「故事：Global Storybooks · 文 … · 图 … · 译 … · CC BY 3.0 · 有改动」 */
export function creditLine(c: PassageCredit): string {
  return ['故事：Global Storybooks', `文 ${c.text}`, `图 ${c.illustration}`, `译 ${c.translation}`, c.licence, ...(c.adapted ? ['有改动'] : [])].join(' · ');
}
```

Create `src/langdu/library.ts`:

```ts
// The parent's Library (spec 2026-10-15 §9): every built-in passage with its source, term, his fit now, reads, when it is due
// and whether he often skips it.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { Passage, ReadingHistory } from '../types';
import { entryOf, isRetired } from './history';
import { passageFit, termIndex } from './level';

/** Swapped out this often (下一篇): shown as "often skipped", so the parent can see whether it is too hard. */
export const OFTEN_SKIPPED = 3;

export interface LibraryRow { id: string; title: string; source: 'ZiJi' | 'Global Storybooks'; term: string; fit: number; reads: number; next: string; oftenSkipped: boolean }

export function libraryRows(passages: readonly Passage[], r: ReadingHistory, readable: ReadonlySet<string>): LibraryRow[] {
  return [...passages]
    .sort((a, b) => termIndex(a.term) - termIndex(b.term) || a.id.localeCompare(b.id))
    .map((p) => {
      const e = entryOf(r, p.id);
      const next = !e.reads || !e.lastRead ? 'not read yet' : isRetired(e) ? 'retired' : localDateKey(addDays(parseDateKey(e.lastRead), e.rest));
      return { id: p.id, title: p.title, source: p.source === 'gsb' ? 'Global Storybooks' : 'ZiJi', term: p.term, fit: passageFit(p.text, readable, p.names), reads: e.reads, next, oftenSkipped: (e.skips ?? 0) >= OFTEN_SKIPPED };
    });
}
```

- [ ] **Step 3: The credit line on Listen**

In `src/activities/langdu/LangduStep.tsx` import `creditLine, LICENCE_URL` from `../../langdu/credit` and the type `PassageCredit`; on Listen, after the sentences' `</KeepPinyin>`, render `{passage.credit && <Credit credit={passage.credit} />}`; above `NewWords` add:

```tsx
/** The story's credit, on Listen only (spec 2026-10-15 §2.1): one small line; tapping it opens the details for a parent. */
function Credit({ credit }: { credit: PassageCredit }) {
  const [open, setOpen] = useState(false); // the details are only laid out once opened (WebKit lays out a closed one's body)
  return (
    <details class="langdu__credit" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{creditLine(credit)}</summary>
      {open && <p>
        “{credit.title}”, Global Storybooks (African Storybook), {credit.licence}{credit.adapted ? ', adapted for ZiJi' : ''}.{' '}
        <a href={LICENCE_URL[credit.licence]} target="_blank" rel="noopener noreferrer">Licence</a> · <a href={credit.source} target="_blank" rel="noopener noreferrer">Source</a>
      </p>}
    </details>
  );
}
```

- [ ] **Step 4: Credits and the Library in the parent area**

Replace `src/parent/Credits.tsx` with:

```tsx
import { PASSAGES } from '../content';
import { LICENCE_URL } from '../langdu/credit';
import type { PassageCredit } from '../types';

/** Each Global Storybooks story the app reads from, once (spec 2026-10-15 §2.1), in story order. */
const STORIES: PassageCredit[] = [...new Map(PASSAGES.filter((p) => p.credit).map((p) => [p.story!.id, p.credit!])).values()];

export function Credits() {
  return (
    <section class="panel">
      <h2>Credits</h2>
      <ul>
        <li>HSK 3.0 character and word lists — elkmovie/hsk30, MIT License, © 2021 Pleco Inc.</li>
        <li>Make Me a Hanzi dictionary (meanings, radicals, components) — GNU LGPL v3 or later.</li>
        <li>English for his school characters and words: short glosses written for this app from CC-CEDICT (MDBG and contributors) — CC BY-SA 4.0, shared under the same licence. Other words show CC-CEDICT's own English, shortened.</li>
        <li>Hanzi Writer — MIT License. Stroke data (hanzi-writer-data) — Arphic Public License.</li>
        <li>pinyin-pro, ts-fsrs, Preact — MIT License. idb, canvas-confetti — ISC License.</li>
        <li>Lucide icons — ISC License (portions MIT, from Feather).</li>
        <li>Fonts: LXGW WenKai 霞鹜文楷 and Nunito — SIL Open Font License 1.1.</li>
        <li>Passages marked ZiJi were written for this app.</li>
        <li>
          Read-aloud stories and their pictures from <a href="https://global-asp.github.io/storybooks-chinese/" target="_blank" rel="noopener noreferrer">Global Storybooks</a> (African Storybook), each under its own licence; "adapted" ones have small wording changes:
          <ul class="credits__stories">
            {STORIES.map((c) => (
              <li key={c.source}>
                {c.title} — text {c.text}, illustration {c.illustration}, translation {c.translation} — <a href={LICENCE_URL[c.licence]} target="_blank" rel="noopener noreferrer">{c.licence}</a>
                {c.adapted ? ', adapted' : ''}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </section>
  );
}
```

In `CREDITS.md` replace `- Read-aloud passages were written for this project.` with:

```markdown
- Read-aloud passages marked ZiJi were written for this project.
- **Global Storybooks Chinese** — [global-asp/sbc-source](https://github.com/global-asp/sbc-source) (commit `be28dab`) and its pictures
  ([global-asp/gsn-imagebank](https://github.com/global-asp/gsn-imagebank), commit `0df4097`), from the African Storybook. Each story keeps its own
  licence — [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) or, for 11 stories, [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/) —
  and its author, illustrator and translator credits, shown under each passage and in the parent area's Credits. Stories changed for Singapore usage are
  marked "adapted"; the changes are listed in `scripts/storybooks/manifest.json`, the sources in `scripts/storybooks/SOURCE.md`.
```

Create `src/parent/LibraryList.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { PASSAGES } from '../content';
import { readerAt } from '../langdu/level';
import { libraryRows, type LibraryRow } from '../langdu/library';
import { getKid } from '../store/repo';
import { DEFAULT_KID } from '../types';

/** The built-in passages (spec 2026-10-15 §9), read-only: where each is from, its term, how much of it he reads now, his reads,
 *  when it comes back, and the ones he often swaps away. */
export function LibraryList() {
  const { db, now, settings } = useApp();
  const [rows, setRows] = useState<LibraryRow[] | null>(null);
  useEffect(() => {
    void Promise.all([loadKnowledge(db), getKid(db)]).then(([know, kid]) => setRows(libraryRows(PASSAGES, (kid ?? DEFAULT_KID).reading, readerAt(know.knownChars, now(), settings).readable)));
  }, []);
  if (!rows) return null;
  return (
    <section class="library">
      <h3>Library</h3>
      <p>Built-in passages, by school term. "Reads now" is how much of each he can read today; 90–97% is his band. Passages come back on their own schedule.</p>
      <div class="scroll-panel library__scroll">
        <table class="table library__table">
          <thead>
            <tr><th>Title</th><th>From</th><th>Term</th><th>Reads now</th><th>Read</th><th>Next</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td class="hanzi">{r.title}{r.oftenSkipped && <small> · often skipped</small>}</td>
                <td>{r.source}</td>
                <td>{r.term}</td>
                <td>{Math.round(r.fit * 100)}%</td>
                <td>{r.reads}</td>
                <td>{r.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

`src/parent/PassagesPanel.tsx`: import `LibraryList`; the doc comment becomes `/** School texts for 朗读: each comes before the built-in passages until he has read it, then returns on the rest schedule; each may carry one meaning question (spec 2026-10-12 §3). Below them, the built-in Library (spec 2026-10-15 §9). */`; the intro paragraph becomes `Texts here come first in the daily 朗读 step, in the order added. Once read, each comes back after a rest (3 days, longer each time he reads it well), like the built-in passages.`; render `<LibraryList />` after the Save/Cancel row, inside the section.

Add to `src/styles.css`: the `.langdu__credit` rules after the `.langdu__gloss` rule, and the Library's before the stage rules that follow the 朗读 block:

```css
.langdu__credit { max-width: 100%; font-size: 16px; color: var(--ink-soft); text-align: center; } /* the sweep's floor for Chinese text: 16px; quiet by colour and one line */
.langdu__credit summary { cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* one line until tapped */
.langdu__credit[open] summary { white-space: normal; }
.langdu__credit p { margin: 4px 0 0; }
.langdu__credit a { color: inherit; }
/* the parent's Library (spec 2026-10-15 §9): its own scroll, so a hundred rows never push the page */
.library__scroll { flex: none; max-height: 60dvh; overflow: auto; }
.library__table { font-size: 14px; }
```

- [ ] **Step 5: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all pass.

- [ ] **Step 6: Commit**

```bash
git add -A src CREDITS.md
git commit -m "feat(langdu): Global Storybooks credits under the passage and in Credits; the parent's Library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Our passages — the writing check, and 二上 (p21–p34)

**Files:**
- Modify: `scripts/check-content.ts` (+ test) (`wordProblems`, `OWN_TERMS`, `NEW_FROM`, `checkOwnPassages`)
- Create: `scripts/review-passages.ts`
- Modify: `src/content/passages.json` (p12's 一家人 → 全家; p21–p34), `src/content/passageQuestions.ts` (two each for p21–p34), `src/content/sentencePinyin.json` (`npm run pinyin`)

**Interfaces:**
- Consumes: `tiles`, `BLOCKED`, `BLOCK_REASON`, `isChildWord`, `HSK_WORDS`, `MOE_TERMS`, `schoolTerm`, `allowedChars` (`src/content/understand.ts`), `glossProblems`, `kidGloss`, `passageTerm` (Task 3), `splitSentences`; the question check (Task 5).
- Produces: `wordProblems(text: string, taught?: readonly string[]): string[]`; `OWN_TERMS = ['二上', '二下', '三上']`; `NEW_FROM = 21`; `checkOwnPassages(passages: Passage[]): string[]`; `scripts/review-passages.ts <out.csv>`. Tasks 9 and 10 reuse all of it unchanged.

- [ ] **Step 1: Write the failing check tests**

Append to `scripts/check-content.test.ts` (import `checkOwnPassages` and `wordProblems` from `./check-content`):

```ts
describe('our passages (spec 2026-10-15 §2.2)', () => {
  it('every one passes: its term, the word gate, no duplicates; the new ones every writing rule', () => {
    expect(checkOwnPassages(PASSAGES)).toEqual([]);
  });
  // drafted for this plan and measured: each passes as written
  const p21: Passage = { id: 'p21', title: '新学年', text: '新学年开始了，我读二年级了。我们的班很大，有三十个同学。新老师又亲切又美丽。第一天，她帮我们找座位，还教我们读新的课文。下课了，我和新朋友一起去操场玩。', term: '二上', source: 'ziji', words: [{ text: '年级', gloss: 'grade, year (school)' }, { text: '座位', gloss: 'seat' }, { text: '操场', gloss: 'playground, field' }] };
  const p33: Passage = { id: 'p33', title: '放风筝', text: '星期天，天气很好，我跟爸爸去公园放风筝。我的风筝是一只老鹰，又大又漂亮。风一吹，老鹰就飞上了天。旁边的小朋友都跑过来看，一群人围着我们。大家说：“你的风筝真好看！”我高兴得笑了。', term: '二下', source: 'ziji', words: [{ text: '风筝', gloss: 'kite' }, { text: '老鹰', gloss: 'eagle' }] };
  const p49: Passage = { id: 'p49', title: '迟到了', text: '今天早上，闹钟没有响，我起床晚了。我赶快穿好衣服，背上书包，跑去车站。可是巴士刚刚开走了。我只好走路去学校。我对老师说：“对不起，我迟到了。”老师说：“没关系，明天要准时。”从那天起，我每天晚上都准备好书包，再也没有迟到过。', term: '三上', source: 'ziji', words: [{ text: '迟到', gloss: 'be late' }, { text: '准时', gloss: 'on time' }, { text: '赶快', gloss: 'quickly' }] };
  it('three drafts, one a term, pass every rule', () => {
    expect(checkOwnPassages([p21, p33, p49])).toEqual([]);
  });
  it('length, sentences and term', () => {
    expect(checkOwnPassages([{ ...p21, text: '新学年开始了。我读二年级了。' }])).toContain('p21: 12 characters, expected 50–110');
    expect(checkOwnPassages([{ ...p21, text: p21.text.replace(/。/g, '，').replace(/，$/, '。') }])).toContain('p21: 1 sentences, expected 3–7');
    expect(checkOwnPassages([{ ...p21, term: '二下' }])).toContain('p21: stored term 二下, levels at 二上');
  });
  it('coverage: at most 3 characters beyond the term, each from the next term', () => {
    expect(checkOwnPassages([{ ...p21, text: p21.text.replace('操场', '鬱場') }])).toContain('p21: 鬱場 not taught by 二下');
  });
  it('at least 6 characters first taught in its term', () => {
    expect(checkOwnPassages([{ ...p33, text: p33.text.replace('一群人围着我们', '大家看着我们').replace('我跟爸爸', '我和爸爸') }])).toContain('p33: 4 characters first taught in 二下 (筝鹰漂吹), expected 6');
  });
  it('the word gate: no blocked word, no adult word unless it is a 生词', () => {
    expect(wordProblems('他们去参加婚礼。')).toContain('婚礼: blocked (romantic/dating/marriage)');
    expect(wordProblems('我们一家人。')).toEqual(['一家人: not a word for a P2 child (HSK 7)']);
    expect(wordProblems('我们一家人。', ['一家人'])).toEqual([]);
    expect(wordProblems('新学年开始了，我们十个人一天读一本书。')).toEqual([]); // not dictionary words: 十个人, 一天
  });
  it('生词: 1–4, in the passage, from the term, with a kid gloss that matches the app’s', () => {
    expect(checkOwnPassages([{ ...p21, words: [] }])).toContain('p21: 0 生词, expected 1–4');
    expect(checkOwnPassages([{ ...p21, words: [{ text: '星星', gloss: 'star' }] }])).toEqual(expect.arrayContaining(['p21: 生词 星星 is not in the passage', 'p21: 生词 星星 has no character first taught in 二上']));
    expect(checkOwnPassages([{ ...p21, words: [{ text: '座位', gloss: 'a place where you sit down' }] }])).toEqual(expect.arrayContaining(['p21: 生词 座位 gloss "a place where you sit down": 6 words (at most 4)', 'p21: 生词 座位 gloss "a place where you sit down" differs from its kid gloss "seat"']));
  });
  it('no duplicate text, no two sentences opening alike', () => {
    expect(checkOwnPassages([p21, { ...p21, id: 'p22' }])).toContain('p22: the same text as p21');
    expect(checkOwnPassages([p49, { ...p33, id: 'p34', text: '今天早上，闹钟没有响，' + p33.text }])).toContain('p34: "今天早上，闹钟没有响，星期天，天气很好，我跟爸爸去公园放风筝。" opens like a sentence of p49');
  });
});
```

Run: `npx vitest run scripts/check-content.test.ts -t "our passages"`
Expected: FAIL — `checkOwnPassages is not a function`.

- [ ] **Step 2: Write the check**

In `scripts/check-content.ts` extend the imports to:

```ts
import { HSK_WORDS, MOE_TERMS, schoolTerm } from '../src/content';
import { BLOCK_REASON, BLOCKED } from '../src/content/blocked';
import { glossProblems, kidGloss } from '../src/content/kidGloss';
import { allowedChars } from '../src/content/understand';
import { isChildWord } from '../src/content/wordGate';
import { tiles } from '../src/content/zuju';
import { passageTerm } from '../src/langdu/level';
```

and append:

```ts
/** The words of a passage a P2 child may meet (spec 2026-10-15 §2.2, word gate): word by word as the content gate reads it, a
 *  blocked word never; a dictionary word of two characters or more only if the gate allows it or the passage teaches it (生词). */
export function wordProblems(text: string, taught: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    for (const t of tiles(s)) {
      const bare = t.replace(PUNCT_RE, '');
      const core = bare.replace(PARTICLES_RE, '');
      if (BLOCKED.has(bare) || BLOCKED.has(core)) out.push(`${core}: blocked (${BLOCK_REASON.get(core) ?? BLOCK_REASON.get(bare)})`);
      else if (Array.from(core).length > 1 && HSK_WORDS.has(core) && !isChildWord(core) && !taught.includes(core)) out.push(`${core}: not a word for a P2 child (HSK ${HSK_WORDS.get(core)})`);
    }
  }
  return out;
}

/** Our new passages' terms and their numbers (spec 2026-10-15 §2.2, D4). */
export const OWN_TERMS = ['二上', '二下', '三上'];
export const NEW_FROM = 21; // p21 on: the 40 written for the library; p01–p20 keep checkContent's older rules
const OPENING = 8; // two sentences starting with the same 8 characters are near-duplicates

/**
 * Our passages (spec 2026-10-15 §2.2): each levels at its stored term; the word gate; no duplicate text or sentence opening.
 * The new ones (p21 on) also: 50–110 characters in 3–7 sentences, at 二上/二下/三上, ≥ 6 different characters first taught in
 * their term, ≥ 95% of characters taught by the term with ≤ 3 others, each from the next term, and 1–4 生词 from the term, each
 * with a kid gloss.
 */
export function checkOwnPassages(passages: Passage[]): string[] {
  const problems: string[] = [];
  const own = passages.filter((p) => p.source === 'ziji');
  const texts = new Map<string, string>();
  const openings = new Map<string, string>();
  for (const p of own) {
    if (texts.has(p.text)) problems.push(`${p.id}: the same text as ${texts.get(p.text)}`);
    texts.set(p.text, p.id);
    const term = passageTerm(p.text, p.names);
    if (p.term !== term) problems.push(`${p.id}: stored term ${p.term}, levels at ${term ?? 'none'}`);
    for (const w of wordProblems(p.text, (p.words ?? []).map((x) => x.text))) problems.push(`${p.id}: ${w}`);
    for (const s of splitSentences(p.text)) {
      const open = han(s).slice(0, OPENING).join('');
      if (open.length < OPENING) continue;
      const other = openings.get(open);
      if (other && other !== p.id) problems.push(`${p.id}: "${s}" opens like a sentence of ${other}`);
      openings.set(open, p.id);
    }
    if (Number(p.id.slice(1)) < NEW_FROM) continue;
    const chars = han(p.text);
    const n = splitSentences(p.text).length;
    if (chars.length < 50 || chars.length > 110) problems.push(`${p.id}: ${chars.length} characters, expected 50–110`);
    if (n < 3 || n > 7) problems.push(`${p.id}: ${n} sentences, expected 3–7`);
    if (!OWN_TERMS.includes(p.term)) {
      problems.push(`${p.id}: term ${p.term}, expected one of ${OWN_TERMS.join(' ')}`);
      continue;
    }
    const allowed = allowedChars(p.term);
    const outside = [...new Set(chars.filter((c) => !allowed.has(c)))];
    const covered = chars.filter((c) => allowed.has(c)).length / chars.length;
    if (covered < 0.95) problems.push(`${p.id}: ${Math.round(covered * 100)}% of its characters taught by ${p.term}, expected 95%`);
    if (outside.length > 3) problems.push(`${p.id}: ${outside.length} characters beyond ${p.term} (${outside.join('')}), at most 3`);
    const next = MOE_TERMS[MOE_TERMS.indexOf(p.term) + 1];
    const far = outside.filter((c) => schoolTerm(c) !== next);
    if (far.length) problems.push(`${p.id}: ${far.join('')} not taught by ${next}`);
    const termChars = [...new Set(chars.filter((c) => schoolTerm(c) === p.term))];
    if (termChars.length < 6) problems.push(`${p.id}: ${termChars.length} characters first taught in ${p.term} (${termChars.join('')}), expected 6`);
    const words = p.words ?? [];
    if (words.length < 1 || words.length > 4) problems.push(`${p.id}: ${words.length} 生词, expected 1–4`);
    for (const w of words) {
      if (!p.text.includes(w.text)) problems.push(`${p.id}: 生词 ${w.text} is not in the passage`);
      if (!han(w.text).some((c) => schoolTerm(c) === p.term)) problems.push(`${p.id}: 生词 ${w.text} has no character first taught in ${p.term}`);
      for (const g of glossProblems(w.gloss)) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}": ${g}`);
      const known = kidGloss(w.text);
      if (known !== undefined && known !== w.gloss) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}" differs from its kid gloss "${known}"`);
    }
  }
  return problems;
}
```

Run: `npx vitest run scripts/check-content.test.ts -t "our passages"`
Expected: the draft and rule tests pass; `'every one passes …'` fails with `p12: 一家人: not a word for a P2 child (HSK 7)` (measured).

- [ ] **Step 3: Fix p12, add the review sheet**

In `src/content/passages.json`, p12: `中午，我们一家人坐在一起吃饭。` → `中午，我们全家坐在一起吃饭。` (全家 is HSK 2; p12 still levels 一下). Then `npm run pinyin`.

Create `scripts/review-passages.ts`:

```ts
// The passages sheet for the parent's spot check (spec 2026-10-15 §2.2): each new passage of ours with its term, 生词 and
// questions, next to the gloss CSV that build-kidgloss.ts writes. Usage: npx tsx scripts/review-passages.ts passages.csv
import { writeFileSync } from 'node:fs';
import { PASSAGES } from '../src/content';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { NEW_FROM } from './check-content';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx scripts/review-passages.ts <out.csv>');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const ask = (x: { q: string; choices: string[]; answer: number }) => `${x.q} ${x.choices.map((c, i) => (i === x.answer ? `[${c}]` : c)).join(' / ')}`;
const lines = ['id,term,title,text,生词,question 1,question 2'];
for (const p of PASSAGES.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= NEW_FROM)) {
  const qs = PASSAGE_QUESTIONS[p.id] ?? [];
  lines.push([p.id, p.term, p.title, p.text, (p.words ?? []).map((w) => `${w.text} = ${w.gloss}`).join('; '), qs[0] ? ask(qs[0]) : '', qs[1] ? ask(qs[1]) : ''].map(q).join(','));
}
writeFileSync(out, '﻿' + lines.join('\n') + '\n'); // a BOM, so Excel and Numbers read the Chinese
console.log(`${lines.length - 1} passages written to ${out}`);
```

Run: `npx vitest run scripts/check-content.test.ts -t "our passages" && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 4: Write the fourteen 二上 passages** (the controller's ruling: 14, not 12)

Add p21–p34 to `src/content/passages.json`, one object a line, each `{"id","title","text","term":"二上","source":"ziji","words":[{"text","gloss"}…]}`. p21 is the measured draft from the test above (text, title 新学年, words 年级/座位/操场 with the glosses shown). For the rest, the scene and the 二上 characters to build it on (`moe2024.json` 二上, each lesson's new 识读字):

| id | title | scene | 二上 characters to use (≥ 6) |
|---|---|---|---|
| p21 | 新学年 | the first day in P2: new class, new teacher, finding seats | 新 年 级 班 亲 美 丽 第 帮 座 位 操 (drafted) |
| p22 | 拜年 | 除夕 and 初一 at 婆婆's flat: 贴 福, a lion dance downstairs, 拜年 | 吉 利 岁 全 除 贴 福 舞 龙 婆 拜 您 |
| p23 | 客人来了 | guests for dinner: he sets 碗、盘、筷子 and passes the cups | 碗 盘 筷 杯 客 送 忙 尝 递 |
| p24 | 公园的颜色 | colours in the park: trees, flowers, the sky | 棵 树 颜 彩 蓝 绿 黄 形 |
| p25 | 音乐室在哪里 | lost on the way to the music room in a big school; a classmate shows the way | 音 室 楼 旁 往 转 路 远 迷 答 |
| p26 | 骑脚踏车 | riding along the park connector with a neighbour; stopping at the red light | 骑 脚 踏 桥 停 灯 亮 邻 居 互 相 |
| p27 | 小贩中心 | lunch at the hawker centre: queueing, finding seats, 炒面 and 冰水 | 茶 炒 油 冰 队 找 座 位 餐 味 食 |
| p28 | 消防员来了 | firefighters visit school and teach what to do in a fire | 消 防 灾 灭 保 抓 怕 建 |
| p29 | 大雨 | a sudden storm after school; he forgot his umbrella | 阴 湿 冷 暗 乌 闪 窗 忘 急 淋 |
| p30 | 蚂蚁和蜜蜂 | a short fable: the ant and the bee help each other by the pond | 蚂 蚁 爬 蜜 蜂 池 跳 蛙 窝 泥 |
| p31 | 爷爷的咖啡 | morning kopi with 爷爷 at the coffee shop; he tries a sip | 咖 啡 特 别 闻 懂 糖 温 |
| p32 | 看医生 | a cough; the nurse auntie at the polyclinic, the doctor's advice | 医 病 护 顾 姨 员 怕 |

How each passage is written:
- 50–110 characters in 3–7 sentences; plain, natural **Singapore Mandarin** for a 7-year-old (一点 not 一点儿; 巴士, 组屋, 小贩中心, 脚踏车 where they fit; no 儿化); first person or a short fable; one small event with a clear end.
- Build it on the term's characters: at least 6 different ones from the row, used where they belong; everything else from 一上–一下 and 二上 (`allowedChars('二上')`); at most 3 characters from 二下, none later.
- 1–4 生词: words of the passage containing a 二上 character, each glossed in at most four plain English words (if `kidGloss.json` has the word, copy its gloss exactly).
- Two questions in `src/content/passageQuestions.ts` by Task 5's rules.

How each passage is checked:
1. **Coverage and term:** `npx tsx -e "import {passageTerm} from './src/langdu/level'; console.log(passageTerm(process.argv[1]))" '<text>'` prints `二上`; if it prints `一下`, use more 二上 characters; then `npx vitest run scripts/check-content.test.ts -t "our passages"` lists any coverage, beyond-term, term-character or 生词 problem.
2. **Word gate:** the same test lists any blocked word or adult word (`wordProblems`); reword it (a needed word may be a 生词).
3. **Questions:** `npx vitest run scripts/check-content.test.ts -t "every built-in passage"`.
4. **Pinyin:** `npm run pinyin`, then read the passage's lines in `git diff src/content/sentencePinyin.json` for a wrong 多音字; fix with `src/content/pinyinFixes.ts`.
5. **Content review — read every passage in full**, aloud if possible, as his parent would: is it natural Singapore Mandarin a P2 child would hear at home or school? Is every sentence true to the scene, kind, and free of anything a 7-year-old shouldn't meet (no fear, money worries, romance, injury)? Does it read well aloud in about 30 seconds? Rewrite any that fail and re-run 1–4.

- [ ] **Step 5: Run everything and write the review sheet**

Run: `npx tsc --noEmit && npx vitest run && npx tsx scripts/review-passages.ts /tmp/passages-review.csv`
Expected: all pass; `14 passages written to /tmp/passages-review.csv` (read it once more: each passage with its 生词 and both questions, the right choice in brackets).

- [ ] **Step 6: Commit**

```bash
git add scripts/check-content.ts scripts/check-content.test.ts scripts/review-passages.ts src/content/passages.json src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "feat(langdu): our passages' writing check; twelve 二上 passages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Our passages — 二下 (p35–p54)

**Files:**
- Modify: `src/content/passages.json` (p35–p54), `src/content/passageQuestions.ts` (two each), `src/content/sentencePinyin.json`, `src/content/pinyinFixes.ts` (only if a reading is wrong)

**Interfaces:**
- Consumes: `checkOwnPassages`, `wordProblems`, `checkPassageQuestions`, `scripts/review-passages.ts` (Tasks 5, 8), `passageTerm`.
- Produces: twenty passages with `"term":"二下"`, ids p35–p54 (the controller's ruling: 20, not 16).

- [ ] **Step 1: Add the measured draft and run the check**

Add the test's draft p33 exactly, as **p35** (title 放风筝, words 风筝 = kite, 老鹰 = eagle) with two questions, run `npx vitest run scripts/check-content.test.ts`, expect PASS.

- [ ] **Step 2: Write the other fifteen**

| id | title | scene | 二下 characters to use (≥ 6) |
|---|---|---|---|
| p33 | 放风筝 | flying a kite with 爸爸 in the park (drafted) | 跟 筝 鹰 漂 吹 群 围 |
| p34 | 搭积木 | building a ship from blocks and paper with a friend | 纸 机 块 跟 搭 积 拼 船 |
| p35 | 奶奶的生日 | a card and a cake for 奶奶; blowing out the candles | 健 康 幸 愿 吹 糕 张 卡 礼 |
| p36 | 我的小狗 | bathing the puppy; it sleeps, wakes, and runs off with a sock | 澡 睡 觉 乖 聪 宠 丢 醒 |
| p37 | 不吵了 | two brothers fight over a toy that breaks, then make up | 抢 推 讨 厌 争 吵 弄 破 撞 |
| p38 | 种番茄 | growing tomatoes on the HDB corridor: sprouts, picking, cooking | 茄 番 芽 比 煮 摘 挖 根 实 |
| p39 | 在图书馆 | the library: keeping quiet, borrowing a fun book, reading it twice | 持 静 趣 借 次 遍 架 箱 |
| p40 | 逛夜市 | a pasar malam at night: satay smoke, chicken wings, drinks | 逛 夜 市 烤 肠 翅 饮 料 摊 闹 |
| p41 | 海边 | East Coast Park: sand, shells, the shore, a swim | 海 岸 参 观 泳 沙 捡 壳 |
| p42 | 一滴水 | turning off the tap; every drop counts | 浇 桶 珍 惜 滴 浪 费 流 |
| p43 | 拔萝卜 | the fable: everyone pulls the big turnip, even a mouse | 猪 拔 萝 卜 鼠 或 根 |
| p44 | 看电影 | buying tickets, the dark hall, a funny strange animal in the film | 影 票 厅 奇 怪 活 |
| p45 | 彩虹 | a rainbow after the rain; thin and thick bands of colour | 虹 晶 粗 细 难 易 |
| p46 | 小岛 | a day on Pulau Ubin by bicycle; a dream about it that night | 岛 梦 围 迎 识 骑 |
| p47 | 小鸟和老鹰 | a fable: the little bird is chased and escapes | 鹰 追 绳 器 更 许 |
| p48 | 植物园 | the Botanic Gardens: neat rows, many areas, a museum | 馆 院 植 区 处 街 整 齐 |

Write each by Task 8 Step 4's rules with `二下` in place of `二上`: at least 6 of the row's characters; everything else taught by 二下 (`allowedChars('二下')`); at most 3 characters from 三上; 1–4 生词 each containing a 二下 character; two questions. A passage needs about one token in ten from 二下 to level at 二下 rather than 二上 (measured on the draft: 9 of 75).

- [ ] **Step 3: Check every passage**

The five checks of Task 8 Step 4 — term (`二下`), coverage and 生词 (`-t "our passages"`), word gate, questions (`-t "every built-in passage"`), pinyin (`npm run pinyin` and read the diff) — and the **content review: read every passage in full** for natural Singapore Mandarin, truth to the scene, nothing unsuitable for a 7-year-old, and a good read-aloud length. Rewrite and re-check any that fail.

- [ ] **Step 4: Run everything and refresh the review sheet**

Run: `npx tsc --noEmit && npx vitest run && npx tsx scripts/review-passages.ts /tmp/passages-review.csv`
Expected: all pass; `34 passages written` (14 二上 + 20 二下, as written).

- [ ] **Step 5: Commit**

```bash
git add src/content/passages.json src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "feat(langdu): sixteen 二下 passages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Our passages — 三上 (p55–p73)

**Files:**
- Modify: `src/content/passages.json` (p55–p73), `src/content/passageQuestions.ts` (two each), `src/content/sentencePinyin.json`, `src/content/pinyinFixes.ts` (only if a reading is wrong)

**Interfaces:**
- Consumes: as Task 9.
- Produces: nineteen passages with `"term":"三上"`, ids p55–p73 (the controller's ruling: 19, not 12). With them the library holds 73 passages of ours and 15 from Global Storybooks (Tasks 3–4 kept whole stories only), 88 in all.

- [ ] **Step 1: Add the measured draft and run the check**

Add the test's draft p49 exactly, as **p55** (title 迟到了, words 迟到 = be late, 准时 = on time, 赶快 = quickly) with two questions; `npx vitest run scripts/check-content.test.ts` passes.

- [ ] **Step 2: Write the other eleven**

| id | title | scene | 三上 characters to use (≥ 6) |
|---|---|---|---|
| p49 | 迟到了 | the alarm didn't ring; he misses the bus and is late (drafted) | 钟 赶 背 刚 迟 系 准 备 |
| p50 | 当班长 | chosen as class monitor; he practises hard to do it well | 当 希 望 练 努 复 交 举 翻 功 |
| p51 | 新同学 | a new classmate: her name, how she looks, what she likes | 姓 名 胖 瘦 矮 意 思 陈 李 |
| p52 | 坐巴士 | taking the bus with 奶奶: tapping the card, pressing the bell | 陪 装 辆 单 超 按 盖 吸 管 惯 |
| p53 | 小树长大了 | a sapling he planted grows; the shade grows wider | 浅 深 窄 宽 化 越 幼 腿 嘴 喊 |
| p54 | 看展览 | an art show at the library in the evening; buying a fresh drink | 展 艺 傍 报 杂 志 号 付 钱 鲜 |
| p55 | 足球比赛 | a football match: a sudden fall, sorry, and forgiving | 赛 突 错 误 扔 谅 系 跌 受 刻 |
| p56 | 花盆碎了 | he breaks a flowerpot, says sorry and offers to pay | 碎 赔 留 便 盆 歉 踩 |
| p57 | 中秋节 | painting lanterns and hanging them up for 中秋 | 需 贺 部 涂 洞 吊 笼 挂 |
| p58 | 猴子和月亮 | the fable: the monkeys try to save the moon from the well | 猴 坑 救 竿 升 称 沉 量 |
| p59 | 帮妈妈晒衣服 | hanging the washing on the bamboo poles; tired and sweaty | 裙 裤 晒 歪 乱 累 汗 求 较 |
| p60 | 休息日 | a rest day: TV, then moving the boards with 爸爸, a clever idea | 休 息 视 脱 搬 板 灵 堂 溜 |

Write each by Task 8 Step 4's rules with `三上`: at least 6 of the row's characters, at least one token in ten from 三上 so it levels at 三上 (measured: a draft with 8 三上 tokens of 96 levelled 二上; 11 of 90 levelled 三上); everything else taught by 三上; at most 3 characters from 三下; 1–4 生词 with a 三上 character; two questions.

- [ ] **Step 3: Check every passage**

The five checks of Task 8 Step 4 (term `三上`) and the **content review: read every passage in full** as above. Rewrite and re-check any that fail.

- [ ] **Step 4: Run everything and refresh the review sheet**

Run: `npx tsc --noEmit && npx vitest run && npx tsx scripts/review-passages.ts /tmp/passages-review.csv`
Expected: all pass; `53 passages written`. The Library (parent area) now lists 88 passages.

As written (Task 10): p55 迟到了, p56 当班长, p57 新同学, p58 坐巴士, p59 小树长大了, p60 看画展, p61 足球比赛, p62 花盆碎了, p63 做灯笼 (中秋 can't be written: 秋 is on no list, so 「八月十五」), p64 猴子和月亮, p65 晒衣服, p66 休息日 (a diary), and seven more: p67 给外婆的信 (a letter), p68 种豆芽 (a how-to), p69 小熊过生日 (a fable), p70 打篮球, p71 沉下去了吗 (a science lesson), p72 装行李, p73 掉牙了. The table's ids above are the plan's original numbering.

- [ ] **Step 5: Commit**

```bash
git add src/content/passages.json src/content/passageQuestions.ts src/content/sentencePinyin.json src/content/pinyinFixes.ts
git commit -m "feat(langdu): twelve 三上 passages — the library is complete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Fit, offline and WebKit — the library screens on iPad and phone

**Files:**
- Modify: `vite.config.ts` (precache `passages/*.webp`)
- Modify: `scripts/stage-cases/page.tsx` (library cases; the 朗读 cases use the longest of our passages), `scripts/stage-cases.ts` (copy the pictures; check the library cases)
- Modify: `scripts/fit-profile.ts` (`schoolText?: boolean`), `scripts/fit-check.ts` (the `langdu-library` flow)
- Modify: `src/styles.css` (only what the screenshots show; the measured fix below)

**Interfaces:**
- Consumes: everything above; WebKit via playwright-core 1.52 (installed: `~/Library/Caches/ms-playwright/webkit-2158`; if missing, stop and ask before `npx playwright-core install webkit`).
- Produces: stage cases `langdu-gsb-listen`, `langdu-gsb-read`, `langdu-gsb-meaning`, `langdu-words-listen`; fit flow `langdu-library`; `FitProfileOptions.schoolText`.

- [ ] **Step 1: The pictures work offline**

`vite.config.ts`, `workbox.globPatterns`: `['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}', 'worlds/*.webp', 'passages/*.webp'], // One River's paintings and thumbnails (spec 2026-10-13 §4) and the library's pictures (spec 2026-10-15 §7): offline`.

Run: `npx vite build && grep -o 'passages/gsb-[0-9]*-[0-9]*\.webp' dist/sw.js | sort -u | wc -l`
Expected: `45` (every picture precached).

- [ ] **Step 2: Stage cases for the library**

`scripts/stage-cases/page.tsx`: import the type `Passage` with `Recording`; the existing `langdu-` cases take the longest of our passages (after Tasks 8–10 it is no longer p20), and new cases come before them:

```tsx
else if (which?.startsWith('langdu-gsb-') || which === 'langdu-words-listen') {
  // the library (spec 2026-10-15): the longest Global Storybooks passage with its picture, names, credit line and 下一篇; and
  // the longest of our passages with 生词 — each with every syllable showing (nothing known), the part opened directly
  const longest = (ps: Passage[]) => [...ps].sort((a, b) => b.text.length - a.text.length)[0]!;
  const p = which === 'langdu-words-listen' ? longest(PASSAGES.filter((x) => x.words?.length)) : longest(PASSAGES.filter((x) => x.source === 'gsb'));
  const part = which.slice(which.lastIndexOf('-') + 1) as LangduPart;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...p, question: PASSAGE_QUESTIONS[p.id]?.[0] }} rng={() => 0.999} oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup={false} startAt={part} onSwap={() => {}} onDone={() => {}} />
    </PinyinFade>,
  ), app);
}
else if (which?.startsWith('langdu-')) {
  // 朗读's parts (spec 2026-10-12 §3, §8): the longest of our passages with every syllable showing (nothing known), each part
  // opened directly; stage-cases.ts misses the question. In listen, the first sentence lights as its voice starts.
  const p = [...PASSAGES.filter((x) => x.source === 'ziji')].sort((a, b) => b.text.length - a.text.length)[0]!;
  const part = (which === 'langdu-read-blocked' ? 'read' : which.slice('langdu-'.length)) as LangduPart;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...p, question: PASSAGE_QUESTIONS[p.id]![0] }} rng={() => 0.999} /* no shuffle: stored order */ oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup startAt={part} micBlocked={which === 'langdu-read-blocked'} onDone={() => {}} />
    </PinyinFade>,
  ), app);
  if (part === 'listen') setTimeout(() => setSpeaking(true), 50);
}
```

`scripts/stage-cases.ts`: import `PASSAGES` (`../src/content`); define, after the imports,

```ts
/** The case page's 朗读 passage: the longest of ours (page.tsx picks it the same way). */
const LONGEST_OWN = [...PASSAGES.filter((p) => p.source === 'ziji')].sort((a, b) => b.text.length - a.text.length)[0]!;
```

copy the pictures next to the page (`cpSync('public/passages', join(dir, 'passages'), { recursive: true }); // the library's pictures (spec 2026-10-15 §7)` after the worlds copy), make the missed-question case use `PASSAGE_QUESTIONS[LONGEST_OWN.id]![0]!` instead of p20's, and add before the `// 朗读 (spec 2026-10-12 §8)` loop:

```ts
  // the library (spec 2026-10-15): Listen with the picture, names, credit line and 下一篇; Read with the picture; the question
  // without it; our passage with its 生词 strip. Nothing clipped; the picture loaded and on screen; 下一篇 big enough to tap.
  for (const c of ['langdu-gsb-listen', 'langdu-gsb-read', 'langdu-gsb-meaning', 'langdu-words-listen']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`, '.langdu__passage')));
    const pic = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>('img.langdu__pic');
      if (!img) return null;
      const r = img.getBoundingClientRect();
      return { loaded: img.complete && img.naturalWidth > 0, height: Math.round(r.height), onScreen: r.top >= 0 && r.bottom <= innerHeight };
    });
    if (c === 'langdu-gsb-meaning' && pic) problems.push(`${size.name} ${c}: the picture shows on the question`);
    if ((c === 'langdu-gsb-listen' || c === 'langdu-gsb-read') && (!pic || !pic.loaded || !pic.onScreen || pic.height < 48)) problems.push(`${size.name} ${c}: picture ${JSON.stringify(pic)}`);
    if (c === 'langdu-gsb-listen' || c === 'langdu-words-listen') {
      const next = await page.$('.langdu__next');
      const box = await next?.boundingBox();
      if (!box || Math.min(box.width, box.height) < 43.5) problems.push(`${size.name} ${c}: 下一篇 under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'missing'})`);
    }
    if (c === 'langdu-gsb-listen' && !(await page.$('.langdu__credit summary'))) problems.push(`${size.name} ${c}: no credit line`);
    if (c === 'langdu-words-listen' && !(await page.$('.langdu__words li'))) problems.push(`${size.name} ${c}: no 生词 strip`);
  }
```

- [ ] **Step 3: A library flow in the fit sweep**

`scripts/fit-profile.ts`: import `EMPTY_READING`; add to `FitProfileOptions` `schoolText?: boolean; // false: no parent text, and one of our passages read yesterday, so 朗读 reads a Global Storybooks passage (its turn: a picture, a credit line, 下一篇; spec 2026-10-15)`; save the `pp:fit` text only `if (o.schoolText !== false)`; and in the kid it saves:

```ts
      ...(o.schoolText === false ? { reading: { ...EMPTY_READING, lastWarmup: yesterday, history: { p01: { reads: 1, lastRead: yesterday, rest: 3, q: 1 } } } } : {}),
```

(ZiJi then has one read and Global Storybooks none, so the turn picks a Global Storybooks passage; the warm-up ran yesterday, so the step opens on Listen.)

`scripts/fit-check.ts`, after the `langdu-extra` run:

```ts
  await run('langdu-library', AFTERNOON, { activities: only('speaking'), speakingLast: 'story', langdu: true, schoolText: false }, async (p) => { await startLesson(p); await walkLesson(p, size, 'langdu-library'); }); // a library passage: picture, credit, 下一篇 (spec 2026-10-15)
```

- [ ] **Step 4: Run them in WebKit and look**

Run: `npx tsx scripts/stage-cases.ts`, then `FIT_ONLY='^langdu|^parent' npm run fit`
Expected: no `FAIL` lines; exit 0.

What the prototype of this plan measured, and the fix it needed (apply it if the run shows the same):
- A long answering sentence in the miss sheet was cut on iPhone SE (`langdu-meaning wrong: cut off in the sheet`): the phone rule `.sheet .label__cells { flex-wrap: nowrap; }` keeps it on one line. Add under it, inside the same `@media (max-width: 599px)` block:
  ```css
  .stage--langdu .sheet__detail .label__cells { flex-wrap: wrap; } /* a library passage's answering sentence is long: it wraps (spec 2026-10-15) */
  ```
- The credit line at 12px failed the sweep's floor (`Chinese text under 16px`); Task 7's rule already sets it to 16px, quiet by colour and kept to one line.
- With the picture beside the title and 下一篇 in the sheet (Task 6), the Listen screen fitted at every size; the passage scrolls inside its box on iPhone SE (3 lines showing), which `.langdu__passage` allows.

Open and look at, at least: `fit-shots/stage-cases/langdu-gsb-listen-ipad-landscape.png`, `…-ipad-portrait.png`, `…-iphone-se.png`, `langdu-gsb-read-iphone-se.png`, `langdu-gsb-meaning-ipad-landscape.png` (no picture), `langdu-words-listen-ipad-portrait.png`, and the fit sweep's `langdu-library` and parent `Reading texts` shots. Check by eye: the picture is the right page for the text, the title isn't cut, the 生词 strip reads as word · pinyin · English, the credit line is one quiet line, 下一篇 sits left of 开始朗读 in the sheet, and the Library table scrolls inside its box with no sideways page scroll.

- [ ] **Step 5: Run everything**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: no type errors; all tests pass; the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts scripts/stage-cases/page.tsx scripts/stage-cases.ts scripts/fit-profile.ts scripts/fit-check.ts src/styles.css
git commit -m "chore(fit): the library's Listen, Read and question screens in WebKit; pictures precached

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** §1 causes 1–3 (cycle, extra days, same-day repeats) → Tasks 1–2; cause 4 (unrecorded read) → Task 2; cause 5 (one fixed question) → Task 5; cause 6 (small easy pool) → Tasks 3, 4, 8–10. §2.1 import, licence, attribution, edits → Tasks 3, 7; images → Tasks 3, 6, 11. §2.2 own passages and their checks → Tasks 8–10 (review CSV: Task 8). §3 levelling → Tasks 3–4. §4 rotation and rest, warm-up, bonus unchanged → Tasks 1–2. §5 下一篇, skips, often skipped → Tasks 6–7. §6 questions → Task 5. §7 images → Tasks 3, 6, 11. §8 data, migration, misreads, auto-stop → Tasks 1–3. §9 Library → Task 7. §10 testing → each task's tests; WebKit → Task 11. §11 out of scope: nothing planned. §12 decisions → recorded in the spec's §12 (commit `d584ec7`).
- **Placeholders:** none; the content tasks (5, 8–10) give the format, verified examples, the briefs and the exact checks, since the passages and questions are themselves the work.
- **Type consistency:** `ReadingHistory`/`PassageHistory`/`EMPTY_READING` (Task 1) are the names used in Tasks 2–7; `Candidate`, `pickPassage`, `swapTarget` (Tasks 1, 6); `ReadingPassage`, `LangduPassage`, `Reader`, `readingPool` (Tasks 2, 4, 5); `passageFit`, `passageTerm`, `termIndex`, `readerAt`, `withinReach` (Tasks 2–4); `questionFor`, `withQuestion`, `shuffleQuestion` (Task 5); `creditLine`, `LICENCE_URL`, `libraryRows` (Task 7); `checkOwnPassages`, `wordProblems`, `NEW_FROM` (Task 8).
- **Review Focus:** each of the five has its test in the named task (Tasks 1, 2, 4, 6).
