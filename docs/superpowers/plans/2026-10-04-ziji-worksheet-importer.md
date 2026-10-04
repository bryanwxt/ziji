# Worksheet Importer Implementation Plan (Plan 12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The parent turns a worksheet page into practice in a few taps:
1. Add a photo and select its text with the iPad's Live Text, or paste text.
2. The app tidies it into words, 成语, pairings, sentences and passages, with flags and suggestions.
3. The parent checks a preview and adds everything on the iPad.

Imported sentences then become the first meaning cue for his words.

**Architecture:** A pure pipeline in `src/importer/` takes text and returns a draft:
1. `clean` drops page codes, copyright lines, numbering, instructions, exercise options and pinyin-only lines, and notes section headers.
2. `parse` rejoins characters split across cells using a dictionary, and classifies the result by section and punctuation.
3. `suggest` proposes fixes for unknown words.

`save` writes an approved draft through the existing list mechanism (`makeParentWords`), new `Word` fields (`sentences`, `pairs`, `tags`) and `saveParentPassage`. A new parent tab, `ImportPanel`, holds the photo, the paste box, the preview and Add. `meaningCue` prefers an imported sentence over 组词.

**Tech Stack:** Preact 10, TypeScript 5.9, pinyin-pro, idb, Vitest 4 (jsdom, fake-indexeddb).

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §19 part 5 (the importer), part 2 (meaning cue order) and Rules.

## Global Constraints

- Nothing from the Berries packs or the school textbook goes into the repo or the public site. Their word lists, sentences and passages enter only through the parent area and stay on the iPad (IndexedDB). They are included in backups.
- **No in-app OCR.** Input is paste, or a photo the parent reads with Live Text in place.
- Test fixtures are written for this repo to look like OCR output. They are never copied from the packs.
- The child's name from the worksheets is never used or stored.
- The parent area may scroll (§18). Child screens stay one screen (`npm run fit` stays at 0 problems).
- Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A word table read column by column**, with words split across lines (欺 / 负) and one misread character (告坼). It must rejoin known words, flag the misread one with a suggestion, and never silently add single characters that were half a word. Pinned in Task 1's fixture test.
2. **Instructions, exercise options and page furniture must not become words.** That covers 选一选，填号码, (1) 狼 (2) 很, P1-L07-AB-PG03, © lines and pinyin lines. Pinned in Task 1.
3. **A passage that OCR wrapped mid-sentence** must come back as one passage, not as fragments. Pinned in Task 1.
4. **Re-importing the same page** must not duplicate words, sentences or passages. Pinned in Task 2.
5. **An imported sentence that contains the word twice,** or barely more than the word itself, must not become a giveaway cue. Pinned in Task 4.

---

### Task 1: The parsing pipeline (pure)

**Files:**
- Create: `src/importer/clean.ts`, `src/importer/parse.ts`, `src/importer/suggest.ts`, `src/importer/importer.test.ts`
- Modify: `src/types.ts` (`Word.sentences?`, `Word.pairs?`, `Word.tags?`)

**Interfaces:**
- Produces:
  - `type Section = 'words' | 'pairs' | 'idioms' | 'sentences' | 'other'`;
  - `cleanLines(text: string): { line: string; section: Section }[]`;
  - `parseWorksheet(text: string, isWord: (w: string) => boolean): ImportDraft`, where `ImportDraft = { title: string | null; words: DraftItem[]; idioms: DraftItem[]; pairs: [string, string][]; sentences: string[]; passages: string[] }` and `DraftItem = { text: string; known: boolean; suggestion?: string }`;
  - `suggestFix(token: string, dict: Iterable<string>): string | undefined`.

- [ ] **Step 1: Write the failing tests** (`src/importer/importer.test.ts`, fixtures written for this repo)

