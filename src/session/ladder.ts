/** The context ladder (spec 2026-10-05 §3.2): 字, 词语, 句子, 组句, 成语. */
export type Rung = 1 | 2 | 3 | 4 | 5;
export const TOP_RUNG: Rung = 5;

/** After an answer at `rung`: a right one raises his best to it; a miss puts the next start one rung below it. */
export function nextRung(best: number, rung: Rung, correct: boolean): number {
  return correct ? Math.max(best, rung) : Math.min(best, rung - 1);
}

/** Where a revision word starts: the rung after his best (a word never answered right starts at 字), at most the top. */
export function startRung(best: number): Rung {
  return Math.min(TOP_RUNG, Math.max(1, best + 1)) as Rung;
}
