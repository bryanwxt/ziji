# Deeper Practice Implementation Plan (Plan 13)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each lesson teach what words mean and how they're used:
- every review shows the word in use;
- new and missed words come back several times;
- new words are written three ways;
- a new 选一选 step asks which word fits and which sentence is right;
- a 用一用 wrap-up makes every target word count 3 correct recalls before the chest;
- 钓鱼 becomes 字辨 for his wrong-radical mistakes.

**Architecture:**
- **Sentence bank.** `src/content/bank/` holds hand-written child-level items (word, 2 gap sentences with hand-picked wrong choices, a wrong-use sentence, an optional pairing and clue), checked by `bankCheck.ts`.
- **Cues.** `meaningCue` prefers his class sentence, then the bank, then 组词. Its result is also the usage line shown in reviews and intros.
- **Today's recalls.** The session record gains `recalls` (per word: right, in context, missed). It is updated by every step and read by the 用一用 planner.
- **New steps.**
  - `choose` (选一选) and `wrapup` (用一用) share one question component, `UseQuestion`, over `UseItem`s built in `src/practice/`.
  - 写一写 runs passes (trace → hint → recall) through `currentWriteTask` / `afterWriteWord`.
  - `components` keeps its name and pond but runs 字辨 items from a component index over the built-in characters.

**Tech Stack:** Preact 10, TypeScript 5.9, hanzi-writer, ts-fsrs, pinyin-pro, idb, Vitest 4 (jsdom, fake-indexeddb), playwright-core 1.52 (WebKit fit sweep).

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §20 (parts 1–8), plus §19 part 2 (cue order), part 3 (选一选 and 字辨 details) and part 4 (the sentence bank).

## Global Constraints

- **Nothing from the Berries packs or the school textbook goes into the repo or the public site.**
  - The bank is written for this app. Its words are chosen from the MIT-licensed HSK 3.0 lists, never copied from a class list.
  - Class sentences reach a lesson only from his on-device imports.
- **No English and no emoji on child screens.** `src/childEmoji.test.ts` must stay green.
- **Every child screen fits without scrolling** (§18). `npm run fit` ends at "0 with problems" at all six sizes.
- **Only the first answer for a word sets its FSRS rating** in a lesson. A second meaning rating on the same day is never recorded; a miss brings the card forward instead.
- Generated wrong-use sentences are out of scope. Every bank sentence is hand-written.
- **Bank sentences:**
  - no longer than 30 characters (`MAX_SENTENCE_CUE`);
  - every character at most one HSK level above the item's word.
- Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A word with no usage line anywhere** (a parent word with no class sentence, no bank item and no 组词):
   - reviews show no line;
   - 选一选 and 用一用 skip the word, with no blank screen or crash.
   - Pinned in Task 4 ("no usage line…") and Task 9 ("a target with no item…").
2. **A lesson saved before plan 13 and resumed after the update** (no `recalls`, no `writePass`, steps without `choose`). It must resume and finish. Pinned in Task 6 ("an old saved lesson…") and Task 7 ("an old record…").
3. **Free play** never records ratings, never runs 用一用, and never brings cards forward. Pinned in Task 9 ("free play has no wrap-up").
4. **A new install or low placement** (few known characters):
   - 字辨 skips itself when fewer than 4 items can be built;
   - 选一选 falls back to bank words he can read, and skips itself when there are none.
   - Pinned in Task 8 ("too few words…") and Task 10 ("fewer than 4 items…").
5. **A word answered wrong 3 times in 用一用.** The round still ends: the word is closed with "明天再来！" and its meaning card is due the next day. Pinned in Task 9 ("three misses…").

---

### Task 1: Sentence bank format, checker, and the HSK 1 items

**Files:**
- Create: `src/content/sentenceBank.ts`, `src/content/bankCheck.ts`, `src/content/bank/hsk1.ts`
- Test: `src/content/sentenceBank.test.ts`

**Interfaces:**
- Produces:
  - `type WordType = 'n' | 'v' | 'adj' | 'adv' | 'conj' | 'prep' | 'pron' | 'mw' | 'other'`
  - `interface BankGap { text: string; wrong: [string, string, string] }`. `text` holds `＿` once.
  - `interface BankItem { word: string; type: WordType; gaps: [BankGap, BankGap]; misuse: string; pair?: string; clue?: string }`
  - `BLANK = '＿'`
  - `fillGap(gap: BankGap, word: string): string`
  - `SENTENCE_BANK: readonly BankItem[]`
  - `bankFor(text: string): BankItem | undefined`
  - `BANK_1` (in `bank/hsk1.ts`)
  - `checkBankItem(item: BankItem): string[]`, which returns the problems
  - `isRealWord(t)`
  - `wordLevel(t): number | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/sentenceBank.test.ts
import { describe, expect, it } from 'vitest';
import { BANK_1 } from './bank/hsk1';
import { checkBankItem } from './bankCheck';
import { bankFor, fillGap, SENTENCE_BANK, type BankItem } from './sentenceBank';

const GOOD: BankItem = {
  word: '很', type: 'adv',
  gaps: [{ text: '今天＿热。', wrong: ['在', '和', '跟'] }, { text: '这个苹果＿大。', wrong: ['和', '在', '给'] }],
  misuse: '我很一个苹果。',
};

describe('checkBankItem', () => {
  it('passes a well-formed item', () => expect(checkBankItem(GOOD)).toEqual([]));
  it('catches a missing blank, a repeated or wrong-length choice, and a misuse without the word', () => {
    const bad: BankItem = { ...GOOD, gaps: [{ text: '今天很热。', wrong: ['在', '在', '我们'] }, GOOD.gaps[1]], misuse: '我吃一个苹果。' };
    const p = checkBankItem(bad).join('\n');
    expect(p).toMatch(/exactly one ＿/);
    expect(p).toMatch(/3 different wrong choices/);
    expect(p).toMatch(/我们 is not 1 characters/);
    expect(p).toMatch(/misuse: must use the word exactly once/);
  });
  it('catches a character more than one HSK level above the word', () => {
    expect(checkBankItem({ ...GOOD, misuse: '我很赞赏一个苹果。' }).join('\n')).toMatch(/赞 is HSK/);
  });
  it('catches a sentence too long for a phone', () => {
    expect(checkBankItem({ ...GOOD, misuse: `我很${'大'.repeat(30)}。` }).join('\n')).toMatch(/longer than 30/);
  });
});

describe('the sentence bank', () => {
  it('every item passes the check', () => expect(SENTENCE_BANK.flatMap(checkBankItem)).toEqual([]));
  it('no word and no sentence appears twice', () => {
    const words = SENTENCE_BANK.map((i) => i.word);
    expect(new Set(words).size).toBe(words.length);
    const sentences = SENTENCE_BANK.flatMap((i) => [...i.gaps.map((g) => fillGap(g, i.word)), i.misuse]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });
  it('HSK 1 covers its 103 words', () => expect(BANK_1).toHaveLength(103));
  it('looks items up by word', () => expect(bankFor('很')?.word).toBe('很'));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/content/sentenceBank.test.ts`
Expected: FAIL. `./bank/hsk1` does not exist.

- [ ] **Step 3: Write the format and the checker**

```ts
// src/content/sentenceBank.ts
import { BANK_1 } from './bank/hsk1';

/** Sentences written for this app (spec §19 part 4, §20 part 4). Never from class material. */
export type WordType = 'n' | 'v' | 'adj' | 'adv' | 'conj' | 'prep' | 'pron' | 'mw' | 'other';
export interface BankGap { text: string; wrong: [string, string, string] } // text holds ＿ once, where the word goes
export interface BankItem {
  word: string;
  type: WordType;
  gaps: [BankGap, BankGap]; // two fill-the-gap sentences, each with 3 hand-picked wrong choices
  misuse: string; // the word in the wrong frame, for 用对了吗 (hand-written, never generated)
  pair?: string; // a word it often goes with (保持 + 安静)
  clue?: string; // shown after a miss (看'虽然'，后面用'但是')
}

export const BLANK = '＿';
export const fillGap = (gap: BankGap, word: string) => gap.text.replace(BLANK, word);
export const SENTENCE_BANK: readonly BankItem[] = [...BANK_1];
const BY_WORD = new Map(SENTENCE_BANK.map((i) => [i.word, i]));
export const bankFor = (text: string): BankItem | undefined => BY_WORD.get(text);
```

