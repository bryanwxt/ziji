import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { PASSAGES } from '../content';
import { readerAt } from '../langdu/level';
import { libraryRows, type LibraryRow } from '../langdu/library';
import { getKid } from '../store/repo';
import { DEFAULT_KID } from '../types';

/** The built-in passages (spec 2026-10-15 §9), read-only: where each is from, its term, how much of it he reads now, his reads,
 *  when it comes back, and the ones he often swaps away. */
export function LibraryList() {
  const { db, now, settings } = useApp();
  const [rows, setRows] = useState<LibraryRow[] | null>(null);
  useEffect(() => {
    void Promise.all([loadKnowledge(db), getKid(db)]).then(([know, kid]) => setRows(libraryRows(PASSAGES, (kid ?? DEFAULT_KID).reading, readerAt(know.knownChars, now(), settings).readable)));
  }, []);
  if (!rows) return null;
  return (
    <section class="library">
      <h3>Library</h3>
      <p>Built-in passages, by school term. "Reads now" is how much of each he can read today; 90–97% is his band. Passages come back on their own schedule.</p>
      <div class="scroll-panel library__scroll">
        <table class="table library__table">
          <thead>
            <tr><th>Title</th><th>From</th><th>Term</th><th>Reads now</th><th>Read</th><th>Next</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td class="hanzi">{r.title}{r.oftenSkipped && <small> · often skipped</small>}</td>
                <td>{r.source}</td>
                <td>{r.term}</td>
                <td>{Math.round(r.fit * 100)}%</td>
                <td>{r.reads}</td>
                <td>{r.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
