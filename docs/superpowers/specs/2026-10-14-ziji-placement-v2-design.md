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

## v2.1: harder to guess (2026-10-15, parent-approved)

### Why

- v2 placed him at 三下, with 1,017 characters assumed, after 14 questions. An earlier, longer check had placed him at 一上.
- Likely causes:
  - 3 right of 3 moved him up a term. A guesser on 4 options passes a v2 term about 5% of the time (3 of 3, or 3 of 4).
  - Characters were picked at random from the whole term, so they were often its easiest, most frequent ones.
  - 读一读's wrong readings could often be ruled out by sound or tone pattern.

### The walk (replaces "Questions per term", "Moving between terms" and the 15 cap)

- **4 questions a term.**
  - 4 of 4 right: up a term.
  - 2 or fewer right: down a term.
  - 3 of 4: one more question in the same term, and it decides. 4 of 5 is up; 3 of 5 is down.
  - 不知道 still counts as a miss.
- **At most 20 questions.** At the cap, the result is the highest term passed so far.
- **Unchanged:** the steps are the six terms; the walk starts one term below his class term; it ends at the first turn or off either end.

### Harder characters

- **What a term asks:** the later half of the term's characters by book order (MOE lesson order within the term).
  - Within that half, only characters beyond HSK 1, the less frequent ones.
  - If fewer than 24 are left (一上 has few), the book's latest HSK 1 characters top the pool up to 24.
- **Never asked:**
  - a character he could know from a part alone: one that is its own radical (口 木 火), has no parts (九), or is itself a part of 5 or more built-in characters (大 小 门);
  - a character read in 轻声.
- Each term's pool has 24 to 81 characters (`askable` in `src/placement/questions.ts`).
- **What a pass places is unchanged:** the whole term.

### Two harder question styles (replace v2's 读一读 distractors and the meaning 听一听)

- **读一读, near misses.** He sees the character and picks its reading from 4 that differ only in tone or initial.
  - The 4 readings form a 2×2: two near initials (l/n, b/p, z/zh, j/q/x…) by two tones, e.g. lì lí nì ní.
  - So every option shares its initial with one other option and its tone with one other. No option stands out.
  - (lì lǐ lí nì would give the answer away: it is the only option that shares its tone with the odd initial.)
  - With no near initial that makes a real syllable, the 4 options are the syllable's four tones.
  - Another reading of the character is never offered as wrong.
- **听一听, hear it and find it.** Truffle says the character at its card reading. He picks it from 4 characters that share one part.
  - Truffle reuses `speak` with the reading. A bound character is said as its pair (蚂 → 蚂蚁), and an unsure one as its word.
  - All 3 look-alikes share the same part with the answer (跑 → 跳 踢 路, all 足). So the answer is never the one in the middle, linked to each of the others by a different part.
  - All 4 options sound different. Three 马 characters said "ma" would give away 骑.
  - Look-alikes are characters he meets: from his book (up to the next term first) or HSK 1–2. Never an obscure character he would rule out on sight.
  - Strokes and bare enclosures (丿 冂 冖…) don't count as a shared part.
  - Never a character of the word Truffle says it in.
  - The source is the built-in radical and component data, the same data the flashcards' look-alikes use.
- **A term's styles:**
  - With a voice: 2 读一读 and 2 听一听 in a random order; the fifth question is either style.
  - Without a voice: 读一读 only.
  - If a character has no 3 look-alikes, another character is asked; if none has, the question becomes 读一读.
- **Both styles test reading,** so a right 听一听 answer is placed and a missed one is not. v2.1 asks no meanings, so the check makes no hear guesses (`heardIds` stays for older callers).

### A big jump waits for the parent

- **When:** the result is more than one term above his class term, or more than one term above his earlier result.
  - The earlier result counts only when that check asked something. A skip doesn't count.
- **The result screen shows a grown-up sheet first,** and nothing is saved yet. It has a child line, 「请爸爸妈妈来看一看！」, then: "This says 三下 — that's well above his class (二下). Use it, or keep his earlier result?"
  - It also says how many characters it would assume.
- **Use 三下:** asks for the parent PIN (the same hash check as the parent area's `PinGate`) when one is set.
- **Keep:** never asks for the PIN, because it can only place less.
  - On a re-run, his earlier result stays exactly as it was. Nothing is saved.
  - On a first check with no earlier result, he is placed up to his class term. He passed it on the way up, because the walk climbs one term at a time. The button reads "Start at his class (二下)".

### Result screen on phones

- The words sit in a scroll area if they must, and 开始！ always sits below them, on screen. At iPhone SE and iPhone 15 everything fits.
- Truffle is smaller on screens under 760px tall.
- The lines wrap only between whole phrases: 「你已经认识」「1031 个字了！」, then 「读到 三下 ·」「已测 16 个字，」「推定 1015 个」. A lone 「个」 can no longer end up on a line of its own.
- This is the screen's own layout. Label's app-wide punctuation grouping is a separate change.

### Simulated (20,000 walks each, `src/placement/walk.sim.test.ts`)

- **The model:**
  - A child who reads up to term L knows an asked character of a term at or below L 90% of the time, of the next term 35%, and of any later term 10%.
  - What he doesn't know, he guesses: right 1 time in 4.
  - The walk starts at 二上 (a P2 child in 二下).
- **Results:**

| Child | Placed | Questions (median · p10–p90 · max) |
|---|---|---|
| Reads to 一上 | 一上 73.1%, 一下 19.3% (**92.4%** at 一上 or 一下); none 3.5%; 二上 4.0%; 二下 0.2% | 12 · 9–13 · 18 |
| Random guesser | none 95.6%; passes a term **1.50%** of the time (v2: about 5%) | 12 · 12–13 · 15 |
| Reads to 二下 | 二下 72.6%, 三上 17.7%, 二上 4.5%, 一下 4.3% | 13 · 12–17 · 20 |
| Reads to 三下 | 三下 81.9% | 17 · 12–18 · 20 |

- A typical walk takes 12–13 questions; a strong reader takes up to 20.
- The guesser's per-term pass rate is exactly 0.25⁴ + 4·0.25³·0.75·0.25 = 1.56%.

### Testing (v2.1)

- **Walk:** 4 of 4 up; 2 or fewer down; 3 of 4 then a fifth decides; the cap of 20.
- **Simulation:** the thresholds above.
- **Questions:**
  - pools: later half, rarer, never standing alone;
  - 读一读: the 2×2 shape, never another reading;
  - 听一听: look-alikes share one part, sound different, come from characters he meets, and are never in the word Truffle says; bound characters;
  - styles with and without a voice.
- **apply:** a 听一听 answer counts as reading.
- **Screen:**
  - the parent's check on a big jump: the PIN is required to use it; keep on a re-run leaves his earlier result untouched; keep on a first check places up to his class term;
  - the result's phrases.
- **Fit sweep:**
  - `placement`: both question styles and the result at every size;
  - `placement-result`: the grown-up sheet, its PIN pad, and a 三下 result with the biggest numbers;
  - `placement-rerun`.

