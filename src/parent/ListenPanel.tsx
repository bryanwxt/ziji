// Listen & confirm (spec 2026-10-11 §6): his Say takes, oldest first; the parent plays his take and the model, then ✓ or ✗.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { findWord } from '../ladder/words';
import { reviewTake, takeWord, waitingTakes } from '../session/say';
import { listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';

/** The queue's rows: the word with its pinyin, his take, the model, ✓ and ✗ (the stage cases show it with takes in memory). */
export function ListenRows({ takes, words, onJudge }: { takes: Recording[]; words: ReadonlyMap<string, Word>; onJudge: (r: Recording, verdict: 'ok' | 'no') => void }) {
  const urls = useMemo(() => new Map(takes.map((r) => [r.id, URL.createObjectURL(r.blob)])), [takes]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  if (takes.length === 0) return <p>Nothing to listen to. New takes appear here after his lessons.</p>;
  return (
    <table class="table">
      <tbody>
        {takes.map((r) => {
          const w = words.get(takeWord(r)!);
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
                <button type="button" class="small-btn" aria-label={`Said right: ${w?.text ?? ''}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                <button type="button" class="small-btn" aria-label={`Not right: ${w?.text ?? ''}`} onClick={() => onJudge(r, 'no')}>✗</button>
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
  const busy = useRef(new Set<string>()); // a double tap on ✓ reviews a take once
  const reload = async () => {
    const waiting = waitingTakes(await listRecordings(db));
    const ids = [...new Set(waiting.map((r) => takeWord(r)!))];
    const found = await Promise.all(ids.map(async (id) => [id, await findWord(db, id)] as const));
    setWords(new Map(found.filter((x): x is readonly [string, Word] => !!x[1])));
    setTakes(waiting);
  };
  useEffect(() => {
    void reload();
  }, []);
  const judge = async (r: Recording, verdict: 'ok' | 'no') => {
    if (busy.current.has(r.id)) return;
    busy.current.add(r.id);
    await reviewTake(db, r.id, verdict, now());
    await reload();
    onReviewed?.();
  };
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read each word aloud in 练一练. Play his take, then the model: ✓ if he said it right, ✗ if not. A word counts as “can say” after ✓ on two different days; ✗ brings it back soon.</p>
      {takes ? <ListenRows takes={takes} words={words} onJudge={(r, v) => void judge(r, v)} /> : <p class="muted">Loading…</p>}
    </section>
  );
}
