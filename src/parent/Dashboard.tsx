import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { voiceTier } from '../audio/voiceTier';
import { loadKnowledge, type Knowledge } from '../app/knowledge';
import { addDays, localDateKey } from '../lib/date';
import { dueTomorrow, minutesPerDay, streak, troubleWords, weeklyAccuracy, wordOf } from '../stats/stats';
import { allSessions, listRecordings, logsSince } from '../store/repo';
import { WeekReadiness } from './WeekReadiness';
import { takeWord, waitingTakes } from '../session/say';
import type { ReviewLog, SessionRecord } from '../types';
import { MinutesChart } from './MinutesChart';
import type { ParentPlace } from './ParentArea';

const KEEP_RECORDINGS = 100;
const BACKUP_NUDGE_DAYS = 14;

interface Data {
  know: Knowledge;
  sessions: SessionRecord[];
  logs: ReviewLog[];
  recordings: number;
  takes: number; // Say takes waiting for the parent (spec 2026-10-11 §6)
  micDenied: boolean;
}

/** The parent's overview. `waiting`: the takes still to review, live, when the queue is on the same page (Today). */
export function Dashboard({ onNavigate, waiting }: { onNavigate: (place: ParentPlace) => void; waiting?: number }) {
  const { db, now, settings, voice } = useApp();
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    void (async () => {
      const t = now();
      const [know, sessions, logs, all] = await Promise.all([loadKnowledge(db), allSessions(db), logsSince(db, addDays(t, -42).getTime()), listRecordings(db)]);
      const takes = waitingTakes(all).length;
      // Say takes have their own queue and tidy themselves: they aren't counted toward "Tidy up" (final review I5)
      const recordings = all.filter((r) => takeWord(r) === null).length;
      let micDenied = false;
      try {
        micDenied = (await navigator.permissions?.query({ name: 'microphone' as PermissionName }))?.state === 'denied';
      } catch {
        micDenied = false; // Safari versions without the microphone permission query
      }
      setD({ know, sessions, logs, recordings, takes, micDenied, });
    })();
  }, []);

  if (!d) return <p>Loading…</p>;
  const takes = waiting ?? d.takes;

  const t = now();
  const today = localDateKey(t);
  // reading only: meaning, words in use, 字辨 and writing each have their own row in Skills
  const readingLogs = d.logs.filter((l) => l.kind === 'recognise' || l.kind === 'hear'); // words he misses by ear are trouble too
  const trouble = troubleWords(readingLogs.filter((l) => l.at >= addDays(t, -30).getTime()));
  const backupDue = settings.lastBackupAt === null || t.getTime() - settings.lastBackupAt > BACKUP_NUDGE_DAYS * 86_400_000;
  const pct = (n: number, target: number) => `${Math.min(100, Math.round((n / target) * 100))}%`;

  return (
    <>
      {!voice && (
        <p class="warning">
          <strong>No Chinese voice found.</strong> Listening cards are off. On the iPad: Settings → Accessibility → Spoken Content →
          Voices → Chinese (China mainland), download a voice, then reopen the app.
        </p>
      )}
      {settings.langdu && (voiceTier() === 'default' || voiceTier() === 'none') && (
        <p class="warning">
          <strong>朗读 uses the iPad's voice as the model.</strong> For natural reading, download a better Chinese voice: Settings →
          Accessibility → Spoken Content → Voices → Chinese (China mainland) → 婷婷 (Enhanced) or Lili (Premium), then reopen the app.
        </p>
      )}
      {d.micDenied && (
        <p class="warning">
          <strong>Microphone is blocked.</strong> Speaking practice is skipped. On the iPad: Settings → Safari → Microphone → Ask or
          Allow, then reopen the app.
        </p>
      )}
      {backupDue && (
        <p class="warning">
          Last backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString() : 'never'}.{' '}
          <button type="button" class="small-btn" onClick={() => onNavigate('backup')}>Back up now</button>
        </p>
      )}
      <WeekReadiness onOpen={() => onNavigate('week')} />
      {d.recordings > KEEP_RECORDINGS && (
        <p class="warning">
          There are {d.recordings} recordings.{' '}
          <button type="button" class="small-btn" onClick={() => onNavigate('recordings')}>Tidy up</button>
        </p>
      )}
      <div class="tiles">
        <div class="tile"><span class="tile__value">{streak(d.sessions, today)} 🔥</span><span class="tile__label">Day streak</span></div>
        <div class="tile">
          <span class="tile__value">{d.know.known} / {settings.targetRecognise}</span>
          <span class="tile__label">Characters recognised</span>
          <div class="progress"><div class="progress__fill" style={{ width: pct(d.know.known, settings.targetRecognise) }} /></div>
        </div>
        <div class="tile">
          <span class="tile__value">{d.know.written} / {settings.targetWrite}</span>
          <span class="tile__label">Characters written</span>
          <div class="progress"><div class="progress__fill" style={{ width: pct(d.know.written, settings.targetWrite) }} /></div>
        </div>
        <div class="tile"><span class="tile__value">{dueTomorrow(d.know.cards, d.know.words, t)}</span><span class="tile__label">Cards due tomorrow</span></div>
        <div class="tile">
          <span class="tile__value">{takes}</span>
          <span class="tile__label">Takes to review</span>
          {takes > 0 && <button type="button" class="small-btn" onClick={() => onNavigate('listen')}>Listen & confirm</button>}
        </div>
      </div>
      <section class="panel"><MinutesChart data={minutesPerDay(d.sessions, today)} /></section>
      <section class="panel">
        <h2>Reading accuracy by week</h2>
        <p>Meaning, words in use, 字辨 and writing are under Progress › Skills.</p>
        <table class="table">
          <thead><tr><th>Week starting</th><th>Correct</th></tr></thead>
          <tbody>
            {weeklyAccuracy(readingLogs, t).map((w) => (
              <tr key={w.weekStart}><td>{w.weekStart}</td><td>{w.accuracy === null ? '—' : `${Math.round(w.accuracy * 100)}%`}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Hard to read (last 30 days)</h2>
        {trouble.length === 0 ? (
          <p>None yet. 🎉</p>
        ) : (
          <table class="table">
            <thead><tr><th>Word</th><th>Pinyin</th><th>Times missed</th></tr></thead>
            <tbody>
              {trouble.map((tw) => {
                const w = wordOf(d.know, tw.wordId); // a ladder 词语 too (final review I8)
                return (
                  <tr key={tw.wordId}>
                    <td class="hanzi" style={{ fontSize: '24px' }}>{w?.text ?? '?'}</td>
                    <td>{w?.pinyin}</td>
                    <td>{tw.misses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
