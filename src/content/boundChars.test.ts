// @vitest-environment node
// Bound characters (parent 2026-10-15): a character he meets only inside a word (番 in 番茄) is taught and asked through it.
import { describe, expect, it } from 'vitest';
import { loneSpoken } from '../audio/speech';
import { firstSense, meaningChoices } from '../activities/flashcards/distractors';
import { mulberry32 } from '../lib/random';
import { buildQuestion } from '../placement/questions';
import type { Word } from '../types';
import { questionMeaning } from './glossary';
import { builtinWords, schoolTerm } from './index';
import { askedAs, boundChars, boundPair, isBound, kidGloss, kidGlossReading, kidGlossTexts } from './kidGloss';
import { boundProblems } from './kidGlossScope';
import { ladderWords } from './ladder';
import { sameReading } from './wordGate';

const content: Word[] = [...builtinWords(0), ...ladderWords()];
const card = new Map(builtinWords(0).filter((w) => schoolTerm(w.text)).map((w) => [w.text, w]));
const rows = new Map(kidGlossTexts().map((t) => [t, [kidGlossReading(t)!, kidGloss(t)!] as const]));
const bound = boundChars();

describe('bound characters (parent 2026-10-15)', () => {
  it("the parent's examples are bound to the word their gloss comes from", () => {
    const want: Record<string, string> = { 番: '番茄', 司: '司机', 志: '杂志', 案: '答案', 巴: '巴士', 负: '欺负', 欺: '欺负', 刹: '一刹那', 啡: '咖啡', 狸: '狐狸' };
    for (const [ch, pair] of Object.entries(want)) expect(boundPair(ch), ch).toBe(pair);
    expect(kidGloss('番')).toBe('tomato');
    // characters a child uses alone are not bound, however bound they are for an adult
    for (const ch of '口们人水大好吃河') expect(isBound(ch), ch).toBe(false);
    expect(bound.length).toBeGreaterThan(100);
  });

  it('every bound pair exists, contains its character, and reads it the way its card does', () => {
    const bad = bound.flatMap((ch) => {
      const pair = boundPair(ch)!;
      const out = boundProblems(ch, pair, rows).map((p) => `${ch} → ${pair}: ${p}`);
      const w = card.get(ch);
      if (!w) return [...out, `${ch} is not a school character`];
      const syl = kidGlossReading(pair)!.split(' ')[Array.from(pair).indexOf(ch)]!;
      if (!sameReading(ch, syl, w.pinyin)) out.push(`${ch}: ${syl} in ${pair}, its card reads ${w.pinyin}`);
      return out;
    });
    expect(bad).toEqual([]);
    // a pair that doesn't contain its character, or reads it another way, is caught
    expect(boundProblems('番', '茄子', rows)).not.toEqual([]);
    expect(boundProblems('长', '长大', new Map([['长', ['cháng', 'long']], ['长大', ['zhǎng dà', 'grow up']]]))).toEqual(expect.arrayContaining([expect.stringMatching(/card reads cháng/)]));
  });

  it("an English question about a bound character asks its pair's meaning about its pair", () => {
    for (const ch of bound) {
      const w = card.get(ch)!;
      const pair = boundPair(ch)!;
      expect(askedAs(ch), ch).toBe(pair);
      expect(questionMeaning(w), ch).toBe(kidGloss(pair));
      const choices = meaningChoices(w, content, mulberry32(ch.codePointAt(0)!));
      expect(choices, ch).toContain(firstSense(kidGloss(pair)!));
    }
  });

  it('a lone bound character is never heard on its own: Truffle says its pair, unless the pair is an answer on the board', () => {
    for (const ch of bound) {
      const w = card.get(ch)!;
      const pair = boundPair(ch)!;
      expect(loneSpoken(ch, w.pinyin), ch).toBe(pair);
      expect(loneSpoken(ch), ch).toBe(pair); // the speak buttons say it with no reading
      // 连一连 / 找一家人: the pair is on the board, so it is said alone (or as another word of it)
      expect(loneSpoken(ch, w.pinyin, [pair]), ch).not.toBe(pair);
    }
    expect(loneSpoken('番', 'fān', ['番茄'])).toBe('番');
    expect(loneSpoken('番', 'fān', [], ['茄'])).toBe('番'); // 茄 is a tile it could join
    expect(loneSpoken('番', 'fàn')).toBe('番'); // another reading: not the pair's sense
    // 听写 says the character between its word: "番，番茄的，番" stays as it is
    expect(loneSpoken('番，番茄的，番', 'fān')).toBe('番，番茄的，番');
  });

  it("placement's 听一听 says a bound character as its pair and never offers the pair's other character (v2.1)", () => {
    for (const ch of bound) {
      const w = card.get(ch)!;
      const q = buildQuestion('listen', w, content, mulberry32(3));
      if (q?.style !== 'listen') continue; // no three look-alikes: it is asked as 读一读
      expect(loneSpoken(q.text, q.reading), ch).toBe(boundPair(ch)); // what PlacementScreen says
      for (const o of q.options) if (o !== ch) expect(boundPair(ch)!.includes(o), `${ch} ${o}`).toBe(false);
    }
  });
});
