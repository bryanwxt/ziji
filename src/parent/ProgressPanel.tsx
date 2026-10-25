// What he can really do (spec 2026-10-06 §3.4), against his book's lists (spec 2026-10-11 §8): the end of his school year as the
// target, where his class is now, and what each term still asks of him. "Learned" is passed: right first answers on two days.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { classLessonAt, courseOf, gradeTerms, lessonLabel, listedBy, schoolYear, termChars, termLessons } from '../content/curriculum';
import { MOE_TERMS } from '../content';
import { wordOf, type Knowledge } from '../stats/stats';
import { produceChars } from '../stats/produce';
import { EVIDENCE_DAYS, weekFromMemory, wordEvidence } from '../stats/fromMemory';
import { logsSince } from '../store/repo';
import type { ReviewLog, Settings } from '../types';
import { toConfirmLine, weeklyTrend } from './progress';

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;
const count = (have: ReadonlySet<string>, list: Iterable<string>) => [...list].filter((ch) => have.has(ch)).length;

/** A bar: how far he is toward his year's target, with a mark where his class is now. */
function Bar({ label, have, of, mark }: { label: string; have: number; of: number; mark: number | null }) {
  return (
    <div class="pbar">
      <span class="pbar__label">{label}</span>
      <div class="pbar__track" role="img" aria-label={`${label}: ${have} of ${of}${mark === null ? '' : `; his class is at ${mark}`}`}>
        <div class="pbar__fill" style={{ width: pct(Math.min(have, of), of) }} />
        {mark !== null && <div class="pbar__mark" style={{ left: pct(mark, of) }} />}
      </div>
      <span class="pbar__nums">{have} / {of}</span>
    </div>
  );
}

/**
 * This week from memory against tapping (real test spec 2026-10-23 §7): earlier words written from memory and how many right, and
 * the words only ever tapped right in the last 14 days, with a link to them in Words.
 */
function MemoryLine({ logs, now, ids, onTapOnly }: { logs: ReviewLog[]; now: Date; ids: ReadonlySet<string>; onTapOnly?: () => void }) {
  const week = weekFromMemory(logs, now);
  // only words he still has: the same set Words' 只点选 filter shows (final review m6)
  const tapOnly = [...wordEvidence(logs, now)].filter(([id, e]) => e.tapOnly && ids.has(id)).length;
  return (
    <div class="progress__memory">
      <p lang="zh-CN">从记忆写出：{week.words} 个旧字，{week.right} 个写对</p>
      <p class="muted">This week (the last 7 days): earlier words written from memory, and how many he got right.</p>
      <p>
        <span lang="zh-CN">只点选</span> (right by tapping, never from memory, last 14 days): {tapOnly} word{tapOnly === 1 ? '' : 's'}
        {tapOnly > 0 && onTapOnly && <> <button type="button" class="small-btn" onClick={onTapOnly}>Show them</button></>}
      </p>
    </div>
  );
}

export function ProgressPanel({ know, settings, now, logs, onTapOnly }: { know: Knowledge; settings: Settings; now: Date; logs?: ReviewLog[]; onTapOnly?: () => void }) {
  const course = courseOf(settings);
  const endTerm = gradeTerms(schoolYear(settings, now))[1];
  const end = termLessons(endTerm).at(-1);
  const target = end === undefined ? null : listedBy(end, course);
  const classAt = classLessonAt(now, settings);
  const atClass = classAt === null ? null : listedBy(classAt, course);
  // can produce (spec 2026-10-11 §3): he writes it (write passed) or says it (Say passed); a 词语 said counts for itself only;
  // can use (production practice spec §4): words he said sentences with (Sentence passed)
  const { write: written, say: said } = produceChars(know.cards, (id) => wordOf(know, id));
  // confirmed, as he sees it (2026-10-25); placement's guesses in the same list on a line of their own
  const read = target ? count(know.confirmedChars, target.read) : know.confirmed;
  const toConfirm = toConfirmLine((target ? count(know.knownChars, target.read) : know.known) - read);
  const wrote = target ? count(written, target.write) : know.written;
  const says = target ? count(said, target.read) : said.size;
  const terms = end === undefined ? [] : MOE_TERMS.slice(0, MOE_TERMS.indexOf(endTerm) + 1);
  const trend = weeklyTrend(know.cards, 'recognise', now);
  return (
    <section class="panel progress-panel">
      {logs && <MemoryLine logs={logs} now={now} ids={new Set(know.words.map((w) => w.id))} onTapOnly={onTapOnly} />}
      <h3>MOE progress</h3>
      <p class="muted">A step counts only after he gets it right on two different days.</p>
      <dl class="progress__counts">
        <dt>Characters recognised</dt><dd>{target ? `${read} of ${target.read.size} by the end of ${endTerm}` : read}{toConfirm && <><br /><small class="muted">{toConfirm}</small></>}</dd>
        <dt>Characters written</dt><dd>{target ? `${wrote} of ${target.write.size}` : know.written}</dd>
        <dt>Characters he can say</dt><dd>{target ? `${says} of ${target.read.size}` : says}</dd>
        {know.begun > 0 && <><dt>Words he can use in a sentence</dt><dd>{`${know.canUse} of ${know.begun} begun`}</dd></>}
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Understood in a sentence</dt><dd>{know.understood}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
        <dt>Used in a sentence</dt><dd>{know.used}</dd>
        <dt>Owned (every step passed)</dt><dd>{know.owned}</dd>
      </dl>
      {target && (
        <div class="progress__bars">
          {classAt !== null && <p class="muted">The mark is where his class is now: {lessonLabel(classAt)}.</p>}
          <Bar label="认读 reads (taps)" have={read} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          <Bar label="会写 Can write" have={wrote} of={target.write.size} mark={atClass ? atClass.write.size : null} />
          <Bar label="会说 Can say" have={says} of={target.read.size} mark={atClass ? atClass.read.size : null} />
          {know.begun > 0 && <Bar label="会用 Can use" have={know.canUse} of={know.begun} mark={null} />}{/* words, against those begun: no list to aim at (production practice spec §4) */}
        </div>
      )}
      {terms.length > 0 && (
        <table class="table progress__terms">
          <thead><tr><th>Term</th><th>Still to read</th><th>Still to write</th></tr></thead>
          <tbody>
            {terms.map((t) => {
              const c = termChars(t, course);
              return <tr key={t}><th scope="row">{t}</th><td>{c.read.filter((ch) => !know.knownChars.has(ch)).length}</td><td>{c.write.filter((ch) => !written.has(ch)).length}</td></tr>;
            })}
          </tbody>
        </table>
      )}
      <h3>Words read, week by week</h3>
      <ol class="progress__trend">{trend.map((w) => <li key={w.week}><span>{w.week}</span> <strong>{w.count}</strong></li>)}</ol>
    </section>
  );
}

/** The Progress tab: loads his cards and the last 14 days' logs, then the panel. `onTapOnly`: open Words on the 只点选 words. */
export function ProgressTab({ onTapOnly }: { onTapOnly?: () => void } = {}) {
  const { db, now, settings } = useApp();
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [logs, setLogs] = useState<ReviewLog[] | undefined>();
  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
    void logsSince(db, now().getTime() - EVIDENCE_DAYS * 86_400_000).then(setLogs);
  }, [db]);
  return know ? <ProgressPanel know={know} settings={settings} now={now()} logs={logs} onTapOnly={onTapOnly} /> : <section class="panel progress-panel"><p class="muted">Loading…</p></section>;
}
