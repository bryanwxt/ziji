# Listening placement and the early town map (Word Thief sub-project 2c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placement now also finds his **listening level**: he hears a word and picks its meaning, and the walk through school order places his Hear rung as well as his Read rung. Home gets a plain map of 字己镇: nine places, each lit by the words that belong to it.

**Architecture:**
- **Placement (spec §3.5).**
  - A new question style, `hear` (听一听), replaces the old `listen` style. In `listen`, he heard a character and picked its *characters*, which really tested reading. In `hear`, he hears a word and picks its *English meaning*, as the Hear rung does (`meaningChoices`).
  - The words come from the band: its characters plus the ladder 词语 that arrive with them (a ladder word's rank is its last character's rank plus k/1000).
  - The walk itself is unchanged: bands, the warm-up, 4 questions a visit, the up and down moves, and the 不知道 run.
  - With a voice, every visit has exactly one `hear`, one `fit` and two reading questions (`read` or `fill`). Without a voice there is no `hear`, so a visit is as now without `listen`.
  - `placementLevels` gains `listening`. It is the highest band where at least half of his `hear` answers are right, or -1 when there were none. Reading now counts only `read` and `fill`.
- **Applying it.**
  - `placementIds` gains `heardIds`: the hearable characters up to the listening level, plus every word he heard right above it, ladder words included.
  - `applyPlacement` seeds a known `hear` card for each, marked `passed` (the "placement guess"). Its first recheck is spread over days 7–28, exactly as reading placement does now: that is the "first real recheck confirms it".
  - A re-run replaces unpractised hear cards the same way it replaces meaning cards. `queueHearChecks` still queues checks for words read but not placed as heard.
- **Town (spec §3.7).**
  - `src/town/town.ts` lists the nine places of spec §5.9 with six in-range words each.
  - `placeLight(know, place)` gives each word a window state: 0 dark, 1 heard (Hear passed), 2 owned. The place is `part` lit when any window is ≥1, and `full` when every word is owned.
  - `TownMap` draws a plain SVG skyline strip in Home's card column. It is not interactive in 2c; sub-project 3 replaces it.

**Tech Stack:** Preact + TypeScript, idb, ts-fsrs, vitest + fake-indexeddb (+ jsdom), playwright-core WebKit (`npm run fit`).

