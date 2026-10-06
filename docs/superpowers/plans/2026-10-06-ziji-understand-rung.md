# The Understand rung and its sentences (Word Thief sub-project 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every word up to 二下 gets two short spoken sentences, written for the app. A new ladder rung, **Understand**, plays one of them (sound only) and asks him which English sentence he heard. It sits between Hear and Read, as the spec orders.

**Architecture:**
- **Sentences** are static content, one JSON file per school term: `src/content/sentences/<term>.json`. A loader, `src/content/understand.ts`, finds a word's sentences by its text.
- **A content test** checks every sentence. It contains its word, is short, ends a sentence, uses only characters taught by the word's own term, carries its English, and repeats no other sentence. A script lists what is still to write for a term, with the characters each word may use.
- **The rung** is a new card kind, `understand`, added to `src/ladder/rungs.ts`. It reuses the 2a machinery as it is: a pass on two days' right first answers, the next rung opened on a pass, and `openMissingRungs`.
- **The question**, `UnderstandQuestion`, plays the sentence and offers three English sentences:
  - the right one;
  - the same word's other sentence, so catching the word alone is not enough;
  - a sentence of another word from the same term.
- **Lessons** ask due Understand cards in 练一练, as Hear cards are asked. It is also an ungraded rung-3 practice question.
- **Audio clips** for the sentences come from the audio inventory. The Audio build runs by itself after the push, because it watches `src/content/**`.

**Tech Stack:** Preact + TypeScript, idb, ts-fsrs, vitest + fake-indexeddb, pinyin-pro, playwright-core WebKit.

**Spec:** `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §3.1 (sentences), §3.2 (rung 2 Understand), §4 (audio), §8 (testing). Built on plan 2a, `docs/superpowers/plans/2026-10-06-ziji-word-ladder-engine.md`, which is deployed as e196791.

## Global Constraints

- **Scope:** the parent chose scope (a) on 2026-10-06. That covers every hearable word whose term is 一上, 一下, 二上 or 二下: single characters and ladder 词语, about 2,600 words. 三上 and later come in a later batch.
- **Every sentence uses only characters taught up to the word's own term** (spec §3.1). A word's term is the latest term among its characters, in the order `MOE_TERMS` gives.
- **Each sentence:**
  - contains the word's text exactly;
  - has 5–16 Chinese characters;
  - ends with 。！or？;
  - has no emoji or Latin letters;
  - has English that is plain ASCII, starts with a capital, and is at most 80 characters.
  - The two sentences of a word differ, and so does their English.
  - No two words share a Chinese sentence.
- **Content source rule** (the parent's standing rule): every sentence is written fresh for the app. Nothing comes from the textbook, worksheets or any class material. The setting is everyday Singapore life for a 7–8-year-old (spec §5.9), with Singapore Mandarin usage.
- **Rung order** is Hear → Understand → Read → Use. A rung the word can't be asked is skipped. Understand needs the word to be hearable and to have at least two sentences.
- **Voice:** with no voice (no clip and no iPad Chinese voice), Understand items are skipped, never failed. Lessons still finish.
- **Card ids** stay `${wordId}:${kind}`, and the new kind is `understand`. Old cards are never rewritten.
- **His screens:** English shows only as the answer choices and on the sheet after an answer (spec §3.2 Hear does the same). No emoji.
- **Before each push,** `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` must pass. The WebKit sweep (`npm run fit`) must report 0 problems before the final push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A word whose sentences disappear in a later content update** while its Understand card is open and unpassed. Read must still open for it: the word can't be stuck between Hear and Read. → Task 2 test "an Understand card that can no longer be asked lets Read open".
2. **A lesson saved before 2b** (its plan has no `understandReviewIds`) resumes and finishes. → Task 4 test "a lesson planned before 2b resumes".
3. **No voice:** Understand items never appear and are never graded, and the lesson still finishes. → Task 4 test "no voice: no Understand items".
4. **Three choices with two the same English** (two words with near-identical sentences): the choices are always three distinct strings, or the question is skipped. → Task 3 test "choices are always distinct".
5. **Tapping before the sentence has played.** The choices stay disabled until the sentence ends, or for at most 5 s if no end is reported. A replay never re-disables them. → Task 3 test "choices wait for the sentence".

---

## File map

| File | Responsibility |
|---|---|
| `src/content/sentences/{一上,一下,二上,二下}.json` (new) | The sentences: `{ "word": string, "s": [{ "zh": string, "en": string }, { "zh": string, "en": string }] }[]` |
| `src/content/understand.ts` (new) | `wordTerm`, `allowedChars`, `sentencesFor`, `inScopeWords`, `SENTENCE_TERMS` |
| `src/content/understand.test.ts` (new) | The content rules, and coverage per term |
| `scripts/sentences/todo.ts`, `scripts/sentences/check.ts` (new) | The writer's to-do list for a term (with allowed characters), and a validator that prints each violation |
| `src/types.ts` (modify) | `CardKind` adds `'understand'`; `SessionPlan.understandReviewIds?` |
| `src/ladder/rungs.ts` (modify) | `RungKind` adds `'understand'`; order hear → understand → read → use; `canAskRung` |
| `src/session/record.ts` (modify) | `recordUnderstand`; `openMissingRungs` steps past a rung that can no longer be asked |
| `src/practice/understand.ts` (new) | `understandItem(word, rng)` → `{ zh, en, choices }` or null |
| `src/activities/practice/UnderstandQuestion.tsx` (new) | The question |
| `src/session/plan.ts`, `src/session/practice.ts`, `src/session/round.ts` (modify) | Due Understand cards; asks and grades |
| `src/activities/practice/PracticeQuestion.tsx`, `src/app/SessionScreen.tsx` (modify) | Route and grade `understand` |
| `src/stats/stats.ts`, `src/parent/ProgressPanel.tsx` (modify) | "Understood in a sentence" count |
| `scripts/audio/inventory.ts` (modify) | Clips for every sentence |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` (modify) | A WebKit case for the question |

