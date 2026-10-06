// What he can really do (spec 2026-10-06 §3.4): words heard, read, used and owned, characters against the MOE target to date.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { moeTargets } from '../content';
import type { Knowledge } from '../stats/stats';
import type { Settings } from '../types';
import { currentTerm, schoolYear, weeklyTrend } from './progress';

export function ProgressPanel({ know, settings, now }: { know: Knowledge; settings: Settings; now: Date }) {
  const term = currentTerm(schoolYear(settings, now), now);
  const target = term ? moeTargets(term, settings.course ?? 'cl') : null;
  const trend = weeklyTrend(know.cards, 'recognise', now);
  return (
    <section class="panel progress">
      <h2>Progress</h2>
      <p class="muted">A step counts only after he gets it right on two different days.</p>
      <dl class="progress__counts">
        <dt>Characters recognised</dt><dd>{target ? `${know.known} of ${target.read} by the end of ${term}` : know.known}</dd>
        <dt>Characters written</dt><dd>{target ? `${know.written} of ${target.write}` : know.written}</dd>
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
        <dt>Used in a sentence</dt><dd>{know.used}</dd>
        <dt>Owned (every step passed)</dt><dd>{know.owned}</dd>
      </dl>
      <h3>Words read, week by week</h3>
      <ol class="progress__trend">{trend.map((w) => <li key={w.week}><span>{w.week}</span> <strong>{w.count}</strong></li>)}</ol>
    </section>
  );
}

/** The Progress tab: loads his cards, then the panel. */
export function ProgressTab() {
  const { db, now, settings } = useApp();
  const [know, setKnow] = useState<Knowledge | null>(null);
  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
  }, [db]);
  return know ? <ProgressPanel know={know} settings={settings} now={now()} /> : <section class="panel progress"><p class="muted">Loading…</p></section>;
}
