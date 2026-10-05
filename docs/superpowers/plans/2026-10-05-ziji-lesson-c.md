# 字己 ZiJi lesson redesign phase C: 成语 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 成语 in the lesson: a built-in list of about 150 written for this app, one on the 认新字 card, a fifth ladder rung in 练一练 (complete it, pick it for a sentence, build a sentence with it), and school 成语 the parent types in the parent area.

**Architecture:**
- **Content.** `src/content/chengyu.ts` holds the list. It also answers "which 成语 for this word at his level".
- **Questions.** `src/practice/idioms.ts` builds the three rung-5 questions from content. A completion question reuses one new component, `IdiomQuestion`; the sentence and 组句 questions reuse `UseQuestion` and `BuildSentence`.
- **Ladder.** The ladder gains rung 5. Round building, grading and the rung memory need no new mechanisms: `askFor` already falls back to the nearest rung that can be asked.
- **School 成语.** These are parent words tagged `成语` (the worksheet importer already tags them). Their own ladder uses `whole`, completing the 成语 itself at rung 2, instead of 组词/搭配.

**Tech Stack:** Vite 7, Preact 10, TypeScript 5.9, Vitest 4 (jsdom, fake-indexeddb), pinyin-pro, playwright-core WebKit (`npm run fit`, `npx tsx scripts/stage-cases.ts`).

**Spec:** docs/superpowers/specs/2026-10-05-ziji-lesson-flow-design.md (§2.1, §3.2 rung 5, §3.5, §3.6, §4, §6, §10)

## Global Constraints
- Nothing from Berries packs or the school textbook enters the repo. School 成语 stay on the iPad as parent words.
- Child screens: Chinese only, no emoji. English appears only on the 认字 card and on the feedback sheet after a wrong answer (spec §3.6).
- Built-in 成语 come from his level and one above. The closest level is preferred, and easier ones are used only when nothing else fits (spec §4).
- **Built-in content:** taken from the app's HSK list (`hskwords.json`, four-character words). Each entry gets an English meaning and one or two short sentences written for this app.
- **Character levels:** 成语 sentences use characters at most one level above the 成语's level, like the bank rule in `bankCheck.ts`.
- **Grading:** rung 5 grades the meaning card; rungs 3–4 grade use (spec §3.5).
- **Layout:** every new question type uses `Stage` + `FeedbackSheet`, and passes the WebKit sweep at all sizes with 0 problems.

## Rulings this plan makes (from reading the content)
- **成语 level = its hardest character's HSK level.** HSK puts 430 of the 449 four-character words at 7–9, so the HSK word level would make every 成语 "too hard". The level of the hardest character is what a child actually meets.
  - *Cost if wrong:* 成语 feel easier than HSK says.
- **His level** is the level of the first built-in word he hasn't started (the next new word in rank order), and 1 if there is none.
- **A 成语 is offered for a character only when the character appears in it once.** A second copy would give away a completion (the 妈妈 problem from phase B).
- **On the 认字 card, the 成语 takes the place of the extra 组词 example**, so the card still fits an iPhone SE. All 组词 still feed the questions.
- **The wrong 成语 in "pick the 成语" are drawn from the list, not hand-picked.** Each sentence is written to fit only its own 成语.
  - *Cost if wrong:* now and then a second 成语 also fits.
- **English meanings are written for this app**, short and child-level, not copied from CC-CEDICT. The spec said the glossary; this avoids a licence line for new content.
- **School 成语 are recognise-only in 写一写** (`writeable: false`).

## Review Focus
1. **A word with no 成语 in his window.** Rung 5 falls back to 组句 and then lower. It must never show an empty question or skip the item silently, beyond the existing `onDone(null)` path.
2. **A school 成语 with no sentence** gets read/listen and `whole` (completion) only. It never gets `fit` or `build`.
3. **A completion's wrong characters never make another real 成语 or HSK word** (五光十色 for 五＿六色).
4. **A level-1 learner** gets level-1–2 成语. Every 成语 offered at rung 5 obeys the window, school 成语 first.
5. **An old saved round** (`practiceQueue` from phase B, rungs ≤ 4) still plays. Rung 5 items only appear in newly built rounds.

---

### Task 1: The built-in 成语 list

**Files:**
- Create: `src/content/chengyu.ts`
- Test: `src/content/chengyu.test.ts`

