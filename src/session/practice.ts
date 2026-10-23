// Who is in 练一练 and what each word can be asked (spec 2026-10-05 §3.1–3.2). The order and the climbing are round.ts's.
import { meaningCue, wordCue } from '../activities/flashcards/meaning';
import { bankFor } from '../content/sentenceBank';
import { mulberry32, shuffle, type Rng } from '../lib/random';
import { fitItem } from '../practice/useItems';
import { zujuFor } from '../content/zuju';
import { dapeiQuestion, zuciBoard } from '../practice/pairs';
import type { CardRecord, RecallPick, SessionRecord, Word } from '../types';
import { startRung } from './ladder';
import { buildRound, type Ask, type PracticeItem, type RoundWord } from './round';
import { fishItem } from '../activities/components/zibian';
import { meaningChoices } from '../activities/flashcards/distractors';
import { understandItem } from '../practice/understand';
import { introducedNewWords } from './runner';
import { SAY_PER_LESSON, SENTENCE_PER_LESSON } from './plan';
import { canAskRung } from '../ladder/rungs';
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';
import { familyBoard } from '../practice/family';
import { withNoneOfThese } from '../practice/noneOfThese';
import { ITEM_MS, withList, withListNone } from '../weeklist/practice';

const idiomCache = new WeakMap<Word[], Map<string, Idiom[]>>();
/** The 成语 for a word at his level, worked out once per word list (planning asks each word several times). */
function idiomsOf(word: Word, level: number, pool: Word[]): Idiom[] {
  let byWord = idiomCache.get(pool);
  if (!byWord) idiomCache.set(pool, (byWord = new Map()));
  const key = `${word.id}|${word.text}|${level}`;
  let out = byWord.get(key);
  if (!out) byWord.set(key, (out = idiomsFor(word, level, pool)));
  return out;
}

/** Words in a free-play round (two questions each). */
export const FREE_PLAY_WORDS = 10;

/** Today's new words that 认新字 introduced (three climbs from 字; a miss there comes back first), then due revision, most due first. */
export function practiceWords(rec: SessionRecord, rungs: ReadonlyMap<string, number>): RoundWord[] {
  const introduced = introducedNewWords(rec);
  const fresh: RoundWord[] = introduced.map((wordId) => ({
    wordId, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: false, early: rec.recalls?.[wordId]?.missed ?? false, // Use waits for Read (final review I3)
  }));
  const reading = new Set(rec.plan.reviewWordIds);
  const hearing = new Set(rec.plan.hearReviewIds ?? []); // a lesson planned before the ladder has none
  const understanding = new Set(rec.plan.understandReviewIds ?? []); // nor one planned before 2b
  const meaning = new Set([...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]);
  const meaningDue = new Set(rec.plan.meaningReviewIds ?? []);
  const seen = new Set(introduced);
  const revision: RoundWord[] = [];
  for (const wordId of [...(rec.plan.hearReviewIds ?? []), ...(rec.plan.understandReviewIds ?? []), ...rec.plan.reviewWordIds, ...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]) {
    if (seen.has(wordId)) continue;
    seen.add(wordId);
    const listenOnly = understanding.has(wordId) && !reading.has(wordId) && !hearing.has(wordId) && !meaning.has(wordId);
    const from = listenOnly ? 3 : startRung(rungs.get(wordId) ?? 0);
    revision.push({ wordId, isNew: false, from, appearances: from === 1 ? 2 : 1, gradesRecognise: reading.has(wordId), gradesMeaning: meaning.has(wordId), gradesHear: hearing.has(wordId), gradesUnderstand: understanding.has(wordId), due: reading.has(wordId) || meaningDue.has(wordId) || hearing.has(wordId) || understanding.has(wordId) });
  }
  // an extra lesson with nothing due: his weakest words, twice each, graded by nothing (learning rules 2026-10-17)
  for (const wordId of rec.plan.weakIds ?? []) {
    if (seen.has(wordId)) continue;
    seen.add(wordId);
    revision.push({ wordId, isNew: false, from: startRung(rungs.get(wordId) ?? 0), appearances: 2, gradesRecognise: false, gradesMeaning: false });
  }
  return [...fresh, ...revision];
}