---

### Task 1: Sentence content: format, loader, rules and the writer's tools

**Files:**
- Create: `src/content/understand.ts`, `src/content/understand.test.ts`, `src/content/sentences/一上.json` (and `一下.json`, `二上.json`, `二下.json`, each starting as `[]`), `scripts/sentences/todo.ts`, `scripts/sentences/check.ts`

**Interfaces:**
- Produces:
  - `SENTENCE_TERMS = ['一上','一下','二上','二下'] as const`
  - `wordTerm(text: string): string | null`, the latest `MOE_TERMS` term among its characters, or null if any character has no term;
  - `allowedChars(term: string): Set<string>`, every character whose term is that term or earlier;
  - `interface Sentence { zh: string; en: string }`;
  - `sentencesFor(text: string): Sentence[]`;
  - `inScopeWords(term: string): Word[]`, the hearable single characters and ladder words of that term in ladder order;
  - `sentenceProblems(word: string, s: Sentence[]): string[]`, empty when clean.

- [ ] **Step 1: Write the failing tests** in `src/content/understand.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allowedChars, inScopeWords, sentenceProblems, sentencesFor, SENTENCE_TERMS, wordTerm } from './understand';
import { schoolTerm } from './index';

describe('a word\'s term and the characters it may use (spec 2026-10-06 §3.1)', () => {
  it('a word belongs to the latest term among its characters', () => {
    const late = ['一', '你'].sort((a, b) => (schoolTerm(a)! < schoolTerm(b)! ? -1 : 1));
    expect(wordTerm('一')).toBe(schoolTerm('一'));
    expect(wordTerm(late.join(''))).toBe(schoolTerm(late[1]!));
    expect(wordTerm('ABC')).toBeNull();
  });
  it('a term may use its own characters and every earlier term\'s, never a later one\'s', () => {
    const a = allowedChars('一上');
    expect(a.has('一')).toBe(true);
    expect([...allowedChars('一下')].length).toBeGreaterThan(a.size);
  });
});

describe('sentence rules', () => {
  const ok = { zh: '我有一个大口袋。', en: 'I have a big pocket.' };
  it('a good pair passes', () => {
    expect(sentenceProblems('大', [{ zh: '我们家很大。', en: 'Our home is big.' }, { zh: '大人在家里。', en: 'The grown-ups are at home.' }]).filter((p) => !p.includes('character'))).toEqual([]);
  });
  it('catches each broken rule', () => {
    const p = (s: { zh: string; en: string }[]) => sentenceProblems('大', s).join(' | ');
    expect(p([{ zh: '我们家。', en: 'Our home.' }, ok])).toMatch(/does not contain/);
    expect(p([{ zh: '大', en: 'Big.' }, ok])).toMatch(/5–16/);
    expect(p([{ zh: '我们家很大', en: 'Our home is big.' }, ok])).toMatch(/end/);
    expect(p([{ zh: '我们家很大。', en: '我们 home.' }, ok])).toMatch(/English/);
    expect(p([{ zh: '我们家很大。', en: 'our home is big.' }, ok])).toMatch(/capital/);
    expect(p([ok, ok])).toMatch(/same/);
    expect(p([{ zh: '我们家很大。', en: 'Our home is big.' }])).toMatch(/two sentences/);
  });
});

describe('the written sentences (every file in src/content/sentences)', () => {
  it('every sentence follows the rules, and no two words share a sentence', () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    for (const term of SENTENCE_TERMS) {
      for (const w of inScopeWords(term)) {
        const s = sentencesFor(w.text);
        if (!s.length) continue;
        problems.push(...sentenceProblems(w.text, s));
        for (const x of s) {
          if (seen.has(x.zh)) problems.push(`${w.text}: "${x.zh}" is also ${seen.get(x.zh)}'s`);
          seen.set(x.zh, w.text);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them.** Run: `npx vitest run --dir src src/content/understand.test.ts`. Expected: FAIL with "Cannot find module './understand'".

