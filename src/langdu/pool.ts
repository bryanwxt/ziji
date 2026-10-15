// 朗读's pool (spec 2026-10-15 §3–§4): his school texts first, in the order added, then the built-in passages, each with how much
// of it he can read now (fit) and its meaning question. pickPassage (pick.ts) chooses from it.
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import type { ParentPassage, Passage, PassageQuestion } from '../types';
import { passageFit } from './level';
import type { Candidate } from './pick';

export interface ReadingPassage extends Candidate {
  title: string;
  text: string;
  question?: PassageQuestion;
}

/** What the 朗读 step itself needs of a passage (where it came from and its fit are the picker's). */
export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story'>;

/** Who is reading: the characters he can read (K, spec §3) and his class's term (null: unknown). */
export interface Reader { readable: ReadonlySet<string>; classTerm: string | null }

export function readingPool(parent: ParentPassage[], builtins: Passage[], reader: Reader, questions: Readonly<Record<string, PassageQuestion>> = PASSAGE_QUESTIONS): ReadingPassage[] {
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'parent', fit: passageFit(p.text, reader.readable), ...(p.question ? { question: p.question } : {}) })),
    ...builtins.map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'ziji', fit: passageFit(p.text, reader.readable), ...(questions[p.id] ? { question: questions[p.id] } : {}) })),
  ];
}
