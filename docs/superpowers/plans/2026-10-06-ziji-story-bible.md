# The story bible and Season 1's first chapters (Word Thief 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the story bible, the Season 1 outline and chapters 1–3 of *The Word Thief*. Every file passes a checking script, so the parent reviews only text that already keeps the rules.

**Architecture:**
- **The chapter format** is parsed by `src/story/format.ts`. It is pure TypeScript with no app imports, so the 3c engine can load the same files later.
- **The rules of spec §7** live in `src/story/check.ts`, as pure functions that return a list of problems.
  - They use the existing content helpers: `allowedChars`, `wordTerm`, `builtinWords` and `ladderWords`.
  - `scripts/story/check.ts` runs them over `docs/story/` and prints problems and season totals.
  - `scripts/story/words.ts` lists candidate slot words for the writer.
- **The writing** is Markdown under `docs/story/`: the bible, the outline and three chapters.

**Tech Stack:** TypeScript, vitest, tsx. There are no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-06-ziji-story-bible-design.md`, with its parent `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §5.

## Global Constraints

- **Season 1 words:** 一上, 一下, 二上 (`SEASON1_TERMS`).
  - Every Chinese character in Granny Dragon's lines and the 听一听 lines (questions and answers included) is in `allowedChars('二上')`.
  - Every slot word is a real `b:` character or `w:` ladder word whose `wordTerm` is one of the three terms.
- **Per chapter:**
  - **Slots:** 6–10 distinct slot words, with no slot word repeated within the chapter, and the frontmatter `slots:` list must equal the slot words used.
  - **Pages:** each page has at most **60** English words (slots count as their English) and at most **4** speech lines.
  - **Granny Dragon:** 1–3 Granny lines.
  - **听一听:** 3–5 lines and 1–2 questions, each question with 3 distinct choices whose right answer appears in the scene. 为什么 questions appear only from chapter 10.
  - **Rescued words:** exactly one `[rescued]` line, in the payoff.
- **Across the season:** the outline has 18 chapters, with about 150 distinct slot words and no slot word planned in two chapters. Chapters 1–6 use no 二上 slot words.
- **No real brand names, logos or businesses.**
- **All text is written fresh,** never taken from the textbook or class material. Mandarin is Singapore Mandarin (组屋, 巴刹, 小贩中心, 食阁…).
- **The child is unnamed.** He is "the Word-Keeper" (the repo is public). He never appears on a page; characters talk out of the page to him.
- **The English is for a confident Year 2 reader:** short sentences, lots of speech, *13-Storey Treehouse* energy.
- **Cast traits are fixed by the spec (§3.1):**
  - Truffle: proud, grumpy (哼！), secretly soft; claims every plan was his.
  - Dog: over-excited Greek-myth expert, always slightly wrong.
  - Ox: literal-minded; the tone misfires.
  - Pig: always hungry; smells trouble.
  - Granny Dragon: Mandarin only, kopitiam, keeps a secret.
  - Hush: theatrical and vain, never scary.
- **Before each commit:** `npx tsc --noEmit -p .` and `npx vitest run src/story` must pass. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A slot whose English contains a `|` or `}`, or a slot inside a speech line.** It must parse as one slot with the right English. Test: Task 1, "a slot inside speech, with punctuation after it".
2. **Mandarin lines with full-width punctuation and an English half containing a `|`.** Split on the first ` | ` only. Test: Task 1, "splits a Mandarin line on its first ' | '".
3. **A ladder word that is also a run of single characters,** for example 门口 vs 门 + 口. The season word count must count the longest match once. Test: Task 2, "counts 门口 as one word, not 门 and 口".
4. **A chapter file with Windows line endings or a trailing blank page.** It must parse the same as the clean file. Test: Task 1, "CRLF and trailing blank lines parse the same".
5. **The chapter's planned slots in the outline drifting from the chapter file.** The check must catch it. Test: Task 2, "a chapter's slots must match its outline row".

---

## File map

| File | Responsibility |
|---|---|
| `src/story/format.ts` | Parses a chapter file into a `Chapter`, parses the outline table, and extracts slots |
| `src/story/format.test.ts` | Parser tests |
| `src/story/check.ts` | `chapterProblems`, `outlineProblems`, `seasonReport` |
| `src/story/check.test.ts` | Rule tests on small fixtures |
| `scripts/story/check.ts` | CLI: checks `docs/story/season-1/*`, prints problems and totals, exits 1 on any problem |
| `scripts/story/words.ts` | CLI: lists candidate slot words for a term (text, pinyin, English), excluding words already planned |
| `docs/story/bible.md` | The bible (spec §3) |
| `docs/story/season-1/outline.md` | 18 chapter rows (spec §4) |
| `docs/story/season-1/ch01.md` – `ch03.md` | Chapters 1–3 in full (spec §6) |

---

### Task 1: The chapter format parser

