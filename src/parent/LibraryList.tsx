import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { PASSAGES } from '../content';
import { readerAt } from '../langdu/level';
import { kindShares, libraryRows, type KindShare, type LibraryRow } from '../langdu/library';
import { localDateKey } from '../lib/date';
import { getKid } from '../store/repo';
import { DEFAULT_KID } from '../types';

/** The built-in passages (spec 2026-10-15 §9, 2026-10-24 §8), read-only: where each is from, its term, how much of it he reads
 *  now, his reads, his last read's questions, when it comes back, and the ones he often swaps away; under them, his right share
 *  by kind of question over 14 days, the weakest marked. */
export function LibraryList() {
  const { db, now, settings } = useApp();
  const [rows, setRows] = useState<LibraryRow[] | null>(null);
  const [kinds, setKinds] = useState<KindShare[]>([]);
  useEffect(() => {
    void Promise.all([loadKnowledge(db), getKid(db)]).then(([know, kid]) => {
      const reading = (kid ?? DEFAULT_KID).reading;
      setRows(libraryRows(PASSAGES, reading, readerAt(know.knownChars, now(), settings).readable));
      setKinds(kindShares(reading, localDateKey(now())));
    });
  }, []);
  if (!rows) return null;
  return (
    <section class="library">
      <h3>Library</h3>
      <p>Built-in passages, by school term. "Reads now" is how much of each they can read today; 85–92% is their band. "Qs" is their last read's questions right. Passages come back on their own schedule.</p>
      <div class="scroll-panel library__scroll">
        <table class="table library__table">
          <thead>
            <tr><th>Title</th><th>From</th><th>Term</th><th>Reads now</th><th>Read</th><th>Qs</th><th>Next</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td class="hanzi">{r.title}{r.oftenSkipped && <small> · often skipped</small>}</td>
                <td>{r.source}</td>
                <td>{r.term}</td>
                <td>{Math.round(r.fit * 100)}%</td>
                <td>{r.reads}</td>
                <td>{r.qs}</td>
                <td>{r.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {kinds.length > 0 && (
        <p class="library__kinds">
          Last 14 days, right by kind of question:{' '}
          {kinds.map((k, i) => (
            <span key={k.kind}>
              {i > 0 && ' · '}
              {k.weakest ? <strong class="library__weakest"><span lang="zh-CN">{k.label}</span> {k.right}/{k.total} (weakest)</strong> : <><span lang="zh-CN">{k.label}</span> {k.right}/{k.total}</>}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
