// Progress → Week summary (parent loop spec §5, 2026-10-18 update): Monday to Sunday, the family's talk next to his app progress,
// one focus line for next week, last week a tap away, and Share the week.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { shareText, weekText, type ShareResult } from '../talk/share';
import { shortDate, type WeekRange, type WeekSummary } from '../talk/week';
import { loadWeek } from '../talk/weekLoad';
import type { ParentPlace } from './ParentArea';
import { ShareNote } from './ShareNote';

const list = (xs: readonly string[]) => (xs.length ? xs.join('、') : '—');

/** The week's rows (presentational: the WebKit stage case renders it too). `shared`: what Share the week did; `text`: what it
 *  sent, shown to copy by hand when nothing else took it. */
export function WeekView({ range, summary: s, back, onBack, onNavigate, onShare, shared = null, text = '' }: {
  range: WeekRange; summary: WeekSummary; back: number; onBack: (back: number) => void; onNavigate: (place: ParentPlace) => void; onShare: () => void;
  shared?: ShareResult | null; text?: string;
}) {
  return (
    <section class="panel week-summary" aria-labelledby="week-summary-title">
      <h2 class="parent__section-title" id="week-summary-title">Week summary</h2>
      <div class="segmented segmented--two" role="tablist" aria-label="Which week">
        <button type="button" role="tab" aria-selected={back === 0} class={`segmented__opt ${back === 0 ? 'is-active' : ''}`} onClick={() => onBack(0)}>This week</button>
        <button type="button" role="tab" aria-selected={back === 1} class={`segmented__opt ${back === 1 ? 'is-active' : ''}`} onClick={() => onBack(1)}><span lang="zh-CN">上周</span> Last week</button>
      </div>
      <p class="week-summary__range">{shortDate(range.from)} – {shortDate(range.to)}</p>
      <dl class="week-summary__rows">
        <dt>Talk</dt><dd>{s.talk.days} day{s.talk.days === 1 ? '' : 's'} · {s.talk.minutes} min</dd>
        <dt>Lessons</dt><dd>{s.lessons} · <span lang="zh-CN">朗读</span> on {s.langduDays} day{s.langduDays === 1 ? '' : 's'}</dd>
        <dt>Newly can</dt><dd>read <span lang="zh-CN">{list(s.newly.read)}</span> · write <span lang="zh-CN">{list(s.newly.write)}</span> · say <span lang="zh-CN">{list(s.newly.say)}</span></dd>
        <dt>New words</dt><dd lang="zh-CN">{list(s.newWords)}</dd>
        <dt>Missed most</dt><dd lang="zh-CN">{list(s.shaky)}</dd>
        <dt><span lang="zh-CN">朗读</span></dt>
        <dd>{s.reading.length ? s.reading.map((r) => <span key={r.passageId} class="week-summary__read"><span lang="zh-CN">《{r.title}》</span>{r.meaning === 'right' ? ' ✓' : r.meaning === 'missed' ? ' ✗ question missed' : ''}</span>) : '—'}</dd>
        {s.waiting > 0 && (<><dt>Waiting</dt><dd>{s.waiting} take{s.waiting === 1 ? '' : 's'} <button type="button" class="small-btn" onClick={() => onNavigate('listen')}>Listen & confirm</button></dd></>)}
      </dl>
      <div class="week-summary__focus">
        <p><strong>Focus next week</strong></p>
        <p lang="zh-CN">{s.focus.zh}</p>
        <p class="hint">{s.focus.en}</p>
      </div>
      <div class="week-summary__share">
        <button type="button" class="small-btn" onClick={onShare}>Share the week</button>
        <ShareNote result={shared} text={text} label="The week, to copy" />
      </div>
    </section>
  );
}

export function WeekSummaryPanel({ onNavigate }: { onNavigate: (place: ParentPlace) => void }) {
  const { db, now } = useApp();
  const [back, setBack] = useState(0);
  const [week, setWeek] = useState<{ range: WeekRange; summary: WeekSummary } | null>(null);
  const [shared, setShared] = useState<ShareResult | null>(null);
  useEffect(() => {
    setShared(null);
    void loadWeek(db, now(), back).then(setWeek);
  }, [back]);
  if (!week) return <p>Loading…</p>;
  // worked out once loaded: the tap calls shareText first, with nothing awaited before it (iOS opens the sheet only then)
  const text = weekText(week.range, week.summary);
  const share = () => { void shareText(text).then(setShared); };
  return <WeekView range={week.range} summary={week.summary} back={back} onBack={setBack} onNavigate={onNavigate} onShare={share} shared={shared} text={text} />;
}
