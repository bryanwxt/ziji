import { Check, Lightbulb } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { Label } from '../Label';

export type SheetTone = 'neutral' | 'good' | 'oops';

interface Props {
  tone?: SheetTone;
  title?: string;
  detail?: ComponentChildren;
  actionLabel: string;
  actionIcon?: ComponentChildren;
  onAction: () => void;
  disabled?: boolean;
}

/** The lesson's one action spot (spec 2026-10-04 §3): docked under the stage; after an answer it slides up as the feedback sheet. */
export function FeedbackSheet({ tone = 'neutral', title, detail, actionLabel, actionIcon, onAction, disabled = false }: Props) {
  return (
    <div class={`sheet sheet--${tone}`} role={tone === 'neutral' ? undefined : 'status'}>
      {tone === 'neutral' ? (
        <span class="spacer" />
      ) : (
        <div class="sheet__msg">
          <span class="sheet__badge" aria-hidden="true">
            {tone === 'good' ? <Check size={34} strokeWidth={3.5} /> : <Lightbulb size={30} strokeWidth={3} />}
          </span>
          <div class="sheet__text">
            {title && <div class="sheet__title"><Label zh={title} /></div>}
            {detail && <div class="sheet__detail">{detail}</div>}
          </div>
        </div>
      )}
      <button type="button" class={`btn btn--big ${tone === 'oops' ? 'btn--oops' : 'btn--primary'}`} disabled={disabled} onClick={() => { if (!disabled) onAction(); }}>
        <Label zh={actionLabel} />{actionIcon}
      </button>
    </div>
  );
}
