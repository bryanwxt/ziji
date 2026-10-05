import { addExtraDay } from './cycle';
import { getCard, getWord, putCards, putWords, updateKid, updateRecording } from '../store/repo';
import type { AppDb } from '../store/db';
import type { Recording } from '../types';

/**
 * The parent confirmed which characters he misread in a 朗读 recording: each becomes a priority word
 * (an existing card is due now; otherwise the built-in word jumps to the front of new words), and the
 * passage gets one extra day if it is still today's passage.
 */
export async function applyMisreads(db: AppDb, recording: Recording, chars: string[], now: Date): Promise<{ updated: number; notInApp: string[] }> {
  const before = new Set(recording.misread ?? []);
  // the passage's extra day comes with the first marks only: saving again, or unmarking and marking again, doesn't add another
  const giveDay = chars.length > 0 && before.size === 0 && !recording.extraDayGiven && recording.prompt.kind === 'passage';
  // (marks saved before the flag existed got their day then)
  await updateRecording(db, { ...recording, misread: chars, ...(giveDay || recording.extraDayGiven || before.size > 0 ? { extraDayGiven: true } : {}) });
  let updated = 0;
  const notInApp: string[] = [];
  for (const ch of chars) {
    const id = `b:${ch}`;
    const card = await getCard(db, `${id}:recognise`);
    if (card) {
      await putCards(db, [{ ...card, fsrs: { ...card.fsrs, due: now } }]);
      updated++;
      continue;
    }
    const word = await getWord(db, id);
    // ahead of every school list (lists use their add time); the newest marks come first
    if (word) {
      const mark = -now.getTime();
      const stillMarked = word.misreadMark !== undefined && word.listedAt === word.misreadMark;
      const prev = stillMarked ? (word.misreadPrev ?? null) : (word.listedAt ?? null); // remember its place (a class list, a 听写 mark…)
      await putWords(db, [{ ...word, listedAt: mark, misreadMark: mark, misreadPrev: prev }]);
      updated++;
    } else notInApp.push(ch);
  }
  // unmarked since the last save: it goes back to where it was, unless something else (a 听写 mistake) has moved it since
  for (const ch of before) {
    if (chars.includes(ch)) continue;
    const word = await getWord(db, `b:${ch}`);
    if (!word) continue;
    const { misreadMark, misreadPrev, listedAt, ...rest } = word;
    if (misreadMark === undefined) {
      if ((listedAt ?? 0) < 0 && !word.listName) await putWords(db, [rest]); // a mark saved before marks remembered their place
      continue;
    }
    const back = listedAt === misreadMark ? misreadPrev : listedAt;
    await putWords(db, [back == null ? rest : { ...rest, listedAt: back }]);
  }
  if (giveDay && recording.prompt.kind === 'passage') {
    const passageId = recording.prompt.passageId;
    await updateKid(db, (kid) => ({ ...kid, reading: addExtraDay(kid.reading, passageId) }));
  }
  return { updated, notInApp };
}
