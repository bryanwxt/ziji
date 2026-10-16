// The miss sheet names what he picked in English (parent 2026-10-16: "when a wrong answer is given sometimes the English
// meaning is not shown beside the wrong words"). A sweep over the real content: for every 练一练 question the app can build
// for every word, every wrong choice gets English on the sheet wherever one exists or can be made. Gaps are listed by type.
// The content the questions draw on, whole; missNote.slow.test.ts builds every word's listen, read, meaning and 组词 questions.
import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, schoolTerm } from '../content';
import { CHENGYU } from '../content/chengyu';
import { DAPEI } from '../content/dapei';
import { glossProblems, kidGloss } from '../content/kidGloss';
import { ladderWords } from '../content/ladder';
import { SENTENCE_BANK } from '../content/sentenceBank';
import { CHOICE_GLOSS } from '../content/choiceGloss';
import { lookAlikeChars } from '../activities/components/zibian';
import { mulberry32 } from '../lib/random';
import type { Word } from '../types';
import { familyDistractors } from './family';
import { NONE_OF_THESE } from './noneOfThese';
import { nearWords, NEAR_MAX_HSK, zuciBoard } from './pairs';
import { choiceGloss, shortGloss, cuePickNote, meaningPickNote, NONE_PICKED_EN, pickedNote, pinyinPickNote } from './missNote';

const school = builtinWords(0).filter((w) => schoolTerm(w.text));
const words: Word[] = [...school, ...ladderWords()];
const pool = words;
const known = new Set(school.map((w) => w.text));
const rngFor = (w: Word) => mulberry32(w.text.codePointAt(0)! * 31 + Array.from(w.text).length);

/** Gaps by the choice that has none, each with the word whose question offered it. */
function sweep(each: (add: (choice: string, word: string) => void) => void): string[] {
  const gaps = new Map<string, string>();
  each((choice, word) => { if (!gaps.has(choice)) gaps.set(choice, word); });
  return [...gaps].map(([c, w]) => `${c} (${w})`);
}
const english = (picked: string) => pickedNote(picked, pool)?.en;

describe('every wrong pick has English on the miss sheet (the content each question draws on)', () => {
  it('选一选 from the sentence bank: every hand-picked wrong choice', () => {
    expect(sweep((add) => { for (const b of SENTENCE_BANK) for (const g of b.gaps) for (const c of g.wrong) if (!english(c)) add(c, b.word); })).toEqual([]);
  });

  it('搭配 match: every partner, right and wrong', () => {
    expect(sweep((add) => { for (const d of DAPEI) for (const c of [d.noun, ...d.wrong]) if (!english(c)) add(c, d.verb); })).toEqual([]);
  });

  it('成语 gap and 成语 fit: every character a gap offers and every 成语', () => {
    expect(sweep((add) => {
      for (const c of CHENGYU) {
        if (!english(c.text)) add(c.text, c.text);
        for (const ch of Array.from(c.text)) if (!english(ch)) add(ch, c.text);
      }
    })).toEqual([]);
  });

  it('钓鱼 components: every look-alike of every character', () => {
    expect(sweep((add) => { for (const c of BUILTIN) for (const x of lookAlikeChars(c.char)) if (!english(x)) add(x, c.char); })).toEqual([]);
  });

  it('连一连 pair game: every 组词 a board can hold (the sheet lists them all)', () => {
    expect(sweep((add) => {
      for (const t of nearWords(NEAR_MAX_HSK)) if (!choiceGloss(t)) add(t, 'near');
      for (const w of school) {
        const b = zuciBoard(w, rngFor(w), known);
        for (const [l, r] of b?.pairs ?? []) if (!choiceGloss(l + r)) add(l + r, w.text);
      }
    })).toEqual([]);
  });

  it('找一家人 family: every look-alike word comes with English', () => {
    expect(sweep((add) => { for (const w of school.slice(0, 300)) for (const d of familyDistractors(w.text, known)) if (!d.en) add(d.text, w.text); })).toEqual([]);
  });
});

