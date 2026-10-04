# Placement and Skills Implementation Plan (Plan 14)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pinyin-only placement check with an adaptive check that finds two levels, reading and understanding, using five question styles. Add a parent Skills panel that shows how each skill is going and lets the parent bring weak words forward.

**Architecture:**
- **The walk.** A pure engine in `src/placement/walk.ts` walks 30 bands of 100 characters:
  - 4 questions per visit;
  - up after 3–4 right, down after 0–1, and one more visit after a 2;
  - stops at the second turn or after 40 questions.
- **Questions.** `src/placement/questions.ts` builds the five styles from the built-in words: 读一读, 听一听, 真的假的, 补一补 and 选一选. 补一补 reuses 字辨's look-alike index, and 选一选 reuses plan 13's `fitItem`.
- **Saving.** `applyPlacement` seeds both levels:
  - words he reads and understands: known reading and meaning cards;
  - words he only reads: a known reading card and a meaning card due now.
- **Answer log.** A new `answers` store logs every 选一选/用一用 and 字辨 answer.
- **Skills panel.** It reads `answers` with the review logs for 14-day accuracy per skill, the most-missed words, and "practise more".

**Tech Stack:** Preact 10, TypeScript 5.9, idb (DB version 3), ts-fsrs, pinyin-pro, Vitest 4 (jsdom, fake-indexeddb), playwright-core 1.52 (WebKit fit sweep).

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §19 part 6 (placement, redesigned) and part 7 (Skills panel). Also §14 (placement seeding spread over days 7–28, at most 30 a day).

## Global Constraints

- **Child screens:**
  - no English and no emoji;
  - one screen (§18), with `npm run fit` at "0 with problems";
  - no right/wrong shown during the check (§14).
- The parent area keeps its English labels.
- **Nothing from the Berries packs or the school textbook in the repo.**
  - The class baselines in the Skills panel are typed in by the parent and stored on the iPad. They are never a constant in the code.
- **A re-run replaces earlier placement guesses.** Unpractised placement cards that the new result doesn't support are cleared. Practised words stay.
- Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A child who knows almost nothing.**
   - He misses the opening and every band down to band 1.
   - The check ends kindly with no cards seeded, and Home works.
   - Pinned in Task 2 ("knows nothing…") and Task 4 ("an empty result…").
2. **A child who reads everything up to the HSK 7–9 bands.** Questions for rare characters may lack a two-character word or a cue. The builder falls back to another word or style, and never shows an empty question. Pinned in Task 3 ("every band can ask…").
3. **No speech.** On an iPad without Chinese voices (`voice` false), 听一听 is never chosen. Pinned in Task 3 ("no voice, no 听一听").
4. **A re-run after weeks of lessons.**
   - Practised words keep their cards.
   - Placement-only meaning cards that the new result doesn't support are cleared.
   - Pinned in Task 4 ("a re-run…").
5. **A backup made before plan 14** (no `answers` store) restores. Settings without `placementResult` or `baselines` load. Pinned in Task 1 ("an old backup…").

---

### Task 1: The answer log (DB version 3)

**Files:**
- Modify:
  - `src/store/db.ts` (version 3: `answers` store; `LIST_STORES`);
  - `src/types.ts` (`AnswerLog`, `Skill`, `Settings.placementResult?`, `Settings.baselines?`);
  - `src/store/repo.ts` (`addAnswer`, `answersSince`);
  - `src/app/SessionScreen.tsx` (log 选一选/用一用 and 字辨 answers).
- Test: `src/store/repo.test.ts`, `src/store/backup.test.ts`, `src/app/SessionScreen.test.tsx`

**Interfaces:**
- Produces:
  - `type Skill = 'reading' | 'meaning' | 'use' | 'zibian' | 'writing'`
  - `interface AnswerLog { id?: number; at: number; wordId: string; skill: 'use' | 'zibian'; correct: boolean }`
  - `addAnswer(db, a: AnswerLog): Promise<void>`
  - `answersSince(db, sinceMs): Promise<AnswerLog[]>`
  - `interface PlacementResult { at: number; reading: number; understanding: number; missed: string[] }` (band indexes; -1 = none; missed = word ids)
  - `Settings.placementResult?: PlacementResult`
  - `Settings.baselines?: Partial<Record<Skill, number>>` (percent right on class worksheets, typed in by the parent)

- [ ] **Step 1: Write the failing tests**

```ts
// repo.test.ts — add
describe('answer log (spec §19 part 7)', () => {
  it('keeps every 选一选 and 字辨 answer, newest last, by time', async () => {
    const db = await freshDb();
    await addAnswer(db, { at: 10, wordId: 'b:很', skill: 'use', correct: true });
    await addAnswer(db, { at: 20, wordId: 'b:根', skill: 'zibian', correct: false });
    expect((await answersSince(db, 15)).map((a) => [a.wordId, a.skill, a.correct])).toEqual([['b:根', 'zibian', false]]);
  });
});
```

```ts
// backup.test.ts — add
it('an old backup made before plan 14 (no answers store) restores', async () => {
  const db = await freshDb();
  const json = await exportBackup(db, { includeMedia: false, now: 0 });
  const old = JSON.parse(json);
  delete old.stores.answers; // shape it like a backup from DB version 2
  await importBackup(db, JSON.stringify(old));
  expect(await answersSince(db, 0)).toEqual([]);
});
```

