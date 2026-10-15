// "Known" means he can produce it (spec 2026-10-11 §3): a character or word whose write card has passed, or whose Say rung has.
// A 词语's Say pass counts for the 词语, not for its characters.
import { hanChars } from '../content';
import { fastLimit, passDays, sayDays } from '../ladder/rungs';
import type { CardRecord, ReviewLog, Word } from '../types';

/** The words (ids) whose write card or Say rung passed in (from, to]. */
export interface Produced { write: string[]; say: string[] }

export function producedBetween(cards: CardRecord[], from: number, to: number): Produced {
  const inside = (c: CardRecord) => c.passed !== undefined && c.passed > from && c.passed <= to;
  return {
    write: cards.filter((c) => c.kind === 'write' && inside(c)).map((c) => c.wordId),
    say: cards.filter((c) => c.kind === 'say' && inside(c)).map((c) => c.wordId),
  };
}

/** A lesson's stars (spec §5): one for each character or word that newly can be produced, and never fewer than one. */
export const lessonStars = (p: { write: number; say: number }): number => Math.max(1, p.write + p.say);

/** How many words "closest" names. */
export const CLOSEST_MAX = 3;

/** A word one more day from "can produce" (spec 2026-10-11 §5): which skill, and when its day was. */
export interface OneDayAway { text: string; kind: 'write' | 'say'; at: number }

/** Words with a write card at one passing day or a Say rung at one confirmed day, the most recent first, each word once. */
export function oneDayAway(cards: CardRecord[], logs: ReviewLog[], wordOf: (id: string) => Word | undefined): OneDayAway[] {
  const fastWrite = fastLimit(logs, 'write');
  const near: OneDayAway[] = [];
  for (const c of cards) {
    if (c.passed || (c.kind !== 'write' && c.kind !== 'say')) continue;
    const text = wordOf(c.wordId)?.text;
    if (!text) continue;
    if (c.kind === 'write') {
      const days = passDays(logs, c.id, fastWrite);
      if (days.length === 1) near.push({ text, kind: 'write', at: days[0]! });
    } else {
      const days = sayDays(logs, c.id);
      const at = logs.filter((l) => l.cardId === c.id && l.correct).reduce((m, l) => Math.max(m, l.at), 0);
      if (days.length === 1) near.push({ text, kind: 'say', at });
    }
  }
  const seen = new Set<string>();
  return near.sort((a, b) => b.at - a.at).filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)));
}

/** The words one more day from "can produce" (spec §5: 「还差一天：森、林」), at most 3. */
export function closestToProduce(cards: CardRecord[], logs: ReviewLog[], wordOf: (id: string) => Word | undefined): string[] {
  return oneDayAway(cards, logs, wordOf).map((x) => x.text).slice(0, CLOSEST_MAX);
}

/** The line under the stars (spec §5): what he can now do, or what is one day away; null when neither. */
export function producedLine(produced: { write: number; say: number } | undefined, closest: string[] | undefined): string | null {
  if (produced && (produced.write || produced.say)) {
    const parts = [produced.write ? `会写 ${produced.write} 个新字` : null, produced.say ? `会说 ${produced.say} 个${produced.write ? '' : '新字'}` : null];
    return `今天你${parts.filter(Boolean).join('，')}！`;
  }
  return closest?.length ? `还差一天：${closest.join('、')}` : null;
}

/** The characters he can write, and those he can say (a 词语 said counts for itself, not its characters): the Progress bars. */
export function produceChars(cards: CardRecord[], wordOf: (id: string) => Word | undefined): { write: Set<string>; say: Set<string> } {
  const passed = (kind: 'write' | 'say') => cards.filter((c) => c.kind === kind && c.passed).map((c) => wordOf(c.wordId)?.text ?? '');
  return {
    write: new Set(passed('write').flatMap((t) => hanChars(t))),
    say: new Set(passed('say').filter((t) => hanChars(t).length === 1)),
  };
}
