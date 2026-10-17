// 聊一聊 on Today (parent loop spec §5, 2026-10-18 update): under the weekly-list readiness line, today's three cards, Share,
// and 「✓ 聊了」 with minutes and Undo. The parent area is English; the prompts are Chinese with an English line for helpers.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { localDateKey } from '../lib/date';
import { newId } from '../lib/id';
import { addTalk, allTalks, deleteTalk } from '../store/repo';
import { swapTalk, todayTalk } from '../talk/load';
import { KIND_EN, KIND_LABEL } from '../talk/pick';
import { shareText, todayText, type ShareResult } from '../talk/share';
import { talkNudge, talkTotals, weekRange, type TalkTotals } from '../talk/week';
import type { TalkLog, TalkSlot } from '../types';
import type { ParentPlace } from './ParentArea';
import { ShareNote } from './ShareNote';

export const MINUTE_CHIPS = [5, 10, 15] as const;
/** How long 「Undo」 stays after a talk is logged. */
export const UNDO_MS = 10_000;

/** The three cards; a tap opens a card's follow-ups, pattern and sample (or the passage's answers). An empty slot (nothing at all
 *  to put there) stays in its place, hidden, so each card keeps its slot for 换一个. */
export function TalkCards({ cards, onSwap, busy = false }: { cards: readonly TalkSlot[]; onSwap: (slot: number) => void; busy?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol class="talk__cards">
      {cards.map((c, i) => {
        if (!c) return <li key={`empty-${i}`} class="talk__card" hidden />;
        const ans = (n: number) => c.answers?.[n] && <span class="talk__answer"> (书上：{c.answers[n]})</span>;
        return (
          <li key={c.id} class="talk__card">
            <p class="talk__kind"><span lang="zh-CN">{KIND_LABEL[c.kind]}</span> · {KIND_EN[c.kind]}</p>
            <button type="button" class="talk__open" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span lang="zh-CN" class="talk__q">{c.open}</span>{ans(0)}
            </button>
            <p class="talk__en">{c.en}</p>
            {open === i && (
              <div class="talk__more">
                <ul>{c.followUps.map((f, n) => <li key={f} lang="zh-CN">{f}{ans(n + 1)}</li>)}</ul>
                <p lang="zh-CN">试试用：{c.pattern}</p>
                {c.sample && <p class="talk__sample" lang="zh-CN">比如：{c.sample}</p>}
              </div>
            )}
            <button type="button" class="small-btn talk__swap" disabled={busy} onClick={() => { if (open === i) setOpen(null); onSwap(i); }}>
              <span lang="zh-CN">换一个</span> Another
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** 「✓ 聊了」 with an optional minutes chip (picked first, cleared after), and Undo for the newest talk; the week so far, with
 *  `onWeek` its link to the Week summary. */
export function TalkLogger({ week, saving, undoable, onLog, onUndo, onWeek }: {
  week: TalkTotals; saving: boolean; undoable: boolean; onLog: (minutes?: number) => void; onUndo: () => void; onWeek?: () => void;
}) {
  const [minutes, setMinutes] = useState<number | null>(null);
  return (
    <div class="talk__log">
      <div class="talk__chips" role="group" aria-label="Minutes (optional)">
        {MINUTE_CHIPS.map((m) => (
          <button key={m} type="button" class={`chip ${minutes === m ? 'is-on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(minutes === m ? null : m)}>{m} min</button>
        ))}
      </div>
      <button type="button" class="btn btn--primary talk__done" disabled={saving} onClick={() => { onLog(minutes ?? undefined); setMinutes(null); }}>
        ✓ <span lang="zh-CN">聊了</span> We talked
      </button>
      {undoable && <button type="button" class="small-btn" disabled={saving} onClick={onUndo}>Undo</button>}
      <div class="talk__week">
        <p>This week: {week.days} day{week.days === 1 ? '' : 's'} · {week.minutes} min</p>
        {onWeek && <button type="button" class="small-btn" onClick={onWeek}>Week summary</button>}
      </div>
    </div>
  );
}

/** The Today section. `onNavigate`: the Week summary link (Progress); `onLogged`: a talk was logged or undone (the top line
 *  looks again). */
export function TalkSection({ onNavigate, onLogged, undoMs = UNDO_MS }: { onNavigate: (place: ParentPlace) => void; onLogged?: () => void; undoMs?: number }) {
  const { db, now } = useApp();
  const [cards, setCards] = useState<TalkSlot[] | null>(null);
  const [talks, setTalks] = useState<TalkLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<string | null>(null); // the talk Undo removes
  const [shared, setShared] = useState<ShareResult | null>(null);
  const guard = useRef(false); // a double tap logs once
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    void (async () => {
      setCards(await todayTalk(db, now()));
      setTalks(await allTalks(db));
    })();
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);
  if (!cards) return <p>Loading…</p>;

  const swap = async (slot: number) => {
    setBusy(true);
    setShared(null);
    setCards(await swapTalk(db, now(), slot));
    setBusy(false);
  };
  const log = async (minutes?: number) => {
    if (guard.current) return;
    guard.current = true;
    setSaving(true);
    const t: TalkLog = { id: newId(), at: now().getTime(), ...(minutes ? { minutes } : {}) };
    await addTalk(db, t);
    setTalks(await allTalks(db));
    setLast(t.id);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLast(null), undoMs);
    setSaving(false);
    guard.current = false;
    onLogged?.();
  };
  const undo = async () => {
    if (!last) return;
    setSaving(true);
    await deleteTalk(db, last);
    setTalks(await allTalks(db));
    setLast(null);
    setSaving(false);
    onLogged?.();
  };
  // worked out here, at render: the tap calls shareText first, with nothing awaited before it (iOS opens the sheet only then)
  const text = todayText(cards, localDateKey(now()));
  const share = () => { void shareText(text).then(setShared); };
  const week = weekRange(now());
  const nudge = talkNudge(talks, now());

  return (
    <section class="panel talk" aria-labelledby="talk-title">
      <h2 id="talk-title"><span lang="zh-CN">聊一聊</span> Talk</h2>
      <p class="hint">Three things to talk about today, in Mandarin. Follow his answers; the pattern is something to nudge toward, not a script.</p>
      {nudge && <p class="talk__nudge">{nudge}</p>}
      <TalkCards cards={cards} onSwap={(i) => void swap(i)} busy={busy} />
      <div class="talk__share">
        <button type="button" class="small-btn" onClick={share}>Share today’s</button>
        <ShareNote result={shared} text={text} label="Today’s talk, to copy" />
      </div>
      <TalkLogger week={talkTotals(talks, week.start, week.end)} saving={saving} undoable={!!last} onLog={(m) => void log(m)} onUndo={() => void undo()}
        onWeek={() => onNavigate('summary')} />
    </section>
  );
}
