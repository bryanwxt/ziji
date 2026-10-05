# 字己 ZiJi — Lesson Redesign Phase B: pairing, 组句, English on the sheet, 钓鱼 for look-alikes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 练一练 gains new kinds of question:
- **组词 pairing:** join characters into 词语.
- **搭配 pairing:** join words that go together.
- **组句, the new rung 4:** tap word tiles into a sentence.
- **钓鱼 as a look-alike check:** only for characters he has mixed up, at most two a lesson.

After a wrong answer, the sheet also explains in English.

**Architecture:**
- **New asks.** The phase A round builder gains `'pair' | 'match'` at rung 2, `'build'` at rung 4 (the new top rung), and `'fish'` (not a rung).
- **Content.** Content builders are pure:
  - `src/practice/pairs.ts` builds the 组词 and 搭配 boards from his words and a written 搭配 bank;
  - `src/content/zuju.ts` cuts the written sentence bank into word tiles, with their accepted orders;
  - `src/activities/components/zibian.ts` builds a 钓鱼 item that features the character he confused.
- **New components.** `PairGame` and `BuildSentence` render on the stage.
- **English.** `MeaningNote` adds English to every feedback sheet after a wrong answer.
- **Confusions.** They are remembered on the word's ladder entry.

**Tech Stack:** Preact 10, TypeScript 5.9, idb (DB v4 `ladder` store, new optional field), Vitest 4, Playwright-core WebKit.

**Spec:** `docs/superpowers/specs/2026-10-05-ziji-lesson-flow-design.md`. Phase B is spec §9 item B, covering:
- §3.2: rungs 2 and 4;
- §3.4: 钓鱼;
- §3.6: the feedback sheet;
- §6: content.

## Global Constraints

**The ladder:**
- The ladder rungs are "2. 词语: complete the 词语 (火＿ → 车); 组词: pair characters into 词语 (tap 火 then 车); 搭配: pair words that go together (穿 + 衣服, 认真 + 学习)", and "4. 组句: tap word tiles to build a sentence that uses the word".
- "At the top rung, a word answered right everywhere cycles through rungs 3–5". With rung 5 coming in phase C, the top cycles 3 and 4 for now.

**钓鱼:** "only for a character he has confused with a look-alike. A wrong answer anywhere that picked a character sharing its radical or a component records that pair." "At most two a lesson." The pond, the fish and the radical explanations stay.

**The sheet:**
- "Wrong: the right answer with pinyin and a speaker, plus English meanings: the right answer's meaning, and the meaning of what he picked if it is a real word ("根 root ✓ · 跟 to follow")."
- "The question stays Chinese. English appears only on the 认字 card and on the sheet after a wrong answer."
- "组句 after a miss: the sheet shows the sentence built correctly, read aloud."

**组句:** sentences are "split into word tiles (4–6), with every accepted order listed". They are taken "from the existing written bank (`src/content/bank/`) where a sentence splits cleanly", plus class sentences on the iPad.

**搭配:** "about 300 pairs" is the spec's target. This plan writes about 100 common verb-object and adverb-verb pairs within HSK 1–3 (plan decision, ledgered at execution). The bank grows with use.

**Content rule:** "all written for this app; nothing from Berries or the school textbook enters the repo".

**Grading (spec §3.5):** pairing grades meaning (rung 2), 组句 grades use (rung 4), and 钓鱼 grades nothing (practice), logging a 字辨 answer and bringing the word forward on a miss, as 钓鱼 did before.

**Child screens:** Chinese only, no emoji. No English except the 认字 card and the sheet after a wrong answer.

**Shipping:** the parent's standing instruction (2026-10-05) is to deploy when the phase is done.

## Review Focus

1. **A pairing board with a second valid answer.** Example: a board with 买 and 电视 on opposite sides. A right pairing must never be marked wrong. General verbs are never distractors, and every cross pair is checked against the 搭配 bank and the HSK words. Pinned in Task 3: "no board has a cross pair that is also a word or a listed 搭配".
2. **A 组句 sentence with more than one natural order.** Example: 今天我 / 我今天. Accepted orders cover the time-word swap, and no tile repeats. Pinned in Task 2: "a leading time word may swap with the subject" and "a sentence with a repeated tile is never used".
3. **Getting stuck in a game.** A pairing he can't solve reveals the answer after three misses on a tile. A 组句 tile placed wrongly can be taken back. Pinned in Task 6 ("three misses on a tile show its match") and Task 5 ("a placed tile can be taken back").
4. **钓鱼 for a word with no buildable item:** no 2-character 组词, or fewer than three look-alikes. It is skipped, never a broken pond. Pinned in Task 7 ("a confused word with no 钓鱼 item gets none").
5. **English on the sheet:**
   - it shows only after a wrong answer;
   - it never shows a gloss for pinyin choices;
   - it never shows a made-up word: a picked character that doesn't form a word gets no gloss.

   Pinned in Task 1.

---
### Task 1: After a wrong answer, the sheet explains in English

**Files:**
- Create: `src/ui/stage/MeaningNote.tsx`, `src/ui/stage/MeaningNote.test.tsx`
- Modify: `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/choose/UseQuestion.tsx`, `src/activities/components/ComponentsStep.tsx`, `src/styles.css`, their tests

**Interfaces:**
- **Consumes:** `glossFor(text): string | undefined` (`src/content/glossary.ts`).
- **Produces:** `MeaningNote({ right: string; picked?: string | null })`. It renders `<p class="sheet__en" lang="en">`, or nothing when there is no gloss.

- [ ] **Step 1: Write the failing tests.** Create `src/ui/stage/MeaningNote.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { glossFor } from '../../content/glossary';
import { MeaningNote } from './MeaningNote';

describe('English on the sheet after a wrong answer (spec 2026-10-05 §3.6)', () => {
  it("the right answer's meaning, then what he picked", () => {
    const { container } = render(<MeaningNote right="根" picked="跟" />);
    const en = container.querySelector('.sheet__en[lang="en"]')!.textContent!;
    expect(en).toContain(`根 ${glossFor('根')}`);
    expect(en).toContain(`跟 ${glossFor('跟')}`);
    expect(en.indexOf('根')).toBeLessThan(en.indexOf('跟'));
  });
  it('no gloss for something that is not a word (a made-up 词语, a pinyin choice)', () => {
    const { container } = render(<MeaningNote right="根" picked="树跟" />);
    expect(container.textContent).not.toContain('树跟');
    const pinyin = render(<MeaningNote right="根" picked="gēn" />);
    expect(pinyin.container.textContent).not.toContain('gēn');
  });
  it('nothing at all when nothing has a gloss', () => {
    expect(render(<MeaningNote right="欺负欺负" />).container.innerHTML).toBe('');
  });
});
```

Append to `src/activities/flashcards/FlashcardStep.test.tsx`:

```tsx
describe('the sheet explains a miss in English (spec 2026-10-05 §3.6)', () => {
  it('after a wrong hear-and-find answer: both characters, in English', () => {
    const w = pool.find((x) => x.text === '他')!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== '他')!;
    fireEvent.click(wrong);
    const en = document.querySelector('.sheet [lang="en"]')!.textContent!;
    expect(en).toContain('他');
    expect(en).toContain(wrong.textContent!);
  });
  it('a right answer shows no English', () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('[lang="en"]')).toBeNull();
  });
  it('a wrong pinyin answer explains the character, never the pinyin', () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice={false} onDone={vi.fn()} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!;
    fireEvent.click(wrong);
    const en = document.querySelector('.sheet [lang="en"]')?.textContent ?? '';
    expect(en).toContain('河');
    expect(en).not.toContain(wrong.textContent!);
  });
});
```

Append to `src/activities/choose/ChooseStep.test.tsx`:

```tsx
describe('the sheet explains a miss in English (spec 2026-10-05 §3.6)', () => {
  it('a wrong word in a sentence: the right word and the picked word, in English', () => {
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '在' }));
    const en = document.querySelector('.sheet [lang="en"]')!.textContent!;
    expect(en).toContain('很');
    expect(en).toContain('在');
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/ui/stage src/activities/flashcards src/activities/choose`.
  - Expected: FAIL. `./MeaningNote` is missing, and the sheets show no English.

- [ ] **Step 3: Implement.** Create `src/ui/stage/MeaningNote.tsx`:

```tsx
import { glossFor } from '../../content/glossary';

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked when that is a
 * real word ("根 root · 跟 to follow"). The question itself stays Chinese; this shows only on the sheet after a miss.
 */
export function MeaningNote({ right, picked = null }: { right: string; picked?: string | null }) {
  const mine = glossFor(right);
  const theirs = picked && picked !== right ? glossFor(picked) : undefined;
  if (!mine && !theirs) return null;
  return (
    <p class="sheet__en" lang="en">
      {mine && <span class="sheet__en-right">{right} {mine}</span>}
      {theirs && <span>{picked} {theirs}</span>}
    </p>
  );
}
```