(Read `backup.ts` first. Use its real export key for the per-store rows if it isn't `stores`.)

```tsx
// SessionScreen.test.tsx — in the 选一选 describe, after the lesson ends
expect((await answersSince(app.db, 0)).filter((a) => a.skill === 'use').length).toBeGreaterThan(0);
```

- [ ] **Step 2: Run them.** `npx vitest run src/store src/app/SessionScreen.test.tsx`. Expected: FAIL (`addAnswer` is not exported).
- [ ] **Step 3: Implement.**
  - **`db.ts`:**
    - `answers: { key: number; value: AnswerLog; indexes: { byAt: number } }`;
    - `DB_VERSION = 3`, with `if (oldVersion < 3) db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');`;
    - add `'answers'` to `LIST_STORES`.
  - **`repo.ts`:**

    ```ts
    export async function addAnswer(db: AppDb, a: AnswerLog): Promise<void> {
      const { id: _id, ...rest } = a;
      await db.add('answers', rest as AnswerLog);
    }
    export const answersSince = (db: AppDb, sinceMs: number) => db.getAllFromIndex('answers', 'byAt', IDBKeyRange.lowerBound(sinceMs));
    ```

  - **`backup.ts`:** importing a backup without a store's rows leaves that store empty. It must not throw.
  - **`SessionScreen.onUseAnswer`:** when `item.wordId && !rec.free`, call `addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'use', correct })`.
  - **`onZibianAnswer`:** call `addAnswer` with `skill: 'zibian'`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: an answer log for 选一选, 用一用 and 字辨 (DB version 3)"`

### Task 2: The adaptive walk (pure)

**Files:**
- Create: `src/placement/walk.ts`
- Test: `src/placement/walk.test.ts`

**Interfaces:**
- Produces:
  - `BAND_SIZE = 100`
  - `START_BAND = 6`. This is band 7 of 30, the first HSK 3 band, just past what a P2 child usually reads.
  - `PER_VISIT = 4`
  - `MAX_QUESTIONS = 40`
  - `WARMUP = 3`
  - `type Style = 'read' | 'listen' | 'real' | 'fill' | 'fit'`
  - `READING_STYLES: Style[]`
  - `interface WalkAnswer { band: number; style: Style; wordId: string; correct: boolean }`
  - `interface WalkState { band: number; warmup: number; visit: WalkAnswer[]; answers: WalkAnswer[]; visits: Record<number, number>; direction: -1 | 0 | 1; turns: number; done: boolean }`
  - `rankBands(words: Word[]): Word[][]`, the built-in words in rank order, in bands of 100
  - `startWalk(bandCount: number): WalkState`
  - `walkStep(s: WalkState, a: Omit<WalkAnswer, 'band'>, bandCount: number): WalkState`
  - `placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/placement/walk.test.ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { placementLevels, rankBands, startWalk, walkStep, WARMUP, type Style, type WalkState } from './walk';

const ans = (correct: boolean, style: Style = 'read') => ({ style, wordId: 'x', correct });
const run = (s: WalkState, pattern: boolean[], n = 30) => pattern.reduce((st, c) => (st.done ? st : walkStep(st, ans(c), n)), s);
const warm = (n = 30) => run(startWalk(n), Array(WARMUP).fill(true), n);

describe('placement walk (spec §19 part 6)', () => {
  it('30 bands of 100 characters in rank order', () => {
    const bands = rankBands(builtinWords(0));
    expect(bands).toHaveLength(30);
    expect(bands.every((b) => b.length === 100)).toBe(true);
    expect(bands[0]![0]!.rank).toBeLessThan(bands[1]![0]!.rank!);
  });
  it('starts at band 7 after 3 unscored warm-up questions', () => {
    const s = warm();
    expect([s.band, s.answers.length]).toEqual([6, 0]);
  });
  it('steps up after 3 or 4 right, down after 0 or 1, and visits a band again after 2 (then down)', () => {
    expect(run(warm(), [true, true, true, false]).band).toBe(7);
    expect(run(warm(), [true, false, false, false]).band).toBe(5);
    const twice = run(warm(), [true, true, false, false]);
    expect(twice.band).toBe(6);
    expect(run(twice, [true, true, false, false]).band).toBe(5);
  });
  it('stops at the second turn', () => {
    let s = run(warm(), [true, true, true, true]); // up to 7
    s = run(s, [false, false, false, false]); // turn 1: down to 6
    expect(s.done).toBe(false);
    s = run(s, [true, true, true, true]); // turn 2
    expect(s.done).toBe(true);
  });
  it('stops after 40 scored questions', () => {
    let s = warm();
    for (let i = 0; i < 20; i++) s = run(s, [true, true, false, false]); // up and down forever would turn; force by alternating bands
    expect(s.answers.length).toBeLessThanOrEqual(40);
    expect(s.done).toBe(true);
  });
  it('knows nothing: walks down to the first band, misses it, and ends', () => {
    let s = run(startWalk(30), [false, false, false]);
    for (let i = 0; i < 10 && !s.done; i++) s = run(s, [false, false, false, false]);
    expect(s.done).toBe(true);
    expect(placementLevels(s.answers)).toEqual({ reading: -1, understanding: -1 });
  });
  it('reads everything: climbs past the last band and ends', () => {
    let s = warm();
    for (let i = 0; i < 30 && !s.done; i++) s = run(s, [true, true, true, true]);
    expect(s.done).toBe(true);
    expect(placementLevels(s.answers).reading).toBe(29);
  });
});

describe('placementLevels: reading and understanding', () => {
  const at = (band: number, style: Style, correct: boolean) => ({ band, style, wordId: `${band}${style}`, correct });
  it('reading = the highest band whose reading questions hold; understanding = the same for 选一选, never above reading', () => {
    const answers = [
      at(6, 'read', true), at(6, 'real', true), at(6, 'fill', true), at(6, 'fit', true),
      at(7, 'read', true), at(7, 'listen', true), at(7, 'fill', false), at(7, 'fit', false),
      at(8, 'read', false), at(8, 'real', false), at(8, 'fill', false), at(8, 'fit', true),
    ];
    expect(placementLevels(answers)).toEqual({ reading: 7, understanding: 6 });
  });
  it('bands below the first one visited count as held', () => {
    expect(placementLevels([at(6, 'read', true), at(6, 'read', true), at(6, 'real', true), at(6, 'fit', true)])).toEqual({ reading: 6, understanding: 6 });
  });
});
```

- [ ] **Step 2: Run it.** Expected: FAIL (no module).
- [ ] **Step 3: Implement**

```ts
// src/placement/walk.ts
import type { Word } from '../types';

/** The adaptive placement check (spec §19 part 6): 30 bands of 100 characters, 4 questions a visit, two results. */
export const BAND_SIZE = 100;
export const START_BAND = 6; // band 7 of 30: the first HSK 3 band, just past what a P2 child usually reads
export const PER_VISIT = 4;
export const MAX_QUESTIONS = 40;
export const WARMUP = 3; // easy reading questions first, so a nervous start doesn't skew the result

export type Style = 'read' | 'listen' | 'real' | 'fill' | 'fit';
export const READING_STYLES: Style[] = ['read', 'listen', 'real', 'fill'];

export interface WalkAnswer { band: number; style: Style; wordId: string; correct: boolean }
export interface WalkState {
  band: number; warmup: number; visit: WalkAnswer[]; answers: WalkAnswer[];
  visits: Record<number, number>; direction: -1 | 0 | 1; turns: number; done: boolean;
}

export function rankBands(words: Word[]): Word[][] {
  const ranked = words.filter((w) => w.source === 'builtin' && w.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const bands: Word[][] = [];
  for (let i = 0; i < ranked.length; i += BAND_SIZE) bands.push(ranked.slice(i, i + BAND_SIZE));
  return bands;
}

export const startWalk = (bandCount: number): WalkState =>
  ({ band: Math.min(START_BAND, bandCount - 1), warmup: 0, visit: [], answers: [], visits: {}, direction: 0, turns: 0, done: bandCount === 0 });

export function walkStep(s: WalkState, a: Omit<WalkAnswer, 'band'>, bandCount: number): WalkState {
  if (s.done) return s;
  if (s.warmup < WARMUP) return { ...s, warmup: s.warmup + 1 };
  const answer = { ...a, band: s.band };
  const visit = [...s.visit, answer];
  const answers = [...s.answers, answer];
  if (visit.length < PER_VISIT) return { ...s, visit, answers, done: answers.length >= MAX_QUESTIONS };
  const right = visit.filter((x) => x.correct).length;
  const seen = (s.visits[s.band] ?? 0) + 1;
  const move: -1 | 0 | 1 = right >= 3 ? 1 : right <= 1 ? -1 : seen >= 2 ? -1 : 0;
  const turned = move !== 0 && s.direction !== 0 && move !== s.direction;
  const turns = s.turns + (turned ? 1 : 0);
  const band = s.band + move;
  const done = turns >= 2 || answers.length >= MAX_QUESTIONS || band < 0 || band >= bandCount;
  return {
    band: Math.max(0, Math.min(bandCount - 1, band)), warmup: s.warmup, visit: [], answers,
    visits: { ...s.visits, [s.band]: seen }, direction: move === 0 ? s.direction : move, turns, done,
  };
}

/** Reading holds in a band at 2/3 of its reading-style answers; understanding (选一选) at half. Bands below the lowest visited count as held. */
export function placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number } {
  const bands = [...new Set(answers.map((a) => a.band))].sort((x, y) => x - y);
  if (!bands.length) return { reading: -1, understanding: -1 };
  const holds = (band: number, fit: boolean, share: number) => {
    const xs = answers.filter((a) => a.band === band && (a.style === 'fit') === fit);
    return xs.length > 0 && xs.filter((a) => a.correct).length / xs.length >= share;
  };
  const top = (fit: boolean, share: number) => {
    const held = bands.filter((b) => holds(b, fit, share));
    if (held.length) return Math.max(...held);
    return bands[0]! - 1; // nothing held: everything below the first band visited
  };
  const reading = top(false, 2 / 3);
  return { reading, understanding: Math.min(reading, top(true, 0.5)) };
}
```

(The "stops after 40" test reaches 40 by visiting the same band twice and stepping down. Let it run; if it turns before 40, check only `answers.length <= 40 && done`.)

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: the adaptive placement walk — 30 bands, two levels"`

### Task 3: The five question styles

**Files:**
- Create: `src/placement/questions.ts`
- Modify: `src/activities/components/zibian.ts` (export `fillChoices`)
- Test: `src/placement/questions.test.ts`

**Interfaces:**
- Consumes:
  - `pickPinyinDistractors(word, pool, rng): string[]` and `pickCharacterDistractors(word, pool, rng): Word[]` (`activities/flashcards/distractors.ts`);
  - `fitItem` (practice/useItems);
  - `lookAlikeChars` (zibian);
  - `wordsWithChar`, `HSK_WORDS` (content).
- Produces:
  - `type PlacementQuestion`:
    - `{ style: 'read'; wordId: string; text: string; answer: string; options: string[] }`
    - `| { style: 'listen'; wordId: string; text: string; options: string[] }`, where the answer is `text`
    - `| { style: 'real'; wordId: string; shown: string; real: boolean }`
    - `| { style: 'fill'; wordId: string; word: string; index: number; answer: string; options: string[] }`
    - `| { style: 'fit'; wordId: string; item: Extract<UseItem, { kind: 'fit' }> }`
  - `buildQuestion(style: Style, word: Word, pool: Word[], rng: Rng): PlacementQuestion | null`
  - `visitStyles(prev: Style | null, canListen: boolean, rng: Rng): Style[]`: 4 styles, exactly one `'fit'`, no style twice in a row (counting `prev`), no `'listen'` without voice
  - `nextQuestion(band: Word[], style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion`: tries the band's words in a random order, then falls back to `'read'`, which every built-in character can answer
  - `fillChoices(chars: string[], k: number, rng: Rng, known?: ReadonlySet<string>): string[] | null`, in zibian.ts: the answer plus 3 look-alikes that make no other HSK word there, phonetic part first

- [ ] **Step 1: Write the failing tests**

```ts
// src/placement/questions.test.ts
import { describe, expect, it } from 'vitest';
import { builtinWords, HSK_WORDS } from '../content';
import { mulberry32 } from '../lib/random';
import { buildQuestion, nextQuestion, visitStyles } from './questions';
import { rankBands } from './walk';

const pool = builtinWords(0);
const byText = new Map(pool.map((w) => [w.text, w]));

describe('placement questions (spec §19 part 6)', () => {
  it('读一读: the character and 4 pinyin choices, one right', () => {
    const q = buildQuestion('read', byText.get('静')!, pool, mulberry32(1))!;
    expect(q.style === 'read' && q.options).toContain('jìng');
    expect(q.style === 'read' && q.options).toHaveLength(4);
  });
  it('真的假的: a real HSK word with the character, or a made-up look-alike that is no word', () => {
    for (let seed = 1; seed < 20; seed++) {
      const q = buildQuestion('real', byText.get('负')!, pool, mulberry32(seed))!;
      if (q.style !== 'real') throw new Error('style');
      expect(q.shown).toContain('负');
      expect(HSK_WORDS.has(q.shown)).toBe(q.real);
    }
  });
  it('补一补: a word with the character missing and 4 look-alikes, none making another word', () => {
    const q = buildQuestion('fill', byText.get('跟')!, pool, mulberry32(2))!;
    if (q.style !== 'fill') throw new Error('style');
    expect(q.answer).toBe('跟');
    expect(q.options).toContain('跟');
    for (const o of q.options.filter((x) => x !== '跟')) expect(HSK_WORDS.has([...q.word].map((c, i) => (i === q.index ? o : c)).join(''))).toBe(false);
  });
  it('选一选: a sentence or 组词 with the character blanked', () => {
    const q = buildQuestion('fit', byText.get('很')!, pool, mulberry32(1))!;
    expect(q.style === 'fit' && q.item.word).toBe('很');
  });
  it('a visit mixes 4 styles: one 选一选, never the same style twice in a row', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = visitStyles('read', true, mulberry32(seed));
      expect(v.filter((s) => s === 'fit')).toHaveLength(1);
      const all = ['read', ...v];
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });
  it('no voice, no 听一听', () => {
    for (let seed = 1; seed < 30; seed++) expect(visitStyles(null, false, mulberry32(seed))).not.toContain('listen');
  });
  it('every band can ask every style (falling back when a rare character has no word for it)', () => {
    const bands = rankBands(pool);
    for (const band of [bands[0]!, bands[10]!, bands[29]!]) {
      for (const style of ['read', 'listen', 'real', 'fill', 'fit'] as const) {
        const q = nextQuestion(band, style, pool, mulberry32(3), new Set());
        expect(q).toBeTruthy();
        expect(band.some((w) => w.id === q.wordId)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`zibian.ts`:** extract the option-picking from `buildZibianRound` into `fillChoices(chars, k, rng, known)`. It returns `[answer, ...3 wrong]` shuffled, or null. `buildZibianRound` then calls it.
  - **`questions.ts`:**

```ts
import { pickCharacterDistractors, pickPinyinDistractors } from '../activities/flashcards/distractors';
import { fillChoices, lookAlikeChars } from '../activities/components/zibian';
import { HSK_WORDS, wordsWithChar } from '../content';
import { shuffle, type Rng } from '../lib/random';
import { fitItem, type UseItem } from '../practice/useItems';
import type { Word } from '../types';
import { READING_STYLES, type Style } from './walk';

export type PlacementQuestion =
  | { style: 'read'; wordId: string; text: string; answer: string; options: string[] }
  | { style: 'listen'; wordId: string; text: string; options: string[] }
  | { style: 'real'; wordId: string; shown: string; real: boolean }
  | { style: 'fill'; wordId: string; word: string; index: number; answer: string; options: string[] }
  | { style: 'fit'; wordId: string; item: Extract<UseItem, { kind: 'fit' }> };

/** A two-character HSK word with the character, at most a level above it, easiest first. */
function partnerWord(w: Word): string | undefined {
  return wordsWithChar(w.text)
    .filter((t) => Array.from(t).length === 2 && (HSK_WORDS.get(t) ?? 9) <= (w.level ?? 7) + 1)
    .sort((a, b) => (HSK_WORDS.get(a) ?? 9) - (HSK_WORDS.get(b) ?? 9))[0];
}

export function buildQuestion(style: Style, word: Word, pool: Word[], rng: Rng): PlacementQuestion | null {
  switch (style) {
    case 'read': {
      const wrong = pickPinyinDistractors(word, pool, rng);
      return wrong.length >= 3 ? { style, wordId: word.id, text: word.text, answer: word.pinyin, options: shuffle([word.pinyin, ...wrong.slice(0, 3)], rng) } : null;
    }
    case 'listen': {
      const wrong = pickCharacterDistractors(word, pool, rng);
      return wrong.length >= 3 ? { style, wordId: word.id, text: word.text, options: shuffle([word.text, ...wrong.slice(0, 3).map((w) => w.text)], rng) } : null;
    }
    case 'real': {
      const real = partnerWord(word);
      if (!real) return null;
      const chars = Array.from(real);
      const k = chars[0] === word.text ? 1 : 0; // swap the other character for a look-alike
      const fake = shuffle(lookAlikeChars(chars[k]!), rng).map((c) => chars.map((x, i) => (i === k ? c : x)).join('')).find((t) => !HSK_WORDS.has(t));
      const showReal = !fake || rng() < 0.5;
      return { style, wordId: word.id, shown: showReal ? real : fake!, real: showReal };
    }
    case 'fill': {
      const w2 = partnerWord(word);
      if (!w2) return null;
      const chars = Array.from(w2);
      const index = chars.indexOf(word.text);
      const options = fillChoices(chars, index, rng);
      return options ? { style, wordId: word.id, word: w2, index, answer: word.text, options } : null;
    }
    case 'fit': {
      const item = fitItem(word, pool, rng);
      return item && item.kind === 'fit' ? { style, wordId: word.id, item } : null;
    }
  }
}

export function visitStyles(prev: Style | null, canListen: boolean, rng: Rng): Style[] {
  const reading = READING_STYLES.filter((s) => canListen || s !== 'listen');
  for (let tries = 0; tries < 50; tries++) {
    const v = shuffle([...shuffle(reading, rng).slice(0, 3), 'fit' as Style], rng);
    const all = prev ? [prev, ...v] : v;
    if (all.every((s, i) => i === 0 || s !== all[i - 1])) return v;
  }
  return ['read', 'fit', 'real', 'fill']; // unreachable in practice: a fixed order with no repeats
}

/** A question of `style` from a band, trying its words in a random order; a word asked already this check is skipped; 读一读 is the fallback. */
export function nextQuestion(band: Word[], style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const words = shuffle(band.filter((w) => !used.has(w.id)), rng);
  for (const w of words.slice(0, 25)) {
    const q = buildQuestion(style, w, pool, rng);
    if (q) return q;
  }
  for (const w of words.length ? words : band) {
    const q = buildQuestion('read', w, pool, rng);
    if (q) return q;
  }
  const w = band[0]!;
  return { style: 'read', wordId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
```

- [ ] **Step 4: Run** `npx vitest run src/placement src/activities/components`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: five placement question styles"`

### Task 4: Saving both levels

**Files:**
- Modify: `src/placement/apply.ts`, `src/placement/placement.ts` (`seedPlacementCards` takes a card kind)
- Test: `src/placement/apply.test.ts`

**Interfaces:**
- Consumes: `placementLevels` and `rankBands` (Task 2); `meaningCue` (flashcards/meaning).
- Produces:
  - `placementIds(bands: Word[][], answers: WalkAnswer[]): { readingIds: string[]; understandingIds: string[]; missed: string[] }`
    - `readingIds`: every word in bands 0..reading, plus words answered right by reading styles above it.
    - `understandingIds`: every word in bands 0..understanding, plus words answered right by 选一选 above it, if they are also read.
    - `missed`: the word ids answered wrong.
  - `applyPlacement(db, result: { readingIds: string[]; understandingIds: string[]; missed: string[]; reading: number; understanding: number }, now): Promise<number>`
    - Seeds known reading cards for `readingIds`.
    - Seeds known meaning cards for `understandingIds` that have a cue.
    - Gives due-now meaning cards to read-but-not-understood words that have a cue.
    - Clears unpractised reading **and meaning** cards it no longer supports.
    - Saves `settings.placementResult`.
  - `seedPlacementCards(words, ids, now, kind: 'recognise' | 'meaning' = 'recognise')`

- [ ] **Step 1: Write the failing tests**

```ts
// apply.test.ts — add
describe('two levels (spec §19 part 6)', () => {
  it('read and understood: known reading and meaning; read only: known reading, meaning due now; above: new', async () => {
    const db = await freshDb();
    const ws = [makeWord('很', { id: 'b:a', rank: 1 }), makeWord('跟', { id: 'b:b', rank: 2 }), makeWord('根', { id: 'b:c', rank: 3 })];
    await putWords(db, ws);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a', 'b:b'], understandingIds: ['b:a'], missed: ['b:c'], reading: 0, understanding: 0 }, now);
    const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(cards.get('b:a:meaning')!.fsrs.due.getTime()).toBeGreaterThan(now.getTime());
    expect(cards.get('b:b:recognise')).toBeTruthy();
    expect(cards.get('b:b:meaning')!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(cards.has('b:c:recognise')).toBe(false);
    expect((await getSettings(db)).placementResult).toMatchObject({ reading: 0, understanding: 0, missed: ['b:c'] });
  });
  it('a re-run clears placement-only meaning cards the new result does not support; practised words stay', async () => {
    const db = await freshDb();
    const ws = [makeWord('很', { id: 'b:a', rank: 1 }), makeWord('跟', { id: 'b:b', rank: 2 })];
    await putWords(db, ws);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a', 'b:b'], understandingIds: ['b:a', 'b:b'], missed: [], reading: 0, understanding: 0 }, now);
    await addReviewLog(db, { cardId: 'b:a:meaning', wordId: 'b:a', kind: 'meaning', at: now.getTime(), rating: 3, correct: true });
    await applyPlacement(db, { readingIds: [], understandingIds: [], missed: [], reading: -1, understanding: -1 }, now);
    const ids = (await allCards(db)).map((c) => c.id).sort();
    expect(ids).toEqual(['b:a:meaning', 'b:a:recognise']);
  });
  it('an empty result (knows nothing) seeds nothing and still finishes placement', async () => {
    const db = await freshDb();
    await applyPlacement(db, { readingIds: [], understandingIds: [], missed: [], reading: -1, understanding: -1 }, new Date());
    expect(await allCards(db)).toEqual([]);
    expect((await getSettings(db)).placementDone).toBe(true);
  });
});
describe('placementIds', () => {
  it('everything up to each level, plus right answers above it', () => {
    const bands = [[makeWord('一', { id: 'b:1' })], [makeWord('二', { id: 'b:2' })], [makeWord('三', { id: 'b:3' })]];
    const answers = [
      { band: 1, style: 'read' as const, wordId: 'b:2', correct: true }, { band: 1, style: 'fit' as const, wordId: 'b:2', correct: false },
      { band: 2, style: 'read' as const, wordId: 'b:3', correct: true }, { band: 2, style: 'real' as const, wordId: 'b:3', correct: false }, { band: 2, style: 'fill' as const, wordId: 'b:3x', correct: false },
    ];
    expect(placementIds(bands, answers)).toEqual({ readingIds: ['b:1', 'b:2', 'b:3'], understandingIds: ['b:1'], missed: ['b:2', 'b:3', 'b:3x'] });
  });
});
```

Update the existing apply tests, which call `applyPlacement(db, ids, now)`, to pass `{ readingIds: ids, understandingIds: [], missed: [], reading: 0, understanding: -1 }`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// apply.ts
import { meaningCue } from '../activities/flashcards/meaning';
import { placementLevels, type WalkAnswer } from './walk';

export interface PlacementOutcome { readingIds: string[]; understandingIds: string[]; missed: string[]; reading: number; understanding: number }

export function placementIds(bands: Word[][], answers: WalkAnswer[]) {
  const { reading, understanding } = placementLevels(answers);
  const upTo = (n: number) => bands.slice(0, n + 1).flat().map((w) => w.id);
  const rightAbove = (n: number, fit: boolean) => answers.filter((a) => a.correct && a.band > n && (a.style === 'fit') === fit).map((a) => a.wordId);
  const readingIds = [...new Set([...upTo(reading), ...rightAbove(reading, false)])];
  const readSet = new Set(readingIds);
  const understandingIds = [...new Set([...upTo(understanding), ...rightAbove(understanding, true)])].filter((id) => readSet.has(id));
  const missed = [...new Set(answers.filter((a) => !a.correct).map((a) => a.wordId))];
  return { readingIds, understandingIds, missed };
}

export async function applyPlacement(db: AppDb, r: PlacementOutcome, now: Date): Promise<number> {
  const [words, cards, practised] = await Promise.all([allWords(db), allCards(db), practisedWords(db)]);
  const byId = new Map(words.map((w) => [w.id, w]));
  const hasCue = (id: string) => { const w = byId.get(id); return !!w && meaningCue(w) !== null; };
  const read = new Set(r.readingIds);
  const understood = new Set(r.understandingIds.filter(hasCue));
  const meaningNow = r.readingIds.filter((id) => !understood.has(id) && hasCue(id));
  const supported = (c: CardRecord) => (c.kind === 'recognise' ? read.has(c.wordId) : c.kind === 'meaning' ? understood.has(c.wordId) || meaningNow.includes(c.wordId) : true);
  await deleteCards(db, cards.filter((c) => c.kind !== 'write' && !practised.has(c.wordId) && !supported(c)).map((c) => c.id));
  const existing = new Set(cards.map((c) => c.id));
  const seeds = [
    ...seedPlacementCards(words, r.readingIds, now, 'recognise'),
    ...seedPlacementCards(words, [...understood], now, 'meaning'),
    ...meaningNow.map((wordId) => ({ id: `${wordId}:meaning`, wordId, kind: 'meaning' as const, fsrs: { ...newCard(now), due: now } })),
  ].filter((c) => !existing.has(c.id));
  await putCards(db, seeds);
  await updateSettings(db, { placementDone: true, placementResult: { at: now.getTime(), reading: r.reading, understanding: r.understanding, missed: r.missed } });
  return seeds.filter((c) => c.kind === 'recognise').length;
}
```

`seedPlacementCards` gains `kind` and uses it for the id and kind. The spread over days 7–28 is unchanged. `newCard` comes from `srs/scheduler`.

- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS once the callers are updated. `PlacementScreen` still calls the old form until Task 5, so adapt that call now to `{ readingIds: placementKnownIds(...), understandingIds: [], missed: [], reading: 0, understanding: -1 }`.
- [ ] **Step 5: Commit.** `git commit -m "feat: placement seeds reading and meaning separately; a re-run replaces both"`

### Task 5: The new placement screen

**Files:**
- Modify:
  - `src/app/PlacementScreen.tsx` (rewritten);
  - `src/placement/placement.ts` (remove the old band functions once nothing uses them);
  - `src/styles.css`;
  - `scripts/fit-check.ts` (the placement flow walks up to 10 questions).
- Test: `src/app/PlacementScreen.test.tsx` (rewrite the existing placement screen tests; find them with `grep -rln PlacementScreen src`)

**Interfaces:**
- Consumes: Tasks 2–4.

**What the screen does:**
1. **Questions:** 3 warm-up 读一读 questions from band 1, then the walk. Each visit's 4 styles come from `visitStyles(prevStyle, voice, rng)`, and each question from `nextQuestion(bands[state.band], style, words, rng, asked)`.
2. **Every question has 不知道**, as a `btn--big`, which counts as wrong.
3. **No right/wrong is shown.** After a tap the next question appears, with a 350 ms tap guard as now.
4. **The bubble names the style:**
   - 读一读 `这个字怎么读？`
   - 听一听 `听一听，是哪个字？`, with a big `SpeakButton`
   - 真的假的 `这是真的词吗？`, with two `btn--big` buttons, `是真的` and `是假的`
   - 补一补 `少了哪个字？`, the word with a `.zibian__blank` and 4 `.choice` buttons
   - 选一选 `哪个词对？`, the `.meaning-cue--sentence` card and 4 `.choice` buttons
5. **When done:**
   - `applyPlacement(db, { ...placementIds(bands, state.answers), ...placementLevels(state.answers) }, now())`;
   - the result screen shows `你已经认识 N 个字了！` (known reading count), and under it a small line `读：${levelName(reading)} · 懂：${levelName(understanding)}`;
   - `levelName(band)` = the HSK level of that band's last word, written `一级`…`六级`, or `七—九级`; `还没开始` for -1.

- [ ] **Step 1: Write the failing tests**

```tsx
// PlacementScreen.test.tsx
it('opens with 3 reading questions, then mixes styles; 不知道 always works; no right/wrong is shown', async () => {
  const app = await makeAppData();
  await putWords(app.db, builtinWords(0));
  renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
  const bubbles = new Set<string>();
  for (let i = 0; i < 12; i++) {
    await screen.findByText('不知道');
    bubbles.add(document.querySelector('.pet__bubble .sr-only')?.textContent ?? '');
    expect(document.querySelector('.is-wrong, .is-right, .bottombar--oops')).toBeNull();
    fireEvent.click(screen.getByText('不知道'));
  }
  expect(bubbles.size).toBeGreaterThanOrEqual(3);
});
it('knows nothing: ends kindly with no cards and opens Home', async () => {
  const app = await makeAppData();
  await putWords(app.db, builtinWords(0));
  renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
  for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) fireEvent.click(await screen.findByText(/不知道|开始！/));
  expect(await screen.findByText('开始！')).toBeTruthy();
  expect(screen.getByText(/读：还没开始/)).toBeTruthy();
  expect(await allCards(app.db)).toEqual([]);
});
it('a strong reader gets both levels on the result screen', async () => {
  const app = await makeAppData();
  await putWords(app.db, builtinWords(0));
  renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} />, app);
  for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) {
    await waitFor(() => expect(document.querySelector('[data-answer="true"]') ?? screen.queryByText('开始！')).toBeTruthy());
    const right = document.querySelector<HTMLElement>('[data-answer="true"]');
    if (right) fireEvent.click(right);
  }
  expect(await screen.findByText('开始！')).toBeTruthy();
  expect(screen.getByText(/读：(六级|七—九级)/)).toBeTruthy();
  expect((await getSettings(app.db)).placementResult!.reading).toBeGreaterThan(20);
});
```

Every right option (including the right one of 是真的/是假的) carries `data-answer="true"`, so tests can find it; nothing on screen shows it. `PlacementScreen` takes an optional `voice` prop (default: the app's `voice`) so tests can switch 听一听 off.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the screen as described.
  - Component state is the `WalkState`, the current `PlacementQuestion`, the `visit` style queue, the `asked` set, and `prevStyle`.
  - Questions are built in an effect keyed on `state.answers.length + state.warmup`.
  - Each kind of question is its own small render block.
  - CSS: reuse `.choices`, `.meaning-cue--sentence`, `.zibian__word`, `.zibian__blank`; add `.real-word { font-size: clamp(56px, 9dvh, 96px) }` and `.placement__levels { font-size: 20px; color: var(--ink-soft) }`.
  - **`fit-check.ts`:** the `placement` flow checks the first screen, then clicks `不知道` and checks again, 10 times. Each style is a new signature, from its bubble.
- [ ] **Step 4: Run** `npx vitest run`, then `FIT_ONLY='^placement' npm run fit`. Expected: PASS and 0 problems.
- [ ] **Step 5: Commit.** `git commit -m "feat: the new placement check — five styles, two levels"`

### Task 6: The Skills panel

**Files:**
- Create: `src/stats/skills.ts`, `src/parent/SkillsPanel.tsx`
- Modify: `src/parent/ParentArea.tsx` (tab `'skills'`, label `Skills`, lucide icon `Gauge`), `src/styles.css`
- Test: `src/stats/skills.test.ts`, `src/parent/skillsPanel.test.tsx`, `src/parent/parentB.test.tsx` (tab count 11)

**Interfaces:**
- Consumes: `AnswerLog` and `answersSince` (Task 1); `ReviewLog` and `logsSince` (repo); `bringForward` (session/record); `PlacementResult` (Task 1).
- Produces:
  - `skillAccuracy(logs: ReviewLog[], answers: AnswerLog[]): Record<Skill, { right: number; total: number }>`. Reading = recognise logs; meaning = meaning logs; writing = write logs (`correct`); use and zibian = answers.
  - `topMissed(logs, answers, skill: Skill, limit = 5): { wordId: string; misses: number }[]`
  - `SKILL_CARD: Record<Skill, CardKind>` = `{ reading: 'recognise', meaning: 'meaning', use: 'meaning', zibian: 'write', writing: 'write' }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/stats/skills.test.ts