**Files:**
- Create: `src/story/format.ts`, `src/story/format.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Slot { zh: string; en: string }
export type Line =
  | { kind: 'scene'; id: string }
  | { kind: 'text'; text: string }
  | { kind: 'speech'; who: string; text: string }
  | { kind: 'rescued'; text: string };
export interface Page { lines: Line[] }
export interface Mandarin { who: string; zh: string; en: string }
export interface Question { zh: string; en: string; answer: string; wrong: string[] }
export interface Chapter {
  chapter: number; title: string; place: string; slots: string[];
  setup: Page[]; granny: Mandarin[]; listen: { lines: Mandarin[]; questions: Question[] }; payoff: Page[];
}
export interface OutlineRow { chapter: number; place: string; slots: string[] }
export function slotsIn(text: string): Slot[];
export function plainText(text: string): string; // slots replaced by their English
export function parseChapter(md: string): Chapter; // throws Error(`line N: …`) on anything it can't read
export function parseOutline(md: string): OutlineRow[];
```

- [ ] **Step 1: Write the failing tests.** Create `src/story/format.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseChapter, parseOutline, plainText, slotsIn } from './format';

const CH = `---
chapter: 1
title: The Silent Street
place: hdb
slots: [门, 电梯]
---

## Setup

### Page 1
@scene hdb-morning
Truffle stretched. The {门|door} would not open.
> Truffle: Press the {电梯|lift} button, then!

## Granny
龙奶奶: 你们饿了吗？ | Are you hungry?

## Listen
龙奶奶: 小猫在门口。 | The kitten is at the door.
龙奶奶: 门不开。 | The door won't open.
龙奶奶: 小猫很饿。 | The kitten is hungry.
? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 龙奶奶

## Payoff