**`src/styles.css`:** after the `.example__en` rule, add:

```css
.sheet__en { margin: 4px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-family: var(--font, system-ui); font-size: 16px; line-height: 1.3; color: var(--ink-soft); }
.sheet__en-right { font-weight: 700; color: var(--ink); }
```

**`FlashcardStep.tsx`:**
- Import `MeaningNote`.
- In the wrong-answer `detail`, after the `SpeakButton`, add:

```tsx
              <MeaningNote right={quiz.cue ? quiz.cue.full : word.text} picked={quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
```

**`UseQuestion.tsx`:**
- Import `MeaningNote`.
- In `detail`, before the clue, add `{!correct && <MeaningNote right={item.word} picked={item.kind === 'fit' ? choice : null} />}`.

**`ComponentsStep.tsx`:**
- Import `MeaningNote`.
- In `detail`, after the `<span class="zibian__why">…</span>`, wrap both in a fragment and add `{!correct && <MeaningNote right={item.word} picked={picked} />}`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/ui src/activities src/childEmoji.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS. The existing "English stays on the new-word card" tests still pass: they answer right, or don't answer.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: after a wrong answer the sheet explains, in English, the right answer and what he picked"`

### Task 2: The 组句 bank — sentences cut into word tiles, with their accepted orders

**Files:**
- Create: `src/content/zuju.ts`, `src/content/zuju.test.ts`

**Interfaces:**
- **Consumes:** `HSK_WORDS` (`src/content/index.ts`); `SENTENCE_BANK`, `bankFor` and `fillGap` (`src/content/sentenceBank.ts`); `Word` with its optional class `sentences`.
- **Produces:**
  - `ZujuItem { full: string; tiles: string[]; orders: string[][] }`;
  - `tiles(sentence: string): string[]`;
  - `zujuFor(word: Word): ZujuItem[]`;
  - `MIN_TILES = 4`, `MAX_TILES = 6`.

- [ ] **Step 1: Write the failing tests.** Create `src/content/zuju.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { SENTENCE_BANK } from './sentenceBank';
import { MAX_TILES, MIN_TILES, tiles, zujuFor } from './zuju';

describe('组句 (spec 2026-10-05 §3.2 rung 4, §6)', () => {
  it('cuts a sentence into word tiles: the longest word first', () => {
    expect(tiles('我和哥哥都喜欢打球。')).toEqual(['我', '和', '哥哥', '都', '喜欢', '打球。']);
  });
  it('punctuation and 了/吗/吧/的 stay with the word before; a number keeps its measure word; a doubled character stays whole', () => {
    expect(tiles('我要去上学了。')).toEqual(['我', '要', '去', '上学了。']);
    expect(tiles('你能来我家玩吗？')).toEqual(['你', '能', '来', '我', '家', '玩吗？']);
    expect(tiles('我想喝一杯水。')).toEqual(['我', '想', '喝', '一杯', '水。']);
    expect(tiles('爷爷天天喝茶。')).toEqual(['爷爷', '天天', '喝', '茶。']);
  });
  it('a 的 or 得 that starts a word stays in it (得到)', () => {
    expect(tiles('我得到了一本书。')).toContain('得到了');
  });
  it('a word gets the bank sentences that cut into 4–6 different tiles and keep the word whole', () => {
    const item = SENTENCE_BANK.find((b) => zujuFor(makeWord(b.word)).length > 0)!;
    for (const z of zujuFor(makeWord(item.word))) {
      expect(z.tiles.length).toBeGreaterThanOrEqual(MIN_TILES);
      expect(z.tiles.length).toBeLessThanOrEqual(MAX_TILES);
      expect(z.tiles.join('')).toBe(z.full);
      expect(z.tiles.some((t) => t.includes(item.word))).toBe(true);
      expect(z.orders[0]).toEqual(z.tiles);
    }
  });
  it('a sentence with a repeated tile is never used (its order would be ambiguous)', () => {
    const w = makeWord('喜欢', { sentences: [{ text: '我喜欢猫，我喜欢狗。', pinyin: '' }] });
    expect(zujuFor(w).map((z) => z.full)).not.toContain('我喜欢猫，我喜欢狗。');
  });
  it('a leading time word may swap with the subject (今天我… / 我今天…)', () => {
    const w = makeWord('喝', { sentences: [{ text: '今天我喝牛奶。', pinyin: '' }] });
    const z = zujuFor(w).find((x) => x.full === '今天我喝牛奶。')!;
    expect(z.orders).toEqual([['今天', '我', '喝', '牛奶。'], ['我', '今天', '喝', '牛奶。']]);
  });
  it('his class sentences come first; the bank has enough sentences to matter', () => {
    const w = makeWord('很', { sentences: [{ text: '我们的老师很好。', pinyin: '' }] });
    expect(zujuFor(w)[0]!.full).toBe('我们的老师很好。');
    expect(SENTENCE_BANK.filter((b) => zujuFor(makeWord(b.word)).length > 0).length).toBeGreaterThan(150);
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/content/zuju.test.ts`.
  - Expected: FAIL, because `./zuju` cannot be resolved.

- [ ] **Step 3: Implement.** Create `src/content/zuju.ts`:

```ts
// 组句 (spec 2026-10-05 §3.2 rung 4): a sentence that uses the word, cut into word tiles for him to put in order. Built only
// from sentences written for this app (the bank) and his class sentences (on the iPad); never generated from nothing.
import type { Word } from '../types';
import { HSK_WORDS } from '.';
import { bankFor, fillGap, SENTENCE_BANK } from './sentenceBank';

export interface ZujuItem { full: string; tiles: string[]; orders: string[][] }

export const MIN_TILES = 4;
export const MAX_TILES = 6;
const PUNCT = new Set([...'，。！？、；：']);
const PARTICLES = new Set([...'了吗吧呢的得着过']);
const NUMERALS = new Set([...'一二三四五六七八九十两几这那每哪']);
const MEASURES = new Set([...'个本杯只条张件位次天点岁块双把辆台首节些']);
const TIME_WORDS = new Set(['今天', '明天', '昨天', '现在', '早上', '晚上', '上午', '下午', '中午', '每天', '后来', '刚才', '以前', '星期天', '周末']);
const SUBJECTS = new Set(['我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '大家', '爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹', '爷爷', '奶奶', '老师']);

let dict: Set<string> | null = null;
const known = () => (dict ??= new Set([...HSK_WORDS.keys(), ...SENTENCE_BANK.map((b) => b.word)]));

/**
 * Word tiles, the longest dictionary word first. Punctuation and a lone 了/吗/吧/的… stay with the word before it, a number
 * keeps its measure word (一杯) and a doubled character stays whole (天天), so every tile is something a child would say.
 */
export function tiles(sentence: string): string[] {
  const chars = Array.from(sentence);
  const out: string[] = [];
  for (let i = 0; i < chars.length; ) {
    let len = Math.min(4, chars.length - i);
    while (len > 1 && !known().has(chars.slice(i, i + len).join(''))) len--;
    const piece = chars.slice(i, i + len).join('');
    const last = out.length - 1;
    const prev = out[last];
    if (prev !== undefined && len === 1 && (PUNCT.has(piece) || PARTICLES.has(piece))) out[last] = prev + piece;
    else if (prev !== undefined && len === 1 && ((NUMERALS.has(prev) && MEASURES.has(piece)) || prev === piece)) out[last] = prev + piece;
    else out.push(piece);
    i += len;
  }
  return out;
}

/** The orders accepted besides the written one: a leading time word may follow the subject (今天我… / 我今天…). */
function ordersOf(t: string[]): string[][] {
  const out = [t];
  if (t.length >= 3 && TIME_WORDS.has(t[0]!) && SUBJECTS.has(t[1]!)) out.push([t[1]!, t[0]!, ...t.slice(2)]);
  return out;
}

/** The 组句 sentences for a word: his class sentences first, then the bank's, each 4–6 different tiles with the word whole in one. */
export function zujuFor(word: Word): ZujuItem[] {
  const bank = bankFor(word.text);
  const sentences = [...(word.sentences ?? []).map((s) => s.text), ...(bank ? bank.gaps.map((g) => fillGap(g, word.text)) : [])];
  const out: ZujuItem[] = [];
  for (const full of sentences) {
    const t = tiles(full);
    if (t.length < MIN_TILES || t.length > MAX_TILES || new Set(t).size !== t.length) continue;
    if (!t.some((x) => x.includes(word.text))) continue;
    out.push({ full, tiles: t, orders: ordersOf(t) });
  }
  return out;
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/content/zuju.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - **If a tile expectation differs** because the HSK list holds a longer word, follow the dictionary and adjust the expectation. Ledger it. The rule is the dictionary's longest word.
  - **If the bank yields 150 or fewer usable words,** lower the bar to what it yields, but not below 100. Ledger it.

- [ ] **Step 5: Commit.** `git add -A src/content && git commit -m "feat: the 组句 bank — written sentences cut into word tiles, with their accepted orders"`

### Task 3: The 搭配 bank and the pairing boards

**Files:**
- Create: `src/content/dapei.ts`, `src/practice/pairs.ts`, `src/practice/pairs.test.ts`

**Interfaces:**
- **Consumes:** `HSK_WORDS`, `BUILTIN` (`src/content`); `Word`; `shuffle` and `Rng`.
- **Produces:**
  - `DAPEI: readonly [string, string][]`, `GENERAL_VERBS: ReadonlySet<string>`, `isDapei(a: string, b: string): boolean`;
  - `PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string] }`;
  - `zuciBoard(word: Word, rng: Rng): PairBoard | null`;
  - `dapeiBoard(word: Word, rng: Rng): PairBoard | null`.

- [ ] **Step 1: Write the failing tests.** Create `src/practice/pairs.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, HSK_WORDS } from '../content';
import { DAPEI, GENERAL_VERBS, isDapei } from '../content/dapei';
import { mulberry32 } from '../lib/random';
import { dapeiBoard, zuciBoard, type PairBoard } from './pairs';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
const isWord = (s: string) => HSK_WORDS.has(s) || words.some((w) => w.examples?.some((e) => e.text === s));
const crossPairs = (b: PairBoard) => b.pairs.flatMap(([l], i) => b.pairs.filter((_, j) => j !== i).map(([, r]) => [l, r] as const));

