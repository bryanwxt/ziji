import { newId } from '../lib/id';
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { hanChars } from '../content';
import { splitPhrases } from '../langdu/phrases';
import { deleteParentPassage, listParentPassages, saveParentPassage } from '../store/repo';
import type { ParentPassage } from '../types';

/** School texts for 朗读: they come before the built-in passages, 3 days each. */
export function PassagesPanel() {
  const { db } = useApp();
  const [list, setList] = useState<ParentPassage[]>([]);
  const [editing, setEditing] = useState<ParentPassage | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const reload = async () => setList(await listParentPassages(db));
  useEffect(() => {
    void reload();
  }, []);

  const phrases = splitPhrases(text);
  const canSave = title.trim().length > 0 && hanChars(text).length > 0;
  const reset = () => {
    setEditing(null);
    setTitle('');
    setText('');
  };
  const save = async () => {
    if (!canSave) return;
    const base = editing ?? { id: `pp:${newId()}`, createdAt: Date.now() }; // newId works on plain-http hosts too
    await saveParentPassage(db, { ...base, title: title.trim(), text: text.trim() });
    reset();
    await reload();
  };
  const edit = (p: ParentPassage) => {
    setEditing(p);
    setTitle(p.title);
    setText(p.text);
  };
  const remove = async (p: ParentPassage) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await deleteParentPassage(db, p.id);
    if (editing?.id === p.id) reset();
    await reload();
  };

  return (
    <section class="panel">
      <h2>Reading texts (朗读)</h2>
      <p>Texts here come first in the daily 朗读 step, in the order added; each is read for 3 days. When none are left, the app uses its built-in passages.</p>
      {list.length > 0 && (
        <table class="table">
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.text.replace(/\s*\/\s*/g, '').slice(0, 20)}{p.text.length > 20 ? '…' : ''}</td>
                <td><button type="button" class="small-btn" onClick={() => edit(p)}>Edit</button></td>
                <td><button type="button" class="small-btn" onClick={() => void remove(p)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div class="field">
        <label for="pp-title">Title</label>
        <input id="pp-title" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="pp-text">Text</label>
        <textarea id="pp-text" rows={5} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        <small>Paste the text from school. Optional: type / where he should pause.</small>
      </div>
      {phrases.length > 0 && (
        <ol class="phrase-preview">
          {phrases.map((ph, i) => <li key={i}>{ph}</li>)}
        </ol>
      )}
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" class="small-btn" disabled={!canSave} onClick={() => void save()}>Save text</button>
        {editing && <button type="button" class="small-btn" onClick={reset}>Cancel</button>}
      </div>
    </section>
  );
}
