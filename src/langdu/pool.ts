// 朗读's pool (spec 2026-10-15 §3–§4): his school texts first, in the order added, then the built-in passages, each with how much
// of it he can read now (fit) and its meaning questions. pickPassage (pick.ts) chooses from it; withQuestion (questions.ts) gives
// the chosen one this read's question.
import { LEGACY_QUESTIONS, PASSAGE_QUESTIONS } from '../content/passageQuestions';
import type { AskedQuestion, ParentPassage, Passage, PassageQuestion, ParentQuestion } from '../types';
import { passageFit, withinReach } from './level';
import type { Candidate } from './pick';

export interface ReadingPassage extends Candidate, Pick<Passage, 'names' | 'words' | 'image' | 'credit'> {
  title: string;
  text: string;
  term?: string; // a built-in's (a parent text has none)
  questions?: readonly AskedQuestion[]; // a built-in's six (or its legacy two), a parent text's one
  question?: AskedQuestion; // this read's (withQuestion)
}

/** What the 朗读 step itself needs of a passage (where it came from and its fit are the picker's). */
export type LangduPassage = Omit<ReadingPassage, 'fit' | 'source' | 'story' | 'questions'>;

/** Who is reading: the characters he can read (K, spec §3) and his class's term (null: unknown). */
export interface Reader { readable: ReadonlySet<string>; classTerm: string | null }

export function readingPool(
  parent: ParentPassage[],
  builtins: Passage[],
  reader: Reader,
  questions: Readonly<Record<string, readonly PassageQuestion[]>> = PASSAGE_QUESTIONS,
  legacy: Readonly<Record<string, readonly ParentQuestion[]>> = LEGACY_QUESTIONS,
): ReadingPassage[] {
  const own = (id: string): readonly AskedQuestion[] | undefined => (questions[id]?.length ? questions[id] : legacy[id]?.length ? legacy[id] : undefined);
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p): ReadingPassage => ({ id: p.id, title: p.title, text: p.text, source: 'parent', fit: passageFit(p.text, reader.readable), ...(p.question ? { questions: [p.question] } : {}) })),
    ...builtins
      .filter((p) => withinReach(p.term, reader.classTerm))
      .map((p): ReadingPassage => {
        const { id, title, text, term, source, names, words, image, story, credit } = p;
        return { id, title, text, term, source, fit: passageFit(text, reader.readable, names), ...(names ? { names } : {}), ...(words ? { words } : {}), ...(image ? { image } : {}), ...(story ? { story } : {}), ...(credit ? { credit } : {}), ...(own(id) ? { questions: own(id) } : {}) };
      }),
  ];
}