```ts
import { describe, expect, it } from 'vitest';
import { cleanLines } from './clean';
import { parseWorksheet } from './parse';
import { suggestFix } from './suggest';

const DICT = new Set(['欺负', '安静', '告诉', '认识', '保持', '整齐', '一模一样', '齐心协力', '知道', '答案', '容易', '门票']);
const isWord = (w: string) => DICT.has(w) || [...w].length === 1;

// Shaped like Live Text on a worksheet: page furniture, headings, a word table read column by column, options, a passage.
const PAGE = [
  'P1-L07-AB-PG03', '二年级练习', '想一想', '第三十课', '一、复习（课本第11-18课）', '> 词语',
  '欺', '负', '安静', '告坼', '认识', '答', '案', '容易', '门票',
  '> 词语搭配', '保持 安静', '排得 整齐',
  '> 常用成语', '一模一样', '齐心协力',
  '三、字辨：选一选，填号码', '1 星期天，我____姐姐一起去公园。', '（1）狼 （2）很 （3）根 （4）跟',
  'jiē dào', '七、朗读训练',
  '小明和妹妹在公园里玩。他们看见一只小猫在树下睡觉，就',
  '轻轻地走过去，不想吵醒它。妹妹说：“小猫睡得真香！”小明',
  '点点头，拉着妹妹安静地走开了。',
  '©2026 Example Publisher Pte Ltd. All Rights Reserved 版权所有.',
].join('\n');

describe('cleanLines', () => {
  it('drops page furniture, instructions, exercise lines and pinyin, and tags each line with its section', () => {
    const lines = cleanLines(PAGE).map((l) => l.line);
    for (const junk of ['P1-L07-AB-PG03', '三、字辨：选一选，填号码', '（1）狼 （2）很 （3）根 （4）跟', 'jiē dào', '1 星期天，我____姐姐一起去公园。']) expect(lines).not.toContain(junk);
    expect(lines.some((l) => l.includes('©'))).toBe(false);
    expect(cleanLines(PAGE).find((l) => l.line === '保持 安静')?.section).toBe('pairs');
    expect(cleanLines(PAGE).find((l) => l.line === '一模一样')?.section).toBe('idioms');
  });
});

describe('parseWorksheet', () => {
  const d = parseWorksheet(PAGE, isWord);
  it('names the import from the lesson header', () => expect(d.title).toBe('第三十课'));
  it('rejoins characters split across table cells into known words', () => {
    expect(d.words.map((w) => w.text)).toEqual(expect.arrayContaining(['欺负', '答案', '安静', '认识', '容易', '门票']));
    expect(d.words.map((w) => w.text)).not.toContain('欺');
  });
  it('flags an unknown word with a likely fix', () => {
    expect(d.words.find((w) => w.text === '告坼')).toEqual({ text: '告坼', known: false, suggestion: '告诉' });
  });
  it('keeps pairings and 成语 apart from plain words', () => {
    expect(d.pairs).toEqual([['保持', '安静'], ['排得', '整齐']]);
    expect(d.idioms.map((w) => w.text)).toEqual(['一模一样', '齐心协力']);
  });
  it('rebuilds a passage that was wrapped mid-sentence', () => {
    expect(d.passages).toHaveLength(1);
    expect(d.passages[0]).toMatch(/^小明和妹妹在公园里玩。.*安静地走开了。$/);
    expect(d.passages[0]).not.toContain('\n');
  });
  it('turns a lone short sentence into a sentence, not a passage', () => {
    const one = parseWorksheet('> 重点句\n从下个星期一开始，我们要早点上学。', isWord);
    expect(one.sentences).toEqual(['从下个星期一开始，我们要早点上学。']);
    expect(one.passages).toEqual([]);
  });
});

describe('suggestFix', () => {
  it('prefers a dictionary word that differs by one character', () => {
    expect(suggestFix('告坼', DICT)).toBe('告诉');
    expect(suggestFix('完全不像', DICT)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/importer`
Expected: FAIL. The modules don't exist.

- [ ] **Step 3: Implement**

`src/types.ts`, in `Word`:

```ts
  sentences?: Example[]; // imported class sentences that use this word (on-device only)
  pairs?: string[]; // words it pairs with in class (保持 → 安静)
  tags?: string[]; // e.g. '成语'
```

`src/importer/clean.ts`:

```ts
export type Section = 'words' | 'pairs' | 'idioms' | 'sentences' | 'other';

const HAN = /\p{Script=Han}/u;
const PAGE_CODE = /^[A-Z]\d+-L\d+/i;
const COPYRIGHT = /©|all rights reserved|版权所有|pte\.? ?ltd/i;
const OPTIONS = /[（(]\s*\d+\s*[）)]/; // (1) 狼 (2) 很
const BLANK = /_{2,}|＿{2,}/; // exercise sentences with a blank
const INSTRUCTION = /选一选|填号码|写一写|记一记|读一读|学一学|请家长|请你|小朋友|登录|签名|完成练习|作答|看图|通关密语/;
const HEADER = /^(?:[一二三四五六七八九十]+、|>|➤|▶|\d+[.、])?\s*(.*)$/;

function sectionOf(heading: string): Section | null {
  if (/成语/.test(heading)) return 'idioms';
  if (/搭配/.test(heading)) return 'pairs';
  if (/重点句|佳句|句子/.test(heading)) return 'sentences';
  if (/词语|生字|复习|字/.test(heading)) return 'words';
  if (/朗读|阅读|短文/.test(heading)) return 'other';
  return null;
}

/** Live Text output → content lines tagged with the section they sit in. Headings set the section and are dropped. */
export function cleanLines(text: string): { line: string; section: Section }[] {
  const out: { line: string; section: Section }[] = [];
  let section: Section = 'words';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[　\t]+/g, ' ').trim();
    if (!line || !HAN.test(line)) continue; // pinyin-only and Latin lines
    if (PAGE_CODE.test(line) || COPYRIGHT.test(line) || OPTIONS.test(line) || BLANK.test(line) || INSTRUCTION.test(line)) continue;
    const heading = HEADER.exec(line)![1]!;
    const isHeading = /^(?:[一二三四五六七八九十]+、|>|➤|▶)/.test(line) || (!/[。！？，]/.test(line) && sectionOf(heading) !== null && heading.length <= 10);
    if (isHeading) {
      section = sectionOf(heading) ?? section;
      if (/^第.+课$/.test(heading)) out.push({ line: heading, section: 'other' });
      continue;
    }
    out.push({ line, section });
  }
  return out;
}
```

`src/importer/suggest.ts`:

```ts
/** A dictionary word of the same length that differs by exactly one character (告坼 → 告诉). */
export function suggestFix(token: string, dict: Iterable<string>): string | undefined {
  const t = Array.from(token);
  for (const w of dict) {
    const c = Array.from(w);
    if (c.length !== t.length) continue;
    if (c.filter((ch, i) => ch !== t[i]).length === 1) return w;
  }
  return undefined;
}
```

`src/importer/parse.ts`:

```ts
import { cleanLines } from './clean';
import { suggestFix } from './suggest';

export interface DraftItem { text: string; known: boolean; suggestion?: string }
export interface ImportDraft {
  title: string | null;
  words: DraftItem[];
  idioms: DraftItem[];
  pairs: [string, string][];
  sentences: string[];
  passages: string[];
}

const SENT_END = /[。！？!?”"」]$/;
const HAN_ONLY = /^\p{Script=Han}{1,4}$/u;

/** Greedy join: consecutive tokens that together make a known word (up to 4 characters) become that word. */
function joinTokens(tokens: string[], isWord: (w: string) => boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    let taken = 1;
    for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
      const joined = tokens.slice(i, i + n).join('');
      if (Array.from(joined).length <= 4 && tokens.slice(i, i + n).every((t) => HAN_ONLY.test(t)) && isWord(joined) && Array.from(joined).length > 1) {
        taken = n;
        break;
      }
    }
    out.push(tokens.slice(i, i + taken).join(''));
    i += taken;
  }
  return out;
}

export function parseWorksheet(text: string, isWord: (w: string) => boolean, dict: Iterable<string> = []): ImportDraft {
  const lines = cleanLines(text);
  const draft: ImportDraft = { title: null, words: [], idioms: [], pairs: [], sentences: [], passages: [] };
  const seen = new Set<string>();
  const item = (t: string): DraftItem => {
    const known = isWord(t);
    const suggestion = known ? undefined : suggestFix(t, dict);
    return suggestion ? { text: t, known, suggestion } : { text: t, known };
  };
  const wordTokens: string[] = [];
  let para = '';
  const flushPara = () => {
    if (!para) return;
    const sentences = para.match(/[^。！？!?]+[。！？!?]+[”"」]?/g) ?? [para];
    if (sentences.length >= 3) draft.passages.push(para);
    else draft.sentences.push(...sentences.map((s) => s.trim()));
    para = '';
  };
  for (const { line, section } of lines) {
    if (/^第.+课$/.test(line)) { draft.title ??= line; continue; }
    const isProse = /[，。！？；：“”]/.test(line) || Array.from(line).length > 12;
    if (isProse) { para += line; if (SENT_END.test(line)) flushPara(); continue; }
    flushPara();
    const tokens = line.split(/[\s、,，/／\-—＋+]+/).filter(Boolean);
    if (section === 'pairs' && tokens.length === 2 && tokens.every((t) => HAN_ONLY.test(t))) { draft.pairs.push([tokens[0]!, tokens[1]!]); continue; }
    if (section === 'idioms') { for (const t of tokens) if (HAN_ONLY.test(t) && !seen.has(t)) { seen.add(t); draft.idioms.push(item(t)); } continue; }
    wordTokens.push(...tokens.filter((t) => HAN_ONLY.test(t)));
  }
  flushPara();
  for (const t of joinTokens(wordTokens, isWord)) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (Array.from(t).length === 4 && !isWord(t)) draft.idioms.push(item(t)); // a four-character word: probably a 成语
    else draft.words.push(item(t));
  }
  return draft;
}
```

