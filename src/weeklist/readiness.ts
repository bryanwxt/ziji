// src/weeklist/readiness.ts
// Ready (weekly list spec 2026-10-17 §8.3): before the check, every form it can be asked was last answered right; after it, its
// check question was right and nothing since was wrong. Solid (§2.1): passed the check with no miss since, or right on two days.
import { questionMeaning } from '../content/glossary';
import { localDateKey } from '../lib/date';
import type { WeekForm, WeekItem, WeekList, Word } from '../types';

/** The forms an item can be asked: read always; meaning with English; 选词填空 with a confirmed row; 搭配 as a pair half. */
export function formsFor(item: WeekItem, list: WeekList, word?: Word): WeekForm[] {
  const forms: WeekForm[] = ['read'];
  if (word && questionMeaning(word)) forms.push('meaning');
  if (list.fits.some((f) => f.wordId === item.wordId)) forms.push('fit');
  if (list.pairs.some((p) => p.left === item.text || p.right === item.text)) forms.push('dapei');
  return forms;
}

/** The ready-by day is behind, or the check is done. */
export const afterCheck = (list: WeekList, now: Date) => localDateKey(now) > list.readyBy || !!list.check?.done;

export function isReady(item: WeekItem, list: WeekList, word?: Word): boolean {
  const check = list.check?.results[item.wordId];
  if (check) {
    const since = Object.values(item.last ?? {}).filter((a) => a && a.at > list.check!.at);
    return check.correct && since.every((a) => a!.correct);
  }
  // an echo (right after its card) shows he can, not that he learned it: a later day's answer counts (fix round 2026-10-17)
  return formsFor(item, list, word).every((f) => item.last?.[f]?.correct === true && !item.last[f]!.echo);
}

export function isSolid(item: WeekItem, list: WeekList): boolean {
  const passed = list.check?.results[item.wordId]?.correct === true && !item.missedOn;
  return passed || (item.rightDays ?? []).length >= 2;
}

/** After the check: the items not yet solid (missed, never asked, or wrong since), the oldest last answer first. */
export function notSolid(list: WeekList, now: Date): WeekItem[] {
  if (!afterCheck(list, now)) return [];
  const lastAt = (i: WeekItem) => Math.max(0, ...Object.values(i.last ?? {}).map((a) => a?.at ?? 0));
  return list.items.filter((i) => !isSolid(i, list)).sort((a, b) => lastAt(a) - lastAt(b));
}