**Spec:** `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §3.5 (placement), §3.7 (early town map), §5.9 (the places), §8 (testing). Built on plans 2a (`2026-10-06-ziji-word-ladder-engine.md`, deployed e196791) and 2b (`2026-10-06-ziji-understand-rung.md`, deployed bcfd6a8).

## Global Constraints

- **The walk is unchanged:** BAND_SIZE 100, START_BAND 6, PER_VISIT 4, MAX_QUESTIONS 40, WARMUP 3, LOW_START 2, DONT_KNOW_RUN 3. The warm-up stays as reading questions from band 0. 不知道 stays the quiet button and counts as a miss (spec §3.5: "The 不知道 handling and banding stay as they are").
- **Placement never shows right or wrong** (spec §19 part 6 and §14 of the old spec). That includes `hear` questions.
- **A placement guess** is a seeded known card: `seededKnownCard`, with the first recheck spread over days 7–28 and at most 30 a day (`seedPlacementCards`), and `passed: now`. Hear guesses use the same function with kind `'hear'`.
- **Only hearable words get Hear guesses:** `canAskRung(word, 'hear')`, which means the word has an English meaning.
- **No voice:** no `hear` questions are asked, `listening` is -1, and nothing is placed as heard. Lessons and placement still finish.
- **His screens:** Chinese only, no emoji. The `hear` choices are English, as on the Hear rung (spec §3.2), and nowhere else on the placement screen. Town names are Chinese.
- **Town words:** each place has exactly 6 words; every word exists, is hearable and is in 一上–二下; no word is in two places. This is pinned by a content test.
- **Reduced motion:** the town has no animation at all.
- **Layout:** every layout change is checked in WebKit with `npm run fit` (0 problems). Use `FIT_ONLY=home` or `FIT_ONLY=placement` while iterating.
- **Before each push,** `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` must pass. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pushing to main needs the parent's approval in chat.

## Review Focus

1. **A re-run of placement on a device that already has practised hear cards.** A practised hear card is never deleted or re-seeded. An unpractised queued check for a word now placed as heard becomes a placement guess. Test: Task 3, "a re-run keeps practised hear cards and upgrades queued checks".
2. **The no-voice path.** No `hear` question, a listening level of -1, no hear guesses, and the result screen shows no 听. Tests: Task 2, "no voice, no 听一听"; Task 4, "with no voice the result shows no 听".
3. **A heard-but-not-read character starts his ladder, not his intro.** `started` in plan.ts already counts a hear card. Test: Task 3, "a heard-only character is begun: lessons don't introduce it again".
4. **The town on a phone in Safari (390×664).** Home's cards, path and Truffle must still fit. This is checked by `FIT_ONLY=home npm run fit` in Task 6, with the fallback ruling written there.
5. **Ladder words placed as heard have no stored Word record.** `seedPlacementCards` must find them through `ladderWords()`, and `summarize` and the town must count them. Test: Task 3, "a ladder word heard right above the level gets a hear guess".

---

## File map

| File | Change |
|---|---|
| `src/placement/walk.ts` | `Style` `'listen'`→`'hear'`; `READING_STYLES = ['read','fill']`; `placementLevels` → `{reading, understanding, listening}` |
| `src/placement/questions.ts` | `hear` question (meaning choices); `hearBand(band)`; `visitStyles` with exactly one `hear` when voiced |
| `src/placement/placement.ts` | `seedPlacementCards` kind may be `'hear'` |
| `src/placement/apply.ts` | `placementIds` → `heardIds`; `PlacementOutcome.heardIds?/listening?`; hear guesses; re-run replacement |
| `src/types.ts` | `PlacementResult.listening?: number` |
| `src/app/PlacementScreen.tsx` | the `hear` UI, bubble, result line with 听 |
| `src/parent/SkillsPanel.tsx` | "Listening: …" in the placement line |
| `src/stats/stats.ts` | `Knowledge.passedRungs` |
| `src/town/town.ts` (new) | `PLACES`, `placeLight` |
| `src/town/TownMap.tsx` (new) | the plain map |
| `src/app/HomeScreen.tsx`, `src/styles.css` | the map on Home |
| tests | `walk.test.ts`, `questions.test.ts`, `apply.test.ts`, `applyLadder.test.ts`, `PlacementScreen.test.tsx`, `src/town/town.test.ts`, `src/town/TownMap.test.tsx`, `src/app/home.test.tsx` |

---

### Task 1: The walk's `hear` style and the listening level

**Files:**
- Modify: `src/placement/walk.ts:13-14`, `src/placement/walk.ts:84-98`
- Test: `src/placement/walk.test.ts`

**Interfaces:**
- Produces:
  - `export type Style = 'read' | 'hear' | 'fill' | 'fit'`;
  - `export const READING_STYLES: Style[] = ['read', 'fill']`;
  - `placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number; listening: number }`.

- [ ] **Step 1: Write the failing tests.** In `walk.test.ts`:
  - Replace every `'listen'` with `'read'` in the existing fixtures (lines 62–64 and 72), and `listen: 0.25` in `CHANCE` (line 77) with `hear: 0.25`.
  - Update the existing `toEqual` expectations to include `listening: -1`.
  - Then add:

```ts
describe('the listening level (spec 2026-10-06 §3.5)', () => {
  const at = (band: number, style: Style, correct: boolean): WalkAnswer => ({ band, style, wordId: `b:${band}${style}${Math.random()}`, correct });
  it('is the highest band where half his 听一听 answers are right', () => {
    const r = placementLevels([at(5, 'hear', true), at(5, 'read', true), at(6, 'hear', true), at(6, 'hear', false), at(7, 'hear', false), at(7, 'read', false)]);
    expect(r.listening).toBe(6);
  });
  it('can be above his reading: he hears more than he reads', () => {
    const r = placementLevels([at(6, 'read', false), at(6, 'fill', false), at(6, 'hear', true), at(7, 'read', false), at(7, 'hear', true)]);
    expect(r.reading).toBe(5);
    expect(r.listening).toBe(7);
  });
  it('a 听一听 answer says nothing about reading', () => {
    const r = placementLevels([at(6, 'hear', true), at(6, 'hear', true), at(6, 'read', false)]);
    expect(r.reading).toBe(5);
  });
  it('is -1 with no 听一听 answers at all (no voice)', () => {
    expect(placementLevels([at(6, 'read', true), at(6, 'fill', true)]).listening).toBe(-1);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/placement/walk.test.ts`
  Expected: FAIL. There are type errors on `'hear'`, and `listening` is undefined.

- [ ] **Step 3: Implement.** In `walk.ts`:

```ts
export type Style = 'read' | 'hear' | 'fill' | 'fit'; // 读一读 听一听 补一补 选一选; 听一听 = hear a word, pick its meaning (spec 2026-10-06 §3.5)
export const READING_STYLES: Style[] = ['read', 'fill'];
```

Replace `placementLevels`:

```ts
/**
 * The three results (spec §19 part 6; 2026-10-06 §3.5). Reading holds in a band when 2/3 of its 读一读/补一补 answers are right;
 * understanding (选一选) when half are, never above reading; listening (听一听) when half are, on its own — he may hear more than he
 * reads. Each level is the highest band that holds; bands below the first one visited count as held. -1 = none (no 听一听: -1).
 */
export function placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number; listening: number } {
  const bands = [...new Set(answers.map((a) => a.band))].sort((x, y) => x - y);
  if (!bands.length) return { reading: -1, understanding: -1, listening: -1 };
  const group = (s: Style) => (s === 'fit' ? 'fit' : s === 'hear' ? 'hear' : 'read');
  const holds = (band: number, g: string, need: number) => {
    const xs = answers.filter((a) => a.band === band && group(a.style) === g);
    return xs.length > 0 && share(xs) >= need;
  };
  const top = (g: string, need: number, cap: number) => {
    const held = bands.filter((b) => b <= cap && holds(b, g, need));
    return held.length ? Math.max(...held) : Math.min(cap, bands[0]! - 1);
  };
  const reading = top('read', 2 / 3, Infinity);
  const listening = answers.some((a) => a.style === 'hear') ? top('hear', 0.5, Infinity) : -1;
  // a lucky 选一选 in a band he can't read says nothing: understanding looks only at bands he reads
  return { reading, understanding: top('fit', 0.5, reading), listening };
}
```

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/placement/walk.test.ts`
  Expected: PASS. `tsc` will now fail in `questions.ts` and `PlacementScreen.tsx` on `'listen'`. Tasks 2 and 4 fix that, so commit with the walk tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/placement/walk.ts src/placement/walk.test.ts
git commit -m "placement: 听一听 becomes hear-and-pick-the-meaning; a listening level (2c §3.5)"
```

### Task 2: The `hear` question and visits

**Files:**
- Modify: `src/placement/questions.ts`
- Test: `src/placement/questions.test.ts`

**Interfaces:**
- Consumes: `Style` and `READING_STYLES` from Task 1. Also `meaningChoices(word, pool, rng): string[] | null` and `firstSense(m)` from `src/activities/flashcards/distractors.ts`, `cardMeaning` from `src/content/glossary.ts`, and `ladderWords()` from `src/content/ladder.ts`.
- Produces:
  - the `PlacementQuestion` variant `{ style: 'hear'; wordId: string; text: string; answer: string; options: string[] }` (answer = the English first sense);
  - `hearBand(band: Word[]): Word[]`;
  - `visitStyles(prev: Style | null, canHear: boolean, rng: Rng): Style[]`.

- [ ] **Step 1: Write the failing tests.** In `questions.test.ts`:
  - Replace the `听一听: 4 characters…` test, and update the `no voice` and `every band` tests:

```ts
  it('听一听: he hears a word and picks its English meaning from 4', () => {
    const q = buildQuestion('hear', byText.get('门')!, pool, mulberry32(1))!;
    if (q.style !== 'hear') throw new Error(q.style);
    expect(q.answer).toBe(firstSense(cardMeaning(byText.get('门')!)!));
    expect(q.options).toContain(q.answer);
    expect(new Set(q.options).size).toBe(4);
  });
  it('听一听 asks words, not only characters: the band brings its 词语 (spec 2026-10-06 §3.5)', () => {
    const band = rankBands(pool)[2]!;
    const words = hearBand(band);
    expect(words.some((w) => w.id.startsWith('w:'))).toBe(true);
    const ranks = new Set(band.map((w) => w.rank));
    for (const w of words) expect(ranks.has(Math.floor(w.rank!))).toBe(true);
  });
  it('with a voice a visit has exactly one 听一听, one 选一选 and two reading questions, never the same twice in a row', () => {
    for (let seed = 1; seed < 40; seed++) {
      const v = visitStyles('read', true, mulberry32(seed));
      expect(v).toHaveLength(4);
      expect(v.filter((s) => s === 'hear')).toHaveLength(1);
      expect(v.filter((s) => s === 'fit')).toHaveLength(1);
      expect(v.filter((s) => s === 'read' || s === 'fill')).toHaveLength(2);
      const all: Style[] = ['read', ...v];
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });
  it('no voice, no 听一听', () => {
    for (let seed = 1; seed < 30; seed++) expect(visitStyles(null, false, mulberry32(seed))).not.toContain('hear');
  });
```

  - In `every band can ask every style`, use `['read', 'hear', 'fill', 'fit']`, and for `'hear'` expect `hearBand(band).some((w) => w.id === q.wordId)`.
  - Delete the old `a visit mixes 4 styles` test; the voiced test above replaces it.
  - Import `firstSense` from `../activities/flashcards/distractors` and `cardMeaning` from `../content/glossary`.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/placement/questions.test.ts`
  Expected: FAIL. `hearBand` is not exported, and `'hear'` is not handled.

- [ ] **Step 3: Implement.** In `questions.ts`:
  - Remove the `listen` variant and its `case`.
  - Remove the now-unused `pickCharacterDistractors` import (keep `pickPinyinDistractors`).
  - Add:

```ts
import { firstSense, meaningChoices } from '../activities/flashcards/distractors';
import { cardMeaning } from '../content/glossary';
import { ladderWords } from '../content/ladder';
import { canAskRung } from '../ladder/rungs';
// in the union:
  | { style: 'hear'; wordId: string; text: string; answer: string; options: string[] } // 听一听: Truffle says a word → pick its meaning

/** A band's words to hear: its characters and the 词语 that arrive with them (a ladder word's rank is its last character's + k/1000). */
export function hearBand(band: Word[]): Word[] {
  const ranks = new Set(band.map((w) => w.rank));
  return [...band, ...ladderWords().filter((w) => ranks.has(Math.floor(w.rank!)))].filter((w) => canAskRung(w, 'hear'));
}
// in buildQuestion:
    case 'hear': {
      const options = meaningChoices(word, pool, rng);
      return options ? { style, wordId: word.id, text: word.text, answer: firstSense(cardMeaning(word)!), options } : null;
    }
```

  - In `nextQuestion`, take the candidates from `hearBand(band)` when `style === 'hear'`. If none is buildable, the existing `read` fallback still applies:

```ts
export function nextQuestion(band: Word[], style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const from = style === 'hear' ? hearBand(band) : band;
  const fresh = shuffle(from.filter((w) => !used.has(w.id)), rng);
  const words = fresh.length ? fresh : shuffle(from.length ? from : band, rng);
  for (const w of words.slice(0, 25)) {
    const q = buildQuestion(style, w, pool, rng);
    if (q) return q;
  }
  const reading = shuffle(band, rng);
  for (const w of reading) {
    const q = buildQuestion('read', w, pool, rng);
    if (q) return q;
  }
  const w = reading[0]!;
  return { style: 'read', wordId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
```

  - Replace `visitStyles`:

```ts
/** A visit's 4 styles (spec 2026-10-06 §3.5): with a voice one 听一听, one 选一选 and two of 读一读/补一补; without, one 选一选 and three
 *  reading questions. Never the same style twice in a row, counting the last visit's last style. */
export function visitStyles(prev: Style | null, canHear: boolean, rng: Rng): Style[] {
  const pickReading = () => READING_STYLES[Math.floor(rng() * READING_STYLES.length)]!;
  for (let tries = 0; tries < 200; tries++) {
    const v: Style[] = canHear ? ['hear', 'fit', pickReading(), pickReading()] : ['fit', pickReading(), pickReading(), pickReading()];
    const order = shuffle(v, rng);
    const all = prev ? [prev, ...order] : order;
    if (all.every((s, i) => i === 0 || s !== all[i - 1])) return order;
  }
  return canHear ? (prev === 'read' ? ['fill', 'hear', 'read', 'fit'] : ['read', 'hear', 'fill', 'fit']) : prev === 'read' ? ['fill', 'read', 'fit', 'read'] : ['read', 'fill', 'fit', 'read'];
}
```

  - `READING_STYLES` stays imported. `rankBands` filters `source === 'builtin'`, so ladder words never enter the bands themselves.

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/placement/questions.test.ts src/placement/walk.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/placement/questions.ts src/placement/questions.test.ts
git commit -m "placement: 听一听 asks a band's words for their meaning; one per voiced visit (2c §3.5)"
```

### Task 3: Placing the Hear rung

**Files:**
- Modify: `src/placement/apply.ts`, `src/placement/placement.ts:11`, `src/types.ts:106-111`
- Test: `src/placement/applyLadder.test.ts`, `src/placement/apply.test.ts:77-79` (`'listen'` → `'read'` in fixtures)

**Interfaces:**
- Consumes: `placementLevels` (with `listening`) from Task 1.
- Produces:
  - `placementIds(bands, answers): { readingIds; understandingIds; heardIds: string[]; missed }`;
  - `PlacementOutcome` gains `heardIds?: string[]` and `listening?: number`;
  - `PlacementResult.listening?: number`;
  - `seedPlacementCards(words, ids, now, kind: 'recognise' | 'meaning' | 'hear')`.

- [ ] **Step 1: Write the failing tests.** Append these to `applyLadder.test.ts` (it runs in a node environment):

```ts
import { ladderWords } from '../content/ladder';
import { buildSessionPlan } from '../session/plan';
import { getSettings, putCards } from '../store/repo';
import { placementIds } from './apply';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS } from '../types';

describe('placing the Hear rung (spec 2026-10-06 §3.5)', () => {
  it('words placed as heard get a passed hear guess, first rechecked from day 7', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ws.map((w) => w.id), missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    const hear = (await allCards(db)).filter((c) => c.kind === 'hear');
    expect(hear.map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
    for (const c of hear) {
      expect(c.passed).toBe(now.getTime());
      expect(c.fsrs.due.getTime() - now.getTime()).toBeGreaterThanOrEqual(7 * 86_400_000 - 3_600_000);
    }
    expect((await getSettings(db)).placementResult!.listening).toBe(0);
  });
  it('a ladder word heard right above the level gets a hear guess', async () => {
    const db = await freshDb();
    const lw = ladderWords()[0]!;
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: [lw.id], missed: [], reading: -1, understanding: -1, listening: -1 }, now);
    expect((await allCards(db)).find((c) => c.id === `${lw.id}:hear`)?.passed).toBe(now.getTime());
  });
  it('a re-run keeps practised hear cards and upgrades queued checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now); // queued, unpractised checks
    const practised = { ...makeCard('b:大', 'hear', now), fsrs: { ...makeCard('b:大', 'hear', now).fsrs, reps: 3 } };
    await putCards(db, [practised]);
    await addReviewLog(db, { cardId: 'b:大:hear', wordId: 'b:大', kind: 'hear', at: now.getTime(), rating: 3, correct: true, responseMs: 1500 });
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], heardIds: ws.map((w) => w.id), missed: [], reading: 0, understanding: -1, listening: 0 }, now);
    const byId = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(byId.get('b:门:hear')!.passed).toBe(now.getTime()); // the queued check became a placement guess
    expect(byId.get('b:大:hear')!.fsrs.reps).toBe(3); // practised: untouched
  });
  it('placementIds: hearable characters up to the listening level, plus words heard right above it', () => {
    const bands = [[makeWord('门', { rank: 0 })], [makeWord('大', { rank: 1 })], [makeWord('小', { rank: 2 })]];
    const ids = placementIds(bands, [
      { band: 0, style: 'hear', wordId: 'b:门', correct: true }, { band: 1, style: 'hear', wordId: 'w:大门', correct: false },
      { band: 2, style: 'hear', wordId: 'w:小门', correct: true }, { band: 2, style: 'hear', wordId: 'b:小', correct: false }, { band: 2, style: 'hear', wordId: 'b:x', correct: false },
    ]);
    expect(ids.heardIds.sort()).toEqual(['b:门', 'w:小门']);
  });
  it('a heard-only character is begun: lessons don\'t introduce it again', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ['b:门'], missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: ws, settings: { ...DEFAULT_SETTINGS, newPerDay: 5 }, now });
    expect(plan.newWordIds).toEqual(['b:大']);
  });
});
```

  - Also import `addReviewLog` from `../store/repo`.
  - Use whatever `freshDb` and `putWords` imports the file already has.
  - In the `placementIds` test, the band of a ladder word comes from the answer's `band`, not from the word, so `w:` ids need no Word record.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/placement/applyLadder.test.ts`
  Expected: FAIL. `heardIds` is not used, and there are no passed hear cards.

