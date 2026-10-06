import { schoolTerm } from '../content';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { addDays } from '../lib/date';
import { bandLevel, rankBands } from '../placement/walk';
import { bringForward } from '../session/record';
import { SKILL_CARD, SKILLS, skillAccuracy, topMissed } from '../stats/skills';
import { allCards, allWords, answersSince, getSettings, listRecordings, logsSince, updateSettings } from '../store/repo';
import type { AnswerLog, CardRecord, Recording, ReviewLog, Settings, Skill, Word } from '../types';

const LABEL: Record<Skill, string> = {
  listening: 'Listening (understands the word when he hears it)',
  reading: 'Reading (认一认)',
  meaning: 'Meaning (认一认)',
  use: 'Words in use (选一选/用一用)',
  zibian: 'Look-alike characters (字辨)',
  writing: 'Writing (写一写)',
};
const DAYS = 14;

interface Data { logs: ReviewLog[]; answers: AnswerLog[]; words: Word[]; cards: CardRecord[]; reads: Recording[]; settings: Settings }

/** The parent's view of each skill (spec §19 part 7): 14-day accuracy, the class baseline they typed in, the last placement, and the words to practise more. */
export function SkillsPanel() {
  const { db, now, refresh } = useApp();
  const [d, setD] = useState<Data | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const since = addDays(now(), -DAYS).getTime();
    const [logs, answers, words, cards, recordings, settings] = await Promise.all([
      logsSince(db, since), answersSince(db, since), allWords(db), allCards(db), listRecordings(db), getSettings(db),
    ]);
    const reads = recordings.filter((r) => r.prompt.kind === 'passage' && r.createdAt >= since);
    setD({ logs, answers, words, cards, reads, settings });
  };
  useEffect(() => void load(), []);
  const typing = useRef(new Map<Skill, { value: string; t: ReturnType<typeof setTimeout> }>()); // baselines typed, not yet saved
  const alive = useRef(true);
  const save = useRef<((s: Skill, value: string) => Promise<void>) | null>(null); // the latest setBaseline (defined once the data is in)
  useEffect(() => () => { // leaving: what was typed is saved, one box after another
    alive.current = false;
    const left = [...typing.current.entries()];
    typing.current.clear();
    void left.reduce((p, [s, { value, t }]) => { clearTimeout(t); return p.then(() => save.current?.(s, value)); }, Promise.resolve());
  }, []);
  if (!d) return <p>Loading…</p>;

  const acc = skillAccuracy(d.logs, d.answers);
  const byId = new Map(d.words.map((w) => [w.id, w]));
  const bands = rankBands(d.words);
  // where a band sits: his school term (P2 term 2, 二下) while it's within his textbook's lists, else its HSK level
  const hsk = (band: number) => {
    if (band < 0) return 'none yet';
    const term = schoolTerm(bands[Math.min(band, bands.length - 1)]?.at(-1)?.text ?? '');
    if (term) return `P${'一二三四五六'.indexOf(term[0]!) + 1} term ${term[1] === '上' ? 1 : 2} (${term})`;
    return bandLevel(bands, band) >= 7 ? 'HSK 7–9' : `HSK ${bandLevel(bands, band)}`;
  };
  const p = d.settings.placementResult;
  const pct = (s: Skill) => (acc[s].total ? Math.round((acc[s].right * 100) / acc[s].total) : null);

  const setBaseline = async (s: Skill, value: string) => {
    clearTimeout(typing.current.get(s)?.t);
    typing.current.delete(s);
    const n = Math.round(Number(value));
    const baselines = { ...(await getSettings(db)).baselines }; // what is stored: another box may have just saved
    if (value.trim() === '' || !Number.isFinite(n)) delete baselines[s];
    else baselines[s] = Math.min(100, Math.max(0, n));
    await updateSettings(db, { baselines });
    if (!alive.current) return;
    setD((cur) => (cur ? { ...cur, settings: { ...cur.settings, baselines } } : cur));
    await refresh();
  };
  save.current = setBaseline;
  // saved after a pause in typing too: on iPad Safari leaving by a tab may never fire change (sweep)
  const typed = (s: Skill, value: string) => {
    clearTimeout(typing.current.get(s)?.t);
    typing.current.set(s, { value, t: setTimeout(() => void setBaseline(s, value), 800) });
  };
  const practise = async (s: Skill, wordId: string) => {
    const kind = SKILL_CARD[s] === 'write' && !d.cards.some((c) => c.id === `${wordId}:write`) ? 'recognise' : SKILL_CARD[s];
    await bringForward(db, wordId, kind, now());
    setMessage(`${byId.get(wordId)?.text ?? wordId} comes back in the next lesson.`);
    await load();
  };
  const loud = d.reads.filter((r) => typeof r.level === 'number');

  return (
    <section class="panel skills">
      <h2>Skills</h2>
      <p>
        {p
          ? `Placement (${new Date(p.at).toLocaleDateString()}) — Reading: ${hsk(p.reading)} · Understanding: ${hsk(p.understanding)}`
          : 'Placement: not done yet'}
      </p>
      {d.settings.pace && <p>New words: {Math.min(d.settings.pace.perDay, d.settings.newPerDay)} a day — {d.settings.pace.reason} (most {d.settings.newPerDay})</p>}
      {p && p.missed.length > 0 && <p class="hanzi">Missed in placement: {p.missed.slice(0, 12).map((id) => byId.get(id)?.text ?? '').join(' ')}</p>}
      <table class="skills__table">
        <thead>
          <tr><th>Skill</th><th>Last {DAYS} days</th><th>Class baseline (% right)</th><th>Difference</th></tr>
        </thead>
        <tbody>
          {SKILLS.map((s) => {
            const now = pct(s);
            const base = d.settings.baselines?.[s];
            return (
              <tr key={s}>
                <td>{LABEL[s]}</td>
                <td>{now === null ? '—' : `${now}% (${acc[s].total})`}</td>
                <td>
                  <input type="number" min={0} max={100} aria-label={`Class baseline for ${LABEL[s]} (% right)`} defaultValue={base === undefined ? '' : String(base)}
                    onInput={(e) => typed(s, e.currentTarget.value)} onChange={(e) => void setBaseline(s, e.currentTarget.value)} /> {/* saved when he's done typing, not per keystroke */}
                </td>
                <td>{now === null || base === undefined ? '—' : `${now - base >= 0 ? '+' : ''}${now - base}`}</td>
              </tr>
            );
          })}
          <tr>
            <td>Reading aloud (朗读)</td>
            <td>{d.reads.length ? `${d.reads.length} reads` : '—'}</td>
            <td colSpan={2}>{loud.length ? `average loudness ${Math.round((loud.reduce((n, r) => n + r.level!, 0) / loud.length) * 1000) / 10}` : ''}</td>
          </tr>
        </tbody>
      </table>
      <h3>Missed most (last {DAYS} days)</h3>
      {SKILLS.map((s) => {
        const missed = topMissed(d.logs, d.answers, s);
        if (!missed.length) return null;
        return (
          <div key={s} class="skills__missed">
            <h4>{LABEL[s]}</h4>
            <ul>
              {missed.map((m) => {
                const text = byId.get(m.wordId)?.text ?? m.wordId;
                return (
                  <li key={m.wordId}>
                    <span class="hanzi">{text}</span> × {m.misses}{' '}
                    <button type="button" class="small-btn" aria-label={`Practise ${text} more (${LABEL[s]})`} onClick={() => void practise(s, m.wordId)}>Practise more</button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
