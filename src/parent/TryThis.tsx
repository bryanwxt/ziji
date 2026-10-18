// The top of Today (2026-10-18 update): one line, "This week, try this", and one button to where it is done.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadTrySignals, tryThis, type TryAction } from '../talk/tryThis';
import type { ParentPlace } from './ParentArea';

/** `waiting`: the takes still to review, live from Today's queue; `talked`: bumped when a talk is logged or undone; `onAction`:
 *  the line once worked out (Today quiets the readiness line's weak words when this line names them). */
export function TryThis({ onNavigate, waiting, talked = 0, onAction }: {
  onNavigate: (place: ParentPlace) => void; waiting?: number | null; talked?: number; onAction?: (action: TryAction) => void;
}) {
  const { db, now, settings } = useApp();
  const [action, setAction] = useState<TryAction | null>(null);
  useEffect(() => {
    void loadTrySignals(db, now(), settings, waiting ?? undefined).then((s) => { const a = tryThis(s); setAction(a); onAction?.(a); });
  }, [waiting, talked]);
  return action ? <TryLine action={action} onNavigate={onNavigate} /> : null;
}

/** The line itself (presentational: the WebKit stage case renders it too). */
export function TryLine({ action, onNavigate }: { action: TryAction; onNavigate: (place: ParentPlace) => void }) {
  return (
    <div class="try-this" role="note" aria-label="This week, try this">
      <p class="try-this__head">This week, try this</p>
      <p class="try-this__text">{action.text}</p>
      {action.button && action.place && <button type="button" class="small-btn" onClick={() => onNavigate(action.place!)}>{action.button}</button>}
    </div>
  );
}
