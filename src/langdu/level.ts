// Levelling 朗读's passages (spec 2026-10-15 §3): how much of a passage he can read. Names (transliterated, always shown with
// pinyin) are left out of every count.
import { hanChars, MOE_TERMS } from '../content';
import { LESSONS } from '../content/curriculum';

/** The text without its names: they never count for or against a reader. */
export const stripNames = (text: string, names: readonly string[] = []): string => names.reduce((t, n) => t.split(n).join(''), text);

/** The share of the passage's Han characters (tokens, names left out) in `readable`; 0 for a passage with none. */
export function passageFit(text: string, readable: ReadonlySet<string>, names: readonly string[] = []): number {
  const han = hanChars(stripNames(text, names));
  return han.length ? han.filter((c) => readable.has(c)).length / han.length : 0;
}

/** A passage's term is the earliest whose cumulative 识读字 cover this share of its characters (spec 2026-10-15 §2.1 counts and the band floor: 90%). */
export const TERM_BAR = 0.9;
const CUMULATIVE: ReadonlySet<string>[] = MOE_TERMS.map((t) => new Set(LESSONS.filter((l) => MOE_TERMS.indexOf(l.term) <= MOE_TERMS.indexOf(t)).flatMap((l) => Array.from(l.read))));

/** A term's place in his book's order (一上 = 0); −1 for an unknown term. */
export const termIndex = (term: string): number => MOE_TERMS.indexOf(term);

/** The earliest term by whose end ≥ 90% of the passage's characters (names left out) are on his book's 识读字 lists; null past 三下. */
export function passageTerm(text: string, names: readonly string[] = []): string | null {
  const i = CUMULATIVE.findIndex((set) => passageFit(text, set, names) >= TERM_BAR);
  return i < 0 ? null : MOE_TERMS[i]!;
}
