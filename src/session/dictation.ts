import { makeParentWords, parseWordList } from '../content/parseWordList';
import { hanChars } from '../content';
import { strokeAvailability } from '../content/strokes';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allWords, getCard, putCards, putWords } from '../store/repo';

export const DICTATION_LIST = '听写 mistakes';
// due before anything else (FSRS schedules from the last review, not the due date); +i keeps the order the parent typed
const firstInLine = (i: number) => new Date(i);

/**
 * Words he wrote wrong in a school 听写 (spec §19 part 3): each becomes writeable and unpaused, and its write card is due now
 * (created if he has none), so 写一写 brings it back first. A word the app doesn't have is added as a school word.
 */
export async function applyDictationMistakes(db: AppDb, text: string, now: Date, strokes: (ch: string) => Promise<'yes' | 'no' | 'unknown'> = strokeAvailability) {
  const { words: parsed, rejected } = parseWordList(text);
  // a word with no stroke data would be skipped in every lesson: report it instead of making it a writing word
  const noStrokes: string[] = [];
  const writable = [];
  for (const p of parsed) {
    if ((await Promise.all(hanChars(p.text).map((c) => strokes(c)))).includes('no')) noStrokes.push(p.text);
    else writable.push(p);
  }
  const existing = await allWords(db);
  // new words are added; a built-in on no list joins the 听写 list, so its 写 choice survives the next launch's re-seed
  const { added, promoted } = makeParentWords(writable, { listName: DICTATION_LIST, writeable: true, existing, now: now.getTime() });
  // first in the new-word queue too, ahead of older unstarted lists (as 朗读 misreads are)
  for (const w of [...added, ...promoted]) w.listedAt = -now.getTime();
  await putWords(db, [...added, ...promoted]);
  const byText = new Map([...existing, ...promoted, ...added].map((w) => [w.text, w]));
  const marked: string[] = [];
  for (const [i, p] of writable.entries()) {
    const w = byText.get(p.text);
    if (!w || marked.includes(w.text)) continue;
    if (w.paused || !w.writeable) await putWords(db, [{ ...w, paused: false, writeable: true }]);
    const id = `${w.id}:write`;
    const card = await getCard(db, id);
    const due = firstInLine(i);
    await putCards(db, [card ? { ...card, fsrs: { ...card.fsrs, due } } : { id, wordId: w.id, kind: 'write', fsrs: { ...newCard(now), due } }]);
    marked.push(w.text);
  }
  return { marked, added: added.map((w) => w.text), skipped: rejected, noStrokes };
}
