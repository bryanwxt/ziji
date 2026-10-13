import { useMemo } from 'preact/hooks';
import { RETENTION_MIN, RETENTION_TARGET, retention, type Retention, type RetentionLine } from '../stats/retention';
import type { ReviewLog } from '../types';

const LINE_LABEL: Record<RetentionLine, string> = { taps: 'Taps (reading, meaning, listening)', writing: 'Writing (写一写)' };
const NOTE = { low: "He's forgetting more than planned — reviews may be too far apart.", high: 'Reviews come sooner than he needs.' } as const;

function figure(r: Retention): string {
  if (r.rate === null) return `Measuring — ${r.counted} of ${RETENTION_MIN} reviews`;
  return `${Math.round(r.rate * 100)}% of ${r.counted} reviews`;
}

/** "Remembered after a gap" (SRS tuning spec §5): his real retention, per line, against the 90% FSRS aims for. */
export function RetentionCheck({ logs, now }: { logs: ReviewLog[]; now: Date }) {
  const r = useMemo(() => retention(logs, now), [logs]); // now() ticks every render; the logs change on load
  return (
    <div class="skills__retention">
      <h3>Remembered after a gap (last 30 days, target {Math.round(RETENTION_TARGET * 100)}%)</h3>
      <ul>
        {(Object.keys(LINE_LABEL) as RetentionLine[]).map((line) => (
          <li key={line}>
            {LINE_LABEL[line]}: {figure(r[line])}
            {r[line].note && <p class="skills__note">{NOTE[r[line].note!]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
