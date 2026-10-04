/** Pinyin tone helpers (shared by the distractor picker and the trap readings). */
const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};
const UNMARK = new Map<string, [string, number]>(
  Object.entries(MARKS).flatMap(([vowel, marked]) => marked.map((m, i): [string, [string, number]] => [m, [vowel, i + 1]])),
);

export function syllableTone(s: string): { base: string; tone: number } {
  let base = '';
  let tone = 5;
  for (const ch of s) {
    const hit = UNMARK.get(ch);
    if (hit) {
      base += hit[0];
      tone = hit[1];
    } else {
      base += ch;
    }
  }
  return { base, tone };
}

export function toneless(pinyin: string): string {
  return pinyin.trim().toLowerCase().split(/\s+/).map((s) => syllableTone(s).base).join(' ');
}

/** Standard placement: a, else e, else the o of "ou", else the last of i/o/u/ü. */
export function withTone(base: string, tone: number): string {
  if (tone < 1 || tone > 4) return base;
  const idx = base.includes('a')
    ? base.indexOf('a')
    : base.includes('e')
      ? base.indexOf('e')
      : base.includes('ou')
        ? base.indexOf('o')
        : Math.max(...['i', 'o', 'u', 'ü'].map((v) => base.lastIndexOf(v)));
  if (idx < 0) return base;
  return base.slice(0, idx) + MARKS[base[idx]!]![tone - 1] + base.slice(idx + 1);
}
