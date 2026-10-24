# 朗读 that stretches him — design

*2026-10-24. The parent reported that the passages are too easy to read (b) and the questions too easy (c); the length is fine. The parent approved the direction: a harder level, new passages a term or two ahead, three harder and varied questions per read, fewer repeats, and per-type results shown to the parent. Added the same day: "Slow down the reading speed on the first read as well, it's too fast." This builds on the 朗读 content spec (2026-10-15), which stays in force except where this one says otherwise.*

## 1. What is wrong today

Read from origin/main:

1. **The level is easy by design.** `pickOrder` (`src/langdu/pick.ts`) picks passages where 90–97% of the characters are readable, aiming at 93% (`BAND_LOW` / `BAND_HIGH` / `BAND_AIM`). "Readable" means characters he knows, plus all the 识读字 of his book up to his class lesson (`readerAt`).
2. **Too few, too close to his class.**
   - The library holds 73 own passages and 15 Global Storybooks chunks.
   - Built-in passages are offered at most one term past his class term (`withinReach`).
   - The own passages run 32–110 characters and are mostly simple scenes.
3. **One easy question per read.**
   - Each own passage has 2 hand-written questions (`passageQuestions.ts`). He gets one per read, alternating.
   - Each question has 3 choices and is mostly 谁 / 哪里 / 什么, answered by one sentence.
   - The 15 storybook chunks have none.
4. **Repeats by design.** The rest ladder is 3 → 7 → 18 → 45 days, then retire. A good read climbs one step and a miss resets to 3, so a well-read passage still returns after 3 and 7 days.
5. **The model reads at normal speed** (`voice.json`: sentence speed 1), sentence after sentence with no pause, which is too fast for a first listen.

## 2. Goals and non-goals

**Goals:**
- Passages at a stretch level, with a library deep enough that he rarely meets one twice.
- Three questions per read, mostly beyond plain recall, which a guess or a scan for matching words can't pass.
- A slower first listen.
- The parent sees which question types he misses.

**Non-goals:**
- Longer passages: the length is fine.
- Speech recognition or scoring his reading.
- Changing parent-added school texts (`pp:`) beyond the question format they may use.

## 3. A stretch level

- **New band:** 85–92% readable, aiming at 88% (`BAND_LOW` 0.85, `BAND_HIGH` 0.92, `BAND_AIM` 0.88). A passage above 92% is "easy" and comes only when nothing in the band is left, as "easy" passages do now.
- **Reach:** built-in passages up to **two** terms past his class term (`withinReach`).
- **Support for the unknown 8–15%:**
  - Pinyin over characters he can't read stays as now (the pinyin fade shows it for characters outside his readable set).
  - Each passage's 生词 (at most 4) keep their kid gloss under the title.
  - The first listen comes before he reads, as now.
- **A floor:** a passage under 85% is never offered unless it is a parent text.

## 4. New passages

**60 new own passages**, written for the app at build time like the existing own passages (content spec §2.2), with these changes:
- **Terms and counts:** 二下 15, 三上 25, 三下 20.
- **Length:** 80–140 characters, 4–8 sentences.
- **Kinds of text:**
  - about half short stories with a problem and how it is solved;
  - a quarter simple factual pieces (animals, plants, weather, Singapore places and festivals);
  - a quarter fables or everyday scenes with a lesson.
- **Connected sentences:** each passage uses at least two linking patterns from 因为…所以, 虽然…但是, 先…然后…最后, 如果…就, 一边…一边, 不但…而且.
- **Checks** (`scripts/check-content.ts`, extended):
  - the term rule (content spec §3);
  - at most 4 生词;
  - the word gate, no 儿化, no duplicates;
  - each passage's fit for a reader at its own term lies in 0.80–0.95.

The existing 88 passages stay, and with the new band most of them become "easy" for him. They remain in the library for his nephew's level and as a fallback.

## 5. Harder, varied questions

**The shape changes.** `PassageQuestion` becomes:
- `{ q, choices: [4 strings], answer: 0|1|2|3, kind, sentence? }`
- `kind` is one of:
  - `'why'`: a reason or feeling that is never stated in one sentence;
  - `'word'`: what a word means in this passage;
  - `'order'`: what happened first, next or last;
  - `'main'`: the main idea or the best title;
  - `'fact'`: who, what or where, answered by one sentence.
- `sentence` is required for `fact`, `word` and `order`: the sentence read again after a miss. For `why` and `main`, a miss reads the two sentences that support the answer (`sentences: [i, j]`) instead.