```ts
// src/content/bankCheck.ts
import { BUILTIN, HSK_WORDS } from '.';
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { BLANK, fillGap, type BankItem } from './sentenceBank';

const CHAR_LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level]));
const HAN = /\p{Script=Han}/u;
export const isRealWord = (t: string) => (Array.from(t).length > 1 ? HSK_WORDS.has(t) : CHAR_LEVEL.has(t));
export const wordLevel = (t: string): number | undefined => (Array.from(t).length > 1 ? HSK_WORDS.get(t) : CHAR_LEVEL.get(t));
const count = (s: string, part: string) => s.split(part).length - 1;

/** Problems with one bank item (spec §19 part 4, §20 part 4); empty when it is fine. */
export function checkBankItem(item: BankItem): string[] {
  const p: string[] = [];
  const level = wordLevel(item.word);
  if (level === undefined) return [`${item.word}: not an HSK word or character`];
  const len = Array.from(item.word).length;
  const readable = (s: string, what: string) => {
    for (const ch of Array.from(s).filter((c) => HAN.test(c))) {
      const l = CHAR_LEVEL.get(ch);
      if (l === undefined || l > level + 1) p.push(`${item.word} ${what}: ${ch} is HSK ${l ?? '?'} (word is HSK ${level})`);
    }
    if (Array.from(s).length > MAX_SENTENCE_CUE) p.push(`${item.word} ${what}: longer than ${MAX_SENTENCE_CUE} characters`);
  };
  item.gaps.forEach((g, i) => {
    const at = `gap ${i + 1}`;
    if (count(g.text, BLANK) !== 1) p.push(`${item.word} ${at}: needs exactly one ${BLANK}`);
    if (new Set(g.wrong).size !== 3 || g.wrong.includes(item.word)) p.push(`${item.word} ${at}: 3 different wrong choices, none the word`);
    for (const w of g.wrong) {
      if (!isRealWord(w)) p.push(`${item.word} ${at}: ${w} is not a real word`);
      if (Array.from(w).length !== len) p.push(`${item.word} ${at}: ${w} is not ${len} characters`);
      readable(w, `${at} choice`);
    }
    const full = fillGap(g, item.word);
    if (count(full, item.word) !== 1) p.push(`${item.word} ${at}: the word must appear once`);
    readable(full, at);
  });
  if (count(item.misuse, item.word) !== 1 || item.misuse.includes(BLANK)) p.push(`${item.word} misuse: must use the word exactly once`);
  readable(item.misuse, 'misuse');
  if (item.pair && !isRealWord(item.pair)) p.push(`${item.word} pair: ${item.pair} is not a real word`);
  return p;
}
```

- [ ] **Step 4: Write `src/content/bank/hsk1.ts`.** Write one item for each of these 103 words, in this order:

很 在 和 跟 给 对 想 要 会 能 吃 喝 看 听 说 读 写 买 走 跑 坐 开 关 送 等 找 穿 洗 玩 学 教 做 用 放 拿 住 叫 问 回 进 出 到 大 小 多 少 高 新 快 慢 冷 热 远 早 晚 忙 累 爸爸 朋友 知道 明白 喜欢 觉得 认识 记住 告诉 准备 帮忙 休息 起床 睡觉 回答 认真 干净 高兴 一起 常常 马上 非常 还是 一样 旁边 时候 一会儿 衣服 东西 名字 学校 同学 图书馆 介绍 生气 忘记 重要 考试 上课 放学 打开 关上 回家 天气 一边 别人

The format, with the first items:

```ts
// src/content/bank/hsk1.ts
import type { BankItem } from '../sentenceBank';

/** HSK 1 words in use. Written for this app: everyday Singapore-friendly sentences a P2 child can read. */
export const BANK_1: BankItem[] = [
  { word: '很', type: 'adv', gaps: [{ text: '今天＿热。', wrong: ['在', '和', '跟'] }, { text: '这个苹果＿大。', wrong: ['和', '在', '给'] }], misuse: '我很一个苹果。' },
  { word: '在', type: 'prep', gaps: [{ text: '妈妈＿家里做饭。', wrong: ['很', '和', '对'] }, { text: '书包＿桌子上。', wrong: ['很', '给', '和'] }], misuse: '我在很高兴。' },
  { word: '和', type: 'conj', gaps: [{ text: '我＿哥哥都喜欢打球。', wrong: ['很', '在', '对'] }, { text: '爸爸＿妈妈去买东西。', wrong: ['很', '对', '会'] }], misuse: '今天和热。' },
  // …one item per word above
];
```

**Item rules** (the checker enforces the mechanical ones):
- Each gap's 3 wrong choices are hand-picked:
  - one near-synonym or same-topic word;
  - one word that would fit the mood but not the frame;
  - one look-alike or same-sound word.
- `misuse` puts the word in the wrong frame, so a child can tell it's wrong.
- `pair` goes on words with a strong partner, such as 打开/门 or 关上/门.
- `clue` goes on connectives and look-alike traps.
- No names other than family words (爸爸, 妈妈, 哥哥…). No brands.

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/content/sentenceBank.test.ts`
Expected: PASS.
- When the bank check fails, fix the item's sentence, never the checker.
- If a word cannot be written within its level, swap it for another HSK 1 word and ledger the swap as a Ruling.

- [ ] **Step 6: Commit**

```bash
git add src/content/sentenceBank.ts src/content/bankCheck.ts src/content/bank/hsk1.ts src/content/sentenceBank.test.ts
git commit -m "feat: a written sentence bank, checked, with its HSK 1 words"
```

### Task 2: Sentence bank — HSK 2 items

**Files:**
- Create: `src/content/bank/hsk2.ts`
- Modify: `src/content/sentenceBank.ts` (spread `BANK_2`), `src/content/sentenceBank.test.ts`

**Interfaces:**
- Consumes: `BankItem` and `checkBankItem` from Task 1.
- Produces: `BANK_2`.

- [ ] **Step 1: Write the failing test.** Add to `src/content/sentenceBank.test.ts`:

```ts
import { BANK_2 } from './bank/hsk2';
it('HSK 2 covers its 86 words', () => expect(BANK_2).toHaveLength(86));
```

- [ ] **Step 2: Run it.** `npx vitest run src/content/sentenceBank.test.ts`. Expected: FAIL (no module).
- [ ] **Step 3: Write `src/content/bank/hsk2.ts`** (`export const BANK_2: BankItem[]`), with one item for each of these 86 words, under the same rules as Task 1:

让 长 近 已经 安静 帮助 但是 而且 虽然 所以 因为 如果 或者 然后 刚才 忽然 一定 一直 经常 特别 快乐 漂亮 可爱 舒服 清楚 努力 健康 方便 便宜 礼物 故事 动物 公园 教室 句子 练习 复习 完成 参加 排队 离开 发现 收到 送给 关心 放心 难过 满意 热情 讨论 商量 机会 办法 节日 声音 味道 生活 年级 成绩 打算 欢迎 感谢 爬山 旅行 举手 碰到 小心 应该 可能 必须 不但 草地 春天 秋天 冬天 太阳 大家 认为 照顾 一般 只要 习惯 结果 原因 计划 感动

Connectives get a `clue`. For example, 虽然: `clue: "看'虽然'，后面常用'但是'"`. Then add `...BANK_2` to `SENTENCE_BANK`.

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: HSK 2 words in the sentence bank"`

### Task 3: Sentence bank — HSK 3 and 4 items

**Files:**
- Create: `src/content/bank/hsk3.ts`
- Modify: `src/content/sentenceBank.ts`, `src/content/sentenceBank.test.ts`

**Interfaces:**
- Produces: `BANK_3`, and a `SENTENCE_BANK` of at least 240 items.

- [ ] **Step 1: Write the failing test**

```ts
import { BANK_3 } from './bank/hsk3';
it('HSK 3–4 cover their 77 words, and the bank holds about 250 words', () => {
  expect(BANK_3).toHaveLength(77);
  expect(SENTENCE_BANK.length).toBeGreaterThanOrEqual(240);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write `src/content/bank/hsk3.ts`** (`export const BANK_3: BankItem[]`) for these words.

HSK 3:
保持 开始 比较 决定 坚持 继续 简单 复杂 困难 解决 进步 关系 环境 保护 节约 浪费 互相 立刻 连忙 赶快 赶紧 果然 本来 从来 到底 终于 突然 紧张 精彩 美丽 丰富 安排 表演 批评 整理 当然 其实 不仅 除了 只有 难道 好奇 经验 目标 机器 景色 城市 家乡 父母 理解 发展 变化 观察 记录 害怕 希望 比赛 只好 整齐

HSK 4, common P2 class words:
着急 迟到 有趣 新鲜 刷牙 打扫 勇敢 粗心 准时 按时 担心 失望 兴趣 风景 选择 无论 竟然 表扬

- Near-synonym pairs get each other as one wrong choice where the frame tells them apart:
  - 开始/开头;
  - 赶快/赶紧, with a `clue`.
- 保持 gets `pair: '安静'`.

Then add `...BANK_3` to `SENTENCE_BANK`.

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: HSK 3–4 words in the sentence bank"`

### Task 4: Cues from the bank, and the usage line

**Files:**
- Modify: `src/activities/flashcards/meaning.ts`
- Test: `src/activities/flashcards/meaning.test.ts`

**Interfaces:**
- Consumes: `bankFor` and `fillGap` from Task 1.
- Produces:
  - `MeaningCue` gains:
    - `source: 'class' | 'bank' | 'word'`;
    - `wrong?: string[]`, the bank's hand-picked choices;
    - `clue?: string`;
    - `pair?: string`.
  - `meaningCue(word: Word, variant = 0)`, ordered as class sentence → bank gap (`gaps[variant % 2]`) → 组词. `kind` is `'sentence'` for class and bank cues.
  - `usageLine(word: Word): { before: string; after: string; full: string; pinyin: string } | null`. It is the cue with the word filled in.

- [ ] **Step 1: Write the failing tests**

```ts
describe('bank cues (spec §20 part 4)', () => {
  it('a word with a bank item but no class sentence gets the bank sentence, with its hand-picked choices', () => {
    const w = makeWord('很', { pinyin: 'hěn', examples: [{ text: '很多', pinyin: 'hěn duō' }] });
    const cue = meaningCue(w)!;
    expect(cue).toMatchObject({ kind: 'sentence', source: 'bank', before: '今天', after: '热。', wrong: ['在', '和', '跟'] });
    expect(meaningCue(w, 1)).toMatchObject({ before: '这个苹果', after: '大。' });
  });
  it('his class sentence still comes before the bank', () => {
    const w = makeWord('保持', { pinyin: 'bǎo chí', level: null, source: 'parent', sentences: [{ text: '教室里要保持安静。', pinyin: '' }] });
    expect(meaningCue(w)).toMatchObject({ source: 'class', before: '教室里要' });
  });
});

describe('usageLine (spec §20 part 1)', () => {
  it('is the cue with the word in place', () => {
    expect(usageLine(makeWord('很', { pinyin: 'hěn' }))).toEqual({ before: '今天', after: '热。', full: '今天很热。', pinyin: '' });
  });
  it('falls back to a 组词 word with its pinyin', () => {
    const w = makeWord('惜', { pinyin: 'xī', examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] });
    expect(usageLine(w)).toEqual({ before: '珍', after: '', full: '珍惜', pinyin: 'zhēn xī' });
  });
  it('no usage line when there is nothing to show (a parent word with no sentence, no bank item, no 组词)', () => {
    expect(usageLine(makeWord('欺负', { level: null, source: 'parent' }))).toBeNull();
  });
});
```