import { describe, expect, it } from 'vitest';
import { skillAccuracy, topMissed } from './skills';
const log = (kind: 'recognise' | 'meaning' | 'write', wordId: string, correct: boolean) => ({ cardId: `${wordId}:${kind}`, wordId, kind, at: 1, rating: 3 as const, correct });
describe('skills (spec §19 part 7)', () => {
  it('counts each skill from its own source', () => {
    const acc = skillAccuracy(
      [log('recognise', 'a', true), log('recognise', 'b', false), log('meaning', 'a', true), log('write', 'a', false)],
      [{ at: 1, wordId: 'a', skill: 'use', correct: true }, { at: 1, wordId: 'b', skill: 'zibian', correct: false }],
    );
    expect(acc).toEqual({ reading: { right: 1, total: 2 }, meaning: { right: 1, total: 1 }, use: { right: 1, total: 1 }, zibian: { right: 0, total: 1 }, writing: { right: 0, total: 1 } });
  });
  it('the most-missed words of one skill, worst first', () => {
    const answers = [{ at: 1, wordId: 'a', skill: 'zibian' as const, correct: false }, { at: 2, wordId: 'b', skill: 'zibian' as const, correct: false }, { at: 3, wordId: 'b', skill: 'zibian' as const, correct: false }];
    expect(topMissed([], answers, 'zibian')).toEqual([{ wordId: 'b', misses: 2 }, { wordId: 'a', misses: 1 }]);
  });
});
```

```tsx
// src/parent/skillsPanel.test.tsx
it('shows 14-day accuracy per skill, the last placement levels, the parent\'s class baseline, and brings missed words forward', async () => {
  const app = await makeAppData();
  await putWords(app.db, [makeWord('根', { id: 'b:根' })]);
  await putCards(app.db, [makeCard('b:根', 'write', new Date(2026, 9, 20), true)]);
  await addAnswer(app.db, { at: app.now().getTime() - 1000, wordId: 'b:根', skill: 'zibian', correct: false });
  await updateSettings(app.db, { placementResult: { at: 0, reading: 8, understanding: 4, missed: [] } });
  renderWithApp(<SkillsPanel />, app);
  expect(await screen.findByText(/Look-alike characters/)).toBeTruthy();
  expect(screen.getByText(/0%/)).toBeTruthy();
  expect(screen.getByText(/Reading: HSK 3/)).toBeTruthy(); // band 8 is in HSK 3
  fireEvent.input(screen.getByLabelText('Class baseline for Look-alike characters (% right)'), { target: { value: '53' } });
  await waitFor(async () => expect((await getSettings(app.db)).baselines?.zibian).toBe(53));
  fireEvent.click(screen.getByRole('button', { name: 'Practise 根 more' }));
  await waitFor(async () => expect((await allCards(app.db))[0]!.fsrs.due.getTime()).toBeLessThanOrEqual(app.now().getTime()));
});
```

(Use the fixtures' real `now`; `renderWithApp`'s app has `now()`.)

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`skills.ts`:** as specified.
  - **`SkillsPanel.tsx`** is a parent panel, in English. It holds:
    - **Last placement:** `Reading: HSK n · Understanding: HSK m (date)`, or "Not done yet".
    - **A table:** one row per skill:
      - its label: Reading (认一认), Meaning (认一认), Words in use (选一选/用一用), Look-alike characters (字辨), Writing (写一写);
      - its 14-day % right and count;
      - the class baseline input (number, 0–100, `aria-label` as in the test), saved to `settings.baselines`;
      - the difference against the baseline.
    - **朗读 (reading aloud):** the count of reads in 14 days and their average loudness, from `listRecordings`, where `prompt.kind === 'passage'`.
    - **Top missed words per skill:** each with a "Practise X more" button. It calls `bringForward(db, wordId, SKILL_CARD[skill], now())`. For writing and 字辨 it uses the `recognise` card when there is no write card.
  - **`ParentArea`:** add the tab.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: the Skills panel — accuracy per skill, baselines, practise more"`

### Task 7: Full sweep and build report

- [ ] **Step 1:** `npm run fit`. Expected: 0 problems at all six sizes. View the iPhone SE placement shots of each style and the result screen.
- [ ] **Step 2:** `npx vitest run`. Expected: all pass.
- [ ] **Step 3:** Add a build report section, "Plan 14 — placement and Skills", in the report's style, with rulings and deferred minors.
- [ ] **Step 4: Commit.** `git commit -m "docs: plan 14 build report"`
