// Listen & confirm (spec 2026-10-11 §6): his Say takes, oldest first; the parent plays his take and the model, then ✓ or ✗.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { findWord } from '../ladder/words';
import { reviewTake, takeWord, waitingTakes } from '../session/say';
import { listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';

/** The queue's rows: the word with its pinyin, his take, the model, ✓ and ✗ (the stage cases show it with takes in memory). */
export function ListenRows({ takes, words, onJudge }: { takes: Recording[]; words: ReadonlyMap<string, Word>; onJudge: (r: Recording, verdict: 'ok' | 'no') => void }) {
  const cache = useRef(new Map<string, string>()); // one object URL per take across reloads, so a take being played is not cut off
  for (const r of takes) if (!cache.current.has(r.id)) cache.current.set(r.id, URL.createObjectURL(r.blob));
  const urls = cache.current;
  useEffect(() => {
    const listed = new Set(takes.map((r) => r.id));
    for (const [id, u] of cache.current) if (!listed.has(id)) { URL.revokeObjectURL(u); cache.current.delete(id); }
  }, [takes]);
  useEffect(() => () => { cache.current.forEach((u) => URL.revokeObjectURL(u)); cache.current.clear(); }, []);
  if (takes.length === 0) return <p>Nothing to listen to. New takes appear here after his lessons.</p>;
  return (
    <table class="table">
      <tbody>
        {takes.map((r) => {
          const w = words.get(takeWord(r)!);
          const label = w?.text ?? takeWord(r) ?? '';
          return (
            <tr key={r.id} class="listen__row">
              <td>
                <span class="hanzi listen__word">{w?.text ?? '?'}</span> <span class="listen__py">{w?.pinyin}</span>
                <br />
                <small>{new Date(r.createdAt).toLocaleString()}</small>
              </td>
              <td><audio controls preload="none" src={urls.get(r.id)} aria-label="His take" /></td>
              <td>{w && <SpeakButton text={w.text} reading={w.pinyin} />}</td>
              <td class="listen__verdict">
                <button type="button" class="small-btn" aria-label={`Said right: ${label}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                <button type="button" class="small-btn" aria-label={`Not right: ${label}`} onClick={() => onJudge(r, 'no')}>✗</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ListenPanel({ onReviewed }: { onReviewed?: () => void }) {
  const { db, now } = useApp();
  const [takes, setTakes] = useState<Recording[] | null>(null);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [error, setError] = useState(false);
  const busy = useRef(new Set<string>()); // a double tap on ✓ reviews a take once
  const reload = async () => {
    const waiting = waitingTakes(await listRecordings(db));
    const ids = [...new Set(waiting.map((r) => takeWord(r)!))];
    const found = await Promise.all(ids.map(async (id) => [id, await findWord(db, id)] as const));
    setWords(new Map(found.filter((x): x is readonly [string, Word] => !!x[1])));
    setTakes(waiting);
  };
  useEffect(() => {
    reload().catch((e) => {
      console.error(e);
      setError(true);
    });
  }, []);
  const judge = async (r: Recording, verdict: 'ok' | 'no') => {
    if (busy.current.has(r.id)) return;
    busy.current.add(r.id);
    try {
      await reviewTake(db, r.id, verdict, now());
    } catch (e) {
      busy.current.delete(r.id); // the review did not happen: let him tap again
      console.error(e);
      setError(true);
      return;
    }
    try {
      await reload();
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
    }
    onReviewed?.();
  };
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read each word aloud in 练一练. Play his take, then the model: ✓ if he said it right, ✗ if not. A word counts as “can say” after ✓ on two different days; ✗ brings it back soon.</p>
      {error && <p class="muted" role="alert">Something went wrong reading or saving the takes. Try again.</p>}
      {takes ? <ListenRows takes={takes} words={words} onJudge={(r, v) => void judge(r, v)} /> : (!error && <p class="muted">Loading…</p>)}
    </section>
  );
}