Import `usageLine` in the test file's import line.

- [ ] **Step 2: Run it.** `npx vitest run src/activities/flashcards/meaning.test.ts`. Expected: FAIL (`usageLine` is not exported; no `source`).
- [ ] **Step 3: Implement.** In `meaning.ts`:
  - add `source`, `wrong?`, `clue?` and `pair?` to `MeaningCue`;
  - set `source: 'class'` on the class loop (with `pair: word.pairs?.[0]`) and `source: 'word'` on the 组词 return;
  - between the class loop and the 组词 loop, insert:

```ts
  const bank = bankFor(word.text);
  if (bank) {
    const gap = bank.gaps[variant % 2]!;
    const at = gap.text.indexOf(BLANK);
    return {
      kind: 'sentence', source: 'bank', full: fillGap(gap, word.text), pinyin: '',
      before: gap.text.slice(0, at), after: gap.text.slice(at + BLANK.length),
      wrong: [...gap.wrong], clue: bank.clue, pair: word.pairs?.[0] ?? bank.pair,
    };
  }
```

and add:

```ts
/** The word in use for reviews and intros (spec §20 part 1): the cue, word in place. */
export function usageLine(word: Word): { before: string; after: string; full: string; pinyin: string } | null {
  const cue = meaningCue(word);
  return cue ? { before: cue.before, after: cue.after, full: cue.full, pinyin: cue.pinyin } : null;
}
```

  In `FlashcardStep.tsx`, the meaning quiz's options use `cue.wrong` when present:
  `options: shuffle([word.text, ...(cue.wrong ?? pickSoundAlikes(word, cue, pool, rng))], rng)`.

- [ ] **Step 4: Run** `npx vitest run src/activities/flashcards`. Expected: PASS. Fix the older tests' `toEqual` cue literals by adding `source: 'word'`.
- [ ] **Step 5: Commit.** `git commit -m "feat: bank sentences as meaning cues; the usage line"`

### Task 5: 认一认 shows meaning (usage line in feedback and intro)

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx`, `src/styles.css`
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `usageLine(word)` from Task 4.
- Produces: the `<UsageLine word={…} />` markup, `.usage` with the word in `<mark class="usage__word">`. Task 9's fit checks look for `.usage`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the usage line (spec §20 part 1)', () => {
  const hen = makeWord('很', { id: 'b:很', pinyin: 'hěn' });
  it('shows after a reading answer, right or wrong, under the character, and speaks only on tap', () => {
    render(<FlashcardStep {...base} word={hen} pool={[hen, ...pool]} item={{ wordId: 'b:很', isNew: false, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.usage')).toBeNull(); // not before he answers
    document.querySelector<HTMLButtonElement>('.choices button')!.click();
    expect(document.querySelector('.flash__prompt .usage')?.textContent).toContain('今天很热。');
    expect(document.querySelector('.usage__word')?.textContent).toBe('很');
    expect(speak).not.toHaveBeenCalledWith('今天很热。');
  });
  it('leads the new-word intro and is read after the character', () => {
    render(<FlashcardStep {...base} word={hen} pool={[hen, ...pool]} item={{ wordId: 'b:很', isNew: true, retry: false }} voice onDone={vi.fn()} />);
    expect(document.querySelector('.intro .usage')?.textContent).toContain('今天很热。');
    expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['很', '今天很热。']);
  });
  it('with a sentence, the intro keeps one 组词 word so it fits a phone', () => {
    const w = { ...hen, examples: [{ text: '很多', pinyin: 'hěn duō' }, { text: '很好', pinyin: 'hěn hǎo' }] };
    render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'b:很', isNew: true, retry: false }} voice onDone={vi.fn()} />);
    expect(document.querySelectorAll('.intro .example')).toHaveLength(1);
  });
});
```

(`speak` is already mocked in this file. Clear it with `vi.mocked(speak).mockClear()` in a `beforeEach` inside this describe.)

- [ ] **Step 2: Run it.** Expected: FAIL (no `.usage`).
- [ ] **Step 3: Implement.** In `FlashcardStep.tsx`:

```tsx
function UsageLine({ word }: { word: Word }) {
  const line = usageLine(word);
  if (!line) return null;
  return (
    <div class="usage" lang="zh">
      <span class="hanzi usage__text">{line.before}<mark class="usage__word">{word.text}</mark>{line.after}</span>
      {line.pinyin && <span class="pinyin">{line.pinyin}</span>}
      <SpeakButton text={line.full} />
    </div>
  );
}
```

- **In the reading prompt:** render `<>{word.text big}{phase === 'feedback' && <UsageLine word={word} />}</>` inside `.flash__prompt`, for reading questions only. Meaning questions already show the sentence.
- **The character in feedback:** add `hanzi--xl` only in `quiz`. In `feedback` with a usage line, use `hanzi--lg`, so the line fits.
- **In `Intro`:** put `<UsageLine word={word} />` right under the character's `SpeakButton`. Slice the examples to `usageLine(word)?.full.length > 3 ? 1 : 2`.
- **Speech:** the intro effect speaks `word.text`, then `usageLine(word)?.full` when present. Speech queues in order.

CSS:

```css
.usage { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: min(100%, 640px); }
.usage__text { font-size: clamp(22px, 3.2dvh, 32px); line-height: 1.4; }
.usage__word { background: var(--accent-soft); color: inherit; border-radius: 6px; padding: 0 4px; }
.hanzi--lg { font-size: clamp(56px, 10dvh, 110px); line-height: 1; }
```

