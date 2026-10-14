import { MOE_TERMS } from '../content';
import { classLessonAt, gradeTerms, LESSONS, schoolYear } from '../content/curriculum';
import type { Settings } from '../types';

/**
 * The placement check (spec 2026-10-14): a short walk over his school terms in 欢乐伙伴 order, 3 quick questions a term
 * (one more on a 2 of 3), up on a pass and down on a miss, ending at the first turn, off either end, or after 15 questions.
 */
export const TERMS: readonly string[] = MOE_TERMS;
export const PER_TERM = 3;
export const MAX_QUESTIONS = 15;

export type Style = 'read' | 'hear'; // 读一读: the character → its pinyin; 听一听: hear a word → pick its meaning

/** wordId: what was asked (a 词语 to hear, or a character); charId: the term character it used; dontKnow: he tapped 不知道 (a miss). */
export interface WalkAnswer { term: number; style: Style; wordId: string; charId?: string; correct: boolean; dontKnow?: boolean }

export interface WalkState {
  term: number; // the term being asked (an index in TERMS)
  visit: WalkAnswer[]; // this term's answers so far
  answers: WalkAnswer[]; // every answer
  passed: number[]; // terms he passed
  direction: -1 | 0 | 1; // the last move
  done: boolean;
}

/**
 * His class term today (an index in TERMS): the term of his class lesson (classLessonAt), else the first term of his school
 * year; past 三下, the last term. Null if neither is known.
 */
export function classTerm(now: Date, settings: Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>): number | null {
  const at = classLessonAt(now, settings);
  const term = at !== null ? LESSONS[at]!.term : gradeTerms(schoolYear(settings, now))[0];
  const i = TERMS.indexOf(term);
  return i >= 0 ? i : schoolYear(settings, now) > 3 ? TERMS.length - 1 : null;
}

/** Where the walk starts: one term below his class term, clamped to 一上; 一上 when his class term isn't known. */
export const startTerm = (classTerm: number | null): number => (classTerm === null ? 0 : Math.max(0, classTerm - 1));

export const startWalk = (term: number, termCount: number): WalkState => ({
  term: Math.max(0, Math.min(term, termCount - 1)), visit: [], answers: [], passed: [], direction: 0, done: termCount === 0,
});

/** One answer. 3 right: up; 0–1: down; 2: one more (3 of 4 up, 2 of 4 down). Ends at a turn, off either end, or after 15. */
export function walkStep(s: WalkState, a: Omit<WalkAnswer, 'term'>, termCount: number): WalkState {
  if (s.done) return s;
  const answer: WalkAnswer = { ...a, correct: a.correct && !a.dontKnow, term: s.term };
  const visit = [...s.visit, answer];
  const answers = [...s.answers, answer];
  const right = visit.filter((x) => x.correct).length;
  const decided = visit.length > PER_TERM || (visit.length === PER_TERM && right !== 2);
  if (!decided) return { ...s, visit, answers, done: answers.length >= MAX_QUESTIONS };
  const move: -1 | 1 = right >= PER_TERM ? 1 : -1;
  const passed = move === 1 ? [...s.passed, s.term] : s.passed;
  const turned = s.direction !== 0 && move !== s.direction;
  const term = s.term + move;
  const done = turned || term < 0 || term >= termCount || answers.length >= MAX_QUESTIONS;
  return { term: Math.max(0, Math.min(termCount - 1, term)), visit: [], answers, passed, direction: move, done };
}

/** The result: the highest term he passed, or null for none. */
export const readsUpTo = (s: Pick<WalkState, 'passed'>): number | null => (s.passed.length ? Math.max(...s.passed) : null);
