/** Side of the 田字格 writing box: as big as fits beside the cue, Truffle and 继续 without the page scrolling (spec §18). */
export function writingBoxSize(width: number, height: number, sentenceCue = false): number {
  const landscape = width > height && height >= 600;
  const cueLines = sentenceCue && !landscape ? 48 : 0; // a sentence cue wraps to two more lines above the box in portrait
  const fit = landscape ? Math.min(400, height - 240, width / 2 - 64) : Math.min(320, width - 48, height - 360 - cueLines);
  return Math.max(220, Math.round(fit));
}
