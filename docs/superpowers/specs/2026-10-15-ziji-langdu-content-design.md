# ZiJi 朗读 content: a real passage library, rotation with rest, and 下一篇 — design

Date: 2026-10-15 · Follows the 朗读 step spec (2026-10-12) · Base: main at 0d3821d

## 1. Why

The parent reported on 2026-10-15: "The lang du portion also keeps showing the same passage and questions across lessons. Is there public reading material suitable for the levels to use?"

**Root cause.** `src/langdu/cycle.ts` and the session wiring repeat the passage by design, and a few edge cases make it repeat longer:

1. **The 3-day cycle.** `pickPassage` returns the current passage until `days >= CYCLE_DAYS (3) + extra`. Every lesson for 3 school days shows the same passage. This was intended as repeated reading, but neither he nor the parent can see that it is on purpose.
2. **Extra days.** The parent's misread marks call `addExtraDay`, which adds up to `MAX_EXTRA` (2) more days. One passage can therefore last 5 days.
3. **Several lessons a day.** `r.lastDay === today` keeps the same passage for every lesson that day, including the second lesson and 多读一遍.
4. **No take, no day counted.** `onLangduDone` calls `finishDay` only when `r.read` is set. When the microphone is blocked or failing, he reads unrecorded with 「读完了」 and `r.read` is null. The day is never counted, so the **same passage comes back every lesson for as long as the microphone stays unavailable**.
5. **One fixed question per passage.** `PASSAGE_QUESTIONS` has a single question per passage, with fixed choice order. Every day of the cycle asks the identical question, so after the first day it is answered from memory.
6. **A small, easy pool.** There are 20 built-ins (`passages.json`), and all of them are 一下 level: 82–98% of their characters are in the 一下 cumulative 识读字 list, and 100% for most at 二上. For a P2 child in 二下 this means 20 easy passages, each worth 3–5 days, then the 30-day `RECENT_DAYS` fallback brings the oldest one back.

Causes 1–3 and 5 are enough to explain what the parent saw in the three days since 朗读 returned (deployed 2026-10-12). Cause 4 is a real bug either way.

**Success:**
- Most lessons bring a passage he hasn't read in the last few days, at his level.
- A passage comes back on a spaced schedule, so repeated reading stays, but rests longer once he reads it well.
- Each revisit asks a different question, with the choices shuffled.
- The library covers 二上–三上 with roughly 100+ passages: about 60 from Global Storybooks Chinese and 40 new ones of our own.
- 「下一篇」 lets him swap a passage he doesn't want, within limits.

## 2. Sources

### 2.1 Global Storybooks Chinese (primary open source)

What it is:
- **Site:** global-asp.github.io/storybooks-chinese (Global Storybooks, UBC, built from the African Storybook).
- **Mandarin set:** 40 stories in **simplified characters**, labelled level 1–5 (L1 15, L2 11, L3 8, L4 4, L5 2).
- **Machine-readable source:** `github.com/global-asp/sbc-source`, folder `zh/`, one Markdown file per story, e.g. `0001_一个很高的人.md`.
  - `# title`, then one `##` block per page, then a credit list: `License`, `Text`, `Illustration`, `Translation`, `Language`.
  - Pinned for this work at commit `be28dab` (2026-06-08), 168 KB.
  - The level of each story is not in the Markdown. It comes from the site's `stories/zh/level1–5/` pages and is recorded once in the import manifest.
- **Licence (per story, not per repo):**
  - 29 stories: **CC BY 3.0** (the site links `creativecommons.org/licenses/by/3.0`).
  - 11 stories: **CC BY-NC 3.0**: 0002, 0003, 0009, 0030, 0067, 0112, 0120, 0129, 0231, 0234, 0271. Most of these are level 1, i.e. the easiest. See decision D1.
- **Credits:** each story credits its author, illustrator and translator. The translators are Vicky Liu (20 stories) and dohliam (20).
- **Images:** one illustration per page in `global-asp/gsn-imagebank` (`<id>/<page>.jpg`, about 30 KB each). They carry the story's licence and illustrator credit.
- **Audio:** native Mandarin MP3 per page at `globalstorybooks.net/media/audio/zh/<id>/mp3/<page>.mp3` (checked: 0001, 0002 and 0129 exist). This is out of scope here (§11).
- **Content:**
  - Mostly African settings, animals and families. Suitable for Singapore and for 7.
  - A blocklist scan finds no unsuitable vocabulary. 0072 指蜜鸟的复仇 (revenge, 血) and 0342 惩罚 are the darkest in theme; both are excluded on level grounds anyway (§3).
  - Wording needs light fixes:
    - 一点儿 → 一点 (Singapore usage);
    - one traditional 馬 in 0327 斑馬;
    - transliterated names (安迪斯瓦, 玛格威) that are unknown characters by nature.

