// Which passage 朗读 reads (spec 2026-10-15 §4): an unread school text first; then new and revisit in turn — the next part of a
// story he has started, else the new passage nearest 0.93 of his reading, ZiJi and Global Storybooks taking turns; then any due
// revisit; anything he can read outside the 3-day gap; retired ones last. 下一篇 takes the next in the same order.
import type { ReadingHistory } from '../types';
import { entryOf, inGap, isRetired, overdue } from './history';

export const BAND_LOW = 0.9;
export const BAND_HIGH = 0.97;
export const BAND_AIM = 0.93;

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
    .filter((c) => (overdue(e(c), today) ?? -1) >= 0)
    .sort((a, b) => overdue(e(b), today)! - overdue(e(a), today)! || a.id.localeCompare(b.id));
  const started = unread.filter((c) => c.source !== 'parent' && !!c.story && c.story.part > 1 && c.fit >= BAND_LOW);
  const readFrom = (s: Candidate['source']) => pool.filter((c) => c.source === s && e(c).reads > 0).length;
  const turn: Candidate['source'] = readFrom('gsb') < readFrom('ziji') ? 'gsb' : 'ziji';
  const band = unread
    .filter((c) => c.source !== 'parent' && inBand(c.fit))
    .sort((a, b) => Number(b.source === turn) - Number(a.source === turn) || near(a) - near(b) || a.id.localeCompare(b.id));
  const fresh = [...started, ...band];
  const rest = open.filter((c) => !isRetired(e(c)) && readable(c)).sort((a, b) => near(a) - near(b) || a.id.localeCompare(b.id));
  const retired = open
    .filter((c) => isRetired(e(c)) && readable(c))
    .sort((a, b) => (e(a).lastRead ?? '').localeCompare(e(b).lastRead ?? '') || a.id.localeCompare(b.id));
  return [...new Set([...parentNew, ...(r.lastKind === 'new' ? [...due, ...fresh] : [...fresh, ...due]), ...rest, ...retired])];
}

export const pickPassage = <T extends Candidate>(r: ReadingHistory, pool: readonly T[], today: string): T | null => pickOrder(r, pool, today)[0] ?? null;