(If `--accent-soft` doesn't exist, use the existing highlight token from `.meaning-cue__blank`.)

- [ ] **Step 4: Run** `npx vitest run src/activities/flashcards`. Expected: PASS. Then run `FIT_ONLY='^flashcards' npm run fit`. Expected: "0 with problems". Look at `fit-shots/iphone-se/flashcards-*.png` for a feedback screen with the line.
- [ ] **Step 5: Commit.** `git commit -m "feat: every 认一认 answer and intro shows the word in use"`

### Task 6: Reading repetition, today's recalls, and 4 new words a lesson

**Files:**
- Create: `src/session/recall.ts`
- Modify:
  - `src/types.ts` (`SessionPlan.newWordMeaningIds?`, `SessionRecord.recalls?`, `DEFAULT_SETTINGS.newPerDay: 4`, `lessonVersion: 3`);
  - `src/session/runner.ts`, `src/session/plan.ts`, `src/store/settings.ts`;
  - `src/activities/flashcards/FlashcardStep.tsx` (`FlashResult.inContext`);
  - `src/app/SessionScreen.tsx`.
- Test: `src/session/recall.test.ts`, `src/session/runner.test.ts`, `src/session/plan.test.ts`, `src/store/settings.test.ts`

**Interfaces:**
- Produces:
  - `interface Recall { right: number; inContext: number; missed: boolean }`
  - `noteRecall(recalls: Record<string, Recall> | undefined, wordId: string, correct: boolean, inContext: boolean): Record<string, Recall>`
  - `RETRY_GAPS = [3, 6]`
  - `REPEAT_GAP = 5`
  - `afterFlashAnswer(rec, correct, rawElapsedMs, inContext = false)`
  - `FlashResult.inContext: boolean`
  - `SessionPlan.newWordMeaningIds?: string[]`

- [ ] **Step 1: Write the failing tests**

```ts
// src/session/recall.test.ts
import { describe, expect, it } from 'vitest';
import { noteRecall } from './recall';
describe('noteRecall', () => {
  it('counts right answers, in-context ones and any miss, per word', () => {
    let r = noteRecall(undefined, 'a', true, false);
    r = noteRecall(r, 'a', true, true);
    r = noteRecall(r, 'a', false, true);
    expect(r.a).toEqual({ right: 2, inContext: 1, missed: true });
  });
});
```

```ts
// runner.test.ts — add
describe('reading repetition (spec §20 part 2)', () => {
  const plan = { steps: ['flashcards'] as StepKind[], reviewWordIds: ['r1', 'r2'], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1e9, writeCandidates: [], writeCount: 0, newWordMeaningIds: ['n1'] };
  it('a new word is met 3 times: intro + reading, a second reading about 5 items on, a meaning question near the end', () => {
    const q = createSessionRecord(plan, '2026-10-05', 0).flashQueue;
    expect(q.map((i) => `${i.wordId}${i.isNew ? '*' : ''}${i.retry ? '+' : ''}${i.mode === 'meaning' ? 'm' : ''}`)).toEqual(['r1', 'r2', 'n1*', 'n2*', 'n1+', 'n2+', 'n1m']);
  });
  it('a missed item comes back twice: about 3 items later, then about 6 after that', () => {
    const many = { ...plan, reviewWordIds: Array.from({ length: 14 }, (_, i) => `r${i}`), newWordIds: [], newWordMeaningIds: [] };
    let rec = createSessionRecord(many, '2026-10-05', 0);
    rec = afterFlashAnswer(rec, false, 100);
    const ids = rec.flashQueue.map((i) => i.wordId);
    expect(ids.indexOf('r0', 1)).toBe(4);
    expect(ids.indexOf('r0', 5)).toBe(11);
  });
  it('counts today\'s recalls per word, with the in-context flag', () => {
    let rec = createSessionRecord(plan, '2026-10-05', 0);
    rec = afterFlashAnswer(rec, true, 100, true);
    expect(rec.recalls?.r1).toEqual({ right: 1, inContext: 1, missed: false });
  });
  it('an old saved lesson without recalls resumes and counts', () => {
    const old = { ...createSessionRecord(plan, '2026-10-05', 0) } as SessionRecord;
    delete (old as { recalls?: unknown }).recalls;
    expect(afterFlashAnswer(old, true, 10).recalls?.r1?.right).toBe(1);
  });
});
```

```ts
// plan.test.ts — add
it('new words that have a cue get their meaning question in the same lesson (newWordMeaningIds)', () => {
  const plan = buildSessionPlan({ cards: [], words: [makeWord('很', { rank: 1 }), makeWord('欺负', { id: 'p:1', source: 'parent', level: null, rank: null, listedAt: 1 })], settings: { ...DEFAULT_SETTINGS, newPerDay: 4 }, now: new Date('2026-10-05T09:00') });
  expect(plan.newWordIds).toEqual(['p:1', 'b:很']);
  expect(plan.newWordMeaningIds).toEqual(['b:很']); // 欺负 has no sentence, bank item or 组词
});
```

```ts
// settings.test.ts — add
it('lesson version 3: 5 new words a day becomes 4; a parent\'s other choice stays', () => {
  expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toEqual({ newPerDay: 4, lessonVersion: 3 });
  expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 8 })).toEqual({ newPerDay: 8, lessonVersion: 3 });
  expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 1, sessionMinutes: 20, newPerDay: 5 })).toEqual({ sessionMinutes: 30, newPerDay: 4, lessonVersion: 3 });
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/session src/store/settings.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/session/recall.ts
/** Today's recalls of one word across the lesson's steps (spec §20 part 7). In context: 选一选, 用对了吗, or a meaning question with a sentence. */
export interface Recall { right: number; inContext: number; missed: boolean }
export function noteRecall(recalls: Record<string, Recall> | undefined, wordId: string, correct: boolean, inContext: boolean): Record<string, Recall> {
  const r = recalls?.[wordId] ?? { right: 0, inContext: 0, missed: false };
  return { ...recalls, [wordId]: correct ? { ...r, right: r.right + 1, inContext: r.inContext + (inContext ? 1 : 0) } : { ...r, missed: true } };
}
```

**runner.ts:**
- Replace `RETRY_GAP` with:

  ```ts
  export const RETRY_GAPS = [3, 6] as const;
  export const REPEAT_GAP = 5;
  ```

- In `createSessionRecord`, after the head, add:

  ```ts
  const fresh: FlashItem[] = [];
  plan.newWordIds.forEach((wordId) => fresh.push({ wordId, isNew: true, retry: false }));
  plan.newWordIds.forEach((wordId, i) => fresh.splice(Math.min(i + 1 + REPEAT_GAP, fresh.length), 0, { wordId, isNew: false, retry: true }));
  const freshMeaning = (plan.newWordMeaningIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' }));
  ```

  The queue becomes `[...head, ...fresh, ...freshMeaning, ...mean.slice(m), ...newMeaningIds items]`. The repeat sits about 5 places after its own intro, or at the end of the new words when fewer follow.
- `afterFlashAnswer(rec, correct, rawElapsedMs, inContext = false)`:
  - on a first miss, insert two retries:

    ```ts
    const a = Math.min(rec.flashIndex + 1 + RETRY_GAPS[0], q.length); q.splice(a, 0, retryItem);
    const b = Math.min(a + 1 + RETRY_GAPS[1], q.length); q.splice(b, 0, retryItem);
    ```

  - and set `recalls: noteRecall(rec.recalls, item.wordId, correct, inContext)`.

**plan.ts:** `newWordMeaningIds: newIds.filter((id) => { const w = byId.get(id); return !!w && meaningCue(w) !== null; })`. Hold the new ids in a `newIds` const first.

**settings.ts:**

```ts
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 3) return null;
  const patch: Partial<Settings> = { lessonVersion: 3 };
  if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
  patch.newPerDay = s.newPerDay === 5 ? 4 : s.newPerDay; // only the old default moves (spec §20 part 2)
  return patch;
}
```

**Then:**
- `DEFAULT_SETTINGS.newPerDay` = 4 and `lessonVersion` = 3.
- `FlashcardStep` passes `inContext: quiz.cue?.kind === 'sentence'` in its `onDone` result.
- `SessionScreen.onFlashDone` calls `afterFlashAnswer(rec, r.correct, r.elapsedMs, r.inContext)`.
- Update the older runner tests that relied on `RETRY_GAP = 4`, keeping their intent.
- The existing migration test that expected `{ sessionMinutes: 30, lessonVersion: 2 }` now expects version 3 with `newPerDay`.

- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS, all suites.
- [ ] **Step 5: Commit.** `git commit -m "feat: new words met 3 times, misses twice; today's recalls; 4 new words"`

### Task 7: Writing passes — trace, hint, recall; a redo at the end

**Files:**
- Modify:
  - `src/types.ts` (`SessionRecord.writePass?`, `writeRedo?`, `writeRedoIndex?`);
  - `src/session/runner.ts`, `src/session/plan.ts` (writeCount 4 / 3);
  - `src/activities/writing/WritingStep.tsx`, `src/app/SessionScreen.tsx`, `src/styles.css`.
- Test: `src/session/runner.test.ts`, `src/activities/writing/WritingStep.test.tsx`, `src/session/plan.test.ts`

**Interfaces:**
- Produces:
  - `type WritePass = 'trace' | 'hint' | 'recall'`
  - `interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean }`
  - `currentWriteTask(rec): WriteTask | null`, which replaces `currentWriteCandidate`
  - `afterWriteWord(rec, done: boolean, rawElapsedMs: number, outcome: { hinted?: boolean; misses?: number } = {})`
  - `WritingStep` props gain `pass: WritePass`
  - `WriteResult` gains `hinted: boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// runner.test.ts — add
describe('write passes (spec §20 part 3)', () => {
  const plan = { steps: ['writing'] as StepKind[], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [{ wordId: 'n', isNew: true }, { wordId: 'r', isNew: false }], writeCount: 4 };
  it('a new word: trace, then hint, then recall; a review word: recall only', () => {
    let rec = createSessionRecord(plan, 'd', 0);
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { const t = currentWriteTask(rec)!; seen.push(`${t.wordId}:${t.pass}`); rec = afterWriteWord(rec, true, 10); }
    expect(seen).toEqual(['n:trace', 'n:hint', 'n:recall', 'r:recall']);
    expect(rec.completed).toBe(true);
  });
  it('a word that needed a hint, or had more than 3 misses, is written once more at the end', () => {
    let rec = createSessionRecord({ ...plan, writeCandidates: [{ wordId: 'a', isNew: false }, { wordId: 'b', isNew: false }] }, 'd', 0);
    rec = afterWriteWord(rec, true, 10, { hinted: true });
    rec = afterWriteWord(rec, true, 10, { misses: 1 });
    expect(currentWriteTask(rec)).toEqual({ wordId: 'a', isNew: false, pass: 'recall', redo: true });
    rec = afterWriteWord(rec, true, 10);
    expect(rec.completed).toBe(true);
  });
  it('an old record without writePass resumes at its first pass', () => {
    const rec = createSessionRecord(plan, 'd', 0);
    delete (rec as { writePass?: number }).writePass;
    expect(currentWriteTask(rec)?.pass).toBe('trace');
  });
});
```

```tsx
// WritingStep.test.tsx — add (the mock's create records its options)
it('the trace pass shows the outline; the hint pass flashes the first stroke and hints after 1 miss; recall hints after 2', () => {
  const create = vi.mocked(HanziWriter.create);
  for (const [pass, outline, hintAfter] of [['trace', true, 1], ['hint', false, 1], ['recall', false, 2]] as const) {
    create.mockClear();
    const { unmount } = render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass={pass} onDone={vi.fn()} />);
    expect(create.mock.calls[0]![2]).toMatchObject({ showOutline: outline, showHintAfterMisses: hintAfter });
    unmount();
  }
});
it('reports a hint when a stroke was missed twice in the recall pass', () => {
  quizzes.length = 0;
  const onDone = vi.fn();
  render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={onDone} />);
  act(() => { quizzes.at(-1)!.onMistake!({ mistakesOnStroke: 2 }); quizzes.at(-1)!.onComplete({ totalMistakes: 2 }); });
  fireEvent.click(screen.getByText('完成'));
  expect(onDone).toHaveBeenCalledWith({ totalMisses: 2, hinted: true, elapsedMs: expect.any(Number) });
});
```

Extend the mock: `create` returns `{ quiz, cancelQuiz, highlightStroke: vi.fn() }`. `QuizOpts` gains `onMistake?: (d: { mistakesOnStroke: number }) => void`. Import `HanziWriter from 'hanzi-writer'` in the test.

Update the existing calls to pass `pass="recall"`, and expect `hinted: false` in the existing `onDone` assertion.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// runner.ts
export type WritePass = 'trace' | 'hint' | 'recall';
const NEW_WORD_PASSES: WritePass[] = ['trace', 'hint', 'recall'];
export interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean }

const mainWritingDone = (rec: SessionRecord) => rec.writeDone >= rec.plan.writeCount || rec.writeIndex >= rec.plan.writeCandidates.length;

export function currentWriteTask(rec: SessionRecord): WriteTask | null {
  if (currentStep(rec) !== 'writing') return null;
  if (mainWritingDone(rec)) {
    const id = (rec.writeRedo ?? [])[rec.writeRedoIndex ?? 0];
    return id ? { wordId: id, isNew: false, pass: 'recall', redo: true } : null;
  }
  const c = rec.plan.writeCandidates[rec.writeIndex]!;
  const passes = c.isNew ? NEW_WORD_PASSES : (['recall'] as WritePass[]);
  return { wordId: c.wordId, isNew: c.isNew, pass: passes[Math.min(rec.writePass ?? 0, passes.length - 1)]!, redo: false };
}

/** done=false: skipped (no stroke data). Only the recall pass finishes a word; one that needed a hint or had >3 misses is redone at the end. */
export function afterWriteWord(rec: SessionRecord, done: boolean, rawElapsedMs: number, outcome: { hinted?: boolean; misses?: number } = {}): SessionRecord {
  const task = currentWriteTask(rec);
  if (!task) return rec;
  const base = { ...rec, activeMs: rec.activeMs + Math.min(rawElapsedMs, MAX_WORD_MS) };
  let next: SessionRecord;
  if (task.redo) next = { ...base, writeRedoIndex: (rec.writeRedoIndex ?? 0) + 1 };
  else if (!done) next = { ...base, writeIndex: rec.writeIndex + 1, writePass: 0 };
  else if (task.pass !== 'recall') next = { ...base, writePass: (rec.writePass ?? 0) + 1 };
  else {
    const redo = outcome.hinted || (outcome.misses ?? 0) > 3 ? [...(rec.writeRedo ?? []), task.wordId] : rec.writeRedo ?? [];
    next = { ...base, writeIndex: rec.writeIndex + 1, writeDone: rec.writeDone + 1, writePass: 0, writeRedo: redo };
  }
  return currentWriteTask(next) ? next : finishStep(next);
}
```

**plan.ts:** `writeCount: settings.sessionMinutes < 25 ? 3 : 4`.

**WritingStep:**
- `pass` prop. Writer options:

  ```ts
  showOutline: pass === 'trace',
  showHintAfterMisses: pass === 'recall' ? 2 : 1,
  ```

- After `create`, `if (pass === 'hint') writer.highlightStroke(0);`.
- `quiz({ onMistake: (d) => { if (pass === 'recall' && d.mistakesOnStroke >= 2) hinted.current = true; }, onComplete… })`.
- `onDone({ totalMisses, hinted: hinted.current, elapsedMs })`.
- Pet bubble by pass: `{ trace: '描一描！', hint: '看提示写！', recall: '写一写！' }`.
- Effects key on `[word.id, index, pass]`. Reset `index`, `misses` and `hinted` when `pass` changes. `SessionScreen` keys the step by `${rec.writeIndex}-${rec.writePass ?? 0}-${rec.writeRedoIndex ?? 0}`.

**SessionScreen:**
- `currentWriteCandidate` becomes `currentWriteTask`.
- `onWriteDone`:
  - records writing only when `task.pass === 'recall' && !task.redo`;
  - marks skipped as now;
  - calls `afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0, { hinted: r?.hinted, misses: r?.totalMisses })`.

Replace `currentWriteCandidate` wherever it is still used.

- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS. Then run `FIT_ONLY='^writing' npm run fit`. Expected: 0 problems. The walk passes through all three passes.
- [ ] **Step 5: Commit.** `git commit -m "feat: new words traced, hinted, then written from memory; hinted words redone"`

### Task 8: 选一选 and 用对了吗 — the `choose` step

**Files:**
- Create:
  - `src/practice/useItems.ts`, `src/practice/choose.ts`;
  - `src/activities/choose/UseQuestion.tsx`, `src/activities/choose/ChooseStep.tsx`.
- Modify:
  - `src/types.ts` (`ActivityKind`, `StepKind`);
  - `src/session/plan.ts` (`STEP_ORDER`, `chooseCount`), `src/session/record.ts` (`recordUse`, `bringForward`);
  - `src/app/SessionScreen.tsx`, `src/ui/ProgressBar.tsx`, `src/app/TodayPath.tsx`, `src/fun/path.ts`;
  - `src/parent/SettingsPanel.tsx`, `src/styles.css`;
  - `scripts/fit-check.ts`, `scripts/fit-profile.ts`.
- Test: `src/practice/useItems.test.ts`, `src/practice/choose.test.ts`, `src/activities/choose/ChooseStep.test.tsx`, `src/session/record.test.ts`

**Interfaces:**
- Consumes: `meaningCue(word, variant)` and `pickSoundAlikes` (Task 4); `bankFor` and `fillGap` (Task 1); `noteRecall` (Task 6).
- Produces:
  - `type ActivityKind = 'flashcards' | 'choose' | 'writing' | 'components' | 'speaking'`
  - `type StepKind = ActivityKind | 'wrapup'`. `Settings.activities` is `Record<ActivityKind, boolean>`.
  - `type UseItem`:
    - `{ kind: 'fit'; wordId: string | null; word: string; before: string; after: string; options: string[]; pair?: string; clue?: string }`
    - `| { kind: 'usage'; wordId: string | null; word: string; right: string; wrong: string; pair?: string }`
  - `fitItem(word: Word, pool: Word[], rng: Rng, variant?: number): UseItem | null`
  - `usageItem(word: string, wordId: string | null): UseItem | null`
  - `planChoose(input: ChooseInput): UseItem[]`
  - `chooseCount(minutes: number): number`
  - `recordUse(db, wordId, correct, now): Promise<CardRecord>`, which rates the meaning card only if it hasn't been rated today, and otherwise brings it forward on a miss
  - `bringForward(db, wordId, kind: CardKind, due: Date)`
  - `<UseQuestion item onAnswer(correct) />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/practice/useItems.test.ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeWord } from '../test/fixtures';
