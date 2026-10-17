import type { WeekDay } from '../stats/stats';
import { Label } from '../ui/Label';

/**
 * 一 to 日: a filled ink circle for each day a lesson was finished this week, or with only 考考自己 (practice, parent ruling
 * 2026-10-17); the streak's forgiven day reads 休 (休息日, spec 2026-10-11 §5).
 */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  const n = days.filter((d) => d.done || d.practised).length;
  const rest = days.some((d) => d.rest);
  return (
    <div class="week" role="img" aria-label={`这个星期练了 ${n} 天${rest ? '，休息日 1 天' : ''}`}>
      {days.map((d) => (
        <span key={d.date} class={`week__day${d.done || d.practised ? ' is-done' : ''}${d.rest ? ' is-rest' : ''}${d.today ? ' is-today' : ''}`} title={d.rest ? '休息日' : undefined}>
          <i class="week__dot" />
          <Label zh={d.rest ? '休' : d.label} />
        </span>
      ))}
    </div>
  );
}