**Level fit**, measured against the MOE 识读字 cumulative by term (`moe2024.json`: 一上 182, 一下 364, 二上 566, 二下 746, 三上 901, 三下 1031 characters):
- **Whole stories are too long and mostly too hard.** L3–L5 stories run 400–1470 characters. Only 0271 两个 (100%), 0231 气象书 (96%), 0001 一个很高的人 (96%) and 0112 我的身体 (95%) reach ≥95% of characters by 二下. 0009, 0003, 0095, 0008 and 0087 are at 90–92%.
- **Split into page-aligned chunks of 40–110 characters (median 85), the 40 stories give 173 chunks.** At a ≥90% coverage bar, ignoring names:
  - 一下 2, 二上 4, 二下 22, 三上 28, 三下 27;
  - 90 beyond 三下, largely because of repeated transliterated names and longer-story vocabulary.
  - Of these, CC BY only: 二上–三上 48. With the NC stories: 54.
- So Global Storybooks gives about **25 passages at his level now (≤二下) and about 30 more a term ahead**. That is real, but not enough alone, so our own graded passages fill the gaps (§2.2).

**Import (build time, no runtime fetch):**
- `scripts/storybooks/` vendors the 40 `zh/*.md` files at the pinned commit with a `SOURCE.md` (URL, commit, licence summary), plus `manifest.json`. The manifest holds, per story:
  - its level;
  - include or exclude;
  - edits: exact `from → to` replacements, each with a reason;
  - its names: characters excluded from coverage, always shown with pinyin.
- `scripts/import-storybooks.ts` does the following:
  - parses pages;
  - applies the edits;
  - chunks the pages in order into passages of 40–110 characters, merging a short tail into the previous chunk;
  - levels each chunk (§3);
  - drops chunks beyond 三上;
  - drops a story when fewer than half its chunks survive, because a story missing its middle parts is no story;
  - writes `src/content/storybooks.json`.
- The script is deterministic. The JSON is committed, so the font subset (`scripts/build-font.ts` scans `src/**/*.json`) and the PWA precache pick it up with no runtime network.
- **Edits are minimal:** usage fixes, typos and wrong-script characters only. Every story that is changed shows 「有改动」/"adapted" in its credit, which CC BY requires.

**Attribution UI:**
- **In the step:** a one-line credit under the passage on the Listen screen, in small type, e.g. 「故事：Global Storybooks · 文 Cornelius Gulere · 图 Catherine Groenewald · 译 dohliam · CC BY 3.0 · 有改动」.
  - Tapping it opens the parent-facing details: links to the licence and the source.
  - The credit never shows on Read or Question, so the reading screen stays clean.
- **Parent › Credits:** one entry for Global Storybooks / African Storybook, with each included story's title, author, illustrator, translator, licence and "adapted". It replaces 「Read-aloud passages were written for this app」 with: "Passages marked ZiJi were written for this app."

### 2.2 Our own graded passages

**Why:** Global Storybooks is thin at 二上 and patchy at 二下. Our own passages can also deliberately reuse the words of his current school term, which a translated African story never will.

**How many:**
- **40 new**: 二上 12, 二下 16, 三上 12.
- The existing 20 (`p01`–`p20`) stay and are labelled by the same leveller; nearly all come out 一下.
- Total own: 60.

**How they are written:**
- Written for the app, by Claude, at build time, in `src/content/passages.json` with new fields (§8).
- Each passage is 50–110 characters and 3–7 sentences: a small everyday scene in a Singapore child's life (school, 组屋, hawker centre, MRT, family, festivals), or a short fable.
- Each one uses at least 6 different characters first taught in its term (`taughtAt`), so it practises his class words.

