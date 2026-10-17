// The week's numbers from the stores (parent loop spec §5), for Progress → Week summary and Share the week.
import { PASSAGES } from '../content';
import { ladderWordsBesides } from '../content/ladder';
import { waitingTakes } from '../session/say';
import type { AppDb } from '../store/db';
import { allCards, allSessions, allTalks, allWords, listParentPassages, listRecordings, logsSince } from '../store/repo';
import { summarizeWeek, weekRange, type WeekRange, type WeekSummary } from './week';

export async function loadWeek(db: AppDb, now: Date, back = 0): Promise<{ range: WeekRange; summary: WeekSummary }> {
  const range = weekRange(now, back);
  const [talks, sessions, cards, logs, recordings, words, parent] = await Promise.all([
    allTalks(db), allSessions(db), allCards(db), logsSince(db, range.start), listRecordings(db), allWords(db), listParentPassages(db),
  ]);
  const text = new Map([...words, ...ladderWordsBesides(words)].map((w) => [w.id, w.text]));
  const title = new Map([...PASSAGES, ...parent].map((p) => [p.id, p.title]));
  const summary = summarizeWeek({
    range, talks, sessions, cards, logs, recordings, waiting: waitingTakes(recordings).length,
    textOf: (id) => text.get(id), titleOf: (id) => title.get(id),
  });
  return { range, summary };
}
