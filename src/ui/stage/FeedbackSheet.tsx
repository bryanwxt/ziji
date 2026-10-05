import { Check, Lightbulb } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
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

/** How long 真厉害 shows after a right answer before the lesson moves on by itself (parent, 2026-10-05: fewer taps). */
export const AUTO_NEXT_MS = 1400;

/**
 * The lesson's one action spot (spec 2026-10-04 §3): docked under the stage; after an answer it slides up as the feedback sheet.
 * A right answer goes on by itself after a short pause (a tap on the button goes at once); a miss waits for him to read it.
 */
export function FeedbackSheet({ tone = 'neutral', title, detail, actionLabel, actionIcon, onAction, disabled = false }: Props) {
  const gone = useRef(false);
  const latest = useRef(onAction);
  latest.current = onAction;
  const go = () => {
    if (disabled) return;
    if (tone === 'good') { // the pause or a tap, whichever is first: never both
      if (gone.current) return;
      gone.current = true;
    }
    latest.current();
  };
  useEffect(() => {
    gone.current = false; // each right answer slides the sheet up anew
    if (tone !== 'good' || disabled) return;
    const t = setTimeout(go, AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [tone, disabled]);
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
      <button type="button" class={`btn btn--big ${tone === 'oops' ? 'btn--oops' : 'btn--primary'}`} disabled={disabled} onClick={go}>
        <Label zh={actionLabel} />{actionIcon}
      </button>
    </div>
  );
}
