import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { BUILTIN, HSK_WORDS } from '../content';
import { lookAlike } from '../importer/alike';
import { parseWorksheet, type DraftItem, type ImportDraft } from '../importer/parse';
import { applyImport } from '../importer/save';
import { allWords } from '../store/repo';

type Kind = 'words' | 'idioms';

/** Parent area: turn a worksheet into practice. Text comes from Live Text (on a photo here, or anywhere) or typing. */
export function ImportPanel() {
  const { db, now } = useApp();
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set()); // unticked items, by kind:text
  const [listName, setListName] = useState('');
  const [writeable, setWriteable] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState<string[]>([]);
  useEffect(() => { void allWords(db).then((ws) => setExisting(ws.map((w) => w.text))); }, []);
  const chars = useMemo(() => new Set(BUILTIN.map((c) => c.char)), []);
  const known = useMemo(() => new Set(existing), [existing]);
  const isWord = (w: string) => HSK_WORDS.has(w) || chars.has(w) || known.has(w);

  const read = () => {
    const d = parseWorksheet(text, isWord, [...HSK_WORDS.keys(), ...existing], lookAlike);
    setDraft(d);
    setOff(new Set());
    setListName(d.title ?? '');
    setMessage(null);
  };
  const setItems = (kind: Kind, items: DraftItem[]) => draft && setDraft({ ...draft, [kind]: items });
  const fix = (kind: Kind, i: number, to: string) => draft && setItems(kind, draft[kind].map((w, j) => (j === i ? { text: to, known: isWord(to) } : w)));
  const join = (kind: Kind, i: number) => {
    if (!draft) return;
    const items = [...draft[kind]];
    const merged = items[i]!.text + items[i + 1]!.text;
    items.splice(i, 2, { text: merged, known: isWord(merged) });
    setItems(kind, items);
  };
  const split = (kind: Kind, i: number) => {
    if (!draft) return;
    const items = [...draft[kind]];
    items.splice(i, 1, ...items[i]!.parts!.map((p) => ({ text: p, known: isWord(p) })));
    setItems(kind, items);
  };
  const toggle = (key: string) => setOff((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const keep = <T,>(kind: string, xs: T[], label: (x: T) => string) => xs.filter((x) => !off.has(`${kind}:${label(x)}`));

  const add = async () => {
    if (!draft) return;
    const approved: ImportDraft = {
      ...draft,
      words: keep('words', draft.words, (w) => w.text),
      idioms: keep('idioms', draft.idioms, (w) => w.text),
      pairs: keep('pairs', draft.pairs, (p) => p.join(' ')),
      sentences: keep('sentences', draft.sentences, (s) => s),
      passages: keep('passages', draft.passages, (s) => s),
    };
    const s = await applyImport(db, approved, { listName: listName.trim() || draft.title || 'Worksheet', writeable, now: now().getTime() });
    const parts = [`Added ${s.added} new word${s.added === 1 ? '' : 's'}`];
    if (s.promoted) parts.push(`moved ${s.promoted} built-in to the front of the queue`);
    if (s.pairs) parts.push(`${s.pairs} pairing${s.pairs === 1 ? '' : 's'}`);
    if (s.sentences) parts.push(`${s.sentences} sentence${s.sentences === 1 ? '' : 's'} for meaning practice`);
    if (s.passages) parts.push(`${s.passages} reading text${s.passages === 1 ? '' : 's'}`);
    if (s.duplicates.length) parts.push(`skipped ${s.duplicates.length} already on a list`);
    setMessage(`${parts.join('; ')}.`);
    setDraft(null);
    setText('');
    setExisting((await allWords(db)).map((w) => w.text));
  };

  const itemRows = (kind: Kind, title: string) =>
    draft && draft[kind].length > 0 && (
      <>
        <h3>{title}</h3>
        <ul class="import__items">
          {draft[kind].map((w, i) => (
            <li key={`${w.text}-${i}`} class={w.known ? '' : 'is-unknown'}>
              <label><input type="checkbox" aria-label={`Include ${w.text}`} checked={!off.has(`${kind}:${w.text}`)} onChange={() => toggle(`${kind}:${w.text}`)} /> <span class="hanzi">{w.text}</span></label>
              {!w.known && <span class="import__flag">{isWord(w.text) || Array.from(w.text).every(isWord) ? 'may be misread' : `not in the dictionary${w.suggestion ? '' : ' — check it'}`}</span>}
              {w.suggestion && <button type="button" class="small-btn" onClick={() => fix(kind, i, w.suggestion!)}>{`Use ${w.suggestion}`}</button>}
              {w.parts && <button type="button" class="small-btn" aria-label={`Split ${w.text}`} onClick={() => split(kind, i)}>Split</button>}
              {i < draft[kind].length - 1 && <button type="button" class="small-btn" aria-label={`Join ${w.text} with the next`} onClick={() => join(kind, i)}>Join ↓</button>}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <section class="panel import">
      <h2>From a worksheet</h2>
      <p>Add a photo of the page, then press and hold on it to select its text with Live Text, copy, and paste below. You can also paste text from anywhere, or type it. Everything stays on this iPad.</p>
      <div class="field">
        <label for="imp-photo">Add a photo</label>
        <input id="imp-photo" type="file" accept="image/*" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
      </div>
      {photo && <div class="import__photo"><img src={photo} alt="Worksheet photo" /></div>}
      <div class="field">
        <label for="imp-text">Worksheet text</label>
        <textarea id="imp-text" rows={8} value={text} onInput={(e) => setText(e.currentTarget.value)} />
      </div>
      <button type="button" class="btn" disabled={!text.trim()} onClick={read}>Read it</button>
      {draft && (
        <div class="import__preview">
          <div class="field">
            <label for="imp-name">List name</label>
            <input id="imp-name" value={listName} onInput={(e) => setListName(e.currentTarget.value)} />
          </div>
          <div class="row" style={{ justifyContent: 'flex-start' }}>
            <label><input type="radio" name="imp-mode" checked={!writeable} onChange={() => setWriteable(false)} /> Recognise only</label>
            <label><input type="radio" name="imp-mode" checked={writeable} onChange={() => setWriteable(true)} /> Recognise + write</label>
          </div>
          {itemRows('words', 'Words')}
          {itemRows('idioms', '成语')}
          {draft.pairs.length > 0 && <><h3>Pairings</h3><ul class="import__items">{draft.pairs.map((p) => <li key={p.join(' ')}><label><input type="checkbox" aria-label={`Include ${p.join(' + ')}`} checked={!off.has(`pairs:${p.join(' ')}`)} onChange={() => toggle(`pairs:${p.join(' ')}`)} /> <span class="hanzi">{p.join(' + ')}</span></label></li>)}</ul></>}
          {draft.sentences.length > 0 && <><h3>Sentences (for meaning practice)</h3><ul class="import__items">{draft.sentences.map((s) => <li key={s}><label><input type="checkbox" aria-label={`Include ${s}`} checked={!off.has(`sentences:${s}`)} onChange={() => toggle(`sentences:${s}`)} /> <span class="hanzi">{s}</span></label></li>)}</ul></>}
          {draft.passages.length > 0 && <><h3>Reading texts (for 朗读)</h3><ul class="import__items">{draft.passages.map((s) => <li key={s}><label><input type="checkbox" aria-label={`Include ${s.slice(0, 8)}`} checked={!off.has(`passages:${s}`)} onChange={() => toggle(`passages:${s}`)} /> <span class="hanzi">{s}</span></label></li>)}</ul></>}
          <button type="button" class="btn btn--primary" onClick={() => void add()}>Add to {listName.trim() || draft.title || 'Worksheet'}</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
