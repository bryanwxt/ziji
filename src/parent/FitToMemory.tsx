import { useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { compareIntervals, formatDays, type IntervalStep } from '../srs/compare';
import { fitData } from '../srs/fitData';
import { fitParameters } from '../srs/optimizer';
import { setSchedulerParams } from '../srs/scheduler';
import { updateSettings } from '../store/repo';
import type { CardRecord, ReviewLog, Settings } from '../types';

export const FIT_MIN_REVIEWS = 1000;
export const REFIT_AFTER = 500;

type Phase = { kind: 'idle' } | { kind: 'fitting' } | { kind: 'result'; w: number[]; rows: IntervalStep[] } | { kind: 'message'; text: string };

const num = (n: number) => n.toLocaleString('en-US');
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Fit to his memory (SRS tuning spec §6.2): at 1,000 reviews the parent fits FSRS's parameters to his own logs, sees what changes
 * for one sample word, and uses them or keeps the default. The optimizer loads only on the tap.
 */
export function FitToMemory({ logs, cards, settings, onChange }: { logs: ReviewLog[]; cards: CardRecord[]; settings: Settings; onChange: () => Promise<void> }) {
  const { db, now, refresh } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const data = fitData(logs, cards);
  const fitted = settings.fsrs;
  const canFit = fitted ? data.count >= fitted.reviews + REFIT_AFTER : data.count >= FIT_MIN_REVIEWS;

  const busy = useRef(false); // a double tap fits once (a tap can land before the disabled button re-renders)
  const fit = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setPhase({ kind: 'fitting' });
      await new Promise((r) => setTimeout(r, 50)); // let "Fitting…" paint before the optimizer takes the main thread
      const r = await fitParameters(data);
      if (r.ok) setPhase({ kind: 'result', w: r.w, rows: compareIntervals(r.w) });
      else setPhase({ kind: 'message', text: r.reason === 'offline' ? "Couldn't load the fitting tool — it needs the internet the first time. Try again when online." : "Couldn't fit — keeping the default." });
    } finally {
      busy.current = false;
    }
  };
  const use = async (w: number[]) => {
    await updateSettings(db, { fsrs: { w, fittedAt: now().getTime(), reviews: data.count } });
    setSchedulerParams(w); // new parameters apply from each card's next review; cards keep their state
    setPhase({ kind: 'message', text: 'Using his fitted memory.' });
    await refresh();
    await onChange();
  };
  const backToDefault = async () => {
    await updateSettings(db, { fsrs: undefined });
    setSchedulerParams(null);
    setPhase({ kind: 'message', text: 'Back to the default.' });
    await refresh();
    await onChange();
  };

  return (
    <div class="skills__fit">
      <h3>Fit to his memory</h3>
      {fitted ? (
        <p>
          Fitted on {num(fitted.reviews)} reviews, {day(fitted.fittedAt)}.{' '}
          <button type="button" class="small-btn" onClick={() => void backToDefault()}>Back to default</button>{' '}
          <button type="button" class="small-btn" disabled={!canFit || phase.kind === 'fitting'} onClick={() => void fit()}>Fit again</button>
          {!canFit && <span> (after {num(fitted.reviews + REFIT_AFTER)} reviews; now {num(data.count)})</span>}
        </p>
      ) : (
        <p>
          {data.count < FIT_MIN_REVIEWS ? `Fit to his memory: ${num(data.count)} / ${num(FIT_MIN_REVIEWS)} reviews` : `${num(data.count)} reviews to fit on.`}{' '}
          <button type="button" class="small-btn" disabled={!canFit || phase.kind === 'fitting'} onClick={() => void fit()}>Fit to his memory</button>
        </p>
      )}
      {phase.kind === 'fitting' && <p role="status">Fitting…</p>}
      {phase.kind === 'result' && (
        <div>
          <table class="skills__compare">
            <thead><tr><th>Sample word</th><th>Default</th><th>Fitted</th></tr></thead>
            <tbody>
              {phase.rows.map((r) => (
                <tr key={r.label}><td>{r.label}</td><td>{formatDays(r.before)}</td><td>{formatDays(r.after)}</td></tr>
              ))}
            </tbody>
          </table>
          <div class="skills__fit-actions">
            <button type="button" class="btn btn--primary" onClick={() => void use(phase.w)}>Use these</button>
            <button type="button" class="btn" onClick={() => setPhase({ kind: 'idle' })}>Keep default</button>
          </div>
        </div>
      )}
      {phase.kind === 'message' && <p role="status">{phase.text}</p>}
    </div>
  );
}