**Checks** (`scripts/check-content.ts`, extended, failing the build):
1. **Coverage:** at least 95% of the characters are in `allowedChars(term)` (the existing understand-rung set, cumulative to the term). At most 3 distinct characters are outside it, and each of those must be in `moe2024.json` within the next term.
2. **Word gate:** every multi-character word (pinyin-pro segmentation, as `gen-pinyin` does) passes `isChildWord`. Nothing from `BLOCKED` appears.
3. **Kid glosses:** each passage lists up to 4 生词, the words that are new for the term. Each must have a kid gloss (`kidGloss.json`, passing `glossProblems`). They show under the title on Listen as character, pinyin and gloss.
4. **Pinyin:** the passage's in-context pinyin is snapshotted into `sentencePinyin.json` by `gen-pinyin`, so polyphones are reviewed once.
5. **Questions:** see §6.
6. **No duplicate** passage text, or near-duplicate sentence opening, with another passage.

**Parent spot check:** the review CSV that already exists for glosses gains a "passages" sheet with each new passage, its term, 生词 and questions.

## 3. Levelling

- **A passage's term** is the earliest term T where at least 92% of its character tokens, names excluded, are in the cumulative 识读字 list through T. The import and the content check compute it and store it on the passage.
  - It is shown to the parent, and pre-filters the pool to passages with term ≤ his class term + 1.
- **His readable set K** = `knownChars` ∪ the 识读字 of every MOE lesson up to his current class lesson (`currentLesson(now, settings)`), since he meets those at school.
  - Placement already lands in `knownChars` as placed recognise cards. So "his placement and class term" are both in K, with no new placement logic.
- **Fit of a passage** = the share of its character tokens in K, names excluded. Names always show pinyin.
  - **Target band 0.90–0.97, preferring 0.93.**
  - Below 0.90: not offered, except a parent's school text.
  - Above 0.97: "easy". Used only when nothing is in band, and for revisits.
- The old `eligiblePassages` filter (≥0.90 against `knownChars` only) is replaced by this fit. `PASSAGE_KNOWN_RATIO` goes.
- The parent sees each passage's term and his current fit in the Reading texts tab (§9).

## 4. Rotation and rest

The 3-day cycle (`CYCLE_DAYS`, `days`, `extra`, `addExtraDay`, `finishDay` as written) is **replaced by a per-passage history with rest**. Repeated reading stays, but spaced.

**Per passage:** `{ reads, lastRead, rest, lastSkipped?, q }`.
- `rest`: days until it is due again.
- `q`: the index of the next question to ask.

**After a read** (recorded, or unrecorded through 「读完了」, which fixes cause 4):

| How it went | New rest |
|---|---|
| First read | 3 days |
| Read well: finished, and the meaning question right first time | rest × 2.5, at least 7 (3 → 7 → 18 → 45) |
| Not well: the question missed, or no question answered | 3 days |
| The parent marks ≥2 misreads in Listen & confirm | 3 days, from the review date. Replaces `addExtraDay` |
| Rest would pass 60 days | **Retired**: offered again only when nothing else is available |

**Rules for picking:**
- **No repeats.** A passage is never offered again within **3 days** of its last read or skip. The same day counts.
  - A second lesson or 多读一遍 on the same day gets a **different** passage from the one already read that day.
- **Picking order** (`pickPassage(history, pool, K, today, lastKind)`):
  1. A parent school text not yet read (as now: the class text comes first).
  2. Alternate between new and revisit:
     - If the last pick was **new** and a revisit is due (`lastRead + rest ≤ today`), take the most overdue revisit.
     - Otherwise take a **new** passage in band.
       - First choice: the next part of a Global Storybooks story he has started. Parts are only offered in order.
       - Then the in-band passage whose fit is closest to 0.93, own and Global Storybooks interleaved.
  3. Any due revisit.
  4. Any in-band or easy passage outside the 3-day gap.
  5. Retired passages, oldest first.
  6. Nothing: the step is skipped, as today.
- **Warm-up (self-introduction):** it ran on day 1 of each 3-day cycle. It now runs when the last warm-up was **3 or more days ago** (new `lastWarmup`), about twice a week as before. `isFirstDay` goes.
- **Bonus star:** unchanged. It compares with the previous lesson take of the same passage, so it applies on revisits.

## 5. 「下一篇」

**What it does:**
- On the **Listen** screen, before he starts reading, a quiet 「下一篇」 button swaps in the next candidate from §4's order. The swapped-out passage stays unread.
- A swapped-out passage gets `lastSkipped = today`, so the 3-day gap applies. Its rest and reads are untouched.

