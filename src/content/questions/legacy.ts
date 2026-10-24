// The two 3-choice questions each built-in passage had before 2026-10-24 (spec 2026-10-15 §6), kept only until its six new
// questions are written (spec 2026-10-24 §5): a passage with no new questions yet is asked these, as a parent text's are. Each
// content task deletes the entries it replaces; the last one deletes this file.
import type { ParentQuestion } from '../../types';

export const LEGACY_QUESTIONS: Readonly<Record<string, readonly ParentQuestion[]>> = {

  // our own 二上 passages (spec 2026-10-15 §2.2, Task 8)
};
