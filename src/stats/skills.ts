import type { AnswerLog, CardKind, ReviewLog, Skill } from '../types';

export const SKILLS: Skill[] = ['reading', 'meaning', 'use', 'zibian', 'writing'];

/** The card a skill's practice lives on: "practise more" brings it forward. */
export const SKILL_CARD: Record<Skill, CardKind> = { reading: 'recognise', meaning: 'meaning', use: 'meaning', zibian: 'write', writing: 'write' };

const LOG_SKILL: Record<CardKind, Skill> = { recognise: 'reading', meaning: 'meaning', write: 'writing' };

/** Each answer as (skill, word, right?): review logs for reading, meaning and writing; the answer log for 选一选/用一用 and 字辨. */
function outcomes(logs: ReviewLog[], answers: AnswerLog[]): { skill: Skill; wordId: string; correct: boolean }[] {
  return [
    ...logs.map((l) => ({ skill: LOG_SKILL[l.kind], wordId: l.wordId, correct: l.correct })),
    ...answers.map((a) => ({ skill: a.skill, wordId: a.wordId, correct: a.correct })),
  ];
}

/** Right answers and all answers per skill (spec §19 part 7). */
export function skillAccuracy(logs: ReviewLog[], answers: AnswerLog[]): Record<Skill, { right: number; total: number }> {
  const out = Object.fromEntries(SKILLS.map((s) => [s, { right: 0, total: 0 }])) as Record<Skill, { right: number; total: number }>;
  for (const o of outcomes(logs, answers)) {
    out[o.skill].total++;
    if (o.correct) out[o.skill].right++;
  }
  return out;
}

/** The words missed most often in one skill, worst first. */
export function topMissed(logs: ReviewLog[], answers: AnswerLog[], skill: Skill, limit = 5): { wordId: string; misses: number }[] {
  const misses = new Map<string, number>();
  for (const o of outcomes(logs, answers)) if (o.skill === skill && !o.correct) misses.set(o.wordId, (misses.get(o.wordId) ?? 0) + 1);
  return [...misses].map(([wordId, n]) => ({ wordId, misses: n })).sort((a, b) => b.misses - a.misses).slice(0, limit);
}