/** Whether a question type can be asked of this word: reading always, listening with the voice on, the rest when their content exists. `level` is his (spec §4). */
const askCache = new WeakMap<Word[], Map<string, boolean>>();
export function askable(word: Word | undefined, pool: Word[], voice: boolean, level = 1): (ask: Ask) => boolean {
  // building a round asks each word about each question type many times: worked out once per word list (sweep: ~370 → ~40 ms)
  let cache = askCache.get(pool);
  if (!cache) askCache.set(pool, (cache = new Map()));
  return (ask) => {
    if (!word || word.paused) return false;
    const key = `${word.id}|${word.text}|${word.examples?.length ?? 0}|${word.sentences?.length ?? 0}|${word.tags?.join(',') ?? ''}|${ask}|${voice ? 1 : 0}|${level}`;
    const hit = cache!.get(key);
    if (hit !== undefined) return hit;
    const can = canAsk(word, pool, voice, level, ask);
    cache!.set(key, can);
    return can;
  };
}

function canAsk(word: Word, pool: Word[], voice: boolean, level: number, ask: Ask): boolean {
  switch (ask) {
    case 'read': return Array.from(word.text).length === 1 || word.source === 'parent'; // reading aloud: characters and his own lists; ladder 词语 are read for meaning
    case 'listen': return voice && Array.from(word.text).length === 1;
    case 'hear': return voice && meaningChoices(word, pool, mulberry32(1), undefined, true) !== null;
    case 'understand': return voice && understandItem(word, mulberry32(1)) !== null;
    case 'meaningRead': return meaningChoices(word, pool, mulberry32(1)) !== null;
    case 'word': return wordCue(word) !== null;
    case 'fit': return meaningCue(word)?.kind === 'sentence' && fitItem(word, pool, mulberry32(1)) !== null;
    case 'usage': return !!bankFor(word.text);
    case 'pair': return zuciBoard(word, mulberry32(1)) !== null;
    case 'match': return dapeiQuestion(word, mulberry32(1)) !== null;
    case 'build': return zujuFor(word).length > 0;
    case 'whole': { const i = idiomOf(word); return !!i && idiomGap(i, null, mulberry32(1)) !== null; }
    case 'idiom': return !isIdiomWord(word) && idiomsOf(word, level, pool).some((i) => idiomGap(i, word.text, mulberry32(1)) !== null);
    case 'idiomFit': return !isIdiomWord(word) && idiomsOf(word, level, pool).some((i) => idiomFitItem(i, null, mulberry32(1)) !== null);
    case 'idiomBuild': return !isIdiomWord(word) && idiomsOf(word, level, pool).some((i) => idiomZuju(i, mulberry32(1)) !== null);
    case 'say': return false; // a Say card is added from the plan's sayIds (withSay), never asked from the ladder
    case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder
    case 'family': return false; // 找一家人 takes over a planned rung-2 item (withFamily), never asked from the ladder
    case 'sentence': return false; // 说一句 is added from the plan's sentenceIds (withSentence), never asked from the ladder
    case 'recall': return false; // 默写 takes over a word's first appearance from the plan's recall (withRecall), never asked from the ladder
  }
}

/** At most two 钓鱼 items a lesson (spec 2026-10-05 §3.4). */
export const MAX_FISH = 2;

/** Puts up to two 钓鱼 items into the round, spread out (a third and two thirds in), never beside the same word. */
export function withFish(items: PracticeItem[], fishIds: string[]): PracticeItem[] {
  const out = [...items];
  const ids = fishIds.slice(0, MAX_FISH);
  ids.forEach((wordId, k) => {
    let at = Math.round((out.length * (k + 1)) / (ids.length + 1));
    while (at < out.length && (out[at - 1]?.wordId === wordId || out[at]?.wordId === wordId)) at++;
    out.splice(at, 0, { wordId, rung: 2, ask: 'fish', grades: null, retry: false });
  });
  return out;
}

/**
 * Puts the Say cards into the round (spec 2026-10-11 §4): about one in three of all its items, at most 6, spread out (a k-th of
 * the way in, like 钓鱼), never beside the same word or another Say card. A Say card grades nothing in the lesson: the parent
 * confirms the take.
 */
