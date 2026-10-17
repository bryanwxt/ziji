// Today's new words in two lanes (spec 2026-10-11 §5): his class's lesson, and catch-up from 一上.
import { isLadderId } from '../content/ladder';
import { lessonLabel, taughtAt } from '../content/curriculum';
import type { Word } from '../types';

export type Lane = 'school' | 'catchup' | 'list';

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
  if (lane === 'list') return '本周';
  const at = lane ? bookLesson(w) : undefined;
  return lane && at !== undefined ? `${lane === 'school' ? '课本' : '补'} ${lessonLabel(at)}` : null;
}

/**
 * Up to n new words from `candidates` (unstarted, in newWordOrder): a weekly list's words first (up to `listQuota`, in
 * `listIds` order); then listed words; then half of what is left (rounded up)
 * from his class's lesson and the one before it, the rest from the earliest lessons; a lane that runs short gives its share to
 * the other; then lessons past his class, then words outside the book. Within a lane its characters come before its 词语. A
 * ladder 词语 only once its characters are begun or come earlier today (a list's 词语 skips this gate). `schoolFirst`: in a list
 * week, at least that many from his class's lane (a list word of his class counts). Without a class lesson, only catch-up runs.
 * Returned with the list's words first, then in candidate order (a 词语 after its characters).
 */
export function pickNewWords({ candidates, n, classAt, begunChars, listIds = [], listQuota = 0, schoolFirst = 0 }: {
  candidates: Word[]; n: number; classAt: number | null; begunChars: ReadonlySet<string>;
  listIds?: readonly string[]; listQuota?: number; schoolFirst?: number;
}): { words: Word[]; lanes: Record<string, Lane>; listTaken: string[] } {
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
  // a weekly list's words first (weekly list spec §5): up to its quota, a ladder 词语 without the begun-characters gate (the parent
  // wants 街道 this week); one in his class's window counts for his class too (§5.3)
  const listTaken: string[] = [];
  const byId = new Map(candidates.map((w) => [w.id, w]));
  let listForSchool = 0;
  for (const id of listIds) {
    if (listTaken.length >= listQuota || taken.size >= n) break;
    const w = byId.get(id);
    if (!w || taken.has(id)) continue;
    taken.add(id);
    listTaken.push(id);
    const at = bookLesson(w);
    const school = classAt !== null && (at === classAt || at === classAt - 1);
    lanes[id] = school ? 'school' : 'list';
    if (school) listForSchool += 1;
    if (Array.from(w.text).length === 1) begun.add(w.text);
  }
  const listSet = new Set(listIds);
  take(candidates.filter((w) => w.listedAt !== undefined && !listSet.has(w.id)), n);
  const rest = candidates.filter((w) => w.listedAt === undefined && !listSet.has(w.id));
  const at = new Map(rest.map((w) => [w.id, bookLesson(w)]));
  const lessonOf = (w: Word) => at.get(w.id);
  const book = rest.filter((w) => lessonOf(w) !== undefined);
  const school = classAt === null ? [] : book.filter((w) => lessonOf(w) === classAt || lessonOf(w) === classAt - 1);
  const catchup = classAt === null ? book : book.filter((w) => lessonOf(w)! < classAt - 1);
  const ahead = classAt === null ? [] : book.filter((w) => lessonOf(w)! > classAt);
  const left = n - taken.size;
  // in a list week his class lane goes first until it has caught up (weekly list spec §5.3); a list word of his class counts
  const fromSchool = takeLane(school, Math.max(schoolFirst - listForSchool, Math.ceil(left / 2)), 'school');
  takeLane(catchup, left - fromSchool, 'catchup');
  takeLane(school, n, 'school'); // catch-up ran short: his class's lesson takes the rest
  takeLane(ahead, n, 'catchup'); // everything up to his class is started: the book onward
  take(rest.filter((w) => lessonOf(w) === undefined), n); // then words outside the book, in their order
  // 认新字 opens with the list (weekly list spec §5.1), then the rest in candidate order
  const listFirst = new Set(listTaken);
  return { words: [...listTaken.map((id) => byId.get(id)!), ...candidates.filter((w) => taken.has(w.id) && !listFirst.has(w.id))], lanes, listTaken };
}