- [ ] **Step 3: Implement** `src/content/understand.ts`:

```ts
// Sentences for the Understand rung (spec 2026-10-06 §3.1–3.2): two short spoken sentences per word, written for the app (never
// from class material), each using only characters taught by the word's own school term. One JSON file per term.
import type { Word } from '../types';
import { cardMeaning } from './glossary';
import { builtinWords, MOE_TERMS, schoolTerm } from './index';
import { ladderWords } from './ladder';
import s1a from './sentences/一上.json';
import s1b from './sentences/一下.json';
import s2a from './sentences/二上.json';
import s2b from './sentences/二下.json';

export const SENTENCE_TERMS = ['一上', '一下', '二上', '二下'] as const;
export interface Sentence { zh: string; en: string }
interface Row { word: string; s: Sentence[] }

const BY_WORD = new Map<string, Sentence[]>(([s1a, s1b, s2a, s2b] as Row[][]).flat().map((r) => [r.word, r.s]));
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const order = (t: string) => MOE_TERMS.indexOf(t);

/** The latest school term among the word's characters; null when one has no term. */
export function wordTerm(text: string): string | null {
  let latest: string | null = null;
  for (const c of Array.from(text).filter(isHan)) {
    const t = schoolTerm(c);
    if (!t) return null;
    if (latest === null || order(t) > order(latest)) latest = t;
  }
  return latest;
}

const allowedCache = new Map<string, Set<string>>();
/** Every character taught by the end of this term. */
export function allowedChars(term: string): Set<string> {
  let out = allowedCache.get(term);
  if (!out) {
    out = new Set(builtinWords(0).map((w) => w.text).filter((c) => { const t = schoolTerm(c); return !!t && order(t) <= order(term); }));
    allowedCache.set(term, out);
  }
  return out;
}

export const sentencesFor = (text: string): Sentence[] => BY_WORD.get(text) ?? [];

/** The hearable words of a term, characters and ladder 词语, in ladder order (what the writer works through). */
export function inScopeWords(term: string): Word[] {
  const chars = builtinWords(0).filter((w) => schoolTerm(w.text) === term && !!cardMeaning(w));
  const words = ladderWords().filter((w) => wordTerm(w.text) === term && !!cardMeaning(w));
  return [...chars, ...words].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}

/** What is wrong with a word's sentences (empty when they follow every rule). */
export function sentenceProblems(word: string, s: Sentence[]): string[] {
  const out: string[] = [];
  const term = wordTerm(word);
  if (s.length !== 2) out.push(`${word}: needs two sentences, has ${s.length}`);
  if (s.length === 2 && s[0]!.zh === s[1]!.zh) out.push(`${word}: the same sentence twice`);
  if (s.length === 2 && s[0]!.en === s[1]!.en) out.push(`${word}: the same English twice`);
  const ok = term ? allowedChars(term) : new Set<string>();
  for (const { zh, en } of s) {
    const han = Array.from(zh).filter(isHan);
    if (!zh.includes(word)) out.push(`${word}: "${zh}" does not contain the word`);
    if (han.length < 5 || han.length > 16) out.push(`${word}: "${zh}" has ${han.length} characters (5–16)`);
    if (!/[。！？]$/.test(zh)) out.push(`${word}: "${zh}" must end with 。！or？`);
    if (/[A-Za-z\p{Extended_Pictographic}]/u.test(zh)) out.push(`${word}: "${zh}" has letters or emoji`);
    const late = han.filter((c) => !ok.has(c));
    if (late.length) out.push(`${word}: "${zh}" uses character(s) not taught by ${term ?? 'its term'}: ${[...new Set(late)].join('')}`);
    if (!/^[\x20-\x7E]+$/.test(en) || !en.trim()) out.push(`${word}: English "${en}" must be plain English`);
    else if (!/^[A-Z"']/.test(en)) out.push(`${word}: English "${en}" must start with a capital`);
    if (en.length > 80) out.push(`${word}: English "${en}" is over 80 characters`);
  }
  return out;
}
```

Create each of the four JSON files with `[]`. If `tsconfig.json` lacks `"resolveJsonModule": true`, add it (`src/content` already imports `builtin.json`, so it should be on).