The fixture's `告坼` must get its suggestion from the dictionary, so the test passes `DICT` as the third argument. Update the test call to `parseWorksheet(PAGE, isWord, DICT)`; this is a test-side fix, not a ruling.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/importer`
Expected: PASS.

Tune the heuristics until every fixture case passes, without special-casing the fixture strings. Ledger each change to the plan's code as a ruling.

- [ ] **Step 5: Commit**

```bash
git add src/importer src/types.ts
git commit -m "feat: the worksheet importer's parser — tidy Live Text, rejoin split words, sort words, 成语, pairings, sentences and passages"
```

---

### Task 2: Saving an approved draft

**Files:**
- Create: `src/importer/save.ts`
- Test: `src/importer/save.test.ts`

**Interfaces:**
- Consumes: `makeParentWords` (`src/content/parseWordList.ts`), `putWords`, `allWords`, `saveParentPassage`, `listParentPassages` (`src/store/repo.ts`), `pinyin` from pinyin-pro.
- Produces: `applyImport(db, draft: ImportDraft, opts: { listName: string; writeable: boolean; now: number }): Promise<ImportSummary>`, where `ImportSummary = { added: number; promoted: number; duplicates: string[]; sentences: number; passages: number; pairs: number }`.

- [ ] **Step 1: Write the failing tests** (`src/importer/save.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { allWords, listParentPassages, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { applyImport } from './save';

const draft = {
  title: '第三十课',
  words: [{ text: '保持', known: true }, { text: '安静', known: true }],
  idioms: [{ text: '一模一样', known: true }],
  pairs: [['保持', '安静']] as [string, string][],
  sentences: ['图书馆里要保持安静。', '我们一起去公园。'],
  passages: ['小明和妹妹在公园里玩。他们看见一只小猫。妹妹说：“真可爱！”'],
};

describe('applyImport', () => {
  it('adds the words as a school list, tags 成语, attaches pairings and sentences, and saves the passage', async () => {
    const db = await freshDb();
    const s = await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 1000 });
    const words = await allWords(db);
    const by = (t: string) => words.find((w) => w.text === t)!;
    expect(s).toMatchObject({ added: 3, sentences: 1, passages: 1, pairs: 1 });
    expect(by('保持')).toMatchObject({ listName: '第三十课', pairs: ['安静'], sentences: [{ text: '图书馆里要保持安静。' }] });
    expect(by('安静').pairs).toEqual(['保持']);
    expect(by('一模一样').tags).toEqual(['成语']);
    expect((await listParentPassages(db)).map((p) => p.title)).toEqual(['第三十课 朗读']);
  });
  it('attaches sentences to existing built-in words too, and a second import of the same page adds nothing twice', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('安', { id: 'b:安' })]);
    await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 1000 });
    await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 2000 });
    const words = await allWords(db);
    expect(words.filter((w) => w.text === '保持')).toHaveLength(1);
    expect(words.find((w) => w.text === '保持')!.sentences).toHaveLength(1);
    expect(words.find((w) => w.text === '保持')!.pairs).toEqual(['安静']);
    expect(await listParentPassages(db)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/importer/save.test.ts`
Expected: FAIL. The module doesn't exist.

- [ ] **Step 3: Implement** (`src/importer/save.ts`)

```ts
import { pinyin } from 'pinyin-pro';
import { makeParentWords } from '../content/parseWordList';
import type { AppDb } from '../store/db';
import { allWords, listParentPassages, putWords, saveParentPassage } from '../store/repo';
import type { Word } from '../types';
import type { ImportDraft } from './parse';

export interface ImportSummary { added: number; promoted: number; duplicates: string[]; sentences: number; passages: number; pairs: number }

const py = (t: string) => pinyin(t, { type: 'array' }).join(' ');
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Saves an approved draft on the iPad: words as a school list, then pairings, sentences and passages. Re-importing adds nothing twice. */
export async function applyImport(db: AppDb, draft: ImportDraft, opts: { listName: string; writeable: boolean; now: number }): Promise<ImportSummary> {
  const parsed = [...draft.words, ...draft.idioms].map((w) => ({ text: w.text, pinyin: py(w.text) }));
  const { added, promoted, duplicates } = makeParentWords(parsed, { listName: opts.listName, writeable: opts.writeable, existing: await allWords(db), now: opts.now });
  const idioms = new Set(draft.idioms.map((w) => w.text));
  for (const w of added) if (idioms.has(w.text)) w.tags = uniq([...(w.tags ?? []), '成语']);
  await putWords(db, [...added, ...promoted]);

  const byText = new Map((await allWords(db)).map((w) => [w.text, w]));
  const changed = new Map<string, Word>();
  const edit = (w: Word) => changed.get(w.id) ?? w;
  let pairCount = 0;
  for (const [a, b] of draft.pairs) {
    const wa = byText.get(a);
    const wb = byText.get(b);
    if (wa) { const w = edit(wa); changed.set(w.id, { ...w, pairs: uniq([...(w.pairs ?? []), b]) }); }
    if (wb) { const w = edit(wb); changed.set(w.id, { ...w, pairs: uniq([...(w.pairs ?? []), a]) }); }
    if (wa || wb) pairCount++;
  }
  let sentenceCount = 0;
  for (const s of draft.sentences) {
    let used = false;
    for (const w of byText.values()) {
      if (Array.from(w.text).length < 2 || !s.includes(w.text)) continue; // single characters get 组词, not sentences
      const cur = edit(w);
      if ((cur.sentences ?? []).some((x) => x.text === s)) continue;
      changed.set(cur.id, { ...cur, sentences: [...(cur.sentences ?? []), { text: s, pinyin: py(s) }] });
      used = true;
    }
    if (used) sentenceCount++;
  }
  await putWords(db, [...changed.values()]);

  const existing = new Set((await listParentPassages(db)).map((p) => p.text));
  let passageCount = 0;
  for (const [i, text] of draft.passages.entries()) {
    if (existing.has(text)) continue;
    await saveParentPassage(db, { id: `pp:${opts.now}-${i}`, title: `${draft.title ?? opts.listName} 朗读${draft.passages.length > 1 ? ` ${i + 1}` : ''}`, text, createdAt: opts.now + i });
    passageCount++;
  }
  return { added: added.length, promoted: promoted.length, duplicates, sentences: sentenceCount, passages: passageCount, pairs: pairCount };
}
```

Check the counting: in the test, the words 保持 and 安静 plus the idiom 一模一样 are added, so `added` is 3. "我们一起去公园。" contains none of the list's multi-character words, so the count is 1 for "图书馆里要保持安静。". The sentence attaches to both 保持 and 安静, and is counted once.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/importer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/importer
git commit -m "feat: save an approved worksheet import — school list, 成语 tags, pairings, sentences and passages, never twice"
```

---

### Task 3: The "From a worksheet" parent screen

**Files:**
- Create: `src/parent/ImportPanel.tsx`, `src/parent/importPanel.test.tsx`
- Modify: `src/parent/ParentArea.tsx` (a new tab `import`, labelled "From a worksheet"), `src/styles.css` (parent section)

**Interfaces:**
- Consumes:
  - `parseWorksheet` (Task 1) with `isWord` = `HSK_WORDS.has(w) || builtin char || existing word`, and `dict` = `HSK_WORDS.keys()` plus existing word texts;
  - `applyImport` (Task 2);
  - `useApp()`.
- Produces: the parent tab. Child screens are unchanged.

- [ ] **Step 1: Write the failing tests** (`src/parent/importPanel.test.tsx`)

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { allWords, listParentPassages } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { ImportPanel } from './ImportPanel';

vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');

const TEXT = ['第三十课', '> 词语', '欺', '负', '告坼', '> 词语搭配', '保持 安静', '小明在公园里玩。他看见一只小猫。小猫在睡觉。'].join('\n');

describe('ImportPanel', () => {
  it('previews what it found, flags a misread word with a fix, and adds everything on approval', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    fireEvent.input(screen.getByLabelText('Worksheet text'), { target: { value: TEXT } });
    fireEvent.click(screen.getByText('Read it'));
    expect(screen.getByDisplayValue('第三十课')).toBeTruthy(); // the list name comes from the lesson header
    expect(screen.getByText('欺负')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use 告诉' }));
    expect(screen.getByText('告诉')).toBeTruthy();
    expect(screen.getByText('保持 + 安静')).toBeTruthy();
    expect(screen.getByText(/小明在公园里玩/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Add/ }));
    await waitFor(async () => expect((await allWords(app.db)).map((w) => w.text)).toEqual(expect.arrayContaining(['欺负', '告诉'])));
    expect((await listParentPassages(app.db))).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toMatch(/Added/);
  });
  it('leaves out an unticked item, and joins two pieces of a split word', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    fireEvent.input(screen.getByLabelText('Worksheet text'), { target: { value: '> 词语\n绘\n本\n安静' } });
    fireEvent.click(screen.getByText('Read it'));
    fireEvent.click(screen.getByRole('button', { name: 'Join 绘 with the next' }));
    expect(screen.getByText('绘本')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include 安静' }));
    fireEvent.click(screen.getByRole('button', { name: /^Add/ }));
    await waitFor(async () => expect((await allWords(app.db)).map((w) => w.text)).toContain('绘本'));
    expect((await allWords(app.db)).map((w) => w.text)).not.toContain('安静');
  });
  it('shows an added photo so its text can be selected with Live Text', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    const file = new File(['x'], 'page.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Add a photo'), { target: { files: [file] } });
    expect(document.querySelector<HTMLImageElement>('.import__photo img')?.src).toContain('blob:photo');
    expect(screen.getByText(/Live Text/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/parent/importPanel.test.tsx`
Expected: FAIL. There's no `ImportPanel`.

- [ ] **Step 3: Implement**

`src/parent/ImportPanel.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { BUILTIN, HSK_WORDS } from '../content';
import { parseWorksheet, type DraftItem, type ImportDraft } from '../importer/parse';
import { applyImport } from '../importer/save';
import { allWords } from '../store/repo';

type Kind = 'words' | 'idioms';

/** Parent area: turn a worksheet into practice. Text comes from Live Text (on a photo here, or anywhere) or typing. */
export function ImportPanel() {
  const { db, now } = useApp();
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set()); // unticked items, by kind:text
  const [listName, setListName] = useState('');
  const [writeable, setWriteable] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState<string[]>([]);
  useEffect(() => { void allWords(db).then((ws) => setExisting(ws.map((w) => w.text))); }, []);
  const chars = useMemo(() => new Set(BUILTIN.map((c) => c.char)), []);
  const known = useMemo(() => new Set(existing), [existing]);
  const isWord = (w: string) => HSK_WORDS.has(w) || chars.has(w) || known.has(w);

  const read = () => {
    const d = parseWorksheet(text, isWord, [...HSK_WORDS.keys(), ...existing]);
    setDraft(d);
    setOff(new Set());
    setListName(d.title ?? '');
    setMessage(null);
  };
  const setItems = (kind: Kind, items: DraftItem[]) => draft && setDraft({ ...draft, [kind]: items });
  const fix = (kind: Kind, i: number, to: string) => draft && setItems(kind, draft[kind].map((w, j) => (j === i ? { text: to, known: isWord(to) } : w)));
  const join = (kind: Kind, i: number) => {
    if (!draft) return;
    const items = [...draft[kind]];
    const merged = items[i]!.text + items[i + 1]!.text;
    items.splice(i, 2, { text: merged, known: isWord(merged) });
    setItems(kind, items);
  };
  const toggle = (key: string) => setOff((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const keep = <T,>(kind: string, xs: T[], label: (x: T) => string) => xs.filter((x) => !off.has(`${kind}:${label(x)}`));

  const add = async () => {
    if (!draft) return;
    const approved: ImportDraft = {
      ...draft,
      words: keep('words', draft.words, (w) => w.text),
      idioms: keep('idioms', draft.idioms, (w) => w.text),
      pairs: keep('pairs', draft.pairs, (p) => p.join(' ')),
      sentences: keep('sentences', draft.sentences, (s) => s),
      passages: keep('passages', draft.passages, (s) => s),
    };
    const s = await applyImport(db, approved, { listName: listName.trim() || draft.title || 'Worksheet', writeable, now: now().getTime() });
    const parts = [`Added ${s.added} new word${s.added === 1 ? '' : 's'}`];
    if (s.promoted) parts.push(`moved ${s.promoted} built-in to the front of the queue`);
    if (s.pairs) parts.push(`${s.pairs} pairing${s.pairs === 1 ? '' : 's'}`);
    if (s.sentences) parts.push(`${s.sentences} sentence${s.sentences === 1 ? '' : 's'} for meaning practice`);
    if (s.passages) parts.push(`${s.passages} reading text${s.passages === 1 ? '' : 's'}`);
    if (s.duplicates.length) parts.push(`skipped ${s.duplicates.length} already on a list`);
    setMessage(`${parts.join('; ')}.`);
    setDraft(null);
    setText('');
    setExisting((await allWords(db)).map((w) => w.text));
  };

  const itemRows = (kind: Kind, title: string) =>
    draft && draft[kind].length > 0 && (
      <>
        <h3>{title}</h3>
        <ul class="import__items">
          {draft[kind].map((w, i) => (
            <li key={`${w.text}-${i}`} class={w.known ? '' : 'is-unknown'}>
              <label><input type="checkbox" aria-label={`Include ${w.text}`} checked={!off.has(`${kind}:${w.text}`)} onChange={() => toggle(`${kind}:${w.text}`)} /> <span class="hanzi">{w.text}</span></label>
              {!w.known && <span class="import__flag">not in the dictionary{w.suggestion ? '' : ' — check it'}</span>}
              {w.suggestion && <button type="button" class="small-btn" onClick={() => fix(kind, i, w.suggestion!)}>{`Use ${w.suggestion}`}</button>}
              {i < draft[kind].length - 1 && <button type="button" class="small-btn" aria-label={`Join ${w.text} with the next`} onClick={() => join(kind, i)}>Join ↓</button>}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <section class="panel import">
      <h2>From a worksheet</h2>
      <p>Add a photo of the page, then press and hold on it to select its text with Live Text, copy, and paste below. You can also paste text from anywhere, or type it. Everything stays on this iPad.</p>
      <div class="field">
        <label for="imp-photo">Add a photo</label>
        <input id="imp-photo" type="file" accept="image/*" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
      </div>
      {photo && <div class="import__photo"><img src={photo} alt="Worksheet photo" /></div>}
      <div class="field">
        <label for="imp-text">Worksheet text</label>
        <textarea id="imp-text" rows={8} value={text} onInput={(e) => setText(e.currentTarget.value)} />
      </div>
      <button type="button" class="btn" disabled={!text.trim()} onClick={read}>Read it</button>
      {draft && (
        <div class="import__preview">
          <div class="field">
            <label for="imp-name">List name</label>
            <input id="imp-name" value={listName} onInput={(e) => setListName(e.currentTarget.value)} />
          </div>
          <div class="row" style={{ justifyContent: 'flex-start' }}>
            <label><input type="radio" name="imp-mode" checked={!writeable} onChange={() => setWriteable(false)} /> Recognise only</label>
            <label><input type="radio" name="imp-mode" checked={writeable} onChange={() => setWriteable(true)} /> Recognise + write</label>
          </div>
          {itemRows('words', 'Words')}
          {itemRows('idioms', '成语')}
          {draft.pairs.length > 0 && <><h3>Pairings</h3><ul class="import__items">{draft.pairs.map((p) => <li key={p.join(' ')}><label><input type="checkbox" aria-label={`Include ${p.join(' + ')}`} checked={!off.has(`pairs:${p.join(' ')}`)} onChange={() => toggle(`pairs:${p.join(' ')}`)} /> <span class="hanzi">{p.join(' + ')}</span></label></li>)}</ul></>}
          {draft.sentences.length > 0 && <><h3>Sentences (for meaning practice)</h3><ul class="import__items">{draft.sentences.map((s) => <li key={s}><label><input type="checkbox" aria-label={`Include ${s}`} checked={!off.has(`sentences:${s}`)} onChange={() => toggle(`sentences:${s}`)} /> <span class="hanzi">{s}</span></label></li>)}</ul></>}
          {draft.passages.length > 0 && <><h3>Reading texts (for 朗读)</h3><ul class="import__items">{draft.passages.map((s) => <li key={s}><label><input type="checkbox" aria-label={`Include ${s.slice(0, 8)}`} checked={!off.has(`passages:${s}`)} onChange={() => toggle(`passages:${s}`)} /> <span class="hanzi">{s}</span></label></li>)}</ul></>}
          <button type="button" class="btn btn--primary" onClick={() => void add()}>Add to {listName.trim() || draft.title || 'Worksheet'}</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
```

`ParentArea.tsx`:
- add `'import'` to `ParentTab`;
- add `['import', 'From a worksheet', ScanText]` to `TABS` after Words, importing `ScanText` from lucide-preact (or another existing lucide icon if that name isn't exported);
- render `{tab === 'import' && <ImportPanel />}`.

`styles.css` (parent section):

```css
.import__photo img { max-width: 100%; max-height: 60vh; border-radius: 12px; border: 1px solid var(--line); -webkit-user-select: text; user-select: text; }
.import__items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.import__items li { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.import__items li.is-unknown .hanzi { color: var(--orange-ink); }
.import__flag { color: var(--orange-ink); font-size: 14px; }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/parent`, then `npx vitest run`
Expected: PASS. `src/childEmoji.test.ts` is unaffected, since the parent area keeps its own UI.

- [ ] **Step 5: Commit**

```bash
git add src/parent src/styles.css
git commit -m "feat: parent area 'From a worksheet' — photo for Live Text, paste, preview with fixes, joins and ticks, add on the iPad"
```

---

### Task 4: Imported sentences become the first meaning cue

**Files:**
- Modify: `src/activities/flashcards/meaning.ts` (`meaningCue`), `src/activities/flashcards/FlashcardStep.tsx` (a sentence-style cue), `src/styles.css`, `scripts/fit-profile.ts` (one word gets a sentence, so the sweep sees it)
- Test: `src/activities/flashcards/meaning.test.ts`, `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `Word.sentences` (Task 1).
- Produces: `meaningCue` preferring `sentences` (the word once; the sentence at least 4 characters longer than the word), then 组词; `MeaningCue.kind: 'sentence' | 'word'`.

- [ ] **Step 1: Write the failing tests**

Add to `meaning.test.ts`:

```ts
describe('imported sentences come first', () => {
  it('a school word with a class sentence gets that sentence as its cue', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', examples: [], sentences: [{ text: '图书馆里要保持安静。', pinyin: 'tú shū guǎn lǐ yào bǎo chí ān jìng 。' }] });
    expect(meaningCue(w)).toMatchObject({ kind: 'sentence', before: '图书馆里要', after: '安静。' });
  });
  it('never a sentence that uses the word twice or is barely longer than it', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', sentences: [{ text: '保持，保持！', pinyin: 'x' }, { text: '保持。', pinyin: 'x' }] });
    expect(meaningCue(w)).toBeNull();
  });
});
```

Add to `FlashcardStep.test.tsx`:

```tsx
it('a sentence cue reads as a sentence (wrapping, smaller type) with the word blanked', () => {
  const w = { ...makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí' }), sentences: [{ text: '图书馆里要保持安静。', pinyin: 'x' }] };
  render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'p:1', isNew: false, retry: false, mode: 'meaning' }} voice onDone={vi.fn()} />);
  expect(document.querySelector('.meaning-cue--sentence')?.textContent).toContain('图书馆里要');
  expect(speak).toHaveBeenCalledWith('图书馆里要保持安静。');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/activities/flashcards`
Expected: FAIL. `kind` isn't set, sentences are ignored, and there's no sentence class.

- [ ] **Step 3: Implement**

In `meaning.ts`:
- `MeaningCue` gains `kind: 'sentence' | 'word'`.
- `meaningCue` first loops over `word.sentences ?? []`, accepting a sentence where the word appears exactly once and `[...s.text].length >= [...word.text].length + 4`. Glue and same-reading checks don't apply, since a sentence's context makes the fit clear. It returns `kind: 'sentence'`.
- It then falls through to the existing 组词 loop, now returning `kind: 'word'`.

In `FlashcardStep.tsx`, the cue element's class is `hanzi meaning-cue${quiz.cue.kind === 'sentence' ? ' meaning-cue--sentence' : ''}`. Hide the cue pinyin line for sentences: the sentence is read aloud, and full-sentence pinyin is long.

`styles.css`:

```css
.meaning-cue--sentence { white-space: normal; font-size: clamp(24px, 3.6dvh, 34px); line-height: 1.5; padding: 10px 16px; max-width: min(100%, 640px); text-align: left; }
```

`scripts/fit-profile.ts`: give the first placed word that is a two-character HSK word a class-style sentence written for this repo, so `npm run fit` sees a sentence cue. If no such word is placed, add a parent word `保持` with the sentence `图书馆里要保持安静。` and a recognise card.

- [ ] **Step 4: Run the tests and the sweep**

Run: `npx vitest run`, then `npm run fit > <workspace>/fit.txt 2>&1; tail -1 <workspace>/fit.txt`
Expected: PASS and `0 with problems`.

- [ ] **Step 5: Commit**

```bash
git add src scripts
git commit -m "feat: an imported class sentence is a word's first meaning cue"
```