**How many per passage:**
- **Own passages and storybook chunks:** 6 questions, at least one of each kind except `fact`, and at most 2 of `fact`.
- **Per read:** 3 questions. Each read's set takes kinds not used in the previous read where it can. It holds at most one `fact`, and never repeats the set of the previous read of that passage.
- **Parent texts:** keep their own question (any number from 0 to 3), with 3 or 4 choices.

**Guess-proof rules**, checked by `scripts/check-content.ts`:
- All 4 choices are about the passage. Each wrong choice names something in the passage (a person, thing or event), so matching words to the text doesn't single out the answer.
- Choice lengths are within 3 characters of each other.
- No characters of the answer appear in the question.
- The answer is never the passage's most frequent word.
- Within a passage, the answer position is spread across 0–3 (no position more than twice in 6).
- A `why` or `main` answer is not a copy of any one sentence: it shares at most 60% of its characters with any single sentence.

**Questions for the existing passages:** all 73 own passages and 15 storybook chunks get 6 new questions in the new shape. The current 2-question entries are replaced.

**In the step (`LangduStep`):**
- After reading, the three questions come one at a time, each with 4 shuffled choices.
- A miss shows the answer and reads its sentence or sentences again, then moves on. There is no re-ask.
- 「读的时候想一想」 before reading shows the first question only.

**How a read is judged (`readHow`):**
- **'well':** at least 2 of the 3 right.
- **'not-well':** 0 or 1 right.
- **'extra':** 多读一遍, unchanged.

## 6. Fewer repeats

- **Rest ladder:** a read judged 'well' rests **21** days, then 45, then retires. A 'not-well' read rests 3 days, so he re-reads what he struggled with, as now.
- **Fresh first:** a new passage in the band always comes before a due revisit, except a due 'not-well' passage, which comes first.
- **Alternation:** the fresh/due alternation (`lastKind`) applies only to 'not-well' revisits.
- **Unchanged:** the 3-day gap (`GAP_DAYS`), story parts in order, and 下一篇 swaps.

## 7. A slower first listen

- **First read-through:** the model reads at **0.8×** speed with a **700 ms** pause between sentences (`MODEL_RATE` = 0.8, `SENTENCE_GAP_MS` = 700).
- **Tap-to-replay** of a single sentence, and the miss read-back after a question, use 0.9× with no gap.
- **How:**
  - Passage sentences are played through `speak()`, which gains an optional `rate`.
  - For recorded clips it sets `HTMLAudioElement.playbackRate`, with `preservesPitch` true (Safari's default), so the voice keeps its pitch.
  - For speech-synthesis fallback it sets the utterance `rate` to the same factor times its usual rate.
  - Other speech in the app is unchanged.
- **开始朗读:** it still comes alive once the first sentence has been read, or after 10 s.

## 8. What the parent sees

**Library list (`LibraryList`):** each passage's last read shows `Qs 2/3`. A line under the list gives, for the last 14 days, his right share by kind:
- 「为什么 4/7 · 词义 5/6 · 顺序 3/5 · 主要意思 2/4 · 事实 6/6」
- The weakest kind is marked.

**Data:**
- `PassageHistory` gains `answers: { kind, correct, at }[]`, keeping the last 30.
- No DB version change: history lives in kid state.

## 9. Testing

| Area | Tests |
|---|---|
| Picking (`pick.test.ts`) | • 0.85–0.92 band, aim 0.88. <br>• Two terms of reach. <br>• Under 0.85 never offered (a parent text is). <br>• Fresh before due, except a due 'not-well' passage. |
| Rest | • 'well' → 21, 45, retire. <br>• 'not-well' → 3. |
| Question sets (`questions.test.ts`) | • 3 per read. <br>• Kinds spread, at most one `fact`. <br>• Never the previous read's set. <br>• Parent texts keep theirs. |
| Content checks | • Every own passage and chunk has 6 questions in the new shape. <br>• Every guess-proof rule. <br>• New passages' term, length, linking patterns and fit window. |
| LangduStep | • Three questions in turn. <br>• Miss read-back (one or two sentences). <br>• 'well' at 2 of 3. <br>• Answers recorded with kind. |
| Speech | • `speak({ rate })` sets `playbackRate` on clips and `rate` on utterances. <br>• The model reader's first pass waits 700 ms between sentences at 0.8. <br>• Replay at 0.9. |
| Parent | • `Qs 2/3`. <br>• The by-kind line and the weakest kind. |
| Stage cases, WebKit | • A 140-character passage on Read at every size. <br>• The 4-choice question with the two-sentence read-back sheet. |

## 10. Out of scope

- Re-recording passage audio at a slower synthesis speed. Playback rate is enough, and its value is easy to change later.
- A parent control for the speed or the band.
- Passages beyond 三下, and a reading-age or Lexile-style measure.
