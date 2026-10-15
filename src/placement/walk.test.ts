import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { classTerm, MAX_QUESTIONS, PER_TERM, readsUpTo, startTerm, startWalk, TERMS, walkStep, type WalkState } from './walk';

const N = TERMS.length; // 一上 … 三下
const ans = (correct: boolean, dontKnow = false) => ({ style: 'read' as const, wordId: `x${Math.random()}`, correct, dontKnow });
const run = (s: WalkState, pattern: boolean[]) => pattern.reduce((st, c) => (st.done ? st : walkStep(st, ans(c), N)), s);

describe('placement v2.1 walk: school terms (spec 2026-10-14)', () => {
  it('steps are the six 欢乐伙伴 terms in order', () => {
    expect(TERMS).toEqual(['一上', '一下', '二上', '二下', '三上', '三下']);
  });
  it('starts one term below his class term, clamped to 一上', () => {
    expect(startTerm(3)).toBe(2); // class in 二下: starts at 二上
    expect(startTerm(0)).toBe(0); // class in 一上: starts at 一上
    expect(startTerm(null)).toBe(0); // no class term known: 一上
  });
  it("his class term comes from his class lesson today: a P2 child in October 2026 is in 二下", () => {
    expect(TERMS[classTerm(new Date(2026, 9, 14), { ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 })!]).toBe('二下');
    expect(TERMS[classTerm(new Date(2026, 1, 14), { ...DEFAULT_SETTINGS, grade: 1, gradeYear: 2026 })!]).toBe('一上');
  });
  it('4 of 4 right: up a term; 2 or fewer right: down a term', () => {
    expect(PER_TERM).toBe(4);
    expect(run(startWalk(2, N), [true, true, true, true]).term).toBe(3);
    expect(run(startWalk(2, N), [true, true, false, false]).term).toBe(1);
    expect(run(startWalk(2, N), [true, false, false, false]).term).toBe(1);
    expect(run(startWalk(2, N), [false, false, false, false]).term).toBe(1);
  });
  it('3 of 4: a fifth question in the same term decides (4 of 5 up, 3 of 5 down)', () => {
    const three = run(startWalk(2, N), [true, false, true, true]);
    expect([three.term, three.done, three.answers.length]).toEqual([2, false, 4]);
    expect(run(three, [true]).term).toBe(3);
    expect(run(three, [false]).term).toBe(1);
  });
  it('不知道 counts as a miss', () => {
    let s = startWalk(2, N);
    for (const a of [ans(true), ans(true), ans(true), ans(false, true)]) s = walkStep(s, a, N);
    expect(s.answers.at(-1)!.correct).toBe(false);
    expect(s.term).toBe(2); // 3 of 4: a fifth
  });
  it('ends at the first term he cannot read, going up: reads up to the term below it', () => {
    let s = run(startWalk(2, N), [true, true, true, true]); // 二上 passed → 二下
    s = run(s, [false, false, false, false]); // 二下 failed: the walk turns
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(2);
    expect(s.answers).toHaveLength(8);
  });
  it('ends at the first term he can read, going down: reads up to it', () => {
    let s = run(startWalk(2, N), [false, false, false, false]); // 二上 failed → 一下
    s = run(s, [true, true, true, true]); // 一下 passed: the walk turns
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(1);
  });
  it('off the top: reads up to the last term', () => {
    const s = run(startWalk(4, N), Array(8).fill(true)); // 三上, 三下
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(N - 1);
  });
  it('off the bottom: none', () => {
    const s = run(startWalk(1, N), Array(8).fill(false)); // 一下, 一上
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBeNull();
  });
  it('ends after 20 questions: the highest term passed so far', () => {
    // 一上 to 二下 each passed on 3 of 4 and a fifth (5 a term): the 20th answer passes 二下, and the walk stops there
    expect(MAX_QUESTIONS).toBe(20);
    const climb = [true, true, false, true, true];
    let s = startWalk(0, N);
    for (let i = 0; i < 6 && !s.done; i++) s = run(s, climb);
    expect(s.done).toBe(true);
    expect(s.answers).toHaveLength(MAX_QUESTIONS);
    expect(readsUpTo(s)).toBe(3); // 一上, 一下, 二上, 二下 passed on the 20th
  });
  it('a finished walk takes no more answers', () => {
    const s = run(startWalk(0, N), [false, false, false, false]);
    expect(s.done).toBe(true);
    expect(walkStep(s, ans(true), N)).toBe(s);
  });
});
