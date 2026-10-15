// @vitest-environment node
// Kid glosses (parent 2026-10-15): 吗 showed "question particle for yes-no questions", 个 "an individual".
import { describe, expect, it } from 'vitest';
import { alike, meaningChoices } from '../activities/flashcards/distractors';
import { canAskRung, isOwned, nextRung, type RungKind } from '../ladder/rungs';
import { mulberry32 } from '../lib/random';
import { askable } from '../session/practice';
import type { Word } from '../types';
import { cardMeaning, dictionaryMeaning, glossFor, questionMeaning } from './glossary';
import { NO_ENGLISH, noEnglishQuestion } from './grammarWords';
import { builtinWords } from './index';
import { glossProblems, kidGloss, kidGlossReading } from './kidGloss';
import { kidGlossScope } from './kidGlossScope';
import { ladderWords } from './ladder';
import { freshDb, makeCard } from '../test/fixtures';
import { allCards, putCards, putWords } from '../store/repo';
import { openMissingRungs } from '../session/record';

const scope = kidGlossScope();
const content: Word[] = [...builtinWords(0), ...ladderWords()];
const byText = new Map(content.map((w) => [w.text, w]));
/** Every word an English-meaning question can ask or offer: his school characters and ladder 词语 that take one. */
const askableWords = content.filter((w) => !!questionMeaning(w));

describe('kid glosses (parent 2026-10-15)', () => {
  it('every school character, ladder 词语 and shown 组词 has one, written for the reading his lessons use', () => {
    const gaps = scope.filter((w) => !kidGloss(w.text)).map((w) => `${w.text} ${w.reading}`);
    expect(gaps).toEqual([]);
    const wrongReading = scope.filter((w) => kidGlossReading(w.text) !== w.reading).map((w) => `${w.text}: ${kidGlossReading(w.text)} ≠ ${w.reading}`);
    expect(wrongReading).toEqual([]);
  });

  it('every askable word has one, and only words with one are askable', () => {
    expect(askableWords.filter((w) => !kidGloss(w.text)).map((w) => w.text)).toEqual([]);
    expect(askableWords.length).toBeGreaterThan(2900);
  });

  it('at most four everyday words, no dictionary jargon, no Chinese, one sense', () => {
    const bad = scope.flatMap((w) => glossProblems(kidGloss(w.text) ?? '').map((p) => `${w.text} "${kidGloss(w.text)}": ${p}`));
    expect(bad).toEqual([]);
    expect(glossProblems('question particle for yes-no questions')).toEqual(expect.arrayContaining(['5 words (at most 4)', 'jargon "particle"']));
    for (const g of ['classifier for animals', 'CL:个', 'to do sth', 'variant of 他', 'surname Li', 'used in 尾巴', '(literary) river', 'abbr. for', 'pr. le', 'archaic sense', 'measure word'])
      expect(glossProblems(g), g).not.toEqual([]);
  });

  it("the parent's examples read as a child would say them", () => {
    expect(kidGloss('河水')).toBe('river water');
    expect(kidGloss('上网')).toBe('go online');
    expect(kidGloss('高兴')).toBe('happy');
    expect(kidGloss('爪')).toBe('claw');
    expect(kidGloss('只')).toBe('one (for animals)');
  });

  it('one gloss everywhere: the card, the answer sheet, the 组词 rows and the collection read the kid gloss', () => {
    const he = byText.get('河')!;
    expect(cardMeaning(he)).toBe('river');
    expect(glossFor('河水')).toBe('river water');
    expect(questionMeaning(he)).toBe('river');
    // the dictionary's English stays as the parent's detail
    expect(dictionaryMeaning(byText.get('个')!)).toMatch(/measure word/);
    // beyond his school lists: the dictionary's English is shown, and no English question is asked
    const beyond = builtinWords(0).find((w) => !kidGloss(w.text) && dictionaryMeaning(w))!;
    expect(cardMeaning(beyond)).toBe(dictionaryMeaning(beyond));
    expect(questionMeaning(beyond)).toBeUndefined();
  });

  it('no English question shows two choices that look the same (the alike rule over every sense)', () => {
    const bad: string[] = [];
    let none = 0;
    for (const w of askableWords) {
      for (const seed of [1, 2]) {
        const c = meaningChoices(w, content, mulberry32(seed + w.text.codePointAt(0)!));
        if (!c) { none++; continue; }
        expect(c).toContain(questionMeaning(w));
        for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if (alike(c[i]!, c[j]!)) bad.push(`${w.text}: "${c[i]}" ~ "${c[j]}"`);
      }
    }
    expect(bad).toEqual([]);
    expect(none).toBe(0); // every askable word finds three wrong choices, so a Hear card never waits on a question it can't ask
  });

  it('alike reads every comma sense of a kid gloss', () => {
    expect(alike('like, happy', 'happy, joyful')).toBe(true);
    expect(alike('they', 'they (things, animals)')).toBe(true);
    expect(alike('one (for animals)', 'one (for flat things)')).toBe(true);
    expect(alike('road, way', 'street, road')).toBe(true);
    expect(alike('river', 'tree')).toBe(false);
    expect(alike('mum', 'mother')).toBe(true); // words a child takes for the same meaning
    expect(alike('look, watch', 'see, meet')).toBe(true);
  });
});