**Interfaces:**
- Produces:
  - `interface Chengyu { text: string; meaning: string; sentences: string[] }`;
  - `CHENGYU: readonly Chengyu[]`;
  - `chengyuLevel(text: string): number` (the hardest character's built-in level, 1–7);
  - `chengyuOf(text: string): Chengyu | undefined`.

- [ ] **Step 1: Write the failing content check.** Every entry must pass these checks:
  - it is a four-character word in `HSK_WORDS`, and every character is a built-in character;
  - there are no duplicates, and the count is 140–170;
  - `meaning` is plain ASCII English, 3–48 characters;
  - there are 1–2 sentences;
  - each sentence contains the 成语 exactly once, is at most 20 characters, and every Han character in it is at most `chengyuLevel + 1`;
  - at least one sentence cuts with `tiles()` into 4–6 different tiles, with the 成语 whole in one tile;
  - the levels spread out: at least 8 entries at each of levels 1–3.

```ts
import { describe, expect, it } from 'vitest';
import { BUILTIN, HSK_WORDS } from '.';
import { CHENGYU, chengyuLevel, chengyuOf } from './chengyu';
import { tiles } from './zuju';

const LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level]));
const HAN = /\p{Script=Han}/u;

describe('the built-in 成语 list (spec 2026-10-05 §4)', () => {
  it('has about 150 four-character HSK words, no repeats', () => {
    expect(CHENGYU.length).toBeGreaterThanOrEqual(140);
    expect(CHENGYU.length).toBeLessThanOrEqual(170);
    expect(new Set(CHENGYU.map((c) => c.text)).size).toBe(CHENGYU.length);
    for (const c of CHENGYU) {
      expect(Array.from(c.text), c.text).toHaveLength(4);
      expect(HSK_WORDS.has(c.text), c.text).toBe(true);
      for (const ch of c.text) expect(LEVEL.has(ch), `${c.text} ${ch}`).toBe(true);
    }
  });
  it('gives each a short English meaning and 1–2 sentences he can read', () => {
    for (const c of CHENGYU) {
      expect(c.meaning, c.text).toMatch(/^[\x20-\x7e]{3,48}$/);
      expect(c.sentences.length, c.text).toBeGreaterThanOrEqual(1);
      expect(c.sentences.length, c.text).toBeLessThanOrEqual(2);
      const level = chengyuLevel(c.text);
      for (const s of c.sentences) {
        expect(s.split(c.text).length - 1, s).toBe(1);
        expect(Array.from(s).length, s).toBeLessThanOrEqual(20);
        for (const ch of Array.from(s).filter((x) => HAN.test(x))) expect(LEVEL.get(ch) ?? 99, `${s}: ${ch}`).toBeLessThanOrEqual(level + 1);
      }
    }
  });
  it('can build a 组句 from each one (4–6 different tiles, the 成语 whole)', () => {
    for (const c of CHENGYU) {
      const ok = c.sentences.some((s) => { const t = tiles(s); return t.length >= 4 && t.length <= 6 && new Set(t).size === t.length && t.some((x) => x.includes(c.text)); });
      expect(ok, c.text).toBe(true);
    }
  });
  it('spreads over the levels a P2 child meets, levelled by the hardest character', () => {
    expect(chengyuLevel('五颜六色')).toBe(2);
    for (const l of [1, 2, 3]) expect(CHENGYU.filter((c) => chengyuLevel(c.text) === l).length, `level ${l}`).toBeGreaterThanOrEqual(8);
    expect(chengyuOf('五颜六色')?.meaning).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it.**
  - Run: `npx vitest run src/content/chengyu.test.ts`
  - Expected: FAIL, because `./chengyu` doesn't exist.

- [ ] **Step 3: Write `src/content/chengyu.ts`.**
  - **The code:**

```ts
// 成语 (spec 2026-10-05 §4): about 150 common 成语 from the app's HSK list, each with an English meaning and short sentences
// written for this app. A 成语's level is its hardest character's (HSK files nearly all 成语 under 7–9).
import { BUILTIN } from '.';

export interface Chengyu { text: string; meaning: string; sentences: string[] }

const c = (text: string, meaning: string, ...sentences: string[]): Chengyu => ({ text, meaning, sentences });

export const CHENGYU: readonly Chengyu[] = [
  c('五颜六色', 'all kinds of bright colours', '公园里的花五颜六色。'),
  // … about 150, chosen from the four-character HSK words that are real 成语
];

const LEVEL = new Map(BUILTIN.map((ch) => [ch.char, ch.level as number]));
const BY_TEXT = new Map(CHENGYU.map((x) => [x.text, x]));
export const chengyuLevel = (text: string): number => Math.max(...Array.from(text).map((ch) => LEVEL.get(ch) ?? 7));
export const chengyuOf = (text: string): Chengyu | undefined => BY_TEXT.get(text);
```

  - **Choosing the entries:**
    - Real 成语 only: no 公共汽车, 电子邮件, 不好意思, 社会主义 or 知识分子.
    - Kid-relevant, from hardest-character levels 1–6.
    - Write each meaning and sentence, then iterate against the check until green.
  - **Shape:**
    - Sentences should be short subject–verb shapes that tile cleanly, e.g. 「他一心一意地写字。」.
    - Avoid 里的-style cuts. Add punctuation only at the end.

- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/content/chengyu.test.ts`
  - Expected: PASS (4 tests).
- [ ] **Step 5: Commit.** `git add src/content/chengyu.ts src/content/chengyu.test.ts && git commit -m "feat: 150 成语 written for the app, levelled by their hardest character"`

### Task 2: Which 成语 for a word, at his level

**Files:**
- Modify: `src/content/chengyu.ts`
- Test: `src/content/chengyu.test.ts`

**Interfaces:**
- Consumes: Task 1's `CHENGYU`, `chengyuLevel`, `chengyuOf`.
- Produces:
  - `interface Idiom { text: string; meaning?: string; sentences: string[]; school: boolean }`;
  - `idiomsFor(word: Word, level: number, pool: Word[]): Idiom[]`. This returns, in order:
    1. his school 成语 (pool words tagged 成语, not paused) that contain `word.text` once, any level;
    2. built-in 成语 that contain `word.text` once and sit at `level`;
    3. then those at `level + 1`;
    4. then easier ones, the nearest first.
    - It never returns anything above `level + 1`, and never the word itself.
  - `learnerLevel(words: Word[], started: ReadonlySet<string>): number`;
  - `isIdiomWord(word: Word): boolean`: tagged 成语 and 4 characters long;
  - `idiomOf(word: Word): Idiom | null`: a school 成语 word as an `Idiom`. Its sentences are its class sentences, then built-in sentences when it is in the list; its meaning is `word.meaning ?? chengyuOf(text)?.meaning`.

- [ ] **Step 1: Failing tests.**

```ts
import { idiomsFor, idiomOf, isIdiomWord, learnerLevel } from './chengyu';
import { makeWord } from '../test/factories';

describe('idiomsFor (spec §4 level window)', () => {
  const xin = makeWord('心', { id: 'b:心', level: 1 });
  it('offers his level, then one up, never higher', () => {
    const out = idiomsFor(xin, 1, []);
    expect(out.length).toBeGreaterThan(0);
    for (const i of out) expect(chengyuLevel(i.text)).toBeLessThanOrEqual(2);
    const levels = out.map((i) => chengyuLevel(i.text));
    expect([...levels].sort((a, b) => Math.abs(a - 1) - Math.abs(b - 1) || b - a)).toEqual(levels); // closest first, then easier
  });
  it('uses easier ones only when nothing at or one above fits', () => {
    const out = idiomsFor(xin, 6, []);
    for (const i of out) expect(chengyuLevel(i.text)).toBeLessThanOrEqual(7);
    const first = out.findIndex((i) => chengyuLevel(i.text) < 6);
    if (first >= 0) expect(out.slice(first).every((i) => chengyuLevel(i.text) < 6)).toBe(true);
  });
  it('skips a 成语 that has the character twice (一心一意 for 一)', () => {
    expect(idiomsFor(makeWord('一', { id: 'b:一', level: 1 }), 2, []).map((i) => i.text)).not.toContain('一心一意');
  });
  it('puts his school 成语 first', () => {
    const school = makeWord('心花怒放', { id: 'p:1', source: 'parent', tags: ['成语'], meaning: 'wild with joy' });
    expect(idiomsFor(xin, 1, [school])[0]).toMatchObject({ text: '心花怒放', school: true, meaning: 'wild with joy' });
  });
});

describe('learnerLevel', () => {
  it('is the level of the next built-in word he has not started', () => {
    const ws = [makeWord('一', { id: 'b:一', level: 1, rank: 1 }), makeWord('颜', { id: 'b:颜', level: 3, rank: 900 })];
    expect(learnerLevel(ws, new Set(['b:一']))).toBe(3);
    expect(learnerLevel(ws, new Set(['b:一', 'b:颜']))).toBe(7);
    expect(learnerLevel([], new Set())).toBe(1);
  });
});

describe('school 成语 words', () => {
  it('a four-character word tagged 成语 is one, with the list meaning when the parent typed none', () => {
    const w = makeWord('五颜六色', { id: 'p:2', source: 'parent', tags: ['成语'] });
    expect(isIdiomWord(w)).toBe(true);
    expect(idiomOf(w)).toMatchObject({ text: '五颜六色', school: true, meaning: chengyuOf('五颜六色')!.meaning });
    expect(idiomOf(w)!.sentences.length).toBeGreaterThan(0);
    expect(isIdiomWord(makeWord('心', { id: 'b:心' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/content/chengyu.test.ts`
  - Expected: FAIL (the exports don't exist).
  - Check that `src/test/factories` has `makeWord(text, patch)`. If not, use the factory the other tests use, and ledger it.
- [ ] **Step 3: Implement.**

```ts
export interface Idiom { text: string; meaning?: string; sentences: string[]; school: boolean }

const once = (text: string, part: string) => { const at = text.indexOf(part); return at >= 0 && text.indexOf(part, at + 1) < 0; };
export const isIdiomWord = (w: Word): boolean => !!w.tags?.includes('成语') && Array.from(w.text).length === 4;

export function idiomOf(w: Word): Idiom | null {
  if (!isIdiomWord(w)) return null;
  const built = chengyuOf(w.text);
  return { text: w.text, meaning: w.meaning ?? built?.meaning, sentences: [...(w.sentences ?? []).map((s) => s.text).filter((s) => once(s, w.text)), ...(built?.sentences ?? [])], school: true };
}

export function idiomsFor(word: Word, level: number, pool: Word[]): Idiom[] {
  const school = pool.filter((w) => !w.paused && w.text !== word.text && isIdiomWord(w) && once(w.text, word.text)).map((w) => idiomOf(w)!);
  const taken = new Set(school.map((i) => i.text));
  const rank = (l: number) => (l === level ? 0 : l === level + 1 ? 1 : 2 + (level - l)); // his level, one up, then easier, nearest first
  const built = CHENGYU.filter((c) => c.text !== word.text && !taken.has(c.text) && once(c.text, word.text) && chengyuLevel(c.text) <= level + 1)
    .map((c) => ({ c, r: rank(chengyuLevel(c.text)) }))
    .sort((a, b) => a.r - b.r)
    .map(({ c }) => ({ text: c.text, meaning: c.meaning, sentences: [...c.sentences], school: false }));
  return [...school, ...built];
}

export function learnerLevel(words: Word[], started: ReadonlySet<string>): number {
  const next = words.filter((w) => w.source === 'builtin' && !w.paused && !started.has(w.id)).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0];
  if (next) return next.level ?? 1;
  return words.some((w) => w.source === 'builtin') ? 7 : 1;
}
```

- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/content/chengyu.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: the 成语 for a word: school ones first, then his level, one up, easier only as a fallback`

### Task 3: The rung-5 questions as data

**Files:**
- Create: `src/practice/idioms.ts`
- Modify: `src/content/zuju.ts` (extract `zujuOf(full, keep)`)
- Test: `src/practice/idioms.test.ts`, `src/content/zuju.test.ts`

**Interfaces:**
- Consumes: `Idiom` (Task 2), `tiles`/`ordersOf` (zuju), `UseItem` (useItems), `HSK_WORDS`, `CHENGYU`, `BUILTIN`.
- Produces:
  - **Completion.** `interface IdiomGap { idiom: Idiom; at: number; answer: string; options: string[] }` and `idiomGap(idiom: Idiom, blank: string | null, rng: Rng): IdiomGap | null`.
    - `blank` is the character to blank, for the character word. With `null` (a school 成语 word itself), a character that appears once is chosen at random.
    - The options are the answer plus 3 characters, which must:
      - not be in the 成语;
      - be at most the answer's level + 1 (or level 2, whichever is higher);
      - not turn it into an HSK word or another listed 成语.
    - Returns null when 3 such characters can't be found.
  - **Pick the 成语 for a sentence.** `idiomFitItem(idiom: Idiom, others: Idiom[] | null, rng: Rng): UseItem | null`. It returns a `fit` item: one of the idiom's sentences with the 成语 blanked, plus 3 wrong 成语.
    - The wrong 成语 come from `others`, else built-in 成语 within one level of it. They are never the 成语 itself.
    - Returns null with no sentence.
  - **Build a sentence.** `idiomZuju(idiom: Idiom, rng: Rng): ZujuItem | null`, via `zujuOf(full, idiom.text)`.
  - **In zuju.ts:** `export function zujuOf(full: string, keep: string): ZujuItem | null`. `zujuFor` now maps through it, with the same behaviour.

- [ ] **Step 1: Failing tests.**

```ts
import { describe, expect, it } from 'vitest';
import { HSK_WORDS } from '../content';
import { CHENGYU, chengyuOf, type Idiom } from '../content/chengyu';
import { mulberry32 } from '../lib/random';
import { idiomFitItem, idiomGap, idiomZuju } from './idioms';

const asIdiom = (t: string): Idiom => ({ ...chengyuOf(t)!, sentences: [...chengyuOf(t)!.sentences], school: false });
const any = asIdiom(CHENGYU.find((c) => c.text.includes('颜'))?.text ?? CHENGYU[0]!.text);

describe('idiomGap (complete the 成语)', () => {
  it('blanks the word, with 3 other characters that make no real word', () => {
    for (let s = 1; s < 30; s++) {
      const g = idiomGap(any, any.text[1]!, mulberry32(s))!;
      expect(g.answer).toBe(any.text[1]);
      expect(g.at).toBe(1);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options).toContain(g.answer);
      for (const o of g.options.filter((x) => x !== g.answer)) {
        const made = any.text.slice(0, 1) + o + any.text.slice(2);
        expect(any.text.includes(o)).toBe(false);
        expect(HSK_WORDS.has(made) || !!chengyuOf(made), made).toBe(false);
      }
    }
  });
  it('picks a character that appears once when no blank is given', () => {
    const g = idiomGap(asIdiom(CHENGYU.find((c) => /(.).*\1/u.test(c.text))?.text ?? any.text), null, mulberry32(3))!;
    expect(g.idiom.text.split(g.answer).length - 1).toBe(1);
  });
});

describe('idiomFitItem (which 成语 fits)', () => {
  it('blanks it in its own sentence, with 3 other 成语', () => {
    const item = idiomFitItem(any, null, mulberry32(4))!;
    expect(item.kind).toBe('fit');
    expect(item.options).toHaveLength(4);
    expect(new Set(item.options).size).toBe(4);
    expect(item.options).toContain(any.text);
    if (item.kind === 'fit') expect(any.sentences).toContain(item.before + any.text + item.after);
  });
  it('is null with no sentence', () => {
    expect(idiomFitItem({ text: '心花怒放', sentences: [], school: true }, null, mulberry32(1))).toBeNull();
  });
});

describe('idiomZuju (build a sentence)', () => {
  it('keeps the 成语 whole in one tile', () => {
    const z = idiomZuju(any, mulberry32(2))!;
    expect(z.tiles.some((t) => t.includes(any.text))).toBe(true);
    expect(z.tiles.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/practice/idioms.test.ts`
  - Expected: FAIL (the module is missing).
- [ ] **Step 3: Implement `zujuOf` and `src/practice/idioms.ts`.**

```ts
// zuju.ts
export function zujuOf(full: string, keep: string): ZujuItem | null {
  const t = tiles(full);
  if (t.length < MIN_TILES || t.length > MAX_TILES || new Set(t).size !== t.length) return null;
  if (!t.some((x) => x.includes(keep))) return null;
  return { full, tiles: t, orders: ordersOf(t) };
}
export function zujuFor(word: Word): ZujuItem[] {
  const bank = bankFor(word.text);
  const sentences = [...(word.sentences ?? []).map((s) => s.text), ...(bank ? bank.gaps.map((g) => fillGap(g, word.text)) : [])];
  return sentences.map((s) => zujuOf(s, word.text)).filter((z): z is ZujuItem => z !== null);
}
```

```ts
// src/practice/idioms.ts — rung 5 (spec 2026-10-05 §3.2): complete the 成语, pick it for a sentence, build a sentence with it.
import { BUILTIN, HSK_WORDS } from '../content';
import { CHENGYU, chengyuLevel, chengyuOf, type Idiom } from '../content/chengyu';
import { zujuOf, type ZujuItem } from '../content/zuju';
import { shuffle, type Rng } from '../lib/random';
import type { UseItem } from './useItems';

export interface IdiomGap { idiom: Idiom; at: number; answer: string; options: string[] }

const LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level as number]));
const IDIOM_CHARS = [...new Set(CHENGYU.flatMap((c) => Array.from(c.text)))]; // characters that sound like a 成语's

export function idiomGap(idiom: Idiom, blank: string | null, rng: Rng): IdiomGap | null {
  const chars = Array.from(idiom.text);
  const single = chars.filter((ch) => chars.indexOf(ch) === chars.lastIndexOf(ch));
  const answer = blank ?? shuffle(single, rng)[0];
  if (!answer || !single.includes(answer)) return null;
  const at = chars.indexOf(answer);
  const cap = Math.max(2, (LEVEL.get(answer) ?? 7) + 1);
  const makes = (o: string) => { const t = [...chars]; t[at] = o; const s = t.join(''); return HSK_WORDS.has(s) || !!chengyuOf(s); };
  const wrong = shuffle(IDIOM_CHARS.filter((o) => !chars.includes(o) && (LEVEL.get(o) ?? 99) <= cap && !makes(o)), rng).slice(0, 3);
  if (wrong.length < 3) return null;
  return { idiom, at, answer, options: shuffle([answer, ...wrong], rng) };
}

export function idiomFitItem(idiom: Idiom, others: Idiom[] | null, rng: Rng): UseItem | null {
  const full = shuffle(idiom.sentences, rng)[0];
  if (!full) return null;
  const at = full.indexOf(idiom.text);
  const level = chengyuLevel(idiom.text);
  const pool = (others ?? []).map((i) => i.text).filter((t) => t !== idiom.text);
  const near = CHENGYU.filter((c) => c.text !== idiom.text && !pool.includes(c.text) && Math.abs(chengyuLevel(c.text) - level) <= 1).map((c) => c.text);
  const wrong = [...shuffle(pool, rng), ...shuffle(near, rng)].slice(0, 3);
  if (wrong.length < 3) return null;
  return { kind: 'fit', wordId: null, word: idiom.text, before: full.slice(0, at), after: full.slice(at + idiom.text.length), options: shuffle([idiom.text, ...wrong], rng) };
}

export function idiomZuju(idiom: Idiom, rng: Rng): ZujuItem | null {
  const all = idiom.sentences.map((s) => zujuOf(s, idiom.text)).filter((z): z is ZujuItem => z !== null);
  return all.length ? all[Math.floor(rng() * all.length)]! : null;
}
```

- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/practice/idioms.test.ts src/content/zuju.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: rung-5 questions — complete the 成语, pick it for a sentence, build a sentence with it`

### Task 4: The ladder's fifth rung

**Files:**
- Modify: `src/session/ladder.ts`, `src/session/round.ts`, `src/session/practice.ts`
- Test: `src/session/ladder.test.ts`, `src/session/round.test.ts`, `src/session/practice.test.ts`

**Interfaces:**
- Consumes: `idiomsFor`, `idiomOf`, `isIdiomWord` (Task 2); `idiomGap`, `idiomFitItem`, `idiomZuju` (Task 3).
- Produces:
  - **Ladder:** `Rung = 1|2|3|4|5`, with `TOP_RUNG = 5`.
  - **Asks:** `Ask` adds `'whole' | 'idiom' | 'idiomFit' | 'idiomBuild'`, with `ASKS = {1:['read','listen'], 2:['word','pair','match','whole'], 3:['fit','usage'], 4:['build'], 5:['idiom','idiomFit','idiomBuild']}`.
  - **Climbing:** `climb` cycles 3–5 past the top.
  - **Grading:** rungs 2 and 5 grade meaning (once a round); rungs 3–4 grade use.
  - **Askable:** `askable(word, pool, voice, level = 1)`:
    - `whole`: `isIdiomWord(word) && idiomGap(idiomOf(word)!, null, rng) !== null`;
    - `idiom`: not an idiom word and some `idiomsFor(word, level, pool)` has a gap for `word.text`;
    - `idiomFit` / `idiomBuild`: not an idiom word and some idiom gives a fit item / a 组句;
    - `fit` / `build` for an idiom word also use its `idiomOf` sentences (see Task 6).
  - **Planning:** `planPractice(..., confusions, level = 1)` and `planFreePlay(cards, words, rungs, voice, rng, n, level = 1)`.

- [ ] **Step 1: Failing tests.**
  - `ladder.test.ts`:
    - `startRung(4)` is 5, and `startRung(9)` is 5;
    - `nextRung(5, 5, false)` is 4.
  - `round.test.ts`:
    - `climb(4, 4)` gives `[4,5,3,4]`;
    - `climb(5, 3)` gives `[5,3,4]`;
    - a rung-5 first appearance with `gradesMeaning` grades `'meaning'`;
    - when no rung-5 ask is askable, the item falls back to rung 4 (`build`) when askable, else rung 3.
  - `practice.test.ts`:
    - `askable(心 at level 1)('idiom')` is true;
    - `askable(a word with no 成语)('idiom')` is false;
    - `askable(school 成语 word)('whole')` is true, and its `('idiom')` is false;
    - `askable(心)('whole')` is false.

```ts
// round.test.ts additions
it('climbs to 成语 and cycles the upper rungs (3–5)', () => {
  expect(climb(4, 4)).toEqual([4, 5, 3, 4]);
  expect(climb(5, 3)).toEqual([5, 3, 4]);
});
it('a 成语 question grades the meaning card once (spec §3.5)', () => {
  const items = buildRound([{ wordId: 'a', isNew: false, from: 5, appearances: 1, gradesRecognise: false, gradesMeaning: true }], () => true, mulberry32(1));
  expect(items[0]).toMatchObject({ rung: 5, grades: 'meaning' });
});
it('a word with no 成语 falls back to 组句 at rung 5', () => {
  const items = buildRound([{ wordId: 'a', isNew: false, from: 5, appearances: 1, gradesRecognise: false, gradesMeaning: false }], (_, ask) => !ask.startsWith('idiom'), mulberry32(1));
  expect(items[0]).toMatchObject({ rung: 4, ask: 'build', grades: 'use' });
});
```

```ts
// practice.test.ts additions
it('rung 5 needs a 成语 in his window; a school 成语 completes itself at rung 2 instead', () => {
  const xin = makeWord('心', { id: 'b:心', level: 1 });
  const school = makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'] });
  expect(askable(xin, [], true, 1)('idiom')).toBe(true);
  expect(askable(xin, [], true, 1)('whole')).toBe(false);
  expect(askable(school, [], true, 1)('whole')).toBe(true);
  expect(askable(school, [], true, 1)('idiom')).toBe(false);
  expect(askable(makeWord('吗', { id: 'b:吗', level: 1 }), [], true, 1)('idiom')).toBe(false);
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/session`
  - Expected: FAIL on the new tests.
- [ ] **Step 3: Implement.**
  - **ladder.ts:**
    - `export type Rung = 1 | 2 | 3 | 4 | 5; export const TOP_RUNG: Rung = 5;`
    - update the header comment.
  - **round.ts:**
    - add the new asks to `Ask` and `ASKS`;
    - `climb`: `while (r > TOP_RUNG) r -= 3;`
    - grading: `if (s.next === 0 && s.w.gradesRecognise) grades = 'recognise'; else if ((rung === 2 || rung === 5) && s.w.gradesMeaning && !s.meaningDone) { grades = 'meaning'; s.meaningDone = true; } else if (rung === 3 || rung === 4) grades = 'use';`
  - **practice.ts:**
    - `askable(word, pool, voice, level = 1)`, with the cases below;
    - thread `level` through `planPractice` and `planFreePlay`.

```ts
case 'whole': { const i = idiomOf(word); return !!i && idiomGap(i, null, mulberry32(1)) !== null; }
case 'idiom': return !isIdiomWord(word) && idiomsFor(word, level, pool).some((i) => idiomGap(i, word.text, mulberry32(1)) !== null);
case 'idiomFit': return !isIdiomWord(word) && idiomsFor(word, level, pool).some((i) => idiomFitItem(i, null, mulberry32(1)) !== null);
case 'idiomBuild': return !isIdiomWord(word) && idiomsFor(word, level, pool).some((i) => idiomZuju(i, mulberry32(1)) !== null);
```

  - `idiomsFor` runs per word per ask while planning. Memoise it per `(word.id, level)` inside `askable`'s closure, so planning stays near its current ~45 ms.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/session`
  - Expected: PASS. Existing ladder tests that pinned `TOP_RUNG` 4 or `climb` cycling 3/4 are updated to the spec's 3–5 (ledger which).
- [ ] **Step 5: Commit.** `feat: 成语 as the ladder's fifth rung; a school 成语 completes itself at rung 2`

### Task 5: The questions on the stage

**Files:**
- Create: `src/activities/practice/IdiomQuestion.tsx`, `src/activities/practice/IdiomQuestion.test.tsx`
- Modify: `src/activities/practice/PracticeQuestion.tsx`, `src/ui/stage/MeaningNote.tsx`, `src/app/SessionScreen.tsx`, `src/styles.css`
- Test: `src/activities/practice/PracticeQuestion.test.tsx`, `src/ui/stage/MeaningNote.test.tsx`

**Interfaces:**
- Consumes: Task 3 builders; Task 4 asks; `learnerLevel` (Task 2).
- Produces:
  - `IdiomQuestion({ gap, kid, resting, onDone: (r: { correct: boolean; responseMs: number; picked: string }) => void })`;
  - `PracticeQuestion` gets a `level?: number` prop;
  - `englishFor(text)` in MeaningNote: the 成语 list meaning first, then `glossFor`.

- [ ] **Step 1: Failing tests.**
  - **IdiomQuestion:**
    - it renders the 成语 with a `.idiom__slot` in place of the answer, plus 4 `.choice` buttons;
    - a right pick fills the slot;
    - a wrong pick shows the whole 成语, a `SpeakButton`, and a `.sheet__en` holding the 成语's English;
    - the question itself has no `lang="en"`.
  - **PracticeQuestion:**
    - `ask: 'idiom'` for 心 at level 1 renders `.idiom`;
    - `idiomFit` renders `UseQuestion` (`.choice` ×4, with options four characters long);
    - `idiomBuild` renders `.build`;
    - `whole` for a school 成语 renders `.idiom`.
  - **MeaningNote:** `right="五颜六色"` shows the list meaning.

```tsx
// IdiomQuestion.test.tsx
it('completes the 成语 and explains it in English after a miss (spec §3.6)', async () => {
  const gap = idiomGap({ ...chengyuOf('五颜六色')!, school: false }, '颜', mulberry32(1))!;
  const done = vi.fn();
  render(<IdiomQuestion gap={gap} kid={DEFAULT_KID} resting="neutral" onDone={done} />);
  expect(document.querySelector('.idiom__slot')).toBeTruthy();
  expect(document.querySelector('[lang="en"]')).toBeNull();
  const wrong = gap.options.find((o) => o !== '颜')!;
  fireEvent.click(screen.getByRole('button', { name: wrong }));
  expect(document.querySelector('.sheet__en')?.textContent).toContain(chengyuOf('五颜六色')!.meaning);
  fireEvent.click(screen.getByText('继续'));
  expect(done).toHaveBeenCalledWith(expect.objectContaining({ correct: false, picked: wrong }));
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/activities/practice src/ui/stage`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`IdiomQuestion`** mirrors `MatchQuestion`:
    - the bubble reads `'填哪个字？'`;
    - `.idiom` shows each character, or the `.idiom__slot` (`？`, then the answer once picked);
    - `.choices` holds the 4 options;
    - after a pick, `speak(idiom.text)`;
    - the wrong sheet shows the whole 成语 in `.hanzi`, a `SpeakButton`, and `<MeaningNote right={idiom.text} picked={null} />`.
  - **PracticeQuestion:**
    - a `useMemo` per ask builds from `idiomsFor(word, level ?? 1, pool)`. The first idiom is random among those in the closest tier: take all those whose level equals the first one's, then shuffle.
    - for `whole`, it uses `idiomOf(word)`;
    - `idiom` and `whole` render `IdiomQuestion`, with result `asked: 'meaning'`;
    - `idiomFit` renders `UseQuestion` with the item, with result `asked: 'meaning'`;
    - `idiomBuild` renders `BuildSentence` with the item and `word` set to the idiom's text as a word-like object, with result `asked: 'use'`.
    - It calls `onDone(null)` when the builder returns null.
  - **MeaningNote:** look up `chengyuOf(text)?.meaning ?? glossFor(text)`.
  - **SessionScreen:**
    - compute `level = learnerLevel(know.words, new Set(know.cards.filter(c => c.kind === 'recognise').map(c => c.wordId)))` once per load;
    - pass it to `planPractice`, `planFreePlay` and `PracticeQuestion`.
  - **CSS:** `.idiom` is a flex row of 4 hanzi boxes, sized like `.match`.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/activities src/ui src/app`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: 成语 questions on the stage — complete it, pick it, build with it; the sheet gives its English`

### Task 6: School 成语: the 认字-style card, sentences, and typing them in

**Files:**
- Modify: `src/content/glossary.ts` (`cardMeaning`), `src/activities/flashcards/meaning.ts` (`meaningCue` for 成语 words), `src/content/zuju.ts` (`zujuFor` for 成语 words), `src/parent/WordsPanel.tsx`, `src/content/parseWordList.ts`
- Test: `src/content/glossary.test.ts` (or the existing cardMeaning test), `src/activities/flashcards/meaning.test.ts`, `src/content/zuju.test.ts`, `src/parent/parentB.test.tsx` (or a new `wordsIdioms.test.tsx`)

**Interfaces:**
- Consumes: `idiomOf`, `chengyuOf`.
- Produces:
  - `cardMeaning(w)` for a parent word: `w.meaning ?? chengyuOf(w.text)?.meaning`;
  - `meaningCue(idiomWord)`, after class sentences: a sentence cue from the list's sentences, with `wrong` = 3 other 成语 within one level (`source: 'bank'`);
  - `zujuFor(idiomWord)` includes the list's sentences;
  - `parseIdiomLines(text): { idioms: { text: string; meaning?: string }[]; rejected: string[] }` (lines `成语` or `成语 = meaning`);
  - a WordsPanel box **"School 成语"** that saves them as parent words: tagged `成语`, `listName: '成语'`, `writeable: false`.
    - A 成语 already on a list gets the tag added.
    - A typed meaning is kept.

- [ ] **Step 1: Failing tests.**
  - `cardMeaning` of a parent word 五颜六色 with no meaning gives the list meaning.
  - `meaningCue` of a school 五颜六色 with no class sentences is a sentence cue from the list, whose 3 `wrong` choices are four-character 成语.
  - `zujuFor` of a school 五颜六色 is non-empty.
  - `parseIdiomLines('一心一意 = with all your heart\n五颜六色\nabc')`:
    - gives two idioms (the first with its meaning);
    - rejects `abc`.
  - **WordsPanel:**
    - typing two 成语 and tapping **Add 成语** saves parent words tagged 成语, with `writeable` false;
    - the message reads `Added 2 成语`.

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/content src/activities/flashcards/meaning.test.ts src/parent`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **meaningCue:** after the class-sentence block, `const idiom = isIdiomWord(word) ? chengyuOf(word.text) : undefined;`. If it has a sentence, pick `idiom.sentences[variant % n]`. The wrong choices are the first 3 of `CHENGYU` near its level, excluding itself; the order is deterministic by text, shuffled only by `fitItem`.
  - **zujuFor:** add `...(isIdiomWord(word) ? chengyuOf(word.text)?.sentences ?? [] : [])`.
  - **WordsPanel box:** a textarea with the label "School 成语 (one a line; add = English meaning if you like)", plus a button "Add 成语".
    - Pinyin comes from `pinyin-pro`.
    - Existing words (by text) get the tag merged, and the meaning if they had none.
- [ ] **Step 4: Run them.**
  - Run: same as Step 2.
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: school 成语 typed in the parent area; their card meaning, sentences and 组句 from the list`

### Task 7: A 成语 on the 认新字 card

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (`Intro`), `src/app/SessionScreen.tsx`, `src/styles.css`
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `idiomsFor`, `learnerLevel`, `pinyin` (pinyin-pro).
- Produces: `FlashcardStep` gets an `idiom?: Idiom | null` prop. `Intro` renders `.intro__idiom` when it is given:
  - pinyin and the 成语;
  - a `SpeakButton`;
  - `.intro__en` with the meaning;
  - `.intro__idiom-sentence` with its first sentence.
  - With a 成语 shown, the extra 组词 example is left out.

- [ ] **Step 1: Failing test.**
  - With `idiom={五颜六色}` on a new-word intro of 颜, the card shows 五颜六色, its pinyin, its English and its sentence, and no `.example`.
  - Without one, it is unchanged (`.example` present when the word has examples).
- [ ] **Step 2: Run it.**
  - Run: `npx vitest run src/activities/flashcards/FlashcardStep.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - SessionScreen passes `idiom={step === 'newwords' ? idiomsFor(flashWord, level, know.words)[0] ?? null : null}`. It is memoised per word, and deterministic: the card always shows the closest one.
- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/activities/flashcards src/app`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: the 认新字 card shows a 成语 that uses the character, at his level or one up`

### Task 8: WebKit: every 成语 screen at every size

**Files:**
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`, `scripts/fit-check.ts` (only if the lesson walker needs a new tap rule)

- [ ] **Step 1: Add the stage cases.**
  - `idiom`: an `IdiomQuestion` for 五颜六色;
  - `idiom-wrong`: the same, with the sheet open after a wrong pick (done by clicking in the runner);
  - `idiom-fit`: a `UseQuestion` with `idiomFitItem`;
  - `idiom-build`: a `BuildSentence` with `idiomZuju`;
  - `intro-idiom`: the new-word intro of 颜 with the 成语.
  - Add each to the runner's case list, with the `cardClipped()` probe.
- [ ] **Step 2: Run the stage cases.**
  - Run: `npx tsx scripts/stage-cases.ts`
  - Expected: `stage cases: ok`.
  - Fix any clipping in CSS. Ledger any layout ruling.
- [ ] **Step 3: Run the whole sweep and the suite.**
  - Run: `npm run fit > .superpowers/sdd/2026-10-05-ziji-lesson-c/fit.log 2>&1; tail -5 .superpowers/sdd/2026-10-05-ziji-lesson-c/fit.log`
  - Expected: 0 problems.
  - Run: `npx vitest run`
  - Expected: all pass.
- [ ] **Step 4: Commit.** `test: 成语 screens in the WebKit stage cases`