import { mulberry32 } from '../lib/random';
import { fitItem, usageItem } from './useItems';
describe('use items', () => {
  it('a fit item from the bank uses its hand-picked choices', () => {
    const item = fitItem(makeWord('很', { pinyin: 'hěn' }), builtinWords(0), mulberry32(1))!;
    expect(item).toMatchObject({ kind: 'fit', word: '很', before: '今天', after: '热。' });
    expect([...item.options].sort()).toEqual(['和', '在', '很', '跟'].sort());
  });
  it('a class-sentence fit item gets automatic choices, and the word\'s pairing', () => {
    const w = makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí', level: null, source: 'parent', pairs: ['安静'], sentences: [{ text: '教室里要保持安静，大家看书。', pinyin: '' }] });
    const item = fitItem(w, builtinWords(0), mulberry32(1))!;
    expect(item).toMatchObject({ kind: 'fit', wordId: 'p:1', pair: '安静' });
    expect(item.options).toHaveLength(4);
  });
  it('用对了吗: the right use and the wrong use from the bank', () => {
    expect(usageItem('很', 'b:很')).toEqual({ kind: 'usage', wordId: 'b:很', word: '很', right: '这个苹果很大。', wrong: '我很一个苹果。', pair: undefined });
    expect(usageItem('欺负', null)).toBeNull();
  });
});
```

```ts
// src/practice/choose.test.ts
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { mulberry32 } from '../lib/random';
import { planChoose, type ChooseInput } from './choose';
const words = ['很', '在', '和', '跟', '吃', '喝'].map((t, i) => makeWord(t, { rank: i + 1 }));
const base: ChooseInput = { words, cards: words.map((w) => makeCard(w.id, 'recognise', new Date('2026-10-01'), true)), newWordIds: ['b:吃'], meaningDueIds: ['b:喝'], missedIds: [], knownChars: new Set(words.map((w) => w.text)), rng: mulberry32(1), count: 4 };
describe('planChoose', () => {
  it("today's new words first, then due meaning words, then his other words; fit and usage alternate", () => {
    const items = planChoose(base);
    expect(items.slice(0, 2).map((i) => i.word)).toEqual(['吃', '喝']);
    expect(items.map((i) => i.kind)).toEqual(['fit', 'usage', 'fit', 'usage']);
    expect(new Set(items.map((i) => i.word)).size).toBe(4);
  });
  it('too few words of his own: bank words he can read fill in, unrecorded (wordId null)', () => {
    const items = planChoose({ ...base, words: [], cards: [], newWordIds: [], meaningDueIds: [], knownChars: new Set('今天很热这个苹果大我一在妈家里做饭书包桌子上和'.split('')) });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.wordId === null)).toBe(true);
  });
  it('nothing he can read: no items (the step is skipped)', () => {
    expect(planChoose({ ...base, words: [], cards: [], newWordIds: [], meaningDueIds: [], knownChars: new Set() })).toEqual([]);
  });
});
```

```tsx
// src/activities/choose/ChooseStep.test.tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { ChooseStep } from './ChooseStep';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
const fit = { kind: 'fit' as const, wordId: 'b:很', word: '很', before: '今天', after: '热。', options: ['在', '很', '和', '跟'], clue: '想一想' };
const usage = { kind: 'usage' as const, wordId: 'b:很', word: '很', right: '这个苹果很大。', wrong: '我很一个苹果。', pair: '多' };
describe('ChooseStep', () => {
  it('a fit question: pick the word, Truffle reads the whole sentence, a miss shows the clue', () => {
    const onAnswer = vi.fn();
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '在' }));
    expect(onAnswer).toHaveBeenCalledWith(fit, false, expect.any(Number));
    expect(speak).toHaveBeenLastCalledWith('今天很热。');
    expect(screen.getByText('想一想')).toBeTruthy();
  });
  it('用对了吗: two sentences, the right one wins, and the pairing shows', () => {
    const onAnswer = vi.fn();
    render(<ChooseStep items={[usage]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '这个苹果很大。' }));
    expect(onAnswer).toHaveBeenCalledWith(usage, true, expect.any(Number));
    expect(screen.getByText('很 + 多')).toBeTruthy();
  });
  it('ends after the last item', () => {
    const onDone = vi.fn();
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '很' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalled();
  });
});
```

```ts
// record.test.ts — add
it('recordUse rates the meaning card once a day; a later miss the same day brings it forward instead', async () => {
  const db = await freshDb();
  const now = new Date('2026-10-05T10:00');
  const first = await recordUse(db, 'b:很', true, now);
  const later = await recordUse(db, 'b:很', false, new Date('2026-10-05T10:05'));
  expect(later.fsrs.reps).toBe(first.fsrs.reps); // no second rating
  expect(later.fsrs.due.getTime()).toBeLessThanOrEqual(new Date('2026-10-06T00:00').getTime());
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/practice/useItems.ts
import { pickSoundAlikes, meaningCue } from '../activities/flashcards/meaning';
import { bankFor, fillGap } from '../content/sentenceBank';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export type UseItem =
  | { kind: 'fit'; wordId: string | null; word: string; before: string; after: string; options: string[]; pair?: string; clue?: string }
  | { kind: 'usage'; wordId: string | null; word: string; right: string; wrong: string; pair?: string };

/** Which word fits the sentence (选一选): his class sentence, the bank, or a 组词 word. Needs 3 wrong choices. */
export function fitItem(word: Word, pool: Word[], rng: Rng, variant = 0): UseItem | null {
  const cue = meaningCue(word, variant);
  if (!cue) return null;
  const wrong = cue.wrong ?? pickSoundAlikes(word, cue, pool, rng);
  if (wrong.length < 3) return null;
  return { kind: 'fit', wordId: word.source === 'builtin' || word.source === 'parent' ? word.id : null, word: word.text, before: cue.before, after: cue.after, options: shuffle([word.text, ...wrong.slice(0, 3)], rng), pair: cue.pair ?? word.pairs?.[0], clue: cue.clue };
}

/** 用对了吗: the word used right (the bank's second gap) against its hand-written wrong use. Bank words only. */
export function usageItem(word: string, wordId: string | null): UseItem | null {
  const b = bankFor(word);
  return b ? { kind: 'usage', wordId, word, right: fillGap(b.gaps[1], word), wrong: b.misuse, pair: b.pair } : null;
}
```

A bank word not in his DB is built as `fitItem({ ...makeBankWord(text) })`. The helper in `choose.ts` makes a transient `Word` (`id: ''`, `source: 'builtin'`, `level: null`) and then sets `wordId: null` on the item.

```ts
// src/practice/choose.ts
import { SENTENCE_BANK } from '../content/sentenceBank';
import { shuffle, type Rng } from '../lib/random';
import type { CardRecord, Word } from '../types';
import { fitItem, usageItem, type UseItem } from './useItems';

export interface ChooseInput {
  words: Word[]; cards: CardRecord[]; newWordIds: string[]; meaningDueIds: string[]; missedIds: string[];
  knownChars: ReadonlySet<string>; rng: Rng; count: number;
}

export const chooseCount = (minutes: number) => Math.max(4, Math.round((8 * minutes) / 30));

/** 选一选 items (spec §19 part 3, §20 part 4): his words first (recorded), then bank words he can read (practice only). */
export function planChoose(i: ChooseInput): UseItem[] {
  const byId = new Map(i.words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const started = new Set(i.cards.filter((c) => c.kind === 'recognise').map((c) => c.wordId));
  const lastSeen = new Map(i.cards.map((c) => [c.wordId, c.fsrs.last_review?.getTime() ?? 0]));
  const others = [...started].filter((id) => byId.has(id)).sort((a, b) => (lastSeen.get(b) ?? 0) - (lastSeen.get(a) ?? 0));
  const order = [...new Set([...i.newWordIds, ...i.meaningDueIds, ...i.missedIds, ...others])];
  const pool = [...byId.values()];
  const out: UseItem[] = [];
  const add = (make: (kind: 'fit' | 'usage') => UseItem | null) => {
    const want = out.length % 2 === 0 ? 'fit' : 'usage';
    const item = make(want) ?? make(want === 'fit' ? 'usage' : 'fit');
    if (item) out.push(item);
  };
  for (const id of order) {
    if (out.length >= i.count) break;
    const w = byId.get(id);
    if (w) add((k) => (k === 'fit' ? fitItem(w, pool, i.rng, 1) : usageItem(w.text, w.id)));
  }
  const readable = (s: string) => Array.from(s).every((ch) => !/\p{Script=Han}/u.test(ch) || i.knownChars.has(ch));
  for (const b of shuffle([...SENTENCE_BANK], i.rng)) {
    if (out.length >= i.count) break;
    if ([...byId.values()].some((w) => w.text === b.word) || !readable(b.gaps[0].text + b.gaps[1].text + b.word)) continue;
    const temp: Word = { id: '', text: b.word, pinyin: '', level: null, rank: null, source: 'builtin', writeable: false, paused: false, createdAt: 0 };
    add((k) => { const it = k === 'fit' ? fitItem(temp, pool, i.rng) : usageItem(b.word, null); return it ? { ...it, wordId: null } : null; });
  }
  return out;
}
```

```ts
// record.ts — add
import { endOfLocalDay, localDateKey } from '../lib/date';
const ratedToday = (c: CardRecord | undefined, now: Date) => !!c?.fsrs.last_review && localDateKey(c.fsrs.last_review) === localDateKey(now);

/** Brings a card forward so the next lesson includes it (never pushes it later). */
export async function bringForward(db: AppDb, wordId: string, kind: CardKind, due: Date): Promise<void> {
  const c = await getCard(db, `${wordId}:${kind}`);
  if (c && c.fsrs.due.getTime() > due.getTime()) await putCards(db, [{ ...c, fsrs: { ...c.fsrs, due } }]);
}

/** A word used in context (选一选, 用对了吗, 用一用): the first answer of the day rates its meaning card; a later miss brings it forward. */
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs: 0 }, now);
  if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
  return (await getCard(db, `${wordId}:meaning`))!;
}
```

`UseQuestion.tsx` follows `FlashcardStep`'s phases (quiz → feedback).

**Prompt:**
- **fit:** the `.meaning-cue meaning-cue--sentence` card, with `before`, a blank `？` that becomes the word at feedback, then `after`. Options sit in `.choices.choices--hanzi` buttons. The accessible name is the option text.
- **usage:** two `.usage-opt` buttons, the sentences in random order (seeded by the word). The accessible name is the sentence.

**On answer:** play the sfx as in `FlashcardStep`, `speak(full right sentence)`, then call `onAnswer(correct, responseMs)`.

**Feedback:** a `BottomBar` with `tone` and `title` from `CHEERS`/`COMFORTS`. Its `detail` holds:
- the pairing, as `<span class="pair">{word} + {pair}</span>`;
- on a miss, the right sentence;
- on a miss, the `clue`, when there is one.

The action label is `继续`.

**Pet bubble:** fit → `哪个词对？`; usage → `哪句话用对了？`.

`ChooseStep.tsx` holds `index`. It renders `<UseQuestion key={index} item={items[index]} … onAnswer={(c, ms) => onAnswer(items[index], c, ms)} onNext={…} />`. After the last item, `onDone()`.

CSS:

```css
.usage-opts { display: grid; gap: 12px; width: min(100%, 640px); }
.usage-opt { font-size: clamp(22px, 3.2dvh, 32px); text-align: left; padding: 14px 18px; min-height: var(--tap-main); }
.pair { font-weight: 700; }
```

**Types and wiring:**
- `ActivityKind`, and `StepKind = ActivityKind | 'wrapup'`.
- `DEFAULT_SETTINGS.activities.choose = true`. `getSettings` already merges defaults, so existing installs get it on.
- `STEP_ORDER = ['flashcards', 'choose', 'components', 'writing', 'speaking']` (§20 part 5).
- `ProgressBar.ICONS` / `TodayPath.ICON` gain `choose: 'speech'` and `wrapup: 'star'`; `TodayPath.NAME` gains `choose: '选一选'` and `wrapup: '用一用'`.
- `pathNodes` filters out `'wrapup'`: it is the lesson's close, not a stop on the Home path (keeps 6 nodes on a phone).
- `SettingsPanel.ACTIVITY_LABELS: Record<ActivityKind, string>` gains `choose: 'Words in use (选一选)'`.

**SessionScreen:**
- `Loaded.choose: UseItem[]` is built at load:

  ```ts
  planChoose({
    words: know.words, cards: know.cards,
    newWordIds: rec.plan.newWordIds,
    meaningDueIds: rec.plan.meaningReviewIds ?? [],
    missedIds: missed(rec.recalls),
    knownChars: know.knownChars,
    rng,
    count: chooseCount(settings.sessionMinutes),
  })
  ```

  `missed` = the ids whose recall has `missed: true`.
- An empty list skips the step.
- `onUseAnswer(item, correct)`:
  - if `!rec.free && item.wordId`: `await recordUse(db, item.wordId, correct, now())`;
  - in every case: `commit({ ...rec, recalls: item.wordId ? noteRecall(rec.recalls, item.wordId, correct, true) : rec.recalls })`.
- `ChooseStep`'s `onDone` → `finishTimedStep`.

**Fit sweep:**
- `scripts/fit-check.ts`'s `only()` covers the 5 activity kinds. Add `run('choose', …only('choose'))`.
- In `advance()`, tap `.usage-opt` alongside `.choice`.
- `signature()`'s marks gain `.usage-opts`.
- `fit-profile.ts`'s `activities` type becomes `Partial<Record<ActivityKind, boolean>>`.

- [ ] **Step 4: Run** `npx vitest run`, then `FIT_ONLY='^(choose|home)' npm run fit`. Expected: PASS and 0 problems.
- [ ] **Step 5: Commit.** `git commit -m "feat: 选一选 — which word fits, and which sentence uses it right"`

### Task 9: 用一用 wrap-up before the chest

**Files:**
- Create: `src/session/wrapup.ts`, `src/activities/choose/WrapupStep.tsx`
- Modify: `src/session/plan.ts` (append `'wrapup'`), `src/session/progress.ts`, `src/app/SessionScreen.tsx`, `scripts/fit-check.ts`
- Test: `src/session/wrapup.test.ts`, `src/activities/choose/WrapupStep.test.tsx`, `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `UseItem`, `fitItem` and `usageItem` (Task 8); `Recall` (Task 6); `recordUse` and `bringForward` (Task 8).
- Produces:
  - `wrapupTargets(rec: SessionRecord): string[]`
  - `planWrapup(targets: string[], recalls: Record<string, Recall>, make: (wordId: string, n: number) => UseItem | null, cap = 12): { items: UseItem[]; dropped: string[] }`
  - `WRAPUP_TRIES = 3`
  - `<WrapupStep items kid resting onAnswer(item, correct, tries) onGiveUp(item) onDone />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/session/wrapup.test.ts
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from './runner';
import { planWrapup, wrapupTargets } from './wrapup';
const item = (wordId: string, n: number) => ({ kind: 'usage' as const, wordId, word: wordId, right: `${wordId}${n}`, wrong: 'x' });
describe('用一用 (spec §20 part 7)', () => {
  it("targets: today's new words, then any word missed today", () => {
    const rec = { ...createSessionRecord({ steps: ['flashcards'], reviewWordIds: [], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1, writeCandidates: [], writeCount: 0 }, 'd', 0), recalls: { m: { right: 0, inContext: 0, missed: true }, ok: { right: 2, inContext: 2, missed: false } } };
    expect(wrapupTargets(rec)).toEqual(['n1', 'n2', 'm']);
  });
  it('one item per target, plus one more for a word with no recall in context yet, spaced after the first round', () => {
    const { items } = planWrapup(['a', 'b'], { a: { right: 2, inContext: 0, missed: false }, b: { right: 2, inContext: 1, missed: false } }, item);
    expect(items.map((i) => i.wordId)).toEqual(['a', 'b', 'a']);
  });
  it('a target with no item (no sentence anywhere) is left out', () => {
    expect(planWrapup(['a', 'z'], {}, (id, n) => (id === 'z' ? null : item(id, n))).items.map((i) => i.wordId)).toEqual(['a', 'a']);
  });
  it('stops at 12 items; the words that missed out are reported so their cards come due tomorrow', () => {
    const ids = Array.from({ length: 14 }, (_, i) => `w${i}`);
    const r = planWrapup(ids, {}, item);
    expect(r.items).toHaveLength(12);
    expect(r.dropped).toEqual(['w12', 'w13']);
  });
});
```