describe('the shared lookup for a picked choice', () => {
  it('a word, a character, a 成语', () => {
    expect(pickedNote('跟')).toMatchObject({ zh: '跟', en: expect.any(String) });
    expect(pickedNote('五颜六色')!.en).toBeTruthy();
  });
  it('a bound character shows its pair, the character marked, with the pair\'s English (番 → 番茄 tomato)', () => {
    expect(pickedNote('番')).toEqual({ zh: '番茄', py: 'fān qié', en: kidGloss('番茄'), mark: [0, 1] });
  });
  it('都不对 picked wrongly says plainly that the answer was there', () => {
    expect(pickedNote(NONE_OF_THESE)).toEqual({ zh: NONE_OF_THESE, en: NONE_PICKED_EN });
  });
  it('a made-up 组词 is never glossed; its picked character is', () => {
    const cue = { kind: 'word' as const, source: 'word' as const, full: '树根', pinyin: 'shù gēn', before: '树', after: '' };
    expect(cuePickNote(cue, '跟')).toMatchObject({ zh: '跟', en: expect.any(String) });
    expect(pickedNote('树跟')).toBeNull();
  });
  it('a pinyin choice from a part of the character names that part (静 → 青 qīng)', () => {
    const jing = builtinWords(0).find((w) => w.text === '静')!;
    expect(pinyinPickNote(jing, 'qīng', pool)).toMatchObject({ zh: '青', py: 'qīng' });
  });
  it('a pinyin choice that is only a slip of his own word (a tone) names nothing', () => {
    const da = builtinWords(0).find((w) => w.text === '大')!;
    expect(pinyinPickNote(da, 'dǎ', [da])).toBeNull();
  });
  it('an English choice names the word it is the meaning of', () => {
    const note = meaningPickNote(kidGloss('门')!, words.find((w) => w.text === '大')!, pool);
    expect(note).toMatchObject({ zh: '门', en: kidGloss('门') });
  });
  it('a parent word in the pool gives its own meaning', () => {
    const own: Word = { id: 'p:1', text: '欺负欺负', pinyin: 'qī fu qī fu', meaning: 'tease', level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: 0 };
    expect(pickedNote('欺负欺负', [own])).toMatchObject({ en: 'tease' });
  });
});

describe('the hand-written glosses for choices (CHOICE_GLOSS)', () => {
  it('are kid glosses: four words at most, no jargon, no Chinese, one sense', () => {
    const bad = Object.entries(CHOICE_GLOSS).flatMap(([t, g]) => glossProblems(g).map((p) => `${t} "${g}": ${p}`));
    expect(bad).toEqual([]);
  });
});

describe('the sheet\'s English is short (parent 2026-10-16: 扬 showed "to raise; to hoist")', () => {
  it('the dictionary cut to its first sense and first comma part, with no leading "to"', () => {
    expect(shortGloss('to raise; to hoist')).toBe('raise');
    expect(shortGloss('experience; to go through')).toBe('experience');
    expect(shortGloss('to teach (at a school, college), to train')).toBe('teach (at a school, college)');
    expect(shortGloss('to')).toBe('to');
  });
  it('a kid gloss or one written for a decoy wins over the dictionary; the dictionary only cut short', () => {
    expect(choiceGloss('扬')).toBe('raise');
    expect(choiceGloss('鱼')).toBe(kidGloss('鱼'));
    expect(choiceGloss('对不起')).toBe(kidGloss('对不起') ?? CHOICE_GLOSS['对不起']);
    for (const w of school.slice(0, 400)) {
      const g = choiceGloss(w.text);
      if (g && !kidGloss(w.text) && !CHOICE_GLOSS[w.text]) expect(g, w.text).not.toMatch(/;/);
    }
  });
});
