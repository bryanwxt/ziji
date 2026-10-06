// Who is in 练一练 and what each word can be asked (spec 2026-10-05 §3.1–3.2). The order and the climbing are round.ts's.
import { meaningCue, wordCue } from '../activities/flashcards/meaning';
import { bankFor } from '../content/sentenceBank';
import { mulberry32, shuffle, type Rng } from '../lib/random';
import { fitItem } from '../practice/useItems';
import { zujuFor } from '../content/zuju';
import { dapeiQuestion, zuciBoard } from '../practice/pairs';
import type { CardRecord, SessionRecord, Word } from '../types';
import { startRung } from './ladder';
import { buildRound, type Ask, type PracticeItem, type RoundWord } from './round';
import { fishItem } from '../activities/components/zibian';
import { meaningChoices } from '../activities/flashcards/distractors';
import { introducedNewWords } from './runner';
import { idiomOf, idiomsFor, isIdiomWord, type Idiom } from '../content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../practice/idioms';

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
    wordId, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: true, early: rec.recalls?.[wordId]?.missed ?? false,
  }));
  const reading = new Set(rec.plan.reviewWordIds);
  const hearing = new Set(rec.plan.hearReviewIds ?? []); // a lesson planned before the ladder has none
  const meaning = new Set([...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]);
  const meaningDue = new Set(rec.plan.meaningReviewIds ?? []);
  const seen = new Set(introduced);
  const revision: RoundWord[] = [];
  for (const wordId of [...(rec.plan.hearReviewIds ?? []), ...rec.plan.reviewWordIds, ...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]) {
    if (seen.has(wordId)) continue;
    seen.add(wordId);
    const from = startRung(rungs.get(wordId) ?? 0);
    revision.push({ wordId, isNew: false, from, appearances: from === 1 ? 2 : 1, gradesRecognise: reading.has(wordId), gradesMeaning: meaning.has(wordId), gradesHear: hearing.has(wordId), due: reading.has(wordId) || meaningDue.has(wordId) || hearing.has(wordId) });
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
    case 'hear': return voice && meaningChoices(word, pool, mulberry32(1)) !== null;
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
    case 'fish': return false; // a 钓鱼 item is added for confused words only (Task 7), never asked from the ladder
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

export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng, confusions: ReadonlyMap<string, string[]> = new Map(), level = 1): PracticeItem[] {
  const words = practiceWords(rec, rungs).filter((w) => { const can = askable(wordsById.get(w.wordId), pool, voice, level); return can('read') || can('meaningRead'); });
  const round = buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice, level)(ask), rng);
  const fish = [...confusions.keys()].filter((id) => {
    const w = wordsById.get(id);
    return w && !w.paused && fishItem(w, confusions.get(id)!, new Set(), mulberry32(1)) !== null;
  });
  return withFish(round, fish);
}

/** 再玩一会儿: a round of words he has begun, from their own rungs, twice each; practice only. */
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
