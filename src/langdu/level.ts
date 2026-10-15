// Levelling 朗读's passages (spec 2026-10-15 §3): how much of a passage he can read. Names (transliterated, always shown with
// pinyin) are left out of every count.
import { hanChars } from '../content';

/** The text without its names: they never count for or against a reader. */
export const stripNames = (text: string, names: readonly string[] = []): string => names.reduce((t, n) => t.split(n).join(''), text);

/** The share of the passage's Han characters (tokens, names left out) in `readable`; 0 for a passage with none. */
export function passageFit(text: string, readable: ReadonlySet<string>, names: readonly string[] = []): number {
  const han = hanChars(stripNames(text, names));
  return han.length ? han.filter((c) => readable.has(c)).length / han.length : 0;
}
