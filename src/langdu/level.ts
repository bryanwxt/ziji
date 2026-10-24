// Levelling 朗读's passages (spec 2026-10-15 §3): how much of a passage he can read. Names (transliterated, always shown with
// pinyin) are left out of every count.
import { hanChars, MOE_TERMS } from '../content';
import { classLessonAt, LESSONS, listedBy } from '../content/curriculum';
import type { Settings } from '../types';
import type { Reader } from './pool';

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

/** What a reader who has finished `term` reads: his book's 识读字 through it (spec 2026-10-24 §4: a passage's fit at its own
 *  term); an empty set for an unknown term. */
export const termReadable = (term: string): ReadonlySet<string> => CUMULATIVE[MOE_TERMS.indexOf(term)] ?? new Set();

/** A term's place in his book's order (一上 = 0); −1 for an unknown term. */
export const termIndex = (term: string): number => MOE_TERMS.indexOf(term);

/** The earliest term by whose end ≥ 90% of the passage's characters (names left out) are on his book's 识读字 lists; null past 三下. */
export function passageTerm(text: string, names: readonly string[] = []): string | null {
  const i = CUMULATIVE.findIndex((set) => passageFit(text, set, names) >= TERM_BAR);
  return i < 0 ? null : MOE_TERMS[i]!;
}

/**
 * Who is reading (spec 2026-10-15 §3): K is the characters he reads in the app and the 识读字 of every lesson of his book up to
 * his class's (he meets those at school); his class's term limits the pool to two terms ahead at most (spec 2026-10-24 §3).
 */
export function readerAt(known: ReadonlySet<string>, now: Date, settings: Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>): Reader {
  const at = classLessonAt(now, settings);
  if (at === null) return { readable: known, classTerm: null };
  return { readable: new Set([...known, ...listedBy(at, 'both').read]), classTerm: LESSONS[at]!.term };
}

/** Built-in passages reach this many terms past his class's (spec 2026-10-24 §3). */
export const REACH_TERMS = 2;
/** In the pool at all: a passage's term at most two past his class's; any term when his class is unknown. */
export const withinReach = (term: string, classTerm: string | null): boolean => classTerm === null || termIndex(term) <= termIndex(classTerm) + REACH_TERMS;
