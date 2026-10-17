// Share (parent loop spec §5): the iPad share sheet, else the clipboard; and the plain text it sends.
import type { TalkCard } from '../types';
import { KIND_EN, KIND_LABEL } from './pick';
import { shortDate, type WeekRange, type WeekSummary } from './week';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';
export interface ShareDeps { share?: (data: ShareData) => Promise<void>; writeText?: (text: string) => Promise<void> }

const deviceDeps = (): ShareDeps => ({
  share: typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined,
  writeText: typeof navigator.clipboard?.writeText === 'function' ? (t) => navigator.clipboard.writeText(t) : undefined,
});

/** The share sheet; closing it (AbortError) copies nothing; no sheet, or another failure, copies to the clipboard. */
export async function shareText(text: string, deps: ShareDeps = deviceDeps()): Promise<ShareResult> {
  if (deps.share) {
    try {
      await deps.share({ text });
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
      return 'failed';
    }
  }
  return 'failed';
}

/** What a Share button says after it ran; nothing after a share or a closed sheet. */
export const shareNote = (r: ShareResult): string | null =>
  r === 'copied' ? 'Copied. Paste it into a message.' : r === 'failed' ? 'This device could not share or copy it.' : null;

/** Today's three as a message: each card's label, question, English line, follow-ups (with the passage's answers), pattern. */
export function todayText(cards: readonly TalkCard[], today: string): string {
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
  return [`聊一聊 · ${shortDate(today)}`, ...cards.map((c, i) => block(c, i + 1))].join('\n\n');
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