- [ ] **Step 4: Write the tools.**

`scripts/sentences/todo.ts` (`npx tsx scripts/sentences/todo.ts 一上 [from] [count]`) prints, for words of the term without two clean sentences, starting at index `from`, up to `count` (default 60):
- one line per word: `word<TAB>pinyin<TAB>meaning`;
- then one line with every allowed character for the term.

```ts
import { allowedChars, inScopeWords, sentenceProblems, sentencesFor } from '../../src/content/understand';
import { cardMeaning } from '../../src/content/glossary';
const [term = '一上', from = '0', count = '60'] = process.argv.slice(2);
const todo = inScopeWords(term).filter((w) => sentenceProblems(w.text, sentencesFor(w.text)).length > 0);
console.log(`${todo.length} words of ${term} still to write`);
for (const w of todo.slice(Number(from), Number(from) + Number(count))) console.log(`${w.text}\t${w.pinyin}\t${cardMeaning(w)}`);
console.log(`ALLOWED ${[...allowedChars(term)].join('')}`);
```

`scripts/sentences/check.ts` (`npx tsx scripts/sentences/check.ts 一上`) prints each problem across the term, including duplicates across all four files, and a count. It exits 1 if there is any problem:

```ts
import { inScopeWords, sentenceProblems, sentencesFor, SENTENCE_TERMS } from '../../src/content/understand';
const only = process.argv[2];
const seen = new Map<string, string>();
let n = 0;
let written = 0;
let total = 0;
for (const term of SENTENCE_TERMS) {
  for (const w of inScopeWords(term)) {
    const s = sentencesFor(w.text);
    if (term === only || !only) total++;
    if (!s.length) continue;
    if (term === only || !only) written++;
    const ps = sentenceProblems(w.text, s);
    for (const x of s) { if (seen.has(x.zh)) ps.push(`${w.text}: "${x.zh}" is also ${seen.get(x.zh)}'s`); seen.set(x.zh, w.text); }
    if (only && term !== only) continue;
    for (const p of ps) { console.log(p); n++; }
  }
}
console.log(`${n} problems; ${written}/${total} words written${only ? ` in ${only}` : ''}`);
process.exit(n ? 1 : 0);
```

- [ ] **Step 5: Run the tests.** Run: `npx vitest run --dir src src/content/understand.test.ts`. Expected: PASS (the files are still empty). Then run `npx tsx scripts/sentences/todo.ts 一上 0 5`. Expected: a count, 5 word lines and an ALLOWED line.

- [ ] **Step 6: Commit.** Message: `feat(understand): sentence content format, its rules, and the writer's to-do and check tools`

### Task 2: The Understand rung

**Files:**
- Modify: `src/types.ts`, `src/ladder/rungs.ts`, `src/session/record.ts`
- Test: `src/ladder/rungs.test.ts`, `src/session/understandRecord.test.ts` (new)

**Interfaces:**
- Consumes: `sentencesFor` (Task 1).
- Produces:
  - `CardKind` includes `'understand'`;
  - `RungKind = 'hear' | 'understand' | 'read' | 'use'`, with `RUNGS` in that order and `RUNG_CARD.understand = 'understand'`;
  - `canAskRung(word, 'understand')` is `canAskRung(word,'hear') && sentencesFor(word.text).length >= 2`;
  - `recordUnderstand(db, wordId, outcome: { correct: boolean; responseMs: number }, now): Promise<CardRecord>`;
  - `LISTEN_MS = 4000` (exported from record.ts).

- [ ] **Step 1: Write the failing tests.**
  - In `src/ladder/rungs.test.ts`, add tests (with `vi.mock('../content/understand', …)` making `sentencesFor` return two sentences for `'猫'` and none otherwise):
    - for 猫, `RUNGS` is `['hear','understand','read','use']` and `nextRung(word,'hear')` is `'understand'`;
    - for a word with no sentences, `nextRung(word,'hear')` is `'read'`;
    - `isOwned` needs `understand` only when it can be asked.
  - In `src/session/understandRecord.test.ts`, use `freshDb`, `putWords` and the `w:` ladder helpers as `src/ladder/reviewFixes.test.ts` does:
    - "two days' right first Understand answers pass it and open Read": seed a passed hear card and an `understand` card; `recordUnderstand` correct on day 1 and day 2 (responseMs 3000); expect `:understand` to be `passed` and a `:recognise` card due the next day.
    - "an Understand card that can no longer be asked lets Read open": the word has a hear card passed and an unpassed `understand` card, but no sentences (mocked empty). Expect `openMissingRungs(db, now)` to create the `:recognise` card.
    - "the rating allows for listening time": a correct answer at `responseMs` = `SLOW_ANSWER_MS + 3000` rates Good, not Hard, because `LISTEN_MS` is taken off for the rating. The log keeps the raw `responseMs`.