- [ ] **Step 3: Implement.**
  - `src/types.ts`, `PlacementResult`: add `listening?: number; // band index of his listening level, -1 none (spec 2026-10-06 §3.5); absent before 2c`.
  - `placement.ts`: `kind: 'recognise' | 'meaning' | 'hear' = 'recognise'`.
  - `apply.ts`:

```ts
export interface PlacementOutcome { readingIds: string[]; understandingIds: string[]; heardIds?: string[]; missed: string[]; reading: number; understanding: number; listening?: number }

export function placementIds(bands: Word[][], answers: WalkAnswer[]): { readingIds: string[]; understandingIds: string[]; heardIds: string[]; missed: string[] } {
  const { reading, understanding, listening } = placementLevels(answers);
  const upTo = (n: number) => bands.slice(0, n + 1).flat().map((w) => w.id);
  const group = (s: Style) => (s === 'fit' ? 'fit' : s === 'hear' ? 'hear' : 'read');
  const rightAbove = (n: number, g: string) => answers.filter((a) => a.correct && a.band > n && group(a.style) === g).map((a) => a.wordId);
  const readingIds = [...new Set([...upTo(reading), ...rightAbove(reading, 'read')])];
  const read = new Set(readingIds);
  const understandingIds = [...new Set([...upTo(understanding), ...rightAbove(understanding, 'fit')])].filter((id) => read.has(id));
  const heardIds = [...new Set([...upTo(listening), ...rightAbove(listening, 'hear')])]; // hearable ones only are placed (applyPlacement)
  const missed = [...new Set(answers.filter((a) => !a.correct).map((a) => a.wordId))];
  return { readingIds, understandingIds, heardIds, missed };
}
```

  Note: when `listening` is -1 and nothing was heard, `upTo(-1)` is `[]`.

  In `applyPlacement`:

