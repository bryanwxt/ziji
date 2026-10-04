/** The 田字格 size: as big as the stage card allows under the cue (spec 2026-10-04 §3), between 200 and 400px. */
export function writingBoxFor(card: { width: number; height: number }, aboveBox: number): number {
  const fit = Math.min(400, card.width - 32, card.height - aboveBox - 32);
  return Math.max(200, Math.round(fit));
}
