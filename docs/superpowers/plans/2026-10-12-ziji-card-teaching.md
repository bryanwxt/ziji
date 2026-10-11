# Cards that teach: why-feedback, pinyin fading, word families — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wrong answer says *why* in one short line matched to the slip (the part that differs, the tone, the sound part, the radical's meaning), with the right characters first and their pinyin and English a second later; pinyin fades over characters he reads, with tap-to-peek; each new character shows its 「一家人」 of words he can read, and a 「找一家人」 question replaces up to two repetitive rung-2 items a lesson.

**Architecture:** Two pure helpers in `src/feedback/why.ts` (`differingParts`, `pinyinSlip`) feed three small sheet components in `src/ui/stage/WhyLine.tsx`, placed after `MeaningNote` in each wrong-answer sheet; `FeedbackSheet` marks a miss's detail so CSS fades its pinyin and English in 1 s late. Pinyin fading is a Preact context (`src/ui/pinyinFade.tsx`: `showPinyin`, `PinyinFade`, one peek at a time) that `Label` reads when a line opts in with `fade`; `SessionScreen` provides it from `know.knownChars` and `settings.fadePinyin`. Word families come from `src/content/family.ts` (`familyOf`); the board, distractors and question live in `src/practice/family.ts` and `src/activities/practice/FamilyQuestion.tsx`; `withFamily` (`src/session/practice.ts`) turns at most two rung-2 `word`/`pair` items into `family` items after the round is built, so the round's length and grading stay as they were.

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, pinyin-pro, tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`, `scripts/fit-check.ts`).

**Spec:** `docs/superpowers/specs/2026-10-12-ziji-card-teaching-design.md` (read it in full before Task 1).

## Global Constraints

- Right answers are unchanged: a cheer, and auto-advance (`AUTO_NEXT_MS`).
- Look-alike miss: both characters, the right one first; the parts in one and not the other, from `components` and `radical` at runtime; a differing radical with a meaning in `RADICALS` shows its icon and short meaning (「河 氵water · 何 亻person」). Pure `differingParts(a, b)` returns `{ right: string[]; picked: string[] }`; the trivial parts listed in `zibian.ts` are ignored; an empty result falls back to today's sheet.
- Pinyin miss (read mode): the right reading plays again; slip classes `tone` (「声调不同」, right and picked syllable, tone marks enlarged), sound-part trap (「<part> 读 <its pinyin>，<char> 读 <right pinyin>」, the part's reading as in `trapReadings`), `initial`/`final` (the differing letters highlighted), `other` (today's sheet).
- Meaning miss (English choices, 组词 gaps): today's sheet plus 「氵 → water」 when the target character has a meaningful radical.
- Character first: in every wrong-answer sheet the right answer's characters show at once; its pinyin and English fade in **1 s** later by CSS animation delay; `prefers-reduced-motion` shows them at once.
- `showPinyin(ch)` = his Read rung for `ch` has **not** passed (`know.knownChars`); hidden pinyin keeps its slot (`Label`'s `pinyinFor` mechanism).
- Tap to peek: a faded character shows its syllable for **3 s** (`PEEK_MS = 3000`) and is spoken; one peek at a time; a peek never grades.
- Never faded: pinyin answer choices; feedback sheets' answer lines (`MeaningNote`, why-lines); the new-word card's own pinyin (which appears **2 s** after the character); parent screens. A writing cue's gap keeps its pinyin.
- `settings.fadePinyin` (absent = on); Settings switch 「拼音渐隐 Fade pinyin」; off = today's always-on pinyin.
- `familyOf(ch, readable)`: words containing `ch` whose every other character is in `readable`, from the 组词 examples, the 词语 ladder and `wordsWithChar`, with a gloss; ordered by HSK level, then length; no duplicates, never the character alone.
- 「一家人」 row on the new-word card: up to **4** family words, each with a speaker button, pinyin per the fading rule; hidden when fewer than **2** qualify; after the 词语 rows, before the 成语.
- 「找一家人」: ask `'family'`, rung 2; prompt the character with 「哪两个词有『生』？」; **6** tiles = 2 family words + 4 distractors (a look-alike or sound-alike of the character instead, never the character); correct = both picks are family words; feedback = the two family words with English and pinyin, and on a miss the picked distractor's differing character highlighted with §3's look-alike rule; only for words with ≥ 2 readable family words and ≥ 4 distractors; at most **2 per lesson**, each replacing a rung-2 `word` or `pair` item of that word (round length unchanged); graded like other rung-2 questions, on the meaning card, once per lesson.
- No migration: `settings.fadePinyin` absent means on; saved lessons load as they are; `'family'` only appears in newly built rounds.
- TypeScript lib is ES2022: no `findLastIndex` / `toSorted`. `Array.prototype.at` and `??=` are fine.
- Screenshots in **WebKit** via playwright-core. If WebKit is missing a script exits 2: stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Out of scope: 朗读 as its own step (4b), homophone sorting drills, stars / Say cards / lesson length, recorded audio for new content.

## Rulings

- Ruling: `pinyinSlip(word: Word, picked: string)` takes the Word, not two readings — the sound-part class needs the character's components and the spec's `(right, picked)` has no character — cost if wrong: a rename at three call sites.
- Ruling: a part in `TRIVIAL` still counts when it is that character's own radical and `RADICALS` gives it a meaning (亻 of 何, 口 of 吗); other trivial parts (一 丨 丶 丿 乙 亅 二 十, and 口 人 亻 as non-radicals) are dropped — the spec's own example 「何 亻person」 needs 亻, which `TRIVIAL` lists — cost if wrong: one more set of parts shows on some sheets.
- Ruling: `differingParts` is empty when the two characters share no part (大 · 小) and for the same character; a part inside a shared part is not a difference (生 · 星 → `{ right: [], picked: ['日'] }`, not 生's 土) — "a look-alike miss" is defined by a shared part, and 土 inside the shared 生 teaches nothing — cost if wrong: a sound-alike pick with no shared part gets today's sheet.
- Ruling: the sound-part class is checked before tone (请 read qīng is 「青 读 qīng，请 读 qǐng」, not 声调不同) — it says more, and the tone is visible in it — cost if wrong: none for the child.
- Ruling: `initial` and `final` need the same tone and exactly one differing syllable; a word whose readings differ in two syllables, in syllable count, or in initial and final at once is `other` — the highlight must point at one place — cost if wrong: a few multi-slip picks get today's sheet.
- Ruling: the why-line sits after `MeaningNote` in the sheet (the right answer's own line stays first); in 钓鱼 a miss shows the look-alike line in place of the radical rows when it is not empty, else the radical rows as today; a 组词 gap shows the look-alike line when the pick shares a part, else the radical hint; the English choices show the radical hint for single characters only; a `fit` sentence shows the look-alike line only when the word and the pick are single characters — spec §3's lists — cost if wrong: one line moves.
- Ruling: the 1 s delay is a CSS rule on `.sheet__detail--later` (set by `FeedbackSheet` when `tone === 'oops'`) covering `.label__py`, `[lang="en"]` and `.later` inside the detail; the sheet's title is not delayed; the existing global `prefers-reduced-motion` rule (`* { animation: none !important }`) makes them show at once — one rule covers every wrong-answer sheet — cost if wrong: a CSS edit.
- Ruling: fading is opt-in per line (`<Label fade>`): the lines spec §4 lists — `UseQuestion`'s fit sentence and usage options, `BuildSentence`'s placed tiles, `UnderstandQuestion`'s revealed sentence, `PairGame`'s summary rows, `FlashcardStep`'s 组词/sentence cues and every `WordRow` on the new-word card (词语, usage line, 成语, 一家人), `WritingStep`'s gap cue. `MatchQuestion` and `IdiomQuestion` have no `Label` line today, so nothing changes there. Truffle's bubbles, sheet titles, `MeaningNote`, why-lines and the family question's prompt and sheet rows are not faded — cost if wrong: one prop per line.
- Ruling: a `Label` inside a button (usage options, placed 组句 tiles) fades but never peeks (`peek={false}`): a tap there answers or takes the tile back, as today; the speak button beside the usage option still reads it — "a peek never grades anything" — cost if wrong: he can't peek inside those two.
- Ruling: one peek at a time across the lesson screen; a new peek replaces the last and restarts its 3 s; a peek speaks `speak(ch, { reading: syllable })` — cost if wrong: none.
- Ruling: the set of characters he reads is `know.knownChars` loaded with the lesson, and `fadePinyin` is read from the stored settings at lesson load (not the app context's copy); a word passing Read mid-lesson fades from the next lesson — cost if wrong: one more lesson of pinyin over it.
- Ruling: family words come from the character's built-in 组词 examples, then the ladder's 词语, then `wordsWithChar` (HSK), with pinyin from that source (else `EXAMPLE_FIXES`, else pinyin-pro); ties after level and length keep that source order; only all-Han words of 2+ characters — cost if wrong: order of equal-level words.
- Ruling: the 「一家人」 row lists family words the card doesn't already show first, then ones it does, up to 4, and shows whenever `familyOf` has ≥ 2 — measured with the first 300 / 500 school characters known: 58 / 52 of the next 100 new characters get the row (28 at 150); leaving out words the card shows would give only 24 / 14 — cost if wrong: a word can appear both as a 词语 row and as a 一家人 chip.
- Ruling: the family question is for single characters only; its tiles are plain characters (no pinyin, like the other character choices); distractors are words of characters that contain the character (生 → 星 性), then `lookAlikeChars`, then the same toneless reading, at most two levels above it, words he can read first and one per swapped character first; the two family words are two of the first four — measured: ≥ 4 distractors for 148–150 of 150 recently learned characters, a question possible for 96 / 118 of 150 at 300 / 500 known — cost if wrong: weaker distractors on some boards.
- Ruling: `withFamily` takes the round's first eligible rung-2 `word`/`pair` items (not retries), two different words, never right after another family item (the type changes item to item); it runs on the built round before 钓鱼 and Say cards are added — cost if wrong: in some rounds only one family question (measured: seed 1 of the test round gives 1, seeds 2 and 5 give 2).
- Ruling: a missed family question is not asked again (like 钓鱼): a retry would be a third — "at most 2 per lesson" — cost if wrong: one fewer retry.
- Ruling: the family sheet shows the two family words after a right answer too, and still goes on by itself (spec §3: right answers auto-advance); a miss waits — cost if wrong: he has 1.4 s to read a right answer's words.
- Ruling: `planPractice` gains a last parameter `known: ReadonlySet<string> = new Set()` (empty: no family question) — cost if wrong: none.
- Ruling: WebKit gets five new stage cases (`why-look` 晴/睛, `why-pinyin` 请 read qīng, `fade-peek`, `intro-family` 生 with its 成语, `family` and its miss) checked for clipping at the four stage-case sizes; the fit sweep is unchanged and fit-checks any family question its practice flows meet — cost if wrong: a family question in a real profile is only fit-checked when the sweep's profile reaches one.

## Review Focus

1. He taps a faded character inside a 用对了吗 option: it answers that option (as today) and never peeks or speaks a syllable — test in Task 4 (`a faded character inside a usage option answers, never peeks`).
2. He taps two faded characters quickly: only the newest peek shows, and it stays its full 3 s (the first one's timer never hides it early) — test in Task 3 (`one peek at a time; a new one restarts the 3 s`).
3. The parent turned 拼音渐隐 off before a lesson: every syllable shows, in questions and the writing cue; a stored setting from before the switch (absent) fades — tests in Task 4 (`the writing cue fades a known character but keeps the gap's sound`, `with the switch off every syllable shows`).
4. A lesson saved with a family question resumes after his known characters changed (a reset, a deleted word) so no board can be built: the item is skipped, never a blank screen — test in Task 6 (`a family question that can no longer be built is skipped`).
5. He taps the same family tile twice, or taps fast: the second tap lets it go, and nothing is graded until two different tiles are picked — test in Task 6 (`a second tap on a picked tile lets it go; nothing is graded until two are picked`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/feedback/why.ts` (new) | `differingParts`, `pinyinSlip` | 1 |
| `src/activities/components/zibian.ts` | export `TRIVIAL`; `charsContaining` | 1, 6 |
| `src/activities/flashcards/pinyinTraps.ts` | export `soundParts`, `splitSyllable`; `trapReadings` uses `soundParts` | 1 |
| `src/ui/stage/WhyLine.tsx` (new) | `LookAlikeWhy`, `PinyinWhy`, `RadicalHint` | 2 |
| `src/ui/stage/FeedbackSheet.tsx` | `sheet__detail--later` on a miss | 2 |
| `src/activities/flashcards/FlashcardStep.tsx` | why-lines; fading; 2 s pinyin; `knownChars`; `familyRow`; 一家人 row | 2, 4, 5 |
| `src/activities/components/ComponentsStep.tsx` | 钓鱼's look-alike line | 2 |
| `src/activities/choose/UseQuestion.tsx` | fit look-alike line; fading | 2, 4 |
| `src/ui/pinyinFade.tsx` (new) | `showPinyin`, `PEEK_MS`, `PinyinFade`, `PinyinFadeContext` | 3 |
| `src/ui/Label.tsx` | `fade`, `peek`, hidden and peeked cells | 3 |
| `src/types.ts` | `Settings.fadePinyin` | 3 |
| `src/activities/practice/{BuildSentence,UnderstandQuestion,PairGame}.tsx`, `src/activities/writing/WritingStep.tsx` | fading | 4 |
| `src/app/SessionScreen.tsx` | `PinyinFade` provider; `knownChars` to the card; `known` to `planPractice` | 4, 5, 6 |
| `src/content/family.ts` (new) | `wordsAround`, `familyOf` | 5 |
| `src/practice/family.ts` (new) | `familyDistractors`, `familyBoard` | 6 |
| `src/activities/practice/FamilyQuestion.tsx` (new) | 找一家人 | 6 |
| `src/session/round.ts`, `src/session/practice.ts`, `src/session/runner.ts`, `src/activities/practice/PracticeQuestion.tsx` | ask `'family'`, `withFamily`, no retry, the question | 6 |
| `src/parent/SettingsPanel.tsx` | 拼音渐隐 switch | 7 |
| `src/styles.css`, `src/styles.test.ts` | why-lines, delays, peek, 一家人 row, family question | 2, 3, 5, 6 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | WebKit cases | 8 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (under heavy machine load a few slow rendered tests can time out — rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts too. Before Task 1: `ls node_modules/.bin/vitest` (run `npm ci` if it is missing).

---

### Task 1: Why a miss happened (pure)

**Files:**
- Create: `src/feedback/why.ts`
- Test: `src/feedback/why.test.ts`
- Modify: `src/activities/components/zibian.ts:10` (export `TRIVIAL`)
- Modify: `src/activities/flashcards/pinyinTraps.ts:18-21, 41-55` (export `splitSyllable`, `soundParts`)
- Test: `src/activities/flashcards/pinyinTraps.test.ts`

**Interfaces:**
- Consumes: `getCharInfo`, `hanChars` (`src/content`), `radicalMeaning` (`src/content/radicals`), `syllableTone` (`src/activities/flashcards/tones`).
- Produces: `TRIVIAL: ReadonlySet<string>` (zibian); `splitSyllable(base: string): [string, string]`; `soundParts(ch: string): { part: string; reading: string }[]`; `differingParts(a: string, b: string): { right: string[]; picked: string[] }`; `type PinyinSlip = { kind: 'tone'; right: string; picked: string } | { kind: 'soundPart'; part: string; partReading: string; char: string; right: string } | { kind: 'initial' | 'final'; right: [string, string]; picked: [string, string] } | { kind: 'other' }` (the `[initial, final]` pairs are the toned syllable cut after its initial); `pinyinSlip(word: Word, picked: string): PinyinSlip`.

- [ ] **Step 1: Write the failing tests**

Create `src/feedback/why.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeWord } from '../test/fixtures';
import { differingParts, pinyinSlip } from './why';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;

