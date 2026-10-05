import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
import { applyMisreads } from '../langdu/misreads';
import { SCENES_KT } from '../kantu/scenes';
import { displayText } from '../langdu/phrases';
import { deleteRecording, listParentPassages, listRecordings } from '../store/repo';
import type { ParentPassage, Recording } from '../types';

const KEEP = 100; // a picture story (all its parts) counts as one
const HAN = /\p{Script=Han}/u;

type Texts = Map<string, { title: string; text: string }>;

type Group = { kind: 'single'; rec: Recording } | { kind: 'story'; sceneId: string; recs: Recording[] };
const GROUP_GAP_MS = 30 * 60_000;

/** Story parts and answers from one telling of a scene (same scene, within 30 minutes) become one group, oldest first. */
export function groupRecordings(recs: Recording[]): Group[] {
  const out: Group[] = [];
  for (const r of recs) {
    const p = r.prompt;
    if (p.kind !== 'story' && p.kind !== 'answer') {
      out.push({ kind: 'single', rec: r });
      continue;
    }
    const last = out[out.length - 1];
    if (last?.kind === 'story' && last.sceneId === p.sceneId && Math.abs(last.recs[0]!.createdAt - r.createdAt) <= GROUP_GAP_MS) last.recs.unshift(r);
    else out.push({ kind: 'story', sceneId: p.sceneId, recs: [r] });
  }
  return out;
}

const PART_LABEL: Record<string, string> = { opening: '开场白', setting: '时间地点人物', events: '经过', ending: '结果', opinion: '看法', whole: '讲一讲 (whole story)' };
const sceneTitle = (id: string) => SCENES_KT.find((s) => s.id === id)?.title ?? id;
const partLabel = (r: Recording) => {
  const p = r.prompt;
  if (p.kind === 'story') return PART_LABEL[p.part] ?? p.part;
  if (p.kind === 'answer') return `Q${p.question + 1} ${SCENES_KT.find((s) => s.id === p.sceneId)?.questions[p.question]?.q ?? ''}`;
  return '';
};

const describe = ({ prompt }: Recording, texts: Texts) => {
  if (prompt.kind === 'picture') return '📷 Picture talk';
  if (prompt.kind === 'intro') return '🙋 Self-introduction';
  if (prompt.kind === 'story' || prompt.kind === 'answer') return '🖼️ Picture story';
  const t = texts.get(prompt.passageId);
  return t ? `📖 ${t.title}` : '📖 (deleted text)';
};