**Limits:**
- **2 swaps per step.** After that the button hides.
- **Not once recording has started**, so a hard passage can't be dodged halfway.
- **Not on a parent's school text** (decision D5).
- **Hidden when no other candidate exists.**

**多读一遍 on Home:** it now picks per §4, excluding passages already read today, so it is a genuinely new or revisited passage. 「下一篇」 works the same there. It still earns no stars, but it counts as a read for rest.

**Parent view:** swaps are logged per passage (`skips`). A passage he swaps 3 times is shown in the Reading texts tab as "often skipped", so the parent can see whether it is too hard.

## 6. Questions

**Per passage:**
- **Own passages:** 2 questions each (`p01`–`p20` gain one each).
- **Global Storybooks chunks:** 2 each.
- Shape as now: 谁 / 哪里 / 什么 / 为什么 / 怎么样, 3 choices, an answering sentence index.
- All written by Claude at build time into `src/content/passageQuestions.ts`, which becomes `Record<id, PassageQuestion[]>`.

**Asked:**
- One per read, in turn: `history.q` goes up after each read, so a revisit asks the other question.
- **Choices are shuffled at each showing.** The right one's position is no longer fixed in content.

**Guess-proofing** (the content check enforces 1–4):
1. **All three choices occur in the passage, or none do.** Picking "the one I saw in the text" never works.
2. **Choice lengths are within 2 characters of each other.** The answer is never the longest, or the only specific one, by construction.
3. **The question doesn't contain the answer's characters,** apart from function characters (的/了/是/在…).
4. **The question needs the passage:** the check rejects a question whose answer is also the most frequent noun in the passage (a cheap proxy). A human pass (the review CSV) catches the rest.
5. **At run time:** the picture is hidden on the Question screen (§7), and a miss shows the answer plus the answering sentence, as now. It is not re-asked in the same step.

**Parent passages:** unchanged, one optional question. The shuffle applies to it too.

## 7. Images

- **Global Storybooks passages** show **one illustration**: the first page of the chunk, vendored at build time.
  - `scripts/import-storybooks.ts` copies it from a pinned `gsn-imagebank` checkout, resizes it to 640 px wide WebP (~20 KB), and stores it at `public/passages/gsb-<id>-<part>.webp`.
  - About 60 images, ~1.2 MB, precached.
  - The licence is the story's, and the illustrator is already in the credit line.
- **Shown on Listen and Read, hidden on Question,** so the picture can't answer the question.
- **Own passages:** no pictures. A passage card keeps Truffle as today.

See decision D3.

## 8. Data and migration

**Content:**
- `Passage` gains:
  - `term`;
  - `source: 'ziji' | 'gsb'`;
  - `names?: string[]`;
  - `words?: { text, gloss }[]` (生词);
  - `image?`;
  - `story?: { id, part, parts }`;
  - `credit?: { title, text, illustration, translation, licence: 'CC BY 3.0' | 'CC BY-NC 3.0', adapted: boolean }`.
- `PASSAGES` = `passages.json` (own) + `storybooks.json` (imported).
- IDs:
  - own: `p01`…`p60`;
  - imported: `gsb:<story>-<part>`, e.g. `gsb:0001-2`.

**Kid state:** `ReadingState` becomes
```ts
{ history: Record<string, { reads: number; lastRead: string | null; rest: number; lastSkipped?: string; skips?: number; q: number }>;
  lastKind: 'new' | 'revisit' | null; lastWarmup: string | null; warmups: number }
```

**One-off move (`lessonVersion` + 1):**
- Each `lastRead[id]` becomes `{ reads: 1, lastRead, rest: 3, q: 1 }`, since the old question was asked.
- The current `passageId` with `days` becomes `reads = days`.
- `lastWarmup` = the old `lastDay` if `days ≥ 1`.
- `passageId`, `days` and `extra` are dropped.
- Recordings and the Listen & confirm queue are unchanged. `prompt.passageId` values stay valid, because the old IDs are kept.

**Misreads:** `applyMisreads` keeps marking priority words. `addExtraDay` and `extraDayGiven` are replaced by "rest → 3 days". `extraDayGiven` stays readable on old recordings.

**Auto-stop:** the 60 s read limit becomes `max(60, 0.8 s × characters)`, i.e. up to about 90 s for a 110-character chunk.

