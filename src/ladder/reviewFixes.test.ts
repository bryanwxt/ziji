// The final review's findings (2026-10-06), each pinned before its fix.
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { allCards, getCard, logsSince, putCards, putWords } from '../store/repo';
import { beginNewWord, openMissingRungs } from '../session/record';
import { buildSessionPlan } from '../session/plan';
import { buildRound } from '../session/round';
import { practiceWords } from '../session/practice';
import { createSessionRecord } from '../session/runner';
import { meaningChoices } from '../activities/flashcards/distractors';
import { mulberry32 } from '../lib/random';
import { DEFAULT_SETTINGS } from '../types';
import { ladderWords, ladderWordsBesides } from '../content/ladder';
import { summarize, wordOf } from '../stats/stats';
import { queueHearChecks } from './migrate';
import { canAskRung, nextRung, RUNG_CARD } from './rungs';

const now = new Date('2026-10-06T09:00:00');
const right = { correct: true, responseMs: 2500 };
const parentWord = makeWord('欺负', { id: 'p:1', source: 'parent', rank: null, meaning: undefined, listedAt: 1 }); // a school list word: no English

describe('C1: every word introduced is begun, whatever he could be asked', () => {
  it('a word with no English starts on its Read rung', async () => {
    const db = await freshDb();
    await putWords(db, [parentWord]);
    expect(canAskRung(parentWord, 'hear')).toBe(false);
    await beginNewWord(db, parentWord, 'read', right, now);
    expect(await getCard(db, 'p:1:recognise')).toBeDefined();
  });
  it('with no voice, a word that can be heard gets its hear card (ungraded, due tomorrow)', async () => {
    const db = await freshDb();
    const w = makeWord('门', { pinyin: 'mén' });
    await putWords(db, [w]);
    await beginNewWord(db, w, 'read', right, now);
    const hear = await getCard(db, 'b:门:hear');
    expect(hear?.fsrs.due.getTime()).toBe(new Date('2026-10-07T00:00:00').getTime());
    expect(await logsSince(db, 0)).toEqual([]);
    expect(await getCard(db, 'b:门:recognise')).toBeUndefined();
  });
  it('heard: graded on its hear card', async () => {
    const db = await freshDb();
    const w = makeWord('门', { pinyin: 'mén' });
    await putWords(db, [w]);
    await beginNewWord(db, w, 'hear', right, now);
    expect((await logsSince(db, 0)).map((l) => l.kind)).toEqual(['hear']);
  });
});

describe('I1: hear checks only for words that can be heard', () => {
  it('a due hear card for a word with no English is not reviewed', () => {
    const plan = buildSessionPlan({ cards: [makeCard('p:1', 'hear', new Date('2026-10-01'))], words: [parentWord], settings: DEFAULT_SETTINGS, now });
    expect(plan.hearReviewIds).toEqual([]);
  });
  it('migration and placement queue no hear check for it', async () => {
    const db = await freshDb();
    await putWords(db, [parentWord]);
    await putCards(db, [makeCard('p:1', 'recognise', now, true)]);
    expect(await queueHearChecks(db, now)).toBe(0);
  });
});

describe('I2: a due Read card is graded by reading, never by ear', () => {
  it('its first appearance is never a listening question', () => {
    for (let s = 1; s < 60; s++) {
      const items = buildRound([{ wordId: 'b:门', isNew: false, from: 1, appearances: 1, gradesRecognise: true, gradesMeaning: false, due: true }], () => true, mulberry32(s));
      expect(items[0]!.grades).toBe('recognise');
      expect(items[0]!.ask).not.toBe('hear');
    }
  });
});

describe('I3: a new word never grades its Use card on day one', () => {
  it("words from today's 认新字 grade no meaning card", () => {
    const rec = { ...createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: ['b:门'], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-06', 0), flashIndex: 1 };
    expect(practiceWords(rec, new Map()).find((w) => w.wordId === 'b:门')?.gradesMeaning).toBe(false);
  });
});

describe('I4: never two right answers', () => {
  const w = (text: string, meaning: string) => makeWord(text, { meaning, source: 'parent' });
  it('"to teach" and "to teach (at a school)", "guide" and "to guide", "cost" and "to cost" are the same answer', () => {
    for (const [a, b] of [['to teach', 'to teach (at a school)'], ['to guide', 'guide'], ['cost', 'to cost'], ['body', 'the body']]) {
      const target = w('甲', a!);
      const pool = [target, w('乙', b!), w('丙', 'water'), w('丁', 'fire'), w('戊', 'tree'), w('己', 'door')];
      for (let s = 1; s < 15; s++) expect(meaningChoices(target, pool, mulberry32(s))!, `${a} / ${b}`).not.toContain(b);
    }
  });
});

describe('I5: a passed rung always has its next rung open', () => {
  it('a passed hear card with no reading card gets one', async () => {
    const db = await freshDb();
    const w = makeWord('门', { pinyin: 'mén' });
    await putWords(db, [w]);
    await putCards(db, [{ ...makeCard('b:门', 'hear', now), passed: 1 }]);
    expect(await openMissingRungs(db, now)).toBe(1);
    expect(await getCard(db, `b:门:${RUNG_CARD[nextRung(w, 'hear')!]}`)).toBeDefined(); // Understand once 门 has sentences (plan 2b)
    expect(await openMissingRungs(db, now)).toBe(0);
  });
});

describe('I7: one word, one ladder', () => {
  it('a ladder 词语 he also has in a list is left to the list', () => {
    const lw = ladderWords()[0]!;
    const mine = makeWord(lw.text, { id: 'p:9', source: 'parent' });
    expect(ladderWordsBesides([mine]).some((w) => w.text === lw.text)).toBe(false);
    expect(ladderWordsBesides([]).some((w) => w.text === lw.text)).toBe(true);
  });
});

describe('I8: the parent sees a ladder word by its text', () => {
  it('wordOf finds stored and ladder words', () => {
    const lw = ladderWords()[0]!;
    const know = summarize([makeWord('门')], []);
    expect(wordOf(know, lw.id)?.text).toBe(lw.text);
    expect(wordOf(know, 'b:门')?.text).toBe('门');
  });
});
