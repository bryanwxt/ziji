// Which passage 朗读 reads (spec 2026-10-15 §4, 2026-10-24 §3, §6): an unread school text first; then a new passage — the next
// part of a story he has started, else the new passage nearest 0.88 of his reading, ZiJi and Global Storybooks taking turns,
// else an unread easy one — except that a due passage he read 'not-well' comes first, taking turns with new ones; then any other
// due revisit; then a resting one nearest its due day; retired ones last. Nothing under 0.85 unless it is his school text.
// 下一篇 takes the next in the same order.
import type { ReadingHistory } from '../types';
import { afterSkip, entryOf, inGap, isRetired, overdue } from './history';

/** The stretch band (spec 2026-10-24 §3): 85–92% of a passage readable, aiming at 88%; above it "easy", below it never offered. */
export const BAND_LOW = 0.85;
export const BAND_HIGH = 0.92;
export const BAND_AIM = 0.88;

export type PassageSource = 'parent' | 'ziji' | 'gsb';
export interface StoryPart { id: string; part: number; parts: number }
/** A passage as the picker sees it: where it is from, how much of it he reads (fit), and its place in a story. */
export interface Candidate { id: string; source: PassageSource; fit: number; story?: StoryPart }

export const inBand = (fit: number): boolean => fit >= BAND_LOW && fit <= BAND_HIGH;
/** A parent text always; anything else in band or easy. */
const readable = (c: Candidate): boolean => c.source === 'parent' || c.fit >= BAND_LOW;

/** Every passage he may read today, best first (下一篇 takes the next). */
export function pickOrder<T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T[] {
  const e = (c: T) => entryOf(r, c.id);
  const parts = new Map(pool.filter((c) => c.story).map((c) => [`${c.story!.id}#${c.story!.part}`, c]));
  const inOrder = (c: T) => {
    if (!c.story || c.story.part === 1) return true;
    const prev = parts.get(`${c.story.id}#${c.story.part - 1}`);
    return !!prev && e(prev).reads > 0;
  };
  const near = (c: T) => Math.abs(c.fit - BAND_AIM);
  const open = pool.filter((c) => !inGap(e(c), today) && inOrder(c));
  const unread = open.filter((c) => e(c).reads === 0);
  const parentNew = unread.filter((c) => c.source === 'parent');
  const due = open
    .filter((c) => (overdue(e(c), today) ?? -1) >= 0 && readable(c))
    .sort((a, b) => overdue(e(b), today)! - overdue(e(a), today)! || a.id.localeCompare(b.id));
  // a due passage he read 'not-well' comes before anything new; the others wait behind new ones (spec 2026-10-24 §6). A history
  // from before 2026-10-24 has no lastHow: it waits like one read well
  const struggled = due.filter((c) => c.source === 'parent' || e(c).lastHow === 'not-well'); // a due school text alternates too
  const started = unread.filter((c) => c.source !== 'parent' && !!c.story && c.story.part > 1 && c.fit >= BAND_LOW);
  const readFrom = (s: Candidate['source']) => pool.filter((c) => c.source === s && e(c).reads > 0).length;
  const turn: Candidate['source'] = readFrom('gsb') < readFrom('ziji') ? 'gsb' : 'ziji';
  const band = unread
    .filter((c) => c.source !== 'parent' && inBand(c.fit))
    .sort((a, b) => Number(b.source === turn) - Number(a.source === turn) || near(a) - near(b) || a.id.localeCompare(b.id));
  // nothing new in band: an unread easy passage is still new — it takes the new turn before anything read comes back early
  // (final review: ordering by fit alone recycled a dozen early-read passages while 47 unread ones waited)
  const easy = unread.filter((c) => c.source !== 'parent' && c.fit > BAND_HIGH).sort((a, b) => near(a) - near(b) || a.id.localeCompare(b.id));
  const fresh = [...started, ...band, ...easy];
  // then what he has read and is resting, nearest its due day first
  const rest = open
    .filter((c) => !isRetired(e(c)) && readable(c))
    .sort((a, b) => (overdue(e(b), today) ?? 0) - (overdue(e(a), today) ?? 0) || near(a) - near(b) || a.id.localeCompare(b.id));
  const retired = open
    .filter((c) => isRetired(e(c)) && readable(c))
    .sort((a, b) => (e(a).lastRead ?? '').localeCompare(e(b).lastRead ?? '') || a.id.localeCompare(b.id));
  // new and a 'not-well' revisit take turns (lastKind); every other due revisit comes after the new ones
  return [...new Set([...parentNew, ...(r.lastKind === 'revisit' ? [...fresh, ...struggled] : [...struggled, ...fresh]), ...due, ...rest, ...retired])];
}

export const pickPassage = <T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T | null => pickOrder(r, pool, today)[0] ?? null;

/** 下一篇 swaps at most this many times a step (D5). */
export const MAX_SWAPS = 2;

/** 下一篇's next passage: the order again with this one skipped today; null when no swap is allowed (2 a step, never his school
 *  text) or nothing else is there (spec 2026-10-15 §5). */
export function swapTarget<T extends Candidate>(r: ReadingHistory, pool: readonly T[], current: Candidate, today: string, swaps: number): T | null {
  if (swaps >= MAX_SWAPS || current.source === 'parent') return null;
  return pickPassage(afterSkip(r, current.id, today), pool, today);
}
