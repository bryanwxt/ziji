// The built-in passages' questions (spec 2026-10-24 §5): six per passage in the 4-choice shape, at least one of each kind but
// `fact`, at most two `fact`. Written in batches (src/content/questions/*.ts, one file per content task) and merged here by
// passage id; scripts/check-content.ts holds every one to the guess-proof rules. Until a passage's six are written it keeps
// its two older questions (LEGACY_QUESTIONS), asked as a parent text's are.
import type { PassageQuestion } from '../types';
import { LEGACY_QUESTIONS } from './questions/legacy';
import { Q_P01_P25 } from './questions/q-p01-p25';

export type QuestionBatch = Readonly<Record<string, readonly PassageQuestion[]>>;

/** One entry per content task's file, in task order. */
export const QUESTION_BATCHES: readonly QuestionBatch[] = [Q_P01_P25];

export const PASSAGE_QUESTIONS: QuestionBatch = Object.assign({}, ...QUESTION_BATCHES);

export { LEGACY_QUESTIONS };
