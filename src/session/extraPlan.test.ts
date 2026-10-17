// Extra lessons are review only (learning rules, 2026-10-17; Cepeda et al. 2006): no new words, what is due or due by tomorrow
// (never a card he already answered today), and when nothing is, a short practice-only round of his weakest words.
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord } from '../types';
import { buildSessionPlan, WEAK_ROUND_WORDS } from './plan';
import { practiceWords } from './practice';
import { createSessionRecord } from './runner';

const now = new Date(2026, 9, 2, 17, 0);
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
const reviewed = (c: CardRecord, at: Date): CardRecord => ({ ...c, fsrs: { ...c.fsrs, last_review: at } });

describe('an extra lesson plan', () => {
  it('brings no new words, whatever the pace', () => {
    const plan = buildSessionPlan({ cards: [], words: words(10), settings: DEFAULT_SETTINGS, now, newPerDay: 8, extra: true });
    expect(plan.newWordIds).toEqual([]);
    expect(plan.steps).not.toContain('newwords');
    expect(plan.newMeaningIds).toEqual([]);
  });

  it('reviews what is due today and what is due by tomorrow, not what he answered today or what is further off', () => {
    const cards = [
      makeCard('b:0', 'recognise', new Date(2026, 9, 2, 12)), // due today
      reviewed(makeCard('b:1', 'recognise', new Date(2026, 9, 3, 9)), new Date(2026, 9, 1, 9)), // due tomorrow, last seen yesterday
      reviewed(makeCard('b:2', 'recognise', new Date(2026, 9, 3, 9)), new Date(2026, 9, 2, 9)), // due tomorrow, answered this morning
      reviewed(makeCard('b:3', 'recognise', new Date(2026, 9, 5, 9)), new Date(2026, 9, 1, 9)), // due in three days
    ];
    const plan = buildSessionPlan({ cards, words: words(4), settings: DEFAULT_SETTINGS, now, extra: true });
    expect(plan.reviewWordIds).toEqual(['b:0', 'b:1']);
    expect(plan.weakIds ?? []).toEqual([]);
  });

  it('a daily lesson still waits for tomorrow’s cards', () => {
    const cards = [reviewed(makeCard('b:1', 'recognise', new Date(2026, 9, 3, 9)), new Date(2026, 9, 1, 9))];
    expect(buildSessionPlan({ cards, words: words(2), settings: DEFAULT_SETTINGS, now }).reviewWordIds).toEqual([]);
  });

  it('with nothing due or near due: a short round of his weakest words, practice only', () => {
    const ws = words(12);
    const cards = ws.map((w, i) => {
      const c = reviewed(makeCard(w.id, 'recognise', new Date(2026, 9, 10)), new Date(2026, 9, 1, 9));
      return { ...c, fsrs: { ...c.fsrs, stability: 20 - i } }; // b:11 weakest
    });
    const plan = buildSessionPlan({ cards, words: ws, settings: DEFAULT_SETTINGS, now, extra: true });
    expect(plan.reviewWordIds).toEqual([]);
    expect(plan.weakIds).toHaveLength(WEAK_ROUND_WORDS);
    expect(plan.weakIds![0]).toBe('b:11');
    const rec = createSessionRecord(plan, '2026-10-02', now.getTime());
    const round = practiceWords(rec, new Map());
    expect(round.map((w) => w.wordId)).toEqual(plan.weakIds);
    expect(round.every((w) => !w.gradesRecognise && !w.gradesMeaning && !w.gradesHear && !w.gradesUnderstand && !w.due)).toBe(true);
  });
});