export function withSay(items: PracticeItem[], sayIds: string[]): PracticeItem[] {
  const k = Math.min(SAY_PER_LESSON, sayIds.length, Math.floor(items.length / 2));
  const out = [...items];
  sayIds.slice(0, k).forEach((wordId, j) => {
    let at = Math.round((out.length * (j + 1)) / (k + 1));
    const crowded = (x: PracticeItem | undefined) => !!x && (x.wordId === wordId || x.ask === 'say');
    while (at < out.length && (crowded(out[at - 1]) || crowded(out[at]))) at++;
    out.splice(at, 0, { wordId, rung: 1, ask: 'say', grades: 'say', retry: false });
  });
  return out;
}

/** 说一句 comes by this many items in (and the second by twice it): a round is cut by its time box, 5 minutes at the usual 15
 *  (12 at 20 minutes' 6.7, scaled to 15: learning rules 2026-10-17). */
export const SENTENCE_BY = 9;

/**
 * Puts the 说一句 cards into the round (production practice spec §4): at most 2, and one for every three items at most, spread
 * like the Say cards but never later than the 9th and 18th item, so the time box reaches them (measured: a P2 round of ~200
 * items lost its second one at half-way); never beside the same word or another card he records. Like a Say card it grades
 * nothing in the lesson: the parent confirms the take.
 */
export function withSentence(items: PracticeItem[], sentenceIds: string[]): PracticeItem[] {
  const k = Math.min(SENTENCE_PER_LESSON, sentenceIds.length, Math.floor(items.length / 3));
  const out = [...items];
  sentenceIds.slice(0, k).forEach((wordId, j) => {
    let at = Math.min(Math.round((out.length * (j + 1)) / (k + 1)), SENTENCE_BY * (j + 1));
    const crowded = (x: PracticeItem | undefined) => !!x && (x.wordId === wordId || x.ask === 'say' || x.ask === 'sentence');
    while (at < out.length && (crowded(out[at - 1]) || crowded(out[at]))) at++;
    out.splice(at, 0, { wordId, rung: 3, ask: 'sentence', grades: 'sentence', retry: false });
  });
  return out;
}

/**
 * 默写 (real test spec 2026-10-23 §4): each picked word's first appearance becomes its 默写, in the same place, rung and grading,
 * so the round is no longer and §3's order puts it before anything the time box cuts. A word not in the round gets none.
 */
export function withRecall(items: PracticeItem[], picks: readonly RecallPick[]): PracticeItem[] {
  const out = [...items];
  for (const p of picks) {
    const i = out.findIndex((x) => x.wordId === p.wordId && !x.retry);
    if (i < 0 || out[i]!.ask === 'recall') continue;
    out[i] = { ...out[i]!, ask: 'recall', recall: { at: p.at, writeId: p.writeId, ask: out[i]!.ask } };
  }
  return out;
}

/** At most two 找一家人 a lesson (spec 2026-10-12 §5). */
export const MAX_FAMILY = 2;

/**
 * 找一家人 in place of rung-2 word or pair items (spec 2026-10-12 §5): the round's first ones whose word has a board, two words at
 * most, never right after another; each keeps its place, rung and grading, so the round is no longer.
 */
export function withFamily(items: PracticeItem[], canFamily: (wordId: string) => boolean): PracticeItem[] {
  const out = [...items];
  const done = new Set<string>();
  for (let i = 0; i < out.length && done.size < MAX_FAMILY; i++) {
    const x = out[i]!;
    if (x.retry || x.rung !== 2 || (x.ask !== 'word' && x.ask !== 'pair') || done.has(x.wordId) || out[i - 1]?.ask === 'family') continue;
    if (!canFamily(x.wordId)) continue;
    out[i] = { ...x, ask: 'family' };
    done.add(x.wordId);
  }
  return out;
}