- [ ] **Step 2: Run them.** Run: `npx vitest run --dir src src/ladder src/session/understandRecord.test.ts`. Expected: FAIL (no `understand` rung, no `recordUnderstand`).

- [ ] **Step 3: Implement.**
  - `src/types.ts`: `export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand';`. In `SessionPlan`, add `understandReviewIds?: string[]; // due Understand cards (spec 2026-10-06 §3.2); a plan made before 2b has none`.
  - `src/ladder/rungs.ts`:

```ts
export type RungKind = 'hear' | 'understand' | 'read' | 'use';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning' };
// in canAskRung, before the existing lines:
  if (rung === 'understand') return !!cardMeaning(word) && sentencesFor(word.text).length >= 2;
```

  Import `sentencesFor` from `'../content/understand'`. The pass rule and `nextRung` need no change.
  - `src/session/record.ts`:

```ts
/** Listening to a sentence takes time before he can answer: it isn't slowness (the log keeps the real time). */
export const LISTEN_MS = 4000;

/** He heard a sentence with the word and picked its English (the Understand rung, spec 2026-10-06 §3.2). */
export async function recordUnderstand(db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', correct: outcome.correct, responseMs: Math.max(0, outcome.responseMs - LISTEN_MS) });
  const card = await reviewCard(db, wordId, 'understand', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'understand', at: now.getTime(), rating, ...outcome });
  return (await settleRung(db, wordId, 'understand', now)) ?? card;
}
```

  In `openMissingRungs`, also treat an **unpassed** card whose rung can no longer be asked as passed for opening purposes. Change the `if (!rung || !c.passed) continue;` line and the line after it to:

```ts
    if (!rung) continue;
    const word = await findWord(db, c.wordId);
    // a rung that can no longer be asked (its sentences were removed) never strands the word: the next rung opens (Review Focus 1)
    if (!c.passed && !(word && !canAskRung(word, rung))) continue;
```

  Then keep the existing `next` / `id` logic, removing the now-duplicate `findWord` line. Import `canAskRung` from `'../ladder/rungs'` if it isn't already.

- [ ] **Step 4: Run them.** Run: `npx vitest run --dir src src/ladder src/session`. Expected: PASS. Run `npx tsc --noEmit -p .`; the `Record<…>` maps over `CardKind` or `RungKind` (Skills, stats) will name what needs an `understand` entry. Add `understand` where tsc asks:
  - in `SKILL_CARD`, map nothing new; Skills has no understand skill;
  - for any `Record<CardKind, …>` that tsc names, give `understand` the same value as `hear`.

- [ ] **Step 5: Commit.** Message: `feat(understand): the Understand rung between Hear and Read — passed on two days, a stranded rung lets Read open`

### Task 3: The question

**Files:**
- Create: `src/practice/understand.ts`, `src/practice/understand.test.ts`, `src/activities/practice/UnderstandQuestion.tsx`, `src/activities/practice/UnderstandQuestion.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `sentencesFor`, `wordTerm`, `inScopeWords` (Task 1).
- Produces:
  - `interface UnderstandItem { zh: string; en: string; choices: string[] }`;
  - `understandItem(word: Word, rng: Rng): UnderstandItem | null`;
  - `UnderstandQuestion({ item, kid, resting, onDone: (r: { correct: boolean; responseMs: number }) => void })`.

- [ ] **Step 1: Write the failing tests.**
  - `src/practice/understand.test.ts`, with `vi.mock('../content/understand', …)`. Give 猫 two sentences, and 狗 (same term) two others:
    - "the answer, the word's other sentence and another word's": for 猫, `choices` has 3 items, includes `item.en`, and includes 猫's other English; the third is one of 狗's.
    - "choices are always distinct": when 狗's English equals 猫's other English, the third choice is a different string. If no distinct third exists, the result is `null`.
    - "a word with fewer than two sentences has no item": returns null.
  - `src/activities/practice/UnderstandQuestion.test.tsx`, mocking `../../audio/speech` (`speak`, `stopSpeaking`) and `../../audio/speaking` (`onSpeaking` capturing its listener) as other tests do:
    - "plays the sentence and shows no Chinese before the answer": `speak` is called with `item.zh`, and the page has no element containing `item.zh`.
    - "choices wait for the sentence": the buttons are disabled at first. After the captured listener is called with `false`, they are enabled. In a second render with fake timers and no end event, they are enabled after 5000 ms.
    - "a right pick: good sheet; a wrong pick: the sentence with its English": clicking the right choice shows `.sheet--good`. Clicking a wrong one shows `.sheet--oops`, `item.zh` and `item.en`. `继续` calls `onDone` with `correct`.

- [ ] **Step 2: Run them.** Run: `npx vitest run --dir src src/practice/understand.test.ts src/activities/practice/UnderstandQuestion.test.tsx`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/practice/understand.ts`:**