### Page 1
[rescued] The words fly home.
> Truffle: 哼！ My plan worked.
`;

describe('story chapter format (spec 3a §6)', () => {
  it('reads the frontmatter, pages, speech, scenes, Granny lines, the 听一听 scene and [rescued]', () => {
    const c = parseChapter(CH);
    expect(c).toMatchObject({ chapter: 1, title: 'The Silent Street', place: 'hdb', slots: ['门', '电梯'] });
    expect(c.setup).toHaveLength(1);
    expect(c.setup[0]!.lines).toEqual([
      { kind: 'scene', id: 'hdb-morning' },
      { kind: 'text', text: 'Truffle stretched. The {门|door} would not open.' },
      { kind: 'speech', who: 'Truffle', text: 'Press the {电梯|lift} button, then!' },
    ]);
    expect(c.granny).toEqual([{ who: '龙奶奶', zh: '你们饿了吗？', en: 'Are you hungry?' }]);
    expect(c.listen.lines).toHaveLength(3);
    expect(c.listen.questions).toEqual([{ zh: '谁在门口？', en: 'Who is at the door?', answer: '小猫', wrong: ['小狗', '龙奶奶'] }]);
    expect(c.payoff[0]!.lines[0]).toEqual({ kind: 'rescued', text: 'The words fly home.' });
  });
  it('a slot inside speech, with punctuation after it', () => {
    expect(slotsIn('> Truffle: Open the {门|door}! Now, {电梯|lift}.')).toEqual([{ zh: '门', en: 'door' }, { zh: '电梯', en: 'lift' }]);
    expect(plainText('Open the {门|door}!')).toBe('Open the door!');
  });
  it("splits a Mandarin line on its first ' | '", () => {
    const c = parseChapter(CH.replace('Are you hungry?', 'Hungry? | Very?'));
    expect(c.granny[0]).toEqual({ who: '龙奶奶', zh: '你们饿了吗？', en: 'Hungry? | Very?' });
  });
  it('CRLF and trailing blank lines parse the same', () => {
    expect(parseChapter(CH.replace(/\n/g, '\r\n') + '\r\n\r\n')).toEqual(parseChapter(CH));
  });
  it('says which line it cannot read', () => {
    expect(() => parseChapter(CH.replace('? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 龙奶奶', '? 谁在门口？ no answers'))).toThrow(/line \d+/);
    expect(() => parseChapter(CH.replace('龙奶奶: 你们饿了吗？ | Are you hungry?', '龙奶奶 你们饿了吗？'))).toThrow(/line \d+/);
  });
  it('reads the outline table', () => {
    const md = `# Season 1\n\n| Ch | Place | Problem | Rule / gag | Slots | Hint |\n|---|---|---|---|---|---|\n| 1 | hdb | The door is stuck | — | 门, 电梯, 信 | — |\n| 2 | hdb | x | y | 家 | — |\n`;
    expect(parseOutline(md)).toEqual([{ chapter: 1, place: 'hdb', slots: ['门', '电梯', '信'] }, { chapter: 2, place: 'hdb', slots: ['家'] }]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/format.test.ts`
  Expected: FAIL, because `./format` doesn't exist.

- [ ] **Step 3: Implement** `src/story/format.ts`:

```ts
// The story's chapter format (spec 2026-10-06 3a §6): Markdown with a small fixed vocabulary. The parent reads these files; the 3c
// engine loads the same ones. Pure: no app imports.
export interface Slot { zh: string; en: string }
export type Line =
  | { kind: 'scene'; id: string }
  | { kind: 'text'; text: string }
  | { kind: 'speech'; who: string; text: string }
  | { kind: 'rescued'; text: string };
export interface Page { lines: Line[] }
export interface Mandarin { who: string; zh: string; en: string }
export interface Question { zh: string; en: string; answer: string; wrong: string[] }
export interface Chapter {
  chapter: number; title: string; place: string; slots: string[];
  setup: Page[]; granny: Mandarin[]; listen: { lines: Mandarin[]; questions: Question[] }; payoff: Page[];
}
export interface OutlineRow { chapter: number; place: string; slots: string[] }

const SLOT = /\{([^|{}]+)\|([^{}]+)\}/g;
export const slotsIn = (text: string): Slot[] => [...text.matchAll(SLOT)].map((m) => ({ zh: m[1]!.trim(), en: m[2]!.trim() }));
export const plainText = (text: string): string => text.replace(SLOT, (_, _zh, en: string) => en.trim());

function mandarin(s: string, n: number): Mandarin {
  const m = /^([^:：]+)[:：]\s*(.+?)\s+\|\s+(.+)$/.exec(s);
  if (!m) throw new Error(`line ${n}: a Mandarin line is "Name: 中文 | English"`);
  return { who: m[1]!.trim(), zh: m[2]!.trim(), en: m[3]!.trim() };
}
function question(s: string, n: number): Question {
  const m = /^\?\s*(.+?)\s+\|\s+(.+?)\s+=\s+(.+)$/.exec(s);
  const choices = m?.[3]!.split('|').map((x) => x.trim()).filter(Boolean) ?? [];
  if (!m || choices.length < 2) throw new Error(`line ${n}: a question is "? 中文 | English = right | wrong | wrong"`);
  return { zh: m[1]!.trim(), en: m[2]!.trim(), answer: choices[0]!, wrong: choices.slice(1) };
}

export function parseChapter(md: string): Chapter {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '---') throw new Error('line 1: a chapter starts with --- frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('line 1: the frontmatter never closes with ---');
  const meta = new Map<string, string>();
  for (let i = 1; i < end; i++) {
    const m = /^(\w+):\s*(.*)$/.exec(lines[i]!.trim());
    if (!m) throw new Error(`line ${i + 1}: frontmatter is "key: value"`);
    meta.set(m[1]!, m[2]!);
  }
  const slots = (meta.get('slots') ?? '').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean);
  const c: Chapter = {
    chapter: Number(meta.get('chapter')), title: meta.get('title') ?? '', place: meta.get('place') ?? '', slots,
    setup: [], granny: [], listen: { lines: [], questions: [] }, payoff: [],
  };
  if (!Number.isInteger(c.chapter) || c.chapter < 1) throw new Error('line 2: chapter must be a whole number from 1');
  let section = '';
  let page: Page | null = null;
  for (let i = end + 1; i < lines.length; i++) {
    const n = i + 1;
    const s = lines[i]!.trim();
    if (!s) continue;
    if (s.startsWith('## ')) { section = s.slice(3).trim().toLowerCase(); page = null; continue; }
    if (s.startsWith('### ')) {
      if (section !== 'setup' && section !== 'payoff') throw new Error(`line ${n}: pages belong in Setup or Payoff`);
      page = { lines: [] };
      c[section].push(page);
      continue;
    }
    if (section === 'granny') { c.granny.push(mandarin(s, n)); continue; }
    if (section === 'listen') { if (s.startsWith('?')) c.listen.questions.push(question(s, n)); else c.listen.lines.push(mandarin(s, n)); continue; }
    if (!page) throw new Error(`line ${n}: text outside a page`);
    if (s.startsWith('@scene ')) page.lines.push({ kind: 'scene', id: s.slice(7).trim() });
    else if (s.startsWith('[rescued]')) page.lines.push({ kind: 'rescued', text: s.slice(9).trim() });
    else if (s.startsWith('>')) {
      const m = /^>\s*([^:]+):\s*(.+)$/.exec(s);
      if (!m) throw new Error(`line ${n}: speech is "> Name: line"`);
      page.lines.push({ kind: 'speech', who: m[1]!.trim(), text: m[2]!.trim() });
    } else page.lines.push({ kind: 'text', text: s });
  }
  return c;
}

/** The outline's table rows: | Ch | Place | Problem | Rule / gag | Slots | Hint |. */
export function parseOutline(md: string): OutlineRow[] {
  return md.replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((x) => x.trim());
      return { chapter: Number(cells[0]), place: cells[1]!, slots: cells[4]!.split(/[,，、]/).map((x) => x.trim()).filter((x) => x && x !== '—') };
    });
}
```

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story/format.test.ts && npx tsc --noEmit -p .`
  Expected: PASS, and tsc is clean.

- [ ] **Step 5: Commit.**

```bash
git add src/story/format.ts src/story/format.test.ts
git commit -m "story: the chapter format parser (3a §6)"
```

### Task 2: The checks, the check script and the word lister

**Files:**
- Create: `src/story/check.ts`, `src/story/check.test.ts`, `scripts/story/check.ts`, `scripts/story/words.ts`

**Interfaces:**
- Consumes: Task 1's `Chapter`, `OutlineRow`, `slotsIn`, `plainText`, `parseChapter` and `parseOutline`. Also `allowedChars(term)` and `wordTerm(text)` from `src/content/understand.ts`, `builtinWords(now)` from `src/content/index.ts`, and `ladderWords()` from `src/content/ladder.ts`.
- Produces:

