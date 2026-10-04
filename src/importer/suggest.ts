/**
 * A dictionary word of the same length that differs by exactly one character (告坼 → 告诉).
 * With `alike`, a word whose differing character looks or sounds like the token's comes first (自已 → 自己);
 * `strict` returns only such a word, for tokens made of real characters that might still be misread.
 */
export function suggestFix(token: string, dict: Iterable<string>, alike?: (from: string, to: string) => boolean, strict = false): string | undefined {
  const t = Array.from(token);
  let any: string | undefined;
  for (const w of dict) {
    const c = Array.from(w);
    if (c.length !== t.length) continue;
    const diff = c.flatMap((ch, i) => (ch !== t[i] ? [i] : []));
    if (diff.length !== 1) continue;
    if (!alike) return w;
    if (alike(t[diff[0]!]!, c[diff[0]!]!)) return w;
    any ??= w;
  }
  return strict ? undefined : any;
}
