import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge, type Knowledge } from '../app/knowledge';
import { hanChars } from '../content';
import { makeParentWords, parseWordList, type ParseResult } from '../content/parseWordList';
import { strokeAvailability } from '../content/strokes';
import { localDateKey } from '../lib/date';
import { isKnown } from '../srs/scheduler';
import { applyDictationMistakes } from '../session/dictation';
import { deleteWord, putWords } from '../store/repo';
import type { Word } from '../types';

type Filter = 'lists' | `level${1 | 2 | 3 | 4 | 5 | 6 | 7}` | 'paused';
const MAX_ROWS = 200;

export function WordsPanel() {
  const { db, now } = useApp();
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [text, setText] = useState('');
  const [listName, setListName] = useState('');
  const [writeable, setWriteable] = useState(true);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('lists');
  const [query, setQuery] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [mistakeMessage, setMistakeMessage] = useState<string | null>(null);

  const reload = async () => setKnow(await loadKnowledge(db));
  useEffect(() => {
    void reload();
  }, []);

  const add = async () => {
    if (!preview) return;
    const current = await loadKnowledge(db); // fresh, so duplicates are judged against what is stored now
    const { added, promoted, duplicates } = makeParentWords(preview.words, {
      listName: listName.trim() || `List ${localDateKey(now())}`,
      writeable,
      existing: current.words,
      now: now().getTime(),
    });
    const recogniseOnly: string[] = [];
    for (const w of added) {
      if (!w.writeable) continue;
      const results = await Promise.all(hanChars(w.text).map((c) => strokeAvailability(c)));
      if (results.includes('no')) {
        w.writeable = false;
        recogniseOnly.push(w.text);
      }
    }
    await putWords(db, [...added, ...promoted]);
    const parts = [`Added ${added.length} new word${added.length === 1 ? '' : 's'}`];
    if (promoted.length) parts.push(`moved ${promoted.length} built-in to the front of the queue`);
    if (duplicates.length) parts.push(`skipped ${duplicates.length} already on a list (${duplicates.join('、')})`);
    if (recogniseOnly.length) parts.push(`${recogniseOnly.join('、')} set to recognise-only (no stroke data)`);
    setMessage(`${parts.join('; ')}.`);
    setText('');
    setPreview(null);
    await reload();
  };

  const update = async (w: Word, patch: Partial<Word>) => {
    await putWords(db, [{ ...w, ...patch }]);
    await reload();
  };
  const remove = async (w: Word) => {
    if (!confirm(`Delete ${w.text}? Its progress is removed too.`)) return;
    await deleteWord(db, w.id);
    await reload();
  };
  const status = (w: Word) => {
    const c = know?.cardsById.get(`${w.id}:recognise`);
    return !c ? 'New' : isKnown(c.fsrs) ? 'Known' : 'Learning';
  };

  const shown = (know?.words ?? [])
    .filter((w) => {
      if (filter === 'lists' && w.listName === undefined) return false;
      if (filter === 'paused' && !w.paused) return false;
      if (filter.startsWith('level') && w.level !== Number(filter.slice(5))) return false;
      return !query || w.text.includes(query) || w.pinyin.includes(query);
    })
    .sort((a, b) => (a.listedAt ?? 0) - (b.listedAt ?? 0) || (a.rank ?? 0) - (b.rank ?? 0));

  return (
    <>
      <section class="panel">
        <h2>Add a school word list (听写)</h2>
        <p>Paste one word per line. These words come before built-in ones in your child's new-word queue.</p>
        <div class="field">
          <label for="wl-name">List name</label>
          <input id="wl-name" value={listName} placeholder="e.g. 听写 7" onInput={(e) => setListName(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for="wl-text">Words</label>
          <textarea id="wl-text" rows={6} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        </div>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <label><input type="radio" name="wl-mode" checked={!writeable} onChange={() => setWriteable(false)} /> Recognise only</label>
          <label><input type="radio" name="wl-mode" checked={writeable} onChange={() => setWriteable(true)} /> Recognise + write</label>
        </div>
        <button type="button" class="btn" disabled={!text.trim()} onClick={() => setPreview(parseWordList(text))}>Preview</button>
        {preview && (
          <>
            {preview.rejected.length > 0 && <p class="warning">Skipped (not 1–4 Chinese characters): {preview.rejected.join(', ')}</p>}
            <table class="table">
              <thead><tr><th>Word</th><th>Pinyin (edit if needed)</th></tr></thead>
              <tbody>
                {preview.words.map((w, i) => (
                  <tr key={w.text}>
                    <td class="hanzi" style={{ fontSize: '24px' }}>{w.text}</td>
                    <td>
                      <input
                        aria-label={`Pinyin for ${w.text}`}
                        value={w.pinyin}
                        onInput={(e) => {
                          const words = [...preview.words];
                          words[i] = { ...w, pinyin: e.currentTarget.value };
                          setPreview({ ...preview, words });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" class="btn btn--primary" disabled={!preview.words.length} onClick={() => void add()}>
              Add {preview.words.length} words
            </button>
          </>
        )}
        {message && <p role="status">{message}</p>}
      </section>

      <section class="panel">
        <h2>School 听写 mistakes</h2>
        <p>Words he wrote wrong in a school 听写 — often with a same-sound character (新家坡 for 新加坡). Type the right word, one per line. Each comes back first in 写一写.</p>
        <div class="field">
          <label for="tx-mistakes">The right words, one per line</label>
          <textarea id="tx-mistakes" rows={3} value={mistakes} onInput={(e) => setMistakes(e.currentTarget.value)} />
        </div>
        <button
          type="button"
          class="btn"
          disabled={!mistakes.trim()}
          onClick={async () => {
            const r = await applyDictationMistakes(db, mistakes, now());
            const parts = [r.marked.length ? `${r.marked.join('、')} comes back first in 写一写.` : 'Nothing to bring back.'];
            if (r.added.length) parts.push(`${r.added.join('、')} is new to the app — check the spelling (type the right word, not what he wrote).`);
            if (r.skipped.length) parts.push(`Skipped: ${r.skipped.join(', ')} (not 1–4 Chinese characters).`);
            setMistakeMessage(parts.join(' '));
            setMistakes('');
            await reload();
          }}
        >
          Bring back
        </button>
        {mistakeMessage && <p role="status">{mistakeMessage}</p>}
      </section>
      <section class="panel">
        <h2>All words</h2>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <div class="field">
            <label for="wl-filter">Show</label>
            <select id="wl-filter" value={filter} onChange={(e) => setFilter(e.currentTarget.value as Filter)}>
              <option value="lists">From your lists</option>
              {[1, 2, 3, 4, 5, 6, 7].map((l) => <option key={l} value={`level${l}`}>{`HSK ${l === 7 ? '7–9' : l}`}</option>)}
              <option value="paused">Paused</option>
            </select>
          </div>
          <div class="field">
            <label for="wl-q">Search</label>
            <input id="wl-q" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
          </div>
        </div>
        <table class="table">
          <thead><tr><th>Word</th><th>Pinyin</th><th>List</th><th>Status</th><th>Write</th><th>Paused</th><th /></tr></thead>
          <tbody>
            {shown.slice(0, MAX_ROWS).map((w) => (
              <tr key={w.id}>
                <td class="hanzi" style={{ fontSize: '24px' }}>{w.text}</td>
                <td>
                  {w.source === 'parent'
                    ? <input aria-label={`Pinyin for ${w.text}`} value={w.pinyin} onChange={(e) => void update(w, { pinyin: e.currentTarget.value })} />
                    : w.pinyin}
                </td>
                <td>{w.listName ?? `HSK ${w.level === 7 ? '7–9' : w.level}`}</td>
                <td>{status(w)}</td>
                <td><input type="checkbox" aria-label={`Write ${w.text}`} checked={w.writeable} onChange={(e) => void update(w, { writeable: e.currentTarget.checked })} /></td>
                <td><input type="checkbox" aria-label={`Pause ${w.text}`} checked={w.paused} onChange={(e) => void update(w, { paused: e.currentTarget.checked })} /></td>
                <td>{w.source === 'parent' && <button type="button" class="small-btn" onClick={() => void remove(w)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > MAX_ROWS && <p>Showing the first {MAX_ROWS} of {shown.length}. Use search to narrow down.</p>}
      </section>
    </>
  );
}
