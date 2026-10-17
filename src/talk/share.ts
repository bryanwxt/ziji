// Share (parent loop spec §5): the iPad share sheet, else the clipboard; and the plain text it sends.
import type { TalkCard, TalkSlot } from '../types';
import { KIND_EN, KIND_LABEL, onlyCards } from './pick';
import { shortDate, type WeekRange, type WeekSummary } from './week';

/** 'manual': neither the sheet nor the clipboard took it; the UI shows the text read-only and pre-selected, to copy by hand. */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'manual';
export interface ShareDeps {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

const deviceDeps = (): ShareDeps => {
  if (typeof navigator === 'undefined' || !navigator) return {};
  const nav = navigator;
  return {
    canShare: typeof nav.canShare === 'function' ? (d) => nav.canShare(d) : undefined,
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : undefined,
    writeText: typeof nav.clipboard?.writeText === 'function' ? (t) => nav.clipboard.writeText(t) : undefined,
  };
};

/** Whether the sheet says it can take this text; a canShare that throws is taken as a no. */
const sheetTakes = (deps: ShareDeps, data: ShareData) => {
  try {
    return deps.canShare ? deps.canShare(data) !== false : true;
  } catch {
    return false;
  }
};

/**
 * The share sheet, opened before anything is awaited: iOS opens it only inside the tap, so a caller works the text out at render
 * or load time and calls this first. Closing the sheet (AbortError) copies nothing. No sheet, a sheet that can't take the text,
 * or any other failure copies to the clipboard; when that fails too, 'manual' (the text is shown to copy by hand).
 */
export async function shareText(text: string, deps: ShareDeps = deviceDeps()): Promise<ShareResult> {
  const data: ShareData = { text };
  if (deps.share && sheetTakes(deps, data)) {
    try {
      await deps.share(data);
      return 'shared';
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
    }
  }
  if (deps.writeText) {
    try {
      await deps.writeText(text);
      return 'copied';
    } catch {
      // the clipboard refused it as well: shown to copy by hand
    }
  }
  return 'manual';
}

/** What a Share button says after it ran; nothing after a share or a closed sheet. 'manual' comes with the text shown below it. */
export const shareNote = (r: ShareResult): string | null =>
  r === 'copied' ? 'Copied. Paste it into a message.' : r === 'manual' ? 'Could not share or copy here. The text is below: select it and copy.' : null;

/** Today's three as a message: each card's label, question, English line, follow-ups (with the passage's answers), pattern. */
export function todayText(cards: readonly TalkSlot[], today: string): string {
  const block = (c: TalkCard, n: number) => {
    const ans = (i: number) => (c.answers?.[i] ? `（书上：${c.answers[i]}）` : '');
    return [
      `${n}. ${KIND_LABEL[c.kind]} ${KIND_EN[c.kind]}`,
      `${c.open}${ans(0)}`,
      c.en,
      ...c.followUps.map((f, i) => `· ${f}${ans(i + 1)}`),
      `试试用：${c.pattern}`,
    ].join('\n');
  };
  return [`聊一聊 · ${shortDate(today)}`, ...onlyCards(cards).map((c, i) => block(c, i + 1))].join('\n\n');
}

const join = (xs: readonly string[]) => (xs.length ? xs.join('、') : '—');

/** The week as a message (spec §5 Share the week). */
export function weekText(range: WeekRange, s: WeekSummary): string {
  const reads = s.reading.map((r) => `《${r.title}》${r.meaning === 'right' ? ' question right' : r.meaning === 'missed' ? ' question missed' : ''}`);
  return [
    `ZiJi · week of ${shortDate(range.from)} – ${shortDate(range.to)}`,
    `Talk: ${s.talk.days} day${s.talk.days === 1 ? '' : 's'} · ${s.talk.minutes} min`,
    `Lessons: ${s.lessons} · 朗读 on ${s.langduDays} day${s.langduDays === 1 ? '' : 's'}`,
    `Newly can read: ${join(s.newly.read)} · write: ${join(s.newly.write)} · say: ${join(s.newly.say)}`,
    `New words: ${join(s.newWords)}`,
    `Missed most: ${join(s.shaky)}`,
    `朗读: ${reads.length ? reads.join('; ') : '—'}`,
    ...(s.waiting ? [`Waiting in Listen & confirm: ${s.waiting}`] : []),
    `Focus: ${s.focus.zh}`,
    s.focus.en,
  ].join('\n');
}
