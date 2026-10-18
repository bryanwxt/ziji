// src/weeklist/readiness.ts
// Ready (weekly list spec 2026-10-17 §8.3): before the check, every form it can be asked was last answered right; after it, its
// check question was right and nothing since was wrong. Solid (§2.1): passed the check with no miss since, or right on two days.
import { questionMeaning } from '../content/glossary';
import { localDateKey, parseDateKey } from '../lib/date';
import type { WeekForm, WeekItem, WeekList, Word } from '../types';
import { weekdayZh } from './dates';
import { activeLists } from './plan';

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

const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 'Wed 4 Nov', for the parent's line. */
export const enDay = (key: string) => { const d = parseDateKey(key); return `${EN_DAYS[d.getDay()]} ${d.getDate()} ${EN_MONTHS[d.getMonth()]}`; };

/**
 * His one line on Home (spec §9), for the list with the nearest ready-by whose homework day isn't behind: before ready-by, the
 * weekday and the items not yet ready; on ready-by until the check is done, 今天考考自己！; then praise, or how many to look at
 * again; nothing after homework day. Never red, never hours.
 */
export function countdownLine(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date): string | null {
  const day = localDateKey(now);
  const l = activeLists(lists, now).find((x) => day <= x.homeworkDue);
  if (!l) return null;
  const left = l.items.filter((i) => !isReady(i, l, words.get(i.wordId))).length;
  if (day < l.readyBy) return `${weekdayZh(l.readyBy)}前：还有 ${left} 个词`;
  if (day === l.readyBy && !l.check?.done) return '今天考考自己！';
  return left ? `还要再看 ${left} 个词` : `本周词语：${l.items.length} 个都会了！`;
}

/** More class words short than this by homework day (about two days at his pace) reads "behind class — see Progress" (spec §8.3). */
export const CLASS_BEHIND_AT = 10;

/** One row of the parent's after-check table (spec §8.3): the item, its check answer, and where it is now. */
export interface CheckRow { wordId: string; text: string; check: string; now: 'not yet' | 'ready' | 'solid' }
const FORM_NAME: Record<WeekForm, string> = { read: 'read', meaning: 'meaning', fit: '选词填空', dapei: '搭配' };

/** After the check: every item with ✓/✗ and the form it was asked in (or "not asked"), and now ready, not yet or solid; the
 *  ones that need help (not yet) first, each group in list order. */
export function checkTable(list: WeekList, words: ReadonlyMap<string, Word>): CheckRow[] {
  const rank = { 'not yet': 0, ready: 1, solid: 2 } as const;
  return list.items
    .map((it): CheckRow => {
      const r = list.check?.results[it.wordId];
      const now = isSolid(it, list) ? 'solid' : isReady(it, list, words.get(it.wordId)) ? 'ready' : 'not yet';
      return { wordId: it.wordId, text: it.text, check: r ? `${r.correct ? '✓' : '✗'} ${FORM_NAME[r.form]}` : 'not asked', now };
    })
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank[a.row.now] - rank[b.row.now] || a.i - b.i)
    .map((x) => x.row);
}

/** How bad an item's answers are, for the weak list (worst first): missed in the check, then answered wrong, then never asked. */
function weakness(item: WeekItem, list: WeekList): number {
  if (list.check?.results[item.wordId]?.correct === false) return 0;
  if (Object.values(item.last ?? {}).some((a) => a && !a.correct)) return 1;
  return Object.keys(item.last ?? {}).length ? 3 : 2;
}

/**
 * The parent's readiness line (spec §8.3) on Today: List x/y ready (pairs aren't counted in y); the class lane on track, or its
 * shortfall by homework day when there is one (listBudget's classShort); catch-up slower while the list is front-loaded; his
 * reviews due today; up to five weak items and pairs, worst first. `afterCheck`: new words even 20 a lesson won't teach before
 * the check (parent ruling 2026-10-18).
 */
export function readinessLine(list: WeekList, words: ReadonlyMap<string, Word>, i: { classLeft: number; classKnown: boolean; catchupSlower: boolean; reviewsDue: number; afterCheck?: number }): { head: string; line: string; weak: string[] } {
  const notReady = list.items.filter((it) => !isReady(it, list, words.get(it.wordId)));
  const ready = list.items.length - notReady.length;
  const weakItems = [...notReady].sort((a, b) => weakness(a, list) - weakness(b, list));
  const badPairs = list.pairs.filter((p) => p.last && !p.last.correct).map((p) => `${p.left}—${p.right}`);
  const worst = weakItems.filter((it) => weakness(it, list) <= 1).map((it) => it.text);
  const rest = weakItems.filter((it) => weakness(it, list) > 1).map((it) => it.text);
  // classLeft: this week's class lane (his class lesson and the one before, characters and their 词语) still unstarted on homework
  // day at today's numbers; far behind, a number that big alarms more than it tells: Progress shows where he is
  const cls = !i.classKnown ? [] : i.classLeft > CLASS_BEHIND_AT ? ['behind class — see Progress'] : i.classLeft > 0 ? [`class: ${i.classLeft} left by ${EN_DAYS[parseDateKey(list.homeworkDue).getDay()]}`] : ['class on track'];
  const late = i.afterCheck ? [`${i.afterCheck} new word${i.afterCheck === 1 ? '' : 's'} after the check`] : [];
  const parts = [`List ${ready}/${list.items.length} ready`, ...late, ...cls, ...(i.catchupSlower ? ['catch-up slower this week'] : []), `${i.reviewsDue} reviews due`];
  return {
    head: `${list.name} · ready by ${enDay(list.readyBy)} · homework ${enDay(list.homeworkDue)}`,
    line: parts.join(' · '),
    weak: [...worst, ...badPairs, ...rest].slice(0, 5),
  };
}
