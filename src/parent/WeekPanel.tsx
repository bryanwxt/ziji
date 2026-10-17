// src/parent/WeekPanel.tsx
// 本周词语 (weekly list spec 2026-10-17 §3): paste a sheet, check the preview, confirm the wrong answers, set the days, save.
// Then the lists, each with where it stands, edited or deleted. Lists stay on the iPad. The parent area is English.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { HSK_WORDS } from '../content';
import { glossProblems } from '../content/kidGloss';
import { ladderWordsBesides } from '../content/ladder';
import { BLANK } from '../content/sentenceBank';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { PACE_START } from '../session/pace';
import { allCards, allWeekLists, allWords, deleteWeekList, updateWeekList } from '../store/repo';
import type { CardRecord, ItemStatus, WeekFit, WeekList, WeekPair, Word } from '../types';
import { proposeWrong } from '../weeklist/dapei';
import { clampReadyBy, daysBetween, defaultDates, pastDue, weekdayZh } from '../weeklist/dates';
import { parentSentenceProblems, proposeFit, sentenceFor } from '../weeklist/fit';
import { itemStatus, matchText } from '../weeklist/match';
import { parseWeekList, weekIsWord, type DraftItem, type DraftPair, type WeekDraft } from '../weeklist/parse';
import { activeLists, CLOSE_AFTER_DAYS, HEADROOM } from '../weeklist/plan';
import { notSolid } from '../weeklist/readiness';
import { saveWeekList } from '../weeklist/save';

