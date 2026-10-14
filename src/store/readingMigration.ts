// Content 1.12 changed nine cards' readings to the ones his lessons use (卜 bo, 应 yīng, 炸 zhá, 种 zhòng, 钻 zuān, 抹 mā, 仔 zǐ,
// 觉 jiào, 勒 lēi). Saying a character and hearing it were practised at the old reading, so those two rungs start again (review
// 2026-10-15); reading it, its meaning and writing it stand. His logs are kept. Runs once (settings.readingsReopened).
import { builtinWordId, READINGS_CHANGED_1_12 } from '../content';
import { newCard } from '../srs/scheduler';
import type { AppDb } from './db';
import { allCards, getSettings, putCards, updateSettings } from './repo';

const VERSION = '1.12';
const REOPENED = new Set(['say', 'hear']);

/** Resets the Say and Hear cards of the characters whose reading changed to New; returns how many. Once per install. */
export async function reopenChangedReadings(db: AppDb, now: Date): Promise<number> {
  if ((await getSettings(db)).readingsReopened === VERSION) return 0;
  const ids = new Set(READINGS_CHANGED_1_12.map(builtinWordId));
  const reopened = (await allCards(db))
    .filter((c) => ids.has(c.wordId) && REOPENED.has(c.kind))
    .map(({ passed: _passed, guess: _guess, ...c }) => ({ ...c, fsrs: newCard(now) }));
  if (reopened.length) await putCards(db, reopened);
  await updateSettings(db, { readingsReopened: VERSION });
  return reopened.length;
}