```ts
  const all = [...words, ...ladderWords()]; // a 词语 heard right has no stored record (review focus 5)
  const byId = new Map(all.map((w) => [w.id, w]));
  const heard = new Set((r.heardIds ?? []).filter((id) => { const w = byId.get(id); return !!w && canAskRung(w, 'hear'); }));
  const supported = (c: CardRecord) =>
    c.kind === 'recognise' ? read.has(c.wordId)
    : c.kind === 'hear' ? read.has(c.wordId) || heard.has(c.wordId) // a listening check goes with its reading, or is placed
    : c.kind === 'meaning' ? understood.has(c.wordId) || meaningNow.has(c.wordId) : true;
  // unpractised meaning cards are always re-seeded from this result; so are unpractised hear cards of words placed as heard
  const replaced = (c: CardRecord) => c.kind !== 'write' && !practised(c) && (!supported(c) || c.kind === 'meaning' || (c.kind === 'hear' && heard.has(c.wordId)));
  ...
  const seeds = [
    ...seedPlacementCards(words, r.readingIds, now, 'recognise').map(passed),
    ...seedPlacementCards(all, [...heard], now, 'hear').map(passed), // a placement guess the first recheck confirms (§3.5)
    ...
  ]
  ...
  placementResult: { at: now.getTime(), reading: r.reading, understanding: r.understanding, listening: r.listening ?? -1, missed: r.missed, worldBase }
```

  - Keep the existing `hasCue` using the same `byId`.
  - Imports: `ladderWords` from `../content/ladder`, `canAskRung` from `../ladder/rungs`, and `type Style` from `./walk`.
  - The `practised` check uses `byKind.get('hear')`. Confirm that `practisedByKind` keys by log kind and that hear logs have kind `'hear'`. If not, record a Ruling.
  - In `apply.test.ts:77-79`, change the `'listen'` fixtures to `'read'`.

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/placement`
  Expected: PASS. All placement tests are green.

- [ ] **Step 5: Commit.**

```bash
git add src/placement src/types.ts
git commit -m "placement: words placed as heard get a passed Hear guess, rechecked from day 7 (2c §3.5)"
```

### Task 4: The placement screen and the parent's line

**Files:**
- Modify: `src/app/PlacementScreen.tsx`, `src/parent/SkillsPanel.tsx:94`, `src/styles.css` (placement block)
- Test: `src/app/PlacementScreen.test.tsx`

**Interfaces:**
- Consumes: the `hear` question (Task 2); `placementIds` and `placementLevels` with listening (Tasks 1 and 3).
- Produces: `[data-style="hear"]` on `.placement`, and `.placement__choices--meaning` for the English choices.

- [ ] **Step 1: Write the failing tests.** Add to `PlacementScreen.test.tsx`:

```ts
describe('听一听 in placement (spec 2026-10-06 §3.5)', () => {
  it('with a voice he hears words and picks their English meaning; the result shows 听', async () => {
    const { speak } = await import('../audio/speech');
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice seed={SEED} />, app);
    let heardQs = 0;
    await walkThrough(() => document.querySelector<HTMLElement>('[data-answer="true"]')!, () => {
      if (document.querySelector('.placement[data-style="hear"]')) {
        heardQs++;
        expect(document.querySelectorAll('.placement__choices--meaning .choice')).toHaveLength(4);
        expect(bubble()).toBe('听一听，是什么意思？');
      }
    });
    expect(heardQs).toBeGreaterThan(3);
    expect(vi.mocked(speak)).toHaveBeenCalled();
    expect(screen.getByText(/听：/)).toBeTruthy();
    const s = await getSettings(app.db);
    expect(s.placementResult!.listening).toBeGreaterThan(5);
    expect((await allCards(app.db)).some((c) => c.kind === 'hear' && c.passed)).toBe(true);
  }, 30_000);
  it('with no voice the result shows no 听', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={SEED} />, app);
    await walkThrough(dontKnow, () => expect(document.querySelector('.placement[data-style="hear"]')).toBeNull());
    expect(screen.queryByText(/听：/)).toBeNull();
    expect((await getSettings(app.db)).placementResult!.listening).toBe(-1);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/app/PlacementScreen.test.tsx`
  Expected: FAIL, with no `data-style` and no 听 line. A `tsc` error on `'listen'` is also an expected failure.

- [ ] **Step 3: Implement.** In `PlacementScreen.tsx`:
  - `BUBBLE`: replace `listen: …` with `hear: '听一听，是什么意思？'`.
  - Speak on show: `if (q.style === 'hear') speak(q.text);`.
  - Root: add `data-style={question?.style}` to the `.placement` div.
  - Prompt: `{q.style === 'hear' && <SpeakButton text={q.text} big />}`.
  - Choices class: `q.style === 'read' ? 'placement__choices--pinyin' : q.style === 'hear' ? 'placement__choices--meaning' : 'placement__choices--hanzi'`.
  - Options: `{q.style === 'hear' && q.options.map((o) => option(o, o === q.answer))}`. These are English, so not `hanzi`; the child sees English only here.
  - `result` state type: add `listening: number`. `skip()` passes `{ reading: -1, understanding: -1, listening: -1 }` and `heardIds: []`.
  - The result line: `` `${result.listening >= 0 && voice ? `听：${levelName(bands, result.listening)} · ` : ''}读：… · 懂：…` ``. When listening is -1 but `voice` is on, show `听：还没开始` so a voiced child always sees the three parts.
  - Update the component's doc comment: "three results: listening, reading, understanding".
  - CSS (`styles.css`, next to `.placement__choices--pinyin`): `.placement__choices--meaning .choice { font-size: 20px; line-height: 1.2; padding: 8px 10px; }`, with no `nowrap`, so long English meanings wrap inside the fixed 2×2 grid.
  - `SkillsPanel.tsx:94`: `` `… — ${p.listening !== undefined && p.listening >= 0 ? `Listening: ${hsk(p.listening)} · ` : ''}Reading: …` ``.

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/app/PlacementScreen.test.tsx src/app/placementSave.test.tsx src/parent && npx tsc --noEmit -p .`
  Expected: PASS, with tsc clean.

- [ ] **Step 5: Check it in WebKit.**
  Run: `FIT_ONLY=placement npm run fit`
  Expected: 0 problems. The placement flow's "question size changed between questions" check covers the `hear` question's 2×2 grid.
  If English wraps past the grid on `iphone-se`, lower the `--meaning` font to 18px and record a Ruling.

- [ ] **Step 6: Commit.**

```bash
git add src/app/PlacementScreen.tsx src/app/PlacementScreen.test.tsx src/parent/SkillsPanel.tsx src/styles.css
git commit -m "placement: the 听一听 screen and a 听 result; the parent's Listening line (2c §3.5)"
```

### Task 5: The town's places and their light

**Files:**
- Create: `src/town/town.ts`, `src/town/town.test.ts`
- Modify: `src/stats/stats.ts` (expose `passedRungs`)

**Interfaces:**
- Consumes: `Knowledge` (`src/stats/stats.ts`), `canAskRung` and `isOwned`, and `wordTerm` from `src/content/understand.ts`.
- Produces:
  - `Knowledge.passedRungs: Map<string, Set<RungKind>>`;
  - `export interface Place { id: string; zh: string; words: string[] }`;
  - `export const PLACES: Place[]`;
  - `export type Window = 0 | 1 | 2`;
  - `export function placeLight(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, place: Place): { windows: Window[]; level: 'dark' | 'part' | 'full' }`.

- [ ] **Step 1: Write the failing tests.** Create `src/town/town.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { ladderWords } from '../content/ladder';
import { SENTENCE_TERMS, wordTerm } from '../content/understand';
import { canAskRung, type RungKind } from '../ladder/rungs';
import { PLACES, placeLight } from './town';

const all = new Map([...builtinWords(0), ...ladderWords()].map((w) => [w.id, w]));
const know = (passed: Record<string, RungKind[]>) => ({
  passedRungs: new Map(Object.entries(passed).map(([id, rs]) => [id, new Set(rs)])),
  wordsById: new Map(builtinWords(0).map((w) => [w.id, w])),
  ladderById: new Map(ladderWords().map((w) => [w.id, w])),
});

describe('字己镇 (spec 2026-10-06 §3.7, §5.9)', () => {
  it('nine places, six words each, every word real, hearable, taught by 二下 and in one place only', () => {
    expect(PLACES).toHaveLength(9);
    const seen = new Set<string>();
    for (const p of PLACES) {
      expect(p.words).toHaveLength(6);
      for (const id of p.words) {
        const w = all.get(id);
        expect(w, id).toBeTruthy();
        expect(canAskRung(w!, 'hear'), id).toBe(true);
        expect((SENTENCE_TERMS as readonly string[]).includes(wordTerm(w!.text) ?? ''), id).toBe(true);
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
  });
  it('dark with nothing heard; part lit once one word passes Hear; a window per word', () => {
    const p = PLACES[0]!;
    expect(placeLight(know({}), p)).toEqual({ windows: [0, 0, 0, 0, 0, 0], level: 'dark' });
    const one = placeLight(know({ [p.words[2]!]: ['hear'] }), p);
    expect(one.level).toBe('part');
    expect(one.windows[2]).toBe(1);
  });
  it('a word read but not yet heard does not light its window (Hear is the rung that lights)', () => {
    const p = PLACES[0]!;
    expect(placeLight(know({ [p.words[0]!]: ['read', 'use'] }), p).level).toBe('dark');
  });
  it('fully lit when he owns every one of its words', () => {
    const p = PLACES[1]!;
    const owned = Object.fromEntries(p.words.map((id) => [id, ['hear', 'understand', 'read', 'use'] as RungKind[]]));
    expect(placeLight(know(owned), p)).toEqual({ windows: [2, 2, 2, 2, 2, 2], level: 'full' });
    const allButOne = { ...owned, [p.words[0]!]: ['hear'] as RungKind[] };
    expect(placeLight(know(allButOne), p).level).toBe('part');
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/town/town.test.ts`
  Expected: FAIL, because `./town` does not exist.

- [ ] **Step 3: Implement.**
  - In `stats.ts`, add `passedRungs: Map<string, Set<RungKind>>;` to `Knowledge` and return `passedRungs` from `summarize`. It is already computed there.
  - Check: `export { type RungKind }` already comes from `../ladder/rungs`.
  - Create `src/town/town.ts`:

```ts
// The early town map (spec 2026-10-06 §3.7): 字己镇's places (§5.9), each with six words he meets in 一上–二下. A word's window lights
// when it passes Hear and glows when he owns it; a place is part lit with one heard word, fully lit when he owns all six.
// Sub-project 3 replaces this with the painted town.
import { isOwned } from '../ladder/rungs';
import type { Knowledge } from '../stats/stats';

export interface Place { id: string; zh: string; words: string[] }
export type Window = 0 | 1 | 2; // dark, heard, owned

export const PLACES: Place[] = [
  { id: 'hdb', zh: '组屋', words: ['b:家', 'b:门', 'b:窗', 'b:床', 'w:房间', 'w:电梯'] },
  { id: 'hawker', zh: '小贩中心', words: ['b:吃', 'b:饭', 'b:面', 'b:茶', 'w:好吃', 'w:咖啡'] },
  { id: 'market', zh: '巴刹', words: ['b:鱼', 'b:菜', 'b:肉', 'b:买', 'b:蛋', 'w:水果'] },
  { id: 'mrt', zh: '地铁站', words: ['b:车', 'b:站', 'b:坐', 'b:走', 'b:快', 'w:火车'] },
  { id: 'school', zh: '学校', words: ['b:书', 'b:写', 'b:读', 'w:学校', 'w:老师', 'w:同学'] },
  { id: 'playground', zh: '游乐场', words: ['b:玩', 'b:跑', 'b:跳', 'b:笑', 'b:球', 'w:朋友'] },
  { id: 'garden', zh: '花园', words: ['b:花', 'b:草', 'b:树', 'b:叶', 'b:鸟', 'b:虫'] },
  { id: 'sea', zh: '海边', words: ['b:海', 'b:沙', 'b:船', 'b:天', 'b:云', 'w:太阳'] },
  { id: 'chinatown', zh: '牛车水', words: ['b:灯', 'b:红', 'b:年', 'b:龙', 'w:月亮', 'w:新年'] },
];

export function placeLight(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, place: Place): { windows: Window[]; level: 'dark' | 'part' | 'full' } {
  const windows = place.words.map((id): Window => {
    const passed = know.passedRungs.get(id);
    const word = know.wordsById.get(id) ?? know.ladderById.get(id);
    if (!passed || !word) return 0;
    return isOwned(word, passed) ? 2 : passed.has('hear') ? 1 : 0;
  });
  return { windows, level: windows.every((w) => w === 2) ? 'full' : windows.some((w) => w > 0) ? 'part' : 'dark' };
}
```

  - Every word was probed on 2026-10-06 against `builtinWords` and `ladderWords`. Each exists, is hearable, can be asked Understand, and is in 一上–二下.
  - If the content test still rejects one, swap in another word that fits the place and passes the test, and record a Ruling. Spares: 爸爸, 妈妈 (组屋); 米饭, 鸡 (小贩中心); 果, 多少 (巴刹); 票 (地铁站); 字, 本子, 上课 (学校); 一起, 高 (游乐场); 花园, 绿, 种 (花园); 大海, 游 (海边); 月, 新年 (牛车水).

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/town src/stats && npx tsc --noEmit -p .`
  Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/town src/stats/stats.ts
git commit -m "town: 字己镇's nine places and how each word lights them (2c §3.7)"
```

### Task 6: The map on Home

**Files:**
- Create: `src/town/TownMap.tsx`, `src/town/TownMap.test.tsx`
- Modify: `src/app/HomeScreen.tsx` (the `.home__cards` block, after the goal), `src/styles.css` (the home block, ~line 775), `src/app/home.test.tsx`

**Interfaces:**
- Consumes: `PLACES` and `placeLight` (Task 5), and `data.know` (HomeScreen's `Knowledge`).
- Produces: `TownMap({ know }: { know: Knowledge })`, which renders `.town` with nine `.town__place.town__place--{dark|part|full}`, each with six `.town__win.town__win--{0|1|2}`.

- [ ] **Step 1: Write the failing tests.** Create `src/town/TownMap.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeCard } from '../test/fixtures';
import { summarize } from '../stats/stats';
import { PLACES } from './town';
import { TownMap } from './TownMap';

const now = new Date('2026-10-06T09:00:00');
describe('TownMap (spec 2026-10-06 §3.7)', () => {
  it('nine places named in Chinese, each with a window per word, lit by what he has heard and owns', () => {
    const p = PLACES[0]!;
    const heard = { ...makeCard(p.words[0]!, 'hear', now, true), passed: now.getTime() };
    const { container } = render(<TownMap know={summarize(builtinWords(0), [heard])} />);
    const places = container.querySelectorAll('.town__place');
    expect(places).toHaveLength(9);
    expect(places[0]!.classList.contains('town__place--part')).toBe(true);
    expect(places[1]!.classList.contains('town__place--dark')).toBe(true);
    expect(places[0]!.querySelectorAll('.town__win')).toHaveLength(6);
    expect(places[0]!.querySelectorAll('.town__win--1')).toHaveLength(1);
    expect(places[0]!.getAttribute('aria-label')).toBe('组屋：亮了 1 个');
    expect(container.querySelector('.town')!.textContent).toContain('字己镇');
    expect(container.textContent).not.toMatch(/[A-Za-z]/); // his screen: Chinese only
  });
  it('nothing in it moves (reduced motion or not)', () => {
    const { container } = render(<TownMap know={summarize(builtinWords(0), [])} />);
    expect(container.querySelector('animate, animateTransform, [class*="pulse"], [class*="anim"]')).toBeNull();
  });
});
```

  - In `home.test.tsx`, add: `it('shows 字己镇 on Home (spec 2026-10-06 §3.7)', …)`. It renders `HomeScreen`, waits for `今天的练习`, and expects `.home__cards .town` with 9 `.town__place`.
  - If `makeCard`'s fourth argument already sets `passed`, the spread is harmless.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/town/TownMap.test.tsx src/app/home.test.tsx`
  Expected: FAIL, because there is no `TownMap`.

- [ ] **Step 3: Implement.** Create `src/town/TownMap.tsx`:

```tsx
// 字己镇 on Home (spec 2026-10-06 §3.7): a plain skyline of its nine places; each window is one of the place's words. Not interactive.
import type { Knowledge } from '../stats/stats';
import { Label } from '../ui/Label';
import { PLACES, placeLight } from './town';

export function TownMap({ know }: { know: Knowledge }) {
  return (
    <div class="card town" role="group" aria-label="字己镇">
      <span class="label-tag town__tag">字己镇</span>
      <div class="town__row">
        {PLACES.map((p) => {
          const { windows, level } = placeLight(know, p);
          return (
            <div key={p.id} class={`town__place town__place--${level}`} role="img" aria-label={`${p.zh}：亮了 ${windows.filter((w) => w > 0).length} 个`}>
              <svg class="town__house" viewBox="0 0 40 44" aria-hidden="true">
                <path class="town__roof" d="M3 16 L20 3 L37 16 Z" />
                <rect class="town__wall" x="6" y="15" width="28" height="27" rx="2" />
                {windows.map((w, i) => (
                  <rect key={i} class={`town__win town__win--${w}`} x={10 + (i % 2) * 12} y={19 + Math.floor(i / 2) * 8} width="8" height="5" rx="1" />
                ))}
              </svg>
              <span class="town__name"><Label zh={p.zh} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

  - **Home:** import `TownMap`, and render `{data && <TownMap know={data.know} />}` inside `.home__cards`, directly after the goal block.
  - **CSS**, in the home section of `styles.css`:

```css
/* 字己镇 (spec 2026-10-06 §3.7): a plain skyline; dark places grey, a heard word's window warm, an owned one gold. Nothing moves. */
.home__cards .town { position: relative; margin-top: 8px; padding: 10px 10px 6px; }
.town__tag { position: absolute; top: -12px; left: 12px; }
.town__row { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; align-items: end; }
.town__place { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
.town__house { width: 100%; max-width: 44px; height: auto; }
.town__roof { fill: var(--line-strong); }
.town__wall { fill: var(--page); stroke: var(--line-strong); stroke-width: 1.5; }
.town__place--part .town__roof, .town__place--full .town__roof { fill: var(--orange); }
.town__place--full .town__wall { fill: var(--gold-soft); }
.town__win--0 { fill: var(--muted); }
.town__win--1 { fill: var(--gold-soft); stroke: var(--gold-edge); stroke-width: 1; }
.town__win--2 { fill: var(--gold); }
.town__name { font-size: 13px; white-space: nowrap; }
@media (max-width: 599px) { .town__name { display: none; } } /* a phone shows the skyline; the names are in each place's label */
```

  - These are `styles.css`'s existing tokens (`--page`, `--line-strong`, `--orange`, `--gold`, `--gold-soft`, `--gold-edge`, `--muted`).
  - Every colour must work on the light card; there is no dark theme on the child screens.

- [ ] **Step 4: Run to see them pass.**
  Run: `npx vitest run src/town src/app/home.test.tsx && npx tsc --noEmit -p .`
  Expected: PASS.

- [ ] **Step 5: Check it in WebKit.**
  Run: `FIT_ONLY=home npm run fit`
  Expected: 0 problems on all six sizes. Look at `fit-shots/home-*-iphone-safari.png` and `-ipad-landscape.png` yourself.
  If a phone size reports overlap or overflow, apply these in order, with a Ruling for each:
  1. Cap `.town__house` at 30px under 600px wide.
  2. Hide `.wotd__example` under 600px wide.
  3. Move the town below the path heading as a one-line strip.
  Re-run after each change.

- [ ] **Step 6: Commit.**

```bash
git add src/town src/app/HomeScreen.tsx src/app/home.test.tsx src/styles.css
git commit -m "home: a plain map of 字己镇, lit by the words he hears and owns (2c §3.7)"
```

### Task 7: Full check, then deploy

- [ ] **Step 1:** Run `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2 > .superpowers/sdd/2026-10-06-ziji-placement-town/suite.txt 2>&1; tail -5 .superpowers/sdd/2026-10-06-ziji-placement-town/suite.txt`.
  Expected: tsc is clean and every test passes.
- [ ] **Step 2:** Run `npm run fit`.
  Expected: 0 problems, including stage cases.
- [ ] **Step 3:** Do the final whole-branch review (executing-plans or SDD), then the fix pass.
- [ ] **Step 4:** Rebase onto `origin/main` (the other session also pushes to main), and run the suite again.
- [ ] **Step 5:** Ask the parent before pushing. Once they approve, push `HEAD:main` (Deploy runs on push), and watch the Deploy run until it succeeds.
