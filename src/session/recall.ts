/** Today's recalls of one word across the lesson's steps (spec §20 part 7). In context: 选一选, 用对了吗, or a meaning question with a sentence. */
export interface Recall { right: number; inContext: number; missed: boolean }

export function noteRecall(recalls: Record<string, Recall> | undefined, wordId: string, correct: boolean, inContext: boolean): Record<string, Recall> {
  const r = recalls?.[wordId] ?? { right: 0, inContext: 0, missed: false };
  return { ...recalls, [wordId]: correct ? { ...r, right: r.right + 1, inContext: r.inContext + (inContext ? 1 : 0) } : { ...r, missed: true } };
}