describe('differingParts: the part that tells two look-alikes apart (spec 2026-10-12 §3)', () => {
  it('same sounding part, another radical: the radicals differ (河 氵 · 何 亻)', () => {
    expect(differingParts('河', '何')).toEqual({ right: ['氵'], picked: ['亻'] });
    expect(differingParts('情', '请')).toEqual({ right: ['忄'], picked: ['讠'] });
    expect(differingParts('晴', '睛')).toEqual({ right: ['日'], picked: ['目'] });
  });
  it('the reverse swaps the sides', () => {
    expect(differingParts('何', '河')).toEqual({ right: ['亻'], picked: ['氵'] });
  });
  it('same radical, another sounding part: those differ (银 艮 · 铁 失)', () => {
    expect(differingParts('银', '铁')).toEqual({ right: ['艮'], picked: ['失'] });
  });
  it("one inside the other: only what the other adds, never the shared one's own parts (生 · 星 日)", () => {
    expect(differingParts('生', '星')).toEqual({ right: [], picked: ['日'] });
  });
  it('a difference only in trivial strokes falls back: nothing (未 · 末)', () => {
    expect(differingParts('未', '末')).toEqual({ right: [], picked: [] });
  });
  it('characters with no components, nothing shared, or the same character: nothing', () => {
    expect(differingParts('人', '入')).toEqual({ right: [], picked: [] });
    expect(differingParts('大', '小')).toEqual({ right: [], picked: [] });
    expect(differingParts('河', '河')).toEqual({ right: [], picked: [] });
  });
});