describe('the 搭配 bank (spec 2026-10-05 §6)', () => {
  it('written in characters he meets by about HSK 3, no pair twice', () => {
    for (const [a, b] of DAPEI) for (const ch of a + b) expect(level.get(ch) ?? 9, `${a}${b}: ${ch}`).toBeLessThanOrEqual(4);
    expect(new Set(DAPEI.map(([a, b]) => `${a}|${b}`)).size).toBe(DAPEI.length);
    expect(DAPEI.length).toBeGreaterThanOrEqual(90);
    expect(isDapei('穿', '衣服')).toBe(true);
    expect(isDapei('穿', '牙')).toBe(false);
  });
});

describe('组词 pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it("three pairs that each make a 词语, one of them the word's own, the halves shuffled into two columns", () => {
    const b = zuciBoard(byText.get('火')!, mulberry32(1))!;
    expect(b.pairs).toHaveLength(3);
    expect(b.target.join('')).toContain('火');
    for (const [l, r] of b.pairs) expect(isWord(l + r), l + r).toBe(true);
    expect([...b.left].sort()).toEqual(b.pairs.map(([l]) => l).sort());
    expect([...b.right].sort()).toEqual(b.pairs.map(([, r]) => r).sort());
    expect(new Set([...b.left, ...b.right]).size).toBe(6);
  });
  it('no board has a cross pair that is also a word (review focus 1)', () => {
    for (const w of words.slice(0, 300)) {
      for (let seed = 1; seed <= 3; seed++) {
        const b = zuciBoard(w, mulberry32(seed));
        if (b) for (const [l, r] of crossPairs(b)) expect(isWord(l + r), `${w.text}: ${l}${r}`).toBe(false);
      }
    }
  });
  it('a word with no two-character 组词 has no board', () => {
    expect(zuciBoard({ ...byText.get('火')!, examples: [] }, mulberry32(1))).toBeNull();
  });
});