```tsx
// src/activities/choose/WrapupStep.test.tsx
it('a missed item returns after the others; after three misses the word closes kindly and the round still ends', () => {
  const a = { kind: 'usage' as const, wordId: 'a', word: '很', right: '这个苹果很大。', wrong: '我很一个苹果。' };
  const b = { ...a, wordId: 'b' };
  const onGiveUp = vi.fn(); const onDone = vi.fn();
  render(<WrapupStep items={[a, b]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onGiveUp={onGiveUp} onDone={onDone} />);
  const wrongThenNext = () => { fireEvent.click(screen.getByRole('button', { name: '我很一个苹果。' })); fireEvent.click(screen.getByText('继续')); };
  wrongThenNext(); // a, try 1
  fireEvent.click(screen.getByRole('button', { name: '这个苹果很大。' })); fireEvent.click(screen.getByText('继续')); // b
  wrongThenNext(); // a, try 2
  fireEvent.click(screen.getByRole('button', { name: '我很一个苹果。' })); // a, try 3
  expect(screen.getByText('明天再来！')).toBeTruthy();
  fireEvent.click(screen.getByText('继续'));
  expect(onGiveUp).toHaveBeenCalledWith(a);
  expect(onDone).toHaveBeenCalled();
});
```

```ts
// plan.test.ts — add
it('用一用 closes the lesson when 认一认 or 选一选 is on; not in free play', () => {
  const p = buildSessionPlan({ cards: [], words: [], settings: DEFAULT_SETTINGS, now: new Date('2026-10-05T09:00') });
  expect(p.steps.at(-1)).toBe('wrapup');
  const off = buildSessionPlan({ cards: [], words: [], settings: { ...DEFAULT_SETTINGS, activities: { ...DEFAULT_SETTINGS.activities, flashcards: false, choose: false } }, now: new Date('2026-10-05T09:00') });
  expect(off.steps).not.toContain('wrapup');
});
it('free play has no wrap-up', () => {
  expect(createFreePlayRecord([], 'd', 0).plan.steps).toEqual(['flashcards']);
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/session/wrapup.ts
import type { UseItem } from '../practice/useItems';
import type { Recall } from './recall';
import type { SessionRecord } from '../types';

export const WRAPUP_TRIES = 3;
export const WRAPUP_CAP = 12;

/** Today's new words, then words missed today (spec §20 part 7). */
export function wrapupTargets(rec: SessionRecord): string[] {
  const missed = Object.entries(rec.recalls ?? {}).filter(([, r]) => r.missed).map(([id]) => id);
  return [...new Set([...rec.plan.newWordIds, ...missed])];
}

/** One item per target (always the last recall), one more for a word with no recall in context yet; capped. */
export function planWrapup(targets: string[], recalls: Record<string, Recall>, make: (wordId: string, n: number) => UseItem | null, cap = WRAPUP_CAP) {
  const firsts: UseItem[] = [];
  const extras: UseItem[] = [];
  for (const id of targets) {
    const first = make(id, 0);
    if (!first) continue;
    firsts.push(first);
    if ((recalls[id]?.inContext ?? 0) + 1 < 2) { const extra = make(id, 1); if (extra) extras.push(extra); }
  }
  const items = [...firsts, ...extras].slice(0, cap);
  const kept = new Set(items.map((i) => i.wordId));
  return { items, dropped: targets.filter((id) => !kept.has(id) && make(id, 0) !== null) };
}
```

**plan.ts:** after `steps`, `if (steps.length && (settings.activities.flashcards || settings.activities.choose)) steps.push('wrapup')`.

**WrapupStep** keeps a `queue` (the items) and `tries: Map<wordId, number>`. On a miss:
- **if the tries are now below 3:** re-append the same item to the end of the queue;
- **otherwise:** set `closing` (the bubble and `BottomBar` title show `明天再来！`), and call `onGiveUp(item)` on 继续.

The bubble opens with `用一用！`. `UseQuestion` is reused, and the step ends when the queue is through.

**SessionScreen:**
- build `wrapup` lazily when the step becomes current:

  ```ts
  planWrapup(
    wrapupTargets(rec),
    rec.recalls ?? {},
    (id, n) => {
      const w = know.wordsById.get(id);
      return !w ? null : n % 2 === 0 ? (usageItem(w.text, w.id) ?? fitItem(w, know.words, rng, 1)) : fitItem(w, know.words, rng, 0);
    },
  )
  ```

  - **Empty:** skip the step.
  - **`dropped`:** `bringForward(db, id, 'meaning', endOfLocalDay(now))` for each.
- `onAnswer`: `recordUse` (non-free) and `noteRecall(…, true)`.
- `onGiveUp`: `bringForward(db, item.wordId, 'meaning', endOfLocalDay(now()))`.
- `onDone` → `finishTimedStep`.

**Free play:** the plan never has `'wrapup'`.

**Fit sweep:** `scripts/fit-check.ts` gains `run('wrapup', AFTERNOON, { activities: { ...only('flashcards'), choose: true } }, …walkLesson)`. Its walk answers the first choice, so it misses and reaches the wrap-up.

- [ ] **Step 4: Run** `npx vitest run`, then `FIT_ONLY='^wrapup' npm run fit`. Expected: PASS and 0 problems.
- [ ] **Step 5: Commit.** `git commit -m "feat: 用一用 — every target word used right before the chest"`

### Task 10: 钓鱼 becomes 字辨

**Files:**
- Create: `src/activities/components/zibian.ts`
- Modify:
  - `src/activities/components/ComponentsStep.tsx`, rewritten as the 字辨 round;
  - `src/activities/components/game.ts`: remove `buildComponentRound` and the question types, and keep any helper other files import (check with `grep -rn "components/game" src`);
  - `src/app/SessionScreen.tsx`, `src/styles.css`.
- Test: `src/activities/components/zibian.test.ts`, `src/activities/components/ComponentsStep.test.tsx` (rewritten); drop the round-builder cases in `game.test.ts`.