/** `canSay`: the iPad can record (no microphone or MediaRecorder: no Say or 说一句 cards this lesson, spec 2026-10-11 §7). */
export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1, canSay = false, known: ReadonlySet<string> = new Set()): PracticeItem[] {
  // no voice: a word due only for Understand is left for another day — a reading question would grade Use before Read (final review I2)
  const listenOnly = (w: RoundWord) => !!w.gradesUnderstand && !w.gradesRecognise && !w.gradesHear && !w.gradesMeaning;
  const words = practiceWords(rec, rungs).filter((w) => (voice || !listenOnly(w)) && (() => { const can = askable(wordsById.get(w.wordId), pool, voice, level); return can('read') || can('meaningRead'); })());
  // 写一写 does today's 组词 work for the words it covers (production practice spec §3): no 组词 gap or pairing for them here; the
  // ladder asks another rung-2 question, or the nearest rung below, so the round keeps its length (plans saved before have none)
  const written = new Set(rec.plan.writeWordIds ?? []);
  const can = (id: string, ask: Ask) => !(written.has(id) && (ask === 'word' || ask === 'pair')) && askable(wordsById.get(id), pool, voice, level)(ask);
  // never a word met today: it is said on another day (spec 2026-10-11 §4), and asked with its answer in (production practice spec §5)
  const today = new Set([...rec.plan.newWordIds, ...introducedNewWords(rec)]);
  // 找一家人 takes up to two rung-2 items, for words with family he reads (`known`: know.knownChars, spec 2026-10-12 §5); about one
  // in five 组词-gap, 搭配 and English-meaning questions then leave their answer out for 「都不对」 (production practice spec §5)
  // 默写 (real test spec 2026-10-23 §4) takes its words' first appearances before 找一家人 and 都不对 look at the round
  const recall = (rec.plan.recall ?? []).filter((p) => { const w = wordsById.get(p.wordId); return !!w && !w.paused && !today.has(p.wordId); });
  const round = withNoneOfThese(withFamily(withRecall(buildRound(words, can, rng), recall), (id) => {
    const w = wordsById.get(id);
    return !!w && !w.paused && familyBoard(w, known, mulberry32(1)) !== null;
  }), today, rng);
  const fish = [...confusions.keys()].filter((id) => {
    const w = wordsById.get(id);
    return w && !w.paused && fishItem(w, confusions.get(id)!, new Set(), mulberry32(1)) !== null;
  });
  const say = canSay ? (rec.plan.sayIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id); }) : [];
  const sentence = canSay ? (rec.plan.sentenceIds ?? []).filter((id) => { const w = wordsById.get(id); return !!w && !w.paused && !today.has(id) && canAskRung(w, 'sentence'); }) : [];
  // the weakest-words round is practice only: a use question on it never rates his meaning card (learning rules 2026-10-17)
  const weak = new Set(rec.plan.weakIds ?? []);
  const graded = weak.size ? round.map((x) => (weak.has(x.wordId) ? { ...x, grades: null } : x)) : round;
  // a weekly list's items (weekly list spec §6.4, §7.6, §2.1): interleaved, reserved ones always, boost as far as the box holds
  const box = Math.floor((rec.plan.practiceTimeBoxMs ?? 5 * 60_000) / ITEM_MS);
  const listed = (rec.plan.listItems ?? []).filter((x) => { const w = wordsById.get(x.wordId); return !!w && !w.paused && !today.has(x.wordId); });
  return withList(withSentence(withSay(withFish(graded, fish), say), sentence), withListNone(listed, today, rng), box);
}

/** 再玩一会: a round of words he has begun, from their own rungs, twice each; practice only. */
export function planFreePlay(cards: CardRecord[], words: Word[], rungs: ReadonlyMap<string, number>, voice: boolean, rng: Rng, n = FREE_PLAY_WORDS, level = 1): PracticeItem[] {
  const byId = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const ids = shuffle([...new Set(cards.filter((c) => c.kind === 'recognise' && byId.has(c.wordId)).map((c) => c.wordId))], rng).slice(0, n);
  const round = buildRound(
    ids.map((wordId) => ({ wordId, isNew: false, from: startRung(rungs.get(wordId) ?? 0), appearances: 2, gradesRecognise: false, gradesMeaning: false })),
    (id, ask) => askable(byId.get(id), words, voice, level)(ask),
    rng,
  );
  return round.map((x) => ({ ...x, grades: null, retry: true }));
}