/** The preview's plan line (spec §3.5), naming the new words that won't be taught before the check. */
export function planLine(i: { newCount: number; known: number; placed: number; rate: number; days: number; readyBy: string; homeworkDue: string; names: string[] }): string {
  const head = `${i.newCount} new · ${i.known} he knows (quick check) · ${i.placed} to recheck. New words ${i.rate} a day for ${i.days} day${i.days === 1 ? '' : 's'}, check ${weekdayZh(i.readyBy)}, homework ${weekdayZh(i.homeworkDue)}.`;
  if (!i.names.length) return head;
  return `${head} At ${i.rate} a day, ${i.names.length} new word${i.names.length === 1 ? '' : 's'} won’t be taught before ${weekdayZh(i.readyBy)}: ${i.names.join(', ')}. They’ll still be in the check.`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (key: string) => { const d = parseDateKey(key); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const day = (key: string) => `${weekdayZh(key)} ${short(key)}`;

/** Where a list stands, in a line: learning toward its check, check day, after the check, finished, closed. */
export function listStatus(l: WeekList, now: Date): string {
  if (l.closedAt) return 'Closed';
  const today = localDateKey(now);
  const close = localDateKey(addDays(parseDateKey(l.homeworkDue), CLOSE_AFTER_DAYS));
  if (today > close) return `Finished · practised until ${short(close)}`;
  const done = !!l.check?.done;
  if (!done && today < l.readyBy) {
    const n = daysBetween(today, l.readyBy);
    return `Learning · check ${weekdayZh(l.readyBy)} (${n === 1 ? 'tomorrow' : `in ${n} days`})`;
  }
  if (!done && today === l.readyBy) return 'Check today (考考自己)';
  const left = notSolid(l, now).length;
  const tail = left ? `${left} still practised` : 'all solid';
  if (!done) return `No check taken · ${tail}`;
  const right = l.items.filter((i) => l.check!.results[i.wordId]?.correct).length;
  return `Check done: ${right} of ${l.items.length} right · ${tail}`;
}

interface PairRow extends DraftPair { wrong: string[]; skipped: string[]; removed: boolean; ok: boolean }
interface FitRow { fit: WeekFit | null; skipped: string[]; removed: boolean; ok: boolean; own: string; editing: boolean }

const FLAG_TEXT = (it: DraftItem, f: DraftItem['flags'][number], isWord: (w: string) => boolean) =>
  f === 'unknown'
    ? it.suggestion ? `not a word ZiJi knows — did you mean ${it.suggestion}?`
      : Array.from(it.text).every(isWord) ? 'not in ZiJi’s dictionary — check it reads right'
        : 'a character ZiJi doesn’t know — traditional or misread? Retype it'
    : f === 'phrase' ? 'phrase — check it'
      : f === 'blocked' ? (it.reason ?? 'blocked')
        : 'unpaired on the sheet — check it';
const NOTE_TEXT = (n: string) =>
  n.startsWith('too long: ') ? `Left out (over 4 characters): ${n.slice(10)}`
    : n === 'sentences' ? 'This page also has sentences; use From a worksheet for those.'
      : n === 'idioms' ? 'This page also has 成语; use From a worksheet for those.'
        : 'This page also has a passage; use From a worksheet for that.';
const STATUS_TEXT: Record<ItemStatus, string> = { new: 'new', learning: 'learning', known: 'knows it', placed: 'placed — recheck' };
const toggled = (s: ReadonlySet<string>, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; };
const inputValue = (e: Event) => (e.currentTarget as HTMLInputElement).value;

export function WeekPanel() {
  const { db, now, settings } = useApp();
  const [stored, setStored] = useState<Word[]>([]);
  const [cards, setCards] = useState<ReadonlyMap<string, CardRecord>>(new Map());
  const [lists, setLists] = useState<WeekList[]>([]);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<WeekDraft | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set()); // unticked items, by text
  const [keepPaused, setKeepPaused] = useState<Set<string>>(new Set()); // paused words left paused
  const [english, setEnglish] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null); // the item being retyped
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [fits, setFits] = useState<Record<string, FitRow>>({});
  const [name, setName] = useState('');
  const [homework, setHomework] = useState('');
  const [readyBy, setReadyBy] = useState('');
  const [readyTouched, setReadyTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false); // his words and cards: Read waits for them, so a word he knows is never "new"

  const reload = async () => {
    const ws = await allWords(db);
    setStored([...ws, ...ladderWordsBesides(ws)]);
    setCards(new Map((await allCards(db)).map((c) => [c.id, c])));
    setLists(await allWeekLists(db));
    setLoaded(true);
  };
  useEffect(() => { void reload(); }, []);

  const byText = useMemo(() => new Map(stored.map((w) => [w.text, w])), [stored]);
  const isWord = useMemo(() => weekIsWord((w) => byText.has(w)), [byText]);
  const wordFor = (t: string) => matchText(t, byText, now().getTime(), () => t);
  const statusOf = (t: string): ItemStatus => { const w = byText.get(t); return w ? itemStatus(w.id, cards) : 'new'; };

  /** A 选词填空 row for each item that has none yet, its decoys from the list's other items (spec §7.3). */
  const withFits = (rows: Record<string, FitRow>, its: DraftItem[], ps: DraftPair[]) => {
    const mates = its.map((it) => wordFor(it.text).word);
    const out = { ...rows };
    for (const w of mates) {
      if (out[w.text]) continue;
      const s = sentenceFor(w);
      out[w.text] = { fit: s ? proposeFit(w, mates, ps, s) : null, skipped: [], removed: false, ok: false, own: '', editing: false };
    }
    return out;
  };

  const read = () => {
    const d = parseWeekList(text, isWord, [...HSK_WORDS.keys(), ...stored.map((w) => w.text)], now());
    const dates = defaultDates(now());
    setDraft(d);
    setItems(d.items);
    setOff(new Set());
    setKeepPaused(new Set());
    setEnglish({});
    setEditing(null);
    setName(d.title);
    setHomework(dates.homeworkDue);
    setReadyBy(dates.readyBy);
    setReadyTouched(false);
    setPairs(d.pairs.map((p) => ({ ...p, wrong: proposeWrong(p, d.pairs), skipped: [], removed: false, ok: false })));
    setFits(withFits({}, d.items, d.pairs));
    setMessage(null);
  };
  const cancel = () => { setDraft(null); setItems([]); setPairs([]); setFits({}); };

  // ---- fixing items
  const replaceItem = (i: number, next: DraftItem[]) => {
    const its = [...items];
    its.splice(i, 1, ...next.filter((n) => !items.some((x, k) => k !== i && x.text === n.text)));
    setItems(its);
    setFits((f) => withFits(f, its, pairs));
  };
  const retype = (i: number, to: string) => {
    const t = to.trim();
    setEditing(null);
    if (!t || t === items[i]!.text) return;
    replaceItem(i, [{ text: t, from: items[i]!.from, flags: isWord(t) ? [] : ['unknown'] }]);
  };
  const split = (i: number) => replaceItem(i, items[i]!.parts!.map((p) => ({ text: p, from: items[i]!.from, flags: isWord(p) ? [] : ['unknown'] })));

  // ---- pairs and fill-ins
  const pairsAsDraft = (): DraftPair[] => pairs.map(({ left, right, group }) => ({ left, right, ...(group ? { group } : {}) }));
  const setPair = (i: number, change: (p: PairRow) => PairRow) => setPairs((ps) => ps.map((p, k) => (k === i ? change(p) : p)));
  const swapWrong = (i: number, bad: string) => setPair(i, (p) => {
    const skipped = [...p.skipped, bad];
    const kept = p.wrong.filter((w) => w !== bad);
    const more = proposeWrong(p, pairsAsDraft(), new Set([...skipped, ...kept]));
    return { ...p, skipped, wrong: [...kept, ...more].slice(0, 3), ok: false };
  });
  const swapHalves = (i: number) => setPair(i, (p) => {
    const flipped = { ...p, left: p.right, right: p.left };
    return { ...flipped, wrong: proposeWrong(flipped, pairsAsDraft()), skipped: [], ok: false };
  });
  const setFit = (t: string, change: (f: FitRow) => FitRow) => setFits((fs) => ({ ...fs, [t]: change(fs[t]!) }));
  const mates = () => items.filter((it) => !off.has(it.text)).map((it) => wordFor(it.text).word);
  const swapDecoy = (t: string, bad: string) => setFit(t, (f) => {
    if (!f.fit) return f;
    const skipped = [...f.skipped, bad];
    const fit = proposeFit(wordFor(t).word, mates(), pairsAsDraft(), { text: f.fit.sentence, source: f.fit.source }, new Set(skipped));
    return { ...f, skipped, fit, ok: false };
  });
  const ownSentence = (t: string, s: string) => setFit(t, (f) => {
    const good = s.trim() && parentSentenceProblems(s.trim(), t).length === 0;
    const fit = good ? proposeFit(wordFor(t).word, mates(), pairsAsDraft(), { text: s.trim().replace(t, BLANK), source: 'parent' }) : null;
    return { ...f, own: s, ok: false, ...(fit ? { fit, skipped: [] } : {}) };
  });

  // ---- what the preview adds up to
  const kept = items.filter((it) => !off.has(it.text));
  const keptTexts = new Set(kept.map((it) => it.text));
  const fresh = items.filter((it) => { const s = statusOf(it.text); return s === 'new' || s === 'learning'; });
  const knownItems = items.filter((it) => !fresh.includes(it));
  const livePairs = pairs.filter((p) => !p.removed && p.wrong.length === 3);
  const liveFits = kept.map((it) => [it.text, fits[it.text]] as const).filter(([, f]) => f?.fit && !f.removed);
  const toCheck = livePairs.filter((p) => !p.ok).length + liveFits.filter(([, f]) => !f!.ok).length;
  const allFine = () => {
    setPairs((ps) => ps.map((p) => (p.removed ? p : { ...p, ok: true })));
    setFits((fs) => Object.fromEntries(Object.entries(fs).map(([t, f]) => [t, f.fit && !f.removed ? { ...f, ok: true } : f])));
  };
  const englishProblems = (t: string) => { const e = english[t]?.trim(); return e ? glossProblems(e) : []; };
  const badEnglish = kept.some((it) => englishProblems(it.text).length > 0);
  const today = localDateKey(now());
  const effReady = homework ? clampReadyBy(now(), readyBy || homework, homework) : '';
  const past = !!homework && pastDue(now(), homework);
  const days = effReady ? Math.max(0, daysBetween(today, effReady)) : 0;
  const counts = { new: 0, known: 0, placed: 0 };
  for (const it of kept) { const s = statusOf(it.text); if (s === 'new' || s === 'learning') counts.new++; else if (s === 'known') counts.known++; else counts.placed++; }
  const pace = settings.pace?.perDay ?? PACE_START;
  const rate = Math.max(1, Math.min(pace + HEADROOM, Math.max(settings.newPerDay, pace)));
  const newNames = kept.filter((it) => statusOf(it.text) === 'new').map((it) => it.text);
  const late = newNames.slice(rate * days);
  const later = effReady && homework ? clampReadyBy(now(), localDateKey(addDays(parseDateKey(effReady), 1)), homework) : effReady;
  const same = draft ? activeLists(lists, now()).find((l) => l.name === name.trim() && l.readyBy === effReady && l.homeworkDue === homework) : undefined;
  const blocker = !kept.length ? 'Tick at least one word.' : !name.trim() ? 'Give the list a name.' : !homework ? 'Pick the homework day.'
    : badEnglish ? 'Fix the English marked above, or clear it.' : null;
  const canSave = !busy && !blocker && !past && !toCheck;

  const setHomeworkDay = (v: string) => {
    setHomework(v);
    if (!readyTouched && v) setReadyBy(clampReadyBy(now(), localDateKey(addDays(parseDateKey(v), -2)), v));
  };

  const save = async () => {
    if (!draft || !canSave) return;
    setBusy(true);
    try {
      const l = await saveWeekList(db, {
        name: name.trim(), readyBy: effReady, homeworkDue: homework,
        items: kept.map((it) => {
          const e = english[it.text]?.trim();
          const w = byText.get(it.text);
          return { text: it.text, from: it.from, ...(e ? { meaning: e } : {}), ...(w?.paused ? { unpause: !keepPaused.has(it.text) } : {}) };
        }),
        pairs: livePairs.map((p): WeekPair => ({ left: p.left, right: p.right, ...(p.group ? { group: p.group } : {}), wrong: [p.wrong[0]!, p.wrong[1]!, p.wrong[2]!] })),
        fits: liveFits.map(([t, f]) => ({ ...f!.fit!, wordId: t })), // the item's text until saved
      }, now());
      setMessage(`Saved “${l.name}”: ${l.items.length} words, ${l.pairs.length} 搭配, ${l.fits.length} fill-ins. Check ${day(l.readyBy)}, homework ${day(l.homeworkDue)}.`);
      cancel();
      setText('');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const itemRow = (it: DraftItem) => {
    const i = items.indexOf(it);
    const m = wordFor(it.text);
    const w = m.word;
    const status = statusOf(it.text);
    const needsEnglish = m.kind === 'new' && !w.meaning;
    const problems = englishProblems(it.text);
    return (
      <li key={it.text} class={`week__item ${off.has(it.text) ? 'is-off' : ''}`}>
        <div class="week__item-head">
          <label class="week__tick"><input type="checkbox" aria-label={`Include ${it.text}`} checked={!off.has(it.text)} onChange={() => setOff((s) => toggled(s, it.text))} />
            {editing === it.text
              ? null
              : <span class="hanzi week__word" lang="zh-CN">{it.text}</span>}
          </label>
          {editing === it.text && (
            <input class="week__retype" lang="zh-CN" aria-label={`Fix ${it.text}`} defaultValue={it.text} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') retype(i, inputValue(e)); if (e.key === 'Escape') setEditing(null); }}
              onBlur={(e) => retype(i, inputValue(e))} />
          )}
          <span class="week__pinyin">{w.pinyin}</span>
          {status !== 'new' && <span class={`week__status week__status--${status}`}>{STATUS_TEXT[status]}</span>}
          {editing !== it.text && <button type="button" class="week__retype-btn" aria-label={`Retype ${it.text}`} title="Retype" onClick={() => setEditing(it.text)}>✎</button>}
        </div>
        {w.meaning && !needsEnglish && <span class="week__gloss">{w.meaning}</span>}
        {needsEnglish && (
          <label class="week__english">
            <input placeholder="English (optional, up to 4 words)" aria-label={`English for ${it.text} (optional)`} value={english[it.text] ?? ''}
              onInput={(e) => { const v = inputValue(e); setEnglish((x) => ({ ...x, [it.text]: v })); }} />
          </label>
        )}
        {problems.map((p) => <span key={p} class="week__flag">{p}</span>)}
        {it.flags.map((f) => <span key={f} class="week__flag">{FLAG_TEXT(it, f, isWord)}</span>)}
        {(it.suggestion || it.parts || w.paused) && (
          <div class="week__actions">
            {it.suggestion && <button type="button" class="small-btn" onClick={() => replaceItem(i, [{ text: it.suggestion!, from: it.from, flags: [] }])}>Use {it.suggestion}</button>}
            {it.parts && <button type="button" class="small-btn" aria-label={`Split ${it.text}`} onClick={() => split(i)}>Split</button>}
            {w.paused && <label class="week__unpause"><input type="checkbox" checked={!keepPaused.has(it.text)} onChange={() => setKeepPaused((s) => toggled(s, it.text))} /> Unpause (it's paused)</label>}
          </div>
        )}
      </li>
    );
  };

  const groups: [string, number[]][] = [];
  pairs.forEach((p, i) => {
    const g = p.group ?? '';
    const at = groups.find(([k]) => k === g);
    if (at) at[1].push(i); else groups.push([g, [i]]);
  });
  const noFit = kept.filter((it) => !fits[it.text]?.fit);

  return (
    <section class="panel week">
      <h2>This week’s words (本周词语)</h2>
      {!draft && (
        <>
          <p class="week__how">Copy the text from a photo of the sheet with Live Text: long-press the text → Select All → Copy. Then paste it here. ZiJi finds the words and 搭配, and gets him ready by the day you pick.</p>
          <div class="field">
            <label for="week-paste">Paste the sheet</label>
            <textarea id="week-paste" rows={7} lang="zh-CN" value={text} onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} />
          </div>
          <button type="button" class="btn btn--primary week__read" disabled={!text.trim() || !loaded} onClick={read}>Read</button>
        </>
      )}

      {draft && (
        <div class="week__preview">
          <div class="week__meta">
            <div class="field week__name"><label for="week-name">Name</label><input id="week-name" value={name} onInput={(e) => setName(inputValue(e))} /></div>
            <div class="field"><label for="week-ready">Ready by</label>
              <input id="week-ready" type="date" value={readyBy} min={today} onInput={(e) => { setReadyBy(inputValue(e)); setReadyTouched(true); }} />
            </div>
            <div class="field"><label for="week-due">Homework due</label>
              <input id="week-due" type="date" value={homework} min={today} onInput={(e) => setHomeworkDay(inputValue(e))} />
            </div>
          </div>
          {past && <p class="week__refuse" role="alert">Homework day is already past. Pick today or a later day.</p>}
          {!past && effReady && effReady !== readyBy && <p class="week__note">Ready by moves to {day(effReady)}: at least two days to learn, and before homework day.</p>}
          {same && <p class="week__note">“{same.name}” is already a list with these days. Saving adds to it.</p>}
          {!past && effReady && (
            <div class="week__plan">
              <p>{planLine({ newCount: counts.new, known: counts.known, placed: counts.placed, rate, days, readyBy: effReady, homeworkDue: homework, names: late })}</p>
              {days === 1 && <p class="week__warn">Only 1 day — he’ll see the new words today and the check tomorrow.</p>}
              {late.length > 0 && later > effReady && <button type="button" class="small-btn" onClick={() => { setReadyBy(later); setReadyTouched(true); }}>Move ready-by later ({day(later)})</button>}
            </div>
          )}

          <h3 id="week-new">New to him ({fresh.length})</h3>
          <p class="week__hint">English is optional: type up to four words where there is none.</p>
          <ul class="week__items" aria-label={`New to him (${fresh.length})`}>{fresh.map(itemRow)}</ul>
          {knownItems.length > 0 && (
            <>
              <h3>He knows ({knownItems.length})</h3>
              <p class="week__hint">A quick check before the day, nothing to teach.</p>
              <ul class="week__items" aria-label={`He knows (${knownItems.length})`}>{knownItems.map(itemRow)}</ul>
            </>
          )}
          {(draft.unpaired.length > 0 || draft.notes.length > 0) && (
            <ul class="week__notes">
              {draft.unpaired.length > 0 && <li>Unpaired on the sheet (kept as words): <span lang="zh-CN">{draft.unpaired.join(' · ')}</span></li>}
              {draft.notes.map((n) => <li key={n}>{NOTE_TEXT(n)}</li>)}
            </ul>
          )}

          <h3>Check the wrong answers</h3>
          <p class="week__hint">ZiJi made these wrong answers from the list. Tap one that is actually right to swap it. Fine confirms a row; All fine confirms them all.</p>
          {pairs.length > 0 && <h4 class="week__sub">搭配 ({livePairs.length})</h4>}
          {groups.map(([g, idx]) => (
            <div key={g} role="group" aria-label={g || '搭配'} class="week__group">
              {g && <h5 class="week__theme" lang="zh-CN">{g}</h5>}
              <ul class="week__rows">
                {idx.map((i) => {
                  const p = pairs[i]!;
                  return (
                    <li key={`${i}`} class={`week__row ${p.removed ? 'is-off' : ''} ${p.ok && !p.removed ? 'is-ok' : ''}`}>
                      <span class="hanzi week__pair" lang="zh-CN">{p.left} — {p.right}</span>
                      {p.check && <span class="week__flag">check the pairing</span>}
                      {!p.removed && (
                        <>
                          <span class="week__wrongs">
                            {p.wrong.map((w) => <button key={w} type="button" class="week__chip" lang="zh-CN" onClick={() => swapWrong(i, w)}>✗ {w}</button>)}
                          </span>
                          {p.wrong.length < 3 && <span class="week__flag">Not enough wrong partners: it won’t be asked as 搭配.</span>}
                          <span class="week__rowbtns">
                            <button type="button" class="small-btn" aria-label="Swap" title="Swap the halves" onClick={() => swapHalves(i)}>⇄</button>
                            {p.wrong.length === 3 && <button type="button" class={`small-btn week__fine ${p.ok ? 'is-on' : ''}`} aria-pressed={p.ok} onClick={() => setPair(i, (x) => ({ ...x, ok: !x.ok }))}>{p.ok ? '✓ Fine' : 'Fine'}</button>}
                            <button type="button" class="link" onClick={() => setPair(i, (x) => ({ ...x, removed: true }))}>Remove</button>
                          </span>
                        </>
                      )}
                      {p.removed && <button type="button" class="link" onClick={() => setPair(i, (x) => ({ ...x, removed: false, ok: false }))}>Put back</button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <h4 class="week__sub">选词填空 ({liveFits.length})</h4>
          <ul class="week__rows" aria-label="选词填空">
            {kept.filter((it) => fits[it.text]?.fit).map((it) => {
              const f = fits[it.text]!;
              const [before, after] = f.fit!.sentence.split(BLANK);
              return (
                <li key={it.text} data-word={it.text} class={`week__row ${f.removed ? 'is-off' : ''} ${f.ok && !f.removed ? 'is-ok' : ''}`}>
                  <span class="hanzi week__sentence" lang="zh-CN">{before}<span class="week__blank">{it.text}</span>{after}</span>
                  {!f.removed && (
                    <>
                      <span class="week__wrongs">{f.fit!.wrong.map((d) => <button key={d} type="button" class="week__chip" lang="zh-CN" onClick={() => swapDecoy(it.text, d)}>✗ {d}</button>)}</span>
                      <span class="week__rowbtns">
                        <button type="button" class={`small-btn week__fine ${f.ok ? 'is-on' : ''}`} aria-pressed={f.ok} onClick={() => setFit(it.text, (x) => ({ ...x, ok: !x.ok }))}>{f.ok ? '✓ Fine' : 'Fine'}</button>
                        <button type="button" class="link" onClick={() => setFit(it.text, (x) => ({ ...x, editing: !x.editing }))}>Edit</button>
                        <button type="button" class="link" onClick={() => setFit(it.text, (x) => ({ ...x, removed: true }))}>Remove</button>
                      </span>
                    </>
                  )}
                  {f.removed && <button type="button" class="link" onClick={() => setFit(it.text, (x) => ({ ...x, removed: false, ok: false }))}>Put back</button>}
                  {f.editing && !f.removed && sentenceField(it.text, f)}
                </li>
              );
            })}
          </ul>
          {noFit.length > 0 && (
            <div class="week__nofit">
              <p class="week__hint">No fill-in for these (no sentence, or too few list words to choose from). Tap one to write a sentence:</p>
              <div class="week__wrongs">
                {noFit.map((it) => <button key={it.text} type="button" class="week__chip week__chip--add" lang="zh-CN" onClick={() => setFit(it.text, (x) => ({ ...x, editing: !x.editing }))}>✎ {it.text}</button>)}
              </div>
              {noFit.filter((it) => fits[it.text]?.editing).map((it) => <div key={it.text}>{sentenceField(it.text, fits[it.text]!)}</div>)}
            </div>
          )}

          <div class="week__bar">
            <div class="week__bar-top">
              <p class="week__count" aria-live="polite">{toCheck ? `${toCheck} row${toCheck === 1 ? '' : 's'} to check` : 'Wrong answers checked ✓'}</p>
              {blocker && <p class="week__hint">{blocker}</p>}
              <button type="button" class="link week__cancel" onClick={cancel}>Cancel</button>
            </div>
            <button type="button" class="btn week__allfine" disabled={!toCheck} onClick={allFine}>All fine</button>
            <button type="button" class="btn btn--primary week__save" disabled={!canSave} onClick={() => void save()}>Save {kept.length} words</button>
          </div>
        </div>
      )}
      {message && <p class="week__message" role="status">{message}</p>}
      <WeekLists lists={lists} now={now()} onChanged={reload} db={db} />
    </section>
  );

  function sentenceField(t: string, f: FitRow) {
    const problems = f.own.trim() ? parentSentenceProblems(f.own.trim(), t) : [];
    return (
      <div class="field week__own">
        <label for={`week-own-${t}`}>Sentence for <span lang="zh-CN">{t}</span></label>
        <input id={`week-own-${t}`} lang="zh-CN" placeholder={`A sentence using ${t}`} value={f.own} onInput={(e) => ownSentence(t, inputValue(e))} />
        {problems.map((p) => <span key={p} class="week__flag">{p}</span>)}
        {f.own.trim() && !problems.length && !f.fit && <span class="week__flag">Too few list words to choose wrong answers from.</span>}
      </div>
    );
  }
}

/** The lists: the ones running, each with where it stands, edit and delete; past ones below, read-only. */
function WeekLists({ lists, now, onChanged, db }: { lists: WeekList[]; now: Date; onChanged: () => Promise<void>; db: ReturnType<typeof useApp>['db'] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const active = activeLists(lists, now);
  const past = lists.filter((l) => !active.includes(l)).sort((a, b) => b.createdAt - a.createdAt);
  const del = async (id: string) => { await deleteWeekList(db, id); setDeleting(null); await onChanged(); };
  const card = (l: WeekList, running: boolean) => (
    <article key={l.id} class={`week__list ${editing === l.id ? 'is-editing' : ''}`} aria-label={l.name}>
      {editing === l.id
        ? <ListEditor list={l} now={now} db={db} onDone={async () => { setEditing(null); await onChanged(); }} />
        : (
          <>
            <h4 class="week__list-name">{l.name}</h4>
            <p class="week__list-days"><span>Ready by {day(l.readyBy)}</span> · <span>homework {day(l.homeworkDue)}</span></p>
            <p class={`week__list-status ${running ? '' : 'is-past'}`}>{listStatus(l, now)}</p>
            <p class="week__list-counts">{l.items.length} words · {l.pairs.length} 搭配 · {l.fits.length} fill-ins</p>
            {deleting === l.id
              ? (
                <div class="week__confirm" role="group" aria-label="Delete the list?">
                  <p>Delete “{l.name}”? His words and progress stay.</p>
                  <button type="button" class="small-btn week__danger" onClick={() => void del(l.id)}>Delete the list</button>
                  <button type="button" class="small-btn" onClick={() => setDeleting(null)}>Keep it</button>
                </div>
              )
              : (
                <div class="week__actions">
                  {running && <button type="button" class="small-btn" aria-label={`Edit ${l.name}`} onClick={() => setEditing(l.id)}>Edit</button>}
                  <button type="button" class="small-btn" aria-label={`Delete ${l.name}`} onClick={() => setDeleting(l.id)}>Delete</button>
                </div>
              )}
          </>
        )}
    </article>
  );
  if (!lists.length) return <p class="week__hint">No lists yet.</p>;
  return (
    <>
      {active.length > 0 && <><h3>Lists</h3><div class="week__lists">{active.map((l) => card(l, true))}</div></>}
      {past.length > 0 && <><h3>Past lists</h3><div class="week__lists">{past.map((l) => card(l, false))}</div></>}
    </>
  );
}

/**
 * A running list's name, days, words and 搭配. Saved with updateWeekList: one transaction over the list as stored now, so an
 * answer he gives while this is open is never lost (plan Global Constraints, fix round 2026-10-17).
 */
function ListEditor({ list, now, db, onDone }: { list: WeekList; now: Date; db: ReturnType<typeof useApp>['db']; onDone: () => Promise<void> }) {
  const [name, setName] = useState(list.name);
  const [readyBy, setReadyBy] = useState(list.readyBy);
  const [homework, setHomework] = useState(list.homeworkDue);
  const [gone, setGone] = useState<Set<string>>(new Set()); // wordIds
  const [goneP, setGoneP] = useState<Set<string>>(new Set()); // left|right
  const past = homework !== list.homeworkDue && pastDue(now, homework);
  const created = new Date(list.createdAt);
  const eff = homework ? clampReadyBy(created, readyBy, homework) : readyBy;
  const ok = name.trim() && homework && !past && list.items.some((i) => !gone.has(i.wordId));
  const save = async () => {
    if (!ok) return;
    await updateWeekList(db, list.id, (l) => ({
      ...l, name: name.trim(), readyBy: eff, homeworkDue: homework,
      items: l.items.filter((i) => !gone.has(i.wordId)),
      pairs: l.pairs.filter((p) => !goneP.has(`${p.left}|${p.right}`)),
      fits: l.fits.filter((f) => !gone.has(f.wordId)),
    }));
    await onDone();
  };
  return (
    <div class="week__editor">
      <div class="week__meta">
        <div class="field week__name"><label for={`we-name-${list.id}`}>List name</label><input id={`we-name-${list.id}`} value={name} onInput={(e) => setName(inputValue(e))} /></div>
        <div class="field"><label for={`we-ready-${list.id}`}>Ready by</label><input id={`we-ready-${list.id}`} type="date" value={readyBy} onInput={(e) => setReadyBy(inputValue(e))} /></div>
        <div class="field"><label for={`we-due-${list.id}`}>Homework due</label><input id={`we-due-${list.id}`} type="date" value={homework} onInput={(e) => setHomework(inputValue(e))} /></div>
      </div>
      {past && <p class="week__refuse" role="alert">Homework day is already past. Pick today or a later day.</p>}
      {!past && eff !== readyBy && <p class="week__note">Ready by moves to {day(eff)}.</p>}
      <p class="week__hint">Tap a word or 搭配 to take it off the list. His progress on it stays. To add words, paste the sheet again with this name and these days.</p>
      <div class="week__wrongs">
        {list.items.map((i) => (
          <button key={i.wordId} type="button" class={`week__chip week__chip--plain ${gone.has(i.wordId) ? 'is-off' : ''}`} lang="zh-CN" aria-label={`${gone.has(i.wordId) ? 'Put back' : 'Remove'} ${i.text}`} onClick={() => setGone((s) => toggled(s, i.wordId))}>
            {gone.has(i.wordId) ? '↺' : '×'} {i.text}
          </button>
        ))}
      </div>
      {list.pairs.length > 0 && (
        <div class="week__wrongs">
          {list.pairs.map((p) => {
            const k = `${p.left}|${p.right}`;
            return <button key={k} type="button" class={`week__chip week__chip--plain ${goneP.has(k) ? 'is-off' : ''}`} lang="zh-CN" aria-label={`${goneP.has(k) ? 'Put back' : 'Remove'} ${p.left} — ${p.right}`} onClick={() => setGoneP((s) => toggled(s, k))}>{goneP.has(k) ? '↺' : '×'} {p.left} — {p.right}</button>;
          })}
        </div>
      )}
      <div class="week__actions">
        <button type="button" class="btn btn--primary" disabled={!ok} onClick={() => void save()}>Save changes</button>
        <button type="button" class="btn btn--ghost" onClick={() => void onDone()}>Cancel</button>
      </div>
    </div>
  );
}