**Interfaces:**
- Produces:
  - `lookAlikeChars(ch: string): string[]`
  - `interface ZibianItem { wordId: string; word: string; index: number; answer: string; options: string[] }`
  - `buildZibianRound(i: { words: Word[]; knownChars: ReadonlySet<string>; practised: ReadonlyMap<string, number>; rng: Rng; count: number }): ZibianItem[] | null`
  - `zibianCount(minutes) = minutes < 25 ? 4 : 6`
  - `<ComponentsStep items kid resting onAnswer(item, correct) onDone />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/activities/components/zibian.test.ts
import { describe, expect, it } from 'vitest';
import { HSK_WORDS } from '../../content';
import { makeWord } from '../../test/fixtures';
import { mulberry32 } from '../../lib/random';
import { buildZibianRound, lookAlikeChars } from './zibian';
describe('字辨 (spec §20 part 8)', () => {
  it('look-alikes share the phonetic part first (跟 → 根 很 银), then the radical (容 → 室)', () => {
    expect(lookAlikeChars('跟')).toEqual(expect.arrayContaining(['根', '很', '银']));
    expect(lookAlikeChars('容')).toContain('室');
  });
  it('builds a word with one character missing and 4 look-alike choices, none of which makes another real word there', () => {
    const words = [makeWord('树根', { id: 'p:1', source: 'parent', level: null, listedAt: 1 }), ...'根跟很银恨树爸妈'.split('').map((c) => makeWord(c))];
    const round = buildZibianRound({ words, knownChars: new Set('根跟很银恨树'), practised: new Map(), rng: mulberry32(1), count: 1 })!;
    const it0 = round[0]!;
    expect(it0.word).toBe('树根');
    expect(it0.options).toContain(it0.answer);
    expect(it0.options).toHaveLength(4);
    for (const o of it0.options.filter((o) => o !== it0.answer)) expect(HSK_WORDS.has([...it0.word].map((c, i) => (i === it0.index ? o : c)).join(''))).toBe(false);
  });
  it('a single character practises inside one of its 组词 words', () => {
    const gen = makeWord('跟', { examples: [{ text: '跟着', pinyin: 'gēn zhe' }], listedAt: 1 });
    const round = buildZibianRound({ words: [gen], knownChars: new Set('根跟很银'), practised: new Map(), rng: mulberry32(1), count: 1 })!;
    expect(round[0]).toMatchObject({ word: '跟着', index: 0, answer: '跟' });
  });
  it('fewer than 4 items can be built: no round (the step is skipped)', () => {
    expect(buildZibianRound({ words: [makeWord('一')], knownChars: new Set('一'), practised: new Map(), rng: mulberry32(1), count: 6 })).toBeNull();
  });
});
```

`ComponentsStep.test.tsx` is rewritten:

```tsx
it('fish out the missing character; Truffle reads the word and the radical meaning shows, with the chosen one on a miss', () => {
  const item = { wordId: 'p:1', word: '树根', index: 1, answer: '根', options: ['跟', '根', '很', '银'] };
  const onAnswer = vi.fn();
  render(<ComponentsStep items={[item]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onDone={vi.fn()} />);
  expect(screen.getByText('树')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '跟' }));
  expect(onAnswer).toHaveBeenCalledWith(item, false);
  expect(speak).toHaveBeenLastCalledWith('树根');
  expect(document.querySelector('.bottombar')?.textContent).toMatch(/木/); // 根's radical meaning
  expect(document.querySelector('.bottombar')?.textContent).toMatch(/足/); // the one he chose
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/activities/components/zibian.ts
import { BUILTIN, getCharInfo, HSK_WORDS } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import type { Word } from '../../types';

export interface ZibianItem { wordId: string; word: string; index: number; answer: string; options: string[] }
export const zibianCount = (minutes: number) => (minutes < 25 ? 4 : 6);
const MIN_ITEMS = 4;
const TRIVIAL = new Set(['一', '丨', '丶', '丿', '乙', '亅', '二', '十', '口']);

let index: Map<string, string[]> | null = null;
const strokes = new Map(BUILTIN.map((c) => [c.char, c.strokes]));
const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
function partIndex() {
  if (index) return index;
  index = new Map();
  for (const c of BUILTIN) for (const p of new Set([c.radical, ...c.components])) if (p !== c.char) (index.get(p) ?? index.set(p, []).get(p)!).push(c.char);
  return index;
}

/** Characters a child could put for `ch`: the same phonetic part first (跟 根 很 银), then the same radical with a similar stroke count (容 室). */
export function lookAlikeChars(ch: string): string[] {
  const info = getCharInfo(ch);
  if (!info) return [];
  const idx = partIndex();
  const phonetic = info.components.filter((p) => p !== info.radical && p !== ch && !TRIVIAL.has(p)).flatMap((p) => idx.get(p) ?? []);
  const sameRadical = (idx.get(info.radical) ?? []).filter((c) => Math.abs((strokes.get(c) ?? 0) - (strokes.get(ch) ?? 0)) <= 2);
  return [...new Set([...phonetic, ...sameRadical])].filter((c) => c !== ch);
}

/** 字辨 items from his class-list words and recent words (spec §20 part 8); null when fewer than 4 can be built. */
export function buildZibianRound(i: { words: Word[]; knownChars: ReadonlySet<string>; practised: ReadonlyMap<string, number>; rng: Rng; count: number }): ZibianItem[] | null {
  const recent = (w: Word) => i.practised.get(w.id) ?? (w.listedAt ? w.listedAt : 0);
  const candidates = i.words.filter((w) => !w.paused && (w.listedAt !== undefined || i.practised.has(w.id))).sort((a, b) => recent(b) - recent(a));
  const out: ZibianItem[] = [];
  for (const w of candidates) {
    if (out.length >= i.count) break;
    const word = Array.from(w.text).length > 1 ? w.text : w.examples?.find((e) => Array.from(e.text).length === 2 && e.text.includes(w.text))?.text;
    if (!word) continue;
    const chars = Array.from(word);
    const positions = Array.from(w.text).length > 1 ? chars.map((_, k) => k) : [chars.indexOf(w.text)];
    for (const k of shuffle(positions, i.rng)) {
      const answer = chars[k]!;
      const ok = (o: string) => !HSK_WORDS.has(chars.map((c, j) => (j === k ? o : c)).join(''));
      const alikes = lookAlikeChars(answer).filter(ok);
      const known = alikes.filter((c) => i.knownChars.has(c));
      const near = alikes.filter((c) => !i.knownChars.has(c) && (level.get(c) ?? 7) <= (level.get(answer) ?? 7) + 1);
      const wrong = [...shuffle(known, i.rng), ...shuffle(near, i.rng)].slice(0, 3);
      if (wrong.length < 3) continue;
      out.push({ wordId: w.id, word, index: k, answer, options: shuffle([answer, ...wrong], i.rng) });
      break;
    }
  }
  return out.length >= Math.min(MIN_ITEMS, i.count) ? out : null;
}
```

**`ComponentsStep.tsx`** is rewritten around `items: ZibianItem[]`.
- **Prompt:** the word shown in `.pond-q` as characters, with the missing one as a `.zibian__blank` box (`？`, which becomes the answer at feedback).
- **Choices:** the options are `.fishtile` buttons in `.pond.pond--four` (2×2), each with the accessible name of its character and the fish badge.
- **On tap:**
  - `speak(word)`;
  - `onAnswer(item, correct)`;
  - the feedback `BottomBar` shows the answer's radical, from `getCharInfo(answer).radical` → `radicalMeaning` (icon + zh), as `根：木 树木`;
  - on a miss, it also shows the chosen character with its own radical meaning.
- **Pet bubble:** `钓鱼啦！`.
- `onDone` after the last item.

**SessionScreen:**
- `round = buildZibianRound({ words: know.words, knownChars: know.knownChars, practised, rng, count: zibianCount(settings.sessionMinutes) })`. Load `practised` with `practisedWords(db)` in the existing `Promise.all`.
- `onZibianAnswer(item, correct)`:
  - if `!rec.free && !correct`: `bringForward(db, item.wordId, know.cardsById.has(`${item.wordId}:write`) ? 'write' : 'recognise', now())`;
  - commit `noteRecall(rec.recalls, item.wordId, correct, false)`.

`styles.css` gains `.pond--four { grid-template-columns: repeat(2, 1fr); }` and `.zibian__blank`, styled like `.meaning-cue__blank`.

- [ ] **Step 4: Run** `npx vitest run`, then `FIT_ONLY='^components' npm run fit`. Expected: PASS and 0 problems. If the fit profile's placed characters build fewer than 4 items, give `fit-profile.ts`'s school list two more two-character words (树根, 跟着) so the sweep sees the round.
- [ ] **Step 5: Commit.** `git commit -m "feat: 钓鱼 becomes 字辨 — fish out the right look-alike character"`

### Task 11: The whole lesson on every screen, and the build report

**Files:**
- Modify: `scripts/fit-check.ts` (a full-lesson flow), `docs/superpowers/2026-10-03-truffle-build-report.md`
- Test: the fit sweep

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Add a full-lesson flow.** It walks every step with the default activities: `run('lesson', AFTERNOON, {}, async (p) => { await startLesson(p); await walkLesson(p, size, 'lesson'); })`.
- [ ] **Step 2: Run** `npm run fit`. Expected: "0 with problems" at all six sizes. View the iPhone SE shots of:
  - `choose`, `wrapup` and `components`;
  - a `writing` trace pass;
  - a `flashcards` feedback screen with the usage line.
- [ ] **Step 3: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 4: Write the build report section** "Plan 13 — deeper practice", in the report's existing style: what changed for him, numbers (bank items, tests), rulings, and the parent's to-dos (check the 30-minute pacing on the iPad).
- [ ] **Step 5: Commit.** `git commit -m "test: the full lesson in the fit sweep; plan 13 build report"`