```ts
export const SEASON1_TERMS = ['一上', '一下', '二上'] as const;
export const MAX_PAGE_WORDS = 60;
export const MAX_SPEECH = 4;
export const BRANDS: RegExp;
export function chapterProblems(c: Chapter, outline?: OutlineRow): string[];
export function outlineProblems(rows: OutlineRow[]): string[];
export function storyWords(text: string): string[]; // longest-match words (b:/w: texts) in a Chinese string
export function seasonReport(chapters: Chapter[], rows: OutlineRow[]): { slotWords: number; byTerm: Record<string, number>; mandarinWords: number };
```

- [ ] **Step 1: Write the failing tests.** Create `src/story/check.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { chapterProblems, outlineProblems, seasonReport, storyWords } from './check';
import { parseChapter, type OutlineRow } from './format';

const page = (body: string) => `### Page 1\n${body}\n`;
const make = (o: { slots?: string; setup?: string; granny?: string; listen?: string; payoff?: string; chapter?: number } = {}) => parseChapter(`---
chapter: ${o.chapter ?? 1}
title: T
place: hdb
slots: [${o.slots ?? '门, 车, 鱼, 书, 猫, 狗'}]
---
## Setup
${page(o.setup ?? 'The {门|door}, the {车|car}, the {鱼|fish}, the {书|book}, the {猫|cat} and the {狗|dog}.')}
## Granny
${o.granny ?? '龙奶奶: 你好！ | Hello!'}
## Listen
${o.listen ?? '龙奶奶: 小猫在门口。 | The kitten is at the door.\n龙奶奶: 门不开。 | The door won\'t open.\n龙奶奶: 小猫很饿。 | The kitten is hungry.\n? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 小鸟'}
## Payoff
${page(o.payoff ?? '[rescued] The words fly home.')}
`);

