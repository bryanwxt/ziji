# 练一练 that really tests — design

*2026-10-23. Parent report the same day: earlier words "didn't really seem to be tested outside 写一写", and he is "just blindly guessing at the 组词". Approved direction: earlier words first, from memory where it counts, 组词 that can't be guessed, and the evidence shown to the parent. The 朗读 passages and their questions are a separate project, designed after this one.*

## 1. What is wrong today

Read from origin/main (2fb03e9 + #43):

1. **Earlier words lose the time box.** `buildRound` (`src/session/round.ts`) prefers a word *already climbing* that is due again over the next first appearance. On a day with 12 list words at 3 appearances each, the new words' 2nd and 3rd appearances keep jumping ahead of due revision's first appearances. When 练一练's time box ends (`runner.ts`, `practiceTimeBoxMs`), what is cut is the revision.
2. **When an earlier word does come, it is often the easiest question.** A revision word starts at its best rung + 1, but a word whose reading card is due is asked at rung 1: pick the pinyin, or hear it and tap it.
3. **Outside 写一写, nothing is produced.** Every 练一练 question is a tap among 2–6 choices or an arrangement of given tiles. Writing from memory (hanzi-writer quiz, strokes checked) exists only in 写一写, and only for write cards that happen to be due.
4. **The single-character 组词 gap can be guessed by familiarity.** For `＿划` the wrong choices are same-sound characters from his whole word pool, many of which he has never begun. The one he recognises is the answer, so he can pick it without knowing the word. 都不对 (one in five, `noneOfThese.ts`) helps but does not fix it.
5. **A fast tap counts like a thought-through one.** A right tap in 400 ms is rated the same as one in 3 s. The only time rule is "slow → Hard".
6. **The parent can't see it.** No screen shows, per word, whether he got it right from memory or only by tapping.

## 2. Goals and non-goals

**Goals:**
- Every earlier word due today gets its first question before any new word's repeat.
- Some earlier words each lesson are tested from memory, by writing.
- 组词 gaps can't be passed by recognising the one familiar character.
- A tap too fast to have read the question is not counted as knowing.
- The parent sees, per word, from-memory results against tap-only results.

**Non-goals:**
- The 朗读 passages and their questions: the next project.
- The number of new words in 认新字: fixed in #43.
- Typing, pinyin input, or speech recognition: he is 7, on an iPad.
- A longer lesson. 练一练's time box is unchanged; what yields is new words' extra repeats.

## 3. Earlier words first

**Round order (`buildRound`).** Each pick's preference becomes:
1. a **due** revision word's first appearance;
2. a climbing word's **second** appearance, when its gap allows;
3. the next other first appearance (new words, non-due revision);
4. a climbing word's third and later appearances;
5. the soonest-due waiting word;
6. the same word again.

*(Amended 2026-10-23 at planning: ranking every repeat above new words' first appearances made a 5-minute box cut new words' first appearances on a 12-word day. Only the second appearance keeps that rank; third and later appearances are what time cuts.)*

Words missed in 认新字 (`early`) keep their place at the front. Spacing still holds: a word never comes back sooner than its gap allows, so a new word's 2nd appearance waits behind the due revision rather than being lost.

**What the time box cuts.** It is unchanged in length. With this order, the items left when it ends are new words' later appearances and non-due revision. `practiceLeft` still counts due first appearances not reached. These should now be rare: only a day with more due revision than fits.

**Test:** 12 new words and 10 due revision words in a 5-minute box. All 10 due first appearances come before the 13th item at the latest. The cut falls on new words' 3rd appearances.

## 4. From memory: 默写 in 练一练

**New ask `recall` (默写).** He hears the 组词 (「草地的草」), sees it with the character gapped (`＿地`), and writes the character on a hanzi-writer quiz canvas.
- No outline, and no pinyin of the target. A 🔊 button replays the cue.
- The cue is `writingCue` (`src/activities/writing/cue.ts`), the same one 写一写 uses. It falls back to a gapped sentence when the character has no 组词.
- A hint (first stroke shown) comes after 2 misses. A hinted answer is not right.
- **Right** = finished with at most 1 miss and no hint.

**Who gets it.** Revision words only, never a word introduced today. Each must be one of:
- a character he has begun whose **write** card exists (he is meant to write it: 写字表 or a list word); or
- a 词语 all of whose characters qualify. He writes the character the cue gaps, one character per item.

It is never given to a word written in 写一写 today, and never to a word with no write card (read-only 识字 characters, §5 covers those).

**How many.** `RECALL_PER_LESSON` = 3 under 20 minutes, 4 at 20 or more. They are chosen from today's due revision words in this order:
1. words whose last right answer was a tap, not a production, oldest first;
2. then words whose write card is due;
3. then any eligible word.

On a day with fewer eligible words, fewer are asked.

**Where it sits.** A recall item replaces that word's first appearance in the round. It is placed by the same order as §3, so it is never the item the time box cuts. It is timed inside the box. At about 40 s each, 3–4 items take 2–3 minutes. The minutes come from new words' later repeats, which §3 already moves to the end.

**What it grades.**
- **The word's write card:** rated by `recordWriting`'s rule (0 misses Good, 1–3 Hard, more Again). When that card was already rated today, a miss only brings it forward.
- **The word's due reading card:** a right recall counts as its answer for today (Good: it is produced). A wrong recall rates it Again. Without this, the same word would be asked again by tap.
- **The word's due meaning card:** credited as 写一写's written 组词 already is (`meaningCredit`/`recordWrittenMeaning`), when the cue was a 组词.
- **Its write pass:** set by `settleRung` as in 写一写. That makes the word *produced*, so later right taps rate Good (`toRating`).

**写一写 that day.** A character recalled in 练一练 is not picked again in 写一写 (`pickWriteUnits` excludes it). That keeps one write per character a day.

**If stroke data can't load** (offline, uncached): the item falls back to that word's normal first question. The stroke files are already prefetched for the lesson's words; recall words are added to the prefetch.

## 5. 组词 gaps he can't guess

This applies to the 'word' ask for a single character (`FlashcardStep`, `pickSoundAlikes`).

- **Every choice is a character he has begun** (`begunChars`), so familiarity can't single out the answer. When fewer than 3 begun characters qualify, the choices fill from his level as now.
- **Up to 2 choices are look-alikes** (`lookAlikeChars`, `src/activities/components/zibian.ts`): characters sharing a non-trivial component, such as 草/早/苹. The rest are same sound, then same initial, as now.
- **No choice may make a word with the cue.** The checks are HSK words, his own word list, and the built-in 组词. These are the checks used now, plus his own list.
- **6 choices for a revision word** when 5 qualify, else 4. Today's new words keep 4.
- **都不对 is unchanged**: one in five, never on a first question or a new word.

The same begun-characters rule applies to multi-character 词语 gaps where his pool allows, through the existing `ownNear` tier first.

**Test:** with 草 begun and the cue `＿地`, the choices are all begun characters, at least one a look-alike, and none makes a word with 地.

## 6. Too fast to count

`GUESS_MS` = 900. A right tap on a choice question (not 连一连, 组句, or the 都不对 answer, which take longer anyway) faster than 900 ms after the choices appear:
- is rated **Hard**, whatever `produced` is;
- does not settle a rung (the word doesn't climb on it);
- after the second one in a lesson, makes Truffle say 「慢慢看，想好再点」 once. No penalty, no timer shown.

A wrong tap is unchanged (Again). 900 ms is under any honest read of a 4-choice item for a 7-year-old. A guard measured on his own answers is out of scope.

## 7. What the parent sees

**Words panel, each word** (parent area, under the existing word row): a small line for the last 14 days.
- 「默写 ✓ 10/22 · 点选 ✓✓✗」: the last from-memory result with its date, then up to 5 latest tap results.
- Marked **「只点选」 (tap only)** when it has right taps but no right production in that time.
- Production here means a right 默写 (练一练 or 写一写 recall), or a confirmed 说一句 or Say.

**Progress, this week:**
- 「从记忆写出：18 个旧字，14 个写对」 (from memory: 18 earlier words, 14 right);
- the count of words marked 只点选, with a link to them.

These are read from the existing review and answer logs. A new log `source: 'recall'` on write logs written by §4 lets them be told apart from 写一写's.

## 8. Data and versions

- New `Ask` value `'recall'`. Its rung is that of the item it replaced (it doesn't climb the ladder itself).
- New `ReviewLog.source` value `'recall'`. No DB version change, since `source` is an optional string already.
- Settings: none. It is on whenever 写一写 is on (`settings.activities.writing`). With writing off, no recall items are asked and §5–§7 still apply.

## 9. Testing

| Area | Tests |
|---|---|
| Round order (`round.test.ts`) | • Due first appearances before new words' repeats. <br>• Spacing still holds. <br>• The cut falls on new repeats. <br>• `early` first. |
| Recall picking (`plan.test.ts`) | • 3 / 4 by minutes. <br>• Only revision words with a write card. <br>• Tap-only words first. <br>• Never a 写一写 word today, never a new word. <br>• Writing off → none. |
| Recall grading (`record.test.ts`) | • Write card by misses. <br>• Reading card Good or Again. <br>• Meaning credit with a 组词 cue. <br>• The write pass makes later taps Good. <br>• Already rated today → bring forward only. |
| RecallQuestion component | • Cue audio and gap. <br>• No outline, no target pinyin. <br>• Hint after 2 misses counts wrong. <br>• Missing strokes → fallback. |
| 组词 choices (`meaning.test.ts`) | • Begun characters only, with fallback. <br>• Look-alikes up to 2. <br>• None makes a word with the cue. <br>• 6 for revision, 4 for new. |
| Guess guard (`scheduler.test.ts`, `record.test.ts`) | • 899 ms right → Hard, no rung. <br>• 901 ms → as now. <br>• Excluded asks. <br>• The nudge once after two. |
| Parent | • Word line and 只点选 mark. <br>• The week line counts recall logs. |
| Stage cases, WebKit sweep | • The recall item and the 6-choice gap at every viewport. |

## 10. Out of scope

- 朗读 passages and questions: the next project.
- A from-memory test for read-only characters (reading aloud, checked by ear): not without speech recognition. §5's hardened gap is their test.
- A monthly independent check: still on the list.