```ts
// The Understand question (spec 2026-10-06 §3.2): one of the word's sentences, heard; its English among three — the right one,
// the word's other sentence (catching the word alone isn't enough), and a sentence of another word from the same term.
import { inScopeWords, sentencesFor, wordTerm } from '../content/understand';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface UnderstandItem { zh: string; en: string; choices: string[] }

export function understandItem(word: Word, rng: Rng): UnderstandItem | null {
  const own = sentencesFor(word.text);
  if (own.length < 2) return null;
  const pick = Math.floor(rng() * own.length);
  const right = own[pick]!;
  const other = own[(pick + 1) % own.length]!;
  if (other.en === right.en) return null;
  const term = wordTerm(word.text);
  const pool = shuffle((term ? inScopeWords(term) : []).filter((w) => w.text !== word.text).flatMap((w) => sentencesFor(w.text)), rng);
  const third = pool.find((s) => s.en !== right.en && s.en !== other.en && !s.zh.includes(word.text));
  if (!third) return null;
  return { zh: right.zh, en: right.en, choices: shuffle([right.en, other.en, third.en], rng) };
}
```

- [ ] **Step 4: Implement `UnderstandQuestion.tsx`.** Follow `MatchQuestion.tsx`'s shape (Stage, Pet, FeedbackSheet, CHEERS/COMFORTS lines):
  - **On mount:** `speak(item.zh)`. Subscribe with `onSpeaking((on) => { if (!on) setReady(true); })`, and set a 5000 ms timer to `setReady(true)`. Clean both up.
  - **Card:** a big `SpeakButton text={item.zh} big` (replay), then a `.choices.understand__choices` list of `item.choices` as `button.choice.press.understand__choice` with `lang="en"`. The buttons are `disabled={done || !ready}`. Truffle's bubble while waiting is `听一听，是什么意思？`.
  - **On pick:** `playSfx`. `responseMs` is measured from the moment `ready` became true, so waiting for the sentence is not counted.
  - **Sheet:** after a right pick, `tone="good"` with a cheer line. After a wrong pick, `tone="oops"` with:
    - `detail` = `<Label zh={item.zh} />`, a small `SpeakButton`, and `<p lang="en" class="sheet__en-line">{item.en}</p>`;
    - classes `is-answer` / `is-wrong` / `is-dim` on the choices, as MatchQuestion does.
  - **继续** calls `onDone({ correct, responseMs })`.
  - **CSS** in `src/styles.css`:

```css
/* the Understand question: English sentences as choices, one per row (spec 2026-10-06 §3.2) */
.understand__choices { grid-template-columns: 1fr; }
.understand__choice { font-family: var(--font, system-ui); font-size: 19px; font-weight: 700; text-align: left; line-height: 1.3; padding: 12px 16px; min-height: 56px; }
@media (max-width: 599px) { .understand__choice { font-size: 17px; padding: 10px 12px; } }
```

- [ ] **Step 5: Run them.** Run: `npx vitest run --dir src src/practice src/activities/practice`. Expected: PASS. Also run `npx vitest run --dir src src/ui/childEmoji.test.ts`; the English choices are text, so there is no emoji.

- [ ] **Step 6: Commit.** Message: `feat(understand): the question — hear a sentence, pick what it means from three`

### Task 4: Lessons ask and grade it

