// Today's new words in two lanes (spec 2026-10-11 §5): his class's lesson, and catch-up from 一上.
import { isLadderId } from '../content/ladder';
import { lessonLabel, taughtAt } from '../content/curriculum';
import type { Word } from '../types';

export type Lane = 'school' | 'catchup';

/** A word's lesson in his book: a character's first 识读 lesson; a ladder 词语's latest among its characters; else none. */
export function bookLesson(w: Pick<Word, 'id' | 'text'>): number | undefined {
  const chars = Array.from(w.text);
  if (chars.length === 1) return taughtAt(chars[0]!);
  if (!isLadderId(w.id)) return undefined;
  const at = chars.map(taughtAt);
  return at.every((x): x is number => x !== undefined) ? Math.max(...at) : undefined;
}

/** The 认新字 card's small label (spec §9): 「课本 二下·17」 for his class's lesson, 「补 一上·5」 for catch-up; none without a lane. */
export function laneTag(lane: Lane | undefined, w: Pick<Word, 'id' | 'text'>): string | null {
  const at = lane ? bookLesson(w) : undefined;
  return lane && at !== undefined ? `${lane === 'school' ? '课本' : '补'} ${lessonLabel(at)}` : null;
}

/**
 * Up to n new words from `candidates` (unstarted, in newWordOrder): listed words first; then half of what is left (rounded up)
 * from his class's lesson and the one before it, the rest from the earliest lessons; a lane that runs short gives its share to
 * the other; then lessons past his class, then words outside the book. Within a lane its characters come before its 词语. A
 * ladder 词语 only once its characters are begun or come earlier today. Without a class lesson, only catch-up runs. Returned in
 * candidate order (a 词语 after its characters).
 */
export function pickNewWords({ candidates, n, classAt, begunChars }: {
  candidates: Word[]; n: number; classAt: number | null; begunChars: ReadonlySet<string>;
}): { words: Word[]; lanes: Record<string, Lane> } {
  const begun = new Set(begunChars);
  const taken = new Set<string>();
  const lanes: Record<string, Lane> = {};
  const take = (pool: Word[], max: number, lane?: Lane): number => {
    let got = 0;
    for (const w of pool) {
      if (got >= max || taken.size >= n) break;
      if (taken.has(w.id) || (isLadderId(w.id) && !Array.from(w.text).every((c) => begun.has(c)))) continue;
      taken.add(w.id);
      got += 1;
      if (lane) lanes[w.id] = lane;
      if (Array.from(w.text).length === 1) begun.add(w.text);
    }
    return got;
  };
  // within a lane, its characters first; its 词语 fill what is left (final review I1: else unlocked 词语 of the lesson before
  // crowd out his class's characters, and early 词语 crowd out early gaps)
  const takeLane = (pool: Word[], max: number, lane: Lane): number => {
    const got = take(pool.filter((w) => Array.from(w.text).length === 1), max, lane);
    return got + take(pool, max - got, lane);
  };
  take(candidates.filter((w) => w.listedAt !== undefined), n);
  const rest = candidates.filter((w) => w.listedAt === undefined);
  const at = new Map(rest.map((w) => [w.id, bookLesson(w)]));
  const lessonOf = (w: Word) => at.get(w.id);
  const book = rest.filter((w) => lessonOf(w) !== undefined);
  const school = classAt === null ? [] : book.filter((w) => lessonOf(w) === classAt || lessonOf(w) === classAt - 1);
  const catchup = classAt === null ? book : book.filter((w) => lessonOf(w)! < classAt - 1);
  const ahead = classAt === null ? [] : book.filter((w) => lessonOf(w)! > classAt);
  const left = n - taken.size;
  const fromSchool = takeLane(school, Math.ceil(left / 2), 'school');
  takeLane(catchup, left - fromSchool, 'catchup');
  takeLane(school, n, 'school'); // catch-up ran short: his class's lesson takes the rest
  takeLane(ahead, n, 'catchup'); // everything up to his class is started: the book onward
  take(rest.filter((w) => lessonOf(w) === undefined), n); // then words outside the book, in their order
  return { words: candidates.filter((w) => taken.has(w.id)), lanes };
}
