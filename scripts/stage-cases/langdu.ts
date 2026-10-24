// 朗读's stage-case picks (spec 2026-10-24 §9), shared by the case page (page.tsx) and its checks (stage-cases.ts) so both
// always mean the same passage and question.
import { PASSAGES } from '../../src/content';
import { PASSAGE_QUESTIONS } from '../../src/content/passageQuestions';
import { questionSet } from '../../src/langdu/questions';
import type { AskedQuestion, Passage } from '../../src/types';

const han = (s: string) => Array.from(s).filter((c) => /\p{Script=Han}/u.test(c)).length;

/** The longest of our passages: a stretch passage of up to 140 characters once they are written. */
export const LONGEST_OWN: Passage = [...PASSAGES.filter((p) => p.source === 'ziji')].sort((a, b) => han(b.text) - han(a.text) || a.id.localeCompare(b.id))[0]!;
export const longestOwnChars = (): number => han(LONGEST_OWN.text);

/** A built-in passage's six questions. */
export const questionsOf = (id: string): readonly AskedQuestion[] => PASSAGE_QUESTIONS[id] ?? [];

/** What a first read of it asks, in the order asked. */
export function askedOf(id: string): AskedQuestion[] {
  const qs = questionsOf(id);
  return questionSet(qs, undefined, 0).map((i) => qs[i]!);
}