**Files:**
- Modify: `src/session/plan.ts`, `src/session/practice.ts`, `src/session/round.ts`, `src/activities/practice/PracticeQuestion.tsx`, `src/app/SessionScreen.tsx`
- Test: `src/session/plan.test.ts`, `src/session/round.test.ts`, `src/app/SessionScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `UNDERSTAND_REVIEW_CAP = 30`;
  - `Ask` gains `'understand'`, and `ASKS[3]` becomes `['fit', 'usage', 'understand']`;
  - `Grades` gains `'understand'`;
  - `RoundWord.gradesUnderstand?: boolean`;
  - `PracticeResult.asked` gains `'understand'`.

- [ ] **Step 1: Write the failing tests.**
  - `plan.test.ts`, "due Understand cards are reviewed, askable ones only, at most 30": cards `w:猫猫:understand` due (with sentences mocked) and `w:狗狗:understand` due (no sentences). Expect `understandReviewIds` to be `['w:猫猫']`.
  - `round.test.ts`, "a word whose Understand card is due is first asked 'understand' and graded by it": `buildRound([{ wordId:'x', isNew:false, from:3, appearances:1, gradesRecognise:false, gradesMeaning:false, gradesUnderstand:true }], () => true, rng)` gives `[{ ask:'understand', grades:'understand' }]`. And "an ungraded rung-3 item may be 'understand'": with `gradesUnderstand` false and only `understand` askable at rung 3, the item's ask is `'understand'` and `grades` is `'use'`.

    The second test's expected `grades` must match `buildRound`'s existing rung-3 rule (`rung === 3 → 'use'`). Change that rule so an `understand` ask on rung 3 grades `null`: it is listening practice, not use. Expected: `grades: null`.
  - `SessionScreen.test.tsx`:
    - "a lesson planned before 2b resumes": save a session whose `plan` has no `understandReviewIds`, render, and `playThrough` reaches `太棒了！`.
    - "no voice: no Understand items": with `voice: false` in the app data (see how existing no-voice tests set it), `planPractice` returns no item with `ask: 'understand'`.

- [ ] **Step 2: Run them.** Run: `npx vitest run --dir src src/session src/app/SessionScreen.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `plan.ts`: `const understand = ofKind('understand');` and in the returned plan:

```ts
    understandReviewIds: dueOf(understand).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'understand'); }).slice(0, UNDERSTAND_REVIEW_CAP).map((c) => c.wordId),
```

    `byId` holds the active words. Ladder words reach planning through the same lists that the hear review uses; mirror how `hearReviewIds` finds them.
  - `round.ts`: add `'understand'` to `Ask` and to `ASKS[3]`, and `'understand'` to `Grades`. In `RoundWord`, add `gradesUnderstand?: boolean`. In `buildRound`, at the plan step, treat `gradesUnderstand` like `gradesHear`: the first appearance asks `'understand'` when `canAsk(id,'understand')`. When grading, put `if (s.next === 0 && s.w.gradesUnderstand && ask === 'understand') grades = 'understand';` before the hear line. Make `else if (rung === 3 || rung === 4) grades = 'use'` skip `ask === 'understand'` (null).
  - `practice.ts`:
    - In `practiceWords`, build `const understanding = new Set(rec.plan.understandReviewIds ?? [])`.
    - Add `...(rec.plan.understandReviewIds ?? [])` to the revision id list.
    - Set `gradesUnderstand: understanding.has(wordId)`, and add `|| understanding.has(wordId)` to `due`.
    - For a word only in `understanding`, give it `from: 3`.
    - In `canAsk`: `case 'understand': return voice && understandItem(word, mulberry32(1)) !== null;`.
  - `PracticeQuestion.tsx`: `const understand = useMemo(() => (item.ask === 'understand' ? understandItem(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);`. Add `|| (item.ask === 'understand' && !understand)` to the skip check in the mount effect. Then:

```tsx
  if (item.ask === 'understand') {
    if (!understand) return null;
    return <UnderstandQuestion item={understand} kid={kid} resting={resting} onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'understand' })} />;
  }
```

    Place it before the `if (!sentence)` FlashcardStep branch. Add `'understand'` to `PracticeResult.asked`.
  - `SessionScreen.tsx`: add `item.grades === 'understand' && r.asked === 'understand'` to the grading chain in `onPracticeDone`, before the recognise line, calling `recordUnderstand(db, item.wordId, outcome, now())`. Store it in `know.cardsById` under `${item.wordId}:understand`. The outcome is used as-is: `recordUnderstand` subtracts `LISTEN_MS` itself. Include `...(rec.plan.understandReviewIds ?? [])` in the `want` set that loads words, as `hearReviewIds` is.

- [ ] **Step 4: Run them.** Run: `npx tsc --noEmit -p . && npx vitest run --dir src`. Expected: all pass.

- [ ] **Step 5: Commit.** Message: `feat(understand): lessons review due Understand cards and practise listening on rung 3`

### Task 5: Counts, the Progress tab and audio clips

**Files:**
- Modify: `src/stats/stats.ts`, `src/parent/ProgressPanel.tsx`, `scripts/audio/inventory.ts`
- Test: `src/stats/stats.test.ts` (or the existing summarize test file), `src/parent/progressPanel.test.tsx`, `scripts/audio/inventory.test.ts` (if one exists; else create it)

- [ ] **Step 1: Write the failing tests.**
  - `summarize` counts `understood`: a word with a passed `understand` card counts once.
  - `ProgressPanel` shows `Understood in a sentence` with that number.
  - `buildInventory('t')` has a job of kind `sentence` for a sentence written in `一上.json`. Mock the understand module, or write the test after Task 6 has content; mocking is preferred.

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `Knowledge` gets `understood: number`, which is `count('understand')`.
  - In `ProgressPanel`, after the Heard row, add `<dt>Understood in a sentence</dt><dd>{know.understood}</dd>`.
  - In `inventory.ts`, after the chengyu loop: `for (const term of SENTENCE_TERMS) for (const w of inScopeWords(term)) for (const s of sentencesFor(w.text)) sentence(s.zh);`. Import these from `../../src/content/understand`.

