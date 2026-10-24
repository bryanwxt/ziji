// The built-in passages' questions (spec 2026-10-24 §5): six per passage in the 4-choice shape, at least one of each kind but
// `fact`, at most two `fact`. Written in batches (src/content/questions/*.ts, one file per content task) and merged here by
// passage id; scripts/check-content.ts holds every one to the guess-proof rules.
import type { PassageQuestion } from '../types';
import { Q_P01_P25 } from './questions/q-p01-p25';
import { Q_P26_P50 } from './questions/q-p26-p50';
import { Q_P51_P73 } from './questions/q-p51-p73';
import { Q_GSB } from './questions/q-gsb';
import { Q_P74_P88 } from './questions/q-p74-p88';
import { Q_P89_P100 } from './questions/q-p89-p100';
import { Q_P101_P113 } from './questions/q-p101-p113';
import { Q_P114_P123 } from './questions/q-p114-p123';
import { Q_P124_P133 } from './questions/q-p124-p133';

export type QuestionBatch = Readonly<Record<string, readonly PassageQuestion[]>>;

/** One entry per content task's file, in task order. */
export const QUESTION_BATCHES: readonly QuestionBatch[] = [Q_P01_P25, Q_P26_P50, Q_P51_P73, Q_GSB, Q_P74_P88, Q_P89_P100, Q_P101_P113, Q_P114_P123, Q_P124_P133];

export const PASSAGE_QUESTIONS: QuestionBatch = Object.assign({}, ...QUESTION_BATCHES);