describe('搭配 pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it("one of the word's own 搭配 and two more", () => {
    const b = dapeiBoard(byText.get('穿')!, mulberry32(2))!;
    expect(b.target[0]).toBe('穿');
    expect(b.pairs).toHaveLength(3);
    for (const [l, r] of b.pairs) expect(isDapei(l, r)).toBe(true);
  });
  it('no board has a cross pair that is also a listed 搭配 or a word, and general verbs are never the extra pairs (review focus 1)', () => {
    for (const [a, b0] of DAPEI) {
      for (const text of [a, b0]) {
        const w = byText.get(text) ?? { ...words[0]!, id: `x:${text}`, text };
        for (let seed = 1; seed <= 3; seed++) {
          const b = dapeiBoard(w, mulberry32(seed));
          if (!b) continue;
          for (const [l, r] of crossPairs(b)) expect(isDapei(l, r) || HSK_WORDS.has(l + r), `${text}: ${l}${r}`).toBe(false);
          for (const [l] of b.pairs.filter((p) => p !== b.target)) expect(GENERAL_VERBS.has(l), l).toBe(false);
        }
      }
    }
  });
  it('a word with no 搭配 has no board', () => {
    expect(dapeiBoard(byText.get('很')!, mulberry32(1))).toBeNull();
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/practice/pairs.test.ts`.
  - Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Implement.** Create `src/content/dapei.ts`:

```ts
/**
 * 搭配: words that go together (spec 2026-10-05 §3.2 rung 2, §6). Written for this app: everyday verb + object and
 * adverb + verb pairs a P2 child meets, in characters up to about HSK 3. Never from class material.
 */
export const DAPEI: readonly [string, string][] = [
  ['穿', '衣服'], ['穿', '鞋'], ['戴', '帽子'], ['戴', '眼镜'], ['吃', '饭'], ['吃', '水果'], ['喝', '水'], ['喝', '牛奶'], ['喝', '茶'],
  ['看', '书'], ['看', '电视'], ['看', '电影'], ['读', '书'], ['写', '字'], ['写', '作业'], ['写', '信'], ['画', '画儿'], ['唱', '歌'],
  ['跳', '舞'], ['打', '电话'], ['打', '篮球'], ['踢', '足球'], ['骑', '自行车'], ['坐', '飞机'], ['坐', '公共汽车'], ['开', '车'],
  ['开', '门'], ['关', '门'], ['开', '灯'], ['关', '灯'], ['洗', '手'], ['洗', '脸'], ['洗', '衣服'], ['刷', '牙'], ['做', '饭'],
  ['做', '作业'], ['买', '东西'], ['上', '课'], ['下', '雨'], ['听', '音乐'], ['说', '话'], ['讲', '故事'], ['回', '家'], ['过', '马路'],
  ['拍', '照片'], ['种', '花'], ['送', '礼物'], ['照顾', '妹妹'], ['帮助', '别人'], ['学习', '汉语'], ['认真', '学习'], ['努力', '学习'],
  ['准备', '考试'], ['参加', '比赛'], ['完成', '作业'], ['回答', '问题'], ['解决', '问题'], ['打开', '书'], ['关上', '门'], ['用', '筷子'],
  ['等', '公共汽车'], ['爬', '山'], ['借', '书'], ['还', '书'], ['找', '朋友'], ['交', '朋友'], ['问', '问题'], ['练习', '写字'],
  ['复习', '功课'], ['朗读', '课文'], ['整理', '书包'], ['打扫', '房间'], ['擦', '桌子'], ['扫', '地'], ['包', '饺子'], ['过', '生日'],
  ['放', '假'], ['排', '队'], ['举', '手'], ['点', '头'], ['弹', '钢琴'], ['跑', '步'], ['游', '泳'], ['画', '图'], ['种', '树'],
  ['喂', '小猫'], ['开', '会'], ['生', '病'], ['发', '烧'], ['吃', '药'], ['看', '医生'], ['坐', '船'], ['起', '床'], ['睡', '觉'],
  ['讲', '道理'], ['交', '作业'], ['寄', '信'], ['接', '电话'], ['放', '学'], ['上', '网'], ['玩', '游戏'], ['认识', '新朋友'],
  ['慢慢', '走'], ['大声', '读'], ['安静', '地坐'], ['高兴', '地笑'],
];

/** Verbs that go with almost anything (看, 买, 做…): they are never a board's extra pairs, where they could match the wrong word. */
export const GENERAL_VERBS: ReadonlySet<string> = new Set(['看', '买', '做', '打开', '用', '找', '送', '拍', '等', '问', '交', '开', '关', '上', '下', '过', '放', '生', '接']);

const SET = new Set(DAPEI.map(([a, b]) => `${a}|${b}`));
export const isDapei = (a: string, b: string) => SET.has(`${a}|${b}`);
```

Create `src/practice/pairs.ts`:

```ts
// The pairing boards for the 词语 rung (spec 2026-10-05 §3.2): three pairs to join, one of them the word's own. No two halves
// from different pairs may make a word too, so a right answer can never be marked wrong.
import { HSK_WORDS } from '../content';
import { DAPEI, GENERAL_VERBS, isDapei } from '../content/dapei';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface PairBoard { left: string[]; right: string[]; pairs: [string, string][]; target: [string, string] }

const TWO_CHAR = [...HSK_WORDS.entries()].filter(([w]) => Array.from(w).length === 2);

/** Join three pairs into a board, or null when they can't be told apart (a shared half, or a cross pair that also fits). */
function board(target: [string, string], extras: [string, string][], fits: (l: string, r: string) => boolean, rng: Rng): PairBoard | null {
  const pairs: [string, string][] = [target];
  for (const p of extras) {
    if (pairs.length === 3) break;
    const halves = new Set(pairs.flat());
    if (halves.has(p[0]) || halves.has(p[1])) continue;
    if (pairs.some(([l, r]) => fits(l, p[1]) || fits(p[0], r))) continue;
    pairs.push(p);
  }
  if (pairs.length < 3) return null;
  return { left: shuffle(pairs.map(([l]) => l), rng), right: shuffle(pairs.map(([, r]) => r), rng), pairs, target };
}

/** 组词 pairing: the word's own two-character 组词 (at its reading) and two more HSK 词语 near its level. */
export function zuciBoard(word: Word, rng: Rng): PairBoard | null {
  const chars = Array.from(word.text);
  const own = chars.length === 2 ? word.text : word.examples?.find((e) => Array.from(e.text).length === 2 && e.text.includes(word.text))?.text;
  if (!own) return null;
  const [a, b] = Array.from(own) as [string, string];
  const near = TWO_CHAR.filter(([w, lvl]) => w !== own && lvl <= (word.level ?? 3) + 1).map(([w]) => Array.from(w) as [string, string]);
  const fits = (l: string, r: string) => HSK_WORDS.has(l + r) || (word.examples ?? []).some((e) => e.text === l + r);
  return board([a, b], shuffle(near, rng), fits, rng);
}

/** 搭配 pairing: one of the word's own 搭配 and two more, never with a verb that goes with almost anything. */
export function dapeiBoard(word: Word, rng: Rng): PairBoard | null {
  const mine = DAPEI.filter(([l, r]) => l === word.text || r === word.text);
  if (!mine.length) return null;
  const target = shuffle(mine, rng)[0]!;
  const extras = shuffle(DAPEI.filter(([l, r]) => !GENERAL_VERBS.has(l) && l !== word.text && r !== word.text), rng);
  const fits = (l: string, r: string) => isDapei(l, r) || HSK_WORDS.has(l + r);
  return board([target[0], target[1]], extras, fits, rng);
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/practice/pairs.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - **If a `DAPEI` entry fails the character-level test,** remove it or swap a simpler word in. Ledger the list of changes. The bank must stay in characters he meets by about HSK 3.
  - **Combined entries.** The last four entries are adverb + verb, and the verb carries 地 (`地坐`, `地笑`). If `level` rejects 地, keep them as `['安静', '坐']` and `['高兴', '笑']`.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: the 搭配 bank and the pairing boards (组词 and 搭配), never with a second right answer"`

### Task 4: Rung 4 and the new kinds of question on the ladder

**Files:**
- Modify:
  - `src/session/ladder.ts`, `src/session/ladder.test.ts`;
  - `src/session/round.ts`, `src/session/round.test.ts`;
  - `src/session/practice.ts`, `src/session/practice.test.ts`.

**Interfaces:**
- **Consumes:** `zujuFor` (Task 2); `zuciBoard` and `dapeiBoard` (Task 3).
- **Produces:**
  - `Rung = 1 | 2 | 3 | 4` and `TOP_RUNG = 4`;
  - `Ask = 'read' | 'listen' | 'word' | 'pair' | 'match' | 'fit' | 'usage' | 'build' | 'fish'`;
  - `ASKS = { 1: ['read','listen'], 2: ['word','pair','match'], 3: ['fit','usage'], 4: ['build'] }`;
  - rung 4 grades `'use'`;
  - `askable(word, pool, voice)` knows `pair`, `match` and `build`. `fish` stays false until Task 7.

- [ ] **Step 1: Write the failing tests.**

**`src/session/ladder.test.ts`:** the start-rung test becomes:

```ts
  it('a revision word starts on the rung after his best, from 字, never past the top (组句, phase B)', () => {
    expect(startRung(0)).toBe(1);
    expect(startRung(2)).toBe(3);
    expect(startRung(3)).toBe(4);
    expect(startRung(4)).toBe(4);
  });
```

**`src/session/round.test.ts`:**
- `climb(3, 2)` now expects `[3, 4]`.
- Add `expect(climb(4, 3)).toEqual([4, 3, 4]);`.
- In `'rung 1 asks read or listen…'`, the expected map becomes `{ 1: ['read', 'listen'], 2: ['word', 'pair', 'match'], 3: ['fit', 'usage'], 4: ['build'] }`.
- Append:

```ts
it('组句 (rung 4) grades use, like a sentence', () => {
  const r = buildRound([revision('r0', 3, 2)], all, mulberry32(7));
  expect(r.map((x) => [x.rung, x.grades])).toEqual([[3, 'recognise'], [4, 'use']]);
});
```

**`src/session/practice.test.ts`:** append:

```ts
describe('the new kinds of question (spec 2026-10-05 §3.2, phase B)', () => {
  it('组词 pairing needs a two-character 组词; 搭配 pairing a listed 搭配; 组句 a sentence that cuts into tiles', () => {
    const fire = byId.get(id('火'))!;
    expect(askable(fire, words, false)('pair')).toBe(true);
    expect(askable({ ...fire, examples: [] }, words, false)('pair')).toBe(false);
    expect(askable(byId.get(id('穿'))!, words, false)('match')).toBe(true);
    expect(askable(byId.get(id('很'))!, words, false)('match')).toBe(false);
    expect(askable(byId.get(id('很'))!, words, false)('build')).toBe(true);
    expect(askable(byId.get(id('很'))!, words, false)('fish')).toBe(false); // only for words he has confused (Task 7)
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session`.
  - Expected: FAIL. The top is still 3, `ASKS` has no new asks, and `askable` rejects them.

- [ ] **Step 3: Implement.**

**`src/session/ladder.ts`:**

```ts
/** The context ladder (spec 2026-10-05 §3.2): 字, 词语, 句子, 组句 (phase B); 成语 comes in phase C. */
export type Rung = 1 | 2 | 3 | 4;
export const TOP_RUNG: Rung = 4;
```

**`src/session/round.ts`:**
- The comment and the type:

```ts
/** read: pick the pinyin · listen: hear it, find it · word: the 组词 gap · pair: join 组词 halves · match: join 搭配 ·
 *  fit: the sentence gap · usage: 用对了吗 · build: 组句 tiles · fish: 钓鱼 for a look-alike he confused (not a rung). */
export type Ask = 'read' | 'listen' | 'word' | 'pair' | 'match' | 'fit' | 'usage' | 'build' | 'fish';
export const ASKS: Record<Rung, Ask[]> = { 1: ['read', 'listen'], 2: ['word', 'pair', 'match'], 3: ['fit', 'usage'], 4: ['build'] };
```

- In `buildRound`, `else if (rung === 3) grades = 'use';` becomes `else if (rung >= 3) grades = 'use';`.

**`src/session/practice.ts`:**
- Import `zujuFor` from `../content/zuju`, and `dapeiBoard` and `zuciBoard` from `../practice/pairs`.
- In `askable`'s switch, add:

```ts
      case 'pair': return zuciBoard(word, mulberry32(1)) !== null;
      case 'match': return dapeiBoard(word, mulberry32(1)) !== null;
      case 'build': return zujuFor(word).length > 0;
      case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - **Expected tsc error.** `PracticeQuestion` passes `item.ask as 'read' | 'listen' | 'word'` to the card. The new asks reach it only from Tasks 5–7, so a type error here is expected. Make the cast compile by narrowing: `item.ask === 'listen' ? 'listen' : item.ask === 'word' ? 'word' : 'read'`.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: 组句 is the ladder's fourth rung; 组词 and 搭配 pairing join the 词语 rung"`

### Task 5: 组句 — tap the tiles into the sentence

**Files:**
- Create: `src/activities/practice/BuildSentence.tsx`, `src/activities/practice/BuildSentence.test.tsx`
- Modify: `src/activities/practice/PracticeQuestion.tsx` (+ its test), `src/styles.css`

**Interfaces:**
- **Consumes:** `ZujuItem` and `zujuFor` (Task 2); `MeaningNote` (Task 1); `Stage`, `FeedbackSheet`, `Pet`, `SpeakButton`, `Label`; `speak`; `playSfx`.
- **Produces:**
  - `BuildSentence({ item: ZujuItem; word: Word; kid: KidState; resting: TruffleMood; onDone: (r: { correct: boolean; responseMs: number }) => void })`;
  - `PracticeQuestion` renders it for `ask: 'build'` and reports `asked: 'use'`.

- [ ] **Step 1: Write the failing tests.** Create `src/activities/practice/BuildSentence.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { BuildSentence } from './BuildSentence';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const item = { full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] };
const props = { item, word: makeWord('和'), kid: DEFAULT_KID, resting: 'sulk' as const };
const tap = (text: string) => fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.build__bank .choice')].find((b) => b.textContent === text)!);

describe('组句 (spec 2026-10-05 §3.2 rung 4)', () => {
  it('the tiles come shuffled, never already in order', () => {
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    expect([...document.querySelectorAll('.build__bank .choice')].map((b) => b.textContent).join('')).not.toBe(item.full);
  });
  it('tapping the tiles in order builds the sentence: right, read aloud, then 继续', () => {
    const onDone = vi.fn();
    render(<BuildSentence {...props} onDone={onDone} />);
    for (const t of item.tiles) tap(t);
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith(item.full);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a placed tile can be taken back (review focus 3)', () => {
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    tap('我');
    fireEvent.click(document.querySelector<HTMLButtonElement>('.build__answer .build__placed')!);
    expect(document.querySelectorAll('.build__answer .build__placed')).toHaveLength(0);
    expect([...document.querySelectorAll('.build__bank .choice')].map((b) => b.textContent)).toContain('我');
  });
  it('a wrong order: the sheet shows the sentence built right, read aloud, with the word in English', () => {
    const onDone = vi.fn();
    render(<BuildSentence {...props} onDone={onDone} />);
    for (const t of ['和', '我', '哥哥', '都', '喜欢', '打球。']) tap(t);
    expect(document.querySelector('.sheet--oops')!.textContent).toContain(item.full);
    expect(document.querySelector('.sheet [lang="en"]')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('an accepted second order counts as right', () => {
    const two = { full: '今天我喝牛奶。', tiles: ['今天', '我', '喝', '牛奶。'], orders: [['今天', '我', '喝', '牛奶。'], ['我', '今天', '喝', '牛奶。']] };
    render(<BuildSentence {...props} item={two} word={makeWord('喝')} onDone={vi.fn()} />);
    for (const t of ['我', '今天', '喝', '牛奶。']) tap(t);
    expect(document.querySelector('.sheet--good')).toBeTruthy();
  });
});
```

Append to `src/activities/practice/PracticeQuestion.test.tsx`:

```tsx
it('组句: the tiles on the stage; the answer comes back as a use answer', () => {
  const hen = pool.find((w) => w.text === '很')!;
  const onDone = vi.fn();
  render(<PracticeQuestion {...base} word={hen} item={{ wordId: hen.id, rung: 4, ask: 'build', grades: 'use', retry: false }} onDone={onDone} />);
  expect(document.querySelectorAll('.build__bank .choice').length).toBeGreaterThanOrEqual(4);
  while (document.querySelector('.build__bank .choice')) fireEvent.click(document.querySelector<HTMLButtonElement>('.build__bank .choice')!);
  fireEvent.click(screen.getByText('继续'));
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'use', inContext: true }));
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/activities/practice`.
  - Expected: FAIL. `./BuildSentence` is missing, and `PracticeQuestion` doesn't know `'build'`.

- [ ] **Step 3: Implement.** Create `src/activities/practice/BuildSentence.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { ZujuItem } from '../../content/zuju';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import type { KidState, Word } from '../../types';
import { Label } from '../../ui/Label';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  item: ZujuItem;
  word: Word;
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** 组句 (spec 2026-10-05 §3.2 rung 4): tap the word tiles into the sentence; tap a placed tile to take it back. */
export function BuildSentence({ item, word, kid, resting, onDone }: Props) {
  const setup = useMemo(() => {
    const rng = mulberry32((Date.now() ^ item.full.codePointAt(0)!) >>> 0);
    let order = shuffle(item.tiles.map((_, i) => i), rng);
    for (let n = 0; n < 5 && order.every((v, i) => v === i); n++) order = shuffle(order, rng); // never handed over in order
    return { order, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
  }, [item]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());

  useEffect(() => {
    if (placed.length < item.tiles.length || result) return;
    const built = placed.map((i) => item.tiles[i]!).join('');
    const correct = item.orders.some((o) => o.join('') === built);
    setResult({ correct, responseMs: Math.round(performance.now() - shownAt.current) });
    playSfx(correct ? 'correct' : 'wrong');
    speak(item.full); // the sentence as it goes, either way (spec §3.6)
  }, [placed]);

  const done = result !== null;
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (result.correct ? 'pleased' : 'side') : resting} bubble={done ? null : '排一排！'} size={180} calm={!done} react={done ? { kind: result.correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? setup.cheer : setup.comfort}
          detail={result.correct ? undefined : (
            <>
              <span class="hanzi">{item.full}</span>
              <SpeakButton text={item.full} />
              <MeaningNote right={word.text} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone(result)}
        />
      )}
    >
      <div class="build" data-q>
        <div class="build__answer hanzi" aria-label="句子">
          {placed.map((i) => (
            <button key={i} type="button" class="build__placed" disabled={done} onClick={() => setPlaced(placed.filter((p) => p !== i))}>
              <Label zh={item.tiles[i]!} />
            </button>
          ))}
        </div>
        <div class="build__bank">
          {setup.order.filter((i) => !placed.includes(i)).map((i) => (
            <button key={i} type="button" class="choice press build__tile" disabled={done} onClick={() => setPlaced([...placed, i])}>
              {item.tiles[i]}
            </button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
```

- **The `<Label>` on placed tiles.** It shows pinyin over a tile once placed. Bank tiles are plain text, so a test's `textContent` match stays exact.
- **The 排一排！ bubble.** It is Chinese. The existing lines from `../../fun/pet` keep the cheer and comfort voice.

**`src/styles.css`:** add:

```css
/* 组句 (spec 2026-10-05 §3.2 rung 4) */
.build { display: flex; flex-direction: column; gap: 16px; width: 100%; align-items: center; }
.build__answer { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; min-height: 64px; width: 100%; padding: 8px; border-bottom: 3px dashed var(--line, #d8cfbf); }
.build__placed { font-size: var(--sentence, 28px); padding: 4px 10px; border-radius: 12px; border: 2px solid var(--ink); background: var(--surface); }
.build__bank { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.build__tile { font-size: var(--sentence, 28px); min-width: 64px; }
```

**`src/activities/practice/PracticeQuestion.tsx`:**
- Import `BuildSentence`, and `zujuFor` from `../../content/zuju`.
- Before the `sentence` branch, add:

```tsx
  const zuju = useMemo(() => (item.ask === 'build' ? zujuFor(word)[0] ?? null : null), [item, word.id]);
```

  `useMemo` is already imported, and this sits with the other hooks before any return.
- The skip effect becomes `if ((sentence && !use) || (item.ask === 'build' && !zuju)) onDone(null);`.
- Before `if (!sentence)`, render:

```tsx
  if (item.ask === 'build') {
    if (!zuju) return null;
    return (
      <BuildSentence
        item={zuju}
        word={word}
        kid={kid}
        resting={resting}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use' })}
      />
    );
  }
```

  The `zujuFor(word)[0]` choice is deliberate: his class sentence comes first when he has one.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/activities src/childEmoji.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: 组句 — he taps the word tiles into the sentence, and can take a tile back"`

### Task 6: Pairing — join the halves

**Files:**
- Create: `src/activities/practice/PairGame.tsx`, `src/activities/practice/PairGame.test.tsx`
- Modify: `src/activities/practice/PracticeQuestion.tsx` (+ its test), `src/styles.css`

**Interfaces:**
- **Consumes:** `PairBoard`, `zuciBoard`, `dapeiBoard` (Task 3); `MeaningNote` (Task 1).
- **Produces:**
  - `PairGame({ board: PairBoard; kind: 'pair' | 'match'; kid; resting; onDone: (r: { correct: boolean; responseMs: number }) => void })`;
  - `PracticeQuestion` renders it for `ask: 'pair' | 'match'` and reports `asked: 'meaning'`, which grades the meaning card at rung 2.

- [ ] **Step 1: Write the failing tests.** Create `src/activities/practice/PairGame.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { PairBoard } from '../../practice/pairs';
import { DEFAULT_KID } from '../../types';
import { PairGame } from './PairGame';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const board: PairBoard = { left: ['穿', '刷', '踢'], right: ['足球', '衣服', '牙'], pairs: [['穿', '衣服'], ['刷', '牙'], ['踢', '足球']], target: ['穿', '衣服'] };
const props = { board, kind: 'match' as const, kid: DEFAULT_KID, resting: 'sulk' as const };
const tile = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pair__tile')].find((b) => b.textContent === t)!;
const join = (l: string, r: string) => { fireEvent.click(tile(l)); fireEvent.click(tile(r)); };

describe('pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it('a right pair locks together; all three: right, then 继续', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('穿', '衣服');
    expect(tile('穿').disabled).toBe(true);
    expect(tile('衣服').classList.contains('is-matched')).toBe(true);
    join('刷', '牙');
    join('踢', '足球');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('after picking a left tile, only the right column can be tapped (so a pick is never lost)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
    fireEvent.click(tile('穿'));
    expect(tile('刷').disabled).toBe(true);
    expect(tile('牙').disabled).toBe(false);
  });
  it('a wrong pair is a miss and lets go; any miss makes the board wrong, with the pairs and English on the sheet', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('穿', '牙');
    expect(tile('穿').disabled).toBe(false);
    join('穿', '衣服');
    join('刷', '牙');
    join('踢', '足球');
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('three misses on a tile show its match (review focus 3)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
    join('穿', '牙');
    join('穿', '足球');
    join('穿', '牙');
    expect(tile('穿').classList.contains('is-shown')).toBe(true);
    expect(tile('衣服').classList.contains('is-shown')).toBe(true);
  });
});
```

Append to `src/activities/practice/PracticeQuestion.test.tsx`:

```tsx
it('搭配 pairing on the stage; the answer comes back as a meaning answer', () => {
  const chuan = pool.find((w) => w.text === '穿')!;
  const onDone = vi.fn();
  render(<PracticeQuestion {...base} word={chuan} item={{ wordId: chuan.id, rung: 2, ask: 'match', grades: 'meaning', retry: false }} onDone={onDone} />);
  expect(document.querySelectorAll('.pair__tile')).toHaveLength(6);
  for (let i = 0; i < 30 && document.querySelector('.pair__tile:not([disabled])'); i++) fireEvent.click(document.querySelector<HTMLButtonElement>('.pair__tile:not([disabled])')!);
  fireEvent.click(screen.getByText('继续'));
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'meaning' }));
});
```

(The loop in that last test is the same "tap the first open tile" walk the WebKit sweep does. It must finish: three misses on a tile show its match.)

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/activities/practice`.
  - Expected: FAIL. `./PairGame` is missing, and `PracticeQuestion` doesn't know `'match'`.

- [ ] **Step 3: Implement.** Create `src/activities/practice/PairGame.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { PairBoard } from '../../practice/pairs';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  board: PairBoard;
  kind: 'pair' | 'match'; // 组词 or 搭配
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

const SHOW_AFTER = 3; // misses on one tile before its match is shown (review focus 3)

/** Pairing (spec 2026-10-05 §3.2 rung 2): tap a left half, then its right half. A wrong pair lets go; three misses show the match. */
export function PairGame({ board, kind, kid, resting, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ board.target[0].codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [board]);
  const [picked, setPicked] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set()); // halves already joined, right or shown
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  const partner = (l: string) => board.pairs.find(([a]) => a === l)![1];
  const misses = Object.values(missed).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (joined.size < board.pairs.length * 2 || result) return;
    const correct = misses === 0 && shown.size === 0;
    setResult({ correct, responseMs: Math.round(performance.now() - shownAt.current) });
    playSfx(correct ? 'correct' : 'wrong');
  }, [joined]);

  const tapRight = (r: string) => {
    if (!picked) return;
    if (partner(picked) === r) {
      setJoined(new Set([...joined, picked, r]));
      speak(kind === 'pair' ? picked + r : `${picked}${r}`);
    } else {
      const n = (missed[picked] ?? 0) + 1;
      setMissed({ ...missed, [picked]: n });
      if (n >= SHOW_AFTER) {
        const right = partner(picked);
        setShown(new Set([...shown, picked, right]));
        setJoined(new Set([...joined, picked, right]));
      }
    }
    setPicked(null);
  };

  const done = result !== null;
  const cls = (t: string) => `choice press pair__tile${joined.has(t) ? (shown.has(t) ? ' is-shown' : ' is-matched') : ''}${picked === t ? ' is-picked' : ''}`;
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (result.correct ? 'pleased' : 'side') : resting} bubble={done ? null : kind === 'pair' ? '连一连，组成词！' : '连一连，哪两个一起用？'} size={180} calm={!done} react={done ? { kind: result.correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? lines.cheer : lines.comfort}
          detail={result.correct ? undefined : (
            <>
              <span class="hanzi">{board.pairs.map(([l, r]) => l + r).join('　')}</span>
              <MeaningNote right={board.target.join('')} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone(result)}
        />
      )}
    >
      <div class="pairs" data-q>
        <div class="pairs__col">
          {board.left.map((l) => (
            <button key={l} type="button" class={cls(l)} disabled={done || joined.has(l) || (picked !== null)} onClick={() => setPicked(l)}>{l}</button>
          ))}
        </div>
        <div class="pairs__col">
          {board.right.map((r) => (
            <button key={r} type="button" class={cls(r)} disabled={done || joined.has(r) || picked === null} onClick={() => tapRight(r)}>{r}</button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
```

- **Picking.** Picking a left tile disables the left column until a right tile is tapped. That way a tap on the first open tile always moves the game on, for the sweep and for him.
- **The 'pair' bubble** reads 连一连，组成词！. For 搭配 it is 连一连，哪两个一起用？.

**`src/styles.css`:** add:

```css
/* pairing (spec 2026-10-05 §3.2 rung 2) */
.pairs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; width: 100%; max-width: 520px; }
.pairs__col { display: flex; flex-direction: column; gap: 12px; }
.pair__tile { font-size: var(--tile-hanzi, 40px); }
.pair__tile.is-picked { outline: 4px solid var(--blue, #4aa3ff); }
.pair__tile.is-matched { background: var(--green-soft, #c9f0d0); }
.pair__tile.is-shown { background: var(--orange-soft, #ffe2c2); }
```

**`PracticeQuestion.tsx`:**
- Import `PairGame`, and `dapeiBoard` and `zuciBoard` from `../../practice/pairs`.
- Add a memo next to `zuju`:

```tsx
  const board = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    return item.ask === 'pair' ? zuciBoard(word, rng) : item.ask === 'match' ? dapeiBoard(word, rng) : null;
  }, [item, word.id]);
```

- The skip effect also skips `(item.ask === 'pair' || item.ask === 'match') && !board`.
- Render, before the `build` branch:

```tsx
  if (item.ask === 'pair' || item.ask === 'match') {
    if (!board) return null;
    return (
      <PairGame
        board={board}
        kind={item.ask}
        kid={kid}
        resting={resting}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
  }
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/activities src/childEmoji.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: pairing — he joins 组词 halves or 搭配; three misses on a tile show its match"`

### Task 7: 钓鱼 for the look-alikes he has confused

**Files:**
- Modify:
  - `src/types.ts` (`LadderEntry.confused`);
  - `src/store/repo.ts` (`noteConfusion`, `clearConfusion`, `getConfusions`, and `noteRung` keeping confusions);
  - `src/activities/components/zibian.ts` (`fishItem`);
  - `src/session/practice.ts` (`withFish`, and `planPractice` taking confusions);
  - `src/activities/flashcards/FlashcardStep.tsx` (`FlashResult.picked`);
  - `src/activities/practice/PracticeQuestion.tsx` (`'fish'`);
  - `src/app/SessionScreen.tsx`;
  - their tests.

**Interfaces:**
- **Consumes:** `ZibianItem`, `lookAlikeChars`, `fillChoices` (`zibian.ts`); `ComponentsStep`; `PracticeItem` with `ask: 'fish'` (Task 4).
- **Produces:**
  - `LadderEntry.confused?: string[]`;
  - `noteConfusion(db, wordId, ch: string, now: Date)`, `clearConfusion(db, wordId)`, `getConfusions(db): Promise<Map<string, string[]>>`;
  - `fishItem(word: Word, confused: string[], known: ReadonlySet<string>, rng: Rng): ZibianItem | null`;
  - `withFish(items: PracticeItem[], fishIds: string[]): PracticeItem[]` and `MAX_FISH = 2`;
  - `planPractice(rec, rungs, wordsById, pool, voice, rng, confusions?: ReadonlyMap<string, string[]>)`;
  - `FlashResult.picked?: string`, and `PracticeResult.picked?: string`;
  - `PracticeResult.asked` gains `'zibian'`;
  - a `PracticeQuestion` prop `confused?: string[]`.

- [ ] **Step 1: Write the failing tests.**

**`src/session/ladder.test.ts`:** append (import `noteConfusion`, `clearConfusion`, `getConfusions`):

```ts
describe('what he confused (spec 2026-10-05 §3.4)', () => {
  it('remembers each look-alike he picked for a word, once, keeps them through rung changes, and forgets them when cleared', async () => {
    const db = await openAppDb(`ladder-${Math.random()}`);
    await noteConfusion(db, 'b:根', '跟', new Date(2026, 9, 6));
    await noteConfusion(db, 'b:根', '跟', new Date(2026, 9, 6));
    await noteConfusion(db, 'b:根', '很', new Date(2026, 9, 6));
    await noteRung(db, 'b:根', 2, true, new Date(2026, 9, 6));
    expect((await getConfusions(db)).get('b:根')).toEqual(['跟', '很']);
    expect((await getRungs(db)).get('b:根')).toBe(2);
    await clearConfusion(db, 'b:根');
    expect((await getConfusions(db)).has('b:根')).toBe(false);
  });
});
```

**`src/activities/components/zibian.test.ts`** (create it, or append if it exists):

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { mulberry32 } from '../../lib/random';
import { fishItem, lookAlikeChars } from './zibian';

const words = builtinWords(0);
describe('钓鱼 for what he confused (spec 2026-10-05 §3.4)', () => {
  it('fishes the word with the character he picked among the fish', () => {
    const w = words.find((x) => x.text === '根')!;
    const item = fishItem(w, ['跟'], new Set(), mulberry32(1))!;
    expect(item.answer).toBe('根');
    expect(item.options).toContain('跟');
    expect(item.options).toHaveLength(4);
    expect(item.word).toContain('根');
  });
  it('no item for a word with no two-character 组词, or too few look-alikes (review focus 4)', () => {
    const w = words.find((x) => x.text === '根')!;
    expect(fishItem({ ...w, examples: [] }, ['跟'], new Set(), mulberry32(1))).toBeNull();
    const lonely = words.find((x) => Array.from(x.text).length === 1 && lookAlikeChars(x.text).length === 0 && x.examples?.length)!;
    expect(fishItem(lonely, [], new Set(), mulberry32(1))).toBeNull();
  });
});
```

**`src/session/practice.test.ts`:** append (import `withFish`):

```ts
describe('钓鱼 in the round (spec 2026-10-05 §3.4)', () => {
  const p = (wordId: string): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: null, retry: false });
  it('at most two 钓鱼 items, spread out, never next to the same word', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(p);
    const out = withFish(items, ['b', 'e', 'h']);
    const fish = out.map((x, i) => [x, i] as const).filter(([x]) => x.ask === 'fish');
    expect(fish).toHaveLength(2);
    for (const [x, i] of fish) {
      expect(out[i - 1]?.wordId).not.toBe(x.wordId);
      expect(out[i + 1]?.wordId).not.toBe(x.wordId);
      expect(x).toMatchObject({ grades: null, retry: false });
    }
    expect(fish[1]![1] - fish[0]![1]).toBeGreaterThan(2);
  });
  it('a confused word that has no 钓鱼 item gets none (review focus 4)', () => {
    const rec = createSessionRecord(plan({ reviewWordIds: [id('山')] }), '2026-10-06', 0);
    const items = planPractice(rec, new Map(), byId, words, false, mulberry32(1), new Map([[id('山'), ['出']]]));
    const shan = byId.get(id('山'))!;
    if (!fishItemFor(shan)) expect(items.some((x) => x.ask === 'fish')).toBe(false);
  });
});
```

Define, at the top of `practice.test.ts`: `const fishItemFor = (w: Word) => fishItem(w, [], new Set(), mulberry32(1));`. Import `fishItem` from `../activities/components/zibian`, and `type Word`, `type PracticeItem`.

**`src/activities/practice/PracticeQuestion.test.tsx`:** append:

```tsx
it('钓鱼: the pond with the look-alike he picked among the fish; the answer comes back as a 字辨 answer', () => {
  const gen = pool.find((w) => w.text === '根')!;
  const onDone = vi.fn();
  render(<PracticeQuestion {...base} word={gen} confused={['跟']} item={{ wordId: gen.id, rung: 2, ask: 'fish', grades: null, retry: false }} onDone={onDone} />);
  expect([...document.querySelectorAll('.fishtile')].map((b) => b.textContent)).toContain('跟');
  fireEvent.click(screen.getByRole('button', { name: '根' }));
  fireEvent.click(screen.getByText('继续'));
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'zibian', correct: true }));
});
```

**`src/app/SessionScreen.test.tsx`:** append (import `noteConfusion` and `getConfusions`):

```tsx
describe('钓鱼 for what he confused, in 练一练 (spec 2026-10-05 §3.4)', () => {
  it('a word he confused gets a 钓鱼 item; catching the right fish forgets the confusion', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    const gen = byText.get('根')!;
    await putCards(app.db, [makeCard(gen.id, 'recognise', new Date(2026, 9, 1), true)]);
    await noteConfusion(app.db, gen.id, '跟', new Date(2026, 9, 1));
    renderWithApp(<SessionScreen free={false} />, app);
    let fished = false;
    for (let i = 0; i < 20 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? document.querySelector('.choice:not([disabled]), .fishtile:not([disabled])')).toBeTruthy());
      if (screen.queryByText('太棒了！')) break;
      const fish = document.querySelector<HTMLButtonElement>('.fishtile:not([disabled])');
      if (fish) {
        fished = true;
        await tapAndWait(screen.getByRole('button', { name: '根' }));
        await tapAndWait(screen.getByText('继续'));
        continue;
      }
      fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
      await tapAndWait(screen.getByText('继续'));
    }
    expect(fished).toBe(true);
    await waitFor(async () => expect((await getConfusions(app.db)).has(gen.id)).toBe(false));
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session src/activities src/app/SessionScreen.test.tsx`.
  - Expected: FAIL. The new functions are missing, and `PracticeQuestion` doesn't know `'fish'`.

- [ ] **Step 3: Implement.**

**`src/types.ts`:** in `LadderEntry`, add `confused?: string[]; // look-alike characters he picked for it (spec 2026-10-05 §3.4)`.

**`src/store/repo.ts`:** `noteRung` keeps what's there:

```ts
export async function noteRung(db: AppDb, wordId: string, rung: Rung, correct: boolean, now: Date): Promise<number> {
  const had = await db.get('ladder', wordId);
  const next = nextRung(had?.rung ?? 0, rung, correct);
  await db.put('ladder', { ...had, wordId, rung: next, at: now.getTime() });
  return next;
}

/** A look-alike he picked for this word (spec 2026-10-05 §3.4): 钓鱼 comes back for it. */
export async function noteConfusion(db: AppDb, wordId: string, ch: string, now: Date): Promise<void> {
  const had = await db.get('ladder', wordId);
  const confused = [...new Set([...(had?.confused ?? []), ch])];
  await db.put('ladder', { wordId, rung: had?.rung ?? 0, at: now.getTime(), ...had, confused });
}

/** He caught the right fish: stop asking. */
export async function clearConfusion(db: AppDb, wordId: string): Promise<void> {
  const had = await db.get('ladder', wordId);
  if (had?.confused) await db.put('ladder', { ...had, confused: [] });
}

export async function getConfusions(db: AppDb): Promise<Map<string, string[]>> {
  return new Map((await db.getAll('ladder')).filter((e) => e.confused?.length).map((e) => [e.wordId, e.confused!]));
}
```

**`src/activities/components/zibian.ts`:** add, after `fillChoices`:

```ts
/**
 * 钓鱼 for a character he confused (spec 2026-10-05 §3.4): the word (or its two-character 组词) with the character missing, the
 * look-alikes he picked among the fish first, then others. Null when there is no such word, or fewer than 3 look-alikes.
 */
export function fishItem(word: Word, confused: string[], known: ReadonlySet<string>, rng: Rng): ZibianItem | null {
  const own = Array.from(word.text);
  const text = own.length > 1 ? word.text : word.examples?.find((e) => Array.from(e.text).length === 2 && e.text.includes(word.text))?.text;
  if (!text) return null;
  const chars = Array.from(text);
  const k = own.length > 1 ? 0 : chars.indexOf(word.text);
  const answer = chars[k]!;
  const fits = (o: string) => HSK_WORDS.has(chars.map((c, j) => (j === k ? o : c)).join(''));
  const others = fillChoices(chars, k, rng, known)?.filter((c) => c !== answer) ?? [];
  const wrong = [...new Set([...confused.filter((c) => c !== answer && !fits(c)), ...others])].slice(0, 3);
  if (wrong.length < 3) return null;
  return { wordId: word.id, word: text, index: k, answer, options: shuffle([answer, ...wrong], rng) };
}
```

**`src/session/practice.ts`:**
- Import `fishItem`, and `type PracticeItem`.
- Add:

```ts
/** At most two 钓鱼 items a lesson (spec 2026-10-05 §3.4). */
export const MAX_FISH = 2;

/** Puts up to two 钓鱼 items into the round, spread out (a third and two thirds in), never beside the same word. */
export function withFish(items: PracticeItem[], fishIds: string[]): PracticeItem[] {
  const out = [...items];
  const ids = fishIds.slice(0, MAX_FISH);
  ids.forEach((wordId, k) => {
    let at = Math.round((out.length * (k + 1)) / (ids.length + 1));
    while (at < out.length && (out[at - 1]?.wordId === wordId || out[at]?.wordId === wordId)) at++;
    out.splice(at, 0, { wordId, rung: 2, ask: 'fish', grades: null, retry: false });
  });
  return out;
}
```

- `planPractice` gains a last parameter `confusions: ReadonlyMap<string, string[]> = new Map()`, and ends:

```ts
  const round = buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice)(ask), rng);
  const fish = [...confusions.keys()].filter((id) => {
    const w = wordsById.get(id);
    return w && !w.paused && fishItem(w, confusions.get(id)!, new Set(), mulberry32(1)) !== null;
  });
  return withFish(round, fish);
```

**`src/activities/flashcards/FlashcardStep.tsx`:**
- `FlashResult` gains `picked?: string; // the option he chose (钓鱼 remembers a look-alike, spec 2026-10-05 §3.4)`.
- In `next()`, add `picked: choice ?? undefined` to the object passed to `onDone`.

**`src/activities/practice/PracticeQuestion.tsx`:**
- `PracticeResult` gains `picked?: string`, and `asked` becomes `'read' | 'meaning' | 'use' | 'zibian'`.
- Props gain `confused?: string[]; knownChars?: ReadonlySet<string>`.
- Add a memo:

```tsx
  const fish = useMemo(() => (item.ask === 'fish' ? fishItem(word, confused ?? [], knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
```

- The skip effect also skips `item.ask === 'fish' && !fish`.
- Render before the pairing branch:

```tsx
  if (item.ask === 'fish') {
    if (!fish) return null;
    return (
      <ComponentsStep
        items={[fish]}
        kid={kid}
        resting={resting}
        onAnswer={(_, correct) => {
          answer.current = { correct, ms: Math.round(performance.now() - shownAt.current) };
        }}
        onDone={() => {
          const a = answer.current;
          if (a) onDone({ correct: a.correct, hard: false, responseMs: a.ms, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'zibian' });
        }}
      />
    );
  }
```

  Import `ComponentsStep` and `fishItem`.
- **The card branch.** In the `FlashcardStep` branch, `onDone={(r) => onDone(r)}` already passes `picked` through.

**`src/app/SessionScreen.tsx`:**
- Import `noteConfusion`, `clearConfusion` and `getConfusions` from the repo, and `lookAlikeChars` from `../activities/components/zibian`.
- **Loading.** In the load effect, also load `getConfusions(db)`, and keep it on state as `confusions: Map<string, string[]>`. Add the field to `Loaded`.
- **Planning.** In the practice-planning effect, pass `state.confusions` as `planPractice`'s new last argument.
- **Rendering.** Pass `confused={state.confusions.get(practiceWord.id)}` and `knownChars={know.knownChars}` to `PracticeQuestion`.
- **A small helper** before `onFlashDone`:

```ts
  /** A wrong pick that is a look-alike of the character (it shares a part) is remembered for 钓鱼 (spec 2026-10-05 §3.4). */
  const rememberConfusion = async (wordId: string, picked: string | undefined) => {
    const w = know.wordsById.get(wordId);
    if (rec.free || !w || !picked || Array.from(w.text).length !== 1 || picked === w.text) return;
    if (lookAlikeChars(w.text).includes(picked)) await noteConfusion(db, wordId, picked, now());
  };
```

- In `onFlashDone`, after the grading block: `if (!r.correct) await rememberConfusion(item.wordId, r.picked);`.
- **The answer handler.** In `onPracticeDone`, inside `if (!rec.free && !item.retry)`:
  - for a `'fish'` item, do not call `noteRung`. Instead:

```ts
        if (r.asked === 'zibian') {
          await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'zibian', correct: r.correct });
          if (r.correct) await clearConfusion(db, item.wordId);
          else await bringForward(db, item.wordId, know.cardsById.has(`${item.wordId}:write`) ? 'write' : 'recognise', now());
        }
```

  - wrap the existing `noteRung` call as `if (item.ask !== 'fish') await noteRung(…)`;
  - after the block, add `if (!r.correct) await rememberConfusion(item.wordId, r.picked);`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run && npx tsc --noEmit -p .`.
  - Expected: PASS, the whole suite.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: 钓鱼 comes back for a look-alike he confused, at most twice a lesson, until he catches the right fish"`

### Task 8: Check the new questions in WebKit

**Files:**
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`

**Interfaces:**
- **Consumes:** `PairGame`, `BuildSentence`, `ComponentsStep`, `fishItem`, `zuciBoard`, `dapeiBoard`.
- **Produces:**
  - stage cases `pair`, `match`, `build` and `fish` at the three stage-case sizes;
  - screenshots in `fit-shots/stage-cases/<case>-<size>.png`;
  - the same "nothing in the card is clipped" probe the `clue` case uses.

- [ ] **Step 1: Add the cases.**
  - In `scripts/stage-cases/page.tsx`:
    - import `PairGame`, `BuildSentence`, `ComponentsStep`, `fishItem`, `dapeiBoard`, `zuciBoard`, `builtinWords`, `mulberry32`;
    - add before the final `else render(...)`:

```tsx
else if (which === 'pair' || which === 'match' || which === 'build' || which === 'fish') {
  const words = builtinWords(0);
  const w = (t: string) => words.find((x) => x.text === t)!;
  const rng = mulberry32(3);
  const body =
    which === 'pair' ? <PairGame board={zuciBoard(w('火'), rng)!} kind="pair" kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : which === 'match' ? <PairGame board={dapeiBoard(w('穿'), rng)!} kind="match" kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : which === 'build' ? <BuildSentence item={{ full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] }} word={w('和')} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : <ComponentsStep items={[fishItem(w('根'), ['跟'], new Set(), rng)!]} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onDone={() => {}} />;
  render(screen(body), app);
}
```

  - In `scripts/stage-cases.ts`, inside the per-size loop and after the `clue` case:
    - pull the clue case's clipping check out into a function `clipped(page, name)`, which returns problem strings;
    - add:

```ts
  for (const c of ['pair', 'match', 'build', 'fish']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    mkdirSync('fit-shots/stage-cases', { recursive: true });
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    if (!(await page.$('.stage__card'))) problems.push(`${size.name} ${c}: did not render on the stage`);
    problems.push(...(await clipped(page, `${size.name} ${c}`)));
  }
  // the 组句 answer row with every tile placed must still fit (the longest it gets)
  await page.goto(`file://${dir}/index.html?case=build`);
  for (let i = 0; i < 6 && (await page.$('.build__bank .choice')); i++) await page.click('.build__bank .choice');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `fit-shots/stage-cases/build-done-${size.name}.png` });
  problems.push(...(await clipped(page, `${size.name} build done`)));
```

- [ ] **Step 2: Run the cases and the sweep.**
  - Command: `npm run fit`.
  - Expected: 0 problems and `stage cases: ok`.
  - **If something is clipped on the iPhone SE,** fix the CSS: a smaller tile font under `@media (max-height: 700px)`, or tighter gaps. Ledger the rule.
- [ ] **Step 3: Look at them.**
  - Read `fit-shots/stage-cases/{pair,match,build,build-done,fish}-{iphone-se,ipad-landscape,ipad-portrait}.png`.
  - **What to check:** the tiles are large and tappable, the columns line up, the sentence row wraps cleanly, the pond shows the confused 跟 among the fish, Truffle stays in his spot, and nothing is clipped.
  - Also read a few `fit-shots/<size>/practice-*.png` frames from the sweep that show a new question type.
- [ ] **Step 4: Run the suite.**
  - Command: `npx vitest run && npx tsc --noEmit -p .`.
  - Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "test: WebKit checks pairing, 组句 and 钓鱼 on every stage size"`