- [ ] **Step 4: Run them.** Run: `npx tsc --noEmit -p . && npx vitest run --dir src && npx vitest run --dir scripts`. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `feat(understand): the Progress tab counts words understood in a sentence; every sentence gets a clip`

### Tasks 6–9: Writing the sentences: 一上 (6), 一下 (7), 二上 (8), 二下 (9)

The same procedure runs for each term. One term is one task, and a task ends with its term complete and clean.

**Files:** `src/content/sentences/<term>.json`.

**The writer's brief** (pass it verbatim to each writing subagent along with its batch):
- **The task:** write exactly two sentences for each word in the batch. They are for a 7–8-year-old boy in Singapore learning Chinese.
- **Each sentence:**
  - contains the word exactly;
  - is 5–16 Chinese characters;
  - ends with 。！or？;
  - uses **only** characters from the ALLOWED line;
  - is natural spoken Singapore Mandarin about everyday life (home, school, the hawker centre, the playground, the MRT, family, pets, weather);
  - is kind and age-appropriate.
- **The two sentences of a word** describe clearly different situations, so their English differs in more than one word.
- **English:** a natural, simple translation, starting with a capital and at most 80 characters.
- **Never** copy or adapt sentences from any textbook, worksheet or published material: write them fresh.
- **Output:** a JSON array `[{"word":"…","s":[{"zh":"…","en":"…"},{"zh":"…","en":"…"}]}]` and nothing else.
- **If a word can't get two good sentences** from the allowed characters, leave it out of the output entirely: skipping is allowed, while forcing an unnatural sentence is not.

- [ ] **Step 1:** Run `npx tsx scripts/sentences/todo.ts <term> 0 100000 > /tmp/<term>-todo.txt` and read the count.
- [ ] **Step 2: Write in parallel batches of 60 words.** One subagent per batch, up to 6 at a time. Each gets the brief, its 60 word lines and the ALLOWED line. Each writes its output to `/tmp/<term>-<batch>.json`.
- [ ] **Step 3: Merge** every batch into `src/content/sentences/<term>.json`, keeping existing rows, with one row per word and the last write winning.
- [ ] **Step 4: Check.** Run `npx tsx scripts/sentences/check.ts <term>`. For each problem, rewrite that word's sentences, or remove the word if no good sentence is possible. Re-run until it prints `0 problems`. Expected: `0 problems; N/M words written in <term>` with N ≥ 0.9 × M.
- [ ] **Step 5: Quality read.** One reviewer subagent reads a random 10% of the term's rows (at least 40) against the brief: naturalness, Singapore usage, age-fit, correct English, and the two sentences being clearly different. Fix or remove every flagged row, then re-run Step 4.
- [ ] **Step 6: Coverage test.** Add the term to a coverage assertion in `understand.test.ts`:

```ts
  it.each(['<term>'])('%s: at least 90% of its words have two sentences', (term) => {
    const ws = inScopeWords(term);
    expect(ws.filter((w) => sentencesFor(w.text).length === 2).length).toBeGreaterThanOrEqual(Math.floor(ws.length * 0.9));
  });
```

  Extend the `it.each` list as each term lands. Run `npx vitest run --dir src src/content`. Expected: PASS.
- [ ] **Step 7: Commit.** Message: `content(understand): sentences for <term> (N words)`

### Task 10: WebKit check, full suite, deploy

**Files:** `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`

- [ ] **Step 1:** Add a stage case `understand`. It renders `UnderstandQuestion` with a real item from `understandItem(<a 一上 word with sentences>, mulberry32(7))` inside the lesson screen wrapper, the same way the `match` case does. In `stage-cases.ts`, at each size, apply the same card-clipping check as `clue`. Then click a wrong choice and check again: a long English line must fit, and nothing may be cut off.
- [ ] **Step 2:** Run `npx tsx scripts/stage-cases.ts`. Expected: `stage cases: ok`.
- [ ] **Step 3:** Run `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2 && npm run fit`. Expected: all pass, and the sweep reports 0 problems.
- [ ] **Step 4:** Push to `main`. The Audio build runs on the `src/content` change and redeploys. Watch it with `gh run list --repo bryanwxt/ziji --limit 3`, then `gh run watch <id> --exit-status` on the dispatched Deploy. Expected: success. Report the number of sentence clips built (from the audio report page) to the parent.
