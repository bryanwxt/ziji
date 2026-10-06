// A word by id: one he has stored (built-in characters, the parent's words) or a ladder word (static content, spec §3.1).
import { isLadderId, ladderWord } from '../content/ladder';
import type { AppDb } from '../store/db';
import { getWord } from '../store/repo';
import type { Word } from '../types';

export async function findWord(db: AppDb, id: string): Promise<Word | undefined> {
  return isLadderId(id) ? ladderWord(id) : getWord(db, id);
}
