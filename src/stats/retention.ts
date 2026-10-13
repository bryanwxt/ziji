// "Remembered after a gap" (SRS tuning spec §5): of the cards he met again after a real gap, the share he still knew. FSRS aims
// for 90% at the moment a card is due; this checks it does, from logs that keep the card's state (written from this release on).
import { State } from 'ts-fsrs';
import { localDateKey } from '../lib/date';
import type { CardKind, ReviewLog } from '../types';

export const RETENTION_DAYS = 30;
export const RETENTION_MIN = 30;
export const RETENTION_TARGET = 0.9;
export const RETENTION_LOW = 0.85;
export const RETENTION_HIGH = 0.95;

export type RetentionLine = 'taps' | 'writing';
const LINE_OF: Partial<Record<CardKind, RetentionLine>> = { recognise: 'taps', meaning: 'taps', hear: 'taps', understand: 'taps', write: 'writing' }; // Say and 说一句: the parent's verdicts

export interface Retention {
  counted: number; // first-of-the-day reviews of a card in Review, last 30 days
  remembered: number; // of those, not rated Again
  rate: number | null; // remembered / counted once 30 are counted; null while measuring
  note: 'low' | 'high' | null; // under 85%: forgetting more than planned; over 95%: reviews come sooner than he needs
}

export function retention(logs: ReviewLog[], now: Date): Record<RetentionLine, Retention> {
  const since = now.getTime() - RETENTION_DAYS * 86_400_000;
  const firsts = new Map<string, ReviewLog>(); // card + local day → its first review that day
  const windowed = logs.filter((l) => l.at >= since && l.at <= now.getTime()); // the window first: the sort then touches 30 days, not all
  for (const l of windowed.sort((a, b) => a.at - b.at)) {
    const key = `${l.cardId}|${localDateKey(new Date(l.at))}`;
    if (!firsts.has(key)) firsts.set(key, l);
  }
  const out = { taps: { counted: 0, remembered: 0 }, writing: { counted: 0, remembered: 0 } };
  for (const l of firsts.values()) {
    const line = LINE_OF[l.kind];
    if (!line || l.state !== State.Review) continue;
    out[line].counted++;
    if (l.rating !== 1) out[line].remembered++; // 1 = Again
  }
  const finish = ({ counted, remembered }: { counted: number; remembered: number }): Retention => {
    const rate = counted >= RETENTION_MIN ? remembered / counted : null;
    const note = rate === null ? null : rate < RETENTION_LOW ? 'low' : rate > RETENTION_HIGH ? 'high' : null;
    return { counted, remembered, rate, note };
  };
  return { taps: finish(out.taps), writing: finish(out.writing) };
}
