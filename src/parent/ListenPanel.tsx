// Listen & confirm (spec 2026-10-11 §6; spec 2026-10-12 §6; production practice spec §4): his Say takes, his 说一句 takes and his
// passage takes, oldest first. A word: play his take and the model, then ✓ or ✗. A sentence: the word, his take and the model
// sentence, then ✓ or ✗. A passage: play his take and the model, tap what he misread, then Done.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
import { finishPassageReview, passageOf } from '../langdu/review';
import { splitSentences } from '../langdu/sentences';
import { useModelReader } from '../langdu/useModelReader';
import { findWord } from '../ladder/words';
import { sentenceExample } from '../content/sentencePattern';
import { stopSpeaking } from '../audio/speech';
import { reviewTake, takeKind, takeWord, waitingTakes } from '../session/say';
import { listParentPassages, listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';
import { MisreadText } from './MisreadText';

export type PassageTexts = ReadonlyMap<string, { title: string; text: string }>;

function PassageRow({ r, url, texts, onDone }: { r: Recording; url: string | undefined; texts: PassageTexts; onDone: (r: Recording, marks: string[]) => void }) {
  const t = texts.get(passageOf(r)!);
  const model = useModelReader(splitSentences(t?.text ?? ''));
  const audio = useRef<HTMLAudioElement>(null);
  const title = t?.title ?? '(deleted text)';
  const [marks, setMarks] = useState<Set<string>>(new Set(r.misread ?? []));
  const toggle = (ch: string) => setMarks((m) => {
    const n = new Set(m);
    if (n.has(ch)) n.delete(ch);
    else n.add(ch);
    return n;
  });
  return (
    <tr class="listen__row listen__row--passage">
      <td colSpan={4}>
        <div class="listen__passage">
          <div><strong class="listen__title">📖 {title}</strong> <small>{new Date(r.createdAt).toLocaleString()}</small></div>
          {r.meaning && <small class="listen__meaning">{r.meaning.correct ? 'Meaning question: right' : `Meaning question: missed (picked ${r.meaning.picked})`}</small>}
          {t && <MisreadText text={t.text} marked={marks} onToggle={toggle} />}
          <div class="row listen__actions">
            <audio ref={audio} controls preload="none" src={url} aria-label="His take" onPlay={model.stop} />
            {t && <button type="button" class="small-btn listen__model" onClick={() => { audio.current?.pause(); model.read(0); }}>听老师的</button>}
            <button type="button" class="small-btn listen__done" aria-label={`Done: ${title}`} onClick={() => onDone(r, [...marks])}>Done</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** The queue's rows (the stage cases show it with takes in memory): a Say take's word, take, model, ✓ and ✗; a passage take's row. */
export function ListenRows({ takes, words, texts = new Map(), onJudge, onDone = () => {} }: {
  takes: Recording[];
  words: ReadonlyMap<string, Word>;
  texts?: PassageTexts;
  onJudge: (r: Recording, verdict: 'ok' | 'no') => void;
  onDone?: (r: Recording, marks: string[]) => void;
}) {
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
          if (passageOf(r) !== null) return <PassageRow key={r.id} r={r} url={urls.get(r.id)} texts={texts} onDone={onDone} />;
          const w = words.get(takeWord(r)!);
          const label = w?.text ?? takeWord(r) ?? '';
          if (takeKind(r) === 'sentence') {
            const model = w ? sentenceExample(w.text) : null;
            return (
              <tr key={r.id} class="listen__row listen__row--sentence">
                <td>
                  <small class="listen__kind">说一句</small> <span class="hanzi listen__word">{w?.text ?? '?'}</span> <span class="listen__py">{w?.pinyin}</span>
                  {model && <><br /><span class="hanzi listen__sentence" lang="zh">{model}</span></>}
                  <br />
                  <small>{new Date(r.createdAt).toLocaleString()}</small>
                </td>
                <td><audio controls preload="none" src={urls.get(r.id)} aria-label="His sentence" onPlay={stopSpeaking} /></td>
                <td>{model && <span onClickCapture={(e) => (e.currentTarget.closest('tr')?.querySelector('audio') as HTMLAudioElement | null)?.pause()}><SpeakButton text={model} /></span>}</td>
                <td class="listen__verdict">
                  <button type="button" class="small-btn" aria-label={`A good sentence: ${label}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                  <button type="button" class="small-btn" aria-label={`Not a good sentence: ${label}`} onClick={() => onJudge(r, 'no')}>✗</button>
                </td>
              </tr>
            );
          }
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
  const [texts, setTexts] = useState<PassageTexts>(new Map());
  const [error, setError] = useState(false);
  const busy = useRef(new Set<string>()); // a double tap on ✓ or Done reviews a take once
  const reload = async () => {
    const [recs, parent] = await Promise.all([listRecordings(db), listParentPassages(db)]);
    const waiting = waitingTakes(recs);
    const ids = [...new Set(waiting.map(takeWord).filter((id): id is string => id !== null))];
    const found = await Promise.all(ids.map(async (id) => [id, await findWord(db, id)] as const));
    setWords(new Map(found.filter((x): x is readonly [string, Word] => !!x[1])));
    setTexts(new Map([...PASSAGES, ...parent].map((p) => [p.id, { title: p.title, text: p.text }])));
    setTakes(waiting);
  };
  useEffect(() => {
    reload().catch((e) => {
      console.error(e);
      setError(true);
    });
  }, []);
  const settle = async (r: Recording, act: () => Promise<unknown>) => {
    if (busy.current.has(r.id)) return;
    busy.current.add(r.id);
    try {
      await act();
    } catch (e) {
      busy.current.delete(r.id); // it did not happen: let the parent tap again
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
      <p class="muted">He read words aloud in 练一练, said sentences with words (说一句), and read today's text in 朗读. A word: play his take, then the model: ✓ if he said it right, ✗ if not; it counts as “can say” after ✓ on two different days, and ✗ brings it back soon. A sentence: play his take; the model sentence is one way to say it. ✓ if his own sentence uses the word sensibly, ✗ if not; ✓ on two different days counts as “can use”. A text: play his take and the model, tap any character he misread (it comes up in practice), then Done.</p>
      {error && <p class="muted" role="alert">Something went wrong reading or saving the takes. Try again.</p>}
      {takes ? (
        <ListenRows takes={takes} words={words} texts={texts} onJudge={(r, v) => void settle(r, () => reviewTake(db, r.id, v, now()))} onDone={(r, marks) => void settle(r, () => finishPassageReview(db, r, marks, now()))} />
      ) : (!error && <p class="muted">Loading…</p>)}
    </section>
  );
}