describe('chapter rules (spec 3a §7)', () => {
  it('a good chapter has no problems', () => {
    expect(chapterProblems(make())).toEqual([]);
  });
  it('Granny and 听一听 use only characters taught by 二上', () => {
    expect(chapterProblems(make({ granny: '龙奶奶: 我们去旅游吧。 | Let us travel.' })).join()).toMatch(/not taught by 二上/);
  });
  it('slot words must be real and taught by 二上', () => {
    const ps = chapterProblems(make({ slots: '门, 车, 鱼, 书, 猫, 旅游', setup: 'The {门|door}, {车|car}, {鱼|fish}, {书|book}, {猫|cat}, {旅游|travel}.' }));
    expect(ps.join()).toMatch(/旅游/);
  });
  it('6–10 slots, none repeated, and the frontmatter lists exactly the slots used', () => {
    expect(chapterProblems(make({ slots: '门', setup: 'The {门|door}.' })).join()).toMatch(/6–10/);
    expect(chapterProblems(make({ setup: 'The {门|door} and {门|door}, {车|car}, {鱼|fish}, {书|book}, {猫|cat}, {狗|dog}.' })).join()).toMatch(/twice/);
    expect(chapterProblems(make({ slots: '门, 车, 鱼, 书, 猫, 狗, 家' })).join()).toMatch(/frontmatter/);
  });
  it('a page has at most 60 English words and 4 speech lines', () => {
    const long = Array.from({ length: 61 }, () => 'word').join(' ');
    expect(chapterProblems(make({ payoff: `[rescued] Home.\n${long}` })).join()).toMatch(/60/);
    const talk = Array.from({ length: 5 }, () => '> Dog: Hi!').join('\n');
    expect(chapterProblems(make({ payoff: `[rescued] Home.\n${talk}` })).join()).toMatch(/speech/);
  });
  it('听一听 has 3–5 lines, 1–2 questions, 3 distinct choices, the answer in the scene; 为什么 only from chapter 10', () => {
    expect(chapterProblems(make({ listen: '龙奶奶: 门不开。 | The door is stuck.\n? 谁在门口？ | Who? = 小猫 | 小狗 | 小鸟' })).join()).toMatch(/3–5 lines/);
    expect(chapterProblems(make({ listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 谁在门口？ | Who? = 小狗 | 小猫 | 小鸟' })).join()).toMatch(/answer/);
    expect(chapterProblems(make({ listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 小猫为什么在门口？ | Why? = 很饿 | 很高 | 很大' })).join()).toMatch(/为什么/);
    expect(chapterProblems(make({ chapter: 10, listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 小猫为什么在门口？ | Why? = 很饿 | 很高 | 很大' }))).toEqual([]);
  });
  it('exactly one [rescued], in the payoff', () => {
    expect(chapterProblems(make({ payoff: 'The words fly home.' })).join()).toMatch(/\[rescued\]/);
  });
  it('no real brand names', () => {
    expect(chapterProblems(make({ payoff: '[rescued] They went to McDonald\'s.' })).join()).toMatch(/brand/);
  });
  it("a chapter's slots must match its outline row", () => {
    const row: OutlineRow = { chapter: 1, place: 'hdb', slots: ['门', '车', '鱼', '书', '猫', '家'] };
    expect(chapterProblems(make(), row).join()).toMatch(/outline/);
  });
});

describe('the outline (spec 3a §4–5)', () => {
  const row = (chapter: number, slots: string[]): OutlineRow => ({ chapter, place: 'hdb', slots });
  it('18 chapters, slots planned once each, no 二上 slot before chapter 7', () => {
    expect(outlineProblems([row(1, ['门'])]).join()).toMatch(/18/);
    const rows = Array.from({ length: 18 }, (_, i) => row(i + 1, []));
    rows[0] = row(1, ['门', '车']);
    rows[1] = row(2, ['门']);
    rows[2] = row(3, ['树']); // 树 is 二上
    const ps = outlineProblems(rows).join();
    expect(ps).toMatch(/门.*chapters 1 and 2/);
    expect(ps).toMatch(/树/);
  });
});

describe('season words', () => {
  it('counts 门口 as one word, not 门 and 口', () => {
    expect(storyWords('小猫在门口。')).toEqual(['小猫', '在', '门口']);
  });
  it('reports distinct slot words by term and the words in Granny and 听一听', () => {
    const r = seasonReport([make()], []);
    expect(r.slotWords).toBe(6);
    expect(r.byTerm['一上']).toBeGreaterThan(0);
    expect(r.mandarinWords).toBeGreaterThan(3);
  });
});
```

The fixture words were checked on 2026-10-06: 门 车 鱼 书 家 门口 在 are 一上, 猫 狗 小猫 are 一下, 树 is 二上, 旅游 is 三上, and every character of the fixture Mandarin is taught by 二上 except 旅 and 吧.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/check.test.ts`
  Expected: FAIL, because `./check` doesn't exist.

- [ ] **Step 3: Implement** `src/story/check.ts`:

```ts
// The story's writing rules (spec 2026-10-06 3a §7): every problem as a line the writer can act on.
import { builtinWords } from '../content';
import { ladderWords } from '../content/ladder';
import { allowedChars, wordTerm } from '../content/understand';
import { plainText, slotsIn, type Chapter, type OutlineRow, type Page } from './format';

export const SEASON1_TERMS = ['一上', '一下', '二上'] as const;
export const MAX_PAGE_WORDS = 60;
export const MAX_SPEECH = 4;
export const BRANDS = /\b(mcdonald'?s?|kfc|starbucks|coca[- ]?cola|coke|pepsi|lego|disney|nike|adidas|pok[eé]mon|grab|ntuc|fairprice|toast box|ya kun|old chang kee|7[- ]?eleven|ikea|apple|samsung|nintendo)\b/i;

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
let words: Set<string> | null = null;
/** Every word the app knows by text: single characters (b:) and ladder 词语 (w:). */
function wordTexts(): Set<string> {
  words ??= new Set([...builtinWords(0).map((w) => w.text), ...ladderWords().map((w) => w.text)]);
  return words;
}
const inSeason = (text: string) => (SEASON1_TERMS as readonly string[]).includes(wordTerm(text) ?? '');

function pageProblems(where: string, p: Page): string[] {
  const out: string[] = [];
  const english = p.lines.flatMap((l) => (l.kind === 'scene' ? [] : [plainText(l.text)])).join(' ').replace(/\p{Script=Han}+/gu, ' ');
  const count = english.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  if (count > MAX_PAGE_WORDS) out.push(`${where}: ${count} English words (at most ${MAX_PAGE_WORDS})`);
  const speech = p.lines.filter((l) => l.kind === 'speech').length;
  if (speech > MAX_SPEECH) out.push(`${where}: ${speech} speech lines (at most ${MAX_SPEECH})`);
  return out;
}

export function chapterProblems(c: Chapter, outline?: OutlineRow): string[] {
  const out: string[] = [];
  const ch = `ch${String(c.chapter).padStart(2, '0')}`;
  const allowed = allowedChars('二上');
  // Mandarin: Granny's lines, the 听一听 scene, its questions and answers
  const mandarin = [...c.granny.map((m) => m.zh), ...c.listen.lines.map((m) => m.zh), ...c.listen.questions.flatMap((q) => [q.zh, q.answer, ...q.wrong])];
  for (const zh of mandarin) {
    const bad = [...new Set(Array.from(zh).filter((x) => isHan(x) && !allowed.has(x)))];
    if (bad.length) out.push(`${ch}: "${zh}" uses ${bad.join('')} — not taught by 二上`);
  }
  // slots
  const texts = [...c.setup, ...c.payoff].flatMap((p) => p.lines.flatMap((l) => (l.kind === 'scene' ? [] : [l.text])));
  const used = texts.flatMap((t) => slotsIn(t).map((s) => s.zh));
  const distinct = [...new Set(used)];
  for (const w of distinct) {
    if (used.filter((x) => x === w).length > 1) out.push(`${ch}: slot ${w} used twice`);
    if (!wordTexts().has(w)) out.push(`${ch}: slot ${w} is not a word in the app`);
    else if (!inSeason(w)) out.push(`${ch}: slot ${w} is ${wordTerm(w) ?? 'beyond school order'}, not 一上–二上`);
  }
  if (distinct.length < 6 || distinct.length > 10) out.push(`${ch}: ${distinct.length} slot words (6–10)`);
  const listed = [...c.slots].sort().join(',');
  if (listed !== [...distinct].sort().join(',')) out.push(`${ch}: frontmatter slots [${c.slots.join(', ')}] ≠ slots used [${distinct.join(', ')}]`);
  if (outline && [...outline.slots].sort().join(',') !== [...distinct].sort().join(',')) out.push(`${ch}: slots [${distinct.join(', ')}] ≠ the outline's [${outline.slots.join(', ')}]`);
  // pages
  c.setup.forEach((p, i) => out.push(...pageProblems(`${ch} setup page ${i + 1}`, p)));
  c.payoff.forEach((p, i) => out.push(...pageProblems(`${ch} payoff page ${i + 1}`, p)));
  // Granny and 听一听
  if (c.granny.length < 1 || c.granny.length > 3) out.push(`${ch}: ${c.granny.length} Granny lines (1–3)`);
  const scene = c.listen.lines.map((m) => m.zh).join('');
  if (c.listen.lines.length < 3 || c.listen.lines.length > 5) out.push(`${ch}: 听一听 has ${c.listen.lines.length} lines (3–5 lines)`);
  if (c.listen.questions.length < 1 || c.listen.questions.length > 2) out.push(`${ch}: ${c.listen.questions.length} 听一听 questions (1–2)`);
  for (const q of c.listen.questions) {
    if (new Set([q.answer, ...q.wrong]).size !== 3 || q.wrong.length !== 2) out.push(`${ch}: "${q.zh}" needs 3 distinct choices`);
    if (!scene.includes(q.answer)) out.push(`${ch}: "${q.zh}" — its answer ${q.answer} is not in the scene`);
    if (q.zh.includes('为什么') && c.chapter < 10) out.push(`${ch}: 为什么 questions start from chapter 10`);
  }
  // [rescued]
  const rescuedIn = (ps: Page[]) => ps.flatMap((p) => p.lines).filter((l) => l.kind === 'rescued').length;
  if (rescuedIn(c.setup) > 0 || rescuedIn(c.payoff) !== 1) out.push(`${ch}: exactly one [rescued] line, in the payoff`);
  // brands
  const all = [...texts.map(plainText), ...c.granny.map((m) => m.en), ...c.listen.lines.map((m) => m.en)].join('\n');
  const brand = BRANDS.exec(all);
  if (brand) out.push(`${ch}: a real brand name (${brand[0]})`);
  return out;
}

export function outlineProblems(rows: OutlineRow[]): string[] {
  const out: string[] = [];
  if (rows.length !== 18) out.push(`the outline has ${rows.length} chapters (18)`);
  const first = new Map<string, number>();
  for (const r of rows) {
    for (const w of r.slots) {
      if (first.has(w)) out.push(`slot ${w} is planned in chapters ${first.get(w)} and ${r.chapter}`);
      else first.set(w, r.chapter);
      if (!wordTexts().has(w)) out.push(`ch${r.chapter}: slot ${w} is not a word in the app`);
      else if (!inSeason(w)) out.push(`ch${r.chapter}: slot ${w} is not 一上–二上`);
      else if (r.chapter <= 6 && wordTerm(w) === '二上') out.push(`ch${r.chapter}: slot ${w} is 二上 — chapters 1–6 use 一上/一下 words`);
    }
  }
  return out;
}

/** The app's words in a Chinese string, longest match first (门口, not 门 + 口); characters that aren't words are skipped. */
export function storyWords(text: string): string[] {
  const known = wordTexts();
  const cs = Array.from(text);
  const out: string[] = [];
  for (let i = 0; i < cs.length;) {
    let hit = '';
    for (let n = Math.min(4, cs.length - i); n >= 1; n--) {
      const w = cs.slice(i, i + n).join('');
      if (known.has(w)) { hit = w; break; }
    }
    if (hit) { out.push(hit); i += Array.from(hit).length; } else i++;
  }
  return out;
}

export function seasonReport(chapters: Chapter[], rows: OutlineRow[]): { slotWords: number; byTerm: Record<string, number>; mandarinWords: number } {
  const slots = new Set([...rows.flatMap((r) => r.slots), ...chapters.flatMap((c) => c.slots)]);
  const byTerm: Record<string, number> = {};
  for (const w of slots) { const t = wordTerm(w) ?? '?'; byTerm[t] = (byTerm[t] ?? 0) + 1; }
  const mandarin = new Set(chapters.flatMap((c) => [...c.granny, ...c.listen.lines].flatMap((m) => storyWords(m.zh))));
  return { slotWords: slots.size, byTerm, mandarinWords: mandarin.size };
}
```

Create `scripts/story/check.ts`:

```ts
// Checks the story before the parent sees it (spec 3a §7): npx tsx scripts/story/check.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { chapterProblems, outlineProblems, seasonReport } from '../../src/story/check';
import { parseChapter, parseOutline, type Chapter } from '../../src/story/format';

const dir = 'docs/story/season-1';
const rows = existsSync(`${dir}/outline.md`) ? parseOutline(readFileSync(`${dir}/outline.md`, 'utf8')) : [];
const problems = rows.length ? outlineProblems(rows) : ['no outline yet'];
const chapters: Chapter[] = [];
for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => /^ch\d+\.md$/.test(x)).sort() : []) {
  try {
    const c = parseChapter(readFileSync(`${dir}/${f}`, 'utf8'));
    chapters.push(c);
    problems.push(...chapterProblems(c, rows.find((r) => r.chapter === c.chapter)));
  } catch (e) { problems.push(`${f}: ${(e as Error).message}`); }
}
for (const p of problems) console.log(p);
const r = seasonReport(chapters, rows);
console.log(`${problems.length} problems · ${chapters.length} chapters · ${r.slotWords} slot words ${JSON.stringify(r.byTerm)} · ${r.mandarinWords} words in Granny + 听一听`);
process.exit(problems.length ? 1 : 0);
```

Create `scripts/story/words.ts`:

```ts
// Candidate slot words for the writer: npx tsx scripts/story/words.ts 一上 [filter]   (words already in the outline are left out)
import { existsSync, readFileSync } from 'node:fs';
import { inScopeWords } from '../../src/content/understand';
import { cardMeaning } from '../../src/content/glossary';
import { parseOutline } from '../../src/story/format';

const term = process.argv[2] as '一上' | '一下' | '二上';
const filter = process.argv[3];
const planned = new Set(existsSync('docs/story/season-1/outline.md') ? parseOutline(readFileSync('docs/story/season-1/outline.md', 'utf8')).flatMap((r) => r.slots) : []);
for (const w of inScopeWords(term)) {
  const en = cardMeaning(w) ?? '';
  if (planned.has(w.text) || (filter && !w.text.includes(filter) && !en.includes(filter))) continue;
  console.log(`${w.text}\t${w.pinyin}\t${en}`);
}
```

`inScopeWords(term)` is the 2b helper in `src/content/understand.ts`: the hearable characters and ladder words of a term, sorted by rank. If its parameter type is narrower than a plain string, cast as needed.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story && npx tsc --noEmit -p .`
  Expected: PASS.
  Then run `npx tsx scripts/story/check.ts`.
  Expected: it prints `no outline yet` and exits 1. Nothing has been written yet.

- [ ] **Step 5: Commit.**

```bash
git add src/story scripts/story
git commit -m "story: the writing rules, the check script and the word lister (3a §7)"
```

### Task 3: The story bible

**Files:**
- Create: `docs/story/bible.md`

**Interfaces:**
- Consumes: spec 3a §3 and parent spec §5.1–5.3 and §5.9.
- Produces: the cast, places, rules and arc that Tasks 4–5 write from. Tasks 4–5 must not contradict it.

- [ ] **Step 1: Write the bible** with these sections, in this order:
  1. **Voice:** how the story reads.
     - It is for a confident Year 2 reader: sentences mostly under 12 words, speech carries the jokes, and each page ends on a small pull forward.
     - It describes how word slots look and that the Word-Keeper is talked to directly.
     - Tone: *Treehouse* slapstick, *Bad Guys* crew banter, *Charlie*'s mad inventor, Sanderson-style planted clues.
     - It includes the rules every chapter keeps, as a short list for future writers, starting with the Global Constraints of this plan.
  2. **Cast:** for each character, a paragraph with:
     - who they are;
     - what they want;
     - their trait;
     - their running gag, with 3 example lines;
     - how they talk;
     - a short visual note for 3b: species, colours, one prop.
     - The Word-Keeper's entry explains why he's never named or shown.
     - Granny Dragon's entry lists the kinds of things she says (food, school, the weather, gentle questions), all in short Mandarin.
     - Hush's entry has his look, his machine (the Hush-o-Matic), his catchphrase, and his secret.
  3. **字己镇:** the nine places from parent spec §5.9.
     - Each has a line on what it looks like, what goes wrong when it loses its words, and its 3b background ids, such as `hdb-morning` and `hawker-noon`.
     - Season 1 uses the HDB block, the hawker centre, the wet market, the school and the playground.
  4. **The magic:** the three rules.
     - For each, the in-story scene in Season 1 that first shows it.
     - The rule that magic never solves a problem with a rule the reader hasn't been shown.
  5. **The arc:**
     - the crew of 12 across the seasons, with Season 1 recruiting Dog, Ox and Pig;
     - Hush's secret, with the hint schedule (Season 1: hint 1 in ch 9–14, hint 2 in ch 15–17; one per later season);
     - the series finale, where the Word-Keeper teaches Hush;
     - the theme: struggling with a language is normal and worth it, shown and never preached.
  6. **Seasons:**
     - Season 1 (一上–二上, catch-up) is *The Silent Street*.
     - Season 2 (二下), with the machine heading for the MRT station.
     - Season 3 (三上, from January).

- [ ] **Step 2: Check it against the spec.** Every item in spec §3.1–3.4 appears, no trait contradicts the Global Constraints, and there are no real brand names.
  Run: `grep -inE "mcdonald|kfc|starbucks|lego|disney|grab|ntuc" docs/story/bible.md`
  Expected: no output.

- [ ] **Step 3: Commit.**

```bash
git add docs/story/bible.md
git commit -m "story: the Word Thief bible (3a §3)"
```

### Task 4: The Season 1 outline

**Files:**
- Create: `docs/story/season-1/outline.md`

**Interfaces:**
- Consumes: the bible (Task 3); `scripts/story/words.ts` for candidates; `scripts/story/check.ts`.
- Produces: 18 rows `| Ch | Place | Problem | Rule / gag | Slots | Hint |` that `parseOutline` reads. Task 5's chapters must use exactly their row's slots.

- [ ] **Step 1: Draft the outline** following spec §4's beats:
  - **Ch 1–3:** the arrival at the HDB block.
  - **Ch 4–5:** Dog at the playground.
  - **Ch 6–7:** Pig at the hawker centre.
  - **Ch 8:** Ox at the wet market.
  - **Ch 9–14:** restoring the school, market and hawker centre. Rule 3 at the school garden (木+木+木). Hint 1.
  - **Ch 15–17:** the word-store under the void deck. Ox opens the lock. Hint 2.
  - **Ch 18:** the finale, with the machine flying to the MRT station.
  - Above the table, give a 4–6 sentence season summary, and add a column note for where rules 1–2 are first shown.

  Choose 7–9 slot words per row, from the row's place and problem, so the season totals about 150:
  - Run `npx tsx scripts/story/words.ts 一上`, `一下` and `二上`, with a filter such as `门` or `food`, to find words that fit.
  - Chapters 1–6 use only 一上 and 一下 words. Later chapters move into 二上, so the season ends mostly in 二上.
  - Each word is planned in one chapter only.
  - Prefer concrete words a scene can show (things, places, actions), and words that fit each place's theme.

- [ ] **Step 2: Run the check.**
  Run: `npx tsx scripts/story/check.ts`
  Expected: the only problems listed are about chapter files, and there are none yet, so the outline lines are clean and the totals line shows about 150 slot words with a 一上/一下/二上 breakdown.
  Fix any outline problem and run it again until no line starts with `slot` or `ch` from the outline.

- [ ] **Step 3: Commit.**

```bash
git add docs/story/season-1/outline.md
git commit -m "story: Season 1 outline — The Silent Street (3a §4)"
```

### Task 5: Chapters 1–3

**Files:**
- Create: `docs/story/season-1/ch01.md`, `ch02.md`, `ch03.md`

**Interfaces:**
- Consumes: the bible, the outline rows 1–3, the format (Task 1) and the checks (Task 2).
- Produces: three chapter files that pass `scripts/story/check.ts` with 0 problems.

- [ ] **Step 1: Write chapter 1** in the spec §6 format:
  - **Setup:** 3–5 pages, each starting with an `@scene` id from the bible and ending on the problem. The Hush-o-Matic hits the block, and the 门 and the lift stop working. Truffle meets the Word-Keeper and talks to him out of the page.
  - **Granny:** 1–3 lines.
  - **Listen:** 3–5 lines with 1 question (谁 or 什么).
  - **Payoff:** 2–3 pages, with exactly one `[rescued]` line written so any set of words can fill it ("The words burst out of the machine and zoom home."), and the cliffhanger as the last line.
  - Use exactly row 1's slots, once each, in natural English sentences.
  - Mandarin: only characters taught by 二上, short sentences (≤12 characters), everyday Singapore usage.

- [ ] **Step 2: Run the check.**
  Run: `npx tsx scripts/story/check.ts`
  Expected: no `ch01` problems. Fix and re-run until clean.

- [ ] **Step 3: Write chapters 2 and 3** the same way.
  - **Ch 2:** the crew-less Truffle and the Word-Keeper try the block's broken things, with the first comic misfire showing rule 1 (a word works only if understood).
  - **Ch 3:** Granny Dragon's kopitiam, her first clue and the first sight of Hush.
  - Use rows 2 and 3's slots.

- [ ] **Step 4: Run the check.**
  Run: `npx tsx scripts/story/check.ts`
  Expected: `0 problems · 3 chapters · …`, exit 0.

- [ ] **Step 5: Self-review for the reader, not the script.** Read each chapter as the parent would and answer these, fixing anything that fails:
  - Would a 7–8-year-old get every joke?
  - Is any sentence over 15 words?
  - Does every page move the story?
  - Is Truffle's voice consistent with the bible?
  - Does every Chinese slot sit where its English would read naturally?

- [ ] **Step 6: Commit.**

```bash
git add docs/story/season-1
git commit -m "story: Season 1 chapters 1–3 (3a §6)"
```

### Task 6: Hand to the parent

- [ ] **Step 1:** Run `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2`.
  Expected: all pass. The new tests are in `src/story`.
- [ ] **Step 2:** Run `npx tsx scripts/story/check.ts`.
  Expected: 0 problems.
- [ ] **Step 3:** Do the final whole-branch review (executing-plans or SDD), then the fix pass.
- [ ] **Step 4:** Copy the bible, the outline and ch01–03 to the scratchpad and send them to the parent, bible and outline first (spec §8). Ask for review.
  The branch holds no app changes (`src/story` is not imported by the app yet), so pushing to main needs only the parent's OK and triggers no visible change.
