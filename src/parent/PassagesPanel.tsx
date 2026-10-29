import { newId } from '../lib/id';
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { hanChars } from '../content';
import { splitSentences } from '../langdu/sentences';
import { deleteParentPassage, listParentPassages, saveParentPassage } from '../store/repo';
import type { ParentPassage, ParentQuestion } from '../types';
import { LibraryList } from './LibraryList';

const NO_CHOICES: [string, string, string] = ['', '', ''];

/** School texts for 朗读: each comes before the built-in passages until he has read it, then returns on the rest schedule; each may carry one meaning question (spec 2026-10-12 §3). Below them, the built-in Library (spec 2026-10-15 §9). */
export function PassagesPanel() {
  const { db } = useApp();
  const [list, setList] = useState<ParentPassage[]>([]);
  const [editing, setEditing] = useState<ParentPassage | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [choices, setChoices] = useState<[string, string, string]>(NO_CHOICES);
  const [right, setRight] = useState<0 | 1 | 2>(0);
  const reload = async () => setList(await listParentPassages(db));
  useEffect(() => {
    void reload();
  }, []);

  const sentences = splitSentences(text);
  const complete = q.trim() !== '' && choices.every((c) => c.trim() !== '');
  const distinct = new Set(choices.map((c) => c.trim())).size === 3;
  const filled = complete && distinct;
  const empty = q.trim() === '' && choices.every((c) => c.trim() === '');
  const question: ParentQuestion | undefined = filled ? { q: q.trim(), choices: choices.map((c) => c.trim()) as [string, string, string], answer: right } : undefined;
  const canSave = title.trim().length > 0 && hanChars(text).length > 0 && (filled || empty);
  const reset = () => {
    setEditing(null);
    setTitle('');
    setText('');
    setQ('');
    setChoices(NO_CHOICES);
    setRight(0);
  };
  const save = async () => {
    if (!canSave) return;
    const { id, createdAt } = editing ?? { id: `pp:${newId()}`, createdAt: Date.now() }; // newId works on plain-http hosts too
    await saveParentPassage(db, { id, createdAt, title: title.trim(), text: text.trim(), ...(question ? { question } : {}) });
    reset();
    await reload();
  };
  const edit = (p: ParentPassage) => {
    setEditing(p);
    setTitle(p.title);
    setText(p.text);
    setQ(p.question?.q ?? '');
    // the editor keeps three choices (spec 2026-10-24 §2: school texts unchanged); a fourth, never saved by it, is not shown
    setChoices(p.question ? [p.question.choices[0], p.question.choices[1], p.question.choices[2]] : NO_CHOICES);
    setRight(p.question && p.question.answer < 3 ? (p.question.answer as 0 | 1 | 2) : 0);
  };
  const remove = async (p: ParentPassage) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await deleteParentPassage(db, p.id);
    if (editing?.id === p.id) reset();
    await reload();
  };
  const setChoice = (i: number, v: string) => setChoices((c) => c.map((x, j) => (j === i ? v : x)) as [string, string, string]);

  return (
    <section class="panel">
      <h2>Reading texts (朗读)</h2>
      <p>Texts here come first in the daily 朗读 step, in the order added. Once read, each comes back after a rest (3 days, longer each time they read it well), like the built-in passages.</p>
      {list.length > 0 && (
        <table class="table">
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.title}{p.question && <small> · ❓</small>}</td>
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
        <small>Paste the text from school. The iPad reads it a sentence at a time (at 。！？); type / to end a sentence that has no full stop.</small>
      </div>
      {sentences.length > 0 && (
        <ol class="phrase-preview">
          {sentences.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      <fieldset class="field">
        <legend>Meaning question (optional)</legend>
        <div class="field">
          <label for="pp-q">Question</label>
          <input id="pp-q" value={q} placeholder="谁…？ 哪里…？ 什么…？ 为什么…？" onInput={(e) => setQ(e.currentTarget.value)} />
        </div>
        {[0, 1, 2].map((i) => (
          <div class="row" key={i} style={{ justifyContent: 'flex-start' }}>
            <input type="radio" name="pp-right" aria-label={`Choice ${i + 1} is right`} checked={right === i} onChange={() => setRight(i as 0 | 1 | 2)} />
            <input aria-label={`Choice ${i + 1}`} value={choices[i]} onInput={(e) => setChoice(i, e.currentTarget.value)} />
          </div>
        ))}
        <small>After reading, they answer it. Mark the right choice; a miss shows it and reads again the sentence that has it.</small>
        {complete && !distinct && <p class="hint" role="status">The three choices must be different.</p>}
        {!complete && !empty && <p class="hint" role="status">Fill in the question and all three choices, or leave them all empty.</p>}
      </fieldset>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" class="small-btn" disabled={!canSave} onClick={() => void save()}>Save text</button>
        {editing && <button type="button" class="small-btn" onClick={reset}>Cancel</button>}
      </div>
      <LibraryList />
    </section>
  );
}
