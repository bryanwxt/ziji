import type { StepKind } from '../types';
import { InkIcon } from './icons/InkIcon';
import type { IconName } from './icons/icons';

const ICONS: Record<StepKind, IconName | null> = { flashcards: null, choose: 'speech', writing: 'pen', components: 'fish', speaking: 'mic', wrapup: 'star', newwords: null, practice: 'speech' };

export function ProgressBar({ steps, stepIndex, fraction }: { steps: StepKind[]; stepIndex: number; fraction: number }) {
  const pct = Math.round(fraction * 100);
  return (
    <div class="progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div class="progressbar__track">
        <div class="progressbar__fill" style={{ width: `${pct}%` }} />
      </div>
      {steps.map((s, i) => (
        <span
          key={s}
          class={`progressbar__cp ${i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''}`}
          style={{ left: `${((i + 1) / steps.length) * 100}%` }}
          aria-hidden="true"
        >
          {ICONS[s] ? <InkIcon name={ICONS[s]!} size={22} /> : <span class="hanzi">字</span>}
        </span>
      ))}
    </div>
  );
}
