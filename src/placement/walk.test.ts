import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { classTerm, MAX_QUESTIONS, readsUpTo, startTerm, startWalk, TERMS, walkStep, type WalkState } from './walk';

const N = TERMS.length; // 一上 … 三下
const ans = (correct: boolean, dontKnow = false) => ({ style: 'read' as const, wordId: `x${Math.random()}`, correct, dontKnow });
const run = (s: WalkState, pattern: boolean[]) => pattern.reduce((st, c) => (st.done ? st : walkStep(st, ans(c), N)), s);

describe('placement v2 walk: school terms (spec 2026-10-14)', () => {
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
  it('3 right: up a term; 0–1 right: down a term', () => {
    expect(run(startWalk(2, N), [true, true, true]).term).toBe(3);
    expect(run(startWalk(2, N), [true, false, false]).term).toBe(1);
    expect(run(startWalk(2, N), [false, false, false]).term).toBe(1);
  });
  it('2 right: one more in the same term; 3 of 4 is up, 2 of 4 is down', () => {
    const two = run(startWalk(2, N), [true, true, false]);
    expect([two.term, two.done, two.answers.length]).toEqual([2, false, 3]);
    expect(run(two, [true]).term).toBe(3);
    expect(run(two, [false]).term).toBe(1);
  });
  it('不知道 counts as a miss', () => {
    let s = startWalk(2, N);
    for (const a of [ans(true), ans(true), ans(false, true)]) s = walkStep(s, a, N);
    expect(s.answers.at(-1)!.correct).toBe(false);
    expect(s.term).toBe(2); // 2 of 3: one more
  });
  it('ends at the first term he cannot read, going up: reads up to the term below it', () => {
    let s = run(startWalk(2, N), [true, true, true]); // 二上 passed → 二下
    s = run(s, [false, false, false]); // 二下 failed: the walk turns
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(2);
    expect(s.answers).toHaveLength(6);
  });
  it('ends at the first term he can read, going down: reads up to it', () => {
    let s = run(startWalk(2, N), [false, false, false]); // 二上 failed → 一下
    s = run(s, [true, true, true]); // 一下 passed: the walk turns
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(1);
  });
  it('off the top: reads up to the last term', () => {
    let s = startWalk(4, N);
    s = run(s, [true, true, true, true, true, true]); // 三上, 三下
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBe(N - 1);
  });
  it('off the bottom: none', () => {
    let s = startWalk(1, N);
    s = run(s, [false, false, false, false, false, false]); // 一下, 一上
    expect(s.done).toBe(true);
    expect(readsUpTo(s)).toBeNull();
  });
  it('ends after 15 questions: the highest term passed so far', () => {
    // 一上 to 二下 each passed on 2 + 1 more (4 a term): 16 would be needed for the fourth
    let s = startWalk(0, N);
    const climb = [true, true, false, true];
    for (let i = 0; i < 6 && !s.done; i++) s = run(s, climb);
    expect(s.done).toBe(true);
    expect(s.answers).toHaveLength(MAX_QUESTIONS);
    expect(MAX_QUESTIONS).toBe(15);
    expect(readsUpTo(s)).toBe(2); // 一上, 一下, 二上 passed; 二下 not decided
  });
  it('a finished walk takes no more answers', () => {
    const s = run(startWalk(0, N), [false, false, false]);
    expect(s.done).toBe(true);
    expect(walkStep(s, ans(true), N)).toBe(s);
  });
});
