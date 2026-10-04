import { makeParentWords, parseWordList } from '../content/parseWordList';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allWords, getCard, putCards, putWords } from '../store/repo';

export const DICTATION_LIST = '听写 mistakes';
const FIRST_IN_LINE = new Date(0);

/**
 * Words he wrote wrong in a school 听写 (spec §19 part 3): each becomes writeable and unpaused, and its write card is due now
 * (created if he has none), so 写一写 brings it back first. A word the app doesn't have is added as a school word.
 */
export async function applyDictationMistakes(db: AppDb, text: string, now: Date) {
  const { words: parsed, rejected } = parseWordList(text);
  const existing = await allWords(db);
  const { added } = makeParentWords(parsed.filter((p) => !existing.some((w) => w.text === p.text)), { listName: DICTATION_LIST, writeable: true, existing, now: now.getTime() });
  await putWords(db, added);
  const byText = new Map([...existing, ...added].map((w) => [w.text, w]));
  const marked: string[] = [];
  for (const p of parsed) {
    const w = byText.get(p.text);
    if (!w) continue;
    if (w.paused || !w.writeable) await putWords(db, [{ ...w, paused: false, writeable: true }]);
    const id = `${w.id}:write`;
    const card = await getCard(db, id);
    // due before anything else, so 写一写 brings it back first (FSRS schedules from the last review, not the due date)
    const due = FIRST_IN_LINE;
    await putCards(db, [card ? { ...card, fsrs: { ...card.fsrs, due } } : { id, wordId: w.id, kind: 'write', fsrs: { ...newCard(now), due } }]);
    marked.push(w.text);
  }
  return { marked, added: added.map((w) => w.text), skipped: rejected };
}
