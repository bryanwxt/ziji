// src/weeklist/check.ts
// 考考自己 on the ready-by day (weekly list spec 2026-10-17 §8.1–8.2): one question per item in mixed forms — 搭配 (a board of 3
// when the pairs make one), 选词填空, meaning or read — weakest first; no pinyin, no hints, no teaching until the end. Saved as he
// goes (one transaction per answer, updateWeekList). The day's first answer grades the card the check stands for; a miss is due by
// the start of tomorrow. Stars only for items newly ready (learning rules #34): finishing earns nothing, and the river meter never
// moves.
import { questionMeaning } from '../content/glossary';
import { addDays, localDateKey, startOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { listBoard } from '../practice/pairs';
import { bringForward, ratedToday, recordRecognition, recordUse } from '../session/record';
import type { AppDb } from '../store/db';
import { getCard, updateKid, updateWeekList } from '../store/repo';
import type { WeekFit, WeekForm, WeekList, WeekPair, Word } from '../types';
import { noteListAnswer, noteListPairAnswer } from './answers';
import { fitStillGood, pairStillGood } from './fit';
import { isReady } from './readiness';

/**
 * One question of the check. `covers`: the result keys it answers (item word ids; a pair with no half on the list by
 * `${left}|${right}`); `ready`: those items that were ready before it (no star for them).
 */
export interface CheckQuestion {
  key: string;
  wordId: string | null;
  form: WeekForm;
  pair?: WeekPair;
  pairs?: WeekPair[]; // a 连一连 board of list pairs (§7.5): one question for all their halves
  fit?: WeekFit;
  covers: string[];
  ready: string[];
  pairCovers?: Record<string, string[]>; // a 搭配 or board: each pair's own keys, by `${left}|${right}`
}

export interface PairAnswer { left: string; right: string; correct: boolean }

const pairKey = (p: { left: string; right: string }) => `${p.left}|${p.right}`;

/**
 * The check's questions (§8.1). Pairs first take their halves: three or more still-good pairs that make a board (listBoard) are one
 * 连一连 question, the rest one 搭配 each, asked from the left half. Then each item left: its confirmed 选词填空 when the row is still
 * guess-proof, otherwise meaning and read in turn among the items with English (so the check is mixed), read for the others.
 * Not-ready items first, each part shuffled by `rng` (seed it from the list, so a resumed check keeps its order).
 */
export function checkQueue(list: WeekList, words: ReadonlyMap<string, Word>, rng: Rng): CheckQuestion[] {
  const byText = new Map(list.items.filter((i) => words.has(i.wordId)).map((i) => [i.text, i]));
  const texts = new Set(list.items.map((i) => i.text));
  const coversOf = (p: { left: string; right: string }) => {
    const ids = [p.left, p.right].map((t) => byText.get(t)?.wordId).filter((id): id is string => !!id);
    return ids.length ? ids : [pairKey(p)];
  };
  const covered = new Set<string>();
  const out: Omit<CheckQuestion, 'ready'>[] = [];
  // a pair is asked while it adds something: a half not yet covered, or no half on the list at all
  let open = list.pairs.filter((p) => pairStillGood(p));
  const fresh = (p: WeekPair) => coversOf(p).some((k) => !covered.has(k));
  for (;;) {
    const left = open.filter(fresh);
    if (left.length < 3) break;
    const b = listBoard(left, rng);
    if (!b) break;
    const on = new Set(b.pairs.map(([l, r]) => `${l}|${r}`));
    const pairs = left.filter((p) => on.has(pairKey(p)));
    const covers = [...new Set(pairs.flatMap(coversOf))];
    out.push({ key: `board:${pairs.map(pairKey).join(',')}`, wordId: byText.get(pairs[0]!.left)?.wordId ?? null, form: 'dapei', pairs, covers, pairCovers: Object.fromEntries(pairs.map((p) => [pairKey(p), coversOf(p)])) });
    covers.forEach((k) => covered.add(k));
    open = open.filter((p) => !on.has(pairKey(p)));
  }
  for (const p of open) {
    if (!fresh(p)) continue;
    const covers = coversOf(p);
    out.push({ key: covers[0]!, wordId: byText.get(p.left)?.wordId ?? byText.get(p.right)?.wordId ?? null, form: 'dapei', pair: p, covers, pairCovers: { [pairKey(p)]: covers } });
    covers.forEach((k) => covered.add(k));
  }
  let english = 0;
  for (const it of list.items) {
    const w = words.get(it.wordId);
    if (covered.has(it.wordId) || !w) continue;
    covered.add(it.wordId);
    const fit = list.fits.find((f) => f.wordId === it.wordId && fitStillGood(f, it.text, texts));
    const form: WeekForm = fit ? 'fit' : questionMeaning(w) ? (english++ % 2 === 0 ? 'meaning' : 'read') : 'read';
    out.push({ key: it.wordId, wordId: it.wordId, form, ...(fit ? { fit } : {}), covers: [it.wordId] });
  }
  const readyIds = new Set(list.items.filter((i) => isReady(i, list, words.get(i.wordId))).map((i) => i.wordId));
  const qs: CheckQuestion[] = out.map((q) => ({ ...q, ready: q.covers.filter((k) => readyIds.has(k)) }));
  const allReady = (q: CheckQuestion) => q.ready.length === q.covers.length && q.covers.every((k) => readyIds.has(k));
  return [...shuffle(qs.filter((q) => !allReady(q)), rng), ...shuffle(qs.filter(allReady), rng)];
}

/** A question is answered once every key it covers has a result. */
export const answered = (list: WeekList, q: CheckQuestion) => q.covers.every((k) => !!list.check?.results[k]);

/**
 * Saves one answer (§8.1): the result for each key it covers (a board's halves by their own pair), with a star for an item right
 * and not ready before; then his answers on the list, the card it grades (the day's first answer: a read or meaning question his
 * reading card, a 搭配 or 选词填空 his meaning card when he has one, as 练一练 does), and a miss due by the start of tomorrow (§8.2).
 * A question already answered changes nothing.
 */
export async function recordCheckAnswer(db: AppDb, listId: string, q: CheckQuestion, correct: boolean, now: Date, more: { pairs?: PairAnswer[]; responseMs?: number } = {}): Promise<void> {
  // a board's half is right when its own pair was joined at the first try
  const halfOf = (p: { left: string; right: string }, k: string) => !!q.pairCovers?.[pairKey(p)]?.includes(k);
  const rightOf = (k: string): boolean => {
    const mine = q.pairs && more.pairs ? more.pairs.filter((p) => halfOf(p, k)) : [];
    return mine.length ? mine.every((p) => p.correct) : correct;
  };
  let fresh = false;
  let stars = 0;
  await updateWeekList(db, listId, (l) => {
    const check = l.check ?? { at: now.getTime(), day: localDateKey(now), results: {}, done: false };
    if (q.covers.some((k) => check.results[k])) return l; // a double tap, or a question asked before he stopped
    fresh = true;
    const onList = new Set(l.items.map((i) => i.wordId));
    const results = { ...check.results };
    for (const k of q.covers) {
      const right = rightOf(k);
      const star = right && onList.has(k) && !q.ready.includes(k);
      if (star) stars++;
      results[k] = { form: q.form, correct: right, ...(star ? { star: true as const } : {}) };
    }
    return { ...l, check: { ...check, results } };
  });
  if (!fresh) return;
  if (stars) await updateKid(db, (k) => ({ ...k, bonusStars: k.bonusStars + stars }));
  const tomorrow = startOfLocalDay(addDays(now, 1));
  const responseMs = more.responseMs ?? 0;
  const rateMeaning = async (wordId: string, right: boolean) => {
    if (await getCard(db, `${wordId}:meaning`)) await recordUse(db, wordId, right, now, responseMs);
    if (!right) await bringForward(db, wordId, 'meaning', tomorrow);
  };
  if (q.form === 'dapei') {
    const pairs = q.pairs ? (more.pairs ?? q.pairs.map((p) => ({ left: p.left, right: p.right, correct }))) : [{ left: q.pair!.left, right: q.pair!.right, correct }];
    for (const p of pairs) {
      await noteListPairAnswer(db, listId, p, p.correct, now);
      for (const k of q.covers) if (halfOf(p, k) && !k.includes('|')) await rateMeaning(k, p.correct);
    }
    return;
  }
  const wordId = q.wordId!;
  await noteListAnswer(db, wordId, q.form, correct, now);
  if (q.form === 'fit') return rateMeaning(wordId, correct);
  const read = await getCard(db, `${wordId}:recognise`);
  if (read && !ratedToday(read, now)) await recordRecognition(db, wordId, { correct, responseMs }, now);
  if (!correct) await bringForward(db, wordId, 'recognise', tomorrow);
}

/** Marks the check done (§8.1): how many right of the results, and the stars its answers earned. Earns nothing by itself. */
export async function finishCheck(db: AppDb, listId: string, _now: Date): Promise<{ right: number; total: number; stars: number }> {
  const l = await updateWeekList(db, listId, (x) => (x.check ? { ...x, check: { ...x.check, done: true } } : x));
  if (!l?.check) return { right: 0, total: 0, stars: 0 };
  const results = Object.values(l.check.results);
  return { right: results.filter((r) => r.correct).length, total: results.length, stars: results.filter((r) => r.star).length };
}

