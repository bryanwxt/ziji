// Who is in 练一练 and what each word can be asked (spec 2026-10-05 §3.1–3.2). The order and the climbing are round.ts's.
import { meaningCue, wordCue } from '../activities/flashcards/meaning';
import { bankFor } from '../content/sentenceBank';
import { mulberry32, shuffle, type Rng } from '../lib/random';
import { fitItem } from '../practice/useItems';
import type { CardRecord, SessionRecord, Word } from '../types';
import { startRung } from './ladder';
import { buildRound, type Ask, type PracticeItem, type RoundWord } from './round';
import { introducedNewWords } from './runner';

/** Words in a free-play round (two questions each). */
export const FREE_PLAY_WORDS = 10;

/** Today's new words that 认新字 introduced (three climbs from 字; a miss there comes back first), then due revision, most due first. */
export function practiceWords(rec: SessionRecord, rungs: ReadonlyMap<string, number>): RoundWord[] {
  const introduced = introducedNewWords(rec);
  const fresh: RoundWord[] = introduced.map((wordId) => ({
    wordId, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: true, early: rec.recalls?.[wordId]?.missed ?? false,
  }));
  const reading = new Set(rec.plan.reviewWordIds);
  const meaning = new Set([...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]);
  const seen = new Set(introduced);
  const revision: RoundWord[] = [];
  for (const wordId of [...rec.plan.reviewWordIds, ...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]) {
    if (seen.has(wordId)) continue;
    seen.add(wordId);
    const from = startRung(rungs.get(wordId) ?? 0);
    revision.push({ wordId, isNew: false, from, appearances: from === 1 ? 2 : 1, gradesRecognise: reading.has(wordId), gradesMeaning: meaning.has(wordId) });
  }
  return [...fresh, ...revision];
}

/** Whether a question type can be asked of this word: reading always, listening with the voice on, the rest when their content exists. */
export function askable(word: Word | undefined, pool: Word[], voice: boolean): (ask: Ask) => boolean {
  return (ask) => {
    if (!word || word.paused) return false;
    switch (ask) {
      case 'read': return true;
      case 'listen': return voice;
      case 'word': return wordCue(word) !== null;
      case 'fit': return meaningCue(word)?.kind === 'sentence' && fitItem(word, pool, mulberry32(1)) !== null;
      case 'usage': return !!bankFor(word.text);
    }
  };
}

export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng): PracticeItem[] {
  const words = practiceWords(rec, rungs).filter((w) => askable(wordsById.get(w.wordId), pool, voice)('read'));
  return buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice)(ask), rng);
}

/** 再玩一会儿: a round of words he has begun, from their own rungs, twice each; practice only. */
export function planFreePlay(cards: CardRecord[], words: Word[], rungs: ReadonlyMap<string, number>, voice: boolean, rng: Rng, n = FREE_PLAY_WORDS): PracticeItem[] {
  const byId = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const ids = shuffle([...new Set(cards.filter((c) => c.kind === 'recognise' && byId.has(c.wordId)).map((c) => c.wordId))], rng).slice(0, n);
  const round = buildRound(
    ids.map((wordId) => ({ wordId, isNew: false, from: startRung(rungs.get(wordId) ?? 0), appearances: 2, gradesRecognise: false, gradesMeaning: false })),
    (id, ask) => askable(byId.get(id), words, voice)(ask),
    rng,
  );
  return round.map((x) => ({ ...x, grades: null, retry: true }));
}
