import { summarize, type Knowledge } from '../stats/stats';
import type { AppDb } from '../store/db';
import { allCards, allWords, firstLogByCard } from '../store/repo';

export type { Knowledge };

export async function loadKnowledge(db: AppDb): Promise<Knowledge> {
  const [words, cards, firstLog] = await Promise.all([allWords(db), allCards(db), firstLogByCard(db)]);
  return summarize(words, cards, new Set(firstLog.keys())); // confirmed needs a reading answer (review I2)
}