/** Tap the characters he misread; saving makes them priority words and gives the passage an extra day. */
function MisreadMarker({ recording, text, onSaved }: { recording: Recording; text: string; onSaved: () => Promise<void> }) {
  const { db, now } = useApp();
  const [marked, setMarked] = useState<Set<string>>(new Set(recording.misread ?? []));
  const [saved, setSaved] = useState<{ updated: number; notInApp: string[] } | null>(null);
  const toggle = (ch: string) => {
    const next = new Set(marked);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    setMarked(next);
    setSaved(null);
  };
  const saving = useRef(false); // a double tap saves once (final review: two saves gave two extra days)
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      setSaved(await applyMisreads(db, recording, [...marked], now()));
      await onSaved();
    } finally {
      saving.current = false;
    }
  };
  return (
    <div class="misreads">
      <p class="misreads__text">
        {[...displayText(text)].map((ch, i) =>
          HAN.test(ch) ? (
            <button key={i} type="button" class={`misread-ch${marked.has(ch) ? ' is-on' : ''}`} aria-pressed={marked.has(ch)} onClick={() => toggle(ch)}>{ch}</button>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </p>
      <button type="button" class="small-btn" onClick={() => void save()}>Save misread characters</button>
      {saved !== null && (
        <span class="misreads__done">
          {' '}Saved: {saved.updated} character{saved.updated === 1 ? '' : 's'} will come up in practice.
          {saved.notInApp.length > 0 && ` ${saved.notInApp.join('、')} isn't in the app yet (add it in Words).`}
        </span>
      )}
    </div>
  );
}

export function RecordingsPanel() {
  const { db } = useApp();
  const [recs, setRecs] = useState<Recording[]>([]);
  const [parent, setParent] = useState<ParentPassage[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [openStory, setOpenStory] = useState<string | null>(null);
  const reload = async () => {
    const [r, p] = await Promise.all([listRecordings(db), listParentPassages(db)]);
    setRecs(r);
    setParent(p);
  };
  const texts: Texts = useMemo(() => new Map([...PASSAGES, ...parent].map((p) => [p.id, { title: p.title, text: p.text }])), [parent]);
  useEffect(() => {
    void reload();
  }, []);
  const urls = useMemo(() => new Map(recs.map((r) => [r.id, URL.createObjectURL(r.blob)])), [recs]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const groups = useMemo(() => groupRecordings(recs), [recs]);
  const removeStory = async (g: Recording[]) => {
    if (!confirm('Delete this picture story and all its parts?')) return;
    for (const r of g) await deleteRecording(db, r.id);
    await reload();
  };

  const remove = async (r: Recording) => {
    if (!confirm('Delete this recording?')) return;
    await deleteRecording(db, r.id);
    await reload();
  };
  const pruneOld = async () => {
    const old = groups.slice(KEEP).flatMap((g) => (g.kind === 'story' ? g.recs : [g.rec])); // a story goes as a whole
    if (!confirm(`Delete the ${groups.length - KEEP} oldest recordings?`)) return;
    for (const r of old) await deleteRecording(db, r.id);
    await reload();
  };

  return (
    <section class="panel">
      <h2>Recordings</h2>
      {groups.length > KEEP && (
        <p class="warning">
          {groups.length} recordings saved.{' '}
          <button type="button" class="small-btn" onClick={() => void pruneOld()}>Delete the oldest {groups.length - KEEP}</button>
        </p>
      )}
      {recs.length === 0 ? (
        <p>No recordings yet. They appear here after the speaking step.</p>
      ) : (
        <table class="table">
          <tbody>
            {groups.map((g) => {
              if (g.kind === 'story') {
                const first = g.recs[0]!;
                const key = `story-${first.id}`;
                return (
                  <Fragment key={key}>
                    <tr class="rec-row">
                      <td>{new Date(first.createdAt).toLocaleString()}</td>
                      <td>
                        {`🖼️ ${sceneTitle(g.sceneId)}`}{' '}
                        <button type="button" class="small-btn" onClick={() => setOpenStory(openStory === key ? null : key)}>Show parts</button>
                      </td>
                      <td>{g.recs.reduce((t, r) => t + r.durationSec, 0)}s</td>
                      <td>{g.recs.length} parts</td>
                      <td><button type="button" class="small-btn" onClick={() => void removeStory(g.recs)}>Delete</button></td>
                    </tr>
                    {openStory === key && (
                      <tr>
                        <td colSpan={5}>
                          <ol class="story-parts">
                            {g.recs.map((r) => (
                              <li key={r.id}><span>{partLabel(r)}</span> <audio controls preload="none" src={urls.get(r.id)} /></li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              }
              const r = g.rec;
              const text = r.prompt.kind === 'passage' ? texts.get(r.prompt.passageId)?.text : undefined;
              return (
              <Fragment key={r.id}>
              <tr class="rec-row">
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  {describe(r, texts)}
                  {r.misread?.length ? <small> · misread: {r.misread.join(' ')}</small> : null}
                  {text && <> <button type="button" class="small-btn" onClick={() => setOpen(open === r.id ? null : r.id)}>Mark misreads</button></>}
                </td>
                <td>{r.durationSec}s</td>
                <td><audio controls preload="none" src={urls.get(r.id)} /></td>
                <td><button type="button" class="small-btn" onClick={() => void remove(r)}>Delete</button></td>
              </tr>
              {open === r.id && text && (
                <tr>
                  <td colSpan={5}><MisreadMarker recording={r} text={text} onSaved={reload} /></td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
