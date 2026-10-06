// the words he practised today, for the payoff's [rescued] page (spec 3c §4)
import { startOfLocalDay } from '../lib/date';
import type { AppDb } from '../store/db';
import { logsSince } from '../store/repo';

export async function wordsPractisedToday(db: AppDb, now: Date, max = 12): Promise<string[]> {
  const logs = (await logsSince(db, startOfLocalDay(now).getTime())).sort((a, b) => a.at - b.at);
  return [...new Set(logs.map((l) => l.wordId))].slice(0, max);
}