describe('pinyinSlip: what kind of pinyin slip (spec 2026-10-12 §3)', () => {
  it('tone: the same syllable with another tone, a 轻声 given its full tone too', () => {
    expect(pinyinSlip(w('请'), 'qìng')).toEqual({ kind: 'tone', right: 'qǐng', picked: 'qìng' });
    expect(pinyinSlip(w('妈'), 'mà')).toEqual({ kind: 'tone', right: 'mā', picked: 'mà' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rèn shí')).toEqual({ kind: 'tone', right: 'shi', picked: 'shí' });
  });
  it("sound part: the reading of the character's sounding part (请 → 青 qīng, 妈 → 马 mǎ), before tone", () => {
    expect(pinyinSlip(w('请'), 'qīng')).toEqual({ kind: 'soundPart', part: '青', partReading: 'qīng', char: '请', right: 'qǐng' });
    expect(pinyinSlip(w('妈'), 'mǎ')).toEqual({ kind: 'soundPart', part: '马', partReading: 'mǎ', char: '妈', right: 'mā' });
  });
  it('initial: the same final and tone, another initial', () => {
    expect(pinyinSlip(w('群'), 'cún')).toEqual({ kind: 'initial', right: ['q', 'ún'], picked: ['c', 'ún'] });
    expect(pinyinSlip(w('山'), 'sān')).toEqual({ kind: 'initial', right: ['sh', 'ān'], picked: ['s', 'ān'] });
  });
  it('final: the same initial and tone, another final', () => {
    expect(pinyinSlip(w('街'), 'jiā')).toEqual({ kind: 'final', right: ['j', 'iē'], picked: ['j', 'iā'] });
    expect(pinyinSlip(w('想'), 'xiǎn')).toEqual({ kind: 'final', right: ['x', 'iǎng'], picked: ['x', 'iǎn'] });
  });
  it('other: an unrelated reading, two syllables wrong, or a different number of syllables', () => {
    expect(pinyinSlip(w('河'), 'dà')).toEqual({ kind: 'other' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rén shí')).toEqual({ kind: 'other' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rèn')).toEqual({ kind: 'other' });
  });
});
```

Append to `src/activities/flashcards/pinyinTraps.test.ts` (and change its import line to `import { soundParts, trapReadings } from './pinyinTraps';`):

```ts
describe('soundParts (spec 2026-10-12 §3: the sound-part slip)', () => {
  it("the parts he might read instead, with their readings, never a side form or stroke", () => {
    expect(soundParts('静')).toEqual([{ part: '青', reading: 'qīng' }, { part: '争', reading: 'zhēng' }]);
    expect(soundParts('捡')).toEqual([{ part: '佥', reading: 'qiān' }]);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/feedback/why.test.ts src/activities/flashcards/pinyinTraps.test.ts`
Expected: FAIL — `Failed to resolve import "./why"` and `soundParts is not a function`.

- [ ] **Step 3: Export the shared pieces**

In `src/activities/components/zibian.ts`, replace line 10:

```ts
const TRIVIAL = new Set(['一', '丨', '丶', '丿', '乙', '亅', '二', '十', '口', '人', '亻']); // parts so common that sharing one says nothing
```

with:

```ts
export const TRIVIAL: ReadonlySet<string> = new Set(['一', '丨', '丶', '丿', '乙', '亅', '二', '十', '口', '人', '亻']); // parts so common that sharing one says nothing
```

In `src/activities/flashcards/pinyinTraps.ts`, replace:

```ts
function split(base: string): [string, string] {
```

with:

```ts
/** A toneless syllable's initial and final: zhang → ['zh', 'ang']; one with no initial has '' (an → ['', 'an']). */
export function splitSyllable(base: string): [string, string] {
```

and in `swaps`, replace `const [ini, fin] = split(base);` with `const [ini, fin] = splitSyllable(base);`.

Replace the comment line `/** His worksheet traps, in priority order: the phonetic part's reading, initial swaps, final swaps, 轻声 given full tone. */` with:

```ts
/**
 * The parts of a character whose reading he might say instead (静 → 青 qīng, 争 zhēng): never a radical side form (扌 isn't
 * read shǒu), a stroke or enclosure, the character itself, or a glyph pinyin-pro passes through. The traps' first tier, and
 * the sound-part slip on a pinyin miss (spec 2026-10-12 §3).
 */
export function soundParts(ch: string): { part: string; reading: string }[] {
  const out: { part: string; reading: string }[] = [];
  for (const part of getCharInfo(ch)?.components ?? []) {
    if (part === ch || SIDE_FORMS.has(part) || !/\p{Script=Han}/u.test(part)) continue; // a radical side form (扌, 氵…) is never what he misreads; the sounding part is
    if (STROKES.has(part)) continue; // strokes and enclosures (丿 冂 丨…) have dictionary names, not readings he'd say
    const reading = pinyin(part);
    if (reading && VALID.has(syllableTone(reading).base)) out.push({ part, reading }); // a real syllable, never a glyph pinyin-pro passes through
  }
  return out;
}

/** His worksheet traps, in priority order: the phonetic part's reading, initial swaps, final swaps, 轻声 given full tone. */
```

and inside `trapReadings`, replace the whole block

```ts
  if (chars.length === 1) {
    const info = getCharInfo(chars[0]!);
    for (const part of info?.components ?? []) {
      if (part === chars[0] || SIDE_FORMS.has(part) || !/\p{Script=Han}/u.test(part)) continue; // a radical side form (扌, 氵…) is never what he misreads; the sounding part is
      if (STROKES.has(part)) continue; // strokes and enclosures (丿 冂 丨…) have dictionary names, not readings he'd say
      const p = pinyin(part);
      if (p && p !== word.pinyin && VALID.has(syllableTone(p).base)) out.push(p); // a real syllable, never a glyph pinyin-pro passes through
    }
  }
```

with:

```ts
  if (chars.length === 1) for (const { reading } of soundParts(chars[0]!)) if (reading !== word.pinyin) out.push(reading);
```

- [ ] **Step 4: Write `src/feedback/why.ts`**

```ts
// Why a wrong answer was wrong (spec 2026-10-12 §3): the part that tells two look-alikes apart, and the kind of pinyin slip.
// Worked out at runtime from the content's components and radicals; the sheets in src/ui/stage/WhyLine.tsx show them.
import { getCharInfo, hanChars } from '../content';
import { radicalMeaning } from '../content/radicals';
import { TRIVIAL } from '../activities/components/zibian';
import { soundParts, splitSyllable } from '../activities/flashcards/pinyinTraps';
import { syllableTone } from '../activities/flashcards/tones';
import type { Word } from '../types';

/** A character's parts worth naming: its radical and components, never itself; a trivial part only when it is its meaningful radical (何's 亻). */
function partsOf(ch: string): string[] {
  const info = getCharInfo(ch);
  if (!info) return [];
  const out: string[] = [];
  for (const p of [info.radical, ...info.components]) {
    if (!p || p === ch || out.includes(p)) continue;
    if (TRIVIAL.has(p) && !(p === info.radical && radicalMeaning(p))) continue;
    out.push(p);
  }
  return out;
}

/**
 * The parts in one character and not the other (河 · 何 → 氵 · 亻). Nothing when they share no part (not look-alikes) or only
 * trivial strokes differ; a part inside a shared part is no difference (生 · 星 → only 星's 日).
 */
export function differingParts(a: string, b: string): { right: string[]; picked: string[] } {
  const pa = partsOf(a);
  const pb = partsOf(b);
  const inB = new Set([b, ...pb]);
  const shared = [a, ...pa].filter((x) => inB.has(x));
  if (a === b || !shared.length) return { right: [], picked: [] };
  const inside = new Set(shared.flatMap((s) => {
    const info = getCharInfo(s);
    return [s, ...(info ? [info.radical, ...info.components] : [])];
  }));
  return { right: pa.filter((p) => !inside.has(p)), picked: pb.filter((p) => !inside.has(p)) };
}

export type PinyinSlip =
  | { kind: 'tone'; right: string; picked: string }
  | { kind: 'soundPart'; part: string; partReading: string; char: string; right: string }
  | { kind: 'initial' | 'final'; right: [string, string]; picked: [string, string] } // the toned syllable cut after its initial
  | { kind: 'other' };

/** The kind of slip in a picked reading: one syllable wrong — the sound part's reading, its tone, its initial or its final. */
export function pinyinSlip(word: Word, picked: string): PinyinSlip {
  const right = word.pinyin.trim().split(/\s+/);
  const mine = picked.trim().split(/\s+/);
  if (right.length !== mine.length) return { kind: 'other' };
  const diff = right.flatMap((s, i) => (s === mine[i] ? [] : [i]));
  if (diff.length !== 1) return { kind: 'other' };
  const r = right[diff[0]!]!;
  const p = mine[diff[0]!]!;
  const chars = hanChars(word.text);
  const part = chars.length === 1 ? soundParts(chars[0]!).find((s) => s.reading === p) : undefined;
  if (part) return { kind: 'soundPart', part: part.part, partReading: part.reading, char: chars[0]!, right: r };
  const a = syllableTone(r);
  const b = syllableTone(p);
  if (a.base === b.base) return { kind: 'tone', right: r, picked: p };
  if (a.tone !== b.tone) return { kind: 'other' };
  const [ai, af] = splitSyllable(a.base);
  const [bi, bf] = splitSyllable(b.base);
  const cut = (s: string, n: number): [string, string] => [s.slice(0, n), s.slice(n)];
  if (ai !== bi && af === bf) return { kind: 'initial', right: cut(r, ai.length), picked: cut(p, bi.length) };
  if (ai === bi && af !== bf) return { kind: 'final', right: cut(r, ai.length), picked: cut(p, bi.length) };
  return { kind: 'other' };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/feedback/why.test.ts src/activities/flashcards src/activities/components`
Expected: PASS (the trap readings are unchanged; the existing `trapReadings` tests still pass).

- [ ] **Step 6: Commit**

```bash
git add src/feedback src/activities/components/zibian.ts src/activities/flashcards/pinyinTraps.ts src/activities/flashcards/pinyinTraps.test.ts
git commit -m "feat: why a miss happened — differing parts and pinyin slips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The why-line on every wrong-answer sheet, character first

**Files:**
- Create: `src/ui/stage/WhyLine.tsx`
- Test: `src/ui/stage/whyLine.test.tsx`
- Modify: `src/ui/stage/FeedbackSheet.tsx:61`
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (imports; the miss's `detail`)
- Modify: `src/activities/components/ComponentsStep.tsx` (the sheet's `detail`)
- Modify: `src/activities/choose/UseQuestion.tsx` (the sheet's `detail`)
- Modify: `src/styles.css` (append), `src/styles.test.ts` (append)
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`, `src/activities/components/ComponentsStep.test.tsx`

**Interfaces:**
- Consumes: `differingParts`, `pinyinSlip` (Task 1); `radicalMeaning`; `InkIcon`; `Label`.
- Produces: `LookAlikeWhy({ right: string; picked: string; fallback?: ComponentChildren })` → `<p class="why why--look" data-text="河 氵 water · 何 亻 person">` or `fallback`; `PinyinWhy({ word: Word; picked: string })` → `.why--tone` / `.why--part` / `.why--initial` / `.why--final` with `data-text`, or null; `RadicalHint({ text: string })` → `<p class="why why--radical" data-text="氵 → water">` or null; `FeedbackSheet` adds `sheet__detail--later` to its detail when `tone === 'oops'`; CSS class `later` (fades in with the detail's pinyin).

- [ ] **Step 1: Write the failing tests**

Create `src/ui/stage/whyLine.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { FeedbackSheet } from './FeedbackSheet';
import { LookAlikeWhy, PinyinWhy, RadicalHint } from './WhyLine';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
const why = (c: Element) => c.querySelector('.why')?.getAttribute('data-text');

describe('the look-alike line (spec 2026-10-12 §3)', () => {
  it('both characters, the right one first, each with the part only it has and a radical\'s meaning', () => {
    const { container } = render(<LookAlikeWhy right="河" picked="何" />);
    expect(why(container)).toBe('河 氵 water · 何 亻 person');
    expect([...container.querySelectorAll('.why__zh')].map((e) => e.textContent)).toEqual(['河', '何']);
    expect(container.querySelectorAll('.why__part svg')).toHaveLength(2); // the ink icons
  });
  it('a part with no meaning is still named, without English (银 艮 · 铁 失)', () => {
    const { container } = render(<LookAlikeWhy right="银" picked="铁" />);
    expect(why(container)).toBe('银 艮 · 铁 失');
  });
  it('nothing to tell apart: the fallback, or nothing', () => {
    expect(render(<LookAlikeWhy right="未" picked="末" />).container.innerHTML).toBe('');
    expect(render(<LookAlikeWhy right="大" picked="小" fallback={<i class="old" />} />).container.querySelector('.old')).toBeTruthy();
  });
});

describe('the pinyin line (spec 2026-10-12 §3)', () => {
  it('tone: 声调不同 with the right syllable and the picked one', () => {
    const { container } = render(<PinyinWhy word={w('请')} picked="qìng" />);
    expect(container.querySelector('.why--tone')!.getAttribute('data-text')).toBe('声调不同 qǐng qìng');
    expect([...container.querySelectorAll('.why__syl')].map((e) => e.textContent)).toEqual(['qǐng', 'qìng']);
  });
  it('sound part: 青 读 qīng，请 读 qǐng', () => {
    const { container } = render(<PinyinWhy word={w('请')} picked="qīng" />);
    expect(container.querySelector('.why--part')!.getAttribute('data-text')).toBe('青 读 qīng，请 读 qǐng');
  });
  it('initial or final: the letters that differ are marked', () => {
    const ini = render(<PinyinWhy word={w('群')} picked="cún" />).container;
    expect([...ini.querySelectorAll('.why--initial mark')].map((m) => m.textContent)).toEqual(['q', 'c']);
    const fin = render(<PinyinWhy word={w('街')} picked="jiā" />).container;
    expect([...fin.querySelectorAll('.why--final mark')].map((m) => m.textContent)).toEqual(['iē', 'iā']);
  });
  it('another slip: nothing (today\'s sheet)', () => {
    expect(render(<PinyinWhy word={w('河')} picked="dà" />).container.innerHTML).toBe('');
  });
});

describe('the radical hint (spec 2026-10-12 §3: a meaning miss)', () => {
  it('氵 → water for 河; nothing for a word, or a character that is its own radical', () => {
    expect(why(render(<RadicalHint text="河" />).container)).toBe('氵 → water');
    expect(render(<RadicalHint text="河流" />).container.innerHTML).toBe('');
    expect(render(<RadicalHint text="木" />).container.innerHTML).toBe('');
  });
});

describe('character first (spec 2026-10-12 §3)', () => {
  it("a miss marks its detail so the pinyin and English come 1 s after the characters; a right answer's does not", () => {
    const { container, rerender } = render(<FeedbackSheet tone="oops" title="慢慢来！" detail={<span>x</span>} actionLabel="继续" onAction={() => {}} />);
    expect(container.querySelector('.sheet__detail')!.classList.contains('sheet__detail--later')).toBe(true);
    rerender(<FeedbackSheet tone="good" title="真厉害！" detail={<span>x</span>} actionLabel="继续" onAction={() => {}} />);
    expect(container.querySelector('.sheet__detail')!.classList.contains('sheet__detail--later')).toBe(false);
  });
});
```

Append to `src/activities/flashcards/FlashcardStep.test.tsx`, and add to its imports `import { cardMeaning } from '../../content/glossary';` and `import { firstSense } from './distractors';`:

```tsx
describe('a miss says why (spec 2026-10-12 §3)', () => {
  it('find the character: the look-alike line, right one first', () => {
    const near = pool.filter((x) => [...'晴睛静精'].includes(x.text));
    const qing = near.find((x) => x.text === '晴')!;
    render(<FlashcardStep {...base} word={qing} pool={near} item={{ wordId: qing.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '睛' }));
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('晴 日 sun · 睛 目 eye');
  });
  it('read: the sound-part slip, and the right reading plays again', () => {
    const qing = pool.find((x) => x.text === '请')!;
    render(<FlashcardStep {...base} word={qing} item={{ wordId: qing.id, isNew: false, retry: false }} ask="read" voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'qīng' })); // his top trap is always offered
    expect(document.querySelector('.sheet .why--part')!.getAttribute('data-text')).toBe('青 读 qīng，请 读 qǐng');
    expect(speak).toHaveBeenLastCalledWith('请', { reading: 'qǐng' });
  });
  it('English choices: the radical hint', () => {
    render(<FlashcardStep {...base} item={review} ask="hear" voice onDone={vi.fn()} />);
    const answer = firstSense(cardMeaning(he)!); // the choices are English meanings
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choices--english .choice')].find((b) => b.textContent !== answer)!);
    expect(document.querySelector('.sheet .why--radical')!.getAttribute('data-text')).toBe('氵 → water');
  });
  it('the 组词 gap: a look-alike line when the pick shares a part, else the radical hint', () => {
    const xi = { ...makeWord('惜', { id: 'b:惜', pinyin: 'xī', meaning: 'to cherish' }), examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] };
    render(<FlashcardStep {...base} word={xi} item={{ wordId: 'b:惜', isNew: false, retry: false, mode: 'meaning' }} voice onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== '惜')!);
    expect(document.querySelector('.sheet .why--look, .sheet .why--radical')).toBeTruthy(); // 惜's 忄 has a meaning: never nothing
  });
});
```

In `src/activities/components/ComponentsStep.test.tsx`, replace the test `'a miss: Truffle reads the word, and the radical meanings of the right one and the chosen one show'` with:

```tsx
  it('a miss: Truffle reads the word, and the part that tells them apart shows (spec 2026-10-12 §3)', () => {
    const onAnswer = vi.fn();
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={onAnswer} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '跟' }));
    expect(onAnswer).toHaveBeenCalledWith(item, false);
    expect(speak).toHaveBeenLastCalledWith('树根');
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('根 木 tree · 跟 足 foot');
  });
```

and replace the test `'a chosen character with the same radical as the answer adds nothing: only the answer\'s radical shows'` with:

```tsx
  it('a chosen character with the same radical: its other part is the difference (银 艮 · 铁 失)', () => {
    const same = { wordId: 'p:3', word: '银行', index: 0, answer: '银', options: ['银', '铁', '根', '很'] };
    render(<ComponentsStep items={[same]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '铁' }));
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('银 艮 · 铁 失');
  });
  it('a catch keeps the answer\'s radical row', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    expect(document.querySelectorAll('.sheet .zibian__radical')).toHaveLength(1);
    expect(document.querySelector('.sheet .why')).toBeNull();
  });
```

Create `src/activities/choose/useQuestionWhy.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { UseQuestion } from './UseQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), reducedMotion: () => false }));

describe('选一选 with single characters says why (spec 2026-10-12 §3)', () => {
  it('a look-alike pick shows the part that differs', () => {
    const item = { kind: 'fit' as const, wordId: null, word: '晴', before: '今天是', after: '天。', options: ['晴', '睛', '请', '清'] };
    render(<UseQuestion item={item} kid={DEFAULT_KID} onAnswer={vi.fn()} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '睛' }));
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('晴 日 sun · 睛 目 eye');
  });
});
```

Append to `src/styles.test.ts`:

```ts
describe('cards that teach (spec 2026-10-12 §3)', () => {
  it("after a miss the right answer's characters show at once; its pinyin and English 1 s later", () => {
    expect(css).toMatch(/\.sheet__detail--later \.label__py, \.sheet__detail--later \[lang="en"\], \.sheet__detail--later \.later \{[^}]*animation: later-in 300ms ease-out 1s both/);
  });
  it('reduced motion shows them at once: every animation is off', () => {
    expect(reducedBlocks.some((b) => /\*, \*::before, \*::after \{ animation: none !important;/.test(b))).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/ui/stage/whyLine.test.tsx src/activities/flashcards/FlashcardStep.test.tsx src/activities/components/ComponentsStep.test.tsx src/activities/choose/useQuestionWhy.test.tsx src/styles.test.ts`
Expected: FAIL — `Failed to resolve import "./WhyLine"`, no `.why--look`, no CSS rule.

- [ ] **Step 3: Write `src/ui/stage/WhyLine.tsx`**

```tsx
import type { ComponentChildren } from 'preact';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { differingParts, pinyinSlip } from '../../feedback/why';
import type { Word } from '../../types';
import { InkIcon } from '../icons/InkIcon';
import { Label } from '../Label';

/** "河 氵 water": a character, then each part only it has, with a meaningful radical's English. */
const partsText = (ch: string, parts: string[]) => [ch, ...parts.map((p) => (radicalMeaning(p) ? `${p} ${radicalMeaning(p)!.en}` : p))].join(' ');

function CharParts({ ch, parts, right = false }: { ch: string; parts: string[]; right?: boolean }) {
  return (
    <span class={`why__char${right ? ' why__char--right' : ''}`}>
      <span class="hanzi why__zh">{ch}</span>
      {parts.map((p) => {
        const m = radicalMeaning(p);
        return (
          <span key={p} class="why__part">
            <b class="hanzi">{p}</b>
            {m && <><InkIcon name={m.icon} size={20} /><span lang="en">{m.en}</span></>}
          </span>
        );
      })}
    </span>
  );
}

/**
 * A look-alike miss (spec 2026-10-12 §3): both characters, the right one first, each with the part only it has — 「河 氵water ·
 * 何 亻person」. Nothing to tell apart (no shared part, or only trivial strokes): `fallback`, today's sheet.
 */
export function LookAlikeWhy({ right, picked, fallback = null }: { right: string; picked: string; fallback?: ComponentChildren }) {
  const d = differingParts(right, picked);
  if (!d.right.length && !d.picked.length) return <>{fallback}</>;
  return (
    <p class="why why--look" data-text={`${partsText(right, d.right)} · ${partsText(picked, d.picked)}`}>
      <CharParts ch={right} parts={d.right} right />
      <span class="why__dot" aria-hidden="true">·</span>
      <CharParts ch={picked} parts={d.picked} />
    </p>
  );
}

/** One syllable with its initial or its final marked: the letters that differ. */
function Marked({ kind, syl, right }: { kind: 'initial' | 'final'; syl: [string, string]; right: boolean }) {
  return <span class={`why__syl later${right ? ' why__syl--right' : ''}`}>{kind === 'initial' ? <><mark>{syl[0]}</mark>{syl[1]}</> : <>{syl[0]}<mark>{syl[1]}</mark></>}</span>;
}

/** A pinyin miss (spec 2026-10-12 §3): 声调不同, the sound part's reading, or the letters that differ; another slip, nothing. */
export function PinyinWhy({ word, picked }: { word: Word; picked: string }) {
  const slip = pinyinSlip(word, picked);
  if (slip.kind === 'tone') {
    return (
      <p class="why why--tone" data-text={`声调不同 ${slip.right} ${slip.picked}`}>
        <span class="why__label"><Label zh="声调不同" /></span>
        <span class="why__syl why__syl--right later">{slip.right}</span>
        <span class="why__syl later">{slip.picked}</span>
      </p>
    );
  }
  if (slip.kind === 'soundPart') {
    return (
      <p class="why why--part" data-text={`${slip.part} 读 ${slip.partReading}，${slip.char} 读 ${slip.right}`}>
        <span class="hanzi why__zh">{slip.part}</span><Label zh="读" /><span class="why__syl later">{slip.partReading}</span>
        <span class="why__dot" aria-hidden="true">，</span>
        <span class="hanzi why__zh">{slip.char}</span><Label zh="读" /><span class="why__syl why__syl--right later">{slip.right}</span>
      </p>
    );
  }
  if (slip.kind === 'initial' || slip.kind === 'final') {
    return (
      <p class={`why why--${slip.kind}`} data-text={`${slip.right.join('')} ${slip.picked.join('')}`}>
        <Marked kind={slip.kind} syl={slip.right} right />
        <Marked kind={slip.kind} syl={slip.picked} right={false} />
      </p>
    );
  }
  return null;
}

/** A meaning miss (spec 2026-10-12 §3): 「氵 → water」 for a single character whose radical (not itself) has a meaning. */
export function RadicalHint({ text }: { text: string }) {
  const chars = hanChars(text);
  const radical = chars.length === 1 ? getCharInfo(chars[0]!)?.radical : undefined;
  const m = radical && radical !== chars[0] ? radicalMeaning(radical) : undefined;
  if (!radical || !m) return null;
  return (
    <p class="why why--radical" data-text={`${radical} → ${m.en}`}>
      <b class="hanzi">{radical}</b>
      <span aria-hidden="true">→</span>
      <InkIcon name={m.icon} size={20} />
      <span lang="en">{m.en}</span>
    </p>
  );
}
```

- [ ] **Step 4: Mark a miss's detail in `FeedbackSheet`**

In `src/ui/stage/FeedbackSheet.tsx`, replace:

```tsx
            {detail && <div class="sheet__detail">{detail}</div>}
```

with:

```tsx
            {/* character first (spec 2026-10-12 §3): after a miss its pinyin and English fade in a second later (CSS) */}
            {detail && <div class={`sheet__detail${tone === 'oops' ? ' sheet__detail--later' : ''}`}>{detail}</div>}
```

- [ ] **Step 5: Put the why-lines on the sheets**

In `src/activities/flashcards/FlashcardStep.tsx`, add after the line `import { MeaningNote } from '../../ui/stage/MeaningNote';`:

```tsx
import { LookAlikeWhy, PinyinWhy, RadicalHint } from '../../ui/stage/WhyLine';
```

and replace:

```tsx
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : word.pinyin} picked={quiz.mode ? null : quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
            </>
```

with:

```tsx
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : word.pinyin} picked={quiz.mode ? null : quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
              {/* why (spec 2026-10-12 §3): English choices → the radical; the 组词 gap → the look-alike part, else the radical;
                  find the character → the look-alike part; its reading → the kind of pinyin slip */}
              {quiz.mode ? <RadicalHint text={word.text} />
                : quiz.cue ? <LookAlikeWhy right={word.text} picked={choice ?? ''} fallback={<RadicalHint text={word.text} />} />
                : quiz.listen ? <LookAlikeWhy right={word.text} picked={choice ?? ''} />
                : <PinyinWhy word={word} picked={choice ?? ''} />}
            </>
```

In `src/activities/components/ComponentsStep.tsx`, add after `import { MeaningNote } from '../../ui/stage/MeaningNote';`:

```tsx
import { LookAlikeWhy } from '../../ui/stage/WhyLine';
```

and replace:

```tsx
              <span class="zibian__why">
                <Radical ch={item.answer} />
                {/* the one he chose, when its radical tells them apart */}
                {!correct && getCharInfo(picked!)?.radical !== getCharInfo(item.answer)?.radical && <Radical ch={picked!} />}
              </span>
```

with:

```tsx
              {correct ? (
                <span class="zibian__why"><Radical ch={item.answer} /></span>
              ) : (
                // the part that tells them apart (spec 2026-10-12 §3); nothing to tell: the radical rows as before
                <LookAlikeWhy right={item.answer} picked={picked!} fallback={
                  <span class="zibian__why">
                    <Radical ch={item.answer} />
                    {getCharInfo(picked!)?.radical !== getCharInfo(item.answer)?.radical && <Radical ch={picked!} />}
                  </span>
                } />
              )}
```

In `src/activities/choose/UseQuestion.tsx`, add after `import { MeaningNote } from '../../ui/stage/MeaningNote';`:

```tsx
import { LookAlikeWhy } from '../../ui/stage/WhyLine';
```

and replace:

```tsx
                {!correct && <MeaningNote right={item.word} picked={item.kind === 'fit' ? choice : null} rightMeaning={item.kind === 'fit' ? item.meaning : undefined} />}
```

with:

```tsx
                {!correct && <MeaningNote right={item.word} picked={item.kind === 'fit' ? choice : null} rightMeaning={item.kind === 'fit' ? item.meaning : undefined} />}
                {/* single characters: the part that tells them apart (spec 2026-10-12 §3) */}
                {!correct && item.kind === 'fit' && choice && Array.from(item.word).length === 1 && Array.from(choice).length === 1 && <LookAlikeWhy right={item.word} picked={choice} />}
```

- [ ] **Step 6: Append the CSS to `src/styles.css`**

```css

/* Cards that teach (spec 2026-10-12 §3): the why-line after a miss, and the right answer's characters first — its pinyin and
   English 1 s later (the global reduced-motion rule turns the fade off, so they show at once) */
@keyframes later-in { from { opacity: 0; } to { opacity: 1; } }
.sheet__detail--later .label__py, .sheet__detail--later [lang="en"], .sheet__detail--later .later { animation: later-in 300ms ease-out 1s both; }
.why { margin: 0; flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; font-size: 18px; font-weight: 800; color: var(--ink); }
.sheet__detail .why .hanzi { font-size: 28px; }
.why__char { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.why__part { display: inline-flex; align-items: center; gap: 4px; color: var(--green-ink); }
.why__part b, .why--radical b { font-weight: 400; text-decoration: underline 3px var(--green); text-underline-offset: 5px; }
.why__dot { color: var(--muted); }
.why__syl { font-size: 28px; font-weight: 900; }
.why__syl--right { color: var(--green-ink); }
.why mark { background: var(--gold-soft); color: inherit; border-radius: 4px; padding: 0 2px; }
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/ui/stage src/activities/flashcards src/activities/components src/activities/choose src/styles.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ui/stage src/activities/flashcards/FlashcardStep.tsx src/activities/flashcards/FlashcardStep.test.tsx src/activities/components src/activities/choose src/styles.css src/styles.test.ts
git commit -m "feat: a wrong answer says why, characters first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pinyin that fades, with tap-to-peek

**Files:**
- Create: `src/ui/pinyinFade.tsx`
- Test: `src/ui/pinyinFade.test.tsx`
- Modify: `src/ui/Label.tsx` (whole file)
- Modify: `src/types.ts:274` (`Settings.fadePinyin`)
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `speak(text, { reading })` (`src/audio/speech`).
- Produces: `PEEK_MS = 3000`; `showPinyin(ch: string, known: ReadonlySet<string>, fade: boolean): boolean`; `interface PinyinFadeValue { show: (ch: string) => boolean; peeked: { label: number; cell: number } | null; peek: (label: number, cell: number) => void }`; `PinyinFadeContext`; `PinyinFade({ known: ReadonlySet<string>; on: boolean; children })`; `Label` props `fade?: boolean` (opt in to fading under a `PinyinFade`) and `peek?: boolean` (default true; false inside a button); cells get `label__cell--hidden` / `label__cell--peek`; `Settings.fadePinyin?: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/pinyinFade.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Label } from './Label';
import { PEEK_MS, PinyinFade, showPinyin } from './pinyinFade';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { speak } from '../audio/speech';

const pys = (c: Element) => [...c.querySelectorAll('.label__py')].map((e) => e.textContent);
afterEach(() => vi.useRealTimers());

describe('showPinyin (spec 2026-10-12 §4)', () => {
  it("shows until the character's Read rung passes; the switch off shows it always", () => {
    expect(showPinyin('你', new Set('你'), true)).toBe(false);
    expect(showPinyin('好', new Set('你'), true)).toBe(true);
    expect(showPinyin('你', new Set('你'), false)).toBe(true);
  });
});

describe('faded pinyin in a Label (spec 2026-10-12 §4)', () => {
  it('hides a known syllable but keeps its slot; a tap shows it for 3 s and says it', () => {
    vi.useFakeTimers();
    const { container } = render(<PinyinFade known={new Set('你')} on><Label zh="你好" fade /></PinyinFade>);
    expect(pys(container)).toEqual(['', 'hǎo']);
    expect(container.querySelectorAll('.label__cell--hidden')).toHaveLength(1);
    expect(container.querySelector('.label')!.getAttribute('data-py')).toBe('hǎo');
    fireEvent.click(container.querySelector('.label__cell--hidden')!);
    expect(pys(container)).toEqual(['nǐ', 'hǎo']);
    expect(container.querySelector('.label__cell--peek')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('你', { reading: 'nǐ' });
    act(() => { vi.advanceTimersByTime(PEEK_MS - 1); });
    expect(pys(container)).toEqual(['nǐ', 'hǎo']);
    act(() => { vi.advanceTimersByTime(1); });
    expect(pys(container)).toEqual(['', 'hǎo']);
  });
  it('one peek at a time; a new one restarts the 3 s', () => {
    vi.useFakeTimers();
    const { container } = render(<PinyinFade known={new Set('你好们')} on><Label zh="你好" fade /><Label zh="你们" fade /></PinyinFade>);
    const [a, b] = [...container.querySelectorAll('.label')];
    fireEvent.click(a!.querySelector('.label__cell--hidden')!);
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(b!.querySelectorAll('.label__cell--hidden')[1]!);
    expect(pys(a!)).toEqual(['', '']);
    expect(pys(b!)).toEqual(['', 'men']);
    act(() => { vi.advanceTimersByTime(1500); }); // past the first peek's 3 s: the second still shows
    expect(pys(b!)).toEqual(['', 'men']);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(pys(b!)).toEqual(['', '']);
  });
  it('fades nothing without a PinyinFade, with the switch off, or on a line that does not opt in', () => {
    expect(pys(render(<Label zh="你好" fade />).container)).toEqual(['nǐ', 'hǎo']);
    expect(pys(render(<PinyinFade known={new Set('你好')} on={false}><Label zh="你好" fade /></PinyinFade>).container)).toEqual(['nǐ', 'hǎo']);
    expect(pys(render(<PinyinFade known={new Set('你好')} on><Label zh="你好" /></PinyinFade>).container)).toEqual(['nǐ', 'hǎo']);
  });
  it('inside a button it never peeks: the tap goes to the button', () => {
    const hit = vi.fn();
    vi.mocked(speak).mockClear();
    const { container } = render(<PinyinFade known={new Set('你好')} on><button type="button" onClick={hit}><Label zh="你好" fade peek={false} /></button></PinyinFade>);
    fireEvent.click(container.querySelector('.label__cell--hidden')!);
    expect(hit).toHaveBeenCalledTimes(1);
    expect(pys(container)).toEqual(['', '']);
    expect(speak).not.toHaveBeenCalled();
  });
  it('a gap keeps its sound: only Han characters fade', () => {
    const { container } = render(<PinyinFade known={new Set('门口')} on><Label zh="＿口" py="mén kǒu" fade /></PinyinFade>);
    expect(pys(container)).toEqual(['mén', '']);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/ui/pinyinFade.test.tsx`
Expected: FAIL — `Failed to resolve import "./pinyinFade"`.

- [ ] **Step 3: Write `src/ui/pinyinFade.tsx`**

```tsx
import { createContext, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

/** How long a tapped syllable shows (spec 2026-10-12 §4). */
export const PEEK_MS = 3000;

/** Spec 2026-10-12 §4: a character's pinyin shows until its Read rung passes (`known`: know.knownChars); the switch off shows it always. */
export function showPinyin(ch: string, known: ReadonlySet<string>, fade: boolean): boolean {
  return !fade || !known.has(ch);
}

export interface PinyinFadeValue {
  show: (ch: string) => boolean;
  peeked: { label: number; cell: number } | null; // the one syllable peeking now
  peek: (label: number, cell: number) => void;
}

export const PinyinFadeContext = createContext<PinyinFadeValue | null>(null);

/** Fading for the lines inside it that opt in (`<Label fade>`), and the one peek at a time (spec 2026-10-12 §4). */
export function PinyinFade({ known, on, children }: { known: ReadonlySet<string>; on: boolean; children: ComponentChildren }) {
  const [peeked, setPeeked] = useState<PinyinFadeValue['peeked']>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useMemo(() => (ch: string) => showPinyin(ch, known, on), [known, on]);
  const value = useMemo<PinyinFadeValue>(() => ({
    show,
    peeked,
    peek: (label, cell) => {
      clearTimeout(timer.current); // a new peek replaces the last and gets its own 3 s
      setPeeked({ label, cell });
      timer.current = setTimeout(() => setPeeked(null), PEEK_MS);
    },
  }), [show, peeked]);
  return <PinyinFadeContext.Provider value={value}>{children}</PinyinFadeContext.Provider>;
}
```

- [ ] **Step 4: Replace `src/ui/Label.tsx`**

```tsx
import { pinyin } from 'pinyin-pro';
import '../content/pinyinFixes';
import { useContext, useMemo, useRef } from 'preact/hooks';
import { speak } from '../audio/speech';
import { PinyinFadeContext } from './pinyinFade';

interface Cell {
  py: string; // its syllable, kept even when hidden (a peek shows it)
  ch: string;
  blank?: boolean;
  zh?: boolean; // a Han character (keeps its slot even when its pinyin is hidden)
  hidden?: boolean; // its pinyin is faded: he reads it (spec 2026-10-12 §4)
}

const BLANK = '＿';
/** The text as a screen reader should say it: a blank is 空格, not "full-width low line". */
export const spokenBlanks = (zh: string) => zh.replaceAll(BLANK, '空格');

let labels = 0; // each Label's own number: one peek shows at a time across the lesson screen

/** Chinese text with each syllable shown small directly above its own character, for a P2 reader. */
export function Label({ zh, py: given, pinyinFor, mark, fade = false, peek = true }: {
  zh: string;
  /** Han characters to highlight, as [first, count] counted in Han characters (the word inside a usage line) */
  mark?: [number, number];
  /** syllables for its Han characters, from context (子 in 儿子 is zi) */
  py?: string;
  /** which characters show their pinyin (all when omitted) — for fading pinyin as he learns */
  pinyinFor?: (ch: string) => boolean;
  /** a line inside a question (spec 2026-10-12 §4): under a <PinyinFade>, characters he reads lose their pinyin, slot kept */
  fade?: boolean;
  /** false inside a button (a usage option, a placed 组句 tile): a tap there answers, so it never peeks */
  peek?: boolean;
}) {
  const fader = useContext(PinyinFadeContext);
  const own = useRef(0);
  if (!own.current) own.current = ++labels;
  const showFor = pinyinFor ?? (fade && fader ? fader.show : undefined);
  const { cells, py } = useMemo(() => {
    const out: Cell[] = [];
    const all = pinyin(zh, { type: 'all' });
    const ctx = given?.trim().split(/\s+/);
    const zhCount = all.filter((d) => d.isZh).length;
    const fits = ctx && ctx.length === zhCount;
    // syllables for the blanks too: the gap's sound is the clue in a 组词 with its character missing (parent, 2026-10-05)
    const withBlanks = ctx && !fits && ctx.length === zhCount + (zh.match(/＿/g) ?? []).length;
    let k = 0;
    for (const d of all) {
      if (d.isZh) {
        const syl = fits || withBlanks ? ctx[k++]! : d.pinyin;
        out.push({ py: syl, ch: d.origin, zh: true, ...(showFor && !showFor(d.origin) ? { hidden: true } : {}) });
        continue;
      }
      // pinyin-pro may hand a run like "＿！" over as one piece; split out each blank. Spaces around a number go: its own
      // slot keeps it apart, so "得到了 4 颗星" doesn't get wide gaps (parent, 2026-10-05)
      for (const part of d.origin.split(/(＿)/).map((p) => (/\d/.test(p) ? p.trim() : p)).filter((p) => p.trim() || p === BLANK)) {
        const prev = out[out.length - 1];
        if (part === BLANK) out.push({ py: withBlanks ? ctx[k++]! : '', ch: BLANK, blank: true });
        else if (prev && !prev.zh && !prev.blank) prev.ch += part; // keep "45" or "！" runs together
        else out.push({ py: '', ch: part });
      }
    }
    // data-py: the syllables shown plus any numbers or Latin text, without punctuation
    const py = out.map((c) => (c.zh ? (c.hidden ? '' : c.py) : !c.blank && /[\p{L}\p{N}]/u.test(c.ch) ? c.ch.trim() : '')).filter(Boolean).join(' ');
    return { cells: out, py };
  }, [zh, given, showFor]);
  const canPeek = fade && peek && !pinyinFor && !!fader;
  const open = canPeek ? fader!.peeked : null;
  const peeked = open && open.label === own.current ? open.cell : -1;
  let han = -1;
  const marked = (c: Cell) => !!mark && !!c.zh && (++han, han >= mark[0] && han < mark[0] + mark[1]);
  return (
    <span class="label" data-py={py} data-zh={zh}>
      {/* one cell already reads as the whole text; several get a single readable copy so 你好 isn't read 你…好 */}
      {cells.length > 1 && <span class="sr-only">{spokenBlanks(zh)}</span>}
      <span class="label__cells" aria-hidden={cells.length > 1 ? 'true' : undefined}>
        {cells.map((c, i) => {
          // a faded syllable peeks for 3 s when tapped, and is said (spec 2026-10-12 §4); a peek never grades anything
          const tap = c.hidden && canPeek ? () => { fader!.peek(own.current, i); speak(c.ch, { reading: c.py }); } : undefined;
          return (
            <span key={i} class={`${c.blank ? 'label__cell label__cell--blank' : c.zh ? 'label__cell label__cell--zh' : 'label__cell'}${marked(c) ? ' label__cell--mark' : ''}${c.hidden ? ' label__cell--hidden' : ''}${i === peeked ? ' label__cell--peek' : ''}`} onClick={tap}>
              <small class="label__py" aria-hidden="true">{c.hidden && i !== peeked ? '' : c.py}</small>
              <span class="label__ch">{c.ch}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
```

- [ ] **Step 5: The setting and the peek's look**

In `src/types.ts`, after the line `  sayCards?: boolean; // Say cards in 练一练 (spec 2026-10-11 §4): on unless false`, add:

```ts
  fadePinyin?: boolean; // pinyin hides over characters he reads, tap to peek (spec 2026-10-12 §4): on unless false
```

Append to `src/styles.css`:

```css

/* Pinyin fading (spec 2026-10-12 §4): a faded syllable keeps its slot; a tap shows it for 3 s */
.label__cell--hidden { cursor: pointer; }
.label__cell--peek .label__py { opacity: 1; color: var(--green-ink); }
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/ui src/activities/langdu`
Expected: PASS (the `pinyinFor` test in `widgets.test.tsx` and 朗读's fading are unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/ui/pinyinFade.tsx src/ui/pinyinFade.test.tsx src/ui/Label.tsx src/types.ts src/styles.css
git commit -m "feat: pinyin fades over characters he reads, tap to peek

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fading in the questions, the cue and the new-word card

**Files:**
- Modify: `src/activities/choose/UseQuestion.tsx` (two `Label`s)
- Modify: `src/activities/practice/BuildSentence.tsx` (placed tile `Label`)
- Modify: `src/activities/practice/UnderstandQuestion.tsx` (revealed sentence `Label`)
- Modify: `src/activities/practice/PairGame.tsx` (summary row `Label`)
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (two cue `Label`s, `WordRow`, the intro's pinyin)
- Modify: `src/activities/writing/WritingStep.tsx:186` (gap cue `Label`)
- Modify: `src/app/SessionScreen.tsx` (imports, `Loaded`, the load, the return)
- Modify: `src/styles.css`, `src/styles.test.ts` (append)
- Test: `src/activities/practice/fadeInQuestions.test.tsx`, `src/app/fadeSession.test.tsx`

**Interfaces:**
- Consumes: `PinyinFade`, `Label`'s `fade` / `peek` (Task 3); `Settings.fadePinyin`.
- Produces: `Loaded.fadePinyin: boolean` in `SessionScreen`; every lesson step renders inside `<PinyinFade known={know.knownChars} on={state.fadePinyin}>`; the new-word card's own pinyin has class `pinyin--later`.

- [ ] **Step 1: Write the failing tests**

Create `src/activities/practice/fadeInQuestions.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import type { PairBoard } from '../../practice/pairs';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { PinyinFade } from '../../ui/pinyinFade';
import { UseQuestion } from '../choose/UseQuestion';
import { FlashcardStep } from '../flashcards/FlashcardStep';
import { BuildSentence } from './BuildSentence';
import { PairGame } from './PairGame';
import { UNDERSTAND_WAIT_MS, UnderstandQuestion } from './UnderstandQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';

const known = (...texts: string[]) => new Set(texts.flatMap((t) => Array.from(t)));
const hidden = (sel: string) => document.querySelectorAll(`${sel} .label__cell--hidden`).length;
const pys = (sel: string) => [...document.querySelectorAll(`${sel} .label__py`)].map((e) => e.textContent);
const kid = DEFAULT_KID;

describe('pinyin fades in the questions (spec 2026-10-12 §4)', () => {
  it('选一选: the sentence fades the characters he reads; a tap peeks', () => {
    const item = { kind: 'fit' as const, wordId: null, word: '晴', before: '今天是', after: '天。', options: ['晴', '睛', '请', '清'] };
    render(<PinyinFade known={known('今天是')} on><UseQuestion item={item} kid={kid} onAnswer={vi.fn()} onNext={vi.fn()} /></PinyinFade>);
    expect(hidden('.meaning-cue')).toBe(4); // 今 天 是 天
    fireEvent.click(document.querySelector('.meaning-cue .label__cell--hidden')!);
    expect(speak).toHaveBeenLastCalledWith('今', { reading: 'jīn' });
    expect(document.querySelector('.meaning-cue .label__cell--peek .label__py')!.textContent).toBe('jīn');
  });
  it('a faded character inside a usage option answers, never peeks', () => {
    const item = { kind: 'usage' as const, wordId: null, word: '晴', right: '今天是晴天。', wrong: '今天很晴。' };
    const onAnswer = vi.fn();
    render(<PinyinFade known={known(item.right, item.wrong)} on><UseQuestion item={item} kid={kid} onAnswer={onAnswer} onNext={vi.fn()} /></PinyinFade>);
    expect(hidden('.usage-opt')).toBeGreaterThan(0);
    fireEvent.click(document.querySelector('.usage-opt .label__cell--hidden')!);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.label__cell--peek')).toBeNull();
  });
  it('组句: a placed tile fades', () => {
    const item = { full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] };
    render(<PinyinFade known={known(item.full)} on><BuildSentence item={item} word={makeWord('和')} kid={kid} onDone={vi.fn()} /></PinyinFade>);
    fireEvent.click(document.querySelector('.build__bank .choice')!);
    expect(hidden('.build__placed')).toBeGreaterThan(0);
  });
  it('the Understand sheet: the sentence fades', () => {
    vi.useFakeTimers();
    const item = { zh: '我家有一只猫。', en: 'We have a cat at home.', choices: ['The puppy runs fast.', 'We have a cat at home.', 'The cat sleeps by the door.'] };
    render(<PinyinFade known={known(item.zh)} on><UnderstandQuestion item={item} kid={kid} onDone={vi.fn()} /></PinyinFade>);
    act(() => { vi.advanceTimersByTime(UNDERSTAND_WAIT_MS); });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'The puppy runs fast.' }));
    expect(hidden('.understand__zh')).toBe(6);
  });
  it('the pairing summary fades', () => {
    const board: PairBoard = { left: ['穿', '刷', '踢'], right: ['足球', '衣服', '牙'], pairs: [['穿', '衣服'], ['刷', '牙'], ['踢', '足球']], target: ['穿', '衣服'] };
    render(<PinyinFade known={known('穿衣服刷牙踢足球')} on><PairGame board={board} kind="match" kid={kid} onDone={vi.fn()} /></PinyinFade>);
    const tile = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pair__tile')].find((b) => b.textContent === t)!;
    const join = (l: string, r: string) => { fireEvent.click(tile(l)); fireEvent.click(tile(r)); };
    join('穿', '牙'); join('穿', '衣服'); join('刷', '牙'); join('踢', '足球');
    expect(hidden('.pair-summary')).toBeGreaterThan(0);
  });
  it("the new-word card: its 词语 fade, the new character's own pinyin comes 2 s after it", () => {
    const sheng = builtinWords(0).find((x) => x.text === '生')!;
    render(<PinyinFade known={known('男')} on><FlashcardStep item={{ wordId: sheng.id, isNew: true, retry: false }} word={sheng} pool={builtinWords(0)} voice={false} kid={kid} resting="sulk" combo={0} closeupReady={false} onDone={vi.fn()} /></PinyinFade>);
    expect(pys('.usage')).toEqual(['', 'shēng']); // 男生: 男 is read, 生 is new
    const own = document.querySelector('.intro__char .pinyin')!;
    expect(own.textContent).toBe('shēng');
    expect(own.classList.contains('pinyin--later')).toBe(true);
  });
});
```

Create `src/app/fadeSession.test.tsx`:

```tsx
import { waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('hanzi-writer', () => ({
  default: { create: vi.fn(() => ({ quiz: () => Promise.resolve(), cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() })) },
}));
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
/** 门 to write (its cue is ＿口), both 门 and 口 read. */
async function lesson(fadePinyin?: boolean) {
  const app = await makeAppData();
  await putWords(app.db, [{ ...w('门'), writeable: true }, { ...w('口'), writeable: false }]);
  await putCards(app.db, [makeCard('b:门', 'recognise', new Date(2026, 9, 20), true), makeCard('b:门', 'write', new Date(2026, 9, 1)), makeCard('b:口', 'recognise', new Date(2026, 9, 20), true)]);
  await updateSettings(app.db, { activities: { newwords: false, practice: false, writing: true, speaking: false }, ...(fadePinyin === undefined ? {} : { fadePinyin }) });
  renderWithApp(<SessionScreen free={false} />, app);
  await waitFor(() => expect(document.querySelector('.write__blank')).toBeTruthy());
  return {
    gap: document.querySelector('.write__blank .label__cell--blank .label__py')!.textContent,
    other: document.querySelector('.write__blank .label__cell--zh .label__py')!.textContent,
  };
}

describe('pinyin fading in a lesson (spec 2026-10-12 §4)', () => {
  it("the writing cue fades a known character but keeps the gap's sound (the setting absent: on)", async () => {
    expect(await lesson()).toEqual({ gap: 'mén', other: '' });
  });
  it('with the switch off every syllable shows', async () => {
    expect(await lesson(false)).toEqual({ gap: 'mén', other: 'kǒu' });
  });
});
```

Append to `src/styles.test.ts`:

```ts
describe('the new-word card (spec 2026-10-12 §4)', () => {
  it("its own pinyin comes 2 s after the character", () => {
    expect(css).toMatch(/\.pinyin--later \{[^}]*animation: later-in 300ms ease-out 2s both/);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/activities/practice/fadeInQuestions.test.tsx src/app/fadeSession.test.tsx src/styles.test.ts`
Expected: FAIL — no `.label__cell--hidden` anywhere, no `pinyin--later`.

- [ ] **Step 3: Opt the question lines in**

`src/activities/choose/UseQuestion.tsx` — replace

```tsx
              <Label zh={`${item.before}${done ? item.word : '＿'.repeat(Array.from(item.word).length)}${item.after}`} />
```

with

```tsx
              <Label zh={`${item.before}${done ? item.word : '＿'.repeat(Array.from(item.word).length)}${item.after}`} fade />
```

and replace `<Label zh={s} />` with `<Label zh={s} fade peek={false} />` (a tap in an option answers it).

`src/activities/practice/BuildSentence.tsx` — replace `<Label zh={item.tiles[i]!} />` with `<Label zh={item.tiles[i]!} fade peek={false} />` (a tap takes the tile back).

`src/activities/practice/UnderstandQuestion.tsx` — replace `<span class="hanzi understand__zh"><Label zh={item.zh} /></span>` with `<span class="hanzi understand__zh"><Label zh={item.zh} fade /></span>`.

`src/activities/practice/PairGame.tsx` — replace `<span class="hanzi"><Label zh={word} /></span>` with `<span class="hanzi"><Label zh={word} fade /></span>`.

`src/activities/writing/WritingStep.tsx` — replace

```tsx
            <div class="word-row__line write__blank"><Label zh={cue.blanked} py={gapPinyin(cue.blanked, cue.blankedPy, word.pinyin, index)} /><SpeakButton text={cue.speech} small /></div>
```

with

```tsx
            <div class="word-row__line write__blank"><Label zh={cue.blanked} py={gapPinyin(cue.blanked, cue.blankedPy, word.pinyin, index)} fade /><SpeakButton text={cue.speech} small /></div>
```

(the gap is a blank cell, which never fades: its sound is what he writes from).

`src/activities/flashcards/FlashcardStep.tsx` — replace

```tsx
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} />
```

with

```tsx
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} fade />
```

replace

```tsx
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} py={quiz.cue.pinyin} />
```

with

```tsx
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} py={quiz.cue.pinyin} fade />
```

replace (in `WordRow`)

```tsx
        <span class={`hanzi word-row__zh${textClass ? ` ${textClass}` : ''}`}><Label zh={zh} py={py} mark={mark} /></span>
```

with

```tsx
        <span class={`hanzi word-row__zh${textClass ? ` ${textClass}` : ''}`}><Label zh={zh} py={py} mark={mark} fade /></span>
```

and replace (in `Intro`)

```tsx
            <div class="pinyin">{word.pinyin}</div>
```

with

```tsx
            {/* the character first; its pinyin 2 s later (spec 2026-10-12 §4, Chung 2003) */}
            <div class="pinyin pinyin--later">{word.pinyin}</div>
```

Append to `src/styles.css`:

```css
.pinyin--later { animation: later-in 300ms ease-out 2s both; }
```

- [ ] **Step 4: Provide the fading in `SessionScreen`**

In `src/app/SessionScreen.tsx`, add after `import { InkIcon } from '../ui/icons/InkIcon';`:

```tsx
import { PinyinFade } from '../ui/pinyinFade';
```

In `interface Loaded`, after `  minutes: number;` add:

```tsx
  fadePinyin: boolean; // settings.fadePinyin as the lesson loaded (spec 2026-10-12 §4): absent = on
```

In the load's `setState({`, after `        minutes: settings.sessionMinutes,` add:

```tsx
        fadePinyin: settings.fadePinyin !== false,
```

Replace

```tsx
  return (
    <div class="screen">
      <WorldScene world={currentWorld(kid)} time={timeOfDay(now())} />
```

with

```tsx
  return (
    <PinyinFade known={know.knownChars} on={state.fadePinyin}>
    <div class="screen">
      <WorldScene world={currentWorld(kid)} time={timeOfDay(now())} />
```

and replace the end of that return

```tsx
        <StoryStep scene={state.speaking.scene} told={kid.story.told} kid={kid} onDone={(r) => void onStoryDone(r)} />
      )}
    </div>
  );
}
```

with

```tsx
        <StoryStep scene={state.speaking.scene} told={kid.story.told} kid={kid} onDone={(r) => void onStoryDone(r)} />
      )}
    </div>
    </PinyinFade>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/activities src/app src/styles.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/activities src/app/SessionScreen.tsx src/app/fadeSession.test.tsx src/styles.css src/styles.test.ts
git commit -m "feat: pinyin fades in questions and cues; the new word's pinyin comes 2 s late

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Word families and the 「一家人」 row

**Files:**
- Create: `src/content/family.ts`
- Test: `src/content/family.test.ts`
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (imports, `Props`, the destructuring, `familyRow`, `Intro`)
- Modify: `src/app/SessionScreen.tsx` (the `FlashcardStep` element)
- Modify: `src/styles.css` (append)
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `builtinWords`, `EXAMPLE_FIXES`, `HSK_WORDS`, `wordsWithChar`, `isHan` (`src/content`); `ladderWords`; `glossFor`; `shownOnCard` (FlashcardStep).
- Produces: `interface FamilyWord { text: string; pinyin: string; en: string }`; `wordsAround(ch: string): { text: string; pinyin: string }[]` (every all-Han word of 2+ characters with `ch`, de-duplicated, examples → ladder → HSK); `familyOf(ch: string, readable: ReadonlySet<string>): FamilyWord[]`; `familyRow(word: Word, known: ReadonlySet<string>): FamilyWord[]`; `FlashcardStep` prop `knownChars?: ReadonlySet<string>`.

- [ ] **Step 1: Write the failing tests**

Create `src/content/family.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { glossFor } from './glossary';
import { familyOf, wordsAround } from './family';

const texts = (ch: string, readable: string) => familyOf(ch, new Set(readable)).map((f) => f.text);

describe('familyOf: words of a character he can read (spec 2026-10-12 §5)', () => {
  it('only words whose every other character he reads', () => {
    expect(texts('生', '男女气先日')).toEqual(['男生', '女生', '生气', '先生', '生日']);
    expect(texts('生', '')).toEqual([]);
  });
  it('a word needs English (学生 has none in the glossary)', () => {
    expect(glossFor('学生')).toBeUndefined();
    expect(texts('生', '学中')).toEqual([]);
  });
  it('ordered by HSK level, then length (门口 1, 出门 2, 大门 2, 串门 7, 五花八门 7)', () => {
    expect(texts('门', '口出大串五花八')).toEqual(['门口', '出门', '大门', '串门', '五花八门']);
  });
  it('a word in the examples, the ladder and the HSK list comes once, with its pinyin and English', () => {
    expect(familyOf('门', new Set('口'))).toEqual([{ text: '门口', pinyin: 'mén kǒu', en: 'doorway; gate' }]);
    const around = wordsAround('门').map((x) => x.text);
    expect(new Set(around).size).toBe(around.length);
    expect(around.every((t) => Array.from(t).length >= 2 && t.includes('门'))).toBe(true);
  });
});
```

Append to `src/activities/flashcards/FlashcardStep.test.tsx` (and add `familyRow` to its `./FlashcardStep` import):

```tsx
describe('「一家人」 on the new-word card (spec 2026-10-12 §5)', () => {
  const sheng = pool.find((x) => x.text === '生')!;
  it('up to four family words, ones the card does not already show first', () => {
    expect(familyRow(sheng, new Set('男女气先日')).map((f) => f.text)).toEqual(['生气', '先生', '生日', '男生']); // the card shows 男生, 女生
    expect(familyRow(makeWord('朋友'), new Set('男女气先日'))).toEqual([]);
  });
  it('the row sits after the 词语, before the 成语, each word with a speak button', () => {
    render(<FlashcardStep {...base} word={sheng} item={{ wordId: sheng.id, isNew: true, retry: false }} voice={false} knownChars={new Set('男女气先日')} onDone={vi.fn()} />);
    const row = document.querySelector('.intro .family')!;
    expect(row.querySelector('.family__title')!.textContent).toContain('一家人');
    expect([...row.querySelectorAll('.family__word .label')].map((l) => l.getAttribute('data-zh'))).toEqual(['生气', '先生', '生日', '男生']);
    expect(row.querySelectorAll('.family__word .speak')).toHaveLength(4);
    const groups = [...document.querySelectorAll('.intro__group')];
    expect(groups.indexOf(row)).toBeGreaterThan(groups.findIndex((g) => g.querySelector('.usage, .example')));
  });
  it('hidden when fewer than two qualify', () => {
    render(<FlashcardStep {...base} word={sheng} item={{ wordId: sheng.id, isNew: true, retry: false }} voice={false} knownChars={new Set('男')} onDone={vi.fn()} />);
    expect(document.querySelector('.family')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/content/family.test.ts src/activities/flashcards/FlashcardStep.test.tsx`
Expected: FAIL — `Failed to resolve import "./family"`, `familyRow is not a function`.

- [ ] **Step 3: Write `src/content/family.ts`**

```ts
// A character's word family (spec 2026-10-12 §5): the words with it that he can read, for the 认新字 card's 「一家人」 row and
// the 找一家人 question. From its 组词, the word ladder's 词语 and the HSK list; static content, worked out on demand.
import { pinyin } from 'pinyin-pro';
import './pinyinFixes';
import type { Example, Word } from '../types';
import { glossFor } from './glossary';
import { builtinWords, EXAMPLE_FIXES, HSK_WORDS, isHan, wordsWithChar } from './index';
import { ladderWords } from './ladder';

export interface FamilyWord { text: string; pinyin: string; en: string }

let examples: Map<string, Example[]> | null = null;
let ladder: Map<string, Word[]> | null = null;
const examplesOf = (ch: string): Example[] => (examples ??= new Map(builtinWords(0).map((w) => [w.text, w.examples ?? []]))).get(ch) ?? [];
function ladderWith(ch: string): Word[] {
  if (!ladder) {
    ladder = new Map();
    for (const w of ladderWords()) for (const c of new Set(Array.from(w.text))) (ladder.get(c) ?? ladder.set(c, []).get(c)!).push(w);
  }
  return ladder.get(ch) ?? [];
}

/** Every word of two or more Han characters with `ch` in it, once: its 组词 first, then the ladder's, then the HSK list's. */
export function wordsAround(ch: string): { text: string; pinyin: string }[] {
  const out = new Map<string, string>();
  for (const e of examplesOf(ch)) if (!out.has(e.text)) out.set(e.text, e.pinyin);
  for (const w of ladderWith(ch)) if (!out.has(w.text)) out.set(w.text, w.pinyin);
  for (const t of wordsWithChar(ch)) if (!out.has(t)) out.set(t, EXAMPLE_FIXES[t] ?? pinyin(t));
  return [...out]
    .filter(([text]) => { const cs = Array.from(text); return cs.length >= 2 && cs.every(isHan) && cs.includes(ch); })
    .map(([text, py]) => ({ text, pinyin: py }));
}

/** The words with `ch` whose every other character he reads, with English; by HSK level, then length, then where they came from. */
export function familyOf(ch: string, readable: ReadonlySet<string>): FamilyWord[] {
  const rows: (FamilyWord & { level: number; n: number; k: number })[] = [];
  wordsAround(ch).forEach(({ text, pinyin: py }, k) => {
    if (!Array.from(text).every((c) => c === ch || readable.has(c))) return;
    const en = glossFor(text);
    if (en) rows.push({ text, pinyin: py, en, level: HSK_WORDS.get(text) ?? 8, n: Array.from(text).length, k });
  });
  return rows.sort((a, b) => a.level - b.level || a.n - b.n || a.k - b.k).map(({ text, pinyin: py, en }) => ({ text, pinyin: py, en }));
}
```

- [ ] **Step 4: The row on the card**

In `src/activities/flashcards/FlashcardStep.tsx`, add after `import type { Idiom } from '../../content/chengyu';`:

```tsx
import { familyOf, type FamilyWord } from '../../content/family';
```

In `interface Props`, after the `lessonTag` member add:

```tsx
  /** the characters he reads (know.knownChars): the 认新字 card's 「一家人」 row (spec 2026-10-12 §5) */
  knownChars?: ReadonlySet<string>;
```

Add above `type Phase = 'intro' | 'quiz' | 'feedback';`:

```tsx
const NO_CHARS: ReadonlySet<string> = new Set();
```

Replace the destructuring line

```tsx
export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, lessonTag = null }: Props) {
```

with

```tsx
export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, lessonTag = null, knownChars = NO_CHARS }: Props) {
```

and `{phase === 'intro' ? <Intro word={word} idiom={idiom} tag={lessonTag} /> : (` with `{phase === 'intro' ? <Intro word={word} idiom={idiom} tag={lessonTag} known={knownChars} /> : (`.

Add above `function Intro(`:

```tsx
/**
 * The 认新字 card's 「一家人」 row (spec 2026-10-12 §5): up to four of the character's family he can read, ones the card doesn't
 * already show first; none when fewer than two qualify, or for a 词语.
 */
export function familyRow(word: Word, known: ReadonlySet<string>): FamilyWord[] {
  if (Array.from(word.text).length !== 1) return [];
  const all = familyOf(word.text, known);
  if (all.length < 2) return [];
  const shown = shownOnCard(word);
  const onCard = (f: FamilyWord) => shown.some((t) => t.includes(f.text));
  return [...all.filter((f) => !onCard(f)), ...all.filter(onCard)].slice(0, 4);
}
```

Replace `function Intro({ word, idiom, tag = null }: { word: Word; idiom: Idiom | null; tag?: string | null }) {` with:

```tsx
function Intro({ word, idiom, tag = null, known }: { word: Word; idiom: Idiom | null; tag?: string | null; known: ReadonlySet<string> }) {
  const family = familyRow(word, known);
```

and in `Intro`'s JSX, replace

```tsx
        {idiom && !shownOnCard(word).some((t) => t.includes(idiom.text)) && ( // the 组词 first, then the 成语 (parent, 2026-10-05: a card showed only a 成语); never one it already shows
```

with

```tsx
        {family.length > 0 && ( // his words of its family, after the 词语 and before the 成语 (spec 2026-10-12 §5)
          <div class="intro__group family" lang="zh">
            <p class="family__title"><Label zh="一家人" /></p>
            <div class="family__words">
              {family.map((f) => (
                <span key={f.text} class="family__word">
                  <span class="hanzi"><Label zh={f.text} py={f.pinyin} mark={markOf(f.text, word.text)} fade /></span>
                  <SpeakButton text={f.text} small />
                </span>
              ))}
            </div>
          </div>
        )}
        {idiom && !shownOnCard(word).some((t) => t.includes(idiom.text)) && ( // the 组词 first, then the 成语 (parent, 2026-10-05: a card showed only a 成语); never one it already shows
```

In `src/app/SessionScreen.tsx`, in the `<FlashcardStep` element, after `          lessonTag={step === 'newwords' ? laneTag(rec.plan.newWordLanes?.[flashWord.id], flashWord) : null} // spec 2026-10-11 §9` add:

```tsx
          knownChars={know.knownChars}
```

Append to `src/styles.css`:

```css

/* 「一家人」 on the 认新字 card (spec 2026-10-12 §5): one compact row of his words of the character's family */
.family__title { margin: 0; font-size: 16px; font-weight: 800; color: var(--ink-soft); }
.family__words { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; }
.family__word { display: inline-flex; align-items: flex-end; gap: 2px; font-size: 26px; }
.family__word .hanzi { font-size: 26px; }
@media (max-height: 700px) { .family__word:nth-child(n+3) { display: none; } } /* a phone: two words, so the card never scrolls */
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/content/family.test.ts src/activities/flashcards src/app`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/family.ts src/content/family.test.ts src/activities/flashcards src/app/SessionScreen.tsx src/styles.css
git commit -m "feat: word families and the 一家人 row on the new-word card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The 「找一家人」 question

**Files:**
- Modify: `src/activities/components/zibian.ts` (add `charsContaining`)
- Create: `src/practice/family.ts`
- Test: `src/practice/family.test.ts`
- Create: `src/activities/practice/FamilyQuestion.tsx`
- Test: `src/activities/practice/FamilyQuestion.test.tsx`
- Modify: `src/session/round.ts:6-9` (`Ask`)
- Modify: `src/session/practice.ts` (imports, `canAsk`, `withFamily`, `planPractice`)
- Modify: `src/session/runner.ts:144` (no retry)
- Modify: `src/activities/practice/PracticeQuestion.tsx` (the question)
- Modify: `src/app/SessionScreen.tsx:220` (`planPractice` call)
- Modify: `src/styles.css` (append)
- Test: `src/session/practice.test.ts`, `src/session/runner.test.ts`, `src/activities/practice/PracticeQuestion.test.tsx`

**Interfaces:**
- Consumes: `familyOf`, `wordsAround`, `FamilyWord` (Task 5); `lookAlikeChars`; `LookAlikeWhy` (Task 2); `BUILTIN`, `builtinReading`; `toneless`.
- Produces: `charsContaining(ch: string): string[]`; `interface FamilyDistractor extends FamilyWord { swap: string }`; `interface FamilyBoard { ch: string; family: FamilyWord[]; distractors: FamilyDistractor[]; tiles: string[] }`; `familyDistractors(ch: string, readable: ReadonlySet<string>): FamilyDistractor[]`; `familyBoard(word: Word, readable: ReadonlySet<string>, rng: Rng): FamilyBoard | null`; `FamilyQuestion({ board, kid, onDone: (r: { correct: boolean; responseMs: number }) => void })`; `Ask` includes `'family'`; `MAX_FAMILY = 2`; `withFamily(items: PracticeItem[], canFamily: (wordId: string) => boolean): PracticeItem[]`; `planPractice(…, canSay = false, known: ReadonlySet<string> = new Set())`.

- [ ] **Step 1: Write the failing tests**

Create `src/practice/family.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';
import { familyBoard, familyDistractors } from './family';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
const K = new Set('男女气先口出学家人');

describe('the 找一家人 board (spec 2026-10-12 §5)', () => {
  it('distractors hold a look-alike instead of the character, readable and one per look-alike first', () => {
    expect(familyDistractors('生', K).map((d) => [d.text, d.swap])).toEqual([['星星', '星'], ['出去', '去'], ['在家', '在'], ['坏人', '坏']]);
  });
  it('six different tiles: two family words with the character, four distractors without it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = familyBoard(w('生'), K, mulberry32(seed))!;
      expect(b.tiles).toHaveLength(6);
      expect(new Set(b.tiles).size).toBe(6);
      expect(b.family).toHaveLength(2);
      for (const f of b.family) { expect(f.text).toContain('生'); expect(b.tiles).toContain(f.text); }
      expect(b.distractors).toHaveLength(4);
      for (const d of b.distractors) { expect(d.text).not.toContain('生'); expect(b.tiles).toContain(d.text); expect(d.en).toBeTruthy(); }
    }
    expect(familyBoard(w('生'), K, mulberry32(1))!.family.map((f) => f.text)).toEqual(['先生', '女生']);
  });
  it('none for a character with fewer than two family words he reads, or for a 词语', () => {
    expect(familyBoard(w('火'), K, mulberry32(1))).toBeNull(); // 火车: he doesn't read 车
    expect(familyBoard(w('木'), K, mulberry32(1))).toBeNull();
    expect(familyBoard(makeWord('朋友'), K, mulberry32(1))).toBeNull();
  });
});
```

Create `src/activities/practice/FamilyQuestion.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyBoard } from '../../practice/family';
import { DEFAULT_KID } from '../../types';
import { FamilyQuestion } from './FamilyQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const board: FamilyBoard = {
  ch: '生',
  family: [{ text: '先生', pinyin: 'xiān shēng', en: 'teacher; gentleman; sir; mister' }, { text: '女生', pinyin: 'nǚ shēng', en: 'schoolgirl; female student' }],
  distractors: [
    { text: '星星', pinyin: 'xīng xīng', en: 'a star; the stars in the sky', swap: '星' },
    { text: '出去', pinyin: 'chū qù', en: 'to go out', swap: '去' },
    { text: '在家', pinyin: 'zài jiā', en: 'to be at home', swap: '在' },
    { text: '坏人', pinyin: 'huài rén', en: 'bad person', swap: '坏' },
  ],
  tiles: ['先生', '星星', '出去', '女生', '在家', '坏人'],
};
const tap = (t: string) => fireEvent.click(screen.getByRole('button', { name: t }));

describe('找一家人 (spec 2026-10-12 §5)', () => {
  it('asks for the two words with the character, on six tiles', () => {
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(document.querySelector('[data-q]')!.textContent).toBe('生');
    expect(document.querySelector('.family-q__ask .label')!.getAttribute('data-zh')).toBe('哪两个词有『生』？');
    expect(document.querySelectorAll('.family-q__tiles .choice')).toHaveLength(6);
  });
  it('both family words: right, with the two words, their pinyin and English', () => {
    const onDone = vi.fn();
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={onDone} />);
    tap('先生'); tap('女生');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    expect([...document.querySelectorAll('.family-sum__row .label')].map((l) => l.getAttribute('data-py'))).toEqual(['xiān shēng', 'nǚ shēng']);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ correct: true, responseMs: expect.any(Number) });
  });
  it('a distractor: wrong; its look-alike is marked and the part that differs shown', () => {
    const onDone = vi.fn();
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={onDone} />);
    tap('先生'); tap('星星');
    expect(document.querySelector('.sheet--oops')).toBeTruthy();
    const missed = document.querySelector('.family-sum__row.is-missed')!;
    expect(missed.querySelector('.label__cell--mark .label__ch')!.textContent).toBe('星');
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('生 · 星 日 sun');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ correct: false, responseMs: expect.any(Number) });
  });
  it('a second tap on a picked tile lets it go; nothing is graded until two are picked', () => {
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={vi.fn()} />);
    tap('先生'); tap('先生');
    expect(document.querySelector('.sheet--good, .sheet--oops')).toBeNull();
    expect(screen.getByRole('button', { name: '先生' }).classList.contains('is-picked')).toBe(false);
    tap('女生'); tap('先生');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
  });
});
```

Append to `src/session/practice.test.ts` (and change its `./practice` import to `import { askable, planFreePlay, planPractice, practiceWords, withFamily, withFish } from './practice';`):

```ts
describe('找一家人 in the round (spec 2026-10-12 §5)', () => {
  const p = (wordId: string, rung: 1 | 2, ask: PracticeItem['ask'], over: Partial<PracticeItem> = {}): PracticeItem => ({ wordId, rung, ask, grades: rung === 2 ? 'meaning' : 'recognise', retry: false, ...over });
  it('replaces at most two rung-2 word or pair items, keeping their place and grading; never two in a row', () => {
    const items = [p('a', 2, 'word'), p('b', 2, 'pair'), p('c', 1, 'read'), p('d', 2, 'word'), p('e', 2, 'pair')];
    const out = withFamily(items, () => true);
    expect(out.map((x) => x.ask)).toEqual(['family', 'pair', 'read', 'family', 'pair']);
    expect(out[0]).toEqual({ ...items[0], ask: 'family' });
    expect(out).toHaveLength(items.length);
  });
  it('one per word; not a retry, a match, another rung, or a word with no board', () => {
    const items = [p('a', 2, 'word'), p('x', 1, 'read'), p('a', 2, 'pair'), p('b', 2, 'word', { retry: true, grades: null }), p('c', 2, 'match'), p('d', 1, 'read'), p('e', 2, 'word')];
    expect(withFamily(items, (id) => id !== 'e').map((x) => x.ask)).toEqual(['family', 'read', 'pair', 'word', 'match', 'read', 'word']);
  });
  it('a planned round: same words, same length, two family questions graded on meaning', () => {
    const ids = ['生', '门', '大', '木', '火'].map(id);
    const rec = createSessionRecord(plan({ meaningReviewIds: ids }), '2026-10-12', 0);
    const rungs = new Map(ids.map((x) => [x, 1]));
    const without = planPractice(rec, rungs, byId, words, false, mulberry32(2));
    const withKnown = planPractice(rec, rungs, byId, words, false, mulberry32(2), new Map(), 1, false, new Set('男女气先口出学家人'));
    expect(withKnown.map((x) => x.wordId)).toEqual(without.map((x) => x.wordId));
    expect(withKnown.map((x) => x.ask)).toEqual(['family', 'word', 'family', 'word', 'pair']);
    expect(withKnown.filter((x) => x.ask === 'family').every((x) => x.rung === 2 && x.grades === 'meaning')).toBe(true);
    expect(without.some((x) => x.ask === 'family')).toBe(false);
  });
});
```

Append to `src/session/runner.test.ts`:

```ts
describe('a missed 找一家人 (spec 2026-10-12 §5: at most two a lesson)', () => {
  it('is not asked again', () => {
    const rec = startPractice(finishStep(createSessionRecord(planOf({ newWordIds: [] }), '2026-10-06', 0)), ['b:a', 'b:b', 'b:c'].map((x) => p(x, { rung: 2, ask: 'family', grades: 'meaning' })));
    expect(afterPracticeAnswer(rec, false, 2000).practiceQueue).toHaveLength(3);
  });
});
```

Append to `src/activities/practice/PracticeQuestion.test.tsx`:

```tsx
describe('找一家人 (spec 2026-10-12 §5)', () => {
  const sheng = pool.find((w) => w.text === '生')!;
  const item = { wordId: sheng.id, rung: 2 as const, ask: 'family' as const, grades: 'meaning' as const, retry: false };
  it('the board of words he reads; both family words come back as a meaning answer', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={sheng} item={item} knownChars={new Set('男女气先口出学家人')} onDone={onDone} />);
    for (const b of [...document.querySelectorAll<HTMLButtonElement>('.family-q__tiles .choice')].filter((x) => x.textContent!.includes('生'))) fireEvent.click(b);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'meaning', inContext: false }));
  });
  it('a family question that can no longer be built is skipped', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={sheng} item={item} knownChars={new Set()} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/practice/family.test.ts src/activities/practice src/session/practice.test.ts src/session/runner.test.ts`
Expected: FAIL — `Failed to resolve import "./family"` / `"./FamilyQuestion"`, `withFamily is not a function`, the missed family item is retried (length 4).

- [ ] **Step 3: Characters that contain a character**

In `src/activities/components/zibian.ts`, add above `/** Characters a child could put for \`ch\`: …`:

```ts
/** The built-in characters that have `ch` as a part (生 → 星 性 胜 牲): the family question's look-alikes (spec 2026-10-12 §5). */
export function charsContaining(ch: string): string[] {
  return partIndex().get(ch) ?? [];
}
```

- [ ] **Step 4: Write `src/practice/family.ts`**

```ts
// 找一家人 (spec 2026-10-12 §5): two words of the character's family among four that hold a look-alike or sound-alike instead.
import { BUILTIN, builtinReading } from '../content';
import { familyOf, wordsAround, type FamilyWord } from '../content/family';
import { glossFor } from '../content/glossary';
import { charsContaining, lookAlikeChars } from '../activities/components/zibian';
import { toneless } from '../activities/flashcards/tones';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface FamilyDistractor extends FamilyWord { swap: string } // swap: the look-alike it holds instead
export interface FamilyBoard { ch: string; family: FamilyWord[]; distractors: FamilyDistractor[]; tiles: string[] }

const levelOf = new Map(BUILTIN.map((c) => [c.char, c.level]));
let bySound: Map<string, string[]> | null = null;
/** Built-in characters read the same, tones aside (生 → 声 升…). */
function soundAlikes(ch: string): string[] {
  if (!bySound) {
    bySound = new Map();
    for (const c of BUILTIN) { const s = toneless(builtinReading(c)); (bySound.get(s) ?? bySound.set(s, []).get(s)!).push(c.char); }
  }
  const own = BUILTIN.find((c) => c.char === ch);
  return own ? bySound.get(toneless(builtinReading(own)))!.filter((c) => c !== ch) : [];
}

/** What he might take for `ch`: characters with it inside (星), its look-alikes, then its sound-alikes — at most two levels above it. */
function swapsFor(ch: string): string[] {
  const top = (levelOf.get(ch) ?? 7) + 2;
  return [...new Set([...charsContaining(ch), ...lookAlikeChars(ch), ...soundAlikes(ch)])].filter((x) => x !== ch && (levelOf.get(x) ?? 9) <= top);
}

/** Four real words with English that hold a look-alike instead of `ch` (never `ch`): ones he can read and one per look-alike first. */
export function familyDistractors(ch: string, readable: ReadonlySet<string>): FamilyDistractor[] {
  const pool: (FamilyDistractor & { readable: boolean })[] = [];
  for (const swap of swapsFor(ch)) {
    for (const { text, pinyin } of wordsAround(swap)) {
      const en = glossFor(text);
      if (!en || text.includes(ch) || pool.some((x) => x.text === text)) continue;
      pool.push({ text, pinyin, en, swap, readable: Array.from(text).every((c) => c === swap || readable.has(c)) });
    }
  }
  const out: (typeof pool)[number][] = [];
  const take = (ok: (x: (typeof pool)[number]) => boolean) => { for (const x of pool) if (out.length < 4 && !out.includes(x) && ok(x)) out.push(x); };
  take((x) => x.readable && !out.some((o) => o.swap === x.swap));
  take((x) => x.readable);
  take((x) => !out.some((o) => o.swap === x.swap));
  take(() => true);
  return out.map(({ text, pinyin, en, swap }) => ({ text, pinyin, en, swap }));
}

/** A board for a single character with two or more family words he reads and four distractors; else null. */
export function familyBoard(word: Word, readable: ReadonlySet<string>, rng: Rng): FamilyBoard | null {
  if (Array.from(word.text).length !== 1) return null;
  const family = familyOf(word.text, readable);
  if (family.length < 2) return null;
  const distractors = familyDistractors(word.text, readable);
  if (distractors.length < 4) return null;
  const two = shuffle(family.slice(0, 4), rng).slice(0, 2);
  return { ch: word.text, family: two, distractors, tiles: shuffle([...two, ...distractors].map((x) => x.text), rng) };
}
```

- [ ] **Step 5: Write `src/activities/practice/FamilyQuestion.tsx`**

```tsx
import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { FamilyBoard } from '../../practice/family';
import type { KidState } from '../../types';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { LookAlikeWhy } from '../../ui/stage/WhyLine';

interface Props {
  board: FamilyBoard;
  kid: KidState;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** Where a character sits in a word, to mark it. */
const markAt = (text: string, ch: string): [number, number] | undefined => {
  const at = Array.from(text).indexOf(ch);
  return at < 0 ? undefined : [at, 1];
};

/**
 * 找一家人 (spec 2026-10-12 §5): the character, and six words — he taps the two that have it. A tap on a picked word lets it go;
 * the second word marks it. The sheet gives the two family words; after a miss, the look-alike he took for it.
 */
export function FamilyQuestion({ board, kid, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ board.ch.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [board]);
  const [picked, setPicked] = useState<string[]>([]);
  const shownAt = useRef(performance.now());
  const tookMs = useRef(0);
  useEffect(() => speak(`哪两个词有${board.ch}？`), [board]);
  const family = new Set(board.family.map((f) => f.text));
  const done = picked.length === 2;
  const correct = done && picked.every((t) => family.has(t));
  const tap = (t: string) => {
    if (done) return;
    if (picked.includes(t)) { setPicked(picked.filter((x) => x !== t)); return; } // let go
    const next = [...picked, t];
    setPicked(next);
    speak(t); // he hears what he picked (as in 连一连)
    if (next.length === 2) {
      tookMs.current = Math.round(performance.now() - shownAt.current);
      playSfx(next.every((x) => family.has(x)) ? 'correct' : 'wrong');
    }
  };
  const state = (t: string) => (!done ? (picked.includes(t) ? ' is-picked' : '') : family.has(t) ? ' is-answer' : picked.includes(t) ? ' is-wrong' : ' is-dim');
  const wrong = board.distractors.filter((d) => picked.includes(d.text));
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : 'neutral'} bubble={done ? null : '找一家人！'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={
            <div class="family-sum">
              {board.family.map((f) => (
                <p key={f.text} class="family-sum__row"><span class="hanzi"><Label zh={f.text} py={f.pinyin} mark={markAt(f.text, board.ch)} /></span><span lang="en">{f.en}</span></p>
              ))}
              {wrong.map((d) => (
                <Fragment key={d.text}>
                  <p class="family-sum__row is-missed"><span class="hanzi"><Label zh={d.text} py={d.pinyin} mark={markAt(d.text, d.swap)} /></span><span lang="en">{d.en}</span></p>
                  <LookAlikeWhy right={board.ch} picked={d.swap} />
                </Fragment>
              ))}
            </div>
          }
          actionLabel="继续"
          onAction={() => onDone({ correct, responseMs: tookMs.current })}
        />
      )}
    >
      <div class="flash__prompt family-q">
        <div class="hanzi hanzi--q" data-q>{board.ch}</div>
        <p class="family-q__ask"><Label zh={`哪两个词有『${board.ch}』？`} /></p>
      </div>
      <div class="choices stagger choices--hanzi choices--words choices--six family-q__tiles">
        {board.tiles.map((t) => (
          <button key={t} type="button" class={`choice press${state(t)}`} disabled={done} onClick={() => tap(t)}>{t}</button>
        ))}
      </div>
    </Stage>
  );
}
```

- [ ] **Step 6: Plan it into the round**

In `src/session/round.ts`, replace the `Ask` doc comment's last line and the type:

```ts
 *  fish: 钓鱼 for a look-alike he confused (not a rung) · say: he reads the word aloud (the Say rung, spec 2026-10-11 §3). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say';
```

with:

```ts
 *  fish: 钓鱼 for a look-alike he confused (not a rung) · say: he reads the word aloud (the Say rung, spec 2026-10-11 §3) ·
 *  family: 找一家人, in place of a rung-2 word or pair item (spec 2026-10-12 §5; never picked by the ladder). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'understand' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish' | 'say' | 'family';
```

In `src/session/practice.ts`, add after `import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';`:

```ts
import { familyBoard } from '../practice/family';
```

In `canAsk`, after `    case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder` add:

```ts
    case 'family': return false; // 找一家人 takes over a planned rung-2 item (withFamily), never asked from the ladder
```

Add above `/** \`canSay\`: the iPad can record …`:

```ts
/** At most two 找一家人 a lesson (spec 2026-10-12 §5). */
export const MAX_FAMILY = 2;

/**
 * 找一家人 in place of rung-2 word or pair items (spec 2026-10-12 §5): the round's first ones whose word has a board, two words at
 * most, never right after another; each keeps its place, rung and grading, so the round is no longer.
 */
export function withFamily(items: PracticeItem[], canFamily: (wordId: string) => boolean): PracticeItem[] {
  const out = [...items];
  const done = new Set<string>();
  for (let i = 0; i < out.length && done.size < MAX_FAMILY; i++) {
    const x = out[i]!;
    if (x.retry || x.rung !== 2 || (x.ask !== 'word' && x.ask !== 'pair') || done.has(x.wordId) || out[i - 1]?.ask === 'family') continue;
    if (!canFamily(x.wordId)) continue;
    out[i] = { ...x, ask: 'family' };
    done.add(x.wordId);
  }
  return out;
}
```

Replace the `planPractice` signature line and its round line:

```ts
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false): PracticeItem[] {
```

with

```ts
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false, known: ReadonlySet<string> = new Set()): PracticeItem[] {
```

and

```ts
  const round = buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice, level)(ask), rng);
```

with

```ts
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5)
  const round = withFamily(buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice, level)(ask), rng), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  });
```

In `src/session/runner.ts`, replace

```ts
  if (!correct && !item.retry && item.ask !== 'fish') { // a missed 钓鱼 isn't asked again: at most two a lesson (sweep)
```

with

```ts
  if (!correct && !item.retry && item.ask !== 'fish' && item.ask !== 'family') { // a missed 钓鱼 or 找一家人 isn't asked again: at most two a lesson (sweep; spec 2026-10-12 §5)
```

In `src/app/SessionScreen.tsx`, replace

```tsx
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, meaningPool(state.know), voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know), recordingSupported());
```

with

```tsx
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, meaningPool(state.know), voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know), recordingSupported(), state.know.knownChars);
```

- [ ] **Step 7: Ask it in 练一练**

In `src/activities/practice/PracticeQuestion.tsx`, add after `import { builtinIdiom, idiomOf, idiomsFor, type Idiom } from '../../content/chengyu';`:

```tsx
import { FamilyQuestion } from './FamilyQuestion';
import { familyBoard } from '../../practice/family';
```

After the `fish` memo line add:

```tsx
  const family = useMemo(() => (item.ask === 'family' ? familyBoard(word, knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
```

Replace

```tsx
    if ((sentence && !use) || (item.ask === 'build' && !zuju) || (item.ask === 'pair' && !board) || (item.ask === 'match' && !match) || (item.ask === 'fish' && !fish) || (item.ask === 'understand' && !understand)) onDone(null);
```

with

```tsx
    if ((sentence && !use) || (item.ask === 'build' && !zuju) || (item.ask === 'pair' && !board) || (item.ask === 'match' && !match) || (item.ask === 'fish' && !fish) || (item.ask === 'understand' && !understand) || (item.ask === 'family' && !family)) onDone(null);
```

Add before `  if (item.ask === 'build') {`:

```tsx
  if (item.ask === 'family') {
    if (!family) return null;
    return (
      <FamilyQuestion
        board={family}
        kid={kid}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
  }
```

Append to `src/styles.css`:

```css

/* 找一家人 (spec 2026-10-12 §5) */
.family-q { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.family-q__ask { margin: 0; font-size: 22px; font-weight: 800; }
.family-q__tiles .choice.is-picked { outline: 4px solid var(--blue, #4aa3ff); }
.family-sum { display: flex; flex-direction: column; gap: 2px; flex-basis: 100%; }
.family-sum__row { margin: 0; display: flex; align-items: flex-end; flex-wrap: wrap; gap: 0 10px; font-size: 16px; color: var(--ink-soft); }
.sheet__detail .family-sum__row .hanzi { font-size: 24px; color: var(--ink); }
.family-sum__row.is-missed .hanzi { color: var(--orange-ink); }
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/practice src/activities/practice src/session src/app`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/activities/components/zibian.ts src/practice/family.ts src/practice/family.test.ts src/activities/practice src/session src/app/SessionScreen.tsx src/styles.css
git commit -m "feat: 找一家人 — a family question in place of up to two rung-2 items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The 拼音渐隐 switch

**Files:**
- Modify: `src/parent/SettingsPanel.tsx` (after the Say cards field)
- Test: `src/parent/settingsFade.test.tsx`

**Interfaces:**
- Consumes: `Settings.fadePinyin` (Task 3); `save` and `s` inside `SettingsPanel`.
- Produces: a checkbox labelled 「拼音渐隐 Fade pinyin」, checked unless `fadePinyin === false`.

- [ ] **Step 1: Write the failing test**

Create `src/parent/settingsFade.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('拼音渐隐 Fade pinyin (spec 2026-10-12 §4)', () => {
  it('is on when never set, and saves off and on again', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = screen.getByLabelText('拼音渐隐 Fade pinyin') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).fadePinyin).toBe(false));
    fireEvent.click(screen.getByLabelText('拼音渐隐 Fade pinyin'));
    await waitFor(async () => expect((await getSettings(app.db)).fadePinyin).toBe(true));
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/parent/settingsFade.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: 拼音渐隐 Fade pinyin`.

- [ ] **Step 3: Add the switch**

In `src/parent/SettingsPanel.tsx`, after the Say cards field's hint line

```tsx
        <p class="hint">In 练一练 he reads some words aloud (about one in three, at most 6 a lesson). You confirm his takes under Listen &amp; confirm; a word he can say counts toward his stars and Progress. Off: 练一练 is taps only.</p>
      </div>
```

add:

```tsx
      <div class="field">
        <label>
          <input type="checkbox" checked={s.fadePinyin !== false} onChange={(e) => void save({ fadePinyin: e.currentTarget.checked })} />{' '}
          拼音渐隐 Fade pinyin
        </label>
        <p class="hint">Pinyin hides over characters he already reads; he taps one to see it for 3 seconds. New characters, pinyin answer choices and the answer after a miss always show it. Off: pinyin over every character, as before.</p>
      </div>
```

- [ ] **Step 4: Run the parent tests**

Run: `npx vitest run src/parent`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parent/SettingsPanel.tsx src/parent/settingsFade.test.tsx
git commit -m "feat: the 拼音渐隐 switch in Settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: WebKit, the whole suite and the build

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (imports; five cases before the final `else render(screen(`)
- Modify: `scripts/stage-cases.ts` (checks before the `?case=build` 好了 section)

**Interfaces:**
- Consumes: `FlashcardStep` (`knownChars`, `introIdiom`), `UseQuestion`, `PinyinFade`, `FamilyQuestion`, `familyBoard`, `idiomsFor`.
- Produces: stage cases `why-look`, `why-pinyin`, `fade-peek`, `intro-family`, `family`; screenshots under `fit-shots/stage-cases/`.

- [ ] **Step 1: Add the cases to `scripts/stage-cases/page.tsx`**

Change `import { builtinIdiom, chengyuOf } from '../../src/content/chengyu';` to `import { builtinIdiom, chengyuOf, idiomsFor } from '../../src/content/chengyu';` and `import { FlashcardStep } from '../../src/activities/flashcards/FlashcardStep';` to `import { FlashcardStep, introIdiom } from '../../src/activities/flashcards/FlashcardStep';`, and add after `import type { Recording } from '../../src/types';`:

```tsx
import { PinyinFade } from '../../src/ui/pinyinFade';
import { FamilyQuestion } from '../../src/activities/practice/FamilyQuestion';
import { familyBoard } from '../../src/practice/family';
```

Insert before the line `else render(screen(`:

```tsx
else if (which === 'why-look' || which === 'why-pinyin') {
  // a miss says why (spec 2026-10-12 §3): 睛 for 晴 (the part that differs), 请 read qīng (the sound part); stage-cases.ts taps it
  const words = builtinWords(0);
  const near = words.filter((x) => [...'晴睛静精'].includes(x.text));
  const w = which === 'why-look' ? near.find((x) => x.text === '晴')! : words.find((x) => x.text === '请')!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={which === 'why-look' ? 'listen' : 'read'} word={w} pool={which === 'why-look' ? near : words} voice={which === 'why-look'} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'fade-peek') {
  // pinyin fades over characters he reads (spec 2026-10-12 §4): the long clue sentence, every character read; stage-cases.ts peeks
  render(screen(<PinyinFade known={new Set(Array.from(clue.before + clue.word + clue.after))} on><UseQuestion item={clue} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} /></PinyinFade>), app);
}
else if (which === 'intro-family') {
  // 「一家人」 on the 认新字 card with its 成语 too (spec 2026-10-12 §5): the fullest card
  const words = builtinWords(0);
  const w = words.find((x) => x.text === '生')!;
  render(screen(<PinyinFade known={new Set('男女气先日')} on><FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={introIdiom(w, idiomsFor(w, 3, words))} knownChars={new Set('男女气先日')} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'family') {
  // 找一家人 (spec 2026-10-12 §5): 生 among 星星, 出去, 在家, 坏人
  const w = builtinWords(0).find((x) => x.text === '生')!;
  render(screen(<FamilyQuestion board={familyBoard(w, new Set('男女气先口出学家人'), mulberry32(1))!} kid={DEFAULT_KID} onDone={() => {}} />), app);
}
```

- [ ] **Step 2: Add the checks to `scripts/stage-cases.ts`**

Add after the `cardClipped` helper:

```ts
/** Nothing in a feedback sheet's explanation past the sheet, and the sheet on the screen (spec 2026-10-12 §3's why-lines). */
const sheetFits = (page: import('playwright-core').Page, name: string) => page.evaluate((n) => {
  const sheet = document.querySelector('.sheet')?.getBoundingClientRect();
  if (!sheet) return [`${n}: no sheet`];
  const out: string[] = [];
  if (sheet.top < -1 || sheet.bottom > innerHeight + 1) out.push(`${n}: the sheet runs off the screen (${Math.round(sheet.top)}–${Math.round(sheet.bottom)})`);
  for (const el of document.querySelectorAll('.sheet__detail *')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.left < sheet.left - 2 || r.right > sheet.right + 2 || r.bottom > sheet.bottom + 2)) { out.push(`${n}: cut off in the sheet: ${(el.textContent ?? '').trim().slice(0, 12)}`); break; }
  }
  return out;
}, name);
```

Insert before the line `  await page.goto(\`file://${dir}/index.html?case=build\`);` (the one followed by `for (let i = 0; i < 6 …`):

```ts
  // cards that teach (spec 2026-10-12 §7): the why-sheets, a faded sentence with a peek, the 一家人 row, the family question
  for (const [c, wrong] of [['why-look', '.choice:text-is("睛")'], ['why-pinyin', '.choice:text-is("qīng")']] as const) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    await page.click(wrong);
    await page.waitForTimeout(1600); // the pinyin and English come 1 s after the characters
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    if (!(await page.$('.sheet .why'))) problems.push(`${size.name} ${c}: no why-line on the sheet`);
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)), ...(await sheetFits(page, `${size.name} ${c}`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=fade-peek`);
    await page.waitForTimeout(300);
    if (!(await page.$('.meaning-cue .label__cell--hidden'))) problems.push(`${size.name} fade-peek: no faded pinyin`);
    await page.click('.meaning-cue .label__cell--hidden >> nth=0');
    await page.waitForTimeout(200);
    const peek = await page.$eval('.label__cell--peek .label__py', (e) => e.textContent ?? '').catch(() => '');
    if (!peek) problems.push(`${size.name} fade-peek: a tap showed no pinyin`);
    await page.screenshot({ path: `fit-shots/stage-cases/fade-peek-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} fade-peek`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=intro-family`);
    await page.waitForTimeout(2400); // its pinyin comes 2 s after the character
    await page.screenshot({ path: `fit-shots/stage-cases/intro-family-${size.name}.png` });
    if ((await page.$$('.family__word')).length < 2) problems.push(`${size.name} intro-family: no 一家人 row`);
    problems.push(...(await cardClipped(page, `${size.name} intro-family`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=family`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/family-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} family`)));
    await page.click('.choice:text-is("星星")');
    await page.click('.choice:text-is("先生")');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/family-wrong-${size.name}.png` });
    if (!(await page.$('.family-sum__row.is-missed'))) problems.push(`${size.name} family: the miss is not explained`);
    problems.push(...(await cardClipped(page, `${size.name} family wrong`)), ...(await sheetFits(page, `${size.name} family wrong`)));
  }
```

- [ ] **Step 3: Type-check and run every test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (rerun a file alone if a slow rendered test timed out under load).

- [ ] **Step 4: Run the stage cases in WebKit**

Run: `npx tsx scripts/stage-cases.ts`
Expected: `stage cases: ok`. Exit 2 means WebKit is missing: stop and ask the user before `npx playwright-core install webkit`. Look at `fit-shots/stage-cases/{why-look,why-pinyin,fade-peek,intro-family,family,family-wrong}-*.png` by eye: the right character first, the differing part highlighted, the faded syllables' slots kept with one peeking, the 一家人 row on one line on the iPad (two words on a phone), six tiles in two rows of three.

- [ ] **Step 5: Run the fit sweep and the build**

Run: `npm run fit`
Expected: the sweep ends with no `FAIL` lines, then `stage cases: ok`, and the story walk passes. Then run `npm run build` — Expected: the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts
git commit -m "test: WebKit cases for why-sheets, faded pinyin and word families

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

- **Spec coverage:** §3 look-alike (Tasks 1–2: listen, 组词 gap, 钓鱼, fit with single characters, and Task 6's family miss), pinyin slips (Tasks 1–2), meaning hint (Task 2), character first 1 s with reduced motion (Task 2); §4 rule, mechanism, peek, applies-to list, never-faded list, 2 s new-word pinyin, writing cue (Tasks 3–4), switch (Tasks 3, 7); §5 `familyOf` (Task 5), 一家人 row (Task 5), 找一家人 prompt, board, correct, feedback, eligibility, ≤ 2 replacing word/pair, grading (Task 6); §6 no migration (absent = on, tested in Task 4; `'family'` only from `withFamily`); §7 every listed unit, rendered and WebKit test (Tasks 1–8).
- **Placeholders:** none; every code step has its code.
- **Types:** `FamilyWord` (Task 5) is reused by `FamilyBoard` / `FamilyDistractor` (Task 6); `PinyinSlip` fields (`partReading`, `[initial, final]`) match `PinyinWhy`; `planPractice`'s new last parameter `known` matches the test call `planPractice(rec, rungs, byId, words, false, mulberry32(2), new Map(), 1, false, new Set(…))` and `SessionScreen`; `Label`'s `fade` / `peek` are used as defined.
- **Measured values** (throwaway scripts against the content, deleted): every `differingParts`, `pinyinSlip`, `soundParts`, `familyOf`, `familyDistractors` and board expectation above; the round with seed 2 (`family, word, family, word, pair`); 晴's four-option pool (睛 静 精) and 请's top trap qīng always offered; the coverage numbers in the Rulings.