describe('grammar words leave English questions (parent 2026-10-15)', () => {
  const grammar = [...NO_ENGLISH].map((t) => byText.get(t)).filter((w): w is Word => !!w);

  it("the parent's list is on it, and its school words are in his content", () => {
    for (const t of '了吗呢吧的得着啊呀个们把被所而之') expect(noEnglishQuestion(t), t).toBe(true);
    // 地 "ground" and 过 "go past" take English questions: a meaning he can picture (parent 2026-10-15)
    for (const [t, en] of [['地', 'ground, land'], ['过', 'go past']]) {
      expect(noEnglishQuestion(t), t).toBe(false);
      expect(questionMeaning(byText.get(t)!), t).toBe(en);
      expect(canAskRung(byText.get(t)!, 'hear'), t).toBe(true);
    }
    expect(grammar.length).toBeGreaterThan(30);
  });

  it('never asked: no English question, no Hear rung, no hear or 这个词是什么意思 item', () => {
    for (const w of grammar) {
      expect(questionMeaning(w), w.text).toBeUndefined();
      expect(meaningChoices(w, content, mulberry32(1)), w.text).toBeNull();
      expect(canAskRung(w, 'hear'), w.text).toBe(false);
      const can = askable(w, content, true);
      expect(can('hear'), w.text).toBe(false);
      expect(can('meaningRead'), w.text).toBe(false);
    }
  });

  it('never a wrong choice: a pool of only grammar words gives no question', () => {
    const target = byText.get('河')!;
    expect(meaningChoices(target, [target, ...grammar], mulberry32(1))).toBeNull();
    // and in the real pool, no choice of any question is a grammar word's gloss
    const grammarGlosses = new Set(grammar.map((w) => kidGloss(w.text)));
    const offered = askableWords.slice(0, 400).flatMap((w) => meaningChoices(w, content, mulberry32(7)) ?? []);
    expect(offered.filter((o) => grammarGlosses.has(o) && !askableWords.some((w) => questionMeaning(w) === o))).toEqual([]);
  });

  it('still on the card: each has a short note a child can read', () => {
    const school = new Set(scope.map((w) => w.text));
    for (const w of grammar.filter((x) => school.has(x.text))) expect(cardMeaning(w), w.text).toBe(kidGloss(w.text));
    expect(cardMeaning(byText.get('吗')!)).toBe('asks a question');
  });

  it('the ladder still passes them: Hear is skipped, Read opens, and owning one never waits on Hear', () => {
    for (const w of grammar) {
      expect(canAskRung(w, 'read'), w.text).toBe(true);
      const after = nextRung(w, 'hear'); // a Hear card made before this change: passing it opens the next askable rung
      expect(after === null || after !== 'hear').toBe(true);
      const passed = new Set<RungKind>((['understand', 'read', 'use'] as RungKind[]).filter((r) => canAskRung(w, r)));
      expect(isOwned(w, passed), w.text).toBe(true);
    }
    // a character is read aloud (pinyin) in practice, so his round always has a question for it
    for (const w of grammar.filter((x) => Array.from(x.text).length === 1)) expect(askable(w, content, true)('read'), w.text).toBe(true);
  });

  it('a Hear card he already has for one never strands it: the next plan opens its next rung', async () => {
    const db = await freshDb();
    const ma = byText.get('吗')!;
    await putWords(db, [ma]);
    await putCards(db, [makeCard(ma.id, 'hear', new Date('2026-10-10'))]); // begun before 吗 left English questions, never passed
    await openMissingRungs(db, new Date('2026-10-15T09:00:00'));
    const kinds = (await allCards(db)).filter((c) => c.wordId === ma.id).map((c) => c.kind);
    expect(kinds.some((k) => k === 'understand' || k === 'recognise')).toBe(true);
  });
});