## 9. Parent view

The Reading texts tab gains a read-only **Library** list below his school texts. Each row shows:
- title, source (ZiJi / Global Storybooks), term;
- his fit now;
- reads, next due, or "retired";
- "often skipped".

The existing editor for his school texts is unchanged.

## 10. Testing

**Unit:**
- **Import:**
  - page parsing;
  - edits applied exactly once (a missing `from` fails);
  - chunking bounds;
  - a dropped story when under half its chunks survive;
  - every imported passage has a credit and licence;
  - a deterministic output snapshot.
- **Levelling:** term by the 92% rule, names excluded, the fit band, and K including class-lesson characters.
- **Content checks:**
  - own passages: coverage, ≤3 beyond-term characters, word gate, glosses present;
  - questions: count, valid answering sentence, all-or-none in passage, length spread, answer not in question.
- **Rotation:**
  - the 3-day gap, including the same day;
  - the rest ladder 3 → 7 → 18 → 45 → retired;
  - a miss resets to 3;
  - parent marks reset to 3;
  - new/revisit alternation;
  - story parts in order;
  - a parent text first;
  - an unrecorded 「读完了」 counts (cause 4);
  - a second lesson the same day gets a different passage.
- **下一篇:** 2 swaps then hidden, none after recording starts, none on a parent text, the skip gap, `skips` counted.
- **Questions:** asked in turn across reads, choices shuffled with the right index tracked.
- **Migration:** run once, the old cycle mapped, and a second run is a no-op.

**Rendered:**
- Listen with the credit line and picture.
- 「下一篇」 swaps the passage.
- The picture is gone on Question.
- The Library rows.

**WebKit:** Listen with the picture and 生词 strip, plus the credit line, at iPad and phone sizes (`fit-check`).

## 11. Out of scope

- Global Storybooks' **native audio** as the model voice. The model stays the iPad voice (parent, 2026-10-12).
  - Worth a later look: the active ingredient is a good prosodic model.
  - But the audio is per page, while chunks and edits are per sentence.
- **Other sources.** StoryWeaver (Pratham Books) is all CC BY 4.0 with Chinese (Simplified) titles at levels 1–4. It is distributed as ePub/PDF with no plain-text repository, so it is not imported here.
- 看图说话. Speech-recognition scoring. Tap-to-gloss on every word: only the 生词 strip.
- Parent editing of library passages.

## 12. Decisions for the parent

Each has a recommendation. Under the autonomy rule (2026-10-07), the recommendation stands unless the parent says otherwise.

| # | Question | Recommendation |
|---|---|---|
| D1 | Include the 11 **CC BY-NC** Global Storybooks stories? | **Yes.** ZiJi is free and non-commercial, and these are the easiest stories (mostly L1, e.g. 0271 两个 at 100% by 二下). Each is tagged with its licence, so they can be dropped if ZiJi is ever charged for. |
| D2 | How much to edit Global Storybooks text? | **Light only:** Singapore usage (一点儿 → 一点), typos, and the wrong-script 馬. Keep the African names: they are marked, always shown with pinyin, and left out of the level count. Mark the story 「有改动」. |
| D3 | Show Global Storybooks pictures? | **Yes, one per passage**, vendored (~1.2 MB), shown on Listen and Read and hidden on the question. |
| D4 | How many of our own passages? | **40 new:** 二上 12, 二下 16, 三上 12. Each reuses its term's school characters. Plus the existing 20. |
| D5 | 「下一篇」 limits | **2 swaps a step, only before recording, never on his school texts.** |
| D6 | Rest schedule | **No repeat within 3 days.** Rest grows 3 → 7 → 18 → 45 days when read well, back to 3 on a miss or ≥2 parent marks, and retired after that. |
| D7 | A second lesson, or 多读一遍, on the same day | **A different passage.** Repeated reading comes from spaced revisits, not same-day repeats. |

**Decided (parent, 2026-10-15):** all seven recommendations approved as written: D1 include the CC BY-NC stories, D2 light edits only, D3 one picture per Global Storybooks passage, D4 40 new passages of our own (二上 12, 二下 16, 三上 12), D5 2 swaps a step before recording and never on his school texts, D6 the rest schedule (no repeat within 3 days; 3 → 7 → 18 → 45, then retired), D7 a different passage on the same day.
